"use client"

import { useState, useEffect } from "react"
import { X, Lock, Globe, Check, Copy } from "lucide-react"

export function ShareModal({
  conversationId,
  onClose,
}: {
  conversationId: string
  onClose: () => void
}) {
  const [isPublic, setIsPublic] = useState(true)
  const [copied, setCopied] = useState(false)

  const shareUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/chat/${conversationId}`
      : ""

  // Close on Escape
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose()
    }
    document.addEventListener("keydown", handleKey)
    return () => document.removeEventListener("keydown", handleKey)
  }, [onClose])

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Fallback
      const input = document.querySelector<HTMLInputElement>(
        "[data-share-url]"
      )
      if (input) {
        input.select()
        document.execCommand("copy")
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      }
    }
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/50"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div
          className="pointer-events-auto w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-xl"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-start justify-between">
            <div>
              <h2 className="font-heading text-lg font-medium">
                Chat shared
              </h2>
              <p className="mt-1 font-body text-sm text-muted-foreground">
                Future messages aren&apos;t included
              </p>
            </div>
            <button
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Options */}
          <div className="mt-5 space-y-1">
            <button
              onClick={() => setIsPublic(false)}
              className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left transition-colors ${
                !isPublic ? "bg-secondary" : "hover:bg-secondary/50"
              }`}
            >
              <Lock className="h-5 w-5 shrink-0 text-muted-foreground" />
              <div className="flex-1">
                <p className="font-heading text-sm font-medium">
                  Keep private
                </p>
                <p className="font-body text-xs text-muted-foreground">
                  Only you have access
                </p>
              </div>
              {!isPublic && (
                <Check className="h-5 w-5 shrink-0 text-accent" />
              )}
            </button>

            <button
              onClick={() => setIsPublic(true)}
              className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left transition-colors ${
                isPublic ? "bg-secondary" : "hover:bg-secondary/50"
              }`}
            >
              <Globe className="h-5 w-5 shrink-0 text-muted-foreground" />
              <div className="flex-1">
                <p className="font-heading text-sm font-medium">
                  Create public link
                </p>
                <p className="font-body text-xs text-muted-foreground">
                  Anyone with the link can view
                </p>
              </div>
              {isPublic && (
                <Check className="h-5 w-5 shrink-0 text-accent" />
              )}
            </button>
          </div>

          {/* URL + Copy */}
          {isPublic && (
            <div className="mt-4 flex items-center gap-2 rounded-xl border border-border bg-background px-4 py-2.5">
              <input
                data-share-url
                type="text"
                readOnly
                value={shareUrl}
                className="min-w-0 flex-1 bg-transparent font-mono text-xs text-muted-foreground outline-none"
              />
              <button
                onClick={handleCopy}
                className="shrink-0 rounded-lg border border-border bg-card px-3 py-1.5 font-heading text-xs font-medium transition-colors hover:bg-secondary"
              >
                {copied ? (
                  <span className="flex items-center gap-1">
                    <Check className="h-3 w-3" />
                    Copied
                  </span>
                ) : (
                  <span className="flex items-center gap-1">
                    <Copy className="h-3 w-3" />
                    Copy link
                  </span>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
