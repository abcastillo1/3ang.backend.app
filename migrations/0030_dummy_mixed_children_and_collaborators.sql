-- ============================================================
-- 0030 — Dummy ampliado: hijos mixtos (carpetas + actividades al mismo nivel)
--         + colaboradores del proyecto (project_assignments)
--
-- Objetivo front: ver bajo UN mismo nodo padre conviven:
--   - nodos type folder (subcarpetas con ref_id)
--   - nodos type checklist_item (actividades)
--   - nodos folder sin ref_id (solo árbol)
-- Sin documentos.
--
-- Requiere: 0029 (o al menos proyecto dummy + DUMMY-A + @node_a).
-- Idempotente por códigos únicos.
-- ============================================================

SET @org_id = 1;
SET @user_owner = 1;
SET @user_auditor = (SELECT id FROM users WHERE organization_id = @org_id AND id != @user_owner ORDER BY id LIMIT 1);
SET @user_third = (SELECT id FROM users WHERE organization_id = @org_id AND id NOT IN (@user_owner, IFNULL(@user_auditor,0)) ORDER BY id LIMIT 1);

SET @client_dummy = (SELECT id FROM clients WHERE organization_id = @org_id AND ruc = '1999999999001' LIMIT 1);
SET @proj = (SELECT id FROM audit_projects WHERE organization_id = @org_id AND client_id = @client_dummy
  AND name = 'Proyecto Dummy - Prueba plataforma' LIMIT 1);

-- Si no hay proyecto dummy, no hacemos nada útil
-- (evita errores si 0029 no corrió)
-- ============================================================
-- 1) Colaboradores del proyecto (rendimiento: una sola lista por pantalla)
--    POST .../projects/assignments/list { auditProjectId } → todos los del proyecto
--    No mezclar en tree/full para no inflar cada nodo.
-- ============================================================
INSERT INTO project_assignments (audit_project_id, user_id, role, created_at, updated_at)
SELECT @proj, @user_auditor, 'member', NOW(), NOW() FROM DUAL
WHERE @proj IS NOT NULL AND @user_auditor IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM project_assignments WHERE audit_project_id = @proj AND user_id = @user_auditor);

INSERT INTO project_assignments (audit_project_id, user_id, role, created_at, updated_at)
SELECT @proj, @user_third, 'member', NOW(), NOW() FROM DUAL
WHERE @proj IS NOT NULL AND @user_third IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM project_assignments WHERE audit_project_id = @proj AND user_id = @user_third);

-- ============================================================
-- 2) DUMMY-A: misma sección, hijos mixtos bajo @node_a
--    - Subcarpeta DUMMY-A2 (folder + section) hermana de DUMMY-A1
--    - Ítems con section_id = sec_a → nodos hijos directos de @node_a
--      (mismo nivel que las carpetas A1 y A2: hermanos entre sí)
-- ============================================================
SET @sec_a = (SELECT id FROM engagement_file_sections WHERE audit_project_id = @proj AND code = 'DUMMY-A' LIMIT 1);
SET @node_a = (SELECT tree_node_id FROM engagement_file_sections WHERE id = @sec_a LIMIT 1);
SET @n_eng = (SELECT parent_id FROM audit_tree_nodes WHERE id = @node_a LIMIT 1);

-- Subsección DUMMY-A2 bajo DUMMY-A (solo si existe A)
INSERT INTO engagement_file_sections (audit_project_id, parent_section_id, code, name, sort_order, created_at, updated_at)
SELECT @proj, @sec_a, 'DUMMY-A2', 'Subcarpeta — Mezcla con ítems hermanos', 1, NOW(), NOW()
FROM DUAL WHERE @sec_a IS NOT NULL AND NOT EXISTS (
  SELECT 1 FROM engagement_file_sections WHERE audit_project_id = @proj AND code = 'DUMMY-A2'
);

SET @sec_a2 = (SELECT id FROM engagement_file_sections WHERE audit_project_id = @proj AND code = 'DUMMY-A2' LIMIT 1);

INSERT INTO audit_tree_nodes (audit_project_id, parent_id, path, depth, type, name, sort_order, ref_id, is_system_node, created_at, updated_at)
SELECT @proj, @node_a, '/', 2, 'folder', 'DUMMY-A2 — Mezcla', 2, @sec_a2, 0, NOW(), NOW()
FROM DUAL WHERE @sec_a2 IS NOT NULL AND @node_a IS NOT NULL AND NOT EXISTS (
  SELECT 1 FROM audit_tree_nodes WHERE audit_project_id = @proj AND ref_id = @sec_a2 AND type = 'folder'
);

SET @node_a2 = (SELECT id FROM audit_tree_nodes WHERE audit_project_id = @proj AND ref_id = @sec_a2 AND type = 'folder' LIMIT 1);
UPDATE audit_tree_nodes SET path = CONCAT('/', @n_eng, '/', @node_a, '/', id, '/')
WHERE id = @node_a2 AND path = '/';
UPDATE engagement_file_sections SET tree_node_id = @node_a2 WHERE id = @sec_a2 AND tree_node_id IS NULL;

-- Ítem dentro de A2 (para tener algo bajo la subcarpeta nueva)
INSERT INTO checklist_items (section_id, created_by_user_id, code, description, is_required, status, sort_order, created_at, updated_at)
SELECT @sec_a2, @user_owner, 'A2.1', 'Tarea solo bajo subcarpeta A2', 0, 'pending', 0, NOW(), NOW()
FROM DUAL WHERE @sec_a2 IS NOT NULL AND NOT EXISTS (SELECT 1 FROM checklist_items WHERE section_id = @sec_a2 AND code = 'A2.1');

SET @it = (SELECT id FROM checklist_items WHERE section_id = @sec_a2 AND code = 'A2.1' LIMIT 1);
INSERT INTO audit_tree_nodes (audit_project_id, parent_id, path, depth, type, name, sort_order, ref_id, is_system_node, created_at, updated_at)
SELECT @proj, @node_a2, '/', 3, 'checklist_item', 'A2.1 — Tarea A2', 1, @it, 0, NOW(), NOW()
FROM DUAL WHERE @it IS NOT NULL AND NOT EXISTS (
  SELECT 1 FROM audit_tree_nodes WHERE audit_project_id = @proj AND ref_id = @it AND type = 'checklist_item'
);
SET @nid = (SELECT id FROM audit_tree_nodes WHERE audit_project_id = @proj AND ref_id = @it AND type = 'checklist_item' LIMIT 1);
UPDATE audit_tree_nodes SET path = CONCAT('/', @n_eng, '/', @node_a, '/', @node_a2, '/', id, '/') WHERE id = @nid AND path = '/';
UPDATE checklist_items SET tree_node_id = @nid WHERE id = @it AND tree_node_id IS NULL;

-- Ítems con section_id = DUMMY-A (sec_a) → padre en árbol = @node_a
-- Así bajo DUMMY-A conviven: carpeta A1, carpeta A2, ítem A.1, ítem A.2 (hermanos)
INSERT INTO checklist_items (section_id, created_by_user_id, code, description, is_required, status, sort_order, created_at, updated_at)
SELECT @sec_a, @user_owner, 'A.1', 'Actividad directa bajo DUMMY-A (hermana de subcarpetas)', 1, 'pending', 10, NOW(), NOW()
FROM DUAL WHERE @sec_a IS NOT NULL AND NOT EXISTS (SELECT 1 FROM checklist_items WHERE section_id = @sec_a AND code = 'A.1');

SET @it = (SELECT id FROM checklist_items WHERE section_id = @sec_a AND code = 'A.1' LIMIT 1);
INSERT INTO audit_tree_nodes (audit_project_id, parent_id, path, depth, type, name, sort_order, ref_id, is_system_node, created_at, updated_at)
SELECT @proj, @node_a, '/', 2, 'checklist_item', 'A.1 — Directa en A', 10, @it, 0, NOW(), NOW()
FROM DUAL WHERE @it IS NOT NULL AND @node_a IS NOT NULL AND NOT EXISTS (
  SELECT 1 FROM audit_tree_nodes WHERE audit_project_id = @proj AND ref_id = @it AND type = 'checklist_item'
);
SET @nid = (SELECT id FROM audit_tree_nodes WHERE audit_project_id = @proj AND ref_id = @it AND type = 'checklist_item' LIMIT 1);
UPDATE audit_tree_nodes SET path = CONCAT('/', @n_eng, '/', @node_a, '/', id, '/') WHERE id = @nid AND path = '/';
UPDATE checklist_items SET tree_node_id = @nid WHERE id = @it AND tree_node_id IS NULL;

INSERT INTO checklist_items (section_id, created_by_user_id, code, description, is_required, status, sort_order, created_at, updated_at)
SELECT @sec_a, @user_owner, 'A.2', 'Segunda actividad hermana (varios asignados)', 1, 'in_review', 11, NOW(), NOW()
FROM DUAL WHERE @sec_a IS NOT NULL AND NOT EXISTS (SELECT 1 FROM checklist_items WHERE section_id = @sec_a AND code = 'A.2');

SET @it = (SELECT id FROM checklist_items WHERE section_id = @sec_a AND code = 'A.2' LIMIT 1);
INSERT INTO audit_tree_nodes (audit_project_id, parent_id, path, depth, type, name, sort_order, ref_id, is_system_node, created_at, updated_at)
SELECT @proj, @node_a, '/', 2, 'checklist_item', 'A.2 — Varios asignados', 11, @it, 0, NOW(), NOW()
FROM DUAL WHERE @it IS NOT NULL AND @node_a IS NOT NULL AND NOT EXISTS (
  SELECT 1 FROM audit_tree_nodes WHERE audit_project_id = @proj AND ref_id = @it AND type = 'checklist_item'
);
SET @nid = (SELECT id FROM audit_tree_nodes WHERE audit_project_id = @proj AND ref_id = @it AND type = 'checklist_item' LIMIT 1);
UPDATE audit_tree_nodes SET path = CONCAT('/', @n_eng, '/', @node_a, '/', id, '/') WHERE id = @nid AND path = '/';
UPDATE checklist_items SET tree_node_id = @nid WHERE id = @it AND tree_node_id IS NULL;

-- Asignados en A.2 (múltiples filas checklist_item_assignees)
INSERT INTO checklist_item_assignees (checklist_item_id, user_id, assigned_by_user_id, created_at)
SELECT @it, @user_owner, @user_owner, NOW() FROM DUAL
WHERE @it IS NOT NULL AND NOT EXISTS (SELECT 1 FROM checklist_item_assignees WHERE checklist_item_id = @it AND user_id = @user_owner);
INSERT INTO checklist_item_assignees (checklist_item_id, user_id, assigned_by_user_id, created_at)
SELECT @it, @user_auditor, @user_owner, NOW() FROM DUAL
WHERE @it IS NOT NULL AND @user_auditor IS NOT NULL AND NOT EXISTS (
  SELECT 1 FROM checklist_item_assignees WHERE checklist_item_id = @it AND user_id = @user_auditor);
INSERT INTO checklist_item_assignees (checklist_item_id, user_id, assigned_by_user_id, created_at)
SELECT @it, @user_third, @user_owner, NOW() FROM DUAL
WHERE @it IS NOT NULL AND @user_third IS NOT NULL AND NOT EXISTS (
  SELECT 1 FROM checklist_item_assignees WHERE checklist_item_id = @it AND user_id = @user_third);

-- ============================================================
-- 3) Bajo Programas: dos carpetas genéricas hermanas (sin ref_id)
--    Orden por sort_order — front debe ordenar hijos por order
-- ============================================================
SET @n_prog = (SELECT id FROM audit_tree_nodes WHERE audit_project_id = @proj AND type = 'programs' AND parent_id IS NULL LIMIT 1);

INSERT INTO audit_tree_nodes (audit_project_id, parent_id, path, depth, type, name, sort_order, is_system_node, created_at, updated_at)
SELECT @proj, @n_prog, '/', 1, 'folder', '102 — CxC (genérico)', 2, 0, NOW(), NOW()
FROM DUAL WHERE @n_prog IS NOT NULL AND NOT EXISTS (
  SELECT 1 FROM audit_tree_nodes WHERE audit_project_id = @proj AND parent_id = @n_prog AND name = '102 — CxC (genérico)'
);
UPDATE audit_tree_nodes n
JOIN (SELECT id FROM audit_tree_nodes WHERE audit_project_id = @proj AND parent_id = @n_prog AND name = '102 — CxC (genérico)' LIMIT 1) t ON n.id = t.id
SET n.path = CONCAT('/', @n_prog, '/', n.id, '/') WHERE n.path = '/';

INSERT INTO audit_tree_nodes (audit_project_id, parent_id, path, depth, type, name, sort_order, is_system_node, created_at, updated_at)
SELECT @proj, @n_prog, '/', 1, 'folder', '103 — Inventarios (genérico)', 3, 0, NOW(), NOW()
FROM DUAL WHERE @n_prog IS NOT NULL AND NOT EXISTS (
  SELECT 1 FROM audit_tree_nodes WHERE audit_project_id = @proj AND parent_id = @n_prog AND name = '103 — Inventarios (genérico)'
);
UPDATE audit_tree_nodes n
JOIN (SELECT id FROM audit_tree_nodes WHERE audit_project_id = @proj AND parent_id = @n_prog AND name = '103 — Inventarios (genérico)' LIMIT 1) t ON n.id = t.id
SET n.path = CONCAT('/', @n_prog, '/', n.id, '/') WHERE n.path = '/';

-- ============================================================
-- Acceso recomendado (rendimiento)
-- - Árbol: tree/full una vez; no incluye assignees ni usuarios.
-- - Colaboradores proyecto: assignments/list una vez al abrir proyecto.
-- - Asignados por ítem: node-detail o items/list cuando expandes/edita ítem.
-- ============================================================
