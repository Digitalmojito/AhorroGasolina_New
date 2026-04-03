/*
  # Update cron to call Netlify sync endpoint

  The MINETUR government API blocks Supabase edge function IPs with "Connection reset by peer".
  Netlify function IPs are not blocked.

  This migration updates the sync-estaciones cron jobs to call the Next.js API route
  hosted on Netlify (https://ahorrogasolina.es/api/sync-estaciones) instead of the
  Supabase edge function. The service role key is used as a bearer token to secure the endpoint.

  Changes:
  - sync-estaciones-daily: now calls Netlify API route
  - sync-estaciones-morning: now calls Netlify API route
  - sync-chargers-daily: unchanged (OCM API works from edge functions)
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
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
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
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 300000
  );
  $$
);
