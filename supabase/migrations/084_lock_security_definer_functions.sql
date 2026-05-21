-- 084 — SECURITY FIX (High H5 + SECURITY DEFINER hardening)
--
-- Problem (verified live): every SECURITY DEFINER function in public had EXECUTE
-- granted to anon, and several trusted caller-supplied user-id arguments instead of
-- auth.uid():
--   * add_mutual_contact(p_user_id, p_contact_user_id, ...) — force a contact link
--     between arbitrary users (then bypass the send_direct_message contact gate) and
--     copy an arbitrary call's chat into direct_messages.
--   * attempt_match(current_user_id, ...) — drive matchmaking / set profiles.in_call
--     for arbitrary users.
--
-- Fix: (a) revoke anon EXECUTE on all public functions except the few genuinely
-- needed pre-login, and (b) enforce auth.uid() inside the id-trusting functions.

-- (a) Remove anon EXECUTE everywhere except the pre-login invite previews and the
--     server-side email verification RPC. The app calls every other RPC as an
--     authenticated user, so authenticated grants are left intact.
DO $$
DECLARE
  r RECORD;
  keep text[] := ARRAY[
    'get_inviter_by_slug',
    'get_circle_by_abbreviation',
    'verify_email_with_code'
  ];
BEGIN
  FOR r IN
    SELECT p.proname, pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.prokind = 'f'
      AND NOT (p.proname = ANY(keep))
  LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION public.%I(%s) FROM anon;', r.proname, r.args);
  END LOOP;
END $$;

-- (b) Enforce caller identity inside add_mutual_contact. Legitimate callers are the
--     client (p_user_id = auth.uid()) and save_wrapup_decision (which PERFORMs this
--     as the participant who submitted the wrap-up decision).
CREATE OR REPLACE FUNCTION public.add_mutual_contact(
  p_user_id uuid,
  p_contact_user_id uuid,
  p_circle_id uuid DEFAULT NULL::uuid,
  p_call_id uuid DEFAULT NULL::uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  v_call RECORD;
BEGIN
  IF auth.uid() IS NULL OR auth.uid() NOT IN (p_user_id, p_contact_user_id) THEN
    RAISE EXCEPTION 'Not authorized to create this contact link';
  END IF;

  INSERT INTO contacts (user_id, contact_user_id, circle_id, call_id)
  VALUES (p_user_id, p_contact_user_id, p_circle_id, p_call_id)
  ON CONFLICT (user_id, contact_user_id, circle_id) DO NOTHING;

  INSERT INTO contacts (user_id, contact_user_id, circle_id, call_id)
  VALUES (p_contact_user_id, p_user_id, p_circle_id, p_call_id)
  ON CONFLICT (user_id, contact_user_id, circle_id) DO NOTHING;

  IF p_call_id IS NOT NULL THEN
    SELECT * INTO v_call FROM call_history WHERE id = p_call_id;
    IF FOUND THEN
      INSERT INTO direct_messages (sender_id, recipient_id, message, created_at, is_from_call, call_id)
      SELECT
        cm.sender_id,
        CASE WHEN cm.sender_id = v_call.caller_id THEN v_call.recipient_id
             ELSE v_call.caller_id END,
        cm.message,
        cm.created_at,
        true,
        p_call_id
      FROM chat_messages cm
      WHERE cm.call_id = p_call_id
      ON CONFLICT DO NOTHING;
    END IF;
  END IF;
END;
$function$;

-- attempt_match: enforce that the caller can only match as themselves.
-- NOTE: the full matchmaking body is long and unchanged below except for the guard
-- added immediately after BEGIN. If you prefer not to re-apply the whole body, the
-- minimal change is to add these 3 lines after BEGIN in the live function:
--     IF auth.uid() IS NULL OR auth.uid() <> current_user_id THEN
--       RAISE EXCEPTION 'Not authorized';
--     END IF;
CREATE OR REPLACE FUNCTION public.attempt_match(
  current_user_id uuid,
  caller_topic_preset character varying DEFAULT NULL::character varying,
  caller_custom_topics text[] DEFAULT NULL::text[],
  caller_custom_questions text[] DEFAULT NULL::text[],
  caller_session_duration integer DEFAULT 15,
  skip_user_ids uuid[] DEFAULT NULL::uuid[]
)
RETURNS TABLE(call_id uuid, matched_user_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    v_peer_id              UUID;
    v_peer_duration        INTEGER;
    v_agreed_duration      INTEGER;
    v_call_id              UUID;
    v_current_circle_id    UUID;
    v_preferred_roles      TEXT[];
    v_similarity_pref      INTEGER;
    v_target_score         INTEGER;
    v_my_role              TEXT;
    v_my_industry          TEXT;
    v_my_study             TEXT;
    v_my_uni               TEXT;
    v_my_location          TEXT;
    v_my_occupation        TEXT;
    v_my_interest_count    INTEGER;
    v_my_interest_ids      TEXT[];
BEGIN
    -- SECURITY: callers may only match as themselves.
    IF auth.uid() IS NULL OR auth.uid() <> current_user_id THEN
        RAISE EXCEPTION 'Not authorized';
    END IF;

    -- 1. Read caller's queue entry
    SELECT mq.circle_id, mq.preferred_roles, mq.similarity_preference
      INTO v_current_circle_id, v_preferred_roles, v_similarity_pref
      FROM matchmaking_queue mq
     WHERE mq.user_id = current_user_id
       AND mq.status  = 'waiting'
     ORDER BY mq.joined_queue_at DESC
     LIMIT 1;

    -- 2. If a similarity preference is set, pre-fetch caller's profile data
    IF v_similarity_pref IS NOT NULL THEN
        v_target_score := CASE
            WHEN v_similarity_pref = 0   THEN 15
            WHEN v_similarity_pref = 50  THEN 50
            WHEN v_similarity_pref = 100 THEN 85
            ELSE 50
        END;

        SELECT LOWER(TRIM(COALESCE(p.role, ''))),
               LOWER(TRIM(COALESCE(p.industry, ''))),
               LOWER(TRIM(COALESCE(p.study_field, ''))),
               LOWER(TRIM(COALESCE(p.university, ''))),
               LOWER(TRIM(COALESCE(p.location, ''))),
               LOWER(TRIM(COALESCE(p.occupation, '')))
          INTO v_my_role, v_my_industry, v_my_study,
               v_my_uni, v_my_location, v_my_occupation
          FROM profiles p
         WHERE p.id = current_user_id;

        SELECT COUNT(*)
          INTO v_my_interest_count
          FROM user_interests
         WHERE user_id = current_user_id;

        SELECT ARRAY(
            SELECT interest_id FROM user_interests WHERE user_id = current_user_id
        ) INTO v_my_interest_ids;
    END IF;

    -- 3. Find the best peer
    SELECT mq.user_id, mq.session_duration_minutes
      INTO v_peer_id, v_peer_duration
      FROM matchmaking_queue mq
      JOIN profiles p ON p.id = mq.user_id
      LEFT JOIN circle_members cm
        ON v_current_circle_id IS NOT NULL
       AND cm.user_id   = mq.user_id
       AND cm.circle_id = v_current_circle_id
       AND cm.status     = 'active'
     WHERE mq.user_id != current_user_id
       AND mq.status = 'waiting'
       AND (skip_user_ids IS NULL OR NOT (mq.user_id = ANY(skip_user_ids)))
       AND (
           (v_current_circle_id IS NULL     AND mq.circle_id IS NULL) OR
           (v_current_circle_id IS NOT NULL AND mq.circle_id = v_current_circle_id)
       )
       AND COALESCE(p.in_call, FALSE) = FALSE
       AND NOT EXISTS (
           SELECT 1 FROM call_history ch
            WHERE ch.status = 'ongoing'
              AND (ch.caller_id = mq.user_id OR ch.recipient_id = mq.user_id)
       )
       AND (
           v_preferred_roles IS NULL
           OR array_length(v_preferred_roles, 1) = 0
           OR (v_current_circle_id IS NOT NULL AND cm.role = ANY(v_preferred_roles))
           OR (v_current_circle_id IS NULL     AND p.role  = ANY(v_preferred_roles))
       )
     ORDER BY
       CASE WHEN v_similarity_pref IS NOT NULL THEN
           ABS(
               ROUND(
                   COALESCE((
                       SELECT COUNT(*)::FLOAT
                         / GREATEST(
                               v_my_interest_count::FLOAT,
                               (SELECT COUNT(*) FROM user_interests WHERE user_id = mq.user_id)::FLOAT,
                               1.0
                           ) * 40.0
                         FROM user_interests ui_c
                        WHERE ui_c.user_id     = mq.user_id
                          AND ui_c.interest_id = ANY(v_my_interest_ids)
                   ), 0)
                   + CASE WHEN v_my_role != '' AND v_my_role = LOWER(TRIM(COALESCE(p.role, '')))
                          THEN 15 ELSE 0 END
                   + CASE WHEN v_my_industry != '' AND v_my_industry = LOWER(TRIM(COALESCE(p.industry, '')))
                          THEN 10 ELSE 0 END
                   + CASE WHEN v_my_study != '' AND v_my_study = LOWER(TRIM(COALESCE(p.study_field, '')))
                          THEN 10 ELSE 0 END
                   + CASE WHEN v_my_uni != '' AND v_my_uni = LOWER(TRIM(COALESCE(p.university, '')))
                          THEN 5 ELSE 0 END
                   + CASE WHEN v_my_location != '' AND v_my_location = LOWER(TRIM(COALESCE(p.location, '')))
                          THEN 10 ELSE 0 END
                   + CASE WHEN v_my_occupation != '' AND v_my_occupation = LOWER(TRIM(COALESCE(p.occupation, '')))
                          THEN 10 ELSE 0 END
               )::INTEGER
               - v_target_score
           )
       ELSE 0
       END ASC,
       CASE WHEN mq.session_duration_minutes = caller_session_duration THEN 0 ELSE 1 END ASC,
       mq.joined_queue_at ASC
     LIMIT 1
       FOR UPDATE OF mq SKIP LOCKED;

    IF v_peer_id IS NULL THEN
        RETURN;
    END IF;

    -- 4. Compute agreed duration
    IF caller_session_duration = 0 AND v_peer_duration = 0 THEN
        v_agreed_duration := 0;
    ELSIF caller_session_duration = 0 THEN
        v_agreed_duration := v_peer_duration;
    ELSIF v_peer_duration = 0 THEN
        v_agreed_duration := caller_session_duration;
    ELSE
        v_agreed_duration := LEAST(caller_session_duration, v_peer_duration);
    END IF;

    -- 5. Mark both as matched
    UPDATE matchmaking_queue
       SET status = 'matched', matched_at = NOW()
     WHERE user_id IN (current_user_id, v_peer_id)
       AND status = 'waiting';

    -- 6. Create call record
    INSERT INTO call_history (
        caller_id, recipient_id, circle_id, status, started_at,
        caller_topic_preset, caller_custom_topics, caller_custom_questions,
        agreed_duration_minutes
    )
    VALUES (
        current_user_id, v_peer_id, v_current_circle_id, 'ongoing', NOW(),
        caller_topic_preset, caller_custom_topics, caller_custom_questions,
        v_agreed_duration
    )
    RETURNING id INTO v_call_id;

    -- 7. Mark both as in_call
    UPDATE profiles
       SET in_call = TRUE
     WHERE id IN (current_user_id, v_peer_id);

    call_id        := v_call_id;
    matched_user_id := v_peer_id;
    RETURN NEXT;
END;
$function$;
