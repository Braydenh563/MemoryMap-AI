# MemoryMap AI — work plan

The live priority list, restructured. §1–§38's full narrative (every reported
bug, every "decided against," every dead end) has been condensed into
[roadmap/HISTORY.md](roadmap/HISTORY.md) rather than kept here — this file is
now *only* what's still open, ranked by what it unlocks. Section numbers in
code comments and tests still resolve via HISTORY.md's index.

## Read these two first

| | What's in it |
| --- | --- |
| [roadmap/HANDOVER.md](roadmap/HANDOVER.md) | **The last session's handover.** What changed, what couldn't be checked and why. Read this first. |
| [roadmap/HISTORY.md](roadmap/HISTORY.md) | Everything already built, and every backlog item already closed — with the reasoning, condensed. **Check here before building anything.** Four sessions have rebuilt something that already existed. |
| [roadmap/BACKLOG.md](roadmap/BACKLOG.md) | Standing backlog items not yet promoted to this file's live list. |
| [roadmap/ANALYSIS.md](roadmap/ANALYSIS.md) | Judgements: the odysseus read, and the licence constraint — **this project is AGPL-3.0 now, not MIT**, so §34a's "no code crosses either way" is half-lifted. What was deliberately not taken. Also §59: the claude-obsidian/cognee/graphify read behind items 32–36 below. |
| [DESIGN.md](DESIGN.md) | The design system. `tests/test_style_scale.py` enforces it. |

**The standing caveat:** every provider test runs against a fake transport —
SSE framing and tool-call parsing are implemented from the spec, not verified
against a running Ollama/LM Studio. UI claims are now checkable (Chromium is
in the sandbox); model *behaviour* claims are not — reproduce or say plainly
you couldn't.

## Next up, ranked by what it unlocks

**One list, four tiers. Work top-down and do not skip.** The failure this
project actually has is not forgetting work — it is a later session picking
something interesting from further down while a correctness bug sits at the
top. If an item is blocked, say so in the handover and take the next one.

The tiers are not equal. Nothing in Tier 2 is worth more than any Tier 1 item.

### Tier 1 — correctness and trust

Things that are wrong, lose work, or make the app feel unreliable.

1. ~~**Meeting transcription errors out.**~~ **Re-confirmed fixed
   (HISTORY.md §50), one step further than before.** §41 already made a
   failed model download raise a distinct 503 instead of the route's
   generic "Couldn't transcribe that recording: <error>" catch-all. This
   session installed `faster-whisper` for real (lightweight — no torch) and
   POSTed a real WAV clip to `/voice/transcribe-meeting` on a live server:
   got back `503 "Couldn't load the Whisper 'base' model... check your
   internet connection"`, not the old mystery error. **Not fully verified**:
   this sandbox's network policy blocks `huggingface.co` (403 at the proxy,
   confirmed via `$HTTPS_PROXY/__agentproxy/status`), so an actual
   successful transcription — real audio in, real text out — still hasn't
   been observed by any session. If it's re-reported, that's the half still
   worth checking, ideally from an environment that can reach Hugging Face.
2. ~~**"The AI fails to respond while still saying it is writing" — and the
   skill step counted as done.**~~ **Found already done (HISTORY.md §50)** —
   checked the code before rebuilding, per this file's own rule, rather than
   trusting that an uncrossed-out item means unbuilt. Both halves are in and
   tested: `frontend/app.js`'s `STREAM_IDLE_TIMEOUT_MS` (150s) races
   `reader.read()` and throws a real, visible error ("The model stopped
   responding...") when nothing arrives at all; `skill_runner.py`'s
   `not answer and not ran_any_tool` branch reports a step `failed` with
   `"the model didn't respond — no answer and no tool call"` instead of
   falling through to `done`, pinned by
   `test_a_step_that_produces_nothing_is_not_ticked_done`. This was §41's
   own work (see HISTORY.md) — ROADMAP.md simply never got the strikethrough.
3. ~~**Skills producing network errors, or models that cannot run them.**~~
   **Found already done (HISTORY.md §50), same staleness.** `went_offline`
   in `skill_runner.py` stops the run and reports `"Ollama isn't reachable
   — check Settings → Models and try again."` rather than repeating the
   same failure on every later step, pinned by
   `test_a_network_failure_mid_step_stops_the_run_instead_of_repeating`. The
   reason names the step (`index`) and the cause (`reason`), and
   `skill_from_step` already resumes from it — also §41's work.
4. ~~**Contradictions in the agent prompt around small talk.**~~ **Found
   already done (HISTORY.md §50), same staleness as items 2/3.** There is no
   contradiction reaching the model: `routes_chat.py`'s stream only calls the
   tool-enabled agent (and thus only sends `TOOLS_GUIDE`) when
   `intent.needs_retrieval(...)` is true, which `SMALLTALK` never is — "Small
   talk never goes near the agent" is the code's own comment at that gate.
   `librarian.build_conversational_messages` (small talk's actual prompt
   path) never references `TOOLS_GUIDE` at all — grepped, not assumed.
   Directly tested: `test_a_bare_yes_is_ordinarily_smalltalk_not_the_agent`
   asserts `not fake_ollama.tool_rounds` for a bare "yes", and is explicitly
   labelled "Tier 1 §4" in its own test file. Likely resolved by the same
   `answering_agent` work HISTORY.md's §41 already documents.
4a. ~~**Eight preferences saved correctly and were honoured correctly, but
    never came back from `GET /preferences`.**~~ **Fixed (HISTORY.md §49).**
    Found live while adding a notifications-mute toggle to the panel: it
    saved, the bell icon should have flipped, and it didn't — because
    `get_preferences()` is a hand-built dict, and the new key wasn't in it.
    Checking whether the same shape existed elsewhere (rather than assuming
    this was the only one) turned up seven more: every Autonomous Background
    Workers toggle, the interval, the model override, battery-efficient
    mode, and smart model routing — all settable, all correctly read by
    `autonomous.py`/`model_manager.py` straight from storage (so the
    *behaviour* was never wrong), but never once echoed back. Every one of
    those Settings checkboxes showed unchecked again the moment the page
    reloaded or the panel reopened, regardless of what was actually saved
    and actually in effect — the exact shape of "keeps disabling itself"
    this project has chased before (§42), from a different cause. Verified
    live: PUT a value, GET it back, on the real running app, not just a
    passing test — the gap survived every test in the suite because nothing
    ever asserted what `GET /preferences` echoes, only what the backend
    that reads it *does*.
5. ~~**Decide what notifications are for.**~~ **Already done** — found stale
   while auditing the list this session (checked before building, per this
   file's own standing rule). The audit itself: `recordNotification` has
   exactly three call sites — a chat/skill run that stopped early
   (`app.js` ~5743), a reminder coming due (~15648, plus folding in anything
   overdue on the server when the panel opens, ~15525), and every finished
   background job via `renderTaskHistory` (~17427), which is *every* job
   `routes_tasks.collect()` lists — including the embedding-model download
   this session added to that list (§6 below), so it reached the
   notification centre automatically rather than needing its own wiring.
   Nothing raises a notification outside those three paths. Verified by
   tracing every call site, not by driving it in a browser — say so plainly:
   if this is re-reported, that is the half still worth checking live.
6. ~~**Background tasks that never appear.**~~ **Found already done
   (HISTORY.md §50).** Did the sweep this item asked for rather than trusting
   the uncrossed-out entry: every `threading.Thread(` call site in
   `src/memorymap` checked by hand against `routes_tasks.collect()`. All
   nine are covered — reindex/pull (`model_manager.py`), embedding warmup
   (`embeddings.py`), the autonomous pass (`autonomous.py`, both the
   scheduler and the manual trigger — correctly keyed off "is a pass
   *executing*", not "is the scheduler thread alive", so an idle scheduler
   sleeping until 3am doesn't falsely show as running), SearXNG's install
   *and* start phases (`searxng_manager.py`; `app.py`'s autostart thread
   calls the same `start()` and shares its state, so it needed no separate
   entry), the embedding-model download (`embedmodels.py` — already carries
   its own "Tier 1 §6" comment at the call site, so this was fixed in an
   earlier pass and just never got the ROADMAP strikethrough), and extras
   install/uninstall (`extras.py`). The one thread genuinely *not*
   registered — `security.py`'s per-request DNS-reachability probe — is
   correctly excluded: it blocks inside the request that spawned it and
   resolves in milliseconds, not a background job a user would come looking
   for on this screen. `tests/test_tasks.py` and `test_embedding_models.py`
   already assert each kind appears, including the exact "the download is
   running but /tasks doesn't know" regression this item describes.
7. **Claim-specificity in the hallucination net.** `agent.unsupported_claims`
   catches a claim with *no* matching write ("I tagged it" when nothing was)
   but not one that mismatches what happened ("I tagged it as Work" when a
   different tag was applied). Needs real model output to tune against, which
   this sandbox cannot provide — named rather than guessed at.
8. ~~**Two backend perf findings.**~~ **Done (HISTORY.md §44).**
   `_graph_neighbours`'s full-table scan is now pre-filtered with `ilike` per
   tag (same pattern `list_tags`/`_count_notes` already used elsewhere in the
   file) before the exact Python check, cutting it from one full-table fetch
   per BFS node to one narrowed query; `_note_summary`'s per-row
   `entry_dates` call is now `manager.entry_dates_bulk`, one `WHERE entry_id
   IN (...)` for the whole page instead of one `SELECT` per row in
   `list_notes`/`summarize_notes`. Both pinned by query-count regression
   tests in `test_scale_query_counts.py` rather than timing, matching that
   file's existing convention.
9. ~~**A "completed" notification for a background pass the user never
   enabled.**~~ **Done (HISTORY.md §44).** Reported directly and reproduced
   live (not guessed at): `POST /tasks/trigger-autonomous` ran a real
   optimisation pass regardless of the `autonomous_tasks_enabled` master
   toggle — only the scheduled loop checked it before ever calling in; the
   "Run optimization now" button being hidden while the toggle is off is a
   UI convenience, not an authorization check. The route now checks the
   toggle itself before calling `trigger_now`.
10. ~~**Every graph layout except Force shows no connections when the Time
    Filter is moved off "All time".**~~ **Fixed and verified live
    (HISTORY.md §50).** Diagnosed, not guessed: `applyTimeFilter`'s edge
    check read `d.source.created_at`/`d.target.created_at`, which only
    holds a real note timestamp once `d3.forceLink` resolves it — true for
    Force, never true for Tree/Radial/Arc, whose edges include synthetic
    category-heading/root nodes (`layoutHierarchy`'s `graphGroupNode`) with
    no `created_at` at all. `undefined || Date.now()` read every heading as
    "created this instant", which failed any cutoff short of "All time" and
    hid the heading *and* every edge touching it (almost all of them — every
    note's filing edge to its category) the moment the slider moved.
    Reproduced first with Playwright (Tree: 14/14 edges → 0/14 the instant
    the slider left "All time"; Force stayed correct at 2/4), then fixed by
    treating `isGroup` nodes as exempt from the time filter — organising
    furniture, not a dated note — and re-verified the same way (Tree:
    14/14 → 4-ish/8, no longer zero, headings stay visible).
11. ~~**Dragging on empty graph canvas sometimes highlights an unrelated
    note.**~~ **Fixed and verified live (HISTORY.md §50).** Reproduced with
    Playwright before guessing: a drag starting and ending on genuinely
    empty canvas (confirmed via `elementFromPoint`, not assumed) — a pan,
    not a node-drag — left a node lit with `.graph-focus` long after the
    cursor moved on. Cause: panning translates the whole canvas under a
    *stationary* cursor, so a node sliding past mid-pan fires a real
    `mouseenter`, and the matching `mouseleave` doesn't reliably fire before
    the button is released. A first fix (clear hover on the zoom's own
    `start`/`end` events) cut the failure rate but left a race — a
    `mouseenter` mid-gesture could re-set the hover after `start` had
    already cleared it. Fixed properly with a `graphIsPanning` flag that
    mutes hover mouseenter/mouseleave for the whole gesture, not just its
    two ends; 6/6 clean Playwright runs after, versus reproducing the stuck
    highlight on the unpatched code every time.
12. ~~**Clicking a whiteboard card or object to select it silently didn't
    work.**~~ **Fixed and verified live (HISTORY.md §57).** Found while
    live-testing mind-map selection, not reported first: `dragStart`'s
    (and `objDragStart`'s) unconditional `d3.select(this).raise()` on
    every pointerdown — including a plain zero-movement click — reappends
    the card as its parent's last DOM child mid-gesture, which is enough
    to stop the browser synthesizing the following `click` event at all.
    Confirmed by instrumenting the card's own click handler, the
    container's "empty canvas" handler, and a plain sketch's own click
    handler (which selects correctly, and never calls `.raise()` in its
    own "start") side by side. Fixed by moving `.raise()` into the drag
    handler, which — unlike "start" — only runs after real movement.
13. ~~**Two features silently shared the same Ctrl+K shortcut.**~~ **Fixed
    (HISTORY.md §57).** The navigation command palette (`openPalette`) and
    a separately-built "ask the agent anything" quick-command overlay both
    bound the identical global Ctrl+K keydown, independently — the second
    sat later in the DOM and silently ate every click meant for the first.
    Found live while testing a new command-palette entry. Rebound the
    "ask anything" overlay to Ctrl+Shift+K.

### Tier 2 — half-built features, cheap to finish

Each is already paid for; a small amount of work turns a frustrating surface
into a good one.

8. ~~**Skill runs: an auto/manual mode.**~~ **Done (HISTORY.md §45).** Reuses
   `stopped_at`/`start_at` — the same resume machinery a failed or stalled
   step already had — rather than a second mechanism: after every step that
   finishes `done`, `run_skill(..., manual=True)` stops there too, with a new
   `result.paused` flag so the client can tell "waiting for you" from
   "something broke" and render each one differently. A `manual_note`
   (`skill_manual_note` over the wire) is folded straight into the *next*
   step's own instruction, not appended to history, so it reads as part of
   what the model is being asked to do right now rather than something it
   may or may not weigh against everything else in the window. A "Run
   skills step-by-step" checkbox lives in the chat dock's `⚙` settings
   panel; the pause renders as a text box + Continue button, not a failure
   notification. **Not built**: the same pause for a plan run (`opts.plan`)
   — the backend already treats a plan identically to a skill, but the
   existing Resume-from-failure button was already skill-only before this
   session, so extending both to plans is one further, separate change, not
   a gap this feature introduced. **Not verified live** — six new backend
   tests (`test_skills.py`) cover the pause/resume/note-folding behaviour
   through the real streaming endpoint with a fake model, but the checkbox
   and the pause card's text box were not driven in a browser this session.
9. ~~**A reason on every link.**~~ **Done, including a confidence score and
   an editor (HISTORY.md §43).** Optional `reason` column on `entry_links` —
   "a note about uni and gym might still be related if they're both about
   scheduling." Writable by `link_notes` and the manual `/entries/{id}/links`
   endpoint; shown on the graph edge as a native SVG tooltip, in Trace's
   readout (`entry/paths.py`'s `Step.how`), and in `related_notes`' own `how`
   field so the model can reason about *why* two notes relate. When nobody
   gives a reason, `manager.create_link` tries to deduce one from embedding
   similarity and attaches a `reason_confidence` (0–1) alongside it — below
   the threshold, or with no embedding to check, it stays as no reason at
   all rather than a weak guess. Editable and clearable by hand afterwards
   (`PUT /entries/{id}/links/{link_id}/reason`, a ✎/⊘ pair on the note
   card's own link chips), which resets any deduced confidence since a
   person's words aren't a similarity score. Turns the graph from "these are
   connected" into "connected *because*" — which is also what makes Trace
   worth reading. **Extended (HISTORY.md §44):** asked directly — a
   suggestion in the Graph tab's "Notes that look related" panel showed a
   bare percentage with no sense of *why*; `GET /entries/link-suggestions`
   now carries the same `reason` text a link would get if approved (the two
   thresholds are numerically identical, so this is a preview of the real
   outcome, not a separate guess). And: *"none of my notes have a linked
   reason yet — is there an easy way to give them all a reason?"* — there
   wasn't, since deduction only ever ran at the moment a link was first made.
   `POST /entries/links/backfill-reasons` (`manager.backfill_link_reasons`)
   runs it once over every existing reason-less link, behind a button next
   to Suggest links. **Asked again this session: "can there be a way to
   visually see link reasons in the graph?"** — there already is (the SVG
   tooltip on hover, above), but a hover-only affordance is easy to never
   discover. Worth asking directly next session whether that's enough or
   whether a reason needs a more persistent, always-visible presence (an
   edge label, shown at least on hover-highlight or Trace) before building
   either. **Asked for directly, not yet built:** the same
   backfill as an agent-callable tool/skill, so it can run unattended
   (a manual pass, or folded into the autonomous background worker's own
   task list — see item 31) rather than only a button someone has to click.
   Also asked for: **the deduction should weigh temporal words as well as
   embedding similarity** — two notes both mentioning "next Tuesday" or
   written the same day read as related even when their topics don't
   overlap semantically. `_deduce_reason` today is embedding-only
   (`AUTO_REASON_THRESHOLD`); this needs a second signal folded in (or
   compared against) using `entry.timewords`/`EntryDate`, not a wholesale
   replacement of the embedding check — a note from "next Tuesday" and one
   from "last Tuesday" are not related just because they share a weekday.
10. **The sketch pad.** ~~The highlighter at 5% opacity was effectively
    invisible~~ **Fixed (HISTORY.md §46)**: `globalAlpha` was `0.05` — around
    twenty overlapping passes before a stroke showed at all, which is the
    "completely wrong" in the report — now `0.35`, verified live (pixel
    read-back and a screenshot, not just the code). **Checked before
    touching anything, per this file's own rule**: a size control
    (`#sketch-size`) already existed and already reached every tool
    (pen/highlighter/eraser and every shape's stroke width all read
    `sketchPen.size`) — this file's own claim that it was missing was stale.
    ~~A background colour for the canvas~~ **Done (HISTORY.md §46).** A
    colour picker (`#sketch-bg-color-picker`) next to the image-upload
    button, persisted in `localStorage` the same way the whiteboard's own
    board colour is. **The one real trap this hit**: a first pass wired it
    as a CSS `background` on `#sketch-bg-canvas`, which did *nothing* —
    `sketchDrawBackground()` already paints an opaque `fillRect` into the
    canvas's own pixels every time the pad opens or an image loads, and
    those pixels sit in front of (and fully hide) any CSS background on the
    element underneath them. Fixed by making the fill colour itself
    `sketchBgColor` instead of a hardcoded `"#ffffff"` — the actual pixels a
    save composites, verified live by reading the saved-PNG composite's own
    pixel data back, not just the on-screen canvas. ~~Holding Shift while
    drawing a shape constrains it~~ **Fixed for the rect tool** (forces a
    square instead of a rectangle), verified live by reading back the
    drawn pixels' bounding box mid-drag. **Still genuinely open**: a
    selection tool (clicking an existing stroke/shape to move, resize or
    delete it; today's tools only ever draw a new one) — the sketch pad is
    pure-raster (`ImageData` snapshots for undo, no discrete stroke
    objects), so this needs a real architecture change, not a small patch,
    unlike the whiteboard's own discrete-object select (item 11). The
    toolbar redesign comes after it, not before.
11. **The whiteboard, properly.** ~~Images, text boxes, resize (8-handle
    corner+edge), grid (lines/dots/isometric)+snap, per-board background
    image, export (PNG/SVG/PDF), clear-board, a redesigned board picker,
    redo, single-item select, undo/redo, per-tool cursors, an eraser,
    keyboard shortcuts, draggable toolbar panels, highlighter+arrow tools,
    a board-colour reset, touch input (pointer events), sketch move+resize,
    copy/paste, multi-select (shift-click/marquee/bulk move/bulk delete),
    grid-snap on every item kind (not just cards), shift-to-constrain a
    drawn shape, Alt to bypass snap for one drag, two more shape types
    (triangle/diamond), arrowhead styles, precise drop placement, a real
    "glitchy and slow to update" perf bug (a full board re-render on every
    card-drag frame), a properties panel (colour/width/arrowhead/fill/
    border/font-size) for the current single selection, card resize
    (8-handle, same as images/text boxes), object grouping (Ctrl+G/
    Ctrl+Shift+G, a persisted `group_id`, click-one-selects-the-whole-group),
    undo/redo extended to cover move *and* resize (not just create/delete),
    arrow-key nudge (grid-step when snap is on, 1px/10px+Shift otherwise),
    alignment tools (left/h-centre/right/top/v-centre/bottom) and distribute
    (horizontal/vertical) for a multi-selection, and rotation (a drag
    handle above the item, Shift snaps to 15°, for cards and objects — see
    "still open" below for why sketches don't have it yet)~~ **all done,
    verified live — see HISTORY.md §53–§55 for the full list and how each
    was verified.**

    **Still genuinely open, ranked by what's actually left.**
    - ~~**Real anchor/connection points**~~ **Done, verified live (HISTORY.md
      §56).** Eight fixed points (corners + edge midpoints, as `{x,y}`
      0–1 fractions of the shape's own bounding box) plus a floating case
      (no anchor persisted — resolves every render via a rectangle/ray
      intersection toward whatever the other end actually is), matching how
      draw.io itself splits the two. `sourceAnchor`/`targetAnchor` live as
      two more keys in the link sketch's existing `data` blob, exactly as
      scoped — no migration. All three call sites named above
      (`dragStart`/`dragging`/`dragEndNode`, `sketchUpdate.each`,
      `wbUpdateLinkedSketches`) now share `wbLinkEndpoints`/`wbLinkPathD`
      rather than three copies of the same math. A real, previously-unknown
      bug was found and fixed along the way (see the whiteboard-fixes entry
      below) — every resize/rotate handle was `opacity: 0` but not
      `pointer-events: none`, so an invisible handle intercepted drags at
      *every* card/object corner for *any* tool, not just while selected;
      this is very likely why a link-from-corner drag felt unreliable even
      before anchors existed.
    - ~~**A mind-mapping mode**~~ **Done — see item 25's own entry (Tier 3)
      and HISTORY.md §57.**
    - ~~**AI + whiteboard, three pieces**~~ **Done, verified (HISTORY.md
      §57).** `read_whiteboard` (board contents: cards, text boxes, image
      count, links), `search_whiteboard` (keyword scan across every board —
      a real embedding index was scoped short as a bigger lift than this
      pass, see the same section), `add_whiteboard_card`/`add_whiteboard_link`
      (the write side — place a note, connect two cards, reusing the
      existing create endpoints). All four registered in
      `src/memorymap/ai/tools.py`, cued via a `TOOL_GROUPS` entry
      (whiteboard/board/canvas/diagram/mind map/sketch/draw.io/flowchart)
      rather than `TOOLS_GUIDE` prose — the fixed prompt prose had 2
      characters of headroom left under `PROSE_BUDGET_CHARS`
      (`test_prompt_budget.py`), so this was a deliberate scoping choice,
      not a miss. 9 new tests in `tests/test_ai_whiteboard_tools.py`,
      including that `add_whiteboard_card` goes through `_require_note`
      (refuses a private note) and is idempotent on `(note_id, board_id)`.
      **Not verified against a live model** — this sandbox's standing
      caveat about provider behaviour applies here too; the tool logic is
      real-database-tested, not watched being chosen mid-conversation.
    - **Sketch rotation.** Cards and objects rotate (§55); a sketch does
      not — its "shape" *is* its path data, and rotating a path correctly
      (including the `a` command's own elliptical-arc flags, which flip
      under rotation in a way `wbTransformPathD`'s existing translate/scale
      math doesn't need to handle) is real trig this session didn't spend
      the time on. A sketch can still be deleted and redrawn at an angle.
    - **Image cropping.** Asked about directly; not scoped or built —
      needs a decision on the interaction (a crop rectangle over the full
      image vs. a separate "adjust" mode) before building.
    - **Uploaded whiteboard images showing in the Library as files, and
      orphaned `/media/` garbage collection.** See item 20a (Tier 3) — asked
      for directly, promoted from HANDOVER-only prose to here this session;
      still not scoped or built. **Backend half done (HISTORY.md §57)**:
      `GET /whiteboard/images` lists every image across every board. **No
      frontend consumer yet** — see the two bullets below.
    - ~~**Smart alignment guides while dragging, colour-coded, with
      equal-spacing detection**~~ **Done, verified live (HISTORY.md §58).**
      Edge/centre snap plus equal-spacing (nearest neighbour each side,
      O(n) per drag frame), Alt bypasses all of it, three independently
      recoloured guide kinds (edge/centre/spacing) via pickers in the
      shape-menu dropdown, persisted to `localStorage`.
    - ~~**Rectangle select and lasso, export selection**~~ **Done, verified
      live (HISTORY.md §58).** A freeform lasso (ray-cast, centre-point
      test) joins the existing marquee, both grouped into their own toolbar
      dropdown (`#wb-select-picker`, same pattern as the shape dropdown).
      Export gained a "Just the selection" option (PNG/SVG/PDF) that
      filters to the selected item(s) and crops to their bounds, not just
      the whole board.
    - **Renaming a board, and a Library gallery of every board/mind-map and
      every uploaded image.** Asked for directly this session, not built —
      out of budget, not out of scope. A board's title is its underlying
      note's first `# heading` line; there is no `PUT /whiteboard/boards`
      yet. `GET /whiteboard/boards` and `GET /whiteboard/images` (both
      already built, §57) have no frontend gallery consumer — today's only
      way to see "which boards exist" is the whiteboard's own board-switcher
      dropdown, not a Library-tab view. See BACKLOG.md.
    - **A structured, small-model-friendly "generate a diagram from my
      notes" tool.** Asked about directly this session: the AI can already
      place cards and link them (`add_whiteboard_card`/`add_whiteboard_link`,
      §57), but `x`/`y` are free-form numbers the model must invent itself
      across many chained calls — the exact bookkeeping small (2–8B)
      tool-calling models get wrong. The auto-layout math already exists
      (`wbArrangeMindMap`, tree/radial) but is client-side JS behind
      keyboard shortcuts, not AI-callable. Needs a bulk tool that takes a
      structure (parent/child pairs) and does placement server-side in one
      call. See BACKLOG.md.
    - ~~**A whiteboard backend/perf pass**~~ **Partly done (HISTORY.md
      §57).** Asked for directly ("no heavy algorithms, everything
      efficient"): the backend routes themselves (`get_whiteboard_state`,
      `list_boards`) were audited and are already flat, aggregate-query
      shaped — no N+1 found there. The one real issue found was
      client-side: `allEntries.find(...)` inside each card's per-render
      content callback (and again in the SVG-export loop) was O(cards ×
      notebook size) on every single render; replaced with a `Map` built
      once per call. **Not done**: a real profile against a large,
      many-hundred-item board (nothing this session was measured against
      one) — the fixes above are reasoned from reading the code's own
      complexity, not from a before/after timing.
    - **A full line/arrow end-cap system** (circle/square/multi-line ends,
      independently per end). Asked for directly (§56); the Line and Arrow
      tools now *share* one end-style control (extended from Arrow-only),
      which is as far as this got — no new marker shapes beyond the
      existing arrowhead.
12. ~~**Links that are links.**~~ **Already done — corrected, not rebuilt
    (HISTORY.md §47).** Checked before touching anything, per this file's
    own rule: every place a link chip renders (a note card's own links, the
    "Similar" panel, a reminder's attached note) already calls `flashEntry`
    on click, which switches to Notes → Browse, clears any active filter,
    and scrolls the target into view with a highlight — the same function
    search results and wiki-style `[[links]]` already use. This file's own
    claim that they were "decoration" was stale, likely inherited from
    before that wiring existed; nothing here needed building.
13. ~~**"Take me to the thing the agent just changed," the UI half.**~~
    **All four kinds now done (HISTORY.md §47, §51).** The document half
    was done in §47: `agent._change_document_id` has resolved a real
    document id on every write since §21, and `changeRow` — the one place
    both the chat's "what changed" list and the autonomous-pass review
    panel render a change — reads it, reusing `openDocumentFromNote`.
    **Reminders and categories, done this session**: `agent.py` gained
    `_change_reminder_id` (`set_reminder`/`complete_reminder`, an int id —
    the same shape as `_change_note_id`) and `_change_category_name`
    (`create_category`/`rename_category`/`merge_categories`, a *name*, not
    an id — every category tool already works in names, so this names the
    field that carries one rather than inventing an id nothing else uses;
    `delete_category` is destructive like `delete_document` and never
    reaches this code path). `changeRow` grew two more View buttons:
    `flashReminder(id)` switches to the Reminders tab, forces the filter to
    "all" (the change that brought you here — completing a reminder — is
    exactly the case where the default "open" filter would hide it), and
    scroll-flashes the item the same way `flashEntry` does for notes;
    `flashCategory(name)` reuses the sidebar's own category filter
    (`activeCategory`) rather than building a second filtering mechanism.
    Verified live end to end: created a real reminder and a real note in a
    fresh category via the API, called both functions directly, confirmed
    the tab switched, the item was found in the DOM, and (after waiting the
    two animation frames the flash needs) the `.flash` class was actually
    applied.
14. **Timeline line view, and text placement in grid view.** The grid view's
    text-placement half is **done**: `.timeline-dot`'s `line-clamp: 3` was
    unprefixed under a `-webkit-box` display, a combination this Chromium
    doesn't connect — `-webkit-line-clamp` computed to `none`, so nothing
    was actually clamping and a long preview just hard-cropped mid-word
    with no ellipsis. Fixed (the `-webkit-` property, kept alongside the
    standard one), plus the backend's own `preview` field, which was a bare
    `text[:120]` slice with no "…" on truncation even before the CSS ever
    saw it. **Re-reported after that fix, still cut off** — four full lines
    with no ellipsis this time, not reproduced in this sandbox's Chromium
    (a live check found nothing overflowing at all: `scrollHeight ===
    clientHeight`). A defensive `max-height` independent of
    `-webkit-line-clamp` support was added as a safety net (HISTORY.md
    §49-adjacent, same session as §48's Arc investigation) but this is
    hardening, not a diagnosis — if it's still cut off after this, the next
    session needs the actual browser/OS this is happening in, since two
    separate attempts from this sandbox's Chromium haven't reproduced it.
    ~~**Also reported: the line-view's own note popup shows no markdown
    rendering and no sketch/image attachment preview.**~~ **Fixed and
    verified live (HISTORY.md §51).** `openTimelinePopup` set the content
    with `.textContent`, showing literal `**`/`#` characters, and never
    touched `#timeline-popup-media` at all — the div existed in the HTML
    (reusing the graph popup's own CSS class) but nothing ever populated
    it, a "feature that never ran once". Rewired to reuse `renderMarkdown`
    (the note card's own renderer) and a `renderTimelinePopupMedia`
    mirroring `renderGraphPopupMedia` almost exactly — same
    `attachmentObjectUrl`/`openLightbox` calls, so a click still opens the
    full-size lightbox. The popup's position, computed once from its
    un-loaded size, is now recomputed after an image's thumbnail finishes
    loading too (`placeTimelinePopup`, the same fix the graph popup already
    had for the same reason). Verified live end to end against a real
    server: a note with `# Heading` and `**bold**` rendered as real
    `<h3>`/`<strong>` elements, no literal asterisks; an uploaded PNG
    attachment showed as an `<img>` with a real `blob:` src, not just
    reasoned from the code. **Still open:** the line view itself —
    reported as needing a real visual pass ("very professional and ready
    for public use"), and grid view could still take general UX polish
    beyond the text-cropping fix (not scoped further — say what
    specifically, next time it's reported).
15. ~~**Arc view: labels clashing with the connection arcs**~~ **Fixed and
    verified live with a screenshot (HISTORY.md §52).** The earlier
    "labels behind nodes" framing was investigated live (§48) and never
    reproduced — DOM order already put labels on top, z-order was never
    the problem. Re-reported with an actual screenshot, and the real bug
    was *position*, not z-order: the label's tilt (`rotate(-40, ...)`)
    pointed labels *up*, into exactly the strip above the baseline
    `arcPath`'s connection arcs curve through, so text and arcs fought for
    the same space. Measured live before fixing: 9 of 10 labels' bounding
    boxes overlapped a `.graph-edge`. Flipped the tilt to `rotate(40,
    ...)` — down instead of up — moving every label into the arcs' empty
    side while keeping the same anti-collision shape (still angled,
    reading outward). Confirmed two ways: a fitted screenshot showing
    labels clearly below the row with the arcs undisturbed above it, and a
    geometry check (`labelMostlyBelowNode`) true for every label, false
    before the fix. The refinement pass's other piece — the trace overlay
    drawing a straight chord through the row instead of its own taller
    arc — was already **done** in an earlier session.

    **Re-reported once more, with a screenshot, after the fix above**:
    labels still read as attached to the wrong node — not z-order or
    tilt-direction this time, but density. At the old spacing (`ARC_STEP`
    46px, up to 20-character labels, `rotate(40, ...)`), a 20-char label's
    horizontal reach was `20 × ~6.5px × cos(40°) ≈ 100px` — two-plus
    node-steps — so a label's own tail routinely landed under a *later*
    node, exactly the "category name is on the note, the note's text
    starts on the category node" symptom described. Fixed by widening
    `ARC_STEP` to 58px, shortening `ARC_LABEL_LIMIT` to 12 characters, and
    steepening the tilt to `rotate(58, ...)` (more vertical, less
    horizontal reach per character) — **not re-verified with a fresh
    screenshot this session (token budget)**, so treat this as reasoned
    from the same geometry that diagnosed it, not re-measured live; worth a
    screenshot check first thing next session. **Also asked for directly**:
    category labels only differed by weight/size before, not colour —
    `.graph-label-group` now also gets `fill: var(--accent)` in both light
    and dark mode, so a category reads as a different *kind* of label, not
    just a bigger note preview.
16. **Documents in the graph.** They are notes' equal everywhere else.
16a. ~~**The document editor's sidebar, reported directly with
    screenshots.**~~ **Checked and fixed (HISTORY.md §51).** The
    sticky/floating half was already done — `#doc-sidebar` already has
    `position: sticky` — stale by the time it was reported, corrected
    rather than rebuilt. The Outline-collapses bug was real and reproduced
    live before touching anything: 10 headings' outline went from 258px
    tall to exactly **0px** the instant the storage disclosure opened.
    Cause: `.doc-sidebar > details` was `flex: 0 0 auto` — flex-shrink
    *zero*, meaning it was **exempt** from shrinking — while the outline
    sitting above it had no minimum height at all, so the entire squeeze
    landed on the one sibling that could give and had nothing to give.
    That's backwards from what the block's own comment already said the
    intent was ("the help disclosure gives up its space first"). Fixed by
    giving the outline a real floor (`min-height: 4rem` — enough for a few
    entries even under pressure) and actually making the disclosure
    shrinkable with its own internal scroll, so it's now the one that
    yields. Re-measured live after the fix: outline settles at ~100px
    (visible and scrollable) instead of 0, disclosure scrolls its own
    overflow instead of forcing the outline out.
16b. ~~**The document editor's bold/italic don't toggle off.**~~ **Fixed
    and verified live (HISTORY.md §51).** `wrapDocSelection` (`app.js`,
    shared by the toolbar buttons and Ctrl+B/Ctrl+I) only ever wrapped —
    applying Bold to an already-bold selection stacked a second `**` pair
    instead of removing the first. Now checks both shapes a selection can
    be in before wrapping: markers just outside it (`**|bold|**`) or
    markers included inside it (`|**bold**|`) — either way, a second press
    strips them instead of stacking. Verified live through the real
    `#doc-content` textarea and `wrapDocSelection` itself, not a unit test
    (this file has no JS test runner): `hello world` → Bold → `**hello**
    world` → Bold again → back to `hello world`, byte for byte; the
    whole-span-selected and italic cases both round-tripped the same way.
    **Still open**: "a bunch of missing features... could be improved a lot
    more" was named but not itemised — needs a concrete list from the user
    before a session can act on more than the toggle bug.
16c. ~~**Images and files still can't be copied, pasted, or dragged into
    notes.**~~ **Two of three already worked — checked live before
    building anything (HISTORY.md §51).** A global `document`-level
    `paste`/`dragover`/`drop` handler (`app.js`, matches *any* `<textarea>`
    generically, not a note-specific one) already uploads to
    `/media/upload` and inserts markdown — and `#entry-content` (Capture)
    is a `<textarea>`, so it was already covered without anyone having
    wired it specifically. Verified live, not assumed: dispatched a real
    `paste` and a real `drop` event carrying a PNG file at `#entry-content`
    on a running server, both produced `![name](/media/…)` in the
    textarea. **The third path — a file-picker button — was genuinely
    missing and is now built**: `📎 Attach` next to Capture's other
    buttons, wired to the same `handleFileUpload` the paste/drop paths
    already use, so all three insert identically. Verified live with a
    real file chooser (Playwright's `filechooser` event, a real PNG on
    disk, not a synthetic DataTransfer): picking it produced the same
    `![name](/media/…)` markdown. One trap this hit and is worth recording:
    Capture lives in the Notes tab's `capture` sub-section — `switchTab
    ("notes")` alone leaves it `display: none` and the button unclickable;
    needs `showNotesSection("capture")` too, the same trap CLAUDE.md's own
    traps list already names for a different Notes-tab element.
16d. ~~**An optional title field in Capture, and everywhere a note can be
    created.**~~ **Decided and built (HISTORY.md §52).** Confirmed
    directly: write the leading `# {title}` heading line into `content` on
    save — the exact shape `manager.extract_title` already reads — rather
    than a second stored field. `#entry-title` in Capture and
    `#graph-new-note-title` in the graph's own "+ New note" popup (the
    two dedicated note-creation forms; voice dictation, templates, and
    quick actions all funnel into Capture's own textarea already) share
    one `withTitle(content, title)` helper, so a title typed in the box
    and one typed as the note's own first line produce byte-identical
    content. Also confirmed working, unprompted: a note started with a
    single `#` (not just `##`–`######`) was already read as a title by
    `extract_title` before this change — nothing needed building there.
    Verified live end to end: a title typed in Capture round-tripped to
    `# My Explicit Title\n\n...` in the saved note and the field cleared
    after save; a bare `#` line typed directly into the body was read back
    with the same computed title; the graph popup's own field produced
    identical behaviour.
16e. **Decision made, not yet built**: both a native-OS picker and a
    built-in in-app palette, same pattern as 16f — a toggle in Settings →
    Appearance picks which one opens. Not scoped further (which inputs get
    the trigger control, where the built-in palette's emoji set/data comes
    from) — do that scoping next to whatever picks up 16f, since both share
    the same Appearance-tab toggle mechanism and are cheaper built together.
16f. **Decision made, not yet built**: an SVG icon set *and* monochrome
    emoji, both available, with a toggle in Settings → Appearance to switch
    between them (not a single fixed replacement). Needs: (1) the actual
    count/categorisation pass (decorative vs. load-bearing) this item
    already called for, (2) an icon set picked and the SVGs wired in
    alongside the existing emoji rather than replacing them outright, (3)
    the CSS monochrome-filter path for the emoji option, (4) the Appearance
    toggle and the app-wide switch it drives. Sizeable — a full session's
    worth, not a quick pass.
    Original ask, kept for context: **a full sweep of emoji usage across
    the app**:
    *"I feel the application is very heavy with emojis, it feels too much
    like AI slop... make sure they are only used professionally and with
    intention, otherwise professional icons are the better way to go."*
    Also considering colourless/monochrome emoji as a middle ground, but
    undecided. This is a design decision affecting most of `index.html` and
    a large fraction of `app.js` (tab icons, button labels, toast prefixes,
    status chips) — not a quick pass. Needs, in order: (1) an actual count
    and categorisation (decorative vs. load-bearing — some emoji are the
    only differentiator between otherwise-identical icons, e.g. the
    notification kind icons), (2) a decision on the replacement (SVG icon
    set vs. monochrome emoji vs. selective removal), (3) then a build pass.
    Doing the build pass before the decision risks redoing the same ground
    twice, which this project's own history (HISTORY.md's repeated "checked
    before building" theme) is precisely the failure mode it keeps warning
    about.
17. ~~**Battery-saver: an indicator and an honest description.**~~ **Done —
    both halves, one already there.** Checked before writing this — the
    indicator already exists (`#power-saver-indicator`, a
    status-bar chip shown/hidden from `battery_efficient_mode`) and is wired
    on both load and toggle, so that half was already done and this file
    hadn't been told. The "honest" half had a real bug, now **fixed**: the
    autonomous loop only re-read `battery_efficient_mode` (and the on/off
    toggle, and the interval) once per scheduled tick, sleeping up to the
    full interval — six hours by default — between reads. Turning battery
    mode off, or the scheduler back on, did nothing until that sleep ran
    out, which is what "background tasks skip things thinking battery mode
    is on" and "finishing a task disables automatic tasks" actually were.
    `autonomous.wake()` now interrupts the sleep; `PUT /preferences` calls
    it whenever a preference the loop reads changes.
18. ~~**The full-screen graph's suggested-links list ran off the bottom
    without scrolling.**~~ **Fixed and verified live (HISTORY.md §51).**
    `#graph-card`'s own `overflow: hidden` (added in an earlier session for
    a different bug — see its own comment) still applied in full screen,
    since an ID beats a class on specificity regardless of source order —
    a plain `.graph-fullscreen { overflow-y: auto }` would have lost that
    fight silently. Measured live before fixing: toolbar + open Options +
    15 suggestions was 1061px of content in a 498px fullscreen window, and
    `overflow: hidden` meant the last several suggestions weren't merely
    unscrolled — they were unreachable, full stop. Fixed with
    `#graph-card.graph-fullscreen { overflow-y: auto }` (an id *and* a
    class, which wins outright), and confirmed live that the last
    suggestion goes from off-screen-and-permanent to reachable by scrolling
    the fullscreen view. **"The sketch/image toggles" part of this item
    couldn't be matched to anything in the current Options panel** (it has
    Similarity/Hide-unlinked/Labels, no sketch or image controls) — likely
    a stale or mis-transcribed note from whatever session first triaged
    this; left unaddressed rather than guessed at, and worth asking
    directly what it referred to if it's still wanted.
19. **First-run onboarding, the rest.** Reachability diagnostics are built;
    still open: offering to pull a model, a data-dir writability check,
    seeded example notes so the graph, timeline and dashboard have something
    to show before the first note exists — named by the project's own outside
    review as the highest-leverage version of onboarding. Also asked for
    directly: **a guided application tour** — a click-through walkthrough of
    the tabs and their core actions, distinct from the reachability/seeded-
    notes work above (that's about the notebook having something to show;
    this is about someone new knowing where to look). `#onboarding-overlay`
    already exists as a surface (see CLAUDE.md's login recipe); worth
    checking what it currently does before scoping a tour on top of it.
19a. ~~**The graph toolbar's controls read as one undifferentiated strip.**~~
    **Done (HISTORY.md §44).** Reported directly: `.graph-time-label` ("All
    time") is a plain read-out of the Time Filter slider, styled identically
    to the *interactive* toggle labels (Similarity/Hide unlinked/Labels)
    sitting right after it with the same flex gap, so nothing marked where
    one group ended and the next began. The three toggles are now grouped
    under one `.graph-toggle-group` span with a divider drawn before each
    group (`.graph-physics`/`.graph-temporal`/`.graph-toggle-group`), the
    same `+`-selector convention `.chat-tool-group` already used, so the row
    reads as Physics | Time | Toggles rather than one strip. **Not verified
    live** — CSS-only, reasoned from the DOM/selectors and the existing
    `.chat-tool-group` precedent, not screenshotted in this session.
19b. **A mute-notifications option, asked for directly**, alongside making
    the toast/notification split clearer: "there can be an option to mute
    notifications except for reminders." Built as
    `notifications_muted_except_reminders` (Settings → Preferences →
    Notifications): `toast()` takes an `exempt` flag (set on the three
    reminder-alert call sites) and returns early for everything else when
    muted; `recordNotification` does the same for the persistent panel,
    keyed off `kind !== "reminder"`. Errors are never muted — silencing a
    real failure would hide the thing muting is least meant to hide. **Not
    built**: mirroring ordinary toasts into the notifications panel (the
    other half of the same message) — every `toast()` call site would need
    a `kind` to avoid flooding the panel with routine "Saved."/"Linked."
    noise, which needs a first pass at which toasts actually belong there
    before it's buildable.

    **Extended (HISTORY.md §49), asked for directly**: a mute toggle inside
    the notifications panel itself (`#notif-mute-toggle`, reads "🔕 Mute" /
    "🔔 Unmute" and `aria-pressed`), not only three screens away in Settings
    — and the bell icon (`#notif-btn`) itself now shows 🔕 instead of 🔔
    whenever muted, so the state is visible without opening anything. Built
    and verified live end to end, which is what caught item 4a's real bug —
    the toggle correctly PUT the preference and correctly re-rendered from
    the response, and *still* showed unmuted, because `GET /preferences`
    (which the PUT response is built from) never echoed the new key back.
    Fixed there, not patched around here.

### Open questions raised this session, not built

- **Should Capture have its own title field**, separate from the leading-
  heading convention §43 already shipped (`manager.extract_title` reads a
  `#`–`######` first line, computed on read rather than stored)? Asked
  directly, including "if the user begins a note with `#` maybe it moves to
  the optional title input" — genuinely a design question in the same shape
  §43 was worked through as, not a bug: a second, separate title field would
  either duplicate the heading-line mechanism (keeping both in sync) or
  replace it (undoing the "read off the note, not enforced" decision §43's
  writeup already recorded). Needs a decision before either is built, not a
  guess.
- **"The dashboard isn't detecting my name."** Traced end to end
  (`renderNameNudge`/`withDisplayName` read `prefsCache.display_name`, and
  `savePrefs` updates both the cache and re-renders the greeting on save) and
  the code reads correct — the nudge is *designed* to show exactly when
  `display_name` is empty, so a fresh profile with no name saved yet showing
  "👋 Add your name" is very likely the feature working as built, not a bug.
  Could not reproduce a case where a name was actually saved and still not
  shown; if it recurs, check `GET /preferences` directly for whether
  `display_name` actually persisted, rather than assuming the render path.
- **The Timeline grid's "text cut off with no ellipsis" report** (§38a item
  2 was believed fixed) was re-investigated live: seeded notes up to 122
  characters at the grid's actual 13rem column width and read
  `getComputedStyle` on every `.timeline-dot`. Two things came out of it,
  neither a confirmed fix: `-webkit-box`'s **computed** `display` resolves to
  `flow-root` in this sandbox's Chromium, not `-webkit-box` — the property
  the existing code comment says is "what this display mode actually reads"
  isn't actually the mechanism in effect here, though clamping still worked
  correctly in every case tested (`scrollHeight === clientHeight`, nothing
  overflowing). Could not reproduce actual clipped, non-ellipsised text with
  any input tried. Worth re-checking with the user's exact note content and
  browser before guessing at a CSS change — this project's own standing rule
  is to reproduce before theorising, and this one didn't reproduce.

### Tier 3 — new capability

Worth doing, and worth doing after the above.

20. **Files and images on notes, and standalone in the Library.** The plumbing
    exists (`/media`, attachments); the Library surface and drag-to-attach do
    not.
20a. **A Library "Media/Images" gallery tab**, and **garbage-collecting
    orphaned `/media/` files.** Named directly (HANDOVER.md §53) and never
    promoted into this file before now — the exact failure mode this
    section's own rule exists to catch. Two distinct pieces: a gallery
    surface (part of item 20 above, a Library view over everything
    `/media/upload` has ever produced) and a real correctness gap — an
    image pasted or dropped into a *note* (unlike a whiteboard image
    object, which has its own `WhiteboardObject` row) has no DB row
    tracking it at all, so purging the note that referenced it leaves the
    file on disk forever. Needs a decision first: track uploads in a real
    table (enables both the gallery and the cleanup) vs. a directory scan
    reconciled against every note's own markdown at cleanup time.
20b. **An "Agent Activity" background-task popup cleanup pass.** Named
    directly (HANDOVER.md §53), not scoped further — a stray toast from it
    has intermittently overlapped other UI (HISTORY.md §46's Save button,
    this file's own live-verification notes). Needs a concrete list of
    what's wrong with it before a session can act on more than "it exists
    and sometimes overlaps something."
21. **A persona on the welcome messages.** Small, and it makes the app feel
    like one thing rather than a chat bolted to a notebook.
22. **Meeting recordings as first-class objects**: pause/resume, replay, save
    as a voice note, transcribe in the background. Blocked on Tier 1 item 1.
23. **Notification expansion**: reminders, and opt-in AI nudges from the
    utility model. Blocked on Tier 1 item 5 — decide what they *are* first.
24. **Graph layouts beyond Arc** — mind map, treemap/sunburst, adjacency
    matrix. Each is a materially different rendering approach, not a fourth
    case the existing `layoutHierarchy` machinery covers free. The decorative
    half (skins, minimap, PNG export) is the smaller contained piece if a
    session wants a quicker win. Asked for by name as "an Obsidian-style
    knowledge graph": Obsidian's is a force layout, which this app already
    has — the gap reported is closer to *interaction* (smooth pan/zoom feel,
    node-drag responsiveness, a cleaner minimal aesthetic at rest) than a
    new layout algorithm. Worth reproducing what specifically feels
    different — screenshot the two side by side — before assuming it's this
    item rather than a tuning pass on the existing force simulation.
25. ~~**Mind-mapping — decided: a whiteboard mode, not a third tab.**~~
    **Done, verified live (HISTORY.md §57).** Both additions built exactly as
    scoped: "Arrange as mind map" (Tree or Radial, in the properties panel
    for a linked card) reuses the Graph tab's own `d3.hierarchy`/`d3.tree`
    approach against the whiteboard's node/link data via a BFS spanning
    tree, not a second layout engine; Tab (linked child, next open radial
    slot) and Enter (sibling) both create a real note+card+link. Verified
    live: a 4-card hub-and-spoke arranged radially put every child at
    exactly the configured ring distance from the root; Tab/Enter both
    produced real, correctly-parented cards.
26. **Widgets: a picker**, and more of them. Customisable sidebars, and note
    view options in the Notes tab. Asked for directly as "a widget management
    hub popup on the dashboard, like a widget marketplace" — the foundation
    is already substantial and worth knowing about before rebuilding it:
    `DASH_WIDGETS` in app.js already registers 17 widgets, `dashboard_layout`
    (order/hidden/wide) is a real preference, and Edit layout mode already
    supports add/remove/reorder/wide-toggle inline on the dashboard. What's
    actually missing is a *dedicated surface* — a button opening a proper
    modal/picker rather than an inline edit mode — and more widgets to fill
    it. A UI-surface change on an existing data model, not new plumbing.
27. **llama.cpp, actually wired in.** A new `ai/provider.py` entry alongside
    Ollama/OpenAI-compatible, a GGUF file picker (files on disk, not a
    registry to pull from), and `core/extras.py`'s `unavailable` string
    removed once it is real. Asked about directly and deferred, not forgotten.
28. **§20's async-httpx refactor.** Deferred so there was always a known-good
    streaming path to bisect against; that reason has expired, and the cost
    grows as more providers touch the sync path.
29. **Better-looking theme previews** in Appearance.
30. **Standing backlog, the rest** — [roadmap/BACKLOG.md](roadmap/BACKLOG.md)
    (note-list keyboard nav, a per-chat token meter, an eval harness,
    multi-category notes, desktop packaging, MCP support). None is blocked on
    anything above.
31. **Expand the autonomous background agent's capabilities.** Asked for
    directly, without a specific gap named — today it does three things
    (`_enabled_tasks` in `ai/autonomous.py`): tag untagged notes, link
    conceptually related ones, flag duplicates. Candidates worth scoping
    before picking one: acting on stale/orphaned notes (nothing currently
    reviews a note nobody has touched in months), running the digest or
    on-this-day surfacing proactively rather than only on request, or
    letting a saved skill run on the same schedule instead of only the three
    fixed tasks. Needs a real "which of these, and why" before building —
    "expand the capabilities" alone isn't a spec.
32. **Keyword search has no IDF weighting and can't use an index.**
    `keyword_search`'s `Entry.content.ilike(f"%{term}%")` (`search_manager.py`)
    is a full-column substring scan with a leading wildcard, so no SQL index
    can serve it, and `_keyword_score`'s hand-rolled weights (phrase/tag/
    opening-position) treat a rare, distinctive word the same as a common
    one — the wrong direction as the notebook grows. Found reading a sibling
    project's stdlib BM25 index against this file directly, not assumed
    (ANALYSIS.md §59). SQLite's own FTS5 virtual table plus its built-in
    `bm25()` ranking function is the fix that fits — already in SQLite, no
    new dependency — not a ported implementation. Needs a shadow FTS5 table
    kept in sync with `entries` (additive, per this project's own migration
    convention) and `_rank`'s fusion weights re-tuned once keyword scores are
    on a different scale than today's ad-hoc integer score.
33. **`graph_expansion` is hard-capped at one hop, on purpose** —
    `GRAPH_EXPANSION_SEEDS`/`GRAPH_EXPANSION_LIMIT` (`search_manager.py`)
    exist so a question two links away from what matched is reachable only
    if the agent thinks to walk there itself; a direct search answer never
    sees it. Surfaced weighing a sibling project's multi-hop, chain-of-thought
    graph retrieval against this file's own already-stated principle
    (ANALYSIS.md §59) — the same reasoning that ruled out Leiden clustering
    ("an answer the user cannot verify by clicking two notes is one they
    cannot trust") argues against an unbounded walk here too, so this is not
    "just add hops." The version worth building is bounded and still
    verifiable: an opt-in second hop, still carrying the same link `reason`/
    Trace provenance the first hop already has, shown as a visibly weaker
    tier in the answer panel rather than merged into the main matches. Needs
    a decision — automatic (a slightly larger `GRAPH_EXPANSION_LIMIT`) or a
    user-visible "search deeper" action — before building either.
34. **No entity/concept layer above notes — only note-to-note links.** Every
    edge in the graph today connects two whole notes; there is no node for
    "this person" or "this project" that exists independent of any one note
    mentioning them, so a name mentioned in passing across a dozen notes is a
    dozen separate matches, not one thing with a dozen mentions. The one
    genuine capability gap a sibling project's LLM-driven entity extraction
    has that this app doesn't (ANALYSIS.md §59), and the piece most directly
    in the way of finding things by following concepts through the graph.
    Scope before building, deliberately smaller than the sibling project's
    full ontology-grounded version: a lightweight local-LLM pass (the janitor
    already runs one per note) pulling a short entity list per note into a
    table, entity→note membership as the only edge kind at first (no
    entity-to-entity graph yet — a second, harder step), and a way to see one
    in the existing D3 graph — a differently-shaped node or a filter/lens on
    the current view, not a second graph engine.
35. **No vision-capable image understanding.** Confirmed by grep, not
    assumed: `ollama_client.py` already reads a model's `vision` capability
    alongside `tools`/`thinking` from the same `/api/show` call §6 built, but
    nothing consumes it — no code path sends an attached image to a vision
    model. Asked for directly, including how it should be configured:
    auto-detected the same way `tools`/`thinking` already are, with a manual
    override in Settings → Models for OpenAI-compatible backends that don't
    self-report capabilities. Wire into the existing image path (paste/drop/
    attach → `/media/upload`), and run it *alongside*, not instead of, the
    OCR idea already scoped in BACKLOG.md §4 item 1 — the two answer
    different questions and are both cheap once the pipeline exists: local
    OCR (`pytesseract`, no torch, always available) extracts literal text for
    the existing keyword index ("what did that whiteboard photo say"), a
    vision model's description (only when one is configured) covers content
    OCR can't read at all ("what's in that photo"). Needs a decision on
    where the description is stored (a note field vs. a side table) and
    whether the agent narrates "generated from an image" the way whiteboard
    AI actions already disclose their own source.
36. **Q&A answers cite which notes matched, not which claim inside the
    answer's prose came from which note.** `match_info` (search results'
    per-row "why this matched" badge) already covers "which notes were
    retrieved"; `unsupported_claims` (Tier 1 item 7) already covers the
    agent's own narrated actions; link `reason`/`reason_confidence` (Tier 2
    item 9) already covers grounding a connection between two notes. None of
    the three covers a sentence inside a direct Q&A answer. Narrower than a
    full claim-ledger (ANALYSIS.md §59) precisely because those three already
    exist: a lightweight per-sentence "which retrieved note backs this" pass
    over the librarian's own answer, surfaced the same understated way
    `match_info` already is — a badge, not an interruption — and scoped to
    the direct Q&A path only, not the full agentic chat, where
    `unsupported_claims` already does the related job.

### Tier 4 — deferred, with the reason

Not a dump: each says why it is not Tier 3.

- **`app.js` module split** (~20.7k lines) and the same for `style.css`. Worth
  doing and worth doing *deliberately* — a mechanical split makes review
  harder for a session and gains nothing on its own. There is no longer a
  natural ride-along feature to split it against, so it needs a scoping
  decision (which module first, how to keep it reviewable) before a session
  starts, not a default pull. The `tests-e2e/` Playwright smoke suite is the
  safety net when someone does.
- **A second React frontend.** A second implementation of every screen, kept
  in step by hand, for an app whose brief is "no build step". The cost is not
  the first version — it is every change afterwards having two homes. If the
  motive is component structure rather than React, the split above is cheaper.
- **"Make everything faster."** Not actionable as written, and the measured
  slow paths are fixed: PageRank and the similarity sweep are cached per
  notebook version, three N+1s and two O(n²) traps are gone. The next real
  work needs a profile against a large notebook, not a sweep.
- **Spacing and clashing controls across the app.** Real, and too broad as one
  item. The design tokens and the lints make each instance a small fix; raise
  them as they are noticed rather than as a project.
- **A pass over "the Gemini/antigravity improvements".** Done — see
  HISTORY.md's §40. 46 tests and 4 lints so the next such audit is cheaper.
- **The "full UI audit" umbrella.** Break into dated sub-items as capacity
  allows. The concrete pieces left: a colour-scale pass to match the existing
  spacing/type work, and a widget-density sweep.
- **"Clean up, consolidate and refactor the test files."** 106 files, and the
  suite is fully green — there is no known duplication or staleness to point
  at, just a general request. Doing this blind risks the opposite of the
  goal: this project's own tests are written as *narrative* (each docstring
  is a reported bug or a design decision, not a spec), and a mechanical
  consolidation pass — merging `test_x.py` and `test_x_more.py` because the
  names look related — is exactly how that history gets flattened into
  generic assertions nobody can trace back to why they exist. Worth doing
  *with a concrete finding first*: run coverage, look for genuinely
  duplicated setup (a fixture reinvented under a different name in three
  files is a real, safe consolidation), or split a file that actually is
  too large — not a scheduled tidy with no target.

### The rule this section exists to enforce

Anything reported goes in here with a tier, **immediately**, even if nobody is
working on it. This project's failure mode is not forgetting to write things
down — it is writing them somewhere a later session does not read, and then
rebuilding or re-deriving them. One ordered list, in the file every session is
told to open first.

## How to work on this repo

- `pytest tests/` — ~1,600+ tests, fully offline, no Ollama needed
  (`pytest.ini` sets `pythonpath = src`).
- `ruff check .` — matches CI.
- `node --check frontend/app.js` — one large plain-JS file; run after every edit.
- **Install non-ML deps by hand** (see root `CLAUDE.md`) — do not install
  `torch` or `sentence-transformers`; both have failed to install cleanly in
  past sessions and the suite passes without them (semantic search falls
  back to keywords; tests that care use a fake embedding backend).
- **Drive the app in a browser before claiming a UI change works.** Chromium
  + Playwright are in the sandbox. Launch with `service_workers="block"` or
  `sw.js` serves a cached `app.js` and you'll be testing yesterday's code.
  Assert on measured geometry (`scrollWidth - clientWidth`), not screenshots.
- **Collect the console while driving.** The app sends a strict CSP; a
  refused style/script/fetch shows up *only* in the console — no failed
  request, no thrown error, the thing just silently doesn't happen.

### Traps that have each cost real time

1. **Don't guess element ids** — check `index.html` or query generically.
2. **`git checkout <file>` discards uncommitted work in that file.** Commit
   before experimenting.
3. **A POST response can lie about stored state** — SQLAlchemy returns the
   in-memory object; assert on the next GET, not the create response.
4. **`utcnow() + offset` is a lie with a timezone attached** — it tags UTC on
   a value that actually holds local wall-clock. Build the user's clock as
   `utcnow().astimezone(timezone(offset))`.
5. **The Notes tab is sub-tabbed.** Anything that scrolls to a note must call
   `showNotesSection("browse")` first, or it targets an element inside
   `display: none`.
6. **The app sends a strict CSP; a violation is reported only in the console.**
   No failed request, no thrown error. An injected `<style>` tag won't apply
   (use `adoptedStyleSheets`), `style=""` in `index.html` won't apply (use
   `style.css`), and a script from off-origin is refused outright.
7. **CSS automatic minimum sizing is the usual cause of a wide page.** A
   `1fr` grid track or a flex item with default `min-width: auto` refuses to
   shrink below its content; `overflow-x: auto` on the child does nothing
   until every ancestor has an explicit floor.
8. **A POSIX idiom can mean something else on Windows, silently** —
   `os.kill(pid, 0)` terminates on Windows rather than probing; the sandbox
   is Linux, so this class of bug never reproduces here.
9. **A control that "does nothing" is usually working** — check the
   *computed* result. Most reported cases wrote correctly and were then
   overridden by CSS source order, a status poll repainting, or living in a
   hidden section.
10. **This suite cannot see any of the above.** Every UI bug this project has
    found passed a fully green test run first.

Full historical detail for every trap above — the original report, the
diagnosis, the fix, and what verification could and couldn't cover — is in
[roadmap/HISTORY.md](roadmap/HISTORY.md).
