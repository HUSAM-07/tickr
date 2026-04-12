/** TypeScript types for Deriv WebSocket API v3 */

// ── Connection ──

export type ConnectionState =
  | "disconnected"
  | "connecting"
  | "connected"
  | "authorized"

// ── Requests ──

export type DerivRequest = {
  req_id?: number
  [key: string]: unknown
}

export type AuthorizeRequest = {
  authorize: string
  req_id?: number
}

export type TicksRequest = {
  ticks: string
  subscribe?: 1
  req_id?: number
}

export type TicksHistoryRequest = {
  ticks_history: string
  style?: "ticks" | "candles"
  granularity?: number
  count?: number
  end?: "latest" | number
  start?: number
  subscribe?: 1
  req_id?: number
}

export type ProposalRequest = {
  proposal: 1
  subscribe?: 1
  amount: number
  basis: "stake" | "payout"
  contract_type: string
  currency: string
  duration: number
  duration_unit: string
  symbol: string
  barrier?: string
  req_id?: number
}

export type BuyRequest = {
  buy: string // proposal id
  price: number
  req_id?: number
}

export type SellRequest = {
  sell: string // contract id
  price: number
  req_id?: number
}

// ── Responses ──

export type DerivResponse = {
  req_id?: number
  msg_type: string
  error?: { code: string; message: string }
  [key: string]: unknown
}

export type AuthorizeResponse = DerivResponse & {
  authorize?: {
    loginid: string
    balance: number
    currency: string
    email: string
    fullname: string
    is_virtual: number
    account_list: Array<{
      loginid: string
      is_virtual: number
      currency: string
    }>
  }
}

export type TickResponse = DerivResponse & {
  tick?: {
    id: string
    symbol: string
    epoch: number
    quote: number
    ask: number
    bid: number
  }
  subscription?: { id: string }
}

export type OHLCResponse = DerivResponse & {
  ohlc?: {
    epoch: number
    open: number
    high: number
    low: number
    close: number
    granularity: number
  }
  subscription?: { id: string }
}

export type TicksHistoryResponse = DerivResponse & {
  candles?: Array<{
    epoch: number
    open: number
    high: number
    low: number
    close: number
  }>
  history?: {
    prices: number[]
    times: number[]
  }
}

export type ProposalResponse = DerivResponse & {
  proposal?: {
    id: string
    ask_price: number
    display_value: string
    payout: number
    spot: number
    spot_time: number
    date_start: number
    date_expiry: number
    longcode: string
  }
  subscription?: { id: string }
}

export type BuyResponse = DerivResponse & {
  buy?: {
    contract_id: number
    longcode: string
    buy_price: number
    balance_after: number
    start_time: number
    transaction_id: number
    payout: number
    shortcode: string
  }
}

export type SellResponse = DerivResponse & {
  sell?: {
    sold_for: number
    balance_after: number
    transaction_id: number
  }
}

export type BalanceResponse = DerivResponse & {
  balance?: {
    balance: number
    currency: string
    loginid: string
  }
  subscription?: { id: string }
}

export type ProposalOpenContractResponse = DerivResponse & {
  proposal_open_contract?: {
    contract_id: number
    contract_type: string
    currency: string
    buy_price: number
    current_spot: number
    current_spot_time: number
    date_expiry: number
    date_start: number
    entry_spot: number
    entry_tick: number
    exit_tick?: number
    is_expired: 0 | 1
    is_sold: 0 | 1
    is_valid_to_sell: 0 | 1
    longcode: string
    payout: number
    profit: number
    profit_percentage: number
    purchase_time: number
    sell_price?: number
    sell_time?: number
    shortcode: string
    status: "open" | "won" | "lost"
    underlying: string
  }
  subscription?: { id: string }
}

// ── Candle type for TradingView ──

export type CandleData = {
  time: number // Unix timestamp in seconds
  open: number
  high: number
  low: number
  close: number
}
