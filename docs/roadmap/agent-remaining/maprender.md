# The map render pass (MINDMAP_PLAN 13a): what is left

> Companions: [MINDMAP_PLAN.md](../MINDMAP_PLAN.md) **section 13** (the read,
> the decisions, the phases) · [mapread.md](mapread.md) (the run that took the
> measurements this one worked from) ·
> [HISTORY.md](../HISTORY.md) "From MINDMAP_PLAN.md section 13a: the drag
> pick-up" (the record, with both sets of numbers)
>
> One agent, one worktree (`worktree-agent-maprender`), port 8805, data dir
> `/tmp/mm-maprender`. The brief was the **pick-up**, not the whole of 13a.

## Done

- **The drag pick-up.** Worst drag frame on `scratchpad/ui-sweeps/mapperf.js`:
  83.3 to **16.8ms** at 50 topics, 416.6 to **33.3ms** at 200, 1,650.0 to
  **66.8ms** at 500. Pan medians 16.7ms before and after at all three sizes.
  Four commits, each named in HISTORY. The cause was never a render: a CPU
  profile of the probe's own gesture put `document.querySelector` and
  `wbMapNodeSize`'s layout reads at the top of the self-time list, and
  `renderWhiteboard` at a twentieth of the drag's cost.
- **`tests/test_map_drag_cost.py`**, nine rules, one per cost the profile
  found. Source shapes, not measurements: the docstring says so, because a
  lint that looked like a benchmark would be worse than no lint.
- **MINDMAP_PLAN section 13.1** carries both tables and a correction: reading
  3 ("`renderWhiteboard` is the whole of it") was carrying the blame for two
  separate bugs, and the open and the drag have different causes.

## Left to do, in the order it should be taken

1. **13a-open, the render pass proper.** `renderWhiteboard` is still a full d3
   data-join over every node, sketch and object on the board for any change to
   it, and it is still superlinear: 23.3ms at 50 topics, 123.2 at 200, 543.0
   at 500. That is 4× the nodes for 4.4× the render between 200 and 500, so it
   is close to linear now but the constant is large. The gate figures 13a set
   and this pass did not meet are **`renderWhiteboard` under 200ms and
   open-to-painted under 1s at 500 topics** (2,049.1ms now, from 3,443.3).
   Caching will not get there: the work is making a change repaint what
   changed. Start at `renderWhiteboard` and `renderWbObjects`, which the
   profile puts at 543ms and 367ms of the drop alone.
2. **`wbLinkedSketchesFor` is O(members x sketches), with a `JSON.parse` per
   sketch per member.** Found, not fixed: it is free on the maps
   `mapperf.js` builds, because they have no link sketches at all, so nothing
   in this pass's measurements would have moved. On a board that mixes a
   branch of two hundred topics with a few hundred link sketches it is the
   same quadratic shape the capture's `.find` had. The fix is the same shape
   too: parse the link sketches once per capture and index them by endpoint.
3. **`mapperf.js`'s own cost.** It was about three minutes and is now faster
   without being weakened, because the thing it measures got faster: the five
   `renderWhiteboardNow()` calls per size cost 6.4s at 500 topics before this
   pass and 2.7s after, and each open is 1.4s cheaper. Nothing was trimmed
   from the probe and nothing should be: `SIZES=50` already exists for a
   regression check, and the three-size curve is the reading that told this
   pass which of two bugs it was looking at.

## Not verified

- **Dark is unmeasured**, as it was in section 13.1. Every figure here is
  light mode at 1440x900.
- **One machine, one Chromium, one run each way** except the 500-topic row,
  which was run four times across the four commits and moved monotonically
  (1,650 to 633.3 to 333.3 to 300.0 to 66.8ms). They are a shape, not a
  benchmark.
- **The caches are invalidated by reasoning plus four sweeps, not by proof.**
  A topic's measured box is cached between renders; the three clear points
  (a render, the size grip, the end of a gesture) are the three this pass
  could find. `mapresize.js`, `maprejoin.js`, `mapstrip.js` and `mapline.js`
  all pass against the change, which covers the resize grip and the re-parent
  drop, and `tests/test_map_drag_cost.py` fails if a clear point is removed.
  A fourth way to change a topic's drawn size without a render would be a real
  bug and would show as an edge anchored to a box the topic no longer has.
  The canvas box's cache has six clear points for the same reason, the sixth
  being a hovering pointer, which covers a keyboard shortcut moving the canvas
  with no pointer event at all.
