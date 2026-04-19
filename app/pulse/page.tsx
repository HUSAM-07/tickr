"use client"

import { TradingProvider } from "@/hooks/trading-context"
import { Pulse } from "@/components/pulse/pulse"

export default function PulsePage() {
  return (
    <TradingProvider>
      <Pulse />
    </TradingProvider>
  )
}
