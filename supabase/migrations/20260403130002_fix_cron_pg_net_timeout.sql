/*
  # Fix cron jobs to use longer pg_net timeout

  The existing cron jobs use net.http_post with the default 5s timeout.
  The sync functions need much more time to complete (fetching + upserting 12k+ records).

  This migration:
  1. Removes old cron jobs
  2. Re-creates them using net.http_post with a 300s (5 minute) timeout
  3. Both sync-estaciones and sync-chargers get updated schedules
*/

SELECT cron.unschedule('sync-estaciones-daily');
SELECT cron.unschedule('sync-estaciones-morning');
SELECT cron.unschedule('sync-chargers-daily');

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
    body := '{}'::jsonb,
    timeout_milliseconds := 300000
  );
  $$
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
    body := '{}'::jsonb,
    timeout_milliseconds := 300000
  );
  $$
);

SELECT cron.schedule(
  'sync-chargers-daily',
  '0 3 * * *',
  $$
  SELECT net.http_post(
    url := 'https://vofvkczocurpuqtlzyoo.supabase.co/functions/v1/sync-chargers',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZvZnZrY3pvY3VycHVxdGx6eW9vIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5MDQ2OTIsImV4cCI6MjA4ODQ4MDY5Mn0.OTnd74_-Z5f0XOQSJjZ5K1Ruu2HKqVmD3upihrKLxIE'
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 300000
  );
  $$
);
