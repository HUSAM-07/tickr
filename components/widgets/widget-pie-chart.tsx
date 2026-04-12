"use client"

import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts"
import type { PieChartData } from "@/lib/types"

const CHART_COLORS = ["#d97757", "#6a9bcc", "#788c5d", "#b0aea5", "#141413"]

export function WidgetPieChart({ data }: { data: PieChartData }) {
  return (
    <div className="my-3 overflow-hidden rounded-xl border border-border bg-card p-4">
      {data.title && (
        <h4 className="mb-3 font-heading text-sm font-medium">{data.title}</h4>
      )}
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data.data}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              outerRadius={90}
              innerRadius={45}
              paddingAngle={2}
              strokeWidth={0}
            >
              {data.data.map((_, i) => (
                <Cell
                  key={i}
                  fill={CHART_COLORS[i % CHART_COLORS.length]}
                />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                backgroundColor: "var(--color-card)",
                borderColor: "var(--color-border)",
                borderRadius: 8,
                fontSize: 13,
              }}
            />
            <Legend
              wrapperStyle={{ fontSize: 12, fontFamily: "var(--font-body)" }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
