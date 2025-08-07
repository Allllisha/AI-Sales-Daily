-- Migration: Unify date columns in reports table
-- This migration ensures both date columns have proper defaults and are synchronized

-- Set default values for both date columns
ALTER TABLE reports ALTER COLUMN date SET DEFAULT CURRENT_DATE;
ALTER TABLE reports ALTER COLUMN report_date SET DEFAULT CURRENT_DATE;

-- Ensure existing records have both dates synchronized
UPDATE reports SET date = report_date WHERE date IS NULL;
UPDATE reports SET report_date = date WHERE report_date IS NULL;
UPDATE reports SET date = report_date WHERE date != report_date;

-- Add check constraint to ensure dates are always in sync
-- ALTER TABLE reports ADD CONSTRAINT check_dates_match CHECK (date = report_date);

-- Note: In the future, we should remove one of these columns to avoid confusion
-- For now, we'll keep both for backward compatibility