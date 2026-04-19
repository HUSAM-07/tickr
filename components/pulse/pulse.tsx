"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { useTradingContext } from "@/hooks/trading-context"
import type { TickResponse } from "@/lib/deriv/types"
import { PulseEngine, type EngineState } from "@/lib/pulse/engine"
import { PULSE_ASSETS, TEMPO_CONFIG } from "@/lib/pulse/types"
import { PulseCanvas } from "./pulse-canvas"
import { PulseSidebar } from "./pulse-sidebar"

export function Pulse() {
  const { client, connectionState } = useTradingContext()
  const [stake, setStake] = useState(1)
  const [engine, setEngine] = useState(() => new PulseEngine(PULSE_ASSETS[0].symbol))
  const [state, setState] = useState<EngineState>(() => engine.getState())
  const unsubTicksRef = useRef<(() => void) | null>(null)
  const currentSymbolRef = useRef<string>(PULSE_ASSETS[0].symbol)

  // Re-render sidebar on state changes
  useEffect(() => {
    return engine.onChange((s) => {
      setState({ ...s })
      currentSymbolRef.current = s.asset.symbol
    })
  }, [engine])

  // Subscribe to Deriv tick stream, re-subscribing whenever the asset changes
  useEffect(() => {
    if (connectionState !== "connected" && connectionState !== "authorized") {
      return
    }
    if (unsubTicksRef.current) {
      unsubTicksRef.current()
      unsubTicksRef.current = null
    }
    const symbol = state.asset.symbol
    const { unsubscribe } = client.subscribeTicks(symbol, (t: TickResponse) => {
      if (!t.tick) return
      // Guard against late ticks delivered after the user switched assets
      if (currentSymbolRef.current !== symbol) return
      engine.ingestTick(t.tick.quote, t.tick.epoch * 1000)
    })
    unsubTicksRef.current = unsubscribe
    return () => {
      unsubscribe()
      unsubTicksRef.current = null
    }
  }, [client, connectionState, state.asset.symbol, engine])

  const onReset = () => {
    const e = new PulseEngine(state.asset.symbol)
    setEngine(e)
    setState(e.getState())
  }

  const tempoLabel = TEMPO_CONFIG[state.tempo].label

  return (
    <main className="flex h-svh flex-col bg-background">
      <header className="flex items-center justify-between border-b border-border px-5 py-3">
        <div className="flex items-center gap-4">
          <Link
            href="/"
            className="flex items-center gap-1.5 rounded-md px-2 py-1 font-heading text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          >
            <ArrowLeft size={14} />
            Back
          </Link>
          <div className="flex flex-col">
            <span className="font-display text-xl leading-none">Pulse</span>
            <span className="font-heading text-[11px] text-muted-foreground">
              {state.asset.shortName} · {tempoLabel} · Demo mode
            </span>
          </div>
        </div>
        <span className="hidden font-heading text-[11px] text-muted-foreground md:block">
          Predict. Streak. Extract.
        </span>
      </header>

      <div className="flex flex-1 flex-col overflow-hidden md:flex-row">
        <div className="flex-1 p-4 md:p-5">
          <PulseCanvas engine={engine} className="h-full w-full" />
        </div>
        <div className="w-full border-t border-border md:w-[340px] md:border-l md:border-t-0">
          <PulseSidebar
            state={state}
            engine={engine}
            stake={stake}
            setStake={setStake}
            connectionState={connectionState}
            onReset={onReset}
          />
        </div>
      </div>
    </main>
  )
}
