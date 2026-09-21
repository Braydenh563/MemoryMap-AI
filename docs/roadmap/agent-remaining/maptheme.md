# The map's own look (MINDMAP_PLAN section 13e's other half): what is left

> Companions: [MINDMAP_PLAN.md](../MINDMAP_PLAN.md) **section 13** (the read,
> decisions 8 to 11, the phases) · [mapux2.md](mapux2.md) (13b, 13c, the
> canvas's two gestures, 13e's first half) · [HISTORY.md](../HISTORY.md)
> "Moved from the plans, 2026-09-21"
>
> One agent, one worktree (`worktree-agent-maptheme`), port 8796, data dir
> `/tmp/mm-maptheme`. Every figure below was taken in a real Chromium against
> the running app at 1440x900 in light unless another width or theme is named.

## Done

- **13e's other half, the map's own theme.** Ten of the eleven per-topic
  fields can be set once for the whole map and are resolved when a topic is
  painted, so a topic that was never told otherwise follows and one that was
  keeps what it was given. One request themes 25 topics. `maptheme.js`, new,
  **24/24** in light at 1440, in dark at 1440 and at 390; on the base branch
  it stops at its second check (`wbMapTheme is not defined`).

- **The bulk operation: "bring every topic back to the map."** The ring's own
  "reset to branch" at the map's scope, one endpoint and one transaction,
  keeping a picture. Measured: 3 topics cleared in 1 request, drawing the
  map's shape rather than the app's default afterwards.

- **13d, a cross-link survives an export.** FreeMind's own `<arrowlink>`,
  OPML's private `_id`/`_links`, Markdown deliberately neither (decision 12).
  Both XML formats round-trip; a link whose far end is not in the file is
  dropped; a map with no cross-links exports the file it always did.
  `maptwokinds.js` 16 checks to **17/17**.

- **The conflict markers committed on `claude/open-sections-a-b`.** Three
  `<<<<<<<`/`=======`/`>>>>>>>` lines in each of `CHANGELOG.md` and
  `docs/CHANGELOG.md`, from the mapux2 merge, failing
  `tests/test_plan_hygiene.py` on the base branch. Both sides were kept.

## Left to do

- **The branch palette and the font choice**, the other two things §13.4
  names as missing at map level. Both are drawn in two places rather than
  one: the canvas takes `d3.schemeTableau10` (`wbMapColors`) and the Library
  thumbnail takes `MAP_BRANCH_PALETTE` (routes_whiteboard.py), so a picked
  palette has to reach `_board_preview` and `_preview_fingerprint`'s cache
  key or the same map is two pictures. Recorded as MINDMAP_PLAN decision 8.

- **The rest of section 13's phases, in the plan's own order**: 13a-open (the
  render pass proper, the highest-value row in the section, and the one that
  answers the open, the pan and the zoom together) and 13g (the middle-button
  pan, which needs the owner rather than a sweep).

## Found, not fixed

- **A topic cannot be pulled back to the *app's* own default for a field the
  map themes**, only to another named value or to the map's. The strip's
  blank option means "follow the map", and where the map says something the
  app's own default has no name in the strip's vocabulary. Narrow, recorded
  as MINDMAP_PLAN decision 9 rather than solved; the fix is an explicit
  option per themed select, which needs a stored name for each default.

- **The theme is not carried by the three XML exports as a map-level fact.**
  It is resolved into each node's style on the way out, so an export of a
  themed map looks like the map (`test_an_export_of_a_themed_map_...`), but
  a re-import comes back as topics that each carry the look rather than as a
  themed map. None of Markdown, OPML or FreeMind has a place for a map-level
  look; a MemoryMap-specific attribute on the root would be the way in.

- Everything mapux2.md lists under its own "Found, not fixed" is unchanged:
  the Insert and Arrange markup still in a map's top bar, the right-click on
  a cross-link's bend grip, no live cue of which kind a connect drag will
  make, and `mapstyle.js`'s "radial slot" check failing on the base branch.

- **An `<arrowlink>` written by FreeMind itself is untested.** The round-trip
  is this app's own file both ways; a real `.mm` from FreeMind or Freeplane,
  whose arrowlinks carry `STARTINCLINATION`, `ENDINCLINATION` and an `ID` of
  a shape this app does not write, was not tried.

## Not verified

- **Real inference and the agent's view of a themed map.** `MAP_STYLE_FIELDS`
  reaches the AI tools through the tree endpoint, which deliberately still
  reports what each node itself carries; nothing was measured about what a
  model makes of a map whose look is in the board's settings.

- **The preview cache against a theme change.** The Library thumbnail draws
  structure and branch colour, neither of which the ten themed fields touch,
  so nothing should move; it was reasoned, not measured.
