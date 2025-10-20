-- トークスクリプト機能のためのテーブル作成

-- トークスクリプトテーブル
CREATE TABLE IF NOT EXISTS talk_scripts (
    id SERIAL PRIMARY KEY,
    report_id INTEGER REFERENCES reports(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    customer VARCHAR(255) NOT NULL,
    situation VARCHAR(255), -- 初回訪問、提案、クロージング等
    visit_purpose VARCHAR(255), -- 訪問目的
    
    -- スクリプトの目標と重点項目
    objectives JSONB DEFAULT '[]'::jsonb, -- ["予算確認", "決裁者特定", "競合確認"]
    
    -- スクリプトセクション
    script_sections JSONB DEFAULT '{}'::jsonb,
    /* 構造例:
    {
        "opening": {
            "main": "本日はお時間いただき...",
            "alternatives": ["別の挨拶パターン"],
            "key_points": ["前回の振り返りから入る"]
        },
        "needs_discovery": {
            "questions": ["現在の課題は？", "理想の状態は？"],
            "response_patterns": {
                "予算不明時": "ご予算感は...",
                "決裁者不明時": "最終的なご判断は..."
            }
        },
        "objection_handling": {
            "価格が高い": "初期投資は必要ですが...",
            "他社検討中": "弊社の強みは..."
        },
        "closing": {
            "next_action": "次回、詳細をご説明...",
            "commitment": "まずは資料をお送りします"
        }
    }
    */
    
    -- 成功指標とリスクポイント
    success_indicators JSONB DEFAULT '[]'::jsonb, -- ["予算取得", "次回アポ"]
    risk_points JSONB DEFAULT '[]'::jsonb, -- ["競合動向注意", "予算削減可能性"]
    
    -- 利用統計
    usage_count INTEGER DEFAULT 0,
    success_count INTEGER DEFAULT 0,
    success_rate DECIMAL(5,2),
    
    -- AIメタデータ
    ai_model VARCHAR(50), -- 使用したAIモデル
    ai_confidence DECIMAL(3,2), -- AI信頼度スコア
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- スクリプト利用実績テーブル
CREATE TABLE IF NOT EXISTS script_results (
    id SERIAL PRIMARY KEY,
    script_id INTEGER NOT NULL REFERENCES talk_scripts(id) ON DELETE CASCADE,
    report_id INTEGER REFERENCES reports(id) ON DELETE SET NULL,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- 利用日時と場所
    used_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    location VARCHAR(255),
    
    -- 実際に使用したセクション
    used_sections JSONB DEFAULT '[]'::jsonb, -- ["opening", "needs_discovery"]
    skipped_sections JSONB DEFAULT '[]'::jsonb, -- ["objection_handling"]
    
    -- 顧客の反応と実際の会話内容
    actual_responses JSONB DEFAULT '{}'::jsonb,
    /* 構造例:
    {
        "opening": "良い反応",
        "needs_discovery": "詳細に答えてくれた",
        "budget": "500万円と明確に回答"
    }
    */
    
    -- 評価
    success_level INTEGER CHECK (success_level >= 1 AND success_level <= 5), -- 1-5評価
    achieved_objectives JSONB DEFAULT '[]'::jsonb, -- 達成した目標
    feedback TEXT, -- 営業担当者のフィードバック
    manager_comment TEXT, -- マネージャーのコメント
    
    -- 次回への申し送り
    next_improvements TEXT,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- スクリプトテンプレートテーブル（ベストプラクティス保存用）
CREATE TABLE IF NOT EXISTS script_templates (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    
    -- テンプレート分類
    industry VARCHAR(100), -- 業界
    customer_type VARCHAR(100), -- 新規/既存
    sales_stage VARCHAR(100), -- 初回/提案/クロージング
    
    -- テンプレート内容
    template_sections JSONB NOT NULL,
    recommended_objectives JSONB DEFAULT '[]'::jsonb,
    
    -- 利用統計
    usage_count INTEGER DEFAULT 0,
    avg_success_rate DECIMAL(5,2),
    
    -- 作成者情報
    created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    is_public BOOLEAN DEFAULT false, -- チーム全体で共有するか
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_talk_scripts_user_id ON talk_scripts(user_id);
CREATE INDEX IF NOT EXISTS idx_talk_scripts_report_id ON talk_scripts(report_id);
CREATE INDEX IF NOT EXISTS idx_talk_scripts_customer ON talk_scripts(customer);
CREATE INDEX IF NOT EXISTS idx_talk_scripts_created_at ON talk_scripts(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_script_results_script_id ON script_results(script_id);
CREATE INDEX IF NOT EXISTS idx_script_results_user_id ON script_results(user_id);
CREATE INDEX IF NOT EXISTS idx_script_results_used_at ON script_results(used_at DESC);

CREATE INDEX IF NOT EXISTS idx_script_templates_industry ON script_templates(industry);
CREATE INDEX IF NOT EXISTS idx_script_templates_sales_stage ON script_templates(sales_stage);

-- トリガー設定
DROP TRIGGER IF EXISTS update_talk_scripts_updated_at ON talk_scripts;
CREATE TRIGGER update_talk_scripts_updated_at 
    BEFORE UPDATE ON talk_scripts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_script_results_updated_at ON script_results;
CREATE TRIGGER update_script_results_updated_at 
    BEFORE UPDATE ON script_results
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_script_templates_updated_at ON script_templates;
CREATE TRIGGER update_script_templates_updated_at 
    BEFORE UPDATE ON script_templates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 成功率を自動計算する関数
CREATE OR REPLACE FUNCTION update_script_success_rate() 
RETURNS TRIGGER AS $$
BEGIN
    UPDATE talk_scripts 
    SET success_rate = CASE 
        WHEN usage_count > 0 THEN (success_count::decimal / usage_count * 100)
        ELSE 0
    END
    WHERE id = NEW.script_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS calculate_success_rate ON script_results;
CREATE TRIGGER calculate_success_rate
    AFTER INSERT OR UPDATE ON script_results
    FOR EACH ROW EXECUTE FUNCTION update_script_success_rate();