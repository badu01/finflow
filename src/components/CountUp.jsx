import { useEffect, useRef, useState } from 'react'
import { animate, useReducedMotion } from 'framer-motion'
import { inr } from '../lib/format'

export default function CountUp({ value, format = inr }) {
  const reduce = useReducedMotion()
  const [v, setV] = useState(reduce ? value : 0)
  const prev = useRef(reduce ? value : 0)
  useEffect(() => {
    if (reduce) { setV(value); return }
    const c = animate(prev.current, value, { duration: 0.9, ease: [0.22, 1, 0.36, 1], onUpdate: setV })
    prev.current = value
    return () => c.stop()
  }, [value, reduce])
  return <>{format(v)}</>
}
