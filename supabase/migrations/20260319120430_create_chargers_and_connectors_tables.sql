/*
  # Create EV Charger Tables

  ## Summary
  Creates two tables to store electric vehicle charging station data sourced from
  OpenChargeMap (OCM). This is separate from the existing fuel station data.

  ## New Tables

  ### 1. `chargers`
  Stores one row per EV charging location (a physical site that may have multiple
  connector points).

  - `id` - Internal UUID primary key
  - `ocm_id` - OpenChargeMap's unique integer ID (used for upserts)
  - `name` - Station name (operator + address or branded name)
  - `operator_name` - Charging network operator (Iberdrola, Endesa, etc.)
  - `address` - Street address
  - `city` - Municipality
  - `province` - Province
  - `postcode` - Postal code
  - `lat`, `lng` - Coordinates
  - `status` - Normalised status enum: operational | unavailable | unknown | planned | removed
  - `status_last_updated` - When the OCM community last confirmed this status
  - `usage_cost_raw` - Original pricing text from OCM (may be free text like "0.35 EUR/kWh")
  - `usage_cost_per_kwh` - Parsed numeric rate per kWh (null if unavailable)
  - `usage_cost_per_minute` - Parsed numeric rate per minute (null if unavailable)
  - `is_free` - Boolean, true if station is confirmed free
  - `access_type` - Public | Private | Staff only etc.
  - `ocm_url` - Link to the OCM listing
  - `last_synced_at` - When we last fetched this record from OCM

  ### 2. `charger_connectors`
  Stores individual connector points within a charging location.

  - `id` - Internal UUID primary key
  - `charger_id` - FK to chargers table
  - `ocm_connection_id` - OCM's connection record ID
  - `plug_type` - Normalised plug type: type2 | ccs | chademo | schuko | tesla | nacs | other
  - `plug_type_label` - Original label from OCM
  - `current_type` - ac | dc | unknown
  - `power_kw` - Power in kilowatts
  - `speed_tier` - Derived: slow | fast | rapid | ultra_rapid
  - `quantity` - Number of physical points of this type at the location
  - `connector_status` - operational | unavailable | unknown

  ## Security
  - RLS enabled on both tables
  - Public (anon) users can read all chargers and connectors (public data)
  - Only service role can insert/update/delete (sync function writes with service key)

  ## Indexes
  - `chargers(ocm_id)` for upsert lookup
  - `chargers(lat, lng)` for spatial queries
  - `chargers(status)` for status filter
  - `charger_connectors(charger_id)` for join queries
  - `charger_connectors(plug_type)` for filter queries
*/

CREATE TABLE IF NOT EXISTS chargers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ocm_id integer UNIQUE NOT NULL,
  name text NOT NULL DEFAULT '',
  operator_name text NOT NULL DEFAULT '',
  address text NOT NULL DEFAULT '',
  city text NOT NULL DEFAULT '',
  province text NOT NULL DEFAULT '',
  postcode text NOT NULL DEFAULT '',
  lat double precision NOT NULL,
  lng double precision NOT NULL,
  status text NOT NULL DEFAULT 'unknown' CHECK (status IN ('operational','unavailable','unknown','planned','removed')),
  status_last_updated timestamptz,
  usage_cost_raw text,
  usage_cost_per_kwh numeric(8,4),
  usage_cost_per_minute numeric(8,4),
  is_free boolean NOT NULL DEFAULT false,
  access_type text NOT NULL DEFAULT 'public',
  ocm_url text,
  last_synced_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS charger_connectors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  charger_id uuid NOT NULL REFERENCES chargers(id) ON DELETE CASCADE,
  ocm_connection_id integer,
  plug_type text NOT NULL DEFAULT 'other' CHECK (plug_type IN ('type2','ccs','chademo','schuko','tesla','nacs','other')),
  plug_type_label text NOT NULL DEFAULT '',
  current_type text NOT NULL DEFAULT 'unknown' CHECK (current_type IN ('ac','dc','unknown')),
  power_kw numeric(8,2),
  speed_tier text NOT NULL DEFAULT 'slow' CHECK (speed_tier IN ('slow','fast','rapid','ultra_rapid')),
  quantity integer NOT NULL DEFAULT 1,
  connector_status text NOT NULL DEFAULT 'unknown' CHECK (connector_status IN ('operational','unavailable','unknown')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS chargers_ocm_id_idx ON chargers(ocm_id);
CREATE INDEX IF NOT EXISTS chargers_lat_lng_idx ON chargers(lat, lng);
CREATE INDEX IF NOT EXISTS chargers_status_idx ON chargers(status);
CREATE INDEX IF NOT EXISTS chargers_city_idx ON chargers(city);
CREATE INDEX IF NOT EXISTS charger_connectors_charger_id_idx ON charger_connectors(charger_id);
CREATE INDEX IF NOT EXISTS charger_connectors_plug_type_idx ON charger_connectors(plug_type);
CREATE INDEX IF NOT EXISTS charger_connectors_speed_tier_idx ON charger_connectors(speed_tier);

ALTER TABLE chargers ENABLE ROW LEVEL SECURITY;
ALTER TABLE charger_connectors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read chargers"
  ON chargers FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Public can read charger connectors"
  ON charger_connectors FOR SELECT
  TO anon, authenticated
  USING (true);
