/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: {
          DEFAULT: '#16232A',
          light: '#22343C',
          softer: '#3C5158',
        },
        paper: {
          DEFAULT: '#F4F6F4',
          card: '#FFFFFF',
          line: '#E2E7E3',
        },
        sage: {
          DEFAULT: '#7C9885',
          dark: '#5E7A67',
          light: '#DCE6DF',
        },
        gold: {
          DEFAULT: '#C9A15C',
          dark: '#A8813F',
          light: '#F1E4C8',
        },
        clay: {
          DEFAULT: '#C1666B',
          dark: '#A04B50',
          light: '#F4DBDC',
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
