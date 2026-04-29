import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Warm paper-cream substrate. White is forbidden.
        paper: {
          DEFAULT: '#f5efe3',
          dark: '#ece4d4',
          deep: '#e1d6bf',
        },
        ink: {
          DEFAULT: '#1c1611',  // warm near-black, never pure black
          soft: '#3a302a',
          muted: '#7d6f60',
          faint: '#a99c89',
        },
        rule: {
          DEFAULT: '#cdbfa6',
          soft: '#dccebb',
        },
        accent: {
          DEFAULT: '#c5482e',  // oxblood-coral; refined from #ff5b2e
          soft: '#ecc6b6',
          deep: '#8e2f1a',
        },
        forest: {
          DEFAULT: '#2d4a3a',
          soft: '#a9bcb0',
        },
        gold: {
          DEFAULT: '#a07023',
          soft: '#d9bd83',
        },
      },
      fontFamily: {
        // Wired up by next/font in app/layout.tsx via CSS variables.
        display: ['var(--font-display)', 'ui-serif', 'Georgia', 'serif'],
        sans: ['var(--font-sans)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      letterSpacing: {
        kicker: '0.22em',
      },
      borderRadius: {
        // Editorial cards — softer corners only where they help. Mostly rectangular.
        card: '4px',
      },
      keyframes: {
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'rule-extend': {
          '0%': { transform: 'scaleX(0)' },
          '100%': { transform: 'scaleX(1)' },
        },
      },
      animation: {
        'fade-up': 'fade-up 700ms cubic-bezier(0.16, 1, 0.3, 1) both',
        'rule-extend': 'rule-extend 900ms cubic-bezier(0.16, 1, 0.3, 1) 200ms both',
      },
    },
  },
  plugins: [],
};

export default config;
