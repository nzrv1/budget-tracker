import { useEffect, useState } from 'react'
import { Check, ChevronLeft, Plus, PartyPopper, CheckCircle2 } from 'lucide-react'
import { CategoryIconGlyph } from '../lib/categoryIcons'
import { MONTHLY_PRESETS, RARE_PRESETS, OnboardingPreset } from '../lib/onboardingPresets'

/**
 * First-run setup wizard — instead of dropping a new person into an empty app, it asks four
 * short blocks of questions and creates their budgets / important dates / goals from the
 * answers.
 *
 * STAGE 16.1 (this version): mock skeleton only. Navigation between the five steps, the
 * "skip", "add another" (no limit) and "back" controls, and the running summary all work, but
 * nothing is written to AppState yet — added items live in local state and drive the summary.
 * Wiring the real create handlers (setBudgets / addImportantDate / addGoal from App.tsx, the
 * same ones the existing forms call — never a new mutation path) is stage 16.2, and the
 * first-run detection + "run again" button in Settings is stage 16.3.
 *
 * Copy is inline Russian for now so the flow can be reviewed with real wording; it moves into
 * the i18n dictionaries (en/ru/lv) in stage 16.2.
 */

type StepId = 'monthly' | 'rare' | 'birthdays' | 'goals' | 'done'
const STEP_ORDER: StepId[] = ['monthly', 'rare', 'birthdays', 'goals', 'done']

interface DraftBudget {
  category: string
  limit: number
  period: 'month' | 'year'
}
interface DraftDate {
  name: string
  date: string
  amount: number
}
interface DraftGoal {
  name: string
  amount: number
  date: string
}

interface Created {
  budgets: DraftBudget[]
  dates: DraftDate[]
  goals: DraftGoal[]
}

export default function OnboardingWizard({ onComplete }: { onComplete: () => void }) {
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

  // --- mock "create" helpers (stage 16.1 — local state only) ---
  function addBudget(b: DraftBudget) {
    setCreated((c) => ({ ...c, budgets: [...c.budgets, b] }))
    setToast(`✅ Бюджет «${b.category}» добавлен`)
  }
  function addDate(d: DraftDate) {
    setCreated((c) => ({ ...c, dates: [...c.dates, d] }))
    setToast(`✅ Дата «${d.name}» добавлена`)
  }
  function addGoal(g: DraftGoal) {
    setCreated((c) => ({ ...c, goals: [...c.goals, g] }))
    setToast(`✅ Цель «${g.name}» добавлена`)
  }

  return (
    <div className="min-h-screen bg-paper text-ink font-body flex flex-col">
      <header className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-paper-line">
        <div className="flex items-center gap-2">
          {stepIndex > 0 && step !== 'done' && (
            <button
              onClick={goBack}
              className="p-2 -ml-2 text-ink-softer hover:text-ink"
              aria-label="Назад"
            >
              <ChevronLeft size={18} />
            </button>
          )}
          <StepDots total={STEP_ORDER.length - 1} current={stepIndex} />
        </div>
        {step !== 'done' && (
          <button onClick={onComplete} className="text-sm text-ink-softer hover:text-ink px-2 py-2 -mr-2">
            Пропустить
          </button>
        )}
      </header>

      <main className="flex-1 w-full max-w-lg mx-auto px-4 sm:px-6 py-8 flex flex-col gap-6">
        {step === 'monthly' && (
          <PresetStep
            bubble="Какие траты повторяются каждый месяц?"
            hint="Выбери подходящее — я заведу на это месячный бюджет. Сумму потом подправишь."
            presets={MONTHLY_PRESETS}
            addedCategories={created.budgets.map((b) => b.category)}
            onPick={(p) => addBudget({ category: p.category, limit: p.defaultLimit, period: p.period })}
            onCustom={(name) => addBudget({ category: name, limit: 0, period: 'month' })}
            onNext={goNext}
          />
        )}

        {step === 'rare' && (
          <PresetStep
            bubble="А что бывает реже, но регулярно?"
            hint="Это станет годовым бюджетом — удобно откладывать заранее."
            presets={RARE_PRESETS}
            addedCategories={created.budgets.map((b) => b.category)}
            onPick={(p) => addBudget({ category: p.category, limit: p.defaultLimit, period: p.period })}
            onCustom={(name) => addBudget({ category: name, limit: 0, period: 'year' })}
            onNext={goNext}
          />
        )}

        {step === 'birthdays' && (
          <RepeatEntryStep
            bubble="Дни рождения, которые важно не забыть?"
            added={created.dates.map((d) => d.name)}
            fields={[
              { key: 'name', label: 'Чей день рождения', type: 'text', placeholder: 'Мама' },
              { key: 'date', label: 'Дата', type: 'date' },
              { key: 'amount', label: 'Бюджет на подарок', type: 'number', placeholder: '50' },
            ]}
            onAdd={(v) => addDate({ name: v.name, date: v.date, amount: Number(v.amount) || 0 })}
            onNext={goNext}
            nextLabel="Дальше →"
          />
        )}

        {step === 'goals' && (
          <RepeatEntryStep
            bubble="Крупные покупки или цели в этом году?"
            added={created.goals.map((g) => g.name)}
            fields={[
              { key: 'name', label: 'Название', type: 'text', placeholder: 'Новый ноутбук' },
              { key: 'amount', label: 'Сколько нужно', type: 'number', placeholder: '1200' },
              { key: 'date', label: 'К какому сроку', type: 'date' },
            ]}
            onAdd={(v) => addGoal({ name: v.name, amount: Number(v.amount) || 0, date: v.date })}
            onNext={goNext}
            nextLabel="Готово"
          />
        )}

        {step === 'done' && (
          <DoneStep
            counts={{
              budgets: created.budgets.length,
              dates: created.dates.length,
              goals: created.goals.length,
            }}
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
  addedCategories,
  onPick,
  onCustom,
  onNext,
}: {
  bubble: string
  hint: string
  presets: OnboardingPreset[]
  addedCategories: string[]
  onPick: (p: OnboardingPreset) => void
  onCustom: (name: string) => void
  onNext: () => void
}) {
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
          const added = addedCategories.includes(p.category)
          return (
            <button
              key={p.category}
              type="button"
              onClick={() => !added && onPick(p)}
              disabled={added}
              className={`flex items-center gap-2 px-3 py-3 rounded border text-sm text-left transition-colors ${
                added
                  ? 'border-sage bg-sage-light text-sage-dark'
                  : 'border-paper-line text-ink hover:border-ink-softer/40'
              }`}
            >
              {added ? (
                <Check size={16} className="shrink-0" />
              ) : (
                <CategoryIconGlyph icon={p.icon} size={16} className="text-ink-softer shrink-0" />
              )}
              <span className="min-w-0 truncate">{p.category}</span>
            </button>
          )
        })}

        <button
          type="button"
          onClick={() => setCustomOpen((o) => !o)}
          className="flex items-center gap-2 px-3 py-3 rounded border border-dashed border-paper-line text-sm text-ink-softer hover:text-ink hover:border-ink-softer/40 transition-colors"
        >
          <Plus size={16} className="shrink-0" />
          Своё
        </button>
      </div>

      {customOpen && (
        <form onSubmit={submitCustom} className="flex gap-2">
          <input
            type="text"
            autoFocus
            value={customName}
            onChange={(e) => setCustomName(e.target.value)}
            placeholder="Название траты"
            className="flex-1 min-w-0 px-3 py-2.5 border border-paper-line rounded text-sm focus:border-sage outline-none"
          />
          <button
            type="submit"
            className="px-4 py-2.5 bg-ink text-paper rounded text-sm font-medium hover:bg-ink-light transition-colors shrink-0"
          >
            Добавить
          </button>
        </form>
      )}

      <div className="mt-2">
        <PrimaryButton onClick={onNext}>Дальше →</PrimaryButton>
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
  const empty = () => Object.fromEntries(fields.map((f) => [f.key, ''])) as Record<string, string>
  const [values, setValues] = useState<Record<string, string>>(empty())
  const [error, setError] = useState('')

  function submit(e: React.FormEvent) {
    e.preventDefault()
    for (const f of fields) {
      if (!values[f.key]?.trim()) {
        setError('Заполни все поля')
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
          {added.length > 0 ? 'Ещё один' : 'Добавить'}
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
  const parts = [
    counts.budgets > 0 && `${counts.budgets} ${plural(counts.budgets, 'бюджет', 'бюджета', 'бюджетов')}`,
    counts.dates > 0 && `${counts.dates} ${plural(counts.dates, 'дату', 'даты', 'дат')}`,
    counts.goals > 0 && `${counts.goals} ${plural(counts.goals, 'цель', 'цели', 'целей')}`,
  ].filter(Boolean)

  return (
    <div className="flex flex-col items-center text-center gap-4 py-8">
      <span className="w-14 h-14 rounded-full bg-gold-light text-gold-dark flex items-center justify-center">
        <PartyPopper size={26} strokeWidth={1.75} />
      </span>
      <h2 className="font-display font-semibold text-xl">Готово!</h2>
      <p className="text-sm text-ink-softer max-w-xs">
        {parts.length > 0 ? `Ты настроил: ${parts.join(', ')}.` : 'Можно начинать — настроить всё это можно и позже.'}
      </p>
      <div className="w-full mt-2">
        <PrimaryButton onClick={onComplete}>Перейти в приложение</PrimaryButton>
      </div>
    </div>
  )
}

/** Russian numeric plural: 1 бюджет / 2 бюджета / 5 бюджетов. */
function plural(n: number, one: string, few: string, many: string): string {
  const mod10 = n % 10
  const mod100 = n % 100
  if (mod10 === 1 && mod100 !== 11) return one
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return few
  return many
}
