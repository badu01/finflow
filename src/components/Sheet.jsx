import { useEffect, useState } from 'react'
import { AnimatePresence, motion, useDragControls } from 'framer-motion'
import { X } from 'lucide-react'

// Bottom sheet. Sized to the *visual* viewport so the iOS keyboard shrinks it instead of pushing it off screen,
// and the page behind is locked so it cannot scroll or jump.
export default function Sheet({ open, onClose, title, children }) {
  const controls = useDragControls()
  const [vv, setVv] = useState({ h: 0, top: 0 })

  useEffect(() => {
    if (!open) return
    const v = window.visualViewport
    const upd = () => setVv({ h: v ? v.height : window.innerHeight, top: v ? v.offsetTop : 0 })
    upd()
    v?.addEventListener('resize', upd)
    v?.addEventListener('scroll', upd)
    const y = window.scrollY
    const b = document.body
    const prev = b.getAttribute('style')
    b.style.cssText += `;position:fixed;top:-${y}px;left:0;right:0;overflow:hidden;`
    return () => {
      v?.removeEventListener('resize', upd)
      v?.removeEventListener('scroll', upd)
      if (prev === null) b.removeAttribute('style'); else b.setAttribute('style', prev)
      window.scrollTo(0, y)
    }
  }, [open])

  const onFocus = (e) => {
    const t = e.target
    if (/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)) setTimeout(() => t.scrollIntoView({ block: 'center', behavior: 'smooth' }), 320)
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed left-0 right-0 z-50 flex items-end justify-center" style={{ top: vv.top, height: vv.h || '100dvh' }}>
          <motion.div
            className="absolute inset-0 bg-black/70"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            role="dialog" aria-label={title}
            className="relative w-full max-w-md bg-card rounded-t-[32px] shadow-soft flex flex-col"
            style={{ maxHeight: vv.h ? vv.h * 0.94 : '92dvh' }}
            initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 32, stiffness: 320 }}
            drag="y" dragControls={controls} dragListener={false}
            dragConstraints={{ top: 0, bottom: 0 }} dragElastic={{ top: 0, bottom: 0.6 }}
            onDragEnd={(_, i) => { if (i.offset.y > 120 || i.velocity.y > 600) onClose() }}
          >
            <div className="pt-3 pb-1 touch-none cursor-grab" onPointerDown={(e) => controls.start(e)}>
              <div className="mx-auto h-1.5 w-10 rounded-full bg-fg/15" />
            </div>
            <div className="flex items-center justify-between px-6 pt-2 pb-3">
              <h2 className="font-display text-2xl font-semibold">{title}</h2>
              <button onClick={onClose} aria-label="Close" className="p-2 -mr-2 text-mute"><X size={20} /></button>
            </div>
            <div onFocusCapture={onFocus} className="overflow-y-auto overscroll-contain px-6 pb-[max(1.5rem,env(safe-area-inset-bottom))]">{children}</div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
