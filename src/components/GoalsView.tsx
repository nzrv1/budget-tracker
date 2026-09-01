import { useState } from 'react'
import { Plus, X, Trash2, PlusCircle } from 'lucide-react'
import { AppState, Goal, GoalIcon } from '../types'
import { formatMoney } from '../lib/utils'
import { Card, ProgressBar, GoalIconGlyph, SectionHeading } from './shared'
import { EmptyState } from './Dashboard'

const ICON_OPTIONS: { key: GoalIcon; label: string }[] = [
  { key: 'flight', label: 'Flights' },
  { key: 'clothes', label: 'Clothes' },
  { key: 'travel', label: 'Travel' },
  { key: 'tech', label: 'Tech' },
  { key: 'home', label: 'Home' },
  { key: 'gift', label: 'Gift' },
  { key: 'car', label: 'Car' },
  { key: 'education', label: 'Education' },
  { key: 'health', label: 'Health' },
  { key: 'emergencyFund', label: 'Emergency fund' },
  { key: 'pet', label: 'Pet' },
  { key: 'hobby', label: 'Hobby' },
  { key: 'phone', label: 'Phone' },
  { key: 'music', label: 'Music' },
  { key: 'fitness', label: 'Fitness' },
  { key: 'kids', label: 'Kids' },
  { key: 'charity', label: 'Charity' },
  { key: 'business', label: 'Business' },
  { key: 'renovation', label: 'Renovation' },
  { key: 'debt', label: 'Debt' },
  { key: 'savings', label: 'Savings' },
  { key: 'insurance', label: 'Insurance' },
  { key: 'outdoors', label: 'Outdoors' },
  { key: 'wedding', label: 'Wedding' },
  { key: 'furniture', label: 'Furniture' },
  { key: 'books', label: 'Books' },
  { key: 'games', label: 'Games' },
  { key: 'food', label: 'Food' },
  { key: 'family', label: 'Family' },
  { key: 'shopping', label: 'Shopping' },
  { key: 'bike', label: 'Bike' },
  { key: 'other', label: 'Other' },
]

export default function GoalsView({
  state,
  addGoal,
  updateGoal,
  deleteGoal,
}: {
  state: AppState
  addGoal: (g: Omit<Goal, 'id' | 'createdAt'>) => void
  updateGoal: (id: string, patch: Partial<Goal>) => void
  deleteGoal: (id: string) => void
}) {
  const [showAdd, setShowAdd] = useState(false)

  return (
    <div>
      <SectionHeading
        eyebrow="What you're saving for"
        title="Goals"
        action={
          <button
            onClick={() => setShowAdd(true)}
            className="inline-flex items-center gap-2 bg-ink text-paper px-4 py-2.5 rounded font-medium text-sm hover:bg-ink-light transition-colors"
          >
            <Plus size={16} />
            New goal
          </button>
        }
      />

      {state.goals.length === 0 ? (
        <Card className="p-8">
          <EmptyState text="No goals yet — create one for that flight, jacket, or trip you're saving toward." />
        </Card>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {state.goals.map((g) => (
            <GoalCard key={g.id} goal={g} currency={state.settings.currency} onUpdate={updateGoal} onDelete={deleteGoal} />
          ))}
        </div>
      )}

      {showAdd && <NewGoalModal onClose={() => setShowAdd(false)} onSave={addGoal} />}
    </div>
  )
}

function GoalCard({
  goal,
  currency,
  onUpdate,
  onDelete,
}: {
  goal: Goal
  currency: string
  onUpdate: (id: string, patch: Partial<Goal>) => void
  onDelete: (id: string) => void
}) {
  const [addAmount, setAddAmount] = useState('')
  const ratio = goal.savedAmount / goal.targetAmount
  const remaining = Math.max(goal.targetAmount - goal.savedAmount, 0)
  const daysLeft = Math.max(Math.round((new Date(goal.targetDate).getTime() - Date.now()) / 86400000), 0)
  const monthlyPace = daysLeft > 0 ? (remaining / daysLeft) * 30.44 : 0
  const complete = remaining <= 0

  function handleAllocate(e: React.FormEvent) {
    e.preventDefault()
    const num = parseFloat(addAmount)
    if (!num || num <= 0) return
    onUpdate(goal.id, { savedAmount: goal.savedAmount + num })
    setAddAmount('')
  }

  return (
    <Card className="p-5 flex flex-col">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2.5">
          <span className="w-9 h-9 rounded-full bg-gold-light text-gold-dark flex items-center justify-center shrink-0">
            <GoalIconGlyph icon={goal.icon} size={16} />
          </span>
          <div>
            <h4 className="font-medium text-ink text-sm leading-tight">{goal.name}</h4>
            <p className="text-xs text-ink-softer mt-0.5">
              Target {new Date(goal.targetDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
            </p>
          </div>
        </div>
        <button onClick={() => onDelete(goal.id)} className="text-ink-softer hover:text-clay-dark shrink-0" aria-label="Delete goal">
          <Trash2 size={14} />
        </button>
      </div>

      <div className="flex justify-between items-baseline mb-2">
        <span className="font-tabular font-semibold text-lg text-ink">{formatMoney(goal.savedAmount, currency)}</span>
        <span className="text-xs text-ink-softer font-tabular">of {formatMoney(goal.targetAmount, currency)}</span>
      </div>
      <ProgressBar ratio={ratio} tone={complete ? 'gold' : 'sage'} />

      <p className="text-xs text-ink-softer mt-3 leading-relaxed">
        {complete
          ? 'Fully funded — good time to make this happen.'
          : daysLeft > 0
          ? `About ${formatMoney(monthlyPace, currency)}/month keeps you on track for ${daysLeft} days left.`
          : 'Target date has passed.'}
      </p>

      {!complete && (
        <form onSubmit={handleAllocate} className="flex gap-2 mt-4">
          <input
            type="number"
            min="0"
            step="0.01"
            value={addAmount}
            onChange={(e) => setAddAmount(e.target.value)}
            placeholder="Add funds"
            className="flex-1 min-w-0 px-2.5 py-2 border border-paper-line rounded text-sm font-tabular focus:border-sage outline-none"
          />
          <button
            type="submit"
            className="inline-flex items-center gap-1 bg-sage text-white px-3 py-2 rounded text-sm font-medium hover:bg-sage-dark transition-colors shrink-0"
          >
            <PlusCircle size={14} />
            Add
          </button>
        </form>
      )}
    </Card>
  )
}

function NewGoalModal({
  onClose,
  onSave,
}: {
  onClose: () => void
  onSave: (g: Omit<Goal, 'id' | 'createdAt'>) => void
}) {
  const [name, setName] = useState('')
  const [targetAmount, setTargetAmount] = useState('')
  const [savedAmount, setSavedAmount] = useState('0')
  const [targetDate, setTargetDate] = useState('')
  const [icon, setIcon] = useState<GoalIcon>('flight')
  const [error, setError] = useState('')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const target = parseFloat(targetAmount)
    const saved = parseFloat(savedAmount) || 0
    if (!name.trim()) return setError('Give your goal a name.')
    if (!target || target <= 0) return setError('Enter a target amount greater than zero.')
    if (!targetDate) return setError('Choose a target date.')
    onSave({ name: name.trim(), targetAmount: target, savedAmount: saved, targetDate, icon })
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-[2px]">
      <div className="bg-paper-card w-full sm:max-w-md sm:rounded-lg rounded-t-lg border border-paper-line max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b border-paper-line">
          <h3 className="font-display font-semibold text-lg">New goal</h3>
          <button onClick={onClose} className="text-ink-softer hover:text-ink">
            <X size={18} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="px-5 py-5 flex flex-col gap-4">
          <div>
            <label className="block text-xs font-medium text-ink-softer mb-1.5">Goal name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Flight to Lisbon"
              autoFocus
              className="w-full px-3 py-2.5 border border-paper-line rounded text-sm focus:border-sage outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-ink-softer mb-2">Icon</label>
            <div className="flex flex-wrap gap-2">
              {ICON_OPTIONS.map((opt) => (
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
              <label className="block text-xs font-medium text-ink-softer mb-1.5">Target amount</label>
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
              <label className="block text-xs font-medium text-ink-softer mb-1.5">Already saved</label>
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
            <label className="block text-xs font-medium text-ink-softer mb-1.5">Target date</label>
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
            className="w-full py-3 bg-ink text-paper rounded font-medium text-sm hover:bg-ink-light transition-colors mt-1"
          >
            Create goal
          </button>
        </form>
      </div>
    </div>
  )
}
