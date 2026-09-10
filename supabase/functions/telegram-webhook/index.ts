// telegram-webhook — receives Bot API updates (Telegram POSTs here for every message / button
// tap once the webhook URL is registered).
//
// Commands (registered via setMyCommands — see DEPLOY.md — so they show in the bot's menu):
//   /start     — pick a language, then show what the bot does + an "open app" button
//   /settings  — explain the notification levels
//   /language  — re-open the language picker
// Button taps: only the language picker's buttons are acted on; acting on a notification's
// "allocate now" button server-side (instead of opening the Mini App) is v2, flagged below.
//
// The chosen bot-chat language lives in telegram_notify_state.bot_language — separate from the
// in-app language (app_states.state.settings.language), which drives the scheduled notifications.
// A brand-new user who only ever talks to the bot has a telegram_notify_state row but no
// app_states row yet; that's why the FK between them was dropped (see the migration).
//
// verify_jwt is off (supabase/config.toml). Auth: TELEGRAM_WEBHOOK_SECRET is checked against the
// X-Telegram-Bot-Api-Secret-Token header Telegram sends (set when registering the webhook).
//
// Deploy: supabase functions deploy telegram-webhook

import { createClient } from 'npm:@supabase/supabase-js@2'
import type { SupabaseClient } from 'npm:@supabase/supabase-js@2'
import { answerCallbackQuery, editMessageText, sendMessage, type InlineButton } from '../_shared/telegram-api.ts'

// t.me/<bot username>/<app short name> — the short name is set in BotFather (/myapps): "FinLedger".
const MINI_APP_URL = 'https://t.me/FinLedger_osis_bot/FinLedger'

type Lang = 'en' | 'ru' | 'lv'
const LANGS: Lang[] = ['ru', 'en', 'lv']
const isLang = (v: unknown): v is Lang => v === 'ru' || v === 'en' || v === 'lv'

const LANG_PROMPT = 'Выберите язык · Choose language · Izvēlieties valodu'
const LANG_KEYBOARD: InlineButton[][] = [
  [
    { text: 'Русский', data: 'lang:ru' },
    { text: 'English', data: 'lang:en' },
    { text: 'Latviešu', data: 'lang:lv' },
  ],
]

const COPY: Record<Lang, { welcome: string; settingsInfo: string; openApp: string; openSettings: string }> = {
  en: {
    welcome:
      'Hi! I send you budget alerts, reminders for your goals and important dates, payday nudges, ' +
      'and the odd bit of encouragement. Open the app to see everything:',
    settingsInfo:
      'Notification level is set in the app, under Settings → Notifications:\n' +
      '• All — alerts + scheduled encouragement\n' +
      '• Important only — just the alerts\n' +
      '• Off — nothing',
    openApp: 'Open Ledger',
    openSettings: 'Open settings',
  },
  ru: {
    welcome:
      'Привет! Я присылаю уведомления о бюджете, напоминания по целям и важным датам, ' +
      'подсказки в день зарплаты и иногда пару добрых слов. Открой приложение, чтобы увидеть всё:',
    settingsInfo:
      'Уровень уведомлений настраивается в приложении: Настройки → Уведомления:\n' +
      '• Все — уведомления о событиях + подбадривающие по расписанию\n' +
      '• Только важное — только уведомления о событиях\n' +
      '• Выключить — ничего',
    openApp: 'Открыть Ledger',
    openSettings: 'Открыть настройки',
  },
  lv: {
    welcome:
      'Sveiki! Es sūtu budžeta paziņojumus, atgādinājumus par mērķiem un svarīgiem datumiem, ' +
      'algas dienas atgādinājumus un reizēm kādu uzmundrinājumu. Atver lietotni, lai redzētu visu:',
    settingsInfo:
      'Paziņojumu līmenis tiek iestatīts lietotnē: Iestatījumi → Paziņojumi:\n' +
      '• Visi — paziņojumi + plānoti uzmundrinājumi\n' +
      '• Tikai svarīgie — tikai paziņojumi\n' +
      '• Izslēgt — nekas',
    openApp: 'Atvērt Ledger',
    openSettings: 'Atvērt iestatījumus',
  },
}

function jsonOk(body: unknown = { ok: true }): Response {
  return new Response(JSON.stringify(body), { status: 200, headers: { 'Content-Type': 'application/json' } })
}

function secretKey(): string | null {
  return (
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ??
    JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS') ?? '{}')['default'] ??
    null
  )
}

/** Bot-chat language: the explicit /start choice first, then the in-app language, then Russian. */
async function resolveLang(supabase: SupabaseClient, telegramUserId: string): Promise<Lang> {
  const { data: notify } = await supabase
    .from('telegram_notify_state')
    .select('bot_language')
    .eq('telegram_user_id', telegramUserId)
    .maybeSingle()
  if (isLang(notify?.bot_language)) return notify.bot_language

  const { data: app } = await supabase
    .from('app_states')
    .select('state')
    .eq('telegram_user_id', telegramUserId)
    .maybeSingle()
  const inApp = (app?.state as { settings?: { language?: string } } | undefined)?.settings?.language
  return isLang(inApp) ? inApp : 'ru'
}

/** Upsert the bot-chat language, and (since the user is clearly reachable) clear any block flag.
 *  Works for a brand-new user with no app_states row — the FK was dropped for exactly this. */
async function saveBotLanguage(supabase: SupabaseClient, telegramUserId: string, lang: Lang): Promise<void> {
  const { error } = await supabase.from('telegram_notify_state').upsert(
    { telegram_user_id: telegramUserId, bot_language: lang, blocked: false, updated_at: new Date().toISOString() },
    { onConflict: 'telegram_user_id' },
  )
  if (error) console.error('saveBotLanguage failed:', error.message)
}

async function clearBlockedFlag(supabase: SupabaseClient, telegramUserId: string): Promise<void> {
  const { error } = await supabase
    .from('telegram_notify_state')
    .update({ blocked: false, updated_at: new Date().toISOString() })
    .eq('telegram_user_id', telegramUserId)
  if (error) console.error('clearBlockedFlag failed:', error.message)
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return jsonOk({ ignored: 'non-POST' })

  const expectedSecret = Deno.env.get('TELEGRAM_WEBHOOK_SECRET')
  if (expectedSecret && req.headers.get('x-telegram-bot-api-secret-token') !== expectedSecret) {
    return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401 })
  }

  let update: {
    message?: { chat?: { id?: number | string }; from?: { id?: number }; text?: string }
    callback_query?: {
      id: string
      data?: string
      from?: { id?: number }
      message?: { message_id?: number; chat?: { id?: number | string } }
    }
  }
  try {
    update = await req.json()
  } catch {
    return jsonOk({ ignored: 'bad json' })
  }

  const key = secretKey()
  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  if (!key || !supabaseUrl || !Deno.env.get('TELEGRAM_BOT_TOKEN')) {
    console.error('telegram-webhook misconfigured (missing secret key / url / bot token)')
    return jsonOk({ ignored: 'misconfigured' }) // 200 so Telegram doesn't spin on retries
  }
  const supabase = createClient(supabaseUrl, key)

  // ── button taps ────────────────────────────────────────────────────────────
  if (update.callback_query) {
    const cq = update.callback_query
    await answerCallbackQuery(cq.id)

    const langMatch = /^lang:(ru|en|lv)$/.exec(cq.data ?? '')
    const chatId = cq.message?.chat?.id
    const messageId = cq.message?.message_id
    const userId = String(cq.from?.id ?? chatId ?? '')
    if (langMatch && chatId != null && messageId != null && userId) {
      const lang = langMatch[1] as Lang
      await saveBotLanguage(supabase, userId, lang)
      // ?startapp=lang_xx → the Mini App opens already switched to this language (src/App.tsx).
      await editMessageText(chatId, messageId, COPY[lang].welcome, {
        button: { text: COPY[lang].openApp, url: `${MINI_APP_URL}?startapp=lang_${lang}` },
      })
      return jsonOk()
    }

    // v2: a notification's "allocate now" button would be handled here (read cq.data like
    // "allocate_goal_<id>_<amount>", do the transfer via a shared routine, editMessageText to
    // confirm). Today those are URL buttons, so this branch only sees stray taps.
    return jsonOk({ ignored: 'callback' })
  }

  // ── commands ───────────────────────────────────────────────────────────────
  const message = update.message
  const chatId = message?.chat?.id
  const fromId = message?.from?.id
  const text = (message?.text ?? '').trim()
  if (chatId == null || !text.startsWith('/')) return jsonOk()

  // "/start", "/start payload", "/settings", also "/start@BotName" in groups.
  const command = text.split(/\s+/)[0].split('@')[0].toLowerCase()
  const telegramUserId = String(fromId ?? chatId)

  if (command === '/start' || command === '/language') {
    await clearBlockedFlag(supabase, telegramUserId)
    await sendMessage(chatId, LANG_PROMPT, { keyboard: LANG_KEYBOARD, silent: false })
    return jsonOk()
  }

  if (command === '/settings') {
    const lang = await resolveLang(supabase, telegramUserId)
    await sendMessage(chatId, COPY[lang].settingsInfo, {
      button: { text: COPY[lang].openSettings, url: `${MINI_APP_URL}?startapp=settings` },
      silent: true,
    })
    return jsonOk()
  }

  return jsonOk({ ignored: command })
})

// Command list for the bot menu, per language. Registered by DEPLOY.md's setMyCommands step.
export const BOT_COMMANDS: Record<Lang, { command: string; description: string }[]> = {
  ru: [
    { command: 'start', description: 'Запустить бота / выбрать язык' },
    { command: 'settings', description: 'Про уровни уведомлений' },
    { command: 'language', description: 'Сменить язык' },
  ],
  en: [
    { command: 'start', description: 'Start the bot / choose language' },
    { command: 'settings', description: 'About notification levels' },
    { command: 'language', description: 'Change language' },
  ],
  lv: [
    { command: 'start', description: 'Palaist botu / izvēlēties valodu' },
    { command: 'settings', description: 'Par paziņojumu līmeņiem' },
    { command: 'language', description: 'Mainīt valodu' },
  ],
}
export { LANGS }
