export type TransactionType = 'income' | 'expense'

export interface Transaction {
  id: string
  date: string // ISO date
  amount: number // always positive; sign determined by type
  type: TransactionType
  category: string
  note: string
}

export type CategoryIconKey =
  | 'food'
  | 'transport'
  | 'home'
  | 'shopping'
  | 'travel'
  | 'entertainment'
  | 'bills'
  | 'health'
  | 'income'
  | 'work'
  | 'gift'
  | 'tech'
  | 'other'

export interface CategoryDef {
  name: string
  icon: CategoryIconKey
}

export type BudgetPeriod = 'day' | 'week' | 'month' | 'year'

export interface CategoryBudget {
  category: string
  limit: number
  period: BudgetPeriod
}

export type GoalIcon = 'flight' | 'clothes' | 'travel' | 'tech' | 'home' | 'gift' | 'other'

export interface Goal {
  id: string
  name: string
  targetAmount: number
  savedAmount: number
  targetDate: string // ISO date
  icon: GoalIcon
  createdAt: string
}

export interface Settings {
  currency: string
  monthlyIncome: number
  theme: 'light' | 'dark'
}

export interface Insight {
  id: string
  tone: 'positive' | 'warning' | 'info'
  title: string
  message: string
  createdAt: string
}

export interface AppState {
  transactions: Transaction[]
  budgets: CategoryBudget[]
  goals: Goal[]
  categories: CategoryDef[]
  settings: Settings
}

export const DEFAULT_CATEGORIES = [
  'Food',
  'Transport',
  'Rent',
  'Shopping',
  'Travel',
  'Entertainment',
  'Bills',
  'Health',
  'Other',
] as const

export const DEFAULT_CATEGORY_DEFS: CategoryDef[] = [
  { name: 'Food', icon: 'food' },
  { name: 'Transport', icon: 'transport' },
  { name: 'Rent', icon: 'home' },
  { name: 'Shopping', icon: 'shopping' },
  { name: 'Travel', icon: 'travel' },
  { name: 'Entertainment', icon: 'entertainment' },
  { name: 'Bills', icon: 'bills' },
  { name: 'Health', icon: 'health' },
  { name: 'Salary', icon: 'income' },
  { name: 'Freelance', icon: 'work' },
  { name: 'Other', icon: 'other' },
]

