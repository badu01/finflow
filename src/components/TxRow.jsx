import { useState } from 'react'
import { motion } from 'framer-motion'
import { ArrowDownLeft, ArrowLeftRight, Copy, Paperclip, Pencil, Trash2 } from 'lucide-react'
import { ACCOUNT_KINDS, catMeta } from '../lib/constants'
import { inr, timeLabel } from '../lib/format'
import { payLabel } from '../lib/wallet'
import { useData } from '../context/DataContext'

function Avatar({ tx }) {
  if (tx.type === 'income') return <div className="h-11 w-11 rounded-2xl bg-good/15 text-good grid place-items-center shrink-0"><ArrowDownLeft size={19} /></div>
  if (tx.type === 'transfer') return <div className="h-11 w-11 rounded-2xl bg-raised text-mute grid place-items-center shrink-0"><ArrowLeftRight size={18} /></div>
  const m = catMeta(tx.category)
  const Icon = m.icon
  return <div className="h-11 w-11 rounded-2xl grid place-items-center shrink-0" style={{ background: m.color + '22', color: m.color }}><Icon size={19} /></div>
}

// Tap = open details. Swipe left = Edit / Duplicate / Delete.
export default function TxRow({ tx, onOpen, onEdit, onDuplicate, onDelete, swipe = true }) {
  const { accounts } = useData()
  const [open, setOpen] = useState(false)
  const acct = (id) => accounts.find((a) => a.id === id)
  const from = acct(tx.account_id), to = acct(tx.to_account_id)
  const short = (a) => a && a.nickname + (a.last4 ? ` ••${a.last4}` : '')

  const title = tx.type === 'transfer' ? 'Transfer' : tx.merchant || (tx.type === 'income' ? tx.source || 'Income' : tx.category)
  const what = tx.type === 'expense' ? [tx.category, tx.subcategory].filter(Boolean).join(' · ') : tx.type === 'income' ? tx.source : tx.notes
  const sub = [what, timeLabel(tx.occurred_at)].filter(Boolean).join(' · ')
  const via = tx.type === 'transfer' ? [short(from), short(to)].filter(Boolean).join(' → ') : payLabel(tx, from)
  const ViaIcon = tx.type === 'transfer' ? ArrowLeftRight : from ? ACCOUNT_KINDS[from.kind].icon : null
  const sign = tx.type === 'income' ? '+' : tx.type === 'expense' ? '−' : ''

  const row = (
    <div onClick={swipe ? undefined : () => onOpen?.(tx)} role={!swipe && onOpen ? 'button' : undefined} className={`flex items-center gap-3 bg-ink px-1 py-3 ${!swipe && onOpen ? 'cursor-pointer' : ''}`}>
      <Avatar tx={tx} />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium truncate">{title}{tx.receipt_path && <Paperclip size={12} className="inline ml-1.5 -mt-0.5 text-mute" aria-label="Has receipt" />}</p>
                <p className="text-xs text-mute truncate">{sub}{tx.type === 'expense' && tx.counts_toward_budget === false && <span className="ml-1.5 rounded-full bg-raised px-1.5 py-0.5 text-[10px]">Outside budget</span>}</p>
        {via && <p className="text-[11px] text-accent truncate flex items-center gap-1 mt-0.5">{ViaIcon && <ViaIcon size={11} className="shrink-0" />}<span className="truncate">{via}</span></p>}
      </div>
      <p className={`text-sm font-semibold tabular-nums ${tx.type === 'income' ? 'text-good' : ''}`}>{sign}{inr(tx.amount)}</p>
    </div>
  )
  if (!swipe) return row
  return (
    <div className="relative overflow-hidden">
      <div className="absolute inset-y-0 right-0 flex items-stretch">
        <button aria-label="Edit" onClick={() => { setOpen(false); onEdit(tx) }} className="w-12 grid place-items-center bg-raised"><Pencil size={17} /></button>
        <button aria-label="Duplicate" onClick={() => { setOpen(false); onDuplicate(tx) }} className="w-12 grid place-items-center bg-accent/80 text-onaccent"><Copy size={17} /></button>
        <button aria-label="Delete" onClick={() => onDelete(tx)} className="w-12 grid place-items-center bg-bad text-onaccent"><Trash2 size={17} /></button>
      </div>
      <motion.div drag="x" dragConstraints={{ left: -144, right: 0 }} dragElastic={0.04}
        animate={{ x: open ? -144 : 0 }} transition={{ type: 'spring', damping: 30, stiffness: 400 }}
        onTap={() => { if (open) setOpen(false); else onOpen?.(tx) }}
        onDragEnd={(_, i) => setOpen(i.offset.x < -50 || i.velocity.x < -400)} className="relative cursor-pointer">
        {row}
      </motion.div>
    </div>
  )
}
