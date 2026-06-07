-- Migration 024: Add indexes for home page performance (Fase 2.3)
-- Idempotent: safe to re-run on server.
-- Rode no servidor: docker exec -i rubble-db mariadb -u root -pSENHA manutencao < config/migrations/024_add_home_indexes.sql

-- ============================================================
-- equipamentos
-- ============================================================
-- Composite index for ORDER BY e.local, e.equipamento + WHERE e.local = ?
CREATE INDEX IF NOT EXISTS idx_equipamentos_local_equipamento ON equipamentos (local, equipamento);

-- Index for SCM import matching
CREATE INDEX IF NOT EXISTS idx_equipamentos_local_scm ON equipamentos (local_scm);

-- Index for pricing queries (WHERE e.mercado = ?)
CREATE INDEX IF NOT EXISTS idx_equipamentos_mercado ON equipamentos (mercado);

-- FULLTEXT for search (e.local LIKE, e.equipamento LIKE, e.localidade LIKE)
ALTER TABLE equipamentos ADD FULLTEXT INDEX IF NOT EXISTS ft_equipamentos_search (local, equipamento, localidade);

-- ============================================================
-- enderecos
-- ============================================================
-- Index for SCM fallback matching and search (LIKE on local_do_endereco)
CREATE INDEX IF NOT EXISTS idx_enderecos_local_do_endereco ON enderecos (local_do_endereco);

-- ============================================================
-- registros
-- ============================================================
-- Composite index for EXISTS subquery in search (r.status, r.obs, r.material, r.os)
-- This is a covering index for the search subquery
CREATE INDEX IF NOT EXISTS idx_registros_equipamento_search ON registros (equipamento_id, status, os);
