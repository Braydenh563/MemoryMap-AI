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
2. **(fixed)** **Note card kebab: "nothing appears but a vertical scrollbar"** (and
   when it does open, it scrolls inside a clipped box; submenus AI actions,
   Connect, Add never show; menus stay stuck on screen after scrolling the
   note away; hard to close by clicking off). `openActionMenu` /
   `escapeMenuIfClipped` in app.js (~2589, ~2663) plus the `08-consistency`
   menu recipe: escaped menus need `position: fixed`, `max-height:
   calc(100vh - 2*gutter)` with internal scroll, close on any scroll of an
   ancestor, close on outside pointerdown (capture), and submenus rendered
   as sibling escaped menus. Sweep: open every kebab on Notes, Library,
   Documents head, Chat head; assert menu rect inside viewport, submenu
   opens, closes on scroll and outside click. Owner: consistency.md item 1b.
   **Done:** `buildMenuGroupButton`'s three flyouts (AI actions/Connect/Add)
   now escape to `<body>` (like the top-level kebab already did) and clamp
   on both axes, `openGroupSubmenu` tracks the single one that may be open
   so opening a sibling closes it. The outside-close listener moved from a
   bubble-phase `click` to a capture-phase `pointerdown`. A real, separate
   bug found while writing the sweep: scrolled to the bottom of a long
   Notes or Library list, the last card's own kebab sat directly under the
   fixed `.scroll-top` button (measured with `elementFromPoint`, no
   clearance at all), so a real click there landed on the button instead;
   `--scroll-top-clearance` (00-tokens-shell.css) reserves the room now on
   both lists. `scratchpad/ui-sweeps/kebab-viewport.js` (new) covers all
   four surfaces at 1440 and 1024, plus the submenu and the outside-close.
3. **(fixed)** **Chat composer cannot be resized by hand** (spasms) and has no max
   height. Likely two handlers fighting (auto-grow on input vs the CSS
   resize handle). Cap at 40vh, let manual resize win until cleared.
   Owner: D3 dossier, do as a bug now.
4. **(fixed)** **Back/forward in the bottom bar need two clicks.** The nav-history
   handler probably records the click's own navigation as a new entry.
   Owner: bug now.
5. **(fixed)** **Tooltips and popovers flicker at another position for a frame** before
   settling: position is computed after first paint. Compute before
   removing `hidden` (measure with `visibility:hidden`), then show. Owner:
   consistency.md.
6. **(fixed)** **Skill picker and other long comboboxes fill the screen**: enhanced
   select lists need `max-height` with scroll and a search field over ~12
   items. Owner: consistency.md.
7. **(fixed)** **"Still writing / Jump to latest" pill takes a row of the chat
   panel** rather than floating over it. Owner: CHAT_PLAN.md. **Done:**
   `.chat-transcript` (new wrapper around `#chat-messages`) is the
   positioning root; the pill is `position: absolute` inside it instead of
   `position: sticky` as a plain flex sibling (sticky still reserved its
   own row in the flex column, that was the "takes a row"). Measured live:
   forcing the pill visible now moves the composer 0px.
8. **(fixed)** **Viewed-note chips in skill steps: text centred and clipped.** Owner:
   consistency.md (chip recipe: left aligned, ellipsis).
9. **(checked, already correct)** **Streaming icon is a static three-dot triangle**; step "Working" rows
   render above the step content. Owner: AGENT_SKILLS_REFORM Phase D.
   Measured live: `typingDots()`'s three dots render in a tidy row (no
   triangle offset beyond ~1px of animation jitter), reduced-motion honours
   the app's own `data-progress-motion` setting exactly as designed, and a
   simulated `thinking → tool → tool → answer` timeline confirmed the tool
   rows render *inside* `agent-step-group`'s own body, in order
   (`toolRowsInGroup: 2`). Could not reproduce either half live; left as is
   rather than changing working code on a hunch.
10. **(fixed)** **Sketches appear in Library All > Files.** Filter by kind. Owner:
    docks.md / Library dossier.
11. **(fixed)** **New mind map's first node under the top bar; dragged map nodes leave
    their edges behind.** Owner: mindmap.md item H (already listed) plus
    the edge-follow regression from the marquee fix; add a sweep check.
    **Done:** both root-placement paths (`createNewBoard`'s Mind map
    segment and `createConceptMap`) now call `wbCenterOn` against the
    root's real rendered box instead of a guessed board coordinate;
    measured `{dx:0, dy:0}` from the canvas centre. The edge-follow bug was
    in `wbApplyBulkMove`: it moved every selected card's position but only
    the one card the pointer was on had its own linked sketches updated
    each frame. `wbCaptureBulkMoveOrigin` now precomputes each moved
    item's own links, `wbApplyBulkMove` updates them too. Reproduced
    before the fix (an edge between two *other* cards in the drag froze
    solid through the whole gesture) and confirmed after. Checks (F)/(G)
    added to `scratchpad/ui-sweeps/mindmap.js` (51/51 passing).
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
13. **(fixed)** **Reminders date/time inputs: different height and alignment** from
    the other controls. Owner: D8, do as a quick fix (control recipe on
    `input[type=date|time]`).
14. **(fixed, two of three already correct)** **Bottom bar icons and text misaligned; spaces combobox icon and text
    misaligned; popup-agent input icon misaligned.** Owner: consistency.md
    item 4 (the alignment sweep must include these three). **Measured all
    three before touching anything:** the bottom bar (status-notes/
    status-reminders/status-agent) and the spaces switcher were already
    within 0.36px and 0.00px, no change needed. Only the popup agent's row
    was actually off (4px), two stacked causes: `.command-palette-icon`'s
    glyph is drawn far larger than its neighbour, where `.ph`'s global
    `vertical-align: -0.12em` (tuned for same-size icon+text, correct
    everywhere else) pushes it off instead of onto centre, fixed with
    `display: inline-flex` on the icon's own span; and the textarea was
    inheriting a stacked-form-field `margin-bottom` that `align-items:
    center` was centring the *margin box* of, not the visible field.
    Verified live: both now read 167.59, a 0.00px diff.
15. **Modal backdrop blur does not cover the full viewport height.** Read: `.modal-overlay` is `position: fixed; inset: 0`, so the unblurred strip is the desktop shell's native title bar, outside the page. Not a CSS bug; if it matters, the shell (pywebview/Electron) must draw a frameless window with the app's own title bar. Owner: packaging.
16. **(fixed)** **Chat header kebab has a filled ground while other kebabs do not.**
    Decision: no fill; one icon recipe. Owner: consistency.md.
17. **(fixed)** **Chat dock has no bottom padding; the bottom bar's distance from the
    page differs from the top bar's.** Decision: yes, make them equal
    (`--page-gutter`). Owner: Phase 9 / consistency.md.
18. **(fixed)** **Formatting toolbar: pinned group square-cornered and only opaque on
    the note edit form, not on the documents toolbar; the documents
    toolbar is squashed.** Owner: DOCUMENTS_PLAN Phase 1 (chrome).
    **Done:** `.doc-toolbar-tools` gets `border-radius: var(--radius)`, the
    strip's own outer corner (it never set one at all). Measured the
    opacity claim before touching it: the gradient background is
    byte-for-byte identical on both `#note-toolbar`'s clone and
    `#doc-toolbar` (`mountDocToolbarControlsFor` builds the group the same
    way for every `.doc-toolbar`), so that half was already fixed by an
    earlier commit. **"Squashed at 1440" not reproduced**: measured gap,
    row-gap and the space around every `.doc-toolbar-sep` on both toolbars
    at 1440, byte-identical; a screenshot of an open document at 1440
    shows one comfortable row with clear group gaps, no wrapping. Left
    alone rather than guessing a fix for something not actually broken.
19. **(fixed)** **Strikethrough shortcut missing** (Ctrl+Shift+S or Ctrl+Shift+X).
    Owner: DOCUMENTS_PLAN Phase 1; trivial, do with 18. **Done**, and wider
    than the literal ask: only `#doc-content` had *any* keyboard shortcuts
    at all (Ctrl+B/I never worked from the keyboard in the note capture
    box or the note edit form, despite their own toolbar tooltips claiming
    otherwise). `wireMdFormatShortcuts` (documents.js) gives Ctrl+B,
    Ctrl+I and Ctrl+Shift+S to all three editors; `#doc-content`'s own
    handler gained the Shift+S branch (checked before plain Ctrl+S, since
    both fold to the same key after `.toLowerCase()`). The documents
    editor's help hint now names all three. Verified live in all three
    boxes; a plain Ctrl+S still saves.
20. **(fixed)** **Boards & maps: still no gap between the All/Maps/Boards chips and
    the cards.** Owner: docks.md.

### Design and feature requests (become brief rows)
- Ask sub-tab and Chat "like Perplexity but better": per-claim citations
  did not appear (one grounded note for an answer naming several; a skill
  run showed none). Owner: Brief 12 (citations) plus a grounding fix in
  `ai/grounding.py` now: every note the tools read in the turn is a
  candidate source, not only the retrieval set.
- Retrieval, semantic search and knowledge backend "need a lot of
  fixing": Brief 11 and B4.
- Skills: confirm one-tool-per-step does not cap what a skill can do; the
  "Find loose ends" run showed list_notes pagination hiding ids. Owner:
  Brief 13 (verifier; a step may loop a tool until its contract is met).
- Popup agent: more quick prompts and utilities, opened-items chips
  restyled, the whole panel on the consistency recipes. Owner: CHAT_PLAN.md Phase 3.
- Write with AI tab: behind in function and UI. Owner: new dossier D16
  (below).
- Capture tab: modernisation. Owner: D2.
- History button and panel in Ask: modernise. Owner: CHAT_PLAN.md.
- Library Images cards: redesign; Files rows: a generated synopsis instead
  of a caption; image captions shown another way; lightbox gets
  "Describe with AI" / "Redescribe" for images and sketches. Owner: D4
  plus F10.
- Link popups and file/image chips everywhere (notes, dashboard, library,
  timeline, graph popups, chat): one chip recipe. Owner: consistency.md.
- Quick sketch highlighter rework. Owner: WHITEBOARD_PLAN.md.
- Widget editor, template picker, AI assistant dialog, Tools & features
  dialog, new-board dialog: onto the modal recipe. Owner: D1, D10, D14.
- Light mode "too light": add a per-mode brightness (surface contrast)
  slider in Appearance rather than darkening the palette for everyone.
  Owner: D13.
- Glass: keep, but reduce to the panel level only (§1.1). Owner: Brief 2.
- AI features when the model is offline: disabled with a reason on hover
  and a one-line "Connect a model" link, never hidden; everything else
  fully usable. Owner: WORLD_CLASS §5 (a `/capabilities` read at boot).
- Graph: separation and gravity, the stray highlighted node on pan, the
  fullscreen layout. Owner: GRAPH_PLAN Phase 2.
- Timeline plan: written by Fable (below), not Opus.

### Found on the full-transcript scan (2026-09-08 14:10 UTC)

Every owner message of the session was re-read against this file, HANDOVER's
flagged list and `agent-remaining/*.md`. These five had no home; they have
one now. Everything else the owner flagged is tracked above or in the plan
named beside it in HANDOVER's completion table.

21. **(fixed, 5724587)** **Graph "Display options" is a menu item inside
    View, one click too deep** ("annoying to access, be thoughtful"). Decision: the View menu
    keeps layout, colour and legend; physics, labels, similarity lines,
    minimap and suggestions move to a gear utility button on the graph dock
    (the dock grammar's utilities row: refresh, help, more), one click.
    Owner: GRAPH_PLAN Phase 2 (chrome).
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

27. **(fixed, 1cd59c2 and 7fcfcf6)** **Graph labels pile up at fit zoom**
    (screenshot, 15:40): with labels on
    and under 400 nodes every label draws, and the dense cluster is
    unreadable. Decision: collision avoidance per frame, highest degree
    first; a label that would overlap one already drawn waits for hover or
    zoom. Owner: GRAPH Phase 2 (agent-remaining/graph.md).
28. **(fixed, 0b26491, confirmed with an assertion in 5825b77)**
    **Panning the graph highlights one unlinked node** and shows its label
    while the rest dims. A pan must never change hover or focus. Owner:
    GRAPH Phase 2.
29. **(fixed, 4c84351 and 6ee5a31)** **Fullscreen is broken**: the card keeps its height, the top bar stays,
    the canvas is not resized. Fullscreen hides the chrome, sizes the canvas
    to the viewport, keeps the radius, restores on Esc. Owner: GRAPH Phase 2.
30. **(fixed, 4caed49)** The widgets dialog painted closed behind the
    Dashboard hero and on Graph; Done did nothing. A display rule on a
    <dialog> not scoped to [open]. Reload after pulling.

### The 16:00 pile (owner out of usage, asleep), placed in one pass

31. **(fixed)** **Dropdown menus clip off the bottom of the panel and do not scroll,
    app-wide** (whiteboard View menu screenshot; the `details.dock-menu`
    family, not `.action-menu`). Fix: on toggle, measure the list's rect
    and set `max-height: calc(100vh - top - gutter)` with `overflow-y:
    auto`; escape an `overflow: hidden` ancestor the way
    `escapeMenuIfClipped` does for `.action-menu`. One recipe for both
    families. Owner: Sonnet batch A.
    **Done:** vertical cap now recomputed from the list's own top on every
    open (was a flat `100vh` cap, position-unaware); `escapeMenuIfClipped`
    extended to `.doc-dock-menu-list`. Reminders' Quick set at 1024x560:
    rect.bottom 732/560 (172px past, no scroll) before, inside the
    viewport and scrollable after. `kebab-viewport.js` extended to sweep
    all five `details.dock-menu`s at 1440x900 and 1440x300, all OK.
32. **(fixed)** **Dashboard "Widgets / Edit layout" bar**: an empty bar with two
    buttons at the right, touching the stats above and the widgets below.
    Fix: `margin-block: var(--space-5)`; a left-side label ("Your
    dashboard", muted) so the bar has an identity zone like every other
    bar; both buttons on the ghost recipe. Owner: Sonnet batch A.
    **Done:** margin-block added, "Your dashboard" label added. Gap
    0px/0px before, 13px/13px after at 1440x900.
33. **(fixed)** **Too much scroll room at the bottom of pages** (Notes > Ask, Notes,
    Library). `--scroll-top-clearance` (about 100px) stacks with the
    agent-monitor buffer and the page gutter. Fix: clearance = the button's
    height plus one gap only, applied only while `.scroll-top` is visible
    (a body class the button toggles); measure `scrollHeight - clientHeight`
    on an empty Ask sub-tab and assert 0. Owner: Sonnet batch A.
    **Done:** token shrunk to button height + one gap; applied only under
    a new `body.scroll-top-visible` class the button's own `update()`
    toggles. Notes > Ask at 1440x600: scrollHeight/clientHeight 618/467
    (151px, 100px of it padding) before, 518/467 (51px, all real content)
    after.
34. **(fixed)** **Chat: "Jump to latest" pill and a square down-arrow button both show
    on a new chat with nothing to scroll.** Decision: one control, the
    pill; it shows only when the transcript is scrolled away from the end
    and has overflow. The `.chat-transcript` wrapper changed the scroll
    container; re-derive `data-stuck` from the element that scrolls.
    Owner: Sonnet batch A.
    **Done:** `syncChatJumpLatest` re-derives `stuck` from the live rect
    instead of trusting the cached `dataset.stuck` (stale after
    `newChatConversation`'s `replaceChildren()`, which fires no scroll
    event); chat joined `NO_SCROLL_TOP_TABS` (one control, the pill, per
    the decision). Reproduced: pillHidden false / arrowVisible true on an
    empty 40-message-then-cleared transcript before; both false after.
35. **(fixed)** **Chips show raw Markdown** (`**Ice Breakers:**`, `# CAB432`) in the
    popup agent's Found / Opened rows and the chat's note badges; the
    palette's reference badges clip and centre their text. Fix: `noteLabel`
    strips Markdown markers for chip text; the chip recipe (left aligned,
    ellipsis) applied to `.command-palette` chips and answer badges. Owner:
    Sonnet batch A.
    **Done:** `cmdPaletteTouchedRow` and `renderRelatedElsewhere` now route
    `item.label` through `noteLabel` (were raw); `.answer-related-chip` is
    a `<button>` that never set `text-align`, so the UA default (`center`)
    won, fixed to `left`. "# CAB432" -> "CAB432", "**Ice Breakers:**..." ->
    "Ice Breakers: ...", buttonTextAlign "center" -> "left".
36. **(fixed)** **The streaming indicator still does not animate** (owner, desktop
    shell). Likely `prefers-reduced-motion` from the OS or the app's
    `data-progress-motion` preference. Fix: check both in Chromium with
    `getAnimations()`; under reduced motion show the word "Writing" with a
    slow opacity pulse rather than three static dots. Owner: Sonnet batch A.
    **Done:** "always" (the default) confirmed running via `getAnimations()`
    in every combination tested; the "auto"+reduced-motion/"still" fallback
    replaced the stepped-dots `.is-on` class-toggle (no Web Animation at
    all) with a phase-labelled word and a `typing-word-pulse` opacity
    animation, declared explicitly inside its own
    `@media (prefers-reduced-motion: reduce)` block per
    `test_style_scale.py`'s check, with a comment on why it stays on.
37. **(fixed)** **Reminders: the Magic add textarea is taller than the Add button** on
    the owner's desktop (screenshot); measured 44/44 in headless light.
    Check dark-theme and font-load timing for `.autogrow`; pin the empty
    field to `--control-h-lg` until text wraps. Owner: Sonnet batch A.
    **Done:** confirmed 44/44 here too, in both themes; reproduced the
    drift by swapping the field's font (simulating a fallback font/
    different engine's line-box metrics): 45px vs the button's 44px.
    `autoGrow()` now reads `getComputedStyle(el).minHeight` for an empty
    field instead of measuring `scrollHeight` (font-independent); 44/44 in
    all four light/dark x normal/drifted combinations after. Growth once
    text wraps, and the shrink back on clearing, still work (44 -> 66 ->
    44).
38. **(fixed, chip and label only)** **Notes from a deleted space appear in All spaces** (the owner was in
    the space). Reproduced the API: notes created with the space header
    are deleted with the space. Not reproduced: the owner's path. Fix the
    visibility first (INBOX 1a): every card shows its space chip when it
    differs from the active space or the active space is All; the capture
    form names the space it files into. Then the owner can tell which
    workspace the survivors carry. Owner: Sonnet batch A (chip and label),
    D2 for the bulk move.
    **Done:** `EntryOut` gained `workspace_id` (the row had it,
    `_to_out` never sent it); note cards show a left-aligned, clickable
    space chip whenever the picker doesn't already say it; capture form
    shows "Filing into <space>." above File under, including the "All
    spaces" case (files into Default Space, said explicitly). Verified
    live with a real created/deleted-space scenario; D2's bulk-move action
    still open.
39. **(fixed)** **Skills run in Ask mode should switch to the agent mode
    automatically; rename "Request" to "Agent"** (owner's suggestion for
    learnability). Decision: yes to both. Owner: CHAT batch B (Opus).
    **Done:** the mode segment reads Ask / Agent (long halves "Ask the
    Librarian" and "Agent mode": "Agent the Librarian" is not English), and
    so do its tooltip and accessible name, the per-turn chip on a message's
    meta line, the progress musing, the nudge's action button, the Plan-mode
    toast and the plan docs that name the control. `tools_enabled` and
    `use_tools` are untouched, so saved settings survive. `startSkill`
    switches the mode to Agent before it sends, toasts "Switched to Agent for
    this skill." and leaves it switched; the old rule (the backend turning
    tools on for an action skill's own call and the segment still saying
    "Ask") is recorded where it was. Measured in Chromium
    (`scratchpad/ui-sweeps/chatmode.js`, new): the segment buttons are 65px
    and 81px at 1440 and 158px and 126px at 1700 with no label overflow, and
    launching a skill from Ask mode leaves the toggle checked, the agent
    button active, `tools_enabled` true on the server and exactly one toast.
40. **(fixed)** **Skill runs and agent answers show no inline numbered
    citations; note badges in the chat do not render inline Markdown.** The
    backend now grounds touched notes (284e7e0); the skill run's final answer
    element must get `addInlineCitations` too, and badges use the same
    inline renderer as the answer. Owner: CHAT batch B (Opus).
    **Done:** three causes, each of which alone lost every marker in a run.
    The first was one word. The timeline gives every prose step its
    own `.bubble-answer` node, and all three grounding call sites passed
    `querySelector`, so the citation walker was handed step one's narration
    while every grounded sentence was in the final answer several nodes
    below. `addInlineCitations` now takes the turn's whole prose, latest
    block first (a sentence the closing summary repeats belongs on the
    summary; a step's own sentence still gets its marker where it is), and
    `test_inline_citations.py` fails on any call site that narrows back to
    one node. The badges go through a new `setNoteLabel`, which renders a
    note's Markdown the way the answer does, with `plainText` beside
    `noteLabel` for the title and aria-label contexts; links and images are
    flattened first, since these labels live inside `<button>` chips.
    The other two were found by measuring rather than by reading. (i) The route
    concatenated the answer deltas of every round with no separator, so the
    last sentence of one round and the first of the next arrived glued
    ("...in it.I checked..."); `split_sentences` cannot split that, and the
    row it produced named text that appears in no paragraph on screen. It
    inserts a blank line at the events that start a new prose block now, the
    same shape the transcript has. (ii) `liveMarkdownRenderer` arms a paint up
    to `LIVE_RENDER_INTERVAL_MS` ahead; on a fast run that timer fired *after*
    `finalise()` and after the markers went in, repainting identical prose
    without them. `finalise` cancels it first. Measured with `phasec.js`
    against the stand-in model server: a nine-block skill run carries its
    marker on block 8 (its final answer), the agent turn on its own last
    block, nine badges render Markdown and none shows a raw marker.
41. **(the panel: fixed, 5724587 and dbff8f0; the clean-up is Phase 4)**
    **Graph display options belong on the dock, and the options panel
    needs a redesign**; the graph needs a utility, UI and interaction
    clean-up. Owner: GRAPH Phase 2 remainder (gear button, INBOX 21) and
    Phase 4; the panel on the popover shell with the dock-menu sections.
42. **Mind map still broken** (screenshot: a dangling curve not attached
    to either node after a drag; the root and "New topic" far apart).
    Owner: `agent-remaining/mindmap.md` item H, edge-follow on single-node
    drag; reproduce with mindmap.js first.
43. **Whiteboard bottom tool rail and the properties panel** are not on
    the refined recipes (the top bar is). Owner: WHITEBOARD_PLAN Phase 1.
44. **Documents toolbar crushed, its kebab menu rows tinted and
    misaligned**: deferred by the owner to DOCUMENTS Phase 1.
45. **The Ask sub-tab**: extra scroll, overflow, and the owner wants a
    redesign with an integrated advanced search and more utility. Owner:
    CHAT_PLAN Phase 1 (Ask) plus WORLD_CLASS 5.1 operators; the scroll
    part is 33.

### Found by an agent while measuring something else (2026-09-08, graph)

46. **Every off switch in the app has no track fill, app-wide.** The pill
    toggle's rule (`06-timeline-dialogs.css`, the long comment beginning "An
    off switch has to look like a switch") sets `background: color-mix(in
    srgb, var(--ink) 12%, var(--page))`, and `--page` is a
    `linear-gradient(...)`, not a colour, so the `color-mix` is invalid where
    it is used and the declaration is dropped: measured on the Graph's
    Similarity switch and the Chat dock's Tools switch, both
    `rgba(0, 0, 0, 0)`. An off switch is still an outlined pill with a knob
    (the `--muted` border survives), so this is the third round of a bug that
    was reported twice, not a new blank gap. Fix: mix against a real colour
    (`--card`, or a `--page-solid` token if one is wanted), then re-measure
    both surfaces. Owner: consistency.md; one commit, one CSS rule.

## Placed (last 20, newest first)

- 2026-09-08: dashboard hero preference, New note tile colours, sub-tab
  arrow keys, Files reading, sidebar toggle, mindmap bugs, line numbers,
  docks as one bar, timeline redesign, responsive design, em-dashes,
  paragraphs to popovers, security review: all placed (HANDOVER "flagged
  list") and most built.
