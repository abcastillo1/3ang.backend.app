-- Quién creó el ítem; varias personas asignadas con registro de quién asignó.

ALTER TABLE checklist_items
  ADD COLUMN created_by_user_id INT NULL COMMENT 'Usuario que creó el ítem' AFTER section_id,
  ADD INDEX idx_checklist_created_by (created_by_user_id),
  ADD CONSTRAINT fk_checklist_created_by_user
    FOREIGN KEY (created_by_user_id) REFERENCES users(id) ON DELETE SET NULL;

-- Tabla N:N: varios usuarios por ítem; assigned_by registra quién hizo la asignación
CREATE TABLE IF NOT EXISTS checklist_item_assignees (
  id INT AUTO_INCREMENT PRIMARY KEY,
  checklist_item_id INT NOT NULL,
  user_id INT NOT NULL,
  assigned_by_user_id INT NULL COMMENT 'Usuario que asignó (null si migración/import)',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uk_checklist_assignee_item_user (checklist_item_id, user_id),
  INDEX idx_checklist_assignees_item (checklist_item_id),
  INDEX idx_checklist_assignees_user (user_id),
  CONSTRAINT fk_checklist_assignees_item FOREIGN KEY (checklist_item_id) REFERENCES checklist_items(id) ON DELETE CASCADE,
  CONSTRAINT fk_checklist_assignees_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_checklist_assignees_assigned_by FOREIGN KEY (assigned_by_user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
