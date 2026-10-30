import { motion } from 'framer-motion'
import { ChevronLeft } from 'lucide-react'

// Full-page sub screen with back button. Fade + slide in.
export default function Screen({ title, onBack, right, children }) {
  return (
    <motion.div initial={{ x: 36, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ type: 'spring', damping: 30, stiffness: 320 }}
      className="px-5 pt-[max(1.25rem,env(safe-area-inset-top))] pb-8">
      <header className="flex items-center gap-1 mb-5">
        <button aria-label="Back" onClick={onBack} className="-ml-2 p-2 rounded-full active:bg-raised"><ChevronLeft size={24} /></button>
        <h1 className="font-display text-3xl font-semibold flex-1 leading-none">{title}</h1>
        {right}
      </header>
      {children}
    </motion.div>
  )
}
