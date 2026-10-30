import { useEffect, useState } from 'react'
import Sheet from './Sheet'
import { CATEGORIES } from '../lib/constants'
import { useData } from '../context/DataContext'
import { sym } from '../lib/format'

const label = (c) => (c === 'all' ? 'Whole month' : c === 'daily' ? 'Daily' : c)

export default function BudgetSheet({ open, onClose, initialCategory = 'all' }) {
  const { budgets, setBudget } = useData()
  const [cat, setCat] = useState('all')
  const [amount, setAmount] = useState('')
  const [rollover, setRollover] = useState(false)
  const [busy, setBusy] = useState(false)

  useEffect(() => { if (open) setCat(initialCategory) }, [open, initialCategory])
  useEffect(() => {
    const b = budgets.find((x) => x.category === cat)
    setAmount(b ? String(b.amount) : '')
    setRollover(Boolean(b?.rollover))
  }, [cat, budgets, open])

  const save = async () => {
    setBusy(true)
    try { await setBudget(cat, Number(amount) || 0, cat === 'daily' ? false : rollover); onClose() } finally { setBusy(false) }
  }

  return (
    <Sheet open={open} onClose={onClose} title="Set budget">
      <span className="label">Applies to</span>
      <div className="flex gap-2 overflow-x-auto -mx-6 px-6 pb-4">
        {['all', 'daily', ...CATEGORIES.map((c) => c.name)].map((c) => (
          <button key={c} onClick={() => setCat(c)} className={`chip ${cat === c ? 'chip-on' : ''}`}>{label(c)}</button>
        ))}
      </div>
      <label className="label" htmlFor="bamt">{cat === 'daily' ? 'Daily limit' : 'Monthly limit'}</label>
      <input id="bamt" inputMode="numeric" className="field !text-2xl font-display font-semibold" placeholder={`${sym()} 0`}
        value={amount} onChange={(e) => setAmount(e.target.value.replace(/\D/g, ''))} />
      {cat === 'daily' ? (
        <p className="text-xs text-mute mt-3">Leave it empty and FinFlow splits your monthly budget evenly across the days of the month.</p>
      ) : (
        <>
          <button type="button" role="switch" aria-checked={rollover} onClick={() => setRollover(!rollover)} className="flex items-center justify-between w-full mt-5 bg-raised rounded-2xl px-4 py-3 text-left">
            <span><span className="block text-sm">Roll over unused budget</span><span className="block text-xs text-mute">Whatever you don't spend this month is added to next month.</span></span>
            <span className={`h-6 w-11 rounded-full p-0.5 transition-colors shrink-0 ml-3 ${rollover ? 'bg-accent' : 'bg-fg/15'}`}><span className={`block h-5 w-5 rounded-full transition-transform ${rollover ? 'translate-x-5 bg-onaccent' : 'bg-fg'}`} /></span>
          </button>
          <p className="text-xs text-mute mt-3">Alerts fire at 50%, 75%, 90% and when you go over. Leave the amount empty to remove.</p>
        </>
      )}
      <button className="btn w-full mt-6" onClick={save} disabled={busy}>Save budget</button>
    </Sheet>
  )
}
