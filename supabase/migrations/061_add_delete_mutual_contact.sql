-- Add function to delete contacts mutually (from both users' contact lists)
CREATE OR REPLACE FUNCTION delete_mutual_contact(
  p_contact_user_id UUID,
  p_circle_id UUID DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
  -- Validate that the caller is authenticated
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Delete the contact from the caller's list
  DELETE FROM contacts
  WHERE user_id = auth.uid()
    AND contact_user_id = p_contact_user_id
    AND (p_circle_id IS NULL OR circle_id = p_circle_id);
  
  -- Delete the reverse contact (caller from the other user's list)
  DELETE FROM contacts
  WHERE user_id = p_contact_user_id
    AND contact_user_id = auth.uid()
    AND (p_circle_id IS NULL OR circle_id = p_circle_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION delete_mutual_contact TO authenticated;

COMMENT ON FUNCTION delete_mutual_contact(UUID, UUID) IS
'Deletes the contact relationship mutually - removes the contact from both users'' contact lists';
