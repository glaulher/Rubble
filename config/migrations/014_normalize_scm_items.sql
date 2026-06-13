-- Migration 014: Normalize SCM - split items into scm_items table
-- Run: docker exec -i rubble-db mariadb -u root -pSENHA manutencao < config/migrations/014_normalize_scm_items.sql

-- 1. Create scm_items table
CREATE TABLE IF NOT EXISTS `scm_items` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `scm_id` int(11) NOT NULL,
  `servico` text DEFAULT NULL,
  `unidade` varchar(50) DEFAULT NULL,
  `valor` decimal(12,2) DEFAULT NULL,
  `qtde_execucao` decimal(12,3) DEFAULT NULL,
  `subtotal_execucao` decimal(12,2) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_scm_items_scm_id` (`scm_id`),
  CONSTRAINT `fk_scm_items_scm` FOREIGN KEY (`scm_id`) REFERENCES `scm` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Migrate existing data: each old SCM row becomes 1 parent + 1 item
INSERT INTO scm_items (scm_id, servico, unidade, valor, qtde_execucao, subtotal_execucao)
SELECT s.id, s.servico, s.unidade, s.valor, s.qtde_execucao, s.subtotal_execucao
FROM scm s
WHERE s.servico IS NOT NULL AND s.servico != '';

-- 3. Drop item-specific columns from scm parent table
ALTER TABLE `scm`
  DROP COLUMN `unidade`,
  DROP COLUMN `valor`,
  DROP COLUMN `subtotal_execucao`,
  DROP COLUMN `qtde_execucao`,
  DROP COLUMN `servico`;
