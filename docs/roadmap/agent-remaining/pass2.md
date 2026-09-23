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

Measured (`scratchpad/ui-sweeps/listconventions.js`, 18 checks, all pass
after): already present before this pass and left alone: Ctrl+S prevented
on Notes, Chat, Library and Dashboard; Ctrl+F in scope (the documents
editor's own find, the global find elsewhere, chat included); ArrowUp and
ArrowDown with Enter in the Notes list; the Notes list's no-match state with
"Clear the filter"; the Notes list keeping its scroll across tabs. Built:
right-click and hold open the row's own menu (Library cards, Documents rows,
links, files, notes, chats); F2 rename; arrows, Home and End on Library
cards, rows and tiles; Shift+click ranges; Escape, Ctrl+A and Delete on a
selection (Library sub-tabs and Notes select mode); Library scroll kept
(400 to 0 before, 400 to 400 after; the cause was a width read after the
grid was emptied); "Clear the search" on an empty Library search; Copy title
and Copy link on Library menus; shortcut keys in five tooltips. Still open:
drag to reorder where order is user-owned (no user-owned order found in the
Library's lists: every list is sorted by a chosen key); Ctrl+Z/Y is the
app's undo stack (status bar), not extended here; chat has no list
selection to apply the keys to.

## Performance by trace

Notes scroll (RasterTask about 3.4s over a 30-step wheel scroll at
1184x760), Library scroll (Layout about 336ms), typing in a long note and a
long document, opening the Library. Before and after numbers go here.

## Done

- Findings 1 to 8, 12, 13, 18, 19 (commit "Library second pass: reading
  order, one card anatomy, one tick grammar"). Measured after, 1440 Quiet
  light: 4 columns, the first row of cards is items 1 to 4 of the sort; a
  card's picture is 338px in a 340px card, 1px from each edge (was flush left
  with a hole on the right); 0 "Uncategorised" feet (was 11); 0 file tiles
  holding a `.media-missing` placeholder (was 3); row titles 14.7px/600 in
  Documents, Files and Links (were 16, 13.6 and 13.6/500).
- Findings 15, 16, 17, 20, 21, 22 and the owner's two badge quotes
  (commit "Library second pass: skills, Contents, chips with an edge,
  timeline facts"). Measured after: a skill title 16px (was 12px, the
  `.card h3` eyebrow recipe), one filled button on the skills page (was
  seven), the workers are `label.setting-check` (were accent pills); the
  Contents labels start at one x per column (87, 544, 1001; one row was
  pushed right by a 170px missing-image box); the jump chip has no glow and
  ink at 500. A survey of every visible `.chip` across seven tabs found
  four kinds still drawn as a 5% ground with no edge (skill facts, a
  file's "Used in", the jump chips, the read state): three carry a
  hairline edge now, the read state is text. Timeline rows: category with
  its dot, #tags, Uncategorised left out.
- Finding 14 (commit "Library on a phone: two-row media dock, one
  floating action"). At 390 the Files and Images dock is 114px (was 166),
  the same as All, Documents, Skills, Links and Contents. The All view's
  floating Create no longer floats over Files, Images, Skills, Links or
  Contents. Not fixed: the Boards & maps dock is still 198px at 390 (title,
  New board, the map icon, refresh, help and the menu need about 450px of a
  358px row); the fix is New board as that sub-tab's own floating action,
  which the Boards sub-tab's rail-overlap rule currently forbids.
- Finding 9 (a board card's date) is not doable client side: `/whiteboard/boards`
  sends no timestamp. Left for a backend step.
- Finding 11 (the filename band on a picture) is left as it is: it is the
  outcome of INBOX 174 and two earlier owner reports, a decision, not a slip.
