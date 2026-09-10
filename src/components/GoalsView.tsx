import { useEffect, useState } from 'react'
import { Plus, X, PlusCircle } from 'lucide-react'
import { AppState, Goal, GoalIcon } from '../types'
import { formatMoney, parseLocalDate } from '../lib/utils'
import { Card, ProgressBar, GoalIconGlyph, SectionHeading, goalIconLabel } from './shared'
import RowMenu from './RowMenu'
import { EmptyState } from './Dashboard'
import { Dictionary, useI18n, useT } from '../lib/i18n'

const ICON_KEYS: GoalIcon[] = [
  'flight',
  'clothes',
  'travel',
  'tech',
  'home',
  'gift',
  'car',
  'education',
  'health',
  'emergencyFund',
  'pet',
  'hobby',
  'phone',
  'music',
  'fitness',
  'kids',
  'charity',
  'business',
  'renovation',
  'debt',
  'savings',
  'insurance',
  'outdoors',
  'wedding',
  'furniture',
  'books',
  'games',
  'food',
  'family',
  'shopping',
  'bike',
  'other',
]

function goalIconOptions(t: Dictionary): { key: GoalIcon; label: string }[] {
  return ICON_KEYS.map((key) => ({ key, label: goalIconLabel(t, key) }))
}

export default function GoalsView({
  state,
  addGoal,
  updateGoal,
  deleteGoal,
  allocateToGoal,
  prefill = null,
  onPrefillConsumed,
}: {
  state: AppState
  addGoal: (g: Omit<Goal, 'id' | 'createdAt'>) => void
  updateGoal: (id: string, patch: Partial<Goal>) => void
  deleteGoal: (id: string) => void
  allocateToGoal: (id: string, amount: number) => void
  // From a notification deep link — pre-fill this goal's "add funds" field with `amount`.
  prefill?: { id: string; amount: number } | null
  onPrefillConsumed?: () => void
}) {
  const t = useT()
  const [showAdd, setShowAdd] = useState(false)
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null)

  return (
    <div>
      <SectionHeading
        eyebrow={t.goals.eyebrow}
        title={t.goals.title}
        action={
          <button
            onClick={() => setShowAdd(true)}
            className="inline-flex items-center gap-2 bg-ink text-paper px-4 min-h-[44px] rounded font-medium text-sm hover:bg-ink-light transition-colors"
          >
            <Plus size={16} />
            {t.goals.newGoalButton}
          </button>
        }
      />

      {state.goals.length === 0 ? (
        <Card className="p-8">
          <EmptyState text={t.goals.emptyState} />
        </Card>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {state.goals.map((g) => (
            <GoalCard
              key={g.id}
              goal={g}
              currency={state.settings.currency}
              onEdit={() => setEditingGoal(g)}
              onDelete={() => deleteGoal(g.id)}
              onAllocate={allocateToGoal}
              prefillAmount={prefill?.id === g.id ? prefill.amount : undefined}
              onPrefillConsumed={onPrefillConsumed}
            />
          ))}
        </div>
      )}

      {(showAdd || editingGoal) && (
        <NewGoalModal
          editing={editingGoal}
          onClose={() => {
            setShowAdd(false)
            setEditingGoal(null)
          }}
          onSave={(g) => {
            if (editingGoal) updateGoal(editingGoal.id, g)
            else addGoal(g)
            setShowAdd(false)
            setEditingGoal(null)
          }}
        />
      )}
    </div>
  )
}

function GoalCard({
  goal,
  currency,
  onEdit,
  onDelete,
  onAllocate,
  prefillAmount,
  onPrefillConsumed,
}: {
  goal: Goal
  currency: string
  onEdit: () => void
  onDelete: () => void
  onAllocate: (id: string, amount: number) => void
  prefillAmount?: number
  onPrefillConsumed?: () => void
}) {
  const { t, locale } = useI18n()
  const [addAmount, setAddAmount] = useState('')

  // Deep link landed on this card: drop the amount into the field and bring it into view. Runs
  // once — the parent clears the intent via onPrefillConsumed, so this can't loop.
  useEffect(() => {
    if (prefillAmount == null) return
    setAddAmount(String(prefillAmount))
    document.getElementById(`goal-card-${goal.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    onPrefillConsumed?.()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prefillAmount])

  const ratio = goal.savedAmount / goal.targetAmount
  const remaining = Math.max(goal.targetAmount - goal.savedAmount, 0)
  const daysLeft = Math.max(Math.round((parseLocalDate(goal.targetDate).getTime() - Date.now()) / 86400000), 0)
  const monthlyPace = daysLeft > 0 ? (remaining / daysLeft) * 30.44 : 0
  const complete = remaining <= 0

  function handleAllocate(e: React.FormEvent) {
    e.preventDefault()
    const num = parseFloat(addAmount)
    if (!num || num <= 0) return
    onAllocate(goal.id, num)
    setAddAmount('')
  }

  return (
    <Card id={`goal-card-${goal.id}`} className="p-4 sm:p-5 flex flex-col min-w-0">
      <div className="flex items-start gap-2.5 mb-3">
        <span className="w-9 h-9 rounded-full bg-gold-light text-gold-dark flex items-center justify-center shrink-0">
          <GoalIconGlyph icon={goal.icon} size={16} />
        </span>
        <div className="min-w-0 flex-1">
          <h4 className="font-medium text-ink text-sm leading-snug">{goal.name}</h4>
          <p className="text-xs text-ink-softer mt-0.5">
            {t.goals.targetLabel(parseLocalDate(goal.targetDate).toLocaleDateString(locale, { month: 'short', day: 'numeric', year: 'numeric' }))}
          </p>
        </div>
        <RowMenu
          label={`${t.common.moreActions} — ${goal.name}`}
          onEdit={onEdit}
          onDelete={onDelete}
          deleteConfirmLabel={t.goals.deleteConfirm}
        />
      </div>

      <div className="flex items-baseline justify-between gap-2 mb-2">
        <span className="font-tabular font-semibold text-lg text-ink min-w-0 truncate">{formatMoney(goal.savedAmount, currency)}</span>
        <span className="text-xs text-ink-softer font-tabular shrink-0">{t.goals.ofAmount(formatMoney(goal.targetAmount, currency))}</span>
      </div>
      <ProgressBar ratio={ratio} tone={complete ? 'gold' : 'sage'} />

      <p className="text-xs text-ink-softer mt-3 leading-relaxed">
        {complete ? t.goals.complete : daysLeft > 0 ? t.goals.onTrack(formatMoney(monthlyPace, currency), daysLeft) : t.goals.passed}
      </p>

      {!complete && (
        <form onSubmit={handleAllocate} className="flex gap-2 mt-4">
          <input
            type="number"
            min="0"
            step="0.01"
            inputMode="decimal"
            value={addAmount}
            onChange={(e) => setAddAmount(e.target.value)}
            placeholder="0.00"
            aria-label={t.goals.addFundsButton}
            className="flex-1 min-w-0 px-3 min-h-[44px] border border-paper-line rounded text-sm font-tabular focus:border-sage outline-none"
          />
          <button
            type="submit"
            className="inline-flex items-center gap-1 bg-sage text-white px-4 min-h-[44px] rounded text-sm font-medium hover:bg-sage-dark transition-colors shrink-0"
          >
            <PlusCircle size={14} />
            {t.goals.addFundsButton}
          </button>
        </form>
      )}
    </Card>
  )
}

function NewGoalModal({
  editing,
  onClose,
  onSave,
}: {
  editing?: Goal | null
  onClose: () => void
  onSave: (g: Omit<Goal, 'id' | 'createdAt'>) => void
}) {
  const t = useT()
  const [name, setName] = useState(editing?.name ?? '')
  const [targetAmount, setTargetAmount] = useState(editing ? String(editing.targetAmount) : '')
  const [savedAmount, setSavedAmount] = useState(editing ? String(editing.savedAmount) : '0')
  const [targetDate, setTargetDate] = useState(editing?.targetDate ?? '')
  const [icon, setIcon] = useState<GoalIcon>(editing?.icon ?? 'flight')
  const [error, setError] = useState('')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const target = parseFloat(targetAmount)
    const saved = parseFloat(savedAmount) || 0
    if (!name.trim()) return setError(t.goals.errorName)
    if (!target || target <= 0) return setError(t.goals.errorTarget)
    if (!targetDate) return setError(t.goals.errorDate)
    onSave({ name: name.trim(), targetAmount: target, savedAmount: saved, targetDate, icon })
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-[2px]">
      <div className="bg-paper-card w-full sm:max-w-md sm:rounded-lg rounded-t-lg border border-paper-line max-h-[90vh] overflow-y-auto pb-[env(safe-area-inset-bottom)] sm:pb-0">
        <div className="flex items-center justify-between px-5 py-4 border-b border-paper-line">
          <h3 className="font-display font-semibold text-lg">{editing ? t.goals.modalTitleEdit : t.goals.modalTitleNew}</h3>
          <button onClick={onClose} aria-label={t.common.cancel} className="-mr-2 flex h-11 w-11 items-center justify-center text-ink-softer hover:text-ink">
            <X size={18} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="px-5 py-5 flex flex-col gap-4">
          <div>
            <label className="block text-xs font-medium text-ink-softer mb-1.5">{t.goals.nameLabel}</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t.goals.namePlaceholder}
              autoFocus
              className="w-full px-3 py-2.5 border border-paper-line rounded text-sm focus:border-sage outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-ink-softer mb-2">{t.goals.iconLabel}</label>
            <div className="flex flex-wrap gap-2">
              {goalIconOptions(t).map((opt) => (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => setIcon(opt.key)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium border transition-colors ${
                    icon === opt.key ? 'border-sage bg-sage-light text-sage-dark' : 'border-paper-line text-ink-softer'
                  }`}
                >
                  <GoalIconGlyph icon={opt.key} size={14} />
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-ink-softer mb-1.5">{t.goals.targetAmountLabel}</label>
              <input
                type="number"
                min="0"
                step="1"
                value={targetAmount}
                onChange={(e) => setTargetAmount(e.target.value)}
                placeholder="0"
                className="w-full px-3 py-2.5 border border-paper-line rounded text-sm font-tabular focus:border-sage outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-ink-softer mb-1.5">{t.goals.alreadySavedLabel}</label>
              <input
                type="number"
                min="0"
                step="1"
                value={savedAmount}
                onChange={(e) => setSavedAmount(e.target.value)}
                className="w-full px-3 py-2.5 border border-paper-line rounded text-sm font-tabular focus:border-sage outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-ink-softer mb-1.5">{t.goals.targetDateLabel}</label>
            <input
              type="date"
              value={targetDate}
              onChange={(e) => setTargetDate(e.target.value)}
              className="w-full px-3 py-2.5 border border-paper-line rounded text-sm focus:border-sage outline-none"
            />
          </div>

          {error && <p className="text-sm text-clay-dark">{error}</p>}

          <button
            type="submit"
            className="w-full min-h-[48px] bg-ink text-paper rounded font-medium text-sm hover:bg-ink-light transition-colors mt-1"
          >
            {editing ? t.goals.submitSaveChanges : t.goals.submitCreate}
          </button>
        </form>
      </div>
    </div>
  )
}
