-- ─────────────────────────────────────────────────────────────────────────────
-- The notify-tick pg_cron schedule is now applied as a migration
-- (supabase/migrations/20260910140000_notify_tick_cron.sql) — you don't need to run anything
-- here. This file is kept for inspection / management.
-- ─────────────────────────────────────────────────────────────────────────────

-- Is it scheduled and active?
select jobid, jobname, schedule, active
from cron.job
where jobname = 'notify-tick';

-- Recent runs (status 'succeeded' = the HTTP POST was dispatched; check the function logs for
-- what the tick actually did: Dashboard -> Edge Functions -> notify-tick -> Logs).
select status, return_message, start_time
from cron.job_run_details
where jobid = (select jobid from cron.job where jobname = 'notify-tick')
order by start_time desc
limit 10;

-- Pause / resume / remove:
--   update cron.job set active = false where jobname = 'notify-tick';
--   update cron.job set active = true  where jobname = 'notify-tick';
--   select cron.unschedule('notify-tick');

-- If notify-tick gets the NOTIFY_TICK_SECRET function secret, update the job's headers to send
-- a matching x-notify-secret, then it stays in sync:
--   select cron.schedule('notify-tick', '*/15 * * * *', $$
--     select net.http_post(
--       url := 'https://wqjbzmcrkmbdenwfyogw.supabase.co/functions/v1/notify-tick',
--       headers := '{"Content-Type":"application/json","x-notify-secret":"<the secret>"}'::jsonb
--     );
--   $$);
