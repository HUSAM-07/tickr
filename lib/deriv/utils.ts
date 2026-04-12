import { SYMBOL_DISPLAY, CONTRACT_TYPE_LABELS, DURATION_UNIT_LABELS } from "./constants"

/** Get display name for a Deriv symbol, with fallback */
export function getSymbolName(symbol: string): string {
  return SYMBOL_DISPLAY[symbol]?.name ?? symbol
}

/** Get market category for a symbol */
export function getSymbolMarket(symbol: string): string {
  return SYMBOL_DISPLAY[symbol]?.market ?? "Unknown"
}

/** Get human-readable contract type label */
export function getContractLabel(type: string): string {
  return CONTRACT_TYPE_LABELS[type] ?? type
}

/** Format duration with unit label */
export function formatDuration(duration: number, unit: string): string {
  const label = DURATION_UNIT_LABELS[unit] ?? unit
  return `${duration} ${label}`
}

/** Format a price with appropriate decimal places */
export function formatPrice(price: number, symbol?: string): string {
  // Forex pairs typically need 5 decimal places, synthetics need 2
  if (symbol && symbol.startsWith("frx")) {
    return price.toFixed(5)
  }
  if (symbol && symbol.startsWith("cry")) {
    return price.toFixed(2)
  }
  return price.toFixed(2)
}

/** Format P&L with sign and color class */
export function formatPnl(pnl: number): { text: string; className: string } {
  const sign = pnl >= 0 ? "+" : ""
  return {
    text: `${sign}${pnl.toFixed(2)}`,
    className: pnl > 0 ? "text-green-500" : pnl < 0 ? "text-red-500" : "text-muted-foreground",
  }
}

/** Convert epoch seconds to a Date-compatible timestamp */
export function epochToDate(epoch: number): Date {
  return new Date(epoch * 1000)
}
