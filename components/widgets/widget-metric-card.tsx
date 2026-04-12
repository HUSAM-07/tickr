import { ArrowUp, ArrowDown, Minus } from "lucide-react"
import type { MetricCardData } from "@/lib/types"

const changeStyles = {
  positive: "text-[#788c5d]",
  negative: "text-[#d97757]",
  neutral: "text-muted-foreground",
}

const changeIcons = {
  positive: ArrowUp,
  negative: ArrowDown,
  neutral: Minus,
}

export function WidgetMetricCard({ data }: { data: MetricCardData }) {
  const changeType = data.changeType ?? "neutral"
  const ChangeIcon = changeIcons[changeType]

  return (
    <div className="my-3 overflow-hidden rounded-xl border border-border bg-card p-5">
      <p className="font-heading text-sm text-muted-foreground">
        {data.label}
      </p>
      <div className="mt-1 flex items-baseline gap-3">
        <span className="font-heading text-3xl font-medium tracking-tight">
          {data.value}
        </span>
        {data.change && (
          <span
            className={`flex items-center gap-0.5 font-heading text-sm font-medium ${changeStyles[changeType]}`}
          >
            <ChangeIcon className="h-3.5 w-3.5" />
            {data.change}
          </span>
        )}
      </div>
      {data.description && (
        <p className="mt-2 font-body text-sm text-muted-foreground">
          {data.description}
        </p>
      )}
    </div>
  )
}
