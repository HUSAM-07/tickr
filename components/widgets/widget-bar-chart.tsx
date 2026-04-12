"use client"

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts"
import type { BarChartData } from "@/lib/types"

const CHART_COLORS = ["#d97757", "#6a9bcc", "#788c5d", "#b0aea5"]

export function WidgetBarChart({ data }: { data: BarChartData }) {
  const keys = data.keys ?? ["value"]

  return (
    <div className="my-3 overflow-hidden rounded-xl border border-border bg-card p-4">
      {data.title && (
        <h4 className="mb-3 font-heading text-sm font-medium">{data.title}</h4>
      )}
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data.data}
            margin={{ top: 8, right: 8, bottom: 4, left: 0 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="var(--color-border)"
              vertical={false}
            />
            <XAxis
              dataKey="name"
              tick={{ fontSize: 12, fill: "var(--color-muted-foreground)" }}
              axisLine={{ stroke: "var(--color-border)" }}
              tickLine={false}
              label={
                data.xLabel
                  ? {
                      value: data.xLabel,
                      position: "insideBottom",
                      offset: -2,
                      fontSize: 12,
                      fill: "var(--color-muted-foreground)",
                    }
                  : undefined
              }
            />
            <YAxis
              tick={{ fontSize: 12, fill: "var(--color-muted-foreground)" }}
              axisLine={false}
              tickLine={false}
              label={
                data.yLabel
                  ? {
                      value: data.yLabel,
                      angle: -90,
                      position: "insideLeft",
                      fontSize: 12,
                      fill: "var(--color-muted-foreground)",
                    }
                  : undefined
              }
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "var(--color-card)",
                borderColor: "var(--color-border)",
                borderRadius: 8,
                fontSize: 13,
              }}
            />
            {keys.map((key, i) => (
              <Bar
                key={key}
                dataKey={key}
                fill={CHART_COLORS[i % CHART_COLORS.length]}
                radius={[4, 4, 0, 0]}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
