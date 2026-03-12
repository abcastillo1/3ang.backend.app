-- Ejecutar UNA VEZ. Orden: 0032 → 0033 → 0034 (ver README-MIGRATIONS-0032-0034.md).
-- Comentarios por ítem de checklist (hilo con parent_id; adjuntos vía audit_documents.comment_id).
-- Evidencia formal del ítem = documentos con node_id = tree_node_id y comment_id IS NULL.

CREATE TABLE IF NOT EXISTS checklist_item_comments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  checklist_item_id INT NOT NULL,
  audit_project_id INT NOT NULL COMMENT 'Denormalizado para listados y permisos sin join a section',
  parent_id INT NULL COMMENT 'Respuesta a otro comentario; NULL = raíz del hilo',
  body TEXT NOT NULL,
  author_user_id INT NOT NULL,
  mention_user_ids JSON NULL COMMENT 'Array de user ids mencionados (@); notificaciones leen esto',
  attachment_count INT NOT NULL DEFAULT 0 COMMENT 'Denormalizado: docs con comment_id = id; evita COUNT por comentario',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at DATETIME NULL,
  INDEX idx_cic_item (checklist_item_id),
  INDEX idx_cic_project (audit_project_id),
  INDEX idx_cic_parent (parent_id),
  INDEX idx_cic_author (author_user_id),
  CONSTRAINT fk_cic_item FOREIGN KEY (checklist_item_id) REFERENCES checklist_items(id) ON DELETE CASCADE,
  CONSTRAINT fk_cic_project FOREIGN KEY (audit_project_id) REFERENCES audit_projects(id) ON DELETE CASCADE,
  CONSTRAINT fk_cic_parent FOREIGN KEY (parent_id) REFERENCES checklist_item_comments(id) ON DELETE CASCADE,
  CONSTRAINT fk_cic_author FOREIGN KEY (author_user_id) REFERENCES users(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Adjuntos de comentario: mismo node_id (contexto ítem) + comment_id (pertenece al hilo)
ALTER TABLE audit_documents
  ADD COLUMN comment_id INT NULL COMMENT 'Si no NULL, adjunto de comentario; evidencia formal deja NULL' AFTER node_id;

ALTER TABLE audit_documents
  ADD INDEX idx_audit_documents_comment_id (comment_id);

-- RESTRICT: borrar comentario con adjuntos requiere antes quitar/borrar docs (o app hace CASCADE lógico + storage)
ALTER TABLE audit_documents
  ADD CONSTRAINT fk_audit_documents_comment
  FOREIGN KEY (comment_id) REFERENCES checklist_item_comments(id) ON DELETE RESTRICT;
