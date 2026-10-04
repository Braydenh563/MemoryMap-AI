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

469. **The owner, 2026-10-03 night, verbatim.** "for the companion is it
     possible to have the arms and legs be used a bit for various position,
     action etc changes and transitions??" Placed: with 455 (2) and 462, the
     companion agent.

466. **The owner, 2026-10-03 night, verbatim, with screenshots (Manage
     categories: a count pill on every row; the expanded companion with its
     resize ring at the top right).** "I think there should also be a clear
     button on the note capture tab and in other main text areas where the
     user might want to quick clear their work... also it is wierd with all
     these numbers floating int he manage categories popup. also the
     companion resize circle appears still on the expanded companion popup
     panel". Placed: (1) Clear on Capture, Quick note, Ask, Chat's composer
     and the popup agent's box, with Undo; (2) the counts as quiet text
     beside the name, not pills; (3) the resize ring hidden in the enlarged
     viewer: the orchestrator.

464. **The owner, 2026-10-03 night, verbatim, with a screenshot (the
     whiteboard's active Library button: its icon faint on the accent
     fill).** "there is still some colour contrast issues. do another round
     of improve and redesign the ui/ux for the application." (with the eight
     design skills named). **The icon fixed**: a pressed or active
     quiet button's leading icon takes its label's colour (white on the
     accent in light, near-black in dark; it stayed accent on accent). Then a contrast sweep that
     also reads icons and SVG strokes (contrast.js reads text), and another
     skills-guided UI round by surface: agents.

463. **The owner, 2026-10-03 night, verbatim, with a screenshot (the
     whiteboard's Library panel: note rows "The Complete Social Skills Guide
     This g...").** "there is no hover state for the library whiteboard panel
     items, also I think the user should be able to customise the
     assistant/ai chat message bubbles across all chat interfaces to be
     either atlas or the animated app logo". **(1) fixed**: rows lift under the
     pointer (both themes), two lines cut at a word by the stylesheet (were
     40 characters cut mid-word), never squeezed by the list. (2) an
     Appearance choice "Assistant avatar: Atlas or the app's emblem", read
     by every bubble (Chat, popup agent, Ask, Atlas help): with the bubble
     agent's follow-up.

462. **The owner, 2026-10-03 night, verbatim.** "also the companion perches
     dont handle collapsed sidebars at least in the chat tab". Placed: with
     455 (2), the companion agent.

460. **The owner, 2026-10-03 night, verbatim.** "I keep experiencing scroll
     jump when scrolling with two fingers on my trackpad?? idk". Placed: the
     orchestrator (reproduce with synthetic wheel streams; suspects: a
     scroll listener that writes scrollTop, scroll snapping, smooth
     scroll-behaviour on a wheel-driven scroller, anchoring).
     **Measured 2026-10-03, not reproduced**: 300 seeded notes, 250 wheel
     steps of 40px down and 250 up in headless Chromium (`.tab-main`
     scroller): no step moved more than 6px off its delta; 4 steps moved 0
     where the list paused to load its next page. Suspects left: the
     Notes rows' `content-visibility: auto` with a 132px guess (rows now
     70 to 160px) meeting a precision trackpad's momentum, which headless
     does not emulate, and the windowed list's page load at the end. Next:
     the owner's tab and window size, then a real-device trace.

459. **The owner, 2026-10-03 night, verbatim, with a screenshot (Settings,
     Personas: the jump strip "Answer style, Dashboard greeting, Add your
     own, Share").** "some of the horizontal navigation bars at the top of
     the settings pages skip multiple sections as they are too close, like
     in the personas, it only goes on the first or last one. also can you
     add some cheap css animations to things like the horizontal pill
     selectors and sidebars etc like using anchor for smooth tab
     transitions etc?? stuff like that to make it feel truly professional
     and smooth but dont over do it in a vibecoded way. did you use all the
     ui/ux and devibecoding skills??" Placed: (1) the jump strip marks the
     section clicked and, scrolling, the last one whose head passed the
     line (or the one at the end when the page can scroll no further): **fixed**,
     the clicked head stays marked until a wheel, touch or key scroll
     (Personas at 1280x560: each of the four marks itself; it was the first
     or last); (2) a restrained motion pass (the selected pill and tab
     indicator slide between options, sidebars ease, reduced motion
     honoured, every duration and curve a token, no new decoration): an
     Opus agent, with the named skills as checklists.

455. **The owner, 2026-10-03 night, verbatim, with screenshots (a note's
     details line: category, 85%, eight hashtags, the date alone on a line
     under them; four notes whose dates sit at different heights).** "note
     metadata wraps now and needs a better redesign and structure. also I
     think the note date should be consistent in where it is on the notes.
     also I want more and better transitions between positions and moving
     across different and the same tab(s) for the companion". Placed: (1)
     the details line redesigned (a fixed structure that never wraps into a
     ragged second line, tags that collapse to "+N", the date in one place
     on every card): an Opus agent when a slot frees; (2) companion
     transitions between perches and across tabs: an Opus agent after (1).
     (1) built 2026-10-03 (DESIGN.md's note details line recipe, the
     decision in UI_MODERNISATION_PLAN); (2) open.

453. **The owner, 2026-10-03 night, verbatim.** "Also I think there should
     be a way to open and close the documents editor sidebar when in full
     screen mode". Then: "keep bug fixing and finishing all open requests and
     items". And: "can you improve, extend, expand, optimise, and add to the
     mindmap, whiteboard, or documents editor at all?? what is most lacking
     in the app rn?? what is left and still open??" Placed: the sidebar
     toggle in focus mode, the orchestrator; the question answered from the
     plans' open phases, with agents on the top items.

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
     **Progress 2026-10-03 (capture agent):** the audit is
     `scratchpad/ui-sweeps/captureaudit.js` (every path: keys, ms to the
     list, ms to filed, server down mid-save, reload). Fixed, each measured
     before and after: an image pasted into Capture and a file dropped on it
     vanished (0 cards; now 1 and 2); a save with the server down said
     "Failed to fetch" and was never sent (now held on this device by the
     outbox in quick-note.js, synced 144 ms after the server answers, saved
     once by `client_key`); Quick note (Alt+N, palette) saves from any tab
     without leaving it (caret 26 to 61 ms, in the list 145 to 266 ms; the
     Drafts and Tana quick-capture shape); `#word` tags a note (was []);
     the draft keeps its title and tags through a reload (both were lost);
     the palette's New note began every note with a blank line; the graph's
     new note and the dashboard widget waited on filing. A pasted link
     offers the page as a note when the web is allowed (the clipper had no
     door). Decided against: "/" for a category in the box, since "/" is
     the blocks menu there. Open: deferred filing takes 1.2 to 2.5 s on this
     sandbox with no chat model (the embedding pass, server side; the note
     is in the list long before); staged pictures and files cannot be held offline (the
     words stay in the box, saying so); the desktop window, real
     clipboards and a real server crash between commit and answer are not
     verified (the dedupe map is in memory).

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

## Placed (last 20, newest first)

- 2026-09-13: 128 placed in DOCUMENTS_PLAN.md.
- 2026-09-13: 162, 159 placed in WORLD_CLASS_PLAN.md.
- 2026-09-13: 165, 164 placed in UI_MODERNISATION_PLAN.md.
- 2026-09-08: dashboard hero preference, New note tile colours, sub-tab
  arrow keys, Files reading, sidebar toggle, mindmap bugs, line numbers,
  docks as one bar, timeline redesign, responsive design, em-dashes,
  paragraphs to popovers, security review: all placed (HANDOVER "flagged
  list") and most built.



