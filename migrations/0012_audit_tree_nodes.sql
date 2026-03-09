-- Tree hierarchy for audit projects (materialized path pattern).
-- Each node represents a section, folder, or block within a project.

CREATE TABLE IF NOT EXISTS audit_tree_nodes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  audit_project_id INT NOT NULL,
  parent_id INT NULL,
  path VARCHAR(760) NOT NULL DEFAULT '/',
  depth INT NOT NULL DEFAULT 0,
  type VARCHAR(50) NOT NULL,
  name VARCHAR(255) NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  ref_id INT NULL,
  is_system_node TINYINT(1) NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_tree_project_parent (audit_project_id, parent_id),
  INDEX idx_tree_project_path (audit_project_id, path),
  INDEX idx_tree_project_type (audit_project_id, type),
  CONSTRAINT fk_tree_project FOREIGN KEY (audit_project_id) REFERENCES audit_projects(id) ON DELETE CASCADE,
  CONSTRAINT fk_tree_parent FOREIGN KEY (parent_id) REFERENCES audit_tree_nodes(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Add FK from audit_documents.node_id to audit_tree_nodes
ALTER TABLE audit_documents
  ADD CONSTRAINT fk_audit_documents_node FOREIGN KEY (node_id) REFERENCES audit_tree_nodes(id) ON DELETE SET NULL;
