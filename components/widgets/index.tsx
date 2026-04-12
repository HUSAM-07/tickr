"use client"

import type {
  WidgetPart,
  BarChartData,
  LineChartData,
  PieChartData,
  MetricCardData,
  DataTableData,
  FlowDiagramData,
  TradingChartData,
  TradeTicketData,
  PortfolioData,
  SignalCardData,
  LeaderboardData,
} from "@/lib/types"
import { WidgetBarChart } from "./widget-bar-chart"
import { WidgetLineChart } from "./widget-line-chart"
import { WidgetPieChart } from "./widget-pie-chart"
import { WidgetMetricCard } from "./widget-metric-card"
import { WidgetDataTable } from "./widget-data-table"
import { WidgetFlowDiagram } from "./widget-flow-diagram"
import { WidgetTradingChart } from "./widget-trading-chart"
import { WidgetTradeTicket } from "./widget-trade-ticket"
import { WidgetPortfolio } from "./widget-portfolio"
import { WidgetSignalCard } from "./widget-signal-card"
import { WidgetLeaderboard } from "./widget-leaderboard"

export function Widget({ part }: { part: WidgetPart }) {
  switch (part.widgetType) {
    case "bar_chart":
      return <WidgetBarChart data={part.data as BarChartData} />
    case "line_chart":
      return <WidgetLineChart data={part.data as LineChartData} />
    case "pie_chart":
      return <WidgetPieChart data={part.data as PieChartData} />
    case "metric_card":
      return <WidgetMetricCard data={part.data as MetricCardData} />
    case "data_table":
      return <WidgetDataTable data={part.data as DataTableData} />
    case "flow_diagram":
      return <WidgetFlowDiagram data={part.data as FlowDiagramData} />
    case "trading_chart":
      return <WidgetTradingChart data={part.data as TradingChartData} />
    case "trade_ticket":
      return <WidgetTradeTicket data={part.data as TradeTicketData} />
    case "portfolio":
      return <WidgetPortfolio data={part.data as PortfolioData} />
    case "signal_card":
      return <WidgetSignalCard data={part.data as SignalCardData} />
    case "leaderboard":
      return <WidgetLeaderboard data={part.data as LeaderboardData} />
    default:
      return null
  }
}
