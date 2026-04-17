"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import {
  Send,
  Plus,
  AudioLines,
  CandlestickChart,
  TrendingUp,
  Zap,
  BarChart3,
  Briefcase,
  Trophy,
  type LucideIcon,
} from "lucide-react"
import { MessageParts } from "@/components/message-parts"
import { LoadingMascot } from "@/components/loading-mascot"
import { MascotCharacter } from "@/components/mascot-icon"
import { ModelSelector } from "@/components/model-selector"
import { useConversationsContext } from "@/hooks/conversations-context"
import { DEFAULT_MODEL, type ModelConfig } from "@/lib/models"
import type { Message, MessagePart, SSEEvent } from "@/lib/types"

const suggestedPrompts: { icon: LucideIcon; label: string; prompt: string }[] = [
  {
    icon: CandlestickChart,
    label: "Chart V75",
    prompt: "Show me a live chart of Volatility 75 Index",
  },
  {
    icon: TrendingUp,
    label: "Analyze EUR/USD",
    prompt: "Analyze EUR/USD with RSI and Bollinger Bands",
  },
  {
    icon: Zap,
    label: "Get a signal",
    prompt: "Give me a trading signal on Volatility 100 Index",
  },
  {
    icon: BarChart3,
    label: "Compare markets",
    prompt: "Compare Volatility 25, 50, 75, and 100 indices in a table",
  },
  {
    icon: Briefcase,
    label: "Portfolio",
    prompt: "Show my portfolio and trading performance",
  },
  {
    icon: Trophy,
    label: "Leaderboard",
    prompt: "Show the trading leaderboard",
  },
]

export function ChatView({
  conversationId,
  initialMessages,
  initialPrompt,
}: {
  conversationId: string | null
  initialMessages: Message[]
  initialPrompt?: string
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
  const isStreamingRef = useRef(false)
  const selectedModelRef = useRef(selectedModel)

  const initialPromptUsed = useRef(false)

  useEffect(() => { messagesRef.current = messages }, [messages])
  useEffect(() => { convIdRef.current = conversationId }, [conversationId])
  useEffect(() => { isStreamingRef.current = isStreaming }, [isStreaming])
  useEffect(() => { selectedModelRef.current = selectedModel }, [selectedModel])

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

  /** Send a message programmatically. `handleSubmit` is a thin wrapper for
   * the form; an idea-page redirect or landing CTA calls this directly so
   * the prompt becomes a real chat message without a manual click. */
  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim()
      if (!trimmed || isStreamingRef.current) return

      const userMessage: Message = {
        id: crypto.randomUUID(),
        role: "user",
        parts: [{ type: "text", content: trimmed }],
      }

      const updatedMessages = [...messagesRef.current, userMessage]
      setMessages(updatedMessages)
      setInput("")
      setIsStreaming(true)

      let convId = convIdRef.current
      if (!convId) {
        convId = await createConversation()
        convIdRef.current = convId
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
          body: JSON.stringify({
            messages: apiMessages,
            model: selectedModelRef.current.id,
          }),
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

              if (parsed.type === "error") throw new Error(parsed.message)

              if (parsed.type === "text_delta") {
                updateAssistantParts(assistantId, (parts) => {
                  const last = parts[parts.length - 1]
                  if (last?.type === "text") {
                    return [
                      ...parts.slice(0, -1),
                      { ...last, content: last.content + parsed.content },
                    ]
                  }
                  return [...parts, { type: "text" as const, content: parsed.content }]
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
              if (err instanceof Error && err.message !== "Failed to send message") {
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
            return [...parts, { type: "text" as const, content: `\n\n${errorText}` }]
          }
          return [{ type: "text" as const, content: errorText }]
        })
      } finally {
        setIsStreaming(false)
        const currentId = convIdRef.current
        if (currentId) {
          await updateConversation(currentId, messagesRef.current)
        }
      }
    },
    [createConversation, updateConversation, updateAssistantParts]
  )

  // Auto-send a prompt passed via ?q=... (Ideas page, landing CTAs). The
  // prompt arrives as a real user message so the assistant starts streaming
  // immediately — user doesn't have to click Send.
  useEffect(() => {
    if (initialPrompt && !initialPromptUsed.current) {
      initialPromptUsed.current = true
      sendMessage(initialPrompt)
    }
  }, [initialPrompt, sendMessage])
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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    await sendMessage(input)
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
      <div className="rounded-2xl border border-border bg-card shadow-[0_0_0_1px_var(--ring)]">
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask about a market, get a signal, or place a trade..."
          rows={1}
          className="w-full resize-none overflow-hidden bg-transparent px-4 pt-4 pb-2 font-body text-[15px] leading-relaxed text-foreground placeholder:text-muted-foreground focus:outline-none md:px-5"
        />
        <div className="flex items-center justify-between px-3 pb-3">
          <button
            type="button"
            className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          >
            <Plus className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-2">
            <ModelSelector selected={selectedModel} onSelect={setSelectedModel} />
            {input.trim() && !isStreaming ? (
              <button
                type="submit"
                className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground transition-opacity hover:opacity-90"
              >
                <Send className="h-4 w-4" />
              </button>
            ) : isStreaming ? (
              <div className="flex h-9 w-9 items-center justify-center">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
              </div>
            ) : (
              <button
                type="button"
                className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
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
            <div className="mx-auto max-w-3xl px-4 py-4 md:px-6 md:py-8">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`mb-4 md:mb-6 ${message.role === "user" ? "flex justify-end" : ""}`}
                >
                  <div
                    className={`${
                      message.role === "user"
                        ? "max-w-[90%] md:max-w-[85%] rounded-2xl rounded-br-lg bg-secondary dark:bg-foreground/10 px-4 py-2.5 md:px-5 md:py-3 text-foreground"
                        : "max-w-full md:max-w-[85%] pr-2 md:pr-8"
                    }`}
                  >
                    {message.role === "assistant" && (
                      <div className="mb-1.5 font-heading text-[11px] font-medium text-muted-foreground">
                        tickr
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

          <div className="shrink-0 border-t border-border/50 px-4 pb-3 pt-2 md:border-t-0 md:px-6 md:pb-4">
            <div className="mx-auto max-w-3xl">
              {inputBox}
              <p className="mt-1.5 hidden text-center font-heading text-xs text-muted-foreground md:block">
                tickr can make mistakes. Please double-check responses.
              </p>
            </div>
          </div>
        </>
      ) : (
        <div className="flex flex-1 flex-col px-4 md:px-6">
          <div className="flex flex-1 flex-col items-center justify-center">
            {/* Mascot character + heading */}
            <div className="mb-6 flex flex-col items-center gap-3 md:mb-8 md:flex-row md:gap-4">
              <MascotCharacter size={44} />
              <h1 className="text-center font-display text-2xl text-foreground/80 md:text-left md:text-4xl lg:text-[2.6rem]">
                What are we trading?
              </h1>
            </div>

            <div className="w-full max-w-xl">{inputBox}</div>

            {/* Suggested prompts — horizontal scroll on mobile with proper padding, 2 rows on desktop */}
            <div className="mt-4 w-full max-w-xl overflow-x-auto md:mt-5 md:max-w-none md:overflow-visible">
              {/* Mobile: single scrollable row with padding so first/last pills aren't clipped */}
              <div className="flex w-max items-center gap-2 pb-2 md:hidden">
                {suggestedPrompts.map(({ icon: Icon, label, prompt }) => (
                  <button
                    key={label}
                    onClick={() => { setInput(prompt); textareaRef.current?.focus() }}
                    className="flex shrink-0 items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 font-heading text-sm text-muted-foreground shadow-[0_0_0_1px_var(--ring)] transition-all hover:bg-secondary hover:text-foreground"
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {label}
                  </button>
                ))}
              </div>
              {/* Desktop: 2 centered rows */}
              <div className="hidden md:flex flex-col items-center gap-2">
                <div className="flex items-center gap-2">
                  {suggestedPrompts.slice(0, 4).map(({ icon: Icon, label, prompt }) => (
                    <button
                      key={label}
                      onClick={() => { setInput(prompt); textareaRef.current?.focus() }}
                      className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 font-heading text-sm text-muted-foreground shadow-[0_0_0_1px_var(--ring)] transition-all hover:bg-secondary hover:text-foreground"
                    >
                      <Icon className="h-3.5 w-3.5" />
                      {label}
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  {suggestedPrompts.slice(4).map(({ icon: Icon, label, prompt }) => (
                    <button
                      key={label}
                      onClick={() => { setInput(prompt); textareaRef.current?.focus() }}
                      className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 font-heading text-sm text-muted-foreground shadow-[0_0_0_1px_var(--ring)] transition-all hover:bg-secondary hover:text-foreground"
                    >
                      <Icon className="h-3.5 w-3.5" />
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <p className="py-3 text-center font-heading text-xs text-muted-foreground">
            tickr can make mistakes. Please double-check responses.
          </p>
        </div>
      )}
    </>
  )
}
