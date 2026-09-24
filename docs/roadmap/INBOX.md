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

425. **The owner, 2026-09-24 (after the usage reset), with screenshots.**
    Avatars: (a) "the avatar shows even when the app is on the lock screen.
    it should only show when the app is unlocked"; (b) "is there a way to
    make the corner companion more lifelike and less a circle just chilling
    somewhere on the screen?? give it life", and "an adaptive companion
    avatar placement feature where set areas are assigned as possible areas
    for a companion to sit or chill around while not being in the way on
    every interface and page. and the companion can even interact with the
    close ui like hand from a top bar, sit on a bottom bar, walk a top a
    feature ... just so I dont move it to one area, and then it is annoying
    for it to be there on another page"; (c) "may shuffled avatar reset and
    didnt persist"; (d) "how does the shuffle work?? does it still base it
    on what is entered for the name??"; (e) "I want the persona avatar to
    appear next to where you set the persona for the dashboard greeting";
    (f) "I set the dashboard greeting to another persona, but when I hit
    regenerate, it said asking Atlas"; (g) "I changed personas for the
    dashboard greeting and the avatar/icon changed as I had set it, but when
    I changed the persona again, it didnt change again"; (h) "the whole
    thing with the avatars needs a proper polish and bug fix ... a full ui
    and ux upgrade to properly fit the application". Documents: (i) "can
    there be a document full screen mode so there is more space ... maybe
    the top bar needs a bit of redesigning or the interface on the document
    editor needs a bit of visual adjusting to allow for more room. also
    tables are still really annoying to use and edit in the documents live
    view". Settings: (j) "remove the need for saving preferences in the
    settings and just have it auto save like the rest of the settings";
    (k) "should these text boxes be aligned to the right??" (the
    Preferences number fields); (l) "Improve how custom theme cards are
    displayed" (name truncated "Sea of P...", delete button crowding it).
    Dashboard: (m) "the search bar on the dashboard has a glass aesthetic
    even when it is off". Backgrounds: (n) Mycelium start points more
    organic, smoother faded transitions; (o) optimise Microbes (both sent to
    the backgrounds agent). (p) "see if there are any more areas to reduce
    lag ... like the avatars and other animations" (the audit agent, 424).

423. **Found, not fixed, by the agents of 2026-09-24 (placed for the next
    pass; one line each, recommendation first).** (a) The mind map's pie
    ring does not take focus when it opens, so Enter and the arrows still
    act on the board while it shows: recommend it takes focus when opened
    from the keyboard only. (b) DOCX export writes `:::columns`, `[TOC]` and
    `[!kind]` as plain text: map them to Word columns, a TOC field and a
    shaded box. (c) Inline `$x$` maths is plain symbols in Read view: render
    it through the same TeX-to-MathML path as `$$`. (fixed: `INLINE_MATH_RE`
    (app.js) now claims a `$…$` span with no space inside either delimiter
    and no digit right after the close; `unlatex` carries it through
    untouched instead of symbol-swapping it, and `renderInlineMarkdown` cuts
    it out and draws it with `mdInlineMathElement`, the same `docMathRender`
    the `$$` blocks use. `tests/test_inline_math.py`.) (d) The OCR workspace's
    message for a vision reading still suggests installing Tesseract: word
    it by reader. (fixed: `_regions_for` (routes_files.py) checks
    `ocr.tesseract_available()` before wording the "no page positions"
    message; installed but not chosen now says "Switch to Tesseract", missing
    still says "Install Tesseract". `tests/test_ocr_regions.py`.) (e) At
    150% zoom the lightbox picture overlaps its caption
    line. (f) Stored readings that already contain a repeated-line loop are
    not cleaned: offer "Clean up" in the reading menu. (fixed: a broom
    button beside Delete reading, in the OCR workspace and the lightbox's
    other-readings list, POSTs `/files/{id}/ocr-clean-loops` or
    `/media/{id}/ocr-clean-loops`, which runs `cut_reading_loops` over
    whichever of `vision_ocr_text`/`ocr_text` are set and saves what
    changed; the panel repaints from the response. `tests/test_ocr_clean_loops.py`,
    live-checked with `scratchpad/ui-sweeps/ocrcleanloops.js`.) (g) `_desktop_port()`
    treats any MemoryMap on the port as ours, whatever its data dir: compare
    the data dir in `/instance` first. (h) Chat replies saved before
    2026-09-24 always show Atlas's mark (their persona was never stored).
    (i) The server-mode process takes 5 to 9s to exit after uvicorn
    finishes: find the thread that holds it. (fixed: every sync route
    (almost all of them) runs on one of anyio's own "AnyIO worker thread"
    objects, which is not a daemon thread and only stops itself on a
    done-callback that can miss `uvicorn.run()` tearing the loop down;
    measured leaving one alive, `daemon=False`, right after "Finished
    server process". `_stop_lingering_worker_threads` (`__main__.py`,
    called right after `uvicorn.run()` returns) asks it to stop and bounds
    the wait to 1s. `tests/test_server_shutdown.py` reproduces the leftover
    thread with a real `uvicorn.Server` running `create_app()` and checks
    the fix clears it.)
    (j) `gate.sh --sweeps` on 25d7d56 (fixture data dir /tmp/mm-me):
    asktab.js 3 findings, libreadingfoot.js "reading visible: false" and
    "no card with a reading", tagoffer.js 2 failures (manual route and the
    empty tag row flag). Triage each as app bug or stale sweep before
    fixing; the reader's 36px page box is fixed (25d7d56).

421. **The owner, 2026-09-24, verbatim, with screenshots (placed in agent
    briefs, two at a time).** (a) "in the radials on the mind map, the items
    like "add beside" and "cross-link" are very close to the edges (inner and
    outer) of the radial and arent centered nicely. also when I press the
    more button the dropdown menu appears in the top left of my screen"
    (desktop app; the pie-ring agent could not reproduce the corner with a
    real click). **(a) built** (INBOX 421 agent): labels centred with 10px to
    both arcs and dividers (1.4 -> 11.4px, mapradialfit.js); More anchors to
    the sector read at pointerdown, (0,0) refused and logged, the canvas host
    no longer scrolls on focus (mapradialmore.js 33/33). The desktop corner
    itself was still not reproduced headless: the console now names any
    corner placement, so the owner's log will say which route it was. (b) "the / command blocks and frames need a massive
    redesign, expansion and improvement, the icons dont render in the live
    view in the documents editor ... they need ot be impressive and an actual
    proper thing the user's can use to properly structure out their
    documents and notes." (live-view callout icon fixed 6e072b2; built
    2026-09-24: the grouped block inserter, 14 callout kinds, columns in
    notes, contents, rules, cited quotes, maths, the block bar and document
    cards, `slashmenu.js`, `blocksrender.js`, `blockbar.js`.) (c)
    "sometimes document editor dropdowns appear at the top of the screen and
    other times it is fine, sometimes it doesnt open at all" (the spelling
    menu, top of the window; fixed 2026-09-24: placed from the
    finding, never a detached element's empty box; the double-click's first
    press; the "/" menu follows a scroll; `menuanchor.js` 15/15). (d) "there's no 'x' close button on the trace
    popup row in the graph" (**built**: an X at the strip's end that leaves
    trace mode; Done only cleared the ends; graphtraceclose.js). (e) OCR: "I cant delete the ocr entry in the
    workspace or the lightbox and the text in the lightbox doesnt even appear
    in the ocr workspace" (workspace delete fixed 6e072b2; the lightbox
    showed a vision reading of "Test, Test, ..." hundreds of times, a
    degenerate model loop the app should cut; **built**: loops cut where a
    reading is produced, each lightbox reading deletable, the workspace shows
    both stored readings and no longer blanks a stored one when the reader
    is the model; ocrreadings.js 6/6). (f) The file row in the
    Library ("PDF · 121 KB · added ... Read · 808 words, Open reader, Used
    in"): "needs a bit more modern and ui refinement and the second row
    elements arent aligned and dont really match" (fixed: one size, one
    line box, middot groups, "Read this" a link). (g) "the lightbox buttons
    below the image are greyed out?? i opened the image from within a note".
    (**built**: not disabled, the row was the theme's ghost ink on the dark
    scrim, 1.37:1 in light from every door; now the scrim's own recipe,
    8.28:1; lightboxentry.js) (h) View toggles with no clear active state (fixed c920174). (i) "have
    you included all the new optional packages in the packages settings
    page??" and "move the preferences settings page up a bit and maybe also
    turn it a bit into the user's own personal local profile where they can
    put info about themselves and their name for the ai to use as context
    and there can also be the generated profile image". (j) "I clicked a note
    linked in the sources of an ai chat reply and it took me to that note,
    but when I pressed the back navigation button it opened the settings
    panel??" (not reproduced: chat then flashEntry then Back lands on chat,
    also with chat opened from inside Settings; needs the exact path).

419. **The owner, 2026-09-24, verbatim.** "in the whiteboard, the arrange
    dropdown menu appears above the top bar, cutting off the contents" (only
    the Order rows showed) and "clicking the meatball button on the popup
    tools menu when selected on a text box or sticky note on the whiteboard
    doesnt show any dropdown menu, or it flickers for a seck somewhere to the
    right then disappears". **Not reproduced** in headless Chromium, on the
    head after `ccd1b48`: Arrange opens under its button at 1440x900,
    1184x760, 1366x600, 1280x480, 1024x768, 947x608, 820x700, 700x900, in
    full screen, with touch, at 125% scale with real scrollbars, dark
    (`wbmenuroom.js` 36/36); the context bar's ⋯ opens beside the bar and
    stays for a sticky and a text box, selected or being edited, by click
    or tap, after a render, a state fetch, a resize, and with the pointer
    wandering over the canvas and onto the menu. Every placement path read
    (`placeEscapedMenu`, `wbKeepMenuBesideBar`) can only put Arrange above
    its button when the window has less room below than above, which the top
    bar never has. Both reports come from the desktop window (WebView2); the
    next step needs the owner: the window size, whether the top bar was
    dragged, and a screen recording of the ⋯ case. Recommendation: ask.

413. **The owner, 2026-09-24, verbatim, with a chat screenshot.** "I was in a
    document in the editor, I opened the suggestions panel and pressed check
    with ai, it took me to the chat and a popup above the chat suggested that
    there was a skill available for my requests, it wasnt entirely accurate
    so I closed it by clicking the 'x' on it and then the whole new chat page
    started viciously stuttering jumping up and down slightly really fast."
    Not reproduced headless (with real scrollbars, at 700 to 1048 tall, the
    dismiss gives one flip, not a loop). The one self-feeding path found is
    fixed: `fitChatEmpty` took its own class off to measure inside a
    ResizeObserver; it now reads stored heights with 4px hysteresis, and
    `#chat-messages` keeps a stable scrollbar gutter. Then the owner's log:
    "ResizeObserver loop completed with undelivered notifications", many a
    second, after opening and widening the web panel. The observer now only
    records the size; the fit runs a frame later, for changes of 2px or more,
    at most one flip per 500ms (`o-webpanel.js`: 0 loop errors, 1 flip across
    a 300 to 700px drag, 0 while still). Open until the owner's next run; the skill match being "not entirely accurate" is placed with
    the documents' Check with AI rework (INBOX 410).

411. **The owner, 2026-09-24, verbatim, with the board export dialog and
    two lightbox screenshots.** "is there a way to better design all
    instances of these menu bar elements in popups and the like?? I think
    there's a better way to visualise them?? also I exported a mindmap
    selection as an image to the library, the mindmap nodes turned white??
    also the description that was auto generated said it was typed by hand
    in the lightbox when it was autogenerated, and the image clashes with
    the side left and right arrow buttons on the lightbox" Placed: choice
    controls, orchestrator (the radio form joins the flat looks' neutral
    selection; more than four choices in a dialog become option tiles,
    first on the board export); the export colours, the caption's source
    and the lightbox arrows, the map agent.

410. **The owner, 2026-09-24, verbatim, with screenshots of the writing
    dictionary, New from a template, the map's radial menus and two linked
    map nodes.** "also improve how the \"check with ai\" feature works in the
    documents editor, allow the suggestions panel to be docked on the right
    instead if the user wishes and redesign the dictionary panel as it is
    ugly and needs a proper professional modern redesign." "also when
    selecting a template, I want to be able to confirm my template
    selection, not have it instantly be made when I press it" "is there a
    way to make these mind map item radial options fit better in the
    radials?? also what if the user asks the guide for all the hidden
    features, keybinds, controls, utility and more for features like the
    whiteboard, mindmap and documents editor etc. can it answer those??"
    "also fix the ci and codeql errors" "when I relink or newly link two
    mindmap nodes, they clump together??" "drag selection on the whiteboard
    and mindmap is laggy as well". Read from the screenshots: the radial's
    labelled pills overhang the ring (a 2-item edge ring and the 6-item node
    ring both); a relinked node lands on top of its new parent instead of
    being laid out as its child. CI: four routing rows fixed 2026-09-24 (three
    moved to topics added that day, "Can Atlas write for me?" gets a new
    write-with-atlas topic). Placed: documents (check with AI, dockable
    suggestions, dictionary), templates (confirm), the Guide's per-surface
    controls reference, map (radial fit, relink layout, marquee lag), in
    agent briefs as slots free.
    **Templates (confirm) built 2026-09-24** (bf54953): a click chooses,
    Use this template, Enter or a double click makes it; sweep
    `templatepick.js`. 
    **The Guide's part built 2026-09-24** (guide-controls agent): a controls
    reference per surface and a hidden features entry, routed by what the
    question asks c05c684; 55 bank questions (177, top-1 99.4%, top-3 100%)
    1385b0e; a freshness test against every bound key a164dc2; the caps
    (a 422 after a long answer and on the fifth question, the reply cut
    mid-list) 5cb7f8f. Map part built (radial fit 13c41d7, relink b449623, marquee 18b8c15).
    **The documents' part built 2026-09-24** (the documents agent): Check
    with AI runs in place, streamed into the suggestions panel with Apply,
    Dismiss and Stop, a no-model notice with Settings, Models, and Discuss in
    chat with no long prompt (so no skill nudge, the INBOX 413 half)
    (cd5dec1, `aicheck.js`); the panel docks at the bottom or on the right,
    resizable, remembered, always bottom at 720px and below (a8c822a,
    `prosedock.js`); the dictionary as a settings sheet (bbeda8e,
    `dictsheet.js`); the Capture box's templates confirm too (26e8d9b,
    `notetemplatepick.js`). Nothing of 410 is open now; it stays for the
    orchestrator to resolve with 413.

409. **The owner, 2026-09-24, verbatim, with screenshots of Settings,
    Templates, the persona list, a .json document with the formatting bar
    over it, and the Write tab's AI assistant bar.** "templates cant be
    edited, I want the generation of persona icons to be improved and I also
    want to auto generate other icons in other places like potentially the
    user chat bubbles?? idk. also the degree of indenting is shallow, I think
    it should be more prominent. also this edit/write/remove bar is ugly and
    doesnt suit a modern app, it needs to be restructured/redesigned or
    transformed somehow to be better." Read from the screenshots: built-in
    templates have no edit (only added ones do); the persona marks are a
    blob on a flat disc, too alike at 20px; the prose formatting bubble (B,
    I, S, highlight, code, link, H, quote) draws over a code document, where
    none of it applies; the indent guides step 2 spaces; the AI assistant
    control is a filled segmented pill. Placed: orchestrator, in this order.
    **Built 2026-09-24**: templates editable, built-ins included (3a769ed,
    sweep `templates.js`); persona marks a generated face, closest pair of
    23 at 40px 5.6% before, 29.8% after (259b743, `namemarks.js`); the
    user's own mark on their chat bubbles and the persona picker's
    (0e88b6e, ede4f2a, `chatmarks.js`, bubble box unchanged). The code
    selection bar and the indent step are 7ab7eec. Open here: the AI
    assistant bar.

403. **The owner, 2026-09-23 night, verbatim.** "for me, trust in the
    application isn't just the information it shows but that is very much a
    key point, it is also how cleanly and professionally the application ui
    is designed and works. the less professional or unclean any part of the
    ui is, no matter how small, I instantly doubt the applicationa dn wonder
    if it is worth putting any time into as it feels unreliable. things like
    having that small gap between the edge of the note connection pill chips
    on the right and the 'x' delete button, as well as poorly designed
    dropdown menus with bd widths, poor spacing, poor alignment, poor
    heirarchy, positioning, poor learnability, not intuitive controls poor
    information architecture and more. keep doing what you are doing" The
    standing bar for every pass (INBOX 399's hole-poke and refinement briefs
    carry it). Named: the connection pill's x inset, orchestrator; menus
    (widths, spacing, alignment), a sweep of every menu for width, padding
    and row alignment.

399. **The owner, 2026-09-23 night, verbatim.** "what is left in the world
    class plan?? can you poke more holes in the application for bugs,
    security, poor learnaility/utility/usability/accessibility and more??
    make sure everything works on the windows packaged installer and the
    version it installs. make sure all the update features in the about
    settings page as well as the auto updates in the bat and sh files work.
    keep design consistent, expand professional and modern design. maximise
    usability and learnability. poke holes in the application as in find
    bugs, security flaws places where there is unintuitive design, poor
    information architecture, poor design, poor ui and ux, poor
    learnability/usability/heirarchy/spacing and more. hit the open items and
    plans in open.md. finish all unfinished work. majorly optimise at the
    level of professional applications. make everything feel like it is a
    professional application and not just a demo. maximise use of affordances
    and semiotics. look at websites like motion.dev for ui and component
    refinement, bklit.ui, kokonut ui etc so make sure none of the ui elements
    are unprofessionally designed or act in a wierd way. ... dont let my
    additions distract you, add them to the list and continue, never leave
    anything half finished, not properly done, or untouched."
    Placed as four agent briefs, run as slots free: (1) WORLD_CLASS_PLAN
    rows not built, grepped first, with the list reported back; (2) a hole
    poke (bugs, security, a11y, IA, spacing) with a finding table and fixes;
    (3) the Windows installer, the installed version and the update paths
    (About's updater, `start-*.bat`/`.sh` auto-update), tested in a scratch
    copy per CLAUDE.md's trap; (4) component refinement against motion.dev,
    kokonut and bklit patterns (motion, hover, focus, press states).
    Part (4) built c3bbefc: every transition on `--motion-*` and `--ease-*`
    (`tests/test_motion_tokens.py`), a hover is a colour never a filter
    (with INBOX 405), toasts and '?' popovers fade in with 4px of travel,
    toasts fade out, skeletons in the Library and Timeline. Menus' exit left
    to the menu agent (agent-remaining/perfpolish.md).

397. **The owner, 2026-09-23 night, verbatim, from the desktop window with a
    screenshot.** "I pressed next on the first panel of the guided tour, and
    it dissappeared while keeping the page dimmed and pushed the top bar down
    by a couple pixels. I begun the tour from the settings help page." and
    "you previously said to me multiple times that you werent able to
    reproduce it, but the bug is real so it has to be something". Read from
    the screenshot: the dim stays on step 1's hole, so step 2 never drew.
    Headless runs from Settings, help at 1333x740, 1440x900, 1600x890 and
    2000x1100 reach "2 of 15" every time, so the cause is in something the
    desktop window has and this sandbox does not. **Guarded 2026-09-23**
    (tour.js): an exception in a step becomes the centred card, a card
    that is off the window or behind something is re-centred, the page's own
    scroll is pinned at 0 before each step (the top bar moving is the
    document scrolling), and each of the three writes a `Tour:` line to
    Settings, Logs. Open until the owner's next run: if it recurs, those
    lines name the cause.
    **Then two more screenshots**, from the welcome's last slide and from
    Settings, help, The basics: the ring the right size and about 620px to
    the right, then 620px to the left, and no card. A shift that flips sign
    is a correction computed from a box read mid-move: `tourPlaceFixed` wrote
    a position, read the element straight back and added the difference, so
    anything that makes the box lag its style doubles the move. Replaced: the
    frame's origin is read from `#tour-origin`, a 0x0 fixed probe nothing
    moves, and the element is read back once a frame later and nudged only if
    it is still elsewhere (with a `Tour:` log line when it is). Headless
    walks of all 15 steps at 1.25x scale, with and without real scrollbars,
    were correct before and after, so the owner's run is the test.

393. **The owner, 2026-09-23, verbatim:** "research more ui and ux
    improvements, remove any trace of vibe coded stuff in elements, designs,
    aesthetics styles, form, function, layout, structure. vendor and use skills
    to help with ui and ux design. find bugs in usability. improve and expand
    learnability and information architecture. further modernise and
    professionalise the app. I lose trust in and refuse to use applications
    with poor ui design and ui/ux issues as they make me feel like the app is
    unreliable ... there needs to be more integration between all the main
    features. and there needs to be more optimisiation." Placed: the identity
    half is a decision in UI_MODERNISATION_PLAN ("The default look is Quiet
    utilitarian"), built by a theme agent with the vendored design skills and
    unslop-ui. Recommendation for the integration half, taken: one "act on
    this" vocabulary for every object (note, document, board, map, file,
    reminder): Open, Ask about it, Add to a map, Show in graph, Remind me,
    Link to, reached the same way from its card menu, the command palette and
    a right-click, audited surface by surface against a table in
    WORLD_CLASS_PLAN's consistency contract, with a lint that every object
    menu carries the shared rows.

391. **The owner, 2026-09-23, with the Gemini/Antigravity pass on
    `fix/gemini-fixes-5` (1e63d87, 2c3e16e): "fix and refine the changes
    attempted by gemini ... fix the ui, fix the ux, fix bugs, revert and refine
    risky or bad changes, implement the attempted fixes and improvements but
    better."** Reports in the same drop, and where each stands on this branch:
    packaged-exe splash (fixed: bootloader Splash); installer optional packages
    (fixed: `--install-extras`, frozen `--target` folder); `ModuleNotFoundError`
    traceback and no nomic-embed-text suggestion (fixed); Notes dock and
    dashboard tiles wrapping at 100% (fixed, measured at 1184); edit scrolls to
    top and blank Notes page on first edit (fixed: `applyDocGutter` lazy entry
    point); 29/30/31 notes (fixed: drafts out of every count); no select all
    (fixed, one toggle per bar); table cells in live view (fixed, focus kept);
    whiteboard undo for formatting and map styles (fixed); mind maps missing from
    Find anything, weekly digest filler and "tonight", per-feature model
    picker, agent activity panel alignment, image filter sketches/uploads,
    notification when a closed panel's answer finishes (agents running).
    Decisions, taken 2026-09-23 with the owner: **no fine-tuned bundled model**
    (the owner agreed: a stock small instruct model plus this app's prompts is
    cheaper to keep current; revisit only with an eval set that shows a gap).
    **Laya** (Convai's open-weight decision model, the open alternative to
    Jev: ModernBERT-large, 421M params, Apache 2.0 so AGPL-compatible, typed
    choice/score/boolean outputs with probabilities) **is not adopted now**,
    for three measured reasons from the published benchmarks: zero-shot it
    scores below a plain baseline (0.362 vs 0.461) and only wins after
    per-domain fine-tuning, which this app cannot do for each person's own
    categories; it degrades past about 20 labels (0.425 on Banking77's 77),
    and notebooks grow past that; its context is 512 tokens, shorter than many
    notes. Filing stays on embeddings plus the chat model. Where it could earn
    a place later: small fixed-choice decisions (intent routing in chat, "is
    this a reminder") as an optional extra on the same torch install as
    search by meaning, gated on an eval set showing it beats the current
    prompt on those questions.

392. **The owner, 2026-09-23, verbatim, for after 391:** "poke holes in the
    application as in find bugs, security flaws places where there is
    unintuitive design, poor information architecture, poor design, poor ui and
    ux, poor learnability/usability/heirarchy/spacing and more. hit the open
    items and plans in open.md. finish all unfinished work. majorly optimise at
    the level of professional applications. make everything feel like it is a
    professional application and not just a demo. maximise use of affordances
    and semiotics. look at websites like motion.dev for ui and component
    refinement, bklit.ui, kokonut ui etc so make sure none of the ui elements are
    unprofessionally designed or act in a wierd way. I have found the mind map
    is very unintuitive to use, really slow to pan and move around, the controls
    and tools are annoying to find and use, the connections in the bottom bar
    are different from the ones the mind map nodes use and it just needs a
    whole professional refinement. same with the code mirror live view in the
    documents editor, the live view needs a lot better md rendering and it is
    hard to edit things like tables and other elements and it could look a lot
    nicer rendered, and usability ux could be improved. also the code document
    types dont act like a code editor with errors, suggestions and that needs to
    be imporved. indenting and dedenting across the app also doesnt come in the
    form it should." Placement: the mind map half joins MINDMAP_PLAN row
    13a-view (INBOX 312's pan cost) plus a connector-parity row (the bottom
    bar's link tools must draw what map edges draw); live view and code
    diagnostics join DOCUMENTS_PLAN; indent/dedent (Tab/Shift+Tab on list
    items and selections in every text surface) is a WORLD_CLASS_PLAN
    consistency rule with a lint. Added the same hour, verbatim: "also for
    after, the mobile view is still bery broken, takes up a lot of the screen
    and the design needs a lot of improvement." Placement: UI_MODERNISATION_PLAN
    phone phases; measure chrome height against content at 390x844 first.
    That half is built (2026-09-23): UI_MODERNISATION_PLAN Phase 11 item 12,
    gated by `scratchpad/ui-sweeps/phonechrome.js` at 390, 768 and 1024.
    Later the same day, verbatim: "make sure the whole of the app ui is
    repsponsive, not just for mobile but any ui resolution. though mobile-first
    design is I'm told a good practice" and "when I say mobile and responsive
    design, I mean actually intentionally deisgning for those resolutions, and
    not just adapting to them. like actually making the features be intended
    and designed for those resolutions" (phone agent briefed: a phone intent
    per surface, tablet widths swept too), with slides asking the software to
    reduce CPU, RAM, network and storage (standing: measure before claiming,
    as the pan trace did). Also reported and fixed on the branch: the mind map
    label drag drifting and starting a selection box; the chat header naming
    llama3.2 while another model answered; no prompt when search by meaning
    failed; a picture captioned and read several times over.

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
    **(1) done 2026-09-23**, the usability and IA read against the owner's
    "3 clicks to anything" (INBOX 270): 22 primary tasks driven from a fresh
    dashboard by `scratchpad/ui-sweeps/clicks.js`, 21 within three clicks and
    restoring from the bin at four on purpose (the table is in
    `agent-remaining/guideia.md`). Four trust breakers it found, all fixed:
    both dashboard "Ask" doors opened a disabled Chat box when no model was
    running (now Notes, Ask, which answers without one); the Chat tab never
    said why its box was grey (now the same Connect-a-model line as Ask, the
    agent and the writing desk); a new notebook's Library said "Nothing of
    this kind yet" because the activity log counted as things made (now a
    sentence and a Create button); Create offered no board and no upload
    (now seven rows).
    Checked, not built here (packaging is another agent's): (2) the
    `.tar.gz` ships (`release.yml`, `MemoryMap-AI-<v>-linux-x86_64.tar.gz`);
    (3) the `.msi` steps exist but are `if: false`, so no MSI ships; (4)
    every installer name carries version, platform and arch
    (`installer.iss`: `MemoryMap-AI-Setup-<v>-windows-x86_64`). Still open on
    this entry: (3) and (5).
    **Checked 2026-09-23.** (2) built: `release.yml` ships
    `MemoryMap-AI-<version>-linux-x86_64.tar.gz` beside the zip. (3) built and
    then switched off (`b7b15c7`, WiX v7's fee terms; see 271, resolved). (4)
    built: every artifact name carries version, platform and architecture
    (`MemoryMap-AI-Setup-<version>-windows-x86_64` in `installer.iss`, the
    MSI and both Linux archives in `release.yml`). Left: (1), the usability
    and information-architecture read, and (5), lightweight, whose decided
    shape is lazy imports (268).
    **(5) measured 2026-09-23**, and the lazy-import work is already done
    where it pays. `python -X importtime` over `create_app()`
    (`scratchpad/oi_importtime.py` reads the output): the process imports
    fastapi (402ms), SQLAlchemy (172ms), alembic (129ms) and requests (49ms)
    and nothing heavier; numpy, torch, Pillow, pypdf and python-docx are not
    in `sys.modules` after `create_app`, and peak RSS is 104MB. What makes a
    running server large is the built-in embedding model: 774MB resident on
    a notebook with notes, once `start_warmup` has loaded
    sentence-transformers, and it already waits for the first page, for an
    idle moment and for the notebook to have a note at all. The one lever
    left is which backend embeds, a Settings choice that exists: Ollama's
    `nomic-embed-text` keeps the model out of this process, and the search
    engine's '?' on Settings, Models now says so with the number. So (5) is
    answered; (1) is the one part of this entry left.

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



