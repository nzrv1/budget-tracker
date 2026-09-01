// Turns Budgets, Goals, and Important Dates into a "how much do I need to set aside"
// figure for a given month or week — powering the Calendar view.
import { AppState, CategoryBudget, GoalIcon, ImportantDateCategory, IncomeSource } from '../types'
import { nextOccurrence } from './importantDates'

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
  now: Date = new Date()
): PaydaySource[] {
  const monthK = monthKey(now)
  const dim = daysInMonth(now.getFullYear(), now.getMonth())
  const all: PaydaySource[] = []
  if (salaryDay && salaryDay >= 1) all.push({ key: 'primary', label: 'Basic salary', payDay: salaryDay })
  for (const src of incomeSources) {
    if (src.payDay && src.payDay >= 1) all.push({ key: src.id, label: src.name || 'Income', payDay: src.payDay })
  }
  return all.filter((s) => {
    const effectiveDay = Math.min(s.payDay, dim)
    const reached = now.getDate() >= effectiveDay
    const alreadyHandled = handledPaydays?.[s.key] === monthK
    return reached && !alreadyHandled
  })
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

function budgetDailyRate(b: CategoryBudget): number {
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
    const target = startOfDay(new Date(goal.targetDate))
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
    const target = startOfDay(new Date(goal.targetDate))
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
    const base = new Date(d.date)
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
    const target = new Date(g.targetDate)
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
