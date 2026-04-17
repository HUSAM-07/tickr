"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { useTradingContext } from "@/hooks/trading-context"
import { SYMBOL_DISPLAY } from "@/lib/deriv/constants"
import type { TickResponse } from "@/lib/deriv/types"
import { GameEngine, type EngineState } from "@/lib/game/engine"
import { DEFAULT_STAKE } from "@/lib/game/constants"
import { GameCanvas } from "./game-canvas"
import { GameSidebar } from "./game-sidebar"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"

const SUPPORTED_SYMBOLS = [
  "R_10",
  "R_25",
  "R_50",
  "R_75",
  "R_100",
  "1HZ10V",
  "1HZ25V",
  "1HZ50V",
  "1HZ75V",
  "1HZ100V",
]

export function GridRush() {
  const { client, connectionState } = useTradingContext()
  const [symbol, setSymbolState] = useState("R_100")
  const [stake, setStake] = useState<number>(DEFAULT_STAKE)
  const [engine, setEngine] = useState(() => new GameEngine("R_100"))
  const [state, setState] = useState<EngineState>(() => engine.getState())
  const unsubTicksRef = useRef<(() => void) | null>(null)

  const setSymbol = (next: string) => {
    if (next === symbol) return
    const e = new GameEngine(next)
    setSymbolState(next)
    setEngine(e)
    setState(e.getState())
  }

  // Subscribe to engine state changes for sidebar rerender
  useEffect(() => {
    return engine.onChange((s) => setState({ ...s }))
  }, [engine])

  // Subscribe to Deriv tick stream for the selected symbol
  useEffect(() => {
    if (connectionState !== "connected" && connectionState !== "authorized") {
      return
    }
    if (unsubTicksRef.current) {
      unsubTicksRef.current()
      unsubTicksRef.current = null
    }
    const { unsubscribe } = client.subscribeTicks(
      symbol,
      (tick: TickResponse) => {
        if (!tick.tick) return
        engine.ingestTick(tick.tick.quote, tick.tick.epoch * 1000)
      }
    )
    unsubTicksRef.current = unsubscribe
    return () => {
      unsubscribe()
      unsubTicksRef.current = null
    }
  }, [client, connectionState, symbol, engine])

  // Tick the engine's clock even between Deriv ticks so the NOW line &
  // columns advance smoothly and expired columns settle.
  useEffect(() => {
    const id = setInterval(() => {
      const s = engine.getState()
      if (s.spot != null) {
        engine.ingestTick(s.spot, Date.now())
      }
    }, 250)
    return () => clearInterval(id)
  }, [engine])

  const onResetBalance = () => {
    const e = new GameEngine(symbol)
    setEngine(e)
    setState(e.getState())
  }

  const symbolName = useMemo(
    () => SYMBOL_DISPLAY[symbol]?.name ?? symbol,
    [symbol]
  )

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
            <span className="font-display text-xl leading-none">GridRush</span>
            <span className="font-heading text-[11px] text-muted-foreground">
              {symbolName} · Demo mode
            </span>
          </div>
        </div>
        <span className="hidden font-heading text-[11px] text-muted-foreground md:block">
          Tap a cell to predict where price will travel — live Deriv tick feed
        </span>
      </header>

      <div className="flex flex-1 flex-col overflow-hidden md:flex-row">
        <div className="flex-1 p-4 md:p-5">
          <GameCanvas engine={engine} stake={stake} className="h-full w-full" />
        </div>
        <div className="w-full border-t border-border md:w-[340px] md:border-l md:border-t-0">
          <GameSidebar
            state={state}
            stake={stake}
            setStake={setStake}
            symbol={symbol}
            setSymbol={setSymbol}
            supportedSymbols={SUPPORTED_SYMBOLS}
            connectionState={connectionState}
            onResetBalance={onResetBalance}
          />
        </div>
      </div>
    </main>
  )
}
