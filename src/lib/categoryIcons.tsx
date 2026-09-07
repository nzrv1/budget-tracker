import {
  Utensils,
  ShoppingCart,
  Coffee,
  Car,
  Bus,
  Bike,
  Fuel,
  Home,
  Building2,
  ShoppingBag,
  Shirt,
  Plane,
  Film,
  Music,
  Tv,
  Gamepad2,
  Receipt,
  Zap,
  Droplet,
  Wifi,
  Smartphone,
  HeartPulse,
  Stethoscope,
  Pill,
  Dumbbell,
  Sparkles,
  Banknote,
  PiggyBank,
  Landmark,
  CreditCard,
  Wallet,
  Briefcase,
  GraduationCap,
  BookOpen,
  Gift,
  HeartHandshake,
  Laptop,
  Wrench,
  Palette,
  PawPrint,
  Baby,
  Users,
  Shield,
  Umbrella,
  TreePine,
  SquareParking,
  Tag,
} from 'lucide-react'
import { CategoryDef, CategoryIconKey } from '../types'
import { Dictionary } from './i18n'

export const CATEGORY_ICON_MAP: Record<CategoryIconKey, React.ElementType> = {
  food: Utensils,
  groceries: ShoppingCart,
  coffee: Coffee,
  transport: Car,
  publicTransport: Bus,
  bike: Bike,
  fuel: Fuel,
  home: Home,
  housing: Building2,
  shopping: ShoppingBag,
  clothing: Shirt,
  travel: Plane,
  entertainment: Film,
  music: Music,
  streaming: Tv,
  games: Gamepad2,
  bills: Receipt,
  utilities: Zap,
  water: Droplet,
  internet: Wifi,
  phone: Smartphone,
  health: HeartPulse,
  medical: Stethoscope,
  pharmacy: Pill,
  fitness: Dumbbell,
  beauty: Sparkles,
  income: Banknote,
  savings: PiggyBank,
  bank: Landmark,
  creditCard: CreditCard,
  wallet: Wallet,
  work: Briefcase,
  education: GraduationCap,
  books: BookOpen,
  gift: Gift,
  charity: HeartHandshake,
  tech: Laptop,
  maintenance: Wrench,
  hobby: Palette,
  pets: PawPrint,
  kids: Baby,
  family: Users,
  insurance: Shield,
  emergency: Umbrella,
  outdoors: TreePine,
  parking: SquareParking,
  other: Tag,
}

// Label shown under/next to the icon, plus keywords used to auto-suggest
// this icon when someone types a new category name (see suggestIconForName).
export const CATEGORY_ICON_OPTIONS: { key: CategoryIconKey; label: string; keywords: string[] }[] = [
  { key: 'food', label: 'Food', keywords: ['food', 'meal', 'lunch', 'dinner', 'breakfast', 'restaurant', 'dining', 'eating out'] },
  { key: 'groceries', label: 'Groceries', keywords: ['groceries', 'grocery', 'supermarket', 'market'] },
  { key: 'coffee', label: 'Coffee', keywords: ['coffee', 'cafe', 'café'] },
  { key: 'transport', label: 'Transport', keywords: ['transport', 'taxi', 'uber', 'lyft', 'cab', 'car'] },
  { key: 'publicTransport', label: 'Public transport', keywords: ['bus', 'metro', 'subway', 'tram', 'train'] },
  { key: 'bike', label: 'Bike', keywords: ['bike', 'bicycle', 'cycling'] },
  { key: 'fuel', label: 'Fuel', keywords: ['fuel', 'gas', 'petrol', 'diesel'] },
  { key: 'home', label: 'Home', keywords: ['home', 'rent', 'apartment', 'flat'] },
  { key: 'housing', label: 'Housing', keywords: ['mortgage', 'housing', 'property'] },
  { key: 'shopping', label: 'Shopping', keywords: ['shopping', 'shop', 'store', 'retail'] },
  { key: 'clothing', label: 'Clothing', keywords: ['clothes', 'clothing', 'fashion', 'apparel', 'shoes'] },
  { key: 'travel', label: 'Travel', keywords: ['travel', 'trip', 'vacation', 'holiday', 'flight', 'hotel'] },
  { key: 'entertainment', label: 'Entertainment', keywords: ['entertainment', 'fun', 'leisure', 'cinema', 'movie'] },
  { key: 'music', label: 'Music', keywords: ['music', 'spotify', 'concert'] },
  { key: 'streaming', label: 'Streaming', keywords: ['netflix', 'streaming', 'subscription'] },
  { key: 'games', label: 'Games', keywords: ['game', 'games', 'gaming', 'steam', 'playstation', 'xbox'] },
  { key: 'bills', label: 'Bills', keywords: ['bill', 'bills'] },
  { key: 'utilities', label: 'Utilities', keywords: ['electric', 'electricity', 'power', 'utilities', 'utility'] },
  { key: 'water', label: 'Water', keywords: ['water'] },
  { key: 'internet', label: 'Internet', keywords: ['internet', 'wifi', 'broadband'] },
  { key: 'phone', label: 'Phone', keywords: ['phone', 'mobile', 'cell'] },
  { key: 'health', label: 'Health', keywords: ['health', 'hospital'] },
  { key: 'medical', label: 'Medical', keywords: ['doctor', 'clinic', 'checkup'] },
  { key: 'pharmacy', label: 'Pharmacy', keywords: ['pharmacy', 'medicine', 'prescription', 'drugs'] },
  { key: 'fitness', label: 'Fitness', keywords: ['gym', 'fitness', 'workout', 'sport'] },
  { key: 'beauty', label: 'Beauty', keywords: ['beauty', 'salon', 'haircut', 'spa', 'cosmetics'] },
  { key: 'income', label: 'Income', keywords: ['salary', 'income', 'paycheck', 'wage'] },
  { key: 'savings', label: 'Savings', keywords: ['savings', 'saving'] },
  { key: 'bank', label: 'Bank & tax', keywords: ['bank', 'tax', 'taxes'] },
  { key: 'creditCard', label: 'Credit card', keywords: ['credit card', 'loan', 'debt'] },
  { key: 'wallet', label: 'Wallet', keywords: ['cash', 'wallet', 'money'] },
  { key: 'work', label: 'Work', keywords: ['work', 'freelance', 'job', 'business'] },
  { key: 'education', label: 'Education', keywords: ['tuition', 'school', 'university', 'college', 'course'] },
  { key: 'books', label: 'Books', keywords: ['book', 'books', 'reading'] },
  { key: 'gift', label: 'Gift', keywords: ['gift', 'present', 'birthday'] },
  { key: 'charity', label: 'Charity', keywords: ['charity', 'donation', 'donate'] },
  { key: 'tech', label: 'Tech', keywords: ['tech', 'electronics', 'gadget', 'computer', 'software'] },
  { key: 'maintenance', label: 'Maintenance', keywords: ['repair', 'maintenance', 'fix'] },
  { key: 'hobby', label: 'Hobby', keywords: ['hobby', 'craft', 'art', 'painting'] },
  { key: 'pets', label: 'Pets', keywords: ['pet', 'dog', 'cat', 'vet'] },
  { key: 'kids', label: 'Kids', keywords: ['kid', 'kids', 'baby', 'children', 'daycare', 'childcare'] },
  { key: 'family', label: 'Family', keywords: ['family'] },
  { key: 'insurance', label: 'Insurance', keywords: ['insurance'] },
  { key: 'emergency', label: 'Emergency fund', keywords: ['emergency', 'rainy day'] },
  { key: 'outdoors', label: 'Outdoors', keywords: ['camping', 'hiking', 'outdoor', 'nature'] },
  { key: 'parking', label: 'Parking', keywords: ['parking'] },
  { key: 'other', label: 'Other', keywords: [] },
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

/**
 * Suggests an icon for a category name as the person types it, e.g. "Coffee" -> coffee cup,
 * "Netflix" -> streaming, "Gym membership" -> fitness. Returns null when nothing matches,
 * so the caller can fall back to whatever icon is already selected.
 *
 * Localization note: the keyword lists above are English-only. This is deliberate, not an
 * oversight — they're matching logic against whatever the person types, not text shown on
 * screen, so they fall outside "translate the user-facing text". Typing a category name in
 * Russian or Latvian still works fine; it just won't get an auto-suggested icon the way an
 * English name would. Extending this to match RU/LV keywords too would be a reasonable future
 * enhancement, tracked here rather than silently skipped.
 */
export function suggestIconForName(name: string): CategoryIconKey | null {
  const trimmed = name.trim().toLowerCase()
  if (!trimmed) return null

  let best: { key: CategoryIconKey; length: number } | null = null
  for (const opt of CATEGORY_ICON_OPTIONS) {
    for (const kw of opt.keywords) {
      if (trimmed.includes(kw) && (!best || kw.length > best.length)) {
        best = { key: opt.key, length: kw.length }
      }
    }
  }
  return best?.key ?? null
}

/** Translated label for an icon-picker option — used for the tooltip/aria text on the icon
 * grid in Settings → Categories and the "add new category" panel in CategorySelect. */
export function categoryIconLabel(t: Dictionary, key: CategoryIconKey): string {
  return t.categoryIcons[key]
}

/**
 * Translates the DISPLAY of a category name, for the small, fixed set of default categories
 * the app ships with (Food, Transport, Rent, ... — see DEFAULT_CATEGORY_DEFS in types.ts).
 *
 * Deliberately does NOT translate arbitrary category names. `category` is stored as plain,
 * exact-match text everywhere (transactions, budgets, reports, the category picker) — renaming
 * it under the hood when the language changes would silently break every budget/report that
 * matches against the old string, and there is no reliable way to "translate" a category a
 * person typed themselves in a language nobody declared. So: known default names get a real
 * translated label; anything else (a category the person created, in any language) is shown
 * exactly as typed, in every UI language, same as before this feature existed.
 */
export function translateCategoryName(t: Dictionary, name: string): string {
  const key = Object.keys(t.defaultCategoryNames).find((k) => k.toLowerCase() === name.toLowerCase())
  return key ? t.defaultCategoryNames[key] : name
}
