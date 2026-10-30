import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { supabase, hasSupabase } from '../lib/supabase'
import { useAuth } from './AuthContext'
import { seed } from '../lib/seed'
import { uuid } from '../lib/uuid'
import { advance } from '../lib/bills'
import { key, parseDay, startOfDay } from '../lib/stats'
import { saveReceipt } from '../lib/receipts'

const Ctx = createContext(null)
export const useData = () => useContext(Ctx)

const lsKey = (id) => (id === 'demo' ? 'vault-demo-v2' : `vault-local-${id}`)
const EMPTY = { transactions: [], budgets: [], accounts: [], bills: [], goals: [], recurring: [] }
const TABLE = { transactions: 'transactions', budgets: 'budgets', accounts: 'accounts', bills: 'subscriptions', goals: 'goals', recurring: 'recurring_transactions' }
const NUM = ['amount', 'balance', 'credit_limit', 'outstanding', 'target_amount', 'saved_amount']
const norm = (r) => { const o = { ...r }; NUM.forEach((k) => { if (o[k] != null) o[k] = Number(o[k]) }); return o }

export function DataProvider({ children }) {
  const { user } = useAuth()
  const [data, setData] = useState(EMPTY)
  const [loading, setLoading] = useState(true)
  const loaded = useRef(false)
  const ref = useRef(data)
  ref.current = data
  const ranRecurring = useRef(null)

  const load = useCallback(async () => {
    if (!user) { setData(EMPTY); setLoading(false); return }
    if (!hasSupabase) {
      try {
        const raw = localStorage.getItem(lsKey(user.id))
        setData(raw ? { ...EMPTY, ...JSON.parse(raw) } : user.id === 'demo' ? seed() : EMPTY)
      } catch { setData(user.id === 'demo' ? seed() : EMPTY) }
      loaded.current = true
      setLoading(false)
      return
    }
    const q = (c) => supabase.from(TABLE[c]).select('*').limit(3000)
    const [t, ...rest] = await Promise.all([
      q('transactions').order('occurred_at', { ascending: false }),
      ...['budgets', 'accounts', 'bills', 'goals', 'recurring'].map(q)
    ])
    const names = ['budgets', 'accounts', 'bills', 'goals', 'recurring']
    const next = { transactions: (t.data || []).map(norm) }
    names.forEach((c, i) => { next[c] = (rest[i].data || []).map(norm) })
    setData(next)
    loaded.current = true
    setLoading(false)
  }, [user?.id])

  useEffect(() => { loaded.current = false; setLoading(true); load() }, [load])
  useEffect(() => { if (!hasSupabase && loaded.current && user) localStorage.setItem(lsKey(user.id), JSON.stringify(data)) }, [data])

  // ---- generic CRUD ----
  const save = useCallback(async (coll, item) => {
    const isNew = !item.id
    if (!hasSupabase) {
      const row = { ...item, id: item.id || uuid() }
      setData((d) => ({ ...d, [coll]: isNew ? [row, ...d[coll]] : d[coll].map((x) => (x.id === row.id ? { ...x, ...row } : x)) }))
      return row
    }
    let res
    if (isNew) res = await supabase.from(TABLE[coll]).insert({ ...item, user_id: user.id }).select().single()
    else {
      const { id, created_at, user_id, ...rest } = item
      res = await supabase.from(TABLE[coll]).update(rest).eq('id', id).select().single()
    }
    if (res.error) throw res.error
    const row = norm(res.data)
    setData((d) => ({ ...d, [coll]: isNew ? [row, ...d[coll]] : d[coll].map((x) => (x.id === row.id ? row : x)) }))
    return row
  }, [user?.id])

  const remove = useCallback(async (coll, id) => {
    if (hasSupabase) {
      const { error } = await supabase.from(TABLE[coll]).delete().eq('id', id)
      if (error) throw error
    }
    setData((d) => {
      const next = { ...d, [coll]: d[coll].filter((x) => x.id !== id) }
      if (coll === 'accounts') {
        const un = (x) => ({ ...x, account_id: x.account_id === id ? null : x.account_id, to_account_id: x.to_account_id === id ? null : x.to_account_id })
        next.transactions = d.transactions.map(un)
        next.bills = d.bills.map(un)
        next.recurring = d.recurring.map(un)
        next.accounts = next.accounts.map((a) => (a.linked_account_id === id ? { ...a, linked_account_id: null } : a))
      }
      return next
    })
  }, [])

  const addTx = useCallback((tx) => save('transactions', tx), [save])
  const updateTx = useCallback((id, ch) => save('transactions', { ...ch, id }), [save])
  const removeTx = useCallback((id) => remove('transactions', id), [remove])
  const duplicateTx = useCallback((tx) => {
    const { id, created_at, user_id, ...rest } = tx
    return addTx({ ...rest, occurred_at: new Date().toISOString() })
  }, [addTx])

  const setBudget = useCallback(async (category, amount, rollover = false) => {
    const existing = ref.current.budgets.find((b) => b.category === category)
    const amt = Number(amount)
    if (amt > 0) await save('budgets', { ...(existing ? { id: existing.id } : {}), category, amount: amt, rollover })
    else if (existing) await remove('budgets', existing.id)
  }, [save, remove])

  const payBill = useCallback(async (bill, accountId, methodLabel = 'UPI') => {
    const today = key(new Date())
    await addTx({
      type: 'expense', amount: bill.amount, category: bill.category || 'Bills', subcategory: null, merchant: bill.name,
      notes: `${bill.name} (${bill.kind})`, payment_method: methodLabel, account_id: accountId || null, to_account_id: null,
      source: null, location: '', receipt_path: null, occurred_at: new Date().toISOString()
    })
    if (bill.cycle === 'once') await save('bills', { id: bill.id, active: false, last_paid: today })
    else await save('bills', { id: bill.id, next_due: advance(bill.next_due, bill.cycle), last_paid: today })
  }, [addTx, save])

  const uploadReceipt = useCallback((file) => (file ? saveReceipt(file, user.id) : null), [user?.id])

  const refresh = useCallback(async () => { await load() }, [load])
  const resetDemo = useCallback(() => { if (!hasSupabase) setData(user?.id === 'demo' ? seed() : EMPTY) }, [user?.id])
  const restore = useCallback((obj) => { if (!hasSupabase) setData({ ...EMPTY, ...obj }) }, [])

  // ---- auto-post due recurring transactions once per session ----
  useEffect(() => {
    if (loading || !user || ranRecurring.current === user.id) return
    ranRecurring.current = user.id
    ;(async () => {
      const today = startOfDay(new Date())
      for (const r of ref.current.recurring) {
        if (!r.active) continue
        let next = parseDay(r.next_run), n = 0
        while (next <= today && n < 12) {
          const when = new Date(next); when.setHours(9, 0, 0, 0)
          await addTx({
            type: r.type, amount: r.amount, category: r.category, subcategory: r.subcategory || null, merchant: r.merchant || '',
            payment_method: r.payment_method, account_id: r.account_id || null, to_account_id: null, source: r.source || null,
            notes: r.notes || '', location: '', receipt_path: null, recurring_id: r.id, occurred_at: (when > new Date() ? new Date() : when).toISOString()
          })
          next = advance(next, r.frequency); n++
        }
        if (n) await save('recurring', { id: r.id, next_run: key(next) })
      }
    })().catch(console.error)
  }, [loading, user?.id])

  const value = { ...data, loading, save, remove, addTx, updateTx, removeTx, duplicateTx, setBudget, payBill, uploadReceipt, refresh, resetDemo, restore }
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}
