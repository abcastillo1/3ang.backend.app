-- P/C per checklist template item and project checklist item (evidence lives at item level).
ALTER TABLE engagement_file_template_items
  ADD COLUMN retention_scope VARCHAR(30) NOT NULL DEFAULT 'structural'
  COMMENT 'structural=P multi-year; per_period=C per audit period'
  AFTER ref;

ALTER TABLE checklist_items
  ADD COLUMN retention_scope VARCHAR(30) NOT NULL DEFAULT 'structural'
  COMMENT 'Copied from template on apply; structural vs per-period'
  AFTER ref;
