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

315. **The owner, 2026-09-21, verbatim, with a screenshot:** "I pressed next
    on the first thing of the guided tour and this happened, the guided tour
    is still broken". The screenshot is the Reminders tab with no tour card
    and no dim: the tour is gone, not stuck.

    Read from the code, not yet reproduced. `tourShow` drops a step whose
    target is not `tourVisible` and `tourOnScreen`, splices it out of the run
    and continues; if every remaining step is dropped the loop falls through
    to `tourClose(true)`, which ends the tour silently wherever the last
    `tourNavigate` left you. That is exactly the screenshot: Next navigated
    to a step's tab, the target was not judged on screen, and the rest of the
    run was eaten one step at a time until the tour closed on Reminders.

    The likely cause is the judging, not the steps: `tourWaitForTarget` waits
    for the element to exist, but a tab that has just been switched to has
    not necessarily laid out, so `tourOnScreen` can be asked before the
    answer is meaningful. Two things to fix together: wait for layout (a
    frame, or the element having a non-zero box) before judging, and **never
    let the run empty itself in silence**: a tour that cannot find its next
    step should say so and stay open on the step it has, because a tour that
    vanishes mid-gesture is the third report of this surface being broken and
    it reads as the whole feature failing.

    Note against the earlier fix: today's tour work (the dim moved off
    `.tour-spot` onto four panels, `toursteps.js` 24 of 24 across three
    widths and both themes) measured the steps that survive. It never
    measured a step being dropped, so the probe would pass with this bug
    present. Whatever fixes this must add a gate for the drop path.

314. **The owner, 2026-09-21, verbatim, a regression in the reading
    workspace on a scanned PDF:** "on the ocr workspace, I have previously
    used an ocr model to read this scanned pdf document and I could scroll
    through the pages and the ocr extracted text would scroll and if I
    clicked on a specific text setcion, it would go to that page scroll wise
    on the pdf. but now I can only view the extracted text on a single page
    and even when on scroll mode I cant scroll and the tesseract generates it
    continuously not only the first time or when prompted by the iser".

    Three faults, and the third is diagnosed already, from the code, without
    a reproduction:

    (3) **Tesseract re-runs on every page view, and in scroll mode on every
    page you pass.** `ocrLoadPage` (library.js) fetches
    `GET /media/{id}/ocr-regions?page=N` each time the current page changes;
    that route calls `_regions_for`, which calls `ocr.extract_regions(path)`
    unconditionally (`routes_files.py`). There is no cache and no stored
    result: the route's own neighbour says it plainly, "`extract_text`/
    `extract_and_store` have no write-once guard of their own, every call
    re-reads the image". In scroll mode the IntersectionObserver moves the
    current page as you scroll, so scrolling a fourteen page scan runs
    Tesseract fourteen times. That is the owner's "continuously". Fix: the
    regions for a page are a property of the page, so store them the way a
    page read is stored and serve the stored copy, running Tesseract only on
    an explicit read or when nothing is stored. Do not gate it on the "show
    boxes" checkbox alone: the cost must go, not move.

    (1) and (2), **the text pane no longer scrolls with the pages and no
    longer jumps the PDF when a section is clicked, and scroll mode does not
    scroll.** Not yet reproduced; both need a real scanned multi-page PDF.
    Two things to check first, before assuming the feature was removed:
    `ocrSetViewMode` computes `continuous = ocrViewMode === "scroll" &&
    ocrIsPdf(image) && ocrWorkspacePages > 1`, and silently falls back to
    single-page mode when any of the three is false, so a page count not yet
    known reads exactly like "scroll mode does not scroll"; and the view-mode
    control itself (`#ocr-view`) ships `hidden` and is revealed conditionally.
    The scrolling text pane and click-to-page are what the entry calls a
    regression, so check the history for when they worked rather than
    rebuilding them (CLAUDE.md section 1).

313. **The owner, 2026-09-21, verbatim, with a screenshot of the Files
    sub-tab:** "there should be a way to copy all extracted text in a
    document in the ocr workspace and files subtab". Fixed, and it was half
    built. The OCR workspace has had `#ocr-copy-all` ("Copy everything read,
    in reading order") wired to `ocrAllText()` for some time, but it was
    `icon-only` among labelled buttons, which is a control nobody reads; it
    carries the words "Copy all" now, like Describe beside it. The Files
    sub-tab had nothing at all: the reading box is capped and scrolls, so
    copying a fourteen page reading meant dragging through a window. A "Copy
    text" button now sits beside Open reading in the reading panel's head and
    copies `mediaReading(image)` whole.

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

311. **The owner, 2026-09-21, verbatim, with a screenshot of the status bar
    menu:** "when I load up the application, the bottom nav history dropdown
    shows me being in the notes tab and having been to the notes tab even when
    I havent moved from the dashboard". Fixed. Reproduced first
    (`scratchpad/ui-sweeps/navhistory.js`): on a fresh load that never left
    the Dashboard the stack was `["notes:browse", "dashboard",
    "notes:browse"]` with the pin on the last entry, so the history said you
    were in Notes while the Dashboard was drawn, and Back walked to a place
    nobody had been. Two boot steps set the Notes tab's default section while
    it was hidden (`initNotesSubtabs` selects whichever section was last open,
    and the first `loadEntries` selects browse), and `showNotesSection`
    recorded each as a visit. Setting a hidden tab's default section is not a
    navigation, so the recording is now guarded by Notes being the tab on
    screen. After: `["dashboard"]`, Back correctly dead, one move records one
    step, one Back press returns. 10 of 10, and
    `tests/test_nav_history_seed.py` holds both halves (the guard, and the
    boot seed that must stay).

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
    **(2), (3) and (4) checked and closed out (Sonnet, packaging worktree).**
    (2) and (3) were already built before this pass: `ee99f00` shipped the
    Linux `.tar.gz` (a zip loses the executable bit on several extractors,
    measured) and `9eea17d`/`f0d478b` shipped the `.msi`
    (`packaging/windows/installer.wxs`, unsigned, per-machine, with its own
    "Repair MemoryMap AI" shortcut per INBOX 253), both already on this
    branch. Nothing rebuilt. (4) was mostly done in the same commits (the
    `.msi`, `.tar.gz` and `.zip` filenames all already carry
    `<name>-<version>-<platform>-<arch>`, and `installer.iss`'s
    `OutputBaseFilename` already gave the `.exe` the same shape); the one
    real gap was a lint: nothing asserted the `.exe`'s own filename
    (`installer.iss`, set independently of `release.yml`'s upload glob,
    which would still match a name with the platform dropped) carried its
    version, platform and architecture, so a future edit could quietly
    regress it with nothing catching it. Added
    `test_windows_exe_filename_carries_name_version_platform_and_arch` in
    `tests/test_release_smoke_step.py`, alongside the MSI and zip
    equivalents that already existed. The naming scheme itself is now
    written down as a decision in `WORLD_CLASS_PLAN.md`'s H6 rather than
    left implicit in code comments. Not verified: no tag push or Windows/
    WiX runner exists in this sandbox, so none of this was checked against
    a real release run, only against the workflow and installer sources as
    text. (1), (5), (6) and (7) remain open, somebody else's.

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



309. **The owner, 2026-09-21, verbatim:** "there is also no way to attach a
  whiteboard or mindmap to a note as like an object in the notes. or to link
  reminders to notes"

  The session's reading, from the code, not from the app: notes already carry
  typed objects (`objects` on a note, the chip row on a card, INBOX 246's
  "boards via objects" work), and a board or a map is a first-class row with
  an id, so the missing piece is an object kind that points at one plus the
  two doorways that make it reachable (a slash command in the note, and "add
  to a note" from the board and map themselves). Reminders are the other
  direction: a reminder has a row of its own and no column that names the
  note it came out of, so a reminder made from a note loses the note, and a
  note that caused three reminders cannot show them. Both are one shape,
  "this note and that thing are the same piece of work", and they belong in
  DOCUMENTS_PLAN beside the objects section rather than in a plan of their
  own (standing order 8).

