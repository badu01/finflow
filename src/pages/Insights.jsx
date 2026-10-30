import { useMemo } from 'react'
import { Award, Flame, Lock, Trophy } from 'lucide-react'
import Screen from '../components/Screen'
import Ring from '../components/Ring'
import { useData } from '../context/DataContext'
import { accountStats } from '../lib/wallet'
import { badges, challenges, healthScore, streaks } from '../lib/insights'
import { inr } from '../lib/format'

export default function Insights({ onBack }) {
  const data = useData()
  const m = useMemo(() => {
    const stats = accountStats(data.accounts, data.transactions)
    return { h: healthScore(data, stats), st: streaks(data), ch: challenges(data), bd: badges(data, stats) }
  }, [data.transactions, data.budgets, data.accounts, data.bills, data.goals])
  const color = m.h.score >= 80 ? 'rgb(var(--good))' : m.h.score >= 60 ? 'rgb(var(--accent))' : m.h.score >= 40 ? 'rgb(var(--warn))' : 'rgb(var(--bad))'

  return (
    <Screen title="Insights" onBack={onBack}>
      <section className="card p-6">
        <div className="flex items-center gap-5">
          <Ring value={m.h.score / 100} size={112} stroke={10} color={color}><div><p className="font-display text-4xl font-semibold leading-none">{m.h.score}</p><p className="text-[10px] text-mute mt-1">of 100</p></div></Ring>
          <div><p className="text-xs text-mute">Financial health</p><p className="font-display text-3xl font-semibold">{m.h.grade}</p><p className="text-xs text-mute mt-1">Savings, budgets, bills, credit and your safety net.</p></div>
        </div>
        <div className="mt-6 space-y-4">
          {m.h.parts.map((p) => (
            <div key={p.label}>
              <div className="flex justify-between text-sm mb-1.5"><span>{p.label}</span><span className="text-mute tabular-nums text-xs">{Math.round(p.v)} / {p.max}</span></div>
              <div className="h-1.5 rounded-full bg-raised overflow-hidden"><div className="h-full rounded-full bg-accent transition-[width] duration-700" style={{ width: `${(p.v / p.max) * 100}%` }} /></div>
              <p className="text-xs text-mute mt-1">{p.tip}</p>
            </div>
          ))}
        </div>
      </section>

      <h2 className="font-display text-2xl font-semibold mt-6 mb-2 flex items-center gap-2"><Flame size={20} className="text-warn" />Streaks</h2>
      <div className="grid grid-cols-3 gap-3">
        {[[m.st.under, 'days under daily limit'], [m.st.noSpend, 'no-spend days this month'], [m.st.saving, 'months saving']].map(([v, l]) => (
          <div key={l} className="card p-4 text-center"><p className="font-display text-4xl font-semibold">{v}</p><p className="text-[11px] text-mute leading-tight mt-1">{l}</p></div>
        ))}
      </div>
      {Number.isFinite(m.st.allowance) && <p className="text-xs text-mute mt-2">Daily limit is {inr(m.st.allowance)} (your monthly budget spread over the month).</p>}

      <h2 className="font-display text-2xl font-semibold mt-6 mb-2 flex items-center gap-2"><Trophy size={20} className="text-accent" />This month's challenges</h2>
      <div className="space-y-3">
        {m.ch.map((c) => {
          const p = Math.min(1, c.value / c.target)
          return (
            <div key={c.id} className="card p-4">
              <div className="flex justify-between text-sm"><span className={p >= 1 ? 'text-good' : ''}>{c.title}{p >= 1 && ' ✓'}</span><span className="text-mute text-xs tabular-nums">{c.value}{c.unit || ''} / {c.target}{c.unit || ''}</span></div>
              <div className="h-1.5 rounded-full bg-raised overflow-hidden mt-2.5"><div className="h-full rounded-full transition-[width] duration-700" style={{ width: `${p * 100}%`, background: p >= 1 ? 'rgb(var(--good))' : 'rgb(var(--accent))' }} /></div>
              <p className="text-xs text-mute mt-1.5">{c.hint}</p>
            </div>
          )
        })}
      </div>

      <h2 className="font-display text-2xl font-semibold mt-6 mb-2 flex items-center gap-2"><Award size={20} className="text-accent" />Badges</h2>
      <div className="grid grid-cols-3 gap-3">
        {m.bd.map((b) => (
          <div key={b.id} className={`card p-3 text-center ${b.earned ? '' : 'opacity-45'}`}>
            <div className={`mx-auto h-11 w-11 rounded-full grid place-items-center ${b.earned ? 'bg-accent/15 text-accent' : 'bg-raised text-mute'}`}>{b.earned ? <Award size={20} /> : <Lock size={16} />}</div>
            <p className="text-xs font-medium mt-2 leading-tight">{b.name}</p>
            <p className="text-[10px] text-mute mt-1 leading-tight">{b.desc}</p>
          </div>
        ))}
      </div>
    </Screen>
  )
}
