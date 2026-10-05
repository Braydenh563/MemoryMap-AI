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

640. **The owner, 2026-10-05, verbatim.** "Also like the smooth slide across
     tabs." Placed: the motion agent (a sliding active indicator for tabs,
     sub-tabs, segmented controls and the Settings sidebar, under the
     Interface animations toggle).

641. **The owner, 2026-10-05, verbatim.** "can we take anything more from
     applications like coggle.it, adobe illustrator, adobe photoshop, and miro
     for the whiteboard and mind map?? I'm still not happy on the mindmap with
     how the core nodes work and can be customised as well as with the icons
     in them." Placed: an Opus research and design pass. It compares those
     four apps against the board and the map, then redesigns the map's core
     nodes and node icons, and writes the result into MINDMAP_PLAN and
     WHITEBOARD_PLAN with decisions, before anything is built.

642. **The owner, 2026-10-05, verbatim.** "I want an emoji and icon widget
     library which can be dragged and placed in the whiteboard and mindmap and
     which are also available in text editors and formatting toolbars."
     Placed: with 641. One picker (emoji plus the vendored Phosphor set, both
     local), draggable onto boards and maps and insertable from the editors'
     formatting toolbars.

643. **The owner, 2026-10-05, verbatim.** "Can we take anything from
     Microsoft onenote??" Placed: with 641, as a research pass over notes,
     pages, sections, ink and tags, compared with what MemoryMap has.

644. **The owner, 2026-10-05, verbatim.** "Can you also redesign and expand
     and improve the meeting notes feature?? I feel like it is neglected and a
     bit left behind and tucked away." With it: "Hold the release until these
     things are done. Just make sure all the open items are completed as well,
     that there are no bugs, and that everything is polished." Placed: the
     Opus research and design pass with 641 to 643, then a build agent.
     Decision taken: release 0.4.0 waits for 640 to 644 and every buildable
     non-backlog open item.

645. **The owner, 2026-10-05, verbatim.** "Once everything is done, update the
     pr title and description, update the screenshots on the readme, can your
     redesign and remake the GitHub pages landing site?? Make it professional
     and in the image of MemoryMap AI. Make it detailed, and include key
     links, it for some reason struggles to load the documents from the repo
     so I think we should remove them and just have a solid landing site
     which doesn't really have a problem with having to be kept up to date
     yk?? Then once that is finished. Ensure all the documentation is
     correct, make sure the release is ready for v0.4.0 and then lemme know
     when it's ready to merge, before that do a final scan for bugs, security
     flaws, codeql and ci issues you may have missed." Placed: the release
     close-out, in this order once 640 to 644 and the buildable items land:
     fresh README screenshots (`docs/screenshots/`), an Opus agent rebuilding
     `docs/index.html` as a static landing page (no fetch of repo docs, links
     out to GitHub instead), a documentation correctness pass, version 0.4.0
     and its CHANGELOG section, a final bug, security, CodeQL and CI scan,
     then the PR title and description, then the owner is told it is ready.

646. **The owner, 2026-10-05, verbatim.** "Can you also make sure the code
     editor and and grammar checker etc are really good and used across the
     app and also cover a large range of code languages?? I want the code
     editor to be on par with and even surpass vs code. With also styling and
     formatting options, small things the user takes for granted and expects
     to be there but aren't, code suggested prefills, shortcuts, key binds,
     options for specific code elements like for example what css options are
     available for a specific css feature, python, java, js, c#, c, c++,
     Visual Basic, p5.js, and more" Placed: DOCUMENTS_PLAN section 21, an
     Opus audit-then-build agent after the 641 to 644 design pass. Release
     0.4.0 waits for it.

648. **The owner, 2026-10-05, verbatim.** "Make sure you finish everything that
     is left except for the large backlog, work toast and token efficiently.
     Polish all the small things that make the app feel more professional and
     reliable. For ma the largest things that make me not want to use an app
     are ui issues, loss of work to data with no way to retrieve or undo it,
     poor usability and learnability, and features that don't work how they
     should. The small things pile up and then I don't want to put my time and
     effort into actually using the application. I don't want this to happen.
     I want to be able to use it without worry like a professional
     application, I want a satisfying experience and the same for my friends
     who I try to get to use the program. Make sure it is the best thing to
     ever grace the planet even if no ai model is available. And I was
     wondering if we should rename the write with atlas/ai subtab to the
     writing room or smth??" Placed: the end-to-end agent's brief now covers,
     per flow, no unrecoverable loss (undo, trash or confirm; unsaved edits
     survive a tab switch, reload and restart), every flow with no model
     configured, and learnability (labels, tooltips, empty states). Decision
     taken on the rename: the sub-tab is "Writing room" (built this commit;
     the panel id was already `writing-room`, the Guide still answers to
     "write with atlas").

649. **The owner, 2026-10-05, verbatim.** "Also in all the chat areas for the
     "thinking..." text, I think it should change based on the state like for
     if it is waiting for the first token, thinking, or writing etc. maybe the
     wording can be more atlas themed or smth but just to help with
     information architecture" Decision taken: one phase vocabulary for every
     chat surface through `progressLine().setPhase`: waiting for the first
     token "Reaching Atlas…", loading a model "Waking the model…", retrieval
     "Reading your notes…", reasoning "Atlas is thinking…", streaming "Atlas is
     writing…", a tool "Atlas is <verb>…"; a persona's name replaces Atlas.
     Placed: Sonnet agent.

650. **The owner, 2026-10-05, verbatim.** "Can you also update the small
     miniature atlas male and female avatar icons that go in the corner of
     chat bubbles?? They aren't up to date and they look like aliens" Placed:
     the next Opus slot (`assistantAvatar` in chat-agent.js draws
     `atlasDraw(size)` under 28px, not the current `atlasAvatar` look).

651. **The owner, 2026-10-05, verbatim.** "Also like subtle line highlighting
     in the document editor when the line numbers are showing??" Placed:
     Sonnet agent, with 652 (DOCUMENTS_PLAN 21).

652. **The owner, 2026-10-05, verbatim.** "Whole line copying or cutting when
     selected on the end of a line etc, quality of life stuff" Decision
     taken: VS Code's rule, copy or cut with an empty selection takes the
     whole line. Placed: Sonnet agent, with 651.

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

