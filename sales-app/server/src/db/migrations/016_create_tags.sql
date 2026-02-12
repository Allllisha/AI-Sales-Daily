-- タグ機能のためのテーブル作成

-- タグマスターテーブル
CREATE TABLE IF NOT EXISTS tags (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  category VARCHAR(50) NOT NULL, -- 'company', 'person', 'topic', 'emotion', 'stage', 'industry', 'product'
  color VARCHAR(7), -- HEXカラーコード（例: #3B82F6）
  usage_count INTEGER DEFAULT 0, -- 使用回数
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 日報とタグの中間テーブル（多対多）
CREATE TABLE IF NOT EXISTS report_tags (
  id SERIAL PRIMARY KEY,
  report_id INTEGER NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
  tag_id INTEGER NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  auto_generated BOOLEAN DEFAULT true, -- AIによる自動生成か手動追加か
  confidence FLOAT, -- AI抽出の信頼度（0.0-1.0）
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(report_id, tag_id) -- 同じタグは1つの日報に1回だけ
);

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_tags_category ON tags(category);
CREATE INDEX IF NOT EXISTS idx_tags_name ON tags(name);
CREATE INDEX IF NOT EXISTS idx_report_tags_report_id ON report_tags(report_id);
CREATE INDEX IF NOT EXISTS idx_report_tags_tag_id ON report_tags(tag_id);
CREATE INDEX IF NOT EXISTS idx_tags_usage_count ON tags(usage_count DESC);

-- トリガー: usage_countの自動更新
CREATE OR REPLACE FUNCTION update_tag_usage_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE tags SET usage_count = usage_count + 1 WHERE id = NEW.tag_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE tags SET usage_count = usage_count - 1 WHERE id = OLD.tag_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_tag_usage_count
AFTER INSERT OR DELETE ON report_tags
FOR EACH ROW
EXECUTE FUNCTION update_tag_usage_count();

-- トリガー: updated_atの自動更新
CREATE TRIGGER update_tags_updated_at
BEFORE UPDATE ON tags
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- カテゴリ別のデフォルトカラー設定用のコメント
COMMENT ON COLUMN tags.category IS 'company: 企業名, person: 人物, topic: 話題, emotion: 感情, stage: ステージ, industry: 業界, product: 製品';
COMMENT ON COLUMN tags.color IS 'カテゴリ別デフォルト: company=#3B82F6, person=#10B981, topic=#F59E0B, emotion=#EF4444, stage=#8B5CF6, industry=#6366F1, product=#EC4899';
