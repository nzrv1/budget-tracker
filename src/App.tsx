import { useEffect, useMemo, useState } from 'react'
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
  ThemeKey,
} from './types'
import { loadState, saveState, uid, clearState } from './lib/storage'
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

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', state.settings.theme)
  }, [state.settings.theme])

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
  function applyAutoAllocations(excludeKeys: string[] = []) {
    const excluded = new Set(excludeKeys)
    const plan = planForMonth(state, startOfMonth(new Date()))
    for (const item of plan.goalItems) {
      if (excluded.has(`${item.kind}:${item.id}`)) continue
      const goal = state.goals.find((g) => g.id === item.id)
      if (goal) updateGoal(goal.id, { savedAmount: goal.savedAmount + item.amount })
    }
    for (const item of plan.dateItems) {
      if (excluded.has(`${item.kind}:${item.id}`)) continue
      const date = state.importantDates.find((d) => d.id === item.id)
      if (date) updateImportantDate(date.id, { savedAmount: (date.savedAmount ?? 0) + item.amount })
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

      <main className="flex-1 min-w-0 lg:ml-64 pb-24 lg:pb-8">
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
            <GoalsView state={state} addGoal={addGoal} updateGoal={updateGoal} deleteGoal={deleteGoal} />
          )}
          {view === 'important-dates' && (
            <ImportantDatesView
              state={state}
              addImportantDate={addImportantDate}
              updateImportantDate={updateImportantDate}
              deleteImportantDate={deleteImportantDate}
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
