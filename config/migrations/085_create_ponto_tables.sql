-- Migration: Criar tabelas do módulo Gestão de Horas (Ponto)
-- Data: 2026-11-17

CREATE TABLE IF NOT EXISTS `ponto_uploads` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `nome_arquivo` varchar(255) NOT NULL,
  `total_colaboradores` int(11) DEFAULT 0,
  `total_registros` int(11) DEFAULT 0,
  `status` varchar(50) DEFAULT 'CONCLUIDO',
  `created_at` datetime DEFAULT current_timestamp(),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `ponto_colaboradores` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `matricula` varchar(50) NOT NULL,
  `nome` varchar(255) NOT NULL,
  `cc` varchar(100) DEFAULT NULL,
  `funcao` varchar(150) DEFAULT NULL,
  `turno` varchar(100) DEFAULT NULL,
  `created_at` datetime DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_ponto_colaborador_matricula` (`matricula`),
  KEY `idx_ponto_colaborador_nome` (`nome`),
  KEY `idx_ponto_colaborador_cc` (`cc`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `ponto_registros` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `colaborador_id` int(11) NOT NULL,
  `data` date NOT NULL,
  `dia_semana` varchar(20) DEFAULT NULL,
  `e1` varchar(10) DEFAULT NULL,
  `s1` varchar(10) DEFAULT NULL,
  `e2` varchar(10) DEFAULT NULL,
  `s2` varchar(10) DEFAULT NULL,
  `e3` varchar(10) DEFAULT NULL,
  `s3` varchar(10) DEFAULT NULL,
  `e4` varchar(10) DEFAULT NULL,
  `s4` varchar(10) DEFAULT NULL,
  `he` varchar(10) DEFAULT NULL,
  `he_min` int(11) DEFAULT 0,
  `absent` varchar(10) DEFAULT NULL,
  `absent_min` int(11) DEFAULT 0,
  `jornada` varchar(50) DEFAULT NULL,
  `adnot` varchar(10) DEFAULT NULL,
  `observacao` text DEFAULT NULL,
  `status` varchar(50) DEFAULT 'OK',
  `upload_id` int(11) DEFAULT NULL,
  `created_at` datetime DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_ponto_colab_data` (`colaborador_id`, `data`),
  KEY `idx_ponto_registros_data` (`data`),
  KEY `idx_ponto_registros_he_min` (`he_min`),
  KEY `fk_ponto_registros_upload` (`upload_id`),
  CONSTRAINT `fk_ponto_registros_colab` FOREIGN KEY (`colaborador_id`) REFERENCES `ponto_colaboradores` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_ponto_registros_upload` FOREIGN KEY (`upload_id`) REFERENCES `ponto_uploads` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `ponto_banco_horas` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `colaborador_id` int(11) NOT NULL,
  `ciclo_inicio` date DEFAULT NULL,
  `ciclo_fim` date DEFAULT NULL,
  `saldo_anterior` varchar(15) DEFAULT NULL,
  `debito` varchar(15) DEFAULT NULL,
  `credito` varchar(15) DEFAULT NULL,
  `saldo_atual` varchar(15) DEFAULT NULL,
  `saldo_atual_min` int(11) DEFAULT 0,
  `dias_com_he` int(11) DEFAULT 0,
  `dias_com_ausencia` int(11) DEFAULT 0,
  `nome_gestor` varchar(150) DEFAULT NULL,
  `adm_responsavel` varchar(150) DEFAULT NULL,
  `observacao` text DEFAULT NULL,
  `updated_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_ponto_bh_colab_ciclo` (`colaborador_id`, `ciclo_inicio`),
  CONSTRAINT `fk_ponto_bh_colab` FOREIGN KEY (`colaborador_id`) REFERENCES `ponto_colaboradores` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `ponto_anotacoes_he` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `colaborador_id` int(11) NOT NULL,
  `data` date NOT NULL,
  `nome_gestor` varchar(150) DEFAULT NULL,
  `adm_responsavel` varchar(150) DEFAULT NULL,
  `sobreaviso` enum('Sim','Não','') DEFAULT '',
  `justificativa` text DEFAULT NULL,
  `updated_by` varchar(100) DEFAULT NULL,
  `updated_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_ponto_anotacao_colab_data` (`colaborador_id`, `data`),
  CONSTRAINT `fk_ponto_anotacao_colab` FOREIGN KEY (`colaborador_id`) REFERENCES `ponto_colaboradores` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
