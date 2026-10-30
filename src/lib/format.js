let cur = 'INR'
const SYM = { INR: '₹', USD: '$', EUR: '€', GBP: '£', AED: 'AED ' }
export const setCurrency = (c) => { cur = c }
export const sym = () => SYM[cur] || '₹'
export const inr = (n) => {
  const v = Math.round(Number(n) || 0)
  const nf = new Intl.NumberFormat(cur === 'INR' ? 'en-IN' : 'en-US', { maximumFractionDigits: 0 })
  return (v < 0 ? '−' : '') + sym() + nf.format(Math.abs(v))
}
export const short = (n) => {
  const v = Math.abs(n)
  const s = n < 0 ? '−' : ''
  if (v >= 1e7) return s + (v / 1e7).toFixed(1) + 'Cr'
  if (v >= 1e5) return s + (v / 1e5).toFixed(1) + 'L'
  if (v >= 1e3) return s + (v / 1e3).toFixed(v >= 1e4 ? 0 : 1) + 'k'
  return s + String(Math.round(v))
}
export const dayLabel = (d) => {
  const x = new Date(d)
  const t = new Date()
  const y = new Date(); y.setDate(t.getDate() - 1)
  if (x.toDateString() === t.toDateString()) return 'Today'
  if (x.toDateString() === y.toDateString()) return 'Yesterday'
  return x.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })
}
export const timeLabel = (d) => new Date(d).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })
export const dueLabel = (days) => (days < 0 ? `${-days}d overdue` : days === 0 ? 'Due today' : days === 1 ? 'Tomorrow' : `in ${days}d`)
export const mask = (last4) => (last4 ? `•••• ${last4}` : '')
