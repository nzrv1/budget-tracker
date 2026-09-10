-- Per-user server-side bookkeeping for Telegram push notifications (the notify-tick Edge
-- Function, added later). Deliberately a SEPARATE table from app_states rather than another
-- field inside the state JSON blob — the same reasoning that keeps `ledger_last_changed_at`
-- out of the AppState object (see src/lib/storage.ts):
--
--   * the server owns and writes this on its own schedule (every ~15 min from pg_cron), never
--     the client;
--   * a stale device pushing an old AppState must never be able to clobber "we already sent
--     the user this notification an hour ago";
--   * it doesn't need migrate()/mockState() support and shouldn't round-trip through every
--     place that spreads an AppState.
--
-- The user's *preference* for how many notifications they want is the opposite direction —
-- that lives in AppState.settings.notificationLevel and syncs like any other setting. This
-- table is state the client should never author.
create table if not exists public.telegram_notify_state (
  -- Same identity as app_states. The FK guarantees we never keep notification bookkeeping for
  -- a user who has never synced any app data (there'd be nothing to notify them about), and
  -- cleans itself up if that row is ever removed.
  telegram_user_id text primary key references public.app_states(telegram_user_id) on delete cascade,
  -- IANA zone reported by the client (Intl.DateTimeFormat().resolvedOptions().timeZone) so the
  -- "Friday 17:00–18:00", "start of the month, morning", "end of the month, evening" checks in
  -- notify-tick run against the user's own wall clock, not the server's. The default is only a
  -- placeholder for the rare row created (via the FK-satisfying push) before the client has
  -- reported a real one.
  timezone text not null default 'Europe/Riga',
  -- Set true when the Telegram Bot API answers 403 (the user blocked or stopped the bot).
  -- notify-tick skips blocked users; a fresh /start seen by telegram-webhook clears it again.
  blocked boolean not null default false,
  -- Per-notification delivery log: { "<key>": "<ISO timestamp we last sent it>" }. notify-tick
  -- reads this to enforce each type's minimum spacing — e.g. budget_exceeded is once per 24h
  -- per category, stored under keys like "budget_exceeded:Food".
  last_sent jsonb not null default '{}',
  -- Precomputed firing moment for random_encouragement (Mon–Fri 10:00–18:00, once per week, at
  -- a random instant). Derived deterministically from telegram_user_id + ISO week so two
  -- overlapping ticks agree on it without a race; persisted so we don't recompute each tick
  -- and so manual inspection shows when the next nudge is due.
  random_target_at timestamptz,
  updated_at timestamptz not null default now()
);

-- Same posture as app_states: RLS is ON with ZERO policies, so the publishable/anon key cannot
-- read or write this table at all. Every access goes through an Edge Function holding the
-- secret key (which bypasses RLS) after it has verified who the caller is. Never add a policy
-- here to make the publishable key "work" directly.
alter table public.telegram_notify_state enable row level security;

-- notify-tick's main scan is "every user we might message this tick" — all rows, minus the
-- ones who've blocked the bot.
create index if not exists telegram_notify_state_active_idx
  on public.telegram_notify_state (telegram_user_id)
  where blocked = false;

-- ...and a narrower "whose random weekly nudge is due at or before now" lookup.
create index if not exists telegram_notify_state_random_target_idx
  on public.telegram_notify_state (random_target_at)
  where random_target_at is not null;

-- Belt-and-suspenders updated_at, matching app_states — every Edge Function write also sets it
-- explicitly, but a manual touch in the SQL editor stays correct too.
create or replace function public.set_telegram_notify_state_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists telegram_notify_state_set_updated_at on public.telegram_notify_state;
create trigger telegram_notify_state_set_updated_at
  before update on public.telegram_notify_state
  for each row
  execute function public.set_telegram_notify_state_updated_at();
