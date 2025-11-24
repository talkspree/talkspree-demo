-- Ensure explicit INSERT policies for user_interests and social_links
-- The "FOR ALL" policy should cover this, but we're making it explicit

-- Drop and recreate user_interests policies to be more explicit
DROP POLICY IF EXISTS "Users can manage own interests" ON user_interests;

CREATE POLICY "Users can view own interests"
ON user_interests FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own interests"
ON user_interests FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own interests"
ON user_interests FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own interests"
ON user_interests FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Drop and recreate social_links policies to be more explicit
DROP POLICY IF EXISTS "Users can manage own social links" ON social_links;

CREATE POLICY "Users can view own social links"
ON social_links FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own social links"
ON social_links FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own social links"
ON social_links FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own social links"
ON social_links FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

