-- P/C at template level: structural = multi-year base (P); per_period = varies by audit year (C).
ALTER TABLE engagement_file_template_sections
  ADD COLUMN retention_scope VARCHAR(30) NOT NULL DEFAULT 'structural'
  COMMENT 'structural=P multi-year; per_period=C per audit period'
  AFTER priority;

ALTER TABLE engagement_file_sections
  ADD COLUMN retention_scope VARCHAR(30) NOT NULL DEFAULT 'structural'
  COMMENT 'Copied from template on apply; structural vs per-period'
  AFTER priority;
