import { AppState, DEFAULT_CATEGORY_DEFS } from '../types'
import { mockState } from './mockData'

const STORAGE_KEY = 'ledger_app_state_v1'

/** Fills in fields added after a person's data was first saved, so old localStorage data keeps working. */
function migrate(state: AppState): AppState {
  const categories = state.categories && state.categories.length > 0 ? state.categories : DEFAULT_CATEGORY_DEFS
  const budgets = (state.budgets || []).map((b: any) => ({
    category: b.category,
    limit: b.limit,
    period: b.period || 'month',
  }))
  return { ...state, categories, budgets }
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
