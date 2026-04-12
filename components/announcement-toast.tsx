"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import { X, Info } from "lucide-react"

const DISMISSED_KEY = "announcement-dismissed"

export function AnnouncementToast() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const dismissed = localStorage.getItem(DISMISSED_KEY)
    if (!dismissed) {
      // Delay appearance for a smooth entrance
      const timer = setTimeout(() => setVisible(true), 1500)
      return () => clearTimeout(timer)
    }
  }, [])

  function dismiss() {
    setVisible(false)
    localStorage.setItem(DISMISSED_KEY, "true")
  }

  if (!visible) return null

  return (
    <div className="fixed right-4 bottom-4 z-40 w-[380px] max-w-[calc(100vw-2rem)] animate-in slide-in-from-bottom-4 fade-in duration-500">
      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-xl">
        <div className="flex">
          {/* Text content */}
          <div className="flex-1 p-5">
            {/* Label */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Info className="h-3.5 w-3.5" />
                <span className="font-heading text-[11px] font-medium">
                  Tip
                </span>
              </div>
              <button
                onClick={dismiss}
                className="flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground transition-colors hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Heading */}
            <h3 className="mt-2 font-heading text-base font-medium leading-snug">
              Prefer free models.
              <br />
              Don&apos;t break the bank.
            </h3>

            {/* Body */}
            <p className="mt-2 font-body text-xs leading-relaxed text-muted-foreground">
              Gemma 4 31B is free with zero input/output costs. Switch models
              anytime from the input toolbar.
            </p>

            {/* CTA */}
            <button
              onClick={dismiss}
              className="mt-3 rounded-lg border border-border px-3 py-1.5 font-heading text-xs font-medium transition-colors hover:bg-secondary"
            >
              Got it
            </button>
          </div>

          {/* Illustration */}
          <div className="relative w-[130px] shrink-0">
            <Image
              src="/safe-chat.jpg"
              alt="Save on AI costs"
              fill
              className="object-cover"
            />
          </div>
        </div>
      </div>
    </div>
  )
}
