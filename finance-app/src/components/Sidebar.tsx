import { LayoutGrid, Receipt, PieChart, Wallet, Target, Bell, Settings, BookOpen, Sun, Moon } from 'lucide-react'
import { ViewKey } from '../App'
import { Settings as SettingsType } from '../types'

const NAV: { key: ViewKey; label: string; icon: React.ElementType }[] = [
  { key: 'dashboard', label: 'Dashboard', icon: LayoutGrid },
  { key: 'transactions', label: 'Transactions', icon: Receipt },
  { key: 'reports', label: 'Reports', icon: PieChart },
  { key: 'budgets', label: 'Budgets', icon: Wallet },
  { key: 'goals', label: 'Goals', icon: Target },
  { key: 'notifications', label: 'Notifications', icon: Bell },
  { key: 'settings', label: 'Settings', icon: Settings },
]

export default function Sidebar({
  view,
  setView,
  notificationCount,
  theme,
  toggleTheme,
}: {
  view: ViewKey
  setView: (v: ViewKey) => void
  notificationCount: number
  theme: SettingsType['theme']
  toggleTheme: () => void
}) {
  return (
    <>
      {/* Desktop sidebar — always dark "ledger spine", independent of light/dark content theme */}
      <aside className="hidden lg:flex flex-col fixed left-0 top-0 h-screen w-64 bg-nav text-nav-text px-5 py-7">
        <div className="flex items-center justify-between px-2 mb-10">
          <div className="flex items-center gap-2.5">
            <BookOpen size={22} className="text-gold" strokeWidth={1.75} />
            <span className="font-display font-semibold text-lg tracking-tight">Ledger</span>
          </div>
          <ThemeToggleButton theme={theme} toggleTheme={toggleTheme} />
        </div>

        <nav className="flex-1 flex flex-col gap-1">
          {NAV.map(({ key, label, icon: Icon }) => {
            const active = view === key
            return (
              <button
                key={key}
                onClick={() => setView(key)}
                className={`group flex items-center gap-3 px-3 py-2.5 rounded transition-colors text-sm relative ${
                  active ? 'bg-nav-light text-nav-text' : 'text-nav-text/60 hover:text-nav-text hover:bg-nav-light/60'
                }`}
              >
                {active && <span className="absolute left-0 top-1.5 bottom-1.5 w-0.5 bg-gold rounded-full" />}
                <Icon size={17} strokeWidth={1.75} />
                <span className="font-medium">{label}</span>
                {key === 'notifications' && notificationCount > 0 && (
                  <span className="ml-auto text-[11px] font-tabular bg-clay text-white rounded-full px-1.5 py-0.5 leading-none">
                    {notificationCount}
                  </span>
                )}
              </button>
            )
          })}
        </nav>

        <div className="px-3 py-3 border-t border-nav-text/10 text-xs text-nav-text/40 leading-relaxed">
          Your data stays in this browser. Nothing is sent anywhere.
        </div>
      </aside>

      {/* Mobile top bar */}
      <div className="lg:hidden sticky top-0 z-30 bg-nav text-nav-text px-4 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <BookOpen size={20} className="text-gold" strokeWidth={1.75} />
          <span className="font-display font-semibold text-base tracking-tight">Ledger</span>
        </div>
        <ThemeToggleButton theme={theme} toggleTheme={toggleTheme} />
      </div>

      {/* Mobile bottom nav */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-nav text-nav-text flex items-center justify-around px-1 py-2 border-t border-nav-text/10">
        {NAV.filter((n) => n.key !== 'settings').map(({ key, label, icon: Icon }) => {
          const active = view === key
          return (
            <button
              key={key}
              onClick={() => setView(key)}
              className={`flex flex-col items-center gap-0.5 px-2 py-1 rounded relative ${
                active ? 'text-gold' : 'text-nav-text/50'
              }`}
            >
              <Icon size={19} strokeWidth={1.75} />
              <span className="text-[10px] font-medium">{label}</span>
              {key === 'notifications' && notificationCount > 0 && (
                <span className="absolute top-0 right-1 w-1.5 h-1.5 rounded-full bg-clay" />
              )}
            </button>
          )
        })}
        <button
          onClick={() => setView('settings')}
          className={`flex flex-col items-center gap-0.5 px-2 py-1 rounded ${
            view === 'settings' ? 'text-gold' : 'text-nav-text/50'
          }`}
        >
          <Settings size={19} strokeWidth={1.75} />
          <span className="text-[10px] font-medium">Settings</span>
        </button>
      </nav>
    </>
  )
}

function ThemeToggleButton({ theme, toggleTheme }: { theme: SettingsType['theme']; toggleTheme: () => void }) {
  const isDark = theme === 'dark'
  return (
    <button
      onClick={toggleTheme}
      aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
      className="w-8 h-8 rounded flex items-center justify-center text-nav-text/60 hover:text-nav-text hover:bg-nav-light transition-colors shrink-0"
    >
      {isDark ? <Sun size={16} strokeWidth={1.75} /> : <Moon size={16} strokeWidth={1.75} />}
    </button>
  )
}
