-- 議事録セッションを永続化するテーブル
CREATE TABLE IF NOT EXISTS meeting_sessions (
  id VARCHAR(255) PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  meeting_content TEXT,
  extracted_info JSONB,
  status VARCHAR(50) DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP DEFAULT (CURRENT_TIMESTAMP + INTERVAL '24 hours')
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_meeting_sessions_user_id ON meeting_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_meeting_sessions_expires_at ON meeting_sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_meeting_sessions_status ON meeting_sessions(status);

-- 期限切れセッションを定期的に削除するための設定
-- (実際の削除は別途cronジョブやスケジューラーで実行)