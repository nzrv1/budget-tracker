import { useEffect, useMemo, useState } from 'react'
import { Plus, Search, ChevronRight, X } from 'lucide-react'
import { AppState, CategoryBudget, CategoryDef, BudgetPeriod } from '../types'
import { formatMoney, periodRange, filterByRange } from '../lib/utils'
import { CategoryIconGlyph, iconForCategory, translateCategoryName } from '../lib/categoryIcons'
import { Card, ProgressBar, budgetTone, SectionHeading } from './shared'
import CategorySelect from './CategorySelect'
import { EmptyState } from './Dashboard'
import { Dictionary, useT } from '../lib/i18n'
import { showTelegramBackButton } from '../lib/telegram'

function periodLabels(t: Dictionary): Record<BudgetPeriod, string> {
  return { day: t.periods.day, week: t.periods.week, month: t.periods.month, year: t.periods.year }
}
function periodSuffixes(t: Dictionary): Record<BudgetPeriod, string> {
  return { day: t.periods.suffixDay, week: t.periods.suffixWeek, month: t.periods.suffixMonth, year: t.periods.suffixYear }
}
const PERIODS: BudgetPeriod[] = ['day', 'week', 'month', 'year']

type SortKey = 'name' | 'usage' | 'limit'

const SELECT_CLASS =
  'px-3 min-h-[44px] border border-paper-line rounded text-sm bg-paper-card text-ink focus:border-sage outline-none'

export default function BudgetsView({
  state,
  setBudgets,
  addCategory,
}: {
  state: AppState
  setBudgets: (b: CategoryBudget[]) => void
  addCategory: (def: CategoryDef) => void
}) {
  const t = useT()
  const PERIOD_LABEL = periodLabels(t)
  const PERIOD_SUFFIX = periodSuffixes(t)
  const [newCategory, setNewCategory] = useState('')
  const [newLimit, setNewLimit] = useState('')
  const [newPeriod, setNewPeriod] = useState<BudgetPeriod>('month')
  const [formError, setFormError] = useState('')

  const [search, setSearch] = useState('')
  const [periodFilter, setPeriodFilter] = useState<'all' | BudgetPeriod>('all')
  const [sortKey, setSortKey] = useState<SortKey>('name')

  const [editing, setEditing] = useState<CategoryBudget | null>(null)

  function spendFor(category: string, period: BudgetPeriod) {
    const { from, to } = periodRange(period)
    return filterByRange(state.transactions, from, to)
      .filter((tx) => tx.type === 'expense' && tx.category === category)
      .reduce((s, tx) => s + tx.amount, 0)
  }

  function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    const limit = parseFloat(newLimit)
    setFormError('')
    if (!newCategory.trim()) return setFormError(t.budgets.errorChooseCategory)
    if (!limit || limit <= 0) return setFormError(t.budgets.errorEnterLimit)
    const duplicate = state.budgets.some(
      (b) => b.category.toLowerCase() === newCategory.trim().toLowerCase() && b.period === newPeriod
    )
    if (duplicate) return setFormError(t.budgets.errorDuplicate(PERIOD_LABEL[newPeriod]))
    setBudgets([...state.budgets, { category: newCategory.trim(), limit, period: newPeriod, createdAt: new Date().toISOString() }])
    setNewCategory('')
    setNewLimit('')
  }

  function updateLimit(orig: CategoryBudget, limit: number) {
    setBudgets(state.budgets.map((b) => (b.category === orig.category && b.period === orig.period ? { ...b, limit } : b)))
  }

  function removeBudget(orig: CategoryBudget) {
    setBudgets(state.budgets.filter((b) => !(b.category === orig.category && b.period === orig.period)))
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
      <SectionHeading eyebrow={t.budgets.eyebrow} title={t.budgets.title} />

      <Card className="p-4 sm:p-5 mb-6">
        <h3 className="font-display font-semibold text-base mb-4">{t.budgets.addBudgetTitle}</h3>
        <form onSubmit={handleAdd} className="flex flex-col gap-3">
          <CategorySelect categories={state.categories} value={newCategory} onChange={setNewCategory} onAddCategory={addCategory} />
          <div className="flex gap-2">
            <input
              type="number"
              min="0"
              step="1"
              inputMode="decimal"
              value={newLimit}
              onChange={(e) => setNewLimit(e.target.value)}
              placeholder={t.budgets.limitPlaceholder}
              className="flex-1 min-w-0 px-3 min-h-[44px] border border-paper-line rounded text-sm font-tabular focus:border-sage outline-none"
            />
            <select
              value={newPeriod}
              onChange={(e) => setNewPeriod(e.target.value as BudgetPeriod)}
              aria-label={t.budgets.resetsLabel}
              className={`${SELECT_CLASS} shrink-0`}
            >
              {PERIODS.map((p) => (
                <option key={p} value={p}>
                  {PERIOD_LABEL[p]}
                </option>
              ))}
            </select>
          </div>
          <button
            type="submit"
            className="inline-flex items-center justify-center gap-2 bg-ink text-paper px-4 min-h-[44px] rounded font-medium text-sm hover:bg-ink-light transition-colors"
          >
            <Plus size={16} />
            {t.budgets.addBudgetButton}
          </button>
          {formError && <p className="text-sm text-clay-dark">{formError}</p>}
        </form>
      </Card>

      {state.budgets.length > 0 && (
        <Card className="p-4 mb-5">
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-softer" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t.budgets.filterPlaceholder}
                className="w-full pl-9 pr-3 min-h-[44px] border border-paper-line rounded text-sm focus:border-sage outline-none"
              />
            </div>
            <div className="flex gap-2">
              <select value={periodFilter} onChange={(e) => setPeriodFilter(e.target.value as 'all' | BudgetPeriod)} className={`${SELECT_CLASS} flex-1 sm:flex-none`}>
                <option value="all">{t.budgets.allPeriods}</option>
                {PERIODS.map((p) => (
                  <option key={p} value={p}>
                    {PERIOD_LABEL[p]}
                  </option>
                ))}
              </select>
              <select value={sortKey} onChange={(e) => setSortKey(e.target.value as SortKey)} className={`${SELECT_CLASS} flex-1 sm:flex-none`}>
                <option value="name">{t.budgets.sortNameLabel}</option>
                <option value="usage">{t.budgets.sortUsageLabel}</option>
                <option value="limit">{t.budgets.sortLimitLabel}</option>
              </select>
            </div>
          </div>
        </Card>
      )}

      {state.budgets.length === 0 ? (
        <Card className="p-8">
          <EmptyState text={t.budgets.noBudgetsYet} />
        </Card>
      ) : visibleBudgets.length === 0 ? (
        <Card className="p-8">
          <EmptyState text={t.budgets.noMatch} />
        </Card>
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {visibleBudgets.map((b) => {
            const tone = budgetTone(b.ratio)
            return (
              <button
                key={`${b.category}-${b.period}`}
                type="button"
                onClick={() => setEditing(b)}
                className="w-full text-left rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sage-dark"
                aria-label={`${translateCategoryName(t, b.category)} — ${t.budgets.editTitle}`}
              >
                <Card className="p-4 sm:p-5 hover:border-ink-softer/30 transition-colors">
                  <div className="flex items-center gap-2.5 mb-3">
                    <span className="w-8 h-8 rounded-full bg-paper flex items-center justify-center shrink-0">
                      <CategoryIconGlyph icon={iconForCategory(state.categories, b.category)} size={15} className="text-ink-softer" />
                    </span>
                    <h4 className="font-medium text-ink truncate min-w-0 flex-1">{translateCategoryName(t, b.category)}</h4>
                    <span className="text-[11px] px-2 py-0.5 rounded-full border border-paper-line text-ink-softer shrink-0">
                      {PERIOD_LABEL[b.period]}
                    </span>
                    <ChevronRight size={16} className="text-ink-softer shrink-0" />
                  </div>
                  <div className="flex items-baseline justify-between gap-2 mb-2">
                    <span className="font-tabular text-lg font-semibold text-ink min-w-0 truncate">
                      {formatMoney(b.spent, state.settings.currency)}
                    </span>
                    <span className="text-xs text-ink-softer font-tabular shrink-0">
                      {t.budgets.ofLabel} {formatMoney(b.limit, state.settings.currency)} {PERIOD_SUFFIX[b.period]}
                    </span>
                  </div>
                  <ProgressBar ratio={b.ratio} tone={tone} />
                  {b.ratio >= 1 && (
                    <p className="text-xs text-clay-dark mt-2">{t.budgets.overBy(formatMoney(b.spent - b.limit, state.settings.currency))}</p>
                  )}
                  {b.ratio >= 0.75 && b.ratio < 1 && <p className="text-xs text-gold-dark mt-2">{t.budgets.closeToLimit}</p>}
                </Card>
              </button>
            )
          })}
        </div>
      )}

      {editing && (
        <BudgetEditSheet
          budget={editing}
          currency={state.settings.currency}
          periodLabel={PERIOD_LABEL[editing.period]}
          categoryLabel={translateCategoryName(t, editing.category)}
          onClose={() => setEditing(null)}
          onSave={(limit) => {
            updateLimit(editing, limit)
            setEditing(null)
          }}
          onDelete={() => {
            removeBudget(editing)
            setEditing(null)
          }}
        />
      )}
    </div>
  )
}

function BudgetEditSheet({
  budget,
  currency,
  periodLabel,
  categoryLabel,
  onClose,
  onSave,
  onDelete,
}: {
  budget: CategoryBudget
  currency: string
  periodLabel: string
  categoryLabel: string
  onClose: () => void
  onSave: (limit: number) => void
  onDelete: () => void
}) {
  const t = useT()
  const [limitText, setLimitText] = useState(String(budget.limit))
  const [confirming, setConfirming] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => showTelegramBackButton(onClose), [onClose])

  function save() {
    const n = parseFloat(limitText)
    if (!n || n <= 0) {
      setError(t.budgets.errorEnterLimit)
      return
    }
    onSave(n)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-[2px]" onClick={onClose}>
      <div
        className="w-full sm:max-w-md bg-paper-card rounded-t-lg sm:rounded-lg border-t sm:border border-paper-line max-h-[90vh] overflow-y-auto pb-[env(safe-area-inset-bottom)] sm:pb-0"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-center pt-2.5 pb-1 sm:hidden">
          <span className="h-1 w-9 rounded-full bg-paper-line" />
        </div>
        <div className="flex items-center justify-between px-5 py-3 border-b border-paper-line">
          <h3 className="font-display font-semibold text-lg">{t.budgets.editTitle}</h3>
          <button onClick={onClose} aria-label={t.common.cancel} className="-mr-2 flex h-11 w-11 items-center justify-center text-ink-softer hover:text-ink">
            <X size={18} />
          </button>
        </div>

        <div className="px-5 py-5 flex flex-col gap-4">
          <p className="text-sm text-ink-softer">
            {categoryLabel} · {periodLabel}
          </p>

          <div>
            <label className="block text-xs font-medium text-ink-softer mb-1.5">
              {t.budgets.limitLabel} ({currency})
            </label>
            <input
              type="number"
              min="0"
              step="1"
              inputMode="decimal"
              autoFocus
              value={limitText}
              onChange={(e) => setLimitText(e.target.value)}
              className="w-full px-3 min-h-[48px] border border-paper-line rounded text-base font-tabular focus:border-sage outline-none"
            />
          </div>

          {error && <p className="text-sm text-clay-dark">{error}</p>}

          <button
            type="button"
            onClick={save}
            className="w-full min-h-[48px] bg-ink text-paper rounded font-medium text-sm hover:bg-ink-light transition-colors"
          >
            {t.common.save}
          </button>

          {!confirming ? (
            <button
              type="button"
              onClick={() => setConfirming(true)}
              className="w-full min-h-[44px] rounded text-sm font-medium text-clay-dark hover:bg-clay-light transition-colors"
            >
              {t.common.delete}
            </button>
          ) : (
            <div>
              <p className="text-sm text-ink mb-2">{t.budgets.deleteConfirm}</p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={onDelete}
                  className="flex-1 min-h-[44px] rounded bg-clay text-white text-sm font-medium hover:bg-clay-dark transition-colors"
                >
                  {t.common.delete}
                </button>
                <button
                  type="button"
                  onClick={() => setConfirming(false)}
                  className="flex-1 min-h-[44px] rounded border border-paper-line text-ink-softer text-sm font-medium hover:bg-paper transition-colors"
                >
                  {t.common.cancel}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
