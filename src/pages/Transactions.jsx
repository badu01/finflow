import { useMemo, useState } from 'react'
import { Plus, Search, SlidersHorizontal, X } from 'lucide-react'
import { useData } from '../context/DataContext'
import TxRow from '../components/TxRow'
import IconBtn from '../components/IconBtn'
import Segmented from '../components/Segmented'
import FilterSheet, { PERIODS } from '../components/FilterSheet'
import { dayLabel, inr } from '../lib/format'
import { addDays, addMonths, exp, inc, key, newest, startOfDay, startOfMonth, startOfWeek, sum } from '../lib/stats'

const initial = () => ({ period: 'all', from: key(addDays(new Date(), -7)), to: key(new Date()), cat: 'all', acct: 'all', sort: 'new' })

export default function Transactions({ onOpen, onEdit, onAdd }) {
  const { transactions, accounts, removeTx, duplicateTx } = useData()
  const [q, setQ] = useState('')
  const [type, setType] = useState('all')
  const [f, setF] = useState(initial())
  const [sheet, setSheet] = useState(false)
  const set = (k, v) => setF((p) => ({ ...p, [k]: v }))

  const list = useMemo(() => {
    const now = new Date()
    let a = null, b = null
    if (f.period === 'today') { a = startOfDay(now); b = addDays(a, 1) }
    else if (f.period === 'week') { a = startOfWeek(now); b = addDays(a, 7) }
    else if (f.period === 'month') { a = startOfMonth(now); b = addMonths(now, 1) }
    else if (f.period === 'custom') { a = new Date(f.from + 'T00:00'); b = addDays(new Date(f.to + 'T00:00'), 1) }
    const s = q.trim().toLowerCase()
    const nm = (id) => accounts.find((x) => x.id === id)?.nickname
    const l = transactions.filter((t) => {
      const d = new Date(t.occurred_at)
      return (!a || (d >= a && d < b)) && (type === 'all' || t.type === type) && (f.cat === 'all' || t.category === f.cat) &&
        (f.acct === 'all' || t.account_id === f.acct || t.to_account_id === f.acct) &&
        (!s || [t.merchant, t.notes, t.category, t.subcategory, t.source, t.location, t.payment_method, nm(t.account_id), String(t.amount)].some((x) => x && String(x).toLowerCase().includes(s)))
    })
    return [...l].sort(f.sort === 'old' ? (x, y) => -newest(x, y) : f.sort === 'high' ? (x, y) => y.amount - x.amount : newest)
  }, [transactions, accounts, q, type, f])

  const groups = useMemo(() => {
    if (f.sort === 'high') return [['Largest first', list]]
    const m = new Map()
    list.forEach((t) => { const k = key(t.occurred_at); if (!m.has(k)) m.set(k, []); m.get(k).push(t) })
    return [...m.entries()].map(([k, v]) => [dayLabel(k + 'T12:00'), v])
  }, [list, f.sort])

  const pills = []
  if (f.period !== 'all') pills.push(['period', f.period === 'custom' ? `${f.from} → ${f.to}` : PERIODS.find((p) => p[0] === f.period)[1]])
  if (f.cat !== 'all') pills.push(['cat', f.cat])
  if (f.acct !== 'all') pills.push(['acct', accounts.find((a) => a.id === f.acct)?.nickname || 'Account'])
  const count = pills.length + (f.sort !== 'new' ? 1 : 0)
  const clear = (k) => set(k, k === 'period' ? 'all' : 'all')
  const del = (t) => { if (window.confirm(`Delete this ${inr(t.amount)} transaction?`)) removeTx(t.id) }

  return (
    <div className="px-5 pt-[max(1.5rem,env(safe-area-inset-top))] pb-8">
      <div className="flex items-center justify-between mb-4">
        <h1 className="font-display text-4xl font-semibold">Activity</h1>
        <IconBtn icon={Plus} label="Add transaction" onClick={() => onAdd('expense')} solid />
      </div>

      <div className="flex gap-2 mb-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-mute" />
          <input aria-label="Search transactions" className="field pl-11" placeholder="Search" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <button onClick={() => setSheet(true)} aria-label="Filters" className="relative h-[50px] w-[50px] rounded-2xl bg-raised grid place-items-center tap shrink-0">
          <SlidersHorizontal size={18} />
          {count > 0 && <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-accent text-onaccent text-[10px] font-semibold grid place-items-center">{count}</span>}
        </button>
      </div>

      <Segmented options={[['all', 'All'], ['expense', 'Expenses'], ['income', 'Income'], ['transfer', 'Transfers']]} value={type} onChange={setType} />

      {pills.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 mt-3">
          {pills.map(([k, label]) => (
            <button key={k} onClick={() => clear(k)} aria-label={`Remove filter ${label}`} className="flex items-center gap-1.5 rounded-full bg-accent/15 text-accent text-xs pl-3 pr-2 py-1.5">{label}<X size={13} /></button>
          ))}
          <button onClick={() => setF(initial())} className="text-xs text-mute ml-1">Clear all</button>
        </div>
      )}

      <p className="text-xs text-mute my-4">{list.length} transactions · {inr(sum(exp(list)))} out · {inr(sum(inc(list)))} in</p>

      {list.length === 0 && <p className="text-sm text-mute py-12 text-center">No matches. Clear a filter or try another search.</p>}
      {groups.map(([label, rows]) => (
        <section key={label} className="mb-4">
          <h2 className="text-xs text-mute mb-1">{label}</h2>
          {rows.map((t) => <TxRow key={t.id} tx={t} onOpen={onOpen} onEdit={onEdit} onDuplicate={duplicateTx} onDelete={del} />)}
        </section>
      ))}
      <p className="text-[11px] text-mute text-center pt-2">Tap for details. Swipe left to edit, duplicate or delete.</p>

      <FilterSheet open={sheet} onClose={() => setSheet(false)} f={f} set={set} reset={() => setF(initial())} count={count} />
    </div>
  )
}
