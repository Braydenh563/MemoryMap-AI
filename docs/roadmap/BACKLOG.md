# Backlog — the numbered sections


> **The other three:** [ROADMAP.md](../ROADMAP.md) (live work) · [BACKLOG.md](BACKLOG.md) (§1–§29) · [ANALYSIS.md](ANALYSIS.md) (§30–§34, including the licence constraint — AGPL-3.0 now) · [HISTORY.md](HISTORY.md) (already built).

Split out of `ROADMAP.md`, which had reached 4,500 lines and 47 sections. This
file is the **standing backlog**: everything that is still work, numbered as it
always was, so every §-reference elsewhere still resolves.

The live list — what to do next, and the two sections of freshly reported work
(§35, §36) — stays in [ROADMAP.md](../ROADMAP.md). Analysis and finished work
are in [ANALYSIS.md](ANALYSIS.md) and [HISTORY.md](HISTORY.md).

> The rule that governs all of it, unchanged: **check the running app before
> building anything here.** Three sessions independently rebuilt something that
> already existed, and an audit of §2 found four of its six "quick wins" done.

## 1. Live log console (started, not finished)

**Why.** Asked for directly: the Logs screen should read "like the terminal
running in the background, with key errors flagged", not a list you refresh by
hand.

**What exists.** `core/logbuffer.py` is a 500-record ring buffer attached to the
root logger and uvicorn's. It now sanitises each message to one printable line
(so a chat question or a page title can't forge a row) and keeps tracebacks in a
separate `trace` field for a fold.

**What's left.** ~~Everything below~~ **nothing — §1 is finished.**

- ~~Stream `/logs` while the section is open — an EventSource endpoint is
  cleaner than polling~~ **done, but NOT as EventSource, and the reason is
  worth keeping.** EventSource cannot set request headers, and this app
  authenticates with `X-Auth-Token`, so an EventSource here would simply 401.
  The standard workaround is to put the token in the query string, which is a
  bad trade anywhere and a farcical one on *this* endpoint: the token would be
  written into the very records it protects. So NDJSON over `fetch`, which
  matches the chat and digest streams the app already has. Server-side it
  polls the ring buffer rather than registering subscribers on it — a
  subscriber registry means the logging handler pushes into per-connection
  queues, so a slow reader can stall or grow unboundedly *inside logging
  itself*, and a logging path that can block is a far worse failure than a
  console running 700ms behind.
- ~~Follow/tail mode with autoscroll, pausing the moment the user scrolls
  up~~ **done**, and scrolling back to the bottom resumes it — the same
  gesture every terminal uses. The label says "(paused)" rather than just
  stopping, because silently stopping has the same shape as the app freezing.
- ~~Level filter (all / warnings / errors) and a text filter~~ **done**, plus
  a source filter. Filters only re-draw what is already held and never
  refetch, so changing one mid-incident cannot lose the records you were
  looking at. When a filter hides things it says how many: "nothing matches"
  and "nothing happened" are different answers and only one is fixed by
  changing the filter.
- ~~Render the `trace` field in a fold under its record~~ **done.**
- ~~Merge the browser-side `browserLogs` ring buffer into the same view,
  tagged by source~~ **done** — one array, sorted by time, tagged only in the
  merged view (in a single-source view every row would carry the same tag). A
  browser error and the request that caused it are one event seen from two
  ends, and reading them apart was what made this screen hard to use.
- ~~Count errors since the screen was last opened and badge the nav item~~
  **done**, and the badge is clickable — it opens the screen already filtered
  to errors, since it is the only place a failure announces itself.
- **Getting one error OUT of the log** (asked for directly after the console
  landed: "make sure that if there is an error in the log that it can be
  accessed and copied"). Each record has its own copy button that takes the
  traceback with it, an open traceback has a **Copy traceback** of its own,
  and "Copy all" relabels to "Copy 12 shown" whenever a filter is hiding
  something. **The real find here was underneath:** every copy in the whole
  app went through `navigator.clipboard`, which browsers expose **only in a
  secure context**. `http://localhost` qualifies, which is why nothing had
  ever shown it — but reach the app at `http://192.168.1.20:8000` or through
  a tunnel (§17's mobile-access question, and the proxied client address §8b
  already saw in a real log) and the API is `undefined`, so every copy button
  in the app was a no-op that said "couldn't copy". Copying now tries the
  modern API, then `execCommand` on plain http, then shows the text
  pre-selected in a dialog. A test asserts no caller writes to
  `navigator.clipboard` directly any more, since a helper only some callers
  use leaves the rest quietly lying.
- ~~**Export a support bundle.**~~ **done** — see below; it is an allowlist,
  not a denylist. One button that zips the log buffer,
  `preferences.json` with anything sensitive stripped, and Ollama/model
  status (`/models/status`) into a file the user attaches to a bug report —
  asked for indirectly ("an interface for managing the application… errors
  etc") and echoed by the outside review's "support bundle" suggestion.
  Everything in it is already local and already visible somewhere in the app;
  this only collects it. No new telemetry — the file is written to disk and
  the user chooses whether to send it, which is the difference between this
  and the outside review's other suggestion (opt-in crash reporting),
  rejected in §30.
- **Confirm nothing is silently dropped.** Asked as "make sure all the
  console messages are shown" — `logbuffer.py` is a 500-record ring buffer,
  so a very chatty session can push early records out before the screen is
  opened. Worth a visible "N records dropped, oldest kept is …" rather than a
  silent gap.

---

## 2. Quick wins

Small, self-contained, each removing a visible annoyance.

**Four of these were already done** — checked in the running app rather than
assumed, since three sessions have now rebuilt something that already existed:

- ~~**SearXNG install path**~~ done. Not the `pip install searxng` this section
  suggested: SearXNG doesn't publish to PyPI, so that name is somebody else's
  package. git is only needed to *fetch*, and pip can download and unpack the
  source tarball itself — so it clones when git is there and uses the tarball
  when it isn't. Install progress was already polled and shown inline.
- ~~**Notes sidebar sticky**~~ done — the rule already exists, once, above the
  section that used to duplicate it.
- ~~**Copy button per code block**~~ done, in chat answers.
- ~~**Conversation search** by content~~ done — `conversation_matches` decodes
  the message JSON rather than LIKE-ing the column, so "tent" no longer matches
  every chat by way of the word `content`.

**Still open:**

- **Empty chats can't be deleted.** Saved chats do have a delete action, and
  deleting the last turn deletes the conversation — so this is only about the
  *unsaved* chat in the main pane, which has no affordance but "+ New". Worth
  confirming what was actually meant before building anything.
- **Document outline / table of contents** from the headings, plus word-count
  goal and reading time. The one genuinely unbuilt item here; see §5.

---

## 3. Chat page: Chat / Agent / Browse sub-tabs

> **Status (audited this session, ROADMAP.md §38 item 5): substantially done,
> via a different — and, on the evidence, better — shape than "three
> sub-tabs".** Checked against the actual code rather than re-reading this
> section's original wording as a spec:
>
> - **Chat vs Agent** → the Ask/Request mode toggle in the chat dock, not a
>   tab switch. Same distinction, one click instead of a navigation.
> - **Browse** → the web panel (§36G), a persistent column beside the
>   conversation rather than a third tab — and §36G's own reasoning
>   ("a reading surface cannot live inside a control strip... as a column it
>   needs no cap and sits beside the composer") is a real argument *against*
>   folding it back into a tab, not just a different implementation of the
>   same idea.
> - **Cross-linking** ("the agent hands a page to Browse, Browse hands a page
>   to chat") → `askAboutPage()` does the Browse-to-chat direction (💬 Ask
>   about this closes the panel, asks the agent to `read_url` the page).
> - **Visible plan/progress** → `make_plan`'s ticked-step display, built
>   since (§35's "Next session: start here" item 1), satisfies this more
>   generally than a per-tab progress view would have.
> - **Independent web-search gating** ("works even when the chat/agent
>   web_search tool is off") → there is one `web_search_enabled` pref
>   already, not two competing toggles to decouple; the panel opens
>   regardless and says plainly why a search won't work if it's off, rather
>   than being blocked by a separate "Agent mode" switch.
>
> **The one genuine, real, small gap:** "which tools are allowed this turn,
> max rounds" as a **user-facing** Agent-mode control. `agent.py`'s
> `_agentic_reply` already takes `allowed_tools`/`max_rounds` as real
> parameters — the backend has the knob — but nothing in `app.js` exposes it;
> tool selection is automatic (`tools.focus_for`) with no manual override UI.
> Worth building only if a real use case shows up wanting it (most users want
> automatic selection, not a per-turn allowlist to manage); not worth a
> session on its own.

**Why.** Asked for directly. The page mixes three activities in one column, and
the web panel is bolted on top of the message list.

**Shape.**

- **Chat** — plain grounded Q&A
- **Agent** — tool-calling with its own controls: which tools are allowed this
  turn, max rounds, visible plan/progress, and a stop that keeps what it already
  did
- **Browse** — web search results, reader view, page history

Cross-linking is the point: the agent hands a page to Browse, Browse hands a page
to the chat. Web-search gating should be independent — a Browse-only mode where
the section works even when the chat/agent `web_search` tool is off.

**On the "in-built browser".** In the browser-served app this can only be an
`<iframe>`, and most sites send `X-Frame-Options`/`frame-ancestors` that refuse
to load in one — it would fail on exactly the sites worth opening. Proxying and
rewriting pages server-side is effectively writing a browser, and re-introduces
every tracker the privacy work removed. So the reader view stays the web path,
and a genuine embedded browser belongs in the desktop shell, whose webview can
navigate anywhere. **This ties §3 to §7.**

---

## 4. Library tab: chats, documents, images, archive

> **Status (audited this session): item 4 (the Library tab itself) is done —
> §36F/G built it and it now absorbed the Notes tab's Bin/Activity/Tags panels
> too, well past this section's original scope. Items 1 (drag-drop any file
> type onto the capture box, OCR on uploaded images) and 3 (`archived_at` —
> confirmed absent from the schema) are still genuinely open.** This section
> read as entirely unbuilt before the audit, which is exactly the kind of
> staleness that costs a session; check `routes_library.py` and the `Entry`/
> `Document`/`Conversation` models before assuming otherwise.

**Why.** Asked for directly. Everything that isn't a note lives only in its own
tab, and there is no archive at all.

**Order matters — images first, since the gallery is a view over what they
store:**

1. **File uploads on notes — asked for again, directly: "I want to be able
   to upload files with notes."** Worth being precise about what's already
   there versus what isn't, since this is narrower than it sounds:
   - **Already exists:** images can be pasted or dropped into a note or
     document (this item, above), and `📎 Attach a file` stores an arbitrary
     file (PDF, `.docx`, anything) against a note and gives you back a
     download — so the storage layer and one upload path both already
     handle non-image files.
   - **What's actually missing:** that attach path is a button, reached
     after the note exists — there's no drag-and-drop of an arbitrary file
     straight onto the **capture box itself**, which is the "upload files
     *with* notes" framing (attaching *while* writing, not as a separate
     step afterward). And a non-image attachment shows no preview in the
     note card — an image gets a thumbnail; a PDF gets nothing to
     distinguish it at a glance, just the filename behind the 📎.
   - **Scope, concretely:** extend the capture box's existing image
     drop-handler (item above) to accept any file type rather than
     branching on MIME type — same `attachments` table, same
     `routes_files.py`, so this is widening an existing path rather than
     building a second one. Multiple files in one drop should attach all of
     them, not just the first. For the preview: a small type-specific icon
     (PDF, doc, generic) is enough — actually rendering a PDF thumbnail is a
     real feature on its own and not needed for this to feel finished.
   - **A step further, genuinely new: extracting text from what's
     uploaded, not just storing it.** An image of a whiteboard photo or a
     handwritten page currently attaches as an opaque file — nothing reads
     it. Local OCR (`pytesseract` or similar, no cloud call needed) run on
     an attached image at upload time could feed its text into the same
     search index notes already use, so "what was on that whiteboard photo
     from March" becomes answerable. This is a genuinely separate capability
     from the file-storage work above — it's the one part of "handle image
     and file uploads" that isn't already half-built — worth scoping as its
     own follow-on rather than folding into the attach-path widening, since
     it needs a new pipeline stage (extract → index), not just a wider
     drop-handler.
2. **A bigger sketch board — asked for again: "improve sketches board, maybe
   a whiteboard tab??"** See below; promoted out of this list into its own
   full write-up given how much is actually being asked for.
3. **Archive.** A state between "active" and "binned", for things you want out
   of the way but not deleted. Applies to notes, chats and documents: one
   `archived_at` column per table, an additive migration.
4. **Library tab.** One place showing stored images, documents, chats and
   archived items, with previews, sorting and search.

---

## 4a. A real whiteboard, not just a bigger sketch

**Why, and what's actually being asked for.** The sketch pad today is one
canvas producing one PNG, tied 1:1 to one note — closer to a Polaroid than a
whiteboard. "Expand and improve sketches board, maybe a whiteboard tab??"
plus the follow-up ask for it directly means something with more freedom
than that: a canvas that isn't locked to a single note, that you can come
back to and keep adding to, and that plausibly holds more than ink — text
boxes, shapes, maybe pinned note cards.

**Two genuinely different things live under "whiteboard," and they have very
different costs:**

- **A bigger, freestanding sketch.** Still a raster canvas producing one
  image, same technology as today's sketch pad — the difference is it's not
  born attached to a note (it's its own Library item, per §4 item 4 above),
  it can be reopened and drawn on further rather than being a one-shot
  export, and it can be arbitrarily large/pannable rather than a fixed
  small pad. This is genuinely close to what already exists: same
  `attachments` storage shape, same rendering approach, mostly a change in
  *lifecycle* (persistent and reopenable, not one-and-done) rather than new
  technology.
- **A structured canvas** — separate movable/resizable elements (shapes,
  text, sticky notes, embedded note cards you can drag onto it), each
  stored as its own positioned object rather than baked into one flat
  image. This is what tools like Excalidraw or tldraw actually are, and
  it's a different kind of feature: an infinite-canvas scene graph with its
  own undo model, not an extension of the sketch pad. It's also the version
  that would let a whiteboard hold *note cards* pinned to it — which is the
  part that would make it feel like part of this app rather than a bolted-on
  drawing tool, since nothing else here does that.

**Worth sequencing rather than picking one.** The freestanding raster
version is a small, mostly-lifecycle change and delivers most of the
"expand the sketch board" ask on its own. The structured version is a real
build — a second rendering system alongside §9's graph — and is only worth
it if the raster version turns out to not be enough. Ship the first as the
actual whiteboard tab; treat the second as a stretch goal that depends on
whether people actually want to move things around after drawing them,
which is not knowable in advance.

**Where it lives.** Library tab (§4) as its own item type is the better fit
than nesting it under Notes — a whiteboard that isn't 1:1 with a note has
nowhere natural to sit in the Notes tab, and the Library tab is already
being built as the home for "everything that isn't a note."

---

## 5. Documents

Checked against the running app, not assumed:

- ~~**Outline / table of contents**, reading time~~ **done.** `renderDocOutline`
  builds a TOC from `#`–`####`, correctly ignoring a `#` inside a code fence,
  hides itself under two headings, and each entry puts the caret on that line.
  `renderDocStats` shows words and reading time at 220 wpm. Verified in a
  browser: a 461-word document reads "461 words · 2 min read" with four
  correctly-nested headings.
- ~~**Expand a note into a document**~~ **done** — leaves the note untouched
  and says so.
- **Word-count goal** — the one unbuilt part of the outline item. A target you
  set, with progress against it.
- **AI chat bar inside the document** — partly there. `doc-ai-panel` already
  edits a selection or the whole document and shows the result as a proposal.
  What's missing is the *conversational* shape: ask a question about the
  document without it proposing an edit.
- **A real document browser** — the sidebar list is not a gallery
- ~~**Attach documents to notes**~~ **done.** Asked for directly: "a way to
  link documents to new notes I create in the capture tab… the documents and
  notes sections and features need to be more integrated together." The
  capture box has an *Add to document* picker, so the connection is made while
  it is obvious rather than after the note is buried in a list; the note card
  carries a 📄 chip that opens the document; the document lists the notes it
  draws on, each with a detach button. `document_links` is its own table
  because the relationship is many-to-many and neither side owns the other —
  detaching removes a connection, never a note, and binning a note takes it
  out of the document's list on its own.

  Asked again straight afterwards — *"also what about adding a document to a
  note??"* — because a capture-time picker only helps the notes you have not
  written yet, and the ones that turn out to belong to a document are usually
  the old ones. **📄 Add to a document** in a note's ⋯ menu picks from the
  documents that note is not already on, and the × on its 📄 chip detaches it
  from the note's side. Both directions now use the same two routes, so there
  is one behaviour to reason about rather than two.
- **Document history** — notes have `EntryRevision`; documents have no
  equivalent table, and the AI edit overwrites on accept

### Asked for this session, not yet built

A round of use produced four requests about documents at once, and they are
one direction rather than four features: *"I want the documents to be more
like using Obsidian or Notion."* Ordered by how much each one gets in the way.

- **A mini AI chat bar in the document editor.** Asked for directly: *"a mini
  chat bar on the documents page to request the ai to do stuff, like write
  something, edit something specific (the whole document or current selection
  etc)."* This is the biggest of the four and the closest to already existing:
  `doc-ai-panel` edits a selection or the whole document and shows the result
  as a proposal, so the *editing* half is built. What is missing is the
  **conversational** half — a bar you type an instruction into, in place, that
  can either answer about the document or propose an edit to it, and that
  keeps the thread of what you have already asked. Two decisions to make
  before building it: whether it shares `/chat`'s conversation store (a
  document's thread is about the document, so probably its own), and whether
  an instruction with a selection active always means "edit this" (it should
  — ambiguity there is what makes an AI editor feel unpredictable).
- **Upload a file as a document, attached to a note.** Asked as *"I want to be
  able to upload a document to a note"*. Distinct from `📎 Attach a file`,
  which stores a blob against the note and gives you back a download: this
  would take a `.md` or `.txt`, make it a real Document with its text in the
  editor, and link it to the note in one step. The pieces exist — `/files`
  ingests uploads, `/documents` creates, `document_links` joins — so this is
  mostly a route that does the three together, plus deciding what to do with a
  `.docx` or a PDF (probably: refuse politely rather than half-convert).
- **Obsidian/Notion editing — asked for again, more emphatically: "have all
  the features as well."** Worth being explicit about what "all the
  features" would actually include, since Obsidian and Notion aren't the
  same product and "all of both" isn't a coherent target. The editor is a
  `<textarea>` with a preview beside it today. What people mean by this
  request, roughly in order of how much each is missed:
  - `[[wiki links]]` between documents (notes already have them — the
    parser is in `renderNoteText`)
  - a `/` command menu at the cursor
  - drag-and-drop images that land as markdown
  - backlinks ("what links here")
  - live-preview editing where the markup renders in place instead of in a
    second pane — the one that would change the feel and also the one that
    means giving up the textarea; worth doing deliberately, and last
  - **Sub-pages.** Notion's documents nest into a tree; MemoryMap's are
    flat. Worth deciding this one early rather than late, since it's a data
    model question (`documents` would need a `parent_id`) that every other
    item in this list is easier to build on top of than to retrofit under.
  - **Transclusion — embedding, not just linking.** `document_links` already
    connects a note to a document, and `[[wiki links]]` connect document to
    document, but both are references you click through, not content
    rendered inline. Obsidian's `![[note]]` embeds the note's actual text
    where you put the embed. This is the feature that would make the
    notes/documents "two halves of a whole" framing actually true visually,
    not just at the data layer — worth building once backlinks exist, since
    an embed is close to a backlink that renders instead of just linking.
  - **A full properties/database system is worth ruling out explicitly,
    not leaving ambiguous.** Notion's defining feature is that a page can
    carry structured properties and be queried like a database row — that's
    a different kind of thing from a markdown document with metadata, and
    building it properly would mean a second data model living alongside
    notes' tags/categories rather than reusing them. Worth deciding this is
    out of scope on purpose (tags and categories already give notes
    lightweight structure; documents don't obviously need a second, heavier
    system) rather than something quietly missing from an "all the
    features" list that was never going to include it.
- **Documents on the graph and the timeline.** Asked as *"docs should also
  probably show on the graph and timeline"*. Both views are built around
  `Entry` and would need a second node/point kind. The design question is not
  technical: a document is not a note, and drawing it as one would say the
  wrong thing. On the graph it wants its own shape and to sit where its notes
  are (it is a hub over them, which is exactly what `document_links` records);
  on the timeline it wants to be a band or a marker rather than a dot, because
  a document is written over weeks and a note happens at a moment.

---

## 6. OpenAI-compatible backends — **done**

Built. Moved to [HISTORY.md](HISTORY.md) with the rest of the finished work;
the number is kept here so §6 references still land somewhere sensible.

## 7. Desktop packaging

**Why.** Asked for: "run as a professional product".

**Recommendation: not Electron.** The app is Python + static files; Electron
would bundle a second runtime (~150 MB) and a Node toolchain to deliver what
`--desktop` already does in-process via pywebview, and Python would still need
shipping alongside it. Alternatives weighed: Tauri and Wails (Rust/Go shells,
tiny binaries, but neither solves shipping Python), Neutralino (immature), plain
PWA (already supported via `manifest.webmanifest` + `sw.js`).

**Plan.** Harden the existing pywebview mode — single instance, native menus,
tray, graceful port fallback when 8000 is taken, first-run flow — then
PyInstaller one-file builds for Windows/macOS/Linux. pywebview's webview is also
where the genuine embedded browser from §3 becomes possible.

**Portable vs installed, worth deciding rather than defaulting into one.**
PyInstaller can build either — a one-file executable that runs from a USB
stick with `data/` beside it, or a real OS-integrated install (Start Menu
entry, `/Applications`, an uninstaller). They want different things from
`MEMORYMAP_DATA_DIR`: portable mode wants data relative to the executable by
default (so the whole thing is one folder you can move); an installed app
wants a proper per-user data directory (`%APPDATA%`, `~/Library/Application
Support`, `~/.local/share`) so it survives a reinstall. Worth picking the
default deliberately per platform rather than the build script producing
whichever one falls out of the PyInstaller config first.

**Cross-platform status, since it was asked about directly** ("make
memorymap-ai cross-platform and compatible with linux and if possible mac as
well"): closer to done than the ask implies. `start.sh` already exists
alongside `start.bat`, and the app itself is Python + SQLite + a browser, none
of which is Windows-specific. What genuinely is Windows-specific: the two
`searxng_manager` fixes in §8b (`os.kill(pid, 0)` terminating instead of
checking, `rmtree` failing on git's read-only objects) are guarded to only
run their Windows branch, so they should be harmless elsewhere, but that is
still unverified on real macOS/Linux hardware rather than reasoned from the
code — the honest status is "should work," not "confirmed." The PyInstaller
builds above are the part with no cross-platform equivalent yet at all.

---

## 8. Open bug list

- ~~**Renaming the project folder broke the launcher**~~ **fixed.** Reported
  with a screenshot after renaming `MemoryMap-AI-v0` to `MemoryMap-AI`:
  `No module named memorymap`, straight after `[2/4] Dependencies already up
  to date - skipping install.` Those two lines are the whole bug. `pip install
  -e .` writes an **absolute** path into the venv, so the rename left it
  resolving to a folder that no longer exists; the skip marker stores
  `requirements.txt`'s timestamp (`.bat`) or checksum (`.sh`), which a rename
  does not change, so the one thing that would have relinked it was skipped.
  The marker was answering the wrong question — "have requirements changed?"
  rather than "can this venv import the app?" — and those come apart exactly
  when the folder moves. Both launchers now ask the venv directly before
  trusting the marker, which costs one interpreter start and also catches a
  moved folder and a half-deleted venv. Reproduced by renaming a real venv'd
  checkout and confirmed fixed against it.
- ~~**Picking a theme did nothing about half the time**~~ **fixed.**
  Appearance has three layers — defaults, the chosen theme, your manual
  tweaks — and `appearancePref` reads them in that order, manual first. That
  is right for a tweak made *after* choosing a theme and wrong for every theme
  chosen afterwards: one earlier change to the palette or the mode sat on top
  of each new theme and silently cancelled that part of it, and with a few
  stored a theme could change nothing visible at all. Picking a theme now
  clears the manual keys *that theme has an opinion about* — so Lagoon drops a
  stored palette and mode but leaves a font size it says nothing about — and
  clears the custom accent with the palette, since an accent picked against
  one palette has no meaning against another.
- ~~**Lagoon and Shallows needed refining**~~ **done.** Shallows was asked for
  as "a teal light one" and was drawn mostly indigo, so its ground and its
  accent pulled against each other; the page is aqua now and the indigo
  survives as the cooler of the two blobs. Lagoon's `--inner` was 5% white,
  which made every inset panel identical to the card it sat in, and `--muted`
  was low enough to grey out secondary text; both lifted, and the page
  gradient runs greener at the bottom so the teal accent reads as lit from
  inside the water rather than printed on it.
- ~~**Background tasks showed nothing while SearXNG started**~~ **fixed.**
  Reported twice — "I still don't think the bg tasks is working". The list was
  right about installs and wrong about the case the user was actually
  watching: a *start* is not an install, it runs in the request thread, and it
  waits up to `START_TIMEOUT` (90s) for the service to answer. That is the
  longest silence in the app from the outside and it was the one thing not on
  the screen built to explain silences. `searxng_manager.starting()` now
  reports it, with the seconds waited against the timeout as a progress bar.
- ~~**The AI emblem was cramped, and only on two tabs**~~ **fixed.** It was
  put inside the Notes and Chat sidebar headings, wedged between a title and a
  button — too big for the row, differently placed on each, and five more tabs
  would have meant five more of those decisions. It has one home now, in the
  header beside the AI status dot, which is what it is about: on screen for
  every tab, one size to get right, and the first thing to drop when the
  header runs out of room on a narrow window.
- ~~**The dashboard's widgets are missing until you switch tabs**~~ **fixed.**
  Reported as *"initially when I load up the app the dashboard widgets are
  missing until I refresh or change tabs and go back on it again"*. `startApp`
  fired `loadEntries` and `refreshActiveTab` as two independent steps, so on a
  cold load the dashboard rendered against an `allEntries` that was still `[]`
  and drew its brand-new-notebook card — which is correct for an empty
  notebook and wrong for one that has simply not arrived yet. The tab render
  now waits for the entries, and the empty-state card is gated on a flag that
  says the fetch has actually happened, because "empty" and "not loaded" are
  indistinguishable from a length alone.


Every reported bug in this section has been reproduced in Chromium and fixed.
What follows is kept as a record of *what each one actually was*, because in
most cases the stated symptom pointed at the wrong component and the wasted
effort is the expensive part to repeat.

**Fixed, with the real cause**

| Reported as | What it actually was |
| --- | --- |
| Numbered lists always render `1.` | A blank line between items closed the `<ol>`, and models write `1.\n\n2.` far more often than tightly |
| Assistant content too far right | The rail padded each step's own box instead of the container |
| Thinking arrow sits on the timeline circles | `list-style-position: outside` draws the marker *outside* the summary's box — exactly where the rail's gutter is, so no gutter width could clear it. Native marker removed and redrawn inside |
| Thinking boxes vanish on reload | Not reproducible. Verified in a browser: live, three-round, and after a real reload the steps round-trip intact. The report predates the step-timeline work that fixed it |
| A long URL escapes the chat bubble | `overflow-wrap: anywhere` on bubble content |
| Documents show "Invalid Date" | A regression from the UTC fix: `relativeTime` appended `"Z"` to a timestamp already carrying `+00:00`. Two definitions existed, one shadowing the other |
| Dashboard "Search notes" goes nowhere | Focused a box inside the hidden `browse` sub-tab |
| Capture textbox short until clicked | `autoGrow` measured `scrollHeight` while the section was `display: none` |
| "Ask about this" wrecks the layout | CSS automatic minimum sizing: a `1fr` grid track and a `min-width: auto` flex item both refuse to shrink below their content, so one wide code block widened the column, the page and every paragraph beside it. 3425px wide at a 1280px viewport |
| Desktop menu-bar buttons overlap the title | The tab strip was pinned at a rigid 579px because a base rule 70 lines below the media query redeclared `flex` at equal specificity. Nothing could yield, so the header overflowed itself by up to 215px |
| Can't switch search engines | The status poll reset the radios as soon as focus moved, because picking one saves nothing until "Apply & re-index" |
| Colour/font controls stuck under a theme | Two causes. `[data-palette]` rules sit below `[data-accent]` rules at equal specificity, so a palette always won and the swatches were dead under every theme; and `applyAppearance` re-applied every setting *except* the accent, so clearing one left it showing |
| Sketches don't open from the graph | A sketch is a note plus a PNG, and the graph popup showed the caption but never the image — the drawing was unreachable from the map |
| Web search returns nothing | Not a parser bug. Three different failures (no egress, a rate-limit challenge page, a genuine empty result) all surfaced as an empty list. Now logged and named separately |

**Found while fixing the above, also fixed**

- Editing an answer reverted when the chat was reopened — the edit updated
  `content`, but replay renders `steps`, which kept the model's original wording.
- Uploading a file 500'd if the uploads folder had gone missing, losing a
  sketch's drawing while keeping its caption.
- `APPEARANCE_DEFAULTS` declared `bg-motion` twice with different values.
- "New note" on the dashboard did nothing unless the Notes tab happened to be
  left on the capture section — the same hidden-sub-tab trap, on the most-used
  button there. Ten feature-catalog entries had it too.
- `.entry-content` used `pre-wrap`, which keeps typed line breaks but cannot
  break inside a word, so one pasted URL widened the note list and the page.
- `pytest` didn't work in a fresh clone without an editable install.

**From the ideas parking lot, never formally triaged.** Reported informally
(`IDEAS.md`) rather than reproduced in a browser yet — worth the same
ten-second grep-first check as everything else in this document before
anyone spends a session on them:

- **A note filed under the wrong category by a wide margin** — "I wrote 'ai
  is cool' as a note and it was filed under Sketches". Sketches is a specific
  category the janitor's cheap embedding-centroid path can match against
  (§4 of `ARCHITECTURE.md`), so this smells like a centroid gone stale or too
  few notes in the right category to out-vote it, rather than a one-off.
  Worth checking what "Sketches" actually contains before assuming the AI is
  at fault.
- **Settings can't be reached on a narrow/mobile viewport.** Distinct from
  the general accessibility pass in §19 — this is specifically Settings, and
  worth checking against the header's documented degrade order (§10 of
  `ARCHITECTURE.md`) before assuming it needs new CSS rather than a missing
  breakpoint.
- **Some dashboard widgets don't render markdown.** The note list's
  `renderInlineMarkdown` (§22) was deliberately not extended everywhere; the
  dashboard's own small note previews strip markers instead
  (`notePreviewText`). A widget showing raw `**bold**` is likely one that
  calls neither — worth an inventory of which dashboard widgets go through
  which path.
- **The "notebook constellation" widget doesn't redraw on a theme change.**
  The graph's galaxy/starfield styling (§9) points at this widget as proof
  the aesthetic works; §10 of `ARCHITECTURE.md` already documents the general
  version of this bug for the emblem (p5 measures a canvas as zero inside a
  hidden tab, and has to redraw on theme change since the accent moves) —
  very likely the same cause in a second place.
- **Gravity and Spread only affect the force-directed layout.** Real:
  `nodeSize`/panning-based tree and radial-ring layouts (§9) don't run a
  physics simulation, so these two controls have nothing to act on outside
  the default layout. Not obviously a bug — worth deciding whether they
  should grey out under tree/radial, or gain layout-specific meaning (row
  spacing, ring gap) instead of silently doing nothing.

**Still open here**

- **Improve the extracted page's visual rendering.** Not a bug — the reader now
  carries heading levels, so it can be laid out as a real document (typographic
  scale, measure capped around 70ch, blockquotes, lists, code). Grouped with
  §13.

**The lesson worth keeping.** Four of these were "this control does nothing",
and in three of the four the control was working perfectly — the write landed
and was then overridden by CSS source order, a status poll, or a hidden
section. Reading the handler will not show you that. Reproduce in a browser and
measure the *computed* result; it is faster than reading, not slower. The
recurring causes are now written up as invariants in `docs/ARCHITECTURE.md` §10.

---

## 8b. Web search — two Windows bugs found, and what is left

~~**Port 8888 being taken was a dead end.**~~ **fixed.** Asked directly: *"is
there a way to change the port if it is full?? maybe like 8080 or smth"*. The
port report said "close whatever has it", which assumes the user can — often
they cannot, and the thing holding it may be something they need. `start()`
now settles a port first: the wanted one, else 8080/8081/8890/8899, with
`MEMORYMAP_SEARXNG_PORT` to name one. A SearXNG *already answering* on the
wanted port beats a free one, because that is ours from a previous run and
moving would start a second copy beside it.

**Seen in a log this session, not yet fixed:** a start attempt and an install
can be in flight at the same time. The user's log shows `SearXNG didn't answer
within 90s. Its own output was: (nothing — it wrote no output at all)` at
6:54:06, with the install still unpacking at 6:53:12 and writing the `pwd`
shim at 6:54:11 — so the start was waiting 90 seconds for an interpreter that
was still being built. Nothing is broken by this beyond the wasted wait and a
misleading error, but the error is the one the user sees, and it accuses the
wrong thing.

**The direction that is already guarded is the wrong one.** `_start_from_source`
refuses when `_install_state["running"]` is set, so *starting during an
install* is handled. What happened here is the reverse: a start was already
waiting when a reinstall began, and nothing cancels a wait in flight — it sits
out its full `START_TIMEOUT` against a virtualenv being rebuilt underneath it,
then blames SearXNG for writing no output. Fixing it properly means making
`_wait_until_ready` interruptible: give it a generation counter or an
`threading.Event` that `install_source` sets, so the waiter notices the ground
has moved and returns "the install restarted" instead of "it never answered".
Not a quick change, which is why it is here rather than done.

The diagnosis from §8 shipped and is working: the app now says "DuckDuckGo is
rate-limiting this app rather than returning results" instead of showing an
empty panel, which is confirmed in use. That was the whole point — the failure
is now legible.

**The fix is SearXNG, and this session found five reasons it couldn't work.**
None was in the log, which is why reading the log first did not find them —
three of the five happen before SearXNG writes a line, and the other two are
Windows-only.

**Read this first: SearXNG now installs, starts, answers its JSON API, and
passes `websearch.probe_searxng`, verified in this sandbox.** Everything below
was reproduced rather than deduced. The one part still unverified is the
download itself, because the sandbox proxy blocks the archive URL.

**3. `git clone` can never work on Windows.** Reported mid-session:
*"Couldn't download SearXNG: fatal: unable to checkout working tree"*. Four
files in the repository have a colon in the name —
`utils/templates/etc/nginx/default.apps-available/searxng.conf:socket` and
three like it. A colon separates a drive letter, so Windows refuses the name,
git fetches every object and then dies at the checkout, **leaving the
half-written folder that produced bug 2 above**. Nothing about it is
transient; retrying could never help. `pip install <tarball-url>` — the
"install without git" path — unpacks the same files and fails the same way, so
both paths were broken there. Fixed by downloading the archive and unpacking
it ourselves, skipping members this filesystem can't hold (they are nginx and
uwsgi deployment templates) and any that would escape the folder. git is no
longer used at all.

**4. `pip install -e .` can never work, on any OS.** SearXNG's `setup.py`
imports `searx` for its version, `searx/__init__.py` imports `msgspec`, and
pip builds in an isolated environment that has neither —
`ModuleNotFoundError: No module named 'msgspec'`, before setup.py can declare
a requirement. `requirements.txt` now goes in first and the package is built
with `--no-build-isolation`, which is exactly what SearXNG's own `manage`
script does.

**5. The `tracker_url_remover` plugin kills the process at boot.** It
downloads a rules file from `rules1.clearurls.xyz` during `init` and does not
catch a failure, so SearXNG exits before binding the port on any machine that
is offline, proxied or slow. Confirmed here: with the plugin on, the process
died in init; with it off (in the generated `settings.yml`) it booted and
answered. MemoryMap strips tracking parameters itself, so nothing is lost.

**And the two Windows-only ones, from earlier in the session** — the same
mistake twice: a POSIX idiom that means something different on Windows.

**1. "SearXNG started but never answered" — we were killing it.** `_alive()`
asked `os.kill(pid, 0)`, the POSIX way to check a process exists without
touching it. On Windows every signal except `CTRL_C_EVENT`/`CTRL_BREAK_EVENT`
is handed to `TerminateProcess`, so that call *ended* the process (exit code
0) and then returned True. `status()` asks `_source_state()`, which asks
`_alive()`, and the settings screen polls `status()` every three seconds — so
a freshly started SearXNG was shot within seconds of starting, every time,
and the app reported that it started and never answered. That is exactly the
symptom this section was named after. `_alive` now uses
`OpenProcess`/`GetExitCodeProcess` on Windows; `_terminate` is the only thing
that signals.

**2. "does not appear to be a Python project" — reported directly:**

    Couldn't install SearXNG: ERROR: file:///C:/Projects/MemoryMap-AI-v0/
    data/searxng/src does not appear to be a Python project: neither
    'setup.py' nor 'pyproject.toml' found.

`install_source` skipped the download when `data/searxng/src` *existed* and
handed the folder to `pip install -e`. Reinstalling didn't help because
`uninstall_source` used `shutil.rmtree(..., ignore_errors=True)`, and git
marks `.git/objects` read-only, which Windows enforces — so the wipe deleted
the writable files, left the folder standing, and said it had removed it. The
next install then found the folder, skipped the clone, and reproduced the
error exactly. Fixed at all three points: `is_checkout()` asks what is *in*
the folder, `_remove_tree()` clears the read-only bit (and moves the tree
aside if it still can't delete it) and reports what survived, and the
installer verifies `import searx` in the new venv before calling it done.

~~**The two Windows-only fixes are not verified on Windows**~~ **confirmed —
see above.** The tests pin the logic (`tests/test_searxng_install.py`), and
the user has since confirmed SearXNG installs, stays up, and returns results
on the machine that hit both bugs originally.

**6. `import pwd` — SearXNG cannot be imported on Windows.** Reported with a
photo: the install finally *finished*, and the start died with
`ModuleNotFoundError: No module named 'pwd'` from `searx/valkeydb.py` line 22.
`pwd` is POSIX-only. It is the **only** POSIX-only import in the whole
package, and the only thing it is used for is naming the current user in one
error message when a Valkey DB connection fails — a branch that is
unreachable unless a Valkey URL is configured, which MemoryMap never does. A
`pwd` stand-in is written into SearXNG's own virtualenv where the platform
hasn't got one; patching SearXNG's source instead would mean matching text
upstream is free to change and re-applying it after every update.

The install's final check was also too shallow to have caught it: `import
searx` passed on Windows and the *start* then died on `searx.webapp`. It
checks `searx.webapp` now, with the same environment a start uses — verifying
against SearXNG's own defaults verifies something nobody runs, since it
refuses to start on its placeholder `secret_key`.

**Confirmed working.** SearXNG now returns real results on the user's own
machine — the thing this session couldn't test (the sandbox proxy blocks
every engine) is now verified where it matters. That also confirms the two
Windows-only fixes above (`_alive`, `is_checkout`/`_remove_tree`) actually
held on real Windows hardware, not just in the sandboxed logic tests. §8b's
open work is no longer "does this work at all" — it's UI polish and a
privacy pass, both moved to §13 so they live with the rest of web search's
design rather than the bug list.

Also present, from earlier sessions: a `↻ Reinstall` button (wipes the venv
and checkout, keeps `settings.yml` and its secret key) and a port line saying
whether 8888 is free, held by a working SearXNG, or held by something else.

The one thing already ruled out: the generated `settings.yml` *does* include
`- json` under `search.formats`, so the 403-from-a-missing-format theory is
not it.

Known from a user screenshot, now fixed: `_reason()` reported pip's parting
"[notice] To update, run: … --upgrade pip" as the cause of a failed install,
because it took the last line and that notice is always last. If an install
failure is being investigated, the message is trustworthy now; it was not
before.

**A deliberate security pass, rather than more one-off fixes.** Asked
broadly — "full security sweep and analysis… must be fully private, hack
proof, and secure… web browsing should be as private, secure, and
untrackable as possible" — which is this section's whole subject already,
just not gathered into one pass. What exists today: the CodeQL alert list is
closed (§ "Done in the most recent session"), the DNS-rebinding TOCTOU on
both the reader and the SearXNG search path is closed, redirects are
re-checked hop by hop rather than trusted, private notes are encrypted and
excluded from every AI tool, and CodeQL runs on every push plus weekly. What
a deliberate pass would add on top, parallel to §19's accessibility audit:

- A dependency-vulnerability sweep (`pip-audit` / `npm audit` equivalent for
  the vendored JS, since nothing currently checks either), and a fresh look
  at this section's own three easy-to-break rules (§8b's opening) to confirm
  nothing has quietly regressed since they were written down.
- ~~**Brute-force protection on the unlock gate.**~~ **already built** —
  `routes_auth._refuse_if_throttled`: one global bucket (not per-IP, which is
  exactly what a botnet has plenty of), five free tries, then an exponential
  wait to a five-minute ceiling, forgiven after 15 quiet minutes. A correct
  password inside the wait still waits. Pinned by a test now.
- ~~**A Content-Security-Policy header on the app's own pages**~~ **done, and
  tight: no `unsafe-inline`, no `unsafe-eval`, and no host named anywhere in
  the policy** — every source is `'self'` or a hash. The "no asset from a CDN"
  rule is what made that affordable, exactly as this item predicted. What it
  did not predict is that it would break something: custom CSS injected a
  `<style>` element, and a full green suite said nothing. See the note under
  the security tier.
- ~~**The KDF behind private notes, named explicitly.**~~ **confirmed, and
  better than this item would have accepted:** `core/crypto.py` uses scrypt at
  n=2^15, r=8, p=1 — memory-hard, so it resists GPU guessing in a way PBKDF2
  does not. ~100ms and ~32MB per unlock, deliberately.
- ~~**Cross-origin requests against the local API**~~ **done** — see §20,
  where the full reasoning lives.
- **Search-specific items** now live in §13, since SearXNG went from "being
  built" to "actually running" this pass.

---

## 9. The graph — make it a tool, and give it a look

**Why.** Asked repeatedly: "expand on the capabilities of the graph", "more
utility and ways to use and visualise my notes", "it's still kinda plain — it
needs more life and design style". `main` made it keyboard-operable; it is still
a plain force-directed blob that doesn't fill its own panel.

**Layouts — the shape the notes are arranged in.** Asked for directly: "can
you add different types of graph views… like tree graph diagrams and the
like". These are separate from *styling*: a layout decides where a note goes,
a style decides what it looks like once it is there. Layouts first, because a
force-directed blob is the thing that makes the graph hard to read, and no
amount of styling fixes it.

The notebook has three different structures in it, and each one wants a
different picture:

| Structure | Where it comes from | Layout that shows it |
| --- | --- | --- |
| Hierarchy | category → note, and `parent_id` threads | tree, radial tree, treemap, sunburst |
| Network | `entry_links` (wiki links, AI links) | force, arc diagram, adjacency matrix |
| Sequence | `created_at`, `entry_dates` (§10A) | timeline-graph, growth animation |

- ~~**Tree**~~ **built.** Root → category → note, with a note's replies nested
  under it, so a train of thought reads as one branch. This is the layout the
  request was about, and it is the one that suits a notebook with few links
  and many categories — which is most notebooks before the graph has been
  used much.
- ~~**Radial tree**~~ **built.** The same hierarchy wrapped into a circle:
  denser, and it makes the *shape* of a notebook obvious — a fat arc is a
  category you write in constantly.

  Both were first built by handing d3 the panel's dimensions as a bounding
  box, which is the wrong instruction: `d3.tree().size([...])` divides the
  height by the number of leaves, so a 29-note notebook got eighteen pixels a
  row and printed its labels on top of each other. Reported with a photo —
  *"the graph tree and radial are a bit hard to read and aren't neat"*. The
  fix is a set of rules about **what a label needs**, not about what the panel
  has: the tree uses `nodeSize` and pans when it is taller than the panel
  (zooming out only when the whole thing nearly fits, because a tree you
  scroll beats one you cannot read); the radial computes its rings from the
  note count, the category count and the panel, and rings **by depth** rather
  than by d3-cluster's height — cluster put a category containing a thread one
  ring closer in than its siblings, which is what made the circle look ragged.
  Three collisions only a browser can find were fixed on the way: a stylesheet
  rule beating the `text-anchor` presentation attribute so no side-label ever
  moved, a flipped left-half label whose offset sent it back across its own
  node, and a 55%-transparent label halo that let a thread edge show through
  the words it ran behind. All of it is asserted on measured geometry — the
  labels' real rotated corners, separated by a separating-axis test, because
  the axis-aligned box around diagonal text overlaps when the words do not.
- **Mind map from one note** — pick a note as the root and lay everything else
  out by hops along `entry_links`. Different from the tree above: the
  hierarchy there is filing, here it is connection.
- **Treemap / sunburst** — area as weight, so a category with 200 notes looks
  like one. Best for "where does my writing actually go?", and the only layout
  here that answers a question about proportion.
- ~~**Arc diagram**~~ **built, on the filing hierarchy rather than
  `entry_links`.** Every node — category, note, reply — sits on one baseline
  in the order a depth-first walk of the hierarchy visits them (so a
  category's notes stay contiguous), with a parent-child edge as a flattened
  half-ellipse under the line instead of tree's elbow or radial's ring. That
  is a deliberate departure from this bullet's original "links as arcs"
  description: tree and radial already draw the *filing* hierarchy rather
  than `entry_links` — overlaying real links "turns the tree back into a web"
  per `layoutHierarchy`'s own comment — and a third hierarchy view stays
  consistent with that and reuses `layoutHierarchy`/`frameTree`/the drag-pin
  behaviour those two already have, rather than building a second, parallel
  rendering path for link-based arcs alongside the tree-based ones. A links-
  as-arcs view is still a real, different possible layout — it just isn't
  this one. Verified in Chromium against a seeded notebook with categories
  and multi-level reply threads: renders with no invalid paths, labels read
  diagonally without colliding within a step, physics sliders correctly
  disable, and switching away to force/tree/radial and back regresses none
  of them.
- **Adjacency matrix** — no crossing edges at all, so it stays readable when a
  force graph has turned into wool. Worth it only once there are hundreds of
  links.
- **Timeline-graph** — the graph laid out left-to-right by date, links as
  arcs. §10's Timeline tab does the axis; this would do the axis *and* the
  links, which is the one thing neither view has.
- **Subway map** — orthogonal edges, categories as lines. Beautiful and
  genuinely hard: it needs edge routing, which is real work rather than a
  layout call.

**Styling — the same layout, dressed differently.** These are skins over
whichever layout is picked, not layouts of their own:

- **Galaxy / starfield** — notes as stars sized by access count, links as
  faint filaments. The dashboard's "notebook constellation" widget already
  proves the aesthetic works.
- **Sea chart** — islands per category, notes as landmarks, links as shipping
  routes, unlinked notes adrift. Parchment palette pairs with it.
- Plain force-directed stays the default; everything else is a picker.

**Fit and framing.** It should size to its panel and re-fit on resize, with
zoom-to-fit, zoom controls, and a minimap for large notebooks.

**Utility it still lacks:**

- Filter by category, tag or date range; double-click to focus a neighbourhood
- **Paths between two notes** — the question a graph is uniquely good at
- Cluster detection, with "name this cluster" handed to the AI
- Orphans and hubs surfaced explicitly
- Create a link by dragging one node onto another
- Timeline scrub — play the notebook's growth
- PNG/SVG export of the current view
- A `related_notes(id, depth)` tool so the model can walk links, not just
  similarity

---

## 10. Timeline tab, and time-aware notes

**Why.** Asked for directly, and it is the most substantial new idea in the
backlog. Notes say "today", "yesterday", "last week", "two days ago" — phrasing
that is correct when written and misleading forever after. Today nothing records
what those phrases *resolved to*.

**Three parts. The first two are done — the third is the one asked for again,
more directly, and is not built yet:**

~~**A. Resolve relative time at capture.**~~ **done.** Every note's temporal
phrases are resolved when it is saved (and re-read when its text is edited)
and stored in `entry_dates` with the phrase beside the date — the resolution
is a rule, not a fact, and a reader can only disagree with it if both are
visible. `entry/timewords.py` is deterministic regexes and arithmetic, not a
model call: it runs on every save, including with Ollama off, and is
best-effort so it can never stop a note being saved. Private notes are
excluded, and marking a note private clears what was already stored — the
same reasoning as dropping its embedding.

Handled: today · tonight · this morning/afternoon/evening · tomorrow ·
yesterday · last night · the day before/after · this/last/next week, month,
year · "in N days/weeks/months" · "N days/weeks ago" · "last/next/this/on
<weekday>". Precision is kept, so "last week" shows as a week rather than
being flattened to a day. The weekday rule is written down in the module,
because both readings of "next Friday" exist and consistency is the most that
can be offered.

Shown as a chip on the note (`🕓 last week → week of Jul 20`, with the full
date on hover) rather than marked up inside the text: `renderNoteText`
already layers wiki links, inline markdown and filter highlighting through
each other, and a fourth pass over the same string is where that breaks. The
resolved dates also travel in `get_note`/`search_notes` results, so the model
can answer "what did I mean by *last week* in that note?".

**Still open from A:** tagging notes that contain relative time so they are
findable as a class, and nudging on stale ones ("this said 'tomorrow' three
weeks ago — did it happen?"). Both are queries over `entry_dates` now that
the data exists.

~~**B. A Timeline tab.**~~ **built, first version — and it is a grid, on
purpose, for what it's for.** A time axis across, one band per category or
tag down the side (or none), and a bucket size you pick — day, week, month,
year. Every note plots at what it is *about* where §10A resolved a date from
its text, and at when it was written otherwise; a note moved by what it says
is marked 🕓 and says so on hover, because a timeline that silently relocates
notes looks broken rather than clever. Clicking a note opens it.

Drawn as a CSS grid rather than SVG: every cell is a real element, so it
scrolls, tabs and reads aloud without any of that being hand-built. Bands are
capped at eight plus an "Everything else" lane — a chart with forty lanes is
not a chart.

~~**C. A branch/line view**~~ **built — asked for again, more directly,
because B reads as a calendar rather than a timeline.** "Make sure the
timeline has the additional aspect of like a line or branching line/tree-like
graph view because right now it is more like a calendar" — accurate, and not
a defect in B so much as B answering a different question well. A grid
answers "what happened around this date, across every category at once." A
line answers "what was the shape of this one thread over time" — the thing a
grid genuinely cannot show: two notes three months apart in the same band
read as unrelated dots in a grid, and as one continuous line in the new view.
Both stay — a `#timeline-view` picker (Grid / Line) beside the existing
scale/bands/days controls, sharing the same `/timeline` fetch and the same
`entry_dates`-driven data (§10A) — this is a second reading of it, not a
second request.

**What actually shipped, against the shape sketched above:**

- **The spine and branches are real** — an SVG line at the top for the plain
  chronological reading, and one lane per band below it, each connected to
  the spine by a stub at the x-position of that band's *first* note, exactly
  the rule this section originally specified.
- **The branch source is category/tag, not §9's cluster detection.** This
  section named linked-note clusters as the other candidate signal and
  reasoned that §9 "already does the hard part of what goes together" — true,
  but that hard part lives behind a separate endpoint (`/graph/structure`,
  built from `entry_links`/similarity) with its own async cost, while the
  grid's own bands (already fetched, already ranked, already capped at eight
  plus "Everything else") were sitting right there. Reusing them keeps grid
  and line as two readings of *the same* grouping the toolbar already lets
  you pick, rather than the grid silently meaning one thing and the line
  meaning another. A cluster-based branch view is still a real, different
  option — it would want its own `group=cluster` value alongside
  category/tag/none, not a replacement for this one.
- **Branch start is automatic and literal, not a windowed heuristic.** The
  "automatic vs manual, and what counts as a gap" question this section left
  open turned out to have a simpler answer once the branch source was a
  *band* rather than a detected cluster: a band's membership is already
  decided (by category or tag, not by recency), so there is no "does this
  note still belong to the thread" judgement call left to make — every note
  in the band is on its lane, in date order, full stop. The one automatic
  decision that's left — a band with a single note draws no line and no
  stub, just a dot on the spine height itself if it's the only band, since a
  "thread" of one note is not a shape — falls out of the same "no note
  history, nothing to show" cases §37J and others already established
  rather than needing a rule of its own.
- **"Rejoins the spine" wasn't built.** A branch runs its full length at its
  own lane height and never returns to the spine — reads closer to a
  git-log's parallel refs than a river diagram, which is a smaller, more
  honest shape for what "these notes share a category, some of it long ago"
  actually is. A visual rejoin would have implied "this thread concluded",
  which the underlying data — did anything stop being tagged this way, or did
  the user just stop writing — has no way to tell apart.

**A real bug found and fixed while verifying in Chromium**: the connector
stub between the spine and a deep lane is a plain vertical SVG line with
`fill: none`, which does not stop it from being hit-tested along its stroke —
and a deep band's stub runs from the spine down *past* every shallower band's
lane on the way there. Painted after them (later bands sit lower, later in
the DOM), it silently ate clicks meant for dots in the lanes above it: the
first click attempt on a real note resolved to the stub underneath instead.
Fixed with `pointer-events: none` on the spine, every stub and every
connecting line — none of the three is meant to be interactive, only the
dots and labels are, and a decorative stroke has no business intercepting a
click through to what's under it.

**Verified in Chromium**, not just read: grid and line against real seeded
notes across four categories and a multi-level reply thread, both grouping
modes (category giving four lanes, tag collapsing to the single-band/no-stub
case since the test notes were untagged), no `NaN` in any drawn coordinate,
switching Grid → Line → Grid back doesn't lose or duplicate anything, and a
dispatched click on a dot correctly opens it in Notes → Browse. **One thing
the verification could not show**: the seeded test notes were all created
within the same short run, so every date tick along the spine rendered as
the same day and same-band dots mostly overlapped — the date-scale math
itself checked out (confirmed via the coordinate check above, and the
correctly-shaped result at whatever span `d3.scaleTime` was actually given),
but nobody has looked at this view against a notebook that genuinely spans
weeks or months. Look there first if the tick labels or spacing are ever
reported as wrong.

**Data shape:** no new table, as planned — this reads `entry_dates` (§10A)
and the existing category/tag grouping (§9's cluster grouping is not used,
see above) the same way B does; the only new state is per-view (grid vs
line), a `localStorage` preference (`timeline-view`), not a migration.

**Still open in B (the grid view):**

- **Events as bands.** The shape this slots into: one more `group` value, once
  there is an `events` table. Places and themes can be derived from what is
  already stored; events cannot.
- **Reminders and their completion** as points on the axis.
- **Zoom from days to years as a gesture**, rather than a bucket picker.

**Data shape:** a new `events` table (`title`, `at`, `precision`, `kind`,
`entry_id?`, `source`), plus `entry_dates` for resolved expressions. Both
additive.

---

## 11. Performance, accuracy and AI efficiency

### Headroom — evaluated, not adopted

Asked: *"is it worth trying to analyse and implement something like headroom
for token efficiency?"* ([headroomlabs-ai/headroom][hr] — Apache-2.0, 62k
stars, active). It compresses tool outputs, logs and RAG chunks before they
reach the model: 60–95% off JSON, 15–20% for coding agents, with benchmark
accuracy held. It is a good project. It is the wrong fit here, for three
reasons that are about **this** app rather than about it:

1. **There is no token bill.** Ollama runs on the user's own machine, so a
   token costs latency and context window, not money. Headroom's headline
   numbers are savings on a metered API.
2. **It would compete for the same CPU.** The compression path wants ONNX
   Runtime and a transformer of its own, running immediately before the local
   LLM on the same hardware. Saving 1–2k tokens of prefill by spending an
   inference pass is very likely net-negative on wall-clock for a 7B model on
   a laptop — and it needs AVX2, which is not a promise this app can make.
3. **The JSON it would compress is the JSON that cannot be compressed.**
   This one was worth measuring rather than assuming, and the measurement
   moved the answer. A representative agent prompt — ten retrieved notes, two
   turns of history, focused tools:

   | Part | Chars | Share |
   | --- | ---: | ---: |
   | System prompt (prose) | 2,521 | 34.4% |
   | History (prose) | 77 | 1.1% |
   | Notes + question (prose) | 1,381 | 18.9% |
   | **Tool schemas (JSON)** | **3,340** | **45.6%** |
   | Total | 7,319 | |

   So the prompt *is* nearly half JSON — more than expected. But that JSON is
   the **tool schemas**, and Headroom compresses tool *outputs*, logs, files
   and RAG chunks. A schema is a contract the runtime parses to constrain the
   model's tool calls; compress it and the calls stop being valid. It is the
   one JSON block in this prompt that has to go verbatim.

   What is genuinely in scope: the notes (18.9% — this is the RAG-chunk case
   Headroom is built for) and the tool results appended during a loop, which
   are already hand-shaped summaries (`_note_summary`: id, preview, category,
   tags, dates). At its own headline 60% on the addressable part, that is
   roughly 11% off the prompt — real, but not the 60–70% the numbers suggest
   at a glance, and not worth ONNX Runtime to get.

   **The 45.6% is still the thing to attack — just not with compression.**
   `focus_for` already took it from 10,215 to 3,340 characters. Getting it
   lower is more schema pruning: shorter descriptions, fewer tools per focus,
   dropping parameters with obvious defaults. That is the highest-leverage
   work left in this section and it costs nothing but care.

Set against a **hard** cost: ONNX Runtime plus a model download, in an app
whose whole proposition is offline, self-contained and light — one that
vendors d3 and p5 locally rather than take a CDN.

**What was worth taking from it, and cost nothing:**

- ~~**Prefix-cache alignment** (their CacheAligner)~~ **done, and it found a
  real bug.** The idea is to keep the front of the prompt byte-identical so
  the provider's KV cache survives. Checking ours against that: the system
  prompt carried `local.isoformat()` — *microseconds* — above the history and
  the notes. Every round of every turn differed from the last, so Ollama's
  prefix cache could never hold anything below that line, and each round of a
  tool loop re-read the entire prompt. Now to the minute, which is identical
  across the rounds of one loop and still correct for everything the app does
  with it ("remind me in 10 minutes" is not resolved to the second).
- ~~**Reversible compression** (their CCR — send a short form, let the model
  fetch the original on demand)~~ **done.** A note now goes into the prompt
  capped at `MAX_NOTE_CHARS` (900), cut with a marker naming the call that
  reads the rest: `… [cut — call get_note(7) to read it in full]`. Safe only
  because the model can undo it, which is the whole idea — and the tools guide
  already told it to call `get_note` before quoting. Most notes are a line or
  two and are untouched; ten notes of 4,000 characters used to be 40,000 and
  now fit the budget.
- **Verbosity steering.** Output tokens are half the latency and are not
  budgeted at all. A style hint already exists; a length hint does not.
  Asked for as a bigger idea — a **quick / normal / detailed** picker on chat
  and agent turns, where quick trims the length hint (and, on a model that
  supports it, disables its own "thinking") and detailed asks for the
  opposite, with the option to pin a specific model to each level rather
  than always using whichever is set in Settings → Models. That's a UI and a
  prompt change, not a new capability — the pieces (a style hint, a
  per-purpose model already existing for chat/embedding/utility) are already
  there; this is a preset over them.
- **Temperature and sampling parameters, not just length — asked for
  directly.** "Is it a good idea to change model temperature and other
  parameters, as well as the amount of thinking, based off the type of
  task?" Yes, and it's the same preset idea as the bullet above, widened:
  quick/factual work (recalling a note, answering "when did I write X")
  wants low temperature and a short or disabled thinking budget; open-ended
  work (drafting, brainstorming) wants both opened up. Ollama's
  `/api/chat` already accepts `temperature`, `top_p`, and — on models that
  support it — a `think` toggle or budget per request; none of this needs a
  new capability from the model side, only a place in the request that
  today always uses whatever the default is.
  - **Manual first, automatic second — same ordering logic as model
    routing below, and for the same reason.** A per-mode set of parameters
    the person picks (or accepts a sensible default for) is honest about
    being a preset. Auto-adjusting parameters *by task* needs the same
    "how hard is this turn" judgement call that model routing does, so it
    inherits the same risk of being wrong confidently rather than
    obviously.
  - **Auto-adjusting *by model*, though, is worth doing regardless of the
    task question, because it's not a guess.** Not every installed model
    supports a thinking toggle, and the ones that do vary in what "off"
    means for reasoning quality on a given task. `Settings → Models`
    already knows which model is loaded — extending that to record what
    the model actually supports (thinking toggle, its context length, a
    sane default temperature) means a quick-mode preset can *fail closed*
    gracefully on a model that doesn't support the setting instead of
    sending a parameter Ollama silently ignores or errors on, which is a
    real gap regardless of whether task-based auto-routing ever happens.
- **Dynamically switch models by task complexity.** A related but separate
  ask — "optional," and worth keeping optional: a short factual question
  routed to a small fast model and an agent job routed to a larger one,
  automatically. The honest version of this needs a cheap way to estimate
  "how hard is this turn" before picking a model, which is itself a model
  call or a heuristic that will be wrong sometimes — worth prototyping as a
  manual per-mode assignment (the bullet above) before attempting to guess.
- **A model comparison / test-run feature — asked for directly: "test and
  compare different models for use in the application so you can choose the
  best one."** This is the eval harness below, pointed at a different
  variable. The harness already needs a fixed set of representative prompts
  to catch regressions over *time*; running that same fixed set against
  every installed model in one pass, and showing the results side by side —
  tokens, latency, and (for the ones with a known-good answer, like "what
  did I write about X") whether it actually got it right — answers "which
  model" instead of "did this get worse." One dataset, two use cases: a
  scheduled or CI-triggered run watches for regressions on the model
  currently in use; a manually-triggered run compares candidates before
  switching. Worth building as one feature with two entry points rather
  than two separate ones, since duplicating the prompt set would mean they
  drift out of sync with each other.

**Before any more of this: measure.** §11a was done by counting characters of
tool schema, which is why it worked. "A 3-turn chat shows 8.7k tokens" is not
yet broken down into system / tools / history / notes / question, and until it
is, the next optimisation is a guess.

[hr]: https://github.com/headroomlabs-ai/headroom


**Why.** Asked: "make sure all the code, processes, and AI usage is fully
optimised and efficient", and "more ways to make the program and AI more
accurate, usable, capable, and faster".

**Measure first** — there is no profiling in the repo, so where a chat turn
spends its time is currently a guess.

- **Prompt reuse.** Every agent round resends the whole message list; Ollama's
  `keep_alive` and prompt-prefix reuse are never set.
- **Cap tool output.** Return previews by default, full text only on request.
- ~~**Hybrid retrieval** (semantic + keyword, reciprocal-rank fusion)~~ **done**
  — HISTORY.md's "Retrieval reads the question before searching it": both
  searches run and their rankings fuse by RRF, not either/or. Flagged stale in
  this session's backlog audit; was still marked open here.
- **Re-ranking** with a small cross-encoder over the top-20, behind a setting.
- **Batch embeddings** — the backfill embeds one note at a time.
- **Warm the model** so the first chat doesn't pay the load cost.
- **Frontend**: `app.js` is now ~20k lines (was ~12k when this line was
  written — it has not shrunk) parsed on every load, and `renderEntries`
  rebuilds the entire list on any change. See §31's module-split
  recommendation in ANALYSIS.md, still unaddressed.
- **Context warning** as the window fills — the per-turn cost is already shown.
- **A per-chat token/context meter the user can actually see.** Asked twice,
  once directly ("a better way to track tokens and other things") and once
  from the outside review ("prompt inspector, token counts, latency
  breakdown"). §11a already measures this server-side (prompt composition is
  logged per round); what's missing is surfacing it in the Chat tab itself —
  a small "~1.4k tokens this turn, 3.1k fixed overhead" readout, not just a
  log line only visible in Settings → Logs.
- **An eval/benchmark harness tied to changes here.** Every optimisation in
  this section so far has been measured by hand, in one session, against
  whatever the person doing it happened to type. A small fixed set of
  representative prompts (a few notes, a few questions, a skill run) that CI
  or a pre-release check can run against a real Ollama model and report
  tokens/latency/answer-still-correct would catch a regression before a user
  does. The outside review's suggestion that actually survived — not because
  of any specific tool, but because "measure first" is already this
  section's own rule (§11a) and there's no repeatable way to do it yet. The
  same fixed prompt set is also what the model-comparison feature further
  down this section runs, against every installed model instead of just the
  one in use — one dataset, watching for regressions over time and
  differences across models with the same tool.
  - **Worth tracking retrieval quality specifically, not folding it into
    "answer-still-correct."** A wrong answer can come from the model
    reasoning badly over the right notes, or from search handing it the
    wrong notes to begin with — those are different bugs with different
    fixes, and a single pass/fail per prompt can't tell them apart. A known
    query with a known correct note (or set of notes) lets the harness
    check "did search find the right thing" separately from "did the model
    say the right thing," which is what actually lets a hybrid-search or
    re-ranking change (§11) be judged on its own rather than blamed on or
    credited to whatever model happened to be loaded.

**§11a — token usage in chats.** Asked directly: "is there a way to reduce
excessive token usage in the chats?" A three-turn conversation showed 8.7k
tokens. Where it goes, cheapest fix first:

- Retrieved notes are re-sent in full on every turn, including turns that are
  a follow-up to the previous answer and need no new retrieval at all.
- `MAX_CLIENT_HISTORY` turns of prior Q&A go up each time, whole.
- Tool results accumulate within a turn (already capped by
  `TOOL_RESULT_BUDGET_CHARS`, but the cap is generous at 24k characters).
- The system prompt is long and grew again this session; it is re-sent every
  round of every turn, which is where Ollama's prompt-prefix reuse and
  `keep_alive` would actually pay.

**Half of this has now been measured, and the answer was not where anyone was
looking.** The *fixed* overhead — system prompt plus every tool schema, sent
before a word of the question, the notes or the history, on each of up to
`MAX_ROUNDS` rounds — is ~12,400 characters, about **3,050 tokens**. Of that,
**9,957 characters (77%) is the tool schemas**, not the prose. Trimming the
guide was the smaller half by a wide margin.

`agent.PROMPT_BUDGET_CHARS` now caps it and `tests/test_prompt_budget.py`
fails the build if it drifts past, because this grows invisibly: every tool
added costs the same budget and nothing else in the suite would notice.

**Why it matters more than the arithmetic suggests.** Ollama defaults to a
4096-token window unless the model declares otherwise, and overflow is dropped
from the *front* — which is the system prompt. A 3B model (granite4.1:3b,
llama3.2:3b, qwen3.5:2b — the ones this is aimed at) that overflows therefore
stops knowing it has tools at all, and reports as **"the AI won't use
tools"**, which is the hardest possible symptom to trace back to a long
prompt. Settings → Tools is the user-facing escape hatch, and there is now a
test proving that switch reaches the wire rather than only the executor.

**The remaining win is offering fewer tools per turn, not trimming more
words.** 28 schemas go up every round whether the question is "how many notes
do I have" or "remind me to call mum". A relevance filter — or a small
always-on core plus an opt-in rest — is worth more than anything left in the
prose. Do it before §21 adds skill tools to the same budget.

Still unmeasured, and still worth measuring before cutting: which of the
*variable* costs above dominates a real 3-turn chat. Log the prompt-token
count per round. Summarising older history is the usual answer, but it costs a
model call, so it should be the last resort rather than the first.

---

## 12. Does the AI know it is an agent?

**Why.** Asked: "does it know it is an agent and can use tools and skills freely
and in multiple turns if necessary?" and later, "I need agents to use tools more
and better if they are required."

**Honest answer: partly.** `TOOLS_GUIDE` says tools exist and forbids claiming a
save that didn't happen. The loop runs to `MAX_ROUNDS = 6`. What it is *not*
told:

- That taking several rounds deliberately is expected — plan, act, check, answer
- That skills exist at all (the tools are there; the prompt never mentions them)
- What to do when a tool fails — the error is returned with no guidance, so
  small models give up or repeat the same call
- That a search snippet is rarely enough and `read_url` exists
- What the user can already see (the step timeline), so it stops re-narrating

**Done since.** `TOOLS_GUIDE` now says that taking several turns is expected
("look something up, read what you found, look up anything still missing, then
answer"), that a search result is a clipped sentence and `read_url` exists,
and that the user can already see the tool timeline so it should stop
narrating its process back to them.

Failed tool calls now carry a `what_to_do` field matched to the failure — a
missing id says to search rather than guess another, a disabled tool says to
stop calling it, bad arguments say to re-read the schema and retry once — and
an identical call that fails twice is told so explicitly. Previously a failure
was a bare `{"error": …}`, and small models either apologised and stopped or
looped on it until the round limit ran out.

**Still to add:** an explicit `plan` step rendered at the top of the timeline
(build it with §21, which needs the same structure); a "required tools" hint
for requests that clearly need one; and a nudge when the model answers a
notebook question without having searched.

**Note the ordering.** None of this fixes "the AI won't make me a skill" —
that fails because `save_skill` can only store a prompt string, so there is
nothing for a better-instructed model to call. §21 first.

---

## 13. Web search effectiveness

**Now that SearXNG actually works (§8b), what's left is refinement, not
bug-fixing** — asked for directly: "the whole search UI just needs
refinement, and make sure that the search methods are as secure and private
as possible." Split into the two things actually asked for.

**Quality and UX:**

- **Query expansion** — two or three phrasings, results fused
- **Read before answering** — tell the model a snippet is rarely enough
- **Cite sources** with the domains actually read
- **Per-turn result cache**
- ~~**SearXNG as the recommended default** once §2's install path
  works~~ — the install path works now (§8b); worth actually flipping the
  default and updating the README/onboarding copy that still frames it as an
  advanced option
- **Say which engine answered.** DuckDuckGo and SearXNG have different
  privacy properties (§ below) and the person chose one deliberately in
  Settings; the results panel itself doesn't currently say which one served
  a given search, so that choice is invisible at the point it matters
- **Result cards worth reading, not just clicking.** A title and a link today;
  a domain/favicon and a snippet with the matched terms highlighted would let
  someone judge relevance before opening the reader view, the same reasoning
  search engines converged on decades ago
- **Open a result straight into the reader** without a second round trip —
  ties to §3's Browse sub-tab, which is the natural home for this
- **Distinguish *why* zero results came back** in the UI itself, not just the
  log — rate-limited, engine down, genuinely nothing found are three
  different situations and currently look identical to the person searching
- **Deciding *when* to search, not just how well it searches once asked.**
  Asked for as "better agentic web search through chat" — read as being about
  judgement, not just result quality. Today `web_search` is one tool among 28
  the model can choose or not; nothing measures whether it reaches for it
  when a question is actually time-sensitive ("what's the latest version of
  X") versus when it should trust the notebook or say it doesn't know. That's
  a prompting and evaluation question more than a code one — a good
  candidate for the eval harness in §11 to actually track, rather than
  something to "fix" once.

**Privacy and security, specific to search** — extending §8b's general
security pass with what's particular to this feature. What's already true:
only the search words leave the machine, never notes; the request looks like
an ordinary browser rather than naming the app; no cookies survive between
searches; queries go by POST so they don't land in access logs; tracking
parameters are stripped from result URLs before they're ever shown; a
self-hosted SearXNG keeps the query on the user's own network entirely
rather than reaching a third party at all. Worth checking on top of that,
now that SearXNG is a real running thing rather than a plan:

- **SearXNG's own outbound behaviour.** A default SearXNG install can be
  configured to query dozens of upstream engines, including ones with their
  own tracking, and some engine plugins hit third-party autocomplete/suggestion
  endpoints unless turned off — the `tracker_url_remover` plugin was already
  found to break startup entirely (§8b, bug 5) and disabled; worth a pass
  over the *rest* of the generated `settings.yml` for anything else
  defaulting to "on" that shouldn't be, not just the one that crashed.
- **No client-side favicon/thumbnail fetching per result.** A common leak in
  search UIs: fetching each result's favicon from the result's own domain, at
  render time, tells that domain someone searched and got them as a result —
  before the person has chosen to visit anything. Worth confirming the result
  card ideas above don't introduce this by loading icons live rather than
  bundling a small generic set.
- ~~**SearXNG bound to localhost, not the LAN.**~~ **confirmed for the source
  path, and it was wrong for docker.** The instinct behind this item — don't
  assume it inherited the same default — was right, and the two paths had
  drifted apart. `_start_from_source` sets `SEARXNG_BIND_ADDRESS=127.0.0.1`
  and always did; `_start_docker` ran `-p 8888:8080`, which publishes on
  **every** interface. That is docker's default and not what the plain reading
  of the flag suggests, and it is worse than an ordinary open port because
  docker installs its own firewall rules — a host firewall set to refuse 8888
  never sees the packet. The exposure is not abstract: SearXNG has no auth in
  front of it, so anyone on the same network gets a free proxy to the internet
  *and* a log of everything the owner has searched for. Now
  `-p 127.0.0.1:8888:8080`. Publishing is fixed at container-create time, so a
  container an earlier version made is detected via `docker inspect` and
  recreated rather than started as-is; one that cannot be inspected is left
  alone rather than destroyed on a guess.
- **A visible statement of what's true**, not just true in the code. The
  Privacy and security section of the README already says most of this
  clearly; worth linking it from Settings → Web search directly, next to the
  engine picker, so the privacy properties are legible exactly where someone
  is deciding whether to turn search on — rather than something you have to
  already know to go and read.

---

## 14. More tools worth adding

`create_document` / `edit_document` (the AI can read documents but not write
them) · `related_notes(id, depth)` (§9) · `move_notes` (bulk re-file) ·
`merge_notes` · `export_notes` · `find_similar(note_id)` · `stats` ·
`add_event` / `list_events` (§10) · `set_preference` over a small allowlist so
"make your answers shorter" works · `unlink_notes` / `delete_reminder` (§21,
gives skill runs a real undo for those two change types) ·
~~`create_category` / `merge_categories` / `delete_category`~~ **done, plus
`rename_category`.** Asked for indirectly ("more tools for managing…
creating, editing, deleting, and applying categories"); the agent could file
a note into a category it had no way to create, which is the wrong half of
the job. They take **names, not ids** — the model has never seen an id — and
a miss lists what does exist, because "no category called Work" with nothing
after it invites another guess rather than a look.

Three decisions in there worth not re-litigating:

- **`merge_categories` is its own tool even though `rename_category` already
  merges** when the new name is taken. That is right for a rename and a
  terrible way to *ask* for a merge: the model would have to know a name was
  already in use to predict what its own call did.
- **A rename that merged offers no undo.** Once both sets of notes sit in one
  category nothing records which came from where, so an "undo" would move all
  of them back — inventing a history that never happened, which is worse than
  having none. `create_category` and a plain rename do offer one.
- **Lookup is exact-match first, then case-insensitive.** Purely
  case-insensitive resolved both "Work" and "work" to whichever row came back
  first, so `merge_categories(from="work", into="Work")` found the same
  category twice and refused itself — on precisely the duplicate the user was
  trying to clear up. Caught by a test, not by inspection.

> ~~**⚠ The prompt budget is now the binding constraint on this section.**
> There is room for roughly one more tool on this list, and then there is
> none.~~ **Lifted — the constraint was an assumption, not a fact.**
>
> Adding these four did break `tests/test_prompt_budget.py`, exactly as that
> test exists to do, and the first draft went past the 4096-token *window* as
> well. But asked directly — *"if adding more tools is an issue, can we change
> or improve how tools are used so that doesn't become an issue?"* — the honest
> answer was that 4096 is **Ollama's fallback when a model declares nothing**,
> not a property of any model anyone actually runs. A current 7B declares 32k
> or 128k, and rationing it against 4096 withheld tools for nothing.
>
> So the fixed budget is gone. `tools.within_budget` fits the schemas to the
> window the model *reports* (`ollama_client.usable_context`, via `/api/show`),
> spends at most a quarter of it on schemas, drops the least relevant tools
> when they do not fit, and logs what it held back — so "the AI didn't use the
> tool I expected" is distinguishable from the model choosing not to. Core
> tools go first: a model that cannot search or read a note cannot answer
> anything.
>
> | Model window | Tools sent |
> | --- | --- |
> | 2,048 | 4 (core only) |
> | 4,096 | 9 |
> | 8,192 | 19 |
> | 16,384+ | all of them |
>
> **What this means for the rest of this section: add the tools.** The cost of
> one more is no longer "does it fit in a constant" but "what gets sent
> first", which is a per-turn question the app now answers by itself. The
> remaining lever, if a 4096-class model ever needs more room, is
> `focus_for`'s cues rather than the registry's size.

---

## 15. Appearance: more of everything

Asked for: "more options for the appearances — fonts, colours, sizing, themes,
palettes."

- **Fonts**: beyond system/serif/mono — a curated set including a dyslexia-
  friendly face, plus per-surface choice (UI vs note body vs code)
- **Sizing**: independent UI scale and reading size; line-height and measure
  (line width) controls, which matter more for long notes than font size
- **Colours**: per-surface accents, a custom palette builder (pick a base,
  derive the set), and import/export of a palette as JSON
- **More themes and palettes**, and a "surprise me" that generates a coherent
  one
- **Save a custom combination as your own theme**, not just a custom palette.
  Asked as "allow for saving of custom appearances and themes" — the palette
  builder above already covers colour; a theme is colour *plus* light/dark,
  font, density, radius and glass (see "Themes vs palettes?" in the closing
  Q&A), so saving one as a named preset means capturing all of
  `appearancePref`, not just the swatches.
- **Live preview** while hovering a theme, before committing
- ~~Fix the reported bug where individual controls resist change under a
  theme~~ done (§8): a palette always beat an accent on CSS source order, and
  clearing an accent never un-applied it

---

## 16. Sweeping UI quality-of-life

- ~~**A status bar along the bottom**~~ **done.** Flagged stale by this
  session's backlog audit — `#status-bar`/`renderStatusBar()` in `app.js`
  already exist and render. See the correction on the second, near-duplicate
  bullet further down this list too.
- **Sorting and grouping saved chats** — also from IDEAS.md and also homeless
  until now. Conversations sort by recency and nothing else; there is no "by
  length", "by which model answered", no folders, no grouping by topic. The
  data to sort by is already stored per turn (the model, the token cost, the
  timestamps), so this is a list-rendering job. The IDEAS note suggests an
  agent tool and a skill for it too, which would fall out of §14's shape once
  the sort exists.
- **Undo toasts** for anything soft-deleted, instead of confirm dialogs
- **Optimistic UI** — a saved note appears instantly and reconciles
- **Consistent empty states** and loading skeletons
- **Keyboard**: `/` focuses search, `g`+letter jumps tabs, Escape closes every
  overlay
- **Bulk selection** in the note list
- **"What changed" after an AI action** — chips say what ran, not what it did
- **Confirm on close** with unsaved text
- **Relative timestamps** everywhere, absolute on hover
- ~~**Dashboard**: audit every quick-access button actually lands where it
  says~~ done (§8) — every quick link now checked from all three Notes
  sub-tabs. Still worth doing: **add the ones that are missing**
- **Collapsible sidebars.** Asked for directly. The Notes, Chat and Documents
  sidebars are fixed-width; a narrow window (or someone who just wants the
  reading room back) has no way to fold them, distinct from the mobile
  breakpoint that already hides them entirely.
- ~~**A status bar pinned to the bottom.**~~ **done, same item as above** —
  a second, near-duplicate bullet for the same ask; both are satisfied by the
  one `#status-bar` that now exists.
- **Keyboard-only navigation, confirmed end to end rather than assumed.**
  §19 already covers focus traps and screen-reader gaps; this is narrower
  and more basic — can someone move through the note list, open a note, edit
  its tags, and file a reminder without a mouse touching anything? The
  bullet above already has a few keys bound (`/`, `g`+letter, Escape); the
  gap is whether the note list itself supports arrow-key movement and Enter
  to open, which is the one interaction pattern used constantly enough that
  its absence would be felt every session, not just noticed in an audit.
- **A global quick-capture hotkey in desktop mode.** Not asked for directly,
  but the app's own pitch — "just capture, a local AI files it" — implies
  capture should be as close to zero-friction as opening the app currently
  isn't. `--desktop` (§7) already owns a native window; a system-wide
  hotkey that pops a capture box without switching to the app at all (the
  way Apple Notes' quick note or Notion's quick capture work) would make the
  core loop genuinely faster than opening a tab, typing, and filing —
  rather than just as fast. Browser-tab mode can't do this (no OS-level
  hotkey access from a page), so it's specifically a `--desktop` win, and
  worth scoping alongside the rest of §7's packaging work rather than
  separately.

---

## 17. Use cases the app can't serve yet

- ~~**Meeting notes**~~ **record → transcribe → note built; action-item
  extraction still open.** A "🎙️ Meeting notes" dashboard card opens a
  `#meeting-overlay` with its own record/stop/elapsed-timer controls, POSTs
  the clip to a new `/voice/transcribe-meeting` endpoint (a 300MB ceiling
  against `/transcribe`'s existing 25MB — "a meeting, not a podcast" needed
  its own sanity limit, not the spoken-note one raised), then hands the
  transcript back in an editable textarea before it becomes a note — the
  same "review before it's saved" shape the persona-peek and
  compression-summary features already use. Saved with a `meeting` tag so
  every meeting note stays findable as a class regardless of what category
  the AI files it under. **Extracting action items into reminders was
  deliberately not built**: it needs a real model call parsing free text
  into multiple structured reminders, which is a different shape from the
  single-phrase parser `POST /reminders/parse` already does, and this
  sandbox has neither faster-whisper nor a running Ollama to verify a new
  prompt's behaviour against — guessing at it blind is exactly what
  CLAUDE.md's standing caveat warns against. Verified everything that could
  be: the full record → (faked) transcribe → review → save round trip in
  Chromium with a fake microphone device (`--use-fake-device-for-media-
  stream`), the graceful "faster-whisper not installed" path (real, since
  it genuinely isn't installed here), and the saved note landing in Notes →
  Browse with the right tag via the API. **Not verified**: a real
  faster-whisper transcription of real audio — the same gap the pre-
  existing single-note dictation feature already has and documents.
- **Reading and research** — the Browse section (§3) plus highlights saved as
  notes back-linked to their source
- **Journalling** — a daily-note pattern; the pieces exist, nothing ties them
- **Task management** — reminders are not tasks (no sub-tasks, projects, or
  "someday"). Commit to it or stay deliberately out.
- **Study / revision** — spaced repetition; access-count and embeddings are
  already stored
- **Sharing one note or document** — no export-one-thing path today
- **A second device** — single-user by design; sync is a much larger decision
  and should be stated as out of scope rather than left implied. Asked
  concretely as "a way to run the app on a mobile device like my iPhone",
  which is a smaller ask than sync: the frontend is already a PWA with a
  mobile pass (Wave F), so a phone on the same network *could* just point a
  browser at it — except the server binds to `localhost` on purpose (§1 of
  `ARCHITECTURE.md`), which is exactly what stops that. Opening it to the LAN
  is a real security decision (anyone on the network reaches an unlocked API
  surface until the password gate, not just the person at the keyboard), not
  a config flag to flip quietly — worth stating explicitly as "possible, not
  yet safe to default to" rather than leaving it unaddressed.
  - **If sync is ever actually pursued**, the shape worth reaching for is
    the one Gemini's (grounded) suggestion named: local-network only —
    mDNS discovery plus a direct connection between two instances on the
    same network, never a public relay — which keeps the "nothing leaves
    the machine unless asked" principle intact in spirit (nothing leaves
    *the network*) rather than quietly becoming a cloud feature. Recording
    the shape without changing the decision above: sync is still a much
    bigger undertaking than the mobile-access question alone, and worth
    staying out of scope until that's a deliberate yes.

---

## 18. Agent quality

The registry is now 28 tools and reaches the whole notebook, documents and chat
history. What's still weak:

- No plan/progress for a multi-step job — the step timeline shows what happened,
  not what remains
- ~~No way to stop an agent turn mid-way and keep what it already did~~ **done**
  — `#chat-stop` aborts the stream, and a partial answer is kept, given its
  action buttons and persisted like any other turn. A turn stopped before it
  wrote anything is left silent deliberately: the user asked for that.
- A tool that fails is reported, but the model isn't told how to recover
- `_CLAIM_PATTERN` catches "I saved it" when no write tool ran — worth extending
  to other claim types
- **The agent only lives in the Chat tab.** Asked for as "allow the agent to
  be accessed from anywhere in the program" — every other tab already has the
  pieces this would reuse (the confirm-before-destructive pattern from design
  principle 6, the plan/step/result UI from §21), so a floating entry point
  that opens the same agent against "whatever I'm looking at right now" is
  more a routing change than a new agent. Before/after comparison on an edit
  already exists in one place — a skill run's changes list shows **View** and
  **Undo** per row (§21) — the ask was really for that pattern everywhere an
  edit happens, not a new mechanism.
- **The agent controlling the screen itself** — "allow the agent to control
  your screen within the application to navigate and make changes… with the
  user able to cancel it at any time". A different and much bigger thing than
  the tool-calling loop that exists today: it means the agent driving the
  frontend the way the Playwright driver in §10 of `ARCHITECTURE.md` drives
  it for testing, not just calling an API. Flagging it rather than scoping
  it — it would need its own cancellation and audit story on top of
  everything §21 already built for tool calls, and it's worth deciding
  whether the tool registry can get there first before reaching for UI
  automation.

---

## 19. Accessibility audit

Deserves one deliberate pass rather than more ad-hoc fixes:

- Focus traps in overlays are inconsistent (some cycle, some don't)
- Colour contrast unverified against WCAG AA for the *new* palettes and themes,
  particularly the glass surfaces
- Screen-reader pass; several dynamic regions announce nothing
- Audit remaining meaningful animations for `prefers-reduced-motion` fallbacks
- Settings screens on a narrow/mobile viewport specifically (§8's
  ideas-parking-lot bug) — worth folding into this pass rather than fixing in
  isolation, since it's likely the same class of breakpoint gap as the rest
  of this list

---

## 20. Backend

- **Async httpx client** — touches the streaming path, which is what makes chat
  feel responsive, so a subtle regression wouldn't show up in tests. Do it with
  §6.
- **Alembic migrations** — the additive auto-migrator cannot rename or drop, and
  won't survive a real schema change
- ~~**Session TTL** — tokens live in memory and never expire~~ **done.** Two
  clocks doing different jobs: idle (12h — you walked away, and the notebook
  locks itself the way a phone does) and absolute (7d — the ceiling a token
  leaked from a proxy log or a synced browser profile eventually hits).
  Expiry closes the vault as well, since an expiry that left the data key in
  memory would be a lock on one door only. The brute-force item it was worth
  pairing with turned out to be built already.
- ~~**Cross-origin requests against the local API — worth checking directly,
  not assuming.**~~ **checked, and it was open. Now closed** by
  `core/security.py:OriginCheckMiddleware`; the reasoning below is why, and
  is worth keeping. Two things the check turned up that the item did not
  anticipate: the session is a *header*, not a cookie, so `SameSite` was never
  the lever here — and the most exposed moment is *before* a password exists,
  when the unlock gate is deliberately open and a drive-by `POST /auth/setup`
  could have claimed the notebook outright. This is the specific way
  "single-user, local-only" apps
  have actually been attacked before, Ollama included: the server isn't
  reachable from the internet, but a malicious page open in *any other
  browser tab* can still have the browser send a request to
  `http://localhost:8000` on the person's behalf, because the browser
  enforces the target's CORS policy, not the attacker's. If `allow_origins`
  is permissive (or if the API trusts a session cookie without checking
  where the request actually came from), a page with nothing to do with
  MemoryMap could read or write notes just by being open in a tab. The fix
  is standard and cheap: check the `Origin`/`Referer` header server-side
  (not just an open CORS policy), and if the session is a cookie, set it
  `SameSite=Strict`. Worth confirming this is already the case before
  treating it as done — it's exactly the kind of thing that's invisible
  until someone goes looking, and the cost of being wrong is every route
  behind the unlock gate.
- ~~**Is SQLite in WAL mode?**~~ **yes, and it already was** —
  `core/database.py` sets it on every connect, with `busy_timeout=5000` and
  `synchronous=NORMAL` beside it. Pinned by a test now. The reasoning below
  is still the reason it must stay. Default (rollback-journal) SQLite locks the
  whole file for the duration of a write, which matters here specifically
  because background AI work (the janitor filing a note, an embedding
  re-index) can be writing at the same moment the person is just reading
  their own notebook. WAL mode lets readers proceed during a writer and is
  usually the right default for exactly this "one process, mixed
  read/write" shape — worth confirming `core/database.py` sets
  `PRAGMA journal_mode=WAL` rather than leaving SQLite's default.
- **What blocks the request thread.** A re-index on switching embedding
  models, a SearXNG install, a daily backup — if any of these run
  synchronously on the same thread that serves requests, the whole
  single-user app freezes for their duration rather than just slowing
  down. Worth an inventory of which long-running operations already run in
  a background thread (§25's health-check screen would be a natural place
  to surface "an indexing job is running" if one is) versus which quietly
  block.
- **Singletons and worker count are coupled, and that coupling isn't written
  down anywhere.** `core/config`, the database connection, the in-memory log
  buffer (§1) and the SearXNG process handle are all singletons per
  `ARCHITECTURE.md` — correct and simple for a single process. If the app is
  ever launched with more than one worker (`uvicorn --workers 2`, or a
  well-meaning perf tweak by someone unfamiliar with the codebase), every one
  of those becomes silently per-worker instead of shared — the log console
  would show a fraction of what actually happened, and two workers could
  each think they own the SearXNG subprocess. Cheap to prevent: either
  enforce single-worker at startup (refuse `--workers > 1` with a clear
  message) or write the constraint down where someone deciding to scale it
  would actually see it.
- **No enforced page size on list endpoints, as far as this document
  establishes.** A notebook that's grown for years, all returned from
  `search_notes` or the note list in one response, is a real failure mode
  for a "just works" app that's supposed to degrade gracefully rather than
  time out. Worth confirming every list-shaped route has a cap and a
  cursor/offset, not just the ones that happened to need one during testing
  on a small notebook.
- **What happens when Ollama hangs, rather than errors.** The app already
  handles Ollama being *off* gracefully (design principle 2) — a request
  that never comes back is a different failure, and a more likely one on
  the hardware this app actually targets: a model loading for the first
  time, or a machine too small for the model it's asked to run, can leave a
  request pending indefinitely rather than failing fast. Worth a timeout
  with a clear message ("still waiting on Ollama — this can take a minute
  the first time a model loads" past some threshold, then a real failure
  past a longer one) rather than a spinner with no ceiling.
- **Crash-safe recovery for a re-index or a model download interrupted
  mid-way.** If the app is closed, or the machine loses power, while an
  embedding re-index or a model pull is running, does it resume cleanly or
  leave a half-written state that surfaces as a confusing error next
  launch? Worth checking directly — the health-check screen in §25 is the
  natural place to both detect this ("an interrupted re-index was found —
  resume or restart it") and report it, rather than a repair action with
  nothing that would ever notice the problem needed fixing.

---

## 21. Skills — rebuilt; what is left

**Why.** Reported directly: "the skill system also needs a remake. The way
skills are used currently, and what the skills are at the moment, are
incorrect and are closer to just presaved mini prompts. I keep on trying to
get the AI to make me some skills in the chat but it doesn't recognise that it
needs to use tools and how to properly utilise the workspace."

**That description was accurate**, and the shape has changed. A skill was
`{name, prompt}`; clicking one dropped its prompt into the chat box, and
`save_skill` stored a name and a string — so "make me a skill that files my
inbox notes" could only produce another sentence, because the storage had
nowhere to put the steps. Fixing the prompt alone would not have helped.

**What a skill is now** (`ai/skills.py`, one validator for every way in):

- **prompt** — what it should do. A skill with only this behaves exactly as it
  did before, which is why nothing was lost.
- **steps** — ordered instructions, numbered into the run instruction and
  drawn as a plan at the top of the step timeline before anything runs.
- **tools** — an explicit allowlist. Only those schemas go on the wire and
  anything outside the list is refused at execution, so it is a safety
  property and not just a prompt. It is also §11a: the full registry is 10,215
  characters of schema on *every round*; "🏷 Auto-tag my notes" ships 1,963.
- **inputs** — declared `{{placeholders}}`, asked for before the run. A
  placeholder with no input behind it is refused on save, in the editor and in
  `save_skill` alike, because the alternative is a model handed a literal
  `{{tag}}` inventing a value.

Two decisions worth keeping:

**The built-in skills moved out of `app.js`** and are served from
`GET /skills` with the user's own. The server could not previously resolve a
skill the user clicked, `list_skills` answered "you have none" while ten were
on screen, and every field added to a skill had to be added twice.

**The declared tools are named in the instruction text as well as narrowed on
the wire.** Not redundancy: the reported failure was a model that *had* tools
and did not know it was meant to act, and telling a 3B model "use `tag_note`"
is what makes it reach for one.

**And what running one now does** (`ai/skill_runner.py`):

- **One turn per step.** Not one request carrying a numbered list — that is a
  plan the model may ignore, and a 3B model given four instructions at once
  does the first and narrates the rest. The app knows which step is running,
  so the UI ticks them off as they finish.
- **A step that fails is named**, with the reason, and the run stops there
  instead of ploughing on. §21 asked for exactly this.
- **The run ends in what changed**, not prose claiming something happened:
  a list of every write, each with a **View** and — where an inverse exists —
  an **Undo**. The undo is a tool call captured *before* the write and run
  through `POST /chat/tools/execute`, the same endpoint the confirm button
  uses. It is stripped out of what the model sees, since every field left in
  a tool result is resent on every later round.
- **Every built-in is a real job**: steps, tools, and declared inputs asked
  for in one dialog before the run. "Draft an email" asks who and what
  instead of spending a chat round on it.

**Still to do:**

- **Re-running a past run.** A skill is repeatable; a *run* is not yet
  something you can replay over a different set of notes.
- **Undo the whole run**, rather than one change at a time. Gemini's
  (grounded) suggestion was a heavier version of this worth naming
  explicitly: a local, silent version-control snapshot before a bulk
  operation runs, so a bad auto-tagging pass or a skill gone wrong can be
  rolled back wholesale rather than change by change. This sits between two
  things that already exist rather than needing to be built from nothing —
  daily backups (§ "Where your data lives" in the README) are too coarse
  (once a day, not once per run) and per-change Undo above is too fine (a
  20-note bulk tag is 20 things to individually undo); a snapshot taken
  specifically before a skill run or bulk tool call, kept for a short
  window, is the missing middle size. Worth building as "one more backup,
  triggered by an event instead of a timer" rather than actually reaching
  for git — the existing backup mechanism already solves the storage
  question, just not the timing.
- **Links and reminders have no inverse tool**, so those two changes are
  listed without an Undo. `unlink_notes` / `delete_reminder` would fix it, at
  the cost of two more schemas in the per-round budget (§11a) — worth doing
  when something else needs them too.

---

## 22. Reported in use, not yet done

Small, concrete, each seen in the running app:

- **Take me to the thing the agent just changed.** Asked for directly: *"if the
  agent performs a task like making a note, a button or link will appear to
  navigate to the new note or document or whatever was changed."*

  Today a tool run reports **what** it did — `📝 Created note #41` — and then
  leaves you to go and find #41 yourself, in another tab, by searching for text
  you already know the app knows the id of. The result row is one click away
  from being the shortest path to the thing and instead is a dead end.

  Most of the machinery is already there and this is mostly wiring:
  - Tool results already carry a `label`, and the undo work (§21) already
    proved the runner can put **buttons on a result row** — Undo is one, so a
    View beside it is the same shape.
  - `flashEntry(id)` already exists and does exactly the right thing: switch
    to Notes, scroll to the note, highlight it. The Rediscover widget uses it.
    Documents, reminders and categories need their equivalent.
  - What is missing is that handlers return prose, not a **target**. The fix
    is for each writing tool to include something like
    `{"target": {"kind": "note", "id": 41}}` in its result, and for the chat
    UI to render a View button whenever one is present. Doing it per-tool
    rather than by parsing the label keeps it honest — a label is for reading,
    and pulling an id back out of one is the kind of thing that works until
    someone rewords the sentence.

  Worth covering every kind the agent can create or change, not just notes:
  notes, documents, reminders, categories, tags, links. `create_note`,
  `edit_note`, `pin_note`, `tag_note`, `link_notes`, `set_reminder`,
  `create_category` and the rest all have an obvious destination.

  Two things to decide when it is built: whether a **destructive** result
  should offer to navigate to the recycle bin rather than a note that is no
  longer there, and whether a skill run's final "what changed" list should
  carry the same buttons (it should — that list is where a multi-step run's
  results actually get read).

- ~~**Magic Add schedules relative reminders a whole timezone offset late.**~~
  **fixed.** Reported: *"I just put a sentence in the magic add text box in
  reminders saying 'play league of legends in half an hour' and it scheduled
  it for 10am tomorrow??"* Two faults, and the phrase was the smaller one.
  The route built the user's clock as `utcnow() + offset` — aware, tagged UTC,
  actually holding local wall-clock — so the model was told an offset that was
  a fiction, answered with the same fiction, and was then trusted, skipping the
  correction. Error = exactly the user's UTC offset, so ten hours at UTC+10 and
  zero at UTC, which is why nothing caught it. See trap 5b. Separately, "in
  half an hour" was being handed to a 3B model to do arithmetic on; "in …"
  phrases are resolved by rule now, before the model, which also makes Magic
  Add work with Ollama off. Fifteen phrasings and five offsets are pinned in
  `tests/test_reminder_times.py`, and reverting either half turns eight of
  them red.

- **Background tasks vanish when they finish.** A completed or failed task
  disappears from Settings → Background tasks, so "did the reinstall work?"
  has no answer five minutes later. Keep finished tasks listed as
  ended/previous (with outcome and duration), persist them to the logs, and
  add a "clear history" button — probably one shared affordance for task
  history and logs both.
- **Chat / Agent / Browse selector and a browse UI.** Asked for directly
  ("can the chat interface be improved?? like the selector for agent mode
  and the web browser ui??") — this is §3, already designed there, unbuilt.
  Treat §3 as user-requested now, not speculative.
- **Agent continuation quality.** "The agent really struggles to continue a
  chat based off the previous message." Two things landed for it (2026-07:
  the most recent answer now reaches the next turn nearly whole —
  `librarian.history_messages` / LAST_ANSWER_CHARS — and every agent turn
  logs its prompt composition as memorymap.agent "prompt composition").
  Next step per §11a: read those logs from a real 3-turn chat, see whether
  notes or history dominates, and only then trim the variable half.
- **A skill that writes skills.** `save_skill` already takes steps and tool
  allowlists (§21), so a built-in "skill author" skill that interviews the
  user and calls save_skill is small and real. Not started.
- **Appearance settings page (§15).** Asked whether it can be improved;
  nobody has audited it against §15 yet. The chat empty-state emblem now
  animates (same motion switch as the ai-mark), which was the one concrete
  ask.
- **Bot-walled sites in the reader.** Cloudflare-fronted wikis and Reddit
  403/challenge the reader on TLS fingerprint alone; no header can fix
  that. The reader now names the wall instead of dumping a status
  (websearch.fetch_readable), but actually reading such sites would take
  browser impersonation — decide deliberately whether that dependency is
  ever worth it before anyone "fixes" this again.
- **Chat metadata disappears on a reload or app restart.** Distinct from the
  already-fixed "no metadata when tools were used" bug above (§8) — that was
  about the meta line never appearing; this is about it not surviving a
  reload. `conversations.steps` is what a reopened chat replays (§8 of
  `ARCHITECTURE.md`), so worth checking whether the metadata is part of
  `steps` at all or lives only in the live DOM.
- **README and GitHub Pages drift out of date.** Asked for directly: "update
  the readme and gh pages site to have up to date information". The README's
  own "What's in it" table still said six tabs after the Timeline tab (§10)
  shipped, and its "Next up" list still named the pre-rebuild skill system
  and pre-SearXNG web search as open work after both were done — exactly the
  kind of drift this document itself warns about in its opening note. Worth
  a pass through README, the GitHub Pages site (still on the "ideas, not
  yet" list in `CHANGELOG.md`) and this file together, since all three
  describe the same app and only this one gets updated every session.

- ~~**Notes don't render markdown.**~~ **done** — but read how, before
  extending it. `renderInlineMarkdown` handles bold, italic, `code` and
  strike *only*; `renderMarkdown`'s block elements (headings, tables, lists,
  fences) are deliberately not used in the list, because a list of
  fully-rendered notes gets very tall, which is the problem this section
  itself flagged. Code spans are matched first so `` `**x**` `` stays
  literal, underscore italics are excluded so `snake_case` survives, and
  `[[wiki links]]` and filter highlighting both still work *inside* emphasis.
  The dashboard's little note lists **strip** the markers instead
  (`notePreviewText`) — they clip at ~70 characters, and a clip landing
  mid-`<strong>` is worse than no emphasis. If someone wants block markdown,
  it belongs in an expanded/detail view, not the list.
- ~~**A hero header on the dashboard.**~~ **done** — emblem and wordmark
  inside the greeting card (not above it), hidden below 720px. The emblem is
  drawn in the dashboard's own render, not at startup: p5 measures a canvas
  as zero inside a `display: none` tab, and it has to be redrawn anyway when
  a theme change moves the accent.
- ~~**The chat box can't grow.**~~ **done.** It was an `<input type="text">`,
  which is one line forever: a three-sentence question scrolled sideways
  inside a box the width of a chat pane, so you could not read what you had
  written before sending it. It is a textarea that grows with the text and
  stops at `AUTOGROW_MAX_PX`, the same cap the capture box uses. Enter still
  sends; Shift+Enter is a newline, which a single-line input could not offer
  at all.
- ~~**A long note fills the list.**~~ **done.** One 800-word note pushed
  everything else off the screen, so the list stopped being a list. Anything
  past `LONG_NOTE_CHARS` is clamped with a fade and a "Show more", remembered
  per note for the session. The trigger is the character count, not a measured
  height: the notes list renders inside a `display: none` sub-tab, where every
  measurement is 0 — the trap that has caught four separate features here.
- ~~**SearXNG starts but never answers** — capture its output.~~ The capture
  was done first; the cause was found this session and it was us — the status
  poll's liveness check terminated the process on Windows. See §8b, and
  confirm with the user before calling it closed.

---

## 23. Organisation: manual grouping and multi-category notes

**Why.** Two related asks: "manually group notes together (separate from
the main sorting)" and "a note should be able to have multiple categories".
Both point at the same gap — filing today is exactly one category per note
(`entries.category_id`, a single foreign key, chosen by the janitor or the
user) plus tags for everything else multi-valued.

**Worth checking before building either.** Tags already are a multi-label,
user- or AI-applied system (`entries.tags`, a JSON column, with `tag:work` as
a search operator). A genuine "multiple categories" ask might already be
served by tagging more — worth finding out what the category is doing for
the person that a tag isn't (a category has an embedding centroid the
janitor matches against; a tag doesn't) before adding a join table.

**If it's still wanted after that:**

- **Multi-category** is a schema change — `entries.category_id` becomes a
  join table (`entry_categories`), and the janitor's cheap match (§4 of
  `ARCHITECTURE.md`) needs a rule for what happens when a note matches two
  centroids well. An additive migration, but touches the one part of the
  filing pipeline every other feature assumes is single-valued (the sidebar
  count, the graph's category layer in §9, "all notes in category X" queries).
- **Manual grouping**, kept genuinely separate from categories/tags, is
  smaller: a `collections` table and a join table, with no AI involvement at
  all — the person decides what belongs together, the app doesn't guess.
  Closer to a saved filter (§2) built by hand than to a new kind of filing.

---

## 24. Dashboard: more widgets, and layout depth

**Why.** Asked for directly: "more dashboard widgets! maybe some pie
graphs??" The dashboard already has a rearrangeable layout (Phase 5) and a
widget set (streak, at-a-glance counts, AI digest, activity heatmap,
on-this-day, focus timer) — this is more of the same shape, not a new system.

- **A category/tag breakdown** — the pie chart asked for, over
  `count_notes`-shaped data that already exists for the agent tool of the
  same name (§7 of `ARCHITECTURE.md`).
- **A writing-frequency chart** — bars over the activity heatmap's own data,
  a different read of the same numbers (streak vs volume).
- **A "stale notes" widget** — pairs with §10A's still-open idea of nudging on
  a note whose relative-time phrase has gone stale ("this said 'tomorrow'
  three weeks ago").
- **A "forgotten connections" widget — proactive rather than on-demand.**
  Gemini's actually-grounded suggestion (its second pass, after reading the
  real feature set): the graph already lets the AI suggest connections for
  a note *you're looking at* (§9); this is the same underlying similarity
  search run the other way — periodically, in the background, over notes
  nobody has looked at together, surfacing "these two from months apart
  might be related" on the dashboard rather than waiting to be asked.
  Nothing new to build on the retrieval side — §9's clustering and the
  embedding search both already exist; what's new is running it
  unprompted and having somewhere to show the result. Worth capping
  aggressively (one suggestion, not a feed) so it reads as a genuine find
  rather than the AI narrating its own similarity scores at you.
- Before adding more: audit which existing widgets render markdown and which
  don't (§8's ideas-parking-lot bug) so a new widget doesn't repeat the gap.

---

## 25. App control: tray, health checks, and dependency repair

**Why.** Several asks that are really one request in different words: "an
interface for managing the application… backend, cmd prompt console, quit,
update, install/fix/uninstall/reinstall packages and dependencies,
faster-whisper, and more… application health check, errors" — plus "improve
or expand on start.bat, don't make a cmd prompt window show but make it
accessible (maybe system tray)" and "a way to exit the app and close the
program quitting the backend". §7's desktop-packaging plan already lists
"single instance, native menus, tray" as part of hardening `--desktop`; this
section is the *content* of that tray/console, not the packaging shell
around it.

- **A visible health check.** Is the venv intact, does Ollama answer, is the
  embedding model loaded, is SearXNG (if installed) alive, how much disk is
  `data/` using. Most of these already have an answer somewhere in the app
  (`/models/status`, `searxng_manager.status()`); this is one screen that
  asks all of them and states plainly what's wrong rather than making the
  person go looking.
- **Repair actions from that screen**, not just a diagnosis: reinstall a
  dependency, re-pull a stuck model download, restart SearXNG. The SearXNG
  ↻ Reinstall button (§8) is the existing pattern to extend, not a new idea.
- **A real quit**, distinct from closing the browser tab — stopping the
  server process, not just the window. `--desktop` mode is the natural home
  for this since it already owns a process to exit; browser-tab mode can't
  kill its own server from the tab.
- **Update channels** (stable/beta/dev) — worth deferring until §7 actually
  ships an installer; there's nothing to channel yet while `git pull` plus
  the launcher's own dependency check is the update path.
- **A hidden console window on Windows, reachable rather than gone** — the
  ask was for the cmd window not to show at all *and* to still be reachable,
  which is two different things depending on whether the point is "get it out
  of my way" (a tray icon, minimised) or "I don't need to see it, ever, but
  Settings → Logs already covers that" (nothing to build). Worth confirming
  which was meant.

---

## 26. Data lifecycle: archive, a full wipe, and a real trust page

**Why.** Groups a few related asks that are all "what happens to old or
unwanted data" rather than day-to-day filing: "data and note compression",
plus the general expectation that a local-first app should let someone see
and delete everything it holds — the outside review's "local data map,
retention policy UI" specifically, which is real and not yet one coherent
thing anywhere in the app.

- **Archive** — already scoped in §4 item 2 (an `archived_at` column,
  additive migration). This section doesn't repeat it, just notes it's the
  prerequisite for the rest here.
- **A "delete everything" control.** Export (JSON/CSV/Markdown) already
  exists; there's no equivalent single action for the other direction — wipe
  the database, uploads and preferences and start over, distinct from
  `--reset-password` which only clears the credential. Worth being as
  explicit about what it destroys as `--reset-password` already is.
- **One actual "your data" page, not the pieces scattered.** The individual
  facts already exist — where the data lives and how big it is (README),
  what's in the audit log (Settings → Activity), what export and wipe do
  (above) — but there's nowhere that shows all of it as one trust surface.
  This is mostly assembly, not new data: a page that states plainly what's
  stored, where, for how long by default, and links straight to export and
  wipe from the same screen, rather than requiring someone to already know
  those live in three different places.
- **Opt-in retention rules — "forgetting," not just "archiving."** Archive
  above is a manual action; nothing today acts on a note's age on its own.
  A genuinely opt-in rule ("auto-archive notes untouched for a year") is a
  different, smaller thing than automatic deletion — reversible, off by
  default, and closer to the "stale notes" dashboard nudge (§24) than to a
  destructive background job. Worth being conservative here: the app's own
  design principle is that saving a note never fails and nothing is lost
  silently, so any auto-archival needs to be loud about what it did, not
  quiet.
- **Note compression** — asked for directly, and worth being honest about the
  payoff before building it. Notes are short text in SQLite; a notebook of a
  few thousand notes is low tens of megabytes uncompressed, and SQLite pages
  already compress well under most filesystems' own compression. This is
  likely solving a problem that doesn't exist yet at any realistic notebook
  size — worth measuring an actual `data/memorymap.db` before writing any
  compression code, not assuming it's needed.
- **A synthesised export, not just a raw one.** Export today (JSON/CSV/MD)
  is a dump of what's selected; Gemini's grounded suggestion was a step
  beyond that — pick a tag or a cluster and have the AI *compile* it into
  one coherent document (a project writeup, a portfolio piece, a README)
  rather than a folder of separate files the person still has to assemble
  by hand. Closer to a skill (§21) than to the export routes: it's a
  read-many, write-one operation with a prompt behind it, not a format
  conversion. Worth scoping as a skill once the skill system's tool
  allowlist (§21) is solid, rather than as a fourth export format.

---

## 27. Onboarding and first-run experience

**Why.** Asked for directly: "a guided setup on first install (like setting
your name, choosing a model if one isn't yet downloaded, a tour, making the
first note etc)". There already is an `onboarding-overlay` (referenced by
every Playwright driver script in this document as something to dismiss
before testing), so this is about what it covers, not whether it exists.

- ~~**Confirm what the current onboarding actually walks through**~~ **done —
  five static slides** (welcome, capture, ask, graph, appearance), no
  diagnostics anywhere, confirmed by reading `ONBOARDING_SLIDES` directly
  rather than inferring it from what the driver scripts click past.
- ~~**Fold in first-run diagnostics.**~~ **built — Ollama reachability and
  where the notebook lives.** A new slide (`{icon: "🩺", title: "Your
  setup", dynamic: true}`), placed second — before the capture slide, so it
  lands before a first capture could fail silently into `Uncategorised` and
  read as broken rather than absent. It fetches `/models/status` and
  `/storage` — **both already existed**, already powering the header's
  AI-status pill and Settings → Data, so this needed no new backend at all,
  just surfacing state nobody was shown at the moment it would have mattered
  most. Text is genuinely dynamic (fetched, not templated once): "✅ Ollama
  is running…" or "⚠️ Ollama isn't running… MemoryMap still works without
  it", plus the data directory's path and the database file's size. A
  staleness guard (a request token plus checking the overlay is still on
  that slide and still open) stops a slow fetch from overwriting whatever's
  showing by the time it lands — verified directly, not just reasoned about:
  closing the tour before the fetch resolves leaves it closed rather than
  reopening or throwing.
  - **Offering to pull a small model (`llama3.2`) if none is installed, and
    checking `MEMORYMAP_DATA_DIR` is writable specifically, are still open.**
    The reachability half shipped; the "fix it for me" half (a pull button)
    and the writability check are real, separate pieces of work — a stalled
    `ollama pull` needs its own progress UI, and a writability check needs a
    backend probe that doesn't exist yet (`/storage` reports the path, not
    whether it's writable).
- **Name, first note, model choice** — as asked, still open. The dashboard's
  name-nudge work ("empty by default and buried among a dozen fields")
  already solved the *name* half; onboarding doing it once at the start
  would be the same fix moved earlier, not a new one.
- ~~**Say what the graph and timeline actually are, once, early.**~~ **built**
  — the former "Explore your graph" slide is now "Explore your map" and
  names both the Graph tab and the Timeline's Line view (§10C, itself built
  this session) as the two halves of "the map MemoryMap is named for". A
  smaller version of the idea than "showing the graph forming around their
  first couple of notes" (that would need the tour to run *after* a note
  exists, which conflicts with running once at first launch before any note
  does) — naming the two views, once, in words rather than a live demo is
  the same product-identity gap closed with what the existing slide
  mechanism can actually do.
- ~~**What stays local, and how much space it's using**~~ **built as part of
  the diagnostics slide above** rather than a separate step — `/storage`'s
  `data_dir` and `database_bytes` answer exactly this, and splitting it into
  its own slide would have repeated the "nothing leaves this machine"
  framing the diagnostics slide already carries.
- **Benchmark installed models on first run, to suggest a default rather
  than assuming one** — still open, blocked on §11's model-comparison
  feature existing to wire into, as originally scoped.

---

## 28. In-app help: an AI that knows the docs

**Why.** Asked for directly: "the help area in settings has an ask-AI
feature where the AI has access to all the program documentation and can
help answer your questions."

**Shape.** Closer to the librarian (§4 of `ARCHITECTURE.md`) than to the
agent: grounded, read-only, answers from a fixed corpus rather than the
notebook. The corpus is already written — `README.md`, `ARCHITECTURE.md`,
this file, `CONTRIBUTING.md` — so this is a retrieval index over the repo's
own docs plus a chat surface in Settings → Help, not a new kind of AI
feature. Worth deciding whether it's a `search_docs` tool the *existing*
agent can call (cheaper, reuses everything) or a wholly separate grounded
chat (simpler to reason about, since it never needs to touch the notebook or
a destructive tool). The agent is already offered a narrowed tool set per
question via `tools.focus_for` (§7 of `ARCHITECTURE.md`) — a docs question is
exactly the kind of thing that focusing already exists to route.

---

## 29. Extensibility ideas, not yet scoped

Three asks that are genuinely bigger than anything else in this document and
don't have a shape yet — recorded so they aren't lost, not because any of
them are close to being built:

- **MCP tool support** — "an in-built browser with MCP tool abilities to
  accompany the web search". The Model Context Protocol would let MemoryMap
  either expose its own tools (§7 of `ARCHITECTURE.md`'s 28-tool registry) to
  other MCP clients, or consume external MCP servers as more tools for its
  own agent. Either direction is a real integration, not a checkbox — it
  would need its own trust model, since an external MCP server is exactly
  the kind of thing design principle 1 (offline-first, one narrow opt-in
  exception for web search) currently doesn't have a category for.
  **No longer a blank slate** — ANALYSIS.md §60 (ROADMAP.md item 38) read
  odysseus's actual MCP implementation and split this into two: expose (no
  new trust model needed, build first) and consume (needs the trust model
  this paragraph already flagged, build second).
- **A VS Code extension.** No stated purpose yet beyond the idea itself —
  worth asking what it would let someone do that the app's own web UI, PWA
  and desktop window don't, before scoping anything.
- **A browser clipper.** Gemini's suggestion: a lightweight extension that
  saves a page's text, link and metadata straight from the browser, rather
  than routing through the in-app reader (§13). Distinct enough from the
  in-built browser idea above to list separately — a clipper is passive
  capture from wherever you're already browsing; the in-built browser is the
  app going out and reading on the agent's behalf. Both would land in the
  same place (a note, or the queue in §4a's file-upload work), but they're
  answering different questions about where "capture" happens, and building
  a browser extension is its own packaging problem on top of anything
  MemoryMap does today.

## 29c. Whiteboard, brainstormed — not yet triaged

Asked for directly (make the whiteboard "the best fusion of Microsoft
Whiteboard, OneNote, Draw.io, and Mermaid.js"), after ROADMAP item 11/25's
own confirmed list was cleared (HISTORY.md §56–§57). None of this is
scoped or decided — recorded so it isn't lost, same reasoning as §29
above, and specifically so it doesn't get rebuilt from scratch by a
session that only reads ROADMAP.md's live list.

- **Mermaid.js text-to-diagram, both directions.** Paste Mermaid syntax
  (flowchart/sequence/mindmap) and have it render as real cards/links on a
  board — a deterministic, syntax-driven sibling to the AI-guided
  generation already built (item 11), appealing to anyone who already
  thinks in Mermaid rather than prose. Export the other way (a board →
  Mermaid markdown) makes a diagram portable into a note, a doc, or a
  GitHub README — this app already renders Mermaid fences in note/doc
  markdown (grep `mermaid` in app.js) if that's still true by the time
  this is picked up, worth checking first rather than assuming.
- **Frames/swimlanes** — a named, resizable container a card can be
  dropped into (Draw.io/Miro's own primitive), for process diagrams and
  Kanban-shaped boards. Distinct from grouping (§55, `group_id`): a group
  is "move these together"; a frame is a visible, labelled region that
  cards *belong to*, and reads in an export.
- **Board templates** — a gallery of starting layouts (retrospective,
  SWOT, Kanban, a blank mind-map with just a root card) instead of every
  board starting empty. Needs a decision on where templates live (shipped
  JSON fixtures vs. "save this board as a template").
- **A layers panel** — toggle visibility/lock of a named subset of items,
  the way Draw.io's own layers work. Cheap to want, not cheap to build:
  needs a `layer` concept added to three tables (nodes/sketches/objects)
  and a real UI, not a quick pass.
- ~~**Smart alignment guides while dragging**~~ **Done — see HISTORY.md
  §58** (edge/centre/spacing, colour-coded, Alt bypass).
- **Ink-to-text (handwriting OCR) on sketches** — OneNote's own
  differentiator. A real ML dependency (on-device OCR), so it collides
  with this project's own "don't install torch" constraint unless a
  lightweight option exists; needs research before it's even a maybe.
- **Presentation/step-through mode** — number a sequence of cards or
  frames and step through them full-screen, Miro's own "presentation
  mode." Distinct from the existing zoom/pan/export; nothing here reuses.
- **A board version history**, separate from the undo stack (which is
  in-memory, gone on reload) — notes already have this (History tab);
  boards don't. Needs a real design decision (snapshot-on-interval vs.
  a change log like `AuditLog` already gives notes) before scoping.

## 29d. Whiteboard — scoped and next, not brainstormed

Unlike §29c above, these four were specific asks from the same session
(HISTORY.md §58) with a clear shape. Three are now built (HISTORY.md §61);
the fourth — links to objects — is still open.

- ~~**Rename a board.**~~ **Done (HISTORY.md §61).** `PUT
  /whiteboard/boards/{id}` rewrites the underlying note's first `#
  heading` line; the one board that isn't a note (`board_id=None`,
  "Default board") is refused with a clear error rather than crashing.
- ~~**A Library gallery of boards, mind-maps, and uploaded images.**~~
  **Done (HISTORY.md §61).** The Library's whiteboard area is now two
  sub-tabs: "Whiteboards" (a board gallery over `GET /whiteboard/boards`,
  plus "+ New board", replacing the bare board-switcher dropdown as the
  only way to see what boards exist) and "Image Gallery" (sourced from the
  new `/media` listing rather than `/whiteboard/images`, since it also
  needed to cover plain note-image uploads, not just whiteboard image
  objects — see the Tier 3 media item in ROADMAP.md for what's still open
  there).
- ~~**A structured, small-model-friendly diagram-generation tool.**~~
  **Done (HISTORY.md §61).** `generate_diagram` takes a flat node list
  (`title` or `note_id`, plus `parent_ref`) and a `layout`
  (`tree`/`radial`), creates every card and link server-side in one call,
  and computes placement itself — a BFS depth/slot layout in Python
  (`_diagram_tree_positions`) rather than a full port of
  `wbArrangeMindMap`, since the AI tool only needed the placement math, not
  the interactive drag machinery around it. Capped at 60 nodes; refuses no
  root, more than one root/a cycle, an unresolvable `parent_ref`, and a
  node with both `title` and `note_id`.
- **Links that can reach an object (image/text box), not just a card.**
  Asked about directly (HISTORY.md §58): the border/anchor math itself
  (`wbAnchorPoint`/`wbLinkEndpoints`/`wbBoxRayIntersection`) is generic —
  it already takes a `kind`, and `wbItemBBox("object", ...)` already
  works — but every actual entry point to "what can a link end on" is
  hardcoded to cards only:
  - `dragEndNode`'s own hit-test (app.js) loops `for (const node of
    wbState.nodes)` — an object is never even considered as a drop target
    for the live drag-to-link gesture.
  - `add_whiteboard_link` (`src/memorymap/ai/tools.py`) does
    `session.get(WhiteboardNode, ...)` for both ends — passing an object's
    id raises "No whiteboard card with id …", not a working link.
  - The link sketch's own data shape (`sourceId`/`targetId`) has no
    `sourceKind`/`targetKind` — every render-time lookup
    (`sketchUpdate.each`, `wbUpdateLinkedSketches`) assumes both ends are
    nodes and would need a kind tag to know which state array to resolve
    an id against.
  Scoped shape: add `sourceKind`/`targetKind` (default `"node"` for every
  existing link, so this doesn't need a migration), extend the hit-tests
  above to also check `wbState.objects`, and give `add_whiteboard_link`
  optional `from_kind`/`to_kind` args. The board/self-link guards just
  added this session (`source.board_id != target.board_id`, `source.id ==
  target.id`) will need the same kind-awareness — comparing a node's id to
  an object's id is meaningless without also checking they're the same
  `kind`.

---

## 29e. Whiteboard master spec (uploaded, MS Whiteboard/OneNote/draw.io/
Illustrator feature audit) — reconciled against 29c/29d, not transcribed

A large uploaded document (~790 lines) did an exhaustive feature-by-feature
comparison against four reference apps and proposed a 6-phase rebuild. Its
Part A (the reference-app feature catalogue) is solid and worth keeping for
future scoping. **Its Part B "current-state audit" and therefore Part C's
gap matrix are meaningfully stale — do not build from them without
re-checking each item against the live code first**, per this file's own
standing rule. Spot-checking a handful of its "MISSING"/"P0" claims found
three that are already done:

- **"`#wb-search` unwired, P0 bug"** — already deleted, `993e639` (see
  ROADMAP.md §0/§1).
- **"Deleting a note leaves whiteboard cards behind, no cascade"** — already
  swept: `autonomous.clean_orphaned_board_cards()`
  (`ai/autonomous.py:320-326`), covered by
  `test_a_card_whose_note_was_purged_is_swept_up`.
- **"Cards show raw truncated text, not the note's formatting" (flagged
  P0/P1, "clearest OneNote-fidelity gap")** — already fixed: card content
  renders through the app's real markdown renderer, not `textContent`
  (`app.js:28975-28997`, own comment documents the fix directly).

Given that hit rate, the rest of its gap matrix (mostly P2/P3 polish items)
should be treated as **candidate**, not verified, until someone re-runs the
same check live. What follows is only what was independently confirmed
against the current code, or was already tracked:

**Already brainstormed — see 29c, don't re-add:** board templates, layers
panel, frames/swimlanes, board version history, Mermaid text↔diagram both
directions, presentation/step-through mode, ink-to-text (already flagged
there as colliding with the no-torch constraint).

**Already scoped — see 29d:** links reaching an object, not just a card
(still open); rename/gallery/`generate_diagram` (done, HISTORY §61).

**Genuinely new, verified missing, not covered by 29c/29d:**
- **Object lock** — no `locked` column on nodes/sketches/objects today
  (checked `core/database.py`). Cheap: one boolean per table, a toggle in
  the Properties panel.
- **Numeric X/Y/W/H/rotation entry** in the Properties panel — confirmed no
  such inputs exist in `index.html` today; only drag-based resize/rotate.
- **A swatches/saved-palette panel** shared across stroke/fill/text-colour
  pickers — confirmed nothing exists beyond the app's own accent-theme
  picker (unrelated). Every colour control today is an ad-hoc native
  `<input type=color>`.
- **Font family + bold/italic/underline for whiteboard text boxes** —
  confirmed only font size exists today.
- **Connector/link labels** on whiteboard links — distinct from the Graph
  tab's link-reason field; whiteboard's own `WhiteboardSketch` link type
  has no label. Would matter if `generate_diagram` output is ever meant to
  carry relationship text ("depends on," "leads to"), not just a line.
- **AI-readability additions**, extending what `readwhiteboard`/
  `searchwhiteboard`/`generate_diagram` already do (`ai/tools.py`): an
  outline-text export mode (Mermaid-adjacent, for the AI or a human to read
  a board as a flat description); a semantic (embedding-based) index over
  whiteboard text-box content, since `searchwhiteboard` is keyword-only
  today; letting `generate_diagram` extend an existing board's cards as
  parent context, not just create fresh ones.
- **Orphaned media garbage collection** — confirmed still genuinely
  missing (no `clean_orphaned_media`-shaped function anywhere), unlike the
  card-cascade claim above which turned out to already be fixed.
- Smaller polish items the spec's Part C lists and a live check didn't
  contradict, kept for reference rather than re-verified line by line:
  resize-from-center, flip h/v, whole-object opacity, a status bar
  (zoom/tool/item-count), a contextual quick-action bar near a fresh
  selection.

**Not adopting**, matching the spec's own reasoning: full vector path/anchor
editing (Illustrator's actual product category — wrong tool for a
mindmapping app), real-time multi-user collaboration (contradicts this
project's single-user/local-first design principle), handwriting/math ink
recognition (no stylus-first workflow in evidence), image trace/pattern
fills/mesh gradients (print-design-tier, no tie to this app's use case).

---


## 29b. Carried out of the §40 audit

Full context in [../ROADMAP.md §40](../ROADMAP.md#40-the-antigravity-audit);
the features these attach to are described in §39. Companions:
[ANALYSIS.md](ANALYSIS.md) · [HISTORY.md](HISTORY.md) ·
[HANDOVER.md](HANDOVER.md).

Ranked. The first two are the same problem wearing two hats — a feature that
changes the app's behaviour without showing the user what it did:

1. ~~**A memory-stream screen.**~~ **Built** — Settings → The AI → *What it
   remembers*. Original entry kept for the reasoning:
   `save_user_preference` lets the model write
   standing instructions into its own future system prompts. There is no UI:
   the user cannot list them, edit one, or turn one off. The `user_preferences.
   active` column exists precisely for that and nothing sets it. Small piece of
   work, and it is the difference between a helpful feature and an
   unexplainable one.
2. **A dry-run for the background librarian.** Turning it on lets an agent edit
   the notebook unattended. There is no preview. `taskhistory` records each run
   and the agent already emits `change` events with undo payloads, so "here is
   what the last pass did, undo any of it" is mostly assembly.
3. ~~**Whiteboard cards outlive their notes.**~~ **Done** —
   `autonomous.clean_orphaned_board_cards`, beside the vector sweep.
4. **`graph_local` costs a full notebook scan** to draw a local neighbourhood:
   every entry loaded, a full similarity sweep, and a PageRank over every node.
   Correct, and the opposite of what "focus mode" should cost.
5. ~~**PageRank runs on every `/graph` call, uncached.**~~ **Done** — see
   ROADMAP.md §0/§9 item 2: `routes_graph.py:60-105` caches pagerank/
   similarity by a notebook fingerprint, invalidated on write or embedding-
   model switch — exactly the "invalidation on write rather than a TTL" this
   item asked for.
6. ~~**`/media/{filename}` serves uploads same-origin with no type restriction.**~~
   **Done** — allowlist on upload *and* on serve, plus `Content-Disposition`.
   Original reasoning:
   No traversal — the name goes through `safe_filename` — but an uploaded
   `.svg` or `.html` is served from the app's own origin, and the AI can write
   here too. A `Content-Disposition: attachment` and an extension allowlist.
7. **Decide on `edit_note` being destructive.** See ANALYSIS §34b.

---

## 62. Extract notes — from the Writing Room, Documents, and Graph selections

Asked for directly, alongside "Draft with AI": write freely, then split what
was written into one refined note or several, auto-linked to each other and
to existing related notes with reasons — not just filed as one lump.

Not a new subsystem — an extension of what already exists. The Writing
Room (`app.js:5905+`, `#draft-thoughts`→`#draft-text`) already turns raw
thoughts into one AI-drafted note; this adds a second output mode. The
auto-link-with-reasons half already has its machinery:
`librarian.generate_link_reason` (used by the link-reason audit, `ai/links.py`)
and the janitor's own centroid/kNN auto-filing (`ai/janitor.py`) already
decide what a new note is related to on save — extract mode would call the
same reason-generation path per new note, not invent a second one.

Shape: an "Extract notes" action, offered wherever the app already has a
block of free-standing user/AI text — the Writing Room's `#draft-text`,
a Document's body, and (per the ask) a Graph selection's notes-in-context.
The AI decides one-note-vs-several based on whether the text covers one
topic or several distinct ones (same judgement call `_create_note`'s
janitor pass already makes when filing, just applied to a splitting
decision instead of a category), creates the resulting note(s), and links
each to both its siblings from the same extraction and any pre-existing
notes the janitor/link-reason pass would already surface — with a reason on
every link, not `AUTO_REASON_TEXT`'s old "similar in meaning" placeholder.

Needs a decision before scoping, not before logging: does the split
preview to the user before committing (a confirm step, matching this app's
"AI actions that create/change several things get a preview" convention —
see `generate_diagram`'s own node-list input) or does it commit straight
through like a normal `_create_note` call? Recommend preview, given it can
silently multiply one piece of writing into several permanent notes.

## 63. Ship a starter skills library

The Skills system (`ai/skills.py`) is real and working but ships **zero**
built-in skills — every one has to be hand-authored via `save_skill`
before it exists. Confirmed: no `DEFAULT_SKILLS`/`BUILT_IN_SKILLS`-shaped
constant anywhere in the file. Surfaced by the Kortex read (ANALYSIS.md
§66) — its "25+ prebuilt workflows" is the same primitive this app already
has, just with nothing in the box. Cheap relative to the value: a
one-time list of maybe 10-15 starter skills covering the app's own common
tasks (weekly review, meeting-notes cleanup, tag consolidation, a
"summarise what changed this week" digest) seeded on first run, through the
exact same `save_skill` validation path a user's own skill goes through —
not a second, parallel skill format.

## 64. Documents editor — behind the rest of the app, needs its own pass

The Documents tab (`app.js:5314`, "long-form writing") is a plain
markdown text area: confirmed no slash-command menu, no block nesting, no
focus/distraction-free mode. Every one of those is table-stakes in a
"second brain" competitor (Kortex, Notion, Obsidian) and the app already
has the primitives a slash-command menu would reuse — the command palette
pattern already exists elsewhere in the app (see DESIGN.md/ARCHITECTURE.md
for the existing overlay/palette convention) and would not need a new
interaction model invented from scratch, just a document-scoped instance
of it. Not scoped in detail here — flagged so it's not lost, and so the
next session doing this doesn't start from "what does a modern editor
need" without first reading what Documents currently has.

## 65. Highlight/web-clip capture

From the Kortex read (ANALYSIS.md §66): a way to save a highlighted
passage from something read elsewhere (an article, a PDF, a book) straight
into a searchable note, distinct from both the in-app reader (§13) and the
already-brainstormed browser-clipper idea (§29's third bullet). Genuinely
missing today — no `Readwise`/`highlight`/`web clip`-shaped code anywhere
in the tree. Two separable pieces: (1) a capture surface (paste a
highlighted passage + its source URL/title, or import from a service like
Readwise/Kindle's own export format) and (2) filing it through the
existing janitor/tagging pipeline like any other note, with the source
kept as metadata rather than folded into searchable body text. Not scoped
— (1) alone (manual paste-a-highlight) is small; (2) an actual Readwise
importer is a real integration and should be sized separately before
committing to it.

---
