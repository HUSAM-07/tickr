"use client"

import Link from "next/link"
import { useState, useEffect } from "react"
import { Menu, X } from "lucide-react"

type NavLink = {
  href: string
  label: string
  /** Rendered as the accent CTA button */
  primary?: boolean
  /** Rendered as an outlined secondary button (desktop) */
  outlined?: boolean
}

export function SiteNav({ links }: { links: NavLink[] }) {
  const [open, setOpen] = useState(false)

  // Close the menu when viewport grows past md breakpoint so the mobile
  // sheet never stays stranded open behind the desktop layout.
  useEffect(() => {
    if (!open) return
    const mq = window.matchMedia("(min-width: 768px)")
    const onChange = () => {
      if (mq.matches) setOpen(false)
    }
    mq.addEventListener("change", onChange)
    return () => mq.removeEventListener("change", onChange)
  }, [open])

  // Lock body scroll while the mobile menu is open.
  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      document.body.style.overflow = prev
    }
  }, [open])

  const primaryLink = links.find((l) => l.primary)
  const secondaryLinks = links.filter((l) => !l.primary)

  return (
    <nav className="relative flex items-center justify-between px-6 py-5 md:px-12 lg:px-20">
      <Link href="/" className="font-heading text-lg font-medium tracking-tight">
        tickr
      </Link>

      {/* Desktop nav */}
      <div className="hidden items-center gap-3 md:flex">
        {secondaryLinks.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={
              link.outlined
                ? "rounded-xl border border-border px-4 py-2 font-heading text-sm font-medium text-foreground transition-colors hover:bg-secondary lg:px-5 lg:py-2.5"
                : "font-heading text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            }
          >
            {link.label}
          </Link>
        ))}
        {primaryLink && (
          <Link
            href={primaryLink.href}
            className="rounded-xl bg-accent px-4 py-2 font-heading text-sm font-medium text-accent-foreground transition-opacity hover:opacity-90 lg:px-5 lg:py-2.5"
          >
            {primaryLink.label}
          </Link>
        )}
      </div>

      {/* Mobile: primary CTA + hamburger */}
      <div className="flex items-center gap-2 md:hidden">
        {primaryLink && (
          <Link
            href={primaryLink.href}
            className="rounded-xl bg-accent px-3.5 py-2 font-heading text-sm font-medium text-accent-foreground transition-opacity hover:opacity-90"
          >
            {primaryLink.label}
          </Link>
        )}
        <button
          type="button"
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
          className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-border text-foreground transition-colors hover:bg-secondary"
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile menu panel */}
      {open && (
        <div
          className="fixed inset-x-0 top-[68px] z-40 border-b border-border bg-background px-6 pb-8 pt-4 shadow-lg md:hidden"
          role="dialog"
          aria-modal="true"
        >
          <ul className="flex flex-col gap-1">
            {secondaryLinks.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className="block rounded-xl px-4 py-3 font-heading text-base font-medium text-foreground transition-colors hover:bg-secondary"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </nav>
  )
}
