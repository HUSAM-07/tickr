"use client"

import { Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { ChatView } from "@/components/chat-view"

function ChatContent() {
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

export default function NewChatPage() {
  return (
    <Suspense>
      <ChatContent />
    </Suspense>
  )
}
