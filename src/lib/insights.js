import { budgetRows } from './budget'
import { upcoming } from './bills'
import { addDays, addMonths, between, byDay, daysIn, exp, inc, key, startOfDay, startOfMonth, sum } from './stats'

const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x))

export function monthFlow(txs, monthDate) {
  const l = txs.filter((t) => between(t, startOfMonth(monthDate), addMonths(monthDate, 1)))
  return { income: sum(inc(l)), expense: sum(exp(l)) }
}

export function avgMonthlyExpense(txs) {
  const now = new Date()
  const vals = [1, 2, 3].map((i) => monthFlow(txs, addMonths(now, -i)).expense).filter((v) => v > 0)
  return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : monthFlow(txs, now).expense
}

export function healthScore(data, stats) {
  const { transactions, budgets, accounts, bills, goals } = data
  const now = new Date()
  let f = monthFlow(transactions, now)
  if (!f.income) f = monthFlow(transactions, addMonths(now, -1))
  const rate = f.income ? (f.income - f.expense) / f.income : 0
  const savings = f.income ? clamp(rate / 0.2) * 30 : 10

  const all = budgetRows(budgets, transactions).find((b) => b.category === 'all')
  const discipline = !all ? 12 : all.pct <= 0.8 ? 25 : all.pct <= 1 ? 25 * (1 - ((all.pct - 0.8) / 0.2) * 0.6) : 5

  const overdue = upcoming(bills, accounts, stats).filter((u) => u.days < 0).length
  const punctual = Math.max(0, 15 - overdue * 5)

  const cards = accounts.filter((a) => a.kind === 'credit' && a.credit_limit)
  const limit = cards.reduce((n, a) => n + a.credit_limit, 0)
  const owed = cards.reduce((n, a) => n + Math.max(0, stats[a.id].outstanding), 0)
  const util = limit ? owed / limit : 0
  const credit = !limit ? 15 : util <= 0.3 ? 15 : util <= 0.5 ? 10 : util <= 0.75 ? 5 : 0

  const ef = goals.find((g) => g.kind === 'emergency')
  const monthly = avgMonthlyExpense(transactions)
  const months = ef && monthly ? ef.saved_amount / monthly : 0
  const emergency = clamp(months / 6) * 15

  const parts = [
    { label: 'Savings rate', v: savings, max: 30, tip: f.income ? `${Math.round(rate * 100)}% saved. Aim for 20%.` : 'Log income to score this.' },
    { label: 'Budget discipline', v: discipline, max: 25, tip: all ? `${Math.round(all.pct * 100)}% of budget used.` : 'Set a monthly budget.' },
    { label: 'Bills on time', v: punctual, max: 15, tip: overdue ? `${overdue} overdue.` : 'Nothing overdue.' },
    { label: 'Credit usage', v: credit, max: 15, tip: limit ? `${Math.round(util * 100)}% of limit used. Keep under 30%.` : 'No credit cards added.' },
    { label: 'Emergency fund', v: emergency, max: 15, tip: ef ? `${months.toFixed(1)} of 6 months covered.` : 'Create an emergency fund goal.' }
  ]
  const score = Math.round(parts.reduce((n, p) => n + p.v, 0))
  const grade = score >= 80 ? 'Excellent' : score >= 60 ? 'Good' : score >= 40 ? 'Fair' : 'Needs work'
  return { score, grade, parts }
}

export function streaks(data) {
  const { transactions, budgets } = data
  const now = new Date()
  const today = startOfDay(now)
  const spend = byDay(exp(transactions))
  const s = (d) => sum(spend[key(d)] || [])
  const first = transactions.length ? startOfDay(new Date(Math.min(...transactions.map((t) => new Date(t.occurred_at))))) : today
  const all = budgets.find((b) => b.category === 'all')
  const last30 = Array.from({ length: 30 }, (_, i) => s(addDays(today, -i - 1)))
  const custom = budgets.find((b) => b.category === 'daily')
  const allowance = custom ? custom.amount : all ? all.amount / daysIn(now) : last30.reduce((a, b) => a + b, 0) / 30 || Infinity

  let under = 0
  for (let d = today; d >= first; d = addDays(d, -1)) { if (s(d) <= allowance) under++; else break }

  let noSpend = 0
  for (let d = startOfMonth(now); d < today; d = addDays(d, 1)) if (s(d) === 0) noSpend++

  let saving = 0
  for (let i = 1; i <= 12; i++) {
    const f = monthFlow(transactions, addMonths(now, -i))
    if (f.income > 0 && f.income > f.expense) saving++
    else break
  }
  const loggedWeek = Array.from({ length: 7 }, (_, i) => (spend[key(addDays(today, -i))] || []).length > 0 || transactions.some((t) => key(t.occurred_at) === key(addDays(today, -i)))).filter(Boolean).length
  return { under, noSpend, saving, loggedWeek, allowance }
}

export function challenges(data) {
  const st = streaks(data)
  const f = monthFlow(data.transactions, new Date())
  const rate = f.income ? Math.round(((f.income - f.expense) / f.income) * 100) : 0
  return [
    { id: 'ns', title: 'Five no-spend days', hint: 'Days this month with zero spending', value: st.noSpend, target: 5 },
    { id: 'sv', title: 'Save 20% of income', hint: 'This month so far', value: Math.max(0, rate), target: 20, unit: '%' },
    { id: 'lg', title: 'Log every day this week', hint: 'Keeps your numbers honest', value: st.loggedWeek, target: 7 }
  ]
}

export function badges(data, stats) {
  const { transactions, goals, accounts } = data
  const st = streaks(data)
  const noSpendAll = Object.keys(byDay(exp(transactions))).length
  const cards = accounts.filter((a) => a.kind === 'credit' && a.credit_limit)
  const util = cards.length ? cards.reduce((n, a) => n + Math.max(0, stats[a.id].outstanding), 0) / cards.reduce((n, a) => n + a.credit_limit, 0) : null
  const prev = monthFlow(transactions, addMonths(new Date(), -1))
  const all = data.budgets.find((b) => b.category === 'all')
  return [
    { id: 'first', name: 'First step', desc: 'Log your first transaction', earned: transactions.length > 0 },
    { id: 'p50', name: 'Habit formed', desc: 'Log 50 transactions', earned: transactions.length >= 50 },
    { id: 'u7', name: 'Steady hand', desc: '7 days under your daily limit', earned: st.under >= 7 },
    { id: 'ns5', name: 'Zero day hero', desc: '5 no-spend days in a month', earned: st.noSpend >= 5 },
    { id: 'sv3', name: 'Saver', desc: 'Save money 3 months running', earned: st.saving >= 3 },
    { id: 'bud', name: 'Budget master', desc: 'Finish last month under budget', earned: Boolean(all) && prev.expense > 0 && prev.expense <= all.amount },
    { id: 'goal', name: 'Goal getter', desc: 'Complete a savings goal', earned: goals.some((g) => g.saved_amount >= g.target_amount) },
    { id: 'card', name: 'Card savvy', desc: 'Keep credit use under 30%', earned: util !== null && util <= 0.3 },
    { id: 'wk', name: 'Consistent', desc: 'Log every day for a week', earned: st.loggedWeek >= 7 && noSpendAll > 0 }
  ]
}

export function weekdayWeekend(txs, from, to) {
  const today = startOfDay(new Date())
  const end = to > addDays(today, 1) ? addDays(today, 1) : to
  const spend = byDay(exp(txs))
  let wk = 0, we = 0, wkN = 0, weN = 0
  for (let d = startOfDay(from); d < end; d = addDays(d, 1)) {
    const v = sum(spend[key(d)] || [])
    if (d.getDay() === 0 || d.getDay() === 6) { we += v; weN++ } else { wk += v; wkN++ }
  }
  return { weekday: wkN ? wk / wkN : 0, weekend: weN ? we / weN : 0 }
}
