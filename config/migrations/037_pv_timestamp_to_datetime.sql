-- Migration 037: Convert pv.created_at and pv.updated_at from TIMESTAMP to DATETIME
-- TIMESTAMP has a 2038 year-2038 problem and is less portable.
-- DATETIME is the preferred type for audit/creation timestamps.

ALTER TABLE `pv`
  MODIFY `created_at` datetime NULL DEFAULT current_timestamp(),
  MODIFY `updated_at` datetime NULL DEFAULT current_timestamp() ON UPDATE current_timestamp();
