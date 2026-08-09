# Session handover

> **The other four:** [ROADMAP.md](../ROADMAP.md) (live work) · [BACKLOG.md](BACKLOG.md) (§1–§29) · [ANALYSIS.md](ANALYSIS.md) (§30–§34, including the licence constraint — AGPL-3.0 now) · [HISTORY.md](HISTORY.md) (already built).

## Latest session: §54 — a 17-item user bug list on the whiteboard, a real security/correctness bug reaching every `/media/` image app-wide, then the rest of §11/§53's own "still open" list

Long unattended run, explicitly authorised to work through interruption
("assume I agree with everything, don't wait for me to prompt you"). Worked
the user's own bug list first (per this file's standing instruction), then
ROADMAP §11's remaining "still open" list, then several more reports and
feature asks that arrived mid-session. Full detail — every bug, the exact
fix, and how each was verified live — is in
[HISTORY.md §54](HISTORY.md); this is the short version and what's still
open. **Read this before touching the whiteboard, `/media`/`/files` auth,
or anything rendering a note's inline images.**

**The one that matters most, and wasn't reported as being about the
whiteboard specifically:** "image upload on the whiteboard doesn't work"
was one symptom of `GET /media/{filename}`/`GET /files/{attachment_id}`
requiring the `X-Auth-Token` header — which a plain `<img src>` (or a CSS
`background-image`, or the whiteboard's own SVG export) never attaches.
Every such image was a silent 401 on any notebook with a password set,
which is the normal case, and that includes §53's own "verified live"
inline-markdown-image fix — almost certainly a DOM-existence check, not a
painted-pixel one. Fixed with a query-param token fallback scoped to just
those two routes (a new `media_router`/`require_unlock_media`, so the token
doesn't widen onto every other route's access-log line) and a frontend
`mediaSrc()` helper wired into every affected render site. **If any image
anywhere in this app still doesn't render, check this first** — it's
unlikely to be a coincidence twice.

**Whiteboard bugs, all reproduced live before and after, from the user's
own list:** drawing over a card moved the card instead of drawing on it
(cards and the SVG draw layer are siblings, and the card's own drag claimed
the gesture first regardless of tool); sketches had no move or resize at
all (a new path-transform interpreter, `wbTransformPathD`/`wbPathBBox`,
scoped to exactly the commands this app's tools emit); copy/paste (cards
excluded — one-card-per-note-per-board would make a "copy" silently *move*
the original); multi-select (shift-click, rectangle marquee, bulk
delete/move — a real toggle-off bug found and fixed along the way, detailed
below); grid-snap not applying to shapes (fixed as part of the move/resize
work) and a real "stuck" accumulation bug in the *existing* card/object
drag under snap (re-snapping an already-snapped value every frame discards
the sub-grid remainder — fixed by tracking a raw running position); the
"glitchy and slow" report (dragging a card called a full board re-render on
every mousemove frame, purely to update its own link lines — now a
targeted update); arrowhead styles, two more shapes (triangle/diamond),
shift-to-constrain a drawn shape, Alt to bypass snap for one drag, a
dropped card landing offset from the drop point (top-left corner, not
centre, was being stored), the eraser not working with a touch drag (pen
worked fine — touch implicitly captures the pointer to the first element
touched, so `pointerenter` never fired for the rest; fixed with
`elementFromPoint`-based hit-testing that doesn't depend on capture at
all), low-contrast text boxes, and the snap checkbox not matching the
app's own switch styling. **Investigated and left alone, not reproduced**:
"clear board doesn't clear highlights, can't erase highlights" — a
highlighter stroke is an ordinary sketch and erased/cleared correctly every
way tried.

**A real bug in code from the same session, caught before it shipped, not
after:** the multi-select bulk-move logic originally decided "is this a
bulk move?" inside the drag's own `"start"` handler — which d3 fires on
*every* pointerdown, moved or not — so a second shift-click meant to toggle
a member back *off* an existing selection was mistaken for the start of a
bulk move and did nothing at all. Fixed by deferring that decision to the
first genuine `"drag"` frame instead (a zero-movement click never reaches
it), and applied the same fix to the analogous — if less visible — problem
in the node/object drag handlers, where a stale `d._bulkOrigin = null` left
over from an earlier *solo* drag would have permanently skipped
re-detecting bulk-move on a later gesture.

**Still open, in the order worth tackling them:**
1. **Real anchor/connection points** (draw.io-style fixed/free anchors) —
   named "worth its own session" three sessions running now (§53, §54, and
   this one again); do this first, and read how draw.io itself represents
   the fixed-vs-free distinction before starting.
2. **A properties panel for the current selection** — colour, stroke width,
   arrowhead, fill/border for a text object. No longer blocked on
   multi-select; a version that edits a whole multi-selection at once is
   the harder follow-up, not a prerequisite.
3. **Rotation** — needs a real schema change (no whiteboard table has an
   angle column), not a frontend-only pass.
4. **Card resize** — only images/text objects have it; a note's own card
   doesn't.
5. **Image cropping** and **an AI-guided diagram-generation mode** — both
   asked for directly, neither scoped yet.
6. A **mind-mapping mode** (decided: a whiteboard mode via the Graph tab's
   own Tree/Radial layout code + Tab/Enter branch entry, not a third tab —
   see ROADMAP item 25) is explicitly sequenced *after* item 1 above, since
   branch lines need real anchors to look like a mind map's branches
   instead of lines to arbitrary corners.

All ~1,600+ tests pass, `ruff check .` is clean, `node --check
frontend/app.js` is clean throughout. **What was and wasn't verified**: every
fix above with a checkable behaviour was driven against a real running
server via Playwright — synthetic pointer/keyboard gestures with real
coordinate math checked against hand calculations, not screenshots alone
(though several screenshots confirmed the visual result too, e.g. the text
box contrast fix, the shapes/arrowheads). The one thing that could not be
verified is the touch-eraser fix's actual premise: this sandbox has no
touch-capable input, so the "implicit pointer capture on touch" mechanism
is reasoned from the Pointer Events spec and the user's own report (pen
works, eraser doesn't — consistent with a hover-detection-specific cause),
not observed directly.

---

## Previous session: §53 — a user-reported bug list, then the whiteboard rebuilt into a real OneNote/draw.io-style canvas

Worked a list of live-reported bugs first (per standing instruction: fix
what's broken before building), then the whiteboard feature list from
ROADMAP §11, then several follow-up asks that arrived mid-session. Ten
commits, all pushed to `claude/roadmap-whiteboard-fixes-fhsazp` (PR #80),
full suite green after every one. **Read this before touching the
whiteboard, glassmorphism CSS, or inline markdown rendering.**

**Bug list, all fixed and verified live:**
- **`PUT /whiteboard/nodes` 500 / "card is stale."** Root cause:
  `WhiteboardNode`/`WhiteboardSketch` carry a real `ForeignKey("entries.id")`
  but were never added to `manager._hard_delete`'s cleanup list — purging a
  note that had a card on it, or that was itself a board, threw a raw
  `IntegrityError` out of `db.commit()`. Fixed (delete a card whose own note
  is gone; detach `board_id` to the default board when the *board* note is
  purged) and `routes_whiteboard.py` gained `_require_board` so a stale
  `board_id` from a client is a clean 404, not a 500. Reproduced and
  re-verified the exact failure live before and after.
- **"Preferences keep getting deleted."** Two settings sections
  (Preferences, Background Tasks) each saved via a whole-form
  `savePrefs()`/rebuild-from-DOM, and either one may never have rendered
  this session — so saving one silently overwrote the other's fields with
  raw HTML defaults. Fixed by moving Background Tasks' controls onto
  `setPreference` (single-key PUT, the pattern the codebase had already
  established but never finished applying) and giving that section its own
  render step. Verified live: toggling one section's field no longer
  touches the other's.
- **Glassmorphism "more opaque than before."** The existing blur slider
  never touched alpha (confirmed unchanged across its whole range, live) —
  the real gap was that *nothing* controlled transparency independent of
  blur. Added a second slider (`--glass-opacity`, `color-mix()` at each of
  ~20 `--card`/`--inner`/`--input-bg` definitions, default 100% = unchanged),
  a glass "sheen" (a diagonal highlight — the standard glassmorphism tell
  that a translucent panel is *glass*, not tinted paint), gated so it's
  **off when glass itself is off, off by default even when glass is on, and
  auto-enables the one time glass is switched on from off** (exact spec,
  asked for directly, verified live in that exact sequence), with its own
  adjustable strength slider. Opacity floor lowered 30%→5% (re-reported as
  "still not clear enough"). Also fixed while in here: the whiteboard's
  default stroke colour was hardcoded white regardless of theme — invisible
  on light theme's own light board background — now black/white by theme
  and persisted (previously reset to white every load).
- **Images rendering as raw `![...]` markdown instead of `<img>`, app-wide.**
  Two separate inline-markdown renderers (`renderInlineMarkdown` for the
  note-card list, `appendInline` for chat/documents) had zero image support
  and links restricted to absolute `http(s)` — so a note's own
  `![name](/media/hash.ext)` (exactly what paste/drop/attach produces) never
  rendered anywhere. Fixed both, gated through a same-origin `isRenderableUrl`
  allowlist. Extended to every place that showed a note-text snippet as
  plain `.textContent` (link chips, doc-sidebar buttons, related-note
  previews, graph Trace readout, dashboard "Most used") via a new `compact`
  render mode (alt-text instead of a real `<img>` in label-sized spots).
  Verified live: `**bold**` renders as `<strong>` inside a link chip; a real
  uploaded image renders as `<img src="/media/...">` in the note list.

**Whiteboard, rebuilt per ROADMAP §11 plus several follow-up asks:**
- **Board picker redesigned.** It used to list *every note in the
  notebook* as a "board" (any note can serve as `board_id`) — a 50-note
  notebook got a 50-item dropdown with no way to tell which were real
  boards. New `GET /whiteboard/boards` lists only boards something is
  actually on (plus the always-present default), `POST /whiteboard/boards`
  creates a named one directly. Verified live: seeded 5 ordinary notes,
  dropdown still showed only "Default board."
- **New `WhiteboardObject` table/kind: images and text boxes.** Neither a
  card (always wraps a note) nor a sketch (a path, not a placeable
  rectangle) fit "paste an image onto the board" or "a real text box, like
  OneNote." One table, `kind` discriminator, JSON `data` blob
  (`{url}` for image, `{content, color, font_size}` for text). Frontend:
  full render/drag/8-handle-corner-and-edge-resize, a Text tool (click to
  place, focuses for immediate typing), image paste/drag-drop/upload-button
  all through the existing `/media/upload` path. Verified live end to end:
  drag moved an object by the exact mouse delta and persisted server-side;
  SE-handle resize grew width/height by the exact delta; NW-handle resize
  correctly anchored the *opposite* corner (x/y and w/h moved oppositely);
  a text edit persisted through blur.
- **Clear board, export, grid — all built and verified live.** Clear-board
  reuses the existing per-item undo entries (no new undo shape). Export
  builds a real SVG (sketches cloned as-is from the DOM so stroke
  colour/width/opacity survive exactly; cards/objects as simplified
  rect+label) that serves PNG (rasterized via canvas), SVG (written
  directly), and PDF (handed to the browser's own Print → Save as PDF,
  deliberately not hand-rolled PDF bytes). "Screen clip a selected area"
  became two concrete scopes (visible viewport / whole board) since no
  marquee-select exists yet. Grid: three types (lines/dots/isometric,
  draw.io's own set), synced to the live zoom transform so it pans/zooms
  with the board, plus snap-to-grid (only live while a grid is shown) wired
  into both card and object dragging. Per-board background image via the
  same upload path, stored in localStorage per board id.
- **Explicitly NOT built — flagged for the next session, not attempted
  shallow:** real anchor/connection points (fixed corners+edges, a free
  point along an edge, a link visually terminating on the border) — this
  project's own roadmap already named it "the biggest single piece, worth
  its own session," and the user asked for it directly plus "take
  inspiration from draw.io." Attempting a thin version alongside everything
  else in this session risked exactly the shallow-then-redone pattern this
  file's own history keeps warning about. **Do this next**, looking at how
  draw.io itself represents a fixed-vs-free anchor before building.

**A real security bug, caught by CI, not by me.** The image-object delete
path I wrote used `url.startswith("/media/")` to decide what file to
`unlink()` — `/media/../../../etc/passwd` passes that check and resolves
outside the media folder entirely. CodeQL flagged it (medium severity,
`py/path-injection`) plus two `py/log-injection`/`py/side-effect-in-assert`
findings on the same PR. **First response to the CodeQL failure was wrong**
— guessed at ReDoS/traversal fixes in files that felt likely rather than
reading the actual annotations, which cost a wasted commit before fetching
the real alert list (rule name, file, line) and fixing the three things it
actually named. The lesson worth keeping: CodeQL's summary line ("3 new
alerts") does not say *which* three — `gh`/the check-run API does, and
guessing from the diff instead of reading the annotation is the same
"reasoning about behaviour instead of reproducing it" trap this file
already warns about elsewhere, just applied to CI output instead of a
running server. Fixed properly: `MEDIA_URL_RE` (exact upload-produced
shape) plus `_media_path` (resolve + confirm containment, so even a
legacy/hand-edited row can't escape) as two independent layers, the log
call's `object_id` explicitly `int()`-converted, and the two asserts split
so the API call isn't inside the assert (survives `python -O`). Also
tightened two now-unbounded regexes added earlier this session
(`INLINE_MD`, `appendInline`'s pattern) with length caps — not what CodeQL
flagged, but a real polynomial-ReDoS shape this project's own CLAUDE.md
already names as a caught-before pattern, worth fixing regardless.

**Not built this session, named directly by the user, worth a session
each:** a Library "Media/Images" gallery tab; garbage-collecting orphaned
`/media/` files when their note is purged (images pasted into *notes*,
unlike the new whiteboard image objects, have no DB row at all — nothing
tracks or cleans them up); an in-note delete affordance for an embedded
image; giving the agent a token-efficient text summary of a whiteboard's
contents/positions/links as a tool it can read (and later write); a
cleanup pass on the "Agent Activity" background-task popup; consolidating
the ~106-file test suite (explicitly asked for, not yet scoped).

**Standing caveat, same as always:** UI claims above were checked live in
this sandbox's Chromium — a real server, a real Playwright session,
`wbState`/`apiJson` read directly rather than assumed. One hard-won trap
this session: **a `let`/`const` at a script's top level is not
`window.<name>`** — `page.evaluate(() => window.wbState...)` silently reads
`undefined` while the bare identifier `wbState` (same script, same realm)
works, and several early verification attempts wasted time on exactly this
before it was caught. A second, unrelated trap cost more time than either:
a "server restart" that doesn't check whether the old process actually
died — `setsid … &` after a failed bind (`address already in use`) looks
identical to a successful start from `curl /health` (the *old* process
answers), and every verification against it was silently testing stale
code until the port was checked directly (`ss -ltnp`) and the real PID
killed by number, not by `pkill -f uvicorn` (which kills this shell — see
the existing trap below).

## §52 — whiteboard redo/select/highlighter/arrow, arc-label spacing, pointer-event touch support — and a live-verification gap on shape tools

Continued straight from §50–§51 below on the same branch, same instruction
("finish Tier 1 and 2, then prioritise the rest"), with several UI reports
and scope adds arriving mid-session. **Read this before touching the
whiteboard or the arc graph view — there is a real unresolved gap here, not
just a list of fixes.**

**Done and verified live, this session:**
- **Whiteboard redo.** `wbRedoStack`, cleared on any fresh action;
  `wbApplyHistoryEntry(from, to)` shares the pop/apply-inverse/push-reverse
  logic between undo and redo so repeated undo/redo/undo/redo can't drift.
  Ctrl+Y and Ctrl+Shift+Z both wired, plus a toolbar button whose disabled
  state tracks the stack. Verified: draw → undo (count drops) → redo (count
  restored), button disables correctly.
- **Whiteboard select, single-item.** A real `data-tool="select"` (was
  folded into "pan" before) — click a card/sketch to select it (outline
  highlight via `.wb-selected`), Delete/Backspace or Escape to act on it,
  clicking empty canvas clears it. Verified: select → Delete → gone → undo
  restores it; select → click elsewhere → deselected.
- **Highlighter persistence, a real bug caught before shipping.** The
  highlighter tool existed for exactly one render: the saved sketch JSON
  only ever stored `{d, color}`, so a highlighter reloaded as a plain
  full-opacity 3px line, losing the whole point of the tool. Fixed by
  extending the payload to `{d, color, width, opacity}` for highlighter
  strokes and reading those back (with 3px/opaque defaults otherwise) in
  `renderWhiteboard`'s own per-sketch render loop. Verified: draw a
  highlighter stroke → live attrs are 12px/0.35 → force a full
  `renderWhiteboard()` re-run (simulating a reload without needing to
  re-login in a script) → **still** 12px/0.35; a plain pen stroke drawn the
  same way still defaults to 3px/opaque.
- **Arc graph labels, re-reported a second time with a screenshot.** The
  earlier tilt-direction fix (§51/HISTORY §52 below) was real but
  incomplete — it fixed *which side* labels sat on, not how far they
  reached. At `ARC_STEP` 46px and up to 20-char labels tilted 40°, a
  label's own horizontal reach (`~100px`) was two-plus node-steps, so a
  label's tail routinely sat under a *later* node — exactly the "category
  name is on the note, the note starts on the category's node" symptom.
  Widened `ARC_STEP` to 58, shortened `ARC_LABEL_LIMIT` to 12, steepened
  the tilt to `rotate(58, ...)`. **Not re-verified with a screenshot this
  session** (see the gap section below) — reasoned from the same geometry
  that diagnosed the bug, not re-measured.
- **Category labels get a colour, not just bold.** `.graph-label-group`
  now also sets `fill: var(--accent)` (light and dark) — asked for
  directly ("need to be a different colour... or being bold or smth"; bold
  already existed and evidently wasn't enough on its own).
- **Touch/pointer-event support for the whiteboard and the graph.** Both
  used plain `mouse*` listeners, which touch and pen input don't reliably
  dispatch — the sketch pad already used `pointer*` events and worked, so
  this was a known-good pattern to extend rather than new design.
  Converted the whiteboard's draw/erase/select listeners and the graph's
  `#graph-svg` to pointer events, added `touch-action: none` to
  `.whiteboard-container` and `#graph-svg` (without it the browser eats the
  gesture for page-scroll/pinch before a pointer event ever fires — the
  other half of this fix, easy to miss). d3-zoom/d3-drag v7 already listen
  for pointer events internally, so the graph's pan/zoom/node-drag should
  now work on touch without further changes. **Not verified live** — this
  sandbox has no touch-capable input surface; see the gap section.
- **Arrow tool added.** One `<path>`, three subpaths (shaft + both head
  strokes sharing one undo entry), same head-angle trig as the sketch
  pad's own arrow. Toolbar button + `A` shortcut; `M` for the highlighter.

**The gap, stated plainly rather than glossed over: shape-tool drags
(line/rect/circle/arrow) were not confirmed working live this session.**
Chasing this cost real time and is worth recording precisely so the next
session doesn't repeat it:
- A synthetic `page.mouse.down()` → `page.mouse.move(..., {steps})` →
  `page.mouse.up()` drag on the arrow tool consistently produced the "no
  real movement, discard" result (a stale leftover sketch, not a freshly
  saved one — confirmed via the server log showing no `POST
  /whiteboard/sketches` was even attempted).
- This is **not obviously the arrow code's fault**: the pre-existing,
  untouched-this-session **line** tool, tested the identical way,
  reproduced the exact same failure. If this were a real regression in new
  code, line wouldn't fail identically.
- Pointer-event *delivery* to the handler was separately confirmed correct
  with a minimal listener mirroring the real one: `pointerdown`,
  `pointermove` (four times, real coordinates tracking the drag exactly),
  and `pointerup` all reached `#wb-svg-layer`'s own bubble-phase listener,
  with `window.currentTool` staying `"arrow"` throughout.
- What wasn't resolved: why the *app's own* mousemove handler, given the
  same events, ends up with `currentDrawData.length < 2` at mouseup (which
  is what triggers the discard/dot-fallback for shape tools). Zoom-transform
  drift (repeated automated test runs against the same persisted board today
  could have left the pan/zoom scaled far from 1×, shrinking a real
  screen-pixel drag to a sub-2-logical-unit one) was tried as an explanation
  and ruled out — resetting via `#wb-zoom-fit` first didn't change the
  result.
- **First thing to do next session**: reproduce this with a real mouse (or
  Playwright's touchscreen/CDP dispatch rather than `page.mouse`) against a
  *fresh* board (a brand-new `MEMORYMAP_DATA_DIR`, not this session's
  test-scarred one) before assuming either "it's broken" or "it's fine" —
  today's evidence points at a test-harness quirk but doesn't prove it.

**Also asked for directly, scoped but not built (see ROADMAP.md item 11
for the full writeup):**
- Multi-select (Ctrl/Cmd-click, Shift-click), rectangle marquee select,
  lasso select — select is single-item only right now.
- A properties panel for the current selection (colour, line thickness,
  arrowhead style) — depends on multi-select existing first.
- A text tool and a size control for the whiteboard, matching the sketch
  pad (still the two things the sketch pad has that the whiteboard
  doesn't).
- Shift-to-lock-proportions is done for the **sketch pad's** rect tool
  only; the whiteboard's own rect/circle tools don't have it yet.

## Tier 1/2 status check, run at the end of the session above

Tier 1: all 11 items done except **§7 — claim-specificity in the
hallucination net** (see the dedicated section below; blocked on real model
output, not a miss). §1 (meeting transcription) is fixed but a *successful*
transcription has still never been observed — this sandbox blocks Hugging
Face — only the correct failure path has been.

Tier 2: done except this named, bounded set —

| Item | What's left | Why it's not done |
|---|---|---|
| Sketch pad selection | Click an existing stroke to move/resize/delete it | Architecturally hard — pure-raster canvas (`ImageData` undo), no discrete stroke objects. Needs a rewrite, not a patch. |
| Whiteboard multi-select | Ctrl/Cmd/Shift-click, rectangle marquee, lasso | Only single-item select exists so far. |
| Whiteboard properties panel | Colour/thickness/arrowhead for the current selection | Depends on multi-select existing first. |
| Whiteboard move/rotate, text tool, size control | Named gaps vs. the sketch pad | Not started. |
| Whiteboard shape-tool live verification | Confirm line/rect/circle/arrow actually save on a real drag | Test harness inconclusive this session (see the arrow-tool writeup above) — check this **first**, before building more on top. |
| Line view / grid view visual pass | General polish, reported as needing one | Not itemized further — get specifics next time it's reported. |
| Emoji picker (16e) | **Decision made**: both a native-OS picker and a built-in palette, Appearance-tab toggle to pick which. Not scoped or built. |
| Emoji sweep (16f) | **Decision made**: both an SVG icon set and monochrome emoji, same Appearance-tab toggle pattern. Not built — see item 16f's four-part plan. |

16e and 16f share the same toggle mechanism — worth scoping and building together next session, not separately.
| Onboarding, the rest (§19) | Model-pull offer, data-dir writability check, seeded example notes, guided tour | Not started. |
| §18's "sketch/image toggles" | Couldn't be matched to anything in the current Options panel | Possibly stale/mis-transcribed — confirm what it meant if still wanted. |

**Known bugs left unfixed, on purpose:**
- Drag-highlight during an actual *node* drag (not panning — that's fixed).
  Re-reported live outside this sandbox; the pan-fix's `graphIsPanning`
  cause doesn't apply (every other node is pinned during a node drag), so
  there's no obvious analogous quick fix. Needs the exact repro gesture.
- Whiteboard shape tools (line/rect/circle/arrow): unverified, see above.
- Touch input: wired but never run against real touch hardware.
- Arc label spacing fix: math checks out, screenshot not retaken to confirm.

**Suggested order for next session**: (1) whiteboard shape-tool
verification, (2) whiteboard multi-select → properties panel → move/rotate,
(3) onboarding rest (§19 — named by an earlier outside review as the
highest-leverage thing left), (4) test-file consolidation (needs a concrete
finding first, not a mechanical merge), (5) then Tier 3. Folding
BACKLOG.md's ~29 sections into ROADMAP.md is a real re-prioritisation job,
not a paste — worth its own session.

**Test-file consolidation** (asked for directly: "refactor and consolidate
all the testing files since they are all over the place") was **not
started** — deliberately, given the token budget this session ran into and
this file's own standing warning against a mechanical merge of the ~106
narrative-style test files without a concrete finding (duplicated fixtures,
an oversized file) to act on first. Next session: spend 10 minutes actually
looking for one before merging anything.

**Also asked directly and deliberately not attempted this session, given the
token budget**: folding BACKLOG.md's ~29 sections into ROADMAP.md as one
tiered list. This is a real restructuring job — deciding where each backlog
item now ranks against the existing Tier 1–4 items, not a cut-and-paste —
and doing it rushed risks losing the reasoning BACKLOG.md's entries already
carry. README.md and ARCHITECTURE.md were spot-checked (grepped for
"whiteboard"/"touch"/"redo") against this session's changes and found still
accurate at the level of detail they describe; a line-by-line audit of
either, or of BACKLOG.md/ANALYSIS.md's ~3,000 combined lines, was not done.

All ~1,600 tests pass, `ruff check .` is clean, `node --check
frontend/app.js` is clean. Committed and pushed
(`claude/roadmap-tier-1-2-security-o4rhjl`).

## Previous session: §50–§51 — a CodeQL ReDoS fixed, all of Tier 1 cleared (four items were stale, not unbuilt), most of Tier 2 worked top-down, and a menu redesign asked for directly

Long unattended run, worked exactly as instructed: "work autonomously,
commit and push as you go," plus a live-fired security alert and several
UI reports the user added mid-session. Full detail is in
[HISTORY.md §50](HISTORY.md) and [§51](HISTORY.md); this is the ordered
short version and — the part a handover is actually for — what is and
isn't done, and why.

**Started from a CodeQL alert** (`py/polynomial-redos`, high severity) on
`manager._TITLE_LINE`, the note-title regex. Replaced with a linear
hand-rolled scan, verified against the regex's own edge cases, not just
"tests still pass". A second alert on the same file (`py/cyclic-import`,
Note severity) was checked and correctly left alone — a deliberate
deferred import breaking a real cycle, not a bug.

**Then Tier 1, top to bottom.** Two real, previously-undiagnosed graph
bugs, both reproduced with Playwright before being fixed and re-verified
the same way afterward — not reasoned from the code:

- Tree/Radial/Arc lost every edge the instant the Time Filter left "All
  time" (Force was unaffected). Cause: those layouts' edges include
  synthetic category-heading/root nodes with no `created_at`, read as
  "created right now" by the filter. Fixed by exempting `isGroup` nodes.
- Dragging on empty canvas could leave an unrelated note's hover-spotlight
  stuck lit. Cause: panning slides nodes under a stationary cursor, firing
  a real `mouseenter` with no reliable following `mouseleave`. Fixed with
  a `graphIsPanning` flag muting hover for the whole gesture. **Re-reported
  as still happening, live, outside this sandbox, after the fix** — see
  "what's still open" below; not force-fixed without a fresh repro.

The other five open Tier 1 items (2, 3, 4, 6, and 17 over in Tier 2) were
each checked against the actual code and existing tests before being
touched, per this file's own standing rule — and turned out to be
**already fixed**, mostly by §41, just never crossed off. Meeting
transcription (item 1) was re-confirmed rather than re-fixed: `faster-
whisper` installed cleanly and a real clip now gets the correct distinct
503, but this sandbox's network policy blocks `huggingface.co` outright,
so a genuinely successful transcription is still unobserved by any
session. Item 7 (claim-specificity) remains the one Tier 1 item that
cannot be closed here — it needs real model output this sandbox has never
been able to provide.

**Then Tier 2, top to bottom, each one reproduced live before being
touched:**

- **§13 done**: reminders and categories got the `_change_*_id`
  resolvers notes/documents already had (`_change_reminder_id`, an int;
  `_change_category_name`, since category tools work in names). `changeRow`
  grew `flashReminder`/`flashCategory` View buttons.
- **§16b done**: the document editor's Bold/Italic only ever wrapped, never
  toggled off. Fixed to check both shapes a selection can be in.
- **§11 (whiteboard) — two bugs done, one board-colour reset built**: the
  pen tool ignored a single click (fixed the same way the sketch pad
  already had it right); the eraser needed movement to register at all,
  so a plain click did nothing (fixed); a `↺` reset button for the board
  colour picker, asked for directly, reads the live theme default rather
  than a hardcoded hex.
- **§16a done**: the document sidebar's Outline collapsed to *exactly 0px*
  the instant the storage disclosure opened — measured live before fixing.
  Cause: the disclosure was `flex-shrink: 0` (exempt from shrinking) while
  the outline had no floor, backwards from what the CSS's own comment said
  the intent was.
- **§14 done**: the Timeline line view's popup showed raw `**`/`#`
  characters and never rendered an attachment at all — `#timeline-popup-
  media` existed in the HTML and nothing had ever populated it. Rewired to
  reuse `renderMarkdown`/`renderGraphPopupMedia`'s own pattern.
- **§16c done**: paste and drag-drop into notes already worked (a global
  textarea handler Capture's `#entry-content` happened to already qualify
  for) — checked live before assuming a rebuild was needed. Only a
  file-picker button was genuinely missing; built one.
- **§18 done**: the full-screen graph's suggested-links list wasn't just
  unscrolled, it was **unreachable** — `#graph-card`'s `overflow: hidden`
  (from an earlier, unrelated fix) still applied in fullscreen, since an
  ID beats a class on specificity no matter the source order. Fixed with
  an id+class compound selector.
- **A note-card menu redesign, asked for directly mid-session** (not a
  prior ROADMAP item): the ⋯ menu had grown to 15 flat items. Three stay
  top-level (private toggle, History, the destructive delete); the rest
  group into three side flyouts (AI actions / Connect / Add) that open on
  hover or click, flip side when the viewport edge is close, and collapse
  to an in-place accordion below 720px — verified at both desktop and
  390px (iPhone) viewport widths.

**What's still open in Tier 2, and why each one is genuinely left for
next time rather than rushed:**

- **The single-node drag-highlight, re-reported live after the fix
  above.** Checked whether an actual node-drag (not a pan) shares the
  cause — it doesn't, every other node is pinned during one — so there's
  no obvious quick fix without a fresh repro (which tool, which gesture,
  which browser). Named in ROADMAP item 11, not guessed at.
- **The whiteboard's larger list** (redo, select/move/rotate as real
  tools, shift-to-lock, images, precise placement, draw.io-style
  connections, toolbar default position, grid/snap) — explicitly named by
  an earlier session as needing its own dedicated session given the
  integration surface (drag, zoom, the trace overlay, physics sliders all
  touch it), and that reasoning still holds. The user also asked directly
  this session for "an upgraded version of the sketch pad" with more
  tools generally — not itemised; needs a concrete list before a session
  can act on more than what's already named.
- **The sketch pad's selection tool** (click an existing stroke to move,
  resize, or delete it) and **shift-to-lock proportions** — both scoped,
  neither built. The selection tool in particular needs real hit-testing
  design (a stroke is a path, not a rect) that deserves its own pass
  rather than a rushed one at the end of an already-long session.
- **Item 16 ("documents in the graph")** — one line, no detail beyond
  "they are notes' equal everywhere else." Real gap (the `/graph`
  endpoint only ever returns notes), but needs scoping before building:
  does a document get its own node kind, its own colour, does it link to
  the notes attached to it automatically?
- **Item 15 (Arc labels-behind-nodes)** — investigated live in an earlier
  session and did not reproduce with synthetic data. Needs the original
  report's exact steps or a screenshot, not another guess.
- **Item 19 (onboarding, the rest)** — reachability diagnostics are built
  (BACKLOG.md §27); still open: offering to pull a model (needs its own
  progress UI), a data-dir writability probe (the backend doesn't have
  one yet), seeded example notes, and a guided tour. Real, valuable, and
  substantial enough that it deserves a session of its own rather than a
  partial pass wedged into this one.
- **Items 16d/16e/16f** (an optional title field, an emoji picker, a full
  emoji-usage sweep) are explicitly blocked on the user's own design
  decisions, not on anything technical — asking is the correct next step
  for each, not building a guess.

**What was and wasn't verified**: every fix above with a concrete,
checkable behaviour was driven against a real running server via
Playwright — screen measurements, DOM state, real file uploads, real
mouse gestures — not reasoned from reading the code, per this project's
own standing rule. Full `pytest tests/` (~1,600+ tests), `ruff check .`,
and `node --check frontend/app.js` green after every single change, not
just at the end. What's genuinely unverified: meeting transcription's
actual output (network-blocked in this sandbox, named above), and
anything in the "still open" list, which is open precisely *because* it
wasn't rushed to a guessed fix.

**Where to start next**, roughly in the order this session would pick
them, but not a mandate — re-prioritise freely against whatever's been
reported since:

1. The sketch pad's selection tool (item 10) — smallest of the remaining
   scoped builds, self-contained, no dependency on anything else.
2. Item 19's onboarding work (seeded notes, the writability probe, the
   model-pull UI, the guided tour) — each piece is independently
   buildable; seeded notes are probably the cheapest, highest-visible-
   impact one to start with.
3. The whiteboard's list (item 11) — biggest remaining surface, budget a
   full session for it rather than a partial pass, and read the
   connection-point / draw.io framing in ROADMAP.md before starting.
4. Item 16 (documents in the graph) — scope it first (what a document
   node looks like, what it colours as) before writing any code.
5. Ask directly about 16d/16e/16f (title field, emoji picker, emoji
   sweep) — each is one question away from being buildable.
6. Item 15 (Arc labels) stays parked until a real report with exact
   repro steps arrives — not worth another blind attempt.

---

## Previous session: §44–§49, then a large burst of new reports triaged and queued rather than built, on user instruction, at high usage

Same session as the §44–§48 entry below, continued through §49 and then a
large burst of new reports arrived faster than they could be safely
investigated one at a time. **The user explicitly said not to build all of
them now** ("you can list them and properly prioritise the roadmap") — so
this half of the session is triage, not implementation, and that was the
right call given where usage was.

**Built and verified this half (§49, HISTORY.md)**: a notifications-panel
mute toggle (🔕/🔔 bell, `#notif-mute-toggle` in the panel itself, not only
Settings) — and the real bug it caught live: `get_preferences()` never
echoed back **eight** separate preferences (every Autonomous Background
Workers toggle, its interval and model, battery mode, smart model routing)
despite all of them saving and being correctly honoured by the code that
reads them. Every Settings checkbox bound to one of these reset to
unchecked on reload, the whole time, silently. Fixed with two new
round-trip regression tests, since nothing had ever asserted what `GET
/preferences` echoes.

**Also fixed this half**: the graph toolbar had four different font sizes
across Gravity/Spread/Time-Filter/the toggles, and the "Up to DD/MM/YYYY"
readout could overlap the slider thumb (`flex-shrink` missing, `min-width`
sized for the shorter "All time" text) — both from a screenshot, both
fixed with ordinary CSS. The Timeline grid's text-cut-off bug (believed
fixed in an earlier session) was re-reported with a new screenshot showing
four full lines with no ellipsis; **still not reproduced in this sandbox's
Chromium** after a second live attempt, so a defensive `max-height`
independent of `-webkit-line-clamp` support was added as hardening, not a
diagnosis — flagged as such in ROADMAP item 14.

**Everything else from this burst was investigated only enough to scope,
then written into ROADMAP.md rather than built**, per the user's own
instruction and this project's standing rule that a reported item gets a
tier immediately even when nobody is working on it yet:

- Every graph layout except Force loses all its edges when the Time Filter
  moves off "All time" (Tier 1, item 10 — not investigated at all, high
  value, likely the top item for next session).
- Dragging on an empty part of the graph canvas sometimes highlights an
  unrelated note (Tier 1, item 11 — not reproduced).
- The document editor's sidebar should be full-scale and sticky-left, and
  its Outline visibly collapses when the "Where are my documents kept?"
  disclosure expands (item 16a — not investigated against the real DOM).
- Bold/Italic in the document editor don't toggle off on a second click of
  an already-formatted selection, plus a general "needs more features" ask
  with nothing itemised yet (item 16b).
- Copy/paste/drag-drop of images and files into notes — still unclear which
  of the three (if any) already work; needs checking before assuming a
  rebuild (item 16c).
- An optional title field in Capture and everywhere else a note is made —
  the same design question as §44's "open questions" section, raised again
  more directly; the buildable shape (write the heading line into `content`
  rather than a second stored field) is scoped but not decided (item 16d).
- An emoji picker in every note-input and the document editor (item 16e),
  and — the bigger one — a full audit of emoji usage across the app with a
  view to professional icons or monochrome emoji instead, because it reads
  as "AI slop" as built (item 16f). Deliberately sequenced *audit, then
  decide, then build* — not a quick pass, and building before the decision
  risks doing it twice.
- A link-reason backfill exposed as an agent-callable tool/skill (not only
  a UI button), and folding temporal-word similarity into the reason
  deduction alongside embeddings (extends item 9).
- Whiteboard: grid lines with snap-to-grid, and drawing not responding to a
  plain click (only a drag) — both new, added to item 11's already-long
  open list. Shift-to-lock-proportions, which the user thought might
  already be listed, **was already there** — confirmed rather than
  duplicated.
- The Timeline line-view's note popup renders no markdown and shows no
  sketch/image attachments, unlike the note card elsewhere in the app
  (folded into item 14).

**What's next**: ROADMAP.md's Tier 1 items 10 and 11 (the time-filter/
layout bug and the drag-highlight bug) are the highest-value starting
points — both are correctness bugs, both are undiagnosed, and item 10 in
particular makes the time filter close to useless on three of four
layouts. After that, work top-down through Tier 2 as usual, or take
whichever of the newly-added items the user re-prioritises after reading
the list above.

---

## Previous session: a long unattended run, §44–§48 — two real perf fixes, a real "ran without being enabled" bug, a manual mode for skills, two sketch pad fixes, two stale-claim corrections, and one investigated-but-not-reproduced report

Worked ROADMAP.md's Tier 1/Tier 2 list top-down for an extended unattended
session, per the project's own standing rule and the user's explicit
"work autonomously, commit and push as you go." Five commits, each with a
full `pytest tests/` (~1,600+ tests), `ruff check .`, and `node --check
frontend/app.js` before pushing. Full detail for each is in HISTORY.md
§44–§48; this is the ordered short version.

**§44 — Tier 1's own "start here next" item, done first:**
`tools._graph_neighbours` no longer fetches the whole notes table per BFS
node to check tags by hand (pre-filters with `ilike` first, same pattern
`list_tags` already used); `manager.entry_dates_bulk` replaces
`list_notes`/`summarize_notes`'s per-row N+1 with one batched query. Both
pinned by new query-count tests. Then a user report, **reproduced live
before being fixed, not theorised**: `POST /tasks/trigger-autonomous` ran a
real optimisation pass regardless of the `autonomous_tasks_enabled` toggle
— confirmed with `curl` against a running server, fixed in the route (not
in `_run_optimization`, which ten-plus existing tests treat as
toggle-agnostic by design). Also this session: link suggestions now carry
the reason a link would get if approved, a one-click backfill for existing
reason-less links, a `notifications_muted_except_reminders` preference, and
a graph-toolbar readability fix (the Time Filter's read-out no longer sits
in an undifferentiated strip with the toggle controls beside it).

**§45 — skill runs get a manual mode**, ROADMAP's own "single
most-requested unbuilt thing." Reuses the existing `stopped_at`/`start_at`
resume machinery rather than inventing a second one; a new `result.paused`
flag is the only thing telling "waiting for you" from "something broke."
Whatever's typed in at the pause is folded into the *next* step's own
instruction, once. Six new backend tests through the real streaming
endpoint. **Not verified live in a browser.**

**§46 — the sketch pad.** Highlighter `globalAlpha` was `0.05` (needed
~20 passes to show anything), now `0.35` — verified with a pixel
read-back and a screenshot. A background-colour control's first
implementation (CSS `background` on the canvas element) did *nothing* — a
canvas's own opaque `fillRect` pixels sit in front of any CSS background —
fixed by changing the actual fill colour instead, verified against the
real save-composite's pixels. Also corrected: ROADMAP's claim that a size
control was missing was stale; it already existed and already worked.

**§47 — two more claims checked, one stale, one real.** "Links are
decoration" was stale — all three link-chip render sites already navigate
via `flashEntry`. The document half of "take me to what changed" was real:
`changeRow` never read the `document_id` `agent._change_document_id` has
resolved since an earlier session; one more branch, verified with an
actual click producing an actual tab change.

**§48 — Arc view's "labels behind nodes" was investigated live and did
not reproduce.** `labelLayer` is appended after every node in the DOM
(so it should already paint on top for every layout), and a live
screenshot with 24 seeded notes showed every label clearly legible on top
of its node. Left open in ROADMAP rather than marked fixed — nothing was
found to fix. Needs the original report's exact steps or a screenshot
before a future session spends more time on it.

**What was and wasn't verified, overall**: the two §44 perf fixes and the
autonomous-toggle fix were confirmed against a real running server with
`curl`. The sketch pad fixes were confirmed with real pixel reads and
screenshots. The link-decoration and document-View fixes were confirmed
with real clicks producing real navigation. The Arc-labels investigation
was a real screenshot, not a guess. **Not driven in a browser this
session**: the skill manual-mode checkbox and pause card (backend fully
tested through the real streaming endpoint, frontend only `node --check`ed).

**What's next**: the sketch pad's selection tool (click an existing
stroke/shape to move, resize or delete it), the `_change_reminder_id`/
`_change_category_id` resolvers named in §47 (so `changeRow`'s View button
can extend past notes and documents), or whichever Tier 2 item reads as
next-most-valuable on a fresh read of ROADMAP.md — none of the remaining
items are blocked on anything above.

---

## Previous session: §47 — a stale "decoration" claim corrected, and the document half of "take me to what changed" built

Continued straight after §46. Full detail in [HISTORY.md §47](HISTORY.md);
short version: Tier 2 item 12 ("linked notes should be clickable, today
they're decoration") was checked before touching anything and found
**already done** — all three link-chip render sites already call
`flashEntry` on click. Corrected in ROADMAP rather than rebuilt.

Item 13 had a real gap: `changeRow` (shared by the chat's "what changed"
list and the autonomous-pass review panel) only ever read `change.note_id`,
never the `change.document_id` that `agent._change_document_id` has
resolved on every write since §21. One more `if`, reusing
`openDocumentFromNote`; verified live with an actual click producing an
actual tab change, not just read from the diff. Reminders/categories still
have no `_change_*_id` resolver at all — named as the real next step for
this item rather than guessed at.

**What's next**: ROADMAP.md's next open item — the reminder/category
`_change_*_id` resolvers named above, the sketch pad's selection tool, or
whichever Tier 2 item reads as next-most-valuable on a fresh read of the
file.

---

## Previous session: §46 — the sketch pad's highlighter and background colour, both fixed and verified live with pixel reads

Continued straight after §45. Full detail in [HISTORY.md §46](HISTORY.md);
short version: the highlighter's `globalAlpha` was `0.05` (needed ~20 passes
to show anything), now `0.35`. Checked first and found already done: a size
control (`#sketch-size`) existed and reached every tool — ROADMAP's own
claim otherwise was stale, corrected rather than rebuilt.

**The background colour is the one worth reading closely if you touch this
file again.** A first pass wired it as a CSS `background` on
`#sketch-bg-canvas` — the same shape the whiteboard's own board-colour
picker uses — and it did *nothing*, because `sketchDrawBackground()`
already paints an opaque `fillRect` into the canvas's own pixels every time
the pad opens, and those pixels sit in front of any CSS background on the
element underneath. **A CSS background on a `<canvas>` is only ever visible
through pixels the canvas itself left transparent** — worth remembering
before wiring any future control this way. Fixed by making the fill colour
itself the chosen one (`sketchBgColor`, persisted in `localStorage`)
instead of a hardcoded white. Verified three ways live: the bg-canvas's own
pixels before/after picking a colour, and the exact composite `saveSketch()`
builds, read back pixel by pixel, to prove the colour survives into what
actually gets saved and not just what's on screen.

**Not built**: the selection tool (still open, and it's the one real
remaining gap — clicking an existing stroke to move/resize/delete it).
**Not verified live**: nobody clicked "Save as note" through the UI
end-to-end this session (a stray toast intermittently overlapped the
button in the test viewport); the save composite was verified by running
`saveSketch()`'s own drawing calls directly, not by clicking through.

**What's next**: the sketch pad's selection tool, or ROADMAP.md's next
Tier 2 item (note-links being clickable through to the notes they name, or
the change-target View button extending past notes).

---

## Previous session: §45 — skill runs get a manual mode, the single most-requested unbuilt thing on the list

Continued straight after §44 in the same session. Full detail in
[HISTORY.md §45](HISTORY.md); short version: `run_skill(..., manual=True)`
now pauses after *every* completed step, reusing the exact `stopped_at`/
`start_at` machinery a failed step already had rather than a second
mechanism — the only new thing is `result.paused`, so the client can tell
"waiting for you" from "something broke". Whatever gets typed in at the
pause (`manual_note`) is folded into the *next* step's own instruction, once,
not repeated into every later one. A "Run skills step-by-step" checkbox
lives in the chat dock's `⚙` panel; the pause renders as a text box +
Continue card, separate from the existing Resume/ran-out-of-rounds one so a
real failure still reads as a failure.

**Not built**: the same pause for a plan run (`opts.plan`) — the backend
already treats a plan and a skill identically, but the pre-existing
Resume-from-failure button was already skill-only before this session, so
extending both to plans is a separate follow-up, not a gap this feature
introduced. **Not verified live**: six new backend tests in `test_skills.py`
cover pause/resume/note-folding through the real streaming endpoint with a
fake model, but the checkbox and the pause card's text box were not driven
in a browser this session.

**What's next**: ROADMAP.md's next Tier 2 item (the sketch pad — the
highlighter opacity, a size control, a background colour, a selection tool)
or the plan-run pause extension named above.

---

## Previous session: §44 — Tier 1's top item done, a real "ran without being enabled" bug fixed live, link reasons extended twice, a mute option — plus three reports that didn't reproduce

Full detail in [HISTORY.md §44](HISTORY.md). Short version and what's still
open:

**Worked ROADMAP.md's own "start here next" first**: the two Tier 1 §8 perf
findings (`tools._graph_neighbours`'s full-table tag scan, `_note_summary`'s
per-row `entry_dates` N+1 inside `list_notes`/`summarize_notes`) — both
fixed, both pinned by new query-count tests in `test_scale_query_counts.py`.

**Then a user report, reproduced live rather than theorised**: *"I get
notifications that the autonomous optimisation completed when I didn't have
it enabled??"* — real bug. `POST /tasks/trigger-autonomous` never checked
the `autonomous_tasks_enabled` master toggle; only the scheduled loop did,
before ever calling in. Confirmed with `curl` against a running server
before touching code (`started: true` on a fresh, disabled profile), then
fixed in the route rather than in `_run_optimization`/`trigger_now` — ten-
plus existing tests call `_run_optimization()` directly and rely on it
staying toggle-agnostic by design, so the guard belongs at the one call site
that was actually missing it. Re-verified live after the fix, both branches.

**Then link reasons, extended on two fronts asked about directly**: `GET
/entries/link-suggestions` now carries the `reason` text a link would get
if approved (the two thresholds are numerically identical, so it's a real
preview, not a guess), and `POST /entries/links/backfill-reasons`
(`manager.backfill_link_reasons`) runs deduction once over every existing
reason-less link — the answer to "is there an easy way to give them all a
reason?", since deduction previously only ran at the moment a link was
first made.

**Then a mute option, asked for directly**: `notifications_muted_except_reminders`
quiets `toast()` and the notifications panel for everything except a due
reminder and real errors.

**Then a graph-toolbar readability fix, reported directly**: the Time
Filter's "All time" read-out and the Similarity/Hide unlinked/Labels toggles
sat in one undifferentiated strip with the same gap; grouped the toggles and
drew a divider using `.chat-tool-group`'s existing convention.

**Three more reports were investigated and correctly left alone rather than
guessed at** — a Capture title-field question (a design decision, not a
bug — see ROADMAP.md's new "Open questions" section), "the dashboard isn't
detecting my name" (the code is correct; likely the nudge working as
designed on a profile with no name saved, not reproduced as a bug), and the
Timeline grid's "text cut off" report (re-driven live with real
measurements; found that `display: -webkit-box` computes to `flow-root` in
this sandbox's Chromium — worth knowing — but could not reproduce actual
clipping with any input tried).

**What was verified live vs. reasoned**: the two perf fixes and the
autonomous-toggle fix were confirmed against a real running server with
`curl`, not just read from the code. The graph-toolbar divider, the
suggestion-reason text, the backfill button and the mute option are CSS/JS
changes reasoned from the DOM and this codebase's own existing conventions
(`.chat-tool-group`'s divider pattern, `list_tags`' `ilike` pre-filter
pattern) but were **not** driven in a browser this session. Full `pytest
tests/` (~1,600+ tests), `ruff check .`, and `node --check frontend/app.js`
all green throughout.

**What's next**: ROADMAP.md's Tier 2 top item (skill runs' auto/manual
mode — still the single most-requested unbuilt thing on the list), or one of
the three open questions above once a decision is made on each.

---

## Previous session: §43, a follow-up burst — the time filter's *real* bug, link reasons grew a confidence score and an editor, notes got optional titles

Continued straight from §42 below, in the same session: rather than another
big unstructured list, the user came back with a run of small, specific asks
in quick succession, each answered as it arrived. Full detail — the exact
`+ "Z"` double-timezone repro, every surface a link reason now reaches, the
title feature's design discussion — is in [HISTORY.md §43](HISTORY.md); this
is the short version and what's still open.

**The time filter slider "still doesn't move"**, reported right after §42
claimed it fixed. It had — for the bug §42 found — and hadn't, for a second,
worse one hiding behind it: `/graph`'s two node dicts did
`e.created_at.isoformat() + "Z"`, and `core/database.DateTime` has said UTC
on its own (`...+00:00`) since before this session — so every single note's
`created_at` on the graph was `...+00:00Z`, two timezone markers in one
string, which `new Date(...)` in JavaScript silently reads as `Invalid Date`.
§42's own testing happened not to catch it because it used notes created
seconds apart, and near-simultaneous *good* dates look the same as
near-simultaneous *invalid* ones on a slider with no range to show. Found by
backdating a note in SQL and reading `/graph`'s raw JSON, not by guessing.
Fixed in both places; two new tests parse the response with
`datetime.fromisoformat()` instead of trusting the shape.

**Link reasons (§42's own feature) grew two things asked about directly:** a
confidence score for the reasons nobody actually wrote — `create_link` now
tries to deduce one from embedding similarity (the same signal
`/entries/link-suggestions` already uses, same 0.55 threshold) whenever it's
given none, and leaves both null rather than guess when it can't — and an
editor, since a reason was write-once before this: `PUT
/entries/{id}/links/{link_id}/reason`, plus a ✎/⊘ pair on the note card's
own link chips (add-or-edit, and clear, kept as two separate controls
because the shared confirm/prompt dialog can't tell "saved empty" from
"cancelled"). Both the graph edge's tooltip and Trace's readout now say
*", NN% confidence, deduced"* when the reason came from the algorithm rather
than a person or the AI, so a guess never reads with the same certainty as
something someone actually said.

**Notes got an optional title** — worked through as a design question first
(does a title cap how many notes fit one topic? no — it's read off the note,
not enforced) and built to what the user confirmed: the leading
`#`–`######` heading line, if the note's first line is one, computed on
every read (`manager.extract_title`) rather than stored, so it can't drift
out of sync with an edited first line. Shown as its own `<p class="entry-title">`
above the card body (`<h3>` leaked this design system's small-caps
section-label styling into it — reverted after a screenshot caught it, not
after a report). **✨ Generate title** / **Regenerate**, and **✕ Remove
title**, both in the note's overflow menu; both refuse a private note
outright (400) because they read the decrypted text and would otherwise
write it straight back to `entry.content`, un-encrypting the note as a side
effect of titling it.

**And two smaller ones:** the app now always boots to Dashboard rather than
whatever tab `localStorage` remembered last (asked for directly); the
glassmorphism blur slider was investigated after being asked whether it
actually scales the effect and found working as built — two screenshots
looked identical to the eye but differ byte-for-byte, so no fix was made
because there was nothing broken.

**Verified live in Chromium:** the manual link → add a reason with ✎ → the
chip's tooltip updates → clear it with ⊘ → the tooltip reverts, the full
round trip through the real `PUT .../reason` endpoint. **Not verified live:**
the *auto-deduced* reason specifically, and its graph-edge tooltip — this
sandbox has no real embedding backend (the standing `sentence-transformers`
constraint), and a same-session live test of two linked notes happened to
land inside the graph's "Uncategorised" cluster supernode (every note here
shares that one category, and semantic-zoom clustering hides individual link
edges behind a cluster node), so the tooltip's pixels specifically were not
seen. The backend path is covered by `pytest` end to end (deduction,
confidence, editing, clearing, the graph edge's own field); say so plainly
rather than claim a screenshot that doesn't exist.

## Previous session: §42, a long unattended run — ten correctness/UX fixes, done and verified; six large asks, triaged and scoped, not built

The user handed over a large, unstructured list overnight and asked for
autonomous work with no check-ins. Ran it as this project's own process
says to: checked the running app before building anything, worked the list
top-down by how cheap-and-real each item was to verify, committed and
pushed after every batch (in case of a usage-limit cutoff mid-session — it
didn't happen, but that's why the history below is several small commits
rather than one large one). Full detail, including exact repro steps and
measurements, is in [HISTORY.md §42](HISTORY.md); this is the short version
and — the part a handover is actually for — what's still open and why.

**Ten fixed, each reproduced first and each with a test:** `recycle_bin_days`
sending `0` and hitting a raw 422; `unknown timezone` on every Windows
request (missing `tzdata` dependency — Windows has no system tz database at
all); the autonomous loop sleeping up to 6h between reading its own
preferences, so toggling battery-saver or the scheduler did nothing until
that sleep ran out; a chat-tab CSS grid bug that was simultaneously "a dark
rectangle behind the header" and "the sidebar collapse button overlaps"
(one `grid-template-rows` never reset for the mobile breakpoint); search
results explaining *why* they matched for exactly one case (connected) and
none of the actual matches; a fourth "Custom…" mode for Improve Writing; the
graph's "Generate Story from Path" button silently refused by both an
undefined CSS token and the app's own CSP; the graph time filter's stale
slider bounds hiding any note added after the graph was first opened; the
trace overlay drawing an invisible flat line on Arc layout specifically;
and a Timeline grid card's missing ellipsis (`line-clamp` unprefixed under
`-webkit-box`, plus a bare `text[:120]` slice server-side with nothing
appended).

**Six items were large asks against small realities, and got scoped rather
than rushed:**

- **The whiteboard** (redo, select/move/rotate/shift-lock, images,
  draw.io-style connection points, precise drop placement, toolbar default
  position) — draw.io + MS Whiteboard + OneNote's combined feature surface
  asked for in one report. Broken into a sequenced list in ROADMAP.md item
  11; nothing built, because a shallow pass at any one piece here (a rotate
  handle with no undo/redo integration, a connection-point system that
  doesn't match how draw.io actually represents fixed-vs-free anchors)
  would cost more to unwind later than it saves now.
- **A widget management hub** — checked first, and the foundation already
  exists (17 widgets, a real `dashboard_layout` preference, inline
  add/remove/reorder). What's missing is a dedicated modal surface, which
  is real but small — scoped in ROADMAP.md item 26, not built this session
  because the whiteboard and search-explainability work took priority as
  the more concretely-reported bugs.
- **An Obsidian-style graph** — Obsidian's graph is a force layout, which
  this app already has; asked what's actually different needs a
  side-by-side screenshot before it's actionable, not a guess. Noted in
  ROADMAP.md item 24.
- **A guided onboarding tour** — added to ROADMAP.md item 19, next to the
  reachability/seeded-notes work already scoped there.
- **Expanding the autonomous agent's capabilities** — "expand" isn't a
  spec; candidates listed in ROADMAP.md item 31, needs a "which of these"
  decision before a session builds any of it.
- **Cleaning up the test suite** — 106 files, fully green, no specific
  duplication pointed at. In ROADMAP.md's Tier 4 with the reason: this
  project's tests are written as narrative (each docstring is a reported
  bug), and a mechanical consolidation pass is exactly how that gets
  flattened into generic assertions nobody can trace back to why they
  exist. Needs a concrete finding (real duplicated fixtures, a file that's
  actually too large) before it's safe to start.

**What could and couldn't be verified:** every fix above was driven in
Chromium (headless, `service_workers: 'block'`, the login/onboarding recipe
this file already documents) except the semantic-match badge — this sandbox
has no `sentence-transformers` installed (CLAUDE.md's own standing
instruction, since it has failed to install cleanly before), so semantic
search always falls back to keywords here. The `match_info` "semantic" and
"hybrid" badge types are covered by a backend test using the suite's fake
embedding backend (`tests/test_chat_api.py::test_semantic_match_carries_its_score`),
which proves the code path is exercised and correct, but the actual pixels
of a semantic badge rendering in a browser were not seen — say so plainly,
per this file's own rule, rather than claim a screenshot that doesn't exist.

## Previous session: §41 Tier 1 (all of it), a live whiteboard redesign, then a security/perf review

Worked §41's Tier 1 list top-down, each reproduced before being fixed, each
with a real test:

1. **Meeting transcription "errors out"**: with faster-whisper actually
   installed (`pip install`, works fine in this sandbox now), a failed
   model download raised inside `voice.transcribe` and fell through to the
   route's catch-all as "Couldn't transcribe that recording" — indistinguish-
   able from a bad clip. Now a distinct 503 naming the model-load failure.
2. **Skill step ticked "done" on an empty turn**: a turn with no answer, no
   tool call and no failure fell through to `state: "done"` in
   `skill_runner.py`. Now reported `failed`, same as the existing
   `ran_out`-of-rounds case. Also added a client-side idle-read timeout to
   `streamChat` (150s, longer than the backend's own 120s Ollama timeout).
4. **A reply to the agent's own question read as small talk**: `ask_user`
   asks "delete this?", the user answers "yes"/"ok", `intent.classify`
   correctly calls that small talk in isolation, and small talk gets no
   tools. New `answering_agent` request flag, set by the client while an
   `ask` card is pending (covers both button-click and free-typed replies),
   forces `intent.NOTES` for that one message.
6. **Embedding-model downloads invisible outside one settings screen**:
   `embedmodels.DownloadState`'s own docstring said "for /tasks and the
   panel" — the panel half existed, `/tasks` never got it. Added, plus
   `taskhistory.record()` on completion so a failed download doesn't vanish.

**Then a live, mid-session redesign of the whiteboard**, driven directly by
the user watching it: a cursor-lag bug ("mouse keeps snapping to an
invisible grid" — a regression from this session's own first pass at a
custom cursor, fixed by switching to a native `cursor: url(svg)` per tool
instead of a JS-tracked div), a missing eraser, Undo (Ctrl+Z), keyboard
shortcuts, an SVG-icon toolbar redesign, a board background colour (also
fixes the generative-art canvas bleeding through), draggable toolbar panels,
and an empty-state hint. Full writeup and the bug found along the way (a
freshly drawn stroke wasn't in `wbState.sketches`, so it couldn't be
deleted until a reload) is in [ROADMAP.md §11](../ROADMAP.md).

**Then item 3** (skills producing network errors): the same disguise problem
as item 2, one layer up — `agent.run_agent`'s `OllamaError` handler turns
"Ollama died mid-round" into a real `answer` event (the correct thing for
ordinary chat, which just renders it like any other reply) but `skill_runner`
had no way to tell that from a genuine answer, so the step was ticked done
and the run repeated the identical failure on every later step. The answer
event now carries `offline: true`; `skill_runner` checks for it and stops
with a real reason, same shape as the `ran_out` case.

**Then item 5** (notifications): audited before building anything, per this
file's own rule — found it was **already done**. `recordNotification` has
exactly three call sites (a stopped run, a due reminder, every finished
background job via `renderTaskHistory`), and the third already picks up
whatever `routes_tasks.collect()` lists, including this session's own
embedding-model addition, with no extra wiring. ROADMAP.md §5 corrected
rather than rebuilt. Item 7 (claim-specificity) is still blocked on real
model output, as originally scoped — nothing to add there.

**Then two background review agents** (security, and backend/graph
perf+correctness), dispatched to cover ground beyond §41 at the user's
request. Findings and what was done with each:

- **XSS, high severity, fixed.** The Command Palette (`Ctrl+K`) rendered the
  streamed chat answer via `innerHTML` with a hand-rolled, unescaped
  `\n`→`<br>`/`**bold**` replace. Worse and better at once: the handler also
  called `/chat` (non-streaming) and parsed the response as `/chat/stream`'s
  NDJSON, so `msg.type` was never `"content"` and no answer had ever actually
  rendered — a "feature that never ran once" that would have gone live the
  moment someone fixed the parsing without also fixing the escaping. Rewired
  to reuse `streamChat`/`renderMarkdown` (the app's one real streaming client
  and its one safe renderer) instead of a second, parallel, broken
  implementation of both. Verified live in Chromium with a payload that
  would have executed under the old code.
- **Private-note leak via `note_ids`, fixed.** `_attached_notes` checked
  `is_deleted` but not `is_private` — the one path into the chat prompt that
  never went through `tools._require_note`. Now excluded, matching that
  guard. No plaintext ever leaked (private content is ciphertext at rest
  either way); the note's id and category were the exposure.
- **`execute_tool`'s exception net too narrow, fixed.** Only `ToolError`/
  `KeyError`/`TypeError`/`ValueError` were caught; anything else (a
  SQLAlchemy error, a filesystem error) propagated through `agent.py`'s tool
  loop — which has no try/except of its own — and killed the whole SSE
  stream mid-turn with no rollback and nothing the model or user ever saw.
  Added a backstop: roll back, log the real exception, return an ordinary
  tool-error result the model can read and try something else with.
- **Two backend perf findings, reproduced but NOT fixed** — see
  [ROADMAP.md §8](../ROADMAP.md), start of Tier 1: `tools.py`'s
  `_graph_neighbours` does an unfiltered full-table `Entry` scan per BFS
  node instead of a SQL tag filter (up to ~12 scans per `related_notes`
  call), and `manager.entry_dates` is an N+1 inside `_note_summary`, hit by
  `list_notes`/`summarize_notes`. Left unfixed deliberately: verifying
  either properly needs a realistic-size notebook, which this sandbox's
  test suite doesn't give a session — start here next, with a synthetic
  large notebook to measure against before and after.
- Also found, while verifying the eraser's undo: a double-delete race
  (re-entrant `mouseenter` on an item already mid-DELETE could pop the
  wrong undo entry). Fixed with an in-flight-id guard.

**What could not be verified**: real-Ollama behaviour, as always (every fix
above is pinned by `fake_ollama`/mocked-network tests, not a live model).
Every UI change this session *was* driven in Chromium with real
measurements (network calls, computed styles, DOM counts, payload
execution checks), not just screenshots — including the XSS fix, verified
by confirming a real script payload did *not* execute.

**Not reached**: the two perf findings above (§8), and anything from
"the user's list for next session" mentioned when this session closed —
ask them what's on it; nothing here names it.

---

## Previous session: the audit, then the reported list

**Read [§41 in ROADMAP.md](../ROADMAP.md#41-the-reported-list-triaged--and-the-ordered-plan)
before deciding anything.** It is the ordered plan in four tiers, and it exists
because this project's recurring failure is not forgetting work — it is a
session picking something interesting from further down the list while a
correctness bug sits at the top. Work top-down.

Two halves to this session. The first audited `fix/Antigravity-Audit` (§40) and
is written up below. The second worked the owner's own reported list.

### What was fixed from the reported list

Each of these was diagnosed in the running app, not from the report:

- **Trace is rebuilt.** The cause of "annoying and pretty much unusable" was
  that `traceModeActive` was set and consulted nowhere, so the map never
  responded to a click and both ends had to be chosen from `<select>` elements
  listing every note by its opening words. Two-click mode now, with Swap, a
  one-step Undo, Escape, and a crosshair cursor.
- **"Automated tasks keeps disabling itself."** Two controls wrote the same
  preference; the one on the skills panel never updated `prefsCache`, so the
  next `savePrefs` rebuilt the object from the DOM and read the other,
  unticked checkbox.
- **"Light/dark stops affecting the background after using the scheme
  selector."** The scheme builder stored one page colour, for whichever mode
  was on, *inline on `<html>`* — which outranks every `[data-mode]` rule.
- Six whiteboard bugs, the skill descriptions clipped to one line, and the
  documents sidebar crushing its own list.

### What was checked and found already correct

Worth knowing so nobody spends a session on it: **password and secret storage
is sound.** bcrypt with a per-password salt, `secrets.token_hex(32)` for
session tokens held in memory and swept on expiry, and private notes encrypted
with a key wrapped by a password-derived key. Nothing is stored in plaintext.
Also: the three sketch swatches reported as identical are three different
colours — the real complaint underneath it is the highlighter at 5% opacity.

### The biggest unbuilt thing on the list

**Skill runs have no manual mode.** It was explicitly requested and never
built; `skill_from_step` is resume-after-failure, not a step-through. The ask
is a pause after each step with a Continue button and a text box, so the user
can add what the agent missed or answer a question it raised. §41 Tier 2,
item 9.

### The traps that will cost you an hour

1. **`waitUntil: "networkidle"` never settles** — the app polls, so `goto` and
   `reload` time out at 30s. Use `domcontentloaded` and an explicit wait. The
   login is one field in two modes: `#lock-password`, `#lock-submit`.
2. **`pkill -f uvicorn` kills your own shell** (same process group, exit 144).
   Start the server with `setsid … &`.
3. **Nine `.modal-overlay` elements sit in the markup permanently with
   `.hidden`.** Any "is a dialog open?" check written as `querySelector
   (".modal-overlay")` is always true. This ate an Escape handler.

### What could not be verified

- **No real model was called.** Every provider test uses a fake transport, so
  the background librarian's plumbing is tested and the *quality* of its
  tagging and linking is unknown.
- **Semantic search ran against the fake embedder only** — the
  mixed-dimension fix is pinned by a unit test over `similar_pairs`, not by a
  real model switch.
- **Meeting transcription was not reproduced.** It is reported as erroring out
  and is Tier 1 item 1; `faster-whisper` is not installed here.
- **Nobody drew on the whiteboard or dragged a card by hand.** The API is
  tested and the layout measured; the pointer interactions are not.

---

## Latest session: auditing a week of another agent's work before it merges

**Read [§40 in ROADMAP.md](../ROADMAP.md#40-the-antigravity-audit) next.** This
session audited `fix/Antigravity-Audit` — 8 commits and ~9,600 insertions from
a different coding agent, with no tests — and brought it to a mergeable state.
The branch is now `claude/branch-audit-refinement-lredrg`.

### The number that frames everything else

`main`: 1,544 passing, 2 failures. The branch: **90 failures, 20 ruff errors.**
CI would not have run. It is now 1,589 passing and ruff clean, with 46 new
tests and 4 new lints.

The two failures on `main` were not the other agent's doing and are worth
knowing about on their own: `test_query_understanding` pinned its fixtures to a
hard-coded date and then read the *real* clock through
`search_manager._user_today`, so it passed only while the wall clock sat within
a week of that date and began failing on its own six days later — with an empty
result set that looked exactly like a retrieval bug. It owns its date now.

### What was kept, and what was reverted

**Kept, after fixing:** the whiteboard, the background librarian, memory
streams, semantic note search, the command palette, the agent activity monitor,
batch `tag_note`/`link_notes`, PageRank node sizing, focus mode, the vectorised
similarity maths, the D3 timeline, and the bulk category-name lookup that
removed a real N+1. All good ideas. See §39 for the three biggest.

**Reverted, one thing:** `POST /chat/stream` had been rewritten as a WebSocket.
Nothing asked for it, the app is local-first on 127.0.0.1, and the NDJSON
stream it replaced already delivered tokens as they were produced. It cost a
Session shared across threads, a leaked producer thread per request, a router
mounted outside `dependencies=locked` with hand-rolled auth, a transport exempt
from the same-origin policy — and ~70 of the 90 test failures.

### The two traps that will cost you an hour

1. **`waitUntil: "networkidle"` never settles against this app.** It polls
   (reminders, model status, tasks), so Playwright waits out the full 30s and
   times out on `goto` and on `reload`. Use `domcontentloaded` and an explicit
   `waitForTimeout`. The login form is one field with two modes — `#lock-password`
   and `#lock-submit`, with `data-mode="setup"` on the overlay on first run —
   not the separate setup/confirm fields you might expect.

2. **`pkill -f uvicorn` will kill your own shell.** The sandbox runs the shell
   in the same process group; it returns exit 144 and takes the session's
   command with it. Start the server with `setsid … &` and leave it running.

### The finding that only a browser could have made

Two settings this branch added — `border-style` and `shadow-intensity` — were
missing from `APPEARANCE_DEFAULTS`, so `applyAppearance` wrote the literal
strings `undefined` and `NaN` into two CSS custom properties on `<html>`.
Neither fails where it is set. They fail where they are *used*: a
`border-style: var(--border-style) !important` rule matching `.card`, `input`,
`textarea`, `select`, `.modal` and `.sidebar`, and the `rgba()` inside
`--glass-shadow`. **Every card, field and dialog in the app rendered flat and
borderless on every fresh profile**, silently, and reading the source did not
find it. One `getComputedStyle` in Chromium did, immediately.

Two more in the same family: `.glass` set `background: var(--bg-glass)` against
a token no theme declares, which erased the background of every
`class="card glass"` element; and five inline `style` attributes were sitting
inside app.js template literals, refused by the CSP exactly as the
thirty-five in index.html were. Each of the three now has a lint.

### Where to start

§40 ends with a ranked list of what is still open. The top two are the ones
worth doing next, and both are about the same thing — a feature that changes
the app's behaviour without showing the user what it did:

1. **A UI for memory streams.** The model can save itself standing
   instructions; the user cannot see, edit or disable them. The `active` column
   exists and nothing ever sets it to false.
2. **A dry-run for the background librarian.** Enabling it lets an agent edit
   the notebook unattended, with no way to preview what it would do.

### What could not be verified this session

- **No real model was ever called.** Every provider test runs against a fake
  transport, as the standing caveat says. The background librarian's *plumbing*
  is tested — scheduling, the guard against concurrent runs, battery mode, the
  blocked tools, failure recording — but no pass has ever run against a live
  Ollama, so the quality of its tagging and linking is unknown.
- **Semantic search ran against the fake embedder only.** `sentence-transformers`
  is deliberately not installed (CLAUDE.md), so the mixed-dimension fix is
  pinned by a unit test over `similar_pairs` with hand-built vectors, not by a
  real model switch on a real notebook.
- **The whiteboard was not driven by hand.** Its API is tested and its two
  canvas layers were measured as correctly overlaid in Chromium, but nobody
  dragged a card, drew a stroke, or panned the canvas.
- **The sketch highlighter is set to `globalAlpha = 0.05`.** That is almost
  invisible — roughly twenty passes to show anything. It looks like a mistaken
  value rather than a choice, but it was left alone because it is a taste call
  the owner should make, not a defect.

---

## Latest session: §37's four remaining clarifying-question items, all four asked and built

Started by checking the running app and git history against the previous
handover before touching anything — confirmed §38 items 3–7 (Arc layout,
Timeline branch/line, meeting notes, onboarding diagnostics) were already
merged (PR #70), and found one real staleness bug in the process: §37C's
density pass (the ⚙ disclosure collapsing the dock to one row) had already
shipped in commit `46df305`, but ROADMAP.md still listed all three of its
sub-items as open and named it "start here next" — corrected in place, and
checking the remaining two sub-items in Chromium found the dock already at a
single 103px-tall row, so no further work was needed there.

That left §37's four items explicitly blocked on a clarifying question
(37G, 37H, 37I, 37K) — the previous handover's own instruction was "ask, then
schedule," so this session did: asked all four in one batch. Three came back
with a build decision; the fourth (37H, llama.cpp) came back "not this
session." All four now closed out or correctly deferred:

- **§37G, both halves.** The sketch pad's canvas is now two layers —
  `#sketch-bg-canvas` for an uploaded image, `#sketch-canvas` for pen strokes
  above it. The Eraser switched from painting white to
  `globalCompositeOperation: "destination-out"`, so erasing a stroke reveals
  the photo underneath instead of punching a white hole through it — checked
  with a pixel read (`alpha: 0` on the stroke layer, the image's own colour
  on the background layer) rather than assumed from reading the canvas code.
  Save composites both layers into one PNG attachment; the *downloaded*
  attachment was fetched back through the real API and visually confirmed to
  show the photo, the stroke, and the eraser gap. Separately: `POST
  /import/document` (`routes_settings.py`, next to the existing markdown
  importer) turns a PDF/Word/slide file into notes via `markitdown` — one
  note per top-level heading when there's more than one, capped at 25 per
  upload. `core/extras.py`'s `documents` extra lost its `unavailable` flag,
  since there's now a real button behind it. Verified two ways: the whole
  suite fakes `markitdown_available`/`convert_to_markdown` (the package isn't
  in CLAUDE.md's install recipe, same as faster-whisper), and separately
  `pip install markitdown` (lightweight, unlike torch/sentence-transformers)
  and a real conversion end to end, both via the API directly and driven
  through the actual Settings → Import & export UI in Chromium.
- **§37I.** `compress_chat` joined `ask_user`/`run_skill`/`make_plan` in
  `ai/tools.py`'s `HANDOFFS` table. Decided with the user: still hand off to
  a human for review rather than auto-apply — the agent's turn ends on a
  `compress_review` SSE event, and `app.js`'s new `onCompressReview` opens
  the *same* `showCompressReview` panel the manual Compress button already
  fills in, so the two paths share one review UI rather than two that could
  drift. The summarising logic moved from `routes_chat.py` into
  `tools.summarise_turns`, shared by both the endpoint and the tool — the
  route's own tests (which pin its exact 502-vs-503 status codes) stayed
  green through the move.
- **§37K.** Decided: the bounded reading (the variation-selector audit), not
  a font swap or an accessibility mode. Swept `app.js`/`index.html` for the
  classic list of emoji with a text-default presentation and added the
  missing U+FE0F wherever one appeared in UI-visible text — left comments
  alone, since a comment rendering as a thin glyph costs nothing.
- **§37H.** Asked directly whether to spend this session on it (a full
  backend session: a new `ai/provider.py` entry, a GGUF file picker); the
  user said no. Still queued, unchanged.

ROADMAP.md's §37 subsections, its own priority-order list, and §38's item 9
are all updated in place to match — a session that reads only the "next
steps" list at the bottom would otherwise see 37G/37I/37K as still open.
Stayed under the 2,000-line lint the whole way by trimming as it went, not by
skipping the correction.

Full `pytest tests/` (~1,600+ tests), `ruff check .`, and `node --check
frontend/app.js` all green. **What's next:** §37H (llama.cpp, still needs its
own session) and §37L (the "full UI audit" umbrella — break into dated
sub-items, don't start a session on the phrase itself). Beyond §37, §38's own
item 8 (the `app.js` module split) is the next standing item — see its own
note below about why "ride in on sub-tabs" may need re-thinking now that §3
turned out to be substantially done a different way.

---

## Continued the same session: an agent-robustness pass, asked for directly

*"design the agent to be more robust. It is still very unreliable."* Asked
what "unreliable" actually meant before touching anything, since this
sandbox has no live Ollama to reproduce against and the standing caveat is
explicit that behaviour has to be checked, not guessed. The answers, in
order: **watched it happen**, on **Ollama with a small (3B–8B) model**,
across **all** of "doesn't finish multi-step jobs," "calls tools wrong,"
"claims things it didn't do," and "just breaks." A first pass down that path
(the tool-call text-recovery regex in `ai/provider.py`) was dropped after
the user corrected it directly: *"the tool calls generally work but it's
how they are used and the agent process that gets screwed up."* That
redirected the session from parsing to orchestration — a fair criticism, the
loop's tool-call recovery is already thorough (small-model prose calls,
`<think>` splitting, string-vs-object arguments); the actual gap was
upstream of that.

A third round narrowed it further: *"loses the plot half way, does actions
that don't make sense, and often says it did or will do something it did or
doesn't do."* That is a description of **skill/plan multi-step runs
specifically** — a single ordinary turn already has a lot of defence
(`EARNED_ROUNDS`, per-error recovery hints, the hallucinated-write net in
`agent.unsupported_claims`), and reading `skill_runner.py` end to end found
the real gap in the one place none of that reaches: **what one step hands
the next.**

### The bug: a step's own narration was all the next step ever saw

`step_history.append({"question": step, "answer": answer[:600] or "(nothing
said)"})` — the model's own prose summary of what it did, clipped, and
*nothing else*. If step 1 was "tag every untagged note" and its own wrap-up
said "Done, I tagged the relevant notes," step 2 ("now link those notes to
the itinerary") had no way to know **which** notes "those" meant — no ids,
just a sentence. It could re-search (and plausibly find a different set —
"does actions that don't make sense") or guess. `agent.py`'s own `change`
events (the same ones already backing the chat UI's View/Undo buttons) carry
the real note id every write tool touched; they were being collected into
the run's `changes` list for the final summary and then **thrown away**
before the next step's turn.

Fixed in `skill_runner.py`: each step now hands the next one the actual ids
its own `change` events named, appended to (not replacing) its prose —
`"Tagged them. [Notes touched this step: #5, #12]"` — truncating the prose
first if the two don't both fit in the existing 600-char budget, since the
ids are the fact the next step needs and the prose is what it can afford to
lose. Verified with a real multi-step run through `test_skills.py`'s
existing `ai_client`/`fake_ollama` harness: tag a note in step 1, assert
step 5's own message history (the one actually sent to the model) contains
`#<that note's id>` — not just that history exists, which the *pre-existing*
test only checked.

### The second bug the read turned up: `change.note_id` was sometimes a lie

Building that fix required looking at where `change` events come from, and
`agent.py`'s own construction was `"note_id": result.get("id")` —
**unconditional**. `create_document`'s own result also has an `"id"` key,
and it is a *document's* id. A skill step that wrote a document produced a
change whose `note_id` was that document's id, and the chat UI's existing
View button (§21/§22 — `changeRow` in `app.js`, already built, already
wired to `change.note_id`) would then take the user to whatever note
happened to share that id, or nowhere. That is exactly "does something that
doesn't make sense," reachable **today**, not hypothetically — any skill
that both creates a document and shows its change list hits it.

`agent._change_note_id(name, result)` now resolves the id from the field
each tool's own result actually uses (`link_notes` says `linked`,
`delete_note` says `deleted`, `create_document` isn't a note at all — `None`
rather than a wrong number) instead of assuming every write's `"id"` means
the same thing. A parallel `_change_document_id` fills in the equivalent for
`create_document`, and `skill_runner._step_answer` now names touched
documents the same way it names touched notes — `"Wrote it up. [Documents
touched this step: #41]"`. `delete_document` is destructive and never
reaches this code path (it's parked for a confirm card, not executed here),
so it needed no entry.

**Reminders, tags and categories still go through the old unconditional
path in spirit** — they were not in scope this pass (no report named them,
and `set_reminder`'s own id is rarely something a *later* step needs to
reference the way a note or document is), but the same `_NOTE_ID_FIELD` /
`_DOCUMENT_ID_FIELD` shape is now the pattern to extend if one shows up.

### What this does not claim to fix

The claim-specificity half of "says it did something it doesn't do" is
still open: `unsupported_claims`'s own docstring already says plainly it is
"a net for fabrication, not an auditor of whether the right note was
edited" — a claim like "I tagged it as Work" when the tool actually applied
a different tag would not be caught, only a claim with **no** matching write
at all. A future-tense-promise check ("I'll do that now" that never gets a
following tool call) was considered and **not built**: the existing net
deliberately excludes future tense ("we could link these" must never read
as a false claim), and distinguishing a genuine dangling promise from a
hedge or a question needs real model output to tune against, which this
sandbox cannot provide. Flagging it here rather than guessing at a regex
that could start crying wolf on legitimate suggestions.

Six new tests (`tests/test_document_tools.py`,
`tests/test_skills.py`) pin both fixes at the unit level (`_change_note_id`,
`_change_document_id`, `_step_answer`'s truncation/dedup/cap behaviour) and
one integration level (a real multi-step run through the streaming
endpoint). Full `pytest tests/` and `ruff check .` green.

**What's next on this thread, if picked back up:** the claim-specificity
gap above, and — if a report ever names it — extending the same
`_NOTE_ID_FIELD`/`_DOCUMENT_ID_FIELD` pattern to reminders. Neither is
guessed at here; both are named so a future session doesn't have to
re-derive that they were considered.

---

## Previous session: four reported bugs, then §38's ranked list worked straight through

Started with three quick user-reported UI bugs, found a second session
mid-edit on the same branch fixing one of them (the web-result buttons) —
resolved by asking the user, who kept this session going and stopped the
other. From there, worked §38's ranked priority list top to bottom without
stopping to ask, per the standing authorisation recorded lower in this file.
Seven commits, each with its own full pytest run, `ruff check .`, and real
Chromium verification (a running `uvicorn` + Playwright with a fake
microphone device where audio was involved) before being pushed.

**The three reported bugs, fixed first:**

1. **Web search result buttons squeezed the title/snippet column.**
   `.web-result-actions` was `display: flex` (row); two buttons made the
   grid's `auto` actions column as wide as both combined. Changed to
   `flex-direction: column; align-items: stretch`, and unified the ↗ link's
   bespoke pill styling with the 💬 button's `.ghost.small` look — the two
   were different radii/padding/weights stacked directly on top of each
   other, which is likely what "need to be better formatted" was pointing at
   in the follow-up round.
2. **Notes sidebar height grew without bound.** `syncNotesSidebarHeight`
   mirrored `main`'s `offsetHeight` into the sidebar's `min-height` via a
   `ResizeObserver` on `main` — but growing the sidebar grows the shared
   grid row (`align-items: stretch`), which grows `main`'s *stretched*
   height, which re-fires the observer with a bigger number. Classic
   self-triggering feedback loop. Deleted the JS entirely; `.layout`'s own
   `align-items: stretch` plus the CSS floor already produces the right
   height with nothing to loop. Verified stable across repeated
   measurements and tab-away-and-back with 25 seeded notes — the exact
   interaction a previous handover flagged as untried.
3. **No back-to-top button on Chat.** The existing button already existed
   app-wide, keyed off `.tab-page`'s own scroll position — but the chat
   page's own `.tab-page` never scrolls (the *messages* pane does), so the
   button was permanently invisible there without ever being in the
   exclusion list. Made the button chat-aware: it now tracks and scrolls
   `#chat-messages` specifically when that tab is active.

**A second round of feedback** (chat dock "bulky", web buttons still
"need better formatting", web panel "a little wider") turned out to already
be written up, reasoned through and ranked in `ROADMAP.md §37C`/`§37D` from
a previous session — built rather than re-derived: a `⚙` disclosure now
holds the answer-length/persona pair (collapses the dock from two wrapped
rows to one at normal widths), the two action buttons `align-items: stretch`
to equal width, and `#web-panel`'s default width moved up a clamp step and
gained a `min-width` floor after profiling showed `flex-shrink` was quietly
pulling it below even its *old* minimum in a moderate window.

**Then §38's ranked list, in order — items 3 through 7:**

- **§9, the graph's Arc layout.** A previous session deliberately did not
  start any new graph layout, flagging the integration risk across drag,
  zoom-to-fit, hover-adjacency, the trace overlay and the physics sliders.
  Built as a third case inside the *existing* `layoutHierarchy`/
  `hierarchyPath`/`frameTree` machinery rather than a new rendering path, so
  it inherited all of that integration the same way tree/radial already
  share it, instead of re-earning it. Scoped to the filing hierarchy
  (category/`parent_id`), matching tree/radial's own convention, not
  `entry_links` — a deliberate departure from BACKLOG.md §9's original "arc
  = links as arcs" line, written up there as such rather than silently
  reinterpreted. Mind map, treemap/sunburst and adjacency matrix are still
  unbuilt; none of them reuse today's static-hierarchy shape for free the
  way Arc did, so each is its own scoping question.
- **§10C, the Timeline's branch/line view.** A `View: Grid / Line` picker;
  the line reuses the grid's own category/tag bands rather than §9's
  separate cluster-detection endpoint — a deliberate scoping call, written
  up in BACKLOG.md §10, over the original sketch's "linked-note cluster"
  option. **Found and fixed a real bug while verifying in Chromium**: the
  spine and branch-stub SVG lines have `fill: none` but are still
  hit-tested along their stroke by default, and a deep band's stub runs
  *past* every shallower lane on its way down — painted later, it silently
  ate clicks meant for their dots. `pointer-events: none` on all three
  decorative line types fixed it. This is the same shape of bug this file's
  own trap list already warns about (a private stacking/hit-testing quirk
  no amount of reading the code would have surfaced) — driving it in a
  browser is what found it.
- **§17, meeting notes.** Record → transcribe → review → save, a new
  `/voice/transcribe-meeting` endpoint (300MB ceiling, vs. the existing
  spoken-note endpoint's 25MB) sharing one `_transcribe_upload` helper with
  it. **Action-item extraction — the feature's other half — was
  deliberately not built**: it needs a real model call parsing free text
  into several structured reminders, and this sandbox has neither
  faster-whisper nor a running Ollama to check a new prompt's behaviour
  against. Verified everything that could be verified without either: the
  full record → (mocked) transcribe → review → save round trip in Chromium
  with `--use-fake-device-for-media-stream`, the timer ticking in real
  time, the graceful "faster-whisper not installed" path (genuinely true
  here), and the saved note existing via the API with the right tag.
- **§27, onboarding diagnostics.** A new "Your setup" slide reports Ollama
  reachability and where the notebook lives/how big it is — needed **no new
  backend**, since `/models/status` and `/storage` already existed and
  already power the header pill and Settings → Data. Placed second (before
  the capture slide), so a first capture landing in `Uncategorised` reads as
  "Ollama isn't on yet" rather than "broken". The former "Explore your
  graph" slide now also names the Timeline's Line view, closing
  ANALYSIS.md's "product differentiation" gap with existing slide
  machinery. Offering to pull a model, a `MEMORYMAP_DATA_DIR` writability
  check, and the name/first-note/model-choice steps are still open —
  BACKLOG.md §27 draws the line precisely.

**What's next, and why this session stopped here rather than continuing
down the list:** §38's remaining two items both genuinely need something
this session couldn't supply itself. **Item 8, the `app.js` module split**,
is a large mechanical refactor of a ~20k-line file with no single
obviously-safe next slice — the roadmap's own sequencing says it should
ride in on the sub-tabs work, which hasn't started as its own initiative.
**Item 9, the rest of §37** (37G sketch image-upload vs. markitdown, 37H
llama.cpp wiring, 37I compress-as-agent-tool, 37K emoji rendering, 37L the
full-UI-audit umbrella) each explicitly need one clarifying question
answered before they can be scoped at all, per §37's own writeup — guessing
at the answer rather than asking would be exactly the kind of ungrounded
work this file's standing caveats warn against.

**What I could not check, unchanged from previous sessions**: anything
involving a real model's actual behaviour (Arc's and the Timeline line
view's *rendering* was verified with real seeded data; the meeting
recorder's *transcription* itself was not, for the reason above), and the
desktop shell.

---

## Same session, continued again: four reported bugs, fixed as a bounded side-trip

After §38's audit and its first three items landed, four real bugs were
reported live against this branch (not `main` — confirmed before touching
anything, since a mismatch there would have meant the fixes were already in
and just unmerged). Treated deliberately as **contained work**, not a new
priority list, given the whole point of this session was that §35–37 kept
doing exactly that. All four are in ROADMAP.md §38a with the full reasoning;
short version:

1. **Notes sidebar gap** — an uncommented `align-self: flex-start` silently
   overrode the "stretch, not start" fix .layout's own comment already
   describes, plus a fixed-height CSS var that couldn't grow past its own
   guess. Fixed with a `ResizeObserver` mirroring `main`'s real height.
2. **Timeline text still cut off** — §37J's column widen wasn't enough
   against a 120-char preview at 2 lines; 13rem + 3 lines gets close to the
   full text instead of a marginal gain.
3. **A tagged note missed because the remembered date was wrong** — "that
   joke... two weeks ago" (actually three) hard-filtered to empty. Added an
   un-dated subject-only fallback, labelled `outside_range` so it's never
   mistaken for an in-window match — deliberately the mirror image of a
   fallback already rejected in the code for good reason (dropping the
   *subject* and keeping the date instead), not a reopening of that decision.
4. **A second O(n²) trap**, found because the user asked for a backend
   sweep after the third fix: `GET /entries/link-suggestions` called a full
   embedding scan once per entry. Rewritten to fetch every vector once and
   compare pairs in memory, matching `routes_graph._similarity_edges`'s
   already-correct shape.

**Storage was also checked** (asked for directly): ARCHITECTURE.md §8 now
has real numbers from `scripts/scale_test.py` — ~350MB at 200,000 notes with
real embeddings, attachments/`entry_revisions`/`audit_log` flagged as the
parts that don't scale with note count and weren't sized this pass.

**Also fixed while checking accuracy**: README.md's "Next up" list was stale
(items already done, like the Library tab work, still listed as pending) and
its Whisper claim was wrong — `faster-whisper` already powers single-note
dictation, it's *longer* transcription that's unbuilt. Corrected in
README.md and the two spots in ROADMAP.md that repeated the same claim.

Full suite green, `ruff` clean, all new/existing tests covering the four
fixes pass. **Next: back to §38's own list** — item 3 (graph layouts,
properly scoped for its own session) or item 4 (Timeline branch/line view).

---

## Same session, continued: the roadmap was re-audited and re-prioritised

The user pushed back, correctly: three sessions in a row (§35 → §36 → §37) had
kept extending the newest polish batch instead of touching the other 34
sections underneath it. Asked for the roadmap to be honestly re-prioritised
and then worked through **without stopping to ask** — treat that as standing
authorisation for this and future sessions to keep pulling from
[ROADMAP.md §38](../ROADMAP.md#38-where-this-actually-stands--the-backlog-audit)
until told otherwise.

**What happened:** a full audit of BACKLOG.md (§1–§29) and ANALYSIS.md
(§30–§34) against the actual code, not the backlog's own prose. Found real
staleness in both directions — §4 (Library tab), §11 (hybrid retrieval), §16
(status bar, listed twice) in BACKLOG.md, and §33/§34 in ANALYSIS.md were all
marked open for things that are built, including the project's own outside
review's #1 recommendation ("finish the agentic loop") being satisfied by
`run_skill`/`make_plan` without ever being marked so. Each is corrected in
place, not just noted in ROADMAP.md. §38 is the new live front door and
supersedes §37's own priority list; **read §38 first**, before anything else
in this file including the section below.

**§38's first item is done too, same session:** the notebook was actually
scale-tested (`scripts/scale_test.py`, a generated fixture up to 50,000
notes), not just flagged as untested. Found two real N+1 query patterns —
`GET /graph` resolving each note's category with its own `session.get()`
call, `search_manager.semantic_search` materialising a full `Entry` ORM
object for every embedded note just to score most of them away — profiled,
not guessed at (10,000 category lookups were 87% of one `GET /graph` call's
time on a 10k-note notebook). Both fixed the same way: score or match against
raw ids first, fetch the real `Entry` rows only for what survives. Real
numbers at 50k notes: `GET /graph` 19s→1.8s, chat's search 6.6s→0.5s, the
`related_notes` agent tool's neighbour-suggestion call ~20s→1.3s. Pinned by
`tests/test_scale_query_counts.py` (a query *count*, not a timing — timing
assertions are flaky under CI load). Full writeup, including what's still
open (`GET /graph?similarity=true` is a real O(n²) — 30 seconds at just 2,000
notes — and is off by default rather than fixed), is in ANALYSIS.md §34,
item 2.

**§38's second item is done too:** a headless Playwright smoke suite,
`tests-e2e/` (own `package.json`, doesn't touch the no-build-step frontend),
wired into `.github/workflows/ci.yml` as a new `e2e` job. Verified locally
against a real running app before being trusted, not just authored — and it
paid off immediately: it caught that "documents" is in `app.js`'s own `TABS`
array but has had no `#tab-btn-documents` in the nav bar since §36F replaced
it with Library, which a test written from the array alone (what a first
draft did) would have silently gotten wrong. Covers every tab actually
reachable from the bar for console errors, uncaught exceptions and
horizontal overflow, plus one real interaction (capture a note, see it in
Browse).

**§38 item 3 (graph layouts) was checked, not built — a deliberate stop, not
a skip.** `renderGraph()` is tightly integrated across drag, zoom-to-fit,
hover-adjacency, the trace overlay and the physics sliders; a new layout
means plugging into all of that, not writing one D3 function. Attempting it
at the tail end of an already long session risked exactly the
half-integrated feature CLAUDE.md warns against, so it's written up in
ROADMAP.md §38 as needing its own session with room to verify visually
against every one of those interactions — the same shape of call as §37E's
design-spike recommendation, not an excuse.

**§38 item 5 (Chat/Agent/Browse) turned out to be substantially done
already**, checked rather than assumed either way: the Ask/Request mode
toggle, the web panel column and `make_plan`'s ticked-step display satisfy
its substance through a different — and per §36G's own reasoning, better —
shape than literal sub-tabs. One small real gap noted in BACKLOG.md §3 (no
user-facing tool-allowlist/max-rounds control in Agent mode) and left
unbuilt as not worth its own session. **Next: §38 item 3 (graph layouts, now
properly scoped) or item 4 (Timeline branch/line view).**

**The corrected order, top of it:** scale-test the notebook past a few
hundred notes (cheap, flagged by the outside review, never done), a headless
Playwright smoke suite in CI (the actual fix for "every layout bug passed a
green run"), graph layouts beyond tree/radial, the Timeline branch/line view,
Chat/Agent/Browse sub-tabs, meeting-notes/transcription, onboarding
diagnostics, then the `app.js` module split riding in on the sub-tabs work.
Full reasoning for each is in §38.

---

## Previous entry in this session: §37's top five, done

Worked §37's own priority list in order, straight through 37B–37E. **37B
decided (no lock-screen Quit button — the LAN-DoS trade-off wasn't worth a
convenience button, decided with the user directly). 37D.1, 37J, 37F and 37E
are built and verified in Chromium** — details and reasoning are in
ROADMAP.md's §37B/§37D/§37F/§37J/§37E, updated in place rather than duplicated
here. **Next up per §37's own ranking: 37C, the chat dock density pass** —
37C's own note says to re-look at it only after 37E ships, which it now has.

**37F had a real surprise worth internalising**: most of "the graph toolbar is
bulky" was already fixed the *day before* that section was written
(`3e77f57`) — the roadmap text describing twelve controls in one row was
stale the moment it was committed. Checking the running app first (not just
grep, an actual look) is what caught it; building against the roadmap
paragraph instead would have redone finished work. The one genuine gap —
Trace as a permanent row — was real and is now fixed.

**37E (zoom) turned out to need less new design than its own write-up
expected**, because a check answered the "which CSS mechanism" question before
any prototype branch was needed: `data-fontsize="small"/"large"` already
scales the root font in production, and control heights/icons are already in
rem, so a root-`font-size` percentage was already proven to reach everything.
The one real design question — zoom fighting Text size over the same
`font-size` property, not zoom fighting density as §37E's write-up predicted —
was solved with one multiplying custom property (`--zoom`, composed via
`calc()`), not a rethink of either control.

**What I could not check:** anything about a real model (unchanged, standing
caveat), and the desktop shell. Everything UI in this session's five items
*was* driven in Chromium — screenshots, a resize drag measured before and
after, root `font-size` measured in the DOM at three zoom levels, full page
reloads to confirm `graph-trace-open`/web-panel-width/zoom persistence
(including via the server-mirrored `ui_state` path, not just `localStorage`),
and a full `pytest tests/` (~1,600 tests) plus `ruff check .` green after each
batch.

---

Written at the end of the session that **deleted three surfaces**, moved web
search out of the chat dock, added embedding-model management, and — in a long
follow-on round the same session — fixed six more reported bugs and triaged a
much bigger list into [ROADMAP.md §37](../ROADMAP.md#37-reported-in-one-session--the-second-big-batch-reprioritised).
Everything here is either a fact you can check or a thing I could not check and
am saying so about.

**Start at [Where to start next](#where-to-start-next--ranked-with-the-reason).**
That section now leads with §37 — read it first, the ranked list below it is
what came before.

---

## Read this before you touch anything

**Every UI fix this session was measured in Chromium first, and the
measurement was the fix each time.** Not a slogan — the record:

| Reported as | What the browser said |
| --- | --- |
| "the ui issue with the bottom dock" | Dock box ending at y=614, composer at y=814. 200px outside the card, Send below the window. |
| "the web search panel dock is squashed ugly" | A search box, a results list and a whole web page inside `min(38vh, 20rem)`. |
| "the graph is out of the main ui panel again" | `min-height: 22rem` under the map + a two-row legend > a 700px window. |
| "the notes sidebar too" (a second sidebar, same day) | Both were 22px too tall. One `calc`, written by hand in three rules, each missing the page's bottom padding. |
| "the embedding model doesn't redownload every time, right?" | Right — those are HuggingFace *metadata* requests, not the weights. |
| "quick sketch's Close button just darkens the background" | Confirm dialog at z-index 55, sketch overlay at z-index 60 — the dialog painted behind it. `elementFromPoint` on the confirm card returned the sketch card underneath it. |
| "before signing in, a popup says failed to load entries" | A stale token in `localStorage` fires a dozen bootstrap requests before unlock; each 401 correctly showed the lock screen *and* was separately toasted. |

A bug reported twice on two different
surfaces is usually one bug in a shared expression (the sidebar heights, both
missing the same padding term), and a bug that darkens a whole screen with no
visible dialog is usually two elements at the same z-index tier fighting over
which paints on top, not something actually broken inside the dialog itself.
`--page-sticky-h` names the first kind now; look for the second kind — a
private `z-index` outside the shared 55/60 tiers — before assuming a reported
"nothing happens" click is a logic bug.

The app runs on localhost and the sandbox has Chromium. **Reproduce first.**

---

## The traps that will cost you an hour each

1. **Any `100vh`/`vh` sum is already wrong.** Unchanged from the last
   handover and it bit twice more this session — `46vh` for the logs list and
   `min(38vh, 20rem)` for the web panel, both of which were guesses at how
   much of the window some *other* furniture was using. **Anything sized
   against the window goes through `--page-viewport` or `--page-sticky-h`.**
   Better still, size it against the box it is actually in: the chat sidebar
   needs no arithmetic at all now, because its grid area is already exactly
   the right height.

2. **A flex parent that can shrink, with children that cannot, does not clip
   — it overflows.** `.chat-dock` was `flex: 0 1 auto` with every child at
   `flex: 0 0 auto`. The box shrank; the contents did not; they drew straight
   through the bottom of the card, and the card's rounded corner cutting
   across the middle of a control is what that looks like. **If a container
   is allowed to shrink, something inside it has to be allowed to shrink too,
   or it must not be allowed to shrink at all.**

3. **A stacking context you cannot see.** `backdrop-filter` creates one. So
   does `position: absolute` with any `z-index`. Fix by lifting the *owning*
   element (`.menu-open`), never the menu. Still true, still the first thing
   to check when a menu is reported behind something.

4. **A lint that slices a fixed number of characters will fail on a
   comment.** `test_frontend_ids.py` did, and a lint that fails on prose is a
   lint people learn to weaken. It slices to the end of the function now.

5. **Two overlays at a private `z-index: 60` will eat a nested confirm
   dialog.** `#sketch-overlay` and `#improve-overlay` both sat above
   `.modal-overlay`'s shared `z-index: 55` — the same tier toasts and popups
   use, for a reason that had nothing to do with either overlay. Any modal
   that might one day open a `confirmDialog()`/`promptDialog()` on top of
   itself has to be at 55, not 60, or the confirm paints underneath it and
   looks like a click that did nothing. **Grep for `z-index: 60` before
   building a new full-screen overlay** — it is currently only toasts, the
   command palette, the notification panel and the AI-status popup, and none
   of those ever open a nested dialog on top of themselves; a new overlay
   that copies the number without copying that property is this bug again.

6. **A per-step `.catch()` in a bootstrap loop will re-report a session-wide
   condition as N separate failures.** `startApp()`'s `step()` helper toasts
   whatever error each parallel request throws, which is right for a request
   that actually failed on its own and wrong for "the token expired," which
   `api()` already announces once by showing the lock screen. **Any error
   that is really "this whole session is in state X," not "this one call
   failed," needs a marker property** (`error.isLockout` is the one example
   now) so a generic retry/report loop can tell the two apart — the loop
   cannot know from the error's `.message` alone.

---

## What is now true that wasn't

### The three panels are gone (§36G) — the first surface this project removed

`#bin-panel`, `#activity-panel`, `#tags-panel`, `renderBin`, `renderActivity`,
`renderTags`, `PANELS`, `showPanel`, the `.panel-close` wiring, the
`#bin-empty` handler and `entryItem`'s `options.bin` branch.

The prerequisite was **reading a binned note in full** (`#binned-overlay`,
`GET /entries/{id}?deleted=true`), which was the one thing the panel could do
that a Library card could not. §36G now records the rule that came out of it:
*a surface may be replaced without being deleted, but only for as long as it
can still do something its replacement cannot — so write that thing down when
the replacement ships, because it is the whole of the remaining work.*

### Web search is a column, not a drawer in the dock

The dock is a control strip and its job is to stay short. A reading surface
inside it had to be capped, and the cap made it unusable — the two symptoms
(pushing the composer off the bottom, then being too small to read) were the
same mistake from either side. As a column beside the conversation it needs no
cap at all, and you can read a source and type about it at once.

**`fitComposerToDock` is the other half.** A hand-dragged composer height is a
preference and is kept as one: only the *applied* height is trimmed to the
room the card has, never `localStorage`, so the box comes back to what you
dragged it to the moment the window is big enough. It iterates, because one
subtraction does not converge — the message list grows into the height the
composer gives back.

### Optional extras and embedding models are one screen

Both are "things downloaded to this machine, with a way to undo it".
`core/extras.py` and `core/embedmodels.py` share a security property that must
survive any change: **the request names an allowlist entry, never a package or
a repo id.** It matters more for models, because removal deletes a directory.
HuggingFace's `org/name` → `models--org--name` flattening is itself the
traversal defence — it looks like formatting, so there is a test saying so.

`unavailable` on an extra greys the button out **and** refuses the request
server-side. The greyed button is a courtesy; the refusal is the rule.

### A 🧭 Plan button, and skills that take you to themselves

`make_plan` has existed since §35K with no way to ask for it. The button sends
what you typed with a sentence asking for a plan — a sentence rather than a
request flag, because the planning path is the model's own tool and a second
route into it could drift from the first.

`startSkill` now switches to the chat tab. It did not, so a skill started from
the dashboard streamed into a tab nobody was looking at.

### A second round: six more reported bugs fixed, a much longer list triaged

The same session, after the handover above was mostly written, took a long
follow-on list of reports. Six were small and clear enough to fix on the spot
(§37A: the sketch close bug, the app-wide select-arrow fix, the notes-list
toolbar heights, the category-actions/count clash, the pre-auth toast noise,
the dashboard-first-load default) and are described with their reasoning in
[ROADMAP.md §37](../ROADMAP.md#37-reported-in-one-session--the-second-big-batch-reprioritised).
The rest — a chat-dock density pass, a resizable/refined web panel, a UI zoom
setting, the graph toolbar, sketch image/document upload, llama.cpp, chat
compression as an agent tool, a real Timeline fix, emoji rendering, and the
"full UI audit" umbrella — is triaged there too, in priority order.

**One deliberate non-decision:** a Quit button on the lock screen was asked
for and is not built. It needs `/shutdown` reachable without the unlock
token, which is a real trade-off (§37B) — building it silently inside a batch
of forty other fixes would have hidden a decision about the auth model that
deserves to be made in the open.

**The roadmap's own top-level "here's what to do" sections had also drifted**,
and this was the session that found it: "Priority map" listed the Library tab
as an open Tier 3 item after it had been built *and* had panels deleted from
it. All three legacy priority sections (`Next session: start here`, `Do these
next`, `Priority map`) now carry a correction note pointing at what's actually
still open, and the fully-closed security-audit tier moved to HISTORY.md so
ROADMAP.md stayed under its own 2,000-line lint.

---

## What I could not check, and you should not assume

1. **Anything involving a real model.** Unchanged, and still the standing
   caveat. The 🧭 Plan button's instruction text has never been tried against
   a running Ollama — the *machinery* is the proven §35K path, but whether a
   7B model reliably reaches for `make_plan` when asked in those words is
   untested. It is one string, `PLAN_PREFIX` in `app.js`.
2. **The embedding-model download itself.** `huggingface_hub` is not
   installed in the sandbox (it arrives with `sentence-transformers`, which
   must not be installed here), so `can_download()` is false and every test
   covers the refusal path, the allowlist and the size calculation. **The
   happy path — `snapshot_download` actually fetching a model — has never
   run.** It is four lines; look there first if a download misbehaves.
3. **SearXNG autostart.** No Docker in the sandbox. The preference, the
   plumbing and the startup hook are wired and the thread is started; the
   container coming up is unverified.
4. **The desktop shell and Windows.** Unchanged.
5. **The graph's new world box.** The clamp that keeps nodes in frame used to
   clamp to the *viewport*, which is wide and short — so repulsion pushed
   outwards, the walls pushed back, and seventeen notes settled into a
   lattice. Reported as *"the graph nodes are like locked into a box"*, which
   is exactly what it was. The world is `1.8 ×` the frame now, so the forces
   decide the shape and the clamp only bounds the endless drift it was written
   for. **The reasoning is solid and I could not observe it** — the sandbox
   reclaimed the server three times at the end of the session. `ruff`, the
   full suite and `node --check` pass; the change is one constant and two
   comparisons in the tick handler. Look at it first if the graph is reported
   wrong, and if 1.8 is too loose the fit will simply start further out.
6. **The Library's ⋯ menu positioning.** Reported this session as "off in
   positioning" on the cards view. I could not reproduce it before the session
   ended — `.menu-wrap` is already `position: relative`, so `right: 0` should
   anchor the menu to the ⋯ button, and what the screenshot shows may be the
   menu correctly covering the card *below* rather than being mispositioned.
   **Not fixed, and not investigated to a conclusion.** Measure it with
   `elementFromPoint` before changing anything.
7. **"The notes sidebar keeps changing its height slightly, increasing the
   gap at the bottom."** Checked and *not* reproduced: `#sidebar`'s height
   measured identically 1.5 seconds apart, idle, on the browse section with
   two categories. That is not the same as confirming there is no bug — it
   means whatever triggers it is an interaction I did not try (switching
   sub-tabs and back, a widget re-render after `loadCategories()`'s
   deliberately-unawaited fetch resolves late, a tag-suggestion refresh). The
   sidebar's own height rule (`height: var(--page-sticky-h)`, fixed this
   session) should make this structurally impossible now regardless of cause
   — it no longer sizes to its own content — but say so only after it is
   re-reported, don't assume it's already covered.

---

## Where to start next — ranked, with the reason

**A second, larger batch arrived after most of this handover was written —
start with that.** It is triaged and ordered in
[ROADMAP.md §37](../ROADMAP.md#37-reported-in-one-session--the-second-big-batch-reprioritised),
at the user's explicit request to reprioritise before doing anything else.
Six items in it are already fixed this session (§37A) and verified in
Chromium; the rest is ranked in §37's own "Priority order for the next
session" list at the end of that section. The short version, so you don't have
to follow the link immediately:

1. **§37B — a five-minute decision with the user**, before anything else: does
   the lock screen get a working Quit button, which means an unauthenticated
   `/shutdown`-equivalent route. The trade-off (local-only vs LAN exposure) is
   written out in full there. Two other things are blocked on the answer.
2. **§37D.1** — make the web panel resizable. `makeSidebarResizable()` already
   does this for three sidebars; the web panel isn't in that function's list
   yet, and it doesn't size itself the way the other three do (a `flex` clamp
   rather than a grid column), so it needs the drag-handle treatment adapted
   rather than a one-line addition.
3. **§37J — the Timeline.** Genuinely broken, not merely unpolished: clipped
   two-line chips in ~88px columns, showing raw `**markdown**` syntax via
   `textContent` instead of `renderMarkdown`. **One correction to make before
   starting:** the overlapping-labels screenshot in that same report is the
   *Graph* tab, already fixed this session by widening the simulation's world
   box (below) — don't re-diagnose it as a Timeline bug.
4. **§37F — the graph toolbar.** Four bands of chrome (heading+search,
   layout/colour, trace row, legend) before the map on the one tab whose job
   is the map. Same grouping technique §36B already proved twice.
5. **§37E — a UI zoom setting.** The single highest-leverage item on the list
   (asked for because a 13" laptop needs ~80% browser zoom to see the app
   comfortably) but it needs a real design spike first — `zoom` vs a root
   `font-size` percentage vs `transform: scale`, each with different
   interactions with `--page-viewport`/`--page-sticky-h`. §37E has the
   trade-offs written out; do the spike before committing to an approach.
6. **§37C — the chat dock, again.** Two sessions have fixed real bugs in it
   without the "bulky" report going away, which means what's left is a density
   pass, not a bug — and §37C says to re-look at it *after* §37E ships, since
   some of "bulky" may resolve once zoom exists.
7. **§37I — compress-as-an-agent-tool.** Needs one design decision first (does
   the agent's own compression skip the human review step the feature was
   built around, or hand off mid-run?) — §37I lays out both sides.
8. **§37G / §37H / §37K** each need one clarifying question answered before
   they can be scoped (sketch image-upload vs the markitdown PDF-importer
   already on the books; llama.cpp wiring, which is a full backend session;
   what "change how emoji render" actually means). Ask, then schedule.
9. **§37L** is the umbrella "full UI audit" ask — deliberately not a task to
   start a session with. Break it into dated sub-items as capacity allows, the
   way §36 itself was built up piece by piece.

### Also still open, from before this batch

#### 1. The document editor, now that it is not a tab

It is reached only from the Library. That frees it to stop being a page laid
out around a list that has left: a wider writing column, and the outline and
"notes it draws on" panels earning their place beside the text instead of
sitting folded shut under a switcher. Asked for directly and still only half
done — the sidebar is fixed, the editor itself is untouched.

#### 2. The Library's ⋯ menu, properly measured

See caveat 6 above. It is a live report and it is unresolved. Half an hour
with `elementFromPoint` settles whether there is a bug at all, which is worth
more than a blind fix.

#### 3. §36G's bookshelf theme, the next two pieces

The spine is built. Next: **shelf rows** with a rule under each group when
sorting by kind, and an **empty state drawn as an empty shelf**. The rule to
hold to is in §36G — anything decorative that makes a card harder to scan
loses to the scan.

#### 4. markitdown, and the sketch pad's image upload — now linked (§37G)

`markitdown` wants a "bring in a PDF as notes" button; §37G's sketch-pad ask
("upload documents and images") may be asking for exactly that button, or for
something scoped inside the sketch pad only — worth confirming with the user
which, since the two are different amounts of work. `llama-cpp-python`'s wiring
is now §37H, with its own scope written out (a new provider, a GGUF file
picker — budget a full session).

#### 5. Two things that are decided, so do not re-derive them

- **Absorbing the Notes tab into the Library: no.** Reasoning in §36G. The
  Library *manages*, the Notes tab *works*.
- **The tab bar is the right length.** It wraps below ~1350px, measured.

#### 6. The largest untouched things

**§9's decorative half** (skins, minimap, PNG/SVG export of the current view)
and **§10's `events` table**, so the Timeline's bands can be events and places
rather than only categories and tags. §37J is a nearer-term Timeline pass and
should probably happen first, since it fixes what's broken before adding what's
missing.

---

## Practical notes for the next session

- **Running the app:** `PYTHONPATH=src MEMORYMAP_DATA_DIR=<scratch> .venv/bin/python -m uvicorn memorymap.api.app:create_app --factory --port 8781`.
  The `PYTHONPATH` is required and is not in CLAUDE.md's recipe. **Restart it
  after any Python change.** Start it with `setsid … < /dev/null &` — a plain
  `&` in this sandbox dies with the shell that launched it, which cost this
  session three restarts.
- **Do not install torch** or `sentence-transformers`. The suite passes
  without both, and `huggingface_hub` is absent for the same reason.
- **Driving it:** a small `drive.js` that launches Chromium, does first-run
  setup and skips the onboarding overlay is the whole harness.
  `PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers`, require
  `/opt/node22/lib/node_modules/playwright`.
- **`fetch()` inside `page.evaluate` will 401.** The app's `apiJson` adds the
  unlock token; a bare `fetch` does not, and a 401 in a probe looks exactly
  like a feature that does not work. Call `apiJson` from the page instead —
  it is a module-scope function and is reachable as a bare identifier.
- **A dragged composer height is mirrored to the server** (`ui_state`), so it
  survives a fresh browser profile. Clearing `localStorage` alone will not
  reset it, which will confuse a screenshot.
- **Graph traps, still true:** press the `.graph-core` circle, not the
  `.graph-node` group; a module-scope `let` is not a property of `window`.
- **`elementFromPoint` is how you prove a stacking bug.**
- **Lints that are load-bearing:** `test_style_scale.py`,
  `test_frontend_ids.py`, `test_frontend_handlers.py`, `test_docs_layout.py`,
  `test_docs_site.py`, `test_ui_state.py`, `test_chat_dock.py`. If one fails
  it has found something — **except** when it has found a comment, which
  happened this session; fix the lint's brittleness, not the prose.
- **`test_docs_site.py` mirrors CHANGELOG/CONTRIBUTING/SECURITY into `docs/`.**
  Editing the root copy fails the build until you `cp` it across.
- **CI runs `ruff check .`** and CodeQL. CodeQL has now found two
  `py/polynomial-redos` in `search/query.py` in consecutive sessions; both
  times the fix was `str.split` and a set. **A character class with `*` or
  `+` next to an anchor is the shape to avoid.**
