-- ============================================================
-- 0031 — Ampliación dummy sobre árbol existente (audit_project_id = 1)
--
-- Asume el árbol que devolvió tree/full:
--   id 1  engagement_file (raíz)
--   id 3  programs
--   id 8  folder DUMMY-A (hijo de 1)
--   id 9  folder DUMMY-A1 (hijo de 8)
--   id 10,11,12 checklist_item bajo 9
--   id 13 DUMMY-B, id 14 B.1, id 15 bajo 3
--   id 16,17 bajo 10 (carpetas bajo ítem — ya existen)
--
-- Añade bajo nodo 8 (DUMMY-A):
--   - Subcarpeta DUMMY-A2 (folder + section) hermana de 9
--   - Ítems A.1, A.2 con nodos hijos directos de 8 (mezcla folder + checklist_item)
-- Bajo nodo 3: carpetas 102 y 103 si no existen
-- project_assignments para proyecto 1
--
-- Sin documentos. Idempotente por códigos / nombres.
-- ============================================================

SET @proj = 1;
SET @org_id = (SELECT organization_id FROM audit_projects WHERE id = @proj LIMIT 1);
SET @user_owner = 1;
SET @user_auditor = (SELECT id FROM users WHERE organization_id = @org_id AND id != @user_owner ORDER BY id LIMIT 1);
SET @user_third = (SELECT id FROM users WHERE organization_id = @org_id AND id NOT IN (@user_owner, IFNULL(@user_auditor,0)) ORDER BY id LIMIT 1);

-- Nodos fijos de tu árbol
SET @n_eng = 1;
SET @node_a = 8;
SET @node_a1 = 9;
SET @n_prog = 3;

-- Solo si el proyecto 1 existe y el nodo 8 es folder bajo 1
-- ============================================================
-- 1) Colaboradores proyecto 1
-- ============================================================
INSERT INTO project_assignments (audit_project_id, user_id, role, created_at, updated_at)
SELECT @proj, @user_auditor, 'member', NOW(), NOW() FROM DUAL
WHERE @user_auditor IS NOT NULL
  AND EXISTS (SELECT 1 FROM audit_projects WHERE id = @proj)
  AND NOT EXISTS (SELECT 1 FROM project_assignments WHERE audit_project_id = @proj AND user_id = @user_auditor);

INSERT INTO project_assignments (audit_project_id, user_id, role, created_at, updated_at)
SELECT @proj, @user_third, 'member', NOW(), NOW() FROM DUAL
WHERE @user_third IS NOT NULL
  AND EXISTS (SELECT 1 FROM audit_projects WHERE id = @proj)
  AND NOT EXISTS (SELECT 1 FROM project_assignments WHERE audit_project_id = @proj AND user_id = @user_third);

-- ============================================================
-- 2) Sección DUMMY-A = ref_id del nodo 8 (o por código)
-- ============================================================
SET @sec_a = (SELECT ref_id FROM audit_tree_nodes WHERE id = @node_a AND type = 'folder' LIMIT 1);
SET @sec_a = IFNULL(@sec_a, (SELECT id FROM engagement_file_sections WHERE tree_node_id = @node_a LIMIT 1));
SET @sec_a = IFNULL(@sec_a, (SELECT id FROM engagement_file_sections WHERE audit_project_id = @proj AND code = 'DUMMY-A' LIMIT 1));

-- ============================================================
-- 3) DUMMY-A2 — subcarpeta hermana de nodo 9 (mismo parent 8)
-- ============================================================
INSERT INTO engagement_file_sections (audit_project_id, parent_section_id, code, name, sort_order, created_at, updated_at)
SELECT @proj, @sec_a, 'DUMMY-A2', 'Subcarpeta A2 — hermana de A1', 2, NOW(), NOW()
FROM DUAL
WHERE @sec_a IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM engagement_file_sections WHERE audit_project_id = @proj AND code = 'DUMMY-A2');

SET @sec_a2 = (SELECT id FROM engagement_file_sections WHERE audit_project_id = @proj AND code = 'DUMMY-A2' LIMIT 1);

INSERT INTO audit_tree_nodes (audit_project_id, parent_id, path, depth, type, name, sort_order, ref_id, is_system_node, created_at, updated_at)
SELECT @proj, @node_a, '/', 2, 'folder', 'DUMMY-A2 — hermana A1', 2, @sec_a2, 0, NOW(), NOW()
FROM DUAL
WHERE @sec_a2 IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM audit_tree_nodes WHERE audit_project_id = @proj AND ref_id = @sec_a2 AND type = 'folder');

SET @node_a2 = (SELECT id FROM audit_tree_nodes WHERE audit_project_id = @proj AND ref_id = @sec_a2 AND type = 'folder' LIMIT 1);

UPDATE audit_tree_nodes SET path = CONCAT('/', @n_eng, '/', @node_a, '/', id, '/')
WHERE id = @node_a2 AND (path = '/' OR path NOT LIKE CONCAT('%/', @node_a, '/', id, '/%'));

UPDATE engagement_file_sections SET tree_node_id = @node_a2 WHERE id = @sec_a2;

-- Ítem A2.1 bajo A2
INSERT INTO checklist_items (section_id, created_by_user_id, code, description, is_required, status, sort_order, created_at, updated_at)
SELECT @sec_a2, @user_owner, 'A2.1', 'Tarea bajo A2', 0, 'pending', 0, NOW(), NOW()
FROM DUAL WHERE @sec_a2 IS NOT NULL AND NOT EXISTS (SELECT 1 FROM checklist_items WHERE section_id = @sec_a2 AND code = 'A2.1');

SET @it = (SELECT id FROM checklist_items WHERE section_id = @sec_a2 AND code = 'A2.1' LIMIT 1);
INSERT INTO audit_tree_nodes (audit_project_id, parent_id, path, depth, type, name, sort_order, ref_id, is_system_node, created_at, updated_at)
SELECT @proj, @node_a2, '/', 3, 'checklist_item', 'A2.1', 1, @it, 0, NOW(), NOW()
FROM DUAL WHERE @it IS NOT NULL AND @node_a2 IS NOT NULL AND NOT EXISTS (
  SELECT 1 FROM audit_tree_nodes WHERE audit_project_id = @proj AND ref_id = @it AND type = 'checklist_item');
SET @nid = (SELECT id FROM audit_tree_nodes WHERE audit_project_id = @proj AND ref_id = @it AND type = 'checklist_item' LIMIT 1);
UPDATE audit_tree_nodes SET path = CONCAT('/', @n_eng, '/', @node_a, '/', @node_a2, '/', id, '/') WHERE id = @nid;
UPDATE checklist_items SET tree_node_id = @nid WHERE id = @it;

-- ============================================================
-- 4) Ítems con section_id = DUMMY-A — nodos con parent_id = 8
--    (hermanos de nodo 9 y del nuevo A2)
-- ============================================================
INSERT INTO checklist_items (section_id, created_by_user_id, code, description, is_required, status, sort_order, created_at, updated_at)
SELECT @sec_a, @user_owner, 'A.1', 'Actividad directa en DUMMY-A (parent nodo 8)', 1, 'pending', 20, NOW(), NOW()
FROM DUAL WHERE @sec_a IS NOT NULL AND NOT EXISTS (SELECT 1 FROM checklist_items WHERE section_id = @sec_a AND code = 'A.1');

SET @it = (SELECT id FROM checklist_items WHERE section_id = @sec_a AND code = 'A.1' LIMIT 1);
INSERT INTO audit_tree_nodes (audit_project_id, parent_id, path, depth, type, name, sort_order, ref_id, is_system_node, created_at, updated_at)
SELECT @proj, @node_a, '/', 2, 'checklist_item', 'A.1 — en A', 20, @it, 0, NOW(), NOW()
FROM DUAL WHERE @it IS NOT NULL AND NOT EXISTS (
  SELECT 1 FROM audit_tree_nodes WHERE audit_project_id = @proj AND ref_id = @it AND type = 'checklist_item');
SET @nid = (SELECT id FROM audit_tree_nodes WHERE audit_project_id = @proj AND ref_id = @it AND type = 'checklist_item' LIMIT 1);
UPDATE audit_tree_nodes SET path = CONCAT('/', @n_eng, '/', @node_a, '/', id, '/') WHERE id = @nid;
UPDATE checklist_items SET tree_node_id = @nid WHERE id = @it;

INSERT INTO checklist_items (section_id, created_by_user_id, code, description, is_required, status, sort_order, created_at, updated_at)
SELECT @sec_a, @user_owner, 'A.2', 'Varios asignados (parent nodo 8)', 1, 'in_review', 21, NOW(), NOW()
FROM DUAL WHERE @sec_a IS NOT NULL AND NOT EXISTS (SELECT 1 FROM checklist_items WHERE section_id = @sec_a AND code = 'A.2');

SET @it = (SELECT id FROM checklist_items WHERE section_id = @sec_a AND code = 'A.2' LIMIT 1);
INSERT INTO audit_tree_nodes (audit_project_id, parent_id, path, depth, type, name, sort_order, ref_id, is_system_node, created_at, updated_at)
SELECT @proj, @node_a, '/', 2, 'checklist_item', 'A.2 — varios asignados', 21, @it, 0, NOW(), NOW()
FROM DUAL WHERE @it IS NOT NULL AND NOT EXISTS (
  SELECT 1 FROM audit_tree_nodes WHERE audit_project_id = @proj AND ref_id = @it AND type = 'checklist_item');
SET @nid = (SELECT id FROM audit_tree_nodes WHERE audit_project_id = @proj AND ref_id = @it AND type = 'checklist_item' LIMIT 1);
UPDATE audit_tree_nodes SET path = CONCAT('/', @n_eng, '/', @node_a, '/', id, '/') WHERE id = @nid;
UPDATE checklist_items SET tree_node_id = @nid WHERE id = @it;

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
-- 5) Programas (nodo 3): 102 y 103 hermanos de 15
-- ============================================================
INSERT INTO audit_tree_nodes (audit_project_id, parent_id, path, depth, type, name, sort_order, is_system_node, created_at, updated_at)
SELECT @proj, @n_prog, '/', 1, 'folder', '102 — CxC', 2, 0, NOW(), NOW()
FROM DUAL WHERE NOT EXISTS (
  SELECT 1 FROM audit_tree_nodes WHERE audit_project_id = @proj AND parent_id = @n_prog AND name = '102 — CxC');
UPDATE audit_tree_nodes n
JOIN (SELECT id FROM audit_tree_nodes WHERE audit_project_id = @proj AND parent_id = @n_prog AND name = '102 — CxC' LIMIT 1) t ON n.id = t.id
SET n.path = CONCAT('/', @n_prog, '/', n.id, '/') WHERE n.path = '/';

INSERT INTO audit_tree_nodes (audit_project_id, parent_id, path, depth, type, name, sort_order, is_system_node, created_at, updated_at)
SELECT @proj, @n_prog, '/', 1, 'folder', '103 — Inventarios', 3, 0, NOW(), NOW()
FROM DUAL WHERE NOT EXISTS (
  SELECT 1 FROM audit_tree_nodes WHERE audit_project_id = @proj AND parent_id = @n_prog AND name = '103 — Inventarios');
UPDATE audit_tree_nodes n
JOIN (SELECT id FROM audit_tree_nodes WHERE audit_project_id = @proj AND parent_id = @n_prog AND name = '103 — Inventarios' LIMIT 1) t ON n.id = t.id
SET n.path = CONCAT('/', @n_prog, '/', n.id, '/') WHERE n.path = '/';

-- ============================================================
-- Tras ejecutar: POST projects/tree/full auditProjectId 1
-- Bajo nodo 8 deberías ver: 9 (A1), nuevo A2, A.1, A.2 (orden por sort_order)
-- ============================================================
