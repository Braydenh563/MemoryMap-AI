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
     Owner: TIMELINE_PLAN, UI_MODERNISATION_PLAN 12 (the day strip becomes the week row); built in 543 and waiting on the owner's look, so it stays here until then.

725. **The owner, 2026-10-06, verbatim**: "can you like maximise the application
     responses and sentence concatenation and responses?? I want it soooo good it is
     almost like a chat bot. make them something the world hasnt seen before like
     stringing sentences together based off meaning, similarity etc. idk im just
     throing stuff out there. I want the app to be really impressive". The
     no-model composer (`ai/composer.py`, INBOX 688). Placed: Opus agent, as a
     CHAT_PLAN phase row.
     Owner: CHAT_PLAN Phase 5 and Phase 6, Brief 39 and Briefs 65 to 68 (the engine agent runs on 39); built so far in composer725-1006.md and composer-voice-1006.md (first line answers 25 of 25, joining phrases 27 to 44).

730. **The owner, 2026-10-06, verbatim**: "also would the composer be able to
     somewhat accurately put new notes into a category using meaning similarity,
     mathematical shenanigans, keyword, and more and like the embedding model as
     well?? the embedding model should still be accessible and usable without the
     ai right??" Answer: yes, filing without a model already runs (lexical
     filing, category centroids and nearest neighbours over the embedder, which
     needs no AI model); next is measuring its accuracy on a held-out set and
     letting the composer explain each filing in one line.
     Owner: Brief 39b (filing and the taxonomy), WORLD_CLASS_PLAN 23; the held-out accuracy measure and the one-line explanation of each filing are its rows.

735. **The owner, 2026-10-06, verbatim**: "also since p5.js is vendored, can it be a
     document option in the text editor?? also when on a code document, I get auto
     fill for redular sentences, not code specific autofill" "I was on js document".
     Two items for DOCUMENTS_PLAN: a p5.js sketch document kind (code beside a
     sandboxed live canvas, the vendored p5 only, no network); and on a code
     document (.js here) the prose autocomplete must switch off and code-aware
     completion (words from the file, the language's keywords, bracket pairs) take
     its place.
     Owner: DOCUMENTS_PLAN 23 and Brief 42 (the p5 kind, code completion on code documents); Briefs 69 to 71 for the IDE.

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
     Owner: DOCUMENTS_PLAN 23 decisions D1 to D9, Briefs 69 to 71; the vendoring candidates are Brief 75.

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
     Owner: composer-voice-1006.md (merged: no "your note starting with ... says", casual phrasings, typos, 847 slang entries, voices) and CHAT_PLAN Phase 6, Brief 39 (the realiser). Open: speak the content directly with the citation as a marker (measured today: Ask now answers "Also, the hobbies I want to try: ..." with no "says"); the remaining eval numbers are in that file.

742. **The owner, 2026-10-07, verbatim**: "atlas doesnt seem to change emotions alot
     if at all?? maybe log that for next pr". Next PR: measure how often Atlas's
     mood changes in a session (the mood triggers in atlas-life.js and
     companion code) and widen what drives it (answers found, nothing found,
     reminders done, idle, time of day), each visible within a few seconds.
     Owner: Brief 34 (companion), the second part; the mood-change count per session is its first number.

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
     Owner: Brief 34 (companion), second part, and OPEN.md Atlas rows (INBOX 752): gestures, the enlarged view mirroring the corner, the framed Atlas clipped to its oval, the Show companion notice measured against the toast recipe.

771. **The owner, 2026-10-10, 16:02Z, verbatim.** "I am sleeping so continue
     autonomously. Impress me a lot. I want to fall off my chair lol with how
     good the changes, fixes, improvements, additions, and nire are when I
     wake up in the morning lol." Read: no cap on the night's work beyond the
     agent cap (four Opus, Sonnet extra); every open brief in SESSION_BRIEFS
     order; the PR stays green and the docs current at each merge. Owner:
     HANDOVER "Now" (the night's queue).

772. **Decision needed, found by the companion agent (Brief 34), 2026-10-10.**
     Under the system's reduce-motion hint Atlas keeps its calm CSS loops (an
     earlier decision, `08-consistency.css:5056`): 1,579 style recalcs a
     minute. Decision 7 says reduced motion keeps poses without loops.
     Recommendation, taken: decision 7 wins; the system hint and the app's
     own Reduce setting both stop every loop and keep the pose. Owner: Brief
     34 continues (companion2).

775. **Bug, the owner 2026-10-10 21:52Z, two screenshots (desktop, 34 notes).**
     "I went onto the graph and this is what it looked like?? it didnt zoom
     in or fit to my screen?? I pressed the fit button and it didnt do much".
     First open: the cluster fills about a fifth of the canvas; after Fit,
     about half, and the bubbles overlap one another heavily.
     Then, with a third screenshot: "I prefered the force and movement how
     the graph used to be, theres no movement to it now :(" and "when the
     graph readjusts it just appears there :(". The cluster's bubbles still
     overlap; outliers sit far out on long links.
784. **UI, the owner 2026-10-10 22:30Z, five screenshots.** "when hovering
     over categories in the sidebar on notes, the meatball buttons dont have
     curved edges. also in some places it is the hover highlight over icons,
     with no change in the border or background colour, and then there's
     still ones with the highlighted bg. also some highlight borders still get
     cut off. the copy and meatball button preview on the table in the /
     command menu are poorly visualised. and this is my gary the moss monster
     note and sketch, but it shows up wierdly on the [[ note menu,". Shots:
     the sidebar category row's square ⋮; the notes list row's focus ring cut
     at its top and bottom; the / menu's Table preview (Copy and ⋯ in a grey
     blob over the caption); the Gary note (title, sketch, links); the [[
     picker listing it as "Gary The Moss Monster :D Gary The Moss M..." and
     the preview repeating the title four times with no sketch.
785. **UI, the owner 2026-10-10 22:33Z, screenshot.** "Also I think the
     buttons in the headers in the questions subtab need to be redesigned"
     (Notes, Questions: each source note's header is a full bordered button
     with a note icon; the first is inside a highlighted band. Also seen: a
     question cut at a quote, ""If you were a spice, ..." then "" or "What's
     the most adventurous thing ...".)
786. **UI, the owner 2026-10-10 22:40Z, screenshot.** "no spacing between the
     button and this text in the dashboard hero section" (the hero line "You
     have 34 notes · Patterns: university, 4 times since 16 July" with its ⋯
     button touching the last word; the menu holds Confirm and Not right.)
787. **Composer, the owner 2026-10-10 22:50Z, three screenshots.** "the atlas
     guide repeted twice?? and it ist customised with the composer yet
     either. I feel like if the user is set to view the deterministic
     response, they should have the option to see either the base help text
     or a slightly more customised version with the composer. also the
     composer's responses still need A LOT of work and refinement." Then:
     "yeah the composer is still pretty barebone, has no life to it and I may
     as well just ignore it and use the matching records" and "make the
     composer better please :)". Shots: the Guide answering "hey" with the
     Dashboard topic, its paragraph shown twice (once bare, once under "The
     dashboard / Where:"), then "From the app's own help text, word for word:
     no model is running."; Chat "ideas for projects": "Some ideas for
     features you had: The picture in your note from 31 August shows The
     image contains a text excerpt discussing ..." with "Only 0 of 2
     sentences here are quoted word for word"; Chat "games notes": two
     quoted sentences rewritten into "you" with "[your note, 17 July]" and
     "Across your other entries:".

## Placed (last 20, newest first)

- 2026-10-10: 797 (whiteboard and mind map feature depth) placed in WHITEBOARD_PLAN and MINDMAP_PLAN "Placed from INBOX, 2026-10-10 (the owner on feature depth)", the next Opus brief.

- 2026-10-10: 788 to 796 (the owner's afternoon reports) placed in UI_MODERNISATION_PLAN "Placed from INBOX, 2026-10-10 (the owner's afternoon reports)" and DOCUMENTS_PLAN "Placed from INBOX, 2026-10-10 (code as documents)".

- 2026-10-10: 776, 777, 779, 780, 782, 783 placed in UI_MODERNISATION_PLAN "Placed from INBOX, 2026-10-10 (the owner's morning UI reports)", owner the uipolish agent.

- 2026-10-10: 781 placed in WORLD_CLASS_PLAN "Placed from INBOX, 2026-10-10 (filing suggestions)", an Opus brief after the running ones.

- 2026-10-10: 767 placed in UI_MODERNISATION "Placed from the owner's list, 2026-10-10" and with the notice agent.

- 2026-10-10: 766 placed as CHAT_PLAN decision 62, amending 61.

- 2026-10-10: 729, 731, 734, 744 placed in CHAT_PLAN "Placed from INBOX, 2026-10-10 (the coverage pass over 729 to 744)" and Briefs 37, 39, 67, 84; 561, 725, 728, 730, 735 to 737, 741 to 743, 745 hold their Owner lines here; 694, 727, 739 fixed.

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
