/*
  # Update cron to call Netlify endpoint for estaciones sync

  The MINETUR government API blocks Supabase edge function server IPs.
  This updates the cron jobs to call the Next.js API route on Netlify instead,
  which is not blocked.

  The sync secret is hardcoded here and must match SYNC_SECRET in Netlify env vars.
*/

SELECT cron.unschedule('sync-estaciones-daily');
SELECT cron.unschedule('sync-estaciones-morning');

SELECT cron.schedule(
  'sync-estaciones-daily',
  '30 2 * * *',
  $$
  SELECT net.http_post(
    url := 'https://ahorrogasolina.es/api/sync-estaciones',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer sync_ahorrogasolina_2026_secret'
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
    url := 'https://ahorrogasolina.es/api/sync-estaciones',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer sync_ahorrogasolina_2026_secret'
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 300000
  );
  $$
);
