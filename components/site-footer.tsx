import Link from "next/link"
import { ExternalLink } from "lucide-react"

export function SiteFooter() {
  return (
    <footer className="border-t border-border px-6 py-10 md:px-12 lg:px-20">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 md:flex-row md:items-center md:justify-between">
        <span className="font-heading text-sm text-muted-foreground">
          &copy; 2026 tickr
        </span>
        <nav className="flex flex-wrap items-center gap-x-6 gap-y-2 font-heading text-sm">
          <Link
            href="/chat"
            className="text-muted-foreground transition-colors hover:text-foreground"
          >
            Chat
          </Link>
          <Link
            href="/chat/ideas"
            className="text-muted-foreground transition-colors hover:text-foreground"
          >
            Ideas
          </Link>
          <Link
            href="/wiki"
            className="text-muted-foreground transition-colors hover:text-foreground"
          >
            Wiki
          </Link>
          <a
            href="https://terms.ihusam.tech/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-muted-foreground transition-colors hover:text-foreground"
          >
            Terms
            <ExternalLink className="h-3 w-3" />
          </a>
          <a
            href="http://mohusam.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-muted-foreground transition-colors hover:text-foreground"
          >
            Visit the author
            <ExternalLink className="h-3 w-3" />
          </a>
        </nav>
      </div>
    </footer>
  )
}
