import { useState } from 'react'
import { AppState } from '../types'
import { formatMoney, periodRange, filterByRange } from '../lib/utils'
import { Card, EmptyState } from './shared'
import { translateCategoryName } from '../lib/categoryIcons'
import { budgetDailyRate } from '../lib/planning'
import { useT } from '../lib/i18n'
import { Period, periodLabels } from './ReportsView'

/** "Budget vs. actual" — every budget viewed on a day/week/month/year picker of its own,
 *  independent of any other period toggle on the Dashboard. Lets you set a budget on one
 *  cadence (say, monthly) and keep an eye on it on a different one (say, weekly). Lives on the
 *  Dashboard rather than Reports so it's visible on the screen people actually open day to day. */
export default function BudgetVsActualCard({ state }: { state: AppState }) {
  const t = useT()
  const PERIOD_LABEL = periodLabels(t)
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
    <Card className="p-4 sm:p-5">
      <h3 className="font-display font-semibold text-base mb-1">{t.reports.budgetVsActual}</h3>
      {budgetComparison.length === 0 ? (
        <EmptyState text={t.reports.setBudgetsToCompare} />
      ) : (
        <>
          <p className="text-xs text-ink-softer mb-3">{t.reports.budgetVsActualHint}</p>
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
                      className={`h-full rounded-full ${ratio > 1 ? 'bg-clay' : ratio >= 0.75 ? 'bg-gold' : 'bg-sage'}`}
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
  )
}
