CREATE TABLE IF NOT EXISTS atividades_preventivas (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    site            VARCHAR(100) NOT NULL,
    data_planejada  DATE NOT NULL,
    ticket          VARCHAR(50),
    equipe          VARCHAR(100),
    status          VARCHAR(50) NOT NULL DEFAULT 'Planejado',
    obs             TEXT,
    created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
