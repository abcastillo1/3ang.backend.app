-- Reset completo de permisos, roles y asignaciones.
-- Ejecutar una sola vez. Ajustar organization_id si es diferente de 1.

SET @org_id = 1;

-- ============================================================
-- 1. LIMPIAR DATOS EXISTENTES
-- ============================================================
SET FOREIGN_KEY_CHECKS = 0;

DELETE FROM role_permissions;
DELETE FROM permissions;
DELETE FROM roles WHERE organization_id = @org_id;

ALTER TABLE permissions AUTO_INCREMENT = 1;

SET FOREIGN_KEY_CHECKS = 1;

-- ============================================================
-- 2. PERMISOS (22 en total)
-- ============================================================
INSERT INTO permissions (code, module, description, created_at, updated_at) VALUES
  -- Usuarios (1-2)
  ('users.view', 'users', 'Ver listado de usuarios', NOW(), NOW()),
  ('users.create', 'users', 'Crear usuarios', NOW(), NOW()),
  -- Roles (3-6)
  ('roles.create', 'roles', 'Crear roles', NOW(), NOW()),
  ('roles.view', 'roles', 'Ver roles', NOW(), NOW()),
  ('roles.update', 'roles', 'Actualizar roles y asignar permisos', NOW(), NOW()),
  ('roles.delete', 'roles', 'Eliminar roles', NOW(), NOW()),
  -- Permisos (7)
  ('permissions.view', 'permissions', 'Ver listado de permisos disponibles', NOW(), NOW()),
  -- Organizaciones (8-11)
  ('organizations.create', 'organizations', 'Crear organizaciones', NOW(), NOW()),
  ('organizations.view', 'organizations', 'Ver detalle de organización', NOW(), NOW()),
  ('organizations.update', 'organizations', 'Actualizar organización', NOW(), NOW()),
  ('settings.organizations.view', 'settings', 'Listar organizaciones (admin)', NOW(), NOW()),
  -- Archivos (12)
  ('files.upload', 'files', 'Subir archivos, confirmar, vincular, listar y eliminar documentos', NOW(), NOW()),
  -- Clientes (13-16)
  ('clients.create', 'clients', 'Crear clientes', NOW(), NOW()),
  ('clients.view', 'clients', 'Ver clientes', NOW(), NOW()),
  ('clients.update', 'clients', 'Actualizar clientes', NOW(), NOW()),
  ('clients.delete', 'clients', 'Eliminar clientes', NOW(), NOW()),
  -- Proyectos (17-22)
  ('projects.create', 'projects', 'Crear proyectos de auditoría', NOW(), NOW()),
  ('projects.view', 'projects', 'Ver proyectos, asignaciones y árbol', NOW(), NOW()),
  ('projects.update', 'projects', 'Actualizar proyectos (datos y estado)', NOW(), NOW()),
  ('projects.delete', 'projects', 'Eliminar proyectos (solo draft)', NOW(), NOW()),
  ('projects.assignments.manage', 'projects', 'Gestionar asignaciones de equipo en proyectos', NOW(), NOW()),
  ('projects.tree.manage', 'projects', 'Gestionar nodos del árbol del proyecto', NOW(), NOW());

-- ============================================================
-- 3. ROLES (5 roles para la organización)
-- ============================================================
INSERT INTO roles (organization_id, name, description, is_system, created_at, updated_at) VALUES
  (@org_id, 'Administrador', 'Acceso total a la plataforma. Gestiona usuarios, roles, organización y todo el flujo de auditoría.', 1, NOW(), NOW()),
  (@org_id, 'Socio', 'Socio de la firma. Control total sobre proyectos, clientes y equipo. No gestiona usuarios ni roles.', 0, NOW(), NOW()),
  (@org_id, 'Supervisor', 'Encargado/gerente de auditoría. Gestiona proyectos, clientes, equipo y árbol. No puede eliminar proyectos.', 0, NOW(), NOW()),
  (@org_id, 'Auditor', 'Auditor de campo. Ve proyectos y clientes, gestiona el árbol y sube archivos.', 0, NOW(), NOW()),
  (@org_id, 'Asistente', 'Apoyo operativo. Solo ve proyectos, clientes y sube archivos. Sin permisos de escritura en estructura.', 0, NOW(), NOW());

-- ============================================================
-- 4. ASIGNAR PERMISOS A ROLES
-- ============================================================

-- Obtener IDs de roles recién creados
SET @rol_admin      = (SELECT id FROM roles WHERE organization_id = @org_id AND name = 'Administrador' LIMIT 1);
SET @rol_socio      = (SELECT id FROM roles WHERE organization_id = @org_id AND name = 'Socio' LIMIT 1);
SET @rol_supervisor = (SELECT id FROM roles WHERE organization_id = @org_id AND name = 'Supervisor' LIMIT 1);
SET @rol_auditor    = (SELECT id FROM roles WHERE organization_id = @org_id AND name = 'Auditor' LIMIT 1);
SET @rol_asistente  = (SELECT id FROM roles WHERE organization_id = @org_id AND name = 'Asistente' LIMIT 1);

-- ADMINISTRADOR: todos los permisos (22)
INSERT INTO role_permissions (role_id, permission_id, created_at, updated_at)
SELECT @rol_admin, id, NOW(), NOW() FROM permissions;

-- SOCIO: todo excepto gestión de usuarios, roles, permisos y organización (14 permisos)
INSERT INTO role_permissions (role_id, permission_id, created_at, updated_at)
SELECT @rol_socio, id, NOW(), NOW() FROM permissions
WHERE code IN (
  'users.view',
  'files.upload',
  'clients.create', 'clients.view', 'clients.update', 'clients.delete',
  'projects.create', 'projects.view', 'projects.update', 'projects.delete',
  'projects.assignments.manage',
  'projects.tree.manage',
  'organizations.view',
  'roles.view'
);

-- SUPERVISOR: gestión de proyectos + clientes + archivos, sin eliminar proyectos ni gestionar org (11 permisos)
INSERT INTO role_permissions (role_id, permission_id, created_at, updated_at)
SELECT @rol_supervisor, id, NOW(), NOW() FROM permissions
WHERE code IN (
  'users.view',
  'files.upload',
  'clients.create', 'clients.view', 'clients.update',
  'projects.create', 'projects.view', 'projects.update',
  'projects.assignments.manage',
  'projects.tree.manage',
  'roles.view'
);

-- AUDITOR: ve proyectos y clientes, gestiona árbol, sube archivos (6 permisos)
INSERT INTO role_permissions (role_id, permission_id, created_at, updated_at)
SELECT @rol_auditor, id, NOW(), NOW() FROM permissions
WHERE code IN (
  'files.upload',
  'clients.view',
  'projects.view',
  'projects.tree.manage',
  'users.view',
  'roles.view'
);

-- ASISTENTE: solo lectura + subir archivos (4 permisos)
INSERT INTO role_permissions (role_id, permission_id, created_at, updated_at)
SELECT @rol_asistente, id, NOW(), NOW() FROM permissions
WHERE code IN (
  'files.upload',
  'clients.view',
  'projects.view',
  'roles.view'
);
