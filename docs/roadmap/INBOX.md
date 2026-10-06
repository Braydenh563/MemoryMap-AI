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

561. **The owner, 2026-10-05, verbatim.** "I dont like this section in th
     timeline, it needs redesigning, restructuring, moving ro smth"
     (screenshot: the "Sep to Oct 2026" month button over a row of seven
     boxed day cells, Tue 29 to Mon 5, each its own bordered tile).
     Placed: the design agent, whose 543 rework of this strip is not merged
     yet; it is told this is still not right.
     Merged 2026-10-05 (543): the month sits between its arrows and the days
     are one well to the dock's edge, one Tab stop, arrows walk them
     (daystrip.js 44/44). Waits on the owner's look before closing.

669. **The owner, 2026-10-06, verbatim.** "when I click atlas, it often
     starts tilting to the left then just snaps back" / "in the enlarged view
     panel". INBOX 600 eased a mood's loop back over 0.7s
     (`nameMarkBuddyBlend`, atlas.js ~3527); a click still snaps. Next:
     reproduce in the enlarged view, sample the figure's transforms per frame
     after a click (the atlas600-still.js method), find what cuts the tilt
     (a play class removed, a mood timer, a second click restarting it), and
     hand back without a jump. With it, the owner, the same hour: "atlas's
     arm movements are jerky and not smooth" (measure the arms' rotation per
     frame through each move; no step over a few degrees a frame, no
     keyframe that jumps). Placed: the 0.4.1 mini release, an Opus agent
     when a slot frees.

675. **The owner, 2026-10-06, verbatim**, with a screenshot of the
     Dashboard's Focused view: a full-width card holding "Evening, Brayden."
     over "You have 33 notes" at the left and "8:35 pm" over "Tuesday 6
     October" at the far right, the middle empty. "can you improve the
     dashboard hero section on the focused view??" Placed: the 0.4.1 mini
     release, an Opus design agent.

676. **The owner, 2026-10-06, verbatim**, with two screenshots of the Notes
     compact rows view (a collapsed row: chevron, title, a link snippet, the
     category chip, tags and "1 week ago" sitting low, with the hover
     buttons hanging half below the row's bottom edge; an expanded row: the
     chevron now an up arrow in a bordered square button, the hover buttons
     again low at the right with a stray circle after them): "hovering over
     collapsed notes on the compact rows view the popup hover buttons arent
     correctly positioned, the metadata isnt centred. when expanded the
     dropdown arrow is different and bordered, it isnt clean, the arrow
     should smoothly change, the dropdown and collapse should be a smooth
     animation adn not sudden and janky." Placed: the 0.4.1 mini release, an
     Opus agent.

677. **The owner, 2026-10-06, verbatim**, with a screenshot of the
     Dashboard's Compact view: a "Quick access" label, then five equal,
     bordered, full-height boxes (New note, Sketch, Ask AI, Remind me,
     Meeting notes) stretched across the whole row, each icon and word
     left-aligned in a mostly empty box. "the quick access looks wierd and
     not refined in the compact view". Placed: with 675, the dashboard
     hero agent (same surface).

678. **The owner, 2026-10-06, verbatim**, with two screenshots of one note
     card, before and after "Show more" (the same four lines both times,
     only the line spacing larger after): "this note has show more but it
     doesnt have any text cut off, it just increases the spacing between the
     rows". Two faults: "Show more" is offered for text that is not
     clipped, and the clamped and expanded states set different line
     heights. Placed: with 676, the rows agent (the same card code).

679. **The owner, 2026-10-06, verbatim**, with a screenshot of a note
     card's open ⋯ menu: "the popup buttons on notes disappear when pressing
     the meatball button and opening the menu". The card's hover action
     cluster hides while its own menu is open. Placed: with 676.

680. **The owner, 2026-10-06, verbatim.** "should the settings sidebar
     scroll a little to show the quick access in page sections if scrolling
     on that settings page??" Recommendation, taken: yes; as a Settings page
     scrolls, the sidebar keeps the current in-page section's link in view
     (scrolled to nearest, smoothly under the motion switch, never stealing
     focus). Placed: the 0.4.1 mini release, a Sonnet agent.

681. **The owner, 2026-10-06, verbatim**, with a screenshot of a note
     card's open ⋯ menu: "not all dropdown elements close when pressing that
     element again". Every menu, dropdown and popover trigger toggles: a
     second press on the control that opened it closes it. Next: inventory
     every trigger (kebabMenu, the action menus, custom selects, popovers,
     split buttons) and press each twice. Placed: with 680.

682. **The owner, 2026-10-06, verbatim**, with a screenshot of the
     Documents sidebar's "Documents | Outline" tabs (square-cornered boxes,
     the chosen one bordered): "should these have rounded edges to stay
     conistent??" Recommendation, taken: yes, the radius table's value for a
     control of that size (DESIGN.md), the chosen state drawn the way every
     other tab strip draws it.

683. **The owner, 2026-10-06, verbatim**, with two screenshots of a
     pill-shaped floating bar "Copy | ... | X" (square-cornered fill on the
     hovered "..." and a square focus ring on the X, both inside the round
     pill): "the square active goes out of the circular pill". Every control
     inside a pill takes a radius that sits inside it (concentric: the
     pill's radius minus its padding, or fully round), for hover, active and
     focus alike. Placed with 682: the 0.4.1 mini release, a Sonnet agent
     that also sweeps for other square states inside rounded containers.

## Placed (last 20, newest first)

- 2026-10-05: 596, 608 (board rail and dock, edge auto-pan) placed in
  WHITEBOARD_PLAN.md and 607, 609, 610 (map from the graph, smooth
  branches, node toolbar) in MINDMAP_PLAN.md, "Placed from INBOX,
  2026-10-05 (boardmap-1005)"; the boardmap-1005 agent holds them.
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

