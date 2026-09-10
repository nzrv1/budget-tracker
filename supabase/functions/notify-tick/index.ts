// notify-tick — the scheduled heartbeat behind Telegram notifications.
//
// pg_cron POSTs here every ~15 minutes (see the migration / brief for the cron.schedule call).
// Each run: load every non-blocked user's AppState, run the whole notification catalogue
// (_shared/notification-templates.ts) against their data and their local wall clock, and send
// whatever is both due and past its per-key spacing. Delivery bookkeeping (last_sent, blocked)
// lives in telegram_notify_state — never in the AppState blob (see that migration).
//
// Auth: like sync-state, verify_jwt is off (supabase/config.toml) — pg_cron calls it with no
// Supabase session. There's nothing user-specific in the request, and every send is rate-limited
// by last_sent, so an unauthenticated trigger can at worst make us re-check early. If you want it
// locked down anyway, set the NOTIFY_TICK_SECRET function secret and have the cron call send an
// `x-notify-secret` header with the same value.
//
// Deploy: supabase functions deploy notify-tick

import { createClient } from 'npm:@supabase/supabase-js@2'
import type { SupabaseClient } from 'npm:@supabase/supabase-js@2'
import type { AppState } from '../../../src/types.ts'
import { TEMPLATES, type NotificationContext } from '../_shared/notification-templates.ts'
import { hashString, isoWeek, wallTimeToInstant, zonedNow, type ZonedNow } from '../_shared/zoned-time.ts'
import { notifStrings } from '../_shared/notification-i18n.ts'
import { sendMessage } from '../_shared/telegram-api.ts'

// Mirrors AppState.settings.notificationLevel (Stage C). 'important_only' delivers only
// category:'hard' templates; 'off' silences everything; missing/unknown → 'all'.
type NotificationLevel = 'all' | 'important_only' | 'off'

interface NotifyRow {
  telegram_user_id: string
  timezone: string | null
  last_sent: Record<string, string> | null
  random_target_at: string | null
  app_states: { state: AppState } | { state: AppState }[] | null
}

/**
 * The instant random_encouragement fires this ISO week for this user: a deterministic pick of a
 * weekday (Mon–Fri) and a minute within 10:00–18:00 local, seeded by user id + ISO week so every
 * concurrent tick lands on the same value without coordinating.
 */
function randomEncouragementSlot(telegramUserId: string, zoned: ZonedNow): Date {
  const { isoYear, week } = isoWeek(zoned.year, zoned.month, zoned.day)
  const h = hashString(`${telegramUserId}:${isoYear}:${week}`)
  const dayOffset = h % 5 // 0..4 → Monday..Friday
  const minutesIntoWindow = Math.floor(h / 5) % (8 * 60) // 0..479 across 10:00–18:00

  const daysSinceMonday = (zoned.weekday + 6) % 7
  const monday = new Date(zoned.year, zoned.month - 1, zoned.day - daysSinceMonday + dayOffset)
  return wallTimeToInstant(
    zoned.timezone,
    monday.getFullYear(),
    monday.getMonth() + 1,
    monday.getDate(),
    10 + Math.floor(minutesIntoWindow / 60),
    minutesIntoWindow % 60,
  )
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
}

function secretKey(): string | null {
  return (
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ??
    JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS') ?? '{}')['default'] ??
    null
  )
}

/** PostgREST returns an embedded to-one either as an object or (defensively) a one-element array. */
function embeddedState(row: NotifyRow): AppState | null {
  const embed = row.app_states
  if (!embed) return null
  const rec = Array.isArray(embed) ? embed[0] : embed
  return rec?.state ?? null
}

async function processUser(
  supabase: SupabaseClient,
  row: NotifyRow,
  now: Date,
): Promise<{ sent: string[]; skipped: number; blocked: boolean }> {
  const result = { sent: [] as string[], skipped: 0, blocked: false }

  const state = embeddedState(row)
  if (!state || !state.settings) return result

  const level: NotificationLevel = (state.settings as { notificationLevel?: NotificationLevel }).notificationLevel ?? 'all'
  if (level === 'off') return result

  const zoned = zonedNow(now, row.timezone || 'Europe/Riga')
  const localToday = new Date(zoned.year, zoned.month - 1, zoned.day)
  const lastSent: Record<string, string> = { ...(row.last_sent || {}) }

  const { isoYear, week } = isoWeek(zoned.year, zoned.month, zoned.day)
  const randomTargetAt = randomEncouragementSlot(row.telegram_user_id, zoned)

  const ctx: NotificationContext = {
    state,
    telegramUserId: row.telegram_user_id,
    s: notifStrings((state.settings as { language?: string }).language),
    zoned,
    localToday,
    isoWeekKey: `${isoYear}-W${week}`,
    randomTargetAt,
    lastSentAt: (key) => (lastSent[key] ? new Date(lastSent[key]) : null),
  }

  const updates: Record<string, string> = {}
  // Persist the computed slot for observability (and so a manual look shows the next nudge time).
  const persistRandomTarget = row.random_target_at !== randomTargetAt.toISOString()

  for (const template of TEMPLATES) {
    if (level === 'important_only' && template.category !== 'hard') continue

    let candidates
    try {
      candidates = template.evaluate(ctx)
    } catch (e) {
      console.error(`template ${template.id} threw for ${row.telegram_user_id}:`, (e as Error).message)
      continue
    }

    for (const candidate of candidates) {
      const last = lastSent[candidate.key] ? new Date(lastSent[candidate.key]).getTime() : 0
      if (last && now.getTime() - last < template.minIntervalHours * 3_600_000) {
        result.skipped++
        continue
      }

      // Hard notifications buzz; encouragement arrives silently.
      const send = await sendMessage(row.telegram_user_id, candidate.text, {
        button: candidate.button,
        silent: template.category !== 'hard',
      })

      if (send.ok) {
        const stamp = new Date().toISOString()
        lastSent[candidate.key] = stamp
        updates[candidate.key] = stamp
        result.sent.push(candidate.key)
      } else if (send.blocked) {
        result.blocked = true
        console.log(`${row.telegram_user_id} has blocked the bot — marking blocked`)
        break
      } else {
        console.error(`send failed for ${row.telegram_user_id} (${candidate.key}): ${send.status} ${send.description}`)
      }
    }
    if (result.blocked) break
  }

  if (Object.keys(updates).length > 0 || result.blocked || persistRandomTarget) {
    const patch: Record<string, unknown> = { updated_at: new Date().toISOString() }
    if (Object.keys(updates).length > 0) patch.last_sent = lastSent
    if (result.blocked) patch.blocked = true
    if (persistRandomTarget) patch.random_target_at = randomTargetAt.toISOString()
    const { error } = await supabase.from('telegram_notify_state').update(patch).eq('telegram_user_id', row.telegram_user_id)
    if (error) console.error(`failed to persist notify state for ${row.telegram_user_id}:`, error.message)
  }

  return result
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return jsonResponse({ error: 'method not allowed' }, 405)

  const expectedSecret = Deno.env.get('NOTIFY_TICK_SECRET')
  if (expectedSecret && req.headers.get('x-notify-secret') !== expectedSecret) {
    return jsonResponse({ error: 'unauthorized' }, 401)
  }

  if (!Deno.env.get('TELEGRAM_BOT_TOKEN')) {
    return jsonResponse({ error: 'server misconfigured: TELEGRAM_BOT_TOKEN not set' }, 500)
  }
  const key = secretKey()
  if (!key) return jsonResponse({ error: 'server misconfigured: no secret key available' }, 500)

  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, key)
  const now = new Date()

  const { data, error } = await supabase
    .from('telegram_notify_state')
    .select('telegram_user_id, timezone, last_sent, random_target_at, app_states(state)')
    .eq('blocked', false)
  if (error) return jsonResponse({ error: error.message }, 500)

  const rows = (data ?? []) as unknown as NotifyRow[]
  let usersNotified = 0
  let messagesSent = 0
  let blockedNow = 0

  for (const row of rows) {
    const r = await processUser(supabase, row, now)
    if (r.sent.length > 0) usersNotified++
    messagesSent += r.sent.length
    if (r.blocked) blockedNow++
  }

  const summary = { tick: now.toISOString(), usersScanned: rows.length, usersNotified, messagesSent, blockedNow }
  console.log('notify-tick', JSON.stringify(summary))
  return jsonResponse(summary)
})
