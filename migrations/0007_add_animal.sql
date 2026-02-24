-- Migración: Tablas species y animals
-- Ejecutar manualmente en MySQL

-- 1. Tabla species
CREATE TABLE IF NOT EXISTS `species` (
  `species_id` INT NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(100) NOT NULL,
  `active` TINYINT(1) NOT NULL DEFAULT 1,
  PRIMARY KEY (`species_id`),
  UNIQUE KEY `species_name_unique` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 2. Tabla animals
CREATE TABLE IF NOT EXISTS `animals` (
  `animal_id` INT NOT NULL AUTO_INCREMENT,
  `code` VARCHAR(50) NOT NULL,
  `name` VARCHAR(100) NULL,
  `species_id` INT NOT NULL,
  `organizationfk_id` INT NOT NULL,
  `establishmentsfk_id` INT NOT NULL,
  `sex` ENUM('Macho', 'Hembra') NOT NULL,
  `breed` VARCHAR(100) NULL,
  `birth_date` DATE NULL,
  `father_id` INT NULL,
  `mother_id` INT NULL,
  `entry_date` DATE NOT NULL,
  `entry_type` ENUM('Nacimiento', 'Compra', 'Transferencia') NOT NULL,
  `image` TEXT NULL,
  `gallery` TEXT NULL,
  `color` VARCHAR(50) NULL,
  `race` VARCHAR(50) NULL,
  `status` ENUM('Activo', 'Inactivo', 'Vendido', 'Muerto') NOT NULL DEFAULT 'Activo',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`animal_id`),
  UNIQUE KEY `animals_code_unique` (`code`),
  INDEX `idx_species` (`species_id`),
  INDEX `idx_estab` (`establishmentsfk_id`),
  INDEX `idx_organ` (`organizationfk_id`),
  INDEX `idx_sex` (`sex`),
  INDEX `idx_status` (`status`),
  CONSTRAINT `animals_species_fk` FOREIGN KEY (`species_id`) REFERENCES `species` (`species_id`),
  CONSTRAINT `animals_organization_fk` FOREIGN KEY (`organizationfk_id`) REFERENCES `organizations` (`id`),
  CONSTRAINT `animals_establishment_fk` FOREIGN KEY (`establishmentsfk_id`) REFERENCES `establishments` (`id`),
  CONSTRAINT `animals_father_fk` FOREIGN KEY (`father_id`) REFERENCES `animals` (`animal_id`),
  CONSTRAINT `animals_mother_fk` FOREIGN KEY (`mother_id`) REFERENCES `animals` (`animal_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
