"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import Link from "next/link"
import {
  Plus,
  PanelLeft,
  Search,
  Lightbulb,
  MoreHorizontal,
  Star,
  Pencil,
  Trash2,
} from "lucide-react"
import { AnimatedThemeToggler } from "@/components/ui/animated-theme-toggler"
import { MascotCharacter } from "@/components/mascot-icon"
import type { ConversationSummary } from "@/lib/types"

// ── Starred storage (localStorage until auth is added) ──

const STARRED_KEY = "tickr_starred_conversations"

function getStarredIds(): Set<string> {
  if (typeof window === "undefined") return new Set()
  try {
    const raw = localStorage.getItem(STARRED_KEY)
    return raw ? new Set(JSON.parse(raw) as string[]) : new Set()
  } catch {
    return new Set()
  }
}

function setStarredIds(ids: Set<string>) {
  localStorage.setItem(STARRED_KEY, JSON.stringify([...ids]))
}

// ── Grouping ──

type GroupedConversations = { label: string; items: ConversationSummary[] }

function groupConversations(
  conversations: ConversationSummary[],
  starredIds: Set<string>
): GroupedConversations[] {
  const starred: ConversationSummary[] = []
  const rest: ConversationSummary[] = []

  for (const c of conversations) {
    if (starredIds.has(c.id)) {
      starred.push(c)
    } else {
      rest.push(c)
    }
  }

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const todayMs = today.getTime()
  const yesterdayMs = todayMs - 86_400_000
  const weekMs = todayMs - 7 * 86_400_000

  const dateGroups: Record<string, ConversationSummary[]> = {
    Today: [],
    Yesterday: [],
    "Past week": [],
    Older: [],
  }

  for (const c of rest) {
    const ts = new Date(c.updated_at).getTime()
    if (ts >= todayMs) dateGroups["Today"].push(c)
    else if (ts >= yesterdayMs) dateGroups["Yesterday"].push(c)
    else if (ts >= weekMs) dateGroups["Past week"].push(c)
    else dateGroups["Older"].push(c)
  }

  const groups: GroupedConversations[] = []

  if (starred.length > 0) {
    groups.push({ label: "Starred", items: starred })
  }

  for (const [label, items] of Object.entries(dateGroups)) {
    if (items.length > 0) groups.push({ label, items })
  }

  return groups
}

// ── Context menu ──

function ConversationMenu({
  conversationId,
  isStarred,
  onToggleStar,
  onRename,
  onDelete,
  onClose,
}: {
  conversationId: string
  isStarred: boolean
  onToggleStar: (id: string) => void
  onRename: (id: string) => void
  onDelete: (id: string) => void
  onClose: () => void
}) {
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) onClose()
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose()
    }
    document.addEventListener("mousedown", handleClick)
    document.addEventListener("keydown", handleKey)
    return () => {
      document.removeEventListener("mousedown", handleClick)
      document.removeEventListener("keydown", handleKey)
    }
  }, [onClose])

  return (
    <div
      ref={menuRef}
      className="absolute right-0 top-full z-50 mt-1 w-44 overflow-hidden rounded-xl border border-border bg-card shadow-[rgba(0,0,0,0.12)_0px_4px_16px]"
    >
      <div className="py-1">
        <button
          onClick={(e) => { e.stopPropagation(); onToggleStar(conversationId); onClose() }}
          className="flex w-full items-center gap-3 px-3 py-2 text-left font-heading text-sm text-foreground transition-colors hover:bg-secondary"
        >
          <Star className={`h-4 w-4 ${isStarred ? "fill-amber-400 text-amber-400" : ""}`} />
          {isStarred ? "Unstar" : "Star"}
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onRename(conversationId); onClose() }}
          className="flex w-full items-center gap-3 px-3 py-2 text-left font-heading text-sm text-foreground transition-colors hover:bg-secondary"
        >
          <Pencil className="h-4 w-4" />
          Rename
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(conversationId); onClose() }}
          className="flex w-full items-center gap-3 border-t border-border px-3 py-2 text-left font-heading text-sm text-red-500 transition-colors hover:bg-secondary dark:text-red-400"
        >
          <Trash2 className="h-4 w-4" />
          Delete
        </button>
      </div>
    </div>
  )
}

// ── Sidebar ──

export function ChatSidebar({
  conversations,
  activeId,
  isLoading,
  onSelect,
  onNewChat,
  onDelete,
  onRename,
  onClose,
  onSearchOpen,
  onIdeasOpen,
}: {
  conversations: ConversationSummary[]
  activeId: string | null
  isLoading: boolean
  onSelect: (id: string) => void
  onNewChat: () => void
  onDelete: (id: string) => void
  onRename: (id: string) => void
  onClose: () => void
  onSearchOpen: () => void
  onIdeasOpen: () => void
}) {
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null)
  const [starredIds, setStarredIdsState] = useState<Set<string>>(() => getStarredIds())

  const toggleStar = useCallback((id: string) => {
    setStarredIdsState((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      setStarredIds(next)
      return next
    })
  }, [])

  const groups = groupConversations(conversations, starredIds)

  return (
    <div className="flex h-full w-full lg:w-[300px] shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground">
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-5 pb-2 lg:px-4 lg:pt-4">
        <Link
          href="/"
          className="font-display text-2xl transition-opacity hover:opacity-70 lg:font-heading lg:text-base lg:font-medium"
        >
          tickr
        </Link>
        <button
          onClick={onClose}
          className="flex h-9 w-9 items-center justify-center rounded-lg text-sidebar-foreground/60 transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground lg:h-8 lg:w-8"
        >
          <PanelLeft className="h-5 w-5 lg:h-4 lg:w-4" />
        </button>
      </div>

      {/* Actions */}
      <div className="px-4 py-2 space-y-0.5 lg:px-3 lg:py-1">
        <button
          onClick={onNewChat}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 font-heading text-[15px] text-sidebar-foreground/80 transition-colors hover:bg-sidebar-accent lg:gap-2 lg:py-2 lg:text-sm"
        >
          <Plus className="h-5 w-5 lg:h-4 lg:w-4" />
          New chat
        </button>
        <button
          onClick={onSearchOpen}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 font-heading text-[15px] text-sidebar-foreground/80 transition-colors hover:bg-sidebar-accent lg:gap-2 lg:py-2 lg:text-sm"
        >
          <Search className="h-5 w-5 lg:h-4 lg:w-4" />
          Search
        </button>
        <button
          onClick={onIdeasOpen}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 font-heading text-[15px] text-sidebar-foreground/80 transition-colors hover:bg-sidebar-accent lg:gap-2 lg:py-2 lg:text-sm"
        >
          <Lightbulb className="h-5 w-5 lg:h-4 lg:w-4" />
          Ideas
        </button>
      </div>

      {/* Conversations list */}
      <div className="flex-1 overflow-y-auto px-4 pb-3 lg:px-3">
        {isLoading ? (
          <div className="space-y-2 px-3 pt-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-8 animate-pulse rounded-lg bg-sidebar-accent/50" />
            ))}
          </div>
        ) : groups.length === 0 ? (
          <div className="flex flex-col items-center px-3 pt-8">
            <MascotCharacter size={36} />
            <p className="mt-3 font-heading text-xs text-sidebar-foreground/40">
              No conversations yet
            </p>
          </div>
        ) : (
          groups.map((group) => (
            <div key={group.label} className="mt-4 first:mt-2">
              <p className={`mb-1 px-3 font-heading text-[11px] font-medium ${
                group.label === "Starred"
                  ? "text-amber-500 dark:text-amber-400"
                  : "text-sidebar-foreground/40"
              }`}>
                {group.label}
              </p>
              {group.items.map((conversation) => {
                const isActive = conversation.id === activeId
                const isMenuOpen = menuOpenId === conversation.id
                const isStarred = starredIds.has(conversation.id)
                return (
                  <div key={conversation.id} className="group relative">
                    <button
                      onClick={() => onSelect(conversation.id)}
                      className={`flex w-full items-center gap-1.5 rounded-lg px-3 py-2.5 text-left font-body text-[15px] transition-colors lg:py-1.5 lg:text-sm ${
                        isActive
                          ? "bg-foreground/10 text-sidebar-foreground"
                          : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                      }`}
                    >
                      {isStarred && group.label === "Starred" && (
                        <Star className="h-3 w-3 shrink-0 fill-amber-400 text-amber-400" />
                      )}
                      <span className="truncate pr-6">{conversation.title}</span>
                    </button>

                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setMenuOpenId(isMenuOpen ? null : conversation.id)
                      }}
                      className={`absolute right-1.5 top-1/2 -translate-y-1/2 flex h-6 w-6 items-center justify-center rounded-md transition-opacity text-sidebar-foreground/40 hover:text-sidebar-foreground hover:bg-sidebar-accent ${
                        isMenuOpen ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                      }`}
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </button>

                    {isMenuOpen && (
                      <ConversationMenu
                        conversationId={conversation.id}
                        isStarred={isStarred}
                        onToggleStar={toggleStar}
                        onRename={onRename}
                        onDelete={onDelete}
                        onClose={() => setMenuOpenId(null)}
                      />
                    )}
                  </div>
                )
              })}
            </div>
          ))
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-sidebar-border px-5 py-4 lg:px-4 lg:py-3">
        <AnimatedThemeToggler className="flex h-9 w-9 items-center justify-center rounded-lg text-sidebar-foreground/60 transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground lg:h-8 lg:w-8 [&>svg]:h-5 [&>svg]:w-5 lg:[&>svg]:h-4 lg:[&>svg]:w-4" />
      </div>
    </div>
  )
}
