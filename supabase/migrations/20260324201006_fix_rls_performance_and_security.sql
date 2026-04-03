/*
  # Fix RLS Performance, Indexes, and Security Issues

  ## Summary
  1. Replace `auth.uid()` with `(select auth.uid())` in all RLS policies for:
     - profiles, vehicles, favourite_stations, notification_preferences, navigation_history
     This prevents re-evaluation per row, improving query performance at scale.

  2. Add covering index on `vehicles.user_id` (foreign key without index).

  3. Drop unused indexes on chargers, charger_connectors, and navigation_history.

  4. Fix `search_ciudades` function search_path to prevent mutable search path vulnerability.
*/

-- ============================================================
-- 1. FIX PROFILES RLS POLICIES
-- ============================================================
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;

CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (id = (SELECT auth.uid()));

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (id = (SELECT auth.uid()));

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (id = (SELECT auth.uid()))
  WITH CHECK (id = (SELECT auth.uid()));

-- ============================================================
-- 2. FIX VEHICLES RLS POLICIES
-- ============================================================
DROP POLICY IF EXISTS "Users can view own vehicles" ON public.vehicles;
DROP POLICY IF EXISTS "Users can insert own vehicles" ON public.vehicles;
DROP POLICY IF EXISTS "Users can update own vehicles" ON public.vehicles;
DROP POLICY IF EXISTS "Users can delete own vehicles" ON public.vehicles;

CREATE POLICY "Users can view own vehicles"
  ON public.vehicles FOR SELECT
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can insert own vehicles"
  ON public.vehicles FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can update own vehicles"
  ON public.vehicles FOR UPDATE
  TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can delete own vehicles"
  ON public.vehicles FOR DELETE
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

-- ============================================================
-- 3. FIX FAVOURITE_STATIONS RLS POLICIES
-- ============================================================
DROP POLICY IF EXISTS "Users can view own favourites" ON public.favourite_stations;
DROP POLICY IF EXISTS "Users can insert own favourites" ON public.favourite_stations;
DROP POLICY IF EXISTS "Users can delete own favourites" ON public.favourite_stations;

CREATE POLICY "Users can view own favourites"
  ON public.favourite_stations FOR SELECT
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can insert own favourites"
  ON public.favourite_stations FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can delete own favourites"
  ON public.favourite_stations FOR DELETE
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

-- ============================================================
-- 4. FIX NOTIFICATION_PREFERENCES RLS POLICIES
-- ============================================================
DROP POLICY IF EXISTS "Users can view own notification preferences" ON public.notification_preferences;
DROP POLICY IF EXISTS "Users can insert own notification preferences" ON public.notification_preferences;
DROP POLICY IF EXISTS "Users can update own notification preferences" ON public.notification_preferences;

CREATE POLICY "Users can view own notification preferences"
  ON public.notification_preferences FOR SELECT
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can insert own notification preferences"
  ON public.notification_preferences FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can update own notification preferences"
  ON public.notification_preferences FOR UPDATE
  TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

-- ============================================================
-- 5. FIX NAVIGATION_HISTORY RLS POLICIES
-- ============================================================
DROP POLICY IF EXISTS "Users can view own navigation history" ON public.navigation_history;
DROP POLICY IF EXISTS "Users can insert own navigation history" ON public.navigation_history;
DROP POLICY IF EXISTS "Users can delete own navigation history" ON public.navigation_history;

CREATE POLICY "Users can view own navigation history"
  ON public.navigation_history FOR SELECT
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can insert own navigation history"
  ON public.navigation_history FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can delete own navigation history"
  ON public.navigation_history FOR DELETE
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

-- ============================================================
-- 6. ADD MISSING INDEX ON vehicles.user_id
-- ============================================================
CREATE INDEX IF NOT EXISTS vehicles_user_id_idx ON public.vehicles (user_id);

-- ============================================================
-- 7. DROP UNUSED INDEXES
-- ============================================================
DROP INDEX IF EXISTS public.navigation_history_visited_at_idx;
DROP INDEX IF EXISTS public.chargers_ocm_id_idx;
DROP INDEX IF EXISTS public.chargers_lat_lng_idx;
DROP INDEX IF EXISTS public.chargers_status_idx;
DROP INDEX IF EXISTS public.chargers_city_idx;
DROP INDEX IF EXISTS public.charger_connectors_charger_id_idx;
DROP INDEX IF EXISTS public.charger_connectors_plug_type_idx;
DROP INDEX IF EXISTS public.charger_connectors_speed_tier_idx;

-- ============================================================
-- 8. FIX search_ciudades FUNCTION SEARCH PATH
-- Drop and recreate to fix mutable search_path (SECURITY DEFINER with fixed search_path)
-- ============================================================
DROP FUNCTION IF EXISTS public.search_ciudades(text, integer);

CREATE FUNCTION public.search_ciudades(query text, max_results integer DEFAULT 8)
RETURNS TABLE(localidad text, provincia text, lat double precision, lng double precision, "stationCount" bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    e.localidad::text,
    e.provincia::text,
    AVG(e.latitud)::double precision AS lat,
    AVG(e.longitud)::double precision AS lng,
    COUNT(*)::bigint AS "stationCount"
  FROM estaciones e
  WHERE e.localidad ILIKE query || '%'
  GROUP BY e.localidad, e.provincia
  ORDER BY COUNT(*) DESC
  LIMIT max_results;
$$;
