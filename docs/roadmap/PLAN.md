# The professional-grade plan — whiteboard, documents, backend, agent harness

**Read after [`../ROADMAP.md`](../ROADMAP.md) and [`HANDOVER.md`](HANDOVER.md).**
Asked for directly: *"make the documents text editor be the best one existing,
and same for the whiteboard. refine the backends, functionality and ui ux for
both... the app needs to shine and be usable professionally... make sure the
app isn't too device heavy. it needs to run VERY smoothly. FIX AND REDESIGN THE
BACKEND. MAKE IT THE ULTIMATE APP AND AGENT HARNESS... IF IT IS TOO MUCH, LAY
OUT THE FULL SCOPED PLAN FOR OPUS AND SONNET TO FOLLOW."*

This is that plan. Every item names the file it lands in, what "done" means,
and how to *measure* it — this repo's own rule (CLAUDE.md) is that a UI claim
without a measurement is a guess. Items are ordered by value ÷ risk within each
section; sections are ordered by what a working professional hits first.

Related, already settled — do not rebuild (HISTORY.md, HANDOVER.md):
Select/Hand/Lasso peers with Select as home; the contextual style panel; panels
clearing each other by measured size (`--wb-h-*`); copy/paste style; hand-tool
click selects; text-box drag; the Files rows; space-delete cascade; force
reload (Ctrl+Alt+R).

---

## 0. Performance and "not device heavy" (cross-cutting, first)

The app is local-first on the user's own machine, often beside a running
model. Every idle cost competes with inference.

| # | Item | Where | Done when / measure |
|---|------|-------|---------------------|
| P1 | **One poll loop, visibility-aware.** Reminders, model status, tasks and notifications each poll on their own timer (CLAUDE.md records a reminder poll running on *two*). Fold into one scheduler in `app.js` that backs off to ≥60s when `document.hidden`, and stops entirely on the lock screen. | `app.js` (search `setInterval(`) | `performance.getEntriesByType("resource")` over 60s idle on the dashboard shows ≤4 requests. Today: count them first and write the number in HANDOVER. |
| P2 | **Whiteboard: batch every per-frame DOM write through one rAF.** Drags already write transforms directly (good). `handleWbZoom` still calls `wbSyncGridToTransform` + `wbRenderNavigator` synchronously per wheel/pan event. Throttle both to one write per animation frame. | `whiteboard.js:183` | Chrome Performance panel: a 2s trackpad pan on a 200-item board shows no frame >16ms. |
| P3 | **Whiteboard: virtualise off-screen items.** `renderWhiteboard()` joins *every* node/sketch/object on every render. Skip (hide via `display:none`, keep the datum) items whose bbox is >1 viewport outside the current transform; re-check on zoom end. | `whiteboard.js:5700` (`renderWhiteboard`) | 1,000-item board: first paint <300ms, pan stays <16ms/frame. Build the 1,000-item board with the API in a test script and keep it. |
| P4 | **Documents: debounce the live renderer, cap markdown work.** Live mode re-renders the whole document per keystroke. Render on `requestIdleCallback` with a 120ms trailing debounce; render only the changed block when the change is inside one paragraph. | `documents.js` (`renderLive`/`syncDocScroll`) | 20k-word document: typing latency (keydown → paint) <30ms measured with `PerformanceObserver` "event" entries. |
| P5 | **Backend: SQLite pragmas and indexes.** Set `journal_mode=WAL`, `synchronous=NORMAL`, `temp_store=MEMORY` at connect; add indexes for the columns every list filters on (`workspace_id` is indexed; `Entry.is_deleted`, `Entry.category_id`, `Attachment.entry_id`, `PageRead(kind, source_id)` are not all). | `core/database.py` | `EXPLAIN QUERY PLAN` for `/entries`, `/media`, `/library` shows no `SCAN` on the main tables at 10k notes. |
| P6 | **Backend: never stat the disk in a list.** `size_bytes` now stats every upload on `GET /media` (added by request). Store it on upload and backfill once in a migration. | `routes_files.py` (`list_media`), `alembic/` | `/media` with 2,000 uploads <50ms. |
| P7 | **Embeddings off the request thread.** Confirm every embed happens in the background task queue, never inline in `POST /entries`. | `core/`, `ai/` | `POST /entries` p95 <80ms with the fake embedding backend disabled. |

## 1. Whiteboard — to the level of Miro / FigJam / tldraw

Structure is now right (peers, contextual panel, measured clearance). What
separates "works" from "professional" is fluency: the things you do fifty
times an hour must be one gesture.

| # | Item | Where | Done when / measure |
|---|------|-------|---------------------|
| W1 | **Multi-select marquee + shift-click on *everything*, with a group bounding box and 8 handles.** Marquee/lasso exist; group resize/rotate of a multi-selection does not. | `whiteboard.js` (`wbMultiSelection`, `nodeResizeDrag`) | Select 3 shapes, drag a corner: all three scale about the group centre. |
| W2 | **Smart connectors.** Links snap to the nearest of 4 anchor points on a card and re-route around the card they leave. Curved links get a midpoint handle. | `whiteboard.js` (`wbLinkPathD`, link drag) | Drag a card; its links stay attached at the anchor, never through the card body. |
| W3 | **Sticky notes as a first-class object** (colour presets, auto-sizing text, `N` shortcut). Today "text box" is the only text object and it is not a sticky. | `index.html` tools, `whiteboard.js` objects (`kind: "sticky"`), backend `WhiteboardObject.data` (no schema change) | Press N, click, type — a yellow sticky appears sized to its text. |
| W4 | **Frames/sections** — a titled rectangle that moves its contents with it and appears in the navigator and the board outline. | `WhiteboardObject kind:"frame"`, `wbApplyBulkMove` | Drag a frame: children move; export "this frame only" works. |
| W5 | **Alignment and distribution toolbar for multi-selections** (align L/C/R/T/M/B, distribute H/V, tidy-up). The properties panel already shows a multi-select row; put the six buttons there. | `wbUpdatePropertiesPanel` multi branch | Six buttons, each verified against computed bboxes in a Playwright test. |
| W6 | **Keyboard completeness**: arrow nudge exists; add Ctrl+D duplicate, Ctrl+G/Shift+G group (exists), `[`/`]` z-order, `Ctrl+Shift+H/V` flip, `Escape` cascades (edit → selection → tool). Publish them in the `?` sheet. | `whiteboard.js` keydown (line ~4092) | Every shortcut in the `?` sheet has a Playwright assertion. |
| W7 | **Board-level undo that survives reload** — the undo stack is in-memory. Persist the last 50 entries per board in `localStorage` keyed by board id. | `wbUndoStack` | Move a card, reload, Ctrl+Z restores it. |
| W8 | **Minimap always available, not a toggle** in fullscreen; collapsible corner. | navigator code | Fullscreen shows the minimap by default at ≥1280px. |
| W9 | **Touch and pen**: two-finger pan/zoom, single-finger draw with a pen, palm rejection via `pointerType`. | `wbZoomFilter`, drawing handlers | On a touch device (or Playwright touch emulation) drawing with `pointerType:"pen"` while a `touch` pointer rests does not pan. |
| W10 | **Export**: PNG at 2× and SVG of the *selection*, with the board background optional. Export menu exists for the whole board. | `wb-export-menu` | Selection export produces a file whose bbox equals the selection's. |
| W11 | **AI on the board** (the genuinely new part): "Summarise this frame into a note", "Turn these stickies into a mind map", "Explain the connection between A and B" — each a properties-panel action on the selection, calling the existing agent tools. Stream the result into a new card beside the selection. | `wbUpdatePropertiesPanel`, `ai/tools/whiteboard.py` (new: `summarise_selection`, `cluster_items`) | Works with the fake transport in tests; the card appears with a "Made by <model>" byline. |

## 2. Documents — to the level of Obsidian / Typora / iA Writer

The editor has the Obsidian half (live preview, slash commands, `[[` links,
outline, backlinks) and the Notion half (typed blocks, AI edit). What is
missing is *editor feel* and *document structure*.

| # | Item | Where | Done when / measure |
|---|------|-------|---------------------|
| D1 | **One header row, not five.** Title · format · view segment · save state · ⋯ in a single 2.375rem row; the formatting strip collapsed by default and revealed on selection (Medium/Notion-style floating toolbar) or with `Ctrl+/`. | `index.html` `.doc-dock`, `05-sidebars-themes.css` `.doc-toolbar` | Chrome above the first line of text ≤ 2 rows at 1280px (measure `#doc-panes`'s top offset: today 171px of chrome; target ≤ 96px). |
| D2 | **Selection-driven floating toolbar** (bold/italic/link/heading/quote/code/AI) that appears above a selection in Live and Source. | `documents.js` (new `docFloatingToolbar`) | Select a word: toolbar appears within 1 frame, positioned by `getBoundingClientRect`, clamped to the pane (the same `clampToolbarMenu` rules). |
| D3 | **Real undo/redo with a document-local stack** across Live *and* Source (browser undo breaks on mode switch). | `documents.js` | Type in Live, switch to Source, Ctrl+Z undoes the Live edit. |
| D4 | **Tables**: `/table`, Tab between cells, row/column add/remove from a cell menu, live-rendered. | `documents.js` slash menu, renderer | A 3×3 table survives a Live→Source→Live round trip byte-exact. |
| D5 | **Find & replace** inside the document (`Ctrl+H`), regex optional, with match count and highlight in both modes. | `documents.js` | 200 matches highlighted <50ms. |
| D6 | **Headings navigation**: outline exists; add drag-to-reorder sections in the outline (moves the whole section's text). | `doc-outline` | Drag H2 "B" above "A": document text reorders; undo restores. |
| D7 | **Callouts, footnotes, task lists with progress, math (KaTeX-free: render `$…$` with a small in-repo MathML shim)**. Collapsible callouts exist. | renderer | Each construct has a render test in `tests/test_markdown_*.py`. |
| D8 | **Version history UI on the document** — revisions are stored; show a right-hand timeline with diff view and "restore". | `documents.js`, `GET /documents/{id}/revisions` | Restore any of 10 revisions; diff highlights inserted/removed lines. |
| D9 | **Typewriter/focus mode and reading stats** (words, reading time exist; add "focus current paragraph"). | `documents.js`, CSS | Toggle dims all but the caret's paragraph. |
| D10 | **Templates**: new-document-from-template (meeting, spec, decision record, weekly review) stored as documents tagged `template`. | `routes_documents.py` (`?template=`), Library "New" menu | New → Template → document created with `{{date}}` filled. |
| D11 | **AI inside the editor, professionally**: inline "rewrite / shorten / expand / fix grammar" on selection with a diff preview and accept/reject per hunk — never silently replacing text. `POST /documents/{id}/ai-edit` exists; add a `dry_run` that returns a unified diff. | `documents.js`, `routes_documents.py` | Accept one hunk of three: only that hunk applies. |

## 3. Backend — fix and redesign

The API works. It is not yet *designed*: three code paths do the same job
(media vs attachment vs sketch), errors surface as bare 500s, and long jobs
block requests.

| # | Item | Where | Done when / measure |
|---|------|-------|---------------------|
| B1 | **One file model.** `MediaUpload` and `Attachment` are two tables for one concept, with two routers, two OCR paths and two galleries stitched together in JS (`_isAttachment` everywhere). Introduce a `File` view/model with a single `/files` API; keep both tables as storage behind it; migrate the frontend to the one shape; delete the `_isAttachment` branches. | `core/database.py`, new `api/routes_files_v2.py`, `library.js`, `app.js` lightbox | `grep -c _isAttachment frontend/` → 0. All existing file tests pass through the new router. |
| B2 | **A real job queue for every model call.** Caption, OCR, page reads, embeddings, tensions all run inline in requests or ad-hoc threads. One `jobs` table + one worker thread; every long call returns `202 {job_id}`; `GET /jobs/{id}` streams progress; the frontend's existing `toastProgress` subscribes. `trackOcrRead` becomes a client of this. | `core/jobs.py` (new), `taskhistory.py`, routes | No request handler calls the model directly except `/chat/stream`. Killing the app mid-job leaves the job `failed`, never half-written. |
| B3 | **Errors as a contract.** Every `HTTPException` carries `{code, detail, hint}`; the frontend renders `hint`. No bare 500s: an unhandled exception becomes `500 {code:"internal", ref:<uuid>}` logged with the ref. | `api/app.py` exception handlers | `tests/test_error_contract.py`: every route returns JSON on failure. |
| B4 | **Pagination everywhere.** `/entries`, `/media`, `/documents`, `/library` return everything. Cursor pagination (`?after=`) with the frontend's lists loading on scroll. | routes, `library.js`, `app.js` notes list | 10k notes: first paint of Notes <200ms. |
| B5 | **Full-text search with FTS5**, replacing `ILIKE` scans (`_list_documents`, `/library?q=`, note search). Keeps the keyword fallback the tests already depend on. | `core/search.py`, migration | `q=` over 10k notes <30ms; typo tolerance via trigram tokenizer. |
| B6 | **Migrations you can trust.** Alembic exists; add a startup check that refuses to boot on an unknown schema version and a `--migrate` flag, plus a pre-migration backup of `memorymap.db`. | `core/database.py`, `main.py` | Downgrade the db by hand → app refuses with a clear message and a backup path. |
| B7 | **Workspace scoping as middleware, not ambient session state.** The `X-Workspace-ID` filter lives in a SQLAlchemy event; `impersonate_workspace` exists because it gets in the way. Move scoping into an explicit `Scope` dependency every route declares. | `core/deps.py`, all routes | `grep -c impersonate_workspace src/` → 0. |
| B8 | **Backups and export as a product feature.** Nightly zip of db + media to a user-chosen folder; one-click restore; per-space export. | `core/backup.py` (new), Settings | Restore into a fresh data dir reproduces the notebook byte-for-byte. |
| B9 | **Observability that costs nothing.** A `/debug/health` with db size, job queue depth, model latency p50/p95 (from `taskhistory`), and the last 20 errors — surfaced in Settings › About. | `routes_models.py` or new | Page renders in <20ms. |

## 4. Agent harness — "the ultimate agent harness"

The harness works with small local models (HISTORY §8, §110). To be the
harness people build on:

| # | Item | Where | Done when / measure |
|---|------|-------|---------------------|
| A1 | **Tool results as typed cards, not prose.** Every tool returns `{kind, items:[...]}` and the chat renders a card per kind (note, document, file, board, reminder) with its real actions. Some do; make it all. | `ai/tools/*.py`, `app.js` chat renderer | `grep` finds no tool returning a bare string. |
| A2 | **Plan → execute → verify loop with a visible plan.** For multi-step asks the agent posts a checklist card, ticks steps as tools return, and re-plans on a failed step (max 2). | `ai/agent.py` | `tests/test_agent_plan.py` with the fake transport: a 3-step ask produces 3 ticks. |
| A3 | **Memory with provenance.** The agent's "what I know about you" is a set of notes tagged `memory` with the turn that created each; a Settings page lists and deletes them. Never silent. | `ai/memory.py` (new), Settings | Every memory line shows "from chat <title>, <date>". |
| A4 | **Skills as files.** The Skills library exists; let a skill be a markdown file in `data/skills/` with frontmatter (name, trigger, tools allowed), hot-reloaded. | `ai/skills.py` | Drop a file in; it appears in the library without restart. |
| A5 | **Budgets and interruption.** Per-turn token/time budget in Settings; a Stop that actually cancels the model call (Ollama supports it) and rolls back partial tool writes via the undo stack. | `ai/agent.py`, `ai/ollama_client.py` | Stop at 2s: no note was created; the chat shows "stopped". |
| A6 | **Eval harness in-repo.** 30 golden asks over a fixture notebook, scored on tool choice and citation correctness, run in CI against the fake transport and locally against a real model with `make eval`. | `tests/eval/` | CI prints a score; a regression fails the build. |
| A7 | **MCP in and out.** Expose the notebook's tools as an MCP server (stdio) so Claude Code / other agents can use this notebook; allow attaching external MCP servers as tools. | `ai/mcp_server.py`, `ai/mcp_client.py` | `claude mcp add memorymap …` lists `search_notes`, `get_document`, … |

## 5. Ship order (suggested sprints, each ends green + measured)

1. **P1, P2, P5, B3** — smoothness and no bare 500s. One session.
2. **D1, D2, D3, D5** — the editor feels professional. One session.
3. **W1, W2, W5, W6** — the whiteboard is fluent. One session.
4. **B2, B1** — the job queue, then the one file model. Two sessions; B1 is the risky one, do it behind the new `/files` router with the old routes kept until every test moves.
5. **A1, A2, A6** — the harness becomes measurable. One session.
6. **W3, W4, W11, D4, D8, D11** — the features that make it *unique*. Two sessions.
7. **B4, B5, B7, B8, A3–A5, A7** — scale and openness.

Every sprint: run the full suite, `ruff check .`, `node --check` on every
touched JS, one Playwright measurement per UI claim, and a HANDOVER.md entry
that says what was *not* verified.
