-- Migration 005: Add UNIQUE INDEX on registros.os
-- Converts placeholder OS '0000' to NULL (multiple NULLs allowed in UNIQUE index)
-- Run after backing up the database.

START TRANSACTION;

UPDATE registros SET os = NULL WHERE os = '0000';

CREATE UNIQUE INDEX IF NOT EXISTS `idx_registros_os` ON `registros` (`os`);

COMMIT;
