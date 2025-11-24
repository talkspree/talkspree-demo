-- Function to complete onboarding without requiring an active session
-- This allows users who just confirmed email to save their onboarding data

CREATE OR REPLACE FUNCTION complete_user_onboarding(
  p_user_id UUID,
  p_interests TEXT[] DEFAULT NULL,
  p_social_links JSONB DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Delete existing interests
  IF p_interests IS NOT NULL AND array_length(p_interests, 1) > 0 THEN
    DELETE FROM user_interests WHERE user_id = p_user_id;
    
    -- Insert new interests
    INSERT INTO user_interests (user_id, interest_id)
    SELECT p_user_id, unnest(p_interests)
    ON CONFLICT (user_id, interest_id) DO NOTHING;
  ELSE
    -- If interests array is empty or null, just delete existing ones
    DELETE FROM user_interests WHERE user_id = p_user_id;
  END IF;
  
  -- Delete existing social links
  IF p_social_links IS NOT NULL AND jsonb_array_length(p_social_links) > 0 THEN
    DELETE FROM social_links WHERE user_id = p_user_id;
    
    -- Insert new social links
    INSERT INTO social_links (user_id, platform, url)
    SELECT 
      p_user_id,
      (link->>'platform')::TEXT,
      (link->>'url')::TEXT
    FROM jsonb_array_elements(p_social_links) AS link
    WHERE (link->>'url')::TEXT IS NOT NULL AND (link->>'url')::TEXT != '';
  ELSE
    -- If social links array is empty or null, just delete existing ones
    DELETE FROM social_links WHERE user_id = p_user_id;
  END IF;
  
  RETURN TRUE;
END;
$$;

-- Grant execute permission to authenticated and anon users
GRANT EXECUTE ON FUNCTION complete_user_onboarding(UUID, TEXT[], JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION complete_user_onboarding(UUID, TEXT[], JSONB) TO anon;

