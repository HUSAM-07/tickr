"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import {
  createChart,
  CandlestickSeries,
  LineSeries,
  type IChartApi,
  type ISeriesApi,
  type CandlestickData,
  type Time,
  ColorType,
} from "lightweight-charts"
import { useChartData } from "@/hooks/use-chart-data"
import { useTradingContext } from "@/hooks/trading-context"
import { getSymbolName } from "@/lib/deriv/utils"
import { Loader2, Wifi, WifiOff } from "lucide-react"
import type { CandleData } from "@/lib/deriv/types"

export type TradingChartData = {
  symbol: string
  interval?: string
  title?: string
  show_indicators?: string[]
}

const INTERVAL_OPTIONS = ["1m", "5m", "15m", "1h", "4h", "1d"]

export function WidgetTradingChart({ data }: { data: TradingChartData }) {
  const { symbol, interval: initialInterval, title, show_indicators } = data
  const [interval, setInterval] = useState(initialInterval || "1m")
  const chartContainerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<IChartApi | null>(null)
  const candleSeriesRef = useRef<ISeriesApi<"Candlestick", Time> | null>(null)
  const smaSeriesRef = useRef<ISeriesApi<"Line", Time> | null>(null)
  const { connectionState, connect } = useTradingContext()

  const { candles, latestCandle, isLoading, error, marketStatus, lastTickAt } =
    useChartData(
      connectionState === "disconnected" ? null : symbol,
      interval
    )

  // Auto-connect if not connected
  useEffect(() => {
    if (connectionState === "disconnected") connect()
  }, [connectionState, connect])

  // Create chart instance
  useEffect(() => {
    if (!chartContainerRef.current) return

    const isDark = document.documentElement.classList.contains("dark")
    const textColor = isDark ? "#a1a1aa" : "#71717a"
    const gridColor = isDark ? "rgba(255, 255, 255, 0.06)" : "rgba(0, 0, 0, 0.06)"
    const borderColor = isDark ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.1)"
    const crosshairColor = isDark ? "rgba(255, 255, 255, 0.2)" : "rgba(0, 0, 0, 0.2)"

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: "transparent" },
        textColor,
        fontFamily: "system-ui, sans-serif",
        fontSize: 11,
      },
      grid: {
        vertLines: { color: gridColor },
        horzLines: { color: gridColor },
      },
      width: chartContainerRef.current.clientWidth,
      height: 320,
      timeScale: {
        timeVisible: true,
        secondsVisible: false,
        borderColor,
      },
      rightPriceScale: { borderColor },
      crosshair: {
        vertLine: { color: crosshairColor, width: 1, style: 3 },
        horzLine: { color: crosshairColor, width: 1, style: 3 },
      },
      handleScroll: { vertTouchDrag: false },
    })

    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: "#22c55e",
      downColor: "#ef4444",
      borderDownColor: "#ef4444",
      borderUpColor: "#22c55e",
      wickDownColor: "#ef4444",
      wickUpColor: "#22c55e",
    })

    chartRef.current = chart
    candleSeriesRef.current = candleSeries

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        chart.applyOptions({ width: entry.contentRect.width })
      }
    })
    observer.observe(chartContainerRef.current)

    return () => {
      observer.disconnect()
      chart.remove()
      chartRef.current = null
      candleSeriesRef.current = null
      smaSeriesRef.current = null
    }
  }, [])

  const addSmaOverlay = useCallback(
    (candleData: CandleData[], period: number) => {
      if (!chartRef.current) return

      if (smaSeriesRef.current) {
        chartRef.current.removeSeries(smaSeriesRef.current)
      }

      const smaSeries = chartRef.current.addSeries(LineSeries, {
        color: "#f59e0b",
        lineWidth: 2,
        priceLineVisible: false,
        lastValueVisible: false,
      })

      const smaData: Array<{ time: Time; value: number }> = []
      for (let i = period - 1; i < candleData.length; i++) {
        let sum = 0
        for (let j = i - period + 1; j <= i; j++) {
          sum += candleData[j].close
        }
        smaData.push({
          time: candleData[i].time as Time,
          value: sum / period,
        })
      }

      smaSeries.setData(smaData)
      smaSeriesRef.current = smaSeries
    },
    []
  )

  // Update candle data when historical data loads
  useEffect(() => {
    if (!candleSeriesRef.current || candles.length === 0) return

    const formattedCandles: CandlestickData<Time>[] = candles.map((c) => ({
      time: c.time as Time,
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close,
    }))

    candleSeriesRef.current.setData(formattedCandles)
    chartRef.current?.timeScale().fitContent()

    if (show_indicators?.includes("sma_20") && candles.length >= 20) {
      addSmaOverlay(candles, 20)
    }
  }, [candles, show_indicators, addSmaOverlay])

  // Update chart with live candle data
  useEffect(() => {
    if (!candleSeriesRef.current || !latestCandle) return

    candleSeriesRef.current.update({
      time: latestCandle.time as Time,
      open: latestCandle.open,
      high: latestCandle.high,
      low: latestCandle.low,
      close: latestCandle.close,
    })
  }, [latestCandle])

  const decimals = symbol.startsWith("frx") ? 5 : symbol.startsWith("cry") ? 2 : 2
  const fmt = (v: number) => v.toFixed(decimals)
  const displayName = title || getSymbolName(symbol)

  return (
    <div className="my-3 overflow-hidden rounded-xl border border-border bg-card">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
        <div className="flex items-center gap-2">
          <h3 className="font-display text-sm">{displayName}</h3>
          <span className="font-heading text-[11px] text-muted-foreground">{symbol}</span>
          {connectionState === "disconnected" ? (
            <WifiOff className="h-3 w-3 text-red-500" />
          ) : (
            <Wifi className="h-3 w-3 text-green-500" />
          )}
          {(marketStatus === "closed" || marketStatus === "suspended") && (
            <span
              className="rounded-md border border-amber-500/40 bg-amber-500/10 px-1.5 py-0.5 font-heading text-[10px] uppercase tracking-wide text-amber-500"
              title={
                lastTickAt
                  ? `Last price as of ${new Date(lastTickAt * 1000).toLocaleString()}`
                  : "Market is not currently open"
              }
            >
              {marketStatus === "suspended" ? "Suspended" : "Market Closed"}
            </span>
          )}
        </div>

        <div className="flex gap-0.5">
          {INTERVAL_OPTIONS.map((opt) => (
            <button
              key={opt}
              onClick={() => setInterval(opt)}
              className={`rounded-md px-2 py-0.5 font-heading text-[11px] transition-colors ${
                interval === opt
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground"
              }`}
            >
              {opt}
            </button>
          ))}
        </div>
      </div>

      {/* Chart */}
      <div className="relative">
        {isLoading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-card/80">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        )}
        {error && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-card/80">
            <p className="text-sm text-red-500">{error}</p>
          </div>
        )}
        <div ref={chartContainerRef} className="h-80" />
      </div>

      {/* OHLC footer */}
      {latestCandle && (
        <div className="border-t border-border px-4 py-1.5">
          <div className="flex items-center gap-4 font-heading text-[11px]">
            <span className="text-muted-foreground">
              O <span className="text-foreground">{fmt(latestCandle.open)}</span>
            </span>
            <span className="text-muted-foreground">
              H <span className="text-green-500">{fmt(latestCandle.high)}</span>
            </span>
            <span className="text-muted-foreground">
              L <span className="text-red-500">{fmt(latestCandle.low)}</span>
            </span>
            <span className="text-muted-foreground">
              C <span className="text-foreground">{fmt(latestCandle.close)}</span>
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
