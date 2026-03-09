-- ============================================================
-- SEED: Datos de demostración completos
-- Firma auditora + usuarios + cliente + proyecto + árbol
-- Ejecutar DESPUÉS de 0014_all_permissions_reset.sql
-- ============================================================

SET @org_id = 1;

-- ============================================================
-- 1. ORGANIZACIÓN (UPDATE con datos completos)
-- ============================================================
UPDATE organizations SET
  name = '3ANG Auditores & Consultores',
  legal_name = '3ANG Auditores & Consultores Cía. Ltda.',
  ruc = '1792345678001',
  sri_regimen = 'Régimen General',
  email = 'info@3angauditores.com',
  phone = '02-2567890',
  address = 'Av. República E7-123 y Almagro, Edificio Platinum, Oficina 401, Quito',
  country = 'Ecuador',
  city = 'Quito',
  website = 'https://www.3angauditores.com',
  default_currency = 'USD',
  timezone = 'America/Guayaquil',
  locale = 'es-EC',
  registration_number = 'SIC-2024-0456',
  environment = 'produccion',
  updated_at = NOW()
WHERE id = @org_id;

-- ============================================================
-- 2. ORGANIZATION SETTINGS
-- ============================================================
DELETE FROM organization_settings WHERE organization_id = @org_id;

INSERT INTO organization_settings (organization_id, setting_key, setting_value, created_at, updated_at) VALUES
  (@org_id, 'max_users', '25', NOW(), NOW()),
  (@org_id, 'max_audit_projects', '100', NOW(), NOW()),
  (@org_id, 'allowed_audit_types', '["financial","tax","compliance","operational","special"]', NOW(), NOW()),
  (@org_id, 'storage_limit_mb', '10240', NOW(), NOW()),
  (@org_id, 'default_niif_version', 'NIIF para PYMES 2023', NOW(), NOW()),
  (@org_id, 'document_retention_years', '7', NOW(), NOW()),
  (@org_id, 'project_tree_template', '[{"type":"permanent_file","name":"Archivo Permanente"},{"type":"planning","name":"Planificación"},{"type":"programs","name":"Programas de Auditoría"},{"type":"findings","name":"Hallazgos"},{"type":"reports","name":"Informes"}]', NOW(), NOW());

-- ============================================================
-- 3. USUARIOS (password: Demo2026! para todos)
-- ============================================================
-- Hash de bcrypt para "Demo2026!" (10 rounds)
SET @pass_hash = '$2a$10$8K1p/a0dL1LXMIgoEDFrwOflkEw0Y8gc4t1ePTbF2t1yBg5GGIHUy';

-- Obtener IDs de roles
SET @rol_admin      = (SELECT id FROM roles WHERE organization_id = @org_id AND name = 'Administrador' LIMIT 1);
SET @rol_socio      = (SELECT id FROM roles WHERE organization_id = @org_id AND name = 'Socio' LIMIT 1);
SET @rol_supervisor = (SELECT id FROM roles WHERE organization_id = @org_id AND name = 'Supervisor' LIMIT 1);
SET @rol_auditor    = (SELECT id FROM roles WHERE organization_id = @org_id AND name = 'Auditor' LIMIT 1);
SET @rol_asistente  = (SELECT id FROM roles WHERE organization_id = @org_id AND name = 'Asistente' LIMIT 1);

-- Actualizar usuario owner existente (id=1)
UPDATE users SET
  full_name = 'Andrés García Navarro',
  email = 'andres.garcia@3angauditores.com',
  username = 'agarcia',
  phone = '0991234567',
  document_type = 'cedula',
  document_number = '1712345678',
  password_hash = @pass_hash,
  role_id = @rol_admin,
  is_active = 1,
  updated_at = NOW()
WHERE id = 1 AND organization_id = @org_id;

-- Insertar equipo de la firma
INSERT INTO users (organization_id, role_id, full_name, username, email, phone, document_type, document_number, password_hash, is_active, created_at, updated_at) VALUES
  (@org_id, @rol_socio, 'María Fernanda Castillo', 'mcastillo', 'maria.castillo@3angauditores.com', '0987654321', 'cedula', '1723456789', @pass_hash, 1, NOW(), NOW()),
  (@org_id, @rol_supervisor, 'Carlos Andrés Mendoza', 'cmendoza', 'carlos.mendoza@3angauditores.com', '0976543210', 'cedula', '1734567890', @pass_hash, 1, NOW(), NOW()),
  (@org_id, @rol_auditor, 'Laura Patricia Vega', 'lvega', 'laura.vega@3angauditores.com', '0965432109', 'cedula', '1745678901', @pass_hash, 1, NOW(), NOW()),
  (@org_id, @rol_auditor, 'Roberto Daniel Flores', 'rflores', 'roberto.flores@3angauditores.com', '0954321098', 'cedula', '1756789012', @pass_hash, 1, NOW(), NOW()),
  (@org_id, @rol_asistente, 'Ana Lucía Paredes', 'aparedes', 'ana.paredes@3angauditores.com', '0943210987', 'cedula', '1767890123', @pass_hash, 1, NOW(), NOW());

-- Guardar IDs de usuarios
SET @user_owner      = 1;
SET @user_socia      = (SELECT id FROM users WHERE email = 'maria.castillo@3angauditores.com' LIMIT 1);
SET @user_supervisor = (SELECT id FROM users WHERE email = 'carlos.mendoza@3angauditores.com' LIMIT 1);
SET @user_auditor1   = (SELECT id FROM users WHERE email = 'laura.vega@3angauditores.com' LIMIT 1);
SET @user_auditor2   = (SELECT id FROM users WHERE email = 'roberto.flores@3angauditores.com' LIMIT 1);
SET @user_asistente  = (SELECT id FROM users WHERE email = 'ana.paredes@3angauditores.com' LIMIT 1);

-- ============================================================
-- 4. CLIENTES (empresas auditadas)
-- ============================================================
INSERT INTO clients (organization_id, name, legal_name, ruc, email, phone, address, is_active, created_at, updated_at) VALUES
  (@org_id, 'Comercial La Guayaquilita', 'Comercial La Guayaquilita S.A.', '0992345678001', 'contabilidad@guayaquilita.com', '04-2345678', 'Av. 9 de Octubre 1200, Guayaquil', 1, NOW(), NOW()),
  (@org_id, 'TechNova Ecuador', 'TechNova Ecuador Cía. Ltda.', '1792345679001', 'admin@technova.ec', '02-3456789', 'Av. Eloy Alfaro N34-567, Quito', 1, NOW(), NOW()),
  (@org_id, 'Agrícola del Pacífico', 'Agrícola del Pacífico S.A.', '0992345680001', 'gerencia@agripac.com', '05-2789012', 'Km 5 Vía Daule, Guayaquil', 1, NOW(), NOW());

SET @client_guayaquilita = (SELECT id FROM clients WHERE ruc = '0992345678001' LIMIT 1);
SET @client_technova     = (SELECT id FROM clients WHERE ruc = '1792345679001' LIMIT 1);
SET @client_agripac      = (SELECT id FROM clients WHERE ruc = '0992345680001' LIMIT 1);

-- ============================================================
-- 5. PROYECTOS DE AUDITORÍA
-- ============================================================
INSERT INTO audit_projects (organization_id, client_id, name, audit_type, period_start, period_end, status, created_at, updated_at) VALUES
  (@org_id, @client_guayaquilita, 'Auditoría Financiera 2025 - Comercial La Guayaquilita', 'financial', '2025-01-01', '2025-12-31', 'in_progress', NOW(), NOW()),
  (@org_id, @client_technova, 'Auditoría Tributaria 2025 - TechNova Ecuador', 'tax', '2025-01-01', '2025-12-31', 'planning', NOW(), NOW()),
  (@org_id, @client_agripac, 'Auditoría de Cumplimiento 2025 - Agrícola del Pacífico', 'compliance', '2025-01-01', '2025-12-31', 'draft', NOW(), NOW());

SET @proj_guayaquilita = (SELECT id FROM audit_projects WHERE client_id = @client_guayaquilita AND status = 'in_progress' LIMIT 1);
SET @proj_technova     = (SELECT id FROM audit_projects WHERE client_id = @client_technova LIMIT 1);
SET @proj_agripac      = (SELECT id FROM audit_projects WHERE client_id = @client_agripac LIMIT 1);

-- ============================================================
-- 6. ASIGNACIONES DE EQUIPO (proyecto principal)
-- ============================================================
INSERT INTO project_assignments (audit_project_id, user_id, role, created_at, updated_at) VALUES
  (@proj_guayaquilita, @user_socia, 'partner', NOW(), NOW()),
  (@proj_guayaquilita, @user_supervisor, 'manager', NOW(), NOW()),
  (@proj_guayaquilita, @user_auditor1, 'member', NOW(), NOW()),
  (@proj_guayaquilita, @user_auditor2, 'member', NOW(), NOW()),
  (@proj_guayaquilita, @user_asistente, 'member', NOW(), NOW()),
  (@proj_technova, @user_socia, 'partner', NOW(), NOW()),
  (@proj_technova, @user_supervisor, 'manager', NOW(), NOW()),
  (@proj_technova, @user_auditor1, 'member', NOW(), NOW());

-- ============================================================
-- 7. ÁRBOL DEL PROYECTO PRINCIPAL (Comercial La Guayaquilita)
--    Estructura completa con subsecciones
-- ============================================================

-- Nodos raíz (sistema)
INSERT INTO audit_tree_nodes (audit_project_id, parent_id, path, depth, type, name, sort_order, is_system_node, created_at, updated_at) VALUES
  (@proj_guayaquilita, NULL, '/', 0, 'permanent_file', 'Archivo Permanente', 1, 1, NOW(), NOW()),
  (@proj_guayaquilita, NULL, '/', 0, 'planning', 'Planificación', 2, 1, NOW(), NOW()),
  (@proj_guayaquilita, NULL, '/', 0, 'programs', 'Programas de Auditoría', 3, 1, NOW(), NOW()),
  (@proj_guayaquilita, NULL, '/', 0, 'findings', 'Hallazgos', 4, 1, NOW(), NOW()),
  (@proj_guayaquilita, NULL, '/', 0, 'reports', 'Informes', 5, 1, NOW(), NOW());

-- Obtener IDs raíz
SET @n_permanente   = (SELECT id FROM audit_tree_nodes WHERE audit_project_id = @proj_guayaquilita AND type = 'permanent_file' LIMIT 1);
SET @n_planificacion = (SELECT id FROM audit_tree_nodes WHERE audit_project_id = @proj_guayaquilita AND type = 'planning' LIMIT 1);
SET @n_programas    = (SELECT id FROM audit_tree_nodes WHERE audit_project_id = @proj_guayaquilita AND type = 'programs' LIMIT 1);
SET @n_hallazgos    = (SELECT id FROM audit_tree_nodes WHERE audit_project_id = @proj_guayaquilita AND type = 'findings' LIMIT 1);
SET @n_informes     = (SELECT id FROM audit_tree_nodes WHERE audit_project_id = @proj_guayaquilita AND type = 'reports' LIMIT 1);

-- Actualizar paths raíz
UPDATE audit_tree_nodes SET path = CONCAT('/', id, '/') WHERE audit_project_id = @proj_guayaquilita AND parent_id IS NULL;

-- ── Archivo Permanente: secciones ──
INSERT INTO audit_tree_nodes (audit_project_id, parent_id, path, depth, type, name, sort_order, is_system_node, created_at, updated_at) VALUES
  (@proj_guayaquilita, @n_permanente, '/', 1, 'section', 'A. Historia del Negocio', 1, 0, NOW(), NOW()),
  (@proj_guayaquilita, @n_permanente, '/', 1, 'section', 'B. Organización Societaria', 2, 0, NOW(), NOW()),
  (@proj_guayaquilita, @n_permanente, '/', 1, 'section', 'C. Gobierno Corporativo', 3, 0, NOW(), NOW()),
  (@proj_guayaquilita, @n_permanente, '/', 1, 'section', 'D. Situación Legal y Tributaria', 4, 0, NOW(), NOW()),
  (@proj_guayaquilita, @n_permanente, '/', 1, 'section', 'E. Sistemas de Información', 5, 0, NOW(), NOW()),
  (@proj_guayaquilita, @n_permanente, '/', 1, 'section', 'F. Contratos y Convenios', 6, 0, NOW(), NOW());

-- Actualizar paths de secciones del archivo permanente
UPDATE audit_tree_nodes SET path = CONCAT('/', @n_permanente, '/', id, '/')
WHERE audit_project_id = @proj_guayaquilita AND parent_id = @n_permanente;

-- Obtener IDs de secciones para sub-items
SET @sec_historia = (SELECT id FROM audit_tree_nodes WHERE audit_project_id = @proj_guayaquilita AND parent_id = @n_permanente AND name LIKE 'A.%' LIMIT 1);
SET @sec_societaria = (SELECT id FROM audit_tree_nodes WHERE audit_project_id = @proj_guayaquilita AND parent_id = @n_permanente AND name LIKE 'B.%' LIMIT 1);

-- Sub-ítems de "A. Historia del Negocio"
INSERT INTO audit_tree_nodes (audit_project_id, parent_id, path, depth, type, name, sort_order, is_system_node, created_at, updated_at) VALUES
  (@proj_guayaquilita, @sec_historia, '/', 2, 'checklist_item', 'CN-A1. Escritura de constitución', 1, 0, NOW(), NOW()),
  (@proj_guayaquilita, @sec_historia, '/', 2, 'checklist_item', 'CN-A2. Objeto social y actividades principales', 2, 0, NOW(), NOW()),
  (@proj_guayaquilita, @sec_historia, '/', 2, 'checklist_item', 'CN-A3. Principales productos y servicios', 3, 0, NOW(), NOW()),
  (@proj_guayaquilita, @sec_historia, '/', 2, 'checklist_item', 'CN-A4. Reseña histórica de la empresa', 4, 0, NOW(), NOW());

UPDATE audit_tree_nodes SET path = CONCAT('/', @n_permanente, '/', @sec_historia, '/', id, '/')
WHERE audit_project_id = @proj_guayaquilita AND parent_id = @sec_historia;

-- Sub-ítems de "B. Organización Societaria"
INSERT INTO audit_tree_nodes (audit_project_id, parent_id, path, depth, type, name, sort_order, is_system_node, created_at, updated_at) VALUES
  (@proj_guayaquilita, @sec_societaria, '/', 2, 'checklist_item', 'CN-B1. Nómina de accionistas', 1, 0, NOW(), NOW()),
  (@proj_guayaquilita, @sec_societaria, '/', 2, 'checklist_item', 'CN-B2. Composición del capital social', 2, 0, NOW(), NOW()),
  (@proj_guayaquilita, @sec_societaria, '/', 2, 'checklist_item', 'CN-B3. Estructura organizacional (organigrama)', 3, 0, NOW(), NOW());

UPDATE audit_tree_nodes SET path = CONCAT('/', @n_permanente, '/', @sec_societaria, '/', id, '/')
WHERE audit_project_id = @proj_guayaquilita AND parent_id = @sec_societaria;

-- ── Planificación: secciones ──
INSERT INTO audit_tree_nodes (audit_project_id, parent_id, path, depth, type, name, sort_order, is_system_node, created_at, updated_at) VALUES
  (@proj_guayaquilita, @n_planificacion, '/', 1, 'section', 'Cronograma de Actividades', 1, 0, NOW(), NOW()),
  (@proj_guayaquilita, @n_planificacion, '/', 1, 'section', 'Cuestionario de Control Interno', 2, 0, NOW(), NOW()),
  (@proj_guayaquilita, @n_planificacion, '/', 1, 'section', 'Evaluación de Riesgos', 3, 0, NOW(), NOW());

UPDATE audit_tree_nodes SET path = CONCAT('/', @n_planificacion, '/', id, '/')
WHERE audit_project_id = @proj_guayaquilita AND parent_id = @n_planificacion;

-- ── Programas de Auditoría: por área contable ──
INSERT INTO audit_tree_nodes (audit_project_id, parent_id, path, depth, type, name, sort_order, is_system_node, created_at, updated_at) VALUES
  (@proj_guayaquilita, @n_programas, '/', 1, 'program', 'Bancos y Equivalentes de Efectivo', 1, 0, NOW(), NOW()),
  (@proj_guayaquilita, @n_programas, '/', 1, 'program', 'Cuentas por Cobrar', 2, 0, NOW(), NOW()),
  (@proj_guayaquilita, @n_programas, '/', 1, 'program', 'Inventarios', 3, 0, NOW(), NOW()),
  (@proj_guayaquilita, @n_programas, '/', 1, 'program', 'Propiedad, Planta y Equipo', 4, 0, NOW(), NOW()),
  (@proj_guayaquilita, @n_programas, '/', 1, 'program', 'Cuentas por Pagar', 5, 0, NOW(), NOW()),
  (@proj_guayaquilita, @n_programas, '/', 1, 'program', 'Obligaciones Financieras', 6, 0, NOW(), NOW()),
  (@proj_guayaquilita, @n_programas, '/', 1, 'program', 'Patrimonio', 7, 0, NOW(), NOW()),
  (@proj_guayaquilita, @n_programas, '/', 1, 'program', 'Ingresos', 8, 0, NOW(), NOW()),
  (@proj_guayaquilita, @n_programas, '/', 1, 'program', 'Gastos', 9, 0, NOW(), NOW());

UPDATE audit_tree_nodes SET path = CONCAT('/', @n_programas, '/', id, '/')
WHERE audit_project_id = @proj_guayaquilita AND parent_id = @n_programas;

-- Obtener ID de "Bancos" para crear procedimientos de ejemplo
SET @prog_bancos = (SELECT id FROM audit_tree_nodes WHERE audit_project_id = @proj_guayaquilita AND parent_id = @n_programas AND name LIKE 'Bancos%' LIMIT 1);

-- Procedimientos dentro de "Bancos"
INSERT INTO audit_tree_nodes (audit_project_id, parent_id, path, depth, type, name, sort_order, is_system_node, created_at, updated_at) VALUES
  (@proj_guayaquilita, @prog_bancos, '/', 2, 'procedure', 'Obtener conciliaciones bancarias al cierre', 1, 0, NOW(), NOW()),
  (@proj_guayaquilita, @prog_bancos, '/', 2, 'procedure', 'Confirmar saldos con entidades financieras', 2, 0, NOW(), NOW()),
  (@proj_guayaquilita, @prog_bancos, '/', 2, 'procedure', 'Verificar partidas de conciliación > 30 días', 3, 0, NOW(), NOW()),
  (@proj_guayaquilita, @prog_bancos, '/', 2, 'procedure', 'Revisar transferencias entre cuentas', 4, 0, NOW(), NOW()),
  (@proj_guayaquilita, @prog_bancos, '/', 2, 'procedure', 'Realizar corte de cheques al cierre', 5, 0, NOW(), NOW());

UPDATE audit_tree_nodes SET path = CONCAT('/', @n_programas, '/', @prog_bancos, '/', id, '/')
WHERE audit_project_id = @proj_guayaquilita AND parent_id = @prog_bancos;

-- Obtener ID de "Cuentas por Cobrar" para crear procedimientos
SET @prog_cxc = (SELECT id FROM audit_tree_nodes WHERE audit_project_id = @proj_guayaquilita AND parent_id = @n_programas AND name LIKE 'Cuentas por Cobrar%' LIMIT 1);

INSERT INTO audit_tree_nodes (audit_project_id, parent_id, path, depth, type, name, sort_order, is_system_node, created_at, updated_at) VALUES
  (@proj_guayaquilita, @prog_cxc, '/', 2, 'procedure', 'Obtener detalle de cartera por antigüedad', 1, 0, NOW(), NOW()),
  (@proj_guayaquilita, @prog_cxc, '/', 2, 'procedure', 'Circularizar saldos de clientes principales', 2, 0, NOW(), NOW()),
  (@proj_guayaquilita, @prog_cxc, '/', 2, 'procedure', 'Evaluar provisión por cuentas incobrables', 3, 0, NOW(), NOW());

UPDATE audit_tree_nodes SET path = CONCAT('/', @n_programas, '/', @prog_cxc, '/', id, '/')
WHERE audit_project_id = @proj_guayaquilita AND parent_id = @prog_cxc;

-- ── Hallazgos: carpetas por tipo ──
INSERT INTO audit_tree_nodes (audit_project_id, parent_id, path, depth, type, name, sort_order, is_system_node, created_at, updated_at) VALUES
  (@proj_guayaquilita, @n_hallazgos, '/', 1, 'folder', 'Hallazgos de Control Interno', 1, 0, NOW(), NOW()),
  (@proj_guayaquilita, @n_hallazgos, '/', 1, 'folder', 'Hallazgos de Cumplimiento', 2, 0, NOW(), NOW());

UPDATE audit_tree_nodes SET path = CONCAT('/', @n_hallazgos, '/', id, '/')
WHERE audit_project_id = @proj_guayaquilita AND parent_id = @n_hallazgos;

-- ── Informes: tipos de informe ──
INSERT INTO audit_tree_nodes (audit_project_id, parent_id, path, depth, type, name, sort_order, is_system_node, created_at, updated_at) VALUES
  (@proj_guayaquilita, @n_informes, '/', 1, 'folder', 'Dictamen del Auditor', 1, 0, NOW(), NOW()),
  (@proj_guayaquilita, @n_informes, '/', 1, 'folder', 'Carta a la Gerencia', 2, 0, NOW(), NOW()),
  (@proj_guayaquilita, @n_informes, '/', 1, 'folder', 'Informe de Cumplimiento Tributario', 3, 0, NOW(), NOW());

UPDATE audit_tree_nodes SET path = CONCAT('/', @n_informes, '/', id, '/')
WHERE audit_project_id = @proj_guayaquilita AND parent_id = @n_informes;

-- ============================================================
-- 8. ÁRBOL BÁSICO PARA PROYECTO TECHNOVA (solo raíz)
-- ============================================================
INSERT INTO audit_tree_nodes (audit_project_id, parent_id, path, depth, type, name, sort_order, is_system_node, created_at, updated_at) VALUES
  (@proj_technova, NULL, '/', 0, 'permanent_file', 'Archivo Permanente', 1, 1, NOW(), NOW()),
  (@proj_technova, NULL, '/', 0, 'planning', 'Planificación', 2, 1, NOW(), NOW()),
  (@proj_technova, NULL, '/', 0, 'programs', 'Programas de Auditoría', 3, 1, NOW(), NOW()),
  (@proj_technova, NULL, '/', 0, 'findings', 'Hallazgos', 4, 1, NOW(), NOW()),
  (@proj_technova, NULL, '/', 0, 'reports', 'Informes', 5, 1, NOW(), NOW());

UPDATE audit_tree_nodes SET path = CONCAT('/', id, '/') WHERE audit_project_id = @proj_technova AND parent_id IS NULL;
