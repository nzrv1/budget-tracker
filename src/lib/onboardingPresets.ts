import { CategoryIconKey } from '../types'

/**
 * One-tap starting points for the first two onboarding-wizard steps ("what do you spend on
 * every month?" / "what comes up rarely but regularly?"). Both steps create a budget, so both
 * lists carry a `CategoryIconKey` from the existing set (src/types.ts) — no new icon vocabulary.
 *
 * `category` is the exact category/budget name created on tap. Every value here also has an
 * entry in each dictionary's `defaultCategoryNames` (src/lib/i18n/*.ts), so the created budget
 * shows a localized label everywhere in the app via translateCategoryName() — the wizard button
 * itself is rendered the same way. `defaultLimit` seeds the amount field so the person adjusts
 * rather than types from zero; `period` is what the created budget resets on.
 */
export interface OnboardingPreset {
  /** Category/budget name created on tap — a key in i18n `defaultCategoryNames`. */
  category: string
  icon: CategoryIconKey
  defaultLimit: number
  period: 'month' | 'year'
}

/** Step 1 — recurring monthly costs. */
export const MONTHLY_PRESETS: OnboardingPreset[] = [
  { category: 'Rent', icon: 'home', defaultLimit: 500, period: 'month' },
  { category: 'Subscriptions', icon: 'streaming', defaultLimit: 30, period: 'month' },
  { category: 'Transport', icon: 'transport', defaultLimit: 60, period: 'month' },
  { category: 'Loan', icon: 'bank', defaultLimit: 200, period: 'month' },
  { category: 'Gym', icon: 'fitness', defaultLimit: 40, period: 'month' },
]

/** Step 2 — rarer but regular costs, tracked as a yearly budget. */
export const RARE_PRESETS: OnboardingPreset[] = [
  { category: 'Insurance', icon: 'insurance', defaultLimit: 300, period: 'year' },
  { category: 'Car service', icon: 'maintenance', defaultLimit: 250, period: 'year' },
  { category: 'Dentist', icon: 'health', defaultLimit: 200, period: 'year' },
  { category: 'Holiday gifts', icon: 'gift', defaultLimit: 300, period: 'year' },
]
