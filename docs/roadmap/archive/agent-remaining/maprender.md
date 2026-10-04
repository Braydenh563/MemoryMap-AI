# The map render pass (MINDMAP_PLAN 13a): what is left

> Companions: [MINDMAP_PLAN.md](../MINDMAP_PLAN.md) **section 13** (the read,
> the decisions, the phases) · [mapread.md](mapread.md) (the run that took the
> measurements this one worked from) ·
> [HISTORY.md](../HISTORY.md) "From MINDMAP_PLAN.md section 13a: the drag
> pick-up" (the record, with both sets of numbers)
>
> Two agents, one row each. The first (`worktree-agent-maprender`, port 8805,
> data dir `/tmp/mm-maprender`) took the **pick-up**; the second
> (`worktree-agent-render`, port 8790, data dir `/tmp/mm-render2`,
> 2026-09-21) took **13a-open, the render pass proper**, and the second
> section below is its account. What is left after both is one row, 13a-view.


## Done by the pick-up pass (13a, 2026-09-21)

- **The drag pick-up.** Worst drag frame on `scratchpad/ui-sweeps/mapperf.js`:
  83.3 to **16.8ms** at 50 topics, 416.6 to **33.3ms** at 200, 1,650.0 to
  **66.8ms** at 500. Pan medians 16.7ms before and after at all three sizes.
  Four commits, each named in HISTORY. The cause was never a render: a CPU
  profile of the probe's own gesture put `document.querySelector` and
  `wbMapNodeSize`'s layout reads at the top of the self-time list, and
  `renderWhiteboard` at a twentieth of the drag's cost.
- **`scratchpad/ui-sweeps/mapbranchdrag.js`**, in `scripts/gate.sh`'s sweep
  list, 6/6. The correctness half that `mapperf.js` does not cover: one real
  drag of a middle topic, and the four questions that each catch one of this
  pass's caches being wrong (the branch came with it by the same delta, the
  line into a child was redrawn mid-drag, both positions were saved, and a
  topic re-measures once its own cache entry is dropped). Fifteen seconds
  against mapperf's three minutes.
- **`tests/test_map_drag_cost.py`**, nine rules, one per cost the profile
  found. Source shapes, not measurements: the docstring says so, because a
  lint that looked like a benchmark would be worse than no lint.
- **`scratchpad/ui-sweeps/mapmidpan.js`**, in `scripts/gate.sh`'s sweep list,
  12/12. The owner pans by holding the wheel down, and 13.1's pan figure was
  taken with the Hand tool and the left button, so the path he uses had never
  been measured. It now is, at 50 and 500 topics: the frame cost of the Hand
  tool and of the middle button side by side in the same run, and a real
  middle-button drag in each of the four directions asserting the board goes
  the way the hand goes.
- **MINDMAP_PLAN section 13.1 reading 1 withdrawn, and 13g opened.** Panning a
  500-topic map is bimodal on this machine (16.7, 16.7, 116.7, 133.3, 150.0ms
  per frame across five runs of one gesture), it is not explained by the tool
  or the button, and under the profiler the whole gesture spends under 10ms in
  script. The pan path is not the bug; the layer it moves is.
- **MINDMAP_PLAN section 13.1** carries both tables and a correction: reading
  3 ("`renderWhiteboard` is the whole of it") was carrying the blame for two
  separate bugs, and the open and the drag have different causes.

## Done by the render pass (13a-open, 2026-09-21)

The full record, with the profile and the tables, is in HISTORY.md ("Moved
from the plans, 2026-09-21", "From MINDMAP_PLAN.md section 13a-open: the
render pass"). In short:

- **The render is keyed.** `wbObjectPaintKey` is every input
  `renderWbObjects` reads for one object as a string; an object whose key is
  what it was last render is not touched. The lines are keyed by their two
  endpoints and written in place, in the tree's own order. The measurements
  moved to one pass after every write, which took the board from one layout
  flush per node to one per render, and that flush was the superlinearity.
- **The open stopped doing the board twice**: the frame `wbScheduleRender`
  queued is cancelled when `renderWhiteboardNow` runs, and the fit reads the
  boxes the render just measured instead of querying the document per item.
- **`wbLinkedSketchesFor` is indexed** (`wbLinkSketchIndex`), which is the
  second row of the old "Left to do" below, with the fixture it was missing.
  That fixture then found two more scans of the same shape on the same path,
  both per frame rather than per pick-up, and both are fixed: `wbLinkItem`
  resolved a link end with a `.find` over the whole list, and
  `wbUpdateLinkedSketches` found the two paths it writes with three document
  queries per link per frame.
- **`mapperf.js` measures a render against a change**, takes a zoom for the
  first time, and drags a branch twice, before and after three hundred link
  sketches. `tests/test_map_render_cost.py` holds the ten shapes.

Both of 13a's gate figures are met at 500 topics: `renderWhiteboard` 534.7 to
**47.8ms** after one topic moves (**149.1ms** with every topic changed at
once, against the 200ms asked for), open-to-painted 2,022.3 to **965.6ms**.
One branch drag over 300 link sketches, the fixture that had never existed:
1,000.0 to **116.7ms** worst frame.

## Left to do, in the order it should be taken

0. **13g, the haywire middle-button pan, needs the owner.** Unchanged by this
   pass and deliberately not touched by it. It did not reproduce headless in
   any of the three ways it could be (four directions, both sizes, and a
   gesture whose release never arrives). The remaining explanation is
   Chromium's own middle-button autoscroll, which a headless browser does not
   have, so the guard written for it in INBOX 183 is not exercised by any gate
   here and never has been. The question to ask is in the plan. **Do not "fix"
   this blind**: the guard is already there, and a second one written from the
   same reasoning would be the third pass over a bug nobody has observed.
1. **13a-view: draw the topics that are on screen.** This is what is left of
   the owner's three words, and the render pass did not touch it. Measured
   after it, at 500 topics: the pan median is 16.7ms with a **150.0ms worst
   frame**, and a ctrl-wheel zoom is 16.7ms median with a **166.7ms worst
   frame**, against 133.4 and 133.4 on the head before the pass, which is one
   frame of this machine's spread either way and not a change.
   Neither is script, and the zoom's half of that is now measured rather than
   inferred: with every function the gesture calls wrapped in a timer, one
   ctrl-wheel zoom at 500 topics spends **2.6ms in script across 2,239ms**,
   while 14 of its 34 frames run over 33ms. The pan's own CPU profile
   (13.1 reading 1) puts a 30-move gesture under 10ms. It is the browser re-rasterising one promoted
   layer that holds every topic on the board, so the only thing that moves it
   is holding fewer topics. The row, with its gate, is in MINDMAP_PLAN
   ("13a-view"). Two things to know before starting:
   - **A 500-topic map opens showing two topics.** Measured on this pass's own
     probe at 1440x900: `wbFrameMapOnOpen` fits, finds the fit illegible and
     re-centres on the root at 1x, and two topics are inside the canvas. So
     the working set a cull would keep is tiny, and the prize is large.
   - **Everything that reads the DOM has to keep working.** The export, the
     board bounds, the marquee and every `querySelector` in `whiteboard.js`
     read the elements, which is exactly why a collapsed branch leaves the DOM
     rather than being hidden with CSS (`renderWbObjects`'s own comment). A
     cull is the same shape as a collapse and needs the same care: the four
     readers above, plus `mapbranchdrag.js`, `maplayouts.js` and
     `mapstrip.js`, are the gate.
2. **The 50-topic open did not improve, and moved the wrong way** (314.0ms
   on the baseline, 393.1 after, against 757.0 to 537.2 at 200 topics and
   2,022.3 to 965.6 at 500). At that size the open is not the render at all
   (7.9ms of it): it is the tab switch, the `setTimeout(60)` in
   `openWhiteboardBoard`, the fetch and the fit, and the spread between two
   runs is wider than anything this pass changed. Nobody has reported it and
   it is a third of a second, so it is written down rather than chased.
3. **`mapperf.js` does four more things per size** than the version whose
   three minutes the pick-up pass wrote down: a zoom, two branch drags and
   three hundred link sketches posted one at a time. It was not timed again
   with a clock, and the file-time arithmetic that looked like an answer
   disagreed with what was watched, so no figure is quoted here. `SIZES=50`
   is still the one-number regression check and `LINKS=0` skips the link
   fixture. Nothing in it should be trimmed otherwise: the three-size curve is
   what tells a render bug from an open bug, and the before and after of the
   same branch drag is the only thing that can see `wbLinkedSketchesFor`.

## Not verified

- ~~**Zoom is unmeasured.**~~ **Measured 2026-09-21**, in `mapperf.js`'s own
  `zoom` column: six ctrl-wheel steps out and six back in at 500 topics,
  16.7ms median and 166.7ms worst, against 16.7 and 133.4 on the head before
  the render pass, which is one frame of this machine's spread either way. The prediction is confirmed: the render getting eleven
  times cheaper did not move it, because no script runs on those frames. It is
  13a-view.
- **The zoom's own step size is not this pass's work, and is worth a look.**
  d3-zoom multiplies a wheel delta by ten when ctrl is held, because that is
  how a browser reports a trackpad pinch. A trackpad gets a smooth 1.1x a
  notch; a mouse wheel sends 120 units and gets **5.3x**, so two notches take a
  map from 1x to the 4x ceiling or the 0.1x floor. Unreported, and the
  likeliest reading of a zoom that "jumps" on a machine with a real mouse.
- **The keyed render is invalidated by one list, not by proof.**
  `wbObjectPaintKey` names every input the paint reads today, and a property
  the paint starts reading tomorrow has to be added to it. The way that
  failure shows is a topic that stops following a change, which is what
  `mapstrip.js`, `maptheme.js`, `mapline.js`, `maprejoin.js`, `maplayouts.js`,
  `mapribbon.js`, `mapspine.js`, `maplabel.js`, `mindmapcurve.js`,
  `mindmapimage.js`, `maptwokinds.js` and `mapbranchdrag.js` each ask about
  directly; all twelve pass. `tests/test_map_render_cost.py` fails if the key
  stops naming one of the five map inputs, and the one thing deliberately left
  out of it (a map node's height, which the measure pass writes back) is named
  there too.
- **The full suite did not finish on this machine.** `scripts/gate.sh --full`
  was started twice from `worktree-agent-render`. The first run reached 96%
  with **no F and no E in its log** and then stopped making progress: three
  other agents were running the same suite at the same time, 14.7 of the
  box's 16GB were in use with no swap and a load average of 43, and the
  process sat sleeping with its CPU time flat. It was killed to give the
  memory back. The second run is still going at the time of writing, behind
  the same queue, and its log is `/tmp/mm-render2/gate-full.txt`. What did
  pass, repeatedly: the lint set, `node --check`, ruff, `--changed` (which
  selects `tests/test_whiteboard.py` and `tests/test_whiteboard_selection.py`
  for this branch), the new `tests/test_map_render_cost.py`, and fourteen
  sweeps. CI runs the suite on push.
- **Dark is unmeasured**, as it was in section 13.1. Every figure in either
  pass is light mode at 1440x900.
- **One machine again, and the open spread is wide.** The 500-topic open was
  taken seven times across the render pass (1,958.6, 1,977.0, 2,070.2, 2,089.0
  and 2,022.3 on the base; 893.9, 981.0, 933.0, 955.6 and 965.6 as the pass
  landed) and the 50-topic open three times on each side. The figures quoted are
  one run each, paired against a baseline taken on a second server minutes
  earlier with the same probe. They are a shape, not a benchmark.
- **One machine, one Chromium** (the pick-up pass's own note). The 500-topic
  row was run six times across that pass and moved monotonically (1,650 to 633.3 to 333.3 to 300.0 to
  66.8ms, and 66.7ms on the final head). The base was run twice, hours apart:
  83.3 / 416.6 / 1,650.0 and 100.1 / 483.3 / 1,916.6, which is the run
  variance on this machine and the reason the tables quote the first run's
  figures throughout rather than mixing them. They are a shape, not a
  benchmark.
- **The caches are invalidated by reasoning plus four sweeps, not by proof.**
  A topic's measured box is cached between renders; the three clear points
  (a render, the size grip, the end of a gesture) are the three this pass
  could find. `mapresize.js`, `maprejoin.js`, `mapstrip.js` and `mapline.js`
  all pass against the change, which covers the resize grip and the re-parent
  drop, `mapbranchdrag.js` asks the four questions directly, and
  `tests/test_map_drag_cost.py` fails if a clear point is removed.
  A fourth way to change a topic's drawn size without a render would be a real
  bug and would show as an edge anchored to a box the topic no longer has.
  The canvas box's cache has six clear points for the same reason, the sixth
  being a hovering pointer, which covers a keyboard shortcut moving the canvas
  with no pointer event at all.
