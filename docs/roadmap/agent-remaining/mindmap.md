# Mind map: what is left

> Companions: [MINDMAP_PLAN.md](../MINDMAP_PLAN.md) ·
> [HANDOVER.md](../HANDOVER.md) · [../../DESIGN.md](../../DESIGN.md)
>
> Rewritten after the seventh run, which closed INBOX 177's four node-styling
> requests: a topic resizes (`3c9b874`), a topic can be a core idea and an
> ellipse, the bar down its edge is solid, dashed or none, and a branch's line
> carries its own thickness, dash and arrowhead. Their numbers are in
> MINDMAP_PLAN's "Placed from INBOX, 2026-09-13" and in the three sweeps
> below. Everything before that came from the sixth run, which closed the
> three things the fifth left: the exports now carry everything the strip and the rings set, both
> rings stay inside the canvas, and all of it has been measured in dark mode
> and at 390x844. Their account is in HISTORY.md ("Moved from the plans,
> 2026-09-12"). Everything below was checked in a real Chromium against the
> running app, not read off the source.

## The ninth run (INBOX 200 and 201): the control audit, first

This is the brief for everything under it. Measured, not read off the
source: `scratchpad/ui-sweeps/mapaudit.js` opens a map of **twelve topics**
(a trunk, four branches, seven below them) at 1440x900 and enumerates every
control that is actually on screen or one press away, skipping the option
buttons `enhanceSelect` adds so a four-value picker counts as one control.

### What a user meets, per surface

| Surface | Controls | What they do |
| --- | --- | --- |
| Top bar `#wb-topbar` | **13 visible**, 47 more inside its five menus (**60** total) | Back, which board, rename, new board, find, overview, then Insert (8), Edit (7), Arrange (10), View (17), Board (5), then the library toggle and full screen. |
| Bottom rail `#wb-tool-group` | **16** in six sections | Move (select, hand, lasso), Topic (add root, add child, add sibling), Branch (fold, branch colour, focus here), Layout (the layout picker, tidy), Connect (straight link, curved link), Edit (delete tool, undo, redo). |
| Node strip `#wb-map-strip` | **13**, in a box of 810x38 | Bold, italic, core, text size, alignment, topic colour, link to a page, icon, shape, spine, line thickness, line dash, line arrowhead. |
| Node ring `#wb-map-radial` | **8** slots, 28x28 each, **no label drawn** (each slot's `textContent` is empty; the caption span is empty at rest) | Add child, add sibling, fold, tidy this branch, copy this branch, add from the library, sever, reset to branch. |
| Link ring `#wb-map-link-radial` | **8** slots | Reverse, label, curve, elbow, straight, dash, line colour, cut. |
| The node itself | **7** buttons, 4 of them showing on a leaf | Link chip (hidden unless the node points somewhere), count badge (hidden unless folded), fold chevron (hidden unless it has children), text-size grip, resize grip, `+` add child, add from the library. |
| Context menu | **8** items, and **none of them reachable on a map node** | Copy, cut, add a child topic, add from the library, focus here, bring to front, send to back, delete. `wbOpenContextMenuFor` routes a single map node to the ring and returns before the menu is ever built. |
| Keyboard | **17** bindings | Tab child, Shift+Tab outdent, Enter sibling, F2 edit, C fold, F focus, Delete subtree, four arrows walk the tree, Ctrl+D, Ctrl+Z, Ctrl+Y, Ctrl+A, Ctrl+Alt+C/V, `[`/`]`, Escape. |

**112 controls on one surface**, before the context menu's eight.

### The duplicates: one action, three or more doors

| Action | Reachable from | Count |
| --- | --- | --- |
| Add a child | rail Topic, ring, the node's own `+`, Tab, context menu | **5** |
| Fold this branch | rail Branch, ring, the node's chevron, C | **4** |
| A colour | rail "Branch colour", strip "Topic colour", link ring's wheel, context menu's "reset the colour" | **4** |
| Delete | top bar Edit menu, rail's delete tool, Delete key, context menu | **4** |
| Add a sibling | rail Topic, ring, Enter | **3** |
| Add from the library | the node's own row, ring, context menu | **3** |
| Focus here | rail Branch, F, context menu | **3** |
| Cut a topic free of its parent | ring "sever", link ring "cut" (the same edit from the two ends of one line) | **2** |
| Dash the line into a topic | strip, link ring | **2** |
| Tidy | rail (the whole map), ring (this branch) | **2** |
| Reset to the branch | ring, context menu (colour only) | **2** |

### The orphans: one door, and not an obvious one

- **Everything on the link ring** (reverse, label, curve, elbow, straight,
  line colour): right-click a line, which nothing on screen says you can do.
- **Copy this branch**: the node ring only.
- **Add a top-level topic** (the only way to a second trunk, a §12.0
  decision): the rail's Topic section only.
- **Open every folded branch** and **what this map is made of** (the
  perspective legend): inside the View menu only.
- **The node's context menu, entire**: built, wired, and dead on a map node.

### What is on a map that a map has no use for

The Insert menu's eight (sticky, text box, image, note card, rectangle,
circle, arrow, connector), the Arrange menu's ten (align, distribute, z
order: a laid-out tree owns x and y), and View's board background and grid
style. **Twenty-one board controls in the top bar of a map**, against the
rail's own count of thirteen board-only tools already hidden there.

### The judgement this audit produces

Three of the four complaints in INBOX 200 are visible in the table above.
"What controls are available and where" has no rule: colour is in three
places, add-a-child in five, and the one control that makes a second trunk
is in none of the obvious ones. "How the item radials are used" is the ring
of eight unlabelled 28x28 icons, which is a memory test. And the ring is the
**only** door to six of its own actions while it silently eats the context
menu that was meant to be the discoverable one.

The fix is a place per action, written into MINDMAP_PLAN §12.5, and it is
the rest of this run.

## Closed, with where the numbers are

| Was | Now |
| --- | --- |
| A to E, H, and INBOX 42 | First three runs: MINDMAP_PLAN §9 and §10, HISTORY, and the commits they name. |
| F, the whiteboard and map previews | MINDMAP_PLAN §11.1. |
| G, Phases 4 and 5 | MINDMAP_PLAN §11.1. |
| §12.1 item 1, the map's own dock | HISTORY, "Moved from the plans, 2026-09-09". |
| §12.1 items 2 to 9 | HISTORY, "Moved from the plans, 2026-09-12": the edit strip, the node radial, the link radial, the mid-line add, the text-size grip, uncollapse, transplant and sever. |
| Their exports, their viewport clamp, the dark/narrow pass, and node shape | HISTORY, same date, "what the sixth run closed behind items 2 to 9". The shape list is a §12.0 decision. |
| The two open decisions (Space, a trunk's colour) | MINDMAP_PLAN §12.0, decided 2026-09-12 with the reason for each. |

## The sweeps that gate this

| Sweep | Checks |
| --- | --- |
| `scratchpad/ui-sweeps/mindmap.js` | **74 of 76** at 1440 after the eighth run repaired three stale checks in it. It was **68 of 76** at the start of that run, and the seventh run's "76, re-run and green" had stopped being true: see the eighth run's log at the foot of this file. Takes `VIEWPORT` now. |
| `scratchpad/ui-sweeps/mappan.js` | **11**, new: the middle-button pan and the layer sync under the hand tool |
| `scratchpad/ui-sweeps/panlayers.js` | new, a probe: which of the board's layers the compositor actually promotes |
| `scratchpad/ui-sweeps/mapmenus.js` | **11**, new: all five board menus, and the top bar against the window at 1440, 1024 and 820 |
| `scratchpad/ui-sweeps/newboard.js` | **6**, new: what the New board dialog has chosen when it opens |
| `scratchpad/ui-sweeps/mapring.js` | **4**, new: the ground under the node ring, by pixel, light and dark |
| `scratchpad/ui-sweeps/mapexportcard.js` | **3**, new: what the card of a map exported to the library says |
| `scratchpad/ui-sweeps/mapnarrow.js` | **3**, new: the fold chevron and the template offer at 390x844 |
| `scratchpad/ui-sweeps/maptidy.js` | **5**, new: a tidy's requests, its persistence, node size against the screen, and the framing after it |
| `scratchpad/ui-sweeps/mapperspective.js` | **12**, new: the perspectives on a map of twenty note nodes, light and dark |
| `scratchpad/ui-sweeps/wbrail.js` | **6**, new: the rail and the board's floating panels against the dock recipe |
| `scratchpad/ui-sweeps/mindmap3.js` | **57**, re-run and green after two repairs to the sweep itself (see below) |
| `scratchpad/ui-sweeps/mindmap-theme.js` (`THEME=dark`) | **9** (was 7), re-run: 9/9 dark at 1440, 8/9 dark at 390 (the one failure is the shell's own 7px overflow, below) |
| `scratchpad/ui-sweeps/mapdock.js` | **26** (was 25): the dock split, the delete doors, the empty map, the two §12.0 decisions, the three ways out of a fold, and the dock's reach at phone width |
| `scratchpad/ui-sweeps/mapstrip.js` | **39** (was 33): the edit strip, both radials, the mid-line add, the grip, transplant, sever, the strip's own box, both rings against the edge of the canvas, and the four node shapes |
| `scratchpad/ui-sweeps/panlag.js` | **5**, new: where a pan's work happens |
| `scratchpad/ui-sweeps/mapresize.js` | the resize grip (item 177), from the sixth run's end |
| `scratchpad/ui-sweeps/mapcore.js` | **10**, new: the core mark, the ellipse, the weight against a plain sibling, the round trip |
| `scratchpad/ui-sweeps/mapspine.js` | **9**, new: the bar on a topic's edge, against the core weight, the plain shape and a downward map |
| `scratchpad/ui-sweeps/mapline.js` | **13**, new: per-branch thickness on the ribbon and on a stroke, the arrowhead both ways, the dash, and the group a trunk is not shown |

Run them against a **fresh** data dir (`serve.sh <port> /tmp/mm-mapN`): the
sweeps assert board-gallery contents and tree shapes, so a dir left over from
an earlier run carries other boards into those checks.

`mapstrip.js` and `mapdock.js` take `VIEWPORT=390x844` now, as
`mindmap-theme.js` already did, and `THEME=dark` works on all three through
`lib.js`. At phone width `mapstrip.js` frames the map (the app's own
`wbZoomToFit`) before each gesture that has to land on a node: the
re-framing finding under "not fixed" says why.

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

### 2. The five sub-items of §12.1 items 2 to 9 that were not built

Each with its reason, in the plan at §12.1 under "2 to 9". In the order
worth doing them:

- **An image in a node** (item 2). Needs the board's own upload path
  (`/whiteboard/media`) and a node whose body is a picture rather than a
  label, which is a second node shape rather than a fourth strip button.
- **Curve control points** (item 5). Two more `data` fields on the child and
  a third hit target per line, and it now has to compose with the three
  line shapes item 4 added.
- **Line thickness** (item 4), **Shift+drag to sever** (item 9) and
  **comments on a node** (item 3, which is §12.2 item 6): each is one line
  in the plan, and each has a reason there for being left.

### 3. The dark theme and the narrow viewport: done for the strip, the rings and the dock, NOT for the rest of the map

Run at 1440 light, 1440 dark and 390x844: mapstrip 37/37 in all three,
mapdock 26/26 in all three, mindmap-theme 9/9 dark at 1440. The strip's
392px-in-a-364px-canvas was real and is fixed (it wraps); the rings are
clamped. What is still unseen narrow or dark: the mid-line `+`, the
drop-target outline, the templates card (`#wb-map-templates`, which covered
the only topic of a new map at 390 in a probe: reproduce before fixing, it
was an empty map), and everything in `mindmap.js` and `mindmap3.js`, neither
of which takes a `VIEWPORT` yet.

**Next step**: give `mindmap.js` and `mindmap3.js` the same four-line
`VIEWPORT` block `mapstrip.js` has, and run both narrow.

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

## Found while measuring, and fixed

- **`WB_MAP_STYLE_KEYS` carries the line's own four now** (`edge_style`,
  `edge_dashed`, `edge_width`, `edge_arrow`). The first two had been missing
  since the link ring was built, so a copied branch came out drawn
  differently from the one it was copied from; recorded by the sixth run and
  left, then closed with item 177's two new fields, because half a line's
  look travelling with a copy is worse than none of it. The reset slot's
  tooltip says so too.
- **The two XML exports carry a node's look now, and read it back.** What
  each format got, and why the four fields FreeMind has no word for ride as
  private attributes rather than as invented FreeMind, is in HISTORY
  ("what the sixth run closed behind items 2 to 9"). `MAP_STYLE_FIELDS` in
  `routes_whiteboard.py` is the one list the tree endpoint, both exports and
  both imports read, so a tenth field added to the strip and not to that list
  is the next silent loss.
- **Both rings slide inside the canvas.** `wbPlaceMapRadial` in
  `whiteboard.js`, shared by the node ring and the link ring, measured off
  the slots after the ring is shown. Its bound is the canvas minus the
  panels that float in bands across it, so a trunk near the top no longer
  puts three slots under the top bar.
- **The node edit strip wraps.** Two centred rows at 390x844, capped to
  `calc(100% - var(--space-6))`; unchanged at any width that fits it.
- **A click on a topic saved the topic, and raced the control you clicked.**
  `objDrag` runs for a plain click as well as a drag, and `objDragEnd` PUT
  the object every time; a click on the fold chevron therefore sent
  `collapsed: null` and `collapsed: true` to the same row in one tick with no
  defined order, and the map kept whichever landed second. Found by
  `mindmap.js`'s SVG export check counting two edges where the map had four,
  then instrumented in a real browser and confirmed against a worktree of the
  commit before this session. The save is gated on "did it really move" now.
- **`mindmap3.js` had been timing out since 2026-09-09**, when the Boards &
  maps dock put "Import outline…" and "Map from notes…" behind its ⋯. The
  sweep clicked a button inside a closed `<details>`, which Playwright reports
  as a thirty-second timeout rather than as "the control moved". Worth knowing
  for the next sweep that stalls: **a click that hangs is a z-order or a
  visibility bug**, not a slow app.

## Found while measuring, not fixed

- **`mapstrip.js` has not run since 2026-09-12** and is not a mind map
  regression: it asks for `#wb-selection-bar`, which `5796258` replaced with
  the single `#wb-context`, and dies on line 91 with "Cannot read properties
  of null". The other five map sweeps are unaffected. Left alone here because
  the bar is another agent's live work this session; the repair is that one
  id, and the checks around it need reading against what `#wb-context` now
  holds rather than renaming blindly.


- **The app shell scrolls sideways by 7px at 390x844**, on every tab, not
  just the map: `document.documentElement.scrollWidth` 397 in a 390 window,
  with 43 elements past the right edge and `.header-controls` (266px wide,
  right edge 397) the outermost. Not the map's, and not fixed here because it
  is the shell's own narrow-width layout; it is the one failing check in
  `mindmap-theme.js` at `VIEWPORT=390x844` ("the page itself does not scroll
  sideways"). Worth an INBOX entry of its own.
- **`wbMapNodeSize` and the rendered node disagreed by 94px at 390x844.**
  Found by the corner-ring check in `mapstrip.js`: a pan computed to put a
  node's centre at a chosen point landed it 47px (half of 94) to the left,
  every time, at phone width only. The sweep corrects itself by measuring and
  panning again, and records the drift; what it means is that some consumer
  of that size (the layout, the edge anchors, the ring's own centring) is
  working from a width the node does not have at that viewport. Reproduce
  before theorising: it may be a render ordering rather than a wrong width.
- **A map does not re-frame itself after a tidy**, which at 390 leaves the
  trunk's own centre off the canvas (measured: the root's box at x=-95,
  `elementFromPoint` at its centre returning the shell behind the canvas).
  §12.0 says auto-arrange is a command and not a constant, so this is a
  decision to make rather than a bug to fix: the honest options are to frame
  after a tidy that pushed content off the canvas, or to leave it and rely on
  Fit.

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
- **A sweep's CSS overrides are silently refused, and the run looks
  successful** (the page's CSP is `style-src 'self'`). `el.style.x = ...`
  from `page.evaluate` is allowed and is how every number here was taken.
- **Reading a resting `:hover` state needs the pointer moved away first.**
  The text-size grip's "invisible until pointed at" check read opacity 1
  twice before the sweep started parking the mouse at 4,4: Playwright leaves
  the cursor wherever the last click put it, and `:hover` is a real state.

## What could not be verified

- **The sixth run**: the exports were tested against their own importers and
  against the shapes FreeMind and OPML document, never against FreeMind,
  Freeplane, XMind, Coggle or MindMeister themselves, so "it opens there
  looking the way it did" is reasoned from their formats, not observed. The
  narrow pass is one viewport (390x844, DPR 1) and the dark pass one theme at
  1440; nothing was seen at 1024, at DPR 2, or on a real touch device.
- **The fifth run**: one viewport (1440x900, DPR 1) and light theme.
- No real inference, and no AI map tool driven from the UI.
- Touch: both radials' long-press paths and the mid-line `+` were written
  against `pointerType: "touch"` and never driven by a touch device.
- PDF export goes through the browser's print dialog, which Playwright cannot
  complete.

## The drag and pan report, third time: what the next run should not repeat

The owner, 2026-09-12 afternoon: "the whiteboard is still laggy to drag and
pan around, it isnt perfextly smooth and uniform like it should be on a
professional application". That is the third report. Two measured passes have
failed to attribute it and one real change landed (`a2ab550`, the pan's layer
transforms moved into the event), which the commit is careful to say does not
prove the report fixed.

An attempt this afternoon got no further, and the useful part is why, so the
next run starts past it rather than at it:

- **Frame rate is not the measurement here.** This sandbox is vsync-bound at
  about 16.7ms in every condition anyone has tried, including with the whole
  card layer removed. Six conditions returned six identical numbers.
- **Synthetic `PointerEvent`s dispatched from `page.evaluate` do not reach
  d3's drag behaviour at all.** A profile built that way measured 0ms per
  event across 60 events and was measuring nothing whatsoever. Use
  Playwright's own `page.mouse.down/move/up`, which produces trusted events.
- **`openWhiteboardBoard(id)` called from `page.evaluate` leaves the boards
  landing showing**, so the board never opens and `.wb-object` count is 0.
  `mapstrip.js`'s `newBoard(page, name, type)` clicks through the real UI and
  works; reuse it rather than writing a third one.
- **What is worth measuring** is the app's own work per event, which the
  display cannot hide: wrap `wbUpdateSelectionBar`, `renderWhiteboardNow`,
  `wbScheduleRender`, `wbSyncGridToTransform`, `wbRenderNavigator` and count
  calls and self time across a real 60-move drag, and count
  `Document.prototype.querySelector` calls over the same window. The pan work
  found its one real cost exactly that way: a document-wide query at 0.46ms
  per frame against 0.013ms for the grid sync beside it.
- The drag handlers are worth reading first for the same shape:
  `frontend/whiteboard.js` around the `.on("drag")` handlers does a
  `document.querySelector` per event to find the element it is moving, and
  calls `wbUpdateSelectionBar()` on every event.

**Nothing here is a claim that the cause is known.** It is a list of the
three ways to waste an hour on it, and the one measurement that has ever
produced a number worth acting on.

### The fourth pass, 2026-09-12 (WHITEBOARD_PLAN Phase 4): still not reproduced, and one real thing found on the way

A CDP CPU profile, which is the instrument the previous three passes did not
use: `scratchpad/ui-sweeps/dragprofile3.js` samples the stack at 100us through
a real 60-move `page.mouse` drag on a board of 120 objects, and rolls the
samples up by self time. It sees the drag handlers themselves, which no
monkey-patch can: `objDragStart`, `objDragMove`, `objDragEnd` and
`wbAlignmentGuides` are inside an IIFE and have no global binding, which is why
`dragprofile2.js` could only wrap the globals around them.

**The lag did not reproduce, again, and the profile says why it will not
here.** Over 60 moves on a 120-object board the app's total main-thread work
was 33.8ms, which is **0.56ms per move** against a 16.7ms frame, and **no
`whiteboard.js` frame reached 1ms of self time across the whole drag**. The
same drag with 119 of the 120 objects hidden measured 0.43ms per move. There
is nothing in this profile that could make a frame late, so the next pass
should not spend its time on `objDragMove` on the strength of a reading taken
here. What a profile taken on the owner's own machine would show is the open
question, and it is the only thing that can close this report.

**What the profile did find, which is real and is fixed:** the top of the
drag's own profile was not the whiteboard at all, it was p5. Six emblem
sketches (`EMBLEM_SLOTS` in `app.js`) are built at boot and five of them live
inside a panel that is `display: none` almost all the time (the lock screen,
onboarding, the chat and graph empty states, About), each running its own 24fps
draw loop for a canvas with no box. Measured on an idle board: **six canvases
alive, one visible, 5.0 `requestAnimationFrame` requests per displayed frame**.
They are paused by an `IntersectionObserver` now and started again the moment
their holder is on screen, which is what the owner's "never static and always
rotating" asks for; A/B inside one run, `scratchpad/ui-sweeps/wbdrawloops.js`:
**0.0 requests per frame, against 5.0 with the loops forced back on**.

This is **not** a claim that the drag report is fixed. It is work the app was
doing for nothing, found while looking for the report, and the honest status of
the report is unchanged: four passes, not reproduced in this sandbox.

**Still not looked at**, and the next thing worth trying: `paintDashClock`
(`dashboard.js`) appeared in every drag profile taken here, on a tab that was
not open. That is the same shape as the emblems and belongs to whoever owns
`dashboard.js`.

## The eighth run, in order, as it lands

Written after every commit so a run cut off mid-item is resumable from this
list plus `git log`.

- done `8733578`: INBOX 183a, the middle-button pan. `scratchpad/ui-sweeps/mappan.js`, 11 checks.
- done `5280e63`: INBOX 183b, the pan desync. Transform on the `<svg>` roots; `scratchpad/ui-sweeps/panlayers.js` reads the layer tree.
- next: INBOX 183c and 183e plus item 1 of "Left to do", which are one piece of work: `#wb-topbar` (index.html 4307 to 4513) overflows by 152px at 1024 and 113px at 820, measured by `scratchpad/ui-sweeps/mapmenus.js`.
- done `d15899f`: INBOX 183c and 183e, and the first half of "Left to do" item 1. Layout and Tidy are in the dock; the bar has 0 controls past the window edge at 1440, 1024 and 820 (`scratchpad/ui-sweeps/mapmenus.js`, 11 checks). Arrange's height did not reproduce: 493px against View's 453.
- next: INBOX 183d, no default board type in the new-board dialog. Grep `wb-boards-new` in `whiteboard.js` for the dialog that `mapmenus.js`'s `newBoard` drives.
- done `5544284`: INBOX 183d. The dialog did pre-select a kind; it now opens on the kind last made, and its button says Create (`scratchpad/ui-sweeps/newboard.js`, 6 checks).
- next: INBOX 191's first half, an opaque ground behind `#wb-map-radial` and `#wb-map-link-radial`.
- done `ab70d9b`: INBOX 191's first half, the ring's ground (`scratchpad/ui-sweeps/mapring.js`, 4 checks light and 4 dark).
- found, not fixed: **a right-click on a map node did not open the node ring** in `mapring.js` (state at the moment of the click: `wbSelectedItem` the node, `wbMultiSelection.size` 0, `wbSelectedMapNode()` the same id, the node on the canvas, and the ring still `hidden`). The sweep falls back to `wbOpenMapRadial` and says which route opened it ("opened by: direct"). `mapstrip.js` uses the same gesture and was green on 2026-09-13, so this wants reproducing against `#wb-context`'s rebuild before anything is changed.
- next: INBOX 184, a map exported as PNG to the board shows nothing at the foot of its image card.
- done `45a4a88`: INBOX 184, the exported map's card foot (`scratchpad/ui-sweeps/mapexportcard.js`, 3 checks; foot 32px and empty before, 75px with a sentence after).
- next: "Left to do" item 3, the `VIEWPORT` block for `mindmap.js` and `mindmap3.js`.
- done `40ffee1`: "Left to do" item 3. `mindmap.js` takes `VIEWPORT` now, and the first narrow run found two real things, both fixed and gated by the new `scratchpad/ui-sweeps/mapnarrow.js` (3 checks, green at 390x844 and at 1440x900): the node's action row overlapped its fold chevron by 140px2 and swallowed the press (a branch could not be folded at all, which is what made `mindmap.js` time out at 390), and the template offer on a new map overlapped that map's only topic by 8800px2 with the topic's own centre returning the card. Both 0px2 now.
- found, not fixed, at 390x844 (`mindmap.js`, 10 failures against 8 at 1440): "a click-drag inside a node's editor selects its text" reads empty, and "a new child lands beside its parent, on screen" reports the child 42px outside the canvas. Both are narrow-only and neither is one of the eight below.
- found, not fixed, at BOTH widths and present before this run: eight `mindmap.js` failures, seven of them the tree edge not meeting its nodes (worst 43px at rest at 390, 78px at 1440, 202px mid-drag, 1746px on a 200-node map) and one the export menu not offering Markdown and OPML on a map. The remaining list said 76 green after the seventh run, so something between `a195782` and `18b0595` broke them; they are the biggest open quality problem on this surface and want a run of their own.
- next: "Left to do" item 4, perspectives on a map of twenty note nodes.
- done `007a35c`: the seven "tree edge does not meet its nodes" failures were the measurement, not the map. A tree edge's default shape is a ribbon, a filled closed outline, so both of its path endpoints are the same corner at the parent end and a perfectly attached edge read as 43 to 1746px adrift. `mindmap.js` samples 64 points along the path and asks whether any touches each node's box. 68/76 to 72/76 at 1440, with no change to the app.
- next: the four sub-items of "Found while measuring, not fixed": the bulk move endpoint, the bounded XML exports, `wbMapNodeSize` against the rendered node, and framing after a tidy.
- done `0e94bdf`: the four sub-items of "Found while measuring, not fixed". Tidy and transplant go through `move-many` (measured: 1 request and 0 per-node PUTs for a 12-node tidy, and what it wrote is what comes back); a whole-map tidy frames the map again when something is off the canvas (worst overhang -1px at 390x844, -64px at 1440, and the trunk's own centre returns the topic), a §12.0 decision now. The two XML exports were **already** iterative and depth-clamped with a 1,200-deep test (`tests/test_mindmap.py::test_a_map_deeper_than_pythons_recursion_headroom_still_exports`): the remaining list was stale. `wbMapNodeSize` against the rendered node **did not reproduce**: 0px worst over 13 nodes at both 1440x900 and 390x844.
- also repaired two more stale `mindmap.js` checks: `#wb-export-menu` has not existed since the export became a dialog, and the app's own selection popup was left over a later step's button (a click that hangs is a z-order bug). 68/76 at the start of this run, 74/76 now.
- found, not fixed: the last two `mindmap.js` failures are one thing, a **2.6px** gap between a tree edge and the node it joins during and after a single-node drag (0px at rest, so it is the drag path's anchor, not the layout's). Under the sweep's 2px bar and invisible at 100%, but real.
- next: list item 6 (perspectives on a map of twenty note nodes) and then item 8.
- done `f9816e6`: "Left to do" item 4, perspectives on a map that has notes on it. `scratchpad/ui-sweeps/mapperspective.js` builds twenty notes across four categories (`POST /entries` with a `category` name: there is no POST /categories, a category is made by filing a note into it), hangs each on a map as a reference node, and reads `--wb-branch` off every rendered node under each perspective. 12/12 in light and 12/12 dark. Category gives 5 colours (the four plus the quiet grey), age 2, notes 2, branch 11; every colour that means something clears 3:1 against the card (worst 4.07:1 light, 4.09:1 dark, best 12.97:1) and all three non-branch perspectives draw the legend.
- found, not fixed: the quiet grey is `--muted` and measures **2.77:1** against the card in light (9.6:1 in dark). It carries no information (it is what a node wears when it has nothing to say under the perspective in force), so it is excluded from the bar here rather than raised: raising it means raising `--muted` for the whole app, which is another surface's decision.
- next: list item 8, MINDMAP_PLAN §12.1 item 2's five sub-items and then INBOX 43's second half.
- done `b16ef24`: "Left to do" item 5, INBOX 43's second half, as far as measurement supports. `scratchpad/ui-sweeps/wbrail.js` (6 checks, green) reads the rail and every floating panel against the Notes dock as the recipe renders. Already right: a control in the rail is one height (36px) and that is the dock's own, and one radius (50%). Wrong and now fixed: the zoom cluster and the tool row share the board's bottom edge and were drawn as two shapes, 14px radius and 4px of inset against 999px and 4px/6.4px. Both are a pill with the same inset now, by the rule already written in `06-timeline-dialogs.css` ("a pill is a single row of controls"). The three-class selector is deliberate: `.card.glass` sets that inset at (0,2,0), so a two-class rule ties and loses on file order, which is exactly what the first attempt measured.
- NOT done, and a judgement rather than a shortfall: the rail is deliberately **not** put on the `.dock` recipe. A `.dock` is a tab-level bar with an identity zone, a find zone and a card radius; the rail is a glass pill of round icon buttons that floats over a canvas and can be re-docked to the side. Making one the other is a redesign of the board, not a consistency fix, and INBOX 43's own words are not specific enough to license it. If the owner meant the rail should become a card-shaped dock, that is a brief.
- NOT started: MINDMAP_PLAN §12.1 item 2's five sub-items. Four of the five carry a recorded reason for being left in the plan itself (§12.1, "2 to 9"), which is a decision rather than an omission: line thickness was decided against and has since arrived by another route (item 177), Shift+drag to sever collides with drag-to-transplant on the same pointer, an image in a node is a second node shape, and comments on a node belong to §12.2 item 6. Curve control points is the one with no blocking reason, and it is two `data` fields on the child plus a third hit target per line.
