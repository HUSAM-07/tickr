import Image from "next/image"
import Link from "next/link"
import { SiteFooter } from "@/components/site-footer"

export default function LandingPage() {
  return (
    <main className="min-h-svh">
      {/* Navigation */}
      <nav className="flex items-center justify-between px-6 py-5 md:px-12 lg:px-20">
        <Link href="/" className="font-heading text-lg font-medium tracking-tight">
          tickr
        </Link>
        <div className="flex items-center gap-3">
          <Link
            href="/wiki"
            className="hidden font-heading text-sm font-medium text-muted-foreground transition-colors hover:text-foreground md:inline-block"
          >
            Wiki
          </Link>
          <Link
            href="/spike"
            className="rounded-xl border border-border px-5 py-2.5 font-heading text-sm font-medium text-foreground transition-colors hover:bg-secondary"
          >
            Spike Hunter
          </Link>
          <Link
            href="/game"
            className="rounded-xl border border-border px-5 py-2.5 font-heading text-sm font-medium text-foreground transition-colors hover:bg-secondary"
          >
            GridRush
          </Link>
          <Link
            href="/chat"
            className="rounded-xl bg-accent px-5 py-2.5 font-heading text-sm font-medium text-accent-foreground transition-opacity hover:opacity-90"
          >
            Start trading
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="px-6 pt-16 pb-20 md:px-12 md:pt-24 md:pb-28 lg:px-20 lg:pt-32 lg:pb-36">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-12 lg:grid-cols-[1.4fr_1fr] lg:gap-16 items-start">
            <h1 className="font-display text-4xl leading-[1.10] md:text-5xl lg:text-6xl xl:text-[4rem]">
              Trade with{" "}
              <span className="underline decoration-2 underline-offset-[6px] decoration-accent">
                AI
              </span>{" "}
              — charts, signals, and{" "}
              <span className="underline decoration-2 underline-offset-[6px] decoration-accent">
                execution
              </span>{" "}
              in conversation
            </h1>

            <p className="font-body text-lg leading-[1.60] text-foreground/80 lg:pt-6 lg:text-xl">
              tickr is a trading-first chat platform. Ask the AI to analyze
              markets, show live charts, generate signals, and place trades —
              all inline, all real-time, powered by Deriv&apos;s WebSocket API.
            </p>
          </div>
        </div>
      </section>

      {/* Feature Card Section */}
      <section className="px-6 pb-20 md:px-12 lg:px-20">
        <div className="mx-auto max-w-7xl">
          <div className="relative overflow-hidden rounded-3xl">
            {/* Hero background image — centered, cover-cropped */}
            <Image
              src="/hero-banner.jpg"
              alt=""
              fill
              priority
              sizes="(min-width: 1280px) 1216px, 100vw"
              className="object-cover"
            />

            {/* Legibility overlays — mobile darkens bottom (where text sits
                when the layout stacks); desktop darkens the left half so
                the right side of the image still reads clearly. */}
            <div
              aria-hidden
              className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent md:hidden"
            />
            <div
              aria-hidden
              className="absolute inset-0 hidden bg-gradient-to-r from-black/75 via-black/45 to-transparent md:block"
            />

            {/* Content */}
            <div className="relative grid md:grid-cols-2">
              <div className="flex min-h-[360px] flex-col justify-end p-10 md:min-h-[440px] md:p-14 lg:min-h-[480px] lg:p-20">
                <h2 className="font-display text-4xl leading-[1.10] text-white md:text-5xl lg:text-6xl">
                  Chat.
                  <br />
                  Trade.
                </h2>
                <p className="mt-6 max-w-md font-body text-base leading-[1.60] text-white/80">
                  Live candlestick charts, technical analysis, and binary
                  options trading — all happening inside the conversation.
                  The AI is your analyst. The chat is your terminal.
                </p>
                <div className="mt-8 flex flex-wrap items-center gap-3">
                  <Link
                    href="/chat"
                    className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-2.5 font-heading text-sm font-medium text-black transition-opacity hover:opacity-90"
                  >
                    Start trading
                    <span>&rarr;</span>
                  </Link>
                  <Link
                    href="/chat/ideas"
                    className="inline-flex items-center gap-2 rounded-xl border border-white/40 bg-white/10 px-5 py-2.5 font-heading text-sm font-medium text-white backdrop-blur-sm transition-colors hover:bg-white/20"
                  >
                    Browse ideas
                  </Link>
                </div>
              </div>

              {/* Right column is intentionally empty — the image shows
                  through on desktop. Reserves layout space only. */}
              <div className="hidden md:block" />
            </div>
          </div>
        </div>
      </section>

      {/* Use Case Cards */}
      <section className="px-6 pb-20 md:px-12 lg:px-20">
        <div className="mx-auto max-w-7xl">
          <h2 className="font-display text-2xl mb-8 md:text-3xl">Try it now</h2>
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            <GameCard />
            <SpikeCard />
            <UseCaseCard
              title="Scan Volatility 75 for a signal"
              description="The AI analyzes RSI, MACD, Bollinger Bands, and SMA crossovers on V75 — then presents a visual signal dashboard with a confidence rating and reasoning you can act on."
              category="Signal"
              prompt="Give me a detailed trading signal on Volatility 75 Index with full technical analysis"
              cta="Get signal"
            />
            <UseCaseCard
              title="Chart EUR/USD with indicators"
              description="Instantly see a live candlestick chart of EUR/USD with SMA overlay, updating tick-by-tick. Switch timeframes from 1m to 1d. The AI explains what it sees in the price action."
              category="Charts"
              prompt="Show me a live chart of EUR/USD with SMA indicators and analyze the current trend"
              cta="Open chart"
            />
            <UseCaseCard
              title="Compare synthetic indices"
              description="Ask the AI to compare Volatility 10, 25, 50, 75, and 100 side by side — volatility levels, recent performance, and which one suits your risk appetite right now."
              category="Analysis"
              prompt="Compare Volatility 10, 25, 50, 75, and 100 indices — which has the best setup right now?"
              cta="Compare markets"
            />
          </div>
        </div>
      </section>

      <SiteFooter />
    </main>
  )
}

function GameCard() {
  return (
    <div className="flex flex-col rounded-2xl bg-primary p-6 text-primary-foreground md:p-8">
      <div className="flex-1">
        <span className="inline-block rounded-full bg-accent/90 px-2.5 py-1 font-heading text-[10px] font-medium uppercase tracking-wide text-accent-foreground">
          New · Game
        </span>
        <h3 className="mt-3 font-display text-xl leading-tight md:text-[1.4rem]">
          GridRush: tap where price goes next
        </h3>
        <p className="mt-3 font-body text-sm leading-[1.60] text-primary-foreground/70">
          A live-market grid over Deriv&apos;s synthetic indices. Tap cells to
          predict price bands in the next few seconds — each cell shows a
          dynamic payout multiplier. Consecutive wins compound a streak bonus.
        </p>
      </div>
      <div className="mt-8 space-y-0 border-t border-primary-foreground/15">
        <div className="flex items-center justify-between border-b border-primary-foreground/15 py-3">
          <span className="font-heading text-[11px] font-medium uppercase tracking-wide text-primary-foreground/60">
            Category
          </span>
          <span className="font-heading text-sm">Prediction game</span>
        </div>
        <div className="flex items-center justify-between py-3">
          <span className="font-heading text-[11px] font-medium uppercase tracking-wide text-primary-foreground/60">
            Type
          </span>
          <span className="font-heading text-sm">Demo only</span>
        </div>
      </div>
      <Link
        href="/game"
        className="mt-5 inline-flex w-fit items-center gap-2 rounded-xl bg-accent px-5 py-2.5 font-heading text-sm font-medium text-accent-foreground transition-opacity hover:opacity-90"
      >
        Play now
        <span>&rarr;</span>
      </Link>
    </div>
  )
}

function SpikeCard() {
  return (
    <div className="flex flex-col rounded-2xl border border-border bg-card p-6 md:p-8">
      <div className="flex-1">
        <span className="inline-block rounded-full bg-accent/15 px-2.5 py-1 font-heading text-[10px] font-medium uppercase tracking-wide text-accent">
          New · Game
        </span>
        <h3 className="mt-3 font-display text-xl leading-tight md:text-[1.4rem]">
          Spike Hunter: time the next Boom or Crash
        </h3>
        <p className="mt-3 font-body text-sm leading-[1.60] text-muted-foreground">
          Deriv&apos;s Boom &amp; Crash indices spike at a known average
          interval. Pick a window for when the next one will hit — tight
          windows pay big, wide windows pay safe. Each round is seconds of
          pure anticipation.
        </p>
      </div>
      <div className="mt-8 space-y-0 border-t border-border">
        <div className="flex items-center justify-between border-b border-border py-3">
          <span className="font-heading text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            Category
          </span>
          <span className="font-heading text-sm">Timing game</span>
        </div>
        <div className="flex items-center justify-between py-3">
          <span className="font-heading text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            Type
          </span>
          <span className="font-heading text-sm">Demo only</span>
        </div>
      </div>
      <Link
        href="/spike"
        className="mt-5 inline-flex w-fit items-center gap-2 rounded-xl bg-primary px-5 py-2.5 font-heading text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
      >
        Hunt a spike
        <span>&rarr;</span>
      </Link>
    </div>
  )
}

function UseCaseCard({
  title,
  description,
  category,
  prompt,
  cta,
}: {
  title: string
  description: string
  category: string
  prompt: string
  cta: string
}) {
  return (
    <div className="flex flex-col rounded-2xl bg-secondary p-6 md:p-8">
      {/* Content area */}
      <div className="flex-1">
        <h3 className="font-display text-xl leading-tight md:text-[1.4rem]">{title}</h3>
        <p className="mt-3 font-body text-sm leading-[1.60] text-muted-foreground">
          {description}
        </p>
      </div>

      {/* Metadata rows */}
      <div className="mt-8 space-y-0 border-t border-border">
        <div className="flex items-center justify-between border-b border-border py-3">
          <span className="font-heading text-[11px] font-medium uppercase text-muted-foreground tracking-wide">
            Category
          </span>
          <span className="font-heading text-sm">{category}</span>
        </div>
        <div className="flex items-center justify-between py-3">
          <span className="font-heading text-[11px] font-medium uppercase text-muted-foreground tracking-wide">
            Type
          </span>
          <span className="font-heading text-sm">Interactive</span>
        </div>
      </div>

      {/* CTA button */}
      <Link
        href={`/chat?q=${encodeURIComponent(prompt)}`}
        className="mt-5 inline-flex w-fit items-center gap-2 rounded-xl bg-primary px-5 py-2.5 font-heading text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
      >
        {cta}
        <span className="transition-transform group-hover:translate-x-0.5">&rarr;</span>
      </Link>
    </div>
  )
}
