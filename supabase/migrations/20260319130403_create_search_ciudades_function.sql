/*
  # Create search_ciudades RPC function

  ## Summary
  Creates a PostgreSQL function that efficiently searches for cities in the
  estaciones table and returns aggregated results with coordinates and station counts.

  ## New Functions
  - `search_ciudades(query text, max_results int)` - Searches for cities matching
    the query string, returns localidad, provincia, average lat/lng, and station count.

  ## Notes
  - Uses ILIKE for case-insensitive matching with prefix search
  - Aggregates multiple stations per city into a single result
  - Returns top results ordered by station count descending
  - Accessible to anon and authenticated roles via SECURITY DEFINER
*/

CREATE OR REPLACE FUNCTION search_ciudades(query text, max_results int DEFAULT 8)
RETURNS TABLE(localidad text, provincia text, lat double precision, lng double precision, "stationCount" bigint)
LANGUAGE sql
SECURITY DEFINER
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

GRANT EXECUTE ON FUNCTION search_ciudades(text, int) TO anon, authenticated;
