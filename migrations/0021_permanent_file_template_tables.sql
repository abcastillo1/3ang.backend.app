-- Plantilla de archivo permanente por organización (secciones e ítems estándar).
-- Al aplicar la plantilla a un proyecto se copian estas secciones/ítems a permanent_file_sections y checklist_items.

CREATE TABLE IF NOT EXISTS permanent_file_template_sections (
  id INT AUTO_INCREMENT PRIMARY KEY,
  organization_id INT NOT NULL,
  parent_section_id INT NULL,
  code VARCHAR(20) NOT NULL,
  name VARCHAR(255) NOT NULL,
  priority VARCHAR(10) NULL,
  sort_order INT NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at DATETIME NULL,
  INDEX idx_pft_sections_org (organization_id),
  INDEX idx_pft_sections_parent (parent_section_id),
  UNIQUE KEY uk_pft_sections_org_code (organization_id, code),
  CONSTRAINT fk_pft_sections_org FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
  CONSTRAINT fk_pft_sections_parent FOREIGN KEY (parent_section_id) REFERENCES permanent_file_template_sections(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS permanent_file_template_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  template_section_id INT NOT NULL,
  code VARCHAR(30) NOT NULL,
  description VARCHAR(500) NULL,
  is_required TINYINT(1) NOT NULL DEFAULT 0,
  ref VARCHAR(100) NULL,
  sort_order INT NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at DATETIME NULL,
  INDEX idx_pft_items_section (template_section_id),
  UNIQUE KEY uk_pft_items_section_code (template_section_id, code),
  CONSTRAINT fk_pft_items_section FOREIGN KEY (template_section_id) REFERENCES permanent_file_template_sections(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
