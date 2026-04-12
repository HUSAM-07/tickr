"use client"

import { use, useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { ChatView } from "@/components/chat-view"
import { useConversationsContext } from "@/hooks/conversations-context"
import type { Message } from "@/lib/types"

export default function ConversationPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const router = useRouter()
  const { fetchConversation } = useConversationsContext()

  const [messages, setMessages] = useState<Message[] | null>(null)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    let cancelled = false

    fetchConversation(id).then((conv) => {
      if (cancelled) return
      if (conv) {
        setMessages(conv.messages)
      } else {
        setNotFound(true)
      }
    })

    return () => {
      cancelled = true
    }
  }, [id, fetchConversation])

  if (notFound) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center px-4">
        <h2 className="font-heading text-xl font-medium">
          Conversation not found
        </h2>
        <p className="mt-2 font-body text-sm text-muted-foreground">
          This conversation may have been deleted.
        </p>
        <button
          onClick={() => router.push("/chat")}
          className="mt-4 rounded-full bg-primary px-5 py-2.5 font-heading text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
        >
          Start a new chat
        </button>
      </div>
    )
  }

  if (messages === null) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
      </div>
    )
  }

  return <ChatView conversationId={id} initialMessages={messages} />
}
