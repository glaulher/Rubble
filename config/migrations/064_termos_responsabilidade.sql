-- Migration 064: Termos de Responsabilidade e Cautela com Assinatura Digital
CREATE TABLE IF NOT EXISTS `termos_responsabilidade` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `codigo` VARCHAR(30) NOT NULL UNIQUE,
  `emissor_id` INT NULL,
  `entregue_por` VARCHAR(100) NOT NULL,
  `tecnico_nome` VARCHAR(100) NOT NULL,
  `tecnico_documento` VARCHAR(30) NULL,
  `tecnico_telefone` VARCHAR(25) NULL,
  `status` ENUM('pendente', 'assinado', 'devolvido_parcial', 'devolvido', 'cancelado') NOT NULL DEFAULT 'pendente',
  `token_assinatura` VARCHAR(64) NOT NULL UNIQUE,
  `token_expira_em` DATETIME NOT NULL,
  `assinatura_imagem` LONGTEXT NULL,
  `assinado_em` DATETIME NULL,
  `assinado_ip` VARCHAR(45) NULL,
  `assinado_user_agent` TEXT NULL,
  `observacoes` TEXT NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_termos_status` (`status`),
  INDEX `idx_termos_token` (`token_assinatura`),
  INDEX `idx_termos_tecnico` (`tecnico_nome`),
  INDEX `idx_termos_codigo` (`codigo`),
  CONSTRAINT `fk_termos_emissor` FOREIGN KEY (`emissor_id`) REFERENCES `usuarios` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `termo_itens` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `termo_id` INT NOT NULL,
  `inventario_id` INT NULL,
  `material_nome` VARCHAR(150) NOT NULL,
  `modelo` VARCHAR(100) NOT NULL,
  `serial` VARCHAR(100) NOT NULL,
  `status_item` ENUM('em_posse', 'devolvido') NOT NULL DEFAULT 'em_posse',
  `data_devolucao` DATE NULL,
  `observacao_devolucao` TEXT NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_termo_itens_termo` (`termo_id`),
  INDEX `idx_termo_itens_inventario` (`inventario_id`),
  CONSTRAINT `fk_termo_itens_termo` FOREIGN KEY (`termo_id`) REFERENCES `termos_responsabilidade` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_termo_itens_inventario` FOREIGN KEY (`inventario_id`) REFERENCES `inventario` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
