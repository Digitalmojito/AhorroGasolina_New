/*
  # Fix cron jobs and add sync-chargers schedule

  ## Changes
  1. Ensure sync-estaciones-daily is active at 2:30 AM UTC (already exists, leave it)
  2. Re-create sync-estaciones-morning at 6:00 AM UTC (was missing)
  3. Add sync-chargers-weekly every Sunday at 3:00 AM UTC (chargers change less often)

  ## Notes
  - Both sync-estaciones functions use verifyJWT=false so the anon key is sufficient
  - sync-chargers also uses verifyJWT=false
  - pg_net http_post is fire-and-forget; success/failure tracked in Edge Function logs
*/

-- Restore the 6 AM morning run for estaciones (was missing from active jobs)
SELECT cron.unschedule('sync-estaciones-morning') WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'sync-estaciones-morning'
);

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

-- Add weekly sync for EV chargers (Sunday 3:00 AM UTC)
SELECT cron.unschedule('sync-chargers-weekly') WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'sync-chargers-weekly'
);

SELECT cron.schedule(
  'sync-chargers-weekly',
  '0 3 * * 0',
  $$
  SELECT net.http_post(
    url := 'https://vofvkczocurpuqtlzyoo.supabase.co/functions/v1/sync-chargers',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZvZnZrY3pvY3VycHVxdGx6eW9vIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5MDQ2OTIsImV4cCI6MjA4ODQ4MDY5Mn0.OTnd74_-Z5f0XOQSJjZ5K1Ruu2HKqVmD3upihrKLxIE'
    ),
    body := '{}'::jsonb
  );
  $$
);
