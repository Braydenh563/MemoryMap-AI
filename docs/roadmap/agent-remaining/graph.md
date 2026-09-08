# Graph: what is left

Phase 2 of `GRAPH_PLAN.md` is complete, and its "Built, Phase 2" section
carries the numbers. The five items this file used to list are done: the pan
that lit up a note nobody pointed at (INBOX 28, fixed on the branch in
0b26491 and confirmed with an assertion here), the gear button (INBOX 21),
the options panel (INBOX 41), the spread, full screen (INBOX 29) and the
label collision pass with its probe (INBOX 27).

Everything below was measured against `scratchpad/ui-sweeps/serve.sh 8861
/tmp/mm-graph3` (35 notes, 55 links) and a second server on 8862 with a
300-note, 571-link fixture, both built by `scratchpad/graph-fixture.js`. The
phase sweep is `scratchpad/ui-sweeps/graph2.js`, which now asserts every
number it prints and exits non-zero with a FAIL block.

## 1. Found here, not fixed: saved views never stored the physics state

`frontend/graph.js:3827` reads `physics: document.getElementById(
"graph-physics")?.checked ?? true`, and `#graph-physics` has never been a
checkbox: it was a `<span>` wrapping the two sliders and is now the Physics
section of the options panel. So every saved view has stored `physics: true`,
and `set("graph-physics", view.physics)` at `graph.js:3858` sets `.checked`
on a div and does nothing. Nobody has reported it, because the two things a
reader would notice (the slider values) are not what is being saved either.

**Next step:** decide what a view should carry (the recommendation: the two
slider values, `graph-gravity` and `graph-spread`, which is what "physics"
means to a reader), then store and restore those and drop the boolean. One
commit, `graph.js` only, with a probe in `graph2.js` that saves a view at
non-default sliders, moves them, restores the view and reads the sliders
back.

## 2. The options panel scrolls at 1440x900

629px of list in a 488px box, so the Links section is below the fold until
you scroll. The cap is deliberate and measured (`.graph-overlay
.graph-options` in `frontend/css/02-chat-graph.css`): the previous cap fitted
the whole list and covered the top two zoom buttons, which is worse. If the
panel should fit without a scroll, the room has to come from the list, not
from the cap: the candidates, in order, are the "Pinned notes" row's label
(the button could be the row), the Links section's label (one row, one
button), and `.dock-menu-section`'s own padding, which is shared with every
dock menu in the app and should be the last thing touched.

## 3. Not verified anywhere in this phase

- 1440x900 and Chromium only. `contrast.js` was run in both themes and
  `errors.js` and `docks.js` after the changes; no other viewport width, no
  phone, no second browser.
- Nothing was looked at: every claim is a `getBoundingClientRect`, a
  `getComputedStyle` or a `__graphDebug` read.
- The world constant in `gcWorldFor` (1.6 to 1.25) is not exercised at 35 or
  300 notes, where the viewport floor decides the world. Above about a
  thousand notes it is reasoned, not measured.
- Touch and pinch on the map, and the options panel on a phone width, are
  both untested.

## 4. The phases after this one

`GRAPH_PLAN.md` Phase 3 (colour rules and groups), Phase 4 (lasso select,
right-click menu, a local-graph pane, the time slider's Play, PNG export at
2x) and Phase 5 (the backend fields, positions on views, the `?since=`
cursor) are all untouched, and INBOX 41's "the graph needs a utility, UI and
interaction clean-up" points at Phase 4.
