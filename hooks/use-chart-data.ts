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
      }

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

  return { candles, isLoading, error, latestCandle }
}
