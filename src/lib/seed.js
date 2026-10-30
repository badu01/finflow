import { uuid } from './uuid'
import { addDays, daysIn, key } from './stats'

// Deterministic demo data relative to today.
export function seed() {
  const now = new Date()
  const out = []
  let n = 42
  const rnd = () => { n = (n * 9301 + 49297) % 233280; return n / 233280 }
  const pick = (a) => a[Math.floor(rnd() * a.length)]
  const A = { bank: uuid(), cash: uuid(), wallet: uuid(), debit: uuid(), credit: uuid() }

  const dueDay = addDays(now, 9).getDate()
  const billDay = addDays(now, -12).getDate()
  const accounts = [
    { id: A.bank, kind: 'bank', bank_name: 'HDFC Bank', nickname: 'HDFC Savings', account_type: 'Savings', balance: 42000 },
    { id: A.cash, kind: 'cash', nickname: 'Cash', balance: 1500 },
    { id: A.wallet, kind: 'wallet', nickname: 'Paytm', balance: 800 },
    { id: A.debit, kind: 'debit', bank_name: 'HDFC Bank', nickname: 'HDFC Debit', last4: '4821', linked_account_id: A.bank, color: 'ocean' },
    { id: A.credit, kind: 'credit', bank_name: 'ICICI Bank', nickname: 'ICICI Coral', last4: '9034', credit_limit: 150000, outstanding: 16000, billing_day: billDay, due_day: dueDay, color: 'rose' }
  ]

  const mk = (daysAgo, type, amount, category, extra = {}) => {
    const d = new Date(now)
    d.setDate(d.getDate() - daysAgo)
    d.setHours(8 + Math.floor(rnd() * 13), Math.floor(rnd() * 60), 0, 0)
    if (d > now) d.setTime(now.getTime() - 60000)
    out.push({
      id: uuid(), type, amount, category, subcategory: null, merchant: '', payment_method: 'UPI', account_id: A.bank, to_account_id: null,
      source: null, notes: '', location: '', receipt_path: null, occurred_at: d.toISOString(), ...extra
    })
  }
  const foodSpots = [
    { merchant: 'Zomato', subcategory: 'Delivery' }, { merchant: 'Swiggy', subcategory: 'Delivery' },
    { merchant: 'Starbucks', subcategory: 'Cafe' }, { merchant: 'BigBasket', subcategory: 'Groceries' },
    { merchant: 'Local cafe', subcategory: 'Cafe' }, { merchant: 'Biryani House', subcategory: 'Restaurant' }
  ]
  const trips = ['Bus', 'Auto', 'Petrol', 'Taxi', 'Train', 'Bike']
  for (let i = 0; i < 62; i++) {
    if (rnd() < 0.75) {
      const r = rnd()
      const spot = pick(foodSpots)
      mk(i, 'expense', Math.round((90 + rnd() * 420) / 10) * 10, 'Food', r < 0.5 ? { ...spot } : r < 0.75 ? { ...spot, payment_method: 'Cash', account_id: A.cash } : { ...spot, payment_method: 'Wallet', account_id: A.wallet })
    }
    if (rnd() < 0.4) mk(i, 'expense', Math.round((40 + rnd() * 300) / 10) * 10, 'Travel', { subcategory: pick(trips), account_id: rnd() < 0.5 ? A.bank : A.cash, payment_method: 'UPI' })
    if (rnd() < 0.12) mk(i, 'expense', Math.round((300 + rnd() * 1500) / 10) * 10, 'Shopping', { merchant: pick(['Amazon', 'Myntra', 'Flipkart']), subcategory: pick(['Clothes', 'Electronics', 'Home']), payment_method: 'Card', account_id: A.credit })
    if (rnd() < 0.1) mk(i, 'expense', Math.round((200 + rnd() * 700) / 10) * 10, 'Entertainment', { merchant: 'PVR Cinemas', subcategory: 'Movies', payment_method: 'Card', account_id: A.credit })
    if (rnd() < 0.05) mk(i, 'expense', Math.round((200 + rnd() * 900) / 10) * 10, 'Healthcare', { merchant: 'Apollo Pharmacy', subcategory: 'Medicine', payment_method: 'Card', account_id: A.debit })
  }
  const thisFirst = now.getDate() - 1
  const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const lastFirst = thisFirst + daysIn(prev)
  mk(thisFirst, 'income', 85000, 'Income', { source: 'Salary', merchant: 'Employer', notes: 'Monthly salary', payment_method: 'Net Banking' })
  mk(lastFirst, 'income', 85000, 'Income', { source: 'Salary', merchant: 'Employer', notes: 'Monthly salary', payment_method: 'Net Banking' })
  mk(Math.max(0, thisFirst - 8), 'income', 12000, 'Income', { source: 'Freelance', notes: 'Logo project' })
  mk(Math.max(0, thisFirst - 2), 'expense', 18000, 'Rent', { notes: 'Monthly rent', payment_method: 'Net Banking' })
  mk(lastFirst - 2, 'expense', 18000, 'Rent', { notes: 'Monthly rent', payment_method: 'Net Banking' })
  mk(Math.max(0, 20), 'transfer', 5000, 'Transfer', { notes: 'Cash withdrawal', payment_method: 'Cash', account_id: A.bank, to_account_id: A.cash })
  mk(35, 'transfer', 14000, 'Transfer', { notes: 'Card bill payment', payment_method: 'Net Banking', account_id: A.bank, to_account_id: A.credit })

  const due = (d) => key(addDays(now, d))
  const nextMonthDay = (d) => key(new Date(now.getFullYear(), now.getMonth() + 1, d))
  return {
    transactions: out,
    accounts,
    budgets: [
      { id: uuid(), category: 'all', amount: 45000, rollover: true },
      { id: uuid(), category: 'Food', amount: 9000, rollover: false },
      { id: uuid(), category: 'Travel', amount: 4000, rollover: false }
    ],
    bills: [
      { id: uuid(), name: 'Netflix', amount: 649, kind: 'subscription', cycle: 'monthly', next_due: due(3), category: 'Subscriptions', account_id: A.credit, autopay: true, remind_days_before: 3, active: true },
      { id: uuid(), name: 'Electricity', amount: 1840, kind: 'bill', cycle: 'monthly', next_due: due(6), category: 'Bills', account_id: A.bank, autopay: false, remind_days_before: 5, active: true },
      { id: uuid(), name: 'Spotify', amount: 119, kind: 'subscription', cycle: 'monthly', next_due: due(11), category: 'Subscriptions', account_id: A.credit, autopay: true, remind_days_before: 2, active: true },
      { id: uuid(), name: 'Home loan EMI', amount: 12500, kind: 'emi', cycle: 'monthly', next_due: due(14), category: 'Bills', account_id: A.bank, autopay: true, remind_days_before: 3, active: true },
      { id: uuid(), name: 'Health insurance', amount: 9200, kind: 'insurance', cycle: 'yearly', next_due: due(40), category: 'Healthcare', account_id: A.bank, autopay: false, remind_days_before: 14, active: true }
    ],
    goals: [
      { id: uuid(), name: 'Emergency fund', kind: 'emergency', target_amount: 150000, saved_amount: 42000, target_date: null, is_wishlist: false },
      { id: uuid(), name: 'Goa trip', kind: 'goal', target_amount: 40000, saved_amount: 12500, target_date: due(120), is_wishlist: false },
      { id: uuid(), name: 'Noise-cancelling headphones', kind: 'goal', target_amount: 25000, saved_amount: 4000, target_date: null, is_wishlist: true }
    ],
    recurring: [
      { id: uuid(), type: 'income', amount: 85000, category: 'Income', source: 'Salary', merchant: 'Employer', account_id: A.bank, payment_method: 'Net Banking', notes: 'Monthly salary', frequency: 'monthly', next_run: nextMonthDay(1), active: true },
      { id: uuid(), type: 'expense', amount: 18000, category: 'Rent', merchant: '', account_id: A.bank, payment_method: 'Net Banking', notes: 'Monthly rent', frequency: 'monthly', next_run: nextMonthDay(3), active: true }
    ]
  }
}
