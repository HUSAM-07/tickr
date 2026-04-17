"use client"

import { useEffect, useRef } from "react"
import type { SpikeEngine, EngineState, FxEvent } from "@/lib/spike/engine"
import { probSpikeWithin } from "@/lib/spike/poisson"

type Props = {
  engine: SpikeEngine
  className?: string
}

type ActiveSpikeFx = { direction: "up" | "down"; startedMs: number }
type ActiveWinFx = { payout: number; startedMs: number }
type ActiveLossFx = { startedMs: number }
type ActiveNearMissFx = { missedBy: number; startedMs: number }

const SPIKE_FX_MS = 1200
const WIN_FX_MS = 1400
const LOSS_FX_MS = 700
const NEAR_MISS_FX_MS = 2000

export function SpikeCanvas({ engine, className }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const stateRef = useRef<EngineState>(engine.getState())
  const spikesRef = useRef<ActiveSpikeFx[]>([])
  const winsRef = useRef<ActiveWinFx[]>([])
  const lossesRef = useRef<ActiveLossFx[]>([])
  const nearMissRef = useRef<ActiveNearMissFx | null>(null)

  useEffect(() => {
    const unsubState = engine.onChange((s) => {
      stateRef.current = s
    })
    const unsubFx = engine.onFx((e: FxEvent) => {
      if (e.kind === "SPIKE") {
        spikesRef.current.push({ direction: e.direction, startedMs: e.atMs })
      } else if (e.kind === "WIN") {
        winsRef.current.push({ payout: e.payout, startedMs: e.atMs })
      } else if (e.kind === "LOSS") {
        lossesRef.current.push({ startedMs: e.atMs })
      } else if (e.kind === "NEAR_MISS") {
        nearMissRef.current = { missedBy: e.missedBy, startedMs: e.atMs }
      }
    })
    return () => {
      unsubState()
      unsubFx()
    }
  }, [engine])

  useEffect(() => {
    const canvas = canvasRef.current
    const container = containerRef.current
    if (!canvas || !container) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    let rafId = 0
    const frame = () => {
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
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      draw(ctx, rect.width, rect.height, {
        state: stateRef.current,
        spikes: spikesRef.current,
        wins: winsRef.current,
        losses: lossesRef.current,
        nearMiss: nearMissRef.current,
      })

      const now = Date.now()
      spikesRef.current = spikesRef.current.filter(
        (s) => now - s.startedMs < SPIKE_FX_MS
      )
      winsRef.current = winsRef.current.filter(
        (w) => now - w.startedMs < WIN_FX_MS
      )
      lossesRef.current = lossesRef.current.filter(
        (l) => now - l.startedMs < LOSS_FX_MS
      )
      if (
        nearMissRef.current &&
        now - nearMissRef.current.startedMs > NEAR_MISS_FX_MS
      ) {
        nearMissRef.current = null
      }
      rafId = requestAnimationFrame(frame)
    }
    rafId = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(rafId)
  }, [])

  return (
    <div
      ref={containerRef}
      className={className}
      style={{
        position: "relative",
        background: "#121211",
        borderRadius: 12,
        overflow: "hidden",
      }}
    >
      <canvas ref={canvasRef} style={{ display: "block" }} />
    </div>
  )
}

// ── Drawing ─────────────────────────────────────────────────────────

type DrawCtx = {
  state: EngineState
  spikes: ActiveSpikeFx[]
  wins: ActiveWinFx[]
  losses: ActiveLossFx[]
  nearMiss: ActiveNearMissFx | null
}

function draw(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  d: DrawCtx
): void {
  const s = d.state

  // Screen-shake on spike (first 300ms)
  const now = Date.now()
  let shakeX = 0
  let shakeY = 0
  for (const sp of d.spikes) {
    const age = now - sp.startedMs
    if (age < 300) {
      const k = 1 - age / 300
      shakeX += (Math.random() - 0.5) * 8 * k
      shakeY += (Math.random() - 0.5) * 6 * k
    }
  }
  ctx.save()
  ctx.translate(shakeX, shakeY)

  // Background flash — brief colored overlay on spike
  drawBackground(ctx, w, h, d)

  // Asset badge (top-left)
  drawAssetBadge(ctx, s)

  // Sparkline strip across the top
  drawSparkline(ctx, w, h, s)

  // Central pressure gauge
  drawPressureGauge(ctx, w, h, s, d)

  // Round-state readouts (below gauge)
  drawRoundState(ctx, w, h, s)

  // Spike history strip (bottom)
  drawHistoryStrip(ctx, w, h, s)

  // Win / loss / near-miss overlays
  drawOverlays(ctx, w, h, d)

  ctx.restore()
}

function drawBackground(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  d: DrawCtx
): void {
  ctx.fillStyle = "#121211"
  ctx.fillRect(0, 0, w, h)

  const now = Date.now()
  for (const sp of d.spikes) {
    const age = now - sp.startedMs
    if (age > 500) continue
    const k = 1 - age / 500
    const color = sp.direction === "up" ? "120, 140, 93" : "217, 119, 87"
    ctx.fillStyle = `rgba(${color}, ${0.25 * k})`
    ctx.fillRect(0, 0, w, h)
  }
  for (const win of d.wins) {
    const age = now - win.startedMs
    if (age > 400) continue
    ctx.fillStyle = `rgba(120, 140, 93, ${0.2 * (1 - age / 400)})`
    ctx.fillRect(0, 0, w, h)
  }
}

function drawAssetBadge(ctx: CanvasRenderingContext2D, s: EngineState): void {
  const pad = 14
  const x = pad
  const y = pad
  const h = 34
  const padX = 12
  const gap = 10

  ctx.textBaseline = "middle"
  ctx.textAlign = "left"
  ctx.font = "700 14px Styrene A, system-ui, sans-serif"
  const label = s.asset.displayName
  const labelW = ctx.measureText(label).width

  ctx.font = "600 9px Styrene A, system-ui, sans-serif"
  const tag = s.asset.direction === "up" ? "BOOM" : "CRASH"
  const tagW = ctx.measureText(tag).width

  const w = padX + labelW + gap + tagW + padX + 6

  ctx.fillStyle = "rgba(26, 26, 24, 0.85)"
  ctx.strokeStyle = "rgba(250, 249, 245, 0.15)"
  ctx.lineWidth = 1
  roundRect(ctx, x, y, w, h, 8)
  ctx.fill()
  ctx.stroke()

  ctx.fillStyle = "#faf9f5"
  ctx.font = "700 14px Styrene A, system-ui, sans-serif"
  ctx.fillText(label, x + padX, y + h / 2 + 0.5)

  ctx.fillStyle =
    s.asset.direction === "up" ? "rgba(160, 182, 127, 0.95)" : "rgba(217, 119, 87, 0.95)"
  ctx.font = "700 9px Styrene A, system-ui, sans-serif"
  ctx.fillText(tag, x + padX + labelW + gap, y + h / 2 + 0.5)
}

function drawSparkline(
  ctx: CanvasRenderingContext2D,
  w: number,
  _h: number,
  s: EngineState
): void {
  if (s.sparkline.length < 2) return
  const top = 60
  const height = 70
  const left = 14
  const right = w - 14
  const width = right - left

  let min = Infinity
  let max = -Infinity
  for (const p of s.sparkline) {
    if (p.price < min) min = p.price
    if (p.price > max) max = p.price
  }
  const range = Math.max(1e-6, max - min)

  // Background
  ctx.fillStyle = "rgba(26, 26, 24, 0.55)"
  roundRect(ctx, left, top, width, height, 8)
  ctx.fill()

  // Path
  ctx.strokeStyle = "rgba(176, 174, 165, 0.85)"
  ctx.lineWidth = 1.5
  ctx.beginPath()
  const n = s.sparkline.length
  for (let i = 0; i < n; i++) {
    const p = s.sparkline[i]
    const x = left + (i / (n - 1)) * width
    const y = top + height - ((p.price - min) / range) * (height - 10) - 5
    if (i === 0) ctx.moveTo(x, y)
    else ctx.lineTo(x, y)
  }
  ctx.stroke()

  // Tip dot
  const last = s.sparkline[n - 1]
  const x = left + width
  const y = top + height - ((last.price - min) / range) * (height - 10) - 5
  ctx.fillStyle = s.asset.direction === "up" ? "#a0b67f" : "#d97757"
  ctx.beginPath()
  ctx.arc(x - 2, y, 3.5, 0, Math.PI * 2)
  ctx.fill()

  // Price label
  ctx.fillStyle = "rgba(250, 249, 245, 0.75)"
  ctx.font = "500 11px Styrene A, system-ui, sans-serif"
  ctx.textAlign = "right"
  ctx.textBaseline = "top"
  ctx.fillText(last.price.toFixed(4), right - 6, top + 6)
}

function drawPressureGauge(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  s: EngineState,
  d: DrawCtx
): void {
  const cx = w / 2
  const cy = h / 2 + 10
  const radius = Math.min(w, h) * 0.22

  // Pressure from the Poisson model: probability that a spike lands on the
  // next tick, normalized by the highest shown pressure (probability over a
  // ~20-tick horizon) so the gauge has meaningful range.
  const horizon = 20
  const pressure = probSpikeWithin(horizon, s.asset.avgInterval)
  // Elapsed-since-last-spike boost: memory-less Poisson says this shouldn't
  // affect real odds, but human anticipation DOES — we mirror that visually
  // by nudging the gauge upward as time passes, capped at the real pressure.
  const ticksSince = s.lastSpikeTickCount
    ? s.tickCount - s.lastSpikeTickCount
    : s.tickCount - s.watchStartTickCount
  const anticipation = Math.min(1, ticksSince / s.asset.avgInterval)
  const gaugeValue = 0.2 + pressure * 0.2 + anticipation * 0.6

  // Gauge arc background
  const startAngle = Math.PI * 0.8
  const endAngle = Math.PI * 2.2
  ctx.strokeStyle = "rgba(250, 249, 245, 0.08)"
  ctx.lineWidth = 14
  ctx.beginPath()
  ctx.arc(cx, cy, radius, startAngle, endAngle)
  ctx.stroke()

  // Gauge filled arc
  const fillEnd = startAngle + (endAngle - startAngle) * gaugeValue
  const direction = s.asset.direction
  const gradient = ctx.createLinearGradient(
    cx - radius,
    cy,
    cx + radius,
    cy
  )
  if (direction === "up") {
    gradient.addColorStop(0, "#a0b67f")
    gradient.addColorStop(1, "#d97757")
  } else {
    gradient.addColorStop(0, "#6a9bcc")
    gradient.addColorStop(1, "#d97757")
  }
  ctx.strokeStyle = gradient
  ctx.lineWidth = 14
  ctx.lineCap = "round"
  ctx.beginPath()
  ctx.arc(cx, cy, radius, startAngle, fillEnd)
  ctx.stroke()
  ctx.lineCap = "butt"

  // Glow effect on high pressure
  if (anticipation > 0.7) {
    ctx.strokeStyle = `rgba(217, 119, 87, ${(anticipation - 0.7) * 2})`
    ctx.lineWidth = 22
    ctx.lineCap = "round"
    ctx.beginPath()
    ctx.arc(cx, cy, radius, startAngle, fillEnd)
    ctx.stroke()
    ctx.lineCap = "butt"
  }

  // Center label
  ctx.fillStyle = "rgba(250, 249, 245, 0.55)"
  ctx.font = "500 11px Styrene A, system-ui, sans-serif"
  ctx.textAlign = "center"
  ctx.textBaseline = "middle"
  ctx.fillText("TICKS SINCE SPIKE", cx, cy - 26)

  const ticksLabel = s.lastSpikeTickCount != null ? `${ticksSince}` : `${ticksSince}`
  ctx.fillStyle = "#faf9f5"
  ctx.font = "500 42px Tiempos Headline, ui-serif, Georgia, serif"
  ctx.fillText(ticksLabel, cx, cy + 4)

  ctx.fillStyle = "rgba(250, 249, 245, 0.4)"
  ctx.font = "500 11px Styrene A, system-ui, sans-serif"
  ctx.fillText(`avg ${s.asset.avgInterval}`, cx, cy + 36)

  // Active-bet window indicator — a thin arc overlay on the gauge showing
  // where the bet window ends.
  if (s.activeBet) {
    const elapsed = s.tickCount - s.activeBet.placedAtTickCount
    const windowFrac = Math.min(1, elapsed / s.activeBet.windowTicks)
    const bEnd = startAngle + (endAngle - startAngle) * windowFrac
    ctx.strokeStyle = "#e5c04a"
    ctx.lineWidth = 4
    ctx.beginPath()
    ctx.arc(cx, cy, radius - 14, startAngle, bEnd)
    ctx.stroke()
  }

  // Spike emphasis — concentric rings when a spike is fresh
  const now = Date.now()
  for (const sp of d.spikes) {
    const age = now - sp.startedMs
    if (age > 700) continue
    const t = age / 700
    ctx.strokeStyle = `rgba(217, 119, 87, ${1 - t})`
    ctx.lineWidth = 3
    ctx.beginPath()
    ctx.arc(cx, cy, radius + 10 + t * 80, 0, Math.PI * 2)
    ctx.stroke()
  }
}

function drawRoundState(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  s: EngineState
): void {
  const y = h - 120
  ctx.textAlign = "center"
  ctx.textBaseline = "middle"

  if (s.activeBet) {
    const elapsed = s.tickCount - s.activeBet.placedAtTickCount
    const remaining = Math.max(0, s.activeBet.windowTicks - elapsed)
    ctx.fillStyle = "#e5c04a"
    ctx.font = "700 13px Styrene A, system-ui, sans-serif"
    ctx.fillText(
      `ARMED · ${s.activeBet.lockedMultiplier.toFixed(2)}x`,
      w / 2,
      y
    )
    ctx.fillStyle = "rgba(250, 249, 245, 0.6)"
    ctx.font = "500 12px Styrene A, system-ui, sans-serif"
    ctx.fillText(`${remaining} tick window`, w / 2, y + 22)
  } else {
    ctx.fillStyle = "rgba(250, 249, 245, 0.55)"
    ctx.font = "500 12px Styrene A, system-ui, sans-serif"
    ctx.fillText("Select a bet to arm a round", w / 2, y)
  }
}

function drawHistoryStrip(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  s: EngineState
): void {
  if (s.spikeGaps.length === 0) return
  const strip = {
    left: 14,
    right: w - 14,
    top: h - 46,
    bottom: h - 14,
  }
  const width = strip.right - strip.left
  const height = strip.bottom - strip.top

  ctx.fillStyle = "rgba(26, 26, 24, 0.55)"
  roundRect(ctx, strip.left, strip.top, width, height, 6)
  ctx.fill()

  ctx.fillStyle = "rgba(250, 249, 245, 0.45)"
  ctx.font = "500 10px Styrene A, system-ui, sans-serif"
  ctx.textAlign = "left"
  ctx.textBaseline = "top"
  ctx.fillText("RECENT SPIKE GAPS (ticks)", strip.left + 8, strip.top + 4)

  // Bars
  const n = s.spikeGaps.length
  const maxGap = Math.max(s.asset.avgInterval * 1.5, ...s.spikeGaps)
  const bw = (width - 16) / n
  for (let i = 0; i < n; i++) {
    const g = s.spikeGaps[i]
    const bh = Math.max(2, (g / maxGap) * (height - 22))
    const x = strip.left + 8 + i * bw
    const y = strip.bottom - bh - 4
    const hot = g < s.asset.avgInterval * 0.7
    ctx.fillStyle = hot ? "#d97757" : "rgba(176, 174, 165, 0.75)"
    ctx.fillRect(x, y, bw - 2, bh)
  }

  // Average line
  const avgY =
    strip.bottom -
    (s.asset.avgInterval / maxGap) * (height - 22) -
    4
  ctx.strokeStyle = "rgba(217, 119, 87, 0.5)"
  ctx.setLineDash([3, 3])
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(strip.left + 8, avgY)
  ctx.lineTo(strip.right - 8, avgY)
  ctx.stroke()
  ctx.setLineDash([])
}

function drawOverlays(
  ctx: CanvasRenderingContext2D,
  w: number,
  _h: number,
  d: DrawCtx
): void {
  const now = Date.now()

  // WIN banner
  for (const win of d.wins) {
    const age = now - win.startedMs
    if (age > WIN_FX_MS) continue
    let alpha = 1
    if (age < 120) alpha = age / 120
    else if (age > WIN_FX_MS - 400) alpha = Math.max(0, (WIN_FX_MS - age) / 400)

    const label = `+${win.payout.toFixed(2)} USDT`
    ctx.font = "700 22px Styrene A, system-ui, sans-serif"
    const labelW = ctx.measureText(label).width
    const bw = labelW + 60
    const bh = 56
    const bx = (w - bw) / 2
    const by = 90

    ctx.globalAlpha = alpha * 0.95
    ctx.fillStyle = "rgba(50, 70, 30, 0.94)"
    ctx.strokeStyle = "rgba(160, 182, 127, 0.95)"
    ctx.lineWidth = 1.5
    roundRect(ctx, bx, by, bw, bh, 12)
    ctx.fill()
    ctx.stroke()
    ctx.fillStyle = "#faf9f5"
    ctx.textAlign = "center"
    ctx.textBaseline = "middle"
    ctx.font = "500 11px Styrene A, system-ui, sans-serif"
    ctx.fillText("SPIKE HIT", w / 2, by + 16)
    ctx.font = "700 22px Styrene A, system-ui, sans-serif"
    ctx.fillText(label, w / 2, by + 36)
    ctx.globalAlpha = 1
  }

  // LOSS banner
  for (const loss of d.losses) {
    const age = now - loss.startedMs
    if (age > LOSS_FX_MS) continue
    const alpha = Math.max(0, 1 - age / LOSS_FX_MS)
    ctx.globalAlpha = alpha * 0.85
    ctx.fillStyle = "rgba(70, 20, 20, 0.9)"
    ctx.strokeStyle = "rgba(217, 119, 87, 0.6)"
    ctx.lineWidth = 1.5
    const bx = (w - 140) / 2
    const by = 90
    roundRect(ctx, bx, by, 140, 36, 10)
    ctx.fill()
    ctx.stroke()
    ctx.fillStyle = "#faf9f5"
    ctx.textAlign = "center"
    ctx.textBaseline = "middle"
    ctx.font = "500 13px Styrene A, system-ui, sans-serif"
    ctx.fillText("No spike yet.", w / 2, by + 18)
    ctx.globalAlpha = 1
  }

  // Near-miss overlay
  if (d.nearMiss) {
    const age = now - d.nearMiss.startedMs
    if (age < NEAR_MISS_FX_MS) {
      let alpha = 1
      if (age < 150) alpha = age / 150
      else if (age > NEAR_MISS_FX_MS - 500)
        alpha = Math.max(0, (NEAR_MISS_FX_MS - age) / 500)
      ctx.globalAlpha = alpha * 0.9
      const label = `So close — missed by ${d.nearMiss.missedBy} tick${d.nearMiss.missedBy === 1 ? "" : "s"}`
      ctx.font = "600 13px Styrene A, system-ui, sans-serif"
      const labelW = ctx.measureText(label).width
      const bw = labelW + 40
      const bh = 36
      const bx = (w - bw) / 2
      const by = 150
      ctx.fillStyle = "rgba(26, 26, 24, 0.9)"
      ctx.strokeStyle = "rgba(229, 192, 74, 0.7)"
      ctx.lineWidth = 1
      roundRect(ctx, bx, by, bw, bh, 8)
      ctx.fill()
      ctx.stroke()
      ctx.fillStyle = "#e5c04a"
      ctx.textAlign = "center"
      ctx.textBaseline = "middle"
      ctx.fillText(label, w / 2, by + bh / 2 + 0.5)
      ctx.globalAlpha = 1
    }
  }
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
