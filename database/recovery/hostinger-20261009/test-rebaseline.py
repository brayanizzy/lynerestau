"""Exercise the guarded SQL with synthetic data on a local MariaDB socket only.
Requires LYNE_TEST_MYSQL_CLIENT and LYNE_TEST_MYSQL_SOCKET. Keeps its two isolated
fixture databases for inspection; never selects the application database.
"""
from pathlib import Path
import os
import subprocess
import uuid

root = Path(__file__).resolve().parents[3]
folder = Path(__file__).resolve().parent
client = [os.environ['LYNE_TEST_MYSQL_CLIENT'], '--no-defaults',
          '--socket=' + os.environ['LYNE_TEST_MYSQL_SOCKET'],
          '--user=' + os.environ.get('LYNE_TEST_MYSQL_USER', 'agent'),
          '--batch', '--skip-column-names']

def sql(database, query):
    result = subprocess.run(client + ['--database=' + database], input=query,
                            text=True, capture_output=True)
    if result.returncode:
        raise RuntimeError(result.stderr)
    return result.stdout.strip()

history_schema = """
CREATE TABLE _prisma_migrations (
 id VARCHAR(36) NOT NULL PRIMARY KEY, checksum VARCHAR(64) NOT NULL,
 finished_at DATETIME(3), migration_name VARCHAR(255) NOT NULL, logs TEXT,
 rolled_back_at DATETIME(3), started_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
 applied_steps_count INT UNSIGNED NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
"""
history = [
 ('202609250001_phase1_auth', '8ed679e2d5ca9fa3624ef4e40152a45335005d8b3fb4eb1483abb7380f97aaff'),
 ('20260928170000_personnel', 'b2fda43adf38a23f52f17ca51a4f11e888824b5fab61565c110c5ec4e3eb9957'),
]
control = (folder / '01-controle-lecture-seule.sql').read_text()
adopt = (folder / '02-adopter-baseline-sur-copie.sql').read_text()
rollback = (folder / '03-retour-avant-catalogue.sql').read_text()

def fixture():
    name = 'lyne_rebaseline_test_' + uuid.uuid4().hex[:12]
    sql('information_schema', 'CREATE DATABASE ' + name + ' CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;')
    sql(name, (root / 'database/baseline/202610080001_phase2/migration.sql').read_text() + history_schema)
    for i, (migration, checksum) in enumerate(history):
        sql(name, "INSERT INTO _prisma_migrations (id,checksum,migration_name,finished_at,applied_steps_count) VALUES "
                  "('synthetic-" + str(i) + "','" + checksum + "','" + migration + "',CURRENT_TIMESTAMP(3),1);")
    sql(name, "INSERT INTO roles(id,code,name,created_at,updated_at) VALUES "
              "('sentinel','FIXTURE','Synthetic sentinel',CURRENT_TIMESTAMP(3),CURRENT_TIMESTAMP(3));")
    return name

name = fixture()
rows = sql(name, 'SELECT * FROM roles ORDER BY id;')
old = sql(name, 'SELECT * FROM _prisma_migrations ORDER BY id;')
assert 'LYNE_CONTROLES_OK' in sql(name, control)
sql(name, "UPDATE _prisma_migrations SET checksum=REPEAT('0',64) WHERE id='synthetic-1';")
assert 'LYNE_ARRET_CONTROLES_NON_CONFORMES' in sql(name, adopt)
sql(name, "UPDATE _prisma_migrations SET checksum='" + history[1][1] + "' WHERE id='synthetic-1';")
sql(name, 'ALTER TABLE employees ADD COLUMN synthetic_drift INT;')
assert 'LYNE_ARRET_CONTROLES_NON_CONFORMES' in sql(name, adopt)
sql(name, 'ALTER TABLE employees DROP COLUMN synthetic_drift;')
assert 'LYNE_BASELINE_PRESENTE' in sql(name, adopt)
assert sql(name, 'SELECT * FROM _prisma_migrations_legacy_20261009 ORDER BY id;') == old
assert sql(name, 'SELECT * FROM roles ORDER BY id;') == rows
active = sql(name, 'SELECT * FROM _prisma_migrations ORDER BY id;')
assert 'LYNE_ARRET_CONTROLES_NON_CONFORMES' in sql(name, adopt)
assert sql(name, 'SELECT * FROM _prisma_migrations ORDER BY id;') == active
# Any subsequent history entry prevents rollback, even before catalogue DDL.
sql(name, "INSERT INTO _prisma_migrations(id,checksum,migration_name,finished_at) VALUES ('later',REPEAT('a',64),'synthetic_later',CURRENT_TIMESTAMP(3));")
assert 'LYNE_RETOUR_REFUSE' in sql(name, rollback)
assert sql(name, 'SELECT * FROM _prisma_migrations_legacy_20261009 ORDER BY id;') == old
# Validate an actual rollback on an independent fixture, with no extra migrations.
second = fixture()
second_old = sql(second, 'SELECT * FROM _prisma_migrations ORDER BY id;')
assert 'LYNE_BASELINE_PRESENTE' in sql(second, adopt)
sql(second, rollback)
assert sql(second, 'SELECT * FROM _prisma_migrations ORDER BY id;') == second_old
assert sql(second, 'SELECT COUNT(*) FROM _prisma_migrations_baseline_rollback_20261009;') == '1'
print('REBASELINE_SQL_TESTS_OK: drift/checksum/retry/later-migration refusals; business sentinel preserved; exact archive and rollback verified.')
print('Synthetic fixtures retained:', name, second)
