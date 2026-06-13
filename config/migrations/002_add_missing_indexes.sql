-- Migration: Add missing indexes for query performance
-- Run this after backing up the database.

START TRANSACTION;

-- registros table: FK column and filter columns
CREATE INDEX IF NOT EXISTS `idx_registros_equipamento_id` ON `registros` (`equipamento_id`);
CREATE INDEX IF NOT EXISTS `idx_registros_status` ON `registros` (`status`);
CREATE INDEX IF NOT EXISTS `idx_registros_data` ON `registros` (`data`);

-- pv table: filter and group-by columns
CREATE INDEX IF NOT EXISTS `idx_pv_local` ON `pv` (`local`);
CREATE INDEX IF NOT EXISTS `idx_pv_status` ON `pv` (`status`);
CREATE INDEX IF NOT EXISTS `idx_pv_ciclo` ON `pv` (`ciclo`);

COMMIT;
