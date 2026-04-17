/** GridRush game engine.
 *
 * Pure state machine — holds the current grid, positions, balance, streak,
 * and tick buffer. All mutation happens through explicit methods and every
 * call returns the new state. The React layer subscribes via `onChange`.
 *
 * The engine knows nothing about Canvas or React. It is driven by:
 *   - ingestTick(price, ms)   → called from the Deriv WebSocket callback
 *   - placeBet(col, row)       → called on user click
 *
 * It emits:
 *   - state changes            → React re-renders sidebar
 *   - settlement events         → top-banner notifications
 *   - fx events                 → Canvas draws burst/flash animations
 */
import type {
  CellPricing,
  GameConfig,
  ParlayLeg,
  ParlayPosition,
  Position,
  Settlement,
  Tick,
} from "./types"
import { calculateMultiplier } from "./pricing"
import {
  DEFAULT_GAME_CONFIG,
  STREAK_BONUS_CAP,
  STREAK_BONUS_STEP,
  SYMBOL_CONFIG,
  multiplierCapFor,
  priceBandFraction,
} from "./constants"

/** Minimum / maximum legs in a parlay. */
export const MIN_PARLAY_LEGS = 2
export const MAX_PARLAY_LEGS = 6

/** A draft leg is a cell the user has *staged* into the parlay builder
 * but not yet committed. It holds only coordinates — we re-quote it from
 * the live cell map on every emit so the builder shows fresh odds. */
export type DraftLeg = {
  columnIndex: number
  rowIndex: number
}

/** Snapshot of a draft leg's current odds — computed on read, not stored. */
export type DraftLegQuote = {
  columnIndex: number
  rowIndex: number
  priceLow: number
  priceHigh: number
  fairMultiplier: number
  offeredMultiplier: number
}

/** Transient visual event for Canvas FX layer. Engine emits, Canvas drains. */
export type FxEvent =
  | {
      kind: "WIN_BURST"
      columnIndex: number
      rowIndex: number
      payout: number
      atMs: number
    }
  | {
      kind: "LOSS_FLASH"
      columnIndex: number
      rowIndex: number
      stake: number
      atMs: number
    }
  | {
      kind: "LEG_HIT"
      columnIndex: number
      rowIndex: number
      parlayId: string
      atMs: number
    }
  | {
      kind: "BANNER"
      tone: "win" | "loss" | "info"
      text: string
      atMs: number
    }

export type EngineState = {
  config: GameConfig
  symbol: string
  /** Frozen price-band height as a fraction of spot. */
  bandFraction: number
  /** Absolute price-band height (bandFraction × anchorPrice). Frozen at first tick. */
  bandHeight: number
  /** Anchor price used to freeze bandHeight (first observed spot). */
  anchorPrice: number | null

  /** Current spot & timestamp (last ingested tick) */
  spot: number | null
  nowMs: number

  /** Rolling price buffer (most-recent last). Capped to ~120 s at tickRate. */
  ticks: Tick[]

  /** Live cell pricing keyed by "col:row" */
  cells: Map<string, CellPricing>

  /** All positions (open + settled). Settled ones retained for 1h. */
  positions: Position[]

  /** Parlay positions (open + settled). Settled ones retained for 1h. */
  parlays: ParlayPosition[]

  /** Draft legs the user is currently assembling in the parlay builder.
   * Not yet placed — no stake deducted. */
  draftLegs: DraftLeg[]

  /** Demo balance */
  balance: number

  /** Session P&L since engine start */
  sessionPnl: number

  /** Win streak — consecutive wins. Resets on a loss. */
  winStreak: number
  /** Bonus multiplier applied to the NEXT placed bet. 1.0 = no bonus. */
  nextStreakBonus: number

  /** Current column index at the NOW line */
  nowColumnIndex: number
  /** Epoch-ms origin (NOW line anchor) — grid column k covers
   * [originMs + k·interval, originMs + (k+1)·interval) */
  originMs: number
}

type Listener = (state: EngineState) => void
type FxListener = (event: FxEvent) => void

const TICK_BUFFER_SEC = 120

export class GameEngine {
  private state: EngineState
  private listeners = new Set<Listener>()
  private fxListeners = new Set<FxListener>()
  private positionSeq = 1

  constructor(symbol: string, overrides?: Partial<GameConfig>) {
    const cfg: GameConfig = {
      ...DEFAULT_GAME_CONFIG,
      ...(SYMBOL_CONFIG[symbol] ?? {}),
      ...(overrides ?? {}),
      symbol,
    }
    const frac = priceBandFraction(cfg.volatility, cfg.tickRate)
    this.state = {
      config: cfg,
      symbol,
      bandFraction: frac,
      bandHeight: 0,
      anchorPrice: null,
      spot: null,
      nowMs: Date.now(),
      ticks: [],
      cells: new Map(),
      positions: [],
      parlays: [],
      draftLegs: [],
      balance: cfg.startingBalanceUsdt,
      sessionPnl: 0,
      winStreak: 0,
      nextStreakBonus: 1,
      nowColumnIndex: 0,
      originMs: Date.now(),
    }
  }

  /** Subscribe to state changes. Returns unsubscribe. */
  onChange(listener: Listener): () => void {
    this.listeners.add(listener)
    listener(this.state)
    return () => this.listeners.delete(listener)
  }

  /** Subscribe to visual FX events. Returns unsubscribe. */
  onFx(listener: FxListener): () => void {
    this.fxListeners.add(listener)
    return () => this.fxListeners.delete(listener)
  }

  getState(): EngineState {
    return this.state
  }

  // ── Tick ingestion ──

  /** Called on every Deriv tick. Drives: (1) spot update, (2) recompute cells,
   * (3) check early-win settlement, (4) close expired columns. */
  ingestTick(price: number, epochMs: number): void {
    const s = this.state
    const now = epochMs
    s.spot = price
    s.nowMs = now

    // Freeze band height on first tick
    if (s.anchorPrice === null) {
      s.anchorPrice = price
      s.bandHeight = price * s.bandFraction
      s.originMs = now
      s.nowColumnIndex = 0
    }

    // Append tick (cap buffer)
    s.ticks.push({ price, epochMs: now })
    const cutoffMs = now - TICK_BUFFER_SEC * 1000
    while (s.ticks.length > 0 && s.ticks[0].epochMs < cutoffMs) {
      s.ticks.shift()
    }

    // Advance column index as real time passes
    const intervalMs = s.config.timeIntervalSec * 1000
    s.nowColumnIndex = Math.floor((now - s.originMs) / intervalMs)

    // Settle any column that has fully elapsed
    this.settleElapsedColumns(now)

    // Early-settle any OPEN position whose window has started and that the
    // tick price touches.
    this.checkEarlyWins(price, now)

    // Regenerate pricing grid for the visible future columns
    this.regenerateCells()

    // Prune stale settled positions (> 1h)
    this.prunePositions(now)

    this.emit()
  }

  // ── Placement ──

  /** Place a single bet. Returns the new position id, or null if rejected. */
  placeBet(columnIndex: number, rowIndex: number, stake: number): Position | null {
    const s = this.state
    if (s.spot == null || s.anchorPrice == null) return null
    if (stake <= 0 || stake > s.balance) return null

    // Must be within playable future range (past no-play buffer)
    const minCol = s.nowColumnIndex + s.config.noPlayBuffer + 1
    const maxCol = s.nowColumnIndex + s.config.futureColumns
    if (columnIndex < minCol || columnIndex > maxCol) return null

    const pricing = s.cells.get(cellKey(columnIndex, rowIndex))
    if (!pricing) return null

    const streakBonus = s.nextStreakBonus

    const pos: Position = {
      id: `p${this.positionSeq++}`,
      columnIndex,
      rowIndex,
      priceLow: pricing.priceLow,
      priceHigh: pricing.priceHigh,
      stake,
      lockedMultiplier: pricing.multiplier,
      streakBonus,
      potentialPayout: stake * pricing.multiplier * streakBonus,
      placedAtMs: s.nowMs,
      columnStartMs: s.originMs + columnIndex * s.config.timeIntervalSec * 1000,
      columnEndMs:
        s.originMs + (columnIndex + 1) * s.config.timeIntervalSec * 1000,
      status: "OPEN",
    }

    s.balance -= stake
    s.positions.unshift(pos)

    // Streak bonus is consumed on placement — don't stack across multiple bets
    s.nextStreakBonus = 1

    this.emit()
    return pos
  }

  // ── Parlay builder ──

  /** Toggle a cell in/out of the draft parlay. Returns the new draft length. */
  toggleDraftLeg(columnIndex: number, rowIndex: number): number {
    const s = this.state
    const idx = s.draftLegs.findIndex(
      (l) => l.columnIndex === columnIndex && l.rowIndex === rowIndex
    )
    if (idx >= 0) {
      s.draftLegs.splice(idx, 1)
    } else {
      if (s.draftLegs.length >= MAX_PARLAY_LEGS) {
        this.emit()
        return s.draftLegs.length
      }
      // Only allow cells that are currently playable
      if (!s.cells.has(cellKey(columnIndex, rowIndex))) {
        this.emit()
        return s.draftLegs.length
      }
      s.draftLegs.push({ columnIndex, rowIndex })
    }
    this.emit()
    return s.draftLegs.length
  }

  clearDraftLegs(): void {
    this.state.draftLegs = []
    this.emit()
  }

  /** Snapshot the current odds for every draft leg. Combined multiplier is
   * computed from the PRODUCT of fair (pre-margin) leg multipliers, then
   * a SINGLE margin is applied — this is why parlays pay more than the
   * equivalent independent singles. */
  quoteDraftParlay(): {
    legs: DraftLegQuote[]
    combinedMultiplier: number
    combinedPayoutOnStake: (stake: number) => number
  } {
    const s = this.state
    const legs: DraftLegQuote[] = []
    let fairProduct = 1
    for (const draft of s.draftLegs) {
      const pricing = s.cells.get(cellKey(draft.columnIndex, draft.rowIndex))
      if (!pricing) continue
      // Re-derive the fair multiplier (pre-margin) from the stored post-margin
      // offered multiplier. (We store offered but not fair on CellPricing.)
      const fair = pricing.multiplier / (1 - s.config.platformMargin)
      legs.push({
        columnIndex: pricing.columnIndex,
        rowIndex: pricing.rowIndex,
        priceLow: pricing.priceLow,
        priceHigh: pricing.priceHigh,
        fairMultiplier: fair,
        offeredMultiplier: pricing.multiplier,
      })
      fairProduct *= fair
    }

    // Apply a single margin to the combined fair product, then clamp using
    // the weakest leg's probability tier so the combined multiplier can't
    // abuse the cap structure.
    let combined = fairProduct * (1 - s.config.platformMargin)
    // Cap the combined multiplier against the combined implied probability.
    const combinedProb = 1 / fairProduct
    const cap = multiplierCapFor(combinedProb)
    combined = Math.min(combined, cap)
    combined = Math.max(combined, 1.01)

    return {
      legs,
      combinedMultiplier: legs.length >= MIN_PARLAY_LEGS ? combined : 0,
      combinedPayoutOnStake: (stake: number) =>
        legs.length >= MIN_PARLAY_LEGS ? stake * combined : 0,
    }
  }

  /** Commit the draft legs as a parlay. Returns the new parlay, or null if
   * rejected. Clears the draft on success. */
  placeParlay(stake: number): ParlayPosition | null {
    const s = this.state
    if (stake <= 0 || stake > s.balance) return null
    if (s.draftLegs.length < MIN_PARLAY_LEGS) return null

    const quote = this.quoteDraftParlay()
    if (quote.legs.length !== s.draftLegs.length) {
      // Some draft legs no longer have live pricing — abort
      return null
    }

    const streakBonus = s.nextStreakBonus
    const intervalMs = s.config.timeIntervalSec * 1000

    const legs: ParlayLeg[] = quote.legs.map((q) => ({
      columnIndex: q.columnIndex,
      rowIndex: q.rowIndex,
      priceLow: q.priceLow,
      priceHigh: q.priceHigh,
      fairMultiplier: q.fairMultiplier,
      offeredMultiplier: q.offeredMultiplier,
      columnStartMs: s.originMs + q.columnIndex * intervalMs,
      columnEndMs: s.originMs + (q.columnIndex + 1) * intervalMs,
      status: "OPEN",
    }))

    const parlay: ParlayPosition = {
      id: `P${this.positionSeq++}`,
      kind: "parlay",
      legs,
      stake,
      combinedMultiplier: quote.combinedMultiplier,
      streakBonus,
      potentialPayout: stake * quote.combinedMultiplier * streakBonus,
      placedAtMs: s.nowMs,
      status: "OPEN",
    }

    s.balance -= stake
    s.parlays.unshift(parlay)
    s.draftLegs = []
    s.nextStreakBonus = 1

    this.emit()
    return parlay
  }

  // ── Internals ──

  /** Regenerate pricing for all cells in the playable future range. */
  private regenerateCells(): void {
    const s = this.state
    if (s.spot == null) return
    const cells = new Map<string, CellPricing>()
    const intervalMs = s.config.timeIntervalSec * 1000
    const currentCol = s.nowColumnIndex

    // Anchor row at price so rows are stable relative to spot price movement
    const centerRow = Math.round(s.spot / s.bandHeight)
    const halfRows = Math.floor(s.config.visibleRows / 2) + 3 // small buffer

    // Playable future columns (skip no-play buffer, include FUTURE_COLUMNS)
    for (
      let col = currentCol + s.config.noPlayBuffer + 1;
      col <= currentCol + s.config.futureColumns;
      col++
    ) {
      const colEndMs = s.originMs + (col + 1) * intervalMs
      const colStartMs = s.originMs + col * intervalMs
      const tStartSec = Math.max(0, (colStartMs - s.nowMs) / 1000)
      const tEndSec = Math.max(0.001, (colEndMs - s.nowMs) / 1000)

      for (let r = centerRow - halfRows; r <= centerRow + halfRows; r++) {
        const priceLow = r * s.bandHeight
        const priceHigh = (r + 1) * s.bandHeight
        const { multiplier, touchProbability } = calculateMultiplier(
          s.spot,
          priceLow,
          priceHigh,
          s.config.volatility,
          tStartSec,
          tEndSec,
          s.config.platformMargin
        )
        cells.set(cellKey(col, r), {
          columnIndex: col,
          rowIndex: r,
          priceLow,
          priceHigh,
          multiplier,
          touchProbability,
        })
      }
    }

    s.cells = cells
  }

  /** Early-win: if tick price touches an OPEN position's cell whose window
   * has started, credit immediately (spec §8.1). For parlays, mark the leg
   * as WON and resolve the whole parlay if this was its last open leg. */
  private checkEarlyWins(price: number, nowMs: number): void {
    const s = this.state
    for (const pos of s.positions) {
      if (pos.status !== "OPEN") continue
      if (nowMs < pos.columnStartMs) continue
      if (nowMs >= pos.columnEndMs) continue
      if (price >= pos.priceLow && price < pos.priceHigh) {
        this.settlePosition(pos, "WON", nowMs, price)
      }
    }

    for (const parlay of s.parlays) {
      if (parlay.status !== "OPEN") continue
      for (const leg of parlay.legs) {
        if (leg.status !== "OPEN") continue
        if (nowMs < leg.columnStartMs) continue
        if (nowMs >= leg.columnEndMs) continue
        if (price >= leg.priceLow && price < leg.priceHigh) {
          leg.status = "WON"
          leg.hitPrice = price
          leg.hitAtMs = nowMs
          this.fx({
            kind: "LEG_HIT",
            columnIndex: leg.columnIndex,
            rowIndex: leg.rowIndex,
            parlayId: parlay.id,
            atMs: nowMs,
          })
        }
      }
      this.maybeFinalizeParlay(parlay, nowMs)
    }
  }

  /** Close any column whose end time has passed — remaining OPEN positions
   * in that column are LOSSES (or REFUNDS if feed outage). */
  private settleElapsedColumns(nowMs: number): void {
    const s = this.state
    for (const pos of s.positions) {
      if (pos.status !== "OPEN") continue
      if (nowMs < pos.columnEndMs) continue

      // Any ticks received during the window?
      const received = s.ticks.some(
        (t) => t.epochMs >= pos.columnStartMs && t.epochMs < pos.columnEndMs
      )
      if (!received) {
        this.settlePosition(pos, "REFUNDED", nowMs)
      } else {
        this.settlePosition(pos, "LOST", nowMs)
      }
    }

    for (const parlay of s.parlays) {
      if (parlay.status !== "OPEN") continue
      for (const leg of parlay.legs) {
        if (leg.status !== "OPEN") continue
        if (nowMs < leg.columnEndMs) continue
        const received = s.ticks.some(
          (t) => t.epochMs >= leg.columnStartMs && t.epochMs < leg.columnEndMs
        )
        leg.status = received ? "LOST" : "REFUNDED"
      }
      this.maybeFinalizeParlay(parlay, nowMs)
    }
  }

  /** If all legs have settled (or any has lost/refunded) finalize the parlay's
   * outcome and credit/settle accordingly. */
  private maybeFinalizeParlay(parlay: ParlayPosition, nowMs: number): void {
    if (parlay.status !== "OPEN") return

    // Any leg refunded → whole parlay refunds (stake returned)
    if (parlay.legs.some((l) => l.status === "REFUNDED")) {
      this.finalizeParlay(parlay, "REFUNDED", nowMs)
      return
    }
    // Any leg lost → parlay lost immediately (no reason to wait)
    if (parlay.legs.some((l) => l.status === "LOST")) {
      this.finalizeParlay(parlay, "LOST", nowMs)
      return
    }
    // All legs won → parlay won
    if (parlay.legs.every((l) => l.status === "WON")) {
      this.finalizeParlay(parlay, "WON", nowMs)
      return
    }
    // Otherwise still open — waiting on the remaining legs to resolve.
  }

  private finalizeParlay(
    parlay: ParlayPosition,
    status: "WON" | "LOST" | "REFUNDED",
    atMs: number
  ): void {
    const s = this.state
    parlay.status = status
    parlay.settledAtMs = atMs

    let payout = 0
    let pnlDelta = -parlay.stake
    if (status === "WON") {
      payout = parlay.stake * parlay.combinedMultiplier * parlay.streakBonus
      pnlDelta = payout - parlay.stake
      s.balance += payout
      s.winStreak += 1
      s.nextStreakBonus = Math.min(
        STREAK_BONUS_CAP,
        1 + s.winStreak * STREAK_BONUS_STEP
      )
    } else if (status === "REFUNDED") {
      payout = parlay.stake
      pnlDelta = 0
      s.balance += parlay.stake
    } else {
      s.winStreak = 0
      s.nextStreakBonus = 1
    }
    parlay.actualPayout = payout
    s.sessionPnl += pnlDelta

    // Emit FX based on the final outcome
    if (status === "WON") {
      // Burst on the last-settled leg (the one that "closed" the parlay)
      const lastLeg = parlay.legs.reduce<ParlayLeg>(
        (a, b) => ((b.hitAtMs ?? 0) > (a.hitAtMs ?? 0) ? b : a),
        parlay.legs[0]
      )
      this.fx({
        kind: "WIN_BURST",
        columnIndex: lastLeg.columnIndex,
        rowIndex: lastLeg.rowIndex,
        payout,
        atMs,
      })
      this.fx({
        kind: "BANNER",
        tone: "win",
        text: `Parlay hit! ${parlay.combinedMultiplier.toFixed(2)}x × ${parlay.legs.length} legs → ${payout.toFixed(2)} USDT`,
        atMs,
      })
    } else if (status === "LOST") {
      // Flash the leg that broke the parlay
      const brokenLeg =
        parlay.legs.find((l) => l.status === "LOST") ?? parlay.legs[0]
      this.fx({
        kind: "LOSS_FLASH",
        columnIndex: brokenLeg.columnIndex,
        rowIndex: brokenLeg.rowIndex,
        stake: parlay.stake,
        atMs,
      })
      this.fx({
        kind: "BANNER",
        tone: "loss",
        text: `Parlay broken — lost ${parlay.stake.toFixed(2)} USDT`,
        atMs,
      })
    }
  }

  private settlePosition(
    pos: Position,
    status: Position["status"],
    atMs: number,
    hitPrice?: number
  ): void {
    const s = this.state
    pos.status = status
    pos.settledAtMs = atMs
    pos.hitPrice = hitPrice
    pos.hitAtMs = hitPrice !== undefined ? atMs : undefined

    let payout = 0
    let pnlDelta = -pos.stake
    if (status === "WON") {
      payout = pos.stake * pos.lockedMultiplier * pos.streakBonus
      pnlDelta = payout - pos.stake
      s.balance += payout
      s.winStreak += 1
      // The streak bonus for the NEXT play grows with consecutive wins
      s.nextStreakBonus = Math.min(
        STREAK_BONUS_CAP,
        1 + s.winStreak * STREAK_BONUS_STEP
      )
    } else if (status === "REFUNDED") {
      payout = pos.stake
      pnlDelta = 0
      s.balance += pos.stake
      // Streak unaffected by refund
    } else {
      // LOST — reset streak
      s.winStreak = 0
      s.nextStreakBonus = 1
    }
    pos.actualPayout = payout
    s.sessionPnl += pnlDelta

    // Emit settlement FX
    if (status === "WON") {
      this.fx({
        kind: "WIN_BURST",
        columnIndex: pos.columnIndex,
        rowIndex: pos.rowIndex,
        payout,
        atMs,
      })
      this.fx({
        kind: "BANNER",
        tone: "win",
        text: `You won ${payout.toFixed(2)} USDT${
          pos.streakBonus > 1
            ? ` (🔥 ${Math.round((pos.streakBonus - 1) * 100)}% streak)`
            : ""
        }`,
        atMs,
      })
    } else if (status === "LOST") {
      this.fx({
        kind: "LOSS_FLASH",
        columnIndex: pos.columnIndex,
        rowIndex: pos.rowIndex,
        stake: pos.stake,
        atMs,
      })
      this.fx({
        kind: "BANNER",
        tone: "loss",
        text: `Lost ${pos.stake.toFixed(2)} USDT`,
        atMs,
      })
    }
  }

  /** Remove settled positions older than 1 hour. */
  private prunePositions(nowMs: number): void {
    const s = this.state
    const keepAfterMs = nowMs - 60 * 60 * 1000
    s.positions = s.positions.filter(
      (p) => p.status === "OPEN" || (p.settledAtMs ?? 0) >= keepAfterMs
    )
    s.parlays = s.parlays.filter(
      (p) => p.status === "OPEN" || (p.settledAtMs ?? 0) >= keepAfterMs
    )
    // Drop draft legs whose cells have rolled past the playable window.
    s.draftLegs = s.draftLegs.filter((l) =>
      s.cells.has(cellKey(l.columnIndex, l.rowIndex))
    )
  }

  /** Expose settlement log for external subscribers (banner, sounds). */
  getSettlements(): Settlement[] {
    return this.state.positions
      .filter((p) => p.status !== "OPEN")
      .map((p) => ({
        positionId: p.id,
        status: p.status as "WON" | "LOST" | "REFUNDED",
        payout: p.actualPayout ?? 0,
        columnIndex: p.columnIndex,
        rowIndex: p.rowIndex,
        stake: p.stake,
        hitPrice: p.hitPrice,
      }))
  }

  private emit(): void {
    for (const l of this.listeners) l(this.state)
  }

  private fx(event: FxEvent): void {
    for (const l of this.fxListeners) l(event)
  }
}

export function cellKey(col: number, row: number): string {
  return `${col}:${row}`
}
