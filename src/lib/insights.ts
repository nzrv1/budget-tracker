import { AppState, BudgetPeriod, Insight, SAVINGS_CATEGORY, Transaction } from '../types'
import { formatMoney, periodRange, parseLocalDate, periodInstanceKey, totals } from './utils'
import { nextPaydayDate } from './planning'
import { Dictionary } from './i18n'
import { translateCategoryName } from './categoryIcons'

// Balance milestones celebrated by the gamification insight below — ordered so the highest one
// already reached can be picked with a simple reverse scan.
const BALANCE_MILESTONES = [1000, 5000, 10000, 25000, 50000, 100000, 250000, 500000, 1000000]

/** The start of the period immediately before `anchor`'s — used to walk backward through a
 *  budget's past periods for the streak insight. */
function shiftPeriodBack(period: BudgetPeriod, anchor: Date): Date {
  const d = new Date(anchor)
  if (period === 'day') d.setDate(d.getDate() - 1)
  else if (period === 'week') d.setDate(d.getDate() - 7)
  else if (period === 'month') d.setMonth(d.getMonth() - 1)
  else d.setFullYear(d.getFullYear() - 1)
  return d
}

/** The real last moment of the period starting at `from` — NOT periodRange()'s `to`, which is
 *  only ever "now" (periodRange is built for "this period so far", not "the whole period"; see
 *  its own doc comment). The pace-extrapolation insight below needs the period's actual length
 *  to project a daily rate across, so it computes this separately. */
function periodEnd(period: BudgetPeriod, from: Date): Date {
  if (period === 'day') {
    const end = new Date(from)
    end.setHours(23, 59, 59, 999)
    return end
  }
  if (period === 'week') {
    const end = new Date(from)
    end.setDate(end.getDate() + 6)
    end.setHours(23, 59, 59, 999)
    return end
  }
  if (period === 'month') {
    return new Date(from.getFullYear(), from.getMonth() + 1, 0, 23, 59, 59, 999)
  }
  return new Date(from.getFullYear(), 11, 31, 23, 59, 59, 999)
}

function daysBetween(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24))
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
    if (ratio > 1) {
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
    } else {
      // Pace extrapolation: rather than waiting for 80% used, project the current spend rate
      // (spent-so-far / days elapsed in the period) forward across the whole period and, if
      // that pace would blow the limit, say exactly how many days early — a concrete date beats
      // a vague "getting close" once there's enough of the period elapsed to trust the rate.
      const totalDays = Math.max(daysBetween(bFrom, periodEnd(budget.period, bFrom)) + 1, 1)
      const elapsedDays = Math.min(Math.max(daysBetween(bFrom, now) + 1, 1), totalDays)
      const dailyRate = spent / elapsedDays
      const projectedTotal = dailyRate * totalDays
      let pacedWarning = false
      if (elapsedDays / totalDays >= 0.15 && spent > 0 && projectedTotal > budget.limit) {
        const daysToLimit = Math.ceil(budget.limit / dailyRate)
        const daysEarly = totalDays - daysToLimit
        if (daysEarly >= 1) {
          pacedWarning = true
          insights.push({
            id: `insight-budget-${budget.category}-${budget.period}-${instanceKey}-pace`,
            tone: 'warning',
            title: t.insights.budgetPaceTitle(categoryName),
            message: t.insights.budgetPaceMessage(daysEarly, periodWord, categoryName),
            createdAt: now.toISOString(),
          })
        }
      }
      if (!pacedWarning && ratio >= 0.8) {
        insights.push({
          id: `insight-budget-${budget.category}-${budget.period}-${instanceKey}-almost`,
          tone: 'warning',
          title: t.insights.budgetAlmostTitle(categoryName),
          message: t.insights.budgetAlmostMessage(Math.round(ratio * 100), periodWord, categoryName),
          createdAt: now.toISOString(),
        })
      }
    }
  }

  // 1b. Streak — N consecutive already-completed periods spent at or under a budget's limit.
  // Walks backward one period at a time from the period right before the current (in-progress)
  // one, stopping at the first period that went over, or once we're back past the budget's own
  // createdAt (it wasn't around to "keep" a streak before it existed), or after a sane cap of
  // periods so a years-old daily budget doesn't walk back thousands of iterations.
  for (const budget of state.budgets) {
    const { from: curFrom } = periodRange(budget.period)
    const createdAt = new Date(budget.createdAt)
    let cursor = shiftPeriodBack(budget.period, curFrom)
    let streak = 0
    for (let i = 0; i < 24; i++) {
      if (cursor.getTime() < createdAt.getTime()) break
      const { from: pFrom, to: pTo } = periodRange(budget.period, cursor)
      const spent = categorySpend(state.transactions, budget.category, pFrom, pTo)
      if (spent > budget.limit) break
      streak++
      cursor = shiftPeriodBack(budget.period, cursor)
    }
    if (streak >= 2) {
      const periodWord =
        budget.period === 'day'
          ? t.insights.periodWordDay
          : budget.period === 'week'
          ? t.insights.periodWordWeek
          : budget.period === 'year'
          ? t.insights.periodWordYear
          : t.insights.periodWordMonth
      const categoryName = translateCategoryName(t, budget.category)
      const instanceKey = periodInstanceKey(budget.period, curFrom)
      insights.push({
        id: `insight-streak-${budget.category}-${budget.period}-${instanceKey}`,
        tone: 'positive',
        title: t.insights.streakTitle(categoryName),
        message: t.insights.streakMessage(streak, periodWord, categoryName),
        createdAt: now.toISOString(),
      })
    }
  }

  // 1c. Spending in a category with real volume but no budget set for it at all — a nudge to
  // put a ceiling on it before it grows unchecked.
  {
    const budgetedCategories = new Set(state.budgets.map((b) => b.category.toLowerCase()))
    const byCategory = new Map<string, number>()
    for (const tx of state.transactions) {
      if (tx.type !== 'expense' || tx.category === SAVINGS_CATEGORY) continue
      if (parseLocalDate(tx.date) < startOfMonth || parseLocalDate(tx.date) > now) continue
      byCategory.set(tx.category, (byCategory.get(tx.category) || 0) + tx.amount)
    }
    const NO_BUDGET_THRESHOLD = 100
    for (const [category, spent] of byCategory) {
      if (budgetedCategories.has(category.toLowerCase())) continue
      if (spent < NO_BUDGET_THRESHOLD) continue
      insights.push({
        id: `insight-no-budget-${category}-${monthKey(startOfMonth)}`,
        tone: 'info',
        title: t.insights.noBudgetTitle(translateCategoryName(t, category)),
        message: t.insights.noBudgetMessage(formatMoney(spent, state.settings.currency), translateCategoryName(t, category)),
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

  // 6. Will the balance last until the next payday — projects the recent daily spend rate
  // forward instead of waiting for the balance to actually run dry. Only fires when a payday is
  // configured anywhere (basic salary or an income source) — otherwise there's nothing to
  // compare against.
  {
    const nextPayday = nextPaydayDate(state.settings.salaryDay, state.incomeSources, now)
    if (nextPayday) {
      const daysUntilPayday = Math.max(daysBetween(now, nextPayday), 0)
      const lookback = new Date(now)
      lookback.setDate(lookback.getDate() - 14)
      const recentExpense = sumInRange(state.transactions, 'expense', lookback, now, true)
      const avgDailySpend = recentExpense / 14
      const balance = totals(state.transactions).net
      if (avgDailySpend > 0 && daysUntilPayday > 0) {
        const runwayDays = Math.max(balance, 0) / avgDailySpend
        if (runwayDays < daysUntilPayday) {
          insights.push({
            id: `insight-runway-${now.toISOString().slice(0, 10)}`,
            tone: 'warning',
            title: t.insights.runwayTitle,
            message: t.insights.runwayMessage(
              Math.max(Math.floor(runwayDays), 0),
              nextPayday.toLocaleDateString(locale, { month: 'short', day: 'numeric' })
            ),
            createdAt: now.toISOString(),
          })
        }
      }
    }
  }

  // 7. Unexpected / one-off income — an income transaction whose amount doesn't match the
  // basic salary or any configured income source (within a small tolerance), logged this month.
  // Auto-logged payday transactions always match exactly, so they're naturally excluded — this
  // only catches genuinely extra money (a one-off gig, a gift, a refund).
  {
    const regularAmounts = [state.settings.monthlyIncome, ...state.incomeSources.map((s) => s.amount)].filter((a) => a > 0)
    for (const tx of state.transactions) {
      if (tx.type !== 'income') continue
      const d = parseLocalDate(tx.date)
      if (d < startOfMonth || d > now) continue
      const matchesRegular = regularAmounts.some((amt) => Math.abs(amt - tx.amount) <= Math.max(amt * 0.01, 1))
      if (matchesRegular) continue
      insights.push({
        id: `insight-unexpected-income-${tx.id}`,
        tone: 'info',
        title: t.insights.unexpectedIncomeTitle,
        message: t.insights.unexpectedIncomeMessage(formatMoney(tx.amount, state.settings.currency)),
        createdAt: now.toISOString(),
      })
    }
  }

  // 8. Savings-rate trend — a single so-so month matters less than the rate sliding for three
  // in a row. Compares the two most recently completed months against this month's projected
  // rate (same day-count extrapolation as the month-over-month insight above).
  {
    const startOfTwoMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 2, 1)
    const endOfTwoMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 1, 0)
    const twoMonthsAgoIncome = sumInRange(state.transactions, 'income', startOfTwoMonthsAgo, endOfTwoMonthsAgo)
    const twoMonthsAgoExpense = sumInRange(state.transactions, 'expense', startOfTwoMonthsAgo, endOfTwoMonthsAgo, true)
    const lastMonthIncome = sumInRange(state.transactions, 'income', startOfLastMonth, endOfLastMonth)
    const daysIntoMonth = daysBetween(startOfMonth, now) + 1
    const daysInThisMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
    const projectedThisMonthExpense = (monthExpense / Math.max(daysIntoMonth, 1)) * daysInThisMonth
    const projectedThisMonthIncome = monthIncome > 0 ? (monthIncome / Math.max(daysIntoMonth, 1)) * daysInThisMonth : monthIncome

    if (twoMonthsAgoIncome > 0 && lastMonthIncome > 0 && projectedThisMonthIncome > 0) {
      const rateTwoMonthsAgo = (twoMonthsAgoIncome - twoMonthsAgoExpense) / twoMonthsAgoIncome
      const rateLastMonth = (lastMonthIncome - lastMonthExpense) / lastMonthIncome
      const rateThisMonth = (projectedThisMonthIncome - projectedThisMonthExpense) / projectedThisMonthIncome
      const STEP = 0.03 // at least 3 percentage points down each step, so noise doesn't trigger it
      if (rateTwoMonthsAgo - rateLastMonth >= STEP && rateLastMonth - rateThisMonth >= STEP) {
        insights.push({
          id: `insight-savings-decline-${monthKey(startOfMonth)}`,
          tone: 'warning',
          title: t.insights.savingsDeclineTitle,
          message: t.insights.savingsDeclineMessage(
            Math.round(rateTwoMonthsAgo * 100),
            Math.round(rateLastMonth * 100),
            Math.round(rateThisMonth * 100)
          ),
          createdAt: now.toISOString(),
        })
      }
    }
  }

  // 9. Balance milestone — a one-time-feeling celebration for the highest round number crossed.
  // Stays visible for as long as the balance is above it (no separate "already celebrated"
  // tracking needed — see lib note in smart-notifications memory for why that's fine here).
  {
    const balance = totals(state.transactions).net
    const milestone = [...BALANCE_MILESTONES].reverse().find((m) => balance >= m)
    if (milestone) {
      insights.push({
        id: `insight-milestone-${milestone}`,
        tone: 'positive',
        title: t.insights.milestoneTitle,
        message: t.insights.milestoneMessage(formatMoney(milestone, state.settings.currency)),
        createdAt: now.toISOString(),
      })
    }
  }

  return insights
}
