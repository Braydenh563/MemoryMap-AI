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
    **Third family, e1e395b:** the whiteboard's own top-bar menus were on a
    cap of their own and not on this recipe, so an `overflow: hidden`
    ancestor still cut them (49px of the View menu at 1280x640). Same
    recipe, same order; see 43.
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
42. **(fixed, e985f57; H closed in 047e385)** **Mind map still broken**
    (screenshot: a dangling curve not attached to either node after a drag;
    the root and "New topic" far apart).
    Owner: `agent-remaining/mindmap.md` item H, edge-follow on single-node
    drag; reproduce with mindmap.js first.
    **Done:** a map's tree edges are derived from `parent_id` on render, not
    link sketches, so nothing followed a one-node drag (the bulk case was
    c2912cd). Measured before: the curve sat 155.6px from the child mid-drag
    and 129.2px from the root, and stayed there after the drop for any node
    already pinned, because `wbMapPinOnDrag` only re-renders the first time
    it pins. After: 0px in every case, including a second drag and a reload.
    The placement half was measured and is fine: a new child lands 76px to
    the right of its parent, inside the visible canvas. mindmap.js 49 to 63
    checks, including the concept map path (note cards and link sketches, a
    different creation path) and both of section H.
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
44. **(fixed, DOCUMENTS Phase 1)** **Documents toolbar crushed, its kebab menu rows tinted and
    misaligned**: the header is one height with five controls, the menu rows
    36px with no fill; the strip is opt-in from the menu.
45. **The Ask sub-tab**: extra scroll, overflow, and the owner wants a
    redesign with an integrated advanced search and more utility. Owner:
    CHAT_PLAN Phase 1 (Ask) plus WORLD_CLASS 5.1 operators; the scroll
    part is 33.

### Found by an agent while measuring something else (2026-09-08, graph)

46. **(fixed) Every off switch in the app has no track fill, app-wide.** The
    pill toggle's rule (`06-timeline-dialogs.css`, the long comment beginning
    "An off switch has to look like a switch") set `background: color-mix(in
    srgb, var(--ink) 12%, var(--page))`, and `--page` is a
    `linear-gradient(...)`, not a colour, so the `color-mix` was invalid
    where it was used and the declaration was dropped: measured on the
    Graph's Similarity switch and the Chat dock's Tools switch, both
    `rgba(0, 0, 0, 0)`. An off switch is still an outlined pill with a knob
    (the `--muted` border survives), so this was the third round of a bug
    that was reported twice, not a new blank gap. Fixed by mixing against
    `--card` (the pane these controls actually sit in, per DESIGN.md)
    instead. `scratchpad/ui-sweeps/switches.js` swept every selector the
    rule targets, off-state only, both themes: 17 groups, all
    `rgba(0, 0, 0, 0)` before (the graph options panel's five toggles, the
    chat dock's `#tools-toggle` shown and as-shipped-hidden, and eight
    Settings-section switches); all resolve to a real ~60%-alpha fill in
    both themes after, none transparent. Owner: consistency.md.

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

47. **(fixed, this session)** ~~Static assets are not compressed.~~ This
    session's own `curl` against a freshly restarted server, before touching
    anything, found the premise wrong: the gzip middleware added in 610def1
    (Aug 23) is innermost and wraps the static mount along with everything
    else, so `/app.js`, every other root script, `/vendor/*` and `/css/*`
    were already coming back `content-encoding: gzip` (app.js 1.6 MB plain,
    515 KB on the wire), and `tests/test_compression.py`'s
    `test_the_frontend_is_compressed` already covered it. The 6.7 MB
    `weight.js` figure above is not evidence otherwise: Playwright decodes
    gzip before handing a response's `body()` to JS, so that number is the
    *decompressed* size regardless of whether the wire transfer was
    compressed, both before and after this fix. The real gap was
    `RevalidatedStatic` sending `Cache-Control: no-cache` on every static
    reply including stamped ones, so a `?v=<version>` URL (a different URL
    on every release, never actually stale) still paid a revalidation round
    trip it did not need. Fixed: a stamped request now gets `Cache-Control:
    public, max-age=31536000, immutable`; unstamped paths (including
    `/vendor/*`, deliberately unstamped by
    `test_asset_cache_busting.py::test_vendored_assets_are_left_alone`) keep
    `no-cache`. New test: `tests/test_static_compression.py`. Owner: Sonnet,
    one session.
48. **Every module parses at boot, whichever tab opens.** Decision: load
    whiteboard.js, documents.js, library.js and graph.js on first use of
    their tab (a small loader in app.js, `tests/test_frontend_load_order.py`
    updated for the split; boot stays synchronous for app.js and the
    guards). Expected: the parse cost of about 1.3 MB of JavaScript leaves
    the startup path. Owner: Opus. Size M.
61. **Fixed 2026-09-09 (Fable): the Help & guide topics box sat flush
    against the "Ask the guide" box** (screenshot, 01:12); one group gap
    between them now.
62. **"The documents formatting toolbar is gone."** Intentional, DOCUMENTS
    Phase 1: the strip is opt-in through the editor's ⋯ menu, "Always show
    formatting", and Phase 2 makes the floating selection toolbar the
    formatting UI. Nothing to fix; if the owner wants the strip on by
    default, flip the default in one line (documents.js `docToolbarMode`).
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
75. **Fixed 2026-09-09 (Fable): the selectionchange after the click rebuilt the popup over the open menu; the same selection with its menu open is left alone. Not verified in a browser. Selection kebab menu needs two clicks to open** (chat message
    selection "..." button). Owner: Fable, now: the first click moves
    focus off the selection, the selectionchange handler hides the button
    and the menu with it; the menu must open on `mousedown` with
    `preventDefault` so the selection survives.
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
82. **Fixed 2026-09-09 (Fable, CSS in 08-consistency, not verified in a browser): the row is one flex line, title first, actions right, description under. Settings misalignment**: "Search inside images (Tesseract OCR)" and
    "BGE Small (English)" rows show the status chip and the two buttons
    on a second line, right-aligned, under the heading (two screenshots).
    Owner: Fable, now: the row's header is a flex row that wraps; give the
    title `flex: 1 1 12rem` and the actions `flex: 0 0 auto` on one line,
    wrapping under 560px only.
83. **Tools settings: the big paragraphs ("How many are offered at once",
    "Small model mode") become '?' popovers** (screenshot). Owner: Fable,
    now: one line each, the rest behind `data-help-for`.
84. **Whiteboard rectangle selection draws behind objects.** Owner:
    WHITEBOARD Phase 1 (Fable, now): the marquee is drawn on the objects'
    layer; move it to the overlay canvas above them.
85. **Fixed 2026-09-09 (Fable): "m" then a letter, with a toast listing the targets while the chord is armed; the Keyboard shortcuts page updated. Quick navigation: change the "g" prefix to "m", with visual
    assistance** (a hint strip after the first key listing the targets).
    Owner: Fable, now (app.js ~33950): key "m", a small "m then: n Notes,
    c Chat, g Graph..." toast for 2 s after the prefix.
86. **Zoom popup does not show while a dialog (Settings) is open.** Owner:
    Fable: the zoom indicator's z-index sits under the modal; raise it
    above dialogs or show it inside the open dialog.
87. **Fixed 2026-09-09 (Fable): showSettingsSection scrolls its scrolling ancestor to the top. Settings: reopening goes back to Models but the scroll does not
    reset.** Owner: Fable, now: `showSettingsSection` scrolls the body to
    0 when the section changes.
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
91. **Fixed 2026-09-09 (Fable, CSS, not verified in a browser): the chat identity shrinks with an ellipsis on the title, the readouts stay on one line, the actions never wrap. Chat header wraps and misaligns at width** (screenshot: title, model,
    exchanges, window pill, tokens, then the three icons on a second
    line). Owner: Fable, now: title `flex: 1 1 auto` with ellipsis, the
    meta as one `flex: 0 0 auto` group that hides tokens then exchanges
    under 900px, the icons never wrap.
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
95. **Fixed 2026-09-09 (Fable): the writing trace joins the progress-motion "always" exception the dots already had, so it moves under Reduce motion and Performance mode too. Streaming icon: the three-dot line beside the cycling text does not
    move while text streams** (the jumping dots work while waiting).
    Owner: Fable, now: the streaming state class is set on the wrapper
    but the icon's keyframes are keyed to the waiting class; one class
    for both, or a second animation for `is-streaming`.
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
57. **Not reproduced at head (Fable, 01:05): with a board open in a 900px window the View menu is 596px tall, uncapped, no clipping ancestor; the cap is innerHeight minus its top. Retest after updating; if it recurs, send the window height. Whiteboard View menu cut short** (screenshot, 00:47; reported as
    "the view menu in the library"): the top-bar View menu opens about 240px
    tall with a scrollbar, "Snap to grid" clipped at the bottom, with the
    whole canvas free below it. Owner: Fable, now. Measure the menu's
    max-height rule (`.wb-topbar` menus, batch A's "menus in viewport"
    clamp) against the space actually available.
58. **Fixed 2026-09-09 (Fable): "Copy message" on an assistant turn copies the open thinking steps, the plan, each tool call with its arguments and result, and the answer as Markdown, in order (verified on a synthetic turn). The Markdown export still writes question and answer per turn; the run detail is in the copy. Copying a chat message copies only its last section.** The owner:
    "when I copy text from a chat or assistant message bubble, it only
    shows the last agent section of the message, I want it to capture
    everything in the whole chat and assistant messages, including
    thinking processes (if toggled), tool calls, and everything in the
    chat." Owner: Fable, now: the message copy action serialises the whole
    turn (thinking when shown, each tool call as a line, the answer), and
    a "Copy chat" action does the same for every turn.
53. **Fixed 2026-09-09 (Fable): an empty autogrow box is its natural height floored at min-height; measured 44px with a 66px placeholder before. Capture box crushed** (screenshot, 00:44): the main "Type anything"
    textarea on Notes is about two lines tall with its own scrollbar, the
    placeholder's second line clipped, under the "Formatting" strip.
    Owner: Fable, now. Measure `#note-input` (or the capture textarea's id)
    height, min-height and the autogrow pin at 1440 and 1024.
54. **Not reproduced at head (Fable, 01:05): a saved chat's kebab opens a 200x195 menu with five 36px rows, escaped to the body; the screenshot most likely came from the build running before the launcher fix (the update relaunch had failed). Retest after updating; if it recurs, note the window size. Selection kebab menu invisible** (screenshot): highlight text, the
    selection toolbar's "..." opens a flat dark bar with a scrollbar and no
    items. INBOX 33's "completely crushed" shape, still present after batch
    A. Owner: Fable, now. Reproduce by selecting text in the capture box
    and clicking the toolbar's ellipsis; measure the menu's height and its
    items' display.
55. **Fixed 2026-09-09 (Fable): the centre pull now follows the slider, 1x at 50 and 3.25x at 100; measured on three seven-note islands, RMS radius 288 at 50, 136 at 100, 560 at 0. Max gravity still spread out** (graph screenshot): at the gravity
    slider's top the components sit far apart with empty space between.
    Owner: Fable, now: raise the gravity force ceiling in graph-worker.js
    tuning (and a component-packing pull at the top of the range).
56. **Library image cards, "really ugly"** (screenshot): thumbnail, file
    name, "Used in" chip, a Description bullet with Show more, a model chip,
    a "Text in this image" bullet with Show more, a "Read by ..." chip: six
    ranks of information at one weight, chips for provenance that read as
    actions. Owner: Opus, next slot, with INBOX 52 (whiteboard bottom bar).
    Recommendation: thumbnail with the file name on it; one line "Used in
    <chip>"; the description as one paragraph with a "More" toggle; the OCR
    text folded under a single "Text in this image" disclosure; provenance
    as one muted line at the foot ("Described by X, read by Y"), no chips.
50. **Fixed 2026-09-09 (Fable). `start-desktop.bat` fails after the update
    check: `'"C:\Projects\MemoryMap-AI\--desktop"' is not recognized as an
    internal or external command`.** SHIFT in the argument parser moved %0,
    so the self-update relaunch's `"%~f0"` became the first flag. The path
    is captured as MM_SELF/MM_HOME before :parse_args and nothing after it
    reads %0 (`tests/test_launcher_scripts.py`). Not verified: a Windows
    run; the shape is reasoned from cmd's SHIFT semantics and the message.
51. **Fixed 2026-09-09 (Fable). Splash: the step's marquee bar is drawn
    across the step text** ("Checking for updates on GitHub, 1s" under a
    green bar, screenshot). The bar now sits 18px into the row, under the
    16px detail label, 3px tall (`tests/test_launch_splash.py`). Not
    verified: a Windows run.
52. **Whiteboard bottom bar: the tool groups "feel separate from the
    panels and not integrated"** (screenshot: seven pill groups with their
    own backgrounds and dividers inside one bar, and the zoom pill on the
    right in a different style). Owner: WHITEBOARD Phase 1 (bottom rail),
    with the mind map agent's whiteboard work merged first. Recommendation:
    one bar surface, groups separated by a hairline divider only, no
    per-group background; the zoom pill on the same recipe. Size S.
49. **Fixed 2026-09-09 (Fable): blur off content cards, the hero, the
    sidebar and the status bar; Performance mode (auto/on/off) with the
    small-machine and reduced-transparency auto-on and a one-time toast;
    graph worker at half rate; five surfaces added to the glass-off list.
    Measured at 1366x768: blurred area at rest 6 to 10% per tab with glass
    on (was 32 to 81%), 0 to 4% in Performance mode; gate in
    `tests/test_perf_mode.py`.** Glass is drawn on too much of the screen. Four blurred surfaces
    cover a third of the viewport at rest; on an integrated GPU each is a
    repaint on every scroll. Decision (WORLD_CLASS 1.1 and Brief 2,
    restated): glass only on the top bar, floating docks and popovers,
    never on cards or content panels; a "Performance mode" switch in
    Appearance (glass off, motion off, graph worker at half rate) that the
    app suggests once when `navigator.deviceMemory <= 4` or
    `hardwareConcurrency <= 4`, and that `prefers-reduced-transparency`
    turns on by itself. Owner: Opus, with the glass count in
    `scratchpad/ui-sweeps/glass.js` as the gate (blurred area at rest under
    10% of the viewport). Size M.

## Placed (last 20, newest first)

- 2026-09-08: dashboard hero preference, New note tile colours, sub-tab
  arrow keys, Files reading, sidebar toggle, mindmap bugs, line numbers,
  docks as one bar, timeline redesign, responsive design, em-dashes,
  paragraphs to popovers, security review: all placed (HANDOVER "flagged
  list") and most built.
