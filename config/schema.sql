-- phpMyAdmin SQL Dump
-- version 5.2.3
-- https://www.phpmyadmin.net/
--
-- Host: localhost
-- Tempo de geração: 29/05/2026 às 21:13
-- Versão do servidor: 11.4.10-MariaDB
-- Versão do PHP: 8.5.6

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Banco de dados: `manutencao`
--

-- --------------------------------------------------------

--
-- Estrutura para tabela `civil_lpu`
--

CREATE TABLE `civil_lpu` (
  `id` int(11) NOT NULL,
  `numero_item` int(11) NOT NULL,
  `descricao` mediumtext DEFAULT NULL,
  `unidade` varchar(50) DEFAULT NULL,
  `valor` decimal(10,2) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estrutura para tabela `cron_controle`
--

CREATE TABLE `cron_controle` (
  `id` int(11) NOT NULL,
  `ultima_execucao` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estrutura para tabela `enderecos`
--

CREATE TABLE `enderecos` (
  `id` int(11) NOT NULL,
  `local_do_endereco` varchar(150) DEFAULT NULL,
  `endereco` varchar(255) DEFAULT NULL,
  `uf` varchar(2) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estrutura para tabela `equipamentos`
--

CREATE TABLE `equipamentos` (
  `id` int(11) NOT NULL,
  `local` varchar(100) DEFAULT NULL,
  `equipamento` varchar(100) DEFAULT NULL,
  `capacidade` decimal(10,2) DEFAULT NULL,
  `localidade` varchar(255) DEFAULT NULL,
  `endereco_id` int(11) DEFAULT NULL,
  `local_scm` varchar(100) DEFAULT NULL,
  `mercado` varchar(50) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estrutura para tabela `scm`
--

CREATE TABLE `scm` (
  `id` int(11) NOT NULL,
  `scm` varchar(100) NOT NULL,
  `data` date DEFAULT NULL,
  `atividade` text DEFAULT NULL,
  `site` varchar(100) DEFAULT NULL,
  `cidade` varchar(100) DEFAULT NULL,
  `abertura` varchar(100) DEFAULT NULL,
  `status` varchar(50) DEFAULT NULL,
  `data_execucao` date DEFAULT NULL,
  `data_validacao` date DEFAULT NULL,
  `medicao` varchar(100) DEFAULT NULL,
  `origem` varchar(100) DEFAULT NULL,
  `segmento` varchar(100) DEFAULT NULL,
  `obs` text DEFAULT NULL,
  `equipamento_id` int(11) DEFAULT NULL,
  `created_at` datetime DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estrutura para tabela `scm_items`
--

CREATE TABLE `scm_items` (
  `id` int(11) NOT NULL,
  `scm_id` int(11) NOT NULL,
  `servico` text DEFAULT NULL,
  `unidade` varchar(50) DEFAULT NULL,
  `valor` decimal(12,2) DEFAULT NULL,
  `qtde_execucao` decimal(12,3) DEFAULT NULL,
  `subtotal_execucao` decimal(12,2) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estrutura para tabela `material_chiller_lpu`
--

CREATE TABLE `material_chiller_lpu` (
  `id` int(11) NOT NULL,
  `numero_item` int(11) NOT NULL,
  `descricao` mediumtext DEFAULT NULL,
  `unidade` varchar(50) DEFAULT NULL,
  `valor` decimal(10,2) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estrutura para tabela `material_clima_lpu`
--

CREATE TABLE `material_clima_lpu` (
  `id` int(11) NOT NULL,
  `numero_item` int(11) NOT NULL,
  `descricao` mediumtext DEFAULT NULL,
  `unidade` varchar(50) DEFAULT NULL,
  `valor` decimal(10,2) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estrutura para tabela `pv`
--

CREATE TABLE `pv` (
  `id` int(11) NOT NULL,
  `numero_pv` varchar(10) NOT NULL,
  `data` date DEFAULT NULL,
  `ciclo` varchar(7) DEFAULT NULL,
  `local` varchar(255) NOT NULL,
  `obs` text DEFAULT NULL,
  `ral` varchar(100) DEFAULT NULL,
  `equipamento_id` int(11) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estrutura para tabela `pv_item`
--

CREATE TABLE `pv_item` (
  `id` int(11) NOT NULL,
  `pv_id` int(11) NOT NULL,
  `lpu_origem` varchar(50) DEFAULT NULL,
  `descricao_lpu` varchar(255) DEFAULT NULL,
  `descricao` varchar(255) DEFAULT NULL,
  `numero_item` int(11) DEFAULT NULL,
  `quantidade` decimal(10,2) DEFAULT NULL,
  `valor` decimal(10,2) DEFAULT NULL,
  `valor_total` decimal(10,2) DEFAULT NULL,
  `bdi` decimal(5,2) DEFAULT NULL,
  `valor_flpu` decimal(10,2) DEFAULT NULL,
  `fatura` enum('flpu','lpu') DEFAULT NULL,
  `scm` varchar(100) DEFAULT NULL,
  `laudo` varchar(30) DEFAULT NULL,
  `status` varchar(50) NOT NULL DEFAULT 'Aguardando envio',
  `orcamento` varchar(500) DEFAULT NULL,
  `filtro_data` text DEFAULT NULL COMMENT 'JSON com dados do calculo de filtro'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estrutura para tabela `pv_os`
--

CREATE TABLE `pv_os` (
  `pv_id` int(11) NOT NULL,
  `registro_id` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estrutura para tabela `registros`
--

CREATE TABLE `registros` (
  `id` int(11) NOT NULL,
  `os` varchar(50) DEFAULT NULL,
  `data` date DEFAULT NULL,
  `equipe` varchar(100) DEFAULT NULL,
  `obs` mediumtext DEFAULT NULL,
  `material` varchar(50) DEFAULT NULL,
  `status` varchar(50) DEFAULT NULL,
  `data_concluido` date DEFAULT NULL,
  `equipamento_id` int(11) DEFAULT NULL,
  `notificacao_enviada` tinyint(1) DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estrutura para tabela `servico_chiller_lpu`
--

CREATE TABLE `servico_chiller_lpu` (
  `id` int(11) NOT NULL,
  `numero_item` int(11) NOT NULL,
  `descricao` mediumtext DEFAULT NULL,
  `unidade` varchar(50) DEFAULT NULL,
  `valor` decimal(10,2) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estrutura para tabela `servico_clima_lpu`
--

CREATE TABLE `servico_clima_lpu` (
  `id` int(11) NOT NULL,
  `numero_item` int(11) NOT NULL,
  `descricao` mediumtext DEFAULT NULL,
  `unidade` varchar(50) DEFAULT NULL,
  `valor` decimal(10,2) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estrutura para tabela `usuarios`
--

CREATE TABLE `usuarios` (
  `id` int(11) NOT NULL,
  `username` varchar(50) NOT NULL,
  `password` varchar(255) NOT NULL,
  `nome` varchar(100) NOT NULL,
  `role` enum('admin','supervisor','coordenador','cliente') NOT NULL DEFAULT 'cliente',
  `created_at` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Índices para tabelas despejadas
--

--
-- Índices de tabela `civil_lpu`
--
ALTER TABLE `civil_lpu`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `numero_item` (`numero_item`);

--
-- Índices de tabela `cron_controle`
--
ALTER TABLE `cron_controle`
  ADD PRIMARY KEY (`id`);

--
-- Índices de tabela `enderecos`
--
ALTER TABLE `enderecos`
  ADD PRIMARY KEY (`id`);

--
-- Índices de tabela `equipamentos`
--
ALTER TABLE `equipamentos`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_equipamentos_endereco` (`endereco_id`);

--
-- Índices de tabela `material_chiller_lpu`
--
ALTER TABLE `material_chiller_lpu`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `numero_item` (`numero_item`);

--
-- Índices de tabela `material_clima_lpu`
--
ALTER TABLE `material_clima_lpu`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `numero_item` (`numero_item`);

--
-- Índices de tabela `pv`
--
ALTER TABLE `pv`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `numero_pv` (`numero_pv`),
  ADD KEY `equipamento_id` (`equipamento_id`),
  ADD KEY `idx_pv_local` (`local`),
  ADD KEY `idx_pv_ciclo` (`ciclo`);

--
-- Índices de tabela `pv_item`
--
ALTER TABLE `pv_item`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_pv_item_pv` (`pv_id`),
  ADD KEY `idx_pv_item_status` (`status`);

--
-- Índices de tabela `pv_os`
--
ALTER TABLE `pv_os`
  ADD PRIMARY KEY (`pv_id`,`registro_id`),
  ADD KEY `idx_pv_os_registro` (`registro_id`);

--
-- Índices de tabela `registros`
--
ALTER TABLE `registros`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `idx_registros_os` (`os`),
  ADD KEY `idx_registros_equipamento_id` (`equipamento_id`),
  ADD KEY `idx_registros_status` (`status`),
  ADD KEY `idx_registros_data` (`data`);

--
-- Índices de tabela `servico_chiller_lpu`
--
ALTER TABLE `servico_chiller_lpu`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `numero_item` (`numero_item`);

--
-- Índices de tabela `servico_clima_lpu`
--
ALTER TABLE `servico_clima_lpu`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `numero_item` (`numero_item`);

--
-- Índices de tabela `usuarios`
--
ALTER TABLE `usuarios`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `username` (`username`);

--
-- AUTO_INCREMENT para tabelas despejadas
--

--
-- AUTO_INCREMENT de tabela `civil_lpu`
--
ALTER TABLE `civil_lpu`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de tabela `cron_controle`
--
ALTER TABLE `cron_controle`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de tabela `enderecos`
--
ALTER TABLE `enderecos`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de tabela `equipamentos`
--
ALTER TABLE `equipamentos`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de tabela `material_chiller_lpu`
--
ALTER TABLE `material_chiller_lpu`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de tabela `material_clima_lpu`
--
ALTER TABLE `material_clima_lpu`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de tabela `pv`
--
ALTER TABLE `pv`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de tabela `pv_item`
--
ALTER TABLE `pv_item`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de tabela `registros`
--
ALTER TABLE `registros`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de tabela `servico_chiller_lpu`
--
ALTER TABLE `servico_chiller_lpu`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de tabela `servico_clima_lpu`
--
ALTER TABLE `servico_clima_lpu`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de tabela `usuarios`
--
ALTER TABLE `usuarios`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

-- --------------------------------------------------------

--
-- Estrutura para tabela `login_attempts`
--

CREATE TABLE `login_attempts` (
  `id` int(11) NOT NULL,
  `ip_address` varchar(45) NOT NULL,
  `attempted_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `success` tinyint(1) NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Índices de tabela `login_attempts`
--
ALTER TABLE `login_attempts`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_login_attempts_ip_time` (`ip_address`, `attempted_at`);

--
-- AUTO_INCREMENT de tabela `login_attempts`
--
ALTER TABLE `login_attempts`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- Restrições para tabelas despejadas
--

--
-- Restrições para tabelas `equipamentos`
--
ALTER TABLE `equipamentos`
  ADD CONSTRAINT `fk_equipamentos_endereco` FOREIGN KEY (`endereco_id`) REFERENCES `enderecos` (`id`);

--
-- Restrições para tabelas `pv`
--
ALTER TABLE `pv`
  ADD CONSTRAINT `pv_ibfk_1` FOREIGN KEY (`equipamento_id`) REFERENCES `equipamentos` (`id`);

--
-- Restrições para tabelas `pv_item`
--
ALTER TABLE `pv_item`
  ADD CONSTRAINT `fk_pv_item_pv` FOREIGN KEY (`pv_id`) REFERENCES `pv` (`id`) ON DELETE CASCADE;

--
-- Restrições para tabelas `pv_os`
--
ALTER TABLE `pv_os`
  ADD CONSTRAINT `fk_pv_os_pv` FOREIGN KEY (`pv_id`) REFERENCES `pv` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_pv_os_registro` FOREIGN KEY (`registro_id`) REFERENCES `registros` (`id`);

--
-- Índices de tabela `scm`
--
ALTER TABLE `scm`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `idx_scm_code` (`scm`),
  ADD KEY `idx_scm_equipamento` (`equipamento_id`),
  ADD KEY `idx_scm_status` (`status`),
  ADD KEY `idx_scm_site` (`site`);

--
-- AUTO_INCREMENT de tabela `scm`
--
ALTER TABLE `scm`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- Restrições para tabelas `scm`
--
ALTER TABLE `scm`
  ADD CONSTRAINT `fk_scm_equipamento` FOREIGN KEY (`equipamento_id`) REFERENCES `equipamentos` (`id`) ON DELETE SET NULL;

--
-- Índices de tabela `scm_items`
--
ALTER TABLE `scm_items`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_scm_items_scm_id` (`scm_id`);

--
-- AUTO_INCREMENT de tabela `scm_items`
--
ALTER TABLE `scm_items`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- Restrições para tabelas `scm_items`
--
ALTER TABLE `scm_items`
  ADD CONSTRAINT `fk_scm_items_scm` FOREIGN KEY (`scm_id`) REFERENCES `scm` (`id`) ON DELETE CASCADE;

-- --------------------------------------------------------

--
-- Estrutura para tabela `rate_limits`
--

CREATE TABLE `rate_limits` (
  `id` int(11) NOT NULL,
  `ip_address` varchar(45) NOT NULL,
  `endpoint` varchar(100) NOT NULL,
  `window_start` datetime NOT NULL,
  `attempt_count` int(11) NOT NULL DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Índices de tabela `rate_limits`
--
ALTER TABLE `rate_limits`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uk_rate_limit` (`ip_address`, `endpoint`, `window_start`);

--
-- AUTO_INCREMENT de tabela `rate_limits`
--
ALTER TABLE `rate_limits`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
