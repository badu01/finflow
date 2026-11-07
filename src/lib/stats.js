export const startOfDay = (d) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x }
export const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x }
export const startOfWeek = (d) => { const x = startOfDay(d); return addDays(x, -((x.getDay() + 6) % 7)) }
export const startOfMonth = (d) => new Date(d.getFullYear(), d.getMonth(), 1)
export const addMonths = (d, n) => new Date(d.getFullYear(), d.getMonth() + n, 1)
export const daysIn = (d) => new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()
export const pad = (n) => String(n).padStart(2, '0')
export const key = (d) => { const x = new Date(d); return `${x.getFullYear()}-${pad(x.getMonth() + 1)}-${pad(x.getDate())}` }
export const timeKey = (d) => { const x = new Date(d); return `${pad(x.getHours())}:${pad(x.getMinutes())}` }

export const between = (t, from, to) => { const d = new Date(t.occurred_at); return d >= from && d < to }
export const sum = (l) => l.reduce((s, x) => s + Number(x.amount), 0)
export const exp = (l) => l.filter((t) => t.type === 'expense')
export const inc = (l) => l.filter((t) => t.type === 'income')
export const budgeted = (l) => l.filter((t)=>t.counts_toward_budget !== false)

export function byCategory(list) {
  const m = {}
  exp(list).forEach((t) => { m[t.category] = (m[t.category] || 0) + Number(t.amount) })
  return Object.entries(m).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value)
}

export function byDay(list) {
  const m = {}
  list.forEach((t) => { const k = key(t.occurred_at); (m[k] ||= []).push(t) })
  return m
}

export const newest = (a, b) => new Date(b.occurred_at) - new Date(a.occurred_at)

export const addM = (d, n) => {
  const x = new Date(d.getFullYear(), d.getMonth() + n, 1)
  x.setDate(Math.min(d.getDate(), daysIn(x)))
  return x
}
export const parseDay = (s) => (typeof s === 'string' ? new Date(s.length === 10 ? s + 'T00:00' : s) : new Date(s))
export const diffDays = (a, b) => Math.round((startOfDay(a) - startOfDay(b)) / 864e5)
