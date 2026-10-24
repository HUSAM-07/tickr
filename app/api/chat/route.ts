import type Anthropic from "@anthropic-ai/sdk"
import { DEFAULT_MODEL, MODELS } from "@/lib/models"
import { runAgent } from "@/lib/chat/agent"
import { createServerSupabaseClient } from "@/lib/supabase-server"

const encoder = new TextEncoder()

function sseEncode(data: string): Uint8Array {
  return encoder.encode(`data: ${data}\n\n`)
}

const MAX_MESSAGES = 50
const MAX_CONTENT_LENGTH = 10_000
const ALLOWED_MODELS = new Set(MODELS.map((m) => m.id))

export async function POST(request: Request) {
  const supabase = await createServerSupabaseClient()
  const { data: claimsData, error: claimsError } =
    await supabase.auth.getClaims()

  if (claimsError || !claimsData?.claims.sub) {
    return new Response("Unauthorized", { status: 401 })
  }

  let parsedBody: unknown

  try {
    parsedBody = await request.json()
  } catch {
    return new Response("Invalid JSON", { status: 400 })
  }

  if (
    !parsedBody ||
    typeof parsedBody !== "object" ||
    Array.isArray(parsedBody)
  ) {
    return new Response("Invalid request body", { status: 400 })
  }

  const body = parsedBody as { messages?: unknown; model?: unknown }

  const messages = body.messages

  if (!Array.isArray(messages) || messages.length === 0) {
    return new Response("Invalid messages", { status: 400 })
  }

  if (messages.length > MAX_MESSAGES) {
    return new Response("Too many messages", { status: 400 })
  }

  for (const msg of messages) {
    if (
      !msg ||
      typeof msg !== "object" ||
      Array.isArray(msg) ||
      !("role" in msg) ||
      (msg.role !== "user" && msg.role !== "assistant") ||
      !("content" in msg) ||
      typeof msg.content !== "string" ||
      msg.content.length === 0 ||
      msg.content.length > MAX_CONTENT_LENGTH
    ) {
      return new Response("Invalid message", { status: 400 })
    }
  }

  const modelId =
    typeof body.model === "string" && ALLOWED_MODELS.has(body.model)
      ? body.model
      : DEFAULT_MODEL.id

  const { data: rateLimitAllowed, error: rateLimitError } = await supabase.rpc(
    "consume_api_rate_limit",
    { rate_scope: "chat" }
  )

  if (rateLimitError) {
    console.error("[chat/route] Rate-limit check failed:", rateLimitError)
    return new Response("Service temporarily unavailable", { status: 503 })
  }

  if (rateLimitAllowed !== true) {
    return new Response("Rate limit exceeded", {
      status: 429,
      headers: { "Retry-After": "60" },
    })
  }

  const readable = new ReadableStream({
    async start(controller) {
      try {
        await runAgent({
          model: modelId,
          messages: messages as Anthropic.MessageParam[],
          onEvent: (event) =>
            controller.enqueue(sseEncode(JSON.stringify(event))),
        })

        controller.enqueue(sseEncode("[DONE]"))
        controller.close()
      } catch (error) {
        console.error("[chat/route] Stream error:", error)
        // Don't leak internal error details to the client
        const message = "Something went wrong. Please try again."
        controller.enqueue(
          sseEncode(JSON.stringify({ type: "error", message }))
        )
        controller.enqueue(sseEncode("[DONE]"))
        controller.close()
      }
    },
  })

  return new Response(readable, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  })
}
