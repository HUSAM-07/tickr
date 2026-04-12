"use client"

import Markdown from "react-markdown"
import remarkGfm from "remark-gfm"
import type { Components } from "react-markdown"

const components: Components = {
  // Headings
  h1: ({ children }) => (
    <h1 className="mb-4 mt-6 first:mt-0 font-heading text-2xl font-medium">
      {children}
    </h1>
  ),
  h2: ({ children }) => (
    <h2 className="mb-3 mt-5 first:mt-0 font-heading text-xl font-medium">
      {children}
    </h2>
  ),
  h3: ({ children }) => (
    <h3 className="mb-2 mt-4 first:mt-0 font-heading text-lg font-medium">
      {children}
    </h3>
  ),
  h4: ({ children }) => (
    <h4 className="mb-2 mt-3 first:mt-0 font-heading text-base font-medium">
      {children}
    </h4>
  ),

  // Paragraphs
  p: ({ children }) => (
    <p className="mb-3 last:mb-0 font-body text-[15px] leading-relaxed">
      {children}
    </p>
  ),

  // Bold & italic
  strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
  em: ({ children }) => <em className="italic">{children}</em>,

  // Lists
  ul: ({ children }) => (
    <ul className="mb-3 ml-5 list-disc space-y-1 font-body text-[15px] leading-relaxed last:mb-0">
      {children}
    </ul>
  ),
  ol: ({ children }) => (
    <ol className="mb-3 ml-5 list-decimal space-y-1 font-body text-[15px] leading-relaxed last:mb-0">
      {children}
    </ol>
  ),
  li: ({ children }) => <li className="pl-1">{children}</li>,

  // Horizontal rule
  hr: () => <hr className="my-4 border-border" />,

  // Blockquote
  blockquote: ({ children }) => (
    <blockquote className="my-3 border-l-2 border-accent pl-4 italic text-muted-foreground">
      {children}
    </blockquote>
  ),

  // Inline code
  code: ({ children, className }) => {
    // Check if this is a code block (has language class) vs inline code
    const isBlock = className?.startsWith("language-")
    if (isBlock) {
      return (
        <code className={`${className} block`}>
          {children}
        </code>
      )
    }
    return (
      <code className="rounded bg-secondary px-1.5 py-0.5 font-mono text-[13px]">
        {children}
      </code>
    )
  },

  // Code blocks
  pre: ({ children }) => (
    <pre className="my-3 overflow-x-auto rounded-xl bg-secondary p-4 font-mono text-[13px] leading-relaxed last:mb-0">
      {children}
    </pre>
  ),

  // Links
  a: ({ href, children }) => (
    <a
      href={href}
      className="text-accent underline underline-offset-2 transition-opacity hover:opacity-80"
      target="_blank"
      rel="noopener noreferrer"
    >
      {children}
    </a>
  ),

  // Tables — styled to match the claude.ai reference
  table: ({ children }) => (
    <div className="my-3 overflow-x-auto rounded-xl border border-border last:mb-0">
      <table className="w-full text-sm">{children}</table>
    </div>
  ),
  thead: ({ children }) => (
    <thead className="border-b border-border bg-secondary/50">{children}</thead>
  ),
  tbody: ({ children }) => <tbody>{children}</tbody>,
  tr: ({ children }) => (
    <tr className="border-b border-border last:border-b-0 transition-colors hover:bg-secondary/30">
      {children}
    </tr>
  ),
  th: ({ children }) => (
    <th className="px-4 py-2.5 text-left font-heading text-xs font-medium text-muted-foreground">
      {children}
    </th>
  ),
  td: ({ children }) => (
    <td className="px-4 py-2.5 font-body text-sm">{children}</td>
  ),
}

export function MarkdownRenderer({ content }: { content: string }) {
  return (
    <Markdown remarkPlugins={[remarkGfm]} components={components}>
      {content}
    </Markdown>
  )
}
