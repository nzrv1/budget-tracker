// Thin, defensive wrapper around the Telegram Mini App SDK (window.Telegram.WebApp).
// Every export here is a no-op when the app is opened outside Telegram (a normal mobile
// browser, or a desktop tab) — nothing in the rest of the app should ever branch on
// "are we in Telegram?" directly, so this stays the one place that knows about the SDK.
//
// The SDK script itself is loaded in index.html from Telegram's own CDN
// (https://telegram.org/js/telegram-web-app.js) — not bundled — per Telegram's docs, so it
// stays auto-updating. If that script hasn't loaded (or we're not in Telegram at all),
// `window.Telegram` is simply undefined and every function below degrades to a no-op.

import type { Language } from '../types'

// Phase 2 adds BackButton only — MainButton and HapticFeedback stay out per the Telegram plan
// (recommended against a full themeParams reskin; MainButton was marked optional/not needed).
interface TelegramWebApp {
  ready: () => void
  expand: () => void
  colorScheme: 'light' | 'dark'
  // Raw, still-signed query-string payload from Telegram — never parsed or trusted here. It's
  // only ever forwarded whole to the sync-state Edge Function, which is the one place that
  // actually verifies the signature (with the bot token, which never leaves the server). See
  // lib/sync.ts.
  initData: string
  // Telegram's parsed, CLIENT-SIDE-ONLY view of the launch params. "Unsafe" is Telegram's own
  // name — it's not signature-checked, so nothing security-relevant may be read from it. We only
  // use `start_param` (the `?startapp=` value from a deep link), which just decides which screen
  // to open — no trust needed for that. Telegram restricts start_param to [A-Za-z0-9_-].
  initDataUnsafe?: { start_param?: string }
  BackButton: {
    show: () => void
    hide: () => void
    onClick: (cb: () => void) => void
    offClick: (cb: () => void) => void
  }
}

function webApp(): TelegramWebApp | undefined {
  return (window as any).Telegram?.WebApp
}

export function isInsideTelegram(): boolean {
  return !!webApp()
}

/** Call once on app boot. Tells Telegram the app is ready and asks for the full viewport height. */
export function initTelegram() {
  const app = webApp()
  if (!app) return
  app.ready()
  app.expand()
}

/**
 * 'light' | 'dark' | undefined — undefined when not running inside Telegram, so callers can
 * fall back to their own default instead of accidentally treating "not in Telegram" as "light".
 */
export function telegramColorScheme(): 'light' | 'dark' | undefined {
  return webApp()?.colorScheme
}

/**
 * The raw, signed `initData` string Telegram attaches to every Mini App launch — empty/absent
 * outside Telegram, in which case callers (lib/sync.ts) treat cloud sync as unavailable and stay
 * purely on localStorage, exactly as before this feature existed. Deliberately returns the raw
 * string rather than the parsed `initDataUnsafe` object Telegram also exposes — "unsafe" is
 * Telegram's own name for it because it's client-supplied and unverified; only the signed raw
 * string can be checked server-side, so that's the only form allowed to leave this module.
 */
export function getTelegramInitData(): string | null {
  const raw = webApp()?.initData
  return raw && raw.length > 0 ? raw : null
}

/**
 * The IANA timezone name of the device currently running the Mini App (e.g. "Europe/Riga"), or
 * null when the browser can't report one. Sent to the backend (see lib/sync.ts) so scheduled
 * Telegram notifications — "Friday evening", "start of the month" — fire on the user's own wall
 * clock instead of the server's. Not strictly Telegram-specific, but it belongs with the other
 * "things we tell the backend about this launch" helpers, and it's only ever used for the
 * Telegram notification feature.
 */
export function getLocalTimezone(): string | null {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || null
  } catch {
    return null
  }
}

/**
 * What a deep link (`?startapp=…`) is asking the app to open. `null` for a normal launch (no
 * start param) or an unrecognized value — callers then just show the default screen. Split out
 * from the SDK read below so it can be unit-tested with a plain string.
 *
 *   allocate_goal_<id>_<amount>  → open Goals, prefill that goal's "add funds" with <amount>
 *   allocate_date_<id>_<amount>  → same for Important Dates
 *   payday                       → open the Dashboard (where the payday banner lives)
 *   settings                     → open Settings
 *   lang_<ru|en|lv>              → set the app language (the bot's language picker uses this)
 */
export type StartParamIntent =
  | { kind: 'payday' }
  | { kind: 'settings' }
  | { kind: 'setLanguage'; lang: Language }
  | { kind: 'goal' | 'importantDate'; id: string; amount: number }

const LANGUAGES: Language[] = ['en', 'ru', 'lv']

export function parseStartParam(raw: string | null | undefined): StartParamIntent | null {
  if (!raw) return null
  if (raw === 'payday') return { kind: 'payday' }
  if (raw === 'settings') return { kind: 'settings' }
  const langMatch = raw.match(/^lang_([a-z]{2})$/)
  if (langMatch && (LANGUAGES as string[]).includes(langMatch[1])) {
    return { kind: 'setLanguage', lang: langMatch[1] as Language }
  }
  const m = raw.match(/^allocate_(goal|date)_([A-Za-z0-9]+)_(\d+)$/)
  if (!m) return null
  const amount = Number(m[3])
  if (!Number.isFinite(amount) || amount <= 0) return null
  return { kind: m[1] === 'goal' ? 'goal' : 'importantDate', id: m[2], amount }
}

/** The deep-link intent for this launch, read from Telegram's start_param. No-op outside Telegram. */
export function getStartParamIntent(): StartParamIntent | null {
  return parseStartParam(webApp()?.initDataUnsafe?.start_param)
}

/**
 * Shows Telegram's native back button for as long as the caller's component is mounted, and
 * routes it to `onBack` — meant for "a modal/sheet is open" moments (AddTransactionModal, the
 * mobile "More" sheet) so the hardware/gesture back action closes that instead of leaving or
 * minimizing the whole Mini App. No-op outside Telegram. Call from a useEffect and invoke the
 * returned cleanup on teardown:
 *
 *   useEffect(() => showTelegramBackButton(onClose), [onClose])
 */
export function showTelegramBackButton(onBack: () => void): () => void {
  const app = webApp()
  if (!app) return () => {}
  app.BackButton.onClick(onBack)
  app.BackButton.show()
  return () => {
    app.BackButton.offClick(onBack)
    app.BackButton.hide()
  }
}
