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

663. **The owner, 2026-10-06, verbatim.** "there is no forgot password option
     in the lock screen." Today the only way back in is the terminal command
     `python -m memorymap --reset-password` (Help names it), and private notes
     stay sealed by the old password whatever is done. Recommendation: a
     "Forgot your password?" link under the field that opens one card saying
     plainly what a reset does and does not recover (notes yes, private notes
     no, a sealed backup only with its own password), with the command to
     copy and, in the desktop app, a button that runs the same reset after a
     typed confirmation. Placed: next PR.

664. **The owner, 2026-10-06, verbatim.** "Placing coordinates of templates on
     the mindmap and whiteboard could be improved (little off from the
     cursor)." A template placed from the Library lands offset from where the
     pointer is. Next: measure the drop point against the placed group's
     anchor at several zoom levels (a click place and a drag place, board and
     map), and anchor the template where the pointer is (its centre on a
     click, the grab point on a drag). Placed: next PR.

665. **The owner, 2026-10-06, verbatim**, with four screenshots (the mind
     map size picker "S Map M L XL"; the mind map popup's Box, Edge bar and
     Fill rows as wrapping pill wells; a three-pill count group "21 / 0 /
     21"; the note composer's formatting toolbar): "also clean up or
     redesign this bit in the mind map popup. also i dont really like these
     multi pill elements exept in some small cases like the little view
     mode 2 pill ones in places and the formatting toolbar in the note
     capture and edit forms go slightly off the edge on the border".
     Recommendation: a `.seg` well only for two or three short, always
     visible choices (view modes); longer option sets become a select or a
     swatch/preview picker per DESIGN.md, the popup restructured; the
     toolbar measured and kept inside its border at every width. Placed:
     the 0.4.1 mini release, an Opus design agent.

666. **The owner, 2026-10-06, verbatim.** "also I feel like the features for
     the command pallate and the find anything search kinda clash, like the
     command pallate I though was just for quick commands and navigation, not
     for finding notes and documents etc. I feel like that should be left to
     the find anything but idk". Today both overlap: the palette
     (app-palette.js) asks `/search` for notes and documents and lists
     reminders and conversations; Find anything (spaces-find.js) searches
     every kind and also lists the palette's commands (INBOX 270). Decision
     taken (the VS Code and Linear split): the palette is commands and
     places in the app only (tabs, sub-tabs, Settings pages, actions); its
     content groups go, and typed text that matches no command offers one
     row, "Search everything for ...", which opens Find anything with the
     text. Find anything stays the one search over content and keeps its
     actions group (the owner's 270), below the content. Placed: the 0.4.1
     mini release, a Sonnet agent.

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

