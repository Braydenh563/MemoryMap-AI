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

77. **Token window badge: not centred, text wrong; the window itself
    should be manageable by the user and auto when set** (screenshots:
    "6% of window" pill off-centre in the chat header, and the header wraps
    at width). Owner: CHAT_PLAN header (Fable, now for the badge; the
    window setting next session): a `num_ctx` preference per model in
    Settings > Models with Auto (the model file's value) or a number, sent
    on every request; the badge shows "used / window".
105. **The placement fix landed on 2026-09-09 and is measured, but the
    on-surface retest is still owed.** `place()` in app.js now measures the
    menu at `max-height: none` and caps it against the room its trigger
    actually has, opening downward when the whole menu fits, upward only when
    the whole menu fits there, and otherwise scrolling inside the larger
    side. That was measured on a menu built for the purpose. What is not
    done is opening the real View menu at 1440 and at 820 and reading its
    height: three probe attempts clicked `[data-wb-menu-toggle]` and the menu
    stayed hidden, so the retest below is unproven either way.
    **Whiteboard: the View dropdown is still too short.** The owner,
    2026-09-09: "the view dropdown is still overly short" (screenshot: the
    panel clips mid-row on "Snap to grid" with its own inner scrollbar,
    about 230px tall against a viewport with hundreds to spare). It was
    reported once before as INBOX 57 and closed as not reproduced at head,
    so this is the retest and it reproduces. Fix: the menu's max-height
    should be the space below its trigger, not a fixed figure, and a row
    must never be cut in half. Measure it open at 1440 and at 820. Owner:
    WHITEBOARD Phase 1. Size S.
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
