# The world-class plan: from "a demo that works" to a product people switch to

**Status: written by direct instruction, for the sessions after this one
(Opus and Sonnet, with a Fable review when one is available).** The
instruction, condensed: research the competitors, find what they have that
MemoryMap does not, find how MemoryMap can stand out, and plan every aspect
of the frontend, the backend, the missing features, the poor utility and the
small things that make an app feel professional rather than like a demo; make
the backend revolutionary; revolutionise UI design, backend structure,
agentic harnessing, and the app's abilities without AI.

This document does not repeat `ANALYSIS.md §114` (the competitive teardown
and the 90-day plan) or `MODERNISATION_AUDIT.md` (findings A to H with the
measured numbers). It builds on both and goes where they stop: it names the
system underneath the small things, gives every feature a dossier with a
gate, and specifies a backend and an AI harness that are a generation ahead
of "a FastAPI app that calls Ollama". Read those two first; this one assumes
them. Every brief below is written to be handed to a session on its own.

Reading order for a fresh session: `CLAUDE.md` → `HANDOVER.md` → this
file's §0 and §8 → the dossier for the feature you were given.

---

## 0. The diagnosis in one page

Three separate audits, two nights of live use, and about forty screenshots
from the owner say the same thing in different words: **every feature is
present, and almost none of them is finished.** "Finished" here has a
precise meaning, and the rest of this document is built on it:

1. **It is one thing, not a pile of parts.** A dock is a bar, not eleven
   buttons placed near each other. A menu is a list, not a stack of buttons.
   A card is a surface with content, not a card in a card in a card.
2. **It answers the next question.** A note shows what links to it. A search
   result says why it matched. A skill run says what it did and lets you
   undo it. An empty state says what to do.
3. **It behaves like its siblings.** Same type, same look, same keys, same
   place, everywhere. The owner's rule, verbatim: "ALL ELEMENTS AND CONTROLS
   OF THE SAME TYPE AND FUNCTION NEED TO BE, ACT, AND PLACED THE SAME
   APP-WIDE."
4. **It is designed for the screen it is on.** A phone gets a phone layout,
   not the desktop one squeezed until chrome is 76% of the page.
5. **It can be reached without a mouse and read without perfect eyes.**
   Arrow keys walk every strip; contrast is measured, not assumed.
6. **It never lies about state.** Saved means saved; running means running;
   an error says what failed and what to do.

The owner's own summary of what a professional app is: "the accessibility
and availability of things, placement and grouping of elements, consistent
design, things flowing and feeling connected." Those are not polish tasks
at the end; they are the acceptance criteria for every brief here.

### Why the app feels "off" even where each screen is fine

The owner said he "can't quite place or identify" it. Having measured, it is
five things, and none is a single screen's fault:

- **Too many surfaces.** Glass on a card on a panel on a page. Every layer
  has its own border and radius, so a settings row reads as a button inside
  a card inside a card. The fix is a surface budget: page, panel, card,
  control. Four levels, and a control never draws a box inside a card unless
  it is interactive.
- **Everything is a button.** Meta chips ("2 steps", "Never run"), model
  names, tags, statuses: all drawn with the button recipe. The eye reads
  forty affordances on a screen with six actions. Fix: a "meta" recipe with
  no border and no hover, and a lint that a `<span>` never carries a button
  class.
- **Filled accent everywhere.** Menu items, active chips, toggles, tiles,
  "Run" buttons, all in the same lavender fill, so the one primary action on
  a screen has no way to be found. Fix: one filled control per surface; the
  rest ghost or tinted.
- **Prose where a control should be.** Two-line explanations above and
  below every setting, so a settings page scrolls three screens for eight
  toggles. Fix: one line max, the rest behind the '?' popover.
- **Wrap instead of layout.** Below 1024 the docks and footers wrap into
  stacks; below 600 nothing changes at all. Fix: Phase 9, designed per
  breakpoint.

The same five, with a lint for each, are the "consistency contract" in §1.

---

## 1. The consistency contract (the system under the little things)

Every earlier plan fixed screens. This one fixes the vocabulary, then makes
the screens follow it. The contract is short enough to memorise and each
line has a lint that fails the build, because the app has been made
inconsistent three times by sessions that did not know the rule existed.

### 1.1 Surfaces (four levels, no more)

| Level | Recipe | Example | Never |
| --- | --- | --- | --- |
| Page | `--bg`, the gutter, nothing else | a tab page | a page border |
| Panel | card fill, glass edge, `--radius`, shadow at rest | a dock, a sidebar, a modal | a panel inside a panel |
| Card | card fill, hairline edge, `--radius-md`, no shadow | a note, a tile, a settings section | a card inside a card |
| Control | one of six recipes below | a button, a field | a control drawing its own card |

Lint: `tests/test_surface_budget.py` walks `index.html` and fails on
`.card .card`, `.panel .panel`, `.card details > summary.btn`, and on any
`.glass` inside `.glass`.

### 1.2 Controls (six recipes, one height)

| Recipe | Use | Rest | Hover | Active |
| --- | --- | --- | --- | --- |
| primary | the one action on the surface | accent-surface fill, on-accent ink | brightness | pressed |
| ghost | every other button | no fill, ink | ghost-bg | accent-soft |
| icon | utilities (refresh, help, more) | ghost, square, `--control-h-lg` | ghost-bg | accent-soft |
| field | text/search/select | inset fill, one border, one radius | border ink | accent ring |
| segment | 2 to 5 exclusive choices | one track, ghost items | item ghost-bg | item accent-soft, ink |
| meta | chips, counts, statuses | no border, no hover, muted | none | none |

All six share `--control-h-lg` (36px) on docks and `--control-h` in forms,
`--radius-md`, the same focus ring, the same icon size (1em) and gap
(`--space-2`), and the icon-text centring rule. Lint:
`tests/test_ui_signatures.py` already counts recipes; extend it to assert at
most ONE primary per `[data-dock-name]` and per `.modal`, and that no
`.chip`/`.meta` has a `border` or a `:hover` rule.

### 1.3 Menus (one recipe)

A menu is `.menu` (panel surface, `--space-1` padding, min-width 14rem) with
`.menu-item` rows (ghost, full width, left aligned, icon column 1.25em,
label, optional right-aligned shortcut or check) and `.menu-sep` hairlines.
Opened by a `details` or a button with `aria-expanded`; closes on pick,
outside click and Escape; flips when it would overflow; arrow keys walk it;
typeahead selects. Every menu in the app (dock more, doc toolbar, whiteboard
Insert/Edit/Arrange/View/Board, chat, context menus, nav history) is this
recipe. Lint: a menu item with a non-transparent rest background fails
`test_ui_signatures.py`.

### 1.4 Bars (docks, heads, toolbars, footers)

A bar is one continuous panel surface. Zones inside it (identity, find,
arrange, actions) are separated by a hairline and equal gaps, never by
boxes. Controls inside are ghost, fields are inset, exactly one primary.
The identity zone never shrinks below its title. A form footer is a bar:
secondary on the left, primary at the far right, and nothing floats over
the primary (the scroll-to-top button hides while a footer is in view).
Lint: `tests/test_dock_grammar.py` (exists) plus a Playwright count in
`docks.js` of distinct control heights per bar (must be 1).

### 1.5 Copy

Sentence case. No em-dashes (lint: `tests/test_no_em_dashes.py` over
`frontend/` and `src/`). One line of description per section, 70 characters
or fewer; longer help goes behind the '?' popover (`data-help-for`). Empty
states name the next action and carry a button for it. Errors say what
failed and what to do, in that order. Numbers use tabular figures.

### 1.6 Keys (the same everywhere)

`/` focuses the surface's search. Arrows walk tablists, menus, lists,
grids. `Enter` opens, `Space` selects, `Escape` closes the innermost thing.
`Ctrl+K` command palette. `Ctrl+N` new note, `Ctrl+S` save, `Ctrl+B/I`
format. `+`/`-`/`0` zoom on canvases, `F` focus selection. `?` opens the
surface's help. Lint: `tests/test_keymap.py` parses a single `KEYMAP` table
in `app.js` and asserts no key is bound twice on the same surface.

### 1.7 Responsive (designed, not wrapped)

Four layouts: phone (≤ 600), tablet portrait (≤ 900), laptop (≤ 1280),
desktop. Each surface declares what it becomes at each: a dock becomes
identity + search + primary + more; a sidebar becomes a sheet; a grid
becomes a list; a canvas tool strip moves to the bottom; the tab bar
becomes a bottom bar with five items and "more". Chrome-to-content ratio
on a phone must be under 35% on every tab (measured by
`scratchpad/audit/chrome.js`; today 76%).

---

## 2. Competitors: what they have that MemoryMap does not (checked, not
assumed)

`§114.1` has the positioning teardown. This is the feature-level gap list,
organised by what a switcher would miss on day one. "Have" means shipped
and used, as of mid-2026.

| Capability | Obsidian | Notion | OneNote | Kortex | Logseq | Capacities | Reflect | MemoryMap today | Gap |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Block editor with slash commands | plugin | yes | no | yes | yes | yes | yes | textarea + toolbar | DOCUMENTS_PLAN Phases 2 to 4 |
| Wiki-links with autocomplete and backlinks pane | yes | yes | no | yes | yes | yes | yes | links exist, no `[[` autocomplete, no pane | Dossier D2 |
| Daily notes / journal with a calendar | plugin | template | no | yes | yes | yes | yes | none | Dossier D6 |
| Properties / typed fields per note | yes | databases | no | yes | yes | object types | tags | category + tags | Dossier D5 (typed properties) |
| Database views (table, board, calendar) | plugin | yes | no | partial | query | yes | no | Timeline table (in progress) | Dossier D7 |
| Canvas / whiteboard | yes | no | yes (ink) | yes | yes | no | no | yes | keep, refine |
| Mind map | plugin | no | no | no | no | no | no | yes | keep, refine (a differentiator) |
| Graph view | yes | no | no | yes | yes | yes | no | yes (SVG) | GRAPH_PLAN |
| Local AI chat over notes | plugin | hosted | Copilot | hosted | plugin | hosted | hosted | yes, offline | keep; make checkable |
| Per-claim citations in answers | no | partial | no | partial | no | partial | partial | source list only | §114 F2-1 |
| Web clipper / read-it-later | yes | yes | yes | yes | no | yes | yes | bookmarks only | Dossier D9 |
| PDF annotation | plugin | no | yes | yes | yes | no | no | text extraction only | Dossier D10 |
| Voice capture with transcript | plugin | yes | yes | no | no | no | yes | yes (Whisper) | keep; add the meeting block |
| Templates | yes | yes | no | yes | yes | yes | yes | yes | keep |
| Spaced repetition / recall | plugin | no | no | no | yes | no | no | none | §114 A1 |
| Sync across devices | paid | yes | yes | yes | yes | yes | yes | none | Dossier B6 (local-first sync) |
| Mobile app | yes | yes | yes | yes | yes | yes | yes | responsive web only | Phase 9, then a PWA shell |
| Import from Notion/Obsidian/Evernote | yes | yes | partial | yes | yes | yes | yes | Markdown folder only | §114 F5-3 |
| Version history per note | yes | yes | yes | yes | git | yes | yes | drafts only | Dossier B4 (event log) |
| Command palette | yes | yes | no | yes | yes | yes | yes | yes | keep; make it complete |
| Plugin / extension API | yes | limited | no | no | yes | no | no | MCP server | Dossier B8 |

**Where MemoryMap can stand out** (the things no one on that table has, all
of which the code is already half way to):

1. **The checkable answer.** Every sentence of an AI answer carries the
   note it came from, an "I don't know" is a designed state, and a click
   shows why a result ranked. (§114 combo 1.)
2. **A notebook that files itself and can be audited.** Auto-filing with
   an undo trail and a "why did this go here" for every decision. Nobody
   else does the second half.
3. **Contradictions and tensions as a first-class object.** The
   "disagreed with myself" skill made into a live index and a Dashboard
   widget. (§114 F7-1.)
4. **Mind maps that are notes.** A map node is an entry; a map is a view of
   the notebook. Coggle and XMind cannot link a branch to a note; Obsidian
   cannot make a map at all without a plugin.
5. **A privacy receipt.** A page that proves, from the app's own logs,
   that nothing left the machine. Hosted competitors cannot ship this.
6. **The offline studio.** Audio overview, recall cards, a "brief me before
   the meeting" from the notes, all local. (§114 combo 3.)

---

## 3. Frontend dossiers (one per surface, each a hand-off brief)

Each dossier: what exists → what is wrong (measured) → the target →
the brief → the gate. Effort is in sessions (S ≈ half a session, M ≈ one,
L ≈ two or more). "Owner" is the model that should do it.

### D1 Dashboard (M, Sonnet after a Fable/Opus design pass)

Exists: hero, Start something tiles, Jump to pills, Run a skill, stat
tiles, 24 widgets with a layout editor. Wrong: three launch rows plus a stat
row is four kinds of chip on one screen; widgets are 24 separate recipes;
the widgets dialog is a settings page inside a modal; the "Boards & maps"
widget shows raw thumbnails. Target: a dashboard that reads top to bottom
as greeting → what needs you (due reminders, drafts, tensions) → start →
your notebook (widgets), with one tile recipe and one widget frame (title,
optional count, optional "more" link, body). Brief: one `.widget` frame
component in `dashboard.js`; every widget renders into it; the layout
editor becomes drag-to-reorder on the grid itself with a "customise" mode
toggle; the widgets dialog keeps only add/remove. Gate: recipe count on
Dashboard ≤ 8 (audit script), all 24 widgets in the frame, 390px chrome ratio
< 35%.

### D2 Notes: list, capture, edit (L, Opus)

Exists: the list with card/list views, filters, select mode, capture with
templates, the edit form, connections. Wrong: a note shows no backlinks
inline; `[[` has no autocomplete; the capture footer is two wrapped rows
with a FAB over the Save button; the edit form's gutter drifts. Target:
capture is one field with a slash menu and `[[` autocomplete, a one-row
footer; a note's page has a connections rail (backlinks, links, related by
similarity, in the same map) that is always visible on desktop and a sheet
on phone. Brief: `[[` autocomplete over `/entries?q=` with keyboard
selection; a `.connections-rail` component rendered from `/entries/{id}/links`
(exists) and `/entries/{id}/related`; the footer on the bar recipe. Gate:
typing `[[te` shows matches within 150ms on a 2,000-note fixture; the rail
renders for every note; the FAB never overlaps a primary (Playwright
intersection check).

### D3 Chat (M, Opus)

Exists: streaming answers, sources list, scope chips (backend), personas,
skills picker, tool cards, conversation sidebar. Wrong: no per-claim
citation; the composer's three rows of chips crowd the input; the sidebar
head is not on the dock grammar (in progress). Target: an answer whose
sentences carry superscript source marks that highlight the note on hover;
a composer that is one field with a "+" menu (attach, scope, persona,
skill) and a send button; the "I don't know" state designed. Brief: §114
F2-1 with `routes_chat.py` emitting `cite` events per sentence; composer
rebuilt on the bar recipe. Gate: 95% of sentences in ten fixture answers
carry a citation; composer height ≤ 2 rows at rest at 1024.

### D4 Library (M, Sonnet)

Exists: All, Documents, Boards & maps, Images, Files, AI skills, Links,
Contents sub-tabs, each with its own head. Wrong: eight heads, five
recipes; image cards are 900px tall with "Show more" links and chip-buttons;
skills cards have button-shaped meta. Target: one head (the dock grammar),
one card per kind on one card recipe with a fixed preview aspect (16:10),
title, two meta lines, actions in a "..." menu; the image and file cards
open a detail sheet instead of expanding in place. Gate: card height
uniform per view (± 4px), one head recipe, `docks.js` count = 1 per
sub-tab.

### D5 Properties and tags (M, Opus)

Exists: category, tags, pinned, private, space. Wrong: tags are strings; no
typed fields; no way to say "this note is a person/project/book". Target:
typed properties per note (text, number, date, select, relation), stored
as JSON on the entry (`properties` column, indexed via a generated
`properties_text` for FTS), a property editor in the note head, and a
"kind" property with built-in kinds (person, project, meeting, book, place)
that drive the Library's grouping and the graph's colour rules. Brief:
migration + `/entries/{id}/properties` + editor. Gate: a property
round-trips through the API, FTS finds it, the graph colours by it.

### D6 Daily notes and the journal (S, Sonnet)

Exists: nothing. Target: `Ctrl+D` opens today's note (created from the
Journal template if missing), a calendar strip on the Timeline dock to jump
between days, a "yesterday / tomorrow" pair of links in the note head, a
streak that counts days with a daily note. Brief: `/entries/daily/{date}`
that creates or returns; the calendar strip as a `.segment` of seven with
overflow into a month popover. Gate: the key works from every tab; the
calendar reflects the DB.

### D7 Timeline (L, in progress: see TIMELINE_PLAN.md)

### D8 Reminders (S, Sonnet)

Exists: natural-language add, presets menu, list with views. Wrong: the
list and the notes list use different rows; done items vanish rather than
strike through; no snooze. Target: reminder rows on the same row recipe as
notes, snooze (10m, 1h, tomorrow) in the row menu, done rows strike
through and fade, a "today" band at the top. Gate: row recipe shared
(one class), snooze round-trips.

### D9 Links and the web clipper (M, Opus)

Exists: bookmarks with groups. Target: a "Save page" bookmarklet and a
share-target (PWA) that POSTs a URL; the backend fetches (SearXNG-safe,
offline-tolerant) and stores a readable extract as a document with the
source URL, so links become searchable notes. Brief: `/links/clip` +
readability extraction (vendored, MIT) + a bookmarklet generator in
Settings. Gate: a clipped page is found by search within 2s.

### D10 Documents and PDFs (L, see DOCUMENTS_PLAN.md; add PDF annotation as
Phase 8: highlight → note with page anchor, rendered by pdf.js vendored)

### D11 Whiteboard and mind maps (M, in progress; then MINDMAP_PLAN Phases
4 to 5)

### D12 Graph (L, GRAPH_PLAN.md)

### D13 Settings (M, Sonnet)

Exists: 3,229 lines of settings.js, ~40 sections. Wrong: prose-heavy,
toggle rows in two recipes, model backend card has three paragraphs.
Target: a two-pane settings (section list left, one section right, search
across all), every section = title + one line + controls, help behind '?',
danger actions in a separate red-edged group at the bottom of their
section. Gate: no paragraph over 120 characters outside a popover; one
toggle-row recipe; the section list is a tablist with arrow keys.

### D14 Help, onboarding and the command palette (S, Sonnet)

Exists: help accordion, onboarding overlay, `Ctrl+K`. Wrong: the accordion
is cards in cards; the palette lacks half the actions. Target: help as a
searchable list on the panel surface with flat rows; the palette generated
from the same `ACTIONS` table the menus use, so nothing can be missing.
Gate: every `data-action` in the DOM appears in the palette.

### D15 The shell: top bar, tab bar, bottom bar, sidebars (M, Opus)

Exists: top bar with wordmark, search, utilities (bell, theme, settings,
lock, power) as five square buttons; tab bar; resizable sidebars. Wrong:
the utility cluster is five boxes; on phone the tab bar overflows. Target:
utilities as an icon cluster with hairline separators on the bar surface;
a bottom tab bar on phone (five + more); sidebars as sheets under 900.
Gate: Phase 9 numbers.

---

## 4. The backend, made revolutionary (and still SQLite, still offline)

"Revolutionary" here means: architectural moves that make whole classes of
feature cheap that are expensive today, without a server, a cloud or a
second database. Five moves, in dependency order.

### B1 The event log: every change is a fact, the tables are views

Today every write mutates rows in place; history is lost, undo is per
feature, sync is impossible and "what did the AI change" cannot be
answered. Move: an append-only `events` table (`id, ts, actor, kind,
entity, payload_json, parent_id`), written by every manager method in the
same transaction as the row change (one helper, `record(kind, entity,
payload)`). Actors: `user`, `ai:<skill or tool>`, `system:<job>`. From it:

- **Version history** for every note, document, board, reminder: a
  "History" sheet listing events with restore.
- **Global undo** of any AI action ("undo auto-filing", "undo tag cleanup")
  by replaying the inverse.
- **The audit trail** behind "why did this go here" and the privacy
  receipt.
- **Sync** (B6) becomes log shipping.
- **Activity** on the Dashboard and Timeline becomes a query, not a scan.

Brief: `src/memorymap/core/events.py`, Alembic migration, `record()` in
`EntryManager`, `WhiteboardManager`, reminders, tags, settings; `/events`
with cursor pagination; `tests/test_events.py` proving every manager write
records exactly one event and that replaying a note's events rebuilds it.
Gate: 100% of manager writes covered (a test enumerates public methods).

### B2 The job runtime: durable, resumable, observable

Today long work runs in threads with no persistence (MODERNISATION_AUDIT
D2). Move: a `jobs` table (`id, kind, state, progress, payload, result,
error, attempts, run_after, heartbeat`), a single worker thread per process
that leases jobs, a `@job` decorator that makes any function durable, and
SSE `/jobs/stream` for the UI. Jobs: re-index, embed, OCR, caption,
auto-file, skill run, import, backup, model download. Every job is
cancellable, survives a restart, and reports progress in one shape the
"Running now" panel renders. Gate: kill the server mid-OCR, restart, the
job resumes; the panel shows it.

### B3 The retrieval engine: one index, three signals, explained

Today: FTS5 for notes only, embeddings optional, everything else a scan.
Move: one `index` module that indexes every entity (notes, documents,
files' extracted text, boards' node text, bookmarks' extracts, reminders)
into FTS5 with a `kind` column and, when an embedding backend exists, into
a `vectors` table (`sqlite-vec` if vendorable, else numpy blobs with a
brute-force top-k that is fine to 50k rows). Ranking = BM25 + cosine +
graph proximity to the current context (open note, active space) with the
three weights returned per hit, so "why this result" is a rendering, not a
guess. Incremental: the event log drives re-indexing (B1). Gate: a 5k-note
fixture answers a query in < 50ms FTS-only and < 200ms hybrid; every hit
carries the three scores; `tests/test_search_explain.py`.

### B4 The knowledge kernel: entities, claims, links, tensions

Today entities and links exist as tables written by skills. Move: a small
kernel that maintains, from the event log, derived tables: `entities`
(people, projects, places, terms; merged by alias), `claims` (a sentence
plus its note, extracted by the model when idle, with a confidence),
`links` (typed: refers-to, contradicts, supports, follows, part-of), and
`tensions` (pairs of claims the model judged incompatible). All derived,
all rebuildable, all with a "computed by <model> at <ts>" stamp shown in the
UI. This is what makes the Tensions widget, derived person/project pages,
per-claim citations and "what changed about X" possible. Gate: rebuild from
scratch on the fixture is deterministic; every derived row cites its
source event.

### B5 The AI harness: plan, act, verify, budget, learn

Today: a step is a turn (MODERNISATION_AUDIT E1); tool contracts exist
(AGENT_SKILLS_REFORM Phases A to C). Move:

- **Typed tools with contracts** (exists) plus **pre/post conditions**
  checked in Python, not by the model: a `file_note` tool refuses a
  category that does not exist; a `merge_notes` tool requires both ids to
  be live.
- **A planner that emits a plan object** (exists as A2) that the executor
  runs step by step with a **token and time budget** per run, a **verifier**
  step that re-reads the changed rows and checks the skill's stated
  postcondition (e.g. "every note now has ≥ 1 tag"), and a **repair loop**
  of at most two rounds.
- **Small-model mode** (exists) made the default under 8B: one tool per
  turn, forced JSON via grammar when the backend supports it (llama.cpp
  and Ollama both do), few-shot from the skill's own eval cases.
- **Evals as fixtures** (A6 exists): every skill ships with three
  notebooks and expected outcomes; `pytest -m evals` runs them against
  the fake transport; a nightly local run against a real model writes
  `docs/MODELS.md` (the "I don't know" bench, §114 F2-2).
- **Learning from corrections**: when a user moves an auto-filed note,
  the kernel records a `correction` event; the filing prompt is built with
  the last N corrections for that category (§114 F1-1). No training, no
  telemetry, and the notebook gets better at filing itself.

Gate: on the eval fixtures, a 3B model completes ≥ 80% of built-in skills
with zero invalid tool calls; every run shows plan, steps, verification and
an undo button.

### B6 Local-first sync (L, later; design now)

Because B1 makes every change an event, sync is: export the log since a
cursor as an encrypted file, import elsewhere, resolve by last-writer-wins
per field with the event history kept (no CRDT needed for a single-user
notebook; conflicts become two versions in History). Transport: a folder
(iCloud/Dropbox/Syncthing) or a LAN pairing over the existing server with a
QR code. Gate: two instances round-trip 1,000 events with no loss.

### B7 The API contract

One error shape (exists, B3 in PLAN.md), cursor pagination on every list
(finish D4 in the audit), ETags on entries, `If-Match` on writes (so the
editor cannot clobber a background AI edit), an OpenAPI schema behind the
auth gate, and a `/capabilities` endpoint the UI reads once so features
appear only when their backend is there (OCR, embeddings, TTS).

### B8 Extensions

The MCP server exists. Move: the same tool registry that serves MCP serves
a `/tools` HTTP API and a "user skills" folder of Markdown skills (already
the skill format). That is the plugin API: a skill is a Markdown file with
tool calls; a tool is a Python function registered with a contract. Gate:
a skill dropped into the folder appears in the picker without a restart.

---

## 5. Abilities without AI (the app must be excellent with the model off)

The owner's phrase: "features of the application even without AI." Today
too much routes through the model. Each of these is pure code:

1. **Search operators** everywhere: `tag:`, `kind:`, `in:space`, `before:`,
   `after:`, `has:file`, `is:pinned`, quoted phrases, `-not`. One parser,
   used by Notes, Library, Timeline, Chat scope, the palette.
2. **Saved searches as smart folders** in the Notes sidebar (backend exists).
3. **Backlinks and unlinked mentions** (a plain FTS query for the title).
4. **Templates with variables** (`{{date}}`, `{{title}}`, `{{clipboard}}`,
   cursor position).
5. **Bulk actions** from any selection: tag, move, merge, export, delete,
   make a map, add to board.
6. **Export** any selection as Markdown folder, one document, PDF (print
   CSS), OPML for maps, PNG for boards.
7. **Import** Markdown folders with wiki-links preserved, Notion zips,
   Evernote enex, Apple Notes HTML.
8. **Keyboard everything** (§1.6) and a **shortcut sheet** on `?`.
9. **Word count, reading time, outline** for every document (exists for
   documents; extend to notes).
10. **A real trash** with restore and 30-day purge (exists as bin; make it
    consistent for every kind).

---

## 6. Measuring "professional" without telemetry

Every gate above is a number a script produces on the sandbox. The ones
worth a Dashboard-of-the-project (a Markdown table in `HANDOVER.md`,
updated per session):

| Metric | Script | Today | Target |
| --- | --- | --- | --- |
| Distinct control recipes on the busiest screen | `scratchpad/audit/recipes.js` | 22 (Chat) | ≤ 8 |
| Control heights per bar | `docks.js` | 1 to 4 | 1 |
| Chrome ratio at 390 | `audit/chrome.js` | 76% | < 35% |
| Paragraphs > 120 chars outside popovers | `audit/prose.js` | ~60 | 0 |
| Em-dashes in `frontend/` + `src/` | `test_no_em_dashes.py` | ~9,000 | 0 |
| Contrast failures, both themes | `contrast.js` | 0 after fix | 0 |
| Console errors across all tabs at 3 widths | `errors.js` | 0 | 0 |
| Tablists without arrow keys | `audit/keys.js` | 0 after fix | 0 |
| Idle requests per minute | `audit/idle.js` | 14 | ≤ 2 |
| First paint of Graph on 2k notes | `graph-fixture.js` | n/a (SVG) | < 300ms |
| Search p95 on 5k notes | `tests/test_search_perf.py` | n/a | < 200ms |
| Skill eval pass rate, 3B model | `pytest -m evals` | n/a | ≥ 80% |

---

## 7. The small things (a checklist that sessions keep reopening)

Each of these has been reported by the owner at least once. They are cheap
and they are what "refined" means. A session that has an hour left should
take five of these.

- Icon and label centred in every button, chip and menu item (measure).
- Focus rings visible on every control in both themes.
- Hover states on every clickable thing; cursor pointer only on clickable
  things.
- Disabled looks disabled and says why on hover.
- Every list has an empty state with an action; every empty state uses the
  same recipe.
- Every destructive action confirms in the same dialog recipe and offers
  undo where possible.
- Every async action shows progress in the same place (the button itself
  for < 2s, the Running-now panel for longer).
- Toasts: one recipe, bottom centre on phone, bottom right on desktop,
  with an action where one applies.
- Dates: relative under 7 days, absolute after; one formatter.
- Numbers: tabular figures in tables and stats.
- Truncation: titles ellipsise, never clip; the full text in `title`.
- Scroll: only the content scrolls, never the page under a dock; sticky
  heads stick.
- Selection: text is selectable everywhere text is (no `user-select: none`
  on content, including mind map nodes).
- Keyboard: Escape always closes the innermost thing; Enter in a single
  field dialog submits it.
- Touch: 44px targets on phone, no hover-only affordances.
- Motion: 150ms ease-out for state, 250ms for layout, none under
  reduced-motion.
- Copy: sentence case, no em-dashes, no "Oops", no exclamation marks.
- Modals: one width scale (24, 32, 44rem), title + body + footer, footer
  actions right-aligned with the primary last.
- Forms: labels above fields, one column under 600, required marked,
  errors inline under the field.
- Links: underlined on hover only, accent colour, external ones marked.

---

## 8. Execution order for the coming week (Opus/Sonnet sessions)

Assumes the in-flight agents (Phase 8 docks, Phase 9 responsive, Documents
Phase 0, Graph Phase 1, menus/bars consistency, mindmap bugs, timeline
redesign, tooltips/copy) have merged. Each row is one session or less.

| # | Brief | Owner | Gate |
| --- | --- | --- | --- |
| 1 | §1 lints: surface budget, one-primary, meta-no-hover, no-em-dash, keymap | Sonnet | all green on main |
| 2 | §7 checklist, first ten items, measured | Sonnet | audit scripts |
| 3 | D13 Settings two-pane | Sonnet | prose metric 0 |
| 4 | D2 Notes: `[[` autocomplete + connections rail | Opus | 150ms, rail on every note |
| 5 | B1 event log | Opus | 100% writes covered |
| 6 | B2 job runtime | Opus | resume after kill |
| 7 | D3 Chat per-claim citations + composer | Opus | 95% cited |
| 8 | B3 retrieval engine with explanations | Opus | perf gates |
| 9 | D5 typed properties + D6 daily notes | Opus then Sonnet | round-trips |
| 10 | D4 Library one card recipe | Sonnet | uniform heights |
| 11 | D1 Dashboard widget frame | Sonnet | ≤ 8 recipes |
| 12 | B4 knowledge kernel + Tensions widget | Opus | deterministic rebuild |
| 13 | B5 harness: verifier, budget, corrections | Opus | evals ≥ 80% |
| 14 | D9 clipper, D8 reminders, D14 palette from ACTIONS | Sonnet | per dossier |
| 15 | GRAPH_PLAN Phases 2 to 5 | Opus | frame-rate gates |
| 16 | DOCUMENTS_PLAN Phases 1 to 7 | Opus | per phase |
| 17 | B7 API contract, B8 extensions | Sonnet | schema behind auth |
| 18 | PWA shell + share target; B6 sync design doc | Opus | installable, clip works |

Rules for every session: read `CLAUDE.md`; check the running app before
building; merge the branch first; commit after every step; measure before
claiming; no em-dashes; update `HANDOVER.md` with what was measured and
what could not be verified.

---

## 9. On testing with a real model in the sandbox

The owner asked whether to install llama.cpp and a local model in the
project so sessions can test against a real model. Answer: not in the
repository (a GGUF is hundreds of MB to GBs and would break the clone,
CI and the AGPL notices), but yes as a **dev-only script**:
`scratchpad/llama-dev.sh` builds or downloads a llama.cpp `llama-server`
release for the sandbox's CPU, fetches one small instruct GGUF
(Qwen2.5-1.5B-Instruct Q4 or Llama-3.2-1B-Instruct Q4, about 1 GB) into the
scratch directory, and starts it on a port the app's OpenAI-compatible
provider can be pointed at. The sandbox's network policy and disk allowance
decide whether it works; the script must fail loudly and the suite must
never depend on it. It lifts the last half of CLAUDE.md's standing caveat
(real inference) for skills evals, and `pytest -m evals --real` would use
it. Add it as row 0 of §8 for the first session with network access.

---

## 10. Flaws found by static probes (cheap to reproduce, each with its command)

Run from the repo root. Each line is a class of bug, not a single bug; the
count is the size of the class today. A session that takes one of these
should fix the class and add the lint that keeps it fixed.

| # | Flaw | Evidence | Why it matters | Fix (and lint) |
| --- | --- | --- | --- | --- |
| F1 | 57 distinct `localStorage` keys read ad hoc, 14 of them `JSON.parse`d | `grep -o 'localStorage.getItem("[^"]*")' frontend/*.js \| sort -u \| wc -l` | This is the shape of the worst UI bug in the project's history (two settings missing from `APPEARANCE_DEFAULTS` wrote `NaN` into CSS): a value invalid where it is used, set somewhere else. Corrupt or missing storage throws inside JSON.parse and takes the caller's whole init with it. | One `prefs` module: a schema with defaults and a version per key, `prefs.get(key)` never throws and never returns undefined, migration on version bump. Lint: no direct `localStorage.getItem` outside `prefs.js`. |
| F2 | 25 list endpoints, 3 accept `limit` | `grep -n "^def list_" -A 6 src/memorymap/api/routes_*.py \| grep -c limit` | Every list is O(notebook). A 5k-note notebook makes the Library, Timeline and Graph tabs multi-second. (MODERNISATION_AUDIT D4.) | Cursor pagination on all 25 with one helper, `?limit=&cursor=`, `next_cursor` in the body; the frontend's list renderers page on scroll. Lint: a test enumerates routers and asserts every `list_*` takes `limit`. |
| F3 | Embedding similarity loads every vector per request | `sed -n 680,690p src/memorymap/api/routes_entries.py` and lines 817, 1038: `select(EmbeddingRecord...).all()` | O(n) memory per call, O(n²) for `?similarity=true` (§114 F3-3). Also the reason "related notes" is the slowest panel. | Keep a process-level float32 matrix refreshed by the event log (B1) or by `updated_at` polling; top-k by one matmul; `sqlite-vec` later. Gate in B3. |
| F4 | 88 `except Exception:` / bare `except:` in `src/` | `grep -rn "except Exception:\|except:" src/memorymap --include=*.py \| wc -l` | Failures become silence (the "features that never ran once" shape). | Each one either re-raises as the error contract, logs with `exc_info` to the logbuffer, or is narrowed. Lint: ruff `BLE001` enabled with a per-site `# noqa: BLE001 <reason>`. |
| F5 | 13 raw `fetch()` calls beside `api()` | `grep -n 'fetch(\`\|fetch("' frontend/*.js \| grep -v "api\b"` | Each re-implements the auth header, the error contract and the offline path; one is `/chat/stream`, the most important call in the app. | `api.stream()` and `api.upload()` helpers; the 13 sites move onto them. Lint: no bare `fetch(` outside `api.js`. |
| F6 | 9 `setInterval` vs 7 `clearInterval`; two 1-second clocks and a 30-second one run forever | `grep -n "setInterval(" frontend/app.js` | Idle CPU and the 14-idle-requests-a-minute figure (MODERNISATION_AUDIT); a background tab still ticks. | One `scheduler` with `visibilitychange` pause, a single 1s tick that fans out, and every poll on it. Gate: idle requests ≤ 2/min, 0 timers while hidden. |
| F7 | Threads in 16 modules share SQLAlchemy sessions created per call | `grep -rln "threading.Thread" src/memorymap` | SQLite is fine with this only while each thread opens its own session and nobody passes ORM objects across; nothing enforces it, and the "Could not refresh instance" 500 seen this session was exactly that shape. | B2 job runtime: one worker, jobs get a fresh session, results are plain dicts. Lint: `Thread(` allowed only in `core/jobs.py`. |
| F8 | Two `innerHTML` writes with interpolated data | `grep -n 'innerHTML\s*=\s*\`[^\`]*\${' frontend/*.js` | Both interpolate app-controlled strings today; the pattern is the XSS shape and the next author will interpolate a title. | `setLabel()` (exists) at both sites. Lint: no `innerHTML =` with `${` anywhere. |
| F9 | Every router relies on the app-level auth middleware; none declares it | `grep -L require_auth src/memorymap/api/routes_*.py` | Correct today (the middleware covers all but two routes); a new router mounted before the middleware or a `/logs/client` style exception is invisible in review. | A test that walks `app.routes` and asserts every route except the allowlist returns 401 without a token. |
| F10 | Extracted text, captions and OCR live in three columns with three UIs | `grep -n "vision_ocr_text\|ocr_text\|caption" src/memorymap/api/routes_files.py \| wc -l` | The Files card shows one, hides one, and the search indexes some; the owner's "only the first line" report was one symptom. | One `readings` table (`media_id, kind, page, text, model, ts`), one renderer, all kinds indexed (B3). |
| F11 | The graph, dashboard constellation and map thumbnails are three renderers | `grep -c "forceSimulation" frontend/graph.js frontend/dashboard.js frontend/whiteboard.js` | Three physics, three colour maps, three sets of bugs. | GRAPH_PLAN §3: one renderer with `size: "pane" | "tile" | "full"`. |
| F12 | Frontend state lives in module globals, DOM and localStorage with no single owner | MODERNISATION_AUDIT C2 | Every "the list did not refresh" bug. | A small store: `state.get/set/subscribe` per slice, renderers subscribe; introduced slice by slice (notes list first). |

Two flaws this session found by driving the app, recorded here so they are
fixed as classes: a new board was created through a path that also created
a note (entries and boards share a table and a create path; the filter
belongs in one place), and a dialog's `<details>` did not close on Escape
(now handled globally; the lint is "every `details` menu closes on Escape",
in `docks.js`).

---

## 11. The week, session by session (Opus/Sonnet), and the quarter

Assumes the in-flight agents have merged and PR #144 is green. One row is
one session; a session ends with the gate green, a commit, and a HANDOVER
line. Order matters: each row leaves the next one cheaper.

| Day | Session | Model | Gate |
| --- | --- | --- | --- |
| Mon | Em-dash sweep (`scratchpad/emdash.py`), `test_no_em_dashes.py`, full suite | Sonnet | 0 em-dashes in frontend+src, suite green |
| Mon | §1 lints: surface budget, one primary per surface, meta-no-hover, keymap table | Sonnet | lints pass on main |
| Tue | F1 `prefs` module + F5 `api.stream/upload` + F8 | Sonnet | lints; errors.js 0 |
| Tue | D13 Settings two-pane, rest of the '?' popovers (54 paragraphs left, `scratchpad/help-audit/count.py`) | Sonnet | count.py TOTAL 0 |
| Wed | TIMELINE_PLAN.md Phases 1 to 2 (the measured baseline is in `scratchpad/ui-sweeps/timeline-audit*.js`) | Opus | timeline.js sweep |
| Wed | F2 pagination on all 25 lists + F6 scheduler | Opus | route test; idle ≤ 2/min |
| Thu | B1 event log | Opus | every manager write records one event |
| Thu | D2 `[[` autocomplete + connections rail | Opus | 150ms; rail on every note |
| Fri | B2 job runtime + F7 | Opus | resume after kill |
| Fri | D4 Library one card recipe + D1 widget frame | Sonnet | uniform heights; ≤ 8 recipes |
| Sat | B3 retrieval engine + F3 + F10 | Opus | 5k fixture perf; every hit explained |
| Sat | D3 per-claim citations | Opus | 95% cited |
| Sun | B5 harness verifier + corrections; evals | Opus | ≥ 80% on 3B |
| Sun | HANDOVER, ROADMAP, BACKLOG rewritten to the new state; FABLE_BRIEF for the next Fable window | Sonnet | test_docs_layout |

**The quarter after** (in order, each two to four sessions): GRAPH_PLAN
Phases 2 to 5 · DOCUMENTS_PLAN Phases 1 to 7 · MINDMAP_PLAN Phases 4 to 5
· B4 knowledge kernel and the Tensions widget · D5 properties and D6
daily notes · D9 clipper and the PWA shell with share target · B6 sync
design and a folder-transport spike · B8 extensions · the offline studio
(§114 combo 3) · Notion and Obsidian importers · F12 the store, slice by
slice · a11y audit with a screen reader script · packaging: one-click
installers with a model-included first run sized honestly (§114 F11-1).

**What to hand the next Fable window** (judgement-heavy, not typing-heavy):
review of B1 to B3 as merged; the design decision for the block editor
(DOCUMENTS_PLAN §4) once CM6 is measured under the CSP; the sync
conflict model; the answer-citation UX; and a fresh screenshot-driven
pass on whatever still "feels off" once §1 is enforced.
