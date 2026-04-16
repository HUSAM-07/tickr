"use client"

import { useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import {
  Search,
  CandlestickChart,
  Zap,
  Trophy,
  Briefcase,
  BookOpen,
  DollarSign,
  ArrowRight,
  Gem,
  Bitcoin,
  Shield,
  Scale,
  type LucideIcon,
} from "lucide-react"

type Category = "All" | "Charts" | "Signals" | "Analysis" | "Trading" | "Learning"

type BentoSize = "sm" | "md" | "lg"

type Idea = {
  title: string
  prompt: string
  category: Category
  icon?: LucideIcon
  badge?: string
  /** Bento card size — lg = 2×2, md = 2×1 wide, sm = 1×1 */
  size: BentoSize
  /** Short description shown on larger cards */
  description?: string
}

const IDEAS: Idea[] = [
  // ── Charts ──
  {
    title: "Gold vs Silver — who's outperforming?",
    prompt: "Show me charts of Gold/USD and Silver/USD side by side and compare their recent performance, momentum, and which one is showing more strength right now",
    category: "Charts",
    icon: Gem,
    size: "lg",
    description: "Head-to-head precious metals comparison — price action, momentum, and relative strength at a glance.",
  },
  {
    title: "Bitcoin 4-hour candles with Bollinger Bands",
    prompt: "Show me a BTC/USD chart on 4h timeframe with Bollinger Bands overlay and tell me if price is at the upper band, lower band, or squeezing",
    category: "Charts",
    icon: Bitcoin,
    size: "md",
    description: "Spot volatility squeezes and band walks on Bitcoin's 4-hour chart.",
  },
  {
    title: "Chart Volatility 75 with SMA overlay",
    prompt: "Show me a live chart of Volatility 75 Index with SMA indicators",
    category: "Charts",
    icon: CandlestickChart,
    size: "sm",
  },
  {
    title: "Ethereum on 15-minute candles",
    prompt: "Show me ETH/USD on a 15-minute chart with recent price action and key support/resistance levels",
    category: "Charts",
    size: "sm",
  },
  {
    title: "Gold intraday on 5-minute candles",
    prompt: "Show me Gold/USD on 5m candles — highlight any breakout patterns or consolidation zones forming right now",
    category: "Charts",
    size: "sm",
  },
  {
    title: "View Boom 1000 on 5-minute candles",
    prompt: "Show me Boom 1000 Index chart on 5m timeframe",
    category: "Charts",
    size: "sm",
  },
  {
    title: "Crash 500 price action breakdown",
    prompt: "Show me a live chart of Crash 500 Index on 1m timeframe and describe the recent price action patterns — are spikes increasing or decreasing in frequency?",
    category: "Charts",
    size: "md",
    description: "Analyze spike frequency and patterns on the Crash 500 to time your entries.",
  },
  {
    title: "BTC vs ETH — which crypto is leading?",
    prompt: "Show me BTC/USD and ETH/USD charts and compare their trends, momentum, and relative strength — which one is leading the move?",
    category: "Charts",
    size: "sm",
  },

  // ── Signals ──
  {
    title: "Gold trading signal with multi-indicator confluence",
    prompt: "Analyze Gold/USD with RSI, MACD, SMA 20/50 crossover, and Bollinger Bands — give me a trading signal only if at least 3 indicators agree on direction",
    category: "Signals",
    icon: Gem,
    badge: "Popular",
    size: "lg",
    description: "High-confidence gold signal using multi-indicator confluence — only triggers when 3+ indicators align.",
  },
  {
    title: "Bitcoin momentum signal",
    prompt: "Analyze BTC/USD with RSI, MACD, and volume trend — is momentum building for a breakout or is it fading? Give me a clear signal with entry level",
    category: "Signals",
    icon: Bitcoin,
    size: "md",
    description: "Momentum-based BTC signal — catches breakouts before they happen.",
  },
  {
    title: "Best signal across all volatility indices",
    prompt: "Analyze Volatility 10, 25, 50, 75, and 100 — which one has the strongest signal right now? Show me the analysis for the winner",
    category: "Signals",
    icon: Trophy,
    size: "sm",
  },
  {
    title: "Silver scalping signal",
    prompt: "Give me a quick scalping signal on Silver/USD — 1-minute timeframe, RSI + Bollinger Bands, with tight entry and exit levels",
    category: "Signals",
    size: "sm",
  },
  {
    title: "Ethereum RSI divergence check",
    prompt: "Check ETH/USD for any RSI divergence on the 15-minute and 1-hour charts — is there a hidden bullish or bearish divergence forming?",
    category: "Signals",
    size: "sm",
  },
  {
    title: "Scalping signal on V100 (1-minute)",
    prompt: "Give me a quick scalping signal on Volatility 100 Index for a 1-minute trade",
    category: "Signals",
    size: "sm",
  },
  {
    title: "EUR/USD signal with RSI and MACD",
    prompt: "Analyze EUR/USD with RSI, MACD, and Bollinger Bands, then give me a trading signal with entry, stop-loss, and take-profit",
    category: "Signals",
    size: "md",
    description: "Classic forex signal with full risk parameters for the world's most traded pair.",
  },
  {
    title: "V75 signal with full technical analysis",
    prompt: "Give me a detailed trading signal on Volatility 75 Index with full technical analysis including entry, stop-loss, and take-profit",
    category: "Signals",
    icon: Zap,
    size: "sm",
  },

  // ── Analysis ──
  {
    title: "Gold safe-haven analysis",
    prompt: "Run a full technical analysis on Gold/USD — SMA, RSI, MACD, Bollinger Bands, and ATR. Also tell me: is gold acting as a safe haven right now based on its price trend vs stock indices?",
    category: "Analysis",
    icon: Gem,
    size: "lg",
    description: "Deep technical dive into Gold with a macro lens — is the safe-haven bid active or fading?",
  },
  {
    title: "Bitcoin support and resistance map",
    prompt: "Analyze BTC/USD and identify the 3 strongest support levels and 3 strongest resistance levels based on recent price action, then tell me which zone price is most likely to test next",
    category: "Analysis",
    icon: Bitcoin,
    size: "md",
    description: "Key BTC levels mapped out — know where the walls are before you trade.",
  },
  {
    title: "Gold-to-Silver ratio analysis",
    prompt: "Compare Gold/USD and Silver/USD — calculate the approximate gold-to-silver price ratio and tell me if silver is historically cheap or expensive relative to gold. Which is the better trade right now?",
    category: "Analysis",
    icon: Scale,
    size: "md",
    description: "The classic metals ratio trade — find out if silver is undervalued relative to gold.",
  },
  {
    title: "Is ETH/USD overbought or oversold?",
    prompt: "Analyze ETH/USD RSI on multiple timeframes (5m, 15m, 1h) and Bollinger Bands — is it overbought, oversold, or neutral? What's the highest-probability next move?",
    category: "Analysis",
    size: "sm",
  },
  {
    title: "Compare volatility levels across indices",
    prompt: "Compare Volatility 10, 25, 50, 75, and 100 indices — show their ATR, volatility, and recent trends in a table",
    category: "Analysis",
    size: "sm",
  },
  {
    title: "Detect trend reversals on GBP/USD",
    prompt: "Analyze GBP/USD with MACD and SMA crossovers — are there any trend reversal signals?",
    category: "Analysis",
    size: "sm",
  },
  {
    title: "BTC volatility regime — trending or ranging?",
    prompt: "Analyze BTC/USD ATR and Bollinger Band width over the last 24 hours — is Bitcoin in a high-volatility trending regime or a low-volatility range? How should I adjust my strategy?",
    category: "Analysis",
    size: "sm",
  },

  // ── Trading ──
  {
    title: "Rise trade on Gold for $10",
    prompt: "I want to place a Rise trade on Gold/USD for $10 with 5 minutes duration — show me the current price, payout, and confirm before executing",
    category: "Trading",
    icon: DollarSign,
    badge: "Action",
    size: "md",
    description: "Quick gold trade — $10 Rise contract with 5-minute expiry. Review payout before confirming.",
  },
  {
    title: "Trade BTC/USD Rise for $5",
    prompt: "Place a Rise trade on BTC/USD for $5 with 15 minutes duration — show me the current setup and payout first",
    category: "Trading",
    icon: Bitcoin,
    size: "sm",
  },
  {
    title: "Trade Digit Match on V10",
    prompt: "Place a Digit Match trade on Volatility 10 Index, predicting digit 5, for $5",
    category: "Trading",
    size: "sm",
  },
  {
    title: "Show my portfolio and open positions",
    prompt: "Show my portfolio, open positions, and recent trade history with P&L breakdown",
    category: "Trading",
    icon: Briefcase,
    size: "sm",
  },
  {
    title: "Place a Fall trade on Silver",
    prompt: "I want to place a Fall trade on Silver/USD for $10 with 5 minutes duration — show me the setup and payout before confirming",
    category: "Trading",
    size: "sm",
  },
  {
    title: "View the trading leaderboard",
    prompt: "Show the trading leaderboard sorted by XP",
    category: "Trading",
    size: "sm",
  },
  {
    title: "Rise trade on V75 for $10",
    prompt: "I want to place a Rise trade on Volatility 75 for $10 with 5 ticks duration",
    category: "Trading",
    size: "sm",
  },

  // ── Learning ──
  {
    title: "How to trade Gold like a pro",
    prompt: "Teach me how professional traders approach Gold/USD — what drives gold prices, what timeframes work best, what indicators are most reliable for gold, and common mistakes to avoid",
    category: "Learning",
    icon: Gem,
    size: "lg",
    description: "Master the fundamentals of gold trading — drivers, timeframes, indicators, and the mistakes that burn beginners.",
  },
  {
    title: "Bitcoin trading for beginners",
    prompt: "I'm new to crypto trading. Explain how BTC/USD works on Deriv — what moves the price, how is it different from forex, what are the best times to trade, and what contract types work best for crypto",
    category: "Learning",
    icon: Bitcoin,
    size: "md",
    description: "Everything a crypto beginner needs — price drivers, optimal sessions, and the right contract types.",
  },
  {
    title: "What are synthetic indices?",
    prompt: "Explain what synthetic indices are on Deriv — how do Volatility 10, 25, 50, 75, 100 work and what makes them different from forex?",
    category: "Learning",
    size: "md",
    description: "Learn what makes synthetics unique — available 24/7 with fixed volatility levels.",
  },
  {
    title: "Explain Rise/Fall contract types",
    prompt: "Explain how Rise/Fall (Call/Put) binary options work on Deriv, with examples",
    category: "Learning",
    icon: BookOpen,
    size: "sm",
  },
  {
    title: "How to read RSI and MACD indicators",
    prompt: "Teach me how to read RSI and MACD indicators — what do overbought, oversold, crossovers mean? Show examples with a chart",
    category: "Learning",
    size: "sm",
  },
  {
    title: "Risk management for binary options",
    prompt: "What are the best risk management strategies for binary options trading? How should I size my positions and manage losing streaks?",
    category: "Learning",
    icon: Shield,
    size: "sm",
  },
  {
    title: "Gold vs Bitcoin as a hedge",
    prompt: "Compare Gold and Bitcoin as hedging instruments — which is better for preserving value during market uncertainty? How do they correlate with stock markets?",
    category: "Learning",
    size: "sm",
  },
  {
    title: "Understanding commodity price drivers",
    prompt: "Explain what drives Gold and Silver prices — interest rates, dollar strength, inflation, supply/demand. How can I use this knowledge to time my trades better?",
    category: "Learning",
    size: "md",
    description: "The macro forces behind precious metals — use fundamentals to give your technical trades an edge.",
  },
]

const CATEGORIES: Category[] = ["All", "Charts", "Signals", "Analysis", "Trading", "Learning"]

const CATEGORY_COLORS: Record<Category, string> = {
  All: "bg-primary/10 text-primary",
  Charts: "bg-brand-blue/15 text-brand-blue",
  Signals: "bg-brand-orange/15 text-brand-orange",
  Analysis: "bg-brand-green/15 text-brand-green",
  Trading: "bg-brand-terracotta/15 text-brand-terracotta",
  Learning: "bg-primary/10 text-primary",
}

export default function IdeasPage() {
  const router = useRouter()
  const [activeCategory, setActiveCategory] = useState<Category>("All")
  const [searchQuery, setSearchQuery] = useState("")

  const filtered = useMemo(() => {
    let items = IDEAS
    if (activeCategory !== "All") {
      items = items.filter((i) => i.category === activeCategory)
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      items = items.filter(
        (i) =>
          i.title.toLowerCase().includes(q) ||
          i.category.toLowerCase().includes(q) ||
          i.description?.toLowerCase().includes(q)
      )
    }
    return items
  }, [activeCategory, searchQuery])

  function handleSelect(prompt: string) {
    router.push(`/chat?q=${encodeURIComponent(prompt)}`)
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="mx-auto max-w-5xl px-4 py-6 md:px-8 md:py-10">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="font-display text-3xl md:text-4xl">Ideas</h1>
            <p className="mt-1 font-heading text-sm text-muted-foreground">
              Tap an idea to start a conversation
            </p>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search ideas..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-10 w-full rounded-xl border border-border bg-card pl-10 pr-4 font-heading text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring md:w-64"
            />
          </div>
        </div>

        {/* Category pills */}
        <div className="-mx-4 mt-6 overflow-x-auto px-4 md:mx-0 md:px-0 scrollbar-none">
          <div className="flex items-center gap-1.5 w-max md:w-auto">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`shrink-0 rounded-full px-4 py-1.5 font-heading text-sm transition-all ${
                  activeCategory === cat
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Bento grid */}
        <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {filtered.map((idea) => (
            <BentoCard
              key={idea.title}
              idea={idea}
              onSelect={() => handleSelect(idea.prompt)}
            />
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="mt-20 text-center">
            <p className="font-heading text-sm text-muted-foreground">
              No ideas match your search.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

function BentoCard({ idea, onSelect }: { idea: Idea; onSelect: () => void }) {
  const Icon = idea.icon
  const isLarge = idea.size === "lg"
  const isMedium = idea.size === "md"
  const colorClass = CATEGORY_COLORS[idea.category]

  return (
    <button
      onClick={onSelect}
      className={`group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-border bg-card p-5 text-left transition-all duration-200 hover:border-ring hover:bg-secondary/50 hover:shadow-md ${
        isLarge
          ? "sm:col-span-2 sm:row-span-2 sm:p-7"
          : isMedium
            ? "sm:col-span-2 sm:p-6"
            : ""
      }`}
    >
      {/* Top row: icon + badge */}
      <div className="flex items-start justify-between gap-3">
        {Icon ? (
          <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${colorClass}`}>
            <Icon className="h-4 w-4" />
          </div>
        ) : (
          <div />
        )}

        <div className="flex items-center gap-2">
          {idea.badge && (
            <span className="rounded-full bg-accent/15 px-2.5 py-0.5 font-heading text-[10px] font-medium text-accent">
              {idea.badge}
            </span>
          )}
          <span className={`rounded-full px-2.5 py-0.5 font-heading text-[10px] font-medium ${colorClass}`}>
            {idea.category}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className={`mt-4 flex flex-1 flex-col ${isLarge ? "mt-6" : ""}`}>
        <h3 className={`font-display leading-snug ${isLarge ? "text-lg md:text-xl" : "text-[14px] md:text-[15px]"}`}>
          {idea.title}
        </h3>

        {idea.description && (isLarge || isMedium) && (
          <p className={`mt-2 font-body text-sm leading-relaxed text-muted-foreground ${isLarge ? "mt-3 text-sm md:text-[15px]" : ""}`}>
            {idea.description}
          </p>
        )}
      </div>

      {/* Bottom arrow — appears on hover */}
      <div className={`mt-4 flex items-center justify-end ${isLarge ? "mt-6" : ""}`}>
        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-secondary text-muted-foreground opacity-0 transition-all duration-200 group-hover:opacity-100 group-hover:translate-x-0.5">
          <ArrowRight className="h-3.5 w-3.5" />
        </div>
      </div>
    </button>
  )
}
