-- Migration 023: Atualizar capacidades RJOFRG + popular equipamento_precos
-- Rode no servidor: docker exec -i rubble-db mariadb -u root -pSENHA manutencao < config/migrations/023_rjofrg_capacity_and_pricing.sql

-- ============================================================
-- 1. Atualizar capacidades dos equipamentos de RJOFRG
-- ============================================================

-- SALA DE MONITORAÇÃO: SELF 01 e 02 → 10 TR
UPDATE equipamentos SET capacidade = 10.00 WHERE local = 'RJOFRG' AND equipamento = 'SELF 01' AND localidade = 'SALA DE MONITORAÇÃO';
UPDATE equipamentos SET capacidade = 10.00 WHERE local = 'RJOFRG' AND equipamento = 'SELF 02' AND localidade = 'SALA DE MONITORAÇÃO';

-- TÉRREO/COBERTUA/SALA DE NO-BREAK: SELF SPLIT 01 e 02 → 12.50 TR
UPDATE equipamentos SET capacidade = 12.50 WHERE local = 'RJOFRG' AND equipamento = 'SELF SPLIT 01' AND localidade LIKE 'TÉRREO%';
UPDATE equipamentos SET capacidade = 12.50 WHERE local = 'RJOFRG' AND equipamento = 'SELF SPLIT 02' AND localidade LIKE 'TÉRREO%';

-- SALA DE CLIMATIZAÇÃO 2.ANDAR: SELF 01-06 → 15 TR
UPDATE equipamentos SET capacidade = 15.00 WHERE local = 'RJOFRG' AND equipamento IN ('SELF 01','SELF 02','SELF 03','SELF 04','SELF 05','SELF 06') AND localidade LIKE 'SALA DE CLIMATIZAÇÃO - 2.ANDAR%';

-- SALA DE CLIMATIZAÇÃO CONTAINER: STULZ 01-06 → 11.30 TR
UPDATE equipamentos SET capacidade = 11.30 WHERE local = 'RJOFRG' AND equipamento IN ('STULZ 01','STULZ 02','STULZ 03','STULZ 04','STULZ 05','STULZ 06');

-- SUBESTAÇÃO: WM 01 e 02 → 5 TR
UPDATE equipamentos SET capacidade = 5.00 WHERE local = 'RJOFRG' AND equipamento IN ('WM 01', 'WM 02') AND localidade = 'SUBESTAÇÃO';

-- ============================================================
-- 2. Popular equipamento_precos (INSERT IGNORE previne duplicação)
-- ============================================================

CREATE TABLE IF NOT EXISTS equipamento_precos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(50) NOT NULL,
    equipamento_pattern VARCHAR(100) DEFAULT NULL,
    locais_especiais TEXT DEFAULT NULL,
    mercado VARCHAR(50) DEFAULT NULL,
    valor DECIMAL(12,2) NOT NULL,
    ativo TINYINT(1) DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO equipamento_precos (nome, equipamento_pattern, locais_especiais, mercado, valor) VALUES
('tr', NULL, NULL, 'Residencial', 94.00),
('chiller', '%chiller%', NULL, 'Empresarial', 3642.14),
('chiller_especial', '%chiller%', 'MCEBC,RJDQC91,TNGBR,CPSCL', NULL, 3850.00),
('chiller', '%chiller%', NULL, 'Pessoal', 3642.14);
