-- ============================================================
-- Migration 055: Adicionar qtd_executada em atividades_preventivas
-- Quantidade de máquinas preventivadas quando status -> Em Andamento / Concluído
-- Regra de negócio (validação) fica no Service, não no Repository
-- ============================================================

ALTER TABLE atividades_preventivas ADD COLUMN qtd_executada INT UNSIGNED NULL AFTER status;
