/** GridRush game domain types */

export type CellKey = string // `${col}:${row}`

/** Time column (vertical slice of the grid) */
export type GridColumn = {
  /** Stable column index — monotonically increasing from session start */
  index: number
  /** Unix ms — inclusive start of the settlement window */
  startMs: number
  /** Unix ms — exclusive end of the settlement window */
  endMs: number
}

/** Price row (horizontal slice) */
export type GridRow = {
  /** Stable row index derived from floor(price / bandHeight) */
  index: number
  priceLow: number
  priceHigh: number
}

/** Live cell multiplier snapshot — recomputed each tick */
export type CellPricing = {
  columnIndex: number
  rowIndex: number
  priceLow: number
  priceHigh: number
  /** Displayed to user (after margin + caps) */
  multiplier: number
  /** Underlying hit probability (informational) */
  touchProbability: number
}

export type Position = {
  id: string
  columnIndex: number
  rowIndex: number
  priceLow: number
  priceHigh: number
  stake: number
  /** Multiplier locked at placement time */
  lockedMultiplier: number
  /** Streak bonus applied at placement — pure multiplier (e.g., 1.2 = +20%) */
  streakBonus: number
  /** Effective payout = stake × lockedMultiplier × streakBonus (if won) */
  potentialPayout: number
  placedAtMs: number
  columnStartMs: number
  columnEndMs: number
  status: "OPEN" | "WON" | "LOST" | "REFUNDED"
  settledAtMs?: number
  actualPayout?: number
  hitPrice?: number
  hitAtMs?: number
}

/** A single leg of a parlay — one (col, row) prediction. Legs settle
 * independently but the parlay as a whole only WINS if every leg WINS.
 * If any leg LOSES, the parlay loses immediately. If any leg REFUNDS
 * (no ticks in its window), the whole parlay refunds. */
export type ParlayLeg = {
  columnIndex: number
  rowIndex: number
  priceLow: number
  priceHigh: number
  /** Per-leg fair multiplier = 1 / P(touch), BEFORE margin. Used to compute
   * the combined parlay payout. */
  fairMultiplier: number
  /** Per-leg offered multiplier (post-margin), for display only. */
  offeredMultiplier: number
  columnStartMs: number
  columnEndMs: number
  status: "OPEN" | "WON" | "LOST" | "REFUNDED"
  hitPrice?: number
  hitAtMs?: number
}

export type ParlayPosition = {
  id: string
  kind: "parlay"
  legs: ParlayLeg[]
  stake: number
  /** Combined offered multiplier — product of leg fair multipliers, then
   * a SINGLE margin applied. This is why parlays pay more than equivalent
   * independent singles: margin is charged once, not N times. */
  combinedMultiplier: number
  /** Streak bonus applied at placement. */
  streakBonus: number
  /** stake × combinedMultiplier × streakBonus */
  potentialPayout: number
  placedAtMs: number
  status: "OPEN" | "WON" | "LOST" | "REFUNDED"
  settledAtMs?: number
  actualPayout?: number
}

export type Tick = {
  price: number
  epochMs: number
}

export type Settlement = {
  positionId: string
  status: "WON" | "LOST" | "REFUNDED"
  payout: number
  columnIndex: number
  rowIndex: number
  stake: number
  hitPrice?: number
}

export type GameConfig = {
  /** Default symbol on boot */
  symbol: string
  /** Seconds per column */
  timeIntervalSec: number
  /** Columns drawn right of NOW */
  futureColumns: number
  /** Columns retained left of NOW */
  historyColumns: number
  /** Playable rows (odd so the current price sits on a row boundary center) */
  visibleRows: number
  /** Columns immediately past NOW that are locked */
  noPlayBuffer: number
  /** Annualized sigma of the underlying (e.g., 1.0 for vol_100) */
  volatility: number
  /** Ticks per second expected */
  tickRate: number
  /** Platform margin applied to every multiplier (0.05 = 5%) */
  platformMargin: number
  /** Starting demo balance in USDT */
  startingBalanceUsdt: number
}
