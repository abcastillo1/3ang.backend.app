-- ============================================================
-- SEED COMPLETO: Proyecto dummy para el front (árbol + engagement_file + ítems + asignados)
-- SIN documentos (omitidos a propósito).
--
-- Requiere: 0028 ya aplicada (tablas engagement_file_* y nodos type = engagement_file)
--          0023, 0025. Opcional 0024 (description en sections).
-- Si tu BD aún tiene permanent_file_* sin 0028, usa 0026 en su lugar.
-- ============================================================

SET @org_id = 1;
SET @user_owner = 1;
SET @user_auditor = (SELECT id FROM users WHERE organization_id = @org_id AND id != @user_owner ORDER BY id LIMIT 1);

-- Cliente + proyecto (mismo criterio que 0026)
INSERT INTO clients (organization_id, name, legal_name, ruc, email, is_active, created_at, updated_at)
SELECT @org_id, 'Empresa Dummy S.A.', 'Empresa Dummy S.A.', '1999999999001', 'dummy@test.local', 1, NOW(), NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM clients WHERE organization_id = @org_id AND ruc = '1999999999001');

SET @client_dummy = (SELECT id FROM clients WHERE organization_id = @org_id AND ruc = '1999999999001' LIMIT 1);

INSERT INTO audit_projects (organization_id, client_id, name, audit_type, period_start, period_end, status, created_at, updated_at)
SELECT @org_id, @client_dummy, 'Proyecto Dummy - Prueba plataforma', 'financial', '2025-01-01', '2025-12-31', 'in_progress', NOW(), NOW()
FROM DUAL WHERE NOT EXISTS (
  SELECT 1 FROM audit_projects WHERE organization_id = @org_id AND client_id = @client_dummy
    AND name = 'Proyecto Dummy - Prueba plataforma'
);

SET @proj = (SELECT id FROM audit_projects WHERE organization_id = @org_id AND client_id = @client_dummy
  AND name = 'Proyecto Dummy - Prueba plataforma' LIMIT 1);

INSERT INTO project_assignments (audit_project_id, user_id, role, created_at, updated_at)
SELECT @proj, @user_owner, 'manager', NOW(), NOW() FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM project_assignments WHERE audit_project_id = @proj AND user_id = @user_owner);

-- Árbol: 5 raíces con type engagement_file en la primera (post-0028)
INSERT INTO audit_tree_nodes (audit_project_id, parent_id, path, depth, type, name, sort_order, is_system_node, created_at, updated_at)
SELECT audit_project_id, parent_id, path, depth, type, name, sort_order, is_system_node, created_at, updated_at
FROM (
  SELECT @proj AS audit_project_id, NULL AS parent_id, '/' AS path, 0 AS depth,
         'engagement_file' AS type, 'Archivo Permanente' AS name, 1 AS sort_order, 1 AS is_system_node, NOW() AS created_at, NOW() AS updated_at
  UNION ALL SELECT @proj, NULL, '/', 0, 'planning', 'Planificación', 2, 1, NOW(), NOW()
  UNION ALL SELECT @proj, NULL, '/', 0, 'programs', 'Programas de Auditoría', 3, 1, NOW(), NOW()
  UNION ALL SELECT @proj, NULL, '/', 0, 'findings', 'Hallazgos', 4, 1, NOW(), NOW()
  UNION ALL SELECT @proj, NULL, '/', 0, 'reports', 'Informes', 5, 1, NOW(), NOW()
) AS roots
WHERE (SELECT COUNT(*) FROM audit_tree_nodes WHERE audit_project_id = @proj) = 0;

UPDATE audit_tree_nodes SET path = CONCAT('/', id, '/') WHERE audit_project_id = @proj AND parent_id IS NULL;

-- Raíz engagement_file (id)
SET @n_eng = (SELECT id FROM audit_tree_nodes WHERE audit_project_id = @proj AND type = 'engagement_file' AND parent_id IS NULL LIMIT 1);
-- Si la BD vieja aún tiene permanent_file como tipo de la primera raíz
SET @n_eng = IFNULL(@n_eng, (SELECT id FROM audit_tree_nodes WHERE audit_project_id = @proj AND type = 'permanent_file' AND parent_id IS NULL LIMIT 1));

SET @n_prog = (SELECT id FROM audit_tree_nodes WHERE audit_project_id = @proj AND type = 'programs' AND parent_id IS NULL LIMIT 1);

-- ========== SECCIÓN DUMMY-A (raíz engagement) ==========
INSERT INTO engagement_file_sections (audit_project_id, parent_section_id, code, name, sort_order, created_at, updated_at)
SELECT @proj, NULL, 'DUMMY-A', 'Sección A — Control y documentación', 0, NOW(), NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM engagement_file_sections WHERE audit_project_id = @proj AND code = 'DUMMY-A');

SET @sec_a = (SELECT id FROM engagement_file_sections WHERE audit_project_id = @proj AND code = 'DUMMY-A' LIMIT 1);

INSERT INTO audit_tree_nodes (audit_project_id, parent_id, path, depth, type, name, sort_order, ref_id, is_system_node, created_at, updated_at)
SELECT @proj, @n_eng, '/', 1, 'folder', 'DUMMY-A — Control y documentación', 1, @sec_a, 0, NOW(), NOW()
FROM DUAL WHERE @sec_a IS NOT NULL AND @n_eng IS NOT NULL AND NOT EXISTS (
  SELECT 1 FROM audit_tree_nodes WHERE audit_project_id = @proj AND ref_id = @sec_a AND type = 'folder'
);

SET @node_a = (SELECT id FROM audit_tree_nodes WHERE audit_project_id = @proj AND ref_id = @sec_a AND type = 'folder' LIMIT 1);
UPDATE audit_tree_nodes SET path = CONCAT('/', @n_eng, '/', id, '/') WHERE id = @node_a AND path = '/';
UPDATE engagement_file_sections SET tree_node_id = @node_a WHERE id = @sec_a AND tree_node_id IS NULL;

-- Subsección DUMMY-A1 bajo DUMMY-A
INSERT INTO engagement_file_sections (audit_project_id, parent_section_id, code, name, sort_order, created_at, updated_at)
SELECT @proj, @sec_a, 'DUMMY-A1', 'Subcarpeta — Detalle operativo', 0, NOW(), NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM engagement_file_sections WHERE audit_project_id = @proj AND code = 'DUMMY-A1');

SET @sec_a1 = (SELECT id FROM engagement_file_sections WHERE audit_project_id = @proj AND code = 'DUMMY-A1' LIMIT 1);

INSERT INTO audit_tree_nodes (audit_project_id, parent_id, path, depth, type, name, sort_order, ref_id, is_system_node, created_at, updated_at)
SELECT @proj, @node_a, '/', 2, 'folder', 'DUMMY-A1 — Detalle operativo', 1, @sec_a1, 0, NOW(), NOW()
FROM DUAL WHERE @sec_a1 IS NOT NULL AND NOT EXISTS (
  SELECT 1 FROM audit_tree_nodes WHERE audit_project_id = @proj AND ref_id = @sec_a1 AND type = 'folder'
);

SET @node_a1 = (SELECT id FROM audit_tree_nodes WHERE audit_project_id = @proj AND ref_id = @sec_a1 AND type = 'folder' LIMIT 1);
UPDATE audit_tree_nodes SET path = CONCAT('/', @n_eng, '/', @node_a, '/', id, '/') WHERE id = @node_a1 AND path = '/';
UPDATE engagement_file_sections SET tree_node_id = @node_a1 WHERE id = @sec_a1 AND tree_node_id IS NULL;

-- Ítems en DUMMY-A1 (3 ítems, distintos estados)
INSERT INTO checklist_items (section_id, created_by_user_id, code, description, is_required, status, sort_order, created_at, updated_at)
SELECT @sec_a1, @user_owner, 'A1.1', 'Revisar procedimiento de cierre', 1, 'pending', 0, NOW(), NOW()
FROM DUAL WHERE @sec_a1 IS NOT NULL AND NOT EXISTS (SELECT 1 FROM checklist_items WHERE section_id = @sec_a1 AND code = 'A1.1');
INSERT INTO checklist_items (section_id, created_by_user_id, code, description, is_required, status, sort_order, created_at, updated_at)
SELECT @sec_a1, @user_owner, 'A1.2', 'Validar firmas del representante legal', 1, 'in_review', 1, NOW(), NOW()
FROM DUAL WHERE @sec_a1 IS NOT NULL AND NOT EXISTS (SELECT 1 FROM checklist_items WHERE section_id = @sec_a1 AND code = 'A1.2');
INSERT INTO checklist_items (section_id, created_by_user_id, code, description, is_required, status, sort_order, created_at, updated_at)
SELECT @sec_a1, @user_owner, 'A1.3', 'Archivar actas (no aplica si no hay)', 0, 'not_applicable', 2, NOW(), NOW()
FROM DUAL WHERE @sec_a1 IS NOT NULL AND NOT EXISTS (SELECT 1 FROM checklist_items WHERE section_id = @sec_a1 AND code = 'A1.3');

-- Nodos checklist_item + tree_node_id para cada ítem bajo @node_a1
-- (procedural: insert node per item - simplified loop via 3 blocks)
-- A1.1
SET @it = (SELECT id FROM checklist_items WHERE section_id = @sec_a1 AND code = 'A1.1' LIMIT 1);
INSERT INTO audit_tree_nodes (audit_project_id, parent_id, path, depth, type, name, sort_order, ref_id, is_system_node, created_at, updated_at)
SELECT @proj, @node_a1, '/', 3, 'checklist_item', 'A1.1 — Revisar procedimiento', 1, @it, 0, NOW(), NOW()
FROM DUAL WHERE @it IS NOT NULL AND NOT EXISTS (SELECT 1 FROM audit_tree_nodes WHERE audit_project_id = @proj AND ref_id = @it AND type = 'checklist_item');
SET @nid = (SELECT id FROM audit_tree_nodes WHERE audit_project_id = @proj AND ref_id = @it AND type = 'checklist_item' LIMIT 1);
UPDATE audit_tree_nodes SET path = CONCAT('/', @n_eng, '/', @node_a, '/', @node_a1, '/', id, '/') WHERE id = @nid AND path = '/';
UPDATE checklist_items SET tree_node_id = @nid WHERE id = @it AND tree_node_id IS NULL;
INSERT INTO checklist_item_assignees (checklist_item_id, user_id, assigned_by_user_id, created_at) SELECT @it, @user_owner, @user_owner, NOW() FROM DUAL
WHERE @it IS NOT NULL AND NOT EXISTS (SELECT 1 FROM checklist_item_assignees WHERE checklist_item_id = @it AND user_id = @user_owner);
-- A1.2
SET @it = (SELECT id FROM checklist_items WHERE section_id = @sec_a1 AND code = 'A1.2' LIMIT 1);
INSERT INTO audit_tree_nodes (audit_project_id, parent_id, path, depth, type, name, sort_order, ref_id, is_system_node, created_at, updated_at)
SELECT @proj, @node_a1, '/', 3, 'checklist_item', 'A1.2 — Validar firmas', 2, @it, 0, NOW(), NOW()
FROM DUAL WHERE @it IS NOT NULL AND NOT EXISTS (SELECT 1 FROM audit_tree_nodes WHERE audit_project_id = @proj AND ref_id = @it AND type = 'checklist_item');
SET @nid = (SELECT id FROM audit_tree_nodes WHERE audit_project_id = @proj AND ref_id = @it AND type = 'checklist_item' LIMIT 1);
UPDATE audit_tree_nodes SET path = CONCAT('/', @n_eng, '/', @node_a, '/', @node_a1, '/', id, '/') WHERE id = @nid AND path = '/';
UPDATE checklist_items SET tree_node_id = @nid WHERE id = @it AND tree_node_id IS NULL;
-- A1.3 sin asignados
SET @it = (SELECT id FROM checklist_items WHERE section_id = @sec_a1 AND code = 'A1.3' LIMIT 1);
INSERT INTO audit_tree_nodes (audit_project_id, parent_id, path, depth, type, name, sort_order, ref_id, is_system_node, created_at, updated_at)
SELECT @proj, @node_a1, '/', 3, 'checklist_item', 'A1.3 — Archivar actas', 3, @it, 0, NOW(), NOW()
FROM DUAL WHERE @it IS NOT NULL AND NOT EXISTS (SELECT 1 FROM audit_tree_nodes WHERE audit_project_id = @proj AND ref_id = @it AND type = 'checklist_item');
SET @nid = (SELECT id FROM audit_tree_nodes WHERE audit_project_id = @proj AND ref_id = @it AND type = 'checklist_item' LIMIT 1);
UPDATE audit_tree_nodes SET path = CONCAT('/', @n_eng, '/', @node_a, '/', @node_a1, '/', id, '/') WHERE id = @nid AND path = '/';
UPDATE checklist_items SET tree_node_id = @nid WHERE id = @it AND tree_node_id IS NULL;

-- ========== SECCIÓN DUMMY-B hermana (ítems directos sin subcarpeta) ==========
INSERT INTO engagement_file_sections (audit_project_id, parent_section_id, code, name, sort_order, created_at, updated_at)
SELECT @proj, NULL, 'DUMMY-B', 'Sección B — Tributario / formularios', 1, NOW(), NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM engagement_file_sections WHERE audit_project_id = @proj AND code = 'DUMMY-B');

SET @sec_b = (SELECT id FROM engagement_file_sections WHERE audit_project_id = @proj AND code = 'DUMMY-B' LIMIT 1);
INSERT INTO audit_tree_nodes (audit_project_id, parent_id, path, depth, type, name, sort_order, ref_id, is_system_node, created_at, updated_at)
SELECT @proj, @n_eng, '/', 1, 'folder', 'DUMMY-B — Tributario', 2, @sec_b, 0, NOW(), NOW()
FROM DUAL WHERE @sec_b IS NOT NULL AND NOT EXISTS (SELECT 1 FROM audit_tree_nodes WHERE audit_project_id = @proj AND ref_id = @sec_b AND type = 'folder');
SET @node_b = (SELECT id FROM audit_tree_nodes WHERE audit_project_id = @proj AND ref_id = @sec_b AND type = 'folder' LIMIT 1);
UPDATE audit_tree_nodes SET path = CONCAT('/', @n_eng, '/', id, '/') WHERE id = @node_b AND path = '/';
UPDATE engagement_file_sections SET tree_node_id = @node_b WHERE id = @sec_b AND tree_node_id IS NULL;

INSERT INTO checklist_items (section_id, created_by_user_id, code, description, is_required, status, sort_order, created_at, updated_at)
SELECT @sec_b, @user_owner, 'B.1', 'Form 101 declarado', 1, 'compliant', 0, NOW(), NOW()
FROM DUAL WHERE @sec_b IS NOT NULL AND NOT EXISTS (SELECT 1 FROM checklist_items WHERE section_id = @sec_b AND code = 'B.1');
SET @it = (SELECT id FROM checklist_items WHERE section_id = @sec_b AND code = 'B.1' LIMIT 1);
INSERT INTO audit_tree_nodes (audit_project_id, parent_id, path, depth, type, name, sort_order, ref_id, is_system_node, created_at, updated_at)
SELECT @proj, @node_b, '/', 2, 'checklist_item', 'B.1 — Form 101', 1, @it, 0, NOW(), NOW()
FROM DUAL WHERE @it IS NOT NULL AND NOT EXISTS (SELECT 1 FROM audit_tree_nodes WHERE audit_project_id = @proj AND ref_id = @it AND type = 'checklist_item');
SET @nid = (SELECT id FROM audit_tree_nodes WHERE audit_project_id = @proj AND ref_id = @it AND type = 'checklist_item' LIMIT 1);
UPDATE audit_tree_nodes SET path = CONCAT('/', @n_eng, '/', @node_b, '/', id, '/') WHERE id = @nid AND path = '/';
UPDATE checklist_items SET tree_node_id = @nid WHERE id = @it AND tree_node_id IS NULL;

-- ========== Carpeta genérica bajo Programas (sin ref_id) ==========
INSERT INTO audit_tree_nodes (audit_project_id, parent_id, path, depth, type, name, sort_order, is_system_node, created_at, updated_at)
SELECT @proj, @n_prog, '/', 1, 'folder', '101 — Bancos (carpeta manual)', 1, 0, NOW(), NOW()
FROM DUAL WHERE @n_prog IS NOT NULL AND NOT EXISTS (
  SELECT 1 FROM audit_tree_nodes WHERE audit_project_id = @proj AND parent_id = @n_prog AND name = '101 — Bancos (carpeta manual)'
);
UPDATE audit_tree_nodes n
JOIN (SELECT id FROM audit_tree_nodes WHERE audit_project_id = @proj AND parent_id = @n_prog AND name = '101 — Bancos (carpeta manual)' LIMIT 1) t ON n.id = t.id
SET n.path = CONCAT('/', @n_prog, '/', n.id, '/') WHERE n.path = '/';

-- ============================================================
-- Fin. Probar:
--   POST projects/tree/full { "data": { "auditProjectId": @proj } }
--   POST projects/tree/node-detail con nodeId de cualquier folder/checklist_item
--   POST projects/engagement-file/sections/list
--   POST projects/engagement-file/items/list { sectionId }
-- ============================================================
