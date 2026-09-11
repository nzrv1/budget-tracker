import { useMemo, useState } from 'react'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts'

/** Chart ink taken from the live theme tokens rather than hardcoded hex, so axes and gridlines
 *  stay visible on the dark / cyber / red themes (they were fixed light-theme greys). Read on
 *  render — Reports re-renders when the theme changes. */
function themeColor(name: string, fallback: string): string {
  if (typeof window === 'undefined') return fallback
  const v = getComputedStyle(document.documentElement).getPropertyValue(`--color-${name}`).trim()
  return v ? `rgb(${v})` : fallback
}
import { AppState } from '../types'
import { formatMoney, periodRange, filterByRange, groupByCategory, totals, colorForCategory, settingsIncomeForPeriod } from '../lib/utils'
import { Card, SectionHeading } from './shared'
import { EmptyState } from './Dashboard'
import { translateCategoryName } from '../lib/categoryIcons'
import { budgetDailyRate } from '../lib/planning'
import { Dictionary, useT } from '../lib/i18n'

type Period = 'day' | 'week' | 'month' | 'year'

function periodLabels(t: Dictionary): Record<Period, string> {
  return { day: t.periods.day, week: t.periods.week, month: t.periods.month, year: t.periods.year }
}

export default function ReportsView({ state }: { state: AppState }) {
  const t = useT()
  const PERIOD_LABEL = periodLabels(t)
  const [period, setPeriod] = useState<Period>('month')

  const { from, to } = periodRange(period)
  const current = filterByRange(state.transactions, from, to)
  const loggedTotals = totals(current)
  // Same income model as Dashboard (see lib/utils.ts: settingsIncomeForPeriod) — Settings-based
  // salary/income sources, prorated to the selected period, on top of whatever's actually been
  // logged as an income transaction. Previously this screen counted logged transactions only,
  // which made "Income" here disagree with the Dashboard for the same period.
  const settingsIncome = settingsIncomeForPeriod(state.settings, state.incomeSources, period)
  const currentTotals = {
    income: settingsIncome + loggedTotals.income,
    expense: loggedTotals.expense,
    net: settingsIncome + loggedTotals.income - loggedTotals.expense,
  }

  // previous period for comparison
  const prevAnchor = new Date(from)
  if (period === 'day') prevAnchor.setDate(prevAnchor.getDate() - 1)
  if (period === 'week') prevAnchor.setDate(prevAnchor.getDate() - 7)
  if (period === 'month') prevAnchor.setMonth(prevAnchor.getMonth() - 1)
  if (period === 'year') prevAnchor.setFullYear(prevAnchor.getFullYear() - 1)
  const prevRange = periodRange(period, prevAnchor)
  const prev = filterByRange(state.transactions, prevRange.from, prevRange.to)
  const prevTotals = totals(prev)

  // The legend only has room for a handful of rows, but the pie itself used to draw every
  // category regardless — past 6, later slices had no matching legend entry at all (you'd
  // see an unlabeled sliver with no way to tell what it was). Folding the rest into a single
  // "Other categories" slice keeps the two in sync and the chart still adds up to 100%.
  const categoryData = useMemo(() => {
    const sorted = groupByCategory(current).sort((a, b) => b.value - a.value)
    if (sorted.length <= 6) return sorted
    const top = sorted.slice(0, 6)
    const restTotal = sorted.slice(6).reduce((s, c) => s + c.value, 0)
    return [...top, { category: t.reports.otherCategories, value: restTotal }]
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current, t])

  const trendData = useMemo(() => buildTrend(state.transactions, period), [state.transactions, period])

  const expenseChange = prevTotals.expense > 0 ? ((currentTotals.expense - prevTotals.expense) / prevTotals.expense) * 100 : null

  // "Budget vs. actual" gets its own day/week/month/year picker, separate from the one above —
  // that top picker drives income/expenses/category/trend, and tying the budget card to it meant
  // you couldn't look at spending by category and re-scale a budget at the same time. This is
  // the point of the feature: set a budget on one cadence (say, monthly) and keep an eye on it
  // on a different one (say, weekly) without switching the rest of the screen.
  const [budgetPeriod, setBudgetPeriod] = useState<Period>('month')
  const budgetRange = periodRange(budgetPeriod)
  const budgetPeriodTx = filterByRange(state.transactions, budgetRange.from, budgetRange.to)
  const PERIOD_DAYS: Record<Period, number> = { day: 1, week: 7, month: 30.44, year: 365.25 }
  const budgetComparison = state.budgets.map((b) => {
    const spent = budgetPeriodTx
      .filter((tx) => tx.type === 'expense' && tx.category === b.category)
      .reduce((s, tx) => s + tx.amount, 0)
    // A budget's own daily rate times the length of the period being viewed. When the viewing
    // period matches the budget's native period we show its exact limit (no 30.44/365.25
    // rounding drift).
    const limit = b.period === budgetPeriod ? b.limit : budgetDailyRate(b) * PERIOD_DAYS[budgetPeriod]
    return { category: b.category, spent, limit, nativePeriod: b.period }
  })

  return (
    <div>
      <SectionHeading eyebrow={t.reports.eyebrow} title={t.reports.title} />

      <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
        {(Object.keys(PERIOD_LABEL) as Period[]).map((p) => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={`px-4 py-2 rounded text-sm font-medium whitespace-nowrap transition-colors ${
              period === p ? 'bg-ink text-paper' : 'bg-paper-card border border-paper-line text-ink-softer hover:text-ink'
            }`}
          >
            {PERIOD_LABEL[p]}
          </button>
        ))}
      </div>

      <div className="grid sm:grid-cols-3 gap-3 mb-6">
        <Card className="p-4">
          <p className="text-xs text-ink-softer mb-1">{t.reports.income}</p>
          <p className="font-tabular font-semibold text-xl text-sage-dark">{formatMoney(currentTotals.income, state.settings.currency)}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-ink-softer mb-1">{t.reports.expenses}</p>
          <p className="font-tabular font-semibold text-xl text-clay-dark">{formatMoney(currentTotals.expense, state.settings.currency)}</p>
          {expenseChange !== null && (
            <p className={`text-xs mt-1 ${expenseChange <= 0 ? 'text-sage-dark' : 'text-clay-dark'}`}>
              {t.reports.vsPrevious(`${expenseChange <= 0 ? '' : '+'}${expenseChange.toFixed(0)}`, PERIOD_LABEL[period].toLowerCase())}
            </p>
          )}
        </Card>
        <Card className="p-4">
          <p className="text-xs text-ink-softer mb-1">{t.reports.netSaved}</p>
          <p className="font-tabular font-semibold text-xl text-ink">{formatMoney(currentTotals.net, state.settings.currency)}</p>
        </Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-5 mb-6">
        <Card className="p-4 sm:p-5">
          <h3 className="font-display font-semibold text-base mb-4">{t.reports.spendingByCategory}</h3>
          {categoryData.length === 0 ? (
            <EmptyState text={t.reports.noExpensesThisPeriod} />
          ) : (
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="w-full sm:w-1/2 shrink-0">
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie data={categoryData} dataKey="value" nameKey="category" innerRadius={45} outerRadius={72} paddingAngle={2}>
                      {categoryData.map((entry) => (
                        <Cell key={entry.category} fill={colorForCategory(entry.category)} stroke="none" />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v: number) => formatMoney(v, state.settings.currency)} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex-1 flex flex-col gap-2 text-sm min-w-0">
                {/* No slice(0, 6) here anymore — categoryData is already capped at 6 named
                    categories plus one "Other categories" bucket, so every pie slice has a
                    matching legend row. */}
                {categoryData.map((entry) => (
                  <div key={entry.category} className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: colorForCategory(entry.category) }} />
                    <span className="text-ink-softer truncate flex-1 min-w-0">{translateCategoryName(t, entry.category)}</span>
                    <span className="font-tabular text-ink shrink-0">{formatMoney(entry.value, state.settings.currency)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>

        <Card className="p-4 sm:p-5">
          <h3 className="font-display font-semibold text-base mb-4">{t.reports.trendOverTime}</h3>
          {trendData.every((d) => d.value === 0) ? (
            <EmptyState text={t.reports.notEnoughTrendData} />
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" stroke={themeColor('paper-line', '#E2E7E3')} vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: themeColor('ink-softer', '#3C5158') }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: themeColor('ink-softer', '#3C5158') }} axisLine={false} tickLine={false} width={40} />
                <Tooltip formatter={(v: number) => formatMoney(v, state.settings.currency)} />
                <Bar dataKey="value" fill={themeColor('sage', '#7C9885')} radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>
      </div>

      <Card className="p-5">
        <h3 className="font-display font-semibold text-base mb-1">{t.reports.budgetVsActual}</h3>
        {budgetComparison.length === 0 ? (
          <EmptyState text={t.reports.setBudgetsToCompare} />
        ) : (
          <>
            <p className="text-xs text-ink-softer mb-3">{t.reports.budgetVsActualHint}</p>
            {/* This picker is its own control, deliberately separate from the one at the top of
                the screen — it only re-scales the budgets below, it doesn't touch income /
                expenses / category / trend above. Lets you set a budget on one cadence (e.g.
                monthly) and watch it on another (e.g. weekly) independently of the rest of the
                report. */}
            <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
              {(Object.keys(PERIOD_LABEL) as Period[]).map((p) => (
                <button
                  key={p}
                  onClick={() => setBudgetPeriod(p)}
                  className={`px-3 py-1.5 rounded text-xs font-medium whitespace-nowrap transition-colors ${
                    budgetPeriod === p ? 'bg-ink text-paper' : 'bg-paper border border-paper-line text-ink-softer hover:text-ink'
                  }`}
                >
                  {PERIOD_LABEL[p]}
                </button>
              ))}
            </div>
            <div className="flex flex-col gap-3">
              {budgetComparison.map((b) => {
                const ratio = b.limit > 0 ? b.spent / b.limit : 0
                const delta = b.limit - b.spent
                return (
                  <div key={`${b.category}-${b.nativePeriod}`}>
                    <div className="flex items-baseline justify-between gap-2 text-sm mb-1">
                      <span className="text-ink truncate min-w-0">
                        {translateCategoryName(t, b.category)}{' '}
                        <span className="text-ink-softer text-xs">· {PERIOD_LABEL[b.nativePeriod]}</span>
                      </span>
                      <span className="font-tabular text-ink-softer text-xs shrink-0">
                        {formatMoney(b.spent, state.settings.currency)} / {formatMoney(b.limit, state.settings.currency)}
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-paper-line rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${ratio >= 1 ? 'bg-clay' : ratio >= 0.75 ? 'bg-gold' : 'bg-sage'}`}
                        style={{ width: `${Math.min(ratio * 100, 100)}%` }}
                      />
                    </div>
                    <p className={`text-xs mt-1 ${delta < 0 ? 'text-clay-dark' : 'text-ink-softer'}`}>
                      {delta < 0
                        ? t.reports.budgetOver(formatMoney(-delta, state.settings.currency))
                        : t.reports.budgetLeft(formatMoney(delta, state.settings.currency))}
                    </p>
                  </div>
                )
              })}
            </div>
          </>
        )}
      </Card>
    </div>
  )
}

function buildTrend(transactions: AppState['transactions'], period: Period) {
  // Build last N buckets of expense totals for the trend chart
  const buckets: { label: string; value: number }[] = []
  const now = new Date()

  if (period === 'day') {
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now)
      d.setDate(d.getDate() - i)
      const from = new Date(d.setHours(0, 0, 0, 0))
      const to = new Date(d.setHours(23, 59, 59, 999))
      const value = filterByRange(transactions, from, to).filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
      buckets.push({ label: from.toLocaleDateString(undefined, { weekday: 'short' }), value })
    }
  } else if (period === 'week') {
    for (let i = 5; i >= 0; i--) {
      const anchor = new Date(now)
      anchor.setDate(anchor.getDate() - i * 7)
      const { from, to } = periodRange('week', anchor)
      const value = filterByRange(transactions, from, to).filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
      buckets.push({ label: `W${6 - i}`, value })
    }
  } else if (period === 'month') {
    for (let i = 5; i >= 0; i--) {
      const anchor = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const { from, to } = periodRange('month', anchor)
      const value = filterByRange(transactions, from, to).filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
      buckets.push({ label: anchor.toLocaleDateString(undefined, { month: 'short' }), value })
    }
  } else {
    for (let i = 3; i >= 0; i--) {
      const anchor = new Date(now.getFullYear() - i, 0, 1)
      const { from, to } = periodRange('year', anchor)
      const value = filterByRange(transactions, from, to).filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
      buckets.push({ label: String(anchor.getFullYear()), value })
    }
  }
  return buckets
}
