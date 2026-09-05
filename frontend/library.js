// library.js — the Library tab, split out of app.js and whiteboard.js
// (§88.3 of the app.js split plan; documents.js was the first file, this
// is the second).
//
// Loaded after app.js and after whiteboard.js — see index.html's <script>
// ordering comment for why the whiteboard-relative order is load-bearing
// here in a way documents.js's own split never had to care about: this
// file's own bottom section (the sub-tab switcher) calls
// wbShowBoardsLanding() when the Whiteboard sub-tab is chosen, and
// whiteboard.js's own boards-gallery code (openWhiteboardBoard) clicks the
// Library's #library-subtabs whiteboard button to jump back — both calls
// are made from inside event-listener closures, never at parse time, so
// neither direction is actually load-bearing; loading after whiteboard.js
// simply keeps this file, like documents.js before it, as one of the later,
// smaller scripts rather than forcing whiteboard.js to move.
//
// Checked for the exact hazard documents.js found (a function definition
// moved out from under a bare top-level call site left behind) before
// trusting this split was safe: grepped every Library-owned function/const
// name (loadLibrary, renderLibrary*, flashLibraryItem, openBinnedNote,
// closeBinnedReader, openLibraryItem, refreshLibrarySemantic) for a bare
// top-level call anywhere left in app.js. None exists — every call site is
// inside a function or an event-listener body, which resolves the
// identifier at *call* time, long after every <script> tag (this one
// included) has parsed. So unlike documents.js's initDocSidebarTabs(),
// there was no call site to move here.
//
// What moved, and from where:
//
//  - app.js:19272-20114 — the Library's core module (§4, §36F): the item
//    list, filters, sort, selection, cards, bulk actions' helpers, and
//    "reading a binned note in full" (§36G, openBinnedNote/closeBinnedReader
//    and the #binned-overlay reader). The binned-note reader is included
//    deliberately, resolving this split's own open question: it is called
//    from nowhere but this file's own openLibraryItem(), and its overlay
//    exists only to serve the Library's Bin filter chip — it is Library's
//    own code that happened to get its own §-number and its own "---"
//    comment banner, not a separate feature.
//  - app.js:4866-4904 — flashLibraryItem(), the "View in bin" deep link a
//    skill's undo-row uses (BACKLOG §22). It lived far from the rest of the
//    Library's code (next to changeRow(), an agent-result renderer) because
//    its *caller* is a Notes/agent feature — but its *body* is nothing but
//    Library internals (libraryKind, renderLibraryFilters, renderLibrary,
//    #library-grid), the same shape documents.js's own split judged by:
//    what a function's body touches, not where its caller happens to sit.
//  - app.js:24022-24031 and 24391-24533 — the Library's own wiring: the
//    "+ New Skill" button on the AI Skills sub-tab, and the main view's
//    search/sort/view-toggle/bulk-action/bin-empty/refresh controls.
//  - app.js:26717-26899 — the AI Skills sub-tab's dashboard
//    (renderSkillsDashboard, renderSkillLogs) and the `switchTab` override
//    that calls them whenever the Library tab is opened. That override is
//    moved **verbatim, not folded into switchTab's own `if (name ===
//    "library")` branch** in app.js (which already exists, and already
//    calls loadLibrary()) — merging the two would be a real behaviour
//    change (one code path instead of two) riding along with a split, which
//    the split's own rules forbid. Logged to ROADMAP.md instead as a
//    worthwhile follow-up, not built here.
//  - whiteboard.js:82-91 — two `Set()`s (libraryExpandedCaptions,
//    libraryDocsSelection) that whiteboard.js declared alongside its own
//    per-card state purely because nothing else existed yet; both are read
//    and written only inside code that moved here too.
//  - whiteboard.js:5515-5706 — the Library's Documents sub-tab
//    (renderLibraryDocuments, its selection bar, its bulk-delete).
//  - whiteboard.js:5874-6191 — the Library's Image Gallery sub-tab
//    (renderLibraryImagesGallery, filterLibraryImagesGallery).
//  - whiteboard.js:5710-5813 (of the original file) — **the fix ROADMAP.md
//    §88.3 called "an accident worth fixing while splitting"**: the
//    `#library-subtabs` button switcher (deciding which library-view-*
//    section is visible) and the library-docs-*/library-images-* refresh,
//    search and upload listeners. These were never whiteboard's own code —
//    they switch between the Library's Documents/Skills/Whiteboard/Media
//    sub-tabs and wire the Documents/Media sub-tabs' own controls — they
//    just landed in whiteboard.js's DOMContentLoaded listener because the
//    Whiteboard sub-tab's own two listeners (wb-boards-new,
//    wb-back-to-boards) were written in the same block right after them.
//    Those two *are* whiteboard's own code and stayed in whiteboard.js, in
//    a DOMContentLoaded listener of their own — see that file's comment.
//    This file's own copy of the switcher still calls wbShowBoardsLanding()
//    (whiteboard.js) and renderLibraryImagesGallery()/renderLibraryDocuments()
//    (this file) exactly as before; only the listener's *location* changed.


// --- the Library (§4, §36F) ---------------------------------------------------
//
// The one surface for finding something you made before. It **replaces** the
// Documents tab's list and the chat sidebar's list rather than joining them —
// a library that duplicates two lists that already exist is a third place to
// look, which is worse than no library. The tab bar is the same length it was.
//
// A library is for *finding*, which is a different job from the Notes tab's
// "work with what I have", so it is built differently: bigger units, more
// metadata per unit, and sort and filter at the top as controls rather than at
// the side as an afterthought.
//
// The list itself is assembled by the server (GET /library) — see
// routes_library.py for why. Filtering and sorting are **not**: they have to
// feel instant as you type, so the client owns them and holds the whole list.

//: The last payload from GET /library, so typing in the search box re-filters
//: what is already here instead of asking the server on every keystroke.
let libraryItems = [];
let libraryCounts = {};
let libraryOverview = {};
let libraryKind = "all";

//: Same pattern as Notes' and the Library Documents sub-tab's own paging —
//: "all" (the default) leaves renderIncrementally's chunked scroll untouched;
//: a number slices the already-filtered/sorted list to one flat page instead.
let libraryPageSize = localStorage.getItem("library-page-size") || "all";
let libraryCurrentPage = 1;

//: Order matters: it is the order of the chips. "All" first because it is the
//: default and the one you come back to, then by how often you would reach for
//: the kind — a document is something you sat down to write, a binned note is
//: something you threw away.
const LIBRARY_KINDS = [
  { key: "all", icon: "ph:books", label: "Everything" },
  { key: "note", icon: "ph:note-pencil", label: "Notes" },
  { key: "document", icon: "ph:file-text", label: "Documents" },
  { key: "chat", icon: "ph:chat-circle", label: "Chats" },
  { key: "file", icon: "ph:paperclip", label: "Files" },
  { key: "tag", icon: "ph:tag", label: "Tags" },
  // Drafts used to be a Library sub-tab of its own. It is a *filter over
  // notes*, not a separate kind of thing, and it only sat up there because
  // this chip row did not exist when it was added — so it moved here, which
  // is also where someone looking for "notes I have not finished" would
  // reasonably expect to find it.
  { key: "draft", icon: "ph:pencil-simple-line", label: "Drafts" },
  // Not a real kind — item.kind is still "note" for these, same as every
  // other tagged note. A meeting note is finished, unlike a draft, so it
  // stays reachable from "Everything" too; this chip is a client-side tag
  // filter (renderLibrary()'s own special case for libraryKind === "meeting"),
  // and its count below is computed the same way rather than read from the
  // server's per-kind counts, which only exist for real kinds.
  { key: "meeting", icon: "ph:video-camera", label: "Meetings" },
  // "archived" is the bin's own internal kind (see routes_library.py's
  // _archive()) — this app's real archive uses "shelved" specifically so
  // the two are never confused at the code level, even though the words
  // read almost the same to a user.
  { key: "shelved", icon: "ph:archive", label: "Archived" },
  { key: "archived", icon: "ph:trash", label: "Bin" },
  { key: "activity", icon: "ph:scroll", label: "Activity" },
];

//: The overview strip. Each tile is a *state worth knowing*, and each one goes
//: somewhere — the same test the status bar had to pass, for the same reason:
//: a number you cannot act on is decoration, and a management screen made of
//: decoration is a dashboard nobody opens twice.
//: What is ticked. Ids alone would collide — a tag's id 3 and a note's id 3 are
//: different things — so the key is kind + id, and it survives a re-render
//: because it is not read off the DOM.
let librarySelection = new Set();

const LIBRARY_VIEW_KEY = "libraryView";

function libraryView() {
  return localStorage.getItem(LIBRARY_VIEW_KEY) === "list" ? "list" : "grid";
}

function libraryKeyOf(item) {
  return `${item.kind}:${item.id}`;
}

function renderLibraryView() {
  const current = libraryView();
  for (const button of document.querySelectorAll("#library-view button")) {
    const active = button.dataset.libraryView === current;
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", String(active));
  }
}

async function loadLibrary() {
  const body = await apiJson("/library").catch(() => null);
  libraryItems = (body && body.items) || [];
  libraryCounts = (body && body.counts) || {};
  libraryOverview = (body && body.overview) || {};
  // A selection that survives a reload is a selection that can act on
  // something already deleted. Cleared here rather than merged, because the
  // safe half of "delete nine things" is knowing exactly which nine.
  librarySelection = new Set();
  renderLibraryOverview();
  renderLibraryFilters();
  renderLibraryView();
  renderLibrary();
}

/** The one line of the old overview strip that was not already on screen.
 *
 *  The strip used to be six stat tiles above the filter chips —
 *  notes / documents / chats / tags / archived / in the bin — each showing a
 *  count and, on click, setting `libraryKind`. Six of the chips directly
 *  below it are the same six filters, with the same counts, doing the same
 *  thing. Measured: 61px of duplicate control, in a screen that already put
 *  344px of chrome above its first item, and reported as "half the screen
 *  is taken up by poor ui choices or structuring."
 *
 *  Removing the tiles loses nothing: every filter they offered is still one
 *  click away in the row underneath, still labelled, still counted. What the
 *  chips never carried is the prose — how much disk the attachments take and
 *  how much writing is in the documents — so that stays, as one quiet line.
 */
function renderLibraryOverview() {
  const box = $("library-overview");
  if (!box) return;
  box.replaceChildren();
  // One line of plain prose about the things that are not counts: how much
  // disk the attachments take, and how much writing is in the documents.
  const note = document.createElement("p");
  note.className = "muted library-overview-note";
  const parts = [];
  if (libraryOverview.attachment_bytes) {
    parts.push(`${libraryOverview.attachment_size} of attachments`);
  }
  if (libraryOverview.words) parts.push(`${libraryOverview.words.toLocaleString()} words written`);
  if (libraryOverview.private_notes) {
    parts.push(`${libraryOverview.private_notes} private (locked, never previewed here)`);
  }
  note.textContent = parts.length
    ? parts.join(" · ")
    : "Everything you make — notes, documents, chats, files — is managed from here.";
  box.appendChild(note);
}

function renderLibraryFilters() {
  const box = $("library-filters");
  if (!box) return;
  box.replaceChildren();
  for (const kind of LIBRARY_KINDS) {
    // Not `libraryItems.length`: activity is unconditionally excluded from
    // the "Everything" view itself (see renderLibrary()'s own comment on
    // why — it would be 93%+ log on a real notebook), so a count that
    // included it disagreed with what pressing the chip actually shows.
    const count =
      kind.key === "all"
        ? libraryItems.length - (libraryCounts.activity || 0) - (libraryCounts.draft || 0)
        : kind.key === "meeting"
          ? libraryItems.filter((i) => i.kind === "note" && (i.tags || []).includes("meeting")).length
          : libraryCounts[kind.key] || 0;
    const button = document.createElement("button");
    button.type = "button";
    button.className =
      "library-chip" + (libraryKind === kind.key ? " active" : "");
    button.setAttribute("aria-pressed", String(libraryKind === kind.key));
    // Reported live: "can the activity button be moved somewhere better" —
    // it isn't a *kind of thing you made* the way the ten chips before it
    // are (it is excluded from "Everything"'s own count above for exactly
    // that reason), so it read as just one more chip in a row it doesn't
    // really belong to. `library-chip-activity` pushes it to the row's own
    // far end with a divider ahead of it, the same "different question,
    // visually apart" treatment the reminder view-toggle already gets next
    // to the reminder filter (05-sidebars-themes.css). Still one click away
    // in the same toolbar — a second surface for one chip would be a second
    // place to remember, not a better one.
    if (kind.key === "activity") {
      button.classList.add("library-chip-activity");
      button.title = "What you did — a record, not a kind of thing you made";
    }
    const icon = document.createElement("span");
    setLabel(icon, kind.icon);
    icon.setAttribute("aria-hidden", "true");
    const label = document.createElement("span");
    setLabel(label, kind.label);
    // The count is on the chip, not discovered by pressing it. A filter you
    // have to try before you learn it is empty is a filter that wastes a click
    // every time — and with five of them that is most of the toolbar.
    const badge = document.createElement("span");
    badge.className = "library-chip-count";
    badge.textContent = count;
    button.append(icon, label, badge);
    button.addEventListener("click", () => {
      libraryKind = kind.key;
      libraryCurrentPage = 1;
      renderLibraryFilters();
      renderLibrary();
      updateLibraryCreateButton();
    });
    box.appendChild(button);
  }
}

function librarySorted(items) {
  const sort = $("library-sort")?.value || "recent";
  const copy = [...items];
  if (sort === "az") {
    copy.sort((a, b) => a.title.localeCompare(b.title, undefined, { sensitivity: "base" }));
  } else if (sort === "biggest") {
    // Within a kind this is words, turns or bytes; across a mixed list it is
    // whichever of those each card is showing. Deliberately not normalised —
    // a number that made a document's words comparable with an image's bytes
    // would sort cleanly and mean nothing.
    copy.sort((a, b) => (b.size || 0) - (a.size || 0));
  } else {
    copy.sort((a, b) => {
      const cmp = String(a.updated_at).localeCompare(String(b.updated_at));
      return sort === "oldest" ? cmp : -cmp;
    });
  }
  return copy;
}

// Meaning-matched note ids for the Library's current query, or null when the
// Semantic toggle is off (or the query is empty, or the search failed).
//
// **The design question this answers, which is why it was not built sooner.**
// The Library mixes notes, documents, chats, images and skills, and only
// *notes* have embeddings — nothing in this app has ever embedded a PDF, a
// conversation or an image. So "semantic search over the Library" has no
// single honest meaning, and the two tempting answers are both wrong: pretend
// everything is searched by meaning (it is not, and the results would quietly
// be keyword results for four of the five kinds), or refuse to offer it at all
// (which is what happened, and left the Library the one search box in the app
// with no meaning option).
//
// The answer taken: **meaning where there is meaning to search, words
// everywhere else, and say so on the control.** A note matches if the semantic
// search returned it *or* its words match; every other kind matches on words,
// exactly as before. Turning the toggle on can therefore only ever *add*
// results, never remove one — which is the property that makes it safe to
// leave on, and the reason the two filters are OR-ed rather than swapped.
//
// Reuses `GET /entries?semantic=true`, the same endpoint and the same
// server-side bound (`SEMANTIC_LIST_LIMIT`) the Notes tab's own toggle uses.
let librarySemanticIds = null;
let librarySemanticQuery = "";

async function refreshLibrarySemantic() {
  const query = ($("library-search")?.value || "").trim();
  const on = $("library-semantic-toggle")?.checked;
  if (!on || !query) {
    librarySemanticIds = null;
    librarySemanticQuery = "";
    return;
  }
  if (query === librarySemanticQuery) return; // already have this one
  try {
    const results = await apiJson(`/entries?q=${encodeURIComponent(query)}&semantic=true`);
    librarySemanticIds = new Set(results.map((entry) => entry.id));
    librarySemanticQuery = query;
  } catch {
    // No embedding backend, or the search failed. Falling back to keyword-only
    // is the same graceful degradation the rest of the app uses when the AI is
    // unavailable — never a failed search, just a less clever one.
    librarySemanticIds = null;
    librarySemanticQuery = "";
  }
}

function renderLibrary() {
  const grid = $("library-grid");
  if (!grid) return;
  const query = ($("library-search")?.value || "").trim().toLowerCase();
  let items = libraryItems;
  // "meeting" isn't a real kind (item.kind is still "note") — a meeting note
  // is a real, finished note, unlike a draft, so it stays reachable from
  // "Everything" too and doesn't get its own excluded bucket there. The chip
  // is a client-side tag filter over the same notes the Notes chip shows,
  // not a second list the server computes.
  if (libraryKind === "meeting") {
    items = items.filter((i) => i.kind === "note" && (i.tags || []).includes("meeting"));
  } else if (libraryKind !== "all") items = items.filter((i) => i.kind === libraryKind);
  else {
    // Two kinds stay out of the mixed list. Deleted things are not part of
    // "everything you have made" — they are things you decided you had not —
    // and the Include-bin toggle is how you ask for them anyway.
    //
    // **Activity is out unconditionally, and that is not a toggle worth
    // offering.** Measured on a small notebook: 164 activity rows against 13
    // things, so "Everything" was 93% log. A log is a record *about* the
    // notebook rather than a thing in it, and burying twelve documents under
    // it would make the default view useless in exactly the way a management
    // screen must not be. Its own chip shows it in full.
    // Drafts join activity in being excluded from "Everything": they are
    // unfinished by definition, and a draft appearing as a first-class card
    // here was reported and fixed once already (see _notes() in
    // routes_library.py). The Drafts chip is how you ask for them.
    items = items.filter((i) => i.kind !== "activity" && i.kind !== "draft");
    if (!$("library-show-binned")?.checked) {
      items = items.filter((i) => i.kind !== "archived");
    }
    // Shelved notes get the same "kept, out of the way" treatment as
    // activity — no extra checkbox, since the "Archived" chip already
    // gives full access, and this is the one place "kept out of the way"
    // actually matters: the mixed view is exactly where an archived note
    // would otherwise clutter the notebook it was archived to get out of.
    items = items.filter((i) => i.kind !== "shelved");
  }
  if (query) {
    // Title *and* preview, for the same reason the conversation search reads
    // message text: you remember what a thing was about far more often than
    // what it ended up being called.
    const wordMatch = (i) =>
      (i.title || "").toLowerCase().includes(query) ||
      (i.preview || "").toLowerCase().includes(query);
    // With Semantic on, a note also matches if the meaning search returned it,
    // even when it shares no words with the query. Everything else is
    // unchanged — see `librarySemanticIds`.
    items = librarySemanticIds
      ? items.filter((i) => (i.kind === "note" && librarySemanticIds.has(i.id)) || wordMatch(i))
      : items.filter(wordMatch);
  }
  items = librarySorted(items);

  // Sliced after filtering/sorting and before the render loop below, same
  // point renderLibraryDocuments() slices at.
  const pageBar = $("library-pagination");
  if (libraryPageSize === "all" || !items.length) {
    pageBar?.classList.add("hidden");
  } else {
    const pageSize = Number(libraryPageSize);
    const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
    libraryCurrentPage = Math.min(Math.max(1, libraryCurrentPage), totalPages);
    const start = (libraryCurrentPage - 1) * pageSize;
    items = items.slice(start, start + pageSize);
    pageBar?.classList.remove("hidden");
    $("library-page-status").textContent = `Page ${libraryCurrentPage} of ${totalPages}`;
    $("library-page-prev").disabled = libraryCurrentPage <= 1;
    $("library-page-next").disabled = libraryCurrentPage >= totalPages;
  }

  const updateDOM = () => {
    grid.replaceChildren();
    grid.classList.toggle("library-list", libraryView() === "list");
    // Same incremental renderer the Notes list uses. The Library holds notes,
    // documents, images, chats and skills together, so it is the one list that
    // can be larger than any single collection in the app.
    renderIncrementally(grid, items, (item) => libraryCard(item), {
      afterChunk: renderLibraryContextBars,
    });

    const empty = $("library-empty");
    empty.classList.toggle("hidden", items.length > 0);
    if (!items.length) {
      $("library-empty-title").textContent = !libraryItems.length
        ? "Nothing here yet. Write a document, start a chat, or attach a file to a note."
        : query
          ? `Nothing matching “${$("library-search").value.trim()}”.`
          : "Nothing of this kind yet.";
    }
  };

  // Premium UI: Use native View Transitions for buttery smooth layout animations
  if (!document.startViewTransition) {
    updateDOM();
  } else {
    document.startViewTransition(() => updateDOM());
  }
}

// What you can do to a thing without leaving the surface you found it on. A
// library that could only *show* you a document would send you to the Documents
// page to rename it and to the bin panel to restore a note — which is the
// scatter it was built to end.
//
// One ⋯ per card rather than a row of icons, the same choice the note cards
// and the chat list already make: three buttons on a card this size is most of
// the card, and the actions are things you do occasionally to a thing you are
// mostly here to open.
function libraryActions(item) {
  const reload = () => loadLibrary();
  if (item.kind === "chat") {
    return [
      makeMenuItem(
        item.pinned ? "ph:push-pin-slash Unpin" : "ph:push-pin Pin",
        item.pinned ? "Let this chat sort by date again" : "Keep this chat at the top",
        async () => {
          await apiJson(`/conversations/${item.id}/pin`, {
            method: "PUT",
            body: JSON.stringify({ pinned: !item.pinned }),
          }).catch((e) => toast(e.message, true));
          reload();
        }
      ),
      makeMenuItem("ph:pencil-simple Rename", "Rename this chat", async () => {
        const next = await promptDialog("Rename this chat:", item.title);
        if (!next) return;
        await apiJson(`/conversations/${item.id}`, {
          method: "PUT",
          body: JSON.stringify({ title: next }),
        }).catch((e) => toast(e.message, true));
        reload();
        loadConversationList();
      }),
      makeMenuItem("ph:trash Delete", "Delete this chat", async () => {
        if (!(await confirmDialog("Delete this saved chat?"))) return;
        await apiJson(`/conversations/${item.id}`, { method: "DELETE" }).catch((e) =>
          toast(e.message, true)
        );
        if (chatConv && chatConv.id === item.id) newChatConversation();
        reload();
        loadConversationList();
      }),
    ];
  }
  if (item.kind === "document") {
    return [
      makeMenuItem("ph:pencil-simple Rename", "Rename this document", async () => {
        const next = await promptDialog("Rename this document:", item.title);
        if (!next) return;
        await apiJson(`/documents/${item.id}`, {
          method: "PUT",
          body: JSON.stringify({ title: next }),
        }).catch((e) => toast(e.message, true));
        reload();
      }),
      makeMenuItem("⬇ Download .md", "Save a copy as a markdown file", () => {
        window.open(`/documents/${item.id}/export.md`, "_blank");
      }),
      makeMenuItem("ph:trash Delete", "Delete this document", async () => {
        if (!(await confirmDialog(`Delete “${item.title}”? This cannot be undone.`))) return;
        await apiJson(`/documents/${item.id}`, { method: "DELETE" }).catch((e) =>
          toast(e.message, true)
        );
        reload();
      }),
    ];
  }
  if (item.kind === "archived") {
    return [
      makeMenuItem("ph:arrow-u-up-left Restore", "Put this note back in your notebook", async () => {
        await apiJson(`/entries/${item.id}/restore`, { method: "POST" }).catch((e) =>
          toast(e.message, true)
        );
        toast("Restored.");
        reload();
        loadEntries();
      }),
      // The bin's other half. Without it the Library can show you a binned
      // note and take you back to the old panel to get rid of it, which is the
      // two-places problem the move was for.
      makeMenuItem("ph:trash Delete for good", "Permanently delete this note", async () => {
        if (!(await confirmDialog("Delete this note permanently?\n\nThis cannot be undone."))) return;
        await apiJson(`/entries/${item.id}/purge`, { method: "DELETE" }).catch((e) =>
          toast(e.message, true)
        );
        reload();
      }),
    ];
  }
  if (item.kind === "shelved") {
    return [
      makeMenuItem("ph:arrow-u-up-left Unarchive", "Bring this note back into your notebook", async () => {
        await apiJson(`/entries/${item.id}/unarchive`, { method: "POST" }).catch((e) =>
          toast(e.message, true)
        );
        toast("Unarchived.");
        reload();
        loadEntries();
      }),
      // No delete-for-good here: an archived note was never at risk of
      // being lost — that's the whole difference from the bin above — so
      // the only way out of this list is back to the notebook.
    ];
  }
  if (item.kind === "note") {
    return [
      makeMenuItem("ph:arrow-square-out Open in Notes", "Show this note in the list", () => flashEntry(item.id)),
      // BACKLOG.md §95 item D.14: "Full export exists. There is no way to
      // hand one note to someone." Same route shape and menu placement as
      // the Document kind's own "Download .md" a few lines up.
      makeMenuItem("⬇ Download .md", "Save a copy of this note as a markdown file", () => {
        window.open(`/entries/${item.id}/export.md`, "_blank");
      }),
      makeMenuItem("ph:archive Archive", "Keep it, but out of the way — not the bin", async () => {
        await apiJson(`/entries/${item.id}/archive`, { method: "POST" }).catch((e) =>
          toast(e.message, true)
        );
        toast("Archived.");
        reload();
        loadEntries();
      }),
      makeMenuItem("ph:trash Move to bin", "Bin this note — recoverable", async () => {
        await apiJson(`/entries/${item.id}`, { method: "DELETE" }).catch((e) =>
          toast(e.message, true)
        );
        toast("Moved to the bin.");
        reload();
        loadEntries();
      }),
    ];
  }
  if (item.kind === "tag") {
    return [
      makeMenuItem("ph:pencil-simple Rename", "Rename this tag everywhere (merge if it exists)", async () => {
        const next = await promptDialog(`Rename tag “${item.title}” to:`, item.title);
        if (!next || next === item.title) return;
        const result = await apiJson("/tags/rename", {
          method: "POST",
          body: JSON.stringify({ old: item.title, new: next }),
        }).catch((e) => {
          toast(e.message, true);
          return null;
        });
        if (result) toast(`Renamed on ${result.changed} note${result.changed === 1 ? "" : "s"}.`);
        reload();
        loadEntries();
      }),
      makeMenuItem("ph:trash Remove everywhere", "Take this tag off every note", async () => {
        if (!(await confirmDialog(`Remove the tag “${item.title}” from every note?\n\nThe notes are untouched.`))) return;
        await apiJson("/tags/delete", {
          method: "POST",
          body: JSON.stringify({ name: item.title }),
        }).catch((e) => toast(e.message, true));
        reload();
        loadEntries();
      }),
    ];
  }
  // An activity row is a record of something that already happened. There is
  // nothing to do to it, so it gets no menu at all rather than an empty one.
  if (item.kind === "activity") return [];
  if (item.kind === "file") {
    return [
      // `window.open` never attaches the `X-Auth-Token` header a plain
      // navigation can't carry — the same gap `mediaSrc` already exists to
      // close for `<img src>`, just missed here. Every notebook with a
      // password set (the normal case) 401'd on Download until this.
      makeMenuItem("⬇ Download", "Save this file", () => {
        window.open(mediaSrc(`/files/${item.id}`), "_blank");
      }),
      // Live-reported: an uploaded file "can't be deleted" — true for its
      // own ⋯ menu specifically; bulk-select delete already worked
      // (`library-bulk-delete` already has a `file` branch), but nothing
      // offered it from the one place someone looks first.
      makeMenuItem("ph:trash Delete", "Remove this file permanently", async () => {
        if (!(await confirmDialog(`Delete "${item.title}"?\n\nThis cannot be undone.`))) return;
        await apiJson(`/files/${item.id}`, { method: "DELETE" }).catch((e) => toast(e.message, true));
        toast("Deleted.");
        reload();
      }),
    ];
  }
  return [];
}

// The two strips that only appear when they have something to say.
function renderLibraryContextBars() {
  // The bin's own controls, where the bin now is. "Empty now" used to live in
  // a panel behind a sidebar button; a Bin filter you can look at but not
  // empty is half a move, and half a move leaves the user with two places.
  const binBar = $("library-binbar");
  const showingBin = libraryKind === "archived";
  binBar.classList.toggle("hidden", !showingBin);
  if (showingBin) {
    const count = libraryCounts.archived || 0;
    // "Kept for N days" came down from the deleted #bin-panel, which is the
    // one thing it said that this bar did not. It is the difference between a
    // bin you can trust to clear itself and one you assume you have to empty.
    const days = prefsCache ? prefsCache.recycle_bin_days : 30;
    $("library-bin-note").textContent = count
      ? `${count} note${count === 1 ? "" : "s"} in the bin, kept for ${days} days ` +
        "then cleared automatically. Open one to read it, or use its ⋯ menu."
      : `The bin is empty. Deleted notes are kept here for ${days} days ` +
        "(change that in Preferences) before they clear.";
    $("library-bin-empty").disabled = !count;
  }

  const bar = $("library-selectbar");
  const chosen = [...librarySelection];
  bar.classList.toggle("hidden", chosen.length === 0);
  if (!chosen.length) return;
  $("library-selected-count").textContent =
    `${chosen.length} selected`;
  // Restore only makes sense for binned notes, and offering it for a document
  // is offering a button that cannot work.
  const allBinned = chosen.every((key) => key.startsWith("archived:"));
  $("library-bulk-restore").classList.toggle("hidden", !allBinned);
}

function librarySelectedItems() {
  return libraryItems.filter((item) => librarySelection.has(libraryKeyOf(item)));
}

function toggleLibrarySelection(item, on) {
  const key = libraryKeyOf(item);
  if (on) librarySelection.add(key);
  else librarySelection.delete(key);
  renderLibraryContextBars();
}

function libraryCard(item) {
  // An `<article>` rather than a `<button>`: the card carries its own ⋯ menu,
  // and a button inside a button is invalid markup that browsers resolve by
  // dropping one of them. The click, the keyboard and the role are all here
  // explicitly instead, which is what the button element was giving us.
  const card = document.createElement("article");
  card.className =
    `library-card library-${item.kind}` + (item.private ? " library-private" : "");
  card.tabIndex = 0;
  card.setAttribute("role", "button");
  // Lets a caller (flashLibraryItem) find one specific card to scroll to and
  // highlight, the same way #entry-list li[data-id] already works for notes.
  card.dataset.id = item.id;
  const meta = LIBRARY_KINDS.find((k) => k.key === item.kind);

  // A thumbnail where there is one to show. A grid of picture files that shows
  // the word "PNG" seven times is a list pretending to be a gallery — and this
  // is the one kind whose content *is* what it looks like.
  if (item.kind === "file" && (item.mime || "").startsWith("image/")) {
    const thumb = document.createElement("img");
    thumb.className = "library-card-thumb";
    thumb.src = mediaSrc(`/files/${item.id}`);
    thumb.alt = "";
    thumb.loading = "lazy";
    // A file whose bytes have gone leaves a broken-image glyph, which reads as
    // a bug in the Library rather than as a missing file.
    thumb.addEventListener("error", () => thumb.remove());
    card.appendChild(thumb);
  } else if (
    (item.kind === "note" || item.kind === "shelved" || item.kind === "archived") &&
    (item.thumb_attachment_id || item.thumb_url)
  ) {
    // A sketch is a note whose actual content is a file attachment, not
    // text — without this a sketch card in the Library was a bare title
    // with nothing under it, indistinguishable from any empty note.
    //
    // `thumb_url` is the other half of the same fix: a pasted or dropped
    // image lives as inline markdown in the note's own content, never as an
    // Attachment, so it needed its own source — a sketch's card showed its
    // drawing and a pasted-image note's card showed nothing at all, which
    // is the inconsistency this closes. Already an absolute URL
    // (`/media/...` or `https://...`, whatever the note itself renders it
    // as), so it goes to mediaSrc() as-is rather than through `/files/{id}`.
    const thumb = document.createElement("img");
    thumb.className = "library-card-thumb";
    thumb.src = item.thumb_attachment_id
      ? mediaSrc(`/files/${item.thumb_attachment_id}`)
      : mediaSrc(item.thumb_url);
    thumb.alt = "";
    thumb.loading = "lazy";
    thumb.addEventListener("error", () => thumb.remove());
    card.appendChild(thumb);
  }

  const top = document.createElement("div");
  top.className = "library-card-top";
  // Tick to select. Only for the kinds a bulk action can actually do something
  // to — an activity row is a record of the past and a tag is not a file, so
  // offering either a checkbox would be offering a Delete that does nothing.
  if (item.kind !== "activity" && item.kind !== "tag") {
    const tick = document.createElement("input");
    tick.type = "checkbox";
    tick.className = "library-card-tick";
    tick.checked = librarySelection.has(libraryKeyOf(item));
    tick.setAttribute("aria-label", `Select ${item.title}`);
    tick.addEventListener("click", (event) => event.stopPropagation());
    tick.addEventListener("change", () => toggleLibrarySelection(item, tick.checked));
    top.appendChild(tick);
  }
  const icon = document.createElement("span");
  icon.className = "library-card-icon";
  setLabel(icon, meta ? meta.icon : "•");
  if (meta && meta.label) {
    icon.setAttribute("role", "img");
    icon.setAttribute("aria-label", meta.label);
  } else {
    icon.setAttribute("aria-hidden", "true");
  }
  const title = document.createElement("strong");
  title.className = "library-card-title";
  // A note's title is its first line, so it carries the note's own markup too.
  // Everything else has a real title and renders as plain text through the
  // same call, which is harmless.
  // Strip block markdown (like headings) from the title before inline rendering,
  // so a note starting with `# Title` doesn't show the raw `# `.
  const cleanTitle = item.title.replace(/^#{1,6}\s+/gm, "").replace(/^>\s?/gm, "");
  renderInlineMarkdown(title, cleanTitle, []);
  // The 2-line clamp above cuts a long title off mid-word with no way to read
  // the rest short of opening the card — a native tooltip costs nothing.
  title.title = cleanTitle;
  top.append(icon, title);
  if (item.pinned) {
    const pin = document.createElement("span");
    setLabel(pin, "ph:push-pin");
    pin.title = "Pinned";
    top.appendChild(pin);
  }
  card.appendChild(top);

  // A chat's title *is* its first question, so its preview would be the same
  // sentence again one line down and one shade greyer — a card that looks like
  // a bug rather than one with more metadata on it.
  //
  // **But "starts with the title" was the wrong test**, and it is what was
  // behind "I can't see a lot of the response in the cards": a *note's* title
  // is the first 60 characters of the note, so every note card matched and
  // every note card lost its preview entirely — leaving 60 characters of a
  // 420-character card. The question is not whether the preview begins with
  // the title, it is whether it goes on to say anything more.
  const bare = cleanTitle.replace(/…$/, "").trim();
  const sameAsTitle =
    item.preview &&
    bare &&
    item.preview.startsWith(bare) &&
    item.preview.trim().length <= bare.length + 1;
  if (item.preview && !sameAsTitle) {
    const preview = document.createElement("p");
    preview.className = "library-card-preview";
    // Inline markdown, the same renderer the note list uses (§22): a note
    // written with **bold** and `code` in it was showing its asterisks and
    // backticks here, which is the Library rendering the *source* of a note
    // while every other surface renders the note. Inline only — block elements
    // would turn a card into a document, which is what the clamp is for.
    const cleanPreview = item.preview.replace(/^#{1,6}\s+/gm, "").replace(/^>\s?/gm, "");
    renderInlineMarkdown(preview, cleanPreview, []);
    card.appendChild(preview);
  }

  const foot = document.createElement("div");
  foot.className = "library-card-meta";
  const detail = document.createElement("span");
  setLabel(detail, item.detail);
  const when = document.createElement("span");
  when.textContent = relativeTime(item.updated_at);
  when.title = new Date(item.updated_at).toLocaleString();
  foot.append(detail, when);
  card.appendChild(foot);

  const kindWord = meta ? meta.label.replace(/s$/, "") : item.kind;
  card.title = `${kindWord} · ${item.title}`;
  card.setAttribute("aria-label", `${kindWord}: ${item.title}. ${item.detail}.`);

  const actions = libraryActions(item);
  if (actions.length) {
    const menu = kebabMenu(actions, `Actions for ${item.title}`);
    menu.classList.add("library-card-menu");
  // The menu is inside the card and the card is a click target, so every click
  // in the menu would also open the thing. Stopped here rather than on each
  // item: the opener, the popup's padding and its backdrop are all inside this
  // element, and only one of the three is a button.
    menu.addEventListener("click", (event) => event.stopPropagation());
    card.appendChild(menu);
  }

  card.addEventListener("click", () => openLibraryItem(item));
  // An <article role="button"> gets neither of these for free — this is the
  // half of the button element we gave up to be allowed a menu inside.
  card.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    if (event.target !== card) return; // a key pressed inside the menu is the menu's
    event.preventDefault();
    openLibraryItem(item);
  });
  return card;
}

// Each kind opens where it is actually worked on. The Library finds things; it
// is not a fifth editor.
function openLibraryItem(item) {
  if (item.kind === "document") {
    openDocumentFromNote(item.id); // the Documents page, on this document
  } else if (item.kind === "chat") {
    switchTab("chat");
    openConversation(item.id);
  } else if (item.kind === "file") {
    // The note, not the raw file: a download is one click further and the note
    // is the thing that says why the file was kept.
    flashEntry(item.entry_id);
  } else if (item.kind === "note" || item.kind === "draft") {
    // Drafts open exactly like notes. flashEntry already knows how — it turns
    // the Drafts filter on when its target is one, because drafts are excluded
    // from every other view. What was missing was this branch: the "draft"
    // kind arrived with the Library's new Drafts chip and nothing routed it,
    // so selecting a draft and pressing Open did nothing at all.
    flashEntry(item.id);
  } else if (item.kind === "tag") {
    // A tag's job is finding the notes that carry it, so opening one does
    // exactly that rather than opening a tag editor nobody asked for.
    switchTab("notes");
    showNotesSection("browse");
    const box = $("note-search");
    if (box) {
      box.value = `tag:${item.title}`;
      box.dispatchEvent(new Event("input", { bubbles: true }));
    }
  } else if (item.kind === "activity" && item.entry_id) {
    // The note the entry in the log is about, when it still exists.
    flashEntry(item.entry_id);
  } else if (item.kind === "activity") {
    // No related note to jump to (a preference change, a tag merge, a
    // password change) — the click's only useful job left is showing the
    // whole record. `item.preview` is what the card already shows, clipped
    // to ACTIVITY_DETAIL_CHARS server-side; re-fetching by id gets the
    // record's real, un-clipped `detail` for anything long enough to have
    // lost the end of it.
    apiJson(`/audit?id=${item.id}&limit=1`)
      .then((rows) => showDetailDialog(item.title, rows[0]?.detail || item.preview || "(no detail recorded)"))
      .catch(() => showDetailDialog(item.title, item.preview || "(no detail recorded)"));
  } else if (item.kind === "archived") {
    // Restore and permanent delete are both on this card's own ⋯ menu, and
    // reading the note in full is the one thing a card cannot do — so that is
    // all this opens. It used to send the user to #bin-panel, which is the
    // only reason that panel outlived the Library's Bin chip.
    openBinnedNote(item.id);
  }
}

// --- reading a binned note in full (§36G) ----------------------------------
//
// **This is what let #bin-panel be deleted.** The Library card shows a
// preview, which is right for a grid of mixed things and wrong as the only
// way to see a note you are about to destroy — "restore or delete for good?"
// is a question you answer by reading the note, and the panel was the last
// place in the app that could still show one.
//
// Read-only. Editing a binned note would mean deciding whether the edit
// un-deletes it, and the honest answer is that you restore it first.
let binnedNoteId = null;

async function openBinnedNote(entryId) {
  binnedNoteId = entryId;
  const overlay = $("binned-overlay");
  const body = $("binned-body");
  body.replaceChildren();
  $("binned-meta").textContent = "Loading…";
  overlay.classList.remove("hidden");
  $("binned-close").focus();
  let entry;
  try {
    // `?deleted=true` — an ordinary read still 404s on a binned note, so
    // reaching into the bin is something the caller says it means to do.
    entry = await apiJson(`/entries/${entryId}?deleted=true`);
  } catch (error) {
    $("binned-meta").textContent = `Couldn't open that note: ${error.message}`;
    return;
  }
  if (binnedNoteId !== entryId) return; // a second open overtook this one
  const days = prefsCache ? prefsCache.recycle_bin_days : 30;
  const binned = entry.deleted_at ? relativeTime(entry.deleted_at) : "recently";
  $("binned-meta").textContent =
    `Deleted ${binned} · written ${relativeTime(entry.created_at)} · ` +
    `kept for ${days} days from deletion, then cleared automatically.`;
  // The note's own markdown, as the notebook renders it everywhere else. A
  // binned note is still a note, and showing it as flat text here would make
  // it look like a different, lesser thing than the one you deleted.
  renderMarkdown(body, entry.content || "");
}

function closeBinnedReader() {
  binnedNoteId = null;
  $("binned-overlay").classList.add("hidden");
}

$("binned-close").addEventListener("click", closeBinnedReader);
$("binned-restore").addEventListener("click", async () => {
  const id = binnedNoteId;
  if (!id) return;
  try {
    await apiJson(`/entries/${id}/restore`, { method: "POST" });
    toast("Restored.");
  } catch (error) {
    toast(`Couldn't restore that note: ${error.message}`, true);
    return;
  }
  closeBinnedReader();
  loadLibrary();
  loadEntries();
});
$("binned-purge").addEventListener("click", async () => {
  const id = binnedNoteId;
  if (!id) return;
  // The note is on screen and has just been read, so the dialog does not have
  // to quote it back the way the old bin row's did — "this cannot be undone"
  // is the whole of what is left to say.
  if (!(await confirmDialog("Permanently delete this note?\n\nThis cannot be undone."))) return;
  try {
    await apiJson(`/entries/${id}/purge`, { method: "DELETE" });
    toast("Deleted for good.");
  } catch (error) {
    toast(`Couldn't delete that note: ${error.message}`, true);
    return;
  }
  closeBinnedReader();
  loadLibrary();
});

// BACKLOG §22's still-open half of "take me to the thing the agent just
// changed": a destructive result (delete_note) used to reuse flashEntry,
// which only ever looks in the ordinary browse list — a note the agent just
// binned is never there, so the "View" button silently found nothing. This
// looks in the Library's own Bin filter instead, the one place a binned note
// actually lives (routes_library.py's _archive(), kind "archived").
async function flashLibraryItem(kind, id) {
  switchTab("library"); // already kicks off its own loadLibrary() in the background
  libraryKind = kind;
  const showBinned = $("library-show-binned");
  if (kind === "archived" && showBinned) showBinned.checked = true;
  renderLibraryFilters();
  renderLibrary(); // in case libraryItems is already fresh (tab was already open)
  // switchTab's own loadLibrary() fetch may still be in flight — starting a
  // second one here to await would race it, and whichever finishes last wins
  // the final render, silently dropping the flash the other one applied.
  // Polling for the card sidesteps the race: it waits for whichever render
  // actually lands instead of assuming which one that is.
  const card = await (async () => {
    for (let i = 0; i < 20; i++) {
      const found = document.querySelector(`#library-grid [data-id="${id}"]`);
      if (found) return found;
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    return null;
  })();
  if (!card) return;
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  card.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "center" });
  // "flash" alone only draws on a note-list <li> or something already
  // carrying "flash-target" (01-forms-settings.css) — a library card is
  // neither, so both classes are needed here for the highlight to render.
  card.classList.remove("flash");
  void card.offsetWidth;
  card.classList.add("flash-target", "flash");
  announce("Showing item in the Library.");
  clearTimeout(flashLibraryItem.timer);
  flashLibraryItem.timer = setTimeout(() => card.classList.remove("flash"), 2700);
}

// "+ New Skill" on the Library's AI Skills page. Reported as doing nothing,
// and it did nothing: the button was in the markup and no handler was ever
// attached to it. The skill editor lives in Settings → Skills, so this opens
// that with a blank form rather than growing a second editor that would then
// have to be kept in step with the first.
$("skills-add-new")?.addEventListener("click", async () => {
  await openSettingsModal("skills");
  stopEditingSkill();           // clears the form and resets the button label
  $("skill-name")?.focus();
});

// The Library (§4, §36F). Filter and sort are first-class here rather than an
// afterthought, so they are wired like controls: every change re-renders from
// the list already in memory, with no round trip.
let librarySearchDebounceTimeout;
async function runLibrarySearch() {
  await refreshLibrarySemantic();
  libraryCurrentPage = 1; // a new search can move an item off whatever page it was on
  renderLibrary();
}
$("library-semantic-toggle").addEventListener("change", runLibrarySearch);
$("library-search").addEventListener("input", () => {
  clearTimeout(librarySearchDebounceTimeout);
  librarySearchDebounceTimeout = setTimeout(runLibrarySearch, 150);
});
$("library-sort").addEventListener("change", () => {
  libraryCurrentPage = 1;
  renderLibrary();
});
for (const button of document.querySelectorAll("#library-sort-seg button")) {
  button.addEventListener("click", () => {
    document.querySelectorAll("#library-sort-seg button").forEach(b => b.classList.remove("active"));
    button.classList.add("active");
    const select = $("library-sort");
    if (select) select.value = button.dataset.sort;
    libraryCurrentPage = 1;
    renderLibrary();
  });
}
$("library-show-binned").addEventListener("change", () => {
  libraryCurrentPage = 1;
  renderLibrary();
});
for (const button of document.querySelectorAll("#library-view button")) {
  button.addEventListener("click", () => {
    localStorage.setItem(LIBRARY_VIEW_KEY, button.dataset.libraryView);
    renderLibraryView();
    renderLibrary();
  });
}
// The bin's own control, on the bin's own screen.
$("library-bin-empty").addEventListener("click", async () => {
  const count = libraryCounts.archived || 0;
  const ok = await confirmDialog(
    `Permanently delete ${count} note${count === 1 ? "" : "s"} in the bin?\n\n` +
      "This cannot be undone."
  );
  if (!ok) return;
  try {
    await apiJson("/recycle-bin/empty", { method: "POST" });
  } catch (e) {
    // Was unconditional before — a failed request still showed "The bin is
    // empty." right under its own error toast, one saying it worked and one
    // saying it didn't, for the same click.
    toast(e.message, true);
    return;
  }
  toast("The bin is empty.");
  loadLibrary();
  loadEntries();
});

// --- bulk actions -------------------------------------------------------------
// The reason the Library is a management screen rather than a nicer list:
// doing one thing to nine things. Every one of these confirms with a *count*,
// because "delete 9 items" is the sentence that stops a mistake and "are you
// sure?" is the one that doesn't.
$("library-clear-selection").addEventListener("click", () => {
  librarySelection = new Set();
  renderLibrary();
});
$("library-bulk-open").addEventListener("click", () => {
  const chosen = librarySelectedItems();
  if (!chosen.length) return;
  // One thing opens; several would be several tab switches ending wherever the
  // last one landed, so the honest answer is to open the first and say so.
  if (chosen.length > 1) toast(`Opening the first of ${chosen.length}.`);
  openLibraryItem(chosen[0]);
});
$("library-bulk-restore").addEventListener("click", async () => {
  const chosen = librarySelectedItems().filter((i) => i.kind === "archived");
  if (!chosen.length) return;
  // Was `.catch(() => {})` then an unconditional "Restored N notes." for
  // every item *attempted* — a per-item 404/500 was silently swallowed and
  // still counted as a success. Track real outcomes instead.
  let restored = 0;
  for (const item of chosen) {
    try {
      await apiJson(`/entries/${item.id}/restore`, { method: "POST" });
      restored++;
    } catch {
      // counted below
    }
  }
  if (restored) toast(`Restored ${restored} note${restored === 1 ? "" : "s"}.`);
  const failed = chosen.length - restored;
  if (failed) toast(`${failed} note${failed === 1 ? "" : "s"} couldn't be restored.`, true);
  loadLibrary();
  loadEntries();
});
$("library-bulk-delete").addEventListener("click", async () => {
  const chosen = librarySelectedItems();
  if (!chosen.length) return;
  // Binned notes are destroyed; everything else is deleted the way its own
  // menu deletes it. Saying which is which in the confirmation matters —
  // "delete" means recoverable for a note and permanent for one already binned.
  const permanent = chosen.filter((i) => i.kind === "archived").length;
  const ok = await confirmDialog(
    `Delete ${chosen.length} item${chosen.length === 1 ? "" : "s"}?\n\n` +
      (permanent
        ? `${permanent} of them ${permanent === 1 ? "is" : "are"} already in the bin and will be destroyed permanently.`
        : "Notes go to the bin; documents and chats are deleted for good.")
  );
  if (!ok) return;
  // Same fix as library-bulk-restore just above: a per-item failure used to
  // be swallowed by `.catch(() => {})` and still counted toward the
  // unconditional "Deleted N items." toast. Track what actually succeeded.
  let deleted = 0;
  for (const item of chosen) {
    const route =
      item.kind === "archived"
        ? [`/entries/${item.id}/purge`, "DELETE"]
        : item.kind === "note"
          ? [`/entries/${item.id}`, "DELETE"]
          : item.kind === "document"
            ? [`/documents/${item.id}`, "DELETE"]
            : item.kind === "chat"
              ? [`/conversations/${item.id}`, "DELETE"]
              : item.kind === "file"
                ? [`/files/${item.id}`, "DELETE"]
                : null;
    if (!route) continue;
    try {
      await apiJson(route[0], { method: route[1] });
      deleted++;
    } catch {
      // counted below
    }
  }
  if (deleted) toast(`Deleted ${deleted} item${deleted === 1 ? "" : "s"}.`);
  const failed = chosen.length - deleted;
  if (failed) toast(`${failed} item${failed === 1 ? "" : "s"} couldn't be deleted.`, true);
  loadLibrary();
  loadEntries();
});
$("library-refresh").addEventListener("click", loadLibrary);

// **The "All" tab's create button, matched to whichever filter chip is
// active.** Reported directly: it always said "+ New document" and made a
// document regardless of whether you were looking at Notes, Chats or
// Meetings — the one obviously-wrong thing to create in three of those
// four views. `renderLibraryFilters()` (above) calls this every time the
// chip changes; the four kinds with one unambiguous thing to create get a
// matching button, everything else (Everything, Files, Tags, Drafts,
// Activity, the bin) falls back to "+ New note" — the fastest capture path
// in the app, and a reasonable default when there's no single obvious
// answer. A real "choose what to create" picker for the Everything view
// specifically was asked for too but not built this pass — logged rather
// than rushed; see BACKLOG.md.
const LIBRARY_CREATE_BY_KIND = {
  note: {
    label: "＋ New note",
    run: () => {
      switchTab("notes");
      showNotesSection("capture", { focus: true });
    },
  },
  document: {
    label: "＋ New document",
    run: () => {
      switchTab("documents");
      // The Documents page's own loader opens the last document otherwise,
      // and a new one would be replaced a moment after it appeared.
      setTimeout(() => $("doc-new").click(), 160);
    },
  },
  chat: {
    label: "＋ New chat",
    run: () => {
      switchTab("chat");
      newChatConversation();
    },
  },
  meeting: {
    label: "⏺ Transcribe audio",
    run: () => openMeetingRecorder(),
  },
  // Asked for directly: "I want ways to make custom knowledge graphs that are
  // like mindmaps where I can add and remove nodes, move them around, change
  // how they connect and reasons, and just make my own thought process map"
  // — and, on where it should live, "I should be able to make and manage map
  // graphs (maybe in library??)".
  //
  // **This is a board, not a third canvas**, and that is the whole design
  // decision. The whiteboard already has every part of a concept map:
  // freely-placed cards whose positions persist, a link tool, Tab for a new
  // branch and Enter for a new sibling off the selected card, "Arrange as
  // mind map" to re-tidy, pan/zoom, undo, spaces, and export. What it did
  // not have was a *name* — nothing in the app said "concept map", so the
  // one feature the user was asking for was sitting behind a button called
  // "New board" on a tab called Whiteboards, which is why they reported it
  // missing. See `createConceptMap` for what the entry point adds on top.
  //
  // It also answers the deferred half of the ask — "maybe with a way to
  // export that into a visual diagram on the whiteboard" — by construction:
  // the map *is* a whiteboard, so it exports through the export button that
  // is already there.
  map: {
    label: "ph:graph New concept map",
    run: () => createConceptMap(),
  },
  // Reported directly: "in the library 'all' subtab, the files section has
  // the general create button and not an upload button." It did — `file` had
  // no entry here, so it fell through to the "＋ Create" picker, which asks
  // you what you want to make when the answer for a file is never "make".
  //
  // It opens the Files sub-tab first and then the picker, so the upload
  // lands somewhere you are already looking rather than on a screen you
  // then have to go and find. That click also sets the file input's own
  // `accept` (see `setLibraryMediaKind`).
  file: {
    label: "ph:upload-simple Upload a file",
    run: () => {
      document
        .querySelector('#library-subtabs button[data-media-kind="files"]')
        ?.click();
      $("library-images-upload-input")?.click();
    },
  },
};

// **BACKLOG §105 item 1, built**: "Everything" and every kind with no
// single obvious answer (Files, Tags, Drafts, Activity, the bin) now open
// a real picker instead of silently defaulting to "+ New note" — asked for
// again directly ("the buttons for creating and uploading the specific
// things"). A modal overlay, not a `kebabMenu()` dropdown: the button
// isn't wrapped in `.menu-wrap` the way every other kebab opener is, and
// `.library-view-section`'s own `overflow-y: auto` is exactly the clipping
// trap `wireEscapedActionMenu` exists to work around elsewhere — a full
// overlay sidesteps both instead of fighting them.
function openLibraryCreatePicker() {
  const overlay = document.createElement("div");
  overlay.className = "modal-overlay confirm-overlay";
  overlay.setAttribute("role", "dialog");
  overlay.setAttribute("aria-modal", "true");
  overlay.setAttribute("aria-label", "Choose what to create");

  const card = document.createElement("div");
  card.className = "card modal-card confirm-card";
  const text = document.createElement("p");
  text.className = "confirm-text";
  text.textContent = "What would you like to create?";
  const row = document.createElement("div");
  row.className = "row confirm-actions library-create-picker-actions";

  const returnFocus = document.activeElement;
  const close = () => {
    document.removeEventListener("keydown", onKey, true);
    overlay.remove();
    returnFocus?.focus?.();
  };
  const onKey = (event) => {
    if (event.key === "Escape") {
      event.stopPropagation();
      close();
    }
  };

  for (const kind of ["note", "document", "map", "chat", "meeting"]) {
    const entry = LIBRARY_CREATE_BY_KIND[kind];
    const button = smallButton(entry.label, entry.label, () => {
      close();
      entry.run();
    }, false);
    row.appendChild(button);
  }
  const cancel = smallButton("Cancel", "Cancel", close);
  row.appendChild(cancel);

  card.append(text, row);
  overlay.appendChild(card);
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) close();
  });
  document.addEventListener("keydown", onKey, true);
  document.body.appendChild(overlay);
  row.querySelector("button")?.focus();
}

function updateLibraryCreateButton() {
  const btn = $("library-new-doc");
  if (!btn) return;
  const entry = LIBRARY_CREATE_BY_KIND[libraryKind];
  if (entry) {
    setLabel(btn, entry.label);
    btn.title = entry.label.replace(/^\S+\s*/, "");
    btn.onclick = entry.run;
  } else {
    setLabel(btn, "＋ Create");
    btn.title = "Choose what to create";
    btn.onclick = openLibraryCreatePicker;
  }
}
updateLibraryCreateButton();

// ======================= SKILLS DASHBOARD TAB =======================

// --- the AI Skills page ---------------------------------------------------------
//
// Asked for: "can you redesign the AI Skills tab in the library??" — and an
// audit of what was here first found five separate faults, four of which the
// redesign removes rather than restyles:
//
// 1. **The grid was never used.** A `div.skills-grid` was created, appended,
//    and then every card was appended to `container` instead — so the grid
//    layout applied to an empty box and the cards stacked full-width below
//    it. The "No skills found" message went *into* that empty box, which is
//    why an empty library looked like nothing at all.
// 2. **A dead control.** "Schedule" toasted "Scheduler functionality coming
//    soon!". A button that does nothing is worse than a missing feature: it
//    teaches people the app is unreliable. Gone; it is on the roadmap.
// 3. **`innerHTML` templates**, against this file's own rule, including a
//    `.switch`/`.slider` toggle that exists nowhere else in this app — so the
//    one toggle on this page looked unlike every other toggle in it.
// 4. **Nothing said what a skill would do.** A name and a description, with
//    no indication of how many steps it runs, which tools it may use, or
//    whether it has ever been run — which is exactly what you want to know
//    before letting something edit your notebook.
// 5. `window.switchTab` was monkey-patched to notice the Library opening.
//
// The shape now: one settings card for the background workers, then a search
// box, then a real grid of cards that each say what the skill is, what it
// costs to run, and when it last ran.

//: The skill cards currently on screen, so the search box can filter without
//: another round trip. Rebuilt by `renderSkillsDashboard`.
let skillCardsCache = [];

function skillLastRunIndex(rows) {
  //: name → the most recent audit row for it. The rows arrive newest-first,
  //: so the first one wins and later ones are skipped.
  const index = new Map();
  for (const row of rows || []) {
    const name = (row.detail || "").split(" — ")[0];
    if (name && !index.has(name)) index.set(name, row);
  }
  return index;
}

function skillCard(skill, lastRun) {
  const card = document.createElement("article");
  card.className = "skill-card";

  const header = document.createElement("div");
  header.className = "skill-card-header";
  const title = document.createElement("h3");
  title.className = "skill-card-title";
  title.textContent = skill.name;
  const badge = document.createElement("span");
  badge.className = `chip skill-badge ${skill.builtin ? "" : "skill-badge-custom"}`.trim();
  badge.textContent = skill.builtin ? "Built-in" : "Yours";
  header.append(title, badge);

  const desc = document.createElement("p");
  desc.className = "skill-card-desc muted";
  desc.textContent = skill.description || "No description.";

  // **What running this will actually do.** The missing half of the old card:
  // a skill is a thing you are about to let edit your notebook, and "how many
  // steps" and "which tools" are the two facts that decide whether you want
  // to. Only shown when there is something to say — a one-shot prompt skill
  // has neither, and a row of zeroes is noise.
  const facts = document.createElement("div");
  facts.className = "skill-card-facts";
  const steps = (skill.steps || []).length;
  const tools = (skill.tools || []).length;
  const inputs = (skill.inputs || []).length;
  // Steps and tools expand in place — reported directly: "allow dropdown
  // expansions for the steps and tools in each." A hover title said the same
  // thing before, which is both unreachable on touch and one line, hidden
  // until you happened to rest a cursor on a chip that never looked
  // hoverable. `<details>` opens on click and on Enter/Space and needs no
  // JS to track its own state, the same choice the gallery kebab menu
  // already made for the same reason.
  const expandableFact = (icon, count, noun, items, ordered) => {
    const wrap = document.createElement("details");
    wrap.className = "skill-fact-expand";
    const summary = document.createElement("summary");
    summary.className = "chip skill-fact";
    setLabel(summary, `${icon} ${count} ${noun}${count === 1 ? "" : "s"}`);
    // Steps run in order, so they're numbered; tools are just a set the
    // model may reach for, in no particular order.
    const list = document.createElement(ordered ? "ol" : "ul");
    // Steps and tools are different kinds of thing and now look it. A step is
    // a sentence and reads as numbered prose; a tool is an identifier, so it
    // gets the monospace chip treatment the rest of the app already gives
    // code-ish tokens instead of sitting as a bare bullet. Reported twice as
    // these lists being "still not properly designed UI wise".
    list.className = ordered
      ? "skill-fact-list skill-fact-list-steps"
      : "skill-fact-list skill-fact-list-tools";
    for (const item of items) {
      const li = document.createElement("li");
      if (ordered) {
        // The number is a real element, not `::marker`. Three rounds of
        // padding tweaks failed to stop the generated markers from sitting
        // on (and being clipped by) the panel's left border, because an
        // `outside` marker is positioned relative to the item's content box
        // and hangs into the padding by an amount the page does not control.
        // A two-column grid with the number in its own gutter is
        // deterministic: it cannot overhang anything, and multi-line steps
        // align under their own text rather than under the number.
        const n = document.createElement("span");
        n.className = "skill-step-n";
        n.textContent = `${list.childElementCount + 1}.`;
        const body = document.createElement("span");
        body.textContent = item;
        li.append(n, body);
      } else {
        const token = document.createElement("code");
        token.className = "skill-tool-token";
        token.textContent = item;
        li.appendChild(token);
      }
      list.appendChild(li);
    }
    wrap.append(summary, list);
    return wrap;
  };
  if (steps) facts.appendChild(expandableFact("ph:list-numbers", steps, "step", skill.steps, true));
  if (tools) facts.appendChild(expandableFact("ph:wrench", tools, "tool", skill.tools, false));
  if (inputs) {
    const chip_ = document.createElement("span");
    chip_.className = "chip skill-fact";
    chip_.title = "Asks you for these before it runs";
    setLabel(chip_, `ph:textbox ${inputs} input${inputs === 1 ? "" : "s"}`);
    facts.appendChild(chip_);
  }

  const when = document.createElement("p");
  when.className = "skill-card-when muted text-xs";
  if (lastRun) {
    const outcome = (lastRun.detail || "").split(" — ")[1] || "";
    when.textContent = `Last run ${new Date(lastRun.created_at).toLocaleString()} — ${outcome}`;
  } else {
    when.textContent = "Never run.";
  }

  const footer = document.createElement("div");
  footer.className = "skill-card-footer";
  const run = document.createElement("button");
  run.className = "small";
  setLabel(run, "ph:play Run");
  run.title = `Run “${skill.name}” in the chat`;
  // runSkill, not startSkill: it prompts for the skill's inputs when it has
  // any, then calls startSkill with a real values object, and switches to the
  // chat itself. (startSkill(skill.name) was the earlier bug here — a name
  // string where a skill object was expected, and no `values` at all.)
  run.addEventListener("click", () => runSkill(skill));
  footer.appendChild(run);

  // A built-in has nothing to edit — it is defined in the app, not in your
  // preferences — so offering Edit on one would open a form that cannot save.
  if (!skill.builtin) {
    const edit = document.createElement("button");
    edit.className = "ghost small";
    setLabel(edit, "ph:pencil-simple Edit");
    edit.addEventListener("click", async () => {
      await openSettingsModal("skills");
      startEditingSkill(skill);
    });
    footer.appendChild(edit);
  }

  card.append(header, desc);
  if (facts.children.length) card.appendChild(facts);
  card.append(when, footer);
  return card;
}

function renderSkillCards(query = "") {
  const grid = document.getElementById("skills-grid");
  const empty = document.getElementById("skills-empty");
  if (!grid) return;
  const term = query.trim().toLowerCase();
  const matches = term
    ? skillCardsCache.filter(
        ({ skill }) =>
          skill.name.toLowerCase().includes(term) ||
          (skill.description || "").toLowerCase().includes(term)
      )
    : skillCardsCache;
  grid.replaceChildren(...matches.map(({ skill, lastRun }) => skillCard(skill, lastRun)));
  if (empty) {
    empty.classList.toggle("hidden", matches.length > 0);
    empty.textContent = skillCardsCache.length
      ? "No skills match that."
      : "No skills yet. “New skill” writes one — a name, what it should do, and the steps to take.";
  }
}

async function renderSkillsDashboard() {
  const container = document.getElementById("skills-dashboard-list");
  if (!container) return;

  const [skills, prefs, runs] = await Promise.all([
    loadSkills(),
    apiJson("/preferences").catch(() => ({})),
    apiJson("/audit?limit=100&entity_type=skill", { silent: true }).catch(() => []),
  ]);
  const lastRuns = skillLastRunIndex(runs);
  container.replaceChildren();

  // --- background workers, in this app's own controls ------------------------
  //
  // The same three preferences as Settings → Background tasks, and written
  // through `setPreference` for the reason that fix already documents: these
  // used to write straight to the server and update nothing locally, so
  // `savePrefs` — which rebuilds the whole object from the *other* screen's
  // DOM — silently switched them back off again. Reported as "the automated
  // tasks option keeps automatically disabling itself even when turned on".
  const workers = document.createElement("section");
  workers.className = "card skills-workers";
  const workersHead = document.createElement("div");
  workersHead.className = "row space-between";
  const workersTitle = document.createElement("h3");
  workersTitle.textContent = "Background workers";
  workersHead.append(workersTitle);
  const workersHint = document.createElement("p");
  workersHint.className = "muted text-sm";
  workersHint.textContent =
    "Lets the AI work through your notebook on its own, on a schedule you set in Settings. Everything it changes is listed there afterwards and can be undone one item at a time.";
  const workerToggle = (id, key, label, on) => {
    const wrap = document.createElement("label");
    // The app's own pill toggle, not the `.switch`/`.slider` markup that used
    // to be here and exists nowhere else in this codebase.
    wrap.className = "checkbox-label";
    const box = document.createElement("input");
    box.type = "checkbox";
    box.id = id;
    box.checked = on;
    box.addEventListener("change", (event) => setPreference(key, event.target.checked));
    const text = document.createElement("span");
    text.textContent = label;
    wrap.append(box, text);
    return wrap;
  };
  // The master switch, on its own — reported directly: it "should be
  // separate from the other two as they are like what the agent is running
  // in the background." Tag notes / Link related notes are jobs the agent
  // does *while* it's running, not independent switches of their own kind;
  // grouping all three as identical pills said otherwise.
  const masterRow = document.createElement("div");
  masterRow.className = "skills-worker-master";
  masterRow.appendChild(
    workerToggle(
      "skills-auto-toggle",
      "autonomous_tasks_enabled",
      "Run in the background",
      Boolean(prefs.autonomous_tasks_enabled)
    )
  );
  const jobsHint = document.createElement("p");
  jobsHint.className = "muted text-xs skills-worker-jobs-hint";
  jobsHint.textContent = "What it does while running:";
  const workersRow = document.createElement("div");
  workersRow.className = "skills-worker-toggles";
  workersRow.append(
    workerToggle("skills-auto-tag", "auto_tag_enabled", "Tag notes", prefs.auto_tag_enabled !== false),
    workerToggle(
      "skills-auto-link",
      "auto_link_enabled",
      "Link related notes",
      prefs.auto_link_enabled !== false
    )
  );
  workers.append(workersHead, workersHint, masterRow, jobsHint, workersRow);
  container.appendChild(workers);

  // --- the skills themselves --------------------------------------------------
  const search = document.createElement("input");
  search.type = "search";
  search.id = "skills-search";
  search.className = "skills-search";
  search.placeholder = "Search skills…";
  search.setAttribute("aria-label", "Search your skills");
  search.addEventListener("input", () => renderSkillCards(search.value));
  container.appendChild(search);

  const grid = document.createElement("div");
  grid.id = "skills-grid";
  grid.className = "skills-grid";
  const empty = document.createElement("p");
  empty.id = "skills-empty";
  empty.className = "muted hidden";
  // Appended *outside* the grid: the previous version put its empty state
  // inside a grid whose cards went somewhere else entirely, so an empty
  // library rendered as a blank page.
  container.append(grid, empty);

  skillCardsCache = skills.map((skill) => ({ skill, lastRun: lastRuns.get(skill.name) }));
  renderSkillCards(search.value);
}

// The AI Skills page is rendered when its sub-tab is opened, by the sub-tab
// handler below — not by monkey-patching `switchTab`, which is what this used
// to do (`window.switchTab = function(name) { originalSwitchTab(name); … }`).
// That wrapper ran two network-backed renders every time *any* Library
// sub-tab was opened, and it depended on load order: whichever script
// happened to run last owned the global. See `librarySubtabs` below.

$("skills-logs-clear")?.addEventListener("click", async () => {
  const ok = await confirmDialog("Clear the skill run log? This can't be undone.");
  if (!ok) return;
  await apiJson("/audit?entity_type=skill", { method: "DELETE" }).catch((e) => toast(e.message, true));
  renderSkillLogs();
});

async function renderSkillLogs() {
  const logList = document.getElementById("skills-logs-list");
  if (!logList) return;
  logList.innerHTML = "<p class='muted'>Loading logs…</p>";
  
  // **Filtered in SQL, not here, and asking for 20 of *everything* was half
  // the reason this panel looked broken.** Reported as "I dont think the
  // skill logs work in the ai skills section in the library??" — and it had
  // two independent causes, either of which alone was enough:
  //
  // 1. Nothing in the app ever wrote a `skill` audit row. The filter below
  //    looked for `entity_type === "skill"`; a grep for a `log_action` call
  //    with that entity type found none. `skill_runner._record_run` writes
  //    one now.
  // 2. Even once they exist, `/audit?limit=20` returns the last twenty
  //    things that happened *of any kind*, and this then filtered those in
  //    the browser — so on any notebook where the last twenty events were
  //    note edits, a real history of skill runs rendered as "none found".
  const skillLogs =
    (await apiJson("/audit?limit=50&entity_type=skill").catch(() => null)) || [];
  logList.innerHTML = "";

  if (!skillLogs.length) {
    logList.innerHTML =
      "<p class='muted'>No skill runs yet. Run a skill from the chat and it will be listed here.</p>";
    return;
  }
  
  // createElement rather than an `innerHTML` template per row, per this file's
  // own rule. Worth noting what the old template actually contained: a
  // trailing `</div>` with nothing open to close, which the HTML parser
  // silently discarded on every single row. That is the argument for the rule
  // in one line — a structural mistake in a string is invisible, and the same
  // mistake in `append()` calls does not compile.
  for (const log of skillLogs) {
    const div = document.createElement("div");
    div.className = "entry-item";

    const head = document.createElement("div");
    head.className = "row space-between";
    const action = document.createElement("strong");
    // The detail carries the skill's name and outcome; `log.action` is just
    // "ran", which as a heading told the reader nothing they did not already
    // know from the panel they were looking at.
    action.textContent = (log.detail || "").split(" — ")[0] || log.action;
    const when = document.createElement("span");
    when.className = "muted text-sm";
    when.textContent = new Date(log.created_at).toLocaleString();
    head.append(action, when);

    const detail = document.createElement("div");
    detail.className = "muted text-sm log-detail";
    detail.textContent = (log.detail || "").split(" — ").slice(1).join(" — ")
      || log.detail || "";

    div.append(head, detail);
    logList.appendChild(div);
  }
}

// Same shape again, for the Library image gallery's AI captions — keyed by
// upload id. Reported: "the image caption can't be expanded or collapsed",
// which the two-line clamp had no way to do at all until now.
const libraryExpandedCaptions = new Set();
// Same again for the two OCR fields below the caption. Asked for directly:
// "make the ocr extracted text in the image gallery collapsible and
// expandable like the image captions as well" — captionText got the clamp
// fix above; these two never did, so a long transcription still grew the
// tile unboundedly.
const libraryExpandedOcr = new Set();
const libraryExpandedVisionOcr = new Set();
// Which documents are ticked in the Library's Documents sub-tab — this
// view's own selection, separate from `librarySelection` (the "All" view's),
// because this section never populates `libraryItems` and mixing the two
// would let a checkbox here report "selected" while the "All" view's own
// bulk-delete silently found nothing to act on.
const libraryDocsSelection = new Set();

// BACKLOG §77's page-size pattern, extended to the Library's Documents
// sub-tab (§89 item 1) — a plain newest-first list with no due/overdue
// framing to protect, unlike Reminders, so a straight full-list page slice
// is safe here.
let libraryDocsPageSize = localStorage.getItem("library-docs-page-size") || "all";
let libraryDocsCurrentPage = 1;

// The Library sub-tab drafts were supposed to live in from the start — a
// stray comment already claimed "the sidebar/Library Drafts filter... is
// what makes them findable" and HISTORY.md said the same, but no
// library-view-drafts section ever existed to check off. Reported live:
// "there is no drafts section in the library." Fetches its own list rather
// than trusting Notes-tab state (`allEntries`) to already be loaded — the
// Library can be opened first, before Notes ever has been.
// Documents, on their own Library sub-tab.
//
// Reuses GET /documents — the same call the editor's sidebar makes — rather
// than adding an endpoint, and openDocument() to open one, so there is exactly
// one code path from "a document in a list" to "the editor showing it".
//
// This replaces the Drafts list that used to live here. Drafts are now a chip
// in the All view's filter row (LIBRARY_KINDS in app.js, _drafts() in
// routes_library.py) because a draft is a state a note is in, not a separate
// kind of object.
async function renderLibraryDocuments() {
  const list = document.getElementById("library-docs-list");
  const empty = document.getElementById("library-docs-empty");
  const noMatch = document.getElementById("library-docs-no-match");
  if (!list) return;
  const needle = (document.getElementById("library-docs-search")?.value || "")
    .trim()
    .toLowerCase();

  let docs = [];
  try {
    // `q` searches title *and* content server-side (routes_documents.py) —
    // client-side filtering alone could only ever match a title, since a
    // document's body is never sent to the browser in the list view.
    docs = await apiJson(needle ? `/documents?q=${encodeURIComponent(needle)}` : "/documents");
  } catch (error) {
    toast(error.message || "Could not load documents.", true);
    return;
  }

  // A reload can drop a document that was ticked (deleted, or filtered out
  // by a new search) - drop it from the selection too, or the bar's count
  // would go on including a row that no longer exists.
  const liveIds = new Set(docs.map((d) => d.id));
  for (const id of [...libraryDocsSelection]) {
    if (!liveIds.has(id)) libraryDocsSelection.delete(id);
  }

  list.replaceChildren();
  const isFilteredEmpty = Boolean(needle) && !docs.length;
  empty?.classList.toggle("hidden", docs.length > 0 || isFilteredEmpty);
  noMatch?.classList.toggle("hidden", !isFilteredEmpty);
  if (noMatch && isFilteredEmpty) {
    noMatch.textContent = `No documents match \u201C${needle}\u201D.`;
  }

  // Sliced after the selection-cleanup above (which has to see every live
  // id, not just the current page) and before the render loop below.
  const pageBar = document.getElementById("library-docs-pagination");
  if (libraryDocsPageSize === "all" || !docs.length) {
    pageBar?.classList.add("hidden");
  } else {
    const pageSize = Number(libraryDocsPageSize);
    const totalPages = Math.max(1, Math.ceil(docs.length / pageSize));
    libraryDocsCurrentPage = Math.min(Math.max(1, libraryDocsCurrentPage), totalPages);
    const start = (libraryDocsCurrentPage - 1) * pageSize;
    docs = docs.slice(start, start + pageSize);
    pageBar?.classList.remove("hidden");
    document.getElementById("library-docs-page-status").textContent =
      `Page ${libraryDocsCurrentPage} of ${totalPages}`;
    document.getElementById("library-docs-page-prev").disabled = libraryDocsCurrentPage <= 1;
    document.getElementById("library-docs-page-next").disabled = libraryDocsCurrentPage >= totalPages;
  }

  for (const doc of docs) {
    const item = document.createElement("li");

    // Reported: "can't rename, multi select, or delete documents in the
    // library subtab" - this row used to be nothing but the Open button
    // below. The tick and the ⋯ menu give it the same three actions a
    // document's card already has in the "All" library view — and,
    // reported again after the first pass, the same *placement*:
    // `libraryCard()`'s article-not-button shape (a button cannot contain
    // another button, which the tick and the kebab both are), the tick
    // sitting inline in the header row, the kebab absolutely positioned
    // and hover/focus-revealed rather than two more permanent controls
    // squeezed in as flex siblings.
    const open = document.createElement("article");
    open.className = "doc-list-item";
    open.tabIndex = 0;
    open.setAttribute("role", "button");
    const openDoc = () => {
      // switchTab first, then open. Reported as "the documents subtab document
      // cards don't even do anything": openDocument() loaded the document
      // correctly, but the Documents *page* stayed hidden behind the Library
      // tab, so from the outside the click did nothing at all.
      switchTab("documents");
      openDocument(doc.id);
    };
    open.addEventListener("click", openDoc);
    open.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      if (event.target !== open) return; // a key pressed inside the tick/menu is theirs
      event.preventDefault();
      openDoc();
    });

    const top = document.createElement("div");
    top.className = "doc-list-top";
    const tick = document.createElement("input");
    tick.type = "checkbox";
    tick.className = "doc-list-tick";
    tick.checked = libraryDocsSelection.has(doc.id);
    tick.setAttribute("aria-label", `Select "${doc.title || "Untitled"}"`);
    tick.addEventListener("click", (event) => event.stopPropagation());
    tick.addEventListener("change", () => {
      if (tick.checked) libraryDocsSelection.add(doc.id);
      else libraryDocsSelection.delete(doc.id);
      syncLibraryDocsSelectbar();
    });
    const icon = document.createElement("span");
    icon.className = "doc-list-icon";
    setLabel(icon, "ph:file-text");
    icon.setAttribute("aria-hidden", "true");
    top.append(tick, icon);

    const body = document.createElement("span");
    body.className = "doc-list-body";
    const title = document.createElement("span");
    title.className = "doc-list-title";
    title.textContent = doc.title || "Untitled";
    const meta = document.createElement("span");
    meta.className = "muted doc-list-meta";
    // Words and when it was last touched — the two facts that tell you which
    // of five similarly-named drafts is the one you meant.
    const words = typeof doc.words === "number" ? `${doc.words} words` : "";
    const when = doc.updated_at ? relativeTime(doc.updated_at) : "";
    meta.textContent = [words, when].filter(Boolean).join(" · ");
    body.append(title, meta);

    // The document's own opening, which is the thing that actually tells four
    // similarly-named drafts apart — a title, a word count and a date do not.
    // Asked for directly: the Documents sub-tab is "boring and should probably
    // have previews". Served by the list endpoint as a flattened 240-character
    // snippet (`routes_documents._preview`) rather than by shipping every
    // document's full text to draw a list.
    if (doc.preview) {
      const preview = document.createElement("span");
      preview.className = "doc-list-preview";
      preview.textContent = doc.preview;
      body.append(preview);
    }

    // Same three actions `libraryActions()` gives a document's card in the
    // "All" view — kept as its own copy rather than calling that function
    // directly, because its `reload` is hard-coded to `loadLibrary()` (the
    // "All" view's own data), which would leave this list showing a document
    // that was just renamed or deleted until something else refreshed it.
    const menu = kebabMenu(
      [
        // **A read-only showcase, not the editor.** Asked for directly:
        // "make a way to view documents in the documents tab in the
        // lightbox." The row's own click already opens the full editor —
        // this is the quick-look alternative, matching what the lightbox
        // already does for an uploaded PDF or a note attachment. A native
        // document needs no extraction (`GET /documents/{id}` already
        // returns the whole body), so `item.kind`/`item.text` are set
        // straight from the response and `showDocument` (app.js) skips
        // its own fetch entirely when it sees them already filled in.
        makeMenuItem("ph:eye Preview", "View this document without opening the editor", async () => {
          let full;
          try {
            full = await apiJson(`/documents/${doc.id}`);
          } catch (error) {
            toast(error.message || "Couldn't open that document.", true);
            return;
          }
          openLightbox(
            [
              {
                filename: full.title || "Untitled",
                id: full.id,
                kind: full.file_type === "md" ? "markdown" : "code",
                text: full.content || "",
                addedAt: full.updated_at || "",
                // No file on /media to fetch a URL from — Save reads this
                // directly, the same route the kebab's own "Download .md"
                // item already uses.
                getUrl: () => `/documents/${full.id}/export.md`,
              },
            ],
            0
          );
        }),
        makeMenuItem("ph:pencil-simple Rename", "Rename this document", async () => {
          const next = await promptDialog("Rename this document:", doc.title || "");
          if (!next) return;
          await apiJson(`/documents/${doc.id}`, {
            method: "PUT",
            body: JSON.stringify({ title: next }),
          }).catch((e) => toast(e.message, true));
          renderLibraryDocuments();
        }),
        makeMenuItem("⬇ Download .md", "Save a copy as a markdown file", () => {
          window.open(`/documents/${doc.id}/export.md`, "_blank");
        }),
        makeMenuItem("ph:trash Delete", "Delete this document", async () => {
          if (!(await confirmDialog(`Delete "${doc.title || "Untitled"}"? This cannot be undone.`))) return;
          await apiJson(`/documents/${doc.id}`, { method: "DELETE" }).catch((e) => toast(e.message, true));
          libraryDocsSelection.delete(doc.id);
          renderLibraryDocuments();
        }),
      ],
      `Actions for "${doc.title || "Untitled"}"`
    );
    menu.classList.add("doc-list-menu");
    menu.addEventListener("click", (event) => event.stopPropagation());
    // **Reported: "the documents popup menu in the library subtab gets cut
    // off."** `.library-view-section` (07-whiteboard-misc.css) is
    // `overflow-y: auto`, and `.action-menu` — the shared kebab menu
    // `kebabMenu()` builds — is `position: absolute`, so it is clipped by
    // that scroll container the same way `.library-image-menu-list` was
    // clipped by `#library-view-media`/`#tab-library` earlier this session.
    // That fix (reparent to `<body>`, position from the button's own rect)
    // is scoped here rather than folded into `openActionMenu` itself:
    // `.action-menu` is shared by note cards, chat, the selection popup and
    // nested submenus, and rewriting the function all of them share is a
    // much larger, riskier change than fixing the one instance actually
    // reported. A MutationObserver on the menu's own `hidden` class means
    // `openActionMenu`/`closeActionMenus` (app.js) are not touched at all —
    // every other kebab in the app keeps its existing, working behaviour.
    wireEscapedActionMenu(menu);

    open.append(top, body, menu);
    item.appendChild(open);
    list.appendChild(item);
  }
  syncLibraryDocsSelectbar();
}

function syncLibraryDocsSelectbar() {
  const bar = document.getElementById("library-docs-selectbar");
  const count = document.getElementById("library-docs-selected-count");
  if (!bar || !count) return;
  const n = libraryDocsSelection.size;
  bar.classList.toggle("hidden", n === 0);
  count.textContent = `${n} selected`;
}

$("library-docs-clear-selection")?.addEventListener("click", () => {
  libraryDocsSelection.clear();
  renderLibraryDocuments();
});

$("library-docs-bulk-delete")?.addEventListener("click", async () => {
  const ids = [...libraryDocsSelection];
  if (!ids.length) return;
  const ok = await confirmDialog(
    `Delete ${ids.length} document${ids.length === 1 ? "" : "s"}? This cannot be undone.`
  );
  if (!ok) return;
  let deleted = 0;
  for (const id of ids) {
    try {
      await apiJson(`/documents/${id}`, { method: "DELETE" });
      deleted++;
    } catch {
      // counted below, same as the "All" view's own bulk delete
    }
  }
  libraryDocsSelection.clear();
  if (deleted) toast(`Deleted ${deleted} document${deleted === 1 ? "" : "s"}.`);
  const failed = ids.length - deleted;
  if (failed) toast(`${failed} document${failed === 1 ? "" : "s"} couldn't be deleted.`, true);
  renderLibraryDocuments();
});

// Every `/media/upload` has ever produced — note-inline images, document
// images, and whiteboard image objects alike, since all three funnel
// through the same upload endpoint and (asked for directly) "images can be
// managed (delete, rename etc) in the gallery as well." A file whose bytes
// are gone (deleted from here, or off-disk by hand) leaves a broken-image
// glyph — same guard `libraryCard`'s own thumbnail already uses — but a
// note or whiteboard still referencing a *deleted* url gets its own
// placeholder instead of a broken glyph; see `renderInlineMarkdown`'s own
// image `error` handler and `wbRenderObjects`'s image-object one.
//: The last `GET /media` fetch, so the search box (below) can filter and
//: re-render without a round-trip on every keystroke — the same reasoning
//: the main Library search already uses against `libraryItems`.
let libraryImagesCache = [];

// Captioning runs on a background thread after upload (routes_files.py) —
// the gallery only ever showed the caption once something re-fetched
// `/media`, and nothing did that on its own. Reported directly: a caption
// "doesn't work" at the time, then is there after reopening the app later —
// it worked all along, the UI just never looked again. Runs only while the
// Image Gallery is the visible sub-tab (started/stopped by the sub-tab
// click handler below); skips a poll while a caption or rename field is
// mid-edit so a silent re-render can't wipe out unsaved typing.
let libraryImagesPollTimer = null;
function startLibraryImagesPoll() {
  stopLibraryImagesPoll();
  libraryImagesPollTimer = setInterval(() => {
    if (document.querySelector(".library-image-caption-input, .library-image-rename-input")) {
      return;
    }
    renderLibraryImagesGallery();
  }, 6000);
}
function stopLibraryImagesPoll() {
  if (libraryImagesPollTimer) clearInterval(libraryImagesPollTimer);
  libraryImagesPollTimer = null;
}

//: Icon and type label for a non-image upload's tile. Deliberately reads
//: the *url* rather than a stored mime: `MediaUpload` has never carried one
//: (it stores a filename and nothing about content type), and the extension
//: is what the allowlist that let the file in already validated.
//: **What counts as an image**, in one place. The gallery tile code already
//: had this test inline (a PDF rendered as an `<img>` decodes to nothing and
//: the tile deletes itself — see `filterLibraryImagesGallery`), and the
//: Images/Files split needs exactly the same answer. Two copies of it would
//: be two chances for a `.heic` to be an image in one and a file in the other.
function isImageUrl(url) {
  //: Asked for directly: "make sure all image file types are sorted into the
  //: image gallery". The list was the eight this app's own upload input
  //: happened to accept, so anything arriving by another route — dragged from
  //: a phone export, attached to a note, restored from a backup — was an
  //: image the Files tab held. `.heic`/`.heif` are what a phone actually
  //: writes, `.tif`/`.tiff` what a scanner does, and `.jfif` is what some
  //: Windows tools still save a JPEG as. Widening the test is safe in the
  //: direction that matters: the gallery already deletes a tile whose `<img>`
  //: decodes to nothing (`filterLibraryImagesGallery`), so a browser that
  //: cannot render a HEIC drops it rather than showing a broken frame, while
  //: one that can shows it where it belongs.
  //:
  //: The extension is read up to a `?` or `#` rather than to the end of the
  //: string, because an Attachment's url can carry a cache-busting query and
  //: an anchored test called that a non-image. Written as a fixed alternation
  //: with a single optional group — not a `[…]+$` run, which is the
  //: polynomial-backtracking shape CodeQL has already caught in this repo.
  return /\.(png|jpe?g|jfif|gif|webp|avif|bmp|ico|svg|heic|heif|tiff?|apng)(?:[?#]|$)/i.test(
    url || "",
  );
}

//: **Preview art or type icon, the viewer's choice.** Asked for: "make it
//: togglable to change between filetype and previews".
//:
//: Persisted in `localStorage` rather than in preferences: it is a way of
//: looking at one list, like the notes rows/cards toggle beside it in the same
//: kind of control, not a setting about the notebook. It also costs no
//: round-trip, so the grid does not flicker into the wrong mode on load.
//:
//: Applied as a class on the grid and resolved entirely in CSS. The tiles
//: already contain both the page render and the glyph — the render simply
//: covers the glyph — so switching modes is a matter of whether the cover is
//: painted, and nothing has to be rebuilt, refetched or re-laid-out.
const LIBRARY_MEDIA_VIEW_KEY = "library-media-view";
let libraryMediaView = localStorage.getItem(LIBRARY_MEDIA_VIEW_KEY) === "type" ? "type" : "preview";

function applyLibraryMediaView() {
  const grid = document.getElementById("library-images-grid");
  if (grid) grid.classList.toggle("show-file-types", libraryMediaView === "type");
  const preview = document.getElementById("library-media-view-preview");
  const type = document.getElementById("library-media-view-type");
  preview?.classList.toggle("active", libraryMediaView === "preview");
  preview?.setAttribute("aria-pressed", String(libraryMediaView === "preview"));
  type?.classList.toggle("active", libraryMediaView === "type");
  type?.setAttribute("aria-pressed", String(libraryMediaView === "type"));
}

function setLibraryMediaView(mode) {
  libraryMediaView = mode === "type" ? "type" : "preview";
  localStorage.setItem(LIBRARY_MEDIA_VIEW_KEY, libraryMediaView);
  applyLibraryMediaView();
}

document.addEventListener("DOMContentLoaded", () => {
  document
    .getElementById("library-media-view-preview")
    ?.addEventListener("click", () => setLibraryMediaView("preview"));
  document
    .getElementById("library-media-view-type")
    ?.addEventListener("click", () => setLibraryMediaView("type"));
  applyLibraryMediaView();
});

//: Which of the two media sub-tabs is showing. Not persisted: it is a place
//: in the Library, and the sub-tab strip already says which one you are on.
let libraryMediaKind = "images";

const LIBRARY_MEDIA_COPY = {
  images: {
    title: "Images",
    icon: "ph ph-images-square ph-lead",
    emptyTitle: "No images yet",
    emptyBody: "Paste, drop, or attach one to a note and it shows up here.",
    search: "Search filenames, captions and text found in images…",
    noMatch: "No images match your search.",
  },
  files: {
    title: "Files",
    icon: "ph ph-file-text ph-lead",
    emptyTitle: "No files yet",
    emptyBody:
      "Drop a PDF or a document into a note, or use Upload above, and it shows up here.",
    search: "Search filenames and text found in files…",
    noMatch: "No files match your search.",
  },
};

function setLibraryMediaKind(kind) {
  libraryMediaKind = kind === "files" ? "files" : "images";
  const copy = LIBRARY_MEDIA_COPY[libraryMediaKind];
  const title = $("library-media-title");
  if (title) title.textContent = copy.title;
  const icon = $("library-media-empty-icon");
  if (icon) icon.className = copy.icon;
  const emptyTitle = $("library-media-empty-title");
  if (emptyTitle) emptyTitle.textContent = copy.emptyTitle;
  const emptyBody = $("library-media-empty-body");
  if (emptyBody) emptyBody.textContent = copy.emptyBody;
  const search = $("library-images-search");
  if (search) search.placeholder = copy.search;
  const noMatch = $("library-images-no-match");
  if (noMatch) noMatch.textContent = copy.noMatch;
  // The upload button offers what this sub-tab is *for*. It still accepts
  // both — a person who picks a PDF on the Images tab gets the PDF, it just
  // appears under Files — because refusing a file the app can store would be
  // worse than filing it somewhere they then have to look.
  const input = $("library-images-upload-input");
  if (input) {
    input.accept =
      libraryMediaKind === "files"
        ? "application/pdf,text/plain,text/markdown,text/csv,application/json"
        : "image/png,image/jpeg,image/gif,image/webp,image/avif,image/bmp,image/x-icon,image/heic,image/heif,image/tiff,image/apng";
  }
}

//: **One way to jump to a stored file**, used by the palette, the graph and
//: the Connections dialog. It exists because the media view became *two*
//: sub-tabs: `querySelector('[data-target="library-view-media"]')` now
//: matches both and returns Images, so every one of those jumps would have
//: landed a PDF on the Images tab and shown "no match".
//:
//: The sub-tab is clicked rather than switched by hand for the same reason
//: those call sites already clicked it: the strip's own handler owns the
//: active class, the aria-selected state and the lazy render, and this app
//: has already learned once that re-implementing three of those is how they
//: drift.
function focusLibraryFile(name, url) {
  switchTab("library");
  const kind = isImageUrl(url) ? "images" : "files";
  document
    .querySelector(`#library-subtabs button[data-media-kind="${kind}"]`)
    ?.click();
  const search = $("library-images-search");
  if (search) {
    search.value = name || "";
    search.dispatchEvent(new Event("input", { bubbles: true }));
  }
}
window.focusLibraryFile = focusLibraryFile;

function mediaFileIcon(url) {
  const ext = url.split(".").pop().split(/[?#]/)[0].toLowerCase();
  const map = {
    pdf: "ph-file-pdf", doc: "ph-file-doc", docx: "ph-file-doc",
    xls: "ph-file-xls", xlsx: "ph-file-xls", csv: "ph-file-csv",
    ppt: "ph-file-ppt", pptx: "ph-file-ppt",
    txt: "ph-file-text", md: "ph-file-md", json: "ph-file-code",
    zip: "ph-file-archive",
  };
  return map[ext] || "ph-file";
}

function mediaFileKind(url) {
  const ext = url.split(".").pop().split(/[?#]/)[0].toLowerCase();
  return (ext || "file").toUpperCase();
}

//: One call for "read this file with the models", whichever table the row
//: came from. A `MediaUpload` has three endpoints (`/media/{id}/caption`,
//: `/ocr`, `/vision-ocr`); an `Attachment` has one that takes the kind
//: (`/files/{id}/analyse`), because that side was built after it was clear
//: the three differ only in which column they write. The tile does not care:
//: it asks for a kind and gets the updated row back either way.
//:
//: Asked for directly: "the files tab needs vision model and ocr model
//: caption and text extraction… the text and analysis needs to be accessible
//: to the ai models and modifyable by the user."
async function analyseMediaRow(image, kind, payload = {}) {
  if (image._isAttachment) {
    return apiJson(`/files/${image.id}/analyse`, {
      method: "POST",
      body: JSON.stringify({ kind: kind === "vision-ocr" ? "vision" : kind, ...payload }),
    });
  }
  return apiJson(`/media/${image.id}/${kind}`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

//: Which gallery tiles are ticked. Media, attachments and sketches live in
//: three different tables, so a selection is keyed by the row's own kind as
//: well as its id — `media:12` and `attachment:12` are different files.
const libraryMediaSelection = new Map();

function mediaRowKey(image) {
  const kind = image._isAttachment ? "attachment" : "media";
  return `${kind}:${image.id}`;
}

//: The one place that knows where each kind of row is deleted, so the tile's
//: own Delete and the bulk bar cannot drift apart.
function mediaRowDeleteEndpoint(image) {
  if (image._isAttachment) return `/files/${image.id}`;
  return `/media/${image.id}`;
}

function syncLibraryMediaSelectbar() {
  const bar = document.getElementById("library-media-selectbar");
  const count = document.getElementById("library-media-selected-count");
  if (!bar || !count) return;
  const n = libraryMediaSelection.size;
  bar.classList.toggle("hidden", n === 0);
  count.textContent = `${n} selected`;
}

function clearLibraryMediaSelection() {
  libraryMediaSelection.clear();
  for (const tick of document.querySelectorAll(".library-tile-tick")) tick.checked = false;
  syncLibraryMediaSelectbar();
}

async function bulkDeleteLibraryMedia() {
  const rows = [...libraryMediaSelection.values()];
  if (!rows.length) return;
  if (
    !(await confirmDialog(
      `Delete ${rows.length} selected item${rows.length === 1 ? "" : "s"}?\n\n` +
        'Any note or board still showing one will show a "deleted" placeholder instead.'
    ))
  ) {
    return;
  }
  for (const image of rows) {
    await apiJson(mediaRowDeleteEndpoint(image), { method: "DELETE" }).catch((err) =>
      toast(err.message, true)
    );
    const idx = libraryImagesCache.indexOf(image);
    if (idx !== -1) libraryImagesCache.splice(idx, 1);
  }
  libraryMediaSelection.clear();
  syncLibraryMediaSelectbar();
  filterLibraryImagesGallery();
}

async function renderLibraryImagesGallery() {
  const grid = $("library-images-grid");
  const empty = $("library-images-empty");
  if (!grid) return;
  //: The grid is rebuilt from scratch on every render, so the view class has
  //: to be re-applied with it — the toggle is a property of the list, not of
  //: the tiles that happen to be in it right now.
  applyLibraryMediaView();
  const images = await apiJson("/media", { silent: true }).catch(() => null);
  // A note's own attached file (`Attachment`, not `MediaUpload`) never came
  // from `/media` at all — reported directly, twice: "a pdf I uplaoded to a
  // note doesnt show in the libary" and "my uploaded pdf file isnt shown in
  // the library files subtab". `GET /files/gallery` (routes_files.py) is the
  // same rows the note editor's own attachment list already shows, reshaped
  // for this gallery — see its own docstring for why it's a separate,
  // smaller shape rather than pretending an attachment has OCR/captions.
  //
  // `_isImage`/`_isAttachment` are set here, once, rather than making every
  // later call site re-derive them: an attachment's `.url` is `/files/{id}`
  // with no extension (served by id, not by stored filename), so the
  // extension-sniffing `isImageUrl()` below — which is exactly right for a
  // `/media/{name}.ext` row — would silently call every attachment a "file"
  // regardless of its real mime.
  const attachments = await apiJson("/files/gallery", { silent: true }).catch(() => []);
  // **These two loops are load-bearing and were once silently lost.**
  // Reported: "none of the images and sketches are in the images library
  // subtab at all and all the files are in the files subtab" — and that is
  // exactly what an unset `_isImage` produces, because the kind filter below
  // reads `!i._isImage` for Files: `undefined` is falsy, so every single row
  // in the notebook satisfied "is a file" and none satisfied "is an image".
  // Nothing threw and nothing logged; the Images tab just rendered its empty
  // state on a notebook full of pictures. The comment above survived the edit
  // that dropped the code it describes, which is the only reason this was
  // findable by reading — so if this ever needs changing again, change both.
  for (const item of images || []) item._isImage = isImageUrl(item.url);
  for (const item of attachments || []) {
    item._isImage = (item.mime || "").startsWith("image/");
    item._isAttachment = true;
    // Never OCR'd, captioned or read by a vision model unless the analyse
    // step has run — explicit empty strings, the same never-null convention
    // `MediaUploadOut` uses, so the search filter and the lightbox can read
    // these without a branch for which kind of row they have.
    item.ocr_text = item.ocr_text || "";
    item.caption = item.caption || "";
    item.vision_ocr_text = item.vision_ocr_text || "";
  }
  libraryImagesCache = [...(images || []), ...(attachments || [])];
  if (!images && !attachments?.length) {
    grid.replaceChildren();
    empty?.classList.remove("hidden");
    return;
  }
  filterLibraryImagesGallery();
}

// Filters `libraryImagesCache` against the search box's own value — the
// filename *and* any OCR text found on the image (ROADMAP.md item 30d), so
// "what was on that whiteboard photo from March" is answerable by typing
// a word that was written on it, not just what it happened to be named.
function filterLibraryImagesGallery() {
  const grid = $("library-images-grid");
  const empty = $("library-images-empty");
  const noMatch = $("library-images-no-match");
  if (!grid) return;
  const query = ($("library-images-search")?.value || "").trim().toLowerCase();
  // Kind first, then the search box. Both the "nothing here" and the "nothing
  // matches" states below are about *this* sub-tab, so the count they test
  // has to be the kind-filtered one — otherwise a notebook holding only PDFs
  // would show the Images tab as "no match for your search" with an empty
  // search box.
  const ofKind = libraryImagesCache.filter((i) =>
    libraryMediaKind === "files" ? !i._isImage : i._isImage
  );
  const images = query
    ? ofKind.filter(
        (i) =>
          (i.original_name || "").toLowerCase().includes(query) ||
          (i.ocr_text || "").toLowerCase().includes(query) ||
          (i.caption || "").toLowerCase().includes(query)
      )
    : ofKind;
  grid.replaceChildren();
  if (!ofKind.length) {
    empty?.classList.remove("hidden");
    noMatch?.classList.add("hidden");
    return;
  }
  empty?.classList.add("hidden");
  noMatch?.classList.toggle("hidden", images.length > 0);
  for (const image of images) {
    const fig = document.createElement("figure");
    fig.className = "library-image-tile";
    // **A PDF is not an image, and rendering one as an <img> is why files
    // "dont appear anywhere".** Reported directly, and this is the whole
    // mechanism: every `/media/upload` row was rendered into an `<img
    // src="/media/…">` regardless of type, so a PDF failed to decode, the
    // `error` handler below fired, and the tile *deleted itself* — silently,
    // with no message, from the only screen that lists uploads at all. The
    // file was on disk and in the database the entire time.
    //
    // The gallery already knew how to open one: the lightbox sniffs a
    // non-image `/media/…` url and hands it to the document viewer. Only the
    // tile was missing, so this gives a non-image its own tile instead of an
    // image that cannot exist.
    // `image._isImage` (set in renderLibraryImagesGallery), not
    // `isImageUrl(image.url)`: an Attachment row's url is `/files/{id}` —
    // served by id, no file extension at all — so the url-sniffing test
    // that works for a `/media/{name}.ext` row would call every attached
    // PDF a "file" with no icon or label. `mediaFileIcon`/`mediaFileKind`
    // below read `original_name` for the same reason: it carries the real
    // extension on both kinds of row, where the url only does for one.
    const isImage = image._isImage;
    const img = document.createElement(isImage ? "img" : "div");
    if (isImage) {
      img.src = mediaSrc(image.url);
      img.alt = image.original_name;
      img.loading = "lazy";
    } else {
      img.className = "library-file-thumb";
      // **A PDF shows its first page.** Reported: "in the files tab, there
      // is no preview" — every non-image tile was a glyph and an extension,
      // which tells you nothing you could not read from the filename. The
      // page renderer already exists for the viewer (`/files/{id}/pdf-page`,
      // `/media/pdf-page/{name}`); this is the same call at thumbnail size.
      // The glyph stays underneath as the fallback for everything without
      // pages, and for a PDF whose render fails.
      if (image.has_pages || /\.pdf$/i.test(image.original_name || "")) {
        const page = document.createElement("img");
        page.className = "library-file-page";
        page.loading = "lazy";
        page.alt = "";
        page.src = mediaSrc(
          image._isAttachment
            ? `/files/${image.id}/pdf-page/0`
            : `/media/pdf-page/${encodeURIComponent((image.url || "").split("/").pop())}/0`
        );
        page.addEventListener("error", () => page.remove());
        img.appendChild(page);
      }
      const glyph = document.createElement("i");
      glyph.className = `ph ${mediaFileIcon(image.original_name)}`;
      glyph.setAttribute("aria-hidden", "true");
      const kind = document.createElement("span");
      kind.className = "library-file-thumb-kind";
      kind.textContent = mediaFileKind(image.original_name);
      img.append(glyph, kind);
      img.setAttribute("role", "img");
      img.setAttribute("aria-label", `${mediaFileKind(image.original_name)} — ${image.original_name}`);
    }
    img.addEventListener("error", () => {
      fig.remove();
      // Every tile's click handler closes over this same `images` array by
      // reference and re-reads it at click time, not a snapshot taken here
      // — so removing the broken entry from it is what every *other* tile's
      // "N of M" and prev/next actually see. Without this, a gallery whose
      // underlying file was deleted from disk (but not from the DB) would
      // hide the broken tile yet still count it: reported live as "it says
      // 1 of 2 when I only have one image" on a gallery with exactly one
      // real tile and one 404ing one.
      const idx = images.indexOf(image);
      if (idx !== -1) images.splice(idx, 1);
    });
    img.addEventListener("click", () => {
      // A sketch's "full size" is the board it lives on — there is no file
      // to open in a lightbox, and the board is where it can actually be
      // edited, moved or deleted in context.
      openLightbox(
        images.map((i) => ({
          filename: i.original_name,
          getUrl: () => mediaSrc(i.url),
          // The one caller with a real *MediaUpload* row, so the lightbox's
          // id-gated actions (rename/describe/OCR/delete) only ever appear
          // here — every other caller has a url and nothing else, and a
          // button guaranteed to 404 is worse than no button. `i._isAttachment`
          // (Attachment rows this gallery also lists now, see
          // renderLibraryImagesGallery) is the same case: `i.id` is real,
          // but it names a row in a different table with none of those
          // actions, so it must stay unset here for exactly the reason this
          // comment already gives.
          id: i._isAttachment ? undefined : i.id,
          // Asked for directly: "if clicking on an image to view expand it in
          // the lightbox…can the captions and ocr accompany it somehow??"
          // The tile is the one place these are too small to read.
          caption: i.caption || "",
          text: (i.vision_ocr_text || i.ocr_text || "").trim(),
          byline: i.vision_ocr_text
            ? `Text read by ${i.vision_ocr_model || "a model"}`
            : i.ocr_text
              ? "Text read with Tesseract OCR"
              : "",
          addedAt: i.created_at || "",
        })),
        images.indexOf(image)
      );
    });
    // The tick. Same control the Documents list already uses, so selecting
    // works the same way wherever you are in the Library.
    const tick = document.createElement("input");
    tick.type = "checkbox";
    tick.className = "library-tile-tick";
    tick.checked = libraryMediaSelection.has(mediaRowKey(image));
    tick.setAttribute("aria-label", `Select ${image.original_name}`);
    tick.addEventListener("click", (event) => event.stopPropagation());
    tick.addEventListener("change", () => {
      if (tick.checked) libraryMediaSelection.set(mediaRowKey(image), image);
      else libraryMediaSelection.delete(mediaRowKey(image));
      syncLibraryMediaSelectbar();
    });
    fig.appendChild(tick);

    const del = document.createElement("button");
    del.type = "button";
    del.className = "ghost small icon-button library-image-delete";
    del.title = `Delete “${image.original_name}”`;
    setLabel(del, "ph:trash");
    del.addEventListener("click", async (e) => {
      e.stopPropagation();
      if (!(await confirmDialog(`Delete "${image.original_name}"?\n\nAny note or board still showing it will show a "deleted" placeholder instead.`))) return;
      // An Attachment row (image._isAttachment) lives at a completely
      // different id space from MediaUpload — `DELETE /media/{id}` here
      // would either 404 or, worse, delete an unrelated MediaUpload row
      // that happened to share the same numeric id.
      await apiJson(mediaRowDeleteEndpoint(image), { method: "DELETE" }).catch((err) =>
        toast(err.message, true)
      );
      libraryMediaSelection.delete(mediaRowKey(image));
      syncLibraryMediaSelectbar();
      const idx = libraryImagesCache.indexOf(image);
      if (idx !== -1) libraryImagesCache.splice(idx, 1);
      filterLibraryImagesGallery();
    });
    // Rename. Reported as simply missing: there was no way to rename an image
    // in the Library at all. The stylesheet already had `.library-image-edit`
    // from an earlier attempt — the CSS shipped and the button that would have
    // used it never did, so the rule sat there styling nothing.
    //
    // Renamed in place rather than through a dialog: a gallery is a wall of
    // captions and the one you are changing should stay where it is, next to
    // the picture it names.
    const rename = document.createElement("button");
    rename.type = "button";
    rename.className = "ghost small icon-button library-image-edit";
    rename.title = `Rename “${image.original_name}”`;
    rename.setAttribute("aria-label", `Rename ${image.original_name}`);
    setLabel(rename, "ph:pencil-simple");

    const cap = document.createElement("figcaption");
    cap.textContent = image.original_name;
    cap.title = image.original_name;

    rename.addEventListener("click", (event) => {
      event.stopPropagation();
      if (cap.querySelector("input")) return; // already editing
      const box = document.createElement("input");
      box.type = "text";
      box.className = "library-image-rename-input";
      box.value = image.original_name;
      box.setAttribute("aria-label", "New name for this image");
      box.maxLength = 255;
      cap.replaceChildren(box);
      box.focus();
      box.select();

      let settled = false;
      const finish = (text) => {
        if (settled) return;
        settled = true;
        cap.replaceChildren(document.createTextNode(text));
      };
      const cancel = () => finish(image.original_name);
      const save = async () => {
        const next = box.value.trim();
        if (!next || next === image.original_name) return cancel();
        // Optimistic, then corrected: the server is the authority on what a
        // name may contain, and it rejects with a reason worth showing.
        finish(next);
        try {
          const saved = await apiJson(`/media/${image.id}`, {
            method: "PUT",
            body: JSON.stringify({ original_name: next }),
          });
          image.original_name = saved.original_name;
          cap.replaceChildren(document.createTextNode(saved.original_name));
          img.alt = saved.original_name;
          rename.title = `Rename “${saved.original_name}”`;
          del.title = `Delete “${saved.original_name}”`;
        } catch (error) {
          cap.replaceChildren(document.createTextNode(image.original_name));
          toast(error.message, true);
        }
      };
      box.addEventListener("keydown", (keyEvent) => {
        if (keyEvent.key === "Enter") {
          keyEvent.preventDefault();
          save();
        } else if (keyEvent.key === "Escape") {
          keyEvent.preventDefault();
          cancel();
        }
      });
      // Clicking away commits, which is what every other inline rename in this
      // app does; Escape is the way out.
      box.addEventListener("blur", save);
    });

    // A vision model's own description of the image, distinct from `cap`
    // above (that's the filename — HTML's own <figcaption> naming just
    // collides with what this app calls a "caption"). Asked for directly:
    // written automatically in the background when a vision model is
    // available (routes_files.py's upload trigger), regenerated here only
    // on an explicit click — never silently overwritten.
    const captionBtn = document.createElement("button");
    captionBtn.type = "button";
    captionBtn.className = "ghost small icon-button library-image-caption-btn";
    setLabel(captionBtn, "ph:sparkle");
    // Always visible, even empty — asked for directly ("allow for manual
    // input of image captions"): a click-to-edit field, the same pattern
    // `cap`'s inline rename above already uses, rather than a caption only
    // ever being reachable through the AI-generate button.
    const captionText = document.createElement("p");
    captionText.className = "library-image-caption muted text-sm";
    captionText.tabIndex = 0;
    captionText.setAttribute("role", "button");
    // Roughly two lines' worth of this tile's narrow column at text-sm —
    // approximate on purpose, the same way LONG_NOTE_CHARS is: the tile is
    // still `display: none` inside a hidden sub-tab at render time for most
    // gallery loads, so a measured height would read 0 (the trap the Notes
    // list's own long-note comment already names).
    const CAPTION_CLAMP_CHARS = 90;
    const captionToggle = document.createElement("button");
    captionToggle.type = "button";
    captionToggle.className = "entry-more library-image-caption-more hidden";
    const captionClamped = () =>
      !libraryExpandedCaptions.has(image.id) &&
      (image.caption || "").length > CAPTION_CLAMP_CHARS;
    const syncCaptionClamp = () => {
      captionText.classList.toggle("library-image-caption-clamped", captionClamped());
      const needsToggle = (image.caption || "").length > CAPTION_CLAMP_CHARS;
      captionToggle.classList.toggle("hidden", !needsToggle);
      captionToggle.textContent = libraryExpandedCaptions.has(image.id)
        ? "Show less"
        : "Show more";
    };
    captionToggle.addEventListener("click", (event) => {
      event.stopPropagation();
      if (libraryExpandedCaptions.has(image.id)) libraryExpandedCaptions.delete(image.id);
      else libraryExpandedCaptions.add(image.id);
      syncCaptionClamp();
    });
    // Which model wrote the caption, and whether a person has since edited
    // it — asked for directly ("AI generated image captions should be
    // tagged on the ui and list what model generated it and if it has been
    // manually modified"). Quiet by design: a byline under a sentence of
    // metadata, not another chip competing with the caption for attention.
    const captionBadge = document.createElement("span");
    captionBadge.className = "library-image-caption-badge muted text-sm hidden";
    const syncCaptionBadge = () => {
      const parts = [];
      if (image.caption_model) parts.push(image.caption_model);
      if (image.caption_edited) parts.push(image.caption_model ? "edited" : "typed by hand");
      captionBadge.textContent = parts.join(" · ");
      captionBadge.classList.toggle("hidden", !image.caption || parts.length === 0);
    };
    const setCaptionState = (text, meta = {}) => {
      image.caption = text || "";
      if ("caption_model" in meta) image.caption_model = meta.caption_model || "";
      if ("caption_edited" in meta) image.caption_edited = Boolean(meta.caption_edited);
      captionText.textContent = text || "Add a caption…";
      captionText.classList.toggle("library-image-caption-empty", !text);
      captionText.title = text
        ? "Click to edit this caption"
        : "Click to add a caption";
      captionBtn.title = text
        ? `Regenerate the AI caption for “${image.original_name}”`
        : `Generate an AI caption for “${image.original_name}”`;
      captionBtn.setAttribute("aria-label", captionBtn.title);
      syncCaptionClamp();
      syncCaptionBadge();
    };
    setCaptionState(image.caption);
    const startEditingCaption = () => {
      if (captionText.querySelector("textarea")) return; // already editing
      // Reported: the caption visibly collapsed the moment you clicked to
      // edit it. The clamp (-webkit-line-clamp, still on captionText from
      // whatever it was displaying a moment ago) treats its child as flowed
      // text truncated to two lines - a <textarea> squashed into that same
      // ~2-line box is what "collapsed" looked like. Editing shows the
      // whole thing either way, so the clamp has nothing left to do here.
      captionText.classList.remove("library-image-caption-clamped");
      const box = document.createElement("textarea");
      box.className = "library-image-caption-input";
      box.value = image.caption || "";
      box.setAttribute("aria-label", `Caption for "${image.original_name}"`);
      box.maxLength = 2000;
      captionText.replaceChildren(box);
      box.focus();
      box.select();
      // A plain textarea doesn't grow with its content — min-height:3rem
      // is a floor, not the whole box, so anything past ~2 lines scrolled
      // inside a tiny window instead of showing (reported: "collapses when
      // I try to edit it"). autoGrow (app.js) is the app's existing fix for
      // exactly this on every other textarea; it just was never wired here.
      autoGrow(box);
      box.addEventListener("input", () => autoGrow(box));

      let settled = false;
      const finish = (text) => {
        if (settled) return;
        settled = true;
        setCaptionState(text);
      };
      const cancel = () => finish(image.caption);
      const save = async () => {
        const next = box.value.trim();
        if (next === (image.caption || "")) return cancel();
        finish(next); // optimistic, corrected below if the server refuses it
        try {
          const updated = await analyseMediaRow(image, "caption", { text: next });
          setCaptionState(updated.caption, {
            caption_model: updated.caption_model,
            caption_edited: updated.caption_edited,
          });
        } catch (error) {
          setCaptionState(image.caption);
          toast(error.message || "Couldn't save that caption.", true);
        }
      };
      box.addEventListener("keydown", (keyEvent) => {
        if (keyEvent.key === "Enter" && !keyEvent.shiftKey) {
          keyEvent.preventDefault();
          save();
        } else if (keyEvent.key === "Escape") {
          keyEvent.preventDefault();
          cancel();
        }
      });
      box.addEventListener("blur", save);
    };
    captionText.addEventListener("click", startEditingCaption);
    captionText.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        startEditingCaption();
      }
    });

    captionBtn.addEventListener("click", async (event) => {
      event.stopPropagation();
      captionBtn.disabled = true;
      // A synchronous route (caption_media runs the model call inline, not
      // in the background), so with nothing shown here the caption text
      // just sat unchanged for however long the model took — asked for
      // directly, a visible "generating" state while one is in flight.
      const previousCaptionText = captionText.textContent;
      captionText.replaceChildren(typingDots("Generating caption…"));
      captionBadge.classList.add("hidden");
      try {
        // force: true — a manual click is exactly "the user pressed the
        // button to rewrite it", the one case the write-once default
        // (caption_and_store) is meant to defer to.
        const updated = await analyseMediaRow(image, "caption", { force: true });
        setCaptionState(updated.caption, {
          caption_model: updated.caption_model,
          caption_edited: updated.caption_edited,
        });
      } catch (error) {
        captionText.textContent = previousCaptionText;
        syncCaptionBadge();
        toast(error.message || "Couldn't generate a caption.", true);
      } finally {
        captionBtn.disabled = false;
      }
    });

    // Tesseract's own reading of any text in the image (core/ocr.py) —
    // local, exact, and (unlike the caption above) not AI-generated, so no
    // model badge. Asked for directly: "allow for manual OCR extraction or
    // retries. allow the user to access, view, and edit OCR extracted
    // text." Same always-visible, click-to-edit shape as captionText above
    // — `POST /media/{id}/ocr` has no write-once guard, so the retry
    // button always re-reads rather than needing a force flag.
    const ocrBtn = document.createElement("button");
    ocrBtn.type = "button";
    ocrBtn.className = "ghost small icon-button library-image-ocr-btn";
    setLabel(ocrBtn, "ph:scan");

    const ocrText = document.createElement("p");
    ocrText.className = "library-image-ocr muted text-sm";
    ocrText.tabIndex = 0;
    ocrText.setAttribute("role", "button");

    // Same clamp/toggle shape as captionText's above.
    const OCR_CLAMP_CHARS = 90;
    const ocrToggle = document.createElement("button");
    ocrToggle.type = "button";
    ocrToggle.className = "entry-more library-image-ocr-more hidden";
    const ocrClamped = () =>
      !libraryExpandedOcr.has(image.id) && (image.ocr_text || "").length > OCR_CLAMP_CHARS;
    const syncOcrClamp = () => {
      ocrText.classList.toggle("library-image-ocr-clamped", ocrClamped());
      const needsToggle = (image.ocr_text || "").length > OCR_CLAMP_CHARS;
      ocrToggle.classList.toggle("hidden", !needsToggle);
      ocrToggle.textContent = libraryExpandedOcr.has(image.id) ? "Show less" : "Show more";
    };
    ocrToggle.addEventListener("click", (event) => {
      event.stopPropagation();
      if (libraryExpandedOcr.has(image.id)) libraryExpandedOcr.delete(image.id);
      else libraryExpandedOcr.add(image.id);
      syncOcrClamp();
    });

    const setOcrState = (text) => {
      image.ocr_text = text || "";
      ocrText.textContent = text || "No text found — click to add";
      ocrText.classList.toggle("library-image-ocr-empty", !text);
      ocrText.title = text ? "Click to edit this text" : "Click to add text";
      ocrBtn.title = `Re-read the text in “${image.original_name}” without AI`;
      ocrBtn.setAttribute("aria-label", ocrBtn.title);
      syncOcrClamp();
      // The section around this paragraph decides whether to show itself from
      // the same value. Announced rather than called directly because the
      // wrapper is built further down, after every handler here is closed
      // over — a plain call would be a forward reference to a `const`.
      ocrText.dispatchEvent(new CustomEvent("mm:changed"));
    };
    setOcrState(image.ocr_text);

    const startEditingOcr = () => {
      if (ocrText.querySelector("textarea")) return; // already editing
      // Same reasoning as captionText's own clamp removal above: a <textarea>
      // squashed into a 2-line clamped box reads as "collapsed" while editing.
      ocrText.classList.remove("library-image-ocr-clamped");
      const box = document.createElement("textarea");
      box.className = "library-image-ocr-input";
      box.value = image.ocr_text || "";
      box.setAttribute("aria-label", `Extracted text for "${image.original_name}"`);
      box.maxLength = 10000;
      ocrText.replaceChildren(box);
      box.focus();
      box.select();
      autoGrow(box);
      box.addEventListener("input", () => autoGrow(box));

      let settled = false;
      const finish = (text) => {
        if (settled) return;
        settled = true;
        setOcrState(text);
      };
      const cancel = () => finish(image.ocr_text);
      const save = async () => {
        const next = box.value.trim();
        if (next === (image.ocr_text || "")) return cancel();
        finish(next); // optimistic, corrected below if the server refuses it
        try {
          const updated = await analyseMediaRow(image, "ocr", { text: next });
          setOcrState(updated.ocr_text);
        } catch (error) {
          setOcrState(image.ocr_text);
          toast(error.message || "Couldn't save that text.", true);
        }
      };
      box.addEventListener("keydown", (keyEvent) => {
        if (keyEvent.key === "Enter" && !keyEvent.shiftKey) {
          keyEvent.preventDefault();
          save();
        } else if (keyEvent.key === "Escape") {
          keyEvent.preventDefault();
          cancel();
        }
      });
      box.addEventListener("blur", save);
    };
    ocrText.addEventListener("click", startEditingOcr);
    ocrText.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        startEditingOcr();
      }
    });

    // Reported directly: this button was always enabled, even on a machine
    // without the `tesseract` binary — the one dependency this app never
    // installs on its own (INSTALL.md) — so pressing it just silently found
    // nothing, indistinguishable from "read the image and there was no
    // text". `/models/status`'s `tesseract_available` (routes_models.py, a
    // plain `shutil.which` check) is what makes that distinguishable.
    if (modelStatus && modelStatus.tesseract_available === false) {
      ocrBtn.disabled = true;
      ocrBtn.title = "Unavailable — the Tesseract OCR program isn't installed. See INSTALL.md.";
      ocrBtn.setAttribute("aria-label", ocrBtn.title);
    }
    ocrBtn.addEventListener("click", async (event) => {
      event.stopPropagation();
      ocrBtn.disabled = true;
      const previousOcrText = ocrText.textContent;
      ocrText.replaceChildren(typingDots("Reading text…"));
      try {
        const updated = await analyseMediaRow(image, "ocr");
        setOcrState(updated.ocr_text);
      } catch (error) {
        ocrText.textContent = previousOcrText;
        toast(error.message || "Couldn't read the text in that image.", true);
      } finally {
        ocrBtn.disabled = modelStatus && modelStatus.tesseract_available === false;
      }
    });

    // A vision model's verbatim transcription of any text in the image —
    // the "extractor mode" asked for directly, distinct from `ocr_text`
    // (Tesseract, automatic on upload, shown just above) and from
    // `captionText` above (a description, not a transcription). Runs
    // automatically on upload too (ai/vision_ocr.py, same as captioning) —
    // this button is the manual re-read. Unlike the caption there is
    // nothing to prompt someone to type by hand here, so it stays hidden
    // until a read has actually happened (automatic or manual).
    const visionOcrBtn = document.createElement("button");
    visionOcrBtn.type = "button";
    visionOcrBtn.className = "ghost small icon-button library-image-vision-ocr-btn";
    setLabel(visionOcrBtn, "ph:text-aa");

    const visionOcrText = document.createElement("p");
    // Not `hidden` any more, and it is the class that had to go rather than
    // the toggle: `setVisionOcrState` stopped hiding this paragraph when the
    // field became always-editable, but the element was still *born* hidden,
    // so a tile for an image nothing had read rendered the label with nothing
    // under it. Measured, not reasoned about — the field came back 17px tall.
    visionOcrText.className = "library-image-vision-ocr muted text-sm";
    // Editable for the same reason `ocrText` is, and it took a user report to
    // notice this one was not: a vision model transcribing a picture with no
    // text in it does not return nothing, it returns its best guess — the
    // report was four hallucinated Pokémon names under a picture of one, with
    // "no text in it and I cant remove or edit the text??". A *reading* the
    // app cannot correct is worse than no reading, because it is then filed
    // and searched as if it were what the page said.
    visionOcrText.tabIndex = 0;
    visionOcrText.setAttribute("role", "button");

    const visionOcrBadge = document.createElement("span");
    visionOcrBadge.className = "library-image-vision-ocr-badge muted text-xs hidden";

    // Same clamp/toggle shape as captionText's/ocrText's above.
    const VISION_OCR_CLAMP_CHARS = 90;
    const visionOcrToggle = document.createElement("button");
    visionOcrToggle.type = "button";
    visionOcrToggle.className = "entry-more library-image-vision-ocr-more hidden";
    const visionOcrClamped = () =>
      !libraryExpandedVisionOcr.has(image.id) &&
      (image.vision_ocr_text || "").length > VISION_OCR_CLAMP_CHARS;
    const syncVisionOcrClamp = () => {
      visionOcrText.classList.toggle("library-image-vision-ocr-clamped", visionOcrClamped());
      const needsToggle = (image.vision_ocr_text || "").length > VISION_OCR_CLAMP_CHARS;
      visionOcrToggle.classList.toggle("hidden", !needsToggle);
      visionOcrToggle.textContent = libraryExpandedVisionOcr.has(image.id)
        ? "Show less"
        : "Show more";
    };
    visionOcrToggle.addEventListener("click", (event) => {
      event.stopPropagation();
      if (libraryExpandedVisionOcr.has(image.id)) libraryExpandedVisionOcr.delete(image.id);
      else libraryExpandedVisionOcr.add(image.id);
      syncVisionOcrClamp();
    });

    const setVisionOcrState = (text, model) => {
      image.vision_ocr_text = text || "";
      image.vision_ocr_model = model || "";
      const hasRun = Boolean(model);
      // Always visible, never hidden-until-run: it is the one field on this
      // tile that can be typed into for an image no model has read, and a
      // field you cannot see is a field you cannot use. (It used to hide
      // itself until a read had happened, which left the *offline* OCR
      // empty-state as the only visible "text" box — the mix-up above.)
      visionOcrText.textContent =
        text || (hasRun ? "No legible text found — click to edit" : "No text yet — click to add");
      visionOcrText.classList.toggle("library-image-ocr-empty", !text);
      visionOcrText.title = text ? "Click to edit or clear this reading" : "Click to add text";
      visionOcrBadge.textContent = hasRun ? `Read by ${model}` : "";
      visionOcrBadge.classList.toggle("hidden", !hasRun);
      visionOcrBtn.title = hasRun
        ? `Read the text in “${image.original_name}” again`
        : `Read any text in “${image.original_name}” with AI`;
      visionOcrBtn.setAttribute("aria-label", visionOcrBtn.title);
      syncVisionOcrClamp();
    };
    setVisionOcrState(image.vision_ocr_text, image.vision_ocr_model);

    // Click-to-edit, mirroring `startEditingOcr` above. Clearing the box is
    // the case that matters most and is why the empty string is sent rather
    // than skipped: an empty save clears the model badge too, server-side, so
    // a wrong reading can be deleted outright instead of only overwritten.
    const startEditingVisionOcr = () => {
      if (visionOcrText.querySelector("textarea")) return; // already editing
      visionOcrText.classList.remove("library-image-vision-ocr-clamped");
      const box = document.createElement("textarea");
      box.className = "library-image-ocr-input";
      box.value = image.vision_ocr_text || "";
      box.setAttribute("aria-label", `Text read from “${image.original_name}”`);
      box.maxLength = 10000;
      visionOcrText.replaceChildren(box);
      box.focus();
      box.select();
      autoGrow(box);
      box.addEventListener("input", () => autoGrow(box));

      let settled = false;
      const finish = (text, model) => {
        if (settled) return;
        settled = true;
        setVisionOcrState(text, model);
      };
      const cancel = () => finish(image.vision_ocr_text, image.vision_ocr_model);
      const save = async () => {
        const next = box.value.trim();
        if (next === (image.vision_ocr_text || "")) return cancel();
        const previousText = image.vision_ocr_text;
        const previousModel = image.vision_ocr_model;
        // Emptying it drops the badge with it: "read by <model>" is a claim
        // about text that no longer exists.
        finish(next, next ? previousModel : "");
        try {
          const updated = await analyseMediaRow(image, "vision-ocr", { text: next });
          setVisionOcrState(updated.vision_ocr_text, updated.vision_ocr_model);
        } catch (error) {
          setVisionOcrState(previousText, previousModel);
          toast(error.message || "Couldn't save that text.", true);
        }
      };
      box.addEventListener("keydown", (keyEvent) => {
        if (keyEvent.key === "Enter" && !keyEvent.shiftKey) {
          keyEvent.preventDefault();
          save();
        } else if (keyEvent.key === "Escape") {
          keyEvent.preventDefault();
          cancel();
        }
      });
      box.addEventListener("blur", save);
    };
    visionOcrText.addEventListener("click", startEditingVisionOcr);
    visionOcrText.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        startEditingVisionOcr();
      }
    });

    visionOcrBtn.addEventListener("click", async (event) => {
      event.stopPropagation();
      visionOcrBtn.disabled = true;
      visionOcrText.replaceChildren(typingDots("Reading text…"));
      visionOcrBadge.classList.add("hidden");
      try {
        // force: true — a manual click always re-reads, the same "the user
        // pressed the button" reasoning captionBtn's own force:true uses.
        const updated = await analyseMediaRow(image, "vision-ocr", { force: true });
        setVisionOcrState(updated.vision_ocr_text, updated.vision_ocr_model);
      } catch (error) {
        // Restores whatever was there before this click — including
        // re-hiding the box if this was the first-ever attempt and it
        // failed, rather than leaving an empty line visible forever.
        setVisionOcrState(image.vision_ocr_text, image.vision_ocr_model);
        toast(error.message || "Couldn't read the text in that image.", true);
      } finally {
        visionOcrBtn.disabled = false;
      }
    });

    // **One kebab, not five icons.** Reported directly: "it also seems like
    // there are two popup buttons on the images in the image library which do
    // the same thing??" — and they nearly did. `ocrBtn` (ph:scan) and
    // `visionOcrBtn` (ph:text-aa) are both "read the text in this image",
    // differing only in *which* reader, which an icon cannot say and a
    // tooltip only says once you have hovered both. The same report proposed
    // the fix: "maybe have the button as a 3-dot kebab button with the other
    // options as a popup menu". A menu row has room for words, so the two
    // readers are now told apart by name rather than by glyph.
    //
    // The buttons themselves are untouched — same elements, same handlers,
    // relabelled and re-parented. A rewrite would have been a rewrite of five
    // working things to change where they sit.
    setLabel(rename, "ph:pencil-simple Rename");
    setLabel(captionBtn, "ph:sparkle Describe with AI");
    setLabel(ocrBtn, "ph:scan Read text (Tesseract OCR)");
    setLabel(visionOcrBtn, "ph:text-aa Read text with AI");
    setLabel(del, "ph:trash Delete");
    for (const button of [rename, captionBtn, ocrBtn, visionOcrBtn, del]) {
      button.classList.remove("icon-button");
      button.classList.add("library-image-menu-item");
    }
    del.classList.add("danger");

    const actions = document.createElement("div");
    actions.className = "library-image-actions";

    // `<details>` rather than a hand-rolled popup: it opens on click and on
    // Enter/Space, closes on Escape, and is exposed to a screen reader as a
    // disclosure — all of it from the browser, none of it from us. The one
    // thing it does not do is close when you click elsewhere, which is the
    // single listener below.
    const menu = document.createElement("details");
    menu.className = "library-image-menu";
    const menuButton = document.createElement("summary");
    menuButton.className = "ghost small icon-button library-image-menu-btn";
    menuButton.title = `More actions for “${image.original_name}”`;
    menuButton.setAttribute("aria-label", menuButton.title);
    setLabel(menuButton, "ph:dots-three");
    const menuList = document.createElement("div");
    menuList.className = "library-image-menu-list";
    // Rename/caption/OCR/vision-OCR are `MediaUpload`-only actions — an
    // Attachment row has none of that (see AttachmentGalleryOut's own
    // docstring, routes_files.py), and each of those buttons' handler calls
    // `/media/{id}/...` with this row's id, which is an Attachment id in a
    // completely separate id space. Wiring them up regardless would mean a
    // button that either 404s or, on an id collision, edits an unrelated
    // MediaUpload row — so for an attachment tile, Delete is the only
    // action offered, same principle as the lightbox's own id-gated actions
    // just above ("a button guaranteed to 404 is worse than no button").
    // Attachments carry caption/OCR/vision columns of their own now (see
    // `Attachment` in core/database.py), so they get the same actions as a
    // MediaUpload row — `analyseMediaRow` routes each one to the right
    // endpoint. Rename is still MediaUpload-only: an attachment's name is
    // the note's own file list's business, not the gallery's. A sketch has
    // no file behind it at all, so it keeps Delete alone.
    menuList.append(
      ...(image._isAttachment
        ? [captionBtn, visionOcrBtn, ocrBtn, del]
        : [rename, captionBtn, visionOcrBtn, ocrBtn, del])
    );
    menu.append(menuButton, menuList);
    // Picking anything closes the menu — on the **capture** phase, which is
    // the whole point. This was a bubble-phase listener with a comment
    // explaining that each button's own handler should run first, but every
    // one of those handlers (rename, caption, both OCR buttons, delete)
    // opens with `event.stopPropagation()` to keep the click off the tile
    // underneath — so the click never reached this listener and the menu
    // never closed. Reported directly: the menu stayed open on top of the
    // rename field it had just opened, covering the thing you were trying to
    // type into.
    //
    // Capturing runs this before those handlers, where nothing can stop it,
    // and closing the menu does not cancel the click that is still on its
    // way to the button — so both halves now happen.
    menuList.addEventListener(
      "click",
      () => {
        menu.open = false;
      },
      { capture: true }
    );
    document.addEventListener("click", (event) => {
      // `menuList` is reparented to <body> while open (see placeMenu), so
      // `menu.contains()` alone no longer covers a click on the menu's own
      // rows — it has to be asked about separately or every click inside
      // the menu reads as a click outside it.
      if (menu.open && !menu.contains(event.target) && !menuList.contains(event.target)) {
        menu.open = false;
      }
    });
    // Which edges to flip toward used to be a CSS-only guess (nth-child(3n)
    // for "last column"), which only held while the grid actually rendered
    // exactly 3 columns — it's `auto-fill`, so a narrower window silently put
    // the wrong tiles on the flip side and every other tile's five-row menu
    // ran off the bottom of the screen with nothing to catch it at all.
    // Reported directly: "make sure the popup options dont get cut off."
    // Measured against the real box now, the same way openActionMenu()
    // (app.js) already does it for every other kebab in the app.
    // **Re-reported after the clamp below was already in place**, with a
    // screenshot of the menu cut off dead straight down its left edge — and
    // a straight vertical cut is a *clipping ancestor*, not a menu that ran
    // past the window. Measured: the menu's ancestor chain has two of them,
    // `#library-view-media` (`overflow-x: auto`) and `#tab-library`
    // (`overflow-x: hidden`). No amount of measuring fixes that, because
    // `getBoundingClientRect()` reports the box the menu *would* occupy —
    // it does not know the box is about to be clipped, so a clamp that
    // keeps the menu inside those bounds still gets scissored by them, and
    // a clamp measured against the scroll parent has nowhere left to move.
    //
    // So the menu stops being `position: absolute` inside that subtree and
    // becomes `position: fixed`, positioned from the button's own rect
    // against the viewport — the same escape the whiteboard's context menu
    // already makes (`wb-ctx-menu`), for the same reason. Nothing can clip
    // a fixed element to an ancestor's overflow, so the only bound left to
    // respect is the window, which is what a clamp can actually enforce.
    // **`position: fixed` alone is not enough, and the reason is worth
    // recording.** The first attempt at this made the list fixed and
    // positioned it from the button's rect — and it still landed inside the
    // clipped box, offset from where it was told to go by 54px on one tile
    // and 709px on another. A fixed element resolves against the viewport
    // *unless* an ancestor establishes a containing block for it, which
    // `transform`, `filter`, `backdrop-filter` and `will-change` all do —
    // and the tile's own `section.card.glass` carries `backdrop-filter`.
    // So the coordinates were being resolved against the very element the
    // menu needed to escape.
    //
    // Reparenting to <body> is what actually escapes it: no glass ancestor,
    // no clipping ancestor, and `fixed` finally means the viewport. Same
    // move `wbOpenDockedMenu` makes for the same reason.
    const placeMenu = () => {
      if (!menu.open) {
        if (menuList.parentElement === document.body) menu.append(menuList);
        return;
      }
      if (menuList.parentElement !== document.body) document.body.append(menuList);
      const margin = 8;
      const anchor = menuButton.getBoundingClientRect();
      // Default: hung below the button, right edges aligned — the same
      // placement the absolute version had, just resolved against the
      // viewport instead of the (clipping) offset parent.
      menuList.style.left = "0px";
      menuList.style.top = "0px";
      const box = menuList.getBoundingClientRect();
      let left = anchor.right - box.width;
      let top = anchor.bottom + margin;
      if (left < margin) left = margin;
      if (left + box.width > window.innerWidth - margin) {
        left = Math.max(margin, window.innerWidth - margin - box.width);
      }
      // Flip above the button when there is no room below it, and only
      // then — the menu is five rows tall and a tile near the bottom of
      // the gallery has none.
      if (top + box.height > window.innerHeight - margin) {
        const above = anchor.top - margin - box.height;
        top = above >= margin ? above : Math.max(margin, window.innerHeight - margin - box.height);
      }
      menuList.style.left = `${Math.round(left)}px`;
      menuList.style.top = `${Math.round(top)}px`;
    };
    menu.addEventListener("toggle", placeMenu);
    // A fixed element does not travel with the content it was opened from,
    // so a scroll would leave it stranded over the wrong tile. Cheapest
    // correct answer, and the one the rest of the app uses: close it.
    window.addEventListener("scroll", () => { if (menu.open) menu.open = false; }, true);
    window.addEventListener("resize", () => { if (menu.open) menu.open = false; }, { passive: true });
    actions.append(menu);

    // **Labelled, and separated.** Reported directly: "I feel the image
    // captions and ocr extractions should be separated and labeled, for the
    // ocr, it says 'No text found - click to add' but the extracted text is
    // below that selectable box and not editable??" — which is exactly what
    // an unlabelled stack of three paragraphs produces. What the reader saw
    // was one field's empty-state sitting directly above another field's
    // filled value, with nothing to say they were different fields at all.
    //
    // A description and a transcription are different claims about a picture
    // and are now named as such. `library-image-field` is one block per
    // claim: a small label, the (editable) value, and the byline saying who
    // produced it.
    const field = (labelText, ...children) => {
      const section = document.createElement("section");
      section.className = "library-image-field";
      const label = document.createElement("h4");
      label.className = "library-image-field-label";
      label.textContent = labelText;
      section.append(label, ...children);
      return section;
    };

    const captionField = field(
      "Description",
      captionText,
      captionToggle,
      captionBadge
    );
    const visionField = field(
      "Text in this image",
      visionOcrText,
      visionOcrToggle,
      visionOcrBadge
    );
    // The Tesseract reading is shown only when it actually found something.
    // Tesseract is a system binary this app never installs on its own (by
    // instruction, and `tesseract_available` in /models/status now says so
    // up front rather than after a click) — so on most machines it is
    // permanently empty, and an empty second "no text found" box under a
    // filled one is the confusion this whole block exists to remove.
    // Reachable regardless from the kebab menu.
    const ocrField = field("Also read with Tesseract OCR", ocrText, ocrToggle);
    const syncOcrFieldVisibility = () =>
      ocrField.classList.toggle("hidden", !(image.ocr_text || "").trim());
    syncOcrFieldVisibility();
    ocrText.addEventListener("mm:changed", syncOcrFieldVisibility);
    // Running it from the menu reveals the field, so the result has somewhere
    // to appear even when the run finds nothing and says so.
    ocrBtn.addEventListener("click", () => ocrField.classList.remove("hidden"));

    const fields = document.createElement("div");
    fields.className = "library-image-fields";
    fields.append(captionField, visionField, ocrField);

    // **Where this file is actually used.** Asked for as the Files tab being
    // "properly integrated" rather than just redesigned — and it was the one
    // question the gallery could not answer. A card showed a thumbnail, a
    // filename and two empty prompts, so a wall of sixty uploads told you
    // nothing about what any of them were for, and getting from a file to the
    // note it belongs to meant searching for it by name.
    //
    // Each chip opens the thing that references the file, so the gallery is a
    // way *into* the notebook rather than a dead end. Server-side
    // (`media_gc.usage_map`), built from the same `referenced_names` the
    // orphan collector uses — if the two disagreed, a file this called "used"
    // could be one the collector deletes.
    const usage = document.createElement("div");
    usage.className = "library-image-usage";
    const links = Array.isArray(image.used_by) ? image.used_by : [];
    if (links.length) {
      const lead = document.createElement("span");
      lead.className = "muted text-sm library-image-usage-lead";
      lead.textContent = links.length === 1 ? "Used in" : `Used in ${links.length} places`;
      usage.appendChild(lead);
      for (const use of links.slice(0, 4)) {
        const chip = document.createElement("button");
        chip.type = "button";
        chip.className = "chip chip-interactive library-image-usage-chip";
        const icon = { note: "ph:note", document: "ph:file-text", board: "ph:squares-four" }[use.kind] || "ph:link";
        setLabel(chip, `${icon} ${use.label}`);
        chip.title = `Open the ${use.kind} this file is used in`;
        chip.addEventListener("click", (event) => {
          event.stopPropagation();
          if (use.kind === "note") {
            switchTab("notes");
            flashEntry(use.id);
          } else if (use.kind === "document") {
            switchTab("documents");
            openDocument(use.id);
          } else if (use.kind === "board") {
            openWhiteboardBoard(use.id ?? null);
          }
        });
        usage.appendChild(chip);
      }
      if (links.length > 4) {
        const more = document.createElement("span");
        more.className = "muted text-sm";
        more.textContent = `+${links.length - 4} more`;
        usage.appendChild(more);
      }
    } else if (image.usage_incomplete) {
      // Not the same claim as "unused", and the difference matters: a locked
      // private note could not be read, so this file may well be in use.
      // Saying "not used anywhere" here would invite deleting something live.
      const note = document.createElement("span");
      note.className = "muted text-sm";
      note.textContent = "Usage unknown — a locked private note could not be checked";
      usage.appendChild(note);
    } else {
      const note = document.createElement("span");
      note.className = "muted text-sm";
      note.textContent = "Not used in any note, document or board yet";
      usage.appendChild(note);
    }

    // `fields` (caption/vision-OCR/Tesseract-OCR boxes) is skipped entirely
    // for an attachment tile, not just emptied — each of those is a
    // click-to-edit control that saves through `/media/{id}/...` (see the
    // menuList comment above for why that id doesn't belong to this row),
    // and a caption box that looks editable but silently 404s on save is
    // worse than a tile with no caption box at all.
    fig.append(img, actions, cap, usage, fields);
    grid.appendChild(fig);
  }
}

// The Library's own sub-tab switcher, plus the Documents/Media sub-tabs'
// refresh, search and upload controls — moved here from whiteboard.js's
// DOMContentLoaded listener (see this file's header). Still wrapped in its
// own DOMContentLoaded, matching where it came from; every other file in
// this split registers its top-level listeners as bare statements instead
// (safe because every <script> here loads after body content), but there
// was no reason to change that shape while moving it.
document.addEventListener("DOMContentLoaded", () => {
  const librarySubtabs = document.getElementById("library-subtabs");
  if (librarySubtabs) {
    const buttons = librarySubtabs.querySelectorAll("button");
    // "library-view-documents" is the *All* view — it kept its id when it was
    // renamed, because the id is referenced from several places and a rename
    // buys nothing. "library-view-docs" is the new documents-only section.
    // "library-view-drafts" is gone: drafts became a chip in the All view's
    // filter row (see LIBRARY_KINDS in app.js and _drafts() in
    // routes_library.py).
    const sections = [
      "library-view-documents", "library-view-docs", "library-view-skills",
      "library-view-whiteboard", "library-view-media", "library-view-links",
      "library-view-contents",
    ];

    buttons.forEach(btn => {
      btn.addEventListener("click", () => {
        buttons.forEach(b => {
          b.classList.remove("active");
          b.setAttribute("aria-selected", "false");
        });
        btn.classList.add("active");
        btn.setAttribute("aria-selected", "true");

        const targetId = btn.getAttribute("data-target");
        // Same {tab, section} shape showNotesSection already records —
        // ROADMAP.md §88.1 item 7 / live-list item 13: Library's own
        // sub-tabs were the one gap in "back/forward handles sub-tabs too"
        // that was already scoped and located, not newly discovered here.
        if (typeof recordTabVisit === "function") recordTabVisit("library", targetId);
        sections.forEach(id => {
          const el = document.getElementById(id);
          if (el) {
            if (id === targetId) {
              el.classList.remove("hidden");
            } else {
              el.classList.add("hidden");
            }
          }
        });

        if (targetId === "library-view-media") {
          setLibraryMediaKind(btn.dataset.mediaKind);
          renderLibraryImagesGallery();
          startLibraryImagesPoll();
        } else {
          stopLibraryImagesPoll();
          if (targetId === "library-view-whiteboard") {
            // Lands on the boards gallery, not straight onto a canvas — one
            // door onto the whiteboard, asked for directly, replacing the
            // old always-opens-the-last-board behaviour.
            wbShowBoardsLanding();
          } else if (targetId === "library-view-docs") {
            renderLibraryDocuments();
          } else if (targetId === "library-view-skills") {
            // Here rather than in a `switchTab` wrapper: these are two
            // network-backed renders and they belong to *this* sub-tab, not
            // to every visit to the Library.
            renderSkillsDashboard();
            renderSkillLogs();
          } else if (targetId === "library-view-links") {
            renderBookmarks();
          } else if (targetId === "library-view-contents") {
            renderContents();
          }
        }
      });
    });
  }
  $("library-images-refresh")?.addEventListener("click", renderLibraryImagesGallery);
  $("library-media-bulk-delete")?.addEventListener("click", bulkDeleteLibraryMedia);
  $("library-media-clear-selection")?.addEventListener("click", clearLibraryMediaSelection);
  $("library-images-search")?.addEventListener("input", filterLibraryImagesGallery);
  $("library-docs-refresh")?.addEventListener("click", renderLibraryDocuments);
  $("library-docs-new")?.addEventListener("click", async () => {
    const doc = await createDocumentNamed();
    // switchTab first, then open — the same fix openDoc() above needed
    // ("the documents subtab document cards don't even do anything"): the
    // document was created and loaded into the editor correctly, but the
    // Documents page stayed hidden behind the Library tab, so nothing
    // seemed to happen.
    if (doc) {
      switchTab("documents");
      openDocument(doc.id);
    }
  });
  // Filter as you type. No debounce: the list is already in memory after the
  // first fetch and re-rendering it is cheap, unlike the semantic searches
  // elsewhere that a debounce exists to protect.
  $("library-docs-search")?.addEventListener("input", () => {
    libraryDocsCurrentPage = 1; // a new search can move a document off whatever page it was on
    renderLibraryDocuments();
  });
  const docsPageSizeSelect = $("library-docs-page-size");
  if (docsPageSizeSelect) {
    docsPageSizeSelect.value = libraryDocsPageSize;
    docsPageSizeSelect.addEventListener("change", (e) => {
      libraryDocsPageSize = e.target.value;
      localStorage.setItem("library-docs-page-size", libraryDocsPageSize);
      libraryDocsCurrentPage = 1;
      renderLibraryDocuments();
    });
  }
  $("library-docs-page-prev")?.addEventListener("click", () => {
    if (libraryDocsCurrentPage <= 1) return;
    libraryDocsCurrentPage -= 1;
    renderLibraryDocuments();
  });
  $("library-docs-page-next")?.addEventListener("click", () => {
    libraryDocsCurrentPage += 1; // clamped back down inside renderLibraryDocuments if this overshoots
    renderLibraryDocuments();
  });
  const libraryPageSizeSelect = $("library-page-size");
  if (libraryPageSizeSelect) {
    libraryPageSizeSelect.value = libraryPageSize;
    libraryPageSizeSelect.addEventListener("change", (e) => {
      libraryPageSize = e.target.value;
      localStorage.setItem("library-page-size", libraryPageSize);
      libraryCurrentPage = 1;
      renderLibrary();
    });
  }
  $("library-page-prev")?.addEventListener("click", () => {
    if (libraryCurrentPage <= 1) return;
    libraryCurrentPage -= 1;
    renderLibrary();
  });
  $("library-page-next")?.addEventListener("click", () => {
    libraryCurrentPage += 1; // clamped back down inside renderLibrary if this overshoots
    renderLibrary();
  });
  $("library-images-upload")?.addEventListener("click", () => $("library-images-upload-input").click());
  $("library-images-upload-input")?.addEventListener("change", async (event) => {
    const input = event.target;
    const files = [...input.files];
    input.value = ""; // so picking the same file twice still fires "change"
    if (!files.length) return;
    let uploaded = 0;
    for (const file of files) {
      const form = new FormData();
      form.append("file", file);
      // Asked for directly: OCR/captioning/vision-OCR must not run on a
      // staged upload that never gets saved into a note, document or sent
      // chat message — but the Library's own "Upload images" button has no
      // separate staging step at all, so this upload IS the commit
      // (routes_files.py's upload_media, and core/media_process.py's own
      // docstring, name this exact case).
      form.append("direct", "true");
      try {
        // A bare headers override, not apiJson's default — a FormData body
        // needs the browser to set its own multipart boundary in
        // Content-Type; apiJson's own "application/json" default would
        // fight it (the same fix handleFileUpload's upload already needed).
        const response = await fetch("/media/upload", {
          method: "POST",
          headers: { "X-Auth-Token": authToken() },
          body: form,
        });
        const body = await response.json();
        if (!response.ok) throw new Error(body.detail || `Upload failed (${response.status})`);
        uploaded++;
      } catch (error) {
        toast(`${file.name}: ${error.message}`, true);
      }
    }
    if (uploaded > 0) {
      toast(uploaded === 1 ? "Uploaded." : `Uploaded ${uploaded} files.`);
      renderLibraryImagesGallery();
    }
  });
  $("bookmark-form")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const urlInput = $("bookmark-url-input");
    const titleInput = $("bookmark-title-input");
    const groupInput = $("bookmark-group-input");
    const url = urlInput.value.trim();
    if (!url) return;
    try {
      const created = await apiJson("/bookmarks", {
        method: "POST",
        body: JSON.stringify({
          url, title: titleInput.value.trim(), group_name: groupInput.value.trim(),
        }),
      });
      urlInput.value = "";
      titleInput.value = "";
      groupInput.value = "";
      urlInput.focus();
      if (created.duplicate_of) {
        toast(`Saved — you already had this link (${created.title || created.url}).`);
      }
      renderBookmarks();
    } catch (error) {
      toast(error.message, true);
    }
  });
  $("bookmark-search")?.addEventListener("input", filterBookmarks);
  $("contents-refresh")?.addEventListener("click", renderContents);
  $("contents-mode")?.querySelectorAll("button").forEach((btn) => {
    btn.addEventListener("click", () => {
      $("contents-mode").querySelectorAll("button").forEach((b) => {
        b.classList.remove("active");
        b.setAttribute("aria-selected", "false");
      });
      btn.classList.add("active");
      btn.setAttribute("aria-selected", "true");
      contentsMode = btn.getAttribute("data-mode");
      renderContents();
    });
  });
});

// --- Multi-select for Boards, Links and Contents (asked for directly: "in
// many of the library subtabs… there is no way to multi select") ----------
//
// The Documents and Files/Images sub-tabs already had this — a tick per
// item, a count, a bulk Delete — because it shipped with them, bar and all,
// in index.html. These three sub-tabs did not, so the bar itself (same
// markup, same `.library-contextbar` class those two already use) is built
// here at runtime instead of pasting three more near-identical copies into
// index.html.
//
// One shared count/visibility sync, reused by all three selections below —
// syncLibraryMediaSelectbar/syncLibraryDocsSelectbar above are this same
// six-line shape typed out twice already; a third and fourth copy is what
// this generalises instead of repeating again.
function syncSelectbarCount(idPrefix, n) {
  const bar = document.getElementById(`${idPrefix}-selectbar`);
  const count = document.getElementById(`${idPrefix}-selected-count`);
  if (!bar || !count) return;
  bar.classList.toggle("hidden", n === 0);
  count.textContent = `${n} selected`;
}

//: Builds one `.library-contextbar` — the same element `#library-docs-selectbar`
//: and `#library-media-selectbar` already are in index.html — so a sub-tab
//: that never had one gets the identical bar rather than a fourth visual
//: treatment for "items are selected".
function createLibrarySelectbar(idPrefix, ariaLabel) {
  const bar = document.createElement("div");
  bar.id = `${idPrefix}-selectbar`;
  bar.className = "library-contextbar hidden";
  bar.setAttribute("role", "group");
  bar.setAttribute("aria-label", ariaLabel);
  const count = document.createElement("span");
  count.id = `${idPrefix}-selected-count`;
  count.className = "library-selected-count";
  const end = document.createElement("span");
  end.className = "library-contextbar-end";
  const del = document.createElement("button");
  del.id = `${idPrefix}-bulk-delete`;
  del.className = "ghost small";
  del.type = "button";
  setLabel(del, "ph:trash Delete");
  const clear = document.createElement("button");
  clear.id = `${idPrefix}-clear-selection`;
  clear.className = "ghost small";
  clear.type = "button";
  clear.textContent = "Done";
  end.append(del, clear);
  bar.append(count, end);
  return bar;
}

// --- Boards & maps: the one sub-tab of the three whose gallery is built by
// whiteboard.js (renderLibraryBoardsGallery), which this file does not own
// and does not edit. Its cards carry no id in the DOM — nothing needed one
// until now — so the tick is grafted on from here via a MutationObserver on
// the grid whiteboard.js already tears down and rebuilds on every render,
// rather than by changing what that function builds. -----------------------

//: Keyed by board id (never `null` — the default scratch board is not a real
//: Entry and cannot be deleted; see attachBoardTick).
const libraryBoardsSelection = new Map();

//: Re-fetches the exact list `renderLibraryBoardsGallery` just rendered, with
//: the exact same filter (the search box's current value, the same
//: `wbLastCreatedBoard` patch-in that function does) so the *n*th tick lines
//: up with the *n*th card the observer below just saw appended. If the
//: counts don't match — the grid mutated again while this fetch was in
//: flight — this bails rather than tick the wrong board; the next mutation
//: (the very next render) retries it.
async function syncLibraryBoardsTicks() {
  const grid = document.getElementById("library-boards-grid");
  if (!grid) return;
  const cards = [...grid.querySelectorAll(".library-board-card")];
  if (!cards.length) {
    syncSelectbarCount("library-boards", libraryBoardsSelection.size);
    return;
  }
  let boards;
  try {
    boards = await apiJson("/whiteboard/boards", { silent: true });
  } catch {
    return;
  }
  if (!Array.isArray(boards)) return;
  const created = window.wbLastCreatedBoard;
  if (created && !boards.some((b) => b.id === created.id)) boards.push({ ...created });
  const needle = (document.getElementById("library-boards-search")?.value || "").trim().toLowerCase();
  const shown = needle ? boards.filter((b) => (b.title || "").toLowerCase().includes(needle)) : boards;
  if (shown.length !== cards.length) return;
  // A board ticked in an earlier render that no longer exists (deleted from
  // its own ⋯ menu, or from elsewhere) shouldn't go on counting toward the bar.
  const liveIds = new Set(shown.filter((b) => b.id !== null).map((b) => b.id));
  for (const id of [...libraryBoardsSelection.keys()]) {
    if (!liveIds.has(id)) libraryBoardsSelection.delete(id);
  }
  cards.forEach((card, i) => attachBoardTick(card, shown[i]));
  syncSelectbarCount("library-boards", libraryBoardsSelection.size);
}

function attachBoardTick(card, board) {
  const top = card.querySelector(".library-card-top");
  if (!top) return;
  const existing = top.querySelector(".library-card-tick");
  // The default board (id === null) isn't a note and can't be renamed or
  // deleted — renderLibraryBoardsGallery's own comment says so, right where
  // it skips giving it a ⋯ menu at all. No tick for the same reason an
  // activity row gets no tick in the "All" library view: a Delete that can
  // never do anything is worse than no checkbox.
  if (board.id === null) {
    existing?.remove();
    return;
  }
  if (existing) {
    existing.checked = libraryBoardsSelection.has(board.id);
    return;
  }
  const tick = document.createElement("input");
  tick.type = "checkbox";
  tick.className = "library-card-tick";
  tick.checked = libraryBoardsSelection.has(board.id);
  tick.setAttribute("aria-label", `Select "${board.title}"`);
  tick.addEventListener("click", (event) => event.stopPropagation());
  tick.addEventListener("change", () => {
    if (tick.checked) libraryBoardsSelection.set(board.id, board);
    else libraryBoardsSelection.delete(board.id);
    syncSelectbarCount("library-boards", libraryBoardsSelection.size);
  });
  top.insertBefore(tick, top.firstChild);
}

function clearLibraryBoardsSelection() {
  libraryBoardsSelection.clear();
  for (const tick of document.querySelectorAll("#library-boards-grid .library-card-tick")) {
    tick.checked = false;
  }
  syncSelectbarCount("library-boards", 0);
}

async function bulkDeleteLibraryBoards() {
  const boards = [...libraryBoardsSelection.values()];
  if (!boards.length) return;
  // Same wording renderLibraryBoardsGallery's own per-board Delete already
  // uses (whiteboard.js) — a board goes through `DELETE /entries/{id}` same
  // as that single-item menu action, so the two must not promise different
  // things about whether it comes back.
  if (
    !(await confirmDialog(
      `Delete ${boards.length} board${boards.length === 1 ? "" : "s"}? This cannot be undone.`
    ))
  ) {
    return;
  }
  let deleted = 0;
  for (const board of boards) {
    try {
      await apiJson(`/entries/${board.id}`, { method: "DELETE" });
      deleted++;
    } catch (err) {
      toast(err.message, true);
    }
  }
  libraryBoardsSelection.clear();
  if (deleted) toast(`Deleted ${deleted} board${deleted === 1 ? "" : "s"}.`);
  const failed = boards.length - deleted;
  if (failed) toast(`${failed} board${failed === 1 ? "" : "s"} couldn't be deleted.`, true);
  if (typeof renderLibraryBoardsGallery === "function") renderLibraryBoardsGallery();
}

document.addEventListener("DOMContentLoaded", () => {
  // The bar goes right above the grid it governs, same placement the
  // Documents/Files sub-tabs' own bars have in index.html.
  const boardsGrid = document.getElementById("library-boards-grid");
  if (boardsGrid && !document.getElementById("library-boards-selectbar")) {
    const bar = createLibrarySelectbar("library-boards", "Actions for the selected boards");
    boardsGrid.parentNode.insertBefore(bar, boardsGrid);
    document.getElementById("library-boards-bulk-delete").addEventListener("click", bulkDeleteLibraryBoards);
    document.getElementById("library-boards-clear-selection").addEventListener("click", clearLibraryBoardsSelection);
    // whiteboard.js calls `grid.replaceChildren()` then re-appends every
    // card on each render (a fresh board, a rename, the search box, "+ New
    // board") — this is the one hook available from outside that file that
    // fires exactly then, without this file calling into or duplicating
    // renderLibraryBoardsGallery's own logic.
    new MutationObserver(() => { syncLibraryBoardsTicks(); }).observe(boardsGrid, { childList: true });
  }

  const linksList = document.getElementById("bookmark-list");
  if (linksList && !document.getElementById("library-links-selectbar")) {
    const bar = createLibrarySelectbar("library-links", "Actions for the selected links");
    linksList.parentNode.insertBefore(bar, linksList);
    document.getElementById("library-links-bulk-delete").addEventListener("click", bulkDeleteLibraryLinks);
    document.getElementById("library-links-clear-selection").addEventListener("click", clearLibraryLinksSelection);
  }

  //: The Contents outline had a selection bar here. It went with its ticks —
  //: see the note in the outline builder: a table of contents is for finding
  //: your place, not for bulk-editing. Nothing could reach the bar any more,
  //: and a set of actions for a selection that can never be made is worse
  //: than none.
});

// --- Links (§30): a bookmark shelf for websites, alongside the notes and
// documents already linkable to each other via [[wiki links]] ------------

let bookmarksCache = [];
let bookmarkGroupFilter = null; // null = all groups

//: Which links are ticked, keyed by bookmark id — its own Map so a selection
//: here can never leak into another sub-tab's bulk delete, the same reasoning
//: mediaRowKey's own comment gives for libraryMediaSelection.
const libraryLinksSelection = new Map();

async function renderBookmarks() {
  const list = $("bookmark-list");
  const empty = $("bookmark-empty");
  if (!list) return;
  try {
    bookmarksCache = await apiJson("/bookmarks");
  } catch (error) {
    toast(error.message, true);
    return;
  }
  // A reload can drop a link that was ticked (deleted from its own ⋯, or by
  // the bulk action just below) — same prune renderLibraryDocuments does for
  // libraryDocsSelection, and for the same reason: otherwise the bar's count
  // goes on including a row that no longer exists.
  const liveLinkIds = new Set(bookmarksCache.map((b) => b.id));
  for (const id of [...libraryLinksSelection.keys()]) {
    if (!liveLinkIds.has(id)) libraryLinksSelection.delete(id);
  }
  empty.classList.toggle("hidden", bookmarksCache.length > 0);
  renderBookmarkGroupChips();
  filterBookmarks();
  syncSelectbarCount("library-links", libraryLinksSelection.size);
}

function clearLibraryLinksSelection() {
  libraryLinksSelection.clear();
  renderBookmarks();
}

async function bulkDeleteLibraryLinks() {
  const links = [...libraryLinksSelection.values()];
  if (!links.length) return;
  if (
    !(await confirmDialog(`Delete ${links.length} selected link${links.length === 1 ? "" : "s"}?`))
  ) {
    return;
  }
  let deleted = 0;
  for (const bookmark of links) {
    try {
      await apiJson(`/bookmarks/${bookmark.id}`, { method: "DELETE" });
      deleted++;
    } catch (err) {
      toast(err.message, true);
    }
  }
  libraryLinksSelection.clear();
  if (deleted) toast(`Deleted ${deleted} link${deleted === 1 ? "" : "s"}.`);
  const failed = links.length - deleted;
  if (failed) toast(`${failed} link${failed === 1 ? "" : "s"} couldn't be deleted.`, true);
  renderBookmarks();
}

function renderBookmarkGroupChips() {
  const box = $("bookmark-group-chips");
  const datalist = $("bookmark-group-options");
  if (!box) return;
  const groups = [...new Set(bookmarksCache.map((b) => b.group_name).filter(Boolean))].sort();
  datalist?.replaceChildren(
    ...groups.map((g) => { const opt = document.createElement("option"); opt.value = g; return opt; })
  );
  box.replaceChildren();
  if (groups.length === 0) {
    bookmarkGroupFilter = null;
    return;
  }
  const allChip = document.createElement("button");
  allChip.type = "button";
  allChip.className = `library-chip${bookmarkGroupFilter === null ? " active" : ""}`;
  allChip.textContent = "All";
  allChip.addEventListener("click", () => { bookmarkGroupFilter = null; renderBookmarkGroupChips(); filterBookmarks(); });
  box.appendChild(allChip);
  for (const group of groups) {
    const chipEl = document.createElement("button");
    chipEl.type = "button";
    chipEl.className = `library-chip${bookmarkGroupFilter === group ? " active" : ""}`;
    // "Work/Reading" renders as "Work / Reading" — the "/" is a grouping
    // convention for the user to type, not meant to display as a raw slash.
    chipEl.textContent = group.split("/").join(" / ");
    chipEl.addEventListener("click", () => { bookmarkGroupFilter = group; renderBookmarkGroupChips(); filterBookmarks(); });
    box.appendChild(chipEl);
  }
}

function filterBookmarks() {
  const list = $("bookmark-list");
  const noMatch = $("bookmark-no-match");
  if (!list) return;
  const query = ($("bookmark-search")?.value || "").trim().toLowerCase();
  const visible = bookmarksCache.filter((b) => {
    if (bookmarkGroupFilter !== null && b.group_name !== bookmarkGroupFilter) return false;
    if (!query) return true;
    return (
      b.title.toLowerCase().includes(query) ||
      b.url.toLowerCase().includes(query) ||
      b.note.toLowerCase().includes(query)
    );
  });
  list.replaceChildren();
  for (const bookmark of visible) {
    list.appendChild(bookmarkRow(bookmark));
  }
  noMatch?.classList.toggle("hidden", !(bookmarksCache.length > 0 && visible.length === 0));
}

function bookmarkRow(bookmark) {
  const row = document.createElement("div");
  row.className = "bookmark-row";

  // The tick. Same control (and the same `.doc-list-tick` sizing) the
  // Documents sub-tab's own rows already use, so selecting a link works the
  // same way selecting a document does.
  const tick = document.createElement("input");
  tick.type = "checkbox";
  tick.className = "doc-list-tick";
  tick.checked = libraryLinksSelection.has(bookmark.id);
  tick.setAttribute("aria-label", `Select "${bookmark.title || bookmark.url}"`);
  tick.addEventListener("click", (event) => event.stopPropagation());
  tick.addEventListener("change", () => {
    if (tick.checked) libraryLinksSelection.set(bookmark.id, bookmark);
    else libraryLinksSelection.delete(bookmark.id);
    syncSelectbarCount("library-links", libraryLinksSelection.size);
  });
  row.appendChild(tick);

  const main = document.createElement("div");
  main.className = "bookmark-main";
  const link = document.createElement("a");
  link.href = bookmark.url;
  link.target = "_blank";
  link.rel = "noopener noreferrer";
  link.textContent = bookmark.title || bookmark.url;
  const urlLine = document.createElement("div");
  urlLine.className = "muted text-sm bookmark-url";
  urlLine.textContent = bookmark.url;
  main.append(link, urlLine);
  if (bookmark.group_name) {
    const groupLine = document.createElement("div");
    groupLine.className = "muted text-sm bookmark-group-label";
    setLabel(groupLine, `ph:folder-simple ${bookmark.group_name.split("/").join(" / ")}`);
    main.appendChild(groupLine);
  }
  if (bookmark.note) {
    const noteLine = document.createElement("div");
    noteLine.className = "muted text-sm";
    noteLine.textContent = bookmark.note;
    main.appendChild(noteLine);
  }

  const actions = document.createElement("div");
  actions.className = "row bookmark-actions";

  const pin = document.createElement("button");
  pin.type = "button";
  pin.className = "ghost small";
  pin.title = bookmark.pinned ? "Unpin" : "Pin to the top";
  pin.setAttribute("aria-label", pin.title);
  // No "-fill" pin glyph in this app's bundled Phosphor set (checked: the
  // font only has push-pin/-slash/-simple/-simple-slash) — reported live as
  // a blank icon before this went out. `-slash` for "already pinned, click
  // to undo" is the same pairing the pinned-chat button already uses.
  setLabel(pin, `ph:${bookmark.pinned ? "push-pin-slash" : "push-pin"}`);
  pin.addEventListener("click", async () => {
    await apiJson(`/bookmarks/${bookmark.id}`, {
      method: "PUT",
      body: JSON.stringify({ pinned: !bookmark.pinned }),
    });
    renderBookmarks();
  });

  const edit = document.createElement("button");
  edit.type = "button";
  edit.className = "ghost small";
  edit.title = "Edit";
  edit.setAttribute("aria-label", "Edit this link");
  setLabel(edit, "ph:pencil-simple");
  // **An inline form, not a chain of prompts.** This was two sequential
  // `promptDialog` calls (title, then URL) and was reported as "I still
  // can't edit the link URLs" five separate times. The flow was driven
  // end-to-end in a clean browser each time it was checked and worked
  // every time - including persistence through a reload - so the fault was
  // never in the handler. But a fix nobody can reach is not a fix, and a
  // second modal that only appears *after* you commit the first one is a
  // genuinely poor way to expose a second field: if anything at all
  // interrupts between them (a stale script, an Escape, a mis-click on
  // Cancel) the URL silently never gets asked for, and it looks exactly
  // like "editing the URL is broken".
  //
  // Editing the row in place removes the whole class of problem: all three
  // fields are visible at once, nothing is sequenced, nothing depends on
  // focus returning correctly between modals, and what you are editing
  // stays on screen next to the form.
  edit.addEventListener("click", () => {
    if (row.querySelector(".bookmark-edit-form")) return; // already editing
    const form = document.createElement("form");
    form.className = "bookmark-edit-form";

    const field = (labelText, value, placeholder) => {
      const wrap = document.createElement("label");
      wrap.className = "bookmark-edit-field";
      const span = document.createElement("span");
      span.className = "muted text-xs";
      span.textContent = labelText;
      const input = document.createElement("input");
      input.type = "text";
      input.value = value || "";
      input.placeholder = placeholder;
      wrap.append(span, input);
      form.appendChild(wrap);
      return input;
    };

    const titleInput = field("Title", bookmark.title, "Title");
    const urlInput = field("URL", bookmark.url, "https://example.com");
    // Blank is meaningful here and always was: it means "no group".
    const groupInput = field("Group", bookmark.group_name, "e.g. Work/Reading");

    const buttons = document.createElement("div");
    buttons.className = "row bookmark-edit-actions";
    const save = document.createElement("button");
    save.type = "submit";
    save.className = "small";
    save.textContent = "Save";
    const cancel = document.createElement("button");
    cancel.type = "button";
    cancel.className = "ghost small";
    cancel.textContent = "Cancel";
    buttons.append(save, cancel);
    form.appendChild(buttons);

    const close = () => {
      form.remove();
      main.classList.remove("hidden");
      actions.classList.remove("hidden");
    };
    cancel.addEventListener("click", close);
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const url = urlInput.value.trim();
      if (!url) {
        toast("A link needs a URL.", true);
        urlInput.focus();
        return;
      }
      save.disabled = true;
      try {
        await apiJson(`/bookmarks/${bookmark.id}`, {
          method: "PUT",
          body: JSON.stringify({
            title: titleInput.value.trim(),
            url,
            group_name: groupInput.value.trim(),
          }),
        });
        renderBookmarks();
      } catch (error) {
        save.disabled = false;
        toast(error.message || "Couldn't save that link.", true);
      }
    });

    main.classList.add("hidden");
    actions.classList.add("hidden");
    row.appendChild(form);
    urlInput.focus();
    urlInput.select();
  });

  const group = document.createElement("button");
  group.type = "button";
  group.className = "ghost small";
  group.title = "Move to group";
  group.setAttribute("aria-label", "Move this link to a group");
  setLabel(group, "ph:folder-simple");
  group.addEventListener("click", async () => {
    const value = await promptDialog(
      "Group (e.g. Work/Reading — blank clears it):", bookmark.group_name
    );
    // Unlike the title prompt above, an intentionally blank group is a real,
    // useful answer ("ungroup this link") — so only an actual Cancel/Escape
    // is ignored here, not an emptied field. promptDialog resolves "" for
    // both, so there's genuinely no way to tell them apart from its return
    // value alone; this trades "can't ungroup via Escape" for "can ungroup
    // by clearing the field", the more useful of the two to get right.
    if (value === "" && bookmark.group_name === "") return;
    await apiJson(`/bookmarks/${bookmark.id}`, {
      method: "PUT",
      body: JSON.stringify({ group_name: value }),
    });
    renderBookmarks();
  });

  const remove = document.createElement("button");
  remove.type = "button";
  remove.className = "ghost small";
  remove.title = "Delete";
  remove.setAttribute("aria-label", "Delete this link");
  setLabel(remove, "ph:trash");
  remove.addEventListener("click", async () => {
    const ok = await confirmDialog(`Delete "${bookmark.title || bookmark.url}"?`);
    if (!ok) return;
    await apiJson(`/bookmarks/${bookmark.id}`, { method: "DELETE" });
    renderBookmarks();
  });

  actions.append(pin, edit, group, remove);
  row.append(main, actions);
  return row;
}

// --- Contents (§30): a hyperlinked outline of the notebook's own
// structure — categories and tags, each with what's filed under it. The
// force-directed, spatial visualisation already lives in the Graph tab;
// this is the fast, scannable list half of the same ask. Built entirely
// from `allEntries` (already loaded for the Notes tab) rather than a new
// endpoint — the same data, grouped differently client-side. -----------

let contentsMode = "category";
// A big notebook can have a group with hundreds of notes; nobody scans
// past this many in one outline section, and rendering them all would be
// the one part of this view that isn't cheap.
const CONTENTS_GROUP_CAP = 200;


async function renderContents() {
  const outline = $("contents-outline");
  const empty = $("contents-empty");
  if (!outline) return;
  // Refetched on every visit, not gated behind `entriesEverLoaded` — every
  // sibling Library subtab (Documents, Image Gallery, AI Skills) re-fetches
  // its own data on each visit too, and this outline is exactly the kind of
  // view where showing a note that was just deleted, or missing one just
  // added, would be a wrong answer, not just a stale one.
  await loadEntries();

  const active = allEntries.filter((e) => !e.deleted_at && !e.archived_at);
  outline.replaceChildren();
  empty.classList.toggle("hidden", active.length > 0);
  if (active.length === 0) return;

  const groups = new Map();
  const addTo = (key, entry) => {
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(entry);
  };
  if (contentsMode === "tag") {
    for (const entry of active) {
      if (entry.tags && entry.tags.length) {
        for (const tag of entry.tags) addTo(tag, entry);
      } else {
        addTo("(untagged)", entry);
      }
    }
  } else {
    for (const entry of active) addTo(entry.category || "Uncategorised", entry);
  }

  for (const key of [...groups.keys()].sort((a, b) => a.localeCompare(b))) {
    const members = groups.get(key);
    const section = document.createElement("div");
    section.className = "contents-section";
    const heading = document.createElement("h3");
    heading.className = "contents-heading";
    heading.textContent = `${key} (${members.length})`;
    section.appendChild(heading);
    const list = document.createElement("ul");
    list.className = "contents-list";
    for (const entry of members.slice(0, CONTENTS_GROUP_CAP)) {
      const li = document.createElement("li");
      //: **No tick here.** Asked for directly: "the contents page shouldnt have
      //: radio buttons, it is purely a table of contents." It is right, and it
      //: is a point about what this page *is* rather than about how the
      //: control looked: a table of contents is a way to find your place, and
      //: every row offering to select itself for a bulk delete makes an index
      //: into a management screen you did not ask to be in.
      //:
      //: This does not undo the multi-select asked for across the Library —
      //: Files, Images, Documents and Links keep theirs. Those are lists of
      //: things you act on; this is a map of where things are. The selection
      //: bar above the outline goes with the ticks, since nothing could reach
      //: it any more.
      const link = document.createElement("a");
      link.href = "#";
      link.textContent = noteLabel(entry, 80);
      link.addEventListener("click", (e) => {
        e.preventDefault();
        flashEntry(entry.id);
      });
      li.appendChild(link);
      list.appendChild(li);
    }
    if (members.length > CONTENTS_GROUP_CAP) {
      const more = document.createElement("li");
      more.className = "muted text-sm";
      more.textContent = `…and ${members.length - CONTENTS_GROUP_CAP} more`;
      list.appendChild(more);
    }
    section.appendChild(list);
    outline.appendChild(section);
    // **Say when there is more below the fold.** The list is capped at a
    // height and scrolls, which is right — a category with 36 notes must not
    // make its column 36 rows tall — but the only cue was the platform's own
    // overlay scrollbar, which does not draw until you scroll. A heading
    // reading "UNCATEGORISED (25)" above five visible rows and a sixth
    // sliced in half therefore reads as broken rather than as scrollable.
    //
    // Measured after layout rather than guessed: the class only goes on when
    // this particular list actually overflows, so a category of three notes
    // gets no fade at the bottom of empty space. `requestAnimationFrame`
    // because `scrollHeight` is meaningless until the browser has laid the
    // list out.
    requestAnimationFrame(() => {
      list.classList.toggle("is-scrollable", list.scrollHeight > list.clientHeight + 2);
    });
  }
}
