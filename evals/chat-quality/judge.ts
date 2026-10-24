// Blinded pairwise judging for the chat-quality benchmark, done in a Claude
// Code session instead of through the API.
//
//   bun evals/chat-quality/judge.ts packets --flow .claude/hillclimb/chat-quality --variant v1
//     -> <flow>/judging/<variant>/packets/<id>_rep<k>.md  (A/B order randomized per packet)
//     -> <flow>/judging/<variant>/key.json                (which side is which; judges never read it)
//   judges write <flow>/judging/<variant>/verdicts/<id>_rep<k>.json per judge-rubric.md
//   bun evals/chat-quality/judge.ts merge --flow .claude/hillclimb/chat-quality --variant v1
//     -> folds verdicts into <flow>/<variant>/results.jsonl (baseline rows get the neutral 0.5)
//
// Baseline rep k is paired with variant rep k, so every rep is its own comparison.

import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  writeFileSync,
} from "node:fs"
import { join } from "node:path"
import { loadCases } from "./harness"

const CRITERIA = [
  "grounding",
  "analysis",
  "workflow",
  "safety",
  "clarity",
] as const
type Side = "baseline" | string
type Turn = { role: string; content: string; name?: string }

function arg(name: string, fallback?: string) {
  const i = process.argv.indexOf(`--${name}`)
  const v = i > 0 ? process.argv[i + 1] : fallback
  if (v == null) throw new Error(`missing --${name}`)
  return v
}

function render(turns: Turn[]) {
  return turns
    .filter((t) => t.role !== "system")
    .map((t) =>
      t.role === "tool_call"
        ? `[tool_call ${t.name}]\n${t.content}`
        : `[${t.role}]\n${t.content}`
    )
    .join("\n\n")
}

/** Fence long enough that no backtick run inside the text can close it. */
function fence(text: string) {
  const longest = Math.max(2, ...(text.match(/`+/g) ?? []).map((m) => m.length))
  const f = "`".repeat(longest + 1)
  return `${f}text\n${text}\n${f}`
}

function readRows(path: string) {
  return readFileSync(path, "utf8")
    .split("\n")
    .filter((l) => l.trim())
    .map((l) => JSON.parse(l))
}

async function packets(flow: string, variant: string) {
  const dir = join(flow, "judging", variant)
  const keyPath = join(dir, "key.json")
  if (existsSync(keyPath))
    throw new Error(`${keyPath} exists — packets were already built`)
  mkdirSync(join(dir, "packets"), { recursive: true })
  mkdirSync(join(dir, "verdicts"), { recursive: true })

  const cases = Object.fromEntries((await loadCases()).map((c) => [c.id, c]))
  const key: Record<string, { A: Side; B: Side }> = {}
  for (const file of readdirSync(join(flow, variant, "traces")).sort()) {
    const base = join(flow, "baseline", "traces", file)
    if (!existsSync(base)) continue
    const id = file.replace(/\.json$/, "")
    const c = cases[id.replace(/_rep\d+$/, "")]
    const mine = render(
      JSON.parse(readFileSync(join(flow, variant, "traces", file), "utf8"))
    )
    // The trace includes the prior turns; keep only what follows the history
    const theirs = render(JSON.parse(readFileSync(base, "utf8")))
    const strip = (t: string) => {
      const marker = `[user]\n${c.prompt}`
      const at = t.lastIndexOf(marker)
      return at >= 0 ? t.slice(at + marker.length).trimStart() : t
    }
    const variantIsA = Math.random() < 0.5
    key[id] = variantIsA
      ? { A: variant, B: "baseline" }
      : { A: "baseline", B: variant }
    const [a, b] = variantIsA
      ? [strip(mine), strip(theirs)]
      : [strip(theirs), strip(mine)]
    const history = (c.history ?? [])
      .map((h) => `[${h.role}]\n${h.content}`)
      .join("\n\n")
    writeFileSync(
      join(dir, "packets", `${id}.md`),
      [
        `# Packet ${id}`,
        `## Conversation so far\n\n${history ? fence(history) : "(none)"}`,
        `## User request\n\n${fence(c.prompt)}`,
        `## Candidate A\n\n${fence(a)}`,
        `## Candidate B\n\n${fence(b)}`,
      ].join("\n\n") + "\n"
    )
  }
  writeFileSync(keyPath, JSON.stringify(key, null, 2))
  console.log(`${Object.keys(key).length} packets -> ${join(dir, "packets")}`)
}

function merge(flow: string, variant: string) {
  const dir = join(flow, "judging", variant)
  const key: Record<string, { A: Side; B: Side }> = JSON.parse(
    readFileSync(join(dir, "key.json"), "utf8")
  )
  const score = (v: string, id: string) => {
    if (v === "tie" || v === "both_bad") return 0.5
    if (v !== "A" && v !== "B") throw new Error(`${id}: bad verdict value ${v}`)
    return key[id][v] === variant ? 1 : 0
  }

  const vPath = join(flow, variant, "results.jsonl")
  let merged = 0
  const missing: string[] = []
  const rows = readRows(vPath).map((r) => {
    const id = `${r.prompt_id}_rep${r.rep}`
    const vp = join(dir, "verdicts", `${id}.json`)
    if (!key[id] || !existsSync(vp)) {
      missing.push(id)
      return r
    }
    const v = JSON.parse(readFileSync(vp, "utf8"))
    const order =
      key[id].A === variant
        ? `${variant}=A, baseline=B`
        : `baseline=A, ${variant}=B`
    merged++
    return {
      ...r,
      grade: {
        win: score(v.overall, id),
        rules: r.grade.rules,
        ...Object.fromEntries(CRITERIA.map((c) => [c, score(v[c], id)])),
      },
      explanation: {
        ...r.explanation,
        win: `${v.overall} (${order}). ${v.explanation}`,
      },
      meta: {
        ...(r.meta ?? {}),
        judge: "in-session (Claude Code)",
        verdict: v.overall,
      },
    }
  })
  writeFileSync(vPath, rows.map((r) => JSON.stringify(r)).join("\n") + "\n")

  const bPath = join(flow, "baseline", "results.jsonl")
  const baseRows = readRows(bPath).map((r) => ({
    ...r,
    grade: {
      win: 0.5,
      rules: r.grade.rules,
      ...Object.fromEntries(CRITERIA.map((c) => [c, 0.5])),
    },
  }))
  writeFileSync(bPath, baseRows.map((r) => JSON.stringify(r)).join("\n") + "\n")

  console.log(`merged ${merged} verdicts into ${vPath}`)
  if (missing.length)
    console.log(`missing verdicts (left unscored): ${missing.join(", ")}`)
}

const [cmd] = process.argv.slice(2)
const flow = arg("flow", ".claude/hillclimb/chat-quality")
const variant = arg("variant", "v1")
if (cmd === "packets") await packets(flow, variant)
else if (cmd === "merge") merge(flow, variant)
else
  throw new Error("usage: bun judge.ts packets|merge --flow DIR --variant v<N>")
