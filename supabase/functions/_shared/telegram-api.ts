// Thin wrapper over the Telegram Bot API — the only place the raw HTTP shape of these calls
// lives. The bot token is read from the TELEGRAM_BOT_TOKEN secret (already set for this project;
// used the same way by sync-state). Never log the token, never accept it from a request.

const API_BASE = 'https://api.telegram.org'

/** A single inline-keyboard button: either opens a URL or fires a callback_query with `data`. */
export type InlineButton = { text: string; url: string } | { text: string; data: string }

function tgButton(b: InlineButton): Record<string, string> {
  return 'url' in b ? { text: b.text, url: b.url } : { text: b.text, callback_data: b.data }
}

function replyMarkup(opts: { button?: InlineButton; keyboard?: InlineButton[][] }): unknown | undefined {
  if (opts.keyboard) return { inline_keyboard: opts.keyboard.map((row) => row.map(tgButton)) }
  if (opts.button) return { inline_keyboard: [[tgButton(opts.button)]] }
  return undefined
}

export type SendResult =
  | { ok: true }
  // `blocked` is the one outcome the caller must persist: the user has stopped or blocked the
  // bot (Bot API 403). notify-tick flips telegram_notify_state.blocked so we stop trying.
  | { ok: false; blocked: boolean; status: number; description: string }

interface SendOptions {
  /** A single button under the message. */
  button?: InlineButton
  /** A full inline keyboard (rows of buttons); takes precedence over `button`. */
  keyboard?: InlineButton[][]
  /** Defaults to false — our notification text is plain, no markup. */
  parseMode?: 'MarkdownV2' | 'HTML'
  /** Defaults to true — notifications shouldn't nag with sound at odd hours; caller can override. */
  silent?: boolean
}

function botToken(): string {
  const token = Deno.env.get('TELEGRAM_BOT_TOKEN')
  if (!token) throw new Error('TELEGRAM_BOT_TOKEN is not set')
  return token
}

async function call(method: string, body: Record<string, unknown>): Promise<SendResult> {
  let res: Response
  try {
    res = await fetch(`${API_BASE}/bot${botToken()}/${method}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
  } catch (e) {
    return { ok: false, blocked: false, status: 0, description: `network error: ${(e as Error).message}` }
  }
  if (res.ok) return { ok: true }

  let description = `HTTP ${res.status}`
  try {
    const payload = await res.json()
    if (typeof payload?.description === 'string') description = payload.description
  } catch {
    // non-JSON error body — keep the HTTP status
  }
  // 403 = "bot was blocked by the user" / "user is deactivated" / "chat not found" after a block.
  return { ok: false, blocked: res.status === 403, status: res.status, description }
}

/**
 * Sends one message to a Telegram user (chat id = their numeric user id, which is what we store
 * as telegram_user_id). Resolves — never throws — for the ordinary failure modes so a single bad
 * send can't abort a tick that still has other users to notify.
 */
export function sendMessage(chatId: string | number, text: string, opts: SendOptions = {}): Promise<SendResult> {
  const body: Record<string, unknown> = {
    chat_id: chatId,
    text,
    disable_notification: opts.silent ?? true,
    link_preview_options: { is_disabled: true },
  }
  if (opts.parseMode) body.parse_mode = opts.parseMode
  const markup = replyMarkup(opts)
  if (markup) body.reply_markup = markup
  return call('sendMessage', body)
}

/** Replaces the text (and keyboard) of a message the bot already sent — used to turn the
 *  language picker into the welcome message in place. */
export function editMessageText(
  chatId: string | number,
  messageId: number,
  text: string,
  opts: { button?: InlineButton; keyboard?: InlineButton[][] } = {},
): Promise<SendResult> {
  const body: Record<string, unknown> = {
    chat_id: chatId,
    message_id: messageId,
    text,
    link_preview_options: { is_disabled: true },
  }
  const markup = replyMarkup(opts)
  if (markup) body.reply_markup = markup
  return call('editMessageText', body)
}

/** Stops the loading spinner on a tapped inline button. Best-effort. */
export async function answerCallbackQuery(callbackQueryId: string, text?: string): Promise<void> {
  try {
    await call('answerCallbackQuery', text ? { callback_query_id: callbackQueryId, text } : { callback_query_id: callbackQueryId })
  } catch {
    // ignore
  }
}

/** Registers the commands shown in the bot's "/" / menu button. Run once (see DEPLOY.md). */
export function setMyCommands(
  commands: { command: string; description: string }[],
  languageCode?: string,
): Promise<SendResult> {
  return call('setMyCommands', languageCode ? { commands, language_code: languageCode } : { commands })
}

/**
 * Registers the bot's webhook URL with Telegram. Used once (manually) when wiring up
 * telegram-webhook — kept here so the Bot API surface stays in one file.
 */
export function setWebhook(url: string, secretToken?: string): Promise<SendResult> {
  const body: Record<string, unknown> = { url, allowed_updates: ['message', 'callback_query'] }
  if (secretToken) body.secret_token = secretToken
  return call('setWebhook', body)
}
