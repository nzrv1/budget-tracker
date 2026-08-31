/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ['selector', '[data-theme="dark"]'],
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Theme-aware tokens — values swap at runtime via [data-theme] CSS variables.
        // rgb(var(...) / <alpha-value>) pattern keeps Tailwind's /opacity modifiers working.
        ink: {
          DEFAULT: 'rgb(var(--color-ink) / <alpha-value>)',
          light: 'rgb(var(--color-ink-light) / <alpha-value>)',
          softer: 'rgb(var(--color-ink-softer) / <alpha-value>)',
        },
        paper: {
          DEFAULT: 'rgb(var(--color-paper) / <alpha-value>)',
          card: 'rgb(var(--color-paper-card) / <alpha-value>)',
          line: 'rgb(var(--color-paper-line) / <alpha-value>)',
        },
        sage: {
          DEFAULT: 'rgb(var(--color-sage) / <alpha-value>)',
          dark: 'rgb(var(--color-sage-dark) / <alpha-value>)',
          light: 'rgb(var(--color-sage-light) / <alpha-value>)',
        },
        gold: {
          DEFAULT: 'rgb(var(--color-gold) / <alpha-value>)',
          dark: 'rgb(var(--color-gold-dark) / <alpha-value>)',
          light: 'rgb(var(--color-gold-light) / <alpha-value>)',
        },
        clay: {
          DEFAULT: 'rgb(var(--color-clay) / <alpha-value>)',
          dark: 'rgb(var(--color-clay-dark) / <alpha-value>)',
          light: 'rgb(var(--color-clay-light) / <alpha-value>)',
        },
        // Sidebar/nav chrome — its own dark "spine" color per theme (see index.css).
        nav: {
          DEFAULT: 'rgb(var(--color-nav-bg) / <alpha-value>)',
          light: 'rgb(var(--color-nav-bg-light) / <alpha-value>)',
          text: 'rgb(var(--color-nav-text) / <alpha-value>)',
        },
      },
      fontFamily: {
        display: ['"Space Grotesk"', 'sans-serif'],
        body: ['"Inter"', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'monospace'],
      },
      borderRadius: {
        sm: '4px',
        DEFAULT: '8px',
        lg: '12px',
      },
    },
  },
  plugins: [],
}
