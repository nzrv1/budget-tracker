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
