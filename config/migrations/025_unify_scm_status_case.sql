-- Unify SCM status capitalization to lowercase to match PV item statuses
-- Part of the SCM→PV status sync feature
UPDATE scm SET status = LOWER(status) WHERE status LIKE 'SCM %';