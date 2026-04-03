/*
  # Create user profiles, vehicles, favourites and notification tables

  1. New Tables
    - `profiles`: Linked 1-to-1 with Supabase Auth users
      - `id` (uuid, primary key, references auth.users)
      - `display_name` (text)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

    - `vehicles`: User saved vehicles for personalised fuel cost estimates
      - `id` (uuid, primary key)
      - `user_id` (uuid, references profiles)
      - `nickname` (text)
      - `fuel_type` (text, one of gasolina95/gasolina98/diesel/dieselPremium/glp)
      - `tank_litres` (numeric)
      - `created_at` (timestamptz)

    - `favourite_stations`: User bookmarked stations
      - `user_id` (uuid, references profiles)
      - `station_id` (text, matches estaciones.id)
      - `added_at` (timestamptz)
      - Unique constraint on (user_id, station_id)

    - `notification_preferences`: Per-user email notification settings
      - `user_id` (uuid, primary key, references profiles)
      - `price_alerts_enabled` (boolean, default false)
      - `weekly_digest_enabled` (boolean, default false)
      - `price_drop_threshold_pct` (numeric, default 2)
      - `updated_at` (timestamptz)

    - `station_price_snapshots`: Daily price snapshots for change detection
      - `id` (uuid, primary key)
      - `station_id` (text)
      - `snapshot_date` (date)
      - `precio_gasolina_95` (numeric, nullable)
      - `precio_gasolina_98` (numeric, nullable)
      - `precio_diesel` (numeric, nullable)
      - `precio_diesel_premium` (numeric, nullable)
      - `precio_glp` (numeric, nullable)
      - Unique constraint on (station_id, snapshot_date)

  2. Security
    - Enable RLS on all new tables
    - Profiles: users can read/update only their own row
    - Vehicles: users can CRUD only their own rows
    - Favourite stations: users can CRUD only their own rows
    - Notification preferences: users can read/update only their own row
    - Station price snapshots: authenticated users can read; no user writes (service role only)

  3. Database trigger
    - Auto-insert into profiles and notification_preferences when a new auth user is created
*/

CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE TABLE IF NOT EXISTS vehicles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  nickname text NOT NULL DEFAULT '',
  fuel_type text NOT NULL DEFAULT 'gasolina95',
  tank_litres numeric NOT NULL DEFAULT 50,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own vehicles"
  ON vehicles FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own vehicles"
  ON vehicles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own vehicles"
  ON vehicles FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own vehicles"
  ON vehicles FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS favourite_stations (
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  station_id text NOT NULL,
  added_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, station_id)
);

ALTER TABLE favourite_stations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own favourites"
  ON favourite_stations FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own favourites"
  ON favourite_stations FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own favourites"
  ON favourite_stations FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS notification_preferences (
  user_id uuid PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  price_alerts_enabled boolean NOT NULL DEFAULT false,
  weekly_digest_enabled boolean NOT NULL DEFAULT false,
  price_drop_threshold_pct numeric NOT NULL DEFAULT 2,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notification preferences"
  ON notification_preferences FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notification preferences"
  ON notification_preferences FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS station_price_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  station_id text NOT NULL,
  snapshot_date date NOT NULL DEFAULT CURRENT_DATE,
  precio_gasolina_95 numeric,
  precio_gasolina_98 numeric,
  precio_diesel numeric,
  precio_diesel_premium numeric,
  precio_glp numeric,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(station_id, snapshot_date)
);

ALTER TABLE station_price_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view price snapshots"
  ON station_price_snapshots FOR SELECT
  TO authenticated
  USING (true);

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO profiles (id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', ''))
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO notification_preferences (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
