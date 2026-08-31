import { AppState, Transaction, DEFAULT_CATEGORY_DEFS } from '../types'

function isoDaysAgo(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() - days)
  return d.toISOString().slice(0, 10)
}

function isoDaysFromNow(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

function tx(
  id: string,
  daysAgo: number,
  amount: number,
  type: 'income' | 'expense',
  category: string,
  note: string
): Transaction {
  return { id, date: isoDaysAgo(daysAgo), amount, type, category, note }
}

export function mockState(): AppState {
  const transactions: Transaction[] = [
    tx('t1', 27, 3200, 'income', 'Salary', 'Monthly salary'),
    tx('t2', 25, 45.5, 'expense', 'Food', 'Groceries — Rimi'),
    tx('t3', 24, 12.0, 'expense', 'Transport', 'Bus pass top-up'),
    tx('t4', 22, 850, 'expense', 'Rent', 'Monthly rent'),
    tx('t5', 20, 68.9, 'expense', 'Shopping', 'New jacket'),
    tx('t6', 18, 22.4, 'expense', 'Entertainment', 'Cinema with friends'),
    tx('t7', 17, 35.0, 'expense', 'Food', 'Groceries'),
    tx('t8', 15, 120, 'expense', 'Bills', 'Electricity + internet'),
    tx('t9', 14, 9.5, 'expense', 'Food', 'Coffee & lunch'),
    tx('t10', 12, 40, 'expense', 'Health', 'Pharmacy'),
    tx('t11', 10, 27.0, 'expense', 'Transport', 'Taxi'),
    tx('t12', 9, 60, 'expense', 'Entertainment', 'Concert ticket'),
    tx('t13', 7, 15.2, 'expense', 'Food', 'Groceries'),
    tx('t14', 6, 200, 'income', 'Freelance', 'Small design job'),
    tx('t15', 5, 33.0, 'expense', 'Shopping', 'Shoes'),
    tx('t16', 4, 18.0, 'expense', 'Food', 'Dinner out'),
    tx('t17', 3, 8.5, 'expense', 'Transport', 'Fuel top-up'),
    tx('t18', 2, 55.0, 'expense', 'Bills', 'Phone plan'),
    tx('t19', 1, 24.0, 'expense', 'Entertainment', 'Streaming subscriptions'),
    tx('t20', 0, 14.3, 'expense', 'Food', 'Groceries'),
  ]

  return {
    transactions,
    budgets: [
      { category: 'Food', limit: 300, period: 'month' },
      { category: 'Transport', limit: 100, period: 'month' },
      { category: 'Shopping', limit: 150, period: 'month' },
      { category: 'Entertainment', limit: 120, period: 'month' },
      { category: 'Bills', limit: 250, period: 'month' },
      { category: 'Health', limit: 80, period: 'month' },
    ],
    categories: DEFAULT_CATEGORY_DEFS,
    goals: [
      {
        id: 'g1',
        name: 'Flight to Lisbon',
        targetAmount: 400,
        savedAmount: 310,
        targetDate: isoDaysFromNow(35),
        icon: 'flight',
        createdAt: isoDaysAgo(60),
      },
      {
        id: 'g2',
        name: 'Winter Wardrobe Refresh',
        targetAmount: 250,
        savedAmount: 95,
        targetDate: isoDaysFromNow(70),
        icon: 'clothes',
        createdAt: isoDaysAgo(40),
      },
      {
        id: 'g3',
        name: 'Summer Trip Fund',
        targetAmount: 1200,
        savedAmount: 260,
        targetDate: isoDaysFromNow(150),
        icon: 'travel',
        createdAt: isoDaysAgo(20),
      },
    ],
    settings: {
      currency: 'EUR',
      monthlyIncome: 3200,
      theme: 'light',
    },
  }
}
