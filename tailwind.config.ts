import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: 'class',
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        background: 'var(--background)',
        foreground: 'var(--foreground)',
        card: 'var(--card)',
        'card-elevated': 'var(--card-elevated)',
        elevated: 'var(--elevated)',
        border: 'var(--border)',
        'border-subtle': 'var(--border-subtle)',
        muted: 'var(--muted)',
        secondary: 'var(--secondary)',
        accent: 'var(--accent)',
        'accent-light': 'var(--accent-light)',
        'accent-dark': 'var(--accent-dark)',
        'accent-foreground': 'var(--accent-foreground)',
        success: 'var(--success)',
        sidebar: 'var(--sidebar)',
      },
      fontFamily: {
        sans: ['var(--font-inter)', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        display: ['var(--font-space-grotesk)', 'var(--font-inter)', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
      },
      boxShadow: {
        card: '0 2px 8px rgba(0,0,0,0.25)',
        'card-hover': '0 4px 24px rgba(0,0,0,0.3)',
        glow: '0 0 20px var(--accent-glow)',
        'glow-lg': '0 0 40px var(--accent-glow)',
        'glow-accent': '0 0 20px rgba(59,130,246,0.25)',
        'inner-glow': 'inset 0 1px 0 0 rgba(255,255,255,0.03)',
      },
      borderRadius: {
        xl: '12px',
        '2xl': '16px',
      },
      keyframes: {
        'fade-in-up': {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'pulse-glow': {
          '0%, 100%': { boxShadow: '0 0 12px rgba(59,130,246,0.1)' },
          '50%': { boxShadow: '0 0 24px rgba(59,130,246,0.2)' },
        },
      },
      animation: {
        'fade-in-up': 'fade-in-up 0.5s cubic-bezier(0.25,0.1,0.25,1)',
        'fade-in': 'fade-in 0.4s cubic-bezier(0.25,0.1,0.25,1)',
        'pulse-glow': 'pulse-glow 3s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}
export default config
