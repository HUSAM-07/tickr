/** Deriv API constants — new API (api.derivws.com) */

export const DERIV_REST_URL = "https://api.derivws.com"
export const DERIV_WS_PUBLIC = "wss://api.derivws.com/trading/v1/options/ws/public"
export const DERIV_APP_ID = process.env.NEXT_PUBLIC_DERIV_APP_ID || "32Z5qZ94Sx9Ev8p73z3eY"

/** @deprecated Legacy v3 — kept as fallback */
export const DERIV_WS_LEGACY = "wss://ws.derivws.com/websockets/v3"

export const HEARTBEAT_INTERVAL = 30_000 // 30s
export const RECONNECT_BASE_DELAY = 1_000 // 1s
export const RECONNECT_MAX_DELAY = 30_000 // 30s
export const MAX_RECONNECT_ATTEMPTS = 10

/** Granularity in seconds, keyed by human-readable interval */
export const INTERVAL_MAP: Record<string, number> = {
  "1m": 60,
  "2m": 120,
  "5m": 300,
  "15m": 900,
  "30m": 1800,
  "1h": 3600,
  "4h": 14400,
  "1d": 86400,
}

/** Display names for popular Deriv symbols */
export const SYMBOL_DISPLAY: Record<string, { name: string; market: string }> =
  {
    // Synthetic / Volatility indices
    R_10: { name: "Volatility 10 Index", market: "Synthetic" },
    R_25: { name: "Volatility 25 Index", market: "Synthetic" },
    R_50: { name: "Volatility 50 Index", market: "Synthetic" },
    R_75: { name: "Volatility 75 Index", market: "Synthetic" },
    R_100: { name: "Volatility 100 Index", market: "Synthetic" },
    "1HZ10V": { name: "Volatility 10 (1s) Index", market: "Synthetic" },
    "1HZ25V": { name: "Volatility 25 (1s) Index", market: "Synthetic" },
    "1HZ50V": { name: "Volatility 50 (1s) Index", market: "Synthetic" },
    "1HZ75V": { name: "Volatility 75 (1s) Index", market: "Synthetic" },
    "1HZ100V": { name: "Volatility 100 (1s) Index", market: "Synthetic" },

    // Crash / Boom
    BOOM300N: { name: "Boom 300 Index", market: "Synthetic" },
    BOOM500N: { name: "Boom 500 Index", market: "Synthetic" },
    BOOM1000N: { name: "Boom 1000 Index", market: "Synthetic" },
    CRASH300N: { name: "Crash 300 Index", market: "Synthetic" },
    CRASH500N: { name: "Crash 500 Index", market: "Synthetic" },
    CRASH1000N: { name: "Crash 1000 Index", market: "Synthetic" },

    // Forex
    frxEURUSD: { name: "EUR/USD", market: "Forex" },
    frxGBPUSD: { name: "GBP/USD", market: "Forex" },
    frxUSDJPY: { name: "USD/JPY", market: "Forex" },
    frxAUDUSD: { name: "AUD/USD", market: "Forex" },
    frxUSDCAD: { name: "USD/CAD", market: "Forex" },
    frxEURGBP: { name: "EUR/GBP", market: "Forex" },

    // Crypto
    cryBTCUSD: { name: "BTC/USD", market: "Crypto" },
    cryETHUSD: { name: "ETH/USD", market: "Crypto" },
    cryLTCUSD: { name: "LTC/USD", market: "Crypto" },
  }

/** Contract type display labels */
export const CONTRACT_TYPE_LABELS: Record<string, string> = {
  CALL: "Rise",
  PUT: "Fall",
  DIGITMATCH: "Digit Match",
  DIGITDIFF: "Digit Differ",
  DIGITOVER: "Digit Over",
  DIGITUNDER: "Digit Under",
  DIGITEVEN: "Digit Even",
  DIGITODD: "Digit Odd",
  ONETOUCH: "One Touch",
  NOTOUCH: "No Touch",
  MULTUP: "Multiplier Up",
  MULTDOWN: "Multiplier Down",
}

export const DURATION_UNIT_LABELS: Record<string, string> = {
  t: "ticks",
  s: "seconds",
  m: "minutes",
  h: "hours",
  d: "days",
}
