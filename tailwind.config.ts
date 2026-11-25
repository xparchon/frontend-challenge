import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        kurio: {
          ink: '#15100d',
          surface: '#211915',
          line: '#4a3d33',
          gold: '#c98a50',
          goldStrong: '#d69a5a',
          cream: '#f4ede4',
        },
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      boxShadow: {
        focus: '0 0 0 3px rgba(201, 138, 80, 0.35)',
      },
    },
  },
  plugins: [],
} satisfies Config
