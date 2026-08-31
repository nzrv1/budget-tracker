import { ThemeKey } from '../types'

export interface ThemeMeta {
  key: ThemeKey
  label: string
  /** [background, primary accent, secondary accent] — for swatch previews only */
  preview: [string, string, string]
}

export const THEMES: ThemeMeta[] = [
  { key: 'light', label: 'Light', preview: ['#F4F6F4', '#7C9885', '#C9A15C'] },
  { key: 'dark', label: 'Dark', preview: ['#10161A', '#8FB098', '#D9B36E'] },
  { key: 'cyber', label: 'Cyber', preview: ['#0A0C0B', '#C6FF3D', '#4DE8E0'] },
  { key: 'red', label: 'Red', preview: ['#0F0F10', '#E4282F', '#5FCB83'] },
  { key: 'pinky', label: 'Pinky', preview: ['#170B27', '#E94FD1', '#4FE0C0'] },
  { key: 'caramel', label: 'Caramel', preview: ['#F3E9DC', '#C08552', '#7D8B5A'] },
]
