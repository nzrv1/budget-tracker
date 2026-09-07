import { createContext, useContext, useMemo } from 'react'
import { Language } from '../../types'
import en, { Dictionary } from './en'
import ru from './ru'
import lv from './lv'

export type { Dictionary } from './en'
export type { Language }

/** Every supported language, in the order shown in the Settings selector. `nativeLabel` is
 * always rendered in that language's own script regardless of the currently active language
 * (per the spec: the selector itself always reads "English / Русский / Latviešu"). */
export const LANGUAGES: { code: Language; nativeLabel: string }[] = [
  { code: 'en', nativeLabel: 'English' },
  { code: 'ru', nativeLabel: 'Русский' },
  { code: 'lv', nativeLabel: 'Latviešu' },
]

export const DEFAULT_LANGUAGE: Language = 'en'

const DICTIONARIES: Record<Language, Dictionary> = { en, ru, lv }

/** BCP-47 locale used for Intl/toLocaleDateString calls (month names, weekday formatting, ...)
 * so dates read in the same language as the rest of the UI instead of always following the
 * browser's own locale. */
export function localeForLanguage(lang: Language): string {
  if (lang === 'ru') return 'ru-RU'
  if (lang === 'lv') return 'lv-LV'
  return 'en-US'
}

/**
 * Recursively fills in any `undefined` leaf with the matching English value. In normal
 * operation this never has anything to do — ru.ts/lv.ts are typed as `Dictionary = typeof en`,
 * so the compiler already refuses to ship a translation with a missing key. It's here as a
 * last-resort runtime safety net (e.g. a future language added without full compiler coverage,
 * or a dictionary loaded from JSON at runtime) so a missing string degrades to English instead
 * of crashing or rendering "undefined".
 */
function withEnglishFallback<T>(dict: T, fallback: T): T {
  if (dict === fallback) return dict
  const out: any = Array.isArray(dict) ? [...(dict as any)] : { ...(dict as any) }
  for (const key of Object.keys(fallback as any)) {
    const value = (dict as any)[key]
    const fallbackValue = (fallback as any)[key]
    if (value === undefined) {
      out[key] = fallbackValue
    } else if (
      fallbackValue &&
      typeof fallbackValue === 'object' &&
      !Array.isArray(fallbackValue) &&
      typeof value === 'object'
    ) {
      out[key] = withEnglishFallback(value, fallbackValue)
    }
  }
  return out
}

/**
 * Builds a translator for a given language — usable anywhere, not just inside a React tree
 * (lib/insights.ts and lib/goalReminders.ts are plain functions, not components, and still need
 * to produce translated strings). Components should prefer the useI18n()/useT() hooks below,
 * which read the language from context instead of needing it threaded in as a prop everywhere.
 */
export function createTranslator(lang: Language): Dictionary {
  const dict = DICTIONARIES[lang] || DICTIONARIES[DEFAULT_LANGUAGE]
  return withEnglishFallback(dict, DICTIONARIES[DEFAULT_LANGUAGE])
}

interface I18nContextValue {
  lang: Language
  locale: string
  t: Dictionary
}

const I18nContext = createContext<I18nContextValue | null>(null)

/**
 * Wraps the app once, near the root — see App.tsx. Takes the language straight from
 * `state.settings.language` (the single source of truth, persisted exactly like currency/theme)
 * rather than holding its own copy of it, so there's only ever one place language state lives.
 */
export function I18nProvider({ lang, children }: { lang: Language; children: React.ReactNode }) {
  const value = useMemo<I18nContextValue>(
    () => ({ lang, locale: localeForLanguage(lang), t: createTranslator(lang) }),
    [lang]
  )
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

/** Full context — { t, lang, locale } — for the (rare) component that needs more than just t. */
export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext)
  if (!ctx) {
    // Defensive fallback rather than throwing — a component rendered in a test harness or a
    // future storybook-style preview without the provider still gets working English text
    // instead of a hard crash.
    return { lang: DEFAULT_LANGUAGE, locale: localeForLanguage(DEFAULT_LANGUAGE), t: createTranslator(DEFAULT_LANGUAGE) }
  }
  return ctx
}

/** The one hook almost every component needs: the translation dictionary for the current
 * language. `const t = useT()` then `t.dashboard.greeting`, `t.goals.ofAmount(formatted)`, etc. */
export function useT(): Dictionary {
  return useI18n().t
}
