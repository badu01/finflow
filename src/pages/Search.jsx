import { useMemo, useState } from 'react'
import { Search as SearchIcon } from 'lucide-react'
import Screen from '../components/Screen'
import TxRow from '../components/TxRow'
import { useData } from '../context/DataContext'
import { ACCOUNT_KINDS } from '../lib/constants'
import { inr } from '../lib/format'
import { newest } from '../lib/stats'

export default function Search({ onBack, go, onOpen }) {
  const { transactions, accounts, bills, goals } = useData()
  const [q, setQ] = useState('')
  const s = q.trim().toLowerCase()
  const has = (...v) => v.some((x) => x && String(x).toLowerCase().includes(s))
  const nm = (id) => accounts.find((a) => a.id === id)?.nickname

  const res = useMemo(() => !s ? null : {
    tx: transactions.filter((t) => has(t.merchant, t.notes, t.category, t.subcategory, t.source, t.location, t.payment_method, nm(t.account_id), t.amount)).sort(newest).slice(0, 25),
    acc: accounts.filter((a) => has(a.nickname, a.bank_name, a.last4, a.kind)),
    bills: bills.filter((b) => has(b.name, b.kind, b.category)),
    goals: goals.filter((g) => has(g.name))
  }, [s, transactions, accounts, bills, goals])

  const none = res && !res.tx.length && !res.acc.length && !res.bills.length && !res.goals.length
  const H = ({ children }) => <h2 className="text-xs text-mute mt-5 mb-1">{children}</h2>

  return (
    <Screen title="Search" onBack={onBack}>
      <div className="relative">
        <SearchIcon size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-mute" />
        <input autoFocus aria-label="Search everything" className="field pl-11" placeholder="Transactions, accounts, bills, goals" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      {!res && <p className="text-sm text-mute text-center py-12">Search by merchant, note, amount, card, bill name or goal.</p>}
      {none && <p className="text-sm text-mute text-center py-12">Nothing found for "{q}".</p>}
      {res?.acc.length > 0 && <><H>Accounts and cards</H>{res.acc.map((a) => { const K = ACCOUNT_KINDS[a.kind]; return <button key={a.id} onClick={() => go('wallet')} className="w-full flex items-center gap-3 py-3 text-left"><span className="h-10 w-10 rounded-2xl bg-accent/15 text-accent grid place-items-center"><K.icon size={17} /></span><span className="text-sm">{a.nickname}<span className="block text-xs text-mute">{K.label}{a.last4 ? ` · ••${a.last4}` : ''}</span></span></button> })}</>}
      {res?.bills.length > 0 && <><H>Bills</H>{res.bills.map((b) => <button key={b.id} onClick={() => go('bills')} className="w-full flex justify-between py-3 text-sm"><span>{b.name}<span className="block text-xs text-mute capitalize">{b.kind} · {b.cycle}</span></span><span className="tabular-nums">{inr(b.amount)}</span></button>)}</>}
      {res?.goals.length > 0 && <><H>Goals</H>{res.goals.map((g) => <button key={g.id} onClick={() => go('goals')} className="w-full flex justify-between py-3 text-sm"><span>{g.name}</span><span className="tabular-nums text-mute">{inr(g.saved_amount)} / {inr(g.target_amount)}</span></button>)}</>}
      {res?.tx.length > 0 && <><H>Transactions</H>{res.tx.map((t) => <button key={t.id} className="w-full text-left" onClick={() => onOpen(t)}><TxRow tx={t} swipe={false} /></button>)}</>}
    </Screen>
  )
}
