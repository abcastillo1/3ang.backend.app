-- Permission for managing permanent file sections and checklist items
INSERT INTO permissions (code, module, description, created_at, updated_at)
VALUES ('projects.permanentFile.manage', 'projects', 'Manage permanent file sections and checklist items', NOW(), NOW());

-- Grant to Administrator, Socio, Supervisor (same roles as tree.manage)
INSERT INTO role_permissions (role_id, permission_id, created_at, updated_at)
SELECT r.id, p.id, NOW(), NOW()
FROM roles r
JOIN permissions p ON p.code = 'projects.permanentFile.manage'
WHERE r.name IN ('Administrador', 'Socio', 'Supervisor');
