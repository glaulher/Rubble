-- Add SLA fields to activities for multi-day planning with extension tracking

-- Corretiva parent: SLA config stored in registros
ALTER TABLE registros
  ADD COLUMN sla_days INT DEFAULT NULL,
  ADD COLUMN sla_include_saturday TINYINT(1) DEFAULT 0,
  ADD COLUMN sla_include_sunday TINYINT(1) DEFAULT 0;

-- Corretiva card: which SLA day this card represents
ALTER TABLE planejamento_datas
  ADD COLUMN sla_day_number INT DEFAULT 0;

-- Preventiva: SLA config + day number
ALTER TABLE atividades_preventivas
  ADD COLUMN sla_days INT DEFAULT NULL,
  ADD COLUMN sla_include_saturday TINYINT(1) DEFAULT 0,
  ADD COLUMN sla_include_sunday TINYINT(1) DEFAULT 0,
  ADD COLUMN sla_day_number INT DEFAULT 0;

-- Track SLA extensions (justified overruns)
CREATE TABLE IF NOT EXISTS sla_extensions (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  registro_id     INT DEFAULT NULL,
  preventiva_id   INT DEFAULT NULL,
  tipo            ENUM('corretiva','preventiva') NOT NULL,
  extra_days      INT NOT NULL,
  justification   VARCHAR(100) NOT NULL,
  created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (registro_id) REFERENCES registros(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
