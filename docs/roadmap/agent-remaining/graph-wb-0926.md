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
- ~~**MINDMAP_PLAN 13c**: nothing says which kind a connect drag will make
  while it is in flight.~~ Built 2026-10-04 (`maplinkcue.js`).
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

## Paused, 2026-09-27: WORLD_CLASS_PLAN D9, the web clipper (backend built)

Paused at the coordinator's word for the performance pass. Built and tested:
`POST /links/clip` (`api/routes_webclip.py`, locked), refused with a sentence
while `web_search_enabled` is off; `core/webclip.py` fetches through S5's
`public_addresses` on every hop, pinned to the checked address (the web
reader's `_pin_url` and `_PinnedAdapter`), with 3 MB and 15 s caps on the
whole fetch, and extracts the main content to markdown with the standard
library's HTML parser (no attributes kept, http(s) links only, absolute,
tracking stripped); the note goes through `create_entry` with `source_url`,
so it is filed, embedded and indexed. The privacy receipt names it "Web
clipper"; `test_outbound_fetch_guard.py` lists it as untrusted.
`tests/test_webclip.py`: 33 tests (6 schemes, 8 private ranges, mixed
answers, redirects to a private name, a private literal and another scheme,
the redirect cap, pinning, size by body and by header, time, non-page
content, three fixture pages, the note shape, and the route: off, on,
private, scheme), all passing.

Left, in order:

1. The intake: a bookmarklet can't POST to the app from another site (the
   Origin check refuses it, rightly), so it opens `<origin>/?clip=<url>` and
   the app, once unlocked, asks "Clip this page?" and POSTs itself. One line
   in `startApp` (app.js), beside `takeSharedIntake`, plus a new
   `frontend/webclip.js`.
2. The Settings row in Web search: the bookmarklet's code, built from
   `location.origin`, in a read-only field with a Copy button, and one line
   saying it uses the same opt-in.
3. The PWA share target: `share_url` alone could go to the same "Clip this
   page?" prompt, but that is more than one line (the share also carries a
   title and text that Capture takes today), so it is left alone as briefed.
4. A sweep (clip intake with the web off and on, against a local fixture
   server is impossible by design since local addresses are refused; so the
   route is stubbed in the page) and errors.js; the CHANGELOG line; D9's
   state line in WORLD_CLASS_PLAN.

## The performance pass, 2026-09-27

`scratchpad/ui-sweeps/perfpass.js` (idle per tab with the companion off and
as Atlas at Medium, tab switches cold and warm, typing, Settings) at 1x CPU on
the 418-note fixture; `graphsettle.js`, `cpuprofile.js`, `typeprofile.js`,
`idletrace.js`, `graphrevisit.js` and `bootprofile.js` to find causes. Three
fixes, one commit each:

| Fix | Before | After |
| --- | --- | --- |
| Graph canvas `desynchronized` (64b89c5) | first visit: 937 to 1,091ms of main thread in each of the first 5s; idle window 540 ms/s; cold switch 5 long tasks (100ms), warm 6 (111ms) | 97 to 163ms a second; 72 ms/s; cold 0 to 1 (53ms), warm 0 to 1 |
| autoGrow fast path (62e97fb) | chat composer, 40 keys: dispatch 456ms, 221 style recalcs, 124 layouts, 82 forced by autoGrow | 239ms, 137, 42, 0 |
| Emblems drawn when shown (3e3a631) | 6 p5 canvases after the unlock, renderEmblem 45 to 83ms | 3, 18 to 20ms |

Found and left, with the reason:

- **The companion (avatars.js, the companion agent's).** Atlas at Medium adds
  3 to 30 ms/s idle: 31 on the Dashboard and 29 on Graph, mostly style and
  layout (15.7 and 17.4 ms/s), with its figure's layers restyled by their
  animations about seven times a second (`idletrace.js COMPANION=atlas`),
  and one 77ms long task on Notes in one run. Named for its owner.
- **Typing in the Notes capture box: about 21ms of event dispatch per key**,
  of which CodeMirror's own `scrollIntoView` forces one style and layout per
  key (40 of 40) and the mirror back to the textarea (`noteSurfaceMirror`,
  documents.js) about 2ms. The engine's cost, recorded before (HISTORY's
  performance table); not changed.
- **Event Timing still reads 32ms per key in the chat composer** after its
  dispatch halved: this sandbox paints on a fixed 16.7ms beat, so an input
  that misses one frame's deadline reads as two frames whatever it costs.
  The CPU figures are the ones that moved.
- **Library, cold switch 252 to 286ms**: parsing its 1.7 MB bundle on first
  use (WORLD_CLASS_PLAN A1's lazy loading), after which a switch is 30 to
  37ms. Prefetching at idle would move the parse to a moment nobody chose.
- **Graph pan at 4x**: 34 long tasks, 6.7s over 40 moves, now mostly the
  canvas redraw rasterised in software (`gwperf.js graph`). Redrawing a
  pan from a cached bitmap is the next step, and a design change.
- **The reminder chime's AudioContext is made inside the first click**
  (`primeReminderAudio`, status.js, 23ms on the unlock). Could be made after
  the gesture instead; status.js is shared, so named rather than changed.
- Settings opens in 130 to 172ms at 1x (331ms with a 118ms task at 4x) and
  scrolls at a steady frame: not a finding.
- Idle with the companion off is 1 to 2 ms/s on every tab but Graph.

## The rich picker, 2026-09-27

The "/" menu's rows as a recipe (`frontend/js/rich-picker.js`, DESIGN.md's
recipe index, `test_ui_recipes.py`), drawn by the "/" and "[[" menu, the
command palette and the Library's Create picker; the note box's `[[` is the editor menu now, at the caret.
Sweep `richpicker.js` (1440 and 390, light and dark); shots in
`scratchpad/shots/rich-picker/` (`before-*`, `after-*`).

- **Not converted, on purpose:** Find anything's rows (search results with a
  rendered two-line snippet and a date, a different shape), the document's
  word completion (an inline ghost of the next word), the enhanced select
  (a `<select>`'s own list) and a space's icon grid. The ratchet in
  `test_ui_recipes.py` holds those three hand-built `role="option"` lists.
- **Not verified:** a screen reader on the palette's
  `aria-activedescendant` (now on the input); the desktop window (WebView2).

## INBOX 430, phone, tablet and graph, 2026-09-27

Built, each with its sweep (touch on, 390x844, 768x1024, 1024x768):
`topbarshape.js` (tabs centred), `phonebottom.js` (runs into More, the
status bar meets the tab bar), `contentsphone.js`, `lightboxphone.js`,
`wbtouchpan.js`, `graphfitphone.js` (shape, arc, radial, tree root, the
controls clear of New note), `graphsize.js` (View > Size), `docphone.js`
(the Documents editor). The note box's `[[` is the editor menu at the
caret (`richpicker.js`).

- **Not reproduced: the layout flicker in devtools' responsive mode.**
  `layoutflicker.js` (10 samples over 5s at the three sizes, touch on, at
  DSF 1 and 3) and `flickerscan.js` (18 widths, 600 to 1280, touch on and
  off, real scrollbars) found every width still. Nothing in the app reads
  `outerWidth` or `screen.width`, the two numbers devtools' device mode
  makes disagree with the viewport. Needs the owner's width, zoom and
  device preset to reproduce.
- **Not verified:** a real phone or tablet (every touch here is CDP's);
  the thumb bar above a real on-screen keyboard; WebView2.
- **Open:** the Documents dock on a tablet is still two rows at 1024 (its
  identity asks for 22rem beside the actions); the arc of a 430-note
  notebook framed whole is a line of dots until zoomed.

## WORLD_CLASS_PLAN 22.1 items 1 and 2, 2026-09-27

- **Built:** the hash router (`frontend/js/router.js`, `tests/test_router.py`,
  `routersweep.js`) and height-aware density (`tests/test_density_height.py`,
  `laptopfold.js`). navigation.js's stack is kept, mirrored rather than
  replaced: it is what names a step in the history menu and how each kind of
  step is reopened (`openHistoryEntry`), and parity is proven by
  `routersweep.js` (browser and in-app Back and Forward walk the same views).
- **Not done: the sub-tabs merged into the list toolbar.** The Notes list's
  dock is already at DESIGN.md's seven-control ceiling
  (`test_dock_grammar.py`), and the four sub-tabs do not fit its row at
  1093 (about 390px of tabs beside a 160px filter and 290px of actions in
  800px). Recommendation: on a window 700px tall or less, the Notes sub-tab
  strip takes the dock's identity slot as a compact seg (the "All notes"
  title goes, the filter keeps its minimum), which saves the strip's 68px;
  a decision for the owner or the plan, since it changes the dock grammar.
- **Not measured with real notes:** the fixture's notes are one line, so
  the Notes gate (4 cards at 1093x614) passes with room; a notebook of
  longer notes shows fewer. The status bar folding into the top bar under
  680px (the plan's third lever) is not built.
- **Not verified:** the router in the desktop window (WebView2's history),
  and a reload while locked (the address is kept and opened after unlock,
  measured only with the sweep's own unlock).

