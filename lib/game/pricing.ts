/** Touch-probability & multiplier math for GridRush cells.
 *
 * Uses a reflection-principle approximation for driftless log-GBM: the
 * probability that the spot price visits a narrow price band [L, H] during
 * [tStart, tEnd] is approximated by the first-passage probability to the
 * nearest band edge, subtracting the probability of having already passed
 * that edge before tStart.
 *
 * For the row-band widths used by the grid (~0.09% of spot for V100), the
 * approximation is tight enough for demo pricing and is O(1) per cell.
 */
import { multiplierCapFor } from "./constants"

const SECONDS_PER_YEAR = 365 * 24 * 3600

/** Standard-normal CDF via Abramowitz & Stegun 26.2.17. */
export function normalCDF(x: number): number {
  const a1 = 0.254829592
  const a2 = -0.284496736
  const a3 = 1.421413741
  const a4 = -1.453152027
  const a5 = 1.061405429
  const p = 0.3275911

  const sign = x < 0 ? -1 : 1
  const ax = Math.abs(x) / Math.SQRT2
  const t = 1 / (1 + p * ax)
  const y =
    1 -
    (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) *
      t *
      Math.exp(-ax * ax)
  return 0.5 * (1 + sign * y)
}

/** One-sided first-passage probability for driftless log-GBM:
 * P(max_{t∈[0,T]} log(S_t/S_0) ≥ b)  where  b = ln(B/S_0).
 *
 * Reflection principle: 2 · Φ(-|b| / (σ√T)). */
function oneSidedTouch(
  logDistance: number,
  sigma: number,
  tSeconds: number
): number {
  if (tSeconds <= 0) return 0
  const sigmaT = sigma * Math.sqrt(tSeconds / SECONDS_PER_YEAR)
  if (sigmaT <= 0) return 0
  const z = Math.abs(logDistance) / sigmaT
  return 2 * (1 - normalCDF(z))
}

/** Probability that the spot price visits band [low, high) at some tick in
 * [tStart, tEnd] (both in seconds from now).
 * Result is clamped to [1e-4, 0.9999]. */
export function bandTouchProbability(
  spot: number,
  low: number,
  high: number,
  sigma: number,
  tStartSec: number,
  tEndSec: number
): number {
  if (spot >= low && spot < high) return 0.9999
  if (tEndSec <= 0 || spot <= 0 || low <= 0 || high <= low) return 1e-4

  // Nearest band edge is the relevant first-passage barrier
  const nearEdge = spot < low ? low : high
  const farEdge = spot < low ? high : low
  const logDistNear = Math.log(nearEdge / spot)
  const logDistFar = Math.log(farEdge / spot)

  // P(touch nearEdge by tEnd) − P(touch nearEdge by tStart).
  // This isolates the probability of *first* reaching the band within the
  // observation window — assuming that once the near edge is touched, some
  // subsequent tick lands in the band. For narrow bands this is tight.
  const pByEnd = oneSidedTouch(logDistNear, sigma, tEndSec)
  const pByStart = oneSidedTouch(logDistNear, sigma, tStartSec)
  let pVisit = Math.max(0, pByEnd - pByStart)

  // For very wide bands far from spot, reduce by probability of overshooting
  // both edges before a tick lands inside — rough but prevents over-pricing.
  const bandLogWidth = Math.abs(logDistFar - logDistNear)
  const sigmaEnd = sigma * Math.sqrt(tEndSec / SECONDS_PER_YEAR)
  if (sigmaEnd > 0 && bandLogWidth < sigmaEnd * 0.25) {
    // Very narrow band relative to expected move — reduce slightly
    pVisit *= 0.9
  }

  return Math.min(0.9999, Math.max(1e-4, pVisit))
}

/** Calculate displayed multiplier for a cell.
 * - fair = 1 / P(touch)
 * - cap by tier (§6.5)
 * - subtract platform margin
 * - floor at 1.01 */
export function calculateMultiplier(
  spot: number,
  priceLow: number,
  priceHigh: number,
  sigma: number,
  tStartSec: number,
  tEndSec: number,
  platformMargin: number
): { multiplier: number; touchProbability: number } {
  const pTouch = bandTouchProbability(
    spot,
    priceLow,
    priceHigh,
    sigma,
    tStartSec,
    tEndSec
  )

  let fair = 1 / pTouch
  fair = Math.min(fair, multiplierCapFor(pTouch))

  const offered = fair * (1 - platformMargin)
  return {
    multiplier: Math.max(1.01, offered),
    touchProbability: pTouch,
  }
}
