// Thin, defensive wrapper around the Telegram Mini App SDK (window.Telegram.WebApp).
// Every export here is a no-op when the app is opened outside Telegram (a normal mobile
// browser, or a desktop tab) — nothing in the rest of the app should ever branch on
// "are we in Telegram?" directly, so this stays the one place that knows about the SDK.
//
// The SDK script itself is loaded in index.html from Telegram's own CDN
// (https://telegram.org/js/telegram-web-app.js) — not bundled — per Telegram's docs, so it
// stays auto-updating. If that script hasn't loaded (or we're not in Telegram at all),
// `window.Telegram` is simply undefined and every function below degrades to a no-op.

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
