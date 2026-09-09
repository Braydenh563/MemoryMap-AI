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

Received 2026-09-08 09:50 to 10:30 UTC while the owner was out of usage,
placed in one pass. "Owner" is the file or brief that carries it; a session
takes them top-down inside each block.

### Fixed already this night (for the record)
- Library card grid cut off at 423px (agent-monitor buffer): 139bdf3.
- Settings "Models" combobox on desktop, page went blank: 93c0885.
- Graph "Labels" on showed only the hovered label: 0be76eb.
- Files "Show the whole reading" collapsing on the poll and not full width: 0be76eb.
- Pinned toolbar buttons hard to see on glass: 0be76eb (opaque ground; the
  square corners and the documents toolbar copy are below).

### Bugs, highest impact first (next session, before any brief)

Resolved items (fixed, not reproduced, checked) move to HISTORY.md, "INBOX resolved", with their numbers; numbers are never reused.

1. **Deleting a space leaves its notes in "All spaces".** Read and not
   reproduced in code: `routes_spaces.delete_space` hard-deletes every
   workspace-scoped row in one transaction and
   `tests/test_space_delete_cascades.py` proves it. The likeliest cause is
   notes captured while "All spaces" was selected: those carry the default
   workspace, not the space, so deleting the space cannot touch them. Fix
   the cause of the confusion, not the cascade: (a) show the space chip on
   every note card and in the edit form; (b) the capture form files into
   the *selected* space and says which; (c) a "Move to space" bulk action.
   Owner: D2 and D5. If the owner can reproduce with a note that shows the
   space chip, reopen as a backend bug.
12. **Whiteboard: export-selection popover opens a full-height list in the
    wrong place; arrow drawn shows both caps as Arrow in properties;
    missing align-centre and distribute-gaps; the arrange panel's buttons
    are unreadable (icons overlapping text).** Owner: WHITEBOARD_PLAN.md.
    **The caps part only is fixed** (my scope was "12 only the caps part"):
    `wbDetectArrowStyle`'s own regex scan included the shaft's leading `M`
    (matched separately, one line above, specifically to exclude it) in
    its search for head markers, so a shaft with zero start caps still
    measured a false zero-distance hit on its own start point and reported
    "both". Slicing the shaft's own match off the string before scanning
    fixed it; verified live (`startcap: "none"`, was `"arrow"`). The
    export-popover placement, align-centre/distribute-gaps and the arrange
    panel's icon/text overlap are **still open**, not touched this session.
15. **Modal backdrop blur does not cover the full viewport height.** Read: `.modal-overlay` is `position: fixed; inset: 0`, so the unblurred strip is the desktop shell's native title bar, outside the page. Not a CSS bug; if it matters, the shell (pywebview/Electron) must draw a frameless window with the app's own title bar. Owner: packaging.
22. **Settings > Packages rows misaligned** (icon, text and the install
    button on different baselines). Owner: consistency.md item 4; the
    alignment sweep must include Settings > Packages and Settings > Help.
23. **Settings > Help gaps** (accordion rows touch, sections have no
    rhythm). Owner: help-popovers.md, with item 22.
24. **"New board" and "New mind map": same or different?** Decision: the
    dock grammar allows one filled button per dock, so one filled "New"
    button opens a two-row menu (Board, Mind map), each with its icon and a
    one-line hint. Two side-by-side filled buttons is the wrong answer.
    Owner: docks.md.
25. **Whiteboard: the edge anchor outline on note objects differs from
    every other object kind.** Decision: one anchor recipe for all kinds
    (the shape one; the note one goes). Owner: WHITEBOARD_PLAN Phase 1.
26. **"Things that feel off that I cannot place."** After the consistency
    and docks lists close, one review pass per tab with the vendored
    design skills (`.claude/skills/README.md`) against DESIGN.md, writing
    findings as consistency.md rows, not fixing ad hoc. Owner:
    consistency.md, last item.

41. **(the panel: fixed, 5724587 and dbff8f0; the clean-up is Phase 4)**
    **Graph display options belong on the dock, and the options panel
    needs a redesign**; the graph needs a utility, UI and interaction
    clean-up. Owner: GRAPH Phase 2 remainder (gear button, INBOX 21) and
    Phase 4; the panel on the popover shell with the dock-menu sections.
43. **(the top bar's menus: fixed, e1e395b; the rest is Phase 1)**
    **Whiteboard bottom tool rail and the properties panel** are not on
    the refined recipes (the top bar is). Owner: WHITEBOARD_PLAN Phase 1.
    **Done, one part:** the five top-bar menus (Insert, Edit, Arrange, View,
    Board) clipped at the bottom of the panel, the View menu screenshot in
    31. They were already capped to the window, which was not the bug:
    measured at 1280x640, View and Arrange ended at y=628 inside a 640px
    window while `#library-view-whiteboard` (`overflow: hidden`) ends at
    y=579, so the last 49px was cut off by an ancestor. Now on 31's recipe
    (escape the clipper, then cap, then scroll). kebab-viewport.js sweeps
    all five at 1440x900, 1280x640 and 1280x420: 15 cases, all OK. The tool
    rail and the properties panel are still open.
45. **The Ask sub-tab**: extra scroll, overflow, and the owner wants a
    redesign with an integrated advanced search and more utility. Owner:
    CHAT_PLAN Phase 1 (Ask) plus WORLD_CLASS 5.1 operators; the scroll
    part is 33.

### Found by an agent while measuring something else (2026-09-08, graph)

47. **Notes (10) and Library (9) still count over the seven-control
    ceiling** (`scratchpad/ui-sweeps/docks.js`), same as Graph did before
    this batch. Graph's fix (moving `#graph-view-picker` into its More menu)
    is not a decision this item can reuse for these two: graph.md section 3
    named its own two candidates for graph specifically, and named nothing
    for Notes or Library beyond the counts, so guessing which of their
    controls moves where is a design call, not a mechanical one (CLAUDE.md
    §2 rule 3 -- a missing decision is recorded, not remade). Both docks'
    inflated counts are partly an artefact of how `docks.js` counts, worth
    knowing before picking a fix: a native `<select>` is auto-enhanced into
    three counted elements (the select, its `.select-shell`, its
    `.select-opener`), and a `.seg` segmented control counts as one plus one
    per visible option, so Library's sort select and its two-button
    Cards/Rows segment alone are 6 of its 9, and Notes' sort select and its
    two-button Rows/Cards segment are 7 of its 10. Recommendation: before
    moving anything, decide in UI_MODERNISATION_PLAN Phase 8 whether the
    ceiling counts *controls a person reasons about* (a segmented view
    toggle is one decision, not three) or literal DOM elements as `docks.js`
    does today; if the latter stands, the same "into an existing menu"
    treatment graph got is available for Library's `#library-sort` (into
    Filter or More) and Notes' `#note-sort` (into a menu of its own), which
    would need one new decision line each rather than either being moved on
    a solo guess. Owner: UI_MODERNISATION_PLAN Phase 8.

### Performance on small laptops, measured 2026-09-08 23:30 UTC (Chromium, 1366x768, no GPU)

Numbers from `scratchpad/weight.js`: first load 6.7 MB over 71 requests
(uncompressed; the gzip layer is scoped to non-streaming API replies and
does not cover static files); unlock to ready 4.0s; idle traffic 4
requests a minute (was 14 in the audit); DOM 5,870 elements; JS heap 16 MB;
four blurred surfaces covering 32% of the viewport at rest; frame p95
16.7ms scrolling Notes. Script weight: app.js 1.6 MB, whiteboard.js 469 KB,
library.js 348 KB, documents.js 280 KB, graph.js 177 KB, all loaded at boot,
plus d3 and p5 vendored; 124 `backdrop-filter` rules across the CSS.

48. **Every module parses at boot, whichever tab opens.** Decision: load
    whiteboard.js, documents.js, library.js and graph.js on first use of
    their tab (a small loader in app.js, `tests/test_frontend_load_order.py`
    updated for the split; boot stays synchronous for app.js and the
    guards). Expected: the parse cost of about 1.3 MB of JavaScript leaves
    the startup path. Owner: Opus. Size M.
62. **"The documents formatting toolbar is gone."** Intentional, DOCUMENTS
    Phase 1: the strip is opt-in through the editor's ⋯ menu, "Always show
    formatting", and Phase 2 makes the floating selection toolbar the
    formatting UI. Nothing to fix; if the owner wants the strip on by
    default, flip the default in one line (documents.js `docToolbarMode`).
99. **Quick wins (Fable, 05:20): five features the plans did not list,
    each a day or less, each with the site.** (a) Undo on every delete
    toast: notes, boards, documents and reminders already soft-delete;
    `toastAction(msg, "Undo", () => restore)` at each delete call site
    (grep `toast(` beside `DELETE`), so a wrong click never reaches the
    bin. (b) "Reopen where I left off": documents and chats restore
    scroll position per id (localStorage `scroll:<kind>:<id>`), the
    Dashboard "Continue" tile (INBOX 60) reads the same keys. (c) The AI
    dot's tooltip shows the last answer's latency and the model's context
    use ("granite4.1:3b, 2.1 s, 39% of window"), from data the chat
    header already has. (d) A "Paste as note" global shortcut
    (Ctrl+Shift+V anywhere) that captures the clipboard as a new note
    with the AI filing it, the fastest capture path on a desktop. (e)
    Search operators in the Notes search box (`tag:`, `space:`,
    `before:`, `after:`, `has:file`), parsed client-side into the existing
    filters, with the operators listed in the box's '?' popover.
64. **Whiteboard properties panel, "needs a massive redesign and fix"**
    (three screenshots, 01:30): Copy style row, Guide colours (three swatch
    rows), then Group / Ungroup overlapping each other, an arrow button, the
    three align icons, two Space buttons and Extract notes "just chucked at
    the bottom". Owner: WHITEBOARD Phase 1 (properties panel), Opus.
    Decision: sections with a heading each (Style, Guides, Arrange, Notes);
    Arrange as one icon toolbar row on the dock recipe (align x3, distribute
    x2, group/ungroup as a pair) with tooltips, never label buttons that
    overlap; Extract notes as the section's one text button; measure that
    no two controls' rects intersect and the panel scrolls inside.
65. **Whiteboard panels "feel unrefined": the buttons look separate from
    the panels** (bottom tool bar, zoom pill, properties). Same fix as
    INBOX 52: one surface per panel, hairline dividers, no per-control
    background except the active tool. Owner: WHITEBOARD Phase 1.
66. **Lightbox opened only after leaving graph fullscreen** ("I clicked to
    view a document while in the graph fullscreen"). Owner: GRAPH Phase 6
    (Fable/Opus): the lightbox mounts at body level and the fullscreen
    element is `#graph-card`, so a body-level dialog is invisible while the
    Fullscreen API is active. Fix: mount the lightbox (and every dialog the
    node panel can open) inside the fullscreen element while fullscreen is
    on, or exit fullscreen first and re-enter on close. Size S.
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
69. **Agent activity panel: the dropdowns don't expand** (screenshot: a
    "Starting SearXNG" row with a caret that does nothing). Owner: Fable,
    now: the row is a `details`-like custom toggle; check its handler is
    wired after the panel re-renders (delegated listener, not per-row).
70. **Notifications: the "AI activity" combobox doesn't open, and the
    feature doesn't work** (screenshot). Owner: Fable, now: the select is
    replaced by enhanceSelect; the panel is a popover that closes on any
    outside click, which the enhanced menu counts as. Fix: the popover's
    outside-click guard ignores clicks inside `.select-menu`.
71. **Web search panel, function extraction UI, agent tools: "redesign
    them and make them better, more utility and abilities"**. Owner:
    CHAT_PLAN (next session, Opus): web search results as a source list
    with favicon, domain, title and a one-line snippet, "Open" and "Save as
    note" per result, persistent in the turn; the extraction UI (Extract
    notes) as a review list with checkboxes and per-item edit before
    saving; the Tools settings as a grouped table (read, write, destructive)
    with a search box, per-tool on/off and a "why" popover.
72. **Popup agent panel "still hasn't had its modern redesign"**. Owner:
    CHAT_PLAN (next session, Opus), with INBOX 45's Ask redesign.
73. **"Mute notifications except reminders" toggle disables itself when
    the settings close.** Owner: Fable, now: the preference is written on
    change but the panel re-renders from `prefsCache` before the save
    round-trip lands; write to the cache first, then save.
74. **Preferences page: "Save preferences" and "Delete my profile data" in
    separate panels; Ctrl+S saves progress such as settings.** Owner: Fable,
    now: the profile group gets its own settings-group with Delete as a
    ghost destructive button and a confirm; a `keydown` for Ctrl/Cmd+S on
    the Settings dialog clicks the section's Save.
76. **Inline citations must be accurate to the specific notes referenced
    where they are referenced.** Owner: WORLD_CLASS §14 grounding (Fable):
    the distinctive-terms rule already places numbers per sentence; add
    the evaluation: a fixture of 20 answers with hand-marked sentence to
    note pairs, precision and recall reported by `tests/test_grounding.py`,
    and the popover (INBOX 80) shows the matched terms so a wrong number
    is visible.
77. **Token window badge: not centred, text wrong; the window itself
    should be manageable by the user and auto when set** (screenshots:
    "6% of window" pill off-centre in the chat header, and the header wraps
    at width). Owner: CHAT_PLAN header (Fable, now for the badge; the
    window setting next session): a `num_ctx` preference per model in
    Settings > Models with Auto (the model file's value) or a number, sent
    on every request; the badge shows "used / window".
78. **Graph minimap UX and utility**: Owner: GRAPH Phase 6b (Opus): a
    viewport rectangle you can drag, click-to-jump, a size toggle, hide
    when the whole graph fits, cluster colours, the same in fullscreen.
79. **Files sub-tab rows "could still use a massive redesign upgrade", and
    clicking the file name does nothing**. Owner: Library dossier
    (WORLD_CLASS 4), Opus: one row recipe (thumbnail, name as the one
    link that opens the reader, meta line, reading state as a small
    disclosure, actions in a kebab), the name clickable.
80. **Citation hover/click preview**: hovering or clicking a numbered
    reference shows a popover with a preview of the thing (note, document,
    mind map, file, website) and a button to go to it; clicking the
    preview panel itself goes there. Owner: CHAT_PLAN (Opus, next
    session): one `referencePopover(kind, id)` for every kind, reusing the
    Library's previews.
81. **Web search results in the Sources dropdown: links rendered as
    Markdown links and number-referenced** (the model's table showed raw
    `<https://...>`). Owner: Fable, now: the answer renderer's link rule
    accepts autolinks in angle brackets; the sources list numbers web
    results after the notes so `[5]` resolves to a site.
83. **Tools settings: the big paragraphs ("How many are offered at once",
    "Small model mode") become '?' popovers** (screenshot). Owner: Fable,
    now: one line each, the rest behind `data-help-for`.
84. **Whiteboard rectangle selection draws behind objects.** Owner:
    WHITEBOARD Phase 1 (Fable, now): the marquee is drawn on the objects'
    layer; move it to the overlay canvas above them.
86. **Zoom popup does not show while a dialog (Settings) is open.** Owner:
    Fable: the zoom indicator's z-index sits under the modal; raise it
    above dialogs or show it inside the open dialog.
88. **Fullscreen graph has no glass opacity** (screenshot: the graph card
    in fullscreen is a flat panel). Owner: GRAPH Phase 6 (Fable): the
    fullscreen element paints `--page` under it, so the card's 55% shows
    nothing; give `:fullscreen .graph-card` the page background art or a
    solid `--modal-bg` on purpose and say so.
89. **Glass settings: sheen strength, opacity and blur "don't do
    anything"**. Owner: Fable, now: measure each with getComputedStyle
    against the top bar and a dialog; the card blur is now off unless the
    animated background is on (INBOX 49), so the slider must also drive
    the top bar, the docks and the dialogs (it does through
    `--glass-blur`); opacity drives `--card` alpha (check the palette
    override order); sheen is a gradient over `.card` only when
    `data-glass-sheen=on`.
90. **User chat bubbles "still very ugly"** (screenshot: a lavender block
    with "YOU" and an avatar circle top-right). Owner: CHAT_PLAN (Opus):
    a quieter bubble (accent-soft fill, no avatar, the label as a small
    muted "You" above, radius from tokens, max-width 70%).
92. **Suggested links panel UI refine** (screenshot: rows of quoted
    pairs, a wide "Why?" input, a percent chip, Link and X). Owner: Opus,
    next slot: two note chips joined by an arrow, the score as a small
    bar, the reason field collapsed behind "Add a reason", Link primary
    per row, a "Link all above 70%" action in the head.
93. **Mind map: Coggle-level controls** (six screenshots and a long
    list). Owner: MINDMAP_PLAN Phase 6 (next session, Opus, 2 sessions).
    Placed as MINDMAP_PLAN §12 with the full list: map-specific toolbar
    (not the whiteboard's), + handles on edges to add a branch, a root
    can always be recreated when the map is empty, node edit strip (text
    size drag handle, bold/italic/alignment, link, image, icon), node
    context radial (shape x6, label on the link or above it, auto
    arrange, comment, add branch, drag to transplant, copy branch, remove
    item; Alt turns adds into removes), link context (reverse, label,
    style, delete), link colour wheel on click, draggable control points
    on a curve, uncollapse (a count badge that reopens), sever and move a
    whole branch by its parent, background shapes to section areas, export
    PDF/PNG/.mm/outline and import by drop.
94. **Background animations: fix, refine and improve.** Owner: UI Phase 3
    follow-up (Opus): each style gets a measured frame cost, a still frame
    under Performance mode, no seams at the edges, the intensity slider
    changes something visible at every step.
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
97. **OCR alternative to pytesseract**, asked directly. Answer: RapidOCR
    (PaddleOCR models on onnxruntime, pip-installable, no system binary,
    better on photos and mixed layouts, about 60 MB of models, Apache-2)
    is the one to offer; EasyOCR needs torch (never). Placed as a
    Settings > Packages option beside Tesseract, same reading pipeline,
    the reader named on the row. Owner: next session, Sonnet (backend
    adapter with a fake in tests) plus the Packages row.
98. **The documents formatting toolbar**: see 62; the owner asked again.
    Default stays opt-in until Phase 2's selection toolbar lands.
63. **Redesign the Ask sub-tab, Write with the AI and Capture** (three
    screenshots, 01:12; the owner: "modernise them and bring them up to
    standard with features, function and ui ux"). Owner: Opus, next slot,
    one brief (CHAT_PLAN's INBOX 45 folds in). Decisions: Capture keeps
    its one-column form but the title, the formatting strip and the box
    become one framed field (title as the first line, strip inside the
    frame's top edge, no separate rounded strip), the six action buttons
    collapse to Attach + Dictate + Improve with From library and Sketch
    under Attach, the "Add to document" and "File under" selects move to
    one settings row under the box with the space note, Save primary and
    "Save as draft" ghost; a live "N words · reading time" in the foot;
    Ctrl+Enter saves. Write with the AI becomes a two-pane editor with
    one shared toolbar (Draft it primary; Undo, Extract notes, Discard
    ghost; tone and length as a segmented control instead of a free
    text hint, with the hint field behind it), the draft pane in the
    body font not monospace, a word count per pane, and the tag field
    beside Save. Ask keeps its layout and gets: the AI answer and the
    matching records as two equal-height columns with their own scroll,
    the answer box unframed (one panel, not a card in a card), the
    "Ask again" chips as a scrolling row, a "Sources" foot listing every
    grounded note with confidence, an Answer style segment (Brief,
    Detailed, Bullets) replacing the select, keyboard: Enter asks,
    Shift+Enter newline, Esc clears; the settings popover keeps its id.
60. **Dashboard "Jump to / Run a skill / stat tiles" section** (screenshot,
    00:58; the owner: "could do with an upgrade and better design, utility,
    features"): three pill links, three skill pills with dashed borders, four
    stat tiles, all left-aligned in a band with most of its width empty.
    Owner: Opus, next slot (dashboard). Recommendation: one "Start" row
    that fills the width, the stats as a compact strip with a sparkline for
    the week and the streak, the skills row showing the last-run time and a
    Run button per skill, a "Continue" tile for the last note or document
    touched; the band's height unchanged.
59. **Graph node popup panel redesign** (screenshot, 00:50; the owner:
    "include redesigning the graph node popup panels in the graph redesign
    plan"): title, five meta chips at one weight, a file card, a tall
    content editor, tags, Save, then a 3x3 grid of nine equal action
    buttons (Favourite, Grow, Focus, Similar, Link, Trace, Remind, Open,
    Bin). Placed as GRAPH_PLAN Phase 6. Owner: Opus, now.
56. **Library image cards, "really ugly"** (screenshot): thumbnail, file
    name, "Used in" chip, a Description bullet with Show more, a model chip,
    a "Text in this image" bullet with Show more, a "Read by ..." chip: six
    ranks of information at one weight, chips for provenance that read as
    actions. Owner: Opus, next slot, with INBOX 52 (whiteboard bottom bar).
    Recommendation: thumbnail with the file name on it; one line "Used in
    <chip>"; the description as one paragraph with a "More" toggle; the OCR
    text folded under a single "Text in this image" disclosure; provenance
    as one muted line at the foot ("Described by X, read by Y"), no chips.
52. **Whiteboard bottom bar: the tool groups "feel separate from the
    panels and not integrated"** (screenshot: seven pill groups with their
    own backgrounds and dividers inside one bar, and the zoom pill on the
    right in a different style). Owner: WHITEBOARD Phase 1 (bottom rail),
    with the mind map agent's whiteboard work merged first. Recommendation:
    one bar surface, groups separated by a hairline divider only, no
    per-group background; the zoom pill on the same recipe. Size S.

## Placed (last 20, newest first)

- 2026-09-08: dashboard hero preference, New note tile colours, sub-tab
  arrow keys, Files reading, sidebar toggle, mindmap bugs, line numbers,
  docks as one bar, timeline redesign, responsive design, em-dashes,
  paragraphs to popovers, security review: all placed (HANDOVER "flagged
  list") and most built.
