import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useData } from '../context/DataContext'
import Segmented from '../components/Segmented'
import { catMeta } from '../lib/constants'
import { inr, short } from '../lib/format'
import { useChart } from '../lib/theme'
import { monthFlow, weekdayWeekend } from '../lib/insights'
import { addDays, addMonths, between, byCategory, exp, inc, key, startOfDay, startOfMonth, startOfWeek, sum } from '../lib/stats'

const Panel = ({ title, children, h = 'h-48' }) => (
  <motion.section initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-40px' }} className="card p-5">
    <h2 className="text-sm text-mute mb-3">{title}</h2>
    <div className={h}>{children}</div>
  </motion.section>
)
const Empty = () => <p className="h-full grid place-items-center text-sm text-mute">Nothing in this range.</p>

export default function Analytics() {
  const { transactions } = useData()
  const ch = useChart()
  const now = new Date()
  const [range, setRange] = useState('Month')
  const [cFrom, setCFrom] = useState(key(addDays(now, -30)))
  const [cTo, setCTo] = useState(key(now))

  const r = useMemo(() => {
    const n = new Date()
    let from, to, monthly = false
    if (range === 'Week') { from = startOfWeek(n); to = addDays(from, 7) }
    else if (range === 'Month') { from = startOfMonth(n); to = addMonths(n, 1) }
    else if (range === 'Year') { from = new Date(n.getFullYear(), 0, 1); to = new Date(n.getFullYear() + 1, 0, 1); monthly = true }
    else { from = new Date(cFrom + 'T00:00'); to = addDays(new Date(cTo + 'T00:00'), 1); monthly = (to - from) / 864e5 > 93 }
    if (!(to > from)) to = addDays(from, 1)
    const tx = transactions.filter((t) => between(t, from, to))
    const buckets = []
    if (monthly) {
      for (let d = new Date(from.getFullYear(), from.getMonth(), 1); d < to; d = addMonths(d, 1)) {
        const l = tx.filter((t) => between(t, d, addMonths(d, 1)))
        buckets.push({ label: d.toLocaleDateString('en-IN', { month: 'short' }), expense: sum(exp(l)), income: sum(inc(l)) })
      }
    } else {
      for (let d = from; d < to; d = addDays(d, 1)) {
        const l = tx.filter((t) => between(t, d, addDays(d, 1)))
        buckets.push({ label: range === 'Week' ? d.toLocaleDateString('en-IN', { weekday: 'short' }) : String(d.getDate()), expense: sum(exp(l)), income: sum(inc(l)) })
      }
    }
    let run = 0
    const cash = buckets.map((b) => ({ label: b.label, net: (run += b.income - b.expense) }))
    const cats = byCategory(tx)
    const spent = sum(exp(tx)), earned = sum(inc(tx))
    const elapsed = Math.max(1, Math.round((Math.min(to, addDays(startOfDay(n), 1)) - from) / 864e5))
    return { from, to, tx, buckets, cash, cats, spent, earned, avgDaily: spent / elapsed, ww: weekdayWeekend(transactions, from, to) }
  }, [transactions, range, cFrom, cTo])

  const trend = useMemo(() => Array.from({ length: 6 }, (_, i) => {
    const d = addMonths(new Date(), i - 5)
    const f = monthFlow(transactions, d)
    return { label: d.toLocaleDateString('en-IN', { month: 'short' }), expense: f.expense, saved: f.income - f.expense }
  }), [transactions])

  const thisM = trend[5].expense, lastM = trend[4].expense
  const mom = lastM ? Math.round(((thisM - lastM) / lastM) * 100) : null
  const wkDiff = r.ww.weekday ? Math.round(((r.ww.weekend - r.ww.weekday) / r.ww.weekday) * 100) : null
  const top = r.cats[0]

  return (
    <div className="px-5 pt-[max(1.5rem,env(safe-area-inset-top))] pb-8 space-y-4">
      <h1 className="font-display text-4xl font-semibold">Analytics</h1>
      <Segmented options={['Week', 'Month', 'Year', 'Custom']} value={range} onChange={setRange} />
      {range === 'Custom' && (
        <div className="grid grid-cols-2 gap-3">
          <input aria-label="From" type="date" className="field" value={cFrom} max={cTo} onChange={(e) => setCFrom(e.target.value)} />
          <input aria-label="To" type="date" className="field" value={cTo} min={cFrom} onChange={(e) => setCTo(e.target.value)} />
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div className="card p-4"><p className="text-xs text-mute">Spent</p><p className="font-display text-3xl font-semibold">{inr(r.spent)}</p></div>
        <div className="card p-4"><p className="text-xs text-mute">Earned</p><p className="font-display text-3xl font-semibold text-good">{inr(r.earned)}</p></div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="card p-4"><p className="text-xs text-mute">Highest category</p><p className="font-display text-2xl font-semibold truncate" style={top ? { color: catMeta(top.name).color } : undefined}>{top ? top.name : '—'}</p><p className="text-xs text-mute">{top ? inr(top.value) : ''}</p></div>
        <div className="card p-4"><p className="text-xs text-mute">Average per day</p><p className="font-display text-2xl font-semibold">{inr(r.avgDaily)}</p></div>
        <div className="card p-4"><p className="text-xs text-mute">Weekend vs weekday</p><p className="font-display text-2xl font-semibold">{wkDiff === null ? '—' : `${wkDiff >= 0 ? '+' : ''}${wkDiff}%`}</p><p className="text-xs text-mute">{inr(r.ww.weekend)} vs {inr(r.ww.weekday)} a day</p></div>
        <div className="card p-4"><p className="text-xs text-mute">Vs last month</p><p className={`font-display text-2xl font-semibold ${mom > 0 ? 'text-warn' : 'text-good'}`}>{mom === null ? '—' : `${mom >= 0 ? '+' : ''}${mom}%`}</p><p className="text-xs text-mute">{inr(thisM)} vs {inr(lastM)}</p></div>
      </div>

      <Panel title="Where it went" h="h-56">
        {r.cats.length === 0 ? <Empty /> : (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={r.cats} dataKey="value" nameKey="name" innerRadius={58} outerRadius={88} paddingAngle={3} stroke="none" animationDuration={900}>
                {r.cats.map((c) => <Cell key={c.name} fill={catMeta(c.name).color} />)}
              </Pie>
              <Tooltip {...ch.tip} formatter={(v, n) => [inr(v), n]} />
            </PieChart>
          </ResponsiveContainer>
        )}
      </Panel>

      <Panel title="Income vs expense">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={r.buckets} margin={{ left: -18, right: 4 }}>
            <CartesianGrid vertical={false} stroke={ch.grid} />
            <XAxis dataKey="label" {...ch.axis} interval="preserveStartEnd" />
            <YAxis {...ch.axis} tickFormatter={short} />
            <Tooltip {...ch.tip} formatter={(v) => inr(v)} />
            <Bar dataKey="income" fill="#6EE7B7" radius={[6, 6, 0, 0]} />
            <Bar dataKey="expense" fill="#A78BFA" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </Panel>

      <Panel title="Cash flow (running net)">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={r.cash} margin={{ left: -18, right: 8 }}>
            <defs><linearGradient id="cf" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#A78BFA" stopOpacity={0.4} /><stop offset="100%" stopColor="#A78BFA" stopOpacity={0} /></linearGradient></defs>
            <CartesianGrid vertical={false} stroke={ch.grid} />
            <XAxis dataKey="label" {...ch.axis} interval="preserveStartEnd" />
            <YAxis {...ch.axis} tickFormatter={short} />
            <Tooltip {...ch.tip} formatter={(v) => [inr(v), 'Net']} />
            <Area type="monotone" dataKey="net" stroke="#A78BFA" strokeWidth={2.5} fill="url(#cf)" animationDuration={1000} />
          </AreaChart>
        </ResponsiveContainer>
      </Panel>

      <Panel title="Daily spending">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={r.buckets} margin={{ left: -18, right: 8 }}>
            <CartesianGrid vertical={false} stroke={ch.grid} />
            <XAxis dataKey="label" {...ch.axis} interval="preserveStartEnd" />
            <YAxis {...ch.axis} tickFormatter={short} />
            <Tooltip {...ch.tip} formatter={(v) => [inr(v), 'Spent']} />
            <Line type="monotone" dataKey="expense" stroke="#A78BFA" strokeWidth={2.5} dot={false} animationDuration={1000} />
          </LineChart>
        </ResponsiveContainer>
      </Panel>

      <Panel title="Monthly trend · last 6 months">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={trend} margin={{ left: -18, right: 4 }}>
            <XAxis dataKey="label" {...ch.axis} />
            <YAxis {...ch.axis} tickFormatter={short} />
            <Tooltip {...ch.tip} formatter={(v) => [inr(v), 'Spent']} />
            <Bar dataKey="expense" fill="#A78BFA" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </Panel>

      <Panel title="Savings trend · income minus spend">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={trend} margin={{ left: -18, right: 4 }}>
            <XAxis dataKey="label" {...ch.axis} />
            <YAxis {...ch.axis} tickFormatter={short} />
            <Tooltip {...ch.tip} formatter={(v) => [inr(v), 'Saved']} />
            <Bar dataKey="saved" radius={[8, 8, 0, 0]}>{trend.map((t, i) => <Cell key={i} fill={t.saved >= 0 ? '#6EE7B7' : '#FB7185'} />)}</Bar>
          </BarChart>
        </ResponsiveContainer>
      </Panel>

      <section className="card p-5">
        <h2 className="text-sm text-mute mb-3">Category breakdown</h2>
        {r.cats.length === 0 ? <p className="text-sm text-mute">No expenses in this range.</p> : (
          <div className="space-y-4">
            {r.cats.map((c) => (
              <div key={c.name}>
                <div className="flex justify-between text-sm mb-1.5"><span>{c.name}</span><span className="tabular-nums">{inr(c.value)} <span className="text-mute text-xs">{Math.round((c.value / r.spent) * 100)}%</span></span></div>
                <div className="h-1.5 rounded-full bg-raised overflow-hidden"><motion.div className="h-full rounded-full" style={{ background: catMeta(c.name).color }} initial={{ width: 0 }} animate={{ width: `${(c.value / r.cats[0].value) * 100}%` }} transition={{ duration: 0.8 }} /></div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
