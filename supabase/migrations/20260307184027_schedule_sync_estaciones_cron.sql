/*
  # Cron Job - Sincronización diaria de estaciones

  Programa un cron job que ejecuta el Edge Function `sync-estaciones`
  cada día a las 2:30 AM (UTC) usando pg_cron + pg_net.

  - Nombre del job: 'sync-estaciones-daily'
  - Horario: 30 2 * * * (2:30 AM todos los días)
  - Método: POST al Edge Function via pg_net
*/

SELECT cron.schedule(
  'sync-estaciones-daily',
  '30 2 * * *',
  $$
  SELECT net.http_post(
    url := 'https://0ec90b57d6e95fcbda19832f.supabase.co/functions/v1/sync-estaciones',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.service_role_key', true)
    ),
    body := '{}'::jsonb
  );
  $$
);
