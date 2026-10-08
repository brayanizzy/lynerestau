-- LYNE : diagnostic de l'historique uniquement, à exécuter dans la base LYNE.
-- Aucune donnée utilisateur, aucun mot de passe, aucune écriture.
SELECT migration_name, checksum, started_at, finished_at, rolled_back_at,
       applied_steps_count
FROM _prisma_migrations
ORDER BY started_at;

-- Présence des tables attendues ; ne lit pas leurs données métier.
SELECT TABLE_NAME, ENGINE, TABLE_COLLATION
FROM information_schema.TABLES
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME IN ('users','roles','permissions','role_permissions','sessions',
    'audit_logs','employees','departments','job_titles',
    'menu_categories','menu_items','menu_price_history')
ORDER BY TABLE_NAME;
