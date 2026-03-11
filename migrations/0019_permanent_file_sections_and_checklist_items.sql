-- FASE 4.1: Archivo permanente — secciones e ítems del checklist
-- Secciones pueden tener jerarquía (parent_section_id). Ítems tienen estado y opcionalmente un documento vinculado.

CREATE TABLE IF NOT EXISTS permanent_file_sections (
  id INT AUTO_INCREMENT PRIMARY KEY,
  audit_project_id INT NOT NULL,
  parent_section_id INT NULL,
  code VARCHAR(20) NOT NULL,
  name VARCHAR(255) NOT NULL,
  priority VARCHAR(10) NULL COMMENT 'P1, P2, P3 or similar',
  sort_order INT NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at DATETIME NULL,
  INDEX idx_pf_sections_project (audit_project_id),
  INDEX idx_pf_sections_parent (parent_section_id),
  UNIQUE KEY uk_pf_sections_project_code (audit_project_id, code),
  CONSTRAINT fk_pf_sections_project FOREIGN KEY (audit_project_id) REFERENCES audit_projects(id) ON DELETE CASCADE,
  CONSTRAINT fk_pf_sections_parent FOREIGN KEY (parent_section_id) REFERENCES permanent_file_sections(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS checklist_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  section_id INT NOT NULL,
  code VARCHAR(30) NOT NULL,
  description VARCHAR(500) NULL,
  is_required TINYINT(1) NOT NULL DEFAULT 0,
  ref VARCHAR(100) NULL COMMENT 'Reference to norm or working paper',
  status VARCHAR(30) NOT NULL DEFAULT 'pending' COMMENT 'pending, in_review, compliant, not_applicable',
  document_id INT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  last_reviewed_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at DATETIME NULL,
  INDEX idx_checklist_section (section_id),
  INDEX idx_checklist_status (section_id, status),
  UNIQUE KEY uk_checklist_section_code (section_id, code),
  CONSTRAINT fk_checklist_section FOREIGN KEY (section_id) REFERENCES permanent_file_sections(id) ON DELETE CASCADE,
  CONSTRAINT fk_checklist_document FOREIGN KEY (document_id) REFERENCES audit_documents(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
