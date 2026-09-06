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
