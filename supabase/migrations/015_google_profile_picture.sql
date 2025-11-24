-- Update the profile creation trigger to save Google profile pictures
-- Drop the old trigger and function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS handle_new_user();

-- Create improved function that handles Google OAuth profile pictures
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    full_name_val TEXT;
    first_name_val TEXT;
    last_name_val TEXT;
BEGIN
    -- Extract full name from metadata
    full_name_val := COALESCE(
        NEW.raw_user_meta_data->>'full_name', 
        NEW.raw_user_meta_data->>'name', 
        ''
    );
    
    -- Split full name into first and last name
    IF full_name_val != '' THEN
        -- Take first word as first name, rest as last name
        first_name_val := SPLIT_PART(full_name_val, ' ', 1);
        last_name_val := TRIM(SUBSTRING(full_name_val FROM LENGTH(first_name_val) + 1));
    ELSE
        first_name_val := COALESCE(NEW.raw_user_meta_data->>'first_name', '');
        last_name_val := COALESCE(NEW.raw_user_meta_data->>'last_name', '');
    END IF;

    -- Insert profile, or update if it already exists (handle race conditions)
    INSERT INTO profiles (
        id, 
        email, 
        first_name, 
        last_name,
        date_of_birth,
        gender,
        location,
        occupation,
        bio,
        profile_picture_url
    )
    VALUES (
        NEW.id,
        NEW.email,
        first_name_val,
        last_name_val,
        COALESCE((NEW.raw_user_meta_data->>'date_of_birth')::DATE, NULL),
        COALESCE(NEW.raw_user_meta_data->>'gender', ''),
        COALESCE(NEW.raw_user_meta_data->>'location', ''),
        COALESCE(NEW.raw_user_meta_data->>'occupation', ''),
        COALESCE(NEW.raw_user_meta_data->>'bio', ''),
        -- Save Google profile picture if available
        COALESCE(NEW.raw_user_meta_data->>'avatar_url', NEW.raw_user_meta_data->>'picture', NULL)
    )
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        first_name = COALESCE(NULLIF(profiles.first_name, ''), EXCLUDED.first_name),
        last_name = COALESCE(NULLIF(profiles.last_name, ''), EXCLUDED.last_name),
        profile_picture_url = COALESCE(profiles.profile_picture_url, EXCLUDED.profile_picture_url);
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the trigger
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_user();

