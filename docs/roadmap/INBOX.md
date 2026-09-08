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
2. **(partly fixed: menus close on any outside scroll, 0be76eb+1)** **Note card kebab: "nothing appears but a vertical scrollbar"** (and
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
6. **Skill picker and other long comboboxes fill the screen**: enhanced
   select lists need `max-height` with scroll and a search field over ~12
   items. Owner: consistency.md.
7. **"Still writing / Jump to latest" pill takes a row of the chat
   panel** rather than floating over it. Owner: CHAT_PLAN.md.
8. **(fixed)** **Viewed-note chips in skill steps: text centred and clipped.** Owner:
   consistency.md (chip recipe: left aligned, ellipsis).
9. **Streaming icon is a static three-dot triangle**; step "Working" rows
   render above the step content. Owner: AGENT_SKILLS_REFORM Phase D.
10. **(fixed)** **Sketches appear in Library All > Files.** Filter by kind. Owner:
    docks.md / Library dossier.
11. **New mind map's first node under the top bar; dragged map nodes leave
    their edges behind.** Owner: mindmap.md item H (already listed) plus
    the edge-follow regression from the marquee fix; add a sweep check.
12. **Whiteboard: export-selection popover opens a full-height list in the
    wrong place; arrow drawn shows both caps as Arrow in properties;
    missing align-centre and distribute-gaps; the arrange panel's buttons
    are unreadable (icons overlapping text).** Owner: WHITEBOARD_PLAN.md.
13. **(fixed)** **Reminders date/time inputs: different height and alignment** from
    the other controls. Owner: D8, do as a quick fix (control recipe on
    `input[type=date|time]`).
14. **Bottom bar icons and text misaligned; spaces combobox icon and text
    misaligned; popup-agent input icon misaligned.** Owner: consistency.md
    item 4 (the alignment sweep must include these three).
15. **Modal backdrop blur does not cover the full viewport height** (a
    strip at the top under the desktop title bar). Owner: consistency.md.
16. **(fixed)** **Chat header kebab has a filled ground while other kebabs do not.**
    Decision: no fill; one icon recipe. Owner: consistency.md.
17. **(fixed)** **Chat dock has no bottom padding; the bottom bar's distance from the
    page differs from the top bar's.** Decision: yes, make them equal
    (`--page-gutter`). Owner: Phase 9 / consistency.md.
18. **Formatting toolbar: pinned group square-cornered and only opaque on
    the note edit form, not on the documents toolbar; the documents
    toolbar is squashed.** Owner: DOCUMENTS_PLAN Phase 1 (chrome).
19. **Strikethrough shortcut missing** (Ctrl+Shift+S or Ctrl+Shift+X).
    Owner: DOCUMENTS_PLAN Phase 1; trivial, do with 18.
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

## Placed (last 20, newest first)

- 2026-09-08: dashboard hero preference, New note tile colours, sub-tab
  arrow keys, Files reading, sidebar toggle, mindmap bugs, line numbers,
  docks as one bar, timeline redesign, responsive design, em-dashes,
  paragraphs to popovers, security review: all placed (HANDOVER "flagged
  list") and most built.
