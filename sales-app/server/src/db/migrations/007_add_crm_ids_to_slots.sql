-- Add CRM ID columns to report_slots table
ALTER TABLE report_slots 
ADD COLUMN IF NOT EXISTS dynamics365_account_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS dynamics365_opportunity_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS salesforce_account_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS salesforce_opportunity_id VARCHAR(255);

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_report_slots_dynamics365_account_id ON report_slots(dynamics365_account_id);
CREATE INDEX IF NOT EXISTS idx_report_slots_dynamics365_opportunity_id ON report_slots(dynamics365_opportunity_id);
CREATE INDEX IF NOT EXISTS idx_report_slots_salesforce_account_id ON report_slots(salesforce_account_id);
CREATE INDEX IF NOT EXISTS idx_report_slots_salesforce_opportunity_id ON report_slots(salesforce_opportunity_id);