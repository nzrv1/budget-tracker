// Detects when a budget's period has just fully closed out (a week ended, a month ended, ...)
// and computes what to show on the "here's how that period went" banner on the Dashboard —
// how much was spent, what's left over, or by how much the limit was exceeded. See
// BudgetPeriodBanner.tsx for the UI and App.tsx for the actions (move the surplus into a goal
// or important date, or shrink the next period's limit to make up for an overspend).
import { AppState, BudgetPeriod, CategoryBudget, Transaction } from '../types'
import { parseLocalDate, periodInstanceKey } from './utils'

/** The same composite identity BudgetsView already treats a budget by — category+period is
 * kept unique there (see its handleAdd duplicate check), so it doubles as a stable key here
 * without needing to add a separate id field to CategoryBudget. */
export function budgetKey(b: CategoryBudget): string {
  return `${b.category}::${b.period}`
}

function categorySpendInRange(transactions: Transaction[], category: string, from: Date, to: Date): number {
  return transactions
    .filter((t) => t.type === 'expense' && t.category === category && parseLocalDate(t.date) >= from && parseLocalDate(t.date) <= to)
    .reduce((s, t) => s + t.amount, 0)
}

/**
 * The full span of the most recently COMPLETED period of the given type — as opposed to
 * periodRange() in utils.ts, which gives a "period so far, up to today" range used for the
 * live in-progress total shown elsewhere (Budgets, Dashboard). A just-finished week needs its
 * whole Sunday-through-Saturday span to report a final total, not "up to today" (today already
 * belongs to the new week by the time this is checked). Weeks start Sunday, matching
 * periodRange() — the two must agree on what a "week" is, since a budget's live total and its
 * closed-out total are two views of the same underlying period.
 */
export function completedPeriodRange(period: BudgetPeriod, now: Date = new Date()): { from: Date; to: Date } {
  if (period === 'day') {
    const from = new Date(now)
    from.setDate(from.getDate() - 1)
    from.setHours(0, 0, 0, 0)
    const to = new Date(from)
    to.setHours(23, 59, 59, 999)
    return { from, to }
  }
  if (period === 'week') {
    const startOfThisWeek = new Date(now)
    startOfThisWeek.setDate(now.getDate() - now.getDay())
    startOfThisWeek.setHours(0, 0, 0, 0)
    const from = new Date(startOfThisWeek)
    from.setDate(from.getDate() - 7)
    const to = new Date(startOfThisWeek.getTime() - 1) // 1ms before this week starts = last week's end
    return { from, to }
  }
  if (period === 'month') {
    const from = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const to = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999) // day 0 = last day of prev month
    return { from, to }
  }
  // year
  const from = new Date(now.getFullYear() - 1, 0, 1)
  const to = new Date(now.getFullYear(), 0, 0, 23, 59, 59, 999) // day 0 of Jan = Dec 31 last year
  return { from, to }
}

export interface BudgetPeriodReview {
  key: string // budgetKey() — identifies the budget itself
  instanceKey: string // periodInstanceKey() — identifies which occurrence of that period this is
  category: string
  period: BudgetPeriod
  from: Date
  to: Date
  spent: number
  limit: number
  remaining: number // limit - spent: positive = surplus to move somewhere, negative = overspent
}

/**
 * Every budget whose most recently completed period hasn't been reviewed yet (moved a surplus
 * somewhere, shrunk next period to cover an overspend, or explicitly dismissed — see
 * settings.handledBudgetPeriods). Pure function, safe to call on every render — same pattern as
 * generateInsights()/generateReminders().
 */
export function pendingBudgetPeriodReviews(state: AppState, now: Date = new Date()): BudgetPeriodReview[] {
  const reviews: BudgetPeriodReview[] = []
  for (const budget of state.budgets) {
    const { from, to } = completedPeriodRange(budget.period, now)
    // A budget created after its own most-recently-completed period already ended wasn't
    // around to track it — nothing to review yet.
    if (budget.createdAt && new Date(budget.createdAt).getTime() > to.getTime()) continue
    const instanceKey = periodInstanceKey(budget.period, from)
    const key = budgetKey(budget)
    if (state.settings.handledBudgetPeriods?.[key] === instanceKey) continue
    const spent = categorySpendInRange(state.transactions, budget.category, from, to)
    reviews.push({
      key,
      instanceKey,
      category: budget.category,
      period: budget.period,
      from,
      to,
      spent,
      limit: budget.limit,
      remaining: budget.limit - spent,
    })
  }
  return reviews
}
