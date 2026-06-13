CREATE TABLE IF NOT EXISTS usuarios (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    username    VARCHAR(50)  NOT NULL UNIQUE,
    password    VARCHAR(255) NOT NULL,
    nome        VARCHAR(100) NOT NULL,
    role        ENUM('admin','supervisor','coordenador','cliente') NOT NULL DEFAULT 'cliente',
    created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Inserir usuário admin inicial
INSERT INTO usuarios (username, password, nome, role)
VALUES ('glaulher@admin', '$2a$12$zFGL08dX2fwyf9k.xy/vN.dDDaIk//RLa4o1jeoUFjrTT.xIAB4ky', 'glaulher@admin', 'admin')
ON DUPLICATE KEY UPDATE nome = VALUES(nome), password = VALUES(password);
