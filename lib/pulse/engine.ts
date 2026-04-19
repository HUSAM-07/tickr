/** Pulse game engine — pure state machine.
 *
 * A run flows: IDLE → LIVE (waiting for prediction) → CALLING (prediction
 * submitted, waiting for next tick) → back to LIVE (hit) or RESULT (miss/extract).
 *
 * The engine consumes ticks from the Deriv WS feed. It knows nothing about
 * React or Canvas. It emits state changes + FX events; the React layer subscribes.
 */

import {
  PULSE_ASSETS,
  findPulseAsset,
  TEMPO_CONFIG,
  BADGE_THRESHOLDS,
  OVERHEAT_TRIGGER,
  OVERHEAT_PENALTY_MS,
  OVERHEAT_MIN_TIMER_MS,
  STARTING_BALANCE,
  SPARKLINE_CAP,
  HISTORY_CAP,
  type BadgeType,
  type Direction,
  type PredictionResult,
  type PulseAsset,
  type RunPhase,
  type RunSummary,
  type Tempo,
  type TickSample,
} from "./types"
import {
  isPredictionCorrect,
  isHeadshot,
  runningMultiplier,
  potentialPayout,
  stepMultiplier,
} from "./multiplier"

// ── FX events (transient, for Canvas/sound) ───────────────────────────

export type FxEvent =
  | { kind: "STREAK_BADGE"; badge: BadgeType; streak: number; atMs: number }
  | { kind: "HEADSHOT"; price: number; atMs: number }
  | { kind: "OVERHEAT"; level: number; atMs: number }
  | { kind: "HIT"; direction: Direction; streak: number; multiplier: number; atMs: number }
  | { kind: "WIN_EXTRACT"; payout: number; streak: number; atMs: number }
  | { kind: "LOSS_BUST"; stake: number; streak: number; atMs: number }
  | { kind: "TIMEOUT_BUST"; stake: number; streak: number; atMs: number }

// ── Engine state ──────────────────────────────────────────────────────

export type EngineState = {
  // Config
  asset: PulseAsset
  tempo: Tempo

  // Balance
  balance: number
  sessionPnl: number

  // Run state
  phase: RunPhase
  stake: number
  streak: number
  currentMultiplier: number
  potentialPayout: number

  // Prediction
  pendingDirection: Direction | null
  /** Epoch-ms when the current prediction window expires. 0 = no active timer. */
  timerDeadlineMs: number
  /** Effective timer duration for current step (may be reduced by overheat). */
  effectiveTimerMs: number
  /** 0–3+: consecutive same-direction calls in current run. */
  overheatLevel: number
  /** The direction that's overheating (last direction called). */
  overheatDirection: Direction | null

  // Tick data
  tickCount: number
  spot: number | null
  prevSpot: number | null
  sparkline: TickSample[]

  // Current run stats
  runPredictions: PredictionResult[]
  headshots: number
  badges: BadgeType[]

  // Session
  history: RunSummary[]
  bestStreak: number

  // Last run result (for the RESULT screen)
  lastRun: RunSummary | null
}

// ── Engine class ──────────────────────────────────────────────────────

type Listener = (state: EngineState) => void
type FxListener = (event: FxEvent) => void

export class PulseEngine {
  private state: EngineState
  private listeners = new Set<Listener>()
  private fxListeners = new Set<FxListener>()
  private runSeq = 1

  constructor(symbol: string, startingBalance = STARTING_BALANCE) {
    const asset = findPulseAsset(symbol) ?? PULSE_ASSETS[0]
    this.state = {
      asset,
      tempo: "STANDARD",
      balance: startingBalance,
      sessionPnl: 0,
      phase: "IDLE",
      stake: 0,
      streak: 0,
      currentMultiplier: 1,
      potentialPayout: 0,
      pendingDirection: null,
      timerDeadlineMs: 0,
      effectiveTimerMs: TEMPO_CONFIG.STANDARD.timerMs,
      overheatLevel: 0,
      overheatDirection: null,
      tickCount: 0,
      spot: null,
      prevSpot: null,
      sparkline: [],
      runPredictions: [],
      headshots: 0,
      badges: [],
      history: [],
      bestStreak: 0,
      lastRun: null,
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

  // ── Asset switching ─────────────────────────────────────────────────

  setAsset(symbol: string): void {
    const next = findPulseAsset(symbol)
    if (!next || next.symbol === this.state.asset.symbol) return
    if (this.state.phase !== "IDLE") return // can't switch mid-run
    const s = this.state
    s.asset = next
    s.sparkline = []
    s.spot = null
    s.prevSpot = null
    this.emit()
  }

  // ── Tempo ───────────────────────────────────────────────────────────

  setTempo(tempo: Tempo): void {
    if (this.state.phase !== "IDLE") return
    this.state.tempo = tempo
    this.state.effectiveTimerMs = TEMPO_CONFIG[tempo].timerMs
    this.emit()
  }

  // ── Run lifecycle ───────────────────────────────────────────────────

  /** Start a new run. Deducts stake from balance. */
  startRun(stake: number): boolean {
    const s = this.state
    if (s.phase !== "IDLE") return false
    if (stake <= 0 || stake > s.balance) return false
    if (s.spot === null) return false // need at least one tick

    s.balance -= stake
    s.phase = "LIVE"
    s.stake = stake
    s.streak = 0
    s.currentMultiplier = 1
    s.potentialPayout = stake
    s.pendingDirection = null
    s.overheatLevel = 0
    s.overheatDirection = null
    s.effectiveTimerMs = TEMPO_CONFIG[s.tempo].timerMs
    s.runPredictions = []
    s.headshots = 0
    s.badges = []
    s.lastRun = null

    // Start the prediction timer
    s.timerDeadlineMs = Date.now() + s.effectiveTimerMs

    this.emit()
    return true
  }

  /** Submit a CALL or PUT prediction. */
  predict(direction: Direction): boolean {
    const s = this.state
    if (s.phase !== "LIVE") return false
    if (s.pendingDirection !== null) return false // already called

    s.pendingDirection = direction
    s.phase = "CALLING"
    this.emit()
    return true
  }

  /** Extract: cash out at current multiplier. Ends the run as a win. */
  extract(): boolean {
    const s = this.state
    if (s.phase !== "LIVE") return false
    if (s.streak < 1) return false // must have at least one hit to extract

    const payout = s.potentialPayout
    s.balance += payout
    const pnl = payout - s.stake
    s.sessionPnl += pnl

    if (s.streak > s.bestStreak) s.bestStreak = s.streak

    const summary = this.buildRunSummary("EXTRACTED", payout, pnl)
    s.history.unshift(summary)
    if (s.history.length > HISTORY_CAP) s.history.pop()

    s.lastRun = summary
    s.phase = "RESULT"
    s.timerDeadlineMs = 0

    this.fx({ kind: "WIN_EXTRACT", payout, streak: s.streak, atMs: Date.now() })
    this.emit()
    return true
  }

  /** Go back to IDLE from RESULT screen. */
  dismiss(): void {
    if (this.state.phase !== "RESULT") return
    this.state.phase = "IDLE"
    this.state.streak = 0
    this.state.currentMultiplier = 1
    this.state.potentialPayout = 0
    this.state.pendingDirection = null
    this.state.runPredictions = []
    this.state.headshots = 0
    this.state.badges = []
    this.emit()
  }

  // ── Tick ingestion ──────────────────────────────────────────────────

  /** Called on every Deriv tick for the active symbol. */
  ingestTick(price: number, epochMs: number): void {
    const s = this.state
    s.tickCount += 1
    s.prevSpot = s.spot
    s.spot = price

    // Sparkline
    s.sparkline.push({ price, tickCount: s.tickCount, atMs: epochMs })
    if (s.sparkline.length > SPARKLINE_CAP) s.sparkline.shift()

    // Check timer timeout (LIVE phase, no prediction submitted yet)
    if (s.phase === "LIVE" && s.timerDeadlineMs > 0 && epochMs >= s.timerDeadlineMs) {
      this.endRunTimeout(epochMs)
      this.emit()
      return
    }

    // Settle pending prediction
    if (s.phase === "CALLING" && s.pendingDirection && s.prevSpot !== null) {
      this.settlePrediction(s.prevSpot, price, epochMs)
    }

    this.emit()
  }

  /** Settle the pending prediction against this tick. */
  private settlePrediction(priceBefore: number, priceAfter: number, epochMs: number): void {
    const s = this.state
    const dir = s.pendingDirection!
    const correct = isPredictionCorrect(dir, priceBefore, priceAfter)

    if (correct) {
      // HIT
      const headshot = isHeadshot(priceBefore, priceAfter)
      const stepMult = stepMultiplier(s.tempo, headshot)

      s.streak += 1
      s.currentMultiplier *= stepMult
      s.potentialPayout = s.stake * s.currentMultiplier

      const result: PredictionResult = {
        direction: dir,
        priceBefore,
        priceAfter,
        outcome: "HIT",
        multiplierAtStep: s.currentMultiplier,
        headshot,
        atMs: epochMs,
      }
      s.runPredictions.push(result)

      if (headshot) {
        s.headshots += 1
        this.fx({ kind: "HEADSHOT", price: priceAfter, atMs: epochMs })
      }

      // Check for badge milestones
      for (const { streak, badge } of BADGE_THRESHOLDS) {
        if (s.streak === streak && !s.badges.includes(badge)) {
          s.badges.push(badge)
          this.fx({ kind: "STREAK_BADGE", badge, streak: s.streak, atMs: epochMs })
        }
      }

      this.fx({ kind: "HIT", direction: dir, streak: s.streak, multiplier: s.currentMultiplier, atMs: epochMs })

      // Update overheat
      if (s.overheatDirection === dir) {
        s.overheatLevel += 1
      } else {
        s.overheatLevel = 1
        s.overheatDirection = dir
      }

      if (s.overheatLevel >= OVERHEAT_TRIGGER) {
        this.fx({ kind: "OVERHEAT", level: s.overheatLevel, atMs: epochMs })
      }

      // Calculate effective timer for next step (overheat penalty)
      const baseTimer = TEMPO_CONFIG[s.tempo].timerMs
      const penalty = s.overheatLevel >= OVERHEAT_TRIGGER
        ? (s.overheatLevel - OVERHEAT_TRIGGER + 1) * OVERHEAT_PENALTY_MS
        : 0
      s.effectiveTimerMs = Math.max(OVERHEAT_MIN_TIMER_MS, baseTimer - penalty)

      // Reset for next prediction
      s.pendingDirection = null
      s.phase = "LIVE"
      s.timerDeadlineMs = Date.now() + s.effectiveTimerMs
    } else {
      // MISS — equal price counts as miss (house edge)
      const result: PredictionResult = {
        direction: dir,
        priceBefore,
        priceAfter,
        outcome: "MISS",
        multiplierAtStep: s.currentMultiplier,
        headshot: false,
        atMs: epochMs,
      }
      s.runPredictions.push(result)

      this.endRunBust(epochMs)
    }
  }

  /** End the run due to wrong prediction. */
  private endRunBust(epochMs: number): void {
    const s = this.state
    const pnl = -s.stake
    s.sessionPnl += pnl

    if (s.streak > s.bestStreak) s.bestStreak = s.streak

    const summary = this.buildRunSummary("BUSTED", 0, pnl)
    s.history.unshift(summary)
    if (s.history.length > HISTORY_CAP) s.history.pop()

    s.lastRun = summary
    s.phase = "RESULT"
    s.timerDeadlineMs = 0
    s.pendingDirection = null

    this.fx({ kind: "LOSS_BUST", stake: s.stake, streak: s.streak, atMs: epochMs })
  }

  /** End the run due to timer expiry. */
  private endRunTimeout(epochMs: number): void {
    const s = this.state
    const pnl = -s.stake
    s.sessionPnl += pnl

    if (s.streak > s.bestStreak) s.bestStreak = s.streak

    const summary = this.buildRunSummary("TIMEOUT", 0, pnl)
    s.history.unshift(summary)
    if (s.history.length > HISTORY_CAP) s.history.pop()

    s.lastRun = summary
    s.phase = "RESULT"
    s.timerDeadlineMs = 0
    s.pendingDirection = null

    this.fx({ kind: "TIMEOUT_BUST", stake: s.stake, streak: s.streak, atMs: epochMs })
  }

  private buildRunSummary(
    outcome: RunSummary["outcome"],
    payout: number,
    pnl: number
  ): RunSummary {
    const s = this.state
    return {
      id: `run-${this.runSeq++}`,
      asset: s.asset.shortName,
      tempo: s.tempo,
      stake: s.stake,
      streak: s.streak,
      headshots: s.headshots,
      badges: [...s.badges],
      outcome,
      payout,
      pnl,
      predictions: [...s.runPredictions],
      endedAtMs: Date.now(),
    }
  }

  /** Reset demo balance and session. */
  reset(): void {
    const s = this.state
    s.balance = STARTING_BALANCE
    s.sessionPnl = 0
    s.phase = "IDLE"
    s.stake = 0
    s.streak = 0
    s.currentMultiplier = 1
    s.potentialPayout = 0
    s.pendingDirection = null
    s.timerDeadlineMs = 0
    s.overheatLevel = 0
    s.overheatDirection = null
    s.runPredictions = []
    s.headshots = 0
    s.badges = []
    s.history = []
    s.bestStreak = 0
    s.lastRun = null
    this.emit()
  }

  // ── Internals ───────────────────────────────────────────────────────

  private emit(): void {
    for (const l of this.listeners) l(this.state)
  }

  private fx(event: FxEvent): void {
    for (const l of this.fxListeners) l(event)
  }
}
