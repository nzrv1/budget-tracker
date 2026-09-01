// Despite the filename (kept for history), this module now generates reminders for
// both savings goals and important dates — see generateReminders() below.
import { AppState, Goal, ImportantDate, ImportantDateCategory, ReminderOffsetKey } from '../types'
import { nextOccurrence } from './importantDates'

export const OFFSET_OPTIONS: { key: ReminderOffsetKey; label: string; days: number }[] = [
  { key: '2_months', label: '2 months before', days: 60 },
  { key: '1_month', label: '1 month before', days: 30 },
  { key: '2_weeks', label: '2 weeks before', days: 14 },
  { key: '1_week', label: '1 week before', days: 7 },
  { key: '3_days', label: '3 days before', days: 3 },
  { key: '1_day', label: '1 day before', days: 1 },
  { key: 'on_day', label: 'On the day', days: 0 },
]

// Sensible default schedules, keyed by how many notifications the person picks —
// spread from "early heads-up" down to "last call". Matches the shape most people
// want: a first nudge a while out, then a couple of closer check-ins.
const DEFAULTS_BY_COUNT: Record<number, ReminderOffsetKey[]> = {
  1: ['1_month'],
  2: ['1_month', '1_week'],
  3: ['1_month', '2_weeks', '1_day'],
  4: ['1_month', '2_weeks', '3_days', '1_day'],
  5: ['1_month', '2_weeks', '1_week', '3_days', '1_day'],
  6: ['2_months', '1_month', '2_weeks', '1_week', '3_days', '1_day'],
}

export const MAX_REMINDERS = 6

export function defaultOffsetsForCount(count: number): ReminderOffsetKey[] {
  const preset = DEFAULTS_BY_COUNT[count]
  if (preset) return preset
  const base = DEFAULTS_BY_COUNT[MAX_REMINDERS]
  return Array.from({ length: count }, (_, i) => base[Math.min(i, base.length - 1)])
}

export function offsetLabel(key: ReminderOffsetKey): string {
  return OFFSET_OPTIONS.find((o) => o.key === key)?.label || key
}

function offsetDays(key: ReminderOffsetKey): number {
  return OFFSET_OPTIONS.find((o) => o.key === key)?.days ?? 0
}

function startOfDay(d: Date): Date {
  const c = new Date(d)
  c.setHours(0, 0, 0, 0)
  return c
}

/** Among a rule's checkpoints, finds the most recently crossed one that's still <= today. */
function findDueOffset(offsets: ReminderOffsetKey[], target: Date, now: Date): ReminderOffsetKey | null {
  let due: ReminderOffsetKey | null = null
  let dueTriggerTime = -Infinity
  for (const offsetKey of offsets) {
    const triggerDate = new Date(target)
    triggerDate.setDate(triggerDate.getDate() - offsetDays(offsetKey))
    const t = triggerDate.getTime()
    if (t <= now.getTime() && t > dueTriggerTime) {
      due = offsetKey
      dueTriggerTime = t
    }
  }
  return due
}

// Small deterministic "random" pick so the same target+stage always shows the
// same comment within a session, but different targets/stages vary.
function pick<T>(arr: T[], seed: string): T {
  let hash = 0
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0
  return arr[hash % arr.length]
}

const ALMOST_THERE = [
  "So close — you're nearly there!",
  'The finish line is in sight, keep going.',
  "You've basically made it — just a little more.",
]
const GOOD_PACE = [
  'Great progress — keep this pace up.',
  "You're doing well here, nice momentum.",
  'Solid progress so far — stay consistent.',
]
const ON_TRACK = [
  "You're on track — steady as you go.",
  'Right where you need to be. Keep it steady.',
  'Nice and on pace — no need to rush.',
]
const NEEDS_PUSH = [
  'Still time to catch up — even small top-ups help.',
  "A bit behind pace, but it's very catch-uppable.",
  'Consider setting aside a little extra this week to stay on track.',
]

function goalComment(ratio: number, onPace: boolean, seed: string): string {
  if (ratio >= 0.9) return pick(ALMOST_THERE, seed)
  if (ratio >= 0.6) return pick(GOOD_PACE, seed)
  if (onPace) return pick(ON_TRACK, seed)
  return pick(NEEDS_PUSH, seed)
}

const BIRTHDAY_COMMENTS = [
  "Might be time to think about a gift.",
  "Someone's counting down to this one!",
  "Worth planning something nice.",
]
const CAR_COMMENTS = [
  "Worth booking this in before it sneaks up on you.",
  "Good time to get this on the calendar.",
  "Don't let this one slip.",
]
const HOLIDAY_COMMENTS = [
  'Getting closer — worth planning ahead.',
  'Coming up soon on the calendar.',
  'A good one to prepare for early.',
]
const GENERIC_DATE_COMMENTS = ['Coming up on the calendar.', "Don't forget about this one.", 'Worth keeping an eye on.']
const DATE_FUNDED_COMMENTS = ['All set — already saved up for this one.', 'Fully funded — nothing more to set aside.']

function dateComment(category: ImportantDateCategory, seed: string): string {
  const pool =
    category === 'birthday'
      ? BIRTHDAY_COMMENTS
      : category === 'carMaintenance'
      ? CAR_COMMENTS
      : category === 'holiday'
      ? HOLIDAY_COMMENTS
      : GENERIC_DATE_COMMENTS
  return pick(pool, seed)
}

export interface Reminder {
  id: string
  targetKind: 'goal' | 'importantDate'
  offsetKey: ReminderOffsetKey
  daysLeft: number
  comment: string
  createdAt: string
  // present when targetKind === 'goal'
  goal?: Goal
  ratio?: number
  remaining?: number
  neededPerWeek?: number
  // present when targetKind === 'importantDate'
  importantDate?: ImportantDate
  occursOn?: Date
}

/**
 * For each configured reminder rule (on a goal or an important date), figures out whether
 * one of its checkpoints is currently "due" (its trigger date has passed but the target
 * date hasn't) and, if so, returns one reminder for it — the most recently crossed
 * checkpoint, not every checkpoint that has technically passed, so nothing spams several
 * reminders for the same target at once.
 */
export function generateReminders(state: AppState): Reminder[] {
  const now = startOfDay(new Date())
  const reminders: Reminder[] = []

  for (const rule of state.reminderRules || []) {
    if (rule.targetKind === 'goal') {
      const goal = state.goals.find((g) => g.id === rule.targetId)
      if (!goal) continue

      const remaining = goal.targetAmount - goal.savedAmount
      if (remaining <= 0) continue // fully funded — nothing to nudge about

      const target = startOfDay(new Date(goal.targetDate))
      if (target.getTime() < now.getTime()) continue // deadline's passed; insights.ts already flags this

      const due = findDueOffset(rule.offsets, target, now)
      if (!due) continue

      const daysLeft = Math.round((target.getTime() - now.getTime()) / 86400000)
      const ratio = goal.targetAmount > 0 ? goal.savedAmount / goal.targetAmount : 0
      const neededPerWeek = daysLeft > 0 ? (remaining / daysLeft) * 7 : remaining

      const createdDaysAgo = Math.max(
        Math.round((now.getTime() - startOfDay(new Date(goal.createdAt)).getTime()) / 86400000),
        1
      )
      const paceSoFarPerWeek = (goal.savedAmount / createdDaysAgo) * 7
      const onPace = paceSoFarPerWeek >= neededPerWeek * 0.85

      reminders.push({
        id: `reminder-goal-${goal.id}-${due}`,
        targetKind: 'goal',
        offsetKey: due,
        daysLeft,
        comment: goalComment(ratio, onPace, goal.id + due),
        createdAt: now.toISOString(),
        goal,
        ratio,
        remaining,
        neededPerWeek,
      })
    } else {
      const date = state.importantDates.find((d) => d.id === rule.targetId)
      if (!date) continue

      const occursOn = nextOccurrence(date.date, date.recurring)
      if (occursOn.getTime() < now.getTime()) continue // one-off date already passed

      const due = findDueOffset(rule.offsets, occursOn, now)
      if (!due) continue

      const daysLeft = Math.round((occursOn.getTime() - now.getTime()) / 86400000)

      const hasTarget = !!date.targetAmount && date.targetAmount > 0
      let ratio: number | undefined
      let remaining: number | undefined
      let neededPerWeek: number | undefined
      let comment: string

      if (hasTarget) {
        const target = date.targetAmount!
        const saved = date.savedAmount ?? 0
        remaining = Math.max(target - saved, 0)
        ratio = target > 0 ? saved / target : 0
        neededPerWeek = daysLeft > 0 ? (remaining / daysLeft) * 7 : remaining

        if (remaining <= 0) {
          comment = pick(DATE_FUNDED_COMMENTS, date.id + due)
        } else {
          const createdDaysAgo = Math.max(
            Math.round((now.getTime() - startOfDay(new Date(date.createdAt)).getTime()) / 86400000),
            1
          )
          const paceSoFarPerWeek = (saved / createdDaysAgo) * 7
          const onPace = paceSoFarPerWeek >= neededPerWeek * 0.85
          comment = goalComment(ratio, onPace, date.id + due)
        }
      } else {
        comment = dateComment(date.category, date.id + due)
      }

      reminders.push({
        id: `reminder-date-${date.id}-${due}`,
        targetKind: 'importantDate',
        offsetKey: due,
        daysLeft,
        comment,
        createdAt: now.toISOString(),
        importantDate: date,
        occursOn,
        ratio,
        remaining,
        neededPerWeek,
      })
    }
  }

  return reminders
}
