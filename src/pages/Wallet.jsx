import { useMemo, useState } from 'react'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import Sheet from '../components/Sheet'
import AccountSheet from '../components/AccountSheet'
import TxRow from '../components/TxRow'
import IconBtn from '../components/IconBtn'
import { useData } from '../context/DataContext'
import { ACCOUNT_KINDS, themeFor } from '../lib/constants'
import { inr, mask } from '../lib/format'
import { accountStats, walletTotals } from '../lib/wallet'
import { newest } from '../lib/stats'

function CardFace({ a, s, i, onClick }) {
  const credit = a.kind === 'credit'
  const util = credit && a.credit_limit ? Math.min(1, Math.max(0, s.outstanding) / a.credit_limit) : 0
  return (
    <button onClick={onClick} className="shrink-0 w-[84%] snap-center rounded-card p-5 text-left text-white shadow-soft tap relative overflow-hidden" style={{ background: themeFor(a, i).bg, minHeight: 176 }}>
      <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/5" />
      <div className="flex items-start justify-between relative">
        <div><p className="text-xs opacity-70">{a.bank_name || ACCOUNT_KINDS[a.kind].label}</p><p className="font-display text-2xl font-semibold leading-tight">{a.nickname}</p></div>
        <span className="text-[10px] uppercase tracking-widest opacity-70">{credit ? 'Credit' : 'Debit'}</span>
      </div>
      <p className="mt-6 tracking-[0.25em] text-sm opacity-90 relative">•••• •••• •••• {a.last4}</p>
      {credit ? (
        <div className="mt-4 relative">
          <div className="h-1.5 rounded-full bg-white/15 overflow-hidden"><div className="h-full rounded-full" style={{ width: `${util * 100}%`, background: util > 0.75 ? '#FB7185' : util > 0.3 ? '#FBBF24' : '#6EE7B7' }} /></div>
          <div className="flex justify-between text-xs mt-2 opacity-90"><span>{inr(Math.max(0, s.outstanding))} used</span><span>{inr(Math.max(0, a.credit_limit - s.outstanding))} left</span></div>
          {a.due_day && <p className="text-[11px] opacity-70 mt-1">Bill on {a.billing_day || '—'}th · due {a.due_day}th</p>}
        </div>
      ) : (
        <p className="mt-4 text-xs opacity-80 relative">{a.linked_account_id ? 'Linked account' : 'No linked account'} · {inr(s.spent)} spent this month</p>
      )}
    </button>
  )
}

export default function Wallet() {
  const { accounts, transactions, remove } = useData()
  const [form, setForm] = useState({ open: false, initial: null, kind: 'bank' })
  const [detail, setDetail] = useState(null)

  const stats = useMemo(() => accountStats(accounts, transactions), [accounts, transactions])
  const totals = useMemo(() => walletTotals(accounts, stats, transactions), [accounts, stats, transactions])
  const of = (...k) => accounts.filter((a) => k.includes(a.kind))
  const open = (a) => setDetail(a.id)
  const cur = accounts.find((a) => a.id === detail)
  const add = (kind) => setForm({ open: true, initial: null, kind })

  const Section = ({ title, kind, children, empty }) => (
    <section className="mb-6">
      <div className="flex items-center justify-between mb-2">
        <h2 className="font-display text-2xl font-semibold">{title}</h2>
        <button onClick={() => add(kind)} className="text-xs text-accent flex items-center gap-1"><Plus size={13} />Add</button>
      </div>
      {children || <button onClick={() => add(kind)} className="card w-full p-5 text-sm text-mute text-left tap">{empty}</button>}
    </section>
  )

  const listRows = (items) => items.length ? (
    <div className="card divide-y divide-fg/5">
      {items.map((a) => {
        const K = ACCOUNT_KINDS[a.kind]
        return (
          <button key={a.id} onClick={() => open(a)} className="w-full flex items-center gap-3 p-4 text-left">
            <span className="h-10 w-10 rounded-2xl bg-accent/15 text-accent grid place-items-center"><K.icon size={18} /></span>
            <span className="flex-1 min-w-0"><span className="block text-sm font-medium truncate">{a.nickname}</span><span className="block text-xs text-mute truncate">{[a.bank_name, a.account_type].filter(Boolean).join(' · ') || K.label}</span></span>
            <span className="text-sm font-semibold tabular-nums">{inr(stats[a.id].balance)}</span>
          </button>
        )
      })}
    </div>
  ) : null

  const cards = (kind) => {
    const l = of(kind)
    return l.length ? <div className="flex gap-3 overflow-x-auto snap-x snap-mandatory -mx-5 px-5 pb-1">{l.map((a, i) => <CardFace key={a.id} a={a} s={stats[a.id]} i={i} onClick={() => open(a)} />)}</div> : null
  }

  return (
    <div className="px-5 pt-[max(1.5rem,env(safe-area-inset-top))] pb-8">
      <div className="flex items-center justify-between mb-4">
        <h1 className="font-display text-4xl font-semibold">Wallet</h1>
        <IconBtn icon={Plus} label="Add to wallet" onClick={() => add('bank')} solid />
      </div>

      <section className="card p-6 mb-6">
        <p className="text-sm text-mute">Total balance</p>
        <p className="font-display text-5xl font-semibold tabular-nums mt-1">{inr(totals.liquid)}</p>
        <div className="grid grid-cols-2 gap-4 mt-5">
          <div><p className="text-xs text-mute">Card dues</p><p className={`text-lg font-semibold tabular-nums ${totals.due ? 'text-warn' : ''}`}>{inr(totals.due)}</p></div>
          <div><p className="text-xs text-mute">Net of dues</p><p className="text-lg font-semibold tabular-nums">{inr(totals.net)}</p></div>
        </div>
      </section>

      <Section title="Bank accounts" kind="bank" empty="Add your savings or current account to see live balances.">{listRows(of('bank'))}</Section>
      <Section title="Credit cards" kind="credit" empty="Add a credit card to track limit, outstanding and due dates.">{cards('credit')}</Section>
      <Section title="Debit cards" kind="debit" empty="Add a debit card and link it to its bank account.">{cards('debit')}</Section>
      <Section title="Digital wallets and cash" kind="wallet" empty="Add Paytm, PhonePe, cash in hand and more.">{listRows(of('wallet', 'cash'))}</Section>

      <Sheet open={Boolean(cur)} onClose={() => setDetail(null)} title={cur?.nickname || ''}>
        {cur && (() => {
          const s = stats[cur.id]
          const credit = cur.kind === 'credit'
          const mine = transactions.filter((t) => t.account_id === cur.id || t.to_account_id === cur.id).sort(newest).slice(0, 8)
          return (
            <>
              <p className="text-xs text-mute">{[cur.bank_name, ACCOUNT_KINDS[cur.kind].label, mask(cur.last4)].filter(Boolean).join(' · ')}</p>
              {cur.kind !== 'debit' && <p className="font-display text-5xl font-semibold tabular-nums mt-2">{inr(credit ? s.outstanding : s.balance)}</p>}
              {credit && <p className="text-sm text-mute mt-1">outstanding of {inr(cur.credit_limit)} limit · {inr(cur.credit_limit - s.outstanding)} available</p>}
              {cur.kind === 'debit' && <p className="text-sm text-mute mt-2">{inr(s.spent)} spent this month · {s.count} transactions</p>}
              {!credit && cur.kind !== 'debit' && <p className="text-sm text-mute mt-1">{inr(s.spent)} spent this month</p>}
              <h3 className="font-display text-xl font-semibold mt-6 mb-1">Recent</h3>
              {mine.length === 0 ? <p className="text-sm text-mute py-4">No transactions yet. Pick this account when you add one.</p> : mine.map((t) => <TxRow key={t.id} tx={t} swipe={false} />)}
              <div className="grid grid-cols-2 gap-3 mt-5">
                <button className="btn-ghost flex items-center justify-center gap-2" onClick={() => { setForm({ open: true, initial: cur, kind: cur.kind }); setDetail(null) }}><Pencil size={16} />Edit</button>
                <button className="btn-danger flex items-center justify-center gap-2" onClick={async () => { if (window.confirm(`Remove ${cur.nickname}? Past transactions stay, just untagged.`)) { await remove('accounts', cur.id); setDetail(null) } }}><Trash2 size={16} />Remove</button>
              </div>
            </>
          )
        })()}
      </Sheet>
      <AccountSheet open={form.open} initial={form.initial} defaultKind={form.kind} onClose={() => setForm((f) => ({ ...f, open: false }))} />
    </div>
  )
}
