-- Migration 083: Backfill tecnico and placa in diario_atividades based on equipes

-- 0. Garantir que as colunas existam (caso a migration 082/081 não tenha sido executada previamente)
ALTER TABLE `diario_atividades`
  ADD COLUMN IF NOT EXISTS `tecnico` VARCHAR(100) NULL DEFAULT NULL AFTER `equipe`;

ALTER TABLE `diario_atividades`
  ADD COLUMN IF NOT EXISTS `placa` VARCHAR(30) NULL DEFAULT NULL AFTER `equipe`;

ALTER TABLE `diario_atividades`
  ADD INDEX IF NOT EXISTS `idx_diario_tecnico` (`tecnico`);

ALTER TABLE `diario_atividades`
  ADD INDEX IF NOT EXISTS `idx_diario_placa` (`placa`);

-- 1. Exact match with equipes table
UPDATE diario_atividades d
JOIN equipes e ON d.equipe = e.nome
SET d.tecnico = e.tecnico,
    d.placa = e.placa
WHERE (d.tecnico IS NULL OR d.placa IS NULL)
  AND e.tecnico IS NOT NULL;

-- 2. Handle known variants in existing records (e.g., Mauro Batista)
UPDATE diario_atividades
SET tecnico = 'MAURO BATISTA DA SILVA',
    placa = 'TBO-9J62'
WHERE (tecnico IS NULL OR placa IS NULL)
  AND (equipe LIKE '%Mauro Batista%' OR equipe = 'Mauro');
