"use client"

import { createContext, useContext } from "react"
import type { ConversationsAPI } from "@/hooks/use-conversations"

const ConversationsContext = createContext<ConversationsAPI | null>(null)

export const ConversationsProvider = ConversationsContext.Provider

export function useConversationsContext(): ConversationsAPI {
  const ctx = useContext(ConversationsContext)
  if (!ctx) {
    throw new Error(
      "useConversationsContext must be used within a ConversationsProvider"
    )
  }
  return ctx
}
