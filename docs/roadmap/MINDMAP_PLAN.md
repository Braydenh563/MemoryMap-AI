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

**One naming note, flagged rather than guessed.** "kaggle" / "kaggle.it" does
not resolve to a mindmapping product — Kaggle is a data-science competition
platform. The closest matches by description are **Kumu.io** (relationship and
systems mapping, which is what the "bundled entity with its own attributes"
idea most resembles) and **Kinopio.club**. The research in §3 covers Kumu plus
the mainstream mindmappers; **confirm which tool was meant before building the
parts of §5 that lean on Kumu specifically.**

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

**Recommendation: B.** A board is already an entry; add a `type` and a
`layout` to it. Everything in §6 assumes B.

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
    kebab. Also **Markdown outline** and **OPML**, which is the interchange
    format every mindmapper reads — cheap, and it makes the feature not a
    lock-in.
17. **Import**: OPML and indented Markdown, so an existing map can come in.

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
