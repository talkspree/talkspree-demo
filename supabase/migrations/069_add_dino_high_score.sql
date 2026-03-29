-- Add dino high score column to profiles for per-account persistence
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS dino_high_score INTEGER DEFAULT 0;
