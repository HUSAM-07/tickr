"use client"

import { TradingProvider } from "@/hooks/trading-context"
import { GridRush } from "@/components/game/grid-rush"

export default function GamePage() {
  return (
    <TradingProvider>
      <GridRush />
    </TradingProvider>
  )
}
