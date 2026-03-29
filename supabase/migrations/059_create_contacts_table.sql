-- Create contacts table for persistent contact storage
CREATE TABLE IF NOT EXISTS contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  contact_user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  circle_id UUID REFERENCES circles(id) ON DELETE SET NULL,
  connected_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  is_seen BOOLEAN NOT NULL DEFAULT false,
  seen_at TIMESTAMPTZ,
  call_id UUID, -- Optional reference to the call where they connected (no FK constraint)
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Ensure unique contacts per user pair in a circle
  UNIQUE(user_id, contact_user_id, circle_id)
);

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_contacts_user_id ON contacts(user_id);
CREATE INDEX IF NOT EXISTS idx_contacts_contact_user_id ON contacts(contact_user_id);
CREATE INDEX IF NOT EXISTS idx_contacts_user_unseen ON contacts(user_id, is_seen) WHERE is_seen = false;
CREATE INDEX IF NOT EXISTS idx_contacts_connected_at ON contacts(connected_at DESC);

-- Enable Row Level Security
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own contacts
CREATE POLICY "Users can view their own contacts"
  ON contacts FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can insert contacts for themselves
CREATE POLICY "Users can create their own contacts"
  ON contacts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own contacts (for marking as seen)
CREATE POLICY "Users can update their own contacts"
  ON contacts FOR UPDATE
  USING (auth.uid() = user_id);

-- Policy: Users can delete their own contacts
CREATE POLICY "Users can delete their own contacts"
  ON contacts FOR DELETE
  USING (auth.uid() = user_id);

-- Function to add contact for both users when they connect
CREATE OR REPLACE FUNCTION add_mutual_contact(
  p_user_id UUID,
  p_contact_user_id UUID,
  p_circle_id UUID DEFAULT NULL,
  p_call_id UUID DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
  -- Add contact for first user
  INSERT INTO contacts (user_id, contact_user_id, circle_id, call_id)
  VALUES (p_user_id, p_contact_user_id, p_circle_id, p_call_id)
  ON CONFLICT (user_id, contact_user_id, circle_id) DO NOTHING;
  
  -- Add contact for second user
  INSERT INTO contacts (user_id, contact_user_id, circle_id, call_id)
  VALUES (p_contact_user_id, p_user_id, p_circle_id, p_call_id)
  ON CONFLICT (user_id, contact_user_id, circle_id) DO NOTHING;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to mark all contacts as seen for a user
CREATE OR REPLACE FUNCTION mark_contacts_seen(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
  updated_count INTEGER;
BEGIN
  UPDATE contacts
  SET is_seen = true, seen_at = now(), updated_at = now()
  WHERE user_id = p_user_id AND is_seen = false;
  
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to mark a single contact as seen
CREATE OR REPLACE FUNCTION mark_contact_seen(p_contact_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE contacts
  SET is_seen = true, seen_at = now(), updated_at = now()
  WHERE id = p_contact_id AND user_id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get unseen contacts count
CREATE OR REPLACE FUNCTION get_unseen_contacts_count(p_user_id UUID)
RETURNS INTEGER AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)::INTEGER
    FROM contacts
    WHERE user_id = p_user_id AND is_seen = false
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_contacts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER contacts_updated_at
  BEFORE UPDATE ON contacts
  FOR EACH ROW
  EXECUTE FUNCTION update_contacts_updated_at();

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION add_mutual_contact TO authenticated;
GRANT EXECUTE ON FUNCTION mark_contacts_seen TO authenticated;
GRANT EXECUTE ON FUNCTION mark_contact_seen TO authenticated;
GRANT EXECUTE ON FUNCTION get_unseen_contacts_count TO authenticated;
