-- Add array support for multiple values in slots
-- Migration to update report_slots table to support arrays

-- Backup existing data structure
CREATE TEMP TABLE temp_slots AS SELECT * FROM report_slots;

-- Update columns to support arrays
ALTER TABLE report_slots 
ALTER COLUMN next_action TYPE TEXT[] USING CASE WHEN next_action IS NOT NULL THEN ARRAY[next_action] ELSE NULL END,
ALTER COLUMN issues TYPE TEXT[] USING CASE WHEN issues IS NOT NULL THEN ARRAY[issues] ELSE NULL END,
ALTER COLUMN project TYPE TEXT[] USING CASE WHEN project IS NOT NULL THEN ARRAY[project] ELSE NULL END;

-- Data conversion is handled in the ALTER COLUMN statement above

-- Add comment to document the change
COMMENT ON COLUMN report_slots.next_action IS 'Array of next actions';
COMMENT ON COLUMN report_slots.issues IS 'Array of issues/risks';
COMMENT ON COLUMN report_slots.project IS 'Array of project names';
COMMENT ON COLUMN report_slots.participants IS 'Array of meeting participants';