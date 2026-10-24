# Haiku 5.5 switch + quality benchmark

## Plan
- [x] Branch `feat/claude-haiku-5-5` off main (PR #24 merged)
- [x] Switch app model to `claude-haiku-5-5`; drop server-side fallback (not supported on Haiku 5.5)
- [x] Extract agent loop to `lib/chat/agent.ts` so the route and the benchmark run identical code
- [x] Benchmark harness: `evals/chat-quality/` (cases, rule checks, blind pairwise Opus 5.5 judge, tool fixtures)
- [x] Offline grader self-test (oracle 1.00, null/ungrounded/closed-trade fail the right checks)
- [x] Sign-off: 27 cases as-is; rules + in-session blinded pairwise judging (no API judge); Sonnet vs Haiku, medium, 2 reps
- [x] `ANTHROPIC_API_KEY` in `.env` (BRAVE_API_KEY still a placeholder)
- [x] Pilot (3 cases × 1 rep × 2 models): 6/6 ok, rules 100% both; Sonnet ~$0.045/case, Haiku ~$0.0026/case
- [x] Approval of full-run cost (~$2.60 est.)
- [x] Full run: 108/108 ok, 0 errors, $1.79 actual API spend
- [x] 54 blinded verdicts judged in-session (6 subagents), merged; report at .claude/hillclimb/chat-quality/report.html

## Review
- Pairwise (Haiku vs Sonnet): Sonnet 32, Haiku 10, tie 12, both_bad 0 → Haiku win score 0.30 (95% CI 0.19–0.42, case bootstrap)
- Per criterion (Haiku W-L-T): grounding 10-15-29, analysis 9-22-23, workflow 3-13-38, safety 3-15-36, clarity 2-26-26
- Rule checks: Sonnet 54/54, Haiku 53/54 (held a Rise ticket on bearish data — judgment call)
- Cost/turn: Sonnet $0.031 mean, Haiku $0.0018 mean (~17x cheaper); latency median 11.1s vs 10.2s; first text 8.1s vs 6.2s
- Harness findings (affect both models):
  - Negative-value MACD misread (line vs signal) decided ~16 packets, split across both models → add a precomputed MACD cross/bias field to analyze_market
  - Chat history replays assistant text only (no tool data) → models treat earlier analysis as ungrounded
  - BRAVE_API_KEY placeholder → web_search 422 in news cases; news quality not measured


## v2 — precomputed MACD line-vs-signal field (Haiku, same frozen Sonnet baseline)
- analyze_market now returns macd.line_vs_signal + macd.bias (lib/chat/agent.ts annotateMacd); fixtures replayed through it
- 54/54 ok, $0.10; field present in 40/40 MACD results
- Sonnet 26 / Haiku 16 / tie 12 → Haiku win score 0.41 (95% CI 0.29–0.53), up from 0.30
- Paired per-case delta +0.11 (95% CI +0.02 to +0.20): 10 cases improved, 4 worse, 13 same
- MACD-error-decided losses for Haiku: 5 → 1; Sonnet (no field) still lost 7 that way
- Caveat: baseline Sonnet ran without the field, so v2 is Haiku+fix vs Sonnet-without-fix; judges could see which side had the field
