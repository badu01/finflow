import { useState } from 'react'
import { Delete } from 'lucide-react'
import { hashPin } from '../lib/theme'

export default function LockScreen({ pinHash, onUnlock }) {
  const [v, setV] = useState('')
  const [bad, setBad] = useState(false)
  const press = (d) => {
    if (v.length >= 4) return
    const n = v + d
    setV(n); setBad(false)
    if (n.length === 4) {
      if (hashPin(n) === pinHash) onUnlock()
      else setTimeout(() => { setBad(true); setV('') }, 150)
    }
  }
  return (
    <div className="fixed inset-0 z-[100] bg-ink grid place-items-center">
      <div className="w-full max-w-xs px-6 text-center">
        <h1 className="font-display text-5xl font-semibold">FinFlow</h1>
        <p className={`text-sm mt-2 mb-8 ${bad ? 'text-bad' : 'text-mute'}`}>{bad ? 'Wrong PIN. Try again.' : 'Enter your PIN'}</p>
        <div className="flex justify-center gap-4 mb-10" aria-live="polite">
          {[0, 1, 2, 3].map((i) => <span key={i} className={`h-3.5 w-3.5 rounded-full border border-accent ${i < v.length ? 'bg-accent' : ''}`} />)}
        </div>
        <div className="grid grid-cols-3 gap-4">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'del'].map((k, i) => k === '' ? <span key={i} /> : (
            <button key={k} aria-label={k === 'del' ? 'Delete' : k} onClick={() => (k === 'del' ? setV(v.slice(0, -1)) : press(k))}
              className="h-16 rounded-full bg-card text-2xl font-display active:bg-raised grid place-items-center">{k === 'del' ? <Delete size={22} /> : k}</button>
          ))}
        </div>
      </div>
    </div>
  )
}
