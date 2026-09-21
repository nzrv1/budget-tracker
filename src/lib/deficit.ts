// "Structural deficit" detection for the Calendar screen: looks ahead at every future month
// where planned commitments (budgets + goals + important dates, via planForMonth) would add up
// to more than the person's regular income, and works out concrete fixes — pushing a goal's or
// important date's target further out, lowering its target amount, or a bit of both — each sized
// to close that month's whole gap on its own WHEN a single contributor's monthly amount is large
// enough to cover it. When it isn't (a €600/month goal can't erase a €1,400 gap by itself no
// matter how far it's pushed or how low its target drops), the best a single lever can do is
// still offered, but every FixPlan carries `remainingGap` so the UI can say so honestly instead
// of implying a small goal alone will fix a month it was never big enough to fix.
//
// Budgets are deliberately never a lever here — the user's framing is that a budget is
// obligatory spending (rent, bills), while a goal or important date's target is something the
// person chose and can reasonably revise. Budgets still show up as a *contributor* (so the
// person can see they're part of the problem) but the only "fix" offered for one is a text
// nudge to go edit it themselves in Budgets.
import { AppState, Goal, ImportantDate } from '../types'
import { planForMonth, startOfMonth, addMonths, budgetDailyRate, monthKey } from './planning'
import { nextOccurrence } from './importantDates'
import { parseLocalDate, settingsIncomeForPeriod, filterByRange } from './utils'

const HORIZON_CAP_MONTHS = 24
// A fix that would need to push a date out further than this many months isn't a reasonable
// one-click suggestion any more — the "lower the amount" option is always offered instead since
// it can always close the gap on its own regardless of how large the shortfall is.
const MAX_PUSH_MONTHS = 36

export interface DeficitContributor {
  kind: 'budget' | 'goal' | 'importantDate'
  id: string
  label: string
  amount: number
}

export interface MonthDeficit {
  monthKey: string
  monthStart: Date
  planTotal: number
  income: number
  deficit: number
  contributors: DeficitContributor[]
}

function monthsBetweenInclusive(from: Date, to: Date): number {
  const diff = (to.getFullYear() - from.getFullYear()) * 12 + (to.getMonth() - from.getMonth())
  return Math.max(diff + 1, 1)
}

function daysInMonthOf(monthStart: Date): number {
  return new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0).getDate()
}

function toDateString(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

/** Same calendar day-of-month as `original`, clamped to however many days `monthStart`'s month
 *  actually has (so "push the Jan 31 target to February" doesn't overflow into March). */
function sameDayInMonth(original: Date, monthStart: Date): Date {
  const day = Math.min(original.getDate(), daysInMonthOf(monthStart))
  return new Date(monthStart.getFullYear(), monthStart.getMonth(), day)
}

/** What's left of the month's deficit after a contributor's monthly amount drops from
 *  `before` to `after` — 0 if this single change was enough on its own. */
function gapAfter(deficit: number, before: number, after: number): number {
  return Math.max(deficit - (before - after), 0)
}

/**
 * Every month, from now through the furthest goal/important-date target (capped at
 * HORIZON_CAP_MONTHS), whose planned commitments exceed the person's regular income — with a
 * breakdown of exactly what's contributing that month, budgets included.
 */
export function findDeficitMonths(state: AppState): MonthDeficit[] {
  const now = new Date()
  const thisMonthStart = startOfMonth(now)

  let maxMonthsAhead = 0
  for (const g of state.goals) {
    if (g.targetAmount - g.savedAmount <= 0) continue
    const diff = monthsBetweenInclusive(thisMonthStart, startOfMonth(parseLocalDate(g.targetDate))) - 1
    if (diff > maxMonthsAhead) maxMonthsAhead = diff
  }
  for (const d of state.importantDates) {
    if (!d.targetAmount || d.targetAmount - (d.savedAmount ?? 0) <= 0) continue
    const occursOn = nextOccurrence(d.date, d.recurring)
    const diff = monthsBetweenInclusive(thisMonthStart, startOfMonth(occursOn)) - 1
    if (diff > maxMonthsAhead) maxMonthsAhead = diff
  }
  const horizon = Math.min(maxMonthsAhead, HORIZON_CAP_MONTHS)

  const results: MonthDeficit[] = []
  for (let i = 0; i <= horizon; i++) {
    const monthStart = addMonths(thisMonthStart, i)
    const plan = planForMonth(state, monthStart)
    // settingsIncomeForPeriod deliberately drops a source once its payday for that month has
    // already been auto-logged as a real transaction (settings.autoIncomePaydays) — it assumes
    // whatever adds that back is also summing actual income transactions for the period, the way
    // Dashboard/Reports do. This is the current month once payday has passed: without adding the
    // real transaction back in here, a month whose salary already landed would otherwise look
    // like it has €0 income, turning every euro of planned spending into "deficit".
    const monthEnd = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0, 23, 59, 59, 999)
    const loggedIncome = filterByRange(state.transactions, monthStart, monthEnd)
      .filter((t) => t.type === 'income')
      .reduce((s, t) => s + t.amount, 0)
    const income = settingsIncomeForPeriod(state.settings, state.incomeSources, 'month', monthStart) + loggedIncome
    const deficit = plan.total - income
    if (deficit <= 0) continue

    const contributors: DeficitContributor[] = []
    for (const b of state.budgets) {
      const amount = budgetDailyRate(b) * daysInMonthOf(monthStart)
      if (amount > 0) contributors.push({ kind: 'budget', id: `${b.category}::${b.period}`, label: b.category, amount })
    }
    for (const gi of plan.goalItems) contributors.push({ kind: 'goal', id: gi.id, label: gi.label, amount: gi.amount })
    for (const di of plan.dateItems) contributors.push({ kind: 'importantDate', id: di.id, label: di.label, amount: di.amount })
    contributors.sort((a, b) => b.amount - a.amount)

    results.push({ monthKey: monthKey(monthStart), monthStart, planTotal: plan.total, income, deficit, contributors })
  }
  return results
}

export interface FixPlan {
  kind: 'pushDate' | 'lowerAmount' | 'both'
  /** What to pass to updateGoal/updateImportantDate — field names differ between the two
   *  (targetDate vs. date), which is why this stays a loose record rather than Partial<Goal>. */
  patch: Record<string, string | number>
  /** Same values, but under stable names a UI can read without knowing which entity it's for. */
  display: { date?: string; amount?: number }
  resultingMonthlyAmount: number
  /** What's still left of that month's deficit after applying this plan, alone. 0 means this
   *  plan really does fully close the gap by itself. A contributor whose own monthly amount is
   *  smaller than the whole deficit can never honestly promise full closure — "lowerAmount"
   *  still offers its best possible single-lever move (drop the target to what's already saved),
   *  but the UI must say so isn't the whole fix rather than imply it is. */
  remainingGap: number
}

/** Fix options for a goal contributing to a deficit month — see the module doc comment for the
 *  "each option alone fully closes the gap" guarantee. `deficit` is that specific month's gap. */
export function computeGoalFixPlans(goal: Goal, deficit: number): FixPlan[] {
  const now = new Date()
  const from = startOfMonth(now)
  const remaining = goal.targetAmount - goal.savedAmount
  if (remaining <= 0) return []
  const target = startOfMonth(parseLocalDate(goal.targetDate))
  const months = monthsBetweenInclusive(from, target)
  const monthlyAmount = remaining / months
  const neededMonthly = Math.max(monthlyAmount - deficit, 0)
  const plans: FixPlan[] = []

  const monthsForFullPush = neededMonthly > 0.005 ? Math.max(Math.ceil(remaining / neededMonthly), months) : null

  if (monthsForFullPush !== null && monthsForFullPush - months <= MAX_PUSH_MONTHS) {
    const newTargetMonth = addMonths(from, monthsForFullPush - 1)
    const newDate = sameDayInMonth(parseLocalDate(goal.targetDate), newTargetMonth)
    const newDateStr = toDateString(newDate)
    plans.push({
      kind: 'pushDate',
      patch: { targetDate: newDateStr },
      display: { date: newDateStr },
      resultingMonthlyAmount: remaining / monthsForFullPush,
      remainingGap: gapAfter(deficit, monthlyAmount, remaining / monthsForFullPush),
    })
  }

  {
    const newRemaining = Math.max(neededMonthly * months, 0)
    const newAmount = round2(goal.savedAmount + newRemaining)
    plans.push({
      kind: 'lowerAmount',
      patch: { targetAmount: newAmount },
      display: { amount: newAmount },
      resultingMonthlyAmount: newRemaining / months,
      remainingGap: gapAfter(deficit, monthlyAmount, newRemaining / months),
    })
  }

  if (monthsForFullPush !== null) {
    const extraMonths = monthsForFullPush - months
    const halfExtra = Math.ceil(extraMonths / 2)
    // Strictly less than the full push, or this degenerates into the same date as option 1 while
    // independently recomputing the amount — which can round to slightly MORE than the original
    // remaining (worse than not touching the amount at all). A genuine partial push needs room
    // for the "half" to mean something.
    if (halfExtra >= 1 && halfExtra < extraMonths && extraMonths <= MAX_PUSH_MONTHS) {
      const monthsBoth = months + halfExtra
      const newRemainingBoth = Math.max(Math.min(neededMonthly * monthsBoth, remaining), 0)
      const newTargetMonth = addMonths(from, monthsBoth - 1)
      const newDate = sameDayInMonth(parseLocalDate(goal.targetDate), newTargetMonth)
      const newDateStr = toDateString(newDate)
      const newAmount = round2(goal.savedAmount + newRemainingBoth)
      plans.push({
        kind: 'both',
        patch: { targetDate: newDateStr, targetAmount: newAmount },
        display: { date: newDateStr, amount: newAmount },
        resultingMonthlyAmount: newRemainingBoth / monthsBoth,
        remainingGap: gapAfter(deficit, monthlyAmount, newRemainingBoth / monthsBoth),
      })
    }
  }

  return plans
}

/** Same idea for an important date. A recurring date (birthday, anniversary) can't have its
 *  date "pushed" — it recurs regardless — so only the lower-amount option is offered for those. */
export function computeImportantDateFixPlans(date: ImportantDate, deficit: number): FixPlan[] {
  const now = new Date()
  const from = startOfMonth(now)
  const remaining = (date.targetAmount ?? 0) - (date.savedAmount ?? 0)
  if (remaining <= 0) return []
  const occursOn = nextOccurrence(date.date, date.recurring)
  const target = startOfMonth(occursOn)
  const months = monthsBetweenInclusive(from, target)
  const monthlyAmount = remaining / months
  const neededMonthly = Math.max(monthlyAmount - deficit, 0)
  const plans: FixPlan[] = []

  const monthsForFullPush = !date.recurring && neededMonthly > 0.005 ? Math.max(Math.ceil(remaining / neededMonthly), months) : null

  if (monthsForFullPush !== null && monthsForFullPush - months <= MAX_PUSH_MONTHS) {
    const newTargetMonth = addMonths(from, monthsForFullPush - 1)
    const newDate = sameDayInMonth(occursOn, newTargetMonth)
    const newDateStr = toDateString(newDate)
    plans.push({
      kind: 'pushDate',
      patch: { date: newDateStr },
      display: { date: newDateStr },
      resultingMonthlyAmount: remaining / monthsForFullPush,
      remainingGap: gapAfter(deficit, monthlyAmount, remaining / monthsForFullPush),
    })
  }

  {
    const newRemaining = Math.max(neededMonthly * months, 0)
    const newAmount = round2((date.savedAmount ?? 0) + newRemaining)
    plans.push({
      kind: 'lowerAmount',
      patch: { targetAmount: newAmount },
      display: { amount: newAmount },
      resultingMonthlyAmount: newRemaining / months,
      remainingGap: gapAfter(deficit, monthlyAmount, newRemaining / months),
    })
  }

  if (monthsForFullPush !== null) {
    const extraMonths = monthsForFullPush - months
    const halfExtra = Math.ceil(extraMonths / 2)
    // See the matching comment in computeGoalFixPlans — must be a genuinely partial push, not
    // the same month as the full-push option with an independently (and possibly worse) amount.
    if (halfExtra >= 1 && halfExtra < extraMonths && extraMonths <= MAX_PUSH_MONTHS) {
      const monthsBoth = months + halfExtra
      const newRemainingBoth = Math.max(Math.min(neededMonthly * monthsBoth, remaining), 0)
      const newTargetMonth = addMonths(from, monthsBoth - 1)
      const newDate = sameDayInMonth(occursOn, newTargetMonth)
      const newDateStr = toDateString(newDate)
      const newAmount = round2((date.savedAmount ?? 0) + newRemainingBoth)
      plans.push({
        kind: 'both',
        patch: { date: newDateStr, targetAmount: newAmount },
        display: { date: newDateStr, amount: newAmount },
        resultingMonthlyAmount: newRemainingBoth / monthsBoth,
        remainingGap: gapAfter(deficit, monthlyAmount, newRemainingBoth / monthsBoth),
      })
    }
  }

  return plans
}
