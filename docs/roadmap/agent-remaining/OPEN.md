# OPEN: everything still open from the agent files, in one place

## Left by the 0.3.3 agents (INBOX 426), 2026-09-26

The four agent files of that round (`companion-426.md`, `atlas-fable.md`,
`ui-426.md`, `auth-optional.md`) are in `archive/agent-remaining/`; what
they left that is still true on the 0.3.3 head is here, one line each. The
two decisions only the owner can take are INBOX 427.

- **Boot gzip budget, what the 2026-10-05 split did not take** (792,754 to
  758,418 bytes, notes-list.js 63,548 to 57,929; `test_static_compression.py`
  has the numbers). Candidates measured and left, each with its catch:
  the chord guide in settings-wiring.js (`showTabJumpHint`, `chordGuideEl`,
  `chordGuideGroup`, about 3 KB gzipped; a stand-in makes the guide appear a
  moment after the first `m`, so the real function would need a "still armed"
  check or the second key can leave it stuck on screen); the SearXNG host
  block in settings-wiring.js (about 3 KB; its caller
  is `renderWebSearch`, a Settings render, so it wants `await ensureModule` there); the Ask
  rendering in capture-ask.js (`askQuestion`, `renderChatMeta`,
  `renderAnswerGrounding`, `placeAnswerFigures`; about 10 KB but read by the
  Ask tab's own submit path, so it is a design judgement, not a move); the
  edit form in notes-list.js (`renderEditForm`, 4.5 KB: `renderEntries` calls
  it synchronously and reads the card it fills, so it needs `openNoteEditor`
  to load the file first and every other way into `editingId` checked).
  [split1005]
- Closed here, accounts in HISTORY.md, "OPEN.md rows closed, 2026-10-04": Stray Atlas heads under the status bar (INBOX 429).
- **`tests/test_name_mood.py` asserts `oklch(from var(--accent)` in the
  CSS**: it holds (the accent tints the glow), but a test for the fixed
  palette would be the honest one. [atlas-fable]
  *Needs: a test for the fixed palette needs the palette's values decided first.*
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
  *Needs: what is left is drawing changes that await the owner's read of the review card.*
- **The companion rides with `ScrollTimeline`** (Chromium 115+, so WebView2);
  WebKitGTK falls back to the script follow. Not driven in either desktop
  window. [companion-426]
  *Needs: a WebView2 or WebKitGTK window.*
- **Sign-in off, not driven**: the desktop window's persistent profile, a
  real second device on the LAN, the prompt card in dark, and whether a
  restored backup's `preferences.json` brings the setting back (a sweep
  can now boot such a data dir: `lib.js` `boot()` returns `signIn: 'app'`).
  [auth-optional]
  *Needs: the desktop window and a second device.*
- ~~**The vault key is process-wide**~~ built 2026-09-26: the key is granted
  per session (HISTORY.md, "Moved from the plans, 2026-09-26").
- **The dashboard scroll jump (426 u)** was not reproduced by wheel, idle or
  any scroll call; if it recurs, `scrolljump.js` with the owner's
  preferences (`LS=`) and the companion on. [ui-426]
  *Needs: the owner's preferences (`LS=`) to reproduce.*
- **uipolish-0924 leftovers**: the surface-by-surface pass (its item D);
  the icon-only floor is done and measured by `iconfloor.js`. The footer
  overlap `deadbtn.js` reported was the sweep's, settled 2026-09-26: no tab's
  scroller runs under the status bar (each ends at or above its top, at 1440
  and 390), and the three were controls half scrolled out of their own box,
  whose centre the point test found the bar under; the sweep now checks the
  centre against each scrolling ancestor first, 0 findings at 1440 and at 390
  (the graph's `#graph-fullscreen` case is closed, HISTORY.md, "OPEN.md rows
  closed, 2026-10-05 (the pre-0.4.0 buildable rows, sweeps on port 8815)").
  [ui-426]
  *Needs: a surface-by-surface design pass.*
- **The README's OCR shot is the 0.3.2 capture, in dark**: `seed-ocr.js`
  needs a Tesseract binary this sandbox does not have, so it was not retaken
  with the rest (`SKIP=ocr`). [docs-0.3.3]
  *Needs: a Tesseract binary.*

## The owner's requests on fix/gemini-fixes-5 (PR 157), 2026-09-23

The ledger moved whole to HISTORY.md, "OPEN.md rows closed, 2026-10-05": its 34 Done rows are done. Its ten partial rows each have a home: 113's CodeMirror cost is pass2's row below; 114's traces and listeners are the frontend performance agent's; 124 is WORLD_CLASS_PLAN 1.3; 127 is WHITEBOARD_PLAN's Placed from INBOX 2026-09-23; 133 is the UX agent's surface pass; 137 is codecomplete's row below; 141 is holepoke's; 142's avatars beyond personas and translate-a-selection are queued in INBOX 405's HISTORY entry; 143 is guide's (WORLD_CLASS_PLAN); 146 is the boot split's row above.

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
| 226 | A flicker above the bottom bar on the dashboard, never reproduced here; needs the owner's theme, art setting and zoom. (needs owner: their preferences; HISTORY holds the entry as "not reproduced") | HISTORY, INBOX 226 |

Rows 238, 246, 232, 253 and 225 are done; their accounts moved whole to HISTORY.md, "Moved from the plans, 2026-10-05 (small-1005: the small open items)".

**B. Plan tails, by surface.** Moved to HISTORY.md, "OPEN.md rows closed, 2026-10-05", 2026-10-05: every row was built or held by its plan. Two stay open: MINDMAP_PLAN's mapux leftover list (this file's Mind map section, the mind map agent's) and UI_MODERNISATION_PLAN Phase 11 item 11's screenshot set for the owner. Section C, the horizon, is WORLD_CLASS_PLAN section 8's own ranked list.

**C. The horizon (WORLD_CLASS_PLAN, one item per PR, in its own stated order)**

H7 the speed budget, H9's perf gate and usage ledger, H1 the night shift,
H2 evidence cards and open questions, H3 the model bench, H6 professional
use (imports, print and PDF, keyboard-complete, WCAG audit, multi-window,
first-run tour; 253 is its first row), H4 the API contract and extensions,
H8 time travel and the margin reader, H5 sync. Behind them the backend
moves B2's second half, B4's pages and citations (its tensions table is built), B6 to B8 and the inventions I1 to I3 and I5 to
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

- Closed here, accounts in HISTORY.md, "OPEN.md rows closed, 2026-10-04": DOCUMENTS_PLAN Phase 4 item 5's daily notes, and only that; Found, not fixed: scratchpad/ui-sweeps/docexports.js fails on a click timeout; The document surface's aliases have no lint; The table cell menu is a kebabMenu with ten items and no grouping; Atomic ranges, the Mod+click affordance and the toolbar's own state; Outline rows are 24 to 25.2px, under the app's own 28px floor; clampToolbarMenu's comment says the trigger cannot be reproduced here, and that is now out of date; The writing-suggestion underline is the only surface with no hover affordance; docFindingAtPoint walks every mark on every pointer event; The three finding kinds are named in two places.
- Closed here, accounts in HISTORY.md, "Moved from the plans, 2026-10-04 (design-1004)": The rest of the app's viewport popups have not been measured with the background art on.
- Closed here, accounts in HISTORY.md, "OPEN.md rows closed, 2026-10-05": A finding below the editor's visible box gets a menu drawn over its own word.

## Graph

- Closed here, accounts in HISTORY.md, "OPEN.md rows closed, 2026-10-04": The graph export's style attributes under the CSP; The options panel scrolls again at 1440x900; /graph/local has no Show switches; GRAPH_PLAN Phase 5; The node popup redesign the owner names; graph.js's step 5 still fails: "clear trace (a route was drawn: false): NO CHANGE"; `graph.js` interrupted by a confirm dialog; scratchpad/ui-sweeps/selectfocus.js fails twice on a notebook with content; INBOX 66: the lightbox the node panel opens is unreachable while the graph is fullscreen.

Left by the graph agent (Brief 38, merged 2026-10-10):

- A tag-named topic's chip repeats the tag chip beside it on the card (`noteTopicChip`, notes-list.js); dedupe against the card's own tags.
- The floating topic rename field is 42px tall over a 17px plate (`gcRenameTopicInline`, graph-canvas.js); not seen by eye, size it to the plate.
- A topic drag writes its core note's pin with its own `PUT /graph/pin` beside the group's one `PUT /graph/pins` (`gcDragEnd`); one write.
- `scratchpad/ui-sweeps/graphfslightbox.js` reads `.lightbox` in the tick it calls the lazy `openLightbox`; the sweep needs an await.
- Topics becoming categories is Brief 39b's (GRAPH_PLAN "Decision made, 2026-10-10").

## Chat and popup agent

- Closed here, accounts in HISTORY.md, "OPEN.md rows closed, 2026-10-04": Review of the chat pass and the Library and Timeline pass (2026-09-27).
- **The citation mark's touch box overlaps the lines above and below** (a
  decision to note, not a bug): the `::after` box is 44px tall around a
  13px glyph, so on a phone a tap within 14px above or below a mark opens
  the peek rather than acting on that line's text. By design (6df7310);
  worth a look on an answer dense with marks.
  *Left: by design (6df7310); look only if an answer dense with marks is reported.*
- Closed here, accounts in HISTORY.md, "OPEN.md rows closed, 2026-10-04": A pinned citation peek outlived a Tab past Open note; The chat welcome's blurb wrapping at 1280; CHAT_PLAN Phase 1, which note grounds a sentence.
- **Ask's answer object was measured on the offline branch only.** The sweep
  runs against a server with no model, so `sentences` was empty in every
  measurement and the grounding chips and inline marks under an Ask answer
  were not re-measured. Next step: anyone with a local model runs
  `chatphase3.js` again and adds a line for the sentence count and the mark
  count. [chat-timeline-skills.md]
  *Needs: a local model.*
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
  *Needs: a model (`scratchpad/llama-dev.sh`; `tests/test_skills_evals.py` holds four evals).*
- **The `evals` marker and its fixture set (Brief 13's done-when).** At least
  80% of the built-in skills complete with zero invalid tool calls under
  small-model mode, and a loose-ends fixture of 70 notes with eight planted
  loose ends, all eight found. Deliberately not built against the fake
  transport: a fake calls whatever its script says. File: a new
  `tests/test_skill_evals.py`, marker `evals` registered in `pyproject.toml`
  and the module skipped unless the dev model is reachable. Next step:
  WORLD_CLASS_PLAN 9's runner first. [brief-13-harness.md]
  *Partly built since: the marker and four evals exist (`tests/test_skills_evals.py`); the 80% built-in-skills run and the 70-note loose-ends fixture still need a model.*
- Closed here, accounts in HISTORY.md, "OPEN.md rows closed, 2026-10-04": A skill's `verify` block; The page cap and a large notebook.
- **The follow-up chips were stubbed at the route in the sweep**, because
  `/chat/followups` answers `[]` with no model. What is measured is the
  request a chip causes, not the model's choice of question. Worth knowing
  before reading the sweep as proof of the whole feature.
  [chat-timeline-skills.md]
  *Left: a caveat about the sweep, not a bug; the chips' model choice needs a model.*

## Whiteboard and mind map

- Closed here, accounts in HISTORY.md, "OPEN.md rows closed, 2026-10-04": Decision 7's other half: the quick-sketch pad still has its own copy of the tool code; Multiply is worth 3 luminance units on a dark board and 20 on a light one; A sketch's handles scale with the zoom; a card's do not; The context bar at phone width, and the plan's half-answered question; #wb-topbar is 13 controls at 1440 against the dock grammar's ceiling of seven; The old export popover's CSS still names it in grouped selectors.
- **The View menu is 714px of content on a map.** Under about a 730px-tall
  window it still scrolls, which is correct and may still read as the report.
  If it comes back the fix is the menu's own length (four groups, sixteen
  rows), not its placement, which is measured and right from 500 to 1000px
  tall. [visual-c.md]
  *Opus: the menu's own length is a design call.*
- **The mind map's own leftover list was re-checked item by item, 2026-09-20**
  (`archive/agent-remaining/mindmap.md`, "Left to do", rewritten with what a run
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
- Closed here, accounts in HISTORY.md, "OPEN.md rows closed, 2026-10-04": INBOX 12's remainder, owner WHITEBOARD_PLAN; A colour swatch is 1rem and never grows for a finger.

### Left by the boardmap agent (the owner's 2026-10-10 list, merged 2026-10-10)

- INBOX 739's documents half: boards and maps name themselves (`wbUntitledNames`, `whiteboard-templates.js`); "Untitled document N" is not built (`documents.js`, Brief 42). 739 stays in INBOX until then.
- Document comments do not yet share the board's thread (Reply, Edit, Resolve, Attach); `whiteboard.js` `wbCommentRow` is the shape to reuse (Brief 42).
- A topic's effect (shadow, glow) and a Phosphor icon do not reach the PNG or SVG picture (`wbBuildExportSvg`, the map-node branch); shapes do.
- The frame-preview clip was reproduced only as the selection canvas lagging a container that grew mid-drag (fixed); the owner's exact trigger is not known.
- "spacing is really close ... bunched up" on insert: gaps measured 26px before and after on both layouts; only the branch's jump to the end was found and fixed. A screenshot if it recurs.
- WHITEBOARD_PLAN "Placed from INBOX, 2026-10-07 (next PR)": 740's frame hint has no edit path and its connector arrow-head set (none, open, triangle, circle, diamond, bar) is not built; 747's "Reset style" for a board object is not built.
- Pre-existing sweep failures on the base scripts: `mapcore.js` 14/16 (a core node's spine and size), `mindmap.js` three FAILs (the Mind map segment's active mark, "an ordinary board shows no map chrome", the P5 template tile click timing out), `mapstyle.js` "Aa grip overlaps the actions".
- `errors.js` at 390 stops on its own second login check (`#lock-password` reads visible after the unlock); 1440, 1024 and 820 report 0 errors.

## Timeline

- Closed here, accounts in HISTORY.md, "OPEN.md rows closed, 2026-10-05": WORLD_CLASS D6, the daily journal: the backend is built, the frontend is not.
- Closed here, accounts in HISTORY.md, "OPEN.md rows closed, 2026-10-04": The timeline strip's threshold; The timeline table at 820; The band label sits over the cards scrolled under it; Timeline Phases 1 to 4.
- Closed here, accounts in HISTORY.md, "Moved from the plans, 2026-10-04 (the auto scale)": The "auto" scale thresholds.

## Library

- Closed here, accounts in HISTORY.md, "OPEN.md rows closed, 2026-10-05": The Files sub-tab rows were never on screen.
- **An uploaded document cannot be given a reading from outside the app.**
  `POST /media/{id}/ocr` and `/media/{id}/vision-ocr` both answer 415 for a
  PDF, because `ocr.OCR_SUFFIXES` and `vision_ocr.VISION_OCR_SUFFIXES` are the
  six image types, so every seeded PDF's fold says "nothing has read this yet"
  and no sweep can measure the Files fold with a reading behind it. A document's
  reading lives in `PageRead` rows instead (`/media/{id}/ocr-page-read`, which
  needs a model). Not a bug on its own; it is the reason the Files fold's filled
  state is still unmeasured. [readings.md]
  *Needs: a local model (`/media/{id}/ocr-page-read`) to fill a PDF's reading; not a bug, and the only route to the Files fold's filled state.*
- Closed here, accounts in HISTORY.md, "OPEN.md rows closed, 2026-10-05": A tile's Rename and Delete buttons are never in the DOM; A caption for an image that has none; The other four picker sources have no thumbnail; The Notes (10) and Library (9) docks are still over the seven-control ceiling.

## Notes and capture

- Closed here, accounts in HISTORY.md, "OPEN.md rows closed, 2026-10-04": The Notes categories sidebar overflows at 390px, on every sub-tab; `textarea.autogrow`'s shared `min-height`; The note edit form's strip is a clone; Boards and maps on a note (INBOX 246).
- Closed here, accounts in HISTORY.md, "OPEN.md rows closed, 2026-10-05": INBOX 38's bulk-move action is still to build.

## App wide: shell, phone and the shared recipes

- Closed here, accounts in HISTORY.md, "OPEN.md rows closed, 2026-10-04": Review of the companion's round 5 (3ecadd4 to 69ac76b), 2026-09-26.
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
  *Needs: a drawing change for the owner's call.*
- Closed here, accounts in HISTORY.md, "OPEN.md rows closed, 2026-10-04": A filled button is 2px shorter than every tonal button beside it, app wide.
- Closed here, accounts in HISTORY.md, "OPEN.md rows closed, 2026-10-05 (op4-1005: four design rows)": the field and the segmented track; an empty line in a small panel; the dark shadow sliders; the Ask results grid's breakpoint.
- Closed here, accounts in HISTORY.md, "OPEN.md rows closed, 2026-10-05 (op4-1005: the concentric rollout)": `--radius-inner` has four users.
- Closed here, accounts in HISTORY.md, "OPEN.md rows closed, 2026-10-05 (op4-1005: the meeting head and holepoke's seven)": The meeting dialog's head row holds two heights; holepoke.md.
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
- Closed here, accounts in HISTORY.md, "OPEN.md rows closed, 2026-10-05": Phase 11 item 1's last bullet: the top bar's own reduction at 320.
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
- **`#chat-results`'s second half is the only `.panel-head` with no actions.**
  The next head that wants a control beside its title should take family 8
  rather than inventing a fourth arrangement, which is what the lint is there
  to insist on. [ask-head-ocr.md]
  *Left: a rule for the next head that wants a control.*

- Closed here, accounts in HISTORY.md, "OPEN.md rows closed, 2026-10-04": Settings → Extras scrolls sideways by 4px at 820.

## Settings and help

- Closed here, accounts in HISTORY.md, "OPEN.md rows closed, 2026-10-04": INBOX 235, the Settings Help page and the Models order; INBOX 237, the built-in Librarian persona is Atlas; "Advanced response settings" sits 20.8px right of its siblings; `#settings-tools`'s intro; scratchpad/ui-sweeps/help-popovers.js is not built; "Not one of the seven tabs carries a `data-help-for` popover"; The learning loop's Settings section (I9's frontend) is not built.
- Closed here, accounts in HISTORY.md, "OPEN.md rows closed, 2026-10-05 (the pre-0.4.0 buildable rows, sweeps on port 8815)": The OCR workspace head could not be measured.

## Backend

- Closed here, accounts in HISTORY.md, "OPEN.md rows closed, 2026-10-04": Security review of the backend batch (2026-09-26).
- **`netbind.host_allowed("localhost.")` and a trailing-dot own name are
  refused** (fail closed, as intended; noted so nobody reads a 421 on
  `localhost.` as a bug). `_own_names()` calls `gethostname` per request
  off loopback, one syscall.
  *Left: intended behaviour, noted so a 421 on `localhost.` is not read as a bug.*
- ~~The other search surfaces still do their own thing~~ Closed. The account is in HISTORY.md, "OPEN.md rows closed, 2026-10-05 (the open-ledger pass)".
- Closed here, accounts in HISTORY.md, "OPEN.md rows closed, 2026-10-04": No FTS index rebuild job; A bulk write can leave the index stale; The vector matrix forgets by zeroing a row; has: only knows file.
- **The graph signal needs an open note, and the Notes list rarely has one.**
  `file: frontend/js/app.js`, `id: search-open-note`. The list passes `entry_id`
  only in rows view or while editing; in card view the third signal is zero.
  Next step: decide what "open" means on that surface, per the app's own focus
  model. [brief11-retrieval-engine.md]
  *Needs: what "open" means on the card view is a decision.*
- Closed here, accounts in HISTORY.md, "OPEN.md rows closed, 2026-10-05": Global undo of an AI action: a skill run's Undo.
- Closed here, accounts in HISTORY.md, "OPEN.md rows closed, 2026-10-04": The Timeline and Dashboard activity strips.
- **Sync (B6) as log shipping.** `id: events-sync`. Unstarted and no longer
  blocked: it needed the retention rule, which now exists. A compacted
  snapshot ships as a snapshot. [brief7-event-log.md]
  *Needs: a large unstarted feature.*
- Closed here, accounts in HISTORY.md, "OPEN.md rows closed, 2026-10-04": filing_state = "auto" is set on the two create paths only; The Reminders tab still reads one page; Other first-page-only callers, one call each; POST /learned/bulk.
- **I1's later passes**: duplicates, entities and dates as kinds in the same
  table (tensions are built: pass 4 of the night run, `ai/facts.py`
  `_pair_passes`). `ai/entities.py` already produces entities in its own
  shape; folding it in means giving it a span and a `DerivedFact` row, not a
  second pipeline. [learning-loop.md]
  *Needs: design, folding entities into the fact table.*
- ~~**The morning card**~~ built 2026-09-26: the "While you were away"
  Dashboard widget (HISTORY.md, "Moved from the plans, 2026-09-26").
- **`evidence_checks` is the one switch with no runner**: stored and shown in
  Settings, gating nothing. `margin_reader` (`api/routes_editor.py`),
  `model_bench` (`api/routes_bench.py`) and `open_questions` (`ai/facts.py`,
  the night pass) read theirs. Evidence cards are built per answer sentence
  (`grounding`, `search/chunks.py`) with no background pass to switch off.
  [learning-loop.md]
  *Needs: a decision on what the switch gates (the per-answer evidence view, or a future background check).*
- **WORLD_CLASS_PLAN 9's dev-only llama.cpp runner is the blocker behind four
  open items**: the `evals` marker, Skills Phase D's central claim, the
  retrieval engine's real-embedding numbers, and the paging nudge a real small
  model would have to act on. The suite must never depend on it.
  [brief-13-harness.md, chat-timeline-skills.md, brief11-retrieval-engine.md]
  *Left: the runner exists now (`scratchpad/llama-dev.sh`); the four items still need a model.*

## Sweeps and tooling

- Closed here, accounts in HISTORY.md, "OPEN.md rows closed, 2026-10-05": `scratchpad/ui-sweeps/editor.js` still describes the retired editor; `contrast.js` never visits the Documents tab.
- Closed here, accounts in HISTORY.md, "OPEN.md rows closed, 2026-10-04": `menus.js` timing out at its last step; `notessubtabs.js` counting the hidden native selects.
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
  *Needs: Ollama and a Tesseract binary.*
- Closed here, accounts in HISTORY.md, "OPEN.md rows closed, 2026-10-04": "`app.js` is 1.93 MB of source".
- **The launchers want one run on a real Windows machine**: `start.bat`,
  `start.bat --doctor`, `start.bat --shortcut` and `uninstall.bat --dry-run`,
  watching the splash through a first-run install. Everything else in Brief 17
  has been exercised. Two things deliberately left: Copy diagnostics copies
  the step history rather than running `--doctor` live (which would probe the
  port the app is about to bind and talk to the git remote mid-install; the
  safe shape is a `--doctor --offline`), and the dry run's "frees about"
  figure counts `.venv` only on Windows, which is 300 MB of a 305 MB answer.
  [launcher.md]
  *Needs: Windows.*
- Closed here, accounts in HISTORY.md, "OPEN.md rows closed, 2026-10-04": A changelog edit breaking `test_docs_site.py`.

## Carried from the agent files archived 2026-10-04

Thirty-three finished agent files moved to [`../archive/agent-remaining/`](../archive/agent-remaining/)
(their finished work is in HISTORY.md; the files had stopped being written to). What each still held that is open is one row here, tagged; the
archived file has the measurements. Rows that were already in this ledger, or
that the head had since built, are not repeated; the ones the check found built
are named in HISTORY.md, "OPEN.md rows closed, 2026-10-04".

`asktab`, `boot`, `briefs-2026-09-13-night`, `chrome-help`, `documents-tail` and
`readings` hold nothing that is not already a row in this ledger or built on
the head, so they carry no row of their own.

- Closed here, accounts in HISTORY.md, "OPEN.md rows closed, 2026-10-05": anim.md.
- **arch.md**: INBOX 266's usability and lightweight items belong to nobody.
  [arch] (The emblem's idle cost is built: HISTORY.md, "OPEN.md rows closed,
  2026-10-05 (docs hygiene before 0.4.0)".)
- Closed here, accounts in HISTORY.md, "OPEN.md rows closed, 2026-10-05": askcite.md.
- **backend-0926.md**: F7's thread modules
  onto `core/jobs.py` (13 left, `tests/test_flaw_class_lints.py`'s ratchet).
  Not verified: the receipt against a real outbound call, the five UIs in the
  desktop window, LAN from a second device, the `.ics` in a real calendar app.
  [backend-0926]
  *Needs: a second device, the desktop window and a calendar app, for the unverified list. The Undo row, the night card's scroll and the ledger's flush are closed, HISTORY.md, "OPEN.md rows closed, 2026-10-04".*
- Closed here, accounts in HISTORY.md, "OPEN.md rows closed, 2026-10-05": chat-0926.md; chrome2.md.
- **codecomplete.md**: Python Run via a Pyodide download extra (INBOX 404's
  recommendation, needs the owner's yes to a download kind of extra) and
  TypeScript Run via a vendored type-stripper; SCSS, Less and SVG are not file
  types, so Emmet has nowhere to run for them. Not verified: WebView2's
  handling of the run sandbox's CSP, the native colour picker's window.
  [codecomplete]
  *Needs: a decision and a vendored dependency each.*
  *Needs owner, 2026-10-05: a Pyodide "download extra" fetches at runtime, which the owner's fully-local rule of 2026-10-05 forbids unless it is vendored (about 10 MB, MPL-2.0); the TypeScript stripper is a vendoring call of the same kind.*
- **companion-r5.md**: the toss on a phone (a quick swipe on the companion
  tosses it) was not tried on a device; `test_unlock_throttle_per_client.py`
  failed once under load and passes alone. [companion-r5]
  *Needs: a phone; the flake is load, not the test.*
- Closed here, accounts in HISTORY.md, "OPEN.md rows closed, 2026-10-05": featuremodels.md; guide.md.
- **guideia.md**: the Guide is a modal sheet whose scrim dims the app, so
  "Open the Reminders tab" cannot be read against the tab. [guideia]
  *Needs: a non-modal Guide changes `openSheet`'s focus and backdrop contract.*
- **libtl-0926.md**: the Timeline feed lays out about 39 times a second while
  scrolling (the rows' `content-visibility: auto`, INBOX 400's trade); the
  Library search keystroke was 17 to 191ms under load, not re-measured idle;
  the "Mind maps" chip at zero offers "New concept map" (a naming decision);
  Atlas's feminine right arm sits behind the hair at full size; a mood or act
  change swaps loops rather than cross-fading; the graph tab keeps the
  companion on the bottom bar. [libtl-0926]
  *Needs: drawing-order and animation-blend changes; the rest are measurements to retake idle.*
- **mapcull.md**: freehand and link sketches are not culled (a stroke's box is
  parsed from its path; worth it only when a board with many strokes measures
  slow). [mapcull]
  *Left: measure a many-stroke board before building.*
- **mapread.md and maprender.md**: 13g, the haywire middle-button pan, needs
  the owner (it never reproduced headless; do not fix blind); the 50-topic
  open is 393ms and not the render; `mapperf.js` takes minutes (whether the
  gate should pass `SIZES=50`); the keyed render is invalidated by one list,
  `wbObjectPaintKey`, which a new paint input must join. [mapread, maprender]
  *Needs owner: 13g. Left: the rest are notes for whoever touches the paint.*
- **maptheme.md**: the theme is resolved into each node on export rather than
  carried; an `<arrowlink>` written by FreeMind itself is untested. [maptheme]
  *Needs: schema and export design.* (The palette, the font and the pin back to
  the app's default are built, MINDMAP_PLAN 13e.)
- **mindmap2.md**: `mindmapimage.js` passes 12 of 12 at 390x844 (measured
  2026-10-04); a picture node does not resize to its picture; `mindmap3.js`
  times out at `#wb-boards-generate` (the AI half); `mindmapcurve.js` at
  390x844 passes 11 of 14 (its map is laid out wider than a phone, so the
  hover reveal and the straight-line kink aim at off-screen handles: the
  probe's layout, not the app; the add-button overlap that timed it out was
  the app's and is closed, HISTORY.md). [mindmap2]
  *Needs: lay the curve probe's map out inside 390 wide. Tried 2026-10-05 (topics 110 wide at x 8, 220 and 250, `mindmapcurve.js`): the reveal check passes (the handle's top element is the svg layer, not a button) but every drag moves 0 (9 of 14), so the layout is not the only thing at 390; not kept.*
- **ocr-reading.md**: a page joins the reading panel only once looked at or
  read (nothing reads ahead, deliberately); nothing was verified with a real
  Tesseract or a vision model. [ocr-reading]
  *Needs: Tesseract and a model.*
- **pass2.md**: typing in a note in a 230-note list costs about 12ms of
  CodeMirror input handling per key; the Library's lists have no user-owned
  order to drag; grey-scale text in composited scrollers on a 1x ClearType
  display was not seen. [pass2]
  *Needs: a Windows display; the rest is CodeMirror's own cost.*
- **perfpolish.md**: the document gutter writes a height and reads a layout
  per gutter. The menu exit is closed, HISTORY.md, "OPEN.md rows closed,
  2026-10-05 (the pre-0.4.0 buildable rows, sweeps on port 8815)". [perfpolish]
- **uipolish-0924.md**: the surface-by-surface pass (its item D) is already a
  row above. Triaged: `deadbtn.js`'s findings for Chat's `#chat-export` and
  `#chat-delete` are visually-hidden, `aria-hidden` proxies the ⋯ rows click
  (index.html ~2335), the sweep's finding and not a dead control; the
  Packages rows' title-to-description gap measures 12.8px at 1440, 1024, 820
  and 390 (`packagesgap.js`), not the 16px reported. [uipolish-0924]
  *Needs: item D, a design pass per surface.*
- **wbtopbar.md**: `#wb-search-toggle` and `#wb-navigator-toggle` duplicate View
  menu switches (UI_MODERNISATION_PLAN Phase 8 names them as the bar's find
  zone); `#wb-context-menu` is not swept (`wbcontextphone.js` is where it
  belongs). INBOX 47's counting question no longer decides anything: the
  Notes and Library docks measure 6 controls each (`docks.js`). [wbtopbar]
  *Needs: the whiteboard agent (a sweep for `#wb-context-menu`).*
- **whiteboard-tail.md**: the AI half of the map needs a model. INBOX 276 (the
  sketch pad's toolbar at 820) is closed, HISTORY.md, "OPEN.md rows closed,
  2026-10-05 (the pre-0.4.0 buildable rows, sweeps on port 8815)". [whiteboard-tail]
- **world-class-rows-1-2-9.md**: two decisions taken differently from Brief 15
  (S1 is a cookie, S3 confines to home and the data folder) that the owner may
  want to confirm; the export-folder preference accepts any writable absolute
  path; a clean full-suite run on that worktree was owed.
  [world-class-rows-1-2-9]
  *Needs: the owner's yes or no on the two decisions and on the export-folder path rule.*
- **writing-desk.md**: Stop mid-pass is unverified (the stand-in answers in
  about 150ms; a slow backend behind an env var in `fake_openai_server.py`
  would do); the thinking panel has never held real thinking; the five draft
  prompts are tested, not judged; sources are notes only. The readOnly hole
  it named is fixed (CHANGELOG, `draftreadonly.js`). [writing-desk]
  *Needs: a slow backend and a real model.*

No per-agent file stays in this folder: the 2026-10-05 pass carried the last
ones' rows below and archived them (`agent_common.md` and `agent_rules_1005.md`,
the rules every agent carries, stay). A running agent writes its own
`<name>.md` here; the next ledger pass carries what it left.

## Carried from the agent files archived 2026-10-05

Thirty-eight finished agent files moved to
[`../archive/agent-remaining/`](../archive/agent-remaining/) (no agent was
running; the finished work is in HISTORY.md). Each row below is what a file
still held that the code, INBOX, BACKLOG and the plans do not already hold,
checked by grep on the head the day they moved; the file named in brackets has
the measurements. Items the plans already carry (the Atlas rows 540 to 575,
WORLD_CLASS_PLAN's B2 and I7 rows, the web clipper's page intake,
UI_MODERNISATION_PLAN's off-band widths, WHITEBOARD_PLAN decisions 30 to 36's
ghosts, line jumps and carried waypoints, AGENT_SKILLS_REFORM's skill-run Undo)
are not repeated. Found built since and dropped: the entity merge Undo, the
note-type, space and conversation delete Undos, `autonomous.reset_state()`,
the `settingsnav.js` skip below 640, `stripground.js` and
`settings-skeletons.js` on the branch, the board card's expanded state (INBOX
238), the lazy graph popup resize stand-in, the reminder chime primed on the
first press, the OCR reading's collapse, Atlas hiding behind a modal, the
Atlas persona text in Settings, the spelling "Boards & maps" and the About
pane's name, the errors sweep's aside clipping at 390.

### Notes, Documents and Library

- **Skeletons for a board's Library and Notes tabs** (INBOX 596): the tabs
  (`whiteboard-library.js`, `wbLoadLibrary`) draw nothing while they load.
  [boardmap-1005, small-1005]
  *Left: the whiteboard's own rail, owned by the WHITEBOARD plan's agent.*

- Closed here, accounts in HISTORY.md, "OPEN.md rows closed, 2026-10-05 (the pre-0.4.0 buildable rows, sweeps on port 8815)": Skeletons for a board's Library and Notes tabs (INBOX 596).
- **Phone selection menus and the selection bar** (documents): iOS and Android
  draw Cut, Copy and Paste above a selection, where the bar also goes; if a
  report arrives the bar goes below the selection on `(pointer: coarse)` (one
  line in `selectionBarShow`). Section 18's chat commands on a phone press
  controls in the chat dock and were never measured against it.
  [documents-1004]
  *Needs: a phone.*
- **Prose tools**: Harper's lint config per kind in the dictionary dialog
  (`harper-worker.js`, `setLintConfig`; about 200 rules, all or nothing today);
  suggestion mode's author and date (CriticMarkup `{>>comment<<}`; export
  writes `MemoryMap` for every revision); a voice and speed picker for read
  aloud (system voices only today). [proseeditor]
  *Checked 2026-10-05: neither is built (`harper-worker.js` turns off the one rule `UseTitleCase` in `HARPER_RULES_OFF` and nothing else; `docReadAloudVoice` in `documents-prose.js` picks the first local voice for the language). Needs a design call: where the two controls live (the dictionary dialog, Settings), what is stored, and the help that moves with them.*
- **Package bundles**: the Word writer's five tests ran once in a scratch venv
  with python-docx 1.2.0 (2026-10-05, `tests/test_docexport_pictures.py` 13 of
  13, none skipped; `test_docexport_bundle.py`, `test_document_import.py`,
  `test_docview_import.py`, `test_extras_bundles.py` 57 passed), but no export
  was opened in Word or LibreOffice; no real pip ran (every bulk test fakes `subprocess.Popen`);
  the bundle groupings are a recommendation (`BUNDLES`, one tuple); the phone
  rows measured clean, not designed further. [extras-bundles]
  *Needs: Word or LibreOffice.*
- **The Writing Room's stretch**: measured at 1440x900 light on the two
  `NOTE_SURFACES` boxes only, the graph's two note boxes not opened. (The table
  full view's X is built: 28x28 at 1440 and 44x44 at 390, each equal to
  `--target-min`; `tablefullclose.js` asserts it. Its phone width and the Writing
  Room's are closed, HISTORY.md, "OPEN.md rows closed, 2026-10-05 (the pre-0.4.0
  buildable rows, sweeps on port 8815)".) [notes]

### Whiteboard, mind map and Atlas

- **Board and map history**: an agent's or another tab's change is not on a
  board's stack (decision 17 says the event log is the long memory; a board's
  undo survives a reload since 2026-10-05, `undo-store.js`); redo of the board-level steps (theme,
  numbering, layout) is not swept; `wbMapCrossLinkToBranch`,
  `wbMapReverseCrossLink`, `wbMapCutCrossLink`, `wbMapAddReference`,
  `wbApplyMapTemplate`, `wbArrangeMindMap`, `wbMindMapAddCard`, bucket fill and
  fit to text are recorded through `wbRecordGesture` but not swept one by one.
  [undo-1005]
- **Draw.io phase 2's tail** (WHITEBOARD_PLAN 30 to 36 hold the decisions):
  Phase G's affinity sort (Group by theme proposes named frames, one Undo) and
  the claim check, both with faked-transport tests and
  `agent.PROSE_BUDGET_CHARS`; the time machine's plain-words "what changed";
  expand from my notes (MINDMAP_PLAN 12.3 item 2);
  ports are mouse and pen only (touch has no hover). Found: SQLite reuses a
  deleted row's id (no AUTOINCREMENT on the board item tables), so one id's log
  can hold two items; the board history starts a fresh state on each `created`
  but any other reader of an item's log (`events.replay`) would merge them;
  placements made before the history, a duplicated board's copies and a
  generated map's topics have no `created` event. [wb-phase2]
- **Frames and the map plan's rest**: MINDMAP_PLAN 12.2's rest (a boundary round
  a lassoed set that is not one branch, priority, progress, flags and due
  dates, floating topics and palettes, an outline pane). The nested frames'
  shared title area is measured, HISTORY.md, "OPEN.md rows closed, 2026-10-05
  (the pre-0.4.0 buildable rows, sweeps on port 8815)". [harness-wb-1004]
- **Map render and persistence**: (the `wbMapNodeSize` 94px row is closed,
  HISTORY.md, "OPEN.md rows closed, 2026-10-05 (the pre-0.4.0 buildable rows,
  sweeps on port 8815)"); a map does not re-frame
  after a tidy (a decision: frame after a tidy that pushed content off the
  canvas, or rely on Fit); tidy, copy branch and
  "open every folded branch" persist one node per request (a bulk endpoint if
  any ever matters); `mapstyle.js`'s "radial slot" check reads `w: 0` on the
  base too. [mindmap, mapux2]
- **The Boards and maps dashboard widget's tall maps**: a 25-topic tree-right
  map draws a 20x40 paper in the 72x40 row box. Cropping a tall map or a
  square box is the owner's judgement. [mindmap-13e]
  *Needs: the owner's call.*
- **Atlas motion, measured left** (the owner's rows 554 to 575 are above):
  `atlas619-blend.js` stepped by hand shows laughing's end moving the figure
  about 3px over three frames, base and fix alike (390 dark: the masculine
  tilt's start 7px, the feminine wiggle's end 3.3px; not isolated, trace the
  figure box's computed transform per stepped frame at 390); `atlas601-tail.js`
  still reads the tail's tip still for 1.8 to 2.2s under load 15 to 21
  (re-measure on a quiet machine); at 390 the props and viewer sweeps ran 2 to 7
  frames a second, so the coil, the moon and the feminine sit's calm read under
  threshold there; the masculine cloak's flare leaves the torso's taper at the
  join by 0.1 to 0.2 drawing units. Deferred since 2026-09-27: an arm rig for
  poses that cross in front of the body (hands on hips, clasped, to chest; the
  arms are separate svg roots behind the body in every look), and a fuller
  front hair mass for the feminine look (the owner at release). The Atlas guide
  panel's '?' did not reproduce (needs the owner's case). [atlas-1005, wrapup-0927]

### Settings, help and the shell

- **Help audit's remainder**: menus drawn on press (the chat "/" menu, a
  message's menu, the board menus, the notes list's menus) are checked by
  source grep only, and a sweep that presses each and lists its items would
  close it; the JS-built popovers (`manage-cat-help`, `manage-tags-help`,
  `inbox-help`) and the whiteboard and map help bodies were not read; the sweep
  runs at 1440 only, so a control a narrow window moves into a menu is named for
  the wide layout. [helpaudit-1005]
- **Chat panels not measured**: `#chat-model-panel` with a model connected
  (`popupsart.js` cannot open it without one; use `scratchpad/llama-dev.sh`)
  and the chat dock's select menus opened from inside the How it answers sheet
  at 390. Status chips: WORLD_CLASS_PLAN 1.2's wording and DESIGN.md's label
  recipe disagree (taken: the label recipe, `META_EDGED`; if the owner wants
  statuses edgeless it is one rule, `.chip.item-label`'s border). [design-1004]
  *Needs: the owner's call on the chips.*
- **The tour**: the Timeline's Options and the reminders' More were measured at
  390 only. (The fresh data dir walk and widths 600 to 1100 are done, HISTORY.md,
  "OPEN.md rows closed, 2026-10-05 (the pre-0.4.0 buildable rows, sweeps on port
  8815)".) [tourdepth]
- **Tablet layouts**: the Documents dock is two rows at 1024 (its identity
  asks for 22rem beside the actions); the arc layout of a 430-note notebook
  framed whole is a line of dots until zoomed; the Notes sub-tabs do not fit the
  list dock's row at 1093 (on a window 700px tall or less the strip could take
  the identity slot as a compact seg, which changes the dock grammar: the
  owner's or the plan's decision). The status bar's fold into the top bar under
  680px is not built, and measured it overlaps nothing, HISTORY.md, "OPEN.md rows
  closed, 2026-10-05 (the pre-0.4.0 buildable rows, sweeps on port 8815)".
  [graph-wb-0926]
- **Dismissed reminder notifications**: a dismissed reminder notification never
  returns (`status.js` `notificationsDismissed`, keyed `reminder:<id>`), so a
  reminder snoozed and overdue again stays hidden from the bell. By design of
  INBOX 508; revisit if the owner snoozes reminders. [sweep-1004]
- **Dashboard and Timeline**: D6's streak (the calendar strip and the day
  before and after are built, `daystrip.js`; a streak count has no surface:
  the dock is at its grammar and `.dock-chip-row` is held at zero uses); "Undo all" for a
  background pass or a skill run (each change has its own Undo; an honest "all"
  needs `tools.execute_tool` to run the undos in one transaction, or it is N
  requests that can half fail); the graph signal needs an open note, and the
  Notes filter uses `/search` for operators it does not know. [openitems]
  *Needs: design steps, each its own brief.*
- **The capture draft counts as unsaved work**, so every tab switch with a
  draft asks "Leave without saving?" though the draft is kept and the switch
  loses nothing: a decision, not a bug. [wrapup-0927]

### Backend, architecture and tooling

- **ARCH-02, the save at 5,000 notes**: `POST /entries` p50 210 ms (one line)
  and 345 ms (400 words), not under 150; 390 to 615 ms with 384-wide vectors
  against 61 to 96 ms at 500. The profile (`scratchpad/perf2-1005-prof.py`):
  the lexical pass walks all 4,000 kept docs per save, `nearest` reads up to
  4,000 postings, `janitor._knn_match` takes 52 ms over the matrix. Tried and
  reverted: a test instead of a list and per-category counts in the corpus
  (exact, removed the walks, not the time). Next: a smaller postings budget
  measured with `scratchpad/filing_eval.py`, or the k nearest read from the
  engine's matrix once per save. [arch1005, perf2-1005]
- **The rest of the architecture audit** (`scratchpad/audit1005/arch.md`):
  ARCH-04's client half (the cursor exists, `after` and `X-Next-Cursor`, but
  `notes-list.js` still reads every page by offset into `allEntries`); ARCH-13
  (response models for the busiest routes and one paging helper; the shape lint
  is built); ARCH-16 (follow-ups are skipped while a turn streams but there is
  no preference and no hardware probe saying "CPU only"); ARCH-22
  (`skill_runner._run_one_step`, 425 lines, and `agent.run_agent`, 416, need a
  state object before they split; `scratchpad/perf2-1005-longfns.py`); ARCH-10
  (the import-cycle ratchet holds 15 and 3); ARCH-25 (the pool size, a chat
  stream holding its connection, `restore_backup` with sessions open: read, not
  reproduced). ARCH-09 stays as built: `file-entry` shares the one-wide model
  lane with captions on purpose. [arch1005, perf2-1005]
- **The frontend audit's leftovers** (`scratchpad/audit1005/frontend.md`):
  FE-09 unused CSS (no coverage-driven deletion started); FE-10 Settings panes'
  markup is not fetched on first open (a `<template>` is still parsed and boot
  code reads Settings ids; a real gain moves every boot reader behind it);
  FE-11 the 720 and 640 groups (26 + 6 and 11 queries, each needing its own
  sweep); FE-13 the tab JS at 5,000 notes was not profiled again; FE-14 on a
  phone the chips' overhang is 44px and a card clips it below its last row
  (34px reached). [perf2-1005]
- **Retrieval and the learned loop, plan rows whose half-built parts live in
  the scratchpad**: "most opened this month" is parked in
  `scratchpad/wc1005b-most-opened.md` (`core/opens.py`, `GET
  /entries/most-accessed?period=month`, hooks on `flashEntry` and
  `openNotePage`, the Most used widget's seg, then the HISTORY block and a
  CHANGELOG line); the "wrong" correction on an evidence card (I7's second

- **A flaky timing test**: `tests/test_relations_kg2.py`'s 10k timing is flaky
  under load (the typo, message-wording, thread-ratchet and list-paging tests
  perf2-1005 and worldclass-1004 recorded as red pass on the head, 2026-10-05).
  [perf2-1005]
- **Retrieval and the learned loop, plan rows**: the "wrong" correction on an evidence card (I7's second
  half) and I1 pass 2's kinds as derived facts (dates, duplicates, entities)
  are WORLD_CLASS_PLAN rows. [worldclass-1005b, worldclass-1004]
- **Smaller backend and gate rows**: a note type made through `POST
  /note-types` before the list was read, then deleted, loses its id on Undo
  (not reproduced, pinned by a test); `gate.sh --changed` selects most of the
  suite on this branch; `tests/test_name_mood.py`'s palette test needs
  the palette decided; the container's shared `/tmp/pytest-of-root` grew to 11G
  once and filled the filesystem (`rm -rf` it); the Guide's longest topics sit
  at 1,916 of 1,920 characters and boot CSS at 183,210 of 183,300 gzipped
  bytes, so any new rule needs dead CSS cut first.
  [integ-1005, open-rows-1005, wb-phase2, sweeps, backend-probe, boardmap-1005]
- **Sweeps**: `touch.js` needs `timeout 300`;
  `revealcell.js` at 390 needs the editor opened first; `errors.js` took
  "Target crashed" at a tab switch (2026-10-05): it did not reproduce on a fresh
  data dir, so the sweep is hardened (a browser per width,
  `--disable-dev-shm-usage`, a crash reported as a finding) and the cause is
  named by its signature, not measured. [sweeps, small-1005, backlog-1005b]
- **Not verified**: Quit's 0.72 opacity contrast is computed (about 3.1:1
  light, 5:1 dark), not read from pixels; the line numbers' baseline drop is
  measured in the sandbox's system-ui only (Segoe UI has other metrics); the
  Windows rasteriser at 125% and 150%; every tablet and phone number is
  Chromium emulation; a real model for the Atlas, retrieval and skill rows.
  [design-rows-1005, quick-gutter, iconalign-skel-1005]

## Atlas, placed from INBOX 2026-10-05

Held by the Atlas motion agent; each closes when its sweep measures it.

540. **The owner, 2026-10-05, verbatim.** "one of the feminine atlas blinking
     animations has MASSSSIVE eyebrows."
     Not reproduced (2026-10-05): the live companion drawn at 6x, feminine
     and masculine, six poses by nine moods/acts, the blink lids sit within
     2px of the eyes and the closed-eye stroke and lashes are their usual
     size; mid-blink frames looked at. Needs the owner: a screenshot of the
     moment, or which pose/mood it was in (sitting, lying, drowsy, startled).

554. **The owner, 2026-10-05, verbatim.** "the feminine atlas whisps should
     wrap the body a bit more instead of all of it sitting in front. also the
     lower body still looks too sharp like a tooth. the whole avatar needs to
     ahve dynamic and organic movement. think of it like an azur lane
     character" Placed: with 550, the Atlas agent.
     Partly done (2026-10-05): the wisps wrap behind the body and the hem is soft; the layered lifelike motion is the follow-up agent's, with 564.

556. **The owner, 2026-10-05, verbatim.** "and a bit more texture can be
     added to the lower body as well. make it celestial and majestic and
     magical and attractive and flowy" Placed: with 550, the Atlas agent.
     Partly done (2026-10-05): the gown's nebula, sheen and glowing hem; the flowing motion is with 564.

564. **The owner, 2026-10-05, verbatim.** "can you fix or redesign the male
     main body on the atlas avatar instead of just being an oval?? also fix
     how the arms connect to the atlas bodies and how they are used in
     transitions between places and positions, same with the lower body,
     animate everything to be smooth and boilogically lifelike." Placed:
     with 550, the Atlas agent (masculine torso, jointed arms from the
     shoulder line, joint-angle blends with follow-through, lifelike idle).
     Then (verbatim): "the arms for both the male and female atlas".
     Partly done (2026-10-05): his V-taper torso and both looks' hanging arms (upper arm 13.4 degrees off vertical, elbow 166 and 165, wrist 0.54 and 0.52 of shoulder width). Open: joint-angle blends and IK in avatars.js, counter-phase swing, head lag, his cloak, the travelling hair and tail motion. The follow-up Atlas agent.

575. **The owner, 2026-10-05, verbatim.** "can you have the lower body of
     both atlas avatars change around in position and and how it is sitting
     ect with different variations and changes based off the current action
     or behaviour??" Placed: the Atlas motion agent, with 564 (a lower-body
     pose per state, small random variants, blended with follow-through).
     Then (verbatim): "dont forget that both atlas avatars have a tail as
     well, same with the hair, and the nebular stream. they all need to be
     dynamically animated and changed": both looks' tails, hair and nebula
     streams, per state, with secondary motion.

## Closed 2026-10-06 (the last round's three found-not-fixed items)

- **The shell at 360 wide, Large text, Spacious density was 368px** (hash
  c069120). Cause: the header's six squares take `--target-min` and
  `--header-control-h`, rems, so Large text made them 49.5px; the dock only
  followed the stretched layout viewport. Both are capped at 44px inside
  `header#top-bar`, and below 360 the bar's padding and gaps step down (inside
  07-whiteboard-misc.css's one 359.98 query; `test_breakpoints.py` allows one).
  `shellwidth.js`: scrollWidth <= viewport at 320, 360, 390 x small, normal,
  large x compact, comfortable, spacious x all seven tabs, 20 failures to 0;
  `phonehead.js` 0 findings. Note `innerWidth` grows with the content on a
  mobile context (it read 368), so the sweep bounds against the viewport it
  asked for.
- **Phone action sheets vanished with no exit** (34a965c). `openSheet`'s close
  adds `.sheet-leaving` (opacity and a short drop, `--motion-fast`) and removes
  the overlay after the computed transition, at once under the OS hint or
  Interface animations "reduced"; the ⋯ sheet sends its menu home in the new
  `onGone`. `sheetexit.js`: gone at 178 and 180ms on Escape and an outside
  press, first frame still drawn and pointer-events none, 0ms under both
  reduced-motion routes, menu home and hidden after.
- **Four sweeps repaired** (447d6fb, e4c1b76, and the commit that records this).
  `kebab-viewport.js` ran 80s, the Bash limit's edge: `ONLY=menus|dock|wb`
  splits it (12, 8 and 60 checks) and a not-found or did-not-open line now
  fails it. `selmenu.js` selected a notes row, where a drag selects nothing; it
  takes a paragraph and ends in PASS or FAIL. `libtab.js` listed no board on a
  fresh data dir; it creates a board and a map and asserts the Library tab
  leaves each. `mapstrip.js` asserts the corner `.wb-map-resize-grip` (absent
  until selected, nwse-resize, grows the box, Shift scales text, 72x40 and 10
  to 44 clamps), 43/43. It found a real fault: the grip, link and reference
  doors closed over the object the node was built with (`wbMapLiveDatum` now
  looks it up by id), so after a refresh a plain grip drag restored a cleared
  25px text size.
- *Found, not fixed:* `phonetabs.js` reports 3 findings on a near-empty
  notebook (the bar does not recede on scroll there: nothing scrolls); not
  compared against the base, since the change here does not touch the dock.

## Not verified

- Closed here, accounts in HISTORY.md, "OPEN.md rows closed, 2026-10-04": The feminine sash sways on an inner <g>; The companion's walk lays out and recalculates style 59 times a second.
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
- Closed here, accounts in HISTORY.md, "OPEN.md rows closed, 2026-10-04": The whiteboard's align and distribute actions were not driven.
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

## Atlas and the companion, placed from INBOX 752 (2026-10-10)

- The behaviour model (Brief 34, second part): a state machine with blended transitions, idle variation from a weighted pool, reactions to every app event with a budget, gaze and lean, the enlarged view on the same state. Measures: snapping transitions per minute 0; 12 distinct idle motions per ten minutes; reaction latency under 100 ms.

## Atlas, placed from the owner's list 2026-10-10

Entries are the owner's words, then the recommendation. Bugs come first, then design requests. Brief 34 carries the whole group.

### Bugs

- "I cant right click to view the menu to change the companion in the expanded popup view"
  Recommendation: the enlarged view gets the same context menu as the small companion, with the change-companion item in it. Also carried by Brief 34 (the enlarged view).

### Design requests

- "I barely get to see atlas change expression. atlas and the companion movement and behaviour need to be more and more lifelike, natural, smooth, varied, and more."
  Recommendation: mood changes are visible within a short session, measured as mood changes per session before and after. Also carried by Brief 34 (moods that change, lifelike motion).
- "The companion and atlas needs a lot more improvement, and lifelike behaviour, more cool and diverse ways to move around, enter the screen, change between behaviours and more."
  Recommendation: add entrance and behaviour-change animations to the companion and Atlas, and count the distinct movements per session. Also carried by Brief 34 (gestures, entries and the walk cycle).
