-- Add columns to call_history to store topic configuration
-- This ensures both participants see the same prompts during a call

ALTER TABLE call_history
ADD COLUMN topic_preset VARCHAR(50),
ADD COLUMN custom_topics TEXT[],
ADD COLUMN custom_questions TEXT[];

-- Add index for faster queries
CREATE INDEX idx_call_history_topic_preset ON call_history(topic_preset);

-- Comment for documentation
COMMENT ON COLUMN call_history.topic_preset IS 'The topic preset selected for this call (e.g., icebreak, friendship, career, custom, none)';
COMMENT ON COLUMN call_history.custom_topics IS 'Custom topics array if using custom preset';
COMMENT ON COLUMN call_history.custom_questions IS 'Custom questions array if using custom preset';
