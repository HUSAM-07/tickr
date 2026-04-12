"use client"

import type { SignalCardData } from "@/lib/types"
import { getSymbolName, getContractLabel, formatDuration } from "@/lib/deriv/utils"
import { ArrowUp, ArrowDown, Zap, TrendingUp, TrendingDown, Activity, BarChart3 } from "lucide-react"

const CONFIDENCE_STYLES = {
  high: "bg-green-500/15 text-green-600 dark:text-green-400",
  medium: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  low: "bg-muted text-muted-foreground",
}

/** SVG arc gauge for RSI */
function RsiGauge({ value }: { value: number }) {
  const clampedValue = Math.max(0, Math.min(100, value))
  const angle = (clampedValue / 100) * 180
  const rad = (angle * Math.PI) / 180
  const cx = 60
  const cy = 55
  const r = 40

  // Arc path from 180° (left) to target angle
  const startX = cx - r
  const startY = cy
  const endX = cx + r * Math.cos(Math.PI - rad)
  const endY = cy - r * Math.sin(Math.PI - rad)
  const largeArc = angle > 90 ? 1 : 0

  // Color based on RSI zones
  const color =
    clampedValue >= 70
      ? "#ef4444" // Overbought — red
      : clampedValue <= 30
        ? "#22c55e" // Oversold — green
        : "#f59e0b" // Neutral — amber

  const zone =
    clampedValue >= 70
      ? "Overbought"
      : clampedValue <= 30
        ? "Oversold"
        : "Neutral"

  return (
    <div className="flex flex-col items-center">
      <svg width="120" height="70" viewBox="0 0 120 70">
        {/* Background arc */}
        <path
          d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
          fill="none"
          stroke="currentColor"
          strokeWidth="6"
          className="text-border"
        />
        {/* Value arc */}
        <path
          d={`M ${startX} ${startY} A ${r} ${r} 0 ${largeArc} 1 ${endX} ${endY}`}
          fill="none"
          stroke={color}
          strokeWidth="6"
          strokeLinecap="round"
        />
        {/* Value text */}
        <text x={cx} y={cy - 8} textAnchor="middle" className="fill-foreground font-heading text-lg font-medium">
          {clampedValue.toFixed(1)}
        </text>
        <text x={cx} y={cy + 8} textAnchor="middle" className="fill-muted-foreground text-[9px]">
          {zone}
        </text>
      </svg>
    </div>
  )
}

/** Simple bar for MACD histogram */
function MacdBars({ histogram, macd, signal }: { histogram: number; macd: number; signal: number }) {
  const isPositive = histogram >= 0
  const barHeight = Math.min(Math.abs(histogram) * 800, 40) // Scale for visibility

  return (
    <div className="flex flex-col items-center gap-2">
      {/* Histogram bar */}
      <div className="flex h-12 w-full items-end justify-center gap-[2px]">
        {/* Generate a few fake bars for visual effect, centered on the histogram */}
        {[-3, -2, -1, 0, 1, 2, 3].map((offset) => {
          const h = Math.max(4, barHeight - Math.abs(offset) * 6)
          return (
            <div
              key={offset}
              className={`w-3 rounded-sm transition-all ${isPositive ? "bg-green-500" : "bg-red-500"}`}
              style={{ height: `${h}px`, opacity: 1 - Math.abs(offset) * 0.12 }}
            />
          )
        })}
      </div>
      <div className="flex w-full justify-between text-[10px] text-muted-foreground">
        <span>MACD {macd.toFixed(4)}</span>
        <span>Signal {signal.toFixed(4)}</span>
      </div>
    </div>
  )
}

/** Bollinger position indicator */
function BollingerPosition({ price, upper, middle, lower }: { price: number; upper: number; middle: number; lower: number }) {
  const range = upper - lower
  const position = range > 0 ? ((price - lower) / range) * 100 : 50
  const clamped = Math.max(0, Math.min(100, position))

  return (
    <div className="space-y-2">
      {/* Band visualization */}
      <div className="relative h-3 w-full overflow-hidden rounded-full bg-border">
        {/* Band range */}
        <div className="absolute inset-y-0 left-[10%] right-[10%] rounded-full bg-muted-foreground/20" />
        {/* Middle line */}
        <div className="absolute inset-y-0 left-1/2 w-px bg-muted-foreground/40" />
        {/* Price position dot */}
        <div
          className="absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent shadow-sm"
          style={{ left: `${clamped}%` }}
        />
      </div>
      <div className="flex justify-between text-[10px] text-muted-foreground">
        <span>L {lower.toFixed(2)}</span>
        <span>M {middle.toFixed(2)}</span>
        <span>U {upper.toFixed(2)}</span>
      </div>
    </div>
  )
}

export function WidgetSignalCard({ data }: { data: SignalCardData }) {
  const {
    symbol,
    direction,
    confidence,
    reasoning,
    suggested_duration,
    suggested_duration_unit,
    suggested_amount,
    current_price,
    price_change_pct,
    rsi,
    sma_20,
    sma_50,
    macd,
    bollinger,
    trend,
    volatility,
    atr,
  } = data

  const isRise = direction === "CALL"
  const hasIndicators = rsi != null || macd != null || bollinger != null

  // If no indicator data, render a simple card
  if (!hasIndicators) {
    return <SimpleSignalCard data={data} />
  }

  return (
    <div className="my-3">
      {/* Bento grid */}
      <div className="grid grid-cols-2 gap-2 md:grid-cols-3 md:gap-3">
        {/* ── Signal Card (spans 2 cols on mobile, 1 col + row span on desktop) ── */}
        <div className="col-span-2 md:col-span-1 md:row-span-2 rounded-2xl border border-border bg-card p-4 md:p-5">
          <div className="flex items-center gap-2 mb-3">
            <Zap className="h-4 w-4 text-accent" />
            <span className="font-heading text-[11px] font-medium text-muted-foreground">SIGNAL</span>
            <span className={`ml-auto rounded-md px-2 py-0.5 font-heading text-[10px] font-medium uppercase ${CONFIDENCE_STYLES[confidence]}`}>
              {confidence}
            </span>
          </div>

          <div className="flex items-center gap-3 mb-3">
            <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${isRise ? "bg-green-500/15" : "bg-red-500/15"}`}>
              {isRise ? (
                <ArrowUp className="h-6 w-6 text-green-600 dark:text-green-400" />
              ) : (
                <ArrowDown className="h-6 w-6 text-red-600 dark:text-red-400" />
              )}
            </div>
            <div>
              <p className="font-display text-lg">{getContractLabel(direction)}</p>
              <p className="font-heading text-xs text-muted-foreground">{getSymbolName(symbol)}</p>
            </div>
          </div>

          <p className="font-body text-sm leading-relaxed text-foreground/80">{reasoning}</p>

          {(suggested_duration || suggested_amount) && (
            <div className="mt-3 flex gap-3 text-xs text-muted-foreground">
              {suggested_duration && suggested_duration_unit && (
                <span className="font-heading">{formatDuration(suggested_duration, suggested_duration_unit)}</span>
              )}
              {suggested_amount && <span className="font-heading">${suggested_amount}</span>}
            </div>
          )}
        </div>

        {/* ── Price Card ── */}
        {current_price != null && (
          <div className="rounded-2xl border border-border bg-card p-4">
            <div className="flex items-center gap-1.5 mb-2">
              <Activity className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="font-heading text-[11px] text-muted-foreground">PRICE</span>
            </div>
            <p className="font-display text-2xl">{current_price.toFixed(symbol.startsWith("frx") ? 5 : 2)}</p>
            {price_change_pct != null && (
              <p className={`mt-1 font-heading text-sm font-medium ${price_change_pct >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
                {price_change_pct >= 0 ? "+" : ""}{price_change_pct.toFixed(4)}%
              </p>
            )}
          </div>
        )}

        {/* ── Trend Card ── */}
        {trend && (
          <div className="rounded-2xl border border-border bg-card p-4">
            <div className="flex items-center gap-1.5 mb-2">
              {trend === "bullish" ? (
                <TrendingUp className="h-3.5 w-3.5 text-green-500" />
              ) : (
                <TrendingDown className="h-3.5 w-3.5 text-red-500" />
              )}
              <span className="font-heading text-[11px] text-muted-foreground">TREND</span>
            </div>
            <p className={`font-display text-xl capitalize ${trend === "bullish" ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
              {trend}
            </p>
            {sma_20 != null && sma_50 != null && (
              <p className="mt-1 font-heading text-[11px] text-muted-foreground">
                SMA20 {sma_20 > sma_50 ? ">" : "<"} SMA50
              </p>
            )}
            {volatility && (
              <p className="mt-0.5 font-heading text-[11px] text-muted-foreground">
                Vol: {volatility}
              </p>
            )}
          </div>
        )}

        {/* ── RSI Gauge Card ── */}
        {rsi != null && (
          <div className="rounded-2xl border border-border bg-card p-4">
            <div className="flex items-center gap-1.5 mb-1">
              <BarChart3 className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="font-heading text-[11px] text-muted-foreground">RSI (14)</span>
            </div>
            <RsiGauge value={rsi} />
          </div>
        )}

        {/* ── MACD Card ── */}
        {macd != null && (
          <div className="rounded-2xl border border-border bg-card p-4">
            <div className="flex items-center gap-1.5 mb-2">
              <BarChart3 className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="font-heading text-[11px] text-muted-foreground">MACD</span>
              <span className={`ml-auto font-heading text-[10px] font-medium ${macd.histogram >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
                {macd.histogram >= 0 ? "Bullish" : "Bearish"}
              </span>
            </div>
            <MacdBars histogram={macd.histogram} macd={macd.macd} signal={macd.signal} />
          </div>
        )}

        {/* ── Bollinger Card ── */}
        {bollinger != null && current_price != null && (
          <div className="col-span-2 md:col-span-1 rounded-2xl border border-border bg-card p-4">
            <div className="flex items-center gap-1.5 mb-3">
              <Activity className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="font-heading text-[11px] text-muted-foreground">BOLLINGER BANDS</span>
            </div>
            <BollingerPosition
              price={current_price}
              upper={bollinger.upper}
              middle={bollinger.middle}
              lower={bollinger.lower}
            />
          </div>
        )}
      </div>

      <p className="mt-2 font-heading text-[10px] text-muted-foreground">
        Signals are AI-generated and not financial advice. Trade responsibly.
      </p>
    </div>
  )
}

/** Fallback simple card when no indicator data is provided */
function SimpleSignalCard({ data }: { data: SignalCardData }) {
  const { symbol, direction, confidence, reasoning, suggested_duration, suggested_duration_unit, suggested_amount } = data
  const isRise = direction === "CALL"

  return (
    <div className="my-3 overflow-hidden rounded-2xl border border-border bg-card">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <Zap className="h-4 w-4 text-accent" />
          <h3 className="font-display text-sm">Trading Signal</h3>
        </div>
        <span className={`rounded-md px-2 py-0.5 font-heading text-[10px] font-medium uppercase ${CONFIDENCE_STYLES[confidence]}`}>
          {confidence}
        </span>
      </div>

      <div className="px-4 py-3 space-y-3">
        <div className="flex items-center gap-3">
          <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${isRise ? "bg-green-500/15" : "bg-red-500/15"}`}>
            {isRise ? (
              <ArrowUp className="h-5 w-5 text-green-600 dark:text-green-400" />
            ) : (
              <ArrowDown className="h-5 w-5 text-red-600 dark:text-red-400" />
            )}
          </div>
          <div>
            <p className="font-display text-sm">{getContractLabel(direction)} on {getSymbolName(symbol)}</p>
            <p className="font-heading text-xs text-muted-foreground">{symbol}</p>
          </div>
        </div>

        <p className="font-body text-sm text-foreground/80">{reasoning}</p>

        {(suggested_duration || suggested_amount) && (
          <div className="flex gap-4 text-xs text-muted-foreground">
            {suggested_duration && suggested_duration_unit && (
              <span className="font-heading">Duration: {formatDuration(suggested_duration, suggested_duration_unit)}</span>
            )}
            {suggested_amount && <span className="font-heading">Stake: ${suggested_amount}</span>}
          </div>
        )}

        <p className="font-heading text-[10px] text-muted-foreground">
          Signals are AI-generated and not financial advice.
        </p>
      </div>
    </div>
  )
}
