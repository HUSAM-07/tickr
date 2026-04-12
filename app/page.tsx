import Link from "next/link"

const connectionLines: [number, number, number, number][] = [
  [120, 80, 400, 300], [250, 50, 480, 250], [80, 200, 350, 420],
  [300, 100, 520, 380], [150, 350, 450, 150], [50, 400, 280, 60],
  [380, 40, 550, 350], [200, 280, 500, 100], [100, 120, 460, 400],
  [350, 200, 180, 450], [420, 300, 90, 100], [500, 150, 200, 380],
  [70, 300, 530, 200], [300, 400, 150, 50], [450, 250, 100, 350],
]

export default function LandingPage() {
  return (
    <main className="min-h-svh">
      {/* Navigation */}
      <nav className="flex items-center justify-between px-6 py-5 md:px-12 lg:px-20">
        <Link href="/" className="font-heading text-lg font-medium tracking-tight">
          tickr
        </Link>
        <div className="flex items-center gap-6">
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
          <div className="overflow-hidden rounded-3xl bg-primary text-primary-foreground">
            <div className="grid md:grid-cols-2">
              <div className="flex flex-col justify-end p-10 md:p-14 lg:p-20">
                <h2 className="font-display text-4xl leading-[1.10] md:text-5xl lg:text-6xl">
                  Chat.
                  <br />
                  Trade.
                </h2>
                <p className="mt-6 max-w-md font-body text-base leading-[1.60] text-primary-foreground/70">
                  Live candlestick charts, technical analysis, and binary
                  options trading — all happening inside the conversation.
                  The AI is your analyst. The chat is your terminal.
                </p>
              </div>

              <div className="relative min-h-[300px] md:min-h-[400px]">
                <div className="absolute inset-0 overflow-hidden">
                  <svg
                    className="h-full w-full opacity-30"
                    viewBox="0 0 600 500"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    {Array.from({ length: 8 }).map((_, row) =>
                      Array.from({ length: 6 }).map((_, col) => {
                        const x = col * 90 + (row % 2 === 0 ? 0 : 45) + 30
                        const y = row * 65 + 30
                        return (
                          <polygon
                            key={`${row}-${col}`}
                            points={hexPoints(x, y, 32)}
                            stroke="currentColor"
                            strokeWidth="1"
                            fill="none"
                            opacity={0.4 + ((row * 6 + col) % 5) * 0.12}
                          />
                        )
                      })
                    )}
                    {connectionLines.map(([x1, y1, x2, y2], i) => (
                      <line
                        key={`line-${i}`}
                        x1={x1} y1={y1} x2={x2} y2={y2}
                        stroke="currentColor"
                        strokeWidth="0.5"
                        opacity={0.3}
                      />
                    ))}
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Use Case Cards */}
      <section className="px-6 pb-20 md:px-12 lg:px-20">
        <div className="mx-auto max-w-7xl">
          <h2 className="font-display text-2xl mb-8 md:text-3xl">Try it now</h2>
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
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

      {/* Footer */}
      <footer className="border-t border-border px-6 py-10 md:px-12 lg:px-20">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 md:flex-row">
          <span className="font-heading text-sm text-muted-foreground">
            &copy; 2026 tickr
          </span>
          <div className="flex gap-6">
            <Link
              href="/chat"
              className="font-heading text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              Chat
            </Link>
          </div>
        </div>
      </footer>
    </main>
  )
}

function hexPoints(cx: number, cy: number, r: number): string {
  return Array.from({ length: 6 })
    .map((_, i) => {
      const angle = (Math.PI / 3) * i - Math.PI / 6
      return `${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`
    })
    .join(" ")
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
