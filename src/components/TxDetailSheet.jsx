import { useRef, useState } from 'react'
import { Copy, Paperclip, Pencil, Trash2 } from 'lucide-react'
import Sheet from './Sheet'
import ReceiptViewer from './ReceiptViewer'
import { useData } from '../context/DataContext'
import { ACCOUNT_KINDS, catMeta } from '../lib/constants'
import { inr, mask } from '../lib/format'
import { payLabel } from '../lib/wallet'
import { deleteReceipt, useReceipt } from '../lib/receipts'

const TITLE = { expense: 'Expense', income: 'Income', transfer: 'Transfer' }

const Line = ({ label, children }) => (children ? (
  <div className="flex items-start justify-between gap-4 py-3">
    <span className="text-xs text-mute pt-0.5 shrink-0">{label}</span>
    <span className="text-sm text-right min-w-0 break-words">{children}</span>
  </div>
) : null)

function Acct({ a }) {
  if (!a) return <span className="text-mute">Not tracked</span>
  const K = ACCOUNT_KINDS[a.kind]
  return (
    <span className="inline-flex flex-col items-end">
      <span className="inline-flex items-center gap-1.5"><K.icon size={14} className="text-accent" />{a.nickname}</span>
      <span className="text-xs text-mute">{[K.label, a.bank_name, mask(a.last4)].filter(Boolean).join(' · ')}</span>
    </span>
  )
}

export default function TxDetailSheet({ tx, onClose, onEdit }) {
  const { accounts, removeTx, duplicateTx, updateTx, uploadReceipt } = useData()
  const last = useRef(null)
  if (tx) last.current = tx
  const t = tx || last.current
  const [viewer, setViewer] = useState(false)
  const [busy, setBusy] = useState(false)
  const fileRef = useRef(null)
  const rc = useReceipt(t?.receipt_path)

  const acct = (id) => accounts.find((a) => a.id === id)
  const from = t && acct(t.account_id), to = t && acct(t.to_account_id)
  const m = t && t.type === 'expense' ? catMeta(t.category) : null
  const when = t && new Date(t.occurred_at)

  const attach = async (e) => {
    const f = e.target.files?.[0]
    if (!f) return
    setBusy(true)
    try { await updateTx(t.id, { receipt_path: await uploadReceipt(f) }) } finally { setBusy(false); e.target.value = '' }
  }
  const dropReceipt = async () => {
    if (!window.confirm('Remove this receipt?')) return
    const p = t.receipt_path
    await updateTx(t.id, { receipt_path: null })
    deleteReceipt(p)
  }
  const del = async () => {
    if (!window.confirm(`Delete this ${inr(t.amount)} transaction?`)) return
    await removeTx(t.id); deleteReceipt(t.receipt_path); onClose()
  }

  return (
    <>
      <Sheet open={Boolean(tx)} onClose={onClose} title={t ? TITLE[t.type] : ''}>
        {t && (
          <>
            <div className="text-center pb-4">
              <p className={`font-display text-5xl font-semibold tabular-nums ${t.type === 'income' ? 'text-good' : ''}`}>{t.type === 'income' ? '+' : t.type === 'expense' ? '−' : ''}{inr(t.amount)}</p>
              <p className="text-sm mt-2">{t.type === 'transfer' ? 'Transfer between your accounts' : t.merchant || t.source || t.category}</p>
              <p className="text-xs text-mute mt-1">{when.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })} · {when.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })}</p>
            </div>

            <div className="bg-raised rounded-2xl px-4 divide-y divide-fg/5">
              {m && <Line label="Category"><span className="inline-flex items-center gap-1.5"><m.icon size={14} style={{ color: m.color }} />{t.category}{t.subcategory ? ` · ${t.subcategory}` : ''}</span></Line>}
              {t.type === 'income' && <Line label="Source">{t.source}</Line>}
              {t.type === 'transfer' ? (
                <>
                  <Line label="From"><Acct a={from} /></Line>
                  <Line label="To"><Acct a={to} /></Line>
                </>
              ) : (
                <>
                  <Line label={t.type === 'income' ? 'Received in' : 'Paid from'}><Acct a={from} /></Line>
                  <Line label="Paid via">{payLabel(t, from)}</Line>
                  <Line label="Payment method">{t.payment_method}</Line>
                </>
              )}
              {t.type !== 'transfer' && <Line label={t.type === 'income' ? 'Payer' : 'Merchant'}>{t.merchant}</Line>}
              <Line label="Location">{t.location}</Line>
              <Line label="Notes">{t.notes}</Line>
              <Line label="Repeats">{t.recurring_id ? 'Part of a recurring entry' : ''}</Line>
              <Line label="Added">{t.created_at ? new Date(t.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : ''}</Line>
            </div>

            {t.type !== 'transfer' && (
              <div className="mt-4">
                <p className="label">Receipt</p>
                {t.receipt_path ? (
                  <div className="flex items-center gap-3 bg-raised rounded-2xl p-3">
                    <button onClick={() => setViewer(true)} aria-label="View receipt" className="h-16 w-16 rounded-xl overflow-hidden bg-card grid place-items-center shrink-0 tap">
                      {rc.url && rc.type !== 'application/pdf' ? <img src={rc.url} alt="" className="h-full w-full object-cover" /> : <Paperclip size={20} className="text-mute" />}
                    </button>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm">{rc.error ? 'Receipt unavailable' : rc.type === 'application/pdf' ? 'PDF receipt' : 'Receipt photo'}</p>
                      <div className="flex gap-4 mt-1.5 text-xs"><button className="text-accent" onClick={() => setViewer(true)}>View</button><button className="text-bad" onClick={dropReceipt}>Remove</button></div>
                    </div>
                  </div>
                ) : (
                  <>
                    <input ref={fileRef} type="file" accept="image/*,application/pdf" hidden onChange={attach} />
                    <button className="btn-ghost w-full flex items-center justify-center gap-2 text-sm" onClick={() => fileRef.current?.click()} disabled={busy}><Paperclip size={16} />{busy ? 'Saving…' : 'Attach a receipt'}</button>
                  </>
                )}
              </div>
            )}

            <div className="grid grid-cols-3 gap-3 mt-5">
              <button className="btn-ghost flex flex-col items-center gap-1 !py-3 text-xs" onClick={() => onEdit(t)}><Pencil size={17} />Edit</button>
              <button className="btn-ghost flex flex-col items-center gap-1 !py-3 text-xs" onClick={async () => { await duplicateTx(t); onClose() }}><Copy size={17} />Duplicate</button>
              <button className="btn-danger flex flex-col items-center gap-1 !py-3 text-xs" onClick={del}><Trash2 size={17} />Delete</button>
            </div>
          </>
        )}
      </Sheet>
      {viewer && t?.receipt_path && <ReceiptViewer path={t.receipt_path} onClose={() => setViewer(false)} />}
    </>
  )
}
