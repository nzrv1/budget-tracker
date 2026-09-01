import { useState } from 'react'
import { ChevronLeft, ChevronRight, Wallet, Target, CalendarDays } from 'lucide-react'
import { AppState } from '../types'
import { formatMoney } from '../lib/utils'
import { Card, GoalIconGlyph, ProgressBar, SectionHeading } from './shared'
import { ImportantDateIconGlyph } from '../lib/importantDates'
import {
  planForMonth,
  planForWeek,
  eventsInMonth,
  startOfMonth,
  startOfWeek,
  addDays,
  addMonths,
  CalendarEvent,
} from '../lib/planning'

const WEEKDAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S']
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

export default function CalendarView({ state }: { state: AppState }) {
  const [mode, setMode] = useState<'month' | 'week'>('month')
  const [year, setYear] = useState(new Date().getFullYear())
  const [monthAnchor, setMonthAnchor] = useState(() => startOfMonth(new Date()))

  return (
    <div>
      <SectionHeading
        eyebrow="Plan ahead"
        title="Calendar"
        action={
          <div className="inline-flex rounded-lg border border-paper-line overflow-hidden">
            <button
              onClick={() => setMode('month')}
              className={`px-3.5 py-2 text-sm font-medium transition-colors ${
                mode === 'month' ? 'bg-ink text-paper' : 'text-ink-softer hover:bg-paper-card'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setMode('week')}
              className={`px-3.5 py-2 text-sm font-medium transition-colors ${
                mode === 'week' ? 'bg-ink text-paper' : 'text-ink-softer hover:bg-paper-card'
              }`}
            >
              Weekly
            </button>
          </div>
        }
      />

      <p className="text-sm text-ink-softer mb-5 -mt-2">
        Money you'll want to set aside, blending your budgets with what's left to save for your goals and important
        dates.
      </p>

      {mode === 'month' ? (
        <MonthGridView state={state} year={year} setYear={setYear} />
      ) : (
        <WeekListView state={state} monthAnchor={monthAnchor} setMonthAnchor={setMonthAnchor} />
      )}
    </div>
  )
}

function MonthGridView({ state, year, setYear }: { state: AppState; year: number; setYear: (y: number) => void }) {
  const months = Array.from({ length: 12 }, (_, i) => new Date(year, i, 1))

  return (
    <div>
      <div className="flex items-center justify-center gap-4 mb-5">
        <button
          onClick={() => setYear(year - 1)}
          aria-label="Previous year"
          className="p-2 rounded hover:bg-paper-card text-ink-softer hover:text-ink transition-colors"
        >
          <ChevronLeft size={18} />
        </button>
        <h3 className="font-display font-semibold text-lg text-ink w-16 text-center">{year}</h3>
        <button
          onClick={() => setYear(year + 1)}
          aria-label="Next year"
          className="p-2 rounded hover:bg-paper-card text-ink-softer hover:text-ink transition-colors"
        >
          <ChevronRight size={18} />
        </button>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {months.map((m) => (
          <MonthCard key={m.getMonth()} state={state} monthStart={m} />
        ))}
      </div>
    </div>
  )
}

function MonthCard({ state, monthStart }: { state: AppState; monthStart: Date }) {
  const plan = planForMonth(state, monthStart)
  const events = eventsInMonth(state, monthStart)
  const [openDay, setOpenDay] = useState<number | null>(null)

  const eventsByDay = new Map<number, CalendarEvent[]>()
  for (const e of events) {
    const arr = eventsByDay.get(e.day) || []
    arr.push(e)
    eventsByDay.set(e.day, arr)
  }

  const year = monthStart.getFullYear()
  const month = monthStart.getMonth()
  const dim = new Date(year, month + 1, 0).getDate()
  const firstDow = (new Date(year, month, 1).getDay() + 6) % 7 // Monday = 0

  const today = new Date()
  const isCurrentMonth = today.getFullYear() === year && today.getMonth() === month

  const cells: (number | null)[] = []
  for (let i = 0; i < firstDow; i++) cells.push(null)
  for (let d = 1; d <= dim; d++) cells.push(d)

  const currency = state.settings.currency
  const hasBreakdown = plan.budgetsTotal > 0 || plan.goalsTotal > 0 || plan.datesTotal > 0
  const openDayEvents = openDay !== null ? eventsByDay.get(openDay) : undefined

  return (
    <Card className="p-4">
      <div className="flex items-baseline justify-between mb-2.5">
        <h4 className="font-display font-semibold text-base text-ink">{MONTH_NAMES[month]}</h4>
        <span className="font-tabular font-semibold text-sm text-sage-dark">{formatMoney(plan.total, currency)}</span>
      </div>

      <div className="grid grid-cols-7 gap-y-1 text-center mb-1">
        {WEEKDAY_LABELS.map((w, i) => (
          <span key={i} className="text-[10px] font-medium text-ink-softer">
            {w}
          </span>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-y-1 text-center mb-3" onMouseLeave={() => setOpenDay(null)}>
        {cells.map((d, i) => {
          const dayEvents = d !== null ? eventsByDay.get(d) : undefined
          const hasEvent = !!dayEvents && dayEvents.length > 0
          const isToday = isCurrentMonth && d === today.getDate()
          return (
            <span
              key={i}
              onClick={() => hasEvent && d !== null && setOpenDay(openDay === d ? null : d)}
              onMouseEnter={() => hasEvent && d !== null && setOpenDay(d)}
              className={`relative text-[11px] font-tabular w-6 h-6 mx-auto flex items-center justify-center rounded-full transition-colors ${
                isToday ? 'bg-ink text-paper' : 'text-ink-softer'
              } ${hasEvent ? 'cursor-pointer hover:bg-sage-light hover:text-sage-dark' : ''} ${
                hasEvent && openDay === d && !isToday ? 'bg-sage-light text-sage-dark' : ''
              }`}
            >
              {d ?? ''}
              {hasEvent && !isToday && <span className="absolute bottom-0 w-1 h-1 rounded-full bg-gold" />}
            </span>
          )
        })}
      </div>

      {openDayEvents && openDayEvents.length > 0 && (
        <div className="mb-3 p-3 rounded bg-paper border border-paper-line flex flex-col gap-3">
          {openDayEvents.map((ev) => {
            const hasTarget = ev.kind === 'goal' ? true : ev.hasTarget
            const remaining = Math.max(ev.target - ev.saved, 0)
            const ratio = ev.target > 0 ? ev.saved / ev.target : 0
            return (
              <div key={`${ev.kind}-${ev.id}`}>
                <div className="flex items-center gap-1.5 mb-1.5">
                  {ev.kind === 'goal' ? (
                    <GoalIconGlyph icon={ev.icon} size={13} className="text-ink-softer shrink-0" />
                  ) : (
                    <ImportantDateIconGlyph category={ev.category} size={13} className="text-ink-softer shrink-0" />
                  )}
                  <span className="text-xs font-medium text-ink truncate">{ev.name}</span>
                </div>
                {hasTarget ? (
                  <>
                    <div className="flex justify-between text-[11px] font-tabular text-ink-softer mb-1">
                      <span>{formatMoney(ev.saved, currency)} saved</span>
                      <span>{formatMoney(remaining, currency)} left</span>
                    </div>
                    <ProgressBar ratio={ratio} tone={ratio >= 0.9 ? 'gold' : 'sage'} />
                  </>
                ) : (
                  <p className="text-[11px] text-ink-softer">No savings target set for this one.</p>
                )}
              </div>
            )
          })}
        </div>
      )}

      {hasBreakdown && (
        <div className="flex flex-col gap-1 pt-3 border-t border-paper-line text-xs">
          {plan.budgetsTotal > 0 && (
            <div className="flex items-center justify-between text-ink-softer">
              <span className="flex items-center gap-1.5">
                <Wallet size={12} /> Budgets
              </span>
              <span className="font-tabular">{formatMoney(plan.budgetsTotal, currency)}</span>
            </div>
          )}
          {plan.goalsTotal > 0 && (
            <div className="flex items-center justify-between text-ink-softer">
              <span className="flex items-center gap-1.5">
                <Target size={12} /> Goals
              </span>
              <span className="font-tabular">{formatMoney(plan.goalsTotal, currency)}</span>
            </div>
          )}
          {plan.datesTotal > 0 && (
            <div className="flex items-center justify-between text-ink-softer">
              <span className="flex items-center gap-1.5">
                <CalendarDays size={12} /> Dates
              </span>
              <span className="font-tabular">{formatMoney(plan.datesTotal, currency)}</span>
            </div>
          )}
        </div>
      )}
    </Card>
  )
}

function WeekListView({
  state,
  monthAnchor,
  setMonthAnchor,
}: {
  state: AppState
  monthAnchor: Date
  setMonthAnchor: (d: Date) => void
}) {
  const weeks = weeksInMonth(monthAnchor)
  const currency = state.settings.currency

  return (
    <div>
      <div className="flex items-center justify-center gap-4 mb-5">
        <button
          onClick={() => setMonthAnchor(addMonths(monthAnchor, -1))}
          aria-label="Previous month"
          className="p-2 rounded hover:bg-paper-card text-ink-softer hover:text-ink transition-colors"
        >
          <ChevronLeft size={18} />
        </button>
        <h3 className="font-display font-semibold text-lg text-ink w-40 text-center">
          {MONTH_NAMES[monthAnchor.getMonth()]} {monthAnchor.getFullYear()}
        </h3>
        <button
          onClick={() => setMonthAnchor(addMonths(monthAnchor, 1))}
          aria-label="Next month"
          className="p-2 rounded hover:bg-paper-card text-ink-softer hover:text-ink transition-colors"
        >
          <ChevronRight size={18} />
        </button>
      </div>

      <div className="flex flex-col gap-3">
        {weeks.map((weekStart, i) => {
          const plan = planForWeek(state, weekStart)
          const weekEnd = addDays(weekStart, 6)
          return (
            <Card key={i} className="p-4">
              <div className="flex items-baseline justify-between mb-3">
                <h4 className="font-medium text-sm text-ink">
                  {weekStart.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                  {' – '}
                  {weekEnd.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                </h4>
                <span className="font-tabular font-semibold text-sm text-sage-dark">{formatMoney(plan.total, currency)}</span>
              </div>

              {plan.total === 0 ? (
                <p className="text-xs text-ink-softer">Nothing planned this week.</p>
              ) : (
                <div className="flex flex-col gap-1.5 text-xs">
                  {plan.budgetsTotal > 0 && (
                    <div className="flex items-center justify-between text-ink-softer">
                      <span className="flex items-center gap-1.5">
                        <Wallet size={12} /> Budgets (all categories)
                      </span>
                      <span className="font-tabular">{formatMoney(plan.budgetsTotal, currency)}</span>
                    </div>
                  )}
                  {plan.goalItems.map((g) => (
                    <div key={g.id} className="flex items-center justify-between text-ink-softer">
                      <span className="flex items-center gap-1.5 truncate">
                        <Target size={12} className="shrink-0" /> <span className="truncate">{g.label}</span>
                      </span>
                      <span className="font-tabular shrink-0 ml-2">{formatMoney(g.amount, currency)}</span>
                    </div>
                  ))}
                  {plan.dateItems.map((d) => (
                    <div key={d.id} className="flex items-center justify-between text-ink-softer">
                      <span className="flex items-center gap-1.5 truncate">
                        <CalendarDays size={12} className="shrink-0" /> <span className="truncate">{d.label}</span>
                      </span>
                      <span className="font-tabular shrink-0 ml-2">{formatMoney(d.amount, currency)}</span>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          )
        })}
      </div>
    </div>
  )
}

function weeksInMonth(monthStart: Date): Date[] {
  const year = monthStart.getFullYear()
  const month = monthStart.getMonth()
  const dim = new Date(year, month + 1, 0).getDate()
  const firstWeek = startOfWeek(new Date(year, month, 1))
  const lastDay = new Date(year, month, dim)
  const weeks: Date[] = []
  let cursor = firstWeek
  while (cursor.getTime() <= lastDay.getTime()) {
    weeks.push(cursor)
    cursor = addDays(cursor, 7)
  }
  return weeks
}
