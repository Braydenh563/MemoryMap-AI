# Agent: Ask citations, segmented radius, library leftovers

Worktree cut from `fix/gemini-fixes-5`. Port 8796, data dir `/tmp/mm-agentA2`
(`bash scratchpad/ui-sweeps/serve.sh 8796 /tmp/mm-agentA2`); the fake answer
server on 8798 (`FAKE_STYLE=markdown FAKE_DELAY_MS=30`).

## Done

1. INBOX 318 and 320 (Ask citations): markers dropped by the renderer, not
   declined by grounding; grounding now incremental. Numbers in HISTORY's
   "INBOX resolved" entries for 318 and 320.

2. Segmented-control radius table and lint: `--radius-choice`,
   `--radius-strip`, DESIGN.md's table, `test_a_segmented_track_is_rounded_by_the_table`;
   `segradius.js` 0 off-table across 28 tracks. The toolbar toggles keep the
   bar's corner (one corner per row), not folded; reason in HISTORY.

3a. Boards & maps dock at 390: 198px to 114px (`libdocks390.js`, all eight
   Library docks 114px). `foldDockActions` (app.js) moves a dock action
   marked `data-fold-narrow` into the dock's menu below 600px; New board
   keeps its icon there. Unfold on resize measured (1440 row restored).

3b. INBOX 394 (h) and (a): pills to `--radius-md` / `--radius-sm`, no
   dashed skill pills, no chip hover lift, `PILL_CONTROLS` lint; Ask chips one
   style with a clock icon. `pills.js` 90 to 5 (allowed). Screens after in
   light and dark, before in light only (`/tmp/a2-scratch/shots`).

## Remaining, in order

3. Library leftovers: board cards show no date (`updated` on the boards API, rendered like
   the notes cards' date); `scratchpad/seed-libtext.js` writes "undefined"
   alt text.
4. From `openitems.md` "For the orchestrator": board card Phase 8c, the
   templates preview, the outline row height. Measure each first.

## Not verified

- The Chat tab's Ask mode receives `grounding_live` too and ignores it: its
  markers still arrive with the finished answer. Wiring it is the same three
  lines as the Ask tab's, left out to keep this change to the surface reported.
- Real-model paraphrase: the fixture echoes the notes' words, so the
  letters-and-digits match is proven on formatting, not on a model that
  rewrites a sentence between the grounding pass and the render (it cannot:
  both read the same text).
