-- Descripción opcional en carpeta/sección; encargado opcional por ítem (actividad).

ALTER TABLE permanent_file_sections
  ADD COLUMN description TEXT NULL COMMENT 'Notas o contexto de la carpeta' AFTER name;

ALTER TABLE checklist_items
  ADD COLUMN assigned_user_id INT NULL COMMENT 'Usuario responsable del ítem' AFTER document_id,
  ADD INDEX idx_checklist_assigned_user (assigned_user_id),
  ADD CONSTRAINT fk_checklist_assigned_user
    FOREIGN KEY (assigned_user_id) REFERENCES users(id) ON DELETE SET NULL;
