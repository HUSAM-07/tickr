"use client"

import type { PortfolioData } from "@/lib/types"
import { useTradingContext } from "@/hooks/trading-context"
import { Briefcase } from "lucide-react"

export function WidgetPortfolio({ data }: { data: PortfolioData }) {
  const { balance, currency, connectionState } = useTradingContext()

  return (
    <div className="my-3 overflow-hidden rounded-xl border border-border bg-card">
      <div className="flex items-center gap-3 border-b border-border px-4 py-3">
        <Briefcase className="h-4 w-4 text-muted-foreground" />
        <h3 className="font-heading text-sm font-semibold">Portfolio</h3>
      </div>

      <div className="px-4 py-4">
        {connectionState === "disconnected" ? (
          <p className="text-sm text-muted-foreground">
            Connect to Deriv to view your portfolio.
          </p>
        ) : (
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Balance</span>
              <span className="font-heading font-semibold">
                {balance !== null
                  ? `${currency} ${balance.toLocaleString("en-US", { minimumFractionDigits: 2 })}`
                  : "Loading..."}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Open Positions</span>
              <span className="font-medium">0</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Full portfolio tracking with trade history coming in the next update.
              {data.include_history ? " (History requested)" : ""}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
