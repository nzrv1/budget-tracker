import { useState } from 'react'
import { Trash2, Check } from 'lucide-react'
import { AppState, ThemeKey } from '../types'
import { Card, SectionHeading } from './shared'
import { THEMES } from '../lib/themes'

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
}: {
  state: AppState
  updateSettings: (patch: Partial<AppState['settings']>) => void
  resetData: () => void
  setTheme: (t: ThemeKey) => void
}) {
  const [confirmReset, setConfirmReset] = useState(false)

  return (
    <div className="max-w-lg">
      <SectionHeading eyebrow="Your preferences" title="Settings" />

      <Card className="p-5 mb-5">
        <h3 className="font-display font-semibold text-base mb-4">Appearance</h3>
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
      </Card>

      <Card className="p-5 mb-5">
        <h3 className="font-display font-semibold text-base mb-4">General</h3>

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

        <label className="block text-xs font-medium text-ink-softer mb-1.5">Monthly income</label>
        <input
          type="number"
          min="0"
          step="1"
          value={state.settings.monthlyIncome}
          onChange={(e) => updateSettings({ monthlyIncome: parseFloat(e.target.value) || 0 })}
          className="w-full px-3 py-2.5 border border-paper-line rounded text-sm font-tabular focus:border-sage outline-none"
        />
        <p className="text-xs text-ink-softer mt-1.5">Used as a baseline for savings-rate insights.</p>
      </Card>

      <Card className="p-5 border-clay/30">
        <h3 className="font-display font-semibold text-base mb-1 text-clay-dark">Danger zone</h3>
        <p className="text-sm text-ink-softer mb-4">
          This clears all transactions, budgets, and goals stored in this browser. This can't be undone.
        </p>
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
      </Card>
    </div>
  )
}
