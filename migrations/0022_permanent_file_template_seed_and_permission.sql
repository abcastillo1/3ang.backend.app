-- Permiso para gestionar plantilla de archivo permanente
INSERT INTO permissions (code, module, description, created_at, updated_at)
VALUES ('organizations.permanentFileTemplate.manage', 'organizations', 'Gestionar plantilla de archivo permanente (secciones e ítems estándar)', NOW(), NOW());

-- Administrador y Socio pueden gestionar la plantilla
INSERT INTO role_permissions (role_id, permission_id, created_at, updated_at)
SELECT r.id, p.id, NOW(), NOW()
FROM roles r
JOIN permissions p ON p.code = 'organizations.permanentFileTemplate.manage'
WHERE r.name IN ('Administrador', 'Socio');

-- Seed: plantilla por defecto para organización 1 (secciones típicas NIA)
INSERT INTO permanent_file_template_sections (organization_id, parent_section_id, code, name, priority, sort_order, created_at, updated_at) VALUES
(1, NULL, 'A', 'Historia del negocio y estructura', 'P1', 0, NOW(), NOW()),
(1, NULL, 'B', 'Organización societaria y gobierno', 'P1', 1, NOW(), NOW()),
(1, NULL, 'C', 'Controles internos y procesos', 'P1', 2, NOW(), NOW()),
(1, NULL, 'D', 'Información financiera y normativa', 'P2', 3, NOW(), NOW());

SET @sec_a = (SELECT id FROM permanent_file_template_sections WHERE organization_id = 1 AND code = 'A' LIMIT 1);
SET @sec_b = (SELECT id FROM permanent_file_template_sections WHERE organization_id = 1 AND code = 'B' LIMIT 1);
SET @sec_c = (SELECT id FROM permanent_file_template_sections WHERE organization_id = 1 AND code = 'C' LIMIT 1);
SET @sec_d = (SELECT id FROM permanent_file_template_sections WHERE organization_id = 1 AND code = 'D' LIMIT 1);

INSERT INTO permanent_file_template_items (template_section_id, code, description, is_required, ref, sort_order, created_at, updated_at) VALUES
(@sec_a, 'A.1', 'Estatutos o contrato de compañía vigentes', 1, 'NIA 315', 0, NOW(), NOW()),
(@sec_a, 'A.2', 'Historia y evolución del negocio', 0, NULL, 1, NOW(), NOW()),
(@sec_a, 'A.3', 'Organigrama actual', 0, NULL, 2, NOW(), NOW()),
(@sec_b, 'B.1', 'Acta de constitución y reformas', 1, NULL, 0, NOW(), NOW()),
(@sec_b, 'B.2', 'Registro de socios o accionistas', 1, NULL, 1, NOW(), NOW()),
(@sec_b, 'B.3', 'Poderes y representación legal', 1, NULL, 2, NOW(), NOW()),
(@sec_c, 'C.1', 'Manual de políticas y procedimientos', 0, NULL, 0, NOW(), NOW()),
(@sec_c, 'C.2', 'Evaluación de control interno (documentación)', 0, 'NIA 315', 1, NOW(), NOW()),
(@sec_d, 'D.1', 'EEFF anteriores y dictámenes', 1, NULL, 0, NOW(), NOW()),
(@sec_d, 'D.2', 'Normativa contable aplicable (NIIF/NIF)', 0, NULL, 1, NOW(), NOW());
