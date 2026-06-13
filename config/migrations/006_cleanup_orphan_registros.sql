-- Migration 006: Remove orphan registros (not linked to valid equipment)
-- Only targets registros with status containing "Conclu" (completed)
-- Also cleans up pv_os references to avoid FK ON DELETE RESTRICT violation
-- Idempotent: safe to run multiple times.

START TRANSACTION;

DROP TEMPORARY TABLE IF EXISTS tmp_orphan_ids;

CREATE TEMPORARY TABLE tmp_orphan_ids AS
SELECT r.id
FROM registros r
LEFT JOIN equipamentos e ON e.id = r.equipamento_id AND e.equipamento != 'N/A'
WHERE r.status LIKE '%Conclu%'
  AND (r.equipamento_id IS NULL OR e.id IS NULL);

DELETE FROM pv_os WHERE registro_id IN (SELECT id FROM tmp_orphan_ids);

DELETE FROM registros WHERE id IN (SELECT id FROM tmp_orphan_ids);

DROP TEMPORARY TABLE IF EXISTS tmp_orphan_ids;

COMMIT;
