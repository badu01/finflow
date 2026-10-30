import { useMemo, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import { useData } from '../context/DataContext'
import TxRow from '../components/TxRow'
import Segmented from '../components/Segmented'
import { catMeta } from '../lib/constants'
import { inr, short } from '../lib/format'
import { addDays, addMonths, byDay, daysIn, exp, key, newest, startOfDay, startOfMonth, startOfWeek, sum } from '../lib/stats'

function DayCell({ d, k, s, max, over, past, count, cats, sel, today, onSelect, onLong, tall }) {
  const t = useRef(null)
  const fired = useRef(false)
  const clear = () => clearTimeout(t.current)
  return (
    <button
      onPointerDown={() => { fired.current = false; t.current = setTimeout(() => { fired.current = true; navigator.vibrate?.(12); onLong() }, 520) }}
      onPointerUp={clear} onPointerLeave={clear} onPointerCancel={clear} onContextMenu={(e) => e.preventDefault()}
      onClick={() => { if (!fired.current) onSelect() }}
      aria-label={`${d}, spent ${inr(s)}${count ? `, ${count} transactions` : ''}`}
      className={`relative rounded-xl flex flex-col items-center justify-center select-none ${tall ? 'h-16' : 'aspect-square'} ${sel ? 'ring-2 ring-accent' : over ? 'ring-1 ring-bad/60' : ''}`}
      style={{ background: s ? `rgba(167,139,250,${0.1 + 0.5 * (s / max)})` : 'rgb(var(--raised))' }}>
      <span className={`text-sm leading-none ${today ? 'font-bold text-accent' : ''}`}>{d}</span>
      <span className="flex gap-0.5 h-1.5 items-center mt-1">
        {cats.slice(0, 3).map((c, i) => <span key={i} className="h-1 w-1 rounded-full" style={{ background: catMeta(c).color }} />)}
        {!count && past && <span className="h-1 w-2 rounded-full bg-good/70" />}
      </span>
      <span className="text-[9px] text-mute leading-none mt-0.5 h-2">{s > 0 ? short(s) : ''}</span>
    </button>
  )
}

export default function Calendar({ onOpen, onEdit, onAdd }) {
  const { transactions, removeTx, duplicateTx } = useData()
  const [view, setView] = useState('month')
  const [month, setMonth] = useState(startOfMonth(new Date()))
  const [week, setWeek] = useState(startOfWeek(new Date()))
  const [sel, setSel] = useState(key(new Date()))

  const days = useMemo(() => byDay(transactions), [transactions])
  const spendOf = (k) => sum(exp(days[k] || []))
  const avg = useMemo(() => { const t = startOfDay(new Date()); let n = 0; for (let i = 1; i <= 30; i++) n += sum(exp(days[key(addDays(t, -i))] || [])); return n / 30 }, [days])
  const todayD = startOfDay(new Date())
  const todayK = key(todayD)

  const cells = view === 'month'
    ? [...Array((month.getDay() + 6) % 7).fill(null), ...Array.from({ length: daysIn(month) }, (_, i) => new Date(month.getFullYear(), month.getMonth(), i + 1))]
    : Array.from({ length: 7 }, (_, i) => addDays(week, i))
  const keys = cells.filter(Boolean).map(key)
  const max = Math.max(1, ...keys.map(spendOf))
  const total = keys.reduce((s, k) => s + spendOf(k), 0)
  const step = (n) => (view === 'month' ? setMonth(addMonths(month, n)) : setWeek(addDays(week, n * 7)))
  const title = view === 'month' ? month.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }) : `${week.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} – ${addDays(week, 6).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`
  const selList = [...(days[sel] || [])].sort(newest)
  const atNow = (k) => { const n = new Date(); const d = new Date(k + 'T00:00'); d.setHours(n.getHours(), n.getMinutes()); return d.toISOString() }

  return (
    <div className="px-5 pt-[max(1.5rem,env(safe-area-inset-top))] pb-8">
      <h1 className="font-display text-4xl font-semibold mb-4">Calendar</h1>
      <Segmented options={[['month', 'Month'], ['week', 'Week']]} value={view} onChange={setView} />

      <div className="flex items-center justify-between my-4">
        <button aria-label="Previous" className="p-2 rounded-full bg-raised" onClick={() => step(-1)}><ChevronLeft size={18} /></button>
        <div className="text-center">
          <p className="font-display text-2xl font-semibold">{title}</p>
          <p className="text-xs text-mute">{inr(total)} spent</p>
        </div>
        <button aria-label="Next" className="p-2 rounded-full bg-raised" onClick={() => step(1)}><ChevronRight size={18} /></button>
      </div>

      <div className="card p-3">
        <div className="grid grid-cols-7 text-center text-[11px] text-mute mb-2">{['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => <span key={i}>{d}</span>)}</div>
        <motion.div key={view + key(view === 'month' ? month : week)} initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }}
          drag="x" dragConstraints={{ left: 0, right: 0 }} dragElastic={0.25}
          onDragEnd={(_, i) => { if (i.offset.x < -60) step(1); else if (i.offset.x > 60) step(-1) }}
          className="grid grid-cols-7 gap-1.5">
          {cells.map((d, i) => {
            if (!d) return <span key={i} />
            const k = key(d)
            const list = days[k] || []
            const s = spendOf(k)
            return <DayCell key={k} d={d.getDate()} k={k} s={s} max={max} over={avg > 0 && s > avg * 1.6} past={d < todayD} count={list.length}
              cats={[...new Set(exp(list).map((t) => t.category))]} sel={k === sel} today={k === todayK} tall={view === 'week'}
              onSelect={() => setSel(k)} onLong={() => onAdd('expense', { occurred_at: atNow(k) })} />
          })}
        </motion.div>
      </div>
      <p className="text-[11px] text-mute mt-3 text-center">Swipe to change {view}. Press and hold a day to add a transaction.</p>
      <div className="flex items-center justify-center gap-4 text-[11px] text-mute mt-2">
        <span className="flex items-center gap-1.5"><span className="h-1 w-3 rounded-full bg-good/70" />No spend</span>
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded" style={{ background: 'rgba(167,139,250,.55)' }} />Heavier</span>
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded ring-1 ring-bad/60" />Over usual</span>
      </div>

      <section className="mt-5">
        <div className="flex items-center justify-between mb-1">
          <div>
            <h2 className="font-display text-2xl font-semibold">{new Date(sel + 'T12:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'long' })}</h2>
            <p className="text-sm text-mute">{inr(spendOf(sel))} spent</p>
          </div>
          <button onClick={() => onAdd('expense', { occurred_at: atNow(sel) })} className="chip flex items-center gap-1.5"><Plus size={14} />Add</button>
        </div>
        {selList.length === 0 ? <p className="text-sm text-mute py-6">Nothing on this day.</p> : selList.map((t) => (
          <TxRow key={t.id} tx={t} onOpen={onOpen} onEdit={onEdit} onDuplicate={duplicateTx} onDelete={(x) => window.confirm(`Delete this ${inr(x.amount)} transaction?`) && removeTx(x.id)} />
        ))}
      </section>
    </div>
  )
}
