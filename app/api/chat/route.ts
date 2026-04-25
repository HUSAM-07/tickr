import { OpenRouter } from "@openrouter/sdk"
import { allTools, SYSTEM_PROMPT } from "@/lib/tools"
import type { WidgetType } from "@/lib/types"
import { SMA, RSI, EMA, BollingerBands, MACD, ATR } from "technicalindicators"
import { INTERVAL_MAP } from "@/lib/deriv/constants"

const openrouter = new OpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY,
})

const encoder = new TextEncoder()

function sseEncode(data: string): Uint8Array {
  return encoder.encode(`data: ${data}\n\n`)
}

type ToolCallAccumulator = {
  id: string
  name: string
  arguments: string
}

const WIDGET_NAMES = new Set([
  "show_bar_chart",
  "show_line_chart",
  "show_pie_chart",
  "show_metric_card",
  "show_data_table",
  "show_flow_diagram",
  "show_trading_chart",
  "place_trade",
  "get_portfolio",
  "get_signals",
  "show_leaderboard",
])

// analyze_market is a non-widget tool — it returns data to the LLM
const ANALYSIS_TOOL_NAMES = new Set(["analyze_market", "web_search"])

/** Map tool function names to widget type identifiers */
const TOOL_TO_WIDGET: Record<string, WidgetType> = {
  show_bar_chart: "bar_chart",
  show_line_chart: "line_chart",
  show_pie_chart: "pie_chart",
  show_metric_card: "metric_card",
  show_data_table: "data_table",
  show_flow_diagram: "flow_diagram",
  show_trading_chart: "trading_chart",
  place_trade: "trade_ticket",
  get_portfolio: "portfolio",
  get_signals: "signal_card",
  show_leaderboard: "leaderboard",
}

function toolNameToWidgetType(name: string): WidgetType {
  return TOOL_TO_WIDGET[name] ?? (name.replace("show_", "") as WidgetType)
}

const MAX_MESSAGES = 50
const MAX_CONTENT_LENGTH = 10_000
const ALLOWED_MODELS = new Set([
  "google/gemma-4-26b-a4b-it",
  "google/gemma-4-31b-it:free",
  "z-ai/glm-4.7-flash",
  "minimax/minimax-m2.1",
])

type Candle = {
  epoch: number
  open: number
  high: number
  low: number
  close: number
}

/** Minimum candle counts required for each indicator (period + warmup headroom). */
const MIN_CANDLES: Record<string, number> = {
  sma: 50,       // SMA-50 needs 50 closes
  ema: 20,       // EMA-20
  rsi: 15,       // RSI-14 + 1
  macd: 35,      // slowPeriod 26 + signalPeriod 9
  bollinger: 20, // period 20
  atr: 15,       // period 14 + 1
}

/** Timeframe fallback cascade — if a timeframe returns too few candles, try the next one up. */
const FALLBACK_ORDER = ["1m", "5m", "15m", "30m", "1h", "4h", "1d"]

type MarketStatus = {
  exchange_is_open: boolean
  is_trading_suspended: boolean
}

/**
 * Fetch the exchange open/suspended flags for a single symbol via Deriv's
 * active_symbols API. Authoritative, unlike epoch-staleness heuristics.
 * Returns null if the call fails or the symbol isn't listed — caller will fall
 * back to last-candle-age inference.
 */
async function fetchMarketStatus(symbol: string): Promise<MarketStatus | null> {
  try {
    const data = await new Promise<Record<string, unknown>>(
      async (resolve, reject) => {
        const { default: WS } = await import("ws")
        const ws = new WS("wss://api.derivws.com/trading/v1/options/ws/public")
        const timeout = setTimeout(() => {
          ws.close()
          reject(new Error("active_symbols timeout"))
        }, 8000)

        ws.on("open", () => {
          ws.send(
            JSON.stringify({
              active_symbols: "brief",
              product_type: "basic",
              req_id: 2,
            })
          )
        })
        ws.on("message", (msg: Buffer) => {
          clearTimeout(timeout)
          const parsed = JSON.parse(msg.toString())
          ws.close()
          resolve(parsed)
        })
        ws.on("error", (err: Error) => {
          clearTimeout(timeout)
          reject(err)
        })
      }
    )

    const list = (data.active_symbols ?? []) as Array<{
      symbol: string
      exchange_is_open: number
      is_trading_suspended: number
    }>
    const match = list.find((s) => s.symbol === symbol)
    if (!match) return null
    return {
      exchange_is_open: Boolean(match.exchange_is_open),
      is_trading_suspended: Boolean(match.is_trading_suspended),
    }
  } catch {
    return null
  }
}

async function fetchCandles(
  symbol: string,
  granularity: number,
  count: number
): Promise<Candle[]> {
  const data = await new Promise<Record<string, unknown>>(async (resolve, reject) => {
    const { default: WS } = await import("ws")
    const ws = new WS("wss://api.derivws.com/trading/v1/options/ws/public")
    const timeout = setTimeout(() => {
      ws.close()
      reject(new Error("Deriv WS timeout"))
    }, 15000)

    ws.on("open", () => {
      ws.send(
        JSON.stringify({
          ticks_history: symbol,
          style: "candles",
          granularity,
          count,
          end: "latest",
          req_id: 1,
        })
      )
    })
    ws.on("message", (msg: Buffer) => {
      clearTimeout(timeout)
      const parsed = JSON.parse(msg.toString())
      ws.close()
      resolve(parsed)
    })
    ws.on("error", (err: Error) => {
      clearTimeout(timeout)
      reject(err)
    })
  })

  if ((data as { error?: { message: string } }).error) {
    throw new Error(
      (data as { error: { message: string } }).error.message ||
        "Failed to fetch market data"
    )
  }

  return ((data.candles as Candle[]) ?? []).map((c) => ({
    epoch: Number(c.epoch),
    open: Number(c.open),
    high: Number(c.high),
    low: Number(c.low),
    close: Number(c.close),
  }))
}

/** Fetch candle data from Deriv and compute technical indicators server-side. */
async function computeMarketAnalysis(
  symbol: string,
  timeframe?: string,
  indicators?: string[]
): Promise<Record<string, unknown>> {
  const requestedTf = timeframe ?? "5m"
  const requestedIndicators = indicators ?? ["sma", "rsi"]

  // Request count sized to the most demanding indicator, with generous headroom
  // so markets with trading-hour gaps (forex, commodities) still yield enough candles.
  const neededForIndicators = Math.max(
    ...requestedIndicators.map((k) => MIN_CANDLES[k] ?? 0),
    50
  )
  const count = Math.max(500, neededForIndicators * 4)

  // Try requested timeframe first, then cascade to higher granularities if data is too thin.
  const tfsToTry = [
    requestedTf,
    ...FALLBACK_ORDER.slice(
      FALLBACK_ORDER.indexOf(requestedTf) + 1
    ).filter((tf) => INTERVAL_MAP[tf]),
  ]

  let candles: Candle[] = []
  let tfUsed = requestedTf
  let fallbackReason: string | null = null
  let lastError: Error | null = null

  // Kick off the authoritative market-status lookup in parallel with the first
  // candle fetch so we don't pay the extra round-trip sequentially.
  const statusPromise = fetchMarketStatus(symbol)

  for (const tf of tfsToTry) {
    const gran = INTERVAL_MAP[tf]
    if (!gran) continue
    try {
      const fetched = await fetchCandles(symbol, gran, count)
      if (fetched.length >= neededForIndicators) {
        candles = fetched
        tfUsed = tf
        if (tf !== requestedTf) {
          fallbackReason = `Only ${fetched.length < neededForIndicators ? "insufficient" : "limited"} candle history available for ${symbol} on ${requestedTf}; fell back to ${tf}.`
        }
        break
      }
      // Keep the best set we've seen as a partial result in case every fallback is thin.
      if (fetched.length > candles.length) {
        candles = fetched
        tfUsed = tf
        fallbackReason = `Limited candle history on ${requestedTf} for ${symbol}; using ${tf} (${fetched.length} candles).`
      }
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err))
    }
  }

  const status = await statusPromise

  if (candles.length === 0) {
    throw new Error(
      lastError?.message ?? `No candle data available for ${symbol}`
    )
  }

  const closes = candles.map((c) => c.close)
  const highs = candles.map((c) => c.high)
  const lows = candles.map((c) => c.low)
  const currentPrice = closes[closes.length - 1]
  const prevPrice = closes[closes.length - 2] ?? currentPrice
  const priceChange = ((currentPrice - prevPrice) / prevPrice) * 100
  const granUsed = INTERVAL_MAP[tfUsed]

  const lastCandle = candles[candles.length - 1]
  const lastTickAt = lastCandle.epoch
  const nowSec = Math.floor(Date.now() / 1000)
  const lastTickAgeSec = Math.max(0, nowSec - lastTickAt)
  // Heuristic staleness: a live market produces a new candle within ~1 interval.
  // If more than 2× the granularity has passed with no new candle, the feed is dark.
  const staleByEpoch = lastTickAgeSec > granUsed * 2

  // Prefer the authoritative active_symbols signal; fall back to epoch staleness.
  let marketStatus: "open" | "closed" | "suspended"
  if (status?.is_trading_suspended) {
    marketStatus = "suspended"
  } else if (status && !status.exchange_is_open) {
    marketStatus = "closed"
  } else if (!status && staleByEpoch) {
    marketStatus = "closed"
  } else {
    marketStatus = "open"
  }

  const result: Record<string, unknown> = {
    symbol,
    timeframe: tfUsed,
    timeframe_requested: requestedTf,
    current_price: currentPrice,
    price_change_pct: Number(priceChange.toFixed(4)),
    candles_analyzed: candles.length,
    market_status: marketStatus,
    exchange_is_open: status?.exchange_is_open ?? null,
    is_trading_suspended: status?.is_trading_suspended ?? null,
    last_tick_at: lastTickAt,
    last_tick_age_seconds: lastTickAgeSec,
    price_is_stale: marketStatus !== "open",
    high_24: Math.max(
      ...highs.slice(-Math.min(highs.length, Math.floor(86400 / granUsed)))
    ),
    low_24: Math.min(
      ...lows.slice(-Math.min(lows.length, Math.floor(86400 / granUsed)))
    ),
  }
  if (fallbackReason) result.fallback_reason = fallbackReason
  if (marketStatus !== "open") {
    const closedAt = new Date(lastTickAt * 1000).toISOString()
    result.market_status_note =
      marketStatus === "suspended"
        ? `Trading is suspended for ${symbol}. Showing last known price from ${closedAt}.`
        : `Market is closed for ${symbol}. Showing last close from ${closedAt}.`
  }

  const unavailable: string[] = []
  const markUnavailable = (name: string, min: number) => {
    unavailable.push(`${name} (needs ${min} candles, have ${candles.length})`)
  }

  if (requestedIndicators.includes("sma")) {
    const sma20 = SMA.calculate({ period: 20, values: closes })
    const sma50 = SMA.calculate({ period: 50, values: closes })
    result.sma_20 =
      sma20.length > 0 ? Number(sma20[sma20.length - 1].toFixed(5)) : null
    result.sma_50 =
      sma50.length > 0 ? Number(sma50[sma50.length - 1].toFixed(5)) : null
    if (result.sma_50 == null) markUnavailable("SMA-50", 50)
  }

  if (requestedIndicators.includes("ema")) {
    const ema20 = EMA.calculate({ period: 20, values: closes })
    result.ema_20 =
      ema20.length > 0 ? Number(ema20[ema20.length - 1].toFixed(5)) : null
    if (result.ema_20 == null) markUnavailable("EMA-20", 20)
  }

  if (requestedIndicators.includes("rsi")) {
    const rsi = RSI.calculate({ period: 14, values: closes })
    result.rsi_14 =
      rsi.length > 0 ? Number(rsi[rsi.length - 1].toFixed(2)) : null
    if (result.rsi_14 == null) markUnavailable("RSI-14", 15)
  }

  if (requestedIndicators.includes("macd")) {
    const macd = MACD.calculate({
      values: closes,
      fastPeriod: 12,
      slowPeriod: 26,
      signalPeriod: 9,
      SimpleMAOscillator: false,
      SimpleMASignal: false,
    })
    const latest = macd[macd.length - 1]
    if (latest) {
      result.macd = {
        macd: latest.MACD ? Number(latest.MACD.toFixed(5)) : null,
        signal: latest.signal ? Number(latest.signal.toFixed(5)) : null,
        histogram:
          latest.histogram ? Number(latest.histogram.toFixed(5)) : null,
      }
    } else {
      result.macd = null
      markUnavailable("MACD", 35)
    }
  }

  if (requestedIndicators.includes("bollinger")) {
    const bb = BollingerBands.calculate({
      period: 20,
      values: closes,
      stdDev: 2,
    })
    const latest = bb[bb.length - 1]
    if (latest) {
      result.bollinger = {
        upper: Number(latest.upper.toFixed(5)),
        middle: Number(latest.middle.toFixed(5)),
        lower: Number(latest.lower.toFixed(5)),
      }
    } else {
      result.bollinger = null
      markUnavailable("Bollinger Bands", 20)
    }
  }

  if (requestedIndicators.includes("atr")) {
    const atr = ATR.calculate({
      period: 14,
      high: highs,
      low: lows,
      close: closes,
    })
    result.atr_14 =
      atr.length > 0 ? Number(atr[atr.length - 1].toFixed(5)) : null
    if (result.atr_14 == null) markUnavailable("ATR-14", 15)
  }

  if (unavailable.length > 0) {
    result.unavailable_indicators = unavailable
  }

  // Derive trend direction from SMA crossover
  if (result.sma_20 != null && result.sma_50 != null) {
    result.trend =
      (result.sma_20 as number) > (result.sma_50 as number) ? "bullish" : "bearish"
  } else {
    result.trend = priceChange > 0 ? "bullish" : "bearish"
  }

  // Volatility assessment from ATR or price range
  const recentRange = highs.slice(-20).map((h, i) => h - lows.slice(-20)[i])
  const avgRange = recentRange.reduce((a, b) => a + b, 0) / recentRange.length
  const rangeRatio = avgRange / currentPrice
  result.volatility = rangeRatio > 0.01 ? "high" : rangeRatio > 0.003 ? "medium" : "low"

  return result
}

/** Perform a web search via Brave Search API — server-side only */
async function performWebSearch(
  query: string,
  count: number = 5
): Promise<Record<string, unknown>> {
  const apiKey = process.env.BRAVE_API_KEY
  if (!apiKey) {
    return { error: "Web search is not configured. BRAVE_API_KEY is missing." }
  }

  const url = new URL("https://api.search.brave.com/res/v1/web/search")
  url.searchParams.set("q", query)
  url.searchParams.set("count", String(Math.min(Math.max(count, 1), 10)))
  url.searchParams.set("text_decorations", "false")
  url.searchParams.set("search_lang", "en")

  const response = await fetch(url.toString(), {
    headers: {
      Accept: "application/json",
      "Accept-Encoding": "gzip",
      "X-Subscription-Token": apiKey,
    },
  })

  if (!response.ok) {
    return { error: `Search failed: ${response.status} ${response.statusText}` }
  }

  const data = await response.json()

  // Extract and condense results for the LLM context window
  const webResults = (data.web?.results ?? [])
    .slice(0, count)
    .map((r: { title: string; url: string; description: string; age?: string }) => ({
      title: r.title,
      url: r.url,
      snippet: r.description,
      age: r.age ?? null,
    }))

  // Include news results if present
  const newsResults = (data.news?.results ?? [])
    .slice(0, 3)
    .map((r: { title: string; url: string; description: string; age?: string }) => ({
      title: r.title,
      url: r.url,
      snippet: r.description,
      age: r.age ?? null,
    }))

  return {
    query,
    web_results: webResults,
    news_results: newsResults,
    result_count: webResults.length + newsResults.length,
  }
}

export async function POST(request: Request) {
  const body = (await request.json()) as {
    messages?: unknown
    model?: string
  }

  const messages = body.messages as
    | { role: "user" | "assistant"; content: string }[]
    | undefined

  if (!Array.isArray(messages) || messages.length === 0) {
    return new Response("Invalid messages", { status: 400 })
  }

  if (messages.length > MAX_MESSAGES) {
    return new Response("Too many messages", { status: 400 })
  }

  for (const msg of messages) {
    if (
      typeof msg.content !== "string" ||
      msg.content.length > MAX_CONTENT_LENGTH
    ) {
      return new Response("Invalid message content", { status: 400 })
    }
  }

  const modelId =
    body.model && ALLOWED_MODELS.has(body.model)
      ? body.model
      : "minimax/minimax-m2.1"

  // Build conversation with system prompt
  const conversationMessages: Array<{
    role: string
    content?: string
    toolCalls?: Array<{ id: string; type: string; function: { name: string; arguments: string } }>
    toolCallId?: string
  }> = [
    { role: "system", content: SYSTEM_PROMPT },
    ...messages,
  ]

  const readable = new ReadableStream({
    async start(controller) {
      try {
        let iterations = 0
        const MAX_ITERATIONS = 5

        while (iterations < MAX_ITERATIONS) {
          iterations++

          const stream = await openrouter.chat.send({
            chatRequest: {
              model: modelId,
              messages: conversationMessages as Parameters<
                typeof openrouter.chat.send
              >[0]["chatRequest"]["messages"],
              tools: allTools,
              stream: true,
            },
          })

          let accumulatedContent = ""
          let finishReason: string | null = null
          const toolCalls = new Map<number, ToolCallAccumulator>()
          let chunkCount = 0

          for await (const chunk of stream) {
            chunkCount++

            // Some providers return error in the chunk itself
            if ((chunk as Record<string, unknown>).error) {
              const err = (chunk as Record<string, unknown>).error as { message?: string }
              throw new Error(err?.message ?? "Model returned an error")
            }

            const choice = chunk.choices?.[0]
            if (!choice) continue

            // Track finish reason
            if (choice.finishReason) {
              finishReason = choice.finishReason as string
            }

            // Stream text deltas
            const content = choice.delta?.content
            if (content) {
              accumulatedContent += content
              controller.enqueue(
                sseEncode(JSON.stringify({ type: "text_delta", content }))
              )
            }

            // Accumulate tool calls
            const deltaToolCalls = choice.delta?.toolCalls
            if (deltaToolCalls) {
              for (const tc of deltaToolCalls) {
                const existing = toolCalls.get(tc.index)
                if (existing) {
                  // Append arguments fragment
                  if (tc.function?.arguments) {
                    existing.arguments += tc.function.arguments
                  }
                } else {
                  // New tool call
                  toolCalls.set(tc.index, {
                    id: tc.id ?? "",
                    name: tc.function?.name ?? "",
                    arguments: tc.function?.arguments ?? "",
                  })
                }
              }
            }
          }

          console.log(`[chat/route] Stream done: ${chunkCount} chunks, finishReason=${finishReason}, content=${accumulatedContent.length} chars, toolCalls=${toolCalls.size}`)

          // If model finished with tool calls, process them and loop
          if (finishReason === "tool_calls" && toolCalls.size > 0) {
            const assistantToolCalls: Array<{
              id: string
              type: string
              function: { name: string; arguments: string }
            }> = []

            // Emit widget events and build tool call records
            for (const [, tc] of toolCalls) {
              if (WIDGET_NAMES.has(tc.name)) {
                try {
                  const parsedArgs = JSON.parse(tc.arguments)
                  controller.enqueue(
                    sseEncode(
                      JSON.stringify({
                        type: "widget",
                        toolCallId: tc.id,
                        widgetType: toolNameToWidgetType(tc.name),
                        data: parsedArgs,
                      })
                    )
                  )
                } catch {
                  // If JSON parse fails, emit as text
                  controller.enqueue(
                    sseEncode(
                      JSON.stringify({
                        type: "text_delta",
                        content: `\n[Failed to render ${tc.name}]\n`,
                      })
                    )
                  )
                }
              }

              assistantToolCalls.push({
                id: tc.id,
                type: "function",
                function: {
                  name: tc.name,
                  arguments: tc.arguments,
                },
              })
            }

            // Append assistant message with tool calls
            conversationMessages.push({
              role: "assistant",
              content: accumulatedContent || undefined,
              toolCalls: assistantToolCalls,
            })

            // Append tool results
            for (const tc of assistantToolCalls) {
              let toolResult: string

              if (tc.function.name === "analyze_market") {
                try {
                  const args = JSON.parse(tc.function.arguments)
                  toolResult = JSON.stringify(
                    await computeMarketAnalysis(args.symbol, args.timeframe, args.indicators)
                  )
                } catch (err) {
                  toolResult = JSON.stringify({
                    error: err instanceof Error ? err.message : "Analysis failed",
                  })
                }
              } else if (tc.function.name === "web_search") {
                try {
                  const args = JSON.parse(tc.function.arguments)
                  toolResult = JSON.stringify(
                    await performWebSearch(args.query, args.count)
                  )
                } catch (err) {
                  toolResult = JSON.stringify({
                    error: err instanceof Error ? err.message : "Web search failed",
                  })
                }
              } else {
                toolResult = JSON.stringify({ rendered: true })
              }

              conversationMessages.push({
                role: "tool",
                content: toolResult,
                toolCallId: tc.id,
              })
            }

            // Continue the loop — model will generate more text
            continue
          }

          // Model finished normally — break the loop
          break
        }

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
