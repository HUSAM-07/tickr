"use client"

import { useEffect, useRef } from "react"
import gsap from "gsap"

type Props = {
  children: React.ReactNode
  className?: string
  /** X translate in px before reveal. Default 16 (comes from the right). */
  x?: number
  /** Y translate in px before reveal. Default 0. */
  y?: number
  /** Starting scale. Default 0.96. */
  scale?: number
  /** Animation duration in seconds. Default 0.4. */
  duration?: number
}

/**
 * Mount-only slide-in. Plays a single tween when the component first appears,
 * then does nothing. Pair with a React `key` to re-trigger on replacement
 * (e.g. `<SlideIn key={activeBet?.id}>...</SlideIn>`).
 *
 * Respects `prefers-reduced-motion` — falls back to an instant show.
 */
export function SlideIn({
  children,
  className,
  x = 16,
  y = 0,
  scale = 0.96,
  duration = 0.4,
}: Props) {
  const ref = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    if (reduce) {
      gsap.set(el, { opacity: 1, x: 0, y: 0, scale: 1 })
      return
    }
    gsap.fromTo(
      el,
      { opacity: 0, x, y, scale },
      { opacity: 1, x: 0, y: 0, scale: 1, duration, ease: "back.out(1.6)" }
    )
  }, [x, y, scale, duration])

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  )
}
