// Case runner + graders for the chat-quality benchmark. Wired into run-eval.mjs
// (the eval runner scaffold); run it with bun so the @/ path aliases resolve:
//
//   bun evals/chat-quality/run-eval.mjs --flow .claude/hillclimb/chat-quality \
//     --variant baseline --model claude-sonnet-5-5 --reps 2
//   bun evals/chat-quality/run-eval.mjs --flow .claude/hillclimb/chat-quality \
//     --variant v1 --model claude-haiku-5-5 --reps 2
//
// runCase drives the production agent loop (lib/chat/agent.ts) — same system
// prompt, tools, effort, and caching as /api/chat — with one test seam: data
// tool results are memoized to <flow>/fixtures so every model sees the same
// market snapshot for the same tool call.

import { createHash } from "node:crypto"
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import Anthropic from "@anthropic-ai/sdk"
import { annotateMacd, executeTool, runAgent } from "@/lib/chat/agent"
import { SYSTEM_PROMPT } from "@/lib/tools"

type Check =
  | { type: "chart"; symbol: string }
  | { type: "parallel" }
  | { type: "calls"; tool: string }
  | { type: "forbid"; tool: string }
  | { type: "disclaimer" }
  | { type: "signals_grounded" }
  | { type: "indicator"; symbol: string; indicator: string }
  | { type: "trade"; fields: Record<string, string | number> }
  | { type: "text_any"; label: string; any: string[] }

type Case = {
  id: string
  tags: string[]
  prompt: string
  history?: { role: "user" | "assistant"; content: string }[]
  checks: Check[]
}

type ToolCall = {
  turn: number
  id: string
  name: string
  input: Record<string, unknown>
}

type Turn = {
  role: "system" | "user" | "assistant" | "tool_call" | "tool_result"
  content: string
  name?: string
}

type Usage = {
  input_tokens: number
  output_tokens: number
  cache_read_input_tokens: number
  cache_creation_input_tokens: number
}

export type Run = {
  output: string
  transcript: Turn[]
  model: string
  usage: Usage
  stop_reason: string | null
  calls: ToolCall[]
  results: Map<string, Record<string, unknown>>
  finalText: string
  ttft_s: number | null
  api_turns: number
  cost_usd: number
}

const HERE = dirname(fileURLToPath(import.meta.url))

/** First-party $/MTok. Cache writes bill at 1.25x input, cache reads at 0.1x. */
const PRICES: Record<string, { in: number; out: number }> = {
  "claude-sonnet-5-5": { in: 2, out: 10 },
  "claude-haiku-5-5": { in: 0.1, out: 0.5 },
  "claude-opus-5-5": { in: 4, out: 20 },
}

export function costOf(model: string, u: Usage): number {
  const p = PRICES[model]
  if (!p) throw new Error(`no price for ${model}`)
  return (
    (u.input_tokens * p.in +
      u.cache_creation_input_tokens * p.in * 1.25 +
      u.cache_read_input_tokens * p.in * 0.1 +
      u.output_tokens * p.out) /
    1e6
  )
}

/** Symbols listed in the system prompt's instrument catalog. */
const CATALOG = new Set(
  [
    ...["R_10", "R_25", "R_50", "R_75", "R_100"],
    ...["1HZ10V", "1HZ25V", "1HZ50V", "1HZ75V", "1HZ100V"],
    ...["BOOM500", "BOOM600", "BOOM900", "BOOM1000"],
    ...["CRASH500", "CRASH600", "CRASH900", "CRASH1000"],
    ...["JD10", "JD25", "JD50", "JD75", "JD100"],
    ...["stpRNG", "stpRNG2", "stpRNG3", "RDBULL", "RDBEAR"],
    ...["frxEURUSD", "frxGBPUSD", "frxUSDJPY", "frxAUDUSD"],
    ...["frxUSDCAD", "frxEURGBP", "frxEURJPY", "frxGBPJPY"],
    ...["cryBTCUSD", "cryETHUSD", "frxXAUUSD", "frxXAGUSD"],
    ...["OTC_NDX", "OTC_SPC", "OTC_DJI", "OTC_FTSE", "OTC_GDAXI", "OTC_N225"],
  ].map((s) => s.toLowerCase())
)

const SYMBOL_TOOLS = new Set([
  "show_trading_chart",
  "analyze_market",
  "place_trade",
  "get_signals",
])

/** All cases, or only the comma-separated ids in BENCH_CASES (for a pilot). */
export async function loadCases(): Promise<Case[]> {
  const cases: Case[] = JSON.parse(readFileSync(join(HERE, "cases.json"), "utf8"))
  const only = process.env.BENCH_CASES?.split(",").filter(Boolean)
  return only ? cases.filter((c) => only.includes(c.id)) : cases
}

function stableStringify(v: unknown): string {
  if (Array.isArray(v)) return `[${v.map(stableStringify).join(",")}]`
  if (v && typeof v === "object")
    return `{${Object.keys(v)
      .sort()
      .map(
        (k) =>
          `${JSON.stringify(k)}:${stableStringify((v as Record<string, unknown>)[k])}`
      )
      .join(",")}}`
  return JSON.stringify(v)
}

/** executeTool with data-tool results memoized to disk, so every variant replays one snapshot. */
function fixtureTool(flow: string) {
  const dir = join(flow, "fixtures")
  mkdirSync(dir, { recursive: true })
  return async (name: string, input: unknown) => {
    if (name !== "analyze_market" && name !== "web_search")
      return executeTool(name, input)
    const key = createHash("sha256")
      .update(name + "\0" + stableStringify(input))
      .digest("hex")
      .slice(0, 24)
    const path = join(dir, `${name}-${key}.json`)
    if (existsSync(path)) {
      const saved = JSON.parse(readFileSync(path, "utf8"))
      if (saved.error) throw new Error(saved.error)
      // Replay the raw snapshot through today's post-processing, as a live call would get it
      return name === "analyze_market" ? annotateMacd(saved.result) : saved.result
    }
    try {
      const result = await executeTool(name, input)
      writeFileSync(path, JSON.stringify({ name, input, result }, null, 2))
      return result
    } catch (err) {
      // Record failures too (e.g. a symbol with no data) so every variant sees the same error
      const error = err instanceof Error ? err.message : String(err)
      writeFileSync(path, JSON.stringify({ name, input, error }, null, 2))
      throw err
    }
  }
}

export async function runCase(
  input: Case,
  ctx: { model: string; flow: string; effort?: string }
): Promise<Run> {
  const messages: Anthropic.MessageParam[] = [
    ...(input.history ?? []),
    { role: "user", content: input.prompt },
  ]
  const t0 = Date.now()
  let ttft: number | null = null

  const { responses, conversation } = await runAgent({
    model: ctx.model,
    messages,
    effort: (ctx.effort ?? "medium") as "medium",
    runTool: fixtureTool(ctx.flow),
    onEvent: (e) => {
      if (e.type === "text_delta" && ttft == null)
        ttft = (Date.now() - t0) / 1000
    },
  })

  const served = new Set(responses.map((r) => r.model))
  if (served.size !== 1)
    throw Object.assign(new Error(`mixed served models: ${[...served]}`), {
      failure_class: "serving_substitution",
    })

  const usage: Usage = {
    input_tokens: 0,
    output_tokens: 0,
    cache_read_input_tokens: 0,
    cache_creation_input_tokens: 0,
  }
  for (const r of responses) {
    usage.input_tokens += r.usage.input_tokens
    usage.output_tokens += r.usage.output_tokens
    usage.cache_read_input_tokens += r.usage.cache_read_input_tokens ?? 0
    usage.cache_creation_input_tokens +=
      r.usage.cache_creation_input_tokens ?? 0
  }

  // Walk the conversation into the report's Turn[] shape, collecting tool calls and results
  const transcript: Turn[] = [{ role: "system", content: SYSTEM_PROMPT }]
  const calls: ToolCall[] = []
  const results = new Map<string, Record<string, unknown>>()
  let apiTurn = -1
  for (const [i, m] of conversation.entries()) {
    const blocks =
      typeof m.content === "string"
        ? [{ type: "text" as const, text: m.content }]
        : m.content
    if (m.role === "assistant" && i >= (input.history?.length ?? 0)) apiTurn++
    for (const b of blocks) {
      if (b.type === "text" && b.text.trim())
        transcript.push({ role: m.role, content: b.text })
      else if (b.type === "tool_use") {
        const inp = b.input as Record<string, unknown>
        calls.push({ turn: apiTurn, id: b.id, name: b.name, input: inp })
        transcript.push({
          role: "tool_call",
          name: b.name,
          content: JSON.stringify(inp, null, 2),
        })
      } else if (b.type === "tool_result") {
        const text =
          typeof b.content === "string" ? b.content : JSON.stringify(b.content)
        try {
          results.set(b.tool_use_id, JSON.parse(text))
        } catch {}
        transcript.push({ role: "tool_result", content: text })
      }
    }
  }

  const last = responses.at(-1)!
  const finalText = last.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("\n")
  const model = last.model

  return {
    // Frozen pairwise reference: everything after the system prompt
    output: JSON.stringify(transcript.slice(1)),
    transcript,
    model,
    usage,
    stop_reason: last.stop_reason,
    calls,
    results,
    finalText,
    ttft_s: ttft,
    api_turns: responses.length,
    cost_usd: costOf(model, usage),
  }
}

// --- Rule checks: objective, derived from the system prompt -----------------

const DISCLAIMER = /not financial advice/i

function symbolOf(c: ToolCall) {
  return String(c.input.symbol ?? "").toLowerCase()
}

function runChecks(input: Case, run: Run): { name: string; pass: boolean }[] {
  const out: { name: string; pass: boolean }[] = []
  const text = run.transcript
    .filter((t) => t.role === "assistant")
    .slice(
      input.history
        ? input.history.filter((h) => h.role === "assistant").length
        : 0
    )
    .map((t) => t.content)
    .join("\n")
  const called = (name: string) => run.calls.filter((c) => c.name === name)

  for (const ch of input.checks) {
    switch (ch.type) {
      case "chart":
        out.push({
          name: `chart ${ch.symbol}`,
          pass: called("show_trading_chart").some(
            (c) => symbolOf(c) === ch.symbol.toLowerCase()
          ),
        })
        break
      case "parallel": {
        const turns = (n: string) => new Set(called(n).map((c) => c.turn))
        const chart = turns("show_trading_chart")
        out.push({
          name: "chart ∥ analyze_market",
          pass: [...turns("analyze_market")].some((t) => chart.has(t)),
        })
        break
      }
      case "calls":
        out.push({ name: `calls ${ch.tool}`, pass: called(ch.tool).length > 0 })
        break
      case "forbid":
        out.push({ name: `no ${ch.tool}`, pass: called(ch.tool).length === 0 })
        break
      case "disclaimer":
        out.push({ name: "disclaimer", pass: DISCLAIMER.test(text) })
        break
      case "indicator":
        out.push({
          name: `${ch.indicator} on ${ch.symbol}`,
          pass: called("show_trading_chart").some(
            (c) =>
              symbolOf(c) === ch.symbol.toLowerCase() &&
              Array.isArray(c.input.show_indicators) &&
              (c.input.show_indicators as string[]).includes(ch.indicator)
          ),
        })
        break
      case "trade":
        out.push({
          name: "trade ticket fields",
          pass: called("place_trade").some((c) =>
            Object.entries(ch.fields).every(([k, v]) =>
              typeof v === "string"
                ? String(c.input[k] ?? "").toLowerCase() === v.toLowerCase()
                : Number(c.input[k]) === v
            )
          ),
        })
        break
      case "text_any":
        out.push({
          name: ch.label,
          pass: ch.any.some((s) =>
            text.toLowerCase().includes(s.toLowerCase())
          ),
        })
        break
      case "signals_grounded": {
        // get_signals must carry the same RSI / price analyze_market returned for that symbol
        const sig = called("get_signals")
        const pass =
          sig.length > 0 &&
          sig.every((s) =>
            called("analyze_market").some((a) => {
              const r = run.results.get(a.id)
              if (!r || symbolOf(a) !== symbolOf(s)) return false
              const near = (x: unknown, y: unknown) =>
                x == null ||
                y == null ||
                Math.abs(Number(x) - Number(y)) <= Math.abs(Number(y)) * 0.001
              return (
                near(s.input.rsi, r.rsi_14) &&
                near(s.input.current_price, r.current_price)
              )
            })
          )
        out.push({ name: "signal uses analyze_market data", pass })
        break
      }
    }
  }

  // Applied to every case
  out.push({
    name: "catalog symbols only",
    pass: run.calls
      .filter((c) => SYMBOL_TOOLS.has(c.name))
      .every((c) => CATALOG.has(symbolOf(c))),
  })
  const closed = run.calls
    .filter((c) => c.name === "analyze_market")
    .filter((c) => {
      const s = run.results.get(c.id)?.market_status
      return s === "closed" || s === "suspended"
    })
    .map(symbolOf)
  if (closed.length > 0) {
    out.push({
      name: "no trade on closed market",
      pass: !called("place_trade").some((c) => closed.includes(symbolOf(c))),
    })
    out.push({
      name: "says market closed",
      pass: /closed|suspended/i.test(text),
    })
  }
  out.push({
    name: "finished with an answer",
    pass: run.stop_reason === "end_turn" && run.finalText.trim().length > 0,
  })
  return out
}

// Pairwise quality judging happens outside the runner, in a Claude Code session:
// judge.ts builds blinded A/B packets from baseline and v<N> traces, judges
// write verdicts against judge-rubric.md, and judge.ts merges them into the
// win/criteria metrics. The runner grades only the objective rule checks.

export async function gradeCase(input: Case, run: Run) {
  const checks = runChecks(input, run)
  const failed = checks.filter((c) => !c.pass).map((c) => c.name)
  return {
    grade: { rules: checks.filter((c) => c.pass).length / checks.length },
    explanation: {
      rules: failed.length
        ? `failed: ${failed.join(", ")}`
        : "all checks passed",
    },
  }
}

export function perfFrom(run: Run) {
  return {
    ttft_s: run.ttft_s,
    tool_calls: run.calls.length,
    api_turns: run.api_turns,
    cost_usd: Number(run.cost_usd.toFixed(5)),
  }
}
