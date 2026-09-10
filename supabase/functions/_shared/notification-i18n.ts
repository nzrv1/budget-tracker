// Notification copy in the three languages the app supports (en / ru / lv), picked per user
// from AppState.settings.language — the same value that drives the Mini App UI.
//
// This is a small, self-contained dictionary, NOT the frontend's src/lib/i18n (that reaches
// `react` through its provider and is far larger than notifications need). Keep the three
// languages in lockstep: every function must exist in all three blocks.

import type { BudgetPeriod } from '../../../src/types.ts'

export type NotifLang = 'en' | 'ru' | 'lv'

export interface NotifStrings {
  periodWord(p: BudgetPeriod): string
  budgetExceeded(a: { category: string; spent: string; limit: string; period: BudgetPeriod }): string

  /** "today" / "tomorrow" / "in N days" */
  whenWord(days: number): string
  dateUpcoming(a: { name: string; whenWord: string; saved?: string; target?: string }): string
  /** A configured reminder rule on a goal firing a checkpoint. */
  eventReminderGoal(a: { name: string; whenWord: string; saved?: string; target?: string }): string

  goalBehind(a: { name: string; daysLeft: number; perWeek: string; remaining: string }): string

  paydayPrimaryLabel: string
  paydayIncomeFallback: string
  payday(a: { label: string }): string

  goalCompleted(a: { name: string; saved: string; target: string }): string

  allocateNowButton: string

  // ── encouraging ──
  fridayMood(): string
  /** Weekly nudge. `streakDays` >= 3 → praise the budget streak; otherwise a general line. */
  randomEncouragement(a: { streakDays: number }): string
  monthStartMotivation(): string
  /** End-of-month recap. Positive only — never mentions overspending. `setAside` is a formatted
   *  amount; `streakDays` may be 0. */
  monthEndSummary(a: { setAside: string; hasSetAside: boolean; streakDays: number }): string
}

const en: NotifStrings = {
  periodWord: (p) => ({ day: 'daily', week: 'weekly', month: 'monthly', year: 'yearly' }[p] ?? 'monthly'),
  budgetExceeded: ({ category, spent, limit, period }) =>
    `⚠️ Your ${category} budget is over.\nSpent ${spent} of the ${limit} ${en.periodWord(period)} limit.`,
  whenWord: (days) => (days <= 0 ? 'today' : days === 1 ? 'tomorrow' : `in ${days} days`),
  dateUpcoming: ({ name, whenWord, saved, target }) => {
    let text = `📅 "${name}" — ${whenWord}.`
    if (saved && target) text += `\nSet aside ${saved} of ${target}.`
    return text
  },
  eventReminderGoal: ({ name, whenWord, saved, target }) => {
    let text = `🎯 Goal "${name}" — ${whenWord}.`
    if (saved && target) text += `\nSaved ${saved} of ${target}.`
    return text
  },
  goalBehind: ({ name, daysLeft, perWeek, remaining }) =>
    `🎯 "${name}" is due in ${daysLeft} days and you're behind pace.\n` +
    `To make it, set aside about ${perWeek} per week (${remaining} to go).`,
  paydayPrimaryLabel: 'Basic salary',
  paydayIncomeFallback: 'Income',
  payday: ({ label }) =>
    `💰 Payday today (${label}).\nDon't forget to set aside what you planned for goals and important dates.`,
  goalCompleted: ({ name, saved, target }) => `🎉 Goal "${name}" reached!\n${saved} of ${target}. Congratulations!`,
  allocateNowButton: 'Set aside now',

  fridayMood: () => `🎉 It's Friday. Have a good weekend — your goals will still be there Monday.`,
  randomEncouragement: ({ streakDays }) =>
    streakDays >= 3
      ? `🔥 ${streakDays} days in a row within budget. Keep it going.`
      : `💪 Small, steady moves add up. You've got this.`,
  monthStartMotivation: () => `🌱 New month. A good moment to check your budgets and goals.`,
  monthEndSummary: ({ setAside, hasSetAside, streakDays }) => {
    let text = hasSetAside
      ? `📊 This month you set aside ${setAside} toward your goals.`
      : `📊 Another month done. A fresh start begins tomorrow.`
    if (streakDays >= 3) text += `\nAnd ${streakDays} days within budget along the way.`
    return text
  },
}

const ru: NotifStrings = {
  periodWord: (p) => ({ day: 'день', week: 'неделю', month: 'месяц', year: 'год' }[p] ?? 'месяц'),
  budgetExceeded: ({ category, spent, limit, period }) =>
    `⚠️ Бюджет «${category}» превышен.\nПотрачено ${spent} из ${limit} за ${ru.periodWord(period)}.`,
  // No trailing "." — callers add sentence punctuation (avoids "дн..").
  whenWord: (days) => (days <= 0 ? 'сегодня' : days === 1 ? 'завтра' : `через ${days} дн`),
  dateUpcoming: ({ name, whenWord, saved, target }) => {
    let text = `📅 «${name}» — ${whenWord}.`
    if (saved && target) text += `\nОтложено ${saved} из ${target}.`
    return text
  },
  eventReminderGoal: ({ name, whenWord, saved, target }) => {
    let text = `🎯 Цель «${name}» — ${whenWord}.`
    if (saved && target) text += `\nОтложено ${saved} из ${target}.`
    return text
  },
  goalBehind: ({ name, daysLeft, perWeek, remaining }) =>
    `🎯 До цели «${name}» осталось ${daysLeft} дн., а темп отстаёт.\n` +
    `Чтобы успеть, откладывайте примерно ${perWeek} в неделю (осталось ${remaining}).`,
  paydayPrimaryLabel: 'Основная зарплата',
  paydayIncomeFallback: 'Доход',
  payday: ({ label }) =>
    `💰 Сегодня зарплата (${label}).\nНе забудьте отложить запланированное на цели и важные даты.`,
  goalCompleted: ({ name, saved, target }) => `🎉 Цель «${name}» достигнута!\n${saved} из ${target}. Поздравляем!`,
  allocateNowButton: 'Отложить сейчас',

  fridayMood: () => `🎉 Пятница. Хороших выходных — цели никуда не денутся до понедельника.`,
  randomEncouragement: ({ streakDays }) =>
    streakDays >= 3
      ? `🔥 Уже ${streakDays} дн. подряд в рамках бюджета. Так держать.`
      : `💪 Маленькие, но регулярные шаги складываются в результат. У тебя получается.`,
  monthStartMotivation: () => `🌱 Новый месяц. Хороший повод заглянуть в бюджеты и цели.`,
  monthEndSummary: ({ setAside, hasSetAside, streakDays }) => {
    let text = hasSetAside
      ? `📊 За этот месяц ты отложил ${setAside} на цели.`
      : `📊 Ещё один месяц позади. Завтра — новый старт.`
    if (streakDays >= 3) text += `\nИ ${streakDays} дн. в рамках бюджета по пути.`
    return text
  },
}

const lv: NotifStrings = {
  periodWord: (p) => ({ day: 'dienā', week: 'nedēļā', month: 'mēnesī', year: 'gadā' }[p] ?? 'mēnesī'),
  budgetExceeded: ({ category, spent, limit, period }) =>
    `⚠️ «${category}» budžets ir pārsniegts.\nIztērēts ${spent} no ${limit} ${lv.periodWord(period)}.`,
  // No trailing "." — callers add sentence punctuation.
  whenWord: (days) => (days <= 0 ? 'šodien' : days === 1 ? 'rīt' : `pēc ${days} d`),
  dateUpcoming: ({ name, whenWord, saved, target }) => {
    let text = `📅 «${name}» — ${whenWord}.`
    if (saved && target) text += `\nAtlikts ${saved} no ${target}.`
    return text
  },
  eventReminderGoal: ({ name, whenWord, saved, target }) => {
    let text = `🎯 Mērķis «${name}» — ${whenWord}.`
    if (saved && target) text += `\nAtlikts ${saved} no ${target}.`
    return text
  },
  goalBehind: ({ name, daysLeft, perWeek, remaining }) =>
    `🎯 Līdz mērķim «${name}» atlikušas ${daysLeft} d., un tempu neizdodas noturēt.\n` +
    `Lai paspētu, atliec apmēram ${perWeek} nedēļā (atlikuši ${remaining}).`,
  paydayPrimaryLabel: 'Pamata alga',
  paydayIncomeFallback: 'Ienākumi',
  payday: ({ label }) =>
    `💰 Šodien ir algas diena (${label}).\nNeaizmirsti atlikt ieplānoto mērķiem un svarīgiem datumiem.`,
  goalCompleted: ({ name, saved, target }) => `🎉 Mērķis «${name}» sasniegts!\n${saved} no ${target}. Apsveicam!`,
  allocateNowButton: 'Atlikt tagad',

  fridayMood: () => `🎉 Piektdiena. Jauku nedēļas nogali — mērķi nekur nepazudīs līdz pirmdienai.`,
  randomEncouragement: ({ streakDays }) =>
    streakDays >= 3
      ? `🔥 Jau ${streakDays} d. pēc kārtas budžeta ietvaros. Tā turpināt.`
      : `💪 Mazi, bet regulāri soļi veido rezultātu. Tev izdodas.`,
  monthStartMotivation: () => `🌱 Jauns mēnesis. Labs brīdis ieskatīties budžetos un mērķos.`,
  monthEndSummary: ({ setAside, hasSetAside, streakDays }) => {
    let text = hasSetAside
      ? `📊 Šomēnes tu atlicināji ${setAside} mērķiem.`
      : `📊 Vēl viens mēnesis aiz muguras. Rīt — jauns sākums.`
    if (streakDays >= 3) text += `\nUn ${streakDays} d. budžeta ietvaros pa ceļam.`
    return text
  },
}

const DICTS: Record<NotifLang, NotifStrings> = { en, ru, lv }

/** Falls back to English for a missing/unknown language, matching the frontend's DEFAULT_LANGUAGE. */
export function notifStrings(lang: string | undefined | null): NotifStrings {
  return DICTS[(lang as NotifLang) ?? 'en'] ?? en
}
