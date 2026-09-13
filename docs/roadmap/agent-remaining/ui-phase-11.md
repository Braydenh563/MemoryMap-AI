# Left by the Phase 11 / INBOX 164-165 agent, 2026-09-13

Five steps landed, each measured, each with its own sweep, each pushed:
`aec699b` the sticky selection bars (INBOX 165), `d8f5920` the Files row indent
(INBOX 160), `0a1cd41` the board previews (INBOX 164, first surface), `058a1d2`
the graph minimap (INBOX 164, second surface), `f1b018b` the picture cards'
keyboard route (INBOX 164, third surface), `cedba52` the phone tab bar's caption
(UI_MODERNISATION_PLAN Phase 11, item 1, part).

Nothing is half-built. What follows is what is genuinely still open, in the order
a next session should take it.

## 1. Phase 11 item 1: the five-item bar and its More sheet

The measured defect is fixed (the bar now names the tab you are on); the design
in the plan is not built. The remaining shape, and the reason it is a session of
its own rather than a rule:

- **The bar.** Five columns (Notes, Chat, Graph, Library, More) instead of seven.
  `dockTabBar` (`frontend/app.js`, search `PHONE_TABS`) moves `#tab-bar` to the
  body for the phone band and back into `#top-bar` above it; the five-item shape
  needs a host element beside the strip for a More button that is **not** a
  `role="tab"` in the tablist, so the cleanest move is a `#phone-tab-dock` in
  `frontend/index.html` as a body child that `dockTabBar` moves the strip into,
  with the More button as its sibling. Dashboard, Timeline and Reminders then go
  `display: none` in the phone band, and `revealTab` (`app.js`) has to light the
  More button while one of those three is showing, or the bar says nothing about
  where you are on three of the seven tabs.
- **The sheet, and the blocker.** DESIGN.md's recipe index has **no row for a
  sheet**, and two surfaces already build one by hand (`.sidebar-sheet-open` in
  `frontend/css/07-whiteboard-misc.css` for the three sidebars, and
  `.graph-popup-sheet` for the graph's dock). Standing order 11 means the More
  sheet adds the recipe row and its lint in the same commit as the feature. The
  recipe needs to cover: which edge it comes from, the scrim, Escape and
  outside-click closing, where focus goes and returns, and the bottom inset
  (`env(safe-area-inset-bottom)`), which the existing two get from their own
  rules rather than from a shared one.
- **Then INBOX 104**, the recede-to-icons on scroll down. The listener shape to
  copy is the scroll-edge one in `app.js` (search `SCROLL_EDGE_BARS`): a single
  capture-phase `scroll` listener that picks its target by measuring rather than
  by name, coalesced with `requestAnimationFrame`. Per-surface listeners are what
  that block's own comment exists to warn against.
- Measure with `scratchpad/ui-sweeps/phonetabs.js` (already gates the caption,
  the 44px floor and the sideways scroll at 320/360/390/430) plus a new case for
  the More sheet's two-taps-to-anything claim, which is Phase 11 item 11.

## 2. Two band-2 faults found while measuring, not in any list

Both at 820, which is the first width *outside* the touch band, measured
2026-09-13:

- **The header is two rows, 108.2px**, on a band whose own rule
  (`frontend/css/10-responsive.css`, "band 2") says "the tabs are icons, and the
  header is one row". The strip needs 440px there (the selected tab keeps its
  caption at 146.2px, the other six are 49px) and `syncTabOverflowFade`
  (`app.js`) still wraps it. Either the wrap threshold is wrong at this width or
  the icons rule is not reaching it; `scratchpad/ui-sweeps/tabfit.js` is the
  sweep that owns this question.
- **The tab buttons are 36px tall at 820**, under the 44px `--target-min` the
  band below raises them to. 820 is `(min-width: 820px)`, so it is outside
  band 3's `max-width: 819.98px` floor by one pixel of intent: worth deciding
  whether the touch band should include 820 itself.

## 3. Picture cards: the hole a row-mate's open fold leaves

Measured and deliberately not changed, because the ceiling that causes it is a
recorded decision with its own rejected alternatives (UI_MODERNISATION_PLAN, the
INBOX 164 block). At rest a row is right: seven cards at 240.7px with 1px under
the last line. Open one card's fold and the row becomes 411.1px, every picture
grows to its `max-height: 16rem` ceiling, and 59 to 145px of empty card is left
under the other six. The three ways out, none costless: a shorter fold body
(11rem was chosen to keep about six lines), a taller ceiling (a 583px picture in
a 176px column was measured and rejected), or a caption clamp that grows into the
slack (not expressible in CSS today). Sweep: `scratchpad/ui-sweeps/imagecard4.js`.

## 4. Found, not fixed, elsewhere

- **`selectMode` is one flag for two tabs** (`frontend/app.js`, `let selectMode`
  around line 22059): the Notes list and the timeline table share it, so leaving
  Notes in select mode turns the timeline's own Select off on the first press.
  `scratchpad/ui-sweeps/selstick.js` works around it and records why.
- **`touch.js` at 320**: two covered controls in the Settings sheet,
  `#settings-nav-back` and `#settings-close` both hitting `#settings-search` at
  y=86. Clean at 390. Nothing this session touched that sheet.
- **`graph.js`'s drag-fps gate** reports 43.9 fps against its own 55, with the
  renderer drawing in 5.30ms of a 16ms budget. That is the sandbox limit
  HISTORY.md records under "What the gate does not meet, and why", but it was not
  re-measured against the base branch this session.

## 5. Not started: MINDMAP_PLAN section 12, GRAPH_PLAN phases 4b and 6b

The brief's fifth goal, untouched. Nothing was read from either, so there is no
half-formed opinion here to inherit.

## The sweeps this session added or changed

| File | What it gates |
| --- | --- |
| `scratchpad/ui-sweeps/selstick.js` | Every selection bar sticks to the top of its scroller, over an opaque ground, under its sub-tab strip |
| `scratchpad/ui-sweeps/filesindent.js` | A Files row's facts start to the right of its filename, at content edges rather than box edges, at 1440/820/390 |
| `scratchpad/ui-sweeps/boardpreview.js` | A board preview draws each sketch where and as it was drawn, blocks that are not blobs, titles that are whole |
| `scratchpad/ui-sweeps/graphminimap.js` | The minimap draws the links, marks the note in hand, and its rectangle follows a pan |
| `scratchpad/ui-sweeps/imagecard4.js` | A picture card's own action is reachable, announced and visible when focused |
| `scratchpad/ui-sweeps/phonetabs.js` | The phone tab bar's caption, its 44px floor and its single row at 320/360/390/430 |
| `scratchpad/ui-sweeps/imagecard3.js` | Changed: its open-to-shut ratio is now row-scoped, which is what its own report is about |
