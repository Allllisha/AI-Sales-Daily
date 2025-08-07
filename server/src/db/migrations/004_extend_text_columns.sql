-- Migration: Extend text columns to handle longer content
-- This migration expands character limits for columns that may contain long text

-- Extend report_slots columns to TEXT type for unlimited length
ALTER TABLE report_slots ALTER COLUMN budget TYPE TEXT;
ALTER TABLE report_slots ALTER COLUMN schedule TYPE TEXT;
ALTER TABLE report_slots ALTER COLUMN industry TYPE TEXT;
ALTER TABLE report_slots ALTER COLUMN customer TYPE TEXT;
ALTER TABLE report_slots ALTER COLUMN project TYPE TEXT;
ALTER TABLE report_slots ALTER COLUMN participants TYPE TEXT;
ALTER TABLE report_slots ALTER COLUMN location TYPE TEXT;
ALTER TABLE report_slots ALTER COLUMN issues TYPE TEXT;
ALTER TABLE report_slots ALTER COLUMN next_action TYPE TEXT;
ALTER TABLE report_slots ALTER COLUMN personal_info TYPE TEXT;
ALTER TABLE report_slots ALTER COLUMN relationship_notes TYPE TEXT;

-- Extend reports columns for mode and status
ALTER TABLE reports ALTER COLUMN mode TYPE VARCHAR(100);
ALTER TABLE reports ALTER COLUMN status TYPE VARCHAR(100);
ALTER TABLE reports ALTER COLUMN customer TYPE TEXT;
ALTER TABLE reports ALTER COLUMN project TYPE TEXT;
ALTER TABLE reports ALTER COLUMN participants TYPE TEXT;
ALTER TABLE reports ALTER COLUMN location TYPE TEXT;
ALTER TABLE reports ALTER COLUMN budget TYPE TEXT;
ALTER TABLE reports ALTER COLUMN schedule TYPE TEXT;
ALTER TABLE reports ALTER COLUMN next_action TYPE TEXT;
ALTER TABLE reports ALTER COLUMN issues TYPE TEXT;
ALTER TABLE reports ALTER COLUMN personal_info TYPE TEXT;
ALTER TABLE reports ALTER COLUMN relationship_notes TYPE TEXT;

-- Extend report_qa columns for longer questions and answers
ALTER TABLE report_qa ALTER COLUMN question TYPE TEXT;
ALTER TABLE report_qa ALTER COLUMN answer TYPE TEXT;