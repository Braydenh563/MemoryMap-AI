# Mindmaps — a dev plan

> Companions: [ROADMAP.md](../ROADMAP.md) · [HANDOVER.md](HANDOVER.md) ·
> [UI_MODERNISATION_PLAN.md](UI_MODERNISATION_PLAN.md) ·
> [AGENT_SKILLS_REFORM.md](AGENT_SKILLS_REFORM.md) · [PLAN.md](PLAN.md) ·
> [../ARCHITECTURE.md](../ARCHITECTURE.md) · [../DESIGN.md](../DESIGN.md)
>
> **Note for Fable: this plan is a first pass and is meant to be extended and
> refined, not executed verbatim.** Everything in §2 is grounded in the code as
> it stands; §5 onward is design intent that should be pressure-tested against
> the running app before any of it is built.

## 1. The instruction, verbatim

> I have a vision. I want to extend the whiteboard and make a mindmap feature
> like kaggle. any and all text boxes and things that are in the map stay
> bundled within the map and basically the mindmap as a whole becomes its own
> entity that can be attached to notes and is its own object and has its own
> library subtab or is a part of the boards and maps subtab. do deep research
> and figure out all the features and functions kaggle.it has as well as other
> mindmapping websites and programs and create a detailed dev plan to make it a
> reality. mindmaps should be readable by the ai, exportable as images and
> pdfs, built off the whiteboard, have lots of utility, have the ability to
> link and reference notes and documents and files etc. the mindmap as a whole
> can be an item that can be attached to, linked to, referenced in notes and
> documents. this features needs to be properly integrated with everything,
> with rendered previews and chips if attached to notes and/or the chat as well
> as if they appear in the dashboard widgets and/or the timeline and/or graph
> etc.

**The naming question is settled.** Asked directly, the user confirmed
"kaggle" was a typo for **Coggle (coggle.it)** — and said all of the tools
named here are good references, so the feature set below draws on **Coggle**
(immediacy, branch colours, loops and joins, image nodes, PNG/PDF/text/OPML
export, `.mm` import), **Kumu** (attributes, perspectives, focus mode, signed
edges), **XMind** (output quality, structure templates) and **Obsidian Canvas
Mindmap** (the keyboard set). They also named **Lucidchart** as a reference,
"but that's more for the whiteboard" — its smart connectors, containers,
alignment tools and shape libraries map onto PLAN.md W1–W5, not this plan.

**The scope call in §4 is made: option B** (confirmed by the user in the same
exchange). Everything from §5 on assumes it.

## 2. What already exists (checked in the code, not assumed)

This is the single most important section: a large part of this feature is
already built, and CLAUDE.md's first rule exists because three sessions have
rebuilt existing work here.

- **A board is already an `Entry`.** `WhiteboardNode.board_id`,
  `WhiteboardSketch.board_id` and `WhiteboardObject.board_id` are all
  `ForeignKey("entries.id")` (`src/memorymap/core/database.py` ~930-1010). A
  board *is* a note row. So "the mindmap as a whole is its own object that can
  be attached to, linked to and referenced" is **already true at the data
  layer** — it inherits linking, tags, categories, the graph, the timeline and
  full-text search for free. The work is surfacing that, not adding it.
- **Nodes, sketches and objects are all board-scoped and workspace-scoped**
  (`WorkspaceMixin`), with `x/y/z`, optional `width/height/rotation`, and a
  `group_id` — so grouping and z-order exist.
- **`WhiteboardObject` uses one table with a `kind` discriminator**, which is
  the extension point for new node kinds (a mindmap topic, an embedded file
  card) without a migration per kind.
- **Boards have a preview renderer** (`_board_preview`, `_preview_items` in
  `routes_whiteboard.py`) and a Library "Boards & maps" sub-tab that lists and
  manages them, plus duplicate.
- **A Concept Map feature exists** (task #7, "Build the authored mindmap"),
  reachable from the Graph tab's toolbar. Its learnability is a known open item
  (task #103). **Read what it does before designing a second one** — the
  likeliest right answer is that "mindmap" and "concept map" become one feature,
  not two.
- **The graph already renders note-to-note structure** (`frontend/graph.js`),
  and the Library already has a Boards & maps sub-tab (the user's own preferred
  home for this).

**So the honest framing of this work is: promote the board from "a canvas that
happens to be an entry" to "a first-class map object with mindmap semantics,
surfaced everywhere the app already surfaces notes."**

## 3. Research: what the field actually offers

Sources at the end. Grouped by what it would mean here.

### 3.1 Structure and layout
- **Reingold–Tilford "tidy" tree**, improved to linear time by Buchheim et al.,
  is the standard mind-map layout; `d3-hierarchy`'s `tree()` implements it, and
  treating `x` as angle and `y` as radius gives the classic radial map from the
  same call. `d3-flextree` extends it to variable-sized nodes, which matters
  here because a node may be a note card, not a word.
- **Obsidian Canvas Mindmap** is the closest model for keyboard-first editing:
  Tab adds a child, Enter adds a sibling, arrow keys navigate, a node's whole
  subtree can be selected and moved, and edges can be coloured for grouping.
  This is the interaction set to copy — it is what makes a mindmap fast rather
  than a drawing.
- **XMind** is the benchmark for *output* quality and offline work; **Coggle**
  for immediacy (no ceremony, real-time concurrent edits); **MindMeister** for
  idea→task workflows; **Whimsical** for mixing maps with flowcharts and docs.

### 3.2 Semantics beyond a tree
- **Kumu** is the one worth studying hardest for this app: elements and
  connections carry **tags and attributes**, and "perspectives" turn that data
  into decorations — colour, size, filter. It adds **social-network metrics**
  (betweenness, closeness, eigenvector centrality), **automated community
  detection**, and a **focus mode** that starts from one element and unfolds the
  network step by step. It supports **systems maps and causal loop diagrams**
  (signed, directional edges), not just trees.
- That maps onto MemoryMap directly: a map's nodes are often *real notes*, which
  already have tags and categories, so "perspectives" is a filter over data the
  app already holds — and the graph tab already computes some of these metrics.

### 3.3 Integration patterns
- **Excalidraw-in-Obsidian** is the reference for "a drawing is a first-class
  linked document": backlinks work, links survive a rename, and drawings appear
  in the graph view. That is precisely the integration bar the user is setting.
- Obsidian's own warning is worth heeding: with Canvas you end up with **two
  levels of linking** (through the canvas and through the notes), which
  confuses people. **Decide once, here: a map-to-note link is a real link and
  shows in the graph; a node's position on a canvas is not a link.**

## 4. Scope decision (make this call first)

Three options, with a recommendation.

| | Option | Consequence |
| --- | --- | --- |
| A | Mindmap as a **mode of the whiteboard** — same board, a toggle that turns on tree semantics, auto-layout and keyboard editing | Least new code, no second data model, one Library home. Risk: modes are a learnability tax. |
| B | Mindmap as a **new board `type`** on the existing board entry (`board.type = "map" \| "board"`) | One data model, two behaviours, two filters in the Library. Clean. **Recommended.** |
| C | A **separate entity** with its own tables and sub-tab | Duplicates linking, preview, export, permissions and the Library plumbing that boards already have. Not recommended. |

**Decision: B — confirmed by the user.** A board is already an entry; add a
`type` and a `layout` to it. Everything in §5 and §6 assumes B.

### What Coggle specifically does that the phases below must keep

Recorded because Coggle is the reference the user actually meant:

- **Zero ceremony.** A new map is one click and one central node; a child is
  the `+` on hover or `Tab`; there is no "mode" to enter. Phase 2 item 5 is
  the keyboard half of this; the `+` affordance on the hovered node is the
  pointer half and belongs in the same item.
- **Branch colour carries down the branch** — every descendant inherits the
  first-level colour unless overridden. Phase 2 item 8's "inherit-from-parent
  by default" is exactly this; the default palette is one colour per
  first-level branch, assigned in order.
- **Loops and joins**: a second parent link between branches, drawn as a
  curve distinct from the tree edges. Phase 2 item 9.
- **Text is markdown-ish** (bold, italics, links, code) and a node may be an
  image. Node kinds in Phase 1 item 3 cover the image; the text renderer is
  the whiteboard's existing markdown pass.
- **Export**: PNG, PDF, plain-text outline, `.mm` (FreeMind) and OPML;
  **import** `.mm` and OPML. Phase 4 items 16–17 add `.mm` to their list.
- **Auto-arrange** on demand rather than always: the user can drag a branch
  and it stays; "tidy" re-lays it out. Phase 2 item 6 becomes a command, with
  free placement kept per branch (a `pinned` flag on a node).
- **Presentation/print**: a map fits to page for PDF. Covered by Phase 4.

## 5. The feature set, in build order

### Phase 1 — the map object (foundation)
1. **`type` and `layout` on the board entry.** `type: "board" | "map"`;
   `layout: "free" | "tree-right" | "tree-down" | "radial"`. Stored on the
   board's own `Entry` (a JSON settings column or a dedicated table —
   `WhiteboardObject`'s `kind` discriminator is the precedent for not adding a
   table per idea).
2. **A parent edge for nodes.** Mindmaps are trees; the whiteboard's links are
   a general graph. Add `parent_id` to whatever carries a map node, and keep the
   existing free links for cross-branch connections (which every serious
   mindmapper supports and calls a "relationship" or "cross-link").
3. **Node kinds**, on the existing discriminator: `topic` (text), `note` (a real
   `Entry` — this is `WhiteboardNode` today), `document`, `file`, `image`,
   `link`. A node that *is* a note keeps its identity: editing it edits the note.
4. **Containment is real.** "any and all text boxes and things that are in the
   map stay bundled within the map" — enforce it: deleting a map deletes its
   `topic` nodes (they exist only there) and *unlinks* its `note`/`document`/
   `file` nodes (those live in the library and must survive). Write the test
   first; this is the rule most likely to be got wrong.

### Phase 2 — editing that feels like a mindmap
5. **Keyboard-first**: Tab = child, Enter = sibling, Shift+Tab = outdent,
   arrows = navigate, F2/double-click = rename, Delete = subtree with confirm.
   Copy Obsidian Canvas Mindmap's set; it is the de-facto standard.
6. **Auto-layout** via Reingold–Tilford with variable node sizes (d3-flextree's
   algorithm, implemented locally — **no CDN, the app is offline-first**;
   `frontend/graph.js` already hand-rolls layout, so this is a sibling of
   existing code, not a new dependency).
7. **Collapse/expand a branch**, with a count badge on the collapsed node.
8. **Styling that carries meaning, not decoration**: per-node colour, shape and
   icon; per-edge colour and thickness; inherit-from-parent by default.
9. **Cross-links** (non-tree edges) rendered distinctly — dashed, per the
   systems-map convention — and optionally **signed/directional** for causal
   loop diagrams (Kumu's model).

### Phase 3 — the map as a citizen of the app
10. **Library**: maps live in **Boards & maps** with a Maps filter chip (the
    user's stated preference), with the existing board preview upgraded to
    render map structure.
11. **Attachable and referenceable**: a map can be attached to a note, a
    document and a chat message, exactly as a file can today
    (`routes_chat.py`'s `file_ids` is the pattern to copy), and referenced
    inline with the existing `@` picker.
12. **Rendered previews and chips** everywhere the user listed: note bodies,
    the chat transcript, dashboard widgets, the timeline and the graph. One
    `mapChip()` and one `mapPreview()`, used by all of them — the app's
    recurring failure is the same object drawn five ways.
13. **Graph integration**: a map is a node in the graph; its note-nodes are
    edges from the map to those notes. This is the "decide once" call from
    §3.3 — a map's *membership* is a link, a node's *position* is not.

### Phase 4 — AI and export
14. **The AI can read a map.** A `read_mindmap` tool returning an indented
    outline (title, then the tree, with each node's kind and any note id), which
    is the form a small model handles best. Plus `create_mindmap`,
    `add_map_node`, `link_map_nodes` — gated behind the tool toggles, and
    written to the *contract* shape the skills reform (Phase A of
    [AGENT_SKILLS_REFORM.md](AGENT_SKILLS_REFORM.md)) defines, so they are
    usable by a 4B model.
15. **AI generation**: "make a map of these notes" — the agent proposes a tree,
    the user accepts or edits it. Every mainstream tool now has this; the
    differentiator here is that the nodes are *the user's real notes*, not
    invented text.
16. **Export**: PNG and SVG from the existing canvas render, and PDF via the
    same path the app already uses for "Print or save as PDF" in the documents
    kebab. Also **Markdown outline**, **OPML** and **FreeMind `.mm`** — the
    interchange formats every mindmapper (Coggle included) reads — cheap, and
    it makes the feature not a lock-in.
17. **Import**: OPML, FreeMind `.mm` and indented Markdown, so an existing map
    can come in.

### Phase 5 — utility
18. **Focus mode** (Kumu): start at one node, reveal the network step by step.
19. **Filter/perspective**: colour or hide by tag, category, age, or "has a
    note behind it" — reusing the notebook's own metadata, which is the thing
    a general mindmapper cannot do.
20. **Map metrics** where they are honest: node count, depth, orphan branches,
    and — for cross-linked maps — the centrality measures the graph tab already
    computes.
21. **Templates**: a few starting shapes (brainstorm, decision tree, project
    breakdown, cause-and-effect), because an empty canvas is the main reason
    mindmap features go unused.

## 6. Files this will touch

- `src/memorymap/core/database.py` — board `type`/`layout`, node `parent_id`,
  new `kind` values. One Alembic migration.
- `src/memorymap/api/routes_whiteboard.py` — map CRUD, layout endpoint, node
  tree endpoints, export; extend `_board_preview` for map structure.
- `src/memorymap/ai/tools*.py` — the four map tools, contract-shaped.
- `frontend/whiteboard.js` (and `frontend/graph.js` for layout precedent) — the
  map mode, keyboard editing, auto-layout, collapse.
- `frontend/library.js` — the Maps filter and the upgraded preview.
- `frontend/app.js` — `mapChip()`/`mapPreview()`, the `@` picker source, chat
  attachment, dashboard widget, timeline row.
- `docs/DESIGN.md` — the node/edge visual language, once, so it is not
  reinvented per surface.

## 7. Acceptance

- A map created from three notes shows those notes as nodes; editing a node
  edits the note; deleting the map leaves the notes intact and deletes only its
  own topics (test first).
- The same map appears as a chip in a note, in a chat message, in the graph, in
  a dashboard widget and on the timeline — all drawn by one renderer.
- `read_mindmap` returns an outline a 4B model can act on, verified against a
  real local model (the standing caveat in CLAUDE.md applies).
- Export produces PNG, SVG, PDF, Markdown and OPML; OPML round-trips through
  import.
- Keyboard: Tab/Enter/arrows build a twenty-node map without touching the mouse.

## 8. Risks

- **Two linking levels** (§3.3) — decide the rule before building, or the graph
  fills with noise.
- **A second concept-map feature.** Check task #7 and #103 first; merging is
  almost certainly right.
- **Layout performance** on a large map — the whiteboard already had "shapes
  and links lag behind notes when panning" (task #71); auto-layout must run off
  the paint path.
- **Scope.** Phases 1-3 are the user's actual request; 4-5 are where a
  mindmap becomes worth having. Ship 1-3 completely before starting 4.

## Sources

- [Kumu](https://kumu.io/) · [Kumu — network mapping](https://kumu.io/markets/network-mapping)
- [Best Mind Mapping Software for 2026 — ClickHelp](https://clickhelp.com/clickhelp-technical-writing-blog/best-mind-mapping-software/)
- [The 12 Best Mind Mapping Tools and Apps — Storyflow](https://storyflow.so/blog/best-mind-mapping-tools-2025)
- [Canvas Mindmap — Obsidian plugin](https://community.obsidian.md/plugins/canvas-mindmap)
- [Mind mapping with Excalidraw in Obsidian](https://www.zsolt.blog/2021/09/mind-mapping-with-excalidraw-in-obsidian.html)
- [Spatial canvases and your notes](https://tfthacker.substack.com/p/spatial-canvases-and-your-notes)
- [d3-hierarchy `tree()` — Reingold–Tilford](https://d3js.org/d3-hierarchy/tree) · [d3-flextree](https://github.com/Klortho/d3-flextree)
- [Radial tree component — Observable](https://observablehq.com/@d3/radial-tree-component)

## 9. Built — Phase 1 (backend)

Moved to HISTORY.md ("Moved from the plans, 2026-09-09", MINDMAP_PLAN.md) on 2026-09-09: a plan holds open work only.

## 10. Built — Phase 2 (frontend)

Moved to HISTORY.md ("Moved from the plans, 2026-09-09", MINDMAP_PLAN.md) on 2026-09-09: a plan holds open work only.

## 11. Built: the previews, Phase 4 and Phase 5

Moved to HISTORY.md ("Moved from the plans, 2026-09-09", MINDMAP_PLAN.md) on 2026-09-09: a plan holds open work only.

## 12. The map as its own tool (INBOX 93, the owner's ask, 2026-09-09)

The owner: "the mindmap needs more specialised and targeted controls, yes
it is built off the whiteboard but it isn't the whiteboard ... it doesn't
need to stop at Coggle, it can straight up copy, merge and make better
many mindmap software." This section is the complete spec: every bug and
missing feature the owner named, every feature worth taking from Coggle,
XMind, MindMeister, MindNode, Freeplane, Miro and Whimsical, and the
things a notebook-native map can do that none of them can. Two sessions,
Opus, one worktree, each phase gated by `scratchpad/ui-sweeps/mindmap.js`
extended with the numbers named.

### 12.0 Decisions made (do not remake)

- **A whole-map tidy frames the map again, and only when it has to**
  (decided 2026-09-13, the option the seventh run left open). Auto-arrange
  is a command and not a constant, so nothing frames on its own; but a
  command that leaves the trunk off the canvas has not finished. Measured
  at 390x844 before this: after a tidy the root's box sat at x=-95 and
  `elementFromPoint` at its centre returned the shell behind the canvas.
  So a tidy with `onlyBranch` null calls `wbZoomToFit` when, and only when,
  some node's rendered box is outside the container. A branch tidy is the
  silent half of pressing Tab and never moves the view, and a tidy whose
  result already fits leaves the view alone. Gated by
  `scratchpad/ui-sweeps/maptidy.js`, 5 checks at 1440x900 and at 390x844.

- A map is a board of `type: "map"`; it keeps the whiteboard's storage,
  undo, export and previews, and gets its **own toolbar, its own context
  menus and its own keys**. The whiteboard's tool rail is hidden on a map;
  nothing of the whiteboard's chrome shows unless it applies to a map.
- **A map is never empty and never stuck.** Deleting the last node leaves
  a root placeholder ("Untitled map, type to start"); the toolbar always
  has "Add topic", "Add sub-topic", "Add sibling" enabled for the
  selection; a collapsed branch shows a count badge that reopens it on
  click and on Space.
- Every node action is reachable three ways: the node's edit strip, the
  right-click radial, and a key. The keys are the industry's: Tab child,
  Enter sibling, Shift+Enter above, Delete removes the node and re-parents
  its children, Shift+Delete removes the branch, F2 edits, Space toggles
  collapse, arrows walk the tree, Ctrl+D duplicate, Ctrl+Shift+arrows
  move within siblings, Alt held turns adds into removes (Coggle).
- Styling is per node and per link and is stored in `data` (shape, fill,
  border, text size, weight, alignment, icon, image, link style, link
  label position), with **inheritance down the branch** and "Reset to
  branch" on any node; the theme picks defaults, never overrides a
  choice.
- Layouts: tree right, tree left, both sides (Coggle), org chart down,
  logic chart, fishbone, timeline (XMind), radial (MindNode); a branch
  can override the map's layout; auto-arrange is a command, not a
  constant, so a hand-placed node stays put until asked.
- Everything the map shows is in the tree endpoint and the FreeMind and
  OPML exports round-trip; a feature that cannot round-trip is not built.
- **The last topic cannot be deleted; clearing the map is offered
  instead** (the owner asked directly: "should the user even be able to
  delete the primary core node??"). A map with no nodes is a dead end by
  construction: every add gesture hangs off a node that is already there,
  so removing the last one removes the way to make the next one. Refusing
  the delete is a smaller surprise than silently recreating a root under
  the same name, and "clear the map" says what it does, so the refusal
  carries that action: it takes the whole map away and leaves one blank
  topic ready to type into. Enforced at both delete paths (the map's own
  subtree delete, and the generic object delete the Delete tool, the
  context menu and the selection bar use), because a rule enforced at one
  of two doors is not a rule.
- **Multiple roots are allowed** ("should the user be able to make
  multiple main core nodes??"). Yes: real maps have several trunks, and
  nothing in the code has ever assumed one, `wbMapIndex` returns a list of
  roots, the tidy pass lays out a forest, and Enter on a root already adds
  another root. So this is a decision to keep and to surface, not to build:
  "Add topic" in the map dock adds a top-level topic whatever is selected,
  which is the only visible way to make the second trunk.
- **There is no "sub core" node type** ("sub core nodes??"). A node with
  children *is* the sub core: it already draws larger than its leaves
  through the branch colour and the depth it sits at, and its subtree
  already collapses, tidies, transplants and exports as a unit. A third
  tier would be a concept the data model does not have (`parent_id` and
  `kind`, nothing else), and every export format this plan commits to
  round-tripping (FreeMind, OPML, Markdown outline) has no way to carry
  it, so it would be a decoration that vanishes on the first export.

- **Space keeps the pan; `C` folds a branch; Space works on the fold
  control itself** (left open by the previous run, decided here). Held space
  is this canvas's pan gesture from every tool (`wbZoomFilter`) and a map
  node is selected nearly all the time once someone is editing, so binding
  Space to collapse would take the pan away exactly when it is most used and
  would make a map pan differently from a board, which is the opposite of
  "the mindmap can keep important and usable parts of the whiteboard". So
  the key on the canvas is `C` (bare, beside Tab, Enter, F and the arrows;
  `c` is not a tool key), and §12.1 item 7's "reopens on click and on Space"
  is met where it actually reads as a button: with the keyboard focus on a
  node's chevron or on the dock's Collapse button, the Space handler stands
  aside and the browser's own activation folds the branch.
- **A node carries its colour on its own card, so a trunk can set one.** The
  previous run disabled the picker on a root because "a colour paints only
  the line coming into a node and a root has no incoming line". That is true
  of the edge and false of the card: `wbPaintMapNode` writes `--wb-branch` on
  every node and `.wb-map-node` already draws it as the 4px spine down the
  leading edge, so a root's colour was drawn all along and only the control
  refused to set it. It does not cascade: the roots' children are the
  first-level topics and start the palette over by design, which is Coggle's
  rule, so a trunk's colour marks the trunk and every branch under it keeps
  its own. The picker's title says which of the two it is doing.

- **A picture in a topic is one of this notebook's own uploads, through
  `/media/upload`, and nothing else** (§12.1 item 2's fourth, decided 2026-09-21
  while building it). The plan said the item "needs the board's upload path",
  and it turned out there is exactly one to need: a board image, a picture
  pasted onto a board and a note's own attachment all already POST to
  `/media/upload`, which is what runs the captioning, the text extraction and
  what the Library's orphan sweep counts. So no route was added; the node
  stores the url that path hands back, in `data.image`, held to the same
  `MEDIA_URL_RE` allowlist an image *object*'s url is, by a validator on the
  field rather than at the endpoint, because the two XML imports write into
  `data` through the same model and a `_image` attribute in a file somebody
  was sent is exactly the door an off-origin url would come through.
- **Taking the picture out of a topic leaves the upload alone.** The file is in
  the Library and a topic is one of the places it can appear, not its home; a
  delete of the bytes from a menu whose every other entry is about this node
  would be a delete nobody asked for. For the same reason `image` is *not* in
  the list "back to the branch" clears (`WB_MAP_STYLE_KEYS`): reset's whole
  promise is that it is the safe way out of an over-decorated topic, so it
  drops looks and never content. It is in the list a *copy* carries, because a
  copied branch that lost its pictures would be the other half of that mistake.
- **A bend on a line is two fractions of that line's own length, not two board
  coordinates** (§12.1 item 5's third, decided 2026-09-21 while building it).
  The plan named the cost correctly: a tree edge has no row, so it is two
  `data` fields on the child, `edge_bend` (across the line) and `edge_slide`
  (along it from the halfway mark). They are fractions in the frame the line
  defines because the frame is rebuilt from the anchors on every read: a pair
  of coordinates would be right until either end moved, which on a map that
  tidies itself is one gesture later, and the same pair would mean a different
  shape after an export and an import at another size.
- **The waypoint composes with all three line shapes, each in the way that
  shape can**: the curve passes through it (its two control points move 4/3 as
  far, which is what puts the handle *on* the curve at t = 0.5 rather than near
  it), the straight line kinks at it, and the elbow moves its turn to it,
  clamped between the anchors so a right angle cannot double back. The tapered
  ribbon the default curve is drawn as reads the same four points, so the
  control is not one that does nothing on most of a map.
- **A line's two controls sit side by side on it, and the handle is revealed by
  pointing at the line as well as by selecting a topic.** Both of these are
  answers to something measured rather than reasoned: the mid-line `+` was at
  the same point as the handle and, being HTML above the SVG and invisible but
  still taking the pointer, swallowed the drag outright, so it now steps 26
  units along the line; and the map strip opens 44px above the selected topic
  and is several hundred pixels wide, so for a child laid out a little below
  its parent it lands exactly on the middle of the line into it
  (`elementFromPoint` at the handle's centre returned the strip). Hover needs
  nothing selected, so it needs no strip.

### 12.1 Phase 6a, the controls (1 session)

1. **The map toolbar** (replaces the whiteboard rail on a map): Add
   topic, Add sub-topic, Add sibling, Delete, Collapse/Expand branch,
   Layout ▾, Style ▾ (theme, branch colours, line style), Insert ▾ (note
   card, image, link, icon, boundary, summary, relationship), Arrange
   (auto, tidy siblings, centre root), Focus, Present, Export ▾, and the
   undo pair; seven visible at most, the rest in ▾ menus, per the dock
   grammar. **Part of this is built**: the board-only sections (draw,
   shapes, the free adds) are hidden on a map and the map's own Topic and
   Branch sections carry add topic, add child, add sibling, collapse,
   branch colour and focus; the layout picker and Tidy are still in the
   top bar, and the Style, Insert, Arrange, Present and Export menus are
   not written. See `agent-remaining/mindmap.md` for the measured numbers
   and the rest of the list.
2 to 9. **Built, 2026-09-12**: the node edit strip, the node radial, the
   link radial, the mid-line add, the text-size grip, uncollapse, drag to
   transplant and sever. Moved whole to HISTORY.md ("Moved from the plans,
   2026-09-12", MINDMAP_PLAN.md §12.1 items 2 to 9); a plan holds open work
   only. What is left of those eight, with the reason each was left:

   - **An image in a node** (item 2's fourth) and **the control points on a
     curve drag to reshape it** (item 5's third) were both built on
     2026-09-21. Moved to HISTORY.md ("Moved from the plans, 2026-09-21",
     MINDMAP_PLAN.md §12.1 items 2 and 5): a picture is `data.image`, a
     `/media/upload` url, drawn as a second node shape (`data-body="picture"`,
     measured 182x102 inside a 200x138 card, 12/12 in
     `scratchpad/ui-sweeps/mindmapimage.js`); a bend is `edge_bend` and
     `edge_slide` on the child, two fractions of the line's own length, with a
     handle measured 0.2 to 0.4 board units off the path for all three line
     shapes (14/14 in `scratchpad/ui-sweeps/mindmapcurve.js`).
   - **Comment on a node** (item 3's sixth) is §12.2 item 6 and belongs
     there, not here.
   - **Line thickness** (item 4's "style") was not built: the three shapes
     and the dash carry the distinction, and a fourth axis on a 2px line is
     a setting nobody can see.
   - **Shift+drag off a node to sever** (item 9's second gesture). Sever is
     on both rings; the drag gesture would collide with drag-to-transplant,
     which took the same pointer.

Gate: every action reachable by strip, radial and key (mindmap.js counts
the three routes per action); an empty map recreates a root; 0 console
errors; export/import round-trip of a map using every feature.

**The gate's round-trip half is met** (2026-09-12, sixth run): everything the
strip and the two rings write is in the FreeMind and OPML exports and comes
back through both imports, and the two rings stay inside the canvas at any
viewport. The account, including which field each format has an honest home
for and which ride as private attributes, is in HISTORY.md ("Moved from the
plans, 2026-09-12", "what the sixth run closed behind items 2 to 9"). What is
still open of §12.1 is item 1's four dock menus and the three sub-items above
that are still open (the comment, which belongs to §12.2, line thickness, and
the shift-drag sever).
**Node shape is built too** (2026-09-12, same run): four shapes, decided in
§12.0 and recorded in HISTORY with the rest.

### 12.2 Phase 6b, structure and richness (1 session)

1. **Boundaries** (XMind): a shaded background shape around a branch or
   a lasso'd set, with a label, a colour and a style (rounded, cloud,
   dashed); moves with its nodes.
2. **Summaries** (XMind): a bracket beside a set of siblings with a
   summary node.
3. **Relationships**: a cross-link between any two nodes with an arrow
   and a label, curved, dashed by default so it reads as secondary.
4. **Markers and task info**: priority 1 to 5, progress 0 to 100, flags,
   due date (a reminder can be created from it), a checkbox; filter the
   map by marker; the outline view shows them as columns.
5. **Notes on nodes**: a text note behind a node (the small marker
   opens it); a node that is a notebook note shows the note's own text
   here, editable both ways.
6. **Comments** (MindMeister): a thread per node, count marker.
7. **Multiple roots and floating topics**; **numbering** of branches
   (1, 1.1, 1.1.1) as a toggle; **auto-colour by branch** as the
   default theme with eight curated palettes.
8. **Outline view** beside the map (a two-pane split): the same tree as
   indented text, editable, Tab and Shift+Tab re-parent, every edit
   mirrored live.
9. **Presentation mode** (MindMeister): step through branches with the
   arrow keys, each step zooming to a branch; Escape ends.
10. **Export**: PNG at 2x with the theme, PDF, SVG, FreeMind .mm, OPML,
    Markdown outline, plain-text outline; **import** by drop of .mm,
    .opml, .txt outline or Markdown, and from XMind's .xmind (its
    content.json) read-only.
Gate: mindmap3.js extended with one check per feature; the 201-node map
keeps 60 fps pan (measured with the frame probe); round-trip of every
export that claims it.

### 12.3 Phase 6c, what only a notebook can do (½ session)

1. **Nodes are notes**: any node can become a note (and stays linked); a
   note dragged from the Library becomes a node with its card; the map
   node and the note title edit each other.
2. **Grow with the AI**: on any node, "Suggest branches" proposes five
   children from the notebook (grounded, with the source note on each),
   "Expand from my notes" fills a branch from search results,
   "Summarise this branch" writes the parent's note.
3. **From a question**: "Make a map of..." in chat proposes a map
   (exists, Phase 4) and now opens it in the map editor with the
   proposal as floating topics to accept or discard.
4. **Graph sync**: a map's cross-links become graph links (kind "map");
   the graph's "Mind map" selection action (Phase 4) opens here with the
   layout pre-chosen.
5. **Study mode**: hide all but the root, reveal a branch at a time,
   with a "recall" prompt before revealing (the note's own text is the
   answer); progress stored per map.
Gate: each AI action grounded (its sources listed) and faked in tests;
the study mode measured on a 40-node map.

### 12.4 Not built until asked

Real-time collaboration, cloud sync, voice-to-map, AI image generation
in nodes.

### 12.5 One place per action (INBOX 200 and 201, the owner, 2026-09-13 night)

The owner reopened this section's ring: "especially with the mindmap, it
needs a lot of ux and usability improvement, like the way the controls are
available, what controls and tools are available and where, and how the item
radials are used is confusing and doesnt feel clean", and "I want more and
better ways to differentiate core idea nodes in the mindmap".

The audit that this is written from is in
[`agent-remaining/mindmap.md`](agent-remaining/mindmap.md), measured by
`scratchpad/ui-sweeps/mapaudit.js` on a map of twelve topics: **112 controls
across six surfaces**, add-a-child reachable from five places, a fold from
four, a colour from four, six actions reachable only from a ring nobody finds
by accident, and a node context menu that was **dead code on a map** (the
right-click opens the ring and returns before the menu is built).

#### Decisions made, 2026-09-13 night (do not remake)

- **One place per action, and three surfaces with one job each.** The **ring**
  is what you do to *this topic from here*; the **strip** is how the topic and
  its line *look*; the **dock** is what you do to the *map*. An action that
  was on two of them loses one. Gated by `scratchpad/ui-sweeps/mapplaces.js`,
  which maps every control id to the edit it writes and fails on a repeat.
- **The ring is six slots, each with its word drawn**: add child, add beside,
  fold, delete, connect, more. Not eight icon-only discs, which is a memory
  test; not a ring that grows with the feature list, which is how it got to
  eight. A slot is a 7rem pill placed with `left`/`top` from the radius (the
  press cue owns `translate`, `tests/test_ui_recipes.py`), so the six sit at
  60 degrees on one circle over the opaque band from `ab70d9b`.
- **The ring and the strip are never open at once.** They answer two questions
  about one topic and were both placed from its box, which produced a strip
  shoved 136px clear of the ring or drawn across it (INBOX 114). The ring
  takes the node while it is open; the strip comes back when it closes.
- **What left the ring went to the topic's own menu, not away**: tidy this
  branch, copy this branch, add from the library, cut free of its parent, and
  where the topic points. The menu now carries every action a topic has, the
  ring's six included, and it is reachable from the ring's **More** slot and
  from the ContextMenu key (Shift+F10), because a right-click on a map node
  belongs to the ring.
- **Every ring slot is also a key**: Tab, Enter, C, Delete, Shift+C (connect,
  which is the board's own connector chord) and Shift+F10. The ring's caption
  says the first four at rest, so the ring reads as a shortcut rather than as
  the only way in. Proved without a pointer: `mapplaces.js` builds a five-node
  tree from the keyboard.
- **The line ring keeps only what is not a look**: reverse, label, cut. Its
  dash and its colour wrote the same two fields the strip's own controls do
  (`edge_dashed`, `color`), and its three line shapes are a look, so they are
  one picker in the strip now.
- **A map does not show the board's Insert and Arrange menus.** The dock
  already hides thirteen board-only tools on a map; the top bar was offering
  the same things again. Insert places a sticky, a text box, a shape or a bare
  note card, none of which a tree can hold; Arrange aligns and re-orders by
  hand, which is the layout's job. Measured: 60 controls in a map's top bar
  before, 40 after.
- **A core idea is told apart three ways at once**: the ellipse, a filled
  ground in the branch colour with contrasting text, and one step larger type,
  with a star before the label. One toggle in the strip sets all of them
  (INBOX 201: "more and better ways to differentiate core idea nodes"). A
  border alone was the old answer and it is the one a map full of coloured
  branches cannot carry.
- **The empty map says how to start.** One line under the templates card, gone
  on the first topic added and never shown again.

## 13. The map, read against its six complaints: measured 2026-09-21, phases open

The owner, INBOX 305: "the mindmap needs A LOT of improving. Tools and
utilities are really awkward to use and dont show themselves how id expect,
there are two types of connections, it is really confusing to access and use
features and utilities, they are hard to find and figure out how to use, they
are unintuitive, the ui needs improving, the mindmap is slow, the
customisation features are lacking severely and it just feels really unclean
and unprofessional."

That is six complaints, and this section is a read rather than a redesign:
the complaint is broad, and a redesign built on a guess is this project's
most expensive recurring mistake. Every number below was taken in a real
Chromium against the branch head on 2026-09-21, at 1440x900 in light unless
another width is named. **Nothing here is carried over from a previous
session**; where a previous session's figure is quoted it is labelled prior
and was re-taken.

**What the map surface is for, decided here so the phases cannot drift.**
This is a notebook's thinking surface, not a diagram editor. The person using
it is laying out what they already know or are working out, and the map's
whole claim is that the structure in their head is on the screen with as
little ceremony as possible. So "professional" here means a map they would be
content to put in front of somebody, and "improved" means fewer decisions per
topic, not more controls: nothing in the phases below adds a control to the
canvas that a thinker did not ask for, and an affordance that belongs to one
topic is sized like one topic.

### 13.1 Is it slow? The one claim measured before anything was designed

`scratchpad/ui-sweeps/mapperf.js`, registered in `scripts/gate.sh`'s sweep
list. Maps of 50, 200 and 500 topics built through `/whiteboard/boards/import`
(a route a person has, from the Board menu) so the figures are the cost of
*having* the nodes rather than of adding them. Frame deltas come from a rAF
loop running in the page across a real `page.mouse` gesture, so a blocked main
thread shows up as one long frame, which is what it is.

| Topics | Open to painted | `wbMapIndex` | `wbMapTidyPositions` | `renderWhiteboard` | Pan, median / worst | Drag, median / worst |
| --- | --- | --- | --- | --- | --- | --- |
| 50 | 371.5ms | 0.0ms | 2.9ms | 60.5ms | 16.7 / 33.3ms | 16.7 / 66.6ms |
| 200 | 906.4ms | 0.1ms | 16.7ms | 281.4ms | 16.7 / 50.1ms | 16.7 / 416.5ms |
| 500 | 3608.8ms | 0.1ms | 76.8ms | 1282.4ms | 16.7 / 133.4ms | 16.7 / 1583.3ms |

**Re-measured on the same probe after 13a** (2026-09-21, same machine, same
Chromium, one run each; the 500 row's before figures in this second table are
that run's own baseline, taken minutes earlier, not the numbers above):

| Topics | Open to painted | `wbMapTidyPositions` | `renderWhiteboard` | Pan, median / worst | Drag, median / worst |
| --- | --- | --- | --- | --- | --- |
| 50 | 371.5 to **314.2ms** | 2.9 to **0.1ms** | 60.5 to **23.3ms** | 16.7 / 16.8ms | 83.3 to **16.8ms** |
| 200 | 906.4 to **714.2ms** | 16.7 to **0.3ms** | 281.4 to **123.2ms** | 16.7 / 50.1ms | 416.6 to **33.3ms** |
| 500 | 3443.3 to **2049.1ms** | 76.3 to **0.6ms** | 1279.2 to **543.0ms** | 16.7 / 133.4ms | 1650.0 to **66.8ms** |

**Re-measured a third time, after 13a-open** (2026-09-21, same machine, same
Chromium, the probe's own five new numbers). The before column is that run's
own baseline, taken from the merge head on a second server minutes earlier,
not the tables above; `renderWhiteboard` is now measured after a change,
because a differential render timed against nothing measures the skip:

| Topics | Open to painted | Render, one topic moved | Render, every topic | Render, nothing changed |
| --- | --- | --- | --- | --- |
| 50 | 314.0 to **393.1ms** | 22.6 to **7.9ms** | 27.7 to **16.6ms** | 23.7 to **10.5ms** |
| 200 | 757.0 to **537.2ms** | 122.6 to **19.8ms** | 138.5 to **53.5ms** | 112.2 to **19.4ms** |
| 500 | 2022.3 to **965.6ms** | 534.7 to **47.8ms** | 540.2 to **149.1ms** | 509.4 to **45.3ms** |

And the gesture the same run takes, before and after, at 500 topics: pan
16.7ms median and 133.4 to 150.0ms worst, drag 16.7ms median and 66.6 to
66.7ms worst, and one branch drag over 300 link sketches **1,000.0 to
116.7ms** worst (66.7ms without the links, both before and after).

The 50-topic open is slower after the pass than its own baseline was: at that
size the open is not the render at all (7.9ms of it), it is the tab switch,
the fetch and the fit, and the spread between two runs of it is bigger than
anything this pass changed.

**Zoom, measured for the first time** (nothing in this repository had ever
taken it, and 13.1 reading 1 predicted it): six ctrl-wheel steps out and six
back in, at 500 topics, **16.7ms median and 166.7ms worst**, against 16.7 and
133.4ms on the same head before this pass, which is one frame of this
machine's spread either way. The prediction is confirmed: a zoom
changes the scale of one promoted layer holding every topic, the browser
re-rasters it, and no amount of making the render cheaper touches it, because
no script runs on those frames. That is 13a-view.

**One edge of the zoom control, found while measuring it.** d3-zoom multiplies
a wheel delta by ten when ctrl is held, because that is how a browser reports
a trackpad pinch. A trackpad sends a few units a notch and gets a smooth
1.1x; a mouse wheel sends 120 and gets **5.3x a notch**, so two notches take a
map from 1x to the 4x ceiling or to the 0.1x floor. Nobody has reported it and
it is not this pass's work, but it is the likeliest reading of a zoom that
"jumps" on a machine with a real mouse.

**The claim is true, and it is one thing.** Four readings settled it, and 13a
found that the third and fourth name two different bugs, not one:

1. ~~**Panning is not slow at any size.**~~ **Withdrawn, 2026-09-21.** The
   median frame is 16.7ms at 50, at 200 and at 500 *in most runs*, and the
   reading above treated one run as the answer. The owner, after this section
   was written: "the mindmap is still insanely laggy to pan around, move
   objects, and zoom." Re-measured with
   `scratchpad/ui-sweeps/mapmidpan.js`, panning a 500-topic map is
   **bimodal on the same machine**: five runs of the identical gesture gave
   16.7, 16.7, 116.7, 133.3 and 150.0ms per frame, and the slow runs are not
   explained by the tool or the button (the Hand tool with the left button
   measured both fast and slow, as did the middle button from Select). Under
   the CPU profiler the whole 30-move gesture spends **under 10ms in script**:
   the time is the browser re-rasterising, and the three panned layers already
   carry `will-change: transform`, so what is being re-rasterised is one
   promoted layer holding every topic on the board. That is the render pass,
   13a-open, reached from a second direction. **What is settled** is that the
   pan *path* is not the bug: the middle button reaches the same d3-zoom
   behaviour through `wbZoomFilter` as the Hand tool, and the two measure the
   same in the same run, which `mapmidpan.js` now asserts as a comparison
   rather than against a budget that a fast run would always meet.
2. **The layout maths is not slow either.** 76.8ms to lay out 500 topics is
   a command a person pressed, and `wbMapIndex`, which every map action calls
   first, is free at 0.1ms. Neither is worth optimising.
3. **`renderWhiteboard` is the whole of the *opening***, and it grows faster
   than the node count: 8.1× the nodes buys 21× the render. 1,282ms is a full
   second of frozen tab per pass. **Corrected by 13a**: it is not what the
   drag pays. A CPU profile of the probe's own 500-topic gesture put
   `renderWhiteboard` at a twentieth of the drag's cost and
   `document.querySelector` plus `offsetWidth` at the top of the list, so the
   two halves of this section had two separate causes and reading 3 was
   carrying the blame for both.
4. **It lands on the user at the worst possible moment.** A second run of the
   probe recorded where in the gesture the worst frame falls: `dragWorstAt`
   **0.03**, three per cent into the drag. The 1.6-second stall at 500 topics
   is not the drop, it is the **pick-up**: the map freezes the instant a
   finger goes down on a topic, before it has moved. (`panWorstAt` 0.91, near
   the end, which is the settle after the pan.) A second 500-node run
   reproduced it: 1,616.5ms worst drag frame, 1,179.5ms render. **This
   reading was the one that mattered, and it was exactly right.** What the
   first frame of a drag does is capture the branch under the topic and move
   it once, and every part of that was written per member: a board scan to
   find each one, a rebuilt map index and three document-wide attribute
   queries per edge to find its lines, an element lookup per member per
   frame, and a `querySelector` plus a layout read for both ends of every
   edge. None of it was a render.

So: the map is slow to open and slow to touch, and both are the same bug.
Nothing else measured here is worth a phase until that one is fixed. **What
is not known is the owner's own map size**, and it changes which phase
matters: at 50 topics the stall is 67ms and nobody would write that sentence,
at 500 it is 1.6 seconds. That question is 13.6's first row.

### 13.2 The two kinds of connection

`scratchpad/ui-sweeps/maptwokinds.js`, 10/10. One map, one tree edge and one
free link between two topics that are both already in the tree, then the
running app asked what each offers. They are drawn by the same renderer and
look nearly alike, which is exactly why the difference had to be read off the
controls rather than looked at.

| | **Tree edge** (`parent_id`) | **Free link** (a link sketch) |
| --- | --- | --- |
| What it is | Not a row. It *is* the child's `parent_id`, so everything about it is stored on the child | Its own `whiteboard_sketches` row, `type: "link-straight"` or `"link-curved"`, naming both ends |
| Made by | Tab, Enter, the ring's Add child / Add beside, the node's own `+`, dragging a loose topic onto another | The rail's **Connect** section: Straight link (C), Curved link (Shift+C); and the ring's **Connect** slot, which picks the same rail tool |
| Right-click opens | The **link ring**, 3 slots: Reverse, Label, Cut | Nothing of the map's. The ring stays hidden (measured: `linkRingVisibleForFreeLink` false) |
| Its look is set from | The **topic strip**, 5 of whose 14 controls are the line's: thickness, dash, arrowhead, shape, and the topic colour it inherits | The **board's own context bar**, `wbContextKindOf` returns `"link"`: ink, caps, stroke. A different surface, with different words, for the same idea |
| Can be re-shaped | Yes: `edge_bend` / `edge_slide`, a waypoint dragged on the line (added this session) | No waypoint. The board's link has its own anchors and caps instead |
| Label | Yes, `edge_label` on the child, from the ring | Yes, `label` in the sketch's data, but no map control writes it |
| Survives Markdown / OPML / FreeMind export | **Yes**, all three: it is the indent | **No**, none of the three. `export_board` builds from `_build_tree(_map_objects(...))`, which walks objects and `parent_id` only. The tree endpoint does return `cross_links`; no exporter reads it |
| Counted in the map's own stats | Yes, as the tree | Yes, separately, as "Cross-links" |

**And one gesture produces either, decided by something invisible.**
`wbMapJoinByLink` reads the drop: if the target is not already in the tree,
the drag becomes a **re-parent** and a tree edge; if both ends are in the
tree, the same drag leaves a **free link**. Nothing on screen says which is
about to happen, and the two outcomes differ in whether the result exports.

**The judgement, with the cost of each direction.** The split is *justified in
the data* and *not justified in the controls*. A tree is a tree and a
cross-reference is a graph edge; XMind and Coggle both keep the distinction,
and collapsing `parent_id` into rows would be a migration of every map for no
gain a user can see. What is not justified is that the two have separate
control surfaces, separate vocabularies and different export fates:

- **Absorb the free link into the map's own grammar** (the direction this
  plan should take). The free link keeps being a sketch row; what changes is
  that on a map it gets the link ring rather than the board's context bar, its
  own word for what it is, and a line in the exports. Cost: an exporter change
  in all three formats (FreeMind has `<arrowlink>`, OPML has no natural place
  and needs a decision), plus the ring learning a second subject. Nothing
  migrates.
- **Absorb the tree edge into rows.** Cost: a migration of every map, the loss
  of the one property that makes the tree cheap to read, and every one of the
  seventeen `data` fields that currently ride on the child needing a new home.
  Refused.

### 13.3 What the surface offers, and by how many doors

Re-measured with `scratchpad/ui-sweeps/mapaudit.js` on the same twelve-topic
map the ninth run used, plus a route-split pass. **§12.5 has landed since that
audit, and most of its numbers are stale:**

| Surface | Prior (ninth run) | Now | |
| --- | --- | --- | --- |
| Top bar, on screen | 13 | **9** | 3 of the 9 are menu openers |
| Top bar, inside its menus | 47 | **60** | across five menus |
| Tool rail | 16 in 6 sections | **13 in 5** | Move 3, Map 3, Layout 7, Connect 2, Edit 3 |
| Topic strip | 13, box 810x38 | **14, box 959x38** | |
| Node ring | 8 slots, **no label drawn** | **6 slots, each a labelled pill**, 112x28 | the memory test is gone |
| Link ring | 8 slots | **3**: Reverse, Label, Cut | the five that were looks moved to the strip |
| The node's own row | 7 | 7 | |
| Context menu | 8 items, **none reachable on a map node** | **15 items, reachable** through the ring's More | |

So the ninth run's worst finding is fixed and the duplicate list is much
shorter. What the re-measurement found instead:

- **Two menus are built into a map's top bar with no opener on screen.** The
  Insert menu's **8 items** (sticky, text box, image, note card, rectangle,
  circle, arrow, connector) and the Arrange menu are both in the DOM and
  neither opener is among the 9 controls actually on screen. They are not
  reachable and not removed.
- **The rail's most connection-looking control makes the other kind.** The
  Connect section's two buttons, "Straight link (C)" and "Curved link
  (Shift+C)", are the only things on screen with the word Connect on them, and
  both make a **free link**. Nothing on the rail makes a tree edge; the tree
  is Tab, Enter, the ring and the node's `+`. This is where "there are two
  types of connections" is *felt*, as opposed to where it is stored.
- **Still one door only:** everything on the link ring (reverse, label, cut)
  needs a right-click on a line, which nothing on screen advertises; "Add a
  top-level topic", the only route to a second trunk, is the rail's Map
  section alone; "Open every folded branch" and the perspective legend are
  inside the View menu alone.

### 13.4 What can be customised, against what a map tool offers

Read off `MAP_STYLE_FIELDS` and the layout picker, then confirmed on screen.

**A topic, today (11):** colour, bold, italic, text size, alignment, icon,
shape (pill / rect / ellipse), core-idea flag, the spine down its leading
edge, a picture, a link out. **Its line (6):** label, shape (curve / elbow /
straight), dash, thickness, arrowhead, and a dragged waypoint. That is a
serious per-node set and it is not where the complaint is.

**The map as a whole is where it is thin.** Four layouts exist: tree sideways,
tree downward, radial, free. §12.0's own decision list promised eight, naming
"tree right, tree left, both sides (Coggle), org chart down, logic chart,
fishbone, timeline (XMind), radial". **Tree-left and both-sides are missing,
and both-sides is Coggle's signature.** Beyond layout, a map has no theme of
its own (no font choice, no branch palette a person picks, no line-style
default), no per-branch layout override, and no way to set a default for new
topics: every one of the eleven fields above is set one topic at a time, and
"Reset to branch" is the only bulk operation of any kind.

So "customisation is lacking severely" is right about the *map* and wrong
about the *topic*, and a phase that adds more per-node fields answers the
wrong half.

### 13.5 Clean and professional: the same measurements section 17 took

Gutters, rhythm, type scale, and whether the surface uses the app's tokens or
its own values. The token scales were resolved by giving a probe element each
value as a width, because `--space-N` is `calc(0.25rem * var(--density))` and
reading the property text hands back the calc, never a length.

| What | Reading |
| --- | --- |
| Topic card | 200x44 stored; padding 8px / 9.6px, gap 6.4px, radius 8.4px |
| Topic type | 13.6px, line height 18.36px, so 1.35 |
| Ring slot | 112x28, type 13.6px, radius 999px |
| Rail | 624x36, gap 4px, sitting 11.4px above the canvas floor, centred |
| Top bar | 1392x46, padding 4px / 6.4px, radius 14px |
| Rhythm, zoomed to fit | leaf-to-leaf gap 59.6px, depth-to-depth gap 56.7px at both levels read |
| Topic strip | **959.4 x 38**, opening 43.7px above the topic |

**The tokens are not the problem, and that is worth saying plainly**, because
it is the opposite of what section 17 found for the live view. Every padding
and gap read on the map's chrome is on `--space-1..9` (`offScale` empty). The
type is on the scale too: 13.6px is `--text-md`, the workhorse; the rail's
section labels are 11.2px, `--text-xs`. The radii are derived from the user's
own `--radius` of 14px: 8.4px is `--radius-md`, 999px is `--radius-pill`. A
sweep of the stylesheet will not find the problem.

**One number is the problem, and it holds at every width measured.** The topic
strip is 959.4px wide to describe a topic that is 95px wide on screen: **10.1
times the width of its own subject, and 67% of the window at 1440.** It does
not adapt:

| Width | Strip | Fraction of the window |
| --- | --- | --- |
| 1440 | 959.4 x 38 | 0.67 |
| 1024 | **959.4 x 38** (unchanged) | **0.94** |
| 390 | 348.4 x **150** (wrapped to four rows) | 0.89 |

At 1024 a bar of fourteen controls takes 94% of the window every time a topic
is selected; at 390 it becomes a 150px block, 18% of the screen height,
floating 44px above the topic it belongs to. That is the measurable half of
"unclean and unprofessional": the surface is built from the right tokens and
then assembled at the wrong scale. It is also why §12.1's own remaining list
already records the strip covering the handle of the line into the selected
topic: a control that wide has nowhere to go.

### Decisions made

1. **The render is the bug, and it is fixed before anything is designed.**
   No phase below 13a is worth starting, because every one of them would be
   judged through a one-second stall.
2. **The data keeps two kinds of connection; the controls stop having two.**
   `parent_id` stays. What changes is that a map's free link is spoken about
   in the map's own words, gets the map's own ring, and appears in the
   exports.
3. **The strip is sized like its subject.** A control surface for one topic
   does not take two thirds of the window, and it adapts below 1440 rather
   than keeping one width until the phone band wraps it.
4. **Customisation grows at the map level, not at the topic level.** The
   eleven per-topic fields are enough; the missing layouts and the absence of
   any map-wide default are the gap.
5. **Nothing is added to the canvas.** Per standing order 11, any new
   affordance comes from DESIGN.md's recipe index or arrives with its own
   recipe and lint in the same commit.
6. **A cross-link has no colour of its own** (taken 2026-09-21, building
   13c). It is drawn in `--muted`, dashed, whatever the rail's ink well held
   when it was drawn. The alternative was to keep the stored colour and give
   the ring a colour well, which would have let a person paint a cross-link in
   a branch's colour: two kinds of line that can be given each other's look
   are two kinds nobody can tell apart, which is the report this section
   exists for. The colour stays on the row, so an ordinary board still draws
   it and a map turned back into a board gets it back.
7. **The ring's middle slot promotes a cross-link to a branch** (taken
   2026-09-21, building 13c). The gesture that makes one or the other decides
   from whether the far end is already in the tree, which nothing on screen
   can say in advance without describing the tree; the honest answer is a way
   back afterwards, in the surface that already names both kinds.
8. **A map's theme holds the ten fields that describe how a map draws
   topics, and none of the ones that say which topic this is** (taken
   2026-09-21, building 13e). The question was asked once of each of
   §13.4's eleven: text size, alignment, bold, italic, the box, the bar on
   its edge, and the branch line's shape, thickness, dash and arrowhead are
   how *this map* draws; an icon, the core mark, a picture, a link out, a
   line's label and a line's waypoint are which *this topic* is. A map-wide
   default for the second set would not be a theme: "every topic is a core
   idea with the same picture" is a bug with a settings row in front of it.
   `color` is left out for a third reason, and it is the only one of the
   eleven that is: it is not one value but a rule, seeding a whole subtree,
   and the map-level answer to it is a branch palette, which is drawn twice
   (the canvas from d3, the Library thumbnail from `MAP_BRANCH_PALETTE` on
   the server) and would have to teach the preview cache about itself before
   anybody could pick one. That is its own row below, not a corner of this
   one.
9. **The theme is resolved when a topic is painted, never written onto the
   topics** (taken 2026-09-21, building 13e). A topic's own value always
   wins, and an explicit `false` is a value: so a topic that was decorated by
   hand cannot be changed by a map-wide setting, which is the single property
   that makes the setting safe to press. It also makes theming a 500-topic
   map one request rather than 500, and makes it reversible, since nothing
   was overwritten to reverse. The alternative, stamping the theme onto every
   topic at the moment it is chosen, was refused for both halves of that: it
   is the change that cannot be undone and the one that silently overwrites.
   The cost is that a topic cannot be pulled back to the *app's* own default
   for a field the map themes, only to another named value or to the map's.
   What that cost is **not** allowed to be is a control that visibly does
   nothing: every one of the strip's selects stores the app's default as no
   value at all, so its blank row is named after that default ("Rounded",
   "Line", "M"), and on a themed map choosing it means "follow the map" while
   the row still says "Rounded". So the blank row is relabelled to "As the
   map draws (pill)" while the map themes that field and put back the moment
   it stops, and the three toggles that stored "off" as nothing at all are
   three-state against the theme, which is the rule `edge_arrow` had been
   following alone. The remaining gap is recorded below rather than solved,
   because it needs a stored name for each app default and the case is narrow.
10. **The theme lives in one row of the View menu's Map section, and nothing
   is added to the canvas** (taken 2026-09-21, building 13e). Decision 5
   above, and §13b had just taken the topic strip from fourteen controls to
   five: a theme that arrived as a sixth control on the canvas would undo
   half of the section it belongs to. The row is the menu bar's own recipe,
   beside "Open every folded branch" and "What this map is made of", and it
   opens the recipe index's `.card.modal-card` through `wbInfoDialog`, whose
   body is that index's own two rows, a plain `<select>` for a dropdown of
   values and a `label.setting-check` for an on/off. Measured after:
   top bar 10, rail 0 and strip 0 on a map with nothing selected, unchanged.
   Every control saves as it is changed, the way the View menu's own
   background and grid already do, so there is no OK: a dialog of looks with
   an OK asks what you are agreeing to when what you want is to watch the map
   change behind it.
11. **"Reset to branch" and the map-wide reset are one idea at two scopes,
   not two ideas** (taken 2026-09-21, building 13e). The ring's reset drops
   one topic's own look so that it goes back to following what it inherits;
   with a theme, what a topic inherits is the map, so the same sentence said
   about every topic is the bulk operation §13.4 measured missing. Same list
   of fields (`MAP_CLEARABLE_FIELDS` on the server is `WB_MAP_STYLE_KEYS` in
   the client), same rule about a picture, one endpoint and one transaction
   for the reason `move-many` is one. Two buttons that meant nearly the same
   thing would be two things to learn and one of them would be wrong.
12. **Markdown carries no cross-links, and that is a decision rather than
   the work not being done** (taken 2026-09-21, building 13d). §13.2's table
   asked for a line in the exports and 13d's row said OPML and Markdown
   needed the decision made before the code. FreeMind has `<arrowlink>`, so
   it gets it natively. OPML is strictly a tree with no element for an edge
   that is not containment, so it gets the private-attribute treatment
   `_kind` and `_ref` already have: an `_id` per outline and `_links` on the
   one the link starts at, ignored by every other reader and read back by
   this one. Markdown gets nothing, for the reason `_export_markdown`'s own
   docstring already gives about style: that file's whole promise is an
   outline anybody can paste into anything. A "Cross-links" section after
   the outline would also be read straight back in by
   `_parse_markdown_outline`, which reads indentation and nothing else, so
   one map's two links would return as two topics. Two of three formats is
   the honest answer, and `maptwokinds.js` asserts both halves.

### Phases, each with the gate it is finished against

- ~~**13a. The render pass.** Make `renderWhiteboard` proportional to what
  changed rather than to what exists: the drag path must not rebuild every
  node to pick one up.~~ **The drag half is built, 2026-09-21**, and the
  record is in HISTORY.md ("Moved from the plans, 2026-09-21", "From
  MINDMAP_PLAN section 13a: the drag pick-up"). Worst drag frame on
  `mapperf.js`: 83.3 to **16.8ms** at 50, 416.6 to **33.3ms** at 200, 1,650.0
  to **66.8ms** at 500, under the 100ms the gate asked for, with the pan
  medians still 16.7ms at all three sizes and nothing worse at 50 than at 500.
  `tests/test_map_drag_cost.py` holds the nine shapes the profile found.
  **What is left of 13a is the open, and it is now its own row**: the drag
  pass carried `renderWhiteboard` from 1,279.2 to 543.0ms and open-to-painted
  from 3,443.3 to 2,049.1ms at 500 topics, because the render and the layout
  read the same topic boxes this pass stopped re-measuring, but the gate's
  other two figures (render under 200ms, open under 1s) are not met and will
  not be met by caching: `renderWhiteboard` is still a full d3 data-join over
  every node on the board, and making it proportional to what changed is a
  separate piece of work.
- ~~**13a-open. The render pass proper.**~~ **Built 2026-09-21**, and the
  record is in HISTORY.md ("Moved from the plans, 2026-09-21", "From
  MINDMAP_PLAN.md section 13a-open: the render pass"). Both gate figures are
  met at 500 topics: `renderWhiteboard` 534.7 to **47.8ms** after one topic
  moves and **149.1ms** with every topic changed at once, against the 200ms
  asked for, and open-to-painted 2,022.3 to **965.6ms** against the 1s asked
  for.
  The drag and pan figures are no worse. **What the row also predicted is not
  built and is now 13a-view below**: drawing only what is on screen. The open
  turned out not to need it.
- **13a-view. Draw the topics that are on screen.** The pan and the zoom are
  what is left of 13.1 reading 1, and 13a-open did not touch them: measured on
  `mapperf.js` after it, a 500-topic map pans at a 16.7ms median with a worst
  frame of 150.0ms and zooms at a 16.7ms median with a worst frame of 166.7ms
  (six ctrl-wheel steps out and six back in, the probe's new `zoom` column,
  and the first measurement of a zoom in this repository), against 133.4 and
  133.4 on the head before the render pass: the same numbers within this
  machine's spread, from a render eleven times cheaper. Both are the
  browser re-rasterising one promoted layer that holds every topic on the
  board, which is why neither moved when the render stopped rebuilding: no
  script runs on those frames at all. Gate: `mapperf.js` at 500 topics with
  the worst pan and zoom frames under 50ms, and `mapbranchdrag.js`,
  `maplayouts.js` and `mapstrip.js` unchanged, since a culled board must not
  lose the topic a gesture is reaching for. The open of a very large map is
  the second prize (a board that draws 80 topics instead of 500 opens in the
  time it takes to draw 80).

- **13g. The middle-button pan on the owner's own machine.** He reports, with
  13.1's own gesture: "the whiteboard and mindmap goes haywire and moves to
  the left when I try to move around by pushing down my mouse scroll wheel
  and moving the mouse to the edges of the screen, no matter which
  direction." **Not reproduced here**, and the two things that would explain
  it were each tested: `mapmidpan.js` drives a real middle-button drag in all
  four directions at 50 and 500 topics and the board goes the way the hand
  goes every time, and a pan whose release never arrives (window blurred
  mid-gesture) leaves the board still rather than following the pointer.
  What cannot be tested here is the remaining explanation and the likeliest
  one: **Chromium's middle-button autoscroll is a windowed-browser
  behaviour**, a headless run has none, so the `mousedown` guard that exists
  for it (INBOX 183, reasoned and never observed) is not exercised by any
  gate in this repository. Gate: this needs the owner, not a sweep. What to
  ask him for is which platform and whether the four-way autoscroll cursor
  appears when he presses the wheel; if it does, the guard is not reaching
  the event on his machine and the next thing to read is whether
  `#library-view-whiteboard` is really an ancestor of what he pressed on.
- ~~**13b. The strip is sized like a topic.**~~ **Built 2026-09-21**, and the
  record is in HISTORY.md ("Moved from the plans, 2026-09-21", "From
  MINDMAP_PLAN.md section 13b: the topic strip is sized like a topic"). The
  fourteen controls are behind three named doors, Text, Shape and Branch line,
  each the board menu bar's own recipe; the strip is **314 x 38** at 1440,
  1024 and 820 (0.22, 0.31 and 0.38 of the window, against a gate of a half)
  and 314 x 54 at 390, against 959.4 x 38 and 348.4 x 150 before. `mapstrip.js`
  39/39, `mapnarrow.js` 3/3, and `mapline.js`, `mapcore.js` and `mapspine.js`
  untouched at 13/13, 16/16 and 9/9. **What is left of 13b** is the one thing
  its gate asked that this did not measure: whether the strip still covers the
  handle of the line into its own topic. It is a third of the width it was,
  which makes it far less likely and does not make it false.
- ~~**13c. One vocabulary for two connections.**~~ **Built 2026-09-21**, and
  the record is in HISTORY.md ("Moved from the plans, 2026-09-21", "From
  MINDMAP_PLAN.md section 13c: one vocabulary for two connections"). Both
  kinds get the same ring, which names the kind it is on; the board's context
  bar never appears for a cross-link on a map; the rail says cross-link on a
  map and link on a board; a cross-link draws in the map's own ink, dashed,
  whatever the pen held, and is told it is one before it is first drawn rather
  than at the next reload. `maptwokinds.js` 10 checks to 16, **16/16**, six of
  which fail on the base branch. **What is left of 13c**: a right-click that
  lands on a selected cross-link's bend grip still does nothing (the grip
  takes the press), and nothing yet says which kind a drag is about to make
  *while* it is in flight, only after it lands.
- ~~**13d. A free link survives an export.**~~ **Built 2026-09-21**, and the
  record is in HISTORY.md ("Moved from the plans, 2026-09-21", "From
  MINDMAP_PLAN.md section 13d: a cross-link survives an export"). FreeMind
  carries it in its own `<arrowlink DESTINATION>` under the node the link
  starts at, with an `ID` on every node; OPML carries it in a private `_id`
  and `_links`, the bargain `_kind` and `_ref` already struck there; Markdown
  carries it in neither, by decision 12. Both XML formats round-trip
  (`test_a_cross_link_round_trips_through_freemind`, `..._through_opml`), a
  link whose far end is not in the file is dropped rather than left dangling,
  and a map with no cross-links exports byte-for-byte the file it did.
  `maptwokinds.js` 16 checks to 17, **17/17**, with the export check inverted
  as the gate asked.
- **13e. The map's own customisation.** ~~Tree-left and both-sides, the two
  §12.0 promised and Coggle is known for~~ **built 2026-09-21**, recorded in
  HISTORY.md ("Moved from the plans, 2026-09-21", "From MINDMAP_PLAN.md
  section 13e: the two layouts the plan promised"): both in the picker, in
  `BOARD_LAYOUTS` and in the tidy, 0 overlapping pairs at 12 and 200 topics
  in all five layouts, 5/6 and 93/106 either side of the trunk, `maptidy.js`
  5/5 at 1440 and 390, `maplayouts.js` new at 19/19 (5 failing on base).
  ~~**What is left of 13e is the other half: a map-level default for new
  topics.**~~ **Built 2026-09-21**, and the record is in HISTORY.md ("Moved
  from the plans, 2026-09-21", "From MINDMAP_PLAN.md section 13e: the map's
  own look"). A map now has a theme of ten of the eleven fields, resolved
  when a topic is painted so that a topic which was never told otherwise
  follows it and one that was keeps exactly what it was given; and "bring
  every topic back to the map" is the map-scope of the ring's own reset.
  `maptheme.js`, new, 24/24 in light at 1440, in dark at 1440 and at 390,
  against a base branch on which it stops at its second check
  (`wbMapTheme is not defined`). One request themes 25 topics; one request
  clears them. **What is left of 13e**: the branch palette and the font
  choice §13.4 also names, both of which are drawn in two places rather
  than one (decision 8), and the narrow case decision 9 records, a topic
  that cannot be pulled back to the app's own default for a field the map
  themes.
- ~~**13f. The doors that are built and shut.**~~ **Withdrawn 2026-09-21, and
  a different thing built in its place**, recorded in HISTORY.md ("Moved from
  the plans, 2026-09-21", "the two gestures a blank map did not answer").
  Re-measured: `wbSyncMapChrome` sets `hidden` on the Insert and Arrange wraps
  on a map, and that takes the menu inside the wrap with it, so their 8 and 10
  controls are neither drawn nor exposed to a screen reader. Dead markup on a
  map, not a shut door. What the counting *did* find is that a map's canvas
  answered neither of the two gestures anybody tries on a blank part of it: a
  right-click opened nothing and a double-click added nothing. Both now do,
  and `mapdoors.js` (7/7, 3/7 on base, in the gate's sweep list) holds them
  plus the door count and the naming rule. **What is left**: the Insert and
  Arrange markup is still in the bar for a map to carry, which is a tidy-up,
  not a user-visible bug.

### Not verified, and to be taken first by whoever opens this

- **The owner's own map size is unknown**, and it decides whether 13a is
  urgent or academic. At 50 topics the stall is 67ms; at 500 it is 1.6
  seconds. **Ask before building 13a.**
- **Every figure above is light mode.** Dark is unmeasured in this read.
- The timings are one machine, one Chromium, one run each except the 500-node
  row, which was run twice (1,583.3ms and 1,616.5ms worst drag frame). They
  are a shape, not a benchmark.
- **The strip is measured at 1440, 1024 and 390 only.** `boot()` defaults to
  1440 but takes `opts.viewport`, so other widths were reached by passing it;
  820 (the tablet band) is not read here.
- The free link was created through `/whiteboard/sketches` with the fields the
  connect drag writes, not by driving the drag itself. The row is the same
  shape; the drag's own hit-testing is not exercised.
- **Nothing here reproduces the owner's phrase "awkward to use".** The counts
  say where the controls are, not what it feels like to reach for one. 13b and
  13c are the two that can be judged by measurement; whether they are what he
  meant is a question, not a finding.

## Placed from INBOX, 2026-09-09

The owner's reports this plan owns, moved whole from INBOX.md with their numbers (never reused). Each becomes a phase row when its phase is written; until then this list is the phase.

24. **"New board" and "New mind map": same or different?** Decision: the
    dock grammar allows one filled button per dock, so one filled "New"
    button opens a two-row menu (Board, Mind map), each with its icon and a
    one-line hint. Two side-by-side filled buttons is the wrong answer.
    Owner: docks.md.

## Placed from INBOX, 2026-09-09 (the owner's evening batch)

- "in the all library subtab, the mindmap I made called bubble tea shows as
  a note" (two screenshots: the All list draws a "bubble tea" row with a
  note's pencil icon, while Boards & maps draws the same thing as a map
  with 3 nodes). The All view's kind test does not know about maps, so a
  map falls through to the note branch.
- "the boards and maps dashboard widget is ugly and needs fixing", and
  "also the ui at the top of the boards and maps subtab dock is broken and
  miss wrapped. remember responsive design!" (screenshot at ~2000px: the
  search box and sort/view controls on one line, then New board, New mind
  map, Map from notes, Import outline, refresh and help wrapped onto a
  second line below them, left-aligned under nothing).

## Placed from INBOX, 2026-09-13

177 (part). **Node styling this plan does not yet cover** (the owner, with
Coggle captures). Built already: the radial ring's visibility, 3px branches
with an arrowhead, the "Aa" grip's placement, topics as link-tool
candidates. Placed here:

- **Core nodes**: built. The strip's crown writes `core` on the node and the
  shape picker gained `ellipse`. Measured, `scratchpad/ui-sweeps/mapcore.js`,
  10/10 at 1440 light, 1440 dark and 390x844: the spine goes 4px to 6px, the
  outline 1px to 2px and the type 400 to 600 against a plain sibling, the
  ellipse computes a 50% radius with centred text, and the round trip through
  `/whiteboard/boards/<id>/tree` keeps `core` (the `WhiteboardObjectData`
  drop trap). The strip is 540px in a 1408px canvas at 1440 and wraps to
  348x102 in 364px at 390.
- **Per-node left edge**: built. The strip's second picker writes `spine`
  (`dashed`, `none`, absent for solid). Measured,
  `scratchpad/ui-sweeps/mapspine.js`, 9/9 at 1440 light, 1440 dark and
  390x844: 4px solid to 4px dashed to a 1px hairline at the same 55% alpha
  the other three sides carry, the label moving 3px with it; the choice beats
  a core node's 6px bar (6px to 1px) and the node stays core; a plain topic,
  whose box is transparent on purpose, is untouched (4px, label at the same
  x); downward the choice is on the top edge instead. A server restart was
  needed for the round trip to pass: the field is dropped by a stale process,
  which is the `WhiteboardObjectData` trap wearing its other hat.
- **Connection line styles**: built. `edge_width` (`thin`, `thick`) and
  `edge_arrow` (`on`, `off`) join `edge_dashed` on the child, and all three
  are in the strip's line group, which a trunk is not shown. Measured,
  `scratchpad/ui-sweeps/mapline.js`, 13/13 at 1440 light, 1440 dark and
  390x844: the ribbon goes 6.5 units at the parent to 11 thick and 3.6 thin
  while its sibling stays 6.5, the stroked shapes 3px to 5.1px, a head added
  to a ribbon takes its path from 50 to 53 points and its far end from 3.4 to
  11.5 units, a head comes off a stroked line as `marker-end: none`, and all
  three survive the round trip. The line group measures 0px on a trunk and
  1/117/28/28px on a child. The strip is now 853px inside a 1408px canvas at
  1440 and wraps to 348x150 inside 364px at 390.
- **Resize a topic**: built, commit `3c9b874`. Measured,
  `scratchpad/ui-sweeps/mapresize.js`: 170x44 dragged to 290x100, stored as
  `width` 290 / `height` 100 / `sized` true, still 290x100 after a tidy.

Each becomes a phase row when its phase is written; until then this list is
the phase.

## Placed from INBOX, 2026-09-21

305. **The owner, 2026-09-21, verbatim:** "the mindmap needs A LOT of
    improving. Tools and utilities are really awkward to use and dont show
    themselves how id expect, there are two types of connections, it is
    really confusing to access and use features and utilities, they are hard
    to find and figure out how to use, they are unintuitive, the ui needs
    improving, the mindmap is slow, the customisation features are lacking
    severely and it just feels really unclean and unprofessional."
    Plan-sized, and it names a structural problem rather than a list of bugs:
    "there are two types of connections" is the tree edge derived from
    `parent_id` sitting beside the free link, which this session added
    waypoints to tonight. Belongs in MINDMAP_PLAN as a measured read plus
    gated phases, in the shape DOCUMENTS_PLAN section 17 uses. "Slow" is the
    one claim that must be measured before anything is designed.
    **Placed 2026-09-21 into MINDMAP_PLAN section 13**, which carries the
    measured read, the decisions and the gated phases.
