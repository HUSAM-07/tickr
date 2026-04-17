/** Real-time spike detector for Boom/Crash tick streams.
 *
 * A "spike" on Deriv's Boom/Crash indices is an outsized directional move on
 * a single tick — orders of magnitude larger than the normal drift between
 * spikes. We detect it cheaply by comparing each new tick's log-return to
 * a rolling median of the last N absolute log-returns:
 *
 *   spike  ⟺  |r_t| > K × median(|r_{t-N..t-1}|)   AND   sign(r_t) matches
 *                                                         the asset's
 *                                                         expected direction.
 *
 * Using the median (rather than a mean or std-dev) makes the baseline robust
 * against being polluted by the spike itself — median ignores outliers.
 */

export type SpikeDirection = "up" | "down"

export type SpikeDetectorState = {
  /** Rolling window of the last N absolute log-returns. */
  absReturns: number[]
  /** Previous tick price, for computing the next log-return. */
  prevPrice: number | null
  /** Count of ticks ingested so far since this detector was constructed. */
  tickCount: number
}

/** Default window for the rolling median. 30 ticks ≈ 30 s on 1Hz assets. */
const WINDOW = 30
/** A tick qualifies as a spike if |r_t| exceeds this multiple of the median. */
const MULTIPLE = 8
/** Absolute minimum log-return for a spike — guards against detecting noise
 * in very quiet windows where the median is effectively zero. */
const ABS_FLOOR = 0.0015 // 0.15 %

export function newDetectorState(): SpikeDetectorState {
  return { absReturns: [], prevPrice: null, tickCount: 0 }
}

export type DetectResult = {
  /** Whether this tick is a spike in the direction of `direction`. */
  isSpike: boolean
  /** The signed log-return for this tick (null on the very first tick). */
  logReturn: number | null
}

/** Process one tick. Mutates `state` in place for efficiency. */
export function feedTick(
  state: SpikeDetectorState,
  price: number,
  direction: SpikeDirection
): DetectResult {
  state.tickCount += 1

  if (state.prevPrice === null || state.prevPrice <= 0 || price <= 0) {
    state.prevPrice = price
    return { isSpike: false, logReturn: null }
  }

  const r = Math.log(price / state.prevPrice)
  state.prevPrice = price

  // Compute the rolling-median absolute return BEFORE adding this tick, so
  // the current tick can't mask its own outlier status.
  const sorted = [...state.absReturns].sort((a, b) => a - b)
  const median =
    sorted.length === 0
      ? 0
      : sorted.length % 2 === 1
        ? sorted[(sorted.length - 1) / 2]
        : (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2

  const threshold = Math.max(ABS_FLOOR, median * MULTIPLE)
  const directionOk =
    direction === "up" ? r > 0 : r < 0
  const isSpike = Math.abs(r) > threshold && directionOk

  // Update the rolling window — but don't poison it with the spike itself.
  if (!isSpike) {
    state.absReturns.push(Math.abs(r))
    if (state.absReturns.length > WINDOW) state.absReturns.shift()
  }

  return { isSpike, logReturn: r }
}

/** Reset the detector — call when switching symbols. */
export function resetDetector(state: SpikeDetectorState): void {
  state.absReturns.length = 0
  state.prevPrice = null
  state.tickCount = 0
}
