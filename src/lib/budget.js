import { addDays, addMonths, between, daysIn, exp, startOfDay, startOfMonth, sum, budgeted } from './stats'

// Per-budget spend, limit (with optional rollover of last month's unspent amount) and progress.
export function budgetRows(budgets, txs, now = new Date()) {
  const ms = startOfMonth(now), me = addMonths(now, 1), ps = addMonths(now, -1)
  const cur = txs.filter((t) => between(t, ms, me))
  const prev = txs.filter((t) => between(t, ps, ms))
  const sp = (l, c) => sum(budgeted(exp(l).filter((t) => c === 'all' || t.category === c)))
  return budgets.filter((b) => b.category !== 'daily').map((b) => {
    const spent = sp(cur, b.category)
    const carry = b.rollover && prev.length ? Math.max(0, b.amount - sp(prev, b.category)) : 0
    const limit = b.amount + carry
    return { ...b, spent, carry, limit, pct: limit ? spent / limit : 0 }
  }).sort((a, b) => (a.category === 'all' ? -1 : b.category === 'all' ? 1 : b.pct - a.pct))
}

export const LEVELS = [
  { at: 1, level: 'bad', label: 'exceeded' },
  { at: 0.9, level: 'warn', label: '90% used' },
  { at: 0.75, level: 'warn', label: '75% used' },
  { at: 0.5, level: 'info', label: '50% used' }
]
export const levelFor = (pct) => LEVELS.find((l) => pct >= l.at)

// Daily budget: either set by the user (budget row 'daily') or the monthly budget split evenly over the month.
export function dailyBudget(budgets, txs, now = new Date()) {
  const custom = budgets.find((b) => b.category === 'daily')
  const all = budgetRows(budgets, txs, now).find((b) => b.category === 'all')
  if (!custom && !all) return null
  const d0 = startOfDay(now)
  const today = sum(budgeted(exp(txs.filter((t) => between(t, d0, addDays(d0, 1))))))
  const dim = daysIn(now)
  const amount = custom ? custom.amount : all.limit / dim
  const left = amount - today
  const daysAfter = dim - now.getDate()
  const pace = all && daysAfter > 0 ? Math.max(0, (all.limit - all.spent) / daysAfter) : null
  return { mode: custom ? 'custom' : 'auto', amount, today, left, pct: amount ? today / amount : 0, pace }
}
