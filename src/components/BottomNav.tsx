import {
  LayoutGrid,
  Receipt,
  Wallet,
  Target,
  Calendar,
  PieChart,
  CalendarDays,
} from 'lucide-react'
import { ViewKey } from '../App'
import { Dictionary, useT } from '../lib/i18n'

// The phone navigation (`< lg`) — one strip with all seven sections. Replaces the fixed side
// rail (desktop only now). Notifications and Settings are reached from the Dashboard header
// (bell + gear), not from here. Sits above the safe-area inset so it clears the home
// indicator; App.tsx pads the content area to match its height.

type NavKey = Exclude<ViewKey, 'notifications' | 'settings'>

const TABS: { key: NavKey; icon: React.ElementType }[] = [
  { key: 'dashboard', icon: LayoutGrid },
  { key: 'transactions', icon: Receipt },
  { key: 'budgets', icon: Wallet },
  { key: 'goals', icon: Target },
  { key: 'calendar', icon: Calendar },
  { key: 'reports', icon: PieChart },
  { key: 'important-dates', icon: CalendarDays },
]

function shortLabel(t: Dictionary, key: NavKey): string {
  const map: Record<NavKey, string> = {
    dashboard: t.navShort.dashboard,
    transactions: t.navShort.transactions,
    budgets: t.navShort.budgets,
    goals: t.navShort.goals,
    calendar: t.navShort.calendar,
    reports: t.navShort.reports,
    'important-dates': t.navShort.importantDates,
  }
  return map[key]
}

function fullLabel(t: Dictionary, key: NavKey): string {
  const map: Record<NavKey, string> = {
    dashboard: t.nav.dashboard,
    transactions: t.nav.transactions,
    budgets: t.nav.budgets,
    goals: t.nav.goals,
    calendar: t.nav.calendar,
    reports: t.nav.reports,
    'important-dates': t.nav.importantDates,
  }
  return map[key]
}

export default function BottomNav({ view, setView }: { view: ViewKey; setView: (v: ViewKey) => void }) {
  const t = useT()

  return (
    <nav
      className="lg:hidden fixed bottom-0 inset-x-0 z-30 bg-paper-card border-t border-paper-line pb-[env(safe-area-inset-bottom)]"
      aria-label={t.nav.appName}
    >
      <div className="flex items-stretch h-[54px]">
        {TABS.map(({ key, icon: Icon }) => {
          const active = view === key
          return (
            <button
              key={key}
              onClick={() => setView(key)}
              aria-label={fullLabel(t, key)}
              aria-current={active ? 'page' : undefined}
              className={`flex-1 min-w-0 flex flex-col items-center justify-center gap-0.5 transition-colors ${
                active ? 'text-sage-dark' : 'text-ink-softer'
              }`}
            >
              <Icon size={18} strokeWidth={active ? 2 : 1.75} className="shrink-0" />
              <span className="text-[9px] leading-none font-medium max-w-full truncate">{shortLabel(t, key)}</span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
