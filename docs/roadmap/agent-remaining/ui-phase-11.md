# Left by the phone and chrome agent, Phase 11, 2026-09-13 (second pass)

The first pass's file is superseded by this one; what it left open is either
landed below or still listed below. Its own history is in git and in HISTORY.md.

## Landed this pass

| Hash | What |
| --- | --- |
| `cb8060a` | INBOX 186: the timeline dock's four kind chips become one `.seg.seg-multi` well. Dock 138.8/181.2px at 1024/820 to 54px at both. `scratchpad/ui-sweeps/timelinedock.js` |
| `d7d8e58` | INBOX 186 moved to HISTORY |
| `1f08ddd` | The two in-place sheets share the recipe's dismissal (`wireInPlaceSheetDismissal`); the boundary between a modal-bottom sheet and an in-place one is written into DESIGN.md. `scratchpad/ui-sweeps/sheetdismiss.js` |
| `3af052e` | INBOX 104: the bar recedes to icons on scroll down, back on scroll up, never hidden. Also fixed: the selected tab was the one column of five with no caption at 320. `scratchpad/ui-sweeps/phonetabs.js` |
| `3bfe8d0` | Phase 11's two band-2 faults: one row at 820 (header 112px to 72px, strip 408 in 448) and 44px tab targets; the reminders badge on its glyph. `scratchpad/ui-sweeps/tabfit.js` |
| `b8a42eb` | An open picture fold grows its own card, not the six beside it (411.1px rows with 213px of empty card, to 199.1px with 1px). `scratchpad/ui-sweeps/imagefold.js` |
| `2f8b58c` | Two of the three "found, not fixed" items re-measured and closed. `scratchpad/ui-sweeps/selectflag.js` |
| `875ddf6` | Phase 11 item 9 and its gate: `scratchpad/ui-sweeps/phone.js` walks every tab whole; six 44px faults outside the docks and the chat's title spilling out of its zone |
| `31710e2` | The end-of-session sweeps: a dock zone that cannot shrink says so (this session's own defect, caught at 820), the dashboard's category rows on the floor, and `touch.js` reading its floor off the band |

## Still open, in the order to take it

1. **Phase 11 item 1's last bullet: the top bar's own reduction at 320.** The
   title, the AI dot and one action. Never measured at 320 with the wordmark,
   the space switcher and the two control clusters in it. Nothing at 320 is
   broken (`touch.js` and `phonetabs.js` are both clean there), so this is a
   design step rather than a fix.
   File: `frontend/css/10-responsive.css` band 4; `frontend/index.html`
   `#top-bar`. Next step: measure the header's content width at 320 before
   deciding what leaves.
2. **Phase 11 item 9's other half**: no hover-only affordance (every hover state
   needs a tap equivalent) and long-press replacing right-click app-wide. The
   44px half is built and gated; neither of these two is measured anywhere yet,
   and neither has a sweep.
3. **Phase 11 items 2 to 8, the per-surface shapes.** Measured against the
   running app this pass with `phone.js` and none of them is *broken*: every tab
   is one column, has no control under 44px and does not scroll sideways at
   390x844 or 430x932, in both themes. What is not built is the shape each item
   describes (Capture as a full-height sheet, Documents' read view by default,
   Whiteboard view-and-light-edit, Settings as a page list). Each is a design
   step for its surface's owner, not a defect.
4. **Two gates from item 11 that cannot be met here, and why.**
   - *The composer above a simulated keyboard.* The sandbox has no soft keyboard
     and Playwright does not fake one, so `visualViewport` never shrinks and
     there is nothing to measure. Says so in the plan now.
   - *The primary action within the lower 40% of the screen.* `phone.js` reports
     it and does not fail on it: four of the seven tabs have no filled action at
     all (the graph's is a menu row), and inventing one is a design decision a
     sweep does not get to make.
5. **Band 3 (600 to 820): the header is two rows, 128px at 819.** The band's
   recorded design (the strip cannot fit beside the wordmark at any width in the
   band, and the wordmark is what was reported twice when it was hidden), so it
   is listed as known rather than open.
6. **`.dock-chip-row` has no user in the page** since `cb8060a`. Its rules are
   in `frontend/css/07-whiteboard-misc.css` (a file three agents were in this
   session) with a band-4 partner in `10-responsive.css`. Written as a general
   recipe rather than as the Timeline's, so left whole rather than half removed;
   `tests/test_ui_recipes.py` holds the page at zero uses either way.
7. **`graph.js`'s step 5, "clear trace (a route was drawn: false): NO CHANGE",
   still fails.** Seen while re-measuring the drag-fps gate (which now passes at
   58.9 fps). Not this session's surface; for the graph agent.

## Sweeps this pass added or changed

| File | What it gates |
| --- | --- |
| `scratchpad/ui-sweeps/timelinedock.js` | The Timeline dock's kind filter: one row at 1440/1024/820/390, the well at the dock's height, the gap on the scale, the words in above 1200 and out below, 44px cells at 390, one chip in the zone, and the filter still refetching |
| `scratchpad/ui-sweeps/sheetdismiss.js` | Both in-place sheets and the recipe's own: a captured Escape past a handler that stops one, a press outside, focus back on the opener |
| `scratchpad/ui-sweeps/imagefold.js` | A picture card's row-mates when one card's fold opens: the tail under each card, open and shut |
| `scratchpad/ui-sweeps/selectflag.js` | The one selection mode across two surfaces: the Timeline's button in step with the mode Notes left on, and one press ending it on both |
| `scratchpad/ui-sweeps/phone.js` | Every tab whole at 390x844 and 430x932, `hasTouch` + `isMobile`: no sideways scroll, no control under 44px, one column, the primary action's position reported |
| `scratchpad/ui-sweeps/phonetabs.js` | Changed: five columns rather than seven, every column captioned from 320 up, plus the recede on scroll and two taps to each tab behind More |
| `scratchpad/ui-sweeps/touch.js` | Changed: the floor is the band's own (44 below 820, 28 above), so a run at 1024 says something true |
