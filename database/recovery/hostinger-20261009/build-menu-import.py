"""Build the phpMyAdmin import from the exact versioned baseline migrations.

No database connection. Golden schema fingerprints are checked against the
canonical DDL by test-menu-import.py. Never edit the generated SQL manually.
"""
from pathlib import Path
import hashlib
import json
import re

folder = Path(__file__).resolve().parent
root = folder.parents[2]


def literal(value):
    # Hex literals avoid dependence on the connection's backslash SQL mode.
    return "CONVERT(0x" + value.encode().hex() + " USING utf8mb4)"


def statements(text):
    # These reviewed migrations contain no quoted semicolons or procedures.
    return [s.strip() for s in re.sub(r'--[^\n]*', '', text).split(';') if s.strip()]


def guarded(sql):
    return f"""SET @lyne_sql = IF(@lyne_ok,{literal(sql)},'DO 0');
PREPARE lyne_menu FROM @lyne_sql;
EXECUTE lyne_menu;
GET DIAGNOSTICS @lyne_conditions = NUMBER;
SET @lyne_ok = COALESCE(@lyne_ok AND @lyne_conditions=0,FALSE);
DEALLOCATE PREPARE lyne_menu;
"""


def build():
    rollback = (folder / '03-retour-avant-catalogue.sql').read_text()
    preflight = rollback[rollback.index('SET @lyne_lock'):rollback.index('SET @lyne_sql')]
    control = (folder / '01-controle-lecture-seule.sql').read_text()
    objects = next(line for line in control.splitlines() if line.startswith('SET @lyne_objects_ok'))
    sql = """-- LYNE : catalogue, tester d'abord sur lyne_reprise, puis base du site sauvegardee.
-- Importer EN ENTIER en une seule connexion, sans autre migration simultanee.
-- DDL non transactionnel : sur erreur ARRETER et transmettre le resultat.
-- Ne pas rejouer ni effacer une migration inachevee ; conserver les archives.
-- Genere par build-menu-import.py depuis les vrais fichiers et checksums.
""" + preflight + objects + "\n"
    sql += """SET @lyne_ok = COALESCE(@lyne_ok AND @lyne_objects_ok AND @@foreign_key_checks=1
 AND @@default_storage_engine='InnoDB'
 AND (SELECT COUNT(*) FROM roles WHERE code='ADMIN')=1
 AND (SELECT COUNT(*) FROM permissions WHERE code IN ('menu.read','menu.write','menu.availability') OR id IN ('perm_menu_read','perm_menu_write','perm_menu_availability'))=0
 AND (SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME IN ('menu_categories','menu_items','menu_price_history'))=0,FALSE);
SELECT DATABASE() AS base, IF(@lyne_ok,'LYNE_CATALOGUE_CONTROLES_OK','LYNE_CATALOGUE_REFUSE') AS resultat;
"""
    migrations = ['202610090001_menu', '202610090002_menu_tables']
    for number, name in enumerate(migrations):
        data = (root / 'database/baseline' / name / 'migration.sql').read_bytes()
        checksum = hashlib.sha256(data).hexdigest()
        sql += f'\n-- Migration {name}, SHA256 {checksum}\n'
        if number == 0:
            sql += guarded('START TRANSACTION')
            # Match the application's role-write lock during permission updates.
            sql += guarded('SELECT id FROM roles ORDER BY id FOR UPDATE')
        sql += 'SET @lyne_migration_id = UUID();\n'
        sql += guarded(f"INSERT INTO _prisma_migrations (id,checksum,migration_name,started_at,applied_steps_count) VALUES (@lyne_migration_id,'{checksum}','{name}',CURRENT_TIMESTAMP(3),0)")
        if number == 1:
            # Persist unfinished history before the first implicitly committed DDL.
            sql += guarded('COMMIT')
        for statement in statements(data.decode()):
            sql += guarded(statement)
        if number == 0:
            sql += """SET @lyne_ok = COALESCE(@lyne_ok
 AND (SELECT COUNT(*) FROM permissions WHERE (id='perm_menu_read' AND code='menu.read') OR (id='perm_menu_write' AND code='menu.write') OR (id='perm_menu_availability' AND code='menu.availability'))=3
 AND (SELECT COUNT(*) FROM role_permissions rp JOIN roles r ON r.id=rp.role_id WHERE r.code='ADMIN' AND rp.permission_id IN ('perm_menu_read','perm_menu_write','perm_menu_availability'))=3
 AND (SELECT COUNT(*) FROM role_permissions rp JOIN roles r ON r.id=rp.role_id WHERE r.code='RECEPTION' AND rp.permission_id='perm_menu_read')=(SELECT COUNT(*) FROM roles WHERE code='RECEPTION'),FALSE);
"""
        else:
            # Compare the complete resulting menu schema, including FK rules.
            golden = json.loads((folder / 'menu-fingerprints.json').read_text())
            for line in control.splitlines():
                if any(line.startswith(f'SET @lyne_{key} = ') for key in golden):
                    sql += line.replace("'audit_logs','departments','employees','job_titles','permissions','roles','role_permissions','sessions','users'", "'menu_categories','menu_items','menu_price_history'") + '\n'
            comparisons = ' AND '.join(f"@lyne_{key}='{value}'" for key, value in golden.items())
            sql += f"SET @lyne_ok = COALESCE(@lyne_ok AND {comparisons},FALSE);\n"
        sql += guarded('UPDATE _prisma_migrations SET finished_at=CURRENT_TIMESTAMP(3),applied_steps_count=1 WHERE id=@lyne_migration_id AND finished_at IS NULL')
        if number == 0:
            sql += """SET @lyne_sql = IF(@lyne_ok,'COMMIT','ROLLBACK');
PREPARE lyne_menu FROM @lyne_sql;
EXECUTE lyne_menu;
GET DIAGNOSTICS @lyne_conditions = NUMBER;
SET @lyne_ok = COALESCE(@lyne_ok AND @lyne_conditions=0,FALSE);
DEALLOCATE PREPARE lyne_menu;
"""
    sql += """SELECT DATABASE() AS base, IF(@lyne_ok,'LYNE_CATALOGUE_MIGRATIONS_OK','LYNE_CATALOGUE_ARRET_VERIFIER_ETAT') AS resultat;
SELECT migration_name,checksum,finished_at,rolled_back_at,applied_steps_count FROM _prisma_migrations ORDER BY started_at,migration_name;
DO RELEASE_LOCK(SHA2(CONCAT(DATABASE(),':lyne-rebaseline-20261009'),256));
"""
    return sql


if __name__ == '__main__':
    (folder / '04-installer-catalogue.sql').write_text(build())
