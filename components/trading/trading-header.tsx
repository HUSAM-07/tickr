"use client"

import { useTradingContext } from "@/hooks/trading-context"
import { Wifi, WifiOff, Loader2 } from "lucide-react"

export function TradingHeader() {
  const { connectionState, balance, currency, connect } = useTradingContext()

  return (
    <div className="flex items-center gap-2">
      {/* Connection status */}
      <button
        onClick={() => {
          if (connectionState === "disconnected") connect()
        }}
        className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1 font-heading text-xs transition-colors hover:bg-secondary"
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

      {/* Balance */}
      {balance !== null && (
        <div className="flex items-center gap-1 rounded-lg border border-border px-3 py-1 font-heading text-xs">
          <span className="text-muted-foreground">{currency}</span>
          <span className="font-medium">
            {balance.toLocaleString("en-US", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </span>
        </div>
      )}

      {/* Demo badge */}
      <span className="rounded-md bg-accent/10 px-2 py-0.5 font-heading text-[10px] font-medium text-accent">
        DEMO
      </span>
    </div>
  )
}
