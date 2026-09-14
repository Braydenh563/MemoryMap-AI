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

221. **Mid-work drop, 2026-09-14 morning, verbatim (the owner), auto
    update.** "make sure all the auto update whether upon new release or
    following main works which can be adjusted and set in settings and make
    sure the bat and sh files stick to the set things in those settings."
    Trace `start-desktop.bat`/`.sh` and the launcher's update step against
    the Settings values (channel: release or main; on or off); a test per
    launcher that reads the setting the way the launcher does. Owner:
    backend2, after its audit rows.

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

219. **Mid-work drop, 2026-09-14 morning, verbatim (the owner), the
    README and the PR.** "can you update the screenshots in the readme and
    also update the readme itself?? make sure it is proper professional and
    not ai slop. make it impressive, and make sure the screenshot choices are
    actually intentional... like the ocr workspace could be one?? and update
    the pr title and description." And: "make sure to update and refine the
    world class plan, extend it and make it revolutionary." Screenshots
    captured from the running app in both themes with seeded data (the OCR
    workspace, the mind map, the graph, the documents editor, the popup
    agent); README rewritten in plain prose; PR 144's title and body
    rewritten from the CHANGELOG. Owner: orchestrator, after the merges.

215. **Mid-work drop, 2026-09-14 morning, verbatim (the owner), popup
    agent sessions.** "I want to be able to save conversations with the
    popup agent as a permanent chat session." A "Save as chat" action in the
    palette's foot menu that posts the transcript to `/conversations` and
    opens it in the Chat tab; the palette then shows "Saved" and a link.
    Owner: chrome, after its list.

214. **Mid-work drop, 2026-09-14 morning, verbatim (the owner), the tab
    buttons.** "can you redesign these buttons better if they havent been
    already??" The screenshot: the Notes, Boards, Documents and Reminders
    tab buttons as four filled pills with icons, each a different width, the
    active one indistinguishable at a glance. Target: one segmented control
    (`.dock` grammar), icon and label, the active segment filled and the
    rest quiet, equal heights, measured. Owner: chrome, after its list.

213. **Mid-work drop, 2026-09-14 morning, verbatim (the owner), the last
    scan.** "finish all the agents, scan for bugs and high complexity one
    last time, and let me know when the pr is ready to merge / make sure to
    merge all of the agent branches into this one as the agents finish."
    And: "once absolutely everything is done and the roadmap documents are
    cleaned etc, all the agent branches are merged into this one etc, merge
    this pr for me." Owner: orchestrator; the merge is the last act.

210. **Mid-work drop, 2026-09-13 night, verbatim (the owner), the
    background art.** "oh! can you fix the aurora flowing ribbons
    animation?? it needs refining and fixing, the trails never end and the
    trails get reset by the rotating middle graphic. I like the waves graphic
    and the constelations one isnt bad either but the others could do with
    some improvements." The styles live in `frontend/settings.js`
    (`startBgArt`, one `style.frame(t)` per name) and the dashboard's copy in
    `dashboard.js`. Aurora: the translucent wash never clears a trail fully
    (the alpha floor leaves a residue), and the emblem's redraw clears a
    rectangle through it. Fix: a fade that reaches the ground within N
    frames (measure the pixel after the ribbon has passed with
    `pngpixel.py`), and the emblem drawn on its own canvas layer above the
    art rather than clearing into it. Then a pass over each style but waves
    and constellations. And: "also with animation movement, I might want the
    ai generating animations and all the little small ones, but just not the
    background to move." A "Background moves" switch of its own beside the
    style picker, separate from Reduce motion: off draws one frame and stops
    the loop; everything else keeps its motion. Owner: orchestrator, then an
    agent.
    **Aurora: fixed. The switch: it exists.** The ring is drawn on its own
    layer and composited each frame, so it no longer stamps itself into the
    trail buffer; the stronger sixth-frame wash that made a mark reach the
    ground in a second was **reverted the same hour**: at 30 frames a second
    it pulsed five times a second ("there's a flashing", "the flashing is
    everywhere"). The residue is arithmetic (a 10% blend cannot move a pixel
    that is within three levels of the ground), so the fix has to be a
    different technique, not a stronger wash: the trails on their own
    layer, cleared and redrawn from a short history of positions, which
    ends a trail by construction. Open, for the agent. The
    background's own movement is Settings, Appearance, Background,
    Movement: Still, separate from Reduce motion; "everything else moves"
    is what that choice already does. Left open: the pass over bubbles and
    mesh (waves and constellations are liked as they are).

209. **Mid-work drop, 2026-09-13 night, verbatim (the owner), the whole
    application.** "ok fable, I want to make the most of you now, I need you
    to poke holes in this application, find weakness, find poor backend
    design, find high complexity, find bugs we have missed, maximise speed,
    security, improve the agent harness and ensure it is the best it can be
    for all local model sizes. polish the app and fix usability issues, fill
    missing gaps." Taken as the orchestrator's own audit, recorded in
    WORLD_CLASS_PLAN.md under "Audit, 2026-09-13 night" with a finding per
    row (evidence, cost, fix, who), the cheap and safe fixes made in the
    same pass, the rest briefed to agents. Owner: orchestrator.

208. **Mid-work drop, 2026-09-13 night, verbatim (the owner), the popup
    agent's foot (screenshot: the "Use the open note" toggle with its label
    wrapped to two lines, "Nothing open to use (open a note, document, board
    or map first)", beside a "Start over" button whose caption also wraps
    to two lines).** "can you fix the ui of and redesign the ui of these
    buttons at the bottom of the popup agent??" The foot row
    (`.command-palette-foot`): the disabled state's copy is too long for a
    toggle's label (one short line, the long reason behind the toggle's
    `title` or a `data-help-for`), and Start over is an icon-only ghost
    button with a tooltip, or a menu item, not a two-line pill. Owner:
    chrome agent, with 205.

207. **Mid-work drop, 2026-09-13 night, verbatim (the owner), the header
    (screenshot: the header's five icon buttons: bell, magic wand, '?',
    theme, gear).** "move the help bot to the bottom bar instead of having
    it in the top bar buttons, also the popup agent is already accessible in
    the bottom bar so it doesnt need to be in the top bar buttons either".
    The wand (`#command-palette-btn` or equivalent) and the '?' (`#guide-btn`)
    leave `.header-controls`; the Guide joins the bottom bar (the status bar
    on desktop, `#phone-tab-dock`'s More sheet on a phone) beside the agent.
    And, a little later, on the same cluster (screenshot: the five-button
    well beside the two-button lock and power well): "also something about
    the ui design of these buttons isnt sitting with me, they feel out of
    place and I feel like they could be better redesigned". Two segmented
    wells of outlined icon squares read as a toolbar, not a header: once the
    two leave, the three that remain (bell, theme, gear) and the two that end
    a session are plain icon-only ghost buttons on the header's own ground,
    no well, no seams, the shape the tab strip's neighbours already have;
    measure the cluster's height equals the tab buttons' and the gap is one
    step. Owner: chrome agent.

206. **Mid-work drop, 2026-09-13 night, verbatim (the owner), the help
    popovers (screenshot: the capture box's '?' popover running the full
    height of the window, "A note is plain text. These few things do
    something extra:" through the callouts bullet, with a scrollbar).** "the
    note capture tooltip popup takes up the height of the screen. and popups
    still flicker for a split second at the top left and then appear in the
    right place :(". Two things: the `data-help-for` popover's height (cap
    it and let it scroll, or cut the copy: standing order 6 says one line
    per section and the long help behind the '?', but a popover is not a
    page); and the first-frame flash at 0,0 before placement, which is the
    popover being shown before it is positioned (measure the first painted
    rect after `hidden` is removed). Owner: orchestrator.

205. **Mid-work drop, 2026-09-13 night, verbatim (the owner), the popup
    agent.** "the '?' tooltip dropdown in the popup agent shows behind the
    panel instead of in front. and I want you to improve and redesign the
    suggestions and quick prompts in the popup agent." Two halves: the
    `data-help-for` popover's stacking inside `#command-palette-overlay`
    (a z-index under the panel, or a blurred ancestor confining it: measure
    `elementFromPoint` at the popover's centre); the starters (`2602c32`,
    per-tab since `6147863`) redesigned as a set, with the 200 sweep.
    Owner: orchestrator.

204. **Mid-work drop, 2026-09-13 night, verbatim (the owner), the Guide
    (screenshot: the Guide sheet, "Ask the guide" with a '?' and New chat,
    "Quick app help from your utility model, not your notes", a "hey" bubble
    and the no-model reply, the Ask field).** "can you add an exit or x
    button to the top right of the guide ai panel??" and, a minute later:
    "and also modernise and redesign/improve the ui and ux for the help ai.
    give the help ai a name fitting for the application like a persona and
    improve its capabillity and knowledge". Two halves: the X (every sheet
    from the `openSheet` recipe gets one, top right, so the fix is one
    place); the persona, which is a decision the chat agent took as "Guide"
    (CHAT_PLAN decision 14) and the owner now asks to be a fitting name and
    a persona with more knowledge. Owner: orchestrator, with the 200 sweep.
    **The X: done.** Every sheet from the `openSheet` recipe carries a
    `.sheet-head` with the title and an icon-only close at the top right
    (measured on the Guide: 28x28, 25px in from the card's top and right
    corners, on the title's row, closes on click). The persona half stays
    open with 200.

203. **Mid-work drop, 2026-09-13 night, verbatim (the owner), AI features
    with no model.** "and many ai exclusive features are still enabled even
    when an ai isnt available or running...". `44ed975` put the "no model
    connected" state where you are; the ask is the other half: every
    AI-only control disabled, with the reason, while `/models/status` says
    nothing is running. Inventory first: grep the ids that call the AI
    routes and the `data-needs-model` (or equivalent) attribute that exists,
    then one function that toggles them all from the model status.
    Owner: orchestrator.

202. **Mid-work drop, 2026-09-13 night, verbatim (the owner), the theme
    switch.** "switching between light and dark mode is realllly glitchy
    and takes a bit to load". Measure the switch: time from the click to
    the last style recalculation, how many elements transition, whether the
    blurred surfaces repaint one by one. Owner: orchestrator.

201. **Mid-work drop, 2026-09-13 night, verbatim (the owner), mind map core
    nodes.** "I want more and better ways to differentiate core idea nodes
    in the mindmap". Goes with 200's mind map sweep: a core node today is
    an ellipse with a heavier ground (`26aa946`); the ask is for more ways
    (size, colour, weight, an icon, a filled shape) and for them to read as
    one thing. Owner: orchestrator, in the 200 sweep.

200. **Mid-work drop, 2026-09-13 night, verbatim (the owner), the whole
    app, the mind map first.** "I think you fable need to do a full ux sweep
    for better intuitive design and function. especially with the mindmap,
    it needs a lot of ux and usability improvement, like the way the
    controls are available, what controls and tools are available and where,
    and how the item radials are used is confusing and doesnt feel clean".
    The owner's decision, which reopens MINDMAP_PLAN section 12's ring: the
    set of controls, where each lives and how the ring is used are to be
    redesigned, not adjusted. Taken as a sweep by the orchestrator, surface
    by surface, mind map first, each change measured.

## Placed (last 20, newest first)

- 2026-09-13: 128 placed in DOCUMENTS_PLAN.md.
- 2026-09-13: 162, 159 placed in WORLD_CLASS_PLAN.md.
- 2026-09-13: 165, 164 placed in UI_MODERNISATION_PLAN.md.
- 2026-09-08: dashboard hero preference, New note tile colours, sub-tab
  arrow keys, Files reading, sidebar toggle, mindmap bugs, line numbers,
  docks as one bar, timeline redesign, responsive design, em-dashes,
  paragraphs to popovers, security review: all placed (HANDOVER "flagged
  list") and most built.
