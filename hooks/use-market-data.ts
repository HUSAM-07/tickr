"use client"

import { useState, useEffect, useRef } from "react"
import { getDerivClient } from "@/lib/deriv/client"
import type { TickResponse } from "@/lib/deriv/types"

type TickData = {
  symbol: string
  quote: number
  epoch: number
  ask: number
  bid: number
}

/**
 * Hook to subscribe to real-time tick data for a symbol.
 * Auto-subscribes on mount, unsubscribes on unmount or symbol change.
 */
export function useMarketData(symbol: string | null) {
  const [tick, setTick] = useState<TickData | null>(null)
  const [isSubscribed, setIsSubscribed] = useState(false)
  const unsubRef = useRef<(() => void) | null>(null)

  useEffect(() => {
    if (!symbol) return

    const client = getDerivClient()

    const { unsubscribe } = client.subscribeTicks(symbol, (data: TickResponse) => {
      if (data.tick) {
        setTick({
          symbol: data.tick.symbol,
          quote: data.tick.quote,
          epoch: data.tick.epoch,
          ask: data.tick.ask,
          bid: data.tick.bid,
        })
        setIsSubscribed(true)
      }
    })

    unsubRef.current = unsubscribe

    return () => {
      unsubscribe()
      unsubRef.current = null
      setIsSubscribed(false)
    }
  }, [symbol])

  return { tick, isSubscribed }
}
