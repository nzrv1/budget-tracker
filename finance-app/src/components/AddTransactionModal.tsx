import { useState } from 'react'
import { X } from 'lucide-react'
import { Transaction, TransactionType, CategoryDef, DEFAULT_CATEGORIES } from '../types'
import CategorySelect from './CategorySelect'

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
  const [type, setType] = useState<TransactionType>(initial?.type || 'expense')
  const [amount, setAmount] = useState(initial ? String(initial.amount) : '')
  const [category, setCategory] = useState(initial?.category || DEFAULT_CATEGORIES[0])
  const [date, setDate] = useState(initial?.date || new Date().toISOString().slice(0, 10))
  const [note, setNote] = useState(initial?.note || '')
  const [error, setError] = useState('')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const num = parseFloat(amount)
    if (!num || num <= 0) {
      setError('Enter an amount greater than zero.')
      return
    }
    if (!category.trim()) {
      setError('Choose or add a category.')
      return
    }
    onSave({ type, amount: num, category: category.trim(), date, note: note.trim() })
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-[2px] px-0 sm:px-4">
      <div className="bg-paper-card w-full sm:max-w-md sm:rounded-lg rounded-t-lg border border-paper-line max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b border-paper-line">
          <h3 className="font-display font-semibold text-lg">{initial ? 'Edit transaction' : 'Add transaction'}</h3>
          <button onClick={onClose} className="text-ink-softer hover:text-ink">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-5 py-5 flex flex-col gap-4">
          <div className="flex bg-paper rounded p-1 border border-paper-line">
            {(['expense', 'income'] as TransactionType[]).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setType(t)}
                className={`flex-1 py-2 rounded text-sm font-medium capitalize transition-colors ${
                  type === t ? (t === 'income' ? 'bg-sage text-white' : 'bg-ink text-paper') : 'text-ink-softer'
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          <div>
            <label className="block text-xs font-medium text-ink-softer mb-1.5">Amount</label>
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
            <label className="block text-xs font-medium text-ink-softer mb-1.5">Category</label>
            <CategorySelect categories={categories} value={category} onChange={setCategory} onAddCategory={onAddCategory} />
          </div>

          <div>
            <label className="block text-xs font-medium text-ink-softer mb-1.5">Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-3 py-2.5 border border-paper-line rounded text-sm focus:border-sage outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-ink-softer mb-1.5">Note (optional)</label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="What was this for?"
              className="w-full px-3 py-2.5 border border-paper-line rounded text-sm focus:border-sage outline-none"
            />
          </div>

          {error && <p className="text-sm text-clay-dark">{error}</p>}

          <button
            type="submit"
            className="w-full py-3 bg-ink text-paper rounded font-medium text-sm hover:bg-ink-light transition-colors mt-1"
          >
            {initial ? 'Save changes' : 'Add transaction'}
          </button>
        </form>
      </div>
    </div>
  )
}
