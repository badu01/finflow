import { useEffect, useState } from 'react'
import Sheet from './Sheet'
import AccountPicker from './AccountPicker'
import { BILL_KINDS, CATEGORIES, CYCLES } from '../lib/constants'
import { useData } from '../context/DataContext'
import { addDays, key } from '../lib/stats'

export default function BillSheet({ open, onClose, initial, defaultKind = 'bill' }) {
  const { save, remove } = useData()
  const editing = Boolean(initial?.id)
  const [f, setF] = useState({})
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!open) return
    setErr('')
    const b = initial || {}
    setF({
      name: b.name || '', amount: b.amount ? String(b.amount) : '', kind: b.kind || defaultKind, cycle: b.cycle || 'monthly',
      next_due: b.next_due || key(addDays(new Date(), 7)), category: b.category || (defaultKind === 'subscription' ? 'Subscriptions' : 'Bills'),
      account_id: b.account_id || null, autopay: Boolean(b.autopay), remind_days_before: b.remind_days_before ?? 3, active: b.active !== false
    })
  }, [open, initial, defaultKind])

  const set = (k, v) => setF((p) => ({ ...p, [k]: v }))

  const submit = async () => {
    if (!f.name.trim()) return setErr('Name this bill.')
    if (!(Number(f.amount) > 0)) return setErr('Enter the amount.')
    if (!f.next_due) return setErr('Pick the next due date.')
    setBusy(true); setErr('')
    try {
      await save('bills', {
        ...(editing ? { id: initial.id } : {}),
        name: f.name.trim(), amount: Number(f.amount), kind: f.kind, cycle: f.cycle, next_due: f.next_due, category: f.category,
        account_id: f.account_id || null, autopay: f.autopay, remind_days_before: Number(f.remind_days_before), active: f.active
      })
      onClose()
    } catch (e) { setErr(e.message || 'Could not save.') } finally { setBusy(false) }
  }
  const del = async () => { if (window.confirm(`Delete ${initial.name}?`)) { await remove('bills', initial.id); onClose() } }

  return (
    <Sheet open={open} onClose={onClose} title={editing ? 'Edit bill' : 'Add bill or subscription'}>
      <span className="label">Type</span>
      <div className="flex gap-2 overflow-x-auto -mx-6 px-6 pb-4">
        {BILL_KINDS.map((k) => <button key={k} onClick={() => set('kind', k)} className={`chip capitalize ${f.kind === k ? 'chip-on' : ''}`}>{k === 'emi' ? 'EMI' : k}</button>)}
      </div>
      <label className="label" htmlFor="bnm">Name</label>
      <input id="bnm" className="field mb-4" placeholder="Netflix, Electricity, Car EMI…" value={f.name || ''} onChange={(e) => set('name', e.target.value)} />
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div><label className="label" htmlFor="bam">Amount</label><input id="bam" inputMode="decimal" className="field" value={f.amount || ''} onChange={(e) => set('amount', e.target.value.replace(/[^\d.]/g, ''))} /></div>
        <div><label className="label" htmlFor="bdue">Next due date</label><input id="bdue" type="date" className="field" value={f.next_due || ''} onChange={(e) => set('next_due', e.target.value)} /></div>
      </div>
      <span className="label">Repeats</span>
      <div className="flex gap-2 overflow-x-auto -mx-6 px-6 pb-4">
        {CYCLES.map((c) => <button key={c} onClick={() => set('cycle', c)} className={`chip capitalize ${f.cycle === c ? 'chip-on' : ''}`}>{c === 'once' ? 'One-time' : c}</button>)}
      </div>
      <label className="label" htmlFor="bcat">Category</label>
      <select id="bcat" className="field mb-4" value={f.category || ''} onChange={(e) => set('category', e.target.value)}>
        {CATEGORIES.map((c) => <option key={c.name} className="bg-card">{c.name}</option>)}
      </select>
      <span className="label">Pay from</span>
      <div className="mb-4"><AccountPicker value={f.account_id} onChange={(id) => set('account_id', id)} noneLabel="Decide later" /></div>
      <span className="label">Remind me</span>
      <div className="flex gap-2 mb-4">
        {[1, 3, 5, 7, 14].map((d) => <button key={d} onClick={() => set('remind_days_before', d)} className={`chip ${f.remind_days_before === d ? 'chip-on' : ''}`}>{d}d before</button>)}
      </div>
      <button type="button" role="switch" aria-checked={f.autopay} onClick={() => set('autopay', !f.autopay)} className="flex items-center justify-between w-full bg-raised rounded-2xl px-4 py-3 text-left mb-2">
        <span><span className="block text-sm">Autopay is on</span><span className="block text-xs text-mute">Just a label so you remember. FinFlow never moves money.</span></span>
        <span className={`h-6 w-11 rounded-full p-0.5 shrink-0 ml-3 ${f.autopay ? 'bg-accent' : 'bg-fg/15'}`}><span className={`block h-5 w-5 rounded-full transition-transform ${f.autopay ? 'translate-x-5 bg-onaccent' : 'bg-fg'}`} /></span>
      </button>
      {err && <p role="alert" className="text-bad text-sm mt-3">{err}</p>}
      <button className="btn w-full mt-4" onClick={submit} disabled={busy}>{busy ? 'Saving…' : 'Save'}</button>
      {editing && <button className="btn-danger w-full mt-3" onClick={del}>Delete</button>}
    </Sheet>
  )
}
