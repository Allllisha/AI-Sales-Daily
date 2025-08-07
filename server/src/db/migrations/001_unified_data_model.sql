-- マイグレーション: 統一データモデルへの変更
-- 既存のreportsテーブルを統合し、CRM連携機能を追加

-- 新しいreportsテーブル構造（統一データモデル）
-- 既存のreport_slotsの内容をreportsテーブルに統合
ALTER TABLE reports ADD COLUMN IF NOT EXISTS customer VARCHAR(255);
ALTER TABLE reports ADD COLUMN IF NOT EXISTS project VARCHAR(255);
ALTER TABLE reports ADD COLUMN IF NOT EXISTS participants TEXT;
ALTER TABLE reports ADD COLUMN IF NOT EXISTS location VARCHAR(255);
ALTER TABLE reports ADD COLUMN IF NOT EXISTS budget VARCHAR(255);
ALTER TABLE reports ADD COLUMN IF NOT EXISTS schedule VARCHAR(255);
ALTER TABLE reports ADD COLUMN IF NOT EXISTS next_action TEXT;
ALTER TABLE reports ADD COLUMN IF NOT EXISTS issues TEXT;
ALTER TABLE reports ADD COLUMN IF NOT EXISTS personal_info TEXT;
ALTER TABLE reports ADD COLUMN IF NOT EXISTS relationship_notes TEXT;

-- UUIDをサポートするためのextension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- CRM連携情報テーブル
CREATE TABLE IF NOT EXISTS report_crm_links (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    report_id INTEGER NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
    crm_type VARCHAR(50) NOT NULL, -- 'dynamics365', 'salesforce', 'hubspot', etc.
    
    -- 外部ID（CRMごとに異なる）
    external_account_id VARCHAR(255),
    external_opportunity_id VARCHAR(255),
    external_activity_id VARCHAR(255),
    
    -- 外部データ（JSON形式で柔軟に）
    external_data JSONB,
    
    -- 同期状態
    sync_status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'synced', 'error'
    last_sync_at TIMESTAMP,
    sync_error TEXT,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ユーザーCRM設定テーブル
CREATE TABLE IF NOT EXISTS user_crm_settings (
    user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    default_crm VARCHAR(50) DEFAULT 'none',
    
    -- 各CRMの設定（JSON形式、実際は暗号化して保存）
    dynamics365_config JSONB,
    salesforce_config JSONB,
    hubspot_config JSONB,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_report_crm_links_report_id ON report_crm_links(report_id);
CREATE INDEX IF NOT EXISTS idx_report_crm_links_crm_type ON report_crm_links(crm_type);
CREATE INDEX IF NOT EXISTS idx_report_crm_links_sync_status ON report_crm_links(sync_status);

-- トリガー追加（IF NOT EXISTSはTRIGGERでサポートされていないため、DROP IF EXISTSを使用）
DROP TRIGGER IF EXISTS update_report_crm_links_updated_at ON report_crm_links;
CREATE TRIGGER update_report_crm_links_updated_at 
    BEFORE UPDATE ON report_crm_links
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_user_crm_settings_updated_at ON user_crm_settings;
CREATE TRIGGER update_user_crm_settings_updated_at 
    BEFORE UPDATE ON user_crm_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 既存データのマイグレーション（report_slotsからreportsへ）
UPDATE reports 
SET 
    customer = rs.customer,
    project = rs.project,
    participants = rs.participants,
    location = rs.location,
    budget = rs.budget,
    schedule = rs.schedule,
    next_action = rs.next_action,
    issues = rs.issues,
    personal_info = rs.personal_info,
    relationship_notes = rs.relationship_notes
FROM report_slots rs 
WHERE reports.id = rs.report_id;

-- 既存のUNIQUE制約を削除（report_dateではなくdateカラムに変更）
ALTER TABLE reports DROP CONSTRAINT IF EXISTS reports_user_id_report_date_key;

-- 新しいdateカラムを追加してデータを移行
ALTER TABLE reports ADD COLUMN IF NOT EXISTS date DATE;
UPDATE reports SET date = report_date WHERE date IS NULL;
ALTER TABLE reports ALTER COLUMN date SET NOT NULL;

-- 新しいUNIQUE制約を追加
ALTER TABLE reports ADD CONSTRAINT reports_user_id_date_key UNIQUE(user_id, date);

-- 古いカラムを削除（段階的に）
-- ALTER TABLE reports DROP COLUMN IF EXISTS report_date; -- 後で実行