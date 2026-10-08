
-- Add only the Phase 3 permissions. Existing accounts and custom grants remain.
INSERT INTO permissions (id, code, name, created_at, updated_at) VALUES
('perm_menu_read', 'menu.read', 'Consulter le menu et les prix', CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
('perm_menu_write', 'menu.write', 'Gérer le catalogue et les prix', CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
('perm_menu_availability', 'menu.availability', 'Changer la disponibilité des produits', CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3));
INSERT INTO role_permissions (role_id, permission_id, created_at)
SELECT r.id, p.id, CURRENT_TIMESTAMP(3) FROM roles r JOIN permissions p ON p.code IN ('menu.read', 'menu.write', 'menu.availability')
WHERE r.code = 'ADMIN';
INSERT INTO role_permissions (role_id, permission_id, created_at)
SELECT r.id, p.id, CURRENT_TIMESTAMP(3) FROM roles r JOIN permissions p ON p.code = 'menu.read'
WHERE r.code = 'RECEPTION';
