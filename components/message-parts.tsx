"use client"

import type { MessagePart } from "@/lib/types"
import { Widget } from "@/components/widgets"
import { MarkdownRenderer } from "@/components/markdown-renderer"

export function MessageParts({ parts }: { parts: MessagePart[] }) {
  return (
    <>
      {parts.map((part, i) => {
        if (part.type === "text") {
          return <MarkdownRenderer key={i} content={part.content} />
        }
        if (part.type === "widget") {
          return <Widget key={part.toolCallId} part={part} />
        }
        return null
      })}
    </>
  )
}
