-- Migration: Create pv_os junction table, migrate data, drop pv.os
-- Fully idempotent: safe to run multiple times.
-- Run this after backing up the database.

START TRANSACTION;

-- 1. Create pv_os junction table
CREATE TABLE IF NOT EXISTS `pv_os` (
    `pv_id` INT(11) NOT NULL,
    `registro_id` INT(11) NOT NULL,
    PRIMARY KEY (`pv_id`, `registro_id`),
    KEY `idx_pv_os_registro` (`registro_id`),
    CONSTRAINT `fk_pv_os_pv` FOREIGN KEY (`pv_id`) REFERENCES `pv` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_pv_os_registro` FOREIGN KEY (`registro_id`) REFERENCES `registros` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Check if pv.os column still exists (already dropped = already migrated)
SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'pv' AND COLUMN_NAME = 'os');

-- 3. Migrate existing data from pv.os to pv_os (only if column exists)
SET @migrate_sql = IF(@col_exists > 0,
    'INSERT IGNORE INTO `pv_os` (`pv_id`, `registro_id`)
     SELECT DISTINCT p.`id`, r.`id`
     FROM `pv` p
     JOIN `registros` r ON FIND_IN_SET(TRIM(r.`os`), REPLACE(p.`os`, \', \', \',\')) > 0
     WHERE p.`os` IS NOT NULL AND p.`os` <> \'\'',
    'SELECT 1');
PREPARE stmt FROM @migrate_sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 4. Drop the old os column from pv (only if it exists)
SET @drop_sql = IF(@col_exists > 0, 'ALTER TABLE `pv` DROP COLUMN `os`', 'SELECT 1');
PREPARE stmt FROM @drop_sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

COMMIT;
