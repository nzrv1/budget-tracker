# Telegram notifications — deploy runbook

One-time wiring for the notification feature. Run from the **project root**
(`C:\Users\nikzo\Desktop\budget-tracker`), where the `supabase/` folder is.

Project ref: `wqjbzmcrkmbdenwfyogw`. You're already logged in (`supabase login`) and linked.

---

## 1. Apply the DB migration (if not done already)

```bash
npx supabase db push
```

Creates `telegram_notify_state`. Safe to re-run.

## 2. Set function secrets

`TELEGRAM_BOT_TOKEN` is already set (used by `sync-state`). Add one secret for the webhook:

```bash
npx supabase secrets set TELEGRAM_WEBHOOK_SECRET=<paste a long random string>
```

Generate one, e.g.: `openssl rand -hex 32`

(Optional, to lock down the cron endpoint too: `npx supabase secrets set NOTIFY_TICK_SECRET=<another random string>` — then uncomment the matching header line in `notify-tick/schedule.sql`.)

## 3. Deploy the functions

```bash
npx supabase functions deploy sync-state
npx supabase functions deploy notify-tick
npx supabase functions deploy telegram-webhook
```

- `sync-state` — redeploy: now also records the client's timezone into `telegram_notify_state`. Backward compatible.
- `notify-tick` — new. Does nothing until step 5 (cron) runs.
- `telegram-webhook` — new. Does nothing until step 4 (setWebhook) runs.

## 4. Point Telegram at the webhook

Replace `<TOKEN>` with the bot token (Dashboard → Project Settings → Edge Functions secrets, or BotFather) and `<SECRET>` with the `TELEGRAM_WEBHOOK_SECRET` from step 2:

```bash
curl "https://api.telegram.org/bot<TOKEN>/setWebhook" \
  -d "url=https://wqjbzmcrkmbdenwfyogw.supabase.co/functions/v1/telegram-webhook" \
  -d "secret_token=<SECRET>" \
  -d 'allowed_updates=["message","callback_query"]'
```

Check: `curl "https://api.telegram.org/bot<TOKEN>/getWebhookInfo"` → `"url"` set, `"last_error_message"` absent.

## 4b. Bot profile: description, short description, command menu (EN / RU / LV)

One script does all of it (proper UTF-8 — don't paste these calls by hand, PowerShell 5.1
mangles Cyrillic):

```powershell
powershell -ExecutionPolicy Bypass -File .\supabase\functions\setup-bot.ps1 -Token "<BOT TOKEN>"
```

Sets: the bot **description** (the greeting shown above the START button in an empty chat), the
**short description** (profile page), and the **command menu** (`/start`, `/settings`,
`/language` behind the `☰` / `/` button) — each in English, Russian and Latvian.

To see the description + START button after you've already pressed START: open the bot chat →
tap the bot name → "Delete and Stop", then reopen the bot.

## 5. Schedule notify-tick — already done

Applied as migration `20260910140000_notify_tick_cron.sql` (step 1's `db push`). It enables
pg_cron + pg_net and schedules notify-tick every 15 minutes.
[`notify-tick/schedule.sql`](notify-tick/schedule.sql) has the queries to inspect / pause / remove it.

## 6. Verify live

- DM the bot `/start` → language picker (Русский / English / Latviešu) → after you tap one, the
  same message becomes the welcome text in that language, with an "Open Ledger" button that
  opens the Mini App already switched to that language (`?startapp=lang_xx`).
- DM `/settings` → the notification-level explanation, in your chosen language.
- `/language` → re-opens the picker.
- Open the Mini App once (so `sync-state` writes your `app_states` row + timezone).
- To force a notification without waiting for a real trigger: in SQL Editor,
  `update telegram_notify_state set last_sent = '{}'::jsonb where telegram_user_id = '<your id>';`
  then either wait for the next tick or run
  `select net.http_post(url:='https://wqjbzmcrkmbdenwfyogw.supabase.co/functions/v1/notify-tick', headers:='{"Content-Type":"application/json"}'::jsonb);`
  (needs an existing due condition — e.g. an over-budget category, or a payday set to today).
- Tap a notification's "Отложить сейчас" button → Mini App opens on the right goal/date with the amount pre-filled.

### Logs

Dashboard → Edge Functions → `notify-tick` / `telegram-webhook` → Logs.
(This CLI version has no `functions logs` command.)
