import { useEffect, useMemo, useRef, useState } from 'react'
import {
  AppState,
  Transaction,
  CategoryBudget,
  Goal,
  CategoryDef,
  ImportantDate,
  IncomeSource,
  ReminderOffsetKey,
  ReminderTargetKind,
  SAVINGS_CATEGORY,
  ThemeKey,
} from './types'
import { loadState, saveState, uid, clearState, STORAGE_KEY, migrate, getLastLocalChangeAt } from './lib/storage'
import { todayLocalDateString } from './lib/utils'
import { pullRemoteState, pushRemoteState } from './lib/sync'
import { generateInsights } from './lib/insights'
import { generateReminders } from './lib/goalReminders'
import { planForMonth, startOfMonth, monthKey, duePaydaySources } from './lib/planning'
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

  const insights = useMemo(() => generateInsights(state), [state])
  const reminders = useMemo(() => generateReminders(state), [state])

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
      note: `Set aside for "${goal.name}"`,
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
      note: `Set aside for "${date.name}"`,
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
    const due = duePaydaySources(state.settings.salaryDay, state.incomeSources, state.settings.handledPaydays)
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

  function setTheme(theme: ThemeKey) {
    setState((prev) => ({ ...prev, settings: { ...prev.settings, theme } }))
  }

  function resetData() {
    clearState()
    window.location.reload()
  }

  return (
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
            />
          )}
          {view === 'important-dates' && (
            <ImportantDatesView
              state={state}
              addImportantDate={addImportantDate}
              updateImportantDate={updateImportantDate}
              deleteImportantDate={deleteImportantDate}
              allocateToImportantDate={allocateToImportantDate}
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
  )
}
