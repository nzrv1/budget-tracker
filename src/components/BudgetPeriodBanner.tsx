import { useState } from 'react'
import { PiggyBank, AlertTriangle, Wallet, X } from 'lucide-react'
import { AppState } from '../types'
import { formatMoney } from '../lib/utils'
import { BudgetPeriodReview } from '../lib/budgetPeriods'
import { translateCategoryName } from '../lib/categoryIcons'
import { Card } from './shared'
import { useT } from '../lib/i18n'

/** One "here's how that budget period went" card — shown on the Dashboard once per budget
 * whose period (week/month/...) has just fully closed out, until it's reviewed. Surfaces the
 * final spent/limit for that period and offers the matching next step: a surplus can be moved
 * into a goal or important date's savings (a real transaction, via the same allocate*
 * functions the payday banner uses); an overspend can be absorbed by shrinking the next
 * period's limit by the same amount. See lib/budgetPeriods.ts for how these are detected. */
export default function BudgetPeriodBanner({
  state,
  review,
  onMoveToGoal,
  onMoveToImportantDate,
  onReduceNextPeriod,
  onDismiss,
}: {
  state: AppState
  review: BudgetPeriodReview
  onMoveToGoal: (review: BudgetPeriodReview, goalId: string) => void
  onMoveToImportantDate: (review: BudgetPeriodReview, dateId: string) => void
  onReduceNextPeriod: (review: BudgetPeriodReview) => void
  onDismiss: (review: BudgetPeriodReview) => void
}) {
  const t = useT()
  const [destination, setDestination] = useState('')

  const currency = state.settings.currency
  const categoryName = translateCategoryName(t, review.category)
  const periodWord = t.budgetReview.periodWord[review.period]
  const isSurplus = review.remaining > 0
  const isOverspent = review.remaining < 0

  const goalOptions = state.goals.map((g) => ({ kind: 'goal' as const, id: g.id, label: g.name }))
  const dateOptions = state.importantDates
    .filter((d) => d.targetAmount && d.targetAmount > 0)
    .map((d) => ({ kind: 'importantDate' as const, id: d.id, label: d.name }))
  const hasTargets = goalOptions.length > 0 || dateOptions.length > 0

  function handleMove() {
    if (!destination) return
    const [kind, id] = destination.split(':')
    if (kind === 'goal') onMoveToGoal(review, id)
    else if (kind === 'importantDate') onMoveToImportantDate(review, id)
  }

  const Icon = isOverspent ? AlertTriangle : isSurplus ? PiggyBank : Wallet
  const toneClasses = isOverspent
    ? 'border-clay/50 bg-clay-light/30'
    : isSurplus
    ? 'border-gold/50 bg-gold-light/30'
    : 'border-paper-line bg-paper-card'
  const iconToneClasses = isOverspent ? 'bg-clay-light text-clay-dark' : isSurplus ? 'bg-gold-light text-gold-dark' : 'bg-paper text-ink-softer'

  return (
    <Card className={`p-4 sm:p-5 mb-4 sm:mb-6 ${toneClasses}`}>
      <div className="flex items-start gap-3">
        <span className={`shrink-0 w-9 h-9 rounded-full flex items-center justify-center ${iconToneClasses}`}>
          <Icon size={17} strokeWidth={1.75} />
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-ink">
            {isOverspent
              ? t.budgetReview.overspentTitle(categoryName, periodWord)
              : isSurplus
              ? t.budgetReview.surplusTitle(categoryName, periodWord)
              : t.budgetReview.exactTitle(categoryName, periodWord)}
          </p>
          <p className="text-sm text-ink-softer mt-1 leading-relaxed">
            {isOverspent
              ? t.budgetReview.overspentMessage(formatMoney(review.spent, currency), formatMoney(review.limit, currency))
              : isSurplus
              ? t.budgetReview.surplusMessage(formatMoney(review.spent, currency), formatMoney(review.limit, currency))
              : t.budgetReview.exactMessage}
          </p>

          {(isSurplus || isOverspent) && (
            <p className={`font-tabular font-semibold text-lg mt-2 ${isOverspent ? 'text-clay-dark' : 'text-sage-dark'}`}>
              {isOverspent
                ? t.budgetReview.overspentAmount(formatMoney(-review.remaining, currency))
                : t.budgetReview.surplusAmount(formatMoney(review.remaining, currency))}
            </p>
          )}

          {isSurplus && hasTargets && (
            <div className="flex flex-col sm:flex-row gap-2 mt-3.5">
              <select
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                className="flex-1 px-3 py-2 border border-paper-line rounded text-sm bg-paper-card focus:border-sage outline-none"
              >
                <option value="">{t.budgetReview.choosePlaceholder}</option>
                {goalOptions.length > 0 && (
                  <optgroup label={t.budgetReview.goalsGroupLabel}>
                    {goalOptions.map((o) => (
                      <option key={`goal:${o.id}`} value={`goal:${o.id}`}>
                        {o.label}
                      </option>
                    ))}
                  </optgroup>
                )}
                {dateOptions.length > 0 && (
                  <optgroup label={t.budgetReview.datesGroupLabel}>
                    {dateOptions.map((o) => (
                      <option key={`importantDate:${o.id}`} value={`importantDate:${o.id}`}>
                        {o.label}
                      </option>
                    ))}
                  </optgroup>
                )}
              </select>
              <button
                onClick={handleMove}
                disabled={!destination}
                className="inline-flex items-center justify-center gap-1.5 bg-ink text-paper px-3.5 py-2 rounded text-sm font-medium hover:bg-ink-light transition-colors disabled:opacity-40 disabled:pointer-events-none shrink-0"
              >
                <PiggyBank size={14} />
                {t.budgetReview.moveButton}
              </button>
            </div>
          )}

          {isSurplus && !hasTargets && <p className="text-xs text-ink-softer mt-3">{t.budgetReview.noTargets}</p>}

          <div className="flex gap-2 mt-3.5">
            {isOverspent && (
              <button
                onClick={() => onReduceNextPeriod(review)}
                className="inline-flex items-center gap-1.5 bg-ink text-paper px-3.5 py-2 rounded text-sm font-medium hover:bg-ink-light transition-colors"
              >
                {t.budgetReview.reduceButton(formatMoney(-review.remaining, currency))}
              </button>
            )}
            <button
              onClick={() => onDismiss(review)}
              className="px-3.5 py-2 rounded text-sm font-medium text-ink-softer hover:bg-paper-card transition-colors"
            >
              {!isSurplus && !isOverspent ? t.budgetReview.gotIt : t.budgetReview.skipButton}
            </button>
          </div>
        </div>
        <button
          onClick={() => onDismiss(review)}
          aria-label={t.budgetReview.dismissAria}
          className="-m-1 flex h-11 w-11 items-center justify-center text-ink-softer hover:text-ink shrink-0"
        >
          <X size={16} />
        </button>
      </div>
    </Card>
  )
}
