# dropplace-1006: where things placed on a board or a map land (INBOX 664)

Worktree `agent-a85385359177cfff4`, merged from `claude/mini-release-0.4.1`
c4e49f9. The owner: "Placing coordinates of templates on the mindmap and
whiteboard could be improved (little off from the cursor)", then "fix the
drop placement position of templates and elements on the whiteboard and mind
map. like hit the quick wins".

## Result

Sweep: `scratchpad/ui-sweeps/dropplace.js` (1440x900, view panned by
137,-83, zoom 0.5, 1 and 2). Error is the screen distance between the
pointer (or the middle of the open canvas, for a click) and the placed
item's rendered box (its centre, or the point at the fraction it was held
by). Every placement is followed by one Ctrl+Z, which must remove it whole.

| Placement | Before (k 0.5 / 1 / 2) | After |
| --- | --- | --- |
| Library click, any tile, Library panel open | 165 / 165 / 165px | 0px |
| Drag held at the tile's centre: rect, sticky, templates, frames | 0px | 0px |
| Drag held at the centre: star, cloud (drawing not centred in its box) | 2.9-3.9 / 5.8-7.8 / 11.5-15.7px | 0px |
| Drag held at a quarter of the picture | 16 to 145 / 32 to 291 / 63 to 581px | 0px |
| Note card dropped | 12.5 / 25 / 50px | 0px |
| Icon, emoji, image file dropped | 0px | 0px |
| Map template drag (free layout, no root) | 118.5 / 236.9 / 473.8px | 0 to 0.3px (Decision template 0.1-0.3px, its topics no longer overlap) |
| Map template click (no root) | 91.7 / 132.9 / 346.9px | 0px |
| Map template drag, under the root (free layout) | 219.4 / 438.8 / 877.6px | 0px |
| Map template click, under the root | 78.8 / 285.4 / 721.6px | 0px |
| Snap on (24-unit grid) | not anchored | corner on the grid, 13.2px (k 1) and 16px (k 2) from the pointer for a drop 7,5px off a grid point; allowed 12 units diagonal |
| Drop on the top bar, the Library panel, the tool dock | nothing placed | nothing placed |
| Two clicks, view unmoved | 33.9px apart (a 4 s timer) | 33.9px apart (steps off the last click, no timer) |

## What changed

- `wbClientToBoard` / `wbScreenToBoard` (whiteboard.js): the one screen to
  board conversion (container border, scroll, any ancestor CSS scale); eight
  hand-written copies now call it. `wbMapDropTargetAt` keeps its own
  `t.invert` because `tests/test_map_drag_cost.py` pins its shape.
- `wbFreeCanvasRect` / `wbVisibleCanvasRect`: the middle of the canvas less
  the top bar, the side rail and panel, the tool dock; `wbViewCentre` uses it
  (Library click, paste of an image, the image button, interchange imports).
- `wbAnchorDelta` / `wbPlacedBounds` / `wbAnchorPlaced`: measure what was
  drawn and move it so the held point is under the pointer, inside the
  placement's own `wbRecordGesture` (one undo step), elbow waypoints carried.
- Library (whiteboard-library.js): an element's drawn box is measured once
  from its thumbnail (`wbLibContentBox`) so the server is asked for the right
  box and no second save is needed; the drag image is the drawing, held where
  it was pressed (`wbLibGrabPoint`, `libPress`); a map topic a branch or an
  icon will join is lit during the drag (`wbMapShowDropTarget`); a click
  steps 24px off the last click while the view is unmoved.
- Note drop (whiteboard.js): one undo step (it had none), anchored on the
  drawn card.
- Server `_place_branch`: a leaf takes the next row and a parent its first
  child's row; the Decision and Project templates put two topics on one spot
  before (`tests/test_board_library.py`).

## Not verified

- The drag image (a headless drag shows no ghost): `setDragImage` with the
  thumbnail and the offset is asserted in source only.
- A real CSS scale on an ancestor of the canvas (none in the app today);
  covered by the node test only.
- Touch drag from the Library (HTML5 drag-and-drop does not run on touch).
- A map with a layout other than Free: the tidy places a template there, by
  design; not measured.

## Found, not fixed

- A map template dropped on a map with no root makes several trunks (one per
  top-level node of the template). Next: `wbLibPlace` in whiteboard-library.js
  could make the first node the root, or the server could; needs a decision.
- `wbMapDropTargetAt` (whiteboard-map.js ~2702) still converts by hand; fold
  it into `wbClientToBoard` and update the pinned line in
  `tests/test_map_drag_cost.py`.

## Log

- done: 8bb431d (the fix, the sweep, tests). Final sweep: 111 placements, 0 fails, largest error 0.3px, every one removed by one undo.
