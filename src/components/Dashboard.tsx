import { useState } from 'react'
import { Plus, TrendingUp, TrendingDown, PiggyBank, Wallet2, ArrowRight, CheckCircle2, AlertTriangle } from 'lucide-react'
import { AppState, Transaction, Insight, CategoryDef } from '../types'
import { formatMoney, periodRange, filterByRange, totals } from '../lib/utils'
import { Card, ProgressBar, budgetTone } from './shared'
import { CategoryIconGlyph, iconForCategory } from '../lib/categoryIcons'
import AddTransactionModal from './AddTransactionModal'
import SalaryPromptBanner from './SalaryPromptBanner'
import { duePaydaySources, planForMonth, startOfMonth } from '../lib/planning'
import { ViewKey } from '../App'

export default function Dashboard({
  state,
  insights,
  addTransaction,
  addCategory,
  setView,
  applyAutoAllocations,
  dismissSalaryPrompt,
}: {
  state: AppState
  insights: Insight[]
  addTransaction: (t: Omit<Transaction, 'id'>) => void
  addCategory: (def: CategoryDef) => void
  setView: (v: ViewKey) => void
  applyAutoAllocations: (excludeKeys?: string[]) => void
  dismissSalaryPrompt: () => void
}) {
  const [showAdd, setShowAdd] = useState(false)
  const [period, setPeriod] = useState<'month' | 'year'>('month')

  const today0 = new Date()

  // Income baked into Settings (basic salary + any extra income sources) counts toward
  // "income" even before it's logged as a transaction — on top of whatever's actually
  // been logged, with no de-duplication between the two.
  const settingsMonthlyIncome = state.settings.monthlyIncome + state.incomeSources.reduce((s, src) => s + src.amount, 0)

  // Always-current-calendar-month figures, independent of the period toggle above — used
  // for the budget health card and the savings goal card, which are inherently monthly.
  const currentMonthRange = periodRange('month', today0)
  const currentMonthTx = filterByRange(state.transactions, currentMonthRange.from, currentMonthRange.to)
  const currentMonthLogged = totals(currentMonthTx)
  const currentMonthIncome = settingsMonthlyIncome + currentMonthLogged.income
  const currentMonthExpense = currentMonthLogged.expense
  const currentMonthSaved = currentMonthIncome - currentMonthExpense

  // Figures for the stat row, which follow the "This Month" / "This Year" toggle.
  const { from, to } = periodRange(period, today0)
  const periodTx = filterByRange(state.transactions, from, to)
  const periodLogged = totals(periodTx)
  // How many salary payments fall inside the selected period: 1 for "This Month",
  // or the number of months elapsed so far this year for "This Year".
  const monthsInPeriod = period === 'month' ? 1 : today0.getMonth() + 1
  const income = settingsMonthlyIncome * monthsInPeriod + periodLogged.income
  const expense = periodLogged.expense
  const balance = totals(state.transactions).net
  const saved = income - expense
  const periodLabel = period === 'month' ? 'this month' : 'this year'

  const monthlyBudgets = state.budgets.filter((b) => b.period === 'month')
  const totalBudget = monthlyBudgets.reduce((s, b) => s + b.limit, 0)
  const budgetSpent = monthlyBudgets.reduce((s, b) => {
    const spent = currentMonthTx
      .filter((t) => t.type === 'expense' && t.category === b.category)
      .reduce((acc, t) => acc + t.amount, 0)
    return s + spent
  }, 0)
  const budgetRatio = totalBudget > 0 ? budgetSpent / totalBudget : 0

  const savingsGoalTotal = planForMonth(state, startOfMonth(today0)).goalsTotal
  const savingsGoalRatio = savingsGoalTotal > 0 ? currentMonthSaved / savingsGoalTotal : 0
  const savingsGoalPercent = Math.max(0, Math.round(savingsGoalRatio * 100))

  const recent = [...state.transactions]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 5)

  const topInsights = insights.slice(0, 3)

  const today = new Date()
  const dayLabel = today.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })

  const duePaydays = duePaydaySources(state.settings.salaryDay, state.incomeSources, state.settings.handledPaydays, today)

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

      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
        <div>
          <p className="text-sm text-ink-softer mb-1">{dayLabel}</p>
          <h1 className="font-display font-semibold text-2xl sm:text-3xl text-ink">Your budget, at a glance</h1>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="inline-flex items-center gap-2 bg-ink text-paper px-4 py-2.5 rounded font-medium text-sm hover:bg-ink-light transition-colors shrink-0"
        >
          <Plus size={16} />
          Add transaction
        </button>
      </div>

      <div className="flex justify-end mb-4 -mt-4">
        <div className="inline-flex rounded-lg border border-paper-line overflow-hidden">
          <button
            onClick={() => setPeriod('month')}
            className={`px-3.5 py-2 text-sm font-medium transition-colors ${
              period === 'month' ? 'bg-ink text-paper' : 'text-ink-softer hover:bg-paper-card'
            }`}
          >
            This Month
          </button>
          <button
            onClick={() => setPeriod('year')}
            className={`px-3.5 py-2 text-sm font-medium transition-colors ${
              period === 'year' ? 'bg-ink text-paper' : 'text-ink-softer hover:bg-paper-card'
            }`}
          >
            This Year
          </button>
        </div>
      </div>

      {/* Stat row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
        <StatCard
          label="Total balance"
          value={formatMoney(balance, state.settings.currency)}
          icon={Wallet2}
          tone="ink"
        />
        <StatCard
          label={`Income ${periodLabel}`}
          value={formatMoney(income, state.settings.currency)}
          icon={TrendingUp}
          tone="sage"
        />
        <StatCard
          label={`Spent ${periodLabel}`}
          value={formatMoney(expense, state.settings.currency)}
          icon={TrendingDown}
          tone="clay"
        />
        <StatCard
          label={`Saved ${periodLabel}`}
          value={formatMoney(saved, state.settings.currency)}
          icon={PiggyBank}
          tone="gold"
        />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Budget health + recent transactions */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          <Card className="p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-display font-semibold text-base">Monthly budget health</h3>
              <span className="text-sm font-tabular text-ink-softer">
                {formatMoney(budgetSpent, state.settings.currency)} / {formatMoney(totalBudget, state.settings.currency)}
              </span>
            </div>
            <ProgressBar ratio={budgetRatio} tone={budgetTone(budgetRatio)} />
            <p className="text-sm text-ink-softer mt-3">
              {monthlyBudgets.length === 0
                ? 'No monthly budgets set yet — set some in Budgets to track this.'
                : budgetRatio >= 1
                ? 'You have gone over your combined monthly budget.'
                : budgetRatio >= 0.75
                ? "You're pacing close to your monthly limit — worth watching the next few weeks."
                : "You're comfortably within your monthly budget."}
            </p>
          </Card>

          <Card className="p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-display font-semibold text-base">Monthly savings goal</h3>
              {savingsGoalTotal > 0 && (
                <span className="text-sm font-tabular text-ink-softer">
                  {formatMoney(currentMonthSaved, state.settings.currency)} / {formatMoney(savingsGoalTotal, state.settings.currency)}
                </span>
              )}
            </div>
            {savingsGoalTotal > 0 ? (
              <>
                <ProgressBar ratio={savingsGoalRatio} tone={savingsGoalRatio >= 1 ? 'sage' : savingsGoalRatio >= 0.5 ? 'gold' : 'clay'} />
                <p className="text-sm text-ink-softer mt-3">
                  {savingsGoalPercent}% of this month's savings goal — based on what your active Goals need this month to
                  stay on track.
                </p>
              </>
            ) : (
              <p className="text-sm text-ink-softer">
                No monthly savings goal right now — add a Goal with a target date to see progress here.
              </p>
            )}
          </Card>

          <Card className="p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display font-semibold text-base">Recent transactions</h3>
              <button
                onClick={() => setView('transactions')}
                className="text-sm text-ink-softer hover:text-ink flex items-center gap-1"
              >
                View all <ArrowRight size={14} />
              </button>
            </div>
            {recent.length === 0 ? (
              <EmptyState text="No transactions yet — add your first one to get started." />
            ) : (
              <div className="flex flex-col divide-y divide-paper-line">
                {recent.map((t) => (
                  <div key={t.id} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="w-8 h-8 rounded-full bg-paper flex items-center justify-center shrink-0">
                        <CategoryIconGlyph icon={iconForCategory(state.categories, t.category)} size={14} className="text-ink-softer" />
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-ink truncate">{t.note || t.category}</p>
                        <p className="text-xs text-ink-softer">
                          {t.category} · {new Date(t.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                        </p>
                      </div>
                    </div>
                    <span
                      className={`font-tabular text-sm font-medium shrink-0 ml-3 ${
                        t.type === 'income' ? 'text-sage-dark' : 'text-ink'
                      }`}
                    >
                      {t.type === 'income' ? '+' : '-'}
                      {formatMoney(t.amount, state.settings.currency)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* Insights feed */}
        <div>
          <Card className="p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display font-semibold text-base">Smart insights</h3>
              <button
                onClick={() => setView('notifications')}
                className="text-sm text-ink-softer hover:text-ink flex items-center gap-1"
              >
                All <ArrowRight size={14} />
              </button>
            </div>
            {topInsights.length === 0 ? (
              <EmptyState text="Add a few transactions and goals — tips will show up here." />
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

function StatCard({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string
  value: string
  icon: React.ElementType
  tone: 'ink' | 'sage' | 'clay' | 'gold'
}) {
  const toneStyles: Record<string, string> = {
    ink: 'text-ink bg-ink/5',
    sage: 'text-sage-dark bg-sage-light',
    clay: 'text-clay-dark bg-clay-light',
    gold: 'text-gold-dark bg-gold-light',
  }
  return (
    <Card className="p-4">
      <div className={`inline-flex items-center justify-center w-8 h-8 rounded ${toneStyles[tone]} mb-3`}>
        <Icon size={16} strokeWidth={1.75} />
      </div>
      <p className="text-xs text-ink-softer mb-1">{label}</p>
      <p className="font-tabular font-semibold text-lg sm:text-xl text-ink truncate">{value}</p>
    </Card>
  )
}

export function EmptyState({ text }: { text: string }) {
  return (
    <div className="text-center py-8">
      <p className="text-sm text-ink-softer">{text}</p>
    </div>
  )
}
