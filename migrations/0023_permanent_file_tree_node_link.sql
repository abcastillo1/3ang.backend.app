-- Link permanent file sections and checklist items to audit_tree_nodes so tree/full
-- is the single hierarchy. Nullable for existing rows until backfill or re-apply template.

ALTER TABLE permanent_file_sections
  ADD COLUMN tree_node_id INT NULL AFTER sort_order,
  ADD INDEX idx_pf_sections_tree_node (tree_node_id),
  ADD CONSTRAINT fk_pf_sections_tree_node
    FOREIGN KEY (tree_node_id) REFERENCES audit_tree_nodes(id) ON DELETE SET NULL;

ALTER TABLE checklist_items
  ADD COLUMN tree_node_id INT NULL AFTER sort_order,
  ADD INDEX idx_checklist_tree_node (tree_node_id),
  ADD CONSTRAINT fk_checklist_tree_node
    FOREIGN KEY (tree_node_id) REFERENCES audit_tree_nodes(id) ON DELETE SET NULL;
