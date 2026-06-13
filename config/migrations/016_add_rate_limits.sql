-- Migration 016: Generic rate limiting table
CREATE TABLE IF NOT EXISTS `rate_limits` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `ip_address` VARCHAR(45) NOT NULL,
    `endpoint` VARCHAR(100) NOT NULL,
    `window_start` DATETIME NOT NULL,
    `attempt_count` INT NOT NULL DEFAULT 1,
    UNIQUE KEY `uk_rate_limit` (`ip_address`, `endpoint`, `window_start`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
