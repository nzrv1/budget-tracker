import { AppState, DEFAULT_CATEGORY_DEFS, Language, NotificationLevel, SAVINGS_CATEGORY, ThemeKey } from '../types'
import { emptyState } from './mockData'
import { telegramColorScheme } from './telegram'
import { DEFAULT_LANGUAGE } from './i18n'

export const STORAGE_KEY = 'ledger_app_state_v1'
// A separate key, deliberately outside the AppState blob itself — this is bookkeeping for cloud
// sync (lib/sync.ts, Telegram Phase 3), not app data, so it doesn't need migrate()/mockState()
// support or to round-trip through every place that spreads an AppState. Stamped on every
// saveState() call; read back at launch to decide whether THIS device's local copy or the one
// already in Supabase is newer. Missing entirely (very first run, or a browser that's never
// synced) is treated as "as old as possible" so a real remote copy always wins over nothing.
const LAST_CHANGED_KEY = 'ledger_last_changed_at'
const VALID_THEMES: ThemeKey[] = ['light', 'dark', 'cyber', 'red', 'pinky', 'caramel']
const VALID_LANGUAGES: Language[] = ['en', 'ru', 'lv']
const VALID_NOTIFICATION_LEVELS: NotificationLevel[] = ['all', 'important_only', 'off']

/** Fills in fields added after a person's data was first saved, so old localStorage data keeps working. */
export function migrate(state: AppState): AppState {
  const baseCategories = state.categories && state.categories.length > 0 ? state.categories : DEFAULT_CATEGORY_DEFS
  // Existing users don't get DEFAULT_CATEGORY_DEFS applied wholesale (their categories array is
  // already non-empty above), so a category added there later — 'Savings', needed once
  // allocateToGoal/allocateToImportantDate started logging real transactions against it — has to
  // be backfilled explicitly here, or every pre-existing user would be missing it.
  const hasSavingsCategory = baseCategories.some((c) => c.name.toLowerCase() === SAVINGS_CATEGORY.toLowerCase())
  const categories = hasSavingsCategory ? baseCategories : [...baseCategories, { name: SAVINGS_CATEGORY, icon: 'savings' as const }]
  // createdAt backfilled to an old-enough timestamp (not "now") — an existing budget should be
  // eligible for a period review right away, not treated as brand new the moment this field
  // was introduced. Only a budget actually created after this ships gets a real timestamp,
  // from BudgetsView's handleAdd.
  const budgets = (state.budgets || []).map((b: any) => ({
    category: b.category,
    limit: b.limit,
    period: b.period || 'month',
    createdAt: b.createdAt || new Date(0).toISOString(),
  }))
  const theme = VALID_THEMES.includes(state.settings?.theme) ? state.settings.theme : 'light'
  // Backfills the same way theme/currency already do: anyone who saved data before this field
  // existed gets English, matching the actual language everything was already written in — never
  // silently switches a returning person's UI language on them.
  const language = VALID_LANGUAGES.includes(state.settings?.language as Language) ? (state.settings.language as Language) : DEFAULT_LANGUAGE
  // Backfills like language/theme: anyone who saved data before Telegram notifications existed
  // gets 'all' (notifications on) — they can dial it down in Settings.
  const notificationLevel = VALID_NOTIFICATION_LEVELS.includes(state.settings?.notificationLevel as NotificationLevel)
    ? (state.settings.notificationLevel as NotificationLevel)
    : 'all'
  // The first-run wizard only auto-opens on a genuinely empty app. Anyone who already has any
  // records pre-dates the wizard (or has finished it) — mark them done so it never interrupts
  // them; a fresh/empty state stays "not done" so the wizard can greet a new person.
  const hasAnyData =
    (state.transactions?.length ?? 0) > 0 ||
    (state.budgets?.length ?? 0) > 0 ||
    (state.goals?.length ?? 0) > 0 ||
    (state.importantDates?.length ?? 0) > 0
  const onboardingDone = state.settings?.onboardingDone ?? hasAnyData
  const importantDates = state.importantDates || []
  const incomeSources = state.incomeSources || []
  const readNotificationIds = state.readNotificationIds || []
  // Carry forward rules saved under the old goal-only shape ({ goalId, offsets }) if present.
  const legacyGoalRules = (state as any).goalNotificationRules as { goalId: string; offsets: any[] }[] | undefined
  const reminderRules =
    state.reminderRules || legacyGoalRules?.map((r) => ({ targetKind: 'goal' as const, targetId: r.goalId, offsets: r.offsets })) || []
  // The payday prompt used to track a single "last handled month" for the basic salary only;
  // fold that into the new per-source map (keyed 'primary') if present.
  const legacyLastPrompt = (state.settings as any)?.lastSalaryPromptMonth as string | undefined
  const handledPaydays = state.settings?.handledPaydays || (legacyLastPrompt ? { primary: legacyLastPrompt } : {})
  const handledBudgetPeriods = state.settings?.handledBudgetPeriods || {}
  return {
    ...state,
    categories,
    budgets,
    importantDates,
    reminderRules,
    incomeSources,
    readNotificationIds,
    settings: { ...state.settings, theme, language, notificationLevel, onboardingDone, handledPaydays, handledBudgetPeriods },
  }
}

/**
 * Only on a genuinely first run (no saved state at all) and only inside Telegram: default to
 * Telegram's own light/dark colorScheme instead of the hardcoded 'light' in mockData.ts. Never
 * overrides a theme the person already picked — this only ever touches the very first launch.
 */
function withTelegramDefaultTheme(state: AppState): AppState {
  const scheme = telegramColorScheme()
  if (!scheme) return state
  return { ...state, settings: { ...state.settings, theme: scheme } }
}

export function loadState(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return withTelegramDefaultTheme(emptyState())
    const parsed = JSON.parse(raw) as AppState
    // basic shape guard
    if (!parsed.transactions || !parsed.settings) return withTelegramDefaultTheme(emptyState())
    return migrate(parsed)
  } catch {
    return withTelegramDefaultTheme(emptyState())
  }
}

export function saveState(state: AppState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    localStorage.setItem(LAST_CHANGED_KEY, new Date().toISOString())
  } catch {
    // storage unavailable — fail silently, app still works in-memory
  }
}

/** See LAST_CHANGED_KEY above — used only by lib/sync.ts to compare against Supabase's updated_at. */
export function getLastLocalChangeAt(): string {
  try {
    return localStorage.getItem(LAST_CHANGED_KEY) || new Date(0).toISOString()
  } catch {
    return new Date(0).toISOString()
  }
}

export function clearState() {
  localStorage.removeItem(STORAGE_KEY)
  localStorage.removeItem(LAST_CHANGED_KEY)
}

export function uid() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36)
}
