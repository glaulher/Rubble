-- Adds SCM number column to preventive_cycle_items for SCM validation

ALTER TABLE preventive_cycle_items
  ADD COLUMN scm_number VARCHAR(100) DEFAULT NULL AFTER observacao;

CREATE INDEX idx_pci_scm_number ON preventive_cycle_items (scm_number);
