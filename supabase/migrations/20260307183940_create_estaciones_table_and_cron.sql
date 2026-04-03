/*
  # Estaciones de Servicio - Schema y Configuración

  ## Nuevas Tablas
  - `estaciones`: Almacena todas las estaciones de servicio de España
    - `id` (text, PK): Identificador IDEESS del Ministerio
    - `rotulo` (text): Nombre/marca de la gasolinera
    - `direccion`, `localidad`, `provincia`, `cp`: Ubicación
    - `latitud`, `longitud`: Coordenadas GPS
    - `horario`: Horario de apertura
    - `precio_gasolina_95`, `precio_gasolina_98`: Precios gasolina
    - `precio_diesel`, `precio_diesel_premium`: Precios diésel
    - `precio_glp`: Precio GLP
    - `updated_at`: Última actualización

  ## Extensiones
  - `pg_cron`: Planificador de tareas para el cron job nocturno
  - `pg_net`: Cliente HTTP asíncrono para llamar al Edge Function

  ## Seguridad
  - RLS activado
  - SELECT público (datos públicos del Ministerio)
  - INSERT/UPDATE/DELETE solo para service role

  ## Índices
  - Índice compuesto en (latitud, longitud) para búsquedas geoespaciales
  - Índice en rotulo para búsquedas por marca
*/

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Create the estaciones table
CREATE TABLE IF NOT EXISTS estaciones (
  id text PRIMARY KEY,
  rotulo text NOT NULL DEFAULT '',
  direccion text NOT NULL DEFAULT '',
  localidad text NOT NULL DEFAULT '',
  provincia text NOT NULL DEFAULT '',
  cp text NOT NULL DEFAULT '',
  latitud double precision NOT NULL DEFAULT 0,
  longitud double precision NOT NULL DEFAULT 0,
  horario text NOT NULL DEFAULT '',
  precio_gasolina_95 double precision,
  precio_gasolina_98 double precision,
  precio_diesel double precision,
  precio_diesel_premium double precision,
  precio_glp double precision,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes for geo queries and brand lookups
CREATE INDEX IF NOT EXISTS estaciones_lat_lng_idx ON estaciones (latitud, longitud);
CREATE INDEX IF NOT EXISTS estaciones_rotulo_idx ON estaciones (rotulo);
CREATE INDEX IF NOT EXISTS estaciones_provincia_idx ON estaciones (provincia);

-- Enable RLS
ALTER TABLE estaciones ENABLE ROW LEVEL SECURITY;

-- Public read access (fuel prices are public government data)
CREATE POLICY "Public read access for estaciones"
  ON estaciones
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- Only service role can write
CREATE POLICY "Service role can insert estaciones"
  ON estaciones
  FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY "Service role can update estaciones"
  ON estaciones
  FOR UPDATE
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role can delete estaciones"
  ON estaciones
  FOR DELETE
  TO service_role
  USING (true);

-- Create a sync_log table to track sync history
CREATE TABLE IF NOT EXISTS sync_log (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  synced_at timestamptz NOT NULL DEFAULT now(),
  stations_count integer,
  status text NOT NULL DEFAULT 'success',
  error_message text
);

ALTER TABLE sync_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read access for sync_log"
  ON sync_log
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Service role can insert sync_log"
  ON sync_log
  FOR INSERT
  TO service_role
  WITH CHECK (true);
