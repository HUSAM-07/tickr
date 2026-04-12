"use client"

import type { SignalCardData } from "@/lib/types"
import { getSymbolName, getContractLabel, formatDuration } from "@/lib/deriv/utils"
import { ArrowUp, ArrowDown, Zap } from "lucide-react"

const CONFIDENCE_STYLES = {
  high: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  medium: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  low: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
}

export function WidgetSignalCard({ data }: { data: SignalCardData }) {
  const {
    symbol,
    direction,
    confidence,
    reasoning,
    suggested_duration,
    suggested_duration_unit,
    suggested_amount,
  } = data

  const isRise = direction === "CALL"

  return (
    <div className="my-3 overflow-hidden rounded-xl border border-border bg-card">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <Zap className="h-4 w-4 text-amber-500" />
          <h3 className="font-heading text-sm font-semibold">Trading Signal</h3>
        </div>
        <span
          className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase ${CONFIDENCE_STYLES[confidence]}`}
        >
          {confidence}
        </span>
      </div>

      {/* Body */}
      <div className="px-4 py-3 space-y-3">
        {/* Direction */}
        <div className="flex items-center gap-3">
          <div
            className={`flex h-10 w-10 items-center justify-center rounded-full ${
              isRise ? "bg-green-100 dark:bg-green-900/30" : "bg-red-100 dark:bg-red-900/30"
            }`}
          >
            {isRise ? (
              <ArrowUp className="h-5 w-5 text-green-600 dark:text-green-400" />
            ) : (
              <ArrowDown className="h-5 w-5 text-red-600 dark:text-red-400" />
            )}
          </div>
          <div>
            <p className="font-heading text-sm font-semibold">
              {getContractLabel(direction)} on {getSymbolName(symbol)}
            </p>
            <p className="text-xs text-muted-foreground">{symbol}</p>
          </div>
        </div>

        {/* Reasoning */}
        <p className="text-sm text-foreground/80">{reasoning}</p>

        {/* Suggested params */}
        {(suggested_duration || suggested_amount) && (
          <div className="flex gap-4 text-xs text-muted-foreground">
            {suggested_duration && suggested_duration_unit && (
              <span>
                Duration: {formatDuration(suggested_duration, suggested_duration_unit)}
              </span>
            )}
            {suggested_amount && <span>Stake: ${suggested_amount}</span>}
          </div>
        )}

        <p className="text-[10px] text-muted-foreground">
          Signals are AI-generated and not financial advice. Trade responsibly.
        </p>
      </div>
    </div>
  )
}
