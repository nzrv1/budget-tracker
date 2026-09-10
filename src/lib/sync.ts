// Cloud sync (Telegram Phase 3) — lets the same person open the Mini App on a second device and
// pick up where the first one left off. Deliberately thin: this file only knows how to call the
// `sync-state` Supabase Edge Function; it never touches Postgres directly and never decides who's
// allowed to see what. Outside Telegram (no initData available), every export here is a no-op
// that resolves immediately — the app keeps working exactly as it always has, purely from
// localStorage, same as before this feature existed.
//
// Why an Edge Function instead of talking to the `app_states` table directly with the publishable
// key: Row Level Security on that table denies the publishable-key role entirely (see
// supabase/migrations — no policies granted to it), so the publishable key alone proves nothing
// about identity. The Edge Function is the one place that verifies Telegram's signed `initData`
// (using the bot token, which lives only as a server-side secret) before reading or writing
// anything, then uses its own elevated key to do so. See supabase/functions/sync-state/index.ts.
import { AppState } from '../types'
import { getTelegramInitData, getLocalTimezone } from './telegram'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined
const FUNCTION_URL = SUPABASE_URL ? `${SUPABASE_URL}/functions/v1/sync-state` : null

async function callSyncFunction(body: Record<string, unknown>): Promise<any> {
  if (!FUNCTION_URL || !SUPABASE_PUBLISHABLE_KEY) return null
  const res = await fetch(FUNCTION_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: SUPABASE_PUBLISHABLE_KEY },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(`sync-state responded ${res.status}`)
  return res.json()
}

/**
 * Fetches whatever's currently saved in Supabase for this Telegram user, or null when there's
 * nothing there yet, we're not inside Telegram, or the function is unreachable (offline, cold
 * start timeout, misconfiguration) — every failure mode is treated the same as "no cloud copy
 * yet" so a sync hiccup can never block the app from loading with its local data.
 */
export async function pullRemoteState(): Promise<{ state: AppState; updatedAt: string } | null> {
  const initData = getTelegramInitData()
  if (!initData) return null
  try {
    const result = await callSyncFunction({ action: 'pull', initData })
    if (!result || !result.state) return null
    return { state: result.state as AppState, updatedAt: result.updatedAt as string }
  } catch {
    return null
  }
}

// The Telegram notification feature needs to know each user's local timezone (for "Friday
// evening" / "start of the month" scheduling). Rather than a separate endpoint, we piggyback it
// on the first push of each session — sync-state records it in the telegram_notify_state table,
// alongside the app_states upsert that push already does (so the FK from that table is always
// satisfied). Once per launch is enough; the value only changes if the person travels, and the
// next launch picks that up.
let timezoneReported = false

/**
 * Pushes the current state up to Supabase for this Telegram user. Fire-and-forget by design —
 * callers don't await a meaningful result and a failure here (offline, function down) is silently
 * swallowed, because the next successful push (the very next local change) carries the same,
 * now-current state anyway. No-op outside Telegram.
 */
export async function pushRemoteState(state: AppState): Promise<void> {
  const initData = getTelegramInitData()
  if (!initData) return
  const timezone = timezoneReported ? undefined : getLocalTimezone() ?? undefined
  try {
    await callSyncFunction({ action: 'push', initData, state, ...(timezone ? { timezone } : {}) })
    if (timezone) timezoneReported = true
  } catch {
    // Swallowed deliberately — see doc comment above. timezoneReported stays false so the next
    // push retries reporting it.
  }
}
