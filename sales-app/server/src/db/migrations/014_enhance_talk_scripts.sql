-- スクリプトの機能拡張

-- スクリプトに名前とタグを追加
ALTER TABLE talk_scripts
ADD COLUMN IF NOT EXISTS script_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS tags TEXT[],
ADD COLUMN IF NOT EXISTS is_favorite BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS version_number INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS parent_script_id INTEGER REFERENCES talk_scripts(id);

-- スクリプトの名前にデフォルト値を設定
UPDATE talk_scripts 
SET script_name = CONCAT(customer, '_', visit_purpose, '_', TO_CHAR(created_at, 'YYYYMMDD'))
WHERE script_name IS NULL;

-- インデックスを追加
CREATE INDEX IF NOT EXISTS idx_scripts_tags ON talk_scripts USING GIN (tags);
CREATE INDEX IF NOT EXISTS idx_scripts_favorite ON talk_scripts (is_favorite);
CREATE INDEX IF NOT EXISTS idx_scripts_parent ON talk_scripts (parent_script_id);
CREATE INDEX IF NOT EXISTS idx_scripts_user_created ON talk_scripts (user_id, created_at DESC);