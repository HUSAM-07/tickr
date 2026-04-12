"use client"

import type { LeaderboardData } from "@/lib/types"
import { Trophy } from "lucide-react"

export function WidgetLeaderboard({ data }: { data: LeaderboardData }) {
  const sortBy = data.sort_by ?? "xp"

  // Placeholder data for Phase 4 implementation
  const mockTraders = [
    { rank: 1, name: "TraderX", xp: 12500, winRate: 72, pnl: 2340, streak: 8 },
    { rank: 2, name: "CryptoKing", xp: 10200, winRate: 68, pnl: 1890, streak: 5 },
    { rank: 3, name: "V75Master", xp: 8900, winRate: 65, pnl: 1450, streak: 3 },
    { rank: 4, name: "BoomHunter", xp: 7600, winRate: 61, pnl: 980, streak: 2 },
    { rank: 5, name: "DigitPro", xp: 6100, winRate: 58, pnl: 620, streak: 1 },
  ]

  return (
    <div className="my-3 overflow-hidden rounded-xl border border-border bg-card">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-border px-4 py-3">
        <Trophy className="h-4 w-4 text-amber-500" />
        <h3 className="font-heading text-sm font-semibold">Leaderboard</h3>
        <span className="ml-auto text-xs text-muted-foreground">
          Sorted by {sortBy.replace("_", " ")}
        </span>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-xs text-muted-foreground">
              <th className="px-4 py-2 text-left font-medium">#</th>
              <th className="px-4 py-2 text-left font-medium">Trader</th>
              <th className="px-4 py-2 text-right font-medium">XP</th>
              <th className="px-4 py-2 text-right font-medium">Win Rate</th>
              <th className="px-4 py-2 text-right font-medium">P&L</th>
              <th className="px-4 py-2 text-right font-medium">Streak</th>
            </tr>
          </thead>
          <tbody>
            {mockTraders.map((trader) => (
              <tr
                key={trader.rank}
                className="border-b border-border/50 last:border-0"
              >
                <td className="px-4 py-2 font-medium">
                  {trader.rank <= 3 ? (
                    <span
                      className={
                        trader.rank === 1
                          ? "text-amber-500"
                          : trader.rank === 2
                            ? "text-gray-400"
                            : "text-amber-700"
                      }
                    >
                      {trader.rank === 1 ? "🥇" : trader.rank === 2 ? "🥈" : "🥉"}
                    </span>
                  ) : (
                    trader.rank
                  )}
                </td>
                <td className="px-4 py-2 font-medium">{trader.name}</td>
                <td className="px-4 py-2 text-right">{trader.xp.toLocaleString()}</td>
                <td className="px-4 py-2 text-right">{trader.winRate}%</td>
                <td className="px-4 py-2 text-right text-green-500">
                  +${trader.pnl.toLocaleString()}
                </td>
                <td className="px-4 py-2 text-right">{trader.streak}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="px-4 py-2">
        <p className="text-[10px] text-muted-foreground">
          Live leaderboard with real rankings coming in the next update.
        </p>
      </div>
    </div>
  )
}
