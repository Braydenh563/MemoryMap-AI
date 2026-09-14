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

241. **Mid-work drop, 2026-09-14, verbatim (the owner), Ask persistence.**
    "the grounding, intext numbered referencing, and sources that appeared
    in the ask subtab in notes, dissappeared on reload and didnt persist.
    they didnt persist when I reaccessed them through the history panel."
    Owner: notes agent.

240. **Mid-work drop, 2026-09-14, verbatim (the owner), Write with AI
    boxes.** "when I clicked on the 'your thoughts' text box in the write
    with ai notes subtab, the box instantly shortened in height from what
    it was. same with the 'the draft' textbox as well." Owner: notes agent.

239. **Mid-work drop, 2026-09-14, verbatim (the owner), the table full
    view.** "I opened up the table full view but there was no way to close
    it so I had to hard refresh the app." Owner: notes agent (documents).

238. **Mid-work drop, 2026-09-14, verbatim (the owner), board and map
    notes.** "when I expand the size of notes in the whiteboard and mindmap,
    the text goes out of the panel border, the state of note objects in the
    whiteboard and mindmap for if they are expanded or not should be
    persistant, and when exporting a whiteboard and/or mindmap, the user
    should be warned if any of their notes arent expanded and that not all
    their contents will be shown, the export shouldnt include things like
    the show less/more text as well." Owner: notes agent (whiteboard.js).

237. **Mid-work drop, 2026-09-14, verbatim (the owner), the librarian
    persona.** "the librarian persona hasnt been adjusted to be atlas acting
    as the librarian." The built-in persona card reads "Librarian, built-in,
    You are the librarian of the user's personal notebook." Target: the
    built-in is named Atlas with the one clause from 225, in both the
    backend's built-in list and `frontend/app.js`'s mirror of it. Owner:
    chrome2.

236. **Mid-work drop, 2026-09-14, verbatim (the owner), the chat empty
    state's '?'.** "the about this chat '?' tooltip button in the chat empty
    interface, and it shouldnt be there, its right in the middle of
    everything, move it somewhere else like in a corner or smth." Owner:
    chrome2.

235. **Mid-work drop, 2026-09-14, verbatim (the owner), Settings.** "I feel
    like the advanced response settings should be above the installed models
    tab, and/or in the preferences settings page with the advanced search."
    Decision: the group moves above Installed models on the Models page.
    And: "in the help settings page, there is no gap between the atlas
    section and the faq dropdowns." Owner: chrome2.

232. **Mid-work drop, 2026-09-14, verbatim (the owner), the live view.**
    "the md rendering on the live view, like in the documents page, needs to
    be improved, especially for codeblocks and potentially for other things
    as well." Screenshot: a fenced block renders as a dark slab with the
    fence lines as empty numbered rows above and below, link chips wrap
    oddly. Owner: notes agent (documents.js).

228. **Mid-work drop, 2026-09-14, verbatim (the owner), the close.** "after
    you have finished all these, done the final bug sweep, make sure
    everything is finished for the pr, and finish the pr, merging it into
    main." Owner: orchestrator, last.

226. **Mid-work drop, 2026-09-14 morning, verbatim (the owner), a flicker.**
    "theres a flickering just above the bottom bar??" / "i was on the
    dashboard". Reproduce first: sample the band above `#status-bar` on the
    dashboard at 100 ms for four seconds and count pixel changes; log DOM
    mutations in the same band. Suspects, in order: a widget re-rendering
    on a timer (the Rediscover widget re-asks when its list empties; the
    reminders and stats fetches were just shared by the boot agent), the
    scroll-top button toggling on a scroll-height change, the status bar's
    new Guide slot being redrawn by the header's model poll. Owner:
    orchestrator, now.
    **Not reproduced on the merged head, 2026-09-14** (`scratchpad/
    flicker2.js`, `flicker3.js`, 1440x900, dashboard, 60 frames at 60 to
    100 ms): with the art off, the only pixels changing in the 120px band
    above the status bar are none (the status bar's own AI spinner is the
    one moving thing on screen); with the art on and Movement: Still, zero
    frame changes and zero `startBgArt`/`stopBgArt` calls or canvas swaps
    in four seconds; with the art moving, every strip changes, which is the
    art. The ten inline-style writes seen on `.dash-widget` sections are the
    one-time span pass, not a loop. Left open for the owner: which theme,
    which background style, and whether the desktop window or a browser
    tab; a screenshot with the flicker in it names the element.

225. **Mid-work drop, 2026-09-14 morning, verbatim (the owner), a core
    persona.** "I was wondering if atlas or another named persona can be the
    core persona of the application as the librarian?? idk, the persona cant
    be too token heavy though, just as a theme yk??" **Decision:** Atlas is
    the name of the notebook's AI everywhere the app speaks as it (the
    status dot's label, "Atlas filed this under Work", the chat empty
    state, the popup agent's greeting, the help chat), as copy and one
    mark, not as prompt text: the model prompts gain at most one clause
    ("You are Atlas, this notebook's librarian.") under
    `agent.PROSE_BUDGET_CHARS`, and no persona prose, backstory or tone
    instructions anywhere. One constant (`AI_NAME`) in the frontend and one
    in `ai/` so a rename is one edit each; Settings, Models keeps the model's
    own name beside it ("Atlas, running qwen2.5:7b"). Owner: chrome after
    214 and 215; the backend clause and constant, backend2 after its list.
    **Backend half fixed e024e49 (backend2), merged:** `AI_NAME` in
    `ai/__init__.py`, one clause in the prompts that speak as the app,
    tested under the prose budget; the help chat's `GUIDE_NAME` is that
    constant. Frontend half: chrome.
    **Decision, 2026-09-14 (the owner asked how to tell the two apart):**
    one name, two hats, said by the surface and by one clause. The
    librarian (chat, filing, the agent) is "Atlas" with the clause "You are
    Atlas, this notebook's librarian."; the help sheet is "Atlas, about the
    app" in its head and its clause is "You are Atlas, answering about the
    app itself, never from the notes." Nothing else differs: same mark,
    same voice, no persona prose in either.
    **Frontend, 2026-09-14:** `AI_NAME` in settings.js with `GUIDE_NAME`
    reading it; the help sheet, its popover lines, the palette command and
    the empty states say Atlas (chrome, 224). Left for the next PR: the
    copy sweep where the app speaks as the librarian ("Atlas filed this
    under Work", the chat empty state, Settings, Models "Atlas, running
    <model>"), one grep for "the AI" in app.js.

220. **Mid-work drop, 2026-09-14 morning, verbatim (the owner), the docs
    and how to proceed.** "make sure all the other docs like architecture.md
    are up to date, and extend the roadmap and backlog. make it clear to me
    how to proceed with development for after this pr... help me get my
    head around everything." Also: "clean out unneeded documents or files.
    refine the repo." And: "clean up the agent remaining-files as well if
    they are outdated or not needed anymore... same with the plans... are
    there any other plans or parts of plans that havent been done yet?? is
    all the ui modernised and consistent??" ARCHITECTURE.md checked against
    the code; `agent-remaining/` reduced to the files with open work (the
    rest to HISTORY); finished plans marked superseded in ROADMAP's table;
    ROADMAP and BACKLOG extended; a "How to proceed after PR 144" section
    in HANDOVER naming every open plan section. Owner: orchestrator, last.
    **Progress, 2026-09-14:** `agent-remaining/` consolidated (38 files to
    `archive/agent-remaining/`, 134 open bullets in `OPEN.md`, 70
    references repointed, merged `878f78d`); ARCHITECTURE's directory map
    rewritten against the tree (`4bae0a0`); BACKLOG 115 and
    WORLD_CLASS_PLAN 18 written. Left: the ROADMAP rewrite and the
    HANDOVER "how to proceed" block, after the four agents merge.

213. **Mid-work drop, 2026-09-14 morning, verbatim (the owner), the last
    scan.** "finish all the agents, scan for bugs and high complexity one
    last time, and let me know when the pr is ready to merge / make sure to
    merge all of the agent branches into this one as the agents finish."
    And: "once absolutely everything is done and the roadmap documents are
    cleaned etc, all the agent branches are merged into this one etc, merge
    this pr for me." Owner: orchestrator; the merge is the last act.

## Placed (last 20, newest first)

- 2026-09-13: 128 placed in DOCUMENTS_PLAN.md.
- 2026-09-13: 162, 159 placed in WORLD_CLASS_PLAN.md.
- 2026-09-13: 165, 164 placed in UI_MODERNISATION_PLAN.md.
- 2026-09-08: dashboard hero preference, New note tile colours, sub-tab
  arrow keys, Files reading, sidebar toggle, mindmap bugs, line numbers,
  docks as one bar, timeline redesign, responsive design, em-dashes,
  paragraphs to popovers, security review: all placed (HANDOVER "flagged
  list") and most built.

246. **Mid-work drop, 2026-09-14, verbatim (the owner).** "I also want to
    be able to attach whiteboards and mindmaps to notes. and I want it to
    show in notes if they are attached to or referenced in/by a document,
    note, whiteboard, or mindmap." Recommendation: the note edit form's
    attach menu gains Board and Mind map (the same reference the board
    already stores when it embeds a note, written from the note's side),
    and the note card gets a "Referenced by" row listing documents, notes,
    boards and maps that carry it, from one backlinks endpoint.
