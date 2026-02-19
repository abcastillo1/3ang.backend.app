-- Flag para que el usuario indique si el producto tiene control por lote activo (código, vencimiento, listado).
-- Backend siempre crea al menos un lote (ej. S/N); este campo solo afecta la UI.
-- Ejecutar manualmente en MySQL

ALTER TABLE `inventory_products`
  ADD COLUMN `batch_active` TINYINT(1) NOT NULL DEFAULT 0
  COMMENT '1 = control por lote activo (mostrar código, vencimiento, listado); 0 = no' AFTER `min_stock_level`;
