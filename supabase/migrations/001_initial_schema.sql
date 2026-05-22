-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- User profiles table
CREATE TABLE IF NOT EXISTS user_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    auth_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    age INTEGER NOT NULL DEFAULT 21,
    life_expectancy INTEGER NOT NULL DEFAULT 80,
    chronotype TEXT NOT NULL DEFAULT 'bear' CHECK (chronotype IN ('lion', 'bear', 'wolf', 'dolphin')),
    baseline_dws DECIMAL(10,2) NOT NULL DEFAULT 0,
    baseline_daily_minutes INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Sessions table (canonical source of truth)
CREATE TABLE IF NOT EXISTS sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
    protocol TEXT NOT NULL CHECK (protocol IN ('anchor', 'dive')),
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    status TEXT NOT NULL DEFAULT 'running' CHECK (status IN ('idle', 'running', 'paused', 'completed', 'aborted')),
    total_deep_minutes INTEGER NOT NULL DEFAULT 0,
    interruption_count INTEGER NOT NULL DEFAULT 0,
    self_reported_focus INTEGER CHECK (self_reported_focus BETWEEN 1 AND 10),
    micro_pauses_delivered INTEGER NOT NULL DEFAULT 0,
    micro_pauses_missed INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Phases table (individual phase tracking)
CREATE TABLE IF NOT EXISTS phases (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
    phase_index INTEGER NOT NULL,
    phase_type TEXT NOT NULL CHECK (phase_type IN ('sensory_reset', 'visual_priming', 'sprint', 'micro_rest', 'deep_block', 'trough')),
    planned_duration_ms INTEGER NOT NULL,
    actual_duration_ms INTEGER,
    started_at TIMESTAMPTZ,
    ended_at TIMESTAMPTZ,
    completed BOOLEAN NOT NULL DEFAULT FALSE,
    skipped BOOLEAN NOT NULL DEFAULT FALSE,
    server_timestamp_end BIGINT, -- authoritative Unix ms
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Analytics snapshots (daily aggregations)
CREATE TABLE IF NOT EXISTS analytics_snapshots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    dws DECIMAL(10,2) NOT NULL DEFAULT 0,
    efficiency_ratio DECIMAL(5,4) NOT NULL DEFAULT 0,
    vs_baseline_multiplier DECIMAL(5,2) NOT NULL DEFAULT 1.00,
    daily_growth_rate DECIMAL(5,4),
    lifetime_hours_banked DECIMAL(10,2) NOT NULL DEFAULT 0,
    productive_years_saved DECIMAL(5,2) NOT NULL DEFAULT 0,
    waking_life_saved DECIMAL(5,2) NOT NULL DEFAULT 0,
    trough_compliance_pct DECIMAL(5,2) NOT NULL DEFAULT 0,
    micro_pause_fidelity_pct DECIMAL(5,2),
    sessions_completed INTEGER NOT NULL DEFAULT 0,
    total_deep_minutes INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, date)
);

-- Push subscription table for Web Push
CREATE TABLE IF NOT EXISTS push_subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
    endpoint TEXT NOT NULL,
    p256dh TEXT NOT NULL,
    auth TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Scheduled phase boundaries (Macro Orchestrator queue)
CREATE TABLE IF NOT EXISTS scheduled_boundaries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
    phase_id UUID REFERENCES phases(id) ON DELETE CASCADE,
    target_timestamp BIGINT NOT NULL, -- Unix ms
    notification_sent BOOLEAN NOT NULL DEFAULT FALSE,
    notification_sent_at TIMESTAMPTZ,
    ack_received BOOLEAN NOT NULL DEFAULT FALSE,
    ack_received_at TIMESTAMPTZ,
    fallback_triggered BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_status ON sessions(status);
CREATE INDEX IF NOT EXISTS idx_phases_session_id ON phases(session_id);
CREATE INDEX IF NOT EXISTS idx_analytics_user_date ON analytics_snapshots(user_id, date);
CREATE INDEX IF NOT EXISTS idx_scheduled_boundaries_target ON scheduled_boundaries(target_timestamp);
CREATE INDEX IF NOT EXISTS idx_scheduled_boundaries_session ON scheduled_boundaries(session_id);

-- Row Level Security policies
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE phases ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE scheduled_boundaries ENABLE ROW LEVEL SECURITY;

-- Users can only see their own data
CREATE POLICY "Users own their profile" ON user_profiles
    FOR ALL USING (auth.uid() = auth_user_id);

CREATE POLICY "Users own their sessions" ON sessions
    FOR ALL USING (user_id IN (SELECT id FROM user_profiles WHERE auth_user_id = auth.uid()));

CREATE POLICY "Users own their phases" ON phases
    FOR ALL USING (session_id IN (SELECT id FROM sessions WHERE user_id IN (SELECT id FROM user_profiles WHERE auth_user_id = auth.uid())));

CREATE POLICY "Users own their analytics" ON analytics_snapshots
    FOR ALL USING (user_id IN (SELECT id FROM user_profiles WHERE auth_user_id = auth.uid()));

CREATE POLICY "Users own their push subs" ON push_subscriptions
    FOR ALL USING (user_id IN (SELECT id FROM user_profiles WHERE auth_user_id = auth.uid()));

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON user_profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_analytics_snapshots_updated_at BEFORE UPDATE ON analytics_snapshots
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
