-- Varias plantillas de expediente por organización + vínculo de secciones a plantilla.
-- La plantilla "del sistema" no se guarda aquí: se aplica desde código (DEFAULT_ENGAGEMENT_FILE_TEMPLATE).

CREATE TABLE IF NOT EXISTS engagement_file_templates (
  id INT NOT NULL AUTO_INCREMENT,
  organization_id INT NOT NULL,
  name VARCHAR(255) NOT NULL,
  is_default TINYINT(1) NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at DATETIME NULL,
  PRIMARY KEY (id),
  INDEX idx_engagement_file_templates_org (organization_id),
  CONSTRAINT fk_engagement_file_templates_org FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE engagement_file_template_sections
  ADD COLUMN template_id INT NULL AFTER organization_id;

-- Una fila plantilla por organización que ya tenía filas en secciones (incl. soft-deleted), para no dejar template_id NULL.
INSERT INTO engagement_file_templates (organization_id, name, is_default, created_at, updated_at)
SELECT DISTINCT s.organization_id, 'Plantilla principal', 1, NOW(), NOW()
FROM engagement_file_template_sections s
WHERE NOT EXISTS (
    SELECT 1 FROM engagement_file_templates t
    WHERE t.organization_id = s.organization_id AND t.deleted_at IS NULL
  );

UPDATE engagement_file_template_sections s
INNER JOIN engagement_file_templates t
  ON t.organization_id = s.organization_id AND t.is_default = 1 AND t.deleted_at IS NULL
SET s.template_id = t.id
WHERE s.template_id IS NULL;

ALTER TABLE engagement_file_template_sections
  MODIFY COLUMN template_id INT NOT NULL,
  ADD INDEX idx_engagement_file_template_sections_template (template_id),
  ADD CONSTRAINT fk_engagement_file_template_sections_template FOREIGN KEY (template_id) REFERENCES engagement_file_templates(id) ON DELETE CASCADE;

ALTER TABLE engagement_file_template_sections
  DROP INDEX uk_pft_sections_org_code;

ALTER TABLE engagement_file_template_sections
  ADD UNIQUE KEY uk_eft_sections_template_code (template_id, code);
