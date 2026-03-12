-- Asignaciones: borrado lógico. Se quita UNIQUE (project,user) para permitir
-- varias filas históricas soft-borradas; la app restaura o crea una activa.

ALTER TABLE project_assignments
  ADD COLUMN deleted_at DATETIME NULL AFTER updated_at;

-- Quitar unique que impediría re-asignar tras soft delete
ALTER TABLE project_assignments
  DROP INDEX project_assignments_project_user_unique;

ALTER TABLE project_assignments
  ADD INDEX idx_project_assignments_project_user (audit_project_id, user_id);

ALTER TABLE project_assignments
  ADD INDEX idx_project_assignments_deleted (deleted_at);

-- Ítem asignados N:N: mismo criterio
ALTER TABLE checklist_item_assignees
  ADD COLUMN deleted_at DATETIME NULL AFTER created_at;

ALTER TABLE checklist_item_assignees
  DROP INDEX uk_checklist_assignee_item_user;

ALTER TABLE checklist_item_assignees
  ADD INDEX idx_cia_item_user (checklist_item_id, user_id);

ALTER TABLE checklist_item_assignees
  ADD INDEX idx_cia_deleted (deleted_at);

SET @exist := (SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'checklist_item_assignees' AND INDEX_NAME = 'idx_cia_deleted');
SET @sql := IF(@exist = 0, 'ALTER TABLE checklist_item_assignees ADD INDEX idx_cia_deleted (deleted_at)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;