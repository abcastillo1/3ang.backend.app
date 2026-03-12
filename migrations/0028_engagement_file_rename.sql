-- Centralizar nomenclatura: expediente estructurado (molde + instancia).
-- Renombra tablas permanent_file_* → engagement_file_*.
-- Requiere que existan las tablas origen (migraciones 0019–0021).

RENAME TABLE permanent_file_sections TO engagement_file_sections;
RENAME TABLE permanent_file_template_sections TO engagement_file_template_sections;
RENAME TABLE permanent_file_template_items TO engagement_file_template_items;

-- Raíz del árbol: mismo nodo, tipo unificado (sync/helpers usan engagement_file)
UPDATE audit_tree_nodes SET type = 'engagement_file' WHERE type = 'permanent_file';

-- Permiso nuevo; copiar asignaciones del permiso viejo
INSERT INTO permissions (code, module, description, created_at, updated_at)
VALUES ('projects.engagementFile.manage', 'projects', 'Manage engagement file sections and checklist items', NOW(), NOW());

INSERT INTO role_permissions (role_id, permission_id, created_at, updated_at)
SELECT rp.role_id, p_new.id, NOW(), NOW()
FROM role_permissions rp
JOIN permissions p_old ON p_old.id = rp.permission_id AND p_old.code = 'projects.permanentFile.manage'
JOIN permissions p_new ON p_new.code = 'projects.engagementFile.manage'
WHERE NOT EXISTS (
  SELECT 1 FROM role_permissions rp2
  WHERE rp2.role_id = rp.role_id AND rp2.permission_id = p_new.id
);

-- Asegurar roles con acceso si no se copió desde permiso viejo
INSERT INTO role_permissions (role_id, permission_id, created_at, updated_at)
SELECT r.id, p.id, NOW(), NOW()
FROM roles r
CROSS JOIN permissions p
WHERE p.code = 'projects.engagementFile.manage'
  AND r.name IN ('Administrador', 'Socio', 'Supervisor')
  AND NOT EXISTS (SELECT 1 FROM role_permissions rp WHERE rp.role_id = r.id AND rp.permission_id = p.id);

-- Opcional: quitar permiso viejo (descomentar cuando el código ya no lo use)
-- DELETE FROM role_permissions WHERE permission_id = (SELECT id FROM permissions WHERE code = 'projects.permanentFile.manage' LIMIT 1);
-- DELETE FROM permissions WHERE code = 'projects.permanentFile.manage';
