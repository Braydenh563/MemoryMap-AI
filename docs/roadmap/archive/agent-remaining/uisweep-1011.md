# uisweep-1011: the UI sweep, findings and what is left

INBOX 800, the owner 2026-10-11: "Can you do another devibecoding, ui/ux modernisation and professionalisation sweep across all ui faces??" Measured on the showcase notebook (seed-showcase.py: 82 notes, 8 reminders, 3 documents, a board, a map, 4 chats) at 1440x900 and 390x844 (touch), light and dark, in Chromium. Principle numbers are UI_MODERNISATION_PLAN 13.1's table; recipe names are DESIGN.md's index. Run on a machine at load 15 to 25 with 14.5 of 16 GB in use by sibling servers: five browsers were OOM-killed, and the gaps are named under "Not measured".

## Fixed here (mechanical, one test each in `tests/test_uisweep_1011.py` or `tests/test_ring_room.py`)

Ranked by how visible it is to a person.

| # | Surface | Selector or file:line | Measured before, after | Rule | Commit |
| --- | --- | --- | --- | --- | --- |
| F1 | Mind map, a solid topic (a bold main branch, any topic filled Solid) | `.wb-map-progress` in `.wb-map-node.wb-map-solid`, library-lazy.css | "3/7" drew in `--muted` (102,100,95) on the branch blue (47,91,211): 1.00:1 on 5 map surfaces, and on every surface after it while the map stayed open (contrast.js, 20 surfaces). Now white on the blue (about 5.7:1) in light, black on the pale blue in dark | 13.1 #11 colour as meaning; contrast | 72e9d07a8 |
| F2 | Chat dock, the chosen Ask or Agent segment, keyboard focus | `.chat-dock-controls .seg > button.active:focus-visible`, 08-consistency.css | ring white on an 11% ink pill in Utilitarian, Paper and Mono: 255 on 219, about 1.3:1 (focusring.js, light). Now `--ink`: 28 on 219 (pixels read with pngpixel.py). Dark was 7.03:1 and is unchanged | 13.1 #5 feedback and state; WCAG 2.4.13 | f6d0e7523 |
| F3 | Dashboard page and a widget body, a Tab stop at the bottom edge | `.tab-page`, `.dash-body`, 08-consistency.css (scroll-padding-block) | the ring lost 3.8 to 4.1px of its underside to the scroller (3 stops at 1440, 6 at 390). Now `scroll-padding-block: var(--ring-room)`, 0 on a 40-stop walk | DESIGN "Ring room"; `test_ring_room.py` | e8a0ce705 |
| F4 | Dashboard, the day digest | `renderDayDigest`, dashboard.js:3123 | axe `list` (serious): 1 finding light, 1 dark. Each `li` was `role="link"`, so the `ul` held no list items. The link is a span inside the `li` now; axe 0 at 1440 and 390 light | 13.1 #6 signifiers | e8a0ce705 |
| F5 | Dashboard, Recent activity | `renderActivityWidget`, dashboard.js:4283 | axe `listitem` (serious): 2 findings dark (a plain row beside button rows in a `role="group"` list). The plain row is `role="presentation"` | 13.1 #6 | fd7733c81 |
| F6 | Settings, Background tasks, Run now, at 390 | `.job-run-now` in `.entry-list li`, settings.js:4519 | clip685.js: the ring clipped 4px each side by the row's `overflow: hidden`. Inset ring (`outline-offset: -2px`), measured -2px under :focus-visible | DESIGN "Ring room", the Inset recipe | fd7733c81 |
| F7 | Notes, a card's task boxes | `.entry-task input`, notes-list.js:1526 | vibecheck.js "muted disabled": 1 finding (20 boxes). A title says why ("Open the note to tick this off"); 0 findings at 1440 light and dark and at 390 | 13.1 #6 signifiers | 72e9d07a8 |

### Fixed for INBOX 820 (a note's name as plain words) and the learnability category

| # | Surface | Selector or file:line | Measured before, after | Rule | Commit |
| --- | --- | --- | --- | --- | --- |
| F8 | Every place that names a note: a board's Layers row and spoken name, the palette's chat sources, the graph panel title, menus (Connections, Copy wiki link, Explain), toasts, the Dashboard rows, link and property lists, the phone note page, board exports and the library's save name | `noteNamePlain(content, limit)`, chat-attach.js; 24 call sites (whiteboard.js:4898 and 4905, palette.js:732, graph.js:3560, menus.js, dashboard.js, note-cards.js:2360 and others) | a note whose first line is `**Bold name**`, a code span and a link: by reading the code the Layers row, the palette's source row, the "ask Atlas about this note" name and a map topic's note title took the stored line as it was (a heading mark or flatten only), and the live scan found the Dashboard's digest quote showing it raw (`**Bold name**` and the link's URL). Now every surface reads "Bold name code link tail" (scan of the Dashboard, Notes, Chat, Graph, Library, Timeline, Reminders, the palette, the history menu and a board's notes sidebar for `**`, a backtick, `](` or `[[` beside the probe note: 1 hit before, 0 after; the Layers row and the map topic were not driven live, only `noteNamePlain` on the probe string). `tests/test_ui_recipes.py` bars a first-line split on content outside the helper (7 files hold 12 named non-name splits) | INBOX 820 | 27c284fdf |
| F9 | Reminders, a high or low priority | `reminderItem`, shell-reminders.js:1219, and the month grid's dots | a 3px red left edge (`rgb(176,26,26)`) and a heavier weight were the only signs of "high": no word, title or aria on the row (probe: `title` null, `aria-label` null). A "High priority" or "Low priority" chip now rides on the repeat line; a calendar day's title says "(high priority)" | state by colour only (owner standing rule) | 27c284fdf |
| F10 | Reminders List and Calendar, Open, All, Done, and Notes Select | `setActiveChoice`, chat-attach.js; wiring.js:1696 and 1706, skills.js:1268 | five toggle groups carried their on state as a class (a fill) with no `aria-pressed`: 7 buttons with `.active` and no aria state in the probe (reminders 4, Notes Select once on). Now the class and `aria-pressed` move together | state with no name for a screen reader | 27c284fdf |
| F11 | Dashboard mark (the greeting's emblem) | `#dash-hero-emblem`, dashboard.js:1178 | a right-click or hold menu, no visible control on the card (the same choice is in Settings, Appearance) and no hint. It carries a title now | a gesture with no visible control | 27c284fdf |

| F12 | Notes, Capture, "Add to document" | `labelledMenu`, sheets-selects.js:620; `renderCaptureDocumentAdder`, capture-ask.js:350 | menus.js at 1440 and 1024: 7 rows, no groups (the grammar is groups past five). `labelledMenu` ignored the `group` an item carries; it draws the hairline now and the adder names "Documents" and "New" (separators 0 to 1) | DESIGN, a menu behind a button | the commit after 27c284fdf |

Learnability survey (measured, so a clean row is not read as more than it is). Colour-only states: of 7 tabs a probe found every filled dot of 14px or less and every 2px coloured edge with no title, aria-label or name beside it: the category legend dots (named by the word beside each), the activity heat cells (named by the Less and More scale) and the reminders edge (F9); nothing else. Hidden gestures: 14 `dblclick` and 15 `contextmenu` handlers, 14 long-press uses; every resize handle, the tag chip, the board gestures, the undo and back stack carry a title naming the gesture ("Drag to resize, double-click to reset", "Right-click for more", "right-click for the last N"); the exceptions found are F11 and the phone tab bar's double-tap (back to the first sub-tab, INBOX 659; the sub-tab strip is the visible control) which is left. Modes: Notes Select names itself ("0 selected", Select all, Done); not driven: the board's tools and Present, the graph's link tool, Focus.

## Open, mechanical (not fixed here)

| # | Surface | Selector or file:line | Measured | Rule | Why left |
| --- | --- | --- | --- | --- | --- |
| M1 | The header's six icon buttons, every surface | `header#top-bar` padding 3.5px (`--header-pad-y`, 00-tokens-shell.css:1223) | clip685.js: 6 controls (174 raw) at 1440, the ring cut 0.5px at the window top (button at y=3.5, ring needs 4) | DESIGN "Ring room" | the 44px bar is Phase 12 decision 1; the fix is a 1px ring offset or a 45px bar, one decision for Brief 57 |
| M2 | Library at 390, the strip's chosen tab | `#library-subtabs button.active` | clip685.js: right border 2.3px past the viewport (@319,66,73,44) | DESIGN "Ring room" | the strip should scroll the chosen tab fully in; a scroll-into-view inset, not a ring |
| M3 | Hover without a focus-visible twin, the whole stylesheet | static scan of the 16 stylesheets (a ratchet now: `test_hover_without_a_focus_twin_does_not_grow`, baseline 216) | 216 selectors with a hover rule (a changed fill, colour, border or shadow) and no focus-visible rule on the same selector (08-consistency.css 39, 07-whiteboard-misc.css 39, 04 23, 02 21, 06 20). A keyboard still sees a 2px ring on all 318 stops (focusring.js: 0 weak at 1440 and 390), so this is parity, not a missing ring | 13.1 #5; DESIGN "One hover for every button" | a per-selector edit of 216 rules is a recipe change (one shared `:is(:hover, :focus-visible)` token rule), so Brief 57 |

## Open, design (for Briefs 57 to 59, Opus)

Ranked by how visible it is.

| # | Surface | Selector or file:line | Measured or observed | Rule | Brief |
| --- | --- | --- | --- | --- | --- |
| D1 | Notes dock at 1440 | `.dock[data-dock-name="notes"]` | 10 items, two rows, 86px tall at 1440 with both side panels open (hierarchy.js: Notes 10, Graph 9, Library 9, Timeline 8, Boards 8, whiteboard top bar 11 and its tool group 19, Chat 6 plus 5). At 390 none exceeds 7 because the phone folds by width | 13.1 #2; DESIGN dock grammar (seven at most) | 57 |
| D2 | Notes dock, the Tidy count | `#notes-tidy-count.tab-badge` | a 23x11px pill over the broom's top right corner, 3px past the 28px button and above its top: a count as a badge | DESIGN: a dock count is quiet text, never a pill | 57 |
| D3 | Control heights | consistency.js | 177 of 738 controls at 1440 (49 of 332 at 390) off the 28/32/44 steps. At 1440 the 36px family (the space switcher, the Notes and Library sub-tabs, the timeline day strip, the Add a reminder fields and Add, Chat Send) is 9 of the first 18 listed; 24px chips on note cards and 26px "+6 more links" sit under `--target-min` (28; 44 under touch) at 390 while touch.js, which exempts inline chips, reports 0 under 44 | 13.1 #4, #10 | 57 |
| D4 | Timeline scrubber | `#timeline-scrubber`, 40x592 at x=1363 | a stepped outline path with a flat blue block, no label, no axis; reads as a rendering fault (screenshot, not measured) | 13.1 #1, #4 | 58 |
| D5 | Dashboard Boards and maps widget | `.dash-board-feature` thumbnail, 306x180 | the miniature's text objects overlap ("Next", "Store rev...", "Cut the sign-up fro..." sit over shapes and each other); a thumbnail of a real board should be a clipped picture, not text over text (screenshot, not measured) | 13.1 #4 | 58 |
| D6 | Chat dock at 390 | `.chat-dock:focus-within` ring, `.layout > .tab-main { overflow-x: clip }` | clip685.js: the composer's ring clipped 3px on both sides (the card is edge to edge on a phone); the textarea itself draws no ring by design (the card does) | DESIGN "Ring room" | 59 |
| D7 | Settings, Help section | `settings/help` | 196 buttons at 1440 (155 at 390), 52 in the first view; was 167 (13.1 #1). Skills 100 (was 99), the Notes list 397 buttons at 1440 and 542 at 390 for 82 notes (all notes' buttons are in the DOM). 8 of 20 Settings sections have no filled button at 1440 | 13.1 #1, #9 | 59 |
| D8 | Writing room at 390 | `notes/writing-room` | 3 filled buttons (the floating New note, Compose, Save); Ask 2 at 390 | 13.1 #1; decision 20 (one primary) | 59 |
| D9 | Board menu "How the board looks and which panels are" | `wbmenu` in `#wb-topbar` | menus.js at 1440 and 1024: its section labels (Context bar, Overview, Sidebar, Search; Outline on a map) start 26px left of the rows' text (the rows lead with a 26px mark); one left column is the rule | DESIGN "One left column" | 58 |
| D10 | Writing room, the Length select | `#writing-room` select "Length: Medium" | menus.js at 1024 only: a 203px list for 94px of content | 13.1 #4 | 57 |

## Phase 13 claims this sweep retracted or moved

- "Spacing literals 7.2, 6.4, 4.5, 3.6 and 26.4px leaking into the stylesheet" (13.1 #3): all 5 appear only inside comments now (`grep -nE "(7\.2|6\.4|4\.5|3\.6|26\.4)px" frontend/css/*.css`, 0 declarations).
- "The 13 markup buttons with no text, aria-label or title": a11yname.js 0 findings at both widths; vibecheck.js "unnamed" 0.
- Confirms against undos (13.1 #8): 95 confirm call sites and 95 undo call sites now (was 98 and 46); hierarchy.js counts both.
- menus.js: "Escape does not close" the Settings Extras bundle's More menu and "nothing opened" on the reminder form's Due date and Due time are the sweep's, not the app's (by hand: Escape closes it and returns focus to its opener, one more Escape closes Settings; both date and time openers open their picker, aria-expanded true). Its one `ReferenceError: noteNamePlain is not defined` in the map was the sweep running while the helper was half written; it does not recur (typeof is function before and after opening the map, no page errors).
- Hover feedback: hoverbox.js reported 18 buttons with no hover change at 1440. A real pointer on 11 of them (the reminder form, the header, the status bar, Snooze) changed fill and ink on all 11; the rest are row actions that appear only on the row's hover (the pointer must enter the row first, `.entry-actions` is opacity 0 and pointer-events none until then) and the sweep's "Settings" pass that stayed on Reminders. The sweep's labels are unreliable; `hoverbox.js` needs a row-hover step.

## Measured clean (numbers, so a green is not read as more than it is)

- devibe.js (straight quotes, "..." in copy, emoji icons, gradient text, glows, capsules, text overflow): 0 findings, 1440 light and dark, 390 light and dark; `EXTRA=1` (a document, a board, a map) see below.
- vibecheck.js: 1 finding before (F7), 0 after at 1440 light, 1440 dark and 390. vibefail.js (every API call failed per tab): 0 findings at 1440 and 390.
- a11yname.js: 0 findings. axe.js (wcag22aa): 1440 light 1 then 0, 1440 dark 2 then (F4, F5) fixed, 390 light 0.
- contrast.js: 1440 light 1 (F1), dark 0; 390 light 0 (one translucent worst-case estimate, `.wb-library-item-preview` 4.14, measured 5.4 on its real fill), dark 0 apart from that estimate. rowhover.js: worst 4.77:1, both themes.
- focusring.js: 318 stops at 1440, 12 without a ring (the chat input, a library card title and the editor draw their ring on their card or field), 0 under 2px or 3:1 after F2. iconalign.js: 0 of 174 icon and label pairs off by more than 1px (worst 0.98px). dialogheads.js: all ok at both widths. touch.js at 390: 0 controls under 44px on 16 surfaces.
- Toasts (measured by hand): at 1440 above the status bar (855 against 863), at 390 above the tab bar (723 against 787); the toast host is `aria-live="polite"` (an error toast is not assertive).

## Not measured, or not trusted

- `overlap.js` finished at last: 390 light and dark overflow 11, docks 0, clip 0, no page scrolls sideways (worst: `#entry-list div.entry-meta.note-meta` 16px, `button#notes-tidy` 4px, `#tab-notes div.layout` 4px, the whiteboard container 526px which is the canvas, `#dash-quicklinks` 4px, `#library-view-documents section.card.library-controls` 4px); 1440 light overflow 13, clip 1 (`#dash-grid span.ai-offline-text` 14px over, 13px clipped), `#entry-list span.chip.tag` 2px six times. Rows for Briefs 57 and 58, none a person would call broken; 320 and 820 were not run again. `contrast.js` at 390 dark finished the board and its sidebars but not the map or Settings. `touch.js` reports "Graph dock: 0 controls MEASURED" (the surface did not open) and one covered control on the Dashboard at 390 ("button.ghost.small at 165,522 hits textarea") that did not reproduce at rest.
- Surfaces not driven: the code IDE panes, the OCR workspace, the phone shell's More sheet, the lock screen, and every dialog except the six in dialogheads.js and the Guide. The 18 markup overlays were counted (hierarchy.js), not opened.
- Not on a real Windows font stack, a real model, or a real display scale; the clip685.js "text clipped" group (the dialog titles, 1px, 22 raw) is a content-area against box comparison and the glyph ink fits (ascent 13 and descent 4 in a 19.2px box).

## Next, in order

1. M1 and M3 are one recipe decision for Brief 57 (header ring offset; the shared hover and focus rule).
2. D1 to D3 are the grammar findings Brief 57 already holds (the fold by count, the badge, the 36px family).
3. Re-run `overlap.js` and `contrast.js` at 390 when the machine has memory (WIDTHS=390,1440 THEME=light/dark).
