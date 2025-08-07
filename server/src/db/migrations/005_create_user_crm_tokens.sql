-- ユーザー個別のCRMトークンテーブル
CREATE TABLE IF NOT EXISTS user_crm_tokens (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  crm_type VARCHAR(50) NOT NULL, -- 'salesforce', 'dynamics365'
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  instance_url VARCHAR(255),
  expires_at TIMESTAMP NOT NULL,
  crm_user_info JSONB, -- CRMからのユーザー情報
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  UNIQUE(user_id, crm_type)
);

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_user_crm_tokens_user_id ON user_crm_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_user_crm_tokens_crm_type ON user_crm_tokens(crm_type);
CREATE INDEX IF NOT EXISTS idx_user_crm_tokens_expires_at ON user_crm_tokens(expires_at);