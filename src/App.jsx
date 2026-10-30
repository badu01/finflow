import { Suspense, lazy, useCallback, useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { useAuth } from './context/AuthContext'
import { useData } from './context/DataContext'
import { useSettings } from './context/SettingsContext'
import BottomNav from './components/BottomNav'
import AddTransactionSheet from './components/AddTransactionSheet'
import PullToRefresh from './components/PullToRefresh'
import LockScreen from './components/LockScreen'
import TxDetailSheet from './components/TxDetailSheet'
import { accountStats } from './lib/wallet'
import { buildAlerts } from './lib/alerts'
import { key } from './lib/stats'

const pages = {
  home: lazy(() => import('./pages/Home')),
  transactions: lazy(() => import('./pages/Transactions')),
  calendar: lazy(() => import('./pages/Calendar')),
  analytics: lazy(() => import('./pages/Analytics')),
  wallet: lazy(() => import('./pages/Wallet'))
}
const screens = {
  bills: lazy(() => import('./pages/Bills')),
  goals: lazy(() => import('./pages/Goals')),
  budgets: lazy(() => import('./pages/Budgets')),
  insights: lazy(() => import('./pages/Insights')),
  notifications: lazy(() => import('./pages/Notifications')),
  search: lazy(() => import('./pages/Search')),
  profile: lazy(() => import('./pages/Profile'))
}
const Login = lazy(() => import('./pages/Login'))

const Splash = () => (
  <div className="min-h-dvh grid place-items-center"><p className="font-finflow text-4xl text-accent animate-pulse">Finflow</p></div>
)

export default function App() {
  const auth = useAuth()
  const { user, ready } = auth
  const data = useData()
  const settings = useSettings()
  const [tab, setTab] = useState('home')
  const [screen, setScreen] = useState(null)
  const [tx, setTx] = useState({ open: false, initial: null, type: 'expense' })
  const [locked, setLocked] = useState(Boolean(settings.pin))
  const [detail, setDetail] = useState(null)

  // fresh start for whoever signs in next
  useEffect(() => { setScreen(null); setTab('home'); setDetail(null) }, [user?.id])

  // Re-lock after the app has been in the background for a minute.
  useEffect(() => {
    if (!settings.pin) return
    let hiddenAt = 0
    const f = () => {
      if (document.hidden) hiddenAt = Date.now()
      else if (hiddenAt && Date.now() - hiddenAt > 60000) setLocked(true)
    }
    document.addEventListener('visibilitychange', f)
    return () => document.removeEventListener('visibilitychange', f)
  }, [settings.pin])

  // Gentle browser reminders for due bills and budgets, once per day, while FinFlow is open.
  const alerts = useMemo(() => (data.loading ? [] : buildAlerts(data, accountStats(data.accounts, data.transactions))), [data.loading, data.transactions, data.budgets, data.accounts, data.bills, data.goals])
  useEffect(() => {
    if (!settings.remind || !('Notification' in window) || Notification.permission !== 'granted' || data.loading) return
    const today = key(new Date())
    if (localStorage.getItem('vault-notified') === today) return
    const hot = alerts.filter((a) => a.level === 'bad' || a.level === 'warn').slice(0, 3)
    hot.forEach((a) => new Notification(a.title, { body: a.body, icon: '/icon.svg' }))
    if (hot.length) localStorage.setItem('vault-notified', today)
  }, [alerts, settings.remind, data.loading])

  const refresh = useCallback(() => data.refresh(), [data.refresh])

  if (!ready) return <Splash />
  if (!user || auth.recovery) return <Suspense fallback={<Splash />}><Login /></Suspense>
  if (data.loading) return <Splash />
  if (locked && settings.pin) return <LockScreen pinHash={settings.pin} onUnlock={() => setLocked(false)} />

  const add = (type = 'expense', prefill) => setTx({ open: true, initial: prefill ? { type, ...prefill } : null, type })
  const edit = (t) => { setDetail(null); setTx({ open: true, initial: t, type: t.type }) }
  const go = (id) => { if (pages[id]) { setScreen(null); setTab(id) } else setScreen(id) }
  const toTab = (id) => { setScreen(null); setTab(id) }

  const Screenc = screen ? screens[screen] : null
  const Page = pages[tab]
  const common = { go, onAdd: add, onEdit: edit, onOpen: (t) => setDetail(t.id), onBack: () => setScreen(null) }
  const detailTx = detail ? data.transactions.find((t) => t.id === detail) : null

  return (
    <div key={settings.currency} className="max-w-md mx-auto min-h-dvh pb-32">
      <PullToRefresh onRefresh={refresh}>
        <Suspense fallback={<Splash />}>
          <motion.main key={screen || tab} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.22 }}>
            {Screenc ? <Screenc {...common} /> : <Page {...common} />}
          </motion.main>
        </Suspense>
      </PullToRefresh>
      <BottomNav tab={screen ? null : tab} onTab={toTab} />
      <TxDetailSheet tx={detailTx} onClose={() => setDetail(null)} onEdit={edit} />
      <AddTransactionSheet open={tx.open} initial={tx.initial} defaultType={tx.type} onClose={() => setTx((s) => ({ ...s, open: false }))} />
    </div>
  )
}
