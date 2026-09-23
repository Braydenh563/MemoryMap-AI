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

320. **The owner, 2026-09-21, verbatim:** "the numbers only appear after the
    ai response is finished" (in the Ask tab's Matching records column). Open,
    and it is closer to a design question than a bug: the numbers are the
    answer's own citation markers, so a record can only be numbered once the
    sentence citing it exists. `numberMatchingRecords` runs from the grounding
    pass, which runs when the answer is complete. Two honest options: number
    each record the moment the first marker naming it is placed, which needs
    grounding to run per sentence as it streams rather than once at the end,
    or say in the column that the numbers arrive with the finished answer.
    Recommendation: the first, and it pairs with INBOX 318 (not every marker
    appears), because both live in `ground_answer_sentences` and both want it
    incremental. Measure `askgrounding.js` before and after.

319. **The owner, 2026-09-21, verbatim, with two screenshots of a note
    card's connections row:** "also the buttons in these connections in notes
    need a redesign and look". Open. Each connection is a chip carrying a
    direction arrow and a truncated label, followed by three round icon
    buttons (edit, block, remove) of the same size and weight as each other,
    so a row of three connections is nine identical circles and the labels
    read as captions between them. The label's cut is fixed separately (the
    character cap rose from 28 to 48), but the shape is the ask here.
    Recommendation, to measure before building: the three actions belong
    behind the `kebabMenu` recipe the rest of the app uses for exactly this
    (DESIGN.md's recipe index, standing order 11), leaving one chip and one
    ⋯ per connection, which also gives the label the width the three buttons
    were taking. Owner: WHITEBOARD_PLAN is the wrong home; this is the notes
    surface, so DOCUMENTS_PLAN or a Placed from INBOX row in
    UI_MODERNISATION_PLAN.

318. **The owner, 2026-09-21, verbatim, with a screenshot of an Ask answer:**
    "not all inline reference number links show, only one showed in the
    response". The answer carries one superscript marker against a paragraph
    that draws on several records, and the Grounded in row below it lists
    three notes (1, 4 and 10) while the column holds five. So the grounding
    found more than the answer shows. Open, and worth measuring before
    theorising: `ground_answer_sentences` marks a sentence only when it can
    attribute it (`MIN_SENTENCE_WORDS`, the distinct-sentence rule in
    `grounding.support`), so the first question is whether the missing markers
    are sentences it declined to attribute or markers it attributed and the
    renderer dropped. `scratchpad/ui-sweeps/askgrounding.js` against
    `scratchpad/fake_answer_server.py` is the probe that already counts them.

317. **The owner, 2026-09-21, verbatim, two messages with screenshots of the
    whiteboard text box context bar:** "the textbox selection popup tools
    menu items are cut off and also not aligned" and "when I press the
    meatball button the menu appears up top with no connection to the tool
    menu". Open. Two faults on one surface: the bar's own items (the Size
    field clips its number, and the icon groups do not share a baseline), and
    its kebab, whose menu lands far from the bar with nothing tying it to the
    button that opened it. The second is the same family as INBOX 290's table
    menu: `openActionMenu` reparents a menu to `<body>` when it would be
    clipped, and then positions it from the opener, so a bar that is itself
    `position: fixed` inside a transformed board is the case where that
    arithmetic goes wrong. Measure the bar's items and the menu's box against
    the opener before changing either.

312. **The owner, 2026-09-21, verbatim:** "also why is the graph soo smooth
    and clean to move nodes around, zoom and more when the whiteboard and
    especially the mindmap are still horrendous and all the links lag
    behind??" Answered from the code rather than guessed, and it is one
    architectural difference. The graph draws to a single `<canvas>` 2D
    context (`graph-canvas.js`, `getContext("2d")`) with its force simulation
    in a **web worker** (`new Worker("/graph-worker.js")`), so a drag or a
    zoom is one repaint of one element and the physics never touches the main
    thread. The whiteboard and the mind map draw every card as a DOM element
    and every link as an SVG `<path>` whose `d` attribute is recomputed and
    rewritten in JavaScript (`whiteboard.js`, `setAttribute("d", ...)`). A
    card can be moved by the compositor with a transform, but each link has
    to be recalculated on the main thread and written, so the link arrives a
    frame or more after the card it is attached to. That is the lag, exactly
    as described. Today's render pass (MINDMAP_PLAN 13a-open) keyed the
    repaint and cut a 500-topic change from 534.7ms to 47.8ms and a branch
    drag over 300 link sketches from a 1,000ms worst frame to 116.7, but it
    did not change what the board is made of: pan and zoom are still the
    browser re-rastering one promoted layer holding every topic, measured at
    2.6ms of script across a 2,239ms zoom gesture. Recommendation: this is
    MINDMAP_PLAN row **13a-view**, already written with its gate (worst pan
    and zoom frames under 50ms at 500 topics), and the honest fix is the one
    the graph already took, a canvas for the links at least. Open, as a
    decision about how far to take it.

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
    **(6) done 2026-09-21**, measured on a real full filesystem: an 80 MB
    tmpfs mounted as the data dir and filled to 100%, the app driven against
    it. Already right: saving answered 507 with a sentence about disk space,
    and reading, searching and exporting kept working throughout. Three
    things were not. **Unlocking answered 507**, so a full disk locked the
    person out of their own notebook entirely, over the audit row written
    beside it. **A failed backup left a zero-byte file named like a backup**,
    which listed as one, passed `PRAGMA integrity_check` (an empty file is a
    valid empty database) and would have replaced the whole notebook with
    nothing if restored: a full disk turning into total loss through the
    app's own restore button. **A failed upload or export left its
    half-written file behind**, orphaned, holding the space the person was
    short of. All three fixed, plus one ASGI `SpaceGuard` that refuses a
    write bigger than the room left before a byte of it is read, so the app
    can no longer fill the last megabyte and lock itself out. After, on the
    same full tmpfs: unlock 200, reads 200, save 507 naming the folder and
    `0 bytes free`, a 1 MB upload refused up front asking for 3.0 MB, backup
    507 with nothing left behind, every write working again the moment space
    was freed. The 507's sentence now reaches every toast in the app and
    Settings, Data carries a `.notice notice-warn` line when space is low
    (`scratchpad/ui-sweeps/diskspace.js`, PASS in both themes).
    **(7) done 2026-09-21**, both halves. *Idle compute*: with no browser
    attached the server is asleep, 0.04s of CPU across 23 threads in 30
    seconds (0.13% of one core), because every background piece blocks
    rather than polls. The cost is the open tab: two HH:MM clocks ticking
    once a second and a model-status poll asking twice a minute for ever.
    The clocks are scheduled on the wall-clock minute now and the poll
    doubles to a two-minute ceiling while the answer does not change,
    dropping back to 30s on any change, on returning to the tab, on opening
    Settings or on starting a job. Measured with `idle.js` (which now counts
    timer *fires*, not only live intervals) and the new `idlecpu.js`: **timer
    wakes in an idle visible minute 124 to 5, requests 4 to 2, idle CPU
    6.01%/6.11% of one core to 5.50%/5.59%.** Found, not fixed, and a
    decision for the owner rather than an agent: nearly all of what is left
    is the Dashboard's emblem animating at 24fps because it was asked to,
    which the same probe prices at 5.55% on the Dashboard against 2.09%
    parked on Notes. *SQLite*: the answer is written down as a decision in
    `docs/ARCHITECTURE.md` ("Why SQLite holds the notes"), with its reasons,
    its numbers and where it would stop being right, so it does not have to
    be argued a fourth time. No migration started, and the serverless
    question is answered in a paragraph there rather than left hanging.
    Still open on this entry: (1), (2), (3), (4) and (5).
    **Checked 2026-09-23.** (2) built: `release.yml` ships
    `MemoryMap-AI-<version>-linux-x86_64.tar.gz` beside the zip. (3) built and
    then switched off (`b7b15c7`, WiX v7's fee terms; see 271, resolved). (4)
    built: every artifact name carries version, platform and architecture
    (`MemoryMap-AI-Setup-<version>-windows-x86_64` in `installer.iss`, the
    MSI and both Linux archives in `release.yml`). Left: (1), the usability
    and information-architecture read, and (5), lightweight, whose decided
    shape is lazy imports (268).

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
    **Checked 2026-09-23.** (3) built: an empty graph lays the minimap out of
    the way (`graph.js`, the comment quoting this entry;
    `scratchpad/ui-sweeps/graphminimap.js`). (1) and (2) are
    AGENT_SKILLS_REFORM's, whose Phase D was verified against a real small
    model on 2026-09-20; what that plan still holds is its evals breadth.

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
    **Checked 2026-09-23.** (1) built: `DASH_DENSITY_KEY` and the Full,
    Compact and Focused levels in `dashboard.js`. (2) and (3) built: the
    finder reads `/search` (`app.js`, `finderRun`, `Ctrl+P` in
    `DEFAULT_SHORTCUTS` as "Find anything"). (4) partly: INBOX 274 fixed the
    guide panel's title, model, thinking and streaming; a redesign as such has
    not been done and is the one part left.

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

    **Part 1, done 2026-09-21.** Surveyed first (`WORLD_CLASS_PLAN.md`
    section 21's table, 14 points, grepped against the running app before any
    fix): the two named examples, and most of the class around them, were
    already built across several earlier sessions (`core/extras.py`'s
    install-from-Settings registry, DuckDuckGo-to-SearXNG with a local
    auto-discovery probe, scanned-PDF and OCR remedies). Two real gaps
    remained and are fixed: Agent mode silently downgraded to a plain answer
    when the model couldn't call tools, with nothing shown and no way to fix
    it (`routes_chat.py` used to `pass` on the event); it now shows a
    `.notice.notice-warn` line naming the model with a "Change the model"
    button straight to Settings, Models, and a skill run that stops mid-way
    for the same reason names the same fix in its step card. A doc gap too:
    `requirements.txt`'s "Optional extras" comment had drifted behind
    `core/extras.py`'s own allowlist, missing three installable extras; both
    fixes are held in place by `tests/test_failure_remedies.py`. Two points
    read as still weak and are not fixed (a wrong custom provider URL reads
    identically to "not installed"; the embedding-error box uses `.status
    .error` rather than the `.notice.notice-warn` recipe), recorded in the
    table rather than guessed at. Part 2 (the guided tour) stays open above;
    `tour.js` was read for the survey and not touched.
    **Checked 2026-09-23.** Part 2 was built (`frontend/tour.js`, INBOX 274
    fixed three faults in it) and then switched off by the owner on
    2026-09-21 ("disable the start the tour button ... until we enable it
    again when the guided tour isnt broken"; `TOUR_ENABLED` in tour.js,
    `4beba07`). What is still broken was not written down, so the next step
    is to run `scratchpad/ui-sweeps/tour.js` and ask the owner which step
    fails, and the switch stays the owner's.

302. **Found by the repository read, 2026-09-21 (the session, not the owner):
    a decision for the owner.** needle (cactus-compute, Apache-2.0 for both
    the code and the Hugging Face weights) is a 14MB tool-calling and
    extraction model that runs through a prebuilt native engine by `ctypes`,
    with grammar-constrained output and a calibrated confidence, and no
    prose. Bundling it would give the agent a tool-calling path on a machine
    with no Ollama, which is the one thing this app cannot promise today;
    against it, a third inference path beside the two HTTP providers, a
    Hugging Face download at first use, and a shipped binary whose telemetry
    is on unless two environment variables are set. Recommendation: not now,
    and revisit only if "works with no Ollama installed" is to become a
    product promise. The cheap half of the same read (ANALYSIS.md, "Twenty-four
    repositories read for MemoryMap, 2026-09-21", needle items a and b) needs
    no decision and is worth doing either way.

303. **The owner, 2026-09-21, verbatim, with the session's reading beneath
    it:** "it'd be cool if the user can upload songs or connect an in-app
    player to a player or maybe even spotify or youtube music but idk if
    that's offline only anymore...". The local half is a recommendation, not
    a decision, and is in the ANALYSIS.md section named above. The streaming
    half is his: today `routes_settings.py:220` calls web search "The ONE
    feature that goes online, off unless the user opts in",
    `routes_websearch.py:31` says the same in its 403, and
    `dashboard.js:1277` says it to the person, so a Spotify or YouTube Music
    connection would make that sentence false in three places, on top of an
    OAuth flow, a cloud account and a stored token. Recommendation: leave the
    promise absolute and build the local folder player instead; if it is ever
    reopened, it is a second clearly labelled opt-in extra, off by default,
    and the copy in all three places changes in the same commit.

## Placed (last 20, newest first)

- 2026-09-13: 128 placed in DOCUMENTS_PLAN.md.
- 2026-09-13: 162, 159 placed in WORLD_CLASS_PLAN.md.
- 2026-09-13: 165, 164 placed in UI_MODERNISATION_PLAN.md.
- 2026-09-08: dashboard hero preference, New note tile colours, sub-tab
  arrow keys, Files reading, sidebar toggle, mindmap bugs, line numbers,
  docks as one bar, timeline redesign, responsive design, em-dashes,
  paragraphs to popovers, security review: all placed (HANDOVER "flagged
  list") and most built.



