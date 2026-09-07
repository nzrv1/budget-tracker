import { useEffect, useRef, useState } from 'react'
import { LayoutGrid, Receipt, PieChart, Wallet, Target, CalendarDays, Calendar, Bell, Settings, BookOpen, Palette, Check } from 'lucide-react'
import { ViewKey } from '../App'
import { ThemeKey } from '../types'
import { THEMES, themeLabel } from '../lib/themes'
import { Dictionary, useT } from '../lib/i18n'

function navItems(t: Dictionary): { key: ViewKey; label: string; icon: React.ElementType }[] {
  return [
    { key: 'dashboard', label: t.nav.dashboard, icon: LayoutGrid },
    { key: 'transactions', label: t.nav.transactions, icon: Receipt },
    { key: 'reports', label: t.nav.reports, icon: PieChart },
    { key: 'budgets', label: t.nav.budgets, icon: Wallet },
    { key: 'goals', label: t.nav.goals, icon: Target },
    { key: 'important-dates', label: t.nav.importantDates, icon: CalendarDays },
    { key: 'calendar', label: t.nav.calendar, icon: Calendar },
    { key: 'notifications', label: t.nav.notifications, icon: Bell },
    { key: 'settings', label: t.nav.settings, icon: Settings },
  ]
}

// One slim icon-only rail for every screen size — replaces the old wide labelled desktop
// sidebar (w-64) plus the separate mobile top bar + bottom nav + "More" sheet. A vertical rail
// scales with screen HEIGHT, not width, so all 9 sections fit directly at any width, including
// a 375px phone — no need to hide anything behind "More" the way a horizontal bottom bar did.
// Labels are dropped in favor of a native title tooltip; aria-label keeps the same accessible
// name as before so existing tests that query buttons by name still work unchanged.
export default function Sidebar({
  view,
  setView,
  notificationCount,
  theme,
  setTheme,
}: {
  view: ViewKey
  setView: (v: ViewKey) => void
  notificationCount: number
  theme: ThemeKey
  setTheme: (t: ThemeKey) => void
}) {
  const t = useT()
  const NAV = navItems(t)
  return (
    <aside
      className="fixed left-0 top-0 z-30 flex flex-col items-center w-16 h-screen bg-nav text-nav-text
                 pt-[calc(0.75rem+env(safe-area-inset-top))] pb-[calc(0.75rem+env(safe-area-inset-bottom))]"
    >
      <div className="mb-4 shrink-0" title={t.nav.appName}>
        <BookOpen size={22} className="text-gold" strokeWidth={1.75} />
      </div>

      <nav className="flex-1 flex flex-col items-center gap-1 w-full overflow-y-auto px-2">
        {NAV.map(({ key, label, icon: Icon }) => {
          const active = view === key
          return (
            <button
              key={key}
              onClick={() => setView(key)}
              title={label}
              aria-label={label}
              className={`relative w-11 h-11 shrink-0 flex items-center justify-center rounded-lg transition-colors ${
                active ? 'bg-nav-light text-gold' : 'text-nav-text/55 hover:text-nav-text hover:bg-nav-light/60'
              }`}
            >
              {active && <span className="absolute left-0 top-2 bottom-2 w-0.5 bg-gold rounded-full" />}
              <Icon size={19} strokeWidth={1.75} />
              {key === 'notifications' && notificationCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-clay" />
              )}
            </button>
          )
        })}
      </nav>

      <div className="shrink-0 mt-2">
        <ThemePickerButton theme={theme} setTheme={setTheme} />
      </div>
    </aside>
  )
}

function ThemePickerButton({ theme, setTheme }: { theme: ThemeKey; setTheme: (t: ThemeKey) => void }) {
  const t = useT()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label={t.sidebar.chooseTheme}
        className="w-11 h-11 rounded-lg flex items-center justify-center text-nav-text/60 hover:text-nav-text hover:bg-nav-light transition-colors shrink-0"
      >
        <Palette size={17} strokeWidth={1.75} />
      </button>

      {open && (
        // Flies out to the RIGHT of the rail, not right-aligned to the button — the rail sits
        // flush against the screen's left edge, so a dropdown right-aligned to a button only
        // 64px from that edge would spill off-screen to the left instead of appearing on it.
        <div className="absolute left-full bottom-0 ml-2 w-44 bg-paper-card border border-paper-line rounded-lg shadow-lg shadow-ink/20 overflow-hidden z-40 text-ink">
          {THEMES.map((meta) => (
            <button
              key={meta.key}
              onClick={() => {
                setTheme(meta.key)
                setOpen(false)
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-paper text-left"
            >
              <span className="flex shrink-0 -space-x-1">
                {meta.preview.map((c, i) => (
                  <span key={i} className="w-3 h-3 rounded-full border border-paper-card" style={{ background: c }} />
                ))}
              </span>
              <span className="flex-1 truncate">{themeLabel(t, meta.key)}</span>
              {theme === meta.key && <Check size={14} className="text-sage-dark shrink-0" />}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
