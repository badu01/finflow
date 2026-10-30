import { useEffect, useState } from 'react'
import Sheet from './Sheet'
import { useData } from '../context/DataContext'
import { addDays, key } from '../lib/stats'
import { avgMonthlyExpense } from '../lib/insights'

export default function GoalSheet({ open, onClose, initial, defaultType = 'goal' }) {
  const { save, remove, transactions } = useData()
  const editing = Boolean(initial?.id)
  const [f, setF] = useState({})
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!open) return
    setErr('')
    const g = initial || {}
    const type = g.kind === 'emergency' ? 'emergency' : g.is_wishlist ? 'wishlist' : g.id ? 'goal' : defaultType
    const suggested = Math.round((avgMonthlyExpense(transactions) * 6) / 1000) * 1000
    setF({
      type, name: g.name || (type === 'emergency' ? 'Emergency fund' : ''), target_amount: g.target_amount ? String(g.target_amount) : type === 'emergency' && suggested ? String(suggested) : '',
      saved_amount: g.saved_amount != null ? String(g.saved_amount) : '', target_date: g.target_date || '', suggested
    })
  }, [open, initial, defaultType])

  const set = (k, v) => setF((p) => ({ ...p, [k]: v }))
  const submit = async () => {
    if (!f.name.trim()) return setErr('Name your goal.')
    if (!(Number(f.target_amount) > 0)) return setErr('Enter a target amount.')
    setBusy(true); setErr('')
    try {
      await save('goals', {
        ...(editing ? { id: initial.id } : {}),
        name: f.name.trim(), kind: f.type === 'emergency' ? 'emergency' : 'goal', is_wishlist: f.type === 'wishlist',
        target_amount: Number(f.target_amount), saved_amount: Number(f.saved_amount) || 0, target_date: f.target_date || null
      })
      onClose()
    } catch (e) { setErr(e.message || 'Could not save.') } finally { setBusy(false) }
  }
  const del = async () => { if (window.confirm(`Delete ${initial.name}?`)) { await remove('goals', initial.id); onClose() } }

  return (
    <Sheet open={open} onClose={onClose} title={editing ? 'Edit goal' : 'New goal'}>
      <div className="grid grid-cols-3 gap-1 bg-raised rounded-2xl p-1 mb-5">
        {[['goal', 'Goal'], ['wishlist', 'Wishlist'], ['emergency', 'Emergency']].map(([v, l]) => (
          <button key={v} onClick={() => set('type', v)} className={`rounded-xl py-2 text-sm ${f.type === v ? 'bg-accent text-onaccent font-medium' : 'text-mute'}`}>{l}</button>
        ))}
      </div>
      <label className="label" htmlFor="gn">Name</label>
      <input id="gn" className="field mb-4" placeholder="Goa trip, new laptop…" value={f.name || ''} onChange={(e) => set('name', e.target.value)} />
      <div className="grid grid-cols-2 gap-3 mb-2">
        <div><label className="label" htmlFor="gt">Target</label><input id="gt" inputMode="decimal" className="field" value={f.target_amount || ''} onChange={(e) => set('target_amount', e.target.value.replace(/[^\d.]/g, ''))} /></div>
        <div><label className="label" htmlFor="gs">Saved so far</label><input id="gs" inputMode="decimal" className="field" placeholder="0" value={f.saved_amount || ''} onChange={(e) => set('saved_amount', e.target.value.replace(/[^\d.]/g, ''))} /></div>
      </div>
      {f.type === 'emergency' && f.suggested > 0 && <p className="text-xs text-mute mb-4">Six months of your average spending is about {f.suggested.toLocaleString()}.</p>}
      {f.type !== 'emergency' && (
        <>
          <label className="label mt-2" htmlFor="gd">Target date (optional)</label>
          <input id="gd" type="date" className="field mb-4" min={key(addDays(new Date(), 1))} value={f.target_date || ''} onChange={(e) => set('target_date', e.target.value)} />
        </>
      )}
      {err && <p role="alert" className="text-bad text-sm mt-2">{err}</p>}
      <button className="btn w-full mt-4" onClick={submit} disabled={busy}>{busy ? 'Saving…' : 'Save'}</button>
      {editing && <button className="btn-danger w-full mt-3" onClick={del}>Delete</button>}
    </Sheet>
  )
}
