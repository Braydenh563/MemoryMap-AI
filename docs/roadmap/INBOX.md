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

739. **The owner, 2026-10-06, verbatim**: "also want auto naming of the whiteboards,
     mindmaps and documents like \"untitled #\" so the user isnt forced to name a
     new object". Create works with the name field empty: "Untitled board 3",
     "Untitled map 2", "Untitled document 4" (the next free number per kind), the
     name selected for typing over, renamed later from the title.

741. **The owner, 2026-10-06, verbatim**: "will the composer get better at writing,
     sentence structure, more variations and natural language, betetr to understand,
     more biological. more social, more engaging, better at responding and answering
     questions correctly". Not covered by the three composer agents running
     (model context, composer acts, composer everywhere). Recommendation, taken: a
     fourth Opus track, "composer voice", once one finishes: question understanding
     (indirect and casual phrasings, synonyms, a clarifying question when
     ambiguous), more question kinds answered (why, how, how many, comparisons,
     yes or no as "your notes say"), a first-line-answers check, a larger tested
     phrasebook of joins and openers, turn-aware follow-ons, length fit to the
     question, the app voice; facts stay quoted. Measured on the 725 eval grown
     to about 100 questions with variety and readability scores.
     Then, verbatim: "rn the ask chat messages just say, ur note starting with this
     says this. also ur not starting with this says this, furthermore, ur note
     starting with this says this." Cause: `ai/composer.py` PHRASES (`says`,
     `also_says`, `says_a_end`): every sentence is introduced by its note's
     opening words plus "says:". First fix in the voice track: name a note by
     its title or topic once, then speak the content directly ("You planned
     Lisbon for May; the hotel is booked") with the citation as a marker.

742. **The owner, 2026-10-07, verbatim**: "atlas doesnt seem to change emotions alot
     if at all?? maybe log that for next pr". Next PR: measure how often Atlas's
     mood changes in a session (the mood triggers in atlas-life.js and
     companion code) and widen what drives it (answers found, nothing found,
     reminders done, idle, time of day), each visible within a few seconds.

743. **The owner, 2026-10-07, verbatim**: "and I want more mouse interaction with the
     companion like rubbing its head. flipping it upside down?? doing things or
     event triggers that get it to change emotion ro behavior. \"ro\" is an or
     misspell. also the behaviour of the companion is not often reflected in the
     enlarged view. better popup messages and more varied. more life and natural
     biological behaviour and transitions and actions and movement etc."
     With 742 (moods rarely change), one next-PR track: pointer gestures (rub
     the head by moving back and forth over it, drag and flip upside down, hold,
     poke, toss), app events as mood triggers, the enlarged view mirroring the
     corner companion's live state, the composer's companion remarks
     (`composer_voice.py`, built, not yet on screen) as its bubbles, and
     springy, interruptible transitions between poses. "ro" for "or" is in the
     typo table (question_noise.py).
     Then, verbatim, with Atlas in the onboarding welcome card and an oval
     frame: "atlas goes out of the border". The figure's tail, swirl and orbit
     spill past the oval's ring: either clip the figure to the frame
     (`overflow: clip` with the frame's radius, as the mini avatar now is) or
     scale it to fit inside with a margin; same for every framed Atlas.
     Then, verbatim: "the show companion notification button was poorly shown
     but I didnt screenshot it in time". Not seen yet: reproduce the notice
     that offers to show the companion (first run, after hiding it, or a
     notification with a Show companion action), measure its button against
     the toast-with-action recipe in DESIGN.md, and fix what is off.

744. **The owner, 2026-10-07, verbatim**, with Chat answering "test notes" (no
     model): "whiteboard shows as a note and clicking it takes me to the notes page.
     also it didn mention other matching records i dont think". Sources listed 5
     (test, test board, test draft, a test-driven development note, a picture
     note); the answer quoted 2. Next PR: (a) check the search result's kind for
     "test board" (`raw_results` in routes_chat meta; the card takes
     `source.kind`, chat-agent.js near `Sources:`): a board must say board and
     open the board; (b) the composer names the sources it did not quote ("3
     more notes match by title: test, test board, test draft") rather than
     leaving them unsaid; (c) the "Only 1 of 4 sentences here is quoted" notice
     reads as an alarm on an ordinary answer: word it calmly or show it only
     when most of the answer is not quoted.

745. **The owner, 2026-10-07, verbatim**: "note dates arent in the corner like i
     asked, i thought that was fixed. also notes ask questions but there is no way
     to view the questions asked by notes if they have any from the notes
     themselves"; then, of the Questions list (11 open: "What daring deed hath
     led thee to this street?", "- \"If you were a spice, which one would you be
     and why?", "\" or \"What's the most adventurous thing...", "What's an
     astronaut's favorite drink?", "Why did the student eat his homework?"):
     "these are just random questions form my notes?? I didnt actually have any
     questions for myself, they are unrelated and mostly from test notes".
     Next PR:
     (a) Card dates: INBOX 719 put the time at the bottom right of the card's
     content; a card stretched taller than its content (grid rows) shows it
     mid-card. Pin it to the card's own bottom edge, measured on cards of
     unequal height in one row.
     (b) Open questions (`ai/facts.py` candidates, kind "question"): only the
     person's own open questions. Skip a question inside quotation marks, a
     list item or example ("Examples:", "like \"..."), a line starting with a
     quote fragment, a joke setup (answered on the next line), dialogue or
     script (Act, Scene), and pasted or AI-written guide text; strip markdown
     (`**`, `- `, `* `) from the question and from the note title shown. Re-run
     on the owner's 11: none of them should remain. Tombstone what is dropped,
     so a re-read does not bring them back.
     (c) A note's own questions on the note (a line under it, "2 open
     questions", opening them), and the Questions list grouped by note.
     (d) First run, verbatim: "should it have gone straight to the graph
     tour?? i clicked add some example notes". Add some example notes opened
     the Graph with its tour running ("Moving around, 1 of 3"). It should add
     the notes, stay put (or show them in Notes) and say so in a toast with
     "See them on the graph" and "Take the tour"; a tour starts only when
     asked for. Grep the example-notes action in onboarding.js and tour.js.
     Then, verbatim: "well it added them then I pressed the continue or
     whatever button and a wierd blank tour panel showed in the top left corner
     for a couple seconds then it righted itself and went to the graph tour".
     So the tour came from onboarding's continue, and its card drew empty at
     the top left (no target yet: the Graph tab and its lazy code still
     loading) before placing itself. The card must stay hidden until its
     target exists and is measured, then appear in place; and the continue
     should say where it goes.
     Then, verbatim, with the Library tour at "A card's menu, 3 of 5": "the
     hover menu button doesn show on the tour". The step highlights the card's
     ⋯, which only shows on hover, so the ring frames an empty square. A tour
     step that points at a hover-only control reveals it while the step is up
     (a class on the card, removed on the next step), and a sweep checks every
     tour step's target is visible and non-empty.

## Placed (last 20, newest first)

- 2026-10-10: 765 placed in HANDOVER, ROADMAP Direction, CHAT_PLAN decision 61 and DOCUMENTS_PLAN (docx).

- 2026-10-10: 764 placed as CHAT_PLAN decision 60 and the amendment to 32 and 58.

- 2026-10-10: 762 placed in UI_MODERNISATION "Placed from the owner's list, 2026-10-10" and with the mapnotes agent.

- 2026-10-10: 760 and 761 placed in UI_MODERNISATION "Placed from the owner's list, 2026-10-10" and with the carddate and mapnotes agents.


- 2026-10-10: 759 taken (the audio go) in WORLD_CLASS_PLAN "Audio in the notebook" and 28.5.


- 2026-10-10: 753 to 758 placed (HANDOVER Skills note; CHAT_PLAN decisions 58 and 59, F5, Brief 84; UI_MODERNISATION decision 23 and 13.R; WORLD_CLASS decision 63 and Brief 60).

- 2026-10-10: 752 placed in SESSION_BRIEFS Brief 34 (second part) and OPEN.md Atlas rows.

- 2026-10-10: 751 placed as SESSION_BRIEFS Brief 75.

- 2026-10-10: 750 placed in WORLD_CLASS_PLAN 28 and SESSION_BRIEFS Briefs 72 to 74.

- 2026-10-10: 748 placed in DOCUMENTS_PLAN 23, SESSION_BRIEFS Briefs 69 to
  71 and CHAT_PLAN decision 57; 749 placed in UI_MODERNISATION_PLAN "12z
  Learnability" and the existing programme sections.

- 2026-10-07: 740, 746, 747 (connector arrows on rotated shapes, template
  connectors that do not follow, Reset style) placed in WHITEBOARD_PLAN.md,
  "Placed from INBOX, 2026-10-07".

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
