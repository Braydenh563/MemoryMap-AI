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

228. **Mid-work drop, 2026-09-14, verbatim (the owner), the close.** "after
    you have finished all these, done the final bug sweep, make sure
    everything is finished for the pr, and finish the pr, merging it into
    main." Owner: orchestrator, last.

213. **Mid-work drop, 2026-09-14 morning, verbatim (the owner), the last
    scan.** "finish all the agents, scan for bugs and high complexity one
    last time, and let me know when the pr is ready to merge / make sure to
    merge all of the agent branches into this one as the agents finish."
    And: "once absolutely everything is done and the roadmap documents are
    cleaned etc, all the agent branches are merged into this one etc, merge
    this pr for me." Owner: orchestrator; the merge is the last act.
    **The last scan, run 2026-09-20.** Four passes, each a number rather
    than a reading:
    - **Routes with no caller** (`scratchpad/probe_dead_routes.py`): 320
      served, 9 unnamed by the frontend, every one triaged in 261. Two were
      real and are fixed: `/resurface/near/{entry_id}` was unreachable *and*
      crashed on its first call, and `GET /events` is a built feed with no
      strip to read it (WORLD_CLASS_PLAN B1, still open).
    - **Calls with no route** (`scratchpad/probe_missing_routes.py`, new,
      the mirror and the worse failure): 297 distinct paths called, **0 with
      no route**, both undecidable paths resolved by hand.
    - **Frontend declarations nothing references**: 3,222 top-level names,
      **0** referenced only by their own declaration. No dead weight left in
      `frontend/*.js`.
    - **Complexity, backend**, by branch count over 1,827 functions. The top
      five, for whoever takes this on: `_run_one_step` (skill_runner.py:784,
      50 branches / 419 lines), `analyse_attachment` (routes_files.py:381,
      43 / 167), `search` (search/engine.py:645, 41 / 139),
      `_optimization_pass` (autonomous.py:268, 40 / 250), `_run_skill`
      (skill_runner.py:1206, 36 / 300). Not refactored here on purpose: this
      PR is about to merge and restructuring a 419-line agent step is not a
      thing to do on the way out of one.
    A fifth pass, silent exception handlers, was run and is not reported as
    a finding: 251 handlers return a fallback without logging, and in an app
    whose whole design is "degrade to offline" that is the intended shape,
    not a smell. The heuristic could not separate the two, so it is written
    down here rather than left as a number somebody later mistakes for a
    defect count.

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
    **Tried 2026-09-19 and taken back out, with what was learned.** The pan
    itself is four lines in `wbZoomFilter` (`event.button === 2` when
    `event.target` is not inside `.node-card, .sketch-group, .wb-object,
    .wb-map-edge-hit, [contenteditable]`, and the mousemove half gated on a
    flag the mousedown set) and measured clean: a right-drag moved the board
    150px, a right-click with no drag left the transform untouched.
    The half that matters could not be measured. Three things were found
    and are worth having written down:
    - The `contextmenu` that ends a right-drag over this board is dispatched
      at the `<section>` *around* it, not at anything inside it, so a
      listener scoped to `#whiteboard-container` never sees it and
      `event.target.closest("#library-view-whiteboard")` is null on it.
    - It is dispatched **before** `pointerup`, not after, so clearing the
      "this drag moved" flag on the release is safe and clearing it on a
      `setTimeout(0)` from the release is not.
    - With all of that accounted for, two runs of identical code disagreed
      about whether the menu was dispatched at all. Non-deterministic here,
      and the difference between "the gesture is polished" and "the gesture
      leaves a menu open on your board" is exactly that dispatch.
    So: not shipped. `scratchpad/ui-sweeps/wbrightpan.js` is the acceptance
    test, written first and failing, with the three facts above in its
    header. Whoever builds it makes that file pass on a board with a card on
    it, which is also the case this run could not cover.
    **Built and taken back out a second time, 2026-09-20, and this run found
    why. Two of the three facts above are wrong.** Measured with every event
    logged in the capture phase across a full right-drag:

        pointerdown@wb-svg-layer
        mousedown@wb-svg-layer
        contextmenu@wb-svg-layer      <- on the press
        pointerup@wb-svg-layer
        mouseup@wb-svg-layer
        auxclick@wb-svg-layer

    `contextmenu` arrives **on the press, before the drag has moved a pixel**,
    and at `#wb-svg-layer`, not at the `<section>`. So at the only moment the
    decision can be made, nothing can know whether the gesture will become a
    drag: "suppress the menu only when the drag moved" is not implementable,
    which is why both attempts left a menu open. The non-determinism recorded
    above did not reproduce: six runs across two attempts agreed every time,
    so it should not be planned around.
    The pan half measured clean again (0 to 150px, three runs identical), and
    a probe bug was fixed while there: the card's position was read at setup,
    before checks 1 and 2 pan the board, so check 3 pressed empty canvas and
    reported a 120px pan "on a card" that never touched one.
    **Recommendation, for the owner, because it is a decision and not a
    patch.** One shape works: suppress the native menu on the canvas outright
    and open the app's own pointer menu (`openMenuAtPoint`, which exists) in
    its place. A right-click then gives board actions instead of Chrome's
    menu, and a right-drag gives a clean pan. What goes in that menu is the
    open question, and assertion 2 of the acceptance test ("a right-click
    still opens whatever it opened before") changes with it.

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
    - `GET /tags`: **done.** The autocomplete was built from `allEntries`
      (`refreshTagSuggestions`), so it was incomplete until every page of a
      four thousand note notebook had arrived, and alphabetical, so a tag
      used once outranked one used four hundred times. Measured on a
      notebook tagged to show the difference, old against new:
      `archive, budget, house, winter-roof-repair` (archive is used five
      times) became `house, winter-roof-repair, budget, archive` (400, 400,
      20, 5). One request, cached, in place of a flatten over every loaded
      note twice per load.
    - `GET /settings/events`: B1's event feed. Its own docstring names the
      consumer, "what a Dashboard or Timeline activity strip should read
      instead of scanning the notes table for recency", and no such strip
      reads it. **Recommendation:** a brief in WORLD_CLASS_PLAN B1, not an
      improvisation here: it is a surface, not a wire-up.
    - `GET /resurface/near/{entry_id}`: "the faded notes closest to the one
      being read", built and tested, and there is nowhere in the app that
      reads a note. Checked before recommending anything: a note is a card
      in a list, and the only thing resembling a detail view is the inline
      edit form (`editingId`), which is a form. `lastOpenedEntryId` exists
      but only feeds the agent's "what am I looking at" subject. So this is
      a surface, not a wire-up, and probably why it was never wired.
      **Recommendation:** decide the surface first. The cheapest honest one
      is a row inside the edit form, under the tags, reusing
      `paintFadedNotes` from dashboard.js (the route returns the same
      `_card` shape the dashboard widget already renders); the better one
      is the note detail view this app does not have, which is a plan item
      rather than an INBOX item.
    `POST /auth/rotate-vault-key` was on this list until the probe learned
    to read `` `/auth/${mode === "setup" ? "setup" : "unlock"}` ``; it is
    still uncalled, and re-keying the vault has no UI. Filed here rather
    than fixed: it is the one route in the app that rewrites every private
    note, and a button for it wants its own session.

266. **Mid-work drop, 2026-09-20, verbatim (the owner).** "What usability and
    information architecture things are missing and can be added?? It's often
    the small things that act up, are broken, unreliable, or missing with the
    user needs to work which break the user's trust of the application and
    make it feel less professional, unpolished, like a demo, and not
    trustworthy to be actually used for legitimate work
    Tar file for linus
    Windows msi file
    Version platform architecture for both windows and linux installers
    Lightweight as possible
    what happens if the user runs out of storage??
    needs full backend professional design that accounts for everything
    needs more optimisation
    We need to do a full architecture analysis and make sure that we are
    actually using the right architecture and backend functions. we need to
    make sure that our choices are the best they can be. like why is storing
    in an sqlite database the best way to store notes etc. are things running
    when they arent necessary and taking up extra compute?? things like
    containers are spun up as needed like serverless cloud architecture"
    Open. Seven asks, and most are analysis rather than a fix: (1) the
    usability and IA gaps that cost trust, (2) a `.tar.gz` for Linux, (3) an
    `.msi` for Windows, (4) version, platform and architecture in every
    installer's name, (5) lightweight, (6) what the app does when the disk
    fills, (7) an architecture review with SQLite and idle compute named
    specifically.

267. **Mid-work drop, 2026-09-20, verbatim (the owner), a screenshot of four
    lines.** "Alignment bars don't appear for group selections
    Double tap anchor resize nodes to auto size adjust
    In-text referencing and grounding in the ask subtab doesn't stick, the
    wrong numbers will be used and in the wrong spot, and the numbers wont
    match the grounding.
    Grounding and in-text referencing not working now?? Needs fix."
    Four things, taken worst first: (1) grounding and in-text references in
    Ask, which the owner wrote twice and which is the one that makes answers
    untrustworthy, (2) alignment bars missing on a group selection, which a
    previous session recorded as built (`5273bae`), so measure before
    believing either, (3) double-tapping a resize anchor to fit the content.
    (2) fixed: measured first, and the report was right for a reason nobody
    had guessed. A group of *cards* has drawn its guides since
    `wbBulkGroupBox` landed, verified at 1 guide line on a two-card group
    dragged into line. The sketch drag handler never asked for guides at all,
    solo or in a group, so a marquee that caught a sketch and was dragged by
    it was the one selection on the board with none. `wbBulkGroupBox` now
    takes the dragged item's own box, since a sketch is a path with no
    x/y/width/height, and the sketch handler snaps and draws like the other
    two. Probe: `scratchpad/ui-sweeps/wbgroupguides.js`, in the gate's sweep
    set. (3) fixed: the gesture was already wired (a `dblclick` on
    `.wb-resize-handle` calling `wbFitToText`) and measured as doing nothing.
    Two causes, both real. The handles carried no title, so the gesture was
    invisible and indistinguishable from missing, which is why it was
    reported as missing. And `wbFitToText` measured the *card's* own
    `scrollHeight`, which cannot answer the question: `.wb-card-content`
    clips on purpose (INBOX 238), so the card's scroll height is the height
    of a box that is already clipping. It measures the content, unclipped,
    plus the card's chrome now. Measured: a 100px card holding fourteen
    wrapped lines went 100px to 100px before and 100px to 748px after, with
    nothing clipped. Probe: `scratchpad/ui-sweeps/wbfitanchor.js`.
    (1) fixed, `0f5d46d`, and measured: `liveMarkdownRenderer` armed a paint
    up to 66ms before the stream ended, which fired after the markers were
    placed and repainted the box from raw markdown, removing all three. The
    Ask tab was the one caller that never called the renderer's own `stop()`,
    which has existed for this since INBOX 40. Probe:
    `scratchpad/ui-sweeps/askgrounding.js` against
    `scratchpad/fake_answer_server.py`, 0 markers before, 3 after, numbered
    1/2/3 against chips 1/2/3 and Sources rows 1/2/3. The reported "wrong
    numbers" could not be reproduced on a clean notebook: 1/3/5 came from a
    scratch data dir holding duplicate notes from earlier probe runs, so the
    sources list genuinely had five rows. (2) and (3) open.

268. **Mid-work drop, 2026-09-20, verbatim (the owner), with two
    screenshots.** "what is the difference between the exe and msi installer??
    also Cut off after 3 skill steps with barely any tool calls and skills are
    just messy, overcomplicated, not built well so the ai doesn't have all the
    things it needs to complete the actions, maybe to rigid?? Idk but skills
    are just a mess and only semi work. also the empty minimap goes behind the
    top bar and sits right in the corner with no gap. the mini map probably
    shouldnt even appear when the graph is empty."
    The skill screenshot is "Reorganise my categories": steps 1 to 3 ticked,
    the model wrote a proposal and stopped; steps 4 to 9 (the ones that
    actually change anything) never ran. Three things: (1) a skill run that
    stops after the read-only steps, (2) the skill format itself, which the
    owner reads as over-specified and under-supplied, (3) the minimap on an
    empty graph. Decided with the owner the same day: Windows gets an `.msi`
    built with WiX, unsigned for now (an unsigned MSI raises the same
    SmartScreen prompt an unsigned `.exe` does; only an Authenticode
    certificate removes it), and the idle memory work is lazy imports rather
    than idle suspend. Open.

269. **Mid-work drop, 2026-09-20, verbatim (the owner), two messages.** "And
    I was wondering if we should have an ai free version of the guide
    available for users who dont have the ai running or enabled?? like a
    preprepared response or sentence stringing with sentence similarity and
    stuff?? I want to maximise the ability and function of all the application
    features without ai, the ai features should just eb the bonus." Then:
    "maybe there can be a fill-in system response/description/explanation that
    can replace the ai using clever sentence stringing and composition to give
    the user a breakdown of the results on the ask page in place of the ai
    without using the ai when it is disabled or not running?? and it can be
    togglable to see both that response and the ai response when the ai is
    enabled so the user can flick between both outputs... idk im just sprouting
    ideas. but again I actually need you to use your ui and ux design skills
    and the ones vendored in this repo and do a check for signs of being
    vibecoded."
    Two things. (1) An extractive, no-model answer on the Ask page: the
    retrieval, the passage scorer and the grounding all run without a model
    already, so the missing piece is composition, not search. Worth checking
    what already exists before building: the Ask tab has a no-model path and
    the passage scorer produces exactly the spans such an answer would be
    made of. (2) A vibecoded sweep of the UI against DESIGN.md and the
    vendored skills, which the owner has now asked for twice.
    (2) done, `4884ead` and `29d0ccb`, in two passes. The first
    (`scratchpad/ui-sweeps/vibecheck.js`) measured six tells a screenshot
    cannot show across eight tabs: dead controls, leaked values, duplicate
    ids, controls disabled with no reason, controls with no accessible name,
    machine values on screen. 0 findings in all six, 104 buttons checked. The
    second (`vibefail.js`) failed every request and found the real thing: four
    surfaces drew their empty state, so a full notebook read "Your notebook is
    empty", and the dashboard printed "0 this week" from figures it had never
    read. Fixed with one recipe (`surfaceFailed`, in DESIGN.md's index, with a
    lint in `test_ui_recipes.py`); 6 findings to 0. (1), the AI-free answer,
    still open.

270. **Mid-work drop, 2026-09-20, verbatim (the owner), with a dashboard
    screenshot and four MSN/Bing screenshots.** "hit the rest of the open
    items. make sure you complete all of my requests and flagged items. fix
    the codeql and ci errors. fix any bugs you might have missed. also is
    there a way to declutter the dashboard a bit or spread things out a
    bit?? idk it looks good but a lot is happening on it. maybe something
    like the feed layout options with msn on microsoft bing?? the user needs
    to be able to view and access what they want within around 3 clicks and
    they need to know how to instantly access what they want after loading
    the app. maybe the dashboard should have a universal searchbar on it??
    maybe that searchbar can be accessible in a univerally accessible popup
    window like the popup agent and guide??? also can you improve/redesign
    the ui and layout of the guide popup panel at all??"
    **Decisions taken with the owner, 2026-09-20.** (a) The dashboard gets a
    density switch, the MSN "Feed layout" shape: Full (today), Compact
    (Start something collapses to icons, the stats become one line) and
    Focused (search and widgets only, the rest behind More), remembered per
    device. Nothing is removed, so no feature is lost to a layout choice.
    (b) The search is not a feature-finder. The owner: "this is a search for
    any and all content, items, text, files everything. a full application
    wide semantic search which shows content as well as features and actions
    etc. absolutely everything and what shows can be filtered, sorted and
    toggled... similar to the aws search or amazon search bar. a separate
    dashboard search might be good but also a popup window as well would be
    good." Both doorways, one engine. (c) macOS: not yet, written up rather
    than built, because Gatekeeper refuses an unsigned app outright rather
    than warning about it, and notarising needs an Apple Developer account.
    **Checked before building, and this is the finding that shapes the work:**
    `/search` already exists and is exactly what (b) describes.
    `routes_search.py` over `search/engine.py` searches notes, documents,
    boards, files, bookmarks and reminders together, hybrid keyword plus
    semantic, with `tag:`, `kind:`, `in:`, `before:`, `after:`, `has:`, `is:`,
    quoted phrases and `-exclusions` from `search/query.py`, three scores and
    an explanation per hit, and per-kind counts so an empty result can say
    why. **Nothing in the app calls it.** The only reader of anything under
    `/search` in the whole frontend is `settings.js` asking `/search/stats`
    for a number. So the work is a front door, not an engine: the popup, the
    dashboard field, the filters and the sort, over the route already there.
    Measured from the screenshot: above the fold the dashboard stacks five
    "Start something" tiles, four "Jump to" pills, three skill chips, four
    stat tiles and a sparkline, then the widget grid heading, before a single
    widget is visible. Six bands of chrome before any content. The MSN
    reference is its "Feed layout" control: full page, partial view,
    headings, three densities of the same page. Four things: (1) a density or
    layout choice for the dashboard, (2) a search field on it that is the
    obvious first thing, (3) that same search reachable from anywhere as a
    popup, like the command palette already is, (4) a redesign of the guide
    popup panel. Open.

271. **Mid-work drop, 2026-09-20, verbatim (the owner).** "should we have the
    msi and exe installer as an option?? what about mac??" Open; recommended
    answer recorded with the reply: ship both Windows artifacts (an MSI is
    what an IT department deploys, an EXE is what a person double-clicks, and
    both come off one PyInstaller build), and treat macOS as its own decision
    because Gatekeeper is stricter than SmartScreen: an unsigned app is
    refused outright rather than warned about, so a Mac build is only worth
    shipping alongside an Apple Developer account for notarisation.

280. **Mid-work drop, 2026-09-21, verbatim (the owner), one screenshot.**
    "this happens when I press next on the welcome tour". Seen at about
    2000x1140 on the Dashboard: after Next on the welcome tour's first step
    the whole page is dimmed except a vertical strip about 100px wide at
    the right edge (x about 1890 to 1990, the full height, the status bar
    and header included), no tour card anywhere, nothing highlighted. The
    shape of the new four-panel dim (INBOX 274's fix, `.tour-block-panel`)
    drawn around a cut-out that sits off the page's right edge: the step's
    target was not found or not on screen, so its rect was empty or at the
    viewport's right, the panels closed over everything, and the card went
    with the rect. Owner: frontend/tour.js (the welcome tour, the step
    after the first, its target and tab switch), scratchpad/ui-sweeps/
    tour.js. Recommendation: a step whose target is missing or off screen
    after the wait never draws a cut-out; it either skips to the next step
    with a target or draws the card centred with no dim, and the welcome
    tour is driven end to end by the sweep at 2000x1140 as well as 1440 and
    390, pressing Next on every step and asserting a visible card and a
    cut-out inside the viewport each time. To the tour's own agent.
    **Fixed.** The owner's exact trigger did not reproduce from a clean boot:
    the welcome flow's hand-off (`onboardingNext` calls `openTour("basics")`
    on its last Next) was driven end to end at 2000x1140, 1440x900 and
    390x844, and every step had a visible card and an on-screen cut-out, with
    112 pixel samples at the far edges confirming the dim covered them all,
    with the background art on and off. So the mechanism was forced instead,
    which settled it: with the step's control moved off the right edge, the
    cut-out was placed at x 2994 carrying **the previous step's 708px width**.
    `tourSpotlight` clamps `left` to the target and `right` to the window, so
    `right - left` goes negative; `width: -994px` is invalid, the declaration
    is dropped, and the element keeps the size it already had. That is
    CLAUDE.md's invalid-value trap, and since the dim is the cut-out's own
    `box-shadow`, a hole in the wrong place darkens the whole page and leaves
    a band where the shadow's edge falls: the screenshot.
    Two rules now, because neither shows up in the other's output: the clamped
    box is checked before it is written, and a cut-out that cannot be drawn is
    not drawn at all (the card is centred, nothing is dimmed); and a step
    whose control is not really on screen after the wait is dropped so the
    counter renumbers, in `tourShow` and again in `tourReflow` for a control
    that leaves the window mid-step. Measured after, with the control forced
    off the right edge, to a zero-width box and far below the fold: all three
    skip to the next real step ("2 of 3"), cut-out and card on screen.
    `scratchpad/ui-sweeps/tour.js` gained 2000x1140 and drives the welcome
    hand-off, asserting a visible card and an on-screen-or-absent cut-out on
    every step at all three sizes: all pass.

281. **Mid-work drop, 2026-09-20, verbatim (the owner), on branch head
    dce2449, after 274's split-view fix landed (filed as 278 in the agent's
    worktree, renumbered here because the branch took 278 in parallel).** "the documents split view
    scrolling is broken and misaligned". Triage: this is a second report of
    274's third item against a head that already carries the fix, so the
    measurement that closed it (0, 75, 0, 0, 0px on a synthetic five-section
    document) is not evidence about the document the owner has open. Taken
    back by the same agent, to be reproduced the way it is used rather than
    the way it was probed: a real document (frontmatter, an H1 title, long
    wrapped paragraphs, images, a table, a code fence, nested lists, a
    callout, 200+ lines), both directions, three or more positions including
    the bottom, while typing mid-document, across a Live to Split switch,
    after a save, with the sidebar resized, at 1440 and 1024. If nothing
    drifts, the next suspect is a stale asset rather than the mapping.
    **Fixed, and the first fix's probe was the reason it survived.** The
    mapping was right; the measurement of where a block sits in the preview
    was not. `docScrollAnchors` read `block.offsetTop`, which is taken from
    the nearest **positioned** ancestor and not from the pane: measured on a
    real document, 218px past the truth at 1440, 230px at 1024, and 146px
    once the sidebar is collapsed, because collapsing it puts a positioned
    `#doc-layout` in between. A constant bias on every anchor is handed
    straight through the interpolation, so the preview sat that far past the
    line the source was showing at every position, with no pattern to it,
    which is the report. It is the rule `setDocPage` already states in
    app.js, and the first fix did not follow it.
    The old probe read `offsetTop` as well, so the bias cancelled and it
    reported 0px. `scratchpad/ui-sweeps/docsplit.js` replaces it: rects on
    both sides, a document with frontmatter, an H1, wrapped paragraphs, real
    images, a table, a code fence, nested lists, a callout and 220 lines,
    both directions at six headings including the last, in five states
    (baseline, after a mid-document edit, after Live to Split, after a save,
    after the sidebar moves), at 1440 and 1024. Before: worst 444px and
    453px. After: worst 1px in all ten passes. The anchor cache token gained
    both panes' widths, since a pane that changes width rewraps every
    paragraph in it without necessarily changing either scroll height.

277. **Found while fixing 274 (the session, not the owner): a role can say one
    model and run another, everywhere, silently.** 274's "it doesnt use the
    utility model and instead uses the chat model" was not a bug in the Guide:
    `ModelManager.utility_model()` answers the **chat** model whenever no
    utility model has been chosen (the preference ships empty) or smart model
    routing is off, and both are the documented design. The trouble is that
    nothing on screen says so. Four places around the Guide alone print "your
    utility model" as a statement of fact, and the janitor, the weekly digest,
    tidy suggestions and the writing fixes take the same role and say the same
    thing in their own copy. A reader who has set a small utility model and
    then turned smart routing off is told, in five places, something that is
    not true of their notebook, which is exactly how 274 came to be filed
    against the Guide. Recommendation: Settings, Models shows what each role
    **resolves to** rather than what is stored, "Utility model: same as chat
    (llama3.2), because smart model routing is off" beside the picker, from
    one endpoint that reports the resolved name and the reason per role; the
    surfaces that name a role in prose then say "your utility model" and mean
    it. `tests/test_help_chat.py` already pins which model each of the three
    cases takes for the Guide, so the facts are written down; what is missing
    is the app saying them.

273. **Found by the Documents agent, 2026-09-20 (the session, not the
    owner), two things it measured and did not own.** (1) `errors.js` at
    820: "settings/extras section scrolls sideways 496>492", diagnosed with
    `scratchpad/ui-sweeps/extraswide.js` to the embedding-models row's
    `.entry-actions` (right edge 769 against a 765 frame), pre-existing.
    Recommendation: the row's actions take `min-width: 0` and wrap, the
    way the note card's own `.entry-meta` does at that width. (2) The
    shared `enhanceSelect` opener builds its menu from `select.options`
    and never reads an `<optgroup>` label, so grouping in any select is
    invisible to the reader; the templates picker works around it by
    putting the group in each option's words. Recommendation: the opener
    draws a `.select-group-label` row per optgroup, the `.dock-menu-section`
    shape, and the workaround comes out.

272. **Mid-work drop, 2026-09-20, verbatim (the owner).** "also make sure
    all features and alternatives are easily knoticable by and offered for the
    user. like if the embedding model fails or has an error, it suggests to
    download nomic-embed-text. if duck duck go is rate limiting it
    automatically tries searxng and if it isnt installed it suggests it. and
    same for many other instances. I guess the only other really big gap is
    that there is no guided tour and introduction, with positioned popup cards
    with back, next, skip, card tutorial tour numbers 1/?, dimmed background,
    guide on making a note and showing various controlsa and features etc.
    maybe a way for the user to replay it and to even only rerun certain
    sections of the tour for specific main features?? the tour cant be too
    long because I dont want users skipping it or finding it too hard and
    giving up on trying the application.  maximised ui and ux."
    Two things. (1) **Every failure names its way out.** A named class of bug
    rather than a list: when something cannot work, the app says what would
    make it work and offers it, and where an alternative exists it is tried
    first. The owner's two examples are the embedding model (suggest
    `nomic-embed-text`) and web search (fall back from DuckDuckGo to SearXNG,
    and suggest installing it when it is absent). Survey every such point
    before writing any of them: there will be more than the two named.
    (2) **A guided tour.** Positioned cards with back, next, skip, a 1 of N
    counter and a dimmed backdrop; short by design, because a tour long
    enough to skip teaches nothing; replayable whole or by section, so a
    feature can be re-learned without sitting through the rest. There is an
    `#onboarding-overlay` already (the sweeps disable it), so check what it
    does before building beside it. Open.

271. **Mid-work drop, 2026-09-20, verbatim (the owner).** "can you focus on
    refinement now?? refine everything, make sure all utility works and there
    are no bugs. make things faster, optimise, reduce complexity. enhance
    capability. what about the no ai available sentence string concatenation
    search results for the help agent and ask response??" The named half is
    built: the Guide answers from its own help text with no model (`9f715c4`),
    and the Ask tab quotes the passage of each retrieved note that is about
    the question (`ai/extractive.py`). The standing half, refinement, is the
    session's own order of work from here.

## Placed (last 20, newest first)

- 2026-09-13: 128 placed in DOCUMENTS_PLAN.md.
- 2026-09-13: 162, 159 placed in WORLD_CLASS_PLAN.md.
- 2026-09-13: 165, 164 placed in UI_MODERNISATION_PLAN.md.
- 2026-09-08: dashboard hero preference, New note tile colours, sub-tab
  arrow keys, Files reading, sidebar toggle, mindmap bugs, line numbers,
  docks as one bar, timeline redesign, responsive design, em-dashes,
  paragraphs to popovers, security review: all placed (HANDOVER "flagged
  list") and most built.



275. **Found by an agent, 2026-09-20, the graph's full screen spends one
    Escape on two things.** With the map in full screen, opening the
    lightbox (the node panel's attachment, a document) and pressing Escape
    closes the lightbox *and* leaves full screen, in one press. Measured
    with `scratchpad/ui-sweeps/graphfslightbox.js`: lightbox gone true,
    still in full screen false. The cause is named in the app's own
    comments and is one word out of date: the full-screen listener
    (`app.js`, "Escape leaves full screen") says it is "placed after the
    popover handlers above so a help panel or a note popup open over the
    map takes the first Escape and the map takes the second", but listener
    order does not stop an event. The graph options panel's own handler
    calls `stopPropagation` and therefore really does spend the key ("The
    Escape is spent here", app.js); `openLightbox`'s `onKey` does not, and
    neither does anything else that opens over the map.
    Recommendation: the full-screen handler asks whether anything is open
    over the map before it acts (the app already has `activeOverlay()`, and
    the lightbox sets `role="dialog"` precisely so it is inside its reach),
    rather than every overlay in the app having to remember to stop the
    key. Owner: GRAPH_PLAN, Phase 2's chrome row. Size S.

276. **The sketch pad's toolbar wraps to two rows at 820 on Large text**, and
    has since before this session: `scratchpad/ui-sweeps/sketchbar.js` reports
    `rows=2` at 820/large-text (content 712 of an inner 714) and at
    820/large+spacious (688 of 690), while 820/default and 820/spacious are
    one row. The Canvas group is the one that drops. Found while giving the
    ink dots a finger-sized target (the same sweep), not caused by it: the
    dots only change below 820. Recommendation: the bar is five groups and
    Large text buys their labels about 10px each, so the cheapest honest fix
    is the group labels, not the controls: hide `.wb-tool-section-label`
    below 1024 the way the phone band already hides other labels, and
    re-measure; it is worth about 60px, which is more than the 2px the wrap
    is short by. Owner: whoever next opens the pad's bar.
