export const tradingTools = [
  {
    type: "function" as const,
    function: {
      name: "show_trading_chart",
      description:
        "Display an interactive financial price chart for a trading instrument. Use when the user asks to see a chart, price action, market movement, or wants to visualize any trading symbol. The chart shows real-time candlesticks with live updates.",
      parameters: {
        type: "object",
        properties: {
          symbol: {
            type: "string",
            description:
              "Deriv symbol ID. Examples: 'R_75' (Volatility 75), 'R_100' (Volatility 100), 'R_50', 'R_25', 'R_10', 'frxEURUSD' (EUR/USD), 'frxGBPUSD' (GBP/USD), 'cryBTCUSD' (Bitcoin), 'cryETHUSD' (Ethereum), 'BOOM1000' (Boom 1000), 'CRASH1000' (Crash 1000), 'frxXAUUSD' (Gold)",
          },
          interval: {
            type: "string",
            enum: ["1m", "5m", "15m", "1h", "4h", "1d"],
            description: "Candle interval. Default '1m'.",
          },
          title: {
            type: "string",
            description: "Custom chart title. If omitted, symbol name is used.",
          },
          show_indicators: {
            type: "array",
            items: {
              type: "string",
              enum: ["sma_20", "sma_50", "ema_20", "bollinger"],
            },
            description: "Technical indicators to overlay on the chart.",
          },
        },
        required: ["symbol"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "analyze_market",
      description:
        "Analyze a trading instrument's recent price action and technical indicators. Call this BEFORE providing trading advice, signals, or recommendations. Returns analysis data that you should interpret and explain to the user in plain language.",
      parameters: {
        type: "object",
        properties: {
          symbol: {
            type: "string",
            description: "Deriv symbol ID (e.g. 'R_75', 'frxEURUSD')",
          },
          timeframe: {
            type: "string",
            enum: ["1m", "5m", "15m", "1h", "4h", "1d"],
            description: "Analysis timeframe. Default '5m'.",
          },
          indicators: {
            type: "array",
            items: {
              type: "string",
              enum: ["sma", "ema", "rsi", "macd", "bollinger", "atr"],
            },
            description:
              "Technical indicators to compute. Default: ['sma', 'rsi'].",
          },
        },
        required: ["symbol"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "place_trade",
      description:
        "Prepare a binary options trade for the user to confirm. NEVER execute without showing the trade ticket first. Use after discussing market conditions or when the user explicitly asks to trade.",
      parameters: {
        type: "object",
        properties: {
          symbol: {
            type: "string",
            description: "Deriv symbol ID",
          },
          contract_type: {
            type: "string",
            enum: [
              "CALL",
              "PUT",
              "DIGITMATCH",
              "DIGITDIFF",
              "DIGITOVER",
              "DIGITUNDER",
              "DIGITEVEN",
              "DIGITODD",
              "ONETOUCH",
              "NOTOUCH",
            ],
            description:
              "Contract type. CALL = Rise, PUT = Fall. Digit types for last-digit predictions.",
          },
          amount: {
            type: "number",
            description: "Stake amount in account currency (e.g. 10 for $10)",
          },
          duration: {
            type: "number",
            description: "Contract duration",
          },
          duration_unit: {
            type: "string",
            enum: ["t", "s", "m", "h", "d"],
            description:
              "Duration unit: t=ticks, s=seconds, m=minutes, h=hours, d=days",
          },
          barrier: {
            type: "string",
            description:
              "Barrier value for Touch/No Touch or specific Digit contracts",
          },
        },
        required: [
          "symbol",
          "contract_type",
          "amount",
          "duration",
          "duration_unit",
        ],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "get_portfolio",
      description:
        "Show the user's current open positions and trading performance summary. Use when they ask about their portfolio, open trades, P&L, or trading history.",
      parameters: {
        type: "object",
        properties: {
          include_history: {
            type: "boolean",
            description:
              "Whether to include recent closed trades. Default false.",
          },
        },
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "get_signals",
      description:
        "Generate and present an AI-powered trading signal based on your technical analysis. Call analyze_market first to have data, then use this to present actionable signals to the user.",
      parameters: {
        type: "object",
        properties: {
          symbol: {
            type: "string",
            description: "Deriv symbol ID",
          },
          direction: {
            type: "string",
            enum: ["CALL", "PUT"],
            description: "Signal direction: CALL (Rise) or PUT (Fall)",
          },
          confidence: {
            type: "string",
            enum: ["high", "medium", "low"],
            description: "Signal confidence level",
          },
          reasoning: {
            type: "string",
            description:
              "Brief explanation of why this signal (based on technical analysis)",
          },
          suggested_duration: {
            type: "number",
            description: "Suggested contract duration",
          },
          suggested_duration_unit: {
            type: "string",
            enum: ["t", "s", "m", "h"],
            description: "Suggested duration unit",
          },
          suggested_amount: {
            type: "number",
            description: "Suggested stake amount",
          },
          current_price: { type: "number", description: "Current price from analyze_market" },
          price_change_pct: { type: "number", description: "Price change percentage" },
          rsi: { type: "number", description: "RSI(14) value from analyze_market" },
          sma_20: { type: "number", description: "SMA(20) value" },
          sma_50: { type: "number", description: "SMA(50) value" },
          macd: {
            type: "object",
            properties: {
              macd: { type: "number" },
              signal: { type: "number" },
              histogram: { type: "number" },
            },
            description: "MACD values from analyze_market",
          },
          bollinger: {
            type: "object",
            properties: {
              upper: { type: "number" },
              middle: { type: "number" },
              lower: { type: "number" },
            },
            description: "Bollinger Bands from analyze_market",
          },
          trend: { type: "string", description: "Trend direction: bullish or bearish" },
          volatility: { type: "string", description: "Volatility level: high, medium, or low" },
          atr: { type: "number", description: "ATR(14) value" },
        },
        required: ["symbol", "direction", "confidence", "reasoning"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "show_leaderboard",
      description:
        "Display the trading leaderboard showing top traders ranked by XP, win rate, or P&L.",
      parameters: {
        type: "object",
        properties: {
          sort_by: {
            type: "string",
            enum: ["xp", "win_rate", "pnl", "streak"],
            description: "Leaderboard ranking criteria. Default 'xp'.",
          },
          limit: {
            type: "number",
            description: "Number of traders to show. Default 10.",
          },
        },
      },
    },
  },
]

export const TRADING_SYSTEM_PROMPT = `You are a trading assistant and market analyst embedded in a binary options trading platform powered by Deriv.

PERSONALITY:
- You are knowledgeable, concise, and action-oriented
- You explain market concepts clearly but never patronize
- You always show charts and data rather than describing them in text
- You proactively suggest analysis before trades
- You NEVER place trades without showing a trade ticket for user confirmation
- You celebrate wins and provide constructive analysis on losses

AVAILABLE TOOLS:

Visualization:
- show_bar_chart: for comparing categories
- show_line_chart: for trends over time
- show_pie_chart: for proportions/composition
- show_metric_card: for single key statistic/KPI
- show_data_table: for structured multi-column data
- show_flow_diagram: for processes, architectures, pipelines

Trading:
- show_trading_chart: Display interactive price charts with live candlestick data and technical indicators
- analyze_market: Fetch and compute technical analysis on a symbol (call this before giving trading advice)
- place_trade: Prepare a trade ticket for user confirmation (CALL=Rise, PUT=Fall)
- get_portfolio: Show open positions and performance
- get_signals: Present an AI trading signal with confidence level
- show_leaderboard: Display trader rankings

TRADING WORKFLOW:
1. When a user asks about a market or symbol: call show_trading_chart + analyze_market
2. When a user wants to trade: ALWAYS call analyze_market first, then place_trade
3. When showing signals: call analyze_market with indicators ["sma", "rsi", "macd", "bollinger", "atr"], interpret the results, then call get_signals and PASS ALL the indicator values (rsi, sma_20, sma_50, macd, bollinger, current_price, price_change_pct, trend, volatility, atr) from the analyze_market result into get_signals. This is CRITICAL — the signal dashboard needs the raw indicator data to render visual cards.
4. NEVER skip the trade ticket confirmation step — the user must approve every trade

MARKET KNOWLEDGE (use these EXACT symbol IDs):
- Volatility indices (24/7): R_10, R_25, R_50, R_75, R_100
- Volatility 1s indices (24/7): 1HZ10V, 1HZ25V, 1HZ50V, 1HZ75V, 1HZ100V
- Boom/Crash (NO "N" suffix): BOOM500, BOOM600, BOOM900, BOOM1000, CRASH500, CRASH600, CRASH900, CRASH1000
- Jump indices: JD10, JD25, JD50, JD75, JD100
- Forex: frxEURUSD, frxGBPUSD, frxUSDJPY, frxAUDUSD, frxEURGBP, frxGBPJPY, frxEURJPY
- Crypto: cryBTCUSD (Bitcoin), cryETHUSD (Ethereum) — NOT frxBTCUSD
- Commodities: frxXAUUSD (Gold), frxXAGUSD (Silver)
- Stock indices: OTC_NDX (US Tech 100), OTC_SPC (US 500), OTC_DJI (Wall Street 30)
- Contract types: Rise/Fall (CALL/PUT), Touch/No Touch, Digits (Match/Differ/Over/Under/Even/Odd)

IMPORTANT: Bitcoin is cryBTCUSD, Ethereum is cryETHUSD. NEVER use frxBTCUSD or frxETHUSD — those are WRONG.

RISK DISCLAIMERS:
- Remind users that binary options carry significant risk of loss
- Never guarantee profits or specific outcomes
- Suggest appropriate position sizing (1-5% of balance per trade)

GUIDELINES:
- When asked to "visualize" something, ALWAYS use a tool — never just describe it in text
- Generate realistic, illustrative data when exact data is not available
- Keep data concise: 5-10 items for charts, up to 15 rows for tables
- You can use multiple tools in one response when appropriate
- Use metric cards for single headline numbers, not charts`
