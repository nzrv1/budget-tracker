import { useEffect, useState } from 'react'
import { BudgetPeriod, Transaction } from '../types'

const CURRENCY_SYMBOLS: Record<string, string> = {
  EUR: '€',
  USD: '$',
  GBP: '£',
  PLN: 'zł',
}

export function formatMoney(amount: number, currency: string): string {
  const symbol = CURRENCY_SYMBOLS[currency] || currency + ' '
  const sign = amount < 0 ? '-' : ''
  return `${sign}${symbol}${Math.abs(amount).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

export function periodRange(period: 'day' | 'week' | 'month' | 'year', anchor: Date = new Date()) {
  const from = new Date(anchor)
  const to = new Date(anchor)
  to.setHours(23, 59, 59, 999)

  if (period === 'day') {
    from.setHours(0, 0, 0, 0)
  } else if (period === 'week') {
    const day = from.getDay()
    from.setDate(from.getDate() - day)
    from.setHours(0, 0, 0, 0)
  } else if (period === 'month') {
    from.setDate(1)
    from.setHours(0, 0, 0, 0)
  } else if (period === 'year') {
    from.setMonth(0, 1)
    from.setHours(0, 0, 0, 0)
  }
  return { from, to }
}

/** A stable key identifying "which occurrence" of a recurring period a date falls in, so
 * something tied to one occurrence (an insight, a budget period-review banner) keeps the same
 * identity while that occurrence is ongoing and gets a new one when the next occurrence starts
 * (e.g. a new month) — letting it come back as unseen/unhandled. Shared by insights.ts and
 * budgetPeriods.ts so the two can't define "which week is this" differently. */
export function periodInstanceKey(period: BudgetPeriod, from: Date): string {
  if (period === 'year') return String(from.getFullYear())
  if (period === 'month') return `${from.getFullYear()}-${String(from.getMonth() + 1).padStart(2, '0')}`
  return from.toISOString().slice(0, 10)
}

/**
 * Parses a bare "YYYY-MM-DD" date (transaction dates, goal/important-date targets — anything
 * that came from a plain `<input type="date">`) as a calendar day in the user's own timezone.
 * `new Date("2024-01-01")` parses that as UTC midnight, which is still Dec 31 locally for any
 * negative UTC offset (most of the Americas) — every call site below that was mixing a
 * UTC-parsed date against locally-constructed range boundaries could be off by a day for those
 * users. Never use this on a full ISO timestamp (e.g. `createdAt`) — those already carry a
 * timezone and parse correctly on their own.
 */
export function parseLocalDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(y, (m || 1) - 1, d || 1)
}

/**
 * "Today" as a bare YYYY-MM-DD string in the person's own local timezone — the write-side
 * counterpart to parseLocalDate above. `new Date().toISOString().slice(0, 10)` (used to default
 * date fields before this) reads the UTC date instead, which rolls over to "tomorrow" while it's
 * still today for anyone west of UTC (e.g. after 7-8pm Eastern/Pacific) — the same off-by-one
 * this file already fixes on the parsing side, just on the way out instead of the way in.
 */
export function todayLocalDateString(): string {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function filterByRange(transactions: Transaction[], from: Date, to: Date) {
  return transactions.filter((t) => {
    const d = parseLocalDate(t.date)
    return d >= from && d <= to
  })
}

export function groupByCategory(transactions: Transaction[]) {
  const map = new Map<string, number>()
  for (const t of transactions) {
    if (t.type !== 'expense') continue
    map.set(t.category, (map.get(t.category) || 0) + t.amount)
  }
  return Array.from(map.entries()).map(([category, value]) => ({ category, value }))
}

export function totals(transactions: Transaction[]) {
  let income = 0
  let expense = 0
  for (const t of transactions) {
    if (t.type === 'income') income += t.amount
    else expense += t.amount
  }
  return { income, expense, net: income - expense }
}

/**
 * Income baked into Settings (basic salary + any extra income sources) for a given period —
 * counted on top of whatever's actually been logged as a transaction, with no de-duplication
 * between the two (the model chosen for this app: Settings is the baseline, transactions add
 * on top). day/week are prorated off the same 30.44-day month used for budget normalization
 * (see planning.ts: budgetDailyRate) so every screen treats "a month" the same way; year is
 * "months elapsed so far this year", matching periodRange('year') which runs Jan 1 → today,
 * not Jan 1 → Dec 31. Shared by Dashboard and Reports so the two screens can't drift apart.
 */
export function settingsIncomeForPeriod(
  settings: { monthlyIncome: number },
  incomeSources: { amount: number }[],
  period: 'day' | 'week' | 'month' | 'year',
  anchor: Date = new Date()
): number {
  const monthlyBase = settings.monthlyIncome + incomeSources.reduce((s, src) => s + src.amount, 0)
  if (period === 'year') return monthlyBase * (anchor.getMonth() + 1)
  if (period === 'month') return monthlyBase
  const daily = monthlyBase / 30.44
  return period === 'week' ? daily * 7 : daily
}

export const CATEGORY_COLORS: Record<string, string> = {
  Food: '#7C9885',
  Transport: '#C9A15C',
  Rent: '#3C5158',
  Shopping: '#C1666B',
  Travel: '#5E7A67',
  Entertainment: '#A8813F',
  Bills: '#22343C',
  Health: '#8FA9C7',
  Other: '#9B9B93',
  Salary: '#7C9885',
  Freelance: '#C9A15C',
}

export function colorForCategory(category: string): string {
  return CATEGORY_COLORS[category] || '#9B9B93'
}

/**
 * Backs a `<input type="number">` whose `value` is bound directly to an existing numeric
 * field in AppState (e.g. settings.monthlyIncome, a budget's limit) — as opposed to a "new
 * entry" form field, which already keeps its own local string state (see AddTransactionModal,
 * GoalsView, ImportantDatesView) and doesn't need this.
 *
 * The bug this fixes: with `value={someNumber}` and `onChange={e => onChange(parseFloat(e.target.value) || 0)}`,
 * clearing the field to retype a value makes the number briefly become 0, which re-renders the
 * input's value back to "0" *before* the next keystroke lands — so typing "1600" after clearing
 * produces "01600" instead of "1600". Keeping the input's own text buffer (only committing a
 * parsed number upward while it's non-empty, and only coercing empty to 0 on blur) means the
 * field can sit empty mid-edit without the app state ever forcing "0" back into it.
 */
export function useNumberField(value: number, onChange: (n: number) => void) {
  const [text, setText] = useState(String(value))

  // Re-sync if the value changes from outside this input (reset, cross-tab sync, migration) —
  // but never while the field merely looks different because the user is mid-edit (see handleBlur).
  useEffect(() => {
    setText((current) => (parseFloat(current) === value ? current : String(value)))
  }, [value])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value
    setText(raw)
    if (raw === '') return // don't push 0 upward yet — see handleBlur
    const n = parseFloat(raw)
    if (!Number.isNaN(n)) onChange(n)
  }

  const handleBlur = () => {
    if (text === '' || Number.isNaN(parseFloat(text))) {
      setText('0')
      onChange(0)
    }
  }

  return { text, handleChange, handleBlur }
}
