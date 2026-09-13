# Left by the phone and chrome agent, Phase 11, 2026-09-13 (second pass)

The first pass's file is superseded by this one; what it left open is either
landed below or still listed below. Its own history is in git and in HISTORY.md.

## Landed this pass

| Hash | What |
| --- | --- |
| `cb8060a` | INBOX 186: the timeline dock's four kind chips become one `.seg.seg-multi` well. Dock 138.8/181.2px at 1024/820 to 54px at both. `scratchpad/ui-sweeps/timelinedock.js` |
| `d7d8e58` | INBOX 186 moved to HISTORY |
| `1f08ddd` | The two in-place sheets share the recipe's dismissal (`wireInPlaceSheetDismissal`); the boundary between a modal-bottom sheet and an in-place one is written into DESIGN.md. `scratchpad/ui-sweeps/sheetdismiss.js` |
| `3bfe8d0` | Phase 11's two band-2 faults: one row at 820 (header 112px to 72px, strip 408 in 448) and 44px tab targets; the reminders badge on its glyph. `scratchpad/ui-sweeps/tabfit.js` |
| `3af052e` | INBOX 104: the bar recedes to icons on scroll down, back on scroll up, never hidden. Also fixed: the selected tab was the one column of five with no caption at 320. `scratchpad/ui-sweeps/phonetabs.js` |

## Still open, in the order to take it

1. **Phase 11 item 1's last bullet: the top bar's own reduction at 320.** The
   title, the AI dot and one action. Never measured at 320 with the wordmark,
   the space switcher and the two control clusters in it.
   File: `frontend/css/10-responsive.css` band 4; `frontend/index.html`
   `#top-bar`. Next step: measure the header's content width at 320 before
   deciding what leaves.
2. **Band 3 (600 to 820): the header is still two rows, 128px at 819.** That
   one is the band's recorded design (the strip cannot fit beside the wordmark
   at any width in the band, and the wordmark is what was reported twice when
   it was hidden), so it is listed as known rather than as open.
3. **Picture cards: the hole an open fold leaves in a row-mate** (59 to 145px
   of empty card). Measured and deliberately unchanged; the ceiling that causes
   it is a recorded decision with its own rejected alternatives.
   Sweep: `scratchpad/ui-sweeps/imagecard3.js`.
4. **Found, not fixed, elsewhere** (all carried forward from the first pass and
   not re-measured this pass):
   - `selectMode` in `frontend/app.js` (around line 22059) is one flag shared
     by the Notes list and the timeline table.
   - `touch.js` at 320: `#settings-nav-back` and `#settings-close` both hit
     `#settings-search` at y=86. Clean at 390.
   - `graph.js`'s drag-fps gate reports 43.9 against its own 55.
5. **Phase 11 items 2 to 9**, each to be checked against the running app before
   being built: several are already done.
6. **`.dock-chip-row` has no user in the page** since `cb8060a`. Its rules are
   in `frontend/css/07-whiteboard-misc.css` (a file three agents were in this
   session) with a band-4 partner in `10-responsive.css`. Written as a general
   recipe rather than as the Timeline's, so left whole rather than half
   removed; `tests/test_ui_recipes.py` holds the page at zero uses either way.

## Sweeps this pass added or changed

| File | What it gates |
| --- | --- |
| `scratchpad/ui-sweeps/timelinedock.js` | The Timeline dock's kind filter: one row at 1440/1024/820/390, the well at the dock's height, the gap on the scale, the words in above 1200 and out below, 44px cells at 390, one chip in the zone, and the filter still refetching |
| `scratchpad/ui-sweeps/sheetdismiss.js` | Both in-place sheets and the recipe's own: a captured Escape past a handler that stops one, a press outside, focus back on the opener |
| `scratchpad/ui-sweeps/phonetabs.js` | Changed: five columns rather than seven, every column captioned from 320 up, plus the recede on scroll and two taps to each tab behind More |
