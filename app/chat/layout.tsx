"use client"

import { useState, useCallback } from "react"
import { useRouter, usePathname } from "next/navigation"
import { PanelLeft, Share } from "lucide-react"
import { ChatSidebar } from "@/components/chat-sidebar"
import { ShareModal } from "@/components/share-modal"
import { SearchModal } from "@/components/search-modal"
import { useConversations } from "@/hooks/use-conversations"
import { AnnouncementToast } from "@/components/announcement-toast"
import { ConversationsProvider } from "@/hooks/conversations-context"
import { TradingProvider } from "@/hooks/trading-context"
import { TradingHeader } from "@/components/trading/trading-header"

export default function ChatLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const pathname = usePathname()
  const conversationData = useConversations()
  const { conversations, isLoading, deleteConversation, renameConversation, searchConversations } =
    conversationData

  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [shareOpen, setShareOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [chatKey, setChatKey] = useState(0)

  // Derive activeId from URL
  const match = pathname.match(/^\/chat\/(.+)$/)
  const activeId = match ? match[1] : null

  const handleNewChat = useCallback(() => {
    if (pathname === "/chat") {
      setChatKey((k) => k + 1)
    } else {
      router.push("/chat")
    }
    setSidebarOpen(false)
  }, [pathname, router])

  function handleSelectConversation(id: string) {
    router.push(`/chat/${id}`)
    setSidebarOpen(false)
  }

  function handleRename(id: string) {
    const conversation = conversations.find((c) => c.id === id)
    const currentTitle = conversation?.title ?? ""
    const newTitle = window.prompt("Rename conversation", currentTitle)
    if (newTitle && newTitle.trim() && newTitle !== currentTitle) {
      renameConversation(id, newTitle.trim())
    }
  }

  async function handleDelete(id: string) {
    await deleteConversation(id)
    if (id === activeId) {
      router.push("/chat")
      setChatKey((k) => k + 1)
    }
  }

  return (
    <TradingProvider>
    <ConversationsProvider value={conversationData}>
      <div className="flex h-svh">
        {/* Desktop sidebar — collapsible */}
        {!sidebarCollapsed && (
          <div className="hidden lg:flex">
            <ChatSidebar
              conversations={conversations}
              activeId={activeId}
              isLoading={isLoading}
              onSelect={handleSelectConversation}
              onNewChat={handleNewChat}
              onDelete={handleDelete}
              onRename={handleRename}
              onClose={() => setSidebarCollapsed(true)}
              onSearchOpen={() => setSearchOpen(true)}
              onIdeasOpen={() => router.push("/chat/ideas")}
            />
          </div>
        )}

        {/* Mobile sidebar overlay */}
        {sidebarOpen && (
          <>
            <div
              className="fixed inset-0 z-40 bg-black/50 lg:hidden"
              onClick={() => setSidebarOpen(false)}
            />
            <div className="fixed inset-y-0 left-0 z-50 w-[85vw] max-w-[360px] lg:hidden">
              <ChatSidebar
                conversations={conversations}
                activeId={activeId}
                isLoading={isLoading}
                onSelect={handleSelectConversation}
                onNewChat={handleNewChat}
                onDelete={handleDelete}
                onRename={handleRename}
                onClose={() => setSidebarOpen(false)}
                onSearchOpen={() => {
                  setSidebarOpen(false)
                  setSearchOpen(true)
                }}
                onIdeasOpen={() => {
                  setSidebarOpen(false)
                  router.push("/chat/ideas")
                }}
              />
            </div>
          </>
        )}

        {/* Main content area */}
        <div className="flex flex-1 flex-col min-w-0">
          {/* Header */}
          <header className="flex shrink-0 items-center justify-between px-3 py-2 md:px-6 md:py-3">
            {/* Left: sidebar toggle */}
            <div className={`shrink-0 ${sidebarCollapsed ? "" : "lg:invisible"}`}>
              <button
                onClick={() => {
                  if (sidebarCollapsed) {
                    setSidebarCollapsed(false)
                  } else {
                    setSidebarOpen(true)
                  }
                }}
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-border text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground md:h-8 md:w-8 md:border-0"
              >
                <PanelLeft className="h-5 w-5" />
              </button>
            </div>

            {/* Center: trading header */}
            <div className="flex items-center">
              <TradingHeader />
            </div>

            {/* Right: share */}
            <div className="flex items-center gap-2 shrink-0">
              {activeId && (
                <button
                  onClick={() => setShareOpen(true)}
                  className="hidden md:flex items-center gap-2 rounded-xl border border-border px-4 py-1.5 font-heading text-sm transition-colors hover:bg-secondary"
                >
                  <Share className="h-3.5 w-3.5" />
                  Share
                </button>
              )}
              {activeId && (
                <button
                  onClick={() => setShareOpen(true)}
                  className="flex md:hidden h-10 w-10 items-center justify-center rounded-xl border border-border text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                >
                  <Share className="h-4 w-4" />
                </button>
              )}
            </div>
          </header>

          <div key={chatKey} className="flex flex-1 flex-col min-h-0">
            {children}
          </div>
        </div>
      </div>

      {/* Share modal */}
      {shareOpen && activeId && (
        <ShareModal
          conversationId={activeId}
          onClose={() => setShareOpen(false)}
        />
      )}

      {/* Search modal */}
      {searchOpen && (
        <SearchModal
          recentConversations={conversations}
          onSearch={searchConversations}
          onSelect={handleSelectConversation}
          onClose={() => setSearchOpen(false)}
        />
      )}

      {/* Announcement toast */}
      <AnnouncementToast />
    </ConversationsProvider>
    </TradingProvider>
  )
}
