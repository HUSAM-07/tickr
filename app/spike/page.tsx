"use client"

import { TradingProvider } from "@/hooks/trading-context"
import { SpikeHunter } from "@/components/spike/spike-hunter"

export default function SpikeHunterPage() {
  return (
    <TradingProvider>
      <SpikeHunter />
    </TradingProvider>
  )
}
