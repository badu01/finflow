import { useMemo, useState } from 'react'
import { Plus, Pause, Play, Trash2, Zap } from 'lucide-react'
import Screen from '../components/Screen'
import Segmented from '../components/Segmented'
import Sheet from '../components/Sheet'
import BillSheet from '../components/BillSheet'
import AccountPicker from '../components/AccountPicker'
import IconBtn from '../components/IconBtn'
import { useData } from '../context/DataContext'
import { ACCOUNT_KINDS } from '../lib/constants'
import { dueLabel, inr } from '../lib/format'
import { accountStats } from '../lib/wallet'
import { monthlyCost, upcoming } from '../lib/bills'

export default function Bills({ onBack, onAdd }) {
  const { bills, accounts, transactions, recurring, payBill, save, remove } = useData()
  const [tab, setTab] = useState('upcoming')
  const [sheet, setSheet] = useState({ open: false, initial: null, kind: 'bill' })
  const [pay, setPay] = useState(null)
  const [payAcct, setPayAcct] = useState(null)
  const [busy, setBusy] = useState(false)

  const stats = useMemo(() => accountStats(accounts, transactions), [accounts, transactions])
  const list = useMemo(() => upcoming(bills, accounts, stats), [bills, accounts, stats])
  const in30 = list.filter((u) => u.days <= 30).reduce((n, u) => n + u.amount, 0)
  const subs = bills.filter((b) => b.kind === 'subscription' && b.active !== false)
  const monthly = bills.filter((b) => b.active !== false).reduce((n, b) => n + monthlyCost(b), 0)
  const subMonthly = subs.reduce((n, b) => n + monthlyCost(b), 0)
  const openNew = (kind = 'bill') => setSheet({ open: true, initial: null, kind })
  const acctName = (id) => accounts.find((a) => a.id === id)?.nickname

  const startPay = (u) => {
    if (u.src === 'card') return onAdd('transfer', { to_account_id: u.account.id, amount: Math.round(u.amount) })
    setPay(u.bill); setPayAcct(u.bill.account_id || null)
  }
  const confirmPay = async () => {
    setBusy(true)
    try {
      const a = accounts.find((x) => x.id === payAcct)
      await payBill(pay, payAcct, a ? ACCOUNT_KINDS[a.kind].method : 'UPI')
      setPay(null)
    } finally { setBusy(false) }
  }
  const chip = (u) => u.days < 0 ? 'bg-bad/15 text-bad' : u.days <= 3 ? 'bg-warn/15 text-warn' : 'bg-raised text-mute'

  return (
    <Screen title="Bills" onBack={onBack} right={<IconBtn icon={Plus} label="Add bill" onClick={() => openNew()} solid />}>
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="card p-4"><p className="text-xs text-mute">Due in 30 days</p><p className="font-display text-3xl font-semibold tabular-nums">{inr(in30)}</p></div>
        <div className="card p-4"><p className="text-xs text-mute">Monthly commitments</p><p className="font-display text-3xl font-semibold tabular-nums">{inr(monthly)}</p></div>
      </div>
      <Segmented options={[['upcoming', 'Upcoming'], ['subs', 'Subscriptions'], ['recurring', 'Recurring']]} value={tab} onChange={setTab} />

      {tab === 'upcoming' && (
        <section className="mt-4 space-y-3">
          {list.length === 0 && <p className="text-sm text-mute py-10 text-center">No bills yet. Tap + to add rent, EMIs, utilities or a subscription.</p>}
          {list.map((u) => (
            <div key={u.id} className="card p-4">
              <div className="flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{u.name}</p>
                  <p className="text-xs text-mute mt-0.5 capitalize">{u.kind === 'credit' ? 'Credit card due' : u.kind}{u.bill?.cycle && u.bill.cycle !== 'once' ? ` · ${u.bill.cycle}` : ''}{u.bill?.account_id ? ` · ${acctName(u.bill.account_id) || ''}` : ''}</p>
                </div>
                <div className="text-right"><p className="text-base font-semibold tabular-nums">{inr(u.amount)}</p><span className={`inline-block mt-1 text-[11px] px-2 py-0.5 rounded-full ${chip(u)}`}>{dueLabel(u.days)}</span></div>
              </div>
              <div className="flex items-center gap-2 mt-3">
                <p className="text-xs text-mute flex-1">{u.due.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}{u.bill?.autopay && <span className="ml-2 inline-flex items-center gap-1 text-accent"><Zap size={11} />autopay</span>}</p>
                {u.src === 'bill' && <button className="chip !py-1.5 !text-xs" onClick={() => setSheet({ open: true, initial: u.bill, kind: u.kind })}>Edit</button>}
                <button className="chip chip-on !py-1.5 !text-xs" onClick={() => startPay(u)}>{u.src === 'card' ? 'Pay bill' : 'Mark paid'}</button>
              </div>
            </div>
          ))}
        </section>
      )}

      {tab === 'subs' && (
        <section className="mt-4">
          <div className="card p-5 mb-3">
            <p className="text-xs text-mute">Subscriptions cost</p>
            <p className="font-display text-4xl font-semibold tabular-nums">{inr(subMonthly)}<span className="text-base text-mute font-sans"> / month</span></p>
            <p className="text-xs text-mute mt-1">{inr(subMonthly * 12)} a year across {subs.length} subscriptions</p>
          </div>
          {subs.length === 0 && <button className="card w-full p-5 text-sm text-mute text-left" onClick={() => openNew('subscription')}>No subscriptions tracked. Add Netflix, Spotify, iCloud…</button>}
          {subs.sort((a, b) => b.amount - a.amount).map((b) => (
            <button key={b.id} onClick={() => setSheet({ open: true, initial: b, kind: 'subscription' })} className="w-full flex items-center gap-3 py-3 text-left">
              <div className="flex-1 min-w-0"><p className="text-sm font-medium truncate">{b.name}</p><p className="text-xs text-mute">Next {new Date(b.next_due + 'T00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} · {b.cycle}</p></div>
              <p className="text-sm font-semibold tabular-nums">{inr(b.amount)}</p>
            </button>
          ))}
          <button className="btn-ghost w-full mt-3 flex items-center justify-center gap-2" onClick={() => openNew('subscription')}><Plus size={16} />Add subscription</button>
        </section>
      )}

      {tab === 'recurring' && (
        <section className="mt-4 space-y-3">
          <p className="text-xs text-mute">Created when you pick Repeat while adding a transaction. FinFlow posts them automatically when they fall due.</p>
          {recurring.length === 0 && <p className="text-sm text-mute py-8 text-center">Nothing recurring yet.</p>}
          {recurring.map((r) => (
            <div key={r.id} className={`card p-4 flex items-center gap-3 ${r.active ? '' : 'opacity-50'}`}>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{r.merchant || r.notes || r.category}</p>
                <p className="text-xs text-mute capitalize">{r.frequency} · next {new Date(r.next_run + 'T00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}{acctName(r.account_id) ? ` · ${acctName(r.account_id)}` : ''}</p>
              </div>
              <p className={`text-sm font-semibold tabular-nums ${r.type === 'income' ? 'text-good' : ''}`}>{r.type === 'income' ? '+' : '−'}{inr(r.amount)}</p>
              <button aria-label={r.active ? 'Pause' : 'Resume'} className="p-2 text-mute" onClick={() => save('recurring', { id: r.id, active: !r.active })}>{r.active ? <Pause size={16} /> : <Play size={16} />}</button>
              <button aria-label="Delete" className="p-2 text-bad" onClick={() => window.confirm('Stop this recurring entry?') && remove('recurring', r.id)}><Trash2 size={16} /></button>
            </div>
          ))}
        </section>
      )}

      <Sheet open={Boolean(pay)} onClose={() => setPay(null)} title="Mark as paid">
        {pay && (
          <>
            <p className="text-sm text-mute mb-4">{pay.name} · <b className="text-fg">{inr(pay.amount)}</b>. This logs an expense and moves the due date forward.</p>
            <span className="label">Paid from</span>
            <div className="mb-6"><AccountPicker value={payAcct} onChange={setPayAcct} /></div>
            <button className="btn w-full" disabled={busy} onClick={confirmPay}>{busy ? 'Saving…' : 'Confirm payment'}</button>
          </>
        )}
      </Sheet>
      <BillSheet open={sheet.open} initial={sheet.initial} defaultKind={sheet.kind} onClose={() => setSheet((s) => ({ ...s, open: false }))} />
    </Screen>
  )
}
