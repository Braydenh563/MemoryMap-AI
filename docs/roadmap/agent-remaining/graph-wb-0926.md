# Graph and whiteboard, 2026-09-26: what is left

> Companions: [GRAPH_PLAN.md](../GRAPH_PLAN.md) · [WHITEBOARD_PLAN.md](../WHITEBOARD_PLAN.md)
> · [MINDMAP_PLAN.md](../MINDMAP_PLAN.md) · [INBOX.md](../INBOX.md) (424 (a))
>
> One agent, its own worktree, port 8797, data dir `/tmp/mm-gw-8797` with the
> 417-note, 1,105-link fixture (`scratchpad/graph-fixture.js 400 1200`) and a
> 250-object board (`GW perf`, built by `scratchpad/ui-sweeps/gwperf.js`).
> Every figure is Chromium at 1440x900 in light unless another width is named.

## Built this run (each with its sweep)

| Step | Sweep | Before | After |
| --- | --- | --- | --- |
| Board pan: card grips out of the tree at rest | `wbpanlayers.js`, `gwperf.js board` | 256 layers; pan at 4x: 33/38 long tasks, Layerize 1.8/1.7s, median frame 67/50ms | 138 layers; 2/2 long tasks, Layerize 0.34/0.35s, median 17ms |
| Graph: a filtered-out map says so | `graphemptyfilter.js` | "Nothing to map yet" over 417 notes | "Every note is hidden", the cause, Show every note (7/7 at 1440 and 390) |
| Graph labels: four places, landmarks, hubs | `graphlabels.js` | fit: 0 labels, 0/10 hubs; 2x: 31 labels, 0/10 hubs | fit: 10, 10/10; 2x: 80, 9/10; 0 overlaps, 0 ordinary labels on a dot |
| Graph export (SVG renderer): no CSP noise | `graphexportcsp.js`, `test_no_style_attribute_writes.py` | 6,278 console errors per export | 0, fills kept |
| INBOX 419 retried (scrollbars, 125%) | `wbmoreflicker.js` (new), `wbmenuroom.js` (DSF) | | not reproduced: 48/48 + 32/32, 87/87 + 36/36 |
| Cold load: lazy tab pages inert until their code is in | `graphcoldlayout.js`, `test_lazy_bundle_calls.py` | layout change and leaving Graph threw | 6/6, no page error |
| Right-click on a link's grip opens the link's menu | `maptwokinds.js` | did nothing | 18/18 |

Also held by a new sweep, nothing to fix: `graphkeys.js` 7/7 (the map's
keyboard on the canvas renderer: + - 0, Shift+arrows, arrows, N, Enter).

## Open, found and not fixed

- **The graph's canvas commit in software raster.** `gwperf.js graph` at 4x
  (400 notes): the pan is 41 to 44 long tasks, 8.2s, of which `Commit` is
  6.6s, all `CanvasResourceProviderSharedImage::ProduceCanvasResource` (the
  2D canvas's bitmap copied per frame). `getContext("2d", { desynchronized:
  true })` measured Commit 6.6s to 0.3s and long tasks 8.3s to 6.3s, but it
  was not shipped: this sandbox has no GPU, where a real machine rasterises
  the canvas on the GPU and this copy is cheap, and a low-latency canvas can
  tear on a pan. Needs a measurement on a GPU machine (the owner's WebView2)
  before deciding. The script half at 1x is about 4ms a frame.
- **`window.addEventListener("resize", placeGraphPopup)`** (wiring.js) goes
  through a `LAZY_ENTRY_POINTS` stand-in, so resizing the window on any tab
  fetches the graph bundle on a session that never opened Graph. Rule 2 of
  that table ("only functions a person's own gesture reaches") says it should
  not be a stand-in there: guard it with `typeof` instead. Not mine to move
  alone (app.js's table); recorded.
- **The board's remaining layers**: 138 at rest are Chrome's sparsity rule
  (it will not merge far-apart cards into one layer) against the composited
  shape layer under them. A transparent backdrop the size of the content
  under `#wb-html-layer` measured 54 layers and Layerize 0.25s, but it is a
  hack on an internal heuristic; left.
- **MINDMAP_PLAN 13c**: nothing says which kind a connect drag will make
  while it is in flight.
- **INBOX 419** still needs the owner (window size, a recording).
- errors.js at 390 reports five `aside#sidebar` clippings on Notes (726px
  box); not this scope, present on the base branch.

## Not verified

Every frame figure is this sandbox's CPU in software raster, as relative
before and after numbers. The board-pan fix and the labels were not seen on
the owner's WebView2 window. The label placement is measured on one fixture
(random links, eleven categories); a notebook with real clusters may place
differently.

## WORLD_CLASS_PLAN D2, the note connections rail: built 2026-09-27

Paused in WIP commit 97950a9 and finished on top of it (the commit after the
merge of 277ae31). `scratchpad/ui-sweeps/notesrail.js`, first run, 24/24 with
no change needed: at 1440 the rail is 302px and the reading column 747px, at
1280 272px and 620px; no overlap with the list or the sidebar, no sideways
scroll; keys, a row following its note, hiding across a reload and the More
menu all pass; at 1024 and 390 no rail, and the Connections sheet opens.
Shots: `scratchpad/shots/gw-0926/notesrail-*.png` against
`notes-before-1440.png`.

Open, found and not fixed:

- The rail is not in the guided tour (tour.js, not this scope) and has no
  shortcut of its own (`DEFAULT_SHORTCUTS`, app.js, not this scope).
- A note that links twice to notes of the same title shows two identical
  rows; the rows carry no date to tell them apart. Same in the sheet.
- Not verified: dark theme, and the rail with the sidebar collapsed or
  dragged wide (the implicit track should hold; not measured).
