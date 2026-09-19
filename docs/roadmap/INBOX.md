# Inbox: things the owner dropped in while work was in flight

**How this file is used (the interrupt rule).** Anything the owner sends
while a step is in progress (a bug, a screenshot, a request, an opinion,
a usage figure) is appended here verbatim with the time, and NOT acted on
until the step in hand has passed its gate and is committed. Then, at that
boundary only, the inbox is triaged in one pass:

1. A bug in something built this session goes next (it is cheaper now).
2. A bug elsewhere goes into the relevant `agent-remaining/*.md` or
   BACKLOG row with the owner's words, and is scheduled by impact.
3. A feature or design request becomes a brief row (SESSION_BRIEFS or the
   plan it belongs to); it is not built ad hoc.
4. An opinion or a decision is recorded in the plan it affects and
   followed from then on.
5. "X% usage" means commit and push now, then continue more tersely.

Each item is moved out of this file when it has a home, with one line in
the report saying where it went. The point: the owner's pile after a usage
reset is processed as a batch at a boundary, the step that was in flight is
finished to standard first, and the goals in HANDOVER's "Now" line are
never lost to the smaller stuff.

## What is actually open, 2026-09-14

The 2026-09-09 to 2026-09-13 batches (110, 111, 114, 174, 176, 177, 180)
are in HISTORY's "INBOX resolved" with every sub-report marked; the three
residues they left are owned elsewhere: the graph agent popup redesign
(GRAPH_PLAN Phase 6), the mind map ring (MINDMAP_PLAN "Decisions made,
2026-09-13 night", the mapux agent), and the second batch's five
not-reproduced visuals (BACKLOG, "Reported, not reproduced"). Everything
below is open work from the night of 2026-09-13 and the morning after,
with its owner named in the entry.

## Open items

238. **Mid-work drop, 2026-09-14, verbatim (the owner), board and map
    notes.** "when I expand the size of notes in the whiteboard and mindmap,
    the text goes out of the panel border, the state of note objects in the
    whiteboard and mindmap for if they are expanded or not should be
    persistant, and when exporting a whiteboard and/or mindmap, the user
    should be warned if any of their notes arent expanded and that not all
    their contents will be shown, the export shouldnt include things like
    the show less/more text as well." Owner: notes agent (whiteboard.js).
    **Fixed 2026-09-19** (5a9c909, 128a731, 7e8d902), all three parts,
    measured at 1440x900 with zero page errors throughout:
    - *Text outside the border.* `.wb-card` is a column flex container and a
      placed note carries its dragged height as an inline style, but a flex
      item's `min-height: auto` resolves to its content, so the text won
      against the box: a 324-character note in a 320x120 card laid out 215px,
      112px of it below the card's edge; 408 characters in 320x160 spilled
      254px. `min-height: 0` and `overflow: hidden` on `.wb-card-content`
      (not on the card: the eight resize handles sit outside its edge on
      purpose). The "Show more" was also gated on the Notes list's rule
      (500 characters or 10 lines), which is a question about the note when
      the question is about the box; it is now measured from the layout, and
      the old `-webkit-line-clamp: 8` (which counted paragraphs, not lines,
      on rendered markdown) is a `max-height` applied only to a card with no
      stored height. After: 60px and 100px of text, both 43px clear, a note
      that fits gets no button, expand and collapse round-trip 140 to 411 to
      140px, and growing the card to 700px retires the button.
    - *Persistence.* `wbExpandedNodes` is saved to `localStorage`, where the
      grid, snap, guide colours, background and navigator state already live.
      One key, 500 entries, oldest dropped first. Measured across a reload
      and re-login: 411px and "Show less" both survive.
    - *Export.* The "Show more" text was never in the picture (cards are
      rebuilt as SVG from the note), but the export always showed *less* than
      the screen: 160 characters wrapped into at most six lines whatever the
      card's size. The line budget now comes from the card's measured height
      (collapsed in a 160px card, 7 lines; expanded to 746px, 22; both were 6
      before), and the dialog carries a `--warn` line naming how many notes
      are collapsed. Markdown, OPML and FreeMind carry `drawsCards: false`
      and never show it.

232. **Mid-work drop, 2026-09-14, verbatim (the owner), the live view.**
    "the md rendering on the live view, like in the documents page, needs to
    be improved, especially for codeblocks and potentially for other things
    as well." Screenshot: a fenced block renders as a dark slab with the
    fence lines as empty numbered rows above and below, link chips wrap
    oddly. Owner: notes agent (documents.js).
    **Codeblocks fixed 2026-09-19** (706e2af). Measured on a four-line Python
    block: five rows of 26px, two of them empty, so 52 of 130 pixels said
    nothing. INBOX 198 hid the backticks and the language word, correctly,
    but left the emptied lines at full line height. They now keep the block's
    tint and take half a line, the block's corners are rounded so five tinted
    rows read as one slab, and the language is drawn in the corner from a
    `data-lang` attribute rather than on a row of its own. Both stand down
    when the caret is inside the block, since the raw fence comes back there.
    After: 92px, zero empty full-height rows, 8px fence rows, the label in
    `--muted`. **Still open: the link chips**, which this did not touch.

228. **Mid-work drop, 2026-09-14, verbatim (the owner), the close.** "after
    you have finished all these, done the final bug sweep, make sure
    everything is finished for the pr, and finish the pr, merging it into
    main." Owner: orchestrator, last.

226. **Mid-work drop, 2026-09-14 morning, verbatim (the owner), a flicker.**
    "theres a flickering just above the bottom bar??" / "i was on the
    dashboard". Reproduce first: sample the band above `#status-bar` on the
    dashboard at 100 ms for four seconds and count pixel changes; log DOM
    mutations in the same band. Suspects, in order: a widget re-rendering
    on a timer (the Rediscover widget re-asks when its list empties; the
    reminders and stats fetches were just shared by the boot agent), the
    scroll-top button toggling on a scroll-height change, the status bar's
    new Guide slot being redrawn by the header's model poll. Owner:
    orchestrator, now.
    **Not reproduced on the merged head, 2026-09-14** (`scratchpad/
    flicker2.js`, `flicker3.js`, 1440x900, dashboard, 60 frames at 60 to
    100 ms): with the art off, the only pixels changing in the 120px band
    above the status bar are none (the status bar's own AI spinner is the
    one moving thing on screen); with the art on and Movement: Still, zero
    frame changes and zero `startBgArt`/`stopBgArt` calls or canvas swaps
    in four seconds; with the art moving, every strip changes, which is the
    art. The ten inline-style writes seen on `.dash-widget` sections are the
    one-time span pass, not a loop. Left open for the owner: which theme,
    which background style, and whether the desktop window or a browser
    tab; a screenshot with the flicker in it names the element.
    **Reproduced and named, 2026-09-19** (`scratchpad` flicker probes, a
    seeded four thousand note notebook at 1440x900). The earlier run looked
    at the *background* art (`startBgArt`); the thing moving is the
    dashboard's own **art widget** (`startArt`, dashboard.js).
    The 130px band above the status bar was split into a 12x4 grid and
    sampled twelve times: three adjacent columns changed on **11 of 11**
    comparisons and every other cell on none, with **zero DOM mutations** in
    the band and the background art off. `elementsFromPoint` at the busiest
    cell: `canvas.p5Canvas` inside `div.art-holder` inside a
    `section.card.dash-widget`. It runs at **59 fps** in a 306x220 box.
    It is a widget animating, not a repaint fault, so the flicker is
    explained. What was wrong is that it ignored every switch that says
    "stop moving things" except the OS media query: measured before, Reduce
    motion on gave 59 fps and Performance mode on gave 59 fps, while the
    background art stops for both and DESIGN.md rule 12 says Performance
    mode stops every animation but the progress indicators. Fixed; measured
    after, both read 0 fps, and 59 again when switched back off. If the
    owner still sees it with both of those off, the remaining answer is the
    widget itself: turn the art widget off on the dashboard, or say so and
    it gets a frame-rate cap rather than 60.

220. **Mid-work drop, 2026-09-14 morning, verbatim (the owner), the docs
    and how to proceed.** "make sure all the other docs like architecture.md
    are up to date, and extend the roadmap and backlog. make it clear to me
    how to proceed with development for after this pr... help me get my
    head around everything." Also: "clean out unneeded documents or files.
    refine the repo." And: "clean up the agent remaining-files as well if
    they are outdated or not needed anymore... same with the plans... are
    there any other plans or parts of plans that havent been done yet?? is
    all the ui modernised and consistent??" ARCHITECTURE.md checked against
    the code; `agent-remaining/` reduced to the files with open work (the
    rest to HISTORY); finished plans marked superseded in ROADMAP's table;
    ROADMAP and BACKLOG extended; a "How to proceed after PR 144" section
    in HANDOVER naming every open plan section. Owner: orchestrator, last.
    **Progress, 2026-09-14:** `agent-remaining/` consolidated (38 files to
    `archive/agent-remaining/`, 134 open bullets in `OPEN.md`, 70
    references repointed, merged `878f78d`); ARCHITECTURE's directory map
    rewritten against the tree (`4bae0a0`); BACKLOG 115 and
    WORLD_CLASS_PLAN 18 written. Left: the ROADMAP rewrite and the
    HANDOVER "how to proceed" block, after the four agents merge.

213. **Mid-work drop, 2026-09-14 morning, verbatim (the owner), the last
    scan.** "finish all the agents, scan for bugs and high complexity one
    last time, and let me know when the pr is ready to merge / make sure to
    merge all of the agent branches into this one as the agents finish."
    And: "once absolutely everything is done and the roadmap documents are
    cleaned etc, all the agent branches are merged into this one etc, merge
    this pr for me." Owner: orchestrator; the merge is the last act.

257. **Found by scan, 2026-09-19 (the session, not the owner).** Eighty
    class names are written by `frontend/*.js` (`classList.add`,
    `className =`, `.attr("class", ...)`) that no stylesheet declares and no
    selector reads back, so they are inert: `doc-prose-fix-all`,
    `doc-suggest-ai-option`, `entry-attachment-caption-btn`,
    `graph-label-layer` and the rest. Most are probably harmless markers,
    but some read like buttons that were meant to be styled.
    Recommendation: not a lint, an eighty-entry allowlist is the "widen the
    rule" mistake CLAUDE.md warns about. One pass by eye over the list,
    deleting the markers and styling the two or three that should have been.
    The scan is ten lines against `_strip` from
    `tests/test_frontend_symbols.py`.

258. **Recommendation, not a change, 2026-09-19 (the session).** The
    reverted outside commit added right-drag to pan the board, filtered so
    a right-click still reaches a node's context menu
    (`wbZoomFilter`: `event.button === 2` on a target that is not
    `.node-card, .sketch-group, .wb-object`). It is a good gesture and
    every canvas app has it, but nobody asked for it and a new gesture on
    the surface that carries the app's only context menu is a decision, not
    a patch. Not built here on purpose (standing order 8: a new need is an
    entry, not an ad-hoc build).
    Recommendation: take it, guarded as above, plus `contextmenu` suppressed
    on the canvas only while such a drag actually moved (so a right *click*
    on empty canvas keeps whatever it does today), and measured against
    `scratchpad/ui-sweeps/wbpan.js`. The other two ideas from that commit,
    a rotated group outline and alignment guides for a group drag, are built
    (861e740, 5273bae).

260. **Question, not a bug, 2026-09-19 (the session).** "Battery-efficient
    mode" (Settings, Preferences) pauses autonomous background tasks and
    skips the graph's similarity work, and its copy says exactly that and
    nothing more, so the backend matches its promise. But it reaches nothing
    in the browser: with it on, the dashboard's constellation canvas still
    animates (now at 30 fps, it was 60), and so does the background art if
    that is on. Someone who turns on a setting with "battery" in the name
    and watches a canvas keep drawing will reasonably call that broken.
    Checked before writing this, and deliberately not changed: widening a
    setting past what its own help text promises is a design decision.
    Recommendation: make it a third input to the motion resolution the two
    generative pictures already share, beside Reduce motion and Performance
    mode (see `startArt` in dashboard.js and `startBgArt` in settings.js,
    both fixed to read those two on 2026-09-19), and extend the help text to
    say "and pause the moving artwork". One line each.

261. **Found by scan, 2026-09-19 (the session, not the owner).** Ten routes
    the app serves that `frontend/*.js` never names, from
    `scratchpad/probe_dead_routes.py` (new; run it with `PYTHONPATH=src`).
    Four more were in this list and are now wired: `GET /learned` and its
    whole lifecycle, `POST /night/run`, `GET /search/stats` and
    `POST /drafts/title`. What is left, triaged:
    - `GET|POST /entries/daily/{day}`, `POST /resurface/compute` and
      `GET /openapi.json`: not the frontend's to call. The daily-note pair
      is the agent's "add to today's note" tool and says so in app.js; the
      compute half of resurfacing is the scheduler's, and its module
      docstring is explicit that the read is the fast one; `/openapi.json`
      is FastAPI's own. **Nothing to do.**
    - `POST /insights/digest` and `GET /whiteboard/images`: superseded and
      recorded as such (`/insights/digest/stream` is what the dashboard
      calls; BACKLOG says `/media` replaced the board image listing).
      **Recommendation:** leave them, or delete them in a sweep of their
      own; either is defensible and neither is urgent.
    - `GET /insights/on-this-day`: superseded by choice. The widget filters
      `allEntries` in the browser, which is one fewer request and is
      correct once the notebook has finished paging in.
      **Recommendation:** leave it, and say so in the route's docstring, so
      the next scan does not re-open this.
    - `GET /tags`: the tag autocomplete is built from `allEntries` instead
      (`refreshTagSuggestions`), so it is incomplete until every page of a
      four thousand note notebook has arrived, and it carries no counts.
      The route returns tag to count, ordered, in one request.
      **Recommendation:** use it; it is a smaller function than the one it
      replaces.
    - `GET /settings/events`: B1's event feed. Its own docstring names the
      consumer, "what a Dashboard or Timeline activity strip should read
      instead of scanning the notes table for recency", and no such strip
      reads it. **Recommendation:** a brief in WORLD_CLASS_PLAN B1, not an
      improvisation here: it is a surface, not a wire-up.
    - `GET /resurface/near/{entry_id}`: "the faded notes closest to the one
      being read", built and tested, with nowhere in the app that reads a
      note asking for it. **Recommendation:** one row under an opened note,
      on the existing card recipe, filtered to the current space. Worth
      doing; it is the only one of these that is a missing feature rather
      than a missing wire.
    `POST /auth/rotate-vault-key` was on this list until the probe learned
    to read `` `/auth/${mode === "setup" ? "setup" : "unlock"}` ``; it is
    still uncalled, and re-keying the vault has no UI. Filed here rather
    than fixed: it is the one route in the app that rewrites every private
    note, and a button for it wants its own session.

## Placed (last 20, newest first)

- 2026-09-13: 128 placed in DOCUMENTS_PLAN.md.
- 2026-09-13: 162, 159 placed in WORLD_CLASS_PLAN.md.
- 2026-09-13: 165, 164 placed in UI_MODERNISATION_PLAN.md.
- 2026-09-08: dashboard hero preference, New note tile colours, sub-tab
  arrow keys, Files reading, sidebar toggle, mindmap bugs, line numbers,
  docks as one bar, timeline redesign, responsive design, em-dashes,
  paragraphs to popovers, security review: all placed (HANDOVER "flagged
  list") and most built.

246. **Mid-work drop, 2026-09-14, verbatim (the owner).** "I also want to
    be able to attach whiteboards and mindmaps to notes. and I want it to
    show in notes if they are attached to or referenced in/by a document,
    note, whiteboard, or mindmap." Recommendation: the note edit form's
    attach menu gains Board and Mind map (the same reference the board
    already stores when it embeds a note, written from the note's side),
    and the note card gets a "Referenced by" row listing documents, notes,
    boards and maps that carry it, from one backlinks endpoint.

253. **Mid-work drop, 2026-09-14, verbatim (the owner).** "the app needs
    to work even if it cant update or isnt available to the internet, and it
    needs to be automatically recoverable and revivable for the user with
    one click". Placed in WORLD_CLASS_PLAN H6 (professional use) as its
    first row: offline is already the design (no route needs the network;
    the updater only checks when asked), so the work is (a) a launcher
    that, when the app fails to start, repairs itself without a prompt
    (`--doctor` and `--reinstall` exist but are flags, not a button), and
    (b) a "Repair MemoryMap" shortcut installed beside the app that runs
    them. Depends on 251's facts.

