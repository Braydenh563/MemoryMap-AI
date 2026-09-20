# The whiteboard and mind map tails: what this run closed, and what is left

> Companions: [OPEN.md](OPEN.md) (the consolidated ledger, struck item by item
> with these numbers) · [../WHITEBOARD_PLAN.md](../WHITEBOARD_PLAN.md) ·
> [../MINDMAP_PLAN.md](../MINDMAP_PLAN.md) · [mindmap.md](mindmap.md)
>
> Everything below was measured in a real Chromium against the running app,
> not read off the source. Nothing here is a screenshot read as a result.

## Closed, with the number that closed it

| Item | Result |
| --- | --- |
| Decision 7's other half: one highlighter, two renderers | `HIGHLIGHTER_STYLE` in app.js, read by the pad and the board. The pad was paper 255.0, one pass 176.0, two passes 176.0 (the ink's own luminance: no translucency at all) and is 255.0 / 223.7 / 199.2, against the board's 252.9 / 222.5 / 198.3. `sketchparity.js` 10/10 light and dark |
| The blend on a dark board | `multiply` over a light backdrop, `screen` over a dark one, re-applied on a mode change by a `MutationObserver` on `data-mode`. Dark after: paper 26.4, one pass 85.9, two 128.4, a second pass worth 42.5 where multiply bought 1.6 |
| A sketch's handles and the zoom | The size half was already built and the entry was stale (10px at 0.5x, 1x and 2x). Three real failures behind it, fixed: a link's bend grip 24px at 2x, and two drags dividing by the zoom twice (a shape moved 30px for a 60px drag at 2x). `wbhandlezoom.js` 17/17 |
| The context bar at phone width (WHITEBOARD_PLAN section 7) | **Pins.** Floating never covered the item (0 of 10) but sat on the tool rail twice (7759px2, 1122px2) and left the canvas once; pinned is one top for all ten, all inside, nothing on the rail, at the cost of two selections under the band. `wbcontextphone.js` 5/5 at 390x844 and 1440x900 |
| INBOX 12's remainder | Closed by Phases 2 and 3 rather than by repairs, measured: the export is a dialog inside the window at both widths, all twelve arrange controls plus the two z-order ones are on the bar, 0px2 of icon-over-text across 24 buttons. `wbinbox12.js` 6/6 |
| The ink swatch at a finger's size | Paint 2rem below 820, the press reaching `--target-min` on a transparent `::before`: 32x32 paint, 33x41 target at 390, 37x46 on Large text, no two dots sharing a pixel. `sketchbar.js`, which had never looked at 390 or at the swatches |
| The dead `.wb-export-menu` CSS | Seventeen mentions across three stylesheets, four of them whole rules, and one test re-anchored off the dead name. Board menus measured unchanged after (`wbmenus.js`: one shell recipe, 36px rows) |
| The mind map's own leftover list | Re-checked item by item: four of six already done, two of those by later decisions. [mindmap.md](mindmap.md)'s "Left to do" is rewritten to what a run against this head finds |

## Left, in the order worth taking

1. **Curve control points on a tree edge** (MINDMAP_PLAN §12.1 item 2's one
   live sub-item). A link has its bend already (`.wb-link-bend-handle`, the
   `bend` field); a branch has a shape (`edge_style`: curve, elbow, straight)
   and no control point, so it cannot be bent around anything. Two `data`
   fields on the child and a third hit target per line, composing with those
   three shapes.
2. **An image in a node** (§12.1 item 2). Needs `/whiteboard/media` and a node
   whose body is a picture rather than a label: a second node shape, not a
   fourth strip button.
3. **INBOX 276**, filed by this run: the sketch pad's toolbar wraps to two rows
   at 820 on Large text and did before this session (712 of 714, and 688 of
   690 with Spacious). The recommendation is in the entry: the group labels,
   not the controls.
4. **`#wb-topbar` is 13 controls at 1440**, unchanged and still owned by
   UI_MODERNISATION_PLAN Phase 8 (OPEN.md's own entry).
5. **The AI half of the map**, which nothing in this sandbox can exercise:
   every provider here is a fake transport (CLAUDE.md section 4).

## Not verified

- **Nothing was seen by a person.** Every number above came from
  `getBoundingClientRect`, `getComputedStyle`, `getImageData`,
  `elementFromPoint` or `pngpixel.py`.
- **No touch device.** The finger-sized swatch and the pinned bar are measured
  in a desktop Chromium at a phone viewport, which is the app's own
  convention, and neither has been pressed by a thumb.
- **The pinned bar's cost is recorded, not resolved**: a selection in the top
  band sits under it (an image entirely, 8640px2). The sweep prints it every
  run rather than asserting it away.
- **`wbarrange.js` is stale** and prints `{"missing": true}` instead of
  failing: it asks for `#wb-prop-multi-row`, which Phase 2 removed. Left as
  found, because `wbinbox12.js` now measures what it was for.
