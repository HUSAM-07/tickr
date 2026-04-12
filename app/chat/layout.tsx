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
  const { conversations, isLoading, deleteConversation, searchConversations } =
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
              onClose={() => setSidebarCollapsed(true)}
              onSearchOpen={() => setSearchOpen(true)}
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
            <div className="fixed inset-y-0 left-0 z-50 lg:hidden">
              <ChatSidebar
                conversations={conversations}
                activeId={activeId}
                isLoading={isLoading}
                onSelect={handleSelectConversation}
                onNewChat={handleNewChat}
                onDelete={handleDelete}
                onClose={() => setSidebarOpen(false)}
                onSearchOpen={() => {
                  setSidebarOpen(false)
                  setSearchOpen(true)
                }}
              />
            </div>
          </>
        )}

        {/* Main content area */}
        <div className="flex flex-1 flex-col min-w-0">
          {/* Header */}
          <header className="flex shrink-0 items-center justify-between px-4 py-3 md:px-6">
            <div className={sidebarCollapsed ? "" : "lg:invisible"}>
              <button
                onClick={() => {
                  if (sidebarCollapsed) {
                    setSidebarCollapsed(false)
                  } else {
                    setSidebarOpen(true)
                  }
                }}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              >
                <PanelLeft className="h-5 w-5" />
              </button>
            </div>

            <div className="flex items-center gap-3">
              <TradingHeader />
              {activeId && (
                <button
                  onClick={() => setShareOpen(true)}
                  className="flex items-center gap-2 rounded-full border border-border px-4 py-1.5 font-heading text-sm font-medium transition-colors hover:bg-secondary"
                >
                  <Share className="h-3.5 w-3.5" />
                  Share
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
