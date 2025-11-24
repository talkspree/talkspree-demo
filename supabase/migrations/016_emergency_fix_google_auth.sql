-- EMERGENCY FIX FOR GOOGLE AUTH
-- This temporarily disables the trigger causing issues
-- and cleans up any stuck profiles

-- Step 1: Drop the problematic trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Step 2: Create a simpler trigger that won't fail
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    -- Use INSERT ... ON CONFLICT to handle all cases
    INSERT INTO profiles (
        id, 
        email, 
        first_name, 
        last_name,
        profile_picture_url
    )
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'name', NEW.raw_user_meta_data->>'full_name', ''),
        '',
        COALESCE(NEW.raw_user_meta_data->>'avatar_url', NEW.raw_user_meta_data->>'picture', NULL)
    )
    ON CONFLICT (id) DO NOTHING;
    
    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        -- If anything fails, still return NEW to allow auth to proceed
        RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 3: Recreate the trigger
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Step 4: Clean up any incomplete profiles (optional - uncomment if needed)
-- DELETE FROM profiles WHERE first_name IS NULL OR first_name = '';

