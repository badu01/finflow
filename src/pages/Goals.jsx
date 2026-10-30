import { useMemo, useState } from 'react'
import { Plus, ShieldCheck } from 'lucide-react'
import Screen from '../components/Screen'
import Ring from '../components/Ring'
import Sheet from '../components/Sheet'
import GoalSheet from '../components/GoalSheet'
import IconBtn from '../components/IconBtn'
import { useData } from '../context/DataContext'
import { avgMonthlyExpense } from '../lib/insights'
import { inr } from '../lib/format'
import { diffDays } from '../lib/stats'

export default function Goals({ onBack }) {
  const { goals, transactions, save } = useData()
  const [sheet, setSheet] = useState({ open: false, initial: null, type: 'goal' })
  const [topUp, setTopUp] = useState(null)
  const [amt, setAmt] = useState('')
  const monthly = useMemo(() => avgMonthlyExpense(transactions), [transactions])

  const ef = goals.find((g) => g.kind === 'emergency')
  const plain = goals.filter((g) => g.kind !== 'emergency' && !g.is_wishlist)
  const wish = goals.filter((g) => g.is_wishlist)
  const edit = (g) => setSheet({ open: true, initial: g, type: 'goal' })
  const need = (g) => {
    if (!g.target_date) return null
    const months = Math.max(1, Math.ceil(diffDays(new Date(g.target_date + 'T00:00'), new Date()) / 30))
    return Math.max(0, g.target_amount - g.saved_amount) / months
  }
  const add = async () => {
    const n = Number(amt)
    if (n > 0) await save('goals', { id: topUp.id, saved_amount: topUp.saved_amount + n })
    setTopUp(null); setAmt('')
  }

  const Card = ({ g }) => {
    const p = g.target_amount ? g.saved_amount / g.target_amount : 0
    const per = need(g)
    return (
      <div className="card p-4 flex items-center gap-4">
        <Ring value={p} size={64} stroke={7} color={p >= 1 ? 'rgb(var(--good))' : undefined}><span className="text-xs font-semibold">{Math.round(p * 100)}%</span></Ring>
        <button onClick={() => edit(g)} className="flex-1 min-w-0 text-left">
          <p className="text-sm font-medium truncate">{g.name}</p>
          <p className="text-xs text-mute tabular-nums">{inr(g.saved_amount)} of {inr(g.target_amount)}</p>
          {per !== null && p < 1 && <p className="text-[11px] text-accent mt-0.5">Save {inr(per)} a month to hit {new Date(g.target_date + 'T00:00').toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}</p>}
        </button>
        {p < 1 && <button className="chip chip-on !py-1.5 !text-xs" onClick={() => { setTopUp(g); setAmt('') }}>+ Add</button>}
      </div>
    )
  }

  return (
    <Screen title="Goals" onBack={onBack} right={<IconBtn icon={Plus} label="New goal" onClick={() => setSheet({ open: true, initial: null, type: 'goal' })} solid />}>
      {ef ? (
        <section className="card p-5 mb-6">
          <div className="flex items-center gap-2 text-sm text-mute mb-3"><ShieldCheck size={16} className="text-accent" />Emergency fund</div>
          <div className="flex items-center gap-5">
            <Ring value={ef.saved_amount / ef.target_amount} size={96}><div><p className="text-lg font-semibold">{Math.round((ef.saved_amount / ef.target_amount) * 100)}%</p></div></Ring>
            <div className="flex-1">
              <p className="font-display text-3xl font-semibold tabular-nums">{inr(ef.saved_amount)}</p>
              <p className="text-xs text-mute">of {inr(ef.target_amount)}</p>
              {monthly > 0 && <p className="text-sm mt-2">{(ef.saved_amount / monthly).toFixed(1)} months of spending covered</p>}
              <div className="flex gap-2 mt-3">
                <button className="chip chip-on !py-1.5 !text-xs" onClick={() => { setTopUp(ef); setAmt('') }}>+ Add</button>
                <button className="chip !py-1.5 !text-xs" onClick={() => edit(ef)}>Edit</button>
              </div>
            </div>
          </div>
        </section>
      ) : (
        <button onClick={() => setSheet({ open: true, initial: null, type: 'emergency' })} className="card w-full p-5 mb-6 text-left tap">
          <p className="text-sm font-medium flex items-center gap-2"><ShieldCheck size={16} className="text-accent" />Start an emergency fund</p>
          <p className="text-xs text-mute mt-1">Aim for six months of expenses{monthly ? ` (about ${inr(monthly * 6)} for you)` : ''}. It is the biggest single boost to your health score.</p>
        </button>
      )}

      <h2 className="font-display text-2xl font-semibold mb-2">Savings goals</h2>
      <div className="space-y-3 mb-6">{plain.length ? plain.map((g) => <Card key={g.id} g={g} />) : <p className="text-sm text-mute">No goals yet. A trip, a laptop, a down payment: name it and watch it fill.</p>}</div>

      <h2 className="font-display text-2xl font-semibold mb-2">Wishlist</h2>
      <div className="space-y-3">{wish.length ? wish.map((g) => <Card key={g.id} g={g} />) : <button className="text-sm text-accent" onClick={() => setSheet({ open: true, initial: null, type: 'wishlist' })}>Add something you are saving up to buy</button>}</div>

      <Sheet open={Boolean(topUp)} onClose={() => setTopUp(null)} title={topUp ? `Add to ${topUp.name}` : ''}>
        <label className="label" htmlFor="ta">Amount</label>
        <input id="ta" inputMode="decimal" className="field text-2xl font-display font-semibold" value={amt} onChange={(e) => setAmt(e.target.value.replace(/[^\d.]/g, ''))} />
        <div className="flex gap-2 mt-3">{[500, 1000, 5000].map((n) => <button key={n} className="chip" onClick={() => setAmt(String((Number(amt) || 0) + n))}>+{n}</button>)}</div>
        <button className="btn w-full mt-5" onClick={add}>Add to goal</button>
      </Sheet>
      <GoalSheet open={sheet.open} initial={sheet.initial} defaultType={sheet.type} onClose={() => setSheet((s) => ({ ...s, open: false }))} />
    </Screen>
  )
}
