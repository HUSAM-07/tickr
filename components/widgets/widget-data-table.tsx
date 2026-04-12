import type { DataTableData } from "@/lib/types"

export function WidgetDataTable({ data }: { data: DataTableData }) {
  return (
    <div className="my-3 overflow-hidden rounded-xl border border-border bg-card">
      {data.title && (
        <div className="border-b border-border px-4 py-3">
          <h4 className="font-heading text-sm font-medium">{data.title}</h4>
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-secondary/50">
              {data.columns.map((col) => (
                <th
                  key={col}
                  className="px-4 py-2.5 text-left font-heading text-xs font-medium text-muted-foreground"
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.rows.map((row, i) => (
              <tr
                key={i}
                className="border-b border-border last:border-b-0 transition-colors hover:bg-secondary/30"
              >
                {data.columns.map((col) => (
                  <td
                    key={col}
                    className="px-4 py-2.5 font-body text-sm"
                  >
                    {row[col] ?? "—"}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
