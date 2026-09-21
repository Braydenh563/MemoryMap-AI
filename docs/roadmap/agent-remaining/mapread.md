# The mind map read (INBOX 305): what is left

> Companions: [MINDMAP_PLAN.md](../MINDMAP_PLAN.md) **section 13** (the read
> itself: the table, the decisions, the phases, the not-verified list) ·
> [mindmap.md](mindmap.md) (the ninth run's control audit, now largely
> superseded: §12.5 landed and most of its counts have moved) ·
> [DOCUMENTS_PLAN.md](../DOCUMENTS_PLAN.md) section 17 (the shape this follows)
>
> One agent, one worktree (`worktree-agent-mapread`), port 8804, data dir
> `/tmp/mm-mapread`. This run was a **measured read and a plan section**: it
> deliberately did not redesign the map, because the complaint is broad and a
> redesign built on a guess is this project's most expensive recurring
> mistake. Everything in section 13 was measured in a real Chromium against
> the branch head, not read off the source.

## Done

- **`scratchpad/ui-sweeps/mapperf.js`**, in `scripts/gate.sh`'s sweep list.
  Open-to-painted, `wbMapIndex`, `wbMapTidyPositions` and `renderWhiteboard`
  costs, and rAF frame deltas across a real pan and a real node drag, at 50,
  200 and 500 topics built through `/whiteboard/boards/import`. It also
  reports **where in the gesture the worst frame falls**, which is the reading
  that identified the stall as the pick-up rather than the drop.
- **`scratchpad/ui-sweeps/maptwokinds.js`**, in the same list, 10/10. The tree
  edge and the free link side by side: which gesture makes each, which ring or
  bar each opens, which of the fourteen strip controls belong to the line, and
  which of the three text exports each survives. Plus the section 17
  measurements of the map surface against the app's own token scales.
- **MINDMAP_PLAN section 13**: what the surface is for, the measured tables,
  five decisions, six gated phases (13a to 13f) and the not-verified list.

## Left to do, in the order it should be taken

1. **Ask the owner how big his map is.** This is the first row and it is not
   optional: at 50 topics the drag stall is 67ms and nobody writes "the
   mindmap is slow"; at 500 it is 1.6 seconds. It decides whether 13a is
   urgent or academic, and no code should be written before the answer.
2. **13a, the render pass**, if the answer to 1 says so. `renderWhiteboard`
   costs 60.5ms at 50 topics, 281.4ms at 200 and 1,282.4ms at 500: 8.1 times
   the nodes for 21 times the render, so it is not linear and the fix is
   probably in what the pass rebuilds rather than in how fast it does it. The
   drag path is the place to start, because `dragWorstAt` 0.03 says the whole
   stall is the pick-up.
3. **13b to 13f** as section 13 writes them, each standing alone.

## Not verified, beyond section 13's own list

- **`mapperf.js` takes about three minutes** for its three sizes, which makes
  it the slowest entry in the sweep list by a wide margin. It is registered as
  the brief asked; whether a full-size run belongs in the routine sweeps, or
  whether the gate should pass `SIZES=50` and leave the curve for a deliberate
  run, is a decision nobody has made. Flagging it rather than deciding it.
- **`boot()`'s 1440 is only a default.** It takes `opts.viewport` (and, since
  INBOX 284, `hasTouch`/`isMobile` beside it), so the strip was read at 1024
  and at 390 by passing one. The previous session's note that the viewport is
  "pinned" is wrong as stated. 820, the tablet band, was still not read.
- **Dark mode is untouched by this read.** Every figure in section 13 is
  light.
- The free link was written through `/whiteboard/sketches` with the fields the
  connect drag produces, rather than by driving the drag. The row is the right
  shape; the drag's own hit-testing is not exercised, and whether
  `wbMapJoinByLink`'s invisible re-parent-or-cross-link choice is as confusing
  in the hand as it is on paper is unmeasured.
- Three probe bugs were found and fixed while taking these readings, each of
  which had produced a confident wrong answer first: a bare `fetch` of the
  export route (401, same body length in all three formats, reads exactly like
  "the export is empty"); `getPropertyValue("--space-1")` returning the
  `calc()` text rather than a length (every token null, every value reported
  off-scale, when in fact the map's chrome is entirely on the scale); and
  reading the strip and the ring while nothing was selected (0x0, which is
  "not on screen", not "no padding"). The lesson is in the commit messages.
