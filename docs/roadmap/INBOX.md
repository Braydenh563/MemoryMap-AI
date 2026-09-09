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

108. **The graph, mid-work, 2026-09-09 (the owner, verbatim).** "the tree
    view on the graph is completely screwed" (screenshot: the tree reads as a
    force blob, root at the right, categories overlapping, labels colliding)
    and, on the second look, "on the other map views, they all have the
    dotted borders and when I tap on one node, it resets them all and they go
    flying off. and I think the selection bar should be under, not above the
    top bar, maybe centre it at the bottom" (screenshot: the "10 selected"
    bar overlapping the Graph top dock from above).
    **Note for whoever takes this**: the static-layout fix of earlier today
    was made in `frontend/graph.js`, the SVG renderer. The owner's build runs
    the canvas renderer (`frontend/graph-canvas.js`), which has its own drag,
    its own held-ring test and its own worker start, so the guard has to
    exist there too. Reproduce with `__graphDebug.renderer === "canvas"`.

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
