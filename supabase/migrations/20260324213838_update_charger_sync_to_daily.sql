/*
  # Update charger sync cron to daily schedule

  ## Changes
  - Changes sync-chargers cron from weekly (Sundays only) to daily at 3:00 AM UTC
  - This keeps the database cache warm so it can serve as a fast fallback
    when the live OpenChargeMap API is unavailable

  ## Notes
  - The API route now fetches live from OpenChargeMap first, and falls back to the DB
  - Daily sync ensures the DB stays reasonably fresh as a fallback layer
*/

SELECT cron.unschedule('sync-chargers-weekly') WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'sync-chargers-weekly'
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
    body := '{}'::jsonb
  );
  $$
);
