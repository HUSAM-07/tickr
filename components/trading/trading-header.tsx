"use client"

import { useTradingContext } from "@/hooks/trading-context"
import { Wifi, WifiOff, Loader2 } from "lucide-react"

export function TradingHeader() {
  const { connectionState, balance, currency, connect } = useTradingContext()

  return (
    <div className="flex items-center gap-3">
      {/* Connection status */}
      <button
        onClick={() => {
          if (connectionState === "disconnected") connect()
        }}
        className="flex items-center gap-1.5 rounded-full border border-border px-3 py-1 text-xs font-medium transition-colors hover:bg-secondary"
        title={
          connectionState === "disconnected"
            ? "Click to connect"
            : `Status: ${connectionState}`
        }
      >
        {connectionState === "disconnected" && (
          <>
            <WifiOff className="h-3 w-3 text-red-500" />
            <span className="text-muted-foreground">Connect</span>
          </>
        )}
        {connectionState === "connecting" && (
          <>
            <Loader2 className="h-3 w-3 animate-spin text-yellow-500" />
            <span className="text-muted-foreground">Connecting</span>
          </>
        )}
        {(connectionState === "connected" || connectionState === "authorized") && (
          <>
            <Wifi className="h-3 w-3 text-green-500" />
            <span className="text-green-600 dark:text-green-400">Live</span>
          </>
        )}
      </button>

      {/* Balance display */}
      {balance !== null && (
        <div className="flex items-center gap-1 rounded-full border border-border px-3 py-1 text-xs">
          <span className="text-muted-foreground">{currency}</span>
          <span className="font-heading font-semibold">
            {balance.toLocaleString("en-US", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </span>
        </div>
      )}

      {/* Demo badge */}
      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
        DEMO
      </span>
    </div>
  )
}
