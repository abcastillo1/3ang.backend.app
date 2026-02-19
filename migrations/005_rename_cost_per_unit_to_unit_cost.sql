-- Solo si ya tenés la tabla con cost_per_unit: renombrar a unit_cost
-- Si creaste la tabla con la 001 actualizada (unit_cost), no ejecutes esto.

ALTER TABLE `inventory_batches`
  CHANGE COLUMN `cost_per_unit` `unit_cost` DECIMAL(12,4) NOT NULL DEFAULT 0.0000;
