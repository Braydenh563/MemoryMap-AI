# notes agent, 2026-09-14

Port 8802, data dir `/tmp/mm-notes`, branch `agent/wip-notes`.
Items, in order: 239, 240, 241, 238, 232.

## Landed

- 239, the table full view has no way out. `3dc956e` (docs `pending`).
  `frontend/app.js` `buildTableBlock` (an X in the bar, focus in and out) and
  `wireEscapedActionMenu`'s `place()` (an escaped menu is lifted one tier above
  its opener's surface), `frontend/css/05-sidebars-themes.css` (the seam after
  the menu wrap), `scratchpad/ui-sweeps/tablefullclose.js` (new).
  Measured: the X is 28x28 at the head's right edge, border 0px, ground
  transparent, reachable; Back read back as `DIV.md-table-wrap` under the
  pointer before (menu 1020 under panel 2400) and `BUTTON.menu-item` after
  (2401 over 2400); all three exits land the focus back on the opener.

## Next

1. 240, `docs/roadmap/INBOX.md` item 240: the "Your thoughts" and "The draft"
   textareas shrink on focus. Measure `getBoundingClientRect().height` before
   and after focus, find the auto-grow or focus handler in `frontend/app.js`.
2. 241, Ask grounding/citations/sources do not persist on reload or from the
   history panel. `src/memorymap/api/routes_ask_history.py`,
   `tests/test_ask_answer_object.py`.
3. 238, board and map note objects: expanded text overflows the panel border,
   the expanded state must persist with the object, export warns when notes are
   collapsed and never carries "Show more"/"Show less". `frontend/whiteboard.js`,
   `src/memorymap/api/routes_whiteboard.py`, `tests/test_whiteboard.py`.
4. 232, the documents live view's markdown, code blocks first: hide the fence
   marker lines when the caret is outside the block, a header row with the
   language and a copy button, and check tables, blockquotes and task lists.
   `frontend/documents.js` live plugin plus `frontend/css/09-editor.css`.

## Found, not fixed

- `scratchpad/ui-sweeps/tablefull.js` fails on `top bar clusters`: the header
  clusters' ground reads `rgba(0, 0, 0, 0)` where the sweep wants a tint. Not
  this agent's surface (chrome), and present before any change here.

## Not verified

- Nothing in full view was checked at phone width: the X is 28x28, which is
  under `--target-min`, the same size as the bar's other buttons at 1440. The
  bar's phone rules were not measured.
