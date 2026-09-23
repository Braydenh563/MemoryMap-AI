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

## Open

- The coordinator's (b): a freshly created text box at 390 overflows its box
  by 5px (`phonechrome.js`, clientWidth 198 vs scrollWidth 203). Not yet
  measured.
- INBOX 317: the whiteboard text box context bar (items clipped, icon groups
  off one centre line, kebab menu far from its opener).
- WHITEBOARD_PLAN "Placed from INBOX, 2026-09-23": the micro-conventions
  still open there.
- Not culled: freehand and link sketches (a stroke's box has to be parsed from
  its path). Worth it only once a board with many strokes measures slow.
- `mappan.js`'s fixture posts a `rect` sketch whose data is not a path, and
  the browser logs "Expected moveto path command" twice (predates this pass).
