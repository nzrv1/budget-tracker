import { useMemo, useState } from 'react'
import { Plus, Trash2, Search } from 'lucide-react'
import { AppState, CategoryBudget, CategoryDef, BudgetPeriod } from '../types'
import { formatMoney, periodRange, filterByRange } from '../lib/utils'
import { CategoryIconGlyph, iconForCategory } from '../lib/categoryIcons'
import { Card, ProgressBar, budgetTone, SectionHeading } from './shared'
import CategorySelect from './CategorySelect'
import { EmptyState } from './Dashboard'

const PERIOD_LABEL: Record<BudgetPeriod, string> = { day: 'Daily', week: 'Weekly', month: 'Monthly', year: 'Yearly' }
const PERIOD_SUFFIX: Record<BudgetPeriod, string> = { day: '/ day', week: '/ week', month: '/ month', year: '/ year' }
const PERIODS: BudgetPeriod[] = ['day', 'week', 'month', 'year']

type SortKey = 'name' | 'usage' | 'limit'

export default function BudgetsView({
  state,
  setBudgets,
  addCategory,
}: {
  state: AppState
  setBudgets: (b: CategoryBudget[]) => void
  addCategory: (def: CategoryDef) => void
}) {
  const [newCategory, setNewCategory] = useState('')
  const [newLimit, setNewLimit] = useState('')
  const [newPeriod, setNewPeriod] = useState<BudgetPeriod>('month')
  const [formError, setFormError] = useState('')

  const [search, setSearch] = useState('')
  const [periodFilter, setPeriodFilter] = useState<'all' | BudgetPeriod>('all')
  const [sortKey, setSortKey] = useState<SortKey>('name')

  function spendFor(category: string, period: BudgetPeriod) {
    const { from, to } = periodRange(period)
    return filterByRange(state.transactions, from, to)
      .filter((t) => t.type === 'expense' && t.category === category)
      .reduce((s, t) => s + t.amount, 0)
  }

  function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    const limit = parseFloat(newLimit)
    setFormError('')
    if (!newCategory.trim()) return setFormError('Choose or add a category.')
    if (!limit || limit <= 0) return setFormError('Enter a limit greater than zero.')
    const duplicate = state.budgets.some(
      (b) => b.category.toLowerCase() === newCategory.trim().toLowerCase() && b.period === newPeriod
    )
    if (duplicate) return setFormError(`A ${PERIOD_LABEL[newPeriod].toLowerCase()} budget for this category already exists.`)
    setBudgets([...state.budgets, { category: newCategory.trim(), limit, period: newPeriod }])
    setNewCategory('')
    setNewLimit('')
  }

  function updateLimit(category: string, period: BudgetPeriod, limit: number) {
    setBudgets(state.budgets.map((b) => (b.category === category && b.period === period ? { ...b, limit } : b)))
  }

  function removeBudget(category: string, period: BudgetPeriod) {
    setBudgets(state.budgets.filter((b) => !(b.category === category && b.period === period)))
  }

  const visibleBudgets = useMemo(() => {
    let list = state.budgets.filter((b) => b.category.toLowerCase().includes(search.toLowerCase()))
    if (periodFilter !== 'all') list = list.filter((b) => b.period === periodFilter)

    const withUsage = list.map((b) => {
      const spent = spendFor(b.category, b.period)
      return { ...b, spent, ratio: b.limit > 0 ? spent / b.limit : 0 }
    })

    withUsage.sort((a, b) => {
      if (sortKey === 'name') return a.category.localeCompare(b.category)
      if (sortKey === 'limit') return b.limit - a.limit
      return b.ratio - a.ratio // usage
    })
    return withUsage
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.budgets, state.transactions, search, periodFilter, sortKey])

  return (
    <div>
      <SectionHeading eyebrow="Set your limits" title="Budgets" />

      <Card className="p-5 mb-6">
        <h3 className="font-display font-semibold text-base mb-4">Add a category budget</h3>
        <form onSubmit={handleAdd} className="flex flex-col gap-3">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <CategorySelect
                categories={state.categories}
                value={newCategory}
                onChange={setNewCategory}
                onAddCategory={addCategory}
              />
            </div>
            <input
              type="number"
              min="0"
              step="1"
              value={newLimit}
              onChange={(e) => setNewLimit(e.target.value)}
              placeholder="Limit amount"
              className="sm:w-36 px-3 py-2.5 border border-paper-line rounded text-sm font-tabular focus:border-sage outline-none"
            />
            <button
              type="submit"
              className="inline-flex items-center justify-center gap-2 bg-ink text-paper px-4 py-2.5 rounded font-medium text-sm hover:bg-ink-light transition-colors shrink-0"
            >
              <Plus size={16} />
              Add budget
            </button>
          </div>

          <div>
            <label className="block text-xs font-medium text-ink-softer mb-1.5">Resets</label>
            <div className="flex bg-paper rounded p-1 border border-paper-line w-fit">
              {PERIODS.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setNewPeriod(p)}
                  className={`px-4 py-1.5 rounded text-sm font-medium transition-colors ${
                    newPeriod === p ? 'bg-ink text-paper' : 'text-ink-softer'
                  }`}
                >
                  {PERIOD_LABEL[p]}
                </button>
              ))}
            </div>
          </div>

          {formError && <p className="text-sm text-clay-dark">{formError}</p>}
        </form>
      </Card>

      {state.budgets.length > 0 && (
        <Card className="p-4 mb-5">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-softer" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Filter by category..."
                className="w-full pl-9 pr-3 py-2.5 border border-paper-line rounded text-sm focus:border-sage outline-none"
              />
            </div>
            <select
              value={periodFilter}
              onChange={(e) => setPeriodFilter(e.target.value as any)}
              className="px-3 py-2.5 border border-paper-line rounded text-sm bg-white focus:border-sage outline-none"
            >
              <option value="all">All periods</option>
              {PERIODS.map((p) => (
                <option key={p} value={p}>
                  {PERIOD_LABEL[p]}
                </option>
              ))}
            </select>
            <select
              value={sortKey}
              onChange={(e) => setSortKey(e.target.value as SortKey)}
              className="px-3 py-2.5 border border-paper-line rounded text-sm bg-white focus:border-sage outline-none"
            >
              <option value="name">Sort: Category A–Z</option>
              <option value="usage">Sort: Most used first</option>
              <option value="limit">Sort: Highest limit first</option>
            </select>
          </div>
        </Card>
      )}

      {state.budgets.length === 0 ? (
        <Card className="p-8">
          <EmptyState text="No budgets set yet — add one above to start tracking spending limits." />
        </Card>
      ) : visibleBudgets.length === 0 ? (
        <Card className="p-8">
          <EmptyState text="No budgets match your filters." />
        </Card>
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {visibleBudgets.map((b) => {
            const tone = budgetTone(b.ratio)
            return (
              <Card key={`${b.category}-${b.period}`} className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="w-8 h-8 rounded-full bg-paper flex items-center justify-center shrink-0">
                      <CategoryIconGlyph icon={iconForCategory(state.categories, b.category)} size={15} className="text-ink-softer" />
                    </span>
                    <div className="min-w-0">
                      <h4 className="font-medium text-ink truncate">{b.category}</h4>
                      <span className="text-[11px] text-ink-softer">{PERIOD_LABEL[b.period]} limit</span>
                    </div>
                  </div>
                  <button
                    onClick={() => removeBudget(b.category, b.period)}
                    className="text-ink-softer hover:text-clay-dark shrink-0"
                    aria-label={`Remove ${b.category} budget`}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
                <div className="flex justify-between items-baseline mb-2">
                  <span className="font-tabular text-lg font-semibold text-ink">
                    {formatMoney(b.spent, state.settings.currency)}
                  </span>
                  <span className="text-xs text-ink-softer">
                    of{' '}
                    <input
                      type="number"
                      value={b.limit}
                      onChange={(e) => updateLimit(b.category, b.period, parseFloat(e.target.value) || 0)}
                      className="w-16 text-right font-tabular border-b border-paper-line bg-transparent focus:border-sage outline-none"
                    />{' '}
                    {state.settings.currency} {PERIOD_SUFFIX[b.period]}
                  </span>
                </div>
                <ProgressBar ratio={b.ratio} tone={tone} />
                {b.ratio >= 1 && (
                  <p className="text-xs text-clay-dark mt-2">Over by {formatMoney(b.spent - b.limit, state.settings.currency)}</p>
                )}
                {b.ratio >= 0.75 && b.ratio < 1 && <p className="text-xs text-gold-dark mt-2">Getting close to the limit</p>}
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
