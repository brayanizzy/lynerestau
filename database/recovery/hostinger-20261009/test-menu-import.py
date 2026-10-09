"""Exercise phpMyAdmin catalogue SQL on new local databases, synthetic data only.

Uses the same LYNE_TEST_MYSQL_* socket-only configuration as test-rebaseline.py.
Retains fixtures, including the intentional unfinished migration, for inspection.
"""
from pathlib import Path
import hashlib
import importlib.util
import json
import os
import subprocess
import sys
import uuid

folder = Path(__file__).resolve().parent
root = folder.parents[2]
sys.dont_write_bytecode = True
spec = importlib.util.spec_from_file_location('generator', folder / 'build-menu-import.py')
generator = importlib.util.module_from_spec(spec)
spec.loader.exec_module(generator)
script = (folder / '04-installer-catalogue.sql').read_text()
assert generator.build() == script, 'Generated SQL is stale'
client = [os.environ['LYNE_TEST_MYSQL_CLIENT'], '--no-defaults',
          '--socket=' + os.environ['LYNE_TEST_MYSQL_SOCKET'],
          '--user=' + os.environ.get('LYNE_TEST_MYSQL_USER', 'agent'),
          '--batch', '--skip-column-names']
fixtures = []


def sql(database, query, continued_error=False):
    result = subprocess.run(client + (['--force'] if continued_error else []) + [database],
                            input=query, text=True, capture_output=True)
    if not continued_error and result.returncode:
        raise RuntimeError(result.stderr)
    if continued_error:
        assert 'ERROR' in result.stderr, 'Failure injection did not execute'
    return result.stdout.strip()


def fixture():
    name = 'lyne_menu_import_test_' + uuid.uuid4().hex[:12]
    sql('information_schema', f'CREATE DATABASE {name} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;')
    sql(name, (root / 'database/baseline/202610080001_phase2/migration.sql').read_text())
    sql(name, """CREATE TABLE _prisma_migrations (
 id VARCHAR(36) NOT NULL PRIMARY KEY, checksum VARCHAR(64) NOT NULL,
 finished_at DATETIME(3), migration_name VARCHAR(255) NOT NULL, logs TEXT,
 rolled_back_at DATETIME(3), started_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
 applied_steps_count INT UNSIGNED NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
INSERT INTO _prisma_migrations(id,checksum,migration_name,finished_at,applied_steps_count) VALUES
('old-auth','8ed679e2d5ca9fa3624ef4e40152a45335005d8b3fb4eb1483abb7380f97aaff','202609250001_phase1_auth',CURRENT_TIMESTAMP(3),1),
('old-personnel','b2fda43adf38a23f52f17ca51a4f11e888824b5fab61565c110c5ec4e3eb9957','20260928170000_personnel',CURRENT_TIMESTAMP(3),1);
INSERT INTO roles(id,code,name,updated_at) VALUES ('admin','ADMIN','Synthetic admin',CURRENT_TIMESTAMP(3)),('reception','RECEPTION','Synthetic reader',CURRENT_TIMESTAMP(3)),('sentinel','CUSTOM','Custom role',CURRENT_TIMESTAMP(3));
INSERT INTO permissions(id,code,name,updated_at) VALUES ('sentinel','sentinel.read','Custom permission',CURRENT_TIMESTAMP(3));
INSERT INTO role_permissions(role_id,permission_id) VALUES ('sentinel','sentinel');
""")
    assert 'LYNE_BASELINE_PRESENTE' in sql(name, (folder / '02-adopter-baseline-sur-copie.sql').read_text())
    fixtures.append(name)
    return name


def snapshot(name):
    return sql(name, "SELECT * FROM roles ORDER BY id; SELECT * FROM _prisma_migrations ORDER BY id; SELECT * FROM _prisma_migrations_legacy_20261009 ORDER BY id; SELECT * FROM permissions ORDER BY id; SELECT * FROM role_permissions ORDER BY role_id,permission_id;")


name = fixture()
archive = sql(name, 'SELECT * FROM _prisma_migrations_legacy_20261009 ORDER BY id;')
# Reject drift, a conflicting permission and disabled FK checks without writes.
sql(name, 'ALTER TABLE employees ADD COLUMN synthetic_drift INT;')
before = snapshot(name)
assert 'LYNE_CATALOGUE_REFUSE' in sql(name, script)
assert snapshot(name) == before
sql(name, 'ALTER TABLE employees DROP COLUMN synthetic_drift;')
sql(name, "INSERT INTO permissions(id,code,name,updated_at) VALUES ('collision','menu.read','Collision',CURRENT_TIMESTAMP(3));")
before = snapshot(name)
assert 'LYNE_CATALOGUE_REFUSE' in sql(name, script)
assert snapshot(name) == before
sql(name, "DELETE FROM permissions WHERE id='collision';")
before = snapshot(name)
assert 'LYNE_CATALOGUE_REFUSE' in sql(name, 'SET foreign_key_checks=0;\n' + script)
assert snapshot(name) == before
# Success, correct grants, exact history checksums, custom data and archive intact.
assert 'LYNE_CATALOGUE_MIGRATIONS_OK' in sql(name, script)
assert sql(name, 'SELECT * FROM _prisma_migrations_legacy_20261009 ORDER BY id;') == archive
assert sql(name, "SELECT r.code,p.code FROM role_permissions rp JOIN roles r ON rp.role_id=r.id JOIN permissions p ON rp.permission_id=p.id ORDER BY r.code,p.code;") == 'ADMIN\tmenu.availability\nADMIN\tmenu.read\nADMIN\tmenu.write\nCUSTOM\tsentinel.read\nRECEPTION\tmenu.read'
for migration in ['202610090001_menu', '202610090002_menu_tables']:
    checksum = hashlib.sha256((root / 'database/baseline' / migration / 'migration.sql').read_bytes()).hexdigest()
    assert sql(name, f"SELECT COUNT(*) FROM _prisma_migrations WHERE migration_name='{migration}' AND checksum='{checksum}' AND finished_at IS NOT NULL AND rolled_back_at IS NULL AND logs IS NULL AND applied_steps_count=1;") == '1'
before = snapshot(name)
assert 'LYNE_CATALOGUE_REFUSE' in sql(name, script)
assert snapshot(name) == before
assert 'LYNE_RETOUR_REFUSE' in sql(name, (folder / '03-retour-avant-catalogue.sql').read_text())
# Compare schema fingerprints to independently executed canonical DDL.
canonical = fixture()
sql(canonical, (root / 'database/baseline/202610090002_menu_tables/migration.sql').read_text())
golden = json.loads((folder / 'menu-fingerprints.json').read_text())
queries = 'SET SESSION group_concat_max_len=1048576;\n'
for line in (folder / '01-controle-lecture-seule.sql').read_text().splitlines():
    if any(line.startswith(f'SET @lyne_{key} = ') for key in golden):
        queries += line.replace("'audit_logs','departments','employees','job_titles','permissions','roles','role_permissions','sessions','users'", "'menu_categories','menu_items','menu_price_history'") + '\n'
queries += 'SELECT ' + ','.join('@lyne_' + key for key in golden) + ';'
assert sql(canonical, queries) == sql(name, queries) == '\t'.join(golden.values())
# Failure inside permission transaction: even a client continuing after an error
# must roll back all permission changes and avoid DDL or successful history.
failed_dml = fixture()
before = snapshot(failed_dml)
needle = generator.guarded('UPDATE _prisma_migrations SET finished_at=CURRENT_TIMESTAMP(3),applied_steps_count=1 WHERE id=@lyne_migration_id AND finished_at IS NULL')
broken = script.replace(needle, generator.guarded('INSERT INTO lyne_intentionally_missing VALUES (1)') + needle, 1)
assert 'LYNE_CATALOGUE_ARRET_VERIFIER_ETAT' in sql(failed_dml, broken, continued_error=True)
assert snapshot(failed_dml) == before
assert sql(failed_dml, "SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE();") == '11'
# Mid-DDL failure: preserve unfinished migration and existing table, refuse retry.
failed_ddl = fixture()
data = (root / 'database/baseline/202610090002_menu_tables/migration.sql').read_text()
first_ddl = generator.guarded(generator.statements(data)[0])
broken = script.replace(first_ddl, first_ddl + generator.guarded('ALTER TABLE lyne_intentionally_missing ADD COLUMN nope INT'), 1)
assert 'LYNE_CATALOGUE_ARRET_VERIFIER_ETAT' in sql(failed_ddl, broken, continued_error=True)
assert sql(failed_ddl, "SELECT finished_at IS NULL,applied_steps_count FROM _prisma_migrations WHERE migration_name='202610090002_menu_tables';") == '1\t0'
assert sql(failed_ddl, "SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME LIKE 'menu%';") == '1'
before = snapshot(failed_ddl)
assert 'LYNE_CATALOGUE_REFUSE' in sql(failed_ddl, script)
assert snapshot(failed_ddl) == before
# Reproduce the exact class of user incident: statement truncated mid-checksum
# after all DDL, with no subsequent statements received by phpMyAdmin.
truncated = fixture()
marker = "SET @lyne_ok = COALESCE(@lyne_ok AND @lyne_tables='02ff"
offset = script.index(marker)
partial = script[offset:].splitlines()[0]
partial = partial[:partial.index("AND @lyne_indexes='") + len("AND @lyne_indexes='") + 40] + ';'
sql(truncated, script[:offset] + partial, continued_error=True)
assert sql(truncated, "SELECT finished_at IS NULL,applied_steps_count FROM _prisma_migrations WHERE migration_name='202610090002_menu_tables';") == '1\t0'
diagnostic = (folder / '05-diagnostic-apres-interruption.sql').read_text()
for target, conforms in [(name, True), (truncated, True), (failed_ddl, False)]:
    before = snapshot(target)
    result = sql(target, diagnostic)
    assert result.splitlines()[0] == target
    assert (result.splitlines()[-1] == target + '\t1\t1\t1\t1\t1') == conforms
    assert snapshot(target) == before
print('MENU_IMPORT_TESTS_OK: exact canonical DDL/checksums, grants, archive/custom data preservation, drift/collision/FK/retry/rollback guards, DML rollback and partial-DDL failure detection.')
print('INTERRUPTION_DIAGNOSTIC_OK: mid-checksum truncation reproduced; complete, unfinished-complete and partial schemas distinguished without writes.')
print('Synthetic fixtures retained:', *fixtures)
