import { useState } from 'react'
import {
  Plane,
  Shirt,
  Palmtree,
  Laptop,
  Home,
  Gift,
  Circle,
  ChevronDown,
  Car,
  GraduationCap,
  HeartPulse,
  Umbrella,
  PawPrint,
  Palette,
  Smartphone,
  Music,
  Dumbbell,
  Baby,
  HeartHandshake,
  Briefcase,
  Wrench,
  CreditCard,
  PiggyBank,
  Shield,
  TreePine,
  Sparkles,
  Building2,
  BookOpen,
  Gamepad2,
  Utensils,
  Users,
  ShoppingBag,
  Bike,
} from 'lucide-react'
import { GoalIcon } from '../types'
import { Dictionary } from '../lib/i18n'

export function ProgressBar({
  ratio,
  tone = 'sage',
}: {
  ratio: number
  tone?: 'sage' | 'gold' | 'clay'
}) {
  const clamped = Math.min(Math.max(ratio, 0), 1)
  const colors: Record<string, string> = {
    sage: 'bg-sage',
    gold: 'bg-gold',
    clay: 'bg-clay',
  }
  return (
    <div className="w-full h-2 bg-paper-line rounded-full overflow-hidden">
      <div
        className={`h-full ${colors[tone]} rounded-full transition-[width] duration-500 ease-out`}
        style={{ width: `${clamped * 100}%` }}
      />
    </div>
  )
}

export function budgetTone(ratio: number): 'sage' | 'gold' | 'clay' {
  if (ratio >= 1) return 'clay'
  if (ratio >= 0.75) return 'gold'
  return 'sage'
}

const GOAL_ICONS: Record<GoalIcon, React.ElementType> = {
  flight: Plane,
  clothes: Shirt,
  travel: Palmtree,
  tech: Laptop,
  home: Home,
  gift: Gift,
  car: Car,
  education: GraduationCap,
  health: HeartPulse,
  emergencyFund: Umbrella,
  pet: PawPrint,
  hobby: Palette,
  phone: Smartphone,
  music: Music,
  fitness: Dumbbell,
  kids: Baby,
  charity: HeartHandshake,
  business: Briefcase,
  renovation: Wrench,
  debt: CreditCard,
  savings: PiggyBank,
  insurance: Shield,
  outdoors: TreePine,
  wedding: Sparkles,
  furniture: Building2,
  books: BookOpen,
  games: Gamepad2,
  food: Utensils,
  family: Users,
  shopping: ShoppingBag,
  bike: Bike,
  other: Circle,
}

export function GoalIconGlyph({ icon, size = 18, className = '' }: { icon: GoalIcon; size?: number; className?: string }) {
  const Icon = GOAL_ICONS[icon] || Circle
  return <Icon size={size} className={className} strokeWidth={1.75} />
}

/** Translated label for a goal icon option (the icon picker in the "New goal" modal). */
export function goalIconLabel(t: Dictionary, icon: GoalIcon): string {
  return t.goalIcons[icon]
}

export function Card({
  children,
  className = '',
  id,
}: {
  children: React.ReactNode
  className?: string
  id?: string
}) {
  return (
    <div id={id} className={`bg-paper-card border border-paper-line rounded-lg ${className}`}>
      {children}
    </div>
  )
}

/** A Card with a clickable header (title + chevron) that expands/collapses its body. */
export function CollapsibleCard({
  title,
  titleClassName = '',
  subtitle,
  defaultOpen = true,
  className = '',
  children,
}: {
  title: string
  titleClassName?: string
  subtitle?: string
  defaultOpen?: boolean
  className?: string
  children: React.ReactNode
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <Card className={className}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="w-full flex items-center justify-between gap-3 px-5 pt-5 pb-4 text-left"
      >
        <div>
          <h3 className={`font-display font-semibold text-base ${titleClassName}`}>{title}</h3>
          {subtitle && <p className="text-sm text-ink-softer mt-0.5">{subtitle}</p>}
        </div>
        <ChevronDown
          size={17}
          className={`text-ink-softer shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </button>
      {open && <div className="px-5 pb-5">{children}</div>}
    </Card>
  )
}

export function SectionHeading({ eyebrow, title, action }: { eyebrow?: string; title: string; action?: React.ReactNode }) {
  return (
    // flex-wrap + a min-w-0 title block: on a narrow screen the action drops to its own line
    // instead of overlapping a long title (it used to sit on top of "Important Dates").
    <div className="flex flex-wrap items-end justify-between gap-x-3 gap-y-2 mb-4">
      <div className="min-w-0">
        {eyebrow && <p className="text-xs text-ink-softer mb-0.5">{eyebrow}</p>}
        <h2 className="font-display font-semibold text-xl text-ink">{title}</h2>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  )
}

/** A card's own heading row: a title and an optional trailing action (usually a "see all" link).
 *  The action never overlaps the title — it wraps below when space is tight. */
export function CardHeading({ title, action }: { title: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 mb-3">
      <h3 className="font-display font-semibold text-base min-w-0">{title}</h3>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  )
}

/** One compact figure for the Dashboard stat strip: label on its own line, value below. No
 *  side-by-side label/value, so a wide amount can never force the tile (or its grid track)
 *  wider than the screen. Equal height across a row via the grid. */
export function StatTile({
  label,
  value,
  tone = 'ink',
}: {
  label: string
  value: string
  tone?: 'ink' | 'sage' | 'clay' | 'gold'
}) {
  const valueTone: Record<string, string> = {
    ink: 'text-ink',
    sage: 'text-sage-dark',
    clay: 'text-clay-dark',
    gold: 'text-gold-dark',
  }
  return (
    <div className="bg-paper-card border border-paper-line rounded-lg p-3 min-w-0">
      <p className="text-[11px] text-ink-softer mb-1 truncate">{label}</p>
      <p className={`font-tabular font-semibold text-base sm:text-lg truncate ${valueTone[tone]}`}>{value}</p>
    </div>
  )
}

/** A label/value line where the label truncates and the value is pinned to the right without
 *  shrinking — the safe replacement for `flex justify-between` with two rigid children. */
export function SummaryRow({
  label,
  value,
  valueClassName = 'text-ink',
}: {
  label: string
  value: React.ReactNode
  valueClassName?: string
}) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-2">
      <span className="text-sm text-ink-softer min-w-0 truncate">{label}</span>
      <span className={`font-tabular text-sm font-medium shrink-0 ${valueClassName}`}>{value}</span>
    </div>
  )
}
