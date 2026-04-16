"use client"

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  useCallback,
  useRef,
  type ReactNode,
} from "react"
import { useTradingContext } from "@/hooks/trading-context"
import { SYMBOL_DISPLAY } from "@/lib/deriv/constants"
import type { TickResponse } from "@/lib/deriv/types"

export type TickData = {
  symbol: string
  quote: number
  epoch: number
  ask: number
  bid: number
}

type MarketDataState = {
  /** Latest tick for every subscribed symbol */
  ticks: Map<string, TickData>
  /** Whether we have at least one active subscription */
  isSubscribed: boolean
  /** Get tick for a specific symbol (convenience) */
  getTick: (symbol: string) => TickData | undefined
  /** All symbol keys we're subscribed to */
  symbols: string[]
}

const MarketDataContext = createContext<MarketDataState | null>(null)

const ALL_SYMBOLS = Object.keys(SYMBOL_DISPLAY)

export function MarketDataProvider({ children }: { children: ReactNode }) {
  const { client, connectionState } = useTradingContext()
  const [ticks, setTicks] = useState<Map<string, TickData>>(new Map())
  const unsubscribesRef = useRef<Array<() => void>>([])

  // Derive subscription state from ticks — no separate setState needed
  const isSubscribed = useMemo(() => ticks.size > 0, [ticks])

  // Subscribe to all symbols when connected
  useEffect(() => {
    if (connectionState !== "connected" && connectionState !== "authorized") {
      return
    }

    const tickMap = new Map<string, TickData>()
    const unsubs: Array<() => void> = []

    for (const symbol of ALL_SYMBOLS) {
      const { unsubscribe } = client.subscribeTicks(symbol, (data: TickResponse) => {
        if (data.tick) {
          tickMap.set(symbol, {
            symbol: data.tick.symbol,
            quote: data.tick.quote,
            epoch: data.tick.epoch,
            ask: data.tick.ask,
            bid: data.tick.bid,
          })
          // Spread into new Map to trigger React re-render
          setTicks(new Map(tickMap))
        }
      })
      unsubs.push(unsubscribe)
    }

    unsubscribesRef.current = unsubs

    return () => {
      for (const unsub of unsubs) {
        unsub()
      }
      unsubscribesRef.current = []
      setTicks(new Map())
    }
  }, [client, connectionState])

  const getTick = useCallback(
    (symbol: string) => ticks.get(symbol),
    [ticks]
  )

  return (
    <MarketDataContext.Provider
      value={{ ticks, isSubscribed, getTick, symbols: ALL_SYMBOLS }}
    >
      {children}
    </MarketDataContext.Provider>
  )
}

export function useMarketDataContext(): MarketDataState {
  const ctx = useContext(MarketDataContext)
  if (!ctx) {
    throw new Error("useMarketDataContext must be used within <MarketDataProvider>")
  }
  return ctx
}
