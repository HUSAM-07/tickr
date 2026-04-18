"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { Search, X, MessageCircle } from "lucide-react"
import type { ConversationSummary } from "@/lib/types"

function getTimeLabel(updatedAt: string): string {
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  const ts = new Date(updatedAt).getTime()
  if (ts >= now.getTime()) return "Today"
  if (ts >= now.getTime() - 86_400_000) return "Yesterday"
  if (ts >= now.getTime() - 7 * 86_400_000) return "Past week"
  return "Older"
}

export function SearchModal({
  onSelect,
  onSearch,
  onClose,
  recentConversations,
}: {
  onSelect: (id: string) => void
  onSearch: (query: string) => Promise<ConversationSummary[]>
  onClose: () => void
  recentConversations: ConversationSummary[]
}) {
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<ConversationSummary[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // The list to display: search results when query exists, recent otherwise
  const displayList = query.trim() ? results : recentConversations

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  // Close on Escape
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose()
    }
    document.addEventListener("keydown", handleKey)
    return () => document.removeEventListener("keydown", handleKey)
  }, [onClose])

  const handleChange = useCallback(
    (value: string) => {
      setQuery(value)
      setActiveIndex(0)

      if (!value.trim()) {
        setResults([])
        setIsSearching(false)
        if (debounceRef.current) clearTimeout(debounceRef.current)
        return
      }

      setIsSearching(true)

      if (debounceRef.current) clearTimeout(debounceRef.current)
      debounceRef.current = setTimeout(async () => {
        const data = await onSearch(value)
        setResults(data)
        setActiveIndex(0)
        setIsSearching(false)
      }, 200)
    },
    [onSearch]
  )

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault()
      setActiveIndex((i) => Math.min(i + 1, displayList.length - 1))
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      setActiveIndex((i) => Math.max(i - 1, 0))
    } else if (e.key === "Enter" && displayList[activeIndex]) {
      e.preventDefault()
      onSelect(displayList[activeIndex].id)
      onClose()
    }
  }

  return (
    <>
      {/* Backdrop — full-screen sheet on mobile, dim on desktop */}
      <div
        className="fixed inset-0 z-50 hidden bg-black/50 sm:block"
        onClick={onClose}
      />

      {/* Modal container */}
      <div className="pointer-events-none fixed inset-x-0 top-0 z-50 flex h-[100dvh] flex-col sm:items-start sm:justify-center sm:px-4 sm:pt-[15vh]">
        <div
          onClick={(e) => e.stopPropagation()}
          className="pointer-events-auto flex w-full flex-1 flex-col-reverse bg-card sm:mx-auto sm:max-w-lg sm:flex-none sm:flex-col sm:overflow-hidden sm:rounded-xl sm:border sm:border-border sm:shadow-2xl"
        >
          {/* Search input row — bottom pill on mobile, top bar on desktop */}
          <div className="flex items-center gap-2 border-t border-border bg-card px-3 pb-[max(env(safe-area-inset-bottom),0.75rem)] pt-3 sm:border-t-0 sm:border-b sm:bg-transparent sm:px-4 sm:pb-3">
            <div className="flex flex-1 items-center gap-3 rounded-full border border-border bg-background px-4 py-2.5 shadow-sm sm:rounded-none sm:border-0 sm:bg-transparent sm:px-0 sm:py-0 sm:shadow-none">
              <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => handleChange(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Search chats and projects"
                className="min-w-0 flex-1 bg-transparent font-body text-sm text-foreground placeholder:text-muted-foreground outline-none"
              />
              {/* Desktop close — inline inside bar */}
              <button
                onClick={onClose}
                aria-label="Close search"
                className="hidden h-6 w-6 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:text-foreground sm:flex"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Mobile close — separate circular button */}
            <button
              onClick={onClose}
              aria-label="Close search"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border bg-background text-muted-foreground shadow-sm transition-colors hover:text-foreground sm:hidden"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Results */}
          <div className="flex-1 overflow-y-auto sm:max-h-[50vh] sm:flex-none">
            {isSearching ? (
              <div className="space-y-1 p-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-10 animate-pulse rounded-lg bg-secondary/50"
                  />
                ))}
              </div>
            ) : displayList.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <p className="font-body text-sm text-muted-foreground">
                  {query.trim()
                    ? "No conversations found"
                    : "No recent conversations"}
                </p>
              </div>
            ) : (
              <div className="p-1.5">
                {displayList.map((conv, i) => (
                  <button
                    key={conv.id}
                    onClick={() => {
                      onSelect(conv.id)
                      onClose()
                    }}
                    onMouseEnter={() => setActiveIndex(i)}
                    className={`flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left transition-colors ${
                      i === activeIndex
                        ? "bg-secondary"
                        : "hover:bg-secondary/50"
                    }`}
                  >
                    <div className="flex min-w-0 items-center gap-2.5">
                      <MessageCircle className="h-4 w-4 shrink-0 text-muted-foreground/50" />
                      <span className="truncate font-body text-sm">
                        {conv.title}
                      </span>
                    </div>
                    <span className="shrink-0 pl-4 font-heading text-[11px] text-muted-foreground/50">
                      {getTimeLabel(conv.updated_at)}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
