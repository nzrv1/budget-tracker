import { CheckCircle2, AlertTriangle, Info, Bell } from 'lucide-react'
import { Insight } from '../types'
import { Reminder, offsetLabel } from '../lib/goalReminders'
import { ImportantDateIconGlyph } from '../lib/importantDates'
import { formatMoney } from '../lib/utils'
import { Card, ProgressBar, GoalIconGlyph, SectionHeading } from './shared'
import { EmptyState } from './Dashboard'

export default function NotificationsView({
  insights,
  reminders,
  currency,
}: {
  insights: Insight[]
  reminders: Reminder[]
  currency: string
}) {
  const isEmpty = insights.length === 0 && reminders.length === 0

  return (
    <div>
      <SectionHeading eyebrow="Nudges & tips" title="Notifications" />

      {isEmpty ? (
        <Card className="p-8">
          <EmptyState text="Nothing to flag right now — add transactions, goals, or important dates to get tailored tips here." />
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {reminders.map((r) =>
            r.targetKind === 'goal' ? (
              <GoalReminderCard key={r.id} reminder={r} currency={currency} />
            ) : (
              <DateReminderCard key={r.id} reminder={r} currency={currency} />
            )
          )}

          {insights.map((insight) => (
            <Card key={insight.id} className="p-4 flex gap-3 items-start">
              <span
                className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                  insight.tone === 'positive'
                    ? 'bg-sage-light text-sage-dark'
                    : insight.tone === 'warning'
                    ? 'bg-clay-light text-clay-dark'
                    : 'bg-paper text-ink-softer'
                }`}
              >
                {insight.tone === 'positive' ? (
                  <CheckCircle2 size={16} strokeWidth={1.75} />
                ) : insight.tone === 'warning' ? (
                  <AlertTriangle size={16} strokeWidth={1.75} />
                ) : (
                  <Info size={16} strokeWidth={1.75} />
                )}
              </span>
              <div>
                <p className="text-sm font-medium text-ink">{insight.title}</p>
                <p className="text-sm text-ink-softer mt-0.5 leading-relaxed">{insight.message}</p>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

function GoalReminderCard({ reminder, currency }: { reminder: Reminder; currency: string }) {
  const { goal, ratio, remaining, neededPerWeek, daysLeft, comment, offsetKey } = reminder
  if (!goal || ratio === undefined || remaining === undefined || neededPerWeek === undefined) return null

  return (
    <Card className="p-4 border-gold/40">
      <div className="flex items-start gap-3">
        <span className="shrink-0 w-8 h-8 rounded-full bg-gold-light text-gold-dark flex items-center justify-center">
          <Bell size={15} strokeWidth={1.75} />
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <GoalIconGlyph icon={goal.icon} size={14} className="text-ink-softer shrink-0" />
            <p className="text-sm font-medium text-ink truncate">{goal.name}</p>
            <span className="text-xs text-ink-softer">· {offsetLabel(offsetKey)}</span>
          </div>

          <div className="flex justify-between items-baseline mt-2.5 mb-1.5">
            <span className="font-tabular font-semibold text-sm text-ink">{formatMoney(goal.savedAmount, currency)}</span>
            <span className="text-xs text-ink-softer font-tabular">of {formatMoney(goal.targetAmount, currency)}</span>
          </div>
          <ProgressBar ratio={ratio} tone={ratio >= 0.9 ? 'gold' : 'sage'} />

          <p className="text-sm text-ink-softer mt-2.5 leading-relaxed">
            {formatMoney(remaining, currency)} left to save
            {daysLeft > 0
              ? ` — about ${formatMoney(neededPerWeek, currency)}/week keeps you on pace for ${daysLeft} day${
                  daysLeft === 1 ? '' : 's'
                } left.`
              : '.'}
          </p>
          <p className="text-sm text-sage-dark mt-1 font-medium leading-relaxed">{comment}</p>
        </div>
      </div>
    </Card>
  )
}

function DateReminderCard({ reminder, currency }: { reminder: Reminder; currency: string }) {
  const { importantDate, daysLeft, comment, offsetKey, ratio, remaining, neededPerWeek } = reminder
  if (!importantDate) return null

  const hasTarget = ratio !== undefined && remaining !== undefined

  return (
    <Card className="p-4 border-gold/40">
      <div className="flex items-start gap-3">
        <span className="shrink-0 w-8 h-8 rounded-full bg-gold-light text-gold-dark flex items-center justify-center">
          <ImportantDateIconGlyph category={importantDate.category} size={15} />
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <p className="text-sm font-medium text-ink truncate">{importantDate.name}</p>
            <span className="text-xs text-ink-softer">· {offsetLabel(offsetKey)}</span>
          </div>
          <p className="text-sm text-ink-softer mt-1.5 leading-relaxed">
            {daysLeft === 0 ? 'Today' : daysLeft === 1 ? 'Tomorrow' : `In ${daysLeft} days`}
          </p>

          {hasTarget && (
            <>
              <div className="flex justify-between items-baseline mt-2.5 mb-1.5">
                <span className="font-tabular font-semibold text-sm text-ink">
                  {formatMoney((importantDate.savedAmount ?? 0), currency)}
                </span>
                <span className="text-xs text-ink-softer font-tabular">
                  of {formatMoney(importantDate.targetAmount ?? 0, currency)}
                </span>
              </div>
              <ProgressBar ratio={ratio} tone={ratio >= 0.9 ? 'gold' : 'sage'} />

              {remaining > 0 && (
                <p className="text-sm text-ink-softer mt-2.5 leading-relaxed">
                  {formatMoney(remaining, currency)} left to save
                  {daysLeft > 0 && neededPerWeek !== undefined
                    ? ` — about ${formatMoney(neededPerWeek, currency)}/week keeps you on pace for ${daysLeft} day${
                        daysLeft === 1 ? '' : 's'
                      } left.`
                    : '.'}
                </p>
              )}
            </>
          )}

          <p className="text-sm text-sage-dark mt-1 font-medium leading-relaxed">{comment}</p>
        </div>
      </div>
    </Card>
  )
}
