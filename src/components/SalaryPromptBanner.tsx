import { useState } from 'react'
import { Check, PiggyBank, X } from 'lucide-react'
import { AppState } from '../types'
import { formatMoney } from '../lib/utils'
import { planForMonth, startOfMonth, PaydaySource } from '../lib/planning'
import { Card, ProgressBar } from './shared'

/** Shown on the Dashboard from payday onward, suggesting to move this month's planned
 * savings into goals and important dates in one tap. Each item can be unchecked to leave
 * it out of this particular allocation. */
export default function SalaryPromptBanner({
  state,
  dueSources,
  onApply,
  onDismiss,
}: {
  state: AppState
  dueSources: PaydaySource[]
  onApply: (excludeKeys?: string[]) => void
  onDismiss: () => void
}) {
  const plan = planForMonth(state, startOfMonth(new Date()))
  const items = [...plan.goalItems, ...plan.dateItems]
  const currency = state.settings.currency
  const salary = state.settings.monthlyIncome

  const [excluded, setExcluded] = useState<Set<string>>(new Set())

  if (items.length === 0) return null

  function itemKey(it: (typeof items)[number]) {
    return `${it.kind}:${it.id}`
  }

  function toggle(key: string) {
    setExcluded((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const included = items.filter((it) => !excluded.has(itemKey(it)))
  const total = included.reduce((sum, it) => sum + it.amount, 0)
  const pct = salary > 0 ? (total / salary) * 100 : null

  const paydayLabel =
    dueSources.length === 0
      ? 'Payday'
      : dueSources.length === 1
      ? dueSources[0].label
      : dueSources.map((s) => s.label).join(' + ')

  return (
    <Card className="p-5 mb-6 border-gold/50 bg-gold-light/30">
      <div className="flex items-start gap-3">
        <span className="shrink-0 w-9 h-9 rounded-full bg-gold-light text-gold-dark flex items-center justify-center">
          <PiggyBank size={17} strokeWidth={1.75} />
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-ink">Payday — set money aside?</p>
          <p className="text-sm text-ink-softer mt-1 leading-relaxed">
            {paydayLabel} just landed. Here's what to set aside this month — untick anything you'd rather skip:
          </p>

          <div className="mt-3 mb-1">
            <div className="flex items-baseline justify-between mb-1.5 gap-2">
              <span className="font-tabular font-semibold text-lg text-ink">{formatMoney(total, currency)}</span>
              {pct !== null && (
                <span className="text-xs text-ink-softer text-right">
                  of {formatMoney(salary, currency)} salary ·{' '}
                  <span className={`font-tabular font-semibold ${pct > 100 ? 'text-clay-dark' : 'text-sage-dark'}`}>
                    {pct.toFixed(1)}%
                  </span>
                </span>
              )}
            </div>
            {pct !== null && (
              <ProgressBar ratio={Math.min(pct / 100, 1)} tone={pct > 100 ? 'clay' : pct >= 50 ? 'gold' : 'sage'} />
            )}
          </div>

          <ul className="mt-3 flex flex-col gap-1.5">
            {items.map((it) => {
              const key = itemKey(it)
              const isExcluded = excluded.has(key)
              return (
                <li key={key}>
                  <button
                    type="button"
                    onClick={() => toggle(key)}
                    className="w-full flex items-center justify-between gap-2 text-xs group"
                  >
                    <span className="flex items-center gap-2 min-w-0">
                      <span
                        className={`shrink-0 w-4 h-4 rounded flex items-center justify-center border transition-colors ${
                          isExcluded
                            ? 'border-paper-line bg-paper-card'
                            : 'border-sage bg-sage text-white'
                        }`}
                      >
                        {!isExcluded && <Check size={11} strokeWidth={3} />}
                      </span>
                      <span className={`truncate ${isExcluded ? 'text-ink-softer/50 line-through' : 'text-ink-softer'}`}>
                        {it.label}
                      </span>
                    </span>
                    <span
                      className={`font-tabular shrink-0 ml-2 ${
                        isExcluded ? 'text-ink-softer/50 line-through' : 'text-ink-softer'
                      }`}
                    >
                      {formatMoney(it.amount, currency)}
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>

          <div className="flex gap-2 mt-3.5">
            <button
              onClick={() => onApply(Array.from(excluded))}
              disabled={included.length === 0}
              className="inline-flex items-center gap-1.5 bg-ink text-paper px-3.5 py-2 rounded text-sm font-medium hover:bg-ink-light transition-colors disabled:opacity-40 disabled:pointer-events-none"
            >
              <PiggyBank size={14} />
              Set it aside
            </button>
            <button
              onClick={onDismiss}
              className="px-3.5 py-2 rounded text-sm font-medium text-ink-softer hover:bg-paper-card transition-colors"
            >
              Not now
            </button>
          </div>
        </div>
        <button onClick={onDismiss} aria-label="Dismiss" className="text-ink-softer hover:text-ink shrink-0">
          <X size={16} />
        </button>
      </div>
    </Card>
  )
}
