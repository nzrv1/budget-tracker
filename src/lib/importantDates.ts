import { createElement } from 'react'
import {
  Cake,
  Heart,
  PartyPopper,
  Car,
  CalendarDays,
  Gift,
  Stethoscope,
  GraduationCap,
  Plane,
  Wrench,
  PawPrint,
  Users,
  Landmark,
  Shield,
  Receipt,
} from 'lucide-react'
import { ImportantDate, ImportantDateCategory } from '../types'
import { parseLocalDate } from './utils'
import { Dictionary } from './i18n'

export const IMPORTANT_DATE_ICON_MAP: Record<ImportantDateCategory, React.ElementType> = {
  birthday: Cake,
  anniversary: Heart,
  holiday: PartyPopper,
  carMaintenance: Car,
  gift: Gift,
  medical: Stethoscope,
  education: GraduationCap,
  travel: Plane,
  homeMaintenance: Wrench,
  petCare: PawPrint,
  family: Users,
  finance: Landmark,
  insurance: Shield,
  subscription: Receipt,
  other: CalendarDays,
}

// The `key` order here is what drives the fixed order the category picker renders in; `label`
// is filled in from the current language at render time via importantDateCategoryOptions(t)
// below rather than hardcoded, so this list itself only needs to exist in one (English) form.
const IMPORTANT_DATE_CATEGORY_KEYS: ImportantDateCategory[] = [
  'birthday',
  'anniversary',
  'holiday',
  'carMaintenance',
  'gift',
  'medical',
  'education',
  'travel',
  'homeMaintenance',
  'petCare',
  'family',
  'finance',
  'insurance',
  'subscription',
  'other',
]

/** Translated label for one important-date category. */
export function importantDateCategoryLabel(t: Dictionary, category: ImportantDateCategory): string {
  return t.importantDateCategories[category]
}

/** The category picker's options, translated for the current language. */
export function importantDateCategoryOptions(t: Dictionary): { key: ImportantDateCategory; label: string }[] {
  return IMPORTANT_DATE_CATEGORY_KEYS.map((key) => ({ key, label: importantDateCategoryLabel(t, key) }))
}

// Kept for reference/back-compat of the type shape only — components should call
// importantDateCategoryOptions(t) instead so labels follow the selected language.
export const IMPORTANT_DATE_CATEGORY_OPTIONS: { key: ImportantDateCategory; label: string }[] =
  IMPORTANT_DATE_CATEGORY_KEYS.map((key) => ({ key, label: key }))

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

export interface QuickAddPreset {
  label: string
  name: string
  category: ImportantDateCategory
  recurring: boolean
  date?: string // MM-DD, when fixed
}

/**
 * One-tap starting points for the "New date" form, translated for the current language. `date`
 * is left blank for anything whose date is personal (a birthday) or moves year to year in ways
 * this app can't compute (Mother's Day) — the person fills that part in themselves. Truly
 * fixed-date holidays get their date prefilled.
 *
 * Unlike the button's own `label` (pure UI chrome), `name` becomes the actual saved
 * ImportantDate.name the moment the person taps the preset — real data, not a fixed string — so
 * it's translated too, in whatever language was active when they created it. Editing the name
 * afterward works exactly as before; this only affects what gets pre-filled.
 */
export function getQuickAddPresets(t: Dictionary): QuickAddPreset[] {
  return [
    { label: t.importantDates.presetBirthdayLabel, name: t.importantDates.presetBirthdayName, category: 'birthday', recurring: true },
    { label: t.importantDates.presetAnniversaryLabel, name: t.importantDates.presetAnniversaryName, category: 'anniversary', recurring: true },
    {
      label: t.importantDates.presetNewYearLabel,
      name: t.importantDates.presetNewYearName,
      category: 'holiday',
      recurring: true,
      date: '01-01',
    },
    {
      label: t.importantDates.presetValentinesLabel,
      name: t.importantDates.presetValentinesName,
      category: 'holiday',
      recurring: true,
      date: '02-14',
    },
    {
      label: t.importantDates.presetCarServiceLabel,
      name: t.importantDates.presetCarServiceName,
      category: 'carMaintenance',
      recurring: false,
    },
  ]
}

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
  // parseLocalDate, not new Date() — dateStr is always a full "YYYY-MM-DD" (the recurring-holiday
  // templates above get the current year prefixed onto their "MM-DD" before they ever reach
  // here — see ImportantDatesView.tsx), and new Date() would parse it as UTC midnight, shifting
  // it a day earlier for negative-UTC-offset users once .getMonth()/.getDate() read it back
  // in local time (see utils.ts: parseLocalDate for the full explanation — this was bug 4.10).
  const stored = parseLocalDate(dateStr)
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
