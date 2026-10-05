# The whiteboard: controls that belong together, tools that behave

**Status: written by Fable by direct instruction ("the whiteboard panels
and tools need a better modern redesign still, this is horrendous"; "the
whiteboard control elements dont have that joined and cohesive feel"),
from the owner's screenshots and the code. Executed after
DOCUMENTS_PLAN.md and before MINDMAP_PLAN Phases 4 to 5, which build on
the same canvas.**

Back to [../ROADMAP.md](../ROADMAP.md).

## 1. What exists (checked in the code)

`frontend/js/whiteboard.js` (9,767 lines) draws an infinite dotted canvas with
object kinds `note`, `document`, `file`, `image`, `sketch`, `text`, `square`,
`circle`, `arrow`, `topic`/`node`/`radial` (mind maps) and `object`. Chrome:
a top bar on the Phase 8 grammar (Boards, board picker, rename, add, Map
toggle, layout select, Tidy, search, minimap, Insert/Edit/Arrange/View/Board
menus, Library, fullscreen); a bottom tool strip of 16 round buttons in
five groups (select, pan, lasso; pen, marker, eraser, fill; line with a
caret; sticky, text, image; straight and curved connectors; delete, undo,
redo); a zoom strip bottom right; a floating selection bar (duplicate,
style pipette, fill, send back, bring front, export, delete); a
properties panel on the right (copy style, guide colours, colour, width,
start cap, end cap, stroke style, and the arrange block: group, ungroup,
align, space, extract notes); the export popover; the new-board dialog.

## 2. Why it disappoints (from the screenshots, each checked in the code)

1. **Five surfaces, five recipes.** The top bar is the dock grammar; the
   tool strip is 16 separate circles on a pill; the selection bar is a
   third shape; the properties panel is a fourth (a scrolling column of
   label/control pairs with no sections); the arrange block is a fifth,
   and its buttons draw an icon on top of their label ("Ungroup" with the
   scissors through it) because the icon-only recipe and the labelled
   recipe are both applied. Nothing says "this is one tool".
2. **The tool strip does not say what a tool does or which is active
   beyond one filled circle**, has no labels, no shortcuts shown, and the
   line tool's caret opens a menu that is the only sub-tool picker in the
   strip. The colour of the ink you are about to draw is not visible
   anywhere on the strip.
3. **The export popover** opens as a 1,300px list (five sections of three)
   under the selection bar and runs off the screen (screenshot). The
   choices are a matrix (scope: selection / screen / board; format: image
   library / PNG / SVG / PDF / outline) rendered as a list.
4. **Properties lie or hide.** A drawn line reports Start cap Arrow and
   End cap Arrow when only the end has one (the default for the line tool
   is written into both selects); the arrange block offers Space and
   Group but no align-centre, no distribute-gaps, no same-size.
5. **Selection handles differ by kind** (notes show a thin rectangle with
   outside handles; shapes show handles on the corner with a rotate stem)
   so the same drag reads as two different objects.
6. **The highlighter draws opaque** and the quick-sketch highlighter
   "needs reworking" (owner): no multiply blend, no width, no straightness.
7. **A new mind map's root sits under the top bar; dragged map nodes leave
   their edges behind** (a regression from the marquee fix; owner's
   screenshot). Tidy never measured past five nodes.
8. **No keyboard model.** V, H, P, T, R, O, L, Delete, Ctrl+D, Ctrl+G,
   arrows nudge: the strip has none of it and the help does not say.

## 3. The target, in one paragraph

One canvas with three chrome pieces that share one recipe: the top bar
(the dock grammar, unchanged), a **tool rail** (one panel, tools as ghost
buttons with an active state, each with a tooltip naming its key, one
ink swatch that shows the pen colour and opens the colour picker, sub-tools
as a small flyout on long-press or the caret), and a **context bar** that
replaces both the floating selection bar and the properties panel: it
appears above the selection, shows only what applies to the selected
kinds (colour, stroke, caps for lines; fill and corner for shapes; font
for text; align/distribute/group when two or more), and opens a compact
popover for the long tail. Export is a dialog with two rows of segments
(scope, format) and one primary button. Handles are one recipe for every
kind. Every tool has a key and every key is in the tooltip and the help.

## 4. Decisions made (do not re-decide)

1. **Tool rail, not circles.** `.wb-rail` is a panel (card surface, glass
   edge) holding `.wb-tool` ghost buttons at `--control-h-lg`; the active
   tool is `accent-soft` with `aria-pressed`; groups are separated by a
   hairline; the ink swatch is the last group. Bottom-centre on desktop,
   bottom full-width on phone (Phase 9 already moved it).
2. **One context bar** (`.wb-context`) replaces `.wb-selection-bar` and
   `#wb-properties-panel`. Built from a table of kind → controls, so a new
   kind gets its controls by adding a row, not a panel. The long tail
   (guide colours, copy style, extract notes) lives in a "..." popover on
   the bar.
3. **Arrange is a segment group in the context bar**: align (left,
   centre, right, top, middle, bottom), distribute (horizontal, vertical),
   same size (width, height), group/ungroup, order (front, back). All
   eleven exist as functions or are ten lines each; the block in the
   screenshot is missing five of them.
4. **Export is a dialog** (`.modal` recipe): scope segment (selection,
   screen, board), format segment (PNG, SVG, PDF, Markdown outline, OPML,
   Save to image library), one primary "Export". The popover goes.
5. **Caps default per tool**: line tool = none/none, arrow tool = none /
   arrow, connector = none/none; the properties read the object, never
   the tool default (bug 4).
6. **One handle recipe** for every kind: eight handles, rotate stem on
   top, the bounding box at `--accent` 1px; a note's inner card no longer
   draws its own outline.
7. **Highlighter** = marker with `mix-blend-mode: multiply` at 40%
   opacity, width 12 to 24, Shift for straight; the quick-sketch pad uses
   the same tool code, not a copy.
   Two halves of this were left open when Phase 3 was built and are decided
   here, 2026-09-20, with the measurements that decided them:
   - **One table, two renderers. The pad stays a canvas.** The board draws
     SVG paths and the pad draws into a `<canvas>`; they are two rendering
     models and turning the pad into an SVG surface would be a rewrite of a
     working thing to make one tool's numbers agree. What is shared is the
     *definition*, not the code: `HIGHLIGHTER_STYLE` in `app.js` (alpha,
     width multiplier, the 12 to 24 clamp, cap, join, and the blend per
     backdrop) with `highlighterWidth()` and `highlighterBlend()` beside it,
     read by the pad's `sketchMove`/`sketchEnd` and by whiteboard.js's
     live-draw, mouseup and render paths. It lives in `app.js` because
     `whiteboard.js` is lazily loaded (`app.js`'s module map) and can read
     `app.js`, never the other way round. A tenth field of a highlighter
     added to one renderer and not the other is the bug this ends; the
     numbers before it were 0.4 with multiply on the board against 0.35
     with no blend and no clamp on the pad.
   - **The blend follows the backdrop, not the theme name.** Multiply is
     worth 20 luminance units a pass on a light board and 3 on a dark one
     (measured 252.9 / 229.6 / 211.5 light, 26.4 / 23.6 / 22.0 dark), so
     multiply on a dark board is a blend that does nothing while turning
     the ink to mud. The rule is `multiply` over a light backdrop and
     `screen` over a dark one, chosen by the resolved mode and re-applied
     when the mode changes, because the blend is an inline style (the
     export clones these nodes into a standalone SVG, where a stylesheet
     does not follow them). The pad passes "light" always and that is not a
     fudge: its strokes go into their own transparent canvas stacked over
     the paper canvas, so the backdrop a canvas blend sees is the other
     strokes and never the paper.
8. **Keys** (also in tooltips and help): V select, H pan, L lasso, P pen,
   M marker, E eraser, N sticky, T text, I image, C connector, A arrow,
   R rectangle, O ellipse, Delete, Ctrl+D duplicate, Ctrl+G group,
   Ctrl+Shift+G ungroup, arrows nudge 1px (Shift 10px), + / - / 0 zoom,
   F fit selection, Escape deselect. Same as the graph where they overlap.
   Two letters this list did not settle, decided while building Phase 1 and
   followed from here (the interrupt rule's point 4: a decision is recorded
   in the plan it affects):
   - **The board has two connectors and this list names one letter.** C is
     the straight link, Shift+C the curved one. The shifted form of the same
     letter rather than a second letter, so the pair reads as one idea; the
     built rail kept K for lasso and L for line, which is why L is not the
     lasso here.
   - **N was already the board overview** (bare, since the overview was
     built) and this list gives it to the sticky note. The sticky takes N and
     the overview moves to Shift+N, which is the same shifted-pair shape, and
     the top bar's button and the board help say so.
9. **Mind map root placement**: new root centred in the visible canvas,
   below the top bar's inset; edges are re-drawn from the node model on
   every drag frame (the marquee fix must not have detached them; add the
   sweep check that a dragged node's edge endpoint moves with it).
10. **The canvas is a Tab stop, and Tab on it walks the items** (taken
   2026-10-03, INBOX 445). It was kept out of the tab order while Tab on it
   did nothing; with nothing else reaching a shape without a pointer, Tab and
   Shift+Tab select the next item in reading order and `#wb-announcer` names
   it. Past the last item Tab leaves the canvas, so it is never a trap. A
   map keeps its own Tab (add a topic).
11. **The tool bar shows only what the held tool reads** (taken 2026-10-03,
   INBOX 445): `WB_TOOL_SETTINGS` maps a tool to its settings; a tool with
   none (a link, the eraser, the sticky, the text box, the bucket) shows no
   bar, and nothing that acts on a selection shows with nothing selected.
12. **A closed shape holds text** (taken 2026-10-04, the competitor pass:
   tldraw, Excalidraw, Miro and FigJam all do it, and a flowchart is the
   first thing anyone draws with the four shape tools). The text is `label`
   in the shape's own data blob, drawn as an SVG `<text>` inside the shape's
   group, so it moves, resizes, turns, exports and undoes with the shape
   rather than being a text box parked on top. Double-click the shape or
   press Enter with it selected; Enter or Escape ends, Shift+Enter breaks the
   line; the right-click menu says "Add text". Centred in the shape's label
   area (the inscribed band of an ellipse, the middle half of a diamond, the
   lower half of a triangle), wrapped to it, re-wrapped on a resize. Ink is
   the theme's text colour, or black or white on a fill of half opacity or
   more (`wbCoreInkFor`, the core topic's rule). No size, font or alignment
   controls: the bar keeps its seven, and those three are not what a first
   flowchart misses. Lines, arrows and pen strokes take no text; a label on
   a connector is decision 13.
13. **A connector holds a label** (taken 2026-10-04, the same pass: Miro,
   FigJam and Excalidraw all label a connector, and "yes" and "no" on the two
   arrows out of a diamond are what decision 12's flowchart needs next).
   `label` in the link's own data, one line of at most 80 characters (the
   map edge label's limit), drawn at the middle of the shaft, on the curve
   when the line is bent, in the map's edge-label recipe (ink haloed in the
   card colour) one size up. **The double-click keeps the bend** (asked for
   directly, earlier, and a gesture people already use here): the label is
   Enter on the selected connector and "Add a label" on its right-click menu.
   A cross-link on a map is the map's and keeps its ring; this is the
   board's links. Shares decision 12's one editor (`wbOpenSketchLabelEditor`).
14. **A frame is a titled region that carries what is in it** (taken
   2026-10-04: no decision existed for the open "board frames" row, and the
   recommendation was taken under standing order 3). tldraw's and
   Excalidraw's shape: an edge and a title, no fill, so shapes on the
   drawing layer show through; F, the rail's Add section and the Insert
   menu; click drops one (480x320, fitted to the screen), a drag draws it.
   An object of kind `frame`, its title in `content`, stacked below
   everything. Its inside lets the pointer through (a press inside selects
   or draws as on bare board); the title takes the pointer. Dragging the
   title carries whatever lies wholly inside, decided when the drag starts;
   Ctrl moves the frame alone (the map topic's rule). Double-click the title
   to rename. Delete leaves what it held. No rotation, no style or order
   controls. Not on maps. Nesting, clipping and a frame as an export or
   presentation unit are not in this decision.
15. **A locked item lets the pointer through** (taken 2026-10-04, the open
   "lock" row, recommendation taken under standing order 3). Excalidraw's
   shape rather than tldraw's selectable-but-frozen one: a locked item
   cannot be selected, dragged, resized, erased or typed into, and Select
   all, a marquee, the lasso, a group's click and a frame's drag pass it
   by, so no gesture needs a guard of its own. Lock: the item's right-click
   menu and Ctrl+Shift+L. Unlock: the board's right-click menu ("Unlock 3
   locked items"; a right-click on the item goes through to it) and
   Ctrl+Shift+L with nothing selected. One undo step per lock or unlock. A
   card's flag is a column (`whiteboard_nodes.locked`, migration
   `e5a1c8f3b7d2`); a sketch's and an object's are in their data. Not on
   maps. No lock mark is drawn.
16. **Presentation steps through the frames** (taken 2026-10-04, the open
   "presentation mode" row, under standing order 3; tldraw's and Miro's
   shape, now that decision 14 gives a board its slides). View, Present
   frames: full screen, every control hidden but one bar at the foot
   (Previous, "2 of 5: title", Next, End), the frames in reading order
   (rows from the top, left to right), each fitted with its title above the
   bar's strip. Arrows, Space, Page Up and Down, Home and End walk; Escape
   ends and restores the camera and the window. A view: no key or press
   edits the board while it runs. No frames: a toast says to add one. Not
   on maps (MINDMAP_PLAN 12.2 item 9 is the map's own, by branch). Speaker
   notes, transitions and a presenter view are not in this decision.
17. **A comment thread lives in the item it is about** (taken 2026-10-04, the
   open "comments" row and MINDMAP_PLAN §12.2 item 6, under standing order 3;
   MindMeister's and Miro's shape: a thread per item, a count on it).
   `comments`, a list of `{id, text, at}` (at most 100, each at most 2,000
   characters of plain text), in a sketch's or an object's own data and in a
   card's own `comments` column (migration on `e5a1c8f3b7d2`). Not a table
   keyed across the three tables: in the item's own data a thread moves,
   copies, undoes and is deleted with its item and needs no cascade. A
   commented item wears a count mark at its top-right corner
   (`.wb-comment-mark`, a speech bubble and the number, at screen size like a
   grip), one layer for every kind so a shape has one too, and outside the
   item, so a locked item's thread still opens. The mark, the item's
   right-click menu ("Comment…", "Comments (3)…") and a map topic's Topic
   group open the thread in the help popover's shell (MINDMAP_PLAN decision
   18's): the comments oldest first with their time, a delete on each, one box
   at the foot; Enter posts, Shift+Enter breaks the line, Escape closes. Each
   post and each delete is one undo step. A notebook has one author, so no
   names, mentions or resolve (deleting the last comment is resolving). A
   connector takes no thread (its label is what a line says). Not in any
   export: a thread is talk about the board, not the board.
18. **A frame is an export scope; frames nest by what they hold; nothing is
   clipped** (taken 2026-10-05, decision 14's three open edges, under standing
   order 3). "Export this frame…" on a frame's right-click menu selects the
   frame and everything wholly inside it, locked items too, and opens the
   export dialog on Selection, so every format the dialog has applies. A
   frame wholly inside another is one of the things it holds: dragging the
   outer one carries the inner one and what is in it, which decision 14's rule
   already does, so nesting needs no rule of its own. An item that overhangs a
   frame belongs to no frame and is drawn whole: clipping would hide what a
   person put there with no way to see it but moving it.

17. **Which history Ctrl+Z walks** (taken 2026-10-05, the owner: "the undo
   and redo across the application needs to cover EVERYTHING" and "shouldnt
   there also be local undos and redos ... for specific documents,
   whiteboards, mindmaps"). An open board or map: its own stacks
   (`wbHistoryFor`, one pair per board id, 100 steps, kept for the session
   while you visit others). An open document: its own CodeMirror history,
   kept per document id for the session (`docResetDocument`, restored only
   over the same text, purged on lock). Everywhere else, including the
   boards list: the app's stack (`pushUndo`, 50 steps). Inside a text field:
   the field's own. The status bar's pair says which ("on this board", "in
   this document", or the app step's name) and is repainted on a tab, board
   or document change. **Amended 2026-10-05 (INBOX 553(b), the owner):
   kept across a reload**, the last 100 steps of each board and map and the
   last 100 of each document's history, in IndexedDB on this device
   (`undo-store.js`, keys `board:<id>` and `doc:<id>`), written a moment
   after each change and read back when the board or document is first
   opened in a session. IndexedDB rather than the server: a step is an
   instruction against what this device last saw, so it is not carried to
   another device, and it needs no schema or network. A document's history
   comes back only over the very text it was taken against; the lock
   empties the store. The server's event log stays the long memory
   (History sheet, Recent activity).
18. **A board gesture's Undo is read off what it changed** (taken
   2026-10-05). `wbRecordGesture` snapshots every row and the map's settings,
   runs, and pushes the difference as one batch (lost rows back, a map's
   topics as one branch parents first; reparents, via the root when several
   moved so no step makes a ring; made rows removed, links first, children
   first; changed rows written back whole), replacing what the gesture pushed
   itself. New gestures go in `WB_RECORDED`; a gesture that knows something
   the snapshot cannot (a drag's start, `wbMapTransplant`) keeps its own.

### Decisions made, 2026-10-05: the draw.io pass (INBOX 557, 558)

Taken from the features audit's section 9.5 recommendations
(`scratchpad/audit1005/features.md`), under standing order 3. Where one
revises an earlier decision the owner's newer words ("take everything from
draw.io", "redesign the controls ... to maximise usability, utility,
accessibility, and learnability") are why.

19. **Decision 2, revised: the context bar stays the quick bar; its "..."
    opens a docked Format panel.** At most seven controls per kind on the bar
    (decision 11). The long tail goes to a Format panel on the right (Style,
    Text, Arrange tabs; Ctrl+Shift+P, which the board takes while it is on
    screen as it takes Ctrl+Shift+G), hidden by default, never a second
    floating popover.
20. **Decision 12, revised: a shape's text takes size, font and alignment in
    the Format panel's Text tab only.** The bar keeps its seven.
21. **Decision 13, revised: one label per connector, and it slides.** `label_t`
    (0 to 1 along the line, 0.5 the middle) in the link's data; a drag on the
    label moves it along. Several labels stay out.
22. **Decision 14, revised: frames are the pages.** The sidebar lists the
    board's frames as its pages (reorder is the presentation order); no second
    concept of a page.
23. **One command table** (`WB_COMMANDS`, whiteboard-commands.js). The Edit
    and Arrange menus' rows name a command (`data-wb-cmd`) and say its words
    and key (lint: `tests/test_wb_commands.py`); the right-click menu, the
    command palette's "This board" group and the shortcut sheet's whiteboard
    section are built from it. `]` and `[` are one step (past the next item
    that overlaps, ties broken by paint order, the fewest rows written);
    Ctrl+] and Ctrl+[ are the front and the back (FEAT-07). A shape's z is its
    paint order. No Order on a map (FEAT-17).
24. **A board's look lives on the board** (FEAT-06): `background {color,
    image}` in the board's settings beside type and layout, migrated once from
    the old per-browser keys on open; media cleanup counts the image. Grid and
    snap stay per device.
25. **The object library is independent copies** (section 8.4): a placed item
    becomes ordinary rows that remember `library_ref {id, version}` and never
    follow later edits. Built-in sets are static JSON shipped with the app,
    drawn fresh (no draw.io stencils; Apache-2.0 features, not code); "Yours"
    holds six kinds (a selection, a custom shape, a style or palette, a
    preset, a branch, a whole board as a template). **BACKLOG 4b is answered
    here:** a template is a library item of kind `template`, not a mark on
    the board.
26. **One left sidebar** (MINDMAP §12.5 and decision 5 revised, below): tabs
    Library, Notes (the note library moved in from the right), Layers, and on
    a map Outline; collapsible to a 44px rail, remembered per device; on a
    phone it is the edge sheet.
27. **Layers, phase 1**: the board as a tree in paint order, each row with
    show/hide (a `hidden` flag), lock (decision 15's flag) and rename; a drag
    restacks (writes z). A hidden item is drawn nowhere, exported nowhere,
    skipped by search and the Tab walk. Named layers stay phase 2 (BACKLOG
    29c).
28. **A locked item shows a faded lock on hover** (INBOX 557a), found by a
    board-level hit test since the item takes no pointer (decision 15); a
    press on it hints once, "Locked. Right-click to unlock".
29. **The AI edits boards with confirmation** (FEAT-12): move, edit, restyle
    and delete tools, each one event and one undo step, through the same
    confirm the other destructive agent tools use.

### Decisions made, 2026-10-05: draw.io phase 2 (wb-phase2)

30. **Every connector style takes bends** (decision 13's single `bend`
    retired for new edits). `points` (board units) is the one list: an elbow
    routes through it, a straight line runs through each in turn, a curved
    line is one Catmull-Rom curve through all of them leaving along its
    shapes' edge normals. The same grips on every style (filled bend, hollow
    ring to add); a double-click on the line adds a bend there; changing the
    line shape keeps the bends. An old link's `bend` is drawn as before and
    read as one waypoint, written as `points` on its first edit. A map's
    cross-link keeps its own bend handle.
31. **Line jumps are per connector** (`jumps`: arc, gap or sharp; none by
    default, as draw.io), set in the Format panel's Style tab. A connector
    hops on its straight runs over every line painted under it, so of two
    crossing lines only the upper one hops; the hitbox and the label keep
    the plain line.
32. **A Mermaid subgraph is a frame** (decision 22: frames are the pages). A
    node belongs to the first subgraph that names it; a subgraph is laid out
    as one block inside its parent's rows, so its frame holds its members
    and nothing else; an edge naming a subgraph joins its frame. The export
    writes every frame that holds a joined item as a `subgraph` of its title
    (the innermost frame; nested frames go out flat).
33. **A board's history is its items' event log, read three ways**
    (`routes_board_history.py`): moments (runs of at most two minutes,
    newest first, paged), the board at any event (each item folded to it;
    an item with no log was there from the start, one whose log begins with
    an edit was there as that edit's `before` says), and a restore of the
    board or the named items in one transaction, each row with its own event,
    links and a topic's parent re-pointed at remade rows. A library
    placement records each item's `created` beside its one board event
    (decision 25's "one event" kept for the board). A compacted moment is
    listed and not shown (410). The client draws the past with the board's
    own render in the presenting mode (`.wb-presenting`) with its own bar, refuses
    writes while it is shown, and records a restore as one Undo step.
34. **Drawn shapes are guide targets, and a row's spacing continues**
    (`wbGuideBoxes`, `wbSpacingSeries`): a sketch with a `shape` or a closed
    path is lined up with like a card (a freehand stroke and a connector are
    not); with no neighbour on the far side, the gap to the nearest item
    snaps to the gap that item keeps to the next one out. Alt still bypasses
    every guide; align and distribute stay the Arrange menu's (they existed).
35. **Connection points are on the outline** (`wbPortsForPath`): a card, a
    text box and a rectangle keep the eight; a drawn polygon has its corners
    and side middles, a curve its eight compass points; each is a fraction
    of the box, and a stored anchor is read from its fraction, so links made
    before keep their ends. With Select, pointing at an item that is not
    selected, locked or on a map shows them, and a drag from one makes an
    elbow connector with an arrow (as clone-and-connect does), to the item
    let go on or to a free end; a press that does not travel selects. A
    connector whose two ends one drag carried has its waypoints carried too,
    in the same Undo step.
36. **Branches from my notes is grounded by construction** (FEAT-13,
    `routes_map_suggest.py`): the search engine finds the notes (not private,
    not a board, not already on the map), the model only names a topic for
    one of them by number, and a line naming no listed note is dropped; with
    no model, or prose, the notes' titles are the suggestions and the dialog
    says so. Previewed in the picker dialog (the Attach picker's rows, all
    ticked), never written until Add, which makes the ticked ones under the
    topic in one transaction with "From your note ..." as each one's note,
    one Undo step. Ghosts drawn on the canvas wait for boot CSS room (the
    cap is full); the picker is the recipe the app already has.

## Built, 2026-09-09: one surface per panel, and the Arrange section

Moved to HISTORY.md ("Moved from the plans, 2026-09-09", WHITEBOARD_PLAN.md) on 2026-09-09: a plan holds open work only.

## Undo coverage, audited 2026-10-05 (INBOX 537)

Every mutating action on a board or a map, and whether Undo puts all of it
back (server side effects included). "Recorded" means `WB_RECORDED`
(decision 18). Measured with `scratchpad/ui-sweeps/boardundo.js` (43/43),
`mapinsertundo.js` (8/8), `wbmapundo.js`, `maprelink.js`.

| Action | Undo before | Now |
| --- | --- | --- |
| Delete a topic (Delete key, tool, menu, X) | one row back, loose; its branch lost | the branch, under its parent |
| Undo of a create whose topic gained a branch since | branch deleted for good | branch kept, Redo brings both |
| Delete a card, box or shape | item back, its links lost | item and links, ends re-pointed |
| Delete a selection | one step per item; parallel deletes popped the wrong entry | one step, in order |
| Clear board | one step per item; 404 on cascaded links stopped it | one step |
| Image object deleted | file unlinked, Undo drew a broken picture | file kept (media cleanup reclaims) |
| Fold, Expand all, Tidy, layout, numbering, theme, reset every topic's style | none | recorded |
| Add child, sibling, root, reference, duplicate, copy branch, template | the create only (unfold and tidy left) | recorded |
| Detach, remove keeping branch, turn a line around, cross-link reverse, to branch, cut | none | recorded |
| Insert between, outdent, move among siblings | own entries | recorded |
| Group, ungroup, paste style, bucket fill, fit to text, arrange cards | none | recorded |
| Card text edit (the note's words) | none | `note` step |
| Branch card on a board (makes a note) | none | recorded, the note to the bin and back |
| Drop a branch on a topic | own entry | own entry; a folded target opens (the "disappeared" report) |
| Rename a topic left open across an Undo | wrote onto another topic | the live row by id; an open edit is committed first |
| Delete a board (board menu, gallery, bulk) | "cannot be undone" (it was the bin) | bin, toast Undo and app Undo |
| Rename or duplicate a board (gallery) | none | app Undo |
| Move, resize, rotate, nudge, align, z-order, lock, frame title, properties panel, link handles | own entries | unchanged |

Open: a board's undo does not survive a reload; an agent's or another tab's
change to the open board is not on its stack (the History sheet has it).

### The app's stack (outside boards and documents)

| Action | Undo |
| --- | --- |
| Note bin, archive, edit, attach, link, unlink, tags, categories (move, rename, merge, delete, split, colour), reminders delete, skills batch | already had one |
| Category delete from the keyboard | added |
| Merge duplicate notes | added (words, tags, the binned notes back) |
| Generate or remove a note's title | added |
| A link's kind or properties | added |
| Clear completed reminders; delete an overdue or done reminder | added (`POST /reminders` `restore`; the past-date rule refused them) |
| Empty the bin, purge a note | none by design: confirmed, permanent |
| Detach a bookmark from a note being edited, delete a note type, relation type (its links typed again), conversation, or a space that was empty or whose contents moved | added (undo-1005: each DELETE answers with what it removed; `restore` on the create, `POST /spaces/restore`, `POST /conversations/restore`) |
| Delete a space with everything in it | none by design: confirmed, its files leave the disk |
| Entity merge | none yet (open; another agent's) |

## 5. Phases

### Phase 1: the rail and the keys: BUILT, 2026-09-12
Moved to HISTORY.md ("Moved from the plans, 2026-09-12", WHITEBOARD_PLAN
Phase 1): a plan holds open work only. The gate lives on in
`scratchpad/ui-sweeps/whiteboard.js` (13 checks, green at 1440x900 light
and dark and at 390x844).

### Phase 2: the context bar: BUILT, 2026-09-12
Moved to HISTORY.md ("Moved from the plans, 2026-09-12", WHITEBOARD_PLAN
Phase 2): a plan holds open work only. Its gate lives on in
`scratchpad/ui-sweeps/whiteboard.js` (24 checks, green at 1440x900 light
and dark and at 390x844).

### Phase 3: export dialog, handles, highlighter: BUILT, 2026-09-12
Moved to HISTORY.md ("Moved from the plans, 2026-09-12", WHITEBOARD_PLAN
Phase 3): a plan holds open work only. Its gate lives on in
`scratchpad/ui-sweeps/whiteboard3.js` (12 checks, green at 1440x900 light
and dark and at 390x844). The two parts of decision 7 that were open are
decided and built, 2026-09-20 (the decision's own two sub-points above):
one `HIGHLIGHTER_STYLE` table read by both renderers, and a blend chosen by
the backdrop. Their gate is `scratchpad/ui-sweeps/sketchparity.js`,
9 checks, green at 1440x900 in both modes.

### Phase 4: mind map regressions and Tidy: BUILT, 2026-09-12
Moved to HISTORY.md ("Moved from the plans, 2026-09-12", WHITEBOARD_PLAN
Phase 4): a plan holds open work only. Its gate lives on in
`scratchpad/ui-sweeps/wbphase4.js` (19 checks). Root placement and the
per-frame edge follow were already built and are now measured (0px endpoint
gap over 29 edges, mid-drag, for a leaf, a whole branch and a marquee pair);
Tidy with thirty nodes leaves no overlaps in any layout, which took one fix:
a radial map past about twenty nodes compressed its rings into less arc than
its nodes occupied.

## 6. Consistency rules

Tokens only; the rail and the context bar are the same `.panel` surface
the docks use; buttons are the six recipes of WORLD_CLASS_PLAN §1.2; menus
are the one menu recipe; dialogs the modal recipe; keys in KEYMAP.

## 7. Not verified until built

Touch: the rail's long-press flyout on a tablet; pen pressure for the
marker. What is not measured anywhere in this section is a real finger on a
real tablet.

**The context bar at phone width is decided, 2026-09-20: it pins.** Both
placements were built and measured at 390x844 with five kinds high and low
on the board, ten selections each way
(`scratchpad/ui-sweeps/wbcontextphone.js`, 5/5 at 390x844 and at 1440x900).

| | floating | pinned |
| --- | --- | --- |
| covers the item it edits | 0 of 10 | 2 of 10 (an image entirely, 8640px2; a line, 3519px2) |
| sits on the tool rail | 2 of 10 (7759px2, 1122px2) | 0 of 10 |
| leaves the canvas | 1 of 10 | 0 of 10 |
| distinct tops | 10, spanning 452px | 1 |

The earlier reading (Phase 2, 2026-09-12) measured the bar clear of the
selection and inside the canvas and called that the case for floating; what
it had not measured was the bar against the rest of the chrome. At this width
the bar is a band, 348px of a 364px canvas for four of the five kinds and
269px for an image, 6.6% to 25.3% of the board. A band over the item can be
panned out from under; a band over the rail takes the drawing tools away.
Pinning's cost is the two selections under it, which is recorded in the sweep
rather than hidden. Desktop keeps the floating bar, measured at 1440x900 in
the same run: 0.7% to 2.6% of the canvas, nothing covered.

Found and fixed with it: the bar's `top` was never clamped to the canvas the
way its `left` was, so a selection low on the board put it from 843px to
1183px down an 844px window. It is clamped on both axes now.

## 8. Research: tldraw, Excalidraw, Miro, FigJam, and what it changes here

Written from working knowledge of the products, not a live teardown;
confirm in the product before building the phase where it matters.

- **tldraw** (MIT-licensed core, the strongest reference for a web
  canvas): one vertical or bottom tool rail of ghost buttons with a
  single active state; a *style panel* that shows only the properties
  the selection can take (colour, fill, dash, size, font, align) and
  collapses to an icon when nothing is selected; selection handles are
  identical for every shape; arrows bind to shapes and re-route; keys
  V H D X R O A L T N F E, with the key shown in each tooltip. Implication:
  decisions 1, 2, 6 and 8 are tldraw's shape almost exactly, which is a
  good sign, and tldraw's style panel confirms that "only what applies"
  is the right rule for the context bar.
- **Excalidraw** puts the property panel at the left as a stacked card
  and the tool rail at the top; its export dialog is exactly a scope
  toggle (selection / whole) plus format buttons with a preview.
  Implication: decision 4's dialog should include a live preview
  thumbnail; it costs one `toBlob` and prevents the "which scope did I
  pick" mistake.
- **Miro** and **FigJam** show a *contextual toolbar* floating above the
  selection for the common properties and put the long tail in a side
  panel. Implication: the "..." popover in decision 2 is the same split;
  keep the bar to at most seven controls and measure it.
- **Highlighter**: FigJam and Apple Freeform draw highlighter strokes
  with multiply blending and a fixed wide nib, straight with Shift.
  Implication: decision 7 is the norm.
- **Mind map tools** (XMind, Coggle): the root is created centred and
  selected in edit mode; child nodes are created on Tab at the parent's
  side and the layout re-flows; edges are part of the node model, not
  separate objects. Implication: decision 9, and MINDMAP_PLAN Phases 4 to
  5 should treat edges as derived from the tree, never as objects that
  can detach.

## Placed from INBOX, 2026-09-09

The owner's reports this plan owns, moved whole from INBOX.md with their numbers (never reused). Each becomes a phase row when its phase is written; until then this list is the phase.

### ~~Found while measuring the board bar at 820 (2026-09-20, not the owner)~~

~~**The board's top bar runs past its own right edge below 600, by 75px at 320
and 5px at 390**, and carries thirteen controls at 1440 against the dock
grammar's ceiling of seven.~~ **Both done, 2026-09-21**, measured before and
after at five widths with `scratchpad/ui-sweeps/wbtopbar.js` (now in
`scripts/gate.sh`'s sweep list), which also gates the menus' keyboard and ARIA.
The Built block is in [HISTORY.md](HISTORY.md), "Moved from the plans,
2026-09-21".

12. **Whiteboard: export-selection popover opens a full-height list in the
    wrong place; arrow drawn shows both caps as Arrow in properties;
    missing align-centre and distribute-gaps; the arrange panel's buttons
    are unreadable (icons overlapping text).** Owner: WHITEBOARD_PLAN.md.
    **The caps part only is fixed** (my scope was "12 only the caps part"):
    `wbDetectArrowStyle`'s own regex scan included the shaft's leading `M`
    (matched separately, one line above, specifically to exclude it) in
    its search for head markers, so a shaft with zero start caps still
    measured a false zero-distance hit on its own start point and reported
    "both". Slicing the shaft's own match off the string before scanning
    fixed it; verified live (`startcap: "none"`, was `"arrow"`).
    **The rest is closed, 2026-09-20, by Phases 2 and 3 rather than by
    repairs**, and measured rather than assumed
    (`scratchpad/ui-sweeps/wbinbox12.js`, 6/6 at 1440x900 and at 390x844).
    The popover the report is about is not built any more: the export is a
    dialog (decision 4), `.wb-export-menu` builds nothing, and the dialog
    opens inside the window at both widths (480x393 at 480,254 in 1440x900;
    342x417 at 24,214 in 390x844). Align centres and even gaps are both on
    the context bar, which carries all twelve arrange controls for a
    selection of two plus the two z-order ones. And the panel whose buttons
    drew their icons through their labels is gone with the properties drawer:
    every arrange control is icon-only with its name in the tooltip, measured
    at 0px2 of icon-over-text across 24 buttons on the bar and in the top
    bar's Arrange menu together.
25. **Whiteboard: the edge anchor outline on note objects differs from
    every other object kind.** Decision: one anchor recipe for all kinds
    (the shape one; the note one goes). Owner: WHITEBOARD_PLAN Phase 1.
43. **(the top bar's menus: fixed, e1e395b; the rest is Phase 1)**
    **Whiteboard bottom tool rail and the properties panel** are not on
    the refined recipes (the top bar is). Owner: WHITEBOARD_PLAN Phase 1.
    **Done, one part:** the five top-bar menus (Insert, Edit, Arrange, View,
    Board) clipped at the bottom of the panel, the View menu screenshot in
    31. They were already capped to the window, which was not the bug:
    measured at 1280x640, View and Arrange ended at y=628 inside a 640px
    window while `#library-view-whiteboard` (`overflow: hidden`) ends at
    y=579, so the last 49px was cut off by an ancestor. Now on 31's recipe
    (escape the clipper, then cap, then scroll). kebab-viewport.js sweeps
    all five at 1440x900, 1280x640 and 1280x420: 15 cases, all OK. The tool
    rail and the properties panel are still open.
47. **Notes (10) and Library (9) still count over the seven-control
    ceiling** (`scratchpad/ui-sweeps/docks.js`), same as Graph did before
    this batch. Graph's fix (moving `#graph-view-picker` into its More menu)
    is not a decision this item can reuse for these two: graph.md section 3
    named its own two candidates for graph specifically, and named nothing
    for Notes or Library beyond the counts, so guessing which of their
    controls moves where is a design call, not a mechanical one (CLAUDE.md
    §2 rule 3 -- a missing decision is recorded, not remade). Both docks'
    inflated counts are partly an artefact of how `docks.js` counts, worth
    knowing before picking a fix: a native `<select>` is auto-enhanced into
    three counted elements (the select, its `.select-shell`, its
    `.select-opener`), and a `.seg` segmented control counts as one plus one
    per visible option, so Library's sort select and its two-button
    Cards/Rows segment alone are 6 of its 9, and Notes' sort select and its
    two-button Rows/Cards segment are 7 of its 10. Recommendation: before
    moving anything, decide in UI_MODERNISATION_PLAN Phase 8 whether the
    ceiling counts *controls a person reasons about* (a segmented view
    toggle is one decision, not three) or literal DOM elements as `docks.js`
    does today; if the latter stands, the same "into an existing menu"
    treatment graph got is available for Library's `#library-sort` (into
    Filter or More) and Notes' `#note-sort` (into a menu of its own), which
    would need one new decision line each rather than either being moved on
    a solo guess. Owner: UI_MODERNISATION_PLAN Phase 8.

### Performance on small laptops, measured 2026-09-08 23:30 UTC (Chromium, 1366x768, no GPU)

Numbers from `scratchpad/weight.js`: first load 6.7 MB over 71 requests
(uncompressed; the gzip layer is scoped to non-streaming API replies and
does not cover static files); unlock to ready 4.0s; idle traffic 4
requests a minute (was 14 in the audit); DOM 5,870 elements; JS heap 16 MB;
four blurred surfaces covering 32% of the viewport at rest; frame p95
16.7ms scrolling Notes. Script weight: app.js 1.6 MB, whiteboard.js 469 KB,
library.js 348 KB, documents.js 280 KB, graph.js 177 KB, all loaded at boot,
plus d3 and p5 vendored; 124 `backdrop-filter` rules across the CSS.

48. **Every module parses at boot, whichever tab opens.** Decision: load
    whiteboard.js, documents.js, library.js and graph.js on first use of
    their tab (a small loader in app.js, `tests/test_frontend_load_order.py`
    updated for the split; boot stays synchronous for app.js and the
    guards). Expected: the parse cost of about 1.3 MB of JavaScript leaves
    the startup path. Owner: Opus. Size M.
64. **Whiteboard properties panel, "needs a massive redesign and fix"**
    (three screenshots, 01:30): Copy style row, Guide colours (three swatch
    rows), then Group / Ungroup overlapping each other, an arrow button, the
    three align icons, two Space buttons and Extract notes "just chucked at
    the bottom". Owner: WHITEBOARD Phase 1 (properties panel), Opus.
    Decision: sections with a heading each (Style, Guides, Arrange, Notes);
    Arrange as one icon toolbar row on the dock recipe (align x3, distribute
    x2, group/ungroup as a pair) with tooltips, never label buttons that
    overlap; Extract notes as the section's one text button; measure that
    no two controls' rects intersect and the panel scrolls inside.
65. **Whiteboard panels "feel unrefined": the buttons look separate from
    the panels** (bottom tool bar, zoom pill, properties). Same fix as
    INBOX 52: one surface per panel, hairline dividers, no per-control
    background except the active tool. Owner: WHITEBOARD Phase 1.
56. **Library image cards, "really ugly"** (screenshot): thumbnail, file
    name, "Used in" chip, a Description bullet with Show more, a model chip,
    a "Text in this image" bullet with Show more, a "Read by ..." chip: six
    ranks of information at one weight, chips for provenance that read as
    actions. Owner: Opus, next slot, with INBOX 52 (whiteboard bottom bar).
    Recommendation: thumbnail with the file name on it; one line "Used in
    <chip>"; the description as one paragraph with a "More" toggle; the OCR
    text folded under a single "Text in this image" disclosure; provenance
    as one muted line at the foot ("Described by X, read by Y"), no chips.
52. **Whiteboard bottom bar: the tool groups "feel separate from the
    panels and not integrated"** (screenshot: seven pill groups with their
    own backgrounds and dividers inside one bar, and the zoom pill on the
    right in a different style). Owner: WHITEBOARD Phase 1 (bottom rail),
    with the mind map agent's whiteboard work merged first. Recommendation:
    one bar surface, groups separated by a hairline divider only, no
    per-group background; the zoom pill on the same recipe. Size S.

278. **Mid-work drop, 2026-09-20, verbatim (the owner), two screenshots.**
    "the rotate line and circle dont sit at the top center of a group
    selection in the whiteboard and instead sit off to the top left or
    right, or below the top border". Seen: a group of two boxes and a bar
    inside a circle, the rotate stem and knob at about a third of the box's
    width from the left and the knob inside the box's top edge; a group of a
    note card, an image card and a line, the stem rising from the top edge
    at x of one member's own centre rather than the group box's, and a
    second stem from a member card below. Owner: WHITEBOARD_PLAN (the group
    selection box, `wbBulkGroupBox` and the group's rotate handle in
    whiteboard.js). Recommendation: the group's rotate stem is drawn from
    the group box's own top-centre in board units after the box is fitted
    to every member's rotated bounds, and a member's own handles are hidden
    while it is part of a group selection; measured with a probe placing the
    knob at (box.x + box.w / 2, box.y - stem) at 0.5x, 1x and 2x, in
    `scratchpad/ui-sweeps/wbgroupguides.js`. **Fixed, 2026-09-20**, and the
    cause was one line narrower than the recipe guessed: the group's grip was
    already drawn from the group box's own top centre in board units (measured
    (340, 672) against a wanted (340, 672) at every zoom), but it never set a
    `transform-origin`. `.wb-sketch-rotate-handle` and
    `.wb-rotate-handle-stem` carry `scale(var(--wb-inv-zoom))` so a grip stays
    one size to the hand, and that rule keeps `transform-box` at its
    `view-box` default *because the drawing code sets the origin in board
    coordinates*, which `wbDrawSketchHandles` does for a single shape and the
    group path did not. The scale therefore resolved about the SVG view box's
    origin and multiplied the grip's own coordinates by `1 / k`: on screen the
    knob sat 170px right of the box's centre and below its top edge at 0.5x,
    340px left of it at 2x, and exactly right at 1x, which is the report's
    "top left or right, or below the top border" and why it looks intermittent.
    The anchor is set in `layoutGroupChrome`, so it follows a resize drag
    (measured mid-drag: box top 638, knob 612, the box's own top centre).
    The recipe's second half was also real and is done: a three-item group drew
    **four** rotate knobs, two stems and sixteen member resize handles, and now
    draws one knob, one stem and none; a member keeps its outline, so the
    earlier report this has to keep answering ("the shapes and lines arent
    selected visually and individually") still is. A card or a line selected on
    its own keeps all eight handles and its grip, measured.
    `scratchpad/ui-sweeps/wbgroupguides.js` carries the checks (0.5x, 1x, 2x,
    plus mid-resize), and `tests/test_ui_recipes.py` holds the ratchet: every
    grip scaled by `--wb-inv-zoom` sets its own anchor.

## Placed from INBOX, 2026-09-09 (the owner's evening batch)

- "can the whiteboard arrange tools be better structured??" (screenshot):
  ten icon-only buttons under one ARRANGE heading in a ragged 2-3-3-2 grid.
  Three labelled sub-rows (Group, Align, Distribute), three per row, each
  with a title and an aria-label.
- "the view dropdown is still overly short", and separately "on the
  mindmap, the view dropdown is even more visually broken". Both are the
  escaped-menu height, fixed on 2026-09-09 (`place()` now measures at
  `max-height: none` and caps against the room the trigger actually has).
  Retest both at 1440 and 820 before closing.
- Console, 2026-09-09: `POST /whiteboard/nodes` answered 422 with
  `entry_id: Input should be a valid integer, input: null`, and the app
  logged "Error creating node: {}". A node created with no backing entry
  sends null where the schema wants an int. Two halves: the schema should
  accept a node with no entry (a plain shape is not a note), and the
  client's error path should say what failed rather than print an empty
  object.

## Placed from INBOX, 2026-09-21

258. **Recommendation, not a change, 2026-09-19 (the session).** The
    reverted outside commit added right-drag to pan the board, filtered so
    a right-click still reaches a node's context menu
    (`wbZoomFilter`: `event.button === 2` on a target that is not
    `.node-card, .sketch-group, .wb-object`). It is a good gesture and
    every canvas app has it, but nobody asked for it and a new gesture on
    the surface that carries the app's only context menu is a decision, not
    a patch. Not built here on purpose (standing order 8: a new need is an
    entry, not an ad-hoc build).
    Recommendation: take it, guarded as above, plus `contextmenu` suppressed
    on the canvas only while such a drag actually moved (so a right *click*
    on empty canvas keeps whatever it does today), and measured against
    `scratchpad/ui-sweeps/wbpan.js`. The other two ideas from that commit,
    a rotated group outline and alignment guides for a group drag, are built
    (861e740, 5273bae).
    **Tried 2026-09-19 and taken back out, with what was learned.** The pan
    itself is four lines in `wbZoomFilter` (`event.button === 2` when
    `event.target` is not inside `.node-card, .sketch-group, .wb-object,
    .wb-map-edge-hit, [contenteditable]`, and the mousemove half gated on a
    flag the mousedown set) and measured clean: a right-drag moved the board
    150px, a right-click with no drag left the transform untouched.
    The half that matters could not be measured. Three things were found
    and are worth having written down:
    - The `contextmenu` that ends a right-drag over this board is dispatched
      at the `<section>` *around* it, not at anything inside it, so a
      listener scoped to `#whiteboard-container` never sees it and
      `event.target.closest("#library-view-whiteboard")` is null on it.
    - It is dispatched **before** `pointerup`, not after, so clearing the
      "this drag moved" flag on the release is safe and clearing it on a
      `setTimeout(0)` from the release is not.
    - With all of that accounted for, two runs of identical code disagreed
      about whether the menu was dispatched at all. Non-deterministic here,
      and the difference between "the gesture is polished" and "the gesture
      leaves a menu open on your board" is exactly that dispatch.
    So: not shipped. `scratchpad/ui-sweeps/wbrightpan.js` is the acceptance
    test, written first and failing, with the three facts above in its
    header. Whoever builds it makes that file pass on a board with a card on
    it, which is also the case this run could not cover.
    **Built and taken back out a second time, 2026-09-20, and this run found
    why. Two of the three facts above are wrong.** Measured with every event
    logged in the capture phase across a full right-drag:

        pointerdown@wb-svg-layer
        mousedown@wb-svg-layer
        contextmenu@wb-svg-layer      <- on the press
        pointerup@wb-svg-layer
        mouseup@wb-svg-layer
        auxclick@wb-svg-layer

    `contextmenu` arrives **on the press, before the drag has moved a pixel**,
    and at `#wb-svg-layer`, not at the `<section>`. So at the only moment the
    decision can be made, nothing can know whether the gesture will become a
    drag: "suppress the menu only when the drag moved" is not implementable,
    which is why both attempts left a menu open. The non-determinism recorded
    above did not reproduce: six runs across two attempts agreed every time,
    so it should not be planned around.
    The pan half measured clean again (0 to 150px, three runs identical), and
    a probe bug was fixed while there: the card's position was read at setup,
    before checks 1 and 2 pan the board, so check 3 pressed empty canvas and
    reported a 120px pan "on a card" that never touched one.
    **Recommendation, for the owner, because it is a decision and not a
    patch.** One shape works: suppress the native menu on the canvas outright
    and open the app's own pointer menu (`openMenuAtPoint`, which exists) in
    its place. A right-click then gives board actions instead of Chrome's
    menu, and a right-drag gives a clean pan. What goes in that menu is the
    open question, and assertion 2 of the acceptance test ("a right-click
    still opens whatever it opened before") changes with it.

276. **The sketch pad's toolbar wraps to two rows at 820 on Large text**, and
    has since before this session: `scratchpad/ui-sweeps/sketchbar.js` reports
    `rows=2` at 820/large-text (content 712 of an inner 714) and at
    820/large+spacious (688 of 690), while 820/default and 820/spacious are
    one row. The Canvas group is the one that drops. Found while giving the
    ink dots a finger-sized target (the same sweep), not caused by it: the
    dots only change below 820. Recommendation: the bar is five groups and
    Large text buys their labels about 10px each, so the cheapest honest fix
    is the group labels, not the controls: hide `.wb-tool-section-label`
    below 1024 the way the phone band already hides other labels, and
    re-measure; it is worth about 60px, which is more than the 2px the wrap
    is short by. Owner: whoever next opens the pad's bar.
    **Re-measured 2026-10-04, and the recommendation would buy nothing.** The
    labels sit *above* their rows (a section is a column), and every label is
    narrower than its row at 820 on Large text (Draw 37 over 104, Shapes 52
    over 176, Ink 22 over 153, Size 29 over 97, Canvas 51 over 176), so hiding
    them takes height, not width. The rows alone are 706px plus four 4.5px
    separators, 724px, in a 705px inner bar: 19px short, still `rows=2` in
    `sketchbar.js`. The width is in the rows: the Ink dots' gaps (6 x 5px at
    Large text) and the Size slider's fixed 3rem are the two places with
    room. **Half done the same day**: between 600 and 1023px the dots drop
    their gap (a dot's own 2px transparent ring keeps the discs 4px apart), and
    820 on Large text is one row (`sketchbar.js` 2 findings to 1; 1024 and
    1440 unchanged). **Still open: 820 on Large text with Spacious density**,
    41px short (rows 701px plus four 6px separators in a 684px inner bar), more
    than the slider (about 9px) and the separators (24px) could give together.
    Recommendation: let that one combination take two rows, and say so in the
    sweep, rather than shrink 44px targets.

## Placed from INBOX, 2026-09-23

- **The small conventions every canvas user takes for granted.** The owner,
  verbatim: "I cant do things on the whiteboard and mindmap like double clcike
  the rotate point above the top centre of an object and reset it to its
  default rotate. the whiteboard and mindmap are still missing a lot of those
  small features that we as user's use all the time and take for granted but
  very much notice when they arent there." Then: "same with the documents and
  other app features." One pass per surface, whiteboard and map first (with
  the map UX remainder), then documents, notes, chat and the Library: list
  what a Figma, Miro, tldraw, Google Docs or VS Code user expects
  (double-click a handle to reset it, Alt-drag to duplicate, Shift to
  constrain, arrow-key nudge, Escape to cancel a gesture, Ctrl+D, Ctrl+A in
  scope, triple-click a paragraph, and so on), measure which are missing in
  the running app, build them. Decision, taken: the missing ones are built
  without asking; a convention the app breaks on purpose keeps its reason
  written next to it.
  **The whiteboard and map half is built**: the checklist, with before and
  after for each convention, is `agent-remaining/mapux2.md` (agent M,
  `canvasconventions.js` 54/54). Its one row left, Escape during a marquee or
  lasso, was measured 2026-09-23 and was wrong: it took the rectangle away
  and then cleared the selection as well, and the release's click cleared
  it again. Escape now takes back the drag and nothing else, and the rest of
  the drag selects nothing (`wbmarqueeescape.js`, new, 8/8, 4/8 before).
  With a board menu open, Escape closes the menu and keeps the selection
  (INBOX 396). **Open:** the same pass on documents, notes, chat and the
  Library.

## Placed from INBOX, 2026-09-25

419. **The owner, 2026-09-24, verbatim.** "in the whiteboard, the arrange
    dropdown menu appears above the top bar, cutting off the contents" (only
    the Order rows showed) and "clicking the meatball button on the popup
    tools menu when selected on a text box or sticky note on the whiteboard
    doesnt show any dropdown menu, or it flickers for a seck somewhere to the
    right then disappears". **Not reproduced** in headless Chromium, on the
    head after `ccd1b48`: Arrange opens under its button at 1440x900,
    1184x760, 1366x600, 1280x480, 1024x768, 947x608, 820x700, 700x900, in
    full screen, with touch, at 125% scale with real scrollbars, dark
    (`wbmenuroom.js` 36/36); the context bar's ⋯ opens beside the bar and
    stays for a sticky and a text box, selected or being edited, by click
    or tap, after a render, a state fetch, a resize, and with the pointer
    wandering over the canvas and onto the menu. Every placement path read
    (`placeEscapedMenu`, `wbKeepMenuBesideBar`) can only put Arrange above
    its button when the window has less room below than above, which the top
    bar never has. Both reports come from the desktop window (WebView2); the
    next step needs the owner: the window size, whether the top bar was
    dragged, and a screen recording of the ⋯ case. Recommendation: ask.
    **Tried again 2026-09-26, with real scrollbars and a Windows laptop's
    scale** (`SCROLLBARS=1`, `deviceScaleFactor` 1.25), and still not
    reproduced. `wbmenuroom.js` now takes `DSF`: 87/87 at 1440x900,
    1184x760, 1366x600, 1280x480 and 1024x768, and 36/36 at 1536x864 and
    1536x800 (a 1920x1080 screen at 125%). The flicker is a thing over time,
    which no probe had read, so `wbmoreflicker.js` (new) samples the ⋯ menu
    every 40ms for 1.6s after a real click, for a sticky and a text box,
    each selected and each being edited, with the pointer resting and then
    moving toward the menu: open, on top, inside the window and within 1px
    of where it opened in every sample, 48/48 at 1440x900, 1184x760 and
    1280x640 and 32/32 at the two 1536 sizes. The recommendation stands.

## Placed from INBOX, 2026-09-27

411. **The owner, 2026-09-24, verbatim, with the board export dialog and
    two lightbox screenshots.** "is there a way to better design all
    instances of these menu bar elements in popups and the like?? I think
    there's a better way to visualise them?? also I exported a mindmap
    selection as an image to the library, the mindmap nodes turned white??
    also the description that was auto generated said it was typed by hand
    in the lightbox when it was autogenerated, and the image clashes with
    the side left and right arrow buttons on the lightbox" Placed: choice
    controls, orchestrator (the radio form joins the flat looks' neutral
    selection; more than four choices in a dialog become option tiles,
    first on the board export); the export colours, the caption's source
    and the lightbox arrows, the map agent.

## Placed from INBOX, 2026-10-05

The features audit (scratchpad/audit1005/features.md) holds the draw.io
catalogue, the library spec and the phased briefs these become.

557. **The owner, 2026-10-05, three asks, verbatim.** "should there be a popup
     hover subtle faded lick icon on locked elements or smth on the
     whiteboard or nah??"; "what about whiteboard layers and a layers
     panel?"; "maybe an object library??"
     Recommendations given:
     - (a) A faded lock fades in at a locked item's corner on hover, found
       by a board-level hit test since the item takes no pointer
       (decision 15). A press on one pulses it and hints once:
       "Locked. Right-click to unlock".
     - (b) A Layers tab: the board as a tree (frames, then groups, then
       items) in z-order, each row with show/hide, lock and rename; a press
       selects and zooms, a drag restacks. One new field (`hidden`). Named
       Draw.io layers are phase 2 (BACKLOG 29c). It also lifts ink's fixed
       place under cards.
     - (c) A Library tab beside it: built-in shapes, frames and the vendored
       icon set, plus "Save to library" for any selection (items, relative
       positions, links, a thumbnail) in a small table, usable on any
       board. Board templates (BACKLOG 4b) become saving a whole board to
       it. Mind maps get saved branches.
     Placed: into the whiteboard briefs after the features audit
     (scratchpad/audit1005/features.md).

558. **The owner, 2026-10-05, verbatim.** "I think an object or elements
     library would be really good like with what draw.io has. I want more
     whiteboard features, take everything from draw.io as it is sooooo
     useful and nifty. also improve the usability and reliablility of the
     mindmap. make them features people can actually use and use well.
     redesign the controls and how they can be used and accessed where
     needed to maximise usability, utility, accessibility, and
     learnability" Placed: the features audit is now writing the full
     draw.io catalogue, the library spec, a controls redesign for board and
     map, and a mind map usability pass, as phased briefs. Each phase then
     goes to one Opus agent, its decisions entered in WHITEBOARD_PLAN and
     MINDMAP_PLAN.
     Then (verbatim): "also the ability to save custom elements and stuff as
     well": saved selections, custom shapes drawn on the board, saved styles
     and palettes, sticky/card/topic presets, saved branches, and whole
     boards as templates, all in the library's "Yours", importable and
     exportable.

## Placed from INBOX, 2026-10-05 (OPEN.md triage)

- **`contrast.js` never visits a board or a map** (documents was added
  2026-10-04). Brief: add `whiteboard` and `mindmap` to its `TABS` with a seeded
  board (cards, stickies, a frame, shapes) and a seeded map, run at 1440 and
  390 in both themes, fix what it finds one surface per commit. Expect
  pre-existing findings; a session of its own. Opus, M.

## Placed from INBOX, 2026-10-05 (boardmap-1005)

Held by the boardmap-1005 agent; the built halves are in HISTORY.md
("Moved from the plans, 2026-10-05 (boardmap-1005)"). Open:

- INBOX 596, the rest: "some skeleton loaders are missing like on the
  dashboard" (not placed against a surface yet: the board's Library and
  Notes tabs draw nothing while they load), and the side-docked tool column's
  own layout (rows of one to four controls, centred; 173px wide on a board
  and 225px on a map, where the layout select sets the width). At phone
  width the open sidebar is a sheet over the board and covers the side
  dock's collapsed picker (7,554px², the same on the base).
- INBOX 608, the lists: built (`DRAG_EDGE` in `frontend/js/selection.js`; the
  browser's own autoscroll covers the last 20px, this the next 36;
  `ui-sweeps/s2-1005.js` MODE=listedge).
