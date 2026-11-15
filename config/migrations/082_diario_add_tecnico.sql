-- Migration 082: Adicionar coluna tecnico à tabela diario_atividades

ALTER TABLE `diario_atividades`
  ADD COLUMN IF NOT EXISTS `tecnico` VARCHAR(100) NULL DEFAULT NULL AFTER `equipe`;

ALTER TABLE `diario_atividades`
  ADD INDEX IF NOT EXISTS `idx_diario_tecnico` (`tecnico`);
