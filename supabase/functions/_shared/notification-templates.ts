// ─────────────────────────────────────────────────────────────────────────────
// The notification catalogue: ONE entry per notification type.
//
// Adding a new notification = adding one object to TEMPLATES below. Each entry owns its own
// trigger condition, its own text, its own button (if any), and how often the *same* instance
// may repeat. notify-tick knows nothing type-specific — it just runs every template, applies the
// user's notificationLevel and the per-key spacing, and sends what's left.
//
// User-facing text is localized per user via AppState.settings.language (en / ru / lv) — see
// _shared/notification-i18n.ts. `evaluate()` receives that dictionary in ctx.s.
// ─────────────────────────────────────────────────────────────────────────────

import type { AppState } from '../../../src/types.ts'
import type { ZonedNow } from './zoned-time.ts'
import type { NotifStrings } from './notification-i18n.ts'
import * as calc from './finance-calc.ts'

export type NotificationCategory = 'hard' | 'encouraging'

// Direct link to the Mini App: t.me/<bot username>/<app short name>. The short name is set in
// BotFather (/myapps) — it is "FinLedger", NOT "app".
const MINI_APP_URL = 'https://t.me/FinLedger_osis_bot/FinLedger'

/** A deep link that opens the Mini App, optionally with a `startapp` param (see src/App.tsx). */
export function miniAppLink(startParam?: string): string {
  return startParam ? `${MINI_APP_URL}?startapp=${startParam}` : MINI_APP_URL
}

// How far ahead each lead-time notification looks. Tunable in one place.
//
// important_date_upcoming: fixed 30-day heads-up (only for dates with no configured reminder).
const IMPORTANT_DATE_LEAD_DAYS = 30
//
// goal_deadline_approaching: the lead time scales with how much is still left to save — a bigger
// gap needs earlier warning. The threshold is a raw amount (no FX conversion — matches how the
// rest of the app treats money; see formatMoney): > 150 in the user's currency → 2 months ahead,
// otherwise 1 month ahead.
const GOAL_DEADLINE_LARGE_REMAINING = 150
const GOAL_DEADLINE_LEAD_DAYS_LARGE = 60
const GOAL_DEADLINE_LEAD_DAYS_SMALL = 30

export interface NotificationContext {
  state: AppState
  telegramUserId: string
  /** Localized notification copy for this user's language. */
  s: NotifStrings
  /** The user's wall clock this tick (see zoned-time.ts). */
  zoned: ZonedNow
  /**
   * The user's local calendar "today" at midnight, as a Date carrying local Y/M/D. Compare it
   * against parseLocalDate(...) values (which are built the same way) — never treat it as a true
   * instant.
   */
  localToday: Date
  /** `<isoYear>-W<week>` for the user's current local week — the once-per-week dedupe key. */
  isoWeekKey: string
  /** The instant random_encouragement should fire this week (deterministic per user+week; set
   *  and persisted by notify-tick). */
  randomTargetAt: Date
  /** When this exact key was last delivered to this user, or null. */
  lastSentAt(key: string): Date | null
}

export interface NotificationCandidate {
  /** Spacing/dedupe key — unique per "thing" (e.g. `budget_exceeded:Food`). */
  key: string
  text: string
  button?: { text: string; url: string }
}

export interface NotificationTemplate {
  id: string
  category: NotificationCategory
  /** Minimum hours between two deliveries of the SAME key. */
  minIntervalHours: number
  evaluate(ctx: NotificationContext): NotificationCandidate[]
}

function currency(state: AppState): string {
  return state.settings?.currency || 'EUR'
}

/** Shared shape for "an important date is coming up" — used by both the configured-reminder
 *  path (event_reminder) and the fixed-lead fallback (important_date_upcoming). */
function importantDateCandidate(
  ctx: NotificationContext,
  date: AppState['importantDates'][number],
  days: number,
  key: string,
): NotificationCandidate {
  const cur = currency(ctx.state)
  const hasTarget = !!date.targetAmount && date.targetAmount > 0
  const remaining = hasTarget ? Math.max(date.targetAmount! - (date.savedAmount ?? 0), 0) : 0
  const showMoney = hasTarget && remaining > 0
  return {
    key,
    text: ctx.s.dateUpcoming({
      name: date.name,
      whenWord: ctx.s.whenWord(days),
      saved: showMoney ? calc.formatMoney(date.savedAmount ?? 0, cur) : undefined,
      target: showMoney ? calc.formatMoney(date.targetAmount!, cur) : undefined,
    }),
    button: showMoney
      ? { text: ctx.s.allocateNowButton, url: miniAppLink(`allocate_date_${date.id}_${Math.ceil(remaining)}`) }
      : undefined,
  }
}

// ── the catalogue ────────────────────────────────────────────────────────────

export const TEMPLATES: NotificationTemplate[] = [
  // 1 ── Budget exceeded ─────────────────────────────────────────────────────
  // Mirrors insights.ts rule #1 (ratio >= 1). Re-nudges at most once per 24h per category for
  // as long as the category stays over its limit (brief: "не слали за 24ч по этой категории").
  {
    id: 'budget_exceeded',
    category: 'hard',
    minIntervalHours: 24,
    evaluate(ctx) {
      const cur = currency(ctx.state)
      return calc.exceededBudgets(ctx.state, ctx.localToday).map(({ budget, spent }) => ({
        key: `budget_exceeded:${budget.category}`,
        text: ctx.s.budgetExceeded({
          category: budget.category,
          spent: calc.formatMoney(spent, cur),
          limit: calc.formatMoney(budget.limit, cur),
          period: budget.period,
        }),
      }))
    },
  },

  // 2 ── Configured reminders (Settings → Notifications) ─────────────────────
  // The per-goal / per-important-date reminder rules the user set up in-app (state.reminderRules).
  // Ports generateReminders() from goalReminders.ts — fires each checkpoint ("1 month before",
  // "1 week before", "on the day"…) once, as its trigger date is crossed.
  {
    id: 'event_reminder',
    category: 'hard',
    minIntervalHours: 20, // key is per checkpoint+occurrence → effectively one-shot; this guards same-day dupes
    evaluate(ctx) {
      const cur = currency(ctx.state)
      const out: NotificationCandidate[] = []
      for (const r of calc.dueEventReminders(ctx.state, ctx.localToday)) {
        const key = `event_reminder:${r.targetKind}:${r.id}:${r.offsetKey}:${r.occurrenceKey}`
        if (r.targetKind === 'importantDate' && r.importantDate) {
          out.push(importantDateCandidate(ctx, r.importantDate, r.daysLeft, key))
        } else if (r.goal) {
          const remaining = Math.max(r.goal.targetAmount - r.goal.savedAmount, 0)
          out.push({
            key,
            text: ctx.s.eventReminderGoal({
              name: r.goal.name,
              whenWord: ctx.s.whenWord(r.daysLeft),
              saved: calc.formatMoney(r.goal.savedAmount, cur),
              target: calc.formatMoney(r.goal.targetAmount, cur),
            }),
            button:
              remaining > 0
                ? { text: ctx.s.allocateNowButton, url: miniAppLink(`allocate_goal_${r.goal.id}_${Math.ceil(remaining)}`) }
                : undefined,
          })
        }
      }
      return out
    },
  },

  // 3 ── Important date coming up — fixed-lead fallback ──────────────────────
  // Only for dates the user has NOT configured a reminder rule for (those go through
  // event_reminder above). One heads-up, IMPORTANT_DATE_LEAD_DAYS ahead, per occurrence.
  {
    id: 'important_date_upcoming',
    category: 'hard',
    minIntervalHours: 720, // key is per-occurrence, so this is really just a dupe guard
    evaluate(ctx) {
      const ruled = calc.ruledTargetIds(ctx.state, 'importantDate')
      const out: NotificationCandidate[] = []
      for (const date of ctx.state.importantDates || []) {
        if (ruled.has(date.id)) continue
        const days = calc.daysUntilDate(date, ctx.localToday)
        if (days < 0 || days > IMPORTANT_DATE_LEAD_DAYS) continue
        const occ = calc.nextOccurrence(date.date, date.recurring, ctx.localToday)
        out.push(
          importantDateCandidate(
            ctx,
            date,
            days,
            `important_date_upcoming:${date.id}:${occ.getFullYear()}-${occ.getMonth() + 1}`,
          ),
        )
      }
      return out
    },
  },

  // 4 ── Goal deadline approaching, pace behind ──────────────────────────────
  // Uses the same pace check as goalReminders.ts (onPace = paceSoFar >= needed * 0.85). Weekly
  // re-nudge while the goal is both close and behind.
  {
    id: 'goal_deadline_approaching',
    category: 'hard',
    minIntervalHours: 168,
    evaluate(ctx) {
      const cur = currency(ctx.state)
      const out: NotificationCandidate[] = []
      for (const goal of ctx.state.goals || []) {
        const pace = calc.goalPace(goal, ctx.localToday)
        if (!pace) continue
        const lead =
          pace.remaining > GOAL_DEADLINE_LARGE_REMAINING ? GOAL_DEADLINE_LEAD_DAYS_LARGE : GOAL_DEADLINE_LEAD_DAYS_SMALL
        if (pace.daysLeft <= 0 || pace.daysLeft > lead) continue
        if (pace.onPace) continue
        out.push({
          key: `goal_deadline_approaching:${goal.id}`,
          text: ctx.s.goalBehind({
            name: goal.name,
            daysLeft: pace.daysLeft,
            perWeek: calc.formatMoney(pace.neededPerWeek, cur),
            remaining: calc.formatMoney(pace.remaining, cur),
          }),
          button: {
            text: ctx.s.allocateNowButton,
            url: miniAppLink(`allocate_goal_${goal.id}_${Math.ceil(pace.neededPerWeek)}`),
          },
        })
      }
      return out
    },
  },

  // 5 ── Payday reached, not yet handled ─────────────────────────────────────
  // duePaydaySources() ported from planning.ts. One notification per payday source per month
  // (minIntervalHours > a month), so it never nags — the in-app banner is the persistent copy.
  {
    id: 'payday_reminder',
    category: 'hard',
    minIntervalHours: 720,
    evaluate(ctx) {
      const settings = ctx.state.settings || ({} as AppState['settings'])
      const incomeSources = ctx.state.incomeSources || []
      const due = calc.duePaydaySources(settings.salaryDay, incomeSources, settings.handledPaydays, ctx.localToday)
      const monthK = calc.monthKey(ctx.localToday)
      return due.map((src) => {
        const label =
          src.key === 'primary'
            ? ctx.s.paydayPrimaryLabel
            : incomeSources.find((i) => i.id === src.key)?.name || ctx.s.paydayIncomeFallback
        return {
          key: `payday_reminder:${src.key}:${monthK}`,
          text: ctx.s.payday({ label }),
          button: { text: ctx.s.allocateNowButton, url: miniAppLink('payday') },
        }
      })
    },
  },

  // 6 ── Goal completed ─────────────────────────────────────────────────────
  // Fires once, ever, per goal (keyed by goal id, year-long spacing) the first tick after it
  // crosses 100%. notify-tick has no history of past state, so "just completed" == "completed
  // now and we've never sent this key".
  {
    id: 'goal_completed',
    category: 'hard',
    minIntervalHours: 8760,
    evaluate(ctx) {
      const cur = currency(ctx.state)
      const out: NotificationCandidate[] = []
      for (const goal of ctx.state.goals || []) {
        if (!(goal.targetAmount > 0) || goal.savedAmount < goal.targetAmount) continue
        out.push({
          key: `goal_completed:${goal.id}`,
          text: ctx.s.goalCompleted({
            name: goal.name,
            saved: calc.formatMoney(goal.savedAmount, cur),
            target: calc.formatMoney(goal.targetAmount, cur),
          }),
        })
      }
      return out
    },
  },

  // ═══ Encouraging (category: 'encouraging') — silenced under notificationLevel 'important_only'.
  //     All are scheduled by the user's local wall clock (ctx.zoned), once per week or month.

  // 7 ── Friday mood ────────────────────────────────────────────────────────
  {
    id: 'friday_mood',
    category: 'encouraging',
    minIntervalHours: 100, // key is per ISO week → one-shot; this just guards the 17:00–17:59 window
    evaluate(ctx) {
      if (ctx.zoned.weekday !== 5 || ctx.zoned.hour !== 17) return []
      return [{ key: `friday_mood:${ctx.isoWeekKey}`, text: ctx.s.fridayMood() }]
    },
  },

  // 8 ── Random weekly encouragement ────────────────────────────────────────
  // Fires once per week at a per-user, per-week random instant (Mon–Fri 10:00–18:00 local),
  // computed deterministically by notify-tick so overlapping ticks agree. Praises a budget
  // streak when there is one.
  {
    id: 'random_encouragement',
    category: 'encouraging',
    minIntervalHours: 100,
    evaluate(ctx) {
      if (ctx.zoned.instant.getTime() < ctx.randomTargetAt.getTime()) return []
      return [
        {
          key: `random_encouragement:${ctx.isoWeekKey}`,
          text: ctx.s.randomEncouragement({ streakDays: calc.budgetStreakDays(ctx.state, ctx.localToday) }),
        },
      ]
    },
  },

  // 9 ── Start-of-month motivation ──────────────────────────────────────────
  {
    id: 'month_start_motivation',
    category: 'encouraging',
    minIntervalHours: 24 * 20,
    evaluate(ctx) {
      if (ctx.zoned.day > 3 || ctx.zoned.hour < 7 || ctx.zoned.hour > 11) return []
      return [
        {
          key: `month_start_motivation:${ctx.zoned.year}-${ctx.zoned.month}`,
          text: ctx.s.monthStartMotivation(),
        },
      ]
    },
  },

  // 10 ── End-of-month summary ──────────────────────────────────────────────
  // Last 3 days of the month, evening. Positive only — reports what was set aside and any budget
  // streak, and NOTHING about overspending or a bad month (brief: "только позитив").
  {
    id: 'month_end_summary',
    category: 'encouraging',
    minIntervalHours: 24 * 20,
    evaluate(ctx) {
      if (ctx.zoned.daysInMonth - ctx.zoned.day > 2 || ctx.zoned.hour < 18 || ctx.zoned.hour > 22) return []
      const setAside = calc.savingsSetAsideThisMonth(ctx.state, ctx.localToday)
      return [
        {
          key: `month_end_summary:${ctx.zoned.year}-${ctx.zoned.month}`,
          text: ctx.s.monthEndSummary({
            setAside: calc.formatMoney(setAside, currency(ctx.state)),
            hasSetAside: setAside > 0,
            streakDays: calc.budgetStreakDays(ctx.state, ctx.localToday),
          }),
        },
      ]
    },
  },

  // ── Future / user-authored types slot in right here: one object, its own `evaluate`, its own
  //    key namespace. Keep hard events above, encouragement below, so notificationLevel
  //    === 'important_only' (sends only category:'hard') stays easy to reason about.
]
