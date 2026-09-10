import { useEffect, useState } from 'react'
import {
  LayoutGrid,
  Receipt,
  Wallet,
  Target,
  Calendar,
  MoreHorizontal,
  PieChart,
  CalendarDays,
  Bell,
  Settings as SettingsIcon,
  X,
} from 'lucide-react'
import { ViewKey } from '../App'
import { Dictionary, useT } from '../lib/i18n'
import { showTelegramBackButton } from '../lib/telegram'

// The phone navigation (`< lg`) — five primary tabs plus a "More" sheet for the rest. Replaces
// the fixed side rail (see Sidebar.tsx), which is desktop-only now. Sits above the safe-area
// inset so it clears the home indicator; App.tsx pads the content area to match its height.

const PRIMARY: { key: ViewKey; icon: React.ElementType }[] = [
  { key: 'dashboard', icon: LayoutGrid },
  { key: 'transactions', icon: Receipt },
  { key: 'budgets', icon: Wallet },
  { key: 'goals', icon: Target },
  { key: 'calendar', icon: Calendar },
]

const MORE: { key: ViewKey; icon: React.ElementType }[] = [
  { key: 'reports', icon: PieChart },
  { key: 'important-dates', icon: CalendarDays },
  { key: 'notifications', icon: Bell },
  { key: 'settings', icon: SettingsIcon },
]

function label(t: Dictionary, key: ViewKey): string {
  const map: Record<ViewKey, string> = {
    dashboard: t.nav.dashboard,
    transactions: t.nav.transactions,
    reports: t.nav.reports,
    budgets: t.nav.budgets,
    goals: t.nav.goals,
    'important-dates': t.nav.importantDates,
    calendar: t.nav.calendar,
    notifications: t.nav.notifications,
    settings: t.nav.settings,
  }
  return map[key]
}

export default function BottomNav({
  view,
  setView,
  notificationCount,
}: {
  view: ViewKey
  setView: (v: ViewKey) => void
  notificationCount: number
}) {
  const t = useT()
  const [moreOpen, setMoreOpen] = useState(false)
  const moreActive = MORE.some((m) => m.key === view)

  return (
    <>
      <nav
        className="lg:hidden fixed bottom-0 inset-x-0 z-30 bg-paper-card border-t border-paper-line
                   pb-[env(safe-area-inset-bottom)]"
        aria-label={t.nav.appName}
      >
        <div className="flex items-stretch h-14">
          {PRIMARY.map(({ key, icon: Icon }) => {
            const active = view === key
            return (
              <button
                key={key}
                onClick={() => {
                  setMoreOpen(false)
                  setView(key)
                }}
                aria-label={label(t, key)}
                aria-current={active ? 'page' : undefined}
                className={`flex-1 flex flex-col items-center justify-center gap-0.5 text-[10px] font-medium transition-colors ${
                  active ? 'text-sage-dark' : 'text-ink-softer'
                }`}
              >
                <Icon size={20} strokeWidth={active ? 2 : 1.75} />
                <span className="leading-none">{label(t, key)}</span>
              </button>
            )
          })}
          <button
            onClick={() => setMoreOpen(true)}
            aria-label={t.nav.more}
            aria-expanded={moreOpen}
            className={`relative flex-1 flex flex-col items-center justify-center gap-0.5 text-[10px] font-medium transition-colors ${
              moreActive || moreOpen ? 'text-sage-dark' : 'text-ink-softer'
            }`}
          >
            <MoreHorizontal size={20} strokeWidth={1.75} />
            <span className="leading-none">{t.nav.more}</span>
            {notificationCount > 0 && (
              <span className="absolute top-1.5 right-[calc(50%-16px)] w-1.5 h-1.5 rounded-full bg-clay" />
            )}
          </button>
        </div>
      </nav>

      {moreOpen && (
        <MoreSheet
          onClose={() => setMoreOpen(false)}
          onPick={(k) => {
            setMoreOpen(false)
            setView(k)
          }}
          current={view}
          notificationCount={notificationCount}
        />
      )}
    </>
  )
}

function MoreSheet({
  onClose,
  onPick,
  current,
  notificationCount,
}: {
  onClose: () => void
  onPick: (k: ViewKey) => void
  current: ViewKey
  notificationCount: number
}) {
  const t = useT()

  // The system back gesture inside Telegram should close this sheet, not leave the Mini App.
  useEffect(() => showTelegramBackButton(onClose), [onClose])

  return (
    <div className="lg:hidden fixed inset-0 z-40 flex items-end bg-black/40 backdrop-blur-[2px]" onClick={onClose}>
      <div
        className="w-full bg-paper-card rounded-t-lg border-t border-paper-line pb-[env(safe-area-inset-bottom)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-paper-line">
          <span className="font-display font-semibold text-base">{t.nav.more}</span>
          <button onClick={onClose} aria-label={t.common.cancel} className="-mr-2 flex h-11 w-11 items-center justify-center text-ink-softer hover:text-ink">
            <X size={18} />
          </button>
        </div>
        <div className="p-2">
          {MORE.map(({ key, icon: Icon }) => {
            const active = current === key
            return (
              <button
                key={key}
                onClick={() => onPick(key)}
                aria-label={label(t, key)}
                className={`w-full flex items-center gap-3 px-3 min-h-[48px] rounded-lg text-sm font-medium transition-colors ${
                  active ? 'bg-sage-light text-sage-dark' : 'text-ink hover:bg-paper'
                }`}
              >
                <Icon size={19} strokeWidth={1.75} className="shrink-0" />
                <span className="flex-1 text-left">{label(t, key)}</span>
                {key === 'notifications' && notificationCount > 0 && (
                  <span
                    aria-hidden="true"
                    className="shrink-0 min-w-[20px] h-5 px-1.5 rounded-full bg-clay text-white text-xs font-semibold flex items-center justify-center"
                  >
                    {notificationCount}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
