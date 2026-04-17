"use client"

import { useEffect, useRef } from "react"
import type { GameEngine, FxEvent } from "@/lib/game/engine"
import type { EngineState } from "@/lib/game/engine"
import type { Position } from "@/lib/game/types"
import { heatColorFor } from "@/lib/game/constants"

type Props = {
  engine: GameEngine
  stake: number
  className?: string
}

type ActiveBurst = { col: number; row: number; payout: number; startedMs: number }
type ActiveFlash = { col: number; row: number; kind: "loss"; startedMs: number }
type ActiveBanner = {
  tone: "win" | "loss" | "info"
  text: string
  startedMs: number
}

type HoverCell = { col: number; row: number } | null

const BURST_MS = 900
const FLASH_MS = 500
const BANNER_MS = 2400

export function GameCanvas({ engine, stake, className }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const stateRef = useRef<EngineState>(engine.getState())
  const stakeRef = useRef<number>(stake)
  const hoverRef = useRef<HoverCell>(null)
  const burstsRef = useRef<ActiveBurst[]>([])
  const flashesRef = useRef<ActiveFlash[]>([])
  const bannerRef = useRef<ActiveBanner | null>(null)

  // Keep stake ref up to date
  useEffect(() => {
    stakeRef.current = stake
  }, [stake])

  // Subscribe to engine updates (state + FX)
  useEffect(() => {
    const unsubState = engine.onChange((s) => {
      stateRef.current = s
    })
    const unsubFx = engine.onFx((e: FxEvent) => {
      if (e.kind === "WIN_BURST") {
        burstsRef.current.push({
          col: e.columnIndex,
          row: e.rowIndex,
          payout: e.payout,
          startedMs: e.atMs,
        })
      } else if (e.kind === "LOSS_FLASH") {
        flashesRef.current.push({
          col: e.columnIndex,
          row: e.rowIndex,
          kind: "loss",
          startedMs: e.atMs,
        })
      } else if (e.kind === "BANNER") {
        bannerRef.current = {
          tone: e.tone,
          text: e.text,
          startedMs: e.atMs,
        }
      }
    })
    return () => {
      unsubState()
      unsubFx()
    }
  }, [engine])

  // Main render loop
  useEffect(() => {
    const canvas = canvasRef.current
    const container = containerRef.current
    if (!canvas || !container) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    let rafId = 0

    const ensureSized = () => {
      const rect = container.getBoundingClientRect()
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      const targetW = Math.max(200, Math.round(rect.width * dpr))
      const targetH = Math.max(200, Math.round(rect.height * dpr))
      if (canvas.width !== targetW || canvas.height !== targetH) {
        canvas.width = targetW
        canvas.height = targetH
        canvas.style.width = `${rect.width}px`
        canvas.style.height = `${rect.height}px`
      }
      return { dpr, cssW: rect.width, cssH: rect.height }
    }

    const frame = () => {
      const { dpr, cssW, cssH } = ensureSized()
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      draw(ctx, cssW, cssH, {
        state: stateRef.current,
        hover: hoverRef.current,
        bursts: burstsRef.current,
        flashes: flashesRef.current,
        banner: bannerRef.current,
        stake: stakeRef.current,
      })
      // Prune expired FX
      const now = Date.now()
      burstsRef.current = burstsRef.current.filter(
        (b) => now - b.startedMs < BURST_MS
      )
      flashesRef.current = flashesRef.current.filter(
        (f) => now - f.startedMs < FLASH_MS
      )
      if (bannerRef.current && now - bannerRef.current.startedMs > BANNER_MS) {
        bannerRef.current = null
      }
      rafId = requestAnimationFrame(frame)
    }
    rafId = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(rafId)
  }, [])

  // Click & hover handlers
  useEffect(() => {
    const canvas = canvasRef.current
    const container = containerRef.current
    if (!canvas || !container) return

    const toCell = (clientX: number, clientY: number): HoverCell => {
      const rect = container.getBoundingClientRect()
      const x = clientX - rect.left
      const y = clientY - rect.top
      return hitTestCell(x, y, rect.width, rect.height, stateRef.current)
    }

    const onMove = (e: MouseEvent) => {
      hoverRef.current = toCell(e.clientX, e.clientY)
      const cell = hoverRef.current
      canvas.style.cursor = cell ? "pointer" : "default"
    }
    const onLeave = () => {
      hoverRef.current = null
      canvas.style.cursor = "default"
    }
    const onClick = (e: MouseEvent) => {
      const cell = toCell(e.clientX, e.clientY)
      if (!cell) return
      engine.placeBet(cell.col, cell.row, stakeRef.current)
    }
    const onTouch = (e: TouchEvent) => {
      if (e.changedTouches.length === 0) return
      const t = e.changedTouches[0]
      const cell = toCell(t.clientX, t.clientY)
      if (cell) {
        engine.placeBet(cell.col, cell.row, stakeRef.current)
      }
    }

    canvas.addEventListener("mousemove", onMove)
    canvas.addEventListener("mouseleave", onLeave)
    canvas.addEventListener("click", onClick)
    canvas.addEventListener("touchend", onTouch)
    return () => {
      canvas.removeEventListener("mousemove", onMove)
      canvas.removeEventListener("mouseleave", onLeave)
      canvas.removeEventListener("click", onClick)
      canvas.removeEventListener("touchend", onTouch)
    }
  }, [engine])

  return (
    <div
      ref={containerRef}
      className={className}
      style={{
        position: "relative",
        background: "#1a1a18",
        borderRadius: 12,
        overflow: "hidden",
      }}
    >
      <canvas ref={canvasRef} style={{ display: "block" }} />
    </div>
  )
}

// ── Rendering primitives ────────────────────────────────────────────

type DrawCtx = {
  state: EngineState
  hover: HoverCell
  bursts: ActiveBurst[]
  flashes: ActiveFlash[]
  banner: ActiveBanner | null
  stake: number
}

/** Layout derived from viewport + engine state. */
type Layout = {
  gridLeft: number
  gridTop: number
  gridRight: number
  gridBottom: number
  cellW: number
  cellH: number
  nowX: number
  /** Pixel offset within the current column — advances smoothly with wall-clock */
  scrollOffsetPx: number
  /** Screen pixel for column-start of col index */
  colStartX: (col: number) => number
  /** Screen pixel for row-top of row index, using the deadzone-anchored centerPrice */
  rowTopY: (row: number) => number
  /** Price → y coordinate (within grid bounds) */
  priceToY: (price: number) => number
  /** Range of row indices vertically visible */
  rowMin: number
  rowMax: number
  /** The price the grid is currently centered on (deadzone-lagged) */
  centerPrice: number
}

// Module-level display center so it persists across frames
const displayCenterRef: { value: number | null } = { value: null }

function computeLayout(
  s: EngineState,
  width: number,
  height: number
): Layout | null {
  if (s.spot == null || s.bandHeight === 0) return null

  const horizontalCols = s.config.futureColumns + s.config.historyColumns
  const cellW = width / horizontalCols
  const cellH = height / s.config.visibleRows

  // NOW line at horizontal center
  const nowX = width * (s.config.historyColumns / horizontalCols)

  // Smooth scroll: the fraction of the current column we're into, in pixels
  const intervalMs = s.config.timeIntervalSec * 1000
  const sinceColStart = (s.nowMs - s.originMs) % intervalMs
  const scrollOffsetPx = (sinceColStart / intervalMs) * cellW

  const nowCol = s.nowColumnIndex
  // col=nowCol is currently being "absorbed" into history at the NOW line.
  // Its left edge is at: nowX - scrollOffsetPx
  const colStartX = (col: number): number =>
    nowX - scrollOffsetPx + (col - nowCol) * cellW

  // Deadzone camera: initialize to spot, then lag
  if (displayCenterRef.value == null) {
    displayCenterRef.value = s.spot
  }
  let center = displayCenterRef.value
  const halfViz = (cellH * s.config.visibleRows) / 2
  const priceRangeY = halfViz
  const deadzonePx = priceRangeY * 0.5 // middle 50%
  const offsetPx = ((s.spot - center) / s.bandHeight) * cellH
  if (Math.abs(offsetPx) > deadzonePx) {
    // Lerp center toward spot
    const target = s.spot
    center = center + (target - center) * 0.06
    displayCenterRef.value = center
  }

  const centerY = (height - cellH) / 2 + cellH / 2
  const rowTopY = (row: number): number => {
    const rowCenterPrice = (row + 0.5) * s.bandHeight
    const offset = (rowCenterPrice - center) / s.bandHeight
    return centerY - offset * cellH - cellH / 2
  }
  const priceToY = (price: number): number => {
    const offset = (price - center) / s.bandHeight
    return centerY - offset * cellH
  }

  // Rows visible in viewport
  const rowsHalf = Math.ceil(s.config.visibleRows / 2) + 1
  const centerRow = Math.round(center / s.bandHeight)
  const rowMin = centerRow - rowsHalf
  const rowMax = centerRow + rowsHalf

  return {
    gridLeft: 0,
    gridTop: 0,
    gridRight: width,
    gridBottom: height,
    cellW,
    cellH,
    nowX,
    scrollOffsetPx,
    colStartX,
    rowTopY,
    priceToY,
    rowMin,
    rowMax,
    centerPrice: center,
  }
}

function hitTestCell(
  x: number,
  y: number,
  width: number,
  height: number,
  s: EngineState
): HoverCell {
  const layout = computeLayout(s, width, height)
  if (!layout) return null
  // Must be right of the no-play zone
  const noPlayEdgeX =
    layout.nowX + (s.config.noPlayBuffer + 1) * layout.cellW -
    layout.scrollOffsetPx
  if (x < noPlayEdgeX) return null
  if (x > layout.gridRight) return null

  const nowCol = s.nowColumnIndex
  const col = nowCol + Math.floor((x - layout.nowX + layout.scrollOffsetPx) / layout.cellW)

  // Figure out row from y
  const center = layout.centerPrice
  const centerY = (height - layout.cellH) / 2 + layout.cellH / 2
  const rowsFromCenter = Math.floor((centerY - y) / layout.cellH + 0.5)
  const centerRow = Math.round(center / s.bandHeight)
  const row = centerRow + rowsFromCenter

  // Must be in future range
  if (col < nowCol + s.config.noPlayBuffer + 1) return null
  if (col > nowCol + s.config.futureColumns) return null
  if (!s.cells.has(`${col}:${row}`)) return null

  return { col, row }
}

function draw(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  d: DrawCtx
): void {
  // Background
  ctx.fillStyle = "#1a1a18"
  ctx.fillRect(0, 0, width, height)

  const { state: s } = d
  if (s.spot == null || s.bandHeight === 0) {
    drawWaiting(ctx, width, height)
    return
  }

  const layout = computeLayout(s, width, height)
  if (!layout) return

  drawGridCells(ctx, width, height, d, layout)
  drawPriceLine(ctx, d, layout)
  drawHoverHighlight(ctx, d, layout)
  drawFxEffects(ctx, d, layout)
  drawAssetBadge(ctx, s)
  drawNowLine(ctx, layout, height)
  drawPriceLabel(ctx, d, layout, width)
  drawBanner(ctx, d, width)
}

function drawWaiting(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number
): void {
  ctx.fillStyle = "#b0aea5"
  ctx.font = "500 15px Styrene A, system-ui, sans-serif"
  ctx.textAlign = "center"
  ctx.textBaseline = "middle"
  ctx.fillText("Waiting for price feed…", width / 2, height / 2)
}

function drawGridCells(
  ctx: CanvasRenderingContext2D,
  width: number,
  _height: number,
  d: DrawCtx,
  L: Layout
): void {
  const s = d.state
  const nowCol = s.nowColumnIndex
  const firstCol = nowCol - s.config.historyColumns
  const lastCol = nowCol + s.config.futureColumns

  // Build a quick lookup: col,row -> open/settled position (for chip / overlay)
  const posByCell = new Map<string, Position[]>()
  for (const p of s.positions) {
    const k = `${p.columnIndex}:${p.rowIndex}`
    const arr = posByCell.get(k) ?? []
    arr.push(p)
    posByCell.set(k, arr)
  }

  // Find "hot row" — row index with greatest recent drift direction
  const hotRow = computeHotRow(s)

  for (let col = firstCol; col <= lastCol + 1; col++) {
    const x = L.colStartX(col)
    if (x + L.cellW < 0 || x > width) continue

    const isHistorical = col < nowCol
    const isNow = col === nowCol
    const isNoPlay = col >= nowCol + 1 && col <= nowCol + s.config.noPlayBuffer
    const isFuture = col > nowCol + s.config.noPlayBuffer

    // Fade factor for historical columns
    let fade = 1
    if (isHistorical) {
      const distFromNow = (nowCol - col) + L.scrollOffsetPx / L.cellW
      fade = Math.max(0.1, 1 - distFromNow / (s.config.historyColumns + 0.5))
    }

    for (let row = L.rowMin; row <= L.rowMax; row++) {
      const cy = L.rowTopY(row)
      if (cy + L.cellH < 0 || cy > _height) continue
      const key = `${col}:${row}`
      const pricing = s.cells.get(key)
      const posList = posByCell.get(key) ?? []
      const hasOpenPos = posList.some((p) => p.status === "OPEN")
      const hasWon = posList.some((p) => p.status === "WON")
      const hasLost = posList.some((p) => p.status === "LOST")

      // Background
      let bg = "#26241f"
      if (pricing && (isFuture || isNoPlay || isNow)) {
        bg = heatColorFor(pricing.multiplier)
      }
      ctx.globalAlpha = fade
      ctx.fillStyle = bg
      ctx.fillRect(x + 1, cy + 1, L.cellW - 2, L.cellH - 2)

      // Desaturate no-play columns
      if (isNoPlay) {
        ctx.fillStyle = "rgba(26, 26, 24, 0.4)"
        ctx.fillRect(x + 1, cy + 1, L.cellW - 2, L.cellH - 2)
      }

      // Border
      ctx.strokeStyle = "rgba(250, 249, 245, 0.06)"
      ctx.lineWidth = 1
      ctx.strokeRect(x + 0.5, cy + 0.5, L.cellW - 1, L.cellH - 1)

      // Hot row hint (only on future cells, purely cosmetic)
      if (hotRow !== null && row === hotRow && isFuture) {
        ctx.strokeStyle = "rgba(217, 119, 87, 0.35)"
        ctx.lineWidth = 1
        ctx.strokeRect(x + 1.5, cy + 1.5, L.cellW - 3, L.cellH - 3)
      }

      // Text — multiplier + payout
      if (pricing && (isFuture || isNoPlay) && L.cellW > 42 && L.cellH > 28) {
        ctx.fillStyle = isNoPlay ? "rgba(250, 249, 245, 0.4)" : "#faf9f5"
        ctx.font = "500 13px Styrene A, system-ui, sans-serif"
        ctx.textAlign = "center"
        ctx.textBaseline = "middle"
        ctx.fillText(
          `${pricing.multiplier.toFixed(2)}x`,
          x + L.cellW / 2,
          cy + L.cellH / 2 - 8
        )
        if (L.cellH > 44) {
          ctx.fillStyle = isNoPlay
            ? "rgba(120, 140, 93, 0.45)"
            : "rgba(120, 140, 93, 0.9)"
          ctx.font = "400 11px Styrene A, system-ui, sans-serif"
          ctx.fillText(
            `${(pricing.multiplier * d.stake).toFixed(2)}`,
            x + L.cellW / 2,
            cy + L.cellH / 2 + 9
          )
        }
      }

      // Open-position gold border
      if (hasOpenPos) {
        ctx.globalAlpha = fade
        ctx.strokeStyle = "#e5c04a"
        ctx.lineWidth = 2
        ctx.strokeRect(x + 2, cy + 2, L.cellW - 4, L.cellH - 4)
      }

      // Settled result overlays (historical zone)
      if (isHistorical && (hasWon || hasLost)) {
        if (hasWon) {
          // Green border + check
          ctx.strokeStyle = "rgba(120, 140, 93, 0.95)"
          ctx.lineWidth = 2
          ctx.strokeRect(x + 2, cy + 2, L.cellW - 4, L.cellH - 4)
          ctx.fillStyle = "rgba(120, 140, 93, 0.9)"
          ctx.font = "700 18px Styrene A, system-ui, sans-serif"
          ctx.textAlign = "center"
          ctx.textBaseline = "middle"
          ctx.fillText("✓", x + L.cellW / 2, cy + L.cellH / 2 - 4)
          const wonPos = posList.find((p) => p.status === "WON")
          if (wonPos && L.cellH > 36) {
            ctx.fillStyle = "#a0b67f"
            ctx.font = "500 10px Styrene A, system-ui, sans-serif"
            ctx.fillText(
              `+${(wonPos.actualPayout ?? 0).toFixed(2)}`,
              x + L.cellW / 2,
              cy + L.cellH / 2 + 12
            )
          }
        } else if (hasLost) {
          ctx.fillStyle = "rgba(181, 51, 51, 0.22)"
          ctx.fillRect(x + 1, cy + 1, L.cellW - 2, L.cellH - 2)
          ctx.fillStyle = "rgba(255, 255, 255, 0.35)"
          ctx.font = "600 16px Styrene A, system-ui, sans-serif"
          ctx.textAlign = "center"
          ctx.textBaseline = "middle"
          ctx.fillText("✗", x + L.cellW / 2, cy + L.cellH / 2)
        }
      }

      // Stake chip (bottom-left corner)
      if (posList.length > 0) {
        const totalStake = posList.reduce((a, b) => a + b.stake, 0)
        drawStakeChip(ctx, x + 6, cy + L.cellH - 10, totalStake)
      }

      ctx.globalAlpha = 1
    }
  }
}

function drawStakeChip(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  amount: number
): void {
  const r = 9
  ctx.fillStyle = "#e5c04a"
  ctx.beginPath()
  ctx.arc(x, y, r, 0, Math.PI * 2)
  ctx.fill()
  ctx.strokeStyle = "rgba(0, 0, 0, 0.25)"
  ctx.lineWidth = 1
  ctx.stroke()

  ctx.fillStyle = "#1a1a18"
  ctx.font = "700 9px Styrene A, system-ui, sans-serif"
  ctx.textAlign = "center"
  ctx.textBaseline = "middle"
  const label = amount < 1 ? amount.toFixed(2) : amount.toFixed(0)
  ctx.fillText(label, x, y + 0.5)
}

function drawPriceLine(
  ctx: CanvasRenderingContext2D,
  d: DrawCtx,
  L: Layout
): void {
  const s = d.state
  if (s.ticks.length === 0) return

  ctx.strokeStyle = "rgba(120, 140, 93, 0.95)"
  ctx.lineWidth = 2
  ctx.beginPath()
  let started = false
  for (const t of s.ticks) {
    const msFromNow = s.nowMs - t.epochMs
    const x = L.nowX - (msFromNow / (s.config.timeIntervalSec * 1000)) * L.cellW
    if (x < 0) continue
    const y = L.priceToY(t.price)
    if (!started) {
      ctx.moveTo(x, y)
      started = true
    } else {
      ctx.lineTo(x, y)
    }
  }
  ctx.stroke()

  // Dashed connector from last tick to NOW line
  const last = s.ticks[s.ticks.length - 1]
  if (last) {
    const lastMsAgo = s.nowMs - last.epochMs
    const lastX =
      L.nowX - (lastMsAgo / (s.config.timeIntervalSec * 1000)) * L.cellW
    const lastY = L.priceToY(last.price)
    ctx.setLineDash([3, 4])
    ctx.strokeStyle = "rgba(120, 140, 93, 0.5)"
    ctx.lineWidth = 1.5
    ctx.beginPath()
    ctx.moveTo(lastX, lastY)
    ctx.lineTo(L.nowX, lastY)
    ctx.stroke()
    ctx.setLineDash([])

    // Price dot at tip
    ctx.fillStyle = "#a0b67f"
    ctx.beginPath()
    ctx.arc(L.nowX, lastY, 4, 0, Math.PI * 2)
    ctx.fill()
  }
}

function drawHoverHighlight(
  ctx: CanvasRenderingContext2D,
  d: DrawCtx,
  L: Layout
): void {
  if (!d.hover) return
  const x = L.colStartX(d.hover.col)
  const y = L.rowTopY(d.hover.row)
  ctx.strokeStyle = "#d97757"
  ctx.lineWidth = 2
  ctx.strokeRect(x + 1, y + 1, L.cellW - 2, L.cellH - 2)
}

function drawFxEffects(
  ctx: CanvasRenderingContext2D,
  d: DrawCtx,
  L: Layout
): void {
  const now = Date.now()

  // Win bursts
  for (const b of d.bursts) {
    const age = now - b.startedMs
    if (age > BURST_MS) continue
    const t = age / BURST_MS
    const x = L.colStartX(b.col) + L.cellW / 2
    const y = L.rowTopY(b.row) + L.cellH / 2

    // Flash background
    if (t < 0.4) {
      ctx.globalAlpha = (1 - t / 0.4) * 0.55
      ctx.fillStyle = "#788c5d"
      ctx.fillRect(
        L.colStartX(b.col),
        L.rowTopY(b.row),
        L.cellW,
        L.cellH
      )
    }

    // Radial rays
    const rays = 8
    const radius = 12 + t * (L.cellW * 0.7)
    ctx.globalAlpha = Math.max(0, 1 - t)
    ctx.strokeStyle = "#a0b67f"
    ctx.lineWidth = 2
    for (let i = 0; i < rays; i++) {
      const ang = (i / rays) * Math.PI * 2
      const x0 = x + Math.cos(ang) * (radius * 0.4)
      const y0 = y + Math.sin(ang) * (radius * 0.4)
      const x1 = x + Math.cos(ang) * radius
      const y1 = y + Math.sin(ang) * radius
      ctx.beginPath()
      ctx.moveTo(x0, y0)
      ctx.lineTo(x1, y1)
      ctx.stroke()
    }

    // Floating payout
    ctx.globalAlpha = Math.max(0, 1 - t)
    ctx.fillStyle = "#a0b67f"
    ctx.font = "700 14px Styrene A, system-ui, sans-serif"
    ctx.textAlign = "center"
    ctx.textBaseline = "middle"
    ctx.fillText(`+${b.payout.toFixed(2)} USDT`, x, y - 24 - t * 30)
    ctx.globalAlpha = 1
  }

  // Loss flashes
  for (const f of d.flashes) {
    const age = now - f.startedMs
    if (age > FLASH_MS) continue
    const t = age / FLASH_MS
    ctx.globalAlpha = (1 - t) * 0.4
    ctx.fillStyle = "#b53333"
    ctx.fillRect(
      L.colStartX(f.col),
      L.rowTopY(f.row),
      L.cellW,
      L.cellH
    )
    ctx.globalAlpha = 1
  }
}

function drawAssetBadge(ctx: CanvasRenderingContext2D, s: EngineState): void {
  const pad = 12
  const x = pad
  const y = pad
  const w = 130
  const h = 32
  ctx.fillStyle = "rgba(26, 26, 24, 0.75)"
  ctx.strokeStyle = "rgba(250, 249, 245, 0.15)"
  ctx.lineWidth = 1
  roundRect(ctx, x, y, w, h, 8)
  ctx.fill()
  ctx.stroke()

  ctx.fillStyle = "#faf9f5"
  ctx.font = "700 13px Styrene A, system-ui, sans-serif"
  ctx.textAlign = "left"
  ctx.textBaseline = "middle"
  ctx.fillText(s.symbol, x + 10, y + h / 2 - 1)
  ctx.fillStyle = "rgba(217, 119, 87, 0.9)"
  ctx.font = "500 9px Styrene A, system-ui, sans-serif"
  ctx.fillText("SYNTHETIC", x + 70, y + h / 2 - 1)
}

function drawNowLine(
  ctx: CanvasRenderingContext2D,
  L: Layout,
  height: number
): void {
  ctx.strokeStyle = "rgba(250, 249, 245, 0.35)"
  ctx.lineWidth = 1
  ctx.setLineDash([4, 4])
  ctx.beginPath()
  ctx.moveTo(L.nowX, 0)
  ctx.lineTo(L.nowX, height)
  ctx.stroke()
  ctx.setLineDash([])

  // NOW label
  ctx.fillStyle = "rgba(250, 249, 245, 0.65)"
  ctx.font = "600 10px Styrene A, system-ui, sans-serif"
  ctx.textAlign = "center"
  ctx.textBaseline = "top"
  ctx.fillText("NOW", L.nowX, 6)
}

function drawPriceLabel(
  ctx: CanvasRenderingContext2D,
  d: DrawCtx,
  L: Layout,
  width: number
): void {
  if (d.state.spot == null) return
  const price = d.state.spot
  const y = L.priceToY(price)
  const label = price.toFixed(2)
  ctx.font = "600 12px Styrene A, system-ui, sans-serif"
  const metrics = ctx.measureText(label)
  const w = metrics.width + 16
  const h = 22
  const x = width - w - 8
  ctx.fillStyle = "#d97757"
  roundRect(ctx, x, y - h / 2, w, h, 6)
  ctx.fill()
  ctx.fillStyle = "#faf9f5"
  ctx.textAlign = "center"
  ctx.textBaseline = "middle"
  ctx.fillText(label, x + w / 2, y)
}

function drawBanner(
  ctx: CanvasRenderingContext2D,
  d: DrawCtx,
  width: number
): void {
  if (!d.banner) return
  const age = Date.now() - d.banner.startedMs
  if (age > BANNER_MS) return

  // Enter / hold / exit easing
  let alpha = 1
  if (age < 120) alpha = age / 120
  else if (age > BANNER_MS - 400) alpha = Math.max(0, (BANNER_MS - age) / 400)

  const h = 44
  const label = d.banner.text
  ctx.font = "600 14px Styrene A, system-ui, sans-serif"
  const w = Math.min(width - 32, ctx.measureText(label).width + 40)
  const x = (width - w) / 2
  const y = 52

  ctx.globalAlpha = alpha * 0.95
  if (d.banner.tone === "win") {
    ctx.fillStyle = "rgba(66, 80, 44, 0.95)"
    ctx.strokeStyle = "rgba(160, 182, 127, 0.9)"
  } else if (d.banner.tone === "loss") {
    ctx.fillStyle = "rgba(70, 20, 20, 0.95)"
    ctx.strokeStyle = "rgba(255, 80, 80, 0.9)"
  } else {
    ctx.fillStyle = "rgba(26, 26, 24, 0.9)"
    ctx.strokeStyle = "rgba(250, 249, 245, 0.4)"
  }
  ctx.lineWidth = 1
  roundRect(ctx, x, y, w, h, 10)
  ctx.fill()
  ctx.stroke()

  ctx.globalAlpha = alpha
  ctx.fillStyle = "#faf9f5"
  ctx.textAlign = "center"
  ctx.textBaseline = "middle"
  ctx.fillText(label, width / 2, y + h / 2)
  ctx.globalAlpha = 1
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
): void {
  const rr = Math.min(r, w / 2, h / 2)
  ctx.beginPath()
  ctx.moveTo(x + rr, y)
  ctx.arcTo(x + w, y, x + w, y + h, rr)
  ctx.arcTo(x + w, y + h, x, y + h, rr)
  ctx.arcTo(x, y + h, x, y, rr)
  ctx.arcTo(x, y, x + w, y, rr)
  ctx.closePath()
}

/** Detect the row the market has drifted toward most strongly in the last 10s.
 * Returns null if there's no clear direction. */
function computeHotRow(s: EngineState): number | null {
  if (s.ticks.length < 6 || s.bandHeight === 0) return null
  const window = 10_000
  const cutoff = s.nowMs - window
  const recent = s.ticks.filter((t) => t.epochMs >= cutoff)
  if (recent.length < 4) return null
  const first = recent[0].price
  const last = recent[recent.length - 1].price
  const drift = last - first
  // Only highlight if drift exceeds half a row
  if (Math.abs(drift) < s.bandHeight * 0.5) return null
  const targetPrice = last + drift * 1.5
  return Math.round(targetPrice / s.bandHeight)
}
