-- Activity log: business-level events for "what did the user do" (project/org history)
-- Separate from audit_logs (request-level). Used for feeds and history views.
CREATE TABLE IF NOT EXISTS activity_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  organization_id INT NOT NULL,
  user_id INT NOT NULL,
  audit_project_id INT NULL,
  action VARCHAR(80) NOT NULL,
  entity VARCHAR(50) NOT NULL,
  entity_id INT NULL,
  description TEXT NULL,
  metadata JSON NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_activity_org_created (organization_id, created_at DESC),
  INDEX idx_activity_project_created (audit_project_id, created_at DESC),
  INDEX idx_activity_user_created (user_id, created_at DESC),
  INDEX idx_activity_entity (organization_id, entity, entity_id),
  CONSTRAINT fk_activity_organization FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
  CONSTRAINT fk_activity_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_activity_project FOREIGN KEY (audit_project_id) REFERENCES audit_projects(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
