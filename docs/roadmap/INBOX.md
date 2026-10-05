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

595. **The owner, 2026-10-05, verbatim.** "why are new libraries off the
     table?? should we bundle multiple packages together for bulk download if
     various features need multiple libraries or dependencies in the packages
     settings with the ability to install/uninstall/reinstall individual ones
     or in bulk??" Decision taken (recommendation): yes. Optional extras
     (`core/extras.py`) stay the way a feature takes a library; add named
     bundles, bulk install/uninstall/reinstall with per-package progress,
     reinstall per extra, version and size per row. With it: pictures in the
     Word export on the existing `docx` extra (FEAT-18). Next agent slot.

596. **The owner, 2026-10-05, verbatim.** "the dropdown menu from the
     library is a little off position. the side dock of the bottom toolbar
     in the whiteboard is ugly, poorly structured and designed and clashes
     with the side panel. some skeleton loaders are missing like on the
     dashboard. the height of this side bar changes on the whiteboard and
     mindmap and I want mind map specific stuff in that sidebar too as half
     of it is empty when on the mind map as it isnt applicable like with
     layers and the element library. can you add preset whiteboard and mind
     map templates that are draggable fromt he library??" (screenshots: the
     Library panel's kebab menu sits low and left of its button; the board's
     sidebar rail (library, format, layers, present) overlaps the tool dock's
     left column; on a map the rail is a tall empty column with four icons.)
     Placed: the next whiteboard agent, after the integration merges the
     whiteboard phase 2 branch (same files).

600. **The owner, 2026-10-05, verbatim.** "when I click on atlas in the
     enlarged view, it might sway or do something for a couple seconds but
     will then snap still." Placed: the Atlas agent slot.
601. **The owner, 2026-10-05, verbatim.** "on atlas can you make the tail
     seem more integrated with the body instead of just coming out from the
     butt?? make it smooth and biological. also add more movement and
     variation to the tail position, behaviour, movement, same with the
     celestial rings and planets on it which dont move or look different,
     and the astral swirl around each could have a bit of movement or subtle
     animation as well. also I want to be able to double tab the drag to
     resize circle on the companion to reset it to default size." Placed:
     the Atlas agent slot, with 600.
607. **The owner, 2026-10-05, verbatim.** "I made a mind map from the graph
     but the notification included no link to it" (toast: "Mind map "test"
     made from 33 notes. It is in Library, Boards." with no action) and "this
     is how it made the map, surely there's a better and more dynamic way it
     can build the map based off the connections and links and relevancy
     etc??" (screenshot: one root with 33 children in a single column).
     Placed: next agent slot (Opus): an Open action on the toast and the
     bell row; the map built from the graph's structure: clusters
     (categories or link communities) as branches, linked notes as children
     of the note they link to, a central note (most connected or the one
     picked) as the root, a balanced radial/tree layout, cross-links for
     links that do not fit the tree.

608. **The owner, 2026-10-05, verbatim.** "when I drag select off the
     screen on the whiteboard and mind map and probably on other tabs, it
     doesnt scroll down or up or the way I am dragging etc" (screenshot: a
     marquee on a map running under the bottom toolbar). Placed: the board
     and map agent (with 596, 607): edge auto-pan for marquee and item drags
     on boards and maps, and edge auto-scroll for drag selection in lists
     (Notes, Library) where a drag selects.
609. **The owner, 2026-10-05, verbatim.** "on longer mind map links, I can
     actually see the hard bends in the line and it isnt a smooth curve"
     (screenshot: a map branch line drawn as four straight segments). Placed:
     the board and map agent: the tapered branch path sampled finely enough
     (or drawn as true curves) that no corner shows at any zoom.

610. **The owner, 2026-10-05, verbatim.** "also utility and usability for
     the mindmap is unintuitive like with resizing the mindmap nodes,
     resizing the text, changing various features and other things about
     the mindmap nodes with the individual nodes themselves adn the popup
     tool menus (not the radials)". Placed: the board and map agent (with
     596, 607-609): direct manipulation on the node (resize grips that
     appear on select, text size on the node's bar, inline edit), one clear
     node toolbar instead of nested popup menus, every node property
     reachable in at most two steps, measured by a task sweep.

616. **The owner, 2026-10-05, verbatim.** "its better but still needs a more
     modern and professional ui/ux redesign (the note edit form)"
     (screenshot of the 606 form: boxed title band, a heavy mixed toolbar,
     big chips with a doubled #, a floating category select, large Related
     rows, big Cancel and Save). Then: "the note edit form attach a link
     button doesnt do anything" and "there is no padding around the tag
     entries, and the formatting toolbar looks really awkward when collapsed
     and the core concepts dropdown is completely out of place and badly
     designed". Placed: the design-rows agent, first.
617. **The owner, 2026-10-05, verbatim.** "on the mind map when selecting a
     group of nodes, it defaults to the whiteboard selection and popup menus
     and right click menus etc" (screenshots: the board's group box, its
     right-click menu and its align/distribute bar on map topics). Placed:
     the board and map agent, with 610.

618. **The owner, 2026-10-05, verbatim.** "do the top bar and bottom bar
     need a more modern and professional ui/ux redesign or adjustments at
     all or are they fine??" Recommendation taken: top bar polish (spaces
     picker as a ghost control matching the tab pills, active tab without
     extra bold, a smaller logo tile, power secondary); bottom bar declutter
     (counts quiet, Agent/Guide/Find icon-only with tooltips, Commands the one
     labelled door, the status mark explained, the clock optional, history
     arrows grouped with undo/redo). Placed: the design-rows agent, after 616.

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

