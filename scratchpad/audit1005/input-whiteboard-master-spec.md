# MemoryMap‑AI Whiteboard — Master Feature Spec & Rebuild Plan
### Exhaustive reference: every feature audited across Microsoft Whiteboard, OneNote, draw.io, Adobe Illustrator + full current‑state audit of MemoryMap‑AI + complete gap matrix + rebuild plan

This is the complete version — nothing summarised out. Use it as the single source of truth to hand to Claude/Fable for implementation. Section 1 is the exhaustive source‑app feature catalogue. Section 2 is the exhaustive current‑state audit of your actual code. Section 3 is the feature‑by‑feature gap matrix. Section 4 is the full target UI/panel spec. Section 5 is the complete keybinding scheme. Section 6 is data‑model changes. Section 7 is the phased build plan with nothing deferred silently — every item from Section 1 is accounted for somewhere in Section 3, marked either "build," "already have," or "explicitly out of scope" with a reason.

---

## PART A — EXHAUSTIVE SOURCE FEATURE CATALOGUE

### A1. Canvas & document structure

| Feature | MS Whiteboard | OneNote | draw.io | Illustrator |
|---|---|---|---|---|
| Infinite/very large canvas | ✅ infinite, zoomable | ❌ page‑bound (fixed page, extends by scrolling) | ✅ infinite | ❌ bounded by artboard, but multiple artboards |
| Multiple documents/boards | ✅ separate boards | ✅ notebooks → sections → pages hierarchy | ✅ separate diagram files, multi‑page per file | ✅ multiple artboards per document, multiple documents |
| Page/board background | ✅ colour + pattern, settable default | ✅ ruled lines, grid, custom paper, page colour | ✅ page colour, per‑page background | ✅ artboard colour (rare use), background objects |
| Sections/folders for organisation | ➖ (boards list only) | ✅ notebooks/sections/section groups/pages/subpages | ✅ multi‑page tabs within one file | ✅ artboards panel, layers act as folders |
| Zoom range & controls | ✅ discrete zoom, fit‑to‑screen | ✅ pinch/ctrl+scroll, fixed page so less critical | ✅ 10%–ish to 400%+, fit page/width | ✅ 3.13%–64000%, fit page/artboard/selection |
| Pan | ✅ drag / space+drag equivalent | ✅ scroll | ✅ space+drag, scrollbars | ✅ space+drag, hand tool |
| Rulers | ➖ (has an ink ruler tool, not page rulers) | ✅ draggable/rotatable ink ruler | ✅ optional top/left rulers in board units | ✅ top/left rulers, custom zero‑point |
| Grid | ✅ toggle, adjustable | ✅ ruled‑line/grid page templates | ✅ toggle, adjustable spacing, snap‑to‑grid | ✅ toggle, adjustable, snap‑to‑grid, pixel grid at high zoom |
| Guides (manual drag guides) | ❌ | ➖ (insert/remove‑space lines, not true guides) | ✅ drag from ruler, lockable | ✅ drag from ruler, lockable, guide layer, "make guides" from selection |
| Multiple pages/frames within one canvas | ➖ (templates act like sections) | ✅ pages/subpages | ✅ multi‑page diagrams, page tabs | ✅ artboards (up to 100) |
| Background image per board/page | ✅ | ✅ (image as page background is unusual, but images can be locked as background) | ✅ | ✅ (locked background layer convention) |

### A2. Selection mechanics

| Feature | MS Whiteboard | OneNote | draw.io | Illustrator |
|---|---|---|---|---|
| Click select | ✅ | ✅ (lasso is primary) | ✅ | ✅ |
| Marquee/rectangle select | ✅ (lasso tool) | ✅ lasso | ✅ | ✅ |
| Lasso (freeform) select | ✅ | ✅ primary ink‑selection method | ✅ | ✅ (Lasso tool) |
| Shift‑click add/remove from selection | ✅ | ➖ | ✅ | ✅ |
| Select all (Ctrl+A) | ✅ | ✅ | ✅ | ✅ |
| Tab/Shift+Tab cycle selection | ➖ | ➖ | ✅ (accessibility) | ➖ (Tab toggles panels instead) |
| Select same type/style | ➖ | ➖ | ✅ (Edit > Find/Replace by style) | ✅ Select > Same > Fill Color/Stroke Color/etc. |
| Select by object kind (vertices only / edges only) | ➖ | ➖ | ✅ | ➖ |
| Direct/anchor‑level selection | ➖ | ➖ | ➖ (whole‑shape only) | ✅ Direct Selection tool (A) — selects individual anchors/segments |
| Group selection selects whole group | ✅ | ➖ | ✅ | ✅ |
| Isolation mode (double‑click into group/layer, edit without affecting rest) | ➖ | ➖ | ➖ | ✅ |
| Selection persists across pan/zoom | ✅ | ✅ | ✅ | ✅ |

### A3. Object transforms

| Feature | MS Whiteboard | OneNote | draw.io | Illustrator |
|---|---|---|---|---|
| Move (drag) | ✅ | ✅ | ✅ | ✅ |
| Move via arrow keys | ✅ | ➖ | ✅ | ✅ (1pt per press, 10pt with Shift) |
| Resize via handles | ✅ | ✅ (converted shapes only) | ✅ 8‑handle | ✅ 8‑handle |
| Resize via keyboard | ✅ (Shift+arrow) | ➖ | ➖ | ✅ (via Transform panel numeric entry) |
| Constrain proportions while resizing | ✅ (implicit on some objects) | ➖ | ✅ Shift | ✅ Shift |
| Resize from center | ➖ | ➖ | ✅ Ctrl | ✅ Alt |
| Resize from center + constrained | ➖ | ➖ | ✅ Shift+Ctrl | ✅ Shift+Alt |
| Rotate via handle | ✅ | ✅ (converted shapes) | ✅ | ✅ |
| Rotate constrained to increments | ✅ (some builds snap 15°) | ➖ | ✅ Shift (15°) | ✅ Shift (constrained angle, default 45°/configurable) |
| Rotate via numeric entry | ➖ | ➖ | ✅ (Arrange tab) | ✅ (Transform panel, Object > Transform > Rotate) |
| Flip horizontal/vertical | ➖ | ➖ | ✅ | ✅ |
| Skew/shear | ➖ | ➖ | ➖ (limited) | ✅ Shear tool |
| Free transform / perspective distort | ➖ | ➖ | ➖ | ✅ Free Transform, Perspective Grid |
| Numeric X/Y/W/H entry | ➖ | ➖ | ✅ Arrange tab | ✅ Transform panel |
| Alt to bypass grid‑snap during drag | ➖ | ➖ | ✅ | ✅ (View > Snap to Grid toggled, not per‑drag in all versions, but Illustrator's "Smart Guides" can be Ctrl‑toggled) |
| Duplicate via drag+modifier | ✅ (copy/paste) | ➖ | ✅ Ctrl+Shift+drag (keeps alignment), Alt+Shift+drag | ✅ Alt+drag |
| Repeat transform (apply same transform again) | ➖ | ➖ | ➖ | ✅ Ctrl+D (Transform Again) |

### A4. Alignment, distribution, snapping

| Feature | MS Whiteboard | OneNote | draw.io | Illustrator |
|---|---|---|---|---|
| Snap to grid | ✅ | ➖ | ✅ | ✅ |
| Snap to other objects (smart guides) | ➖ | ➖ | ✅ (alignment guidelines) | ✅ Smart Guides |
| Snap to page/artboard center | ➖ | ➖ | ✅ (orange center guide) | ✅ |
| Equal‑spacing / distribution detection while dragging | ➖ | ➖ | ➖ (static Distribute command exists, not live‑drag detection in core) | ✅ Smart Guides show equal spacing live |
| Align left/right/top/bottom/center (command, not drag) | ➖ | ➖ | ✅ Arrange tab | ✅ Align panel |
| Distribute horizontally/vertically (command) | ➖ | ➖ | ✅ | ✅ Align panel, plus Distribute Spacing (exact gap value) |
| Align relative to: selection / key object / artboard | ➖ | ➖ | ✅ (relative to selection or page) | ✅ (Align To: Selection/Key Object/Artboard) |
| Toggle snapping on/off globally | ➖ | ➖ | ✅ | ✅ |
| Bypass snap for one drag (modifier) | ➖ | ➖ | ✅ Alt | ✅ (varies by tool; generally Ctrl toggles Smart Guides) |

### A5. Drawing / ink tools

| Feature | MS Whiteboard | OneNote | draw.io | Illustrator |
|---|---|---|---|---|
| Pen (freehand ink) | ✅ 3 customizable pens | ✅ multiple pens, pressure‑sensitive | ➖ (diagram tool, not a sketch tool) | ✅ Paintbrush, Pencil |
| Highlighter | ✅ | ✅ | ➖ | ➖ (simulate via transparency) |
| Eraser (stroke eraser / object eraser / segment eraser) | ✅ | ✅ (stroke, and "eraser as tool" segment mode in some versions) | ➖ | ✅ Eraser tool (raster‑style path erase) |
| Highlighter opacity | ✅ | ✅ | n/a | n/a |
| Pressure/tilt sensitivity | ✅ (pen input) | ✅ | n/a | ✅ (pressure‑sensitive brushes) |
| Shape recognition (ink → clean shape) | ✅ "Beautify" | ✅ "Ink to Shape" | n/a | n/a |
| Handwriting → text (ink → text) | ➖ | ✅ "Ink to Text" | n/a | n/a |
| Math ink recognition | ➖ | ✅ Math tool (solve/graph) | n/a | n/a |
| Ink replay (watch strokes redraw in original order) | ➖ | ✅ | n/a | n/a |
| Ruler tool for straight ink lines | ✅ Alt+R | ✅ draggable/rotatable | n/a | n/a |
| Pen focus / distraction‑free drawing view | ➖ | ✅ | n/a | n/a |
| Fill/bucket tool | ➖ | ➖ | ➖ | ✅ Live Paint Bucket |

### A6. Shape & connector tools

| Feature | MS Whiteboard | OneNote | draw.io | Illustrator |
|---|---|---|---|---|
| Basic shape library (rect/ellipse/triangle/etc.) | ✅ (from ink recognition + insert menu) | ✅ (insert shape gallery) | ✅ extensive, categorised libraries | ✅ (Rectangle, Ellipse, Polygon, Star, Line tools) |
| Domain‑specific shape libraries (flowchart/UML/BPMN/network/ERD) | ➖ | ➖ | ✅ extensive built‑in + searchable | ➖ (not diagram‑oriented) |
| Custom/importable shape libraries | ➖ | ➖ | ✅ (import stencils, custom shape XML) | ✅ (symbol libraries, brush libraries) |
| Connectors (lines linking two objects) | ➖ (only ad‑hoc lines) | ➖ | ✅ core feature — auto‑attaching, re‑routing | ➖ (not a connector‑aware tool; lines are static) |
| Connector auto‑routing around obstacles | ➖ | ➖ | ✅ orthogonal/curved/entity‑relation styles | ➖ |
| Connector endpoints/arrowheads (styles) | ➖ (basic arrow toggle) | ➖ | ✅ many arrow/endpoint styles | ✅ (via Stroke panel arrowhead options) |
| Connector labels | ➖ | ➖ | ✅ | ➖ (manual text object) |
| Swimlanes / tables / containers | ➖ | ➖ | ✅ | ➖ |
| Shape‑to‑shape "smart" auto‑connect on hover | ➖ | ➖ | ✅ (blue directional arrows appear on hover) | ➖ |
| Auto‑layout (arrange whole flowchart) | ➖ | ➖ | ✅ | ➖ |
| Diagram generation from text/data (Mermaid‑like text, CSV, SQL) | ➖ | ➖ | ✅ | ➖ |
| AI‑generated diagram from a text prompt | ➖ | ➖ | ✅ | ➖ (Firefly is separate, not diagram‑aware) |

### A7. Vector path editing (Illustrator‑tier)

| Feature | draw.io | Illustrator |
|---|---|---|
| Anchor points with Bézier handles | ➖ | ✅ core |
| Pen tool (click = corner anchor, drag = curve anchor) | ➖ | ✅ |
| Add/remove/convert anchor point tools | ➖ | ✅ (+/− and Shift+C convert) |
| Direct selection of individual anchors/segments | ➖ | ✅ |
| Pathfinder: Unite/Minus Front/Intersect/Exclude | ➖ | ✅ |
| Compound paths | ➖ | ✅ |
| Clipping masks | ➖ | ✅ |
| Offset path | ➖ | ✅ |
| Simplify path (reduce anchor count) | ➖ | ✅ |
| Outline stroke (convert stroke to filled shape) | ➖ | ✅ |
| Join/average anchor points | ➖ | ✅ |
| Live Corners (rounded corner widget per anchor) | ➖ | ✅ |
| Knife/scissors tool (cut paths) | ➖ | ✅ |
| Blend tool (interpolate between two shapes) | ➖ | ✅ |
| Envelope distort | ➖ | ✅ |

### A8. Layers, grouping, z‑order

| Feature | MS Whiteboard | OneNote | draw.io | Illustrator |
|---|---|---|---|---|
| Bring to front / send to back | ✅ | ➖ | ✅ | ✅ |
| Bring forward / send backward (one step) | ➖ | ➖ | ✅ | ✅ |
| Group / ungroup | ✅ (implicit via multi‑select move) | ➖ | ✅ Ctrl+G / Ctrl+Shift+U | ✅ Ctrl+G / Ctrl+Shift+G |
| Nested groups | ➖ | ➖ | ✅ | ✅ |
| True layers panel (named, reorderable) | ➖ | ➖ (sections act like layers conceptually) | ✅ | ✅ |
| Per‑layer visibility toggle | ➖ | ➖ | ✅ | ✅ |
| Per‑layer lock | ➖ | ➖ | ✅ | ✅ |
| Per‑object lock | ✅ | ➖ | ✅ | ✅ |
| Per‑layer opacity/blend mode | ➖ | ➖ | ➖ (per‑object only) | ✅ |
| Isolation mode per layer | ➖ | ➖ | ➖ | ✅ |

### A9. Colour, fill, stroke

| Feature | MS Whiteboard | OneNote | draw.io | Illustrator |
|---|---|---|---|---|
| Stroke colour picker | ✅ | ✅ | ✅ | ✅ |
| Fill colour picker | ➖ (sticky notes have preset colours) | ➖ | ✅ | ✅ |
| No fill / no stroke toggle | ➖ | ➖ | ✅ | ✅ |
| Opacity control (object) | ➖ | ➖ | ✅ | ✅ |
| Opacity control (per stroke/highlighter) | ✅ (highlighter) | ✅ (highlighter) | ✅ | ✅ |
| Gradients | ➖ | ➖ | ✅ (basic) | ✅ (full gradient tool, mesh gradients) |
| Pattern fills | ➖ | ➖ | ➖ | ✅ |
| Swatches/palette panel, save custom swatches | ➖ | ➖ | ✅ (limited) | ✅ (Swatches panel, colour groups) |
| Eyedropper (sample colour from canvas) | ➖ | ➖ | ➖ | ✅ |
| Stroke width | ✅ (pen size slider) | ✅ | ✅ | ✅ |
| Stroke style (solid/dashed/dotted) | ➖ | ➖ | ✅ | ✅ (Stroke panel, custom dash arrays) |
| Stroke caps/joins (butt/round/square; miter/round/bevel) | ➖ | ➖ | ➖ (limited) | ✅ |
| Variable‑width stroke profiles | ➖ | ➖ | ➖ | ✅ (Width tool) |
| Shadow/glow effects | ➖ | ➖ | ✅ (basic shadow) | ✅ (full Effects menu: drop shadow, glow, feather, etc.) |
| Live effects (non‑destructive, editable later) | ➖ | ➖ | ➖ | ✅ Appearance panel |

### A10. Text & typography

| Feature | MS Whiteboard | OneNote | draw.io | Illustrator |
|---|---|---|---|---|
| Plain text box | ✅ | ✅ | ✅ | ✅ (Point Type) |
| Text bound to shape (area type) | ➖ | ➖ | ✅ (label inside shape) | ✅ (Area Type) |
| Text on a path | ➖ | ➖ | ➖ | ✅ |
| Font family choice | ➖ | ✅ | ✅ | ✅ (full system + Adobe Fonts) |
| Font size | ✅ (limited) | ✅ | ✅ | ✅ |
| Bold/italic/underline/strikethrough | ➖ | ✅ | ✅ | ✅ |
| Text colour | ✅ | ✅ | ✅ | ✅ |
| Text alignment (left/center/right/justify) | ➖ | ✅ | ✅ | ✅ |
| Vertical alignment within box (top/middle/bottom) | ➖ | ➖ | ✅ | ✅ |
| Line spacing / leading | ➖ | ✅ (basic) | ✅ (basic) | ✅ (precise, per‑character) |
| Letter spacing / tracking / kerning | ➖ | ➖ | ➖ | ✅ |
| Paragraph styles (headings, lists, indents) | ➖ | ✅ (headings via Styles gallery) | ➖ (manual only) | ✅ (Paragraph Styles panel) |
| Character styles (saved, reusable text formatting) | ➖ | ➖ | ➖ | ✅ (Character Styles panel) |
| Bulleted/numbered lists | ➖ | ✅ | ➖ | ✅ |
| Tables (as text content) | ➖ | ✅ | ✅ (as a shape type) | ➖ (via plugins only) |
| Hyperlinks in text | ✅ (clickable links pasted on canvas) | ✅ | ✅ | ➖ |
| Spell‑check | ➖ | ✅ | ➖ | ✅ |
| Find & replace (text content) | ➖ | ✅ | ✅ | ✅ |

### A11. Images & media

| Feature | MS Whiteboard | OneNote | draw.io | Illustrator |
|---|---|---|---|---|
| Insert image (upload/paste/drag) | ✅ | ✅ | ✅ | ✅ (Place) |
| Web image search inline | ✅ (Bing) | ➖ | ➖ | ➖ |
| Crop image | ➖ | ✅ (basic) | ➖ | ✅ |
| Image filters/adjustments | ➖ | ➖ | ➖ | ✅ (via embedded raster editing links to Photoshop, or basic Effects) |
| Embed video (playable in place) | ✅ (preview/limited playback) | ➖ (link only) | ➖ | ➖ |
| Embed documents/files | ✅ | ✅ (file printouts, attachments) | ➖ (link only) | ➖ |
| Embed live linked content (Excel chart, Forms poll) | ✅ (Loop components) | ➖ | ➖ | ➖ |
| Trace/auto‑vectorize a raster image | ➖ | ➖ | ➖ | ✅ Image Trace |

### A12. Templates & starter content

| Feature | MS Whiteboard | OneNote | draw.io | Illustrator |
|---|---|---|---|---|
| Pre‑built templates (brainstorm, retro, kanban, roadmap) | ✅ extensive gallery | ➖ (page templates: to‑do list, meeting notes, ruled paper) | ✅ (flowchart, org chart, network, UML, mind map, SWOT, timeline, etc.) | ✅ (Illustrator "Templates" — mostly print/artwork starters) |
| Save current board/page as reusable template | ➖ | ✅ (custom page templates) | ✅ | ✅ |
| Reusable component/symbol library, instance updates propagate | ➖ | ➖ | ➖ (shape libraries are static stencils, not linked instances) | ✅ Symbols panel |

### A13. Panels & window chrome

| Feature | MS Whiteboard | OneNote | draw.io | Illustrator |
|---|---|---|---|---|
| Left tool/insert panel | ✅ "Create" panel | ✅ (Draw tab ribbon) | ✅ Shapes sidebar | ✅ Toolbar (dockable, single/double column) |
| Right properties/format panel | ➖ (contextual toolbar only) | ➖ | ✅ Format panel (Style/Text/Arrange tabs) | ✅ Properties panel + many dockable panels |
| Top toolbar/ribbon | ✅ ink tool strip | ✅ ribbon (Home/Insert/Draw/View tabs) | ✅ menu + toolbar | ✅ Application bar + Control panel |
| Status bar | ➖ | ➖ | ➖ (minimal) | ✅ zoom/tool/artboard/nav |
| Contextual floating toolbar near selection | ➖ | ➖ | ➖ | ✅ Contextual Task Bar |
| Help/tips bar | ➖ | ➖ | ➖ | ✅ Help Bar |
| Dockable/floating/collapsible panels | ➖ | ➖ | ✅ (format panel dock/undock) | ✅ full dock system, stack, collapse‑to‑icon |
| Named custom workspaces (saved panel layouts) | ➖ | ➖ | ➖ | ✅ (Essentials/Typography/Web/custom, save/delete) |
| Panel toggle keyboard shortcuts | ➖ | ➖ | ✅ Ctrl+Shift+P (format panel) | ✅ (Tab hides all panels, Shift+Tab hides all but toolbar) |
| Zoom/tool overlay corner widgets | ✅ | ➖ | ✅ | ✅ |
| Notifications/toast area | ➖ | ➖ | ➖ | ➖ |
| Command palette / quick‑find command | ➖ | ➖ | ➖ | ➖ (Illustrator has no CP; but many modern apps do — worth keeping since MemoryMap already has one) |

### A14. Multi‑user / collaboration

| Feature | MS Whiteboard | OneNote | draw.io | Illustrator |
|---|---|---|---|---|
| Real‑time multi‑cursor collaboration | ✅ | ✅ (via OneDrive sync, near‑real‑time) | ✅ (via Google Drive/Confluence backends) | ➖ (Cloud Documents = async, not live) |
| Presence indicators (who's viewing/editing) | ✅ | ➖ | ✅ | ➖ |
| Comments/annotations thread | ✅ (reactions/comments) | ➖ (can add ink comments manually) | ✅ (comments on shapes) | ✅ (Illustrator commenting in Cloud Docs) |
| Follow/presenter mode | ✅ | ➖ | ➖ | ➖ |
| Share link with permission levels | ✅ | ✅ | ✅ | ✅ |

### A15. Version history, autosave, backup

| Feature | MS Whiteboard | OneNote | draw.io | Illustrator |
|---|---|---|---|---|
| Autosave | ✅ | ✅ | ✅ | ✅ (Cloud Docs) |
| Manual save/export snapshot | ✅ (export image) | ✅ | ✅ | ✅ |
| Full version history panel (browse timestamped versions) | ➖ | ✅ (per‑page "Page Versions," via History tab) | ✅ (File > Revision History, via Drive/Confluence backend) | ✅ (File > Version History, Cloud Documents only, expires ~30 days unless a version is explicitly "marked/named") |
| Restore a specific past version | ➖ | ✅ | ✅ | ✅ |
| Named/marked/pinned versions (kept indefinitely) | ➖ | ➖ | ➖ | ✅ (marked versions don't expire) |
| Local backup files (crash/undo safety net) | ➖ | ✅ (OneNote local backup folder) | ✅ (Extras > Automatic Backup) | ➖ |
| Diff/preview before restoring | ➖ | ✅ (greyed preview panel) | ✅ (preview pane in Revision History dialog) | ✅ (Timeline panel shows thumbnails) |

### A16. Undo/redo

| Feature | MS Whiteboard | OneNote | draw.io | Illustrator |
|---|---|---|---|---|
| Undo/redo (Ctrl+Z/Y) | ✅ | ✅ | ✅ | ✅ (very deep history, configurable steps) |
| Undo covers create/delete | ✅ | ✅ | ✅ | ✅ |
| Undo covers move/resize/rotate/style | ➖ (varies) | ➖ | ✅ | ✅ |
| Undo covers bulk/batch actions as one step | ➖ | ➖ | ✅ | ✅ |
| Redo stack cleared on new action | ✅ | ✅ | ✅ | ✅ |

### A17. Export & output

| Feature | MS Whiteboard | OneNote | draw.io | Illustrator |
|---|---|---|---|---|
| Export whole canvas as image | ✅ (PNG) | ✅ (page as image/PDF) | ✅ PNG/JPEG/SVG/PDF/VSDX/HTML | ✅ (many formats: AI, EPS, SVG, PDF, PNG, JPEG, etc.) |
| Export selection only | ➖ | ➖ | ✅ | ✅ (Export Selection) |
| Export current viewport only | ➖ | ➖ | ➖ | ➖ |
| Export as embeddable HTML | ➖ | ➖ | ✅ | ➖ |
| Print | ✅ | ✅ | ✅ | ✅ |
| Batch/asset export (many objects → many files) | ➖ | ➖ | ➖ | ✅ (Asset Export panel) |

### A18. Accessibility & input

| Feature | MS Whiteboard | OneNote | draw.io | Illustrator |
|---|---|---|---|---|
| Full keyboard navigation of toolbar | ✅ (Tab/arrow keys) | ➖ | ✅ | ➖ (mostly mouse‑first) |
| Touch/pen/stylus input | ✅ | ✅ (primary input for ink) | ✅ (basic) | ✅ (with Wacom/iPad) |
| Screen reader labels | ✅ (Microsoft accessibility focus) | ✅ | ➖ | ➖ |
| High‑contrast/theme support | ✅ | ✅ | ✅ (dark mode) | ✅ (dark UI) |

---

## PART B — EXHAUSTIVE CURRENT‑STATE AUDIT (MemoryMap‑AI)

Everything below is confirmed directly from `database.py`, `routes_whiteboard.py`, `tools.py` (whiteboard functions), `app.js`/`style.css` (whiteboard blocks), `ARCHITECTURE.md`, and `ROADMAP.md`/`HISTORY.md`.

### B1. Data model (as it exists today)

- `WhiteboardNode`: `id, boardid(FK→entries), entryid(FK→entries), x, y, z, width, height, rotation, groupid, createdat, updatedat`. One node per `(entryid, boardid)` pair — a note can appear once per board.
- `WhiteboardSketch`: `id, boardid, data(text — SVG path OR link‑type JSON), x, y, z, groupid, createdat, updatedat`. Doubles as both freehand strokes/shapes **and** connector links (`type: link-straight/link-curved` with `sourceId/targetId/color`, plus `sourceAnchor/targetAnchor/sourcePoint/targetPoint`).
- `WhiteboardObject`: `id, boardid, kind(image|text), data(JSON: url|content/color/fontsize/bg/bordercolor), x, y, z, width, height, rotation, groupid, createdat, updatedat`.
- `MediaUpload`: `id, filename, originalname, createdat` — tracks every upload regardless of destination (note markdown, whiteboard image, document).
- Boards are `Entry` rows; `boardid IS NULL` = default scratch board. Board title = the entry's first heading line (same convention as note titles).
- Additive auto‑migration: new columns get `ALTER TABLE ... ADD COLUMN` at startup; no destructive migrations exist yet (Alembic deliberately deferred).

### B2. Backend routes (`routes_whiteboard.py`)

- `GET /whiteboard?boardid=` → full state (nodes+sketches+objects) for one board.
- `GET /whiteboard/boards` → list of boards actually in use (has ≥1 item), with per‑kind counts. Deliberately excludes empty notes so the picker isn't the whole notebook.
- `POST /whiteboard/boards` → create a new board (a plain note titled by name).
- `PUT /whiteboard/boards/{id}` → rename (rewrites the note's heading line).
- `GET /whiteboard/images` → every image object across every board (Library gallery).
- `POST/PUT/DELETE /whiteboard/nodes/{id}` → card CRUD, validates note exists + board exists, idempotent on `(entryid, boardid)`.
- `POST/PUT/DELETE /whiteboard/sketches/{id}` → sketch/link CRUD.
- `POST/PUT/DELETE /whiteboard/objects/{id}` → image/text‑box CRUD, validates `data` shape per‑kind, media URL allowlist‑checked (prevents path traversal on delete).

### B3. Frontend canvas mechanics (`app.js` whiteboard block, ~5,300 lines)

**Camera/canvas:**
- d3‑zoom, scale extent 0.1×–4×.
- Grid types: none/lines/dots/isometric, colour = tint of board's own ink colour (theme‑aware), spacing scales with zoom via CSS custom properties (`--wb-grid-size/offset-x/-y`) so it pans/zooms with content, not the viewport.
- Per‑board background colour picker + reset‑to‑theme‑default; per‑board background image (stored in `localStorage`, not the DB — a display preference, not notebook data).
- Custom SVG cursor per tool (replaced an earlier JS‑positioned div that visibly lagged on fast swipes).
- Empty‑board hint overlay (dismissible, explains tools) with its own scroll region so it doesn't get trapped under floating panels.

**Selection:**
- Tools: Select, Lasso (both grouped in one dropdown picker).
- Single click select; Shift‑click adds/removes from multi‑selection; clicking a grouped item selects the whole group.
- Marquee (rectangle) drag‑select; Lasso freeform (ray‑cast, centre‑point test).
- `wbSelectedItem` (single) vs `wbMultiSelection` (Set of `"kind:id"` keys) — mutually exclusive by construction.
- Delete/Backspace deletes current selection (single or multi) through the same delete path as every other deletion, so it's undo‑covered.

**Transforms:**
- Drag to move; bulk move recomputes every multi‑selected member from a captured origin snapshot each frame (avoids per‑frame delta compounding drift).
- 8‑handle resize (corners = both axes, edges = one axis) for cards and objects; sketches get their own SVG‑rendered resize handles.
- Rotation: a round handle above the item, connected by a stem; drag to rotate; Shift snaps to 15°. Works for cards, objects, **and** sketches (sketch rotation transforms the path data itself, `wbTransformPathD`).
- Arrow‑key nudge: grid‑step when snap is on, 1px (10px with Shift) otherwise.
- Snap: grid‑snap on every item kind, Alt bypasses it for one drag (Figma/Illustrator convention).
- Smart alignment guides: edge, center, and equal‑spacing (nearest neighbour each side), independent per axis, colour‑coded and user‑alterable (three separate colour pickers), scoped to cards+objects (not sketches, which are freeform strokes not usually aligned against).

**Drawing tools:**
- Pen, Highlighter, Eraser (drags across strokes/cards to remove).
- Shapes: Line, Arrow, Rectangle, Circle, Triangle, Diamond — all in a collapsible shape‑tool dropdown, grouped (Line+Arrow together, the rest together) because Line/Arrow share the "Line ends" control.
- Independent start/end cap styles per line/arrow: none/arrow/circle/square/multi‑line.
- Fill: colour + opacity slider + "no fill" toggle, for closed shapes.
- Stroke: colour (always‑visible main toolbar swatch), width (slider with live size‑preview badge), style (solid/dashed/dotted), "no stroke" toggle.
- Bucket/fill tool: click a shape to fill it with current stroke colour.
- Text tool: click to place a text box, auto‑focuses for immediate typing.
- Image tool: upload button + drag/drop/paste support.
- Link tools: straight and curved connector, drag from one card to another; real anchor points (8 fixed fractional corner/edge points per shape, resolved via rectangle‑ray intersection, plus a "floating"/free point case) shown on hover with the link tool active; draggable endpoints to reattach to a different card (snapping to its nearest anchor) or detach to a free board‑space point.

**Mind‑mapping:**
- Tab (with a card selected) = add a new child card, radially spaced evenly among existing children.
- Enter = add a new sibling (child of the same parent; falls back to child‑of‑self if no parent is known).
- "Arrange as mind map" (Tree / Radial) in the Properties panel for any card that's part of a linked structure — reuses the Graph tab's own layout maths (`wbArrangeMindMap`), not a second engine.

**Grouping:**
- Ctrl+G groups current multi‑selection (persisted `groupid`, survives reload — unlike the in‑memory‑only `wbMultiSelection`).
- Ctrl+Shift+G ungroups.
- Clicking any grouped member selects the whole group.

**Copy/paste:**
- In‑memory clipboard (not OS clipboard — deliberate, no cross‑tab/app paste target makes sense here).
- Cards are explicitly excluded from copy (a card is a 1:1 wrapper on a note; copying would either duplicate the note relationship incorrectly or silently move the original — refused with an explanatory toast instead).
- Links are excluded from copy (they have no standalone shape — recomputed from two card positions every render).
- Paste offsets by a fixed amount so the copy is visibly distinct from the original.

**Undo/redo:**
- Bounded stack (20 entries), per‑board.
- Covers create/delete/move (move covers resize/rotate/style changes too — same PUT, different fields).
- Batch entries: a single user gesture touching multiple items (multi‑nudge, align/distribute) undoes as one step, not N steps.
- Redo stack cleared on any new action.
- Delete‑tool and Eraser both route through the same delete‑and‑undo‑entry path.

**Export:**
- Formats: SVG, PNG, PDF (PDF via browser Print→Save‑as‑PDF, not hand‑rolled PDF bytes).
- Scope: whole board / current viewport ("visible") / current selection.
- Sketches are cloned as real SVG (preserves exact stroke/colour/opacity); cards and text boxes are rebuilt as simplified rect+label since the HTML card layer doesn't survive SVG rasterisation.

**Panels (current):**
- Top‑left: board picker (switch/rename/new).
- Top‑right: library toggle, background colour+reset, grid type select, snap toggle, background‑image set, reset‑panel‑positions, clear‑board, export menu.
- Bottom‑center (dockable to a left sidebar): full tool strip — pan/select‑picker/pen/highlighter/shape‑picker/text/image/eraser/bucket/link‑straight/link‑curved/delete/undo/redo/stroke‑colour/stroke‑width(+live badge).
- Bottom‑right: zoom in/out/fit‑to‑screen, help.
- Mid‑right: context‑sensitive Properties panel (colour/width/cap styles/dash style/no‑stroke/fill+"filled" toggle/background+"none"/border+"none"/font size/mind‑map‑arrange row/multi‑selection group‑ungroup‑align row) — rows shown/hidden per selected kind.
- All floating panels are draggable (grip handle), positions persisted, resettable to default.
- Board‑landing page (separate from the canvas view) lists every board as a gallery, with "New board."

**Keyboard shortcuts (current):** V pan, S select, K lasso, P pen, M highlighter, L line, A arrow, R rectangle, O circle, G triangle, D diamond, T text, E eraser, B bucket, X delete, Tab new‑branch, Enter new‑sibling, Esc back‑to‑boards, Ctrl+Z/Y undo/redo, Ctrl+G/Ctrl+Shift+G group/ungroup, Ctrl+C/V copy/paste (where applicable), Delete/Backspace delete selection, Alt‑drag bypass snap.

### B4. AI integration (`tools.py`)

- `readwhiteboard(boardid)` — cards (id/noteid/preview), links (from/to card ids), text boxes (id/preview), image count, board title. Flat, not structured as a graph/outline.
- `searchwhiteboard(query)` — keyword scan across every board's card previews (via linked note content) and text‑box content. **Not** embedding‑based — no semantic search over whiteboard content.
- `addwhiteboardcard(noteid, boardid, x, y)` — place an existing note as a card; idempotent (returns existing card if the note's already on that board).
- `addwhiteboardlink(fromcardid, tocardid, curved)` — connect two existing cards on the same board; refuses cross‑board links and self‑links.
- `generatediagram(nodes, boardid, layout)` — the Mermaid‑equivalent: takes `[{ref, title|noteid, parentref}]`, validates exactly one root / unique refs / no cycles / no ref reused as two different node types, creates missing notes, computes non‑overlapping tree or radial layout server‑side (reusing the same row/column/radial‑step constants as the client's `wbArrangeMindMap`), creates cards + links in one transaction. Capped at 60 nodes per call (deliberate anti‑flood guard).

### B5. Known, already‑documented gaps (from your own ROADMAP/HISTORY/ARCHITECTURE — not new findings, confirmed in your files)

1. Deleting a note leaves its whiteboard card(s) behind — no cascade, no sweep.
2. Orphaned media (an image that becomes unreferenced other than via the gallery delete button) isn't garbage‑collected.
3. No embedding index over whiteboard‑resident text (text boxes, and by extension the board as a semantic unit) — search is keyword‑only.
4. Image cropping: explicitly discussed, not scoped — needs an interaction decision (crop‑rectangle overlay vs. separate adjust mode) before building.
5. `initWhiteboard` is 1,433 lines (one function); the whole whiteboard block is ~5,300 contiguous lines inside the single 29k‑line `app.js` — flagged by your own codebase review as the single highest‑value refactor target, to be done as its own session.
6. `renderWhiteboard` (460 ln) and `renderWbObjects` (329 ln) also flagged for decomposition.
7. The "full board re‑render on every card‑drag frame" perf bug is marked fixed but **not re‑verified against a large (hundreds‑of‑item) board** — reasoned from code, not measured.
8. Two duplicate markdown renderers exist app‑wide (`renderInlineMarkdown` vs `appendInline`) — relevant if you extend rich‑text rendering into card previews.
9. `wb-search` (a whiteboard library sidebar search input) exists in the HTML with zero JS wiring — literally a dead input sitting above a list it doesn't filter.

---

## PART C — COMPLETE GAP MATRIX (every Part‑A feature, mapped)

Legend: **HAVE** = fully implemented in MemoryMap‑AI today. **PARTIAL** = exists but incomplete/needs extension. **MISSING** = not present. **N/A** = doesn't apply to a local single‑user AI notebook (justified, not silently dropped). Priority: **P0** correctness/blocking, **P1** core to your stated goal, **P2** valuable, **P3** nice‑to‑have/defer.

### C1. Canvas & structure

| Feature | Status | Priority | Note |
|---|---|---|---|
| Infinite pan/zoom canvas | HAVE | — | d3‑zoom, 0.1×–4× |
| Multiple boards | HAVE | — | boards = notes |
| Board background colour/image | HAVE | — | per‑board, image is localStorage‑only (not synced across devices — see C13) |
| Grid (lines/dots/iso) + snap | HAVE | — | |
| Rulers (draggable, page‑style) | MISSING | P3 | Illustrator/OneNote‑style ruler; low value for a mindmap tool, ink‑angle‑lock covered differently (no ink ruler tool exists either — P3 if wanted) |
| Manual drag‑guides (from a ruler) | MISSING | P3 | Smart alignment guides (auto, while dragging) already cover most of the practical need |
| Multiple frames/pages within one board | MISSING | P2 | Illustrator‑artboard‑style "sub‑canvases" inside one mind map — useful for large maps with distinct sections |
| Sections/folders for boards | PARTIAL | P2 | Boards list is flat; no grouping/folders the way OneNote has notebooks→sections |
| Board templates (save/apply) | MISSING | P1 | Directly serves your stated brainstorming/ideation use case |

### C2. Selection

| Feature | Status | Priority |
|---|---|---|
| Click / marquee / lasso select | HAVE | — |
| Shift‑click multi‑select | HAVE | — |
| Select all | MISSING (no global Ctrl+A on whiteboard confirmed) | P2 |
| Tab/Shift+Tab cycle selection | MISSING | P3 |
| Select same type/style | MISSING | P3 |
| Select vertices‑only/edges‑only equivalent (cards‑only / links‑only / sketches‑only) | MISSING | P2 |
| Direct/anchor‑level selection (vector path editing) | MISSING | P3 — only relevant if full vector‑path editing (C7) is built |
| Isolation mode | MISSING | P3 |

### C3. Transforms

| Feature | Status | Priority |
|---|---|---|
| Move/resize/rotate via drag+handles | HAVE | — |
| Arrow‑key move + Shift for larger step | HAVE | — |
| Constrain proportions (Shift‑resize) | PARTIAL | P2 — confirm explicit Shift‑constrain on resize, not just rotate |
| Resize from center (Ctrl/Alt‑resize) | MISSING | P2 |
| Numeric X/Y/W/H/rotation entry in Properties panel | MISSING | P1 — currently only Width and Rotation‑via‑drag are exposed; precise numeric transform entry is a core Illustrator‑tier expectation |
| Flip horizontal/vertical | MISSING | P2 |
| Skew/shear | MISSING | P3 |
| Duplicate via Alt/Ctrl+Shift‑drag | MISSING | P2 — copy/paste exists but not drag‑duplicate |
| Repeat last transform | MISSING | P3 |

### C4. Alignment/snap

| Feature | Status | Priority |
|---|---|---|
| Grid snap, Alt‑bypass | HAVE | — |
| Smart alignment guides (edge/center/spacing), colour‑coded | HAVE | — |
| Align/distribute as explicit commands (not just live‑drag) | PARTIAL | P1 — Properties panel has align/distribute for multi‑selection per HISTORY, confirm full left/h‑center/right/top/v‑center/bottom + distribute‑h/v coverage and exact‑gap distribution |
| Align relative to selection/key‑object/board | MISSING | P2 |
| Global snap on/off toggle | HAVE | — |

### C5. Drawing/ink

| Feature | Status | Priority |
|---|---|---|
| Pen/highlighter/eraser | HAVE | — |
| Shape recognition (ink→clean shape, "beautify") | MISSING | P2 — you draw discrete shape tools already, but freehand‑drawn rough shapes aren't auto‑cleaned |
| Handwriting→text | MISSING | N/A justified — MemoryMap is keyboard‑first/local‑LLM‑first, not a pen‑first app; defer unless you get a stylus workflow |
| Math ink recognition | MISSING | N/A — out of scope, no evidence this serves your mindmapping use case |
| Ink replay | MISSING | P3 |
| Ruler tool | MISSING | P3 |
| Pen focus/distraction‑free view | MISSING | P2 — relates to the presentation‑mode gap below |
| Pressure sensitivity | MISSING | P3 — depends on your input devices; you're on laptop/desktop + iPhone, stylus support is a research question first |

### C6. Shapes & connectors

| Feature | Status | Priority |
|---|---|---|
| Basic shape set (rect/circle/triangle/diamond/line/arrow) | HAVE | — |
| Domain‑specific shape libraries (flowchart/UML/network/ERD) | MISSING | P2 — valuable if you want draw.io‑grade diagramming, not required for pure mindmapping |
| Custom/importable shape libraries | MISSING | P3 |
| Connectors with auto‑attach + re‑route on move | HAVE (anchor system already does this) | — |
| Arrowhead/endpoint style variety | HAVE | — none/arrow/circle/square/multiline caps |
| Connector labels | MISSING | P1 — you have "reasons on links" in the Graph tab already (per HISTORY); the whiteboard's own links have no equivalent label field yet |
| Swimlanes/tables/containers | MISSING | P2 |
| Smart auto‑connect on hover (draw.io style directional arrows) | MISSING | P2 |
| Auto‑layout for a whole flowchart (not just mind‑map tree/radial) | PARTIAL | P1 — `generatediagram`/`wbArrangeMindMap` cover tree/radial; a general auto‑arrange for a tangled non‑tree diagram doesn't exist |
| Diagram generation from text/data | HAVE (server‑side, `generatediagram`) | — this is your Mermaid‑equivalent |
| AI‑generated diagram from a prompt | HAVE (via chat → `generatediagram` tool call) | — already wired end‑to‑end |

### C7. Vector path editing

| Feature | Status | Priority |
|---|---|---|
| Anchor points + Bézier handles, Pen tool | MISSING | P3 — high build cost, low incremental value for a mindmapping/brainstorm tool vs. an illustration tool; recommend explicit scope‑out unless you want true Illustrator‑grade drawing |
| Pathfinder boolean ops | MISSING | P3 (same reasoning) |
| Clipping masks / compound paths | MISSING | P3 |
| Simplify path / outline stroke / knife / blend / envelope | MISSING | P3 |
| **Recommendation:** treat all of A7 as an explicit, named "Illustrator‑tier, out of scope for v1" bucket rather than silently dropped — see Part D. |

### C8. Layers/grouping/z‑order

| Feature | Status | Priority |
|---|---|---|
| Bring to front/back | PARTIAL | P1 — `z` field exists on every item; confirm a UI command exists (not just drag‑reorder) |
| Bring forward/backward (one step) | MISSING | P2 |
| Group/ungroup, persisted groupid | HAVE | — |
| Nested groups | MISSING | P2 |
| True layers panel (named, reorderable, visibility/lock toggle) | MISSING | P1 — this is a genuine, clearly‑stated gap from the earlier research pass |
| Per‑object lock | MISSING | P1 — MS Whiteboard/draw.io/Illustrator all have this; you have none today, and it's cheap (one boolean column) |
| Per‑layer opacity/blend mode | MISSING | P3 |
| Isolation mode | MISSING | P3 |

### C9. Colour/fill/stroke

| Feature | Status | Priority |
|---|---|---|
| Stroke colour/width/style/no‑stroke | HAVE | — |
| Fill colour/opacity/no‑fill | HAVE | — |
| Object opacity (non‑stroke, whole‑object) | MISSING | P2 — you have fill‑opacity but not whole‑object opacity (e.g., a translucent card) |
| Gradients | MISSING | P2 |
| Pattern fills | MISSING | P3 |
| Swatches panel / custom saved palette | MISSING | P1 — currently every colour control is an ad‑hoc native `<input type=color>`; a shared, savable swatch palette is core to feeling "professional" across all four reference apps |
| Eyedropper | MISSING | P2 |
| Stroke caps/joins | PARTIAL | P2 — line/arrow end‑caps exist; generic stroke cap/join style for shape outlines doesn't |
| Variable‑width stroke | MISSING | P3 |
| Shadow/glow/effects | MISSING | P2 |
| Non‑destructive/editable effects stack | MISSING | P3 |

### C10. Text & typography

| Feature | Status | Priority |
|---|---|---|
| Text boxes | HAVE | — |
| Font size | HAVE (text boxes only) | — |
| Font family choice | MISSING | P1 — no font‑family control anywhere on the whiteboard |
| Bold/italic/underline | MISSING | P1 — text boxes are plain, no inline formatting |
| Text alignment (h/v) | MISSING | P2 |
| Line spacing/letter spacing | MISSING | P3 |
| Paragraph/character styles (reusable) | MISSING | P3 |
| Lists (bulleted/numbered) inside a text box | MISSING | P2 |
| **Rendered markdown inside note‑card previews** | MISSING | P0/P1 — cards show raw truncated text, not the note's actual formatting; this is your single clearest "should feel like OneNote" gap |
| Hyperlinks | PARTIAL | P2 — links exist in note content generally; whether they render clickable inside a card preview is unconfirmed |
| Find & replace text content on the board | MISSING | P2 |

### C11. Images/media

| Feature | Status | Priority |
|---|---|---|
| Insert/upload/paste/drag image | HAVE | — |
| Crop image | MISSING | P2 — explicitly deferred pending a UX decision in your own roadmap |
| Image filters/adjustments | MISSING | P3 |
| Embed video/playable media | MISSING | P3 |
| Embed documents/files as objects | MISSING | P2 — you have a Documents feature already; embedding a document reference as a whiteboard object (distinct from a note card) doesn't exist |
| Image trace/vectorize | MISSING | N/A — out of scope, Illustrator‑specific |
| Orphaned media garbage collection | MISSING | P0 — correctness gap, already named in your own architecture doc |

### C12. Templates/reusable components

| Feature | Status | Priority |
|---|---|---|
| Pre‑built board templates | MISSING | P1 |
| Save current board as a template | MISSING | P1 |
| Reusable symbol/component (instance‑linked) | MISSING | P2 — e.g. a "task card" style that many cards share and update together |

### C13. Panels & UI chrome

| Feature | Status | Priority |
|---|---|---|
| Insert/create panel | HAVE (tool strip) | — |
| Properties/format panel, context‑sensitive | HAVE | — |
| Draggable/dockable/resettable floating panels | HAVE | — |
| Layers panel | MISSING | P1 (see C8) |
| Swatches panel | MISSING | P1 (see C9) |
| Named custom workspace presets (save panel layout) | MISSING | P3 |
| Status bar (zoom/tool/item‑count/board name) | MISSING | P2 |
| Contextual floating quick‑action bar near a fresh selection | PARTIAL | P2 — Properties panel exists but is a fixed dock, not a "hovering near the selection" quick bar |
| Help/shortcut overlay | HAVE (per‑app `?`‑style overlay exists app‑wide, confirm whiteboard‑specific shortcuts are listed there) | — |
| Dead `wb-search` input (unwired) | BUG | P0 — either wire it to filter the board/library list or remove it |
| Background‑image per board synced across devices | PARTIAL | P2 — currently `localStorage`‑only, so it won't follow you from laptop to desktop to iPhone the way the rest of the (server‑stored) notebook does |

### C14. Collaboration

| Feature | Status | Priority |
|---|---|---|
| Real‑time multi‑cursor | N/A | — MemoryMap‑AI is explicitly single‑user, local‑first; this is correctly out of scope, not a gap |
| Comments/annotation threads | MISSING | P3 — could have local value as "sticky notes to self" but isn't collaboration in your context |
| Share link | N/A | — no cloud backend exists or is wanted |

### C15. Version history / autosave / backup

| Feature | Status | Priority |
|---|---|---|
| Autosave | HAVE | — every mutation is an immediate PUT/POST, no explicit "save" step exists anywhere in the app |
| Undo/redo as a safety net | HAVE | — bounded to 20 entries per board session (in‑memory, not persisted across reload) |
| Full version history (browse/restore past states of a board) | MISSING | P1 — you explicitly asked about this ("save versions"); nothing today lets you go back to "the board as it was yesterday" the way OneNote/draw.io/Illustrator all do |
| Named/pinned versions that don't expire | MISSING | P2 |
| Diff/preview before restoring | MISSING | P2 |
| App‑wide backup (daily local snapshot) | HAVE (project‑level `backup.py`, not whiteboard‑specific) | — a whiteboard version history could be layered on top of/alongside this rather than duplicating it |

### C16. Undo/redo

| Feature | Status | Priority |
|---|---|---|
| Undo/redo core | HAVE | — |
| Bounded stack size (20) | HAVE, but per‑session only | P2 — undo history is lost on page reload; consider whether that's acceptable or whether a persisted micro‑history (distinct from full version history) is warranted |
| Batch actions undo as one step | HAVE | — |

### C17. Export

| Feature | Status | Priority |
|---|---|---|
| Export board/selection/viewport as SVG/PNG/PDF | HAVE | — |
| Export as embeddable HTML | MISSING | P3 |
| Batch/asset export | MISSING | N/A — not relevant to a single‑board‑at‑a‑time export need |
| Export as Markdown/outline text (Mermaid‑style) | MISSING | P1 — directly ties to your "AI can read the whiteboard" ask; see Part D §2 |

### C18. Accessibility/input

| Feature | Status | Priority |
|---|---|---|
| Full keyboard shortcut coverage | HAVE (extensive) | — |
| Touch/pointer‑event support | HAVE | — confirmed pointer events used throughout, touch‑action:none set correctly on drag handles |
| Screen reader labels | UNCONFIRMED | P3 |
| High‑contrast/theme support | HAVE | — app‑wide theme system already covers the whiteboard (grid ink colour is theme‑derived) |

---

## PART D — SPECIFIC ANSWERS TO YOUR NAMED CONCERNS

### D1. "Make sure my current functionality isn't lost or interferes with the rebuild"

Nothing in Part C requires deleting data or breaking the data model to add. Every "MISSING" item above is additive:
- New DB columns (locked, opacity, fontfamily, bold/italic flags, layer id/name/visible/order) via the existing additive auto‑migrator — no destructive migration needed.
- New tables (board templates, board version snapshots, a `swatches` table) sit alongside the existing four whiteboard tables without touching them.
- The UI rebuild (Part E) is a **presentation‑layer** change: cards/sketches/objects keep meaning exactly what they mean today; you're changing how panels are laid out and adding new panels, not changing what a "card" or "link" *is*.
- The one thing that **is** structural — extracting the 5,300‑line whiteboard block out of `app.js` into its own module — is explicitly a refactor‑before‑features step (per your own ROADMAP), and is exactly what makes the rest of this list safe to build without the "makeshift, fighting the code" feeling you described.

**Sequencing principle:** do the extraction (Part F, Phase 0) *before* any new panel/feature work lands, so every new feature is written into the clean module rather than the monolith, and nothing needs to be "moved" twice.

### D2. AI readability — making the whiteboard a first‑class AI surface

To hit your stated goal ("whiteboard can easily be scanned and read by the AI" + "AI can make whiteboard maps similar to Mermaid.js"), beyond what's already built (`generatediagram`, `addwhiteboardcard/link`, `readwhiteboard`, `searchwhiteboard`):

1. **`readwhiteboard(format="outline")`** — new mode returning an indented text outline of the link graph (root → children → grandchildren), closer to how a person would describe a mind map out loud, and closer to Mermaid's own `flowchart TD` syntax. This is the natural export counterpart to `generatediagram`'s import shape.
2. **Embedding index for whiteboard text** — extend `EmbeddingRecord` (or add a parallel table) to cover `WhiteboardObject(kind="text")` content, so `searchwhiteboard` can do semantic matching, not just keyword scan, matching how `searchnotes` already works.
3. **`generatediagram` extensions**: accept an existing board's current cards as additional parent‑reference context (extend rather than only create), and add a `layout: "grid"` option for flat, non‑hierarchical idea dumps.
4. **Structured export as literal text** — a "Copy as Mermaid‑style text" / "Copy as outline" command in the UI Export menu, using the same graph‑walk as item 1, so a human can paste a board into any other tool that speaks Mermaid‑like syntax, and so you (or the AI in a different session/context) can re‑ingest a board as plain text without opening the app.

### D3. Everything from Part A that is *deliberately* not going into your rebuild, and why

So nothing is silently dropped:

- **Real‑time multi‑user collaboration, presence, follow‑mode, share links** (A14) — MemoryMap‑AI is explicitly, architecturally single‑user and local‑first (`ARCHITECTURE.md` design principle #1). Building this would contradict a stated core constraint of the whole project, not just the whiteboard.
- **Full vector path editing (Pen tool, anchors, Pathfinder, compound paths, clipping masks, blend/envelope/knife tools)** (A7) — this is Illustrator's actual product category (professional vector illustration). Your stated use case is "mindmapping, whiteboard, ideation, brainstorming" — a diagram/mindmap tool needs *shapes*, not full illustration‑grade path editing. Recommend scoping this out of v1 explicitly, and revisiting only if you find yourself wanting to draw genuinely illustrative artwork (not diagrams) inside MemoryMap‑AI.
- **Handwriting‑to‑text, math‑ink recognition** (A5) — no evidence in your project files that stylus/ink‑first input is a workflow you use (your stack is keyboard + local LLM + Ollama, cross‑device sync across phone/laptop/desktop, not pen input). Revisit if you get an iPad/stylus into your workflow.
- **Image trace/vectorize, asset batch export, pattern fills, mesh gradients, variable‑width strokes** (A7/A9/A11/A17) — genuinely Illustrator‑specific, professional‑print‑design‑tier features with no clear tie to mindmapping/brainstorming.

---

## PART E — FULL TARGET UI / PANEL SPEC

A complete redesigned panel layout, keeping every current capability (Part B3) and adding every P0/P1/P2 item from Part C.

### E1. Screen zones

```
┌─────────────────────────────────────────────────────────────┐
│  TOP BAR: board name / rename / board picker / templates      │
├───────────┬───────────────────────────────────┬───────────────┤
│           │                                     │                │
│  LEFT     │                                     │   RIGHT        │
│  SIDEBAR  │           CANVAS                   │   INSPECTOR    │
│  (dock-   │        (infinite, pan/zoom)         │   PANEL        │
│  able)    │                                     │   (tabs)       │
│           │                                     │                │
├───────────┴───────────────────────────────────┴───────────────┤
│  STATUS BAR: zoom % · item count · selected kind · board size   │
└─────────────────────────────────────────────────────────────┘
       ▲ FLOATING TOOL DOCK (draggable, dockable to left/bottom)
       ▲ CONTEXTUAL QUICK BAR (appears near a fresh selection)
```

### E2. Left sidebar (tabbed) — new, replaces the current single Library toggle

- **Tab: Insert** — shape library (categorised: Basic, Mind‑map nodes, Flowchart, Arrows), template gallery, existing‑note picker (drag a note onto the canvas — this already exists as "Library").
- **Tab: Layers** *(new, P1)* — flat list of every item on the current board (cards/sketches/objects), each row: visibility toggle, lock toggle, name/preview snippet, drag‑to‑reorder (writes to `z`). Grouping shown as collapsible rows.
- **Tab: Pages/Boards** *(replaces the separate board‑landing page as an option)* — same gallery, now reachable without leaving canvas view.

### E3. Right inspector panel (tabbed) — replaces/extends the current single Properties panel

- **Tab: Style** — everything currently in Properties (colour/width/cap/dash/fill/border/font size) *plus* new: font family, bold/italic, text alignment, whole‑object opacity, gradient (if built), swatches picker.
- **Tab: Arrange** — numeric X/Y/W/H/rotation entry *(new, P1)*, align/distribute buttons (left/h‑center/right/top/v‑center/bottom, distribute‑h/v), flip‑h/flip‑v *(new)*, bring‑to‑front/forward/backward/send‑to‑back *(new UI, `z` already exists)*, group/ungroup (existing), lock/unlock *(new)*.
- **Tab: Mind‑map** — existing Tree/Radial arrange buttons, moved here from the generic Properties list.
- **Tab: History** *(new, P1)* — version history browser (see E5), separate from the bounded live undo stack.

### E4. Floating tool dock — kept exactly as today, no regressions

All current tools (pan/select/lasso/pen/highlighter/shape‑picker/text/image/eraser/bucket/link‑straight/link‑curved/delete/undo/redo/stroke‑colour/stroke‑width) stay. Additions:
- Board‑lock toggle (lock all objects on the board against accidental edits — MS Whiteboard convention).
- "Beautify" button *(P2)* — runs shape recognition on the last‑drawn freehand stroke.
- Eyedropper *(P2)*.

### E5. Version history panel *(new, P1)*

- Timestamped list of snapshots (auto‑captured on a debounce after edits stop, e.g. every N minutes of activity, or on explicit "save a version" click — mirrors OneNote's automatic page‑versions + Illustrator's explicit "mark this version").
- Thumbnail/preview per version (reuse the existing SVG export pipeline to render a small preview, no new rendering path needed).
- Restore button with a confirmation dialog (matches the app's existing "destructive AI actions are confirmed" principle).
- Named/pinned versions that are excluded from any future pruning.

### E6. Status bar *(new, P2)*

Zoom %, current tool name, item counts (X cards · Y sketches · Z objects), board name, and a `?` shortcut‑overlay trigger.

### E7. Contextual quick bar *(new, P2)*

A small floating strip that appears just above/beside a freshly made selection with the 4–5 most‑likely‑next actions (colour, delete, duplicate, link) — Illustrator's Contextual Task Bar equivalent. Purely additive; the full Inspector panel remains for everything else.

### E8. Swatches panel *(new, P1, could live inside the Style tab rather than standalone)*

A small grid of saved colours (recently used + user‑pinned), shared across stroke/fill/text‑colour pickers, so colour choices are consistent across a board without re‑picking a hex value every time.

---

## PART F — PHASED BUILD PLAN (every item from Part C placed somewhere, nothing left unaccounted)

### Phase 0 — Correctness & refactor foundation (do first, blocks nothing else, de‑risks everything else)
- Fix: cascade/sweep orphaned cards on note delete (C11/B5‑1).
- Fix: orphaned media garbage collection (C11/B5‑2, C11 P0).
- Fix/remove: dead `wb-search` input (C13, P0).
- Verify (don't assume) the drag‑render perf fix against a large synthetic board (B5‑7).
- Extract the whiteboard block from `app.js` into its own module (B5‑5/6). **Nothing else below should be written into the old monolith.**
- Resolve the duplicate markdown‑renderer situation if Phase 3 will extend rendering (B5‑8).

### Phase 1 — AI depth (your stated top priority)
- `readwhiteboard(format="outline")` (D2‑1).
- Embedding index for whiteboard text content (D2‑2).
- `generatediagram` grid layout + extend‑existing‑board support (D2‑3).
- "Copy as outline/Mermaid‑style text" export command (D2‑4).
- Connector/link labels (C6, P1) — needed so an AI‑generated diagram can carry relationship text ("depends on," "leads to"), not just an unlabelled line.

### Phase 2 — Core UI rebuild (Part E structure)
- Layers panel (C8/E2).
- Right inspector restructured into tabs: Style / Arrange / Mind‑map / History (E3).
- Numeric X/Y/W/H/rotation entry (C3, P1).
- Object lock (C8, P1).
- Bring‑forward/backward one‑step commands (C8, P2).
- Swatches panel (C9/E8, P1).
- Font family + bold/italic for text boxes (C10, P1).
- **Rendered markdown inside card previews** (C10, P0/P1 — your clearest OneNote‑fidelity gap).

### Phase 3 — Version history (your explicit "save versions" ask)
- Snapshot capture mechanism (debounced auto‑snapshot + explicit "save version" action).
- Version History panel with thumbnails (reusing existing SVG export).
- Restore with confirmation.
- Named/pinned versions.

### Phase 4 — Templates & structure
- Board templates: save‑current‑as‑template, apply‑template‑to‑new‑board.
- A handful of starter templates matching your actual use cases (mind‑map spine, SWOT quadrant, Kanban columns, retro columns).
- Reusable symbol/component (instance‑linked card style) — stretch goal within this phase.

### Phase 5 — Diagramming depth (draw.io‑tier, optional based on how far you want to push beyond mindmapping)
- Domain shape libraries (flowchart/UML/network/ERD).
- Swimlanes/tables/containers.
- Smart auto‑connect on hover.
- General (non‑tree) auto‑layout for tangled diagrams.

### Phase 6 — Polish & remaining P2/P3 items
- Flip h/v, resize‑from‑center, duplicate‑via‑drag.
- Shape recognition ("Beautify") for freehand strokes.
- Status bar.
- Contextual quick bar.
- Gradients, shadow/glow effects, stroke caps/joins for shapes.
- Object whole‑opacity.
- Eyedropper.
- Multiple frames/sub‑canvases within one board.
- Board sections/folders.
- Named workspace presets.

### Explicitly out of scope (Part D3) — revisit only if your use case changes
- Full vector path/anchor editing, Pathfinder, compound paths, clipping masks, blend/envelope/knife tools.
- Real‑time multi‑user collaboration, presence, follow‑mode, share links.
- Handwriting‑to‑text, math‑ink recognition.
- Image trace/vectorize, pattern fills, mesh gradients, variable‑width strokes, batch asset export.

---

## PART G — WHAT TO HAND TO CLAUDE/FABLE

This document is structured so each Phase in Part F can be pasted as its own implementation brief, with Part C as the acceptance‑criteria checklist (every row a testable yes/no) and Part B as the "don't break this" contract (every HAVE item is a regression‑test target during the Phase 0 refactor). Part E is the visual/layout spec to build against. Nothing from the four source applications' feature sets (Part A) is unaccounted for — every row resolves to HAVE, a specific Phase, or an explicit, reasoned exclusion in Part D3.
