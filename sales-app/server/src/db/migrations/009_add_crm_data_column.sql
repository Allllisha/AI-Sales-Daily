-- Add crm_data column to reports table to store CRM metadata
ALTER TABLE reports 
ADD COLUMN IF NOT EXISTS crm_data JSONB;

-- Add crm_data column to report_slots table
ALTER TABLE report_slots
ADD COLUMN IF NOT EXISTS crm_data JSONB;

-- Add index for better JSON query performance
CREATE INDEX IF NOT EXISTS idx_reports_crm_data ON reports USING GIN (crm_data);
CREATE INDEX IF NOT EXISTS idx_report_slots_crm_data ON report_slots USING GIN (crm_data);