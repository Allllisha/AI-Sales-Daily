-- Add industry field to report_slots table
ALTER TABLE report_slots ADD COLUMN industry TEXT;

-- Add constraint to prevent {} and [] characters in industry field
ALTER TABLE report_slots ADD CONSTRAINT check_industry_no_brackets CHECK (industry !~ '[{}[\]]');

-- Add comment to explain the field
COMMENT ON COLUMN report_slots.industry IS 'Customer industry inferred from conversation context by AI';