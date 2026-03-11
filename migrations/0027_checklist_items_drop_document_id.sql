-- Checklist items: N documentos vía audit_documents.node_id = tree_node_id.
-- Se quita document_id (un solo doc) para no limitar a un archivo por ítem.
--
-- Instalación limpia (0019 → 0027 en orden): checklist_items aún tiene document_id; estos ALTER aplican.
-- Si tu esquema ya no tiene document_id ni el FK, omití este archivo o ejecutá solo lo que falte.

-- Opcional (solo si había datos con document_id y node_id NULL):
-- UPDATE audit_documents d
-- INNER JOIN checklist_items i ON i.document_id = d.id
-- SET d.node_id = i.tree_node_id
-- WHERE d.node_id IS NULL AND i.tree_node_id IS NOT NULL;

ALTER TABLE checklist_items
  DROP FOREIGN KEY fk_checklist_document;

ALTER TABLE checklist_items
  DROP COLUMN document_id;
