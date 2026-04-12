"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import {
  Send,
  Plus,
  AudioLines,
  Pencil,
  GraduationCap,
} from "lucide-react"
import { MessageParts } from "@/components/message-parts"
import { LoadingMascot } from "@/components/loading-mascot"
import { ModelSelector } from "@/components/model-selector"
import { useConversationsContext } from "@/hooks/conversations-context"
import { DEFAULT_MODEL, type ModelConfig } from "@/lib/models"
import type { Message, MessagePart, SSEEvent } from "@/lib/types"

const actionPills = [
  { icon: Pencil, label: "Write" },
  { icon: GraduationCap, label: "Learn" },
]

export function ChatView({
  conversationId,
  initialMessages,
}: {
  conversationId: string | null
  initialMessages: Message[]
}) {
  const { createConversation, updateConversation } = useConversationsContext()

  const [messages, setMessages] = useState<Message[]>(initialMessages)
  const [input, setInput] = useState("")
  const [isStreaming, setIsStreaming] = useState(false)
  const [selectedModel, setSelectedModel] = useState<ModelConfig>(DEFAULT_MODEL)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const messagesRef = useRef<Message[]>(messages)
  const convIdRef = useRef<string | null>(conversationId)

  // Sync refs
  useEffect(() => {
    messagesRef.current = messages
  }, [messages])

  useEffect(() => {
    convIdRef.current = conversationId
  }, [conversationId])

  // Reset messages when conversationId or initialMessages change
  useEffect(() => {
    setMessages(initialMessages)
    setInput("")
  }, [conversationId]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  useEffect(() => {
    const textarea = textareaRef.current
    if (textarea) {
      textarea.style.height = "auto"
      textarea.style.height = textarea.scrollHeight + "px"
    }
  }, [input])

  const updateAssistantParts = useCallback(
    (assistantId: string, updater: (parts: MessagePart[]) => MessagePart[]) => {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId ? { ...m, parts: updater(m.parts) } : m
        )
      )
    },
    []
  )

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!input.trim() || isStreaming) return

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: "user",
      parts: [{ type: "text", content: input.trim() }],
    }

    const updatedMessages = [...messages, userMessage]
    setMessages(updatedMessages)
    setInput("")
    setIsStreaming(true)

    // Create conversation if this is a new chat
    let convId = convIdRef.current
    if (!convId) {
      convId = await createConversation()
      convIdRef.current = convId
      // Update URL without route transition (preserves streaming state)
      window.history.replaceState(null, "", `/chat/${convId}`)
    }

    const assistantId = crypto.randomUUID()
    setMessages((prev) => [
      ...prev,
      { id: assistantId, role: "assistant", parts: [] },
    ])

    try {
      const apiMessages = updatedMessages.map((m) => ({
        role: m.role,
        content: m.parts
          .filter((p) => p.type === "text")
          .map((p) => (p as { type: "text"; content: string }).content)
          .join("\n"),
      }))

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: apiMessages, model: selectedModel.id }),
      })

      if (!res.ok) throw new Error("Failed to send message")

      const reader = res.body?.getReader()
      const decoder = new TextDecoder()

      if (!reader) throw new Error("No response stream")

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const text = decoder.decode(value, { stream: true })
        const lines = text.split("\n").filter((l) => l.startsWith("data: "))

        for (const line of lines) {
          const data = line.slice(6)
          if (data === "[DONE]") break

          try {
            const parsed = JSON.parse(data) as SSEEvent

            if (parsed.type === "error") {
              throw new Error(parsed.message)
            }

            if (parsed.type === "text_delta") {
              updateAssistantParts(assistantId, (parts) => {
                const last = parts[parts.length - 1]
                if (last?.type === "text") {
                  return [
                    ...parts.slice(0, -1),
                    { ...last, content: last.content + parsed.content },
                  ]
                }
                return [
                  ...parts,
                  { type: "text" as const, content: parsed.content },
                ]
              })
            }

            if (parsed.type === "widget") {
              updateAssistantParts(assistantId, (parts) => [
                ...parts,
                {
                  type: "widget" as const,
                  widgetType: parsed.widgetType,
                  data: parsed.data,
                  toolCallId: parsed.toolCallId,
                },
              ])
            }
          } catch (err) {
            if (
              err instanceof Error &&
              err.message !== "Failed to send message"
            ) {
              if (data.startsWith("{")) continue
              throw err
            }
            throw err
          }
        }
      }
    } catch (error) {
      updateAssistantParts(assistantId, (parts) => {
        const errorText =
          error instanceof Error
            ? `Error: ${error.message}`
            : "Something went wrong. Please try again."
        if (parts.length > 0) {
          return [
            ...parts,
            { type: "text" as const, content: `\n\n${errorText}` },
          ]
        }
        return [{ type: "text" as const, content: errorText }]
      })
    } finally {
      setIsStreaming(false)
      // Persist to Supabase after stream completes
      const currentId = convIdRef.current
      if (currentId) {
        await updateConversation(currentId, messagesRef.current)
      }
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e)
    }
  }

  const hasMessages = messages.length > 0

  const inputBox = (
    <form onSubmit={handleSubmit} className="w-full">
      <div className="rounded-2xl border border-border bg-card shadow-sm">
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="How can I help you today?"
          rows={1}
          className="w-full resize-none overflow-hidden bg-transparent px-5 pt-4 pb-2 font-body text-[15px] leading-relaxed text-foreground placeholder:text-muted-foreground focus:outline-none"
        />
        <div className="flex items-center justify-between px-3 pb-3">
          <button
            type="button"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          >
            <Plus className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-2">
            <ModelSelector
              selected={selectedModel}
              onSelect={setSelectedModel}
            />
            {input.trim() && !isStreaming ? (
              <button
                type="submit"
                className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent text-accent-foreground transition-opacity hover:opacity-90"
              >
                <Send className="h-4 w-4" />
              </button>
            ) : isStreaming ? (
              <div className="flex h-8 w-8 items-center justify-center">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
              </div>
            ) : (
              <button
                type="button"
                className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              >
                <AudioLines className="h-5 w-5" />
              </button>
            )}
          </div>
        </div>
      </div>
    </form>
  )

  return (
    <>
      {hasMessages ? (
        <>
          <div className="flex-1 overflow-y-auto">
            <div className="mx-auto max-w-3xl px-4 py-8">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`mb-6 ${message.role === "user" ? "flex justify-end" : ""}`}
                >
                  <div
                    className={`max-w-[85%] ${
                      message.role === "user"
                        ? "rounded-2xl rounded-br-md bg-primary px-4 py-3 text-primary-foreground"
                        : "pr-8"
                    }`}
                  >
                    {message.role === "assistant" && (
                      <div className="mb-1.5 font-heading text-xs font-medium text-muted-foreground">
                        iAI
                      </div>
                    )}
                    {message.role === "assistant" &&
                    message.parts.length === 0 &&
                    isStreaming ? (
                      <LoadingMascot />
                    ) : (
                      <MessageParts parts={message.parts} />
                    )}
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          </div>

          <div className="shrink-0 px-4 pb-4 pt-2 md:px-6">
            <div className="mx-auto max-w-3xl">
              {inputBox}
              <p className="mt-2 text-center font-body text-xs text-muted-foreground">
                iAI can make mistakes. Please double-check responses.
              </p>
            </div>
          </div>
        </>
      ) : (
        <div className="flex flex-1 flex-col items-center justify-center px-4 pb-16">
          <div className="mb-8">
            <h1 className="font-display text-3xl font-normal text-foreground/80 md:text-4xl lg:text-[2.6rem]">
              What shall we think through?
            </h1>
          </div>

          <div className="w-full max-w-xl">{inputBox}</div>

          <div className="mt-5 flex flex-wrap items-center justify-center gap-2.5">
            {actionPills.map(({ icon: Icon, label }) => (
              <button
                key={label}
                className="flex items-center gap-2 rounded-full border border-border px-4 py-2 font-heading text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              >
                <Icon className="h-4 w-4" />
                {label}
              </button>
            ))}
          </div>
        </div>
      )}
    </>
  )
}

