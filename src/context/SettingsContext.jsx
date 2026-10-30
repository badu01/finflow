import { createContext, useContext, useEffect, useState } from 'react'
import { setCurrency } from '../lib/format'

const Ctx = createContext(null)
export const useSettings = () => useContext(Ctx)

const KEY = 'vault-settings'
const DEF = { theme: 'dark', currency: 'INR', pin: null, remind: false }

export function SettingsProvider({ children }) {
  const [s, setS] = useState(() => {
    try { return { ...DEF, ...JSON.parse(localStorage.getItem(KEY) || '{}') } } catch { return DEF }
  })
  setCurrency(s.currency)
  useEffect(() => {
    localStorage.setItem(KEY, JSON.stringify(s))
    document.documentElement.classList.toggle('light', s.theme === 'light')
    document.querySelector('meta[name=apple-mobile-web-app-status-bar-style]')?.setAttribute('content', s.theme === 'light' ? 'default' : 'black')
    document.querySelector('meta[name=theme-color]')?.setAttribute('content', s.theme === 'light' ? '#FAFAFA' : '#0B0B0C')
  }, [s])
  const set = (k, v) => setS((p) => ({ ...p, [k]: v }))
  return <Ctx.Provider value={{ ...s, set }}>{children}</Ctx.Provider>
}
