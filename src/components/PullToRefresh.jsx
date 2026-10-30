import { useEffect, useRef, useState } from 'react'
import { RefreshCw } from 'lucide-react'

// Pull down from the top of the page to refresh.
export default function PullToRefresh({ onRefresh, children }) {
  const [pull, setPull] = useState(0)
  const [busy, setBusy] = useState(false)
  const start = useRef(null)
  const cur = useRef(0)

  useEffect(() => {
    const ts = (e) => { if (window.scrollY <= 0 && !document.querySelector('[role=dialog]')) start.current = e.touches[0].clientY }
    const tm = (e) => {
      if (start.current == null) return
      const dy = e.touches[0].clientY - start.current
      if (dy > 0 && window.scrollY <= 0) { cur.current = Math.min(dy * 0.45, 80); setPull(cur.current) }
      else { start.current = null; cur.current = 0; setPull(0) }
    }
    const te = async () => {
      if (start.current == null) return
      start.current = null
      if (cur.current >= 56) { setBusy(true); setPull(48); try { await onRefresh() } finally { setBusy(false) } }
      cur.current = 0; setPull(0)
    }
    window.addEventListener('touchstart', ts, { passive: true })
    window.addEventListener('touchmove', tm, { passive: true })
    window.addEventListener('touchend', te)
    return () => { window.removeEventListener('touchstart', ts); window.removeEventListener('touchmove', tm); window.removeEventListener('touchend', te) }
  }, [onRefresh])

  return (
    <div>
      {(pull > 0 || busy) && (
        <div className="fixed top-0 z-30 pointer-events-none" style={{ left: '50%', transform: `translate(-50%, ${pull - 40}px)`, opacity: Math.min(1, pull / 56) }}>
          <div className="mt-[env(safe-area-inset-top)] h-9 w-9 rounded-full bg-card shadow-soft grid place-items-center text-accent">
            <RefreshCw size={16} className={busy ? 'animate-spin' : ''} style={busy ? undefined : { transform: `rotate(${pull * 4}deg)` }} />
          </div>
        </div>
      )}
      <div style={{ transform: pull ? `translateY(${pull * 0.5}px)` : undefined, transition: pull ? 'none' : 'transform .25s' }}>{children}</div>
    </div>
  )
}
