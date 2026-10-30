import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { ArrowDownLeft, ArrowUpRight, ArrowLeftRight, ReceiptText, Bell, Search, Plus, Target, PiggyBank, Sparkles, ChevronRight } from 'lucide-react'
import { LineChart, Line, ResponsiveContainer, XAxis, Tooltip } from 'recharts'
import { useData } from '../context/DataContext'
import { useAuth } from '../context/AuthContext'
import CountUp from '../components/CountUp'
import TxRow from '../components/TxRow'
import Ring from '../components/Ring'
import IconBtn from '../components/IconBtn'
import { inr, dueLabel } from '../lib/format'
import { ACCOUNT_KINDS, catMeta } from '../lib/constants'
import { accountStats, walletTotals } from '../lib/wallet'
import { upcoming } from '../lib/bills'
import { budgetRows, dailyBudget } from '../lib/budget'
import { buildAlerts } from '../lib/alerts'
import { healthScore } from '../lib/insights'
import { useChart } from '../lib/theme'
import { addDays, addMonths, between, byCategory, daysIn, exp, inc, newest, startOfDay, startOfMonth, startOfWeek, sum } from '../lib/stats'

const greet = () => { const h = new Date().getHours(); return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening' }

export default function Home({ onAdd, go, onOpen }) {
  const data = useData()
  const { user } = useAuth()
  const { transactions, budgets, accounts, bills } = data
  const ch = useChart()

  const m = useMemo(() => {
    const now = new Date()
    const stats = accountStats(accounts, transactions)
    const totals = walletTotals(accounts, stats, transactions)
    const mStart = startOfMonth(now), mEnd = addMonths(now, 1), pStart = addMonths(now, -1)
    const monthTx = transactions.filter((t) => between(t, mStart, mEnd))
    const prevTx = transactions.filter((t) => between(t, pStart, mStart))
    const spent = sum(exp(monthTx)), earned = sum(inc(monthTx))
    const rows = budgetRows(budgets, transactions)
    const all = rows.find((b) => b.category === 'all')
    const d0 = startOfDay(now)
    const today = sum(exp(transactions.filter((t) => between(t, d0, addDays(d0, 1)))))
    const wStart = startOfWeek(now)
    const week = sum(exp(transactions.filter((t) => between(t, wStart, addDays(wStart, 7)))))
    const lwStart = addDays(wStart, -7)
    const lastWeek = sum(exp(transactions.filter((t) => between(t, lwStart, new Date(lwStart.getTime() + (now - wStart))))))
    const cats = byCategory(monthTx)
    const series = Array.from({ length: 7 }, (_, i) => {
      const d = addDays(d0, i - 6)
      return { label: d.toLocaleDateString('en-IN', { weekday: 'short' }), v: sum(exp(transactions.filter((t) => between(t, d, addDays(d, 1))))) }
    })
    const dim = daysIn(now)
    const insights = []
    if (lastWeek > 0) {
      const p = Math.round(((week - lastWeek) / lastWeek) * 100)
      insights.push(p <= 0 ? `You've spent ${Math.abs(p)}% less than last week.` : `You've spent ${p}% more than last week.`)
    }
    rows.filter((b) => b.category !== 'all' && b.pct >= 0.75).forEach((b) => insights.push(b.pct >= 1 ? `${b.category} spending passed your limit.` : `${b.category} spending is nearing your limit.`))
    const tNow = cats.find((c) => c.name === 'Travel')?.value || 0
    const tPrev = byCategory(prevTx).find((c) => c.name === 'Travel')?.value || 0
    if (tPrev > 0 && tNow > tPrev) insights.push('Your travel expenses increased this month.')
    return {
      now, stats, totals, spent, earned, all, today, week, cats, series, dim, insights,
      alerts: buildAlerts(data, stats), bills: upcoming(bills, accounts, stats),
      daily: dailyBudget(budgets, transactions), health: healthScore(data, stats), projected: (spent / now.getDate()) * dim, daysLeft: dim - now.getDate(),
      rate: earned ? Math.round(((earned - spent) / earned) * 100) : null
    }
  }, [transactions, budgets, accounts, bills, data.goals])

  const pct = m.all ? m.all.pct : 0
  const ringColor = pct >= 1 ? 'rgb(var(--bad))' : pct >= 0.75 ? 'rgb(var(--warn))' : 'rgb(var(--accent))'
  const urgent = m.alerts.filter((a) => a.level === 'bad' || a.level === 'warn')
  const recent = [...transactions].sort(newest).slice(0, 5)
  const top = m.cats[0]
  const dueSoon = m.bills.filter((b) => b.days <= 7).length

  return (
    <div className="px-5 pt-[max(1.5rem,env(safe-area-inset-top))] pb-8 space-y-5">
      <header className="flex items-center gap-2">
        <button onClick={() => go('profile')} aria-label="Profile" className="h-11 w-11 rounded-full bg-accent/15 text-accent grid place-items-center font-display text-xl font-semibold tap">
          {(user?.name || user?.email || 'F')[0].toUpperCase()}
        </button>
        <div className="flex-1 min-w-0 ml-1">
          <p className="text-xs text-mute">{greet()}</p>
          <h1 className="font-display text-3xl font-semibold leading-none">FinFlow</h1>
        </div>
        <IconBtn icon={Search} label="Search" onClick={() => go('search')} />
        <IconBtn icon={Bell} label="Notifications" onClick={() => go('notifications')} badge={urgent.length} />
        <IconBtn icon={Plus} label="Add transaction" onClick={() => onAdd('expense')} solid />
      </header>

      {urgent.slice(0, 2).map((a) => (
        <button key={a.id} onClick={() => go(a.go)} className={`w-full flex items-center gap-3 rounded-2xl px-4 py-3 text-sm text-left tap ${a.level === 'bad' ? 'bg-bad/10 text-bad' : 'bg-warn/10 text-warn'}`}>
          <Bell size={16} className="shrink-0" /><span className="flex-1"><b className="font-medium">{a.title}</b><span className="block text-xs opacity-80">{a.body}</span></span><ChevronRight size={16} />
        </button>
      ))}

      <motion.section whileHover={{ y: -3 }} transition={{ type: 'spring', stiffness: 300, damping: 24 }} className="card p-6 relative overflow-hidden">
        <div className="absolute -top-24 -right-16 h-56 w-56 rounded-full bg-accent/10 blur-3xl pointer-events-none" />
        <p className="text-sm text-mute">Current balance</p>
        <p className="font-display text-5xl font-semibold mt-1 tabular-nums"><CountUp value={m.totals.liquid} /></p>
        {m.totals.due > 0 && <p className="text-xs text-mute mt-1">{inr(m.totals.net)} after {inr(m.totals.due)} card dues</p>}

        <div className="mt-6 flex items-center gap-5">
          <Ring value={pct} size={96} color={ringColor}>
            <div><p className="text-lg font-semibold tabular-nums leading-none">{m.all ? Math.round(pct * 100) : '—'}{m.all && <span className="text-xs">%</span>}</p><p className="text-[10px] text-mute mt-1">of budget</p></div>
          </Ring>
          <div className="flex-1 grid grid-cols-1 gap-2.5">
            <Row label="Monthly budget" v={m.all ? inr(m.all.limit) : 'Not set'} />
            <Row label="Spent" v={inr(m.spent)} />
            <Row label="Remaining" v={m.all ? inr(m.all.limit - m.spent) : '—'} tone={m.all && m.all.limit - m.spent < 0 ? 'text-bad' : 'text-good'} />
          </div>
        </div>
        {m.all && (
          <p className="text-xs text-mute mt-5">
            {m.daysLeft} days left · pace says {inr(m.projected)}
            {m.projected > m.all.limit ? <span className="text-warn"> ({inr(m.projected - m.all.limit)} over)</span> : ' by month end'}
          </p>
        )}
      </motion.section>

      {m.daily ? (
        <button onClick={() => go('budgets')} className="card w-full p-5 text-left tap">
          <div className="flex items-baseline justify-between">
            <p className="text-sm text-mute">Daily budget</p>
            <p className="text-xs text-mute">{m.daily.mode === 'custom' ? 'Set by you' : 'Monthly ÷ days'}</p>
          </div>
          <div className="flex items-end justify-between mt-2">
            <div>
              <p className={`font-display text-4xl font-semibold tabular-nums ${m.daily.left < 0 ? 'text-bad' : ''}`}>{inr(Math.abs(m.daily.left))}</p>
              <p className="text-xs text-mute">{m.daily.left >= 0 ? 'left to spend today' : 'over today’s budget'}</p>
            </div>
            <div className="text-right">
              <p className="text-sm font-semibold tabular-nums">{inr(m.daily.amount)} <span className="text-xs text-mute font-normal">a day</span></p>
              <p className="text-xs text-mute">{inr(m.daily.today)} spent</p>
            </div>
          </div>
          <div className="mt-4 h-1.5 rounded-full bg-raised overflow-hidden">
            <div className="h-full rounded-full transition-[width] duration-700" style={{ width: `${Math.min(1, m.daily.pct) * 100}%`, background: m.daily.pct >= 1 ? 'rgb(var(--bad))' : m.daily.pct >= 0.8 ? 'rgb(var(--warn))' : 'rgb(var(--accent))' }} />
          </div>
          {m.daily.pace !== null && <p className="text-xs text-mute mt-3">Spend {inr(m.daily.pace)} a day for the rest of the month to stay inside your monthly budget.</p>}
        </button>
      ) : (
        <button onClick={() => go('budgets')} className="card w-full p-5 text-left tap">
          <p className="text-sm font-medium">Set a daily budget</p>
          <p className="text-xs text-mute mt-1">Pick a number, or set a monthly budget and FinFlow splits it across the days.</p>
        </button>
      )}

      {accounts.length > 0 && (
        <section>
          <div className="flex items-baseline justify-between mb-2"><h2 className="font-display text-2xl font-semibold">Accounts</h2><button className="text-xs text-accent" onClick={() => go('wallet')}>Open wallet</button></div>
          <div className="flex gap-3 overflow-x-auto -mx-5 px-5 pb-1">
            {accounts.map((a) => {
              const K = ACCOUNT_KINDS[a.kind]
              const s = m.stats[a.id]
              const isCredit = a.kind === 'credit'
              return (
                <button key={a.id} onClick={() => go('wallet')} className="card shrink-0 w-36 p-4 text-left tap">
                  <K.icon size={16} className="text-accent" />
                  <p className="text-xs text-mute mt-3 truncate">{a.nickname}</p>
                  <p className="text-base font-semibold tabular-nums mt-0.5">{a.kind === 'debit' ? (a.last4 ? `•• ${a.last4}` : 'Card') : inr(isCredit ? s.outstanding : s.balance)}</p>
                  <p className="text-[10px] text-mute">{isCredit ? 'outstanding' : a.kind === 'debit' ? 'debit card' : 'balance'}</p>
                </button>
              )
            })}
          </div>
        </section>
      )}

      <section className="card p-5">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm text-mute">This month</p>
          {m.rate !== null && <span className={`text-xs px-2.5 py-1 rounded-full ${m.rate >= 20 ? 'bg-good/15 text-good' : m.rate >= 0 ? 'bg-warn/15 text-warn' : 'bg-bad/15 text-bad'}`}>Savings rate {m.rate}%</span>}
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div><p className="text-xs text-mute">Income</p><p className="font-display text-3xl font-semibold text-good tabular-nums">{inr(m.earned)}</p></div>
          <div><p className="text-xs text-mute">Expenses</p><p className="font-display text-3xl font-semibold tabular-nums">{inr(m.spent)}</p></div>
        </div>
        <div className="mt-4 h-1.5 rounded-full bg-raised overflow-hidden flex">
          <div className="bg-good" style={{ width: `${m.earned + m.spent ? (m.earned / (m.earned + m.spent)) * 100 : 50}%` }} />
          <div className="bg-accent flex-1" />
        </div>
      </section>

      <section className="grid grid-cols-4 gap-3">
        {[
          { l: 'Expense', i: ArrowUpRight, f: () => onAdd('expense') },
          { l: 'Income', i: ArrowDownLeft, f: () => onAdd('income') },
          { l: 'Transfer', i: ArrowLeftRight, f: () => onAdd('transfer') },
          { l: 'Bill', i: ReceiptText, f: () => go('bills') }
        ].map(({ l, i: Icon, f }) => (
          <motion.button key={l} whileTap={{ scale: 0.94 }} onClick={f} className="card py-4 flex flex-col items-center gap-2 text-xs">
            <span className="h-10 w-10 rounded-full bg-accent/15 text-accent grid place-items-center"><Icon size={18} /></span>{l}
          </motion.button>
        ))}
      </section>

      <section className="grid grid-cols-2 gap-3">
        <Tile label="Today" value={inr(m.today)} />
        <Tile label="This week" value={inr(m.week)} />
        <Tile label="Top category" value={top ? top.name : '—'} sub={top ? inr(top.value) : ''} color={top && catMeta(top.name).color} />
        <Tile label="Health score" value={`${m.health.score}`} sub={m.health.grade} onClick={() => go('insights')} />
      </section>

      <section className="card p-5">
        <div className="flex items-baseline justify-between mb-1">
          <h2 className="font-display text-2xl font-semibold">Upcoming bills</h2>
          <button className="text-xs text-accent" onClick={() => go('bills')}>{dueSoon ? `${dueSoon} due this week` : 'See all'}</button>
        </div>
        {m.bills.length === 0 ? <p className="text-sm text-mute py-4">No bills yet. Add rent, EMIs and subscriptions so nothing slips.</p> : m.bills.slice(0, 3).map((b) => (
          <button key={b.id} onClick={() => go('bills')} className="w-full flex items-center gap-3 py-3 text-left">
            <div className="flex-1 min-w-0"><p className="text-sm font-medium truncate">{b.name}</p><p className={`text-xs ${b.days < 0 ? 'text-bad' : b.days <= 3 ? 'text-warn' : 'text-mute'}`}>{dueLabel(b.days)} · {b.due.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</p></div>
            <p className="text-sm font-semibold tabular-nums">{inr(b.amount)}</p>
          </button>
        ))}
      </section>

      <section className="grid grid-cols-3 gap-3">
        {[{ l: 'Budgets', i: Target, s: 'budgets' }, { l: 'Goals', i: PiggyBank, s: 'goals' }, { l: 'Insights', i: Sparkles, s: 'insights' }].map(({ l, i: Icon, s }) => (
          <button key={l} onClick={() => go(s)} className="card py-4 flex items-center justify-center gap-2 text-sm tap"><Icon size={16} className="text-accent" />{l}</button>
        ))}
      </section>

      <section className="card p-5">
        <p className="text-sm text-mute mb-3">Last 7 days</p>
        <div className="h-32">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={m.series} margin={{ top: 6, right: 8, left: 8, bottom: 0 }}>
              <XAxis dataKey="label" {...ch.axis} />
              <Tooltip {...ch.tip} cursor={false} formatter={(v) => [inr(v), 'Spent']} />
              <Line type="monotone" dataKey="v" stroke="#A78BFA" strokeWidth={2.5} dot={false} activeDot={{ r: 5, fill: '#A78BFA' }} animationDuration={1000} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </section>

      {m.insights.length > 0 && (
        <section className="space-y-2">
          <h2 className="font-display text-2xl font-semibold">Insights</h2>
          {m.insights.slice(0, 3).map((t, i) => <p key={i} className="card px-5 py-4 text-sm">{t}</p>)}
        </section>
      )}

      <section>
        <h2 className="font-display text-2xl font-semibold mb-1">Recent</h2>
        {recent.length === 0 ? <p className="text-sm text-mute py-6">Nothing yet. Tap + to add your first expense.</p> : recent.map((t) => <TxRow key={t.id} tx={t} swipe={false} onOpen={onOpen} />)}
      </section>
    </div>
  )
}

const Row = ({ label, v, tone = '' }) => (
  <div className="flex items-baseline justify-between gap-2"><span className="text-xs text-mute">{label}</span><span className={`text-sm font-semibold tabular-nums ${tone}`}>{v}</span></div>
)
const Tile = ({ label, value, sub, color, onClick }) => {
  const C = onClick ? 'button' : 'div'
  return (
    <C onClick={onClick} className={`card p-4 text-left ${onClick ? 'tap' : ''}`}>
      <p className="text-xs text-mute">{label}</p>
      <p className="font-display text-2xl font-semibold mt-1 truncate" style={color ? { color } : undefined}>{value}</p>
      {sub && <p className="text-xs text-mute mt-0.5">{sub}</p>}
    </C>
  )
}
