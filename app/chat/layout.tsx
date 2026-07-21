"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter, usePathname } from "next/navigation"
import { PanelLeft } from "lucide-react"
import { ChatSidebar } from "@/components/chat-sidebar"
import { SearchModal } from "@/components/search-modal"
import { useConversations } from "@/hooks/use-conversations"
import { AnnouncementToast } from "@/components/announcement-toast"
import { ConversationsProvider } from "@/hooks/conversations-context"
import { TradingProvider } from "@/hooks/trading-context"
import { MarketDataProvider } from "@/hooks/market-data-context"
import { TradingHeader } from "@/components/trading/trading-header"
import { supabase } from "@/lib/supabase"

export default function ChatLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const pathname = usePathname()
  const conversationData = useConversations()
  const {
    conversations,
    isLoading,
    error,
    deleteConversation,
    renameConversation,
    toggleStarConversation,
    searchConversations,
  } = conversationData

  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [chatKey, setChatKey] = useState(0)
  const [accountEmail, setAccountEmail] = useState<string | null>(null)

  useEffect(() => {
    let active = true

    void supabase.auth.getUser().then(({ data }) => {
      if (active) setAccountEmail(data.user?.email ?? null)
    })

    return () => {
      active = false
    }
  }, [])

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

  async function handleRename(id: string) {
    const conversation = conversations.find((c) => c.id === id)
    const currentTitle = conversation?.title ?? ""
    const newTitle = window.prompt("Rename conversation", currentTitle)
    if (newTitle && newTitle.trim() && newTitle !== currentTitle) {
      try {
        await renameConversation(id, newTitle.trim())
      } catch {
        // The conversations hook exposes the error in the layout.
      }
    }
  }

  async function handleToggleStar(id: string, isStarred: boolean) {
    try {
      await toggleStarConversation(id, isStarred)
    } catch {
      // The conversations hook exposes the error in the layout.
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteConversation(id)
      if (id === activeId) {
        router.push("/chat")
        setChatKey((k) => k + 1)
      }
    } catch {
      // The conversations hook exposes the error in the layout.
    }
  }

  async function handleSignOut() {
    await supabase.auth.signOut({ scope: "local" })
    router.replace("/login")
    router.refresh()
  }

  return (
    <TradingProvider>
      <MarketDataProvider>
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
                  onToggleStar={handleToggleStar}
                  onClose={() => setSidebarCollapsed(true)}
                  onSearchOpen={() => setSearchOpen(true)}
                  onIdeasOpen={() => router.push("/chat/ideas")}
                  accountEmail={accountEmail}
                  onSignOut={handleSignOut}
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
                    onToggleStar={handleToggleStar}
                    onClose={() => setSidebarOpen(false)}
                    onSearchOpen={() => {
                      setSidebarOpen(false)
                      setSearchOpen(true)
                    }}
                    onIdeasOpen={() => {
                      setSidebarOpen(false)
                      router.push("/chat/ideas")
                    }}
                    accountEmail={accountEmail}
                    onSignOut={handleSignOut}
                  />
                </div>
              </>
            )}

            {/* Main content area */}
            <div className="flex min-w-0 flex-1 flex-col">
              {/* Header */}
              <header className="flex shrink-0 items-center justify-between px-3 py-2 md:px-6 md:py-3">
                {/* Left: sidebar toggle */}
                <div
                  className={`shrink-0 ${sidebarCollapsed ? "" : "lg:invisible"}`}
                >
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

                <div className="h-10 w-10 shrink-0" aria-hidden />
              </header>

              {error && (
                <div
                  role="alert"
                  className="mx-3 mb-2 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-2 font-body text-sm text-red-600 md:mx-6 dark:text-red-300"
                >
                  {error}
                </div>
              )}

              <div key={chatKey} className="flex min-h-0 flex-1 flex-col">
                {children}
              </div>
            </div>
          </div>

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
      </MarketDataProvider>
    </TradingProvider>
  )
}
