-- LYNE : diagnostic APRES import interrompu. Aucune donnee modifiee.
-- Importer ce fichier entier dans LA BASE OU L ERREUR EST SURVENUE.
SELECT DATABASE() AS base;
SELECT migration_name, checksum, finished_at, rolled_back_at,
       applied_steps_count, (logs IS NULL) AS sans_logs
FROM _prisma_migrations ORDER BY started_at, migration_name;
SELECT TABLE_NAME FROM information_schema.TABLES
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME IN ('menu_categories', 'menu_items', 'menu_price_history',
                     '_prisma_migrations_legacy_20261009')
ORDER BY TABLE_NAME;
SET SESSION group_concat_max_len = 1048576;
SET @lyne_tables = (SELECT
  SHA2(GROUP_CONCAT(
  CONCAT_WS(
  '|',TABLE_NAME,ENGINE,TABLE_COLLATION) ORDER BY
  TABLE_NAME SEPARATOR '\n'),256) FROM
  information_schema.TABLES WHERE
  TABLE_SCHEMA=DATABASE() AND
  TABLE_NAME IN ('menu_categories','menu_items','menu_price_history'));
SET @lyne_columns = (SELECT
  SHA2(GROUP_CONCAT(
  CONCAT_WS(
  '|',TABLE_NAME,COLUMN_NAME,COLUMN_TYPE,IS_NULLABLE,COALESCE(COLUMN_DEFAULT,'<NULL>'),COALESCE(CHARACTER_SET_NAME,''),COALESCE(COLLATION_NAME,''),EXTRA,COALESCE(GENERATION_EXPRESSION,'')) ORDER BY
  TABLE_NAME,COLUMN_NAME SEPARATOR '\n'),256) FROM
  information_schema.COLUMNS WHERE
  TABLE_SCHEMA=DATABASE() AND
  TABLE_NAME IN ('menu_categories','menu_items','menu_price_history'));
SET @lyne_indexes = (SELECT
  SHA2(GROUP_CONCAT(
  CONCAT_WS(
  '|',TABLE_NAME,INDEX_NAME,NON_UNIQUE,SEQ_IN_INDEX,COLUMN_NAME,COALESCE(SUB_PART,0),INDEX_TYPE) ORDER BY
  TABLE_NAME,INDEX_NAME,SEQ_IN_INDEX SEPARATOR '\n'),256) FROM
  information_schema.STATISTICS WHERE
  TABLE_SCHEMA=DATABASE() AND
  TABLE_NAME IN ('menu_categories','menu_items','menu_price_history'));
SET @lyne_foreign_keys = (SELECT
  SHA2(GROUP_CONCAT(
  CONCAT_WS(
  '|',k.TABLE_NAME,k.CONSTRAINT_NAME,k.COLUMN_NAME,k.ORDINAL_POSITION,k.REFERENCED_TABLE_NAME,k.REFERENCED_COLUMN_NAME,r.UPDATE_RULE,r.DELETE_RULE) ORDER BY
  k.TABLE_NAME,k.CONSTRAINT_NAME,k.ORDINAL_POSITION SEPARATOR '\n'),256) FROM
  information_schema.KEY_COLUMN_USAGE k JOIN
  information_schema.REFERENTIAL_CONSTRAINTS r ON
  r.CONSTRAINT_SCHEMA=k.CONSTRAINT_SCHEMA AND
  r.TABLE_NAME=k.TABLE_NAME AND
  r.CONSTRAINT_NAME=k.CONSTRAINT_NAME WHERE
  k.TABLE_SCHEMA=DATABASE() AND
  k.REFERENCED_TABLE_NAME IS NOT NULL AND
  k.TABLE_NAME IN ('menu_categories','menu_items','menu_price_history'));
SET @lyne_checks = (SELECT
  SHA2(COALESCE(GROUP_CONCAT(
  CONCAT_WS(
  '|',TABLE_NAME,CONSTRAINT_NAME,CHECK_CLAUSE) ORDER BY
  TABLE_NAME,CONSTRAINT_NAME SEPARATOR '\n'),''),256) FROM
  information_schema.CHECK_CONSTRAINTS WHERE
  CONSTRAINT_SCHEMA=DATABASE() AND
  TABLE_NAME IN ('menu_categories','menu_items','menu_price_history'));
SELECT DATABASE() AS base,
  COALESCE(@lyne_tables =
    '02ff45dfbdda7d6f4f42b41585245b3893ef544fe0e3fb4474d60db1f999dc83', FALSE) AS tables_conformes,
  COALESCE(@lyne_columns =
    '2974fb0a04f430e3b749b23e8c0823dd1eee25a4b8c3005e20079fe88a1015af', FALSE) AS columns_conformes,
  COALESCE(@lyne_indexes =
    '886bbf82f877437b2d07c8041df7d721cb4d94515dc3445789271f79f1ec8824', FALSE) AS indexes_conformes,
  COALESCE(@lyne_foreign_keys =
    '56a78d3012d1f1616c6ef8b41f831afe2591c2c10b374cb9cd26ae2eebcff88b', FALSE) AS foreign_keys_conformes,
  COALESCE(@lyne_checks =
    'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855', FALSE) AS checks_conformes;
