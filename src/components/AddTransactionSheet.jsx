import { useEffect, useRef, useState } from 'react'
import { Paperclip, Repeat } from 'lucide-react'
import Sheet from './Sheet'
import ReceiptViewer from './ReceiptViewer'
import AccountPicker from './AccountPicker'
import { ACCOUNT_KINDS, CATEGORIES, INCOME_SOURCES, PAY_METHODS, QUICK_AMOUNTS } from '../lib/constants'
import { useData } from '../context/DataContext'
import { advance } from '../lib/bills'
import { key, timeKey } from '../lib/stats'

const LAST = 'vault-last-account'
const TITLES = { expense: 'Add expense', income: 'Add income', transfer: 'Transfer' }

export default function AddTransactionSheet({ open, onClose, initial, defaultType = 'expense' }) {
  const { accounts, addTx, updateTx, save, uploadReceipt } = useData()
  const [f, setF] = useState({})
  const [file, setFile] = useState(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [rcpt, setRcpt] = useState(null)
  const [viewer, setViewer] = useState(false)
  const fileRef = useRef(null)
  const editing = Boolean(initial?.id)

  useEffect(() => {
    if (!open) return
    setErr(''); setFile(null); setRcpt(initial?.receipt_path || null); setViewer(false)
    const now = initial?.occurred_at ? new Date(initial.occurred_at) : new Date()
    const type = initial?.type || defaultType
    const last = localStorage.getItem(LAST)
    const acct = initial && 'account_id' in initial ? initial.account_id : accounts.some((a) => a.id === last) ? last : null
    setF({
      type, amount: initial?.amount ? String(initial.amount) : '', category: initial?.category && type === 'expense' ? initial.category : '',
      subcategory: initial?.subcategory || '', merchant: initial?.merchant || '', payment_method: initial?.payment_method || (acct ? ACCOUNT_KINDS[accounts.find((a) => a.id === acct)?.kind]?.method : 'UPI') || 'UPI',
      account_id: acct, to_account_id: initial?.to_account_id || null, source: initial?.source || 'Salary',
      notes: initial?.notes || '', location: initial?.location || '', date: key(now), time: timeKey(now), repeat: 'none',
      counts: initial?.counts_toward_budget !== false
    })
  }, [open, initial, defaultType])

  const set = (k, v) => setF((p) => ({ ...p, [k]: v }))
  const cat = CATEGORIES.find((c) => c.name === f.category)
  const pickAccount = (id) => {
    const a = accounts.find((x) => x.id === id)
    setF((p) => ({ ...p, account_id: id, payment_method: a ? ACCOUNT_KINDS[a.kind].method : p.payment_method }))
  }

  const submit = async () => {
    const amount = Number(f.amount)
    if (!amount || amount <= 0) return setErr('Enter an amount greater than 0.')
    if (f.type === 'expense' && !f.category) return setErr('Pick a category.')
    if (f.type === 'transfer') {
      if (!f.account_id || !f.to_account_id) return setErr('Choose both the From and To account.')
      if (f.account_id === f.to_account_id) return setErr('From and To must be different.')
    }
    setBusy(true); setErr('')
    try {
      const receipt_path = file ? await uploadReceipt(file) : rcpt
      const isX = f.type === 'expense'
      const row = {
        type: f.type, amount,
        category: isX ? f.category : f.type === 'income' ? 'Income' : 'Transfer',
        subcategory: isX && f.subcategory ? f.subcategory : null,
        merchant: f.type === 'transfer' ? '' : f.merchant.trim(),
        payment_method: f.payment_method, account_id: f.account_id || null,
        counts_toward_budget: isX ? f.counts : true,
        to_account_id: f.type === 'transfer' ? f.to_account_id : null,
        source: f.type === 'income' ? f.source : null,
        notes: f.notes.trim(), location: f.location.trim(), receipt_path,
        occurred_at: new Date(`${f.date}T${f.time || '00:00'}`).toISOString()
      }
      if (editing) await updateTx(initial.id, row)
      else {
        await addTx(row)
        if (f.repeat !== 'none' && f.type !== 'transfer') {
          const { to_account_id, location, receipt_path: _r, occurred_at, ...r } = row
          await save('recurring', { ...r, frequency: f.repeat, next_run: advance(f.date, f.repeat), active: true })
        }
      }
      if (f.account_id) localStorage.setItem(LAST, f.account_id)
      onClose()
    } catch (e) {
      setErr(e.message || 'Could not save. Try again.')
    } finally { setBusy(false) }
  }

  return (
    <Sheet open={open} onClose={onClose} title={editing ? 'Edit transaction' : TITLES[f.type] || 'Add'}>
      {!editing && (
        <div className="grid grid-cols-3 gap-1 bg-raised rounded-2xl p-1 mb-5">
          {['expense', 'income', 'transfer'].map((t) => (
            <button key={t} onClick={() => set('type', t)} className={`rounded-xl py-2 text-sm capitalize transition-colors ${f.type === t ? 'bg-accent text-onaccent font-medium' : 'text-mute'}`}>{t}</button>
          ))}
        </div>
      )}

      <div className="text-center mb-3">
        <label htmlFor="amt" className="label">Amount</label>
        <input id="amt" inputMode="decimal" placeholder="0"
          className="bg-transparent outline-none font-display text-6xl font-semibold w-full text-center"
          value={f.amount || ''} onChange={(e) => set('amount', e.target.value.replace(/[^\d.]/g, ''))} />
      </div>
      <div className="flex justify-center gap-2 mb-6">
        {QUICK_AMOUNTS.map((a) => (
          <button key={a} className="chip" onClick={() => set('amount', String((Number(f.amount) || 0) + a))}>+{a}</button>
        ))}
      </div>

      {f.type === 'expense' && (
        <>
          <span className="label">Category</span>
          <div className="grid grid-cols-5 gap-2 mb-4">
            {CATEGORIES.map(({ name, icon: Icon, color }) => {
              const on = f.category === name
              return (
                <button key={name} onClick={() => setF((p) => ({ ...p, category: name, subcategory: '' }))}
                  className={`flex flex-col items-center gap-1.5 rounded-2xl py-3 border transition-colors ${on ? 'border-accent bg-accent/10' : 'border-transparent bg-raised'}`}>
                  <Icon size={19} style={{ color }} />
                  <span className="text-[10px] text-mute truncate w-full text-center">{name}</span>
                </button>
              )
            })}
          </div>
          {cat?.subcategories && (
            <div className="flex gap-2 overflow-x-auto -mx-6 px-6 pb-4">
              {cat.subcategories.map((s) => (
                <button key={s} onClick={() => set('subcategory', f.subcategory === s ? '' : s)} className={`chip ${f.subcategory === s ? 'chip-on' : ''}`}>{s}</button>
              ))}
            </div>
          )}
        </>
      )}

      {f.type === 'income' && (
        <>
          <span className="label">Source</span>
          <div className="flex flex-wrap gap-2 mb-4">
            {INCOME_SOURCES.map((s) => (
              <button key={s} onClick={() => set('source', s)} className={`chip ${f.source === s ? 'chip-on' : ''}`}>{s}</button>
            ))}
          </div>
        </>
      )}

      {f.type !== 'transfer' && (
        <>
          <label className="label" htmlFor="mer">{f.type === 'income' ? 'From (payer)' : 'Merchant'}</label>
          <input id="mer" className="field mb-4" placeholder={f.type === 'income' ? 'Employer, client…' : 'Zomato, Amazon…'} value={f.merchant || ''} onChange={(e) => set('merchant', e.target.value)} />
        </>
      )}

      {f.type === 'transfer' ? (
        <>
          <span className="label">From</span>
          <div className="mb-4"><AccountPicker value={f.account_id} onChange={(id) => set('account_id', id)} exclude={f.to_account_id} allowNone={false} /></div>
          <span className="label">To (a card here counts as a bill payment)</span>
          <div className="mb-4"><AccountPicker value={f.to_account_id} onChange={(id) => set('to_account_id', id)} exclude={f.account_id} allowNone={false} /></div>
        </>
      ) : (
        <>
          <span className="label">{f.type === 'income' ? 'Received in' : 'Paid from'}</span>
          <div className="mb-4"><AccountPicker value={f.account_id} onChange={pickAccount} /></div>
          <span className="label">Payment method</span>
          <div className="flex gap-2 overflow-x-auto -mx-6 px-6 pb-4">
            {PAY_METHODS.map((p) => <button key={p} onClick={() => set('payment_method', p)} className={`chip ${f.payment_method === p ? 'chip-on' : ''}`}>{p}</button>)}
          </div>
        </>
      )}

      <div className="grid grid-cols-2 gap-3 mb-4">
        <div>
          <label className="label" htmlFor="d">Date</label>
          <input id="d" type="date" className="field" value={f.date || ''} onChange={(e) => set('date', e.target.value)} />
        </div>
        <div>
          <label className="label" htmlFor="t">Time</label>
          <input id="t" type="time" className="field" value={f.time || ''} onChange={(e) => set('time', e.target.value)} />
        </div>
      </div>


      
      {
      // toggle button hereeeeeeee
      }
            {f.type === 'expense' && (
        <button type="button" role="switch" aria-checked={f.counts} onClick={() => set('counts', !f.counts)} className="flex items-center justify-between w-full bg-raised rounded-2xl px-4 py-3 text-left mb-4">
          <span><span className="block text-sm">Deduct from budget</span><span className="block text-xs text-mute">Turn off for things like sending money to family. It still counts as an expense.</span></span>
          <span className={`h-6 w-11 rounded-full p-0.5 shrink-0 ml-3 transition-colors ${f.counts ? 'bg-accent' : 'bg-fg/15'}`}><span className={`block h-5 w-5 rounded-full transition-transform ${f.counts ? 'translate-x-5 bg-onaccent' : 'bg-fg'}`} /></span>
        </button>
      )}

      {
        // to hereeeeeeee
      }


      <label className="label" htmlFor="n">Notes</label>
      <textarea id="n" rows={2} className="field mb-4 resize-none" placeholder="What was this for?" value={f.notes || ''} onChange={(e) => set('notes', e.target.value)} />

      {f.type === 'expense' && (
        <>
          <label className="label" htmlFor="loc">Location (optional)</label>
          <input id="loc" className="field mb-4" placeholder="Where?" value={f.location || ''} onChange={(e) => set('location', e.target.value)} />
          <input ref={fileRef} type="file" accept="image/*,application/pdf" hidden onChange={(e) => setFile(e.target.files?.[0] || null)} />
          {rcpt && !file && (
            <div className="flex items-center gap-3 bg-raised rounded-2xl px-4 py-3 mb-4 text-sm">
              <Paperclip size={16} className="text-accent" /><span className="flex-1">Receipt attached</span>
              <button type="button" className="text-accent" onClick={() => setViewer(true)}>View</button>
              <button type="button" className="text-bad" onClick={() => setRcpt(null)}>Remove</button>
            </div>
          )}
          <button type="button" onClick={() => fileRef.current?.click()} className="btn-ghost w-full flex items-center justify-center gap-2 mb-4 text-sm">
            <Paperclip size={16} /> {file ? file.name : rcpt ? 'Replace receipt' : 'Attach receipt'}
          </button>
          {viewer && rcpt && <ReceiptViewer path={rcpt} onClose={() => setViewer(false)} />}
        </>
      )}

      {!editing && f.type !== 'transfer' && (
        <>
          <span className="label flex items-center gap-1.5"><Repeat size={12} /> Repeat</span>
          <div className="flex gap-2 overflow-x-auto -mx-6 px-6 pb-1">
            {['none', 'daily', 'weekly', 'monthly', 'yearly'].map((r) => <button key={r} onClick={() => set('repeat', r)} className={`chip capitalize ${f.repeat === r ? 'chip-on' : ''}`}>{r === 'none' ? 'Never' : r}</button>)}
          </div>
        </>
      )}

      {err && <p role="alert" className="text-bad text-sm mt-3">{err}</p>}
      <button className="btn w-full mt-5" onClick={submit} disabled={busy}>{busy ? 'Saving…' : editing ? 'Save changes' : 'Save'}</button>
    </Sheet>
  )
}
