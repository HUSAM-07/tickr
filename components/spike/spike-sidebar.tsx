"use client"

import { useMemo } from "react"
import type { EngineState, SpikeEngine } from "@/lib/spike/engine"
import {
  PRESET_WINDOW_BETS,
  SNIPER_SHOTS,
  SPIKE_ASSETS,
  type BetKind,
} from "@/lib/spike/poisson"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  ChevronsUpDown,
  Flame,
  Target,
  TrendingDown,
  TrendingUp,
  Wifi,
  WifiOff,
  XCircle,
} from "lucide-react"

type Props = {
  state: EngineState
  engine: SpikeEngine
  stake: number
  setStake: (n: number) => void
  connectionState: string
  onReset: () => void
}

const STAKE_TIERS = [0.5, 1, 2, 5, 10, 25]

export function SpikeSidebar({
  state,
  engine,
  stake,
  setStake,
  connectionState,
  onReset,
}: Props) {
  const { balance, sessionPnl, winStreak, nextStreakBonus, activeBet, history, asset } = state

  const pnlPositive = sessionPnl > 0.0001
  const pnlNegative = sessionPnl < -0.0001

  const canPlace = activeBet == null && balance >= stake && stake > 0

  const placeBet = (bet: BetKind) => {
    if (!canPlace) return
    engine.placeBet(bet, stake)
  }

  const setAsset = (symbol: string) => engine.setAsset(symbol)

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
            {connectionState === "connected" || connectionState === "authorized" ? (
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
          <span className="font-heading text-xs text-muted-foreground">USDT</span>
        </div>
        <div className="mt-2 flex items-center gap-2">
          {pnlPositive && <TrendingUp size={14} className="text-[color:var(--color-brand-green)]" />}
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

      {/* Streak */}
      <div className="rounded-xl border border-border bg-card p-4">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-2 font-heading text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            <Flame size={13} className="text-accent" />
            Win Streak
          </span>
          <span className="font-heading text-sm">{winStreak > 0 ? `${winStreak}×` : "—"}</span>
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="font-display text-2xl leading-none">
            +{Math.round((nextStreakBonus - 1) * 100)}%
          </span>
          <span className="font-heading text-xs text-muted-foreground">bonus on next win</span>
        </div>
      </div>

      {/* Asset */}
      <div>
        <label className="mb-1.5 block font-heading text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          Market
        </label>
        <AssetDropdown currentSymbol={asset.symbol} setSymbol={setAsset} />
      </div>

      {/* Stake */}
      <div>
        <label className="mb-1.5 flex items-center justify-between font-heading text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          <span>Stake</span>
          <span className="text-foreground">{stake.toFixed(2)} USDT</span>
        </label>
        <div className="grid grid-cols-3 gap-1.5">
          {STAKE_TIERS.map((t) => (
            <button
              key={t}
              onClick={() => setStake(t)}
              className={
                "rounded-md border px-2 py-1.5 font-heading text-xs transition-colors " +
                (stake === t
                  ? "border-accent bg-accent text-accent-foreground"
                  : "border-border bg-card hover:border-muted-foreground")
              }
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Active bet — if any */}
      {activeBet && (
        <div className="rounded-xl border border-accent/40 bg-accent/5 p-3">
          <div className="flex items-center justify-between">
            <span className="font-heading text-[11px] font-medium uppercase tracking-wide text-accent">
              Armed
            </span>
            <button
              onClick={() => engine.surrender()}
              className="flex items-center gap-1 rounded-md px-2 py-0.5 font-heading text-[11px] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <XCircle size={11} />
              Forfeit
            </button>
          </div>
          <p className="mt-1 font-heading text-sm">
            {labelForBetKind(activeBet.kind)}
          </p>
          <div className="mt-1 flex items-center gap-3 font-heading text-xs text-muted-foreground">
            <span>{activeBet.stake.toFixed(2)} USDT stake</span>
            <span>·</span>
            <span>
              {activeBet.lockedMultiplier.toFixed(2)}x
              {activeBet.streakBonus > 1 && (
                <span className="ml-0.5 text-accent">
                  ×{activeBet.streakBonus.toFixed(2)}
                </span>
              )}
            </span>
          </div>
        </div>
      )}

      {/* Window bets */}
      <div>
        <span className="mb-2 block font-heading text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          Window Bets
        </span>
        <div className="flex flex-col gap-1.5">
          {PRESET_WINDOW_BETS.map((p) => {
            const q = engine.quote(p.bet)
            return (
              <BetRow
                key={p.label}
                label={p.label}
                blurb={p.blurb}
                multiplier={q.offeredMultiplier}
                disabled={!canPlace}
                onClick={() => placeBet(p.bet)}
              />
            )
          })}
        </div>
      </div>

      {/* Sniper */}
      <div>
        <span className="mb-2 flex items-center gap-1.5 font-heading text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          <Target size={11} />
          Sniper Shots
        </span>
        <div className="flex flex-col gap-1.5">
          {SNIPER_SHOTS.map((sh) => {
            const bet: BetKind = {
              kind: "SNIPER",
              targetTick: sh.targetTick,
              tolerance: sh.tolerance,
            }
            const q = engine.quote(bet)
            return (
              <BetRow
                key={sh.label}
                label={sh.label}
                blurb="Hit the exact spike tick."
                multiplier={q.offeredMultiplier}
                disabled={!canPlace}
                onClick={() => placeBet(bet)}
              />
            )
          })}
        </div>
      </div>

      {/* History */}
      <div className="flex-1">
        <div className="mb-2 flex items-center justify-between">
          <span className="font-heading text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            Recent Rounds
          </span>
          {history.length > 0 && (
            <span className="font-heading text-[11px] text-muted-foreground">
              {history.length}
            </span>
          )}
        </div>
        <div className="flex flex-col gap-1.5">
          {history.length === 0 && (
            <p className="font-body text-sm text-muted-foreground">
              Pick a bet to arm your first round.
            </p>
          )}
          {history.slice(0, 12).map((r) => (
            <div
              key={r.id}
              className={
                "flex items-center justify-between rounded-md border px-2.5 py-1.5 " +
                (r.outcome === "WON"
                  ? "border-[color:var(--color-brand-green)]/30 bg-[color:var(--color-brand-green)]/10"
                  : "border-destructive/25 bg-destructive/5")
              }
            >
              <div className="flex min-w-0 flex-col">
                <span className="truncate font-heading text-xs">
                  {r.betLabel}
                </span>
                <span className="font-heading text-[10px] text-muted-foreground">
                  {r.multiplier.toFixed(2)}x · {r.stake.toFixed(2)} USDT
                </span>
              </div>
              <span
                className={
                  "font-heading text-sm " +
                  (r.outcome === "WON"
                    ? "text-[color:var(--color-brand-green)]"
                    : "text-destructive")
                }
              >
                {r.outcome === "WON" ? `+${r.payout.toFixed(2)}` : `-${r.stake.toFixed(2)}`}
              </span>
            </div>
          ))}
        </div>
      </div>

      <button
        onClick={onReset}
        className="rounded-lg border border-border bg-card px-3 py-2 font-heading text-xs text-muted-foreground transition-colors hover:border-accent hover:text-foreground"
      >
        Reset demo balance
      </button>
    </aside>
  )
}

function labelForBetKind(bet: BetKind): string {
  if (bet.kind === "WITHIN") return `Spike in next ${bet.ticks}`
  if (bet.kind === "NOT_WITHIN") return `No spike in ${bet.ticks}`
  return `Snipe @ ${bet.targetTick} (±${bet.tolerance})`
}

function BetRow({
  label,
  blurb,
  multiplier,
  disabled,
  onClick,
}: {
  label: string
  blurb: string
  multiplier: number
  disabled: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={
        "group flex items-center justify-between rounded-md border px-3 py-2 text-left transition-colors " +
        (disabled
          ? "cursor-not-allowed border-border bg-card opacity-50"
          : "border-border bg-card hover:border-accent hover:bg-accent/5")
      }
    >
      <div className="flex min-w-0 flex-col">
        <span className="font-heading text-sm">{label}</span>
        <span className="font-heading text-[10px] text-muted-foreground">
          {blurb}
        </span>
      </div>
      <span className="font-heading text-sm font-medium text-accent">
        {multiplier.toFixed(2)}x
      </span>
    </button>
  )
}

function AssetDropdown({
  currentSymbol,
  setSymbol,
}: {
  currentSymbol: string
  setSymbol: (s: string) => void
}) {
  const current = useMemo(
    () => SPIKE_ASSETS.find((a) => a.symbol === currentSymbol) ?? SPIKE_ASSETS[0],
    [currentSymbol]
  )
  const booms = SPIKE_ASSETS.filter((a) => a.direction === "up")
  const crashes = SPIKE_ASSETS.filter((a) => a.direction === "down")

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="group flex w-full items-center justify-between gap-2 rounded-lg border border-border bg-card px-3 py-2 text-left outline-none transition-colors hover:border-muted-foreground focus-visible:border-accent"
      >
        <span className="flex min-w-0 flex-col">
          <span className="truncate font-heading text-sm text-foreground">
            {current.displayName}
          </span>
          <span className="truncate font-heading text-[11px] text-muted-foreground">
            spikes every ~{current.avgInterval} ticks
          </span>
        </span>
        <ChevronsUpDown size={14} className="shrink-0 text-muted-foreground" />
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        sideOffset={6}
        className="w-[var(--radix-dropdown-menu-trigger-width)] max-h-[60vh]"
      >
        <DropdownMenuRadioGroup value={currentSymbol} onValueChange={setSymbol}>
          <DropdownMenuLabel>Boom (up-spikes)</DropdownMenuLabel>
          {booms.map((a) => (
            <DropdownMenuRadioItem key={a.symbol} value={a.symbol} className="pr-2">
              <span className="flex flex-col">
                <span className="font-heading text-sm">{a.displayName}</span>
                <span className="font-heading text-[11px] text-muted-foreground">
                  ~{a.avgInterval} ticks per spike
                </span>
              </span>
            </DropdownMenuRadioItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuLabel>Crash (down-spikes)</DropdownMenuLabel>
          {crashes.map((a) => (
            <DropdownMenuRadioItem key={a.symbol} value={a.symbol} className="pr-2">
              <span className="flex flex-col">
                <span className="font-heading text-sm">{a.displayName}</span>
                <span className="font-heading text-[11px] text-muted-foreground">
                  ~{a.avgInterval} ticks per spike
                </span>
              </span>
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
