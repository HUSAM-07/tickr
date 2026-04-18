"use client"

import { useEffect, useRef } from "react"
import gsap from "gsap"

type Props = {
  value: number
  /** Decimal places to show in the rendered string. Default 2. */
  decimals?: number
  /** Sign prefix — "always" shows a "+" for positives, "never" hides all signs. */
  sign?: "auto" | "always" | "never"
  /** Duration of the tween in seconds. Default 0.6. */
  duration?: number
  /** Easing curve. Default "power2.out". */
  ease?: string
  className?: string
  /** Optional prefix (e.g. "$"). Rendered verbatim, outside the tween. */
  prefix?: string
  /** Optional suffix (e.g. "×" or "%"). Rendered verbatim, outside the tween. */
  suffix?: string
}

/**
 * Renders a numeric value that tweens smoothly whenever `value` changes.
 *
 * The first render shows the target value immediately (no tween from zero) —
 * we only animate *transitions*, so mounting doesn't visually "count up" from
 * nothing unless the user explicitly hands us a 0-initial prop flow.
 *
 * Implementation detail: we skip React state entirely in the render loop and
 * write straight to the DOM via `textContent`. That's the point — React
 * re-rendering 60 times a second would defeat the purpose of a tween.
 */
export function AnimatedNumber({
  value,
  decimals = 2,
  sign = "auto",
  duration = 0.6,
  ease = "power2.out",
  className,
  prefix,
  suffix,
}: Props) {
  const ref = useRef<HTMLSpanElement | null>(null)
  const currentRef = useRef<number>(value)
  const formatRef = useRef<(n: number) => string>(() => "")

  formatRef.current = (n: number) => {
    const abs = Math.abs(n).toFixed(decimals)
    const s =
      sign === "never"
        ? ""
        : sign === "always"
          ? n >= 0
            ? "+"
            : "-"
          : n < 0
            ? "-"
            : ""
    return `${s}${prefix ?? ""}${abs}${suffix ?? ""}`
  }

  // Initial paint — render the target value directly.
  useEffect(() => {
    if (ref.current) {
      ref.current.textContent = formatRef.current(value)
      currentRef.current = value
    }
    // run-once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Tween on subsequent updates.
  useEffect(() => {
    if (!ref.current) return
    if (currentRef.current === value) return
    const obj = { n: currentRef.current }
    const tween = gsap.to(obj, {
      n: value,
      duration,
      ease,
      onUpdate: () => {
        if (ref.current) ref.current.textContent = formatRef.current(obj.n)
      },
      onComplete: () => {
        currentRef.current = value
      },
    })
    return () => {
      tween.kill()
      currentRef.current = value
      if (ref.current) ref.current.textContent = formatRef.current(value)
    }
  }, [value, duration, ease])

  return <span ref={ref} className={className} />
}
