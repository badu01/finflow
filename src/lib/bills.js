import { addDays, addM, daysIn, diffDays, key, parseDay, startOfDay } from './stats'

export function advance(date, cycle) {
  const d = parseDay(date)
  const out = cycle === 'weekly' ? addDays(d, 7) : cycle === 'monthly' ? addM(d, 1) : cycle === 'quarterly' ? addM(d, 3) : cycle === 'yearly' ? addM(d, 12) : d
  return typeof date === 'string' ? key(out) : out
}

const nextOccurrence = (day) => {
  const t = startOfDay(new Date())
  let c = new Date(t.getFullYear(), t.getMonth(), 1)
  c.setDate(Math.min(day, daysIn(c)))
  if (c < t) { c = new Date(t.getFullYear(), t.getMonth() + 1, 1); c.setDate(Math.min(day, daysIn(c))) }
  return c
}

// Manual bills + credit-card dues in one sorted list.
export function upcoming(bills, accounts, stats) {
  const today = new Date()
  const items = bills.filter((b) => b.active !== false).map((b) => {
    const due = parseDay(b.next_due)
    return { id: b.id, src: 'bill', name: b.name, amount: +b.amount, due, days: diffDays(due, today), kind: b.kind, bill: b }
  })
  accounts.filter((a) => a.kind === 'credit' && a.due_day && stats[a.id]?.outstanding > 0).forEach((a) => {
    const due = nextOccurrence(+a.due_day)
    items.push({ id: 'card-' + a.id, src: 'card', name: `${a.nickname} bill`, amount: stats[a.id].outstanding, due, days: diffDays(due, today), kind: 'credit', account: a })
  })
  return items.sort((a, b) => a.due - b.due)
}

const PER_MONTH = { weekly: 52 / 12, monthly: 1, quarterly: 1 / 3, yearly: 1 / 12, once: 0 }
export const monthlyCost = (b) => (+b.amount || 0) * (PER_MONTH[b.cycle] ?? 0)
