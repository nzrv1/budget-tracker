import { useState } from 'react'
import { Trash2, Check, Plus, X, Bell, Target, CalendarDays, Briefcase } from 'lucide-react'
import {
  AppState,
  CategoryDef,
  CategoryIconKey,
  IncomeSource,
  Language,
  NotificationLevel,
  ReminderOffsetKey,
  ReminderTargetKind,
  ThemeKey,
} from '../types'
import { CollapsibleCard, GoalIconGlyph, ProgressBar, SectionHeading } from './shared'
import { formatMoney, useNumberField } from '../lib/utils'
import { THEMES, themeLabel } from '../lib/themes'
import { CATEGORY_ICON_OPTIONS, CategoryIconGlyph, categoryIconLabel, suggestIconForName, translateCategoryName } from '../lib/categoryIcons'
import { ImportantDateIconGlyph } from '../lib/importantDates'
import { MAX_REMINDERS, defaultOffsetsForCount, offsetOptions, offsetLabel } from '../lib/goalReminders'
import { LANGUAGES, useT } from '../lib/i18n'

const CURRENCY_CODES = ['EUR', 'USD', 'GBP', 'PLN'] as const

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
  const t = useT()
  const [confirmReset, setConfirmReset] = useState(false)

  const monthlyIncomeField = useNumberField(state.settings.monthlyIncome, (n) => updateSettings({ monthlyIncome: n }))

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
      <SectionHeading eyebrow={t.settings.eyebrow} title={t.settings.title} />

      <CollapsibleCard title={t.settings.appearanceTitle} className="mb-5">
        <label className="block text-xs font-medium text-ink-softer mb-2">{t.settings.themeLabel}</label>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
          {THEMES.map((meta) => {
            const active = state.settings.theme === meta.key
            return (
              <button
                key={meta.key}
                type="button"
                onClick={() => setTheme(meta.key)}
                className={`flex flex-col gap-2.5 p-3 rounded-lg border text-left transition-colors ${
                  active ? 'border-sage bg-sage-light' : 'border-paper-line hover:border-ink-softer/40'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="flex -space-x-1">
                    {meta.preview.map((c, i) => (
                      <span key={i} className="w-4 h-4 rounded-full border-2 border-paper-card" style={{ background: c }} />
                    ))}
                  </span>
                  {active && <Check size={14} className="text-sage-dark" />}
                </div>
                <span className="text-sm font-medium text-ink">{themeLabel(t, meta.key)}</span>
              </button>
            )
          })}
        </div>
      </CollapsibleCard>

      <CollapsibleCard title={t.settings.generalTitle} className="mb-5">
        <label className="block text-xs font-medium text-ink-softer mb-1.5">{t.settings.languageLabel}</label>
        <select
          value={state.settings.language || 'en'}
          onChange={(e) => updateSettings({ language: e.target.value as Language })}
          className="w-full px-3 py-2.5 border border-paper-line rounded text-sm bg-white focus:border-sage outline-none mb-1.5"
        >
          {LANGUAGES.map((l) => (
            <option key={l.code} value={l.code}>
              {l.nativeLabel}
            </option>
          ))}
        </select>
        <p className="text-xs text-ink-softer mt-1.5 mb-4">{t.settings.languageHelp}</p>

        <label className="block text-xs font-medium text-ink-softer mb-1.5">{t.settings.currencyLabel}</label>
        <select
          value={state.settings.currency}
          onChange={(e) => updateSettings({ currency: e.target.value })}
          className="w-full px-3 py-2.5 border border-paper-line rounded text-sm bg-white focus:border-sage outline-none mb-4"
        >
          {CURRENCY_CODES.map((code) => (
            <option key={code} value={code}>
              {t.currencies[code]}
            </option>
          ))}
        </select>

        <label className="block text-xs font-medium text-ink-softer mb-1.5">{t.settings.basicSalaryLabel}</label>
        <input
          type="number"
          min="0"
          step="1"
          value={monthlyIncomeField.text}
          onChange={monthlyIncomeField.handleChange}
          onBlur={monthlyIncomeField.handleBlur}
          className="w-full px-3 py-2.5 border border-paper-line rounded text-sm font-tabular focus:border-sage outline-none"
        />
        <p className="text-xs text-ink-softer mt-1.5">{t.settings.basicSalaryHelp}</p>

        <label className="block text-xs font-medium text-ink-softer mb-1.5 mt-4">{t.settings.paydayLabel}</label>
        <select
          value={state.settings.salaryDay ?? ''}
          onChange={(e) => {
            const salaryDay = e.target.value ? parseInt(e.target.value, 10) : undefined
            // Changing the payday date makes any earlier "handled this month" flag stale —
            // clear it so the new date can trigger the payday prompt this month too, instead
            // of silently waiting for next month.
            const handledPaydays = { ...(state.settings.handledPaydays || {}) }
            delete handledPaydays.primary
            updateSettings({ salaryDay, handledPaydays })
          }}
          className="w-full px-3 py-2.5 border border-paper-line rounded text-sm bg-white focus:border-sage outline-none"
        >
          <option value="">{t.common.notSet}</option>
          {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
            <option key={day} value={day}>
              {day}
            </option>
          ))}
        </select>
        <p className="text-xs text-ink-softer mt-1.5">{t.settings.paydayHelp}</p>
      </CollapsibleCard>

      <CollapsibleCard
        title={t.settings.otherIncomeTitle}
        subtitle={t.settings.otherIncomeSubtitle}
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
                    {formatMoney(s.amount, state.settings.currency)} {t.settings.incomeSourceDaySuffix(s.payDay)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => deleteIncomeSource(s.id)}
                  className="text-ink-softer hover:text-clay-dark shrink-0"
                  aria-label={t.settings.incomeSourceRemoveAria(s.name)}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="border-t border-paper-line pt-4">
          <label className="block text-xs font-medium text-ink-softer mb-1.5">{t.settings.addIncomeSourceLabel}</label>
          <input
            value={newIncomeName}
            onChange={(e) => setNewIncomeName(e.target.value)}
            placeholder={t.settings.incomeNamePlaceholder}
            className="w-full px-3 py-2.5 border border-paper-line rounded text-sm outline-none focus:border-sage mb-2.5"
          />
          <div className="grid grid-cols-2 gap-2.5 mb-3">
            <input
              type="number"
              min="0"
              step="1"
              value={newIncomeAmount}
              onChange={(e) => setNewIncomeAmount(e.target.value)}
              placeholder={t.settings.incomeAmountPlaceholder}
              className="w-full px-3 py-2.5 border border-paper-line rounded text-sm font-tabular outline-none focus:border-sage"
            />
            <select
              value={newIncomeDay}
              onChange={(e) => setNewIncomeDay(e.target.value)}
              className="w-full px-3 py-2.5 border border-paper-line rounded text-sm bg-white outline-none focus:border-sage"
            >
              <option value="">{t.settings.incomePaydayPlaceholder}</option>
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
            {t.settings.addIncomeSourceButton}
          </button>
        </div>
      </CollapsibleCard>

      <CollapsibleCard
        title={t.settings.categoriesTitle}
        subtitle={t.settings.categoriesSubtitle}
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
                <span className="truncate">{translateCategoryName(t, c.name)}</span>
              </div>
            ))}
          </div>
        )}

        <div className="border-t border-paper-line pt-4">
          <label className="block text-xs font-medium text-ink-softer mb-1.5">{t.settings.addCategoryLabel}</label>
          <input
            value={newCatName}
            onChange={(e) => handleNameChange(e.target.value)}
            placeholder={t.settings.categoryNamePlaceholder}
            className="w-full px-3 py-2.5 border border-paper-line rounded text-sm outline-none focus:border-sage mb-3"
          />

          <label className="block text-xs font-medium text-ink-softer mb-1.5">
            {t.settings.iconLabel} {!iconTouched && newCatName.trim() && <span className="text-sage-dark">{t.settings.iconSuggested}</span>}
          </label>
          <div className="grid grid-cols-7 sm:grid-cols-9 gap-1.5 mb-3 max-h-40 overflow-y-auto pr-0.5">
            {CATEGORY_ICON_OPTIONS.map((opt) => (
              <button
                key={opt.key}
                type="button"
                title={categoryIconLabel(t, opt.key)}
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
            {t.settings.addCategoryButton}
          </button>
        </div>
      </CollapsibleCard>

      <CollapsibleCard
        title={t.settings.notificationsTitle}
        subtitle={t.settings.notificationsSubtitle}
        className="mb-5"
      >
        <div className="mb-4 pb-4 border-b border-paper-line">
          <label className="block text-xs font-medium text-ink-softer mb-1.5">{t.settings.pushLevelLabel}</label>
          <div className="flex gap-1.5">
            {(['all', 'important_only', 'off'] as NotificationLevel[]).map((lvl) => {
              const active = (state.settings.notificationLevel ?? 'all') === lvl
              const label =
                lvl === 'all'
                  ? t.settings.pushLevelAll
                  : lvl === 'important_only'
                  ? t.settings.pushLevelImportant
                  : t.settings.pushLevelOff
              return (
                <button
                  key={lvl}
                  type="button"
                  onClick={() => updateSettings({ notificationLevel: lvl })}
                  className={`flex-1 px-2 py-2 rounded text-sm font-medium border transition-colors ${
                    active ? 'border-sage bg-sage-light text-sage-dark' : 'border-paper-line text-ink-softer'
                  }`}
                >
                  {label}
                </button>
              )
            })}
          </div>
          <p className="text-xs text-ink-softer mt-1.5">{t.settings.pushLevelHelp}</p>
        </div>

        {state.goals.length === 0 && state.importantDates.length === 0 ? (
          <p className="text-sm text-ink-softer">{t.settings.notificationsEmptyHint}</p>
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
                            aria-label={t.settings.removeReminderAria(goal.name)}
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
                              {offsetLabel(t, o)}
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
                          aria-label={t.settings.removeReminderAria(date.name)}
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
                            {offsetLabel(t, o)}
                          </span>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            <div className="border-t border-paper-line pt-4">
              <label className="block text-xs font-medium text-ink-softer mb-1.5">{t.settings.remindMeAboutLabel}</label>
              <div className="flex gap-1.5 mb-3">
                <button
                  type="button"
                  onClick={() => handleKindChange('goal')}
                  className={`flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded text-sm font-medium border transition-colors ${
                    reminderKind === 'goal' ? 'border-sage bg-sage-light text-sage-dark' : 'border-paper-line text-ink-softer'
                  }`}
                >
                  <Target size={14} />
                  {t.settings.remindGoalOption}
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
                  {t.settings.remindDateOption}
                </button>
              </div>

              {reminderKind === 'goal' ? (
                state.goals.length === 0 ? (
                  <p className="text-sm text-ink-softer mb-1">{t.settings.noGoalsHint}</p>
                ) : (
                  <select
                    value={reminderTargetId}
                    onChange={(e) => loadTargetIntoForm('goal', e.target.value)}
                    className="w-full px-3 py-2.5 border border-paper-line rounded text-sm bg-white focus:border-sage outline-none mb-3"
                  >
                    <option value="">{t.settings.chooseGoalOption}</option>
                    {state.goals.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.name}
                      </option>
                    ))}
                  </select>
                )
              ) : state.importantDates.length === 0 ? (
                <p className="text-sm text-ink-softer mb-1">{t.settings.noDatesHint}</p>
              ) : (
                <select
                  value={reminderTargetId}
                  onChange={(e) => loadTargetIntoForm('importantDate', e.target.value)}
                  className="w-full px-3 py-2.5 border border-paper-line rounded text-sm bg-white focus:border-sage outline-none mb-3"
                >
                  <option value="">{t.settings.chooseDateOption}</option>
                  {state.importantDates.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              )}

              {reminderTargetId && (
                <>
                  <label className="block text-xs font-medium text-ink-softer mb-1.5">{t.settings.numberOfNotificationsLabel}</label>
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
                            {offsetOptions(t).map((opt) => (
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
                    {t.settings.saveRemindersButton}
                  </button>
                </>
              )}
            </div>
          </>
        )}
      </CollapsibleCard>

      <CollapsibleCard
        title={t.settings.dangerZoneTitle}
        titleClassName="text-clay-dark"
        subtitle={t.settings.dangerZoneSubtitle}
        className="border-clay/30"
      >
        {!confirmReset ? (
          <button
            onClick={() => setConfirmReset(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded text-sm font-medium border border-clay text-clay-dark hover:bg-clay-light transition-colors"
          >
            <Trash2 size={15} />
            {t.settings.resetAllDataButton}
          </button>
        ) : (
          <div className="flex gap-2">
            <button
              onClick={resetData}
              className="px-4 py-2.5 rounded text-sm font-medium bg-clay text-white hover:bg-clay-dark transition-colors"
            >
              {t.common.confirmReset}
            </button>
            <button
              onClick={() => setConfirmReset(false)}
              className="px-4 py-2.5 rounded text-sm font-medium border border-paper-line text-ink-softer"
            >
              {t.settings.cancelReset}
            </button>
          </div>
        )}
      </CollapsibleCard>
    </div>
  )
}
