-- ============================================================================
-- COMPREHENSIVE FIX FOR MATCHMAKING_QUEUE RLS POLICIES
-- This migration ensures users can see waiting peers for matchmaking
-- ============================================================================

-- Drop ALL existing matchmaking_queue policies to avoid conflicts
-- Drop policies from initial schema
DROP POLICY IF EXISTS "Users can view own queue entry" ON matchmaking_queue;
DROP POLICY IF EXISTS "Users can manage own queue entry" ON matchmaking_queue;

-- Drop policies from migration 024
DROP POLICY IF EXISTS "Users can view their own queue entries" ON matchmaking_queue;
DROP POLICY IF EXISTS "Users can view all waiting queue entries" ON matchmaking_queue;
DROP POLICY IF EXISTS "Users can insert their own queue entries" ON matchmaking_queue;
DROP POLICY IF EXISTS "Users can update their own queue entries" ON matchmaking_queue;
DROP POLICY IF EXISTS "Users can delete their own queue entries" ON matchmaking_queue;

-- Drop policies that might have been created by this migration previously
DROP POLICY IF EXISTS "Allow view waiting queue" ON matchmaking_queue;
DROP POLICY IF EXISTS "Users can insert own queue entry" ON matchmaking_queue;
DROP POLICY IF EXISTS "Users can update own queue entry" ON matchmaking_queue;
DROP POLICY IF EXISTS "Users can delete own queue entry" ON matchmaking_queue;

-- ============================================================================
-- SELECT POLICIES
-- ============================================================================

-- Allow users to view their own queue entries (any status)
CREATE POLICY "Users can view own queue entry"
    ON matchmaking_queue FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

-- Allow users to view ALL waiting queue entries for matchmaking
-- This is critical so users can find potential matches
CREATE POLICY "Allow view waiting queue"
    ON matchmaking_queue FOR SELECT
    TO authenticated
    USING (
        auth.uid() IS NOT NULL
        AND status = 'waiting'
    );

-- ============================================================================
-- INSERT POLICY
-- ============================================================================

-- Allow users to insert their own queue entries
CREATE POLICY "Users can insert own queue entry"
    ON matchmaking_queue FOR INSERT
    TO authenticated
    WITH CHECK (user_id = auth.uid());

-- ============================================================================
-- UPDATE POLICY
-- ============================================================================

-- Allow users to update their own queue entries
-- This allows setting status to 'matched' or 'cancelled'
CREATE POLICY "Users can update own queue entry"
    ON matchmaking_queue FOR UPDATE
    TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- ============================================================================
-- DELETE POLICY
-- ============================================================================

-- Allow users to delete their own queue entries
CREATE POLICY "Users can delete own queue entry"
    ON matchmaking_queue FOR DELETE
    TO authenticated
    USING (user_id = auth.uid());

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON POLICY "Allow view waiting queue" ON matchmaking_queue IS 
'Allows all authenticated users to see waiting queue entries for matchmaking purposes. This is essential for users to find potential matches.';

COMMENT ON POLICY "Users can update own queue entry" ON matchmaking_queue IS 
'Allows users to update their own queue entries, including changing status to matched or cancelled.';

