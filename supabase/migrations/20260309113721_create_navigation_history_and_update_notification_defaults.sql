/*
  # Create navigation_history table and update notification defaults

  ## New Tables
  - `navigation_history`
    - `id` (uuid, primary key)
    - `user_id` (uuid, FK to profiles)
    - `station_id` (text, FK to estaciones)
    - `station_name` (text) - snapshot of station name at visit time
    - `station_address` (text) - snapshot of address
    - `precio_gasolina_95` (numeric, nullable) - price snapshot at visit
    - `precio_gasolina_98` (numeric, nullable)
    - `precio_diesel` (numeric, nullable)
    - `precio_diesel_premium` (numeric, nullable)
    - `precio_glp` (numeric, nullable)
    - `visited_at` (timestamptz, default now())

  ## Changes
  - Update `notification_preferences` column defaults:
    - `price_alerts_enabled` defaults to `true`
    - `weekly_digest_enabled` defaults to `true`
    - `price_drop_threshold_pct` defaults to `10`

  ## Security
  - Enable RLS on `navigation_history`
  - Users can only view/insert their own history records
*/

CREATE TABLE IF NOT EXISTS navigation_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  station_id text NOT NULL,
  station_name text NOT NULL DEFAULT '',
  station_address text NOT NULL DEFAULT '',
  precio_gasolina_95 numeric,
  precio_gasolina_98 numeric,
  precio_diesel numeric,
  precio_diesel_premium numeric,
  precio_glp numeric,
  visited_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS navigation_history_user_id_idx ON navigation_history(user_id);
CREATE INDEX IF NOT EXISTS navigation_history_visited_at_idx ON navigation_history(visited_at DESC);

ALTER TABLE navigation_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own navigation history"
  ON navigation_history FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own navigation history"
  ON navigation_history FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own navigation history"
  ON navigation_history FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

ALTER TABLE notification_preferences
  ALTER COLUMN price_alerts_enabled SET DEFAULT true,
  ALTER COLUMN weekly_digest_enabled SET DEFAULT true,
  ALTER COLUMN price_drop_threshold_pct SET DEFAULT 10;
