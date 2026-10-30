import { useMemo, useState } from 'react'
import { Plus, RotateCcw } from 'lucide-react'
import Screen from '../components/Screen'
import BudgetSheet from '../components/BudgetSheet'
import IconBtn from '../components/IconBtn'
import { useData } from '../context/DataContext'
import { budgetRows, dailyBudget } from '../lib/budget'
import { catMeta } from '../lib/constants'
import { inr } from '../lib/format'

export default function Budgets({ onBack }) {
  const { budgets, transactions } = useData()
  const [sheet, setSheet] = useState({ open: false, cat: 'all' })
  const rows = useMemo(() => budgetRows(budgets, transactions), [budgets, transactions])
  const daily = useMemo(() => dailyBudget(budgets, transactions), [budgets, transactions])
  const open = (cat) => setSheet({ open: true, cat })

  return (
    <Screen title="Budgets" onBack={onBack} right={<IconBtn icon={Plus} label="Add budget" onClick={() => open('all')} solid />}>
      <button onClick={() => open('daily')} className="card w-full p-5 text-left tap mb-3">
        <div className="flex items-baseline justify-between">
          <p className="text-sm font-medium">Daily budget</p>
          <p className="text-xs text-mute">{daily ? (daily.mode === 'custom' ? 'Set by you · tap to change' : 'Monthly ÷ days · tap to set your own') : 'Tap to set'}</p>
        </div>
        {daily ? (
          <>
            <p className="font-display text-3xl font-semibold tabular-nums mt-1">{inr(daily.amount)}<span className="text-sm text-mute font-sans"> a day</span></p>
            <div className="mt-3 h-2 rounded-full bg-raised overflow-hidden"><div className="h-full rounded-full transition-[width] duration-700" style={{ width: `${Math.min(1, daily.pct) * 100}%`, background: daily.pct >= 1 ? 'rgb(var(--bad))' : 'rgb(var(--accent))' }} /></div>
            <p className={`text-xs mt-2 ${daily.left < 0 ? 'text-bad' : 'text-mute'}`}>{inr(daily.today)} spent today · {daily.left >= 0 ? `${inr(daily.left)} left` : `over by ${inr(-daily.left)}`}</p>
          </>
        ) : <p className="text-xs text-mute mt-1">Set a monthly budget below, or a fixed amount per day.</p>}
      </button>
      {rows.length === 0 && <p className="text-sm text-mute py-10 text-center">No budgets yet. Start with one for the whole month.</p>}
      <div className="space-y-3">
        {rows.map((b) => {
          const color = b.pct >= 1 ? 'rgb(var(--bad))' : b.pct >= 0.75 ? 'rgb(var(--warn))' : b.category === 'all' ? 'rgb(var(--accent))' : catMeta(b.category).color
          return (
            <button key={b.id || b.category} onClick={() => open(b.category)} className="card w-full p-5 text-left tap">
              <div className="flex items-baseline justify-between">
                <p className="text-sm font-medium">{b.category === 'all' ? 'Whole month' : b.category}</p>
                <p className="text-xs text-mute tabular-nums">{inr(b.spent)} / {inr(b.limit)}</p>
              </div>
              <div className="relative mt-3 h-2 rounded-full bg-raised overflow-hidden">
                <div className="h-full rounded-full transition-[width] duration-700" style={{ width: `${Math.min(1, b.pct) * 100}%`, background: color }} />
                {[0.5, 0.75, 0.9].map((m) => <span key={m} className="absolute top-0 h-full w-px bg-ink/70" style={{ left: `${m * 100}%` }} />)}
              </div>
              <div className="flex justify-between text-xs mt-2">
                <span className={b.pct >= 1 ? 'text-bad' : 'text-mute'}>{b.pct >= 1 ? `Over by ${inr(b.spent - b.limit)}` : `${inr(b.limit - b.spent)} left`}</span>
                <span className="text-mute flex items-center gap-1">{b.rollover && <><RotateCcw size={11} />rollover{b.carry > 0 ? ` +${inr(b.carry)}` : ''} · </>}{Math.round(b.pct * 100)}%</span>
              </div>
            </button>
          )
        })}
      </div>
      <BudgetSheet open={sheet.open} initialCategory={sheet.cat} onClose={() => setSheet((s) => ({ ...s, open: false }))} />
    </Screen>
  )
}
