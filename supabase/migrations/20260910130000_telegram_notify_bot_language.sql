-- The Telegram bot now works before the Mini App is ever opened: /start asks the user to pick a
-- chat language (RU / EN / LV) and stores it. That means telegram_notify_state needs a row for a
-- user who has NO app_states row yet — so the FK to app_states, added in the first migration, is
-- dropped. notify-tick already skips any telegram_notify_state row whose app_states embed is null
-- (embeddedState() returns null → no notifications), so an "orphan" row is harmless; it just
-- carries the language until the user opens the app.
alter table public.telegram_notify_state
  drop constraint if exists telegram_notify_state_telegram_user_id_fkey;

-- Bot-chat language, set by the /start language picker (telegram-webhook). Distinct from the
-- in-app language in app_states.state.settings.language, which drives the scheduled notification
-- copy. NULL until the user picks one.
alter table public.telegram_notify_state
  add column if not exists bot_language text;
