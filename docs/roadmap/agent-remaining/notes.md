# notes agent, 2026-09-14

Port 8802, data dir `/tmp/mm-notes`, branch `agent/wip-notes`.
Items, in order: 239, 240, 241, 238, 232.

## Landed

- 239, the table full view has no way out. `3dc956e`, docs `c1e0bd8`.
  `frontend/app.js` `buildTableBlock` (an X in the bar, focus in and out) and
  `wireEscapedActionMenu`'s `place()` (an escaped menu is lifted one tier above
  its opener's surface), `frontend/css/05-sidebars-themes.css` (the seam after
  the menu wrap), `scratchpad/ui-sweeps/tablefullclose.js` (new).
  Measured: the X is 28x28 at the head's right edge, border 0px, ground
  transparent, reachable; Back read back as `DIV.md-table-wrap` under the
  pointer before (menu 1020 under panel 2400) and `BUTTON.menu-item` after
  (2401 over 2400); all three exits land the focus back on the opener.
- 240, the Writing Room boxes shrink on focus. `bf1452e`.
  `frontend/documents.js` `mountNoteSurface`, `frontend/css/09-editor.css`
  (`.note-surface-stretch`), `scratchpad/ui-sweeps/draftboxes.js` (new).
  Measured: 330.3 to 146 before (both boxes, a loss of 184.3), 330.3 to 339.9
  and 330.3 to 330.0 after, columns level at 468, an 80-line draft scrolls
  inside its box without growing it. The capture box is 176 to 176, unchanged.

- 241, Ask citations do not persist. `ae2a12f`.
  `src/memorymap/core/database.py` (`AskTurn.grounding`),
  `migrations/versions/d3b7c2a91e45_ask_turn_grounding.py`,
  `src/memorymap/api/routes_chat.py` (`_save_ask_turn`),
  `routes_ask_history.py` (`_live_grounding`), `frontend/app.js`
  (`viewAskHistoryTurn`), `tests/test_ask_history.py` (two),
  `tests/test_ask_answer_object.py` (one),
  `scratchpad/ui-sweeps/askhistorycite.js` and `scratchpad/seed_ask_turn.py`
  (new). Measured: a reopened turn draws 1 in-text marker, 1 grounded-in chip,
  the foot and sources panel with 1 card, 0 console errors. The reload half is
  answered in the INBOX entry: an Ask answer has never survived a reload at
  all, so the way back is the history panel, which now carries everything.
- The full suite run after 241 found one failure, fixed in `38a572a`:
  `tests/test_inline_citations.py::test_every_grounding_call_site_passes_the_answer_element`
  enumerates the surfaces that call `renderAnswerGrounding` and 241 adds a
  fourth (the history panel). The rule is unchanged and still enforced, every
  call site passes an answer element; the inventory names the new surface, and
  its docstring says why a fifth has to come back to it. Nothing else in the
  suite failed. A clean re-run was started and had not finished at the
  deadline: `/tmp/mm-notes/fullsuite2.log`.

## Next

Cut short by the PR deadline (the orchestrator, 2026-09-14). 238 and 232 are
untouched: no code was written for either, so the tree holds no half-finished
work. What the reading found is below so the next session starts at the change.

1. **238, board and map note objects.** INBOX 238, still open. Three parts.
   - *The text leaves the card.* A card's size is stored
     (`WhiteboardNode.width/height`) and written as an inline `width`/`height`
     in `renderWhiteboard` (`frontend/whiteboard.js` around 12695), and
     `.wb-card` (`frontend/css/06-timeline-dialogs.css` around 3169) has no
     `overflow`, so expanding past `.wb-card-content-clamped`'s 8-line clamp
     (around 3274) spills the note over the border. Recommended fix, not yet
     made: `overflow: hidden` on `.wb-card`, and an expanded
     `.wb-card-content` gets `flex: 1 1 auto; min-height: 0; overflow-y: auto`
     so a long note scrolls inside the card the reader sized. Measure
     `scrollHeight` against the card's own rect before and after.
   - *The expanded state does not persist.* `wbExpandedNodes`
     (whiteboard.js around 167) is a module-level `Set` keyed by node id, and
     its own comment says it is deliberately not persisted. `WhiteboardNode`
     (`src/memorymap/core/database.py` around 1128) has no JSON column, so
     this wants a boolean column plus a migration (the shape
     `migrations/versions/d3b7c2a91e45_ask_turn_grounding.py` uses, guard
     included) and the node PATCH route accepting it.
   - *The export.* Checked and **not** reproduced as stated: the SVG and PNG
     exports build from the data, not the DOM (`wbBuildExportSvg`, whiteboard.js
     around 7888), so "Show more"/"Show less" cannot reach them; the Markdown,
     OPML and FreeMind exports are rendered server-side from the map objects
     (`routes_whiteboard.py` `export_board`, around 3204). What is real is the
     other half of the owner's sentence: a note card exports as
     `notePreviewText(entry.content).slice(0, 160)`, truncated whether or not
     the card is expanded, so the warning he asks for is owed, and the
     truncation itself is worth raising with him as the actual bug. Reproduce
     an export and grep it for "Show more" before writing any code.
2. **232, the documents live view's markdown**, code blocks first: hide the
   fence marker lines when the caret is outside the block, a header row with
   the language and a copy button, and check tables, blockquotes and task
   lists. `frontend/documents.js` live plugin plus `frontend/css/09-editor.css`.
   Untouched, nothing read yet.
3. **246, boards and maps on a note.** Not to be built now, by the
   orchestrator's instruction; the facts are filed in
   `docs/roadmap/agent-remaining/OPEN.md` under "Notes and capture", and INBOX
   246 stays open.

## Found, not fixed

- `scratchpad/ui-sweeps/tablefull.js` fails on `top bar clusters`: the header
  clusters' ground reads `rgba(0, 0, 0, 0)` where the sweep wants a tint. Not
  this agent's surface (chrome), and present before any change here.
- `scratchpad/ui-sweeps/notesurface.js` fails from its first assertion: it
  never opens Documents, and documents.js is lazy now, so the note surface it
  is measuring never mounts. The sweep needs a `switchTab('documents')` first,
  the same line `draftboxes.js` carries and explains. Not this agent's item.

## Not verified

- Nothing in full view was checked at phone width: the X is 28x28, which is
  under `--target-min`, the same size as the bar's other buttons at 1440. The
  bar's phone rules were not measured.
- The Writing Room was measured at 1440x900 light only, and only for the two
  boxes in `NOTE_SURFACES`. The graph's two note boxes take the same stretch
  path and were not opened.
