-- Fix: Update INSERT policy to allow mutual contact inserts via RPC function
-- The SECURITY DEFINER function needs to be able to insert for both users

-- Drop the restrictive INSERT policy
DROP POLICY IF EXISTS "Users can create their own contacts" ON contacts;

-- Create a more permissive INSERT policy 
-- The RPC function add_mutual_contact() validates the input, so we can trust it
-- Users can only insert where:
-- 1. They are the user_id (adding a contact for themselves)
-- 2. OR they are the contact_user_id (they're being added as someone's contact - mutual)
CREATE POLICY "Users can create contacts via mutual connect"
  ON contacts FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id OR auth.uid() = contact_user_id
  );

-- Recreate the function with explicit search_path for security
CREATE OR REPLACE FUNCTION add_mutual_contact(
  p_user_id UUID,
  p_contact_user_id UUID,
  p_circle_id UUID DEFAULT NULL,
  p_call_id UUID DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
  -- Validate that the caller is one of the two users
  IF auth.uid() != p_user_id AND auth.uid() != p_contact_user_id THEN
    RAISE EXCEPTION 'Unauthorized: You can only add contacts for yourself';
  END IF;

  -- Add contact for first user
  INSERT INTO contacts (user_id, contact_user_id, circle_id, call_id)
  VALUES (p_user_id, p_contact_user_id, p_circle_id, p_call_id)
  ON CONFLICT (user_id, contact_user_id, circle_id) DO NOTHING;
  
  -- Add contact for second user
  INSERT INTO contacts (user_id, contact_user_id, circle_id, call_id)
  VALUES (p_contact_user_id, p_user_id, p_circle_id, p_call_id)
  ON CONFLICT (user_id, contact_user_id, circle_id) DO NOTHING;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
