-- タグのWeb情報キャッシュテーブル
CREATE TABLE IF NOT EXISTS tag_web_info (
  id SERIAL PRIMARY KEY,
  tag_id INTEGER REFERENCES tags(id) ON DELETE CASCADE,
  company_info JSONB,
  latest_news JSONB,
  related_people JSONB,
  last_fetched_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(tag_id)
);

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_tag_web_info_tag_id ON tag_web_info(tag_id);
CREATE INDEX IF NOT EXISTS idx_tag_web_info_last_fetched ON tag_web_info(last_fetched_at);

COMMENT ON TABLE tag_web_info IS 'タグに関連する企業のWeb情報キャッシュ';
COMMENT ON COLUMN tag_web_info.tag_id IS 'タグID（外部キー）';
COMMENT ON COLUMN tag_web_info.company_info IS '企業情報（JSON形式）';
COMMENT ON COLUMN tag_web_info.latest_news IS '最新ニュース（JSON配列）';
COMMENT ON COLUMN tag_web_info.related_people IS '関連人物情報（JSON配列）';
COMMENT ON COLUMN tag_web_info.last_fetched_at IS '最終取得日時';
