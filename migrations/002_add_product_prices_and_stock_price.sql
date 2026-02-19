-- Precios y IVA en producto; precio por establecimiento en stock
-- Ejecutar manualmente en MySQL

-- 1. inventory_products: precio general, costo, IVA, precio mínimo, stock mínimo
ALTER TABLE `inventory_products`
  ADD COLUMN `general_price` DECIMAL(12,4) NULL DEFAULT 0.0000 AFTER `unit_of_measure`,
  ADD COLUMN `cost_price` DECIMAL(12,4) NULL DEFAULT 0.0000 AFTER `general_price`,
  ADD COLUMN `iva_type` VARCHAR(10) NULL COMMENT 'Ej: 0, 12, 15 (porcentaje IVA)' AFTER `cost_price`,
  ADD COLUMN `minimum_price` DECIMAL(12,4) NULL DEFAULT 0.0000 AFTER `iva_type`,
  ADD COLUMN `min_stock_level` DECIMAL(12,4) NULL DEFAULT 0.0000 COMMENT 'Stock mínimo por defecto del producto' AFTER `minimum_price`;

-- 2. inventory_stock: precio del producto en el establecimiento
ALTER TABLE `inventory_stock`
  ADD COLUMN `price` DECIMAL(12,4) NULL COMMENT 'Precio del producto en este establecimiento' AFTER `min_stock_level`;
