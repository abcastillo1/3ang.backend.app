-- Migración: Agregar campo purpose a animals
-- Ejecutar manualmente en MySQL

ALTER TABLE `animals`
  ADD COLUMN `purpose` VARCHAR(50) NULL AFTER `status`;
