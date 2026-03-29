-- ============================================================================
-- TOPICS AND PRESETS SYSTEM - CLEAN ARCHITECTURE
-- 
-- Structure:
-- - default_topics / default_presets: Immutable defaults, seeded once
-- - circle_topics / circle_presets: Circle-specific, created by circle admins
-- - user_topics / user_presets: Personal, created by individual users
--
-- Questions are embedded as JSONB arrays for simplicity.
-- ============================================================================

-- ============================================================================
-- DEFAULT TOPICS TABLE
-- Immutable global topics available to everyone
-- ============================================================================
CREATE TABLE default_topics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    questions JSONB NOT NULL DEFAULT '[]',  -- Array of question strings
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_default_topics_active ON default_topics(is_active) WHERE is_active = TRUE;
CREATE INDEX idx_default_topics_order ON default_topics(display_order);

-- ============================================================================
-- DEFAULT PRESETS TABLE
-- Immutable global presets combining default topics
-- ============================================================================
CREATE TABLE default_presets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    topic_ids UUID[] NOT NULL DEFAULT '{}',  -- References default_topics.id
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_default_presets_active ON default_presets(is_active) WHERE is_active = TRUE;
CREATE INDEX idx_default_presets_order ON default_presets(display_order);

-- ============================================================================
-- CIRCLE TOPICS TABLE
-- Custom topics created by circle admins, visible to all circle members
-- ============================================================================
CREATE TABLE circle_topics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    circle_id UUID NOT NULL REFERENCES circles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    questions JSONB NOT NULL DEFAULT '[]',  -- Array of question strings
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(circle_id, name)
);

CREATE INDEX idx_circle_topics_circle ON circle_topics(circle_id);
CREATE INDEX idx_circle_topics_active ON circle_topics(circle_id, is_active) WHERE is_active = TRUE;

-- ============================================================================
-- CIRCLE PRESETS TABLE
-- Custom presets created by circle admins
-- Can reference both default_topics AND circle_topics
-- ============================================================================
CREATE TABLE circle_presets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    circle_id UUID NOT NULL REFERENCES circles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    default_topic_ids UUID[] DEFAULT '{}',  -- References default_topics.id
    circle_topic_ids UUID[] DEFAULT '{}',   -- References circle_topics.id
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(circle_id, name)
);

CREATE INDEX idx_circle_presets_circle ON circle_presets(circle_id);
CREATE INDEX idx_circle_presets_active ON circle_presets(circle_id, is_active) WHERE is_active = TRUE;

-- ============================================================================
-- USER TOPICS TABLE
-- Personal topics created by individual users, only visible to them
-- ============================================================================
CREATE TABLE user_topics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    questions JSONB NOT NULL DEFAULT '[]',  -- Array of question strings
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, name)
);

CREATE INDEX idx_user_topics_user ON user_topics(user_id);
CREATE INDEX idx_user_topics_active ON user_topics(user_id, is_active) WHERE is_active = TRUE;

-- ============================================================================
-- USER PRESETS TABLE
-- Personal presets created by individual users
-- Can reference default_topics, circle_topics (if member), and user_topics
-- Also stores custom questions directly (editable by user)
-- ============================================================================
CREATE TABLE user_presets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    default_topic_ids UUID[] DEFAULT '{}',  -- References default_topics.id
    circle_topic_ids UUID[] DEFAULT '{}',   -- References circle_topics.id (must be member)
    user_topic_ids UUID[] DEFAULT '{}',     -- References user_topics.id (own topics)
    custom_questions JSONB DEFAULT '[]',    -- User's own questions (editable, not a frozen topic)
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, name)
);

CREATE INDEX idx_user_presets_user ON user_presets(user_id);
CREATE INDEX idx_user_presets_active ON user_presets(user_id, is_active) WHERE is_active = TRUE;

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE default_topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE default_presets ENABLE ROW LEVEL SECURITY;
ALTER TABLE circle_topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE circle_presets ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_presets ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- DEFAULT TOPICS/PRESETS RLS
-- Read-only for all authenticated users, write for super admins only
-- ============================================================================

CREATE POLICY "Anyone can read default topics"
    ON default_topics FOR SELECT
    TO authenticated
    USING (is_active = TRUE);

CREATE POLICY "Super admins can manage default topics"
    ON default_topics FOR ALL
    TO authenticated
    USING (is_super_admin(auth.uid()));

CREATE POLICY "Anyone can read default presets"
    ON default_presets FOR SELECT
    TO authenticated
    USING (is_active = TRUE);

CREATE POLICY "Super admins can manage default presets"
    ON default_presets FOR ALL
    TO authenticated
    USING (is_super_admin(auth.uid()));

-- ============================================================================
-- CIRCLE TOPICS/PRESETS RLS
-- Readable by circle members, writable by circle admins
-- ============================================================================

CREATE POLICY "Circle members can read circle topics"
    ON circle_topics FOR SELECT
    TO authenticated
    USING (
        is_active = TRUE
        AND EXISTS (
            SELECT 1 FROM circle_members cm
            WHERE cm.circle_id = circle_topics.circle_id
            AND cm.user_id = auth.uid()
            AND cm.status = 'active'
        )
    );

CREATE POLICY "Circle admins can manage circle topics"
    ON circle_topics FOR ALL
    TO authenticated
    USING (
        has_circle_admin_access(auth.uid(), circle_id)
        OR is_super_admin(auth.uid())
    );

CREATE POLICY "Circle members can read circle presets"
    ON circle_presets FOR SELECT
    TO authenticated
    USING (
        is_active = TRUE
        AND EXISTS (
            SELECT 1 FROM circle_members cm
            WHERE cm.circle_id = circle_presets.circle_id
            AND cm.user_id = auth.uid()
            AND cm.status = 'active'
        )
    );

CREATE POLICY "Circle admins can manage circle presets"
    ON circle_presets FOR ALL
    TO authenticated
    USING (
        has_circle_admin_access(auth.uid(), circle_id)
        OR is_super_admin(auth.uid())
    );

-- ============================================================================
-- USER TOPICS/PRESETS RLS
-- Only accessible by the owner
-- ============================================================================

CREATE POLICY "Users can read own topics"
    ON user_topics FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

CREATE POLICY "Users can manage own topics"
    ON user_topics FOR ALL
    TO authenticated
    USING (user_id = auth.uid());

CREATE POLICY "Users can read own presets"
    ON user_presets FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

CREATE POLICY "Users can manage own presets"
    ON user_presets FOR ALL
    TO authenticated
    USING (user_id = auth.uid());

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Update timestamp triggers
CREATE TRIGGER update_circle_topics_updated_at 
    BEFORE UPDATE ON circle_topics
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_circle_presets_updated_at 
    BEFORE UPDATE ON circle_presets
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_topics_updated_at 
    BEFORE UPDATE ON user_topics
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_presets_updated_at 
    BEFORE UPDATE ON user_presets
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Get all questions from a default preset (flattened)
CREATE OR REPLACE FUNCTION get_default_preset_questions(p_preset_id UUID)
RETURNS TABLE (question TEXT, topic_name TEXT) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        q.value::TEXT AS question,
        t.name AS topic_name
    FROM default_presets p
    CROSS JOIN LATERAL unnest(p.topic_ids) AS topic_id
    JOIN default_topics t ON t.id = topic_id
    CROSS JOIN LATERAL jsonb_array_elements_text(t.questions) AS q(value)
    WHERE p.id = p_preset_id
    AND t.is_active = TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get all questions from a circle preset (combines default + circle topics)
CREATE OR REPLACE FUNCTION get_circle_preset_questions(p_preset_id UUID)
RETURNS TABLE (question TEXT, topic_name TEXT, topic_type TEXT) AS $$
BEGIN
    RETURN QUERY
    -- Default topics in this preset
    SELECT 
        q.value::TEXT AS question,
        t.name AS topic_name,
        'default'::TEXT AS topic_type
    FROM circle_presets p
    CROSS JOIN LATERAL unnest(p.default_topic_ids) AS topic_id
    JOIN default_topics t ON t.id = topic_id
    CROSS JOIN LATERAL jsonb_array_elements_text(t.questions) AS q(value)
    WHERE p.id = p_preset_id
    AND t.is_active = TRUE
    
    UNION ALL
    
    -- Circle topics in this preset
    SELECT 
        q.value::TEXT AS question,
        ct.name AS topic_name,
        'circle'::TEXT AS topic_type
    FROM circle_presets p
    CROSS JOIN LATERAL unnest(p.circle_topic_ids) AS topic_id
    JOIN circle_topics ct ON ct.id = topic_id
    CROSS JOIN LATERAL jsonb_array_elements_text(ct.questions) AS q(value)
    WHERE p.id = p_preset_id
    AND ct.is_active = TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get all questions from a user preset (combines default + circle + user topics)
CREATE OR REPLACE FUNCTION get_user_preset_questions(p_preset_id UUID)
RETURNS TABLE (question TEXT, topic_name TEXT, topic_type TEXT) AS $$
BEGIN
    RETURN QUERY
    -- Default topics
    SELECT 
        q.value::TEXT AS question,
        t.name AS topic_name,
        'default'::TEXT AS topic_type
    FROM user_presets p
    CROSS JOIN LATERAL unnest(p.default_topic_ids) AS topic_id
    JOIN default_topics t ON t.id = topic_id
    CROSS JOIN LATERAL jsonb_array_elements_text(t.questions) AS q(value)
    WHERE p.id = p_preset_id
    AND t.is_active = TRUE
    
    UNION ALL
    
    -- Circle topics (if user is member of the circle)
    SELECT 
        q.value::TEXT AS question,
        ct.name AS topic_name,
        'circle'::TEXT AS topic_type
    FROM user_presets p
    CROSS JOIN LATERAL unnest(p.circle_topic_ids) AS topic_id
    JOIN circle_topics ct ON ct.id = topic_id
    CROSS JOIN LATERAL jsonb_array_elements_text(ct.questions) AS q(value)
    WHERE p.id = p_preset_id
    AND ct.is_active = TRUE
    AND EXISTS (
        SELECT 1 FROM circle_members cm
        WHERE cm.circle_id = ct.circle_id
        AND cm.user_id = p.user_id
        AND cm.status = 'active'
    )
    
    UNION ALL
    
    -- User's own topics
    SELECT 
        q.value::TEXT AS question,
        ut.name AS topic_name,
        'user'::TEXT AS topic_type
    FROM user_presets p
    CROSS JOIN LATERAL unnest(p.user_topic_ids) AS topic_id
    JOIN user_topics ut ON ut.id = topic_id
    CROSS JOIN LATERAL jsonb_array_elements_text(ut.questions) AS q(value)
    WHERE p.id = p_preset_id
    AND ut.is_active = TRUE
    AND ut.user_id = p.user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get random questions from any preset type
CREATE OR REPLACE FUNCTION get_random_preset_questions(
    p_preset_id UUID,
    p_preset_type TEXT,  -- 'default', 'circle', 'user'
    p_count INTEGER DEFAULT 10
)
RETURNS TABLE (question TEXT, topic_name TEXT) AS $$
BEGIN
    IF p_preset_type = 'default' THEN
        RETURN QUERY
        SELECT q.question, q.topic_name
        FROM get_default_preset_questions(p_preset_id) q
        ORDER BY RANDOM()
        LIMIT p_count;
    ELSIF p_preset_type = 'circle' THEN
        RETURN QUERY
        SELECT q.question, q.topic_name
        FROM get_circle_preset_questions(p_preset_id) q
        ORDER BY RANDOM()
        LIMIT p_count;
    ELSIF p_preset_type = 'user' THEN
        RETURN QUERY
        SELECT q.question, q.topic_name
        FROM get_user_preset_questions(p_preset_id) q
        ORDER BY RANDOM()
        LIMIT p_count;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
