"use client"

import { useState, useEffect, useCallback } from "react"
import { supabase } from "@/lib/supabase"
import type { Conversation, ConversationSummary, Message } from "@/lib/types"

function generateTitle(messages: Message[]): string {
  const firstUserMsg = messages.find((m) => m.role === "user")
  if (!firstUserMsg) return "New chat"
  const text = firstUserMsg.parts
    .filter((p) => p.type === "text")
    .map((p) => (p as { type: "text"; content: string }).content)
    .join(" ")
  if (text.length <= 50) return text
  return text.slice(0, 50).trimEnd() + "..."
}

export function useConversations() {
  const [conversations, setConversations] = useState<ConversationSummary[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const fetchList = useCallback(async () => {
    const { data } = await supabase
      .from("conversations")
      .select("id, title, created_at, updated_at")
      .order("updated_at", { ascending: false })
    setConversations(data ?? [])
    setIsLoading(false)
  }, [])

  // eslint-disable-next-line react-hooks/set-state-in-effect -- async fetch, setState is in the callback not synchronous
  useEffect(() => { fetchList() }, [fetchList])

  const fetchConversation = useCallback(
    async (id: string): Promise<Conversation | null> => {
      const { data } = await supabase
        .from("conversations")
        .select("*")
        .eq("id", id)
        .single()
      if (!data) return null
      return data as Conversation
    },
    []
  )

  const createConversation = useCallback(async (): Promise<string> => {
    const id = crypto.randomUUID()
    const now = new Date().toISOString()

    // Optimistic update
    setConversations((prev) => [
      { id, title: "New chat", created_at: now, updated_at: now },
      ...prev,
    ])

    await supabase
      .from("conversations")
      .insert({ id, title: "New chat", messages: [] })

    return id
  }, [])

  const updateConversation = useCallback(
    async (id: string, messages: Message[]) => {
      const title = generateTitle(messages)
      const now = new Date().toISOString()

      // Optimistic update
      setConversations((prev) =>
        prev.map((c) => (c.id === id ? { ...c, title, updated_at: now } : c))
      )

      await supabase
        .from("conversations")
        .update({ messages, title, updated_at: now })
        .eq("id", id)
    },
    []
  )

  const deleteConversation = useCallback(async (id: string) => {
    // Optimistic update
    setConversations((prev) => prev.filter((c) => c.id !== id))

    await supabase.from("conversations").delete().eq("id", id)
  }, [])

  const searchConversations = useCallback(
    async (query: string): Promise<ConversationSummary[]> => {
      if (!query.trim()) return []
      const { data } = await supabase
        .from("conversations")
        .select("id, title, created_at, updated_at")
        .ilike("title", `%${query.trim()}%`)
        .order("updated_at", { ascending: false })
        .limit(20)
      return data ?? []
    },
    []
  )

  return {
    conversations,
    isLoading,
    fetchList,
    fetchConversation,
    createConversation,
    updateConversation,
    deleteConversation,
    searchConversations,
  }
}

export type ConversationsAPI = ReturnType<typeof useConversations>
