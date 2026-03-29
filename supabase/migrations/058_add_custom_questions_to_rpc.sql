-- ============================================================================
-- UPDATE get_user_preset_questions TO INCLUDE CUSTOM_QUESTIONS
-- Adds support for loading custom questions from user_presets
-- ============================================================================

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
    AND ut.user_id = p.user_id
    
    UNION ALL
    
    -- Custom questions (stored directly on the preset)
    SELECT 
        q.value::TEXT AS question,
        'Custom'::TEXT AS topic_name,
        'custom'::TEXT AS topic_type
    FROM user_presets p
    CROSS JOIN LATERAL jsonb_array_elements_text(p.custom_questions) AS q(value)
    WHERE p.id = p_preset_id
    AND p.custom_questions IS NOT NULL
    AND jsonb_array_length(p.custom_questions) > 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_user_preset_questions(UUID) IS 
'Gets all questions for a user preset including default topics, circle topics, user topics, and custom questions';
