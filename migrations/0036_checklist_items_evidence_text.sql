-- Add rich-text evidence field for checklist items
ALTER TABLE checklist_items
  ADD COLUMN evidence_text TEXT NULL
  COMMENT 'Rich text evidence content (HTML) for the checklist item'
  AFTER description;
