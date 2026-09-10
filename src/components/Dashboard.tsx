import { useMemo, useState } from 'react'
import { Plus, ArrowRight, CheckCircle2, AlertTriangle } from 'lucide-react'
import { AppState, Transaction, Insight, CategoryDef, SAVINGS_CATEGORY } from '../types'
import { formatMoney, periodRange, filterByRange, totals, settingsIncomeForPeriod, parseLocalDate } from '../lib/utils'
import { Card, CardHeading, ProgressBar, StatTile } from './shared'
import { CategoryIconGlyph, iconForCategory, translateCategoryName } from '../lib/categoryIcons'
import AddTransactionModal from './AddTransactionModal'
import SalaryPromptBanner from './SalaryPromptBanner'
import BudgetPeriodBanner from './BudgetPeriodBanner'
import { duePaydaySources, planForMonth, startOfMonth } from '../lib/planning'
import { BudgetPeriodReview, pendingBudgetPeriodReviews } from '../lib/budgetPeriods'
import { ViewKey } from '../App'
import { useI18n } from '../lib/i18n'

export default function Dashboard({
  state,
  insights,
  addTransaction,
  addCategory,
  setView,
  applyAutoAllocations,
  dismissSalaryPrompt,
  moveBudgetSurplusToGoal,
  moveBudgetSurplusToImportantDate,
  reduceBudgetLimitForOverspend,
  dismissBudgetPeriodReview,
}: {
  state: AppState
  insights: Insight[]
  addTransaction: (t: Omit<Transaction, 'id'>) => void
  addCategory: (def: CategoryDef) => void
  setView: (v: ViewKey) => void
  applyAutoAllocations: (excludeKeys?: string[]) => void
  dismissSalaryPrompt: () => void
  moveBudgetSurplusToGoal: (review: BudgetPeriodReview, goalId: string) => void
  moveBudgetSurplusToImportantDate: (review: BudgetPeriodReview, dateId: string) => void
  reduceBudgetLimitForOverspend: (review: BudgetPeriodReview) => void
  dismissBudgetPeriodReview: (review: BudgetPeriodReview) => void
}) {
  const { t, locale } = useI18n()
  const [showAdd, setShowAdd] = useState(false)
  const [period, setPeriod] = useState<'month' | 'year'>('month')

  const today0 = new Date()

  // Always-current-calendar-month figures, independent of the period toggle above — used
  // for the savings goal card, which is inherently monthly.
  const currentMonthRange = periodRange('month', today0)
  const currentMonthTx = filterByRange(state.transactions, currentMonthRange.from, currentMonthRange.to)

  // Figures for the stat row, which follow the "This Month" / "This Year" toggle. Uses the
  // same settingsIncomeForPeriod() helper Reports uses, so the two screens can't drift apart
  // on what "income" means again.
  const { from, to } = periodRange(period, today0)
  const periodTx = filterByRange(state.transactions, from, to)
  const periodLogged = totals(periodTx)
  const monthsInPeriod = period === 'month' ? 1 : today0.getMonth() + 1
  const income = settingsIncomeForPeriod(state.settings, state.incomeSources, period, today0) + periodLogged.income
  const expense = periodLogged.expense
  const balance = totals(state.transactions).net

  // Everything you're already committed to spending or setting aside this month — every
  // Budget (day/week/month/year budgets are all normalized to a monthly-equivalent figure
  // here, so a yearly budget still counts), plus what active Goals and Important Dates need
  // this month to stay on track. This is the number "actual money spent so far" (above)
  // doesn't capture, since most of it hasn't been logged as transactions yet.
  const plan = planForMonth(state, startOfMonth(today0))
  const savingsGoalTotal = plan.goalsTotal
  // Actual money moved into Goals/Important Dates this month (payday auto-allocation, or the
  // "add funds" quick-action — see allocateToGoal/allocateToImportantDate in App.tsx), not
  // "income minus expenses" leftover cash. Using leftover cash here used to mean that *actually
  // saving* money made this card look worse — the leftover would drop by the amount saved,
  // shrinking the ratio right when it should have grown.
  const currentMonthSaved = currentMonthTx
    .filter((t) => t.type === 'expense' && t.category === SAVINGS_CATEGORY)
    .reduce((s, t) => s + t.amount, 0)
  const savingsGoalRatio = savingsGoalTotal > 0 ? currentMonthSaved / savingsGoalTotal : 0
  const savingsGoalPercent = Math.max(0, Math.round(savingsGoalRatio * 100))

  // "In theory" projected savings: income for the selected period minus everything that
  // period is already committed to (budgets scaled the same way income is, plus goals and
  // important dates). This is what's realistically left over, not just what's left over
  // from transactions logged so far.
  const periodObligations = plan.total * monthsInPeriod
  const theoreticalSaved = income - periodObligations

  const recent = [...state.transactions]
    .sort((a, b) => parseLocalDate(b.date).getTime() - parseLocalDate(a.date).getTime())
    .slice(0, 5)

  const topInsights = insights.slice(0, 3)

  const today = new Date()
  const dayLabel = today.toLocaleDateString(locale, { weekday: 'long', month: 'long', day: 'numeric' })

  const duePaydays = duePaydaySources(state.settings.salaryDay, state.incomeSources, state.settings.handledPaydays, today, t)
  const budgetReviews = useMemo(() => pendingBudgetPeriodReviews(state), [state])

  return (
    <div>
      {duePaydays.length > 0 && (
        <SalaryPromptBanner
          state={state}
          dueSources={duePaydays}
          onApply={applyAutoAllocations}
          onDismiss={dismissSalaryPrompt}
        />
      )}

      {budgetReviews.map((review) => (
        <BudgetPeriodBanner
          key={review.key}
          state={state}
          review={review}
          onMoveToGoal={moveBudgetSurplusToGoal}
          onMoveToImportantDate={moveBudgetSurplusToImportantDate}
          onReduceNextPeriod={reduceBudgetLimitForOverspend}
          onDismiss={dismissBudgetPeriodReview}
        />
      ))}

      {/* Greeting */}
      <div className="mb-5">
        <p className="text-sm text-ink-softer">{dayLabel}</p>
        <h1 className="font-display font-semibold text-2xl sm:text-3xl text-ink mt-0.5">{t.dashboard.greeting}</h1>
      </div>

      {/* Period toggle — drives the four figures in the strip below */}
      <div className="flex justify-end mb-3">
        <div className="inline-flex rounded-lg border border-paper-line overflow-hidden text-sm font-medium">
          <button
            onClick={() => setPeriod('month')}
            className={`px-4 py-2 min-h-[40px] transition-colors ${
              period === 'month' ? 'bg-ink text-paper' : 'text-ink-softer hover:bg-paper-card'
            }`}
          >
            {t.dashboard.thisMonth}
          </button>
          <button
            onClick={() => setPeriod('year')}
            className={`px-4 py-2 min-h-[40px] transition-colors ${
              period === 'year' ? 'bg-ink text-paper' : 'text-ink-softer hover:bg-paper-card'
            }`}
          >
            {t.dashboard.thisYear}
          </button>
        </div>
      </div>

      {/* Hero balance + stat strip. One grid so they line up: on a phone the hero is a full-width
          row above a 2×2 of tiles; from sm up it's one 6-wide row (hero spans 2). No side-by-side
          label/value anywhere, so a wide amount can't push a track past the screen. */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2 mb-4">
        <div className="col-span-2 md:col-span-4 lg:col-span-2 rounded-lg bg-ink text-paper p-4 flex flex-col justify-center min-w-0">
          <p className="text-xs opacity-70">{t.dashboard.totalBalance}</p>
          <p className="font-display font-bold text-2xl sm:text-3xl tracking-tight tabular-nums mt-1 truncate">
            {formatMoney(balance, state.settings.currency)}
          </p>
        </div>
        <StatTile label={t.dashboard.incomeLabel} value={formatMoney(income, state.settings.currency)} tone="sage" />
        <StatTile label={t.dashboard.spentLabel} value={formatMoney(expense, state.settings.currency)} tone="clay" />
        <StatTile
          label={t.dashboard.safeToSpend}
          value={formatMoney(theoreticalSaved, state.settings.currency)}
          tone={theoreticalSaved < 0 ? 'clay' : 'ink'}
        />
        <StatTile label={t.dashboard.setAside} value={formatMoney(currentMonthSaved, state.settings.currency)} tone="gold" />
      </div>

      {/* Primary action — full-width on phones */}
      <button
        onClick={() => setShowAdd(true)}
        className="w-full sm:w-auto min-h-[44px] inline-flex items-center justify-center gap-2 bg-ink text-paper px-5 rounded font-medium text-sm hover:bg-ink-light transition-colors mb-6"
      >
        <Plus size={16} />
        {t.dashboard.addTransaction}
      </button>

      {/* Single column on phones; 2/3 + 1/3 split on lg. A flex column (not grid) below lg so a
          wide child can't force a grid track past the screen. */}
      <div className="flex flex-col gap-4 lg:grid lg:grid-cols-3 lg:gap-6">
        <div className="lg:col-span-2 flex flex-col gap-4 lg:gap-6">
          <Card className="p-4 sm:p-5">
            <CardHeading title={t.dashboard.savingsGoalTitle} />
            {savingsGoalTotal > 0 ? (
              <>
                <p className="font-tabular text-sm mb-2">
                  {formatMoney(currentMonthSaved, state.settings.currency)}{' '}
                  <span className="text-ink-softer">{t.goals.ofAmount(formatMoney(savingsGoalTotal, state.settings.currency))}</span>
                </p>
                <ProgressBar ratio={savingsGoalRatio} tone={savingsGoalRatio >= 1 ? 'sage' : savingsGoalRatio >= 0.5 ? 'gold' : 'clay'} />
                <p className="text-sm text-ink-softer mt-3">{t.dashboard.savingsGoalProgress(savingsGoalPercent)}</p>
              </>
            ) : (
              <p className="text-sm text-ink-softer">{t.dashboard.savingsGoalEmpty}</p>
            )}
          </Card>

          <Card className="p-4 sm:p-5">
            <CardHeading
              title={t.dashboard.recentTransactionsTitle}
              action={
                <button
                  onClick={() => setView('transactions')}
                  className="text-sm text-ink-softer hover:text-ink inline-flex items-center gap-1"
                >
                  {t.dashboard.viewAll} <ArrowRight size={14} />
                </button>
              }
            />
            {recent.length === 0 ? (
              <EmptyState text={t.dashboard.noTransactionsYet} />
            ) : (
              <div className="flex flex-col divide-y divide-paper-line">
                {recent.map((tx) => (
                  <div key={tx.id} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="w-8 h-8 rounded-full bg-paper flex items-center justify-center shrink-0">
                        <CategoryIconGlyph icon={iconForCategory(state.categories, tx.category)} size={14} className="text-ink-softer" />
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-ink truncate">{tx.note || translateCategoryName(t, tx.category)}</p>
                        <p className="text-xs text-ink-softer">
                          {translateCategoryName(t, tx.category)} ·{' '}
                          {parseLocalDate(tx.date).toLocaleDateString(locale, { month: 'short', day: 'numeric' })}
                        </p>
                      </div>
                    </div>
                    <span
                      className={`font-tabular text-sm font-medium shrink-0 ml-3 ${
                        tx.type === 'income' ? 'text-sage-dark' : 'text-ink'
                      }`}
                    >
                      {tx.type === 'income' ? '+' : '-'}
                      {formatMoney(tx.amount, state.settings.currency)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* Insights feed */}
        <div>
          <Card className="p-4 sm:p-5">
            <CardHeading
              title={t.dashboard.smartInsightsTitle}
              action={
                <button
                  onClick={() => setView('notifications')}
                  className="text-sm text-ink-softer hover:text-ink inline-flex items-center gap-1"
                >
                  {t.dashboard.insightsAll} <ArrowRight size={14} />
                </button>
              }
            />
            {topInsights.length === 0 ? (
              <EmptyState text={t.dashboard.insightsEmpty} />
            ) : (
              <div className="flex flex-col gap-3">
                {topInsights.map((insight) => (
                  <div key={insight.id} className="flex gap-2.5">
                    {insight.tone === 'positive' ? (
                      <CheckCircle2 size={16} className="text-sage-dark shrink-0 mt-0.5" strokeWidth={1.75} />
                    ) : (
                      <AlertTriangle size={16} className="text-clay-dark shrink-0 mt-0.5" strokeWidth={1.75} />
                    )}
                    <div>
                      <p className="text-sm font-medium text-ink leading-snug">{insight.title}</p>
                      <p className="text-xs text-ink-softer mt-0.5 leading-relaxed">{insight.message}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>

      {showAdd && (
        <AddTransactionModal
          onClose={() => setShowAdd(false)}
          onSave={addTransaction}
          categories={state.categories}
          onAddCategory={addCategory}
        />
      )}
    </div>
  )
}

export function EmptyState({ text }: { text: string }) {
  return (
    <div className="text-center py-8">
      <p className="text-sm text-ink-softer">{text}</p>
    </div>
  )
}
