/** GridRush game constants */
import type { GameConfig } from "./types"

export const DEFAULT_GAME_CONFIG: GameConfig = {
  symbol: "R_100",
  timeIntervalSec: 5,
  futureColumns: 8,
  historyColumns: 6,
  visibleRows: 9,
  noPlayBuffer: 1,
  volatility: 1.0, // Volatility 100 Index ≈ 100% annualized
  tickRate: 1, // R_100 ticks at ~1Hz in public feed
  platformMargin: 0.05, // 5% house edge
  startingBalanceUsdt: 1000,
}

/** Per-symbol overrides. Keys map to Deriv symbol codes. */
export const SYMBOL_CONFIG: Record<string, Partial<GameConfig>> = {
  R_10: { volatility: 0.1 },
  R_25: { volatility: 0.25 },
  R_50: { volatility: 0.5 },
  R_75: { volatility: 0.75 },
  R_100: { volatility: 1.0 },
  "1HZ10V": { volatility: 0.1, tickRate: 1 },
  "1HZ25V": { volatility: 0.25, tickRate: 1 },
  "1HZ50V": { volatility: 0.5, tickRate: 1 },
  "1HZ75V": { volatility: 0.75, tickRate: 1 },
  "1HZ100V": { volatility: 1.0, tickRate: 1 },
}

/** Stake tiers in USDT */
export const STAKE_TIERS = [0.5, 1, 2, 5, 10, 25] as const
export const DEFAULT_STAKE = 1

/** Streak variance: consecutive wins compound a payout bonus on the NEXT play. */
export const STREAK_BONUS_STEP = 0.1 // +10% per win
export const STREAK_BONUS_CAP = 1.5 // cap at +50% total

/** Tiered multiplier caps by touch probability (from spec §6.5) */
export function multiplierCapFor(touchProb: number): number {
  if (touchProb >= 0.5) return Number.POSITIVE_INFINITY
  if (touchProb >= 0.1) return 50
  if (touchProb >= 0.01) return 200
  if (touchProb >= 0.001) return 500
  return 1000
}

/** Heat-map colors by multiplier value. Hex strings. */
export function heatColorFor(multiplier: number): string {
  if (multiplier < 1.5) return "#3a3833"
  if (multiplier < 2.5) return "#4e4a3a"
  if (multiplier < 5) return "#7a5a36"
  if (multiplier < 10) return "#a06032"
  if (multiplier < 20) return "#b04a2e"
  return "#c93a2a"
}

/** Fraction of spot price used as price-band height.
 * = 5 × σ × sqrt(dt_years) per spec §4.2.1. Frozen per symbol. */
export function priceBandFraction(volatility: number, tickRate: number): number {
  const dtYears = 1 / tickRate / (365 * 24 * 3600)
  return 5 * volatility * Math.sqrt(dtYears)
}
