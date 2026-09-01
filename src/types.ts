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
  | 'groceries'
  | 'coffee'
  | 'transport'
  | 'publicTransport'
  | 'bike'
  | 'fuel'
  | 'home'
  | 'housing'
  | 'shopping'
  | 'clothing'
  | 'travel'
  | 'entertainment'
  | 'music'
  | 'streaming'
  | 'games'
  | 'bills'
  | 'utilities'
  | 'water'
  | 'internet'
  | 'phone'
  | 'health'
  | 'medical'
  | 'pharmacy'
  | 'fitness'
  | 'beauty'
  | 'income'
  | 'savings'
  | 'bank'
  | 'creditCard'
  | 'wallet'
  | 'work'
  | 'education'
  | 'books'
  | 'gift'
  | 'charity'
  | 'tech'
  | 'maintenance'
  | 'hobby'
  | 'pets'
  | 'kids'
  | 'family'
  | 'insurance'
  | 'emergency'
  | 'outdoors'
  | 'parking'
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

export type GoalIcon =
  | 'flight'
  | 'clothes'
  | 'travel'
  | 'tech'
  | 'home'
  | 'gift'
  | 'car'
  | 'education'
  | 'health'
  | 'emergencyFund'
  | 'pet'
  | 'hobby'
  | 'phone'
  | 'music'
  | 'fitness'
  | 'kids'
  | 'charity'
  | 'business'
  | 'renovation'
  | 'debt'
  | 'savings'
  | 'insurance'
  | 'outdoors'
  | 'wedding'
  | 'furniture'
  | 'books'
  | 'games'
  | 'food'
  | 'family'
  | 'shopping'
  | 'bike'
  | 'other'

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
  monthlyIncome: number // baseline income; treated as the person's basic salary
  theme: ThemeKey
  salaryDay?: number // day of month (1-31) the basic salary is paid — powers the payday auto-savings prompt
  // Tracks which paydays have already been applied/dismissed this month, so the prompt
  // doesn't repeat. Keyed by 'primary' for the basic salary above, or an IncomeSource id
  // for an extra income source — each pays on its own day and gets its own reminder.
  handledPaydays?: Record<string, string> // key -> 'YYYY-MM'
}

/** An extra source of income beyond the basic salary — a second job, freelance work, etc. —
 * with its own monthly amount and payday, for people with more than one income. */
export interface IncomeSource {
  id: string
  name: string
  amount: number
  payDay: number // day of month, 1-31
}

export type ThemeKey = 'light' | 'dark' | 'cyber' | 'red' | 'pinky' | 'caramel'

export interface Insight {
  id: string
  tone: 'positive' | 'warning' | 'info'
  title: string
  message: string
  createdAt: string
}

/** How long before the target date a reminder should fire. */
export type ReminderOffsetKey = '2_months' | '1_month' | '2_weeks' | '1_week' | '3_days' | '1_day' | 'on_day'

/** What kind of thing a reminder rule points at — a savings goal or an important date. */
export type ReminderTargetKind = 'goal' | 'importantDate'

/** One reminder schedule: an ordered set of "fire this many days before the date" checkpoints. */
export interface ReminderRule {
  targetKind: ReminderTargetKind
  targetId: string
  offsets: ReminderOffsetKey[]
}

export type ImportantDateCategory =
  | 'birthday'
  | 'anniversary'
  | 'holiday'
  | 'carMaintenance'
  | 'gift'
  | 'medical'
  | 'education'
  | 'travel'
  | 'homeMaintenance'
  | 'petCare'
  | 'family'
  | 'finance'
  | 'insurance'
  | 'subscription'
  | 'other'

export interface ImportantDate {
  id: string
  name: string
  date: string // ISO date. For a recurring date, the year is arbitrary — only month/day are used.
  category: ImportantDateCategory
  recurring: boolean // true = repeats every year (birthdays, holidays); false = one-off (an appointment)
  createdAt: string
  targetAmount?: number // optional — how much to set aside for this (a gift, a service bill...)
  savedAmount?: number
}

export interface AppState {
  transactions: Transaction[]
  budgets: CategoryBudget[]
  goals: Goal[]
  categories: CategoryDef[]
  importantDates: ImportantDate[]
  reminderRules: ReminderRule[]
  incomeSources: IncomeSource[]
  settings: Settings
  // Ids of insights/reminders already seen on the Notifications page — everything currently
  // showing there gets marked read the moment that page opens (see App.tsx).
  readNotificationIds: string[]
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

