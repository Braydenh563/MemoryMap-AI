# Graph, Phase 2: what is left

Written at a usage cutoff, mid-phase. One of the four pieces landed (the
space: commit `graph: the map takes the whole card, its controls float over
it`, and GRAPH_PLAN.md's "Built, Phase 2"). The other three are untouched
code, and each one below names the file, the line, and the next step, in the
order they are worth doing.

Everything was measured against `scratchpad/ui-sweeps/serve.sh 8831
/tmp/mm-graph2`, whose data dir holds a 35-note, 55-link fixture built with
`BASE=http://127.0.0.1:8831 node scratchpad/graph-fixture.js 35 60`. The
Phase 2 sweep is `scratchpad/ui-sweeps/graph2.js` (new, committed): it prints
the card/map split, the page scroll, the layout's world bounding box and fit
zoom, the hover behaviour under a pan and a wheel, and the full-screen
geometry.

## 1. The hover that lights up a note nobody pointed at (reproduced, not fixed)

The owner's report: "sometimes when I scroll and pan on the graph, a random
single separated and unlinked note will highlight itself and show its label".

**Reproduced, and it is not the pointer path.** Measured with the sweep: a
mouse pan across the map leaves `__graphDebug.hovered` null in 8 of 8 samples
and after mouseup, and a wheel zoom under a stationary cursor leaves it
unchanged. `gcPanning` (graph-canvas.js:54, set in the zoom's `start`) already
does that job.

**The cause is the focus handler.** `#graph-box` is `tabIndex = 0`
(graph.js:2628, `initGraphKeyboard`) and its `focus` listener
(graph.js:2637) runs `focusGraphNode(graphNodeById(graphKeyboardId) ||
graphNodesRef[0])`, and `focusGraphNode` (graph.js:2582) sets
**`graphHoveredId`** as well as `graphKeyboardId`, deliberately ("keyboard
focus and pointer hover mean the same thing here"). A press anywhere on the
map focuses the box, so every pan focuses `graphNodesRef[0]`: an arbitrary
note that in a real notebook is often an unlinked one. The canvas then dims
every non-neighbour to 20% (`GC_DIM_ALPHA`) and draws that one node's label,
which is exactly the reported picture. Measured after one pan drag on empty
map: `activeElement=graph-box, hovered=1, graphKeyboardId=1, firstNode=1`.

**Next step (one small change, in `initGraphKeyboard`'s focus listener):**
only take a node when the focus came from the keyboard, e.g.

    box.addEventListener("focus", () => {
      if (!graphNodesRef?.length) return;
      // A pointer press on a tabindex=0 div focuses it too, and a pan is not
      // a request to select a note: :focus-visible is the browser's own
      // "this focus came from the keyboard".
      if (!box.matches(":focus-visible")) return;
      ...
    });

Then re-run `graph2.js` (its pan probe already asserts 0/8) and add a probe
that pans and asserts `hovered == null` while `activeElement == "graph-box"`.
Check the keyboard route still works: Tab into the map, arrows move, Escape
leaves. `blur` sets `graphHoveredId = null` and can stay as it is.

## 2. INBOX item 21: the gear utility button (not started)

Decision already made and not to be remade: View keeps layout, colour and
legend; physics, labels, similarity lines, minimap and link suggestions move
to a gear on the dock's utilities zone, one click, opening the same popover.

- The menu item to remove: `#graph-options-toggle` in
  `frontend/index.html` (in the View menu, `#graph-view-menu`, the
  "Display options..." row).
- Where it goes: `.dock-actions`, after the `.dock-more` kebab, as
  `class="ghost small icon-only"` with `<i class="ph ph-gear">` and an
  `aria-label`/`title` of "Display options".
- **The lint stays green as long as the id does not end in `-refresh` or
  `-help-toggle` and the button does not carry `dock-more`**:
  `tests/test_dock_grammar.py` recognises utilities only by those, so a
  gear is invisible to the order rule, and `icon-only` keeps it out of the
  one-primary count (`#graph-add-node` is the primary).
- No JS change: `app.js:31859` (the click handler) and `app.js:22131` (the
  arrival sync) both use the same id. Drop "and display options" from the
  View summary's `title`.
- Then: `tests/test_dock_grammar.py`, `test_frontend_ids.py`,
  `test_frontend_handlers.py`, and `scratchpad/ui-sweeps/docks.js` (one
  height per dock, at most 7 visible controls in the row: the gear makes the
  graph's actions zone five).

## 3. The spread: "the max gravity in the graph is quite separated" (not started)

Measured, 35 notes, settled, default sliders: world bounding box **725 x 689
px**, fit zoom **k = 0.8**, median nearest-neighbour gap **80 px**, all 35
inside the box at zoom 1. A 300-note fixture was **not** built or measured;
that is the first step, and the numbers above are the only "before" that
exists.

- Build it: `BASE=http://127.0.0.1:8831 node scratchpad/graph-fixture.js 300
  600` (idempotent, it tops the same data dir up from 35), then
  `node scratchpad/ui-sweeps/graph2.js` for the "before" line.
- The two dials: `frontend/graph-worker.js` `tuning()` (lines ~99 to 113),
  `charge: -340 / gravityScale` and `linkDistance: (similar ? 130 : 80) *
  spreadScale`.
- **Read `gcWorldFor` first** (`frontend/graph-canvas.js:972). The world is a
  square of side `sqrt(count) * 2 * (18 + 28) * 1.6`, so 300 notes get a
  2,550px world and 2,000 get 6,580, and `clampToWorld` holds every node
  inside it. On a large map that constant, not the charge, is what sets how
  far the map spreads, and the fit zoom follows from it. Tune the two
  together and record both before and after numbers (bounding box, fit k,
  median gap) in the commit message, per the brief.
- Target: a 300-note graph fits the box at k near 1 with clusters still
  separable (the median gap is the guard against "it fits because it is one
  blob").

## Not verified anywhere in this phase

Light theme only, 1440x900 only. `contrast.js`, `docks.js` and `errors.js`
were not run after the space change; the full suite was not run (the
orchestrator was asked to). Nothing was looked at: every claim above is a
`getBoundingClientRect`, a `getComputedStyle` or a `__graphDebug` read.
