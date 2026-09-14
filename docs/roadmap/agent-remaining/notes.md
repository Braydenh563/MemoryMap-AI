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

## Next

1. 238, board and map note objects: expanded text overflows the panel border,
   the expanded state must persist with the object, export warns when notes are
   collapsed and never carries "Show more"/"Show less". `frontend/whiteboard.js`,
   `src/memorymap/api/routes_whiteboard.py`, `tests/test_whiteboard.py`.
2. 232, the documents live view's markdown, code blocks first: hide the fence
   marker lines when the caret is outside the block, a header row with the
   language and a copy button, and check tables, blockquotes and task lists.
   `frontend/documents.js` live plugin plus `frontend/css/09-editor.css`.
3. 246, added to this batch by the orchestrator, 2026-09-14 (the item is on
   the branch, not yet in this worktree's INBOX). The owner: "I also want to be
   able to attach whiteboards and mindmaps to notes. and I want it to show in
   notes if they are attached to or referenced in/by a document, note,
   whiteboard, or mindmap." Three parts, checked by the orchestrator:
   (a) `GET /entries/{id}/connections` (routes_entries.py) reads the legacy
   `WhiteboardNode` table only, while a current board embeds a note as a
   `WhiteboardObject` of kind "note" with `data.ref_id` and a mind map is a
   board of type "map", so both go in, labelled board or map; (b) a connect-menu
   item "Put on a board or map" beside "Add to a document" (app.js) with an
   inline picker that POSTs `/whiteboard/objects`; (c) one muted chip row on the
   note card from a batched counts endpoint (one request per render, `ids=`),
   clicking it opens Connections. Tests first for the endpoint and the counts.

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
