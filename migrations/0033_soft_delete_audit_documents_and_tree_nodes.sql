-- Borrado lógico: deleted_at en documentos y nodos de árbol.
-- Idempotente: solo añade columna/índice si no existen (evita error al re-ejecutar).
-- Requiere 0032 ya aplicada si usas comment_id en código; 0033 es independiente.

-- audit_documents.deleted_at
SET @db := DATABASE();
SET @exist := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'audit_documents' AND COLUMN_NAME = 'deleted_at');
SET @sql := IF(@exist = 0, 'ALTER TABLE audit_documents ADD COLUMN deleted_at DATETIME NULL AFTER updated_at', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @exist := (SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'audit_documents' AND INDEX_NAME = 'idx_audit_documents_deleted_at');
SET @sql := IF(@exist = 0, 'ALTER TABLE audit_documents ADD INDEX idx_audit_documents_deleted_at (deleted_at)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- audit_tree_nodes.deleted_at
SET @exist := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'audit_tree_nodes' AND COLUMN_NAME = 'deleted_at');
SET @sql := IF(@exist = 0, 'ALTER TABLE audit_tree_nodes ADD COLUMN deleted_at DATETIME NULL AFTER updated_at', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @exist := (SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'audit_tree_nodes' AND INDEX_NAME = 'idx_audit_tree_nodes_deleted_at');
SET @sql := IF(@exist = 0, 'ALTER TABLE audit_tree_nodes ADD INDEX idx_audit_tree_nodes_deleted_at (audit_project_id, deleted_at)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
