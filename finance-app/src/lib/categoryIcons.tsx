import {
  Utensils,
  Car,
  Home,
  ShoppingBag,
  Plane,
  Film,
  Receipt,
  HeartPulse,
  Banknote,
  Briefcase,
  Gift,
  Laptop,
  Tag,
} from 'lucide-react'
import { CategoryDef, CategoryIconKey } from '../types'

export const CATEGORY_ICON_MAP: Record<CategoryIconKey, React.ElementType> = {
  food: Utensils,
  transport: Car,
  home: Home,
  shopping: ShoppingBag,
  travel: Plane,
  entertainment: Film,
  bills: Receipt,
  health: HeartPulse,
  income: Banknote,
  work: Briefcase,
  gift: Gift,
  tech: Laptop,
  other: Tag,
}

export const CATEGORY_ICON_OPTIONS: { key: CategoryIconKey; label: string }[] = [
  { key: 'food', label: 'Food' },
  { key: 'transport', label: 'Transport' },
  { key: 'home', label: 'Home' },
  { key: 'shopping', label: 'Shopping' },
  { key: 'travel', label: 'Travel' },
  { key: 'entertainment', label: 'Entertainment' },
  { key: 'bills', label: 'Bills' },
  { key: 'health', label: 'Health' },
  { key: 'income', label: 'Income' },
  { key: 'work', label: 'Work' },
  { key: 'gift', label: 'Gift' },
  { key: 'tech', label: 'Tech' },
  { key: 'other', label: 'Other' },
]

export function CategoryIconGlyph({
  icon,
  size = 15,
  className = '',
}: {
  icon: CategoryIconKey
  size?: number
  className?: string
}) {
  const Icon = CATEGORY_ICON_MAP[icon] || Tag
  return <Icon size={size} className={className} strokeWidth={1.75} />
}

/** Look up a category's icon by name; falls back to 'other' (tag icon) for unknown/legacy names. */
export function iconForCategory(categories: CategoryDef[], name: string): CategoryIconKey {
  const found = categories.find((c) => c.name.toLowerCase() === name.toLowerCase())
  return found?.icon || 'other'
}
