-- Migration 022: Tabela de preços de equipamentos
-- Armazena regras de precificação (TR residencial, chiller padrão, chiller especial)

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

-- Dados seed: 3 regras de precificação (INSERT IGNORE previne duplicação)
INSERT IGNORE INTO equipamento_precos (nome, equipamento_pattern, locais_especiais, mercado, valor) VALUES
('tr', NULL, NULL, 'Residencial', 94.00),
('chiller', '%chiller%', NULL, NULL, 3642.14),
('chiller_especial', '%chiller%', 'MCEBC,RJDQC91,TNGBR,CPSCL', NULL, 3850.00);
