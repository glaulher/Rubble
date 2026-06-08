-- Adds preventive_cycle_items table for equipment per cycle management

CREATE TABLE IF NOT EXISTS `preventive_cycle_items` (
  `id`               INT AUTO_INCREMENT PRIMARY KEY,
  `ciclo`            VARCHAR(7) NOT NULL COMMENT 'YYYY-MM',
  `equipamento_id`   INT NOT NULL,
  `observacao`       TEXT DEFAULT NULL,
  `created_at`       DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at`       DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY `uk_ciclo_equip` (`ciclo`, `equipamento_id`),
  CONSTRAINT `fk_preventive_cycle_equipamento`
    FOREIGN KEY (`equipamento_id`) REFERENCES `equipamentos` (`id`)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
