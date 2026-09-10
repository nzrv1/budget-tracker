import { CategoryIconKey } from '../types'

/**
 * One-tap starting points for the first two onboarding-wizard steps ("what repeats every
 * month?" / "what happens rarely but regularly?"). Both steps create a budget, so both lists
 * carry a `CategoryIconKey` from the existing set (src/types.ts) — no new icon vocabulary.
 *
 * `category` is the name the budget/category gets created under when the person taps the
 * preset. `defaultLimit` seeds the amount field so the person adjusts rather than types from
 * zero; `period` is what the created budget resets on.
 *
 * NOTE (stage 16.1): labels are inline Russian for the mock skeleton so the flow can be
 * reviewed with real copy. Moving this text into the i18n dictionaries (en/ru/lv) is part of
 * stage 16.2, together with wiring the real create handlers.
 */
export interface OnboardingPreset {
  /** Button caption + the category/budget name created on tap. */
  category: string
  icon: CategoryIconKey
  defaultLimit: number
  period: 'month' | 'year'
}

/** Step 1 — recurring monthly costs. */
export const MONTHLY_PRESETS: OnboardingPreset[] = [
  { category: 'Аренда', icon: 'home', defaultLimit: 500, period: 'month' },
  { category: 'Подписки', icon: 'streaming', defaultLimit: 30, period: 'month' },
  { category: 'Транспорт', icon: 'transport', defaultLimit: 60, period: 'month' },
  { category: 'Кредит/рассрочка', icon: 'bank', defaultLimit: 200, period: 'month' },
  { category: 'Спортзал', icon: 'fitness', defaultLimit: 40, period: 'month' },
]

/** Step 2 — rarer but regular costs, tracked as a yearly budget. */
export const RARE_PRESETS: OnboardingPreset[] = [
  { category: 'Страховка', icon: 'insurance', defaultLimit: 300, period: 'year' },
  { category: 'ТО машины', icon: 'maintenance', defaultLimit: 250, period: 'year' },
  { category: 'Стоматолог', icon: 'health', defaultLimit: 200, period: 'year' },
  { category: 'Подарки на праздники', icon: 'gift', defaultLimit: 300, period: 'year' },
]
