import { useState } from 'react'
import { Trash2, Check, Plus, X, Bell, Target, CalendarDays, Briefcase } from 'lucide-react'
import { AppState, CategoryDef, CategoryIconKey, IncomeSource, ReminderOffsetKey, ReminderTargetKind, ThemeKey } from '../types'
import { CollapsibleCard, GoalIconGlyph, ProgressBar, SectionHeading } from './shared'
import { formatMoney } from '../lib/utils'
import { THEMES } from '../lib/themes'
import { CATEGORY_ICON_OPTIONS, CategoryIconGlyph, suggestIconForName } from '../lib/categoryIcons'
import { ImportantDateIconGlyph } from '../lib/importantDates'
import { MAX_REMINDERS, OFFSET_OPTIONS, defaultOffsetsForCount, offsetLabel } from '../lib/goalReminders'

const CURRENCIES = [
  { code: 'EUR', label: 'Euro (€)' },
  { code: 'USD', label: 'US Dollar ($)' },
  { code: 'GBP', label: 'British Pound (£)' },
  { code: 'PLN', label: 'Polish Zloty (zł)' },
]

export default function SettingsView({
  state,
  updateSettings,
  resetData,
  setTheme,
  addCategory,
  setReminderRule,
  removeReminderRule,
  addIncomeSource,
  deleteIncomeSource,
}: {
  state: AppState
  updateSettings: (patch: Partial<AppState['settings']>) => void
  resetData: () => void
  setTheme: (t: ThemeKey) => void
  addCategory: (def: CategoryDef) => void
  setReminderRule: (targetKind: ReminderTargetKind, targetId: string, offsets: ReminderOffsetKey[]) => void
  removeReminderRule: (targetKind: ReminderTargetKind, targetId: string) => void
  addIncomeSource: (s: Omit<IncomeSource, 'id'>) => void
  deleteIncomeSource: (id: string) => void
}) {
  const [confirmReset, setConfirmReset] = useState(false)

  const [newIncomeName, setNewIncomeName] = useState('')
  const [newIncomeAmount, setNewIncomeAmount] = useState('')
  const [newIncomeDay, setNewIncomeDay] = useState('')

  function handleAddIncomeSource() {
    const name = newIncomeName.trim()
    const amount = parseFloat(newIncomeAmount)
    const day = parseInt(newIncomeDay, 10)
    if (!name || !amount || amount <= 0 || !day || day < 1 || day > 31) return
    addIncomeSource({ name, amount, payDay: day })
    setNewIncomeName('')
    setNewIncomeAmount('')
    setNewIncomeDay('')
  }

  const [newCatName, setNewCatName] = useState('')
  const [newCatIcon, setNewCatIcon] = useState<CategoryIconKey>('other')
  const [iconTouched, setIconTouched] = useState(false)

  function handleNameChange(name: string) {
    setNewCatName(name)
    // Suggest an icon based on what's being typed, unless the person already
    // picked one by hand for this entry.
    if (!iconTouched) {
      const suggestion = suggestIconForName(name)
      if (suggestion) setNewCatIcon(suggestion)
    }
  }

  function handleAddCategory() {
    const trimmed = newCatName.trim()
    if (!trimmed) return
    addCategory({ name: trimmed, icon: newCatIcon })
    setNewCatName('')
    setNewCatIcon('other')
    setIconTouched(false)
  }

  const [reminderKind, setReminderKind] = useState<ReminderTargetKind>('goal')
  const [reminderTargetId, setReminderTargetId] = useState('')
  const [reminderOffsets, setReminderOffsets] = useState<ReminderOffsetKey[]>([])

  function handleKindChange(kind: ReminderTargetKind) {
    setReminderKind(kind)
    setReminderTargetId('')
    setReminderOffsets([])
  }

  function loadTargetIntoForm(kind: ReminderTargetKind, targetId: string) {
    setReminderKind(kind)
    setReminderTargetId(targetId)
    const existing = state.reminderRules.find((r) => r.targetKind === kind && r.targetId === targetId)
    setReminderOffsets(existing ? existing.offsets : defaultOffsetsForCount(3))
  }

  function setReminderCount(count: number) {
    setReminderOffsets((prev) => {
      if (count <= prev.length) return prev.slice(0, count)
      const defaults = defaultOffsetsForCount(count)
      return [...prev, ...defaults.slice(prev.length, count)]
    })
  }

  function updateReminderSlot(index: number, offset: ReminderOffsetKey) {
    setReminderOffsets((prev) => prev.map((o, i) => (i === index ? offset : o)))
  }

  function handleSaveReminderRule() {
    if (!reminderTargetId || reminderOffsets.length === 0) return
    setReminderRule(reminderKind, reminderTargetId, reminderOffsets)
  }

  function handleRemoveReminderRule(kind: ReminderTargetKind, targetId: string) {
    removeReminderRule(kind, targetId)
    if (reminderKind === kind && reminderTargetId === targetId) {
      setReminderTargetId('')
      setReminderOffsets([])
    }
  }

  return (
    <div className="max-w-lg">
      <SectionHeading eyebrow="Your preferences" title="Settings" />

      <CollapsibleCard title="Appearance" className="mb-5">
        <label className="block text-xs font-medium text-ink-softer mb-2">Theme</label>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
          {THEMES.map((t) => {
            const active = state.settings.theme === t.key
            return (
              <button
                key={t.key}
                type="button"
                onClick={() => setTheme(t.key)}
                className={`flex flex-col gap-2.5 p-3 rounded-lg border text-left transition-colors ${
                  active ? 'border-sage bg-sage-light' : 'border-paper-line hover:border-ink-softer/40'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="flex -space-x-1">
                    {t.preview.map((c, i) => (
                      <span key={i} className="w-4 h-4 rounded-full border-2 border-paper-card" style={{ background: c }} />
                    ))}
                  </span>
                  {active && <Check size={14} className="text-sage-dark" />}
                </div>
                <span className="text-sm font-medium text-ink">{t.label}</span>
              </button>
            )
          })}
        </div>
      </CollapsibleCard>

      <CollapsibleCard title="General" className="mb-5">
        <label className="block text-xs font-medium text-ink-softer mb-1.5">Currency</label>
        <select
          value={state.settings.currency}
          onChange={(e) => updateSettings({ currency: e.target.value })}
          className="w-full px-3 py-2.5 border border-paper-line rounded text-sm bg-white focus:border-sage outline-none mb-4"
        >
          {CURRENCIES.map((c) => (
            <option key={c.code} value={c.code}>
              {c.label}
            </option>
          ))}
        </select>

        <label className="block text-xs font-medium text-ink-softer mb-1.5">Basic salary</label>
        <input
          type="number"
          min="0"
          step="1"
          value={state.settings.monthlyIncome}
          onChange={(e) => updateSettings({ monthlyIncome: parseFloat(e.target.value) || 0 })}
          className="w-full px-3 py-2.5 border border-paper-line rounded text-sm font-tabular focus:border-sage outline-none"
        />
        <p className="text-xs text-ink-softer mt-1.5">
          Your regular monthly income — used as a baseline for savings-rate insights.
        </p>

        <label className="block text-xs font-medium text-ink-softer mb-1.5 mt-4">Payday</label>
        <select
          value={state.settings.salaryDay ?? ''}
          onChange={(e) => updateSettings({ salaryDay: e.target.value ? parseInt(e.target.value, 10) : undefined })}
          className="w-full px-3 py-2.5 border border-paper-line rounded text-sm bg-white focus:border-sage outline-none"
        >
          <option value="">Not set</option>
          {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
            <option key={day} value={day}>
              {day}
            </option>
          ))}
        </select>
        <p className="text-xs text-ink-softer mt-1.5">
          The day each month your basic salary lands. From that day, we'll suggest setting money aside for your
          goals and important dates automatically.
        </p>
      </CollapsibleCard>

      <CollapsibleCard
        title="Other income"
        subtitle="For a second job or freelance work that pays on a different day."
        className="mb-5"
      >
        {state.incomeSources.length > 0 && (
          <div className="flex flex-col gap-2 mb-4">
            {state.incomeSources.map((s) => (
              <div
                key={s.id}
                className="flex items-center gap-2.5 px-3 py-2.5 rounded border border-paper-line text-sm"
              >
                <span className="w-7 h-7 rounded-full bg-paper flex items-center justify-center shrink-0 text-ink-softer">
                  <Briefcase size={13} strokeWidth={1.75} />
                </span>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-ink truncate">{s.name}</p>
                  <p className="text-xs text-ink-softer font-tabular">
                    {formatMoney(s.amount, state.settings.currency)} · day {s.payDay}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => deleteIncomeSource(s.id)}
                  className="text-ink-softer hover:text-clay-dark shrink-0"
                  aria-label={`Remove ${s.name}`}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="border-t border-paper-line pt-4">
          <label className="block text-xs font-medium text-ink-softer mb-1.5">Add income source</label>
          <input
            value={newIncomeName}
            onChange={(e) => setNewIncomeName(e.target.value)}
            placeholder="e.g. Freelance, Second job"
            className="w-full px-3 py-2.5 border border-paper-line rounded text-sm outline-none focus:border-sage mb-2.5"
          />
          <div className="grid grid-cols-2 gap-2.5 mb-3">
            <input
              type="number"
              min="0"
              step="1"
              value={newIncomeAmount}
              onChange={(e) => setNewIncomeAmount(e.target.value)}
              placeholder="Monthly amount"
              className="w-full px-3 py-2.5 border border-paper-line rounded text-sm font-tabular outline-none focus:border-sage"
            />
            <select
              value={newIncomeDay}
              onChange={(e) => setNewIncomeDay(e.target.value)}
              className="w-full px-3 py-2.5 border border-paper-line rounded text-sm bg-white outline-none focus:border-sage"
            >
              <option value="">Payday</option>
              {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
                <option key={day} value={day}>
                  {day}
                </option>
              ))}
            </select>
          </div>
          <button
            type="button"
            onClick={handleAddIncomeSource}
            className="inline-flex items-center gap-1.5 bg-ink text-paper px-3.5 py-2 rounded text-sm font-medium hover:bg-ink-light transition-colors"
          >
            <Plus size={14} />
            Add income source
          </button>
        </div>
      </CollapsibleCard>

      <CollapsibleCard
        title="Categories"
        subtitle="Used across transactions, budgets, and reports."
        className="mb-5"
      >
        {state.categories.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-4">
            {state.categories.map((c) => (
              <div
                key={c.name}
                className="flex items-center gap-2 px-2.5 py-2 rounded border border-paper-line text-sm"
              >
                <CategoryIconGlyph icon={c.icon} size={15} className="text-ink-softer shrink-0" />
                <span className="truncate">{c.name}</span>
              </div>
            ))}
          </div>
        )}

        <div className="border-t border-paper-line pt-4">
          <label className="block text-xs font-medium text-ink-softer mb-1.5">Add new category</label>
          <input
            value={newCatName}
            onChange={(e) => handleNameChange(e.target.value)}
            placeholder="e.g. Coffee, Netflix, Gym..."
            className="w-full px-3 py-2.5 border border-paper-line rounded text-sm outline-none focus:border-sage mb-3"
          />

          <label className="block text-xs font-medium text-ink-softer mb-1.5">
            Icon {!iconTouched && newCatName.trim() && <span className="text-sage-dark">(suggested)</span>}
          </label>
          <div className="grid grid-cols-7 sm:grid-cols-9 gap-1.5 mb-3 max-h-40 overflow-y-auto pr-0.5">
            {CATEGORY_ICON_OPTIONS.map((opt) => (
              <button
                key={opt.key}
                type="button"
                title={opt.label}
                onClick={() => {
                  setNewCatIcon(opt.key)
                  setIconTouched(true)
                }}
                className={`aspect-square flex items-center justify-center rounded border transition-colors ${
                  newCatIcon === opt.key ? 'border-sage bg-sage-light text-sage-dark' : 'border-paper-line text-ink-softer'
                }`}
              >
                <CategoryIconGlyph icon={opt.key} size={15} />
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={handleAddCategory}
            disabled={!newCatName.trim()}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded text-sm font-medium bg-ink text-paper disabled:opacity-40"
          >
            <Plus size={15} />
            Add category
          </button>
        </div>
      </CollapsibleCard>

      <CollapsibleCard
        title="Notifications"
        subtitle="Get reminded as a goal's target date or an important date gets closer."
        className="mb-5"
      >
        {state.goals.length === 0 && state.importantDates.length === 0 ? (
          <p className="text-sm text-ink-softer">
            Create a goal or an important date first to set up reminders for it.
          </p>
        ) : (
          <>
            {state.reminderRules.length > 0 && (
              <div className="flex flex-col gap-2 mb-4">
                {state.reminderRules.map((rule) => {
                  if (rule.targetKind === 'goal') {
                    const goal = state.goals.find((g) => g.id === rule.targetId)
                    if (!goal) return null
                    const ratio = goal.targetAmount > 0 ? goal.savedAmount / goal.targetAmount : 0
                    return (
                      <div key={`goal-${rule.targetId}`} className="border border-paper-line rounded-lg p-3">
                        <div className="flex items-start justify-between gap-2">
                          <button
                            type="button"
                            onClick={() => loadTargetIntoForm('goal', rule.targetId)}
                            className="flex items-center gap-2 text-left min-w-0"
                          >
                            <GoalIconGlyph icon={goal.icon} size={15} className="text-ink-softer shrink-0" />
                            <span className="text-sm font-medium text-ink truncate">{goal.name}</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemoveReminderRule('goal', rule.targetId)}
                            className="text-ink-softer hover:text-clay-dark shrink-0"
                            aria-label={`Remove reminders for ${goal.name}`}
                          >
                            <X size={15} />
                          </button>
                        </div>
                        <div className="mt-2 mb-2">
                          <ProgressBar ratio={ratio} tone={ratio >= 0.9 ? 'gold' : 'sage'} />
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {rule.offsets.map((o, i) => (
                            <span
                              key={i}
                              className="text-xs px-2 py-1 rounded-full bg-paper border border-paper-line text-ink-softer"
                            >
                              {offsetLabel(o)}
                            </span>
                          ))}
                        </div>
                      </div>
                    )
                  }

                  const date = state.importantDates.find((d) => d.id === rule.targetId)
                  if (!date) return null
                  const dateHasTarget = !!date.targetAmount && date.targetAmount > 0
                  const dateRatio = dateHasTarget ? (date.savedAmount ?? 0) / date.targetAmount! : 0
                  return (
                    <div key={`date-${rule.targetId}`} className="border border-paper-line rounded-lg p-3">
                      <div className="flex items-start justify-between gap-2">
                        <button
                          type="button"
                          onClick={() => loadTargetIntoForm('importantDate', rule.targetId)}
                          className="flex items-center gap-2 text-left min-w-0"
                        >
                          <ImportantDateIconGlyph category={date.category} size={15} className="text-ink-softer shrink-0" />
                          <span className="text-sm font-medium text-ink truncate">{date.name}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemoveReminderRule('importantDate', rule.targetId)}
                          className="text-ink-softer hover:text-clay-dark shrink-0"
                          aria-label={`Remove reminders for ${date.name}`}
                        >
                          <X size={15} />
                        </button>
                      </div>
                      {dateHasTarget && (
                        <div className="mt-2 mb-2">
                          <ProgressBar ratio={dateRatio} tone={dateRatio >= 0.9 ? 'gold' : 'sage'} />
                        </div>
                      )}
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {rule.offsets.map((o, i) => (
                          <span
                            key={i}
                            className="text-xs px-2 py-1 rounded-full bg-paper border border-paper-line text-ink-softer"
                          >
                            {offsetLabel(o)}
                          </span>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            <div className="border-t border-paper-line pt-4">
              <label className="block text-xs font-medium text-ink-softer mb-1.5">Remind me about</label>
              <div className="flex gap-1.5 mb-3">
                <button
                  type="button"
                  onClick={() => handleKindChange('goal')}
                  className={`flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded text-sm font-medium border transition-colors ${
                    reminderKind === 'goal' ? 'border-sage bg-sage-light text-sage-dark' : 'border-paper-line text-ink-softer'
                  }`}
                >
                  <Target size={14} />A goal
                </button>
                <button
                  type="button"
                  onClick={() => handleKindChange('importantDate')}
                  className={`flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded text-sm font-medium border transition-colors ${
                    reminderKind === 'importantDate'
                      ? 'border-sage bg-sage-light text-sage-dark'
                      : 'border-paper-line text-ink-softer'
                  }`}
                >
                  <CalendarDays size={14} />
                  An important date
                </button>
              </div>

              {reminderKind === 'goal' ? (
                state.goals.length === 0 ? (
                  <p className="text-sm text-ink-softer mb-1">No goals yet — create one in the Goals tab.</p>
                ) : (
                  <select
                    value={reminderTargetId}
                    onChange={(e) => loadTargetIntoForm('goal', e.target.value)}
                    className="w-full px-3 py-2.5 border border-paper-line rounded text-sm bg-white focus:border-sage outline-none mb-3"
                  >
                    <option value="">Choose a goal...</option>
                    {state.goals.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.name}
                      </option>
                    ))}
                  </select>
                )
              ) : state.importantDates.length === 0 ? (
                <p className="text-sm text-ink-softer mb-1">No important dates yet — add one in the Important Dates tab.</p>
              ) : (
                <select
                  value={reminderTargetId}
                  onChange={(e) => loadTargetIntoForm('importantDate', e.target.value)}
                  className="w-full px-3 py-2.5 border border-paper-line rounded text-sm bg-white focus:border-sage outline-none mb-3"
                >
                  <option value="">Choose a date...</option>
                  {state.importantDates.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              )}

              {reminderTargetId && (
                <>
                  <label className="block text-xs font-medium text-ink-softer mb-1.5">Number of notifications</label>
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {Array.from({ length: MAX_REMINDERS }, (_, i) => i + 1).map((n) => (
                      <button
                        key={n}
                        type="button"
                        onClick={() => setReminderCount(n)}
                        className={`w-8 h-8 rounded flex items-center justify-center text-sm font-medium border transition-colors ${
                          reminderOffsets.length === n
                            ? 'border-sage bg-sage-light text-sage-dark'
                            : 'border-paper-line text-ink-softer'
                        }`}
                      >
                        {n}
                      </button>
                    ))}
                  </div>

                  {reminderOffsets.length > 0 && (
                    <div className="flex flex-col gap-2 mb-4">
                      {reminderOffsets.map((offset, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <span className="text-xs text-ink-softer w-6 shrink-0">#{i + 1}</span>
                          <select
                            value={offset}
                            onChange={(e) => updateReminderSlot(i, e.target.value as ReminderOffsetKey)}
                            className="flex-1 px-2.5 py-2 border border-paper-line rounded text-sm bg-white focus:border-sage outline-none"
                          >
                            {OFFSET_OPTIONS.map((opt) => (
                              <option key={opt.key} value={opt.key}>
                                {opt.label}
                              </option>
                            ))}
                          </select>
                        </div>
                      ))}
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={handleSaveReminderRule}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded text-sm font-medium bg-ink text-paper"
                  >
                    <Bell size={15} />
                    Save reminders
                  </button>
                </>
              )}
            </div>
          </>
        )}
      </CollapsibleCard>

      <CollapsibleCard
        title="Danger zone"
        titleClassName="text-clay-dark"
        subtitle="This clears all transactions, budgets, and goals stored in this browser. This can't be undone."
        className="border-clay/30"
      >
        {!confirmReset ? (
          <button
            onClick={() => setConfirmReset(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded text-sm font-medium border border-clay text-clay-dark hover:bg-clay-light transition-colors"
          >
            <Trash2 size={15} />
            Reset all data
          </button>
        ) : (
          <div className="flex gap-2">
            <button
              onClick={resetData}
              className="px-4 py-2.5 rounded text-sm font-medium bg-clay text-white hover:bg-clay-dark transition-colors"
            >
              Confirm reset
            </button>
            <button
              onClick={() => setConfirmReset(false)}
              className="px-4 py-2.5 rounded text-sm font-medium border border-paper-line text-ink-softer"
            >
              Cancel
            </button>
          </div>
        )}
      </CollapsibleCard>
    </div>
  )
}
