-- Fecha ingresada por el usuario (además de created_at del sistema)
-- Ejecutar manualmente en MySQL

ALTER TABLE `movements`
  ADD COLUMN `date_at` DATE NULL COMMENT 'Fecha ingresada por el usuario (ej. fecha de ingreso/transferencia)' AFTER `description`;

ALTER TABLE `kardex`
  ADD COLUMN `date_at` DATE NULL COMMENT 'Fecha ingresada por el usuario (fecha de ingreso/transferencia)' AFTER `cost_price`;
