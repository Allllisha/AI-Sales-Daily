-- tag_web_infoテーブルにrecent_topicsカラムを追加
ALTER TABLE tag_web_info
ADD COLUMN IF NOT EXISTS recent_topics JSONB;

COMMENT ON COLUMN tag_web_info.recent_topics IS '最近の取り組み・注目トピック（JSON配列）';
