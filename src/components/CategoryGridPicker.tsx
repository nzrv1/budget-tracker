import { useState } from 'react'
import { Plus } from 'lucide-react'
import { CategoryDef, CategoryIconKey } from '../types'
import { CategoryIconGlyph, CATEGORY_ICON_OPTIONS, categoryIconLabel, translateCategoryName } from '../lib/categoryIcons'
import { useT } from '../lib/i18n'

/** One-tap category picker for the Add Transaction flow: every category as an icon + label
 *  tile in a grid, so picking one doesn't need opening/scrolling a dropdown list. Replaces
 *  CategorySelect there; CategorySelect (search + dropdown) still fits BudgetsView, where the
 *  category list is typically longer and browsed less often. */
export default function CategoryGridPicker({
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
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [newIcon, setNewIcon] = useState<CategoryIconKey>('other')

  function confirmCreate() {
    const trimmed = newName.trim()
    if (!trimmed) return
    // Case-insensitive duplicates resolve to the existing category — same rule as
    // CategorySelect, so a transaction never ends up saved under a near-duplicate name that
    // budgets/reports (exact-string matches) would treat as a different category.
    const existing = categories.find((c) => c.name.toLowerCase() === trimmed.toLowerCase())
    onChange(existing ? existing.name : trimmed)
    if (!existing) onAddCategory({ name: trimmed, icon: newIcon })
    setCreating(false)
    setNewName('')
    setNewIcon('other')
  }

  if (creating) {
    return (
      <div className="border border-paper-line rounded-lg p-3">
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
            onClick={() => {
              setCreating(false)
              setNewName('')
            }}
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
    )
  }

  return (
    <div className="grid grid-cols-4 gap-2">
      {categories.map((c) => {
        const isSelected = c.name.toLowerCase() === value.toLowerCase()
        return (
          <button
            key={c.name}
            type="button"
            onClick={() => onChange(c.name)}
            className={`flex flex-col items-center justify-center gap-1 py-2.5 px-1 rounded-lg border text-center transition-colors ${
              isSelected ? 'border-sage bg-sage-light text-sage-dark' : 'border-paper-line text-ink hover:border-ink-softer/40'
            }`}
          >
            <CategoryIconGlyph icon={c.icon} size={19} />
            <span className="text-[10.5px] leading-tight truncate w-full">{translateCategoryName(t, c.name)}</span>
          </button>
        )
      })}
      <button
        type="button"
        onClick={() => setCreating(true)}
        className="flex flex-col items-center justify-center gap-1 py-2.5 px-1 rounded-lg border border-dashed border-paper-line text-ink-softer hover:border-sage hover:text-sage-dark transition-colors"
      >
        <Plus size={19} />
        <span className="text-[10.5px] leading-tight">{t.categorySelect.addNewTile}</span>
      </button>
    </div>
  )
}
