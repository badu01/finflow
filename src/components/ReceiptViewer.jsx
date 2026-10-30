import { X } from 'lucide-react'
import { useReceipt } from '../lib/receipts'

export default function ReceiptViewer({ path, onClose }) {
  const r = useReceipt(path)
  return (
    <div className="fixed inset-0 z-[70] bg-black/95 flex flex-col text-white" role="dialog" aria-label="Receipt">
      <div className="flex items-center justify-between px-5 pt-[max(1rem,env(safe-area-inset-top))] pb-3">
        <p className="text-sm">Receipt</p>
        <div className="flex items-center gap-3">
          {r.url && <a href={r.url} target="_blank" rel="noreferrer" className="text-sm text-accent">Open in new tab</a>}
          <button onClick={onClose} aria-label="Close" className="h-10 w-10 grid place-items-center rounded-full bg-white/10"><X size={18} /></button>
        </div>
      </div>
      <div className="flex-1 overflow-auto grid place-items-center p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
        {r.loading && <p className="text-sm text-white/60">Loading…</p>}
        {r.error && <p className="text-sm text-white/60">Could not load this receipt. It may have been removed.</p>}
        {r.url && r.type === 'application/pdf' && <a href={r.url} target="_blank" rel="noreferrer" className="btn">Open PDF</a>}
        {r.url && r.type !== 'application/pdf' && <img src={r.url} alt="Receipt" className="max-w-full max-h-full object-contain rounded-xl" />}
      </div>
    </div>
  )
}
