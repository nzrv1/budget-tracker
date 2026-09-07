import { AppState, BudgetPeriod, Insight, SAVINGS_CATEGORY, Transaction } from '../types'
import { formatMoney, periodRange, parseLocalDate } from './utils'
import { Dictionary } from './i18n'
import { translateCategoryName } from './categoryIcons'

function daysBetween(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24))
}

/** A stable key identifying "which occurrence" of a recurring period a date falls in,
 * so an insight's id stays the same while that occurrence is ongoing and changes when
 * the next one starts (e.g. a new month) — letting it come back as unread. */
function periodInstanceKey(period: BudgetPeriod, from: Date): string {
  if (period === 'year') return String(from.getFullYear())
  if (period === 'month') return `${from.getFullYear()}-${String(from.getMonth() + 1).padStart(2, '0')}`
  return from.toISOString().slice(0, 10)
}

function monthKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

// parseLocalDate, not new Date() — see utils.ts (bug 4.10).
// excludeSavings drops the 'Savings' category — the expense transaction allocateToGoal /
// allocateToImportantDate now logs whenever money moves into a Goal or Important Date. That
// money isn't spent, it's moved, so counting it as "expense" here would make every insight below
// that reasons about spending pace or savings rate get worse the moment someone actually saves:
// a payday auto-allocation would look like a spending spike, and the resulting drop in leftover
// cash would look like a falling savings rate, exactly backwards from what happened.
function sumInRange(transactions: Transaction[], type: 'income' | 'expense', from: Date, to: Date, excludeSavings = false) {
  return transactions
    .filter(
      (t) =>
        t.type === type &&
        (!excludeSavings || t.category !== SAVINGS_CATEGORY) &&
        parseLocalDate(t.date) >= from &&
        parseLocalDate(t.date) <= to
    )
    .reduce((s, t) => s + t.amount, 0)
}

function categorySpend(transactions: Transaction[], category: string, from: Date, to: Date) {
  return transactions
    .filter((t) => t.type === 'expense' && t.category === category && parseLocalDate(t.date) >= from && parseLocalDate(t.date) <= to)
    .reduce((s, t) => s + t.amount, 0)
}

/**
 * Generates rule-based financial insights from current app state.
 * Pure function — no side effects, safe to call on every render.
 */
export function generateInsights(state: AppState, t: Dictionary, locale: string): Insight[] {
  const insights: Insight[] = []
  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0)
  const startOfWeek = new Date(now)
  startOfWeek.setDate(now.getDate() - now.getDay())

  const monthExpense = sumInRange(state.transactions, 'expense', startOfMonth, now, true)
  const monthIncome = sumInRange(state.transactions, 'income', startOfMonth, now)
  const lastMonthExpense = sumInRange(state.transactions, 'expense', startOfLastMonth, endOfLastMonth, true)
  const weekExpense = sumInRange(state.transactions, 'expense', startOfWeek, now, true)

  // 1. Budget category warnings/praise
  for (const budget of state.budgets) {
    const { from: bFrom, to: bTo } = periodRange(budget.period)
    const spent = categorySpend(state.transactions, budget.category, bFrom, bTo)
    const ratio = budget.limit > 0 ? spent / budget.limit : 0
    const periodWord =
      budget.period === 'day'
        ? t.insights.periodWordDay
        : budget.period === 'week'
        ? t.insights.periodWordWeek
        : budget.period === 'year'
        ? t.insights.periodWordYear
        : t.insights.periodWordMonth
    const categoryName = translateCategoryName(t, budget.category)
    const instanceKey = periodInstanceKey(budget.period, bFrom)
    if (ratio >= 1) {
      insights.push({
        id: `insight-budget-${budget.category}-${budget.period}-${instanceKey}-exceeded`,
        tone: 'warning',
        title: t.insights.budgetExceededTitle(categoryName),
        message: t.insights.budgetExceededMessage(
          formatMoney(spent, state.settings.currency),
          formatMoney(budget.limit, state.settings.currency),
          periodWord,
          categoryName
        ),
        createdAt: now.toISOString(),
      })
    } else if (ratio >= 0.8) {
      insights.push({
        id: `insight-budget-${budget.category}-${budget.period}-${instanceKey}-almost`,
        tone: 'warning',
        title: t.insights.budgetAlmostTitle(categoryName),
        message: t.insights.budgetAlmostMessage(Math.round(ratio * 100), periodWord, categoryName),
        createdAt: now.toISOString(),
      })
    }
  }

  // 2. Goal progress — ready to buy / on pace / behind pace
  for (const goal of state.goals) {
    const remaining = goal.targetAmount - goal.savedAmount
    const daysLeft = daysBetween(now, parseLocalDate(goal.targetDate))
    const progressRatio = goal.savedAmount / goal.targetAmount

    if (remaining <= 0) {
      const actionWord =
        goal.icon === 'flight' ? t.insights.actionWordFlight : goal.icon === 'clothes' ? t.insights.actionWordClothes : t.insights.actionWordGeneric
      insights.push({
        id: `insight-goal-${goal.id}-reached`,
        tone: 'positive',
        title: t.insights.goalReachedTitle(goal.name),
        message: t.insights.goalReachedMessage(goal.name, actionWord),
        createdAt: now.toISOString(),
      })
    } else if (progressRatio >= 0.9) {
      insights.push({
        id: `insight-goal-${goal.id}-almost`,
        tone: 'positive',
        title: t.insights.goalAlmostTitle(goal.name),
        message: t.insights.goalAlmostMessage(
          formatMoney(remaining, state.settings.currency),
          goal.name,
          parseLocalDate(goal.targetDate).toLocaleDateString(locale)
        ),
        createdAt: now.toISOString(),
      })
    } else if (daysLeft > 0) {
      const neededPerWeek = (remaining / Math.max(daysLeft, 1)) * 7
      const currentWeeklySavingRate = monthIncome > 0 ? Math.max((monthIncome - monthExpense) / 4.33, 0) : 0
      if (currentWeeklySavingRate > 0 && currentWeeklySavingRate < neededPerWeek * 0.6) {
        insights.push({
          id: `insight-goal-${goal.id}-behind`,
          tone: 'warning',
          title: t.insights.goalBehindTitle(goal.name),
          message: t.insights.goalBehindMessage(formatMoney(neededPerWeek, state.settings.currency)),
          createdAt: now.toISOString(),
        })
      }
    } else if (daysLeft <= 0 && remaining > 0) {
      insights.push({
        id: `insight-goal-${goal.id}-passed`,
        tone: 'warning',
        title: t.insights.goalPassedTitle(goal.name),
        message: t.insights.goalPassedMessage(goal.name, formatMoney(remaining, state.settings.currency)),
        createdAt: now.toISOString(),
      })
    }
  }

  // 3. Weekly overspending vs. average week this month
  const weeksSoFarThisMonth = Math.max(daysBetween(startOfMonth, now) / 7, 1)
  const avgWeeklySpend = monthExpense / weeksSoFarThisMonth
  if (avgWeeklySpend > 0 && weekExpense > avgWeeklySpend * 1.3) {
    insights.push({
      id: `insight-weekly-overspend-${startOfWeek.toISOString().slice(0, 10)}`,
      tone: 'warning',
      title: t.insights.weeklyOverspendTitle,
      message: t.insights.weeklyOverspendMessage(
        formatMoney(weekExpense, state.settings.currency),
        formatMoney(avgWeeklySpend, state.settings.currency)
      ),
      createdAt: now.toISOString(),
    })
  }

  // 4. Month-over-month improvement
  if (lastMonthExpense > 0 && monthExpense > 0) {
    const daysIntoMonth = daysBetween(startOfMonth, now) + 1
    const daysInLastMonth = daysBetween(startOfLastMonth, endOfLastMonth) + 1
    const projected = (monthExpense / daysIntoMonth) * daysInLastMonth
    const diff = ((lastMonthExpense - projected) / lastMonthExpense) * 100
    if (diff > 8) {
      insights.push({
        id: `insight-mom-${monthKey(startOfMonth)}-down`,
        tone: 'positive',
        title: t.insights.spendingDownTitle,
        message: t.insights.spendingDownMessage(Math.round(diff)),
        createdAt: now.toISOString(),
      })
    } else if (diff < -8) {
      insights.push({
        id: `insight-mom-${monthKey(startOfMonth)}-up`,
        tone: 'warning',
        title: t.insights.spendingUpTitle,
        message: t.insights.spendingUpMessage(Math.round(Math.abs(diff))),
        createdAt: now.toISOString(),
      })
    }
  }

  // 5. Healthy savings rate this month — general encouragement
  if (monthIncome > 0) {
    const savingsRate = (monthIncome - monthExpense) / monthIncome
    if (savingsRate >= 0.2) {
      insights.push({
        id: `insight-savings-rate-${monthKey(startOfMonth)}`,
        tone: 'positive',
        title: t.insights.onTrackTitle,
        message: t.insights.onTrackMessage(Math.round(savingsRate * 100)),
        createdAt: now.toISOString(),
      })
    }
  }

  return insights
}
