import { useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { AppState, CategoryBudget, DEFAULT_CATEGORIES } from '../types'
import { formatMoney, periodRange, filterByRange } from '../lib/utils'
import { Card, ProgressBar, budgetTone, SectionHeading } from './shared'
import { EmptyState } from './Dashboard'

export default function BudgetsView({
  state,
  setBudgets,
}: {
  state: AppState
  setBudgets: (b: CategoryBudget[]) => void
}) {
  const [newCategory, setNewCategory] = useState('')
  const [newLimit, setNewLimit] = useState('')

  const { from, to } = periodRange('month')
  const monthTx = filterByRange(state.transactions, from, to)

  const usedCategories = new Set(state.budgets.map((b) => b.category))
  const availableCategories = DEFAULT_CATEGORIES.filter((c) => !usedCategories.has(c))

  function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    const limit = parseFloat(newLimit)
    if (!newCategory || !limit || limit <= 0) return
    setBudgets([...state.budgets, { category: newCategory, limit }])
    setNewCategory('')
    setNewLimit('')
  }

  function updateLimit(category: string, limit: number) {
    setBudgets(state.budgets.map((b) => (b.category === category ? { ...b, limit } : b)))
  }

  function removeBudget(category: string) {
    setBudgets(state.budgets.filter((b) => b.category !== category))
  }

  return (
    <div>
      <SectionHeading eyebrow="Set your limits" title="Budgets" />

      <Card className="p-5 mb-6">
        <h3 className="font-display font-semibold text-base mb-4">Add a category budget</h3>
        <form onSubmit={handleAdd} className="flex flex-col sm:flex-row gap-3">
          <select
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value)}
            className="flex-1 px-3 py-2.5 border border-paper-line rounded text-sm bg-white focus:border-sage outline-none"
          >
            <option value="">Choose category...</option>
            {availableCategories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <input
            type="number"
            min="0"
            step="1"
            value={newLimit}
            onChange={(e) => setNewLimit(e.target.value)}
            placeholder="Monthly limit"
            className="sm:w-40 px-3 py-2.5 border border-paper-line rounded text-sm font-tabular focus:border-sage outline-none"
          />
          <button
            type="submit"
            className="inline-flex items-center justify-center gap-2 bg-ink text-paper px-4 py-2.5 rounded font-medium text-sm hover:bg-ink-light transition-colors shrink-0"
          >
            <Plus size={16} />
            Add budget
          </button>
        </form>
      </Card>

      {state.budgets.length === 0 ? (
        <Card className="p-8">
          <EmptyState text="No budgets set yet — add one above to start tracking category limits." />
        </Card>
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {state.budgets.map((b) => {
            const spent = monthTx
              .filter((t) => t.type === 'expense' && t.category === b.category)
              .reduce((s, t) => s + t.amount, 0)
            const ratio = b.limit > 0 ? spent / b.limit : 0
            const tone = budgetTone(ratio)
            return (
              <Card key={b.category} className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-medium text-ink">{b.category}</h4>
                  <button
                    onClick={() => removeBudget(b.category)}
                    className="text-ink-softer hover:text-clay-dark"
                    aria-label={`Remove ${b.category} budget`}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
                <div className="flex justify-between items-baseline mb-2">
                  <span className="font-tabular text-lg font-semibold text-ink">
                    {formatMoney(spent, state.settings.currency)}
                  </span>
                  <span className="text-xs text-ink-softer">
                    of{' '}
                    <input
                      type="number"
                      value={b.limit}
                      onChange={(e) => updateLimit(b.category, parseFloat(e.target.value) || 0)}
                      className="w-16 text-right font-tabular border-b border-paper-line bg-transparent focus:border-sage outline-none"
                    />{' '}
                    {state.settings.currency}
                  </span>
                </div>
                <ProgressBar ratio={ratio} tone={tone} />
                {ratio >= 1 && <p className="text-xs text-clay-dark mt-2">Over budget by {formatMoney(spent - b.limit, state.settings.currency)}</p>}
                {ratio >= 0.75 && ratio < 1 && <p className="text-xs text-gold-dark mt-2">Getting close to the limit</p>}
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
