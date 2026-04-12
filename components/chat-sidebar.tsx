"use client"

import Link from "next/link"
import { Plus, PanelLeft, MessageSquare, X, Search } from "lucide-react"
import { AnimatedThemeToggler } from "@/components/ui/animated-theme-toggler"
import type { ConversationSummary } from "@/lib/types"

type GroupedConversations = {
  label: string
  items: ConversationSummary[]
}

function groupConversations(
  conversations: ConversationSummary[]
): GroupedConversations[] {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const todayMs = today.getTime()
  const yesterdayMs = todayMs - 86_400_000
  const weekMs = todayMs - 7 * 86_400_000

  const groups: Record<string, ConversationSummary[]> = {
    Today: [],
    Yesterday: [],
    "Past week": [],
    Older: [],
  }

  for (const c of conversations) {
    const ts = new Date(c.updated_at).getTime()
    if (ts >= todayMs) {
      groups["Today"].push(c)
    } else if (ts >= yesterdayMs) {
      groups["Yesterday"].push(c)
    } else if (ts >= weekMs) {
      groups["Past week"].push(c)
    } else {
      groups["Older"].push(c)
    }
  }

  return Object.entries(groups)
    .filter(([, items]) => items.length > 0)
    .map(([label, items]) => ({ label, items }))
}

export function ChatSidebar({
  conversations,
  activeId,
  isLoading,
  onSelect,
  onNewChat,
  onDelete,
  onClose,
  onSearchOpen,
}: {
  conversations: ConversationSummary[]
  activeId: string | null
  isLoading: boolean
  onSelect: (id: string) => void
  onNewChat: () => void
  onDelete: (id: string) => void
  onClose: () => void
  onSearchOpen: () => void
}) {
  const groups = groupConversations(conversations)

  return (
    <div className="flex h-full w-[260px] shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <Link
          href="/"
          className="font-heading text-base font-medium transition-opacity hover:opacity-70"
        >
          iAI
        </Link>
        <button
          onClick={onClose}
          className="flex h-7 w-7 items-center justify-center rounded-lg text-sidebar-foreground/60 transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground"
        >
          <PanelLeft className="h-4 w-4" />
        </button>
      </div>

      {/* Actions */}
      <div className="px-3 py-1 space-y-0.5">
        <button
          onClick={onNewChat}
          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 font-heading text-sm text-sidebar-foreground/80 transition-colors hover:bg-sidebar-accent"
        >
          <Plus className="h-4 w-4" />
          New chat
        </button>
        <button
          onClick={onSearchOpen}
          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 font-heading text-sm text-sidebar-foreground/80 transition-colors hover:bg-sidebar-accent"
        >
          <Search className="h-4 w-4" />
          Search
        </button>
      </div>

      {/* Conversations list */}
      <div className="flex-1 overflow-y-auto px-3 pb-3">
        {isLoading ? (
          <div className="space-y-2 px-3 pt-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="h-8 animate-pulse rounded-lg bg-sidebar-accent/50"
              />
            ))}
          </div>
        ) : groups.length === 0 ? (
          <div className="px-3 pt-8 text-center">
            <MessageSquare className="mx-auto h-8 w-8 text-sidebar-foreground/20" />
            <p className="mt-2 font-body text-xs text-sidebar-foreground/40">
              No conversations yet
            </p>
          </div>
        ) : (
          groups.map((group) => (
            <div key={group.label} className="mt-4 first:mt-2">
              <p className="mb-1 px-3 font-heading text-[11px] font-medium text-sidebar-foreground/40">
                {group.label}
              </p>
              {group.items.map((conversation) => {
                const isActive = conversation.id === activeId
                return (
                  <div key={conversation.id} className="group relative">
                    <button
                      onClick={() => onSelect(conversation.id)}
                      className={`flex w-full items-center rounded-lg px-3 py-2 text-left font-body text-sm transition-colors ${
                        isActive
                          ? "bg-sidebar-accent text-sidebar-accent-foreground"
                          : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                      }`}
                    >
                      <span className="truncate">{conversation.title}</span>
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        onDelete(conversation.id)
                      }}
                      className="absolute right-1.5 top-1/2 -translate-y-1/2 flex h-6 w-6 items-center justify-center rounded-md opacity-0 transition-opacity group-hover:opacity-100 hover:bg-sidebar-accent text-sidebar-foreground/40 hover:text-sidebar-foreground"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                )
              })}
            </div>
          ))
        )}
      </div>

      {/* Footer: theme toggle */}
      <div className="border-t border-sidebar-border px-4 py-3">
        <AnimatedThemeToggler className="flex h-8 w-8 items-center justify-center rounded-lg text-sidebar-foreground/60 transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground [&>svg]:h-4 [&>svg]:w-4" />
      </div>
    </div>
  )
}
