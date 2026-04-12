"use client"

import { useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import {
  Search,
  CandlestickChart,
  TrendingUp,
  Zap,
  Trophy,
  Briefcase,
  BookOpen,
  DollarSign,
  type LucideIcon,
} from "lucide-react"

type Category = "All" | "Charts" | "Signals" | "Analysis" | "Trading" | "Learning"

type Idea = {
  title: string
  prompt: string
  category: Category
  icon?: LucideIcon
  badge?: string
}

const IDEAS: Idea[] = [
  // Charts
  {
    title: "Chart Volatility 75 with SMA overlay",
    prompt: "Show me a live chart of Volatility 75 Index with SMA indicators",
    category: "Charts",
    icon: CandlestickChart,
  },
  {
    title: "Compare EUR/USD and GBP/USD side by side",
    prompt: "Show me charts of EUR/USD and GBP/USD and compare their current trends",
    category: "Charts",
  },
  {
    title: "View Boom 1000 on 5-minute candles",
    prompt: "Show me Boom 1000 Index chart on 5m timeframe",
    category: "Charts",
  },
  {
    title: "Visualize Crash 500 price action",
    prompt: "Show me a live chart of Crash 500 Index on 1m timeframe and describe the recent price action",
    category: "Charts",
  },

  // Signals
  {
    title: "Get a trading signal on V75",
    prompt: "Give me a detailed trading signal on Volatility 75 Index with full technical analysis",
    category: "Signals",
    icon: Zap,
    badge: "Popular",
  },
  {
    title: "Signal for EUR/USD with RSI and MACD",
    prompt: "Analyze EUR/USD with RSI, MACD, and Bollinger Bands, then give me a trading signal",
    category: "Signals",
  },
  {
    title: "Best signal across all volatility indices",
    prompt: "Analyze Volatility 10, 25, 50, 75, and 100 — which one has the strongest signal right now?",
    category: "Signals",
    icon: Trophy,
  },
  {
    title: "Scalping signal on V100 (1-minute)",
    prompt: "Give me a quick scalping signal on Volatility 100 Index for a 1-minute trade",
    category: "Signals",
  },

  // Analysis
  {
    title: "Full technical analysis on V50",
    prompt: "Run a full technical analysis on Volatility 50 Index with SMA, RSI, MACD, Bollinger Bands, and ATR",
    category: "Analysis",
    icon: TrendingUp,
  },
  {
    title: "Compare volatility levels across indices",
    prompt: "Compare Volatility 10, 25, 50, 75, and 100 indices — show their ATR, volatility, and recent trends in a table",
    category: "Analysis",
  },
  {
    title: "Is EUR/USD overbought or oversold?",
    prompt: "Analyze EUR/USD RSI and Bollinger Bands — is it overbought or oversold right now?",
    category: "Analysis",
  },
  {
    title: "Detect trend reversals on GBP/USD",
    prompt: "Analyze GBP/USD with MACD and SMA crossovers — are there any trend reversal signals?",
    category: "Analysis",
  },

  // Trading
  {
    title: "Place a Rise trade on V75 for $10",
    prompt: "I want to place a Rise trade on Volatility 75 for $10 with 5 ticks duration",
    category: "Trading",
    icon: DollarSign,
    badge: "Action",
  },
  {
    title: "Trade Digit Match on V10",
    prompt: "Place a Digit Match trade on Volatility 10 Index, predicting digit 5, for $5",
    category: "Trading",
  },
  {
    title: "Show my portfolio and open positions",
    prompt: "Show my portfolio and trading performance",
    category: "Trading",
    icon: Briefcase,
  },
  {
    title: "View the trading leaderboard",
    prompt: "Show the trading leaderboard sorted by XP",
    category: "Trading",
  },

  // Learning
  {
    title: "Explain Rise/Fall contract types",
    prompt: "Explain how Rise/Fall (Call/Put) binary options work on Deriv, with examples",
    category: "Learning",
    icon: BookOpen,
  },
  {
    title: "What are synthetic indices?",
    prompt: "Explain what synthetic indices are on Deriv — how do Volatility 10, 25, 50, 75, 100 work and what makes them different from forex?",
    category: "Learning",
  },
  {
    title: "How to read RSI and MACD indicators",
    prompt: "Teach me how to read RSI and MACD indicators — what do overbought, oversold, crossovers mean? Show examples with a V75 chart",
    category: "Learning",
  },
  {
    title: "Risk management for binary options",
    prompt: "What are the best risk management strategies for binary options trading? How should I size my positions?",
    category: "Learning",
  },
]

const CATEGORIES: Category[] = ["All", "Charts", "Signals", "Analysis", "Trading", "Learning"]

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
          i.category.toLowerCase().includes(q)
      )
    }
    return items
  }, [activeCategory, searchQuery])

  function handleSelect(prompt: string) {
    router.push(`/chat?q=${encodeURIComponent(prompt)}`)
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="mx-auto max-w-4xl px-4 py-6 md:px-6 md:py-10">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <h1 className="font-display text-3xl md:text-4xl">Ideas</h1>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-10 w-full rounded-xl border border-border bg-card pl-10 pr-4 font-heading text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring md:w-64"
            />
          </div>
        </div>

        {/* Category tabs */}
        <div className="mt-6 flex items-center gap-1 overflow-x-auto">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`shrink-0 rounded-xl px-4 py-1.5 font-heading text-sm transition-colors ${
                activeCategory === cat
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Ideas grid — masonry-style with 3 columns */}
        <div className="mt-8 columns-1 gap-3 sm:columns-2 lg:columns-3">
          {filtered.map((idea) => (
            <button
              key={idea.title}
              onClick={() => handleSelect(idea.prompt)}
              className="mb-3 flex w-full break-inside-avoid flex-col rounded-2xl border border-border bg-card p-5 text-left transition-colors hover:bg-secondary"
            >
              <p className="font-display text-[15px] leading-snug">
                {idea.title}
              </p>

              <div className="mt-4 flex items-center justify-between">
                {idea.icon ? (
                  <idea.icon className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <span />
                )}
                <div className="flex items-center gap-2">
                  {idea.badge && (
                    <span className="rounded-md bg-accent/10 px-2 py-0.5 font-heading text-[10px] font-medium text-accent">
                      {idea.badge}
                    </span>
                  )}
                  <span className="rounded-lg bg-secondary px-2.5 py-0.5 font-heading text-[11px] text-muted-foreground">
                    {idea.category}
                  </span>
                </div>
              </div>
            </button>
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="mt-16 text-center">
            <p className="font-heading text-sm text-muted-foreground">
              No ideas match your search.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
