"use client"

import { useMemo } from "react"
import type { EngineState, PulseEngine } from "@/lib/pulse/engine"
import {
  PULSE_ASSETS,
  TEMPO_CONFIG,
  STAKE_TIERS,
  type Tempo,
} from "@/lib/pulse/types"
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
  ArrowDown,
  ArrowUp,
  ChevronsUpDown,
  Flame,
  LogOut,
  Target,
  Thermometer,
  Timer,
  TrendingDown,
  TrendingUp,
  Trophy,
  Wifi,
  WifiOff,
  Zap,
} from "lucide-react"

type Props = {
  state: EngineState
  engine: PulseEngine
  stake: number
  setStake: (n: number) => void
  connectionState: string
  onReset: () => void
}

export function PulseSidebar({
  state,
  engine,
  stake,
  setStake,
  connectionState,
  onReset,
}: Props) {
  const {
    balance,
    sessionPnl,
    bestStreak,
    phase,
    streak,
    currentMultiplier,
    potentialPayout,
    overheatLevel,
    tempo,
    asset,
    history,
    lastRun,
    runPredictions,
    badges,
    headshots,
  } = state

  const pnlPositive = sessionPnl > 0.0001
  const pnlNegative = sessionPnl < -0.0001
  const isConnected = connectionState === "connected" || connectionState === "authorized"
  const canStart = phase === "IDLE" && balance >= stake && stake > 0 && isConnected && state.spot !== null
  const canPredict = phase === "LIVE"
  const canExtract = phase === "LIVE" && streak >= 1

  const sessionStats = useMemo(() => {
    const runs = history.length
    const wins = history.filter((r) => r.outcome === "EXTRACTED").length
    const totalPnl = history.reduce((sum, r) => sum + r.pnl, 0)
    return { runs, wins, totalPnl }
  }, [history])

  return (
    <aside className="flex h-full flex-col gap-5 overflow-y-auto p-5">
      {/* Balance header */}
      <div>
        <div className="flex items-center justify-between">
          <span className="font-heading text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            Demo Balance
          </span>
          <span
            className="flex items-center gap-1.5 text-[11px] text-muted-foreground"
            title={`WebSocket: ${connectionState}`}
          >
            {isConnected ? <Wifi size={12} /> : <WifiOff size={12} />}
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
        {bestStreak > 0 && (
          <div className="mt-1 flex items-center gap-1.5">
            <Trophy size={12} className="text-accent" />
            <span className="font-heading text-xs text-muted-foreground">
              Best streak: {bestStreak}
            </span>
          </div>
        )}
      </div>

      {/* ── IDLE: Loadout ────────────────────────────────────────── */}
      {phase === "IDLE" && (
        <>
          {/* Market selector */}
          <div className="rounded-xl border border-border bg-card p-4">
            <span className="font-heading text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              Market
            </span>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="mt-2 flex w-full items-center justify-between rounded-lg border border-border bg-card px-3 py-2 font-heading text-sm transition-colors hover:border-muted-foreground">
                  <span>{asset.displayName}</span>
                  <ChevronsUpDown size={14} className="text-muted-foreground" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-[var(--radix-dropdown-menu-trigger-width)]">
                <DropdownMenuLabel className="font-heading text-[11px] uppercase tracking-wide">
                  Volatility Indices
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuRadioGroup
                  value={asset.symbol}
                  onValueChange={(v) => engine.setAsset(v)}
                >
                  {PULSE_ASSETS.map((a) => (
                    <DropdownMenuRadioItem key={a.symbol} value={a.symbol}>
                      {a.displayName}
                    </DropdownMenuRadioItem>
                  ))}
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Tempo selector */}
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center gap-2">
              <Timer size={13} className="text-accent" />
              <span className="font-heading text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                Tempo
              </span>
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2">
              {(["FAST", "STANDARD", "SLOW"] as Tempo[]).map((t) => {
                const cfg = TEMPO_CONFIG[t]
                const active = tempo === t
                return (
                  <button
                    key={t}
                    onClick={() => engine.setTempo(t)}
                    className={
                      "flex flex-col items-center gap-0.5 rounded-lg border px-2 py-2.5 transition-colors " +
                      (active
                        ? "border-accent bg-accent text-accent-foreground"
                        : "border-border bg-card hover:border-muted-foreground")
                    }
                  >
                    <span className="font-heading text-xs font-medium">{cfg.label}</span>
                    <span className="font-heading text-[10px] text-inherit opacity-70">
                      {cfg.timerMs / 1000}s · {cfg.baseMult}×
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Stake selector */}
          <div className="rounded-xl border border-border bg-card p-4">
            <span className="font-heading text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              Stake
            </span>
            <div className="mt-3 flex flex-wrap gap-2">
              {STAKE_TIERS.map((t) => (
                <button
                  key={t}
                  onClick={() => setStake(t)}
                  disabled={t > balance}
                  className={
                    "rounded-lg border px-3 py-2 font-heading text-xs transition-colors disabled:opacity-30 " +
                    (stake === t
                      ? "border-accent bg-accent text-accent-foreground"
                      : "border-border bg-card hover:border-muted-foreground")
                  }
                >
                  {t} USDT
                </button>
              ))}
            </div>
          </div>

          {/* DROP IN button */}
          <button
            onClick={() => engine.startRun(stake)}
            disabled={!canStart}
            className="rounded-xl bg-accent px-4 py-3 font-heading text-sm font-medium text-accent-foreground transition-opacity hover:opacity-90 disabled:opacity-30"
          >
            <div className="flex items-center justify-center gap-2">
              <Zap size={16} />
              DROP IN
            </div>
            <div className="mt-0.5 font-heading text-[10px] opacity-70">
              {stake} USDT · {TEMPO_CONFIG[tempo].label} · {asset.shortName}
            </div>
          </button>
        </>
      )}

      {/* ── LIVE / CALLING: Run Controls ──────────────────────── */}
      {(phase === "LIVE" || phase === "CALLING") && (
        <>
          {/* Current run status */}
          <div className="rounded-xl border border-accent/40 bg-accent/5 p-4">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 font-heading text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                <Flame size={13} className="text-accent" />
                Active Run
              </span>
              <span className="font-heading text-sm">
                {streak > 0 ? `${streak}× streak` : "—"}
              </span>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="font-display text-2xl leading-none">
                {currentMultiplier.toFixed(2)}×
              </span>
              <span className="font-heading text-xs text-muted-foreground">multiplier</span>
            </div>
            <div className="mt-1 font-heading text-sm text-[color:var(--color-brand-green)]">
              {potentialPayout.toFixed(2)} USDT potential
            </div>

            {/* Overheat bar */}
            {overheatLevel >= 2 && (
              <div className="mt-3 flex items-center gap-2">
                <Thermometer size={12} className={overheatLevel >= 3 ? "text-destructive" : "text-muted-foreground"} />
                <div className="flex gap-1">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div
                      key={i}
                      className={
                        "h-1.5 w-4 rounded-sm " +
                        (i < overheatLevel
                          ? i >= 3 ? "bg-destructive" : i >= 2 ? "bg-accent" : "bg-muted-foreground/30"
                          : "bg-muted/40")
                      }
                    />
                  ))}
                </div>
                {overheatLevel >= 3 && (
                  <span className="font-heading text-[10px] text-destructive">OVERHEAT</span>
                )}
              </div>
            )}
          </div>

          {/* CALL / PUT buttons */}
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => engine.predict("CALL")}
              disabled={!canPredict}
              className="flex items-center justify-center gap-2 rounded-xl border border-[color:var(--color-brand-green)]/30 bg-[color:var(--color-brand-green)]/10 py-4 font-heading text-sm font-medium text-[color:var(--color-brand-green)] transition-all hover:bg-[color:var(--color-brand-green)]/20 disabled:opacity-30"
            >
              <ArrowUp size={18} />
              CALL
            </button>
            <button
              onClick={() => engine.predict("PUT")}
              disabled={!canPredict}
              className="flex items-center justify-center gap-2 rounded-xl border border-destructive/25 bg-destructive/5 py-4 font-heading text-sm font-medium text-destructive transition-all hover:bg-destructive/10 disabled:opacity-30"
            >
              <ArrowDown size={18} />
              PUT
            </button>
          </div>

          {/* EXTRACT button */}
          <button
            onClick={() => engine.extract()}
            disabled={!canExtract}
            className="rounded-xl border-2 border-accent bg-accent/10 px-4 py-3 font-heading text-sm font-medium text-accent transition-all hover:bg-accent hover:text-accent-foreground disabled:opacity-20"
          >
            <div className="flex items-center justify-center gap-2">
              <LogOut size={16} />
              EXTRACT — {potentialPayout.toFixed(2)} USDT
            </div>
          </button>

          {/* This run's predictions */}
          {runPredictions.length > 0 && (
            <div className="rounded-xl border border-border bg-card p-4">
              <span className="font-heading text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                This Run
              </span>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {runPredictions.map((p, i) => (
                  <div
                    key={i}
                    className={
                      "flex items-center gap-1 rounded-md px-2 py-1 font-heading text-[10px] font-medium " +
                      (p.outcome === "HIT"
                        ? "border border-[color:var(--color-brand-green)]/30 bg-[color:var(--color-brand-green)]/10 text-[color:var(--color-brand-green)]"
                        : "border border-destructive/25 bg-destructive/5 text-destructive")
                    }
                  >
                    {p.direction === "CALL" ? "↑" : "↓"}
                    {p.headshot && (
                      <Target size={9} className="text-accent" />
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* ── RESULT: Match Summary ──────────────────────────────── */}
      {phase === "RESULT" && lastRun && (
        <>
          <div className="rounded-xl border border-border bg-card p-4">
            <span className="font-heading text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              Match Summary
            </span>
            <div className="mt-3 space-y-3">
              {/* Outcome */}
              <div className="text-center">
                <span
                  className={
                    "font-display text-2xl " +
                    (lastRun.outcome === "EXTRACTED"
                      ? "text-[color:var(--color-brand-green)]"
                      : "text-destructive")
                  }
                >
                  {lastRun.outcome === "EXTRACTED" ? "EXTRACTED" : "BUSTED"}
                </span>
                <div
                  className={
                    "mt-1 font-display text-3xl leading-none " +
                    (lastRun.pnl >= 0
                      ? "text-[color:var(--color-brand-green)]"
                      : "text-destructive")
                  }
                >
                  {lastRun.pnl >= 0 ? "+" : ""}
                  {lastRun.pnl.toFixed(2)} USDT
                </div>
              </div>

              {/* Stats grid */}
              <div className="grid grid-cols-2 gap-2">
                <StatBox label="Streak" value={`${lastRun.streak}×`} />
                <StatBox label="Headshots" value={`${lastRun.headshots}`} icon={<Target size={11} className="text-accent" />} />
                <StatBox label="Stake" value={`${lastRun.stake.toFixed(2)}`} />
                <StatBox label="Payout" value={`${lastRun.payout.toFixed(2)}`} />
              </div>

              {/* Badges */}
              {lastRun.badges.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {lastRun.badges.map((b) => (
                    <span
                      key={b}
                      className="rounded-full border border-accent/40 bg-accent/10 px-2.5 py-0.5 font-heading text-[10px] font-medium text-accent"
                    >
                      {b}
                    </span>
                  ))}
                </div>
              )}

              {/* Prediction history */}
              {lastRun.predictions.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {lastRun.predictions.map((p, i) => (
                    <div
                      key={i}
                      className={
                        "flex items-center gap-1 rounded-md px-2 py-1 font-heading text-[10px] font-medium " +
                        (p.outcome === "HIT"
                          ? "border border-[color:var(--color-brand-green)]/30 bg-[color:var(--color-brand-green)]/10 text-[color:var(--color-brand-green)]"
                          : "border border-destructive/25 bg-destructive/5 text-destructive")
                      }
                    >
                      {p.direction === "CALL" ? "↑" : "↓"}
                      {p.headshot && <Target size={9} className="text-accent" />}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* DROP IN AGAIN */}
          <button
            onClick={() => engine.dismiss()}
            className="rounded-xl bg-accent px-4 py-3 font-heading text-sm font-medium text-accent-foreground transition-opacity hover:opacity-90"
          >
            <div className="flex items-center justify-center gap-2">
              <Zap size={16} />
              DROP IN AGAIN
            </div>
          </button>
        </>
      )}

      {/* ── Run History ──────────────────────────────────────────── */}
      {history.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center justify-between">
            <span className="font-heading text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              History
            </span>
            <span className="font-heading text-[10px] text-muted-foreground">
              {sessionStats.wins}/{sessionStats.runs} extracted
            </span>
          </div>
          <div className="mt-2 space-y-1">
            {history.slice(0, 10).map((run) => (
              <div
                key={run.id}
                className="flex items-center justify-between border-b border-border py-1.5 last:border-0"
              >
                <div className="flex items-center gap-2">
                  <span
                    className={
                      "font-heading text-[10px] font-medium " +
                      (run.outcome === "EXTRACTED"
                        ? "text-[color:var(--color-brand-green)]"
                        : "text-destructive")
                    }
                  >
                    {run.outcome === "EXTRACTED" ? "✓" : "✗"}
                  </span>
                  <span className="font-heading text-xs">{run.asset}</span>
                  <span className="font-heading text-[10px] text-muted-foreground">
                    {run.streak}× · {run.tempo}
                  </span>
                </div>
                <span
                  className={
                    "font-heading text-xs font-medium " +
                    (run.pnl >= 0
                      ? "text-[color:var(--color-brand-green)]"
                      : "text-destructive")
                  }
                >
                  {run.pnl >= 0 ? "+" : ""}
                  {run.pnl.toFixed(2)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Reset */}
      <button
        onClick={onReset}
        className="rounded-lg border border-border bg-card px-3 py-2 font-heading text-xs text-muted-foreground transition-colors hover:border-accent hover:text-foreground"
      >
        Reset demo
      </button>
    </aside>
  )
}

function StatBox({
  label,
  value,
  icon,
}: {
  label: string
  value: string
  icon?: React.ReactNode
}) {
  return (
    <div className="rounded-lg border border-border bg-background p-2.5 text-center">
      <div className="flex items-center justify-center gap-1">
        {icon}
        <span className="font-heading text-[10px] text-muted-foreground">{label}</span>
      </div>
      <span className="font-heading text-sm font-medium">{value}</span>
    </div>
  )
}
