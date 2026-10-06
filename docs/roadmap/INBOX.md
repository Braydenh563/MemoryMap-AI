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

685. **The owner, 2026-10-06, verbatim**, with a screenshot of the
     Regenerate button's focus ring cut off along its left edge: "a lot of
     borders get cut off on an edge." Focus rings and borders clipped by an
     ancestor's `overflow`. Next: sweep every focusable control on every
     surface for a ring outside its nearest clipping ancestor, and fix by
     room (padding or an inset ring), never by hiding the ring. Placed: the
     0.4.1 mini release, a Sonnet agent.

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

694. **The owner, 2026-10-06, verbatim**, with four screenshots (the chat
     dock's "Ask | Agent" pill and a Settings "Pace: Auto | Manual" pill,
     each with the chosen segment's bottom edge cut off; the chat dock in a
     narrow sidebar with Skills, Web, Plan, the model picker and Ask|Agent
     wrapping onto four ragged rows; the corner companion drawn over the
     Attach dialog's head and tabs): "the bottom of these pills gets cut
     off. aslo the bottom chat dock isnt responsive in design for the
     sidebar sizes. also the companion covers the attach popup". The cut
     pills go to 685's clipping sweep; the dock's narrow layout and the
     companion's stacking (it must sit under every dialog, menu and
     popover) to a Sonnet agent.
     **Parts 2 and 3 built** (dock694-1006, `cf6af06`): the chat dock is a
     size container (`@container chat-dock`, 10-responsive.css), one-line
     composer to 27rem, two fixed strip lines under 47rem, icon-only toggles
     under 24rem; the companion's band is z 44 (under menus 45, panels 60,
     dialogs 1010) and the dock lifts to 46 while its own panel is open.
     `scratchpad/ui-sweeps/dock694.js`: dock at 320 to 1200, light, dark, touch,
     and seven popups with the companion placed over their heads. Part 1 (the
     cut pill bottoms) is still open; 694 is not resolved.

696. **The owner, 2026-10-06, verbatim.** "also I pressed install on the
     package bundles and the buttons disabled and it just stayed as the 2/3
     packages I had installed until it just suddenly updated, there was no
     progress indicator or anything. does verything show in the background
     tasks?? also the running background task stuff dont have progress bars
     or indicators, they are just flat rows". Next: a bundle install shows
     per-package progress in its row (queued, installing with a determinate
     or indeterminate bar, done), every long job appears in Background
     tasks, and a running task row carries a progress bar (determinate when
     the job reports steps) and its elapsed time. Placed: the 0.4.1 mini
     release, an Opus agent when a slot frees.

700. **The owner, 2026-10-06, verbatim.** "can you also add more embedding
     model options as alternatives in the models??" / "research the best
     ones available today". Research, 2026-10-06 (sources in the session
     report): small and CPU-friendly: all-MiniLM-L6-v2 (22M, fastest),
     BAAI/bge-small-en-v1.5 (today's default), nomic-embed-text v1.5 (137M,
     8k context), EmbeddingGemma 300M (2k context; Gemma terms, not
     Apache), Qwen3-Embedding-0.6B (Apache-2.0, about 70.7 MTEB-eng-v2,
     about 1.2 GB), BGE-M3 (568M, multilingual, MIT), multilingual-e5-small;
     through Ollama also mxbai-embed-large, snowflake-arctic-embed2,
     granite-embedding and qwen3-embedding 0.6b/4b/8b. Decision taken: a
     curated list in Models with size, languages, context, licence and a
     one-line "best for", the current default kept; changing the model
     re-embeds in the background (durable job, progress shown, search keeps
     working on the old vectors until the new set is complete); only
     licences that allow it are offered as one-press installs, others link
     to their terms. Placed: the next free agent slot.

705. **The owner, 2026-10-06, verbatim**, more for the next pass: the
     composer formatting toolbar still meets its border at the right ("still
     the offending formatting bar edges on the border"); a "go to bin" button
     on the "Moved to the bin." notice; the title bar's app icon and the
     header's logo clash ("these seem like the clash a bit... but idk");
     Atlas and the companions "get annoyed every time I tap them multiple
     times, can they alternate how they respond a little more??". Placed:
     the next session (usage).

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

