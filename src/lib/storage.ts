import { AppState, DEFAULT_CATEGORY_DEFS, ThemeKey } from '../types'
import { mockState } from './mockData'

const STORAGE_KEY = 'ledger_app_state_v1'
const VALID_THEMES: ThemeKey[] = ['light', 'dark', 'cyber', 'red', 'pinky', 'caramel']

/** Fills in fields added after a person's data was first saved, so old localStorage data keeps working. */
function migrate(state: AppState): AppState {
  const categories = state.categories && state.categories.length > 0 ? state.categories : DEFAULT_CATEGORY_DEFS
  const budgets = (state.budgets || []).map((b: any) => ({
    category: b.category,
    limit: b.limit,
    period: b.period || 'month',
  }))
  const theme = VALID_THEMES.includes(state.settings?.theme) ? state.settings.theme : 'light'
  const importantDates = state.importantDates || []
  const incomeSources = state.incomeSources || []
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
    settings: { ...state.settings, theme, handledPaydays },
  }
}

export function loadState(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return mockState()
    const parsed = JSON.parse(raw) as AppState
    // basic shape guard
    if (!parsed.transactions || !parsed.settings) return mockState()
    return migrate(parsed)
  } catch {
    return mockState()
  }
}

export function saveState(state: AppState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    // storage unavailable — fail silently, app still works in-memory
  }
}

export function clearState() {
  localStorage.removeItem(STORAGE_KEY)
}

export function uid() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36)
}
