-- Permisos para el módulo de clientes
INSERT INTO permissions (code, module, description, created_at, updated_at)
VALUES
  ('clients.create', 'clients', 'Crear clientes', NOW(), NOW()),
  ('clients.view', 'clients', 'Ver clientes', NOW(), NOW()),
  ('clients.update', 'clients', 'Actualizar clientes', NOW(), NOW()),
  ('clients.delete', 'clients', 'Eliminar clientes', NOW(), NOW())
ON DUPLICATE KEY UPDATE updated_at = NOW();
