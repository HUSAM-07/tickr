"use client"

import { useMemo } from "react"
import type { EngineState } from "@/lib/game/engine"
import type { Position } from "@/lib/game/types"
import { STAKE_TIERS } from "@/lib/game/constants"
import { Flame, Wifi, WifiOff, TrendingUp, TrendingDown } from "lucide-react"

type Props = {
  state: EngineState
  stake: number
  setStake: (n: number) => void
  symbol: string
  setSymbol: (s: string) => void
  supportedSymbols: string[]
  connectionState: string
  onResetBalance: () => void
}

export function GameSidebar({
  state,
  stake,
  setStake,
  symbol,
  setSymbol,
  supportedSymbols,
  connectionState,
  onResetBalance,
}: Props) {
  const { positions, balance, sessionPnl, winStreak, nextStreakBonus } = state

  const { openCount, wonCount, lostCount } = useMemo(() => {
    let open = 0,
      won = 0,
      lost = 0
    for (const p of positions) {
      if (p.status === "OPEN") open++
      else if (p.status === "WON") won++
      else if (p.status === "LOST") lost++
    }
    return { openCount: open, wonCount: won, lostCount: lost }
  }, [positions])

  const recent = positions.slice(0, 14)

  const pnlPositive = sessionPnl > 0.0001
  const pnlNegative = sessionPnl < -0.0001

  return (
    <aside className="flex h-full flex-col gap-5 overflow-y-auto p-5">
      {/* Header */}
      <div>
        <div className="flex items-center justify-between">
          <span className="font-heading text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            Demo Balance
          </span>
          <span
            className="flex items-center gap-1.5 text-[11px] text-muted-foreground"
            title={`WebSocket: ${connectionState}`}
          >
            {connectionState === "connected" ||
            connectionState === "authorized" ? (
              <Wifi size={12} />
            ) : (
              <WifiOff size={12} />
            )}
            <span className="font-heading">{connectionState}</span>
          </span>
        </div>
        <div className="mt-1 flex items-end justify-between">
          <span className="font-display text-3xl leading-none tracking-tight">
            {balance.toFixed(2)}
          </span>
          <span className="font-heading text-xs text-muted-foreground">
            USDT
          </span>
        </div>
        <div className="mt-2 flex items-center gap-2">
          {pnlPositive && (
            <TrendingUp size={14} className="text-[color:var(--color-brand-green)]" />
          )}
          {pnlNegative && <TrendingDown size={14} className="text-destructive" />}
          <span
            className={
              "font-heading text-sm " +
              (pnlPositive
                ? "text-[color:var(--color-brand-green)]"
                : pnlNegative
                  ? "text-destructive"
                  : "text-muted-foreground")
            }
          >
            {sessionPnl >= 0 ? "+" : ""}
            {sessionPnl.toFixed(2)} session P&L
          </span>
        </div>
      </div>

      {/* Streak — the variance feature */}
      <div className="rounded-xl border border-border bg-card p-4">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-2 font-heading text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            <Flame size={13} className="text-accent" />
            Win Streak
          </span>
          <span className="font-heading text-sm">
            {winStreak > 0 ? `${winStreak}×` : "—"}
          </span>
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="font-display text-2xl leading-none">
            +{Math.round((nextStreakBonus - 1) * 100)}%
          </span>
          <span className="font-heading text-xs text-muted-foreground">
            bonus on next win
          </span>
        </div>
        <p className="mt-2 font-body text-xs leading-snug text-muted-foreground">
          Consecutive wins compound a payout bonus — up to +50%. A loss resets it.
        </p>
      </div>

      {/* Asset */}
      <div>
        <label className="mb-1.5 block font-heading text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          Market
        </label>
        <select
          value={symbol}
          onChange={(e) => setSymbol(e.target.value)}
          className="w-full rounded-lg border border-border bg-card px-3 py-2 font-heading text-sm outline-none focus:border-accent"
        >
          {supportedSymbols.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      {/* Stake */}
      <div>
        <label className="mb-1.5 flex items-center justify-between font-heading text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          <span>Stake</span>
          <span className="text-foreground">{stake.toFixed(2)} USDT</span>
        </label>
        <div className="grid grid-cols-3 gap-1.5">
          {STAKE_TIERS.map((s) => (
            <button
              key={s}
              onClick={() => setStake(s)}
              className={
                "rounded-md border px-2 py-1.5 font-heading text-xs transition-colors " +
                (stake === s
                  ? "border-accent bg-accent text-accent-foreground"
                  : "border-border bg-card hover:border-muted-foreground")
              }
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Positions */}
      <div className="flex-1">
        <div className="mb-2 flex items-center justify-between">
          <span className="font-heading text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            Positions
          </span>
          <div className="flex gap-1.5 font-heading text-[11px]">
            <Pill label="Open" count={openCount} tone="default" />
            <Pill label="Won" count={wonCount} tone="win" />
            <Pill label="Lost" count={lostCount} tone="loss" />
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          {recent.length === 0 && (
            <p className="font-body text-sm text-muted-foreground">
              Tap a cell on the grid to place your first bet.
            </p>
          )}
          {recent.map((p) => (
            <PositionRow key={p.id} position={p} />
          ))}
        </div>
      </div>

      {/* Reset demo balance */}
      <button
        onClick={onResetBalance}
        className="rounded-lg border border-border bg-card px-3 py-2 font-heading text-xs text-muted-foreground transition-colors hover:border-accent hover:text-foreground"
      >
        Reset demo balance
      </button>
    </aside>
  )
}

function Pill({
  label,
  count,
  tone,
}: {
  label: string
  count: number
  tone: "default" | "win" | "loss"
}) {
  const toneClass =
    tone === "win"
      ? "bg-[color:var(--color-brand-green)]/15 text-[color:var(--color-brand-green)]"
      : tone === "loss"
        ? "bg-destructive/15 text-destructive"
        : "bg-muted text-muted-foreground"
  return (
    <span className={`rounded-full px-2 py-0.5 ${toneClass}`}>
      {label} {count}
    </span>
  )
}

function PositionRow({ position }: { position: Position }) {
  const toneClass =
    position.status === "WON"
      ? "border-[color:var(--color-brand-green)]/30 bg-[color:var(--color-brand-green)]/10"
      : position.status === "LOST"
        ? "border-destructive/25 bg-destructive/5"
        : position.status === "REFUNDED"
          ? "border-muted-foreground/25"
          : "border-accent/30 bg-accent/5"

  const valueLabel =
    position.status === "WON"
      ? `+${(position.actualPayout ?? 0).toFixed(2)}`
      : position.status === "LOST"
        ? `-${position.stake.toFixed(2)}`
        : position.status === "REFUNDED"
          ? "refund"
          : `→ ${position.potentialPayout.toFixed(2)}`

  const valueClass =
    position.status === "WON"
      ? "text-[color:var(--color-brand-green)]"
      : position.status === "LOST"
        ? "text-destructive"
        : "text-foreground"

  return (
    <div
      className={`flex items-center justify-between rounded-md border px-2.5 py-1.5 ${toneClass}`}
    >
      <div className="flex flex-col">
        <span className="font-heading text-xs">
          {position.lockedMultiplier.toFixed(2)}x
          {position.streakBonus > 1 && (
            <span className="ml-1 text-accent">
              ×{position.streakBonus.toFixed(2)}
            </span>
          )}
        </span>
        <span className="font-heading text-[10px] text-muted-foreground">
          {position.priceLow.toFixed(2)}–{position.priceHigh.toFixed(2)} ·{" "}
          {position.stake.toFixed(2)} USDT
        </span>
      </div>
      <span className={`font-heading text-sm ${valueClass}`}>{valueLabel}</span>
    </div>
  )
}
