-- Druygon AI Learning MVP Schema
-- Migration: 001_ai_learning_mvp.sql
-- Date: 2026-03-29
-- Schema: druygon (database: livininbintaro)

-- 1. Learners
CREATE TABLE IF NOT EXISTS druygon.learners (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    age INTEGER,
    grade INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Learner Profiles (learning preferences)
CREATE TABLE IF NOT EXISTS druygon.learner_profiles (
    learner_id UUID PRIMARY KEY REFERENCES druygon.learners(id) ON DELETE CASCADE,
    preferred_session_minutes INTEGER DEFAULT 15,
    preferred_modes JSONB DEFAULT '["visual","chat","step_by_step"]'::jsonb,
    frustration_signals JSONB DEFAULT '["diam","bilang bingung","asal jawab"]'::jsonb,
    engagement_signals JSONB DEFAULT '["mau coba terus","excited","cari reward"]'::jsonb,
    narrative_memory JSONB DEFAULT '{}'::jsonb,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Topic Mastery
CREATE TABLE IF NOT EXISTS druygon.topic_mastery (
    learner_id UUID REFERENCES druygon.learners(id) ON DELETE CASCADE,
    topic_id TEXT NOT NULL,
    status TEXT DEFAULT 'locked',
    confidence_score FLOAT DEFAULT 0.0,
    times_practiced INTEGER DEFAULT 0,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (learner_id, topic_id)
);

-- 4. Learning Sessions
CREATE TABLE IF NOT EXISTS druygon.learning_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    learner_id UUID REFERENCES druygon.learners(id) ON DELETE CASCADE,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    ended_at TIMESTAMP WITH TIME ZONE,
    mood_start TEXT,
    engagement_level TEXT DEFAULT 'neutral',
    active_mission_id TEXT,
    status TEXT DEFAULT 'active'
);

-- 5. Session Events (unified log: messages, hints, errors, rewards)
CREATE TABLE IF NOT EXISTS druygon.session_events (
    id SERIAL PRIMARY KEY,
    session_id UUID REFERENCES druygon.learning_sessions(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL,
    event_payload JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6. Rewards Catalog (seeded)
CREATE TABLE IF NOT EXISTS druygon.rewards (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    rarity TEXT DEFAULT 'common',
    metadata JSONB DEFAULT '{}'::jsonb
);

-- 7. Missions Catalog (seeded)
CREATE TABLE IF NOT EXISTS druygon.missions (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    objective_config JSONB NOT NULL,
    reward_id TEXT REFERENCES druygon.rewards(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 8. Mission Progress
CREATE TABLE IF NOT EXISTS druygon.mission_progress (
    learner_id UUID REFERENCES druygon.learners(id) ON DELETE CASCADE,
    mission_id TEXT REFERENCES druygon.missions(id),
    status TEXT DEFAULT 'in_progress',
    progress_data JSONB DEFAULT '{}'::jsonb,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (learner_id, mission_id)
);

-- 9. Learner Inventory (reward persistence — CRITICAL)
CREATE TABLE IF NOT EXISTS druygon.learner_inventory (
    id SERIAL PRIMARY KEY,
    learner_id UUID REFERENCES druygon.learners(id) ON DELETE CASCADE,
    reward_id TEXT REFERENCES druygon.rewards(id),
    unlocked_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    source_mission_id TEXT,
    UNIQUE(learner_id, reward_id)
);

-- 10. Parent Controls
CREATE TABLE IF NOT EXISTS druygon.parent_controls (
    learner_id UUID PRIMARY KEY REFERENCES druygon.learners(id) ON DELETE CASCADE,
    overrides JSONB DEFAULT '{}'::jsonb,
    last_updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 11. Session Summaries
CREATE TABLE IF NOT EXISTS druygon.session_summaries (
    session_id UUID PRIMARY KEY REFERENCES druygon.learning_sessions(id) ON DELETE CASCADE,
    learner_id UUID REFERENCES druygon.learners(id) ON DELETE CASCADE,
    summary_text TEXT,
    topics_played JSONB DEFAULT '[]'::jsonb,
    topics_understood JSONB DEFAULT '[]'::jsonb,
    topics_confusing JSONB DEFAULT '[]'::jsonb,
    red_flags JSONB DEFAULT '[]'::jsonb,
    next_recommendation TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- SEED DATA
-- ============================================================

-- Seed: First reward for KPK mission
INSERT INTO druygon.rewards (id, name, rarity, metadata)
VALUES ('kpk_badge_1', 'KPK Explorer Badge', 'common', '{"icon": "badge-star", "type": "badge"}')
ON CONFLICT DO NOTHING;

-- Seed: First mission (KPK only)
INSERT INTO druygon.missions (id, title, description, objective_config, reward_id)
VALUES (
    'kpk_mission_1',
    'Petualangan KPK: Kode Rahasia Hutan',
    'Bantu detektif Dru memecahkan kode rahasia dengan menemukan KPK dari angka-angka misterius!',
    '{"topic": "kpk", "required_correct": 5, "mastery_threshold": 0.7}'::jsonb,
    'kpk_badge_1'
)
ON CONFLICT DO NOTHING;

-- Seed: Dru learner profile
INSERT INTO druygon.learners (id, name, age, grade)
VALUES ('00000000-0000-0000-0000-000000000001', 'Dru', 9, 4)
ON CONFLICT DO NOTHING;

INSERT INTO druygon.learner_profiles (learner_id)
VALUES ('00000000-0000-0000-0000-000000000001')
ON CONFLICT DO NOTHING;

-- Seed: Topic mastery states for Dru
INSERT INTO druygon.topic_mastery (learner_id, topic_id, status, confidence_score)
VALUES
    ('00000000-0000-0000-0000-000000000001', 'kpk', 'learning', 0.1),
    ('00000000-0000-0000-0000-000000000001', 'fpb', 'learning', 0.1),
    ('00000000-0000-0000-0000-000000000001', 'perkalian', 'learning', 0.3),
    ('00000000-0000-0000-0000-000000000001', 'pembagian', 'learning', 0.2),
    ('00000000-0000-0000-0000-000000000001', 'pecahan', 'locked', 0.0),
    ('00000000-0000-0000-0000-000000000001', 'geometri', 'locked', 0.0)
ON CONFLICT DO NOTHING;

-- Seed: Parent controls for Dru
INSERT INTO druygon.parent_controls (learner_id, overrides)
VALUES (
    '00000000-0000-0000-0000-000000000001',
    '{"allowed_topics": ["kpk","fpb","perkalian","pembagian"], "locked_topics": ["pecahan","geometri"], "force_easier": false, "daily_limit_mins": 30}'::jsonb
)
ON CONFLICT DO NOTHING;
