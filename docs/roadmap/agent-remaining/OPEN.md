# OPEN: everything still open from the agent files, in one place

## Left by the 0.3.3 agents (INBOX 426), 2026-09-26

The four agent files of that round (`companion-426.md`, `atlas-fable.md`,
`ui-426.md`, `auth-optional.md`) are in `archive/agent-remaining/`; what
they left that is still true on the 0.3.3 head is here, one line each. The
two decisions only the owner can take are INBOX 427.

- ~~Stray Atlas heads under the status bar (INBOX 429)~~ Closed. The account is in HISTORY.md, "OPEN.md rows closed, 2026-10-04".
- **`tests/test_name_mood.py` asserts `oklch(from var(--accent)` in the
  CSS**: it holds (the accent tints the glow), but a test for the fixed
  palette would be the honest one. [atlas-fable]
  *Opus: a test for the fixed palette needs the palette's values decided first.*
- **Atlas round 5, the owner's asks (INBOX 427 (1); 2026-09-27)**: hands
  and feet drawn as part of each limb's outline (a mitten with a thumb on
  the inner side, a turned-out foot with a heel; `atlasStem`'s `tip`), the
  legs a third of the height on a shorter torso (hips at 58, soles at 90,
  from a fifth showing before), the hair drawn full on both looks (the
  feminine: seven wavy locks fanning from the crown over a soft mass, one
  falling forward to the shoulder; the crest a quarter fuller), the
  feminine lower body two ribbons (a wide sash from the left hip, a
  narrower one from the right) in the swaying layer, the Auto look reading
  Your look when Face looks is Neutral (`atlasLookReason`), and the lab's
  Morning review card (both looks, every expression, every pose, every
  size, with what Auto would draw and why). Proofs
  `scratchpad/shots/atlas-r5/`. Left: the hands' fingers are two soft
  swells, not drawn fingers (the sprite's are mittens, so by choice); the
  feminine hair now reaches x 78 and y -9, past the companion's 64px box
  by the tail's margin; the ring drift and per-glint twinkles stay off at
  companion size; the simulator's stand-in menu says nothing about where
  app.js's menu lands; three CSP "inline style" console warnings on the
  lab come from a style attribute in avatars.js's generated faces; the
  organic body, ribbon tail, strand and heart star await the owner's read
  of the review card. A mood's body move (hop, giggle, doze, sway, ponder)
  runs on the figure box and the Zs and hearts on two roots of their own,
  so at rest in any mood the figure is 0 layouts and 0 paints
  (companionperf.js, atlaswalk.js, 2026-09-27); what still animates inside
  a layer's svg is a mood's small effects (the sparkles of delighted and
  proud, the thinking dots and node pulses, the sad drops, the confused
  wobble), which the companion's pacer steps at 20 Hz for as long as that
  mood lasts, 20 layouts a second. The hook that would end it is the
  pacer's own (avatars.js `nameMarkBuddyTempo`): skip animations whose
  target is inside an `.atl-layer` svg and let them run free (a repaint of
  one 64 by 92 layer, no layout), or pace them at 10 Hz. [atlas-fable]
  *Opus: what is left is drawing changes that await the owner's read of the review card.*
- **The companion rides with `ScrollTimeline`** (Chromium 115+, so WebView2);
  WebKitGTK falls back to the script follow. Not driven in either desktop
  window. [companion-426]
  *Blocked here: needs a WebView2 or WebKitGTK window.*
- **Sign-in off, not driven**: the desktop window's persistent profile, a
  real second device on the LAN, the prompt card in dark, and whether a
  restored backup's `preferences.json` brings the setting back (a sweep
  can now boot such a data dir: `lib.js` `boot()` returns `signIn: 'app'`).
  [auth-optional]
  *Blocked here: needs the desktop window and a second device.*
- ~~**The vault key is process-wide**~~ built 2026-09-26: the key is granted
  per session (HISTORY.md, "Moved from the plans, 2026-09-26").
- **The dashboard scroll jump (426 u)** was not reproduced by wheel, idle or
  any scroll call; if it recurs, `scrolljump.js` with the owner's
  preferences (`LS=`) and the companion on. [ui-426]
  *Blocked here: needs the owner's preferences (`LS=`) to reproduce.*
- **uipolish-0924 leftovers**: the surface-by-surface pass (its item D);
  the icon-only floor is done and measured by `iconfloor.js`. The footer
  overlap `deadbtn.js` reported was the sweep's, settled 2026-09-26: no tab's
  scroller runs under the status bar (each ends at or above its top, at 1440
  and 390), and the three were controls half scrolled out of their own box,
  whose centre the point test found the bar under; the sweep now checks the
  centre against each scrolling ancestor first, 0 findings at 1440. At 390
  one is left, the graph's `#graph-fullscreen` under a `button.small` (the
  graph agent's). [ui-426]
  *Opus: a surface-by-surface design pass.*
- **The README's OCR shot is the 0.3.2 capture, in dark**: `seed-ocr.js`
  needs a Tesseract binary this sandbox does not have, so it was not retaken
  with the rest (`SKIP=ocr`). [docs-0.3.3]
  *Blocked here: needs a Tesseract binary.*

## The owner's requests on fix/gemini-fixes-5 (PR 157), 2026-09-23: the ledger

Every ask from that session, verbatim in spirit, with its state. The owner:
"make sure you havent missed anything from any of my requests and make sure
all are fullfilled." A row leaves this table only when it is done and
measured; "partial" names what is left.

| Ask | State |
| --- | --- |
| Review and refine Gemini's pass: revert the risky, redo the attempted fixes better | Done |
| Packaged .exe splash; installer optional packages; embedding model missing with no nudge; wrong model in the chat header | Done |
| Toolbars wrapping at 100% zoom; Capture toolbar wrap | Done (notes dock, Capture toolbar) |
| Notes page blank or jumping to the top on edit; mind maps in Find anything; digest filler and "tonight" | Done |
| Per-feature model pickers (and "too big"); agent activity alignment; image filter by kind; done notification for a closed panel; Select all; 29/30/31 note counts | Done |
| Duplicate caption and OCR jobs; CodeQL #423 | Done |
| Themes: Quiet utilitarian default, Paper, Mono, Classic second; card text and alignment; loading screen, graph bar and menus follow the look; page shine toggle | Done |
| Dashboard top calmer; then "squished" and Full the same as Compact | Done (density fix, Full restored) |
| Map node menu grouped; radial ring stays open | Done |
| Pan and drag smoothness on the board and map | Done (style recalc 2439 to 29 ms) |
| "Do that optimisation on the rest of the app" | Done: scroll handlers (back-to-top, scroll edge, graph wheel); Notes raster during scroll 2.7-3.0s to about 0.25s and typing style 1,651 to 350ms (Library agent); board and map style recalc 2,439 to 29ms; left: CodeMirror's own 12ms per key, and map culling at 500 topics (agent running, MINDMAP_PLAN 13a-view) |
| Efficiency: CPU, RAM, network, storage | Measured 2026-09-23: idle network 2 requests and 1.9KB a minute; boot 25 requests, 1.0s to load; JS heap 25MB and 11,001 elements, flat over three rounds of every tab (no leak); CPU on scroll and pan fixed. Left: per-interaction traces for typing and dialogs (Library agent has scroll and typing), 217 document-level listeners worth consolidating |
| Mind map professional refinement: controls findability, View menu size, hint strip over the canvas | Done: node menu, cross-link tool, label drag, cross-links drawn like branches, View menu 714 to 357px, hint strip, discoverability (canvas agent, `canvasconventions.js` 54 of 54) |
| Cross-links look the same as branches | Done |
| Live view markdown rendering and table editing | Done (documents agent) |
| Code documents as a code editor: errors, suggestions | Done (diagnostics, completions) |
| Auto-closing pairs, Enter indentation, format document or selection, quick fixes | Done (code editor agent: 48 of 48 in `doccodeedit.js`, 39 tests; HISTORY "code documents as a code editor, part two") |
| Indent and dedent across the app | Done: note surfaces (Tab bridge), board and map text, documents (code: indent unit and Shift+Tab; prose: the editor's own Tab); chat and single-line fields keep Tab as focus movement on purpose (a keyboard user's way out) |
| Phone designed on purpose; responsive at every resolution | Done for 390, 768 and 1024 (`phonechrome.js`, 0 findings; touch.js clean); 1280, 1920 and 2560 measured with no horizontal overflow on any tab |
| De-vibecode all the UI, surface by surface, not one fix and stop | First pass done on every surface in the audit order below (Notes, dashboard incl. widgets and empty notebook, chat, graph, Library, timeline, reminders, every Settings pane, Finder, palette, notifications, menus, confirm dialogs, lock screen, boot splash, empty states); second pass on the Library, documents, notes and chat running (agent) |
| Note metadata, badges and links redesigned everywhere | Done: one line of facts with a category pill and stable colour dot, #tags, dates as days, connection pills with their menu inside; Settings lists (skills, personas, templates) have title, label and facts |
| More integration between features (INBOX 393) | Partial: Ask Atlas on every object (notes, documents, boards, maps, reminders, files as of 2026-09-23, one wording and glyph, `test_object_actions.py`); the consistency table is WORLD_CLASS_PLAN 1.3; left: the rows that table marks open (Remind me beyond notes, Show in graph for documents, the Library note card's Remind me and Link to) |
| Glass on every surface when glass is on | Done: graph dock and panels, chat composer; a sweep of every positioned surface on every tab with notifications, Find and Settings open (Classic, glass on) finds none translucent without blur; the dock menus are opaque on purpose (`--modal-bg-opaque`, legibility over the editor) |
| Gaps between stacked elements | Done: offline notices; a flush-sibling sweep over every tab and six Settings panes finds only hairline-divided list rows, which are flush by design |
| Micro-conventions (double-click rotate handle to reset, and the rest) on board, map, documents and every surface | Placed (WHITEBOARD_PLAN, Placed from INBOX 2026-09-23); next agent |
| Suite too slow | Done (parallel, 25 to under 9 minutes) |
| CI red on Python 3.13 | Done: vault key leak between tests, a create_all race (a lock on the singletons), 3.13's JSON trailing-comma position |
| Graph: Documents switch did nothing; options panel arrows and field height | Done |
| Settings: "?" buttons misaligned and missed; pane titles; section headers; flattened badges hard to read | Done: one right edge for every "?", a title on every pane, item rows with a hierarchy |
| Guided tour broken past slide one | Done: re-enabled; overlays closed before each step, phone steps point at More, a fixed counter, typing left alone; `tour.js` 118 of 118 steps at 1440, 1184 and 390 (`archive/agent-remaining/tour.md`) |
| Second de-vibecoding pass of the whole app, especially the Library; micro-conventions everywhere; optimisation | In progress: orchestrator did Settings (intros, pane titles), Finder, palette, notifications, lock screen, Timeline rows, graph options heads, reminders rows, dashboard tiles; Library/documents/notes/chat pass merged (list conventions 18 of 18); Guide panel and IA read, map culling, Ask citations agents running |
| Agents commit often so nothing is lost | Done (agents told; the hourly check-in merges gated agent commits and pushes) |
| Chip colours; Atlas personality; code completions (Emmet `!`, CSS values, inline); radial More menu; dashboard head; link pill corners; page shine (INBOX 394) | Done (head at the fold reverted at the owner's word) |
| VS Code features: language-aware Ctrl+/, Emmet beyond HTML, rename tag, swatches, hover docs, guides, symbols, Alt+Z, sticky scroll (INBOX 402) | Done (codecomplete agent) |
| Code files: snippets, Run with a console, go to definition, find across documents (INBOX 404) | Done for JS and HTML. Open: Python Run via a Pyodide download extra and TypeScript via a vendored type-stripper (recommendations taken per standing order 3; next agent slot) |
| Prose files: grammar (Harper), suggestion mode, read aloud, accessibility check, Word round trip (INBOX 401, 404) | Done (proseeditor agent) |
| Menus with bad widths, spacing, alignment; the trust bar (INBOX 403) | Done for menus: 325 findings to 0 (`menus.js`), arrow keys and focus in every menu; the bar stands for every pass |
| Pan glitches from style invalidation, app-wide; architecture review (INBOX 400) | Done: review in ANALYSIS.md; Notes 61 to 28ms, Library 283 to 32ms, Timeline 89 to 46ms; hover filters gone |
| World class plan rows left; hole poke; installer and update paths; component refinement (INBOX 399) | Update paths verified end to end; package-check workflow added; hole poke and polish agents running; WORLD_CLASS_PLAN row check done 2026-09-24 (table B) |
| Finder headings; back-to-top hover; jump-to-latest flicker; user bubble; model chip and picker with no model; avatars; translation (INBOX 405) | Done. Open: avatars beyond personas (graph people, the user's own mark); translate a text selection (queued) |
| Guide help: more topics, better offline answers (INBOX 406) | Done (top-1 49% to 99%). Open: docs/*.md as a second source, blocked on packaging `docs/` |
| Empty chat scrolls; jump pill on an empty chat (INBOX 407) | Done |
| Graph similarity lines unreadable; no reset to defaults (INBOX 412) | Done: top 2 matches per note, crossings 1,701 to 39, hover scores, a strength slider, Reset to defaults with Undo |
| Split app.js and other large files further | Splits agent running (documents, whiteboard, one app.js surface) |

**De-vibecode audit order** (each surface: list every finding first, then
fix them all, then the next): Notes (list, capture, write, ask), dashboard,
chat, graph, Library (every sub-tab), documents editor, board, map,
timeline, reminders, settings (every pane), dialogs and menus, the finder
and command palette, the status bar and notifications, the lock screen and
loading page.

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
| ~~225~~ | **Done 2026-09-21.** The row was half right: the "the AI" half was swept and linted a week earlier, and the lint has held it since. "The assistant" was never covered, and eight pieces of copy still said it, five of them the Tools and features descriptions a person reads while learning the app. Reworded to name Atlas, and `tests/test_ai_name.py` now carries the second phrase, proved against a reintroduction. "The guide" is deliberately left out: that is a surface with a name. | done |
| 226 | A flicker above the bottom bar on the dashboard, never reproduced here; needs the owner's theme, art setting and zoom. (needs owner: their preferences; HISTORY holds the entry as "not reproduced") | HISTORY, INBOX 226 |
| 213, 220, 228 | Documentation leftovers recorded in their entries. 220 is resolved (HISTORY, "INBOX 220"); 213 and 228 are no longer in INBOX and were both "the owner's, the merge is the last act" (HISTORY, the PR 149 record). (needs owner: the PR merge is theirs) | HISTORY |

**B. Plan tails, by surface**

| Plan | Still open |
| --- | --- |
| DOCUMENTS_PLAN | ~~Phase 4~~ closed 2026-09-20: the templates gallery was verified by `scratchpad/ui-sweeps/doctemplates.js` (six templates, each with a description), and item 5's daily notes were built from the decision in DOCUMENTS_PLAN section 14 and measured by `docdaily.js`, 11 of 11 (7 templates with Daily, the document titled with the ISO day, 0 "start today's note" offers beside a day already written as a document). What is left: the Phase 2, 6 and 8 tails and the engine's three deliberate omissions, in this file's Documents section. Everything else this row used to list was built or already existed: the Library's property filter, outline reorder with folding and a filter box, the command palette and shortcut sheet from one table, version history with its diff and its AI filter, the per-hunk AI diff, reading typography and the print stylesheet (all 2026-09-20 or earlier, each with its probe named in HISTORY.md). |
| UI_MODERNISATION_PLAN | ~~Phase 8's docks over the seven-control ceiling~~: re-measured 2026-09-20 (`docks.js` at 1440): notes 6, graph 6, library 5, chat 4, timeline 4, reminders 4, and only `#wb-topbar` at 13, which the plan names as the menu-bar exception (Insert, Edit, Arrange, View, Board on the dock's zones). Done. Phase 11, the phone done properly: items 1, 2, 3, 5 (its share sheet half), 6, 8 and 9 were built on 2026-09-20, and items 4 (the graph: the hold that opens the node menu and arms the lasso, the controls as one sheet) and 7 (the whiteboard and the map: two fingers for the camera, the tools as a sheet, the board bar at the touch floor) on the same day, each with its own gate in `scratchpad/ui-sweeps/` (`graphphone.js`, `wbphone.js`). Item 5's reader full screen with a bottom bar was built on 2026-09-20 (`scratchpad/ui-sweeps/libreader.js`, the sheet recipe's `page` variant, and a pane-grid bug it found that was wrong at every width under 1100). Item 9's hover-only half was swept properly on 2026-09-20 (`scratchpad/ui-sweeps/hoveronly.js`: 45 reveal rules, eleven stops, `hover: none` emulated and each candidate tapped) and the two it found were both a `hover: none` override written a class short of the rule it had to beat, so neither had ever applied. Item 11's two open gates were closed on 2026-09-20: errors.js was already clean at 390, and contrast.js, which took no viewport and had only ever run at 1440x900, now takes one, reaches Settings the way a phone reaches it, reports how many text elements it measured (which caught the whiteboard being in its tab list with no tab page to open, so it had been measuring an empty window at every width) and comes back 0 low-contrast over 33 surfaces at 390, 820 and 1440 in light and dark. Item 7's leftovers at 820 were measured and fixed in the same pass. What is left of the phase: item 11's screenshot set for the owner. |
| GRAPH_PLAN | ~~All four~~ **stale, checked 2026-09-23**: Phase 5's real gap (a saved view restoring unpinned positions) was built 2026-09-21 and the `?since=` cursor is left until something polls, both on the plan's Phase 5 row; Phase 6 was measured built on 2026-09-20 (this file's Graph section); the local pane's switches are left by the 2026-09-13 decision; 6b the minimap was built 2026-09-13 (`minimap6b.js`). The one line the plan still held, a lasso selection dragging as one, was built 2026-09-23 (`oi-groupdrag.js`). |
| WHITEBOARD_PLAN | Decision 7's other half; the phone context bar comparison; sketch handles at zoom; the arrange panel items. |
| MINDMAP_PLAN | The mapux agent's leftover list (this file's Mind map section). |
| CHAT_PLAN | ~~Phase 1's other half, which note grounds a sentence~~ built 2026-09-20 (the fixtures exist, 18 of 18 attributed, was 17 of 18); ~~Phase 1's fourth gate line~~ built 2026-09-21 and its replay tail 2026-09-23, so Phase 1 is closed; Phase 4's harness items were closed 2026-09-20, and what is left is its `evals` breadth (WORLD_CLASS_PLAN 9). |
| TIMELINE_PLAN | ~~Section 7's two measurements~~ taken 2026-09-20, and both found a bug: the density strip hid on a note count (it hid a profile of 150 notes and showed a comb of 200) and the table drew no title column at all between 600 and 1024. Both fixed and re-measured. The third line, the "auto" scale thresholds, was tuned 2026-10-04 (HISTORY, "the auto scale"). |
| AGENT_SKILLS_REFORM | ~~Phase D verified against a real model, which needs WORLD_CLASS_PLAN section 9's dev-only runner first.~~ **Done 2026-09-20.** The runner is `scratchpad/llama-dev.sh` and the gate is `tests/test_skills_evals.py`, four `evals` tests that skip at collection without a model: 3 passed and 1 skipped against Qwen2.5-1.5B-Instruct Q4_K_M through llama.cpp, with the skip itself the finding (the run stalled on step 1's `list_tags` contract and said so, rather than ticking it). Record in HISTORY's "Moved from the plans, 2026-09-20". What is left is breadth, and it sits in WORLD_CLASS_PLAN 9: the same gate at 3B and 4B, and an eval each for the rest of CLAUDE.md section 4's unproven list. |
| WORLD_CLASS_PLAN | **Row check done 2026-09-24 (INBOX 399).** Every row read against the code; the built ones moved to HISTORY's "Moved from the plans, 2026-09-24", each open row carries a "State 2026-09-24" line, and the ranked list of 38 is at the top of the plan's section 8. The top ten, by impact: F3 `semantic_search` reading every vector per request; Brief 15's LAN hardening (S1 to S3, S5, S6); B2 durable jobs; D2's connections rail (and 261's `/resurface/near`); I1's night runs and morning card; chunk vectors then I6's evidence cards; I3's questions view; `similar_pairs` cached for link suggestions and tensions; D5 typed properties on notes; the S-sized section 1 lints. Fixed during the check: 283, 285, the Most used widget's picker line, Download .md on a locked notebook, and `/files/gallery`'s paging (F2's frontend half). Built 2026-09-24 after it: row 1 (F3, `semantic_search` on the matrix), row 9 (`similar_pairs` cached) and row 2 (S1, S2, S3, the rest of S5, S6's redirect half, `/debug/health` paths; left `tests/test_lan_mode.py` and the LAN offer). |

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

- ~~DOCUMENTS_PLAN Phase 4 item 5's daily notes, and only that~~ Closed. The account is in HISTORY.md, "OPEN.md rows closed, 2026-10-04".
- ~~Found, not fixed: scratchpad/ui-sweeps/docexports.js fails on a click timeout~~ Closed. The account is in HISTORY.md, "OPEN.md rows closed, 2026-10-04".
- ~~The document surface's aliases have no lint~~ Closed. The account is in HISTORY.md, "OPEN.md rows closed, 2026-10-04".
- ~~The table cell menu is a kebabMenu with ten items and no grouping~~ Closed. The account is in HISTORY.md, "OPEN.md rows closed, 2026-10-04".
- ~~Atomic ranges, the Mod+click affordance and the toolbar's own state~~ Closed. The account is in HISTORY.md, "OPEN.md rows closed, 2026-10-04".
- ~~Outline rows are 24 to 25.2px, under the app's own 28px floor~~ Closed. The account is in HISTORY.md, "OPEN.md rows closed, 2026-10-04".
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
  *Opus: four openers must be found in the page first, then a sweep built and read.*
- ~~clampToolbarMenu's comment says the trigger cannot be reproduced here, and that is now out of date~~ Closed. The account is in HISTORY.md, "OPEN.md rows closed, 2026-10-04".
- **The word menu measures its own width before it is placed.** A
  `position: fixed` box with `left` set and no `right` is shrink-to-fit, so a
  menu with long candidates opened near the right of a narrow card can render
  narrower than the width the placement was computed from. Not observed (every
  case measured sat at the 15rem minimum). Next step if a report arrives:
  measure at `left: 8px` first, then place. [editor-intelligence.md]
  *Left: not observed; measure at `left: 8px` first only if a report arrives.*
- **A finding below the editor's visible box gets a menu drawn over its own
  word.** **2026-10-04: the assertion exists** (`spellwide2.js` fails when the
  menu overlaps the word) **and the case did not reproduce** (table-cell word
  at 551..568 inside a box ending at 584, menu below it, overlap 0 on the
  vertical axis in all five cases); the half that is still open is why
  `docRevealForSuggest` would not bring a word below the box in. Was: Measured in `spellwide2.js`'s table-cell case: the word sits at
  `655..707` in an editor whose visible box ends at `572`, and the menu is
  placed at `440..717`. The sweep reads that as a 0px gap and passes. Two
  things to decide: why `docRevealForSuggest` did not bring that word in (a
  table cell's mark may measure outside the scroller the reveal scrolls), and
  that a placement must never cover the rect it is anchored to, which is worth
  an assertion of its own in both sweeps. [editor-intelligence.md]
  *Opus: why `docRevealForSuggest` will not bring a table-cell word in is an investigation, not a named fix.*
- ~~The writing-suggestion underline is the only surface with no hover affordance~~ Closed. The account is in HISTORY.md, "OPEN.md rows closed, 2026-10-04".
- ~~docFindingAtPoint walks every mark on every pointer event~~ Closed. The account is in HISTORY.md, "OPEN.md rows closed, 2026-10-04".
- ~~The three finding kinds are named in two places~~ Closed. The account is in HISTORY.md, "OPEN.md rows closed, 2026-10-04".

## Graph

- ~~The graph export's style attributes under the CSP~~ Closed. The account is in HISTORY.md, "OPEN.md rows closed, 2026-10-04".
- ~~The options panel scrolls again at 1440x900~~ Closed. The account is in HISTORY.md, "OPEN.md rows closed, 2026-10-04".
- ~~/graph/local has no Show switches~~ Closed. The account is in HISTORY.md, "OPEN.md rows closed, 2026-10-04".
- ~~GRAPH_PLAN Phase 5~~ Closed. The account is in HISTORY.md, "OPEN.md rows closed, 2026-10-04".
- ~~The node popup redesign the owner names~~ Closed. The account is in HISTORY.md, "OPEN.md rows closed, 2026-10-04".
- ~~graph.js's step 5 still fails: "clear trace (a route was drawn: false): NO CHANGE"~~ Closed. The account is in HISTORY.md, "OPEN.md rows closed, 2026-10-04".
- ~~`graph.js` interrupted by a confirm dialog~~ Closed. The account is in HISTORY.md, "OPEN.md rows closed, 2026-10-04".
- ~~scratchpad/ui-sweeps/selectfocus.js fails twice on a notebook with content~~ Closed. The account is in HISTORY.md, "OPEN.md rows closed, 2026-10-04".
- ~~INBOX 66: the lightbox the node panel opens is unreachable while the graph is fullscreen~~ Closed. The account is in HISTORY.md, "OPEN.md rows closed, 2026-10-04".

## Chat and popup agent

- ~~Review of the chat pass and the Library and Timeline pass (2026-09-27)~~ Closed. The account is in HISTORY.md, "OPEN.md rows closed, 2026-10-04".
- **The citation mark's touch box overlaps the lines above and below** (a
  decision to note, not a bug): the `::after` box is 44px tall around a
  13px glyph, so on a phone a tap within 14px above or below a mark opens
  the peek rather than acting on that line's text. By design (6df7310);
  worth a look on an answer dense with marks.
  *Left: by design (6df7310); look only if an answer dense with marks is reported.*
- ~~A pinned citation peek outlived a Tab past Open note~~ Closed. The account is in HISTORY.md, "OPEN.md rows closed, 2026-10-04".
- ~~The chat welcome's blurb wrapping at 1280~~ Closed. The account is in HISTORY.md, "OPEN.md rows closed, 2026-10-04".
- ~~CHAT_PLAN Phase 1, which note grounds a sentence~~ Closed. The account is in HISTORY.md, "OPEN.md rows closed, 2026-10-04".
- **Ask's answer object was measured on the offline branch only.** The sweep
  runs against a server with no model, so `sentences` was empty in every
  measurement and the grounding chips and inline marks under an Ask answer
  were not re-measured. Next step: anyone with a local model runs
  `chatphase3.js` again and adds a line for the sentence count and the mark
  count. [chat-timeline-skills.md]
  *Blocked here: needs a local model.*
- **`chatSourcesPanel` is shared, the renderer is not.** Judged not worth it
  in 2026-09-13: the three surfaces have genuinely different frames around the
  same three shared components. Next step if a fourth surface appears: move
  the Chat bubble's foot onto `renderAskAnswerFoot` (renamed) and delete the
  palette's own `cmdPaletteResultRow`. [chat-timeline-skills.md]
  *Left: a decision, revisit if a fourth surface appears.*
- **SKILLS Phase D: no model ran any of it.** The fake transport answers every
  step, so "a rewritten step fixes a run a 3B model stalled on" is the claim
  the mechanism is for and not one the tests make. The chat control (Edit step
  N, beside Resume) is asserted statically against `app.js` because reaching
  it needs a run that stops, which needs a model. [chat-timeline-skills.md]
  *Blocked here: needs a model (`scratchpad/llama-dev.sh`; `tests/test_skills_evals.py` holds four evals).*
- **The `evals` marker and its fixture set (Brief 13's done-when).** At least
  80% of the built-in skills complete with zero invalid tool calls under
  small-model mode, and a loose-ends fixture of 70 notes with eight planted
  loose ends, all eight found. Deliberately not built against the fake
  transport: a fake calls whatever its script says. File: a new
  `tests/test_skill_evals.py`, marker `evals` registered in `pyproject.toml`
  and the module skipped unless the dev model is reachable. Next step:
  WORLD_CLASS_PLAN 9's runner first. [brief-13-harness.md]
  *Partly built since: the marker and four evals exist (`tests/test_skills_evals.py`); the 80% built-in-skills run and the 70-note loose-ends fixture still need a model.*
- ~~A skill's `verify` block~~ Closed. The account is in HISTORY.md, "OPEN.md rows closed, 2026-10-04".
- ~~The page cap and a large notebook~~ Closed. The account is in HISTORY.md, "OPEN.md rows closed, 2026-10-04".
- **The follow-up chips were stubbed at the route in the sweep**, because
  `/chat/followups` answers `[]` with no model. What is measured is the
  request a chip causes, not the model's choice of question. Worth knowing
  before reading the sweep as proof of the whole feature.
  [chat-timeline-skills.md]
  *Left: a caveat about the sweep, not a bug; the chips' model choice needs a model.*

## Whiteboard and mind map

- ~~Decision 7's other half: the quick-sketch pad still has its own copy of the tool code~~ Closed. The account is in HISTORY.md, "OPEN.md rows closed, 2026-10-04".
- ~~Multiply is worth 3 luminance units on a dark board and 20 on a light one~~ Closed. The account is in HISTORY.md, "OPEN.md rows closed, 2026-10-04".
- ~~A sketch's handles scale with the zoom; a card's do not~~ Closed. The account is in HISTORY.md, "OPEN.md rows closed, 2026-10-04".
- ~~The context bar at phone width, and the plan's half-answered question~~ Closed. The account is in HISTORY.md, "OPEN.md rows closed, 2026-10-04".
- ~~#wb-topbar is 13 controls at 1440 against the dock grammar's ceiling of seven~~ Closed. The account is in HISTORY.md, "OPEN.md rows closed, 2026-10-04".
- ~~The old export popover's CSS still names it in grouped selectors~~ Closed. The account is in HISTORY.md, "OPEN.md rows closed, 2026-10-04".
- **The View menu is 714px of content on a map.** Under about a 730px-tall
  window it still scrolls, which is correct and may still read as the report.
  If it comes back the fix is the menu's own length (four groups, sixteen
  rows), not its placement, which is measured and right from 500 to 1000px
  tall. [visual-c.md]
  *Opus: the menu's own length is a design call.*
- **The mind map's own leftover list was re-checked item by item, 2026-09-20**
  (`agent-remaining/mindmap.md`, "Left to do", rewritten with what a run
  against this head finds). Four of its six items were already done, two of
  them by decisions taken after the list was written: the dock's Layout
  section exists and MINDMAP_PLAN §12.5 decided a map shows no Insert or
  Arrange menu at all, both sweeps take `VIEWPORT`, `mapstrip.js` runs 39/39
  on `#wb-context`, `mapperspective.js` measures every Colour by on a map of
  twenty notes 12/12 (category 5 colours, 4.59:1 to 9.13:1 against the card),
  and `wbrail.js` reads the rail against the bar recipe 6/6. Of what that
  re-check found actually left, ~~**curve control points on a tree edge**~~ and
  ~~**an image in a node**~~ were built 2026-09-21 (MINDMAP_PLAN §12.1 items 2
  and 5, moved whole to HISTORY.md, "Moved from the plans, 2026-09-21";
  `scratchpad/ui-sweeps/mindmapcurve.js` 14/14 and `mindmapimage.js` 12/12, light and dark,
  both now in `scripts/gate.sh`'s sweep list). What is left of that list is the
  AI half, which no sandbox here can exercise.
  *Blocked here: the AI half needs a model.*
- **The whiteboard's own View menu (`.wb-board-menu`) was never reproduced as
  broken.** It has its own max-height-on-open logic (`whiteboard.js`, the
  `wb-board-menu-wrap` toggle listener), unrelated to the `details.dock-menu`
  family INBOX 31's fix targeted. Worth a Chromium check in its own right if
  it is still reported. [batch-a.md]
  *Left: measure in Chromium only if it is reported again.*
- ~~INBOX 12's remainder, owner WHITEBOARD_PLAN~~ Closed. The account is in HISTORY.md, "OPEN.md rows closed, 2026-10-04".
- ~~A colour swatch is 1rem and never grows for a finger~~ Closed. The account is in HISTORY.md, "OPEN.md rows closed, 2026-10-04".

## Timeline

- **WORLD_CLASS D6, the daily journal: the backend is built, the frontend is
  not.** `POST /entries/daily/{date}` creates or returns and
  `GET /entries/daily?through=&days=` gives the calendar strip its days and
  the streak (`tests/test_daily_journal.py`). **Re-read 2026-09-23**: the
  first step is superseded, not missing. `startTodaysNote` deliberately opens
  the composer with the day's title and saves nothing until Save (INBOX 199,
  the comment above it in app.js), which is what removed the duplicate, and
  the POST stays for the agent's own tool. `Ctrl+D` built 2026-09-23 on the
  decision in INBOX 321 (now in HISTORY). Still open: the calendar strip and
  the yesterday and tomorrow pair (the pair sits in the note head, which is
  the notes surface's owner's).
  [chat-timeline-skills.md]
  *Opus: the calendar strip and the yesterday/tomorrow pair are new UI on the notes surface.*
- ~~The timeline strip's threshold~~ Closed. The account is in HISTORY.md, "OPEN.md rows closed, 2026-10-04".
- ~~The timeline table at 820~~ Closed. The account is in HISTORY.md, "OPEN.md rows closed, 2026-10-04".
- ~~The "auto" scale thresholds~~ Closed. The account is in HISTORY.md, "Moved from the plans, 2026-10-04 (the auto scale)".
- ~~The band label sits over the cards scrolled under it~~ Closed. The account is in HISTORY.md, "OPEN.md rows closed, 2026-10-04".
- ~~Timeline Phases 1 to 4~~ Closed. The account is in HISTORY.md, "OPEN.md rows closed, 2026-10-04".

## Library

- **The six descriptions start at six different heights** (1440, six seeded
  cards: the picture runs 144 to 249.9px so the text under it starts wherever
  the picture ends). The accepted cost of equal card heights with optional
  rows, written into the plan's decision. If the owner reads the row as
  ragged, the two other places to put the difference are a hole under the
  short cards or reserved empty rows, both already reported. [image-cards.md]
  *Opus: a layout call the owner may not want changed.*
- **The fold chip is 128.8px of a 156.3px content column at 1440** (82%), so
  on the narrowest tile it still reads as nearly a bar; at the owner's own
  card width, about 330px, it is 39%. The label is the only place left to cut
  and "Text in this image" is the shortest true thing it can say.
  [image-cards.md]
  *Opus: copy and layout judgement.*
- ~~**The Files sub-tab rows were never on screen.**~~ **Measured 2026-09-21.**
  `imagecardfoot.js` seeds PDFs through `/media/upload` and takes `SUBTAB=files`,
  and `imagefold.js` seeds them too. At 1440 in light: a row with nothing to say
  is 160px and one with a description 226.3px, four controls at rest on each,
  the description block 43.5px (the same `--text-md` block a picture card
  draws), the fold summary 1197.6px wide of a 1197.6px column and 32.8px tall
  at contrast 6.02. The full-width fold is by design and is now a number rather
  than an inference: on a Files row it is 100% of the content column, against
  the 82% that was judged nearly a bar on a 156.3px picture tile. The rows are
  `display: flex`, one per line, not the pictures' grid, so an open reading
  moves 0 of 0 row-mates and pushes only its own row, 160 to 167.5px: the hole
  the picture cards were rescued from cannot happen there while that holds, and
  `imagefold.js` is the ratchet on it. Open, and measured rather than guessed: a
  described row leaves 50.3px of slack under its last block against 24.8px on an
  undescribed one, so the two ranks of Files row do not sit on one rhythm.
  [image-cards.md, logs-cards-links.md, readings.md]
- **An uploaded document cannot be given a reading from outside the app.**
  `POST /media/{id}/ocr` and `/media/{id}/vision-ocr` both answer 415 for a
  PDF, because `ocr.OCR_SUFFIXES` and `vision_ocr.VISION_OCR_SUFFIXES` are the
  six image types, so every seeded PDF's fold says "nothing has read this yet"
  and no sweep can measure the Files fold with a reading behind it. A document's
  reading lives in `PageRead` rows instead (`/media/{id}/ocr-page-read`, which
  needs a model). Not a bug on its own; it is the reason the Files fold's filled
  state is still unmeasured. [readings.md]
  *Left: not a bug; a PDF's reading needs a model.*
- **A Files row asks for a PDF first page that this sandbox cannot render.**
  Four `GET /media/pdf-page/<name>/0` 404s per render, one per document row,
  because `pdfpages.render_page` returns None with no rasteriser installed.
  Deliberate: the `<img>` carries an `error` handler that removes itself and
  leaves the type glyph underneath (`renderLibraryImagesGallery`, library.js),
  which is how the fallback is discovered. Recorded so the next agent does not
  chase the console errors `errors.js` would report on that sub-tab.
  [readings.md]
  *Left: deliberate (the glyph fallback); no rasteriser here.*
- **Two pictures in a gallery row are still different sizes when one card has
  nothing to say.** UI_MODERNISATION_PLAN's decision block records why a
  subgrid was rejected (it equalises everything and puts 75px of hole under
  the shortest card). The remaining variance is cards with no caption and no
  facts, which take a taller photograph instead of a hole.
  [logs-cards-links.md]
  *Opus: the subgrid trade-off is already decided in the plan; revisit only on a report.*
- **A tile's Rename and Delete buttons are never in the DOM.** They are
  detached `<button>` objects the kebab's rows `.click()`
  (`renderLibraryImagesGallery`, `library.js`). Deliberate and working, but it
  is a behaviour question: either the buttons belong in the row with the menu
  as the overflow, or they stay detached and that is written down. The dead
  glass-off rules that used to name them are already gone. [visual-c.md,
  image-cards.md]
  *Opus: a behaviour question (buttons in the row or detached and written down).*
- **A caption for an image that has none.** The attach picker's second line
  falls back to the note the picture is used in, then to "No caption yet"; the
  Library can write one (`POST /media/{id}/caption`). An "Ask the model for
  one" action on that line is the obvious next step and was not built because
  it puts a model call behind a row in a picker, which is a decision. File:
  `frontend/js/app.js`, the `caption` entry of the images shape.
  [picker-catalog-readme.md]
  *Opus: a model call behind a picker row is a decision.*
- **The other four picker sources have no thumbnail.** Documents, files and
  maps all have something to show (a first page, a file glyph, `mapPreview`
  already draws a map for the boards gallery). The renderer is ready:
  `shape.thumb` is optional and per source. File: `frontend/js/app.js`,
  `notePickerShape`. [picker-catalog-readme.md]
  *Opus: a per-source thumbnail design in `notePickerShape`.*
- **The Notes (10) and Library (9) docks are still over the seven-control
  ceiling.** The graph's move to six was decided for the graph specifically;
  INBOX 47 records that nothing was decided for these two and that guessing is
  a design call. [graph.md]
  *Opus: INBOX 47, which control count the ceiling means is a design call.*

## Notes and capture

- ~~The Notes categories sidebar overflows at 390px, on every sub-tab~~ Closed. The account is in HISTORY.md, "OPEN.md rows closed, 2026-10-04".
- ~~`textarea.autogrow`'s shared `min-height`~~ Closed. The account is in HISTORY.md, "OPEN.md rows closed, 2026-10-04".
- ~~The note edit form's strip is a clone~~ Closed. The account is in HISTORY.md, "OPEN.md rows closed, 2026-10-04".
- **INBOX 38's bulk-move action is still to build.** The chip and label are
  the visibility fix that lets a person tell which space a survivor is in;
  moving a batch of them is the item's own D2 owner line. [batch-a.md]
  *Opus: a new feature.*
- ~~Boards and maps on a note (INBOX 246)~~ Closed. The account is in HISTORY.md, "OPEN.md rows closed, 2026-10-04".

## App wide: shell, phone and the shared recipes

- ~~Review of the companion's round 5 (3ecadd4 to 69ac76b), 2026-09-26~~ Closed. The account is in HISTORY.md, "OPEN.md rows closed, 2026-10-04".
- **Atlas's `hide` act shows shut eyes and nothing of its hands.** The
  companion's new act (a private note opened) raises both arms over the
  face; Atlas draws its arms under its head in the body layer, so at the
  act's middle both arms sit inside the head's box (armL 1227..1244 x
  77..98 against the head's 1209..1266 x 46..95, `hidecheck.js`) and are
  not seen. Its eyes shut with the lids layer over the act's middle (the
  generic `.nm-eyes` squash flattened them to a 1.3px line 21px above their
  place, transform-box view-box; fixed 2026-09-26, `atl-lids-hide`). Paws
  over the face would need the arms drawn in the front layer for this act,
  a drawing change for the owner's call (atlas-r6-hide-mid.png).
  *Opus: a drawing change for the owner's call.*
- ~~A filled button is 2px shorter than every tonal button beside it, app wide~~ Closed. The account is in HISTORY.md, "OPEN.md rows closed, 2026-10-04".
- **`#doc-ai-verb` and `#graph-layout` still differ in segment radius** (6px
  against 4.2px) because `--radius-inner` resolves differently under the graph
  toolbar. Small, and not chased. [visual-c.md]
  *Opus: `--radius-inner` resolves differently under the graph toolbar; needs a token decision.*
- **`--field-inset` and the segmented track are one tone in light and two in
  dark.** Light has both at `rgba(31, 36, 48, 0.07)`; dark has
  `rgba(0, 0, 0, 0.28)` and `rgba(255, 255, 255, 0.08)`. Light flattens a
  distinction dark makes. Belongs to whoever owns the token file.
  [consistency.md, docks.md]
  *Opus: belongs to the token owner.*
- **`--radius-inner` has four users.** DESIGN.md rule 3 and INBOX 101 declared
  the token and the sketch pad's toolbar, canvas and foot plus the meeting
  stage are the first to reach for it; every other surface inside a `.card`
  still draws `--radius-lg`, which is the concentric rule half applied.
  [popup-redesigns.md]
  *Opus: stale count (about seventeen declarations now); the concentric rule's rollout is design.*
- **The meeting dialog's head row holds two heights**, a 28px `.ghost.small`
  Close beside the 32px `.graph-help-toggle`. Both are app-wide recipes, so
  this is a question about the two recipes rather than about the dialog.
  [popup-redesigns.md]
  *Opus: a question about two app-wide recipes.*
- **An empty line in a small panel has no recipe.** The agent panel uses
  `<p class="muted">` where the index names `.empty-state`, whose 2rem padding
  and centred block would be wrong in a 384px glance panel. Worth a recipe row
  rather than a conversion. [visual-c.md]
  *Opus: a recipe row to design.*
- **The dark shadow sliders saturate earlier than the light ones.** The dark
  alphas are 7 to 11 times the light ones at the same setting, so the ambient
  layer reaches opaque around 14% of a 0 to 50% slider; light's
  `--shadow-lg` clamps at 33%, so both clamp and the structure matches.
  Spreading either across its full range is a separate decision about what the
  slider means. [visual-c.md]
  *Opus: what the slider means is a decision.*
- **`.sidebar-head` is off the dock grammar, deliberately.** It carries
  `min-height: var(--sidebar-toggle-size)`, a negative `margin-top` that meets
  the absolutely positioned collapse toggle, and `padding-right` reserving
  that toggle's lane; two of the three exist because of reports. If a future
  session wants them on the grammar the only safe route is all three at once
  (`frontend/index.html`: `#chat-sidebar` ~1134, `#sidebar` ~523, the
  documents sidebar ~2172; `frontend/css/05-sidebars-themes.css` line 17),
  with `.dock` gaining the three properties behind a `.dock.is-sidebar`
  modifier and `heads.js` run before and after. [docks.md]
  *Left: deliberate; all three properties or none.*
- **Phase 11 item 1's last bullet: the top bar's own reduction at 320.** The
  title, the AI dot and one action. Never measured at 320 with the wordmark,
  the space switcher and the two control clusters in it; nothing at 320 is
  broken. Files: `frontend/css/10-responsive.css` band 4,
  `frontend/index.html` `#top-bar`. Next step: measure the header's content
  width at 320 before deciding what leaves. [ui-phase-11.md]
  *Opus: measure the header at 320 before deciding what leaves.*
- **Phase 11 item 9's other half**: no hover-only affordance (every hover
  state needs a tap equivalent) and long-press replacing right-click app wide.
  The 44px half is built and gated; neither of these is measured anywhere and
  neither has a sweep. [ui-phase-11.md]
  *Opus: a sweep and a design (tap equivalents, long-press).*
- **Phase 11 items 2 to 8, the per-surface shapes.** Measured with `phone.js`:
  none is broken (every tab is one column, has no control under 44px and does
  not scroll sideways at 390x844 or 430x932, both themes). What is not built
  is the shape each item describes: Capture as a full-height sheet, Documents'
  read view by default, Whiteboard view-and-light-edit, Settings as a page
  list. Each is a design step for its surface's owner. [ui-phase-11.md]
  *Opus: each is a design step for its surface.*
- **Band 3 (600 to 820): the header is two rows, 128px at 819.** The band's
  recorded design (the strip cannot fit beside the wordmark at any width in
  the band, and the wordmark is what was reported twice when it was hidden),
  so it is known rather than open. [ui-phase-11.md]
  *Left: known and recorded design.*
- **`.dock-chip-row` has no user in the page** since `cb8060a` (only a comment
  in `index.html` names it). Its rules are in
  `frontend/css/07-whiteboard-misc.css` with a band-4 partner in
  `10-responsive.css`, written as a general recipe rather than as the
  Timeline's, so left whole; `tests/test_ui_recipes.py` holds the page at zero
  uses either way. [ui-phase-11.md]
  *Left: kept whole as a general recipe; the lint holds it at zero uses.*
- **The Dashboard hero is deferred by the owner, not by judgement.** Do not
  touch `.dash-hero`, `.dash-wordmark`, `.dash-greeting`, `.dash-clock*` in
  `frontend/css/03-dashboard-widgets.css`, the hero markup in
  `frontend/index.html` (`#dash-hero`, around line 489), or `dashboard.js`'s
  `renderEmblem($("dash-hero-emblem"), ...)` call. [docks.md]
  *Left: the owner's call, do not touch.*
- **Two icon-gap outliers, both judged deliberate**: 10 meta chips at 3.6px
  (`.chip.when`, `.map-chip`) against the app's 242 controls at 6.4px, and
  `#conv-browse-all` at 17.7px at 1024 only (it is `width: 100%` with
  `justify-content: center`). Revisit only if the owner reads them as
  inconsistent. [consistency.md]
  *Left: judged deliberate.*
- **The Ask results grid is two columns down to 900px.** At 1024 each half is
  356px, which is why the badge has to ellipsise a long model id at all. The
  breakpoint (`@media (max-width: 900px)` on `.chat-grid`,
  01-forms-settings.css) is arguably too low for a panel that holds an answer,
  but moving it is a layout decision the owner has not asked for.
  [ask-head-ocr.md]
  *Opus: a layout decision the owner has not asked for.*
- **`#chat-results`'s second half is the only `.panel-head` with no actions.**
  The next head that wants a control beside its title should take family 8
  rather than inventing a fourth arrangement, which is what the lint is there
  to insist on. [ask-head-ocr.md]
  *Left: a rule for the next head that wants a control.*

- ~~Settings → Extras scrolls sideways by 4px at 820~~ Closed. The account is in HISTORY.md, "OPEN.md rows closed, 2026-10-04".

## Settings and help

- ~~INBOX 235, the Settings Help page and the Models order~~ Closed. The account is in HISTORY.md, "OPEN.md rows closed, 2026-10-04".
- ~~INBOX 237, the built-in Librarian persona is Atlas~~ Closed. The account is in HISTORY.md, "OPEN.md rows closed, 2026-10-04".
- ~~"Advanced response settings" sits 20.8px right of its siblings~~ Closed. The account is in HISTORY.md, "OPEN.md rows closed, 2026-10-04".
- ~~`#settings-tools`'s intro~~ Closed. The account is in HISTORY.md, "OPEN.md rows closed, 2026-10-04".
- **Toggle rows onto one recipe (no lavender-filled bars): not started.**
  [help-popovers.md]
  *Opus: a recipe to design.*
- ~~scratchpad/ui-sweeps/help-popovers.js is not built~~ Closed. The account is in HISTORY.md, "OPEN.md rows closed, 2026-10-04".
- ~~"Not one of the seven tabs carries a `data-help-for` popover"~~ Closed. The account is in HISTORY.md, "OPEN.md rows closed, 2026-10-04".
- ~~The learning loop's Settings section (I9's frontend) is not built~~ Closed. The account is in HISTORY.md, "OPEN.md rows closed, 2026-10-04".
- **The OCR workspace head could not be measured.** `.ocr-toolbar` only exists
  once a file is open in the OCR workspace and the seeded notebook has no path
  to one without a real scan; `05-sidebars-themes.css:1269` names it beside
  `.doc-toolbar` and `.library-head` as having had the same fault.
  `wbtopbar.js` already has a probe pointed at it; the missing piece is a way
  to get a scanned file into the sweep's notebook. [consistency.md]
  *Blocked here: needs a scanned file in the sweep's notebook.*

## Backend

- ~~Security review of the backend batch (2026-09-26)~~ Closed. The account is in HISTORY.md, "OPEN.md rows closed, 2026-10-04".
- **`netbind.host_allowed("localhost.")` and a trailing-dot own name are
  refused** (fail closed, as intended; noted so nobody reads a 421 on
  `localhost.` as a bug). `_own_names()` calls `gethostname` per request
  off loopback, one syscall.
  *Left: intended behaviour, noted so a 421 on `localhost.` is not read as a bug.*
- **The other search surfaces still do their own thing.** `file:
  frontend/js/app.js`, `id: search-one-surface`. The Notes list filters
  client-side with `parseNoteQuery` (which knows `tag:`, `category:`, `is:`
  and phrases, but not `kind:`, `in:`, `before:`, `after:` or `has:`), the
  Library filters its own arrays, and `/entries?semantic=true` is a second
  ranking path. Next step: make the Notes filter call `GET /search` when the
  query carries an operator the client parser does not know, and render the
  returned order; then the Library, then the command palette. One surface per
  commit, each with a sweep. [brief11-retrieval-engine.md]
  *Opus: one surface per commit, each with a sweep.*
- ~~No FTS index rebuild job~~ Closed. The account is in HISTORY.md, "OPEN.md rows closed, 2026-10-04".
- ~~A bulk write can leave the index stale~~ Closed. The account is in HISTORY.md, "OPEN.md rows closed, 2026-10-04".
- ~~The vector matrix forgets by zeroing a row~~ Closed. The account is in HISTORY.md, "OPEN.md rows closed, 2026-10-04".
- ~~has: only knows file~~ Closed. The account is in HISTORY.md, "OPEN.md rows closed, 2026-10-04".
- **The graph signal needs an open note, and the Notes list rarely has one.**
  `file: frontend/js/app.js`, `id: search-open-note`. The list passes `entry_id`
  only in rows view or while editing; in card view the third signal is zero.
  Next step: decide what "open" means on that surface, per the app's own focus
  model. [brief11-retrieval-engine.md]
  *Opus: what "open" means on the card view is a decision.*
- **Global undo of an AI action: a skill run's Undo.** `events.undo`, `POST
  /events/undo` and the Recent activity widget's "Undo what Atlas did" are
  built 2026-09-26 (HISTORY.md, "Moved from the plans, 2026-09-26"). Left: a
  skill run's own Undo calling it with the run's actor and first event id
  (Brief 13). Board items stay "not undoable". [brief7-event-log.md]
  *Opus: Brief 13's run-level Undo.*
- ~~The Timeline and Dashboard activity strips~~ Closed. The account is in HISTORY.md, "OPEN.md rows closed, 2026-10-04".
- **Sync (B6) as log shipping.** `id: events-sync`. Unstarted and no longer
  blocked: it needed the retention rule, which now exists. A compacted
  snapshot ships as a snapshot. [brief7-event-log.md]
  *Opus: a large unstarted feature.*
- ~~filing_state = "auto" is set on the two create paths only~~ Closed. The account is in HISTORY.md, "OPEN.md rows closed, 2026-10-04".
- ~~The Reminders tab still reads one page~~ Closed. The account is in HISTORY.md, "OPEN.md rows closed, 2026-10-04".
- ~~Other first-page-only callers, one call each~~ Closed. The account is in HISTORY.md, "OPEN.md rows closed, 2026-10-04".
- ~~POST /learned/bulk~~ Closed. The account is in HISTORY.md, "OPEN.md rows closed, 2026-10-04".
- **I1's later passes**: tensions, duplicates, entities and dates as kinds in
  the same table. `ai/tensions.py` and `ai/entities.py` already produce the
  first two in their own shapes; folding them in means giving each a span and
  a `DerivedFact` row, not a second pipeline. [learning-loop.md]
  *Opus: folding tensions and entities into the fact table is design.*
- ~~**The morning card**~~ built 2026-09-26: the "While you were away"
  Dashboard widget (HISTORY.md, "Moved from the plans, 2026-09-26").
- **The four switches with no runner yet** (`margin_reader`,
  `open_questions`, `evidence_checks`, `model_bench`) are stored and reported
  but gate nothing, because their features are not built. Each of those briefs
  adds its `runner_enabled(...)` check. [learning-loop.md]
  *Left: each feature's own brief adds its check.*
- **WORLD_CLASS_PLAN 9's dev-only llama.cpp runner is the blocker behind four
  open items**: the `evals` marker, Skills Phase D's central claim, the
  retrieval engine's real-embedding numbers, and the paging nudge a real small
  model would have to act on. The suite must never depend on it.
  [brief-13-harness.md, chat-timeline-skills.md, brief11-retrieval-engine.md]
  *Left: the runner exists now (`scratchpad/llama-dev.sh`); the four items still need a model.*

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
  *Opus: a 1,058-line rewrite of a retired sweep.*
- **`contrast.js` never visits the Documents tab.** **2026-10-04: `documents`
  is in `TABS` now and `ONLY=document` opens a fixture document and reads
  every view and the outline (0 findings at 1440 both themes, 820 light, 390
  dark); the whiteboard and the mind map are still not covered.** Was: its
  `TABS` constant holds
  seven tabs and documents, whiteboard and mindmap are not among them, so the
  merge gate's contrast step has never measured any of those surfaces. Adding
  the three is a two-line change that will almost certainly find pre-existing
  findings, which is a session of its own. [doc-sidebar.md]
  *Opus: whiteboard and mind map will find pre-existing findings, a session of their own.*
- ~~`menus.js` timing out at its last step~~ Closed. The account is in HISTORY.md, "OPEN.md rows closed, 2026-10-04".
- ~~`notessubtabs.js` counting the hidden native selects~~ Closed. The account is in HISTORY.md, "OPEN.md rows closed, 2026-10-04".
- **A check that cannot tell "nothing matched" from "labels are broken" cries
  wolf on every small fixture.** Two of `graph2.js`'s five failures were
  exactly that, measured on a scratch profile holding a single note. The
  lesson is the sweep's, not the graph's. [graph.md]
  *Left: a lesson for the next sweep author.*
- **The README tour still has two gaps.** The chat screenshot shows an empty
  conversation (no model in the sandbox), so a machine with Ollama should
  retake `docs/screenshots/chat.png` with a real exchange; and the page reader
  has no shot at all, because it wants a multi-page PDF and an OCR binary and
  this sandbox has neither. Files: `scratchpad/ui-sweeps/readmeshots.js`, the
  `chat` entry. [picker-catalog-readme.md]
  *Blocked here: needs Ollama and a Tesseract binary.*
- ~~"`app.js` is 1.93 MB of source"~~ Closed. The account is in HISTORY.md, "OPEN.md rows closed, 2026-10-04".
- **The launchers want one run on a real Windows machine**: `start.bat`,
  `start.bat --doctor`, `start.bat --shortcut` and `uninstall.bat --dry-run`,
  watching the splash through a first-run install. Everything else in Brief 17
  has been exercised. Two things deliberately left: Copy diagnostics copies
  the step history rather than running `--doctor` live (which would probe the
  port the app is about to bind and talk to the git remote mid-install; the
  safe shape is a `--doctor --offline`), and the dry run's "frees about"
  figure counts `.venv` only on Windows, which is 300 MB of a 305 MB answer.
  [launcher.md]
  *Blocked here: needs Windows.*
- ~~A changelog edit breaking `test_docs_site.py`~~ Closed. The account is in HISTORY.md, "OPEN.md rows closed, 2026-10-04".

## Carried from the agent files archived 2026-10-04

Thirty-three finished agent files moved to [`../archive/agent-remaining/`](../archive/agent-remaining/)
(their finished work is in HISTORY.md; the files had stopped being written to). What each still held that is open is one row here, tagged; the
archived file has the measurements. Rows that were already in this ledger, or
that the head had since built, are not repeated; the ones the check found built
are named in HISTORY.md, "OPEN.md rows closed, 2026-10-04".

`asktab`, `boot`, `briefs-2026-09-13-night`, `chrome-help`, `documents-tail` and
`readings` hold nothing that is not already a row in this ledger or built on
the head, so they carry no row of their own.

- **anim.md**: a `box-shadow` transition over a `backdrop-filter` surface was
  never measured (`animcost.js` is the shape of the probe), and `filter` and
  `backdrop-filter` are not in the transition lint because nothing transitions
  them. [anim]
  *Left: add both to the lint and measure only if a glass shadow transition is ever added.*
- **arch.md**: the Dashboard emblem is most of an idle window's cost (5.55% of
  one core open, 2.09% parked); `entry_revisions` and `audit_log` are never
  pruned; INBOX 266's usability and lightweight items belong to nobody. [arch]
  *Opus: the emblem's frame rate is the owner's call (they asked for "always rotating"); pruning needs a retention rule.*
- **askcite.md**: the Chat tab's Ask mode receives `grounding_live` and ignores
  it, so its inline numbers arrive with the finished answer. [askcite]
  *Opus: new wiring in the Chat tab's renderer, measured against a model.*
- **backend-0926.md**: LAN mode binds `0.0.0.0` only (no IPv6); F7's thread modules
  onto `core/jobs.py` (13 left, `tests/test_flaw_class_lints.py`'s ratchet);
  night passes for tensions and answered questions as `DerivedFact` kinds.
  Not verified: the receipt against a real outbound call, the five UIs in the
  desktop window, LAN from a second device, the `.ics` in a real calendar app.
  [backend-0926]
  *Opus: IPv6 needs a dual-stack bind; the unverified list is blocked here. The Undo row, the night card's scroll and the ledger's flush are closed, HISTORY.md, "OPEN.md rows closed, 2026-10-04".*
- **chat-0926.md**: CHAT_PLAN's "Placed from INBOX" list needs one triage pass
  (72 the popup agent panel, 63 Ask/Write/Capture and 71's Tools table look
  open); the mouse hover row on a question overlaps the answer under it by
  13px while it shows (1280 and 1024, transient, left); the dock's bottom-row
  gap and the chat panel's shadow in the gap were not re-measured; the
  citation peek covers notes only. [chat-0926]
  *Opus: a plan triage and a layout call.*
- **chrome2.md**: `initHelpToggles` runs once at boot over the whole document
  and is re-runnable (wiring.js); anything built after boot with
  `data-help-for` has no lint that it calls it. [chrome2]
  *Opus: a lint that every script-built `data-help-for` caller re-runs it.*
- **codecomplete.md**: Python Run via a Pyodide download extra (INBOX 404's
  recommendation, needs the owner's yes to a download kind of extra) and
  TypeScript Run via a vendored type-stripper; SCSS, Less and SVG are not file
  types, so Emmet has nowhere to run for them. Not verified: WebView2's
  handling of the run sandbox's CSP, the native colour picker's window.
  [codecomplete]
  *Opus: a decision and a vendored dependency each.*
- **companion-r5.md**: the toss on a phone (a quick swipe on the companion
  tosses it) was not tried on a device; `test_unlock_throttle_per_client.py`
  failed once under load and passes alone. [companion-r5]
  *Blocked here: needs a phone; the flake is load, not the test.*
- **featuremodels.md**: smart model routing moves the Guide and its copy does
  not say so (INBOX 288, WORLD_CLASS_PLAN 20 "Still open"); the per-feature
  list lives inside `#models-config`, which Settings hides when no backend
  answers; only the Chat tab shows its pinned model on its surface. [featuremodels]
  *Opus: three design questions.*
- **guide.md**: the Guide's corpus is kept in step with the Help accordion by
  hand (a lint needs the accordion marked up with ids first); retrieval is
  keyword matching, so a question sharing no word with a topic reaches
  nothing (a synonym column is the cheap next step); the accordion cannot
  grow a row without converting its thirteen `<details>` to the named family
  (a visual change across the list, `test_ui_recipes.py`'s ratchet). [guide]
  *Opus: markup plus a ratchet, and a retrieval change that wants a real model's read.*
- **guideia.md**: the Guide is a modal sheet whose scrim dims the app, so
  "Open the Reminders tab" cannot be read against the tab; the Chat empty
  state's "Try asking" chips stay pressable with no model; the rows
  WORLD_CLASS_PLAN 1.3 marks open (Remind me beyond notes, Show in graph for a
  document, the Library note card's Remind me and Link to). [guideia]
  *Opus: non-modal changes `openSheet`'s focus and backdrop contract.*
- **holepoke.md**: seven findings, each with its "why not" in the file's table
  (per-glyph ink offsets for carets, the toast over the phone Notes tabs, a
  ghost select's caret ink, mixed button weights in the reminder row cluster,
  arrow keys in radio groups, one unexplained 404 in the contrast sweep).
  [holepoke]
  *Opus: design decisions, each recorded with its reason.*
- **libtl-0926.md**: the Timeline feed lays out about 39 times a second while
  scrolling (the rows' `content-visibility: auto`, INBOX 400's trade); the
  Library search keystroke was 17 to 191ms under load, not re-measured idle;
  the "Mind maps" chip at zero offers "New concept map" (a naming decision);
  Atlas's feminine right arm sits behind the hair at full size; a mood or act
  change swaps loops rather than cross-fading; the graph tab keeps the
  companion on the bottom bar. [libtl-0926]
  *Opus: drawing-order and animation-blend changes; the rest are measurements to retake idle.*
- **mapcull.md**: freehand and link sketches are not culled (a stroke's box is
  parsed from its path; worth it only when a board with many strokes measures
  slow); `mappan.js`'s fixture posts a `rect` sketch with no path and the
  browser logs "Expected moveto path command" twice. [mapcull]
  *Left: measure a many-stroke board before building.*
- **mapread.md and maprender.md**: 13g, the haywire middle-button pan, needs
  the owner (it never reproduced headless; do not fix blind); the 50-topic
  open is 393ms and not the render; `mapperf.js` takes minutes (whether the
  gate should pass `SIZES=50`); the keyed render is invalidated by one list,
  `wbObjectPaintKey`, which a new paint input must join. [mapread, maprender]
  *Needs owner: 13g. Left: the rest are notes for whoever touches the paint.*
- **maptheme.md**: the branch palette and font choice are map-level facts not
  built (decision 8: `wbMapColors` and `MAP_BRANCH_PALETTE` must agree); a
  topic cannot be pulled back to the app's own default for a themed field; the
  theme is resolved into each node on export rather than carried; an
  `<arrowlink>` written by FreeMind itself is untested. [maptheme]
  *Opus: schema and export design.*
- **mindmap2.md**: `mindmapimage.js` passes 12 of 12 at 390x844 (measured
  2026-10-04); a picture node does not resize to its picture; `mindmap3.js`
  times out at `#wb-boards-generate` (the AI half); `mindmapcurve.js` at
  390x844 passes 11 of 14 (its map is laid out wider than a phone, so the
  hover reveal and the straight-line kink aim at off-screen handles: the
  probe's layout, not the app; the add-button overlap that timed it out was
  the app's and is closed, HISTORY.md). [mindmap2]
  *Opus: lay the curve probe's map out inside 390 wide.*
- **ocr-reading.md**: a page joins the reading panel only once looked at or
  read (nothing reads ahead, deliberately); nothing was verified with a real
  Tesseract or a vision model. [ocr-reading]
  *Blocked here: needs Tesseract and a model.*
- **pass2.md**: typing in a note in a 230-note list costs about 12ms of
  CodeMirror input handling per key; the Library's lists have no user-owned
  order to drag; grey-scale text in composited scrollers on a 1x ClearType
  display was not seen. [pass2]
  *Blocked here: needs a Windows display; the rest is CodeMirror's own cost.*
- **perfpolish.md**: menus leave instantly though they enter with a 160ms
  reveal (an exit needs every close path to wait); the document gutter writes
  a height and reads a layout per gutter. [perfpolish]
  *Opus: every close path (`closeActionMenus`, Escape, outside click) at once.*
- **uipolish-0924.md**: the surface-by-surface pass (its item D) is already a
  row above; `deadbtn.js` findings for Chat's `#chat-export` and
  `#chat-delete` (an `i.ph` at their centre) were never triaged; Settings
  Packages rows leave a 16px gap between title and description. [uipolish-0924]
  *Opus: item D; the two small ones are measurements to retake on this head.*
- **uitrio.md**: the focused dashboard head's `flex: 1 1 20rem` breakpoint was
  measured at 1440 and 390 only; the density picker is hidden below 600 so a
  phone cannot choose Focused; INBOX 301's app-wide navigation and undo
  contracts are placed in WORLD_CLASS_PLAN. [uitrio]
  *Opus: measure 820 and 1024; the picker is a phone-design call.*
- **wbtopbar.md**: `#wb-search-toggle` and `#wb-navigator-toggle` duplicate View
  menu switches (UI_MODERNISATION_PLAN Phase 8 names them as the bar's find
  zone); INBOX 47's counting question (controls a person reasons about, or DOM
  elements) is the reason Notes (10) and Library (9) read as over the ceiling;
  `#wb-context-menu` is not swept (`wbcontextphone.js` is where it belongs).
  [wbtopbar]
  *Opus: INBOX 47 is the owner's rule to state first.*
- **whiteboard-tail.md**: INBOX 276, the sketch pad's toolbar wraps to two rows
  at 820 on Large text; the AI half of the map needs a model. [whiteboard-tail]
  *Opus: the entry's recommendation is the group labels, not the controls.*
- **world-class-rows-1-2-9.md**: `tests/test_lan_mode.py` (the app bound to
  0.0.0.0 in a subprocess) and then the "Allow other devices" toggle in
  Settings (Brief 15); S6's other half (the configured model address on the
  receipt in LAN mode); two decisions taken differently from Brief 15 (S1 is a
  cookie, S3 confines to home and the data folder) that the owner may want to
  confirm; the export-folder preference accepts any writable absolute path; a
  clean full-suite run on that worktree was owed. [world-class-rows-1-2-9]
  *Needs owner: the two decisions. Opus: the LAN test and toggle.*
- **writing-desk.md**: Stop mid-pass is unverified (the stand-in answers in
  about 150ms; a slow backend behind an env var in `fake_openai_server.py`
  would do); the thinking panel has never held real thinking; the five draft
  prompts are tested, not judged; sources are notes only. The readOnly hole
  it named is fixed (CHANGELOG, `draftreadonly.js`). [writing-desk]
  *Blocked here: needs a slow backend and a real model.*

The other agent files in this folder are the ones still carrying live work or
written to in the last two days (`backend-probe`, `mindmap`, `noteobj`,
`notes`, `proseeditor`, `sweeps`, `tourdepth`, `wrapup-0927`, `graph-wb-0926`,
`mapux2`, `openitems`, `sweep-1004`), plus `agent_common.md`, the rules every
agent carries. Their rows are theirs until the work lands or is carried here.

## Not verified

- **The About pane's "Take tour again" button greyed out with the tour off**
  (`frontend/js/settings-wiring.js`, the `onDomReady` block; 2026-09-26). The
  block that disables it never ran before the review (a top-level `typeof
  TOUR_ENABLED` guard read a later script's const, so it was always
  "undefined"); it now runs on `DOMContentLoaded`, which is after tour.js,
  and `tests/test_frontend_load_order.py` holds the shape. `TOUR_ENABLED` is
  true on the branch, so the disabled state itself was not seen in a browser.
- ~~The feminine sash sways on an inner <g>~~ Closed. The account is in HISTORY.md, "OPEN.md rows closed, 2026-10-04".
- ~~The companion's walk lays out and recalculates style 59 times a second~~ Closed. The account is in HISTORY.md, "OPEN.md rows closed, 2026-10-04".
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
- ~~The whiteboard's align and distribute actions were not driven~~ Closed. The account is in HISTORY.md, "OPEN.md rows closed, 2026-10-04".
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
