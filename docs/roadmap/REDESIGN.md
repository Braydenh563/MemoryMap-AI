# The redesign: making this feel like an application

> *"the app is really glitchy, it feels fake and unprofessional but I cant
> place it… it still feels like a beta and not an actual professionally
> designed and usable application. it feels like it will break any second…
> a lot of the ui elements arent adaptive either, they feel very rudimentary
> and just chucked together with no thought for actual responsive design."*
>
> *"I feel like I cant even use my application as a user and that it is just a
> cool app that has features, but what use are they if the features are hard
> or annoying to use, or if half the screen is taken up by poor ui choices or
> structuring."*

This file is the plan that came out of taking that seriously. It is the
fifth roadmap file — see [ROADMAP.md](../ROADMAP.md),
[BACKLOG.md](BACKLOG.md), [ANALYSIS.md](ANALYSIS.md),
[HISTORY.md](HISTORY.md), [HANDOVER.md](HANDOVER.md).

**Everything in §R1 was measured in a running Chromium against a real
server, not reasoned about.** That matters because the complaint is
*"I can't place it"* — a feeling with no named cause is exactly the thing
that gets answered with a plausible guess and a cosmetic fix. Numbers name
the cause.

---

## R1. What is actually wrong, measured

Seeded with ten notes, a 1440×900 viewport, default theme, fresh profile.

### R1.1 The app is laid out as a web page, not as an application

| What | Measured | What it should be |
| --- | ---: | --- |
| Notes visible in a 900px viewport | **5** | 15–20 |
| Note card height for two lines of text | **121px** | ~44–64px |
| Note card width | **1037px** | 60–75 characters (~640px) |
| Categories sidebar | 260 × 755px holding **three rows** (~110px used) | either dense and useful, or narrower |
| `#entry-list` height inside a 755px `main` | **1248px** | the pane scrolls, not the page |
| Library chrome above the first item | **344px** across four stacked control rows | one row |
| Side gutter at 1024 / 1440 / 1920 | **32px at all three** — a step function, not a response | continuous |
| Category sidebar at 820px wide | **260px, unchanged from 1920** — 32% of the window | proportional |

The last two are the structural ones and everything else follows from them.

**Panes do scroll — that part of the shell is already right.** Measured
after the first draft of this file said otherwise, and the correction is
worth keeping: `document.documentElement` never overflows, and the scroller
is `MAIN` on Notes and `.tab-page` on Timeline and the Dashboard. What is
missing from the shell is not scrolling but *structure* — per-pane history,
more than one pane at a time, and a left rail (§R3.1) — so the work in §R6
item 6 stands, with one less thing to fix.

**Chrome stacks instead of collapsing.** The Library screen draws, top to
bottom: the app tab bar, the Library sub-tab bar, a title row with two
buttons, a row of six stat pills, a row with search + two toggles + a
four-way sort + a view switcher + a filter select, and *then* a row of nine
filter chips. Every one of those is a defensible feature. Together they are
340px — over a third of the viewport — before the first thing the user came
to look at. This is the literal referent of *"half the screen is taken up by
poor ui choices or structuring."*

**Navigation is duplicated three times on one screen.** The Dashboard shows
the top tab bar, a "START SOMETHING" row of five action cards, and a "JUMP
TO" row of eight chips that name *the same seven tabs as the tab bar*. Three
ways to reach the same places, none of them the obvious one.

### R1.2 Files were a dead end, not just ugly

Reported as *"the integration of pdfs and other files is completely broken
and unusable"* and then, more precisely: *"once I uploaded two files into a
note, they became hyperlinked text, I clicked on them, and it took me to a
black fode screen with some text about needing to unlock first… there was no
way for me to go back except for closing the application entirely."*

Reproduced exactly. Three separate defects wearing one complaint:

1. **Two parallel file systems that do not know about each other.**
   `MediaUpload` (`POST /media/upload`) returns a URL that
   `handleFileUpload` pastes into the note as raw markdown — no record on
   the note, no card, no remove. `Attachment` (`POST /entries/{id}/files`)
   creates a real row that renders as a card with a delete button — but it
   needs a note id, so it is unreachable from the composer, which is where
   people attach things.
2. **The link navigated out of the app.** `renderInlineMarkdown` emitted
   `<a href="/media/x.pdf">`. A plain navigation carries no `X-Auth-Token`
   header, so the browser left the SPA, received the unlock guard's 401 JSON
   body, and rendered it with its own JSON viewer — the "black screen with
   the pretty print toggle." The desktop shell has no back button, so the
   only exit was quitting the app.
3. **The file then appeared nowhere.** The Library's gallery rendered
   *every* upload as `<img src="/media/…">`. A PDF failed to decode, the
   `error` handler fired, and **the tile removed itself** — silently, with
   no message, from the only screen that lists uploads. The file was on disk
   and in the database the whole time.

**Fixed and verified live** (commit "Files stop being a dead end…"): file
cards with icon/name/type/Save that open the in-app document viewer, a
matching strip in the composer rendered from the note's own markdown, real
tiles for non-images, and the sub-tab renamed to "Files & Images". Zero
`/media/` anchors remain in a rendered note.

**The important lesson for whoever picks this up:** the viewer already
existed. `openLightbox` already sniffs a non-image `/media/…` URL and hands
it to a document reader that renders PDFs, Office files, code and plain text
through `/media/text`, with find-in-document. It was reachable from the
Library and from the Documents list and *from nowhere in a note*. The bug
was a missing wire, not a missing feature — which is this project's most
common shape and the reason CLAUDE.md opens with "check the running app
first."

### R1.3 Saving a note made you wait for the AI

> *"the making of new notes was slow and annoying, I feel like the note
> panels should disappear while filing and continuing in the backend with a
> popup notification so I dont have to wait twiddling my thumbs for it to
> file."*

`POST /entries` ran `janitor.categorise` inline — a local-model round trip —
with the composer disabled behind "Filing…". Two more slow things were in
the same request: embedding the note, and a full semantic search run only to
*maybe* show an advisory "this is similar to…" toast.

**Fixed and verified: 971ms → 32ms** on the save round trip, measured in this
sandbox with no model running at all. On a machine actually running a small
local model the old path was seconds. The note now shows a "Filing…" chip
until the background pass lands, then a notification says where it went.

### R1.4 Spaces leaked

> *"I made a new separate space for a uni class, and the pictures and images
> I had from the main area of all spaces were showing in my image gallery??"*

Reproduced in one request pair: a file uploaded with `X-Workspace-ID: uni`
was returned by `GET /media` under `X-Workspace-ID: default`. Cause:
`MediaUpload`, `Reminder`, `Attachment`, `WhiteboardNode`,
`WhiteboardSketch` and `WhiteboardObject` never carried `WorkspaceMixin`, so
the scoping hooks in `core/database.py` skipped them entirely. Notes were
correctly scoped the whole time, which is why this looked like a gallery bug
rather than a data-model one.

**Fixed and verified.** The backfill inherits each child row's space from
its parent note rather than defaulting it — defaulting an attachment would
have filtered it out of *its own note*, which reads as data loss.

### R1.5 The graph is the wrong tool for what it is being asked to do

> *"I wanted to use it as a mindmap where I make a node which is like a core
> idea, with other sub ideas that branch off with notes attached to them."*
> *"the way connections are made feels more annoying and manual."*

This is not a polish problem. The graph view is a **derived** view: nodes
are notes, edges are links the AI proposed or the user confirmed, and the
layout is a d3 force simulation that decides where things go. What is being
asked for is an **authored** view: the user places a core idea, branches
sub-ideas off it, drags them where they want them, and the positions *stay*.

Those are different data models with opposite ownership of position and
structure, and trying to serve both from one screen is why it "misses the
mark". The derived graph is genuinely good at what it is for — *"the other
graph views are decent visually"* — and should keep being that. The mindmap
is a new thing. See §R4.

### R1.6 Uploads that are not images or PDFs are refused outright

`MEDIA_SUFFIXES` accepts nine image types and `.pdf`. `handleFileUpload`
offers the server everything matching `application/*`, `text/*`, `video/*`
and `audio/*`. So dropping a `.docx`, a `.txt` or a code file into the
composer produces a 415 and a red toast, while the *same file* attaches
fine to an already-saved note through `ATTACHMENT_SUFFIXES`, which allows
about sixty types.

The allowlist is not paranoia — `/media/{name}` serves inline from the app's
own origin, so an `.html` or `.svg` landing there is stored XSS, and the AI
can write into that folder too. The fix is not to widen it. See §R3.2.

---

## R2. The diagnosis

Every symptom above is one of three underlying causes. Naming them is the
point of this section, because *"it feels like it will break any second"* is
a real signal and it has real referents.

**C1 — There is no application shell.** The app is a page with a header and
a footer. Panes cannot scroll independently, nothing can be pinned, and
every screen re-solves layout for itself. This causes R1.1 entirely, and
makes every future screen cost more than it should.

**C2 — Features were added beside each other rather than into each other.**
Two file systems (R1.2), two "where do my uploads live" answers, three
navigations to the same seven tabs, a Library that grew a control row per
capability. Nothing was wrong when it was added; nothing was ever merged
afterwards. This is what "chucked together" is describing, and it is
accurate.

**C3 — The interface reports the machine's state instead of getting out of
the way.** "Filing…" with a disabled form (R1.3) is the app telling you
about its own internals while you wait. A confidence percentage on every
card is the same instinct. The fix is not to hide the information — it is to
stop making the user wait for it.

---

## R3. The target shape

The reference the user named is **Kortex**, alongside Obsidian, and the
screenshots supplied show a shape worth copying deliberately. *(Studied from
the supplied screenshots. The linked Vimeo walkthrough was not watched — I
cannot play video — so anything below that is not visible in a still is
marked as an inference.)*

### R3.1 The shell

```
┌───────────────┬──────────────────────────────┬─────────────────────┐
│ Search   ⌘K   │  ← →  Library / Sources / …  │ ← →  New Chat   ✕   │
│ Chat          │                              │                     │
│ Library       │  ┌────────────────────────┐  │  (chat, or a second │
│ Shared        │  │  the thing itself,     │  │   document, or the  │
│               │  │  one narrow column     │  │   connections pane) │
│ FAVORITES     │  │                        │  │                     │
│  ▸ …          │  └────────────────────────┘  │                     │
│ DOCUMENTS     │                              │                     │
│  ▾ Books      │                              │                     │
│    ▸ Purpose  │                              │                     │
└───────────────┴──────────────────────────────┴─────────────────────┘
```

What each part earns:

- **A left rail instead of a top tab bar.** Kortex has no top tabs at all.
  Destinations are a short list at the top of the rail; everything below is
  *the user's own content* as a tree. MemoryMap's seven top tabs plus seven
  Library sub-tabs plus four Notes sub-tabs is three levels of tab bar for
  what is one hierarchy.
- **Per-pane back/forward and breadcrumbs.** Each pane owns its own history
  (`← → Newsletters / … / February 2025 / Dead Internet Theory`). MemoryMap
  has one global nav-history popup for the whole app — which is why it has
  been reported and re-reported: it is trying to be per-pane history in a
  single-pane app.
- **Independently scrolling panes.** The direct fix for C1.
- **A narrow measure for prose.** Kortex's document column is roughly 700px
  in a 1460px window. MemoryMap's note cards are 1037px wide.
- **Dark, low-chroma chrome; content is the only bright thing.** MemoryMap's
  default light theme paints a lilac gradient across the whole background
  behind translucent cards. It is pretty in a screenshot and it is why
  nothing reads as foreground.

### R3.2 Documents, files and "elements"

> *"look at how the odysseus documents feature works, you can import, edit
> and create multiple file types, there are options for code lines, viewing
> html and other code, rendering pdfs, exporting, allowing the ai to read
> the documents, able to highlight text and say something in the chat and
> the agent gets the context of what is highlighted and cursor position."*
>
> *"I really like kortex's use of backlinking and elements for structured
> documents as well."*

Both references point at the same thing from different sides: **a document
should be made of typed, addressable blocks, not one flat string.**

Kortex's screenshots show collapsible typed blocks inside a document —
`Connections`, `Research`, `Brain Dump`, `Batch`, `Post`, `Subdocuments`,
`Tags`, `Captures` — nestable, each with an icon and a disclosure triangle,
created from a `/new` palette (`New Group`, `New Element`, `New Source`,
`New Author`). Backlinks appear as a `Connections` block listing linked
documents with direction arrows (↗ outgoing, ↙ incoming).

Odysseus's `static/js/document.js` (11,200 lines, AGPL — and this project is
AGPL-3.0 now, so it **may** come in with its notices; see
[ANALYSIS.md](ANALYSIS.md)) has the other half: multi-document tabs,
per-language syntax highlighting with auto-detection, inline HTML preview,
diff mode with per-chunk accept/reject, Google-Docs-style inline suggestion
bubbles, and — the one the user called out — `getSelectionContext()`, which
hands the chat what is highlighted, re-anchoring or dropping stale
selections first so the model never sees text from a region the user is not
looking at.

Three more patterns are visible in the later screenshots and are worth
naming, because each is a small, self-contained "feels capable" win:

- **A selection toolbar.** Selecting text raises a small floating bar —
  bold, italic, underline, strike, link, highlight, alignment, `Aa`,
  overflow. MemoryMap has *no formatting toolbar at all*, and the
  `==highlight==` syntax added recently has no button. HANDOVER.md already
  identifies this as where it belongs (BACKLOG §109.4).
- **`+ Add context` above the composer, and `@` to mention.** The chat
  composer names what it is about to read *before* you send, as removable
  chips. MemoryMap's chat decides its own context and tells you afterwards.
- **A chats list as a pane, not a screen.** The right pane can hold the list
  of past chats with a one-line preview of the last reply and a turn count,
  and switch to one in place.

**What to build here, in order:**

1. **Selection → chat context.** The single highest ratio of "feels
   capable" to work. Port the shape of `getSelectionContext` (validate the
   offsets before shipping them; a stale selection is worse than none).
2. **A `Connections` block on every note and document**, listing incoming
   and outgoing links with direction. The link data already exists
   (`EntryLink`, `DocumentLink`); nothing surfaces it as a first-class part
   of the document.
3. **Typed blocks**, introduced additively: a fenced marker in the markdown
   that renders as a collapsible titled block, so nothing about storage or
   export changes and an old note is unaffected.
4. **One file model.** Non-image uploads from the composer should become
   real `Attachment` rows on save rather than markdown links to `/media`,
   which also settles R1.6 without widening the inline-served allowlist:
   attachments are served `Content-Disposition: attachment` and already
   allow ~60 types. Images keep the inline path — an image in the middle of
   a paragraph is *content*, not an attachment.

### R3.3 The whiteboard

Directly asked: **fullscreen**. The graph already has
`#graph-fullscreen`/`#graph-fullscreen-close`; the whiteboard has nothing,
and it is the surface that most needs the room. Same treatment, same
tokens.

---

## R4. Concept maps: the authored map, separate from the derived graph

> *"I want ways to make custom knowledge graphs that are like mindmaps where
> I can add and remove nodes, move them around, change how they connect and
> reasons, and just make my own thought process map."*
> *"maybe with a way to export that into a visual diagram on the whiteboard
> but that can be for later as an extension, note it down."*

**Design decision: a new object, not a mode on the existing graph.** §R1.5
gives the reason — the two disagree about who owns position and structure.
Merging them means every interaction has to ask "is this node mine or the
simulation's?", which is exactly the ambiguity that makes the current graph
annoying to use.

**Data model.** Two tables, both `WorkspaceMixin`:

- `ConceptNode` — `map_id`, `label`, `note_id` (nullable: a node may be a
  bare idea with no note behind it yet), `x`, `y`, `colour`, `collapsed`,
  `parent_id` (nullable; a mindmap is a tree, but a tree that is allowed to
  have cross-links).
- `ConceptEdge` — `map_id`, `from_id`, `to_id`, `label`, `kind`. The
  `label` is the *"reasons"* the user asked for, typed by hand, never
  inferred.

The map itself is an `Entry` with a kind flag, the same trick the whiteboard
already uses for boards (`board_id` → `entries.id`) — so a map gets naming,
search, spaces, the recycle bin and the timeline for free.

**Interaction, in priority order.** These are the ones that decide whether
it is usable:

1. Double-click empty canvas → new node, immediately in edit mode.
2. `Tab` on a selected node → new child, positioned and linked.
3. `Enter` → new sibling. (Tab/Enter is the whole reason a mindmap is
   faster than a diagram tool; without it this is just a slower whiteboard.)
4. Drag from a node's edge handle to another node → an edge, with an inline
   label field.
5. Drag a node → it stays there. No simulation, ever.
6. Drop a note onto a node → attach it.

**Export to whiteboard: noted, deliberately later.** The whiteboard already
has objects with position, size, rotation and grouping, so the export is a
translation pass rather than new surface. It is listed here so it is not
forgotten, and left out of the first version because a map that is unpleasant
to author is not made better by being exportable.

---

## R5. The agent harness

> *"I think the way skills are is very tight and a lot of things go wrong.
> the agent harness needs major improvement… there needs to be some weight
> lifting of the application to help the agent use tool calling."*

The framing the user's own coursework uses is the right one: *a harness is
the software that turns an LLM into an agent — it runs tools, enforces
permissions, decides when to stop, manages context, and provides the
interface.* Every one of those is the application's job, not the model's,
and that is the lever with a small local model: **do not ask a 4B model to
be careful; make it structurally hard for it to be wrong.**

Concretely, in the order they pay off:

1. **Fewer tools in front of the model at once.** Tool-choice accuracy falls
   off a cliff as the schema list grows, and small models fall off it first.
   Route to a small tool subset per turn rather than presenting the whole
   catalogue.
2. **Narrow names and descriptions.** A description says *when to use this*,
   not what it does. This is free and it is the single most effective change.
3. **Validate arguments in code and hand the error back.** A rejected call
   with a specific message ("`limit` must be an integer, got `'ten'`") is a
   turn the model can recover from; a swallowed exception is a dead end.
4. **Bound tool results.** A tool that returns 8k tokens of note text has
   spent the context the model needed to *use* it.
5. **Treat retrieved content as data, never as instruction.** Notes, web
   pages and file text are untrusted by construction — the user writes them,
   but so does anything they paste. The security lecture's framing is right:
   guardrails are defence in depth, and the enforcement has to be in code.

**Not yet audited against the running code.** `ai/agent.py`,
`ai/skill_runner.py`, `ai/skills.py` and `ai/tools/` have not been read
against this list at the time of writing. Whoever does it first should say
which of the five are already handled — this project's history says it will
be more than expected.

---

## R5b. Local, offline, private — audited

> *"make sure the app is completely local, offline and private for the
> user."*

Audited and **verified empirically**, not asserted:

- **Zero external requests.** A full tour of all seven tabs in Chromium,
  logging every request the page made, produced **0** to any host other than
  `127.0.0.1:8781`.
- **The browser cannot reach one.** The served CSP is
  `default-src 'self'; connect-src 'self'; object-src 'none';
  frame-ancestors 'none'` with a script hash — no CDN, d3 and p5 vendored.
  Even injected markup has nowhere to send anything.
- **Three outbound hosts exist in the whole backend, all opt-in and all
  defaulting to off:** `html.duckduckgo.com` (web search,
  `web_search_enabled` → `False`), `github.com` / `api.github.com` (update
  check, `update_check_enabled` → `False`), and `searxng`, which is a
  container on the user's own machine.
- The frontend contains no outbound fetch at all; the `ollama.com` string is
  a link in help text.

**What was not audited:** whether Ollama or LM Studio, once running, phone
home on their own. That is outside this codebase and outside what it can
promise — worth stating in the app's own privacy copy rather than implied.

---

## R6. Sequencing

Ordered by *"how much does this change the feeling of using the app per unit
of work"*, which is what was actually asked for.

| # | Work | State |
| --- | --- | --- |
| 1 | Files stop dead-ending; cards everywhere; non-image gallery tiles | **done, verified live** |
| 2 | Non-blocking filing (971ms → 32ms) | **done, verified live** |
| 3 | Cross-space leak for files, reminders, whiteboards | **done, verified live** |
| 4 | Whiteboard fullscreen | small, next |
| 5 | Density pass: note rows, fluid gutter and sidebar, one less Library row | **done, verified live — 5 notes visible → 12** |
| 6 | The shell: left rail, per-pane history, independent scroll | the structural fix (C1); large |
| 7 | Concept maps (§R4) | new feature; large |
| 8 | Selection → chat context, `Connections` block, typed blocks (§R3.2) | "feels capable"; medium each |
| 9 | Agent harness audit against §R5 | unknown until audited |
| 10 | Export a concept map to the whiteboard | deliberately last |

**A note on how to work through this.** Items 5 and 6 are the ones that will
be tempting to do cosmetically — a smaller padding here, a tighter font
there. That is how this got to 21,750 lines of CSS across eight files. The
measurements in §R1.1 are the acceptance criteria: if a change does not move
"notes visible in a 900px viewport" or "pixels of chrome before the first
item", it is not the change.

---

## R7. What is still open, ranked — start here next session

Written at the end of the session that produced §R1–§R6, at the user's
request: *"outline and scope out everything not possible in this session as
the top priority for next sessions."* Every item below was **asked for
directly** and is quoted, so nothing has to be re-derived from a
paraphrase. Ranked by how much it changes the feeling of using the app per
unit of work — the same test §R6 uses.

### R7.1 The document/file editor — the largest single gap

> *"the documents editor feels really rudimentary, unrefined, contained,
> small, and annoying to use and make sense of."*
> *"all the files should be managable, viewable and editable in the library
> and document/file/text editor."*
> *"look at how the odysseus documents feature works, you can import, edit
> and create multiple file types, there are options for code lines, viewing
> html and other code, rendering pdfs, exporting, allowing the ai to read
> the documents, able to highlight text and say something in the chat and
> the agent gets the context of what is highlighted and cursor position."*

**What exists here now:** a markdown editor with a title, outline, word
count and AI actions, plus a read-only viewer (`openLightbox`'s document
mode → `/media/text` → `core/docview.py`) that renders PDFs, Office files,
code and plain text with find-in-document. This session wired notes' own
files into that viewer; nothing else changed.

**What is missing, in build order:**

1. **Selection → chat context.** The highest ratio of "feels capable" to
   work in the whole list. Odysseus's `getSelectionContext()`
   (`static/js/document.js`, AGPL — this project is AGPL-3.0 so it may come
   in with notices; see [ANALYSIS.md](ANALYSIS.md)) is the shape to port,
   including the part that matters: it **re-validates offsets before
   shipping them**, so the model never receives text from a region the user
   is no longer looking at. Add cursor position alongside.
2. **Editing a file, not only viewing it.** Text and code files can be
   edited in place; a PDF or .docx cannot, and the honest reason is worth
   putting in the UI rather than leaving as a dead end — the viewer returns
   *extracted text*, which has already stopped being a .docx.
3. **Syntax highlighting with language auto-detection**, per odysseus's
   `HLJS_TO_DROPDOWN` map.
4. **An HTML preview pane.** Must be an iframe, which needs
   `frame-src 'self' blob:` added to the CSP in `core/security.py` — it is
   absent today so a blob iframe is blocked with no visible error.
5. **Export.** Per-format, from the same place the file is viewed.
6. **A file opens in the editor from the Library**, not only in a lightbox.

### R7.2 Stage every file until the thing it belongs to is committed

> *"ALL FILES, need to be rendered, manageable, files should only be
> instantly uploaded if directly through the library and there needs to be a
> file uplaod button. files should only be staged and not permanently saved
> while uploaded to a note that hasnt been saved yet, or chat messages that
> havent been sent yet etc."*

**Done this session:** non-image files dropped in the note composer stage
and become real `Attachment`s on save. **Still immediate, and should not
be:**

- **Images in the note composer.** They still `POST /media/upload` on drop,
  so abandoning a draft leaves an orphan on disk. Harder than the non-image
  case because an image is *inline content* — its markdown needs a URL at
  the point it was dropped. Suggested shape: insert a placeholder keyed to a
  staged `File`, render it from an object URL, and rewrite the markdown to
  the real URL after the upload that Save triggers.
- **Chat attachments** (`attachImageFiles`) — same treatment, keyed to the
  unsent message.
- **The Library's own upload button** is the one place instant upload is
  correct. It exists (Files & Images → Upload); confirm it is the *only*
  such path once the two above are staged.

### R7.3 Cross-linking everything

> *"all the features in the entire application need to be closely integrated
> and work with eahc other, I should be able to seamelessly utilise, flick,
> link, manage, create and search between multiple features in each primary
> feature."*
> *"I really like kortex's use of backlinking and elements for structured
> documents as well."*

1. **A `Connections` block on every note and document**, listing incoming
   and outgoing links with direction (↗ out, ↙ in). The data already exists
   (`EntryLink`, `DocumentLink`); nothing surfaces it as part of the thing.
2. **One universal picker** — `@` in any composer, resolving notes,
   documents, files and maps alike, replacing the several kind-specific
   pickers.
3. **Typed, collapsible blocks** inside a document (Kortex's "elements"),
   introduced as a fenced marker in the markdown so storage and export do
   not change and old notes are unaffected.

### R7.4 The agent harness

> *"I think the way skills are is very tight and a lot of things go wrong.
> the agent harness needs major improvement… there needs to be some weight
> lifiting of the application to help thbe agent use tool calling."*

§R5 lists the five changes and their order. **None has been audited against
the running code** — `ai/agent.py`, `ai/skill_runner.py`, `ai/skills.py` and
`ai/tools/` have not been read against that list. Do that first and say
which are already handled; this project's history says it will be more than
expected.

### R7.5 The rest of the UI, surface by surface

> *"ALL THE UI NEEDS IMPROVEMENT, INCLUDING THE SETTINGS AND WHITEBOARD AND
> EVERYTHING ELSE."*
> *"fix and reimagine/refine the ui control elements and panels on the
> witeboard as well."*
> *"a lot of ui elements arent where they should be from a learnability and
> ux point of view. it doesnt feel intuitive."*

The method is set: measure first, then change, then re-measure. The numbers
that matter are in §R1.1 and in [DESIGN.md](../DESIGN.md)'s new
principles section. Per surface:

- **The shell (§R6 item 6)** is still the big one, and its acceptance
  criterion is the alignment count in DESIGN.md: **37 distinct left edges on
  the Dashboard, 35 on Graph, 32 on Notes**, against the two-to-four a
  composed layout has. A change that does not reduce that count is not the
  change.
- **The whiteboard's panels.** Five floating draggable panels with mixed
  control sizes, unlabelled icon buttons and a raw colour input. Full screen
  landed this session; the panels did not.
- **Settings** has not been measured at all.
- **The Dashboard's triple navigation** — the tab bar, "START SOMETHING",
  and a "JUMP TO" row naming the same seven tabs — is the clearest
  learnability fault found and is a deletion, not a redesign.

### R7.6 Concept maps: manage, not just make

Creating one works end to end (§R4, built). Still missing: a **Maps listing
in the Library** — rename, delete, duplicate, open — so they can be managed
rather than only found through the Whiteboards sub-tab.

### R7.7 Backend

> *"fix and refine the backend after or at least scope it for next session."*

Nothing here is urgent after this session's fixes; it is the honest list of
what a backend pass should cover.

- **`app.js` is 26,000 lines.** It was split once already; the split moved
  four files out and left this. Every UI change pays for it.
- **The notes list renders every note into the DOM.** Fine at 40, not at
  4,000. Virtualization is the standard answer and the skill's own
  guidelines name it.
- **`_to_out` is ~4 queries per entry**; `_to_out_bulk` exists for lists but
  not every caller uses it.
- **The two file models remain two.** `MediaUpload` (inline, images/PDF
  only, served inline) and `Attachment` (per-entry, ~60 types, served as a
  download) now behave consistently at the UI, but a single model with a
  `disposition` flag would remove the class of bug this session fixed three
  instances of.
- **`filing_similar_id` is not a ForeignKey**, deliberately (see its
  docstring); a periodic sweep for dangling ids would be tidier than
  resolving-and-shrugging forever.
- **Alembic is stamped but unused.** The additive auto-migrator plus this
  session's two hand-written rebuilds is now three migration mechanisms. Pick
  one before a fourth.
