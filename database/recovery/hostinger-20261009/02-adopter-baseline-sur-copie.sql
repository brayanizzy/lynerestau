SET @lyne_lock = GET_LOCK(SHA2(CONCAT(DATABASE(),':lyne-rebaseline-20261009'),256),5);
-- LYNE : adoption explicite de la baseline Phase 2, SANS rejouer son DDL.
-- Tester d'abord sur une COPIE privée, sauvegarde complète conservée.
-- Les neuf tables métier ne sont ni écrites ni renommées.
-- L'ancien historique est conservé intact dans _prisma_migrations_legacy_20261009.
-- Exécuter tout le fichier en une seule importation phpMyAdmin, pas ligne par ligne.
-- Les SET ne modifient que la connexion courante. Aucun changement de réglage global.
SET SESSION group_concat_max_len=1048576;
SET @lyne_tables = (SELECT SHA2(GROUP_CONCAT(CONCAT_WS('|',TABLE_NAME,ENGINE,TABLE_COLLATION) ORDER BY TABLE_NAME SEPARATOR '\n'),256) FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME IN ('audit_logs','departments','employees','job_titles','permissions','roles','role_permissions','sessions','users'));
SET @lyne_columns = (SELECT SHA2(GROUP_CONCAT(CONCAT_WS('|',TABLE_NAME,COLUMN_NAME,COLUMN_TYPE,IS_NULLABLE,COALESCE(COLUMN_DEFAULT,'<NULL>'),COALESCE(CHARACTER_SET_NAME,''),COALESCE(COLLATION_NAME,''),EXTRA,COALESCE(GENERATION_EXPRESSION,'')) ORDER BY TABLE_NAME,COLUMN_NAME SEPARATOR '\n'),256) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME IN ('audit_logs','departments','employees','job_titles','permissions','roles','role_permissions','sessions','users'));
SET @lyne_indexes = (SELECT SHA2(GROUP_CONCAT(CONCAT_WS('|',TABLE_NAME,INDEX_NAME,NON_UNIQUE,SEQ_IN_INDEX,COLUMN_NAME,COALESCE(SUB_PART,0),INDEX_TYPE) ORDER BY TABLE_NAME,INDEX_NAME,SEQ_IN_INDEX SEPARATOR '\n'),256) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME IN ('audit_logs','departments','employees','job_titles','permissions','roles','role_permissions','sessions','users'));
SET @lyne_foreign_keys = (SELECT SHA2(GROUP_CONCAT(CONCAT_WS('|',k.TABLE_NAME,k.CONSTRAINT_NAME,k.COLUMN_NAME,k.ORDINAL_POSITION,k.REFERENCED_TABLE_NAME,k.REFERENCED_COLUMN_NAME,r.UPDATE_RULE,r.DELETE_RULE) ORDER BY k.TABLE_NAME,k.CONSTRAINT_NAME,k.ORDINAL_POSITION SEPARATOR '\n'),256) FROM information_schema.KEY_COLUMN_USAGE k JOIN information_schema.REFERENTIAL_CONSTRAINTS r ON r.CONSTRAINT_SCHEMA=k.CONSTRAINT_SCHEMA AND r.TABLE_NAME=k.TABLE_NAME AND r.CONSTRAINT_NAME=k.CONSTRAINT_NAME WHERE k.TABLE_SCHEMA=DATABASE() AND k.REFERENCED_TABLE_NAME IS NOT NULL AND k.TABLE_NAME IN ('audit_logs','departments','employees','job_titles','permissions','roles','role_permissions','sessions','users'));
SET @lyne_checks = (SELECT SHA2(COALESCE(GROUP_CONCAT(CONCAT_WS('|',TABLE_NAME,CONSTRAINT_NAME,CHECK_CLAUSE) ORDER BY TABLE_NAME,CONSTRAINT_NAME SEPARATOR '\n'),''),256) FROM information_schema.CHECK_CONSTRAINTS WHERE CONSTRAINT_SCHEMA=DATABASE() AND TABLE_NAME IN ('audit_logs','departments','employees','job_titles','permissions','roles','role_permissions','sessions','users'));
SET @lyne_history_ok = ((SELECT COUNT(*) FROM _prisma_migrations)=2 AND (SELECT COUNT(*) FROM _prisma_migrations WHERE ((migration_name='202609250001_phase1_auth' AND checksum='8ed679e2d5ca9fa3624ef4e40152a45335005d8b3fb4eb1483abb7380f97aaff') OR (migration_name='20260928170000_personnel' AND checksum='b2fda43adf38a23f52f17ca51a4f11e888824b5fab61565c110c5ec4e3eb9957')) AND finished_at IS NOT NULL AND rolled_back_at IS NULL AND logs IS NULL AND applied_steps_count=1)=2);
SET @lyne_slots_ok = ((SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE())=10 AND (SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME IN ('_lyne_baseline_stage_20261009','_prisma_migrations_legacy_20261009','_prisma_migrations_baseline_rollback_20261009'))=0);
SET @lyne_objects_ok = ((SELECT COUNT(*) FROM information_schema.TRIGGERS WHERE TRIGGER_SCHEMA=DATABASE())=0 AND (SELECT COUNT(*) FROM information_schema.ROUTINES WHERE ROUTINE_SCHEMA=DATABASE())=0 AND (SELECT COUNT(*) FROM information_schema.EVENTS WHERE EVENT_SCHEMA=DATABASE())=0);
SET @lyne_ok = COALESCE(@lyne_history_ok AND @lyne_slots_ok AND @lyne_objects_ok AND @lyne_tables='92c227338338ebe132a8a237811f516067ea15101f5868dd98227b71f5e9af0b' AND @lyne_columns='f0edc0baff05f09538505dc7e88833130a9240c81444f1b2071f4447fe25654d' AND @lyne_indexes='3c4f29c43771767cdb4f806f516cf087d4317e699d500d271c98e41ee41a7d14' AND @lyne_foreign_keys='f66104aa32eddebfb7fab8c70d6896c2465f0f689841b1f4077b80e3af679434' AND @lyne_checks='f78e769e5651998a92586e7842e9b39f6ab5cb85f0aefd10fe0f9d8d193e317b',FALSE);
SET @lyne_ok = COALESCE(@lyne_ok AND @lyne_lock=1,FALSE);
SELECT IF(@lyne_ok,'LYNE_CONTROLES_OK','LYNE_ARRET_CONTROLES_NON_CONFORMES') AS resultat, @lyne_history_ok AS historique, @lyne_slots_ok AS emplacements, @lyne_objects_ok AS objets, (@lyne_tables='92c227338338ebe132a8a237811f516067ea15101f5868dd98227b71f5e9af0b') AS tables, (@lyne_columns='f0edc0baff05f09538505dc7e88833130a9240c81444f1b2071f4447fe25654d') AS columns, (@lyne_indexes='3c4f29c43771767cdb4f806f516cf087d4317e699d500d271c98e41ee41a7d14') AS indexes, (@lyne_foreign_keys='f66104aa32eddebfb7fab8c70d6896c2465f0f689841b1f4077b80e3af679434') AS foreign_keys, (@lyne_checks='f78e769e5651998a92586e7842e9b39f6ab5cb85f0aefd10fe0f9d8d193e317b') AS checks;
SET @lyne_sql = IF(@lyne_ok,'CREATE TABLE `_lyne_baseline_stage_20261009` LIKE `_prisma_migrations`', 'SELECT ''LYNE_ARRET_AUCUNE_MODIFICATION'' AS resultat');
PREPARE lyne_reprise FROM @lyne_sql;
EXECUTE lyne_reprise;
DEALLOCATE PREPARE lyne_reprise;
SET @lyne_sql = IF(@lyne_ok,'INSERT INTO `_lyne_baseline_stage_20261009` (id,checksum,finished_at,migration_name,logs,rolled_back_at,started_at,applied_steps_count) VALUES (UUID(),''589ff17cd85319e5be609fe075c7c1d82e9e2e562ee9fc13ccf7fb3090cf10e3'',CURRENT_TIMESTAMP(3),''202610080001_phase2'',NULL,NULL,CURRENT_TIMESTAMP(3),0)', 'SELECT ''LYNE_ARRET_AUCUNE_MODIFICATION'' AS resultat');
PREPARE lyne_reprise FROM @lyne_sql;
EXECUTE lyne_reprise;
DEALLOCATE PREPARE lyne_reprise;
SET @lyne_candidate_ok = FALSE;
SET @lyne_sql = IF(@lyne_ok,'SELECT (COUNT(*)=1 AND SUM(checksum=''589ff17cd85319e5be609fe075c7c1d82e9e2e562ee9fc13ccf7fb3090cf10e3'' AND migration_name=''202610080001_phase2'' AND finished_at IS NOT NULL AND rolled_back_at IS NULL AND applied_steps_count=0)=1) INTO @lyne_candidate_ok FROM `_lyne_baseline_stage_20261009`', 'SELECT ''LYNE_ARRET_AUCUNE_MODIFICATION'' AS resultat');
PREPARE lyne_reprise FROM @lyne_sql;
EXECUTE lyne_reprise;
DEALLOCATE PREPARE lyne_reprise;
SET @lyne_ok = COALESCE(@lyne_ok AND @lyne_candidate_ok,FALSE);
SET @lyne_sql = IF(@lyne_ok,'RENAME TABLE `_prisma_migrations` TO `_prisma_migrations_legacy_20261009`, `_lyne_baseline_stage_20261009` TO `_prisma_migrations`', 'SELECT ''LYNE_ARRET_AUCUNE_MODIFICATION'' AS resultat');
PREPARE lyne_reprise FROM @lyne_sql;
EXECUTE lyne_reprise;
DEALLOCATE PREPARE lyne_reprise;
SELECT IF((SELECT COUNT(*) FROM _prisma_migrations)=1 AND (SELECT COUNT(*) FROM _prisma_migrations WHERE migration_name='202610080001_phase2' AND checksum='589ff17cd85319e5be609fe075c7c1d82e9e2e562ee9fc13ccf7fb3090cf10e3' AND finished_at IS NOT NULL)=1 AND (SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='_prisma_migrations_legacy_20261009')=1,'LYNE_BASELINE_PRESENTE','LYNE_ARRET_VERIFIER_ETAT') AS resultat;
SELECT migration_name,checksum,finished_at,rolled_back_at,applied_steps_count FROM _prisma_migrations ORDER BY started_at;
DO RELEASE_LOCK(SHA2(CONCAT(DATABASE(),':lyne-rebaseline-20261009'),256));
