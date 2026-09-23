# Agent: second de-vibecoding pass, the Library, micro-conventions, performance

Worktree `.claude/worktrees/agent-a52d41d28d1901f69`, fast-forwarded onto
`fix/gemini-fixes-5` (it was cut from `main`). Port 8799, data dir
`/tmp/mm-agentL` (`bash scratchpad/ui-sweeps/serve.sh 8799 /tmp/mm-agentL`),
seeded with `seed.js`, `seed-images.js`, `seed-file.js`, `seed-links.js`,
`seed-boards.js`, `seed-libtext.js`. Not in scope: the whiteboard and the map,
the guided tour, Settings, the graph options panel.

## Findings, per Library sub-tab (1440 / 1184 / 390, Quiet, light and dark)

Measured and seen before any change. Each line is open until it moves to
"Done" below.

**All**
1. Column masonry (`column-width: 17rem`) reads top to bottom per column,
   so "Newest first" is not the order on screen and every tag lands in the
   last column. Also the likely owner of the Layout cost while scrolling.
2. "Uncategorised" printed on every card's foot: eleven copies of a
   non-fact.
3. A note with no heading repeats its first line as the preview under a
   title that is that same line.
4. A picture card's image is narrower than its card (left aligned, gap on
   the right) and its top touches the card edge.

**Documents**
5. The one-line description is `--text-body`, larger than the rows it
   introduces; the same on Links.
6. A row's 28px tick shows at rest on every row (the All view's hover rule
   does not reach the other sub-tabs); the same on Files and Links.
7. The preview repeats the title.

**Boards & maps**
8. The kind icon sits on a row of its own above the title (a 20px row that
   says nothing the preview does not).
9. The facts line has a count and no date, where every other kind has one.
10. The chip row sits against the dock (measured gap below) where All has a
    full step.

**Images**
11. The filename is printed on a solid dark band under the picture, with a
    40px empty foot beneath it on a tile that was not used anywhere.

**Files**
12. Bug: the PDF first-page thumbnail fails, the app's missing-media handler
    runs first (capture phase) and draws "Image no longer in this notebook"
    inside the file tile, under the tick.
13. The row is four registers: a "Not read" pill, a filled grey "Read this"
    button, "Not used yet", and a full-width filled grey disclosure bar
    ("Text extracted from this file") on every row.
14. At 390 the dock wraps to three rows (title and sort, Upload alone, then
    search and the read filter).

**AI skills**
15. Four filled "Run" buttons on one screen (one filled per surface), a
    "Built-in" pill on every card, two outlined pills of counts, and a
    title at `--text-sm` bold smaller than its own description.
16. The background workers' two task switches are outlined accent pills in
    bold accent text, the loudest thing on the page for a setting.
17. The logs panel's "Clear" is enabled with nothing to clear.

**Links**
18. An always-open three-field add form duplicates the dock's "Add link".
19. Every row shows a bordered pin and a bordered menu button at rest.

**Contents**
20. The one group chip ("Uncategorised 11") carries a glow ring.
21. Rows mix a 32px image box, a missing-image placeholder and no picture,
    so titles start at three different x positions in one column.
22. A row's text is the title run into the body ("Sprint retro What went
    well").

## Micro-conventions (documents editor, notes, chat, Library)

To be measured in the running app, then built where missing: Ctrl/Cmd+F in
scope, Ctrl+A in selection mode, Shift+click range, Escape clears, arrow
keys and Enter in lists and grids, Delete on a selection (undoable),
double-click to rename, Ctrl+S never a browser dialog, right-click equals
the kebab, focus back to the opener, list scroll kept, "no results for X"
with a clear action, copy link and copy title.

## Performance by trace

Notes scroll (RasterTask about 3.4s over a 30-step wheel scroll at
1184x760), Library scroll (Layout about 336ms), typing in a long note and a
long document, opening the Library. Before and after numbers go here.

## Done

Nothing yet.
