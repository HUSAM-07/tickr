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

/** Display names for Deriv symbols (verified against active_symbols API) */
export const SYMBOL_DISPLAY: Record<string, { name: string; market: string }> =
  {
    // Volatility indices
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

    // Boom / Crash (new API symbols — no N suffix)
    BOOM500: { name: "Boom 500 Index", market: "Synthetic" },
    BOOM600: { name: "Boom 600 Index", market: "Synthetic" },
    BOOM900: { name: "Boom 900 Index", market: "Synthetic" },
    BOOM1000: { name: "Boom 1000 Index", market: "Synthetic" },
    CRASH500: { name: "Crash 500 Index", market: "Synthetic" },
    CRASH600: { name: "Crash 600 Index", market: "Synthetic" },
    CRASH900: { name: "Crash 900 Index", market: "Synthetic" },
    CRASH1000: { name: "Crash 1000 Index", market: "Synthetic" },

    // Jump indices
    JD10: { name: "Jump 10 Index", market: "Synthetic" },
    JD25: { name: "Jump 25 Index", market: "Synthetic" },
    JD50: { name: "Jump 50 Index", market: "Synthetic" },
    JD75: { name: "Jump 75 Index", market: "Synthetic" },
    JD100: { name: "Jump 100 Index", market: "Synthetic" },

    // Step indices
    stpRNG: { name: "Step Index 100", market: "Synthetic" },
    stpRNG2: { name: "Step Index 200", market: "Synthetic" },
    stpRNG3: { name: "Step Index 300", market: "Synthetic" },

    // Bull / Bear
    RDBULL: { name: "Bull Market Index", market: "Synthetic" },
    RDBEAR: { name: "Bear Market Index", market: "Synthetic" },

    // Forex
    frxEURUSD: { name: "EUR/USD", market: "Forex" },
    frxGBPUSD: { name: "GBP/USD", market: "Forex" },
    frxUSDJPY: { name: "USD/JPY", market: "Forex" },
    frxAUDUSD: { name: "AUD/USD", market: "Forex" },
    frxUSDCAD: { name: "USD/CAD", market: "Forex" },
    frxEURGBP: { name: "EUR/GBP", market: "Forex" },
    frxEURJPY: { name: "EUR/JPY", market: "Forex" },
    frxGBPJPY: { name: "GBP/JPY", market: "Forex" },

    // Crypto
    cryBTCUSD: { name: "BTC/USD", market: "Crypto" },
    cryETHUSD: { name: "ETH/USD", market: "Crypto" },

    // Commodities
    frxXAUUSD: { name: "Gold/USD", market: "Commodities" },
    frxXAGUSD: { name: "Silver/USD", market: "Commodities" },

    // Stock indices
    OTC_NDX: { name: "US Tech 100", market: "Indices" },
    OTC_SPC: { name: "US 500", market: "Indices" },
    OTC_DJI: { name: "Wall Street 30", market: "Indices" },
    OTC_FTSE: { name: "UK 100", market: "Indices" },
    OTC_GDAXI: { name: "Germany 40", market: "Indices" },
    OTC_N225: { name: "Japan 225", market: "Indices" },
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
