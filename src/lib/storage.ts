import { AppState, DEFAULT_CATEGORY_DEFS, SAVINGS_CATEGORY, ThemeKey } from '../types'
import { mockState } from './mockData'
import { telegramColorScheme } from './telegram'

export const STORAGE_KEY = 'ledger_app_state_v1'
// A separate key, deliberately outside the AppState blob itself — this is bookkeeping for cloud
// sync (lib/sync.ts, Telegram Phase 3), not app data, so it doesn't need migrate()/mockState()
// support or to round-trip through every place that spreads an AppState. Stamped on every
// saveState() call; read back at launch to decide whether THIS device's local copy or the one
// already in Supabase is newer. Missing entirely (very first run, or a browser that's never
// synced) is treated as "as old as possible" so a real remote copy always wins over nothing.
const LAST_CHANGED_KEY = 'ledger_last_changed_at'
const VALID_THEMES: ThemeKey[] = ['light', 'dark', 'cyber', 'red', 'pinky', 'caramel']

/** Fills in fields added after a person's data was first saved, so old localStorage data keeps working. */
export function migrate(state: AppState): AppState {
  const baseCategories = state.categories && state.categories.length > 0 ? state.categories : DEFAULT_CATEGORY_DEFS
  // Existing users don't get DEFAULT_CATEGORY_DEFS applied wholesale (their categories array is
  // already non-empty above), so a category added there later — 'Savings', needed once
  // allocateToGoal/allocateToImportantDate started logging real transactions against it — has to
  // be backfilled explicitly here, or every pre-existing user would be missing it.
  const hasSavingsCategory = baseCategories.some((c) => c.name.toLowerCase() === SAVINGS_CATEGORY.toLowerCase())
  const categories = hasSavingsCategory ? baseCategories : [...baseCategories, { name: SAVINGS_CATEGORY, icon: 'savings' as const }]
  const budgets = (state.budgets || []).map((b: any) => ({
    category: b.category,
    limit: b.limit,
    period: b.period || 'month',
  }))
  const theme = VALID_THEMES.includes(state.settings?.theme) ? state.settings.theme : 'light'
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
  return {
    ...state,
    categories,
    budgets,
    importantDates,
    reminderRules,
    incomeSources,
    readNotificationIds,
    settings: { ...state.settings, theme, handledPaydays },
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
    if (!raw) return withTelegramDefaultTheme(mockState())
    const parsed = JSON.parse(raw) as AppState
    // basic shape guard
    if (!parsed.transactions || !parsed.settings) return withTelegramDefaultTheme(mockState())
    return migrate(parsed)
  } catch {
    return withTelegramDefaultTheme(mockState())
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
