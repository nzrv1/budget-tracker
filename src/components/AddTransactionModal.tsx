import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import { Transaction, TransactionType, CategoryDef, DEFAULT_CATEGORIES } from '../types'
import CategorySelect from './CategorySelect'
import { showTelegramBackButton } from '../lib/telegram'
import { todayLocalDateString } from '../lib/utils'
import { useT } from '../lib/i18n'

export default function AddTransactionModal({
  onClose,
  onSave,
  initial,
  categories,
  onAddCategory,
}: {
  onClose: () => void
  onSave: (t: Omit<Transaction, 'id'>) => void
  initial?: Transaction
  categories: CategoryDef[]
  onAddCategory: (def: CategoryDef) => void
}) {
  const t = useT()
  const [type, setType] = useState<TransactionType>(initial?.type || 'expense')
  const [amount, setAmount] = useState(initial ? String(initial.amount) : '')
  const [category, setCategory] = useState(initial?.category || DEFAULT_CATEGORIES[0])
  const [date, setDate] = useState(initial?.date || todayLocalDateString())
  const [note, setNote] = useState(initial?.note || '')
  const [error, setError] = useState('')

  // Inside Telegram, the system back gesture/button should close this modal, not the whole
  // Mini App (Telegram plan, Phase 2). No-op outside Telegram.
  useEffect(() => showTelegramBackButton(onClose), [onClose])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const num = parseFloat(amount)
    if (!num || num <= 0) {
      setError(t.addTransactionModal.errorAmount)
      return
    }
    if (!category.trim()) {
      setError(t.addTransactionModal.errorCategory)
      return
    }
    onSave({ type, amount: num, category: category.trim(), date, note: note.trim() })
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-[2px] px-0 sm:px-4">
      {/* pb-[env(safe-area-inset-bottom)]: on notched iPhones this bottom sheet's own bottom
          padding otherwise sits right under the home-indicator bar. */}
      <div className="bg-paper-card w-full sm:max-w-md sm:rounded-lg rounded-t-lg border border-paper-line max-h-[90vh] overflow-y-auto pb-[env(safe-area-inset-bottom)] sm:pb-0">
        <div className="flex items-center justify-between px-5 py-4 border-b border-paper-line">
          <h3 className="font-display font-semibold text-lg">
            {initial ? t.addTransactionModal.titleEdit : t.addTransactionModal.titleAdd}
          </h3>
          <button onClick={onClose} className="text-ink-softer hover:text-ink">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-5 py-5 flex flex-col gap-4">
          <div className="flex bg-paper rounded p-1 border border-paper-line">
            {(['expense', 'income'] as TransactionType[]).map((typ) => (
              <button
                key={typ}
                type="button"
                onClick={() => setType(typ)}
                className={`flex-1 py-2 rounded text-sm font-medium capitalize transition-colors ${
                  type === typ ? (typ === 'income' ? 'bg-sage text-white' : 'bg-ink text-paper') : 'text-ink-softer'
                }`}
              >
                {typ === 'income' ? t.common.income : t.common.expense}
              </button>
            ))}
          </div>

          <div>
            <label className="block text-xs font-medium text-ink-softer mb-1.5">{t.addTransactionModal.amountLabel}</label>
            <input
              type="number"
              step="0.01"
              min="0"
              autoFocus
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className="w-full px-3 py-2.5 border border-paper-line rounded font-tabular text-base focus:border-sage outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-ink-softer mb-1.5">{t.addTransactionModal.categoryLabel}</label>
            <CategorySelect categories={categories} value={category} onChange={setCategory} onAddCategory={onAddCategory} />
          </div>

          <div>
            <label className="block text-xs font-medium text-ink-softer mb-1.5">{t.addTransactionModal.dateLabel}</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-3 py-2.5 border border-paper-line rounded text-sm focus:border-sage outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-ink-softer mb-1.5">{t.addTransactionModal.noteLabel}</label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={t.addTransactionModal.notePlaceholder}
              className="w-full px-3 py-2.5 border border-paper-line rounded text-sm focus:border-sage outline-none"
            />
          </div>

          {error && <p className="text-sm text-clay-dark">{error}</p>}

          <button
            type="submit"
            className="w-full py-3 bg-ink text-paper rounded font-medium text-sm hover:bg-ink-light transition-colors mt-1"
          >
            {initial ? t.addTransactionModal.submitSaveChanges : t.addTransactionModal.submitAdd}
          </button>
        </form>
      </div>
    </div>
  )
}
