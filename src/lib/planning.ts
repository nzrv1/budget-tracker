// Turns Budgets, Goals, and Important Dates into a "how much do I need to set aside"
// figure for a given month or week — powering the Calendar view.
import { AppState, CategoryBudget, GoalIcon, ImportantDateCategory, IncomeSource } from '../types'
import { nextOccurrence } from './importantDates'
import { parseLocalDate } from './utils'
import { Dictionary } from './i18n'

function startOfDay(d: Date): Date {
  const c = new Date(d)
  c.setHours(0, 0, 0, 0)
  return c
}

export function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1)
}

function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate()
}

/** 'YYYY-MM' for a date — used to track "has this month's payday prompt been handled". */
export function monthKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export interface PaydaySource {
  key: string // 'primary' for the basic salary, or an IncomeSource id
  label: string
  payDay: number
}

/**
 * Which paydays (basic salary plus any extra income sources — useful for more than one job)
 * have been reached this month and haven't already been applied or dismissed. Clamps each
 * day to the month's last day so a payday of e.g. 31 still fires in shorter months.
 */
export function duePaydaySources(
  salaryDay: number | undefined,
  incomeSources: IncomeSource[],
  handledPaydays: Record<string, string> | undefined,
  now: Date = new Date(),
  t?: Dictionary
): PaydaySource[] {
  const monthK = monthKey(now)
  const dim = daysInMonth(now.getFullYear(), now.getMonth())
  const all: PaydaySource[] = []
  const basicSalaryLabel = t ? t.salaryPrompt.basicSalaryLabel : 'Basic salary'
  const incomeFallbackLabel = t ? t.salaryPrompt.incomeSourceFallbackLabel : 'Income'
  if (salaryDay && salaryDay >= 1) all.push({ key: 'primary', label: basicSalaryLabel, payDay: salaryDay })
  for (const src of incomeSources) {
    if (src.payDay && src.payDay >= 1) all.push({ key: src.id, label: src.name || incomeFallbackLabel, payDay: src.payDay })
  }
  return all.filter((s) => {
    const effectiveDay = Math.min(s.payDay, dim)
    const reached = now.getDate() >= effectiveDay
    const alreadyHandled = handledPaydays?.[s.key] === monthK
    return reached && !alreadyHandled
  })
}

/**
 * The single soonest upcoming payday across the basic salary and every extra income source —
 * today counts as "upcoming" if its payday hasn't passed yet. Unlike duePaydaySources (which
 * only looks at paydays already reached this month), this always resolves to a real future
 * date: this month's payday if it's still ahead, otherwise next month's. Used by the "will the
 * balance last until payday" insight — feeds it how many days of runway it actually needs.
 * Returns null if no payday is configured anywhere (no basic salary day, no income sources).
 */
export function nextPaydayDate(salaryDay: number | undefined, incomeSources: IncomeSource[], now: Date = new Date()): Date | null {
  const days: number[] = []
  if (salaryDay && salaryDay >= 1) days.push(salaryDay)
  for (const src of incomeSources) {
    if (src.payDay && src.payDay >= 1) days.push(src.payDay)
  }
  if (days.length === 0) return null

  let soonest: Date | null = null
  for (const day of days) {
    const dimThisMonth = daysInMonth(now.getFullYear(), now.getMonth())
    const effectiveThisMonth = Math.min(day, dimThisMonth)
    let candidate = new Date(now.getFullYear(), now.getMonth(), effectiveThisMonth)
    if (startOfDay(candidate).getTime() < startOfDay(now).getTime()) {
      const nextMonth = addMonths(now, 1)
      const dimNextMonth = daysInMonth(nextMonth.getFullYear(), nextMonth.getMonth())
      candidate = new Date(nextMonth.getFullYear(), nextMonth.getMonth(), Math.min(day, dimNextMonth))
    }
    if (!soonest || candidate.getTime() < soonest.getTime()) soonest = candidate
  }
  return soonest
}

export interface DuePaydayIncome {
  key: string // 'primary' or an IncomeSource id
  label: string
  amount: number
  date: string // 'YYYY-MM-DD' — this month's payday, clamped to the last day of short months
}

/**
 * Salary / income paydays that have been reached this month and haven't yet been auto-logged
 * as an income transaction (settings.autoIncomePaydays). The App.tsx effect turns each of
 * these into a real income transaction so the balance reflects that payday landed, then
 * records the month so it fires once. Only ever the current month — missed months aren't
 * back-filled, since the app can't know whether the person was even using it then.
 */
export function duePaydayIncome(
  settings: { salaryDay?: number; monthlyIncome: number; autoIncomePaydays?: Record<string, string> },
  incomeSources: IncomeSource[],
  now: Date = new Date(),
  t?: Dictionary
): DuePaydayIncome[] {
  const monthK = monthKey(now)
  const dim = daysInMonth(now.getFullYear(), now.getMonth())
  const auto = settings.autoIncomePaydays || {}
  const basicSalaryLabel = t ? t.salaryPrompt.basicSalaryLabel : 'Basic salary'
  const incomeFallbackLabel = t ? t.salaryPrompt.incomeSourceFallbackLabel : 'Income'
  const out: DuePaydayIncome[] = []

  const consider = (key: string, payDay: number | undefined, amount: number, label: string) => {
    if (!payDay || payDay < 1 || amount <= 0) return
    const effectiveDay = Math.min(payDay, dim)
    if (now.getDate() < effectiveDay) return
    if (auto[key] === monthK) return
    const date = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(effectiveDay).padStart(2, '0')}`
    out.push({ key, label, amount, date })
  }

  consider('primary', settings.salaryDay, settings.monthlyIncome, basicSalaryLabel)
  for (const src of incomeSources) consider(src.id, src.payDay, src.amount, src.name || incomeFallbackLabel)
  return out
}

function monthsBetweenInclusive(from: Date, to: Date): number {
  const diff = (to.getFullYear() - from.getFullYear()) * 12 + (to.getMonth() - from.getMonth())
  return Math.max(diff + 1, 1)
}

// Weeks start on Monday, matching the rest of the app's date handling.
export function startOfWeek(d: Date): Date {
  const c = startOfDay(d)
  const dow = (c.getDay() + 6) % 7 // 0 = Monday .. 6 = Sunday
  c.setDate(c.getDate() - dow)
  return c
}

export function addDays(d: Date, n: number): Date {
  const c = new Date(d)
  c.setDate(c.getDate() + n)
  return c
}

export function addMonths(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth() + n, 1)
}

function weeksBetweenInclusive(fromWeekStart: Date, toWeekStart: Date): number {
  const diffDays = Math.round((toWeekStart.getTime() - fromWeekStart.getTime()) / 86400000)
  return Math.max(Math.round(diffDays / 7) + 1, 1)
}

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

export interface ContributionItem {
  id: string
  kind: 'goal' | 'importantDate'
  label: string
  amount: number
}

export interface PeriodPlan {
  start: Date
  end: Date
  budgetsTotal: number
  goalsTotal: number
  datesTotal: number
  total: number
  goalItems: ContributionItem[]
  dateItems: ContributionItem[]
}

/**
 * For each month (or week) between now and a goal's target date, an even slice of what's
 * still left to save. Spread evenly rather than front- or back-loaded, so "how much per
 * month" stays a constant, predictable number.
 */
export function planForMonth(state: AppState, monthStart: Date): PeriodPlan {
  const now = startOfDay(new Date())
  const year = monthStart.getFullYear()
  const month = monthStart.getMonth()
  const dim = daysInMonth(year, month)
  const start = new Date(year, month, 1)
  const end = new Date(year, month, dim)
  const thisMonth = startOfMonth(monthStart)
  const from = startOfMonth(now)

  const budgetsTotal = state.budgets.reduce((sum, b) => sum + budgetDailyRate(b) * dim, 0)

  let goalsTotal = 0
  const goalItems: ContributionItem[] = []
  for (const goal of state.goals) {
    const remaining = goal.targetAmount - goal.savedAmount
    if (remaining <= 0) continue
    // parseLocalDate, not new Date() — see utils.ts (bug 4.10: a bare "YYYY-MM-DD" parsed as
    // UTC midnight lands on the previous calendar day for negative-UTC-offset users).
    const target = startOfDay(parseLocalDate(goal.targetDate))
    if (target.getTime() < now.getTime()) continue
    const to = startOfMonth(target)
    if (thisMonth.getTime() < from.getTime() || thisMonth.getTime() > to.getTime()) continue
    const months = monthsBetweenInclusive(from, to)
    const amount = remaining / months
    goalsTotal += amount
    goalItems.push({ id: goal.id, kind: 'goal', label: goal.name, amount })
  }

  let datesTotal = 0
  const dateItems: ContributionItem[] = []
  for (const date of state.importantDates) {
    if (!date.targetAmount || date.targetAmount <= 0) continue
    const remaining = date.targetAmount - (date.savedAmount ?? 0)
    if (remaining <= 0) continue
    const occursOn = nextOccurrence(date.date, date.recurring)
    const to = startOfMonth(occursOn)
    if (thisMonth.getTime() < from.getTime() || thisMonth.getTime() > to.getTime()) continue
    const months = monthsBetweenInclusive(from, to)
    const amount = remaining / months
    datesTotal += amount
    dateItems.push({ id: date.id, kind: 'importantDate', label: date.name, amount })
  }

  return {
    start,
    end,
    budgetsTotal,
    goalsTotal,
    datesTotal,
    total: budgetsTotal + goalsTotal + datesTotal,
    goalItems,
    dateItems,
  }
}

export function planForWeek(state: AppState, weekStart: Date): PeriodPlan {
  const now = startOfDay(new Date())
  const start = startOfWeek(weekStart)
  const end = addDays(start, 6)
  const from = startOfWeek(now)

  const budgetsTotal = state.budgets.reduce((sum, b) => sum + budgetDailyRate(b) * 7, 0)

  let goalsTotal = 0
  const goalItems: ContributionItem[] = []
  for (const goal of state.goals) {
    const remaining = goal.targetAmount - goal.savedAmount
    if (remaining <= 0) continue
    // parseLocalDate, not new Date() — see utils.ts (bug 4.10: a bare "YYYY-MM-DD" parsed as
    // UTC midnight lands on the previous calendar day for negative-UTC-offset users).
    const target = startOfDay(parseLocalDate(goal.targetDate))
    if (target.getTime() < now.getTime()) continue
    const to = startOfWeek(target)
    if (start.getTime() < from.getTime() || start.getTime() > to.getTime()) continue
    const weeks = weeksBetweenInclusive(from, to)
    const amount = remaining / weeks
    goalsTotal += amount
    goalItems.push({ id: goal.id, kind: 'goal', label: goal.name, amount })
  }

  let datesTotal = 0
  const dateItems: ContributionItem[] = []
  for (const date of state.importantDates) {
    if (!date.targetAmount || date.targetAmount <= 0) continue
    const remaining = date.targetAmount - (date.savedAmount ?? 0)
    if (remaining <= 0) continue
    const occursOn = nextOccurrence(date.date, date.recurring)
    const to = startOfWeek(occursOn)
    if (start.getTime() < from.getTime() || start.getTime() > to.getTime()) continue
    const weeks = weeksBetweenInclusive(from, to)
    const amount = remaining / weeks
    datesTotal += amount
    dateItems.push({ id: date.id, kind: 'importantDate', label: date.name, amount })
  }

  return {
    start,
    end,
    budgetsTotal,
    goalsTotal,
    datesTotal,
    total: budgetsTotal + goalsTotal + datesTotal,
    goalItems,
    dateItems,
  }
}

export type CalendarEvent =
  | { kind: 'goal'; id: string; name: string; day: number; saved: number; target: number; icon: GoalIcon }
  | {
      kind: 'importantDate'
      id: string
      name: string
      day: number
      saved: number
      target: number
      hasTarget: boolean
      category: ImportantDateCategory
    }

/** Which goals and important dates land on which day of a given month, for the mini calendar grid. */
export function eventsInMonth(state: AppState, monthStart: Date): CalendarEvent[] {
  const year = monthStart.getFullYear()
  const month = monthStart.getMonth()
  const results: CalendarEvent[] = []

  for (const d of state.importantDates) {
    // parseLocalDate — see utils.ts (bug 4.10).
    const base = parseLocalDate(d.date)
    const matches = d.recurring
      ? base.getMonth() === month
      : base.getFullYear() === year && base.getMonth() === month
    if (matches) {
      results.push({
        kind: 'importantDate',
        id: d.id,
        name: d.name,
        day: base.getDate(),
        saved: d.savedAmount ?? 0,
        target: d.targetAmount ?? 0,
        hasTarget: !!d.targetAmount && d.targetAmount > 0,
        category: d.category,
      })
    }
  }

  for (const g of state.goals) {
    // parseLocalDate — see utils.ts (bug 4.10).
    const target = parseLocalDate(g.targetDate)
    if (target.getFullYear() === year && target.getMonth() === month) {
      results.push({
        kind: 'goal',
        id: g.id,
        name: g.name,
        day: target.getDate(),
        saved: g.savedAmount,
        target: g.targetAmount,
        icon: g.icon,
      })
    }
  }

  return results
}
