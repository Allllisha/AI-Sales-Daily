-- CRM統合機能のテーブル作成

-- ユーザーのCRMトークン管理テーブル
CREATE TABLE IF NOT EXISTS user_crm_tokens (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  crm_type VARCHAR(20) NOT NULL, -- 'salesforce' or 'dynamics365'
  access_token TEXT,
  refresh_token TEXT,
  expires_at TIMESTAMP,
  scope TEXT,
  instance_url TEXT, -- Salesforce用
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, crm_type)
);

-- CRM同期履歴テーブル
CREATE TABLE IF NOT EXISTS crm_sync_history (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  crm_type VARCHAR(20) NOT NULL, -- 'salesforce' or 'dynamics365'
  sync_type VARCHAR(50) NOT NULL, -- 'manual', 'auto', 'initial'
  direction VARCHAR(20) NOT NULL, -- 'to_crm', 'from_crm', 'bidirectional'
  status VARCHAR(20) NOT NULL, -- 'success', 'failed', 'partial'
  records_processed INTEGER DEFAULT 0,
  records_succeeded INTEGER DEFAULT 0,
  records_failed INTEGER DEFAULT 0,
  error_message TEXT,
  started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP,
  metadata JSONB, -- 追加の同期情報
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- CRMマッピングテーブル（日報とCRMレコードの紐付け）
CREATE TABLE IF NOT EXISTS crm_mappings (
  id SERIAL PRIMARY KEY,
  report_id INTEGER NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
  crm_type VARCHAR(20) NOT NULL, -- 'salesforce' or 'dynamics365'
  crm_record_id VARCHAR(255) NOT NULL, -- CRM側のレコードID
  crm_record_type VARCHAR(50) NOT NULL, -- 'account', 'opportunity', 'contact', etc.
  sync_status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'synced', 'failed'
  last_synced_at TIMESTAMP,
  error_message TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(report_id, crm_type, crm_record_id)
);

-- report_slotsテーブルにcrm_typeカラムを追加（存在しない場合のみ）
ALTER TABLE report_slots ADD COLUMN IF NOT EXISTS crm_type VARCHAR(20);

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_user_crm_tokens_user_id ON user_crm_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_user_crm_tokens_crm_type ON user_crm_tokens(crm_type);
CREATE INDEX IF NOT EXISTS idx_crm_sync_history_user_id ON crm_sync_history(user_id);
CREATE INDEX IF NOT EXISTS idx_crm_sync_history_crm_type ON crm_sync_history(crm_type);
CREATE INDEX IF NOT EXISTS idx_crm_sync_history_status ON crm_sync_history(status);
CREATE INDEX IF NOT EXISTS idx_crm_mappings_report_id ON crm_mappings(report_id);
CREATE INDEX IF NOT EXISTS idx_crm_mappings_crm_type ON crm_mappings(crm_type);
CREATE INDEX IF NOT EXISTS idx_crm_mappings_crm_record_id ON crm_mappings(crm_record_id);

-- トリガー: updated_atの自動更新
CREATE TRIGGER update_user_crm_tokens_updated_at
BEFORE UPDATE ON user_crm_tokens
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_crm_mappings_updated_at
BEFORE UPDATE ON crm_mappings
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- コメント
COMMENT ON TABLE user_crm_tokens IS 'ユーザーごとのCRM認証トークン';
COMMENT ON TABLE crm_sync_history IS 'CRM同期履歴';
COMMENT ON TABLE crm_mappings IS '日報とCRMレコードのマッピング';
