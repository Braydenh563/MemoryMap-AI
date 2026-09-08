# The whiteboard: controls that belong together, tools that behave

**Status: written by Fable by direct instruction ("the whiteboard panels
and tools need a better modern redesign still, this is horrendous"; "the
whiteboard control elements dont have that joined and cohesive feel"),
from the owner's screenshots and the code. Executed after
DOCUMENTS_PLAN.md and before MINDMAP_PLAN Phases 4 to 5, which build on
the same canvas.**

Back to [../ROADMAP.md](../ROADMAP.md).

## 1. What exists (checked in the code)

`frontend/whiteboard.js` (9,767 lines) draws an infinite dotted canvas with
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
8. **Keys** (also in tooltips and help): V select, H pan, L lasso, P pen,
   M marker, E eraser, N sticky, T text, I image, C connector, A arrow,
   R rectangle, O ellipse, Delete, Ctrl+D duplicate, Ctrl+G group,
   Ctrl+Shift+G ungroup, arrows nudge 1px (Shift 10px), + / - / 0 zoom,
   F fit selection, Escape deselect. Same as the graph where they overlap.
9. **Mind map root placement**: new root centred in the visible canvas,
   below the top bar's inset; edges are re-drawn from the node model on
   every drag frame (the marquee fix must not have detached them; add the
   sweep check that a dragged node's edge endpoint moves with it).

## 5. Phases

### Phase 1: the rail and the keys (half a session)
`.wb-rail` markup and CSS on the tokens; tooltips with keys; the ink
swatch; the key map wired through the app's KEYMAP table (Brief 2).
**Gate:** `scratchpad/ui-sweeps/whiteboard.js` (new): every tool has a
tooltip naming a key; pressing each key selects that tool; the rail is
one panel with one control height; no tool button has its own border.

### Phase 2: the context bar (one session)
Kind → controls table; the bar above the selection; the eleven arrange
actions; the "..." popover; the properties panel and selection bar
removed. **Gate:** select one of each kind and assert the bar shows only
that kind's controls; align-centre and distribute-gaps move objects as
expected (measured positions); caps read from the object.

### Phase 3: export dialog, handles, highlighter (half a session)
**Gate:** the export dialog is inside the viewport at 1440 and 390 and
every scope × format pair produces a file (PNG dimensions asserted);
handles identical for note, shape, image and text (rect and handle
count); the highlighter stroke composites (pixel sampled under overlap).

### Phase 4: mind map regressions and Tidy (half a session, with
MINDMAP_PLAN Phases 4 to 5)
Root placement; edges follow drags; Tidy measured with 30 nodes (no
overlaps, measured bounding boxes). Then the mindmap phases.

## 6. Consistency rules

Tokens only; the rail and the context bar are the same `.panel` surface
the docks use; buttons are the six recipes of WORLD_CLASS_PLAN §1.2; menus
are the one menu recipe; dialogs the modal recipe; keys in KEYMAP.

## 7. Not verified until built

Touch: the rail's long-press flyout on a tablet; pen pressure for the
marker; whether the context bar should pin to the top of the canvas on a
phone instead of floating (measure both at 390).
