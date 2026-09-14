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

## Next

1. 241, Ask grounding, in-text numbered references and sources do not persist
   on reload or from the history panel. Find where an Ask answer is stored
   (`/ask-history`, `src/memorymap/api/routes_ask_history.py`) and rendered from
   history; persist the citations and sources with the answer object
   (`tests/test_ask_answer_object.py` names the shape).
2. 238, board and map note objects: expanded text overflows the panel border,
   the expanded state must persist with the object, export warns when notes are
   collapsed and never carries "Show more"/"Show less". `frontend/whiteboard.js`,
   `src/memorymap/api/routes_whiteboard.py`, `tests/test_whiteboard.py`.
3. 232, the documents live view's markdown, code blocks first: hide the fence
   marker lines when the caret is outside the block, a header row with the
   language and a copy button, and check tables, blockquotes and task lists.
   `frontend/documents.js` live plugin plus `frontend/css/09-editor.css`.

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
