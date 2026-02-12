-- マイグレーションスクリプト: 配列型からテキスト型へ変更

-- 既存のデータを保存
CREATE TEMP TABLE temp_report_slots AS 
SELECT 
    id,
    report_id,
    customer,
    project,
    next_action,
    budget,
    schedule,
    array_to_string(participants, ', ') as participants,
    location,
    array_to_string(issues, ', ') as issues,
    array_to_string(personal_info, ', ') as personal_info,
    array_to_string(relationship_notes, ', ') as relationship_notes,
    created_at,
    updated_at
FROM report_slots;

-- 既存のテーブルを削除
DROP TABLE report_slots CASCADE;

-- 新しいスキーマでテーブルを作成
CREATE TABLE report_slots (
    id SERIAL PRIMARY KEY,
    report_id INTEGER NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
    customer VARCHAR(255),
    project VARCHAR(255),
    next_action TEXT,
    budget VARCHAR(100),
    schedule VARCHAR(100),
    participants TEXT,
    location VARCHAR(255),
    issues TEXT,
    personal_info TEXT,
    relationship_notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(report_id)
);

-- データを復元
INSERT INTO report_slots (
    id, report_id, customer, project, next_action, budget, schedule,
    participants, location, issues, personal_info, relationship_notes,
    created_at, updated_at
)
SELECT * FROM temp_report_slots;

-- シーケンスを更新
SELECT setval('report_slots_id_seq', (SELECT MAX(id) FROM report_slots));

-- 一時テーブルを削除
DROP TABLE temp_report_slots;

-- industry カラムを追加（もし存在していなければ）
ALTER TABLE report_slots ADD COLUMN IF NOT EXISTS industry VARCHAR(100);

-- トリガーを再作成
CREATE TRIGGER update_report_slots_updated_at BEFORE UPDATE ON report_slots
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();