-- Fix: tickets created before the planned activity system were saved with
-- tipo='preventiva' because TicketRepository::save() did not include the
-- tipo column (MySQL used the DEFAULT 'preventiva' from migration 038).
-- Records with origin='planning' are genuinely preventiva (created via
-- PlannedActivityRepository). All others should be corretiva.

UPDATE registros
SET tipo = 'corretiva'
WHERE tipo = 'preventiva'
  AND (origin IS NULL OR origin != 'planning');
