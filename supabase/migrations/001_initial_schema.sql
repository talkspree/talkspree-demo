-- TalkSpree Database Schema
-- This migration creates all the necessary tables for the TalkSpree platform

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- PROFILES TABLE
-- Stores user profile information
-- ============================================================================
CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    date_of_birth DATE NOT NULL,
    gender TEXT,
    location TEXT,
    occupation TEXT,
    bio TEXT,
    phone TEXT,
    profile_picture_url TEXT,
    
    -- Role in the platform
    role TEXT CHECK (role IN ('mentor', 'mentee', 'alumni')),
    
    -- Education & Work
    university TEXT,
    study_field TEXT,
    work_place TEXT,
    industry TEXT,
    
    -- Status fields
    is_online BOOLEAN DEFAULT FALSE,
    in_call BOOLEAN DEFAULT FALSE,
    last_seen_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Call preferences
    session_duration INTEGER DEFAULT 15, -- in minutes
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX idx_profiles_email ON profiles(email);
CREATE INDEX idx_profiles_role ON profiles(role);
CREATE INDEX idx_profiles_is_online ON profiles(is_online);

-- ============================================================================
-- INTERESTS TABLE (Predefined list)
-- Stores the master list of interests
-- ============================================================================
CREATE TABLE interests (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    emoji TEXT,
    category TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- USER_INTERESTS TABLE (Many-to-Many relationship)
-- Links users to their selected interests
-- ============================================================================
CREATE TABLE user_interests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    interest_id TEXT NOT NULL REFERENCES interests(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, interest_id)
);

CREATE INDEX idx_user_interests_user_id ON user_interests(user_id);
CREATE INDEX idx_user_interests_interest_id ON user_interests(interest_id);

-- ============================================================================
-- SOCIAL_LINKS TABLE
-- Stores user social media links
-- ============================================================================
CREATE TABLE social_links (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    platform TEXT NOT NULL CHECK (platform IN ('linkedin', 'twitter', 'instagram', 'facebook', 'youtube', 'tiktok')),
    url TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, platform)
);

CREATE INDEX idx_social_links_user_id ON social_links(user_id);

-- ============================================================================
-- CIRCLES TABLE
-- Represents private groups/communities (NGOs, universities, companies)
-- ============================================================================
CREATE TABLE circles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    logo_url TEXT,
    invite_code TEXT UNIQUE NOT NULL,
    
    -- Settings
    allow_member_invites BOOLEAN DEFAULT TRUE,
    require_approval BOOLEAN DEFAULT FALSE,
    
    created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_circles_invite_code ON circles(invite_code);

-- ============================================================================
-- CIRCLE_MEMBERS TABLE
-- Links users to circles with roles
-- ============================================================================
CREATE TABLE circle_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    circle_id UUID NOT NULL REFERENCES circles(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('admin', 'moderator', 'member')) DEFAULT 'member',
    status TEXT NOT NULL CHECK (status IN ('active', 'pending', 'suspended')) DEFAULT 'active',
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(circle_id, user_id)
);

CREATE INDEX idx_circle_members_circle_id ON circle_members(circle_id);
CREATE INDEX idx_circle_members_user_id ON circle_members(user_id);

-- ============================================================================
-- INVITE_CODES TABLE
-- Manages invite codes for joining the platform/circles
-- ============================================================================
CREATE TABLE invite_codes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code TEXT UNIQUE NOT NULL,
    circle_id UUID REFERENCES circles(id) ON DELETE CASCADE,
    created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    
    -- Usage limits
    max_uses INTEGER, -- NULL means unlimited
    uses_count INTEGER DEFAULT 0,
    expires_at TIMESTAMP WITH TIME ZONE,
    
    -- Metadata
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_invite_codes_code ON invite_codes(code);
CREATE INDEX idx_invite_codes_circle_id ON invite_codes(circle_id);

-- ============================================================================
-- CALL_HISTORY TABLE
-- Tracks all calls made on the platform
-- ============================================================================
CREATE TABLE call_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    caller_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    recipient_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    circle_id UUID REFERENCES circles(id) ON DELETE SET NULL,
    
    -- Call details
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ended_at TIMESTAMP WITH TIME ZONE,
    duration INTEGER, -- in seconds
    
    -- Feedback
    caller_rating INTEGER CHECK (caller_rating >= 1 AND caller_rating <= 5),
    recipient_rating INTEGER CHECK (recipient_rating >= 1 AND recipient_rating <= 5),
    caller_feedback TEXT,
    recipient_feedback TEXT,
    
    -- Topics discussed
    topics TEXT[],
    
    -- Status
    status TEXT NOT NULL CHECK (status IN ('scheduled', 'ongoing', 'completed', 'cancelled', 'missed')) DEFAULT 'ongoing'
);

CREATE INDEX idx_call_history_caller_id ON call_history(caller_id);
CREATE INDEX idx_call_history_recipient_id ON call_history(recipient_id);
CREATE INDEX idx_call_history_circle_id ON call_history(circle_id);
CREATE INDEX idx_call_history_started_at ON call_history(started_at);

-- ============================================================================
-- MATCHMAKING_QUEUE TABLE
-- Manages the queue of users waiting to be matched
-- ============================================================================
CREATE TABLE matchmaking_queue (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    circle_id UUID REFERENCES circles(id) ON DELETE CASCADE,
    
    -- Filters/Preferences
    preferred_roles TEXT[], -- ['mentor', 'mentee', 'alumni']
    preferred_topics TEXT[], -- interest IDs
    filter_similar_interests BOOLEAN DEFAULT FALSE,
    filter_similar_background BOOLEAN DEFAULT FALSE,
    
    -- Queue status
    status TEXT NOT NULL CHECK (status IN ('waiting', 'matched', 'cancelled')) DEFAULT 'waiting',
    joined_queue_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    matched_at TIMESTAMP WITH TIME ZONE,
    
    UNIQUE(user_id, circle_id)
);

CREATE INDEX idx_matchmaking_queue_user_id ON matchmaking_queue(user_id);
CREATE INDEX idx_matchmaking_queue_status ON matchmaking_queue(status);
CREATE INDEX idx_matchmaking_queue_joined_at ON matchmaking_queue(joined_queue_at);

-- ============================================================================
-- REPORTS TABLE
-- Handles user reports and moderation
-- ============================================================================
CREATE TABLE reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    reporter_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    reported_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    call_id UUID REFERENCES call_history(id) ON DELETE SET NULL,
    
    -- Report details
    reason TEXT NOT NULL,
    description TEXT,
    evidence_urls TEXT[],
    
    -- Moderation
    status TEXT NOT NULL CHECK (status IN ('pending', 'reviewing', 'resolved', 'dismissed')) DEFAULT 'pending',
    reviewed_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMP WITH TIME ZONE,
    resolution_notes TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_reports_reporter_id ON reports(reporter_id);
CREATE INDEX idx_reports_reported_id ON reports(reported_id);
CREATE INDEX idx_reports_status ON reports(status);

-- ============================================================================
-- NOTIFICATIONS TABLE
-- Stores user notifications
-- ============================================================================
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    
    -- Notification content
    type TEXT NOT NULL, -- 'match_found', 'call_started', 'call_ended', 'message', etc.
    title TEXT NOT NULL,
    message TEXT,
    data JSONB, -- Additional data for the notification
    
    -- Status
    is_read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMP WITH TIME ZONE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_is_read ON notifications(is_read);
CREATE INDEX idx_notifications_created_at ON notifications(created_at);

-- ============================================================================
-- BLOCKED_USERS TABLE
-- Users who have blocked each other
-- ============================================================================
CREATE TABLE blocked_users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    blocker_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    blocked_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(blocker_id, blocked_id)
);

CREATE INDEX idx_blocked_users_blocker_id ON blocked_users(blocker_id);
CREATE INDEX idx_blocked_users_blocked_id ON blocked_users(blocked_id);

-- ============================================================================
-- FUNCTIONS AND TRIGGERS
-- ============================================================================

-- Function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger for profiles table
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger for circles table
CREATE TRIGGER update_circles_updated_at BEFORE UPDATE ON circles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to automatically create profile when user signs up
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO profiles (id, email, first_name, last_name, date_of_birth)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'first_name', 'User'),
        COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
        COALESCE((NEW.raw_user_meta_data->>'date_of_birth')::DATE, CURRENT_DATE)
    );
    RETURN NEW;
END;
$$ language 'plpgsql' SECURITY DEFINER;

-- Trigger for new user signup
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_interests ENABLE ROW LEVEL SECURITY;
ALTER TABLE social_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE circles ENABLE ROW LEVEL SECURITY;
ALTER TABLE circle_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE invite_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE call_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE matchmaking_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE blocked_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE interests ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Public profiles are viewable by authenticated users"
    ON profiles FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Users can update own profile"
    ON profiles FOR UPDATE
    TO authenticated
    USING (auth.uid() = id);

-- User interests policies
CREATE POLICY "User interests are viewable by authenticated users"
    ON user_interests FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Users can manage own interests"
    ON user_interests FOR ALL
    TO authenticated
    USING (auth.uid() = user_id);

-- Social links policies
CREATE POLICY "Social links are viewable by authenticated users"
    ON social_links FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Users can manage own social links"
    ON social_links FOR ALL
    TO authenticated
    USING (auth.uid() = user_id);

-- Circles policies
CREATE POLICY "Circles are viewable by members"
    ON circles FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM circle_members
            WHERE circle_members.circle_id = circles.id
            AND circle_members.user_id = auth.uid()
        )
    );

CREATE POLICY "Circle admins can update circles"
    ON circles FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM circle_members
            WHERE circle_members.circle_id = circles.id
            AND circle_members.user_id = auth.uid()
            AND circle_members.role = 'admin'
        )
    );

-- Circle members policies
CREATE POLICY "Circle members are viewable by circle members"
    ON circle_members FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM circle_members cm
            WHERE cm.circle_id = circle_members.circle_id
            AND cm.user_id = auth.uid()
        )
    );

-- Call history policies
CREATE POLICY "Users can view own call history"
    ON call_history FOR SELECT
    TO authenticated
    USING (caller_id = auth.uid() OR recipient_id = auth.uid());

CREATE POLICY "Users can insert own calls"
    ON call_history FOR INSERT
    TO authenticated
    WITH CHECK (caller_id = auth.uid());

CREATE POLICY "Call participants can update call"
    ON call_history FOR UPDATE
    TO authenticated
    USING (caller_id = auth.uid() OR recipient_id = auth.uid());

-- Matchmaking queue policies
CREATE POLICY "Users can view own queue entry"
    ON matchmaking_queue FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

CREATE POLICY "Users can manage own queue entry"
    ON matchmaking_queue FOR ALL
    TO authenticated
    USING (user_id = auth.uid());

-- Notifications policies
CREATE POLICY "Users can view own notifications"
    ON notifications FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

CREATE POLICY "Users can update own notifications"
    ON notifications FOR UPDATE
    TO authenticated
    USING (user_id = auth.uid());

-- Blocked users policies
CREATE POLICY "Users can view who they blocked"
    ON blocked_users FOR SELECT
    TO authenticated
    USING (blocker_id = auth.uid());

CREATE POLICY "Users can manage own blocks"
    ON blocked_users FOR ALL
    TO authenticated
    USING (blocker_id = auth.uid());

-- Reports policies
CREATE POLICY "Users can view own reports"
    ON reports FOR SELECT
    TO authenticated
    USING (reporter_id = auth.uid());

CREATE POLICY "Users can create reports"
    ON reports FOR INSERT
    TO authenticated
    WITH CHECK (reporter_id = auth.uid());

-- Interests policies (read-only for all authenticated users)
CREATE POLICY "Interests are viewable by all authenticated users"
    ON interests FOR SELECT
    TO authenticated
    USING (true);

-- Invite codes policies
CREATE POLICY "Anyone can view active invite codes"
    ON invite_codes FOR SELECT
    TO anon, authenticated
    USING (is_active = true AND (expires_at IS NULL OR expires_at > NOW()));

-- ============================================================================
-- SEED DATA - Insert predefined interests
-- ============================================================================

-- This will be populated from the frontend interests data
-- For now, we'll leave it empty and populate it via API

