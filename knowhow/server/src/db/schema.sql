-- ノウハウ共有AI音声アシスタント - データベーススキーマ

-- Drop existing tables if they exist
DROP TABLE IF EXISTS usage_logs CASCADE;
DROP TABLE IF EXISTS voice_session_messages CASCADE;
DROP TABLE IF EXISTS voice_sessions CASCADE;
DROP TABLE IF EXISTS checklist_execution_items CASCADE;
DROP TABLE IF EXISTS checklist_executions CASCADE;
DROP TABLE IF EXISTS checklist_items CASCADE;
DROP TABLE IF EXISTS checklists CASCADE;
DROP TABLE IF EXISTS incident_cases CASCADE;
DROP TABLE IF EXISTS knowledge_tags CASCADE;
DROP TABLE IF EXISTS knowledge_items CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS sites CASCADE;

-- Create sites table
CREATE TABLE sites (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    location VARCHAR(500),
    description TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'suspended')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create users table
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'worker' CHECK (role IN ('worker', 'expert', 'site_manager', 'admin')),
    department VARCHAR(255),
    site_id INTEGER REFERENCES sites(id),
    manager_id INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create knowledge_items table
CREATE TABLE knowledge_items (
    id SERIAL PRIMARY KEY,
    title VARCHAR(500) NOT NULL,
    content TEXT NOT NULL,
    summary TEXT,
    category VARCHAR(50) NOT NULL DEFAULT 'procedure' CHECK (category IN ('procedure', 'safety', 'quality', 'cost', 'equipment', 'material')),
    work_type VARCHAR(255),
    risk_level VARCHAR(50) DEFAULT 'low' CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),
    author_id INTEGER NOT NULL REFERENCES users(id),
    status VARCHAR(50) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'review', 'published', 'archived')),
    approved_by INTEGER REFERENCES users(id),
    approved_at TIMESTAMP,
    version INTEGER NOT NULL DEFAULT 1,
    parent_id INTEGER REFERENCES knowledge_items(id),
    view_count INTEGER NOT NULL DEFAULT 0,
    useful_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create knowledge_tags table
CREATE TABLE knowledge_tags (
    id SERIAL PRIMARY KEY,
    knowledge_id INTEGER NOT NULL REFERENCES knowledge_items(id) ON DELETE CASCADE,
    tag_name VARCHAR(100) NOT NULL,
    auto_generated BOOLEAN NOT NULL DEFAULT false
);

-- Create incident_cases table
CREATE TABLE incident_cases (
    id SERIAL PRIMARY KEY,
    title VARCHAR(500) NOT NULL,
    description TEXT NOT NULL,
    cause TEXT,
    countermeasure TEXT,
    site_id INTEGER REFERENCES sites(id),
    work_type VARCHAR(255),
    severity VARCHAR(50) NOT NULL DEFAULT 'minor' CHECK (severity IN ('minor', 'moderate', 'serious', 'critical')),
    occurred_at DATE,
    reported_by INTEGER NOT NULL REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create checklists table
CREATE TABLE checklists (
    id SERIAL PRIMARY KEY,
    name VARCHAR(500) NOT NULL,
    work_type VARCHAR(255),
    description TEXT,
    created_by INTEGER NOT NULL REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create checklist_items table
CREATE TABLE checklist_items (
    id SERIAL PRIMARY KEY,
    checklist_id INTEGER NOT NULL REFERENCES checklists(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    priority VARCHAR(50) NOT NULL DEFAULT 'recommended' CHECK (priority IN ('required', 'recommended', 'optional')),
    related_knowledge_id INTEGER REFERENCES knowledge_items(id),
    order_index INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create voice_sessions table
CREATE TABLE voice_sessions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    mode VARCHAR(50) NOT NULL DEFAULT 'office' CHECK (mode IN ('office', 'field')),
    site_id INTEGER REFERENCES sites(id),
    work_type VARCHAR(255),
    title VARCHAR(100),
    status VARCHAR(50) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP
);

-- Create voice_session_messages table
CREATE TABLE voice_session_messages (
    id SERIAL PRIMARY KEY,
    session_id INTEGER NOT NULL REFERENCES voice_sessions(id) ON DELETE CASCADE,
    role VARCHAR(50) NOT NULL CHECK (role IN ('user', 'assistant')),
    content TEXT NOT NULL,
    audio_url VARCHAR(1000),
    confidence REAL,
    related_knowledge_ids TEXT[],
    order_index INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create usage_logs table
CREATE TABLE usage_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    knowledge_id INTEGER REFERENCES knowledge_items(id),
    action_type VARCHAR(50) NOT NULL CHECK (action_type IN ('view', 'search', 'voice_query', 'useful_mark', 'checklist_use')),
    context_site_id INTEGER REFERENCES sites(id),
    context_work_type VARCHAR(255),
    search_query TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_site_id ON users(site_id);
CREATE INDEX idx_users_manager_id ON users(manager_id);

CREATE INDEX idx_knowledge_items_category ON knowledge_items(category);
CREATE INDEX idx_knowledge_items_work_type ON knowledge_items(work_type);
CREATE INDEX idx_knowledge_items_status ON knowledge_items(status);
CREATE INDEX idx_knowledge_items_author_id ON knowledge_items(author_id);
CREATE INDEX idx_knowledge_items_risk_level ON knowledge_items(risk_level);

CREATE INDEX idx_knowledge_tags_knowledge_id ON knowledge_tags(knowledge_id);
CREATE INDEX idx_knowledge_tags_tag_name ON knowledge_tags(tag_name);

CREATE INDEX idx_incident_cases_work_type ON incident_cases(work_type);
CREATE INDEX idx_incident_cases_severity ON incident_cases(severity);
CREATE INDEX idx_incident_cases_site_id ON incident_cases(site_id);

CREATE INDEX idx_checklists_work_type ON checklists(work_type);

CREATE INDEX idx_voice_sessions_user_id ON voice_sessions(user_id);
CREATE INDEX idx_voice_sessions_status ON voice_sessions(status);

CREATE INDEX idx_voice_session_messages_session_id ON voice_session_messages(session_id);

CREATE INDEX idx_usage_logs_user_id ON usage_logs(user_id);
CREATE INDEX idx_usage_logs_action_type ON usage_logs(action_type);
CREATE INDEX idx_usage_logs_created_at ON usage_logs(created_at);

-- Create update timestamp trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sites_updated_at BEFORE UPDATE ON sites
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_knowledge_items_updated_at BEFORE UPDATE ON knowledge_items
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_incident_cases_updated_at BEFORE UPDATE ON incident_cases
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_checklists_updated_at BEFORE UPDATE ON checklists
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- チェックリスト実行記録
CREATE TABLE checklist_executions (
    id SERIAL PRIMARY KEY,
    checklist_id INTEGER NOT NULL REFERENCES checklists(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id),
    site_id INTEGER REFERENCES sites(id),
    total_items INTEGER NOT NULL DEFAULT 0,
    checked_items INTEGER NOT NULL DEFAULT 0,
    status VARCHAR(50) NOT NULL DEFAULT 'completed' CHECK (status IN ('in_progress', 'completed')),
    notes TEXT,
    completed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE checklist_execution_items (
    id SERIAL PRIMARY KEY,
    execution_id INTEGER NOT NULL REFERENCES checklist_executions(id) ON DELETE CASCADE,
    checklist_item_id INTEGER REFERENCES checklist_items(id),
    item_content TEXT NOT NULL,
    is_required BOOLEAN DEFAULT false,
    checked BOOLEAN NOT NULL DEFAULT false,
    note TEXT
);

CREATE INDEX idx_checklist_executions_checklist_id ON checklist_executions(checklist_id);
CREATE INDEX idx_checklist_executions_user_id ON checklist_executions(user_id);
