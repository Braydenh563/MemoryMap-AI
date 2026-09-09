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

66. **Lightbox opened only after leaving graph fullscreen** ("I clicked to
    view a document while in the graph fullscreen"). Owner: GRAPH Phase 6
    (Fable/Opus): the lightbox mounts at body level and the fullscreen
    element is `#graph-card`, so a body-level dialog is invisible while the
    Fullscreen API is active. Fix: mount the lightbox (and every dialog the
    node panel can open) inside the fullscreen element while fullscreen is
    on, or exit fullscreen first and re-enter on close. Size S.
69. **Agent activity panel: the dropdowns don't expand** (screenshot: a
    "Starting SearXNG" row with a caret that does nothing). Owner: Fable,
    now: the row is a `details`-like custom toggle; check its handler is
    wired after the panel re-renders (delegated listener, not per-row).
73. **"Mute notifications except reminders" toggle disables itself when
    the settings close.** Owner: Fable, now: the preference is written on
    change but the panel re-renders from `prefsCache` before the save
    round-trip lands; write to the cache first, then save.
96. **Graph: reimagine the pinned position after a drag.** The owner:
    "my original annoyance was that I'd try to drag a node or cluster
    around and it would just snap back ... but I move a node a little and
    then I have to unpin it and there's got to be a better way." Owner:
    GRAPH Phase 6 (Fable): a drag does not pin; it sets the node's
    position and lets the simulation settle from there at low alpha (so
    it holds where it was put but still relaxes with its neighbours); an
    explicit pin is Shift+drag or the menu; a dragged cluster (lasso
    selection) moves together the same way; a small "pinned" ring only
    on real pins.
88. **Fullscreen graph has no glass opacity** (screenshot: the graph card
    in fullscreen is a flat panel). Owner: GRAPH Phase 6 (Fable): the
    fullscreen element paints `--page` under it, so the card's 55% shows
    nothing; give `:fullscreen .graph-card` the page background art or a
    solid `--modal-bg` on purpose and say so.
86. **Zoom popup does not show while a dialog (Settings) is open.** Owner:
    Fable: the zoom indicator's z-index sits under the modal; raise it
    above dialogs or show it inside the open dialog.
84. **Whiteboard rectangle selection draws behind objects.** Owner:
    WHITEBOARD Phase 1 (Fable, now): the marquee is drawn on the objects'
    layer; move it to the overlay canvas above them.
81. **Web search results in the Sources dropdown: links rendered as
    Markdown links and number-referenced** (the model's table showed raw
    `<https://...>`). Owner: Fable, now: the answer renderer's link rule
    accepts autolinks in angle brackets; the sources list numbers web
    results after the notes so `[5]` resolves to a site.
77. **Token window badge: not centred, text wrong; the window itself
    should be manageable by the user and auto when set** (screenshots:
    "6% of window" pill off-centre in the chat header, and the header wraps
    at width). Owner: CHAT_PLAN header (Fable, now for the badge; the
    window setting next session): a `num_ctx` preference per model in
    Settings > Models with Auto (the model file's value) or a number, sent
    on every request; the badge shows "used / window".
83. **Tools settings: the big paragraphs ("How many are offered at once",
    "Small model mode") become '?' popovers** (screenshot). Owner: Fable,
    now: one line each, the rest behind `data-help-for`.
89. **Glass settings: sheen strength, opacity and blur "don't do
    anything"**. Owner: Fable, now: measure each with getComputedStyle
    against the top bar and a dialog; the card blur is now off unless the
    animated background is on (INBOX 49), so the slider must also drive
    the top bar, the docks and the dialogs (it does through
    `--glass-blur`); opacity drives `--card` alpha (check the palette
    override order); sheen is a gradient over `.card` only when
    `data-glass-sheen=on`.
97. **Library and Files: an expanded dropdown closes itself and scrolls
    back to the top.** The owner, 2026-09-09: "when I expand the ocr text in
    this image on the image cards in the images library sub tab, it keeps
    auto closing and scrolling me back to the top", and "the same happens on
    the text extracted from this file dropdown in the files subtab". One
    cause, two surfaces: the list re-renders on a poll and rebuilds every
    row, so an open `<details>` is replaced by a closed one and the scroll
    position goes with it. The agent activity panel solved this in Phase C
    by building rows once and updating in place. Fix: keep the open set and
    the scroll offset across a re-render, or skip the re-render when nothing
    in the list changed. Owner: Fable/Opus, now. Size S.
104. **Whiteboard: the Arrange group needs structure.** The owner,
    2026-09-09: "can the whiteboard arrange tools be better structured??"
    (screenshot). Ten icon-only buttons under one ARRANGE heading in a
    ragged 2-3-3-2 grid, with group/ungroup, three horizontal aligns, three
    vertical aligns and two distributes all reading as one undifferentiated
    field. Fix: three labelled sub-rows (Group, Align, Distribute), three
    per row, each button with a title and an aria-label, on DESIGN.md's
    icon-button recipe. Owner: WHITEBOARD Phase 1. Size S.
105. **Whiteboard: the View dropdown is still too short.** The owner,
    2026-09-09: "the view dropdown is still overly short" (screenshot: the
    panel clips mid-row on "Snap to grid" with its own inner scrollbar,
    about 230px tall against a viewport with hundreds to spare). It was
    reported once before as INBOX 57 and closed as not reproduced at head,
    so this is the retest and it reproduces. Fix: the menu's max-height
    should be the space below its trigger, not a fixed figure, and a row
    must never be cut in half. Measure it open at 1440 and at 820. Owner:
    WHITEBOARD Phase 1. Size S.
106. **Links: the Save and Cancel buttons do not match.** The owner,
    2026-09-09: "the links edit save and cancel buttons arent consistent"
    (screenshot: Save is a filled accent pill, Cancel a grey rounded
    rectangle at a different radius and a different height). Two buttons
    side by side in one row must share a radius, a height and a padding;
    only the fill should differ. Fix on DESIGN.md's button recipe, and
    check the same pair everywhere an edit row appears. Owner: UI
    modernisation, placed. Size S.
67. **Max gravity: "the nodes are all still so spread out"** (screenshot at
    max, 01:30). The screenshot predates the pull fix in e1... (commit
    "graph: the centre pull follows the gravity slider", pushed 01:00) if
    the owner's build was older; retest after updating. If still spread:
    raise the top of the range further (pull 3.25x to 5x at 100) and add a
    component-packing pass (place each disconnected component's centre on a
    tight ring at max gravity). Owner: Fable, on the next report.
68. **Boards & maps preview "looks so bad, especially in the dashboard"**
    (screenshot: a flat grey square with four rounded blobs and a squiggle,
    a scrollbar beside it). Owner: MINDMAP §11.1's preview renderer, Opus:
    draw the board's real shapes at its aspect, cap the widget's height,
    never a scrollbar inside a preview, an empty board shows a dotted
    paper with "Empty board", the dashboard widget uses the same renderer
    at thumbnail size.

## Placed (last 20, newest first)

- 2026-09-08: dashboard hero preference, New note tile colours, sub-tab
  arrow keys, Files reading, sidebar toggle, mindmap bugs, line numbers,
  docks as one bar, timeline redesign, responsive design, em-dashes,
  paragraphs to popovers, security review: all placed (HANDOVER "flagged
  list") and most built.
