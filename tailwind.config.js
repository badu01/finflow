/** @type {import('tailwindcss').Config} */
const v = (n) => `rgb(var(--${n}) / <alpha-value>)`
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        ink: v('ink'), card: v('card'), raised: v('raised'), fg: v('fg'), mute: v('mute'),
        accent: v('accent'), good: v('good'), warn: v('warn'), bad: v('bad'), onaccent: '#0B0B0C'
      },
      borderRadius: { card: '24px' },
      boxShadow: {
        soft: '0 1px 0 rgba(255,255,255,0.04) inset, 0 14px 32px -14px rgba(0,0,0,0.75), 0 2px 6px rgba(0,0,0,0.45)',
        glow: '0 10px 30px -8px rgba(167,139,250,0.55)'
      },
      fontFamily: {
        display: ['"Cormorant Garamond"', 'Georgia', 'serif'],
        sans: ['Inter', 'system-ui', 'sans-serif']
      }
    }
  },
  plugins: []
}
