-- Migration 081: Expand categories and add hora_inicio, hora_saida, placa to diario_atividades

ALTER TABLE `diario_atividades` 
  MODIFY COLUMN `categoria` ENUM('corretiva','preventiva','emergencial','administrativa') DEFAULT NULL;

ALTER TABLE `diario_atividades` 
  ADD COLUMN IF NOT EXISTS `hora_inicio` TIME NULL DEFAULT NULL AFTER `data`,
  ADD COLUMN IF NOT EXISTS `hora_saida` TIME NULL DEFAULT NULL AFTER `hora_inicio`,
  ADD COLUMN IF NOT EXISTS `placa` VARCHAR(30) NULL DEFAULT NULL AFTER `equipe`;

ALTER TABLE `diario_atividades`
  ADD INDEX IF NOT EXISTS `idx_diario_placa` (`placa`);
