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
const LIBRARY_OVERVIEW_TILES = [
  { key: "notes", icon: "ph:note-pencil", label: "notes", kind: "note" },
  { key: "documents", icon: "ph:file-text", label: "documents", kind: "document" },
  { key: "chats", icon: "ph:chat-circle", label: "chats", kind: "chat" },
  { key: "tags", icon: "ph:tag", label: "tags", kind: "tag" },
  { key: "shelved", icon: "ph:archive", label: "archived", kind: "shelved" },
  { key: "binned", icon: "ph:trash", label: "in the bin", kind: "archived" },
];

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

function renderLibraryOverview() {
  const box = $("library-overview");
  if (!box) return;
  box.replaceChildren();
  for (const tile of LIBRARY_OVERVIEW_TILES) {
    const value = libraryOverview[tile.key] || 0;
    const button = document.createElement("button");
    button.type = "button";
    button.className = "library-stat" + (libraryKind === tile.kind ? " active" : "");
    const icon = document.createElement("span");
    icon.className = "library-stat-icon";
    setLabel(icon, tile.icon);
    icon.setAttribute("aria-hidden", "true");
    const number = document.createElement("strong");
    number.className = "library-stat-value";
    number.textContent = value;
    const label = document.createElement("span");
    label.className = "library-stat-label";
    setLabel(label, tile.label);
    button.append(icon, number, label);
    button.title = `Show ${tile.label}`;
    // Every tile is a filter. That is what stops it being decoration.
    button.addEventListener("click", () => {
      libraryKind = tile.kind;
      if (tile.kind === "archived") $("library-show-binned").checked = true;
      renderLibraryOverview();
      renderLibraryFilters();
      renderLibrary();
    });
    box.appendChild(button);
  }
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
        : libraryCounts[kind.key] || 0;
    const button = document.createElement("button");
    button.type = "button";
    button.className =
      "library-chip" + (libraryKind === kind.key ? " active" : "");
    button.setAttribute("aria-pressed", String(libraryKind === kind.key));
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
      renderLibraryFilters();
      renderLibrary();
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
  if (libraryKind !== "all") items = items.filter((i) => i.kind === libraryKind);
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
  renderLibrary();
}
$("library-semantic-toggle").addEventListener("change", runLibrarySearch);
$("library-search").addEventListener("input", () => {
  clearTimeout(librarySearchDebounceTimeout);
  librarySearchDebounceTimeout = setTimeout(runLibrarySearch, 150);
});
$("library-sort").addEventListener("change", renderLibrary);
for (const button of document.querySelectorAll("#library-sort-seg button")) {
  button.addEventListener("click", () => {
    document.querySelectorAll("#library-sort-seg button").forEach(b => b.classList.remove("active"));
    button.classList.add("active");
    const select = $("library-sort");
    if (select) select.value = button.dataset.sort;
    renderLibrary();
  });
}
$("library-show-binned").addEventListener("change", renderLibrary);
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
$("library-new-doc").addEventListener("click", () => {
  switchTab("documents");
  // The Documents page's own loader opens the last document otherwise, and a
  // new one would be replaced a moment after it appeared.
  setTimeout(() => $("doc-new").click(), 160);
});

// ======================= SKILLS DASHBOARD TAB =======================

async function renderSkillsDashboard() {
  const container = document.getElementById("skills-dashboard-list");
  if (!container) return;
  
  const skills = await loadSkills();
  const prefs = await apiJson("/preferences").catch(() => ({}));
  container.innerHTML = "";
  
  // Render Autonomous Workers section at the top
  const autoDiv = document.createElement("div");
  autoDiv.className = "card";
  autoDiv.style.marginBottom = "var(--space-6)";
  autoDiv.innerHTML = `
    <div class="row space-between">
      <h3>Autonomous Background Workers</h3>
      <label class="switch">
        <input type="checkbox" id="skills-auto-toggle" ${prefs.autonomous_tasks_enabled ? "checked" : ""}>
        <span class="slider"></span>
      </label>
    </div>
    <p class="muted text-sm">Allow the AI to run tasks in the background automatically.</p>
    <div class="row row-top-gap">
      <label><input type="checkbox" id="skills-auto-tag" ${prefs.auto_tag_enabled !== false ? "checked" : ""}> Auto-tag notes</label>
      <label><input type="checkbox" id="skills-auto-link" ${prefs.auto_link_enabled !== false ? "checked" : ""}> Auto-link ideas</label>
    </div>
  `;
  container.appendChild(autoDiv);

  // The autonomous toggles that live on this panel as well as in Settings →
  // Background tasks. Reported as **"the automated tasks option keeps
  // automatically disabling itself even when turned on"**, and it did:
  //
  // These wrote straight to the server and updated nothing locally. `savePrefs`
  // — which seven other controls call on every change — then rebuilt the whole
  // preferences object from the DOM, reading `#pref-autonomous-tasks`, the
  // *other* checkbox, which nobody had ticked. So enabling it here and then
  // touching any unrelated setting silently switched it back off.
  //
  // `setPreference` is the fix in one place: it saves, updates `prefsCache` so
  // the next `savePrefs` sends the right value, and reconciles the mirrored
  // control so the two screens cannot disagree.
  for (const [id, key] of [
    ["skills-auto-toggle", "autonomous_tasks_enabled"],
    ["skills-auto-tag", "auto_tag_enabled"],
    ["skills-auto-link", "auto_link_enabled"],
  ]) {
    const box = $(id);
    if (box) box.addEventListener("change", (e) => setPreference(key, e.target.checked));
  }
  
  const grid = document.createElement("div");
  grid.className = "skills-grid";
  container.appendChild(grid);
  
  if (!skills.length) {
    grid.innerHTML = `<p class="muted">No skills found.</p>`;
    return;
  }
  
  for (const skill of skills) {
    const card = document.createElement("div");
    card.className = "skill-card";
    
    // Header: Title and Type badge
    const header = document.createElement("div");
    header.className = "skill-card-header";
    const title = document.createElement("div");
    title.className = "skill-card-title";
    title.textContent = skill.name;
    const badge = document.createElement("span");
    badge.className = "status badge";
    badge.textContent = skill.builtin ? "Built-in" : "Custom";
    header.appendChild(title);
    header.appendChild(badge);
    
    // Description
    const desc = document.createElement("div");
    desc.className = "skill-card-desc";
    desc.textContent = skill.description || "No description provided.";
    
    // Footer: Run button
    const footer = document.createElement("div");
    footer.className = "skill-card-footer";
    const runBtn = document.createElement("button");
    runBtn.className = "small";
    runBtn.textContent = "Run Skill";
    runBtn.onclick = () => {
      // runSkill, not startSkill. Reported as "the Run Skill buttons in the AI
      // Skills library are broken", and it was two bugs in one line:
      //
      //   startSkill(skill.name)
      //
      // passed the *name string* where startSkill expects the skill object (so
      // `skill.name` inside it was undefined), and omitted `values` entirely —
      // which made `Object.values(values)` throw "Cannot convert undefined or
      // null to object". That is the app.js:10495 console error reported
      // alongside it: one line, two symptoms.
      //
      // runSkill() is the correct entry point: it prompts for the skill's
      // inputs when it has any, then calls startSkill with a real values
      // object. It also switches to chat itself, so doing it here as well
      // would be a second, redundant tab change.
      runSkill(skill);
    };
    
    const schedBtn = document.createElement("button");
    schedBtn.className = "small ghost";
    schedBtn.textContent = "Schedule";
    schedBtn.onclick = () => {
      toast("Scheduler functionality coming soon!"); // Placeholder for Phase 5 implementation
    };
    
    footer.appendChild(schedBtn);
    footer.appendChild(runBtn);
    
    card.appendChild(header);
    card.appendChild(desc);
    card.appendChild(footer);
    container.appendChild(card);
  }
}

// Hook into switchTab by overriding it to catch the library tab
const originalSwitchTab = switchTab;
window.switchTab = function(name) {
  originalSwitchTab(name);
  if (name === "library") {
    renderSkillsDashboard();
    renderSkillLogs();
  }
};

async function renderSkillLogs() {
  const logList = document.getElementById("skills-logs-list");
  if (!logList) return;
  logList.innerHTML = "<p class='muted'>Loading logs…</p>";
  
  const logs = await apiJson("/audit?limit=20").catch(() => null);
  logList.innerHTML = "";
  
  if (!logs || !logs.length) {
    logList.innerHTML = "<p class='muted'>No logs found.</p>";
    return;
  }
  
  // Filter for skill executions if possible, or just show agent actions
  const skillLogs = logs.filter(log => log.entity_type === "skill" || log.action === "skill_run" || log.action.includes("agent"));
  
  if (!skillLogs.length) {
    logList.innerHTML = "<p class='muted'>No skill execution logs found.</p>";
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
    action.textContent = log.action;
    const when = document.createElement("span");
    when.className = "muted text-sm";
    when.textContent = new Date(log.created_at).toLocaleString();
    head.append(action, when);

    const detail = document.createElement("div");
    detail.className = "muted text-sm log-detail";
    detail.textContent = log.detail || log.entity_id || "";

    div.append(head, detail);
    logList.appendChild(div);
  }
}

// Same shape again, for the Library image gallery's AI captions — keyed by
// upload id. Reported: "the image caption can't be expanded or collapsed",
// which the two-line clamp had no way to do at all until now.
const libraryExpandedCaptions = new Set();
// Which documents are ticked in the Library's Documents sub-tab — this
// view's own selection, separate from `librarySelection` (the "All" view's),
// because this section never populates `libraryItems` and mixing the two
// would let a checkbox here report "selected" while the "All" view's own
// bulk-delete silently found nothing to act on.
const libraryDocsSelection = new Set();

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
  empty?.classList.toggle("hidden", docs.length > 0);
  if (empty && needle && !docs.length) {
    empty.textContent = `No documents match \u201C${needle}\u201D.`;
  } else if (empty) {
    empty.textContent = "No documents yet — press ＋ New document to start one.";
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

    // Same three actions `libraryActions()` gives a document's card in the
    // "All" view — kept as its own copy rather than calling that function
    // directly, because its `reload` is hard-coded to `loadLibrary()` (the
    // "All" view's own data), which would leave this list showing a document
    // that was just renamed or deleted until something else refreshed it.
    const menu = kebabMenu(
      [
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

async function renderLibraryImagesGallery() {
  const grid = $("library-images-grid");
  const empty = $("library-images-empty");
  if (!grid) return;
  const images = await apiJson("/media", { silent: true }).catch(() => null);
  libraryImagesCache = images || [];
  if (!images) {
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
  const images = query
    ? libraryImagesCache.filter(
        (i) =>
          (i.original_name || "").toLowerCase().includes(query) ||
          (i.ocr_text || "").toLowerCase().includes(query) ||
          (i.caption || "").toLowerCase().includes(query)
      )
    : libraryImagesCache;
  grid.replaceChildren();
  if (!libraryImagesCache.length) {
    empty?.classList.remove("hidden");
    noMatch?.classList.add("hidden");
    return;
  }
  empty?.classList.add("hidden");
  noMatch?.classList.toggle("hidden", images.length > 0);
  for (const image of images) {
    const fig = document.createElement("figure");
    fig.className = "library-image-tile";
    const img = document.createElement("img");
    img.src = mediaSrc(image.url);
    img.alt = image.original_name;
    img.loading = "lazy";
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
      openLightbox(
        images.map((i) => ({ filename: i.original_name, getUrl: () => mediaSrc(i.url) })),
        images.indexOf(image)
      );
    });
    const del = document.createElement("button");
    del.type = "button";
    del.className = "ghost small icon-button library-image-delete";
    del.title = `Delete “${image.original_name}”`;
    setLabel(del, "ph:trash");
    del.addEventListener("click", async (e) => {
      e.stopPropagation();
      if (!(await confirmDialog(`Delete "${image.original_name}"?\n\nAny note or board still showing it will show a "deleted" placeholder instead.`))) return;
      await apiJson(`/media/${image.id}`, { method: "DELETE" }).catch((err) => toast(err.message, true));
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
          const updated = await apiJson(`/media/${image.id}/caption`, {
            method: "POST",
            body: JSON.stringify({ text: next }),
          });
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
        const updated = await apiJson(`/media/${image.id}/caption`, {
          method: "POST",
          body: JSON.stringify({ force: true }),
        });
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

    const setOcrState = (text) => {
      image.ocr_text = text || "";
      ocrText.textContent = text || "No text found — click to add";
      ocrText.classList.toggle("library-image-ocr-empty", !text);
      ocrText.title = text ? "Click to edit this text" : "Click to add text";
      ocrBtn.title = `Re-read the text in “${image.original_name}”`;
      ocrBtn.setAttribute("aria-label", ocrBtn.title);
    };
    setOcrState(image.ocr_text);

    const startEditingOcr = () => {
      if (ocrText.querySelector("textarea")) return; // already editing
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
          const updated = await apiJson(`/media/${image.id}/ocr`, {
            method: "POST",
            body: JSON.stringify({ text: next }),
          });
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

    ocrBtn.addEventListener("click", async (event) => {
      event.stopPropagation();
      ocrBtn.disabled = true;
      const previousOcrText = ocrText.textContent;
      ocrText.replaceChildren(typingDots("Reading text…"));
      try {
        const updated = await apiJson(`/media/${image.id}/ocr`, { method: "POST" });
        setOcrState(updated.ocr_text);
      } catch (error) {
        ocrText.textContent = previousOcrText;
        toast(error.message || "Couldn't read the text in that image.", true);
      } finally {
        ocrBtn.disabled = false;
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
    visionOcrText.className = "library-image-vision-ocr muted text-sm hidden";

    const visionOcrBadge = document.createElement("span");
    visionOcrBadge.className = "library-image-vision-ocr-badge muted text-xs hidden";

    const setVisionOcrState = (text, model) => {
      image.vision_ocr_text = text || "";
      image.vision_ocr_model = model || "";
      const hasRun = Boolean(model);
      visionOcrText.textContent = text || (hasRun ? "No legible text found." : "");
      visionOcrText.classList.toggle("hidden", !hasRun);
      visionOcrBadge.textContent = hasRun ? `Read by ${model}` : "";
      visionOcrBadge.classList.toggle("hidden", !hasRun);
      visionOcrBtn.title = hasRun
        ? `Read the text in “${image.original_name}” again`
        : `Read any text in “${image.original_name}” with AI`;
      visionOcrBtn.setAttribute("aria-label", visionOcrBtn.title);
    };
    setVisionOcrState(image.vision_ocr_text, image.vision_ocr_model);

    visionOcrBtn.addEventListener("click", async (event) => {
      event.stopPropagation();
      visionOcrBtn.disabled = true;
      visionOcrText.classList.remove("hidden");
      visionOcrText.replaceChildren(typingDots("Reading text…"));
      visionOcrBadge.classList.add("hidden");
      try {
        // force: true — a manual click always re-reads, the same "the user
        // pressed the button" reasoning captionBtn's own force:true uses.
        const updated = await apiJson(`/media/${image.id}/vision-ocr`, {
          method: "POST",
          body: JSON.stringify({ force: true }),
        });
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

    const actions = document.createElement("div");
    actions.className = "library-image-actions";
    actions.append(rename, captionBtn, ocrBtn, visionOcrBtn, del);

    fig.append(
      img,
      actions,
      cap,
      captionText,
      captionToggle,
      captionBadge,
      ocrText,
      visionOcrText,
      visionOcrBadge
    );
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
      "library-view-whiteboard", "library-view-media",
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
          }
        }
      });
    });
  }
  $("library-images-refresh")?.addEventListener("click", renderLibraryImagesGallery);
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
  $("library-docs-search")?.addEventListener("input", renderLibraryDocuments);
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
});
