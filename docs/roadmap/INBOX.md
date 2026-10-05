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

542. **The owner, 2026-10-05, verbatim.** "some of the badge icons and text
     arent aligned vertically." (screenshot: the Installed badge in Settings,
     Packages).

566. **The owner, 2026-10-05, verbatim.** "the whiteboard help popup is still
     cooked and needs a redesign" (screenshot: the empty board's help card,
     the Move around column's key pills clipped at the right, long labels
     printed over their pills, the description cut off). Placed: the
     whiteboard agent, as the board's searchable shortcut sheet (was UX-03).

570. **The owner, 2026-10-05, verbatim.** "when I open comments on the
     whiteboard, the new comment form is permanently showing below, there
     should be a new comment option below for it to show" Placed: the
     whiteboard agent.

576. **The owner, 2026-10-05, verbatim.** "this menu's elements arent aligned
     vertically" (screenshot: a shape's context bar, its Width input, Solid
     select, swatches and Filled toggle at different heights and centres).
     Placed: the whiteboard agent.

577. **The owner, 2026-10-05, verbatim.** "when loading into the app, the
     companion or atlas's head goes large then small then large again then
     settles on the normal size. also loading up the app is very laggy or
     visually slow. it is visually not clean and glitchy even though it may
     not be. can you smoothen it or do some ux shenanigans to make it
     cleaner??" Placed: a smoothness agent (boot choreography, the
     companion's mount) and the Atlas motion agent (the drawing at rest).

578. **The owner, 2026-10-05, verbatim.** "this section in the chat sidebar
     looks awkward" (screenshot: the Chats head, a large filled New button,
     a lone wide Recent select below). Placed: the graph and sidebar agent.

580. **The owner, 2026-10-05, verbatim.** "the atlas companion and app in
     general is ever so slightly laggy. I think opening pages and between ui
     views like tabs, pages, popups, features like the graph etc need to be
     more smooth in transitions and cheap to hide the ugly loading glitches."
     Placed: the smoothness agent, with 577.

581. **The owner, 2026-10-05, verbatim.** "on the mindmap, the solid and
     dashed bar are exactly the same on mind map nodes" (seen on a build
     before 569's fix was pushed; to verify on the new head). Placed: the
     graph and sidebar agent.

582. **The owner, 2026-10-05, verbatim.** "bro's just perched on nothing in
     the mindmap. the companion keeps being left floating in places on
     various pages and sub tabs and tabs" (screenshot: the companion sitting
     in the air on a map's canvas). Placed: the smoothness agent (a perch is
     re-checked on every view change, pan, zoom and popup; never in the air).

584. **The owner, 2026-10-05, verbatim.** "no spacing between the message and
     show it link on this notification" ("Finished reading this file.Show
     it"). Placed: the notifications agent.

585. **The owner, 2026-10-05, verbatim.** "the elements in notifications are
     clashing, misaligned, and/or poorly spaced again. and that notification
     I mentioned just before isnt available for me to access the link in the
     notifications. all notifiactions that contain links or buttons need to
     show and be accessible in the notifications panel" Placed: the
     notifications agent.

586. **The owner, 2026-10-05, verbatim.** "the graph is a little jittery when
     nodes move around or adjust position" Placed: the graph agent.

587. **The owner, 2026-10-05, verbatim.** "when I click nodes on the graph, it
     moves the graph slightly??" Placed: the graph agent.

561. **The owner, 2026-10-05, verbatim.** "I dont like this section in th
     timeline, it needs redesigning, restructuring, moving ro smth"
     (screenshot: the "Sep to Oct 2026" month button over a row of seven
     boxed day cells, Tue 29 to Mon 5, each its own bordered tile).
     Placed: the design agent, whose 543 rework of this strip is not merged
     yet; it is told this is still not right.
     Merged 2026-10-05 (543): the month sits between its arrows and the days
     are one well to the dock's edge, one Tab stop, arrows walk them
     (daystrip.js 44/44). Waits on the owner's look before closing.

589. **The owner, 2026-10-05, verbatim.** "in the quick access, only the new
     note link widget is a different colour. should the one in the first
     position be highlighted by default with the option to highlight the
     others other colours too??" Decision taken (recommendation): yes; the
     first tile carries the accent by position, not by being New note, and
     each tile's menu offers a tint from the note colour set. Placed: the
     quick-access and gutter agent.
590. **The owner, 2026-10-05, verbatim.** "can you redesign and make this
     line numbers column cleaner and more modern and professional?? this is
     the one in the capture a note subtab but also in the other similar
     sections like the note edit form and others" (screenshot: a boxed gutter
     with its own rounded card edge and a heavy "1" beside the composer).
     Placed: the quick-access and gutter agent.

591. **The owner, 2026-10-05, verbatim.** "the regular companion enlarged
     panel view has no life to it like with atlas and the companion itself"
     (screenshot: Profile, the companion's enlarged dialog, a still figure
     over "Its own face, read from its name"). Placed: the Atlas motion agent.
592. **The owner, 2026-10-05, verbatim.** "these badges and metadata dont
     have their icons vertically aligned with their text, probably the case
     elsewhere as well" and "same here as well" (screenshots: the Fits and
     Installed badges, a note's meta row: category dot, 100%, Add tags, Tag
     with Atlas, "74% similar", "#Sketches"; link chips beside a boxed "+3
     more links" in another shape). Placed: the icon alignment agent.

## Placed (last 20, newest first)

- 2026-10-05: 540, 554, 556, 564, 575 (Atlas motion and form) placed in
  agent-remaining/OPEN.md, "Atlas, placed from INBOX 2026-10-05"; the Atlas
  agent holds them.
- 2026-10-04: 528 (the knowledge graph, better than Obsidian and Notion)
  placed in GRAPH_PLAN.md, "The knowledge graph, 2026-10-04".
- 2026-09-13: 128 placed in DOCUMENTS_PLAN.md.
- 2026-09-13: 162, 159 placed in WORLD_CLASS_PLAN.md.
- 2026-09-13: 165, 164 placed in UI_MODERNISATION_PLAN.md.
- 2026-09-08: dashboard hero preference, New note tile colours, sub-tab
  arrow keys, Files reading, sidebar toggle, mindmap bugs, line numbers,
  docks as one bar, timeline redesign, responsive design, em-dashes,
  paragraphs to popovers, security review: all placed (HANDOVER "flagged
  list") and most built.

