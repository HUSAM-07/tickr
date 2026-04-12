"use client"

import { useRef, useEffect, useState, useCallback } from "react"
import type { FlowDiagramData } from "@/lib/types"

const GROUP_COLORS = ["#d97757", "#6a9bcc", "#788c5d", "#b0aea5"]

type NodePosition = { x: number; y: number; w: number; h: number }

export function WidgetFlowDiagram({ data }: { data: FlowDiagramData }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [positions, setPositions] = useState<Map<string, NodePosition>>(
    new Map()
  )

  const direction = data.direction ?? "LR"
  const isHorizontal = direction === "LR"

  // Build group assignments
  const groupIds = data.groups?.map((g) => g.id) ?? []
  const groupLabels = new Map(data.groups?.map((g) => [g.id, g.label]) ?? [])

  // Collect nodes by group
  const nodesByGroup = new Map<string, typeof data.nodes>()
  for (const node of data.nodes) {
    const gid = node.group ?? "__ungrouped__"
    if (!nodesByGroup.has(gid)) nodesByGroup.set(gid, [])
    nodesByGroup.get(gid)!.push(node)
    if (!groupIds.includes(gid) && gid !== "__ungrouped__") {
      groupIds.push(gid)
    }
  }
  // Add ungrouped at the end
  if (nodesByGroup.has("__ungrouped__") && !groupIds.includes("__ungrouped__")) {
    groupIds.push("__ungrouped__")
  }

  const groupColorMap = new Map<string, string>()
  groupIds.forEach((gid, i) => {
    groupColorMap.set(gid, GROUP_COLORS[i % GROUP_COLORS.length])
  })

  // Measure node positions after render
  const measureNodes = useCallback(() => {
    if (!containerRef.current) return
    const containerRect = containerRef.current.getBoundingClientRect()
    const newPositions = new Map<string, NodePosition>()

    containerRef.current
      .querySelectorAll<HTMLElement>("[data-node-id]")
      .forEach((el) => {
        const id = el.getAttribute("data-node-id")!
        const rect = el.getBoundingClientRect()
        newPositions.set(id, {
          x: rect.left - containerRect.left + rect.width / 2,
          y: rect.top - containerRect.top + rect.height / 2,
          w: rect.width,
          h: rect.height,
        })
      })

    setPositions(newPositions)
  }, [])

  useEffect(() => {
    // Measure after initial paint
    const raf = requestAnimationFrame(measureNodes)
    return () => cancelAnimationFrame(raf)
  }, [measureNodes])

  // Generate SVG edges
  const edges = data.edges
    .map((edge) => {
      const from = positions.get(edge.from)
      const to = positions.get(edge.to)
      if (!from || !to) return null

      let x1: number, y1: number, x2: number, y2: number

      if (isHorizontal) {
        // Connect from right side of source to left side of target
        x1 = from.x + from.w / 2
        y1 = from.y
        x2 = to.x - to.w / 2
        y2 = to.y
      } else {
        // Connect from bottom of source to top of target
        x1 = from.x
        y1 = from.y + from.h / 2
        x2 = to.x
        y2 = to.y - to.h / 2
      }

      const midX = (x1 + x2) / 2
      const midY = (y1 + y2) / 2
      const path = isHorizontal
        ? `M ${x1} ${y1} C ${midX} ${y1}, ${midX} ${y2}, ${x2} ${y2}`
        : `M ${x1} ${y1} C ${x1} ${midY}, ${x2} ${midY}, ${x2} ${y2}`

      return { ...edge, path, x2, y2, isHorizontal }
    })
    .filter(Boolean)

  return (
    <div className="my-3 overflow-hidden rounded-xl border border-border bg-card p-5">
      {data.title && (
        <h4 className="mb-4 font-heading text-sm font-medium">{data.title}</h4>
      )}

      <div ref={containerRef} className="relative overflow-x-auto">
        {/* SVG arrow overlay */}
        {positions.size > 0 && (
          <svg
            className="pointer-events-none absolute inset-0 h-full w-full"
            style={{ zIndex: 1 }}
          >
            <defs>
              <marker
                id="arrowhead"
                markerWidth="8"
                markerHeight="6"
                refX="7"
                refY="3"
                orient="auto"
              >
                <path
                  d="M0,0 L8,3 L0,6"
                  fill="none"
                  stroke="var(--color-muted-foreground)"
                  strokeWidth="1.5"
                />
              </marker>
            </defs>
            {edges.map((e, i) => (
              <g key={i}>
                <path
                  d={e!.path}
                  fill="none"
                  stroke="var(--color-muted-foreground)"
                  strokeWidth="1.5"
                  strokeDasharray="none"
                  markerEnd="url(#arrowhead)"
                  opacity={0.5}
                />
                {e!.label && (
                  <text
                    x={
                      (positions.get(data.edges[i].from)!.x +
                        positions.get(data.edges[i].to)!.x) /
                      2
                    }
                    y={
                      (positions.get(data.edges[i].from)!.y +
                        positions.get(data.edges[i].to)!.y) /
                        2 -
                      8
                    }
                    textAnchor="middle"
                    fill="var(--color-muted-foreground)"
                    fontSize="11"
                  >
                    {e!.label}
                  </text>
                )}
              </g>
            ))}
          </svg>
        )}

        {/* Node layout */}
        <div
          className={`relative flex gap-8 ${
            isHorizontal
              ? "flex-row items-start"
              : "flex-col items-center"
          }`}
          style={{ zIndex: 2 }}
        >
          {groupIds.map((gid) => {
            const nodes = nodesByGroup.get(gid) ?? []
            const label = groupLabels.get(gid)
            const color = groupColorMap.get(gid) ?? GROUP_COLORS[0]

            return (
              <div
                key={gid}
                className={`flex min-w-[120px] flex-1 ${
                  isHorizontal
                    ? "flex-col items-center gap-3"
                    : "flex-row items-center justify-center gap-3"
                }`}
              >
                {label && (
                  <p className="mb-1 font-heading text-[11px] font-medium text-muted-foreground">
                    {label}
                  </p>
                )}
                {nodes.map((node) => (
                  <div
                    key={node.id}
                    data-node-id={node.id}
                    className="rounded-lg px-4 py-2.5 text-center font-heading text-sm font-medium text-white shadow-sm"
                    style={{
                      backgroundColor: node.color ?? color,
                      minWidth: 100,
                    }}
                  >
                    {node.label}
                  </div>
                ))}
              </div>
            )
          })}
        </div>

        {/* Caption under diagram if present */}
        {data.title && data.nodes.length > 0 && (
          <p className="mt-3 text-center font-body text-xs text-muted-foreground italic">
            {data.direction === "TB" ? "Top to bottom" : "Left to right"} flow
          </p>
        )}
      </div>
    </div>
  )
}
