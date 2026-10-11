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

804. **The owner, 2026-10-11, verbatim.** "there are more backups than my max
     set number of 3, this console line's border clashes with the line above,
     also these buttons and ui in the documents editor need to be fixed in
     their design and height and stlying etc." (screenshots: four backups
     under "Keep this many backups 3"; the Python console's `>>>` input with a
     focus border meeting the rule above; the document assistant's
     suggestion buttons over an "Ask about this code..." field and a send
     button of another height). Backups fixed in b928a7d9c (every start
     prunes to the number). Owner: grammar57 (the console line and the
     assistant's field, send and suggestions, in the button grammar).

805. **The owner, 2026-10-11, verbatim.** "it is unclear which backup is the
     latest, and also the backups need more file info and details I feel. all
     information and processes across the app need to be 100% transparent. so
     all things that use the ai or composer and all background processes need
     to be logged and shown in bg processes wtc, along with their individual
     logs and process lines to show thier process live and when they are
     finished as well. whena ny process is running it needs to be clear to the
     suer." Owner: the transparency agent (next Opus slot): one process
     ledger every AI, composer and background run writes to, live lines per
     run in the background processes panel, a running indicator in the
     shell, and the backup rows (latest marked, date in words, what made it,
     size, checked).

807. **The owner, 2026-10-11, verbatim.** "it isnt really clear exactly what
     these were for" (screenshot: Where your data went, rows such as
     "huggingface.co (2600:...:443) The internet, Optional downloads,
     connected 4 times"). Owner: the transparency agent: each destination
     says what it fetched or sent (the model or file name, the search
     words) and why, the address behind a disclosure.

808. **The owner, 2026-10-11, verbatim** (a log): Agent mode calls
     `ask_user` with one option three times ("ask_user needs at least 2
     different options"), calls `search_notes` with no query on "NOTEBOOK
     STATS", searches `'what is there about a gaming mouse?\\'` with the
     backslash kept, "can you search the web?" finds 0 notes via none, and
     "Grammar check off for this session: the grammar worker did not start".
     Owner: noagent (the agent's calls and the query clean-up); the grammar
     worker to grammar57.

810. **The owner, 2026-10-11, verbatim** (screenshots: the personas' quiet
     Edit and Delete text buttons; Keyboard shortcuts with a bordered tinted
     "Change" on every row; What it learned, three "Claim" cards with a large
     checkbox and a tall empty bottom, one of them a joke): "also on the
     personas, see the edit and delete buttons?? I want the same styling for
     other areas on the app and/or settings like with the change buttons on
     the keyboard shortcuts?? maybe?? is that a good design decision?? I want
     your opinion. I want controls and tools and stuff around the app to be
     cleaned up more. also in the what it learned, some of the things like me
     writing when my uni days are are correct, but with other test notes, like
     with the homework joke i had are incorrect. if it learns something it
     also needs to make sure that the context od the thing it thinks it is
     learning is correct, like that note is tagged as a joke yk?? the composer
     needs A LOT more contextual understanding and needs to actually do its job
     right. it needs to be the siri for the application, the user should be
     able to ask it general questions like for maths, timezones, statistics,
     what the app cna do, what the user can do on the app, things like history
     records, maybe if it web searches it can show a panel of the web results
     in a dropdown like with the thinking box?? maybe if it finds a web site it
     can render the extracted website in a dropdown or panel?? things like that
     are only the surface. the composer. like I asked if it could web search
     and then searched the web for the word "web" and then didnt even output
     the results. it needs soo much more work. also using the composer for
     other application functions in the background and suggestions and search
     history, prefilling responses or suggesting sentence or word completions
     with the greyed out text that they can tab to or use arrows to accept etc
     yk?? and also if the app collects insights or questions, then I thing the
     ai should be able to or go through and clean them up and audit them to
     make sure they are correct, maybe as a bg job, skill, runnable audit etc.
     things like that. expand on this to a full feature and improvement, Im
     just spurting out words but I know there is so much more I havent
     covered." Placed: CHAT_PLAN "Placed from INBOX, 2026-10-11 (the owner:
     Atlas as the app's assistant)", decisions 65 to 69; the row actions to
     grammar57 (DESIGN.md "Row actions").

812. **The owner, 2026-10-11, verbatim.** "also the composer in the ask tab
     and structuring of sentences and outputs needs to be cleaned up a lot. it
     still looks messy. and the response feels, plain, boring, lifeless, and
     doesnt give me anything more. I may as well just read the notes I made on
     the right. the composer needs to be better but I dont know how and you
     keep saying youve improved it but i still cant see much. I feel like Im
     going in a loop 😞 also the first time I use the ask subtab search after
     loading up the app, the badges next to the sub headers on each column are
     visibly empty" (screenshots: Ask, "What have I saved about courses &
     study?": quoted fragments with a bar, a superscript and "[your note, 27
     July]" each, then "Grounded in" chips and "4 of 4 from your notes" that
     repeat the right column; the corner Atlas drawn over "You asked"; empty
     badges beside "Atlas" and "Matching records" while loading). Read: the
     answer quotes, it does not answer; three citation marks per line; the
     sources shown three times. Placed: CHAT_PLAN decision 70 (the answer is
     judged against written gold answers, not rule counts), first in the
     assistant brief; the empty badges and Atlas over the answer to ownerfix.

903. **The owner, 2026-10-11, verbatim.** "alright lets rename and
     retrademark to Tessellate update absolutely everything including all
     the documentation and the pages site. make sure to still note the
     former name though." Placed: the rebrand agent (agent/rebrand-1011):
     step 1 the brand (`scripts/rebrand.py`, re-run after every merge;
     `tests/test_brand_name.py`), step 2 the internal identifiers with
     fallbacks for existing installs, as its own last commit.

## Placed (last 20, newest first)

- 2026-10-11: 899 ("dont notes also already work out timewords and time references?? can the composer and agents ... pull from those") sent to atlas; 900 ("click on the lan icon in the bototm bar and easily be able to toggle it on or off ... without having to restert") folded into 896; 901 (show more and less awkward on wide paragraphs, two screenshots) sent to tags89; 902 (companion physics, entries, organic movement, no jolts, Atlas behaviours, the expanded panel's hanging arms, the arm that rises on a click) sent to throw.
- 2026-10-11: 898 ("make sure that the undo and redo are properly and completely universal") sent to undoall: every mutating request offers undo and redo through `pushUndo`, or sits on a shrinking exempt list. **Fixed d68f621c6, 466d4721a, 353d975b5.** The exempt list has no GAP left (89 to 0, the rest classed with a reason); a ratchet fails any step without a Redo; 21 live acts in Chromium (`scratchpad/ui-sweeps/undoall.js`) each undo and redo twice, which found and fixed Ctrl+Z walking a covered board's history and a several-shape step undoing twice.
- 2026-10-11: 897 ("the size of things should be proportional and individual to the device") sent to devsize: zoom, font size, density and the companion's size and spots stay on the device.
- 2026-10-11: 895 ("The composer needs to be a legitimately smart chatbot ... do anything and everythinf and do it very accurately and well") placed with atlas (the owner's semester example as a gold answer: relative time resolved against the note's date, facts woven into prose) and the composer agent after it (Briefs 104 and 97).
- 2026-10-11: 892 ("Could we do connection to phone via Bluetooth and or hotspot??") and 894 ("make sure a phone connecting is logged as an outgoing connection") placed with 896 (the lanbar agent).
- 2026-10-11: 893 ("Shouldn’t the notice be "you can only download files on your computer" or "action denied on this device"??") fixed: the refusal reads "Not available on this device. Do it on the computer Tessellate runs on." (downloads are not refused; an export saves on the device that asked).
- 2026-10-11: 871 ("the help search bar should be below the welcome tour section at the top of the help dropdowns") sent to chattime; 872 ("I restarted the app with the button and it didnt restart??", "or it took like 3 minutes?") fixed by the orchestrator (wt-restart, `--restart-after`); 873 ("there is still no smooth transition loading up the app nd viewing the graph") sent to graph100; 874 ("should the x and tick buttons on notifications be at the bototom of the notification?? I thought they were in the middle or top right??") queued for the next Sonnet; 875 ("can this be better styled and easier to read??", the receipt's address list) sent to lansafe; 876 ("can you add more deterministic welcome messages?? mroe variety and ones for each time of the day?? maybe the composer can spin something up based on usage patterns, note content, and more??") fixed by the orchestrator (`ai/greeting_compose.py`: seven slots, weekday lines, notebook facts); 877 ("if I load it up on my phone, it doesnt install all the libraries again does it??") answered and written into the phone help; 878 ("it came up with a security not trusted screen on my phone using safari ... its taking a very long time", "it still hasnt loaded") fixed: silent preconnects held the eight peek threads; 879 ("the companion still covers some parts of the ui and doesnt move out of the way", over Notes' more menu) fixed: open `<details>` menus joined its popup list; 880 ("what if multiple people are running memory map and want to connect over the same lan connection??") answered, and a second notebook on one computer now takes the next LAN port; 881 ("what if I make a change on my phone?? does it live update?? what if there are update  clashes??") answered (clashes are refused with Keep mine or theirs), live refresh of an open screen placed in BACKLOG; 882 ("I try throwing the companion across the screen and it just goes back to the same side, the companion physics just isnt there and needs to be upgraded and fixed.") queued for the next Opus slot; 883 to 885 (graph node popup buttons wrap onto three rows on a phone; "i have no clue what the buttons do as I cant hover over them"; "clicking the graph settings button on my phone auto opens the graph layout dropdown menu") with 874 sent to the phonegraph agent (Sonnet); 886 ("the bottom of the settings page gets cut off??", "on my phone", "I cant scroll or close the settings page, I think the top is cut off as well") fixed by the orchestrator (dialogs capped by dvh, the overlay scrolls, safe centring; not seen on a real iPhone); 887 to 889 (the chat input under the keyboard and the no-model notice; a pinch on the whiteboard moved a note; the OCR workspace and the Files extracted text scrolling sideways) sent to the phone2 agent (Sonnet); 890 (the owner's support bundle: "[browser/csp] blocked style-src-elem: inline (user-script)", "[browser/error] Script error.") fixed: Safari's injected scripts and extensions are not logged as the app's; 891 ("I pressed open file location for the support bundle on my phone and it opened up file explorer on my computer ... I need maximum trust, proper safe connection, proper security for the lan and open connection") fixed: `api/this_computer.py` refuses 17 computer-acting routes to any other device; the phone UI hiding them and the full audit go to lansafe and the security scan.
- 2026-10-11: 867 (iPhone; LAN on a public network, automatic with overrides) placed as SESSION_BRIEFS Brief 102 (lansafe running); 868 (a time on every chat message and session) as Brief 103 (chattime running); 869 (typos read in context, not as slang) as Brief 104; 870 (composer answers with real openings, joining clauses and a close that adds something) into the atlas agent's running brief (CHAT_PLAN decision 70). Verbatims in SESSION_BRIEFS.
- 2026-10-11: the reqaudit pass (153 asks, 41 unplaced found-not-fixed rows) placed as SESSION_BRIEFS Brief 101; 845 ("can you redesign or change the design of this \"clear this list\" button??") and 846 ("there's an excessive gap on the right for the x close buttons on the nav history, can you integrate them together??") with ownerfix2; 848 ("on these screenshots from the search suggestions agent, these button text clashes") and 849 ("should search suggestion dropdown panels be the width of the search bar with the minimum being what the panel default is??", yes) with search86.

- 2026-10-11: 862 (a full functionality and experience scan) placed as SESSION_BRIEFS Brief 99; 864 and 865 (the graph appearing and updating smoothly, eased hover, a better node, the glow kept) with 802 as Brief 100; 863 (Peek slightly too see-through) fixed in the typos90 merge commit (the body 22% to 32%, the ground 8% to 14%).

- 2026-10-11: 847 (notification actions beside the X), 851 (Select checkboxes above the text), 852 (Library subtab flicker), 853 (OCR search highlight), 854 (Filing style head), 856 (hover ground radius) placed as SESSION_BRIEFS Brief 93; 850 and 857 (autocorrect everywhere, find by meaning) as Brief 94; 858 (themes) as Brief 95; 859 (the recording row) as Brief 96; 860 (the composer and the chart maker) as Brief 97; 848 and 849 (Recent changes buttons, suggestion width) sent to the search86 agent; 855 (Welcome and tours wall) was built by grammar57 (Help tour rows); 861 (goals and lists, recognised anywhere) as Brief 98.

- 2026-10-11: 838 to 842 (constellation on a theme change, the quick sketch panel and graph jitter, Agent with no model, the chat dock's round settings button, the timeline's year row) placed as SESSION_BRIEFS Brief 91; 843 (the whole-app pass, first run and the tour, element libraries, themes) as Brief 92.

- 2026-10-11: 836 (Add tags with suggestions on lightly tagged notes; Don't suggest tags) and 837 (the owner's typos as composer fixtures, standing) placed as SESSION_BRIEFS Briefs 89 and 90.

- 2026-10-11: 835 (props hard to see on Atlas, varied throws, natural motion, more variants) placed as SESSION_BRIEFS Brief 88.

- 2026-10-11: 832 (search suggestions, clearing history, undo in Settings), 833 (voice, dictation, vendoring, small features) and 834 (the splash) placed as SESSION_BRIEFS Briefs 86, 87 and 85.

- 2026-10-11: 830 (Tidy's layout, undoing a confirmed pattern, gaps at a menu's ends) placed in UI_MODERNISATION_PLAN "Placed from INBOX, 2026-10-11 (Tidy, undoing a pattern, menu gaps)". 831 (the image picker's check sat on the picture's corner) fixed 2026-10-11 in 04-chat-dock-appearance.css.

- 2026-10-11: 828 (voice notes in the background, input devices, noise, live transcription and captions) and 829's focus timer placed in UI_MODERNISATION_PLAN "Placed from INBOX, 2026-10-11 (voice notes, live captions, the focus timer; voiceup)"; 829's board and map previews in WHITEBOARD_PLAN "Placed from INBOX, 2026-10-11 (board and map previews)"; 829's toast buttons sent to grammar57 with 811.

- 2026-10-11: 827 (the extracted text on a file row, the Recordings empty state, a link's details, folders, icons and highlights for links) placed in DOCUMENTS_PLAN "Placed from INBOX, 2026-10-11 (Files, Recordings and Links; libraryup)", owner libraryup.

- 2026-10-11: 826 (the edge arrows missing on a note card, more ends and a Tessellate end, guides while drawing, the board, map and editor feature gap) placed in WHITEBOARD_PLAN "Placed from INBOX, 2026-10-11 (ends, edge arrows, guides while drawing; canvasdepth3)", owner canvasdepth3.

- 2026-10-11: 809, 811 and 813 (the tours wall, the notifications panel's buttons, one bar control grammar) placed in UI_MODERNISATION_PLAN "Placed from INBOX, 2026-10-11 (bars, notifications and tours; grammar57)", owner grammar57.

- 2026-10-11: 814 and 816 (a mind map topic's look shows only after deselecting; the topic's + and link buttons too big) placed in MINDMAP_PLAN "Placed from INBOX, 2026-10-11 (the topic's tools)", owner the mapfix agent; 815 (preview and adjust every export in a panel) placed in WHITEBOARD_PLAN "Placed from INBOX, 2026-10-11 (one export panel for the whole app)", owner the exports agent.

- 2026-10-11: 801 (Agent mode and the composer with no model) placed in CHAT_PLAN; 802 (drag the force graph like main) in GRAPH_PLAN; 803 (buttons, OCR, the constellation, the capture gutter) in UI_MODERNISATION_PLAN, each "Placed from INBOX, 2026-10-11".

- 2026-10-11: 800 (the owner: "another devibecoding, ui/ux modernisation and professionalisation sweep across all ui faces") placed in UI_MODERNISATION_PLAN "Placed from INBOX, 2026-10-11 (the owner's sweep request)": the uisweep agent, then Briefs 57 to 59.

- 2026-10-10: 798 and 799 placed in GRAPH_PLAN "Placed from INBOX, 2026-10-10 (the owner on the graph, again)".

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
