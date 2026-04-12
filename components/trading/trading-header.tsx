"use client"

import { useTradingContext } from "@/hooks/trading-context"
import { Wifi, WifiOff, Loader2 } from "lucide-react"

export function TradingHeader() {
  const { connectionState, balance, currency, connect } = useTradingContext()

  return (
    <div className="flex items-center gap-1.5 md:gap-2">
      {/* Connection status — icon-only on mobile, icon+label on desktop */}
      <button
        onClick={() => {
          if (connectionState === "disconnected") connect()
        }}
        className="flex items-center gap-1.5 rounded-lg border border-border px-2 py-1 font-heading text-xs transition-colors hover:bg-secondary md:px-3"
        title={
          connectionState === "disconnected"
            ? "Click to connect"
            : `Status: ${connectionState}`
        }
      >
        {connectionState === "disconnected" && (
          <>
            <WifiOff className="h-3.5 w-3.5 text-red-500 md:h-3 md:w-3" />
            <span className="hidden text-muted-foreground min-[480px]:inline">Connect</span>
          </>
        )}
        {connectionState === "connecting" && (
          <>
            <Loader2 className="h-3.5 w-3.5 animate-spin text-yellow-500 md:h-3 md:w-3" />
            <span className="hidden text-muted-foreground min-[480px]:inline">Connecting</span>
          </>
        )}
        {(connectionState === "connected" || connectionState === "authorized") && (
          <>
            <Wifi className="h-3.5 w-3.5 text-green-500 md:h-3 md:w-3" />
            <span className="hidden text-green-600 dark:text-green-400 min-[480px]:inline">Live</span>
          </>
        )}
      </button>

      {/* Balance — hidden on small mobile */}
      {balance !== null && (
        <div className="hidden items-center gap-1 rounded-lg border border-border px-3 py-1 font-heading text-xs min-[480px]:flex">
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
      <span className="rounded-md bg-accent/10 px-1.5 py-0.5 font-heading text-[9px] font-medium text-accent md:px-2 md:text-[10px]">
        DEMO
      </span>
    </div>
  )
}
