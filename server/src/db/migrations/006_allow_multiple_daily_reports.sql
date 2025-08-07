-- Migration: Allow multiple reports per day for the same user
-- This enables users to create multiple reports when visiting different companies on the same day

-- 1. Drop the unique constraint that prevents multiple reports per day
ALTER TABLE reports DROP CONSTRAINT IF EXISTS reports_user_id_report_date_key;

-- 2. Add a sequence number column to differentiate multiple reports on the same day
ALTER TABLE reports ADD COLUMN IF NOT EXISTS daily_sequence INTEGER DEFAULT 1;

-- 3. Add a composite index for efficient querying
CREATE INDEX IF NOT EXISTS idx_reports_user_date_seq ON reports (user_id, report_date, daily_sequence);

-- 4. Add a comment to document the change
COMMENT ON COLUMN reports.daily_sequence IS 'Sequence number for multiple reports on the same day. Starts at 1 for the first report of the day.';

-- 5. Update existing reports to have sequence number 1 (if column was just added)
UPDATE reports SET daily_sequence = 1 WHERE daily_sequence IS NULL;

-- 6. Make daily_sequence NOT NULL after setting default values
ALTER TABLE reports ALTER COLUMN daily_sequence SET NOT NULL;