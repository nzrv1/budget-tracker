import { useEffect, useState } from 'react'
import { Check, ChevronLeft, Plus, PartyPopper, CheckCircle2 } from 'lucide-react'
import { CategoryBudget, CategoryDef, Goal, ImportantDate } from '../types'
import { CategoryIconGlyph, suggestIconForName, translateCategoryName } from '../lib/categoryIcons'
import { MONTHLY_PRESETS, RARE_PRESETS, OnboardingPreset } from '../lib/onboardingPresets'
import { useT } from '../lib/i18n'

/**
 * First-run setup wizard — instead of dropping a new person into an empty app, it asks four
 * short blocks of questions and creates their budgets / important dates / goals from the
 * answers.
 *
 * It creates real records through the App.tsx handlers (addBudget / addCategory /
 * addImportantDate / addGoal — the same ones the normal forms use; never a mutation path of
 * its own). The local `created` state is kept only to drive the running lists and the closing
 * summary. App.tsx shows it automatically on an empty first run and on demand from Settings →
 * "Run the setup wizard again" (see the `showWizard` / `onboardingDone` handling there); since
 * it only ever adds records, re-running it over a set-up app is safe — a preset whose budget
 * already exists shows as already-picked and does nothing.
 */

type StepId = 'monthly' | 'rare' | 'birthdays' | 'goals' | 'done'
const STEP_ORDER: StepId[] = ['monthly', 'rare', 'birthdays', 'goals', 'done']

// Goal cards need an icon; the wizard doesn't ask for one, so everything it creates gets the
// neutral fallback — the person can pick a real icon later when editing the goal.
const DEFAULT_GOAL_ICON: Goal['icon'] = 'other'

interface Created {
  budgets: { category: string; period: 'month' | 'year' }[]
  dates: { name: string }[]
  goals: { name: string }[]
}

export default function OnboardingWizard({
  categories,
  budgets,
  addBudget,
  addCategory,
  addImportantDate,
  addGoal,
  onComplete,
}: {
  categories: CategoryDef[]
  budgets: CategoryBudget[]
  addBudget: (b: Omit<CategoryBudget, 'createdAt'>) => void
  addCategory: (def: CategoryDef) => void
  addImportantDate: (d: Omit<ImportantDate, 'id' | 'createdAt'>) => void
  addGoal: (g: Omit<Goal, 'id' | 'createdAt'>) => void
  onComplete: () => void
}) {
  const t = useT()
  const [stepIndex, setStepIndex] = useState(0)
  const step = STEP_ORDER[stepIndex]
  const [created, setCreated] = useState<Created>({ budgets: [], dates: [], goals: [] })
  const [toast, setToast] = useState<string | null>(null)

  useEffect(() => {
    if (!toast) return
    const timer = setTimeout(() => setToast(null), 2500)
    return () => clearTimeout(timer)
  }, [toast])

  function goNext() {
    setStepIndex((i) => Math.min(i + 1, STEP_ORDER.length - 1))
  }
  function goBack() {
    setStepIndex((i) => Math.max(i - 1, 0))
  }

  /** Whether a budget for this category+period already exists (either created just now in this
   *  session, or from before — the wizard can be re-run over a set-up app from Settings). */
  function budgetExists(category: string, period: 'month' | 'year') {
    const lc = category.toLowerCase()
    return (
      budgets.some((b) => b.category.toLowerCase() === lc && b.period === period) ||
      created.budgets.some((b) => b.category.toLowerCase() === lc && b.period === period)
    )
  }

  /** Create a budget for a category, making sure the category itself exists first (same
   *  order the normal "add budget" form follows: pick/create category, then the budget).
   *  A no-op — with no misleading toast — if that budget is already there. */
  function createBudget(category: string, icon: CategoryDef['icon'], limit: number, period: 'month' | 'year') {
    const existingCat = categories.find((c) => c.name.toLowerCase() === category.toLowerCase())
    const name = existingCat ? existingCat.name : category
    if (budgetExists(name, period)) return
    if (!existingCat) addCategory({ name, icon })
    addBudget({ category: name, limit, period })
    setCreated((c) => ({ ...c, budgets: [...c.budgets, { category: name, period }] }))
    setToast(t.onboarding.budgetAdded(translateCategoryName(t, name)))
  }

  function pickPreset(p: OnboardingPreset) {
    createBudget(p.category, p.icon, p.defaultLimit, p.period)
  }

  /** "Something else" — the same resolution CategorySelect.confirmCreate() uses: a name that
   *  only differs by case from an existing category resolves to that one; otherwise a new
   *  category is created with an auto-suggested icon. */
  function addCustomBudget(rawName: string, period: 'month' | 'year') {
    const name = rawName.trim()
    if (!name) return
    createBudget(name, suggestIconForName(name) ?? 'other', 0, period)
  }

  function addBirthday(name: string, date: string, giftBudget: number) {
    addImportantDate({
      name,
      date,
      category: 'birthday',
      recurring: true,
      targetAmount: giftBudget > 0 ? giftBudget : undefined,
      savedAmount: giftBudget > 0 ? 0 : undefined,
    })
    setCreated((c) => ({ ...c, dates: [...c.dates, { name }] }))
    setToast(t.onboarding.dateAdded(name))
  }

  function addGoalEntry(name: string, targetAmount: number, targetDate: string) {
    addGoal({ name, targetAmount, savedAmount: 0, targetDate, icon: DEFAULT_GOAL_ICON })
    setCreated((c) => ({ ...c, goals: [...c.goals, { name }] }))
    setToast(t.onboarding.goalAdded(name))
  }

  return (
    <div className="min-h-screen bg-paper text-ink font-body flex flex-col">
      <header className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-paper-line">
        <div className="flex items-center gap-2">
          {stepIndex > 0 && step !== 'done' && (
            <button onClick={goBack} className="p-2 -ml-2 text-ink-softer hover:text-ink" aria-label={t.onboarding.back}>
              <ChevronLeft size={18} />
            </button>
          )}
          <StepDots total={STEP_ORDER.length - 1} current={stepIndex} />
        </div>
        {step !== 'done' && (
          <button onClick={onComplete} className="text-sm text-ink-softer hover:text-ink px-2 py-2 -mr-2">
            {t.onboarding.skip}
          </button>
        )}
      </header>

      <main className="flex-1 w-full max-w-lg mx-auto px-4 sm:px-6 py-8 flex flex-col gap-6">
        {step === 'monthly' && (
          <PresetStep
            bubble={t.onboarding.monthlyBubble}
            hint={t.onboarding.monthlyHint}
            presets={MONTHLY_PRESETS}
            isAdded={(p) => budgetExists(p.category, p.period)}
            onPick={pickPreset}
            onCustom={(name) => addCustomBudget(name, 'month')}
            onNext={goNext}
          />
        )}

        {step === 'rare' && (
          <PresetStep
            bubble={t.onboarding.rareBubble}
            hint={t.onboarding.rareHint}
            presets={RARE_PRESETS}
            isAdded={(p) => budgetExists(p.category, p.period)}
            onPick={pickPreset}
            onCustom={(name) => addCustomBudget(name, 'year')}
            onNext={goNext}
          />
        )}

        {step === 'birthdays' && (
          <RepeatEntryStep
            bubble={t.onboarding.birthdaysBubble}
            added={created.dates.map((d) => d.name)}
            fields={[
              { key: 'name', label: t.onboarding.birthdayNameLabel, type: 'text', placeholder: t.onboarding.birthdayNamePlaceholder },
              { key: 'date', label: t.onboarding.birthdayDateLabel, type: 'date' },
              { key: 'amount', label: t.onboarding.birthdayGiftLabel, type: 'number', placeholder: '50' },
            ]}
            onAdd={(v) => addBirthday(v.name.trim(), v.date, Number(v.amount) || 0)}
            onNext={goNext}
            nextLabel={t.onboarding.next}
          />
        )}

        {step === 'goals' && (
          <RepeatEntryStep
            bubble={t.onboarding.goalsBubble}
            added={created.goals.map((g) => g.name)}
            fields={[
              { key: 'name', label: t.onboarding.goalNameLabel, type: 'text', placeholder: t.onboarding.goalNamePlaceholder },
              { key: 'amount', label: t.onboarding.goalAmountLabel, type: 'number', placeholder: '1200' },
              { key: 'date', label: t.onboarding.goalDeadlineLabel, type: 'date' },
            ]}
            onAdd={(v) => addGoalEntry(v.name.trim(), Number(v.amount) || 0, v.date)}
            onNext={goNext}
            nextLabel={t.onboarding.finish}
          />
        )}

        {step === 'done' && (
          <DoneStep
            counts={{ budgets: created.budgets.length, dates: created.dates.length, goals: created.goals.length }}
            onComplete={onComplete}
          />
        )}
      </main>

      {toast && (
        <div className="fixed bottom-6 left-4 right-4 sm:left-auto sm:right-6 sm:w-80 z-40">
          <div className="bg-white border-l-4 border-sage rounded shadow-lg shadow-ink/5 px-4 py-3 flex items-center gap-2.5 animate-[slideIn_0.2s_ease-out]">
            <CheckCircle2 size={17} className="text-sage-dark shrink-0" strokeWidth={1.75} />
            <p className="text-sm font-medium text-ink">{toast}</p>
          </div>
          <style>{`@keyframes slideIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}`}</style>
        </div>
      )}
    </div>
  )
}

function StepDots({ total, current }: { total: number; current: number }) {
  return (
    <div className="flex items-center gap-1.5">
      {Array.from({ length: total }).map((_, i) => (
        <span
          key={i}
          className={`h-1.5 rounded-full transition-all ${
            i === current ? 'w-5 bg-ink' : i < current ? 'w-1.5 bg-ink-softer' : 'w-1.5 bg-paper-line'
          }`}
        />
      ))}
    </div>
  )
}

function Bubble({ text, hint }: { text: string; hint?: string }) {
  return (
    <div>
      <div className="inline-block bg-paper-card border border-paper-line rounded-lg rounded-tl-sm px-4 py-3">
        <p className="font-display font-semibold text-lg leading-snug">{text}</p>
      </div>
      {hint && <p className="text-sm text-ink-softer mt-2 px-1">{hint}</p>}
    </div>
  )
}

function PrimaryButton({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full min-h-[44px] py-3 bg-ink text-paper rounded font-medium text-sm hover:bg-ink-light transition-colors"
    >
      {children}
    </button>
  )
}

function PresetStep({
  bubble,
  hint,
  presets,
  isAdded,
  onPick,
  onCustom,
  onNext,
}: {
  bubble: string
  hint: string
  presets: OnboardingPreset[]
  isAdded: (p: OnboardingPreset) => boolean
  onPick: (p: OnboardingPreset) => void
  onCustom: (name: string) => void
  onNext: () => void
}) {
  const t = useT()
  const [customOpen, setCustomOpen] = useState(false)
  const [customName, setCustomName] = useState('')

  function submitCustom(e: React.FormEvent) {
    e.preventDefault()
    const name = customName.trim()
    if (!name) return
    onCustom(name)
    setCustomName('')
    setCustomOpen(false)
  }

  return (
    <>
      <Bubble text={bubble} hint={hint} />

      <div className="grid grid-cols-2 gap-2.5">
        {presets.map((p) => {
          const added = isAdded(p)
          return (
            <button
              key={p.category}
              type="button"
              onClick={() => !added && onPick(p)}
              disabled={added}
              className={`flex items-center gap-2 px-3 py-3 rounded border text-sm text-left transition-colors ${
                added ? 'border-sage bg-sage-light text-sage-dark' : 'border-paper-line text-ink hover:border-ink-softer/40'
              }`}
            >
              {added ? (
                <Check size={16} className="shrink-0" />
              ) : (
                <CategoryIconGlyph icon={p.icon} size={16} className="text-ink-softer shrink-0" />
              )}
              <span className="min-w-0 truncate">{translateCategoryName(t, p.category)}</span>
            </button>
          )
        })}

        <button
          type="button"
          onClick={() => setCustomOpen((o) => !o)}
          className="flex items-center gap-2 px-3 py-3 rounded border border-dashed border-paper-line text-sm text-ink-softer hover:text-ink hover:border-ink-softer/40 transition-colors"
        >
          <Plus size={16} className="shrink-0" />
          {t.onboarding.customOption}
        </button>
      </div>

      {customOpen && (
        <form onSubmit={submitCustom} className="flex gap-2">
          <input
            type="text"
            autoFocus
            value={customName}
            onChange={(e) => setCustomName(e.target.value)}
            placeholder={t.onboarding.customPlaceholder}
            className="flex-1 min-w-0 px-3 py-2.5 border border-paper-line rounded text-sm focus:border-sage outline-none"
          />
          <button
            type="submit"
            className="px-4 py-2.5 bg-ink text-paper rounded text-sm font-medium hover:bg-ink-light transition-colors shrink-0"
          >
            {t.onboarding.customAdd}
          </button>
        </form>
      )}

      <div className="mt-2">
        <PrimaryButton onClick={onNext}>{t.onboarding.next}</PrimaryButton>
      </div>
    </>
  )
}

interface EntryField {
  key: 'name' | 'date' | 'amount'
  label: string
  type: 'text' | 'date' | 'number'
  placeholder?: string
}

function RepeatEntryStep({
  bubble,
  added,
  fields,
  onAdd,
  onNext,
  nextLabel,
}: {
  bubble: string
  added: string[]
  fields: EntryField[]
  onAdd: (values: Record<string, string>) => void
  onNext: () => void
  nextLabel: string
}) {
  const t = useT()
  const empty = () => Object.fromEntries(fields.map((f) => [f.key, ''])) as Record<string, string>
  const [values, setValues] = useState<Record<string, string>>(empty())
  const [error, setError] = useState('')

  function submit(e: React.FormEvent) {
    e.preventDefault()
    for (const f of fields) {
      if (!values[f.key]?.trim()) {
        setError(t.onboarding.fillAllFields)
        return
      }
    }
    setError('')
    onAdd(values)
    setValues(empty())
  }

  return (
    <>
      <Bubble text={bubble} />

      {added.length > 0 && (
        <ul className="flex flex-col gap-1.5">
          {added.map((name, i) => (
            <li key={i} className="flex items-center gap-2 text-sm text-ink">
              <Check size={15} className="text-sage-dark shrink-0" />
              {name}
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={submit} className="flex flex-col gap-3 bg-paper-card border border-paper-line rounded-lg p-4">
        {fields.map((f) => (
          <div key={f.key}>
            <label className="block text-xs font-medium text-ink-softer mb-1.5">{f.label}</label>
            <input
              type={f.type}
              inputMode={f.type === 'number' ? 'decimal' : undefined}
              value={values[f.key]}
              onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))}
              placeholder={f.placeholder}
              className="w-full px-3 py-2.5 border border-paper-line rounded text-sm focus:border-sage outline-none"
            />
          </div>
        ))}
        {error && <p className="text-sm text-clay-dark">{error}</p>}
        <button
          type="submit"
          className="inline-flex items-center justify-center gap-1.5 min-h-[44px] py-2.5 border border-ink text-ink rounded font-medium text-sm hover:bg-paper transition-colors"
        >
          <Plus size={15} />
          {added.length > 0 ? t.onboarding.addAnother : t.onboarding.addFirst}
        </button>
      </form>

      <div className="mt-2">
        <PrimaryButton onClick={onNext}>{nextLabel}</PrimaryButton>
      </div>
    </>
  )
}

function DoneStep({
  counts,
  onComplete,
}: {
  counts: { budgets: number; dates: number; goals: number }
  onComplete: () => void
}) {
  const t = useT()
  const lines = [
    counts.budgets > 0 && t.onboarding.summaryBudgets(counts.budgets),
    counts.dates > 0 && t.onboarding.summaryDates(counts.dates),
    counts.goals > 0 && t.onboarding.summaryGoals(counts.goals),
  ].filter(Boolean) as string[]

  return (
    <div className="flex flex-col items-center text-center gap-4 py-8">
      <span className="w-14 h-14 rounded-full bg-gold-light text-gold-dark flex items-center justify-center">
        <PartyPopper size={26} strokeWidth={1.75} />
      </span>
      <h2 className="font-display font-semibold text-xl">{t.onboarding.doneTitle}</h2>
      {lines.length > 0 ? (
        <ul className="flex flex-col gap-1 text-sm text-ink-softer">
          {lines.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-ink-softer max-w-xs">{t.onboarding.doneEmpty}</p>
      )}
      <div className="w-full mt-2">
        <PrimaryButton onClick={onComplete}>{t.onboarding.enterApp}</PrimaryButton>
      </div>
    </div>
  )
}
