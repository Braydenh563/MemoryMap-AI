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

INBOX is the intake tray, not a backlog (the owner, 2026-09-09: "it should
just be there to help you not miss anything"). A report lands here
verbatim, is triaged at the next step boundary, and leaves: fixed now (then
`scratchpad/inbox_resolve.py`), or placed as a row in the plan that owns it
("Placed from INBOX" sections). Under twenty items at any time, by lint.
What is here now is this PR's own bug list (Brief 18 section A, HANDOVER's
done-when item 4 and 5), in priority order.

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
    the AI history popover still found-not-fixed. 107b: an Opus agent is
    running against it now (worktree, not yet merged). 107c and 107d: not
    started.

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
