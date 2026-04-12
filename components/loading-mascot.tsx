"use client"

import { MascotCharacter } from "./mascot-icon"

export function LoadingMascot() {
  return (
    <div className="flex items-center gap-3 py-2">
      <MascotCharacter size={36} />
      <span className="font-heading text-sm text-muted-foreground animate-pulse">
        Thinking...
      </span>
    </div>
  )
}
