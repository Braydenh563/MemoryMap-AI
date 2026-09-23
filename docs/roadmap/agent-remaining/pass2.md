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

`scratchpad/ui-sweeps/scrolltrace.js` (SCENE=notes, library, typing-note,
typing-doc, library-search, open-library; EXP_CSS for an A/B of one suspect,
COMPACT=1 for one line). 1184x760, 220 extra seeded notes, 25 documents.
Before and after are the same script on the same data; ranges are repeat
runs.

| Scene | Before | After | What it was |
| --- | --- | --- | --- |
| Notes, 30-step wheel scroll | raster 2.7 to 3.0s (one run 5.6s), paint 240 to 280ms, commit 320 to 1,460ms, script 530 to 585ms | raster 0.22 to 0.29s, paint 105 to 116ms, commit 120 to 165ms, script 275 to 315ms | the page wash re-rasterised under a transparent scroller that Chromium scrolls on the main thread at 1x (A/B: no background images 0.74s, no shadows no change); each card under the pointer animating its hover border and shadow (A/B: 940 to 280ms) |
| Library, same scroll | raster 1.04s, script 500ms | raster 0.17 to 0.24s, script 200 to 265ms | the same two; Layout is 10ms (the brief's 336ms was measured before this pass dealt the cards into columns; not an A/B of the same run) |
| Back-to-top check, per scroll frame | `coversAFormPrimary` 184ms over 84 frames | 12ms | a document-wide descendant selector (1.5ms a call over 10,700 elements) |
| Menus-open checks, per scroll event | 27ms and 18ms | walked from live collections | `:not(.hidden)` and `[open]` selectors over the document on every scroll event |
| Typing 88 characters into a 400-word document | style 1,651ms, paint 886ms, layout 344ms, raster 3.25s | style 325 to 369ms, paint 168 to 189ms, layout 156 to 208ms, raster 0.24s | the caret readout's `textContent` write (a node insertion every `:has()` over an ancestor re-checks: 53 subtree invalidations of `.doc-layout` in 20 keys, 14 after); 51 `aria-pressed` writes per key whatever their value; the editor scroller re-rasterised (same cause as Notes) |
| Typing "design notes" into the Library search | raster 313ms | 109ms | a View Transition of the whole window per keystroke |
| Typing 88 characters into a note | raster 243ms, input dispatch about 1s | unchanged | CodeMirror's own input handling in a list of 230 notes; found, not fixed |
| Opening the Library | about 250ms of main thread | unchanged | nothing worth removing found |

Not verified: how grey-scale text in the composited scrollers reads on a 1x
Windows display with ClearType (the cost of `will-change: scroll-position`
there); the sandbox has neither.

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
- The owner's "missing distinguishing between titles that used to be
  badges": Quiet's section labels had lost their capitals and nothing took
  their place (measured: "Background workers" 12px/600 muted over a 12px
  muted description; the Contents section name 13.6px muted over 16px ink
  rows). Labels are ink now, over muted descriptions; Contents section names
  take the Timeline day-head grammar and its rows step down to `--text-md`.
  A Files row's name was muted (rgb 102, 100, 95) and 13px left of its
  facts: ink, one inset. `contrast.js` passes in light and dark.
- Finding 9 (a board card's date) is not doable client side: `/whiteboard/boards`
  sends no timestamp. Left for a backend step.
- Finding 11 (the filename band on a picture) is left as it is: it is the
  outcome of INBOX 174 and two earlier owner reports, a decision, not a slip.
