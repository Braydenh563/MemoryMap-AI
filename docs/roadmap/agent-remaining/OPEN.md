# OPEN: everything still open from the agent files, in one place

## What is left after PR 144, in the order to build it (written 2026-09-14)

The owner's brief for the next session is one line: "here's what's left,
read the handover and OPEN.md, please finish and build all of these". This
section is the "these". Each row points at where the detail lives; the
bullets further down this file and the plan sections hold the file, id,
measurements and next step. Work top to bottom: bugs the owner reported,
then the plan tails by surface, then the horizon.

**A. The owner's open reports (INBOX numbers; the entries are in INBOX.md)**

| # | What is left | Where |
| --- | --- | --- |
| ~~238~~ | **Done 2026-09-19** (5a9c909, 128a731, 7e8d902). All three parts, with measurements in INBOX 238: the card clips its own text (`min-height: 0` plus `overflow: hidden` on `.wb-card-content`, and the "Show more" decided by the box rather than by a character count); the expanded set is in `localStorage`; and the export's line budget comes from the card's measured height (7 lines collapsed, 22 expanded, both were 6) with a `--warn` line in the dialog naming how many notes are collapsed. | done |
| 246 | Attach a board or map to a note from the note's connect menu (a `WhiteboardObject` of kind note with `data.ref_id`), the Connections dialog reading both the legacy `WhiteboardNode` table and current note objects, boards and maps told apart, and a "referenced by" chip row on the note card from one batched counts endpoint. | this file's Notes section; routes_entries.py `entry_connections` |
| ~~232~~ | **Mostly already built; measure before building any of it.** Checked on the branch head 2026-09-19 (`scratchpad` sweep, one document holding all of them): tables render as 6 `.cm-md-td` cells with **0 pipes on screen**, callouts as 2 `.cm-md-callout` lines with a label and **0 `[!note]` markers**, task lists as 2 real `<input type="checkbox">` with **0 `- [ ]` brackets**, and an image as a drawn `.cm-md-image` with **0 `![...]` syntax**; strikethrough, highlight, footnotes and maths all carry their marks too. The two things that were genuinely wrong are fixed: the code fence's empty rows (706e2af) and the chips that broke in half when they wrapped (2b94271). This row was stale, and rebuilding from it would have been the fourth time this project rebuilt something that existed. | done, except anything the owner names next |
| 253 | One-click recovery: a launcher that repairs a start that fails (venv, dependencies, migrations) without a prompt, and a Repair shortcut beside the app; gated by a deliberately broken venv coming back. | WORLD_CLASS_PLAN H6 |
| 225 | The frontend copy sweep: every place the app still speaks as "the AI", "the assistant" or "the guide" where it means Atlas. | INBOX 225's second half |
| 226 | A flicker above the bottom bar on the dashboard, never reproduced here; needs the owner's theme, art setting and zoom. | INBOX 226 |
| 213, 220, 228 | Documentation leftovers recorded in their entries. | INBOX |

**B. Plan tails, by surface**

| Plan | Still open |
| --- | --- |
| DOCUMENTS_PLAN | Phase 3 item 4's Library filter by frontmatter property; Phase 4 items 3 to 5 (outline drag-to-reorder with breadcrumbs, the editor command palette and shortcut sheet from one table, daily notes and the templates gallery); Phase 5 items 2 to 4 (version history UI with diff and restore, AI edit with a per-hunk diff preview and findings rendered as findings, focus and typewriter modes with reading typography and a print stylesheet); Phase 6 and Phase 8 tails in this file's Documents section. |
| UI_MODERNISATION_PLAN | Phase 8's three docks still over the seven-control ceiling; Phase 11 items 1 to 9, the phone done properly. |
| GRAPH_PLAN | Phase 5 (positions saved on views, the `?since=` cursor); Phase 6's node panel redesign; the local pane's Show switches; 6b the minimap. |
| WHITEBOARD_PLAN | Decision 7's other half; the phone context bar comparison; sketch handles at zoom; the arrange panel items. |
| MINDMAP_PLAN | The mapux agent's leftover list (this file's Mind map section). |
| CHAT_PLAN | Phase 1's other half, which note grounds a sentence (blocked on Brief 12's eval fixtures); Phase 4's harness items. |
| TIMELINE_PLAN | Section 7's two measurements. |
| AGENT_SKILLS_REFORM | Phase D verified against a real model, which needs WORLD_CLASS_PLAN section 9's dev-only runner first. |

**C. The horizon (WORLD_CLASS_PLAN, one item per PR, in its own stated order)**

H7 the speed budget, H9's perf gate and usage ledger, H1 the night shift,
H2 evidence cards and open questions, H3 the model bench, H6 professional
use (imports, print and PDF, keyboard-complete, WCAG audit, multi-window,
first-run tour; 253 is its first row), H4 the API contract and extensions,
H8 time travel and the margin reader, H5 sync. Behind them the backend
moves B2's second half, B4, B6 to B8 and the inventions I1 to I3 and I5 to
I8, each with its spec test named in the plan.

**Done-when for the next session:** sections A and B empty, each Built
block moved to HISTORY, the CHANGELOG carrying the numbers, CI green, and a
PR opened per the standing orders. Section C is one item per PR after that.


One bullet per open item, consolidated 2026-09-14 from the 38 finished agent
files now in [`../archive/agent-remaining/`](../archive/agent-remaining/)
(INBOX 220). Each bullet names the file, the id or selector, and the next
step; the source file is in brackets so the full account, with its
measurements, is one `grep` away. Items an archived file recorded as open and
a later file, the branch head or a live `grep` shows as done were dropped
rather than carried, and the drop is noted where it matters. The files still
being written by running agents stay beside this one.

## Documents

- **DOCUMENTS_PLAN Phase 3 item 4's second clause, "searchable from the
  Library's filter".** The frontmatter is parsed and the fields are editable;
  nothing filters documents on a property. File `frontend/library.js`. Next
  step, recorded so it is not re-derived: a client-side filter over the
  documents list, because the list is already loaded whole.
  [documents-phase4.md]
- **DOCUMENTS_PLAN Phase 4, the connected document: not started.** Next step:
  take the plan's items in order and record file, id and next step per item at
  the first stopping point. [documents-phase4.md]
- **`revalidateSelection` reads the stale fallback.** `frontend/app.js`, line
  17697 on the branch head: it resolves the surface with
  `document.getElementById` and requires an `HTMLTextAreaElement`, so a
  selection sent to the chat from a document is re-checked against the wrong
  string and reports `gone` or `unknown` while the passage is on screen. Next
  step: `docSurfaceById(context.surfaceId)` and `surface.text`, three lines.
  [documents-engine.md]
- **The "is the user typing?" guard does not know `contenteditable`.**
  `frontend/app.js` around line 33916 tests
  `["INPUT", "TEXTAREA", "SELECT"].includes(document.activeElement.tagName)`.
  The documents editor guards its own host (`docGuardGlobalShortcuts`); the
  shared guard is still wrong and the next contenteditable will meet it. Next
  step: `|| document.activeElement?.isContentEditable`, which the chorded
  branch twenty lines above already checks. [documents-engine.md]
- **The document surface's aliases have no lint.** A call site that hands the
  surface to something expecting a DOM element reads as correct and fails at
  runtime (`autoGrow` wrote `style.height` on it and every "/" command in the
  capture box threw). Next step: fail on `autoGrow(`, `mountGutterFor(`,
  `syncDocGutterMetrics(` or `watchDocGutter(` called with an identifier the
  same function received as a surface. [documents-engine.md]
- **Phase 8c's two halves are in files the documents agent does not own.** The
  board's note card is `frontend/whiteboard.js`'s canvas text field; the skill
  editor's steps box is one row in `editor.js`'s `EDITOR_SURFACES`. The
  factory both need is built: `noteSurface(host, options)` and the
  `NOTE_SURFACES` table in `documents.js`, one row per box, plus one line in
  `tests/test_note_surface.py`'s list if it is not note text.
  [documents-phases.md]
- **The table cell menu is a `kebabMenu` with ten items and no grouping.**
  Rows, columns and alignment read as one list of ten. `kebabMenu` has no
  separator, so this is a change to the shared recipe and to DESIGN.md rather
  than a phase item. [documents-phase4.md]
- **Atomic ranges, the `Mod+click` affordance and the toolbar's own state**
  are the three things DOCUMENTS_PLAN lists for the engine phase that were
  deliberately not built: a hidden marker can be walked into with the arrow
  keys (`EditorView.atomicRanges` over the replace decorations is the usual
  answer), nothing says `Mod+click` opens a link chip beyond the tooltip, and
  which buttons are "on" for the caret is not driven from the syntax tree,
  which the tree now makes cheap. [documents-engine.md]
- **The documents editor toolbar (`.doc-toolbar`) is the one surface in the
  consistency sweep's item 3 still off the recipe.** It has the bar surface;
  only its controls are open. Next step: apply the `.dock > * > button.ghost`
  half scoped to `.doc-toolbar` and re-measure fills, radii and heights the
  way `scratchpad/ui-sweeps/heads2.js` does. [consistency.md]
- **Outline rows are 24 to 25.2px, under the app's own 28px floor.**
  `frontend/css/05-sidebars-themes.css`, `.outline-link`
  (`padding: 0.15rem 0.25rem` plus a 0.85rem line) against DESIGN.md's
  `--target-min: 1.75rem`. Left deliberately: 24px is WCAG 2.2 AA's own floor
  and raising it costs three headings of visible outline. Next step: a
  density-aware rule (compact keeps 24, comfortable and spacious take 28) or a
  touch layout for the sidebar, which is UI Phase 9's territory.
  [doc-sidebar.md]
- **The outline is headings only, and it does not fold.** No folding (a
  120-heading document wants collapsible h2s with the state kept per document)
  and no filter box (Obsidian's outline has one, and past two screens of
  headings it is how you use it at all). Belongs in DOCUMENTS_PLAN.
  [doc-sidebar.md]
- **The scroll-spy follows the viewport, not the caret.**
  `frontend/documents.js`, `docVisibleTopLine`: typing in a section below the
  one at the top of the view marks the wrong heading until the view scrolls.
  Next step: listen to selection changes as well (`docSurface().onChange`
  fires on edits, not arrow keys) and decide which wins when they disagree.
  Measured cost of the current shape: one hit test per animation frame while
  scrolling. [doc-sidebar.md]
- **The rest of the app's viewport popups have not been measured with the
  background art on.** `kebabMenu` (`wireEscapedActionMenu`) and the toolbar
  dropdowns (`clampToolbarMenu`) are covered; the chat dock's popovers, the
  selection popup, the whiteboard's context menu and `.wb-board-menu`
  (`escapeAndCapMenu`) are not. Next step: a sweep that sets
  `data-bg-art="on"`, opens each in turn and asserts the two things
  `spellwide.js` asserts, the parent and the trap. [editor-intelligence.md]
- **`clampToolbarMenu`'s comment says the trigger cannot be reproduced here,
  and that is now out of date.** With `data-bg-art="on"` the card reports
  `blur(14px) saturate(1.5) brightness(1.02)` in this Chromium and the trap
  fires. Worth correcting so the next reader tests the real path rather than
  the `filter: saturate(1)` stand-in. [editor-intelligence.md]
- **The word menu measures its own width before it is placed.** A
  `position: fixed` box with `left` set and no `right` is shrink-to-fit, so a
  menu with long candidates opened near the right of a narrow card can render
  narrower than the width the placement was computed from. Not observed (every
  case measured sat at the 15rem minimum). Next step if a report arrives:
  measure at `left: 8px` first, then place. [editor-intelligence.md]
- **A finding below the editor's visible box gets a menu drawn over its own
  word.** Measured in `spellwide2.js`'s table-cell case: the word sits at
  `655..707` in an editor whose visible box ends at `572`, and the menu is
  placed at `440..717`. The sweep reads that as a 0px gap and passes. Two
  things to decide: why `docRevealForSuggest` did not bring that word in (a
  table cell's mark may measure outside the scroller the reveal scrolls), and
  that a placement must never cover the rect it is anchored to, which is worth
  an assertion of its own in both sweeps. [editor-intelligence.md]
- **The writing-suggestion underline is the only surface with no hover
  affordance.** `cursor: pointer` is the whole of it. Files:
  `frontend/documents.js`, `docCmTheme`, the `.cm-finding` block around line
  10924; the `[data-contrast="on"]` branch needs it too. Next step: add the
  hover tint in the kind's own colour and measure it in both themes with
  `prosepanel.js`'s painted-pixel pass. [prose-intelligence.md]
- **`docFindingAtPoint` walks every mark on every pointer event** that lands
  in the editor (`click`, `dblclick`, `contextmenu`), calling
  `getClientRects()` per mark. Bounded by the viewport's marks, so not slow,
  but not measured at all. Next step: time it on the plan's 20k-word document
  with 200 findings on screen; past a millisecond, cache the rects per repaint
  (the findings effect is the invalidation point). [prose-intelligence.md]
- **The writing panel's answers are not reachable by keyboard from the row.**
  Enter opens the row, focus stays on the control, the candidates are a Tab
  away with nothing saying so. Next step: move focus to the first candidate
  when a row opens by keyboard only (a pointer press must not steal it) and
  return it to the row on collapse. [prose-intelligence.md]
- **The three finding kinds are named in two places**, `DOC_FINDING_GROUPS`
  (the panel's group titles) and `docFindingKind` (the dot and the underline).
  They agree today; a fourth kind has to be added to both.
  [prose-intelligence.md]
- **python-docx has no row in `core/extras.py`**, so the Word export's 501
  names the package instead of pointing at a button in Settings, optional
  extras. One `Extra(...)` entry. [documents-phases.md]

## Graph

- **The options panel scrolls again at 1440x900: 587px of list in a 484px
  cap.** Batch C closed this at 418 against 418 and the sections added since
  reopened it. Measured per section with `graph2.js` plus a probe: Physics
  106, Show 143, Time 83, Groups 121, Minimap 95, Links 39. Not fixed because
  which section gives way is a design call; the recommendation on record is
  that Groups and Minimap each become one collapsed `details`, the way the
  Time section's read-out already hides until it is wanted. [graph.md]
- **`/graph/local` has no Show switches**, so focus mode and the local pane
  still walk boards as notes. GRAPH_PLAN's "Decision made, 2026-09-13" says
  why that was left. [graph.md]
- **GRAPH_PLAN Phase 5** (the backend fields, positions on views, the
  `?since=` cursor) is recorded as untouched. Phase 4 landed on 2026-09-13, so
  read the plan's own state before starting. [graph.md]
- **The node popup redesign the owner names** ("I dont think you have
  redesigned the popup agent yet") is GRAPH_PLAN Phase 6 and the three rows
  under "Placed from INBOX, 2026-09-09", which hold the node panel. The agent
  popup is a different surface. [graph.md]
- **`graph.js`'s step 5 still fails**: "clear trace (a route was drawn:
  false): NO CHANGE", seen while re-measuring the drag-fps gate, which now
  passes at 58.9 fps. For the graph agent. [ui-phase-11.md]
- **`scratchpad/ui-sweeps/selectfocus.js` fails twice on a notebook with
  content**, and it is not new work: `graph/graph-view-picker`, "its opener
  cannot take focus" and "focusSelect landed on SELECT.ghost, not on its
  opener". Measured both ways: the branch passes on an empty data dir and
  fails on a used one, and the base checkout fails identically on that same
  data dir. Something about the view picker on a populated notebook leaves its
  opener unfocusable. [library-blockers.md]
- **The graph node panel is reachable while the graph is in fullscreen**, and
  INBOX 66 says the lightbox it can open is not. Same phase, not in that
  agent's brief. [visual-c.md]

## Chat and popup agent

- **CHAT_PLAN Phase 1: which note grounds a sentence.** `grounding.best_passage`
  chooses where inside a note with BM25, and the renderer is built; decision 2
  also asks which note, at "a threshold calibrated on the eval fixtures (Brief
  12)", and those fixtures do not exist. Next steps in order: the ten-question
  fixture set, then the threshold. Changing what counts as supported without
  them would be a judgement dressed as a measurement.
  [chat-timeline-skills.md, chat-popup-agent.md]
- **Ask's answer object was measured on the offline branch only.** The sweep
  runs against a server with no model, so `sentences` was empty in every
  measurement and the grounding chips and inline marks under an Ask answer
  were not re-measured. Next step: anyone with a local model runs
  `chatphase3.js` again and adds a line for the sentence count and the mark
  count. [chat-timeline-skills.md]
- **`chatSourcesPanel` is shared, the renderer is not.** Judged not worth it
  in 2026-09-13: the three surfaces have genuinely different frames around the
  same three shared components. Next step if a fourth surface appears: move
  the Chat bubble's foot onto `renderAskAnswerFoot` (renamed) and delete the
  palette's own `cmdPaletteResultRow`. [chat-timeline-skills.md]
- **SKILLS Phase D: no model ran any of it.** The fake transport answers every
  step, so "a rewritten step fixes a run a 3B model stalled on" is the claim
  the mechanism is for and not one the tests make. The chat control (Edit step
  N, beside Resume) is asserted statically against `app.js` because reaching
  it needs a run that stops, which needs a model. [chat-timeline-skills.md]
- **The `evals` marker and its fixture set (Brief 13's done-when).** At least
  80% of the built-in skills complete with zero invalid tool calls under
  small-model mode, and a loose-ends fixture of 70 notes with eight planted
  loose ends, all eight found. Deliberately not built against the fake
  transport: a fake calls whatever its script says. File: a new
  `tests/test_skill_evals.py`, marker `evals` registered in `pyproject.toml`
  and the module skipped unless the dev model is reachable. Next step:
  WORLD_CLASS_PLAN 9's runner first. [brief-13-harness.md]
- **Nothing in the app reads a skill's `verify` block except
  `skills.normalise`.** The saved-skill editor and `save_skill` round-trip it,
  neither offers a control. Files: `frontend/index.html` (the skill editor),
  `frontend/app.js` (`renderSkillEditor`),
  `src/memorymap/ai/tools/__init__.py` (`save_skill`'s schema). Next step: one
  row in the editor, tool select plus predicate select plus a number, and the
  same three fields on the schema. [brief-13-harness.md]
- **Two built-ins still have no `verify` block that they could have.** "Audit
  link reasons" declares only `audit_link_reasons`, "Find where I disagreed
  with myself" only `find_contradictions` and `link_notes`, so neither can
  verify with `count_notes` without widening its allowlist; the write skills
  want a shape `count_notes` cannot express ("Auto-tag my notes" wants
  `count_notes(untagged) max 0`). Files: `src/memorymap/ai/skills.py`,
  `_AUDIT_SKILLS`; `src/memorymap/ai/tools/__init__.py`, `_count_notes`. Next
  step: give `count_notes` the filters `list_notes` already takes.
  [brief-13-harness.md]
- **The page cap and a large notebook.** `MAX_PAGES_PER_STEP` is 6 and
  `MAX_LIST_LIMIT` is 25, so one step sees at most 150 notes and "Find loose
  ends" over a thousand notes reports seeing a sixth of them. Raising the cap
  trades one wrong answer for another. Next step: decide it in CHAT_PLAN
  rather than in the constant; the right answer is probably a filtered read.
  [brief-13-harness.md]
- **The agent panel does not close on Escape.** Every other floating surface
  does. Not added because it is a behaviour change on a non-modal panel that
  never takes focus, and Escape is already crowded. [visual-c.md]
- **`.monitor-runs` overflows its 200px cap by 4px with three runs.** Rows are
  60px plus an 8px gap plus 8px of padding. The cap is a recorded decision
  ("the same max-height as the log it replaces"), so it was left; a fourth run
  scrolls either way. [visual-c.md]
- **The follow-up chips were stubbed at the route in the sweep**, because
  `/chat/followups` answers `[]` with no model. What is measured is the
  request a chip causes, not the model's choice of question. Worth knowing
  before reading the sweep as proof of the whole feature.
  [chat-timeline-skills.md]

## Whiteboard and mind map

- **Decision 7's other half: the quick-sketch pad still has its own copy of
  the tool code.** The pad is a `<canvas>` in `frontend/app.js`
  (`SKETCH_HIGHLIGHTER_ALPHA` 27284, `SKETCH_HIGHLIGHTER_COMPOSITE` and
  `SKETCH_HIGHLIGHTER_LINE_JOIN` 27301,
  `SKETCH_HIGHLIGHTER_WIDTH_MULTIPLIER` 27309); the whiteboard is SVG paths in
  `frontend/whiteboard.js`. They are two rendering models apart, and the two
  are at different values (the whiteboard is 0.4 and multiplies, the pad is
  0.35 and does not). Next step: decide whether the pad becomes an SVG surface
  or stays a canvas with one shared table of what the highlighter is. A design
  call, so it wants a line in the plan first. [whiteboard-phases.md]
- **Multiply is worth 3 luminance units on a dark board and 20 on a light
  one.** Measured with `scratchpad/pngpixel.py` on two crossing strokes: light
  252.9 bare, 229.6 one stroke, 211.5 both; dark 26.4, 23.6, 22.0. Decision 7
  says multiply and is not remade. Recommendation for whoever takes it:
  `screen` in dark and `multiply` in light. One wrinkle to design around: the
  blend is an inline style because the export clones these nodes into a
  standalone SVG, so a theme-switched value has to be re-applied on a theme
  change. [whiteboard-phases.md]
- **A sketch's handles scale with the zoom; a card's do not.** 10x10 on every
  kind at zoom 1; a sketch's are SVG rects of 10 board units inside
  `#wb-zoom-group`, so 20px at 2x and 5px at 0.5x. Next step: either draw them
  at `10 / transform.k` and re-render on zoom (`wbRenderSketchHandles` is not
  called from the zoom frame today, and the pan path is deliberately kept free
  of work) or move them into screen coordinates (the drag maths assume board
  units). Measure the zoom frame before choosing. [whiteboard-phases.md]
- **The context bar at phone width, and the plan's half-answered question.**
  WHITEBOARD_PLAN section 7 asks whether it should pin to the top of the
  canvas at 390. Floating is measured at 390x844 in a 364x604 canvas: 269x54
  for an image, 348x112 for a line, 348x160 for a shape or text box, 348x208
  for an arrow, always inside the canvas and clear of the selection. Pinning is
  not measured because nothing pins. Next step: a `data-wb-anchor="top"`
  branch in `wbUpdateSelectionBar` against those five numbers.
  [whiteboard-phases.md]
- **`#wb-topbar` is 13 controls at 1440** against the dock grammar's ceiling of
  seven. Out of scope for Phases 1 to 4 (the plan's section 3 says the top bar
  is the dock grammar unchanged); it is the same counting question INBOX 47
  raises for Notes and Library. Owner: UI_MODERNISATION_PLAN Phase 8.
  [whiteboard-phases.md]
- **The old export popover's CSS still names it in grouped selectors.**
  `.wb-export-menu` builds nothing any more, but the name is in
  `08-consistency.css` lines 81, 132, 166, 183, 194, 302, 321, 334, 340, 1157
  and once in the `[data-glass="off"]` list in `03-dashboard-widgets.css`. A
  one-line-per-site sweep with no behaviour behind it, left because those
  files were being edited by another agent. [whiteboard-phases.md]
- **The View menu is 714px of content on a map.** Under about a 730px-tall
  window it still scrolls, which is correct and may still read as the report.
  If it comes back the fix is the menu's own length (four groups, sixteen
  rows), not its placement, which is measured and right from 500 to 1000px
  tall. [visual-c.md]
- **The whiteboard's own View menu (`.wb-board-menu`) was never reproduced as
  broken.** It has its own max-height-on-open logic (`whiteboard.js`, the
  `wb-board-menu-wrap` toggle listener), unrelated to the `details.dock-menu`
  family INBOX 31's fix targeted. Worth a Chromium check in its own right if
  it is still reported. [batch-a.md]
- **INBOX 12's remainder, owner WHITEBOARD_PLAN**: the export-selection
  popover's placement, the missing align-centre and distribute-gaps on the
  arrange panel, and that panel's buttons' icon and text overlap. Unstarted.
  [inbox.md]
- **A colour swatch is 1rem and never grows for a finger.** `.sketch-color` is
  a fixed size at every width, so on a phone the seven ink dots are 16px
  targets in a bar whose buttons step up to 44. `touch.js` does not look at
  this dialog, which is why it has never been reported. Next step: a step on
  the swatch under 820px and a re-measure of the bar at that width, where it
  already wraps into two rows on Large text. [popup-redesigns.md]

## Timeline

- **WORLD_CLASS D6, the daily journal: the backend is built, the frontend is
  not.** `POST /entries/daily/{date}` creates or returns and
  `GET /entries/daily?through=&days=` gives the calendar strip its days and
  the streak (`tests/test_daily_journal.py`). Next step, all frontend:
  `startTodaysNote` in `frontend/app.js` calls POST `/entries/daily/${key}`
  instead of posting to `/entries`, which fixes the duplicate it makes today;
  then `Ctrl+D`, then the strip and the yesterday and tomorrow pair.
  [chat-timeline-skills.md]
- **The strip's threshold is a floor found on a fixture.** It hides under 200
  notes in range, chosen by measuring the 48-note seed (forty slots, each one
  note tall, saying nothing the headers do not). TIMELINE_PLAN section 7 asks
  for it to be tuned on a real notebook. [timeline-phases.md]
- **The table at 820 has never been looked at.** `timelinetable.js` measures
  1440 and 390 only; the wide columns hide below 600px, so 820 shows all
  eight, and nobody has judged whether eight columns at 820 are readable or
  merely present. [timeline-phases.md]
- **The band label sits over the cards scrolled under it.** Visible in
  `docs/screenshots/timeline.png`: the sticky left column ("Uncategorised 12")
  is translucent, so the cards of the columns scrolled behind it show through
  as ghost text. Check it at a scrolled position, not at `scrollLeft` 0 where
  it cannot be seen. [picker-catalog-readme.md]
- Timeline Phases 1 to 4 are built (`scratchpad/ui-sweeps/timelinekinds.js`
  exists and the Built blocks are in HISTORY.md), so `timeline.md`'s and
  `timeline-phases.md`'s own step lists were not carried.

## Library

- **The six descriptions start at six different heights** (1440, six seeded
  cards: the picture runs 144 to 249.9px so the text under it starts wherever
  the picture ends). The accepted cost of equal card heights with optional
  rows, written into the plan's decision. If the owner reads the row as
  ragged, the two other places to put the difference are a hole under the
  short cards or reserved empty rows, both already reported. [image-cards.md]
- **The fold chip is 128.8px of a 156.3px content column at 1440** (82%), so
  on the narrowest tile it still reads as nearly a bar; at the owner's own
  card width, about 330px, it is 39%. The label is the only place left to cut
  and "Text in this image" is the shortest true thing it can say.
  [image-cards.md]
- **The Files sub-tab rows were never on screen.** They share
  `library-image-*` classes and take the unchanged full-width fold by design,
  and `.library-image-caption` moved from `--text-sm` to `--text-md` for the
  cards, which grew a Files row's description by 5.1px as arithmetic, not as a
  measurement: this sandbox's seeded media are all images. Next step: seed a
  PDF through `/media/upload` and run `imagecardfoot.js` against the Files
  sub-tab. [image-cards.md, logs-cards-links.md]
- **Two pictures in a gallery row are still different sizes when one card has
  nothing to say.** UI_MODERNISATION_PLAN's decision block records why a
  subgrid was rejected (it equalises everything and puts 75px of hole under
  the shortest card). The remaining variance is cards with no caption and no
  facts, which take a taller photograph instead of a hole.
  [logs-cards-links.md]
- **A tile's Rename and Delete buttons are never in the DOM.** They are
  detached `<button>` objects the kebab's rows `.click()`
  (`renderLibraryImagesGallery`, `library.js`). Deliberate and working, but it
  is a behaviour question: either the buttons belong in the row with the menu
  as the overflow, or they stay detached and that is written down. The dead
  glass-off rules that used to name them are already gone. [visual-c.md,
  image-cards.md]
- **A caption for an image that has none.** The attach picker's second line
  falls back to the note the picture is used in, then to "No caption yet"; the
  Library can write one (`POST /media/{id}/caption`). An "Ask the model for
  one" action on that line is the obvious next step and was not built because
  it puts a model call behind a row in a picker, which is a decision. File:
  `frontend/app.js`, the `caption` entry of the images shape.
  [picker-catalog-readme.md]
- **The other four picker sources have no thumbnail.** Documents, files and
  maps all have something to show (a first page, a file glyph, `mapPreview`
  already draws a map for the boards gallery). The renderer is ready:
  `shape.thumb` is optional and per source. File: `frontend/app.js`,
  `notePickerShape`. [picker-catalog-readme.md]
- **The Notes (10) and Library (9) docks are still over the seven-control
  ceiling.** The graph's move to six was decided for the graph specifically;
  INBOX 47 records that nothing was decided for these two and that guessing is
  a design call. [graph.md]

## Notes and capture

- **The Notes categories sidebar overflows at 390px**, on every sub-tab
  including Browse: `errors.js` reports
  `aside#sidebar.card.sidebar-panel 976>706` five times, once per sub-tab
  page. Pre-existing. The fix belongs with the phone pass
  (UI_MODERNISATION_PLAN Phase 9 and 11): the category list needs its own
  scroll or a collapse at that width. [notes-subtabs.md]
- **`textarea.autogrow`'s `min-height: 2.75rem` is still shared** between the
  capture box and the Reminders "Magic add" row. It does no harm now (the
  capture box has its own 11rem floor and Reminders measures 44px across both
  rows), but the sharing is what made the capture box 89px for a while, and
  DESIGN.md's control-height section still describes that row as 44px against
  a 42px button, which is out of date: both are 44. [notes-subtabs.md]
- **The note edit form's strip is a clone taken at open time**, so anything
  stateful in the capture strip is cloned with its state. The Preview button
  was fixed; the collapse and expand state and the highlight colour pickers
  have not been checked for the same shape. [notes-subtabs.md]
- **INBOX 38's bulk-move action is still to build.** The chip and label are
  the visibility fix that lets a person tell which space a survivor is in;
  moving a batch of them is the item's own D2 owner line. [batch-a.md]
- **Boards and maps on a note, and what a note is referenced by (INBOX 246,
  still open).** The owner: "I also want to be able to attach whiteboards and
  mindmaps to notes. and I want it to show in notes if they are attached to or
  referenced in/by a document, note, whiteboard, or mindmap." What exists,
  checked: `GET /entries/{id}/connections` (routes_entries.py, around 1935)
  returns outgoing, incoming, documents, boards and files, and the note card's
  kebab has a Connections item (app.js, around 4698; `openConnections` around
  3969). Three gaps. (1) That route's boards group reads the legacy
  `WhiteboardNode` table only, while a current board embeds a note as a
  `WhiteboardObject` of kind "note" carrying `data.ref_id` (routes_graph.py
  around 370 shows the read) and a mind map is a board of type "map"
  (routes_whiteboard.py around 2148): both go in, labelled board or map.
  (2) There is no way from a note to put it on a board: a connect-menu item
  "Put on a board or map" beside "Add to a document" (app.js around 4760), with
  an inline picker of boards that POSTs `/whiteboard/objects` with kind note,
  `data.ref_id` and a free position. (3) A card shows nothing until Connections
  is opened: one muted chip row on it ("In 2 documents · on 1 board · linked by
  3 notes") from a batched counts endpoint called once per render (`ids=`),
  opening Connections on click. Tests first for the endpoint and the counts, a
  Playwright measurement that the chip renders. [notes.md]

## App wide: shell, phone and the shared recipes

- **A filled button is 2px shorter than every tonal button beside it, app
  wide.** `button` carries `border: none` (01-forms-settings.css) and `.ghost`
  a 1px edge, so a filled control measures 40px in a row of 42px ones. The
  one-line fix is `border: 1px solid transparent` on the base `button`, and it
  moves every filled button in the app, so it needs its own measurement pass
  (docks pin their heights and would not move; the chat composer, the note
  toolbars and the dashboard widgets would). [popup-redesigns.md,
  logs-cards-links.md]
- **`.segmented-control` is only conformed where it was reported.** INBOX
  192's fix is scoped to `#doc-ai-verb` in `09-editor.css`; the base rule is
  in `03-dashboard-widgets.css`. Measured: `#graph-layout` still has an 11.2px
  track and a 6px segment where `.seg` is 15.4px. One rule moved into the base
  file finishes it, and DESIGN.md already says it should be.
  [documents-phases.md]
- **`#doc-ai-verb` and `#graph-layout` still differ in segment radius** (6px
  against 4.2px) because `--radius-inner` resolves differently under the graph
  toolbar. Small, and not chased. [visual-c.md]
- **`--field-inset` and the segmented track are one tone in light and two in
  dark.** Light has both at `rgba(31, 36, 48, 0.07)`; dark has
  `rgba(0, 0, 0, 0.28)` and `rgba(255, 255, 255, 0.08)`. Light flattens a
  distinction dark makes. Belongs to whoever owns the token file.
  [consistency.md, docks.md]
- **`--radius-inner` has four users.** DESIGN.md rule 3 and INBOX 101 declared
  the token and the sketch pad's toolbar, canvas and foot plus the meeting
  stage are the first to reach for it; every other surface inside a `.card`
  still draws `--radius-lg`, which is the concentric rule half applied.
  [popup-redesigns.md]
- **The meeting dialog's head row holds two heights**, a 28px `.ghost.small`
  Close beside the 32px `.graph-help-toggle`. Both are app-wide recipes, so
  this is a question about the two recipes rather than about the dialog.
  [popup-redesigns.md]
- **An empty line in a small panel has no recipe.** The agent panel uses
  `<p class="muted">` where the index names `.empty-state`, whose 2rem padding
  and centred block would be wrong in a 384px glance panel. Worth a recipe row
  rather than a conversion. [visual-c.md]
- **The dark shadow sliders saturate earlier than the light ones.** The dark
  alphas are 7 to 11 times the light ones at the same setting, so the ambient
  layer reaches opaque around 14% of a 0 to 50% slider; light's
  `--shadow-lg` clamps at 33%, so both clamp and the structure matches.
  Spreading either across its full range is a separate decision about what the
  slider means. [visual-c.md]
- **`.sidebar-head` is off the dock grammar, deliberately.** It carries
  `min-height: var(--sidebar-toggle-size)`, a negative `margin-top` that meets
  the absolutely positioned collapse toggle, and `padding-right` reserving
  that toggle's lane; two of the three exist because of reports. If a future
  session wants them on the grammar the only safe route is all three at once
  (`frontend/index.html`: `#chat-sidebar` ~1134, `#sidebar` ~523, the
  documents sidebar ~2172; `frontend/css/05-sidebars-themes.css` line 17),
  with `.dock` gaining the three properties behind a `.dock.is-sidebar`
  modifier and `heads.js` run before and after. [docks.md]
- **Phase 11 item 1's last bullet: the top bar's own reduction at 320.** The
  title, the AI dot and one action. Never measured at 320 with the wordmark,
  the space switcher and the two control clusters in it; nothing at 320 is
  broken. Files: `frontend/css/10-responsive.css` band 4,
  `frontend/index.html` `#top-bar`. Next step: measure the header's content
  width at 320 before deciding what leaves. [ui-phase-11.md]
- **Phase 11 item 9's other half**: no hover-only affordance (every hover
  state needs a tap equivalent) and long-press replacing right-click app wide.
  The 44px half is built and gated; neither of these is measured anywhere and
  neither has a sweep. [ui-phase-11.md]
- **Phase 11 items 2 to 8, the per-surface shapes.** Measured with `phone.js`:
  none is broken (every tab is one column, has no control under 44px and does
  not scroll sideways at 390x844 or 430x932, both themes). What is not built
  is the shape each item describes: Capture as a full-height sheet, Documents'
  read view by default, Whiteboard view-and-light-edit, Settings as a page
  list. Each is a design step for its surface's owner. [ui-phase-11.md]
- **Band 3 (600 to 820): the header is two rows, 128px at 819.** The band's
  recorded design (the strip cannot fit beside the wordmark at any width in
  the band, and the wordmark is what was reported twice when it was hidden),
  so it is known rather than open. [ui-phase-11.md]
- **`.dock-chip-row` has no user in the page** since `cb8060a` (only a comment
  in `index.html` names it). Its rules are in
  `frontend/css/07-whiteboard-misc.css` with a band-4 partner in
  `10-responsive.css`, written as a general recipe rather than as the
  Timeline's, so left whole; `tests/test_ui_recipes.py` holds the page at zero
  uses either way. [ui-phase-11.md]
- **The Dashboard hero is deferred by the owner, not by judgement.** Do not
  touch `.dash-hero`, `.dash-wordmark`, `.dash-greeting`, `.dash-clock*` in
  `frontend/css/03-dashboard-widgets.css`, the hero markup in
  `frontend/index.html` (`#dash-hero`, around line 489), or `dashboard.js`'s
  `renderEmblem($("dash-hero-emblem"), ...)` call. [docks.md]
- **Two icon-gap outliers, both judged deliberate**: 10 meta chips at 3.6px
  (`.chip.when`, `.map-chip`) against the app's 242 controls at 6.4px, and
  `#conv-browse-all` at 17.7px at 1024 only (it is `width: 100%` with
  `justify-content: center`). Revisit only if the owner reads them as
  inconsistent. [consistency.md]
- **The Ask results grid is two columns down to 900px.** At 1024 each half is
  356px, which is why the badge has to ellipsise a long model id at all. The
  breakpoint (`@media (max-width: 900px)` on `.chat-grid`,
  01-forms-settings.css) is arguably too low for a panel that holds an answer,
  but moving it is a layout decision the owner has not asked for.
  [ask-head-ocr.md]
- **`#chat-results`'s second half is the only `.panel-head` with no actions.**
  The next head that wants a control beside its title should take family 8
  rather than inventing a fourth arrangement, which is what the lint is there
  to insist on. [ask-head-ocr.md]

## Settings and help

- **INBOX 235, the Settings Help page and the Models order** (chrome2, not
  started, cut by the PR deadline). `frontend/index.html` only, leaving
  `SETTINGS_SECTIONS` alone: a `var(--space-4)` gap between the Ask Atlas row
  and the FAQ group on Help (the row sits by the `data-goto-section="help"`
  block, ~line 9117), and the "Advanced response settings" group moved above
  "Installed models" on the Models page. [chrome2.md]
- **INBOX 237, the built-in Librarian persona is Atlas** (chrome2, not
  started). `frontend/app.js` ~line 21492 mirrors the backend's built-ins:
  rename the built-in card to Atlas, description "Atlas, this notebook's
  librarian: files, links and answers from your notes.", on both sides (the
  backend's list lives with `resolve_persona_prompt`), keeping the id
  "Librarian" so stored preferences still resolve. Test in
  `tests/test_personas*`. [chrome2.md]
- **"Advanced response settings" sits 20.8px right of its siblings.** It is
  inside a `<summary>` (`#sampling-box`, `frontend/index.html` ~line 5326) and
  the disclosure marker precedes it; 54 of the 55 Settings headings share one
  left edge at 546px. Fixing it means hiding the native marker, and hiding it
  without drawing a replacement trades a visible affordance for an alignment.
  Decide that trade-off before touching it. [consistency.md, docks.md]
- **`#settings-tools`'s own top-level intro is the one undecided help item.**
  `count.py` on `frontend/index.html` reports 17 and `countjs.py` reports 2,
  and every one of those 19 is a written decision to stay inline except that
  one. Next step: re-run both counters in case a merge introduced new
  paragraphs, then convert or decide it. [help-popovers.md]
- **Toggle rows onto one recipe (no lavender-filled bars): not started.**
  [help-popovers.md]
- **`scratchpad/ui-sweeps/help-popovers.js` is not built**: open every '?' on
  Settings, assert each popover rect is inside the viewport at 1440 and 390.
  It would also have caught the shortcuts-overlay overflow. [help-popovers.md]
- **Not one of the seven tabs carries a `data-help-for` popover.** All 41 are
  in the Settings modal or a dialog; the Guide sends the tab's control labels
  instead, and a tab that grows a popover is picked up with no further change.
  [chat-popup-agent.md]
- **The learning loop's Settings section (I9's frontend) is not built.** The
  backend is complete: `GET /learned?kind=&q=&limit=&offset=` returns
  `{items, total}` with `X-Total-Count`, `GET|PATCH|DELETE /learned/{id}`,
  `POST /learned/{id}/reset`, `GET|PUT /learned/switches`, `DELETE /learned`
  (body `{confirm: true}`), `GET /learned/export`. Every row carries `span` as
  `[start, end]` into `entries.content`, so "open the note scrolled to the
  sentence" needs no further backend work. [learning-loop.md]
- **The OCR workspace head could not be measured.** `.ocr-toolbar` only exists
  once a file is open in the OCR workspace and the seeded notebook has no path
  to one without a real scan; `05-sidebars-themes.css:1269` names it beside
  `.doc-toolbar` and `.library-head` as having had the same fault.
  `wbtopbar.js` already has a probe pointed at it; the missing piece is a way
  to get a scanned file into the sweep's notebook. [consistency.md]

## Backend

- **The other search surfaces still do their own thing.** `file:
  frontend/app.js`, `id: search-one-surface`. The Notes list filters
  client-side with `parseNoteQuery` (which knows `tag:`, `category:`, `is:`
  and phrases, but not `kind:`, `in:`, `before:`, `after:` or `has:`), the
  Library filters its own arrays, and `/entries?semantic=true` is a second
  ranking path. Next step: make the Notes filter call `GET /search` when the
  query carries an operator the client parser does not know, and render the
  returned order; then the Library, then the command palette. One surface per
  commit, each with a sweep. [brief11-retrieval-engine.md]
- **No FTS index rebuild job.** `file: src/memorymap/search/index.py`, `id:
  search-reindex-job`. `rebuild()` runs once, at the startup that first
  creates the table; there is no way to ask for a rebuild after a restore, an
  import or a bug. Next step: a `reindex` job kind once Brief 9's runtime
  lands, with `/search/stats` showing the row counts it is working towards. Do
  not add a route that rebuilds inline. [brief11-retrieval-engine.md]
- **A bulk write can leave the index stale.** `file:
  src/memorymap/search/index.py`, `id: search-bulk-writes`. The hook sees the
  ORM's unit of work; `session.execute(update(Entry)...)` or raw SQL bypasses
  it, and `touch(session, source, ref_id)` has no caller. Next step: grep for
  bulk `update(` and `delete(` over the six indexed models (the importer and
  the space reassignment in `routes_spaces.py` are the likely two) and call
  `touch` there, or add a lint that fails on a bulk statement against an
  indexed model. [brief11-retrieval-engine.md]
- **The vector matrix forgets by zeroing a row.** `file:
  src/memorymap/search/engine.py`, `id: search-matrix-compaction`. Dead rows
  score zero and are never returned, but they stay in the array. Next step:
  rebuild when dead rows pass some fraction of the whole, counted rather than
  guessed. [brief11-retrieval-engine.md]
- **`has:` only knows `file`.** `file: src/memorymap/search/engine.py`, `id:
  search-has-vocabulary`. `has:image`, `has:link` and `has:reminder` parse and
  match nothing. Next step: decide each one's source (an attachment mime,
  `EntryLink`, `Reminder.entry_id`) and answer them over the candidates, never
  with a join on every save. [brief11-retrieval-engine.md]
- **The graph signal needs an open note, and the Notes list rarely has one.**
  `file: frontend/app.js`, `id: search-open-note`. The list passes `entry_id`
  only in rows view or while editing; in card view the third signal is zero.
  Next step: decide what "open" means on that surface, per the app's own focus
  model. [brief11-retrieval-engine.md]
- **Global undo of an AI action.** `file: src/memorymap/core/events.py`, `id:
  events-undo`. `replay` and `restore` cover one note; "undo auto-filing"
  means selecting the events of one actor in one window and applying each
  `before` in reverse. Next step: `events.undo(session, actor, since_id)` plus
  the Settings surface that offers it (Brief 13 expects it for a skill run's
  Undo). It has to refuse an event whose values are gone
  (`events.is_compacted`); a deleted board item is the one case with nothing
  to put back, since the whiteboard tables have no soft delete.
  [brief7-event-log.md]
- **The Timeline and Dashboard activity strips.** `file:
  frontend/dashboard.js`, `id: events-strip`. `GET /events?since=` exists and
  nothing reads it. The "Recently added" widget was deliberately left alone.
  Next step: a strip that polls `/events` with the cursor, rendering actor and
  action; the feed's shape is settled (`changed`, `snapshot`, `compacted`), so
  a folded run renders as one line rather than a burst of edits.
  [brief7-event-log.md]
- **Sync (B6) as log shipping.** `id: events-sync`. Unstarted and no longer
  blocked: it needed the retention rule, which now exists. A compacted
  snapshot ships as a snapshot. [brief7-event-log.md]
- **`filing_state = "auto"` is set on the two create paths only.** The
  recategorise-on-add-context path (`src/memorymap/api/routes_entries.py`, the
  `exclude_entry_id` call into `janitor.categorise`) files with the AI and
  does not set it, so moving one of those notes by hand records no correction.
  Next step: grep `categorise(` and set `manager.AUTO_FILED` wherever
  `janitor.is_ai_method` holds, the same two lines as the create paths.
  [brief-13-harness.md]
- **The Reminders tab still reads one page.** `loadReminders` draws the tab
  from `GET /reminders`, ordered `due_at` ascending, so the first page is the
  oldest rows, ticked-off ones included: a notebook whose oldest two hundred
  reminders are done would push everything upcoming off the page. Two honest
  options: page in the UI (the Library's own pager is the recipe,
  `library-docs-pagination` in `index.html`, `libraryDocsPageSize` in
  `library.js`) or read to the end with `apiPagedList("/reminders", 200)` as
  the other three surfaces do. The second is four lines and loses nothing.
  `clearDoneReminders` is fixed exactly by reading to the end; `openPalette`
  preloads `paletteReminders` first page only, so a reminder past it is
  unfindable in the palette. [list-paging.md]
- **Other first-page-only callers, one call each.** `app.js`
  `loadCaptureDocuments` and `renderAttachToDocument`, `app.js`
  `notePickerRows` for its `documents` and `images` sources, and
  `dashboard.js` `renderDocumentsWidget` plus its three reminder reads. None
  is wrong at 200 documents and 200 uploads; all are wrong at some size.
  `apiPagedList(path, pageSize, options)` in `documents.js` is already global.
  [list-paging.md]
- **`POST /learned/bulk`** (`{ids, action}`) is in the plan and not built: no
  caller exists until the Settings table does. [learning-loop.md]
- **I1's later passes**: tensions, duplicates, entities and dates as kinds in
  the same table. `ai/tensions.py` and `ai/entities.py` already produce the
  first two in their own shapes; folding them in means giving each a span and
  a `DerivedFact` row, not a second pipeline. [learning-loop.md]
- **`GET /night/latest` and the morning card** (I1's own surface). `POST
  /night/run` returns the counts a card would need; nothing stores a run, so
  grouping facts by run needs the `night_runs` table the plan names.
  [learning-loop.md]
- **The four switches with no runner yet** (`margin_reader`,
  `open_questions`, `evidence_checks`, `model_bench`) are stored and reported
  but gate nothing, because their features are not built. Each of those briefs
  adds its `runner_enabled(...)` check. [learning-loop.md]
- **WORLD_CLASS_PLAN 9's dev-only llama.cpp runner is the blocker behind four
  open items**: the `evals` marker, Skills Phase D's central claim, the
  retrieval engine's real-embedding numbers, and the paging nudge a real small
  model would have to act on. The suite must never depend on it.
  [brief-13-harness.md, chat-timeline-skills.md, brief11-retrieval-engine.md]

## Sweeps and tooling

- **`scratchpad/ui-sweeps/editor.js` still describes the retired editor.**
  1,058 lines, 89 checks, written against the textarea, the per-paragraph Live
  view, the Phase 0 backdrop and the D3 snapshot stack, all four gone; it
  still references `docUndoStack`, `docUndoAt`, `docUndoReset`,
  `#doc-live .lp-src` and `has-backdrop`, so it throws rather than failing
  usefully. What it carries that nothing else does is the long tail: the
  colour menus, the footnote and table commands, the toolbar's collapse and
  wrap modes, the gutter pairing for the two note editors. Next step: re-point
  its reads at `docSurface()` and its Live interactions at
  `#doc-editor .cm-content`, drop the four retired checks, and report how many
  of the 89 survive. [documents-engine.md, documents-batch.md,
  documents-phase4.md, prose-intelligence.md]
- **`contrast.js` never visits the Documents tab.** Its `TABS` constant holds
  seven tabs and documents, whiteboard and mindmap are not among them, so the
  merge gate's contrast step has never measured any of those surfaces. Adding
  the three is a two-line change that will almost certainly find pre-existing
  findings, which is a session of its own. [doc-sidebar.md]
- **`scratchpad/ui-sweeps/menus.js` times out at its last step**, clicking a
  `.select-opener` on Chat after the model panel has been opened and
  dismissed. It times out identically with Reduce motion on, so it is not the
  menu animation. Nobody has looked at why. [responsive.md, visual-c.md]
- **`notessubtabs.js` counts the hidden native selects.** `#entry-template`
  24x1 and `#entry-category` 1x40 are invisible by construction (absolute,
  clipped) and no sweep should count them as controls, which is why its height
  set reads `[1, 36, 40, 176]` rather than `[36, 40, 176]`. Cosmetic, in the
  sweep. [notes-subtabs.md]
- **A check that cannot tell "nothing matched" from "labels are broken" cries
  wolf on every small fixture.** Two of `graph2.js`'s five failures were
  exactly that, measured on a scratch profile holding a single note. The
  lesson is the sweep's, not the graph's. [graph.md]
- **The README tour still has two gaps.** The chat screenshot shows an empty
  conversation (no model in the sandbox), so a machine with Ollama should
  retake `docs/screenshots/chat.png` with a real exchange; and the page reader
  has no shot at all, because it wants a multi-page PDF and an OCR binary and
  this sandbox has neither. Files: `scratchpad/ui-sweeps/readmeshots.js`, the
  `chat` entry. [picker-catalog-readme.md]
- **`frontend/app.js` is 1.93 MB of source.** The gzip smoke bound in
  `tests/test_static_compression.py` was raised to 700 KB on 2026-09-13;
  splitting the file is still the thing that number is really measuring, and
  it is above a single agent's remit. [chat-popup-agent.md]
- **The launchers want one run on a real Windows machine**: `start.bat`,
  `start.bat --doctor`, `start.bat --shortcut` and `uninstall.bat --dry-run`,
  watching the splash through a first-run install. Everything else in Brief 17
  has been exercised. Two things deliberately left: Copy diagnostics copies
  the step history rather than running `--doctor` live (which would probe the
  port the app is about to bind and talk to the git remote mid-install; the
  safe shape is a `--doctor --offline`), and the dry run's "frees about"
  figure counts `.venv` only on Windows, which is 300 MB of a 305 MB answer.
  [launcher.md]
- **A changelog edit breaks a test two directories away.** `CHANGELOG.md` is
  mirrored into `docs/CHANGELOG.md` and `tests/test_docs_site.py` compares
  them byte for byte, so any changelog line needs
  `cp CHANGELOG.md docs/CHANGELOG.md` in the same commit. Not in the lint set.
  [responsive.md]

## Not verified

- **Every provider test runs against a fake transport** (CLAUDE.md section 4),
  and that covers more open work than any other single line here: no real
  model has run a skill, the night pass, the Guide's tab context, the paging
  nudge with an offset written into it, or a grounding answer that
  paraphrases. The grounding event that was measured came from seeding a note
  containing the stand-in's one fixed sentence. [chat-b.md,
  brief-13-harness.md, learning-loop.md, chat-popup-agent.md]
- **Nothing Windows was executed**: `splash.ps1` has never been drawn (layout,
  the marquee, the Details toggle, `Clipboard::SetText` from a hidden host,
  the error card's button swap), `start.bat --doctor` has never printed its
  table, `--shortcut`'s `.lnk` and `uninstall.bat --shortcuts` have never run,
  nor `netstat` port detection or the `%DATE%`-derived log filename on a
  non-English Windows. **Not run on macOS** either: `./start.sh --shortcut`'s
  Finder-alias branch, its symlink fallback and the `notify`-mode splash. The
  doctor's Ollama and Updates rows were exercised only in their negative
  state. [launcher.md]
- **No pre-Brief-7 database was upgraded.** Both migrations are exercised by
  the suite and written to be idempotent, but a real year-old file was never
  opened; compaction's numbers come from a database this sandbox built (150
  notes, 40 edits each) and one running app's notebook.
  [brief7-event-log.md]
- **Nothing in the learning loop was measured past a test-sized notebook.**
  The pass is O(notes) with one query per note for the already-known
  fingerprints, which is the first thing to profile on a real notebook. The
  resurfacing numbers are this sandbox's: read 6.7 ms at 800 notes, compute 50
  to 230 ms. [learning-loop.md]
- **Every cosine number in the retrieval work came from the 4-dimensional
  fake.** A real backend is 384-dimensional, anisotropic, and its `embed_text`
  per query is the cost the engine does not measure. Next step:
  WORLD_CLASS_PLAN 9's runner, then re-run
  `scratchpad/search/measure_engine.py`. [brief11-retrieval-engine.md]
- **Chromium only, mostly 1440x900, no second browser and no real touch
  device.** The graph's world constant in `gcWorldFor` (1.6 to 1.25) is
  reasoned above about a thousand notes; touch and pinch on the map are
  untested; the whiteboard was seen at 1440x900 and 390x844 at DPR 1 only;
  the documents contrast ratios use one sampled ground (`--page` is a
  gradient, so the dark figure `rgb(27, 31, 44)` comes from
  `scratchpad/pngpixel.py` on three points of a screenshot). [graph.md,
  whiteboard-phases.md, documents-batch.md, visual-c.md]
- **The desktop window was never run** (`start-desktop.sh`); every visual
  claim on this branch is a browser tab. [prose-intelligence.md, visual-c.md]
- **Every frame-cost number is headless Chromium with no GPU**, so the ranking
  and the order of magnitude hold and the absolute milliseconds do not. The
  background slider's visible effect per step is still unmeasured: ink on the
  canvas varies by about 0.15 points between two boots of the same settings
  (every style places its marks with `p.random`), and frame cost at the two
  ends moves by less than this environment's noise. The honest next step is a
  person looking at five screenshots, or a design change so the slider drives
  something with a large signature (the wash's own alpha). Mesh is the
  expensive style (+27.6ms a frame, worst frame 166.7ms). [responsive.md]
- **How the dark palette reads on an OLED panel or at another display gamma**,
  and the luminance column `glassdepth.js` takes, which was not re-run after
  the shadow tokens changed. [responsive.md, visual-c.md]
- **A PDF's page picture was never seen drawn**: this sandbox has no PDF
  render extra (`pdfpages.available()` is false, `/media/pdf-page/...` answers
  404), so the OCR workspace's stage stayed empty for a PDF. Choosing a reader
  was not exercised end to end either: all three options are `disabled` here,
  so the option row's click handler correctly returns without changing the
  value. Nothing measures a real reading: no vision model and no Tesseract ran.
  [library-blockers.md, ask-head-ocr.md]
- **No screen reader was run** against `aria-current="location"` in the
  documents outline. [doc-sidebar.md]
- **IME composition inside the editor engine**, and the fallback path reached
  by a genuinely blocked request rather than by setting `docCmBroken` by hand.
  (The fallback surface itself was verified in 2026-09-13's `docfallback.js`
  run, 8 of 8.) [documents-engine.md, documents-phases.md]
- **The whiteboard's PDF export** goes through the browser's print dialog,
  which Playwright cannot complete, so it is the one pair of the
  scope-by-format matrix no sweep asserts; pen pressure and the rail's
  long-press flyout have never been driven by a touch device; the
  highlighter's Shift-straight branch is exercised by hand, not by the gate.
  [whiteboard-phases.md]
- **The whiteboard's align and distribute actions**: their markup changed
  (labels to icons), their handlers were not touched and were not driven.
  [visual-c.md]
- **The popup agent's results pane with a conversation in it.** Everything was
  measured on the empty state, since this sandbox has no model;
  `.command-palette-results` keeps its own `--card-pad-x` inset, and that is
  reasoned, not observed. [popup-redesigns.md]
- **Write with AI was measured with the model off**, so "Draft it" is disabled
  and the draft box is empty in every measurement. The column heights are the
  same either way (the boxes stretch), but an in-flight draft with its Stop
  button and a long status line has not been seen. [notes-subtabs.md]
- **A real log stream under load.** The live pill reads green and the filters
  hide the right count (275 records on the seeded server), but nothing here
  produced a burst, so Follow's scroll-pinning was not exercised beyond
  toggling it. [logs-cards-links.md]
- **Real-browser text metrics beyond Chromium.** The wrap sweep measured
  420 to 2200px at the app's own 95% `--zoom`; a different engine could shift
  an exact wrap breakpoint by a few pixels, and none of the fixes depends on
  one holding. [wrap-sweep.md]
