// ─────────────────────────────────────────────────────────────────────────────
// Finance calculations, ported for the Edge runtime.
//
// The frontend's real implementations live in src/lib/ (planning.ts, importantDates.ts,
// utils.ts, goalReminders.ts, insights.ts). We cannot import them here: this file runs in Deno,
// those modules sit on a dependency chain that reaches `react` / `lucide-react` (utils.ts imports
// React for its form hooks; importantDates.ts imports lucide icons), so a single `import` pulls
// the whole Vite bundle graph in and fails.
//
// So the handful of *pure* calculations notify-tick needs are re-typed here, verbatim, each
// annotated with its source of truth. This is the deliberate v1 compromise from the task brief
// ("Известный архитектурный компромисс"): keep the duplication tiny and pointed, not a copy of
// insights.ts.
//
//   ⚠️  When the logic changes in the src/lib source noted above each function, change it here
//       too. These are load-bearing for what users get pinged about.
// ─────────────────────────────────────────────────────────────────────────────

import { SAVINGS_CATEGORY } from '../../../src/types.ts'
import type {
  AppState,
  CategoryBudget,
  Goal,
  ImportantDate,
  IncomeSource,
  ReminderOffsetKey,
} from '../../../src/types.ts'

// ── from src/lib/utils.ts: parseLocalDate ────────────────────────────────────
// A bare "YYYY-MM-DD" is a calendar day in the user's zone, not UTC midnight. Every date field
// in AppState that came from an <input type="date"> (transaction dates, goal/date targets) must
// be read this way. (See utils.ts for the full off-by-one explanation — "bug 4.10".)
export function parseLocalDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(y, (m || 1) - 1, d || 1)
}

// ── from src/lib/utils.ts: formatMoney ───────────────────────────────────────
const CURRENCY_SYMBOLS: Record<string, string> = { EUR: '€', USD: '$', GBP: '£', PLN: 'zł' }

export function formatMoney(amount: number, currency: string): string {
  const symbol = CURRENCY_SYMBOLS[currency] || currency + ' '
  const sign = amount < 0 ? '-' : ''
  return `${sign}${symbol}${Math.abs(amount).toLocaleString('ru-RU', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

function startOfDay(d: Date): Date {
  const c = new Date(d)
  c.setHours(0, 0, 0, 0)
  return c
}

function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate()
}

// ── from src/lib/planning.ts: monthKey ───────────────────────────────────────
export function monthKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

// ── from src/lib/utils.ts: periodRange ───────────────────────────────────────
// The [from, to] window a budget's period covers, anchored at `anchor` (the user's local now).
export function periodRange(
  period: 'day' | 'week' | 'month' | 'year',
  anchor: Date,
): { from: Date; to: Date } {
  const from = new Date(anchor)
  const to = new Date(anchor)
  to.setHours(23, 59, 59, 999)
  if (period === 'day') {
    from.setHours(0, 0, 0, 0)
  } else if (period === 'week') {
    const day = from.getDay()
    from.setDate(from.getDate() - day)
    from.setHours(0, 0, 0, 0)
  } else if (period === 'month') {
    from.setDate(1)
    from.setHours(0, 0, 0, 0)
  } else if (period === 'year') {
    from.setMonth(0, 1)
    from.setHours(0, 0, 0, 0)
  }
  return { from, to }
}

// ── from src/lib/insights.ts: categorySpend ──────────────────────────────────
export function categorySpend(state: AppState, category: string, from: Date, to: Date): number {
  return state.transactions
    .filter(
      (tx) =>
        tx.type === 'expense' &&
        tx.category === category &&
        parseLocalDate(tx.date) >= from &&
        parseLocalDate(tx.date) <= to,
    )
    .reduce((s, tx) => s + tx.amount, 0)
}

/**
 * Budgets whose spend has reached or passed their limit for the current period, anchored at the
 * user's local `now`. Mirrors insights.ts rule #1 (the `ratio >= 1` branch).
 */
export function exceededBudgets(state: AppState, now: Date): { budget: CategoryBudget; spent: number }[] {
  const out: { budget: CategoryBudget; spent: number }[] = []
  for (const budget of state.budgets) {
    if (!(budget.limit > 0)) continue
    const { from, to } = periodRange(budget.period, now)
    const spent = categorySpend(state, budget.category, from, to)
    if (spent >= budget.limit) out.push({ budget, spent })
  }
  return out
}

// ── from src/lib/importantDates.ts: nextOccurrence ───────────────────────────
// `today` is the user's local start-of-day, passed in (the source uses `new Date()`).
export function nextOccurrence(dateStr: string, recurring: boolean, today: Date): Date {
  const stored = parseLocalDate(dateStr)
  if (!recurring) return startOfDay(stored)
  const base = startOfDay(today)
  let next = new Date(base.getFullYear(), stored.getMonth(), stored.getDate())
  if (next.getTime() < base.getTime()) {
    next = new Date(base.getFullYear() + 1, stored.getMonth(), stored.getDate())
  }
  return next
}

/** Whole days from `today` until an important date's next occurrence. */
export function daysUntilDate(date: ImportantDate, today: Date): number {
  const next = nextOccurrence(date.date, date.recurring, today)
  return Math.round((next.getTime() - startOfDay(today).getTime()) / 86400000)
}

// ── from src/lib/planning.ts: duePaydaySources ──────────────────────────────
// Divergence from the source: the frontend version also fills a localized `label`
// (t.salaryPrompt.*). Here label resolution is the caller's job (it needs the user's language),
// so this returns identity + payDay only.
export interface PaydaySource {
  key: string // 'primary' for the basic salary, or an IncomeSource id
  payDay: number
}

/**
 * Paydays (basic salary + extra income sources) reached this local month and not yet applied or
 * dismissed. Clamps a day like 31 to the month's real length.
 */
export function duePaydaySources(
  salaryDay: number | undefined,
  incomeSources: IncomeSource[],
  handledPaydays: Record<string, string> | undefined,
  now: Date,
): PaydaySource[] {
  const monthK = monthKey(now)
  const dim = daysInMonth(now.getFullYear(), now.getMonth())
  const all: PaydaySource[] = []
  if (salaryDay && salaryDay >= 1) all.push({ key: 'primary', payDay: salaryDay })
  for (const src of incomeSources) {
    if (src.payDay && src.payDay >= 1) all.push({ key: src.id, payDay: src.payDay })
  }
  return all.filter((s) => {
    const effectiveDay = Math.min(s.payDay, dim)
    const reached = now.getDate() >= effectiveDay
    const alreadyHandled = handledPaydays?.[s.key] === monthK
    return reached && !alreadyHandled
  })
}

// ── from src/lib/goalReminders.ts: the pace check ────────────────────────────
export interface GoalPace {
  remaining: number
  daysLeft: number
  neededPerWeek: number
  paceSoFarPerWeek: number
  onPace: boolean
}

/**
 * How a goal is tracking against its deadline, as of the user's local `today`. `onPace` uses the
 * same 0.85 threshold as generateReminders() in goalReminders.ts. Returns null for a goal that's
 * already funded or already past its date (nothing actionable to nudge about).
 */
export function goalPace(goal: Goal, today: Date): GoalPace | null {
  const remaining = goal.targetAmount - goal.savedAmount
  if (remaining <= 0) return null
  const target = startOfDay(parseLocalDate(goal.targetDate))
  const base = startOfDay(today)
  if (target.getTime() < base.getTime()) return null
  const daysLeft = Math.round((target.getTime() - base.getTime()) / 86400000)
  const neededPerWeek = daysLeft > 0 ? (remaining / daysLeft) * 7 : remaining
  const createdDaysAgo = Math.max(
    Math.round((base.getTime() - startOfDay(new Date(goal.createdAt)).getTime()) / 86400000),
    1,
  )
  const paceSoFarPerWeek = (goal.savedAmount / createdDaysAgo) * 7
  const onPace = paceSoFarPerWeek >= neededPerWeek * 0.85
  return { remaining, daysLeft, neededPerWeek, paceSoFarPerWeek, onPace }
}

// ── from src/lib/goalReminders.ts: the configured-reminder engine ────────────
// These are the reminders the user sets up per goal / per important date in Settings →
// Notifications (state.reminderRules). generateReminders() in the source returns at most one
// reminder per rule — its most recently crossed checkpoint — and this mirrors that exactly.

// src/lib/goalReminders.ts: OFFSET_KEYS_WITH_DAYS
const OFFSET_DAYS: Record<ReminderOffsetKey, number> = {
  '2_months': 60,
  '1_month': 30,
  '2_weeks': 14,
  '1_week': 7,
  '3_days': 3,
  '1_day': 1,
  'on_day': 0,
}

// src/lib/goalReminders.ts: findDueOffset — the most recently crossed checkpoint still <= today.
function findDueOffset(offsets: ReminderOffsetKey[], target: Date, now: Date): ReminderOffsetKey | null {
  let due: ReminderOffsetKey | null = null
  let dueTriggerTime = -Infinity
  for (const key of offsets) {
    const triggerDate = new Date(target)
    triggerDate.setDate(triggerDate.getDate() - OFFSET_DAYS[key])
    const t = triggerDate.getTime()
    if (t <= now.getTime() && t > dueTriggerTime) {
      due = key
      dueTriggerTime = t
    }
  }
  return due
}

export interface DueEventReminder {
  targetKind: 'goal' | 'importantDate'
  id: string
  name: string
  offsetKey: ReminderOffsetKey
  daysLeft: number
  /** Stable per "which occurrence" — so a fired checkpoint stays fired for this occurrence but a
   *  recurring date re-arms next year. */
  occurrenceKey: string
  goal?: Goal
  importantDate?: ImportantDate
}

/**
 * Every configured reminder rule whose checkpoint is currently due (trigger date passed, target
 * date not yet). Ported from generateReminders() in goalReminders.ts — same guards (funded goal
 * / past deadline / missing target are skipped), same "one checkpoint per rule" behaviour.
 */
export function dueEventReminders(state: AppState, today: Date): DueEventReminder[] {
  const now = startOfDay(today)
  const out: DueEventReminder[] = []

  for (const rule of state.reminderRules || []) {
    if (rule.targetKind === 'goal') {
      const goal = (state.goals || []).find((g) => g.id === rule.targetId)
      if (!goal) continue
      if (goal.targetAmount - goal.savedAmount <= 0) continue // funded — nothing to nudge
      const target = startOfDay(parseLocalDate(goal.targetDate))
      if (target.getTime() < now.getTime()) continue // deadline passed
      const due = findDueOffset(rule.offsets, target, now)
      if (!due) continue
      out.push({
        targetKind: 'goal',
        id: goal.id,
        name: goal.name,
        offsetKey: due,
        daysLeft: Math.round((target.getTime() - now.getTime()) / 86400000),
        occurrenceKey: goal.targetDate,
        goal,
      })
    } else {
      const date = (state.importantDates || []).find((d) => d.id === rule.targetId)
      if (!date) continue
      const occursOn = nextOccurrence(date.date, date.recurring, now)
      if (occursOn.getTime() < now.getTime()) continue // one-off already passed
      const due = findDueOffset(rule.offsets, occursOn, now)
      if (!due) continue
      out.push({
        targetKind: 'importantDate',
        id: date.id,
        name: date.name,
        offsetKey: due,
        daysLeft: Math.round((occursOn.getTime() - now.getTime()) / 86400000),
        occurrenceKey: `${occursOn.getFullYear()}-${occursOn.getMonth() + 1}`,
        importantDate: date,
      })
    }
  }
  return out
}

/** Target ids that have at least one reminder rule of the given kind — used to avoid doubling a
 *  configured reminder with the fixed-lead fallback notification. */
export function ruledTargetIds(state: AppState, kind: 'goal' | 'importantDate'): Set<string> {
  return new Set((state.reminderRules || []).filter((r) => r.targetKind === kind).map((r) => r.targetId))
}

// ── behavioural metrics for the encouraging notifications ────────────────────
// Источник правды: src/lib/insights.ts. insights.ts has no single named export for either of
// these, but both follow its conventions exactly, and if the "Savings is a transfer, not
// spending" rule (its sumInRange `excludeSavings`) or the budget normalization changes there,
// change it here too.

// src/lib/planning.ts: budgetDailyRate — a budget's limit as a per-day figure.
export function budgetDailyRate(b: CategoryBudget): number {
  switch (b.period) {
    case 'day':
      return b.limit
    case 'week':
      return b.limit / 7
    case 'month':
      return b.limit / 30.44
    case 'year':
    default:
      return b.limit / 365.25
  }
}

/**
 * How much the user has moved into goals / important dates so far this local month — the sum of
 * this month's expense transactions in the SAVINGS_CATEGORY. Same category + date-range logic as
 * insights.ts's sumInRange, just kept (not excluded).
 */
export function savingsSetAsideThisMonth(state: AppState, today: Date): number {
  const base = startOfDay(today)
  const from = new Date(base.getFullYear(), base.getMonth(), 1)
  return (state.transactions || [])
    .filter(
      (tx) =>
        tx.type === 'expense' &&
        tx.category === SAVINGS_CATEGORY &&
        parseLocalDate(tx.date) >= from &&
        parseLocalDate(tx.date) <= base,
    )
    .reduce((s, tx) => s + tx.amount, 0)
}

/**
 * Consecutive days ending today on which real spending (expenses, Savings transfers excluded)
 * stayed at or under the sum of all budgets' daily-normalized rates. An approximation of "you're
 * pacing within budget", computable from transactions alone. 0 when there are no budgets, or the
 * user was over on the most recent day. Capped at `cap` so the copy stays sane.
 */
export function budgetStreakDays(state: AppState, today: Date, cap = 90): number {
  const budgets = state.budgets || []
  if (budgets.length === 0) return 0
  const dailyBudget = budgets.reduce((s, b) => s + budgetDailyRate(b), 0)
  if (!(dailyBudget > 0)) return 0

  // Bucket real spending by local calendar day.
  const perDay = new Map<string, number>()
  for (const tx of state.transactions || []) {
    if (tx.type !== 'expense' || tx.category === SAVINGS_CATEGORY) continue
    perDay.set(tx.date, (perDay.get(tx.date) || 0) + tx.amount)
  }

  const base = startOfDay(today)
  let streak = 0
  for (let i = 0; i < cap; i++) {
    const d = new Date(base.getFullYear(), base.getMonth(), base.getDate() - i)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    if ((perDay.get(key) || 0) <= dailyBudget) streak++
    else break
  }
  return streak
}
