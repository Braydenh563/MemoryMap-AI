# Mind map: what is left

> Companions: [MINDMAP_PLAN.md](../MINDMAP_PLAN.md) ·
> [HANDOVER.md](../HANDOVER.md) · [../../DESIGN.md](../../DESIGN.md)
>
> Rewritten after the fifth run: §12.1 items 2 to 9 are built and their
> account is in HISTORY.md ("Moved from the plans, 2026-09-12"). Everything
> below was checked in a real Chromium against the running app, not read off
> the source.

## Closed, with where the numbers are

| Was | Now |
| --- | --- |
| A to E, H, and INBOX 42 | First three runs: MINDMAP_PLAN §9 and §10, HISTORY, and the commits they name. |
| F, the whiteboard and map previews | MINDMAP_PLAN §11.1. |
| G, Phases 4 and 5 | MINDMAP_PLAN §11.1. |
| §12.1 item 1, the map's own dock | HISTORY, "Moved from the plans, 2026-09-09". |
| §12.1 items 2 to 9 | HISTORY, "Moved from the plans, 2026-09-12": the edit strip, the node radial, the link radial, the mid-line add, the text-size grip, uncollapse, transplant and sever. |
| The two open decisions (Space, a trunk's colour) | MINDMAP_PLAN §12.0, decided 2026-09-12 with the reason for each. |

## The sweeps that gate this

| Sweep | Checks |
| --- | --- |
| `scratchpad/ui-sweeps/mindmap.js` | **76**, not re-run this run |
| `scratchpad/ui-sweeps/mindmap3.js` | **57**, not re-run this run |
| `scratchpad/ui-sweeps/mindmap-theme.js` (`THEME=dark`) | 7, **not re-run since the third run** |
| `scratchpad/ui-sweeps/mapdock.js` | **25** (was 17): the dock split, the delete doors, the empty map, the two §12.0 decisions, and the three ways out of a fold |
| `scratchpad/ui-sweeps/mapstrip.js` | **33**, new: the edit strip, both radials, the mid-line add, the grip, transplant and sever |
| `scratchpad/ui-sweeps/panlag.js` | **5**, new: where a pan's work happens |

Run them against a **fresh** data dir (`serve.sh <port> /tmp/mm-mapN`): the
sweeps assert board-gallery contents and tree shapes, so a dir left over from
an earlier run carries other boards into those checks.

## Left to do

### 1. The rest of §12.1 item 1: the dock's four menus, NOT started

Layout and Tidy are still in the top bar rather than the dock, and the
Style, Insert, Arrange, Present and Export menus named in item 1 are not
written. The Topic and Branch sections carry six controls between them.

**Next step**: the dock grammar allows seven visible controls and the rest
behind ▾ menus. Style is now mostly redundant (the strip and the link ring
carry colour, weight, size, alignment and line shape), so the honest list is
Layout ▾, Insert ▾, Arrange ▾ and Export ▾, and Layout is a move of
`#wb-map-layout` and `#wb-map-tidy` out of `#wb-topbar` rather than new UI.

### 2. The six sub-items of §12.1 items 2 to 9 that were not built

Each with its reason, in the plan at §12.1 under "2 to 9". In the order
worth doing them:

- **Node shape** (item 3). Decide the shape *list* first: of the plan's
  eight, parallelogram, trapezoid, cloud and diamond cannot hold a label at
  node size without clipping it. A `data.shape` of rounded (the default),
  pill, rectangle and none is four pure border-radius and background
  changes, no clip-path, all readable, and "none" is Coggle's own default
  look (text on the line). That is an INBOX-shaped decision, then a select
  in the strip beside the icon one.
- **An image in a node** (item 2). Needs the board's own upload path
  (`/whiteboard/media`) and a node whose body is a picture rather than a
  label, which is a second node shape rather than a fourth strip button.
- **Curve control points** (item 5). Two more `data` fields on the child and
  a third hit target per line, and it now has to compose with the three
  line shapes item 4 added.
- **Line thickness** (item 4), **Shift+drag to sever** (item 9) and
  **comments on a node** (item 3, which is §12.2 item 6): each is one line
  in the plan, and each has a reason there for being left.

### 3. The dark theme and the narrow viewport: STILL NOT re-run

Nothing added in the last two runs has been seen in dark mode or at phone
width. That now includes the node edit strip (measured **392px wide** at
1440), both radials (a ring of radius 68px around a node, which at 390px
puts two slots off-screen for a node near an edge), the mid-line `+` and the
drop-target outline.

**Next step**: `THEME=dark node scratchpad/ui-sweeps/mapstrip.js` and
`VIEWPORT=390x844 node scratchpad/ui-sweeps/mapstrip.js`, then read the
numbers. The strip has no wrapping rule and no `max-width`; at 390px it is
wider than the viewport by construction, so that one is a known finding
waiting to be measured rather than a question.

### 4. Perspectives on a map that actually has notes on it: NOT measured

Unchanged from the fourth run. Colour-by-category and colour-by-age were
measured on a map of topics, where both are the quiet grey by construction.

**Next step**: build a map of twenty note nodes across four categories
(`POST /boards/{id}/nodes` with `kind: "note"`), switch the View menu's
Colour by, and measure the distinct `--wb-branch` values plus contrast
against `--card` with `scratchpad/pngpixel.py`.

### 5. INBOX 43's second half: NOT started

The whiteboard's bottom tool rail and properties panel onto the bar and
panel recipes of `08-consistency.css`. Untouched for two runs.

### 6. The AI half, still unexercised

No real model has answered the map proposal prompt, and no map *tool*
(`read_mindmap`, `create_mindmap`, `add_map_node`, `link_map_nodes`) has been
driven from the UI in five runs.

## Found while measuring, not fixed

- **The pan lag is now half-attributed.** The structural half was real and is
  fixed: `handleWbZoom` deferred the three layer transforms to
  `requestAnimationFrame` along with the per-frame work, and the transform is
  the one write with nothing to save. It is written in the handler now
  (`panlag.js`, 5 checks). **It did not reproduce as a frame-rate problem**:
  the fourth run's six-condition A/B read 16.6 to 16.8ms medians throughout
  because this sandbox is vsync-bound, and nothing here can show what the
  owner sees. The change removes a deferral with nothing to gain; it is not a
  claim that the report is fixed. If it recurs, the next thing to look at is
  `--wb-grid-offset-*`, which repaints the container's background while the
  layers composite: moving the grid onto its own transformed layer is a
  separate change with its own measurement.
- **A map's exports do not carry what the strip and the rings now set.**
  `edge_label`, `edge_style`, `edge_dashed`, `bold`, `italic`, `icon` and
  `link` all round-trip through the tree endpoint and the object PUT, and
  none of them appears in the FreeMind `.mm` or OPML export. FreeMind has a
  place for three of them (`LINK` on a node, `<font BOLD="true"/>`,
  `<icon BUILTIN=.../>`) and OPML has `url`. §12.0 says a feature that cannot
  round-trip is not built, so this is a real gap in what landed this run, and
  the cheapest honest fix is `LINK` plus `<font>` in `_export_freemind` and
  `url` in the OPML export.
- **The two XML exports still recurse, and nothing bounds a map's depth.**
  Unchanged from the fourth run: `_export_opml` and `_export_freemind` walk
  the tree with a recursive helper while every other walk in that file is
  iterative. A thousand Tabs down one branch would export as a
  `RecursionError`, which is a 500.
- **Tidy still persists one node at a time**, and so do the new branch
  operations: copy branch is one POST per node (capped at 120 for that
  reason), transplant is one `/move` per child in the Ctrl case, and "open
  every folded branch" is one PUT per folded node. A bulk endpoint is the fix
  if any of them ever matters.
- **The node radial and the link radial can open off-screen.** Both are
  placed from a point (the node's centre, or the pointer) with no clamp to
  the viewport, unlike `wbOpenContextMenuFor`, which clamps. A node near the
  top or left edge of the canvas loses two or three slots. Not fixed because
  it wants the same clamp the flat menu has, and that clamp reads
  `getBoundingClientRect` on an element whose box is 0x0 here.
- **A sweep's CSS overrides are silently refused, and the run looks
  successful** (the page's CSP is `style-src 'self'`). `el.style.x = ...`
  from `page.evaluate` is allowed and is how every number here was taken.
- **Reading a resting `:hover` state needs the pointer moved away first.**
  The text-size grip's "invisible until pointed at" check read opacity 1
  twice before the sweep started parking the mouse at 4,4: Playwright leaves
  the cursor wherever the last click put it, and `:hover` is a real state.

## What could not be verified

- One viewport (1440x900, DPR 1) and light theme, for everything this run.
- No real inference, and no AI map tool driven from the UI.
- Touch: both radials' long-press paths and the mid-line `+` were written
  against `pointerType: "touch"` and never driven by a touch device.
- PDF export goes through the browser's print dialog, which Playwright cannot
  complete.
