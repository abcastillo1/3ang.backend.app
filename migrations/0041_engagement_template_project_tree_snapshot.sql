-- Raíces del árbol del proyecto opcionales por plantilla de expediente (JSON: [{ "type", "name" }, ...]).
-- Si NULL, al crear proyecto se usa la plantilla global de la firma (OrganizationSetting project_tree_template).

ALTER TABLE engagement_file_templates
  ADD COLUMN project_tree_snapshot JSON NULL COMMENT 'Raices arbol si se usa esta plantilla al crear proyecto; NULL = global org' AFTER is_default;
