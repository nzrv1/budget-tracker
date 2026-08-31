import { useEffect, useMemo, useState } from 'react'
import { AppState, Transaction, CategoryBudget, Goal, CategoryDef } from './types'
import { loadState, saveState, uid, clearState } from './lib/storage'
import { generateInsights } from './lib/insights'
import Sidebar from './components/Sidebar'
import Dashboard from './components/Dashboard'
import TransactionsView from './components/TransactionsView'
import ReportsView from './components/ReportsView'
import BudgetsView from './components/BudgetsView'
import GoalsView from './components/GoalsView'
import NotificationsView from './components/NotificationsView'
import SettingsView from './components/SettingsView'
import ToastStack from './components/ToastStack'

export type ViewKey = 'dashboard' | 'transactions' | 'reports' | 'budgets' | 'goals' | 'notifications' | 'settings'

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
    setState((prev) => ({ ...prev, goals: prev.goals.filter((g) => g.id !== id) }))
  }

  function updateSettings(patch: Partial<AppState['settings']>) {
    setState((prev) => ({ ...prev, settings: { ...prev.settings, ...patch } }))
  }

  function toggleTheme() {
    setState((prev) => ({
      ...prev,
      settings: { ...prev.settings, theme: prev.settings.theme === 'dark' ? 'light' : 'dark' },
    }))
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
        notificationCount={insights.filter((i) => i.tone === 'warning').length}
        theme={state.settings.theme}
        toggleTheme={toggleTheme}
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
          {view === 'notifications' && <NotificationsView insights={insights} />}
          {view === 'settings' && (
            <SettingsView state={state} updateSettings={updateSettings} resetData={resetData} toggleTheme={toggleTheme} />
          )}
        </div>
      </main>

      <ToastStack toasts={toasts} dismiss={dismissToast} />
    </div>
  )
}
