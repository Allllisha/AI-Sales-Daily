-- ヒアリング設定テーブルの作成

-- ヒアリング設定テーブル
CREATE TABLE IF NOT EXISTS hearing_settings (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    
    -- 基本設定
    greeting TEXT DEFAULT 'お疲れ様です！今日はどんな一日でしたか？',
    input_mode VARCHAR(20) DEFAULT 'voice' CHECK (input_mode IN ('voice', 'text', 'both')),
    max_questions INTEGER DEFAULT 5 CHECK (max_questions >= 3 AND max_questions <= 10),
    time_per_question INTEGER DEFAULT 30 CHECK (time_per_question >= 10 AND time_per_question <= 60),
    
    -- 質問設定
    question_template VARCHAR(50) DEFAULT 'default',
    custom_questions JSONB DEFAULT '[]'::jsonb,
    /* 構造例:
    [
        {
            "text": "本日訪問された顧客はどちらでしたか？",
            "targetSlot": "customer",
            "required": true,
            "order": 1
        },
        {
            "text": "どのような商談内容でしたか？",
            "targetSlot": "project",
            "required": true,
            "order": 2
        }
    ]
    */
    
    -- 収集情報設定
    required_slots TEXT[] DEFAULT ARRAY['customer', 'project', 'next_action'],
    optional_slots TEXT[] DEFAULT ARRAY['budget', 'schedule', 'participants', 'location', 'issues'],
    
    -- 高度な設定
    enable_follow_up BOOLEAN DEFAULT true,
    follow_up_threshold DECIMAL(3,2) DEFAULT 0.70,
    enable_smart_skip BOOLEAN DEFAULT true,
    
    -- 利用統計
    usage_count INTEGER DEFAULT 0,
    last_used_at TIMESTAMP,
    
    -- デフォルト設定フラグ
    is_default BOOLEAN DEFAULT false,
    
    -- メタデータ
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ヒアリングセッションテーブル（実行履歴）
CREATE TABLE IF NOT EXISTS hearing_sessions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    setting_id INTEGER REFERENCES hearing_settings(id) ON DELETE SET NULL,
    report_id INTEGER REFERENCES reports(id) ON DELETE CASCADE,
    
    -- セッション情報
    session_start TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    session_end TIMESTAMP,
    session_duration INTEGER, -- 秒
    
    -- 質問と回答の履歴
    qa_history JSONB DEFAULT '[]'::jsonb,
    /* 構造例:
    [
        {
            "question": "本日訪問された顧客はどちらでしたか？",
            "answer": "ABC商事です",
            "timestamp": "2024-01-01T10:00:00Z",
            "slot": "customer",
            "confidence": 0.95
        }
    ]
    */
    
    -- 収集されたデータ
    collected_slots JSONB DEFAULT '{}'::jsonb,
    missing_slots TEXT[],
    
    -- 評価
    completion_rate DECIMAL(5,2), -- 完了率
    user_satisfaction INTEGER CHECK (user_satisfaction >= 1 AND user_satisfaction <= 5),
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_hearing_settings_user_id ON hearing_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_hearing_settings_is_default ON hearing_settings(is_default);
CREATE INDEX IF NOT EXISTS idx_hearing_sessions_user_id ON hearing_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_hearing_sessions_setting_id ON hearing_sessions(setting_id);
CREATE INDEX IF NOT EXISTS idx_hearing_sessions_report_id ON hearing_sessions(report_id);

-- トリガー設定
CREATE OR REPLACE FUNCTION update_hearing_settings_updated_at() 
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_hearing_settings_updated_at ON hearing_settings;
CREATE TRIGGER update_hearing_settings_updated_at 
    BEFORE UPDATE ON hearing_settings
    FOR EACH ROW EXECUTE FUNCTION update_hearing_settings_updated_at();

-- ユーザーごとにデフォルト設定は1つまでの制約
CREATE OR REPLACE FUNCTION enforce_single_default_setting() 
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.is_default = true THEN
        UPDATE hearing_settings 
        SET is_default = false 
        WHERE user_id = NEW.user_id AND id != NEW.id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS enforce_single_default_setting ON hearing_settings;
CREATE TRIGGER enforce_single_default_setting
    BEFORE INSERT OR UPDATE ON hearing_settings
    FOR EACH ROW 
    WHEN (NEW.is_default = true)
    EXECUTE FUNCTION enforce_single_default_setting();