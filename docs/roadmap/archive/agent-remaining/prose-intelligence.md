# The document editor's writing intelligence: what is left

Agent: Opus, 2026-09-13. Brief: INBOX 142 (which settles 128), the four
surfaces of the writing suggestions. Decision and acceptance:
`DOCUMENTS_PLAN.md` section 12. Commits `2fb4d21` (the decision), `f4d8449`
(the anchor, the panel, one vocabulary), `816c2ff` (the dictionary).

Probes: `scratchpad/ui-sweeps/spellwide.js` (views, widths, appearance),
`spellwide2.js` (the shapes a mark can take), `prosepanel.js` (the panel's
contract and contrast from the painted pixels), `proseui.js` (shares of the
window). All green at the time of writing, 0 console errors.

## Done, with numbers

- The wrapped-finding anchor (INBOX 128's "wide gap"): was 716px off, now 0px
  horizontally and 4px below the fragment pressed.
- Out of bounds: the menu is clamped to the editor's card and all four viewport
  edges; measured 0px past the card in every case, nothing off screen.
- The panel row answers in place; no floating surface opens from it. Panel 14%
  of a 1440x900 window with no row open (editor 45%), 24% with one open.
- One drawing of a finding (`docFindingLine`) in the row and the menu's head.
- The dictionary dialog: joined `.space-dialog`, so it is centred (top 332 for a
  236px box, was 686), carries its word count and a '?' popover.

## Left open, in order of value

1. **The underline is the only surface with no hover affordance.** `cursor:
   pointer` is the whole of it: nothing says a squiggled word is pressable until
   you press it. A tint on `.cm-finding:hover` in the kind's own colour would
   say it, and it needs the `[data-contrast="on"]` branch too. Files:
   `frontend/documents.js` (`docCmTheme`, the `.cm-finding` block around line
   10924). Next step: add the hover tint, measure it in both themes with
   `prosepanel.js`'s painted-pixel pass.
2. **`docFindingAtPoint` walks every mark on every pointer event** that lands in
   the editor (`click`, `dblclick`, `contextmenu`), and each walk calls
   `getClientRects()` per mark. It is bounded by the viewport's marks, so it has
   not been measured as slow, but it has not been measured at all. Next step:
   time it on the plan's 20k-word document with 200 findings on screen; if it is
   past a millisecond, cache the rects per repaint (the findings effect is the
   invalidation point).
3. **The panel's answers are not reachable by keyboard from the row.** Enter
   opens the row, but focus stays on the control; the candidates are a Tab away
   with nothing saying so. `F8`/`Shift+F8` still step findings in the text. Next
   step: move focus to the first candidate when a row opens by keyboard only
   (a pointer press must not steal it, for the reason the plain-click route
   records), and return it to the row on collapse.
4. **The three kinds are named in two places**: `DOC_FINDING_GROUPS` (the
   panel's group titles) and `docFindingKind` (the dot and the underline). They
   agree today. A fourth kind would have to be added to both.
5. **Not verified:** the desktop window (`start-desktop.sh`) was not run, only
   Chromium at 1440x900, 1100x760 and 820x700. The `rephrase` endpoint behind
   "Ask the AI for wordings" was not exercised against a real model (CLAUDE.md
   section 4's standing caveat); the row exists only on passage findings now, so
   that path is narrower than it was.

## Found, not fixed, not mine

- `tests/test_style_scale.py::test_no_token_is_used_with_a_dead_fallback` failed
  twice mid-session on other agents' in-flight work (`--graph-hover-scale`, then
  `--notes-sticky-top`, in `frontend/css/02-chat-graph.css` and
  `frontend/css/07-whiteboard-misc.css`). Both were gone by the next run. Worth a
  look at merge time in case one landed.
- `scratchpad/ui-sweeps/editor.js` (the Phase 0 acceptance sweep) still looks for
  `.doc-backdrop mark`, which Phase 2 removed. Its two renamed selectors were
  updated here, but the sweep cannot pass until someone decides whether it is
  retired or rewritten against the engine's marks.
