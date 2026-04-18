import Link from "next/link"
import {
  ArrowRight,
  BookOpen,
  Radio,
  Grid3x3,
  Zap,
  Link2,
  MessageSquare,
  Flame,
  Shield,
  Gauge,
} from "lucide-react"
import { SiteFooter } from "@/components/site-footer"
import { SiteNav } from "@/components/site-nav"
import {
  ChatIllustration,
  GridRushIllustration,
  ParlayIllustration,
  SpikeHunterIllustration,
  TickFeedIllustration,
} from "@/components/wiki/wiki-illustrations"

export const metadata = {
  title: "Wiki · tickr",
  description:
    "Documentation for tickr — products, game mechanics, pricing math, and the Deriv integration.",
}

type TocItem = { id: string; label: string }

const TOC: TocItem[] = [
  { id: "overview", label: "Overview" },
  { id: "products", label: "Products" },
  { id: "chat", label: "AI chat" },
  { id: "gridrush", label: "GridRush" },
  { id: "parlays", label: "Parlays" },
  { id: "spike-hunter", label: "Spike Hunter" },
  { id: "deriv", label: "Deriv API" },
  { id: "stack", label: "Tech stack" },
]

export default function WikiPage() {
  return (
    <main className="min-h-svh overflow-x-hidden">
      <SiteNav
        links={[
          { href: "/chat", label: "Start chat", outlined: true },
          { href: "/chat/ideas", label: "Browse ideas", primary: true },
        ]}
      />

      {/* Header */}
      <header className="px-6 pt-8 pb-12 md:px-12 md:pt-14 md:pb-16 lg:px-20 lg:pt-20 lg:pb-20">
        <div className="mx-auto max-w-5xl">
          <div className="inline-flex items-center gap-2 rounded-full bg-secondary px-3 py-1 font-heading text-xs font-medium text-secondary-foreground">
            <BookOpen className="h-3 w-3" />
            Wiki
          </div>
          <h1 className="mt-4 font-display text-4xl leading-[1.08] md:text-5xl lg:text-6xl">
            How tickr works
          </h1>
          <p className="mt-5 max-w-2xl font-body text-lg leading-[1.65] text-foreground/75 md:text-xl">
            A quick tour of every product on the platform — the AI chat, two
            gamified trading products, and the live Deriv tick feed that powers
            all of it. Plus the math and code choices behind the scenes.
          </p>
        </div>
      </header>

      {/* Main two-column layout: TOC + content */}
      <section className="px-6 pb-16 md:px-12 lg:px-20">
        <div className="mx-auto grid max-w-5xl gap-10 lg:grid-cols-[200px_1fr] lg:gap-14">
          {/* Sticky TOC */}
          <aside className="hidden lg:block">
            <nav className="sticky top-8 flex flex-col gap-1 border-l border-border pl-4">
              <span className="mb-2 font-heading text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                On this page
              </span>
              {TOC.map((item) => (
                <a
                  key={item.id}
                  href={`#${item.id}`}
                  className="font-heading text-sm text-muted-foreground transition-colors hover:text-foreground"
                >
                  {item.label}
                </a>
              ))}
            </nav>
          </aside>

          {/* min-w-0 lets this grid child shrink below its intrinsic content width
              (grid/flex children default to min-width:auto, which is what causes
              horizontal scroll when long code strings or formulas appear). */}
          <div className="flex min-w-0 flex-col gap-16">
            {/* Overview */}
            <Section id="overview" title="Overview" eyebrow="What is tickr?">
              <p>
                tickr is a <strong>trading-first chat platform</strong> built on
                top of Deriv&apos;s public WebSocket API. Every market you can
                see here is a real Deriv instrument — volatility indices, Boom
                / Crash synthetics, forex, crypto, metals, stock indices — and
                every number on screen is updated tick-by-tick from the
                exchange.
              </p>
              <p>
                Around that live feed, we&apos;ve built three distinct ways to
                engage: a conversational <strong>AI analyst</strong> that can
                draw charts and place trades for you, and two
                <strong> gamified prediction products</strong> that turn the
                same tick stream into something you can actually play with.
                Everything non-trading is demo-only; nothing touches real money
                unless you explicitly place a real contract in chat.
              </p>
            </Section>

            {/* Products grid */}
            <Section id="products" title="Products" eyebrow="Three surfaces, one tick feed">
              <div className="not-prose grid gap-4 md:grid-cols-3">
                <ProductCard
                  href="/chat"
                  icon={MessageSquare}
                  title="AI chat"
                  blurb="Conversational analyst — ask it for a chart, a signal, or a trade. Widgets render inline."
                />
                <ProductCard
                  href="/game"
                  icon={Grid3x3}
                  title="GridRush"
                  blurb="Tap cells on a live grid to predict which price band the market will visit."
                />
                <ProductCard
                  href="/spike"
                  icon={Zap}
                  title="Spike Hunter"
                  blurb="Bet on when the next Boom or Crash spike will hit. Timing game, Poisson math."
                />
              </div>
            </Section>

            {/* AI Chat */}
            <Section id="chat" title="AI chat" eyebrow="Your analyst, always on">
              <Illustration>
                <ChatIllustration />
              </Illustration>
              <p>
                The chat is a Next.js streaming interface wired into Claude. Ask
                it a question in plain English — &ldquo;chart EUR/USD with
                SMA&rdquo; — and the model decides which tool to call. Tool
                results render as inline widgets (candlestick charts, trade
                tickets, signal dashboards), not plain text.
              </p>
              <Feature icon={Radio} title="Live Deriv feed">
                A singleton <Code>DerivWSClient</Code> opens one WebSocket on
                mount and fans out subscriptions. Every widget reads from that
                stream — no polling, no duplicate connections.
              </Feature>
              <Feature icon={BookOpen} title="Ideas launcher">
                The <Link href="/chat/ideas" className="font-medium text-accent underline-offset-2 hover:underline">Ideas page</Link> is
                a curated gallery of prompts. Tap one and it lands straight in a
                fresh conversation — no need to type or hit send.
              </Feature>
            </Section>

            {/* GridRush */}
            <Section id="gridrush" title="GridRush" eyebrow="Spatial prediction game">
              <Illustration>
                <GridRushIllustration />
              </Illustration>
              <p>
                A 2-D grid is overlaid on a live price chart. Columns are time
                (5 s each), rows are price bands (sized by the instrument&apos;s
                volatility). Tap a cell to bet that the price will visit that
                band during that time window. If the live price touches the
                cell at any tick, you win <Code>stake × multiplier</Code>.
              </p>

              <h4>The pricing model</h4>
              <p>
                Each cell&apos;s multiplier is derived from the{" "}
                <strong>touch probability</strong> of a driftless log-GBM — the
                odds that the price passes through a narrow price band during
                [<Code>t_start</Code>, <Code>t_end</Code>]. We use the
                reflection-principle first-passage formula:
              </p>
              <Formula>
                P(touch) = 2 · Φ( − |ln(B/S₀)| / (σ·√T) )
              </Formula>
              <p>
                Where <Code>B</Code> is the nearest band edge,{" "}
                <Code>S₀</Code> the current spot, <Code>σ</Code> the annualized
                volatility, and <Code>T</Code> the window length. The displayed
                multiplier is <Code>1/P</Code>, capped by a tier (so
                sub-percent bets can&apos;t pay unbounded), and the platform
                takes a <strong>5 % margin</strong>:
              </p>
              <Formula>offered = min(1/P, cap) × (1 − margin)</Formula>

              <Feature icon={Flame} title="Streak bonus">
                Consecutive wins compound a +10 % → +50 % bonus applied to
                the next bet. A single loss resets it to zero. The mechanic is
                there to reward momentum without altering the core payout math.
              </Feature>
              <Feature icon={Shield} title="Demo-only balance">
                Every session starts at 1000 USDT virtual. Bets live in
                browser memory; nothing is sent to Deriv. You can reset at any
                time from the sidebar.
              </Feature>
            </Section>

            {/* Parlays */}
            <Section id="parlays" title="Parlays" eyebrow="Link cells for compound payouts">
              <Illustration>
                <ParlayIllustration />
              </Illustration>
              <p>
                Toggle <strong>Parlay mode</strong> in the GridRush sidebar,
                tap 2–6 cells, and submit them as a single bet. Every leg must
                win for the parlay to pay out. The trick is that the platform
                charges its 5 % margin <strong>once</strong> on the combined
                multiplier — not per leg — so parlays pay strictly more than
                the equivalent stack of independent singles:
              </p>
              <Formula>
                combined = (∏ fair_i) × (1 − margin)
              </Formula>
              <p>
                A 3-leg parlay of 2× / 2× / 3× pays <strong>13.68×</strong>
                {" "}vs <strong>10.97×</strong> from independents (~25 % more).
                If any leg refunds (no ticks in that window), the whole parlay
                refunds and your stake comes back.
              </p>
              <Feature icon={Link2} title="Skill, not just stake">
                Parlays reward pattern selection across price and time — it&apos;s
                the answer to &ldquo;bet on your bet&rdquo; that adds upside
                rather than compounding the house edge.
              </Feature>
            </Section>

            {/* Spike Hunter */}
            <Section id="spike-hunter" title="Spike Hunter" eyebrow="Timing game on Boom/Crash">
              <Illustration>
                <SpikeHunterIllustration />
              </Illustration>
              <p>
                Deriv&apos;s <strong>Boom</strong> and <strong>Crash</strong>{" "}
                indices generate uni-directional spikes at a known average
                tick interval — Boom 500 spikes once every ~500 ticks, Boom
                1000 once every ~1000, and so on. Each tick is effectively a
                weighted coin flip, which maps cleanly onto a Poisson process:
              </p>
              <Formula>
                P(spike in next N ticks) = 1 − e<sup>−N/avgInterval</sup>
              </Formula>
              <p>
                Two bet families ride on top:
              </p>
              <Feature icon={Gauge} title="Window bets">
                &ldquo;Spike in next 10 / 25 / 50 / 100 ticks&rdquo; — tighter
                windows pay more. Or the inverse: &ldquo;No spike in 50&rdquo;,
                a high-probability safe bet. Multipliers quoted live, locked
                at placement.
              </Feature>
              <Feature icon={Zap} title="Sniper shots">
                Try to hit the <em>exact</em> tick the spike lands on (±2).
                Massive payouts (25× +) because the probability is tiny — the
                math still works, the suspense is just much sharper.
              </Feature>
              <p>
                The detector uses a rolling-median outlier test on log-returns
                so it flags real spikes in real time without being poisoned by
                the spike itself. Everything resolves instantly when the spike
                hits; otherwise the round ends when the window closes.
              </p>
            </Section>

            {/* Deriv API */}
            <Section id="deriv" title="Deriv API" eyebrow="The single source of truth">
              <Illustration>
                <TickFeedIllustration />
              </Illustration>
              <p>
                Everything on tickr — every chart, every quote, every game
                outcome — is derived from Deriv&apos;s public WebSocket
                (<Code>wss://api.derivws.com/trading/v1/options/ws/public</Code>).
                We subscribe to ticks for every supported symbol on connect,
                cache the latest price in a shared <Code>MarketDataContext</Code>,
                and let every widget read from that.
              </p>
              <p>
                For the games, demo-only means no PAT token is needed — tick
                data flows through the public endpoint using a registered
                <Code>app_id</Code>. Only the chat&apos;s &ldquo;place a real
                trade&rdquo; flow would require user auth, which is opt-in per
                action.
              </p>
            </Section>

            {/* Tech stack */}
            <Section id="stack" title="Tech stack" eyebrow="Under the hood">
              <ul>
                <li><strong>Next.js 16</strong> app router, React 19, TypeScript</li>
                <li><strong>Tailwind CSS v4</strong> + shadcn/ui + lucide-react</li>
                <li><strong>Deriv WebSocket API v3</strong> singleton client with heartbeat + exponential-backoff reconnect</li>
                <li><strong>HTML5 Canvas</strong> for grid &amp; gauge rendering (imperative draw loop, no per-cell React)</li>
                <li><strong>Supabase</strong> for chat history + future gamification tables</li>
                <li><strong>Anthropic SDK</strong> streaming with tool use for inline chart / trade widgets</li>
              </ul>
              <div className="not-prose mt-6 flex flex-wrap gap-3">
                <Link
                  href="/game"
                  className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 font-heading text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
                >
                  <Grid3x3 className="h-4 w-4" /> Play GridRush
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href="/spike"
                  className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2 font-heading text-sm font-medium text-foreground transition-colors hover:bg-secondary"
                >
                  <Zap className="h-4 w-4" /> Play Spike Hunter
                </Link>
                <Link
                  href="/chat"
                  className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2 font-heading text-sm font-medium text-foreground transition-colors hover:bg-secondary"
                >
                  <MessageSquare className="h-4 w-4" /> Open chat
                </Link>
              </div>
            </Section>
          </div>
        </div>
      </section>

      <SiteFooter />
    </main>
  )
}

// ── Layout helpers ────────────────────────────────────────────────────

function Section({
  id,
  title,
  eyebrow,
  children,
}: {
  id: string
  title: string
  eyebrow?: string
  children: React.ReactNode
}) {
  return (
    <section id={id} className="scroll-mt-16">
      {eyebrow && (
        <p className="mb-2 font-heading text-[11px] font-medium uppercase tracking-wide text-accent">
          {eyebrow}
        </p>
      )}
      <h2 className="font-display text-3xl leading-tight md:text-4xl">{title}</h2>
      <div
        className="mt-5 max-w-none font-body text-[15px] leading-[1.72] text-foreground/85
                   [&_p]:my-4
                   [&_h4]:mt-8 [&_h4]:mb-2 [&_h4]:font-heading [&_h4]:text-[13px] [&_h4]:font-medium [&_h4]:uppercase [&_h4]:tracking-wide [&_h4]:text-muted-foreground
                   [&_ul]:my-4 [&_ul]:list-disc [&_ul]:pl-5
                   [&_li]:my-1 [&_li]:text-foreground/85
                   [&_strong]:font-medium [&_strong]:text-foreground
                   [&_em]:italic"
      >
        {children}
      </div>
    </section>
  )
}

function Illustration({ children }: { children: React.ReactNode }) {
  return (
    <div className="not-prose mb-6 overflow-hidden rounded-2xl border border-border bg-card">
      <div className="aspect-[16/10] w-full">{children}</div>
    </div>
  )
}

function Feature({
  icon: Icon,
  title,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>
  title: string
  children: React.ReactNode
}) {
  return (
    <div className="not-prose my-4 flex gap-4 rounded-xl border border-border bg-card p-4">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent/10 text-accent">
        <Icon className="h-4 w-4" />
      </div>
      <div>
        <h5 className="font-heading text-sm font-medium text-foreground">
          {title}
        </h5>
        <p className="mt-1 font-body text-[14px] leading-[1.6] text-foreground/75">
          {children}
        </p>
      </div>
    </div>
  )
}

function Formula({ children }: { children: React.ReactNode }) {
  return (
    <div className="not-prose my-4 overflow-x-auto rounded-lg border border-border bg-secondary/40 px-4 py-3 font-mono text-[13px] text-foreground">
      {children}
    </div>
  )
}

function Code({ children }: { children: React.ReactNode }) {
  // `break-all` so long identifiers / URLs (e.g. the full Deriv WebSocket URL)
  // wrap on narrow viewports instead of forcing horizontal scroll.
  return (
    <code className="break-all rounded bg-secondary px-1.5 py-0.5 font-mono text-[0.9em] text-foreground">
      {children}
    </code>
  )
}

function ProductCard({
  href,
  icon: Icon,
  title,
  blurb,
}: {
  href: string
  icon: React.ComponentType<{ className?: string }>
  title: string
  blurb: string
}) {
  return (
    <Link
      href={href}
      className="group flex flex-col rounded-2xl border border-border bg-card p-5 transition-colors hover:border-ring hover:bg-secondary/40"
    >
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/10 text-accent">
        <Icon className="h-5 w-5" />
      </div>
      <h3 className="mt-4 font-display text-lg">{title}</h3>
      <p className="mt-2 flex-1 font-body text-sm leading-[1.55] text-muted-foreground">
        {blurb}
      </p>
      <span className="mt-4 inline-flex items-center gap-1 font-heading text-sm text-foreground">
        Open
        <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
      </span>
    </Link>
  )
}
