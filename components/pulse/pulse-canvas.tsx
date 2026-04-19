"use client"

import { useEffect, useRef } from "react"
import type { PulseEngine, EngineState, FxEvent } from "@/lib/pulse/engine"
import type { BadgeType } from "@/lib/pulse/types"
import { TEMPO_CONFIG } from "@/lib/pulse/types"

type Props = {
  engine: PulseEngine
  className?: string
}

type ActiveHitFx = { direction: "CALL" | "PUT"; streak: number; startedMs: number }
type ActiveBadgeFx = { badge: BadgeType; streak: number; startedMs: number }
type ActiveHeadshotFx = { price: number; startedMs: number }
type ActiveBustFx = { startedMs: number }
type ActiveExtractFx = { payout: number; startedMs: number }

const HIT_FX_MS = 600
const BADGE_FX_MS = 2400
const HEADSHOT_FX_MS = 1200
const BUST_FX_MS = 1000
const EXTRACT_FX_MS = 1400

export function PulseCanvas({ engine, className }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const stateRef = useRef<EngineState>(engine.getState())
  const hitsRef = useRef<ActiveHitFx[]>([])
  const badgesRef = useRef<ActiveBadgeFx[]>([])
  const headshotsRef = useRef<ActiveHeadshotFx[]>([])
  const bustsRef = useRef<ActiveBustFx[]>([])
  const extractsRef = useRef<ActiveExtractFx[]>([])

  useEffect(() => {
    const unsubState = engine.onChange((s) => {
      stateRef.current = s
    })
    const unsubFx = engine.onFx((e: FxEvent) => {
      switch (e.kind) {
        case "HIT":
          hitsRef.current.push({ direction: e.direction, streak: e.streak, startedMs: e.atMs })
          break
        case "STREAK_BADGE":
          badgesRef.current.push({ badge: e.badge, streak: e.streak, startedMs: e.atMs })
          break
        case "HEADSHOT":
          headshotsRef.current.push({ price: e.price, startedMs: e.atMs })
          break
        case "LOSS_BUST":
        case "TIMEOUT_BUST":
          bustsRef.current.push({ startedMs: e.atMs })
          break
        case "WIN_EXTRACT":
          extractsRef.current.push({ payout: e.payout, startedMs: e.atMs })
          break
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
        hits: hitsRef.current,
        badges: badgesRef.current,
        headshots: headshotsRef.current,
        busts: bustsRef.current,
        extracts: extractsRef.current,
      })

      // Drain expired FX
      const now = Date.now()
      hitsRef.current = hitsRef.current.filter((h) => now - h.startedMs < HIT_FX_MS)
      badgesRef.current = badgesRef.current.filter((b) => now - b.startedMs < BADGE_FX_MS)
      headshotsRef.current = headshotsRef.current.filter((h) => now - h.startedMs < HEADSHOT_FX_MS)
      bustsRef.current = bustsRef.current.filter((b) => now - b.startedMs < BUST_FX_MS)
      extractsRef.current = extractsRef.current.filter((e) => now - e.startedMs < EXTRACT_FX_MS)

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
  hits: ActiveHitFx[]
  badges: ActiveBadgeFx[]
  headshots: ActiveHeadshotFx[]
  busts: ActiveBustFx[]
  extracts: ActiveExtractFx[]
}

function draw(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  d: DrawCtx
): void {
  const s = d.state
  const now = Date.now()

  // Screen-shake on bust
  let shakeX = 0
  let shakeY = 0
  for (const b of d.busts) {
    const age = now - b.startedMs
    if (age < 300) {
      const k = 1 - age / 300
      shakeX += (Math.random() - 0.5) * 10 * k
      shakeY += (Math.random() - 0.5) * 8 * k
    }
  }
  ctx.save()
  ctx.translate(shakeX, shakeY)

  drawBackground(ctx, w, h, d)
  drawAssetBadge(ctx, w, s)
  drawPriceLine(ctx, w, h, s)
  drawStreakCenter(ctx, w, h, s)
  drawTimerBar(ctx, w, h, s)
  drawOverheatIndicator(ctx, w, h, s)
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
  // Green flash on hit
  for (const hit of d.hits) {
    const age = now - hit.startedMs
    if (age > 400) continue
    const k = 1 - age / 400
    ctx.fillStyle = `rgba(120, 140, 93, ${0.15 * k})`
    ctx.fillRect(0, 0, w, h)
  }
  // Red flash on bust
  for (const bust of d.busts) {
    const age = now - bust.startedMs
    if (age > 600) continue
    const k = 1 - age / 600
    ctx.fillStyle = `rgba(185, 51, 51, ${0.2 * k})`
    ctx.fillRect(0, 0, w, h)
  }
  // Gold flash on extract
  for (const ext of d.extracts) {
    const age = now - ext.startedMs
    if (age > 500) continue
    const k = 1 - age / 500
    ctx.fillStyle = `rgba(229, 192, 74, ${0.12 * k})`
    ctx.fillRect(0, 0, w, h)
  }
}

function drawAssetBadge(
  ctx: CanvasRenderingContext2D,
  _w: number,
  s: EngineState
): void {
  const pad = 14
  const x = pad
  const y = pad
  const bh = 34
  const padX = 12

  ctx.textBaseline = "middle"
  ctx.textAlign = "left"
  ctx.font = "700 14px Styrene A, system-ui, sans-serif"
  const label = s.asset.shortName
  const labelW = ctx.measureText(label).width

  ctx.font = "600 9px Styrene A, system-ui, sans-serif"
  const tempoLabel = TEMPO_CONFIG[s.tempo].label.toUpperCase()
  const tempoW = ctx.measureText(tempoLabel).width

  const bw = padX + labelW + 10 + tempoW + padX + 4

  ctx.fillStyle = "rgba(26, 26, 24, 0.85)"
  ctx.strokeStyle = "rgba(250, 249, 245, 0.15)"
  ctx.lineWidth = 1
  roundRect(ctx, x, y, bw, bh, 8)
  ctx.fill()
  ctx.stroke()

  ctx.fillStyle = "#faf9f5"
  ctx.font = "700 14px Styrene A, system-ui, sans-serif"
  ctx.fillText(label, x + padX, y + bh / 2 + 0.5)

  ctx.fillStyle = "rgba(229, 192, 74, 0.95)"
  ctx.font = "700 9px Styrene A, system-ui, sans-serif"
  ctx.fillText(tempoLabel, x + padX + labelW + 10, y + bh / 2 + 0.5)
}

function drawPriceLine(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  s: EngineState
): void {
  if (s.sparkline.length < 2) return
  const top = 60
  const height = h * 0.35
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

  const n = s.sparkline.length

  // Gradient fill under the line
  const gradient = ctx.createLinearGradient(0, top, 0, top + height)
  gradient.addColorStop(0, "rgba(120, 140, 93, 0.15)")
  gradient.addColorStop(1, "rgba(120, 140, 93, 0)")
  ctx.fillStyle = gradient
  ctx.beginPath()
  for (let i = 0; i < n; i++) {
    const p = s.sparkline[i]
    const x = left + (i / (n - 1)) * width
    const y = top + height - ((p.price - min) / range) * (height - 16) - 8
    if (i === 0) ctx.moveTo(x, y)
    else ctx.lineTo(x, y)
  }
  ctx.lineTo(left + width, top + height)
  ctx.lineTo(left, top + height)
  ctx.closePath()
  ctx.fill()

  // Line path
  ctx.strokeStyle = "rgba(176, 174, 165, 0.85)"
  ctx.lineWidth = 1.5
  ctx.beginPath()
  for (let i = 0; i < n; i++) {
    const p = s.sparkline[i]
    const x = left + (i / (n - 1)) * width
    const y = top + height - ((p.price - min) / range) * (height - 16) - 8
    if (i === 0) ctx.moveTo(x, y)
    else ctx.lineTo(x, y)
  }
  ctx.stroke()

  // Prediction dots on the line (during a run)
  if (s.runPredictions.length > 0) {
    for (const pred of s.runPredictions) {
      // Find the sparkline point closest to this prediction's time
      let closest = -1
      let closestDist = Infinity
      for (let i = 0; i < n; i++) {
        const dist = Math.abs(s.sparkline[i].atMs - pred.atMs)
        if (dist < closestDist) {
          closestDist = dist
          closest = i
        }
      }
      if (closest >= 0) {
        const px = left + (closest / (n - 1)) * width
        const py = top + height - ((s.sparkline[closest].price - min) / range) * (height - 16) - 8
        ctx.fillStyle = pred.outcome === "HIT" ? "#788c5d" : "#b53333"
        ctx.beginPath()
        ctx.arc(px, py, pred.headshot ? 5 : 3.5, 0, Math.PI * 2)
        ctx.fill()
        if (pred.headshot) {
          ctx.strokeStyle = "#e5c04a"
          ctx.lineWidth = 1.5
          ctx.beginPath()
          ctx.arc(px, py, 7, 0, Math.PI * 2)
          ctx.stroke()
        }
      }
    }
  }

  // Tip dot
  const last = s.sparkline[n - 1]
  const tipX = left + width
  const tipY = top + height - ((last.price - min) / range) * (height - 16) - 8

  // Pulsing glow when LIVE
  if (s.phase === "LIVE" || s.phase === "CALLING") {
    const pulse = (Math.sin(Date.now() / 300) + 1) / 2
    ctx.fillStyle = `rgba(229, 192, 74, ${0.15 + pulse * 0.15})`
    ctx.beginPath()
    ctx.arc(tipX - 2, tipY, 8 + pulse * 4, 0, Math.PI * 2)
    ctx.fill()
  }

  ctx.fillStyle = s.phase === "LIVE" || s.phase === "CALLING" ? "#e5c04a" : "#b0aea5"
  ctx.beginPath()
  ctx.arc(tipX - 2, tipY, 4, 0, Math.PI * 2)
  ctx.fill()

  // Price label
  ctx.fillStyle = "rgba(250, 249, 245, 0.85)"
  ctx.font = "500 12px Styrene A, system-ui, sans-serif"
  ctx.textAlign = "right"
  ctx.textBaseline = "top"
  ctx.fillText(last.price.toFixed(4), right - 6, top + 6)
}

function drawStreakCenter(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  s: EngineState
): void {
  const cx = w / 2
  const chartBottom = 60 + h * 0.35
  const timerTop = h - 60
  const cy = chartBottom + (timerTop - chartBottom) / 2

  if (s.phase === "IDLE") {
    // Waiting state
    ctx.fillStyle = "rgba(250, 249, 245, 0.4)"
    ctx.font = "500 14px Styrene A, system-ui, sans-serif"
    ctx.textAlign = "center"
    ctx.textBaseline = "middle"
    ctx.fillText("DROP IN to start a run", cx, cy)
    return
  }

  if (s.phase === "RESULT") {
    return // Result is shown in overlays
  }

  // LIVE or CALLING — show streak counter and multiplier
  // Streak number
  ctx.fillStyle = "#faf9f5"
  ctx.font = "500 54px Tiempos Headline, ui-serif, Georgia, serif"
  ctx.textAlign = "center"
  ctx.textBaseline = "middle"
  ctx.fillText(s.streak > 0 ? `×${s.streak}` : "—", cx, cy - 16)

  // Multiplier
  ctx.fillStyle = s.streak > 0 ? "#e5c04a" : "rgba(250, 249, 245, 0.5)"
  ctx.font = "700 16px Styrene A, system-ui, sans-serif"
  ctx.fillText(
    s.streak > 0 ? `${s.currentMultiplier.toFixed(2)}×` : "PREDICT",
    cx,
    cy + 24
  )

  // Potential payout
  if (s.streak > 0) {
    ctx.fillStyle = "rgba(120, 140, 93, 0.85)"
    ctx.font = "500 12px Styrene A, system-ui, sans-serif"
    ctx.fillText(`${s.potentialPayout.toFixed(2)} USDT`, cx, cy + 46)
  }

  // Pending direction indicator
  if (s.phase === "CALLING") {
    ctx.fillStyle = s.pendingDirection === "CALL"
      ? "rgba(120, 140, 93, 0.7)"
      : "rgba(217, 119, 87, 0.7)"
    ctx.font = "600 11px Styrene A, system-ui, sans-serif"
    ctx.fillText(
      `${s.pendingDirection === "CALL" ? "↑" : "↓"} Waiting for tick...`,
      cx,
      cy + 66
    )
  }
}

function drawTimerBar(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  s: EngineState
): void {
  if (s.phase !== "LIVE" && s.phase !== "CALLING") return

  const barY = h - 50
  const barH = 6
  const barLeft = 30
  const barRight = w - 30
  const barW = barRight - barLeft

  // Background
  ctx.fillStyle = "rgba(250, 249, 245, 0.08)"
  roundRect(ctx, barLeft, barY, barW, barH, 3)
  ctx.fill()

  // Fill (time remaining)
  const now = Date.now()
  const remaining = Math.max(0, s.timerDeadlineMs - now)
  const frac = remaining / s.effectiveTimerMs

  // Color transitions: green → yellow → red as time runs out
  let barColor: string
  if (frac > 0.5) barColor = "#788c5d"
  else if (frac > 0.2) barColor = "#e5c04a"
  else barColor = "#d97757"

  ctx.fillStyle = barColor
  roundRect(ctx, barLeft, barY, barW * frac, barH, 3)
  ctx.fill()

  // Timer label
  ctx.fillStyle = "rgba(250, 249, 245, 0.5)"
  ctx.font = "500 10px Styrene A, system-ui, sans-serif"
  ctx.textAlign = "center"
  ctx.textBaseline = "top"
  ctx.fillText(`${(remaining / 1000).toFixed(1)}s`, w / 2, barY + barH + 6)
}

function drawOverheatIndicator(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  s: EngineState
): void {
  if (s.phase !== "LIVE" && s.phase !== "CALLING") return
  if (s.overheatLevel < 2) return

  const x = w - 60
  const y = h - 90
  const barW = 40
  const barH = 4
  const segments = 5

  ctx.fillStyle = "rgba(250, 249, 245, 0.3)"
  ctx.font = "600 8px Styrene A, system-ui, sans-serif"
  ctx.textAlign = "center"
  ctx.textBaseline = "bottom"
  ctx.fillText("HEAT", x + barW / 2, y - 4)

  for (let i = 0; i < segments; i++) {
    const segX = x + (barW / segments) * i + 1
    const segW = barW / segments - 2
    const lit = i < s.overheatLevel
    ctx.fillStyle = lit
      ? i >= 3 ? "#d97757" : i >= 2 ? "#e5c04a" : "rgba(250, 249, 245, 0.3)"
      : "rgba(250, 249, 245, 0.08)"
    ctx.fillRect(segX, y, segW, barH)
  }
}

function drawOverlays(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  d: DrawCtx
): void {
  const now = Date.now()
  const cx = w / 2
  const cy = h / 2

  // Badge takeover
  for (const badge of d.badges) {
    const age = now - badge.startedMs
    if (age > BADGE_FX_MS) continue

    let alpha = 1
    if (age < 200) alpha = age / 200
    else if (age > BADGE_FX_MS - 600) alpha = Math.max(0, (BADGE_FX_MS - age) / 600)

    const colors: Record<BadgeType, { bg: string; border: string; text: string }> = {
      TRIPLE: { bg: "rgba(140, 100, 50, 0.92)", border: "rgba(205, 165, 100, 0.9)", text: "#ffd08a" },
      PENTA: { bg: "rgba(100, 110, 120, 0.92)", border: "rgba(190, 200, 210, 0.9)", text: "#e0e8f0" },
      ACE: { bg: "rgba(140, 120, 40, 0.92)", border: "rgba(229, 192, 74, 0.9)", text: "#e5c04a" },
      LEGENDARY: { bg: "rgba(160, 130, 20, 0.94)", border: "rgba(255, 215, 0, 0.95)", text: "#ffd700" },
    }
    const c = colors[badge.badge]

    // Scale-in effect
    const scale = age < 200 ? 0.6 + (age / 200) * 0.4 : 1
    ctx.save()
    ctx.globalAlpha = alpha
    ctx.translate(cx, cy - 30)
    ctx.scale(scale, scale)

    // Glow rings for LEGENDARY
    if (badge.badge === "LEGENDARY") {
      for (let i = 0; i < 3; i++) {
        const ringAlpha = alpha * (0.3 - i * 0.08)
        ctx.strokeStyle = `rgba(255, 215, 0, ${ringAlpha})`
        ctx.lineWidth = 3 - i
        ctx.beginPath()
        ctx.arc(0, 0, 60 + i * 20 + (age / 30), 0, Math.PI * 2)
        ctx.stroke()
      }
    }

    const bw = 200
    const bh = 70
    ctx.fillStyle = c.bg
    ctx.strokeStyle = c.border
    ctx.lineWidth = 2
    roundRect(ctx, -bw / 2, -bh / 2, bw, bh, 14)
    ctx.fill()
    ctx.stroke()

    ctx.fillStyle = c.text
    ctx.font = "700 28px Styrene A, system-ui, sans-serif"
    ctx.textAlign = "center"
    ctx.textBaseline = "middle"
    ctx.fillText(badge.badge, 0, -6)

    ctx.fillStyle = "rgba(250, 249, 245, 0.7)"
    ctx.font = "500 12px Styrene A, system-ui, sans-serif"
    ctx.fillText(`${badge.streak} streak`, 0, 22)

    ctx.restore()
  }

  // Headshot flash
  for (const hs of d.headshots) {
    const age = now - hs.startedMs
    if (age > HEADSHOT_FX_MS) continue
    let alpha = 1
    if (age < 100) alpha = age / 100
    else if (age > HEADSHOT_FX_MS - 400) alpha = Math.max(0, (HEADSHOT_FX_MS - age) / 400)

    ctx.globalAlpha = alpha * 0.9
    ctx.fillStyle = "rgba(229, 192, 74, 0.06)"
    ctx.fillRect(0, 0, w, h)

    ctx.fillStyle = "#e5c04a"
    ctx.font = "700 20px Styrene A, system-ui, sans-serif"
    ctx.textAlign = "center"
    ctx.textBaseline = "middle"
    ctx.fillText("HEADSHOT", cx, cy - 80)
    ctx.font = "500 11px Styrene A, system-ui, sans-serif"
    ctx.fillText("1.5× BONUS", cx, cy - 58)
    ctx.globalAlpha = 1
  }

  // Bust overlay
  for (const bust of d.busts) {
    const age = now - bust.startedMs
    if (age > BUST_FX_MS) continue
    let alpha = 1
    if (age < 100) alpha = age / 100
    else if (age > BUST_FX_MS - 300) alpha = Math.max(0, (BUST_FX_MS - age) / 300)

    ctx.globalAlpha = alpha * 0.95
    const bw = 180
    const bh = 56
    ctx.fillStyle = "rgba(70, 20, 20, 0.94)"
    ctx.strokeStyle = "rgba(217, 119, 87, 0.8)"
    ctx.lineWidth = 1.5
    roundRect(ctx, cx - bw / 2, cy - bh / 2, bw, bh, 12)
    ctx.fill()
    ctx.stroke()

    ctx.fillStyle = "#faf9f5"
    ctx.font = "500 11px Styrene A, system-ui, sans-serif"
    ctx.textAlign = "center"
    ctx.textBaseline = "middle"
    ctx.fillText("BUSTED", cx, cy - 8)
    ctx.font = "700 18px Styrene A, system-ui, sans-serif"
    ctx.fillText(`-${d.state.stake.toFixed(2)} USDT`, cx, cy + 12)
    ctx.globalAlpha = 1
  }

  // Extract overlay
  for (const ext of d.extracts) {
    const age = now - ext.startedMs
    if (age > EXTRACT_FX_MS) continue
    let alpha = 1
    if (age < 120) alpha = age / 120
    else if (age > EXTRACT_FX_MS - 400) alpha = Math.max(0, (EXTRACT_FX_MS - age) / 400)

    ctx.globalAlpha = alpha * 0.95
    const label = `+${ext.payout.toFixed(2)} USDT`
    ctx.font = "700 22px Styrene A, system-ui, sans-serif"
    const labelW = ctx.measureText(label).width
    const bw = labelW + 60
    const bh = 56
    ctx.fillStyle = "rgba(50, 70, 30, 0.94)"
    ctx.strokeStyle = "rgba(160, 182, 127, 0.95)"
    ctx.lineWidth = 1.5
    roundRect(ctx, cx - bw / 2, cy - bh / 2, bw, bh, 12)
    ctx.fill()
    ctx.stroke()

    ctx.fillStyle = "#faf9f5"
    ctx.font = "500 11px Styrene A, system-ui, sans-serif"
    ctx.textAlign = "center"
    ctx.textBaseline = "middle"
    ctx.fillText("EXTRACTED", cx, cy - 8)
    ctx.font = "700 22px Styrene A, system-ui, sans-serif"
    ctx.fillText(label, cx, cy + 14)
    ctx.globalAlpha = 1
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
