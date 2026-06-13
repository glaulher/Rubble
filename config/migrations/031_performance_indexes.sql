-- Migration 031: Performance indexes for PV and SCM queries
-- Adds composite index for pv_item(pv_id, status) used in EXISTS subqueries
-- Adds index for pv_item(scm) used in SCM JOIN conditions

CREATE INDEX idx_pv_item_pv_status ON pv_item (pv_id, status);
CREATE INDEX idx_pv_item_scm ON pv_item (scm);
