// selection.js: selection to note, the pick dialogs, the selection popup. Moved
// out of app.js on 2026-09-26 as one contiguous range (INBOX 426 cc,
// docs/roadmap/agent-remaining/appjs-split.md). A classic script sharing
// app.js's globals, loaded in app.js's old order; nothing in an earlier file
// calls into it while the page loads (scratchpad/appjs-map.js --check).

// Where the selected passage came from, when the app actually knows.
//
// Only the web reader can answer this today, and it can answer it exactly:
// `webReaderPage` already holds the url and title of the page on screen. This
// is the "capture surface" half of BACKLOG.md §65 (highlight/web-clip
// capture): the half that item calls small. Everywhere else in the app the
// honest answer is "no external source", and `null` says so rather than
// inventing one.
function selectionSource(node) {
  const el = node && (node.nodeType === 1 ? node : node.parentElement);
  if (!el || !el.closest("#web-reader")) return null;
  if (!webReaderPage?.url) return null;
  return { url: webReaderPage.url, title: webReaderPage.title || webReaderPage.domain || "" };
}

// A passage, quoted, with its origin attributed underneath.
//
// Markdown blockquote rather than a bare paste, because a clipping is somebody
// else's words and a notebook that cannot tell them from yours is worse than
// one that refuses the clipping. The source line is a real markdown link, so
// it stays clickable in the rendered note.
function clippingMarkdown(text, source) {
  const quoted = text
    .split("\n")
    .map((line) => `> ${line}`)
    .join("\n");
  if (!source) return quoted;
  const label = source.title || source.url;
  return `${quoted}\n\n: [${label}](${source.url})`;
}

async function saveSelectionAsNote(text, { draft = false, source = null } = {}) {
  const content = source ? clippingMarkdown(text, source) : text;
  // Real metadata alongside the body's own blockquote+link (BACKLOG §65's
  // "source as metadata, not just folded into body text"), the body copy
  // stays so the note is still a plain, portable markdown file with no app
  // behind it; the columns are what let a note card show a real badge or a
  // future "everything clipped from this site" filter without parsing it
  // back out.
  const sourceFields = source
    ? { source_url: source.url, source_title: source.title || "" }
    : {};
  try {
    const created = await apiJson("/entries", {
      method: "POST",
      body: JSON.stringify({ content, is_draft: draft, ...sourceFields }),
    });
    // Undoable, like every other create in this app (the global stack: 
    // see pushUndo). Saving a clipping by accident and having no way back
    // would be a worse experience than the old three-button bar's.
    pushUndo(
      draft ? "Saved a selection as a draft" : "Saved a selection as a note",
      async () => {
        await api(`/entries/${created.id}`, { method: "DELETE" });
        await loadEntries();
      },
      async () => {
        await apiJson("/entries", {
          method: "POST",
          body: JSON.stringify({ content, is_draft: draft, ...sourceFields }),
        });
        await loadEntries();
      }
    );
    toast(draft ? "Saved as a draft note." : "Saved as a note.");
    // Same fix as saveChatAnswerAsNote(): unconditional. A selection saved
    // from wherever the popup was invoked (not necessarily the Notes tab)
    // must not leave the in-memory `entries` list stale until something
    // else happens to refetch it.
    loadEntries();
  } catch (error) {
    toast(error.message || "Couldn't save that note.", true);
  }
}

// Append the selection to a note the user picks.
//
// Uses `pickEntryDialog` below rather than the chat dock's `#note-picker-panel`
//, that one is a multi-select bound to the chat composer, not a general
// chooser, and reusing it would mean it had two owners.
//: `jump` is for the one caller that is not a selection: the writing desk's
//: "Insert into a note". `flashEntry` is the app's answer to "where did it
//: go", and it is the right answer for the selection popup, which has nothing
//: left behind it. From the desk it walks off a half-written draft and its
//: thoughts to show a note that is already saved, so that caller takes the
//: same trip as an offer instead (`toastAction`), and stays where it is.
async function appendSelectionToNote(text, { jump = true, message = null, what = "the selected text" } = {}) {
  const entry = await pickEntryDialog(message || "Add the selected text to which note?");
  if (!entry) return;
  const before = entry.content;
  const after = `${before.trimEnd()}\n\n${text}`;
  try {
    await api(`/entries/${entry.id}`, {
      method: "PUT",
      body: JSON.stringify({ content: after }),
    });
    pushEntryPutUndo(entry.id, "Added text to a note", { content: before }, { content: after });
    await loadEntries();
    if (jump) {
      toast("Added to the note.");
      flashEntry(entry.id);
    } else {
      toastAction("Added to the note.", "Open it", () => flashEntry(entry.id));
    }
  } catch (error) {
    toast(error.message || `Couldn't add ${what} to the note.`, true);
  }
}

//: **The board's own way into a note** (INBOX 309). The second of the two
//: doorways the owner asked for, and the one that starts where the thought
//: does: you are looking at the board, and it belongs with something you
//: wrote.
//:
//: Deliberately `appendSelectionToNote` rather than a second write path. That
//: function already picks the note, appends, records the undo
//: (`pushEntryPutUndo`) and reloads the list; a board-shaped copy of it would
//: be a second place for "add text to a note" to get its undo wrong.
//:
//: The index is invalidated before the note is drawn again, because the board
//: may have been made in the last eight seconds: see `loadMapBoardIndex`'s
//: `force`. Without it the note would paint the board's own object as a
//: tombstone the moment it was added, which is the worst possible first
//: impression of this feature.
async function addBoardToNote(board) {
  if (!board || board.id == null) {
    toast("The default board has no name to put in a note. Make a board first.");
    return;
  }
  const isMap = board.type !== "board";
  await appendSelectionToNote(boardEmbedMarkdown(board), {
    jump: false,
    what: isMap ? "that map" : "that board",
    message: `Add \u201c${board.title || (isMap ? "this map" : "this board")}\u201d to which note?`,
  });
  if (typeof loadMapBoardIndex === "function") loadMapBoardIndex(true);
}

// A one-off "choose a note" dialog: search box, live list, Escape to cancel.
//
// Built on the same shape as `promptDialog` (overlay + card + captured
// keydown + returned focus) rather than beside it, so a dialog opened from a
// selection behaves identically to every other dialog in the app, 
// `activeOverlay()` picks it up from its `role="dialog"` and traps Tab inside
// it with no registration step.
function pickEntryDialog(message) {
  return new Promise((resolve) => {
    const overlay = document.createElement("div");
    overlay.className = "modal-overlay confirm-overlay";
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");
    overlay.setAttribute("aria-label", message);

    const card = document.createElement("div");
    card.className = "card modal-card confirm-card entry-pick-card";
    const text = document.createElement("p");
    text.className = "confirm-text";
    text.textContent = message;
    const search = document.createElement("input");
    search.type = "text";
    search.placeholder = "Search your notes…";
    search.setAttribute("aria-label", "Search your notes");
    const list = document.createElement("div");
    list.className = "entry-pick-list";

    const returnFocus = document.activeElement;
    let settled = false;
    const close = (entry) => {
      if (settled) return;
      settled = true;
      document.removeEventListener("keydown", onKey, true);
      overlay.remove();
      returnFocus?.focus?.();
      resolve(entry);
    };
    const onKey = (event) => {
      if (event.key !== "Escape") return;
      event.stopPropagation();
      close(null);
    };

    // Drafts excluded: adding to a half-finished draft is not what "an
    // existing note" means, and the Notes tab already keeps them out of every
    // other list for the same reason.
    const paint = () => {
      const term = search.value.trim().toLowerCase();
      const matches = allEntries
        .filter((e) => !e.is_draft && !e.is_deleted)
        .filter((e) => !term || (e.content || "").toLowerCase().includes(term))
        .slice(0, 40);
      list.replaceChildren();
      if (!matches.length) {
        const empty = document.createElement("p");
        empty.className = "muted";
        empty.textContent = term ? "No notes match that." : "No notes yet.";
        list.appendChild(empty);
        return;
      }
      for (const entry of matches) {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "entry-pick-row";
        button.textContent = entry.title || clipText(notePreviewText(entry.content), 90);
        button.addEventListener("click", () => close(entry));
        list.appendChild(button);
      }
    };
    search.addEventListener("input", paint);
    paint();

    const row = document.createElement("div");
    row.className = "row confirm-actions";
    row.append(smallButton("Cancel", "Cancel", () => close(null)));
    card.append(text, search, list, row);
    overlay.appendChild(card);
    wireBackdropClose(overlay, () => close(null));
    document.addEventListener("keydown", onKey, true);
    document.body.appendChild(overlay);
    search.focus();
  });
}

//: **Choose any one thing the library holds**, a note, a document, a file or
//: a saved link: as `{kind, id, label}`.
//:
//: A fourth chooser only because the three that exist answer different
//: questions. `pickEntryDialog` above returns a *note* and nothing else;
//: `pickMediaDialog` below returns an upload; the chat dock's
//: `#note-picker-panel` is a multi-select bound to the composer's own
//: attachment lists, so borrowing it would give it two owners (its own
//: comment says as much). This one returns exactly one item and says which of
//: the four tables it came from, which is what a map's reference node needs:
//: `POST /whiteboard/boards/{id}/nodes` takes a `kind` and a `ref_id` and
//: resolves the label itself (MINDMAP_PLAN.md §9.2: a copied title goes
//: stale the moment the thing behind it is renamed).
//:
//: `kind` is deliberately the *server's* vocabulary: note / document / file
//: / link, `MAP_REFERENCE_KINDS` in routes_whiteboard.py: rather than a
//: display word, so a caller never has to translate between what the picker
//: says and what the endpoint accepts.
//: **`optIn` keeps a source out of the default set.** A board is a thing the
//: Library holds and a perfectly good thing to point at from a note (INBOX
//: 309), but this dialog's first caller feeds a map's reference node, and
//: `MAP_REFERENCE_KINDS` in routes_whiteboard.py is note / document / file /
//: link: a board offered there would be a row that cannot be saved. So the
//: board source exists, and only a caller that names it in `sources` is
//: shown it.
const LIBRARY_PICK_SOURCES = [
  { kind: "note", label: "Notes", icon: "ph:note", placeholder: "Search your notes…" },
  { kind: "document", label: "Documents", icon: "ph:file-text", path: "/documents", placeholder: "Search your documents…" },
  { kind: "file", label: "Files", icon: "ph:paperclip", path: "/files/gallery", placeholder: "Search your files…" },
  { kind: "link", label: "Links", icon: "ph:link-simple", path: "/bookmarks", placeholder: "Search your links…" },
  {
    kind: "board",
    label: "Boards and maps",
    //: Per row, not per source: a whiteboard and a mind map sit in one list
    //: here, and the owner has already reported once that a list of bare
    //: titles gives no way to tell them apart.
    icon: (row) => (row?.type === "board" ? "ph:squares-four" : "ph:tree-structure"),
    path: "/whiteboard/boards",
    placeholder: "Search your boards and maps…",
    //: The unnamed scratch board (`id: null`) is left out, the same rule
    //: `renderAttachToBoard` states: it is where things land when nobody
    //: chose a board, not somewhere to point at on purpose.
    keep: (row) => row && row.id != null,
    optIn: true,
  },
];

//: One row's label per source, in one table for the reason `notePickerShape`
//: gives for its own: the renderer is the same list either way, and four
//: copies of it is how the four drift apart.
function libraryPickLabel(kind, row) {
  if (kind === "note") return noteLabel(row, 70);
  if (kind === "board") return row.title || (row.type === "board" ? "Untitled board" : "Untitled map");
  if (kind === "document") return row.title || "Untitled document";
  if (kind === "file") return row.original_name || row.filename || "File";
  return row.title || row.url || "Link";
}

//: Fetched once per dialog rather than per keystroke, and per source rather
//: than all four up front, the same two rules `notePickerRows` follows, and
//: for the same reason: three of these lists are never looked at by someone
//: who came to point at a note.
function pickLibraryItemDialog(message, { sources = null } = {}) {
  const available = LIBRARY_PICK_SOURCES.filter((source) =>
    sources ? sources.includes(source.kind) : !source.optIn
  );
  return new Promise((resolve) => {
    const overlay = document.createElement("div");
    overlay.className = "modal-overlay confirm-overlay";
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");
    overlay.setAttribute("aria-label", message);

    const card = document.createElement("div");
    card.className = "card modal-card confirm-card entry-pick-card";
    const text = document.createElement("p");
    text.className = "confirm-text";
    text.textContent = message;

    let active = available[0];
    const seg = document.createElement("div");
    seg.className = "seg seg-compact";
    seg.setAttribute("role", "tablist");
    seg.setAttribute("aria-label", "What to point at");

    const search = document.createElement("input");
    search.type = "search";
    search.placeholder = active.placeholder;
    search.setAttribute("aria-label", message);
    const list = document.createElement("div");
    list.className = "entry-pick-list";

    const returnFocus = document.activeElement;
    let settled = false;
    const close = (choice) => {
      if (settled) return;
      settled = true;
      document.removeEventListener("keydown", onKey, true);
      overlay.remove();
      returnFocus?.focus?.();
      resolve(choice);
    };
    const onKey = (event) => {
      if (event.key !== "Escape") return;
      event.stopPropagation();
      close(null);
    };

    //: Per-source, so switching tabs and back does not re-fetch. Notes are
    //: never in here: `allEntries` is already in memory and is kept current
    //: by every save, so a second copy would be the stale one.
    const cache = {};
    let token = 0;

    const rowsFor = async (kind) => {
      if (kind === "note") {
        //: Drafts, deleted notes, private notes and boards are all excluded.
        //: Drafts for the reason `pickEntryDialog` gives: "an existing note"
        //: does not mean a half-typed capture, and a board because it is
        //: usually the very thing this picker was opened *from*.
        return (typeof allEntries !== "undefined" ? allEntries : []).filter(
          (entry) => !entry.is_draft && !entry.is_deleted && !entry.is_board && !entry.is_private
        );
      }
      if (cache[kind]) return cache[kind];
      const source = available.find((s) => s.kind === kind);
      //: The gallery is paged (tests/test_gallery_paging.py); the other
      //: sources answer in one response.
      const read = source.path === "/files/gallery"
        ? apiPagedList(source.path, 200, { silent: true })
        : apiJson(source.path, { silent: true });
      const rows = await read.catch(() => []);
      const list = Array.isArray(rows) ? rows : rows.documents || [];
      cache[kind] = source.keep ? list.filter(source.keep) : list;
      return cache[kind];
    };

    const paint = async () => {
      const mine = (token += 1);
      const kind = active.kind;
      const term = search.value.trim().toLowerCase();
      const rows = await rowsFor(kind);
      // A slow fetch that finished after the user moved on must not paint
      // over the tab they are actually looking at.
      if (mine !== token || active.kind !== kind) return;
      const matches = rows
        .map((row) => ({ row, label: libraryPickLabel(kind, row) }))
        .filter(({ label }) => !term || label.toLowerCase().includes(term))
        .slice(0, 40);
      list.replaceChildren();
      if (!matches.length) {
        const empty = document.createElement("p");
        empty.className = "muted";
        empty.textContent = term
          ? `No ${active.label.toLowerCase()} match that.`
          : `No ${active.label.toLowerCase()} yet.`;
        list.appendChild(empty);
        return;
      }
      for (const { row, label } of matches) {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "entry-pick-row";
        setLabel(button, `${typeof active.icon === "function" ? active.icon(row) : active.icon} ${label}`);
        button.title = label;
        //: The row itself travels with the choice. A caller that only needs
        //: an id is unchanged (it destructures the three it always did), and
        //: a caller that needs a fact the row already carries, whether a
        //: board is a map, gets it without a second fetch for a list it has
        //: just read.
        button.addEventListener("click", () => close({ kind, id: row.id, label, row }));
        list.appendChild(button);
      }
    };

    for (const source of available) {
      const tab = document.createElement("button");
      tab.type = "button";
      tab.setAttribute("role", "tab");
      tab.dataset.pickKind = source.kind;
      tab.textContent = source.label;
      const on = source.kind === active.kind;
      tab.classList.toggle("active", on);
      tab.setAttribute("aria-selected", on ? "true" : "false");
      tab.addEventListener("click", () => {
        active = source;
        for (const sibling of seg.querySelectorAll("button")) {
          const chosen = sibling.dataset.pickKind === source.kind;
          sibling.classList.toggle("active", chosen);
          sibling.setAttribute("aria-selected", chosen ? "true" : "false");
        }
        search.placeholder = source.placeholder;
        paint();
        search.focus();
      });
      seg.appendChild(tab);
    }

    search.addEventListener("input", paint);
    paint();

    const row = document.createElement("div");
    row.className = "row confirm-actions";
    row.append(smallButton("Cancel", "Cancel", () => close(null)));
    card.append(text, seg, search, list, row);
    overlay.appendChild(card);
    wireBackdropClose(overlay, () => close(null));
    document.addEventListener("keydown", onKey, true);
    document.body.appendChild(overlay);
    search.focus();
  });
}

//: **Several notes at once**, which `pickLibraryItemDialog` above deliberately
//: cannot do: that one closes on the first click, because pointing a node at a
//: note is one choice and a confirm step would be a second click for nothing.
//: "Make a map of these notes" is the opposite shape, a list you assemble, so
//: the row is a checkbox and the dialog closes on a button.
//:
//: It draws the same `.entry-pick-*` recipe as its single-pick sibling rather
//: than a second look for the same job, and it reads `allEntries`, the
//: in-memory list every save keeps current, so there is no fetch and no second
//: copy of the notebook to go stale.
//:
//: Resolves with an array of `{id, label}` in the order they were ticked, or
//: null if the dialog was dismissed: the empty array is a real answer nobody
//: wants (a map of no notes), so the confirm button stays disabled until at
//: least one row is on.
function pickNotesDialog(message, { confirmLabel = "Continue", limit = 40 } = {}) {
  return new Promise((resolve) => {
    const overlay = document.createElement("div");
    overlay.className = "modal-overlay confirm-overlay";
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");
    overlay.setAttribute("aria-label", message);

    const card = document.createElement("div");
    card.className = "card modal-card confirm-card entry-pick-card";
    const head = document.createElement("div");
    head.className = "row confirm-head";
    const title = document.createElement("h3");
    title.className = "confirm-title";
    title.textContent = message;
    head.appendChild(title);

    const search = document.createElement("input");
    search.type = "search";
    search.placeholder = "Search your notes…";
    search.setAttribute("aria-label", message);
    const list = document.createElement("div");
    list.className = "entry-pick-list";
    const count = document.createElement("p");
    count.className = "muted";

    //: The ticks live here and not in the DOM, so a note stays chosen when a
    //: search term hides its row: typing a second term to find the second note
    //: would otherwise silently unpick the first.
    const chosen = new Map();
    const returnFocus = document.activeElement;
    let settled = false;
    const close = (answer) => {
      if (settled) return;
      settled = true;
      document.removeEventListener("keydown", onKey, true);
      overlay.remove();
      returnFocus?.focus?.();
      resolve(answer);
    };
    const onKey = (event) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      event.stopPropagation();
      close(null);
    };

    const confirm = smallButton(confirmLabel, confirmLabel, () => {
      if (!chosen.size) return;
      close([...chosen.entries()].map(([id, label]) => ({ id, label })));
    }, false);

    const refreshCount = () => {
      count.textContent = chosen.size
        ? `${chosen.size} note${chosen.size === 1 ? "" : "s"} chosen${chosen.size >= limit ? ` (the most this can use is ${limit})` : ""}`
        : "Pick the notes this should be built from.";
      confirm.disabled = chosen.size === 0;
    };

    const paint = () => {
      const term = search.value.trim().toLowerCase();
      const rows = (typeof allEntries !== "undefined" ? allEntries : []).filter(
        (entry) => !entry.is_draft && !entry.is_deleted && !entry.is_board && !entry.is_private
      );
      const matches = rows
        .map((row) => ({ row, label: noteLabel(row, 70) }))
        .filter(({ label }) => !term || label.toLowerCase().includes(term))
        .slice(0, 60);
      list.replaceChildren();
      if (!matches.length) {
        const empty = document.createElement("p");
        empty.className = "muted";
        empty.textContent = term ? "No notes match that." : "No notes yet.";
        list.appendChild(empty);
        return;
      }
      for (const { row, label } of matches) {
        const line = document.createElement("label");
        line.className = "entry-pick-row entry-pick-check";
        const box = document.createElement("input");
        box.type = "checkbox";
        box.checked = chosen.has(row.id);
        box.addEventListener("change", () => {
          if (box.checked && chosen.size >= limit && !chosen.has(row.id)) {
            box.checked = false;
            toast(`That is the most this can use at once: ${limit} notes.`);
            return;
          }
          if (box.checked) chosen.set(row.id, label);
          else chosen.delete(row.id);
          refreshCount();
        });
        const text = document.createElement("span");
        text.textContent = label;
        line.append(box, text);
        line.title = label;
        list.appendChild(line);
      }
    };

    search.addEventListener("input", paint);
    paint();
    refreshCount();

    const row = document.createElement("div");
    row.className = "row confirm-actions";
    row.append(smallButton("Cancel", "Cancel", () => close(null)), confirm);
    card.append(head, search, list, count, row);
    overlay.appendChild(card);
    wireBackdropClose(overlay, () => close(null));
    document.addEventListener("keydown", onKey, true);
    document.body.appendChild(overlay);
    search.focus();
  });
}

// Pick something already uploaded rather than uploading it again, asked for
// directly: "I also want to be able to attach images that are already in the
// image library... to new notes in the capture subtab." `/media` (the same
// list the Image Gallery renders from) has no mime field, only a filename
// and an original name, reusing the gallery's own approach of just trying
// each as an <img> and dropping the tile on error, rather than guessing from
// a file extension.
function pickMediaDialog() {
  return new Promise((resolve) => {
    const overlay = document.createElement("div");
    overlay.className = "modal-overlay confirm-overlay";
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");
    overlay.setAttribute("aria-label", "Choose from your library");

    const card = document.createElement("div");
    card.className = "card modal-card confirm-card entry-pick-card";
    const text = document.createElement("p");
    text.className = "confirm-text";
    text.textContent = "Choose an image already in your library";
    const search = document.createElement("input");
    search.type = "text";
    search.placeholder = "Search by filename…";
    search.setAttribute("aria-label", "Search your uploaded images");
    const grid = document.createElement("div");
    grid.className = "media-pick-grid";

    const returnFocus = document.activeElement;
    let settled = false;
    const close = (upload) => {
      if (settled) return;
      settled = true;
      document.removeEventListener("keydown", onKey, true);
      overlay.remove();
      returnFocus?.focus?.();
      resolve(upload);
    };
    const onKey = (event) => {
      if (event.key !== "Escape") return;
      event.stopPropagation();
      close(null);
    };

    let uploads = [];
    const paint = () => {
      const term = search.value.trim().toLowerCase();
      const matches = uploads
        .filter((u) => !term || u.original_name.toLowerCase().includes(term))
        .slice(0, 60);
      grid.replaceChildren();
      if (!matches.length) {
        const empty = document.createElement("p");
        empty.className = "muted";
        empty.textContent = uploads.length
          ? "No uploads match that."
          : "Nothing uploaded yet: attach a new file to start your library.";
        grid.appendChild(empty);
        return;
      }
      for (const upload of matches) {
        const tile = document.createElement("button");
        tile.type = "button";
        tile.className = "media-pick-tile";
        tile.title = upload.original_name;
        const img = document.createElement("img");
        img.src = mediaSrc(upload.url);
        img.alt = "";
        img.loading = "lazy";
        // Not every upload is an image (there's no mime field to check
        // first): a file that can't decode as one drops its own tile
        // rather than showing a broken-image glyph, same as the gallery.
        img.addEventListener("error", () => tile.remove());
        const name = document.createElement("span");
        name.textContent = upload.original_name;
        tile.append(img, name);
        tile.addEventListener("click", () => close(upload));
        grid.appendChild(tile);
      }
    };
    search.addEventListener("input", paint);

    const row = document.createElement("div");
    row.className = "row confirm-actions";
    row.append(smallButton("Cancel", "Cancel", () => close(null)));
    card.append(text, search, grid, row);
    overlay.appendChild(card);
    wireBackdropClose(overlay, () => close(null));
    document.addEventListener("keydown", onKey, true);
    document.body.appendChild(overlay);
    search.focus();

    apiJson("/media", { silent: true })
      .then((list) => {
        uploads = list || [];
        paint();
      })
      .catch(() => {
        grid.replaceChildren();
        const err = document.createElement("p");
        err.className = "muted";
        err.textContent = "Couldn't load your library.";
        grid.appendChild(err);
      });
  });
}

// Turn the selection into a reminder, through the same parser the Reminders
// tab's "magic add" box uses: not a second one.
async function remindFromSelection(text) {
  try {
    const reminder = await apiJson("/reminders/parse", {
      method: "POST",
      // Our clock, so "tomorrow evening" resolves against the time the user
      // can see rather than the server's UTC: same as magicAddReminder.
      body: JSON.stringify({ text, tz_offset_minutes: -new Date().getTimezoneOffset() }),
    });
    toast(`Reminder set: ${relativeWhen(reminder.due_at)}.`);
    askNotificationPermission();
    // Same fix as saveChatAnswerAsNote()/saveSelectionAsNote(): unconditional,
    // so a reminder created from wherever this popup was invoked doesn't sit
    // stale out of the Reminders tab's in-memory list.
    loadReminders();
  } catch (error) {
    toast(error.message || "Couldn't read a reminder from that.", true);
  }
}

// The actions the ⋯ offers. Rebuilt on every open rather than once, because
// two of them depend on state that changes between selections: whether the
// passage has a source to attribute, and whether the local model is running.
// The <textarea>/<input> a selection came from, or null when the selection is
// in rendered content. Kept separate from `selectionPopupText` because the
// field is what an edit action needs to write back into.
let selectionPopupField = null;

// A selection inside a text field, or null.
//
// This needs its own path because `window.getSelection()` does not see inside
// a <textarea>, the browser keeps that selection on the element itself, as
// `selectionStart`/`selectionEnd`. That is the real reason the popup never
// appeared while editing, and reading the DOM selection alone will always
// come back empty there no matter what the exclusion list says.
function fieldSelection() {
  const el = document.activeElement;
  if (!el || (el.tagName !== "TEXTAREA" && el.tagName !== "INPUT")) return null;
  // `selectionStart` is null on input types that do not support it (number,
  // email, colour…), which is exactly the set we should not offer this on.
  if (el.selectionStart == null || el.selectionStart === el.selectionEnd) return null;
  //: A search box's selected query is not writing (the Finder and the
  //: palette open with their query selected so typing replaces it), and a
  //: field inside an overlay belongs to that overlay: the popup drew its
  //: menu over the Finder's own results. Writing fields only.
  if (el.type === "search" || el.closest(".lock-overlay, .modal-overlay, .command-palette, [role='combobox']")) {
    return null;
  }
  const text = el.value.slice(el.selectionStart, el.selectionEnd);
  return text.trim() ? { el, start: el.selectionStart, end: el.selectionEnd, text } : null;
}

// Replace a field's selected range, then put the caret back around the same
// passage. Dispatches `input` because everything downstream of typing, 
// draft autosave, the character counter, the live markdown preview, listens
// for it, and a programmatic value change fires nothing on its own.
function wrapFieldSelection(field, before, after) {
  const { el, start, end, text } = field;
  el.value = el.value.slice(0, start) + before + text + after + el.value.slice(end);
  el.dispatchEvent(new Event("input", { bubbles: true }));
  el.focus();
  el.setSelectionRange(start + before.length, start + before.length + text.length);
}

function selectionMenuItems() {
  const text = selectionPopupText;
  const source = selectionPopupSource;
  const aiOff = modelStatus ? modelStatus.ollama_running === false : false;

  const items = [];

  // **Where highlighting is discoverable from.** `==text==` renders as a
  // highlight, but a syntax nobody is told about may as well not exist, 
  // reported exactly that way ("I still dont know how to highlight text").
  // Selecting the words you want marked and picking a colour is the
  // affordance; the syntax it writes is still plain text in the note, so
  // nothing here is a second way of storing a highlight.
  if (selectionPopupField) {
    const field = selectionPopupField;
    items.push(
      makeMenuItem("ph:highlighter Highlight", "Mark this passage (yellow)", () =>
        wrapFieldSelection(field, "==", "==")
      ),
      makeMenuItem("ph:palette Highlight in a colour…", "Green, blue, pink, purple or orange", async () => {
        const colour = (await promptDialog(
          "Colour: green, blue, pink, purple or orange:", "green"
        )).trim().toLowerCase();
        if (!colour) return;
        if (!["yellow", "green", "blue", "pink", "purple", "orange"].includes(colour)) {
          toast("Pick one of: yellow, green, blue, pink, purple, orange.", true);
          return;
        }
        wrapFieldSelection(field, colour === "yellow" ? "==" : `==${colour}|`, "==");
      }),
      makeMenuItem("ph:text-b Bold", "Wrap this in **bold**", () =>
        wrapFieldSelection(field, "**", "**")
      ),
      makeMenuItem("ph:text-italic Italic", "Wrap this in *italic*", () =>
        wrapFieldSelection(field, "*", "*")
      )
    );
  }

  items.push(
    makeMenuItem("ph:note-pencil Save as a note", "File this straight into your notebook", () =>
      saveSelectionAsNote(text)
    ),
    makeMenuItem("ph:pencil-simple-line Save as a draft", "Keep it as an unfinished draft", () =>
      saveSelectionAsNote(text, { draft: true })
    ),
    makeMenuItem("ph:plus-circle Add to a note…", "Append this to a note you already have", () =>
      appendSelectionToNote(text)
    )
  );

  if (source) {
    items.push(
      makeMenuItem(
        "ph:quotes Save with its source",
        `Save as a quote, credited to ${source.title || source.url}`,
        () => saveSelectionAsNote(text, { source })
      )
    );
  }

  items.push(
    // Through the shared helper, not `navigator.clipboard` directly: it falls
    // back to a hidden textarea and then to showing the text pre-selected,
    // which is what makes copy work in the hardened webview the desktop build
    // runs in. (`tests/test_log_console.py` enforces this, and caught the
    // direct call that was here first.)
    makeMenuItem("ph:copy Copy", "Copy the selected text", async () => {
      if (await copyToClipboard(text)) toast("Copied.");
    }),
    makeMenuItem("ph:magnifying-glass Search the notebook", "Find notes that match this", () => {
      switchTab("notes");
      showNotesSection("browse");
      noteSearch = text;
      $("note-search").value = text;
      $("save-search").classList.remove("hidden");
      renderEntries();
      if ($("semantic-search-toggle")?.checked) loadEntries();
    }),
    makeMenuItem("ph:bell Set a reminder", "Read a reminder out of the selection", () =>
      remindFromSelection(text)
    )
  );

  // AI-only, and disabled rather than hidden when the model is off, the same
  // convention `data-needs-model` applies to every other AI action, so the
  // capability stays discoverable and the reason is on the item itself.
  // (That attribute is read from the markup by `syncModelGatedControls`, and
  // these items are built fresh on every open, so they carry the state
  // directly instead.)
  items.push(
    makeMenuItem(
      "ph:scissors Extract notes…",
      aiOff
        ? `Extracting notes needs the local AI. ${AI_OFFLINE_HINT}.`
        : "Split this into one or more linked notes, with a preview first",
      () => {
        if (aiOff) {
          toast("Extracting notes needs the local AI.", true);
          return;
        }
        openExtractPreview(text);
      }
    ),
    makeMenuItem("ph:chat-circle Ask Atlas about this", "Start a chat about the selection", () => {
      switchTab("chat");
      const input = $("chat-input");
      input.value = `Tell me about this: "${text}"`;
      input.focus();
    })
  );
  return items;
}

function selectionPopup() {
  if (selectionPopupEl) return selectionPopupEl;
  const box = document.createElement("div");
  box.className = "selection-popup hidden";
  document.body.appendChild(box);
  selectionPopupEl = box;
  return box;
}

function hideSelectionPopup() {
  selectionPopupEl?.classList.add("hidden");
  selectionPopupText = "";
  selectionPopupSource = null;
}

// Keep the menu inside the window, the literal ask ("shows the Popup buttons
// within the application window").
//
// `.action-menu` is `position: absolute; right: 0; top: calc(100% + 4px)`,
// which is right for a kebab sitting in a card near the top of a page and
// wrong for one that can appear anywhere, including two lines above the
// footer. Measured after opening, the same way `buildMenuGroupButton` already
// decides which side a submenu flies out to, and using the same
// measure-then-classify shape rather than a second mechanism.
function clampSelectionMenu(menu) {
  menu.classList.remove("menu-flip-up", "menu-flip-left");
  //: **A menu that has left its box is already placed, and flipping it here
  //: collapses it.** Reported: "when I highlight text and the popup kebab
  //: button appears, the first time I click it, a little collapsed line
  //: appears below it, then I need to click the button to close the popup and
  //: reopen it for it to actually show".
  //:
  //: `openActionMenu` calls `escapeMenuIfClipped` first, which reparents a
  //: clipped menu to `<body>`, makes it `position: fixed` and writes an
  //: explicit `top`. `.menu-flip-up` is `top: auto; bottom: calc(100% + 4px)`,
  //: written for a menu positioned against its own offset parent; on an
  //: escaped menu that `100%` resolves against the viewport, so the rule asks
  //: for a box whose bottom edge is four pixels above the top of the screen
  //: and the auto-height box collapses to its own padding. That is the strip
  //: in the report, and it is the same over-constraint
  //: `escapeMenuIfClipped` already guards against for `action-menu-flip`,
  //: one line of which says so: "Both at once over-constrains an auto-height
  //: box, which reproduced as the menu collapsing to its own padding."
  //:
  //: The second click appears to fix it because by then `_escapedHome` is set,
  //: `escapeMenuIfClipped` returns early, and whichever branch runs next
  //: happens not to add the class.
  //:
  //: Nothing is lost by leaving early: `placeEscapedMenu` positions the menu
  //: against the viewport directly, which is strictly better than choosing
  //: between two fixed anchors, and it is what this function is trying to
  //: approximate.
  if (menu.classList.contains("action-menu-escaped") || menu._escapedHome) return;
  const margin = 8;
  let rect = menu.getBoundingClientRect();
  if (rect.bottom > window.innerHeight - margin) menu.classList.add("menu-flip-up");
  rect = menu.getBoundingClientRect();
  if (rect.left < margin) menu.classList.add("menu-flip-left");
}

function showSelectionPopupAt(rect, text, source, point) {
  const box = selectionPopup();
  //: Reported: "I have to click it twice for it to actually properly
  //: expand". The click on the ⋯ opener ends in a `selectionchange` (the
  //: selection is unchanged, the event still fires), which re-entered here
  //: and rebuilt the popup, closed, over the menu that had just opened. The
  //: same selection with its menu open is left exactly as it is.
  if (
    !box.classList.contains("hidden") &&
    selectionPopupText === text &&
    selectionPopupSource === source &&
    box.querySelector(".action-menu:not(.hidden)")
  ) {
    return;
  }
  selectionPopupText = text;
  selectionPopupSource = source;

  // Rebuilt per selection: the item list depends on whether this passage has
  // a source and on whether the model is up.
  box.replaceChildren();
  const kebab = kebabMenu(selectionMenuItems(), "Actions for the selected text");
  box.appendChild(kebab);
  const opener = kebab.querySelector("[aria-haspopup]");
  const menu = kebab.querySelector(".action-menu");
  // Clicking the opener must not clear the selection underneath it. The old
  // three-button bar did this per button for the same reason; the text itself
  // is already captured above, but keeping the visible selection is what makes
  // the menu feel attached to it rather than to nothing.
  opener?.addEventListener("mousedown", (e) => e.preventDefault());
  opener?.addEventListener("click", () => {
    if (!menu.classList.contains("hidden")) clampSelectionMenu(menu);
  });

  // Position *before* revealing. Removing `hidden` first: which is what this
  // used to do: paints one frame of a `position: fixed` element that has no
  // left/top yet, i.e. at the bottom of `<body>`, as a visible flash.
  box.style.visibility = "hidden";
  box.classList.remove("hidden");
  const margin = 8;
  const boxRect = box.getBoundingClientRect();
  // Note the bound order: `max(margin, min(wanted, limit))`. Written the other
  // way round (`min(max(...), limit)`) a box wider than the viewport produces
  // a limit below the floor, `min` wins, and the popup lands off-screen left.
  // Anchored to the selection's top-right corner, just clear of the last
  // character. Asked for directly ("appear to the top right of the selection
  // while still remaining within the screen/window"), and it is the better
  // anchor than the centre this used to use: centred, the kebab drifts as the
  // selection grows, so it is never in the same place twice and it sits over
  // the middle of what you just highlighted. The right-hand end is where the
  // cursor already is when a left-to-right drag finishes.
  //
  // Both clamps keep the bound order `max(margin, min(wanted, limit))`, see
  // the note below on why the other way round puts it off-screen.
  // The cursor when we have one, the selection's right-hand end when we do
  // not (keyboard selections, and any caller without a pointer event).
  const anchorX = point ? point.x : rect.right;
  const anchorY = point ? point.y : rect.top;
  const left = Math.max(
    margin,
    Math.min(anchorX + 4, window.innerWidth - boxRect.width - margin)
  );
  let wantedTop = anchorY - boxRect.height - margin;
  // No room above the anchor, drop below it instead.
  if (wantedTop < margin) wantedTop = (point ? point.y : rect.bottom) + margin;
  const top = Math.max(
    margin,
    Math.min(wantedTop, window.innerHeight - boxRect.height - margin)
  );
  box.style.left = `${left}px`;
  box.style.top = `${top}px`;
  box.style.visibility = "";
}

// Whether a selection is one this popup should offer to act on.
//
// Both ends are checked, not just `anchorNode`. A drag that starts in prose
// and ends inside a textarea (or the reverse) is one selection with two
// different homes, and testing only the anchor let the popup appear over a
// form field half the time, which is exactly the case the denylist exists
// to prevent.
function selectionIsActionable(selection) {
  const ends = [selection.anchorNode, selection.focusNode];
  for (const node of ends) {
    const el = node && (node.nodeType === 1 ? node : node.parentElement);
    if (!el || el.closest(SELECTION_POPUP_EXCLUDED)) return false;
  }
  return true;
}

// Where the pointer was when the selection finished, or null.
//
// Asked for directly: the kebab should appear off the top-right of the
// *cursor*, not of the highlighted text. Those differ a lot on a multi-line
// selection: the range's corner can be half a screen from where the user
// actually let go, which is the one place they are already looking.
//
// Only a pointer can answer this: a keyboard selection (Shift+Arrow) and a
// touch long-press dispatch `selectionchange` with no coordinates at all, so
// those keep the range-rectangle anchoring. Cleared on keydown so a mouse
// selection followed by Shift+Arrow does not keep using a stale point.
let selectionPointerPoint = null;

function syncSelectionPopup() {
  // Text fields first. Asked for twice ("the ellipse button doesnt appear
  // when I highlight text in textboxes"), the editor is a <textarea>, whose
  // selection lives on the element rather than in the DOM selection, so the
  // rendered-content path below can never see it.
  const field = fieldSelection();
  if (field) {
    selectionPopupField = field;
    // A textarea has no range rectangle to anchor to, the browser exposes no
    // geometry for a selection inside one, so the pointer is the anchor when
    // there is one, and the field's own box is the fallback for a keyboard
    // selection. Passing the field rect as `rect` keeps showSelectionPopupAt's
    // existing "top-right of the selection" logic working unchanged.
    showSelectionPopupAt(
      field.el.getBoundingClientRect(),
      field.text,
      null,
      selectionPointerPoint
    );
    return;
  }

  const selection = window.getSelection();
  const text = (selection?.toString() || "").trim();
  if (!text || selection.isCollapsed || !selectionIsActionable(selection)) {
    // Don't yank the popup away while its own menu is open, the selection is
    // often cleared as a side effect of interacting with the menu.
    if (!selectionPopupEl?.querySelector(".action-menu:not(.hidden)")) hideSelectionPopup();
    return;
  }
  selectionPopupField = null;
  showSelectionPopupAt(
    selection.getRangeAt(0).getBoundingClientRect(),
    text,
    selectionSource(selection.anchorNode),
    selectionPointerPoint
  );
}

function initSelectionPopup() {
  // **Three ways in, because there used to be one.** `mouseup` alone meant the
  // popup did not exist for anyone selecting by touch (a long-press drag on a
  // phone dispatches `selectionchange`, not a useful `mouseup`) or by keyboard
  // (Shift+Arrow dispatches neither): so the app's richest capture surface
  // was mouse-only, on an app that ships a PWA manifest and a mobile layout.
  //
  // `selectionchange` fires continuously *during* a drag, so it is debounced:
  // repositioning the popup on every intermediate range is both wasteful and
  // visually noisy. `mouseup` stays as the immediate path so a mouse selection
  // still feels instant rather than delayed by the debounce.
  document.addEventListener("mouseup", (event) => {
    if (event.target.closest(".selection-popup")) return;
    selectionPointerPoint = { x: event.clientX, y: event.clientY };
    syncSelectionPopup();
  });
  // Touch releases carry coordinates too, on the changedTouches list rather
  // than the event itself, a long-press drag should anchor to the finger for
  // the same reason a mouse selection anchors to the cursor.
  document.addEventListener("touchend", (event) => {
    const touch = event.changedTouches && event.changedTouches[0];
    if (touch) selectionPointerPoint = { x: touch.clientX, y: touch.clientY };
  });
  // A keyboard selection has no pointer, so fall back to the range rectangle
  // rather than anchoring to wherever the mouse happened to be last.
  document.addEventListener("keydown", (event) => {
    if (event.shiftKey || event.key === "Escape") selectionPointerPoint = null;
  });

  let selectionSettleTimer;
  document.addEventListener("selectionchange", () => {
    clearTimeout(selectionSettleTimer);
    selectionSettleTimer = setTimeout(syncSelectionPopup, 200);
  });

  document.addEventListener("mousedown", (event) => {
    if (!event.target.closest(".selection-popup")) hideSelectionPopup();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") hideSelectionPopup();
  });
  window.addEventListener("scroll", hideSelectionPopup, true);
  window.addEventListener("resize", hideSelectionPopup);
}

// Open the selection menu from the keyboard, for a selection made with
// Shift+Arrow. Without this the whole feature is unreachable without a mouse:
// the popup can now *appear* from a keyboard selection (selectionchange fires
// for those too), but its menu still needed a pointer to open.
function openSelectionMenuFromKeyboard() {
  syncSelectionPopup();
  if (!selectionPopupText) {
    toast("Select some text first, then press this again.");
    return;
  }
  const opener = selectionPopupEl?.querySelector("[aria-haspopup]");
  const menu = selectionPopupEl?.querySelector(".action-menu");
  if (!opener || !menu) return;
  openActionMenu(menu, opener);
  clampSelectionMenu(menu);
}
