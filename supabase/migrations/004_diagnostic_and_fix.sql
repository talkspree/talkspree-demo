-- Comprehensive diagnostic and fix for profile creation issues

-- 1. Check current table structure
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'profiles'
ORDER BY ordinal_position;

-- 2. Check if trigger exists
SELECT * FROM pg_trigger WHERE tgname = 'on_auth_user_created';

-- 3. Drop everything and recreate from scratch
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS handle_new_user() CASCADE;

-- 4. Make all fields nullable except id and email
ALTER TABLE profiles ALTER COLUMN first_name DROP NOT NULL;
ALTER TABLE profiles ALTER COLUMN last_name DROP NOT NULL;
ALTER TABLE profiles ALTER COLUMN date_of_birth DROP NOT NULL;
ALTER TABLE profiles ALTER COLUMN gender DROP NOT NULL;
ALTER TABLE profiles ALTER COLUMN location DROP NOT NULL;
ALTER TABLE profiles ALTER COLUMN occupation DROP NOT NULL;
ALTER TABLE profiles ALTER COLUMN bio DROP NOT NULL;
ALTER TABLE profiles ALTER COLUMN phone DROP NOT NULL;

-- 5. Create the simplest possible trigger
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
    INSERT INTO public.profiles (
        id,
        email,
        first_name,
        last_name
    )
    VALUES (
        NEW.id,
        NEW.email,
        '',
        ''
    );
    RETURN NEW;
EXCEPTION
    WHEN unique_violation THEN
        -- Profile already exists, ignore
        RETURN NEW;
    WHEN OTHERS THEN
        -- Log the error but don't fail the auth
        RAISE WARNING 'Error creating profile: %', SQLERRM;
        RETURN NEW;
END;
$$;

-- 6. Create the trigger
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION handle_new_user();

-- 7. Test the function manually
-- SELECT handle_new_user();

-- 8. Verify trigger is active
SELECT 
    trigger_name,
    event_manipulation,
    event_object_table,
    action_statement
FROM information_schema.triggers
WHERE trigger_name = 'on_auth_user_created';

