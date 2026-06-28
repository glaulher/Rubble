CREATE TABLE IF NOT EXISTS user_activity (
    user_id INT NOT NULL PRIMARY KEY,
    username VARCHAR(50) NOT NULL,
    nome VARCHAR(100) NOT NULL,
    role VARCHAR(20) NOT NULL,
    last_activity DATETIME NOT NULL,
    ip_address VARCHAR(45) DEFAULT NULL,
    INDEX idx_user_activity (last_activity)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
