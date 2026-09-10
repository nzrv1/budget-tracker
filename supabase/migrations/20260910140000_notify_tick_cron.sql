-- Schedule notify-tick to run every 15 minutes via pg_cron.
--
-- pg_cron + pg_net are available on all Supabase plans; enabling them here keeps the schedule
-- reproducible with the rest of the schema. cron.schedule() upserts by job name, so re-running
-- this migration is safe.
--
-- If notify-tick is ever locked down with the NOTIFY_TICK_SECRET function secret, add a matching
-- "x-notify-secret" entry to the headers jsonb below and re-run.

create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.schedule(
  'notify-tick',
  '*/15 * * * *',
  $$
    select net.http_post(
      url := 'https://wqjbzmcrkmbdenwfyogw.supabase.co/functions/v1/notify-tick',
      headers := '{"Content-Type": "application/json"}'::jsonb
    );
  $$
);
