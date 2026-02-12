-- Add AI suggestions column to reports table
ALTER TABLE reports ADD COLUMN IF NOT EXISTS ai_suggestions JSONB;

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_reports_ai_suggestions ON reports USING gin(ai_suggestions);

-- Add comment
COMMENT ON COLUMN reports.ai_suggestions IS 'AI-generated suggestions for next meeting topics';
