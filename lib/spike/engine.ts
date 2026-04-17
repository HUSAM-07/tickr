/** Spike Hunter game engine — pure state machine.
 *
 * A round flows: IDLE → ARMED (bet placed) → RESOLVED (spike hit or window
 * expired) → IDLE. The engine consumes ticks, detects spikes, and settles
 * the active bet when the window closes.
 *
 * Knows nothing about React or Canvas. Emits state changes + FX events;
 * the React layer subscribes.
 */
import {
  SPIKE_ASSETS,
  findAsset,
  quoteBet,
  type BetKind,
  type BetQuote,
  type SpikeAsset,
} from "./poisson"
import {
  feedTick,
  newDetectorState,
  resetDetector,
  type SpikeDetectorState,
} from "./detector"

export type RoundState = "IDLE" | "ARMED" | "RESOLVING"

export type ActiveBet = {
  id: string
  kind: BetKind
  stake: number
  /** Payout multiplier locked at placement. */
  lockedMultiplier: number
  /** Streak bonus applied at placement time (1.0 = no bonus). */
  streakBonus: number
  placedAtTickCount: number
  /** Absolute tick index at which the window expires. */
  expiresAtTickCount: number
  /** How many ticks the window covers (mirrors the bet). Only for display. */
  windowTicks: number
}

export type RoundResult = {
  id: string
  betLabel: string
  stake: number
  multiplier: number
  streakBonus: number
  outcome: "WON" | "LOST"
  payout: number
  /** Net P&L delta: payout − stake for wins, −stake for losses. */
  pnl: number
  spikeTickCount?: number
  elapsedTicks: number
  /** Spike price (for the "near miss" display). */
  spikePrice?: number
  settledAtMs: number
}

export type FxEvent =
  | { kind: "SPIKE"; direction: "up" | "down"; atMs: number; price: number }
  | { kind: "WIN"; payout: number; atMs: number }
  | { kind: "LOSS"; stake: number; atMs: number }
  | { kind: "NEAR_MISS"; missedBy: number; atMs: number }

export type SpikeEvent = {
  /** Absolute tick index at which the spike was detected. */
  tickCount: number
  price: number
  atMs: number
}

export type TickSample = { price: number; tickCount: number; atMs: number }

export type EngineState = {
  asset: SpikeAsset
  balance: number
  sessionPnl: number

  roundState: RoundState
  activeBet: ActiveBet | null

  /** Absolute tick counter since the engine started. */
  tickCount: number
  /** Current spot price (last tick). */
  spot: number | null
  /** Most-recent tick's epoch-ms. */
  nowMs: number

  /** Rolling sparkline buffer — last ~120 ticks. */
  sparkline: TickSample[]

  /** Tick count of the most-recent detected spike. null = not yet seen. */
  lastSpikeTickCount: number | null
  /** Tick count at which we started "watching" (used before the first spike). */
  watchStartTickCount: number

  /** Rolling log of recent spike gaps (in ticks). Used for the history strip. */
  spikeGaps: number[]

  /** Consecutive-win streak for the hooks/variance system. */
  winStreak: number
  /** Bonus multiplier to be applied to the NEXT placed bet. 1.0 = no bonus. */
  nextStreakBonus: number

  /** Rolling history of settled rounds (most recent first, capped). */
  history: RoundResult[]
}

const STREAK_BONUS_STEP = 0.15
const STREAK_BONUS_CAP = 1.5
const SPARKLINE_CAP = 140
const SPIKE_GAP_CAP = 20
const HISTORY_CAP = 30

type Listener = (state: EngineState) => void
type FxListener = (event: FxEvent) => void

export class SpikeEngine {
  private state: EngineState
  private detector: SpikeDetectorState = newDetectorState()
  private listeners = new Set<Listener>()
  private fxListeners = new Set<FxListener>()
  private betSeq = 1

  constructor(symbol: string, startingBalance = 1000) {
    const asset = findAsset(symbol) ?? SPIKE_ASSETS[0]
    this.state = {
      asset,
      balance: startingBalance,
      sessionPnl: 0,
      roundState: "IDLE",
      activeBet: null,
      tickCount: 0,
      spot: null,
      nowMs: Date.now(),
      sparkline: [],
      lastSpikeTickCount: null,
      watchStartTickCount: 0,
      spikeGaps: [],
      winStreak: 0,
      nextStreakBonus: 1,
      history: [],
    }
  }

  getState(): EngineState {
    return this.state
  }

  onChange(listener: Listener): () => void {
    this.listeners.add(listener)
    listener(this.state)
    return () => this.listeners.delete(listener)
  }

  onFx(listener: FxListener): () => void {
    this.fxListeners.add(listener)
    return () => this.fxListeners.delete(listener)
  }

  // ── Asset switching ──────────────────────────────────────────────

  /** Switch to a different Boom/Crash asset. Cancels any active bet as a
   * refund (no one wins or loses from a mid-round asset swap). */
  setAsset(symbol: string): void {
    const next = findAsset(symbol)
    if (!next || next.symbol === this.state.asset.symbol) return
    const s = this.state
    // Refund any armed bet
    if (s.activeBet) {
      s.balance += s.activeBet.stake
      s.activeBet = null
      s.roundState = "IDLE"
    }
    s.asset = next
    s.sparkline = []
    s.lastSpikeTickCount = null
    s.watchStartTickCount = s.tickCount
    s.spikeGaps = []
    resetDetector(this.detector)
    this.emit()
  }

  // ── Bet placement ────────────────────────────────────────────────

  /** Quote a bet against the current asset. Pure helper. */
  quote(bet: BetKind): BetQuote {
    return quoteBet(bet, this.state.asset.avgInterval)
  }

  /** Place a bet. Returns the ActiveBet, or null if rejected. */
  placeBet(bet: BetKind, stake: number): ActiveBet | null {
    const s = this.state
    if (s.roundState !== "IDLE") return null
    if (stake <= 0 || stake > s.balance) return null

    const quote = this.quote(bet)
    const streakBonus = s.nextStreakBonus

    // Window size = how many ticks until the bet expires (WITHIN / NOT_WITHIN
    // share the same window size; SNIPER's "expiry" is `targetTick + tolerance`).
    let windowTicks = 0
    if (bet.kind === "WITHIN" || bet.kind === "NOT_WITHIN") {
      windowTicks = bet.ticks
    } else {
      windowTicks = bet.targetTick + bet.tolerance
    }

    const active: ActiveBet = {
      id: `b${this.betSeq++}`,
      kind: bet,
      stake,
      lockedMultiplier: quote.offeredMultiplier,
      streakBonus,
      placedAtTickCount: s.tickCount,
      expiresAtTickCount: s.tickCount + windowTicks,
      windowTicks,
    }

    s.balance -= stake
    s.activeBet = active
    s.roundState = "ARMED"
    s.nextStreakBonus = 1 // streak bonus is consumed on placement
    this.emit()
    return active
  }

  // ── Tick ingestion ───────────────────────────────────────────────

  /** Called on every Deriv tick for the active symbol. */
  ingestTick(price: number, epochMs: number): void {
    const s = this.state
    s.tickCount += 1
    s.spot = price
    s.nowMs = epochMs

    // Sparkline
    s.sparkline.push({ price, tickCount: s.tickCount, atMs: epochMs })
    if (s.sparkline.length > SPARKLINE_CAP) s.sparkline.shift()

    // Spike detection
    const { isSpike } = feedTick(this.detector, price, s.asset.direction)
    if (isSpike) {
      // Record the gap between this spike and the previous one
      const since = s.lastSpikeTickCount ?? s.watchStartTickCount
      const gap = s.tickCount - since
      if (gap > 0 && gap < 5_000) {
        s.spikeGaps.push(gap)
        if (s.spikeGaps.length > SPIKE_GAP_CAP) s.spikeGaps.shift()
      }
      s.lastSpikeTickCount = s.tickCount

      this.fx({
        kind: "SPIKE",
        direction: s.asset.direction,
        atMs: epochMs,
        price,
      })

      // Resolve the active bet, if any, using this spike as the outcome event.
      if (s.activeBet) this.resolveBet(isSpike, price)
    } else if (s.activeBet && s.tickCount >= s.activeBet.expiresAtTickCount) {
      // Window expired without a spike
      this.resolveBet(false, price)
    }

    this.emit()
  }

  /** Resolve the active bet given whether this tick was the spike. */
  private resolveBet(spikeThisTick: boolean, price: number): void {
    const s = this.state
    const bet = s.activeBet
    if (!bet) return

    const elapsed = s.tickCount - bet.placedAtTickCount
    let won = false

    if (bet.kind.kind === "WITHIN") {
      won = spikeThisTick && elapsed <= bet.kind.ticks
    } else if (bet.kind.kind === "NOT_WITHIN") {
      // NOT_WITHIN wins only if we reached the end of the window without a spike
      won = !spikeThisTick && elapsed >= bet.kind.ticks
    } else {
      // SNIPER: spike must land within ±tolerance of the target offset
      const target = bet.kind.targetTick
      const tol = bet.kind.tolerance
      won = spikeThisTick && Math.abs(elapsed - target) <= tol
    }

    const payout = won ? bet.stake * bet.lockedMultiplier * bet.streakBonus : 0
    if (won) s.balance += payout
    const pnl = payout - bet.stake
    s.sessionPnl += pnl

    // Update streak
    if (won) {
      s.winStreak += 1
      s.nextStreakBonus = Math.min(
        STREAK_BONUS_CAP,
        1 + s.winStreak * STREAK_BONUS_STEP
      )
    } else {
      s.winStreak = 0
      s.nextStreakBonus = 1
    }

    const result: RoundResult = {
      id: bet.id,
      betLabel: labelForBet(bet.kind),
      stake: bet.stake,
      multiplier: bet.lockedMultiplier,
      streakBonus: bet.streakBonus,
      outcome: won ? "WON" : "LOST",
      payout,
      pnl,
      spikeTickCount: spikeThisTick ? s.tickCount : undefined,
      elapsedTicks: elapsed,
      spikePrice: spikeThisTick ? price : undefined,
      settledAtMs: s.nowMs,
    }
    s.history.unshift(result)
    if (s.history.length > HISTORY_CAP) s.history.pop()

    s.activeBet = null
    s.roundState = "IDLE"

    if (won) {
      this.fx({ kind: "WIN", payout, atMs: s.nowMs })
    } else {
      this.fx({ kind: "LOSS", stake: bet.stake, atMs: s.nowMs })
      // Near-miss: if we would have won with one more tick of slack, emit
      if (bet.kind.kind === "WITHIN" && spikeThisTick) {
        const missedBy = elapsed - bet.kind.ticks
        if (missedBy > 0 && missedBy <= 3) {
          this.fx({ kind: "NEAR_MISS", missedBy, atMs: s.nowMs })
        }
      }
    }
  }

  /** Cancel an active bet without refund — surrender. */
  surrender(): void {
    const s = this.state
    if (!s.activeBet) return
    this.resolveBet(false, s.spot ?? 0)
    this.emit()
  }

  /** Reset balance & history — fresh demo session. */
  reset(): void {
    const s = this.state
    s.balance = 1000
    s.sessionPnl = 0
    s.activeBet = null
    s.roundState = "IDLE"
    s.winStreak = 0
    s.nextStreakBonus = 1
    s.history = []
    this.emit()
  }

  // ── Internals ────────────────────────────────────────────────────

  private emit(): void {
    for (const l of this.listeners) l(this.state)
  }

  private fx(event: FxEvent): void {
    for (const l of this.fxListeners) l(event)
  }
}

export function labelForBet(bet: BetKind): string {
  if (bet.kind === "WITHIN") return `Spike in next ${bet.ticks}`
  if (bet.kind === "NOT_WITHIN") return `No spike in ${bet.ticks}`
  return `Snipe @ ${bet.targetTick} ±${bet.tolerance}`
}
