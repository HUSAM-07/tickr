import Link from "next/link"

// Pre-computed line coordinates (deterministic for SSR purity)
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
          iAI
        </Link>
        <div className="flex items-center gap-6">
          <Link
            href="/chat"
            className="rounded-full bg-primary px-5 py-2.5 text-sm font-heading font-medium text-primary-foreground transition-opacity hover:opacity-90"
          >
            Try iAI
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="px-6 pt-16 pb-20 md:px-12 md:pt-24 md:pb-28 lg:px-20 lg:pt-32 lg:pb-36">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-12 lg:grid-cols-[1.4fr_1fr] lg:gap-16 items-start">
            {/* Headline */}
            <h1 className="text-5xl font-medium leading-[1.08] tracking-tight md:text-6xl lg:text-7xl xl:text-[5.25rem]">
              The{" "}
              <span className="underline decoration-2 underline-offset-[6px]">
                interface
              </span>{" "}
              you love, the{" "}
              <span className="underline decoration-2 underline-offset-[6px]">
                models
              </span>{" "}
              you can afford
            </h1>

            {/* Description */}
            <p className="font-body text-lg leading-relaxed text-foreground/80 lg:pt-6 lg:text-xl">
              Claude&apos;s UI is beautiful. Its price isn&apos;t. iAI gives you
              the same polished experience — generative UI, inline
              visualizations, shareable chats — powered by open-source and
              budget-friendly models.
            </p>
          </div>
        </div>
      </section>

      {/* Feature Card Section */}
      <section className="px-6 pb-20 md:px-12 lg:px-20">
        <div className="mx-auto max-w-7xl">
          <div className="overflow-hidden rounded-3xl bg-primary text-primary-foreground">
            <div className="grid md:grid-cols-2">
              {/* Text Content */}
              <div className="flex flex-col justify-end p-10 md:p-14 lg:p-20">
                <h2 className="font-display text-4xl font-normal leading-[1.1] md:text-5xl lg:text-6xl xl:text-7xl">
                  Not
                  <br />
                  Claude
                </h2>
                <p className="mt-6 max-w-md font-body text-base leading-relaxed text-primary-foreground/70">
                  Same rich UI. Same generative visualizations. Different
                  economics. Open-source models at a fraction of the cost,
                  routed through OpenRouter.
                </p>
              </div>

              {/* Visual / Pattern */}
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
                        x1={x1}
                        y1={y1}
                        x2={x2}
                        y2={y2}
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

      {/* Secondary Cards */}
      <section className="px-6 pb-20 md:px-12 lg:px-20">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <FeatureCard
              title="Open models"
              description="Gemma, GLM, MiniMax — pick your model per conversation. Free tiers available. No $20/month subscription."
              href="/chat"
            />
            <FeatureCard
              title="Generative UI"
              description="Bar charts, flow diagrams, pie charts, metric cards, tables. The AI picks the visualization. You see the answer."
              href="/chat"
            />
            <FeatureCard
              title="Shareable chats"
              description="Every conversation gets a URL. Share it with anyone — they see the full exchange, visualizations included."
              href="/chat"
            />
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border px-6 py-10 md:px-12 lg:px-20">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 md:flex-row">
          <span className="font-heading text-sm text-muted-foreground">
            &copy; 2026 iAI
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

function FeatureCard({
  title,
  description,
  href,
}: {
  title: string
  description: string
  href: string
}) {
  return (
    <Link
      href={href}
      className="group rounded-2xl border border-border bg-card p-8 transition-colors hover:bg-secondary"
    >
      <h3 className="font-heading text-xl font-medium">{title}</h3>
      <p className="mt-3 font-body text-sm leading-relaxed text-muted-foreground">
        {description}
      </p>
      <span className="mt-6 inline-block font-heading text-sm font-medium text-accent transition-transform group-hover:translate-x-1">
        Learn more &rarr;
      </span>
    </Link>
  )
}
