import { useEffect, useMemo, useRef, useState } from 'react'
import {
  AppState,
  Transaction,
  CategoryBudget,
  Goal,
  CategoryDef,
  ImportantDate,
  IncomeSource,
  Language,
  ReminderOffsetKey,
  ReminderTargetKind,
  SAVINGS_CATEGORY,
  ThemeKey,
} from './types'
import { loadState, saveState, uid, STORAGE_KEY, migrate, getLastLocalChangeAt } from './lib/storage'
import { getStartParamIntent } from './lib/telegram'
import { emptyState } from './lib/mockData'
import { todayLocalDateString } from './lib/utils'
import { pullRemoteState, pushRemoteState } from './lib/sync'
import { generateInsights } from './lib/insights'
import { generateReminders } from './lib/goalReminders'
import { planForMonth, startOfMonth, monthKey, duePaydaySources } from './lib/planning'
import { BudgetPeriodReview, budgetKey } from './lib/budgetPeriods'
import { createTranslator, DEFAULT_LANGUAGE, I18nProvider, localeForLanguage } from './lib/i18n'
import Sidebar from './components/Sidebar'
import Dashboard from './components/Dashboard'
import TransactionsView from './components/TransactionsView'
import ReportsView from './components/ReportsView'
import BudgetsView from './components/BudgetsView'
import GoalsView from './components/GoalsView'
import ImportantDatesView from './components/ImportantDatesView'
import CalendarView from './components/CalendarView'
import NotificationsView from './components/NotificationsView'
import SettingsView from './components/SettingsView'
import ToastStack from './components/ToastStack'
import OnboardingWizard from './components/OnboardingWizard'

export type ViewKey =
  | 'dashboard'
  | 'transactions'
  | 'reports'
  | 'budgets'
  | 'goals'
  | 'important-dates'
  | 'calendar'
  | 'notifications'
  | 'settings'

export default function App() {
  const [state, setState] = useState<AppState>(() => loadState())
  const [view, setView] = useState<ViewKey>('dashboard')
  const [toasts, setToasts] = useState<{ id: string; title: string; tone: 'positive' | 'warning' | 'info' }[]>([])
  const [seenToastIds, setSeenToastIds] = useState<Set<string>>(new Set())

  // A notification's "Отложить сейчас" deep link (?startapp=allocate_goal_<id>_<amount>) asks us
  // to open Goals / Important Dates with that card's "add funds" field pre-filled. This holds the
  // pending "goal | importantDate" intent until the matching card consumes it; `payday` /
  // `settings` just switch view and need no follow-up. Read once on mount — see the effect below.
  const [allocateIntent, setAllocateIntent] = useState<{ kind: 'goal' | 'importantDate'; id: string; amount: number } | null>(null)

  // A `?startapp=lang_ru` deep link (the bot's language picker) wants the app to open in that
  // language. Held in a ref, not applied immediately: the initial cloud pull below can replace
  // the whole state a beat later, so we re-assert the language once that has settled.
  const pendingLangRef = useRef<Language | null>(null)

  useEffect(() => {
    saveState(state)
  }, [state])

  // Cross-tab sync: the 'storage' event fires in every OTHER same-origin tab (never the tab
  // that made the write, so this can't loop back on our own saveState() above) when
  // localStorage changes. Without this, two open tabs would silently diverge and whichever
  // saves last would clobber the other's changes. e.newValue is null on clearState()/removal.
  useEffect(() => {
    function handleStorage(e: StorageEvent) {
      if (e.key !== STORAGE_KEY || e.newValue === null) return
      setState(loadState())
    }
    window.addEventListener('storage', handleStorage)
    return () => window.removeEventListener('storage', handleStorage)
  }, [])

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', state.settings.theme)
  }, [state.settings.theme])

  // Deep link from a Telegram notification — decide the landing screen once, on launch, instead
  // of the default dashboard. No new allocation logic: for goal/date we just navigate and hand
  // the intent to the view, which pre-fills the existing "add funds" form.
  useEffect(() => {
    const intent = getStartParamIntent()
    if (!intent) return
    if (intent.kind === 'payday') setView('dashboard')
    else if (intent.kind === 'settings') setView('settings')
    else if (intent.kind === 'setLanguage') {
      pendingLangRef.current = intent.lang
      setState((prev) => ({ ...prev, settings: { ...prev.settings, language: intent.lang } }))
    } else {
      setAllocateIntent(intent)
      setView(intent.kind === 'goal' ? 'goals' : 'important-dates')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Cloud sync (Telegram Phase 3) — no-op entirely outside Telegram (pullRemoteState/
  // pushRemoteState both resolve to nothing without a Telegram initData). On launch, decide once
  // whether this device's local copy or the one already in Supabase is newer — "last write wins",
  // the same policy the cross-tab sync above already uses between two tabs. initialSyncDone gates
  // the debounced push effect below so it can't race ahead of this decision and blindly overwrite
  // a newer remote copy before we've even compared timestamps.
  const initialSyncDone = useRef(false)
  useEffect(() => {
    let cancelled = false
    pullRemoteState().then((remote) => {
      if (cancelled) return
      const localChangedAt = getLastLocalChangeAt()
      if (remote && new Date(remote.updatedAt).getTime() > new Date(localChangedAt).getTime()) {
        setState(migrate(remote.state))
      } else {
        pushRemoteState(state)
      }
      // Re-assert a language picked in the bot ( ?startapp=lang_xx ) — a newer remote copy just
      // above would otherwise have overwritten it with the previously-saved language.
      if (pendingLangRef.current) {
        const lang = pendingLangRef.current
        pendingLangRef.current = null
        setState((prev) => (prev.settings.language === lang ? prev : { ...prev, settings: { ...prev.settings, language: lang } }))
      }
      initialSyncDone.current = true
    })
    return () => {
      cancelled = true
    }
    // Deliberately run once on mount — this is a one-time "who's newer" decision at launch, not a
    // reaction to every subsequent state change (the debounced effect below handles those).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Every subsequent local change gets pushed up after a short pause (so several allocations
  // firing back-to-back — payday auto-allocation, for instance — coalesce into one push instead
  // of one per transaction).
  useEffect(() => {
    if (!initialSyncDone.current) return
    const timer = setTimeout(() => {
      pushRemoteState(state)
    }, 1500)
    return () => clearTimeout(timer)
  }, [state])

  // App.tsx sits above the I18nProvider it renders below (see the return statement), so it
  // can't call useT()/useI18n() itself — it builds its own translator straight from
  // state.settings.language instead. Every screen underneath gets the same dictionary via the
  // provider/useT(), so there's only ever one language value driving both.
  const language = state.settings.language || DEFAULT_LANGUAGE
  const t = useMemo(() => createTranslator(language), [language])
  const locale = useMemo(() => localeForLanguage(language), [language])

  // TEMP (stage 16.1): manual `?onboarding=1` gate so the wizard skeleton can be viewed in the
  // browser. Stage 16.3 replaces this with real first-run detection (empty AppState) plus a
  // "run the wizard again" entry point in Settings.
  const showOnboardingSkeleton =
    typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('onboarding')

  const insights = useMemo(() => generateInsights(state, t, locale), [state, t, locale])
  const reminders = useMemo(() => generateReminders(state, t), [state, t])

  // Ids of everything currently showing on the Notifications page — opening that page marks
  // all of these read at once (see the effect below), and the sidebar badge only counts the
  // ones not yet in state.readNotificationIds.
  const currentNotificationIds = useMemo(
    () => [...insights.map((i) => i.id), ...reminders.map((r) => r.id)],
    [insights, reminders]
  )
  const unreadCount = useMemo(() => {
    const read = new Set(state.readNotificationIds)
    return currentNotificationIds.filter((id) => !read.has(id)).length
  }, [currentNotificationIds, state.readNotificationIds])

  function markNotificationsRead() {
    setState((prev) => {
      const read = new Set(prev.readNotificationIds)
      let changed = false
      for (const id of currentNotificationIds) {
        if (!read.has(id)) {
          read.add(id)
          changed = true
        }
      }
      if (!changed) return prev
      return { ...prev, readNotificationIds: Array.from(read) }
    })
  }

  useEffect(() => {
    if (view === 'notifications') markNotificationsRead()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, currentNotificationIds])

  // Surface the top 2 new warning/positive insights as toasts once per session
  useEffect(() => {
    const notable = insights.filter((i) => i.tone !== 'info').slice(0, 2)
    const fresh = notable.filter((i) => !seenToastIds.has(i.title))
    if (fresh.length > 0) {
      setToasts((prev) => [...prev, ...fresh.map((f) => ({ id: f.id, title: f.title, tone: f.tone }))])
      setSeenToastIds((prev) => {
        const next = new Set(prev)
        fresh.forEach((f) => next.add(f.title))
        return next
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function dismissToast(id: string) {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }

  function addTransaction(t: Omit<Transaction, 'id'>) {
    setState((prev) => ({ ...prev, transactions: [{ ...t, id: uid() }, ...prev.transactions] }))
  }

  function updateTransaction(id: string, patch: Partial<Transaction>) {
    setState((prev) => ({
      ...prev,
      transactions: prev.transactions.map((t) => (t.id === id ? { ...t, ...patch } : t)),
    }))
  }

  function deleteTransaction(id: string) {
    setState((prev) => ({ ...prev, transactions: prev.transactions.filter((t) => t.id !== id) }))
  }

  function setBudgets(budgets: CategoryBudget[]) {
    setState((prev) => ({ ...prev, budgets }))
  }

  function addCategory(def: CategoryDef) {
    setState((prev) => {
      const exists = prev.categories.some((c) => c.name.toLowerCase() === def.name.toLowerCase())
      if (exists) return prev
      return { ...prev, categories: [...prev.categories, def] }
    })
  }

  function addGoal(g: Omit<Goal, 'id' | 'createdAt'>) {
    setState((prev) => ({
      ...prev,
      goals: [...prev.goals, { ...g, id: uid(), createdAt: new Date().toISOString() }],
    }))
  }

  function updateGoal(id: string, patch: Partial<Goal>) {
    setState((prev) => ({ ...prev, goals: prev.goals.map((g) => (g.id === id ? { ...g, ...patch } : g)) }))
  }

  function deleteGoal(id: string) {
    setState((prev) => ({
      ...prev,
      goals: prev.goals.filter((g) => g.id !== id),
      reminderRules: prev.reminderRules.filter((r) => !(r.targetKind === 'goal' && r.targetId === id)),
    }))
  }

  function addImportantDate(d: Omit<ImportantDate, 'id' | 'createdAt'>) {
    setState((prev) => ({
      ...prev,
      importantDates: [...prev.importantDates, { ...d, id: uid(), createdAt: new Date().toISOString() }],
    }))
  }

  function updateImportantDate(id: string, patch: Partial<ImportantDate>) {
    setState((prev) => ({
      ...prev,
      importantDates: prev.importantDates.map((d) => (d.id === id ? { ...d, ...patch } : d)),
    }))
  }

  function deleteImportantDate(id: string) {
    setState((prev) => ({
      ...prev,
      importantDates: prev.importantDates.filter((d) => d.id !== id),
      reminderRules: prev.reminderRules.filter((r) => !(r.targetKind === 'importantDate' && r.targetId === id)),
    }))
  }

  // Money moving into a goal or important date — whether the person taps "add money" on the
  // card themselves, or it happens via the payday auto-allocation banner below — has to leave
  // an actual expense transaction behind. Bumping savedAmount alone (the old behavior) left the
  // money still counted in the Dashboard balance and this month's spending, so the same euros
  // were effectively double-counted as both "still spendable" and "already saved". This is the
  // one place both paths go through, so the two can't drift apart again the way Dashboard/Reports
  // income once did (see settingsIncomeForPeriod).
  function allocateToGoal(goalId: string, amount: number) {
    const goal = state.goals.find((g) => g.id === goalId)
    if (!goal || amount <= 0) return
    updateGoal(goalId, { savedAmount: goal.savedAmount + amount })
    addTransaction({
      type: 'expense',
      category: SAVINGS_CATEGORY,
      amount,
      date: todayLocalDateString(),
      // Real transaction data (shown later in Transactions/Dashboard), not fixed UI chrome — see
      // t.common.setAsideFor's doc comment in en.ts for why this gets translated at write time.
      note: t.common.setAsideFor(goal.name),
    })
  }

  function allocateToImportantDate(dateId: string, amount: number) {
    const date = state.importantDates.find((d) => d.id === dateId)
    if (!date || amount <= 0) return
    updateImportantDate(dateId, { savedAmount: (date.savedAmount ?? 0) + amount })
    addTransaction({
      type: 'expense',
      category: SAVINGS_CATEGORY,
      amount,
      date: todayLocalDateString(),
      note: t.common.setAsideFor(date.name),
    })
  }

  function setReminderRule(targetKind: ReminderTargetKind, targetId: string, offsets: ReminderOffsetKey[]) {
    setState((prev) => ({
      ...prev,
      reminderRules: [
        ...prev.reminderRules.filter((r) => !(r.targetKind === targetKind && r.targetId === targetId)),
        { targetKind, targetId, offsets },
      ],
    }))
  }

  function removeReminderRule(targetKind: ReminderTargetKind, targetId: string) {
    setState((prev) => ({
      ...prev,
      reminderRules: prev.reminderRules.filter((r) => !(r.targetKind === targetKind && r.targetId === targetId)),
    }))
  }

  function updateSettings(patch: Partial<AppState['settings']>) {
    setState((prev) => ({ ...prev, settings: { ...prev.settings, ...patch } }))
  }

  // Extra income sources — a second job, freelance work — each with its own payday, for
  // people with more than one income.
  function addIncomeSource(s: Omit<IncomeSource, 'id'>) {
    setState((prev) => ({ ...prev, incomeSources: [...prev.incomeSources, { ...s, id: uid() }] }))
  }

  function deleteIncomeSource(id: string) {
    setState((prev) => ({ ...prev, incomeSources: prev.incomeSources.filter((s) => s.id !== id) }))
  }

  // Marks every currently-due payday (basic salary and/or any extra income source whose day
  // has arrived) as handled for this month, so the prompt doesn't repeat until next month —
  // or until a later payday from a different income source comes due.
  function markDuePaydaysHandled() {
    const due = duePaydaySources(state.settings.salaryDay, state.incomeSources, state.settings.handledPaydays, new Date(), t)
    const monthK = monthKey(new Date())
    const handledPaydays = { ...(state.settings.handledPaydays || {}) }
    for (const s of due) handledPaydays[s.key] = monthK
    updateSettings({ handledPaydays })
  }

  // On (or after) payday, offer to move this month's planned goal/important-date
  // contributions out of "spendable" and into each target's saved amount. excludeKeys lets
  // the person skip specific items (as `${kind}:${id}`) they don't want to fund this time.
  // Goes through allocateToGoal/allocateToImportantDate above so this actually deducts from
  // spendable (a real "Savings" transaction), not just bumps savedAmount in isolation.
  function applyAutoAllocations(excludeKeys: string[] = []) {
    const excluded = new Set(excludeKeys)
    const plan = planForMonth(state, startOfMonth(new Date()))
    for (const item of plan.goalItems) {
      if (excluded.has(`${item.kind}:${item.id}`)) continue
      allocateToGoal(item.id, item.amount)
    }
    for (const item of plan.dateItems) {
      if (excluded.has(`${item.kind}:${item.id}`)) continue
      allocateToImportantDate(item.id, item.amount)
    }
    markDuePaydaysHandled()
  }

  function dismissSalaryPrompt() {
    markDuePaydaysHandled()
  }

  // Marks one completed budget period as reviewed (surplus moved, overspend acknowledged, or
  // just dismissed) so its banner (Dashboard, see pendingBudgetPeriodReviews) doesn't come back
  // for that same occurrence — mirrors markDuePaydaysHandled's "record which occurrence was
  // already handled" role for the payday prompt.
  function markBudgetPeriodReviewed(review: BudgetPeriodReview) {
    setState((prev) => ({
      ...prev,
      settings: {
        ...prev.settings,
        handledBudgetPeriods: { ...(prev.settings.handledBudgetPeriods || {}), [review.key]: review.instanceKey },
      },
    }))
  }

  function dismissBudgetPeriodReview(review: BudgetPeriodReview) {
    markBudgetPeriodReviewed(review)
  }

  // Moves a completed period's unspent budget into a goal's saved amount — goes through
  // allocateToGoal, the same real-transaction mechanism the payday banner uses, so the money
  // actually leaves spendable balance instead of just relabeling a number.
  function moveBudgetSurplusToGoal(review: BudgetPeriodReview, goalId: string) {
    if (review.remaining <= 0) return
    allocateToGoal(goalId, review.remaining)
    markBudgetPeriodReviewed(review)
  }

  function moveBudgetSurplusToImportantDate(review: BudgetPeriodReview, dateId: string) {
    if (review.remaining <= 0) return
    allocateToImportantDate(dateId, review.remaining)
    markBudgetPeriodReviewed(review)
  }

  // Overspent a period? Shrink the budget's ongoing limit by exactly the overage, so future
  // periods absorb the difference and the running total stays roughly on track. A budget's
  // limit here is one ongoing figure, not versioned per period, so "reduce next period" is the
  // same lever as editing the limit by hand in BudgetsView — just computed automatically.
  function reduceBudgetLimitForOverspend(review: BudgetPeriodReview) {
    const overage = -review.remaining
    if (overage <= 0) return
    setState((prev) => ({
      ...prev,
      budgets: prev.budgets.map((b) => (budgetKey(b) === review.key ? { ...b, limit: Math.max(b.limit - overage, 0) } : b)),
    }))
    markBudgetPeriodReviewed(review)
  }

  function setTheme(theme: ThemeKey) {
    setState((prev) => ({ ...prev, settings: { ...prev.settings, theme } }))
  }

  function resetData() {
    // Explicitly save a genuinely empty AppState rather than clearState()+reload — clearing
    // localStorage and reloading used to fall into loadState()'s "no saved state" branch, which
    // is also what a brand-new visitor hits, so it silently restored the demo dataset
    // (mockState()) instead of actually resetting anything. saveState() also stamps a fresh
    // last-changed timestamp, so if this happens inside Telegram the empty state correctly wins
    // the next sync instead of the old cloud copy overwriting it back in.
    saveState(emptyState())
    window.location.reload()
  }

  if (showOnboardingSkeleton) {
    return (
      <I18nProvider lang={language}>
        <OnboardingWizard onComplete={() => { window.location.href = window.location.pathname }} />
      </I18nProvider>
    )
  }

  return (
    <I18nProvider lang={language}>
    <div className="min-h-screen bg-paper flex text-ink font-body">
      <Sidebar
        view={view}
        setView={setView}
        notificationCount={unreadCount}
        theme={state.settings.theme}
        setTheme={setTheme}
      />

      {/* ml-16 clears the fixed icon rail (see Sidebar.tsx) — same width at every breakpoint now,
          so this no longer needs a separate lg: value the way the old wide desktop sidebar did. */}
      <main className="flex-1 min-w-0 ml-16 pb-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-10 py-6 lg:py-10">
          {view === 'dashboard' && (
            <Dashboard
              state={state}
              insights={insights}
              addTransaction={addTransaction}
              addCategory={addCategory}
              setView={setView}
              applyAutoAllocations={applyAutoAllocations}
              dismissSalaryPrompt={dismissSalaryPrompt}
              moveBudgetSurplusToGoal={moveBudgetSurplusToGoal}
              moveBudgetSurplusToImportantDate={moveBudgetSurplusToImportantDate}
              reduceBudgetLimitForOverspend={reduceBudgetLimitForOverspend}
              dismissBudgetPeriodReview={dismissBudgetPeriodReview}
            />
          )}
          {view === 'transactions' && (
            <TransactionsView
              state={state}
              addTransaction={addTransaction}
              updateTransaction={updateTransaction}
              deleteTransaction={deleteTransaction}
              addCategory={addCategory}
            />
          )}
          {view === 'reports' && <ReportsView state={state} />}
          {view === 'budgets' && <BudgetsView state={state} setBudgets={setBudgets} addCategory={addCategory} />}
          {view === 'goals' && (
            <GoalsView
              state={state}
              addGoal={addGoal}
              updateGoal={updateGoal}
              deleteGoal={deleteGoal}
              allocateToGoal={allocateToGoal}
              prefill={allocateIntent?.kind === 'goal' ? { id: allocateIntent.id, amount: allocateIntent.amount } : null}
              onPrefillConsumed={() => setAllocateIntent(null)}
            />
          )}
          {view === 'important-dates' && (
            <ImportantDatesView
              state={state}
              addImportantDate={addImportantDate}
              updateImportantDate={updateImportantDate}
              deleteImportantDate={deleteImportantDate}
              allocateToImportantDate={allocateToImportantDate}
              allocatePrefill={allocateIntent?.kind === 'importantDate' ? { id: allocateIntent.id, amount: allocateIntent.amount } : null}
              onPrefillConsumed={() => setAllocateIntent(null)}
            />
          )}
          {view === 'calendar' && <CalendarView state={state} />}
          {view === 'notifications' && (
            <NotificationsView insights={insights} reminders={reminders} currency={state.settings.currency} />
          )}
          {view === 'settings' && (
            <SettingsView
              state={state}
              updateSettings={updateSettings}
              resetData={resetData}
              setTheme={setTheme}
              addCategory={addCategory}
              setReminderRule={setReminderRule}
              removeReminderRule={removeReminderRule}
              addIncomeSource={addIncomeSource}
              deleteIncomeSource={deleteIncomeSource}
            />
          )}
        </div>
      </main>

      <ToastStack toasts={toasts} dismiss={dismissToast} />
    </div>
    </I18nProvider>
  )
}
