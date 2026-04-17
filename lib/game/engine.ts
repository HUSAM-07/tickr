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
  priceBandFraction,
} from "./constants"

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
   * has started, credit immediately (spec §8.1). */
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
