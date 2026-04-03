/*
  # Fix cron job authentication and add 6 AM schedule

  ## Problem
  The existing cron job uses `current_setting('app.service_role_key', true)` which
  returns null because this database setting was never populated. This caused every
  scheduled sync to fail silently with a 401 Unauthorized error.

  ## Changes
  1. Drop the broken existing cron job
  2. Re-create it at 2:30 AM UTC using the anon key (sync-estaciones has verifyJWT=false
     so it does not require a privileged token)
  3. Add a second daily run at 6:00 AM UTC for more frequent price freshness

  ## Notes
  - sync-estaciones Edge Function verifyJWT is false, so anon key is sufficient
  - Both jobs call the same function; having two daily runs reduces max data staleness
    from ~24h to ~12h
*/

-- Remove the broken job that uses the null app.service_role_key setting
SELECT cron.unschedule('sync-estaciones-daily');

-- Re-create the 2:30 AM job with correct auth (anon key, verifyJWT=false on function)
SELECT cron.schedule(
  'sync-estaciones-daily',
  '30 2 * * *',
  $$
  SELECT net.http_post(
    url := 'https://vofvkczocurpuqtlzyoo.supabase.co/functions/v1/sync-estaciones',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZvZnZrY3pvY3VycHVxdGx6eW9vIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5MDQ2OTIsImV4cCI6MjA4ODQ4MDY5Mn0.OTnd74_-Z5f0XOQSJjZ5K1Ruu2HKqVmD3upihrKLxIE'
    ),
    body := '{}'::jsonb
  );
  $$
);

-- Add a second run at 6:00 AM UTC for more frequent price freshness
SELECT cron.schedule(
  'sync-estaciones-morning',
  '0 6 * * *',
  $$
  SELECT net.http_post(
    url := 'https://vofvkczocurpuqtlzyoo.supabase.co/functions/v1/sync-estaciones',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZvZnZrY3pvY3VycHVxdGx6eW9vIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5MDQ2OTIsImV4cCI6MjA4ODQ4MDY5Mn0.OTnd74_-Z5f0XOQSJjZ5K1Ruu2HKqVmD3upihrKLxIE'
    ),
    body := '{}'::jsonb
  );
  $$
);
