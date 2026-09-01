import { AppState, BudgetPeriod, Insight, Transaction } from '../types'
import { formatMoney, periodRange } from './utils'

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

function sumInRange(transactions: Transaction[], type: 'income' | 'expense', from: Date, to: Date) {
  return transactions
    .filter((t) => t.type === type && new Date(t.date) >= from && new Date(t.date) <= to)
    .reduce((s, t) => s + t.amount, 0)
}

function categorySpend(transactions: Transaction[], category: string, from: Date, to: Date) {
  return transactions
    .filter((t) => t.type === 'expense' && t.category === category && new Date(t.date) >= from && new Date(t.date) <= to)
    .reduce((s, t) => s + t.amount, 0)
}

/**
 * Generates rule-based financial insights from current app state.
 * Pure function — no side effects, safe to call on every render.
 */
export function generateInsights(state: AppState): Insight[] {
  const insights: Insight[] = []
  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0)
  const startOfWeek = new Date(now)
  startOfWeek.setDate(now.getDate() - now.getDay())

  const monthExpense = sumInRange(state.transactions, 'expense', startOfMonth, now)
  const monthIncome = sumInRange(state.transactions, 'income', startOfMonth, now)
  const lastMonthExpense = sumInRange(state.transactions, 'expense', startOfLastMonth, endOfLastMonth)
  const weekExpense = sumInRange(state.transactions, 'expense', startOfWeek, now)

  // 1. Budget category warnings/praise
  for (const budget of state.budgets) {
    const { from: bFrom, to: bTo } = periodRange(budget.period)
    const spent = categorySpend(state.transactions, budget.category, bFrom, bTo)
    const ratio = budget.limit > 0 ? spent / budget.limit : 0
    const periodWord = budget.period === 'day' ? 'daily' : budget.period === 'week' ? 'weekly' : budget.period === 'year' ? 'yearly' : 'monthly'
    const instanceKey = periodInstanceKey(budget.period, bFrom)
    if (ratio >= 1) {
      insights.push({
        id: `insight-budget-${budget.category}-${budget.period}-${instanceKey}-exceeded`,
        tone: 'warning',
        title: `${budget.category} budget exceeded`,
        message: `You've spent ${formatMoney(spent, state.settings.currency)} of your ${formatMoney(budget.limit, state.settings.currency)} ${periodWord} ${budget.category} budget. Consider holding off on further ${budget.category.toLowerCase()} purchases.`,
        createdAt: now.toISOString(),
      })
    } else if (ratio >= 0.8) {
      insights.push({
        id: `insight-budget-${budget.category}-${budget.period}-${instanceKey}-almost`,
        tone: 'warning',
        title: `${budget.category} budget almost used up`,
        message: `You're at ${Math.round(ratio * 100)}% of your ${periodWord} ${budget.category} budget — worth pacing the rest of your spending here.`,
        createdAt: now.toISOString(),
      })
    }
  }

  // 2. Goal progress — ready to buy / on pace / behind pace
  for (const goal of state.goals) {
    const remaining = goal.targetAmount - goal.savedAmount
    const daysLeft = daysBetween(now, new Date(goal.targetDate))
    const progressRatio = goal.savedAmount / goal.targetAmount

    if (remaining <= 0) {
      const actionWord = goal.icon === 'flight' ? 'book those flight tickets' : goal.icon === 'clothes' ? 'go ahead with that shopping' : 'go for it'
      insights.push({
        id: `insight-goal-${goal.id}-reached`,
        tone: 'positive',
        title: `${goal.name} goal reached`,
        message: `You've fully funded "${goal.name}". Good time to ${actionWord}.`,
        createdAt: now.toISOString(),
      })
    } else if (progressRatio >= 0.9) {
      insights.push({
        id: `insight-goal-${goal.id}-almost`,
        tone: 'positive',
        title: `${goal.name} — almost there`,
        message: `Only ${formatMoney(remaining, state.settings.currency)} left to reach "${goal.name}". At this pace you'll likely hit it before ${new Date(goal.targetDate).toLocaleDateString()}.`,
        createdAt: now.toISOString(),
      })
    } else if (daysLeft > 0) {
      const neededPerWeek = (remaining / Math.max(daysLeft, 1)) * 7
      const currentWeeklySavingRate = monthIncome > 0 ? Math.max((monthIncome - monthExpense) / 4.33, 0) : 0
      if (currentWeeklySavingRate > 0 && currentWeeklySavingRate < neededPerWeek * 0.6) {
        insights.push({
          id: `insight-goal-${goal.id}-behind`,
          tone: 'warning',
          title: `${goal.name} may fall behind`,
          message: `You'd need to save about ${formatMoney(neededPerWeek, state.settings.currency)}/week to hit this goal by its target date — your current pace looks slower than that.`,
          createdAt: now.toISOString(),
        })
      }
    } else if (daysLeft <= 0 && remaining > 0) {
      insights.push({
        id: `insight-goal-${goal.id}-passed`,
        tone: 'warning',
        title: `${goal.name} target date passed`,
        message: `The target date for "${goal.name}" has passed with ${formatMoney(remaining, state.settings.currency)} still needed. Consider adjusting the date or the target amount.`,
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
      title: 'Spending faster than usual this week',
      message: `This week's spending (${formatMoney(weekExpense, state.settings.currency)}) is running well above your typical weekly pace (${formatMoney(avgWeeklySpend, state.settings.currency)}) this month.`,
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
        title: 'Spending trending down',
        message: `Projected spending this month is about ${Math.round(diff)}% lower than last month. Keep it up.`,
        createdAt: now.toISOString(),
      })
    } else if (diff < -8) {
      insights.push({
        id: `insight-mom-${monthKey(startOfMonth)}-up`,
        tone: 'warning',
        title: 'Spending trending up',
        message: `Projected spending this month is about ${Math.round(Math.abs(diff))}% higher than last month.`,
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
        title: 'On track this month',
        message: `You're saving about ${Math.round(savingsRate * 100)}% of your income this month — a healthy pace toward your goals.`,
        createdAt: now.toISOString(),
      })
    }
  }

  return insights
}
