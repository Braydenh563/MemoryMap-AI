# Responsive, Liquid Glass and the dashboard: what is left

**Agent id**: `agent-a93efefdb83c29141` (Brief 21, UI Phases 9 and 10, then
the owner's evening batch).
**Last worked**: 2026-09-09. The worktree is merged up to the branch (the
CodeMirror editor, the read-only graph layouts and the `place()` menu-height
fix are all in) and the tree is clean at every commit below.

**The third batch** (the map exports, the boards dock, the paint lint): all
three done, commits `74e12d7`, `af14a42`, `39df02a`. The lint found a live
bug on its first run: every mind map's edges were drawn in the accent rather
than in their branch colours, because a stylesheet `stroke` beats a `stroke`
attribute. Fixed and measured.

**The second batch** (the previews, max gravity, the mind map's visual
phases): all four items are done or answered, commits `6e365ab`, `25a9cc7`,
`3aeb733` and this file. INBOX 67 and 68 are closed in HISTORY's "INBOX
resolved".

**What is done**, with its record in `HISTORY.md` ("Moved from the plans,
2026-09-09"):

- Phase 9's tablet bands and Phase 10 items 100, 101 and 103 (the scroll edge
  effect, the concentric corner token and its lints, menus opening out of
  their opener), plus the tab strip fitting its own row from 600 to 820 and
  44px tab targets below 820.
- INBOX 94's first three questions: a measured frame cost per background
  style, Performance mode stopping the art, no seams, and two styles that now
  hear the intensity slider.
- INBOX 60, the dashboard's start band: it fills its width, carries a Continue
  pill and a fortnight sparkline, and every skill pill says when it last ran.
- The tablet header: icons between 820 and 1100, so it is one row (64px) not
  two (108px).
- The keyboard pass per band (`keysbands.js`), PASS at 1440, 1024 and 800.
- Four of the owner's evening batch: the quick-nav guide and its three new
  keys, the dashboard's back-to-top threshold, the heatmap's size, and dark
  glass separating from the page.

**The sweeps this work left behind**, all in `scratchpad/ui-sweeps/`:
`tabfit.js` (does the strip fit, per width), `scrolledge.js` (the scroll edge
on the right bar), `onglass.js` (text contrast on a blurred surface),
`bgart.js` (frame cost per background style), `dashstart.js` (the dashboard
band's used and empty width), `keysbands.js` (the keyboard pass),
`chordguide.js` (the "m" chord) and `glassdepth.js` (rim and lift in
composited luminance, both themes).

**Where to start if you are picking this up cold**: section 2 below is a
decision for the owner rather than code; section 3 is one open question with
two failed ways of measuring it recorded; section 6 needs hardware. So the
first piece of building work left in this file is whatever the orchestrator
hands you next from the plan's evening batch.

Every number below was measured in Chromium against
`bash scratchpad/ui-sweeps/serve.sh 8795 /tmp/mm-8795` seeded with `seed.js`.
Re-measure before changing anything.

## How to reproduce the numbers

```bash
bash scratchpad/ui-sweeps/serve.sh 8795 /tmp/mm-8795      # own port, own data dir
BASE=http://127.0.0.1:8795 PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers \
  node scratchpad/ui-sweeps/seed.js
BASE=… WIDTHS=1440,1024,820,600 node scratchpad/ui-sweeps/errors.js   # background flag
BASE=… WIDTHS=600,820,900,1024,1440 node scratchpad/ui-sweeps/tabfit.js
BASE=… node scratchpad/ui-sweeps/dashstart.js
BASE=… node scratchpad/ui-sweeps/keysbands.js
BASE=… node scratchpad/ui-sweeps/chordguide.js
BASE=… node scratchpad/ui-sweeps/glassdepth.js
BASE=… node scratchpad/ui-sweeps/contrast.js     # and THEME=dark
BASE=… WIDTH=800 HEIGHT=1180 node scratchpad/ui-sweeps/touch.js
```

`scripts/gate.sh --changed` is the per-step gate. Note that it resolves
`ruff` from `<worktree>/.venv`, which an agent worktree does not have: symlink
the main checkout's `.venv` into it (and keep the symlink out of git) or the
ruff step fails with "No such file or directory".

## The state at the end of this sitting

- `errors.js`: **0 errors, 0 layout findings at 1440, 1024, 900, 820 and 600**.
- `contrast.js`: **0 low-contrast items in both themes**, seven tabs and ten
  Settings sections, after the dark-glass change.
- `tabfit.js`: green at 600, 660, 720, 819, 820, 900, 1024, 1099, 1100, 1440.
- `keysbands.js`: PASS at 1440, 1024, 800. `chordguide.js`: PASS.
- `touch.js`: PASS, 0 findings at 800x1180 and 600x1024.

---

## 1. Phase 11: the whole phone band (< 600), including INBOX 104

Taken out of Brief 21 by the owner. Everything the previous version of this
file listed for 390 belongs to it and is repeated here so nothing is lost:

- **`#wb-topbar` is 104px at 390**, two rows, the largest remaining piece of
  phone chrome. `#wb-topbar` in `frontend/index.html` (about line 3329),
  `.wb-topbar` in `frontend/css/07-whiteboard-misc.css`. It has seventeen
  controls and no `.dock-more`; the cheapest correct move is the one
  `foldDockArrange` already makes elsewhere. Expect 104 to 44 at both 390
  and 768, which is +60px of canvas at each.
- **Short tab captions below 480.** The captions are hidden there because
  "Dashboard" needs 68px in a 56px column. A `data-short` per tab rendered
  with `content: attr(data-short)` is the fix, but "Dashboard" to "Home" and
  "Reminders" to "Alerts" are copy decisions: **ask before writing either.**
- **The dashboard's `.launch-row-start`** is a column of five 60px
  full-width buttons at 390, 300px of the 419px of quick actions.
  `frontend/css/03-dashboard-widgets.css` near line 1290. Five big shortcuts
  or ten small ones is a product call; measure both.
- **Library at 390**: dock 96px, sub-tab strip 46px and chip row 36px, first
  card at y=341. Folding the chip row into the dock's `Filter` menu below
  600 (`foldSiblingsIntoMenu`) is the shape that already exists.
- **Notes at 390**: dock 96px, search on its own row. The identity zone and
  the search field could share a row if the heading became the field's
  placeholder; that is a design change, sketch it first.
- **The documents editor at 390 was never measured.** Run
  `node scratchpad/ui-sweeps/editor.js` at 390 and add a `documents` row to
  `chrome.js`'s `TABS`.
- **INBOX 104**, the tab bar receding on scroll down and returning on scroll
  up, never hidden.
- **The sheet half of INBOX 103**: a sheet inset by `--space-3` and turning
  `--modal-bg` at full height. Deliberately not built this sitting: the
  sidebar sheets are one rule at `max-width: 819.98px` covering both the
  tablet and the phone, and giving the tablet an opaque sheet while the
  phone keeps a glass one would be worse than either. Build it once, for
  both bands, in Phase 11.

## 2. INBOX 102, and the measurement that changes the question

Open, with its numbers in UI_MODERNISATION_PLAN's placed list. In short:
`--text-on-glass` has nothing to fix (menu rows are 15.25:1 in light and
14.14:1 in dark, and contrast.js finds nothing under 4.5:1 in either theme),
and `.glass-clear` on `.whiteboard-floating-panel` would reverse a recorded
decision. The recommendation there is to build the clear variant *with* a
surface that genuinely floats over media, and to drop `--text-on-glass`
until something measures badly.

## 3. INBOX 94, background animations: one question left

Three of the four are built (HISTORY.md, and `scratchpad/ui-sweeps/bgart.js`
is the sweep): the frame cost per style is measured, Performance mode now
stops the art, and there are no seams. Two styles that ignored the intensity
slider now scale with it.

**Left**: does the slider change something a person notices at every step?
Two measurements failed and are recorded in the sweep so they are not
repeated. Ink on the canvas varies by about 0.15 points between two boots of
the *same* settings, because every style places its marks with `p.random`,
which is more than the slider moves it. Frame cost at the two ends of the
slider moves by less than this environment's noise (waves measured 41.4ms at
10 and 37.2ms at 100 after its layer count started scaling, which is the
wrong way round and is noise, not a result). The honest next step is a person
looking at five screenshots, or a design change so the slider drives
something with a large signature (the wash's own alpha) rather than the
population alone.

Also worth knowing before touching it: mesh is the expensive one (+27.6ms a
frame, worst frame 166.7ms), and the full-screen wash rectangle in `p.draw`
dominates every style's cost, which is why halving a population barely shows
up in the frame time.

## 4. INBOX 60, the dashboard start section: built

In HISTORY.md. The band fills its width (the "Jump to" row went from 34% used
to 100%, the stats strip from 41% to 100%, the band's height and the first
widget's position unchanged at 187px and y=613), and every skill pill says
when it last ran. Nothing is left on the item.

## 5. The tab strip from 600 to 1100: built for the top half of that band

Between 820 and 1100 the tabs are icons with the selected one keeping its
caption, so the header is 64px rather than 108px. Below 820 it is still two
rows and that is measured rather than unfinished: the space beside the
wordmark is 417px at 820 and 171px at 600, and even seven icons plus the
selected caption need 474px. The only lever left there is hiding the active
caption too, which buys 44px and costs the one thing in the strip that says
where you are; it was considered and not taken.

## 6. A real iPad, and a real on-screen keyboard

Unchanged and unchangeable here. Every number in the 820-1100 and 600-820
bands is an emulated viewport with `hasTouch`. A real iPad differs in three
ways this cannot see: non-zero safe-area insets, Safari's own chrome moving
as you scroll, and a hardware keyboard changing `hover` and `pointer`
without changing the width. `--keyboard-inset` is verified to be written, to
be `0px` with no keyboard, and to be read by both bottom docks; its
behaviour with a keyboard up is reasoned, not observed.

## 7. A keyboard-only pass at each band: built

`scratchpad/ui-sweeps/keysbands.js`, PASS with 0 findings at 1440, 1024 and
800: the roving tabindex survives the icon strip, a folded dock menu's summary
is in the tab order and opening it reveals its control, and the sidebar sheet
opens on Enter, takes focus, closes on Escape and gives focus back to its
toggle. Not run below 600, which is Phase 11's band.

## 7a. The commits, in one place

`3a2a3e5` the tab strip at 600 to 820 and the new stylesheet, `b03692e` the
scroll edge effect, `de53d90` the concentric corner token and its lints,
`dc3d201` menus opening out of their opener, `38b2b47` the docs move and INBOX
102's numbers, `0a77e8c` Performance mode and the background styles, `9565a75`
the 94 record, `4ea8fee` and `059f8d1` the 44px tab target, `f46fd4d` the
changelog mirror and handover, `92effa0` the dashboard band, `50f20e7` skill
last-run times, `5bd1bd2` the icon tab strip, `c8c2cf6` the keyboard pass,
`4270f12` back-to-top and heatmap, `409f044` the chord guide and its keys,
`9932854` dark glass.

## 7b. The second batch, and what it leaves

- **INBOX 68, the previews** (`6e365ab`, `3aeb733`). Every block used to be
  the same rectangle; a board's things are now drawn at their own sizes, text
  boxes carry their text, labels sit inside the shapes that can hold them
  with an ink picked from the node's own colour, and the dashboard's
  thumbnail is a 40.5px square again instead of a 293px one that made the
  widget scroll. Numbers in HISTORY.
  **Left**: an image object still previews as a plain block. A thumbnail of
  the image itself is the obvious next step and is a different feature (it
  needs the media pipeline in a list endpoint).
- **INBOX 67, max gravity** (`25a9cc7`). Not reproduced: 77% off the RMS
  radius from gravity 0 to 100, and the zoom does not re-fit, so the screen
  loses it too. Neither of the entry's proposals is needed.
  **Left, as a recommendation rather than a change**: at the fitted zoom a
  node is a 2.4px radius, so maximum gravity is a compact cloud of very small
  dots. If "spread out" is reported again on a current build, the lever is
  zoom-to-fit after the layout settles, not more pull.
- **The mind map plan's visual phases** (`3aeb733`). Phase 3's visual items
  (10, the kind filter; 12, one chip and one preview) are built and were
  checked rather than assumed. Items 11 and 13 are backend and graph work.
  **Left, and it is the big one**: MINDMAP_PLAN section 12 (Phase 6a to 6c,
  the Coggle-level controls: the map toolbar, the node edit strip, the node
  and link radials, edge handles, sever, transplant) is entirely open. It is
  a two-session spec in its own worktree by the plan's own note, not a slot
  in a mixed batch.
  The mindmap remaining list's items 2 to 4 (perspectives on a map of real
  notes, INBOX 43's second half, the AI half) are also untouched here.

## 7d. The third batch, and what it leaves

- **The map exports** (`74e12d7`). `_export_opml` and `_export_freemind` were
  the only recursive walks in `routes_whiteboard.py`; both are iterative and
  seen-guarded now, and `_outline_rows` (the Markdown export) gained the seen
  set it never had. Proved against the old shapes: a 1,200-deep chain raised
  `RecursionError`, a ring ran 200,000 rows and was still going. Two tests
  cover both, and both fail on the old code.
  **Left**: nothing on this item. Worth knowing: nothing caps how deep a map
  built by hand can be, so `MAX_MAP_DEPTH` is a clamp on the *file's* nesting
  rather than on the map.
- **The Library's boards dock** (`af14a42`). It had no `⋯` at all, which is
  why its 730px actions zone dropped to a row of its own below about 1200 and
  why it was the one Phase 8 dock that could not fold its arrange zone (the
  fold looks for `.dock-actions > .dock-more > .dock-menu-list`). One row at
  1024 now, 54px instead of 98px.
  **Left**: at 820 it is still two rows, because the search field takes 584px
  of a 750px row. That is band 3's own wrapping and every other dock does the
  same there; if it should not, the fix is a `min-width` on `.dock-find`, and
  it belongs to Phase 11's band work rather than to this dock.
- **The paint lint** (`39df02a`), and the map edges it found. See section 8.

## 7c. The dashboard band against the Library's boards dock

Asked for after both changes land, measured at 1440 and 1024 with the two
surfaces side by side:

| | dashboard band | Library boards dock |
| --- | --- | --- |
| control height | 37px (pills), 52px (stat tiles) | **28px and 36px, two heights in one bar** |
| radius | 999px pills, 8.4px tiles | 999px chips |
| rows at 1440 | 1 and 1, both filling the width | 1 (was 2 before `af14a42`) |
| rows at 1024 | 1 and 1 | 1 (was 3) |

They do not fight: the band is pills and tiles inside a page, the dock is a
control bar, and the shared shapes (the pill radius) agree. **What does not
agree is the dock with itself**: eleven controls at two heights, wrapping to
two rows at 1440 and three at 1024. That is the wrapping report another agent
holds, and the two-heights half is the dock-grammar defect `docks.js` already
reports for the whiteboard's own bar. Recorded here rather than changed, as
instructed.

## 8. Found, not fixed

**Fixed since**: the two XML exports that recursed (`74e12d7`), and the
`.wb-map-edge` stroke attribute that the whole app ignored (`39df02a`).

**A `stroke` or `fill` attribute is beaten by any stylesheet rule for the
same property**, and `tests/test_svg_paint_attributes.py` now holds that.
Worth knowing when it fires: the fix is a class or `el.style`, never a
more specific attribute, because there is no such thing.

`menus.js` times out at its last step, clicking a `.select-opener` on Chat
after the model panel has been opened and dismissed. It times out
identically with Reduce motion on, where the menu animation added this
sitting does not run at all, so it is not that change. Nobody has looked at
why.

**A changelog edit breaks a test two directories away.** `CHANGELOG.md` is
mirrored into `docs/CHANGELOG.md` for the Pages site and
`tests/test_docs_site.py` compares them byte for byte, so any changelog line
needs `cp CHANGELOG.md docs/CHANGELOG.md` in the same commit. This sitting
tripped it and fixed it; it is the kind of thing the lint set misses because
it is not in the lint set.

## 9. What could not be verified

- **Every frame-cost number is headless Chromium with no GPU.** The ranking
  and the order of magnitude are sound; the absolute milliseconds are not
  what a real machine will show.
- **No real iPad and no on-screen keyboard** (section 6).
- **The intensity slider's visible effect per step** (section 3): two ways
  of measuring it failed, and the failures are recorded in `bgart.js`.
- **How the dark palette reads on an OLED panel or at another display
  gamma.** Every figure in `glassdepth.js` is Chromium's compositor on this
  machine.
- **Whether the owner's own dashboard was simply too short to have 400px to
  scroll**, or whether `coversAFormPrimary` was hiding the back-to-top button
  behind a widget's primary action. Both remain possible causes of that
  report and neither reproduces here.
- **The full pytest suite has not been run to completion** on this tree, by
  the owner's own rule (it is ten to fifteen minutes and CI runs it on every
  push). `scripts/gate.sh --changed` is green at every commit, which is the
  lint set, `node --check`, ruff and the tests naming the files touched.
