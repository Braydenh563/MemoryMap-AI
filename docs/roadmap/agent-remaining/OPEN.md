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
| ~~246~~ | **Done 2026-09-20.** Maps' own reference nodes counted (`_board_reference_rows`, both tables, one reader), `GET /entries/reference-counts` and the chip row on the card measured in Chromium (`refchips.js`), Connections telling maps from boards and listing every reference the chip counts. Record in HISTORY's INBOX 246. | done |
| ~~232~~ | **Mostly already built; measure before building any of it.** Checked on the branch head 2026-09-19 (`scratchpad` sweep, one document holding all of them): tables render as 6 `.cm-md-td` cells with **0 pipes on screen**, callouts as 2 `.cm-md-callout` lines with a label and **0 `[!note]` markers**, task lists as 2 real `<input type="checkbox">` with **0 `- [ ]` brackets**, and an image as a drawn `.cm-md-image` with **0 `![...]` syntax**; strikethrough, highlight, footnotes and maths all carry their marks too. The two things that were genuinely wrong are fixed: the code fence's empty rows (706e2af) and the chips that broke in half when they wrapped (2b94271). This row was stale, and rebuilding from it would have been the fourth time this project rebuilt something that existed. **Closed 2026-09-20.** The one line of the brief nobody had checked, "a header row with the language and a copy button", was measured before being written and is built: `renderMarkdown`'s `.code-bar` has carried the language, Copy and Save since INBOX 172, and a document with a `python` fence and an unlabelled one draws 2 bars, 4 buttons and the labels `python` and `code`. The live view keeps the corner label and no button, by the decision now in DOCUMENTS_PLAN section 15 (a control inside a contenteditable is a caret trap; the row it would hang from is 8px tall against a 36px line, measured, and that smallness is the 2026-09-19 fix). What the measurement found instead was the glyph in those labels, a typed `⧉` on a Copy button in an app that ships `ph:copy`: fixed at both call sites and added to `tests/test_no_glyph_icons.py`. `scratchpad/ui-sweeps/doccodecopy.js`, 11 of 11. | done |
| ~~253~~ | **Done 2026-09-20** (b062d0d, f0d478b, f24d8a5, 1f018d6). `start.sh`/`start.bat` self-repair a failed start once with no prompt; the venv health check imports the app itself; a Repair MemoryMap AI shortcut in the .exe installer and the MSI runs `--desktop --reinstall`. Record in HISTORY's INBOX 253. | done |
| 225 | The frontend copy sweep: every place the app still speaks as "the AI", "the assistant" or "the guide" where it means Atlas. | INBOX 225's second half |
| 226 | A flicker above the bottom bar on the dashboard, never reproduced here; needs the owner's theme, art setting and zoom. | INBOX 226 |
| 213, 220, 228 | Documentation leftovers recorded in their entries. | INBOX |

**B. Plan tails, by surface**

| Plan | Still open |
| --- | --- |
| DOCUMENTS_PLAN | Phase 4 item 5's daily notes, the one row of Phase 4 still open (the templates gallery was built, and verified 2026-09-20 by `scratchpad/ui-sweeps/doctemplates.js`: six templates, each with a description); the Phase 2, 6 and 8 tails and the engine's three deliberate omissions, in this file's Documents section. Everything else this row used to list was built or already existed: the Library's property filter, outline reorder with folding and a filter box, the command palette and shortcut sheet from one table, version history with its diff and its AI filter, the per-hunk AI diff, reading typography and the print stylesheet (all 2026-09-20 or earlier, each with its probe named in HISTORY.md). |
| UI_MODERNISATION_PLAN | ~~Phase 8's docks over the seven-control ceiling~~: re-measured 2026-09-20 (`docks.js` at 1440): notes 6, graph 6, library 5, chat 4, timeline 4, reminders 4, and only `#wb-topbar` at 13, which the plan names as the menu-bar exception (Insert, Edit, Arrange, View, Board on the dock's zones). Done. Phase 11, the phone done properly: items 1, 2, 3, 5 (its share sheet half), 6, 8 and 9 were built on 2026-09-20, and items 4 (the graph: the hold that opens the node menu and arms the lasso, the controls as one sheet) and 7 (the whiteboard and the map: two fingers for the camera, the tools as a sheet, the board bar at the touch floor) on the same day, each with its own gate in `scratchpad/ui-sweeps/` (`graphphone.js`, `wbphone.js`). Item 5's reader full screen with a bottom bar was built on 2026-09-20 (`scratchpad/ui-sweeps/libreader.js`, the sheet recipe's `page` variant, and a pane-grid bug it found that was wrong at every width under 1100). Item 9's hover-only half was swept properly on 2026-09-20 (`scratchpad/ui-sweeps/hoveronly.js`: 45 reveal rules, eleven stops, `hover: none` emulated and each candidate tapped) and the two it found were both a `hover: none` override written a class short of the rule it had to beat, so neither had ever applied. Item 11's two open gates were closed on 2026-09-20: errors.js was already clean at 390, and contrast.js, which took no viewport and had only ever run at 1440x900, now takes one, reaches Settings the way a phone reaches it, reports how many text elements it measured (which caught the whiteboard being in its tab list with no tab page to open, so it had been measuring an empty window at every width) and comes back 0 low-contrast over 33 surfaces at 390, 820 and 1440 in light and dark. Item 7's leftovers at 820 were measured and fixed in the same pass. What is left of the phase: item 11's screenshot set for the owner. |
| GRAPH_PLAN | Phase 5 (positions saved on views, the `?since=` cursor); Phase 6's node panel redesign; the local pane's Show switches; 6b the minimap. |
| WHITEBOARD_PLAN | Decision 7's other half; the phone context bar comparison; sketch handles at zoom; the arrange panel items. |
| MINDMAP_PLAN | The mapux agent's leftover list (this file's Mind map section). |
| CHAT_PLAN | ~~Phase 1's other half, which note grounds a sentence~~ built 2026-09-20 (the fixtures exist, 18 of 18 attributed, was 17 of 18); Phase 1's fourth gate line, the low-support "I don't know" state, is still open and is written up in the plan; Phase 4's harness items. |
| TIMELINE_PLAN | ~~Section 7's two measurements~~ taken 2026-09-20, and both found a bug: the density strip hid on a note count (it hid a profile of 150 notes and showed a comb of 200) and the table drew no title column at all between 600 and 1024. Both fixed and re-measured. Section 7's third line, the "auto" scale thresholds, wants a real notebook and is left. |
| AGENT_SKILLS_REFORM | ~~Phase D verified against a real model, which needs WORLD_CLASS_PLAN section 9's dev-only runner first.~~ **Done 2026-09-20.** The runner is `scratchpad/llama-dev.sh` and the gate is `tests/test_skills_evals.py`, four `evals` tests that skip at collection without a model: 3 passed and 1 skipped against Qwen2.5-1.5B-Instruct Q4_K_M through llama.cpp, with the skip itself the finding (the run stalled on step 1's `list_tags` contract and said so, rather than ticking it). Record in HISTORY's "Moved from the plans, 2026-09-20". What is left is breadth, and it sits in WORLD_CLASS_PLAN 9: the same gate at 3B and 4B, and an eval each for the rest of CLAUDE.md section 4's unproven list. |

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

- ~~**DOCUMENTS_PLAN Phase 4 item 5's daily notes, and only that.**~~
  **Decided and built, 2026-09-20.** The decision is DOCUMENTS_PLAN section 14
  ("one day, one page, and which store holds it is the writer's choice"): the
  Timeline owns the journal, its two endpoints, its streak and its calendar
  strip, and none of that is duplicated. What Documents got is the Daily
  template its own item-5 list names, titled with the ISO day so the two
  surfaces agree by spelling; what the Timeline got is a day bucket that
  accepts a note *or* a document with that title. The measurement that decided
  it: a document titled `2026-09-20` was already in the Timeline's feed and
  the bucket beside it still offered "Start today's note", so the app let a day
  be written as a document and then did not believe it.
  `scratchpad/ui-sweeps/docdaily.js`, 11 of 11: 6 templates to 7, 1 start
  offer to 0, 0 open offers to 1 ("Today's document"), the calendar glyph on
  the row. Not built, deliberately: a "Today" button in the documents dock, a
  third door onto one page. [documents-phase4.md]
- **Found, not fixed: `scratchpad/ui-sweeps/docexports.js` fails on a click
  timeout and has for a while.** It times out at line 101 clicking
  `#doc-export-docx`, whose comment says "the row lives in the document's ⋯
  menu, which is a `<details>`" and opens that. Measured on the branch head:
  the row's runtime parent is a `.action-menu` (`BUTTON#doc-export-docx` in
  `DIV.action-menu` in `DIV.menu-group` in `DIV.doc-dock-menu-list` in
  `DETAILS#doc-dock-menu`), the `<details>` opens fine, and the row still
  measures 0x0 at 0,0 because the `.action-menu` inside it is `kebabMenu`'s
  own hidden submenu and nothing opens that. **Not caused by this session**:
  the sweep fails identically with `frontend/app.js`, `documents.js`,
  `editor.js` and the five stylesheets checked out at 71a0197, the fork point,
  which is the way to tell a stale probe from a regression. The fix is one
  line in the probe, open the submenu as well as the `<details>`, and it needs
  whoever knows which control is meant to open it in the app. `docxextra.js`
  covers the same 501 message and passes, so the behaviour is not what is
  broken. [documents-phases.md]
- **The templates gallery offers a description, not a preview of the page.**
  Measured 2026-09-20: each row reads "Assignment plan / Brief, criteria,
  sections, sources, timeline." The plan's words are "offered with a preview",
  and a sentence about the template is a fair reading of that; a thumbnail of
  the body is not built and may not be worth it. Left as a row here rather
  than built, so the next session does not build it twice.
  [documents-phase4.md]
- **The document surface's aliases have no lint.** A call site that hands the
  surface to something expecting a DOM element reads as correct and fails at
  runtime (`autoGrow` wrote `style.height` on it and every "/" command in the
  capture box threw). Next step: fail on `autoGrow(`, `mountGutterFor(`,
  `syncDocGutterMetrics(` or `watchDocGutter(` called with an identifier the
  same function received as a surface. [documents-engine.md]
- **Phase 8c: the skill editor's steps box is built; the board's note card is
  not, and is not one row.** The steps box landed 2026-09-20 with its own
  command set (`skillCommands` in editor.js: the form's `{{placeholders}}` and
  its ticked tools, read off the form so neither goes stale), because the note
  commands are all wrong in a box whose contract is one instruction per line.
  Measured, `scratchpad/ui-sweeps/skillsteps.js`, 12 of 12: "/" opens a
  304x165 menu with two groups and 0 note commands in it.
  **The board's card is the open half, and adding a `NOTE_SURFACES` row for it
  would break it**: `wbEditNodeText` (`frontend/whiteboard.js` ~2760) hangs
  Enter-commits, Escape-abandons, blur-commits and an `event.stopPropagation()`
  off that textarea's own `keydown`, and all four stop firing once a view is
  mounted over it. The last one is the guard that keeps Tab and Enter out of
  the board's branch gestures, so losing it grows a branch from a keystroke
  meant for the text. The work item is "move the commit keymap and the gesture
  guard onto the surface, then add the row", for whoever owns whiteboard.js.
  [documents-phases.md]
- ~~**The table cell menu is a `kebabMenu` with ten items and no grouping.**~~
  **Built 2026-09-20, as the change to the shared recipe this row said it was.**
  An item may carry `group`, a name, and `kebabMenu` draws a hairline wherever
  it changes; the name is not printed, because a heading over every three rows
  makes this menu seventeen rows tall. Measured: 10 items, 3 hairlines at 1px
  by 172px, 10 `menuitem` roles and 3 `separator` roles, and `wireMenuKeyboard`
  walks `[role="menuitem"]` so a hairline is never a keyboard stop. In
  DESIGN.md's recipe index with a ratchet in `tests/test_ui_recipes.py`.
  [documents-phase4.md]
- ~~**Atomic ranges, the `Mod+click` affordance and the toolbar's own
  state**~~ **All three decided 2026-09-20, DOCUMENTS_PLAN section 16,
  `scratchpad/ui-sweeps/doctoolbarstate.js` 21 of 21.**
  **The toolbar's state is built**: `renderDocToolbarState` resolves one
  syntax node at the caret and walks its ancestors, so the cost is the depth
  of the markdown and not the length of the document. Measured at eleven
  stops: h1, nothing, bold, italic, code, h2, ul, task, ol, quote, link, each
  with nothing else lit; 17 of the strip's 41 `data-md` buttons carry
  `aria-pressed` and the other 24 are the ones that always insert something
  new. **Atomic ranges: decided against, and the measurement contradicts the
  note that asked for them.** The caret visits offsets 29 to 36 in order
  across `**a bold run**`, moving 10, 5, 9, 8, 11, 5 and 12 pixels: no
  two-character jump anywhere. What does reproduce is different and bigger:
  the reveal is per *line*, so entering that line moves the rest of it by
  41px (x=779 to x=820). Atomic ranges would not touch that and would take
  away the marker you can put the caret between, which Phase 2 built on
  purpose. **If the shift is reported, the fix is a narrower reveal, not
  atomic ranges.** **`Mod+click`: the note is out of date**; a chip carries
  `cursor: pointer` and `title="Ctrl+click to open <url>"`, which names the
  chord and the destination. Left unbuilt on purpose. [documents-engine.md]
- **Outline rows are 24 to 25.2px, under the app's own 28px floor.**
  `frontend/css/05-sidebars-themes.css`, `.outline-link`
  (`padding: 0.15rem 0.25rem` plus a 0.85rem line) against DESIGN.md's
  `--target-min: 1.75rem`. Left deliberately: 24px is WCAG 2.2 AA's own floor
  and raising it costs three headings of visible outline. Next step: a
  density-aware rule (compact keeps 24, comfortable and spacious take 28) or a
  touch layout for the sidebar, which is UI Phase 9's territory.
  [doc-sidebar.md]
- **The rest of the app's viewport popups have not been measured with the
  background art on.** Still open, but **the blocker is gone**: this row used
  to sit behind "the trigger cannot be reproduced in this sandbox", and that
  is now known to be false. With `data-bg-art="on"` a `.card` reports
  `backdrop-filter: blur(14px) saturate(1.5) brightness(1.02)` in this
  Chromium, and a `position: fixed` child written to `left: 0; top: 0` inside
  `.card.doc-main` lands at x=293 against the card's own x=292, so the card is
  its containing block and the real property traps a real popup. `kebabMenu`
  (`wireEscapedActionMenu`) and the toolbar dropdowns (`clampToolbarMenu`) are
  covered; the chat dock's popovers, the selection popup, the whiteboard's
  context menu and `.wb-board-menu` (`escapeAndCapMenu`) are not.
  **What the next session needs, and what cost this one the item**: the sweep
  is four openers and four selectors, and guessing them produced four failures
  that were the probe's and not the app's, which is worse than no sweep. Find
  each opener in the page first. One is already established: the selection
  popup cannot be raised from the capture box at all, because
  `SELECTION_POPUP_EXCLUDED` in app.js is
  `"input, textarea, [contenteditable], .selection-popup"`, so it needs a
  selection over *rendered* text. Then assert the two things `spellwide.js`
  asserts, the parent and the trap, and report a popup that would not open as
  not measured rather than as passing. [editor-intelligence.md]
- ~~**`clampToolbarMenu`'s comment says the trigger cannot be reproduced
  here, and that is now out of date.**~~ **Corrected 2026-09-20**, with the
  measurement in the comment itself: with `data-bg-art="on"` the card reports
  `backdrop-filter: blur(14px) saturate(1.5) brightness(1.02)` and a
  `position: fixed` child written to `left: 0; top: 0` inside `.card.doc-main`
  lands at x=293 against the card's own x=292, so the card is its containing
  block and the trap is live on the real property. The `filter: saturate(1)`
  stand-in's numbers are kept beside it as the same fault measured twice.
  [editor-intelligence.md]
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
- ~~**The writing-suggestion underline is the only surface with no hover
  affordance.**~~ **Built 2026-09-20.** A tint in the kind's own colour, 12%
  mixed against the page rather than stated as an alpha, so it composes on
  either theme's ground and follows `[data-contrast="on"]`'s redefinition of
  `--error`, `--accent` and `--muted` with no branch of its own. A tint and
  not a thicker line, because the three kinds are told apart by the *shape* of
  their underline and thickening one moves it towards another's. Measured as a
  painted colour under a real pointer, `scratchpad/ui-sweeps/findinghover.js`:
  `rgba(0, 0, 0, 0)` at rest in both themes, `srgb 0.725 0.110 0.110 / 0.12`
  hovered in light and `srgb 0.973 0.443 0.443 / 0.12` in dark, which is each
  theme's own `--error`. [prose-intelligence.md]
- ~~**`docFindingAtPoint` walks every mark on every pointer event**~~
  **Timed 2026-09-20, and it is not a problem.** With 96 marks on screen (a
  3,763-word document written to fill the viewport with them), a *miss*, which
  is the expensive case because it walks every mark and calls
  `getClientRects()` on each, takes **0.207ms** in light and 0.212ms in dark;
  a hit takes 0.03ms. Linear in the marks, so the row's own 200-on-screen gate
  extrapolates to about 0.43ms, still inside a pointer event's budget. The
  assertion is in `findinghover.js`, so a change that makes it expensive fails
  there rather than being felt. No cache built. [prose-intelligence.md]
- ~~**The three finding kinds are named in two places**~~ **Held together by a
  lint, 2026-09-20.** `tests/test_ui_recipes.py` now reads both tables and
  fails if they differ, and checks that each kind has an underline rule in
  `docCmTheme`. The two failures it prevents are silent ones: a kind in
  `docFindingKind` alone draws its own squiggle and then falls into no group
  in the panel, which looks like a finding the panel has lost; a kind in
  `DOC_FINDING_GROUPS` alone draws a heading that can never have a member.
  Proved against a simulated drift rather than assumed.
  [prose-intelligence.md]

## Graph

- ~~**The options panel scrolls again at 1440x900.**~~ **Fixed, 2026-09-20.**
  It had grown to 655px of list in a 488px box (Show had gone from 143 to 211
  as three switches were added). Physics, Groups and Minimap are each a
  `details.settings-fold` now, closed by default and remembered; GRAPH_PLAN's
  "Decision made, 2026-09-20" carries why Physics joined the two on record.
  Measured with `scratchpad/ui-sweeps/graphoptfold.js`: 451 in 451 at 1440 and
  at 1024, nothing scrolling; 669 in 488 with all three open, scrolling inside
  the panel. At 390 the panel still scrolls (795 in 286, from 1071), which is
  the phone's own 286px cap, not the panel's size. [graph.md]
- ~~**`/graph/local` has no Show switches.**~~ **Left, on the decision already
  on record, 2026-09-20.** Read again against the code: `graph_local`
  (`src/memorymap/api/routes_graph.py`) takes `depth` and `similarity` and
  nothing else, so the report is accurate. GRAPH_PLAN's "Decision made,
  2026-09-13" decided it deliberately, and the reason holds: "off means the
  thing is not on the map" is a statement about the picture of the notebook,
  and the local pane is a neighbourhood of one note. A board two hops from
  the note you are reading is part of that neighbourhood whatever the map's
  own switch says, and hiding it would leave a hole in a path rather than a
  smaller picture. Reopen this only if the owner asks for it; the switches
  would then be four query parameters plus the `?include_*` plumbing the
  top-level `/graph` already has. [graph.md]
- ~~**GRAPH_PLAN Phase 5**~~ **triaged, 2026-09-20.** The backend fields,
  the cached `/graph/structure` and the payload gate were built on 2026-09-09
  (HISTORY, "Built, Phase 5 (backend)"); the two rows left open were re-read
  against the code rather than started, and GRAPH_PLAN's Phase 5 row now
  carries the finding. Positions on `/graph/views`: nothing to build as
  written, because views are per-device localStorage by a decision in
  `graph.js` itself and the positions that are notebook content (the pins)
  are already on the Entry. `?since=`: still no caller, since every `/graph`
  fetch is a `renderGraph()` behind a control or a tab activation, and a
  parameter nothing calls is the second shape CLAUDE.md section 6 names. The
  one real gap, on the plan's row now: a saved view does not restore where
  the unpinned notes sat, so a force view reopens as a fresh solution of the
  same forces. [graph.md]
- ~~**The node popup redesign the owner names.**~~ **Measured and found
  built, 2026-09-20.** GRAPH_PLAN Phase 6 and the three evening rows are all
  three built; the measurements are in HISTORY under "Moved from the plans,
  2026-09-20". At 1440 and 1024 the panel is 448x357 with nine actions in one
  row, three groups, one filled (Open, read off the computed background), and
  scrollHeight 355 against clientHeight 355, so it does not scroll; at 390 it
  is a 362x468 sheet with the actions on three lines and neither the panel
  nor the page scrolling. With an 88-character title the header stays 48px
  tall, the title is one ellipsised line and the close button sits 14px in
  from the panel's top right corner at both widths, which is the row the
  owner reported. The action band is centred, the panel's full width, on the
  chip fill with one hairline above. Nothing was changed. The agent popup,
  which is what the owner's sentence names, is a different surface.
  Found, not fixed: the plan's target says the Bin should be ghost and it
  renders tonal like its eight neighbours, because a six-class rule paints
  every `.icon-only:not(.ghost)` button tonal on purpose. Left as it renders:
  one ghost button among eight tonal ones reads as disabled, and the gap of
  its own is what sets it apart. [graph.md]
- ~~**`graph.js`'s step 5 still fails**: "clear trace (a route was drawn:
  false): NO CHANGE".~~ **Fixed in the sweep, 2026-09-20.** The cause is the
  edge the trace step picks. It took the first edge on the canvas whose ends
  are not category groups, and the canvas draws edges `/graph/path` cannot
  route along: a similarity edge is not a connection anyone made, and an
  entity or document edge does not even have an integer id, so that route
  answers 422 and `runTrace` reports "the server didn't answer". Any of those
  leaves no route on screen, and the *next* step then reported "clear trace:
  NO CHANGE" as though the renderer had failed. The step now picks a `link`
  or a `thread`, says which pair it chose, and when no route comes back it
  fails there, in the app's own words, instead of one line later; clearing is
  only asked about once there is something to clear. Measured on an 80-note,
  150-link fixture: `5. trace between two notes (17 to 7, a link): redrew
  PASS`, `5. clear trace: redrew PASS`, `findings: 0`. And measured the other
  way, on the thirteen-note seed notebook, where the one link the seed makes
  runs from a note to a board and the Boards switch is off, so no note-to-note
  edge is on the map: one finding, "no link or thread edge on the map to
  trace along: this notebook has no connection between two notes, so Trace
  cannot be measured at all", which is the fact the old NO CHANGE was hiding.
  [ui-phase-11.md]
- **`graph.js` can be interrupted by a confirm dialog and die**, seen once in
  three runs on the same fixture: after "legend filter off", `page.click
  ("#graph-zoom-in")` timed out for 30 s against a `.modal-overlay
  .confirm-overlay` that intercepts pointer events, and the sweep exited on
  an unhandled TimeoutError with the eight steps after it unrun. Not chased:
  it did not recur on either of the other two runs and nothing in this batch
  touches it. Next step: have the sweep name the dialog's own text when one
  is up, which is the one piece of evidence that run did not capture.
- ~~**`scratchpad/ui-sweeps/selectfocus.js` fails twice on a notebook with
  content.**~~ **Fixed in the sweep, 2026-09-20.** Reproduced first, on a
  seeded notebook on this branch, exactly as reported. The app is right and
  the sweep was wrong: `renderGraphViews` (graph.js) sets
  `select.disabled = !views.length`, `enhanceSelect` mirrors that onto the
  opener (`opener.disabled = select.disabled`), and the sweep asserted that
  every visible enhanced select has a focusable opener. That is untrue of a
  control the app has deliberately switched off. It passed on an empty data
  dir because `renderGraphViews` only runs from the render path, which does
  not run when there is nothing to draw, so the picker was never switched off
  there and the assertion never met one. A disabled select is skipped now,
  counted and printed as skipped, and what is asserted about it instead is
  that its opener says disabled too, which is the real invariant. Two other
  things came out of it: `document.body.focus()` does nothing (body has no
  tabindex), so every "landed on" was measured against whatever the previous
  row left focused, which is where the misleading "landed on SELECT.ghost"
  came from; and the graph's options popover is now opened as well as its
  `<details>` menus, because two selects live in it and whether it was open
  was a remembered preference, so coverage was 13 selects on one run and 15
  on the next. Measured: populated notebook 15 checked, 1 skipped, all pass;
  empty notebook 16 checked, 0 skipped, all pass. [library-blockers.md]
- ~~**INBOX 66: the lightbox the node panel opens is unreachable while the
  graph is fullscreen.**~~ **Already fixed, and now measured, 2026-09-20.**
  `.lightbox` carries `z-index: 1020` against the full-screen card's 1000
  (02-chat-graph.css, with INBOX 66 named in its comment). Measured with
  `scratchpad/ui-sweeps/graphfslightbox.js`, which is new: with the map in
  full screen the lightbox builds at 1440x900, computes `z-index: 1020`
  against the card's 1000, `document.elementFromPoint` at the centre of the
  screen lands inside it (`DIV.lightbox-column`) rather than on the card, and
  the close button has a box. The entry's own diagnosis was wrong in a way
  worth keeping written down: it blamed the Fullscreen API, and this app's
  full screen is a class with `position: fixed`, so nothing was ever in a top
  layer and the whole of it was stacking order.
  Found while measuring it, not fixed, and now INBOX 274: one Escape closes
  the lightbox *and* leaves full screen. [visual-c.md]

## Chat and popup agent

- **CHAT_PLAN Phase 1: which note grounds a sentence. Built 2026-09-20.** The
  fixture set is `tests/fixtures/chat/grounding_cases.json` (sixteen cases,
  scored by `tests/test_grounding_fixtures.py`); the note is chosen by BM25
  over the candidate set's pooled passages, and the second-mark ratio is
  calibrated on the set. 18 of 18 supported sentences attributed, up from 17 of
  18; 0 false marks on 5 unsupported sentences; 16 of 16 passage spans. The
  account is in HISTORY.md, "Moved from the plans, 2026-09-20". Still open:
  Phase 1's fourth gate line (the "I don't know" state when fewer than half an
  answer's sentences are supported), written up in CHAT_PLAN Phase 1 with its
  next steps. [chat-timeline-skills.md, chat-popup-agent.md]
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
- **A skill's `verify` block: offered, checkable and scoped. Built
  2026-09-20.** The editor has a "Check it worked" fold (tool, predicate,
  number, and "only the notes with no tags"), `save_skill` has the same four
  as flat arguments, `count_notes` takes `untagged` and `since` out of the
  same helper `list_notes` uses, a block may carry arguments (CHAT_PLAN
  decision 10g) and "Auto-tag my notes" declares
  `count_notes(untagged) max 0`. The two audit skills that had no check now
  declare `count_notes` and verify `unchanged`. Found on the way: a skill
  saved from Settings lost its block on the wire, because `SkillItem` did not
  declare the field. Measured by `scratchpad/ui-sweeps/skillverify.js`, 12 of
  12, now in the gate's sweep list. The account is in HISTORY.md, "Moved from
  the plans, 2026-09-20". [brief-13-harness.md]
- **The page cap and a large notebook: decided 2026-09-20**, CHAT_PLAN
  decision 10h. Six pages of twenty-five stays; the answer to a large notebook
  is a narrower read, which the new `count_notes`/`list_notes` filters make
  expressible. The honest `truncated` report is unchanged.
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

- ~~**Decision 7's other half: the quick-sketch pad still has its own copy of
  the tool code.**~~ Done 2026-09-20. Decided in WHITEBOARD_PLAN decision 7
  first (one table, two renderers; the pad stays a canvas), then built:
  `HIGHLIGHTER_STYLE` plus `highlighterWidth()` and `highlighterBlend()` in
  `app.js` (it is loaded first; `whiteboard.js` is lazy), read by the pad's
  `sketchApplyBrush` and by whiteboard.js's live-draw, mouseup and render
  paths. Measured light, same ink, two crossing strokes: the pad was paper
  255.0, one pass 176.0, two passes 176.0 (the ink's own luminance, so no
  translucency at all) and is now 255.0 / 223.7 / 199.2, against the board's
  252.9 / 222.5 / 198.3. Two bugs the measurement found and fixed: picking a
  colour swatch reset the tool to the pen, so the pad's highlighter could not
  be reached at all after choosing an ink, and the board's saved strokes lost
  their square cap on every render (round on both, square now).
  `scratchpad/ui-sweeps/sketchparity.js`, 10/10 light and dark. Merged with
  INBOX 265's own fix to the same tool (the stroke is painted whole on its own
  layer and composited once, which is a better painter than the polyline this
  agent wrote, so it is the one that survived) and one bug found in it while
  merging: the layer scaled points that `sketchPointer` had already put in
  canvas pixels, so every highlighter stroke landed 15px left and 9px up of
  the pointer in the middle of the pad. Both sweeps are green on the merge,
  `sketchhighlighter.js` (INBOX 265's, evenness and self-crossing: 0.4
  everywhere, spread 0, junction 0.4) and `sketchparity.js` (this one).
- ~~**Multiply is worth 3 luminance units on a dark board and 20 on a light
  one.**~~ Done 2026-09-20, as recommended: `multiply` over a light backdrop,
  `screen` over a dark one, written into decision 7 as a rule about the
  backdrop rather than about the theme's name. Measured dark after: paper
  26.4, one pass 85.9, two passes 128.4, so the second pass is worth 42.5
  luminance units where multiply bought 1.6. The re-application is a
  `MutationObserver` on `<html>`'s `data-mode` in whiteboard.js
  (`wbRefreshHighlighterBlend`), which catches the toggle, the presets and the
  OS media query alike; measured flipping both ways on an open board with no
  re-render between. The export needs nothing: it paints the container's own
  background colour into the SVG, so the blend and its backdrop travel
  together.
- ~~**A sketch's handles scale with the zoom; a card's do not.**~~ Closed
  2026-09-20, and the size half was **already built and this entry was
  stale**: `--wb-inv-zoom` (published once per zoom frame by
  `wbSyncGridToTransform`) and the grip rules in 07-whiteboard-misc.css hold
  every sketch and link grip at a constant size, measured 10px at 0.5x, 1x and
  2x, the rotate grip 12px and its stem 28px. The zoom frame was measured
  rather than guessed (`panlag.js`, 5/5): one transform write per event and
  the grid custom properties once per frame, so the CSS route adds nothing to
  it and no re-render was needed. Three real failures in
  `scratchpad/ui-sweeps/wbhandlezoom.js` were found behind it and fixed: a
  link's bend grip was 24px at 2x (the one grip missing from that CSS block),
  and the sketch move and sketch resize drags divided `event.dx` by the zoom a
  second time, which the link endpoint handle's own comment had already warned
  about, so a shape at 2x moved 30px for a 60px drag and its east grip widened
  it by 30px. 17/17 now.
- ~~**The context bar at phone width, and the plan's half-answered
  question.**~~ Answered 2026-09-20: **it pins**, and the answer is in
  WHITEBOARD_PLAN section 7 with the table that decided it. Both placements
  were built and measured at 390x844 with five kinds high and low on the
  board, ten selections each way (`scratchpad/ui-sweeps/wbcontextphone.js`,
  5/5 at 390x844 and 1440x900). What the earlier reading had not measured was
  the bar against the rest of the chrome: floating never covered the item
  (0 of 10) but sat on the tool rail twice (7759px2 and 1122px2) and left the
  canvas once, and a band over the tools is worse than a band over the item.
  Pinned: one top for all ten, all inside, nothing on the rail; its cost is
  two of ten selections under the band (an image entirely, 8640px2, and a
  line, 3519px2). Desktop still floats, 0.7% to 2.6% of the canvas, nothing
  covered. Found with it: the bar's `top` had never been clamped to the canvas
  the way its `left` was, so a selection low on the board put it 843px to
  1183px down an 844px window.
- ~~**`#wb-topbar` is 13 controls at 1440** against the dock grammar's ceiling
  of seven.~~ **Done 2026-09-21** with the phone bar's overflow, in one pass:
  11 at 1440, 1024 and 820 with **6 beside the five menus** (Phase 8's menu-bar
  exception is the toggles only), 7 at 390 and 320 with **0px of overflow**
  where the bar ran 5px and 75px past its own content box, and every control at
  or above the 44px floor. Rename and New board went into the Board menu; Full
  screen and Arrange leave the bar below 600, both being reachable elsewhere.
  Found and fixed while gating it: all five menus were a `role="menu"` with no
  `role="menuitem"` in them and no arrow keys. Before and after in
  [HISTORY.md](../HISTORY.md), "Moved from the plans, 2026-09-21"; gated by
  `scratchpad/ui-sweeps/wbtopbar.js`, now in `scripts/gate.sh`'s sweep list.
  What INBOX 47 raises for Notes and Library (whether the ceiling counts
  controls a person reasons about or DOM elements) is still open and is still
  UI_MODERNISATION_PLAN Phase 8's. [wbtopbar.md]
- ~~**The old export popover's CSS still names it in grouped selectors.**~~
  Swept 2026-09-20: fifteen mentions of `.wb-export-menu` in
  `08-consistency.css` are none, the `[data-glass="off"]` entry in
  `03-dashboard-widgets.css` is gone, and two more the ledger had not counted
  went with them (the zero-margin list and the max-height cap in
  `07-whiteboard-misc.css`). Four were whole rules with nothing else in them,
  including the bare-button rule that styled its rows. One thing had grown on
  the dead name and is re-anchored rather than deleted:
  `tests/test_region_read.py` found the popover shell by splitting the
  stylesheet on `".wb-export-menu,"`, so it was reading the region popover's
  own group through a class that stopped existing. It splits on
  `".wb-board-menu,"` now. `test_ui_recipes.py`, `test_style_scale.py`,
  `test_css_braces.py`, `test_ui_signatures.py` and `test_region_read.py`
  green (93 tests), the board menus measured unchanged afterwards
  (`wbmenus.js`: one shell recipe across all five, rows 36px) and the export
  dialog still opens inside the window (`wbinbox12.js` 6/6).
  [whiteboard-phases.md]
- **The View menu is 714px of content on a map.** Under about a 730px-tall
  window it still scrolls, which is correct and may still read as the report.
  If it comes back the fix is the menu's own length (four groups, sixteen
  rows), not its placement, which is measured and right from 500 to 1000px
  tall. [visual-c.md]
- **The mind map's own leftover list was re-checked item by item, 2026-09-20**
  (`agent-remaining/mindmap.md`, "Left to do", rewritten with what a run
  against this head finds). Four of its six items were already done, two of
  them by decisions taken after the list was written: the dock's Layout
  section exists and MINDMAP_PLAN §12.5 decided a map shows no Insert or
  Arrange menu at all, both sweeps take `VIEWPORT`, `mapstrip.js` runs 39/39
  on `#wb-context`, `mapperspective.js` measures every Colour by on a map of
  twenty notes 12/12 (category 5 colours, 4.59:1 to 9.13:1 against the card),
  and `wbrail.js` reads the rail against the bar recipe 6/6. What is actually
  left: **curve control points on a tree edge** (a link has its bend already,
  a branch has a shape and no control point), an image in a node, and the AI
  half, which no sandbox here can exercise.
- **The whiteboard's own View menu (`.wb-board-menu`) was never reproduced as
  broken.** It has its own max-height-on-open logic (`whiteboard.js`, the
  `wb-board-menu-wrap` toggle listener), unrelated to the `details.dock-menu`
  family INBOX 31's fix targeted. Worth a Chromium check in its own right if
  it is still reported. [batch-a.md]
- ~~**INBOX 12's remainder, owner WHITEBOARD_PLAN**~~ Closed 2026-09-20, by
  Phases 2 and 3 rather than by repairs, and measured before closing
  (`scratchpad/ui-sweeps/wbinbox12.js`, 6/6 at 1440x900 and 390x844): the
  export popover is not built any more (the export is a dialog, opening at
  480x393 inside 1440x900 and 342x417 inside 390x844), align centres and even
  gaps are both on the context bar with all twelve arrange controls and the
  two z-order ones, and the panel that drew icons through labels went with the
  properties drawer, measured at 0px2 of icon-over-text across 24 buttons on
  the bar and in the top bar's Arrange menu. `wbarrange.js` is stale: it asks
  for `#wb-prop-multi-row`, which Phase 2 removed, and prints
  `{"missing": true}` rather than failing. [inbox.md]
- ~~**A colour swatch is 1rem and never grows for a finger.**~~ Done
  2026-09-20. Below 820 the paint steps to 2rem and the target goes the rest
  of the way with a transparent `::before`, the pattern DESIGN.md's "Hit
  targets" section already uses for the painted switches. Two steps rather
  than one because seven dots at 44px is 308px of the 311 the bar has at 390
  and they would have to touch: measured at 390, the paint is 32x32 and the
  target 33x41 (the sweep walks out from the centre with `elementFromPoint`
  and undercounts a 44px box by about three pixels), 37x46 on Large text, and
  no two dots share a pixel at any setting. The bar at 390 is five rows where
  it was four, which is the cost of the step and is what the plan asked to be
  re-measured. Two things found with it: the dots ran 12px past the bar at
  Large text with Spacious density, because a `.wb-tool-section` is
  `flex: 1 0 auto` with `min-width: auto` and so refused to be narrower than
  its widest row (it wraps to two rows of four and three now, 282 in 284),
  and `sketchbar.js` never looked at 390 or at the swatches at all: it takes
  both now, with the bar's one-row rule kept above 600 only.
  [popup-redesigns.md]

## Timeline

- **WORLD_CLASS D6, the daily journal: the backend is built, the frontend is
  not.** `POST /entries/daily/{date}` creates or returns and
  `GET /entries/daily?through=&days=` gives the calendar strip its days and
  the streak (`tests/test_daily_journal.py`). Next step, all frontend:
  `startTodaysNote` in `frontend/app.js` calls POST `/entries/daily/${key}`
  instead of posting to `/entries`, which fixes the duplicate it makes today;
  then `Ctrl+D`, then the strip and the yesterday and tomorrow pair.
  [chat-timeline-skills.md]
- **The strip's threshold: measured and replaced, 2026-09-20.** A note count
  is the wrong variable (it showed a comb of 200 notes over 18 days and hid a
  profile of 150 over 300 days); the test is now on the shape the strip would
  draw, a fifth of its slots carrying something and a peak of at least four.
  `scratchpad/ui-sweeps/timelinedensity.js`. [timeline-phases.md]
- **The table at 820: measured, and it was broken, 2026-09-20.** Not "eight
  columns, readable or merely present": seven columns and no title column at
  all, 0px wide, with 112px of sideways scroll (222px at 700). Three columns
  now give way between 600 and 1024 and the tags as well below 820; the title
  is 375px at 1024, 176px at 820 and 242px at 700.
  `scratchpad/ui-sweeps/timelinetable820.js`. [timeline-phases.md]
- **The "auto" scale thresholds are still a first guess** (TIMELINE_PLAN
  section 7's third line; day under 60 notes in range, week under 400). Left
  deliberately on 2026-09-20 with the other two: what decides whether a day
  bucket reads well is how much a person writes in a day, and a seed is a
  shape rather than a notebook. Next step: the same probe against a restored
  backup or the owner's own notebook. [timeline-phases.md]
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
- **Boards and maps on a note, and what a note is referenced by (INBOX 246):** done 2026-09-20, see the A table above and HISTORY's INBOX 246 entry. [notes.md]

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

- **Settings → Extras scrolls sideways by 4px at 820** (`errors.js`,
  2026-09-20: `section scrolls sideways 496>492`, the only finding in the
  three widths it walks). Pre-existing by inspection, found while sweeping the
  skills pane next door; nothing in the extras markup was touched this
  session. Next step: measure which child of `#settings-extras` is 496 wide at
  that width before changing anything, since a section that overflows by four
  pixels is usually one row's padding rather than the section.

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
