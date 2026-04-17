"use client"

import { useMemo } from "react"
import {
  MAX_PARLAY_LEGS,
  MIN_PARLAY_LEGS,
  type EngineState,
  type GameEngine,
} from "@/lib/game/engine"
import type { ParlayPosition, Position } from "@/lib/game/types"
import { STAKE_TIERS } from "@/lib/game/constants"
import { SYMBOL_DISPLAY } from "@/lib/deriv/constants"
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
  Link2,
  Link2Off,
  Trash2,
  TrendingDown,
  TrendingUp,
  Wifi,
  WifiOff,
} from "lucide-react"

type Props = {
  state: EngineState
  engine: GameEngine
  stake: number
  setStake: (n: number) => void
  symbol: string
  setSymbol: (s: string) => void
  supportedSymbols: string[]
  connectionState: string
  parlayMode: boolean
  setParlayMode: (v: boolean) => void
  onResetBalance: () => void
}

export function GameSidebar({
  state,
  engine,
  stake,
  setStake,
  symbol,
  setSymbol,
  supportedSymbols,
  connectionState,
  parlayMode,
  setParlayMode,
  onResetBalance,
}: Props) {
  const { positions, parlays, balance, sessionPnl, winStreak, nextStreakBonus } = state

  const { openCount, wonCount, lostCount } = useMemo(() => {
    let open = 0,
      won = 0,
      lost = 0
    for (const p of positions) {
      if (p.status === "OPEN") open++
      else if (p.status === "WON") won++
      else if (p.status === "LOST") lost++
    }
    for (const p of parlays) {
      if (p.status === "OPEN") open++
      else if (p.status === "WON") won++
      else if (p.status === "LOST") lost++
    }
    return { openCount: open, wonCount: won, lostCount: lost }
  }, [positions, parlays])

  const recent = positions.slice(0, 12)
  const recentParlays = parlays.slice(0, 6)

  // Live parlay quote — compute on every render (cheap, O(draftLegs)).
  // Reads from engine.state internally, so no deps needed.
  const parlayQuote = engine.quoteDraftParlay()

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
        <MarketDropdown
          symbol={symbol}
          setSymbol={setSymbol}
          supportedSymbols={supportedSymbols}
        />
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

      {/* Parlay mode toggle */}
      <div className="flex items-center justify-between gap-2 rounded-lg border border-border bg-card p-2 pl-3">
        <div className="flex min-w-0 flex-col">
          <span className="flex items-center gap-1.5 font-heading text-xs font-medium">
            {parlayMode ? <Link2 size={13} className="text-accent" /> : <Link2Off size={13} className="text-muted-foreground" />}
            Parlay mode
          </span>
          <span className="font-heading text-[10px] leading-snug text-muted-foreground">
            Link {MIN_PARLAY_LEGS}–{MAX_PARLAY_LEGS} cells. All must hit for combined payout.
          </span>
        </div>
        <button
          onClick={() => {
            setParlayMode(!parlayMode)
            if (parlayMode) engine.clearDraftLegs()
          }}
          aria-pressed={parlayMode}
          className={
            "shrink-0 rounded-md px-2.5 py-1 font-heading text-[11px] transition-colors " +
            (parlayMode
              ? "bg-accent text-accent-foreground"
              : "border border-border bg-background hover:border-accent")
          }
        >
          {parlayMode ? "On" : "Off"}
        </button>
      </div>

      {/* Parlay builder — only visible when building */}
      {parlayMode && (
        <div className="rounded-xl border border-[color:var(--color-brand-blue)]/40 bg-[color:var(--color-brand-blue)]/5 p-3">
          <div className="mb-2 flex items-center justify-between">
            <span className="font-heading text-[11px] font-medium uppercase tracking-wide text-[color:var(--color-brand-blue)]">
              Parlay Builder
            </span>
            <span className="font-heading text-[11px] text-muted-foreground">
              {state.draftLegs.length}/{MAX_PARLAY_LEGS} legs
            </span>
          </div>
          {state.draftLegs.length === 0 ? (
            <p className="font-body text-xs leading-snug text-muted-foreground">
              Tap cells on the grid to add legs. Every leg must win for the
              parlay to pay out.
            </p>
          ) : (
            <>
              <div className="mb-2 flex flex-col gap-1">
                {parlayQuote.legs.map((leg, i) => (
                  <div
                    key={`${leg.columnIndex}:${leg.rowIndex}`}
                    className="flex items-center justify-between rounded-md border border-[color:var(--color-brand-blue)]/30 bg-card px-2 py-1"
                  >
                    <span className="font-heading text-[11px]">
                      <span className="inline-flex size-4 items-center justify-center rounded-full bg-[color:var(--color-brand-blue)] text-[9px] font-bold text-white mr-1.5">
                        {i + 1}
                      </span>
                      {leg.priceLow.toFixed(2)}–{leg.priceHigh.toFixed(2)}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="font-heading text-[11px] text-muted-foreground">
                        {leg.offeredMultiplier.toFixed(2)}x
                      </span>
                      <button
                        onClick={() =>
                          engine.toggleDraftLeg(leg.columnIndex, leg.rowIndex)
                        }
                        aria-label="Remove leg"
                        className="rounded p-0.5 text-muted-foreground transition-colors hover:bg-muted hover:text-destructive"
                      >
                        <Trash2 size={11} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mb-2 flex items-end justify-between border-t border-[color:var(--color-brand-blue)]/20 pt-2">
                <span className="font-heading text-[11px] uppercase tracking-wide text-muted-foreground">
                  Combined
                </span>
                <span className="font-display text-xl leading-none">
                  {parlayQuote.combinedMultiplier > 0
                    ? `${parlayQuote.combinedMultiplier.toFixed(2)}x`
                    : "—"}
                </span>
              </div>
              <div className="mb-2 flex items-baseline justify-between">
                <span className="font-heading text-[11px] text-muted-foreground">
                  Potential payout
                </span>
                <span className="font-heading text-sm">
                  {parlayQuote.combinedMultiplier > 0
                    ? `${parlayQuote.combinedPayoutOnStake(stake).toFixed(2)} USDT`
                    : "—"}
                </span>
              </div>

              <div className="flex gap-1.5">
                <button
                  onClick={() => {
                    const placed = engine.placeParlay(stake)
                    if (placed) setParlayMode(false)
                  }}
                  disabled={
                    state.draftLegs.length < MIN_PARLAY_LEGS ||
                    stake > balance ||
                    parlayQuote.combinedMultiplier <= 0
                  }
                  className="flex-1 rounded-md bg-accent px-3 py-1.5 font-heading text-xs text-accent-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Place parlay ({stake.toFixed(2)} USDT)
                </button>
                <button
                  onClick={() => engine.clearDraftLegs()}
                  className="rounded-md border border-border bg-card px-3 py-1.5 font-heading text-xs text-muted-foreground transition-colors hover:border-muted-foreground hover:text-foreground"
                >
                  Clear
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* Active parlays (if any) */}
      {parlays.some((p) => p.status === "OPEN") && (
        <div>
          <span className="mb-2 block font-heading text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            Active Parlays
          </span>
          <div className="flex flex-col gap-1.5">
            {parlays
              .filter((p) => p.status === "OPEN")
              .map((p) => (
                <ParlayRow key={p.id} parlay={p} />
              ))}
          </div>
        </div>
      )}

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
          {recentParlays
            .filter((p) => p.status !== "OPEN")
            .map((p) => (
              <ParlayRow key={p.id} parlay={p} />
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

function ParlayRow({ parlay }: { parlay: ParlayPosition }) {
  const toneClass =
    parlay.status === "WON"
      ? "border-[color:var(--color-brand-green)]/30 bg-[color:var(--color-brand-green)]/10"
      : parlay.status === "LOST"
        ? "border-destructive/25 bg-destructive/5"
        : parlay.status === "REFUNDED"
          ? "border-muted-foreground/25"
          : "border-[color:var(--color-brand-blue)]/40 bg-[color:var(--color-brand-blue)]/5"

  const valueLabel =
    parlay.status === "WON"
      ? `+${(parlay.actualPayout ?? 0).toFixed(2)}`
      : parlay.status === "LOST"
        ? `-${parlay.stake.toFixed(2)}`
        : parlay.status === "REFUNDED"
          ? "refund"
          : `→ ${parlay.potentialPayout.toFixed(2)}`

  const valueClass =
    parlay.status === "WON"
      ? "text-[color:var(--color-brand-green)]"
      : parlay.status === "LOST"
        ? "text-destructive"
        : "text-foreground"

  const legsSettled = parlay.legs.filter((l) => l.status !== "OPEN").length

  return (
    <div
      className={`flex items-center justify-between rounded-md border px-2.5 py-1.5 ${toneClass}`}
    >
      <div className="flex min-w-0 flex-col">
        <span className="flex items-center gap-1 font-heading text-xs">
          <Link2 size={10} className="text-[color:var(--color-brand-blue)]" />
          Parlay · {parlay.legs.length} legs
          <span className="font-medium">
            {parlay.combinedMultiplier.toFixed(2)}x
          </span>
          {parlay.streakBonus > 1 && (
            <span className="text-accent">
              ×{parlay.streakBonus.toFixed(2)}
            </span>
          )}
        </span>
        <span className="font-heading text-[10px] text-muted-foreground">
          {parlay.stake.toFixed(2)} USDT ·{" "}
          {parlay.status === "OPEN"
            ? `${legsSettled}/${parlay.legs.length} settled`
            : parlay.status.toLowerCase()}
        </span>
      </div>
      <span className={`font-heading text-sm ${valueClass}`}>{valueLabel}</span>
    </div>
  )
}

function MarketDropdown({
  symbol,
  setSymbol,
  supportedSymbols,
}: {
  symbol: string
  setSymbol: (s: string) => void
  supportedSymbols: string[]
}) {
  const info = SYMBOL_DISPLAY[symbol]
  const name = info?.name ?? symbol
  const market = info?.market ?? "Synthetic"

  // Group symbols by market category for a nicer menu
  const grouped = useMemo(() => {
    const byMarket = new Map<string, string[]>()
    for (const s of supportedSymbols) {
      const m = SYMBOL_DISPLAY[s]?.market ?? "Other"
      const list = byMarket.get(m) ?? []
      list.push(s)
      byMarket.set(m, list)
    }
    return Array.from(byMarket.entries())
  }, [supportedSymbols])

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="group flex w-full items-center justify-between gap-2 rounded-lg border border-border bg-card px-3 py-2 text-left outline-none transition-colors hover:border-muted-foreground focus-visible:border-accent"
      >
        <span className="flex min-w-0 flex-col">
          <span className="truncate font-heading text-sm text-foreground">
            {symbol}
          </span>
          <span className="truncate font-heading text-[11px] text-muted-foreground">
            {name} · {market}
          </span>
        </span>
        <ChevronsUpDown size={14} className="shrink-0 text-muted-foreground" />
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        sideOffset={6}
        className="w-[var(--radix-dropdown-menu-trigger-width)] max-h-[60vh]"
      >
        <DropdownMenuRadioGroup value={symbol} onValueChange={setSymbol}>
          {grouped.map(([marketName, syms], idx) => (
            <div key={marketName}>
              {idx > 0 && <DropdownMenuSeparator />}
              <DropdownMenuLabel>{marketName}</DropdownMenuLabel>
              {syms.map((s) => (
                <DropdownMenuRadioItem key={s} value={s} className="pr-2">
                  <span className="flex flex-col">
                    <span className="font-heading text-sm">{s}</span>
                    <span className="font-heading text-[11px] text-muted-foreground">
                      {SYMBOL_DISPLAY[s]?.name ?? s}
                    </span>
                  </span>
                </DropdownMenuRadioItem>
              ))}
            </div>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
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
