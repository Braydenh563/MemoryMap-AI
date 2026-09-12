# visual-c: three visual redesigns, what is left

Worktree `agent-a39e62953a9e53b63`, branch `worktree-agent-a39e62953a9e53b63`,
cut from `claude/epic-ramanujan-8xocc0` at `ab7f7f4`. Five commits, not
pushed. Server `:8788`, data dir `/tmp/mm-8788`.

## Done

| Item | Where the numbers are |
| --- | --- |
| GRAPH_PLAN Phase 6, the node panel (INBOX 59) | GRAPH_PLAN.md, "Built, Phase 6" |
| Library image cards (INBOX 56) | INBOX.md entry 56, marked fixed |
| Whiteboard bottom bar, zoom pill and properties panel (INBOX 52, 64, 65) | WHITEBOARD_PLAN.md, "Built, 2026-09-09" |

## Left for the orchestrator

1. **INBOX 64 and 65 have no "fixed" mark**, and that is a merge hazard
   rather than an oversight: both entries were added to `INBOX.md` after
   this worktree was cut (`ab7f7f4`), so they do not exist in the copy this
   branch edits, and writing them here would conflict with the branch's own
   version of the file. The work is done and measured; the numbers are in
   WHITEBOARD_PLAN.md's Built block, ready to paste onto both entries.
   Entry 52 *is* marked fixed, because it predates the cut.

## The two suite failures are not this pass's

Checked against the base commit rather than assumed:

- `test_doc_dock.py::test_the_name_and_the_type_share_a_row` wants
  `id="doc-file-type"` inside `class="doc-dock-identity"`. That section of
  `index.html` is byte-identical to `ab7f7f4` and does not contain it in
  either version, so the select moved and its lint did not. Documents is
  being rewritten by another agent in parallel and was out of bounds here.
- `test_docs_site.py::test_the_mirrored_docs_match_the_originals[CHANGELOG.md]`
  wants `docs/CHANGELOG.md` to match the root copy. Neither file is in this
  branch's diff; the mirror is stale on the branch (`cp CHANGELOG.md
  docs/CHANGELOG.md` is what the test itself suggests).

Everything else in the suite passes.

## Not verified, said plainly

- **A real touch device.** The graph node panel's 390 sheet and the
  whiteboard's panels were measured in a 390px Chromium viewport, which is
  a viewport, not a phone.
- **The align and distribute actions themselves.** Their markup changed
  (labels to icons); their handlers were not touched and were not driven.
- **A real vision model.** The Library card fixture writes the description
  and both readings through the API, so what a model would actually produce
  (length, line breaks) is not what was measured against the three-line
  clamp.
- **The Files rows** share the image tile's builder and were checked with
  one hand-made PDF (`scratchpad/ui-sweeps/seed-file.js`), not with a real
  scanned document.

## Found, not fixed

- **A tile's Rename and Delete buttons are never in the DOM.** They are
  detached `<button>` objects the kebab's rows `.click()`
  (`renderLibraryImagesGallery`, library.js). That is deliberate and works,
  but it means `.library-image-edit` and `.library-image-delete` match
  nothing in a running page, so the `[data-glass="off"]` rules naming them
  (03-dashboard-widgets.css) style nothing at all. Either the rules are
  dead and should go, or the buttons should be in the row and the menu
  should be the overflow. Not touched here: it is a behaviour question, not
  a visual one, and this pass was told to leave those two controls where
  they are.
- **The graph node panel is reachable while the graph is in fullscreen**,
  and INBOX 66 says the lightbox it can open is not. Same phase, not in
  this brief.

---

# visual-c, second pass: the owner's second design batch + INBOX 107c/d

2026-09-12, in the shared worktree on `claude/epic-ramanujan-8xocc0`, server
`:8801`, data dir `/tmp/mm-design2`. Eight commits, not pushed. Every number
below was taken from the running app, not reasoned.

## Fixed, with the measurement

| Item | What it actually was | Numbers |
| --- | --- | --- |
| Boards & maps widget "is ugly" | A square thumbnail drawing its own frame with the board letterboxed inside a second one | 40.5x40.5 box, board 38.5x25.3, 7.6px band top and bottom, 59% fill → 72x40, one frame, 85%. Also "5 images" → "5 items" for text boxes |
| "Square tab corners" | Only the Documents sidebar's tab strip; its hover painted a square grey rectangle with no horizontal padding | radius 0 → 8.4px on the top corners, 49.2px → 62px wide with `--space-2` of room. Everything else tab-like on ten tabs is 8.4/11.2/4.2px |
| "Chat panel shadow" | `.chat-dock:focus-within`'s accent ring, lit by `switchTab`'s own autofocus | `rgba(79,109,245,0.14) 0 0 0 3px` on arrival → none; still 3px on the first key, first press, or a return to the tab |
| "Light vs dark glass" | Three token bugs, all in dark | `--shadow-sm` had no dark value (blue-violet on #0e1017); shadow-strength and sheen-strength sliders both byte-identical at 5% and 40% in dark. Default look unchanged |
| 107c whiteboard menu heights | Capped from the opener's bottom after `placeEscapedMenu` had moved the menu higher | 1440x700 View: top 96, room 604, cap 507, scrolling 594 through 505 → cap 596, no scroll. At 600: 407 → 536 of 544. Nothing within 8px of the window edge at 900/700/600 |
| 107c Ctrl+S in settings | The settings-aware branch had never run: a `shortcuts` binding on the same keys answers first and calls `saveEntry()` | 15 of 17 sections have no Save button on screen, so they now ring the nav button; the ring composes with `#prefs-save`'s resting `rgba(70,100,240,0.25) 0 2px 10px` instead of replacing it; Notes saves again (8 entries → 9) and Documents still saves |
| 107c "the dashboard band" | Nothing had changed there; one real defect in it | Continue pill `flex: 2 1 0` holding 68.7px of text in 535.1px, because its note line was passed as a hint and `.quick-pill` hides hints → 249.4px of note in the same pill |
| 107d segmented mini bars | The app's segmented control with a different set of numbers | track 8.4/2.4/1.6 vs 15.4/4/2.4; segment 26px at 12px type vs 28px at 16px; selected `rgba(79,109,245,0.14)` + drop shadow vs solid accent. Bar 686px → 209px |

## Not reproduced, said plainly

- **"The containers of all the ui in each tab page have hard corner
  rectangular edges so I want that fixed because the shadows make the cut off
  pretty obvious."** Swept every visible element on all ten tabs for a
  `border-radius: 0` carrying a shadow, or a border plus a background
  (`scratchpad/ui-sweeps/squarecorners.js`). The only hit on any tab was
  `footer#status-bar`, which runs edge to edge and is right to be square. At
  1440x900, light mode, one viewport. Not swept at other widths or in dark.
- **"The main chat panel shadow actually reaches all the way down on the
  gap."** Measured: `#chat-main` ends 60.8px above the window bottom and its
  drop shadow is `0 2px 8px`, so it reaches about 10px into that gap, not
  across it. Either this is the accent ring above under another name, or it is
  something this sweep could not see.
- **107c "the pckage headers, badges and buttons still get displaced onto
  separate rows".** Not attempted: it needs Packages populated, and the
  scratch profile has none.

## Found, not fixed

- **`.seg button` draws its label at 16px**, because it sets no `font-size`
  and inherits the body's, while `--text-md` (13.6px) is the "one control
  label size" UI_MODERNISATION_PLAN Phase 3 settled on. The two radio-backed
  bars are on the token; the other twenty-eight are not. One line plus a sweep
  of every strip holding one, which is its own pass. Written into
  DOCUMENTS_PLAN.md's 107d section too.
- **The dark shadow sliders saturate earlier than the light ones.** The dark
  alphas are 7 to 11 times the light ones at the same setting (they have to
  be, over a dark ground), so scaling them proportionally means the ambient
  layer reaches opaque around 14% of a 0-50% slider. Light's own
  `--shadow-lg` clamps at 33%, so both clamp and the structure now matches;
  spreading either across its full range is a separate decision about what the
  slider means.
- **The Boards & maps widget mixes a map chip with a plain title.** A map's
  row draws `mapChip` (a bordered pill) where a whiteboard's draws bold text,
  so two rows of one list are two shapes. That is a recorded decision
  (MINDMAP_PLAN §5 item 12, "a map says it is one, in the row") and standing
  order 3 says it is not remade here; noting it because the thumbnail and the
  meta line now say "map" twice over anyway.
- **`#doc-ai-verb` and `#graph-layout` still differ in segment radius**
  (6px against 4.2px) because `--radius-inner` resolves differently under the
  graph toolbar. Small, and not chased.

## Not verified

- **Dark mode, beyond two screenshots.** The glass work is measured in
  computed values (tokens, alphas, the card's own `box-shadow` string). Two
  dark captures were taken afterwards (`scratchpad/ui-sweeps/darkglassshot.js`,
  the dashboard band and the chat dock) and both read correctly: surfaces
  separate from the page, no ring on the composer on arrival. That is two
  surfaces of many, and it is a look, not a measurement: the luminance column
  `glassdepth.js` takes was not re-run after the shadow tokens changed.
- **A real touch device**, and anything below 390px.
- **The two suite failures in the shared worktree are not this pass's**:
  `test_whiteboard.py::test_a_text_object_round_trips_with_its_own_style` and,
  earlier, `test_ui_recipes.py::test_a_dialog_opts_out_of_the_page_column`,
  both from the other agent's uncommitted `routes_whiteboard.py` and
  `index.html` edits, checked by `git status` at the time.
