import { useState } from 'react'
import { Plus, X, Trash2, PlusCircle, Pencil } from 'lucide-react'
import { ImportantDate, ImportantDateCategory } from '../types'
import { formatMoney } from '../lib/utils'
import { Card, ProgressBar, SectionHeading } from './shared'
import { EmptyState } from './Dashboard'
import {
  IMPORTANT_DATE_CATEGORY_OPTIONS,
  ImportantDateIconGlyph,
  QUICK_ADD_PRESETS,
  daysUntil,
  nextOccurrence,
} from '../lib/importantDates'

export default function ImportantDatesView({
  state,
  addImportantDate,
  updateImportantDate,
  deleteImportantDate,
}: {
  state: { importantDates: ImportantDate[]; settings: { currency: string } }
  addImportantDate: (d: Omit<ImportantDate, 'id' | 'createdAt'>) => void
  updateImportantDate: (id: string, patch: Partial<ImportantDate>) => void
  deleteImportantDate: (id: string) => void
}) {
  const [showAdd, setShowAdd] = useState(false)
  const [prefill, setPrefill] = useState<Partial<Pick<ImportantDate, 'name' | 'category' | 'recurring' | 'date'>>>({})
  const [editingDate, setEditingDate] = useState<ImportantDate | null>(null)

  const sorted = [...state.importantDates].sort((a, b) => daysUntil(a) - daysUntil(b))

  function openWithPreset(preset: (typeof QUICK_ADD_PRESETS)[number]) {
    const year = new Date().getFullYear()
    setPrefill({
      name: preset.name,
      category: preset.category,
      recurring: preset.recurring,
      date: preset.date ? `${year}-${preset.date}` : undefined,
    })
    setShowAdd(true)
  }

  return (
    <div>
      <SectionHeading
        eyebrow="Don't miss these"
        title="Important Dates"
        action={
          <button
            onClick={() => {
              setPrefill({})
              setShowAdd(true)
            }}
            className="inline-flex items-center gap-2 bg-ink text-paper px-4 py-2.5 rounded font-medium text-sm hover:bg-ink-light transition-colors"
          >
            <Plus size={16} />
            New date
          </button>
        }
      />

      <div className="flex flex-wrap gap-2 mb-5">
        {QUICK_ADD_PRESETS.map((preset) => (
          <button
            key={preset.label}
            type="button"
            onClick={() => openWithPreset(preset)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border border-paper-line text-ink-softer hover:border-ink-softer/40 hover:text-ink transition-colors"
          >
            <ImportantDateIconGlyph category={preset.category} size={13} />
            {preset.label}
          </button>
        ))}
      </div>

      {sorted.length === 0 ? (
        <Card className="p-8">
          <EmptyState text="No important dates yet — add a birthday, holiday, or car service so you don't get caught off guard." />
        </Card>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {sorted.map((d) => (
            <DateCard
              key={d.id}
              date={d}
              currency={state.settings.currency}
              onUpdate={updateImportantDate}
              onDelete={deleteImportantDate}
              onEdit={setEditingDate}
            />
          ))}
        </div>
      )}

      {(showAdd || editingDate) && (
        <NewDateModal
          prefill={prefill}
          editing={editingDate}
          onClose={() => {
            setShowAdd(false)
            setEditingDate(null)
          }}
          onSave={(d) => {
            if (editingDate) {
              updateImportantDate(editingDate.id, d)
            } else {
              addImportantDate(d)
            }
            setShowAdd(false)
            setEditingDate(null)
          }}
        />
      )}
    </div>
  )
}

function DateCard({
  date,
  currency,
  onUpdate,
  onDelete,
  onEdit,
}: {
  date: ImportantDate
  currency: string
  onUpdate: (id: string, patch: Partial<ImportantDate>) => void
  onDelete: (id: string) => void
  onEdit: (date: ImportantDate) => void
}) {
  const [addAmount, setAddAmount] = useState('')
  const days = daysUntil(date)
  const occursOn = nextOccurrence(date.date, date.recurring)

  const hasTarget = !!date.targetAmount && date.targetAmount > 0
  const target = date.targetAmount ?? 0
  const saved = date.savedAmount ?? 0
  const ratio = target > 0 ? saved / target : 0
  const remaining = Math.max(target - saved, 0)
  const complete = hasTarget && remaining <= 0

  function handleAllocate(e: React.FormEvent) {
    e.preventDefault()
    const num = parseFloat(addAmount)
    if (!num || num <= 0) return
    onUpdate(date.id, { savedAmount: saved + num })
    setAddAmount('')
  }

  return (
    <Card className="p-5 flex flex-col">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2.5">
          <span className="w-9 h-9 rounded-full bg-gold-light text-gold-dark flex items-center justify-center shrink-0">
            <ImportantDateIconGlyph category={date.category} size={16} />
          </span>
          <div>
            <h4 className="font-medium text-ink text-sm leading-tight">{date.name}</h4>
            <p className="text-xs text-ink-softer mt-0.5">
              {occursOn.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
              {date.recurring && ' · yearly'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button onClick={() => onEdit(date)} className="text-ink-softer hover:text-ink" aria-label="Edit date">
            <Pencil size={14} />
          </button>
          <button onClick={() => onDelete(date.id)} className="text-ink-softer hover:text-clay-dark" aria-label="Delete date">
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {hasTarget && (
        <>
          <div className="flex justify-between items-baseline mb-2">
            <span className="font-tabular font-semibold text-sm text-ink">{formatMoney(saved, currency)}</span>
            <span className="text-xs text-ink-softer font-tabular">of {formatMoney(target, currency)}</span>
          </div>
          <ProgressBar ratio={ratio} tone={complete ? 'gold' : 'sage'} />
        </>
      )}

      <p className={`text-sm text-ink-softer ${hasTarget ? 'mt-3' : 'mt-auto'}`}>
        {days === 0 ? 'Today' : days === 1 ? 'Tomorrow' : `In ${days} days`}
        {hasTarget && !complete && ` · ${formatMoney(remaining, currency)} left to set aside`}
        {complete && ' · fully funded'}
      </p>

      {hasTarget && !complete && (
        <form onSubmit={handleAllocate} className="flex gap-2 mt-3">
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

function NewDateModal({
  prefill,
  editing,
  onClose,
  onSave,
}: {
  prefill: Partial<Pick<ImportantDate, 'name' | 'category' | 'recurring' | 'date'>>
  editing?: ImportantDate | null
  onClose: () => void
  onSave: (d: Omit<ImportantDate, 'id' | 'createdAt'>) => void
}) {
  const [name, setName] = useState(editing?.name ?? prefill.name ?? '')
  const [category, setCategory] = useState<ImportantDateCategory>(editing?.category ?? prefill.category ?? 'other')
  const [date, setDate] = useState(editing?.date ?? prefill.date ?? '')
  const [recurring, setRecurring] = useState(editing?.recurring ?? prefill.recurring ?? true)
  const [targetAmount, setTargetAmount] = useState(editing?.targetAmount ? String(editing.targetAmount) : '')
  const [savedAmount, setSavedAmount] = useState(editing?.savedAmount ? String(editing.savedAmount) : '0')
  const [error, setError] = useState('')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return setError('Give this date a name.')
    if (!date) return setError('Choose a date.')

    const target = targetAmount.trim() ? parseFloat(targetAmount) : undefined
    if (targetAmount.trim() && (!target || target <= 0)) return setError('Target amount should be greater than zero.')

    onSave({
      name: name.trim(),
      category,
      date,
      recurring,
      targetAmount: target,
      savedAmount: target ? parseFloat(savedAmount) || 0 : undefined,
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-[2px]">
      <div className="bg-paper-card w-full sm:max-w-md sm:rounded-lg rounded-t-lg border border-paper-line max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b border-paper-line">
          <h3 className="font-display font-semibold text-lg">{editing ? 'Edit important date' : 'New important date'}</h3>
          <button onClick={onClose} className="text-ink-softer hover:text-ink">
            <X size={18} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="px-5 py-5 flex flex-col gap-4">
          <div>
            <label className="block text-xs font-medium text-ink-softer mb-1.5">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Mom's birthday"
              autoFocus
              className="w-full px-3 py-2.5 border border-paper-line rounded text-sm focus:border-sage outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-ink-softer mb-2">Category</label>
            <div className="flex flex-wrap gap-2">
              {IMPORTANT_DATE_CATEGORY_OPTIONS.map((opt) => (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => setCategory(opt.key)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium border transition-colors ${
                    category === opt.key ? 'border-sage bg-sage-light text-sage-dark' : 'border-paper-line text-ink-softer'
                  }`}
                >
                  <ImportantDateIconGlyph category={opt.key} size={14} />
                  {opt.label}
                </button>
              ))}
            </div>
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

          <label className="flex items-center gap-2 text-sm text-ink-softer">
            <input type="checkbox" checked={recurring} onChange={(e) => setRecurring(e.target.checked)} className="accent-sage" />
            Repeats every year
          </label>

          <div className="border-t border-paper-line pt-4">
            <label className="block text-xs font-medium text-ink-softer mb-1.5">Amount to set aside (optional)</label>
            <div className="grid grid-cols-2 gap-3">
              <input
                type="number"
                min="0"
                step="1"
                value={targetAmount}
                onChange={(e) => setTargetAmount(e.target.value)}
                placeholder="0"
                className="w-full px-3 py-2.5 border border-paper-line rounded text-sm font-tabular focus:border-sage outline-none"
              />
              <input
                type="number"
                min="0"
                step="1"
                value={savedAmount}
                onChange={(e) => setSavedAmount(e.target.value)}
                disabled={!targetAmount.trim()}
                placeholder="Already saved"
                className="w-full px-3 py-2.5 border border-paper-line rounded text-sm font-tabular focus:border-sage outline-none disabled:opacity-40"
              />
            </div>
            <p className="text-xs text-ink-softer mt-1.5">
              Leave blank if this date doesn't need a savings target — just a reminder.
            </p>
          </div>

          {error && <p className="text-sm text-clay-dark">{error}</p>}

          <button
            type="submit"
            className="w-full py-3 bg-ink text-paper rounded font-medium text-sm hover:bg-ink-light transition-colors mt-1"
          >
            {editing ? 'Save changes' : 'Save date'}
          </button>
        </form>
      </div>
    </div>
  )
}
