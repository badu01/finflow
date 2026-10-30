import { useEffect, useState } from 'react'
import Sheet from './Sheet'
import AccountPicker from './AccountPicker'
import { Check } from 'lucide-react'
import { ACCOUNT_KINDS, CARD_THEMES, WALLET_NAMES, themeFor } from '../lib/constants'
import { useData } from '../context/DataContext'
import { sym } from '../lib/format'

const num = (v) => v.replace(/[^\d.]/g, '')

export default function AccountSheet({ open, onClose, initial, defaultKind = 'bank' }) {
  const { save } = useData()
  const editing = Boolean(initial?.id)
  const [f, setF] = useState({})
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!open) return
    setErr('')
    const a = initial || {}
    setF({
      kind: a.kind || defaultKind, bank_name: a.bank_name || '', nickname: a.nickname || '', account_type: a.account_type || 'Savings',
      last4: a.last4 || '', balance: a.balance != null ? String(a.balance) : '', credit_limit: a.credit_limit != null ? String(a.credit_limit) : '',
      outstanding: a.outstanding != null ? String(a.outstanding) : '', billing_day: a.billing_day ? String(a.billing_day) : '',
      due_day: a.due_day ? String(a.due_day) : '', linked_account_id: a.linked_account_id || null, color: a.color || null
    })
  }, [open, initial, defaultKind])

  const set = (k, v) => setF((p) => ({ ...p, [k]: v }))
  const k = f.kind
  const isCard = k === 'debit' || k === 'credit'

  const submit = async () => {
    const nickname = (f.nickname || '').trim() || (k === 'cash' ? 'Cash' : '')
    if (!nickname) return setErr('Give it a nickname.')
    if (isCard && !/^\d{4}$/.test(f.last4 || '')) return setErr('Enter the last 4 digits only.')
    if (k === 'credit') {
      if (!(Number(f.credit_limit) > 0)) return setErr('Enter the credit limit.')
      for (const d of ['billing_day', 'due_day']) if (f[d] && (+f[d] < 1 || +f[d] > 31)) return setErr('Billing and due dates must be between 1 and 31.')
    }
    setBusy(true); setErr('')
    try {
      await save('accounts', {
        ...(editing ? { id: initial.id } : {}),
        kind: k, nickname, bank_name: k === 'cash' || k === 'wallet' ? null : (f.bank_name || '').trim() || null,
        account_type: k === 'bank' ? f.account_type : null, last4: isCard ? f.last4 : null,
        balance: ['bank', 'cash', 'wallet'].includes(k) ? Number(f.balance) || 0 : 0,
        credit_limit: k === 'credit' ? Number(f.credit_limit) : null,
        outstanding: k === 'credit' ? Number(f.outstanding) || 0 : 0,
        billing_day: k === 'credit' && f.billing_day ? +f.billing_day : null,
        due_day: k === 'credit' && f.due_day ? +f.due_day : null,
        linked_account_id: k === 'debit' ? f.linked_account_id || null : null,
        color: isCard ? f.color || themeFor(null, k === 'credit' ? 0 : 1).id : null
      })
      onClose()
    } catch (e) { setErr(e.message || 'Could not save.') } finally { setBusy(false) }
  }

  return (
    <Sheet open={open} onClose={onClose} title={editing ? 'Edit' : 'Add to wallet'}>
      {!editing && (
        <div className="flex gap-2 overflow-x-auto -mx-6 px-6 pb-4">
          {Object.entries(ACCOUNT_KINDS).map(([id, K]) => (
            <button key={id} onClick={() => set('kind', id)} className={`chip flex items-center gap-2 ${k === id ? 'chip-on' : ''}`}><K.icon size={14} />{K.label}</button>
          ))}
        </div>
      )}

      {k === 'wallet' && (
        <div className="flex gap-2 overflow-x-auto -mx-6 px-6 pb-3">
          {WALLET_NAMES.map((w) => <button key={w} onClick={() => set('nickname', w)} className={`chip ${f.nickname === w ? 'chip-on' : ''}`}>{w}</button>)}
        </div>
      )}

      {(k === 'bank' || isCard) && (
        <>
          <label className="label" htmlFor="bn">Bank name</label>
          <input id="bn" className="field mb-4" placeholder="HDFC Bank" value={f.bank_name || ''} onChange={(e) => set('bank_name', e.target.value)} />
        </>
      )}
      <label className="label" htmlFor="nn">Nickname</label>
      <input id="nn" className="field mb-4" placeholder={k === 'credit' ? 'Travel card' : k === 'bank' ? 'Salary account' : 'Nickname'} value={f.nickname || ''} onChange={(e) => set('nickname', e.target.value)} />

      {k === 'bank' && (
        <>
          <span className="label">Account type</span>
          <div className="flex gap-2 mb-4">{['Savings', 'Current'].map((t) => <button key={t} onClick={() => set('account_type', t)} className={`chip ${f.account_type === t ? 'chip-on' : ''}`}>{t}</button>)}</div>
        </>
      )}

      {isCard && (
        <>
          <label className="label" htmlFor="l4">Last 4 digits</label>
          <input id="l4" inputMode="numeric" maxLength={4} className="field mb-1 tracking-[0.3em]" placeholder="1234" value={f.last4 || ''} onChange={(e) => set('last4', e.target.value.replace(/\D/g, ''))} />
          <p className="text-xs text-mute mb-4">Only the last 4 digits are stored. Never enter your full card number or CVV.</p>
        </>
      )}

      {isCard && (
        <>
          <span className="label">Card colour</span>
          <div className="rounded-2xl p-4 mb-3 text-white relative overflow-hidden transition-[background] duration-300" style={{ background: (CARD_THEMES.find((t) => t.id === f.color) || CARD_THEMES[k === 'credit' ? 0 : 1]).bg }}>
            <p className="text-[11px] opacity-70">{f.bank_name || (k === 'credit' ? 'Credit card' : 'Debit card')}</p>
            <p className="font-display text-xl font-semibold leading-tight">{f.nickname || 'Nickname'}</p>
            <p className="text-xs tracking-[0.25em] mt-3 opacity-90">•••• •••• •••• {f.last4 || '0000'}</p>
          </div>
          <div className="flex gap-3 overflow-x-auto -mx-6 px-6 pb-4">
            {CARD_THEMES.map((t) => {
              const on = (f.color || CARD_THEMES[k === 'credit' ? 0 : 1].id) === t.id
              return (
                <button key={t.id} type="button" aria-label={t.name} aria-pressed={on} onClick={() => set('color', t.id)}
                  className={`h-10 w-10 shrink-0 rounded-full grid place-items-center text-white ring-offset-2 ring-offset-card transition-shadow ${on ? 'ring-2 ring-accent' : ''}`} style={{ background: t.bg }}>
                  {on && <Check size={16} />}
                </button>
              )
            })}
          </div>
        </>
      )}

      {k === 'debit' && (
        <>
          <span className="label">Linked bank account</span>
          <div className="mb-4"><AccountPicker kinds={['bank']} value={f.linked_account_id} onChange={(id) => set('linked_account_id', id)} noneLabel="None" /></div>
        </>
      )}

      {['bank', 'cash', 'wallet'].includes(k) && (
        <>
          <label className="label" htmlFor="bal">{editing ? 'Opening balance' : 'Current balance'} ({sym()})</label>
          <input id="bal" inputMode="decimal" className="field mb-4" placeholder="0" value={f.balance || ''} onChange={(e) => set('balance', num(e.target.value))} />
          {editing && <p className="text-xs text-mute -mt-2 mb-4">Live balance = this opening balance plus every transaction tagged to it.</p>}
        </>
      )}

      {k === 'credit' && (
        <>
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div><label className="label" htmlFor="cl">Credit limit</label><input id="cl" inputMode="decimal" className="field" value={f.credit_limit || ''} onChange={(e) => set('credit_limit', num(e.target.value))} /></div>
            <div><label className="label" htmlFor="os">Outstanding now</label><input id="os" inputMode="decimal" className="field" placeholder="0" value={f.outstanding || ''} onChange={(e) => set('outstanding', num(e.target.value))} /></div>
            <div><label className="label" htmlFor="bd">Billing date</label><input id="bd" inputMode="numeric" maxLength={2} className="field" placeholder="Day, 1–31" value={f.billing_day || ''} onChange={(e) => set('billing_day', e.target.value.replace(/\D/g, ''))} /></div>
            <div><label className="label" htmlFor="dd">Due date</label><input id="dd" inputMode="numeric" maxLength={2} className="field" placeholder="Day, 1–31" value={f.due_day || ''} onChange={(e) => set('due_day', e.target.value.replace(/\D/g, ''))} /></div>
          </div>
          <p className="text-xs text-mute mb-4">Spends tagged to this card add to the outstanding. Paying the bill is a transfer to the card.</p>
        </>
      )}

      {err && <p role="alert" className="text-bad text-sm mb-3">{err}</p>}
      <button className="btn w-full" onClick={submit} disabled={busy}>{busy ? 'Saving…' : 'Save'}</button>
    </Sheet>
  )
}
