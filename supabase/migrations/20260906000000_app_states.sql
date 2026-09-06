-- One row per Telegram user, holding their entire AppState as JSON — mirrors the localStorage
-- model deliberately (see audit "что не трогать": AppState-in-one-object is the load-bearing
-- pattern the rest of the app is built around). No per-entity tables; splitting transactions,
-- goals, budgets etc. into their own tables would mean rewriting loadState()/saveState() and
-- every screen that reads AppState directly, for no benefit this app currently needs (no
-- cross-user queries, no admin views, no reporting across accounts).
create table if not exists public.app_states (
  telegram_user_id text primary key,
  state jsonb not null,
  updated_at timestamptz not null default now()
);

-- Row Level Security is ON with NO policies granted to anon/authenticated — by default that
-- denies every request made with the publishable key, direct or otherwise. The only way in is
-- the sync-state Edge Function, which verifies Telegram's signed initData itself (the publishable
-- key proves nothing about who's asking) and then reads/writes using the secret key, which
-- bypasses RLS. If you ever want to inspect this table's contents yourself, use the SQL Editor
-- (you're the project owner, not going through RLS) or a service-role connection — never grant
-- policies here to make the publishable key "work" directly against this table.
alter table public.app_states enable row level security;

-- Belt-and-suspenders: keep updated_at correct even if a row is ever touched by something other
-- than the Edge Function's own upsert (which already sets it explicitly).
create or replace function public.set_app_states_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists app_states_set_updated_at on public.app_states;
create trigger app_states_set_updated_at
  before update on public.app_states
  for each row
  execute function public.set_app_states_updated_at();
