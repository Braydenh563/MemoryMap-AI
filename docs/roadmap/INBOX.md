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

264. **Mid-work drop, 2026-09-20, verbatim (the owner).** "can you also make
    more sub-menus in the documents meatball button dropdown or smth because
    it is still almost off the bottom of the screen."
    A screenshot of the open menu, fourteen rows deep, its last row level
    with the status bar.
    **Fixed** (`4e93458`): two more groups, "Editor and layout" and "While
    you write", taken from the groupings the markup's own comments already
    argued for. 562px and 14 rows to 346px and 8, measured at four window
    sizes; it had been running 32px past the bottom at 1024x720 and now
    clears it by 184px. A live bug fell out of it: a row inside *any* of
    these flyouts had stopped closing the menu since the downloads were
    folded, because `buildMenuGroupButton` reparents the panel to `<body>`
    and the click never bubbles through the group the listener was on.

265. **Mid-work drop, 2026-09-20, verbatim (the owner).** "also can you fix
    the highlighter in the quick sketch?? it doesnt act as it should and
    looks messy"
    **Fixed** (`6abc459`). Third report on this tool; the first two fixes
    treated the alpha and this one is the compositing. Each segment was its
    own `stroke()` at 0.35, so consecutive segments overlapped at every joint
    and each pixel was covered about three times: measured 0.801 coverage
    where the tool asks for 0.35, 0.725 to 0.824 along the band, and a
    self-crossing going 0.286 to 0.824. The stroke is now drawn whole on its
    own layer at full opacity and composited once. After: 0.353 everywhere,
    spread 0, junction 0.353.

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

## Placed (last 20, newest first)

- 2026-09-13: 128 placed in DOCUMENTS_PLAN.md.
- 2026-09-13: 162, 159 placed in WORLD_CLASS_PLAN.md.
- 2026-09-13: 165, 164 placed in UI_MODERNISATION_PLAN.md.
- 2026-09-08: dashboard hero preference, New note tile colours, sub-tab
  arrow keys, Files reading, sidebar toggle, mindmap bugs, line numbers,
  docks as one bar, timeline redesign, responsive design, em-dashes,
  paragraphs to popovers, security review: all placed (HANDOVER "flagged
  list") and most built.

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

