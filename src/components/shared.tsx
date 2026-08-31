import { Plane, Shirt, Palmtree, Laptop, Home, Gift, Circle } from 'lucide-react'
import { GoalIcon } from '../types'

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
  other: Circle,
}

export function GoalIconGlyph({ icon, size = 18, className = '' }: { icon: GoalIcon; size?: number; className?: string }) {
  const Icon = GOAL_ICONS[icon] || Circle
  return <Icon size={size} className={className} strokeWidth={1.75} />
}

export function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-paper-card border border-paper-line rounded-lg ${className}`}>
      {children}
    </div>
  )
}

export function SectionHeading({ eyebrow, title, action }: { eyebrow?: string; title: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-end justify-between mb-4">
      <div>
        {eyebrow && <p className="text-xs text-ink-softer mb-0.5">{eyebrow}</p>}
        <h2 className="font-display font-semibold text-xl text-ink">{title}</h2>
      </div>
      {action}
    </div>
  )
}
