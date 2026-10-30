import { useRef, useState } from 'react'
import { Bell, Download, FileText, LogOut, Moon, RotateCcw, ShieldCheck, Sun, Upload } from 'lucide-react'
import Screen from '../components/Screen'
import Sheet from '../components/Sheet'
import { useAuth } from '../context/AuthContext'
import { useData } from '../context/DataContext'
import { useSettings } from '../context/SettingsContext'
import { CURRENCIES } from '../lib/constants'
import { hashPin } from '../lib/theme'
import { addMonths, between, byCategory, exp, inc, newest, startOfMonth, sum } from '../lib/stats'

function download(name, text, type) {
  const url = URL.createObjectURL(new Blob([text], { type }))
  const a = Object.assign(document.createElement('a'), { href: url, download: name })
  a.click()
  URL.revokeObjectURL(url)
}

const Row = ({ icon: Icon, children, onClick, tone = '', right }) => (
  <button onClick={onClick} className={`card w-full flex items-center gap-3 px-5 py-4 text-sm text-left tap ${tone}`}>
    <Icon size={18} className={tone ? '' : 'text-accent'} /><span className="flex-1">{children}</span>{right}
  </button>
)
const Toggle = ({ on }) => <span className={`h-6 w-11 rounded-full p-0.5 shrink-0 ${on ? 'bg-accent' : 'bg-fg/15'}`}><span className={`block h-5 w-5 rounded-full transition-transform ${on ? 'translate-x-5 bg-onaccent' : 'bg-fg'}`} /></span>

export default function Profile({ onBack }) {
  const { user, demo, signOut } = useAuth()
  const data = useData()
  const s = useSettings()
  const [busy, setBusy] = useState(false)
  const [pinSheet, setPinSheet] = useState(false)
  const [pin, setPin] = useState('')
  const [msg, setMsg] = useState('')
  const fileRef = useRef(null)
  const { transactions } = data

  const csv = () => {
    const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`
    const nm = (id) => data.accounts.find((a) => a.id === id)?.nickname || ''
    const head = ['date', 'type', 'amount', 'category', 'subcategory', 'merchant', 'account', 'to_account', 'payment_method', 'source', 'notes', 'location']
    const rows = [...transactions].sort(newest).map((t) => [t.occurred_at, t.type, t.amount, t.category, t.subcategory, t.merchant, nm(t.account_id), nm(t.to_account_id), t.payment_method, t.source, t.notes, t.location].map(esc).join(','))
    download(`vault-transactions-${new Date().toISOString().slice(0, 10)}.csv`, [head.join(','), ...rows].join('\n'), 'text/csv')
  }

  const pdf = async () => {
    setBusy(true)
    try {
      const { jsPDF } = await import('jspdf')
      const now = new Date()
      const tx = transactions.filter((t) => between(t, startOfMonth(now), addMonths(now, 1))).sort(newest)
      const doc = new jsPDF()
      let y = 20
      const line = (t, size = 10, gap = 6) => { if (y > 280) { doc.addPage(); y = 20 } doc.setFontSize(size); doc.text(t, 14, y); y += gap }
      line('FinFlow - Monthly report', 18, 10)
      line(now.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }), 11, 10)
      line(`Income: ${Math.round(sum(inc(tx)))}`, 11)
      line(`Expenses: ${Math.round(sum(exp(tx)))}`, 11)
      line(`Net: ${Math.round(sum(inc(tx)) - sum(exp(tx)))}`, 11, 10)
      line('By category', 13, 8)
      byCategory(tx).forEach((c) => line(`${c.name}: ${Math.round(c.value)}`))
      y += 6
      line('Transactions', 13, 8)
      tx.forEach((t) => line(`${new Date(t.occurred_at).toLocaleDateString('en-IN')}  ${t.type.padEnd(8)} ${Math.round(t.amount)}  ${t.merchant || t.category}${t.notes ? ' - ' + t.notes : ''}`.slice(0, 95), 9, 5))
      doc.save(`vault-report-${now.getFullYear()}-${now.getMonth() + 1}.pdf`)
    } finally { setBusy(false) }
  }

  const backup = () => {
    const { transactions: t, budgets, accounts, bills, goals, recurring } = data
    download(`vault-backup-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify({ app: 'finflow', version: 2, transactions: t, budgets, accounts, bills, goals, recurring }, null, 2), 'application/json')
  }
  const restore = async (e) => {
    const f = e.target.files?.[0]
    if (!f) return
    try {
      const o = JSON.parse(await f.text())
      if (!['vault', 'finflow'].includes(o.app) || !Array.isArray(o.transactions)) throw new Error()
      if (window.confirm('Replace everything on this device with this backup?')) { data.restore(o); setMsg('Backup restored.') }
    } catch { setMsg('That file is not a FinFlow backup.') }
    e.target.value = ''
  }

  const toggleRemind = async () => {
    if (s.remind) return s.set('remind', false)
    if (!('Notification' in window)) return setMsg('This browser does not support notifications.')
    const p = Notification.permission === 'granted' ? 'granted' : await Notification.requestPermission()
    if (p === 'granted') { s.set('remind', true); setMsg('Reminders on. You will be nudged about due bills when FinFlow is open.') }
    else setMsg('Notifications are blocked. Allow them in your browser settings.')
  }
  const savePin = () => { if (/^\d{4}$/.test(pin)) { s.set('pin', hashPin(pin)); setPin(''); setPinSheet(false); setMsg('PIN lock is on.') } }

  return (
    <Screen title="Profile" onBack={onBack}>
      <div className="card p-5 flex items-center gap-4 mb-6">
        <div className="h-14 w-14 rounded-full bg-accent/15 text-accent grid place-items-center font-display text-2xl font-semibold">{(user?.name || user?.email || 'F')[0].toUpperCase()}</div>
        <div className="min-w-0"><p className="font-medium truncate">{user?.name || user?.email}</p>{user?.name && <p className="text-xs text-mute truncate">{user.email}</p>}<p className="text-xs text-mute">{demo ? 'On-device profile · data stays on this phone' : `${transactions.length} transactions synced`}</p></div>
      </div>

      <div className="space-y-2">
        <h2 className="font-display text-2xl font-semibold">Preferences</h2>
        <Row icon={s.theme === 'dark' ? Moon : Sun} onClick={() => s.set('theme', s.theme === 'dark' ? 'light' : 'dark')} right={<Toggle on={s.theme === 'dark'} />}>Dark mode</Row>
        <div className="card px-5 py-4">
          <p className="text-sm mb-3">Currency</p>
          <div className="flex gap-2 overflow-x-auto -mx-1 px-1">{CURRENCIES.map((c) => <button key={c} onClick={() => s.set('currency', c)} className={`chip ${s.currency === c ? 'chip-on' : ''}`}>{c}</button>)}</div>
          <p className="text-[11px] text-mute mt-2">Changes the symbol only. Amounts are not converted.</p>
        </div>
        <Row icon={Bell} onClick={toggleRemind} right={<Toggle on={s.remind} />}>Bill reminders</Row>
        <Row icon={ShieldCheck} onClick={() => (s.pin ? s.set('pin', null) : setPinSheet(true))} right={<Toggle on={Boolean(s.pin)} />}>App lock (4-digit PIN)</Row>
      </div>

      <div className="space-y-2 mt-6">
        <h2 className="font-display text-2xl font-semibold">Your data</h2>
        <Row icon={Download} onClick={csv}>Export transactions (CSV)</Row>
        <Row icon={FileText} onClick={pdf}>{busy ? 'Building report…' : 'Monthly report (PDF)'}</Row>
        <Row icon={Download} onClick={backup}>Backup everything (JSON)</Row>
        {demo && <Row icon={Upload} onClick={() => fileRef.current?.click()}>Restore from backup</Row>}
        <input ref={fileRef} type="file" accept="application/json" hidden onChange={restore} />
        {demo && <Row icon={RotateCcw} onClick={() => window.confirm(user?.id === 'demo' ? 'Replace this with fresh sample data?' : 'Erase all data in this profile?') && data.resetDemo()}>{user?.id === 'demo' ? 'Reset sample data' : 'Erase all data on this device'}</Row>}
        {!demo && <p className="text-xs text-mute px-1">Cloud data is stored in your Supabase project. Backups here are for your own safekeeping.</p>}
      </div>

      {msg && <p role="status" className="text-sm text-accent mt-4">{msg}</p>}
      <div className="mt-6"><Row icon={LogOut} tone="text-bad" onClick={() => window.confirm('Sign out of FinFlow?') && signOut()}>Sign out</Row></div>
      <p className="text-[11px] text-mute text-center mt-6">FinFlow 0.2</p>

      <Sheet open={pinSheet} onClose={() => setPinSheet(false)} title="Set a PIN">
        <p className="text-sm text-mute mb-3">FinFlow asks for it when you open the app. It is a screen lock on this device, not encryption.</p>
        <input inputMode="numeric" maxLength={4} aria-label="PIN" className="field text-center text-3xl tracking-[0.5em]" value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))} />
        <button className="btn w-full mt-5" disabled={pin.length !== 4} onClick={savePin}>Turn on lock</button>
      </Sheet>
    </Screen>
  )
}
