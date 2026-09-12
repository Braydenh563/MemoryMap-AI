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

## Open items

113. **Buttons with no resting affordance, measured 2026-09-12.** The
    owner: "all the buttons need to actually look like buttons with
    affordance, not just shapes with text in them". `buttons.js` against a
    live app puts numbers on it. The same class renders three ways in
    three tabs: `.ghost.small.icon-only` is `bg rgba(31,36,48,0.12)` in
    the top bar, `bg rgb(252,253,255)` with a border and a shadow in
    Library, and `bg rgba(0,0,0,0)` with a transparent border and no
    shadow on Notes (`#notes-refresh`, `#search-help`). A whole family is
    fully transparent at rest with a transparent border and no shadow:
    every `.status-item` in the status bar, `#dash-widgets-open`,
    `#dash-edit`, `#select-btn`, `#library-refresh`. Those are not buttons
    that look like shapes, they are buttons that look like text.
    **This is not a regression, it is a collision between two deliberate
    rules**, and the codebase already says so: `--ghost-btn-bg` gives a
    ghost button a tonal resting fill (01-forms-settings.css), while the
    dock "quiet" rules strip it back off (08-consistency.css ~1309, added
    to fix "why is that one button highlighted"). 08-consistency.css's own
    comment at ~948 names the trap: "a disclosure that is invisible until
    you find it is the problem that round was solving, and taking the
    affordance away to make it quieter would just trade one report for
    the other". Both reports are now in.
    **Recommendation, to take: affordance is carried by the border, state
    is carried by the fill.** A quiet control keeps a resting
    `1px solid var(--border)` so it reads as pressable, and gives up only
    the resting fill, so a filled button still means "this one is
    active/primary" and nothing looks highlighted by accident. That
    resolves both reports instead of trading them. Deferred from
    2026-09-12 only because two agents were editing the same CSS files at
    the time and this touches shared button recipes across every surface;
    it needs one measured pass with `buttons.js` before and after, and it
    will move `test_ui_signatures.py` ratchets, which must be re-based
    deliberately rather than widened.

112a. **The mechanism behind 112, found 2026-09-12.** The link is not a
    citation marker and not a wiki link: `CMD_NOTE_REF`
    (`/\bnotes?\s*(?:id|#)?\s*(\d{1,7})\b/gi`, app.js) rewrites a
    "note #68" written in the model's own prose into a button, and
    `cmdPaletteLinkNotes(root, results)` builds it. The id is taken
    straight from the regex and handed to `flashEntry`, and a link is only
    built for an id in `known`, which is that turn's `found` plus the notes
    its tools `touched`. So on the reported turn 68 was genuinely in the
    retrieved set, which does not fit the screenshot: the chips showed only
    "bubble tea". Two readings left, and they need one live turn to
    separate: either the bubble tea note really is id 68 and `flashEntry`
    landed elsewhere (it looks id-based and resets every filter, so this is
    the less likely one), or `found`/`touched` carried a second note the
    chips did not draw. Next session: reproduce with a real model turn,
    log `known`, the matched id, and what `flashEntry` scrolls to.

112. **Chat citation pointed at the wrong note, 2026-09-09 evening, verbatim
    (the owner), with two screenshots.** "I asked the popup agent this, and
    the bubble tea note it mentioned was my bubble tea mind map, but the
    link it gave and grounded was my shakespeare note??" The transcript:
    asked "What did I write about this week?", answered "You only have
    one note (note #68) in your notebook, and its content is simply '#
    bubble tea'", with "Found in 1 note" and "Opened 1 item" chips both
    labelled "bubble tea" (model `granite4.1:3b`, "Librarian", 1.7k
    tokens, 2 rounds). Clicking the "note #68" link in the answer's own
    text opened a Shakespeare sonnet parody ("Act I, Scene I", tagged
    "Thoughts & Ideas", "3 days ago") instead. Whatever renders an inline
    "note #N" citation into a clickable link is resolving a different id
    (or a different index into a different list) than the one the answer
    text and the chips agree on and than the one actually named. Not
    investigated: the likely site is wherever chat.js/app.js turns a
    grounding citation into an anchor (search for how "note #" or a
    similar citation marker becomes a link's href/data-id, and compare it
    against the tool-call results the chips are built from in the same
    turn). High priority: a citation that opens the wrong note is worse
    than no citation, and this looks like a plain id/index mix-up rather
    than a model hallucination (the model named the right note by content
    and id in its own prose; only the link disagreed).

INBOX is the intake tray, not a backlog (the owner, 2026-09-09: "it should
just be there to help you not miss anything"). A report lands here
verbatim, is triaged at the next step boundary, and leaves: fixed now (then
`scratchpad/inbox_resolve.py`), or placed as a row in the plan that owns it
("Placed from INBOX" sections). Under twenty items at any time, by lint.
What is here now is this PR's own bug list (Brief 18 section A, HANDOVER's
done-when item 4 and 5), in priority order.

111. **End-of-session drop, 2026-09-09 evening, verbatim (the owner), fixed
    this pass in parentheses.** "the documents formatting toolbar still
    gets clipped, and can you change the editor window background for
    when on the plain text view to be like vs code??" (fixed: stale
    `doc-toolbar-mode` "row" localStorage value from before the
    2026-09-09 wrap-default change migrated once to "wrap"; Plain view
    now paints a literal black/white ground behind CodeMirror's own
    transparent editor, `49d78c1`) · "also the show line numbers button
    on the documents formatting toolbar doesnt work" (not investigated:
    `applyDocGutter`/`docCmGutter` read `docGutterWanted`, wiring not yet
    traced live) · "I dragged a note from the library dropdown onto the
    board but the note appeared in the top left, not in the centre where
    I placed it" (fixed: the drop handler measured against
    `#wb-html-layer`'s own rect, which already carries the pan/zoom as a
    CSS transform, then applied that same transform again on top;
    switched to the untransformed `#whiteboard-container`, `49d78c1`) ·
    "can you make the 'm' navigation kinda like alt tab... if I hold it
    down the popup stays up", refined to "press m again to close it or
    an x close button" (fixed: the guide no longer auto-hides on a fixed
    900ms timer; a second "m" or a new X button closes it, `49d78c1`) ·
    "and fix the whiteboard dropdown menu heights, make sure they arent
    too short but also not clipped off the bottom" (**not verified**: a
    live probe found no open board in the scratch data dir to measure
    against; the two CSS `max-height` rules on `.wb-board-menu`
    (07-whiteboard-misc.css ~7330 and ~7601) already disagree, the later
    one, `calc(100vh - var(--space-9) * 2)`, wins and is the more
    generous of the two, so the "too short" report may already be stale
    or may be a real bug this session could not reproduce) · "when I
    pressed the jump to latest button in the chat, it jumped to the
    right for a second. same with a lot of dropdown menus and tooltips,
    they flicker into the top corner for a second then appear in the
    right place" (not investigated, owner said focus elsewhere first:
    likely candidate is a shared "measure at 0,0 then reposition" recipe
    that is not synchronous with paint somewhere outside
    `wireEscapedActionMenu`'s own `place()`, which IS synchronous inside
    one MutationObserver callback and should not flicker) · "this text in
    the files sub tab needs indenting, and the describe with ai feature
    needs to show in background process, same for all ocr processes"
    (not investigated) · "when I try to manually change the height of
    the chat bar, it snaps back to what it was with or without text in
    it" (not investigated) · "the ai edit history popover still not
    centering" (carried from 107a, still found-not-fixed) · "fix the ui
    spacing and padding in the graph suggested links tab, make it
    consistent with the rest of the app" (not investigated). 107c
    (whiteboard View/Arrange, Ctrl+S feedback, the dashboard band) and
    107d (the segmented mini-bar redesign) remain not started. The
    second batch's own remaining items (boards & maps widget visual
    design, AI skills sidebar not reaching full height, square tab
    corners, chat panel shadow, light-vs-dark glass difference) remain
    not reproduced live, not fixed. Two background agents (a dashboard
    hero MSN-style redesign, a bugs-batch covering the whiteboard menus
    and the AI history popover) were dispatched this session and both
    hit the weekly agent rate limit before landing any commits; nothing
    from either survives to merge.

110. **A second batch, mid-work, 2026-09-09, verbatim (the owner).**
    "These requests in the photos and in the following also werent
    fixed: the boards and maps dashboard widget is ugly and needs
    fixing, and the graph suggested links panel is poorly designed and
    not consistent with the rest of the app ui style. the documents edit
    and read toggle options dont fit in the toggle and go out of it at
    the bottom and I want to be able to use the documents tab as a plain
    text editor like before as a view option (not the defauklt though)
    and also if I select a txt document, and/or other code file
    document, and these can have line numbers as well. Im assuming this
    will all be done when you continue the documents and graph plan when
    my usage resets, but also i still cant click on a grammar or
    misspeled underlined word and see a popup like in a realworld editor
    like obsidian, word, notion, vs code. also for code files, include
    code syntax and make it a proper code editor like vs code. the files
    description needs to be an actual description or summary of what
    the file is about and includes, not a transcription. also the
    panels and sidebars in windows actually go quite far down below
    where the scroll should stop, and the ai skill sidebar isnt 100%
    height. also the containers of all the ui in each tab page have
    hard corner rectangular edges so I want that fixed because the
    shadows make the cut off pretty obvious. and in the chat tab, the
    main chat panel shadow actually reaches all the way down on the
    gap. also no back to top button appears on the dashboard?? and
    glass looks better on light mode and not dark but idk if thats an
    actual thing or if the values are different." Screenshots: a Files
    row's title/kind/size row misaligned (repeat of an earlier report,
    now closed once, live again); the links editor Save/Cancel pair
    (repeat, already closed once, live again); the `m` quick-nav guide
    rendered as an overlapping card, not a full-screen hint; the
    Edit/Read toggle (repeat, already closed once); the suggested-links
    panel's plain unstyled rows.
    **Triage.**
    - Plain view, Line numbers: **already correct**, see 107a's commit
      `9a2ddf1`, no change needed.
    - Files row alignment, links Save/Cancel, Edit/Read pill: reported
      fixed earlier in HANDOVER's done-when items 3 and 5; **live again**
      means either a regression since or, per today's pattern, a stale
      build. Not re-chased without a live reproduction.
    - Real code editing (VS Code-grade syntax highlighting, a spell/
      grammar-check popover): this is DOCUMENTS_PLAN Phase 3 scope, not
      a bug fix; the owner's own words scope it to "when you continue
      the documents and graph plan when my usage resets". Left for that
      phase, not attempted piecemeal here.
    - The `m`-guide as a full-screen hint: a design change (WORLD_CLASS_
      PLAN quick-nav item), not a fix; needs its own pass against
      DESIGN.md's recipe index (standing order 11).
    - Files description as summary not transcription: built this
      session (`docreader.py`, `captioning.py` DOCUMENT_PROMPT); if
      still a transcription live, needs reproduction with a real file,
      not assumed broken.
    - Boards & maps widget, suggested-links panel style, panel/sidebar
      overflow, AI skill sidebar height, square corners app-wide, chat
      panel shadow, dashboard back-to-top, light-vs-dark glass: each is
      its own visual judgement call, none reproduced live this pass.
      Placed here rather than fixed blind.

107. **The 0.3.0 blocker list (the owner, 2026-09-09 23:25, verbatim).**
    "should I leave this pr open until we can finish the rest of the still
    open and half finished stuff?? otherwise I need to to absolutely make
    sure that finishing this list of unfinished items and half finishe
    items in the number one priority, I need them finished, this pr is
    v0.3.0 and I dont want to merge it if things arent complete... work
    through these bugs really fast: can you make the live view on
    documents the default if it isnt already?? also when I click on the
    plain and line numbers view nothing happens and they dont do anything.
    note in the redesign documents and where it is supposed to that I want
    to get rid of and redesign these mini menu bars as they are in a couple
    popups around the place and they desperately need a modern redesign or
    alternative, the ai assistant popup blurred background in the documents
    doesnt reach the full height of the scree, leaving a clear strip at the
    top and bottom, and the ai history popup goes to the left of the
    screen, should it be in the middle?? I put in a link to a note in the
    document, but when I clicked it, it didnt take me to the note and
    instead a notification showed saying no document by that name exists
    yet. fix the formatting bar in the documents tab, it is crushed
    bertically and has a vertical scrollbar. I cant open the reader ai
    dropdown combobox at the top of the ocr workspace. I scroll to the
    bottom of the ocr text in the files row in the files subtab, and the
    whole \"extracted text from this file\" dropdown closes. the same
    happens when I scroll to the bottom and expand, and click see more the
    \"text in this image\" dropdown in the images tab. I cant click on the
    file name header in the files subtab file rows to open the file up in
    the lightbox or ocr workspace. the view dropdown in the whiteboard
    opens on top of the top bar, not under it, and it is overly short, the
    arrange dropdown is also very short, there's no visula feedback when I
    press ctrl + s in settings. the pckage headers, badges and buttons
    still get displaced onto separate rows did you make changes to the
    section between the hero section and the widgets on the dashboard? they
    look the same..."
    Screenshots: a bolded run showing literal `**` markers in a document; the
    Edit/Write/Remove segmented bar; the AI assistant dialog with its
    backdrop; the AI edit history popover at the left edge; a document with
    an `Act I, Scene I` link and two identical "No document called ... yet"
    toasts.
    **Split, 2026-09-09**: 107a documents (live default, the plain and
    line-number views, the assistant backdrop, the history popover
    placement, the note link, the formatting bar) · 107b files and images
    (the reader combobox, the two dropdowns closing on scroll, the file
    title click) · 107c the rest (whiteboard View and Arrange, Ctrl+S
    feedback, the packages row, the dashboard band) · 107d the segmented
    mini bars, a redesign recorded in DOCUMENTS_PLAN and DESIGN.md.
    **Status, 2026-09-09 evening.** 107a: five of six closed (`9a2ddf1`),
    the AI history popover still found-not-fixed. 107b: **done, merged
    and pushed (`b24836d`)**, all four items closed plus two bonus finds
    (a select offering a hidden option; focusing a menu's first row
    scrolling the page enough to close the menu itself). 107c and 107d:
    not started.
    **The owner's live error, confirmed as this exact fix.** A console
    trace at `library.js:3291` ("Cannot set properties of null (setting
    'src')", from `openThisRow`/`ocrOpenSibling`) matched the pre-fix
    line for line at the previous head. `git pull` plus a server restart
    is what picks this up; the boot-token cache fix (`dd2d843`) stops the
    *browser* from serving old code once the server has new code on
    disk, it does not substitute for actually pulling the branch.

77. **Half done, 2026-09-09: the badge is fixed.** It reads "1.2k / 20k"
    instead of "6% of window", is 20px tall at every width from 420 to 1440
    (it stretched to 44px below 820 before), and is centred against the chat
    subline. What is left is the second half below, the per-model context
    size, which the entry already assigns to the next session.
    **Token window badge: not centred, text wrong; the window itself
    should be manageable by the user and auto when set** (screenshots:
    "6% of window" pill off-centre in the chat header, and the header wraps
    at width). Owner: CHAT_PLAN header (Fable, now for the badge; the
    window setting next session): a `num_ctx` preference per model in
    Settings > Models with Auto (the model file's value) or a number, sent
    on every request; the badge shows "used / window".
## Placed (last 20, newest first)

- 2026-09-08: dashboard hero preference, New note tile colours, sub-tab
  arrow keys, Files reading, sidebar toggle, mindmap bugs, line numbers,
  docks as one bar, timeline redesign, responsive design, em-dashes,
  paragraphs to popovers, security review: all placed (HANDOVER "flagged
  list") and most built.
