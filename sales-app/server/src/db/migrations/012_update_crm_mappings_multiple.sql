-- 複数CRM紐付け対応のためのスキーマ更新

-- 1. 既存のUNIQUE制約を削除（複数のCRMと紐付けを可能にする）
ALTER TABLE crm_mappings DROP CONSTRAINT IF EXISTS crm_mappings_report_id_crm_type_key;

-- 2. is_active フラグを追加（アクティブな紐付けを管理）
ALTER TABLE crm_mappings ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- 3. 紐付け優先順位を追加（メインのCRMを指定）
ALTER TABLE crm_mappings ADD COLUMN IF NOT EXISTS priority INTEGER DEFAULT 0;

-- 4. 紐付け解除日時を追加（履歴管理用）
ALTER TABLE crm_mappings ADD COLUMN IF NOT EXISTS deactivated_at TIMESTAMP;

-- 5. 紐付け理由を追加
ALTER TABLE crm_mappings ADD COLUMN IF NOT EXISTS link_reason TEXT;

-- 6. インデックスを追加
CREATE INDEX IF NOT EXISTS idx_crm_mappings_report_active ON crm_mappings(report_id, is_active);
CREATE INDEX IF NOT EXISTS idx_crm_mappings_priority ON crm_mappings(report_id, priority DESC);

-- コメント追加
COMMENT ON COLUMN crm_mappings.is_active IS 'この紐付けが現在アクティブかどうか';
COMMENT ON COLUMN crm_mappings.priority IS '優先順位（高いほど優先、0がデフォルト）';
COMMENT ON COLUMN crm_mappings.deactivated_at IS '紐付けが解除された日時';
COMMENT ON COLUMN crm_mappings.link_reason IS '紐付けの理由（手動、自動提案など）';