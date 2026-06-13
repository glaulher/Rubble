-- Migration 018: Fix usuarios collation to match other tables
ALTER TABLE `usuarios`
    CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
