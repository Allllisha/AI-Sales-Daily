-- デモ用の日報データを追加（課題データ含む）

-- 田中花子の日報
INSERT INTO reports (user_id, report_date, status, mode, created_at, updated_at)
VALUES 
(10, CURRENT_DATE, 'completed', 'hearing', NOW(), NOW()),
(10, CURRENT_DATE - INTERVAL '1 day', 'completed', 'hearing', NOW(), NOW()),
(10, CURRENT_DATE - INTERVAL '2 days', 'completed', 'hearing', NOW(), NOW());

-- 鈴木一郎の日報
INSERT INTO reports (user_id, report_date, status, mode, created_at, updated_at)
VALUES 
(11, CURRENT_DATE, 'completed', 'hearing', NOW(), NOW()),
(11, CURRENT_DATE - INTERVAL '1 day', 'completed', 'hearing', NOW(), NOW()),
(11, CURRENT_DATE - INTERVAL '2 days', 'completed', 'hearing', NOW(), NOW());

-- 田中花子の日報スロットデータ
INSERT INTO report_slots (report_id, customer, project, next_action, budget, schedule, participants, location, issues)
SELECT 
    r.id,
    CASE 
        WHEN MOD(r.id, 3) = 0 THEN 'ABC建設'
        WHEN MOD(r.id, 3) = 1 THEN 'XYZ工業'
        ELSE 'DEF商事'
    END,
    CASE 
        WHEN MOD(r.id, 3) = 0 THEN '新規AIシステム導入'
        WHEN MOD(r.id, 3) = 1 THEN '業務自動化プロジェクト'
        ELSE 'DX推進支援'
    END,
    '見積もり作成, フォローアップ電話',
    '1000万円',
    '2025年3月',
    ARRAY['営業部長', '技術責任者'],
    '東京本社',
    CASE 
        WHEN MOD(r.id, 3) = 0 THEN ARRAY['AIシステムの精度が低い', '導入コストが高い', '技術者不足']
        WHEN MOD(r.id, 3) = 1 THEN ARRAY['システム連携の課題', '予算の制約', '現場の理解不足']
        ELSE ARRAY['セキュリティの懸念', 'ROIの不明確さ', '運用体制の未整備']
    END
FROM reports r
WHERE r.user_id = 10 AND r.id NOT IN (SELECT report_id FROM report_slots);

-- 鈴木一郎の日報スロットデータ
INSERT INTO report_slots (report_id, customer, project, next_action, budget, schedule, participants, location, issues)
SELECT 
    r.id,
    CASE 
        WHEN MOD(r.id, 3) = 0 THEN 'GHI物流'
        WHEN MOD(r.id, 3) = 1 THEN 'JKL電機'
        ELSE 'MNO化学'
    END,
    CASE 
        WHEN MOD(r.id, 3) = 0 THEN '物流最適化システム'
        WHEN MOD(r.id, 3) = 1 THEN 'IoT導入プロジェクト'
        ELSE '品質管理システム'
    END,
    '提案書作成, デモ準備',
    '500万円',
    '2025年2月',
    ARRAY['購買部長', 'IT責任者'],
    '大阪支社',
    CASE 
        WHEN MOD(r.id, 3) = 0 THEN ARRAY['既存システムとの連携', 'データ移行の課題', 'スタッフの教育']
        WHEN MOD(r.id, 3) = 1 THEN ARRAY['ネットワークインフラ', 'セキュリティ対策', 'コスト削減効果']
        ELSE ARRAY['品質基準の統一', 'リアルタイム監視', '異常検知の精度']
    END
FROM reports r
WHERE r.user_id = 11 AND r.id NOT IN (SELECT report_id FROM report_slots);