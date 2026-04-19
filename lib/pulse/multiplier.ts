/** Multiplier math and headshot detection for Pulse. */

import {
  HEADSHOT_THRESHOLD,
  HEADSHOT_BONUS,
  TEMPO_CONFIG,
  type Direction,
  type Tempo,
} from "./types"

/** Compute the running multiplier for a given streak count and tempo. */
export function runningMultiplier(tempo: Tempo, streak: number): number {
  if (streak <= 0) return 1
  return Math.pow(TEMPO_CONFIG[tempo].baseMult, streak)
}

/** Compute the potential payout: stake × running multiplier. */
export function potentialPayout(
  stake: number,
  tempo: Tempo,
  streak: number
): number {
  return stake * runningMultiplier(tempo, streak)
}

/** Check if a prediction outcome is correct. */
export function isPredictionCorrect(
  direction: Direction,
  priceBefore: number,
  priceAfter: number
): boolean {
  if (direction === "CALL") return priceAfter > priceBefore
  return priceAfter < priceBefore
}

/**
 * Detect a headshot: player called correctly but the price was within
 * HEADSHOT_THRESHOLD of going the other way. This means the move was
 * tiny relative to the price — the player showed conviction on a close call.
 *
 * We measure: how small was the favorable move relative to the price?
 * If |move| / price < threshold, it's a headshot.
 */
export function isHeadshot(
  priceBefore: number,
  priceAfter: number
): boolean {
  if (priceBefore <= 0) return false
  const moveFraction = Math.abs(priceAfter - priceBefore) / priceBefore
  return moveFraction < HEADSHOT_THRESHOLD
}

/** Compute the step multiplier including headshot bonus if applicable. */
export function stepMultiplier(
  tempo: Tempo,
  headshot: boolean
): number {
  const base = TEMPO_CONFIG[tempo].baseMult
  return headshot ? base * HEADSHOT_BONUS : base
}
