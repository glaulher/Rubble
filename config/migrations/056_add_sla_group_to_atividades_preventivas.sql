-- ============================================================
-- Migration 056: Adicionar sla_group_id para agrupar SLA
-- Permite somar qtd_executada por grupo e validar teto do site (ex: 8)
-- ============================================================

ALTER TABLE atividades_preventivas ADD COLUMN sla_group_id INT NULL AFTER sla_day_number;
ALTER TABLE atividades_preventivas ADD KEY idx_ap_sla_group (sla_group_id);
