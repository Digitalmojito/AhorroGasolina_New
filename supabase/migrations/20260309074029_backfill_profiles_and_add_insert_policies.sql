/*
  # Backfill missing profiles and add INSERT RLS policies

  1. Data Fixes
    - Insert missing `profiles` rows for existing auth users who don't have one
    - Insert missing `notification_preferences` rows for existing auth users who don't have one
    - Uses display_name from auth user metadata where available

  2. Security Changes
    - Add INSERT policy on `profiles` so authenticated users can create their own profile row
    - Add INSERT policy on `notification_preferences` so authenticated users can create their own preferences row
    - Both policies restrict inserts to rows matching the authenticated user's ID

  3. Important Notes
    - This fixes a race condition where the signup trigger may not fire before the app tries to upsert profile data
    - The new INSERT policies allow the signup flow's upsert to work correctly
*/

INSERT INTO profiles (id, display_name)
SELECT u.id, COALESCE(u.raw_user_meta_data->>'display_name', '')
FROM auth.users u
WHERE NOT EXISTS (SELECT 1 FROM profiles p WHERE p.id = u.id);

INSERT INTO notification_preferences (user_id)
SELECT u.id
FROM auth.users u
WHERE NOT EXISTS (SELECT 1 FROM notification_preferences np WHERE np.user_id = u.id);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'profiles' AND policyname = 'Users can insert own profile'
  ) THEN
    CREATE POLICY "Users can insert own profile"
      ON profiles
      FOR INSERT
      TO authenticated
      WITH CHECK (auth.uid() = id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'notification_preferences' AND policyname = 'Users can insert own notification preferences'
  ) THEN
    CREATE POLICY "Users can insert own notification preferences"
      ON notification_preferences
      FOR INSERT
      TO authenticated
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;
