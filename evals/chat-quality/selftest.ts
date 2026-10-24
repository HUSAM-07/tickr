import { gradeCase, loadCases, type Run } from "./harness"

const cases = await loadCases()
const byId = Object.fromEntries(cases.map((c) => [c.id, c]))

function mkRun(
  calls: Run["calls"],
  results: [string, Record<string, unknown>][],
  text: string,
  stop = "end_turn"
): Run {
  const transcript = [
    { role: "system" as const, content: "sys" },
    ...calls.map((c) => ({
      role: "tool_call" as const,
      name: c.name,
      content: JSON.stringify(c.input),
    })),
    ...(text ? [{ role: "assistant" as const, content: text }] : []),
  ]
  return {
    output: "[]",
    transcript,
    model: "claude-haiku-5-5",
    usage: {
      input_tokens: 0,
      output_tokens: 0,
      cache_read_input_tokens: 0,
      cache_creation_input_tokens: 0,
    },
    stop_reason: stop,
    calls,
    results: new Map(results),
    finalText: text,
    ttft_s: 1,
    api_turns: 2,
    cost_usd: 0,
  }
}

// Oracle for sig-vol50: parallel chart+analysis, grounded signal, disclaimer
const oracle = mkRun(
  [
    { turn: 0, id: "a1", name: "analyze_market", input: { symbol: "R_50" } },
    {
      turn: 0,
      id: "c1",
      name: "show_trading_chart",
      input: { symbol: "R_50", show_indicators: ["sma_20", "bollinger"] },
    },
    {
      turn: 1,
      id: "s1",
      name: "get_signals",
      input: {
        symbol: "R_50",
        direction: "CALL",
        confidence: "medium",
        reasoning: "x",
        rsi: 55.2,
        current_price: 101.5,
      },
    },
  ],
  [["a1", { market_status: "open", rsi_14: 55.2, current_price: 101.5 }]],
  "Medium-confidence rise. This is educational analysis, not financial advice."
)
// Null: empty answer, no tools
const nul = mkRun([], [], "")
// Ungrounded signal: RSI differs from the tool result
const ungrounded = mkRun(
  [
    { turn: 0, id: "a1", name: "analyze_market", input: { symbol: "R_50" } },
    {
      turn: 1,
      id: "s1",
      name: "get_signals",
      input: { symbol: "R_50", rsi: 71, current_price: 101.5 },
    },
  ],
  [["a1", { market_status: "open", rsi_14: 55.2, current_price: 101.5 }]],
  "not financial advice"
)
// Closed market + trade placed + wrong symbol scheme
const closedTrade = mkRun(
  [
    {
      turn: 0,
      id: "a1",
      name: "analyze_market",
      input: { symbol: "frxEURUSD" },
    },
    {
      turn: 0,
      id: "c1",
      name: "show_trading_chart",
      input: { symbol: "frxBTCUSD" },
    },
    {
      turn: 1,
      id: "t1",
      name: "place_trade",
      input: {
        symbol: "frxEURUSD",
        contract_type: "CALL",
        amount: 20,
        duration: 15,
        duration_unit: "m",
      },
    },
  ],
  [["a1", { market_status: "closed" }]],
  "Placed your trade."
)

for (const [label, id, run] of [
  ["oracle", "sig-vol50", oracle],
  ["null", "sig-vol50", nul],
  ["ungrounded", "sig-vol50", ungrounded],
  ["closed-trade", "trade-eurusd-weekend", closedTrade],
] as const) {
  const g = await gradeCase(byId[id], run)
  console.log(
    label.padEnd(13),
    "rules =",
    g.grade.rules.toFixed(2),
    "|",
    g.explanation.rules
  )
}
