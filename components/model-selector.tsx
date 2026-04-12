"use client"

import { useState, useRef, useEffect } from "react"
import { Check, ChevronDown, ChevronRight } from "lucide-react"
import { MODELS, type ModelConfig } from "@/lib/models"

export function ModelSelector({
  selected,
  onSelect,
}: {
  selected: ModelConfig
  onSelect: (model: ModelConfig) => void
}) {
  const [open, setOpen] = useState(false)
  const [showAll, setShowAll] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  // Close on outside click
  useEffect(() => {
    if (!open) return
    function handleClick(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false)
        setShowAll(false)
      }
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [open])

  // Close on Escape
  useEffect(() => {
    if (!open) return
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpen(false)
        setShowAll(false)
      }
    }
    document.addEventListener("keydown", handleKey)
    return () => document.removeEventListener("keydown", handleKey)
  }, [open])

  function selectModel(model: ModelConfig) {
    onSelect(model)
    setOpen(false)
    setShowAll(false)
  }

  return (
    <div ref={containerRef} className="relative">
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 font-heading text-xs font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
      >
        <span className="text-foreground">{selected.name}</span>
        <ChevronDown
          className={`h-3 w-3 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {/* Popover */}
      {open && (
        <div className="absolute right-0 bottom-full mb-2 z-50 w-72 rounded-xl border border-border bg-card shadow-lg">
          {/* Selected model display */}
          <div className="p-3">
            <div className="flex items-start justify-between">
              <div>
                <p className="font-heading text-sm font-medium">
                  {selected.name}
                </p>
                <p className="mt-0.5 font-body text-xs text-muted-foreground">
                  {selected.description}
                </p>
              </div>
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
            </div>
            {/* Pricing line */}
            <div className="mt-2 flex gap-3 font-mono text-[11px] text-muted-foreground">
              <span>
                <span className="text-foreground/70">{selected.inputCost}</span>{" "}
                input
              </span>
              <span>
                <span className="text-foreground/70">
                  {selected.outputCost}
                </span>{" "}
                output
              </span>
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-border" />

          {/* More models toggle / list */}
          {!showAll ? (
            <button
              type="button"
              onClick={() => setShowAll(true)}
              className="flex w-full items-center justify-between px-3 py-2.5 font-heading text-sm text-foreground transition-colors hover:bg-secondary/60"
            >
              More models
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </button>
          ) : (
            <div className="p-1.5">
              {MODELS.filter((m) => m.id !== selected.id).map((model) => (
                <button
                  key={model.id}
                  type="button"
                  onClick={() => selectModel(model)}
                  className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left transition-colors hover:bg-secondary/60"
                >
                  <div>
                    <p className="font-heading text-sm">{model.name}</p>
                    <p className="font-mono text-[11px] text-muted-foreground">
                      {model.inputCost === "Free"
                        ? "Free"
                        : `${model.inputCost} in · ${model.outputCost} out`}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
