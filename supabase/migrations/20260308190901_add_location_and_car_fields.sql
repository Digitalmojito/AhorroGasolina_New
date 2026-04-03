/*
  # Add location and car fields to profiles and vehicles

  1. Modified Tables
    - `profiles`: Add location, postcode, car_make, car_model columns for onboarding data
    - `vehicles`: Add car_make, car_model columns for richer vehicle info

  2. Notes
    - All new columns are nullable with sensible defaults
    - No data is removed; purely additive migration
*/

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'location') THEN
    ALTER TABLE profiles ADD COLUMN location text NOT NULL DEFAULT '';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'postcode') THEN
    ALTER TABLE profiles ADD COLUMN postcode text NOT NULL DEFAULT '';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'car_make') THEN
    ALTER TABLE profiles ADD COLUMN car_make text NOT NULL DEFAULT '';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'car_model') THEN
    ALTER TABLE profiles ADD COLUMN car_model text NOT NULL DEFAULT '';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vehicles' AND column_name = 'car_make') THEN
    ALTER TABLE vehicles ADD COLUMN car_make text NOT NULL DEFAULT '';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vehicles' AND column_name = 'car_model') THEN
    ALTER TABLE vehicles ADD COLUMN car_model text NOT NULL DEFAULT '';
  END IF;
END $$;
