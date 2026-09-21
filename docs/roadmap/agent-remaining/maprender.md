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

## Left to do, in the order it should be taken

0. **13g, the haywire middle-button pan, needs the owner.** It did not
   reproduce here in any of the three ways it could be reproduced headless
   (four directions, both sizes, and a gesture whose release never arrives).
   The remaining explanation is Chromium's own middle-button autoscroll, which
   a headless browser does not have, so the guard written for it in INBOX 183
   is not exercised by any gate here and never has been. The question to ask
   is in the plan. **Do not "fix" this blind**: the guard is already there,
   and a second one written from the same reasoning would be the third pass
   over a bug nobody has observed.
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
3. **`mapperf.js`'s own cost: nothing was changed in the probe, and it is
   2.8 times cheaper anyway.** The previous agent flagged it as the slowest
   thing in the sweep list, at about three minutes. Timed here back to back on
   the same warm machine and server, the same file against the base frontend
   and against this branch: **89s before, 32s after**. That is the probe
   measuring a gesture that used to block the main thread for a second and a
   half per frame, so most of its wall clock was the thing it exists to
   report. No line of `mapperf.js` was touched. Nothing in it should be
   trimmed either: what could be cut is a size, and the three-size curve is
   exactly what told this pass it was looking at two bugs rather than one
   (8.1x the nodes for 21x the render said "open"; `dragWorstAt` 0.03 at every
   size said "pick-up"). `SIZES=50` is already there for a one-number
   regression check.

## Not verified

- **Zoom is unmeasured.** The owner named three things, "laggy to pan around,
  move objects, and zoom", and this pass measured two of them. Nothing here
  reports what a wheel zoom costs at 500 topics, and no sweep in the
  repository does. The bimodal pan finding says the likely answer is the same
  one (the board is one promoted layer holding every topic, and a zoom changes
  its scale, which cannot be composited from the existing raster), but that is
  a prediction, not a number. Take it with 13a-open.
- **Dark is unmeasured**, as it was in section 13.1. Every figure here is
  light mode at 1440x900.
- **One machine, one Chromium.** The 500-topic row was run six times across
  the pass and moved monotonically (1,650 to 633.3 to 333.3 to 300.0 to
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
