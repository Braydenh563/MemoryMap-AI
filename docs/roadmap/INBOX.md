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


694. **The owner, 2026-10-06, verbatim**, with four screenshots (the chat
     dock's "Ask | Agent" pill and a Settings "Pace: Auto | Manual" pill,
     each with the chosen segment's bottom edge cut off; the chat dock in a
     narrow sidebar with Skills, Web, Plan, the model picker and Ask|Agent
     wrapping onto four ragged rows; the corner companion drawn over the
     Attach dialog's head and tabs): "the bottom of these pills gets cut
     off. aslo the bottom chat dock isnt responsive in design for the
     sidebar sizes. also the companion covers the attach popup". The cut
     pills went to 685's sweep and are fixed (the segments take the track's
     inside); the dock's narrow layout and the
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


725. **The owner, 2026-10-06, verbatim**: "can you like maximise the application
     responses and sentence concatenation and responses?? I want it soooo good it is
     almost like a chat bot. make them something the world hasnt seen before like
     stringing sentences together based off meaning, similarity etc. idk im just
     throing stuff out there. I want the app to be really impressive". The
     no-model composer (`ai/composer.py`, INBOX 688). Placed: Opus agent, as a
     CHAT_PLAN phase row.

727. **The owner, 2026-10-06, verbatim**: "there's no searching animation or
     indicator for when I enter a search in the ask tab and nothing has shown yet".

728. **The owner, 2026-10-06, verbatim**, with Ask's matching records (the green
     similarity mark shows "68% similar" on some cards and the mark alone on
     others): "how come only some of the ask tab matching records notes green
     arrows have % number similarity and others dont show a number??"

729. **The owner, 2026-10-06, verbatim**, with a no-AI answer to "What have I saved
     about hobbies?" (quotes joined by "Separately", "Later", "Elsewhere, The
     picture in…"; titles cut mid-word; a capital after a comma): "its alright but
     it could definitely be better and be more complex and natural and easier for
     the user to understand." Goes with CHAT_PLAN Phase 5 and decisions 23-29.
     Again, verbatim: "it just uses one word sentence joints and has no life or
     complexity to it, and it needs improving and making better." Concretely: the
     joins are single adverbs ("Separately,", "Later,", "Elsewhere,"); titles are
     cut mid-word; quotes repeat their own titles; a capital follows a comma; no
     summary sentence ties the notes together ("Your hobbies notes cover gaming,
     the gym and golf"). First items for the next composer session.

730. **The owner, 2026-10-06, verbatim**: "also would the composer be able to
     somewhat accurately put new notes into a category using meaning similarity,
     mathematical shenanigans, keyword, and more and like the embedding model as
     well?? the embedding model should still be accessible and usable without the
     ai right??" Answer: yes, filing without a model already runs (lexical
     filing, category centroids and nearest neighbours over the embedder, which
     needs no AI model); next is measuring its accuracy on a held-out set and
     letting the composer explain each filing in one line.

731. **The owner, 2026-10-06, verbatim**, with the Atlas guide answering "whiteboard
     templates" with "Something went wrong asking that, try again.": "the help guide
     failed??" Not reproduced: with no model the stream and the one-shot route both
     answer (200, the Templates topic), and a two-view turn renders. The owner had
     a model selected (gemma), so the failure is on the model path; needs the
     server log line from that moment (Settings, Logs).

734. **The owner, 2026-10-06, verbatim**: "would the composer be able to do the
     reminders magic add well??" For CHAT_PLAN Phase 5: the reminder parser
     (`ai/reminder_parser.py`) already reads dates and times without a model; the
     composer adds the reminder's wording and its reason from the note.

735. **The owner, 2026-10-06, verbatim**: "also since p5.js is vendored, can it be a
     document option in the text editor?? also when on a code document, I get auto
     fill for redular sentences, not code specific autofill" "I was on js document".
     Two items for DOCUMENTS_PLAN: a p5.js sketch document kind (code beside a
     sandboxed live canvas, the vendored p5 only, no network); and on a code
     document (.js here) the prose autocomplete must switch off and code-aware
     completion (words from the file, the language's keywords, bracket pairs) take
     its place.

736. **The owner, 2026-10-06, verbatim**, with a code document's Output panel (Run
     again, Stop, Clear, Close; one line of output under a tall empty pane): "I cant
     adjust the height of this output bottom panel". A drag handle on its top edge
     (the sidebar resize recipe, keyboard steps too, height kept per document);
     also seen: Stop stays enabled after "Finished."

737. **The owner, 2026-10-06, verbatim**: "can the debugging run for other languages
     as well?? also error messages, syntax errors, code suggestions and more". Then:
     "are there any more repos we can vendor??" Today: JS runs (sandboxed), syntax
     checks cover js, ts and css (`DOC_CHECK_TREE`), completion covers js, ts, py,
     css and html. Vendored: codemirror, d3, emmet, harper, p5, phosphor, wordlist.
     Candidates, all to be checked for licence (AGPL-compatible inbound) and size,
     lazy-loaded, offline: Pyodide (Python in the browser, large), mermaid.js
     (already decided, BACKLOG steps 8 to 13), KaTeX (maths), a Lua or Ruby WASM
     runner, a linter per language (eslint-linter-browserify, ruff-wasm). For
     DOCUMENTS_PLAN: errors pinned to their line, syntax errors for py and html,
     a run for Python first.

738. **The owner, 2026-10-06, verbatim**: "the graph always loads in really zoomed in
     before it rights sitself with thr fitted xoom". The first frame draws at the
     default zoom before the fit runs; fix: compute the fit from the first settled
     positions (or the saved layout) before the first paint, or hold the canvas
     hidden until the fit, with a fade in. Measure the first painted frame's scale.

739. **The owner, 2026-10-06, verbatim**: "also want auto naming of the whiteboards,
     mindmaps and documents like \"untitled #\" so the user isnt forced to name a
     new object". Create works with the name field empty: "Untitled board 3",
     "Untitled map 2", "Untitled document 4" (the next free number per kind), the
     name selected for typing over, renamed later from the title.

740. **The owner, 2026-10-06, verbatim**, with an OKR board from the new templates
     (frame titles "Objective one", hints "A goal worth the quarter") and a rotated
     sticky note: "I cant edit the text under the titles in these objects?I rotated
     an object int he whiteboard (a sticky note) and the arrows jsut off the middle
     of each edge didnt rotate with it". Two bugs: the template frames' hint line
     (INBOX 715's `hint` field) has no edit path, double-click should edit it like
     the title; the quick-connect arrows beside each edge stay axis-aligned on a
     rotated object, they must sit off its rotated edges.

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
