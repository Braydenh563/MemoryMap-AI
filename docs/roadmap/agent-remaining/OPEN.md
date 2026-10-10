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

## Left by the atlas84 and companion2 agents (Briefs 84 and 34, merged 2026-10-10)

Atlas everywhere (Brief 84, CHAT_PLAN F5, the four steps built):

- "new ways to do and output info" (INBOX 758): the Ask box ignores the `chart` event (capture-ask.js Ask handlers, ~3065); only the Chat tab draws it (chat-attach.js `onChart`).
- "the other one" (decision 57) in Chat: `routes_chat._spoken_act` sends `objects` only when the client puts them on history turns; chat-attach.js does not yet send each answer's note titles.
- "more access" (INBOX 758): write tools that are not acts (create_category, rename_tag, delete_tag, merge_categories, board and map tools) are named by the reading but not run with no model; each needs an act row in `act_registry._ACTS` with an inverse.
- The Guide's "how do I set a reminder" first line is the topic's first matching sentence ("The Reminders tab groups items..."), not the step that sets one: `composer.help_line` picks by shared words (composer.py `help_line`).
- INBOX 731 (the Guide failing with a model): not touched; the model-path fallback in `help_chat.answer_stream` still needs the log line read.
- Guide rows 4 to 6 (CHAT_PLAN "The Guide" table): trust-surface topics, the weekly unused feature, typos through the word list (VC15).

- Brief 84, not verified: the Guide's new first line and act topics in a browser (API and unit tests only); no real model.

The companion (Brief 34, second round: faces at 28 and 20 px, the tail on the compositor, reduce motion, calm's arms; smoothness measured only):

- The rest of Atlas's idle cost is the companion's own behaviour, not the
  tail: with the tail and breath switched off, 670 recalcs and 130 layouts a
  minute remain (recalc probe), all from avatars.js timers. Decision 7's 1 ms
  needs the behaviour picker and perch checks profiled next.
- The chest's breath still writes the torso's `scale` 2.5 times a second at
  rest (atlas-life.js `atlasBreathFrame`): a recalc and a layout each. Zero
  needs the torso on its own layer root (a drawing change, `atlasDrawFigure`).
- 104px faces (the welcome, the large view): 2 to 3 of 15 distinct in light by
  the same metric; the cue is drawn only at the head and tiny levels. The
  owner's "I barely get to see atlas change expression" may also mean the
  companion figure (12px face); a cue on the figure is the next step.
- Step 5 not built: one curve table for every joint (120 to 400 ms), the
  idle pool's never-within-five rule and a reaction budget a minute beyond
  the existing 6s gap (avatars.js `NMB_REACT_GAP`). The one snap (both hands
  jumping over 4px out of stillness while hanging, atlassmooth.js) is likely
  the held arms' crossfade (`atlasRigRead`, -158 degrees); one latency trial
  of five was over 100 ms, the frame wait under load.
- Arm angle over a walk cycle not measured (atlasarms.js measures still
  poses; the walk swing is the rig's, atlas-motion.js `atlasRigFrame`).
- `#nm-buddy:has(.atl-figure) .nm-buddy-char` and the lower layer still slow
  to 6s under the hint (08-consistency.css, the block after the chin hand
  rule) rather than stopping: they may carry acts, so left for a driven check.
- Companion movement Full keeps the script loops (tail, rings) under Reduce
  by design (`atlasMotionOK`); the CSS loops stop under the hint regardless.

- Brief 34, not verified: the arm angle over a walk cycle; 104 px faces (2 to 3 of 15 distinct in light); no real WebView2 or WebKitGTK; all timings from a loaded machine.

## Left by the wb77 and ide1 agents (Briefs 77 and 69, merged 2026-10-10)

Whiteboard (Brief 77, rows 1 to 4 built; 8 and 9 not started):

- Row 8 (rule 6): "every rail and top-bar control has a `data-help-for` popover and a palette row; 0 missing". Not built. A first count from the DOM (`#wb-topbar`, `#wb-tools-panel`, `.wb-board-menu` controls against `WB_COMMANDS` by `data-wb-cmd`, `run.tool`, `run.clickId`) found 240 controls and 166 with no table row, but the board picker's rows and the View menu's switches inflate it; the measure needs the picker excluded and the switches counted once (whiteboard-commands.js `WB_COMMANDS`, index.html 6267 to 6560).
- Row 9 (rule 12): "a board AI act as one chat tool (summarise this board; a board from a note)". Not built: a tool under `src/memorymap/ai/tools/` with its test, README's tool count (`tests/test_readme_freshness.py`), deepen72a.js's "No model" row before and after.
- Row 2's New is still a menu (`details#wb-boards-new-menu`): a split button (DESIGN.md's recipe) would make it one press; tour.js and reveal-targets.js name the menu's id.
- `tests/test_icon_conventions.py::test_the_vertical_kebab_is_only_at_the_end_of_a_vertical_list_row_or_in_a_narrow_column` fails on this branch's head before this work: search.js has a vertical kebab the ratchet does not list.
- `errors.js` at 1440 and 390: 0 errors, 0 layout findings each.

Code editor (Brief 69, I1 built):

- D1's folder: the brief and D1 say `frontend/js/run/`; the files are `frontend/js/run-*.js` because 65 lints (`test_frontend_symbols`, the em-dash and innerHTML lints, the global scope ratchet) glob `frontend/js/*.js` only. Recommendation (take it): keep the prefix; a folder needs every lint made recursive first.
- D5 "load this CSV document as a table": the sandbox's SQL worker takes `tables: [{name, columns, rows}]` (`_SQL_WORKER`), but no panel action picks a CSV document and sends it yet (`run-core.js`, the sql row).
- D9 stdlib completion and signature help from a generated table (`scripts/gen_python_completions.py` over the installed Pyodide's `inspect`): not started.
- D9 `ruff-wasm` lint and format: DOCUMENTS 25 row 4's (Brief 42's linters), not started here.
- D6 `.md` preview in the sandbox frame: not done; a Markdown document already has its own Live and Split views.
- Python's runtime reloads on every document opened (5.9 to 7.0 s cold at 1440): the sandbox frame lives in the panel, which is rebuilt per document (`docRunPanel`, documents-code.js). One frame kept across documents would make a second .py run warm.
- `input()` is answered before the run (the Input box), not interactively mid-run: that needs `SharedArrayBuffer` and the COOP/COEP headers, which are D2's (Brief 70).
- p5 in the sandbox logs "Permissions policy violation: accelerometer" to the console (p5's devicemotion listener in a frame without `allow`); harmless, not silenced.
- A JSX `.js` document (the `jsx` alias) runs without the JSX pass; only `.tsx` paths get it (`runStripTypes`).

- Brief 69, not verified: the desktop webview; dark theme for the new panel rows; a large SQL result; touch.js on the other surfaces.
- Brief 77, found: the shape flyout opens only from its 10 px caret or a long-press, too small for a finger on a phone; boot CSS is within 12 bytes gzipped of its budget.

## Left by the design agent (Brief 56, merged 2026-10-10)

- 110 distinct controls show no change on keyboard focus (`a11yname.js`, 312 stops over 14 surfaces): every `.status-item`, the `.ghost.small` buttons, the status bar; a focus ring rule in the stylesheet's grammar (Brief 57).
- Eight dialogs open as centred cards at 390 and should be bottom sheets (extract, history, connections, binned, run a skill, board keys, meeting notes, features): Brief 59.
- Six of 14 content docks show more than seven items at 1440 (Notes 10, Graph 9, Library 9, Chat 8, Timeline 8, Boards 8); fold by count, 13.1 row 2 (Brief 57).
- The markup has 18 overlays plus the built confirm and the tour card, not the plan's 15; `$S/design/hierarchy.json` lists each with its size (Brief 59 reads it first).
- Not measured by Brief 56: 1024 and 820 widths, dark-theme counts, a Chat with a conversation, the document AI panel, a board with a selection.
- The 13.0 gate's "every offence per decision" for decisions 9 to 17 are stylesheet counts from the plan's method paragraph, not from the sweep; still to be read from code (Brief 57).

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

## Left by the deepen agent (Brief 72a, merged 2026-10-10)

- Not verified: whether the closed `.doc-dock-menu-list` at 390 paints (it lays out, 13 items, x = -32 on a code document); open it and measure before Brief 76 row 2.
- Not verified: the map grip that overlaps "Add a child to" (its accessible name was not read; it shows only with a topic selected after adding children).
- Undo counts for documents (2/11), OCR (0/5) and meetings (1/6) are a static read of each handler for `pushUndo`, not driven; Brief 74's `undo.js` replaces them.
- Not driven: Summarise's 503 with no model (read from `routes_meetings.py`), pinch zoom in the OCR workspace, the phone path of any board or map command, Find anything for "ocr".
- Timings vary two to four times between runs (the machine was shared with other agents; map add-a-child 102 to 424 ms); the blocks give ranges. Rerun `deepen72a.js` on an idle machine before a brief quotes a "before".
- Bergamot's licence (MPL-2.0 into AGPL-3.0) and sizes are stated as the evaluation's job (Brief 83), not checked here.

## Carried from the agent files archived 2026-10-10

Thirty-nine finished agent files moved to [`../archive/agent-remaining/`](../archive/agent-remaining/) on 2026-10-10, in four batches: every file dated 1005 or 1006, and landing-645, meetings-644 and mc1. Each row is what a file still held that is open on the head the day it moved and that neither HISTORY.md, CHANGELOG.md, the plans nor INBOX holds. The file in brackets has the measurements.

- Drag to delete takes no drag from the board sidebar (Library, Layers) onto the trash target; a drop from the Library panel is not a delete. (from av1-1005.md)
- 24 single-line `toast("...", true)` calls with a literal message remain in `frontend/js`; some are expected conditions (validation, "nothing to ... yet") that carry Report this. A `report: false` option costs boot bytes. (from e2e-1005.md)
- With a model, the composer shows "Filed under Work (100% sure)" for a small model's pick (a dentist appointment); the certainty shown for a small model's pick is too high. (from e2e-1005.md)
- A row added or removed after a list's first render does not fade; the lists redraw whole, so this needs keyed rendering first. (from motion-1005.md)
- Help popovers close at once: a popover goes home and is removed on close, which cancels its exit transition. (from motion-1005.md)
- A sub-tab's panel does not cross-fade; only its line slides. CSS cannot tell a section switch from a page arriving; it needs a class set by `showNotesSection`. (from motion-1005.md)
- CHAT: the evals gate runs on a 3B model (hours on these cores) and waits on a real-model run. (from op3-1005.md)
- The `.skill-fact-reads` chip reads dy +4px in one of four identical instances on the Skills sub-tab at 1440 (badgealign.js); the instance is not isolated. (from op3-1005.md)
- Sweeps that only click the Library tab time out, because the Library opens on its last sub-tab. `bm1005-sidebar.js` and `bm1005-mapmulti.js` click Boards and maps first; the rest do not. (from op3-1005.md)
- UI_MOD Phase 11 item 11: the screenshot set for the owner, which needs a place the owner reads. (from op4-1005.md)
- 444 decision 10, still open: the Tools (4,247px) and Appearance (1,296px) panes are indexed, not split. (from op4-1005.md)
- Two-finger scroll jump (460): not reproduced twice; needs a real touchpad trace. (from op4-1005.md)
- Owner's call: RapidOCR ships as an optional extra (Settings, Packages); confirm it against the 2026-10-05 "fully local, vendored" rule (WORLD_CLASS_PLAN row 31). (from op4-1005.md)
- Doc-focus panels between 720 and 819px cover the page, as below 720 did before; not driven in a sweep. (from op5-1005.md)
- Sweeps that wait a fixed 1.2 s for the whiteboard's lazy bundle flake under load (`initWhiteboard is not defined`). `op5-1005.js` and `mapviewmenu.js` wait for the function; the other sweeps with a fixed wait do not. (from op5-1005.md)
- The board preview labels (`mapPreview` in note-cards.js) run over the next shape ("Cut the sign-up fro…" across a diamond); the label placement is INBOX 263's design and the whiteboard agent's surface. (from qa-1005.md)
- At 1440 with the Connections rail open, the Notes dock wraps nine controls onto a second row; DESIGN.md says seven at most. A judgement for the dock grammar's owner. (from qa-1005.md)
- 401s in the server log (`/preferences`, `/insights/*`, `/reminders`) when pages boot while sweeps unlock; not reproduced in one clean boot. (from qa-1005.md)
- `scratchpad/ui-sweeps/lib.js` LOOK= writes the look into the server's preferences, so later sweeps on that data dir inherit it; run a LOOK=utilitarian sweep last. (from qa-1005.md)
- installer.iss's ISPP version reader (`#sub`, `#for`, `RPos`) compiles only on Windows; it is not verified until a Windows CI run passes. (from windows-packaging-1005.md)
- The upgrade step downloads the latest release with `gh` and `github.token`; a fork or a repo without releases fails it loudly. (from windows-packaging-1005.md)
- The traceback check in the smoke step reads the app's whole output; a benign logged traceback on Windows would fail it. (from windows-packaging-1005.md)
- The installer's optional packages (owner, 2026-10-07: "there's no indicator for the optional packages install and I cant minimise or close the window"): Setup waits on pip and cannot repaint, minimise or cancel. Recommendation: Setup records the picks and finishes; the app installs them on first launch as a background task with progress, a log and Stop (a stopped install rolls back, `extras._roll_back`). (from windows-packaging-1005.md)
- `docs/CHANGELOG.md`, `docs/CONTRIBUTING.md` and `docs/SECURITY.md` are mirrors that nothing reads now (the old site fetched them). Keeping or retiring them is the orchestrator's call. (from landing-645.md)
- INBOX 641's rest, which INBOX.md no longer holds: Illustrator linked symbols (`library_ref` in whiteboard-library.js), Photoshop topic effects (a level field each, `WB_MAP_LEVEL_FIELDS` and `MAP_LEVEL_FIELDS`), Miro reactions, and the whiteboard half of the research. (from mc1.md)
- PNG and SVG export draws every topic as one box: `wbBuildExportSvg` (whiteboard.js) leaves out levels, shapes and Phosphor icons. (from mc1.md)
- `DOC_EMOJI_SOURCE` (documents-prose.js) is a second emoji table beside `ICON_EMOJI_SOURCE` (icon-picker.js). (from mc1.md)
- Playwright reported the topic strip's Text toggle "not visible" after an icon pick, though its rect is 58px wide; `mc1-iconpicker.js` works around it with evaluate clicks. Not investigated. (from mc1.md)

- Large view: whole-body moves (`nmb-hop`, a hop, a cheer, a startle) move the head 14 to 17px a frame, 2.2 times the rest. Decision needed on slowing them in the large view; recommendation: a gentler `nmb-hop` only under `.nm-viewer-figure`. (from atlas669-1006.md)
- A click in Atlas's own large view costs 22 to 44ms in `setAtlasMood` (every layer's animations, then `atlasApply` on 12 layers), 50 to 100ms on a loaded machine: a stall, not a jump. `atlas669-clickcost.js` measures it. (from atlas669-1006.md)
- The generic (non-Atlas) faces' arms have no rig and so no speed cap; the fastest segment of their wave and hide keyframes was not measured. (from atlas669-1006.md)
- Chromium quirk: a blend's implicit end keyframe held `rotate` at its start value under a CSS animation that starts at the same value. The blend avoids it by easing only the values that moved; not reduced to a minimal case. (from atlas669-1006.md)
- Owner (2026-10-07), a fresh install's search model: an empty or partial `models--BAAI--bge-small-en-v1.5` folder is treated as present, the load runs offline and fails with `EmbeddingCacheBroken`. Treat the model as present only when its weights and config are in the snapshot; otherwise download it as a background task with progress; test an empty and a half-filled cache. (from autoinstall-1006.md)
- Owner (2026-10-07): the janitor warmed a default chat model it never checked ("Chat with 'llama3.2' failed"). `warm_filing_model` (janitor.py:741) should skip quietly, and Settings, Models should say no chat model is chosen. (from autoinstall-1006.md)
- Owner (2026-10-07): on first launch, choose the chat, background and image models from the installed ones instead of llama3.2 (Atlas said "was running llama3.2, which is not installed any more" on a fresh install with five models present). Say once what was chosen and why, with Change. (from autoinstall-1006.md)
- Owner (2026-10-07): the app repairs a broken or missing search-model cache itself. On `EmbeddingCacheBroken`, start the reinstall as a visible background task ("Fixing search by meaning..."), keep keyword search working, and ask the person only after two failed fixes or with no network. No exception class names in what the person reads. (from autoinstall-1006.md)
- Owner (2026-10-07): each embedding row shows its real state (Downloaded with its size on disk, Not downloaded, or Files missing with Reinstall). The "Runs in the app" badge is built; "Files missing" is not (`embed-choices.js`). (from autoinstall-1006.md)
- `renderAutonomousSettings` fills the Models-pane checkboxes only when Background tasks or Web search opens (settings.js, per the file, about line 158); the new switch is filled in `renderPrefs` instead. (from autoinstall-1006.md)
- Autonomous with no model running ends "Finished analysing and linking notes." in 65 ms; it should say it had no model (check `agent.run_agent` for a no-provider error event). (from bgprogress-1006.md)
- The night shift's pairing phase is slow (120 s for 2,400 facts and 4,786 pairings with the local matcher), and the bar resets between the reading and comparing phases. (from bgprogress-1006.md)
- Pills still in popups: the Attach picker's five sources (`#note-picker-sources`, index.html:2842) and `pickLibraryItemDialog`'s sources (selection.js) are `.seg` strips. Next: a `.tabs-line` whose tabs carry the count, then the row, its test and its sweep. (from board715-1006.md)
- If the owner means every pill in a popup, these values are next (kept as `.seg` by DESIGN.md's two-or-three rule): doc-history-filter, ocr-zoom, ocr-view, theme-seg, fontsize-seg, border-style-seg, privacy-range, log-view-toggle, confirm-seg, the print setup, chat-skill-pace, wb-export-seg. (from board715-1006.md)
- Sweep coverage not yet done: an open board or map, the graph's node popup and controls sheet at 390, the print dialog, the lightbox, the confirm dialog, the onboarding tour, the Attach dialog, the date and time pickers, every card's kebab menu; other looks (`LOOK=`), `CONTRAST=on`, forced colours, Large text with Spacious density. (from clip685-1006.md)
- `scroll-padding`: a control focused by Tab in a scroller is scrolled to the edge with its ring half cut. `scroll-padding: var(--ring-room)` on `.tab-page`, `.tab-main`, `.modal-content` and `.library-view-section` would close it; not applied on this head (grep), not measured (the sweep does not tab). (from clip685-1006.md)
- The ring sweep skips a control at the end of a scroller with more content past it, so a real cut at a scrolled edge is not seen; text cut by a fixed height without `overflow` is not seen either. (from clip685-1006.md)
- A ring on a control in a body-level fixed sheet that touches the viewport edge (the phone Writing room's draft textarea) is treated as scroll position; no measured fix. (from clip685-1006.md)
- Found: `one_line` for "when is the harbor launch?" quotes the Q4 roadmap rather than the dated sentence; the compose grounding rows lack it. (from composer-everywhere-1006.md)
- Found: a titled note's every sentence scores on its title (`_score`, `TITLE_WEIGHT`), so the brief keeps up to four dated sentences of a note named for its subject. (from composer-model-1006.md)
- The eval numbers for the whole voice track (before and after) were not reported: run `tests/_composer_eval.py` and record them. (from composer-voice-1006.md)
- Browser check of Ask and Chat with no model at 1440 and 390, light and dark: the "Did you mean" chip and the clarifying question. The sweep `scratchpad/ui-sweeps/voice741.js` is on branch `wip/composer-voice` only. (from composer-voice-1006.md)
- The noisy-question set's coverage (owner: "any and ALL typos ... all slang"): what is still missed, from the eval. (from composer-voice-1006.md)
- Professional variants for the next-question chips and the citation phrases (`mention_*`, `lists`, `echo`), and other languages' wrappers. (from composer-voice-1006.md)
- The Settings voice row was checked in Chromium on the light theme only at 1440 and 390; dark not run. (from composer-voice-1006.md)
- Owner's test (2026-10-07): "How do I change the widgets?" got the whole Dashboard paragraph. A how-to should lead with its step sentence and keep the rest behind "More about the Dashboard". The help voice (`voice="help"`) is in CHAT_PLAN. (from composer-voice-1006.md)
- Ask's "Ask all notes" (`#ask-scope-clear`) is wired only once the Questions view has been opened, so the scope is only set from there (pre-existing). (from composer688-1006.md)
- At 390 the Ask head's model picker sits on its own short line (224px of 330), pre-existing. (from composer688-1006.md)
- Chat's next-question chips were not seen in the browser: the sweep found no `.chat-followups button`. Check `refreshFollowupVisibility` and the chip element (it may not be a button), then fix the element or the sweep. (from composer725-1006.md)
- Clicking an Ask chip was not driven: the sweep's `button` selector missed the chip element. (from composer725-1006.md)
- Link reasons from the composer (owner: "can the composer be user to write better link reasons other than just similar in meaning??"): not started. INBOX 691 is not in INBOX.md, so its concrete overlaps (one note names the other, a shared tag, a shared rare word or name, the same category in the same week) and the sentence-pair reason are open. (from composer725-1006.md)

- Chat dock at narrow widths: the streaming state (Stop shown, Send hidden) was not measured. (from dock694-1006.md)
- The icon-only chat-dock toggles are checked by text content and title only; no keyboard or screen-reader pass was run. The phone (under 600) sheet paths (`openChatDockMore`) were measured as a one-line strip and composer at 390, not opened. (from dock694-1006.md)
- `wbMapDropTargetAt` (whiteboard-map.js:2661) still converts by hand. Fold it into `wbClientToBoard` and update the pinned line in `tests/test_map_drag_cost.py`. (from dropplace-1006.md)
- Touch drag from the Library is not tested: HTML5 drag-and-drop does not run on touch. The drag image (its thumbnail and offset) is asserted in source only, since a headless drag shows no ghost. (from dropplace-1006.md)
- CI margin: Tests (Python 3.13) took 16 m 14 s of its 25 m timeout on the head that was scanned (3.11 took 15 m 01 s, 3.12 14 m 37 s). A slow runner is a red build; raising the timeout is the owner's call. (from final-scan-1006.md)
- `/jobs/last-runs` is polled after a lock and answers 401 once or twice per lock (forgotpw.js's refused list). Next: stop the poll in `lockNow` and `purgeLockedContent` (`settings.js` reads it at about line 4425). (from forgotpw-1006.md)
- Not verified in a browser: the another-device notice on the recovery card (the sweep server binds loopback only); a real phone and a screen reader on the card. (from forgotpw-1006.md)
- The Focused hero is taller than before: 157px at 900 to 1920 (was 71), 278px at 390 (was 71 to 87). If the owner finds it too tall on a phone, the next step is the glance as one scrolling row there. (from hero675-1006.md)
- Not verified: a real model's greeting in the new layout (a long AI line widens the left column up to its 45% cap; measured with handwritten phrases only), the desktop window and RTL. (from hero675-1006.md)
- `scratchpad/ui-sweeps/pickers.js` throws `pickNotesDialog is not defined` at its note-picker section, since that dialog moved into the whiteboard bundle. `segbars.js` and `left1005-openrows.js` still read `#graph-layout` as a segmented control. (from inbox670-1006.md)
- Markers' Flag is still two previews (seg665-1006.md item 5). (from inbox670-1006.md)
- The breath's cost in the large view is not settled: a CSS loop cost the view about half its frames, so the swell is written ten times a second. The A/B (base 415, 320, 192, 162 frames; breath 346, 348, 106, 202) is inside the noise. Re-measure on a quiet machine with `breath687-ab.sh viewer-m 5`; 6 Hz (`ATLAS_BREATH_STEP_MS` 166) is the fallback. (from motion686-1006.md)
- An interrupted glide restarts at the ease's peak speed: a star's fastest step after a second Regenerate is 13 to 16px against 7px before it. A velocity-matched retarget (a spring) would remove the kick; it was not asked for. (from motion686-1006.md)
- RapidOCR and Tesseract never ran for real here: "ready" and the RapidOCR path are faked through `/ocr-readers` and monkeypatched tests. A real install and a real read are open. (from ocr717-1006.md)
- `ocrflow.js` still reads `#ocr-engine` as a line and clicks `#ocr-more`; it was not re-run, and its engine checks may need the popover opened first. The region drag (outlining a rectangle) was not re-measured after the Regions toggle became a button. (from ocr717-1006.md)
- README `docs/screenshots/palette.png` (and `docs/index.html`'s copy) still shows notes, a document and a board in the palette. Retake it with `scratchpad/ui-sweeps/readmeshots.js` so the picture matches the alt text. (from palette666-1006.md)
- `tests-e2e/specs/shell.spec.js` has a handoff test that has only had `node --check`; Playwright's runner has not run it. (from palette666-1006.md)
- Older sweeps that expect note rows in the palette (grep `palette-input`): `ux1005-palette.js` and `search1005-lazy.js` read command rows only, and `readmeshots.js` types "launch". (from palette666-1006.md)
- Stop part way: the night shift, the backup, resurfacing and the embeddings backfill are each one call with no step to stop at. Only housekeeping reads `passes.stop_requested` (passes.py:184); the backfill's loop could check it. (from progress696-1006.md)
- Settings, Packages has its own Embedding models list beside Search and index's, which does the same and more. Recommendation: Packages keeps a single line pointing to Search and index. (from progress696-1006.md)
- Not verified: a real model load for the new built-in embedding models (no sentence-transformers here); Pull a model by name is tested against a mocked Hub; Ollama pulls and the found scan against a real Ollama; the dark theme for the new rows. (from progress696-1006.md)

- Other jobruns detail strings that carry `{exc}` (grep `note_finished` and `run.fail(` in `src/`) were not audited; only the two named in item 5 were changed. (from quickwins-1006.md)
- Other `[^\]\n]`-style scanners may share the ReDoS shape; the markdown link stripping in the frontend is JS and is not covered by the Python oracle tests. (from quickwins-1006.md)
- Not measured at 390: the Documents sidebar and the board zoom pill are not on screen there (the sidebar is a sheet), so both were measured at 1440 only. (from radius682-1006.md)
- Not measured: the chat dock's controls, the board's context bar, the stepper and the map strip, named in `PILL_CONTROLS` with full-round rules. (from radius682-1006.md)
- An opened row with no title starts with its text, whose first line's centre is 19.4px from the top against the chevron's and cluster's 22px (2.6px off). A title row is exact; the fix wants the text's own line box (`1lh`), not a number per font size. (from rows676-1006.md)
- The owner's second screenshot showed a stray circle after the hover buttons on an opened row. Not reproduced at 1440, 1920 or 390, light or dark, open or closed. If it recurs, the seed lacks its state (a draft's Publish, a busy chip, a filing chip). (from rows676-1006.md)
- Phone (390, touch): the first frames of a toggle take 50 to 80ms in headless emulation, so the first frame of the height animation can jump about 40% of the change. Not measured on a real phone. (from rows676-1006.md)
- Phone: a collapsed row's always-shown buttons sit in the details line's scrolled lane, off the row's right edge (right -87.8px, measured; unchanged by the work). (from rows676-1006.md)
- Not verified: suggestion mode switched on while a candidate is chosen (the replacement goes through `docProseFix`), a touch long-press on a suggested change, and the phone width. (from suggest689-1006.md)
- A word touching a suggestion's marker is never a spelling finding: `docSpellable` (documents.js) rejects a `+` on either side, and `{++` and `++}` are `+`. `{++faque++}` has no finding; `{++the faque ++}` does. Fix: treat `{++` before and `++}` after as a boundary, with a test in `tests/test_prose_tools.py`. (from suggest689-1006.md)
- The prose-tool grammar rules at a CodeMirror lint tooltip (`.cm-tooltip-lint`) in code documents are not suppressed while a pointer menu is open. Only code files are affected, where no suggestion marks exist. (from suggest689-1006.md)
- Not verified: the phone's action sheet (`openKebabSheet`) and touch below 600 (its dismissal was not pressed twice), a real screen reader, and the Settings sidebar at 390 as a jump list. (from toggles681-1006.md)
- `.wb-shape-caret` has `pointer-events: none` (per the file), so the Shapes split button's caret never gets a click and the `closest(".wb-shape-caret")` branch in `wbWireToggleGestures` is dead code. A product choice (a 10px caret target), left. (from toggles681-1006.md)
- The topic bar wraps to two rows at 390 (348x102), measured identical on the base: the Branch line and the reset go to a second row under the open door. (from seg665-1006.md)
- The size stepper reads "17px" on a main branch and "22px" on the centre, and Classic's level sizes have no S, M, L or XL word, so the well showed "Map" pressed there. A level-size vocabulary is not in MINDMAP_PLAN. (from seg665-1006.md)
- The note strip, owner's report (d): every control is 6.4px inside the strip's edge at the default look (measured 320 to 1920). The owner's exact state (look, zoom, text size) was not reproduced. (from seg665-1006.md)
- `wbSyncMapStrip` sets a themed field's effective value onto the select, so a topic following the map shows the map's look pressed rather than ringed, except where the value has no option (the 17px size; the level's fill). (from seg665-1006.md)
- The Notes dock wraps to two rows from about 1280 to 1500 with the connections rail open (90px); Tidy's 40px extends that band to about 1640. Moving the words-hidden threshold from 1400 to 1680 fixed both, but `tests/test_breakpoints.py` allows no new width query, so the dock needs a rethink (fewer worded controls above 1400, or a narrower rail). (from tidy691-1006.md)
- The card tooltip and the graph still show a deduced reason as "(73% confidence, deduced)", not a strength word. (from tidy691-1006.md)
- `/entries/{id}/related` lists notes that are already linked, so a press on one answers 400 "already linked" (pre-existing). (from tidy691-1006.md)
- Not verified: the contrast of the accent count on the broom (`contrast.js`), a browser run of the automatic pass after filing (pytest only), and a real model for the "Tags Atlas added" review (the tool door only). (from tidy691-1006.md)
- Meeting cards show their section headings as raw `## Agenda` text, as every note card does. A meeting-aware card preview (when, who, open action items) needs its own pass. (from meetings-644.md)
- The Timeline's table view (a phone's default) has no mark column, so a meeting reads as a Note there; the feed view shows the meeting mark. (from meetings-644.md)
- Not verified: Summarise against a real small model (the fake model only; its pipe format and quoting are unknown), and transcription (no faster-whisper in the sandbox; the save is driven with a typed transcript). (from meetings-644.md)
- `settings-packages.js` (lines 421, 562 and 591 on this head): the `toast` call on `result.message` is red when the package action did not start (the flag is the negated `result.started`), often "busy" or "already installed". The reply carries no kind, so it stays red. (from toasts-1006.md)
- `suggestions-inbox.js` (a partial link run) and `whiteboard.js` (a clear that left items) are red by a computed flag; they are partial failures. (from toasts-1006.md)
- `ai-tools.js` says "Open Settings, Models" in words, and none is a link. A button on the toast is the next step and is a new control. (from toasts-1006.md)
- Not verified: the other 100 `toast(..., true)` call sites were not each triggered. A lint covers them; their situations (a formatter refusing a file, Atlas off in Suggestions) were not driven. (from toasts-1006.md)

## Left by the agents merged 2026-10-10 (deepen-b 72b, mapnotes, vendor 75, briefs, coverage)

The five files are in [`../archive/agent-remaining/`](../archive/agent-remaining/); decisions 768 and 769 taken, 728 fixed, 761 and 762 fixed.

- The phone paths through the More sheet: the agent (`toggleAgentPalette()` leaves the overlay hidden at 390), the Guide, the timeline and reminders were reached with `switchTab` or not at all. (from deepen-b-1010.md)
- The reminders quick-add row at 390 (not visible; the phone compose not driven). (from deepen-b-1010.md)
- Chat's 82 (1440) and 136 (390) overlaps after answers: a sticky head over scrolled cards or a real paint clash. (from deepen-b-1010.md)
- Whether each Guide topic answers its question (only the topic's head was read). (from deepen-b-1010.md)
- "last week" in Find anything: a window or the words. (from deepen-b-1010.md)
- Timings: two runs at 1440, one at 390, the second 1440 run under a concurrent sweep; ranges, not budgets. (from deepen-b-1010.md)
- Any real-model behaviour of the agent (CLAUDE.md section 4). (from deepen-b-1010.md)
- The rail-dot alignment at 390 (0 px at 1440). (from deepen-b-1010.md)
- The fixture is 96 notes (the seed ran twice), not 48. (from deepen-b-1010.md)
- Chat with no model: "what is 15% of 240" quotes a note; "convert 5 km to miles", "what day is it today" and "summarise my week" answer "Nothing in the notes"; "remind me to call Sam tomorrow at 9" makes no reminder (CHAT_PLAN foundation 7). (from deepen-b-1010.md)
- The reminders presets menu lays out while closed: 7 overlaps over the filter chips at 1440 (TIMELINE_PLAN 11 row 2). (from deepen-b-1010.md)
- The agent panel with no model: 16 of 20 controls disabled (AGENT_SKILLS_REFORM, Deepened row 1). (from deepen-b-1010.md)
- Ask cannot show a relevant map as a map. Decision taken: retrieval is notes only (a map's entry text is its title, so it grounds nothing). Owner's words: "mindmaps still appear as notes in the ask subtab search". To surface maps, add a `maps` list to `ChatResponse` (`src/memorymap/api/routes_chat.py:673`) and draw it with `mapChip` in `frontend/js/capture-ask.js` (the `raw_results` loop near line 2296), fed by `search.engine` hits of kind `map`. (from mapnotes-1010.md)
- `GET /entries/count` (`src/memorymap/api/routes_entries.py:2293`) counts every entry row including boards and the bin; its only reader is onboarding's "is the notebook empty" check (`frontend/js/onboarding.js:73`), so left alone. (from mapnotes-1010.md)
- The Timeline labels a map under the "Boards" kind chip (`frontend/js/timeline.js:266`); it draws it with a map chip and an "Open this map" action, so it is not a note leak. (from mapnotes-1010.md)
- Notes keep the old `updated_at` rule (any write moves it): `edited_at` answers "when a person changed it", but `lexical_filing` (`src/memorymap/ai/lexical_filing.py:554`) keys stamps on `updated_at`, so the board-only guard in `core/database.py` was not widened. (from mapnotes-1010.md)
- Each VC row is unbuilt; the script and test are the only code (Brief 75 says no code beyond them). (from vendor-1010.md)
- The p5 API list in `scratchpad/vendor_use.py` is a Chromium dump pinned to 1.9.4; regenerate it with a p5 upgrade. (from vendor-1010.md)
- Brief 2 (consistency lints): HISTORY mentions it only as an owner reference; no record of the lint set being built as the brief. (from briefs-1010.md)
- Brief 3 (prefs, api.stream/upload, innerHTML): HISTORY line 43146 area still lists `api.stream`/`api.upload` and the no-bare-fetch lint as not built. (from briefs-1010.md)
- Brief 4 (Settings two-pane, 54 paragraphs): WORLD_CLASS_PLAN.md:1019 says the 54 paragraphs "not re-checked here, so still open". (from briefs-1010.md)
- Brief 5 (Timeline): TIMELINE_PLAN.md:7 names it as the plan's hand-off and the plan is open. (from briefs-1010.md)
- Brief 6 (pagination, scheduler): `tests/test_lists_paginate.py` the brief names does not exist; TIMELINE_PLAN.md:93 depends on its helper. (from briefs-1010.md)
- Brief 8 (`[[` autocomplete, connections rail): HISTORY has only the plan table rows, no Built record. (from briefs-1010.md)
- Brief 9 (job runtime): `tests/test_jobs.py` the brief names does not exist; HISTORY has no Built record. (from briefs-1010.md)
- Brief 10 (Library card recipe, widget frame): HISTORY has only the plan table rows. (from briefs-1010.md)
- Brief 13 (verifier): agent-remaining/OPEN.md:189 still names Brief 13's `evals` marker and fixture set as open. (from briefs-1010.md)
- Brief 14 (docs condensed): HANDOVER.md is 486 lines against a 300-line done-when; `NEXT_FABLE_WINDOW.md` does not exist. (from briefs-1010.md)
- Brief 16 (documentation refined): no HISTORY record of the pass. (from briefs-1010.md)
- Brief 17 (launchers, splash): agent-remaining/OPEN.md:405 names the rest of Brief 17 as open. (from briefs-1010.md)
- Brief 18 (the complete open scope): an umbrella brief, only section A recorded in HISTORY. (from briefs-1010.md)
- Briefs 25 to 31 (group): each plan phase list is still open; "nothing is built" for 25. (from briefs-1010.md)
- Brief 32 (templates and base layouts): deferred by the owner; BACKLOG 4b carries the standing row. (from briefs-1010.md)
- Brief 33 (rest of WORLD_CLASS_PLAN): HANDOVER.md:450 names it as the next brief. (from briefs-1010.md)
- 745 (d): the hover-only tour step reveal is built nowhere (tour.js has no hover handling). (from coverage-1010.md)

## Left by the a11yfix and filing agents (merged 2026-10-10)

Both files are in [`../archive/agent-remaining/`](../archive/agent-remaining/). The filing numbers (top-1 0.417 without a model against decision 8's 0.8, 0.808 with the embedder) are in the archived file; decision 6's scope ruling is INBOX 770 (taken); torch and sentence-transformers were removed from the shared venv.

- design-1010 row 5, 110 controls with no focus change (`a11yname.js` focus pass): Brief 57, decision 15. (from a11yfix-1010.md)
- The boot CSS cap (`tests/test_boot_budget.py`, 183,300) had 3 bytes of room; this work spent it with blank-line collapses in `00-tokens-shell.css` and `01-forms-settings.css`. The next CSS addition needs a lazy file or a cap-lowering trim first. (from a11yfix-1010.md)
- `app.js` is within 14 bytes of its ratchet (`tests/test_static_compression.py`, 14,300): `makeUnlinkAccessible` moved out to `note-cards.js` to stay under it. (from a11yfix-1010.md)
- Row 4 measured on a seeded notebook (13 notes), not the report's: title-only icon controls in the Notes list 54 to 0 at 1440, 21 to 0 at 390. Other title-only icon buttons built outside the Notes list (other tabs, Settings) were not counted. (from a11yfix-1010.md)
- Not measured: dark theme for axe `target-size` and `scrollable-region-focusable`; the 1024 width. (from a11yfix-1010.md)
- Decision 8's bar, "below 0.8 top-1 without a model the step is not done": 0.417 (`tests/test_filing_accuracy.py`, strict xfail). Forced to choose, the evidence is right 0.61; 39 of 120 notes name no pack phrase ("dal", "boiler", "episode", "MOT", "nursery"). Recommendation: an everyday vocabulary supplement beside the pack, reviewed by the owner (a pack migration, so the owner's call), measured on a second fixture written after it. (from filing-1010.md)
- Decision 6 says "the pack's flag": the pack has none. The 49 sensitive topics are MemoryMap's own list in `src/memorymap/ai/data/taxonomy/memorymap_filing.json`. (from filing-1010.md)
- The data path: section 23 says `src/memorymap/ai/data/taxonomy/`, section 26 decision 56 says `src/memorymap/data/`; section 23's was followed. (from filing-1010.md)
- Decision 4, "alternate names come from the pack's labels and the person's own titles": only the pack's labels (`entry/tidy.py` `_rows_category_names`). (from filing-1010.md)
- Decision 4's centroid test needs the search model; with it off the merge review uses topics alone at 0.8 and says so in the row (`tidy.MERGE_TOPIC_OVERLAP_ALONE`). (from filing-1010.md)
- The lexicon (decision 7) costs one note in the online simulation (0.521 to 0.510, `scratchpad/filing-tools/online.py`); the fixture has no category named for a topic another holds, so the case it is for ("Work, not Software") is only in `tests/test_tidy_categories.py`. (from filing-1010.md)
- Decision 9 (the 30 context rules, 50 acceptance fixtures): not started; `taxonomy.context_rules()` and `tests/fixtures/taxonomy/context_acceptance_fixtures.json` are in place. (from filing-1010.md)
- Cost: `decide` is 34 ms a call at 5,000 synthetic notes against 8 to 17 ms for the old tally (`scratchpad/filing-tools/perf.py`); Tidy's uncategorised review calls it once a note. (from filing-1010.md)
- The tag picker on an empty field puts the tags the note says first ("training 10 notes, in this note"), but on a note that says none of them it still lists every tag by use (`frontend/js/tag-suggest.js` `fillTagSuggest`): a completion list, not a suggestion, so left. (from filing-1010.md)
- The model's tag reply is grounded against a faked reply (`tests/test_tag_grounding.py`); what a real small model answers is not verified. (from filing-1010.md)
- Graph topics as categories ("How are they different from categories??", the graph agent's hand-off in `archive/agent-remaining/graph-1010.md`): not in section 23's steps, so not done. (from filing-1010.md)

## Left by the notice agent (INBOX 767, merged 2026-10-10)

The no-model notice is one row on the `.notice` recipe on all five surfaces (46.8px at 1440, two rows only under 600px); its 58 gzipped bytes were paid for by the blank lines of 08-consistency.css, so the boot CSS cap stands at 183,300 and the next CSS goes in a lazy file.

- Row height at 1440 is 46.8px, not "one line plus padding" (about 38px): the Connect button's 28.8px target floor sets the row. Left as is; shrinking it would break the touch-target lint. (from notice-1010.md)
- The palette is never shown on a phone (`toggleAgentPalette` goes to Chat), so its 390px notice is unmeasured by design. (from notice-1010.md)

## Left by the engine agent (Brief 39, CHAT_PLAN Phase 6, merged 2026-10-10)

The file is in [`../archive/agent-remaining/engine-1010.md`](../archive/agent-remaining/engine-1010.md); its numbers are in the merge commit.

- Blind panel (decision 40): the owner's rating against the 1 to 3B model; not runnable by an agent.
- P10 days until a note's date ("how many days until the dentist"): `utilities.until_subject` (src/memorymap/ai/utilities.py:313) finds the subject; compose does not yet look the date up in the notes.
- P11 mention counts ("how many times did I mention Porto"): no count shape; `notebook_stats` counts notes, not mentions.
- P12 a list filtered by category or tag ("list my work notes"): `composer._filtered` (src/memorymap/ai/composer.py:3155) filters by tag and source kind, not by category.
- P13 every date and what is due this week: the fact layer has the dates (`factgraph.of_kind`), no answer shape lists them.
- P15 a lead-in chosen after the parts: the compare opener is still chosen first.
- P16 a note's open checklist items for "what is still open on X".
- Decision 45: the readings are listed (`composer._readings`, src/memorymap/ai/composer.py:2693); a running model does not yet pick among them (needs a real model; `pytest -m evals`).
- Decision 43: the currency table is dated (`utilities.RATES_DATE`, src/memorymap/ai/utilities.py:113) but has no Settings editor.
- Captions: the composer reads them as note content; keyword search finds them as the picture's own row (src/memorymap/search/index.py:793), not as its note's.
- Dates like 3/4 read day first (`when._date_phrase`, src/memorymap/ai/when.py:420); no locale order.
- Not seen in a browser: the web sources list with a real search engine; contrast sweeps over `.said` and the act card.
- Polarity in the fact layer: dropped by decision 30's own condition (no feature uses it).
- Found, not mine: tests/test_ask_answer_object.py::test_ask_is_never_disabled_when_the_model_is_off fails on the base too (the chat skills trigger's `dataset.needsModel`).

## Left by the chatui agent (the owner's 2026-10-10 chat and first-run list, merged 2026-10-10)

The file is in [`../archive/agent-remaining/chatui-1010.md`](../archive/agent-remaining/chatui-1010.md).

- Item 32, "metadata ... very messy": the chat answer's foot is still three rows (Sources, Grounded in, meta), 148 px measured on a five-source answer; fold Grounded in and meta into one muted line (chat-agent.js:2275, the sources block). The head label and the result-card reason are done.
- INBOX 694 part 1, "the bottom of these pills gets cut off": not reproduced at DPR 1 (Ask|Agent and Settings `.seg`: each segment 1 px inside the 32 px track top and bottom); the Pace pill is drawn in skills.js:462 (outside this agent's files) and was not measured; try DPR 1.25 and dark.
- INBOX 731, "the help guide failed??": with a model only; no model answers (help-chat.js:329 is the catch). Needs the server log line from a model run.
- INBOX 742 and 743, "atlas doesnt seem to change emotions alot", "more mouse interaction ... rubbing its head. flipping it upside down": gestures, moods from app events, the enlarged view mirroring live state. Not started.
- INBOX 743, "atlas goes out of the border": not reproduced (figure within 4 px of its svg, no oval frame drawn at this head); recheck the welcome card on Windows.
- INBOX 744 (b) and (c), "it didn mention other matching records": composer and grounding work (composer*.py, renderAnswerGrounding), off this agent's list.
- Start SearXNG "takes a while": not reproduced (status 21 to 101 ms, chat.js:1031 `setWebSearxngRunning`); a search that failed should retry by itself once the engine answers.
- Web link cards in chat and the web reader share no recipe with markdown.js:1258 `linkCard`; one recipe for both.
- Citation hover, the composer and captions in retrieval (Brief 39) and the density items (Brief 41) are owned elsewhere.

## Left by the trust73 agent (Brief 73, rules 4, 5 and 14, merged 2026-10-10)

The file is in [`../archive/agent-remaining/trust73-1010.md`](../archive/agent-remaining/trust73-1010.md).

- Rule 4 "says what happened, why": 24 literal error toasts still fall back to Open the logs rather than an action of their own (`tests/test_error_toasts.py` LOGS_ACTION_CAP 24): chat-attach.js 2548/2768/2956, library.js bulk failures (1846, 1892, 3360, 9967, 10106) and 4671, settings.js 3463/3508/3527, whiteboard.js 8335/8351/10359/14697, shell-reminders.js 1135/1143, settings-controls.js 320/393, update-dialogs.js 216, lightbox-view.js 753, note-properties.js 44, documents-code.js 1499. Each wants a Try again bound to its own function, and a why where "Couldn't X." has none.
- Rule 4: the 338 `toast(e.message, true)` calls get the why from `plainHttpError` and the default Open the logs; a per-site retry is not built.
- Rule 5 "a long-running task that does not register fails": the lint is a table of thread sites (`tests/test_activity.py` THREAD_SITES); request-bound long work outside the four streams, transcription and picture reading (a document import, a meeting summary, the jobs pool's model lane rows) registers only through `collect()` or not at all; `core/activity.track` is the one line to add.
- Rule 5: a stopped answer ends its stream without a `done` line; how Chat, the Guide and the documents panel render that end is not verified in the page.
- Rule 5: "the managed runner killed" has nothing to act on: the app starts no model runner (extras.py says llama-server is run by hand), so an OpenAI-compatible backend answers that it keeps its own model.
- Rule 14: `/health` stays the launcher's open probe (instance_lock.py, __main__.py read it unauthenticated, and it answers on the LAN); the fields are on the signed-in `GET /debug/health` under `trust`. Moving them onto `/health` needs the owner's yes.
- Rule 14: the Health block stays in Settings, About (where it was built, PLAN B9) rather than its own section; reach is the palette's Health (1) and Settings, About (2).
- Not verified: Ollama's real `keep_alive: 0` and `/api/ps` (a slow fake in the agent's scratch dir stood in), the desktop window, WebKit.

## Left by the docs42 and docs42b agents (Brief 42, INBOX 736, merged 2026-10-10)

The files, with the measured before table and the vendoring keep-or-drop table, are in [`../archive/agent-remaining/docs42-1010.md`](../archive/agent-remaining/docs42-1010.md) and [`docs42b-1010.md`](../archive/agent-remaining/docs42b-1010.md); what docs42b built is in HISTORY "Moved from the plans, 2026-10-10 (DOCUMENTS Brief 42 remainder)".

- INBOX 735 first half: the p5.js sketch document kind (code beside a sandboxed live canvas, vendored `p5.min.js` only); `api/run_sandbox.py` would need a p5 runner that loads the vendored file into the frame. Brief 69 (D6 previews). [docs42]
- Document comments with the board's thread shape (Reply, Edit, Resolve, Attach): a decision first. Comments are `==words== %%remark%%` in the text ("no comment store and there must not be one", documents.js `renderDocComments`) while `wbCommentRow` needs ids, `reply_to`, `edited`, `resolved`. Recommendation (take it): keep the text model; a reply is the next `%%…%%` on the same line, Edit rewrites in place, Attach appends a `[[link]]`, Resolve takes it out; lift `wbCommentRow`'s DOM into a shared row taking `{list, save, refresh}` and add the recipe ratchet in `tests/test_ui_recipes.py`. [docs42b]
- Word import of tracked changes: the .docx carries `w:ins`/`w:del`, but Mammoth reads an insertion as accepted text and drops a deletion (documents-word.js `docWordImport`); the server reader `docview.docx_to_markdown` keeps them, so a .docx with revisions could go there. [docs42b]
- A fenced code block's language (```js) is not written to Word, so it comes back as a bare fence (`docWordBlocks`, the `pre` branch); header cells come back bold (as before). [docs42b]
- .diff, .patch, .vb and .vbs are not in `docview.CODE_SUFFIXES`, so a Library import of one is refused (415); a Dockerfile has no suffix at all (core/docview.py, with the chat picker's `accept` list `tests/test_docview.py` pins). Bug. [docs42b]
- The output grip is 24 px (the grip recipe), under touch.js's 44 px floor at 390; touch.js does not list the run panel as a surface. [docs42b]
- js-beautify on a selection is not used (a selection keeps the conservative re-indent); `vendor_use.py` reports "selection" as its one unused capability. [docs42b]
- Brief 42's other items not started: highlights on pages, comments with bookmarks and links, link cards with a viewer, the long-form preference at first run, labelled sections with a local graph (a Phase row first), doctype.js under 30 ms. [docs42]
- Not verified: the .docx opened in Word itself (its XML and Mammoth's reading only); Format on a large real file; the list chords on a non-US layout; the docx extra's removal on an install that has python-docx (it stops being listed). [docs42b]

## Left by the trust agent (Brief 74, T0 sweeps for 72a, 72b and 73, merged 2026-10-10)

The file, with the T0 table, is in [`../archive/agent-remaining/trust-1010.md`](../archive/agent-remaining/trust-1010.md); the plan's pointer is WORLD_CLASS_PLAN 28.6.

- Settings, every switch and choice: 13 pressed, 0 undone by Ctrl+Z (`settings-controls.js` has the only `pushUndo`; 48 write functions in `settings*.js` and `prefs.js`, 3 with an undo path).
- Reminders: "Add" and "Mark done" push nothing (`shell-reminders.js`; 7 write functions, 3 with an undo path); Ctrl+Z restores neither.
- Documents: "Delete" shows a toast Undo, but Ctrl+Z goes to the open editor's history (`surfaceHistory` in `status.js`, the Documents branch) so the deleted document stays deleted; "Archive" and "Start a new document" push nothing (21 write functions, 5 with an undo path).
- Mind map "Add a top-level topic": the board stack grows by one, Ctrl+Z leaves the lists differing (`/whiteboard/` state not equal to before); unverified which list.
- Chat "Save this chat as a document": creates a document, no undo (`chat.js`; 28 write functions, 7 with an undo path).
- Whiteboard 43 write functions, 14 with an undo path; mind map 25 and 7; graph 21 and 9; library 30 and 9; dashboard 9 and 1; timeline 5 and 1 (`measure-writes.py --list SURFACE` names the gaps).
- Not reached by the sweep: right-click menus, keyboard-only acts (Tab for a branch), controls that open a picker and then need a second choice (note "Move to another category", "Add tags"), and library delete (all 14 pressed in the library were views or pickers). The 25 pressed actions are a floor on what is exposed, not the whole surface; `measure-writes.py` is the full-coverage count.
- Documents were not probed in the dark run (the list had not loaded when the sweep opened it), and the mind map "Add a top-level topic" undid in one light run and not another: re-run both before quoting them.
- `#wb-tool-group span.wb-tool-section-label`: text 49 to 56px past its box at 820, 1024 and 1440 on the whiteboard and the mind map (36 nodes counted as overflow and as clipped text).
- `#entry-list div.entry-meta.note-meta`: 64 to 72px wider than its card at 320 and 390 (one per note, 33 to 42 nodes); `#entry-list li` 24 to 48px at 320.
- `#select-btn span.dock-word` 40px and `#notes-filter-menu span.dock-word` 32px clipped at 320 to 1024: the labelled-to-icon collapse hides words by clipping instead of removing them (may be intended; if so the rule needs the exception written down).
- `button#notes-tidy.ghost.small` 4px at every width; `#tab-notes div.layout` 4px at 320 to 1024.
- Dashboard: 3 overflow and 1 clipped text at 320 and 390, 2 overflow at 820 and wider (selectors in the sweep output, not yet named here).
- Docks: 0 sibling intersections in 12 surfaces at 5 widths (at 390: 81 bars and 266 sibling pairs examined), so the dock grammar holds; the counts that fail are text and content boxes.
- Counts scale with the number of seeded notes (the notes list repeats one finding per card): the table in 28.4 was taken on 13 to 23 notes.
- Crawl: 55 destinations found from the dashboard (1, 14, 36, 3 and 1 at depths 0 to 4, crawl complete to depth 4), 1 deeper than 3, 16 with no palette command (of 80 commands); dark: 55 destinations, 1 deeper than 3, 14 without a command.
- Palette rows missing (heuristic word match, the destination and its click path): 1  Notifications: # unread (muted except reminders); 1  Atlas files it for you; 1  Draw, then keep it as a note; 2  Chat > About this chat; 2  Chat > Search everything and jump anywhere (Ctrl+K); 2  Library > Boards & maps; 2  Library > Bookmarks; 2  Library > Contents; 2  Settings > Search and index; 2  Settings > What it learned; 2  Settings > Web search; 2  Atlas files it for you > Manage categories; 2  Answered from your notes > About the Use AI switch; 3  Notes > Writing room > Write from notes you already have, up to six of; 3  Library > Contents > Probe documentDocument·# sections·#h ago; 3  Atlas files it for you > Manage categories > About managing categories.
- Deeper than 3 (light): 4  Library > Contents > Probe documentDocument·# sections·#h ago > Outline.
- The crawl presses navigation-looking controls only and one item of each repeated list; a destination absent from it is "not found by the crawl", not proof it is missing. Sub-tabs on one page share candidates, so a button seen on the first sub-tab is not pressed again on the others.

## Left by the F1 and F2 agents (Briefs 65 and 66, the one reader and quick add, merged 2026-10-10)

- `ai/composer.py` `_DATE_CUE` (about line 380) and its second date pattern (about 933) still compile date words; replace with `recognise.recognise(...)` spans when Brief 67 makes chat a client of the reading, then empty `STILL_READING` in `tests/test_one_reader.py`. [f1-1010]
- `entry/timewords.py` keeps its own weekday and number tables (the plan's second allowed reader, for stored precision). Brief 68 decides whether `find` becomes `recognise` spans plus a precision map. [f1-1010]
- `ai/factgraph.py` `_QUANTITY` still reads counts of things ("3 sets", "5 people"); a "count" kind (number plus plural noun) in `recognise` would let it delegate. [f1-1010]
- `search/query.py` `before:`/`after:` stay ISO only (`test_an_unreadable_date_invents_nothing` holds it); `before:tuesday` is one call to `recognise.span` if the owner wants it. [f1-1010]
- "last week" is the last seven days in search and the previous Monday to Sunday in `recognise`; both written down, the Reading says the search's window. An owner decision if one meaning is wanted. [f1-1010]
- `when.resolve("in march")`, "march", "q4" give the next one at 09:00 (a reminder is never in the past); the past one comes from `when.window` and `recognise`. By design. [f1-1010]
- "on my birthday" reads only with a stored birthday (`context["birthday"]`, `birthday=` on `/read`); no setting holds one yet. [f1-1010]
- "every weekday", "every other friday" and yearly repeats save once: `routes_reminders.Recurring` holds only daily, weekly and monthly; the Reading keeps the RRULE in `slots["repeat"]`. [f1-1010]
- Quick add is 56 of 60 on `tests/fixtures/composer/quickadd_1010.json` measured before F1's four fixes landed; re-run `scratchpad/ui-sweeps/quickadd.js` on this head and move CHAT_PLAN F2's Built block to HISTORY only at 60 of 60 (decision 50's gate). [f2-1010]
- `ai/reading.py` reads "review budget friday" (reminder surface) as sure at 09:00 while quickadd.js asks "What time on ...?" (decision 50); the reading should ask the same question. [f2-1010]
- Quick note: a reminder chip on a note saved while the server is away (the outbox, `saveQuickNote`'s `result.queued` branch) is dropped; the note is kept. [f2-1010]
- Palette: only the reminder act has a row (`quickAddPaletteRow`); a note or meeting act and the search window chip (CHAT_PLAN section 1 row 7) wait for Brief 67's act registry. [f2-1010]
- Timeline at 390: a long window chip wraps to two lines (39 px), no overflow. [f2-1010]
- Not verified by either: a real model's path; a screen reader toggling a chip; a browser locale other than en-US; the full suite. [f1-1010, f2-1010]

## Left by the F3 agent (Brief 67, the validators and the acts, merged 2026-10-10)

- Palette rows from the registry: `acts.palette_rows` (src/memorymap/ai/acts.py) has no caller and `palette.js` still lists its own starters; a route and the palette drawing them (decision 53; Brief 68 row 7). [f3-1010]
- A model's proposed act through the registry: `acts.propose` is tested but nothing calls it; the agent's write tools keep their own confirm path (`agent.py`). Brief 68 row 8. [f3-1010]
- A reminder with no time said is guessed as tomorrow at 9, shown "(no time was said)" (`commands.py`, `when.resolve("tomorrow")`); decisions 48 and 50 say ask once. `acts.missing` and `validate.slots_missing` are in place; the reader fills the slot first. [f3-1010]
- Ask draws no Confirm and Not right: `capture-ask.js` keeps `onGrounding`'s insights unread though the route sends them (decision 60 lists chat, Tidy and the dashboard; Ask is optional). [f3-1010]
- The 390 px layout of the Tidy Patterns rows and the Chat pattern line is not measured (1440: Tidy row buttons 32 px, no overflow; Chat line 55 px). [f3-1010]
- "Grounded in" says 4 notes while the support chip says "3 of 3 from your notes" on "tell me about golf" (seen in a sweep screenshot, not investigated). [f3-1010]
- The decision 54 sum rule: "12 * 7 is 84." is read as its own "Read as" because it restates the question's sum; every other utility answer has a "Read as" line. [f3-1010]
- Not verified: real-model answers through the validators (fake transport and the route test only); dark mode. [f3-1010]

## Left by the search agent (Brief 47, WORLD_CLASS 25a, merged 2026-10-10)

- A chat is one search row (the whole thread), so a hit opens the chat, not the turn that matched (`index._conversation_row`). [search-1010]
- `tag:` with words still filters after the keyword pass's 200 candidates (`engine.search`, the `wanted_tags` block), so a common word plus a rare tag can miss notes. [search-1010]
- `GET /resurface/near/{id}` 500s ("shapes (384,) and (4,) not aligned") when the notebook holds vectors of another dimension (the scale_test fixture's 4-d vectors after a 384-d save); a model switch with stale vectors would do the same (`api/routes_resurface*`). Bug. [search-1010]
- Brief 47's "the sidebar's search field routes here": the Notes sidebar has no search field; the no-match Search everything button and the saved-search rows are the routes built. [search-1010]
- Not verified: hybrid ranking cost at 5,000 notes with a real embedding model (keyword plus the fake backend only); the saved-search ⋯ menu opened in a browser; the phone's saved-search rows at 390 beyond the DOM count. [search-1010]

## Left by the f4 agent (Brief 68, CHAT_PLAN F4, merged 2026-10-10)

- Note editor: offers on the Edit form are wired (`note-edit-panels.js` after `li.append(surface, ...)`) but measured only on the Capture composer; the Edit form's filing offer sets the hidden select and redraws the chip through its `change`, not seen in a sweep. [f4-1010]
- Note editor: a sum only when written with `=` ("12 + 7 = 21"); a column of amounts with a "Total:" line is not checked (`ai/offers.py` `_SUM`). [f4-1010]
- Dashboard: the digest is in dashboard.js (a boot file, about 700 bytes gzipped); a lazy home would delay the first paint of the widget it opens. The model "refining" the digest (the plan's "with the model refining it when present") is not built: Atlas's week below it is the old stream, unchanged. [f4-1010]
- Documents: the status bar shows characters, words and reading time; lines (`wc -l`) are counted by `textCounts` but shown nowhere. "find with the same windows" is the Library's Search documents box (`GET /documents?q=`); the editor's own Find bar is a substring find, unchanged. [f4-1010]
- Board: board acts are off on a mind map (`wbPaletteActRow` returns null when `wbIsMap()`): a map's layout is its tidy, not a grid. Pasting a list as stickies or map topics was already built (`wbPasteText`, `wbMapPasteText`). [f4-1010]
- Library: a "boards" or "mind maps" filter resolves to `Entry.is_board` ids, but the Library's filter keeps note cards only (`library.js` `libraryPhrase`), so it shows nothing there; the Graph is notes only too. [f4-1010]
- Filters: "last week" is the last seven days here (the search's meaning) and the Monday to Sunday week in `recognise`; F1's owner decision row still stands. [f4-1010]
- Settings: the synonym groups and the filler list are a hand table (`filters.SETTING_WORDS`, `SETTING_FILLER`), measured on 10 phrases in the browser; no settings phrase fixture in tests. [f4-1010]
- Import: people and places are named in the summary only; they are not written as tags or entities (the save's own extraction runs as before). `recognise` reads a person only in some shapes ("with Ken", "Sam Carter"), not "serviced by Ken" or "Ken Adams serviced" (`ai/recognise.py` `_contact_cands`). [f4-1010]
- Agent: `propose_act` is offered in the reminder and tag tool groups only; whether a 1 to 3B model calls Calculate rather than computing is not verified (no model here). [f4-1010]
- Voice: 67 failure toasts in library.js, whiteboard.js and whiteboard-map.js moved; the other 112 JS files still hold their own strings, and only the failure shape is in the table (decision 55: surface by surface). One template toast left as written (`library.js` "Couldn't import “${file.name}”"). [f4-1010]
- Scorecard: the follow-up column needs decision 58's 200 spoken lines, which are not written; variety's minimum is 3 of 20 against the plan's target of 8. [f4-1010]
- Boot JS 582,371 to 583,240 bytes gzipped (+869: the digest, the Library and Graph filters, the palette rows, the voice table, `textCounts`; cap 588,400); boot CSS 183,286 to 183,286 (cap 183,300, 14 bytes left). New UI otherwise lives in the lazy quick add, library and graph bundles. [f4-1010]

Swept on this head: errors.js 0 errors and 0 layout findings at 1440, 1024, 820 and 390 (1024 timed out once on a click under load, 0 on the rerun); touch.js 0 findings. Not verified: a real model's path (no `MEMORYMAP_EVALS_URL`); the agent palette at 390 (it did not open from `toggleAgentPalette` in the phone shell); a screen reader on the new chips; the full suite.

## Left by the companion agent (Brief 34, first round, merged 2026-10-10)

Taken up by the companion2 agent (Brief 34 continues, INBOX 772 and 773).

- Decision 7's "under 1 ms a minute" is not met by Atlas: its tail is a script-drawn path (atlas-life.js `atlasTailFrame`), 15 draws a second at rest, about 770 layouts a minute. Meeting it needs the tail on the compositor (a cached sprite strip, or CSS on layer roots), a drawing change. [companion-1010]
- Atlas's faces do not read as different moods (sheet: atlas-sheet-*.png, 15 moods at 104, 28 and 20 px, both looks, light and dark): at 104 the face is about 12 px inside rings and tail, at 28 and 20 the moods are one face. Real mascot work changes eyes, brows and mouth boldly, with a mood cue (sweat drop, zZ, hearts, "!") that survives at 20 px. Likely the root of "I barely get to see atlas change expression" (atlas.js `atlasApply`). [companion-1010]
- Under the system's reduce-motion hint Atlas keeps its calm CSS loops (an earlier decision, 08-consistency.css:5056): 1,579 style recalcs a minute. Decision 7 says reduced motion keeps poses without loops; the owner should say which wins. The app's own Reduce setting was not measured. [companion-1010]
- Brief 34 second part (INBOX 752): snapping transitions per minute (60 Hz joint sampling), 12 distinct idle motions per ten minutes and reaction latency under 100 ms were not measured; the latency bar conflicts with the 1.5s reaction debounce the owner asked for ("atlas startles a lot"). [companion-1010]
- The owner's "arm movements ... permanently in a downward arc": the arm hold now changes on idle ticks (45%), but the arm angle range over a walk cycle and at rest was not measured (atlasarms.js has the probe). [companion-1010]
- Tail, rings, nebula and lower-body "subtle animations that are all cheap" (owner's list): not changed; they exist (atlas-life.js) and are the cost above. [companion-1010]
- Face sheet (facesheet.js, 12 names, light): one silhouette, one outline, readable at 104; crowns spill 6 px past the card's top edge; the gaming controller reads as a black block at 104. [companion-1010]

Not verified: Every "Done when" face site was read in code (`nameMark` goes through `characterRendererFor` first), not driven one by one this round. Context reactions (drowsy, sleep, headphones, glasses, nightcap, bell, offline, wave on focus) are present in avatars.js and were measured by earlier sweeps; not re-driven. Timings: other agents held the load at 6 to 10 on four cores; counts (layouts, recalcs) are load-free, milliseconds are not. A WebView2 or WebKitGTK window; a touch rub (mouse and pen only by design).

## Left by the pwa agent (Brief 50, WORLD_CLASS 25d, merged 2026-10-10)

- clip.html and capture.html keep unhashed `?v=<version>` stamps (static, not rewritten as index.html and offline.html are), so an edit inside one version can be served stale from the immutable HTTP cache there. [pwa-1010]
- Warm-load speed gain is inside the noise on a shared machine (466 to 570 ms against 613 to 672 ms) because stamped files were already `immutable` in the HTTP cache; the gain is offline-ability and a cache the browser cannot evict as easily. A quiet-machine A/B would settle it. [pwa-1010]

Not verified: a real install prompt (`beforeinstallprompt` was dispatched by hand in Chromium; no real Chrome install, no Edge, no Safari, no iPhone). The iPhone row (no event, "Share, then Add to Home Screen") is source-tested only. frontend/js/settings-wiring.js, `renderInstallRow`. the share target from a real phone share sheet. The query landing in Capture was driven in Chromium with the worker controlling the page (`/?share_title=...` fills `#entry-content` under the Notes tab); the installed-app path is untested. frontend/manifest.webmanifest `share_target` is GET. the desktop (pywebview) window's own cache with the worker; only Chromium was driven.

## Left by the measure60 agent (Brief 60, WORLD_CLASS 26.0 and 26a, merged 2026-10-10)

- Decision 58's `core/background.py` registry (name, started, stop) is not built; the lint only counts sites. Brief 63 neighbour. `tests/test_background_registry.py`. [measure60-1010]
- The 68 broad excepts that log nothing and return a fallback (89 minus the 21 seeded) are not ratcheted; decide whether decision 57 means them. `tests/test_no_silent_except.py`. [measure60-1010]
- 49 routes need a test or removal (`tests/test_routes_named.py` SEED); several are reached by a loop over verbs, check before writing duplicates. [measure60-1010]
- 5 foreign keys without a leading index (`entity_mentions` x2, `document_bookmarks` x2, `entry_bookmarks.bookmark_id`) and 64 filtered columns without one: needs a migration and an `EXPLAIN QUERY PLAN` at 5,000 notes first (26.4). [measure60-1010]
- Import cost 3.3 s against decision 56's 1.5 s: `ai.autonomous` pulls `ai.agent` (503 ms), `ai.help_chat` 271 ms, `api.routes_search` 226 ms. Brief 62. [measure60-1010]
- Graph at rest (1 to 10 long tasks) and the companion (4 to 6 at rest) are the two surfaces over the zero target (`frames.js` REST_BUDGET). [measure60-1010]
- `frames.js` has no documents or notes-list surface; add one when DOCUMENTS Phase work lands. [measure60-1010]

Not verified: Frame figures are one machine at load 5 to 9 on four cores; re-run `frames.js` idle before fixing a budget. Resident memory was measured on an empty notebook; a populated one loads the model at warm-up. The 647 MB is torch 2.14 CPU with bge-small, first embed 6.6 s. Hot-route times are in-process with the thread pool bypassed; `_to_out` at 5,000 notes is an extrapolation. Untested-route match is by path literal in `tests/`; a path built by concatenation of more than a trailing slash is counted untested. The `recalcs` CDP counter equals frames on every surface including the control; not read as a finding.

## Left by the safety agent (Brief 51, WORLD_CLASS 25e, merged 2026-10-10)

- `editor.js:inlineAiUndo` (owner's list of six): the inline AI bar's Undo reverts a CodeMirror transaction on unsaved field text, which rule 1.8 gives to the editor's own history. Recommendation: move it to the lint's editor histories rather than the stack (a stack entry outlives the field it would write to). Needs the decision taken. [safety-1010]
- `dashboard.js:undoActorFrom` / `activityUndoControl` (and their two helpers) and `note-history.js:undoSkillRun`: an undo of the AI's changes through `POST /events/undo`, which refuses the person's own changes ("Undo works on the AI's changes, not yours", routes_settings.py:1648), so there is no redo to give `pushUndo`. Needs a server redo (re-apply the reversed events) before they can fold. [safety-1010]
- `pushDocAiUndo` (documents.js:11084) already calls `pushUndo`; nothing to fold. It has no toast by design (the AI edit log is its second way back). [safety-1010]
- The plan row names a "Versions" row; the note menu's existing row is "History" (versions plus every other event). Not renamed: a rename moves help in five places for no new reach. Recommendation: keep "History", record the decision. [safety-1010]
- A notice's `go: { settings, focus }` scrolls Settings to the control at 1440 (Back up now at y 499 of 900) but not at 390 (y 1527 of 900): the phone sheet does not scroll to `scrollToId` (settings.js:245). Shared by every notice that opens Settings. [safety-1010]
- No backup schedule "shown with the last success" (WORLD_CLASS 4018 row) beyond Settings, About, Health's last backup line. [safety-1010]

Not verified: A real disk failure or power cut; damage was made by overwriting pages of a copy (three embeddings leaves: opens, notice shows; pages read by the start-up backfill: `DamagedNotebookError`). The desktop launcher's loading window showing the damaged-file words was not driven (only `startup_status.get_phase()` asserted). The e2e spec ran locally once (2.0 min); not in CI yet. Folds measured with direct calls to the real functions (`deleteCategoryFromPanel`, `chatDeleteUndo`, `undoImport`, `pushDraftUndo`) after an API setup, not by clicking through each surface's own menu.

## Left by the density agent (Brief 41, UI_MODERNISATION Phase 12, merged 2026-10-10)

- Step 5b, decision 6 (a primary calendar paired with the reminders): TIMELINE_PLAN section 9 (Phase 5, Brief 55); `renderReminderCalendar` (shell-reminders.js) stands until it goes (decision 19). [density-1010]
- Decision 8, indent guides: the active line is built (library-lazy.css `.cm-activeLineGutter`); indent markers are not in the vendored CodeMirror bundle (DOCUMENTS_PLAN 25 row 3, Brief 71's shell). [density-1010]
- Decision 7: only note cards changed (category pill to a dot and a word); chat bubble metadata not measured (no conversation without a model) and library cards untouched. [density-1010]
- Decision 1, panel padding 12 and sidebar gutter 8: not measured or moved; the Notes dock wraps to two rows at 1440 (86 px). [density-1010]
- Decision 5 for a date field built after boot: the map topic's due date (whiteboard-map.js) stays native; the date picker's typed field sets the date only ("tomorrow at 3pm" does not move the time field). [density-1010]
- Sweeps: touch.js reports Settings appearance and privacy "did not open" (section names moved); overlap.js still counts 4 px rows on `#notes-tidy`, `#dash-quicklinks`, `.library-controls`. [density-1010]
- One focus ring at 1:1 in Chat (`button.active`, its outline takes the ground colour, both themes; `scratchpad/ui-sweeps/focusring.js`). Bug. [density-1010]
- Not verified: tests elsewhere that relied on blank lines removed from CSS files 00, 01, 02, 05, 06, 07 and 10 to pay for the CSS budget; the picker on the Timeline range and Ask's as-of day beyond a smoke check; 390 beyond Reminders. [density-1010]
