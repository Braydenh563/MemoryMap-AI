# Audit 2026-10-05: UX, interaction, accessibility, table stakes

Method: a fresh data dir (`/tmp/mm-audit-ux`, port 8834), first launch driven
by hand in Playwright, then seeded (`seed.js`, `seed-notebook.sh`: 22 notes, a
document, a board, two reminders). Journeys at 1440x900 and 390x844
(isMobile, hasTouch), light and dark, plus `timezoneId: America/New_York` and
`reducedMotion: reduce` contexts. No model running throughout (the default
install). Scripts: `/tmp/claude-0/ux/j*.js`. axe-core (`axe.js`) light and
dark: 0 findings, so names, roles and contrast in the static DOM are clean;
everything below is behaviour axe cannot see.

## 1. Summary: the five worst things

1. **"Remind me, say when in plain words" fails with no model** for
   "call mum tomorrow at 5pm" (HTTP 503), though `ai/when.py` already reads
   that phrase with no model. The offline-first default install cannot set a
   reminder the way the dashboard tells it to.
2. **Dates found in notes land on the wrong day west of UTC, at a made-up
   midnight.** "Dentist appointment on Friday at 3pm" shows on the Timeline
   under "Thu, Oct 8, 8:00 PM" in New York, and "12:00 AM" in UTC.
3. **The first thing every new board shows is broken:** the whiteboard help
   card has 14 of 46 rows with text drawn over its keycaps, and overflows its
   card by 56px.
4. **Search tells a full notebook it is empty.** Any query with no hits in
   the Finder (Ctrl+P) says "Nothing is indexed yet. Save a note and it will
   appear here." with 22 notes indexed; and a one-letter typo ("dentst")
   finds nothing in either search box, although `keyword_search` corrects it.
5. **The same word means three places.** "Ask" is a Notes sub-tab (works
   with no model), a mode in Chat (disabled with no model), the footer button
   (opens a dialog titled "Agent"), and the dashboard's "Ask AI"; and the
   recycle bin, Questions, backups and undo are not findable from Ctrl+K.

Counts: High 4, Medium 9, Low 10.

## 2. Findings, by severity

### High

**UX-01. Plain-words reminders 503 without a model, though a model-free reader exists.** NEW FIXED 67f52f1
- Evidence: Reminders tab, `#reminder-magic` = "call mum tomorrow at 5pm",
  Enter: `POST /reminders/parse` 503, toast "The local AI isn't running, and I
  couldn't read a time from that. Try “in 20 minutes”, or use the form."
  `api/routes_reminders.py:369-381` tries only `reminder_parser.parse_relative`
  ("in N units") before demanding the model. `ai/when.resolve` with no model,
  measured: "call mum tomorrow at 5pm" 2026-10-06 17:00; "dentist next Friday
  at 3pm" 2026-10-16 15:00; "pay rent on 1 November" 2026-11-01 09:00; "water
  plants tonight" 2026-10-05 20:00. `parse_relative` reads none of the four.
- Impact: the dashboard's Quick access "Remind me: Say when, in plain words"
  is a dead end on the default install. Breaks the owner's stated principle
  (HISTORY INBOX 269: "maximise the ability and function of all the
  application features without ai").
- Severity: High.
- Fix: in `parse_reminder_route`, after `parse_relative`, call
  `when.resolve(text, local_now)`; strip the matched phrase from the text with
  `entry/timewords` spans (or a small `when.phrase_span`) via
  `reminder_parser._tidy`; model only when both fail. Tests: the four phrases
  above with `ollama.is_running() == False` return 201. Effort S.

**UX-02. Day-precision dates in notes are stored as naive midnight and shown as UTC instants.** NEW FIXED 79bc2f8
- Evidence: `entry/manager.py:702-707` stores
  `datetime(at.year, at.month, at.day)`; `/timeline` serialises it as
  `2026-10-09T00:00:00+00:00` (`placed_by: "mentioned"`, phrase "on Friday").
  Browser in UTC: Timeline row "Dentist appointment on Friday at 3pm..."
  under "Fri, Oct 9" at "12:00 AM". Same data with
  `timezoneId: America/New_York`: under "Thu, Oct 8" at "8:00 PM"; "on
  Thursday" lands on "Wed, Oct 7, 8:00 PM". `timewords.find` returns
  `Mention(phrase='on Friday', precision='day')` and drops "at 3pm".
- Impact: every user west of UTC (the Americas) sees every mentioned date a
  day early; everyone sees a time the note never said. The Timeline is the
  surface built to answer "what is when".
- Severity: High.
- Fix: send day-precision rows as a date (`"date": "2026-10-09"`, no
  instant) and render them as all-day (no clock) in `timeline.js`, grouping
  by that string, not by `new Date(at)`; optionally extend `timewords` with
  `when._clock` so "on Friday at 3pm" gets `precision: "minute"`. Tests: a
  timeline API test asserting no `+00:00` midnight on day rows; a Playwright
  check under `America/New_York`. Effort M.

**UX-03. Whiteboard help card: text drawn over keycaps, card overflows.** NEW MOVED to the whiteboard agent (full redesign, owner request)
- Evidence: Library, Create, New board, name it: `.wb-empty-hint-inner`
  opens on every new board. Per `li`, text range right edge vs `kbd` left
  edge: 14 of 46 rows overlap, worst "Text box · canvas menu" text to 747px
  over a kbd starting at 645px (102px), "Keep proportions · fit the text"
  169px. Card `scrollWidth` 790 vs `clientWidth` 734 (56px horizontal
  overflow); last row "Export a frame and what it holds" kbd box ends at
  1143px, beyond the card. Cause:
  `frontend/css/07-whiteboard-misc.css` around 9527: `.wb-help-grid li > span
  { white-space: nowrap; min-width: 0 }` with a non-shrinking `kbd`.
- Impact: the first screen of the whiteboard reads as broken; the shortcuts
  it exists to teach are illegible.
- Severity: High (first impression of a whole surface, every new board).
- Fix: let the label wrap (`white-space: normal`) and the kbd wrap its own
  chords (`white-space: normal; text-align: right; max-width: 55%`), or give
  each column `grid-template-columns: 1fr auto` per row; add a sweep that
  asserts no `li` text range crosses its `kbd`, and `scrollWidth <=
  clientWidth`. Effort S.

**UX-04. Finder says "Nothing is indexed yet" on a full notebook; no typo tolerance in either search box.** NEW FIXED ae69431
- Evidence: Ctrl+P, "dentst": chips all 0, "Nothing matched / Nothing is
  indexed yet. Save a note and it will appear here." with 22 notes. Cause:
  `frontend/js/spaces-find.js:1207` sums `finderCounts`, which since the
  "chip counts what this search found" change (`:1044-1057`) holds per-query
  hits, so any empty result reads as an empty index. The route itself
  returns the index size (`GET /search?q=dentst` gives
  `counts: {note: 22, ...}`). Typo: `/search` (search/engine.py) has no
  correction; `search_manager._corrected_terms` (difflib, cutoff 0.8) exists
  but only `keyword_search` uses it. Notes, Your notes, Filter "dentst":
  "No notes match your filter". "dentist" finds both dentist notes in both.
- Impact: a person with a typo is told their notes are not there; the two
  search boxes and Ask disagree on what a typo finds.
- Severity: High.
- Fix: keep `body.counts` as `finderIndexTotals` and test that for the
  "indexed" sentence; when `hits` is empty run the query through the
  corrected terms (expose `_corrected_terms` to `engine.search`, or retry
  `/search` with `corrected=1`) and show "Showing results for dentist".
  Tests: route test for a one-edit typo; a JS test that an empty result on a
  non-empty index says "Try fewer words". Effort S to M.

### Medium

**UX-05. Enter in a document's title does not move to the body.** NEW
- Evidence: Library, Create, New document: focus `#doc-title`; typing "Trip
  plan", Enter, "Day one: arrive in Lisbon." left focus in the title and
  saved the title "Trip planDay one: arrive in Lisbon./"; body empty
  ("Empty" on the dashboard's Recent documents). `documents.js:10858` has an
  `input` listener on `#doc-title` and no keydown.
- Impact: every document started the Notion, Apple Notes or Obsidian way
  ends with its first line in the title.
- Fix: `keydown` Enter (and ArrowDown at end) on `#doc-title` focuses the
  CodeMirror view at line 1. Effort S.

**UX-06. Mind maps: two kinds under swapped names; topics flood the notebook; header count wrong.** KNOWN in part (MINDMAP_PLAN section 2: "mindmap and concept map become one feature, not two"; WORLD_CLASS_PLAN standout 4 "a map node is an entry" is a decision)
- Evidence: the Create dialog row "New concept map: A mind map: a tree of
  topics you move and connect" (`library.js:1867`) makes a board of note
  cards; the mind map kind is only behind New board's "What kind of board:
  Board | Mind map". A concept map "Pets" with Tab, Enter added three notes:
  status bar notes 24 to 27; the header read "Board · Pets (1 item)" while
  `/whiteboard/boards` says `node_count: 3`; the dashboard's Boards & maps
  widget says "3 cards · 2 sketches" (the two links are "sketches"). Phone
  dashboard "Recently added": Cats, Dogs, Pets, Vegetables, Garden; Ask
  "Summarise my notes." cites "Vegetables" and "Garden" as matching records.
  Typing after committing a topic with Enter (focus on `BODY`) fires tool
  shortcuts: "Flowers" created a stray `POST /whiteboard/sketches`.
- Impact: a person making a mind map is not told it writes notes, cannot
  hide them from Notes or Recently added, and sees implementation words.
- Fix: rename the Create row to what it makes, add "New mind map" beside it;
  count items as topics on maps; say "links" not "sketches"; give map-topic
  entries a kind and a "Hide map topics" default in Notes and Recently added;
  after Enter commits a topic, keep focus on the canvas item so letters start
  a rename rather than switching tools. Effort M.

**UX-07. "Ask" names four destinations; Chat offers starters it cannot answer.** KNOWN in part (CHAT_PLAN: "one composer, an agent you reach for")
- Evidence: Dashboard "Ask AI" and "Ask your notebook" open Notes, Ask;
  footer `#status-agent` labelled "Ask" opens a dialog headed "Agent" ("No
  model is connected, so the agent cannot run."); Chat has an Ask/Agent
  segment; the Guide is a fifth question box. With no model Chat's Send is
  disabled (`title` "Chat is answered by the local AI...") yet it shows "Try
  asking: Summarise my notes." and that chip silently switches tab to Notes,
  Ask. Notes, Ask's own starter "What have I saved so far?" answers "none of
  the notes found share enough with your question to quote".
- Impact: a new user cannot predict which box answers what, and the first
  suggested question fails.
- Fix: footer button label "Agent" (or open Notes, Ask with no model);
  Chat with no model hides the starters or says "Opens Ask"; replace "What
  have I saved so far?" with a recency answer (`is_recency_ask` already
  exists in search_manager.py:903) or drop it. Effort S.

**UX-08. Discoverability: the bin, Questions, backups and undo are not in Ctrl+K.** NEW (palette completeness KNOWN as a goal, WORLD_CLASS_PLAN gap table "make it complete")
- Evidence: Ctrl+K "questions", "backup", "undo", "bin", "trash": "No
  matching command, note or document."; "theme": nothing (only "dark" finds
  "Toggle light/dark"). The recycle bin's only door is Library, Filter,
  "Include the bin" (`index.html:5104`); a restore path the owner would not
  guess. Questions is a Notes sub-tab; on the phone the sub-tab strip is
  468px wide in a 364px box and Questions starts at x=388 of 390, off screen.
- Impact: the owner's own report ("is there a way to generate questions
  now") repeats for every feature that lives in a sub-tab or a filter.
- Fix: generate palette rows from every sub-tab (`[role=tab][data-section]`,
  Library `data-target`) and every Settings group, with synonyms (bin,
  trash, deleted; backup, restore; theme, appearance); add a "Bin" entry to
  the Library filter chips (Everything, Notes, ..., Bin). Effort S to M.

**UX-09. The text-selection popup floats over the tab bar after every Ask.** NEW
- Evidence: Notes, Ask, ask anything: the query is auto-selected
  (`#question` selectionStart 0, end 19) and `fieldSelection()`
  (`selection.js:727-741`) offers the writing popup; `elementFromPoint(662,
  68)` is `button[aria-label="Actions for the selected text"]` inside
  `.selection-popup`, over the top navigation. Its menu offers Highlight and
  Bold for a search query.
- Fix: exclude query fields (`#question`, the chat composer when it holds
  a sent query, any `[data-no-selection-popup]`) as `type=search` already is.
  Effort S.

**UX-10. The notes list is 281 Tab stops for 27 notes.** NEW
- Evidence: each card exposes 9 to 11 tabbable controls (category chip, tag
  chips, tag suggestions, favourite, copy, edit, more); `li` elements use a
  roving tabindex (ArrowDown moves card to card) but their children do not,
  so Tab from "Reading list" walks Category, reading, Add to Favourites,
  Copy, Edit, More actions, then the next card's chips.
- Impact: a keyboard user cannot get past the list to the rest of the page;
  at 1,000 notes the list is ~10,000 stops.
- Fix: children `tabindex=-1` except on the active card (or reachable by
  ArrowRight/Left inside a card), the list as `role=listbox` or a grid.
  Effort M.

**UX-11. Export gives no confirmation and contradicts itself; two backup concepts.** NEW
- Evidence: Settings, Import & export, Export Markdown: a browser download
  `memorymap-markdown.zip`, no toast; the panel still reads "Recent exports /
  Nothing exported yet. Files land in /tmp/mm-audit-ux/exports." "Export
  full backup (.zip)" sits beside "Backups / Back up now" (a `.db` snapshot)
  with no word on which one restores. Restore itself is good: confirm
  "Restore this backup? Your current notebook is snapshotted first", focus on
  Cancel.
- Fix: toast "Exported 29 notes as Markdown" and refresh Recent exports;
  one line under each backup kind saying what it is for. Effort S.

**UX-12. With no model, AI features explain themselves only in a tooltip on a disabled button.** NEW
- Evidence: Dashboard Weekly digest: `button.ai-unavailable`
  `disabled: true`, reason only in `title`; Chat Send the same. A disabled
  native button is not focusable and a `title` does not show on touch, so
  keyboard and phone users get no reason (the codebase says so itself,
  `sheets-selects.js:1138`). Chat has an inline banner; the digest does not.
- Fix: the inline "No model is connected..." line with "Connect a model in
  Settings" (the Ask and Chat recipe) on every AI-only widget; or an
  extractive digest (counts, top tags, notes written), per INBOX 269. Effort S.

**UX-13. Phone: the category chip truncates to "Un..." on half the cards.** NEW
- Evidence: 390x844, Notes: `.chip.category` "Uncategorised", label
  `scrollWidth` 87 vs `clientWidth` 33 on 3 of 6 cards (chip 60px wide where
  the meta row also holds "edited"). The `aria-label` is whole.
- Fix: let the meta row wrap, or drop the time to its own line on phone,
  before the chip shrinks. Effort S.

### Low

**UX-14. `title="undefined"` tooltips on menu items.** NEW
- Evidence: Chat's kebab: 5 items with `title="undefined"` (Rename this
  chat, Export as Markdown, Save this chat as a document, Copy the whole
  transcript, Delete this chat). `sheets-selects.js:642` and `:1137` set
  `button.title = item.title` unconditionally; `menus.js:1452` guards it.
- Fix: `if (item.title) button.title = item.title;` in both. Effort S.

**UX-15. The Guide's storage answer names a Settings section that does not exist.** NEW (standing order 13)
- Evidence: Guide, "how do I back up my notes": "Settings -> Data shows
  exactly where it is on disk...", button "Open Settings, Data"
  (`ai/help_chat.py:363`, badge label "Data"); the nav says "Import &
  export". Also "->" where the rest of the app writes "→".
- Fix: the copy and badge label; a test that every help badge label equals
  the Settings nav text for its section. Effort S.

**UX-16. Library "22 words written" on the All view counts documents only.** NEW
- Evidence: Library, All, 29 notes and 2 documents: "22 words written";
  `routes_library.py:864` sums `kind == "document"`.
- Fix: count notes too, or say "22 words in documents". Effort S.

**UX-17. Status copy contradicts itself with no model.** NEW
- Evidence: footer "AI status: Everything works · AI off" (phone: "chat AI
  off"); on the first save of a fresh install the toast said "Saved. Filing
  it in the background, keep writing." and the status bar "Filing a note · 1
  running", while later saves correctly say "Saved in “Uncategorised”: no AI
  model is running to file it."
- Fix: "Notebook ready · AI off"; the first-save copy waits for the model
  status, or uses the no-model sentence when status is unknown. Effort S.

**UX-18. The notes list toolbar scrolls away.** NEW
- Evidence: Notes, Your notes, wheel 1500px: `input[placeholder="Filter
  notes"]` top at -1244px; only the sub-tab strip is sticky. Filter, sort,
  Select and New note need "Back to top" first.
- Fix: make `.notes-toolbar` sticky under the sub-tabs. Effort S.

**UX-19. "Highlight in a colour..." asks the user to type a colour name.** NEW
- Evidence: `selection.js:769-777`, a `promptDialog("Colour: green, blue,
  pink, purple or orange:")` with an error toast for anything else.
- Fix: a swatch row (the existing chip-menu recipe). Effort S.

**UX-20. Terminology drifts for the same object.** NEW
- Evidence: "Move to bin" (menu), "Moved to the recycle bin." (toast),
  "Include the bin" (filter), "Recycle bin" (Settings, General); "concept
  map", "mind map", "map", and a map's header "Board · Garden"; "Ask AI",
  "Ask your notebook", "Ask Atlas", "Ask the agent".
- Fix: one glossary in DESIGN.md and a lint over `index.html` and the JS
  string literals. Effort S.

**UX-21. Shortcuts advertised that a browser tab cannot receive.** NEW, not verified in Chrome UI
- Evidence: the Create dialog shows Ctrl+Shift+N (New note) and
  Ctrl+Shift+D (New document); in Chrome a page cannot intercept Ctrl+Shift+N
  (new incognito window). Fine in the pywebview window; wrong on the LAN or
  browser path.
- Fix: show the hint only in the desktop window, or offer an alternative
  (Alt+N). Effort S.

**UX-22. Reduced motion leaves the emblem turning.** KNOWN (owner decision, `03-dashboard-widgets.css:3226-3253`)
- Evidence: with `reducedMotion: 'reduce'`, `emblem-spin` runs infinite on
  every tab (1 to 2 animations); the in-app Motion setting is the stop. Graph
  rAF is 0 per 3s after settling either way. Recorded so a future audit does
  not reopen it; WCAG 2.2.2 is met through the app setting.

**UX-23. Table stakes still missing.** KNOWN (WORLD_CLASS_PLAN gap table, State 2026-09-24)
- Importers beyond Markdown and Obsidian frontmatter (no Notion zip, ENEX,
  Apple Notes: `grep -i enex src/` finds nothing); sync (B6); reminders fire
  only "while the app is open, or hit Remind on any note" (Reminders tab
  copy); no OS notification when the window is closed except via the tray.
- What is at standard, measured: undo for bin moves (Ctrl+Z restored note
  7, toast "Undone: Moved a note to the bin"), a leave-without-saving confirm
  on a dirty note (focus on Cancel), restore with a snapshot first, bulk
  select with Move to, Tags, Delete; sort with six orders; Tab focus rings on
  every stop measured (dashboard, notes, timeline, reminders, chat: 0
  without a ring; Library 1 of 44, a card); no horizontal scroll at 390px;
  one touch target under 44px on the phone dashboard (Skip to content).

## 3. Claimed built but not

- `spaces-find.js:1203-1206` says the empty state tells "nothing matched"
  from "nothing of that kind exists yet". The later counts change at
  `:1044-1057` broke it: every empty search now says the index is empty
  (UX-04).
- HISTORY row 796 (`ai/when.py`, "35 phrasings resolved, no model") and
  `routes_reminders.py:369-371` ("A phrase the rules can read needs no model
  at all"): the rules Magic Add uses are only "in N units"; the 35-phrase
  reader is wired to the agent's `set_reminder` tool alone (UX-01).
- Standing order 13 ("help moves with the UI"): the Guide's storage topic
  still names "Settings -> Data" (UX-15).
- MINDMAP_PLAN section 2 expected concept map and mind map to become one
  feature; the Create dialog now describes the concept map as "A mind map"
  while the real mind map hides behind a toggle (UX-06).

## 4. Top 5 execution briefs

**Brief A: reminders without a model (UX-01).** Sonnet.
- Goal: Magic Add reads everything `when.resolve` reads, no model.
- Files: `src/memorymap/api/routes_reminders.py` (`/parse`, ~342-400),
  `src/memorymap/ai/when.py`, `src/memorymap/ai/reminder_parser.py`
  (`_tidy`), tests `tests/test_reminders*.py`, `tests/test_when.py`.
- Steps: tests first (four phrases, AI off, 201, due_at and stripped text);
  after `parse_relative` returns None call `when.resolve`; strip the phrase
  (add `when.find_span(text)` returning the matched substring, or reuse
  `timewords.find` spans); keep the 503 only when both fail; update the
  toast copy to name a working example ("tomorrow at 5pm").
- Acceptance: `POST /reminders/parse {"text":"call mum tomorrow at 5pm"}`
  with Ollama stopped returns 201, text "call mum", due tomorrow 17:00 local.
- Risks: the stripped text losing words ("at 5pm" inside a name); keep the
  original text when stripping leaves under two words.

**Brief B: dates in notes are dates, not midnights (UX-02).** Opus.
- Goal: a day mention renders on its own day in every timezone, with no
  clock.
- Files: `src/memorymap/entry/manager.py` (~702), `entry/timewords.py`,
  `api/routes_timeline.py` (~206-225, 604-617), `frontend/js/timeline.js`
  (row time and day grouping), `frontend/js/note-cards.js:1899`.
- Steps: tests first (API: a day row carries `date` and
  `precision: "day"`; Playwright with `timezoneId: America/New_York` puts
  "on Friday" under Friday); serialise day rows as dates; group by the date
  string; render "All day" or no time; optional: let timewords read a
  following time ("at 3pm") with `when._clock` and store minute precision.
- Acceptance: the dentist note under "Fri, Oct 9" in UTC, New York and
  Sydney; no "12:00 AM" on a day row.
- Risks: the heatmap counts (`routes_timeline.py:615`) and the paging
  cursor use `.date()` of the same value; keep them in step.

**Brief C: the board help card (UX-03).** Sonnet.
- Goal: no row's text crosses its keycap; the card never scrolls sideways.
- Files: `frontend/css/07-whiteboard-misc.css` (`.wb-help-grid li`, `li >
  span`, `li > kbd`, ~9490-9545), new sweep
  `scratchpad/ui-sweeps/wbhelpfit.js`.
- Steps: sweep first (per `li`, `Range` of the span vs `kbd` rect; card
  `scrollWidth <= clientWidth`) at 1440, 1024 and 390; let labels wrap,
  kbd `white-space: normal`, keep baseline alignment; re-run; bump `?v=`.
- Acceptance: 0 of 46 overlaps, `scrollWidth == clientWidth`, at three
  widths, light and dark.
- Risks: `test_style_scale.py` and the type ramp; use tokens only.

**Brief D: search honesty and typos (UX-04).** Opus.
- Goal: an empty search on a full index says "Try fewer words" and offers
  the corrected query; a one-edit typo finds the note in the Finder, the
  Notes filter and Ask alike.
- Files: `frontend/js/spaces-find.js` (~1028-1060, 1197-1215),
  `src/memorymap/search/engine.py`, `search/search_manager.py`
  (`_corrected_terms` ~208), `api/routes_search.py`, the Notes filter path in
  `frontend/js/notes-list.js`.
- Steps: tests first (route: `q=dentst` returns the two dentist notes with
  `corrected: "dentist"`); keep index totals separate from chip counts in
  the finder; apply correction in `engine.search` when the first pass is
  empty; show "Showing results for dentist" with a link to search the exact
  word.
- Acceptance: the Finder and the Notes filter both find "dentst"; empty
  results on a non-empty index never say "Nothing is indexed yet".
- Risks: correction must not fire when the exact word exists (it already
  checks the vocabulary); keep the search budget.

**Brief E: five small interaction fixes (UX-05, 09, 14, 15, 17).** Sonnet.
- Goal: the papercuts a new user hits in the first ten minutes.
- Files: `frontend/js/documents.js` (Enter in `#doc-title` focuses the body),
  `frontend/js/selection.js:727-741` (exclude `#question` and chat
  composers), `frontend/js/sheets-selects.js:642, 1137` (guard `title`),
  `src/memorymap/ai/help_chat.py:363` ("Settings, Import & export"),
  `frontend/js/status.js` or wherever "Everything works · AI off" is built.
- Steps: one test or sweep per fix (`test_frontend_handlers.py` style for
  the title key; a DOM scan for `[title=undefined]` across every menu; a
  help-badge-equals-nav-label test); one commit per fix; help surfaces
  updated in the same commits (standing order 13).
- Acceptance: typing "Title", Enter, "Body" yields title "Title" and body
  "Body"; no `.selection-popup` visible after an Ask; 0
  `[title="undefined"]`; the Guide's storage answer opens Import & export.
- Risks: `#doc-title` Enter while an IME composition is active
  (`event.isComposing`).

## 5. What I could not verify

- Anything with a real model: filing, Chat answers, the agent, the digest,
  the Settings, Models path after Ollama is installed (which model to pull,
  whether a pull UI exists); this server ran with
  `MEMORYMAP_NO_AUTO_INSTALL=1`.
- A screen reader's actual speech (axe and DOM names only); Windows real
  scrollbars; the desktop pywebview window; an on-screen keyboard on the
  phone (Playwright cannot raise one).
- OS notifications: the headless context reports `Notification.permission`
  "denied", so the reminder notification itself never fired.
- Sync and multi-device conflicts: none exist to test; the in-app
  edit-conflict path (`edit-conflict.js`) was not exercised.
- Graph keyboard navigation of nodes beyond reaching "Fit map to view".
- Dark theme was checked by axe (0 findings) and two screenshots, not by a
  pixel sweep.
