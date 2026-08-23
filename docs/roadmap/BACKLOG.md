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

**What's left.** Streaming (NDJSON over `fetch`, not `EventSource` — see
HISTORY.md for why), follow/tail with autoscroll, level/text/source
filters, the `trace` fold, merging in `browserLogs`, and an error badge on
the nav item are all **done** — see HISTORY.md. Also done: **exporting a
support bundle** (an allowlist zip of the log buffer, scrubbed
`preferences.json`, and model status).

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
- ~~**Confirm nothing is silently dropped.**~~ **Done.** `logbuffer.py`
  tracks `_dropped`/`_dropped_since` (a full ring buffer counts what it
  discards rather than losing the fact silently), and the frontend renders it
  — "N earlier records … the oldest record still kept is from …" — whenever
  `stats().dropped` is nonzero.

---

## 2. Quick wins

Small, self-contained, each removing a visible annoyance.

**Four of these were already done** — checked in the running app rather than
assumed, since three sessions have now rebuilt something that already
existed: the SearXNG install path, the Notes sidebar sticky rule, a copy
button per code block in chat answers, and conversation search by content.
See HISTORY.md.

**Still open:** nothing — the two items below are both done, checked against
the running app rather than assumed.

- ~~**Empty chats can't be deleted.**~~ **Done.** A `Delete` button in the
  chat toolbar covers both cases: an empty/unsaved pane resets silently
  (nothing to lose), a saved one gets the sidebar's own confirm dialog first,
  then `DELETE /conversations/{id}`.
- ~~**Document outline / table of contents**, word-count goal, reading
  time~~ **Done — all three, not just the outline.** See §5: `renderDocOutline`
  builds a TOC, `renderDocStats` shows reading time, and `promptDocWordGoal`
  (`#doc-word-goal`) is a working word-count-goal control. §5 itself already
  said the outline/reading-time half was done; this session found the
  word-count-goal half — which §5 called "the one unbuilt part" — was too.

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
>
> **A second small gap, scoped but not built:** a tool-call chip today is a
> flat one-line label (`toolChip()`, app.js ~6200) — no way to see what the
> AI actually sent the tool or what came back, purely a cosmetic upgrade
> asked for directly ("a dropdown which shows the input tool call command
> and the output... collapsed by default... doesn't affect the AI, only a
> visual upgrade"). Real but genuinely multi-file, not a CSS tweak: `agent.py`
> already has `arguments` in scope where it builds each tool event but the
> SSE stream to the frontend only ever sends a human-readable `label`, not
> the raw arguments or the raw result — those would need adding to the event
> payload (additively; the model's own context is built from a separate
> prompt-construction path and would be untouched, so this is safe to add
> without the caveat in the ask being a real risk). Frontend: `toolChip()`
> becomes a `<details>`/`<summary>` with two collapsed sections (input as
> formatted JSON, output in a `overflow-y: auto` box for a long result) —
> and the chat-history `serialise()`/`replay()` round-trip (app.js ~6083)
> needs the same two fields or the dropdown disappears the moment a saved
> conversation is reopened, which would read as a second bug. Three files,
> one new SSE field, one schema change to what a saved conversation stores —
> real work, correctly deferred rather than rushed this session.

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
   - ~~**What's actually missing:** that attach path is a button, reached
     after the note exists — there's no drag-and-drop of an arbitrary file
     straight onto the capture box itself.~~ **Stale — already done.**
     `app.js`'s global `dragover`/`drop`/`paste` handlers match *any*
     `<textarea>` (including `#entry-content`) and already filter for
     `image/`, `application/`, `text/`, `video/` and `audio/` — not
     image-only — and attach every file in a multi-file drop, not just the
     first. A file-picker button (`#entry-attach-file`) reuses the same
     `handleFileUpload` for a third path. See the "ROADMAP.md Tier 2 §16c"
     comment right above `#entry-attach-file`'s listener in `app.js` — this
     was checked and closed a session ago; this bullet just never got
     updated to say so.
   - ~~**Genuinely still open:** a non-image attachment showed no preview in
     the note card~~ **Done, both halves.** `handleFileUpload` always wrote
     `![name](url)` (image markdown) regardless of file type, so a
     PDF/docx/etc. rendered as a broken `<img>` and its `onerror` handler
     reported it as **"filename deleted"**, actively lying about data loss —
     non-image files now get plain link markdown (`[name](url)`) instead.
     And that link now carries a type-specific Phosphor icon
     (`attachmentIconClass()` in `app.js`, keyed off the file extension for
     `/media/` uploads only — an arbitrary external link's extension isn't
     trustworthy enough to icon the same way) instead of reading identically
     to a plain URL.
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

- ~~**Outline / table of contents**, reading time~~ **done.** `renderDocOutline`/
  `renderDocStats` — see HISTORY.md.
- ~~**Expand a note into a document**~~ **done** — leaves the note untouched
  and says so.
- ~~**Word-count goal**~~ **Done.** `promptDocWordGoal`/`#doc-word-goal` set a
  target, persisted per-document (`docWordGoal:<id>` in localStorage), with
  progress shown against it.
- **AI chat bar inside the document** — partly there. `doc-ai-panel` already
  edits a selection or the whole document and shows the result as a proposal.
  What's missing is the *conversational* shape: ask a question about the
  document without it proposing an edit.
- **A real document browser** — the sidebar list is not a gallery
- ~~**Attach documents to notes**~~ **done, both directions.** The capture
  box's *Add to document* picker, a note's own 📄 chip/menu entry, and a
  document's list of the notes it draws on all share the same two
  `document_links` routes — see HISTORY.md.
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

**Windows installer: built, not yet run for real.** Asked directly which of
portable/installed/both, which platform(s) first, whether to pay for code
signing, and where to distribute — answers: installed (not portable),
Windows only for v1, unsigned for now (a certificate isn't worth it before
there's a user base to justify the yearly cost), GitHub Releases only. Built
on those answers: `packaging/windows/memorymap.spec` (PyInstaller, onedir —
onefile re-extracts itself on every launch, a bad fit for something meant to
open like a normal desktop app), `packaging/windows/installer.iss` (Inno
Setup, per-user install so an unsigned build doesn't *also* need an admin
prompt on top of the SmartScreen click-through), and a `build-windows-
installer` job on `release.yml` that builds and attaches the installer to
the GitHub Release a `v*` tag already creates. `core/config.py`'s
`_default_data_dir()` and `api/app.py`'s `FRONTEND_DIR` both needed a
`sys.frozen` branch — their existing path math assumes a `src/` layer a
PyInstaller bundle doesn't have, which would have pointed both at the wrong
directory silently.

**Honestly unverified**: this repo has no Windows machine to build or run it
on, so none of the above has executed for real yet — only reasoned through.
It ships from CI (windows-latest) on the next `v*` tag, which is a real
Windows build the moment it runs; what's unverified is specifically whether
that first real run succeeds without a fix. Worth watching the first
tagged release's Actions run rather than assuming green.

**"Does the installer stay up to date?" — built: a check, not an auto-update.**
Asked directly. Answer: no, and it was never going to — a static installer
build has no mechanism to patch itself, and building one (differential
updates, a signed update feed) is a lot of infrastructure for a project at
this stage. What shipped instead, since the alternative is a user on a
six-month-old build with no way to know it: `update_check_enabled`
preference (off by default, same reasoning as `web_search_enabled` — see
`core/config.py`), a `GET /update/check` endpoint that compares
`memorymap.__version__` against GitHub's `releases/latest` tag numerically
(never lexically — "0.10.0" has to sort after "0.9.0"), and Settings → About
wiring: the checkbox, a "Check now" button, and a silent check on startup
that only ever toasts when a newer version genuinely exists. Two real bugs
were caught testing this live rather than trusting it once it typechecked:
`PreferencesBody` (routes_settings.py) never declared the new field, so
Pydantic silently dropped it from every PUT; and `get_preferences()` built
its response as an explicit field-by-field dict that never echoed the new
key back — the exact bug this same file's own comment already describes
happening once before, to `autonomous_tasks_enabled` and friends. Both fixed
and re-verified live (Playwright: toggle, reload, confirm it survives).

**Why.** Asked for: "run as a professional product".

**Recommendation: not Electron.** The app is Python + static files; Electron
would bundle a second runtime (~150 MB) and a Node toolchain to deliver what
`--desktop` already does in-process via pywebview, and Python would still need
shipping alongside it. Alternatives weighed: Tauri and Wails (Rust/Go shells,
tiny binaries, but neither solves shipping Python), Neutralino (immature), plain
PWA (already supported via `manifest.webmanifest` + `sw.js`).

**Plan, updated — some of this is now built, not still planned.** Hardening
the pywebview mode: **tray — built**, see §25. Single instance, native menus,
graceful port fallback when 8000 is taken, and a first-run flow specific to
the packaged build are still open. The "PyInstaller one-file" half of this
paragraph is superseded by the actual decision recorded above — **onedir**,
not onefile, because onefile re-extracts itself on every launch. pywebview's
webview is also where the genuine embedded browser from §3 becomes possible.

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

Every bug this section originally listed — the launcher breaking on a folder
rename, a theme picker whose layered defaults silently cancelled part of
each new theme, the Lagoon/Shallows palette refinements, background tasks
showing nothing while SearXNG started, the cramped AI emblem, the dashboard
widgets missing until a tab switch, plus a long table of "reported as / what
it actually was" fixes (numbered lists, chat-bubble overflow, "Invalid
Date", CSS specificity ties, sketches not opening from the graph, web search
silently returning nothing) and the bugs found incidentally while fixing
those — has been reproduced in Chromium and fixed. Full detail, including
*what each report's real cause turned out to be* (the expensive part to
repeat if it isn't kept), is in HISTORY.md.

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

~~**Port 8888 being taken was a dead end.**~~ **fixed.** `start()` now
settles a port first (the wanted one, else 8080/8081/8890/8899, or
`MEMORYMAP_SEARXNG_PORT`).

**Not yet fixed:** a start attempt and an install can be in flight at the
same time — a start already waiting when a reinstall begins sits out its
full `START_TIMEOUT` against a virtualenv being rebuilt underneath it, then
blames SearXNG for writing no output. Fixing it properly means making
`_wait_until_ready` interruptible (a generation counter or a
`threading.Event` that `install_source` sets). Not a quick change, which is
why it is here rather than done.

**SearXNG itself now installs, starts, answers its JSON API, passes
`websearch.probe_searxng`, and returns real results on a user's own
Windows machine — confirmed, not deduced.** Six real bugs stood between
"install path exists" and that (three platform-independent — a Windows-only
`git clone` colon-in-filename failure, `pip install -e .`'s isolated-build
`msgspec` import error, and the `tracker_url_remover` plugin dying at boot
on any offline/proxied machine; three Windows-only — `os.kill(pid, 0)`
actually terminating the process instead of probing it, a stale
`is_checkout()`/`shutil.rmtree` interaction that made a failed reinstall
reproduce itself, and the POSIX-only `import pwd` in `searx/valkeydb.py`).
Full diagnosis of each, and the fix, is in HISTORY.md — worth reading in
full if SearXNG install/start is ever reported broken again, since the
shape ("Windows-only", "happens before SearXNG writes a line") is a strong
signal for which of the six it is.

Also present, from earlier sessions: a `↻ Reinstall` button (wipes the venv
and checkout, keeps `settings.yml` and its secret key) and a port line saying
whether 8888 is free, held by a working SearXNG, or held by something else.

**A deliberate security pass, rather than more one-off fixes.** Asked
broadly — "full security sweep and analysis… must be fully private, hack
proof, and secure… web browsing should be as private, secure, and
untrackable as possible" — which is this section's whole subject already,
just not gathered into one pass. What exists today: the CodeQL alert list is
closed, the DNS-rebinding TOCTOU on both the reader and the SearXNG search
path is closed, redirects are re-checked hop by hop rather than trusted,
private notes are encrypted and excluded from every AI tool, and CodeQL
runs on every push plus weekly. Brute-force protection on the unlock gate,
a tight CSP, the scrypt KDF behind private notes, and cross-origin
protection on the local API are all **done** — see HISTORY.md and §20.
What a deliberate pass would add on top, parallel to §19's accessibility
audit:

- A dependency-vulnerability sweep (`pip-audit` / `npm audit` equivalent for
  the vendored JS, since nothing currently checks either), and a fresh look
  at this section's own three easy-to-break rules (§8b's opening) to confirm
  nothing has quietly regressed since they were written down.
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

- ~~**Tree**~~ and ~~**radial tree**~~ **built**, then re-fixed after a
  reported readability bug (both were first sized to the panel's raw
  dimensions rather than by what a label needs — see HISTORY.md for the
  `nodeSize`/ring-by-depth fix and the three label-collision bugs it also
  found).
- **Mind map from one note** — pick a note as the root and lay everything else
  out by hops along `entry_links`. Different from the tree above: the
  hierarchy there is filing, here it is connection.
- **Treemap / sunburst** — area as weight, so a category with 200 notes looks
  like one. Best for "where does my writing actually go?", and the only layout
  here that answers a question about proportion.
- ~~**Arc diagram**~~ **built, on the filing hierarchy rather than
  `entry_links`** (a deliberate departure from this bullet's original "links
  as arcs" framing — tree and radial already draw the *filing* hierarchy, and
  a links-as-arcs view is still a real, different, unbuilt layout). Verified
  in Chromium against a seeded notebook — see HISTORY.md.
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
phrases are resolved when it is saved and stored in `entry_dates` with the
phrase beside the date; `entry/timewords.py` is deterministic regexes and
arithmetic, not a model call. Shown as a chip on the note rather than marked
up inside the text. See HISTORY.md for the full list of handled phrasings.

**Still open from A:** tagging notes that contain relative time so they are
findable as a class, and nudging on stale ones ("this said 'tomorrow' three
weeks ago — did it happen?"). Both are queries over `entry_dates` now that
the data exists.

~~**B. A Timeline tab.**~~ **built, first version — and it is a grid, on
purpose, for what it's for.** A time axis across, one band per category or
tag down the side, a bucket size you pick, drawn as a CSS grid (not SVG) so
it scrolls/tabs/reads-aloud for free, capped at eight bands plus "Everything
else".

~~**C. A branch/line view**~~ **built — asked for again, more directly,
because B reads as a calendar rather than a timeline.** A spine plus one
lane per band, connected by a stub at each band's first note; the branch
source is category/tag (not §9's cluster detection — see HISTORY.md for
why), and "rejoins the spine" was deliberately not built (a branch runs its
full lane length, which is a more honest shape than implying a thread
concluded). A real hit-testing bug (an invisible connector stub eating
clicks meant for the dots above it) was found and fixed verifying this
live. Verified in Chromium against seeded notes across four categories and
a reply thread; the one thing not verified is the tick-label spacing
against a notebook that genuinely spans weeks or months (all seeded notes
landed on the same day). No new table — reads `entry_dates` (§10A) and the
existing category/tag grouping; the only new state is a `localStorage`
view preference.

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
- ~~**SearXNG bound to localhost, not the LAN.**~~ **confirmed for the
  source path, and it was wrong for docker** — `_start_docker` published on
  every interface (docker's own default), which is worse than an open port
  since SearXNG has no auth in front of it. Fixed; see HISTORY.md.
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
`rename_category`** (name-based, not id-based, since the model has never
seen an id — see HISTORY.md for the three decisions behind the shape).

> ~~**⚠ The prompt budget is now the binding constraint on this section.**~~
> **Lifted — the constraint was an assumption, not a fact.** `tools.
> within_budget` now fits schemas to the window the model *reports*
> (`ollama_client.usable_context`) rather than a fixed 4096, dropping the
> least-relevant tools when they don't fit and logging what it held back.
> Core tools (search, read a note) always go first. See HISTORY.md for the
> per-window table. **What this means for the rest of this section: add the
> tools** — the cost of one more is a per-turn question the app now answers
> itself, not a fixed budget to ration against.

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
  theme~~ done (§8, HISTORY.md).

---

## 16. Sweeping UI quality-of-life

- ~~**A status bar along the bottom**~~ **done** (`#status-bar`/
  `renderStatusBar()`) — flagged stale by a backlog audit; see the
  near-duplicate bullet further down this list too.
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
- ~~**Collapsible sidebars.**~~ **Done** — `makeSidebarResizable`'s
  `sidebar-collapse-toggle` is wired on all three (Notes, Chat, Documents).
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

- ~~**Meeting notes**~~ **record → transcribe → note built (a
  `#meeting-overlay`, `/voice/transcribe-meeting`, review-before-save, a
  `meeting` tag); action-item extraction still open** — needs a real model
  call parsing free text into multiple structured reminders, a different
  shape from the single-phrase parser `POST /reminders/parse` does, and
  this sandbox has neither faster-whisper nor a running Ollama to verify a
  new prompt against. See HISTORY.md for what was and wasn't verified live.
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
  — `#chat-stop` aborts the stream and keeps the partial answer.
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
  clocks (idle 12h, absolute 7d), expiry closes the vault too. See
  HISTORY.md.
- ~~**Cross-origin requests against the local API — worth checking directly,
  not assuming.**~~ **checked, and it was open. Now closed** by
  `core/security.py:OriginCheckMiddleware`. The real exposure was worse than
  the item assumed: the most vulnerable moment is *before* a password
  exists, when a drive-by `POST /auth/setup` from a malicious page in
  another tab could have claimed the notebook outright — a browser enforces
  the target's CORS policy, not the attacker's. See HISTORY.md.
- ~~**Is SQLite in WAL mode?**~~ **yes, and it already was** —
  `core/database.py` sets it on every connect, `busy_timeout=5000` and
  `synchronous=NORMAL` beside it. Pinned by a test now.
- **What blocks the request thread.** A re-index on switching embedding
  models, a SearXNG install, a daily backup — if any of these run
  synchronously on the same thread that serves requests, the whole
  single-user app freezes for their duration rather than just slowing
  down. Worth an inventory of which long-running operations already run in
  a background thread (§25's health-check screen would be a natural place
  to surface "an indexing job is running" if one is) versus which quietly
  block.
- ~~**Singletons and worker count are coupled, and that coupling isn't written
  down anywhere.**~~ **done — checked in the running code, not assumed.**
  `deps.refuse_multiple_workers()` already exists and already runs first
  thing in `create_app()`, before any singleton is built: it reads
  `--workers`/`-w` off `sys.argv` and the `WEB_CONCURRENCY` env var (what
  uvicorn and gunicorn both honour), and raises `MultipleWorkersError` with
  the full reason and the fix rather than a warning nobody reads. Covered by
  `tests/test_worker_guard.py`. This item can be struck rather than built.
- ~~**Confirmed, not just suspected: `GET /entries` is genuinely
  unbounded.**~~ **done.** Asked for directly ("that is a real app feature
  that enhances good design and will probably be needed for real world
  use"). `GET /entries` now takes `limit`/`offset` (default page 1000, hard
  ceiling 5000 — `ENTRIES_PAGE_SIZE`/`_MAX` in `routes_entries.py`) and
  reports the true count via an `X-Total-Count` response header regardless
  of the page. `entry/manager.py` grew matching `limit`/`offset` params on
  all three list functions plus `count_entries`/`count_deleted_entries`/
  `count_archived_entries` — additive (`None` still means "everything"), so
  every existing in-process caller is unaffected.

  The risk this item itself named — a silent cap making old notes invisible
  everywhere at once — is why the fix isn't just a `.limit()`. `app.js`'s
  `loadEntries()` now fetches pages in a loop, painting the first page
  immediately and filling the rest in the background; every one of
  `allEntries`'s ~30 read sites (search-as-you-type, keyboard nav, the
  sidebar, tag suggestions) needed zero changes, because `allEntries` still
  ends up exactly as complete as it always was once loading finishes — just
  without one unbounded response getting it there. A `_entriesLoadGeneration`
  counter (same shape as `loadOnboardingDiagnostics`'s staleness guard)
  stops a slow page from a superseded load splicing stale rows back in if
  `loadEntries()` is called again mid-page-load.

  One real regression caught in the same pass, not by guessing but by
  grepping every `/entries` GET call site before calling this done: three
  dashboard widgets (`renderPinnedWidget`, `renderRecentNotesWidget`,
  `renderTopTagsWidget`) each independently re-fetched the *whole* list —
  which the new 1000-row default would have silently truncated,
  `renderTopTagsWidget` most seriously (wrong tag counts on any notebook
  past 1000 notes, with no error to notice it by). Fixed by having all
  three prefer the already-loaded `allEntries`, the same pattern
  `renderRandomNoteWidget` already used. Also found and removed while
  auditing those call sites: `copyLogs()` built a `/entries` URL and
  `fetch`ed it, then never used the response — dead code, unrelated to
  logs, silently wasting a request (and failing every time, since a bare
  `fetch()` skips the auth header `api()` adds).

  Verified live, not just by the new backend/frontend tests: seeded 2500
  notes directly via `entry.manager`, confirmed exactly three page requests
  fire (`limit=1000&offset=0/1000/2000`), `allEntries.length` and the
  status bar both land on 2500, all 2500 rows actually render, and the
  Dashboard's own widgets (including the fixed tag-counting one) show
  correct totals with zero console errors — screenshotted.
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

- ~~**Take me to the thing the agent just changed.**~~ **Done — this entry
  was stale.** Checked against the running app (agent.py), not assumed:
  `_change_note_id`/`_change_document_id`/`_change_reminder_id`/
  `_change_category_name` all exist and are wired into every `change` event
  (`create_note`, `edit_note`, `tag_note`, `pin_note`, `restore_note`,
  `link_notes`, `unlink_notes` — all four route through the note's own id,
  which is the right target for "View" either way; `create_document`;
  `set_reminder`/`complete_reminder`; `create_category`/`rename_category`/
  `merge_categories`). `changeRow` (`frontend/app.js`) renders the View
  button from whichever id is present, and is called from both the live
  per-turn tool-call rendering *and* a skill run's final "what changed"
  list — the "two things to decide" below were both resolved. Only the
  destructive-result question below is still open, and it's a small,
  separate decision, not a rebuild.

  Still open: whether a **destructive** result (a note/document/category
  delete) should offer to navigate to the recycle bin rather than to a
  thing that no longer exists at that id.

- ~~**Magic Add schedules relative reminders a whole timezone offset late.**~~
  **fixed** — the route built the user's clock as `utcnow() + offset`
  (aware, tagged UTC, actually holding local wall-clock), so the model was
  told a fictional offset and trusted; error was exactly the user's UTC
  offset. Also: "in …" phrases now resolve by rule, not a 3B model doing
  arithmetic. See HISTORY.md.

- ~~**Background tasks vanish when they finish.**~~ **Done** —
  `renderTaskHistory` persists finished tasks (outcome, duration) and
  `task-history-clear` is the shared "clear history" affordance.
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
- ~~**Chat metadata disappears on a reload or app restart.**~~ **Done — this
  entry was stale.** Checked against the running app (`openConversation` in
  `frontend/app.js`), not assumed: `message.stats` is persisted and the
  function's own comment already says why — "Rebuild the metadata line...
  it was only ever built from the live stream... Turns saved before this
  stored no stats and correctly get no line, rather than a row of '?'s."
  Whoever fixed this didn't strike the entry here.
- **README and GitHub Pages drift out of date.** Asked for directly: "update
  the readme and gh pages site to have up to date information". The README's
  own "What's in it" table still said six tabs after the Timeline tab (§10)
  shipped, and its "Next up" list still named the pre-rebuild skill system
  and pre-SearXNG web search as open work after both were done — exactly the
  kind of drift this document itself warns about in its opening note. Worth
  a pass through README, the GitHub Pages site (still on the "ideas, not
  yet" list in `CHANGELOG.md`) and this file together, since all three
  describe the same app and only this one gets updated every session.

- ~~**Notes don't render markdown.**~~ **done** — but read how before
  extending it. `renderInlineMarkdown` handles bold/italic/`code`/strike
  *only* (block elements are deliberately excluded from the list — see
  HISTORY.md); the dashboard's own small note lists strip markers instead.
- ~~**A hero header on the dashboard.**~~ **done** — emblem and wordmark
  inside the greeting card, hidden below 720px.
- ~~**The chat box can't grow.**~~ **done** — a textarea that grows with the
  text now, was a single-line `<input>`.
- ~~**A long note fills the list.**~~ **done** — anything past
  `LONG_NOTE_CHARS` clamps with a fade and "Show more".
- ~~**SearXNG starts but never answers** — capture its output.~~ Done; the
  cause was us — see §8b.

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

**The tray itself: built.** Asked directly — "hide the terminal but let it be
reached", "manage it through the system tray and popup windows" — and
answered: closing the desktop window now minimizes to a tray icon instead of
quitting (`window.events.closing` returns `False` to cancel the real close),
and the tray menu is Open / View Logs (opens Settings → Logs, the third
AskUserQuestion answer this session) / Restart (`os.execv`, same process
re-launched rather than a second one spawned) / Quit (`window.destroy()`,
which is what actually unblocks the `webview.start()` call and lets the
process exit). See `memorymap.__main__._start_tray`. `pystray` + `Pillow`
ride along with the existing `desktop` extra in `core/extras.py` — same
button that already installs `pywebview` — and the Windows installer's
PyInstaller spec bundles both, so this is always on for anyone who used the
installer.

Degrades the same way every other optional extra in this app does: no
`pystray`/`Pillow` (or, seen for real in this sandbox, a `pystray` backend
that fails at import — `Xlib.error.DisplayNameError` on Linux with no X
server) means `_start_tray` returns `None`, logs why, and the window goes
back to closing for real. That fallback path is what's actually been run in
this sandbox; the tray *appearing*, the menu *working*, and minimize-to-tray
*behaving* on a real Windows taskbar have not — no Windows box and no GUI
toolkit here to run pywebview at all, so this carries the same "built,
reasoned through, not yet seen" caveat §7's installer already carries, for
the same reason.

The health-check screen and repair actions below are still open — this
covers only the tray/console half of the section's original ask.

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
- **A real storage breakdown, not just the database file.** Asked for
  directly: "can the user see a visual depiction of the storage size the
  application takes up... so they can manage and uninstall optional
  dependencies they don't really use." `GET /storage` today reports only
  `database_bytes` — nothing for `uploads/` (attachments, sketches),
  nothing for the installed extras themselves (`core/extras.py`, which
  already has a real install/uninstall path but no size next to the
  button — `sentence-transformers` alone is the "~2 GB, it pulls in
  PyTorch" case named in its own catalogue entry, exactly the kind of
  thing worth seeing before deciding to keep it). Not a quick add: needs a
  directory-walk per extra's actual installed footprint (import metadata
  doesn't give you bytes on disk), likely cached rather than computed on
  every Settings load. The "uninstall now, reinstall later" half already
  works (`core/extras.py`'s remove/start) — this is purely the missing
  "how much is this costing me" number and a chart on top of facts that
  mostly already exist.
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
  diagnostics anywhere.
- ~~**Fold in first-run diagnostics.**~~ **built — Ollama reachability and
  where the notebook lives**, a new dynamic slide reusing the existing
  `/models/status`/`/storage` endpoints. See HISTORY.md.
  - **Offering to pull a small model (`llama3.2`) if none is installed, and
    checking `MEMORYMAP_DATA_DIR` is writable specifically, are still open.**
    The reachability half shipped; the "fix it for me" half (a pull button)
    and the writability check are real, separate pieces of work.
- **Name, first note, model choice** — as asked, still open. The dashboard's
  name-nudge work already solved the *name* half; onboarding doing it once
  at the start would be the same fix moved earlier, not a new one.
- ~~**Say what the graph and timeline actually are, once, early.**~~ **built**
  — the "Explore your graph" slide now names both the Graph tab and the
  Timeline's Line view.
- ~~**What stays local, and how much space it's using**~~ **built as part of
  the diagnostics slide above** rather than a separate step.
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
  - `add_whiteboard_link` (`src/memorymap/ai/tools/__init__.py`) does
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
  `searchwhiteboard`/`generate_diagram` already do (`ai/tools/__init__.py`): an
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

**Resolution: built, preview-first, as recommended above.**

Backend: `ai/extractor.py` — `propose_split` asks the model to split free
text into one or more notes (JSON reply), `merge_near_duplicates` folds any
two proposed notes back together whenever their content embeddings clear
`janitor.CONFIDENT_MATCH` (the one-vs-several judgement reuses that bar
rather than inventing a second one, per the ask above), each resulting note
is filed by `janitor.categorise` unchanged, and every link — sibling,
"source" (an explicit Graph/whiteboard selection), and "related" (found via
`search_manager.semantic_search`, keyword fallback when embeddings are off)
— gets its reason from `librarian.generate_link_reason`, run through
`ai.links`' own `_clean_reason`/`_is_vague_reason`. A link the model can't
give a specific reason for (offline, or a reply that's still vague) is left
out of the proposal entirely — never `manager.AUTO_REASON_TEXT`. No AI
running degrades to one plain note, same as the rest of this app never
failing a save over the AI being down. Two endpoints, `POST
/entries/extract/preview` (read-only — proposes, writes nothing) and `POST
/entries/extract/commit` (writes exactly what the client sends back,
possibly edited or trimmed from the preview); `manager.create_link`'s
`reason=` is passed explicitly so a committed link can never fall back to
the generic guess. 21 new tests in `tests/test_extract_notes.py`, full
suite green, `ruff check .` clean.

Frontend: one shared preview-before-commit modal (`#extract-panel`,
`openExtractPreview`/`renderExtractPreview`/`commitExtractPreview` in
`app.js`) wired to all three surfaces — Writing Room's `#draft-extract`
(splits `#draft-text`), Documents' `#doc-extract` (the selection, or the
whole document if nothing's selected — same scope rule `AI edit` already
uses), and the whiteboard's multi-selection (`#wb-extract-notes`, shown
only once the selection includes a note card): the selected cards' own
content becomes both the text to split *and* the explicit "source" notes
every new note tries to link back to. Every note and link in the preview
has a checkbox — a dropped note's own links are dropped with it. `draft-
extract`/`doc-extract`/`wb-extract-notes` join `AI_ONLY_CONTROLS` (disabled
with a reason when Ollama is off, same as Draft and AI edit), since without
the AI this can only hand back one unlinked plain note — a materially
weaker result than what the button promises.

**Live-verified in this sandbox's Chromium** (no real Ollama available
here, so this is UI/wiring verification, not a check of the AI's actual
split/link judgement — see the caveat below): all three "Extract notes"
buttons exist, are correctly disabled with the expected title when the
model is off, and — invoked directly (bypassing the disabled button, the
only way to drive this without a real model) — the preview modal opens,
renders the graceful one-note offline fallback with the right message, and
committing it from the Writing Room actually creates the note (`GET
/entries` shows it) and closes the panel. The whiteboard path was checked
by setting `wbMultiSelection` directly rather than a real drag-select
gesture (the documented headless-Chromium multi-select trap) and confirmed
it reads the selected cards' own content correctly (screenshotted: both
notes' text, joined). Screenshots taken and visually reviewed for all three
surfaces; layout matches the rest of the app's modal styling. Zero new
console errors — the 21 `401` console errors seen during this session are
pre-existing and reproduce identically with zero interaction beyond
logging in (confirmed with a bare-login script), unrelated to this feature.

**Not verified, said plainly:** the AI's actual splitting/categorising/
link-reasoning judgement against a real model — this sandbox has no
Ollama/LM Studio running, so only the fake-transport backend tests exercise
that logic (the standing caveat at the top of this file applies here like
everywhere else). The whiteboard's real pointer-driven multi-select gesture
was not driven live either, for the reason above.

## 63. Ship a starter skills library — DONE, this claim was stale

Re-checked before starting a rebuild (per the standing rule at the top of
CLAUDE.md): `ai/skills.py` already ships `BUILTIN_SKILLS`, 14 skills —
the five-skill notebook-audit set, plus weekly review, tag/link clean-up,
a daily-review-with-reminders skill, and more — served through `builtins()`
/`catalog()` at `GET /skills`, the exact same `normalise()` validation path
a user's own skill goes through. This section's "ships zero" claim predates
that build. See HISTORY.md for when it landed.

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

## 75. Voice memos: capture, storage, playback, and a dedicated library page

Asked for directly. `/entries/{id}/files` now has a real allowlist
(`ATTACHMENT_SUFFIXES` in `routes_files.py` — images, PDF, common office
formats, text and code, refusing anything else with a 415, e.g. video), but
audio is deliberately not on that list yet — there is no player anywhere in
the app, so an uploaded `.mp3` would just be a file nobody could listen to.
Three separable pieces, roughly in the order they'd need building: (1) a
record-a-voice-memo control (browser `MediaRecorder`, saved as an
attachment once `.mp3`/`.wav`/`.m4a`/`.webm` are added to the allowlist and
a size ceiling suited to audio rather than documents is picked — 50MB is
generous for a PDF and stingy for 20 minutes of audio), (2) an `<audio>`
player wherever an attachment is already rendered inline (the note card,
the lightbox), and (3) a Library subtab alongside AI Skills/Whiteboards/
Image Gallery listing every audio attachment across the notebook, the way
`routes_library.py`'s `_notes()`/`_archive()`/`_shelved()` already do for
images via `thumb_by_entry`. Meeting notes were the specific use case
raised — a memo recorded during a meeting, attached to that note.

## 76. Keyword-only note filing while the AI is unavailable, flagged for later AI review

Asked for directly, and specifically **not** the same as `janitor.categorise`'s
existing low-confidence path (routes_entries.py's `create_entry` already
falls back to `UNCATEGORISED` when the AI call itself fails — that's a
"give up" fallback, not a second opinion). What's being asked for is a real
non-AI filer: while no local model is available at all, look at a new
note's own words (keyword/term overlap against existing categories and
tags — no embeddings, no model call) to make a real best-effort filing
guess instead of dumping everything into Uncategorised, and tag every note
filed this way so it's unmistakable later. Once the AI is available again —
on its own schedule, not necessarily right away — the autonomous agent's
existing stale/orphaned-note review pass (§17 in the session's
completed-work list) checks that tag specifically: did the keyword guess
get the filing and metadata right, and correct it if not. Scope: a
keyword-overlap filer as a genuine alternative code path when
`deps.get_ollama()`/the model manager reports unavailable (not merely a
lower-confidence branch of the AI path), a `filed_by="keyword_fallback"` (or
similar) marker distinct from the existing `"none"`/`"thread"`/`"user"`
values, and a query added to the existing review pass rather than a new one.

## 77. Notes-tab pagination and page-aware note links

Asked for directly, with a concrete reason: a large notebook's Notes tab is
one continuously growing list (backed by the paginated `GET /entries` added
this session, but presented to the user as an unbroken scroll — see §35/
the pagination work above) rather than a paged view with a page-size choice
and a page selector top and bottom. Two things this is NOT the same as: the
"1000 rows per fetch" pagination `GET /entries` already does under the
hood (invisible to the user, purely a payload-size guard), and the Library's
own grid/list views (unrelated screen). Real scope, if built: (1) a page-
size preference and page selector UI in the Notes tab, sized the way
`ENTRIES_PAGE_SIZE`/`ENTRIES_PAGE_SIZE_MAX` already are in
`routes_entries.py`; (2) the harder part — a wiki-link/note-reference
click has to land on the right *page* of the list, which depends on
whatever sort and filter the user currently has active (category, tag,
pinned, search term, semantic vs. keyword), not just the note's id. That
second part is real routing logic, not a UI tweak, and deserves its own
design pass rather than being bolted onto the simpler page-size control.

## 78. Whether the backend needs more concurrency than it already has

Asked for directly: should the app be asynchronous, able to run a chat
response, an Ask-tab semantic-search query, and a background job (a weekly
digest, the autonomous agent) all at once? Checked rather than assumed —
this is less true and less false than it sounds.

**What already happens today.** Routes are plain `def`, not `async def`
(3 real exceptions out of ~300, both streaming endpoints) — but FastAPI
still runs each sync request in its own worker thread by default, so two
requests already don't block each other at the HTTP layer. More to the
point, the genuinely slow work — model downloads, extras install, the
autonomous agent's loop, embedding warm-up, Ollama/model-manager calls —
already runs on its own daemon `threading.Thread` (`embedmodels.py`,
`extras.py`, `ai/autonomous.py`, `ai/embeddings.py`, `ai/model_manager.py`),
explicitly "off the request thread" per `deps.refuse_multiple_workers`'s
own docstring. A chat reply streaming does not block the Ask tab today.

**What actually limits it, and isn't a code change:** `deps.
refuse_multiple_workers()` deliberately refuses more than one *process*
(not thread) — the config, database handle, log buffer, unlock sessions
and SearXNG subprocess are all one-per-process singletons, and that
refusal is a considered decision (single-user local app, not a
production API), not an oversight to "fix." The real ceilings are
elsewhere: (1) SQLite serialises writers regardless of how many Python
threads are asking — a digest job and a chat reply both writing at once
queue at the database, not the app; (2) most local Ollama installs
default to one in-flight generation — two simultaneous "AI, please
answer this" calls (a chat message and a digest summary) may queue at
Ollama itself even though the app dispatched both without blocking.

**Scope, if pursued:** not a rewrite to `asyncio` — the thread-per-slow-
task pattern already in place solves the stated problem for CPU/network-
bound work. What would need real design: a visible queue/status for
overlapping AI requests (so a digest running in the background doesn't
silently starve a chat reply, or vice versa, and the user can see both are
in flight), and confirming empirically how the target audience's actual
Ollama setups behave under two concurrent requests before promising
anything faster feels.

## 79. Linux release packaging — done; macOS still open

Asked for directly. Linux: built — `packaging/linux/memorymap.spec` +
`build-linux-package` in `.github/workflows/release.yml`, zipping a
PyInstaller onedir build (no installer format needed the way Windows
needs Inno Setup). Ships **without** the system tray: `_start_tray` runs
pystray's event loop on a background thread while `webview.start()`
blocks the main one, which the code's own comment says only Windows'
backend is known to tolerate — Linux's GTK backend has the same
main-thread-only constraint that already ruled out macOS, so the tray
call is now gated to `sys.platform == "win32"` rather than guessing.
Icon is `icon-512.png`, not the `.ico` (never confirmed GdkPixbuf decodes
it). Unverified until the Linux CI job actually runs, per this project's
standing rule for anything PyInstaller — it doesn't cross-compile.

**macOS is possible but has a real barrier beyond code.** An unsigned
`.app` triggers Gatekeeper's "app is damaged" warning on a current
macOS — not a bug, a deliberate OS policy — so shipping one that
actually opens for someone else requires an Apple Developer account
($99/year) and a notarization step in CI, not just a PyInstaller/DMG
build. Also inherits the same tray/threading question above and would
need its own answer, not an assumption it behaves like Linux. Worth
deciding deliberately rather than discovering after building the rest.

---
