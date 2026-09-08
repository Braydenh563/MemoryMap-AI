# Phase 9 — what is left, per surface and per breakpoint

Written at the end of the first Phase 9 sitting, on a usage limit, so the next
session resumes instead of re-measuring. Six commits landed (see
`UI_MODERNISATION_PLAN.md`, "Built — Phase 9"); this is everything that was
found and deferred, never dropped.

Every number here was measured in Chromium against
`scratchpad/ui-sweeps/serve.sh 8802 /tmp/mm-phone` seeded with `seed.js`, with
`hasTouch` below 820 and `isMobile` below 600. Re-measure before changing
anything: this file records what was true at commit `b1f8731` plus the touch
pass on top of it.

## How to reproduce the numbers

```bash
scratchpad/ui-sweeps/serve.sh 8802 /tmp/mm-phone      # own port, own data dir
BASE=http://127.0.0.1:8802 PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers \
  node scratchpad/ui-sweeps/seed.js
BASE=… WIDTHS=390 node scratchpad/ui-sweeps/chrome.js   # chrome vs content
BASE=… node scratchpad/ui-sweeps/errors.js              # 1440/1024/820/390
BASE=… node scratchpad/ui-sweeps/touch.js               # 44px targets at 390
```

`chrome.js` prints the chrome stack strip by strip beside each percentage, so
a number always says which strip to go and look at.

## The state at the end of this sitting, 390x844

| surface | chrome | the stack, strip by strip |
| --- | ---: | --- |
| dashboard (first widget) | 95% | top 58, tabs 58, status 37 |
| dashboard (first action) | 29% | as above |
| notes | 29% | top 58, tabs 58, status 37, dock 96, subtabs 46 |
| chat | 23% | top 58, tabs 58, status 37 |
| library | 40% | top 58, tabs 58, status 37, dock 96, subtabs 46, chips 36 |
| whiteboard | 46% | free canvas 452 of 844; wb-topbar 104, wb-tools 56 |

Gates at the same commit: `errors.js` 0 errors and 0 layout findings at 1440,
1024, 820 and 390; `touch.js` PASS with 0 findings; six lints green.

---

## 1. Whiteboard — `#wb-topbar` is 104px at 390 (two rows)

**The largest remaining piece of phone chrome, and the one with the clearest
payoff.** The board's own top bar takes 104 of 844 at 390 and 104 of 900 at
768, in both cases wrapping to two rows. Free canvas is 452px at 390.

- **Where**: the element is `#wb-topbar` in `frontend/index.html` (about line
  3329); its rules are `.wb-topbar` in `frontend/css/07-whiteboard-misc.css`.
- **Why it is untouched**: out of scope by direct instruction for this sitting
  ("do not touch `#wb-topbar`"). Nothing about it is hard; it was fenced off.
- **Next step**: it has seventeen controls (Phase 8's own inventory) and no
  `.dock-more`. The cheapest correct move is the one `foldDockArrange` already
  makes elsewhere: give it a `.dock-actions > .dock-more` in the markup, then
  add `wb-topbar` to the fold so its search and its five menus collapse below
  1100. Expect 104 to 44 at 390, which is +60px of canvas, and 104 to 44 at
  768 for +60 there too.
- **Gate**: `WIDTHS=390,768 node scratchpad/ui-sweeps/chrome.js`, the
  `whiteboard` row's "free canvas" line.

## 2. Tab bar — short captions below 480

Below 480 the captions are hidden entirely (`.tab-label { display: none }` in
the `@media (max-width: 479.98px)` block of
`frontend/css/07-whiteboard-misc.css`). The threshold is measured, not chosen:
seven equal columns at 390 give each tab 56px, "Dashboard" needs 68px at
`--text-xs` and "Reminders" 60px, and seven times 68 is 476.

- **Why it stops there**: an ellipsis on two captions beside five whole ones is
  the shape this project already learned reads as broken rather than as
  abbreviated (BACKLOG.md, the tab strip's edge fade, settled with a real
  screenshot at 390).
- **Next step, and it is a copy decision, not a layout one**: a short caption
  per tab, carried in the markup as `data-short` on each
  `#tab-bar button[data-tab]` and rendered with `content: attr(data-short)`
  below 480. Only two need one. "Dashboard" to "Home" renames the app's
  landing page and needs the owner's word; "Reminders" to "Alerts" likewise.
  **Ask before writing either.**
- **Gate**: `node scratchpad/ui-sweeps/touch.js` (the tab bar block already
  reports per-button width and whether the bar scrolls), plus a `scrollWidth`
  vs `clientWidth` check on each `.tab-label`.

## 3. Tab bar — 600 to 819 still scrolls sideways

At 600 the strip has 574px of room and needs 608px, so it scrolls, and
`.tabs-wrapped` gives it a row of its own inside a 106px header. That is
unchanged from before Phase 9; the bottom bar is a `< 600` rule by the plan's
own band table.

- **Where**: `#tab-bar` in `frontend/css/00-tokens-shell.css` (the base rule
  and the `.tabs-wrapped` pair), `dockTabBar` and `syncTabOverflowFade` in
  `frontend/app.js`.
- **Next step**: two candidates, and the choice belongs with the owner.
  Either extend the bottom bar to the whole one-column band by changing
  `PHONE_TABS` in app.js and the `599.98` media conditions to `819.98`, which
  makes 600 to 819 consistent with the phone and inconsistent with the plan's
  table; or show the tab icons from 820 down beside the captions so the strip
  fits in the header. Measure both: the second needs each caption plus a 20px
  icon to fit 574px, which it will not at seven tabs, so the first is probably
  the honest answer and the plan's table should move rather than the code.
- **Gate**: `W=600,720,819 node` on a copy of the tab-bar probe, asserting
  `scrolls: false` and a one-row header.

## 4. Dashboard — 95% chrome by the strict reading

The first configurable widget in `#dash-grid` starts at y=806 on an 844px
screen. Everything above it is the greeting banner (117px), the quick actions
(419px), the counters (84px) and the layout toolbar (57px).

- **What already moved**: the quick-action rows stopped wrapping (they were
  459px for two children, five full-width buttons and a pill row) and the
  greeting's live clock is hidden below 600, because every phone paints the
  time a few pixels above it. Hero 148 to 117.
- **What is left**: `.launch-row-start` is still a column of five 60px
  full-width buttons at 390, which is 300px of the 419. It is a column because
  of a rule in `frontend/css/03-dashboard-widgets.css` near line 1290. The
  question is whether five big shortcuts or ten small ones is the better phone
  design, and that is a product call.
- **Next step**: measure `.launch-row-start` as a scrolling row of pill-sized
  buttons (the `.launch-row-go` recipe two lines below it already is one) and
  put the two side by side before choosing. Expect the first widget to come up
  by about 200px.
- **Gate**: the `dashboard` and `dash-actions` rows of `chrome.js` at 390.

## 5. Library — dock 96px and two strips under it at 390

The Library dock is 96px at 390 (two rows) with a 46px sub-tab strip and a
36px chip row beneath it: 178px before the grid, and the first card at y=341.

- **Where**: `[data-dock-name="library"]` in `frontend/index.html` (about line
  2890); `.library-subtabs` / `.library-filters` scroll rules are in the
  `@media (max-width: 819.98px)` block of
  `frontend/css/07-whiteboard-misc.css`.
- **Next step**: the dock's second row is the search field, which takes
  `flex-basis: 100%` below 600 by the Phase 8 rule. On a phone the sub-tab
  strip and the chip row are both filters, and the dock's `Filter` menu is a
  third place to filter the same list. Fold the chip row into the `Filter`
  menu below 600 (the `foldSiblingsIntoMenu` half of `foldDockArrange` in
  app.js already does exactly this shape) and the 36px goes.
- **Gate**: `chrome.js` `library` row at 390; target is the first card above
  y=300.

## 6. Notes — dock 96px at 390

Same shape: search on its own row below 600. The dock was 172px before Phase 9
and is 96px now.

- **Where**: `.dock-find { flex-basis: 100% }` in the
  `@media (max-width: 600px)` block of `frontend/css/07-whiteboard-misc.css`.
- **Next step**: the identity zone (`All notes`) and the search field could
  share a row if the heading became the search field's own placeholder below
  600, the way several phone apps put the surface name inside the search box.
  That is a design change, not a size change; sketch it before building it.

## 7. Documents editor at 390

`.doc-layout` was a two-track grid at every width until Phase 9; below 820 it
is now one column with `#doc-sidebar` as a sheet. **The editor itself was not
measured at 390 in this sitting.**

- **Where**: `frontend/css/04-chat-dock-appearance.css` (`.doc-layout`,
  `.doc-dock`), `frontend/css/05-sidebars-themes.css` (`.doc-toolbar`).
- **Next step**: run `node scratchpad/ui-sweeps/editor.js` at 390 and add a
  `documents` row to `chrome.js`'s `TABS`. The formatting bar already reads
  `--keyboard-inset`; what is unmeasured is the dock above the editor and
  whether the sheet's 52px rail eats into the text column.

## 8. `--keyboard-inset` with a real keyboard

`initKeyboardInset` in `frontend/app.js` writes it from `visualViewport`, and
`.chat-dock` / `.doc-toolbar` add it to their bottom padding.

- **Verified**: the property is written, it is `0px` with no keyboard, and
  both docks read it.
- **Not verified, and not verifiable here**: Chromium headless has no
  on-screen keyboard. Needs a real phone. Until then the behaviour with a
  keyboard up is reasoned, not observed.

## 9. A real iPad

Everything in the 820 to 1100 and 600 to 820 bands was measured with an
emulated viewport plus `hasTouch`. A real iPad differs in at least three ways
this cannot see: the safe-area insets are actually non-zero, Safari's own
chrome moves as you scroll, and a hardware keyboard changes `hover` and
`pointer` without changing the width. The `env(safe-area-inset-*)` rules are
written with a `0px` fallback, so they are provably no-ops here and untested
where they matter.

## 10. Dark theme at every band

Phase 9 measured in light only (`localStorage.theme = 'light'` in every
sweep). The sheets, the bottom tab bar and the folded menu sections are all
new surfaces and none has been checked in dark. `lib.js` honours `THEME=dark`;
`scratchpad/pngpixel.py` is the tool; the bar is 4.5:1 for text.

## 11. A keyboard-only pass at each band

Phase 8's acceptance asked for `scratchpad/ui-sweeps/keys.js` and it does not
exist. Phase 9 added three things that need it specifically: the sheet (does
focus enter it when it opens, and return to the toggle on Escape — Escape is
wired, focus return is only wired for the Escape path), the folded arrange
zone (is a sort select still reachable by Tab when it is inside a closed
`<details>`), and the bottom tab bar (does the roving tabindex still work now
that the strip is a child of the body).
