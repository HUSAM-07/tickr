/** Spike Hunter — Poisson math for Boom/Crash spike timing.
 *
 * Deriv's Boom & Crash indices generate uni-directional spikes at a known
 * AVERAGE tick interval (500, 600, 900, 1000). Each tick is an independent
 * Bernoulli trial with p = 1/avgInterval. Equivalently, spike arrivals are
 * well-approximated by a Poisson process with λ = 1/avgInterval.
 *
 * All payout math flows from this single assumption.
 */

/** Asset metadata — intervals verified from Deriv's Traders Academy docs. */
export type SpikeAsset = {
  symbol: string
  displayName: string
  /** Direction of the spike: "up" = Boom, "down" = Crash */
  direction: "up" | "down"
  /** Average ticks between spikes (the `N` in "Boom N") */
  avgInterval: number
}

export const SPIKE_ASSETS: SpikeAsset[] = [
  { symbol: "BOOM500", displayName: "Boom 500", direction: "up", avgInterval: 500 },
  { symbol: "BOOM600", displayName: "Boom 600", direction: "up", avgInterval: 600 },
  { symbol: "BOOM900", displayName: "Boom 900", direction: "up", avgInterval: 900 },
  { symbol: "BOOM1000", displayName: "Boom 1000", direction: "up", avgInterval: 1000 },
  { symbol: "CRASH500", displayName: "Crash 500", direction: "down", avgInterval: 500 },
  { symbol: "CRASH600", displayName: "Crash 600", direction: "down", avgInterval: 600 },
  { symbol: "CRASH900", displayName: "Crash 900", direction: "down", avgInterval: 900 },
  { symbol: "CRASH1000", displayName: "Crash 1000", direction: "down", avgInterval: 1000 },
]

export function findAsset(symbol: string): SpikeAsset | undefined {
  return SPIKE_ASSETS.find((a) => a.symbol === symbol)
}

/** P(at least one spike in the next `ticks` ticks) for a Poisson process
 * with rate λ = 1/avgInterval. Returns a value in (0, 1). */
export function probSpikeWithin(ticks: number, avgInterval: number): number {
  if (ticks <= 0) return 0
  if (avgInterval <= 0) return 1
  const lambda = 1 / avgInterval
  return 1 - Math.exp(-ticks * lambda)
}

/** P(no spike in the next `ticks` ticks) — the complement. */
export function probNoSpikeWithin(ticks: number, avgInterval: number): number {
  return 1 - probSpikeWithin(ticks, avgInterval)
}

/** P(a spike lands on exactly the next tick) — useful for the "sniper" mode. */
export function probSpikeOnExactTick(avgInterval: number): number {
  if (avgInterval <= 0) return 1
  return 1 / avgInterval
}

/** P(the spike falls within ±tolerance ticks of the target offset, given
 * we are currently at `elapsedTicks` since round start). */
export function probSpikeInWindow(
  targetOffset: number,
  tolerance: number,
  avgInterval: number
): number {
  const lo = Math.max(0, targetOffset - tolerance)
  const hi = targetOffset + tolerance
  return probSpikeWithin(hi, avgInterval) - probSpikeWithin(lo, avgInterval)
}

// ── Payout bets ──────────────────────────────────────────────────────

/** The platform margin applied to every multiplier. */
export const HOUSE_MARGIN = 0.05
/** Floor for any offered multiplier. */
export const MIN_MULTIPLIER = 1.01
/** Hard cap — no single bet can pay more than this multiplier. */
export const MAX_MULTIPLIER = 500

/** Bet types the player can place. */
export type BetKind =
  | { kind: "WITHIN"; ticks: number }
  | { kind: "NOT_WITHIN"; ticks: number }
  | { kind: "SNIPER"; targetTick: number; tolerance: number }

export type BetQuote = {
  /** Raw probability of the bet winning, per the Poisson model */
  probability: number
  /** Fair multiplier = 1/p, before margin and caps */
  fairMultiplier: number
  /** Displayed to user — fair × (1 − margin), capped & floored */
  offeredMultiplier: number
}

/** Given a bet, compute its probability and offered multiplier. */
export function quoteBet(bet: BetKind, avgInterval: number): BetQuote {
  let p = 0
  if (bet.kind === "WITHIN") {
    p = probSpikeWithin(bet.ticks, avgInterval)
  } else if (bet.kind === "NOT_WITHIN") {
    p = probNoSpikeWithin(bet.ticks, avgInterval)
  } else {
    p = probSpikeInWindow(bet.targetTick, bet.tolerance, avgInterval)
  }
  p = Math.max(1e-4, Math.min(0.9999, p))
  const fair = 1 / p
  const offered = Math.min(MAX_MULTIPLIER, Math.max(MIN_MULTIPLIER, fair * (1 - HOUSE_MARGIN)))
  return { probability: p, fairMultiplier: fair, offeredMultiplier: offered }
}

/** Preset window bets shown in the sidebar. Ordered tight → loose. */
export const PRESET_WINDOW_BETS: { label: string; bet: BetKind; blurb: string }[] = [
  {
    label: "Next 10 ticks",
    bet: { kind: "WITHIN", ticks: 10 },
    blurb: "Tight window. Biggest payout.",
  },
  {
    label: "Next 25 ticks",
    bet: { kind: "WITHIN", ticks: 25 },
    blurb: "Short window, strong payout.",
  },
  {
    label: "Next 50 ticks",
    bet: { kind: "WITHIN", ticks: 50 },
    blurb: "Moderate window.",
  },
  {
    label: "Next 100 ticks",
    bet: { kind: "WITHIN", ticks: 100 },
    blurb: "Wider window, small payout.",
  },
  {
    label: "No spike in 50",
    bet: { kind: "NOT_WITHIN", ticks: 50 },
    blurb: "Safe bet — usually hits.",
  },
]

/** Sniper shot presets. Target tick is relative to the round's start. */
export const SNIPER_SHOTS: { label: string; targetTick: number; tolerance: number }[] = [
  { label: "Snipe @ 25 (±2)", targetTick: 25, tolerance: 2 },
  { label: "Snipe @ 50 (±2)", targetTick: 50, tolerance: 2 },
  { label: "Snipe @ 100 (±3)", targetTick: 100, tolerance: 3 },
]
