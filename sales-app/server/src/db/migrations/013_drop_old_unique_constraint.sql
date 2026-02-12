-- Migration: Drop the old unique constraint that prevents multiple reports per day
-- This fixes the duplicate key error when creating multiple reports on the same day

-- Drop the old constraint if it exists (different name)
ALTER TABLE reports DROP CONSTRAINT IF EXISTS reports_user_id_date_key;

-- Ensure we have the daily_sequence column and proper indexing
ALTER TABLE reports ADD COLUMN IF NOT EXISTS daily_sequence INTEGER DEFAULT 1;

-- Create a composite index for efficient querying if not exists
CREATE INDEX IF NOT EXISTS idx_reports_user_date_seq ON reports (user_id, report_date, daily_sequence);

-- Update any NULL values to 1
UPDATE reports SET daily_sequence = 1 WHERE daily_sequence IS NULL;

-- Make daily_sequence NOT NULL
ALTER TABLE reports ALTER COLUMN daily_sequence SET NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN reports.daily_sequence IS 'Sequence number for multiple reports on the same day. Starts at 1 for the first report of the day.';