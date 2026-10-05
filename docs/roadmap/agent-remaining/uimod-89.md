# UI modernisation Phases 8 and 9 (uimod-89): what is left

Phase 8 (the dock grammar) had no open step: its Built blocks were already
in HISTORY.md and OPEN.md closed its last row on 2026-09-20. Phase 9's one
open line, the off-band widths, is built: HISTORY.md, "Moved from the
plans, 2026-10-05 (UI_MODERNISATION_PLAN Phase 9, the off-band widths)".

## Still open, in the order to take them

1. **The status bar's two off-band rules**, for whoever owns
   notifications/status.js: `00-tokens-shell.css` `@media (max-width:
   719.98px)` (hides `#status-notes` and `#status-command`, tighter padding)
   and `03-dashboard-widgets.css` `@media (max-width: 900px)` (hides
   `.emblem-mark`). Recommendation: 599.98 and 819.98, then `bands.js` at
   620, 700 and 860 for the status bar's clipped count (it is 2 to 5 today,
   `#ai-status-label` and `#status-reminders` ellipsised by design).
2. **The dashboard's quick access**: `03-dashboard-widgets.css` `@media
   (max-width: 719.98px)` on `.dash-quicklinks`, `.launch-row`,
   `.quick-action`. Recommendation: 599.98 (the rest of the dashboard's 720
   rules went there).
3. **The whiteboard's**: `06-timeline-dialogs.css` `@media (max-width:
   40rem)` on `.whiteboard-floating-panel.bottom-center/right`, and in
   `07-whiteboard-misc.css` three `max-width: 719.98px`, two `min-width:
   720px`, four 640/40rem and one 900. Owned by the whiteboard agent.
4. When 1 to 3 land, lower `ALLOWED` in `tests/test_breakpoints.py` to
   match (the three groups' rows go to 0 and come out).

## Found, not fixed

- `#notes-filter-menu` and `#select-btn` report their `.dock-word` clipped
  at 390 to 800 (`bands.js` `clippedAt`); it reads as the dock folding its
  words, not measured further.
- `00-tokens-shell.css`'s phone `header#top-bar h1 { display: none }` is
  redundant: 07's `max-width: 1499px` already hides the wordmark below
  1500. Left in place as the phone's own statement.
