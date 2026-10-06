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

685. **The owner, 2026-10-06, verbatim**, with a screenshot of the
     Regenerate button's focus ring cut off along its left edge: "a lot of
     borders get cut off on an edge." Focus rings and borders clipped by an
     ancestor's `overflow`. Next: sweep every focusable control on every
     surface for a ring outside its nearest clipping ancestor, and fix by
     room (padding or an inset ring), never by hiding the ring. Placed: the
     0.4.1 mini release, a Sonnet agent.

686. **The owner, 2026-10-06, verbatim**, with a screenshot of the
     Dashboard's Notebook constellation: "can you add a smooth animation for
     regenerating the notebook constelation??" Regenerate redraws in one
     frame. Placed: an Opus agent, with 687.

687. **The owner, 2026-10-06, verbatim.** "does the companion or at least
     atlas have a subtle breathing look??" Next: check what a resting
     companion and Atlas do now (sample the figure per frame at rest); if
     nothing breathes, add a slow, small breath (a few percent of scale on
     the torso, about 4 to 5 s a cycle, never in the face's features),
     under the avatar motion switch and reduced motion. Placed: with 686.

688. **The owner, 2026-10-06, verbatim.** "is there a way to do very good
     imitations of ai responses but using string concatenation with the app
     when the ai isnt available with the option to toggle between them in
     the ask subtab?? it needs to be VERY refined and well worded and
     designed and use some world class shenanigans to make it work, nice
     and understandable to read, well structured and more." What exists:
     `ai/extractive.py` (INBOX 269), the best passage per note, cited, never
     an invented claim. Decision taken: a composed answer built on it, never
     breaking its rule (every factual clause is the person's own words or a
     count the app measured; only connective wording comes from templates),
     shaped by the kind of question (what/when/who/how many/list/compare/
     why/how), with a lead sentence, grouped points, dates and numbers
     pulled out, agreements and contradictions between notes named, and a
     one-line "what your notes do not say"; a toggle in Ask between "AI"
     and "From your notes" (the latter always available, the default with
     no model). Placed: the 0.4.1 mini release, an Opus agent when a slot
     frees (brief: session scratchpad brief-composer-688.md).

689. **The owner, 2026-10-06, verbatim**, with a screenshot of a document
     with tracked changes: the "Accept this insertion / Reject this
     insertion" menu and the spelling tooltip ("faque" is not in the
     dictionary, its candidates, Add to dictionary, Ignore in this document)
     open at once over the same word, overlapping: "these overlap a
     little". Cause: the suggestion menu opens on mousedown
     (documents-prose.js `docSuggestMenu`) while CodeMirror's lint tooltip
     (`docSuggestAnswers`, documents.js) shows for the same word. Decision
     taken: one surface: a press on a suggested change whose text also
     carries a finding opens one menu, the change's Accept/Reject first,
     then the finding's answers as their own group; the lint tooltip is
     closed while any app menu is open. Placed: the 0.4.1 mini release, the
     next free agent slot.

691. **The owner, 2026-10-06, verbatim.** "also maybe a way to better sort
     through links and tags without the ai?? like removing tags that dont
     have a custom reason (reasons other than "similar in meaning") and that
     have a low conficence score, maybe could be added in the notes tab??
     like manual or automated ways to manage notes and other things
     systemnatically and programatically nearly up to par with the ai but as
     an option if the ai isnt available or as an alternative. needs to also
     be known to the user, no use having them if the user doesnt know about
     them. I feel like there are a lot of features hidden". Then: "also so
     many notes get the reason "similar in meaning". the notes adn
     management of things around them needs to be more dynamic and better.
     world class". Placed: the 0.4.1 mini release, an Opus agent (audit,
     then a Tidy surface in Notes, specific link reasons, discoverability).

692. **The owner, 2026-10-06, verbatim**, with a screenshot of a sparse,
     stretched force layout: "can you add a resuffle button or feature to
     the graph to rearrange how the graph sits on the main force view??"
     The graph has Unpin all and no re-layout. Placed: with 693, the next
     free agent slot.

693. **The owner, 2026-10-06, verbatim**, with a screenshot of the graph
     where a link passes behind other notes' dots: "bit of overlap". Links
     drawn through nodes they do not connect, and nodes close enough to
     touch. Placed: with 692. And, the same hour, with a screenshot of the
     force view: "is there a way to get the graph to sit in ways that are
     more visually appealing and understandable and profesional and
     stylisitc and modern and intentional and impressive and meaningful??"
     692 and 693 are one Opus design pass on the force layout: clusters by
     category with clear space between them, hubs central, labels never
     over dots or lines, links routed round nodes they do not join, a
     Reshuffle (new seed, animated) and a fit to view.

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

