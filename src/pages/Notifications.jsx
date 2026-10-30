import { useMemo } from 'react'
import { AlertTriangle, BellRing, CheckCircle2, Info } from 'lucide-react'
import Screen from '../components/Screen'
import { useData } from '../context/DataContext'
import { accountStats } from '../lib/wallet'
import { buildAlerts } from '../lib/alerts'

const ICON = { bad: AlertTriangle, warn: BellRing, info: Info, good: CheckCircle2 }
const TONE = { bad: 'bg-bad/10 text-bad', warn: 'bg-warn/10 text-warn', info: 'bg-accent/10 text-accent', good: 'bg-good/10 text-good' }

export default function Notifications({ onBack, go }) {
  const data = useData()
  const alerts = useMemo(() => buildAlerts(data, accountStats(data.accounts, data.transactions)), [data.transactions, data.budgets, data.accounts, data.bills, data.goals])
  return (
    <Screen title="Alerts" onBack={onBack}>
      {alerts.length === 0 && <p className="text-sm text-mute py-16 text-center">All clear. Budgets are healthy and no bills are close.</p>}
      <div className="space-y-3">
        {alerts.map((a) => {
          const I = ICON[a.level]
          return (
            <button key={a.id} onClick={() => go(a.go)} className="card w-full p-4 flex items-start gap-3 text-left tap">
              <span className={`h-10 w-10 rounded-2xl grid place-items-center shrink-0 ${TONE[a.level]}`}><I size={18} /></span>
              <span><span className="block text-sm font-medium">{a.title}</span><span className="block text-xs text-mute mt-0.5">{a.body}</span></span>
            </button>
          )
        })}
      </div>
      <p className="text-[11px] text-mute text-center mt-6">Alerts are worked out live from your budgets, bills and cards.</p>
    </Screen>
  )
}
