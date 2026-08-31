import { useMemo, useState } from 'react'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts'
import { AppState } from '../types'
import { formatMoney, periodRange, filterByRange, groupByCategory, totals, colorForCategory } from '../lib/utils'
import { Card, SectionHeading } from './shared'
import { EmptyState } from './Dashboard'

type Period = 'day' | 'week' | 'month' | 'year'

const PERIOD_LABEL: Record<Period, string> = { day: 'Daily', week: 'Weekly', month: 'Monthly', year: 'Yearly' }

export default function ReportsView({ state }: { state: AppState }) {
  const [period, setPeriod] = useState<Period>('month')

  const { from, to } = periodRange(period)
  const current = filterByRange(state.transactions, from, to)
  const currentTotals = totals(current)

  // previous period for comparison
  const prevAnchor = new Date(from)
  if (period === 'day') prevAnchor.setDate(prevAnchor.getDate() - 1)
  if (period === 'week') prevAnchor.setDate(prevAnchor.getDate() - 7)
  if (period === 'month') prevAnchor.setMonth(prevAnchor.getMonth() - 1)
  if (period === 'year') prevAnchor.setFullYear(prevAnchor.getFullYear() - 1)
  const prevRange = periodRange(period, prevAnchor)
  const prev = filterByRange(state.transactions, prevRange.from, prevRange.to)
  const prevTotals = totals(prev)

  const categoryData = useMemo(() => groupByCategory(current).sort((a, b) => b.value - a.value), [current])

  const trendData = useMemo(() => buildTrend(state.transactions, period), [state.transactions, period])

  const expenseChange = prevTotals.expense > 0 ? ((currentTotals.expense - prevTotals.expense) / prevTotals.expense) * 100 : null

  const budgetComparison = state.budgets.map((b) => {
    const spent = current.filter((t) => t.type === 'expense' && t.category === b.category).reduce((s, t) => s + t.amount, 0)
    return { category: b.category, spent, limit: b.limit }
  })

  return (
    <div>
      <SectionHeading eyebrow="Where it goes" title="Reports" />

      <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
        {(Object.keys(PERIOD_LABEL) as Period[]).map((p) => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={`px-4 py-2 rounded text-sm font-medium whitespace-nowrap transition-colors ${
              period === p ? 'bg-ink text-paper' : 'bg-white border border-paper-line text-ink-softer hover:text-ink'
            }`}
          >
            {PERIOD_LABEL[p]}
          </button>
        ))}
      </div>

      <div className="grid sm:grid-cols-3 gap-3 mb-6">
        <Card className="p-4">
          <p className="text-xs text-ink-softer mb-1">Income</p>
          <p className="font-tabular font-semibold text-xl text-sage-dark">{formatMoney(currentTotals.income, state.settings.currency)}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-ink-softer mb-1">Expenses</p>
          <p className="font-tabular font-semibold text-xl text-clay-dark">{formatMoney(currentTotals.expense, state.settings.currency)}</p>
          {expenseChange !== null && (
            <p className={`text-xs mt-1 ${expenseChange <= 0 ? 'text-sage-dark' : 'text-clay-dark'}`}>
              {expenseChange <= 0 ? '' : '+'}
              {expenseChange.toFixed(0)}% vs previous {period}
            </p>
          )}
        </Card>
        <Card className="p-4">
          <p className="text-xs text-ink-softer mb-1">Net saved</p>
          <p className="font-tabular font-semibold text-xl text-ink">{formatMoney(currentTotals.net, state.settings.currency)}</p>
        </Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-5 mb-6">
        <Card className="p-5">
          <h3 className="font-display font-semibold text-base mb-4">Spending by category</h3>
          {categoryData.length === 0 ? (
            <EmptyState text="No expenses in this period yet." />
          ) : (
            <div className="flex items-center gap-4">
              <ResponsiveContainer width="55%" height={200}>
                <PieChart>
                  <Pie data={categoryData} dataKey="value" nameKey="category" innerRadius={50} outerRadius={80} paddingAngle={2}>
                    {categoryData.map((entry) => (
                      <Cell key={entry.category} fill={colorForCategory(entry.category)} stroke="none" />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: number) => formatMoney(v, state.settings.currency)} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex-1 flex flex-col gap-2 text-sm">
                {categoryData.slice(0, 6).map((entry) => (
                  <div key={entry.category} className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: colorForCategory(entry.category) }} />
                    <span className="text-ink-softer truncate flex-1">{entry.category}</span>
                    <span className="font-tabular text-ink">{formatMoney(entry.value, state.settings.currency)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>

        <Card className="p-5">
          <h3 className="font-display font-semibold text-base mb-4">Trend over time</h3>
          {trendData.every((d) => d.value === 0) ? (
            <EmptyState text="Not enough data yet to show a trend." />
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E7E3" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#3C5158' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#3C5158' }} axisLine={false} tickLine={false} width={40} />
                <Tooltip formatter={(v: number) => formatMoney(v, state.settings.currency)} />
                <Bar dataKey="value" fill="#7C9885" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>
      </div>

      <Card className="p-5">
        <h3 className="font-display font-semibold text-base mb-4">Budget vs. actual — {PERIOD_LABEL[period].toLowerCase()} view</h3>
        {budgetComparison.length === 0 ? (
          <EmptyState text="Set category budgets to see this comparison." />
        ) : (
          <div className="flex flex-col gap-3">
            {budgetComparison.map((b) => {
              const ratio = b.limit > 0 ? b.spent / b.limit : 0
              return (
                <div key={b.category}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-ink">{b.category}</span>
                    <span className="font-tabular text-ink-softer">
                      {formatMoney(b.spent, state.settings.currency)} / {formatMoney(b.limit, state.settings.currency)}
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-paper-line rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${ratio >= 1 ? 'bg-clay' : ratio >= 0.75 ? 'bg-gold' : 'bg-sage'}`}
                      style={{ width: `${Math.min(ratio * 100, 100)}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
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
