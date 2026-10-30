import { useData } from '../context/DataContext'
import { ACCOUNT_KINDS } from '../lib/constants'

// Horizontal chips of the user's banks / cards / wallets. Use inside a Sheet (px-6).
export default function AccountPicker({ value, onChange, exclude, allowNone = true, noneLabel = 'Not tracked', kinds }) {
  const { accounts } = useData()
  const list = accounts.filter((a) => a.id !== exclude && (!kinds || kinds.includes(a.kind)))
  if (!accounts.length) return <p className="text-xs text-mute bg-raised rounded-2xl px-4 py-3">Add a bank account or card in Wallet to track where money moves.</p>
  return (
    <div className="flex gap-2 overflow-x-auto -mx-6 px-6 pb-1">
      {allowNone && <button type="button" onClick={() => onChange(null)} className={`chip ${!value ? 'chip-on' : ''}`}>{noneLabel}</button>}
      {list.map((a) => {
        const K = ACCOUNT_KINDS[a.kind]
        const on = value === a.id
        return (
          <button type="button" key={a.id} onClick={() => onChange(a.id)} className={`chip flex items-center gap-2 ${on ? 'chip-on' : ''}`}>
            <K.icon size={14} />{a.nickname}{a.last4 && <span className="opacity-70">··{a.last4}</span>}
          </button>
        )
      })}
    </div>
  )
}
