import { useMemo, useState } from 'react'
import { Plus, Minus, ArrowRight, AlertTriangle, Bell, Settings } from 'lucide-react'
import { AppState, Transaction, TransactionType, CategoryDef } from '../types'
import { formatMoney, periodRange, filterByRange, totals, settingsIncomeForPeriod, parseLocalDate } from '../lib/utils'
import { Card, CardHeading, EmptyState, StatTile } from './shared'
import { CategoryIconGlyph, iconForCategory, translateCategoryName } from '../lib/categoryIcons'
import AddTransactionModal from './AddTransactionModal'
import BudgetVsActualCard from './BudgetVsActualCard'
import SalaryPromptBanner from './SalaryPromptBanner'
import BudgetPeriodBanner from './BudgetPeriodBanner'
import { duePaydaySources } from '../lib/planning'
import { BudgetPeriodReview, pendingBudgetPeriodReviews } from '../lib/budgetPeriods'
import { ViewKey } from '../App'
import { useI18n } from '../lib/i18n'

export default function Dashboard({
  state,
  addTransaction,
  addCategory,
  setView,
  applyAutoAllocations,
  dismissSalaryPrompt,
  moveBudgetSurplusToGoal,
  moveBudgetSurplusToImportantDate,
  reduceBudgetLimitForOverspend,
  dismissBudgetPeriodReview,
  notificationCount,
}: {
  state: AppState
  addTransaction: (t: Omit<Transaction, 'id'>) => void
  addCategory: (def: CategoryDef) => void
  setView: (v: ViewKey) => void
  notificationCount: number
  applyAutoAllocations: (excludeKeys?: string[]) => void
  dismissSalaryPrompt: () => void
  moveBudgetSurplusToGoal: (review: BudgetPeriodReview, goalId: string) => void
  moveBudgetSurplusToImportantDate: (review: BudgetPeriodReview, dateId: string) => void
  reduceBudgetLimitForOverspend: (review: BudgetPeriodReview) => void
  dismissBudgetPeriodReview: (review: BudgetPeriodReview) => void
}) {
  const { t, locale } = useI18n()
  const [showAdd, setShowAdd] = useState<TransactionType | false>(false)
  const [period, setPeriod] = useState<'month' | 'year'>('month')

  const today0 = new Date()

  // Figures for the stat row, which follow the "This Month" / "This Year" toggle. Uses the
  // same settingsIncomeForPeriod() helper Reports uses, so the two screens can't drift apart
  // on what "income" means again.
  const { from, to } = periodRange(period, today0)
  const periodTx = filterByRange(state.transactions, from, to)
  const periodLogged = totals(periodTx)
  const income = settingsIncomeForPeriod(state.settings, state.incomeSources, period, today0) + periodLogged.income
  const expense = periodLogged.expense
  const balance = totals(state.transactions).net

  // "Over budget this week" readout: only budgets the user themselves configured with a
  // *weekly* period, compared directly against this week's actual spend for that category.
  // A monthly/yearly budget must never surface here just because it's normalized to a
  // weekly-equivalent rate — notifications follow the period the user picked when creating
  // the budget, not an app-invented one.
  const weekRange = periodRange('week', today0)
  const weekTx = filterByRange(state.transactions, weekRange.from, weekRange.to)
  const overWeekly = state.budgets
    .filter((b) => b.period === 'week')
    .map((b) => {
      const spent = weekTx
        .filter((tx) => tx.type === 'expense' && tx.category === b.category)
        .reduce((s, tx) => s + tx.amount, 0)
      return { category: b.category, spent, allowance: b.limit }
    })
    .filter((b) => b.allowance > 0 && b.spent > b.allowance)
    .sort((a, b) => b.spent / b.allowance - a.spent / a.allowance)

  const recent = [...state.transactions]
    .sort((a, b) => parseLocalDate(b.date).getTime() - parseLocalDate(a.date).getTime())
    .slice(0, 5)

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

      {/* Greeting + quick access to notifications / settings (they live in the "More" sheet on
          the bottom nav, so surface the two that matter day-to-day right here). */}
      <div className="flex items-start justify-between gap-3 mb-5">
        <div className="min-w-0">
          <p className="text-sm text-ink-softer">{dayLabel}</p>
          <h1 className="font-display font-semibold text-2xl sm:text-3xl text-ink mt-0.5">{t.dashboard.greeting}</h1>
        </div>
        <div className="flex items-center gap-1 shrink-0 -mr-1">
          <button
            onClick={() => setView('notifications')}
            aria-label={t.dashboard.openNotifications}
            className="relative flex h-11 w-11 items-center justify-center rounded-lg text-ink-softer hover:text-ink hover:bg-paper-card transition-colors"
          >
            <Bell size={19} strokeWidth={1.75} />
            {notificationCount > 0 && (
              <span
                aria-hidden="true"
                className="absolute top-2 right-2 min-w-[16px] h-4 px-1 rounded-full bg-clay text-white text-[10px] font-semibold flex items-center justify-center"
              >
                {notificationCount > 9 ? '9+' : notificationCount}
              </span>
            )}
          </button>
          <button
            onClick={() => setView('settings')}
            aria-label={t.dashboard.openSettings}
            className="flex h-11 w-11 items-center justify-center rounded-lg text-ink-softer hover:text-ink hover:bg-paper-card transition-colors"
          >
            <Settings size={19} strokeWidth={1.75} />
          </button>
        </div>
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
          row above a 2-wide row of tiles; from lg up it's one 4-wide row (hero spans 2). No
          side-by-side label/value anywhere, so a wide amount can't push a track past the screen. */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 mb-4">
        <div className="col-span-2 rounded-lg bg-ink text-paper p-4 flex flex-col justify-center min-w-0">
          <p className="text-xs opacity-70">{t.dashboard.totalBalance}</p>
          <p className="font-display font-bold text-2xl sm:text-3xl tracking-tight tabular-nums mt-1 truncate">
            {formatMoney(balance, state.settings.currency)}
          </p>
        </div>
        <StatTile label={t.dashboard.incomeLabel} value={formatMoney(income, state.settings.currency)} tone="sage" />
        <StatTile label={t.dashboard.spentLabel} value={formatMoney(expense, state.settings.currency)} tone="clay" />
      </div>

      {overWeekly.length > 0 && (
        <div className="mb-6 rounded-lg border border-clay/30 bg-clay-light/40 p-3">
          <p className="text-xs font-semibold text-clay-dark mb-2 flex items-center gap-1.5">
            <AlertTriangle size={13} strokeWidth={2} className="shrink-0" />
            {t.dashboard.overWeeklyTitle}
          </p>
          <div className="flex flex-col gap-1.5">
            {overWeekly.map((b) => (
              <div key={b.category} className="flex items-baseline justify-between gap-2 text-sm">
                <span className="text-ink truncate min-w-0">{translateCategoryName(t, b.category)}</span>
                <span className="font-tabular text-xs text-clay-dark shrink-0">
                  {formatMoney(b.spent, state.settings.currency)} / {formatMoney(b.allowance, state.settings.currency)}
                </span>
              </div>
            ))}
          </div>
          <p className="text-[11px] text-ink-softer mt-2 leading-relaxed">{t.dashboard.overWeeklyHint}</p>
        </div>
      )}

      {/* Primary actions — one tap straight to the amount field, already scoped to expense or
          income, instead of a single button that then makes you pick the type inside the modal. */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <button
          onClick={() => setShowAdd('expense')}
          className="min-h-[52px] inline-flex items-center justify-center gap-2 bg-clay text-white px-5 rounded-lg font-medium text-sm hover:bg-clay-dark transition-colors"
        >
          <Minus size={17} strokeWidth={2.25} />
          {t.transactions.expense}
        </button>
        <button
          onClick={() => setShowAdd('income')}
          className="min-h-[52px] inline-flex items-center justify-center gap-2 bg-sage text-white px-5 rounded-lg font-medium text-sm hover:bg-sage-dark transition-colors"
        >
          <Plus size={17} strokeWidth={2.25} />
          {t.transactions.income}
        </button>
      </div>

      <div className="flex flex-col gap-4 lg:gap-6">
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

        <BudgetVsActualCard state={state} />
      </div>

      {showAdd && (
        <AddTransactionModal
          onClose={() => setShowAdd(false)}
          onSave={addTransaction}
          initialType={showAdd}
          categories={state.categories}
          onAddCategory={addCategory}
        />
      )}
    </div>
  )
}
