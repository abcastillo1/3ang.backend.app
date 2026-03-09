-- Permisos para el módulo de proyectos de auditoría y asignaciones
INSERT INTO permissions (code, module, description, created_at, updated_at)
VALUES
  ('projects.create', 'projects', 'Crear proyectos de auditoría', NOW(), NOW()),
  ('projects.view', 'projects', 'Ver proyectos de auditoría', NOW(), NOW()),
  ('projects.update', 'projects', 'Actualizar proyectos de auditoría', NOW(), NOW()),
  ('projects.delete', 'projects', 'Eliminar proyectos de auditoría', NOW(), NOW()),
  ('projects.assignments.manage', 'projects', 'Gestionar asignaciones de equipo en proyectos', NOW(), NOW())
ON DUPLICATE KEY UPDATE updated_at = NOW();
