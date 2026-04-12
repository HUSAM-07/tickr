/* ── Message Parts ── */

export type TextPart = {
  type: "text"
  content: string
}

export type BarChartData = {
  title?: string
  xLabel?: string
  yLabel?: string
  data: Array<{ name: string; value: number; [key: string]: string | number }>
  keys?: string[]
}

export type LineChartData = {
  title?: string
  xLabel?: string
  yLabel?: string
  data: Array<{ name: string; [key: string]: string | number }>
  keys: string[]
}

export type MetricCardData = {
  label: string
  value: string | number
  change?: string
  changeType?: "positive" | "negative" | "neutral"
  description?: string
}

export type DataTableData = {
  title?: string
  columns: string[]
  rows: Array<Record<string, string | number>>
}

export type PieChartData = {
  title?: string
  data: Array<{ name: string; value: number }>
}

export type FlowDiagramData = {
  title?: string
  nodes: Array<{ id: string; label: string; group?: string; color?: string }>
  edges: Array<{ from: string; to: string; label?: string }>
  groups?: Array<{ id: string; label: string }>
  direction?: "LR" | "TB"
}

/* ── Trading Widget Data Types ── */

export type TradingChartData = {
  symbol: string
  interval?: string
  title?: string
  show_indicators?: string[]
}

export type TradeTicketData = {
  symbol: string
  contract_type: string
  amount: number
  duration: number
  duration_unit: string
  barrier?: string
}

export type PortfolioData = {
  include_history?: boolean
}

export type SignalCardData = {
  symbol: string
  direction: "CALL" | "PUT"
  confidence: "high" | "medium" | "low"
  reasoning: string
  suggested_duration?: number
  suggested_duration_unit?: string
  suggested_amount?: number
  // Indicator data for bento dashboard (populated by LLM from analyze_market results)
  current_price?: number
  price_change_pct?: number
  rsi?: number
  sma_20?: number
  sma_50?: number
  macd?: { macd: number; signal: number; histogram: number }
  bollinger?: { upper: number; middle: number; lower: number }
  trend?: string
  volatility?: string
  atr?: number
}

export type LeaderboardData = {
  sort_by?: "xp" | "win_rate" | "pnl" | "streak"
  limit?: number
}

export type WidgetType =
  | "bar_chart"
  | "line_chart"
  | "metric_card"
  | "data_table"
  | "pie_chart"
  | "flow_diagram"
  | "trading_chart"
  | "trade_ticket"
  | "portfolio"
  | "signal_card"
  | "leaderboard"

export type WidgetData =
  | BarChartData
  | LineChartData
  | MetricCardData
  | DataTableData
  | PieChartData
  | FlowDiagramData
  | TradingChartData
  | TradeTicketData
  | PortfolioData
  | SignalCardData
  | LeaderboardData

export type WidgetPart = {
  type: "widget"
  widgetType: WidgetType
  data: WidgetData
  toolCallId: string
}

export type MessagePart = TextPart | WidgetPart

export type Message = {
  id: string
  role: "user" | "assistant"
  parts: MessagePart[]
}

/* ── Conversations ── */

export type Conversation = {
  id: string
  title: string
  created_at: string
  updated_at: string
  messages: Message[]
}

export type ConversationSummary = {
  id: string
  title: string
  created_at: string
  updated_at: string
}

/* ── SSE Events ── */

export type SSETextDelta = { type: "text_delta"; content: string }
export type SSEWidgetEvent = {
  type: "widget"
  toolCallId: string
  widgetType: WidgetType
  data: WidgetData
}
export type SSEErrorEvent = { type: "error"; message: string }

export type SSEEvent = SSETextDelta | SSEWidgetEvent | SSEErrorEvent
