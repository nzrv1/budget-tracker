// Turning "now" into the user's own wall clock.
//
// notify-tick runs on a server clock (UTC in Supabase's infra), but every schedule in this
// feature is expressed in the user's local time — "Friday 17:00–18:00", "the 1st–3rd, in the
// morning", "the last days of the month, in the evening". Each user's IANA timezone is stored in
// telegram_notify_state.timezone (reported by the client — see src/lib/telegram.ts).
//
// There's no dependency-free way to construct "the same instant, read in another timezone" as a
// real Date in JS, so we use Intl.DateTimeFormat with `timeZone` to read the local calendar
// fields, and expose them as plain numbers. Callers compare those numbers directly — they must
// NOT build a `new Date(...)` from them and treat it as an instant (that would silently be in the
// server's zone again).

export interface ZonedNow {
  /** The real instant this tick is running at (server clock, timezone-independent). */
  instant: Date
  /** IANA zone these fields are in, echoed back for logging. */
  timezone: string
  year: number
  month: number // 1–12
  day: number // 1–31
  /** 0 = Sunday … 6 = Saturday, matching Date.prototype.getDay(). */
  weekday: number
  hour: number // 0–23
  minute: number // 0–59
  /** Days in the user's current local month — for "is today one of the last N days" checks. */
  daysInMonth: number
}

const WEEKDAY_INDEX: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
}

/**
 * Reads `instant` as a wall clock in `timezone`. Falls back to a fixed zone if the stored
 * timezone string is unusable (old/blank row, or a value the runtime's ICU doesn't know), so a
 * single bad row can never throw the whole tick.
 */
export function zonedNow(instant: Date, timezone: string): ZonedNow {
  let zone = timezone
  let parts: Intl.DateTimeFormatPart[]
  try {
    parts = partsFor(instant, zone)
  } catch {
    zone = 'Europe/Riga'
    parts = partsFor(instant, zone)
  }

  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? ''
  const year = Number(get('year'))
  const month = Number(get('month'))
  const day = Number(get('day'))
  const hour = Number(get('hour')) % 24 // Intl can emit "24" at midnight in some locales
  const minute = Number(get('minute'))
  const weekday = WEEKDAY_INDEX[get('weekday')] ?? new Date(year, month - 1, day).getDay()

  return {
    instant,
    timezone: zone,
    year,
    month,
    day,
    weekday,
    hour,
    minute,
    daysInMonth: new Date(year, month, 0).getDate(),
  }
}

function partsFor(instant: Date, zone: string): Intl.DateTimeFormatPart[] {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: zone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    weekday: 'short',
  }).formatToParts(instant)
}

/**
 * The instant at which a given wall-clock time occurs in `timezone`. The inverse of zonedNow:
 * given "2026-09-11 14:30 in Europe/Riga", returns the Date (UTC instant) for it. One correction
 * pass — exact except within the ~1h fold around a DST transition, which none of our schedules
 * land on precisely enough to matter.
 */
export function wallTimeToInstant(
  timezone: string,
  year: number,
  month: number, // 1–12
  day: number,
  hour: number,
  minute: number,
): Date {
  const wantUTC = Date.UTC(year, month - 1, day, hour, minute)
  const guess = new Date(wantUTC)
  const seen = zonedNow(guess, timezone)
  const seenUTC = Date.UTC(seen.year, seen.month - 1, seen.day, seen.hour, seen.minute)
  return new Date(guess.getTime() + (wantUTC - seenUTC))
}

/** Small, stable string hash (FNV-1a-ish) → unsigned 32-bit int. For deterministic per-user
 *  "random" scheduling that every concurrent tick agrees on. */
export function hashString(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

/**
 * ISO-8601 week number (1–53) for a local calendar day — the "which week" key that keeps
 * once-per-week notifications (friday_mood, random_encouragement) from repeating. Uses the
 * user's local Y/M/D, not an instant, so the week boundary is their Monday, not the server's.
 */
export function isoWeek(year: number, month: number, day: number): { isoYear: number; week: number } {
  // Thursday-of-this-week trick: the ISO year/week is defined by the Thursday in the same week.
  const date = new Date(Date.UTC(year, month - 1, day))
  const dayNum = (date.getUTCDay() + 6) % 7 // 0 = Monday
  date.setUTCDate(date.getUTCDate() - dayNum + 3)
  const firstThursday = new Date(Date.UTC(date.getUTCFullYear(), 0, 4))
  const firstDayNum = (firstThursday.getUTCDay() + 6) % 7
  firstThursday.setUTCDate(firstThursday.getUTCDate() - firstDayNum + 3)
  const week = 1 + Math.round((date.getTime() - firstThursday.getTime()) / (7 * 86400000))
  return { isoYear: date.getUTCFullYear(), week }
}
