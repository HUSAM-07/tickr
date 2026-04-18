"use client"

import { useEffect, useRef } from "react"
import gsap from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger)
}

type Props = {
  children: React.ReactNode
  className?: string
  /** Y translate in pixels before reveal. Default 24. */
  y?: number
  /** Animation duration. Default 0.7. */
  duration?: number
  /** Stagger between direct children (e.g. cards). Default 0 (treat as single block). */
  stagger?: number
  /** Selector that gsap uses when `stagger > 0`. Defaults to direct children. */
  staggerSelector?: string
  /** Delay before the reveal starts. Default 0. */
  delay?: number
}

/**
 * Fades + slides its children into view once per page load when the top of
 * the element reaches 85% of the viewport. If `stagger` > 0, direct children
 * matching `staggerSelector` reveal sequentially instead of as a single
 * block — ideal for card grids.
 *
 * Uses `prefers-reduced-motion` — users with the OS toggle see the final
 * state immediately with no animation.
 */
export function ScrollReveal({
  children,
  className,
  y = 24,
  duration = 0.7,
  stagger = 0,
  staggerSelector,
  delay = 0,
}: Props) {
  const ref = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    if (reduce) return

    // For the default stagger case we want *direct children* — CSS's native
    // `> *` selector isn't valid in `querySelectorAll` without a `:scope`
    // prefix, so fall back to the element's own `.children` when no explicit
    // selector is given. Any caller-supplied selector is passed through as-is.
    const targets: ArrayLike<HTMLElement> =
      stagger > 0
        ? staggerSelector
          ? el.querySelectorAll<HTMLElement>(staggerSelector)
          : (Array.from(el.children) as HTMLElement[])
        : [el]
    if (!targets || targets.length === 0) return

    gsap.set(targets, { opacity: 0, y })

    const tween = gsap.to(targets, {
      opacity: 1,
      y: 0,
      duration,
      ease: "power2.out",
      stagger: stagger || 0,
      delay,
      scrollTrigger: {
        trigger: el,
        start: "top 85%",
        once: true,
      },
    })

    return () => {
      tween.scrollTrigger?.kill()
      tween.kill()
    }
  }, [y, duration, stagger, staggerSelector, delay])

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  )
}
