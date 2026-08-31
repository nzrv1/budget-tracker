import { AppState } from '../types'
import { mockState } from './mockData'

const STORAGE_KEY = 'ledger_app_state_v1'

export function loadState(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return mockState()
    const parsed = JSON.parse(raw) as AppState
    // basic shape guard
    if (!parsed.transactions || !parsed.settings) return mockState()
    return parsed
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
