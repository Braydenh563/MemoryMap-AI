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
| [roadmap/ANALYSIS.md](roadmap/ANALYSIS.md) | Judgements: the odysseus read, and the licence constraint — **this project is AGPL-3.0 now, not MIT**, so §34a's "no code crosses either way" is half-lifted. What was deliberately not taken. |
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

1. **Meeting transcription errors out.** Reported as simply not working, with
   a button in the UI that offers it. Reproduce first: `faster-whisper` is an
   optional extra, so the likeliest answer is that the missing-package path is
   an error rather than an explanation. Nothing else in meetings is worth
   touching until this is diagnosed.
2. **"The AI fails to respond while still saying it is writing" — and the
   skill step counted as done.** Two bugs in one report: no timeout on the
   stream, and a step ticked on a turn that produced nothing. The second is
   worse: it makes the skill's own progress list lie, which is the surface the
   user is asked to trust. Needs a real timeout, a visible "this stopped"
   state, and a step that only ticks on a completed turn.
3. **Skills producing network errors, or models that cannot run them.** Same
   family. A failing skill must say *which* step and *why*, and offer the
   resume `skill_from_step` already supports.
4. **Contradictions in the agent prompt around small talk.** `TOOLS_GUIDE`
   tells the model to take several turns and use tools; `intent.SMALLTALK`
   routes "hey" away from the agent entirely. Reconcile them — the prompt is
   resent every round, so a contradiction is paid for constantly.
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
6. **Background tasks that never appear.** The list is built from
   `routes_tasks.collect()`; anything on a worker thread not registered there
   is invisible. Sweep for unregistered threads and make registration the rule
   rather than something each feature remembers.
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
   to Suggest links.
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
    pixel data back, not just the on-screen canvas. **Still genuinely open**:
    a selection tool (clicking an existing stroke/shape to move, resize or
    delete it; today's tools only ever draw a new one). The toolbar redesign
    comes *after* that, not before.
11. **The whiteboard, properly.** Done in an earlier session, reported and
    verified in Chromium: per-tool cursors (native `cursor: url(svg)`, not a
    JS-tracked div — the div version was reported and reproduced as "the
    mouse snaps to an invisible grid", a lag artifact, not a real grid), an
    eraser (drag-to-delete, matching every other drawing app), Undo (Ctrl+Z,
    one level, covers create and delete for both sketches and cards),
    keyboard shortcuts (V/P/L/R/O/E/X/Esc), a real toolbar redesign with SVG
    icons and grouped sections, a board background colour (also fixes the
    generative-art canvas showing through, reported separately), draggable
    toolbar panels, and an empty-state hint. Also fixed while adding the
    eraser: a freshly drawn stroke was appended as a raw un-bound SVG
    element, not through `renderWhiteboard`'s data binding — so it could
    never be deleted or erased until a page reload re-fetched it.

    **Still open, reported directly and confirmed against the current code —
    checked before writing any of this, per this file's own rule** (only one
    undo level exists; there is no redo stack at all; the only tools are
    pan/select, pen, line, rect, circle, eraser, two link types and delete —
    no rotate, no shift-to-lock-proportions while resizing, no image
    upload/paste/drag-drop, no text/label tool beyond a card's own text):
    - **Redo.** `wbUndoStack` exists; nothing analogous does. A second stack
      that a fresh action clears, same shape as the sketch pad's own history.
    - **Select, move and rotate as real tools**, not folded into "pan" —
      today's `data-tool="pan"` is both at once, and there is no rotate
      handle on a card or shape at all.
    - **Shift-to-lock proportions** while drawing/resizing a shape.
    - **Images**: upload, paste, and drag-and-drop onto the canvas. The
      plumbing already exists for notes (`/media`, attachments — see item
      20) and is the thing to extend rather than a second upload path.
    - **Precise placement.** Dropping a note/card "doesn't go exactly where
      I want it" — likely the drop coordinate isn't being translated through
      the canvas's own zoom/pan transform before being stored; needs
      reproducing against the actual drop handler, not guessed at.
    - **Connections, draw.io-style.** Links currently join whatever anchor
      the drag started/ended on; asked for: fixed points at each edge's
      midpoint and corners, *plus* a free point anywhere along an edge, and
      the line should visually terminate on the card's border rather than
      wherever the drag happened to end (today's rendering — see the
      edge-labelling note below).
    - **The toolbar's default position.** Reported drifting to the top-left
      when it should default to bottom-centre unless the user has dragged
      it — the draggable-panel code this session (item 11, done) added
      needs a default-position check against whatever "unless moved" state
      it persists.
    - **Resizable cards**, and the edge-labelling the graph has — see item 9
      — both still open from before.

    **This is a lot for one item** — draw.io, Microsoft Whiteboard and
    OneNote between them are three separate mature products' worth of
    surface. Worth sequencing rather than one pass: redo and select/move/
    rotate are the most-requested and cheapest (state machines the app
    already has a shape for); images and precise placement are next
    (real user-visible correctness, not new interaction design); the
    connection-point system is the biggest single piece and worth its own
    session, ideally after looking at how draw.io itself represents a
    fixed-vs-free anchor, since that's the interaction model being asked
    for by name.
12. ~~**Links that are links.**~~ **Already done — corrected, not rebuilt
    (HISTORY.md §47).** Checked before touching anything, per this file's
    own rule: every place a link chip renders (a note card's own links, the
    "Similar" panel, a reminder's attached note) already calls `flashEntry`
    on click, which switches to Notes → Browse, clears any active filter,
    and scrolls the target into view with a highlight — the same function
    search results and wiki-style `[[links]]` already use. This file's own
    claim that they were "decoration" was stale, likely inherited from
    before that wiring existed; nothing here needed building.
13. **"Take me to the thing the agent just changed," the UI half.** The
    document half is **done (HISTORY.md §47)**: `agent._change_document_id`
    has resolved a real document id on every write since §21, but
    `changeRow` — the one place both the chat's "what changed" list and the
    autonomous-pass review panel render a change — never read it. Now does,
    reusing `openDocumentFromNote` (the same navigation a note's own
    document link already used); verified live (a synthetic `document_id`
    change renders a View button that actually un-hides `#tab-documents`,
    not just calls something silently). **Still open**: reminders and
    categories have no `_change_*_id` resolver on the backend at all yet
    (only note/document exist), so extending this further needs that
    groundwork laid first, not just another `if` in `changeRow`.
14. **Timeline line view, and text placement in grid view.** The grid view's
    text-placement half is **done**: `.timeline-dot`'s `line-clamp: 3` was
    unprefixed under a `-webkit-box` display, a combination this Chromium
    doesn't connect — `-webkit-line-clamp` computed to `none`, so nothing
    was actually clamping and a long preview just hard-cropped mid-word
    with no ellipsis. Fixed (the `-webkit-` property, kept alongside the
    standard one), plus the backend's own `preview` field, which was a bare
    `text[:120]` slice with no "…" on truncation even before the CSS ever
    saw it. **Still open:** the line view itself — reported as needing a
    real visual pass ("very professional and ready for public use"), and
    grid view could still take general UX polish/feature expansion beyond
    the text-cropping fix (not scoped further — say what specifically,
    next time it's reported).
15. **Arc view: labels behind nodes**, plus a refinement pass on that layout.
    One piece of the refinement pass is **done**: the trace overlay drew a
    straight chord regardless of layout, and Arc puts every node on one
    shared baseline, so a traced path there sat exactly where the row of
    nodes already was — reported as connections being hard to see on
    non-tree layouts. Now drawn as its own taller arc in that one layout.
    The labels-behind-nodes part is still open.
16. **Documents in the graph.** They are notes' equal everywhere else.
17. **Battery-saver: an indicator and an honest description.** Checked before
    writing this — the indicator already exists (`#power-saver-indicator`, a
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
18. **The full-screen graph's Options panel**, the sketch/image toggles, and a
    suggested-links list that runs off the bottom without scrolling.
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
    before it's buildable. **Not verified live** — reasoned from the code
    path, not driven in a browser.

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
25. **A mapping tab** — mind maps and linked diagrams. Overlaps the whiteboard
    heavily; decide whether it is a *mode of the whiteboard* rather than a tab
    before building it.
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
