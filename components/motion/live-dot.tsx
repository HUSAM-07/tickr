"use client"

import { useEffect, useRef } from "react"
import gsap from "gsap"

type Props = {
  /** True = green breathing dot. False = gray static dot. */
  active: boolean
  className?: string
}

/**
 * A tiny status dot that pulses while `active` is true. When inactive it
 * collapses to a muted-gray static dot — useful as a WebSocket connection
 * indicator. Runs a single infinite GSAP timeline per mount.
 */
export function LiveDot({ active, className }: Props) {
  const ringRef = useRef<HTMLSpanElement | null>(null)
  const tlRef = useRef<gsap.core.Timeline | null>(null)

  useEffect(() => {
    const ring = ringRef.current
    if (!ring) return
    if (active) {
      gsap.set(ring, { scale: 1, opacity: 0.6 })
      const tl = gsap.timeline({ repeat: -1 })
      tl.to(ring, { scale: 2.2, opacity: 0, duration: 1.4, ease: "power1.out" })
      tlRef.current = tl
    } else {
      gsap.set(ring, { scale: 1, opacity: 0 })
    }
    return () => {
      tlRef.current?.kill()
      tlRef.current = null
    }
  }, [active])

  return (
    <span className={`relative inline-flex h-2 w-2 items-center justify-center ${className ?? ""}`}>
      <span
        ref={ringRef}
        className={
          "absolute inset-0 rounded-full " +
          (active ? "bg-[color:var(--color-brand-green)]" : "bg-muted-foreground")
        }
      />
      <span
        className={
          "relative inline-block h-2 w-2 rounded-full " +
          (active ? "bg-[color:var(--color-brand-green)]" : "bg-muted-foreground")
        }
      />
    </span>
  )
}
