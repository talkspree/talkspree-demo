-- ============================================================================
-- GLOBAL ACTIVITY STATS FUNCTION
-- Returns counts of users looking for chat and currently chatting
-- Uses SECURITY DEFINER to bypass RLS and see all activity
-- ============================================================================

CREATE OR REPLACE FUNCTION get_global_activity_stats(
  p_user_id UUID,
  p_circle_id UUID DEFAULT NULL,
  p_role TEXT DEFAULT NULL
)
RETURNS TABLE (
  looking_for_chat_count INTEGER,
  currently_chatting_count INTEGER
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_looking_count INTEGER;
  v_chatting_count INTEGER;
BEGIN
  -- Count users in matchmaking queue (looking for chat)
  -- Apply circle and role filters
  SELECT COUNT(DISTINCT mq.user_id)
  INTO v_looking_count
  FROM matchmaking_queue mq
  INNER JOIN profiles p ON p.id = mq.user_id
  WHERE mq.status = 'waiting'
    AND mq.user_id != p_user_id
    -- Circle filter
    AND (
      (p_circle_id IS NULL AND mq.circle_id IS NULL) OR
      (p_circle_id IS NOT NULL AND mq.circle_id = p_circle_id)
    )
    -- Role filter (NULL or 'random' means no filter)
    AND (
      p_role IS NULL OR 
      p_role = 'random' OR 
      p.role = p_role
    );

  -- Count unique users in active calls (currently chatting)
  -- Apply circle and role filters
  SELECT COUNT(DISTINCT user_id)
  INTO v_chatting_count
  FROM (
    -- Get all users from ongoing calls (both caller and recipient)
    SELECT ch.caller_id AS user_id, ch.circle_id, p.role
    FROM call_history ch
    INNER JOIN profiles p ON p.id = ch.caller_id
    WHERE ch.status = 'ongoing'
      AND ch.caller_id != p_user_id
      -- Circle filter
      AND (
        (p_circle_id IS NULL AND ch.circle_id IS NULL) OR
        (p_circle_id IS NOT NULL AND ch.circle_id = p_circle_id)
      )
    
    UNION
    
    SELECT ch.recipient_id AS user_id, ch.circle_id, p.role
    FROM call_history ch
    INNER JOIN profiles p ON p.id = ch.recipient_id
    WHERE ch.status = 'ongoing'
      AND ch.recipient_id != p_user_id
      -- Circle filter
      AND (
        (p_circle_id IS NULL AND ch.circle_id IS NULL) OR
        (p_circle_id IS NOT NULL AND ch.circle_id = p_circle_id)
      )
  ) AS all_chatting_users
  WHERE (
    p_role IS NULL OR 
    p_role = 'random' OR 
    role = p_role
  );

  -- Return the counts
  looking_for_chat_count := COALESCE(v_looking_count, 0);
  currently_chatting_count := COALESCE(v_chatting_count, 0);
  
  RETURN NEXT;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_global_activity_stats(UUID, UUID, TEXT) TO authenticated;

-- ============================================================================
-- SIMPLIFIED GLOBAL STATS (NO FILTERS) FOR WAITING ROOM
-- Returns total activity regardless of filters
-- ============================================================================

CREATE OR REPLACE FUNCTION get_waiting_room_stats(p_user_id UUID)
RETURNS TABLE (
  waiting_count INTEGER,
  chatting_count INTEGER
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_waiting INTEGER;
  v_chatting INTEGER;
BEGIN
  -- Count all users waiting (excluding current user)
  SELECT COUNT(*)
  INTO v_waiting
  FROM matchmaking_queue
  WHERE status = 'waiting'
    AND user_id != p_user_id;

  -- Count unique users in active calls (excluding current user)
  SELECT COUNT(DISTINCT user_id)
  INTO v_chatting
  FROM (
    SELECT caller_id AS user_id
    FROM call_history
    WHERE status = 'ongoing'
      AND caller_id != p_user_id
    
    UNION
    
    SELECT recipient_id AS user_id
    FROM call_history
    WHERE status = 'ongoing'
      AND recipient_id != p_user_id
  ) AS all_users;

  waiting_count := COALESCE(v_waiting, 0);
  chatting_count := COALESCE(v_chatting, 0);
  
  RETURN NEXT;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_waiting_room_stats(UUID) TO authenticated;
