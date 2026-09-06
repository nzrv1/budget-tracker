import { useEffect, useRef, useState } from 'react'
import { LayoutGrid, Receipt, PieChart, Wallet, Target, CalendarDays, Calendar, Bell, Settings, BookOpen, Palette, Check, MoreHorizontal, X } from 'lucide-react'
import { ViewKey } from '../App'
import { ThemeKey } from '../types'
import { THEMES } from '../lib/themes'

const NAV: { key: ViewKey; label: string; icon: React.ElementType }[] = [
  { key: 'dashboard', label: 'Dashboard', icon: LayoutGrid },
  { key: 'transactions', label: 'Transactions', icon: Receipt },
  { key: 'reports', label: 'Reports', icon: PieChart },
  { key: 'budgets', label: 'Budgets', icon: Wallet },
  { key: 'goals', label: 'Goals', icon: Target },
  { key: 'important-dates', label: 'Important Dates', icon: CalendarDays },
  { key: 'calendar', label: 'Calendar', icon: Calendar },
  { key: 'notifications', label: 'Notifications', icon: Bell },
  { key: 'settings', label: 'Settings', icon: Settings },
]

// The mobile bottom bar only has room for a handful of items before labels start
// colliding (9 items at 10px labels doesn't fit a 375px-wide screen). These four
// are the ones used most often; everything else lives behind "More".
const MOBILE_PRIMARY: ViewKey[] = ['dashboard', 'transactions', 'reports', 'budgets']

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
  const [moreOpen, setMoreOpen] = useState(false)
  const primaryNav = NAV.filter((n) => MOBILE_PRIMARY.includes(n.key))
  const moreNav = NAV.filter((n) => !MOBILE_PRIMARY.includes(n.key))
  const moreActive = moreNav.some((n) => n.key === view)

  function pickMobile(key: ViewKey) {
    setView(key)
    setMoreOpen(false)
  }

  return (
    <>
      {/* Desktop sidebar — dark "ledger spine" chrome; its shade adapts per theme (see index.css) */}
      <aside className="hidden lg:flex flex-col fixed left-0 top-0 h-screen w-64 bg-nav text-nav-text px-5 py-7">
        <div className="flex items-center justify-between px-2 mb-10">
          <div className="flex items-center gap-2.5">
            <BookOpen size={22} className="text-gold" strokeWidth={1.75} />
            <span className="font-display font-semibold text-lg tracking-tight">Ledger</span>
          </div>
          <ThemePickerButton theme={theme} setTheme={setTheme} />
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
        <ThemePickerButton theme={theme} setTheme={setTheme} />
      </div>

      {/* Mobile bottom nav — only the 4 most-used sections plus "More", so labels have room to
          breathe (all 9 sections in one row didn't fit a phone-width screen). The safe-area
          padding keeps it clear of the home-indicator bar on notched iPhones. */}
      <nav
        className="lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-nav text-nav-text flex items-center justify-around px-1 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] border-t border-nav-text/10"
      >
        {primaryNav.map(({ key, label, icon: Icon }) => {
          const active = view === key
          return (
            <button
              key={key}
              onClick={() => pickMobile(key)}
              className={`flex flex-col items-center gap-0.5 px-2 py-1 rounded relative ${
                active ? 'text-gold' : 'text-nav-text/50'
              }`}
            >
              <Icon size={19} strokeWidth={1.75} />
              <span className="text-[10px] font-medium">{label}</span>
            </button>
          )
        })}
        <button
          onClick={() => setMoreOpen(true)}
          className={`flex flex-col items-center gap-0.5 px-2 py-1 rounded relative ${
            moreActive ? 'text-gold' : 'text-nav-text/50'
          }`}
        >
          <MoreHorizontal size={19} strokeWidth={1.75} />
          <span className="text-[10px] font-medium">More</span>
          {notificationCount > 0 && <span className="absolute top-0 right-1 w-1.5 h-1.5 rounded-full bg-clay" />}
        </button>
      </nav>

      {/* Mobile "More" sheet — the remaining sections (Goals, Important Dates, Calendar,
          Notifications, Settings) that don't fit in the bottom bar. */}
      {moreOpen && (
        <div className="lg:hidden fixed inset-0 z-40 flex items-end justify-center bg-black/40 backdrop-blur-[2px]" onClick={() => setMoreOpen(false)}>
          <div
            className="bg-paper-card w-full rounded-t-lg border border-paper-line max-h-[75vh] overflow-y-auto pb-[env(safe-area-inset-bottom)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-paper-line">
              <h3 className="font-display font-semibold text-lg text-ink">More</h3>
              <button onClick={() => setMoreOpen(false)} className="p-2 -m-2 text-ink-softer hover:text-ink" aria-label="Close">
                <X size={18} />
              </button>
            </div>
            <div className="p-2">
              {moreNav.map(({ key, label, icon: Icon }) => {
                const active = view === key
                return (
                  <button
                    key={key}
                    onClick={() => pickMobile(key)}
                    className={`w-full flex items-center gap-3 px-3 py-3 rounded text-sm relative ${
                      active ? 'bg-sage-light text-sage-dark font-medium' : 'text-ink'
                    }`}
                  >
                    <Icon size={18} strokeWidth={1.75} />
                    {label}
                    {key === 'notifications' && notificationCount > 0 && (
                      <span className="ml-auto text-[11px] font-tabular bg-clay text-white rounded-full px-1.5 py-0.5 leading-none">
                        {notificationCount}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </>
  )
}

function ThemePickerButton({ theme, setTheme }: { theme: ThemeKey; setTheme: (t: ThemeKey) => void }) {
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
        aria-label="Choose theme"
        className="w-8 h-8 rounded flex items-center justify-center text-nav-text/60 hover:text-nav-text hover:bg-nav-light transition-colors shrink-0"
      >
        <Palette size={16} strokeWidth={1.75} />
      </button>

      {open && (
        <div className="absolute right-0 mt-1.5 w-44 bg-paper-card border border-paper-line rounded-lg shadow-lg shadow-ink/20 overflow-hidden z-40 text-ink">
          {THEMES.map((t) => (
            <button
              key={t.key}
              onClick={() => {
                setTheme(t.key)
                setOpen(false)
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-paper text-left"
            >
              <span className="flex shrink-0 -space-x-1">
                {t.preview.map((c, i) => (
                  <span key={i} className="w-3 h-3 rounded-full border border-paper-card" style={{ background: c }} />
                ))}
              </span>
              <span className="flex-1 truncate">{t.label}</span>
              {theme === t.key && <Check size={14} className="text-sage-dark shrink-0" />}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
