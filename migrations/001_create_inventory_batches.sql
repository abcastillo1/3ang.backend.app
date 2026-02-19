-- Migración: Inventario por Lotes
-- Ejecutar manualmente en MySQL

-- 1. Tabla inventory_batches (snake_case)
CREATE TABLE IF NOT EXISTS `inventory_batches` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `product_id` INT NOT NULL,
  `establishment_id` INT NOT NULL,
  `batch_code` VARCHAR(100) NOT NULL DEFAULT 'S/N',
  `manufacturing_date` DATE NULL,
  `expiration_date` DATE NOT NULL,
  `registration_date` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `unit_cost` DECIMAL(12,4) NOT NULL DEFAULT 0.0000,
  `initial_quantity` DECIMAL(12,4) NOT NULL DEFAULT 0.0000,
  `current_quantity` DECIMAL(12,4) NOT NULL DEFAULT 0.0000,
  `auto_generated` TINYINT(1) NOT NULL DEFAULT 1 COMMENT '0 = lote creado por usuario, 1 = generado automáticamente',
  `created_at` DATETIME NULL,
  `updated_at` DATETIME NULL,
  `deleted_at` DATETIME NULL,
  PRIMARY KEY (`id`),
  INDEX `inventory_batches_product_establishment` (`product_id`, `establishment_id`),
  INDEX `inventory_batches_expiration_date` (`expiration_date`),
  CONSTRAINT `inventory_batches_product_fk` FOREIGN KEY (`product_id`) REFERENCES `inventory_products` (`id`) ON DELETE CASCADE,
  CONSTRAINT `inventory_batches_establishment_fk` FOREIGN KEY (`establishment_id`) REFERENCES `establishments` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 2. Columna batch_detail en kardex (JSON: array de { batchId, batchCode, quantity } para trazabilidad de lotes)
ALTER TABLE `kardex` ADD COLUMN `batch_detail` JSON NULL AFTER `product_id`;
