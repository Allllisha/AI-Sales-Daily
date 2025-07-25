-- Sales Daily デモ用シードデータ
-- 注意: このスクリプトは既存のデータを削除してから新しいデータを挿入します

-- 既存のデータをクリア
TRUNCATE TABLE report_slots CASCADE;
TRUNCATE TABLE report_qa CASCADE;
TRUNCATE TABLE reports CASCADE;
TRUNCATE TABLE users CASCADE;

-- ユーザーデータの挿入
INSERT INTO users (name, email, password, role, manager_id) VALUES
-- マネージャー
('山田太郎', 'yamada@example.com', '$2a$10$YourHashedPasswordHere1', 'manager', NULL),
-- 営業担当者（山田太郎の部下）
('田中花子', 'tanaka@example.com', '$2a$10$YourHashedPasswordHere2', 'sales', 1),
('鈴木一郎', 'suzuki@example.com', '$2a$10$YourHashedPasswordHere3', 'sales', 1),
('佐藤美咲', 'sato@example.com', '$2a$10$YourHashedPasswordHere4', 'sales', 1),
('高橋健太', 'takahashi@example.com', '$2a$10$YourHashedPasswordHere5', 'sales', 1);

-- ユーザーIDを取得
DO $$
DECLARE
    yamada_id INTEGER;
    tanaka_id INTEGER;
    suzuki_id INTEGER;
    sato_id INTEGER;
    takahashi_id INTEGER;
BEGIN
    SELECT id INTO yamada_id FROM users WHERE email = 'yamada@example.com';
    SELECT id INTO tanaka_id FROM users WHERE email = 'tanaka@example.com';
    SELECT id INTO suzuki_id FROM users WHERE email = 'suzuki@example.com';
    SELECT id INTO sato_id FROM users WHERE email = 'sato@example.com';
    SELECT id INTO takahashi_id FROM users WHERE email = 'takahashi@example.com';

    -- 田中花子の日報（建設業中心）
    INSERT INTO reports (user_id, report_date, mode, status) VALUES
    (tanaka_id, CURRENT_DATE - INTERVAL '14 days', 'hearing', 'completed'),
    (tanaka_id, CURRENT_DATE - INTERVAL '12 days', 'hearing', 'completed'),
    (tanaka_id, CURRENT_DATE - INTERVAL '10 days', 'hearing', 'completed'),
    (tanaka_id, CURRENT_DATE - INTERVAL '7 days', 'hearing', 'completed'),
    (tanaka_id, CURRENT_DATE - INTERVAL '5 days', 'hearing', 'completed'),
    (tanaka_id, CURRENT_DATE - INTERVAL '3 days', 'hearing', 'completed'),
    (tanaka_id, CURRENT_DATE - INTERVAL '1 day', 'hearing', 'completed'),
    (tanaka_id, CURRENT_DATE, 'hearing', 'draft');

    -- 鈴木一郎の日報（IT業中心）
    INSERT INTO reports (user_id, report_date, mode, status) VALUES
    (suzuki_id, CURRENT_DATE - INTERVAL '13 days', 'hearing', 'completed'),
    (suzuki_id, CURRENT_DATE - INTERVAL '11 days', 'hearing', 'completed'),
    (suzuki_id, CURRENT_DATE - INTERVAL '8 days', 'hearing', 'completed'),
    (suzuki_id, CURRENT_DATE - INTERVAL '6 days', 'hearing', 'completed'),
    (suzuki_id, CURRENT_DATE - INTERVAL '4 days', 'hearing', 'completed'),
    (suzuki_id, CURRENT_DATE - INTERVAL '2 days', 'hearing', 'completed'),
    (suzuki_id, CURRENT_DATE, 'hearing', 'draft');

    -- 佐藤美咲の日報（製造業中心）
    INSERT INTO reports (user_id, report_date, mode, status) VALUES
    (sato_id, CURRENT_DATE - INTERVAL '15 days', 'hearing', 'completed'),
    (sato_id, CURRENT_DATE - INTERVAL '12 days', 'hearing', 'completed'),
    (sato_id, CURRENT_DATE - INTERVAL '9 days', 'hearing', 'completed'),
    (sato_id, CURRENT_DATE - INTERVAL '6 days', 'hearing', 'completed'),
    (sato_id, CURRENT_DATE - INTERVAL '3 days', 'hearing', 'completed'),
    (sato_id, CURRENT_DATE - INTERVAL '1 day', 'hearing', 'completed');

    -- 高橋健太の日報（小売・金融業中心）
    INSERT INTO reports (user_id, report_date, mode, status) VALUES
    (takahashi_id, CURRENT_DATE - INTERVAL '14 days', 'hearing', 'completed'),
    (takahashi_id, CURRENT_DATE - INTERVAL '10 days', 'hearing', 'completed'),
    (takahashi_id, CURRENT_DATE - INTERVAL '7 days', 'hearing', 'completed'),
    (takahashi_id, CURRENT_DATE - INTERVAL '4 days', 'hearing', 'completed'),
    (takahashi_id, CURRENT_DATE - INTERVAL '2 days', 'hearing', 'completed'),
    (takahashi_id, CURRENT_DATE, 'hearing', 'draft');
END $$;

-- 日報スロットデータの挿入
INSERT INTO report_slots (report_id, customer, project, next_action, budget, schedule, participants, location, issues, industry)
SELECT 
    r.id,
    CASE 
        WHEN u.email = 'tanaka@example.com' THEN 
            CASE (r.id % 4)
                WHEN 0 THEN '大林建設株式会社'
                WHEN 1 THEN '清水建設株式会社'
                WHEN 2 THEN '鹿島建設株式会社'
                WHEN 3 THEN '竹中工務店'
            END
        WHEN u.email = 'suzuki@example.com' THEN
            CASE (r.id % 4)
                WHEN 0 THEN '富士通株式会社'
                WHEN 1 THEN '日本電気株式会社'
                WHEN 2 THEN 'サイボウズ株式会社'
                WHEN 3 THEN '株式会社セールスフォース'
            END
        WHEN u.email = 'sato@example.com' THEN
            CASE (r.id % 4)
                WHEN 0 THEN 'トヨタ自動車株式会社'
                WHEN 1 THEN 'パナソニック株式会社'
                WHEN 2 THEN '日立製作所'
                WHEN 3 THEN '三菱重工業株式会社'
            END
        WHEN u.email = 'takahashi@example.com' THEN
            CASE (r.id % 4)
                WHEN 0 THEN 'イオンリテール株式会社'
                WHEN 1 THEN '三菱UFJ銀行'
                WHEN 2 THEN 'セブンイレブン・ジャパン'
                WHEN 3 THEN '野村證券株式会社'
            END
    END as customer,
    CASE 
        WHEN u.email = 'tanaka@example.com' THEN 
            CASE (r.id % 3)
                WHEN 0 THEN '新社屋建設プロジェクト'
                WHEN 1 THEN 'BIM導入支援'
                WHEN 2 THEN '安全管理システム刷新'
            END
        WHEN u.email = 'suzuki@example.com' THEN
            CASE (r.id % 3)
                WHEN 0 THEN 'DXプラットフォーム構築'
                WHEN 1 THEN 'クラウド移行プロジェクト'
                WHEN 2 THEN 'AI需要予測システム導入'
            END
        WHEN u.email = 'sato@example.com' THEN
            CASE (r.id % 3)
                WHEN 0 THEN '工場IoT化プロジェクト'
                WHEN 1 THEN '品質管理システム更新'
                WHEN 2 THEN '生産ライン自動化'
            END
        WHEN u.email = 'takahashi@example.com' THEN
            CASE (r.id % 3)
                WHEN 0 THEN 'POSシステム更新'
                WHEN 1 THEN 'オンラインバンキング刷新'
                WHEN 2 THEN '在庫管理システム統合'
            END
    END as project,
    CASE 
        WHEN r.status = 'completed' THEN
            CASE (r.id % 3)
                WHEN 0 THEN '見積書を作成して送付, 技術仕様の詳細を説明, 次回打ち合わせの日程調整'
                WHEN 1 THEN '提案書の修正版を送付, ROI計算資料の準備, 決裁者との面談設定'
                WHEN 2 THEN 'デモ環境の準備, 導入スケジュールの確認, 契約書ドラフトの送付'
            END
        ELSE 'フォローアップの電話, 資料の送付'
    END as next_action,
    CASE 
        WHEN u.email = 'tanaka@example.com' THEN 
            CASE (r.id % 3)
                WHEN 0 THEN '5000万円〜1億円'
                WHEN 1 THEN '3000万円〜5000万円'
                WHEN 2 THEN '1億円〜3億円'
            END
        WHEN u.email = 'suzuki@example.com' THEN
            CASE (r.id % 3)
                WHEN 0 THEN '2000万円〜3000万円'
                WHEN 1 THEN '5000万円〜8000万円'
                WHEN 2 THEN '1000万円〜2000万円'
            END
        WHEN u.email = 'sato@example.com' THEN
            CASE (r.id % 3)
                WHEN 0 THEN '8000万円〜1.5億円'
                WHEN 1 THEN '3000万円〜5000万円'
                WHEN 2 THEN '2億円〜5億円'
            END
        WHEN u.email = 'takahashi@example.com' THEN
            CASE (r.id % 3)
                WHEN 0 THEN '1000万円〜3000万円'
                WHEN 1 THEN '5億円〜10億円'
                WHEN 2 THEN '5000万円〜1億円'
            END
    END as budget,
    CASE (r.id % 3)
        WHEN 0 THEN '2025年4月〜2025年9月'
        WHEN 1 THEN '2025年7月〜2025年12月'
        WHEN 2 THEN '2025年10月〜2026年3月'
    END as schedule,
    CASE 
        WHEN u.email = 'tanaka@example.com' THEN '田中（営業）, 山田部長, 先方：工事部長, 設計部課長'
        WHEN u.email = 'suzuki@example.com' THEN '鈴木（営業）, 技術部エンジニア, 先方：情報システム部長, IT推進室'
        WHEN u.email = 'sato@example.com' THEN '佐藤（営業）, 技術サポート, 先方：製造部長, 品質管理責任者'
        WHEN u.email = 'takahashi@example.com' THEN '高橋（営業）, ソリューション担当, 先方：経営企画部, 店舗運営部'
    END as participants,
    CASE 
        WHEN u.email = 'tanaka@example.com' THEN 
            CASE (r.id % 2)
                WHEN 0 THEN '東京本社'
                WHEN 1 THEN '建設現場（千葉県）'
            END
        WHEN u.email = 'suzuki@example.com' THEN
            CASE (r.id % 2)
                WHEN 0 THEN 'オンライン会議'
                WHEN 1 THEN '先方オフィス（品川）'
            END
        WHEN u.email = 'sato@example.com' THEN
            CASE (r.id % 2)
                WHEN 0 THEN '工場見学（愛知県）'
                WHEN 1 THEN '本社会議室'
            END
        WHEN u.email = 'takahashi@example.com' THEN
            CASE (r.id % 2)
                WHEN 0 THEN '店舗視察'
                WHEN 1 THEN '本店会議室'
            END
    END as location,
    CASE 
        WHEN u.email = 'tanaka@example.com' THEN 
            CASE (r.id % 3)
                WHEN 0 THEN '工期の遅延リスク, 資材価格の高騰, 職人不足の懸念'
                WHEN 1 THEN '既存システムとの連携, BIM対応人材の不足, 初期投資コスト'
                WHEN 2 THEN '現場作業員の教育期間, システム導入の抵抗感, 運用コスト'
            END
        WHEN u.email = 'suzuki@example.com' THEN
            CASE (r.id % 3)
                WHEN 0 THEN 'レガシーシステムとの統合, セキュリティ要件の複雑さ, 移行期間中の業務影響'
                WHEN 1 THEN 'データ移行の複雑性, コンプライアンス対応, ベンダーロックインの懸念'
                WHEN 2 THEN 'AI精度の担保, 既存業務プロセスの変更, ROIの明確化'
            END
        WHEN u.email = 'sato@example.com' THEN
            CASE (r.id % 3)
                WHEN 0 THEN '既存設備との互換性, 導入期間中の生産停止, 技術者のスキル不足'
                WHEN 1 THEN '品質基準の維持, システム切り替えリスク, 従業員の習熟期間'
                WHEN 2 THEN '初期投資の回収期間, メンテナンス体制, 海外工場への展開'
            END
        WHEN u.email = 'takahashi@example.com' THEN
            CASE (r.id % 3)
                WHEN 0 THEN '店舗スタッフの教育, システム停止時の対応, 既存POSとの連携'
                WHEN 1 THEN 'セキュリティ強化要件, 24時間稼働の保証, 規制対応'
                WHEN 2 THEN 'マルチチャネル対応, リアルタイム性の確保, 投資対効果'
            END
    END as issues,
    CASE 
        WHEN u.email = 'tanaka@example.com' THEN '建設業'
        WHEN u.email = 'suzuki@example.com' THEN 'IT業'
        WHEN u.email = 'sato@example.com' THEN '製造業'
        WHEN u.email = 'takahashi@example.com' THEN 
            CASE (r.id % 2)
                WHEN 0 THEN '小売業'
                WHEN 1 THEN '金融業'
            END
    END as industry
FROM reports r
JOIN users u ON r.user_id = u.id;

-- 質問と回答データの挿入
INSERT INTO report_qa (report_id, question, answer, question_order)
SELECT 
    r.id,
    '今日はどのような商談がありましたか？',
    CASE 
        WHEN u.email = 'tanaka@example.com' THEN 
            CASE (r.id % 3)
                WHEN 0 THEN '大林建設さんと新社屋建設プロジェクトについて打ち合わせをしました。BIMを活用した設計について詳しく説明し、先方も非常に興味を持っていただけました。'
                WHEN 1 THEN '清水建設さんでBIM導入支援の提案をしてきました。既に競合他社も提案しているようですが、我々の実績を評価していただいています。'
                WHEN 2 THEN '鹿島建設さんの安全管理システム刷新案件で、現場視察を行いました。現状の課題を詳しくヒアリングできました。'
            END
        WHEN u.email = 'suzuki@example.com' THEN
            CASE (r.id % 3)
                WHEN 0 THEN '富士通さんとDXプラットフォーム構築について技術的な詳細を詰めました。セキュリティ要件が想定より厳しく、追加提案が必要です。'
                WHEN 1 THEN '日本電気さんのクラウド移行プロジェクトで、移行計画のレビューを実施しました。段階的な移行で合意できそうです。'
                WHEN 2 THEN 'サイボウズさんにAI需要予測システムの導入効果について説明しました。ROI試算に強い関心を示されました。'
            END
        WHEN u.email = 'sato@example.com' THEN
            CASE (r.id % 3)
                WHEN 0 THEN 'トヨタ自動車さんの工場でIoT化の現地調査を行いました。既存設備との連携方法について技術検証が必要です。'
                WHEN 1 THEN 'パナソニックさんと品質管理システムの更新について協議しました。グローバル展開を視野に入れた提案を求められています。'
                WHEN 2 THEN '日立製作所さんの生産ライン自動化プロジェクトで、投資対効果の詳細説明を行いました。'
            END
        WHEN u.email = 'takahashi@example.com' THEN
            CASE (r.id % 3)
                WHEN 0 THEN 'イオンリテールさんとPOSシステム更新の要件定義を行いました。全店舗展開のスケジュールが課題です。'
                WHEN 1 THEN '三菱UFJ銀行さんのオンラインバンキング刷新で、セキュリティ要件の確認をしました。規制対応が重要なポイントです。'
                WHEN 2 THEN 'セブンイレブンさんの在庫管理システム統合について、現行システムの調査結果を報告しました。'
            END
    END,
    1
FROM reports r
JOIN users u ON r.user_id = u.id;

INSERT INTO report_qa (report_id, question, answer, question_order)
SELECT 
    r.id,
    '次のアクションは何ですか？',
    CASE 
        WHEN u.email = 'tanaka@example.com' THEN 
            CASE (r.id % 3)
                WHEN 0 THEN '来週までに詳細見積もりを作成して送付します。また、BIM導入の成功事例をまとめた資料も準備し、次回の打ち合わせで説明する予定です。'
                WHEN 1 THEN '競合他社との差別化ポイントをまとめた追加提案書を作成します。特に、我々の施工実績とサポート体制の優位性を強調します。'
                WHEN 2 THEN '現場視察の結果を踏まえた提案書を作成し、来週中に提出します。また、デモンストレーションの日程も調整します。'
            END
        WHEN u.email = 'suzuki@example.com' THEN
            CASE (r.id % 3)
                WHEN 0 THEN 'セキュリティ要件に対応した追加提案を準備します。社内のセキュリティチームと連携して、より詳細な対策を検討します。'
                WHEN 1 THEN '段階的移行の詳細スケジュールを作成し、各フェーズでのリスクと対策をまとめます。来週、技術責任者と再度打ち合わせです。'
                WHEN 2 THEN 'ROI試算の詳細資料を作成し、導入後3年間の効果予測を提示します。また、パイロット導入の提案も行います。'
            END
        WHEN u.email = 'sato@example.com' THEN
            CASE (r.id % 3)
                WHEN 0 THEN '技術検証のためのPoC提案書を作成します。小規模な実証実験から始めることを提案し、リスクを最小化します。'
                WHEN 1 THEN 'グローバル展開に対応した提案書を作成します。多言語対応や各国の規制への対応方法も含めて提案します。'
                WHEN 2 THEN '投資回収シミュレーションをより詳細に作成し、経営層向けのプレゼン資料を準備します。'
            END
        WHEN u.email = 'takahashi@example.com' THEN
            CASE (r.id % 3)
                WHEN 0 THEN '全店舗展開の詳細スケジュールを作成します。パイロット店舗での検証から始める段階的な導入計画を提案します。'
                WHEN 1 THEN 'セキュリティ監査チームとの打ち合わせを設定し、規制要件への対応方針を明確にします。'
                WHEN 2 THEN 'システム統合の技術的課題をまとめ、解決策を提示します。移行期間中の業務継続計画も含めて提案します。'
            END
    END,
    2
FROM reports r
JOIN users u ON r.user_id = u.id;

INSERT INTO report_qa (report_id, question, answer, question_order)
SELECT 
    r.id,
    '課題や懸念事項はありましたか？',
    CASE 
        WHEN u.email = 'tanaka@example.com' THEN 
            CASE (r.id % 3)
                WHEN 0 THEN '工期が非常にタイトで、資材調達の遅延が心配されています。また、最近の資材価格高騰も予算面での懸念材料です。早めに対策を検討する必要があります。'
                WHEN 1 THEN 'BIMに対応できる技術者が社内に少ないことを懸念されています。導入と同時に教育プログラムの提供も検討が必要かもしれません。'
                WHEN 2 THEN '現場作業員の高齢化が進んでおり、新システムへの抵抗感があるようです。使いやすいUIと十分な研修期間の確保が重要です。'
            END
        WHEN u.email = 'suzuki@example.com' THEN
            CASE (r.id % 3)
                WHEN 0 THEN 'レガシーシステムとの連携が想定以上に複雑で、追加開発が必要になる可能性があります。詳細な調査が必要です。'
                WHEN 1 THEN 'クラウド移行に伴うデータの取り扱いについて、コンプライアンス部門から厳しい要求が出ています。法務部門との調整も必要です。'
                WHEN 2 THEN 'AI導入に対する現場の理解がまだ不十分で、導入効果について疑問視する声もあります。より具体的な成功事例の提示が必要です。'
            END
        WHEN u.email = 'sato@example.com' THEN
            CASE (r.id % 3)
                WHEN 0 THEN '24時間稼働の工場なので、システム導入時の生産停止をいかに最小化するかが大きな課題です。綿密な計画が必要です。'
                WHEN 1 THEN '品質基準が非常に厳格で、新システムでも同等以上の品質管理ができることを証明する必要があります。'
                WHEN 2 THEN '初期投資額が大きく、投資回収期間について経営層から厳しい質問を受けています。より詳細なROI分析が求められています。'
            END
        WHEN u.email = 'takahashi@example.com' THEN
            CASE (r.id % 3)
                WHEN 0 THEN '店舗スタッフの入れ替わりが激しく、継続的な教育体制の構築が課題です。また、繁忙期の導入は避けたいとの要望があります。'
                WHEN 1 THEN '金融庁の規制に完全準拠する必要があり、開発期間とコストが当初想定を上回る可能性があります。'
                WHEN 2 THEN 'オムニチャネル対応が必須要件として追加され、当初の提案内容から大幅な見直しが必要になりました。'
            END
    END,
    3
FROM reports r
JOIN users u ON r.user_id = u.id;

-- パスワードをbcryptハッシュに更新（実際の環境では適切なハッシュ値を使用してください）
-- デモ用パスワード: password123
UPDATE users SET password = '$2a$10$xQvB3NnFPK3vXzF1V3mTg.mRZ8uHSMmFYmLUqd0XoHwYQKQXnPSXu';

-- 実行確認
SELECT 
    'ユーザー数: ' || COUNT(*)::text as info
FROM users
UNION ALL
SELECT 
    '日報数: ' || COUNT(*)::text
FROM reports
UNION ALL
SELECT 
    '日報スロット数: ' || COUNT(*)::text
FROM report_slots
UNION ALL
SELECT 
    '質問回答数: ' || COUNT(*)::text
FROM report_qa;