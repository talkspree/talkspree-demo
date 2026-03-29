-- ============================================================================
-- SEED DEFAULT TOPICS AND PRESETS
-- Test data: 10 topics with 10 questions each, 4 presets with 2 topics each
-- ============================================================================

-- ============================================================================
-- INSERT DEFAULT TOPICS (Topics 1-10)
-- Each topic has 10 questions embedded as JSONB array
-- ============================================================================

INSERT INTO default_topics (id, name, description, questions, display_order, is_active)
VALUES 
    (
        '11111111-0001-0000-0000-000000000001', 
        'Topic 1', 
        'Sample topic 1 for testing', 
        '["Topic 1, Question 1", "Topic 1, Question 2", "Topic 1, Question 3", "Topic 1, Question 4", "Topic 1, Question 5", "Topic 1, Question 6", "Topic 1, Question 7", "Topic 1, Question 8", "Topic 1, Question 9", "Topic 1, Question 10"]'::JSONB,
        1, 
        TRUE
    ),
    (
        '11111111-0002-0000-0000-000000000002', 
        'Topic 2', 
        'Sample topic 2 for testing', 
        '["Topic 2, Question 1", "Topic 2, Question 2", "Topic 2, Question 3", "Topic 2, Question 4", "Topic 2, Question 5", "Topic 2, Question 6", "Topic 2, Question 7", "Topic 2, Question 8", "Topic 2, Question 9", "Topic 2, Question 10"]'::JSONB,
        2, 
        TRUE
    ),
    (
        '11111111-0003-0000-0000-000000000003', 
        'Topic 3', 
        'Sample topic 3 for testing', 
        '["Topic 3, Question 1", "Topic 3, Question 2", "Topic 3, Question 3", "Topic 3, Question 4", "Topic 3, Question 5", "Topic 3, Question 6", "Topic 3, Question 7", "Topic 3, Question 8", "Topic 3, Question 9", "Topic 3, Question 10"]'::JSONB,
        3, 
        TRUE
    ),
    (
        '11111111-0004-0000-0000-000000000004', 
        'Topic 4', 
        'Sample topic 4 for testing', 
        '["Topic 4, Question 1", "Topic 4, Question 2", "Topic 4, Question 3", "Topic 4, Question 4", "Topic 4, Question 5", "Topic 4, Question 6", "Topic 4, Question 7", "Topic 4, Question 8", "Topic 4, Question 9", "Topic 4, Question 10"]'::JSONB,
        4, 
        TRUE
    ),
    (
        '11111111-0005-0000-0000-000000000005', 
        'Topic 5', 
        'Sample topic 5 for testing', 
        '["Topic 5, Question 1", "Topic 5, Question 2", "Topic 5, Question 3", "Topic 5, Question 4", "Topic 5, Question 5", "Topic 5, Question 6", "Topic 5, Question 7", "Topic 5, Question 8", "Topic 5, Question 9", "Topic 5, Question 10"]'::JSONB,
        5, 
        TRUE
    ),
    (
        '11111111-0006-0000-0000-000000000006', 
        'Topic 6', 
        'Sample topic 6 for testing', 
        '["Topic 6, Question 1", "Topic 6, Question 2", "Topic 6, Question 3", "Topic 6, Question 4", "Topic 6, Question 5", "Topic 6, Question 6", "Topic 6, Question 7", "Topic 6, Question 8", "Topic 6, Question 9", "Topic 6, Question 10"]'::JSONB,
        6, 
        TRUE
    ),
    (
        '11111111-0007-0000-0000-000000000007', 
        'Topic 7', 
        'Sample topic 7 for testing', 
        '["Topic 7, Question 1", "Topic 7, Question 2", "Topic 7, Question 3", "Topic 7, Question 4", "Topic 7, Question 5", "Topic 7, Question 6", "Topic 7, Question 7", "Topic 7, Question 8", "Topic 7, Question 9", "Topic 7, Question 10"]'::JSONB,
        7, 
        TRUE
    ),
    (
        '11111111-0008-0000-0000-000000000008', 
        'Topic 8', 
        'Sample topic 8 for testing', 
        '["Topic 8, Question 1", "Topic 8, Question 2", "Topic 8, Question 3", "Topic 8, Question 4", "Topic 8, Question 5", "Topic 8, Question 6", "Topic 8, Question 7", "Topic 8, Question 8", "Topic 8, Question 9", "Topic 8, Question 10"]'::JSONB,
        8, 
        TRUE
    ),
    (
        '11111111-0009-0000-0000-000000000009', 
        'Topic 9', 
        'Sample topic 9 for testing', 
        '["Topic 9, Question 1", "Topic 9, Question 2", "Topic 9, Question 3", "Topic 9, Question 4", "Topic 9, Question 5", "Topic 9, Question 6", "Topic 9, Question 7", "Topic 9, Question 8", "Topic 9, Question 9", "Topic 9, Question 10"]'::JSONB,
        9, 
        TRUE
    ),
    (
        '11111111-0010-0000-0000-000000000010', 
        'Topic 10', 
        'Sample topic 10 for testing', 
        '["Topic 10, Question 1", "Topic 10, Question 2", "Topic 10, Question 3", "Topic 10, Question 4", "Topic 10, Question 5", "Topic 10, Question 6", "Topic 10, Question 7", "Topic 10, Question 8", "Topic 10, Question 9", "Topic 10, Question 10"]'::JSONB,
        10, 
        TRUE
    );

-- ============================================================================
-- INSERT DEFAULT PRESETS (4 presets, 2 topics each)
-- Preset 1: Topic 1 + Topic 2
-- Preset 2: Topic 3 + Topic 4
-- Preset 3: Topic 5 + Topic 6
-- Preset 4: Topic 7 + Topic 8
-- Spare topics: Topic 9, Topic 10 (not in any preset)
-- ============================================================================

INSERT INTO default_presets (id, name, description, topic_ids, display_order, is_active)
VALUES 
    (
        '22222222-0001-0000-0000-000000000001', 
        'Preset 1', 
        'Contains Topic 1 and Topic 2', 
        ARRAY['11111111-0001-0000-0000-000000000001'::UUID, '11111111-0002-0000-0000-000000000002'::UUID],
        1, 
        TRUE
    ),
    (
        '22222222-0002-0000-0000-000000000002', 
        'Preset 2', 
        'Contains Topic 3 and Topic 4', 
        ARRAY['11111111-0003-0000-0000-000000000003'::UUID, '11111111-0004-0000-0000-000000000004'::UUID],
        2, 
        TRUE
    ),
    (
        '22222222-0003-0000-0000-000000000003', 
        'Preset 3', 
        'Contains Topic 5 and Topic 6', 
        ARRAY['11111111-0005-0000-0000-000000000005'::UUID, '11111111-0006-0000-0000-000000000006'::UUID],
        3, 
        TRUE
    ),
    (
        '22222222-0004-0000-0000-000000000004', 
        'Preset 4', 
        'Contains Topic 7 and Topic 8', 
        ARRAY['11111111-0007-0000-0000-000000000007'::UUID, '11111111-0008-0000-0000-000000000008'::UUID],
        4, 
        TRUE
    );

-- ============================================================================
-- SUMMARY:
-- 
-- default_topics: 10 rows
--   - Topic 1 through Topic 10
--   - Each has 10 questions embedded as JSONB array
--   - Total: 100 questions
--
-- default_presets: 4 rows
--   - Preset 1: Topic 1 + Topic 2 (20 questions)
--   - Preset 2: Topic 3 + Topic 4 (20 questions)
--   - Preset 3: Topic 5 + Topic 6 (20 questions)
--   - Preset 4: Topic 7 + Topic 8 (20 questions)
--
-- Spare topics not in any preset: Topic 9, Topic 10
-- ============================================================================
