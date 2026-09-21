import { useEffect } from 'react'
import { X } from 'lucide-react'
import { AppState } from '../types'
import { formatMoney, filterByRange, groupByCategory, totals, parseLocalDate } from '../lib/utils'
import { CategoryIconGlyph, iconForCategory, translateCategoryName } from '../lib/categoryIcons'
import { showTelegramBackButton } from '../lib/telegram'
import { useI18n } from '../lib/i18n'

/** Drill-in from a Calendar month card: what was actually spent that month, broken down by
 *  category and listed transaction by transaction — the Calendar's own cards only show the
 *  *planned* commitment (budgets/goals/dates), not what was actually logged. */
export default function MonthSpendingModal({ state, monthStart, onClose }: { state: AppState; monthStart: Date; onClose: () => void }) {
  const { t, locale } = useI18n()
  useEffect(() => showTelegramBackButton(onClose), [onClose])

  // Not `periodRange('month', monthStart)` — that helper anchors "to" at the anchor date
  // itself (built for "this month so far, as of today"), which would cut the range off at the
  // 1st when monthStart is a calendar month's first day. This needs the whole month instead.
  const from = new Date(monthStart.getFullYear(), monthStart.getMonth(), 1, 0, 0, 0, 0)
  const to = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0, 23, 59, 59, 999)
  const monthTx = filterByRange(state.transactions, from, to)
  const { income, expense } = totals(monthTx)
  const byCategory = groupByCategory(monthTx).sort((a, b) => b.value - a.value)
  const currency = state.settings.currency
  const monthLabel = monthStart.toLocaleDateString(locale, { month: 'long', year: 'numeric' })

  const sorted = [...monthTx].sort((a, b) => parseLocalDate(b.date).getTime() - parseLocalDate(a.date).getTime())

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-[2px] px-0 sm:px-4" onClick={onClose}>
      <div
        className="bg-paper-card w-full sm:max-w-md sm:rounded-lg rounded-t-lg border border-paper-line max-h-[90vh] overflow-y-auto pb-[env(safe-area-inset-bottom)] sm:pb-0"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-paper-line">
          <h3 className="font-display font-semibold text-lg capitalize">{monthLabel}</h3>
          <button onClick={onClose} aria-label={t.common.cancel} className="-mr-2 flex h-11 w-11 items-center justify-center text-ink-softer hover:text-ink">
            <X size={18} />
          </button>
        </div>

        <div className="px-5 py-5 flex flex-col gap-5">
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg bg-paper border border-paper-line p-3">
              <p className="text-[11px] text-ink-softer mb-1">{t.dashboard.incomeLabel}</p>
              <p className="font-tabular font-semibold text-base text-sage-dark truncate">{formatMoney(income, currency)}</p>
            </div>
            <div className="rounded-lg bg-paper border border-paper-line p-3">
              <p className="text-[11px] text-ink-softer mb-1">{t.dashboard.spentLabel}</p>
              <p className="font-tabular font-semibold text-base text-clay-dark truncate">{formatMoney(expense, currency)}</p>
            </div>
          </div>

          <div>
            <h4 className="text-xs font-medium text-ink-softer mb-2">{t.calendar.spendingByCategory}</h4>
            {byCategory.length === 0 ? (
              <p className="text-sm text-ink-softer">{t.calendar.noSpendingThisMonth}</p>
            ) : (
              <div className="flex flex-col divide-y divide-paper-line">
                {byCategory.map((c) => (
                  <div key={c.category} className="flex items-center gap-2.5 py-2.5">
                    <span className="w-7 h-7 rounded-full bg-paper flex items-center justify-center shrink-0">
                      <CategoryIconGlyph icon={iconForCategory(state.categories, c.category)} size={13} className="text-ink-softer" />
                    </span>
                    <span className="flex-1 text-sm text-ink truncate min-w-0">{translateCategoryName(t, c.category)}</span>
                    <span className="font-tabular text-sm font-medium text-ink shrink-0">{formatMoney(c.value, currency)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <h4 className="text-xs font-medium text-ink-softer mb-2">{t.calendar.allTransactionsThisMonth}</h4>
            {sorted.length === 0 ? (
              <p className="text-sm text-ink-softer">{t.calendar.noSpendingThisMonth}</p>
            ) : (
              <div className="flex flex-col divide-y divide-paper-line">
                {sorted.map((tx) => (
                  <div key={tx.id} className="flex items-center justify-between gap-2 py-2.5">
                    <div className="min-w-0">
                      <p className="text-sm text-ink truncate">{tx.note || translateCategoryName(t, tx.category)}</p>
                      <p className="text-xs text-ink-softer">
                        {translateCategoryName(t, tx.category)} ·{' '}
                        {parseLocalDate(tx.date).toLocaleDateString(locale, { month: 'short', day: 'numeric' })}
                      </p>
                    </div>
                    <span
                      className={`font-tabular text-sm font-medium shrink-0 ${tx.type === 'income' ? 'text-sage-dark' : 'text-ink'}`}
                    >
                      {tx.type === 'income' ? '+' : '-'}
                      {formatMoney(tx.amount, currency)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
