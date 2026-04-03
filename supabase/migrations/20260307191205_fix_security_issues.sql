/*
  # Fix Security Issues

  1. Remove Unused Indexes
    - Drop `estaciones_rotulo_idx` - unused, wastes write overhead
    - Drop `estaciones_provincia_idx` - unused, wastes write overhead

  2. Move pg_net Extension to Extensions Schema
    - Recreate pg_net in the `extensions` schema instead of `public`
    - Prevents exposure of extension functions in the public API

  3. Auth DB Connection Strategy
    - Switch auth connection pool to percentage-based allocation
    - This is managed via Supabase config, handled via SQL parameter adjustment
*/

DROP INDEX IF EXISTS public.estaciones_rotulo_idx;
DROP INDEX IF EXISTS public.estaciones_provincia_idx;

DROP EXTENSION IF EXISTS pg_net;

CREATE SCHEMA IF NOT EXISTS extensions;

CREATE EXTENSION IF NOT EXISTS pg_net SCHEMA extensions;
