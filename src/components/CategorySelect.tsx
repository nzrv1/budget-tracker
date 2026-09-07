import { useEffect, useRef, useState } from 'react'
import { ChevronDown, Search, Plus, Check } from 'lucide-react'
import { CategoryDef, CategoryIconKey } from '../types'
import { CategoryIconGlyph, CATEGORY_ICON_OPTIONS, categoryIconLabel, translateCategoryName } from '../lib/categoryIcons'
import { useT } from '../lib/i18n'

export default function CategorySelect({
  categories,
  value,
  onChange,
  onAddCategory,
}: {
  categories: CategoryDef[]
  value: string
  onChange: (name: string) => void
  onAddCategory: (def: CategoryDef) => void
}) {
  const t = useT()
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [newIcon, setNewIcon] = useState<CategoryIconKey>('other')
  const rootRef = useRef<HTMLDivElement>(null)

  const selected = categories.find((c) => c.name.toLowerCase() === value.toLowerCase())
  const filtered = categories.filter((c) => c.name.toLowerCase().includes(search.toLowerCase()))

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false)
        setCreating(false)
        setSearch('')
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  function pick(name: string) {
    onChange(name)
    setOpen(false)
    setSearch('')
  }

  function startCreating() {
    setCreating(true)
    setNewName(search)
  }

  function confirmCreate() {
    const trimmed = newName.trim()
    if (!trimmed) return
    // A category name that only differs by case from an existing one (e.g. "food" vs "Food")
    // must resolve to that EXISTING category, not a new one — addCategory() already silently
    // no-ops on a case-insensitive duplicate, so creating with the typed casing here would
    // leave a transaction saved under a name that budgets, reports, and category grouping
    // (all exact-string matches) would treat as a completely different category.
    const existing = categories.find((c) => c.name.toLowerCase() === trimmed.toLowerCase())
    if (existing) {
      pick(existing.name)
    } else {
      onAddCategory({ name: trimmed, icon: newIcon })
      pick(trimmed)
    }
    setCreating(false)
    setNewName('')
    setNewIcon('other')
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-2 px-3 py-2.5 border border-paper-line rounded text-sm bg-paper-card focus:border-sage outline-none"
      >
        <CategoryIconGlyph icon={selected?.icon || 'other'} size={15} className="text-ink-softer shrink-0" />
        <span className="flex-1 text-left truncate">{value ? translateCategoryName(t, value) : t.categorySelect.placeholder}</span>
        <ChevronDown size={15} className="text-ink-softer shrink-0" />
      </button>

      {open && (
        <div className="absolute z-20 mt-1.5 w-full bg-paper-card border border-paper-line rounded-lg shadow-lg shadow-ink/10 overflow-hidden">
          {!creating ? (
            <>
              <div className="p-2 border-b border-paper-line relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-softer pointer-events-none" />
                <input
                  autoFocus
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={t.categorySelect.searchPlaceholder}
                  className="w-full pl-7 pr-2 py-1.5 text-sm outline-none bg-transparent"
                />
              </div>
              <div className="max-h-48 overflow-y-auto">
                {filtered.map((c) => (
                  <button
                    key={c.name}
                    type="button"
                    onClick={() => pick(c.name)}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-paper text-left"
                  >
                    <CategoryIconGlyph icon={c.icon} size={15} className="text-ink-softer shrink-0" />
                    <span className="flex-1 truncate">{translateCategoryName(t, c.name)}</span>
                    {c.name.toLowerCase() === value.toLowerCase() && <Check size={14} className="text-sage-dark shrink-0" />}
                  </button>
                ))}
                {filtered.length === 0 && <p className="px-3 py-3 text-sm text-ink-softer">{t.categorySelect.noMatch}</p>}
              </div>
              <button
                type="button"
                onClick={startCreating}
                className="w-full flex items-center gap-2 px-3 py-2.5 text-sm font-medium text-sage-dark hover:bg-sage-light border-t border-paper-line"
              >
                <Plus size={15} />
                {t.categorySelect.addAsCategory(search || t.categorySelect.newFallback)}
              </button>
            </>
          ) : (
            <div className="p-3">
              <label className="block text-xs font-medium text-ink-softer mb-1.5">{t.categorySelect.createNameLabel}</label>
              <input
                autoFocus
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder={t.categorySelect.createNamePlaceholder}
                className="w-full px-2.5 py-2 border border-paper-line rounded text-sm outline-none focus:border-sage mb-3"
              />
              <label className="block text-xs font-medium text-ink-softer mb-1.5">{t.categorySelect.createIconLabel}</label>
              <div className="grid grid-cols-6 gap-1.5 mb-3">
                {CATEGORY_ICON_OPTIONS.map((opt) => (
                  <button
                    key={opt.key}
                    type="button"
                    onClick={() => setNewIcon(opt.key)}
                    title={categoryIconLabel(t, opt.key)}
                    className={`aspect-square flex items-center justify-center rounded border transition-colors ${
                      newIcon === opt.key ? 'border-sage bg-sage-light text-sage-dark' : 'border-paper-line text-ink-softer'
                    }`}
                  >
                    <CategoryIconGlyph icon={opt.key} size={15} />
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setCreating(false)}
                  className="flex-1 py-2 rounded text-sm font-medium border border-paper-line text-ink-softer"
                >
                  {t.categorySelect.createCancel}
                </button>
                <button
                  type="button"
                  onClick={confirmCreate}
                  disabled={!newName.trim()}
                  className="flex-1 py-2 rounded text-sm font-medium bg-ink text-paper disabled:opacity-40"
                >
                  {t.categorySelect.createConfirm}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
