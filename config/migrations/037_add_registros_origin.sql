-- Migration 037: Add origin column to registros
ALTER TABLE registros
  ADD COLUMN origin ENUM('ticket','planning') NOT NULL DEFAULT 'ticket'
  AFTER notificacao_enviada;
