-- ============================================================
-- Migration 054: Adicionar coluna de intervalo ajustável à Troca de Filtros
-- Default 4 meses; ao editar data_troca o valor reseta para 4.
-- Coluna não entra no CSV.
-- ============================================================

ALTER TABLE filtro_trocas ADD COLUMN intervalo_meses TINYINT UNSIGNED NOT NULL DEFAULT 4 AFTER data_proxima_troca;
