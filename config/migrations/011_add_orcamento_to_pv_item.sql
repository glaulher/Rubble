-- Migration 011: Add orcamento column to pv_item
ALTER TABLE pv_item ADD COLUMN orcamento VARCHAR(500) DEFAULT NULL;
