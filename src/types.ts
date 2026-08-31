export type TransactionType = 'income' | 'expense'

export interface Transaction {
  id: string
  date: string // ISO date
  amount: number // always positive; sign determined by type
  type: TransactionType
  category: string
  note: string
}

export interface CategoryBudget {
  category: string
  limit: number
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
