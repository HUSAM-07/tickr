"use client"

import { useState, useEffect, useCallback } from "react"
import { supabase } from "@/lib/supabase"
import type { Conversation, ConversationSummary, Message } from "@/lib/types"

function generateTitle(messages: Message[]): string {
  const firstUserMsg = messages.find((message) => message.role === "user")
  if (!firstUserMsg) return "New chat"

  const text = firstUserMsg.parts
    .filter((part) => part.type === "text")
    .map((part) => (part as { type: "text"; content: string }).content)
    .join(" ")

  return text.length <= 50 ? text : `${text.slice(0, 50).trimEnd()}...`
}

function conversationError(action: string, error: { message: string }) {
  return new Error(`Could not ${action}: ${error.message}`)
}

async function requireUserId() {
  const { data, error } = await supabase.auth.getClaims()
  const userId = data?.claims.sub

  if (error || !userId) {
    throw new Error("Your session has expired. Please sign in again.")
  }

  return userId
}

export function useConversations() {
  const [conversations, setConversations] = useState<ConversationSummary[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchList = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const userId = await requireUserId()
      const { data, error: fetchError } = await supabase
        .from("conversations")
        .select("id, title, is_starred, created_at, updated_at")
        .eq("user_id", userId)
        .order("updated_at", { ascending: false })

      if (fetchError) throw conversationError("load conversations", fetchError)
      setConversations(data ?? [])
    } catch (fetchError) {
      setConversations([])
      setError(
        fetchError instanceof Error
          ? fetchError.message
          : "Could not load conversations."
      )
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    void fetchList()
  }, [fetchList])

  const fetchConversation = useCallback(
    async (id: string): Promise<Conversation | null> => {
      try {
        const userId = await requireUserId()
        const { data, error: fetchError } = await supabase
          .from("conversations")
          .select("*")
          .eq("id", id)
          .eq("user_id", userId)
          .maybeSingle()

        if (fetchError)
          throw conversationError("load this conversation", fetchError)
        return data ? (data as Conversation) : null
      } catch (fetchError) {
        setError(
          fetchError instanceof Error
            ? fetchError.message
            : "Could not load this conversation."
        )
        return null
      }
    },
    []
  )

  const createConversation = useCallback(async (): Promise<string> => {
    const userId = await requireUserId()
    const id = crypto.randomUUID()

    const { data, error: createError } = await supabase
      .from("conversations")
      .insert({
        id,
        user_id: userId,
        title: "New chat",
        messages: [],
        is_starred: false,
      })
      .select("id, title, is_starred, created_at, updated_at")
      .single()

    if (createError)
      throw conversationError("create a conversation", createError)

    setError(null)
    setConversations((previous) => [data, ...previous])
    return data.id
  }, [])

  const updateConversation = useCallback(
    async (id: string, messages: Message[]) => {
      const userId = await requireUserId()
      const title = generateTitle(messages)
      const updatedAt = new Date().toISOString()

      const { data, error: updateError } = await supabase
        .from("conversations")
        .update({ messages, title, updated_at: updatedAt })
        .eq("id", id)
        .eq("user_id", userId)
        .select("id")
        .maybeSingle()

      if (updateError || !data) {
        throw conversationError(
          "save the conversation",
          updateError ?? { message: "Conversation was not found." }
        )
      }

      setConversations((previous) =>
        previous.map((conversation) =>
          conversation.id === id
            ? { ...conversation, title, updated_at: updatedAt }
            : conversation
        )
      )
      setError(null)
    },
    []
  )

  const renameConversation = useCallback(async (id: string, title: string) => {
    const userId = await requireUserId()
    const updatedAt = new Date().toISOString()

    const { data, error: renameError } = await supabase
      .from("conversations")
      .update({ title, updated_at: updatedAt })
      .eq("id", id)
      .eq("user_id", userId)
      .select("id")
      .maybeSingle()

    if (renameError || !data) {
      const nextError = conversationError(
        "rename the conversation",
        renameError ?? { message: "Conversation was not found." }
      )
      setError(nextError.message)
      throw nextError
    }

    setConversations((previous) =>
      previous.map((conversation) =>
        conversation.id === id
          ? { ...conversation, title, updated_at: updatedAt }
          : conversation
      )
    )
    setError(null)
  }, [])

  const toggleStarConversation = useCallback(
    async (id: string, isStarred: boolean) => {
      const userId = await requireUserId()

      const { data, error: starError } = await supabase
        .from("conversations")
        .update({ is_starred: isStarred })
        .eq("id", id)
        .eq("user_id", userId)
        .select("id")
        .maybeSingle()

      if (starError || !data) {
        const nextError = conversationError(
          "update the conversation",
          starError ?? { message: "Conversation was not found." }
        )
        setError(nextError.message)
        throw nextError
      }

      setConversations((previous) =>
        previous.map((conversation) =>
          conversation.id === id
            ? { ...conversation, is_starred: isStarred }
            : conversation
        )
      )
      setError(null)
    },
    []
  )

  const deleteConversation = useCallback(async (id: string) => {
    const userId = await requireUserId()

    const { data, error: deleteError } = await supabase
      .from("conversations")
      .delete()
      .eq("id", id)
      .eq("user_id", userId)
      .select("id")
      .maybeSingle()

    if (deleteError || !data) {
      const nextError = conversationError(
        "delete the conversation",
        deleteError ?? { message: "Conversation was not found." }
      )
      setError(nextError.message)
      throw nextError
    }

    setConversations((previous) =>
      previous.filter((conversation) => conversation.id !== id)
    )
    setError(null)
  }, [])

  const searchConversations = useCallback(
    async (query: string): Promise<ConversationSummary[]> => {
      if (!query.trim()) return []

      try {
        const userId = await requireUserId()
        const { data, error: searchError } = await supabase
          .from("conversations")
          .select("id, title, is_starred, created_at, updated_at")
          .eq("user_id", userId)
          .ilike("title", `%${query.trim()}%`)
          .order("updated_at", { ascending: false })
          .limit(20)

        if (searchError)
          throw conversationError("search conversations", searchError)
        setError(null)
        return data ?? []
      } catch (searchError) {
        setError(
          searchError instanceof Error
            ? searchError.message
            : "Could not search conversations."
        )
        return []
      }
    },
    []
  )

  return {
    conversations,
    isLoading,
    error,
    fetchList,
    fetchConversation,
    createConversation,
    updateConversation,
    renameConversation,
    toggleStarConversation,
    deleteConversation,
    searchConversations,
  }
}

export type ConversationsAPI = ReturnType<typeof useConversations>
