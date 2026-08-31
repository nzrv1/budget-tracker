import { LayoutGrid, Receipt, PieChart, Wallet, Target, Bell, Settings, BookOpen } from 'lucide-react'
import { ViewKey } from '../App'

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
}: {
  view: ViewKey
  setView: (v: ViewKey) => void
  notificationCount: number
}) {
  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col fixed left-0 top-0 h-screen w-64 bg-ink text-paper px-5 py-7">
        <div className="flex items-center gap-2.5 px-2 mb-10">
          <BookOpen size={22} className="text-gold" strokeWidth={1.75} />
          <span className="font-display font-semibold text-lg tracking-tight">Ledger</span>
        </div>

        <nav className="flex-1 flex flex-col gap-1">
          {NAV.map(({ key, label, icon: Icon }) => {
            const active = view === key
            return (
              <button
                key={key}
                onClick={() => setView(key)}
                className={`group flex items-center gap-3 px-3 py-2.5 rounded transition-colors text-sm relative ${
                  active ? 'bg-ink-light text-paper' : 'text-paper/60 hover:text-paper hover:bg-ink-light/60'
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

        <div className="px-3 py-3 border-t border-paper/10 text-xs text-paper/40 leading-relaxed">
          Your data stays in this browser. Nothing is sent anywhere.
        </div>
      </aside>

      {/* Mobile top bar */}
      <div className="lg:hidden sticky top-0 z-30 bg-ink text-paper px-4 py-3.5 flex items-center gap-2.5">
        <BookOpen size={20} className="text-gold" strokeWidth={1.75} />
        <span className="font-display font-semibold text-base tracking-tight">Ledger</span>
      </div>

      {/* Mobile bottom nav */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-ink text-paper flex items-center justify-around px-1 py-2 border-t border-paper/10">
        {NAV.filter((n) => n.key !== 'settings').map(({ key, label, icon: Icon }) => {
          const active = view === key
          return (
            <button
              key={key}
              onClick={() => setView(key)}
              className={`flex flex-col items-center gap-0.5 px-2 py-1 rounded relative ${
                active ? 'text-gold' : 'text-paper/50'
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
            view === 'settings' ? 'text-gold' : 'text-paper/50'
          }`}
        >
          <Settings size={19} strokeWidth={1.75} />
          <span className="text-[10px] font-medium">Settings</span>
        </button>
      </nav>
    </>
  )
}
