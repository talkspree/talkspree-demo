-- Add Agora support for video calls
-- This migration adds fields to support Agora video calling

-- Add Agora channel info to call_history
ALTER TABLE call_history
ADD COLUMN IF NOT EXISTS agora_channel_name TEXT,
ADD COLUMN IF NOT EXISTS agora_channel_uid INTEGER;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_call_history_channel ON call_history(agora_channel_name);

-- Create table for call signaling (for WebRTC signaling and call states)
CREATE TABLE IF NOT EXISTS call_signals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    call_id UUID NOT NULL REFERENCES call_history(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    
    -- Signal type: 'offer', 'answer', 'ice_candidate', 'call_state'
    signal_type TEXT NOT NULL CHECK (signal_type IN ('offer', 'answer', 'ice_candidate', 'call_state', 'agora_join', 'agora_leave')),
    
    -- Signal data (JSON)
    signal_data JSONB,
    
    -- Call state: 'ringing', 'connecting', 'connected', 'ended'
    call_state TEXT CHECK (call_state IN ('ringing', 'connecting', 'connected', 'ended')),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for call_signals
CREATE INDEX IF NOT EXISTS idx_call_signals_call_id ON call_signals(call_id);
CREATE INDEX IF NOT EXISTS idx_call_signals_user_id ON call_signals(user_id);
CREATE INDEX IF NOT EXISTS idx_call_signals_created_at ON call_signals(created_at);

-- Enable RLS
ALTER TABLE call_signals ENABLE ROW LEVEL SECURITY;

-- RLS Policies for call_signals
-- Users can view signals for their calls
CREATE POLICY "Users can view signals for their calls"
    ON call_signals FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM call_history
            WHERE call_history.id = call_signals.call_id
            AND (call_history.caller_id = auth.uid() OR call_history.recipient_id = auth.uid())
        )
    );

-- Users can insert signals for their calls
CREATE POLICY "Users can insert signals for their calls"
    ON call_signals FOR INSERT
    TO authenticated
    WITH CHECK (
        user_id = auth.uid() AND
        EXISTS (
            SELECT 1 FROM call_history
            WHERE call_history.id = call_signals.call_id
            AND (call_history.caller_id = auth.uid() OR call_history.recipient_id = auth.uid())
        )
    );

-- Add environment config table for storing Agora credentials
CREATE TABLE IF NOT EXISTS app_config (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    config_key TEXT UNIQUE NOT NULL,
    config_value TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS (only admins should access this, but for now we'll restrict it)
ALTER TABLE app_config ENABLE ROW LEVEL SECURITY;

-- No one can access app_config via RLS (only through functions)
CREATE POLICY "App config is not directly accessible"
    ON app_config FOR ALL
    TO authenticated
    USING (false);

-- Insert placeholder for Agora App ID (to be updated by admin)
INSERT INTO app_config (config_key, config_value, description)
VALUES 
    ('agora_app_id', '', 'Agora App ID for video calling'),
    ('agora_app_certificate', '', 'Agora App Certificate for token generation')
ON CONFLICT (config_key) DO NOTHING;

-- Function to get Agora config (only callable by authenticated backend functions)
CREATE OR REPLACE FUNCTION get_agora_config()
RETURNS TABLE (app_id TEXT, app_certificate TEXT) 
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        MAX(CASE WHEN config_key = 'agora_app_id' THEN config_value END) as app_id,
        MAX(CASE WHEN config_key = 'agora_app_certificate' THEN config_value END) as app_certificate
    FROM app_config
    WHERE config_key IN ('agora_app_id', 'agora_app_certificate');
END;
$$ LANGUAGE plpgsql;

-- Trigger for app_config updated_at
CREATE TRIGGER update_app_config_updated_at BEFORE UPDATE ON app_config
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create function to generate channel name for a call
CREATE OR REPLACE FUNCTION generate_channel_name(p_call_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN 'call_' || REPLACE(p_call_id::TEXT, '-', '');
END;
$$;

COMMENT ON TABLE call_signals IS 'Stores call signaling data for WebRTC and Agora connections';
COMMENT ON TABLE app_config IS 'Stores application configuration including Agora credentials';

