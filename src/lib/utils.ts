import { Transaction } from '../types'

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

export function filterByRange(transactions: Transaction[], from: Date, to: Date) {
  return transactions.filter((t) => {
    const d = new Date(t.date)
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
