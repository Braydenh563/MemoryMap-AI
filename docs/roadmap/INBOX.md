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

540. **The owner, 2026-10-05, verbatim.** "one of the feminine atlas blinking
     animations has MASSSSIVE eyebrows."
     Not reproduced (2026-10-05): the live companion drawn at 6x, feminine
     and masculine, six poses by nine moods/acts, the blink lids sit within
     2px of the eyes and the closed-eye stroke and lashes are their usual
     size; mid-blink frames looked at. Needs the owner: a screenshot of the
     moment, or which pose/mood it was in (sitting, lying, drowsy, startled).

542. **The owner, 2026-10-05, verbatim.** "some of the badge icons and text
     arent aligned vertically." (screenshot: the Installed badge in Settings,
     Packages).

553. **The owner's decisions, 2026-10-05** (asked, answered; binding):
     (a) Entity merge gets Undo: snapshot both entities and their mentions
     before a merge, and Undo in the toast splits them back exactly.
     Built 2026-10-05 (38debe1, `tests/test_entity_merge_undo.py`).
     (b) The undo histories of each board, map and document survive a
     reload (the last ~100 steps, stored; WHITEBOARD_PLAN decision 17 is
     amended). Built 2026-10-05: IndexedDB, `undo-store.js`; decision 17
     as amended; `mmdoc1005-undoreload.js` 4/4.
     (c) Status labels app-wide are a tinted pill without an edge, matching
     the meta chips.
     (d) The dashboard's map widget is "dynamic depending on map size and
     scale": the card's height and the map's scale follow the map's shape,
     a small map at a readable size, a tall one in a taller card up to a
     limit, then fitted whole. Built 2026-10-05: the Boards & maps widget
     draws its busiest board large (`dashMapFeature`, dash-boards.js, lazy),
     96px to 168px for six topics or fewer, up to 320px otherwise, fitted
     whole past that; `mmdoc1005-dashmap.js` 5/5 at 1440 and 390.
     Placed: the next free Opus, after the boot-JS split lands (budget).
     (c) built 2026-10-05 (the UX fix agent): `chip item-label` is the
     `--chip-bg` tint at `--radius-pill` with `border: 0`, its tones tints
     (accent, ok, warn); the Files tiles' "Read · N words" and a chat
     attachment's reading badge joined it; DESIGN.md's row says so and
     `tests/test_badge_recipe.py::test_a_status_label_is_a_tinted_pill_without_an_edge`
     holds it. `badges.js`: 53 labels, one signature (11.2px/500, 19px tall,
     8px padding, 999px radius, no border, a fill). (a), (b) and (d) are open.

554. **The owner, 2026-10-05, verbatim.** "the feminine atlas whisps should
     wrap the body a bit more instead of all of it sitting in front. also the
     lower body still looks too sharp like a tooth. the whole avatar needs to
     ahve dynamic and organic movement. think of it like an azur lane
     character" Placed: with 550, the Atlas agent.
     Partly done (2026-10-05): the wisps wrap behind the body and the hem is soft; the layered lifelike motion is the follow-up agent's, with 564.

556. **The owner, 2026-10-05, verbatim.** "and a bit more texture can be
     added to the lower body as well. make it celestial and majestic and
     magical and attractive and flowy" Placed: with 550, the Atlas agent.
     Partly done (2026-10-05): the gown's nebula, sheen and glowing hem; the flowing motion is with 564.

564. **The owner, 2026-10-05, verbatim.** "can you fix or redesign the male
     main body on the atlas avatar instead of just being an oval?? also fix
     how the arms connect to the atlas bodies and how they are used in
     transitions between places and positions, same with the lower body,
     animate everything to be smooth and boilogically lifelike." Placed:
     with 550, the Atlas agent (masculine torso, jointed arms from the
     shoulder line, joint-angle blends with follow-through, lifelike idle).
     Then (verbatim): "the arms for both the male and female atlas".
     Partly done (2026-10-05): his V-taper torso and both looks' hanging arms (upper arm 13.4 degrees off vertical, elbow 166 and 165, wrist 0.54 and 0.52 of shoulder width). Open: joint-angle blends and IK in avatars.js, counter-phase swing, head lag, his cloak, the travelling hair and tail motion. The follow-up Atlas agent.

575. **The owner, 2026-10-05, verbatim.** "can you have the lower body of
     both atlas avatars change around in position and and how it is sitting
     ect with different variations and changes based off the current action
     or behaviour??" Placed: the Atlas motion agent, with 564 (a lower-body
     pose per state, small random variants, blended with follow-through).
     Then (verbatim): "dont forget that both atlas avatars have a tail as
     well, same with the hair, and the nebular stream. they all need to be
     dynamically animated and changed": both looks' tails, hair and nebula
     streams, per state, with secondary motion.

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

579. **The owner, 2026-10-05, verbatim.** "switching the graph layout does
     nothing" (the gear's Layout: Force, Tree, Radial, Arc). Placed: the
     graph and sidebar agent, first.

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

561. **The owner, 2026-10-05, verbatim.** "I dont like this section in th
     timeline, it needs redesigning, restructuring, moving ro smth"
     (screenshot: the "Sep to Oct 2026" month button over a row of seven
     boxed day cells, Tue 29 to Mon 5, each its own bordered tile).
     Placed: the design agent, whose 543 rework of this strip is not merged
     yet; it is told this is still not right.
     Merged 2026-10-05 (543): the month sits between its arrows and the days
     are one well to the dock's edge, one Tab stop, arrows walk them
     (daystrip.js 44/44). Waits on the owner's look before closing.

## Placed (last 20, newest first)

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

