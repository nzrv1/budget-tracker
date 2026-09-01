import { createElement } from 'react'
import { Cake, Heart, PartyPopper, Car, CalendarDays } from 'lucide-react'
import { ImportantDate, ImportantDateCategory } from '../types'

export const IMPORTANT_DATE_ICON_MAP: Record<ImportantDateCategory, React.ElementType> = {
  birthday: Cake,
  anniversary: Heart,
  holiday: PartyPopper,
  carMaintenance: Car,
  other: CalendarDays,
}

export const IMPORTANT_DATE_CATEGORY_OPTIONS: { key: ImportantDateCategory; label: string }[] = [
  { key: 'birthday', label: 'Birthday' },
  { key: 'anniversary', label: 'Anniversary' },
  { key: 'holiday', label: 'Holiday' },
  { key: 'carMaintenance', label: 'Car maintenance' },
  { key: 'other', label: 'Other' },
]

export function ImportantDateIconGlyph({
  category,
  size = 16,
  className = '',
}: {
  category: ImportantDateCategory
  size?: number
  className?: string
}) {
  const Icon = IMPORTANT_DATE_ICON_MAP[category] || CalendarDays
  return createElement(Icon, { size, className, strokeWidth: 1.75 })
}

// One-tap starting points for the "New date" form. `date` is left blank for anything
// whose date is personal (a birthday) or moves year to year in ways this app can't
// compute (Mother's Day) — the person fills that part in themselves. Truly fixed-date
// holidays get their date prefilled.
export const QUICK_ADD_PRESETS: {
  label: string
  name: string
  category: ImportantDateCategory
  recurring: boolean
  date?: string // MM-DD, when fixed
}[] = [
  { label: 'Birthday', name: 'Birthday', category: 'birthday', recurring: true },
  { label: 'Anniversary', name: 'Anniversary', category: 'anniversary', recurring: true },
  { label: 'New Year', name: 'New Year', category: 'holiday', recurring: true, date: '01-01' },
  { label: "Valentine's Day", name: "Valentine's Day", category: 'holiday', recurring: true, date: '02-14' },
  { label: 'Car service', name: 'Car maintenance', category: 'carMaintenance', recurring: false },
]

function startOfDay(d: Date): Date {
  const c = new Date(d)
  c.setHours(0, 0, 0, 0)
  return c
}

/**
 * The next time a date happens. Recurring dates (birthdays, holidays) keep only their
 * month/day and roll forward to this year or next; one-off dates (a car appointment)
 * are used as-is.
 */
export function nextOccurrence(dateStr: string, recurring: boolean): Date {
  const stored = new Date(dateStr)
  if (!recurring) return startOfDay(stored)

  const today = startOfDay(new Date())
  let next = new Date(today.getFullYear(), stored.getMonth(), stored.getDate())
  if (next.getTime() < today.getTime()) {
    next = new Date(today.getFullYear() + 1, stored.getMonth(), stored.getDate())
  }
  return next
}

export function daysUntil(date: ImportantDate): number {
  const next = nextOccurrence(date.date, date.recurring)
  const today = startOfDay(new Date())
  return Math.round((next.getTime() - today.getTime()) / 86400000)
}
