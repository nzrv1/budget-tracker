import { useMemo, useState } from 'react'
import { Plus, Search, Pencil, Trash2 } from 'lucide-react'
import { AppState, Transaction } from '../types'
import { formatMoney } from '../lib/utils'
import { Card, SectionHeading } from './shared'
import AddTransactionModal from './AddTransactionModal'
import { EmptyState } from './Dashboard'

export default function TransactionsView({
  state,
  addTransaction,
  updateTransaction,
  deleteTransaction,
}: {
  state: AppState
  addTransaction: (t: Omit<Transaction, 'id'>) => void
  updateTransaction: (id: string, patch: Partial<Transaction>) => void
  deleteTransaction: (id: string) => void
}) {
  const [showAdd, setShowAdd] = useState(false)
  const [editing, setEditing] = useState<Transaction | null>(null)
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<'all' | 'income' | 'expense'>('all')
  const [categoryFilter, setCategoryFilter] = useState('all')

  const categories = useMemo(() => Array.from(new Set(state.transactions.map((t) => t.category))).sort(), [state.transactions])

  const filtered = useMemo(() => {
    return [...state.transactions]
      .filter((t) => (typeFilter === 'all' ? true : t.type === typeFilter))
      .filter((t) => (categoryFilter === 'all' ? true : t.category === categoryFilter))
      .filter((t) => {
        if (!search.trim()) return true
        const q = search.toLowerCase()
        return t.note.toLowerCase().includes(q) || t.category.toLowerCase().includes(q)
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  }, [state.transactions, search, typeFilter, categoryFilter])

  return (
    <div>
      <SectionHeading
        eyebrow="Every entry"
        title="Transactions"
        action={
          <button
            onClick={() => setShowAdd(true)}
            className="inline-flex items-center gap-2 bg-ink text-paper px-4 py-2.5 rounded font-medium text-sm hover:bg-ink-light transition-colors"
          >
            <Plus size={16} />
            Add
          </button>
        }
      />

      <Card className="p-4 mb-5">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-softer" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search notes or categories..."
              className="w-full pl-9 pr-3 py-2.5 border border-paper-line rounded text-sm focus:border-sage outline-none"
            />
          </div>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as any)}
            className="px-3 py-2.5 border border-paper-line rounded text-sm bg-white focus:border-sage outline-none"
          >
            <option value="all">All types</option>
            <option value="income">Income</option>
            <option value="expense">Expense</option>
          </select>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-2.5 border border-paper-line rounded text-sm bg-white focus:border-sage outline-none"
          >
            <option value="all">All categories</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
      </Card>

      <Card>
        {filtered.length === 0 ? (
          <div className="p-8">
            <EmptyState text="No transactions match your filters." />
          </div>
        ) : (
          <div className="divide-y divide-paper-line">
            {filtered.map((t) => (
              <div key={t.id} className="flex items-center justify-between gap-3 px-5 py-3.5 group">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-ink truncate">{t.note || t.category}</span>
                    <span className="text-[11px] px-1.5 py-0.5 rounded bg-paper text-ink-softer border border-paper-line shrink-0">
                      {t.category}
                    </span>
                  </div>
                  <p className="text-xs text-ink-softer mt-0.5">
                    {new Date(t.date).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                  </p>
                </div>
                <span className={`font-tabular text-sm font-medium shrink-0 ${t.type === 'income' ? 'text-sage-dark' : 'text-ink'}`}>
                  {t.type === 'income' ? '+' : '-'}
                  {formatMoney(t.amount, state.settings.currency)}
                </span>
                <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => setEditing(t)}
                    className="p-1.5 text-ink-softer hover:text-ink hover:bg-paper rounded"
                    aria-label="Edit"
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    onClick={() => deleteTransaction(t.id)}
                    className="p-1.5 text-ink-softer hover:text-clay-dark hover:bg-clay-light rounded"
                    aria-label="Delete"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {showAdd && (
        <AddTransactionModal onClose={() => setShowAdd(false)} onSave={addTransaction} extraCategories={categories} />
      )}
      {editing && (
        <AddTransactionModal
          initial={editing}
          onClose={() => setEditing(null)}
          onSave={(patch) => updateTransaction(editing.id, patch)}
          extraCategories={categories}
        />
      )}
    </div>
  )
}
