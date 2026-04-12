"use client"

import { useSearchParams } from "next/navigation"
import { ChatView } from "@/components/chat-view"

export default function NewChatPage() {
  const searchParams = useSearchParams()
  const initialPrompt = searchParams.get("q") ?? undefined

  return (
    <ChatView
      conversationId={null}
      initialMessages={[]}
      initialPrompt={initialPrompt}
    />
  )
}
