// sync-state — the ONLY door into the app_states table (see the migration: RLS denies the
// publishable key entirely). A client proves who it is by forwarding Telegram's raw, signed
// `initData` string; this function is the one place that actually verifies that signature (using
// the bot token, which lives only here as a secret — never in frontend code, never committed to
// this repo) before touching the database. verify_jwt is off for this function (supabase/
// config.toml) precisely so it can be called without a Supabase Auth session — this function IS
// the auth check, the same way a webhook handler verifies its own signature instead of relying on
// a platform-level JWT.
//
// Deploy: supabase functions deploy sync-state
// Secret (never in this repo — set it directly in your own terminal or the dashboard):
//   supabase secrets set TELEGRAM_BOT_TOKEN=<your bot token>

import { createClient } from 'npm:@supabase/supabase-js@2'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

// Telegram recommends treating initData as stale after a while — it's re-issued fresh every time
// the Mini App is opened, so this only matters for a captured/replayed payload, not normal use.
// 24 hours is generous; tighten it if that ever matters for this app.
const MAX_INIT_DATA_AGE_SECONDS = 24 * 60 * 60

function hexEncode(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

async function hmacSha256(keyBytes: BufferSource, message: string): Promise<ArrayBuffer> {
  const key = await crypto.subtle.importKey('raw', keyBytes, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  return crypto.subtle.sign('HMAC', key, new TextEncoder().encode(message))
}

/**
 * Telegram's official Mini App initData validation algorithm:
 *   secret_key = HMAC_SHA256(key="WebAppData", message=<bot token>)
 *   computed   = HMAC_SHA256(key=secret_key,   message=<data-check-string>)  (hex)
 * where data-check-string is every field except `hash`, sorted by key, joined as "key=value"
 * lines with "\n". Returns the Telegram numeric user id (as a string) on success, or null if the
 * signature doesn't match, the payload is too old, or the `user` field is missing/malformed.
 */
async function verifyTelegramInitData(initData: string, botToken: string): Promise<string | null> {
  const params = new URLSearchParams(initData)
  const receivedHash = params.get('hash')
  if (!receivedHash) return null
  params.delete('hash')

  const dataCheckString = Array.from(params.keys())
    .sort()
    .map((key) => `${key}=${params.get(key)}`)
    .join('\n')

  const secretKeyBytes = await hmacSha256(new TextEncoder().encode('WebAppData'), botToken)
  const computedHashBytes = await hmacSha256(secretKeyBytes, dataCheckString)
  const computedHash = hexEncode(computedHashBytes)

  if (computedHash !== receivedHash) return null

  const authDate = Number(params.get('auth_date'))
  if (!authDate || Date.now() / 1000 - authDate > MAX_INIT_DATA_AGE_SECONDS) return null

  const userJson = params.get('user')
  if (!userJson) return null
  try {
    const user = JSON.parse(userJson)
    if (typeof user?.id !== 'number') return null
    return String(user.id)
  } catch {
    return null
  }
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: CORS_HEADERS })
  }
  if (req.method !== 'POST') {
    return jsonResponse({ error: 'method not allowed' }, 405)
  }

  const botToken = Deno.env.get('TELEGRAM_BOT_TOKEN')
  if (!botToken) {
    // Misconfiguration, not a client error — surfaces loudly in function logs rather than
    // silently accepting requests it can't actually verify.
    return jsonResponse({ error: 'server misconfigured: TELEGRAM_BOT_TOKEN not set' }, 500)
  }

  let body: { action?: string; initData?: string; state?: unknown; timezone?: string }
  try {
    body = await req.json()
  } catch {
    return jsonResponse({ error: 'invalid JSON body' }, 400)
  }

  const { action, initData, state } = body
  if (!initData || (action !== 'pull' && action !== 'push')) {
    return jsonResponse({ error: 'expected { action: "pull" | "push", initData, state? }' }, 400)
  }

  const telegramUserId = await verifyTelegramInitData(initData, botToken)
  if (!telegramUserId) {
    return jsonResponse({ error: 'invalid or expired initData' }, 401)
  }

  // The secret key (service-role equivalent) bypasses RLS — safe here because we've just
  // verified, above, exactly which Telegram user this request is allowed to act as, and every
  // query below is scoped to that one telegram_user_id.
  const secretKey =
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ??
    JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS') ?? '{}')['default']
  if (!secretKey) {
    return jsonResponse({ error: 'server misconfigured: no secret key available' }, 500)
  }
  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, secretKey)

  if (action === 'pull') {
    const { data, error } = await supabase
      .from('app_states')
      .select('state, updated_at')
      .eq('telegram_user_id', telegramUserId)
      .maybeSingle()
    if (error) return jsonResponse({ error: error.message }, 500)
    if (!data) return jsonResponse({ state: null })
    return jsonResponse({ state: data.state, updatedAt: data.updated_at })
  }

  // action === 'push'
  if (state === undefined) {
    return jsonResponse({ error: 'push requires a "state" field' }, 400)
  }
  const { error } = await supabase
    .from('app_states')
    .upsert({ telegram_user_id: telegramUserId, state, updated_at: new Date().toISOString() }, { onConflict: 'telegram_user_id' })
  if (error) return jsonResponse({ error: error.message }, 500)

  // Telegram notification bookkeeping lives in its own table (telegram_notify_state — see that
  // migration for why it's kept out of the state blob). The client piggybacks its current IANA
  // timezone on the first push of each session; record it so scheduled notifications fire on the
  // user's wall clock. This runs AFTER the app_states upsert above so the FK on that table is
  // always satisfied. Best-effort: the state sync has already succeeded, so a failure here must
  // not turn into an error response — it just means the timezone is recorded on a later push.
  const timezone = body.timezone
  if (typeof timezone === 'string' && timezone.length > 0 && timezone.length <= 64) {
    const { error: tzError } = await supabase
      .from('telegram_notify_state')
      .upsert(
        { telegram_user_id: telegramUserId, timezone, updated_at: new Date().toISOString() },
        { onConflict: 'telegram_user_id' },
      )
    if (tzError) console.error('telegram_notify_state timezone upsert failed:', tzError.message)
  }

  return jsonResponse({ ok: true })
})
