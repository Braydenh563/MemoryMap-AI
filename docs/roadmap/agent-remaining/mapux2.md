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

- **13c, one vocabulary for two connections.** Both kinds on one ring, which
  names the kind; no board context bar for a cross-link on a map; the rail
  says cross-link on a map; a cross-link draws in the map's ink, dashed, and
  is marked as one before its first paint rather than at the next reload.
  `maptwokinds.js` 10 checks to 16, 16/16, six failing on base.

- **The map's canvas answers a right-click and a double-click** (§13, in
  place of the withdrawn 13f). `mapdoors.js`, new, 7/7 and 3/7 on base, in
  `scripts/gate.sh`'s sweep list.

## Left to do

- The rest of section 13's phases, in the plan's own order.

## Found, not fixed

- **The Insert and Arrange menus are still in a map's top bar markup**, 18
  controls, hidden with their wraps by `wbSyncMapChrome`. Not drawn, not
  exposed, dead on a map. A tidy-up, not a bug.

- **A right-click on a selected cross-link's bend grip does nothing.** The
  grip takes the press (measured: `circle.wb-link-bend-handle` under the
  pointer at the line's mid-point), so the ring never opens there.
  `maptwokinds.js` works around it by pressing at 35% of the line's length.
  The fix is a `contextmenu` on the grip that opens the same ring.
- **Nothing says which kind a connect drag is about to make while it is in
  flight.** Both kinds say what they made once it lands. A live cue on the
  drag preview is the remaining half of §13.2's "one gesture produces either,
  decided by something invisible".

- **`scratchpad/ui-sweeps/mapstyle.js` fails its "radial slot" check on the
  base branch too** (`claude/open-sections-a-b`, measured by stashing this
  worktree's changes and re-running it): the slot it measures reads `w: 0`.
  Not this work's, not investigated.

## Not verified

- Dark is unmeasured on the new strip; every figure is light.
