# The map's tools, its two connections and its pan (MINDMAP_PLAN section 13): what is left

> Companions: [MINDMAP_PLAN.md](../MINDMAP_PLAN.md) **section 13** (the read,
> the decisions, the phases) · [maprender.md](maprender.md) (13a, the drag
> pick-up) · [HISTORY.md](../HISTORY.md) "Moved from the plans, 2026-09-21"
>
> One agent, one worktree (`worktree-agent-mapux2`), port 8794, data dir
> `/tmp/mm-mapux2`. Every figure below was taken in a real Chromium against
> the running app at 1440x900 in light unless another width is named.

## Done

- **13b, the topic strip is sized like a topic.** 959.4 x 38 to 314 x 38 at
  1440, 1024 and 820 (0.67, 0.94 and unread, to 0.22, 0.31 and 0.38 of the
  window); 348.4 x 150 to 314 x 54 at 390. Fourteen unlabelled icons in one
  run to five controls, three of which are named doors. `mapstrip.js` 39/39.

## Left to do

- The rest of section 13's phases, in the plan's own order.

## Found, not fixed

- **`scratchpad/ui-sweeps/mapstyle.js` fails its "radial slot" check on the
  base branch too** (`claude/open-sections-a-b`, measured by stashing this
  worktree's changes and re-running it): the slot it measures reads `w: 0`.
  Not this work's, not investigated.

## Not verified

- Dark is unmeasured on the new strip; every figure is light.
