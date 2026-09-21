import { useState } from 'react'
import { AlertTriangle, Wallet, Target, CalendarDays, Check } from 'lucide-react'
import { AppState, Goal, ImportantDate } from '../types'
import { MonthDeficit, DeficitContributor, FixPlan, computeGoalFixPlans, computeImportantDateFixPlans } from '../lib/deficit'
import { formatMoney, parseLocalDate } from '../lib/utils'
import { Card } from './shared'
import { translateCategoryName } from '../lib/categoryIcons'
import { useI18n } from '../lib/i18n'

/** The "big window at the bottom" for the Calendar screen's structural-deficit warning — see
 *  lib/deficit.ts for the math. Lists every future month whose planned commitments outrun
 *  income; picking one shows what's contributing and, for every goal/important date (never a
 *  budget — those are obligatory here), three one-click fixes that each alone close that
 *  month's gap. */
export default function DeficitPanel({
  deficits,
  state,
  updateGoal,
  updateImportantDate,
  isDismissed,
  onDismiss,
  openMonthKey,
  setOpenMonthKey,
  panelRef,
}: {
  deficits: MonthDeficit[]
  state: AppState
  updateGoal: (id: string, patch: Partial<Goal>) => void
  updateImportantDate: (id: string, patch: Partial<ImportantDate>) => void
  isDismissed: (monthKey: string) => boolean
  onDismiss: (monthKey: string) => void
  openMonthKey: string | null
  setOpenMonthKey: (k: string | null) => void
  panelRef: React.RefObject<HTMLDivElement>
}) {
  const { t, locale } = useI18n()
  const [openContributor, setOpenContributor] = useState<string | null>(null)

  if (deficits.length === 0) return null

  return (
    <Card className="p-4 sm:p-5 mt-2" id="deficit-panel">
      <div ref={panelRef} />
      <div className="flex items-center gap-2 mb-1">
        <AlertTriangle size={16} className="text-clay-dark shrink-0" />
        <h3 className="font-display font-semibold text-base">{t.calendar.deficitPanelTitle}</h3>
      </div>
      <p className="text-xs text-ink-softer mb-4 leading-relaxed">{t.calendar.deficitPanelHint}</p>

      <div className="flex flex-col gap-2">
        {deficits.map((d) => {
          const open = openMonthKey === d.monthKey
          const dismissed = isDismissed(d.monthKey)
          const monthLabel = d.monthStart.toLocaleDateString(locale, { month: 'long', year: 'numeric' })
          return (
            <div key={d.monthKey} className="border border-paper-line rounded-lg overflow-hidden">
              <button
                type="button"
                onClick={() => setOpenMonthKey(open ? null : d.monthKey)}
                aria-expanded={open}
                className="w-full flex items-center justify-between gap-2 px-3 py-2.5 text-left hover:bg-paper transition-colors"
              >
                <span className="flex items-center gap-2 min-w-0">
                  <AlertTriangle size={14} className={`shrink-0 ${dismissed ? 'text-ink-softer' : 'text-clay-dark'}`} />
                  <span className="text-sm font-medium text-ink capitalize truncate">{monthLabel}</span>
                </span>
                <span className="font-tabular text-xs text-clay-dark shrink-0">
                  {t.calendar.deficitOverBy(formatMoney(d.deficit, state.settings.currency))}
                </span>
              </button>

              {open && (
                <div className="px-3 pb-3 pt-1 border-t border-paper-line">
                  <p className="text-xs text-ink-softer mb-2 mt-2">{t.calendar.deficitPickItemHint}</p>
                  <div className="flex flex-col gap-1">
                    {d.contributors.map((c) => {
                      const key = `${d.monthKey}-${c.kind}-${c.id}`
                      const cOpen = openContributor === key
                      const Icon = c.kind === 'budget' ? Wallet : c.kind === 'goal' ? Target : CalendarDays
                      return (
                        <div key={key}>
                          <button
                            type="button"
                            onClick={() => setOpenContributor(cOpen ? null : key)}
                            className="w-full flex items-center justify-between gap-2 px-2.5 py-2 rounded text-left hover:bg-paper transition-colors"
                          >
                            <span className="flex items-center gap-2 min-w-0 text-sm text-ink">
                              <Icon size={13} className="text-ink-softer shrink-0" />
                              <span className="truncate">{c.kind === 'budget' ? translateCategoryName(t, c.label) : c.label}</span>
                            </span>
                            <span className="font-tabular text-xs text-ink-softer shrink-0">
                              {formatMoney(c.amount, state.settings.currency)}
                            </span>
                          </button>

                          {cOpen && c.kind === 'budget' && (
                            <p className="text-xs text-ink-softer px-2.5 pb-2.5 leading-relaxed">
                              {t.calendar.deficitBudgetComment(formatMoney(d.deficit, state.settings.currency))}
                            </p>
                          )}

                          {cOpen && c.kind !== 'budget' && (
                            <FixOptions
                              deficit={d.deficit}
                              contributor={c}
                              state={state}
                              updateGoal={updateGoal}
                              updateImportantDate={updateImportantDate}
                              onApplied={() => setOpenContributor(null)}
                            />
                          )}
                        </div>
                      )
                    })}
                  </div>

                  {dismissed ? (
                    <p className="mt-3 text-xs text-ink-softer">{t.calendar.deficitDismissedHint}</p>
                  ) : (
                    <button
                      type="button"
                      onClick={() => onDismiss(d.monthKey)}
                      className="mt-3 text-xs font-medium text-ink-softer hover:text-ink inline-flex items-center gap-1"
                    >
                      <Check size={13} /> {t.calendar.deficitDismiss}
                    </button>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </Card>
  )
}

function FixOptions({
  deficit,
  contributor,
  state,
  updateGoal,
  updateImportantDate,
  onApplied,
}: {
  deficit: number
  contributor: DeficitContributor
  state: AppState
  updateGoal: (id: string, patch: Partial<Goal>) => void
  updateImportantDate: (id: string, patch: Partial<ImportantDate>) => void
  onApplied: () => void
}) {
  const { t, locale } = useI18n()
  const currency = state.settings.currency

  let plans: FixPlan[] = []
  if (contributor.kind === 'goal') {
    const goal = state.goals.find((g) => g.id === contributor.id)
    if (goal) plans = computeGoalFixPlans(goal, deficit)
  } else if (contributor.kind === 'importantDate') {
    const date = state.importantDates.find((dd) => dd.id === contributor.id)
    if (date) plans = computeImportantDateFixPlans(date, deficit)
  }

  function apply(plan: FixPlan) {
    if (contributor.kind === 'goal') updateGoal(contributor.id, plan.patch as Partial<Goal>)
    else if (contributor.kind === 'importantDate') updateImportantDate(contributor.id, plan.patch as Partial<ImportantDate>)
    onApplied()
  }

  function describe(plan: FixPlan): string {
    const dateLabel = plan.display.date ? parseLocalDate(plan.display.date).toLocaleDateString(locale, { month: 'long', year: 'numeric' }) : undefined
    const amountLabel = plan.display.amount != null ? formatMoney(plan.display.amount, currency) : undefined
    if (plan.kind === 'pushDate' && dateLabel) return t.calendar.deficitFixPushDate(dateLabel)
    if (plan.kind === 'lowerAmount' && amountLabel) return t.calendar.deficitFixLowerAmount(amountLabel)
    if (plan.kind === 'both' && dateLabel && amountLabel) return t.calendar.deficitFixBoth(dateLabel, amountLabel)
    return ''
  }

  return (
    <div className="flex flex-col gap-1.5 px-2.5 pb-2.5">
      {plans.map((plan) => {
        const partial = plan.remainingGap > 0.005
        return (
          <button
            key={plan.kind}
            type="button"
            onClick={() => apply(plan)}
            className={`w-full text-left px-2.5 py-2 rounded border text-xs transition-colors ${
              partial
                ? 'border-paper-line text-ink hover:border-gold hover:bg-gold-light'
                : 'border-paper-line text-ink hover:border-sage hover:bg-sage-light'
            }`}
          >
            <span>{describe(plan)}</span>
            {partial && (
              <span className="block text-[11px] text-gold-dark mt-0.5">
                {t.calendar.deficitFixPartialHint(formatMoney(plan.remainingGap, currency))}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
