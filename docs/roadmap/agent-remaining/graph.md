# Graph: what is left

Phase 2 of `GRAPH_PLAN.md` is complete, and its "Built, Phase 2" section
carries the numbers. The five items this file used to list from that phase
are done: the pan that lit up a note nobody pointed at (INBOX 28, fixed on
the branch in 0b26491 and confirmed with an assertion here), the gear button
(INBOX 21), the options panel (INBOX 41), the spread, full screen (INBOX 29)
and the label collision pass with its probe (INBOX 27).

This file's own three items (INBOX batch C, 2026-09-08) are done too:

1. **Saved views now store gravity/spread, not the boolean that never
   existed.** `graphCaptureView()`/`graphApplyView()` read and wrote
   `.checked` on `#graph-physics`, the Physics section div, not a checkbox;
   every saved view stored `physics: true` regardless of the sliders. Fixed
   to capture/restore `gravity`/`spread` directly (the two things "physics"
   means to a reader); `#graph-show-entities`/`#graph-show-documents` were
   the same bug on two more controls (the real ids are
   `#graph-entities`/`#graph-documents`), fixed alongside since it was the
   same two functions. `scratchpad/ui-sweeps/graphphysics.js` sets the
   sliders away from default, saves a view, moves them again, restores, and
   reads the DOM and localStorage back; confirmed it fails against the
   pre-fix code by stashing.
2. **The options panel no longer scrolls at 1440x900.** 627px of list in a
   488px cap before; 418 vs 418 (no scroll) after, both themes. Physics'
   "Unpin all" and Links' "Suggest links" each moved off their own row and
   onto their section's header row (`.dock-menu-section-head`, the two
   candidates this file named); `.dock-menu-section`'s own padding/gap
   tightened, scoped to `.graph-options` only so no other dock menu in the
   app lost any room (the third, last-named candidate); and, beyond what
   either candidate covered on its own, the "Show" section's six
   independent switches now sit two to a row (`.graph-toggle-grid`, one
   column again below 820 where touch targets grow to 44px) rather than
   one, which is where most of the remaining room came from. No control
   shrank: every switch is still the same 30px `.graph-option-row` height
   it was.
3. **The graph dock is at six controls, under the seven-control ceiling.**
   The saved-views select (`#graph-view-picker`) moved into the More menu,
   beside Save/Delete which already act on whatever it has selected;
   `docks.js` reads 6 now, was 9. Notes (10) and Library (9) are still over
   the ceiling: INBOX 47 records why this batch didn't extend the same
   move to them (graph.md named its own two candidates for graph
   specifically; nothing was decided for those two docks, and guessing is a
   design call CLAUDE.md's rule 3 says to record, not remake).

Everything below was measured against `scratchpad/ui-sweeps/serve.sh 8861
/tmp/mm-graph3` (35 notes, 55 links), a second server on 8862 with a
300-note, 571-link fixture (both built by `scratchpad/graph-fixture.js`),
and, for this batch's three items, `scratchpad/ui-sweeps/serve.sh 8891
/tmp/mm-batch-c` with a 5-note fixture. The phase sweep is
`scratchpad/ui-sweeps/graph2.js`, which asserts every number it prints and
exits non-zero with a FAIL block; its one FAIL right now ("a search for one
note drew no label for it") predates this batch, confirmed by stashing this
batch's changes and rerunning.

## Not verified anywhere in this phase, this batch included

- Chromium only, and no second browser.
- 1440x900 for everything. The options panel's narrow-width fallback (the
  two-column "Show" grid collapsing to one column below 820) was checked at
  1024 and 390 for clipping and wrapping only (`graphopt820.js`); it still
  scrolls at those two widths, same as before this batch, and that scrolling
  itself was not re-measured against a target the way 1440x900 was.
- `contrast.js` was run on every tab in both themes and separately on the
  options panel with it open (21 text nodes, worst ratio 7.4 light and 7.86
  dark) before this batch; not rerun against the header-merge or two-column
  changes.
- Nothing was looked at: every claim is a `getBoundingClientRect`, a
  `getComputedStyle` or a `__graphDebug` read.
- The world constant in `gcWorldFor` (1.6 to 1.25) is not exercised at 35 or
  300 notes, where the viewport floor decides the world. Above about a
  thousand notes it is reasoned, not measured.
- Touch and pinch on the map are still untested, and so is the graph at a
  phone width beyond the panel.

## The phases after this one

`GRAPH_PLAN.md` Phase 3 (colour rules and groups), Phase 4 (lasso select,
right-click menu, a local-graph pane, the time slider's Play, PNG export at
2x) and Phase 5 (the backend fields, positions on views, the `?since=`
cursor) are all untouched, and INBOX 41's "the graph needs a utility, UI and
interaction clean-up" points at Phase 4.
