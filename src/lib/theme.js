import { useSettings } from '../context/SettingsContext'

// Recharts needs real color strings, so charts read the theme here.
export function useChart() {
  const { theme } = useSettings()
  const light = theme === 'light'
  const mute = light ? '#666666' : '#A1A1AA'
  return {
    mute,
    grid: light ? 'rgba(0,0,0,0.07)' : 'rgba(255,255,255,0.05)',
    tip: {
      contentStyle: { background: light ? '#FFFFFF' : '#1C1C1F', border: light ? '1px solid #EAEAEA' : 0, borderRadius: 12, fontSize: 12, color: light ? '#111' : '#fff' },
      itemStyle: { color: light ? '#111' : '#fff' },
      cursor: { fill: light ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.04)' }
    },
    axis: { axisLine: false, tickLine: false, tick: { fill: mute, fontSize: 11 } }
  }
}

// Tiny non-cryptographic hash: enough for a screen-lock PIN, not for secrets.
export function hashPin(p) {
  let h = 2166136261
  const s = 'vault:' + p
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) }
  return (h >>> 0).toString(16)
}
