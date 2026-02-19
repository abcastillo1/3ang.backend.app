-- Kardex: precio costo (entrada = costo del lote; transferencia/salida = costo por defecto del producto)
-- Ejecutar manualmente en MySQL

ALTER TABLE `kardex`
  ADD COLUMN `cost_price` DECIMAL(12,4) NULL COMMENT 'Precio costo: entrada = input/lote; transferencia/salida = costo por defecto del producto' AFTER `quantity`;
