import Anthropic from "@anthropic-ai/sdk"
import { allTools, SYSTEM_PROMPT } from "@/lib/tools"
import type { WidgetType } from "@/lib/types"
import { SMA, RSI, EMA, BollingerBands, MACD, ATR } from "technicalindicators"
import { INTERVAL_MAP } from "@/lib/deriv/constants"

// Reads ANTHROPIC_API_KEY from the environment
const anthropic = new Anthropic()

/** Tool definitions in the Messages API shape ({ name, description, input_schema }) */
const tools: Anthropic.Tool[] = allTools.map(({ function: fn }) => ({
  name: fn.name,
  description: fn.description,
  input_schema: fn.parameters as Anthropic.Tool.InputSchema,
}))

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

type Candle = {
  epoch: number
  open: number
  high: number
  low: number
  close: number
}

/** Minimum candle counts required for each indicator (period + warmup headroom). */
const MIN_CANDLES: Record<string, number> = {
  sma: 50, // SMA-50 needs 50 closes
  ema: 20, // EMA-20
  rsi: 15, // RSI-14 + 1
  macd: 35, // slowPeriod 26 + signalPeriod 9
  bollinger: 20, // period 20
  atr: 15, // period 14 + 1
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
  const data = await new Promise<Record<string, unknown>>(
    async (resolve, reject) => {
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
    }
  )

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
    ...FALLBACK_ORDER.slice(FALLBACK_ORDER.indexOf(requestedTf) + 1).filter(
      (tf) => INTERVAL_MAP[tf]
    ),
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
        histogram: latest.histogram
          ? Number(latest.histogram.toFixed(5))
          : null,
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
      (result.sma_20 as number) > (result.sma_50 as number)
        ? "bullish"
        : "bearish"
  } else {
    result.trend = priceChange > 0 ? "bullish" : "bearish"
  }

  // Volatility assessment from ATR or price range
  const recentRange = highs.slice(-20).map((h, i) => h - lows.slice(-20)[i])
  const avgRange = recentRange.reduce((a, b) => a + b, 0) / recentRange.length
  const rangeRatio = avgRange / currentPrice
  result.volatility =
    rangeRatio > 0.01 ? "high" : rangeRatio > 0.003 ? "medium" : "low"

  return annotateMacd(result)
}

/**
 * Spell out where the MACD line sits relative to its signal line, so the model
 * doesn't have to compare negative numbers itself (-110 is ABOVE -144).
 * Idempotent, so it can also be applied to previously saved results.
 */
export function annotateMacd(
  result: Record<string, unknown>
): Record<string, unknown> {
  const m = result.macd as
    | { macd: number | null; signal: number | null }
    | null
    | undefined
  if (!m || m.macd == null || m.signal == null) return result
  const diff = m.macd - m.signal
  return {
    ...result,
    macd: {
      ...m,
      line_vs_signal: diff > 0 ? "above" : diff < 0 ? "below" : "equal",
      bias: diff > 0 ? "bullish" : diff < 0 ? "bearish" : "neutral",
    },
  }
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
    .map(
      (r: {
        title: string
        url: string
        description: string
        age?: string
      }) => ({
        title: r.title,
        url: r.url,
        snippet: r.description,
        age: r.age ?? null,
      })
    )

  // Include news results if present
  const newsResults = (data.news?.results ?? [])
    .slice(0, 3)
    .map(
      (r: {
        title: string
        url: string
        description: string
        age?: string
      }) => ({
        title: r.title,
        url: r.url,
        snippet: r.description,
        age: r.age ?? null,
      })
    )

  return {
    query,
    web_results: webResults,
    news_results: newsResults,
    result_count: webResults.length + newsResults.length,
  }
}

export type AgentEvent =
  | { type: "text_delta"; content: string }
  | {
      type: "widget"
      toolCallId: string
      widgetType: WidgetType
      data: unknown
    }

export type ToolExecutor = (
  name: string,
  input: unknown
) => Promise<Record<string, unknown>>

/** Run a data tool server-side. Widget tools render on the client, so they just acknowledge. */
export async function executeTool(
  name: string,
  input: unknown
): Promise<Record<string, unknown>> {
  if (name === "analyze_market") {
    const args = input as {
      symbol: string
      timeframe?: string
      indicators?: string[]
    }
    return computeMarketAnalysis(args.symbol, args.timeframe, args.indicators)
  }
  if (name === "web_search") {
    const args = input as { query: string; count?: number }
    return performWebSearch(args.query, args.count)
  }
  return { rendered: true }
}

const MAX_ITERATIONS = 5

/**
 * The chat agent loop: stream a model turn, emit widget tool calls, run data
 * tools, and feed the results back until the model stops calling tools.
 * Returns every API response and the full conversation so callers like the
 * benchmark can inspect usage, stop reasons, and the transcript.
 */
export async function runAgent({
  model,
  messages,
  onEvent,
  effort = "medium",
  runTool = executeTool,
}: {
  model: string
  messages: Anthropic.MessageParam[]
  onEvent: (event: AgentEvent) => void
  effort?: "low" | "medium" | "high" | "xhigh" | "max"
  runTool?: ToolExecutor
}): Promise<{
  responses: Anthropic.Message[]
  conversation: Anthropic.MessageParam[]
}> {
  const conversation = [...messages]
  const responses: Anthropic.Message[] = []

  for (let i = 0; i < MAX_ITERATIONS; i++) {
    const stream = anthropic.messages.stream({
      model,
      max_tokens: 64000,
      system: SYSTEM_PROMPT,
      messages: conversation,
      tools,
      output_config: { effort },
      // Caches tools + system prompt + history so each tool-loop turn reuses the prefix
      cache_control: { type: "ephemeral" },
    })

    stream.on("text", (content) => onEvent({ type: "text_delta", content }))

    const message = await stream.finalMessage()
    responses.push(message)

    console.log(
      `[agent] Turn done: model=${message.model}, stop_reason=${message.stop_reason}, blocks=${message.content.length}, cache_read=${message.usage.cache_read_input_tokens ?? 0}`
    )

    if (message.stop_reason === "refusal") {
      onEvent({
        type: "text_delta",
        content: "\n\nI can't help with that request.",
      })
      break
    }

    // Pass the full content back (thinking blocks included) so the next turn continues it
    conversation.push({ role: "assistant", content: message.content })

    const toolUses = message.content.filter(
      (b): b is Anthropic.ToolUseBlock => b.type === "tool_use"
    )
    if (message.stop_reason !== "tool_use" || toolUses.length === 0) break

    for (const tu of toolUses) {
      if (WIDGET_NAMES.has(tu.name)) {
        onEvent({
          type: "widget",
          toolCallId: tu.id,
          widgetType: toolNameToWidgetType(tu.name),
          data: tu.input,
        })
      }
    }

    const toolResults = await Promise.all(
      toolUses.map(async (tu): Promise<Anthropic.ToolResultBlockParam> => {
        try {
          return {
            type: "tool_result",
            tool_use_id: tu.id,
            content: JSON.stringify(await runTool(tu.name, tu.input)),
          }
        } catch (err) {
          return {
            type: "tool_result",
            tool_use_id: tu.id,
            content: JSON.stringify({
              error: err instanceof Error ? err.message : "Tool call failed",
            }),
            is_error: true,
          }
        }
      })
    )

    // All results go back in one user message; the model continues from there
    conversation.push({ role: "user", content: toolResults })
  }

  return { responses, conversation }
}
