import { motion } from 'framer-motion'
import { House, ListOrdered, CalendarDays, ChartPie, Wallet } from 'lucide-react'

export const TABS = [
  { id: 'home', label: 'Home', icon: House },
  { id: 'transactions', label: 'Activity', icon: ListOrdered },
  { id: 'calendar', label: 'Calendar', icon: CalendarDays },
  { id: 'analytics', label: 'Analytics', icon: ChartPie },
  { id: 'wallet', label: 'Wallet', icon: Wallet }
]

// Five equal columns. Every tab: same height, icon centred in a fixed pill, label on one line.
export default function BottomNav({ tab, onTab }) {
  return (
    <nav aria-label="Primary" className="fixed bottom-0 inset-x-0 z-40">
      <div className="mx-auto w-full max-w-md bg-card border-t border-fg/5 rounded-t-[28px] px-2 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
        <div className="grid grid-cols-5">
          {TABS.map(({ id, label, icon: Icon }) => {
            const on = tab === id
            return (
              <button key={id} onClick={() => onTab(id)} aria-label={label} aria-current={on ? 'page' : undefined}
                className={`flex flex-col items-center justify-center gap-1 h-14 ${on ? 'text-accent' : 'text-mute'}`}>
                <span className="relative grid place-items-center h-8 w-14">
                  {on && <motion.span layoutId="nav-pill" className="absolute inset-0 rounded-full bg-accent/15" transition={{ type: 'spring', damping: 28, stiffness: 400 }} />}
                  <Icon size={21} strokeWidth={on ? 2.3 : 1.8} className="relative" />
                </span>
                <span className="text-[11px] leading-none">{label}</span>
              </button>
            )
          })}
        </div>
      </div>
    </nav>
  )
}
