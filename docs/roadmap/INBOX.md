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

447. **The owner, 2026-10-03, verbatim, with screenshots (the graph popup
     showing `**Current Commitments**` and `![Gary...](/media/...)` raw; a
     note card's meta line run together: "Courses & Study 73% Add tags Tag
     with Atlas Atlas is reading...").** "the popup in the graph still doesnt
     render images or sketches" / "md isnt rendered either?? i dont think the
     md is rendered at all in the graph popups" / "the companion doesnt
     change action for related actions when things are hallening like for
     the tag and file with atlas note function running with atlas reading
     the note" / "there's no spacing between note metadata and it still
     needfs to be improved ui/ux wise" / "There also needs to be a way to
     more easily manage tags in, between, and across indivisual and multiple
     notes. like a tag manager. also when clicking on the categories in note
     metadata, there should also be the option to view that category as
     well, not just manage it." Placed: (1) the graph popup renders markdown
     and pictures: the orchestrator, reproduced first; (2) companion reacts to
     AI work: sent to the companion agent; (3) the note meta line redesigned
     (groups, spacing, hierarchy): the orchestrator; (4) a tag manager
     (rename, merge, delete, bulk add or remove across selected notes) and
     (5) "Show this category" on the category chip's menu: an agent.

446. **The owner, 2026-10-03, verbatim.** "make sure the other agents like
     the popup and chat are aware of time relativity as well" / "maybe for
     the suggested models as well there can be a way to enter custom model
     names for downloading as well??" / "continue regular bug scans to make
     sure you havent missed anything and make sure all the main features
     actually work. make the note filing and how the user can make notes the
     fastest, most reliable and easiest thing to use the user has ever seen.
     the user needs to choose to use this app. the app needs to be worthy."
     / "Im wondering if we should tighten and shrink some of the ui down a
     little as I still think it takes up excessive space and something about
     the whole ui design still feels very demo, vibe coded and not like an
     official app...". Placed: (1) time relativity: Ask, the chat agent's
     notes, its note tools and the digest all carry each time word's date and
     its distance from today: **fixed** (`days_from_today`, config.py);
     (2) custom model names: sent to the Settings agent (INBOX 444); (3) a
     feature smoke sweep (every main flow driven end to end) run at each
     merge: the orchestrator; (4) note making and filing: continues INBOX
     434; (5) a density pass (type scale, control heights, paddings, gaps
     measured app-wide against native apps, then tightened through the
     tokens) plus a de-vibe audit: **built** 2026-10-03, measured with
     `scratchpad/ui-sweeps/density.js` (controls 36 to 32px, top bar 56 to
     48px, body text at --text-lg, Notes chrome 203 to 178px and five cards
     above the fold at 1440x900, not four; DESIGN.md's token tables say the
     same); left open: the Library sub-tabs' 6.5rem min-width spacing, axe's
     nested-interactive on suggested-tag chips (an x inside a chip that is
     itself a button), and "Browse all in Library" wrapping in a 240px
     sidebar.
     Then, of the selected-text menu's "Save as a note": "it did do smth but
     i had to hard reset the app to see it and there was no indication of
     it or updating ro anythinf. there is no timestamps. note edit history
     doens allow me to go back on manual edits and I cant distinguish between
     personal or ai edits or mixed edits." and "make sure the other highlight
     text popup meatball menu items work properly with proper learnability
     and indicators as well". Placed: (6) Save as a note says "Saving…" at
     once, then where it went with Open, and refreshes the list: **fixed**;
     every other item in that menu swept for a visible answer
     (`selmenu-items.js`): the orchestrator; (7) note edit history: a version
     on every manual save too, each marked as yours, Atlas's or both, with
     its time, restorable: an agent.

445. **The owner, 2026-10-03, verbatim.** "I was also wondering if the
     bookmarks and contents library pages as well as maybe others like the
     ai skills page and stuff might be better designed, and expanded in
     utility, capability, features, ui/ux and more. same with the
     whiteboard and mindmap, are they up to scratch?? can the controls and
     tools and functions and features be better designed?? is anything from
     them missing or not working as they should. are there large excessive
     volumes of calculations slowing things down?? is all the ui and ux
     correct?? can there be more utility, accessibility, features and
     more?? everything needs to be refined and polished". Then: agents may
     be Opus or Sonnet, a few at a time, each committing per step; concise
     style, recorded in CLAUDE.md order 4. Placed: (1) Library Bookmarks,
     Contents and AI skills audited and redesigned: an agent; (2) whiteboard
     and mind map audited (controls, missing or broken features, render cost
     per frame), then fixed: an agent; both after the running agents land.

443. **The owner, 2026-10-03, verbatim, with screenshots (the graph; the
     Library's Boards and maps placeholders; the feminine Atlas's lower
     body).** "the graph shape could look nicer as well. also the skeleton
     loaders are really boarinf and have no loading animation to them, they
     are just blank shapes. also using tesseract and how it operates in the
     ocr workspace is still annoying to use and manage." Then: "can the
     feminine atlas lower body also be improved a little as well to not
     look so tentacle-y?? I still want that really nice look to it. make it
     really attractive and and alluring". Placed: (1) the graph's layout
     and look: a Sonnet agent; (2) skeletons: **fixed** (shaped bars, a
     visible sweep, a reduced-motion breathe); (3) Tesseract in the OCR
     workspace: a Sonnet agent; (4) the feminine Atlas's lower body, flowing
     like a gown's hem rather than tentacles, kept elegant: the orchestrator,
     after the masculine tail's agent work is merged.
     Then: "also if the companion is doing a specific action and i double
     click it to view it in the enlarged window, I want it to keep doing
     that action unless poked or something else happens". Placed: (5) the
     enlarged view carries the companion's current action over and keeps
     it until a poke or a new event. Then: "also the companion perches and
     action surfaces and stuff needs to be properly done for the chat tab.
     and the regular companion expanded popup window needs more life and not
     just a statue" (screenshot: the enlarged dialog, a still figure).
     Placed: (5) and (6), Chat perches and an enlarged view that lives: an
     Opus agent.

441. **The owner, 2026-10-03, verbatim, with screenshots (the tags list
     under Capture's tags field; "Atlas is reading..." with its spinner; an
     Ask answer to "What have I saved recently?" that cites a note saying
     the IT assignment is due "this Friday"; that note, "Mentions 21 Sept,
     25 Sept, 2 weeks ago").** "no changing hover states for this dropdown
     menu and no way to navigate with keyboard. also make sure all these
     loading spinners are consistent across the app. also the ask tab ai
     didnt recognise timeword meaning as in I had a note I made two weeks
     ago that mentioned "this friday" but the ai didnt recognise that
     timeword meaning in relation to two weeks ago and now even though the
     app recognises and logs it in the metadata. also there is no way to
     customise the colour of categories. and I still feel like note metadata
     needs a better design and more expansion. also are there any more ways
     to optimise the application?? continue everything I have asked
     autonomously . feel free to use more agents at a time but only if they
     are sonnet5.5 as it is supposedly a lot better at coding now and still
     cheaper. I will be sleeping so impress me with all the improvements and
     fixes and expansions and enhancements. improve and redesign the ui/ux
     for the application." (with the eight design skills named again).
     Placed: (1) the tags list: hover lights a row, keys verified in the
     browser: the orchestrator; (2) one loading spinner recipe app-wide,
     with a lint: a Sonnet agent; (3) Ask gives the model each note's saved
     date and its resolved dates ("this Friday" written 22 Sept is 26 Sept,
     past), and "what have I saved recently" lists recent notes: the
     orchestrator; (4) category colours chosen by the person: a Sonnet
     agent; (5) note metadata redesigned and expanded, with INBOX 440 (1):
     the orchestrator; (6) a measured optimisation pass (boot, payload,
     queries, indexes): a Sonnet agent. Agent cap raised by the owner for
     Sonnet agents. **Done so far**: (1) hover and Enter; (2) one `.spinner`
     ring and `setBusy` (merged bca3962); (3) time words with their distance
     from today on every AI path; (5) in part: kept suggestions and the
     visible confidence; (4) category colours (merged 1ee38de); (6) measured
     optimisation pass (reference counts 242 to 6 statements, six indexes;
     WORLD_CLASS_PLAN H7).

438. **The owner, 2026-10-03, verbatim.** "I also think there should be
     timestamps and success status for when various things were last ran
     like the search reindexing etc." Placed: every maintenance action that
     runs on demand or in the background (search reindex, embeddings
     backfill, backups, filing re-evaluation, duplicate scan, OCR, imports)
     shows "Last run: <when>, <succeeded / failed: why>" beside its control,
     from one record the backend keeps per job kind: the orchestrator.

437. **The owner, 2026-10-03, verbatim, with screenshots (Settings,
     Templates: a Journal row, its "Built-in" badge and "Edit" button; Models,
     Top-k slider, a "you set this" badge, the value 124 twice).** "the
     templates settings page edit buttons and built-in badges are not nicely
     aligned and/or positioned. continue with everything. find and fix more
     bugs. then use your ui/ux skills and devibecoding skills to further fix,
     improve and redesign the ui/ux for the application. /anthropic-skills:
     unslop-ui , /ui-styling , /ui-ux-pro-max /anthropic-skills:web-design-
     guidelines , /design-system /design , /anthropic-skills:frontend-design ,
     /anthropic-skills:apple-design". Then: "double clicking the model
     advanced settings sliders resets the value but not the badge. and make
     sure the badges are thje same style across the app. make sure all the ui
     is consistent and use the skills listed in my last request".
     Placed: (1) Templates rows: badge and Edit aligned to the row recipe;
     (2) a slider's double-click reset updates its "you set this" badge (and
     the readout beside the number field shows the value twice); (3) one
     badge recipe across the app, with a lint; (4) a UI/UX pass guided by
     the named skills, surface by surface, each change measured: the
     orchestrator, with agents per surface.

435. **The owner, 2026-10-03, verbatim, with screenshots (the Capture tags
     row with its open list; CodeQL alerts 439 to 441; Atlas; a drawing).**
     "the dropdown arrow on the tags row in the capture subtab is not aligned
     vertically and the popup is awkwardly sized. there was a couple codeql
     stuff that got flagged and im not sure if they are fixed or not. also on
     the masculine atlas lower body looks like a tripod and very straight
     pencil-y, I was thinking like a thicker main whispy tail in the mddle
     like a snake and then the smaller ones on the side like the shoddy
     drawing I attached. continue what you are doing."
     Placed: (1) the tags field's native `<datalist>` arrow and list
     (Chromium draws both; neither takes the app's styles) become the app's
     own suggestion menu, aligned and sized to the field: the orchestrator;
     (2) CodeQL 439 to 441, "Cyclic import" notes in core/webclip.py and
     search/websearch.py (main, five days old): broken, the orchestrator;
     CodeQL 442 and 443 (this PR) were fixed and resolved; (3) the masculine
     lower body (wrapup-0927 item 7, now with the drawing): one thick
     S-curved central wisp tapering like a snake's tail, two or three thinner
     curved strands peeling off each side, a slow sway, no hard points: an
     Opus agent on atlas.js.
     **Added the same hour, verbatim, with a screenshot (the companion on
     the status bar, drawn over the AI status popup "Checking..."):** "the
     companion also clashes with some popups and the ai status icon isnt
     centred". Placed: (4) popups stand above the companion (or it steps
     aside) and (5) the AI status dot's glyph centred, measured: the
     orchestrator.

     **Added (6), verbatim:** "also there is no clear skeleton loaders for
     many features that are lazily loaded like the boards and maps in the
     library and other places". Placed: every surface that fetches before it
     draws gets DESIGN.md's `showSkeletons` recipe, found by a sweep that
     opens each lazily loaded view on a cold load: the orchestrator.
     **Added (7), verbatim, with a screenshot (Settings, Models: "Can't reach
     the MemoryMap server."):** "the models settings notice just appeared
     with no indication that it was working on something and said that the
     server cant be reached even though the app is running so incorrect or
     misleading message". **Done 2026-10-03** (`tests/test_inbox_435.py`).
     **Added (8), verbatim:** "also why does telemetry and do not track needs
     to be disabled for needle?? isnt it offline??" Answered (it is offline;
     needle's own tools default telemetry on, this app uses only its engine,
     which has no network code) and the caveat reworded. **Done.**

434. **The owner, 2026-10-03, verbatim.** "Can you make sure everything in
     the frontend, backend, function, utility and process for how the user
     can write notes and make a note is insanely easy and fast?? It needs to
     be world class. It it the whole reason for this notebook after all. It
     needs to be very accurate, fast, easy, not complicated but with advanced
     features, very robust and to actually work. It needs to be better than
     all other notebooks out there, have multiple ways it can be done, have
     extensive capabilities, and be the absolute gem of the app. It needs to
     be this amazing even when the ai isn't available or accessible and then
     even better with it."
     Placed (one brief, after the frontend/js move lands): (1) a measured
     audit of every way a note is made (Capture, New note, palette, keys,
     paste, drop, share, templates, daily note, from a selection, desktop
     quick capture) against Apple Notes, Obsidian, Bear, Keep and Drafts:
     time from intent to typing, keystrokes to saved, what is lost on a
     crash or a dead server; (2) filing without a model (local rules from
     the notebook's own categories and tags, so "no AI" still files well),
     better with one; (3) robustness (draft kept through reloads and
     crashes, offline save queued, never a lost keystroke); (4) the gaps
     the audit finds, fixed by impact, each measured.

433. **The owner, 2026-10-03, verbatim.** "Also go through and make sure
     the whole app follows the Australia WCAG 2.2 accessibility standards.
     Use zoom testing, screen reader testing, and accessibility scans like
     with axe dev tools. Continue what you are doing and make sure nothing
     is left half finished or not properly implemented. Can you also put
     all the js files in the frontend folder into a js folder later when you
     can?"
     Placed: (1) WCAG 2.2 AA (the level the Australian Government's Digital
     Service Standard and the DDA guidance point to): axe-core scan of every
     tab, Settings section, sheet and dialog in both themes; zoom at 200%
     and 400% (1.4.4, 1.4.10 reflow at 320 CSS px), text spacing (1.4.12);
     the accessibility tree read as a screen reader would (Playwright's ARIA
     snapshot; no real screen reader runs in the sandbox, so say so);
     keyboard-only paths and 2.4.11 focus not obscured, 2.5.8 target size;
     fixes per finding, a sweep kept in scratchpad/ui-sweeps; (2) "nothing
     half finished": the open carry-over (wrapup-0927) ticked only when
     measured; (3) the frontend/js/ move (wrapup-0927 1), done when no agent
     is editing frontend files.
     **Progress 2026-10-03 (PR 162):** (1) axe-core over every tab, Library
     sub-tab, Settings section and overlay, both themes: 0 violations after
     the fixes (main landmark, separator values, editor names, two contrast
     pairs, button rows, Find anything's listbox, nested controls in Library
     cards, Settings fold heads and Manage categories); `srtree.js` 0
     (landmarks, headings, live regions, skip link, dialog focus);
     `a11yname.js` 0; `contrast.js` 0 both themes; `notekeys.js` the notes
     flow by keyboard clean (F2, Escape, chooser sheets fixed); `zoom.js` 0
     on Notes and Library at 200% and 400% after the reflow fixes, the rest
     of the tabs measured at the end. Not verified: a real screen reader
     (none runs in the sandbox), the desktop window. (3) with an agent.

431. **The owner, 2026-09-27 after the reset, verbatim.** "I think notes
     appear in the command palate search / Also is there a way to customise
     the colour the fill of mind map nodes?? Also for the mindmap export to
     customise the colour of the background / Or just to be able to customise
     the mind map background colour in general / Also can there be some more
     animations and states of the companions?? Like lying down and sleeping or
     doing other things like reading, sitting on a beanbag, pulling out a
     chair and sitting on it, face palming, other gestures and props etc. But
     focus on the smooth transitions and movement adjustment transitions and
     other similar organic movement as that is the current worst thing. Maybe
     also giving like the hair , tails, nebular streams some flow and swaying
     or smth to make the atlas characters really attractive, well designed,
     well animated and more. The female atlas main body could potentially
     have a bit more of a femine chest but don't overdo it just really
     subtle. Round out polish and finish the whole companion and avatar
     feature. Polish the testing tool html pages for them as well. Then make
     sure it is all optimised and cheap to run and everything is togglable in
     settings. And continue. Polish the app, devibecode it. Fix bugs. Fix
     ui/ux learnability, utility, accessibility, usability and information
     architecture"
     Placed: ~~(a) palette notes (verify: notes should appear; if not, bug)
     and (b) mind map node fill, canvas and export background colour: one
     Sonnet agent~~ **done 2026-09-27**: both already existed and worked
     (verified live in Chromium against a real palette search and a real
     mind map), no feature code changed; regression tests added
     (`tests/test_palette_contract.py`, `tests/test_export_paint.py`).
     Left, from the same report: (b)'s discoverability (the owner asked
     without knowing they exist, so the controls need better labels/help,
     placed below as its own item) and companion motion. (c) companion
     motion first (transitions, glide, secondary motion on hair, tails and
     nebula), then new states and props, the subtle feminine chest, the
     test pages, per-feature toggles, cost: the two Opus agents on atlas.js
     and avatars.js; (d) the devibecode programme, WORLD_CLASS_PLAN 22.4,
     after.
     Addenda the same afternoon, verbatim where quoted, all placed with the
     two companion agents: the top-bar peek; locomotion by distance (walk,
     hop or fly near, portal far: "It is a companion, not a fake soulless
     construct"); a smoother bust; a slight body tilt left or right; the
     sleepy face in both looks, "z" emotes and a night cap; close-range
     pointer following; hover and click reactions that ease in and decay
     ("more natural and gradual, unless it is startled"); boredom
     wandering; lying down to sleep and masculine and feminine body
     language; rotating per-persona thinking words beside the typing dots
     (the Sonnet agent, lists written by the orchestrator).
     (e) Categories: "there needs to be a better, easier and more accessible
     and learnable way to edit categories like with merging them, splitting
     them, moving notes between them etc. accessible from the notes tab, and
     settings. maybe an access menu or panel cna be used from the your notes
     subtab and/or sidebar??" Exists today: rename (onto an existing name it
     merges) and delete, from the sidebar menu (`renameCategory`,
     routes_categories.py PUT/DELETE). Missing: an explicit merge, a split,
     moving notes between categories, and one place to do all of it.
     Recommendation, taken: one "Manage categories" panel (the sheet recipe),
     opened from the sidebar head, each category's menu and Settings; a
     row per category with count, rename, merge into, split (pick notes or
     let the AI propose), delete with a destination; notes dragged or
     multi-selected across; every action undoable. Next free Opus slot.
     The owner, straight after: "I should say manually edit. the user needs
     to be able to easily do anything the ai can do". So the panel is part
     of a parity rule: every write tool the agent has (WRITE_TOOLS and
     tools/categories.py: create, rename, merge and delete category; create,
     edit, tag, pin, link, unlink, delete and restore note; reminders; rename
     and delete tag; documents; whiteboard cards and links; mind map nodes)
     gets an audited, discoverable manual path, each gap fixed, and a lint
     that fails when a new write tool has no named UI entry point.
     **Built 2026-09-27** (e): the Manage categories panel and routes
     (create, merge, split, proposed split, move, delete into), and the
     parity lint, `tests/test_manual_parity.py`, naming the manual path of
     every write tool. Left: the proposed split groups by tags; an AI
     proposal would need the model.
     (f) The owner, with a screenshot of the Documents AI assistant dialog:
     "I actually reallly like the design of the document editor's ai
     assistant popup panel. especially with the design of the close,
     history,a nd tooltip buttons. idm the edit/write/remove pill either.
     the suggest an edit button is fine to." Placed: DESIGN.md's recipe
     index now names it the reference dialog head; every modal and popup
     head is brought to it, with a ratchet lint (the Sonnet agent, after
     the thinking words).
     (g) The owner: "remake and retake the screenshots for the readme file,
     update the atlas section with a short intro, title, headline and short
     description and accompanying image with an expression or mood. take the
     screenshots in dark mode but maybe have a dark/light comparison image.
     make the graph really visually pleasing and impressive with a mix of
     connected and non connected, some clusters some webs, some connections
     ahve reasons and others dont etc. make sure all main features are
     properly shown. and polish and update the rest of the the readme as
     well." Placed: after the Atlas and companion passes land (so the shots
     show the finished art), the first agent to free takes it: a seeded
     showcase data dir (clusters, webs, loose notes, reasoned and plain
     links), dark shots of every main feature, one dark/light split, the
     Atlas section rewritten, README polished; test_readme_freshness green.
     **Addendum, the owner, 2026-09-28 (Windows, granite4.1:3b), verbatim.**
     "No gap below the 'use nomic-embed-text' button. Colour contrast issues
     on the plan and web polls when active on the chat interface. Depending
     on what the companion is perched on or anchored to at a given time it
     might have different z-indexes so like if it is perched on like a chat
     message bubble or a library card, when it scrolls with them it should
     probably go behind the top bar like the thing it is perched on not in
     front of it. If say it is stitting on or perched on an element like the
     top bar, then it would be in front yk?? It's still really confusing to
     use the built in embedding model because half the time I can't tell if
     it is working or how well... also the fit drag mini fit map on the
     whiteboard and mindmap is reallllly glitchy and laggy. The Popup agent
     has been unable to answer multiple prompts as well and it's really
     worrying. The whole process of filing, creating, editing, refining,
     managing, tagging, recategorising notes and more anywhere, especially in
     the main sections needs to be wayyy more fast, intuitive, guided,
     assisted, automated, easy manually, and smooth to use." And: "there have
     obviously been a lot of bugs that have been missed if something as big
     as filing a note was very broken so I'm worried."
     Same day, also open: the graph's default layout "looks messy and is
     distributed wierdly"; the slash menu's Link card and Web link render the
     same on a line of their own (a lone link is a card, CHAT_PLAN decision
     12; recommendation: Web link on an empty line inserts inline syntax the
     card rule skips, owner to confirm); a toggle in the note edit form's
     preview reportedly exits preview (not reproduced in Chromium, capture's
     half fixed in 31d5460).
     Done the same day (commits 3d493ac to 2b721bd): capture preview and
     gutter, spinner under reduced motion, one-tab picker strip, unread-dot
     gap, popup agent "(no answer)" reasons and waiting line, Ask waiting
     line, 499 for abandoned requests, greeting name once, one nudge on an
     empty agent round, built-in engine applies on selection, Chat and agent
     read the app's help for how-to questions, popup user mark, companion
     hide sweep, web reader on site-builder pages.
     **2026-10-03 (INBOX 432, PR 162):** (1) to (7) all done; (5) the
     companion goes under the bar its perch scrolls under
     (`tests/test_companion_stacking.py`, `companionstack.js`: 62px over the
     bar to 0, 103px at Large to 0).
     Placed, in this order: (1) **a real-model pass before more features**:
     `scratchpad/llama-dev.sh serve` with a 3B model, then the popup agent's
     two failing prompts, filing a new note, and `pytest -m evals`, because
     every failure reported today passed a fake-transport suite; (2) the
     note flow as one brief (WORLD_CLASS_PLAN, notes dossier): filing,
     re-filing, tagging and editing measured end to end in the running app
     with the model; (3) built-in engine status in words (ready, indexing N
     of M, last query semantic or keyword); (4) minimap drag performance
     (whiteboard and mind map, measured frame times); (5) companion stacking
     by perch; (6) graph default forces; (7) the two small visual ones
     (button gap, Plan/Web pill contrast) with contrast.js.

430. **The owner, 2026-09-27 afternoon, with 37 screenshots (verbatim in the
    session; condensed here, each placed with an agent).** Bugs: agent turn
    "Invalid format string" on Windows (**fixed** 180e522); chat citation
    renumbered to 1 on reload while its peek shows source 8; scroll jumps in
    chat with a sources fold open; layout flickers between two states every
    second in devtools responsive mode; top bar not centred at small widths;
    lightbox meatball menu does nothing; OCR workspace not reachable from
    Images; '?' popover in Capture does not scroll with a touchpad; tools
    list draws a second divider over column two's first row; Privacy's
    Since launch / All time pill has no active state; capture preview
    crushes line numbers; Atlas spills out of its ring in the tour.
    Phone and tablet: graph controls overlap, Documents editor cut off,
    whiteboard will not pan by touch, lightbox, skill logs sidebar (gap,
    shadow, no hover-expand), gap under the bottom bar, the agent-runs bar
    on phones, Contents dates overflow, a portrait-shaped graph. Asks:
    links widget and a rename of Library's Links; notice banners carry
    their action with a confirm; settings section heads; the agent popup's
    avatar circles; guide: AI/system answer toggle, much more help, cleaner
    formatting; model per feature offers "same as chat/utility model";
    note forms use the live view with a source toggle, no Preview; AI
    templates (generate, edit, regenerate) and every template in Settings;
    Windows tray menu extended; constellation in the background art and a
    better constellation; graph node size by a toggle, Arc fit, Tree
    centred; companion: perches on every tab, dodges popups, less
    distracting, lifelike motion and transitions, a show/hide hotkey and
    palette action (done: Ctrl+Shift+Y, rebindable, palette and Find
    anything rows that say Hide or Show, PR 162); Atlas less chunky, masculine limbs, tilted rings with
    orbiting bodies, a taller nebula; generated faces vary expression per
    character. Questions: prompt injection, chat header divider. Rules:
    two or three agents, Sonnet where quality holds, concise.
    **Added 2026-09-27 midday (the owner, verbatim):** "also can you extend
    this menu a bit maybe with sub-sections if necessary, for things such as
    a quick link to the profile/personas/appearences tab, toggling various
    features such as masculine/feminine, which companion is displayed etc."
    (the companion's right-click menu). Its screenshot also shows that menu
    opening at the window's top left with the companion at the bottom right:
    recheck on the current head after a0d957a. Decided the same day: desktop
    first with small laptops (1366x768 at 125%, 1280x720) and tablets next;
    Links is renamed Bookmarks; the two map kinds are named separately;
    releases stay on 0.3.3 for now.
    **Added (the owner):** tab changes: the companion lingers on the old tab
    a moment then pops in elsewhere. Wanted: it stays behind on quick tab
    flicks and only follows after the person settles on a tab; it enters
    smoothly (walks on from the side, climbs up from the bottom bar, climbs
    down from the top bar, or materialises), never a sudden pop; a "reduce
    actions" setting so waves and gestures come less often; more stances,
    Atlas's masculine and feminine each with their own.

427. **Open from INBOX 426, 2026-09-26: two calls only the owner can make.**
    Everything else in 426 (a to cc) is built and in HISTORY, "INBOX
    resolved, 2026-09-26"; the agents' smaller leftovers are in
    `agent-remaining/OPEN.md`, "Left by the 0.3.3 agents".
    (1) **Atlas's anatomy, the owner's read of rounds 3 and 4.** The trace
    proofs put the masculine look at 88% of the reference sprite's height
    and the feminine look's hair a third shorter than the definitive stand's;
    the owner's review names the next round (hands and feet, the head to body
    join, the tail's ribbon, the chest star). Judge it in the avatar lab
    (`tools/avatar-lab.html`, Both looks, All poses) or the README's
    `docs/screenshots/atlas-hero.png` and `atlas-poses.png`.
    Recommendation: none to take on the owner's behalf; this is taste.
    (2) **The companion's pin near an edge.** A companion pinned within 160px
    of the window's right or bottom edge keeps its distance from that edge
    when the window is resized (so it moves with the edge); one pinned further
    in keeps its place. Whether the owner reads the first as "it still
    moves" (426 l) is not known. Recommendation, taken unless the owner says
    otherwise: keep it, since a pin by the edge that stayed put would end up
    off screen or under the scroll bar on a narrower window, which is 426 k.

425. **The owner, 2026-09-24 (after the usage reset), with screenshots.**
    Avatars: (a) "the avatar shows even when the app is on the lock screen.
    it should only show when the app is unlocked"; (b) "is there a way to
    make the corner companion more lifelike and less a circle just chilling
    somewhere on the screen?? give it life", and "an adaptive companion
    avatar placement feature where set areas are assigned as possible areas
    for a companion to sit or chill around while not being in the way on
    every interface and page. and the companion can even interact with the
    close ui like hand from a top bar, sit on a bottom bar, walk a top a
    feature ... just so I dont move it to one area, and then it is annoying
    for it to be there on another page" (fixed: the companion is one
    drawn character with a body, and per tab it takes a perch measured from
    the real UI (hanging from the top bar or a panel's underside, sitting on
    or standing at a top edge with its legs dangling or tucked, tucked behind
    the bottom bar as a last resort), never over a control; a spot you drop
    it on is kept per tab against its panel; a weighted behaviour picker
    with cooldowns runs one decision every 4 to 12s; commits 4b4f1d4 to
    5c19f45); (c) "may shuffled avatar reset and
    didnt persist"; (d) "how does the shuffle work?? does it still base it
    on what is entered for the name??" (fixed: Your look says it keeps what
    the name says and any part you chose and redraws the rest, db38ea1);
    (e) "I want the persona avatar to
    appear next to where you set the persona for the dashboard greeting";
    (f) "I set the dashboard greeting to another persona, but when I hit
    regenerate, it said asking Atlas"; (g) "I changed personas for the
    dashboard greeting and the avatar/icon changed as I had set it, but when
    I changed the persona again, it didnt change again"; (h) "the whole
    thing with the avatars needs a proper polish and bug fix ... a full ui
    and ux upgrade to properly fit the application" (fixed: every generated
    face is one designed character, d1e74fd; swept at 1440 and 390, light
    and dark: row alignment within 0.5px at every list site, no clipping
    but the large view's ears (fixed), speech bubbles kept inside the
    window, the companion no longer over the chat composer's settings or
    the phone's Library tab). Documents: (i) "can
    there be a document full screen mode so there is more space ... maybe
    the top bar needs a bit of redesigning or the interface on the document
    editor needs a bit of visual adjusting to allow for more room. also
    tables are still really annoying to use and edit in the documents live
    view" (fixed: focus mode on the dock and F11 hides every band of chrome,
    a fading floating bar keeps title, words, save state and Exit, 228px to
    71px above the first line and 520px to 830px of writing at 1440x900;
    the dock is one 36px row, 49px back in the normal view; Live tables keep
    the column on the arrows, Enter goes down and adds a row, the arrows
    leave a table at either end of the document, a spreadsheet paste fills
    cells or makes a table, the cell menu rides the edited row; the AI
    assistant's head and verbs redesigned; commits da89a75 to 260bb2a).
    Settings: (j) "remove the need for saving preferences in the
    settings and just have it auto save like the rest of the settings";
    (k) "should these text boxes be aligned to the right??" (the
    Preferences number fields; answered, no change: measured, all four
    sit on the pane's one field column at x=812, the same left edge as
    Display name and the answer-style select, and flushing them right
    would give each a different left edge because their units differ); (l) "Improve how custom theme cards are
    displayed" (name truncated "Sea of P...", delete button crowding it; fixed: saved looks get a 10rem track,
    the name wraps to two lines before it truncates, delete is a badge on
    the card corner; measured 183px cards, no name clipped at 1440).
    Dashboard: (m) "the search bar on the dashboard has a glass aesthetic
    even when it is off"
    (fixed: its ground was a 4% tint over the page art; the tint now sits
    on `--card`, which glass off makes solid). Backgrounds: (n) Mycelium start points more
    organic, smoother faded transitions; (o) optimise Microbes (fixed, both,
    e5a8c4b and b8ad914: scattered spores, staggered threads, a 2s
    cross-fade between generations; Microbes 3.0 to 2.2ms a frame; also
    Constellation 3.5 to 2.4ms, Mesh and Orbs moved to 15/30fps canvases,
    whole-browser CPU about halved. Still open: Constellation and Microbes
    just over the 2ms budget on a loaded machine, 0.3 to 1MB/s of canvas
    garbage from fractional coordinates, pause on blur only after 30s, the
    dead CSS path and `bg-*` keyframes in 03-dashboard-widgets.css, a faint
    upscale texture in the dark mesh, 4x-throttle numbers not re-run). (p) "see if there are any more areas to reduce
    lag ... like the avatars and other animations" (the audit agent, 424).
    (q) "on the dashboard when on the focused view, the hero section row is
    ugly and needs improvement and I dont agree with the search bar being on
    the same line and changing width depending on how long the welcome
    message is" (fixed: the owner's decision reverses INBOX 296's one-row
    head; Focused is Full's head at a smaller scale, a 71px banner with the
    greeting and name nudge, the summary under them and the time on the
    right, and the search full width beneath it at 1408px whatever the
    greeting says; measured at 1440 and 390).
424. **Audit of 2026-09-24 (performance measured in Playwright on a
    400-note, 1,200-link, 250-object board, 120-topic map, 30-image
    fixture, at 1440x900, 1x and 4x CPU with CDP profiles; UX walked at
    1440 and 390). Fixed in this pass: the media poll outliving the
    Library, the outline rebuilt per typing pause (515ms to 12ms), the
    avatar follow frame's document-wide query (279ms to 20ms per 60 moves),
    the unnamed "Toggle Sidebar" button. Open, one line each: measurement,
    cause, recommendation.**
    (a) Board, dragging a multi-selection: 44 long tasks, 8.6s of them for
    40 moves at 4x (max 560ms); `objDragMove` calls `wbUpdateSelectionBar`
    every move, and `wbItemBBox` runs a document-wide
    `querySelector('.node-card[data-id=...]')` per item (2.6s); recommend an
    id-to-element map from the render pass and the bar updated once a frame.
    (fixed: `objDragMove` 5,167ms → 167ms, profile busy 6.1s → 1.0s, longest
    task 901ms → 213ms, same harness and fixture at 4x; element cache in
    `wbItemBBox`, the bar queued once a frame, the chrome groups found once
    per gesture, the editing check scoped to the board. Bar position mid-drag
    identical to base over 10 moves, `perf5/barcheck.js`.) Still open on the
    board, a pan: a devtools.timeline trace of 40 moves at 4x is 43 long
    tasks, 3.5s, of which `Layerize` is 2.4s and script 0.2s; it stays with
    the grid sync, the cull, the bar, the navigator and both SVG transforms
    switched off (`perf5/pantrace.js` VARIANT), so it is the compositor's
    layer assignment of ~250 painted objects per frame, not a handler.
    (fixed 2026-09-26: the objects were not the cause, their grips were.
    Nine per card, invisible but in the tree, each scaled by
    `--wb-inv-zoom`, split the board into 256 layers; `display: none` at
    rest gives 138. Two runs each at 4x, 40 moves, `gwperf.js`: long tasks
    33/38 (2.5/2.7s) to 2/2 (136ms), `Layerize` 1.8/1.7s to 0.34/0.35s,
    median frame 67/50 to 17/17ms; the zoom's long tasks 2.0s to 0.5s.
    Grips on hover and selection unchanged, fade kept, `wbpanlayers.js` 6/6,
    3/6 on base.)
    (b) Graph node drag at 4x: 137 long tasks, every frame over 33ms (max
    550ms); `graphMinimapPaint` rebuilds the minimap's SVG on every worker
    tick (1.56s of `createElementNS`/`setAttribute`/`replaceChildren`);
    recommend painting the minimap to a canvas, at most once a frame.
    (fixed: `graphMinimapPaint` 1,502ms → 514ms, profile busy 3.6s → 2.0s
    for the same 40-move drag at 4x; the ticks queue one paint a frame, the
    paint moves the existing dots and lines and skips unchanged attributes,
    and a minimap that is off, on a hidden tab or in a hidden window is not
    painted. Kept as SVG: the sweeps count its circles. Dots, lines and
    positions identical to base, `perf5/minicheck.js`, `minimap6b.js`.)
    (c) Graph wheel zoom at 4x: 31 long tasks, 13.7s, p95 frame 583ms;
    `gcDraw` re-measures every label (`measureText` 152ms) per frame;
    recommend caching label widths per node and font size.
    (fixed: `measureText` 165ms → 0 over 16 wheel steps at 4x; a label is
    measured once per text at a reference size and scaled with the zoom,
    dropped when the font changes.)
    (d) Graph tab switch at 1x: 25 long tasks, 1.6s, 50 of 59 frames over
    33ms; each visit refetches `/graph` and restarts the layout, and
    idle on Graph at 4x is still 3.7s of main-thread work per 10s
    (worker ticks plus minimap); recommend reusing the last settled layout
    when the notes' version has not changed.
    (fixed for the layout, not the fetch: main-thread task time in the 12s
    after a revisit at 4x 6,746ms → 1,382ms; a layout whose inputs, pins,
    lines, forces and world match the last one to settle, with every note
    where it left off, starts at rest and is framed as before; any change of
    input heats it as before. Idle once settled was already ~5ms per 2s: the
    cost was the re-settle. Still refetched each visit.)
    (e) Mind map expand of the root (120 topics) at 4x: one 1,336ms task;
    `renderWbObjects` rebuilds every node through `wbBuildMapNode`
    (`setAttribute` 354ms); recommend keyed updates so an expand only
    builds the nodes it reveals.
    (fixed: the join was already keyed, so an expand of the root does reveal
    all 119; what it no longer does is build them. A folded topic's element
    is kept and taken back, for the same datum only. Two runs each at 4x:
    longest task 899/1,115ms → 597/442ms, profile busy 781/1,016ms →
    456/319ms, `wbBuildMapNode` 321/419ms → 0. Markup after a fold round
    trip identical to base apart from attribute order, and a taken-back
    topic's chevron still folds it, `perf5/mapreuse.js`.)
    (f) Lightbox next/previous at 4x: 13 long tasks for 5 presses (p95
    350ms); `show` calls `applyZoom`, which calls `scrollTo` (375ms of
    forced layout) even when already at fit; recommend scrolling only when
    the zoom actually changed.
    (fixed: `show` 457/360ms → 37/28ms and `scrollTo` 406/305ms → 0 over
    five presses at 4x, two runs each; profile busy 580/465ms → 128/118ms.
    Fit scrolls only a scroller its own scroll events, or a pan, say is off
    its origin, so a PDF read halfway down still goes back to the top.
    `lightboxfit.js` 42/42 on both.)
    (g) Library tab switch at 1x: 10 long tasks, 580ms (4x: 3.4s, max
    683ms); `loadLibrary` refetches `/library` and rebuilds every card each
    visit; recommend the same version check as (d).
    (open, needs a decision: skipping the rebuild when `/library` answers
    the same would also keep the selection, which a reload clears on
    purpose, and leave relative dates as they were drawn. Recommend: keep
    the cards on screen during the refetch, skip the rebuild when the answer
    is identical, and clear the selection either way.) (Fixed with that
    recommendation: an identical answer drawn under five minutes ago is not
    redrawn unless something is selected; 189 grid mutations over three
    revisits before, 0 after.)
    (h) Every tab switch at 4x: `revealTab` 70 to 110ms self time, mostly
    `querySelectorAll("textarea.autogrow")` then `autoGrow` on each visible
    one (forced layout per box); recommend autogrowing only the new tab's
    boxes.
    (fixed, the autogrow part: every check is read in one pass and only a box
    measured while hidden, or whose text, width, font or cap changed, is
    grown; 0 to 12ms per switch. Not the 70 to 110ms: split step by step
    (`perf5/revealsplit2.js`, 14 switches at 4x) it is `button.tabIndex =`
    796ms, which forces the style recalc of the page just shown, then 203ms
    of its layout; autogrow was 30ms of revealTab's 1,318ms. That is the new
    tab's own style and layout, forced early, and moving it was measured to
    gain nothing (the note on `revealActiveTab`).)
    (i) Typing in a note at 4x: 56 of 204 frames over 33ms; each keystroke
    mirrors the editor into the hidden textarea and dispatches `input`,
    which runs `autoGrow` (448ms self) on a box nobody sees; recommend
    skipping autogrow for a box whose editor is mounted.
    (fixed: `autoGrow` 492/532ms → 16/17ms over the 50-character run at 4x,
    profile busy 2,448/2,790ms → 1,874/1,713ms. The mirror is left to the
    stylesheet's `height: 100%`, which an old inline height had overridden:
    measured after 14 lines, base mirror 315px under a 398px editor, now
    398px; the editor and its box are unchanged, `perf5/capcheck.js`.)
    (j) The brand emblem's p5 loop draws at 24fps on every tab while idle
    (`_draw` about 70ms per 8s at 1x on Dashboard and Chat, and it shows up
    inside every drag profile); recommend pausing it after a few seconds
    without input, as the mood timer already tracks.
    (already fixed by b944d2c, which the audit's worktree predates: the
    emblem is drawn once and turned by CSS. Measured on this head, 8s idle
    at 1x: 0ms of script on Dashboard and Chat, `perf5/idleprof.js`.)
    (k) Library shows at most 200 of each kind (`PER_KIND_LIMIT`,
    routes_library.py) and its chip counts are the count returned: with 400
    notes the chip reads "Notes 198", and a plain Library search for the
    oldest note ("Note 17 summary") says "Nothing matching" while
    `/entries?q=` finds it; recommend true counts and a server search (or
    paging) once a kind passes the cap. (Fixed: counts and the overview
    are real totals, `truncated` names the cut kinds, `/library?q=` matches
    before the cut and the client swaps those kinds in while searching; a
    line under the grid says "Showing the newest 186 of 339 notes. Search
    to reach the rest." Measured on 339 notes: the chip reads 339, a search
    for the oldest note finds it. Test in tests/test_library.py.)
    (l) Settings: 18 sections in 4 groups; "Profile & preferences" sits
    under Atlas but holds the recycle bin, chat history, notifications and
    writing, is the only section with its own Save button, and repeats a
    "Web search" heading that only links to the Web search section;
    recommend "Profile" under Atlas, a "General" section under Your
    notebook, save on change, and the pointer heading removed. (Fixed:
    Profile keeps the name, look and About me; General, first under Your
    notebook, holds the bin, chat history, answer style, search relevance,
    notifications and writing; both save on change; the Web search pointer
    heading is gone; the Ask tab's relevance link and the catalogue go to
    General.)
    (m) Settings sections are long: Tools 7,592px tall at 1440 (12,058px at
    390), Appearance 4,537px with 105 controls, Logs 515 controls;
    recommend collapsed groups (`details`) with the first open, per
    DESIGN.md.
    (n) One thing, several names: Chat (tab), "Ask" (Notes sub-tab and
    status bar), "Write with Atlas" (Notes sub-tab), Atlas (Settings group);
    Skills (Settings) vs "AI skills" (Library sub-tab); recommend one noun
    per thing in DESIGN.md's copy rules and a lint.
    (o) Library: 8 sub-tabs plus 13 chips in All, several the same filter
    twice (Documents chip and sub-tab; Boards and Mind maps chips and the
    "Boards & maps" sub-tab; Files chip and sub-tab); 101 visible controls
    at 1440; recommend the chips be the only kind filter in All.
    (p) Documents have a tab page with no tab-bar button: the way in is the
    Library's Documents sub-tab, and the tab bar then highlights Library;
    recommend a breadcrumb back to the Library in the editor's dock. (Fixed:
    a "Documents" breadcrumb opens the dock, back to the Library's
    Documents list, measured at the title's height.)
    (q) Notes tab: 109 visible controls at 1440, 19 of them under 24px
    (the link chips on each card); recommend the link chips behind a count
    ("6 links") on the card, expanded on hover or focus. (Fixed: the
    first three links show, the rest wait behind "+N more links", which
    opens them in place.)
    (r) Memory is clean: 30 tab switches moved the heap 21.7 to 22.3MB,
    DOM nodes 48,888 to 49,297, listeners flat. Idle Chat once measured
    599 layouts per 10s at 4x and did not reproduce (0 in a later 5s
    check): watch for it.

423. **Found, not fixed, by the agents of 2026-09-24 (placed for the next
    pass; one line each, recommendation first).** (a) The mind map's pie
    ring does not take focus when it opens, so Enter and the arrows still
    act on the board while it shows: recommend it takes focus when opened
    from the keyboard only. (b) DOCX export writes `:::columns`, `[TOC]` and
    `[!kind]` as plain text: map them to Word columns, a TOC field and a
    shaded box. (c) Inline `$x$` maths is plain symbols in Read view: render
    it through the same TeX-to-MathML path as `$$`. (fixed: `INLINE_MATH_RE`
    (app.js) now claims a `$…$` span with no space inside either delimiter
    and no digit right after the close; `unlatex` carries it through
    untouched instead of symbol-swapping it, and `renderInlineMarkdown` cuts
    it out and draws it with `mdInlineMathElement`, the same `docMathRender`
    the `$$` blocks use. `tests/test_inline_math.py`.) (d) The OCR workspace's
    message for a vision reading still suggests installing Tesseract: word
    it by reader. (fixed: `_regions_for` (routes_files.py) checks
    `ocr.tesseract_available()` before wording the "no page positions"
    message; installed but not chosen now says "Switch to Tesseract", missing
    still says "Install Tesseract". `tests/test_ocr_regions.py`.) (e) At
    150% zoom the lightbox picture overlaps its caption
    line. (f) Stored readings that already contain a repeated-line loop are
    not cleaned: offer "Clean up" in the reading menu. (fixed: a broom
    button beside Delete reading, in the OCR workspace and the lightbox's
    other-readings list, POSTs `/files/{id}/ocr-clean-loops` or
    `/media/{id}/ocr-clean-loops`, which runs `cut_reading_loops` over
    whichever of `vision_ocr_text`/`ocr_text` are set and saves what
    changed; the panel repaints from the response. `tests/test_ocr_clean_loops.py`,
    live-checked with `scratchpad/ui-sweeps/ocrcleanloops.js`.) (g) `_desktop_port()`
    treats any MemoryMap on the port as ours, whatever its data dir: compare
    the data dir in `/instance` first. (h) Chat replies saved before
    2026-09-24 always show Atlas's mark (their persona was never stored).
    (i) The server-mode process takes 5 to 9s to exit after uvicorn
    finishes: find the thread that holds it. (fixed: every sync route
    (almost all of them) runs on one of anyio's own "AnyIO worker thread"
    objects, which is not a daemon thread and only stops itself on a
    done-callback that can miss `uvicorn.run()` tearing the loop down;
    measured leaving one alive, `daemon=False`, right after "Finished
    server process". `_stop_lingering_worker_threads` (`__main__.py`,
    called right after `uvicorn.run()` returns) asks it to stop and bounds
    the wait to 1s. `tests/test_server_shutdown.py` reproduces the leftover
    thread with a real `uvicorn.Server` running `create_app()` and checks
    the fix clears it.)
    (j) `gate.sh --sweeps` on 25d7d56 (fixture data dir /tmp/mm-me):
    asktab.js 3 findings, libreadingfoot.js "reading visible: false" and
    "no card with a reading", tagoffer.js 2 failures (manual route and the
    empty tag row flag). Triage each as app bug or stale sweep before
    fixing; the reader's 36px page box is fixed (25d7d56).

421. **The owner, 2026-09-24, verbatim, with screenshots (placed in agent
    briefs, two at a time).** (a) "in the radials on the mind map, the items
    like "add beside" and "cross-link" are very close to the edges (inner and
    outer) of the radial and arent centered nicely. also when I press the
    more button the dropdown menu appears in the top left of my screen"
    (desktop app; the pie-ring agent could not reproduce the corner with a
    real click). **(a) built** (INBOX 421 agent): labels centred with 10px to
    both arcs and dividers (1.4 -> 11.4px, mapradialfit.js); More anchors to
    the sector read at pointerdown, (0,0) refused and logged, the canvas host
    no longer scrolls on focus (mapradialmore.js 33/33). The desktop corner
    itself was still not reproduced headless: the console now names any
    corner placement, so the owner's log will say which route it was. (b) "the / command blocks and frames need a massive
    redesign, expansion and improvement, the icons dont render in the live
    view in the documents editor ... they need ot be impressive and an actual
    proper thing the user's can use to properly structure out their
    documents and notes." (live-view callout icon fixed 6e072b2; built
    2026-09-24: the grouped block inserter, 14 callout kinds, columns in
    notes, contents, rules, cited quotes, maths, the block bar and document
    cards, `slashmenu.js`, `blocksrender.js`, `blockbar.js`.) (c)
    "sometimes document editor dropdowns appear at the top of the screen and
    other times it is fine, sometimes it doesnt open at all" (the spelling
    menu, top of the window; fixed 2026-09-24: placed from the
    finding, never a detached element's empty box; the double-click's first
    press; the "/" menu follows a scroll; `menuanchor.js` 15/15). (d) "there's no 'x' close button on the trace
    popup row in the graph" (**built**: an X at the strip's end that leaves
    trace mode; Done only cleared the ends; graphtraceclose.js). (e) OCR: "I cant delete the ocr entry in the
    workspace or the lightbox and the text in the lightbox doesnt even appear
    in the ocr workspace" (workspace delete fixed 6e072b2; the lightbox
    showed a vision reading of "Test, Test, ..." hundreds of times, a
    degenerate model loop the app should cut; **built**: loops cut where a
    reading is produced, each lightbox reading deletable, the workspace shows
    both stored readings and no longer blanks a stored one when the reader
    is the model; ocrreadings.js 6/6). (f) The file row in the
    Library ("PDF · 121 KB · added ... Read · 808 words, Open reader, Used
    in"): "needs a bit more modern and ui refinement and the second row
    elements arent aligned and dont really match" (fixed: one size, one
    line box, middot groups, "Read this" a link). (g) "the lightbox buttons
    below the image are greyed out?? i opened the image from within a note".
    (**built**: not disabled, the row was the theme's ghost ink on the dark
    scrim, 1.37:1 in light from every door; now the scrim's own recipe,
    8.28:1; lightboxentry.js) (h) View toggles with no clear active state (fixed c920174). (i) "have
    you included all the new optional packages in the packages settings
    page??" and "move the preferences settings page up a bit and maybe also
    turn it a bit into the user's own personal local profile where they can
    put info about themselves and their name for the ai to use as context
    and there can also be the generated profile image". (j) "I clicked a note
    linked in the sources of an ai chat reply and it took me to that note,
    but when I pressed the back navigation button it opened the settings
    panel??" (not reproduced: chat then flashEntry then Back lands on chat,
    also with chat opened from inside Settings; needs the exact path).

410. **The owner, 2026-09-24, verbatim, with screenshots of the writing
    dictionary, New from a template, the map's radial menus and two linked
    map nodes.** "also improve how the \"check with ai\" feature works in the
    documents editor, allow the suggestions panel to be docked on the right
    instead if the user wishes and redesign the dictionary panel as it is
    ugly and needs a proper professional modern redesign." "also when
    selecting a template, I want to be able to confirm my template
    selection, not have it instantly be made when I press it" "is there a
    way to make these mind map item radial options fit better in the
    radials?? also what if the user asks the guide for all the hidden
    features, keybinds, controls, utility and more for features like the
    whiteboard, mindmap and documents editor etc. can it answer those??"
    "also fix the ci and codeql errors" "when I relink or newly link two
    mindmap nodes, they clump together??" "drag selection on the whiteboard
    and mindmap is laggy as well". Read from the screenshots: the radial's
    labelled pills overhang the ring (a 2-item edge ring and the 6-item node
    ring both); a relinked node lands on top of its new parent instead of
    being laid out as its child. CI: four routing rows fixed 2026-09-24 (three
    moved to topics added that day, "Can Atlas write for me?" gets a new
    write-with-atlas topic). Placed: documents (check with AI, dockable
    suggestions, dictionary), templates (confirm), the Guide's per-surface
    controls reference, map (radial fit, relink layout, marquee lag), in
    agent briefs as slots free.
    **Templates (confirm) built 2026-09-24** (bf54953): a click chooses,
    Use this template, Enter or a double click makes it; sweep
    `templatepick.js`. 
    **The Guide's part built 2026-09-24** (guide-controls agent): a controls
    reference per surface and a hidden features entry, routed by what the
    question asks c05c684; 55 bank questions (177, top-1 99.4%, top-3 100%)
    1385b0e; a freshness test against every bound key a164dc2; the caps
    (a 422 after a long answer and on the fifth question, the reply cut
    mid-list) 5cb7f8f. Map part built (radial fit 13c41d7, relink b449623, marquee 18b8c15).
    **The documents' part built 2026-09-24** (the documents agent): Check
    with AI runs in place, streamed into the suggestions panel with Apply,
    Dismiss and Stop, a no-model notice with Settings, Models, and Discuss in
    chat with no long prompt (so no skill nudge, the INBOX 413 half)
    (cd5dec1, `aicheck.js`); the panel docks at the bottom or on the right,
    resizable, remembered, always bottom at 720px and below (a8c822a,
    `prosedock.js`); the dictionary as a settings sheet (bbeda8e,
    `dictsheet.js`); the Capture box's templates confirm too (26e8d9b,
    `notetemplatepick.js`). Nothing of 410 is open now; it stays for the
    orchestrator to resolve with 413.

## Placed (last 20, newest first)

- 2026-09-13: 128 placed in DOCUMENTS_PLAN.md.
- 2026-09-13: 162, 159 placed in WORLD_CLASS_PLAN.md.
- 2026-09-13: 165, 164 placed in UI_MODERNISATION_PLAN.md.
- 2026-09-08: dashboard hero preference, New note tile colours, sub-tab
  arrow keys, Files reading, sidebar toggle, mindmap bugs, line numbers,
  docks as one bar, timeline redesign, responsive design, em-dashes,
  paragraphs to popovers, security review: all placed (HANDOVER "flagged
  list") and most built.



