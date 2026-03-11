-- ============================================================
-- SEED: Proyecto dummy para testear plataforma (árbol + permanent-file + asignados)
-- Requiere: 0015 (usuarios/clientes base), 0023 (tree_node_id), 0025 (assignees + created_by)
-- Opcional 0024 (description en sections) — si no existe, quitar description del INSERT section
-- ============================================================

SET @org_id = 1;
SET @user_owner = 1;

-- Segundo usuario para asignación cruzada (si existe)
SET @user_auditor = (SELECT id FROM users WHERE organization_id = @org_id AND id != @user_owner ORDER BY id LIMIT 1);

-- ============================================================
-- 1. Cliente dummy (RUC único)
-- ============================================================
INSERT INTO clients (organization_id, name, legal_name, ruc, email, is_active, created_at, updated_at)
SELECT @org_id, 'Empresa Dummy S.A.', 'Empresa Dummy S.A.', '1999999999001', 'dummy@test.local', 1, NOW(), NOW()
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM clients WHERE organization_id = @org_id AND ruc = '1999999999001');

SET @client_dummy = (SELECT id FROM clients WHERE organization_id = @org_id AND ruc = '1999999999001' LIMIT 1);

-- ============================================================
-- 2. Proyecto dummy (solo si no existe ya)
-- ============================================================
INSERT INTO audit_projects (organization_id, client_id, name, audit_type, period_start, period_end, status, created_at, updated_at)
SELECT @org_id, @client_dummy, 'Proyecto Dummy - Prueba plataforma', 'financial', '2025-01-01', '2025-12-31', 'in_progress', NOW(), NOW()
FROM DUAL
WHERE NOT EXISTS (
  SELECT 1 FROM audit_projects WHERE organization_id = @org_id AND client_id = @client_dummy
    AND name = 'Proyecto Dummy - Prueba plataforma'
);

SET @proj_dummy = (
  SELECT id FROM audit_projects
  WHERE organization_id = @org_id AND client_id = @client_dummy
    AND name = 'Proyecto Dummy - Prueba plataforma' LIMIT 1
);

-- Asignación mínima al proyecto (owner como member si no está)
INSERT INTO project_assignments (audit_project_id, user_id, role, created_at, updated_at)
SELECT @proj_dummy, @user_owner, 'manager', NOW(), NOW()
FROM DUAL
WHERE NOT EXISTS (
  SELECT 1 FROM project_assignments WHERE audit_project_id = @proj_dummy AND user_id = @user_owner
);

-- ============================================================
-- 3. Árbol: 5 raíces de una vez si el proyecto aún no tiene nodos
-- (La 1ª fila del UNION debe llevar alias en cada columna; si no, MySQL
--  nombra los literales 1 como columna '1' y choca con #1060.)
-- ============================================================
INSERT INTO audit_tree_nodes (audit_project_id, parent_id, path, depth, type, name, sort_order, is_system_node, created_at, updated_at)
SELECT audit_project_id, parent_id, path, depth, type, name, sort_order, is_system_node, created_at, updated_at
FROM (
  SELECT @proj_dummy AS audit_project_id, NULL AS parent_id, '/' AS path, 0 AS depth,
         'permanent_file' AS type, 'Archivo Permanente' AS name, 1 AS sort_order, 1 AS is_system_node,
         NOW() AS created_at, NOW() AS updated_at
  UNION ALL SELECT @proj_dummy, NULL, '/', 0, 'planning', 'Planificación', 2, 1, NOW(), NOW()
  UNION ALL SELECT @proj_dummy, NULL, '/', 0, 'programs', 'Programas de Auditoría', 3, 1, NOW(), NOW()
  UNION ALL SELECT @proj_dummy, NULL, '/', 0, 'findings', 'Hallazgos', 4, 1, NOW(), NOW()
  UNION ALL SELECT @proj_dummy, NULL, '/', 0, 'reports', 'Informes', 5, 1, NOW(), NOW()
) AS roots
WHERE (SELECT COUNT(*) FROM audit_tree_nodes WHERE audit_project_id = @proj_dummy) = 0;

UPDATE audit_tree_nodes SET path = CONCAT('/', id, '/')
WHERE audit_project_id = @proj_dummy AND parent_id IS NULL;

SET @n_perm = (SELECT id FROM audit_tree_nodes WHERE audit_project_id = @proj_dummy AND type = 'permanent_file' AND parent_id IS NULL LIMIT 1);

-- ============================================================
-- 4. Sección permanente + nodo folder (ref_id) — solo si no hay sección DUMMY-A
-- ============================================================
SET @sec_exists = (SELECT COUNT(*) FROM permanent_file_sections WHERE audit_project_id = @proj_dummy AND code = 'DUMMY-A');

-- Sección sin tree_node_id primero (description omitido si columna no existe en tu BD — si falla, quitar línea description)
INSERT INTO permanent_file_sections (audit_project_id, parent_section_id, code, name, sort_order, created_at, updated_at)
SELECT @proj_dummy, NULL, 'DUMMY-A', 'Sección prueba (dummy)', 0, NOW(), NOW()
FROM DUAL WHERE @sec_exists = 0;

SET @sec_id = (SELECT id FROM permanent_file_sections WHERE audit_project_id = @proj_dummy AND code = 'DUMMY-A' LIMIT 1);

-- Nodo carpeta bajo Archivo Permanente
INSERT INTO audit_tree_nodes (audit_project_id, parent_id, path, depth, type, name, sort_order, ref_id, is_system_node, created_at, updated_at)
SELECT @proj_dummy, @n_perm, '/', 1, 'folder', 'DUMMY-A — Sección prueba (dummy)', 1, @sec_id, 0, NOW(), NOW()
FROM DUAL WHERE @sec_id IS NOT NULL AND NOT EXISTS (
  SELECT 1 FROM audit_tree_nodes WHERE audit_project_id = @proj_dummy AND ref_id = @sec_id AND type = 'folder'
);

SET @node_sec = (SELECT id FROM audit_tree_nodes WHERE audit_project_id = @proj_dummy AND ref_id = @sec_id AND type = 'folder' LIMIT 1);

UPDATE audit_tree_nodes SET path = CONCAT('/', @n_perm, '/', id, '/')
WHERE id = @node_sec AND path = '/';

UPDATE permanent_file_sections SET tree_node_id = @node_sec WHERE id = @sec_id AND tree_node_id IS NULL;

-- ============================================================
-- 5. Ítems checklist + nodos checklist_item + assignees
-- ============================================================
-- Ítem 1
INSERT INTO checklist_items (section_id, created_by_user_id, code, description, is_required, status, sort_order, created_at, updated_at)
SELECT @sec_id, @user_owner, 'DUMMY-A1', 'Ítem de prueba 1 — subir documento aquí', 1, 'pending', 0, NOW(), NOW()
FROM DUAL WHERE @sec_id IS NOT NULL AND NOT EXISTS (
  SELECT 1 FROM checklist_items WHERE section_id = @sec_id AND code = 'DUMMY-A1'
);

SET @item1 = (SELECT id FROM checklist_items WHERE section_id = @sec_id AND code = 'DUMMY-A1' LIMIT 1);

INSERT INTO audit_tree_nodes (audit_project_id, parent_id, path, depth, type, name, sort_order, ref_id, is_system_node, created_at, updated_at)
SELECT @proj_dummy, @node_sec, '/', 2, 'checklist_item', 'DUMMY-A1 — Ítem de prueba 1', 1, @item1, 0, NOW(), NOW()
FROM DUAL WHERE @item1 IS NOT NULL AND NOT EXISTS (
  SELECT 1 FROM audit_tree_nodes WHERE audit_project_id = @proj_dummy AND ref_id = @item1 AND type = 'checklist_item'
);

SET @node_item1 = (SELECT id FROM audit_tree_nodes WHERE audit_project_id = @proj_dummy AND ref_id = @item1 AND type = 'checklist_item' LIMIT 1);

UPDATE audit_tree_nodes SET path = CONCAT('/', @n_perm, '/', @node_sec, '/', id, '/')
WHERE id = @node_item1 AND path = '/';

UPDATE checklist_items SET tree_node_id = @node_item1 WHERE id = @item1 AND tree_node_id IS NULL;

-- Asignados al ítem 1 (owner + auditor si existe)
INSERT INTO checklist_item_assignees (checklist_item_id, user_id, assigned_by_user_id, created_at)
SELECT @item1, @user_owner, @user_owner, NOW() FROM DUAL
WHERE @item1 IS NOT NULL AND NOT EXISTS (SELECT 1 FROM checklist_item_assignees WHERE checklist_item_id = @item1 AND user_id = @user_owner);

INSERT INTO checklist_item_assignees (checklist_item_id, user_id, assigned_by_user_id, created_at)
SELECT @item1, @user_auditor, @user_owner, NOW() FROM DUAL
WHERE @item1 IS NOT NULL AND @user_auditor IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM checklist_item_assignees WHERE checklist_item_id = @item1 AND user_id = @user_auditor);

UPDATE checklist_items SET assigned_user_id = @user_owner WHERE id = @item1;

-- Ítem 2 (sin asignados, estado in_review)
INSERT INTO checklist_items (section_id, created_by_user_id, code, description, is_required, status, sort_order, created_at, updated_at)
SELECT @sec_id, @user_owner, 'DUMMY-A2', 'Ítem de prueba 2 — marcar compliant cuando subas evidencia', 0, 'in_review', 1, NOW(), NOW()
FROM DUAL WHERE @sec_id IS NOT NULL AND NOT EXISTS (
  SELECT 1 FROM checklist_items WHERE section_id = @sec_id AND code = 'DUMMY-A2'
);

SET @item2 = (SELECT id FROM checklist_items WHERE section_id = @sec_id AND code = 'DUMMY-A2' LIMIT 1);

INSERT INTO audit_tree_nodes (audit_project_id, parent_id, path, depth, type, name, sort_order, ref_id, is_system_node, created_at, updated_at)
SELECT @proj_dummy, @node_sec, '/', 2, 'checklist_item', 'DUMMY-A2 — Ítem de prueba 2', 2, @item2, 0, NOW(), NOW()
FROM DUAL WHERE @item2 IS NOT NULL AND NOT EXISTS (
  SELECT 1 FROM audit_tree_nodes WHERE audit_project_id = @proj_dummy AND ref_id = @item2 AND type = 'checklist_item'
);

SET @node_item2 = (SELECT id FROM audit_tree_nodes WHERE audit_project_id = @proj_dummy AND ref_id = @item2 AND type = 'checklist_item' LIMIT 1);

UPDATE audit_tree_nodes SET path = CONCAT('/', @n_perm, '/', @node_sec, '/', id, '/')
WHERE id = @node_item2 AND path = '/';

UPDATE checklist_items SET tree_node_id = @node_item2 WHERE id = @item2 AND tree_node_id IS NULL;

-- ============================================================
-- 6. Carpeta bajo Programas (sin permanent-file) para probar tree/create manual
-- ============================================================
SET @n_prog = (SELECT id FROM audit_tree_nodes WHERE audit_project_id = @proj_dummy AND type = 'programs' AND parent_id IS NULL LIMIT 1);

INSERT INTO audit_tree_nodes (audit_project_id, parent_id, path, depth, type, name, sort_order, is_system_node, created_at, updated_at)
SELECT @proj_dummy, @n_prog, '/', 1, 'folder', 'Dummy — Carpeta programas', 99, 0, NOW(), NOW()
FROM DUAL WHERE @n_prog IS NOT NULL AND NOT EXISTS (
  SELECT 1 FROM audit_tree_nodes WHERE audit_project_id = @proj_dummy AND parent_id = @n_prog AND name = 'Dummy — Carpeta programas'
);

UPDATE audit_tree_nodes n
JOIN (SELECT id FROM audit_tree_nodes WHERE audit_project_id = @proj_dummy AND parent_id = @n_prog AND name = 'Dummy — Carpeta programas' LIMIT 1) t ON n.id = t.id
SET n.path = CONCAT('/', @n_prog, '/', n.id, '/')
WHERE n.path = '/';

-- ============================================================
-- Listo. Probar con:
--   POST projects/list → buscar "Proyecto Dummy"
--   POST projects/tree/full data.auditProjectId = <id del proyecto>
--   POST projects/tree/node-detail data.nodeId = <id nodo ítem DUMMY-A1>
-- ============================================================
