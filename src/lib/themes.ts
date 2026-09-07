import { ThemeKey } from '../types'
import { Dictionary } from './i18n'

export interface ThemeMeta {
  key: ThemeKey
  /** [background, primary accent, secondary accent] — for swatch previews only */
  preview: [string, string, string]
}

// `label` used to live inline here; it's now looked up from the current language via
// themeLabel(t, key) below so the theme picker (Settings and the nav-rail flyout) shows a
// translated name instead of always English.
export const THEMES: ThemeMeta[] = [
  { key: 'light', preview: ['#F4F6F4', '#7C9885', '#C9A15C'] },
  { key: 'dark', preview: ['#10161A', '#8FB098', '#D9B36E'] },
  { key: 'cyber', preview: ['#0A0C0B', '#C6FF3D', '#4DE8E0'] },
  { key: 'red', preview: ['#0F0F10', '#E4282F', '#5FCB83'] },
  { key: 'pinky', preview: ['#170B27', '#E94FD1', '#4FE0C0'] },
  { key: 'caramel', preview: ['#F3E9DC', '#C08552', '#7D8B5A'] },
]

export function themeLabel(t: Dictionary, key: ThemeKey): string {
  return t.themes[key]
}
