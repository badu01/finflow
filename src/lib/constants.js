import {
  Utensils, Plane, Clapperboard, ShoppingBag, ReceiptText, HeartPulse, GraduationCap, House, Repeat, Ellipsis,
  Landmark, CreditCard, Wallet, Banknote
} from 'lucide-react'

export const CATEGORIES = [
  { name: 'Food', icon: Utensils, color: '#F59E0B', subcategories: ['Restaurant', 'Cafe', 'Groceries', 'Delivery'] },
  { name: 'Travel', icon: Plane, color: '#60A5FA', subcategories: ['Bus', 'Auto', 'Bike', 'Petrol', 'Taxi', 'Train', 'Flight'] },
  { name: 'Entertainment', icon: Clapperboard, color: '#F472B6', subcategories: ['Movies', 'Games', 'Streaming'] },
  { name: 'Shopping', icon: ShoppingBag, color: '#A78BFA', subcategories: ['Clothes', 'Electronics', 'Home'] },
  { name: 'Bills', icon: ReceiptText, color: '#34D399', subcategories: ['Electricity', 'Water', 'Internet', 'Phone', 'Insurance', 'EMI'] },
  { name: 'Healthcare', icon: HeartPulse, color: '#FB7185', subcategories: ['Medicine', 'Doctor', 'Gym'] },
  { name: 'Education', icon: GraduationCap, color: '#22D3EE', subcategories: ['Courses', 'Books'] },
  { name: 'Rent', icon: House, color: '#FBBF24' },
  { name: 'Subscriptions', icon: Repeat, color: '#818CF8' },
  { name: 'Others', icon: Ellipsis, color: '#94A3B8', subcategories: ['Miscellaneous'] }
]
export const catMeta = (name) => CATEGORIES.find((c) => c.name === name) || CATEGORIES[CATEGORIES.length - 1]

export const INCOME_SOURCES = ['Salary', 'Freelance', 'Gift', 'Refund', 'Investment', 'Other']
export const PAY_METHODS = ['UPI', 'Card', 'Cash', 'Net Banking', 'Wallet']
export const QUICK_AMOUNTS = [100, 200, 500, 1000]

export const ACCOUNT_KINDS = {
  bank: { label: 'Bank account', plural: 'Bank accounts', icon: Landmark, method: 'UPI' },
  debit: { label: 'Debit card', plural: 'Debit cards', icon: CreditCard, method: 'Card' },
  credit: { label: 'Credit card', plural: 'Credit cards', icon: CreditCard, method: 'Card' },
  wallet: { label: 'Digital wallet', plural: 'Digital wallets', icon: Wallet, method: 'Wallet' },
  cash: { label: 'Cash', plural: 'Cash', icon: Banknote, method: 'Cash' }
}
export const WALLET_NAMES = ['Paytm', 'PhonePe', 'Google Pay', 'Amazon Pay']

export const BILL_KINDS = ['bill', 'subscription', 'emi', 'insurance', 'rent', 'other']
export const CYCLES = ['once', 'weekly', 'monthly', 'quarterly', 'yearly']
export const CURRENCIES = ['INR', 'USD', 'EUR', 'GBP', 'AED']

// Fixed palette for card faces. Text on them is always white, so every gradient stays dark.
export const CARD_THEMES = [
  { id: 'violet', name: 'Violet', bg: 'linear-gradient(135deg,#3b2a6b 0%,#171322 70%)' },
  { id: 'ocean', name: 'Ocean', bg: 'linear-gradient(135deg,#1f3a5f 0%,#101826 70%)' },
  { id: 'rose', name: 'Rose', bg: 'linear-gradient(135deg,#6b2442 0%,#1c1018 70%)' },
  { id: 'emerald', name: 'Emerald', bg: 'linear-gradient(135deg,#1d4a45 0%,#0f1c1b 70%)' },
  { id: 'sunset', name: 'Sunset', bg: 'linear-gradient(135deg,#7a3b1c 0%,#1f130d 70%)' },
  { id: 'gold', name: 'Gold', bg: 'linear-gradient(135deg,#6b5517 0%,#1a150a 70%)' },
  { id: 'midnight', name: 'Midnight', bg: 'linear-gradient(135deg,#1b2a7a 0%,#0b1020 70%)' },
  { id: 'graphite', name: 'Graphite', bg: 'linear-gradient(135deg,#43434b 0%,#121214 70%)' }
]
export const themeFor = (a, i = 0) => CARD_THEMES.find((t) => t.id === a?.color) || CARD_THEMES[i % 4]
