-- ============================================================================
-- FIX PROFILES UPDATE POLICY
-- Ensure users can update their online status and last_seen
-- ============================================================================

-- Drop and recreate the profile update policy with WITH CHECK
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;

CREATE POLICY "Users can update own profile"
    ON profiles FOR UPDATE
    TO authenticated
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- ============================================================================
-- FIX MATCHMAKING_QUEUE RLS POLICIES
-- The table has RLS enabled but no policies, causing 406 errors
-- ============================================================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own queue entries" ON matchmaking_queue;
DROP POLICY IF EXISTS "Users can view all waiting queue entries" ON matchmaking_queue;
DROP POLICY IF EXISTS "Users can insert their own queue entries" ON matchmaking_queue;
DROP POLICY IF EXISTS "Users can update their own queue entries" ON matchmaking_queue;
DROP POLICY IF EXISTS "Users can delete their own queue entries" ON matchmaking_queue;

-- Allow users to view their own queue entries
CREATE POLICY "Users can view their own queue entries"
    ON matchmaking_queue FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

-- Allow users to view all waiting queue entries for matchmaking
-- This is needed so users can find potential matches
CREATE POLICY "Users can view all waiting queue entries"
    ON matchmaking_queue FOR SELECT
    TO authenticated
    USING (status = 'waiting');

-- Allow users to insert their own queue entries
CREATE POLICY "Users can insert their own queue entries"
    ON matchmaking_queue FOR INSERT
    TO authenticated
    WITH CHECK (user_id = auth.uid());

-- Allow users to update their own queue entries
CREATE POLICY "Users can update their own queue entries"
    ON matchmaking_queue FOR UPDATE
    TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- Note: Users can only update their own queue entries
-- The matched user will update their own entry when they receive the call notification

-- Allow users to delete their own queue entries
CREATE POLICY "Users can delete their own queue entries"
    ON matchmaking_queue FOR DELETE
    TO authenticated
    USING (user_id = auth.uid());

COMMENT ON POLICY "Users can view all waiting queue entries" ON matchmaking_queue IS 
'Allows all authenticated users to see waiting queue entries for matchmaking purposes';

