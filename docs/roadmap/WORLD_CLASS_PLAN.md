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

**State 2026-10-04:** (a) built, in `tests/test_consistency_contract.py` (not the `test_surface_budget.py` named above): fails on a card in a card, a panel in a panel, a glass in a glass and a `details > summary.btn` in a card; 0 offences in `index.html`.

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

**State 2026-10-04:** (a) built: one filled button per dock (`tests/test_dock_grammar.py`); one per modal and per settings pane, and the meta recipe's no border and no hover, in `tests/test_consistency_contract.py`, both strict since 2026-10-04 (design-1004): the five dialogs and panes that held two or three filled buttons hand one fill over with `stagePrimary`, and the 13 chip rules are 0 (a pressable chip is styled through `.chip-interactive`; the label recipe and a suggested tag keep their edge by name, `META_EDGED`). The account is in HISTORY.

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

**The "act on this" rows (INBOX 393), where each object stands.** One
vocabulary on every object's own menu, one wording and one glyph per row
(`ph:chat-circle Ask Atlas about this` everywhere). Read from the code
2026-09-23; `tests/test_object_actions.py` holds every "yes" in the Ask
column and the one wording.

| Object, its menu | Open | Ask Atlas about this | Show in graph | Remind me | Link to |
| --- | --- | --- | --- | --- | --- |
| Note, Notes card ⋯ | the card | yes | yes | yes | yes |
| Note, Library card ⋯ | Open in Notes | yes | yes | no | no |
| Document, Library card ⋯ | the card | yes | no | no | no |
| Board or map, Boards card ⋯ | the card | yes | no | no | no |
| Reminder, row ⋯ | Open its note (when it has one) | yes | no | n/a | no |
| File, Library card ⋯ | the card | yes (2026-09-23) | no | no | no |

Open next, in impact order: Remind me on a document and a board (a
reminder carries an `entry_id` only, so this needs the reminder to point at
other kinds first, a backend step); Show in graph for a document, now the
graph has a Documents switch; the Library note card's Remind me and Link to,
which the Notes card already has, so the Library one is two rows short of
its twin.

**State 2026-10-04:** (b) the recipe is held by `tests/test_ui_recipes.py` (hand-built menus may not multiply, a pointer-anchored menu is the recipe, a long kebab is grouped); the rule that a menu item has no rest background is `tests/test_consistency_contract.py` (0 offences). The act-on-this rows marked open in the table above are open. S each.

### 1.4 Bars (docks, heads, toolbars, footers)

A bar is one continuous panel surface. Zones inside it (identity, find,
arrange, actions) are separated by a hairline and equal gaps, never by
boxes. Controls inside are ghost, fields are inset, exactly one primary.
The identity zone never shrinks below its title. A form footer is a bar:
secondary on the left, primary at the far right, and nothing floats over
the primary (the scroll-to-top button hides while a footer is in view).
Lint: `tests/test_dock_grammar.py` (exists) plus a Playwright count in
`docks.js` of distinct control heights per bar (must be 1).

**State 2026-09-24:** (a) built: `tests/test_dock_grammar.py`, and `scratchpad/ui-sweeps/docks.js` reports the distinct control heights per bar.

### 1.5 Copy

Sentence case. No em-dashes (lint: `tests/test_no_em_dashes.py` over
`frontend/` and `src/`). One line of description per section, 70 characters
or fewer; longer help goes behind the '?' popover (`data-help-for`). Empty
states name the next action and carry a button for it. Errors say what
failed and what to do, in that order. Numbers use tabular figures.

**State 2026-09-24:** (a) built: `tests/test_no_em_dashes.py`, `tests/test_ai_name.py`, and the '?' popover recipe (`data-help-for`) standing order 6 names.

### 1.6 Keys (the same everywhere)

`/` focuses the surface's search. Arrows walk tablists, menus, lists,
grids. `Enter` opens, `Space` selects, `Escape` closes the innermost thing.
`Ctrl+K` command palette. `Ctrl+N` new note, `Ctrl+S` save, `Ctrl+B/I`
format. `+`/`-`/`0` zoom on canvases, `F` focus selection. `?` opens the
surface's help. Lint: `tests/test_keymap.py` parses a single `KEYMAP` table
in `app.js` and asserts no key is bound twice on the same surface.

**State 2026-09-24:** (a) built under other names: the one table is `DEFAULT_SHORTCUTS` in `app.js` (it also feeds the palette and the shortcut sheet), and `tests/test_frontend_shortcuts.py` asserts no two shortcuts share a chord and every shortcut has an action. There is no `KEYMAP` and no `test_keymap.py`, and nothing further to build.

### 1.7 Responsive (designed, not wrapped)

Four layouts: phone (≤ 600), tablet portrait (≤ 900), laptop (≤ 1280),
desktop. Each surface declares what it becomes at each: a dock becomes
identity + search + primary + more; a sidebar becomes a sheet; a grid
becomes a list; a canvas tool strip moves to the bottom; the tab bar
becomes a bottom bar with five items and "more". Chrome-to-content ratio
on a phone must be under 35% on every tab (measured by
`scratchpad/audit/chrome.js`; today 76%).

**State 2026-09-24:** (d) superseded by UI_MODERNISATION_PLAN Phase 11, whose gate is `scratchpad/ui-sweeps/phonechrome.js`: non-scrolling chrome at most 25% of the height, stricter than the 35% here (HISTORY, 2026-09-23, has the numbers).

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

**State 2026-09-24:** the Gap column read against the code. Built since the table
was written: `[[` autocomplete (D2), the daily-note backend and `Ctrl+D` (D6),
per-sentence citations with the unsupported-sentence line (CHAT_PLAN Phase
1), version history per note (B1), the palette and shortcut sheet from one
table, and a PWA manifest with a share target. Still a gap: typed properties
on notes (D5), the web clipper (D9), PDF annotation (D10, DOCUMENTS_PLAN),
recall cards (§114 A1), sync (B6), importers beyond Markdown (H6), and a
plugin surface beyond the MCP server (B8). Of the six standouts, 2 and 4 are
built, 1 and 3 are half built (I6, B4), and 5 (a privacy receipt page) and 6
(the offline studio) are not built: no code names either.

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

**State 2026-09-24:** (b) every widget renders into one frame (`render(body)` over the `DASH_WIDGETS` table) and the layout editor exists (`dash-edit`, `moveDashWidget`); drag-to-reorder on the grid itself was not found. The recipe-count gate was not re-run. S, `dashboard.js`.

**The first screen, INBOX 436 (2026-10-03):** built; the diagnosis, the target and the before and after numbers are in HISTORY.md ("Moved from the plans, 2026-10-03").

### D2 Notes: list, capture, edit (L, Opus)

**Built** (`[[` autocomplete, and the connections rail 2026-09-27). Moved to HISTORY.md, "Moved from the plans, 2026-10-04 (D2 connections rail)", with the 2026-10-04 re-measure. Nothing of D2 is open here.

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

**State 2026-09-24:** (d) superseded by CHAT_PLAN (one composer; per-sentence citations built in its Phase 1).

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

**State 2026-09-24:** (d) absorbed by UI_MODERNISATION Phases 8 to 11 and the Library passes (list conventions 18 of 18, OPEN.md); the Files row redesign is INBOX 79 below.

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

**State 2026-09-24:** (b) documents have typed properties (`tests/test_doc_properties.py`, the Library's property filter); notes do not: no `properties` column on `entries`, no editor in the note head, no kinds. M, Opus.

### D6 Daily notes and the journal (S, Sonnet)

**The backend is built, 2026-09-13 evening.** `POST /entries/daily/{date}`
creates or returns (the matching GET is read-only and 404s, because a GET that
writes sits outside the CSRF defence, which judges methods) (which is what makes the key safe to press from anywhere:
`startTodaysNote` posted a new note every time, so a day opened twice had two
notes and its writing split between them), and `GET /entries/daily?through=&days=`
answers the calendar strip and the streak in one query.
`tests/test_daily_journal.py`. `Ctrl+D` from every tab is built (2026-09-23,
`todaysNote` in `DEFAULT_SHORTCUTS`, stepping aside on an open board by the
decision in HISTORY's INBOX 321; `oi-ctrld.js`). What is left is the strip
itself and the yesterday/tomorrow pair in the note head.

Exists: the daily-note convention (a note whose first line is `# <ISO date>`)
and the Today action, from timeline Phase 4; and now the endpoints above.
Originally: nothing. Target: `Ctrl+D` opens today's note (created from the
Journal template if missing), a calendar strip on the Timeline dock to jump
between days, a "yesterday / tomorrow" pair of links in the note head, a
streak that counts days with a daily note. Brief: `/entries/daily/{date}`
that creates or returns; the calendar strip as a `.segment` of seven with
overflow into a month popover. Gate: the key works from every tab; the
calendar reflects the DB.

**State 2026-10-04:** (b) the strip (seven days, a dot per written day, week arrows) and the day pair in a daily note's card are built (HISTORY, "the consistency contract's missing lints", row 12); the month popover is built too (HISTORY, same section). D6 is done.

### D7 Timeline (L, in progress: see TIMELINE_PLAN.md)

**State 2026-09-24:** (d) owned by TIMELINE_PLAN.md; nothing is tracked here.

### D8 Reminders (S, Sonnet)

Exists: natural-language add, presets menu, list with views. Wrong: the
list and the notes list use different rows; done items vanish rather than
strike through; no snooze. Target: reminder rows on the same row recipe as
notes, snooze (10m, 1h, tomorrow) in the row menu, done rows strike
through and fade, a "today" band at the top. Gate: row recipe shared
(one class), snooze round-trips.

**State 2026-09-24:** (b) snooze is built (+1h and tomorrow on the row), the list groups Overdue, Today, Upcoming and Done, and a month view exists (`#reminder-calendar`). Not checked: whether the reminder row shares the notes' row recipe (one class), and the 10m snooze. S.

### D9 Links and the web clipper (M, Opus)

Exists: bookmarks with groups. Target: a "Save page" bookmarklet and a
share-target (PWA) that POSTs a URL; the backend fetches (SearXNG-safe,
offline-tolerant) and stores a readable extract as a document with the
source URL, so links become searchable notes. Brief: `/links/clip` +
readability extraction (vendored, MIT) + a bookmarklet generator in
Settings. Gate: a clipped page is found by search within 2s.

**State 2026-09-24:** (c) not built: no `/links/clip`, no readability extraction, no bookmarklet. The PWA share target exists; S5's guard in `core/security.py` is ready for the first fetch. M, Opus.

### D10 Documents and PDFs (L, see DOCUMENTS_PLAN.md; add PDF annotation as
Phase 8: highlight → note with page anchor, rendered by pdf.js vendored)

**State 2026-09-24:** (d) owned by DOCUMENTS_PLAN.md (PDF annotation is not built); nothing is tracked here.

### D11 Whiteboard and mind maps (M, in progress; then MINDMAP_PLAN Phases
4 to 5)

**State 2026-09-24:** (d) owned by WHITEBOARD_PLAN.md and MINDMAP_PLAN.md; nothing is tracked here.

### D12 Graph (L, GRAPH_PLAN.md)

**State 2026-09-24:** (d) owned by GRAPH_PLAN.md; nothing is tracked here.

### D13 Settings (M, Sonnet)

Exists: 3,229 lines of settings.js, ~40 sections. Wrong: prose-heavy,
toggle rows in two recipes, model backend card has three paragraphs.
Target: a two-pane settings (section list left, one section right, search
across all), every section = title + one line + controls, help behind '?',
danger actions in a separate red-edged group at the bottom of their
section. Gate: no paragraph over 120 characters outside a popover; one
toggle-row recipe; the section list is a tablist with arrow keys.

**State 2026-09-24:** (d) absorbed: the two-pane shell with a section list (`#settings-nav`, back and forward) and the '?' popovers are built by UI_MODERNISATION and Brief 4; the prose metric was not re-run here.

### D14 Help, onboarding and the command palette (S, Sonnet)

Exists: help accordion, the welcome overlay, the guided tour (`frontend/js/tour.js`,
DESIGN.md's "A guided tour of the interface": anchored cards over a cut-out
dim, four sections, replayable whole or one section from Settings, help and
guide), `Ctrl+K`. Wrong: the accordion is cards in cards; the palette lacks
half the actions. Target: help as a
searchable list on the panel surface with flat rows; the palette generated
from the same `ACTIONS` table the menus use, so nothing can be missing.
Gate: every `data-action` in the DOM appears in the palette.

**State 2026-10-04:** (b) the palette and the shortcut sheet come from one table (OPEN.md, DOCUMENTS_PLAN row); the gate is built as `tests/test_consistency_contract.py`: the app has no `data-action` attribute, so it reads the two places an action is declared (every `data-tab` button, every `DEFAULT_SHORTCUTS` chord) and fails on one the palette lacks. Four chords had no row and now do (today's note, go back, go forward, reload).

### D15 The shell: top bar, tab bar, bottom bar, sidebars (M, Opus)

Exists: top bar with wordmark, search, utilities (bell, theme, settings,
lock, power) as five square buttons; tab bar; resizable sidebars. Wrong:
the utility cluster is five boxes; on phone the tab bar overflows. Target:
utilities as an icon cluster with hairline separators on the bar surface;
a bottom tab bar on phone (five + more); sidebars as sheets under 900.
Gate: Phase 9 numbers.

**State 2026-09-24:** (d) absorbed by UI_MODERNISATION Phases 9 and 11 (the bottom tab bar on a phone, sheets under 900).

### D16 Write with AI, the writing desk (M, Opus)

**Built 2026-09-20; the dossier (measured before, target, gate, the
built table and its not-verified list) moved to HISTORY.md, "Moved from the plans, 2026-09-24".** State
2026-09-24: nothing open but its two not-verified lines (Stop mid-pass, a
real model's thinking stream) and section 20's open question of a model
badge in the desk's dock.

---

## 4. The backend, made revolutionary (and still SQLite, still offline)

"Revolutionary" here means: architectural moves that make whole classes of
feature cheap that are expensive today, without a server, a cloud or a
second database. Five moves, in dependency order.

### B1 The event log: every change is a fact, the tables are views

**Built.** Moved to HISTORY.md, "From WORLD_CLASS_PLAN.md B1 and
SESSION_BRIEFS Brief 7: the event log". One table rather than two:
`AuditLog` gained `actor` and `payload`, `core/events.py` is the only
writer and holds `replay`, every public write in `entry/manager.py`
records exactly one event with whole-field values, a purge is one event
with the id list, and `tests/test_events.py` (the spec, formerly strict
xfail throughout) passes with no markers left. History, restore by event
and `GET /events?since=` are live; what the log does not yet feed (sync,
global undo of an AI action, the Timeline strip) is in
`docs/roadmap/archive/agent-remaining/brief7-event-log.md`.

**Decisions made (do not remake).** Copied whole from the agent file
on 2026-09-14 (INBOX 220) so they survive its archiving.

1. **Retention is compaction, and the policy is ninety days with the newest
   five kept.** Deletion would break replay. A run of events older than
   ninety days folds into one snapshot holding the whole state at that
   point; the rows behind it keep action, actor, detail and time and lose
   only their values. Five newest kept rather than twenty because
   `EntryRevision` already keeps the last twenty versions of every note for
   ever, so twenty here was a second copy of the same thing and collapsed
   nothing on an ordinary notebook.
2. **What compaction gives up, it says.** Restoring a version whose values
   are gone answers 410 with the reason; the History sheet renders "The text
   from this change is no longer kept." in that row.
3. **No `VACUUM` in the compaction pass.** The freed pages are reused
   immediately, so the file stops growing, and `ai/autonomous.py`'s
   `_vacuum` already returns them to the disk on its own schedule.
4. **A board's replayable entity is the item, not the board.** A note is one
   row and replays to one dict; a board is a note plus everything on it. So
   `whiteboard_node`, `whiteboard_sketch` and `whiteboard_object` each
   replay through `events.replay`, the board's own events (created,
   duplicated, generated, imported, settings changed) sit on `board`, and a
   board's whole state is the union of its items' replays.
5. **`rename_board` is not wrapped in a write scope.** Its title change goes
   through `manager.update_entry`; a scope would fold that note's own edit
   into the board's event and take it out of the note's history. The board's
   settings get their own event beside the note's, so that request records
   two events on two entities, by design.
6. **A compacted event reports what it is, not an edit.** A snapshot's
   `after` is the whole state, so `/events` read it as one change that set
   every field at once. The feed now reports `changed: []` and `snapshot`,
   the number of events the row stands for, and reports `compacted` on the
   rows whose values were dropped. A count rather than a span of time
   because the count is what the compactor knows and stays right when a
   later run folds more events into the same snapshot; the rows behind it
   keep their own timestamps for a reader that wants the dates.
7. **The AI's board tools write through the same helpers as the routes.**
   Four `@events.writes` helpers at the top of `ai/tools/whiteboard.py`
   (`_place_card`, `_draw_link`, `_place_object`, `_new_board`), and the
   payload builders (`events.node_state` and its two siblings, plus
   `events.board_state`) moved to `core/events.py` so both writers share
   one idea of an entity's state. The two batch tools stay undecorated and
   record one event per item: decorating a loop folds a whole batch into
   one event, which is the shape that lost the replay. The tools' entity
   types follow the routes' vocabulary (`whiteboard_node`,
   `whiteboard_sketch`, `whiteboard_object`, `board`); the old
   `mindmap`, `mindmap_node`, `mindmap_link`, `whiteboard_link` and
   `whiteboard_diagram` names had no reader.
8. **The index lives in `_INDEXES` and in a migration.** The startup path is
   what reaches an existing notebook; the migration is what reaches a
   database upgraded through Alembic alone. Both use IF NOT EXISTS, so they
   cannot disagree.

### B2 The job runtime: durable, resumable, observable

**Built 2026-10-04 for the pool's kinds.** Moved to HISTORY.md, "Moved from the plans, 2026-10-04 (B2 durable jobs)": the `jobs` table, leases with a heartbeat, resume after a kill (a real SIGKILL in `tests/test_jobstore.py`), `GET /jobs`, `GET /jobs/stream`, cancel of a queued job.

**Left:** the other kinds onto the table (re-index, embed, skill run, import, backup, model download: each runs in its own thread with its own cancel today and needs a handler that resumes from a cursor rather than from the start); the activity panel reading `/jobs/stream` instead of polling `/tasks`; a running job cannot be cancelled (cooperative stop per handler). M, Opus.

### B3 The retrieval engine: one index, three signals, explained

**Built.** Moved to HISTORY.md, "From WORLD_CLASS_PLAN.md B3 and
SESSION_BRIEFS Brief 11: the retrieval engine". `search/index.py` holds one
FTS5 index over notes, boards, documents, files' extracted text, bookmarks
and reminders, kept in step by the ORM flush; `search/engine.py` returns
`Hit`s carrying bm25, cosine and graph proximity with the words that explain
them; `GET /search` and `/search/stats` serve it; the vector matrix replaced
three per-request scans of every stored vector.
`tests/test_search_engine_spec.py` passes with no markers left. Measured on
the sandbox: keyword 0.6ms and hybrid 0.6ms on 5,000 entries (gates 50 and
200), similarity for one note 18.0ms to 0.0ms. What is left is in
`docs/roadmap/archive/agent-remaining/brief11-retrieval-engine.md`.

**Decisions made** (the three the plan had made differently, revised against
the code and taken; the reasons are in HISTORY):

- A second FTS5 table (`search_index`), not a `kind` column on
  `entries_fts`: that one is external-content over `entries`, so its rowid
  is an entry id and a document could not have a row.
- The index's write path is an `after_flush` hook, not the event log: a
  document edit records no event, so an event-fed index would have gone
  stale on the commonest document write. Brief 7's loud driver is kept
  (`source_for` raises on an unregistered kind).
- `before:`/`after:` are exclusive, `until:`/`since:` inclusive; an
  unreadable date is left in the text rather than guessed at; a query with
  operators is never "time only".

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

**State 2026-09-24:** (b) `entities`, `entity_mentions` and `derived_facts` (kinds `claim` and `question`) exist, and tensions are computed per request (`routes_entries.py`); typed links, a derived tensions table, the rebuild-from-events determinism and the Tensions widget are not built. M to L, Opus.

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

**State 2026-09-24:** (b) built: the verifier and budget (Brief 13, `tests/test_harness_verifier.py`), small-model mode in `run_agent` (audit A4), learning from filing corrections (`ai/learning.py`). Open: pre and post conditions per tool checked in Python, grammar-forced JSON, and the 3B gate (evals at 80%), which is section 9's breadth. M.

### B6 Local-first sync (L, later; design now)

Because B1 makes every change an event, sync is: export the log since a
cursor as an encrypted file, import elsewhere, resolve by last-writer-wins
per field with the event history kept (no CRDT needed for a single-user
notebook; conflicts become two versions in History). Transport: a folder
(iCloud/Dropbox/Syncthing) or a LAN pairing over the existing server with a
QR code. Gate: two instances round-trip 1,000 events with no loss.

**State 2026-09-24:** (c) not built; H5 below is the same row. L, design first.

### B7 The API contract

One error shape (exists, B3 in PLAN.md), cursor pagination on every list
(finish D4 in the audit), ETags on entries, `If-Match` on writes (so the
editor cannot clobber a background AI edit), an OpenAPI schema behind the
auth gate, and a `/capabilities` endpoint the UI reads once so features
appear only when their backend is there (OCR, embeddings, TTS).

**State 2026-09-24:** (b) the error shape exists, the schema is behind the unlock (`tests/test_openapi_gate.py`), and every list takes a `limit` (`tests/test_list_limits.py`). Not built: cursor pagination, ETags and `If-Match` on entries, and `/capabilities`. M.

### B8 Extensions

The MCP server exists. Move: the same tool registry that serves MCP serves
a `/tools` HTTP API and a "user skills" folder of Markdown skills (already
the skill format). That is the plugin API: a skill is a Markdown file with
tool calls; a tool is a Python function registered with a contract. Gate:
a skill dropped into the folder appears in the picker without a restart.

**State 2026-09-24:** (b) the MCP server exists (`src/memorymap/mcp_server.py`) and the registry is served over HTTP (`GET /chat/tools`, `POST /chat/tools/execute`); a user skills folder of Markdown files picked up without a restart does not. M.

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

**State 2026-09-24:** item by item, read against the code (not driven):

1. (a) built: the Notes box parses `tag:`, `is:`, `before:` and the rest
   (app.js ~9894) and `search/engine.py` answers the same operators;
   whether the Library, Timeline and palette share the parser was not checked.
2. (a) built (saved searches, `routes_settings.py` and app.js).
3. (b) documents have unlinked mentions (`routes_documents.py`); notes do not. S.
4. (b) document templates fill `{{title}}` and `{{date}}`; `{{clipboard}}`
   and a cursor mark are not built, and note templates were not checked. S.
5. (b) merge, delete, add to a board or map and make a map exist; move to a
   space and export from a selection were not found. S.
6. (a) built: JSON, CSV, Markdown and zip export, OPML for maps, the print
   stylesheet for documents.
7. (c) Notion, Evernote and Apple Notes importers are not built (H6). M.
8. (a) built: `DEFAULT_SHORTCUTS` and the shortcut sheet.
9. (b) documents have word count and reading time; notes were not found to. S.
10. (b) the bin restores entries (notes, boards, maps: `POST /entries/{id}/restore`);
    documents and reminders were not traced. S.

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
| Idle requests per minute | `scratchpad/ui-sweeps/idle.js` | **2 on 2026-09-21**, the gate met (`/models/status` backs off to a two-minute ceiling while its answer does not change, `/reminders` once a minute; was 4, and 14 before that). Timer wakes in the same minute went 124 to 5, and idle CPU 6.06% of one core to 5.55%: INBOX 266 item 7 | ≤ 2 |
| First paint of Graph on 2k notes | `graph-fixture.js` | n/a (SVG) | < 300ms |
| Search p95 on 5k notes | `tests/test_search_perf.py` | 14.2 ms median at 3,000 notes, 4 statements, flat (8.4 at 200, 10.5 at 1,000), 2026-09-12 | < 200ms |
| Capture write cost | the same probe against `POST /entries` | 9.0 ms and 16 statements at 1,206 notes, identical at 56 and 406, 2026-09-12 | flat |
| Resurfacing read | `ai/resurface` | 6.7 ms at 800 notes after its index; 23.0 ms with no LIMIT and 58.7 ms with a LIMIT and no index | flat |
| Skill eval pass rate, 3B model | `pytest -m evals` | n/a | ≥ 80% |

**State 2026-09-24:** a reference table, not a work item. The rows still reading n/a (the graph's first paint on 2k notes, the 3B eval pass rate) are open under GRAPH_PLAN and section 9.

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

**State 2026-09-24:** (d) a standing checklist, not a row: the sweeps in `scratchpad/ui-sweeps/` hold most of it, and nothing here is scheduled on its own.

---


## Audit, 2026-09-13 night (INBOX 209: "poke holes in this application")

**Moved whole to HISTORY.md, "Moved from the plans, 2026-09-24".** A1 to A7 and A9 are done (the first
A1 to A6 rows in the table were the pre-fix copies of the same findings).
State 2026-10-04: A8's '?' help on every tab's dock is built (HISTORY, "the
consistency contract's missing lints"); the other three A8 items were not
re-measured here.

## 8. Execution order for the coming week (Opus/Sonnet sessions)

### What is left, 2026-09-24 (INBOX 399: "what is left in the world class plan??")

Every row of this plan read against the code, HISTORY, OPEN.md and INBOX on
2026-09-24; each row below carries a "State 2026-09-24" line where it
stands. Ranked by impact: what a person meets daily, then what unblocks the
most, then the rest. Size in sessions (S half, M one, L two or more).
Mirrored in `agent-remaining/OPEN.md`, table B.

| # | Row | What is left | Size | Where |
| --- | --- | --- | --- | --- |
| 1 | ~~F3, §16~~ | ~~`semantic_search` reads and parses every vector per request~~ built 2026-09-24: scores against the engine's matrix; 5,000 notes 19 to 74 ms before, 1.0 to 1.2 ms after (`tests/test_semantic_search_matrix.py`) | done | HISTORY |
| 2 | ~~§12, Brief 15~~ | ~~S1, S2, S3, the rest of S5, S6, `/debug/health` paths~~ built 2026-09-24; ~~`tests/test_lan_mode.py`, the switch and its Settings toggle~~ built 2026-09-26; ~~LAN mode over IPv6~~ built 2026-10-04 (`netbind.listening_socket`, one dual-stack socket; the `[::1]` launcher test skips where the machine has no IPv6) | done | HISTORY |
| 3 | ~~B2~~ | ~~durable jobs: a table, leases, resume after a kill, `/jobs/stream`~~ built 2026-10-04 for the pool's six kinds (`core/jobstore.py`, `tests/test_jobstore.py`); left: the other kinds onto it, the panel on the stream | M | HISTORY; B2 |
| 4 | ~~D2, 261~~ | ~~the connections rail always visible on desktop, which is also where `GET /resurface/near` would show~~ built 2026-09-27 (`#notes-rail` at 1280 and wider, the sheet below, by decision); re-measured 2026-10-04 with `notesrail.js` on the showcase notebook, 30/30 light and 30/30 dark at 1440, 1280, 1024 and 390 | done | HISTORY; D2 |
| 5 | ~~I1, H1~~ | ~~the tension and answered-question passes~~ built 2026-10-04 (`facts._pair_passes`, `tests/test_night_pairs.py`); 2,000 notes, a first run 39 to 57 s with no model, 130 to 215 s with a fake judge (gate 5 min), card 39 to 84 ms; left: pass 2's kinds (dates, duplicates, entities) as derived facts | done | HISTORY |
| 6 | ~~§14.3, I6, H2~~ | ~~chunk vectors, then paragraph anchors, three signal bars per sentence and the side-by-side view~~ built 2026-10-04 (`chunk_vectors`, `search/chunks.py`, `tests/test_chunk_vectors.py`, `tests/test_evidence_spec.py`); seeded 1,000 notes, recall@5 0.01 to 0.42; left: "wrong" on a card as a correction (I7) | done | HISTORY |
| 7 | ~~I3, H2~~ | ~~the questions view, `GET /questions`, the Ask scope, the answered-by link~~ built 2026-10-04 (`ai/questions.py`, `routes_questions.py`, Notes, Questions; `tests/test_questions_spec.py`, 500 questions listed under 100 ms) | done | HISTORY |
| 8 | ~~Placed 2026-09-13~~ | ~~`/files/gallery`'s five callers onto `apiPagedList`, then its default to 200~~ built 2026-09-24 (`tests/test_gallery_paging.py`) | done | HISTORY |
| 9 | ~~§16~~ | ~~cache `similar_pairs` for link suggestions and tensions~~ built 2026-09-24: keyed by the matrix's version; 5,000 notes 322 to 104 ms a repeat request (`tests/test_similar_pairs_cache.py`) | done | HISTORY |
| 10 | D5 | typed properties on notes (documents have them) | M | `core/database.py`, the note head |
| 11 | §17 | review queue, filing style, explain this note, most opened this month (S each); tidy proposals, charts from questions (M each); `.ics` export built 2026-09-26 | S to M | §17 |
| 12 | ~~D6~~ | ~~the calendar strip, the yesterday/tomorrow pair and the month popover~~ built 2026-10-04 (`timeline.js`, `note-cards.js`; HISTORY, "the consistency contract's missing lints") | done | HISTORY |
| 13 | ~~§1, D14~~ | ~~the lints not written: surface budget, one primary per modal, meta without border or hover, a menu item's rest background, every `data-action` in the palette~~ built 2026-10-04 (`tests/test_consistency_contract.py`); left: the two ratchets (5 modals with 2 to 3 filled buttons, 13 chip rules) | done | HISTORY |
| 14 | ~~A8~~ | ~~the '?' help on every tab's dock (Chat and Graph have it)~~ built 2026-10-04: Dashboard and Reminders were the two docks without one (`tests/test_dock_help_507.py` fails on a dock with none) | done | HISTORY |
| 15 | §1.3 | Remind me on documents and boards (the reminder must point at other kinds first), Show in graph for a document, the Library note card's Remind me and Link to | S to M | app.js, library.js, `routes_reminders.py` |
| 16 | B7 | cursor pagination, ETags and `If-Match` on entries, `/capabilities` | M | `api/` |
| 17 | B8, H4 | a user skills folder picked up without a restart; `/api/v1`; the agent named on an external write | M | `ai/skills.py`, `mcp_server.py` |
| 18 | B4 | typed links, a derived tensions table, rebuild determinism, the Tensions widget | M to L | `ai/tensions.py`, `ai/entities.py` |
| 19 | B5, §9 | per-tool pre and post conditions, grammar-forced JSON, evals at 3B and 4B, concurrent tool calls, Ollama's native dialect | M | `ai/tools/`, `tests/test_skills_evals.py` |
| 20 | I7 | the "Learned from you" line with a filing accuracy number | S | `settings.js` |
| 21 | I8, H3 | the model bench | M | a new `ai/bench.py` |
| 22 | I2, H8 | the margin reader (after row 6's chunks) | M | `documents.js`, a new `/editor/read` |
| 23 | I5, H8 | time travel: `as_of` on chat, then-and-now | M | `routes_chat.py` |
| 24 | D9 | the web clipper | M | `routes_bookmarks.py`, `core/security.py` |
| 25 | H6, §5.7 | Notion, Obsidian, Evernote and Apple Notes import; keyboard-complete; a WCAG audit; multi-window; a first-run path timed to a first answer | M to L each | H6 |
| 26 | H7 | boot JS under 1 MB (1,072 KB now), first paint under 300 ms, every list over 200 rows virtualised | S each | `boottime.js` |
| 27 | H9 | usage ledger, time to first answer, simple mode, a perf budget in CI, an axe sweep, a global capture hotkey, fault injection in `errors.js`, speculative retrieval | S to M each | H9 |
| 28 | §19 | torch still loads at launch for a notebook with notes (a preference, or ONNX); the Phosphor subset; lazy stylesheets; the whole `EXPLAIN QUERY PLAN` pass; queue back-pressure; the Windows frozen startup | S to M | `ai/embeddings.py`, `index.html` |
| 29 | §10 | F1 a `prefs` module, F5 `api.stream`/`api.upload` and the no-bare-fetch lint, F7's threads onto the pool (the ratchet is built), F10 a `readings` table, F12 a store (F4 built 2026-09-26) | S to L | §10 |
| 30 | §5 | notes' unlinked mentions, word count and reading time; `{{clipboard}}` and a cursor mark; move to a space and export from a selection; the bin for documents and reminders | S each | §5 |
| 31 | Placed 2026-09-09 | 1 capture into the selected space and a bulk move; 99 (b) scroll restore, (c) the AI dot's latency tooltip, (d) Paste as note; 92's row redesign; 97 RapidOCR; 79 and 22 to 23 not re-checked; 261's vault re-key (`POST /auth/rotate-vault-key`) has no UI | S to M | those sections |
| 32 | 301 | the navigation and undo audit table, then the fixes | M | every surface |
| 33 | §21 | rows 1 and 2 on the notice recipe, row 12's "check the address" in the status line, row 13's update size in the About page | S | app.js, `routes_models.py`, settings.js |
| 34 | D1, D8, §13 | drag on the grid; the reminder row recipe and a 10m snooze; the minimap's NaN rects, the tab bar at 600 to 819px, a whiteboard menu sweep, the tidy layout past five nodes (all not re-checked) | S each | their plans |
| 35 | §2 | the offline studio (the privacy receipt, its record, API and Settings page, built 2026-09-26) | L | new |
| 36 | B6, H5 | sync without a server | L | design first |
| 37 | Audio | deferred until the owner says go | L | the audio section |
| 38 | §20 | three open questions, each the owner's decision | none | §20 |

The 2026-09-08 week table that stood here is superseded by the list above
(its rows are either built or carried into it) and moved to HISTORY.md, "Moved from the plans, 2026-09-24".

---

## 9. On testing with a real model in the sandbox

The dev-only runner was built 2026-09-20; its record moved to HISTORY.md, "Moved from the plans, 2026-09-24".

**What is still open here.** The evals themselves: `tests/test_skills_evals.py`
holds the AGENT_SKILLS_REFORM acceptance gate and is the only eval module so
far. Everything else CLAUDE.md section 4 lists as unproven (concurrent tool
calls at index 1 and beyond, Ollama's native tool-call dialect) is still
unproven, and each wants its own eval beside that one.

**State 2026-09-24:** (b) the runner and one eval module exist; open is breadth: the same gate at 3B and 4B, and an eval each for concurrent tool calls at index 1 and beyond and for Ollama's native tool-call dialect. M.

---

## 10. Flaws found by static probes (cheap to reproduce, each with its command)

Run from the repo root. Each line is a class of bug, not a single bug; the
count is the size of the class today. A session that takes one of these
should fix the class and add the lint that keeps it fixed.

| # | Flaw | Evidence | Why it matters | Fix (and lint) |
| --- | --- | --- | --- | --- |
| F1 | 57 distinct `localStorage` keys read ad hoc, 14 of them `JSON.parse`d | `grep -o 'localStorage.getItem("[^"]*")' frontend/js/*.js \| sort -u \| wc -l` | This is the shape of the worst UI bug in the project's history (two settings missing from `APPEARANCE_DEFAULTS` wrote `NaN` into CSS): a value invalid where it is used, set somewhere else. Corrupt or missing storage throws inside JSON.parse and takes the caller's whole init with it. | One `prefs` module: a schema with defaults and a version per key, `prefs.get(key)` never throws and never returns undefined, migration on version bump. Lint: no direct `localStorage.getItem` outside `prefs.js`. |
| F2 | 25 list endpoints, 3 accept `limit` | `grep -n "^def list_" -A 6 src/memorymap/api/routes_*.py \| grep -c limit` | Every list is O(notebook). A 5k-note notebook makes the Library, Timeline and Graph tabs multi-second. (MODERNISATION_AUDIT D4.) | Cursor pagination on all 25 with one helper, `?limit=&cursor=`, `next_cursor` in the body; the frontend's list renderers page on scroll. Lint: a test enumerates routers and asserts every `list_*` takes `limit`. |
| F4 | **Re-measured 2026-09-13: 147 broad handlers, of which 52 say nothing at all.** `scratchpad/probe_excepts.py` reports both numbers, because the grep below counts every handler and the ones that cost something are the silent subset: a handler that logs with `exc_info` is the fix, not the flaw. Original figure: 88 `except Exception:` / bare `except:` in `src/` | `grep -rn "except Exception:\|except:" src/memorymap --include=*.py \| wc -l` | Failures become silence (the "features that never ran once" shape). | Each one either re-raises as the error contract, logs with `exc_info` to the logbuffer, or is narrowed. Lint: ruff `BLE001` enabled with a per-site `# noqa: BLE001 <reason>`. |
| F5 | 13 raw `fetch()` calls beside `api()` | `grep -n 'fetch(\`\|fetch("' frontend/js/*.js \| grep -v "api\b"` | Each re-implements the auth header, the error contract and the offline path; one is `/chat/stream`, the most important call in the app. | `api.stream()` and `api.upload()` helpers; the 13 sites move onto them. Lint: no bare `fetch(` outside `api.js`. |
| F7 | Threads in 16 modules share SQLAlchemy sessions created per call | `grep -rln "threading.Thread" src/memorymap` | SQLite is fine with this only while each thread opens its own session and nobody passes ORM objects across; nothing enforces it, and the "Could not refresh instance" 500 seen this session was exactly that shape. | B2 job runtime: one worker, jobs get a fresh session, results are plain dicts. Lint: `Thread(` allowed only in `core/jobs.py`. |
| F10 | Extracted text, captions and OCR live in three columns with three UIs | `grep -n "vision_ocr_text\|ocr_text\|caption" src/memorymap/api/routes_files.py \| wc -l` | The Files card shows one, hides one, and the search indexes some; the owner's "only the first line" report was one symptom. | One `readings` table (`media_id, kind, page, text, model, ts`), one renderer, all kinds indexed (B3). |
| F11 | The graph, dashboard constellation and map thumbnails are three renderers | `grep -c "forceSimulation" frontend/js/graph.js frontend/js/dashboard.js frontend/js/whiteboard.js` | Three physics, three colour maps, three sets of bugs. | GRAPH_PLAN §3: one renderer with `size: "pane" | "tile" | "full"`. |
| F12 | Frontend state lives in module globals, DOM and localStorage with no single owner | MODERNISATION_AUDIT C2 | Every "the list did not refresh" bug. | A small store: `state.get/set/subscribe` per slice, renderers subscribe; introduced slice by slice (notes list first). |

F3, F6, F8 and F9 are done and moved to HISTORY.md, "Moved from the plans, 2026-09-24".

Two flaws this session found by driving the app, recorded here so they are
fixed as classes: a new board was created through a path that also created
a note (entries and boards share a table and a create path; the filter
belongs in one place), and a dialog's `<details>` did not close on Escape
(now handled globally; the lint is "every `details` menu closes on Escape",
in `docks.js`).

**State 2026-09-24:** the rows left:

- F1 (c) no `prefs` module; 171 direct `localStorage.getItem` calls. M.
- F2 (b) every list takes `limit` (`tests/test_list_limits.py`); cursors and
  the frontend's paging are not built (`/files/gallery`'s half was built
  2026-09-24). M.
- F4 built 2026-09-26: BLE001 is enabled (HISTORY.md, "Moved from the
  plans, 2026-09-26").
- F5 (b) every bare `fetch` must carry the auth header
  (`tests/test_raw_fetch_headers.py`); the `api.stream`/`api.upload` helpers and
  the no-bare-fetch lint are not built. S.
- F7 (b) the pool is built (A3); a ratchet holds the thread sites at 13
  modules (`tests/test_flaw_class_lints.py`, 2026-09-26). Left: moving them
  onto `core/jobs.py` one at a time, lowering the ratchet each time. M.
- F10 (c) no `readings` table (`page_reads` is document pages only). M.
- F11 (d) GRAPH_PLAN section 3 owns it.
- F12 (c) no store. L.

---

## 11. The week, session by session (Opus/Sonnet), and the quarter

Superseded twice: by section 18's order (2026-09-14) and by the open list
at the top of section 8 (2026-09-24). The day-by-day table, the quarter and
the Fable hand-off list moved to HISTORY.md, "Moved from the plans, 2026-09-24"; everything in them that is
still open is a row of that list.

---

## 12. Security review (read, not penetration-tested; each item names the file)

The threat model matters: the app binds 127.0.0.1 by default, so most of
these are "fine on localhost, real the day LAN mode ships". They are
listed so LAN mode cannot ship without them (Brief 15).

S1 to S15 are fixed, tested or recorded, and moved to HISTORY.md, "Moved
from the plans, 2026-09-24": S1 (the media cookie), S2 (the per-client
throttle), S3 (imports confined to home and the data folder), the rest of S5
(the fetch lint sees every way out) and S6's redirect half were built that
day. S6's other half, the configured model address on the privacy receipt,
was built 2026-09-26 with the receipt's API (HISTORY.md, "Moved from the
plans, 2026-09-26"). What is left is the rest of Brief 15 below.

**Brief 15 is built** (2026-09-24 and 2026-09-26, HISTORY.md): the
hardening, `tests/test_lan_mode.py` against the real launcher on 0.0.0.0,
and the switch in Settings, Account and security. IPv6 built 2026-10-04
(HISTORY.md, "row 2: LAN mode over IPv6"). Nothing is left of Brief 15.

**Security audit, 2026-10-05:** SEC-01 to SEC-09, SEC-11 to SEC-13, SEC-15
and SEC-16 fixed (HISTORY.md, "Security audit fixes, 2026-10-05"). Open:
SEC-08's real fix (a self-signed certificate at first LAN start, with a
fingerprint for the phone to compare); SEC-10 (a folder import killed
mid-way duplicates on re-run: dedupe on source path and content hash,
rollback per failed file, a task-history row at start); SEC-14 (ask-history
answers and chat messages that quoted a note before it went private stay
plain; `/export/json` now says `is_private`); SEC-17's floor (warn or raise
the minimum when a notebook has private notes); SEC-02's last step
(`read_url` parks for a URL not in the question or this turn's results).

**Decisions made** (the owner, 2026-10-05; do not remake):

1. **Auto-update: "Ask once".** The first launch asks once, in the terminal
   (start.sh, when there is a terminal to answer in) or in the app, whether
   to check for updates automatically, and remembers the answer
   (`update_choice_made`). Until it is answered nothing about updating
   touches the network: the launchers neither pull nor reach the remote, the
   doctor included. Settings, About keeps the switches and a "Check for
   updates" button, which checks once whatever the switch says. The packaged
   app asks in the app; there, yes means "tell me", and installing stays
   behind its own switch.
2. **LAN HTTPS: "Yes, self-signed HTTPS".** On the first LAN start the app
   makes a self-signed certificate with `cryptography` (no network), kept in
   the data folder at 0600, and serves HTTPS on the network; loopback stays
   HTTP. Settings, LAN shows the certificate's fingerprint, so a phone user
   can check the one-time warning, with "Regenerate certificate". The help
   says the traffic is encrypted and explains the warning.

## 13. Open bugs and gaps from the merged agent reports (with owners)

Each of these was found by measuring and deferred with evidence; the
`agent-remaining/*.md` file named carries the file, id and next step.

- Whiteboard board-preview minimap writes NaN rects (20 console errors on
  a notebook with boards; `app.js` `board-minimap-card`). Owner: mindmap
  item F (previews), since the new miniature renderer replaces it.
- 1024px still wraps the Writing Room controls and the capture attachment
  row. Owner: consistency.md.
- Tab bar scrolls between 600 and 819px; short tab captions below 480 are
  a copy decision for the owner. Owner: responsive.md.
- Notes (8) and Graph (9) docks are over the seven-control ceiling. Owner:
  docks.md; the fix is a second "more" group, not hiding.
- `#wb-topbar` is 104px at 390. Owner: responsive.md.
- The whiteboard's five menus were restyled but never driven (the board
  would not open in the driver). Owner: consistency.md; first step is a
  sweep that opens a board by API id, then each menu.
- The SVG graph path stays behind a flag until the drag gate is met on a
  quieter machine. Owner: GRAPH_PLAN Phase 2.
- Timeline: everything (audited, not built). Owner: Brief 5.
- 54 paragraphs still outside popovers. Owner: Brief 4.
- `#library-media-refresh` is misnamed; Settings has two heading indents.
  Owner: docks.md.
- Tidy layout never measured past five nodes; a newly opened map leaves
  its root under the top bar. Owner: mindmap.md item H.

**State 2026-09-24:** re-read against OPEN.md and the code: the
Notes and Graph docks are at 6 controls (OPEN.md B, 2026-09-20);
`#library-media-refresh` no longer exists; the Timeline was built
(TIMELINE_PLAN); the Writing Room was rebuilt as the writing desk (D16, in
HISTORY); the 54 paragraphs were Brief 4's. Not re-checked here, so still open
with their owners: the board-preview minimap's NaN rects, the tab bar between
600 and 819px, the whiteboard's five menus driven by a sweep, the SVG graph
flag (GRAPH_PLAN Phase 2), the tidy layout past five nodes (MINDMAP_PLAN).

## 14. The core algorithms, read line by line (2026-09-08)

The owner asked whether the core algorithms are the best they can be, and
what would revolutionise the app decisively. Read, not assumed:
`search_manager.py`, `embeddings.py`, `janitor.categorise`, `intent.py`,
`grounding.py`, `_ensure_fts5`.

### What is already good

- Keyword search is FTS5 with `bm25()`, tag boost, prefix fallback,
  vocabulary-based spelling correction, then an OR fallback. Sound.
- Semantic search is brute-force cosine with a z-score relative floor,
  scored on `(id, vector)` tuples, fine to about 50k notes.
- Fusion is reciprocal rank fusion, then a two-hop graph expansion.
- Filing asks the model first, falls back to the embedding centroid, and
  logs the method. Every decision is explainable.

### What was wrong, and is fixed this session

Both fixes (stemming, and grounding from touched notes) moved to HISTORY.md, "Moved from the plans, 2026-09-24".

### The moves that would outshine everything else, in order of leverage

1. **A learning loop that never leaves the machine.** Every correction the
   owner makes is a training signal nobody uses: a re-filed note, a
   dismissed link suggestion, a result opened after a question, an
   accepted "related" chip. Store each as an event (B1), and let three
   algorithms read them: filing gets the nearest already-filed notes and
   the owner's past corrections as evidence in the prompt (k-NN
   few-shot from the notebook itself, which is the single biggest
   accuracy lever for a small model); search gets a per-note boost from
   what was opened after similar questions, with decay; link suggestions
   never resurface a dismissed pair and raise the prior of an accepted
   neighbourhood. No competitor does this offline. Size M; spec tests
   first (`tests/test_learning_spec.py`, strict xfail).
2. **Index everything** (B3). Documents, files' extracted text, board
   nodes and bookmarks are not in FTS5 or the vector table, so Ask cannot
   see them unless attached by hand. This is the largest capability hole
   in the app and is already specified; it goes first among the backend
   moves.
3. **Chunked vectors and sentence-level citations.** One vector per note
   loses long notes and every document. Embed paragraphs (one row per
   chunk, `entry_id, ordinal, vector`), retrieve chunks, and ground each
   answer sentence by cosine against chunks when an embedding backend is
   up, falling back to the lexical scorer. A citation then points at the
   paragraph, and the chip quotes it. Size M.
4. **Claims and tensions** (B4): the invention that no notebook has. It is
   expensive (a model idle loop) and depends on 1 to 3; keep it after them.

What is not worth doing: replacing RRF, replacing bm25, or an approximate
nearest-neighbour index below 50k notes. The measured costs are elsewhere.

**State 2026-09-24:** 1 is (b): the loop is built for
filing (`ai/learning.py`, corrections in `AuditLog`) and search
(`open_after_ask`); dismissed link pairs and accepted neighbourhoods were not
traced. 2 is built (B3). 3 is built 2026-10-04 (row 6; HISTORY, "row 6: paragraph vectors and evidence cards").
4 is B4, (b).

## 15. Inventions: eight things no notebook does, specified for Opus and Sonnet

Written 2026-09-08 by direct instruction ("invent world class features
... something the likes of which the world hasn't seen yet"). Each one is
specified to the level a session can build from without a design pass:
what the person sees, why it is new, what already exists to build on
(checked in the code, file named), the data, the endpoints, the algorithm,
the tests written first, the gate, the size and the model. Dependencies are
explicit; the order at the end respects them.

### The asymmetry these exploit

Every cloud notebook rations model calls, because each call costs money.
MemoryMap's model is local, idle 99% of the time, and free per token. That
is the one thing a cloud product cannot copy: **the notebook can spend
hours of model time on itself while nobody is watching**, and show its
work in the morning. Inventions 1, 3, 5 and 8 are built on that. The
second asymmetry is that the corpus is one person's own thinking, not the
web: contradictions, repeated ideas, unanswered questions and forgotten
notes are *signal* here, where in a search engine they are noise.
Inventions 2, 4 and 6 are built on that. Invention 7 is the loop that makes
the other seven get better with use.

### I1 The night shift: the notebook that understands itself while you sleep

**What the person sees.** A "While you were away" card on the Dashboard
each morning: "Read 14 new notes. Found 3 claims that disagree with older
ones, 2 questions you answered without noticing, 6 dates, 4 people. 2
notes look like duplicates." Each line opens a review list where every
item is accept / dismiss / open the note, and each item shows *which note
and which sentence* it came from and *which model, when* decided it. Off
by default, one switch in Settings > Background tasks, with a token budget
per night and a battery guard.

**Why it is new.** Notion AI, Mem and Reflect do a summary on demand.
Nobody runs a standing, budgeted, auditable analysis of the whole
notebook on the owner's own machine, with provenance on every derived
fact, that the owner can reject line by line and that learns from the
rejections (I7).

**Builds on.** `ai/autonomous.py` (the scheduler: interval, battery guard,
snooze, a barred-destructive-tools agent pass; start() wired in app
lifespan), `ai/entities.py` (`extract_entities_pass`, `Entity`,
`EntityMention`), the tensions pipeline in `api/routes_entries.py`
(`TENSION_CANDIDATE_THRESHOLD`, `accept_tension`, dismissed set in a
preference), `EntryDate` and `reminder_parser.py` (dates), the near
duplicate check on save, `entry_revisions` (so "new since last run" is a
revision cursor, not a timestamp guess).

**Data.** One new table `derived_facts` (id, kind in {claim, question,
duplicate, tension, entity, date}, entry_id, revision_id, span_start,
span_end, text, payload JSON, confidence 0 to 1, model, computed_at,
status in {new, accepted, dismissed}, run_id). One `night_runs` table
(id, started_at, finished_at, cursor_revision_id, tokens_spent, budget,
counts JSON, stopped_reason). Every existing derived thing (entity
mention, tension) gets a `run_id` column so the morning card can group by
run. Nothing is written to a note. Ever.

**Endpoints.** `GET /night/latest` (the card), `GET /night/runs/{id}/facts?
kind=&status=` (the review list, paged), `POST /night/facts/{id}` (status
accept or dismiss; accept of a `tension` calls the existing accept path;
accept of a `date` creates the reminder through the existing reminder
route; accept of a `duplicate` opens the existing merge), `POST /night/run`
(manual, for testing and for "run now").

**Algorithm.** A run is a plan of passes with a shared budget: (1) cursor:
revisions since the last run; (2) cheap passes first, no model: dates
(`reminder_parser`), duplicates (embedding cosine over new notes against
all, threshold from the save-time check), entities (regex plus the
existing pass); (3) model passes, each note once, one prompt per note that
returns a JSON list of claims and open questions (the schema is in the
prompt, the parser rejects anything else); (4) tensions: for each new claim,
top-k similar claims by cosine, then one model call per pair above the
threshold asking "compatible / incompatible / unrelated" with a one-line
reason; (5) answered questions: for each open question, top-k similar
claims written *later*; one model call asks "does this answer it". Stop
when the budget is spent; record where; resume from the cursor next night.
Small-model mode: passes 3 to 5 use the small prompt variants
(`AGENT_SKILLS_REFORM` Phase B), one item per call.

**Tests first** (`tests/test_night_shift_spec.py`, strict xfail until each
passes): a run over the fixture notebook with the fake model produces the
expected counts per kind; every fact cites an entry, a revision and a
span inside it; a second run with no new revisions produces zero facts
and spends zero tokens; a budget of N stops the run with
`stopped_reason=budget` and a cursor before the unprocessed notes;
dismissing a fact hides it from `/night/latest` and writes a
`corrections` event (I7); a run is skipped on battery; nothing in
`entries` changes (row hash before and after).

**Gate.** On the 2,000-note fixture, a full first run under the fake model
finishes in under 5 minutes wall clock and the card renders under 100ms
from `/night/latest`. **Size** L (two sessions). **Model** Opus for the
runner and prompts, Sonnet for the review UI on the modal and list
recipes.

**State 2026-10-04:** passes 1, 3, 4 and 5, `night_runs`, `GET /night/latest` and the morning card are built (HISTORY, "row 5: tensions and answered questions"). Left: pass 2's cheap kinds (dates, duplicates, entities) as `derived_facts` rows, with the accept of a date (a reminder) and of a duplicate (the merge). H1 below is the same row.

### I2 The margin reader: a second reader in the editor, from your own notes

**What the person sees.** While writing a note or document, a quiet
margin column (off by default per editor, one toggle in the toolbar's
more menu) fills with at most three cards, each pinned to the paragraph
it is about: "You wrote the opposite on 12 May: 'the batch size should
stay at 32'" (open, or mark not a contradiction), "This repeats your
note 'Why I left the project'" (open, link), "Answers your open question
from March: 'is the API worth the cost?'" (link as answer), "A date:
Thursday 3pm. Make a reminder?". Nothing is ever inserted into the text.
Cards fade when the paragraph changes and re-run after a pause.

**Why it is new.** Every editor's AI writes *for* you (autocomplete,
rewrite). None reads *with* you against your own past thinking. Obsidian
Copilot chats; Notion AI drafts; Mem surfaces similar notes as a list, not
pinned to the sentence and not typed (contradiction, repeat, answer,
commitment).

**Builds on.** The Phase 0 backdrop and underline geometry in
`documents.js` (a card is anchored the same way an underline is), the
selection toolbar D2, the chunk vectors from §14 item 3, I1's
`derived_facts` for claims and open questions, `EntryDate`.

**Data.** None persisted except accepted links (typed `EntryLink`:
contradicts, repeats, answers) and created reminders. Cards are computed.

**Endpoints.** `POST /editor/read` with `{entry_id | document_id, paragraph:
str, ordinal: int}` returns `[{kind, text, source_entry_id, source_span,
reason, confidence}]`, at most three, in under 300ms without the model
(similar chunk plus claim table lookups) and, when the model is up, a
second event over SSE with the model-judged kinds. Debounced client-side at
1.2s after typing stops in a paragraph; one in-flight request per editor;
the reply is dropped if the paragraph text changed.

**Algorithm.** Embed the paragraph (cached by text); top-5 chunks by
cosine excluding the current note; for each, if I1 has a claim in that
chunk, ask the model (small prompt) for the relation in {contradicts,
repeats, answers, unrelated}; without a model, show "related" only. Dates
through `reminder_parser` locally. Rank by confidence, cap three, never
show the same source twice in one note session.

**Tests first** (`tests/test_margin_reader_spec.py`): the endpoint
returns at most three cards; a paragraph that repeats a fixture note
verbatim yields `repeats` with that note; a paragraph that negates a
fixture claim yields `contradicts` under the fake model; a date yields a
`date` card with a parsed ISO timestamp; with the model down the endpoint
still answers in under 300ms with `related` cards; `test_frontend_ids.py`
and the CSP lint pass for the margin column.

**Gate.** Measured in Chromium: typing latency in the editor unchanged
(frame time p95 within 1ms of before, `scratchpad/ui-sweeps/editor.js`);
a card appears within 2s of a pause. **Size** M. **Model** Opus (the
frontend anchoring is design work).

**State 2026-09-24:** (c) not built: no `/editor/read`. Waits on §14's chunk vectors. M, Opus.

### I3 Open questions: the notebook keeps a list of what you have not answered

Built 2026-10-04 (row 7): moved to HISTORY.md, "Moved from the plans, 2026-10-04 (row 7: open questions)", with the answered-by link's decision. Nothing is left here: the night pass retrying an open question as notes arrive is pass 5 (row 5).

### I4 Resurfacing: the ideas you are about to forget, when they matter

**Built 2026-09-12; the record and the spec moved to HISTORY.md, "Moved from the plans, 2026-09-24".** State
2026-09-24: the one part left is the margin row in the note editor, which
is I2's surface and waits for I2.

### I5 Time travel over meaning: what did I think about X in March?

**What the person sees.** A date control on Ask ("as of…") and a
"Then and now" panel on any note: the note as it was on that date, and a
two-column diff of the *claims* (not the text) between then and now: "Then:
the batch size should stay at 32. Now: 64 after the memory fix." Ask with
a date answers from the notebook as it stood then, citing the revision.

**Why it is new.** Version history exists everywhere. Answering a question
*from the notebook as it was*, and diffing what you believed rather than
what you typed, does not exist anywhere.

**Builds on.** `entry_revisions` (already written before every change,
quiet-period coalesced), I1's claims with `revision_id`, the Ask box, the
grounding scorer (it grounds against revision text the same way).

**Data.** No new table. Claims already carry `revision_id`; `GET
/entries/{id}/claims?as_of=` resolves the revision at that date.

**Endpoints.** `POST /chat/stream` gains `as_of: date | null`; retrieval
runs over revision text at that date (FTS5 over a temporary table of
as-of contents for the candidate set, vectors re-embedded on demand and
cached by revision id); `GET /entries/{id}/then-and-now?as_of=` returns
`{then: [claims], now: [claims], changed: [(then_id, now_id, kind)]}`
where kind is `revised | dropped | new`, from claim cosine plus the fake
or real model's judgement.

**Tests first** (`tests/test_time_travel_spec.py`): a note edited on
three dates answers a question differently as of each date, citing the
right revision; the then-and-now diff on the fixture reports one revised,
one dropped, one new; an `as_of` before the notebook existed returns an
empty, honest answer rather than today's.

**Gate.** As-of retrieval under 1s at 5k notes for a 200-candidate set.
**Size** M. **Model** Opus.

**State 2026-09-24:** (c) not built: no `as_of` on `/chat/stream`, no then-and-now. M, Opus.

### I6 Evidence cards: answers you can audit sentence by sentence

Built 2026-10-04 (row 6): moved to HISTORY.md, "Moved from the plans, 2026-10-04 (row 6: paragraph vectors and evidence cards)". Left: "wrong" on a card as a correction (I7, H2's second half).

### I7 The corrections loop: every "no" makes the notebook better

**What the person sees.** Nothing new to do. Re-file a note, dismiss a
suggestion, mark a tension wrong, pick a different search result, say
"never again" to a card: the app records it and changes its behaviour.
Settings shows a small "Learned from you" panel: "37 corrections. Filing
accuracy 71% to 89% over the last 200 notes. Reset."

**Why it is new.** Offline apps do not learn; online apps learn on the
server from everyone. A per-person model that lives in the SQLite file,
is inspectable, resettable and explains itself is not something anyone
ships.

**Builds on.** `AuditLog` (re-file events already logged as
"recategorised -> X"), the dismissed sets kept as preferences, `janitor.
categorise` (the prompt), `search_manager._rank` (the fusion), the link
suggestion route.

**Data.** `corrections` (id, kind in {refile, dismiss_link, accept_link,
dismiss_tension, dismiss_resurface, open_after_ask, dismiss_fact}, subject
JSON, from_value, to_value, at). `learned_boosts` (kind, key, weight,
updated_at), rebuilt from `corrections` on demand (derived, so Reset is a
delete).

**Algorithm.** Filing: the prompt gets the three nearest already-filed
notes with their categories *and* the last three refile corrections whose
from_value matches the model's likely answer ("you moved notes like this
from Work to Projects twice"); the centroid fallback subtracts a category
the owner has refiled away from twice. Search: `open_after_ask` adds a
boost of 0.15 per open to that note for questions with cosine over 0.8 to
the asked question, decaying by half every 30 days, applied inside the
fusion as a fourth ranked list. Links and tensions: a dismissed pair
never returns; an accepted pair raises the threshold weight of its
two categories by a small constant. All weights bounded; all shown in the
panel.

**Tests first** (`tests/test_learning_spec.py`): a refile is recorded and
appears in the next filing prompt for a similar note; after two refiles
away from a category the centroid path no longer chooses it; an
`open_after_ask` reorders the next similar question's results; a
dismissed link pair is absent from `/entries/link-suggestions`; Reset
empties `learned_boosts` and behaviour returns to baseline; the panel's
accuracy number equals the fixture's computed value.

**Gate.** Filing accuracy on the eval fixture with 20 synthetic
corrections improves by at least 10 points; search p95 unchanged. **Size**
M. **Model** Opus for the prompt and fusion changes, Sonnet for the panel.

**State 2026-09-24:** (b) the loop is built (`ai/learning.py`: corrections as `AuditLog` rows by decision, boosts with decay, the centroid exclusion, `open_after_ask`); the "Learned from you" line with a filing accuracy number is not in Settings. S.

### I8 The model bench: which local model is best on *your* notebook

**What the person sees.** Settings > Models > "Test my models": pick two
or more installed models, press Run; twenty minutes later a table: filing
accuracy, citation accuracy, tool-call success, answer latency, tokens per
answer, each with a number and a one-line example of a failure. "Use this
one" applies it. Runs on the night shift budget if left overnight.

**Why it is new.** Every local-AI app tells you to "try a model". None
measures one against your own notes, offline, and shows the failures.

**Builds on.** `tests/eval/` (fixture, golden, scoring for tool choice and
citation), `ai/model_manager.py`, `routes_models.py`, I1's scheduler.

**Algorithm.** Build a held-out set from the owner's notebook: sample 40
notes, generate one question per note whose answer is a sentence in it
(no model needed: pick a claim from I1, or a sentence with two
distinctive terms), plus the note's own category. For each model: file the
40 notes cold, answer the 40 questions, run five scripted tool tasks;
score with `tests/eval/scoring.py`'s functions moved into `ai/bench.py`
(the tests then import from there, so the harness and the feature cannot
drift). Report per model.

**Tests first** (`tests/test_bench_spec.py`): a bench over the fixture
with two fake models that differ in one scripted answer ranks them in the
right order; the report names the failing question; a bench respects the
budget and can be stopped; "Use this one" switches the chat model
preference.

**Gate.** The bench over two models on 40 notes completes under 30 minutes
on the reference small model; the numbers reproduce within 2 points on a
second run. **Size** M. **Model** Sonnet (the scoring exists; this is
plumbing and a table).

**State 2026-09-24:** (c) only its switch exists (`model_bench` in settings.js); no `ai/bench.py`, no route, no table. H3 is the same row. M.

### I9 What the notebook learned: one place to see, edit, delete and switch it all off

**Built. Backend 2026-09-13 (HISTORY.md, "Built, I9's whole backend and the
first pass of I1"); the Settings section 2026-09-19 (HISTORY.md, "Built,
I9's Settings section").** What is still open here is the kinds I1's later
passes add (tensions, duplicates, entities, dates) and the "Learned: manage"
link (the bulk actions and `POST /learned/bulk` were built together on
2026-09-23, agent-remaining/OPEN.md's Backend section has the measurement) from each invention's own surface. The text
below is kept because it is the spec for those.

Added by direct instruction: "give the user the ability to see what the
notebook has learned and to be able to edit, delete and manage it so in
case the AI models get things wrong the user can fix it, also a way to
toggle the features on and off." This is not a ninth feature beside the
eight; it is the contract every one of them ships under. **No invention
above is built until its rows appear here.**

**What the person sees.** Settings > "What the notebook learned" (its
own section, next to Background tasks). At the top, one switch per
invention, each with a one-line description and a `?` popover: Night
shift (I1), Margin reader (I2), Open questions (I3), Resurfacing (I4),
Evidence checks (I6), Learning from corrections (I7), Model bench (I8).
Time travel (I5) has no switch; it only reads revisions. Off means: the
feature computes nothing, shows nothing, and its existing rows are kept
but inert (a banner in the section says "paused, N items kept"). A master
switch "Pause all learning" sets every one off in one click.

Below the switches, one table with a kind filter and a search box, every
row a fact the app derived rather than the person wrote: claims,
questions, tensions, duplicates, entity merges, dates, learned boosts
(I7), resurfacing decisions, filing corrections. Each row shows: the text,
the note and sentence it came from (click to open, scrolled to the span),
which model and when, the confidence, its status, and three actions:
**Edit** (the text, the entity name, the category, the weight: an edited
row is marked "edited by you" and is never overwritten by a later run),
**Delete** (gone, and recorded as a correction so the same fact is not
re-derived next run), **Reset to what the model said** (for an edited
row). Bulk: select all in the filter, delete or accept. At the bottom:
"Forget everything learned" (deletes every derived row and every boost,
keeps notes and revisions untouched, asks once), and "Export what the
notebook learned" (one JSON file, so the person can read it outside the
app).

Each invention's own surface (the morning card, a margin card, a question
row, a resurfacing card) carries a small "Learned: manage" link to this
section filtered to that kind, so a wrong fact can be fixed where it is
met, not only in Settings.

**Why it matters.** A model that is wrong quietly is worse than no model.
Every derived thing in this app is inspectable, attributable and
reversible, and the person can turn the model's judgement off entirely
and keep the notebook. That is the promise that lets the eight inventions
run unattended.

**Builds on.** `derived_facts` and `night_runs` (I1), `corrections` and
`learned_boosts` (I7), `note_scores` (I4), the preference store for the
switches, the Settings section recipe (D13), the list and modal recipes.

**Data.** `derived_facts` gains `edited_by_user: bool`, `original_text`,
`original_payload` (for Reset). `corrections` gains kind
`delete_fact`, `edit_fact`. Switches are preferences named
`learn.<invention>.enabled` (default off for I1, I2, I7, I8; on for I3,
I4, I6 once their upstream is on) plus `learn.paused` (master).

**Endpoints.** `GET /learned?kind=&q=&status=&page=` (the table, paged),
`PATCH /learned/{id}` (`{text | payload | status}`, sets `edited_by_user`),
`DELETE /learned/{id}` (writes the correction), `POST /learned/{id}/reset`,
`POST /learned/bulk` (`{ids, action}`), `DELETE /learned` (forget
everything; requires `{confirm: true}`), `GET /learned/export` (JSON),
`GET|PUT /learned/switches`.

**Rules the runners obey** (each a test): a runner checks its switch
before every pass and exits cleanly when off; a runner never overwrites a
row with `edited_by_user`; a deleted fact's `(entry_id, kind, text
hash)` is in `corrections` and the runner skips re-deriving it; `learn.
paused` stops every runner within one poll interval; the table never
shows a row from a note the person cannot open (private, binned).

**Tests first** (`tests/test_learned_spec.py`, strict xfail until built):
the section lists a fact from each kind with its source span; editing a
claim marks it and survives a re-run of the night shift over the same
note; deleting a fact writes a correction and the next run does not
re-create it; Reset restores the model's text; "Forget everything" leaves
`entries` and `entry_revisions` byte-identical and every derived table
empty; each switch off yields zero new rows from its runner and a 204 with
`{paused: true}` from its endpoints; the export round-trips (import is
not offered; the file is for reading); the master switch flips all seven
and the section shows "paused" on each.

**Gate.** The table renders 2,000 rows paged under 100ms per page; every
row's "open source" lands on the span (Playwright: the span's rect inside
the viewport); the section passes `test_dock_grammar.py`,
`test_style_scale.py` and the CSP lint. **Size** M. **Model** Opus for the
runner contract and endpoints, Sonnet for the table on the list recipe.

**Order.** I9's table and switches are built with I7 (the first invention
in the order below), so from the first learned boost onward there is a
place to see it; each later invention adds its kinds to the same table.

**State 2026-09-24:** (b) as the paragraph above says: the kinds I1's later passes add, and the "Learned: manage" link on each invention's surface.

### Order and dependencies

```
§14.2 chunk vectors  →  I6 evidence cards
B1 event log (or the corrections table alone)  →  I7 corrections loop
I1 night shift  →  I3 questions, I5 time travel (claims), I8 bench (budget)
I1 + §14.2      →  I2 margin reader
nothing         →  I4 resurfacing, I7 (with its own corrections table)
```

Start with I9's switches and table together with I7, then I4 (no
dependencies, both improve every existing feature), then §14.2 and I6,
then I1, then I3, I2, I5, I8. Each adds its rows to I9 as it lands. Each is one
brief row in SESSION_BRIEFS when its turn comes; none is built ad hoc.

### What was deliberately left out

Autocomplete and "write it for me": every competitor has it and it makes
the notebook sound like the model. Cloud sync of the derived tables: the
inventions work because the data never leaves. A plugin marketplace before
B8: an extension surface without the event log is a support burden with
no lever behind it.

## 16. The backend, read for structure, silent failure and lag (2026-09-08)

Static probes over `src/memorymap` (`scratchpad/probe_backend.py`), each
number reproducible. Security is in §12 and was not repeated; nothing new
was found there beyond what §12 lists.

**Complexity is concentrated, which is good news.** Four functions carry
most of it and are the only ones worth restructuring:

| Function | Lines | Branches |
| --- | --- | --- |
| `ai/agent.py run_agent` | 788 | 71 |
| `ai/skill_runner.py run_skill` | 493 | 48 |
| `api/routes_chat.py chat_stream` | 384 | 46 |
| `api/routes_graph.py graph` | 298 | 37 |

Move: `run_agent` into a `Turn` object with one method per round phase
(prompt, call, dispatch, feed back, finish), which is also what B5's
verifier needs to sit between "call" and "feed back"; `chat_stream` into
prepare, route, stream, ground, with `lines()` a generator over a small
state object. No behaviour change; the existing tests are the gate
(`test_agent_*`, `test_chat_*`, `test_agent_plan.py`). Size M, Opus,
after B5's spec tests exist so the split serves them.

**Silent failure.** 129 `except Exception` handlers, 18 of them `pass`
(`embeddings.py` 234, 254, 261, 444; `entities.py` 141;
`reminder_parser.py` 205; `tools/_common.py` 337; `vision_ocr.py` 320;
`routes_settings.py` 1515; `routes_spaces.py` 219; `atomic_io.py` 41;
`pdfpages.py` 186, 240; `security.py` 407; `taskhistory.py` 90;
`manager.py` 811; `searxng_install.py` 499, 560). Rule for the pass:
each becomes `logger.debug` with the exception, or a comment naming the
failure it swallows and why that is right. Sonnet, one session, one
commit per file, no behaviour change.

The embed-cache lock fixed 2026-09-08 moved to HISTORY.md, "Moved from the plans, 2026-09-24".

**Lag, measured by reading, to be measured by running.**

- `semantic_search` reading every vector per query: built 2026-09-24, moved
  to HISTORY.md, "Moved from the plans, 2026-09-24".
- `similar_pairs` computed per request for link suggestions and tensions:
  built 2026-09-24, moved to HISTORY.md, "Moved from the plans, 2026-09-24".
- The frontend runs nine `setInterval` polls; MODERNISATION_AUDIT measured
  14 idle requests a minute. Move: one `/events` SSE stream (B1's log is
  the natural source) and the polls become subscriptions. Size M, Opus.
- Five route files exceed 1,750 lines (`routes_files.py` at 2,998). Not a
  bug; a session cost. Split by resource when each is next touched, never
  as its own task.

**Consistency findings.** Route handlers are wired by decorator, so a
"defined once, never referenced" probe is noise for them; excluding
decorated functions leaves under ten candidates, all private helpers
behind a feature flag. Not worth a session.

**State 2026-09-24:** the split is done
(audit A5, in HISTORY); the silent `pass` handlers were narrowed (audit A6)
and the rule is F4 above; the lag items: `semantic_search` (F3) is built 2026-09-24;
`similar_pairs` for link suggestions and tensions is built 2026-09-24; the polls-to-SSE move is (d), superseded by F6's idle gate being met at 2
requests a minute; the route-file sizes are a standing rule, not a row.

## Placed from INBOX, 2026-09-09

The owner's reports this plan owns, moved whole from INBOX.md with their numbers (never reused). Each becomes a phase row when its phase is written; until then this list is the phase.

1. **Deleting a space leaves its notes in "All spaces".** Read and not
   reproduced in code: `routes_spaces.delete_space` hard-deletes every
   workspace-scoped row in one transaction and
   `tests/test_space_delete_cascades.py` proves it. The likeliest cause is
   notes captured while "All spaces" was selected: those carry the default
   workspace, not the space, so deleting the space cannot touch them. Fix
   the cause of the confusion, not the cascade: (a) show the space chip on
   every note card and in the edit form; (b) the capture form files into
   the *selected* space and says which; (c) a "Move to space" bulk action.
   Owner: D2 and D5. If the owner can reproduce with a note that shows the
   space chip, reopen as a backend bug.
15. Decided, nothing to fix (the strip is the native title bar); moved to
    HISTORY.md, "Moved from the plans, 2026-09-24".

22. **Settings > Packages rows misaligned** (icon, text and the install
    button on different baselines). Owner: consistency.md item 4; the
    alignment sweep must include Settings > Packages and Settings > Help.
23. **Settings > Help gaps** (accordion rows touch, sections have no
    rhythm). Owner: help-popovers.md, with item 22.
26. **"Things that feel off that I cannot place."** After the consistency
    and docks lists close, one review pass per tab with the vendored
    design skills (`.claude/skills/README.md`) against DESIGN.md, writing
    findings as consistency.md rows, not fixing ad hoc. Owner:
    consistency.md, last item.

62. Decided (the strip stays opt-in); moved to HISTORY.md, "Moved from the plans, 2026-09-24".

99. **Quick wins (Fable, 05:20): five features the plans did not list,
    each a day or less, each with the site.** (a) Undo on every delete
    toast: notes, boards, documents and reminders already soft-delete;
    `toastAction(msg, "Undo", () => restore)` at each delete call site
    (grep `toast(` beside `DELETE`), so a wrong click never reaches the
    bin. (b) "Reopen where I left off": documents and chats restore
    scroll position per id (localStorage `scroll:<kind>:<id>`), the
    Dashboard "Continue" tile (INBOX 60) reads the same keys. (c) The AI
    dot's tooltip shows the last answer's latency and the model's context
    use ("granite4.1:3b, 2.1 s, 39% of window"), from data the chat
    header already has. (d) A "Paste as note" global shortcut
    (Ctrl+Shift+V anywhere) that captures the clipboard as a new note
    with the AI filing it, the fastest capture path on a desktop. (e)
    Search operators in the Notes search box (`tag:`, `space:`,
    `before:`, `after:`, `has:file`), parsed client-side into the existing
    filters, with the operators listed in the box's '?' popover.
79. **Files sub-tab rows "could still use a massive redesign upgrade", and
    clicking the file name does nothing**. Owner: Library dossier
    (WORLD_CLASS 4), Opus: one row recipe (thumbnail, name as the one
    link that opens the reader, meta line, reading state as a small
    disclosure, actions in a kebab), the name clickable.
92. **Suggested links panel UI refine** (screenshot: rows of quoted
    pairs, a wide "Why?" input, a percent chip, Link and X). Owner: Opus,
    next slot: two note chips joined by an arrow, the score as a small
    bar, the reason field collapsed behind "Add a reason", Link primary
    per row, a "Link all above 70%" action in the head.
97. **OCR alternative to pytesseract**, asked directly. Answer: RapidOCR
    (PaddleOCR models on onnxruntime, pip-installable, no system binary,
    better on photos and mixed layouts, about 60 MB of models, Apache-2)
    is the one to offer; EasyOCR needs torch (never). Placed as a
    Settings > Packages option beside Tesseract, same reading pipeline,
    the reader named on the row. Owner: next session, Sonnet (backend
    adapter with a fake in tests) plus the Packages row.
98. The same decision as 62; moved with it.

**State 2026-09-24:** 1 (b): a space chip is drawn on
note cards; capture into the selected space and a "Move to space" bulk action
were not found. 22 and 23 were not re-checked (their agent files are
archived). 26 is a standing review, (d). 99: (a) undo toasts are built (H9
records it) and (e) the operators are built (section 5 item 1); (b) scroll
restore per id, (c) the AI dot's latency and context tooltip and (d) Paste as
note were not found, S each. 79 was not re-checked. 92 (b): "Add a reason"
sits behind a menu row now; the chips-and-arrow row and "Link all above 70%"
were not found. 97 (c): no RapidOCR adapter. M.

## 17. The original vision, audited (2026-09-09)

The owner's first notes, written months before a line of code (the
"AI Assistant Personal Database Management" list and the May 2026 master
reference), read against what exists. Almost all of it is built; the seven
rows marked open are the vision's own features nobody has planned since,
and they go first in the next session's World-class section.

| The original idea | Today |
| --- | --- |
| Type anything, a local AI files it; guided mode when you want to choose | Built (capture, Let the AI decide, guided) |
| Two AIs: a Janitor that files and never talks, a Librarian that answers and never writes | Built as the filing step and the chat; the librarian tags, links and flags duplicates in the background |
| A conversational answer and the raw database results side by side | Built (Ask: the answer beside the matching records) |
| Confidence on every filing, low ones flagged for review | Built half: the score shows; **open: a review queue** (below) |
| The AI tidies the database over time: merges near-duplicate categories, removes empty ones, respects manual changes | Built half: duplicates flagged, links suggested; **open: category tidy proposals** |
| Preferences for how the database is structured | **Open: a filing style preference** |
| Recycle bin, 30 days, configurable, clearable | Built |
| 100% offline, models local; optional web search for context | Built (models through Ollama, not bundled, by decision; web search opt-in) |
| File attachments copied into the app's folder | Built (Files, three readings per image, PDFs read page by page) |
| Google Drive plus Notion plus NotebookLM | Built as Library, Documents and Ask with sources |
| AI-generated data visualisation | **Open: charts from questions** |
| Last five queries; most-accessed information | Built (Ask history); **open: most-opened widget** |
| A log of everything entered, accessed, altered, archived | Built (activity log) |
| Manual links, or tell the AI about a link | Built |
| The graph like Obsidian's | Built (the canvas graph, Phases 1 to 5) |
| Submit a whole Markdown file as an entry | Built (documents import) |
| A whiteboard or canvas, submitted as an entry, editable later | Built (whiteboard, mind maps) |
| Export in bulk or in part | Built (JSON, CSV, Markdown, zip) |
| Login with a hashed password | Built (bcrypt, throttled) |
| A profile the AI uses, built over time, opt-out and delete | Built (About you; What it remembers) |
| Speech to text; the AI reads answers aloud; explains what you entered | Built (Whisper, read aloud); **open: "explain this note"** |
| Reminders, maybe a calendar | Built (reminders); **open: calendar export and month view** |
| Fine-tuning | Dropped, correctly, in the May document |

**The seven open rows, as quick rows for the next session (WORLD_CLASS,
after Brief 18 section A):**

1. **Review queue.** A Notes filter "Needs review" for filings under 60%
   confidence and anything filed Uncategorised, with Accept, Refile and
   Split per row; the count on the dashboard. Backend: `confidence` and
   `category_id` exist; one query. Size S.
2. **Tidy categories.** The librarian proposes merges (two categories
   whose embeddings and names are near) and removals (empty for 30 days)
   as a proposal list in Settings > What it remembers; nothing moves
   until accepted; manual renames are remembered as "do not merge". Size M.
3. **Filing style.** A preference (by topic, by project, by time) added
   to the filing prompt and to the category namer, with three examples
   each; the default is by topic. Size S.
4. **Charts from questions.** Ask answers a counting or trend question
   ("how many notes per category this month", "my race times") with a
   bar or line drawn from the records, the data table under it, the
   chart exportable as PNG. Size M.
5. **Most opened.** A dashboard widget of the ten notes opened most this
   month (the view counter exists on the node panel). Size S.
6. **Explain this note.** A note action that reads the note aloud and
   then says what it links to and why, from the link reasons. Size S.
7. **Calendar.** `.ics` export per reminder and for all, and a month view
   beside the reminders list. Size M.

The principle the first notes state and the app keeps: the AI is a
servant, not a gatekeeper; everything it does can be seen, edited and
undone.

**State 2026-09-24:** the seven rows: 1 review queue (c),
S. 2 tidy categories (b): the agent has `merge_categories`
(`ai/tools/categories.py`); the proposal list is not built, M. 3 filing style
(c), S. 4 charts from questions (c), M. 5 most opened (b): the Most used
widget lists the notes opened or matched most, all time
(`/entries/most-accessed`); "this month" needs an open log, S (its picker
line was wrong and was fixed 2026-09-24). 6 explain this note (c), S. 7
calendar: built. The month view (`#reminder-calendar`) and, 2026-09-26,
`.ics` export with its two buttons (HISTORY.md, "Moved from the plans,
2026-09-26").

## Placed from INBOX, 2026-09-13

F2's frontend half (five callers read `/files/gallery` whole) was built
2026-09-24 and moved to HISTORY.md, "Moved from the plans, 2026-09-24".



## 18. The next horizon, written 2026-09-14 at the close of PR 144

**Where the plan stands.** Built and moved to HISTORY: B1 the event log,
B3 the retrieval engine with explanations, B5's verifier and budget
(Brief 13), I4 resurfacing with its dashboard surface, I9 the learned
store with its Settings page, the first pass of I1, the tensions kernel
behind B4 (`ai/tensions.py`, `ai/entities.py`), and the whole of the
consistency contract in §1 as lints. The audit above (A1 to A9) lands in
this PR: the bounded job pool is the first half of B2. Open, in the order
they pay back: B2's resume-after-kill, I3 open questions, I6 evidence
cards, I8 the model bench, I2 the margin reader, I5 time travel, B7 the
API contract, B8 extensions, B6 sync. The dossiers D1 to D15 were largely
absorbed by UI phases 0 to 11 and the per-surface plans; what each still
owes is one line in `agent-remaining/OPEN.md`.

**What "revolutionary" has to mean now.** The two asymmetries in §15 hold:
the model is free and idle, and the corpus is one mind. Every cloud
notebook in the §2 table has since shipped a chat box over notes; none has
shipped a notebook that works on itself overnight, shows its reasoning
sentence by sentence, or can be audited and corrected as a habit. That
gap is the product. The horizon below is ordered so each item makes the
next one measurable, and each names its gate, because a feature without a
number is a demo.

### H1 The night shift, finished (I1 second pass; L, Opus)

What exists: `ai/autonomous.py` and `ai/janitor.py` run scheduled passes;
`core/events.py` records every change; I9 shows what was learned. What is
missing is the morning: a report card that says what the notebook did
while you slept, with one undo per line. Build: a `night_runs` table (run
id, started, finished, model, passes, changes, cost in tokens and
seconds); a dashboard card "Overnight" listing each change as a sentence
with Undo and Never again (the I7 correction); a Settings row for the
window (start, stop, battery guard). Gate: a seeded notebook of 200 notes
runs a night in under ten minutes on a 4B model against the fake
transport, every change is undoable, and the report card's count equals
the event log's count for that run. Test first: `tests/test_night_runs.py`.

**State 2026-10-04:** the same as I1 above.

### H2 Evidence cards and open questions (I6 then I3; L, Opus)

What exists: the Ask answer object carries per-sentence citations
(`test_ask_answer_object.py`); the chat's checkable answers. Build I6 as
the surface: each sentence of an answer is a card that opens to the
passage, the note, the date and the retrieval score's three parts (§4
B3), with "wrong" as a correction that retrains the ranker's weights
(I7). Then I3: a question the model could not answer from the notebook
becomes a row in "Open questions" with the notes that came closest, and
the night shift retries it when new notes arrive. Gate: 95% of sentences
cited on the seeded notebook; a corrected citation changes the next
answer's ranking (asserted, not eyeballed).

**State 2026-10-04:** I6 built (row 6) and I3 built (row 7), both in HISTORY; left here: "wrong" on a card retraining the ranker (I7).

### H3 The model bench (I8; M, Opus)

The one question every local-AI user asks and no product answers: which
model is best on my notes, on my machine. Build: Settings, Models, "Try
on my notebook": the app runs a fixed set of twelve tasks (file, link,
answer, summarise, plan a skill) against each installed model over a
sample of the person's own notes, scores them with the verifier from B5,
times them, and shows a table with a recommendation. Everything local, one
click, resumable. Gate: fake-transport tests for scoring and resume;
`docs/MODELS.md` cites the bench instead of guessing.

**State 2026-09-24:** (c), I8.

### H4 The notebook as a local service for other agents (B7 and B8; M, Opus)

The next year's local agents (coding agents, desktop assistants) will want
a memory. MemoryMap already has the tools (58 in `ai/tools/`), the
permission gates and the audit log. Build: a versioned `/api/v1` contract
generated from the routers (schema behind auth, B7), and an MCP server in
`src/memorymap/mcp/` exposing the same tools with the same "asks first"
rules, so any local agent can read and write the notebook and every write
lands in the event log with the agent named. Gate: the MCP server passes
the same tool tests as the in-app agent; an external write shows in the
activity panel within one poll.

**State 2026-09-24:** (b) the MCP server exists (`mcp_server.py`); a versioned `/api/v1` and the agent named in the event log for an external write were not found. M.

### H5 Sync without a server (B6; L, design first)

Design now, build after H1 to H4: an encrypted append-only export of the
event log (B1 makes this possible) to a folder the person already syncs
(any file-sync tool), and an importer that replays another device's log
with last-writer-wins per field and a conflict list for the rest. No
server, no account. Gate: two data dirs converge after each replays the
other's log; a conflicting edit appears once, in the Library, with both
versions.

**State 2026-09-24:** (c), B6.

### H6 Professional use (the PR after 144; M, mixed)

The owner's stated next block: refinements for daily professional use.
The list, each with its gate: one-click recovery (INBOX 253: a launcher that
repairs a start that fails, and a Repair shortcut beside the app, gated by
a deliberately broken venv coming back without a prompt); import from Obsidian, Notion export and
Apple Notes (round-trip test per format); print and PDF export of a
document with its citations; keyboard-complete (every dock action
reachable, `keys.js` extended to every tab); a WCAG AA audit with
`contrast.js` and `touch.js` as the standing gates; multi-window on the
desktop (a document in its own window); a first-run tour that ends in a
first note and a first question, measured by time to first answer.

**Decisions made.**

1. **Release artifact naming: `<name>-<version>-<platform>-<arch>.<ext>`,
   one scheme across every installer.** INBOX 266 asked for version,
   platform and architecture in every installer's name, "so two files
   downloaded a month apart from different machines are distinguishable in
   a Downloads folder, and a 64-bit build and a future 32-bit or ARM one
   never overwrite each other." Built and applied to all four release
   artifacts `.github/workflows/release.yml` produces: the Windows `.exe`
   (`packaging/windows/installer.iss`'s `OutputBaseFilename`,
   `MemoryMap-AI-Setup-{#MyAppVersion}-windows-x86_64`), the Windows `.msi`
   (`MemoryMap-AI-$env:MEMORYMAP_VERSION-windows-x86_64.msi`, built by
   `packaging/windows/installer.wxs`), and the Linux `.tar.gz` and `.zip`
   (`MemoryMap-AI-${VERSION}-linux-x86_64.{tar.gz,zip}`). `x86_64` rather
   than Inno's own `x64` spelling: it is what `uname -m` prints and what
   the Linux side already used, and one spelling across platforms is worth
   more than matching one installer's internal vocabulary. Both the
   `.tar.gz` (item 2) and the `.msi` (item 3, shipped beside the `.exe`,
   not instead of it, with its own "Repair MemoryMap AI" shortcut per
   INBOX 253) already existed before this entry was picked up; the naming
   pass (item 4) is what is new, and `tests/test_release_smoke_step.py`
   (`test_windows_exe_filename_carries_name_version_platform_and_arch`,
   `..._msi_filename_...`, `..._zip_filename_...`) is the lint: it parses
   `release.yml` and `installer.iss` as text and fails if any artifact's
   name loses its version, platform or architecture. Not verified on a
   real release run: no tag push or Windows/WiX runner exists in this
   sandbox, so the check is that the workflow and installer sources parse
   and read as intended, not that `wix build`/`ISCC.exe` actually produced
   a file with that name.

**State 2026-09-24:** (b) done: one-click recovery (253) and the release naming (decision 1). Open: the three importers, print and PDF of a document with its citations (the print stylesheet exists; citations in it were not checked), keyboard-complete, the WCAG audit, multi-window, and a first-run tour that ends in a first answer (the tour exists; the timed path does not).

### H7 The speed budget (A1 continued; S each)

Boot JS under 1 MB compressed (from 1.7 MB), first paint under 300 ms on
the reference laptop, every list over 200 rows virtualised, `/entries`
paged everywhere. `scratchpad/ui-sweeps/boottime.js` is the gate and its
numbers go in the CHANGELOG with each step.

**State 2026-09-24:** (b) boot JS went 1,699 to 1,072 KB (A1, in HISTORY) against the 1 MB line; first paint under 300 ms and virtualising every list over 200 rows were not measured here. S each.

**Performance pass, 2026-10-03 (INBOX 441 item 6, measured).** Method: a 500-note notebook seeded through `POST /entries` (the app boots against it), a 5,000-note copy grown by direct insert for the scale numbers, every boot route and tab route timed through `TestClient` with SQLAlchemy statement counts and `EXPLAIN QUERY PLAN` on every distinct statement, and Playwright with CDP (event timing, a sampling CPU profile, a trace) for the page. The sandbox was at a load average near 100 while this ran, so every pair below was measured on the same machine in the same minutes (interleaved, base checkout against this one) and the milliseconds are for comparing, not for quoting.

| What | Before | After |
| --- | --- | --- |
| `GET /entries/reference-counts` for sixty cards, run at every unlock, 500 notes | 242 statements, 172 ms | 6 statements, 53 ms |
| the same, 5,000 notes | 2,267 ms | 388 ms |
| the same, in the browser at boot (500 notes) | 392 ms | 154 ms |
| `GET /insights/heatmap`, 5,000 recent notes (loaded every note whole to read its day) | 179 ms | 24 ms |
| `GET /insights/stats`, same | 184 ms | 55 ms |
| `GET /media` (the "used in" scan loaded every note, document and board object), 5,000 notes | 140 ms | 9 ms |
| the first click of a session (the unlock): its handlers, `new AudioContext()` inside the gesture | 44 to 56 ms | under 1 ms (made at idle just after; the context is running) |
| 900 lookups by `parent_id`, a note's board cards and its reminders, 5,000 notes, 4,000 cards, 1,500 reminders | 604 ms | 2.9 ms (six indexes in `_INDEXES`) |
| a whole boot, unlock to settled, 500 notes (3 interleaved runs, median) | 1,378 ms, API time 3.1 s | 1,282 ms, API time 2.8 s |

**Measured and left alone, with the number that says why.** SQLite pragmas: `cache_size` 64 MB and `mmap_size` 256 MB moved a scan of a 19 MB database from 3 to 2 ms and nothing else, against memory held per pooled connection, so they stay unset (WAL, `synchronous=NORMAL`, `busy_timeout`, `temp_store` are already set). Polling: an idle minute is 2 requests, the gate; the three `/models/status` and `/tasks` calls in the first seconds are the 1 s cadence while the filing model warms, by design. Listeners: `leaks.js` reads 0 listeners and about 20 nodes a round over five rounds of seven tabs. Layout: the whole boot spends 38 ms in layout and 51 ms in style recalculation, so the forced-layout reading `tabContentWidth` shows in a sampling profile is attribution, not cost. Batching the note cards' clamp checks into one read-then-write frame was tried and made no difference to typing in the search box (both about 150 ms of one layout over 12 keystrokes, interleaved), so it was taken back out. The three request pages of `/entries` at boot are the paging contract and the first paints at once.

**Found, not fixed.** The Graph tab's `GET /graph` is 600 ms and 2.5 MB at 5,000 notes (per-note dict building, two `readable_content` calls and a regex each; a payload cache keyed on `_graph_fingerprint` would need the vault and space state in the key). `p5.min.js` is the largest boot asset (247 KB on the wire, about 85 to 135 ms of parse and setup) and is still needed by the dashboard constellation and the emblem; porting those two to canvas 2D, as `bg-art.js` already was, removes it from boot. `enhanceAllSelects` wraps 99 `<select>`s at boot (about 50 ms), most inside Settings panes nobody has opened. Creating a note costs about 300 ms in this sandbox, all of it the embedding model.

### H8 Time travel and the margin reader (I5, I2; M each, Opus)

I5: "what did I think about X in March" as a first-class query, the
retrieval engine's date signal exposed as a slider on the Ask surface,
with the answer's cards grouped by month. I2: the second reader in the
document editor, a margin that fills with the person's own related notes
as they write, from the same engine, with the link-strength explanation
under each. Both reuse B3; both gate on the 150 ms budget for a
keystroke-to-margin update.

**State 2026-09-24:** (c), I5 and I2.

### H9 Polish in use (the owner's question, 2026-09-14; S to M each)

Asked at the close of PR 144: what else makes the app better *in use*,
not on a feature list. Checked against the code first (undo toasts, the
service worker, skeletons, chunk-on-scroll lists, saved searches, the
daily note, the first-run pass and the doctor route all exist), so each
row below is a gap, with its gate:

- **A local usage ledger.** Count every feature's use on this machine
  only (a table, never sent anywhere), shown in Settings as "what you
  use", and used to rank the palette and the Show menu by frequency. The
  first notebook that tells its owner which of itself is dead weight.
  Gate: a feature unused for ninety days is listed, and the palette's
  top five are the five most used.
- **Time to first answer as the onboarding number.** The first-run path
  ends in a real question answered from a real note, timed; the tour is
  cut to whatever gets that under two minutes on a cold laptop. Gate:
  the number in the CHANGELOG, measured by a sweep that starts from an
  empty data dir.
- **Simple mode.** A Settings switch that hides the tabs and settings a
  new person does not need (Timeline, Boards, the learned store, the
  advanced response settings) until they are reached for; every hidden
  thing reachable from the palette. Gate: the tab bar shows four tabs
  on a fresh install and the docks lint still passes.
- **Speculative retrieval.** Retrieval starts on a typing pause in Ask
  and Chat, before Enter, so the first token arrives sooner; the model
  is warmed on boot and kept resident. Gate: median time to first token
  on the reference laptop, before and after, in the CHANGELOG.
- **The perf gate in CI.** `boottime.js` and a per-action timing sweep
  (open each tab, open a note, ask a question against the fake server)
  run on every push with a budget per number; a regression fails the
  build like a lint. Gate: the workflow, and one deliberate regression
  caught before merge.
- **Screen readers as a standing sweep.** axe-core over every tab in
  both themes, next to `contrast.js` and `touch.js`, with the count
  ratcheted to zero. Gate: the sweep in `all.sh`, zero serious findings.
- **Quick capture from anywhere.** A global hotkey on the desktop build
  that opens a one-line capture over any app, and the PWA's share target
  on a phone on the same network. Gate: a note captured without the app
  in front, under three seconds, in both cases.
- **Retry as a grammar.** Every failed request shows the same inline
  "try again" with the reason, never a toast alone; `errors.js` gains a
  fault-injection pass (the fake server returns 500 on one route at a
  time). Gate: zero routes whose failure leaves the surface blank.

**State 2026-09-24:** (c) for the usage ledger, time to first answer, simple mode, the perf gate in CI (CI runs the Playwright tests, no timing budget), the axe sweep and the global capture hotkey. (b) for speculative retrieval (Ollama is asked to keep the model for 30 minutes; retrieval does not start on a pause) and for retry as a grammar (`surfaceFailed`/`surfaceRecovered` are the one recipe, `tests/test_ui_recipes.py`; the fault-injection pass in `errors.js` is not built).

### The order, and the rule

H7 first (it makes every later measurement honest), then H9's perf gate
and usage ledger, then H1, H2, H3, H6, H4, H8, H5. One horizon item per PR, its Built block moved to HISTORY at
the end, its numbers in the CHANGELOG. Nothing above is started until
`OPEN.md` is empty for the surface it touches: a revolution on top of an
unfixed report is how the "fixed again" rounds happened.

## 19. The architecture and framework review (2026-09-20, INBOX 266)

The owner, twice: *"We need to do a full architecture analysis and make sure
that we are actually using the right architecture and backend functions ... I
need you to fully analyse the architecture and framework decisions and make
sure that they are all the best they can be"*, with *"Lightweight as
possible"* beside it.

**This is a first pass over the load-bearing decisions, every claim
measured.** It is not the whole stack: it is the choices that cost the most
if they are wrong. Where a decision is sound the entry says so and why, since
a review that only lists faults is a review nobody can act on.

### 19.1 The one number that matters: 776 MB resident, idle

Measured on a running instance with nobody touching it, from
`/proc/<pid>/smaps_rollup`:

| | |
| --- | --- |
| RSS | 776 MB |
| PSS | 478 MB |
| Anonymous (not file-backed: allocations, model weights) | 429 MB |

And what the process has mapped, counted from `/proc/<pid>/maps`: **436
shared objects from scipy, 117 from sklearn, 29 from torch.** That is the
`sentence-transformers` stack, loaded by the `embedding-warmup` thread on
every launch.

**Why this is the finding and not a curiosity.** The packaging already treats
semantic search as optional: `packaging/windows/memorymap.spec` excludes
torch and sentence-transformers from the installer with a comment saying
Settings, Packages fetches them on demand, *"a few hundred MB for a feature
this build already has a working path to install on demand"*. So the shipped
build's position is that this is optional, and the running app's position is
that it loads at startup regardless. Those disagree.

Three directions, cheapest first, none yet taken:

1. **Load on first use, not at launch.** The warm-up exists to avoid a pause
   on the first semantic query; a notebook that never runs one pays 429 MB
   for a pause it will never have. Whether the warm-up should be a
   preference, or triggered by the first search, is the decision.
2. **ONNX Runtime instead of torch** for inference. Same model, a fraction of
   the resident cost, no scipy or sklearn in the import graph. This is the
   change with the best ratio and the most work.
3. **Confirm scipy and sklearn are reachable at all at query time.** Vectors
   are stored as raw float32 and compared with numpy (`ai/embeddings.py`), so
   the scientific stack may be a load-time import only. If so it is 553
   shared objects mapped for nothing.

**State 2026-09-24:** (b) direction 1 is half taken: numpy is imported lazily (`tests/test_lazy_heavy_imports.py`) and the warm-up waits for the first page and skips an empty notebook (`tests/test_embedding_warmup.py`), but a notebook with notes still loads torch at launch. Directions 2 (ONNX) and 3 (is scipy reachable) are (c). M.

### 19.2 The frontend is 5.9 MB decoded, and that is mostly fine

Measured with the Navigation and Resource Timing APIs on a cold load:

| | |
| --- | --- |
| Resources | 50 |
| Decoded total | 5,914 KB (js 1,283, other 4,410, font 144, css 76) |
| `index.html` decoded | 661 KB |
| DOMContentLoaded | 182 ms |
| JS heap after boot | 18 MB |
| DOM nodes | 7,844 |
| CSS rules | 5,844 |

**The honest reading: weight is not costing what it would cost a web app.**
This is served over loopback to a local process, so 5.9 MB is not a download
and DOMContentLoaded at 182 ms says so. The costs that are real are parse
time on a slow machine, the 18 MB heap, and the installer's size. A bundler
and code splitting would be a large change to a codebase that deliberately
has no build step (`CLAUDE.md`: "No build step: `frontend/js/*.js` and
`frontend/css/*.css` are served as-is"), and the measurement does not justify
paying for it yet.

Two things are worth doing anyway, both small:

- **Phosphor ships 1,530 glyphs; the app names 504.** A subset font is a
  build step for one file and turns 144 KB into roughly 50 KB. It is also
  the single largest asset on first load.
- **All eleven stylesheets are linked eagerly**, 1.8 MB on disk for every
  surface including the ones not open. The files are already split by
  surface, so this is a `media`/`disabled` attribute question rather than a
  restructure.

`p5.min.js` is 1 MB and is **already lazy** (`app.js` injects the tag when
the dashboard art runs), which is the right answer and is recorded here so
nobody "discovers" it again.

**State 2026-09-24:** (c) both: `Phosphor.woff2` is still 147 KB whole, and all twelve stylesheets are linked eagerly. S each.

### 19.3 SQLite is the right store, and the reasons are not the obvious ones

The owner named this as the example. It holds, but the usual justification
("it's simple") is not the strong one:

- **One file is the backup story.** The app's export, restore and "your notes
  are yours" promises are all one file copy. A server-based store (Postgres)
  would need a dump step, a running daemon, a port, and a version match
  between the data and the binary that opens it. For an app whose entire
  pitch is offline and local, that is not a trade, it is a different product.
- **A document store (files on disk, one per note) is the real alternative**,
  and it is what Obsidian does. It loses transactions across a link edit, and
  this app's data model is a graph: a note, its links, its embeddings, its
  derived facts and its board positions change together. SQLite gives that
  atomically; a folder of markdown does not.
- **The scale is right.** SQLite is comfortable to hundreds of thousands of
  rows, and the measured notebook this project tests against is 4,005 notes.
  The ceiling is not close.

**What is worth checking and has not been**: whether the schema's indexes
match the queries the app actually runs, especially the note list's sort
paths and the search fallback. That is a measurement (`EXPLAIN QUERY PLAN`
over the real query set), not an opinion, and it is the sort of thing that
turns a 0.9 s list load into a 0.2 s one.

**State 2026-09-24:** (b) the index checks exist (`tests/test_entry_indexes.py`, `tests/test_db_pragmas_and_indexes.py`); the whole-query-set `EXPLAIN QUERY PLAN` pass was not found. S.

### 19.4 Idle compute: the assumption did not hold

Asked as *"are things running when they arent necessary and taking up extra
compute??"*. Measured both halves:

- **Backend**: 4 threads with the app idle, **0 `threading.Timer`s**. The one
  scheduler (`ai/autonomous.py`) blocks on `Event.wait(interval)`, and its
  own comment records that it used to wake 21,600 times per cycle and was
  fixed.
- **Frontend**, per tab over 30 s with nobody touching it: **2 to 6 requests
  a minute**, main thread **0.6% to 2.6%** busy. The dashboard is the
  highest, which is its animated widget.

Two small things, neither urgent: four independent one-second timers repaint
four different clocks (`tickClocks`, `paintStatusClockDetail`,
`paintDashClock`, `paintChatTimer`) where one tick could drive all four, and
the scheduler thread exists even when the feature is switched off.

**On "containers spun up as needed, like serverless"**: that shape solves a
problem this app does not have. Serverless exists to stop *idle server* cost
across many tenants; here there is one user, one process, on their own
machine, and process startup is the thing a person waits for. The right
version of that instinct is 19.1: load the expensive thing when it is first
needed rather than at launch.

**State 2026-09-24:** (d) the four one-second clocks are still separate timers; the section itself calls them not urgent, and F6's idle gate is met.

### 19.5 What the review has not covered yet

Named so the next session does not mistake this for complete: the FastAPI and
SQLAlchemy layer's own shape (are the ORM's lazy loads causing N+1s on the
list paths?), the event bus, the job queue's back-pressure, the frozen
build's startup profile on Windows, and the `EXPLAIN QUERY PLAN` pass in
19.3. Each is a measurement with a command, in the manner of §10.

**State 2026-09-24:** (b) N+1 on the list paths has a test (`tests/test_scale_query_counts.py`); the event bus, the job queue's back-pressure and the Windows frozen startup are open. S each.

## Placed from INBOX, 2026-09-21

261. **Found by scan, 2026-09-19 (the session, not the owner).** Ten routes
    the app serves that `frontend/js/*.js` never names, from
    `scratchpad/probe_dead_routes.py` (new; run it with `PYTHONPATH=src`).
    Four more were in this list and are now wired: `GET /learned` and its
    whole lifecycle, `POST /night/run`, `GET /search/stats` and
    `POST /drafts/title`. What is left, triaged:
    - `GET|POST /entries/daily/{day}`, `POST /resurface/compute` and
      `GET /openapi.json`: not the frontend's to call. The daily-note pair
      is the agent's "add to today's note" tool and says so in app.js; the
      compute half of resurfacing is the scheduler's, and its module
      docstring is explicit that the read is the fast one; `/openapi.json`
      is FastAPI's own. **Nothing to do.**
    - `POST /insights/digest` and `GET /whiteboard/images`: superseded and
      recorded as such (`/insights/digest/stream` is what the dashboard
      calls; BACKLOG says `/media` replaced the board image listing).
      **Recommendation:** leave them, or delete them in a sweep of their
      own; either is defensible and neither is urgent.
    - `GET /insights/on-this-day`: superseded by choice. The widget filters
      `allEntries` in the browser, which is one fewer request and is
      correct once the notebook has finished paging in.
      **Recommendation:** leave it, and say so in the route's docstring, so
      the next scan does not re-open this.
    - `GET /tags`: done (moved to HISTORY.md, "Moved from the plans, 2026-09-24").

    - `GET /settings/events`: built 2026-09-23 as the Dashboard's Recent
      activity widget (moved to HISTORY.md, "Moved from the plans, 2026-09-24"); the Timeline half is
      declined by decision (a second clock on one page).

    - `GET /resurface/near/{entry_id}`: "the faded notes closest to the one
      being read", built and tested, and there is nowhere in the app that
      reads a note. Checked before recommending anything: a note is a card
      in a list, and the only thing resembling a detail view is the inline
      edit form (`editingId`), which is a form. `lastOpenedEntryId` exists
      but only feeds the agent's "what am I looking at" subject. So this is
      a surface, not a wire-up, and probably why it was never wired.
      **Recommendation:** decide the surface first. The cheapest honest one
      is a row inside the edit form, under the tags, reusing
      `paintFadedNotes` from dashboard.js (the route returns the same
      `_card` shape the dashboard widget already renders); the better one
      is the note detail view this app does not have, which is a plan item
      rather than an INBOX item. **State 2026-09-24:** (c) still
      unwired; it waits on D2's rail (row 4 of section 8's list).
    `POST /auth/rotate-vault-key` was on this list until the probe learned
    to read `` `/auth/${mode === "setup" ? "setup" : "unlock"}` ``; it is
    still uncalled, and re-keying the vault has no UI. Filed here rather
    than fixed: it is the one route in the app that rewrites every private
    note, and a button for it wants its own session. **State 2026-09-24:**
    (c) still no UI; the other 261 lines are decided (nothing to do).


285 (indexless tool-call fragments) was fixed 2026-09-24 and moved to
HISTORY.md, "Moved from the plans, 2026-09-24".

283 (an absent OpenAI-dialect backend reported as running) was fixed
2026-09-24 and moved to HISTORY.md, "Moved from the plans, 2026-09-24".

## Placed from INBOX, 2026-09-21 (two app-wide contracts)

301. **The owner, 2026-09-21, verbatim:** "the application wide
    forward/backward navigation and undo/redo dont work for everything
    everywhere." Two app-wide contracts, both of which are the kind that
    cannot be fixed surface by surface without drifting again. Next step is
    an audit before any fix: every surface, what it pushes to history and
    what it makes undoable, as a table. Placed into WORLD_CLASS_PLAN.

**State 2026-09-24:** (c) the audit table (every surface, what it pushes to history, what it makes undoable) does not exist yet. M.

## Audio in the notebook: the architecture decided 2026-09-21, the build deferred

The owner, 2026-09-21, in one message: recording tracks and storing them as
notes or as objects like whiteboards and mind maps, attaching them to notes,
an audio library like voice memos paired with meeting notes, transcription
and perhaps live transcription, better text to speech, and separately a
background music player over a folder of songs he already owns. Then, in the
next breath: "idk if these are too big tasks though, maybe should be saved
for later??"

He is right on both counts, and both halves of that are recorded here so the
answer does not have to be found again.

**It is genuinely missing, and the code says so rather than being silent.**
`routes_files.py` line 56: video and audio "are still out (no player exists
for either yet; audio specifically is tracked as a gap)", and the upload path
refuses them at line 92 with "video and audio attachments aren't yet". So
this is a hole, not a rebuild, which for this project is worth stating
plainly.

**And it is too big for a session.** Audio as a first-class thing touches
storage, the upload allowlist, a new surface, attachment, search, and
probably an optional native helper for transcription. That is several
sessions. Nothing here is built until the owner says go. What follows is the
decision, so that when he does, the work starts at the first phase rather
than at this argument.

**Decision 1: two different features that must never share a store.** The
owner drew this line himself and it is the right one. Background music is
not notebook content: it is a player over files he already keeps, never
indexed, never searched, never a note, and nothing about it should ever
appear in a notebook view. Recorded audio is notebook content: a voice memo
is a thing he made, and it belongs with his notes. The separation is
structural rather than a flag on one kind, because a flag is how the two end
up confused, which is precisely what he asked to avoid.

**Decision 2: a recording is an object, not an attachment.** He asked
whether they could be "notes or objects like whiteboards and mindmaps".
Objects. A board and a map are already first-class things that can be
referenced from a note, and a recording behaves the same way: it has its own
identity, it can be opened on its own, and it can be pointed at from any
number of notes. Making it an attachment instead would bury it inside
whichever note happened to receive it first.

**Decision 3: it is not mp3, and it must not be called mp3.** A browser's
`MediaRecorder` produces webm or ogg carrying opus, and wav at best. Mp3
would mean shipping an encoder into the page. The feature is named for what
the recorder actually produces, and the word mp3 stays out of the interface
so nobody is promised a format the app does not make.

**Decision 4: transcription is optional and local, on the llama.cpp
precedent.** `scratchpad/llama-dev.sh` and `tests/test_skills_evals.py`
(2026-09-20) already establish how an optional native helper is allowed to
exist here: the suite never depends on it, no mode of `scripts/gate.sh`
reaches for it, and without its environment variables every test that needs
it skips at collection. Transcription follows that shape exactly or it does
not ship. The app ships with no model and that does not change.

**Decision 5: live transcription is a separate question from
transcription**, and is not promised alongside it. Transcribing a finished
recording and transcribing a stream are different problems with different
tools, and treating them as one feature is how the second one drags the
first.

**Phases, when the owner says go.** Each is a session's worth and each stands
alone, so the feature can stop after any of them and still be whole: the
recorder and the object, with the allowlist opened only as far as the object
needs; the audio library as a surface, with playback; references from notes,
using the machinery boards and maps already use; transcription behind the
optional-helper contract; then, and only then, the streaming question. The
background player is a separate row again, and its own open question is
whether the app may read a folder outside its data directory, which is with
the research agent now.

**Not decided, and his to make**: whether the offline promise admits an
explicitly opt-in online extra, which is what a connection to a streaming
music service would need. Recorded elsewhere as a pending decision.

**Research in flight**, not a commitment: whisper.cpp and vosk for speech to
text, piper and kokoro for speech, evaluated on licence and on cost against
this app's constraints. The evaluation is cheap and is worth having whether
or not any of it is ever built.

**State 2026-09-24:** (c) deferred by the owner's own word; nothing starts until he says go.

## 20. A model per feature (asked for directly, 2026-09-21)

The owner: *"also allow the user to alter the model they use for that
specific feature if they wish such as for the write with ai area, the chat
tab and document ai assistant. allow these to be easily individually altered
and reset and for there to be a mass reset for all individually altered ai
model preferences."*

Built 2026-09-21; the record is in HISTORY.md, "Moved from the plans". What
stays here is the decisions, because they are what the next feature row is
added against, and what is still open.

### Decisions made

1. **A second layer over the roles, not a replacement for them.**
   `ai/model_manager.py` already has chat, utility, vision, ocr and embedding
   roles. A feature override resolves to the feature's own model if one is
   set and to the role it belongs to otherwise. One table, `FEATURES`, maps
   each feature key to its role, and one seam, `for_feature(key)`, hands back
   a manager view whose `chat_model()` / `utility_model()` answer for that
   feature. A new feature is a row in that table, not a new setting, a new
   route and a new control.
2. **The first pass is four rows**: the Chat tab, the writing desk (Write
   with Atlas), the documents AI assistant and the Guide. The Guide is in
   because it is the same shape exactly, one surface, one model call, one
   role to fall back to. **The skills runner is deliberately out**: a skill
   run goes through `agent.run_agent` on `chat_model()`, the same loop the
   chat tab's agent mode uses, so a "skills" row would have moved only
   `skill_runner._replan`'s small recovery call and left the model that runs
   every step where it was. Giving skills a model of their own means giving
   `run_agent` a feature to run under, which belongs in AGENT_SKILLS_REFORM.
3. **Settings is the canonical place**, because that is where a mass reset
   makes sense: one list, a row per feature naming the model and whether it
   is inherited, a per-row reset live only while that row is overridden, and
   one reset for all of them that says how many it would clear.
4. **Each surface also gets the picker in the menu it already has**, never a
   new control in its chrome: the Chat tab's `kebabMenu`, the writing desk's
   `details.dock-menu`, the documents editor's `details.dock-menu`. One
   `openSheet` behind all three, so the wording cannot drift.
5. **An unset feature stores absence, never the resolved name**, and resolves
   through its role at read time. Storing the name would look identical on
   the day it was written and then silently leave every untouched feature
   behind the first time the chat model is changed in Settings.
6. **The sub-tab is "Write with Atlas."** The tab button said "Write with AI"
   while the heading of the panel it opens already said "Write with Atlas",
   so the app contradicted itself on one screen.

### Still open

- **The feature list is inside `#models-config`**, which Settings hides whole
  when no backend is answering. So with the model server down there is no way
  to see or clear a feature override, and the app's own "no model" advice is
  what shows instead. Defensible (every other model picker is in there too)
  but worth revisiting if anyone reports it.
- **The Guide's row is the answer to INBOX 288 but not to its cause.** Smart
  model routing off silently moves the Guide, an interactive panel, onto the
  chat model, because the switch is written for background jobs. Either the
  switch's copy should say which surfaces it moves, or the Guide should stop
  being one of them. **Decided by the owner 2026-09-24: the Guide stays on
  the utility model whatever the switch says** (`utility_resolution`,
  `test_with_smart_routing_off_the_guide_keeps_the_utility_model`).
- **A per-feature model is shown on the Chat tab and nowhere else.** The
  chat pill (`#chat-active-model`) reads the pinned model now, but the
  writing desk and the documents assistant say which model they are on only
  inside their own menus. Neither has a pill to put it in, so this is a
  design question (does a writing desk want a model badge in its dock?)
  rather than an oversight.

**State 2026-09-24:** (c) three open questions, each a decision rather than built work; none has been reported since.

## 21. Every failure names its way out (INBOX 272 part 1, 2026-09-21)

The owner, verbatim: "make sure all features and alternatives are easily
knoticable by and offered for the user. like if the embedding model fails
or has an error, it suggests to download nomic-embed-text. if duck duck go
is rate limiting it automatically tries searxng and if it isnt installed it
suggests it. and same for many other instances." INBOX 272 called this a class; the survey, its fourteen rows and the
record of rows 9 to 11 built on 2026-09-21 moved to HISTORY.md, "Moved from the plans, 2026-09-24". The lint
that holds it is `tests/test_failure_remedies.py`.

State 2026-09-24, what the survey left open:

- Row 1 and 2: the embedding-model messages still draw with `.status.error`
  rather than the `.notice.notice-warn` recipe (DESIGN.md). S, `frontend/js/app.js`
  `embedding-error-fix-row`.
- Row 12: a wrong custom `base_url` and an absent server now differ in the
  provider (`list_models` raises "Nothing answered at <url>. Check the
  address", 283, 2026-09-24), but the status line still reads "not
  detected" for both. S, `api/routes_models.py` status route.
- Row 13: whether the About page shows `candidate.size` before the update
  button is pressed was never traced in the frontend. S, `settings.js`.

## 22. The professional baseline and the devibecode programme (2026-09-27)

The owner, verbatim: "poke holes in the app. find issues, both really large
scale, not necessarily bugs, and small. things that every professional app
has and people expect to just be there ... Identify areas where the design
isnt up to the standard it should be. make a plan to further devibecode each
interface and panel and make full use of multiple and all of your available
ui/ux and web design skills". Decided the same day: **desktop first, and the
desktop that matters is a small uni laptop** (1366x768 at 125% scaling, which
leaves 1093x614 CSS px, and 1280x720), then tablets; CSS is still written
mobile first, as the owner's web design class teaches. Measured with
`scratchpad/proprobe.js` (session scratchpad) at 1093x614@1.25, 1280x720 and
1536x864@1.25.

### 22.1 Large gaps (what every professional app has)

1. **No URLs.** Every view is `/`. Reload always lands on the Dashboard,
   the browser's Back leaves the app, a note or chat cannot be linked or
   bookmarked, and `document.title` never names the view ("(1) MemoryMap
   AI" everywhere). navigation.js keeps its own back stack on purpose (its
   comment explains why pushState was refused), which was the right call
   without a router and is the wrong end state. Target: a hash router
   (`#/notes/123`, `#/chat/45`, `#/docs/7`, `#/library/images`), the in-app
   back and forward buttons driven by `popstate`, reload restoring the view,
   and the title naming it ("Half marathon, week 4 - Notes"). L, Opus.
2. **The laptop screen is mostly chrome.** At 1093x614 the top bar (72px),
   sub-tabs (55), the list toolbar (55) and the status bar (37) take about
   36% of the height: the Notes list shows 2.3 cards and the Dashboard's
   widgets start below the fold. Target: a height-aware density (Compact
   applied by default under 700px of height, with the setting still in
   Appearance), sub-tabs merged into the list toolbar where a surface has
   both, and the status bar folding into the top bar under 680px. Gate: 4
   note cards and the first dashboard widget above the fold at 1093x614. M,
   Opus.
3. **Tabs lose their names on a laptop.** Under about 1100px the tab strip
   is icons only with the active tab labelled, so six of seven tabs are
   guesses. Target: short labels kept down to 1024px (the strip has room once
   the spaces picker shrinks to an icon), tooltips with the shortcut below
   it, and the strip centred (INBOX 430). S, Sonnet.
4. **Leaving with unsaved work.** Built 2026-09-27 for the note edit form,
   the Capture box and a document mid-autosave, the three surfaces with a
   plain dirty flag (HISTORY.md, "Moved from the plans, 2026-09-27"). Left:
   a board mid-drag and a chat mid-stream, which have no such flag yet. S,
   Sonnet.
5. **Two windows, one note.** Built 2026-09-27 for the note edit form and
   the document editor (HISTORY.md, "Moved from the plans, 2026-09-27").
   Left: the other note writers (a card's checkbox, the graph's tag edit,
   the lightbox caption) send no `base_hash` yet and stay unchecked. S,
   Sonnet.
6. **The server can go away.** Built 2026-09-27: a persistent banner
   ("Can't reach MemoryMap. Retrying...") with a Retry action, raised by
   `api()`'s own network-error catch and cleared by the next successful
   request or a backoff poll against `/health` (HISTORY.md, "Moved from the
   plans, 2026-09-27"). Left: queuing or refusing a write with the same
   message while it is up. S, Sonnet.
7. **No screen-reader pass, ever.** Landmarks exist (1 header, 3 main, 5
   nav: three `main`s is itself a fault), but no session has driven the
   app with a screen reader or checked the custom widgets' roles (the rich
   picker's `aria-activedescendant`, the seg controls, the graph canvas).
   Target: one `main`, an axe-core sweep in `scratchpad/ui-sweeps`, and the
   ARIA patterns for listbox, menu and tabs checked against the APG. M,
   Opus.
8. **Data safety is there but hidden.** Backups exist
   (`routes_backups.py`), revisions exist (`EntryRevision`), export exists,
   but none is on the Dashboard or in the note menu as "Version history",
   "Export", "Back up now". Target: version history in every note and
   document menu with a diff, a "Last backup" line in Settings and on the
   About page, and a first-run prompt to choose a backup folder. M, Opus.
9. **Offline promise, visible.** The Privacy receipt now exists; the top
   bar should say "Local" with the same verdict, one click to the receipt.
   S, Sonnet.

### 22.2 Small things people expect (each S, Sonnet unless noted)

- The window title names the view and the open item (22.1.1).
- Ctrl+S, Ctrl+Z and Escape behave the same in every editor and dialog
  (the key contract, 1.6, has no lint for Escape yet).
- Search highlights the match inside the note it opens, and remembers the
  last few queries.
- Every destructive action has an Undo toast, not only deletes of notes.
- Every date and time follows one setting (12 or 24 hour, the locale's
  order); the status bar clock, the timeline and the reminders do not agree
  today on whether seconds show.
- Drag and drop of files onto any page imports them (Library only today).
- Every list with more than 20 rows can be filtered by typing.
- Right-click works on every card and row, with a hold as its twin on touch.
- A "Copy diagnostics" button on the About page (versions, model, recent
  errors) for bug reports from test users.
- The status bar's "!" dot says what it means on hover and click.
- The "Default Space" chip is hidden when only one space exists (it is on
  every card today and says nothing).

### 22.3 Where the design is below standard (measured or seen, 2026-09-27)

- **Density and rhythm.** Cards carry 24px of padding and 17px body text at
  every width; on a laptop the list reads like a phone app scaled up.
- **Hierarchy in Settings.** Section heads are the same weight as labels
  (in the Sonnet batch).
- **Icon consistency.** Mixed stroke weights between Phosphor regular and
  the bold ones on the status bar; one weight app-wide.
- **Empty states.** The Chats sidebar's empty text is body size and grey on
  grey; empty states should use one recipe (icon, one line, one action).
- **Toasts** overlap content (the reminder toast covers the dashboard head
  at 1093x614); they belong in a reserved corner above the status bar.
- **Glass** is still on some surfaces the performance plan listed for
  removal; the glass-off list lint should cover every blurred surface.

### 22.4 The devibecode programme: one surface at a time, every skill

Each pass takes one surface through the same seven steps, so no surface is
"done" by a different standard:

1. **Audit** with `unslop-ui` (the AI-tells checklist) and
   `web-design-guidelines` (Vercel's interface guidelines), writing each
   finding with its selector.
2. **Research** the surface type in the vendored `ui-ux-pro-max` corpus
   (`python .claude/skills/ui-ux-pro-max/scripts/search.py "<surface>" --domain ux`
   and `--domain style`), and in `apple-design` for its motion and sheets.
3. **Tokens** through `design-system`: every value on the surface resolves
   to a token; new ones are added to DESIGN.md with their lint.
4. **Design** with `frontend-design` for the direction, inside DESIGN.md's
   recipes (standing order 11).
5. **Measure** at the laptop matrix (1093x614@1.25, 1280x720, 1366x768,
   1536x864@1.25, 1920x1080) and tablets (1024x768, 820x1180), light and
   dark, reduced motion on and off, with errors.js, contrast.js, touch.js
   and a surface sweep.
6. **Shots** before and after, in the report, for the owner to judge.
7. **Owner review**, then the next surface.

Order, by how often the owner is on it: the shell (D15, with 22.1.1 to 3),
Notes (D2), the Dashboard (D1), Chat (D3), Settings (D13), Library (D4),
Documents (D10), the Graph (D12), the Whiteboard and maps (D11), the
Timeline (D7), Reminders (D8), Help and the palette (D14), the companion
and Atlas (continuous). Opus for each design pass; Sonnet for the
measured follow-ups it lists.

### 22.5 Where the app goes next (release path)

Versions follow semantic versioning before 1.0: a patch (0.3.x) for fixes,
a minor (0.x.0) for a set of new features, and a number changes only when a
release is published, however many commits land between. So the pace is
not too fast; the rule is simply one number per published release.

- **0.3.x (now):** finish INBOX 430, green CI, the full suite, then publish.
- **0.4.0, "laptop perfect":** 22.1 items 1 to 6, and the devibecode
  programme through the shell, Notes, Dashboard, Chat and Settings.
- **0.5.0, "the notebook that thinks":** the night shift's review UI, the
  margin reader (I2), open questions (I3), resurfacing (I4), the web
  clipper's frontend, AI templates everywhere.
- **0.6.0, "many devices":** LAN polish for tablets, local-first sync
  design (B6) made real, extensions (B8).
- **1.0.0:** a stable API (B7), a screen-reader-audited UI, the installer
  and update path proven on clean Windows machines, and the docs complete.

## Placed from INBOX, 2026-09-27 (399)

399. **The owner, 2026-09-23 night, verbatim.** "what is left in the world
    class plan?? can you poke more holes in the application for bugs,
    security, poor learnaility/utility/usability/accessibility and more??
    make sure everything works on the windows packaged installer and the
    version it installs. make sure all the update features in the about
    settings page as well as the auto updates in the bat and sh files work.
    keep design consistent, expand professional and modern design. maximise
    usability and learnability. poke holes in the application as in find
    bugs, security flaws places where there is unintuitive design, poor
    information architecture, poor design, poor ui and ux, poor
    learnability/usability/heirarchy/spacing and more. hit the open items and
    plans in open.md. finish all unfinished work. majorly optimise at the
    level of professional applications. make everything feel like it is a
    professional application and not just a demo. maximise use of affordances
    and semiotics. look at websites like motion.dev for ui and component
    refinement, bklit.ui, kokonut ui etc so make sure none of the ui elements
    are unprofessionally designed or act in a wierd way. ... dont let my
    additions distract you, add them to the list and continue, never leave
    anything half finished, not properly done, or untouched."
    Placed as four agent briefs, run as slots free: (1) WORLD_CLASS_PLAN
    rows not built, grepped first, with the list reported back; (2) a hole
    poke (bugs, security, a11y, IA, spacing) with a finding table and fixes;
    (3) the Windows installer, the installed version and the update paths
    (About's updater, `start-*.bat`/`.sh` auto-update), tested in a scratch
    copy per CLAUDE.md's trap; (4) component refinement against motion.dev,
    kokonut and bklit patterns (motion, hover, focus, press states).
    Part (4) built c3bbefc: every transition on `--motion-*` and `--ease-*`
    (`tests/test_motion_tokens.py`), a hover is a colour never a filter
    (with INBOX 405), toasts and '?' popovers fade in with 4px of travel,
    toasts fade out, skeletons in the Library and Timeline. Menus' exit left
    to the menu agent (archive/agent-remaining/perfpolish.md).

## Placed from INBOX, 2026-10-03 (INBOX 403, the standing bar)

Moved whole from INBOX when INBOX 435 arrived (the tray holds under
twenty). It is the bar every pass in this plan is measured against.

403. **The owner, 2026-09-23 night, verbatim.** "for me, trust in the
    application isn't just the information it shows but that is very much a
    key point, it is also how cleanly and professionally the application ui
    is designed and works. the less professional or unclean any part of the
    ui is, no matter how small, I instantly doubt the applicationa dn wonder
    if it is worth putting any time into as it feels unreliable. things like
    having that small gap between the edge of the note connection pill chips
    on the right and the 'x' delete button, as well as poorly designed
    dropdown menus with bd widths, poor spacing, poor alignment, poor
    heirarchy, positioning, poor learnability, not intuitive controls poor
    information architecture and more. keep doing what you are doing" The
    standing bar for every pass (INBOX 399's hole-poke and refinement briefs
    carry it). Named: the connection pill's x inset, orchestrator; menus
    (widths, spacing, alignment), a sweep of every menu for width, padding
    and row alignment.

## Placed from INBOX, 2026-10-03 (INBOX 391, 392)

391. **The owner, 2026-09-23, with the Gemini/Antigravity pass on
    `fix/gemini-fixes-5` (1e63d87, 2c3e16e): "fix and refine the changes
    attempted by gemini ... fix the ui, fix the ux, fix bugs, revert and refine
    risky or bad changes, implement the attempted fixes and improvements but
    better."** Reports in the same drop, and where each stands on this branch:
    packaged-exe splash (fixed: bootloader Splash); installer optional packages
    (fixed: `--install-extras`, frozen `--target` folder); `ModuleNotFoundError`
    traceback and no nomic-embed-text suggestion (fixed); Notes dock and
    dashboard tiles wrapping at 100% (fixed, measured at 1184); edit scrolls to
    top and blank Notes page on first edit (fixed: `applyDocGutter` lazy entry
    point); 29/30/31 notes (fixed: drafts out of every count); no select all
    (fixed, one toggle per bar); table cells in live view (fixed, focus kept);
    whiteboard undo for formatting and map styles (fixed); mind maps missing from
    Find anything, weekly digest filler and "tonight", per-feature model
    picker, agent activity panel alignment, image filter sketches/uploads,
    notification when a closed panel's answer finishes (agents running).
    Decisions, taken 2026-09-23 with the owner: **no fine-tuned bundled model**
    (the owner agreed: a stock small instruct model plus this app's prompts is
    cheaper to keep current; revisit only with an eval set that shows a gap).
    **Laya** (Convai's open-weight decision model, the open alternative to
    Jev: ModernBERT-large, 421M params, Apache 2.0 so AGPL-compatible, typed
    choice/score/boolean outputs with probabilities) **is not adopted now**,
    for three measured reasons from the published benchmarks: zero-shot it
    scores below a plain baseline (0.362 vs 0.461) and only wins after
    per-domain fine-tuning, which this app cannot do for each person's own
    categories; it degrades past about 20 labels (0.425 on Banking77's 77),
    and notebooks grow past that; its context is 512 tokens, shorter than many
    notes. Filing stays on embeddings plus the chat model. Where it could earn
    a place later: small fixed-choice decisions (intent routing in chat, "is
    this a reminder") as an optional extra on the same torch install as
    search by meaning, gated on an eval set showing it beats the current
    prompt on those questions.

392. **The owner, 2026-09-23, verbatim, for after 391:** "poke holes in the
    application as in find bugs, security flaws places where there is
    unintuitive design, poor information architecture, poor design, poor ui and
    ux, poor learnability/usability/heirarchy/spacing and more. hit the open
    items and plans in open.md. finish all unfinished work. majorly optimise at
    the level of professional applications. make everything feel like it is a
    professional application and not just a demo. maximise use of affordances
    and semiotics. look at websites like motion.dev for ui and component
    refinement, bklit.ui, kokonut ui etc so make sure none of the ui elements are
    unprofessionally designed or act in a wierd way. I have found the mind map
    is very unintuitive to use, really slow to pan and move around, the controls
    and tools are annoying to find and use, the connections in the bottom bar
    are different from the ones the mind map nodes use and it just needs a
    whole professional refinement. same with the code mirror live view in the
    documents editor, the live view needs a lot better md rendering and it is
    hard to edit things like tables and other elements and it could look a lot
    nicer rendered, and usability ux could be improved. also the code document
    types dont act like a code editor with errors, suggestions and that needs to
    be imporved. indenting and dedenting across the app also doesnt come in the
    form it should." Placement: the mind map half joins MINDMAP_PLAN row
    13a-view (INBOX 312's pan cost) plus a connector-parity row (the bottom
    bar's link tools must draw what map edges draw); live view and code
    diagnostics join DOCUMENTS_PLAN; indent/dedent (Tab/Shift+Tab on list
    items and selections in every text surface) is a WORLD_CLASS_PLAN
    consistency rule with a lint. Added the same hour, verbatim: "also for
    after, the mobile view is still bery broken, takes up a lot of the screen
    and the design needs a lot of improvement." Placement: UI_MODERNISATION_PLAN
    phone phases; measure chrome height against content at 390x844 first.
    That half is built (2026-09-23): UI_MODERNISATION_PLAN Phase 11 item 12,
    gated by `scratchpad/ui-sweeps/phonechrome.js` at 390, 768 and 1024.
    Later the same day, verbatim: "make sure the whole of the app ui is
    repsponsive, not just for mobile but any ui resolution. though mobile-first
    design is I'm told a good practice" and "when I say mobile and responsive
    design, I mean actually intentionally deisgning for those resolutions, and
    not just adapting to them. like actually making the features be intended
    and designed for those resolutions" (phone agent briefed: a phone intent
    per surface, tablet widths swept too), with slides asking the software to
    reduce CPU, RAM, network and storage (standing: measure before claiming,
    as the pan trace did). Also reported and fixed on the branch: the mind map
    label drag drifting and starting a selection box; the chat header naming
    llama3.2 while another model answered; no prompt when search by meaning
    failed; a picture captioned and read several times over.

## Placed from INBOX, 2026-10-03 (the tray at its cap)

Open, moved whole from INBOX so the tray stays under twenty; each is worked from here by impact.

410. **The owner, 2026-09-24, verbatim, with screenshots of the writing
    dictionary, New from a template, the map's radial menus and two linked
    map nodes.** "also improve how the \"check with ai\" feature works in the
    documents editor, allow the suggestions panel to be docked on the right
    instead if the user wishes and redesign the dictionary panel as it is
    ugly and needs a proper professional modern redesign." "also when
    selecting a template, I want to be able to confirm my template
    selection, not have it instantly be made when I press it" "is there a
    way to make these mind map item radial options fit better in the
    radials?? also what if the user asks the guide for all the hidden
    features, keybinds, controls, utility and more for features like the
    whiteboard, mindmap and documents editor etc. can it answer those??"
    "also fix the ci and codeql errors" "when I relink or newly link two
    mindmap nodes, they clump together??" "drag selection on the whiteboard
    and mindmap is laggy as well". Read from the screenshots: the radial's
    labelled pills overhang the ring (a 2-item edge ring and the 6-item node
    ring both); a relinked node lands on top of its new parent instead of
    being laid out as its child. CI: four routing rows fixed 2026-09-24 (three
    moved to topics added that day, "Can Atlas write for me?" gets a new
    write-with-atlas topic). Placed: documents (check with AI, dockable
    suggestions, dictionary), templates (confirm), the Guide's per-surface
    controls reference, map (radial fit, relink layout, marquee lag), in
    agent briefs as slots free.
    **Templates (confirm) built 2026-09-24** (bf54953): a click chooses,
    Use this template, Enter or a double click makes it; sweep
    `templatepick.js`. 
    **The Guide's part built 2026-09-24** (guide-controls agent): a controls
    reference per surface and a hidden features entry, routed by what the
    question asks c05c684; 55 bank questions (177, top-1 99.4%, top-3 100%)
    1385b0e; a freshness test against every bound key a164dc2; the caps
    (a 422 after a long answer and on the fifth question, the reply cut
    mid-list) 5cb7f8f. Map part built (radial fit 13c41d7, relink b449623, marquee 18b8c15).
    **The documents' part built 2026-09-24** (the documents agent): Check
    with AI runs in place, streamed into the suggestions panel with Apply,
    Dismiss and Stop, a no-model notice with Settings, Models, and Discuss in
    chat with no long prompt (so no skill nudge, the INBOX 413 half)
    (cd5dec1, `aicheck.js`); the panel docks at the bottom or on the right,
    resizable, remembered, always bottom at 720px and below (a8c822a,
    `prosedock.js`); the dictionary as a settings sheet (bbeda8e,
    `dictsheet.js`); the Capture box's templates confirm too (26e8d9b,
    `notetemplatepick.js`). Nothing of 410 is open now; it stays for the
    orchestrator to resolve with 413.

421. **The owner, 2026-09-24, verbatim, with screenshots (placed in agent
    briefs, two at a time).** (a) "in the radials on the mind map, the items
    like "add beside" and "cross-link" are very close to the edges (inner and
    outer) of the radial and arent centered nicely. also when I press the
    more button the dropdown menu appears in the top left of my screen"
    (desktop app; the pie-ring agent could not reproduce the corner with a
    real click). **(a) built** (INBOX 421 agent): labels centred with 10px to
    both arcs and dividers (1.4 -> 11.4px, mapradialfit.js); More anchors to
    the sector read at pointerdown, (0,0) refused and logged, the canvas host
    no longer scrolls on focus (mapradialmore.js 33/33). The desktop corner
    itself was still not reproduced headless: the console now names any
    corner placement, so the owner's log will say which route it was. (b) "the / command blocks and frames need a massive
    redesign, expansion and improvement, the icons dont render in the live
    view in the documents editor ... they need ot be impressive and an actual
    proper thing the user's can use to properly structure out their
    documents and notes." (live-view callout icon fixed 6e072b2; built
    2026-09-24: the grouped block inserter, 14 callout kinds, columns in
    notes, contents, rules, cited quotes, maths, the block bar and document
    cards, `slashmenu.js`, `blocksrender.js`, `blockbar.js`.) (c)
    "sometimes document editor dropdowns appear at the top of the screen and
    other times it is fine, sometimes it doesnt open at all" (the spelling
    menu, top of the window; fixed 2026-09-24: placed from the
    finding, never a detached element's empty box; the double-click's first
    press; the "/" menu follows a scroll; `menuanchor.js` 15/15). (d) "there's no 'x' close button on the trace
    popup row in the graph" (**built**: an X at the strip's end that leaves
    trace mode; Done only cleared the ends; graphtraceclose.js). (e) OCR: "I cant delete the ocr entry in the
    workspace or the lightbox and the text in the lightbox doesnt even appear
    in the ocr workspace" (workspace delete fixed 6e072b2; the lightbox
    showed a vision reading of "Test, Test, ..." hundreds of times, a
    degenerate model loop the app should cut; **built**: loops cut where a
    reading is produced, each lightbox reading deletable, the workspace shows
    both stored readings and no longer blanks a stored one when the reader
    is the model; ocrreadings.js 6/6). (f) The file row in the
    Library ("PDF · 121 KB · added ... Read · 808 words, Open reader, Used
    in"): "needs a bit more modern and ui refinement and the second row
    elements arent aligned and dont really match" (fixed: one size, one
    line box, middot groups, "Read this" a link). (g) "the lightbox buttons
    below the image are greyed out?? i opened the image from within a note".
    (**built**: not disabled, the row was the theme's ghost ink on the dark
    scrim, 1.37:1 in light from every door; now the scrim's own recipe,
    8.28:1; lightboxentry.js) (h) View toggles with no clear active state (fixed c920174). (i) "have
    you included all the new optional packages in the packages settings
    page??" and "move the preferences settings page up a bit and maybe also
    turn it a bit into the user's own personal local profile where they can
    put info about themselves and their name for the ai to use as context
    and there can also be the generated profile image". (j) "I clicked a note
    linked in the sources of an ai chat reply and it took me to that note,
    but when I pressed the back navigation button it opened the settings
    panel??" (not reproduced: chat then flashEntry then Back lands on chat,
    also with chat opened from inside Settings; needs the exact path).

423. **Found, not fixed, by the agents of 2026-09-24 (placed for the next
    pass; one line each, recommendation first).** (a) The mind map's pie
    ring does not take focus when it opens, so Enter and the arrows still
    act on the board while it shows: recommend it takes focus when opened
    from the keyboard only. (b) DOCX export writes `:::columns`, `[TOC]` and
    `[!kind]` as plain text: map them to Word columns, a TOC field and a
    shaded box. (c) Inline `$x$` maths is plain symbols in Read view: render
    it through the same TeX-to-MathML path as `$$`. (fixed: `INLINE_MATH_RE`
    (app.js) now claims a `$…$` span with no space inside either delimiter
    and no digit right after the close; `unlatex` carries it through
    untouched instead of symbol-swapping it, and `renderInlineMarkdown` cuts
    it out and draws it with `mdInlineMathElement`, the same `docMathRender`
    the `$$` blocks use. `tests/test_inline_math.py`.) (d) The OCR workspace's
    message for a vision reading still suggests installing Tesseract: word
    it by reader. (fixed: `_regions_for` (routes_files.py) checks
    `ocr.tesseract_available()` before wording the "no page positions"
    message; installed but not chosen now says "Switch to Tesseract", missing
    still says "Install Tesseract". `tests/test_ocr_regions.py`.) (e) At
    150% zoom the lightbox picture overlaps its caption
    line. (f) Stored readings that already contain a repeated-line loop are
    not cleaned: offer "Clean up" in the reading menu. (fixed: a broom
    button beside Delete reading, in the OCR workspace and the lightbox's
    other-readings list, POSTs `/files/{id}/ocr-clean-loops` or
    `/media/{id}/ocr-clean-loops`, which runs `cut_reading_loops` over
    whichever of `vision_ocr_text`/`ocr_text` are set and saves what
    changed; the panel repaints from the response. `tests/test_ocr_clean_loops.py`,
    live-checked with `scratchpad/ui-sweeps/ocrcleanloops.js`.) (g) `_desktop_port()`
    treats any MemoryMap on the port as ours, whatever its data dir: compare
    the data dir in `/instance` first. (h) Chat replies saved before
    2026-09-24 always show Atlas's mark (their persona was never stored).
    (i) The server-mode process takes 5 to 9s to exit after uvicorn
    finishes: find the thread that holds it. (fixed: every sync route
    (almost all of them) runs on one of anyio's own "AnyIO worker thread"
    objects, which is not a daemon thread and only stops itself on a
    done-callback that can miss `uvicorn.run()` tearing the loop down;
    measured leaving one alive, `daemon=False`, right after "Finished
    server process". `_stop_lingering_worker_threads` (`__main__.py`,
    called right after `uvicorn.run()` returns) asks it to stop and bounds
    the wait to 1s. `tests/test_server_shutdown.py` reproduces the leftover
    thread with a real `uvicorn.Server` running `create_app()` and checks
    the fix clears it.)
    (j) `gate.sh --sweeps` on 25d7d56 (fixture data dir /tmp/mm-me):
    asktab.js 3 findings, libreadingfoot.js "reading visible: false" and
    "no card with a reading", tagoffer.js 2 failures (manual route and the
    empty tag row flag). Triage each as app bug or stale sweep before
    fixing; the reader's 36px page box is fixed (25d7d56).

424. **Audit of 2026-09-24 (performance measured in Playwright on a
    400-note, 1,200-link, 250-object board, 120-topic map, 30-image
    fixture, at 1440x900, 1x and 4x CPU with CDP profiles; UX walked at
    1440 and 390). Fixed in this pass: the media poll outliving the
    Library, the outline rebuilt per typing pause (515ms to 12ms), the
    avatar follow frame's document-wide query (279ms to 20ms per 60 moves),
    the unnamed "Toggle Sidebar" button. Open, one line each: measurement,
    cause, recommendation.**
    (a) Board, dragging a multi-selection: 44 long tasks, 8.6s of them for
    40 moves at 4x (max 560ms); `objDragMove` calls `wbUpdateSelectionBar`
    every move, and `wbItemBBox` runs a document-wide
    `querySelector('.node-card[data-id=...]')` per item (2.6s); recommend an
    id-to-element map from the render pass and the bar updated once a frame.
    (fixed: `objDragMove` 5,167ms → 167ms, profile busy 6.1s → 1.0s, longest
    task 901ms → 213ms, same harness and fixture at 4x; element cache in
    `wbItemBBox`, the bar queued once a frame, the chrome groups found once
    per gesture, the editing check scoped to the board. Bar position mid-drag
    identical to base over 10 moves, `perf5/barcheck.js`.) Still open on the
    board, a pan: a devtools.timeline trace of 40 moves at 4x is 43 long
    tasks, 3.5s, of which `Layerize` is 2.4s and script 0.2s; it stays with
    the grid sync, the cull, the bar, the navigator and both SVG transforms
    switched off (`perf5/pantrace.js` VARIANT), so it is the compositor's
    layer assignment of ~250 painted objects per frame, not a handler.
    (fixed 2026-09-26: the objects were not the cause, their grips were.
    Nine per card, invisible but in the tree, each scaled by
    `--wb-inv-zoom`, split the board into 256 layers; `display: none` at
    rest gives 138. Two runs each at 4x, 40 moves, `gwperf.js`: long tasks
    33/38 (2.5/2.7s) to 2/2 (136ms), `Layerize` 1.8/1.7s to 0.34/0.35s,
    median frame 67/50 to 17/17ms; the zoom's long tasks 2.0s to 0.5s.
    Grips on hover and selection unchanged, fade kept, `wbpanlayers.js` 6/6,
    3/6 on base.)
    (b) Graph node drag at 4x: 137 long tasks, every frame over 33ms (max
    550ms); `graphMinimapPaint` rebuilds the minimap's SVG on every worker
    tick (1.56s of `createElementNS`/`setAttribute`/`replaceChildren`);
    recommend painting the minimap to a canvas, at most once a frame.
    (fixed: `graphMinimapPaint` 1,502ms → 514ms, profile busy 3.6s → 2.0s
    for the same 40-move drag at 4x; the ticks queue one paint a frame, the
    paint moves the existing dots and lines and skips unchanged attributes,
    and a minimap that is off, on a hidden tab or in a hidden window is not
    painted. Kept as SVG: the sweeps count its circles. Dots, lines and
    positions identical to base, `perf5/minicheck.js`, `minimap6b.js`.)
    (c) Graph wheel zoom at 4x: 31 long tasks, 13.7s, p95 frame 583ms;
    `gcDraw` re-measures every label (`measureText` 152ms) per frame;
    recommend caching label widths per node and font size.
    (fixed: `measureText` 165ms → 0 over 16 wheel steps at 4x; a label is
    measured once per text at a reference size and scaled with the zoom,
    dropped when the font changes.)
    (d) Graph tab switch at 1x: 25 long tasks, 1.6s, 50 of 59 frames over
    33ms; each visit refetches `/graph` and restarts the layout, and
    idle on Graph at 4x is still 3.7s of main-thread work per 10s
    (worker ticks plus minimap); recommend reusing the last settled layout
    when the notes' version has not changed.
    (fixed for the layout, not the fetch: main-thread task time in the 12s
    after a revisit at 4x 6,746ms → 1,382ms; a layout whose inputs, pins,
    lines, forces and world match the last one to settle, with every note
    where it left off, starts at rest and is framed as before; any change of
    input heats it as before. Idle once settled was already ~5ms per 2s: the
    cost was the re-settle. Still refetched each visit.)
    (e) Mind map expand of the root (120 topics) at 4x: one 1,336ms task;
    `renderWbObjects` rebuilds every node through `wbBuildMapNode`
    (`setAttribute` 354ms); recommend keyed updates so an expand only
    builds the nodes it reveals.
    (fixed: the join was already keyed, so an expand of the root does reveal
    all 119; what it no longer does is build them. A folded topic's element
    is kept and taken back, for the same datum only. Two runs each at 4x:
    longest task 899/1,115ms → 597/442ms, profile busy 781/1,016ms →
    456/319ms, `wbBuildMapNode` 321/419ms → 0. Markup after a fold round
    trip identical to base apart from attribute order, and a taken-back
    topic's chevron still folds it, `perf5/mapreuse.js`.)
    (f) Lightbox next/previous at 4x: 13 long tasks for 5 presses (p95
    350ms); `show` calls `applyZoom`, which calls `scrollTo` (375ms of
    forced layout) even when already at fit; recommend scrolling only when
    the zoom actually changed.
    (fixed: `show` 457/360ms → 37/28ms and `scrollTo` 406/305ms → 0 over
    five presses at 4x, two runs each; profile busy 580/465ms → 128/118ms.
    Fit scrolls only a scroller its own scroll events, or a pan, say is off
    its origin, so a PDF read halfway down still goes back to the top.
    `lightboxfit.js` 42/42 on both.)
    (g) Library tab switch at 1x: 10 long tasks, 580ms (4x: 3.4s, max
    683ms); `loadLibrary` refetches `/library` and rebuilds every card each
    visit; recommend the same version check as (d).
    (open, needs a decision: skipping the rebuild when `/library` answers
    the same would also keep the selection, which a reload clears on
    purpose, and leave relative dates as they were drawn. Recommend: keep
    the cards on screen during the refetch, skip the rebuild when the answer
    is identical, and clear the selection either way.) (Fixed with that
    recommendation: an identical answer drawn under five minutes ago is not
    redrawn unless something is selected; 189 grid mutations over three
    revisits before, 0 after.)
    (h) Every tab switch at 4x: `revealTab` 70 to 110ms self time, mostly
    `querySelectorAll("textarea.autogrow")` then `autoGrow` on each visible
    one (forced layout per box); recommend autogrowing only the new tab's
    boxes.
    (fixed, the autogrow part: every check is read in one pass and only a box
    measured while hidden, or whose text, width, font or cap changed, is
    grown; 0 to 12ms per switch. Not the 70 to 110ms: split step by step
    (`perf5/revealsplit2.js`, 14 switches at 4x) it is `button.tabIndex =`
    796ms, which forces the style recalc of the page just shown, then 203ms
    of its layout; autogrow was 30ms of revealTab's 1,318ms. That is the new
    tab's own style and layout, forced early, and moving it was measured to
    gain nothing (the note on `revealActiveTab`).)
    (i) Typing in a note at 4x: 56 of 204 frames over 33ms; each keystroke
    mirrors the editor into the hidden textarea and dispatches `input`,
    which runs `autoGrow` (448ms self) on a box nobody sees; recommend
    skipping autogrow for a box whose editor is mounted.
    (fixed: `autoGrow` 492/532ms → 16/17ms over the 50-character run at 4x,
    profile busy 2,448/2,790ms → 1,874/1,713ms. The mirror is left to the
    stylesheet's `height: 100%`, which an old inline height had overridden:
    measured after 14 lines, base mirror 315px under a 398px editor, now
    398px; the editor and its box are unchanged, `perf5/capcheck.js`.)
    (j) The brand emblem's p5 loop draws at 24fps on every tab while idle
    (`_draw` about 70ms per 8s at 1x on Dashboard and Chat, and it shows up
    inside every drag profile); recommend pausing it after a few seconds
    without input, as the mood timer already tracks.
    (already fixed by b944d2c, which the audit's worktree predates: the
    emblem is drawn once and turned by CSS. Measured on this head, 8s idle
    at 1x: 0ms of script on Dashboard and Chat, `perf5/idleprof.js`.)
    (k) Library shows at most 200 of each kind (`PER_KIND_LIMIT`,
    routes_library.py) and its chip counts are the count returned: with 400
    notes the chip reads "Notes 198", and a plain Library search for the
    oldest note ("Note 17 summary") says "Nothing matching" while
    `/entries?q=` finds it; recommend true counts and a server search (or
    paging) once a kind passes the cap. (Fixed: counts and the overview
    are real totals, `truncated` names the cut kinds, `/library?q=` matches
    before the cut and the client swaps those kinds in while searching; a
    line under the grid says "Showing the newest 186 of 339 notes. Search
    to reach the rest." Measured on 339 notes: the chip reads 339, a search
    for the oldest note finds it. Test in tests/test_library.py.)
    (l) Settings: 18 sections in 4 groups; "Profile & preferences" sits
    under Atlas but holds the recycle bin, chat history, notifications and
    writing, is the only section with its own Save button, and repeats a
    "Web search" heading that only links to the Web search section;
    recommend "Profile" under Atlas, a "General" section under Your
    notebook, save on change, and the pointer heading removed. (Fixed:
    Profile keeps the name, look and About me; General, first under Your
    notebook, holds the bin, chat history, answer style, search relevance,
    notifications and writing; both save on change; the Web search pointer
    heading is gone; the Ask tab's relevance link and the catalogue go to
    General.)
    (m) Settings sections are long: Tools 7,592px tall at 1440 (12,058px at
    390), Appearance 4,537px with 105 controls, Logs 515 controls;
    recommend collapsed groups (`details`) with the first open, per
    DESIGN.md.
    (n) One thing, several names: Chat (tab), "Ask" (Notes sub-tab and
    status bar), "Write with Atlas" (Notes sub-tab), Atlas (Settings group);
    Skills (Settings) vs "AI skills" (Library sub-tab); recommend one noun
    per thing in DESIGN.md's copy rules and a lint.
    (o) Library: 8 sub-tabs plus 13 chips in All, several the same filter
    twice (Documents chip and sub-tab; Boards and Mind maps chips and the
    "Boards & maps" sub-tab; Files chip and sub-tab); 101 visible controls
    at 1440; recommend the chips be the only kind filter in All.
    (p) Documents have a tab page with no tab-bar button: the way in is the
    Library's Documents sub-tab, and the tab bar then highlights Library;
    recommend a breadcrumb back to the Library in the editor's dock. (Fixed:
    a "Documents" breadcrumb opens the dock, back to the Library's
    Documents list, measured at the title's height.)
    (q) Notes tab: 109 visible controls at 1440, 19 of them under 24px
    (the link chips on each card); recommend the link chips behind a count
    ("6 links") on the card, expanded on hover or focus. (Fixed: the
    first three links show, the rest wait behind "+N more links", which
    opens them in place.)
    (r) Memory is clean: 30 tab switches moved the heap 21.7 to 22.3MB,
    DOM nodes 48,888 to 49,297, listeners flat. Idle Chat once measured
    599 layouts per 10s at 4x and did not reproduce (0 in a later 5s
    check): watch for it.

425. **The owner, 2026-09-24 (after the usage reset), with screenshots.**
    Avatars: (a) "the avatar shows even when the app is on the lock screen.
    it should only show when the app is unlocked"; (b) "is there a way to
    make the corner companion more lifelike and less a circle just chilling
    somewhere on the screen?? give it life", and "an adaptive companion
    avatar placement feature where set areas are assigned as possible areas
    for a companion to sit or chill around while not being in the way on
    every interface and page. and the companion can even interact with the
    close ui like hand from a top bar, sit on a bottom bar, walk a top a
    feature ... just so I dont move it to one area, and then it is annoying
    for it to be there on another page" (fixed: the companion is one
    drawn character with a body, and per tab it takes a perch measured from
    the real UI (hanging from the top bar or a panel's underside, sitting on
    or standing at a top edge with its legs dangling or tucked, tucked behind
    the bottom bar as a last resort), never over a control; a spot you drop
    it on is kept per tab against its panel; a weighted behaviour picker
    with cooldowns runs one decision every 4 to 12s; commits 4b4f1d4 to
    5c19f45); (c) "may shuffled avatar reset and
    didnt persist"; (d) "how does the shuffle work?? does it still base it
    on what is entered for the name??" (fixed: Your look says it keeps what
    the name says and any part you chose and redraws the rest, db38ea1);
    (e) "I want the persona avatar to
    appear next to where you set the persona for the dashboard greeting";
    (f) "I set the dashboard greeting to another persona, but when I hit
    regenerate, it said asking Atlas"; (g) "I changed personas for the
    dashboard greeting and the avatar/icon changed as I had set it, but when
    I changed the persona again, it didnt change again"; (h) "the whole
    thing with the avatars needs a proper polish and bug fix ... a full ui
    and ux upgrade to properly fit the application" (fixed: every generated
    face is one designed character, d1e74fd; swept at 1440 and 390, light
    and dark: row alignment within 0.5px at every list site, no clipping
    but the large view's ears (fixed), speech bubbles kept inside the
    window, the companion no longer over the chat composer's settings or
    the phone's Library tab). Documents: (i) "can
    there be a document full screen mode so there is more space ... maybe
    the top bar needs a bit of redesigning or the interface on the document
    editor needs a bit of visual adjusting to allow for more room. also
    tables are still really annoying to use and edit in the documents live
    view" (fixed: focus mode on the dock and F11 hides every band of chrome,
    a fading floating bar keeps title, words, save state and Exit, 228px to
    71px above the first line and 520px to 830px of writing at 1440x900;
    the dock is one 36px row, 49px back in the normal view; Live tables keep
    the column on the arrows, Enter goes down and adds a row, the arrows
    leave a table at either end of the document, a spreadsheet paste fills
    cells or makes a table, the cell menu rides the edited row; the AI
    assistant's head and verbs redesigned; commits da89a75 to 260bb2a).
    Settings: (j) "remove the need for saving preferences in the
    settings and just have it auto save like the rest of the settings";
    (k) "should these text boxes be aligned to the right??" (the
    Preferences number fields; answered, no change: measured, all four
    sit on the pane's one field column at x=812, the same left edge as
    Display name and the answer-style select, and flushing them right
    would give each a different left edge because their units differ); (l) "Improve how custom theme cards are
    displayed" (name truncated "Sea of P...", delete button crowding it; fixed: saved looks get a 10rem track,
    the name wraps to two lines before it truncates, delete is a badge on
    the card corner; measured 183px cards, no name clipped at 1440).
    Dashboard: (m) "the search bar on the dashboard has a glass aesthetic
    even when it is off"
    (fixed: its ground was a 4% tint over the page art; the tint now sits
    on `--card`, which glass off makes solid). Backgrounds: (n) Mycelium start points more
    organic, smoother faded transitions; (o) optimise Microbes (fixed, both,
    e5a8c4b and b8ad914: scattered spores, staggered threads, a 2s
    cross-fade between generations; Microbes 3.0 to 2.2ms a frame; also
    Constellation 3.5 to 2.4ms, Mesh and Orbs moved to 15/30fps canvases,
    whole-browser CPU about halved. Still open: Constellation and Microbes
    just over the 2ms budget on a loaded machine, 0.3 to 1MB/s of canvas
    garbage from fractional coordinates, pause on blur only after 30s, the
    dead CSS path and `bg-*` keyframes in 03-dashboard-widgets.css, a faint
    upscale texture in the dark mesh, 4x-throttle numbers not re-run). (p) "see if there are any more areas to reduce
    lag ... like the avatars and other animations" (the audit agent, 424).
    (q) "on the dashboard when on the focused view, the hero section row is
    ugly and needs improvement and I dont agree with the search bar being on
    the same line and changing width depending on how long the welcome
    message is" (fixed: the owner's decision reverses INBOX 296's one-row
    head; Focused is Full's head at a smaller scale, a 71px banner with the
    greeting and name nudge, the summary under them and the time on the
    right, and the search full width beneath it at 1408px whatever the
    greeting says; measured at 1440 and 390).

427. **Open from INBOX 426, 2026-09-26: two calls only the owner can make.**
    Everything else in 426 (a to cc) is built and in HISTORY, "INBOX
    resolved, 2026-09-26"; the agents' smaller leftovers are in
    `agent-remaining/OPEN.md`, "Left by the 0.3.3 agents".
    (1) **Atlas's anatomy, the owner's read of rounds 3 and 4.** The trace
    proofs put the masculine look at 88% of the reference sprite's height
    and the feminine look's hair a third shorter than the definitive stand's;
    the owner's review names the next round (hands and feet, the head to body
    join, the tail's ribbon, the chest star). Judge it in the avatar lab
    (`tools/avatar-lab.html`, Both looks, All poses) or the README's
    `docs/screenshots/atlas-hero.png` and `atlas-poses.png`.
    Recommendation: none to take on the owner's behalf; this is taste.
    (2) **The companion's pin near an edge.** A companion pinned within 160px
    of the window's right or bottom edge keeps its distance from that edge
    when the window is resized (so it moves with the edge); one pinned further
    in keeps its place. Whether the owner reads the first as "it still
    moves" (426 l) is not known. Recommendation, taken unless the owner says
    otherwise: keep it, since a pin by the edge that stayed put would end up
    off screen or under the scroll bar on a narrower window, which is 426 k.

430. **The owner, 2026-09-27 afternoon, with 37 screenshots (verbatim in the
    session; condensed here, each placed with an agent).** Bugs: agent turn
    "Invalid format string" on Windows (**fixed** 180e522); chat citation
    renumbered to 1 on reload while its peek shows source 8; scroll jumps in
    chat with a sources fold open; layout flickers between two states every
    second in devtools responsive mode; top bar not centred at small widths;
    lightbox meatball menu does nothing; OCR workspace not reachable from
    Images; '?' popover in Capture does not scroll with a touchpad; tools
    list draws a second divider over column two's first row; Privacy's
    Since launch / All time pill has no active state; capture preview
    crushes line numbers; Atlas spills out of its ring in the tour.
    Phone and tablet: graph controls overlap, Documents editor cut off,
    whiteboard will not pan by touch, lightbox, skill logs sidebar (gap,
    shadow, no hover-expand), gap under the bottom bar, the agent-runs bar
    on phones, Contents dates overflow, a portrait-shaped graph. Asks:
    links widget and a rename of Library's Links; notice banners carry
    their action with a confirm; settings section heads; the agent popup's
    avatar circles; guide: AI/system answer toggle, much more help, cleaner
    formatting; model per feature offers "same as chat/utility model";
    note forms use the live view with a source toggle, no Preview; AI
    templates (generate, edit, regenerate) and every template in Settings;
    Windows tray menu extended; constellation in the background art and a
    better constellation; graph node size by a toggle, Arc fit, Tree
    centred; companion: perches on every tab, dodges popups, less
    distracting, lifelike motion and transitions, a show/hide hotkey and
    palette action (done: Ctrl+Shift+Y, rebindable, palette and Find
    anything rows that say Hide or Show, PR 162); Atlas less chunky, masculine limbs, tilted rings with
    orbiting bodies, a taller nebula; generated faces vary expression per
    character. Questions: prompt injection, chat header divider. Rules:
    two or three agents, Sonnet where quality holds, concise.
    **Added 2026-09-27 midday (the owner, verbatim):** "also can you extend
    this menu a bit maybe with sub-sections if necessary, for things such as
    a quick link to the profile/personas/appearences tab, toggling various
    features such as masculine/feminine, which companion is displayed etc."
    (the companion's right-click menu). Its screenshot also shows that menu
    opening at the window's top left with the companion at the bottom right:
    recheck on the current head after a0d957a. Decided the same day: desktop
    first with small laptops (1366x768 at 125%, 1280x720) and tablets next;
    Links is renamed Bookmarks; the two map kinds are named separately;
    releases stay on 0.3.3 for now.
    **Added (the owner):** tab changes: the companion lingers on the old tab
    a moment then pops in elsewhere. Wanted: it stays behind on quick tab
    flicks and only follows after the person settles on a tab; it enters
    smoothly (walks on from the side, climbs up from the bottom bar, climbs
    down from the top bar, or materialises), never a sudden pop; a "reduce
    actions" setting so waves and gestures come less often; more stances,
    Atlas's masculine and feminine each with their own.

## Placed from INBOX, 2026-10-04 (design work for the next Opus slots)

Moved whole from INBOX to keep the tray under twenty; each is a brief for
the next free Opus agent, in this order: 485 (the Attach panel, bug guard
already in), 496 (Contents and the slow Boards and maps load), 493 (the
graph's look), 484 (the leader menu), 486 (callouts), 490 (follow-up
breadcrumbs).

507. **From the dock audit (479, `scratchpad/dock-audit-479.md`), found and
     not fixed.** Graph: fold the View menu into the gear (two ways in).
     Boards and maps: one "New" with board and mind map inside (8 controls
     today). Zoom controls: one orientation and order on Graph, board and
     map. Help '?' on the Library's All, Documents and Bookmarks sub-tabs.
     Reminders: one "Add" per card. The documents dock onto the shared dock
     recipe (DOCUMENTS_PLAN). Sonnet-sized except the zoom unification.
