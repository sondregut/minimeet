-- Migration: Fix field_attempts distance precision for large throws
-- The current NUMERIC(5,2) only allows up to 999.99 cm (9.99m)
-- Throws like javelin can reach 100m (10000cm), so we need more precision

-- Alter the distance column to allow larger values
-- NUMERIC(7,2) allows up to 99999.99 cm = 999.99m (more than enough)
ALTER TABLE field_attempts
ALTER COLUMN distance TYPE NUMERIC(7,2);

-- Also update field_results.best_mark if it has the same constraint
ALTER TABLE field_results
ALTER COLUMN best_mark TYPE NUMERIC(7,2);
