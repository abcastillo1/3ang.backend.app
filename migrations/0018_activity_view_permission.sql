-- Permission to view activity log (org and project-scoped history)
INSERT INTO permissions (code, module, description, created_at, updated_at)
VALUES ('activity.view', 'audit', 'Ver historial de actividad de la organización y por proyecto', NOW(), NOW());

-- Grant to Administrador, Socio, Supervisor, Auditor (not Asistente) for all organizations
INSERT INTO role_permissions (role_id, permission_id, created_at, updated_at)
SELECT r.id, p.id, NOW(), NOW()
FROM roles r
CROSS JOIN permissions p
WHERE p.code = 'activity.view'
  AND r.name IN ('Administrador', 'Socio', 'Supervisor', 'Auditor');
