-- Migration 070: Solicitação de Compra (SC)
CREATE TABLE IF NOT EXISTS `solicitacao_compra` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `titulo_email` varchar(255) NOT NULL,
  `status` varchar(30) NOT NULL DEFAULT 'em_cotacao',
  `site` varchar(100) NOT NULL,
  `equipamento_id` int(11) DEFAULT NULL,
  `equipamento_texto` varchar(150) DEFAULT NULL,
  `numero_sc` varchar(50) DEFAULT NULL,
  `numero_pc` varchar(50) DEFAULT NULL,
  `numero_pv` varchar(50) DEFAULT NULL,
  `valor_sc` decimal(12,2) DEFAULT NULL,
  `data` date NOT NULL,
  `data_status` date NOT NULL,
  `sla_dias` int(11) DEFAULT NULL,
  `observacao` text DEFAULT NULL,
  `sla_notificado_em` datetime DEFAULT NULL,
  `sla_notificado_data_status` date DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_solicitacao_compra_sc` (`numero_sc`),
  KEY `idx_solicitacao_compra_status` (`status`),
  KEY `idx_solicitacao_compra_site` (`site`),
  KEY `idx_solicitacao_compra_data_status` (`data_status`),
  KEY `idx_solicitacao_compra_numero_pv` (`numero_pv`),
  CONSTRAINT `fk_solicitacao_compra_equipamento`
    FOREIGN KEY (`equipamento_id`) REFERENCES `equipamentos` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
