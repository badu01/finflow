import { startOfMonth } from './stats'

// Derive every account's live balance / card outstanding from opening values + transactions.
export function accountStats(accounts, txs) {
  const by = Object.fromEntries(accounts.map((a) => [a.id, a]))
  const s = Object.fromEntries(accounts.map((a) => [a.id, { balance: +a.balance || 0, outstanding: +a.outstanding || 0, spent: 0, count: 0 }]))
  const move = (id, delta) => {
    let a = by[id]
    if (!a) return
    if (a.kind === 'debit') { id = a.linked_account_id; a = by[id]; if (!a) return }
    if (a.kind === 'credit') s[id].outstanding -= delta
    else s[id].balance += delta
  }
  const ms = startOfMonth(new Date())
  txs.forEach((t) => {
    const amt = +t.amount
    if (t.account_id && s[t.account_id]) {
      s[t.account_id].count++
      if (t.type === 'expense' && new Date(t.occurred_at) >= ms) s[t.account_id].spent += amt
    }
    if (t.type === 'expense') move(t.account_id, -amt)
    else if (t.type === 'income') move(t.account_id, amt)
    else if (t.type === 'transfer') { move(t.account_id, -amt); move(t.to_account_id, amt) }
  })
  return s
}

export function walletTotals(accounts, stats, txs) {
  const liquid = accounts.filter((a) => ['bank', 'cash', 'wallet'].includes(a.kind)).reduce((n, a) => n + stats[a.id].balance, 0)
  const due = accounts.filter((a) => a.kind === 'credit').reduce((n, a) => n + Math.max(0, stats[a.id].outstanding), 0)
  const loose = txs.filter((t) => !t.account_id).reduce((n, t) => n + (t.type === 'income' ? +t.amount : t.type === 'expense' ? -t.amount : 0), 0)
  return { liquid: liquid + loose, due, net: liquid + loose - due }
}

export const methodFor = (a, ACCOUNT_KINDS) => (a ? ACCOUNT_KINDS[a.kind].method : 'UPI')

// "Credit card · ICICI Coral ••9034", "UPI · HDFC Savings", "Cash"…
export function payLabel(tx, a) {
  if (!a) return tx.payment_method || ''
  const pm = tx.payment_method
  const base = a.kind === 'credit' ? 'Credit card' : a.kind === 'debit' ? 'Debit card' : a.kind === 'wallet' ? 'Wallet' : a.kind === 'cash' ? 'Cash'
    : pm === 'UPI' ? 'UPI' : pm === 'Net Banking' ? 'Net banking' : 'Bank account'
  const name = a.nickname + (a.last4 ? ` ••${a.last4}` : '')
  return base === a.nickname ? name : `${base} · ${name}`
}
