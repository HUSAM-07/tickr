"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { getDerivClient } from "@/lib/deriv/client"
import { INTERVAL_MAP } from "@/lib/deriv/constants"
import type {
  CandleData,
  TicksHistoryResponse,
  TickResponse,
} from "@/lib/deriv/types"

type ChartDataState = {
  candles: CandleData[]
  isLoading: boolean
  error: string | null
  latestCandle: CandleData | null
  marketStatus: "open" | "closed" | "suspended" | "unknown"
  lastTickAt: number | null
}

type ActiveSymbolsResponse = {
  active_symbols?: Array<{
    symbol: string
    exchange_is_open?: number
    is_trading_suspended?: number
  }>
}

/**
 * Hook that fetches historical candle data and subscribes to live tick updates.
 * Ticks are aggregated into the current candle in real-time.
 */
export function useChartData(
  symbol: string | null,
  interval: string = "1m",
  count: number = 100
): ChartDataState {
  const [candles, setCandles] = useState<CandleData[]>([])
  const [latestCandle, setLatestCandle] = useState<CandleData | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [marketStatus, setMarketStatus] =
    useState<"open" | "closed" | "suspended" | "unknown">("unknown")
  const [lastTickAt, setLastTickAt] = useState<number | null>(null)
  const unsubRef = useRef<(() => void) | null>(null)
  const currentCandleRef = useRef<CandleData | null>(null)
  const granularityRef = useRef<number>(60)

  const fetchAndSubscribe = useCallback(async () => {
    if (!symbol) return

    const client = getDerivClient()
    const granularity = INTERVAL_MAP[interval] ?? 60
    granularityRef.current = granularity

    // Clean up previous subscription
    if (unsubRef.current) {
      unsubRef.current()
      unsubRef.current = null
    }

    setIsLoading(true)
    setError(null)
    currentCandleRef.current = null

    try {
      // Fetch historical candles
      const history = (await client.getTicksHistory(symbol, {
        style: "candles",
        granularity,
        count,
      })) as TicksHistoryResponse

      if (history.candles && history.candles.length > 0) {
        const mapped: CandleData[] = history.candles.map((c) => ({
          time: c.epoch,
          open: Number(c.open),
          high: Number(c.high),
          low: Number(c.low),
          close: Number(c.close),
        }))
        setCandles(mapped)

        // Initialize current candle from the last historical candle
        const last = mapped[mapped.length - 1]
        currentCandleRef.current = { ...last }
        setLatestCandle({ ...last })
        setLastTickAt(last.time)
      }

      // Fetch market status once per symbol/interval change.
      // Best-effort: a failure just leaves status as "unknown" and we rely on
      // the live tick stream to flip it to "open" if data flows.
      client
        .getActiveSymbols()
        .then((resp) => {
          const list = (resp as ActiveSymbolsResponse).active_symbols ?? []
          const match = list.find((s) => s.symbol === symbol)
          if (!match) return
          if (match.is_trading_suspended) setMarketStatus("suspended")
          else if (!match.exchange_is_open) setMarketStatus("closed")
          else setMarketStatus("open")
        })
        .catch(() => {
          /* leave as unknown */
        })

      // Subscribe to live ticks — we aggregate them into candles client-side
      const { unsubscribe } = client.subscribeTicks(
        symbol,
        (data: TickResponse) => {
          if (!data.tick) return

          const tickEpoch = data.tick.epoch
          const tickPrice = data.tick.quote
          const gran = granularityRef.current

          // Calculate which candle period this tick belongs to
          const candleTime = Math.floor(tickEpoch / gran) * gran

          const current = currentCandleRef.current

          if (!current || candleTime > current.time) {
            // New candle period — start a fresh candle
            const newCandle: CandleData = {
              time: candleTime,
              open: tickPrice,
              high: tickPrice,
              low: tickPrice,
              close: tickPrice,
            }
            currentCandleRef.current = newCandle
            setLatestCandle({ ...newCandle })
          } else {
            // Same candle period — update OHLC
            current.high = Math.max(current.high, tickPrice)
            current.low = Math.min(current.low, tickPrice)
            current.close = tickPrice
            setLatestCandle({ ...current })
          }
          setLastTickAt(tickEpoch)
          // Receiving a live tick is proof the market is open even if
          // active_symbols said otherwise (or hadn't responded yet).
          setMarketStatus("open")
        }
      )
      unsubRef.current = unsubscribe
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load chart data"
      )
    } finally {
      setIsLoading(false)
    }
  }, [symbol, interval, count])

  useEffect(() => {
    fetchAndSubscribe()

    return () => {
      if (unsubRef.current) {
        unsubRef.current()
        unsubRef.current = null
      }
    }
  }, [fetchAndSubscribe])

  return { candles, isLoading, error, latestCandle, marketStatus, lastTickAt }
}
