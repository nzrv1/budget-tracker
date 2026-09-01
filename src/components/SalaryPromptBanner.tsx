import { PiggyBank, X } from 'lucide-react'
import { AppState } from '../types'
import { formatMoney } from '../lib/utils'
import { planForMonth, startOfMonth } from '../lib/planning'
import { Card } from './shared'

/** Shown on the Dashboard from payday onward, suggesting to move this month's planned
 * savings into goals and important dates in one tap. */
export default function SalaryPromptBanner({
  state,
  onApply,
  onDismiss,
}: {
  state: AppState
  onApply: () => void
  onDismiss: () => void
}) {
  const plan = planForMonth(state, startOfMonth(new Date()))
  const items = [...plan.goalItems, ...plan.dateItems]
  const total = plan.goalsTotal + plan.datesTotal
  const currency = state.settings.currency

  if (items.length === 0) return null

  return (
    <Card className="p-5 mb-6 border-gold/50 bg-gold-light/30">
      <div className="flex items-start gap-3">
        <span className="shrink-0 w-9 h-9 rounded-full bg-gold-light text-gold-dark flex items-center justify-center">
          <PiggyBank size={17} strokeWidth={1.75} />
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-ink">Payday — set money aside?</p>
          <p className="text-sm text-ink-softer mt-1 leading-relaxed">
            Your basic salary just landed. Move {formatMoney(total, currency)} toward your goals and important dates
            this month:
          </p>
          <ul className="mt-2.5 flex flex-col gap-1">
            {items.map((it) => (
              <li key={it.id} className="flex items-center justify-between text-xs text-ink-softer">
                <span className="truncate">{it.label}</span>
                <span className="font-tabular shrink-0 ml-2">{formatMoney(it.amount, currency)}</span>
              </li>
            ))}
          </ul>
          <div className="flex gap-2 mt-3.5">
            <button
              onClick={onApply}
              className="inline-flex items-center gap-1.5 bg-ink text-paper px-3.5 py-2 rounded text-sm font-medium hover:bg-ink-light transition-colors"
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
