/** Pulse game types and constants. */

export type Direction = "CALL" | "PUT"
export type RunPhase = "IDLE" | "LIVE" | "CALLING" | "RESULT"
export type Tempo = "FAST" | "STANDARD" | "SLOW"

export type BadgeType = "TRIPLE" | "PENTA" | "ACE" | "LEGENDARY"

export interface PulseAsset {
  symbol: string
  displayName: string
  /** Short label for compact UI */
  shortName: string
}

export const PULSE_ASSETS: PulseAsset[] = [
  { symbol: "1HZ10V", displayName: "Volatility 10 (1s)", shortName: "Vol 10" },
  { symbol: "1HZ25V", displayName: "Volatility 25 (1s)", shortName: "Vol 25" },
  { symbol: "1HZ50V", displayName: "Volatility 50 (1s)", shortName: "Vol 50" },
  { symbol: "1HZ75V", displayName: "Volatility 75 (1s)", shortName: "Vol 75" },
  { symbol: "1HZ100V", displayName: "Volatility 100 (1s)", shortName: "Vol 100" },
]

export function findPulseAsset(symbol: string): PulseAsset | undefined {
  return PULSE_ASSETS.find((a) => a.symbol === symbol)
}

/** Tempo configuration — timer duration and base multiplier per hit. */
export const TEMPO_CONFIG: Record<Tempo, { timerMs: number; baseMult: number; label: string }> = {
  FAST: { timerMs: 3_000, baseMult: 1.12, label: "Fast" },
  STANDARD: { timerMs: 5_000, baseMult: 1.18, label: "Standard" },
  SLOW: { timerMs: 8_000, baseMult: 1.25, label: "Slow" },
}

/** Streak thresholds for badge awards. */
export const BADGE_THRESHOLDS: { streak: number; badge: BadgeType }[] = [
  { streak: 3, badge: "TRIPLE" },
  { streak: 5, badge: "PENTA" },
  { streak: 7, badge: "ACE" },
  { streak: 10, badge: "LEGENDARY" },
]

export interface PredictionResult {
  direction: Direction
  priceBefore: number
  priceAfter: number
  outcome: "HIT" | "MISS"
  multiplierAtStep: number
  headshot: boolean
  atMs: number
}

export interface RunSummary {
  id: string
  asset: string
  tempo: Tempo
  stake: number
  streak: number
  headshots: number
  badges: BadgeType[]
  outcome: "EXTRACTED" | "BUSTED" | "TIMEOUT"
  payout: number
  pnl: number
  predictions: PredictionResult[]
  endedAtMs: number
}

export interface TickSample {
  price: number
  tickCount: number
  atMs: number
}

export const STARTING_BALANCE = 1_000
export const STAKE_TIERS = [0.5, 1, 2, 5, 10, 25]
export const SPARKLINE_CAP = 80
export const HISTORY_CAP = 20

/** Headshot: correct call where price moved less than this fraction from reversal zone. */
export const HEADSHOT_THRESHOLD = 0.0005

/** Headshot bonus multiplier applied to that step. */
export const HEADSHOT_BONUS = 1.5

/** Overheat: consecutive same-direction calls before penalty kicks in. */
export const OVERHEAT_TRIGGER = 3

/** Timer reduction per overheat level (ms). */
export const OVERHEAT_PENALTY_MS = 1_000

/** Minimum timer after overheat penalty (ms). */
export const OVERHEAT_MIN_TIMER_MS = 1_500
