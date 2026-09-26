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

3c. Board card date: `updated_at` on `GET /whiteboard/boards` (the later of
   the note's edit and the last node, sketch or object written), drawn as the
   Library card foot's `.library-card-when` (relative, full time on hover),
   not `ph:calendar-blank`: that icon is the note meta's in-text date chip,
   and the board's neighbours in the Library print their time without one.
   `seed-libtext.js` reads `filename` (the upload answer's field).

4a. Outline row height: density-aware (compact 25.2px kept, comfortable and
   spacious 28px, coarse pointer 44px at any density). `outlinerows.js` 4 of 4.

4b. Templates preview: two columns at 44rem and over, the page each row
   makes (`doctplpreview.js`, 7 of 7 rows, light and dark), recipe row and
   lint added.

4c. Phase 8c, the board's note card: `wb-card-editor` is a `NOTE_SURFACES`
   row; its Enter/Escape/blur/guard contract moved onto the engine first
   (`host.noteSurfaceKeys`, content-element listeners). `wbcardeditor.js` 3
   findings before, 0 after.

## Remaining, in order

(none)

## Not verified

- The Chat tab's Ask mode receives `grounding_live` too and ignores it: its
  markers still arrive with the finished answer. Wiring it is the same three
  lines as the Ask tab's, left out to keep this change to the surface reported.
- Real-model paraphrase: the fixture echoes the notes' words, so the
  letters-and-digits match is proven on formatting, not on a model that
  rewrites a sentence between the grounding pass and the render (it cannot:
  both read the same text).
