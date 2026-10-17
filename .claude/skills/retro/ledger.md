# Retro ledger

One line per session, newest last. The `retro` skill appends and reads it.

date | branch | tier | orchestrator | turns | ctx/turn | cost split r/w/o | agents | delivered | waste signal | rule changed
--- | --- | --- | --- | --- | --- | --- | --- | --- | --- | ---
2026-10-17 | claude/lucid-johnson-qr3fpf | max | sonnet then opus | 34 | 172k | 40/50/10 | 0 | workflow policy, 4 agents, usage report, retro | ctx/turn 172k, mostly the session's plugin and skill listing | baseline, none
2026-10-17 | claude/test-hygiene-pass | max | sonnet | 71 | 148k | 70/19/11 (subagents 675 turns, 80/19/1) | 8 (2 haiku, 6 sonnet) | test hygiene: fixed clocks, 32 dated files folded, 5 groups merged, shared file list, PR 181 | about 12 of 71 orchestrator turns were wake-ups for duplicate or interim agent hand-backs (one agent sent its final report 6 times because a child gate.sh was still running); ctx/turn 148k | none (first line of this signal)
2026-10-17 | claude/lean-workflow-tessellate-extend-f3uu1q | max | sonnet | 20 | 127k | 44/35/21 | 0 | lean-workflow 1.1.0, PR 186 | ctx/turn 127k, mostly plugin and skill listing (same as line 1); one 26k-char batched cat | none (listing is a /prune matter, not a repo rule)
