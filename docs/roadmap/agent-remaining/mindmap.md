# Mind map: what is left

> Companions: [MINDMAP_PLAN.md](../MINDMAP_PLAN.md) ·
> [HANDOVER.md](../HANDOVER.md) · [../../DESIGN.md](../../DESIGN.md)
>
> Rewritten after the fourth run: reports A to H are closed, F (the previews)
> and MINDMAP_PLAN Phases 4 and 5 landed this run, and the detail lives in
> §11 of the plan and in the commits. Everything below was checked in a real
> Chromium against the running app, not read off the source.

## Closed, with where the numbers are

| Was | Now |
| --- | --- |
| A to E, H, and INBOX 42 | First three runs: MINDMAP_PLAN §9 and §10, HISTORY, and the commits they name. |
| F, the whiteboard and map previews | MINDMAP_PLAN §11.1. Aspect, colour, curves, the paper, the empty state, the label floor and a per-board cache. Measured: aspect 3.0 drawn at 3.000 and 0.5 at 0.500, 0.0% off; a tall board's paper 82.2px inside a 293.5px card. |
| G, Phase 4 (items 15 to 17) | MINDMAP_PLAN §11.1. "Make a map of these notes" as propose-then-create, and FreeMind `.mm` both ways. |
| G, Phase 5 (items 18 to 21) | MINDMAP_PLAN §11.1. Focus, perspectives, metrics, templates. Measured on a 201-node map: 201 drawn, 11 at one focus step, 201 again after Show all. |

## The sweeps that gate this

| Sweep | Checks |
| --- | --- |
| `scratchpad/ui-sweeps/mindmap.js` | **76** (was 63): Phase 2, the 200-node scale run, and Phase 5 |
| `scratchpad/ui-sweeps/mindmap3.js` | **57** (was 37): Phase 3, the preview redesign, and the generation flow |
| `scratchpad/ui-sweeps/mindmap-theme.js` (`THEME=dark`) | 7, **not re-run this run** |

Run them against a **fresh** data dir (`serve.sh <port> /tmp/mm-mapN`): the
sweep asserts board-gallery contents, so a dir left over from an earlier run
carries other boards into those checks.

## Left to do

### 1. The dark theme and the narrow viewport: NOT re-run

`errors.js` is clean at 1440, 1024, 820 and 390px (0 page errors, 0 layout
findings), which covers the Library gallery's new previews at phone width and
says nothing about the map canvas: it never opens a board. Nothing added this
run has been seen in dark mode at all. The preview's paper (a `--border`
stroke over a `--chip-bg` fill), the focus bar, the legend, the template offer
and the proposal dialog are theme-aware by construction and none has been
looked at.

**Next step**: `THEME=dark node scratchpad/ui-sweeps/mindmap-theme.js` and
`VIEWPORT=390x844 node scratchpad/ui-sweeps/mindmap3.js`, then read the two
screenshots. The panels are `position: absolute` with a `--wb-h-topbar`
clearance; a phone's wrapped top bar is exactly the case that clearance
exists for and exactly the case nobody has watched.

### 2. Perspectives on a map that actually has notes on it: NOT measured

Colour-by-category and colour-by-age were measured on a map of topics, where
both are the quiet grey by construction. What a dozen categories look like
*together* on one map, and whether the four age blues are distinguishable at
node size, is reasoned, not seen.

**Next step**: build a map of twenty note nodes across four categories
(`POST /boards/{id}/nodes` with `kind: "note"`), switch the View menu's
Colour by, and measure the distinct `--wb-branch` values plus contrast
against `--card` with `scratchpad/pngpixel.py`.

### 3. INBOX 43's second half: NOT started

The whiteboard's bottom tool rail and properties panel onto the bar and panel
recipes of `08-consistency.css` (one control height, one radius, icon-only
buttons on the icon recipe). Untouched this run.

**Next step**: `docks.js` already reports the whiteboard's top bar as 15
controls at two heights (32 and 36px), which is the same defect one row up;
measure the tool rail the same way before changing anything.

### 4. The AI half, still unexercised

No real model has answered the map proposal prompt, and no map *tool*
(`read_mindmap`, `create_mindmap`, `add_map_node`, `link_map_nodes`) has been
driven from the UI in four runs. §7 of the plan asks for both.

**Next step**: the dev-only llama.cpp script planned in WORLD_CLASS_PLAN 9 is
the honest way to close this; until it exists, say so rather than claiming the
prompt works.

## Found while measuring, not fixed

- **A floating panel with a constant `top` lands under the top bar.** The
  focus bar was written with `top: var(--space-4)` and rendered *inside*
  `#wb-topbar`'s box: its own + button could not be clicked, and Playwright
  reported that as a four-minute timeout rather than as a failure. Fixed with
  `--wb-h-topbar` (the measured height) and now asserted in pixels by the
  sweep. Worth knowing: **a click that hangs a sweep is a z-order bug**, not a
  slow app.
- **The two XML exports recurse, and nothing bounds a map's depth.**
  `_export_opml` (which predates this run) and `_export_freemind` both walk the
  tree with a recursive helper, while every other walk in that file is
  iterative for exactly this reason. An import is capped at
  `MAX_IMPORT_DEPTH`, but a map built by hand is not: a thousand Tabs down one
  branch would export as a `RecursionError`, which is a 500. The fix is the
  same shape `_map_branch_colors` uses; it was left alone because touching the
  OPML export was not this run's work and the case has never been seen.
- **Tidy still persists one node at a time.** `wbSaveBulkMove` awaits a PUT
  per moved node, so a 200-node tidy renders immediately and then spends about
  3s writing (200 requests, measured 3021ms this run). Nothing is lost; a
  reload inside those seconds would see some nodes at their old places. A bulk
  move endpoint is the fix if it ever matters.
- **A sweep can stall for minutes with the server answering nothing, and it is
  the embedding pass, not a hang.** The server log says so between the request
  lines (`Batches: 0%|`). Check that before spending an hour on it, and do not
  run a sweep beside two test suites on this box.

## What could not be verified

- One viewport (1440x900, DPR 1) and light theme, for everything this run.
- No real inference, and no AI map tool driven from the UI.
- PDF export goes through the browser's print dialog, which Playwright cannot
  complete; the FreeMind and Markdown downloads were asserted at the endpoint,
  not at the file that lands on disk.
- The preview cache is not measured under concurrency: two requests racing
  recompute the same picture and one overwrites the other with an identical
  value, which is harmless by construction rather than by test.
