-- Migration 010: Move status from pv to pv_item
-- Safe to re-run: uses IF NOT EXISTS / IF EXISTS

-- 1. Add status column to pv_item (skip if already exists)
SET @col_exists = (SELECT COUNT(*) FROM information_schema.columns
  WHERE table_schema = DATABASE() AND table_name = 'pv_item' AND column_name = 'status');
SET @sql = IF(@col_exists = 0,
  'ALTER TABLE pv_item ADD COLUMN status VARCHAR(50) NOT NULL DEFAULT ''Aguardando envio''',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 2. Migrate existing data: pv.status → pv_item.status
SET @pv_status_exists = (SELECT COUNT(*) FROM information_schema.columns
  WHERE table_schema = DATABASE() AND table_name = 'pv' AND column_name = 'status');
SET @sql2 = IF(@pv_status_exists > 0,
  'UPDATE pv_item pi INNER JOIN pv ON pv.id = pi.pv_id SET pi.status = pv.status',
  'SELECT 1');
PREPARE stmt2 FROM @sql2; EXECUTE stmt2; DEALLOCATE PREPARE stmt2;

-- 3. Remove status column from pv (also drops idx_pv_status automatically)
SET @sql3 = IF(@pv_status_exists > 0,
  'ALTER TABLE pv DROP COLUMN status',
  'SELECT 1');
PREPARE stmt3 FROM @sql3; EXECUTE stmt3; DEALLOCATE PREPARE stmt3;
