-- Referencias cruzadas entre documentos y nodos del árbol dentro de un proyecto de auditoría.
-- Permite trazabilidad tipo papeles de trabajo ↔ evidencias ↔ secciones.

CREATE TABLE IF NOT EXISTS audit_cross_references (
  id INT AUTO_INCREMENT PRIMARY KEY,
  organization_id INT NOT NULL,
  audit_project_id INT NOT NULL,
  source_kind VARCHAR(20) NOT NULL COMMENT 'document | tree_node',
  source_id INT NOT NULL,
  target_kind VARCHAR(20) NOT NULL,
  target_id INT NOT NULL,
  relation_type VARCHAR(50) NOT NULL DEFAULT 'related',
  note TEXT NULL,
  created_by_user_id INT NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_cross_ref_endpoints (audit_project_id, source_kind, source_id, target_kind, target_id),
  INDEX idx_cross_ref_source (audit_project_id, source_kind, source_id),
  INDEX idx_cross_ref_target (audit_project_id, target_kind, target_id),
  INDEX idx_cross_ref_org (organization_id),
  CONSTRAINT fk_cross_ref_org FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
  CONSTRAINT fk_cross_ref_project FOREIGN KEY (audit_project_id) REFERENCES audit_projects(id) ON DELETE CASCADE,
  CONSTRAINT fk_cross_ref_author FOREIGN KEY (created_by_user_id) REFERENCES users(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO permissions (code, module, description, created_at, updated_at)
VALUES ('projects.references.manage', 'projects', 'Crear, listar, actualizar y eliminar referencias cruzadas (documentos y nodos)', NOW(), NOW());

INSERT INTO role_permissions (role_id, permission_id, created_at, updated_at)
SELECT r.id, p.id, NOW(), NOW()
FROM roles r
CROSS JOIN permissions p
WHERE p.code = 'projects.references.manage'
  AND r.name IN ('Administrador', 'Socio', 'Supervisor', 'Auditor');
