-- Phase 1: Add CRM integration columns to reports table
ALTER TABLE reports 
ADD COLUMN IF NOT EXISTS crm_linked BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS crm_type VARCHAR(50), -- 'salesforce' or 'dynamics365'
ADD COLUMN IF NOT EXISTS last_sync_date TIMESTAMP,
ADD COLUMN IF NOT EXISTS sync_status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'synced', 'failed'
ADD COLUMN IF NOT EXISTS sync_error TEXT;

-- Phase 1: Create CRM sync history table
CREATE TABLE IF NOT EXISTS crm_sync_history (
  id SERIAL PRIMARY KEY,
  report_id INTEGER REFERENCES reports(id) ON DELETE CASCADE,
  crm_type VARCHAR(50) NOT NULL,
  sync_type VARCHAR(50) NOT NULL, -- 'create', 'update', 'append', 'link'
  sync_direction VARCHAR(50) NOT NULL, -- 'to_crm', 'from_crm'
  sync_data JSONB,
  sync_result JSONB,
  sync_status VARCHAR(50) DEFAULT 'pending',
  error_message TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP
);

-- Phase 2: Create CRM mapping table for search/linking
CREATE TABLE IF NOT EXISTS crm_mappings (
  id SERIAL PRIMARY KEY,
  report_id INTEGER REFERENCES reports(id) ON DELETE CASCADE,
  crm_type VARCHAR(50) NOT NULL,
  crm_account_id VARCHAR(255),
  crm_account_name VARCHAR(500),
  crm_opportunity_id VARCHAR(255),
  crm_opportunity_name VARCHAR(500),
  crm_activity_id VARCHAR(255),
  crm_note_id VARCHAR(255),
  mapping_type VARCHAR(50), -- 'manual', 'auto', 'suggested'
  confidence_score FLOAT, -- for duplicate detection
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(report_id, crm_type)
);

-- Phase 3: Create auto-sync configuration table
CREATE TABLE IF NOT EXISTS crm_sync_config (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  crm_type VARCHAR(50) NOT NULL,
  auto_sync_enabled BOOLEAN DEFAULT FALSE,
  sync_frequency VARCHAR(50) DEFAULT 'daily', -- 'realtime', 'hourly', 'daily', 'weekly'
  sync_time TIME DEFAULT '02:00:00',
  conflict_resolution VARCHAR(50) DEFAULT 'manual', -- 'manual', 'crm_priority', 'report_priority', 'newest'
  last_sync_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, crm_type)
);

-- Phase 3: Create conflict resolution table
CREATE TABLE IF NOT EXISTS crm_sync_conflicts (
  id SERIAL PRIMARY KEY,
  report_id INTEGER REFERENCES reports(id) ON DELETE CASCADE,
  field_name VARCHAR(100),
  report_value TEXT,
  crm_value TEXT,
  resolution VARCHAR(50), -- 'use_report', 'use_crm', 'merged', 'pending'
  resolved_value TEXT,
  resolved_by INTEGER REFERENCES users(id),
  resolved_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_reports_crm_linked ON reports(crm_linked);
CREATE INDEX IF NOT EXISTS idx_reports_sync_status ON reports(sync_status);
CREATE INDEX IF NOT EXISTS idx_crm_sync_history_report_id ON crm_sync_history(report_id);
CREATE INDEX IF NOT EXISTS idx_crm_sync_history_status ON crm_sync_history(sync_status);
CREATE INDEX IF NOT EXISTS idx_crm_mappings_report_id ON crm_mappings(report_id);
CREATE INDEX IF NOT EXISTS idx_crm_sync_conflicts_report_id ON crm_sync_conflicts(report_id);

-- Add triggers for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_crm_mappings_updated_at BEFORE UPDATE ON crm_mappings
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_crm_sync_config_updated_at BEFORE UPDATE ON crm_sync_config
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();