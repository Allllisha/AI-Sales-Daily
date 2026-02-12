-- マネージャー（山田太郎）のデモ日報データを追加

-- 山田太郎の日報
INSERT INTO reports (user_id, report_date, status, mode, created_at, updated_at)
VALUES 
(1, CURRENT_DATE, 'completed', 'hearing', NOW(), NOW()),
(1, CURRENT_DATE - INTERVAL '1 day', 'completed', 'hearing', NOW(), NOW()),
(1, CURRENT_DATE - INTERVAL '2 days', 'completed', 'hearing', NOW(), NOW()),
(1, CURRENT_DATE - INTERVAL '3 days', 'completed', 'hearing', NOW(), NOW()),
(1, CURRENT_DATE - INTERVAL '4 days', 'completed', 'hearing', NOW(), NOW());

-- 山田太郎の日報スロットデータ
INSERT INTO report_slots (report_id, customer, project, next_action, budget, schedule, participants, location, issues)
SELECT 
    r.id,
    CASE 
        WHEN MOD(r.id, 5) = 0 THEN 'トヨタ自動車'
        WHEN MOD(r.id, 5) = 1 THEN 'ソニーグループ'
        WHEN MOD(r.id, 5) = 2 THEN 'NTTデータ'
        WHEN MOD(r.id, 5) = 3 THEN '三菱商事'
        ELSE 'パナソニック'
    END,
    CASE 
        WHEN MOD(r.id, 5) = 0 THEN '製造ラインAI最適化'
        WHEN MOD(r.id, 5) = 1 THEN '画像認識システム開発'
        WHEN MOD(r.id, 5) = 2 THEN 'クラウド基盤構築'
        WHEN MOD(r.id, 5) = 3 THEN 'SCMシステム刷新'
        ELSE 'IoTプラットフォーム導入'
    END,
    '経営層への提案, 技術検証実施',
    '5000万円',
    '2025年6月',
    ARRAY['取締役', 'CTO', '事業部長'],
    '東京本社',
    ARRAY['ROI計算の精緻化', '既存システムとの統合', '組織変革の必要性', '技術者の育成']
FROM reports r
WHERE r.user_id = 1 AND r.id NOT IN (SELECT report_id FROM report_slots);

-- 複数の商談を同じ顧客に追加（顧客別商談数を確認するため）
INSERT INTO reports (user_id, report_date, status, mode, created_at, updated_at)
VALUES 
(1, CURRENT_DATE - INTERVAL '5 days', 'completed', 'hearing', NOW(), NOW()),
(1, CURRENT_DATE - INTERVAL '6 days', 'completed', 'hearing', NOW(), NOW()),
(1, CURRENT_DATE - INTERVAL '7 days', 'completed', 'hearing', NOW(), NOW());

INSERT INTO report_slots (report_id, customer, project, next_action, budget, schedule, participants, location, issues)
SELECT 
    r.id,
    CASE 
        WHEN MOD(r.id, 3) = 0 THEN 'トヨタ自動車'
        WHEN MOD(r.id, 3) = 1 THEN 'ソニーグループ'
        ELSE 'NTTデータ'
    END,
    'フォローアップ商談',
    '追加提案準備',
    '1000万円',
    '2025年4月',
    ARRAY['部長', '課長'],
    '東京本社',
    ARRAY['予算調整', 'スケジュール調整']
FROM reports r
WHERE r.user_id = 1 AND r.id NOT IN (SELECT report_id FROM report_slots);