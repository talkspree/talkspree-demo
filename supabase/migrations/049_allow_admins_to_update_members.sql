-- Allow super admins and circle admins to update circle member roles and admin types
-- This fixes the issue where admins couldn't change user roles or make users admins

-- ============================================================================
-- ADD ADMIN UPDATE POLICY FOR CIRCLE_MEMBERS
-- ============================================================================

-- Create a new policy that allows super admins and circle admins to update members
CREATE POLICY "Admins can update circle members"
ON circle_members FOR UPDATE
TO authenticated
USING (
    -- Super admins can update any member
    is_super_admin(auth.uid())
    OR
    -- Circle admins can update members in their circle
    is_circle_admin(auth.uid(), circle_id)
)
WITH CHECK (
    -- Super admins can update any member
    is_super_admin(auth.uid())
    OR
    -- Circle admins can update members in their circle
    is_circle_admin(auth.uid(), circle_id)
);

-- Note: The existing "Allow users to update their own membership" policy
-- still allows regular users to update their own membership details

