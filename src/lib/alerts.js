import { budgetRows, dailyBudget, levelFor } from './budget'
import { upcoming } from './bills'
import { inr, dueLabel } from './format'

// Everything that deserves attention right now, most urgent first.
export function buildAlerts({ transactions, budgets, accounts, bills, goals }, stats) {
  const out = []
  budgetRows(budgets, transactions).forEach((b) => {
    const l = levelFor(b.pct)
    if (!l) return
    const name = b.category === 'all' ? 'Monthly budget' : `${b.category} budget`
    out.push({
      id: 'b-' + b.category, level: l.level, go: 'budgets',
      title: l.level === 'bad' ? `${name} exceeded` : `${name}: ${l.label}`,
      body: `${inr(b.spent)} of ${inr(b.limit)}${l.level === 'bad' ? ` · over by ${inr(b.spent - b.limit)}` : ` · ${inr(b.limit - b.spent)} left`}`
    })
  })
  const db = dailyBudget(budgets, transactions)
  if (db && db.pct >= 1) out.push({ id: 'daily', level: 'warn', go: 'budgets', title: 'Daily budget exceeded', body: `${inr(db.today)} spent against ${inr(db.amount)} today` })
  upcoming(bills, accounts, stats).forEach((u) => {
    const remind = u.bill?.remind_days_before ?? 5
    if (u.days < 0) out.push({ id: 'o-' + u.id, level: 'bad', go: 'bills', title: `${u.name} is overdue`, body: `${inr(u.amount)} · ${dueLabel(u.days)}` })
    else if (u.days <= remind) out.push({ id: 'd-' + u.id, level: 'warn', go: 'bills', title: `${u.name} · ${dueLabel(u.days).toLowerCase()}`, body: inr(u.amount) })
  })
  accounts.filter((a) => a.kind === 'credit' && a.credit_limit).forEach((a) => {
    const u = stats[a.id].outstanding / a.credit_limit
    if (u > 0.75) out.push({ id: 'u-' + a.id, level: 'warn', go: 'wallet', title: `${a.nickname} utilisation ${Math.round(u * 100)}%`, body: 'Keeping it under 30% helps your credit score.' })
  })
  goals.forEach((g) => {
    if (g.saved_amount >= g.target_amount) out.push({ id: 'g-' + g.id, level: 'good', go: 'goals', title: `${g.name} reached`, body: `You saved ${inr(g.saved_amount)}. Nicely done.` })
  })
  const rank = { bad: 0, warn: 1, info: 2, good: 3 }
  return out.sort((a, b) => rank[a.level] - rank[b.level])
}
