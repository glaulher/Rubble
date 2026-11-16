-- Migration 083: Backfill tecnico and placa in diario_atividades based on equipes

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
