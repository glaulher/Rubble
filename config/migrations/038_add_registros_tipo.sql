ALTER TABLE registros ADD COLUMN tipo ENUM('preventiva', 'corretiva') NOT NULL DEFAULT 'preventiva' AFTER origin;
