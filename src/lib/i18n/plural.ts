// Small, dependency-free plural helpers for the three supported languages. Kept separate from
// the dictionaries so en.ts/ru.ts/lv.ts can import just the one rule they need without pulling
// in anything else. These only cover the "day(s)" and "week(s)" counts this app actually renders
// dynamically (goal/important-date countdowns, pace estimates) — not a general-purpose CLDR
// plural engine, since nothing else in the app needs one.

/** English: one form for exactly 1, another for everything else (0, 2, 3, ... and negatives). */
export function enPlural(n: number, one: string, other: string): string {
  return Math.abs(n) === 1 ? one : other
}

/**
 * Russian plural rule (used for "день/дня/дней", "неделя/недели/недель", etc.):
 * - one:  ...1 but not ...11   (1, 21, 31, 101 -> "день")
 * - few:  ...2-4 but not ...12-14 (2, 3, 4, 22 -> "дня")
 * - many: everything else, including ...11-14 (5, 11, 12, 25 -> "дней")
 */
export function ruPlural(n: number, one: string, few: string, many: string): string {
  const abs = Math.abs(Math.trunc(n))
  const mod10 = abs % 10
  const mod100 = abs % 100
  if (mod10 === 1 && mod100 !== 11) return one
  if (mod10 >= 2 && mod10 <= 4 && !(mod100 >= 12 && mod100 <= 14)) return few
  return many
}

/**
 * Latvian plural rule (used for "diena/dienas", "nedēļa/nedēļas", etc.):
 * - one:   ...1 but not ...11   (1, 21, 31 -> "diena")
 * - other: everything else, including 0 and ...11-19 (0, 2, 5, 11 -> "dienas")
 */
export function lvPlural(n: number, one: string, other: string): string {
  const abs = Math.abs(Math.trunc(n))
  return abs % 10 === 1 && abs % 100 !== 11 ? one : other
}

export const enDays = (n: number) => enPlural(n, 'day', 'days')
export const ruDays = (n: number) => ruPlural(n, 'день', 'дня', 'дней')
export const lvDays = (n: number) => lvPlural(n, 'diena', 'dienas')

export const enWeeks = (n: number) => enPlural(n, 'week', 'weeks')
export const ruWeeks = (n: number) => ruPlural(n, 'неделя', 'недели', 'недель')
export const lvWeeks = (n: number) => lvPlural(n, 'nedēļa', 'nedēļas')
