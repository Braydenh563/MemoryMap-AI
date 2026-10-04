# The map and board culling pass (MINDMAP_PLAN 13a-view): what is left

> Companions: [MINDMAP_PLAN.md](../MINDMAP_PLAN.md) section 13 ·
> [maprender.md](maprender.md) (the render pass this one follows) ·
> [HISTORY.md](../HISTORY.md) "From MINDMAP_PLAN.md section 13a-view" (the
> record, with the numbers)
>
> Agent `worktree-agent-a2ce74db776281dd7`, port 8795, data dir
> `/tmp/mm-agentC2`, 2026-09-23. Tasks in order: 13a-view (INBOX 312), the
> coordinator's two whiteboard bugs (branch lines lag, a text box 5px wide at
> 390), INBOX 317 (the text box context bar), then WHITEBOARD_PLAN's
> "Placed from INBOX, 2026-09-23" micro-conventions.

## Done

- **13a-view, INBOX 312.** Pan worst 166.6 to 16.8ms at 500 topics (a
  whole-board restyle on press and release, not rasterising); culling of
  cards, text boxes, topics and tree lines; a dragged branch's lines drawn
  after every member moves (77 of 81 frames up to 12px behind, now 0);
  `tests/test_css_invalidation.py` in the lint set; `mapedgelag.js` new.

- **The text box 5px wide at 390** (coordinator's (b)). Measured: the only
  thing past the box is its right-edge resize grips, centred on the border
  by design (a card reads 253>248 the same way). `phonechrome.js` now counts
  an overflow only when what runs past is drawn and in flow or carries
  text, and names it in the finding. No app change.

- **INBOX 394 (d)**, the ring's More menu: anchored to the button, gap 4px
  at three widths (was 30 to 41px down and right, from the ring's box).
  `mapradialmore.js` 18/18.

- **INBOX 396 and 317.** Escape with a board menu open no longer drops the
  selection (it hid the bar, so the next press on More hit the canvas); every
  top-bar menu hangs from its button and scrolls in the room there instead of
  being pinned across it. `wbmenuroom.js` 72/72 (new), `wbtextbar.js` now
  checks every control for clipping. **Not reproduced:** the kebab failing
  to open on its own (six paths, three sizes), and Arrange at 230px.

- **WHITEBOARD_PLAN's conventions, the board and map half.** Its last row,
  Escape during a marquee or lasso, cleared the selection too; it takes back
  the drag only now (`wbmarqueeescape.js` 8/8, was 4/8). The documents,
  notes, chat and Library passes are the row's other half, not this agent's.
- **The coordinator's (a), `mindmap.js` H1** ("a node's edges still follow a
  drag on a 200-node map", failing on base per `mapux2.md`): passes now,
  during 0px and after 0px; `mindmap.js` 76/76 on a fresh data dir. On a
  data dir other sweeps have filled it stops at (42) instead (a new map's
  child not found; the same step alone works), which is the shared-data-dir
  fault `mapux2.md` already records.

## Open

- Not culled: freehand and link sketches (a stroke's box has to be parsed from
  its path). Worth it only once a board with many strokes measures slow.
- `mappan.js`'s fixture posts a `rect` sketch whose data is not a path, and
  the browser logs "Expected moveto path command" twice (predates this pass).
