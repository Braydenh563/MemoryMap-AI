// documents.js — the document editor (split out of app.js).
//
// Loaded after app.js (see index.html's <script> ordering comment): every
// reference here into app.js globals (docs helpers aside, things like
// switchTab, apiJson, toast, $, promptDialog, setPreference) is a runtime
// call inside a function body, never a parse-time reference, so load order
// only matters for the reverse direction — anything in app.js that calls
// into documents.js (loadDocuments, renderDocStorage, createDocument) does
// so from inside its own functions too, which by the time they run have
// always already had this script loaded (same DOMContentLoaded pass, no
// user interaction possible in between).
//
// initDocSidebarTabs() used to be called from app.js's own top-level wiring
// (right after initNotesSubtabs()). That call site is gone from app.js now
// that the function moved here — this file calls it itself instead, at the
// end, so it still runs exactly once per load and in the same relative
// order (after app.js's synchronous top-level code, before any user input
// is possible).

// --- documents: long-form writing -----------------------------------------------
// Documents are separate from notes on purpose. A note is a captured thought;
// a document is something you sit down and write. Sharing storage would put
// every half-finished draft into note search and the graph.

let docs = [];
let currentDoc = null;   // {id, title, content, ...}
let docDirty = false;
let docSaveTimer = null;

// --- what kind of file this document is ----------------------------------------
//
// A document used to be markdown and only markdown. Asked for directly: the
// editor should handle code too — line numbers, language detection, Ctrl+/
// commenting, indent and dedent — the type should be changeable, and a new
// document should be creatable "of any filetype though it should default to
// md".
//
// The table comes from `GET /documents/file-types` rather than being written
// out here, and that is not tidiness. Indenting and comment-toggling happen
// inside a keydown handler and cannot wait for a round trip, so the frontend
// genuinely needs the whole table — which means either fetching it or keeping
// a second copy. A second copy is a second thing to update, and the failure
// mode of the two disagreeing is Ctrl+/ inserting the wrong comment marker
// into someone's file. So: fetched once, cached here.

//: [{ext, label, line_comment, block_comment, indent, previewable}], server
//: order preserved — the picker's order is a decision (see filetypes.py) and
//: sorting it here would quietly undo it.
let docFileTypes = [];

//: Markdown's own entry, used before the fetch lands. Everything that reads a
//: file type has to work on the very first paint, and a null here would mean
//: a guard at every call site instead of one honest default in one place.
const DEFAULT_FILE_TYPE = {
  ext: "md",
  label: "Markdown",
  line_comment: "",
  block_comment: ["<!-- ", " -->"],
  indent: "  ",
  previewable: true,
};

// Called from loadDocuments (i.e. whenever the Documents tab is opened) rather
// than once at load, and a no-op once the table is in hand.
//
// It *was* called once at the bottom of this file, and a browser found what
// reading it could not: at that point the app has not been unlocked, so the
// fetch 401s, `docFileTypes` is set to [], and nothing ever asks again. The
// picker stayed an empty <select> for the whole session — every option gone,
// no error anywhere, and the code reads as correct at every line. Same shape as
// the app.js comment about a stale token firing "a dozen requests before the
// user has unlocked anything"; this was the same mistake in a new file.
// Hanging it off the tab load means the first request is always authenticated,
// and a failed one is retried the next time you open the tab instead of
// poisoning the cache for good.
async function loadDocFileTypes() {
  if (docFileTypes.length) return;
  const body = await apiJson("/documents/file-types", { silent: true }).catch(() => null);
  docFileTypes = (body && body.types) || [];
  const picker = $("doc-file-type");
  if (!picker || !docFileTypes.length) return;
  picker.replaceChildren();
  for (const type of docFileTypes) {
    const option = document.createElement("option");
    option.value = type.ext;
    // The extension as well as the name: "Markdown" says what it is, ".md"
    // says what it will download as, and the download is the half people
    // check before sending a file to someone.
    option.textContent = `${type.label} (.${type.ext})`;
    picker.appendChild(option);
  }
  syncDocFileType();
}

//: The open document's type, never null. Falls back to markdown for a
//: document saved before file types existed, for an unknown extension, and
//: for the window between load and the fetch above landing.
function docFileType() {
  const ext = currentDoc?.file_type || "md";
  return docFileTypes.find((t) => t.ext === ext) || DEFAULT_FILE_TYPE;
}

// Everything about the editor that depends on the type, applied in one place
// so a type change and opening a document of that type cannot diverge.
function syncDocFileType() {
  const type = docFileType();
  const picker = $("doc-file-type");
  if (picker) picker.value = type.ext;

  // A code file has no rendered form. Offering Live and Split for one is
  // offering to show a wall of escaped source — so those two options are
  // disabled rather than hidden (hidden controls that come and go make a
  // toolbar feel unstable), and a document already in one of them is moved
  // back to Source rather than left looking at nothing.
  for (const button of document.querySelectorAll("#doc-view-seg button")) {
    const rendered = button.dataset.docView !== "source";
    button.disabled = rendered && !type.previewable;
    button.title = button.disabled
      ? `A .${type.ext} file has no rendered form — this is for markdown.`
      : button.dataset.docTitle || button.title;
  }
  if (!type.previewable && docView !== "source") setDocView("source");

  // The formatting toolbar is markdown syntax. In a .py file every button on
  // it inserts something wrong.
  $("doc-toolbar")?.classList.toggle("hidden", !type.previewable);

  // Line numbers, and the monospace/tab behaviour that goes with them.
  const code = !type.previewable;
  $("doc-content")?.classList.toggle("doc-content-code", code);
  $("doc-gutter")?.classList.toggle("hidden", !code);
  renderDocGutter();

  // A menu row, so it can say the whole thing rather than "⬇ .py".
  // `setLabel` because `textContent` here would wipe the icon element the
  // markup puts in front of the words.
  setLabel($("doc-export-md"), `ph:download-simple Download as .${type.ext}`);
  $("doc-export-md").title = `Download as a .${type.ext} file`;
}

// The dock's kebab closes when you pick something from it, and when you click
// away — `<details>` gives everything else (open on click and on Enter/Space,
// close on Escape, the ARIA) and neither of those two.
document.getElementById("doc-dock-menu")?.addEventListener("click", (event) => {
  if (event.target.closest(".doc-dock-menu-item")) {
    document.getElementById("doc-dock-menu").open = false;
  }
});
document.addEventListener("click", (event) => {
  const menu = document.getElementById("doc-dock-menu");
  if (menu?.open && !menu.contains(event.target)) menu.open = false;
});

// --- which of the four views is showing ----------------------------------------
//
// "source" (the plain textarea), "live" (render-as-you-write), "split" (source
// beside a rendered pane) or "rendered" (the finished document alone, no
// editor). Per-device workspace state rather than a preference on the document:
// which way you like to look at your writing does not belong in a backup, and
// is the same kind of thing as `graph-layout`.
//
// "rendered" is deliberately a peer of "split" rather than a sub-state of it.
// Asked for as a "full toggle switch between editor mode and rendered mode *or*
// the split view" — i.e. reading the finished page at full width is its own
// thing, not split-with-one-pane-collapsed.
const DOC_VIEW_KEY = "doc-view-mode";
const DOC_VIEWS = ["source", "live", "split", "rendered"];
let docView = "source";

// The two modes that put #doc-preview on screen. Kept as one predicate because
// every "is the rendered pane showing?" decision below has to agree with every
// other one — the split/rendered pair is exactly the shape that goes wrong when
// each site spells the check out for itself.
function docPreviewShowing(mode = docView) {
  return mode === "split" || mode === "rendered";
}

function setDocView(mode) {
  const type = docFileType();
  // A code file is always Source. Asked for on any other mode, that is the
  // honest answer rather than an empty pane.
  if (!type.previewable && mode !== "source") mode = "source";
  docView = DOC_VIEWS.includes(mode) ? mode : "source";
  try {
    localStorage.setItem(DOC_VIEW_KEY, docView);
  } catch {
    // A private window with storage blocked is not a reason to refuse to
    // change view — the choice just does not survive the reload.
  }

  // Where the editor was scrolled to, as a fraction, taken *before* anything is
  // hidden. syncDocScroll can't do this for the "rendered" hand-off: a hidden
  // textarea reports scrollHeight === clientHeight === 0, so its own zero-range
  // guard makes it a no-op and you land back at the top of a long document you
  // were halfway down.
  const editor = $("doc-content");
  const editorRange = editor ? editor.scrollHeight - editor.clientHeight : 0;
  const editorRatio = editorRange > 0 ? editor.scrollTop / editorRange : null;

  // Source is hidden in the two modes that replace it outright; the preview is
  // shown in the two that include it. Only "split" gets the side-by-side class
  // — in "rendered" the preview is the sole child of a column flexbox and
  // fills it without any help.
  $("doc-source-wrap").classList.toggle("hidden", docView === "live" || docView === "rendered");
  $("doc-live").classList.toggle("hidden", docView !== "live");
  $("doc-preview").classList.toggle("hidden", !docPreviewShowing());
  $("doc-panes").classList.toggle("split", docView === "split");
  $("doc-panes").classList.toggle("reading", docView === "rendered");

  for (const button of document.querySelectorAll("#doc-view-seg button")) {
    const on = button.dataset.docView === docView;
    button.classList.toggle("active", on);
    button.setAttribute("aria-pressed", String(on));
  }

  if (docPreviewShowing()) {
    renderDocPreview();
    // Opening the preview on a document you have already scrolled into
    // should show the part you are looking at, not the top of the file.
    if (docView === "rendered") {
      const preview = $("doc-preview");
      const range = preview.scrollHeight - preview.clientHeight;
      if (editorRatio !== null && range > 0) preview.scrollTop = editorRatio * range;
    } else {
      syncDocScroll(editor);
    }
  }
  if (docView === "live") renderDocLive();
}

async function loadDocuments(selectId = null) {
  // Before the list, not after: the file-type table decides how the editor
  // behaves, and openDocument below reads it. Awaited rather than fired off,
  // so the picker is never briefly empty on the first visit to this tab.
  await loadDocFileTypes();
  docs = await apiJson("/documents").catch(() => []);
  renderDocList();
  if (selectId) return openDocument(selectId);
  if (!currentDoc && docs.length) return openDocument(docs[0].id);
  if (!docs.length) showNoDocument();
}

//: How many documents the switcher shows. Searching and sorting all of them
//: is the Library's job (§36G); this list is here so the document you were in
//: ten minutes ago is one click away without leaving the page you are writing
//: on. The one you have *open* is always in it, however old, or the sidebar
//: would stop showing you where you are.
const RECENT_DOCS_SHOWN = 8;

function renderDocList() {
  const list = $("doc-list");
  list.replaceChildren();
  const shown = docs.slice(0, RECENT_DOCS_SHOWN);
  if (currentDoc && !shown.some((d) => d.id === currentDoc.id)) {
    const open = docs.find((d) => d.id === currentDoc.id);
    if (open) shown[shown.length - 1] = open;
  }
  $("doc-empty").classList.toggle("hidden", docs.length > 0);

  for (const doc of shown) {
    const li = document.createElement("li");
    li.className = "doc-item";
    if (currentDoc && doc.id === currentDoc.id) li.classList.add("active");
    // A `<button>` the way this row used to be a `<button>` cannot also host
    // the kebab below — a button can't contain another button. Same
    // article-not-button shape renderLibraryDocuments() already uses for
    // exactly this reason, so the two Rename/Delete surfaces (this sidebar
    // and the Library's Documents sub-tab) look and behave the same way.
    // Reported: this list had never grown rename/delete at all, only Open.
    const button = document.createElement("div");
    button.className = "doc-item-button";
    button.setAttribute("role", "button");
    button.tabIndex = 0;
    const title = document.createElement("span");
    title.className = "doc-item-title";
    title.textContent = doc.title;
    const meta = document.createElement("span");
    meta.className = "muted doc-item-meta";
    meta.textContent = `${doc.words} word${doc.words === 1 ? "" : "s"} · ${relativeTime(doc.updated_at)}`;
    button.append(title, meta);
    button.addEventListener("click", () => openDocument(doc.id));
    button.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      openDocument(doc.id);
    });

    const menu = kebabMenu(
      [
        makeMenuItem("ph:pencil-simple Rename", "Rename this document", async () => {
          const next = await promptDialog("Rename this document:", doc.title || "");
          if (!next) return;
          await apiJson(`/documents/${doc.id}`, {
            method: "PUT",
            body: JSON.stringify({ title: next }),
          }).catch((e) => toast(e.message, true));
          loadDocuments(currentDoc?.id);
        }),
        makeMenuItem("ph:trash Delete", "Delete this document", async () => {
          if (!(await confirmDialog(`Delete "${doc.title || "Untitled"}"? This cannot be undone.`))) return;
          await apiJson(`/documents/${doc.id}`, { method: "DELETE" }).catch((e) => toast(e.message, true));
          // Cleared, not just left stale: loadDocuments() only opens a
          // replacement when `currentDoc` is falsy - leaving it pointing at
          // the doc that was just deleted would keep the editor showing it.
          if (currentDoc && currentDoc.id === doc.id) currentDoc = null;
          loadDocuments(currentDoc?.id);
        }),
      ],
      `Actions for "${doc.title || "Untitled"}"`
    );
    menu.classList.add("doc-item-menu");
    menu.addEventListener("click", (event) => event.stopPropagation());
    // Same clipping shape as the Library's own Documents-subtab kebab — a
    // scrolling list of rows with a `position: absolute` popup on the last
    // few. `kebabMenu()` now escapes every menu it builds, so this list gets
    // the fix without its own call.

    li.append(button, menu);
    list.appendChild(li);
  }
}

function showNoDocument() {
  currentDoc = null;
  $("doc-title").value = "";
  $("doc-content").value = "";
  // Deliberately NOT disabled. Disabling them meant that on a notebook with no
  // documents yet, clicking the editor did nothing and typing did nothing —
  // a dead end whose only way out was noticing a small "+ New" button. Typing
  // now creates the document, which is what every editor does.
  $("doc-title").disabled = false;
  $("doc-content").disabled = false;
  $("doc-content").placeholder =
    "Start typing and a new document is created for you.\n\nMarkdown works here — headings, **bold**, lists, tables, links.";
  $("doc-saved").textContent = "";
  renderDocPreview();
  renderDocStats();
  renderDocOutline();
}

async function openDocument(id) {
  // Never lose unsaved work by switching away from it.
  if (docDirty) await saveDocument({ silent: true });
  $("doc-content").placeholder =
    "# Start writing\n\nMarkdown works here — headings, **bold**, lists, tables, links.";
  const doc = await apiJson(`/documents/${id}`).catch(() => null);
  if (!doc) return;
  // ROADMAP.md item 13: "opening/closing a document" was the one remaining
  // gap in back/forward nav after chat's own conv:<id> fix. Same shape,
  // recorded here (not at each of openDocument's several call sites) so
  // none of them has to remember to — same reasoning openConversation's own
  // comment gives for doing it there instead of at ITS call sites.
  recordTabVisit("documents", `doc:${doc.id}`);
  currentDoc = doc;
  $("doc-title").disabled = false;
  $("doc-content").disabled = false;
  $("doc-title").value = doc.title;
  $("doc-content").value = doc.content;
  docDirty = false;
  $("doc-saved").textContent = "Saved";
  // Before the renders below: it decides which of them are even reachable
  // (a code document has no Live or Split) and puts the editor into the
  // right mode first, so nothing paints twice.
  syncDocFileType();
  renderDocPreview();
  if (docView === "live") renderDocLive();
  renderDocStats();
  renderDocOutline();
  renderDocNotes();
  renderDocBacklinks();
  renderDocBookmarks();
  renderDocList();
}

// The notes this document draws on. Shown beside the outline because both
// answer the same question — what is this document made of.
// Which notes point at the open document with a [[wiki link]].
//
// The reverse direction of resolveWikiTarget, and deliberately computed from
// `allEntries` on the client rather than added as an endpoint: the notes are
// already loaded, the match is the same title comparison the resolver does, and
// a round trip to learn something the browser already knows is a round trip
// that will be slow exactly when the notebook is large.
//
// Note this is a *different* relationship from renderDocNotes above, which
// lists notes explicitly attached to the document. A note can mention a
// document without being filed under it, and that is the interesting case.
function renderDocBacklinks() {
  const wrap = $("doc-backlinks-wrap");
  const list = $("doc-backlinks");
  if (!wrap || !list) return;
  const title = (currentDoc?.title || "").trim().toLowerCase();
  const attached = new Set(((currentDoc && currentDoc.notes) || []).map((n) => n.id));

  const linking = !title
    ? []
    : (typeof allEntries !== "undefined" ? allEntries : []).filter((entry) => {
        if (entry.is_private) return false;
        // Already shown under "Notes it draws on" — listing it twice says
        // there are two connections when there is one.
        if (attached.has(entry.id)) return false;
        const pattern = /\[\[([^[\]]{1,120})\]\]/g;
        let match;
        while ((match = pattern.exec(entry.content || "")) !== null) {
          if (match[1].trim().toLowerCase() === title) return true;
        }
        return false;
      });

  wrap.classList.toggle("hidden", !linking.length);
  list.replaceChildren();
  for (const entry of linking) {
    const item = document.createElement("li");
    const open = document.createElement("button");
    open.type = "button";
    open.className = "outline-link";
    open.textContent = noteLabel(entry, 60);
    open.title = "Show this note";
    open.addEventListener("click", () => {
      switchTab("notes");
      showNotesSection("browse"); // focusing inside a hidden section does nothing
      flashEntry(entry.id);
    });
    item.appendChild(open);
    list.appendChild(item);
  }
}

function renderDocNotes() {
  const wrap = $("doc-notes-wrap");
  const list = $("doc-notes");
  const notes = (currentDoc && currentDoc.notes) || [];
  wrap.classList.toggle("hidden", !notes.length);
  list.replaceChildren();
  for (const note of notes) {
    const item = document.createElement("li");
    const open = document.createElement("button");
    open.type = "button";
    open.className = "outline-link";
    if (note.is_private) {
      setLabel(open, "ph:lock (private note)");
    } else {
      renderInlineMarkdown(open, note.preview, [], true);
    }
    open.title = "Show this note";
    open.addEventListener("click", () => {
      switchTab("notes");
      showNotesSection("browse"); // focusing inside a hidden section does nothing
      flashEntry(note.id);
    });
    const remove = smallButton("✕", "Detach this note from the document", async () => {
      currentDoc = await apiJson(
        `/documents/${currentDoc.id}/notes/${note.id}`,
        { method: "DELETE" }
      );
      renderDocNotes();
      // Detaching can move a note *into* the backlinks list: it may still
      // mention this document by [[title]], and that connection only becomes
      // visible once it is no longer filed under it.
      renderDocBacklinks();
      // The note keeps existing — only the connection went.
      loadEntries();
    });
    item.append(open, remove);
    list.appendChild(item);
  }
}

// References (§30): saved links attached to this document, the Documents
// half of the same concept notes' own edit form already got this session.
async function renderDocBookmarks() {
  const list = $("doc-bookmarks");
  if (!list || !currentDoc) return;
  let attached;
  try {
    attached = await apiJson(`/documents/${currentDoc.id}/bookmarks`);
  } catch {
    return;
  }
  if (currentDoc?.id == null) return; // the document changed while this was in flight
  list.replaceChildren();
  for (const bookmark of attached) {
    const item = document.createElement("li");
    const open = document.createElement("button");
    open.type = "button";
    open.className = "outline-link";
    setLabel(open, `ph:link ${bookmark.title || bookmark.url}`);
    open.title = bookmark.url;
    open.addEventListener("click", () => window.open(bookmark.url, "_blank", "noopener,noreferrer"));
    const remove = smallButton("✕", "Remove this reference", async () => {
      await apiJson(`/documents/${currentDoc.id}/bookmarks/${bookmark.id}`, { method: "DELETE" });
      renderDocBookmarks();
    });
    item.append(open, remove);
    list.appendChild(item);
  }
}

async function attachBookmarkToDocument() {
  if (!currentDoc) return;
  let all;
  try {
    all = await apiJson("/bookmarks");
  } catch (error) {
    toast(error.message, true);
    return;
  }
  if (!all.length) {
    toast("No saved links yet — add one in Library → Links first.");
    return;
  }
  const wrap = $("doc-bookmarks-wrap");
  const select = document.createElement("select");
  select.className = "bookmark-attach-picker";
  const placeholder = document.createElement("option");
  placeholder.textContent = "Pick a saved link…";
  placeholder.value = "";
  select.appendChild(placeholder);
  for (const bookmark of all) {
    const option = document.createElement("option");
    option.value = String(bookmark.id);
    option.textContent = bookmark.title || bookmark.url;
    select.appendChild(option);
  }
  select.addEventListener("change", async () => {
    if (!select.value || !currentDoc) return;
    await apiJson(`/documents/${currentDoc.id}/bookmarks`, {
      method: "POST",
      body: JSON.stringify({ bookmark_id: Number(select.value) }),
    });
    select.remove();
    renderDocBookmarks();
  });
  wrap.insertBefore(select, $("doc-attach-bookmark"));
  select.focus();
}

async function createDocument() {
  const doc = await apiJson("/documents", {
    method: "POST",
    body: JSON.stringify({ title: "Untitled", content: "" }),
  });
  loadCaptureDocuments(); // so Capture can attach to it straight away
  await loadDocuments(doc.id);
  $("doc-title").focus();
  $("doc-title").select();
}

// Guards against creating several documents from one fast burst of typing.
let creatingDocument = null;

async function ensureDocumentExists() {
  if (currentDoc) return currentDoc;
  if (creatingDocument) return creatingDocument;
  creatingDocument = (async () => {
    const doc = await apiJson("/documents", {
      method: "POST",
      body: JSON.stringify({ title: "Untitled", content: "" }),
    });
    currentDoc = doc;
    docs.unshift({ ...doc });
    // The list gains an "Untitled" row the moment this returns, so show the
    // same name in the title box — otherwise the document you're typing into
    // appears to have no name while the sidebar says it has one.
    if (!$("doc-title").value.trim()) $("doc-title").value = doc.title;
    renderDocList();
    $("doc-empty").classList.add("hidden");
    return doc;
  })();
  try {
    return await creatingDocument;
  } finally {
    creatingDocument = null;
  }
}

function markDocDirty() {
  // These are read off the textarea, so they're right even before the save
  // lands — the point of them is live feedback while writing.
  renderDocStats();
  renderDocOutline();
  // No document yet? Typing makes one, then this save proceeds normally.
  if (!currentDoc) {
    ensureDocumentExists().then(() => markDocDirty());
    return;
  }
  docDirty = true;
  $("doc-saved").textContent = "Unsaved…";
  clearTimeout(docSaveTimer);
  // Autosave, but not on every keystroke — a pause is the natural moment.
  docSaveTimer = setTimeout(() => saveDocument({ silent: true }), 1200);
}

async function saveDocument({ silent = false } = {}) {
  if (!currentDoc) return;
  clearTimeout(docSaveTimer);
  const title = $("doc-title").value.trim() || "Untitled";
  const content = $("doc-content").value;
  try {
    const saved = await apiJson(`/documents/${currentDoc.id}`, {
      method: "PUT",
      // `file_type` every time, not only when it changed: the server treats
      // null as "leave it alone", so sending the current value is harmless,
      // and omitting it would make a type change depend on which save
      // happened to run next.
      body: JSON.stringify({ title, content, file_type: currentDoc.file_type || "md" }),
    });
    currentDoc = saved;
    docDirty = false;
    $("doc-saved").textContent = "Saved";
    if (!silent) toast("Document saved.");
    docs = docs.map((d) => (d.id === saved.id ? { ...d, ...saved } : d));
    renderDocList();
  } catch (error) {
    $("doc-saved").textContent = "Not saved";
    $("doc-status").classList.add("error");
    $("doc-status").textContent = error.message;
  }
}

// A note that outgrew itself becomes a document. Notes and documents were
// two islands: the only way across was copy and paste, which loses the link
// between them. The note is deliberately left alone — this is a promotion,
// not a move, and quietly deleting someone's note to "convert" it is the
// kind of helpfulness nobody asks for twice.
async function expandNoteIntoDocument(entry) {
  const text = entry.content || "";
  // The first line makes a reasonable title; the rest is the body.
  const [firstLine, ...rest] = text.split("\n");
  const title = (firstLine || "Untitled").replace(/^#+\s*/, "").slice(0, 120).trim();
  const body = rest.join("\n").trim() || text;
  try {
    const doc = await apiJson("/documents", {
      method: "POST",
      body: JSON.stringify({
        title: title || "Untitled",
        // A line back to where it came from, so the pair stay findable.
        content: `${body}\n\n---\n\nExpanded from note #${entry.id}.\n`,
      }),
    });
    switchTab("documents");
    await loadDocuments(doc.id);
    toast(`Started a document from this note — the note itself is untouched.`);
  } catch (error) {
    toast(error.message, true);
  }
}

// Words and reading time. Both are cheap to compute and are the two numbers
// anyone writing long-form actually wants on screen.
const READING_WORDS_PER_MINUTE = 220;

// A target word count, set per document and kept client-side — it's a
// writing aid, not notebook data, so it doesn't need a column or to survive
// a restore onto another machine the way the document's own content does.
function docWordGoalKey(id) {
  return `docWordGoal:${id}`;
}

function getDocWordGoal(id) {
  if (!id) return 0;
  return Number(localStorage.getItem(docWordGoalKey(id))) || 0;
}

function setDocWordGoal(id, goal) {
  if (!id) return;
  if (goal > 0) {
    localStorage.setItem(docWordGoalKey(id), String(goal));
  } else {
    localStorage.removeItem(docWordGoalKey(id));
  }
}

function renderDocStats() {
  const el = $("doc-stats");
  if (!el) return;
  const text = $("doc-content").value || "";
  const words = (text.match(/\S+/g) || []).length;
  const goal = currentDoc ? getDocWordGoal(currentDoc.id) : 0;
  const goalBtn = $("doc-word-goal");
  if (goalBtn) {
    goalBtn.title = goal
      ? `Goal: ${goal.toLocaleString()} words — click to change`
      : "Set a word-count goal";
    goalBtn.setAttribute("aria-pressed", String(goal > 0));
  }
  if (!words) {
    el.textContent = "";
    return;
  }
  const minutes = words / READING_WORDS_PER_MINUTE;
  // Under a minute, "1 min read" overstates it; over an hour, minutes stop
  // meaning anything.
  const readTime =
    minutes < 1
      ? "under a min"
      : minutes < 60
        ? `${Math.round(minutes)} min read`
        : `${(minutes / 60).toFixed(1)}h read`;
  const wordsPart = goal
    ? `${words.toLocaleString()} / ${goal.toLocaleString()} words (${Math.min(100, Math.round((words / goal) * 100))}%)`
    : `${words.toLocaleString()} word${words === 1 ? "" : "s"}`;
  el.textContent = `${wordsPart} · ${readTime}`;
}

function promptDocWordGoal() {
  if (!currentDoc) return;
  const current = getDocWordGoal(currentDoc.id);
  $("doc-word-goal-input").value = current || "";
  $("doc-word-goal-dialog").showModal();
  $("doc-word-goal-input").focus();
}

// --- find and replace (16b: "a bunch of missing features" — this is the
// concrete first one; browser Ctrl+F never worked here because a
// textarea's own text isn't part of the searchable page DOM at all, only
// its *value* is) ---------------------------------------------------------
let docFindIndex = -1; // which match the Prev/Next cursor is currently on

function docFindMatches() {
  const term = $("doc-find-input").value;
  if (!term) return [];
  const text = $("doc-content").value;
  const needle = term.toLowerCase();
  const haystack = text.toLowerCase();
  const matches = [];
  let from = 0;
  while (true) {
    const at = haystack.indexOf(needle, from);
    if (at === -1) break;
    matches.push(at);
    from = at + needle.length;
  }
  return matches;
}

function docFindSelect(index, matches) {
  const term = $("doc-find-input").value;
  const box = $("doc-content");
  if (!matches.length || index < 0 || index >= matches.length) {
    $("doc-find-count").textContent = term ? "No matches" : "";
    return;
  }
  docFindIndex = index;
  const start = matches[index];
  box.focus();
  box.setSelectionRange(start, start + term.length);
  $("doc-find-count").textContent = `${index + 1} of ${matches.length}`;
}

function docFindStep(delta) {
  const matches = docFindMatches();
  if (!matches.length) {
    docFindIndex = -1;
    $("doc-find-count").textContent = $("doc-find-input").value ? "No matches" : "";
    return;
  }
  const next = ((docFindIndex + delta) % matches.length + matches.length) % matches.length;
  docFindSelect(next, matches);
}

function docReplaceOne() {
  const box = $("doc-content");
  const term = $("doc-find-input").value;
  if (!term) return;
  const selected = box.value.slice(box.selectionStart, box.selectionEnd);
  // Only replace what's actually selected and actually a match — Replace
  // clicked with nothing found selected first should find, not guess.
  if (selected.toLowerCase() !== term.toLowerCase()) {
    docFindStep(1);
    return;
  }
  const replacement = $("doc-replace-input").value;
  const start = box.selectionStart;
  box.setRangeText(replacement, start, box.selectionEnd, "end");
  box.dispatchEvent(new Event("input", { bubbles: true }));
  docFindIndex = -1;
  docFindStep(1);
}

function docReplaceAll() {
  const term = $("doc-find-input").value;
  if (!term) return;
  const replacement = $("doc-replace-input").value;
  const box = $("doc-content");
  const pattern = new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi");
  const before = box.value;
  const count = (before.match(pattern) || []).length;
  if (!count) {
    $("doc-find-count").textContent = "No matches";
    return;
  }
  box.value = before.replace(pattern, replacement);
  box.dispatchEvent(new Event("input", { bubbles: true }));
  $("doc-find-count").textContent = `Replaced ${count}`;
  docFindIndex = -1;
}

function toggleDocFindBar(open) {
  const bar = $("doc-find-bar");
  const show = open ?? bar.classList.contains("hidden");
  bar.classList.toggle("hidden", !show);
  $("doc-find-toggle").setAttribute("aria-expanded", String(show));
  if (show) {
    $("doc-find-input").focus();
    $("doc-find-input").select();
  } else {
    docFindIndex = -1;
    $("doc-content").focus();
  }
}

// A table of contents built from the document's own headings. Past a couple
// of screens the scrollbar stops being a way to navigate a document.
function renderDocOutline() {
  const list = $("doc-outline");
  const wrap = $("doc-outline-wrap");
  if (!list || !wrap) return;
  const text = $("doc-content").value || "";
  const headings = [];
  let inFence = false;
  const lines = text.split("\n");
  lines.forEach((line, index) => {
    // A "# " inside a code fence is code, not a heading.
    if (line.trim().startsWith("```")) inFence = !inFence;
    if (inFence) return;
    const match = /^(#{1,4})\s+(.*\S)\s*$/.exec(line);
    if (match) headings.push({ level: match[1].length, text: match[2], line: index });
  });

  wrap.classList.toggle("hidden", headings.length < 2);
  list.replaceChildren();
  for (const heading of headings) {
    const li = document.createElement("li");
    li.className = `outline-h${heading.level}`;
    const button = document.createElement("button");
    button.type = "button";
    button.className = "outline-link";
    button.textContent = heading.text;
    button.title = `Jump to “${heading.text}”`;
    button.addEventListener("click", () => jumpToDocLine(heading.line));
    li.appendChild(button);
    list.appendChild(li);
  }
}

// Put the caret at the start of a line and scroll it into view. A textarea
// has no anchors, so this is done by character offset.
function jumpToDocLine(lineIndex) {
  const box = $("doc-content");
  const lines = box.value.split("\n");
  const offset = lines.slice(0, lineIndex).reduce((n, l) => n + l.length + 1, 0);
  box.focus();
  box.setSelectionRange(offset, offset + (lines[lineIndex] || "").length);
  // Approximate: scroll proportionally to where the line sits in the text.
  const ratio = lineIndex / Math.max(1, lines.length);
  box.scrollTop = Math.max(0, ratio * box.scrollHeight - box.clientHeight / 3);
}

// Answers "where is this actually kept?" with the real path, once.
let storageInfo = null;

async function renderDocStorage() {
  const el = $("doc-storage-path");
  if (!el) return;
  if (!storageInfo) {
    storageInfo = await apiJson("/storage").catch(() => null);
  }
  el.textContent = storageInfo ? storageInfo.database : "(couldn't read the path)";
}

function renderDocPreview() {
  const preview = $("doc-preview");
  if (preview.classList.contains("hidden")) return;
  preview.replaceChildren();
  const title = ($("doc-title").value || "").trim();
  renderMarkdown(preview, title ? `# ${title}\n\n${$("doc-content").value}` : $("doc-content").value);
  layerDocWikiLinks(preview);
}

// [[Document title]] as clickable links in the preview, the same idea as a
// note's [[wiki link]] (renderNoteText) but resolving against `docs` by
// title instead of by content prefix — documents have real titles. A
// post-process over renderMarkdown's already-built DOM rather than a change
// to the parser itself: renderMarkdown is a hand-rolled block parser shared
// with notes/chat/dashboard, and layering a second concern into its inline
// pass is exactly the kind of touch that's cheap to get subtly wrong for
// every other caller. Skips text inside <code>/<pre> so a literal "[[x]]" in
// a fenced snippet isn't turned into a button.
function layerDocWikiLinks(container) {
  const targets = [];
  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      if (node.parentElement && node.parentElement.closest("code, pre")) {
        return NodeFilter.FILTER_REJECT;
      }
      return /\[\[[^[\]]{1,120}\]\]/.test(node.nodeValue)
        ? NodeFilter.FILTER_ACCEPT
        : NodeFilter.FILTER_SKIP;
    },
  });
  let node;
  while ((node = walker.nextNode())) targets.push(node);

  for (const textNode of targets) {
    const text = textNode.nodeValue;
    const pattern = /\[\[([^[\]]{1,120})\]\]/g;
    const frag = document.createDocumentFragment();
    let cursor = 0;
    let match;
    while ((match = pattern.exec(text)) !== null) {
      if (match.index > cursor) {
        frag.appendChild(document.createTextNode(text.slice(cursor, match.index)));
      }
      const name = match[1].trim();
      const target = docs.find((d) => d.title.toLowerCase() === name.toLowerCase());
      const link = document.createElement("button");
      link.type = "button";
      link.className = "wiki-link";
      link.textContent = name;
      link.title = target ? `Open "${target.title}"` : `No document called "${name}" yet.`;
      link.addEventListener("click", (event) => {
        event.stopPropagation();
        if (target) openDocument(target.id);
        else toast(`No document called "${name}" yet.`, true);
      });
      frag.appendChild(link);
      cursor = pattern.lastIndex;
    }
    if (cursor < text.length) {
      frag.appendChild(document.createTextNode(text.slice(cursor)));
    }
    textNode.parentNode.replaceChild(frag, textNode);
  }
}

// The PDF export needs the rendered pane on screen for the duration of the
// print, whatever view the user was in, and puts them back afterwards. It is
// the only remaining caller of anything toggle-shaped — the Preview tickbox
// itself became the four-way #doc-view-seg (see setDocView), because with four
// modes a tickbox could not say which one you were in.
//
// It borrows "rendered" rather than "split": what gets printed is the preview
// pane, and at full width it lays out the way the PDF will. If the user is
// already in a mode showing the preview, leave them there — reflowing a pane
// mid-print is how a page break lands in the wrong place.
function withDocPreviewShown(fn) {
  const previous = docView;
  const restoring = !docPreviewShowing(previous);
  if (restoring) setDocView("rendered");
  renderDocPreview();
  fn(() => {
    if (restoring) setDocView(previous);
  });
}

// --- the code editor: line numbers, indent, comment toggle ---------------------
//
// Asked for directly: a code file should have "code lines as well as language
// detection and ctrl + / commenting or equivalent as well as indenting and
// dedenting". All three are keystroke-level, which is why the file-type table
// is fetched and cached rather than queried — see `loadDocFileTypes`.
//
// Built on the existing textarea rather than on a third-party code editor.
// This app has no build step (`frontend/app.js` is served as-is), so a real
// editor component would mean either a vendored bundle or a CDN, and the
// three behaviours that were actually asked for are a few dozen lines each
// against a textarea. What is genuinely lost by not using one is syntax
// *colouring*, which needs a tokeniser per language; that is a separate
// decision with a real dependency behind it, and pretending otherwise by
// half-highlighting a few keywords would look worse than plain monospace.

function renderDocGutter() {
  const gutter = $("doc-gutter");
  const box = $("doc-content");
  if (!gutter || !box || gutter.classList.contains("hidden")) return;
  const lines = box.value.split("\n").length;
  // One text node of numbers, not one element per line: a 5,000-line file is
  // 5,000 elements to build and lay out on every keystroke otherwise, and the
  // gutter is doing nothing that needs per-line nodes.
  gutter.textContent = Array.from({ length: lines }, (_, i) => i + 1).join("\n");
  gutter.scrollTop = box.scrollTop;
}

//: The lines a selection touches, as [firstLine, lastLine] and the character
//: offsets that bracket them. Indent, dedent and comment-toggle all work on
//: whole lines, and all three need exactly this.
function docSelectedLines(box) {
  const value = box.value;
  const start = value.lastIndexOf("\n", box.selectionStart - 1) + 1;
  let end = value.indexOf("\n", box.selectionEnd);
  if (end === -1) end = value.length;
  // A selection ending exactly at a line start has not touched that line —
  // without this, selecting one whole line by dragging comments out two.
  if (box.selectionEnd > box.selectionStart && box.selectionEnd === start) {
    end = box.selectionEnd;
  }
  return { start, end, text: value.slice(start, end) };
}

//: Replace a run of the textarea through the browser's own edit pipeline, so
//: the native undo stack keeps working. Assigning `.value` wipes it, which
//: would make Ctrl+Z stop working in exactly the editor where people press it
//: most — the single most important detail in this whole section.
function docReplaceRange(box, start, end, text) {
  box.focus();
  box.setSelectionRange(start, end);
  if (!document.execCommand || !document.execCommand("insertText", false, text)) {
    // execCommand is deprecated and may be gone. Falling back to a direct
    // write loses native undo for that one edit, which beats the edit not
    // happening — and `markDocDirty` still runs, so nothing is lost.
    const value = box.value;
    box.value = value.slice(0, start) + text + value.slice(end);
  }
}

function indentDocSelection(box, outdent) {
  const type = docFileType();
  const unit = type.indent || "  ";
  const { start, end, text } = docSelectedLines(box);
  const multiline = text.includes("\n") || box.selectionEnd > box.selectionStart;

  // A plain Tab with no selection inserts one indent at the caret, which is
  // what Tab does in every editor. Only a selection (or Shift+Tab) means
  // "re-indent these lines".
  if (!multiline && !outdent) {
    const at = box.selectionStart;
    docReplaceRange(box, at, box.selectionEnd, unit);
    markDocDirty();
    renderDocGutter();
    return;
  }

  const lines = text.split("\n");
  const changed = lines.map((line) => {
    if (!outdent) return line ? unit + line : line;
    // Dedent removes one indent unit, or — for a line indented with the
    // wrong-width whitespace, which happens constantly in a pasted file —
    // up to that many leading spaces. Removing nothing when the line is
    // flush left is correct, not a failure.
    if (line.startsWith(unit)) return line.slice(unit.length);
    const leading = line.match(/^[ \t]+/);
    if (!leading) return line;
    return line.slice(Math.min(leading[0].length, unit.length));
  });
  docReplaceRange(box, start, end, changed.join("\n"));
  box.setSelectionRange(start, start + changed.join("\n").length);
  markDocDirty();
  renderDocGutter();
}

function toggleDocComment(box) {
  const type = docFileType();
  const { start, end, text } = docSelectedLines(box);
  const lines = text.split("\n");

  if (type.line_comment) {
    const marker = type.line_comment;
    const real = lines.filter((line) => line.trim());
    // Uncomment only when *every* non-blank line is already commented. The
    // other way round (any line commented -> uncomment all) silently strips
    // a real comment that happened to be inside the selection.
    const allCommented =
      real.length > 0 && real.every((line) => line.trimStart().startsWith(marker));
    const changed = lines.map((line) => {
      if (!line.trim()) return line;
      if (allCommented) {
        const at = line.indexOf(marker);
        // Drop one following space if this put one there — so a round trip
        // of comment-then-uncomment gives back exactly the original line.
        const after = line.slice(at + marker.length);
        return line.slice(0, at) + (after.startsWith(" ") ? after.slice(1) : after);
      }
      // Inserted after the existing indentation, not at column zero: a
      // comment marker flush left inside an indented block is legal and ugly,
      // and is not what any editor does.
      const indent = line.match(/^[ \t]*/)[0];
      return `${indent}${marker} ${line.slice(indent.length)}`;
    });
    docReplaceRange(box, start, end, changed.join("\n"));
    box.setSelectionRange(start, start + changed.join("\n").length);
  } else if (type.block_comment) {
    // No line-comment form at all (HTML, XML, CSS). Toggling a line means
    // wrapping it — a prefix would produce a file that no longer parses.
    const [open, close] = type.block_comment;
    const trimmed = text.trim();
    const wrapped = trimmed.startsWith(open.trim()) && trimmed.endsWith(close.trim());
    const changed = wrapped
      ? trimmed.slice(open.trim().length, trimmed.length - close.trim().length).trim()
      : `${open}${text}${close}`;
    docReplaceRange(box, start, end, changed);
    box.setSelectionRange(start, start + changed.length);
  } else {
    // Plain text genuinely has no comment syntax. Doing nothing quietly is
    // right — there is no sensible thing to insert.
    return;
  }
  markDocDirty();
  renderDocGutter();
}

// --- Live Preview: render as you write ----------------------------------------
//
// ROADMAP item 0, asked for again directly: "the notion/obsidian live md
// rendering after typing hybrid kind of md". The model both of those use, and
// the one implemented here: **the document renders, except the block your
// caret is in, which shows its raw markdown.** So `**bold**` is bold while you
// read it and `**bold**` while you edit it, and you never lose sight of the
// syntax you are actually typing.
//
// The design decision that makes this affordable, and the reason it is a view
// rather than a rewrite: **`#doc-content` stays the source of truth.** Every
// edit here writes straight back into the textarea and calls the same
// `markDocDirty` everything else does. Autosave, the word count, the outline,
// find-and-replace, Extract notes and the whole AI panel therefore keep
// working against one value, unchanged, and none of them had to learn that a
// second editor exists. The roadmap's own scoping note recommends a per-block
// editor over a whole-document `contenteditable` for exactly this reason —
// a contenteditable holding the entire document makes the DOM the truth, and
// then every one of those features has to be rewritten to read from it.
//
// One block is one paragraph: markdown's own unit, separated by a blank line.
// Blocks are re-derived from the text on every structural change rather than
// maintained incrementally, because an incremental block list is a second
// model of the document that can drift out of step with the textarea — and
// the whole point of the arrangement above is that there is only one.

//: Which block is being edited, by index, or -1 when none is. Only ever one:
//: two open source blocks would be two places the same document is being
//: written in.
let docLiveActive = -1;

//: A fence opener/closer. Split has to skip over these — a blank line inside
//: a ```code block``` is part of the code, not a paragraph break, and
//: splitting there turns one code block into two broken ones.
const DOC_FENCE = /^\s*(?:```|~~~)/;

function docLiveBlocks(text) {
  const lines = String(text ?? "").replace(/\r\n/g, "\n").split("\n");
  const blocks = [];
  let current = [];
  let inFence = false;
  const flush = () => {
    // Trailing blank lines belong to the separator, not to the block — they
    // are re-added by `docLiveText` below, so a round trip is lossless.
    while (current.length && !current[current.length - 1].trim()) current.pop();
    if (current.length) blocks.push(current.join("\n"));
    current = [];
  };
  for (const line of lines) {
    if (DOC_FENCE.test(line)) {
      inFence = !inFence;
      current.push(line);
      // A closing fence ends the block: what follows is a new paragraph even
      // without a blank line between them.
      if (!inFence) flush();
      continue;
    }
    if (!inFence && !line.trim()) {
      flush();
      continue;
    }
    current.push(line);
  }
  flush();
  return blocks;
}

//: Blocks back into one document. Two newlines between them, which is what
//: split consumed — so text -> blocks -> text is the identity for anything
//: that was already normalised, and normalises anything that was not.
function docLiveText(blocks) {
  return blocks.filter((b) => b.trim() !== "" || blocks.length === 1).join("\n\n");
}

//: **A live-view block's offsets, in the document's own coordinates.**
//:
//: The live view is the default document view, and each of its paragraphs is
//: its own `.lp-src` textarea — so a selection made there has offsets inside
//: *that block*, which are meaningless to anything holding the document. The
//: chat's selection context (REDESIGN.md §R7.1 item 1) needs the document's,
//: or it reports "line 2" for a paragraph two thirds of the way down.
//:
//: Derived from the block list rather than searched for, because a document
//: with two identical paragraphs would make `indexOf` pick the wrong one. The
//: search is only the fallback, and returning `null` when even that misses is
//: deliberate: the caller says "position unknown" rather than claiming a
//: number it guessed.
function docLiveBlockOffset(box) {
  const source = $("doc-content");
  if (!source || !(box instanceof HTMLTextAreaElement)) return null;
  const index = Number(box.dataset.index);
  if (!Number.isInteger(index)) return null;
  const blocks = docLiveBlocks(source.value);
  const prefix = docLiveText(blocks.slice(0, index));
  const base = prefix ? prefix.length + 2 : 0;
  if (source.value.slice(base, base + box.value.length) === box.value) return base;
  const found = source.value.indexOf(box.value);
  return found === -1 ? null : found;
}

function renderDocLive(keepActive = false) {
  const host = $("doc-live");
  if (!host || docView !== "live") return;
  const blocks = docLiveBlocks($("doc-content").value);
  if (!keepActive) docLiveActive = -1;
  host.replaceChildren();

  // An empty document still needs somewhere to click. Without this the pane
  // is a blank div with no blocks, and there is nothing to put a caret in —
  // which reads as the mode being broken rather than the document being new.
  if (!blocks.length) blocks.push("");

  blocks.forEach((source, index) => {
    if (index === docLiveActive) {
      host.appendChild(docLiveEditor(source, index));
      return;
    }
    const block = document.createElement("div");
    block.className = "lp-block";
    block.dataset.index = String(index);
    if (source.trim()) {
      renderMarkdown(block, source);
      layerDocWikiLinks(block);
    } else {
      // A genuinely empty block still needs height, or it cannot be clicked
      // into and the document appears to have lost a paragraph.
      block.classList.add("lp-block-empty");
      block.textContent = "";
    }
    host.appendChild(docLiveRow(block, index, blocks.length));
  });
}

//: **The block handle — Notion's, in this app's own furniture.**
//:
//: Asked for with the editor remake: *"do the documents remake for obsidian,
//: notion, kortex etc."* The live view already had the Obsidian half (edit the
//: markdown of the paragraph you clicked, everything else stays rendered).
//: What it had none of is the Notion half: a document is a *list of blocks*,
//: and the thing you constantly want is to move one, copy one or delete one
//: without selecting its text by hand and cutting it.
//:
//: The gutter is only visible on hover or focus, because a handle beside every
//: paragraph all the time turns a page of prose into a form. Keyboard users
//: get it through the ⋯ menu, which is a real button in the tab order — a
//: drag-only affordance would put block reordering out of reach entirely.
function docLiveRow(block, index, total) {
  const row = document.createElement("div");
  row.className = "lp-row";
  row.dataset.index = String(index);

  const gutter = document.createElement("div");
  gutter.className = "lp-gutter";

  const grip = document.createElement("button");
  grip.type = "button";
  grip.className = "ghost small icon-only lp-grip";
  setLabel(grip, "ph:dots-six-vertical");
  grip.title = "Drag to move this block";
  grip.setAttribute("aria-label", `Move block ${index + 1}`);
  //: The *handle* is draggable, not the block: a draggable block would
  //: hijack ordinary text selection inside it, which is the first thing
  //: anyone does in a paragraph.
  grip.draggable = true;
  grip.addEventListener("dragstart", (event) => {
    docLiveDragFrom = index;
    event.dataTransfer.effectAllowed = "move";
    //: Firefox refuses to start a drag with no payload set.
    event.dataTransfer.setData("text/plain", String(index));
    row.classList.add("is-dragging");
  });
  grip.addEventListener("dragend", () => {
    docLiveDragFrom = null;
    for (const el of $("doc-live")?.querySelectorAll(".lp-row") || []) {
      el.classList.remove("is-dragging", "is-drop-before", "is-drop-after");
    }
  });

  const menu = kebabMenu(
    [
      { label: "ph:arrow-up Move up", disabled: index === 0, run: () => docMoveLiveBlock(index, -1) },
      {
        label: "ph:arrow-down Move down",
        disabled: index >= total - 1,
        run: () => docMoveLiveBlock(index, 1),
      },
      { label: "ph:copy Duplicate", run: () => docDuplicateLiveBlock(index) },
      {
        label: "ph:clipboard-text Copy as markdown",
        run: () => copyToClipboard(docLiveBlocks($("doc-content").value)[index] || ""),
      },
      { label: "ph:plus Insert a block below", run: () => docInsertLiveBlock(index) },
      { label: "ph:trash Delete this block", danger: true, run: () => docDeleteLiveBlock(index) },
    ],
    `Actions for block ${index + 1}`
  );
  menu.classList.add("lp-block-menu");
  gutter.append(grip, menu);

  //: The drop target is the whole row, so a block can be dropped anywhere
  //: along its height rather than only on its own handle. Above or below is
  //: decided by which half of the row the pointer is in — the same rule every
  //: list-reordering UI uses, and the reason the marker has two classes.
  row.addEventListener("dragover", (event) => {
    if (docLiveDragFrom === null || docLiveDragFrom === index) return;
    event.preventDefault();
    const box = row.getBoundingClientRect();
    const after = event.clientY > box.top + box.height / 2;
    row.classList.toggle("is-drop-before", !after);
    row.classList.toggle("is-drop-after", after);
  });
  row.addEventListener("dragleave", () => {
    row.classList.remove("is-drop-before", "is-drop-after");
  });
  row.addEventListener("drop", (event) => {
    if (docLiveDragFrom === null) return;
    event.preventDefault();
    const box = row.getBoundingClientRect();
    const after = event.clientY > box.top + box.height / 2;
    docMoveLiveBlockTo(docLiveDragFrom, after ? index + 1 : index);
    docLiveDragFrom = null;
  });

  row.append(gutter, block);
  return row;
}

//: Which block is being dragged, or null. Module-level because the drag starts
//: on one row's handle and ends on another row entirely.
let docLiveDragFrom = null;

//: Every block edit is the same three steps — read the blocks, change the
//: list, write the document back — so they share one helper. Writing
//: `doc-content` is what makes autosave, the outline, the word count and the
//: source view all agree: it is the single source of truth this editor was
//: built around (see `renderDocLive`).
function docEditLiveBlocks(change) {
  const source = $("doc-content");
  if (!source) return;
  const blocks = docLiveBlocks(source.value);
  if (!blocks.length) blocks.push("");
  const next = change(blocks);
  if (!next) return;
  source.value = docLiveText(next);
  markDocDirty();
  docLiveActive = -1;
  renderDocLive();
}

function docMoveLiveBlock(index, delta) {
  docEditLiveBlocks((blocks) => {
    const target = index + delta;
    if (target < 0 || target >= blocks.length) return null;
    const [moved] = blocks.splice(index, 1);
    blocks.splice(target, 0, moved);
    return blocks;
  });
}

//: The drop-target version: `to` is a *gap* index, so dropping below the last
//: block is `blocks.length`. Removing first shifts every later gap down by
//: one, which is the off-by-one every drag-reorder implementation meets.
function docMoveLiveBlockTo(from, to) {
  docEditLiveBlocks((blocks) => {
    if (from < 0 || from >= blocks.length) return null;
    const [moved] = blocks.splice(from, 1);
    blocks.splice(to > from ? to - 1 : to, 0, moved);
    return blocks;
  });
}

function docDuplicateLiveBlock(index) {
  docEditLiveBlocks((blocks) => {
    blocks.splice(index + 1, 0, blocks[index] ?? "");
    return blocks;
  });
}

function docInsertLiveBlock(index) {
  docEditLiveBlocks((blocks) => {
    blocks.splice(index + 1, 0, "");
    return blocks;
  });
  //: Straight into the new block: an inserted empty paragraph you then have to
  //: find and click is not an insert, it is a blank line.
  focusDocLiveBlock(index + 1, "end");
}

function docDeleteLiveBlock(index) {
  const blocks = docLiveBlocks($("doc-content")?.value || "");
  const removed = blocks[index] ?? "";
  docEditLiveBlocks((list) => {
    list.splice(index, 1);
    return list.length ? list : [""];
  });
  //: Undoable, through the app's own stack rather than a toast that times
  //: out — deleting the wrong paragraph of a long document is exactly the
  //: mistake that needs to still be reversible a minute later.
  if (typeof pushUndo === "function") {
    pushUndo(
      "Delete a block",
      () =>
        docEditLiveBlocks((list) => {
          list.splice(index, 0, removed);
          return list;
        }),
      () =>
        docEditLiveBlocks((list) => {
          list.splice(index, 1);
          return list.length ? list : [""];
        })
    );
  }
}

function docLiveEditor(source, index) {
  const box = document.createElement("textarea");
  box.className = "lp-src";
  box.value = source;
  box.dataset.index = String(index);
  //: **An id, because the formatting actions address a box by id.**
  //: `applyMarkdown(kind, boxId)` and everything under it does `$(boxId)`, so
  //: a textarea without one is a silent no-op — the selection bar would draw
  //: its eight buttons over a live-view paragraph and none of them would do
  //: anything. That is this repo's "a policy silently refusing the work"
  //: shape, and it costs nothing to avoid: one live view exists at a time and
  //: the index is unique within it.
  box.id = `doc-live-block-${index}`;
  box.spellcheck = true;
  box.setAttribute("aria-label", "Editing this paragraph's markdown");

  const autosize = () => {
    // Height from content, because a fixed-height box in a flowing document
    // either clips a long paragraph or leaves a hole after a short one.
    box.style.height = "auto";
    box.style.height = `${box.scrollHeight}px`;
  };

  box.addEventListener("input", () => {
    autosize();
    const blocks = docLiveBlocks($("doc-content").value);
    if (!blocks.length) blocks.push("");
    // A blank line typed inside the block is the user starting a new
    // paragraph. Splicing the *split* of what they typed keeps that working
    // without a special case for "did they press Enter twice".
    const replacement = docLiveBlocks(box.value);
    blocks.splice(index, 1, ...(replacement.length ? replacement : [""]));
    $("doc-content").value = docLiveText(blocks);
    markDocDirty();
    // Deliberately NOT re-rendering here. Re-rendering on every keystroke
    // would replace the textarea the caret is in, and the caret would go
    // with it — the block re-renders when you leave it, which is what makes
    // this feel like an editor rather than a form that fights you.
    if (replacement.length > 1) {
      // Except when the block genuinely became several: the extra paragraphs
      // have to appear, and the caret belongs in the last of them.
      docLiveActive = index + replacement.length - 1;
      renderDocLive(true);
      const next = $("doc-live").querySelector(".lp-src");
      if (next) {
        next.focus();
        next.setSelectionRange(next.value.length, next.value.length);
      }
    }
  });

  box.addEventListener("blur", () => {
    // Leaving the block renders it. Guarded on still being the active one:
    // a blur caused by clicking straight into another block already moved
    // `docLiveActive` on, and re-rendering for the old one would undo that.
    if (docLiveActive !== index) return;
    docLiveActive = -1;
    renderDocLive();
  });

  box.addEventListener("keydown", (event) => {
    // Escape leaves the block without moving the caret anywhere surprising —
    // the same "a mode you can only leave by finding the button is a trap"
    // rule the graph's trace mode follows.
    if (event.key === "Escape") {
      event.preventDefault();
      box.blur();
      return;
    }
    const atStart = box.selectionStart === 0 && box.selectionEnd === 0;
    const atEnd =
      box.selectionStart === box.value.length && box.selectionEnd === box.value.length;
    if ((event.key === "ArrowUp" && atStart) || (event.key === "ArrowDown" && atEnd)) {
      // Walking out of the top or bottom of a block moves to the next one,
      // the way it would in one continuous document. Only from the very edge,
      // so arrowing *within* a multi-line block still works normally.
      const step = event.key === "ArrowUp" ? -1 : 1;
      const total = docLiveBlocks($("doc-content").value).length;
      const target = index + step;
      if (target >= 0 && target < total) {
        event.preventDefault();
        focusDocLiveBlock(target, step > 0 ? "start" : "end");
      }
    }
  });

  // Attached, then sized: scrollHeight is 0 on a detached element, so
  // autosizing before the append leaves every block one row tall.
  queueMicrotask(() => {
    autosize();
    box.focus();
  });
  return box;
}

//: **Where the caret lands when you click a rendered block.**
//:
//: The rendered text and the markdown behind it are different strings — the
//: syntax has been consumed by the renderer — so "the 12th character you can
//: see" is not "the 12th character of the source". This walks the source and
//: counts only the characters that survive rendering, skipping the markers
//: that do not, and returns the source offset for a given *visible* offset.
//:
//: Deliberately approximate. It is exact for prose and for the marks people
//: actually click into mid-sentence (emphasis, code, highlight, a heading's
//: `#`), and it degrades to "somewhere close, in the right paragraph" for the
//: rest — which is the whole gain over the previous behaviour, where every
//: click landed at the end of the block regardless of where you aimed.
function docLiveSourceOffset(source, visibleTarget) {
  if (visibleTarget <= 0) return 0;
  let visible = 0;
  let i = 0;
  let atLineStart = true;
  while (i < source.length && visible < visibleTarget) {
    const rest = source.slice(i);
    //: Line-leading syntax: heading hashes, quote markers, list bullets.
    if (atLineStart) {
      const lead = /^(\s*(?:#{1,6}\s+|>\s?|[-*+]\s+|\d+\.\s+|- \[[ xX]\]\s+))/.exec(rest);
      if (lead) {
        i += lead[1].length;
        atLineStart = false;
        continue;
      }
    }
    //: Inline markers, longest first so `**` is not read as two `*`.
    const marker = /^(\*\*|__|~~|==|\[\[|\]\]|`|\*|_)/.exec(rest);
    if (marker) {
      i += marker[1].length;
      continue;
    }
    //: A link's target is not visible; its text is.
    const link = /^\[([^\]]*)\]\([^)]*\)/.exec(rest);
    if (link) {
      const inner = Math.min(link[1].length, visibleTarget - visible);
      if (inner < link[1].length) return i + 1 + inner;
      visible += link[1].length;
      i += link[0].length;
      continue;
    }
    atLineStart = source[i] === "\n";
    visible += 1;
    i += 1;
  }
  return i;
}

//: How many rendered characters sit before the caret inside this block —
//: `caretRangeFromPoint` gives the node and offset under the pointer, and
//: everything before it in the block is what the reader has already passed.
function docLiveVisibleOffset(block, x, y) {
  const range = document.caretRangeFromPoint?.(x, y);
  if (!range || !block.contains(range.startContainer)) return null;
  const upto = document.createRange();
  upto.selectNodeContents(block);
  upto.setEnd(range.startContainer, range.startOffset);
  return upto.toString().length;
}

function focusDocLiveBlock(index, caret = "end") {
  docLiveActive = index;
  renderDocLive(true);
  const box = $("doc-live").querySelector(".lp-src");
  if (!box) return;
  const position =
    caret === "start"
      ? 0
      : typeof caret === "number"
        ? Math.min(Math.max(caret, 0), box.value.length)
        : box.value.length;
  box.focus();
  box.setSelectionRange(position, position);
}

function wireDocLive() {
  const host = $("doc-live");
  if (!host) return;
  // Delegated, because the blocks are replaced on every render and per-block
  // listeners would have to be re-bound each time — which is the shape that
  // silently accumulates duplicates (see tests/test_frontend_handlers.py).
  host.addEventListener("mousedown", (event) => {
    // A link in a rendered block is a link. Clicking `[[Another doc]]` should
    // open it, not put a caret next to it — that is the whole reason to
    // render at all.
    if (event.target.closest("a, button, input")) return;
    const block = event.target.closest(".lp-block");
    if (!block) return;
    // preventDefault stops the browser placing a selection in the block we
    // are about to replace, which otherwise steals focus back from the
    // textarea a moment later.
    //
    // Measured *before* the block is replaced, because the rendered nodes the
    // click landed in are about to be thrown away: the caret went to the end
    // of the block on every click, wherever you aimed, which is the one thing
    // that makes a live-preview editor feel like a form rather than a page.
    const visible = docLiveVisibleOffset(block, event.clientX, event.clientY);
    event.preventDefault();
    const index = Number(block.dataset.index);
    const source = docLiveBlocks($("doc-content").value)[index] ?? "";
    focusDocLiveBlock(
      index,
      visible === null ? "end" : docLiveSourceOffset(source, visible),
    );
  });
}

// --- keeping the two panes looking at the same place --------------------------
//
// Side by side is only half of a split view. Without this, scrolling the
// editor leaves the preview showing paragraph one, so the rendered half is
// useful for the first screen of a document and decorative after that — which
// is most of what "the panes get squished together and it feels annoying to
// use" is about once they are actually side by side.
//
// Proportional rather than line-mapped, deliberately. Mapping source lines to
// rendered blocks needs the markdown renderer to emit source positions, which
// this one does not, and the approximations that get used instead (count the
// headings, guess) drift worse the longer the document. Scroll fraction is
// exact at both ends, close everywhere in between for prose, and — the part
// that matters — never wrong in a way that looks like a bug.

//: Which pane the user is actually scrolling. Without this the two feed each
//: other: A scrolls B, B's scroll event scrolls A, and the pair juddate to a
//: stop somewhere neither of them was asked to go.
let docScrollDriver = null;

function syncDocScroll(from) {
  const editor = $("doc-content");
  const preview = $("doc-preview");
  if (!editor || !preview || preview.classList.contains("hidden")) return;
  const to = from === editor ? preview : editor;
  // A pane with nothing to scroll has a zero range; dividing by it gives NaN,
  // and assigning NaN to scrollTop silently jumps the other pane to 0.
  const fromRange = from.scrollHeight - from.clientHeight;
  const toRange = to.scrollHeight - to.clientHeight;
  if (fromRange <= 0 || toRange <= 0) return;
  docScrollDriver = from;
  to.scrollTop = (from.scrollTop / fromRange) * toRange;
  // Cleared on a timer rather than immediately: the assignment above fires the
  // other pane's own scroll event asynchronously, so clearing on this tick
  // lets that event through and starts the feedback loop this exists to stop.
  clearTimeout(syncDocScroll._release);
  syncDocScroll._release = setTimeout(() => { docScrollDriver = null; }, 120);
}

function wireDocScrollSync() {
  for (const el of [$("doc-content"), $("doc-preview")]) {
    if (!el) continue;
    el.addEventListener("scroll", () => {
      if (docScrollDriver && docScrollDriver !== el) return;
      syncDocScroll(el);
    });
  }
}

// Markdown formatting from a toolbar, so you don't have to remember the
// syntax. Everything it inserts is plain markdown — the file stays portable
// and the source stays readable, which is the point of using markdown at all.
const MD_ACTIONS = {
  h1: { line: "# " },
  h2: { line: "## " },
  h3: { line: "### " },
  bold: { wrap: "**", placeholder: "bold text" },
  italic: { wrap: "*", placeholder: "italic text" },
  strike: { wrap: "~~", placeholder: "struck through" },
  code: { wrap: "`", placeholder: "code" },
  highlight: { wrap: "==", placeholder: "highlighted" },
  clearformat: { custom: "clearformat" },
  ul: { line: "- " },
  ol: { line: "1. " },
  task: { line: "- [ ] " },
  quote: { line: "> " },
  link: { custom: "link" },
  codeblock: { block: "```\n", suffix: "\n```", placeholder: "your code" },
  table: {
    insert: "\n| Column | Column |\n| --- | --- |\n| | |\n",
  },
  hr: { insert: "\n---\n" },

  //: **The rest of the Obsidian editing-toolbar's command set**, asked for by
  //: name: *"I want you to make the toolbar in the notes and documents
  //: exactly like this but also with the application specific functions, both
  //: in what tools are there, and how they function"* — PKM-er's
  //: obsidian-editing-toolbar.
  //:
  //: Added to this table rather than to a second one, because this table is
  //: already the single place that decides what `**` means in this app (see
  //: its own comment, and editor.js's "/" menu, which reads the same
  //: dialect). A command that lives anywhere else is a third opinion waiting
  //: to disagree.
  h4: { line: "#### " },
  h5: { line: "##### " },
  h6: { line: "###### " },
  //: A callout, not a bare blockquote. `> [!note]` is the syntax Obsidian,
  //: GitHub and Typora all already render, which is the same portability
  //: argument editor.js makes for using it in the "/" menu.
  callout: { block: "> [!note] ", suffix: "\n> ", placeholder: "Title" },
  //: Asymmetric wrappers: HTML, because markdown has no superscript and
  //: Obsidian's own toolbar inserts exactly these tags.
  sup: { pre: "<sup>", post: "</sup>", placeholder: "sup" },
  sub: { pre: "<sub>", post: "</sub>", placeholder: "sub" },
  underline: { pre: "<u>", post: "</u>", placeholder: "underlined" },
  //: `%%…%%` is Obsidian's comment: kept in the file, never rendered.
  comment: { pre: "%%", post: "%%", placeholder: "note to self" },
  image: { custom: "image" },
  //: This app's own link syntax, which is the "application specific
  //: functions" half of the request — a toolbar for *this* notebook has to
  //: offer the link that resolves inside it, not only the markdown one.
  wikilink: { pre: "[[", post: "]]", placeholder: "note name" },
  footnote: { custom: "footnote" },
  indent: { custom: "indent" },
  outdent: { custom: "outdent" },
  undo: { custom: "undo" },
  redo: { custom: "redo" },
};

// `boxId` is what lets the Notes composer reuse this whole table. It used to
// be hardcoded to the document editor, and duplicating the logic for notes
// would have been the third place in this app to independently decide what
// `**` means — see MD_ACTIONS' own comment and editor.js's "/" menu, which
// are already deliberately kept to one dialect.
function applyMarkdown(kind, boxId = "doc-content") {
  const action = MD_ACTIONS[kind];
  const box = $(boxId);
  if (!action || !box) return;
  const { selectionStart: start, selectionEnd: end, value } = box;
  const selected = value.slice(start, end);

  if (action.wrap) {
    wrapDocSelection(action.wrap, action.placeholder, boxId);
    return;
  }
  if (action.custom === "clearformat") {
    clearInlineFormatting(box);
    finishMarkdownEdit(box, boxId);
    return;
  }
  //: **Undo and redo go through the browser's own history, deliberately.**
  //: A textarea already has one, built from the user's typing *and* from
  //: `execCommand("insertText")`, and reimplementing it here would give the
  //: editor a second history that disagrees with Ctrl+Z — the one thing a
  //: user is certain about in any text box.
  if (action.custom === "undo" || action.custom === "redo") {
    box.focus();
    document.execCommand(action.custom);
    finishMarkdownEdit(box, boxId);
    return;
  }
  if (action.custom === "indent" || action.custom === "outdent") {
    shiftDocIndent(box, action.custom === "indent" ? 1 : -1);
    finishMarkdownEdit(box, boxId);
    return;
  }
  if (action.custom === "image") {
    //: The selection becomes the *alt text* and the caret lands on the URL,
    //: which is the part still to be typed — the same split `link` above
    //: makes. The first version passed the alt text as the body between the
    //: two markers and produced `![cat](cat)`: a picture whose address was
    //: its own caption. Caught by running it rather than by reading it.
    const alt = selected || "image";
    const url = "https://";
    box.value = `${value.slice(0, start)}![${alt}](${url})${value.slice(end)}`;
    const at = start + alt.length + 4;
    box.setSelectionRange(at, at + url.length);
    finishMarkdownEdit(box, boxId);
    return;
  }
  if (action.custom === "footnote") {
    //: A reference *and* its definition, because a footnote marker with
    //: nothing to point at renders as literal text and reads as a bug.
    const marker = `[^${docNextFootnote(value)}]`;
    box.value = `${value.slice(0, start)}${marker}${value.slice(end)}\n\n${marker}: `;
    const at = box.value.length;
    box.setSelectionRange(at, at);
    finishMarkdownEdit(box, boxId);
    return;
  }
  if (action.pre) {
    const body = selected || action.placeholder || "";
    insertAround(box, start, end, action.pre, action.post || "", body, action.pre.length);
    finishMarkdownEdit(box, boxId);
    return;
  }
  if (action.line) {
    // Prefix every selected line, or the current one when nothing is selected.
    const lineStart = value.lastIndexOf("\n", start - 1) + 1;
    const lineEnd = end + (value.slice(end).indexOf("\n") === -1 ? 0 : value.slice(end).indexOf("\n"));
    const target = value.slice(lineStart, Math.max(lineEnd, end)) || "";
    const prefixed = target
      .split("\n")
      .map((line) => (line.startsWith(action.line) ? line : action.line + line))
      .join("\n");
    box.value = value.slice(0, lineStart) + prefixed + value.slice(Math.max(lineEnd, end));
    box.setSelectionRange(lineStart, lineStart + prefixed.length);
  } else if (action.custom === "link") {
    const label = selected || "link text";
    const inserted = `[${label}](https://)`;
    box.value = value.slice(0, start) + inserted + value.slice(end);
    // Land the caret in the URL, which is the part you still have to type.
    const at = start + label.length + 3;
    box.setSelectionRange(at, at + 8);
  } else if (action.block) {
    const body = selected || action.placeholder;
    const inserted = action.block + body + action.suffix;
    box.value = value.slice(0, start) + inserted + value.slice(end);
    const at = start + action.block.length;
    box.setSelectionRange(at, at + body.length);
  } else if (action.insert) {
    box.value = value.slice(0, start) + action.insert + value.slice(end);
    const at = start + action.insert.length;
    box.setSelectionRange(at, at);
  }
  finishMarkdownEdit(box, boxId);
}

//: Wrap a selection in two different markers, leaving the body selected so
//: the next keystroke replaces a placeholder. `wrapDocSelection` above is the
//: symmetric case and carries the toggle-off logic that only makes sense when
//: both ends are the same string.
function insertAround(box, start, end, pre, post, body, caretOffset) {
  const value = box.value;
  box.value = value.slice(0, start) + pre + body + post + value.slice(end);
  const at = start + caretOffset;
  box.setSelectionRange(at, at + body.length);
}

//: Two spaces per level, matching what this app's own markdown renderer and
//: every list in it already use. Whole lines, so a selection spanning three
//: bullets indents all three — the behaviour Tab has in Obsidian's editor.
function shiftDocIndent(box, direction) {
  const { selectionStart: start, selectionEnd: end, value } = box;
  const lineStart = value.lastIndexOf("\n", start - 1) + 1;
  const tail = value.slice(end).indexOf("\n");
  const lineEnd = tail === -1 ? value.length : end + tail;
  const block = value.slice(lineStart, lineEnd);
  const shifted = block
    .split("\n")
    .map((line) =>
      direction > 0 ? `  ${line}` : line.replace(/^ {1,2}/, ""),
    )
    .join("\n");
  box.value = value.slice(0, lineStart) + shifted + value.slice(lineEnd);
  box.setSelectionRange(lineStart, lineStart + shifted.length);
}

//: The next free footnote number in this document. Counting the definitions
//: rather than the references: a reference can appear twice and share one
//: definition, which is what a footnote is for.
function docNextFootnote(text) {
  const used = [...String(text || "").matchAll(/^\[\^(\d+)\]:/gm)].map((m) => Number(m[1]));
  return used.length ? Math.max(...used) + 1 : 1;
}

// The bookkeeping every toolbar edit ends with. The document editor has a
// dirty flag and a live preview to refresh; the notes composer has neither,
// but everything downstream of typing there (autogrow, the character count,
// draft autosave) listens for `input`, which a programmatic value change does
// not fire on its own.
function finishMarkdownEdit(box, boxId) {
  box.focus();
  if (boxId === "doc-content") {
    markDocDirty();
    renderDocPreview();
  } else {
    box.dispatchEvent(new Event("input", { bubbles: true }));
  }
}

// Strip a highlight or a text colour from the selection. The counterpart to
// the two colour pickers - asked for directly ("change the colour, or remove
// the highlight"), and without it the only way back out of a colour was to
// hand-delete the markers.
function clearInlineFormatting(box) {
  const { selectionStart: start, selectionEnd: end, value } = box;
  const selected = value.slice(start, end);
  if (!selected) return;
  const cleaned = selected
    .replace(/==(?:[a-z]+\|)?([^=\n]+?)==/g, "$1")
    .replace(/\+\+[a-z]+\|([^+\n]+?)\+\+/g, "$1");
  if (cleaned === selected) return;
  box.value = value.slice(0, start) + cleaned + value.slice(end);
  box.setSelectionRange(start, start + cleaned.length);
}

// Wrap the selection in markdown syntax (Ctrl+B / Ctrl+I).
function wrapDocSelection(marker, placeholder = "", boxId = "doc-content") {
  const box = $(boxId);
  const { selectionStart: start, selectionEnd: end, value } = box;

  // Toggle off, case 1: the selection sits *inside* an existing pair of
  // markers ("**|bold text|**", caret positions marked). Reported directly:
  // applying Bold to an already-bold selection didn't remove it the way
  // every other rich-text editor's toggle does — this was a one-way
  // "apply", never a toggle.
  const before = value.slice(Math.max(0, start - marker.length), start);
  const after = value.slice(end, end + marker.length);
  if (marker && before === marker && after === marker) {
    box.value =
      value.slice(0, start - marker.length) + value.slice(start, end) + value.slice(end + marker.length);
    box.selectionStart = start - marker.length;
    box.selectionEnd = end - marker.length;
    box.focus();
    finishMarkdownEdit(box, boxId);
    return;
  }
  // Toggle off, case 2: the markers themselves are part of the selection
  // ("|**bold text**|") — selecting the whole formatted span, not just its
  // inner text, is just as natural a way to select it for un-formatting.
  if (
    marker &&
    end - start >= marker.length * 2 &&
    value.slice(start, start + marker.length) === marker &&
    value.slice(end - marker.length, end) === marker
  ) {
    const inner = value.slice(start + marker.length, end - marker.length);
    box.value = value.slice(0, start) + inner + value.slice(end);
    box.selectionStart = start;
    box.selectionEnd = start + inner.length;
    box.focus();
    finishMarkdownEdit(box, boxId);
    return;
  }

  // With nothing selected, insert the placeholder and select it, so the next
  // keystroke replaces it — pressing Bold on an empty line should give you
  // somewhere to type, not two markers and a caret between them.
  const selected = value.slice(start, end) || placeholder;
  box.value = value.slice(0, start) + marker + selected + marker + value.slice(end);
  // Keep the same text selected, so the shortcut can be toggled or stacked.
  box.selectionStart = start + marker.length;
  box.selectionEnd = start + marker.length + selected.length;
  box.focus();
  //: **`finishMarkdownEdit`, not `markDocDirty()` + `renderDocPreview()`.**
  //: Both toggle-off branches above already end this way; this branch — the
  //: one that actually *applies* formatting, and so the one that runs almost
  //: every time — did the doc-content half inline instead, which quietly did
  //: the wrong thing for every other box: it marked the *document* dirty and
  //: never told the box's own listeners anything had changed.
  //:
  //: Found when the selection bar started appearing over live-view
  //: paragraphs. Bold visibly wrapped the words in the block and the document
  //: underneath never received them — measured, `input` fired 0 times, and
  //: dispatching one by hand synced it immediately. The same call was wrong
  //: for the note edit box for exactly as long, where it marked a document
  //: dirty that the user was not editing.
  finishMarkdownEdit(box, boxId);
}

async function exportDocumentMarkdown() {
  if (!currentDoc) return;
  // Fetched rather than navigated to. A plain link carries no X-Auth-Token, so
  // the server answers 401 and the browser renders that error *in place of the
  // app* — it navigates away instead of downloading.
  try {
    const response = await fetch(`/documents/${currentDoc.id}/export.md`, {
      headers: { "X-Auth-Token": authToken() },
    });
    if (!response.ok) throw new Error(`Export failed (${response.status})`);
    // The filename is decided server-side, so read it back off the header.
    const disposition = response.headers.get("content-disposition") || "";
    const match = disposition.match(/filename="([^"]+)"/);
    await saveFile(match ? match[1] : "document.md", await response.blob());
  } catch (error) {
    $("doc-status").classList.add("error");
    $("doc-status").textContent = error.message;
  }
}

// PDF via the browser's own print dialog: it renders the preview exactly as
// shown and every platform already has "Save as PDF" there. Bundling a PDF
// engine would add a heavy dependency to produce a worse-looking result.
function exportDocumentPdf() {
  if (!currentDoc) return;
  withDocPreviewShown((restore) => {
    document.body.classList.add("printing-doc");
    const cleanup = () => {
      document.body.classList.remove("printing-doc");
      restore();
      window.removeEventListener("afterprint", cleanup);
    };
    window.addEventListener("afterprint", cleanup);
    setTimeout(() => window.print(), 150);
  });
}

async function deleteCurrentDocument() {
  if (!currentDoc) return;
  if (!(await confirmDialog(`Delete "${currentDoc.title}"? This can't be undone.`))) return;
  await apiJson(`/documents/${currentDoc.id}`, { method: "DELETE" });
  toast("Document deleted.");
  currentDoc = null;
  await loadDocuments();
}

// --- AI editing ---
// Always a proposal. Writing straight into the document would be the most
// destructive thing in the app. Three verbs (reskinned from a single
// rewrite action into a small general assistant, asked for directly):
// "edit" rewrites the target, "write" inserts a new passage without
// touching what's there, "remove" deletes on request. All three go through
// the same /ai-edit endpoint (routes_documents.py) with a `verb` field.
let docAiController = null;

function docAiVerb() {
  return $("doc-ai-panel").querySelector('input[name="doc-ai-verb"]:checked')?.value || "edit";
}

// The run button, the instruction placeholder, and the scope hint all read
// differently per verb — kept in one place so switching verbs updates all
// three together rather than three separate change listeners drifting.
function syncDocAiPanel() {
  const verb = docAiVerb();
  const selection = ($("doc-ai-panel").dataset.selection || "").trim();
  const wordCount = selection ? selection.split(/\s+/).length : 0;

  const runLabel = { edit: "Suggest an edit", write: "Write it", remove: "Remove it" }[verb];
  $("doc-ai-run").innerHTML = `<i class="ph ph-magic-wand ph-lead" aria-hidden="true"></i> ${runLabel}`;

  $("doc-ai-instruction").placeholder =
    verb === "write"
      ? "e.g. “add a conclusion”, “write an intro paragraph”"
      : verb === "remove"
        ? selection
          ? "Optional — leave blank to remove the selection as-is"
          : "e.g. “remove the paragraph about pricing”"
        : "e.g. “tighten this”, “make it more formal”, “add a conclusion”";

  if (verb === "write") {
    $("doc-ai-scope").textContent = selection
      ? `Inserting new text directly after the ${wordCount} selected word(s).`
      : "Inserting new text at the end of the document.";
  } else if (verb === "remove") {
    $("doc-ai-scope").textContent = selection
      ? `Removing the ${wordCount} selected word(s) — or say what to remove from within them.`
      : "Say what to remove from the whole document.";
  } else {
    $("doc-ai-scope").textContent = selection
      ? `Rewriting the ${wordCount} selected word(s).`
      : "Rewriting the whole document. Select some text first to work on just that.";
  }

  const acceptLabel = { edit: "Replace with this", write: "Insert this", remove: "Remove it" }[verb];
  $("doc-ai-accept").textContent = acceptLabel;
}

function openDocAiPanel() {
  if (!currentDoc) return;
  const box = $("doc-content");
  const selection = box.value.slice(box.selectionStart, box.selectionEnd);
  $("doc-ai-panel").dataset.selection = selection;
  // Always opens back on "Edit" — the panel's original, still-default
  // behaviour — rather than remembering whatever verb was last used, so a
  // stray "Remove it" click a moment after opening isn't primed by the
  // previous document's choice.
  const editRadio = $("doc-ai-panel").querySelector('input[name="doc-ai-verb"][value="edit"]');
  if (editRadio) editRadio.checked = true;
  $("doc-ai-result").value = "";
  $("doc-ai-status").textContent = "";
  syncDocAiPanel();
  $("doc-ai-panel").classList.remove("hidden");
  $("doc-ai-instruction").focus();
}

function closeDocAiPanel() {
  $("doc-ai-panel").classList.add("hidden");
}

// Extract notes (BACKLOG.md §62): the same selection-or-whole-document scope
// AI edit above already uses — select a passage first to extract from just
// that, or leave nothing selected to extract from the whole document.
function openDocExtractPreview() {
  if (!currentDoc) return;
  const box = $("doc-content");
  const selection = box.value.slice(box.selectionStart, box.selectionEnd).trim();
  openExtractPreview(selection || box.value, { sourceDocumentId: currentDoc.id });
}

async function runDocAiEdit() {
  const verb = docAiVerb();
  const instruction = $("doc-ai-instruction").value.trim();
  const selection = $("doc-ai-panel").dataset.selection || "";
  const status = $("doc-ai-status");
  // Mirrors routes_documents.ai_edit's own validation exactly, so a bad
  // request never reaches the network at all: "write" always needs words,
  // "remove" can skip them only when a selection already says what to
  // remove, "edit" is the original required-instruction behaviour.
  if (verb === "write" && !instruction) {
    status.classList.add("error");
    status.textContent = "Say what to write.";
    return;
  }
  if (verb === "remove" && !instruction && !selection.trim()) {
    status.classList.add("error");
    status.textContent = "Say what to remove, or select it first.";
    return;
  }
  if (verb === "edit" && !instruction) {
    status.classList.add("error");
    status.textContent = "Say what you'd like changed.";
    return;
  }
  status.classList.remove("error");
  setLabel(status, "ph:magic-wand Thinking…");
  docAiController = new AbortController();
  $("doc-ai-run").classList.add("hidden");
  $("doc-ai-cancel-run").classList.remove("hidden");
  try {
    const body = await apiJson(`/documents/${currentDoc.id}/ai-edit`, {
      method: "POST",
      signal: docAiController.signal,
      body: JSON.stringify({ instruction, selection, verb }),
    });
    $("doc-ai-result").value = body.revised;
    status.textContent = body.message || "Read it over, then accept or cancel.";
    if (body.message) status.classList.add("error");
  } catch (error) {
    if (error.name === "AbortError") {
      status.textContent = "Stopped. The document is untouched.";
    } else {
      status.classList.add("error");
      status.textContent = error.message;
    }
  } finally {
    docAiController = null;
    $("doc-ai-run").classList.remove("hidden");
    $("doc-ai-cancel-run").classList.add("hidden");
  }
}

// The undo/redo half of "allow edits made by the AI to be undone or
// altered before and after they are set" (asked for directly) — before
// acceptance, the result textarea above already covers "altered" (edit
// the AI's suggestion, then accept whatever's left). This is "undone...
// after": pushed onto the app's existing global undo stack (an immediate
// Ctrl+Z / status-bar Undo, session-only) alongside a durable per-document
// changelog entry (ai-edit-log, survives reload, lists every edit with its
// own Revert) — see the dialog's own comment in index.html for why both.
function pushDocAiUndo(docId, label, beforeContent, afterContent) {
  const applyContent = async (content) => {
    const title = currentDoc && currentDoc.id === docId ? currentDoc.title : undefined;
    const saved = await apiJson(`/documents/${docId}`, {
      method: "PUT",
      body: JSON.stringify({ content, ...(title !== undefined ? { title } : {}) }),
    });
    if (currentDoc && currentDoc.id === docId) {
      currentDoc = saved;
      $("doc-content").value = content;
      renderDocPreview();
      docDirty = false;
      $("doc-saved").textContent = "Saved";
    }
    docs = docs.map((d) => (d.id === docId ? { ...d, ...saved } : d));
    renderDocList();
  };
  pushUndo(
    label,
    () => applyContent(beforeContent),
    () => applyContent(afterContent)
  );
}

async function recordDocAiEditLog(docId, verb, instruction, selection, beforeContent, afterContent) {
  try {
    await apiJson(`/documents/${docId}/ai-edit-log`, {
      method: "POST",
      body: JSON.stringify({
        verb,
        instruction,
        selection,
        before_content: beforeContent,
        after_content: afterContent,
      }),
      silent: true,
    });
  } catch {
    // Best-effort: the changelog is a record of an edit that has already
    // happened (and is already undoable via the global stack above) — a
    // network hiccup writing the log entry must not read as the edit
    // itself having failed.
  }
}

function acceptDocAiEdit() {
  const revised = $("doc-ai-result").value;
  if (!revised.trim() && docAiVerb() !== "remove") return;
  const verb = docAiVerb();
  const instruction = $("doc-ai-instruction").value.trim();
  const selection = $("doc-ai-panel").dataset.selection || "";
  const box = $("doc-content");
  const beforeContent = box.value;
  const docId = currentDoc.id;

  if (verb === "write") {
    // Inserts rather than replaces — the selection (if any) is only the
    // anchor point, and stays exactly as it was.
    if (selection) {
      const at = box.value.indexOf(selection);
      const insertAt = at === -1 ? box.value.length : at + selection.length;
      const before = box.value.slice(0, insertAt);
      const after = box.value.slice(insertAt);
      const glue = before && !before.endsWith("\n\n") ? (before.endsWith("\n") ? "\n" : "\n\n") : "";
      box.value = before + glue + revised + after;
    } else {
      const glue = box.value && !box.value.endsWith("\n\n") ? (box.value.endsWith("\n") ? "\n" : "\n\n") : "";
      box.value = box.value + glue + revised;
    }
  } else if (selection) {
    // "edit" and "remove" both replace the target with what the model
    // returned — for "remove" that's the same text with the requested
    // part gone, so no separate apply logic is needed.
    const at = box.value.indexOf(selection);
    box.value =
      at === -1
        ? box.value
        : box.value.slice(0, at) + revised + box.value.slice(at + selection.length);
  } else {
    box.value = revised;
  }

  const afterContent = box.value;
  closeDocAiPanel();
  markDocDirty();
  renderDocPreview();
  saveDocument({ silent: true });

  const label = { edit: "AI edit", write: "AI write", remove: "AI remove" }[verb];
  pushDocAiUndo(
    docId,
    instruction ? `${label}: “${instruction.length > 40 ? instruction.slice(0, 39) + "…" : instruction}”` : label,
    beforeContent,
    afterContent
  );
  recordDocAiEditLog(docId, verb, instruction, selection, beforeContent, afterContent);

  toast(
    verb === "write"
      ? "Inserted the AI's text."
      : verb === "remove"
        ? "Removed."
        : "Applied the AI's edit."
  );
}

// --- AI edit history (the changelog) ---------------------------------------

function docAiVerbIcon(verb) {
  return { edit: "ph-pencil-simple", write: "ph-plus-circle", remove: "ph-x-circle", revert: "ph-arrow-counter-clockwise" }[verb] || "ph-pencil-simple";
}

async function openDocAiHistory() {
  if (!currentDoc) return;
  const dialog = $("doc-ai-history-dialog");
  const list = $("doc-ai-history-list");
  const empty = $("doc-ai-history-empty");
  list.replaceChildren();
  empty.classList.add("hidden");
  dialog.showModal();
  const li = document.createElement("li");
  li.className = "muted";
  li.textContent = "Loading…";
  list.appendChild(li);
  try {
    const entries = await apiJson(`/documents/${currentDoc.id}/ai-edit-log`);
    list.replaceChildren();
    if (!entries.length) {
      empty.classList.remove("hidden");
      return;
    }
    for (const entry of entries) {
      const row = document.createElement("li");
      row.className = "doc-ai-history-entry";
      const icon = document.createElement("i");
      icon.className = `ph ${docAiVerbIcon(entry.verb)}`;
      icon.setAttribute("aria-hidden", "true");
      const text = document.createElement("div");
      text.className = "doc-ai-history-text";
      const line = document.createElement("p");
      line.textContent = entry.instruction || (entry.verb === "remove" ? "Removed a selection" : "AI edit");
      const meta = document.createElement("p");
      meta.className = "muted text-sm";
      const when = new Date(entry.created_at).toLocaleString();
      meta.textContent = entry.selection_excerpt
        ? `${when} · “${entry.selection_excerpt}”`
        : when;
      text.append(line, meta);
      const revertBtn = document.createElement("button");
      revertBtn.type = "button";
      revertBtn.className = "ghost small";
      revertBtn.textContent = "Revert";
      revertBtn.addEventListener("click", async () => {
        revertBtn.disabled = true;
        try {
          const saved = await apiJson(
            `/documents/${currentDoc.id}/ai-edit-log/${entry.id}/revert`,
            { method: "POST" }
          );
          if (currentDoc && currentDoc.id === saved.id) {
            currentDoc = saved;
            $("doc-content").value = saved.content;
            $("doc-title").value = saved.title;
            renderDocPreview();
            docDirty = false;
            $("doc-saved").textContent = "Saved";
          }
          docs = docs.map((d) => (d.id === saved.id ? { ...d, ...saved } : d));
          renderDocList();
          toast("Reverted.");
          dialog.close();
        } catch (error) {
          toast(error.message || "Couldn't revert that.", true);
        } finally {
          revertBtn.disabled = false;
        }
      });
      row.append(icon, text, revertBtn);
      list.appendChild(row);
    }
  } catch (error) {
    list.replaceChildren();
    const errLi = document.createElement("li");
    errLi.className = "muted";
    errLi.textContent = error.message || "Couldn't load the history.";
    list.appendChild(errLi);
  }
}

const DOC_SIDEBAR_SECTIONS = ["list", "outline"];
const DOC_SIDEBAR_STORE = "docSidebarSection";

function showDocSidebarSection(name) {
  const wanted = DOC_SIDEBAR_SECTIONS.includes(name) ? name : "list";
  for (const section of DOC_SIDEBAR_SECTIONS) {
    $(`doc-sidebar-${section}`)?.classList.toggle("hidden", section !== wanted);
  }
  for (const button of document.querySelectorAll("#doc-sidebar-tabs button")) {
    const active = button.dataset.section === wanted;
    button.classList.toggle("active", active);
    button.setAttribute("aria-selected", String(active));
    button.tabIndex = active ? 0 : -1;
  }
  localStorage.setItem(DOC_SIDEBAR_STORE, wanted);
}

function initDocSidebarTabs() {
  const strip = $("doc-sidebar-tabs");
  if (!strip || strip.dataset.ready) return;
  strip.dataset.ready = "1";
  strip.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-section]");
    if (button) showDocSidebarSection(button.dataset.section);
  });
  strip.addEventListener("keydown", (event) => {
    const step = { ArrowRight: 1, ArrowLeft: -1 }[event.key];
    if (!step) return;
    event.preventDefault();
    const index = DOC_SIDEBAR_SECTIONS.indexOf(
      localStorage.getItem(DOC_SIDEBAR_STORE) || "list"
    );
    const next =
      DOC_SIDEBAR_SECTIONS[
        (index + step + DOC_SIDEBAR_SECTIONS.length) % DOC_SIDEBAR_SECTIONS.length
      ];
    showDocSidebarSection(next);
    strip.querySelector(`button[data-section="${next}"]`)?.focus();
  });
  showDocSidebarSection(localStorage.getItem(DOC_SIDEBAR_STORE) || "list");
}

// --- documents wiring ---
$("doc-new").addEventListener("click", createDocument);
// Searching and sorting every document lives in the Library now (§36G), with
// the notes, chats and files beside them. This is the way there, said out loud
// — a list that silently stops at eight is a list that has lost your writing.
$("doc-browse-all").addEventListener("click", () => {
  switchTab("library");
  libraryKind = "document";
  renderLibraryOverview();
  renderLibraryFilters();
  renderLibrary();
});
// Used to be an open-by-default <details> in the sidebar; its body was tall
// enough to push the document list down, so it is a dialog now. The Close
// button and Escape both close it — Close via the generic [data-close-dialog]
// delegation set up below, Escape for free from <dialog>.showModal().
$("doc-storage-toggle").addEventListener("click", () => $("doc-storage-dialog").showModal());
$("doc-title").addEventListener("input", () => { markDocDirty(); renderDocPreview(); });
$("doc-content").addEventListener("input", () => {
  markDocDirty();
  renderDocPreview();
  renderDocGutter();
});
// The gutter is a separate element beside the textarea, so it has to be told
// to follow it — a textarea's own scroll does not move its siblings.
$("doc-content").addEventListener("scroll", () => {
  const gutter = $("doc-gutter");
  if (gutter && !gutter.classList.contains("hidden")) gutter.scrollTop = $("doc-content").scrollTop;
});
// The document-textarea resize gap (Priority 0 #1): dragging #doc-content's
// native `resize: vertical` handle shorter pins the textarea's own height,
// but #doc-panes — a flex item of .doc-main with `flex: 1 1 auto` — keeps
// growing to fill the card exactly as before, because nothing about a CSS
// resize tells a flex *parent* to stop growing to fit it. The freed space
// used to be trapped inside #doc-panes, below the now-shorter textarea and
// above .doc-hint — dead space in the middle of the card instead of at its
// bottom, where a person would expect it. There's no CSS-only fix: nothing
// short of a user dragging the handle can tell us the textarea's size is no
// longer meant to track the flex layout, so this is the one place app.js
// answers "did a person just resize this" with a real yes/no rather than a
// CSS rule guessing at it. A mousedown that ends with a different height is
// as close as the DOM gets to "yes" — ordinary typing or a value swap on
// loading a different document never changes offsetHeight.
{
  const box = $("doc-content");
  let heightBeforeDrag = null;
  box.addEventListener("mousedown", () => { heightBeforeDrag = box.offsetHeight; });
  document.addEventListener("mouseup", () => {
    if (heightBeforeDrag === null) return;
    if (box.offsetHeight !== heightBeforeDrag) {
      $("doc-panes").classList.add("doc-panes-manual");
    }
    heightBeforeDrag = null;
  });
}
// Both formatting toolbars, wired the same way. `data-md-target` on the
// toolbar names the textarea it drives, defaulting to the document editor so
// #doc-toolbar keeps working exactly as it did without carrying the
// attribute. The colour <select>s reset themselves after firing: they are
// action menus wearing a select, not a setting with a current value, so
// leaving "green" showing afterwards would claim a state that does not exist.
const MD_COLOURS = ["yellow", "green", "blue", "pink", "purple", "orange", "red", "grey"];

//: **The rest of the Obsidian toolbar, built once and mounted into both
//: editors.** Asked for by name (PKM-er/obsidian-editing-toolbar), for the
//: notes composer *and* the documents editor, "both in what tools are there,
//: and how they function".
//:
//: Rendered from a table rather than written into index.html twice, and that
//: is the whole point: the two toolbars were already hand-written markup that
//: happened to agree, and the note one was the shorter of the two by
//: accident of when it was added. One table means a command added here
//: appears in both, at the same size, in the same group, with the same
//: tooltip — which is the thing that actually stops them drifting.
//:
//: Folded into `<details>` menus, matching the two the document toolbar
//: already has: twenty-five controls do not fit on one row, and that measured
//: fact is recorded in index.html beside the Colour and Insert menus.
const EDITOR_TOOLBAR_MENUS = [
  {
    id: "headings",
    icon: "ph:text-h",
    label: "Heading",
    title: "Headings, from title to smallest",
    items: [
      ["h1", "Heading 1"],
      ["h2", "Heading 2"],
      ["h3", "Heading 3"],
      ["h4", "Heading 4"],
      ["h5", "Heading 5"],
      ["h6", "Heading 6"],
    ],
  },
  {
    id: "blocks",
    icon: "ph:quotes",
    label: "Block",
    title: "Quotes, callouts, code and rules",
    items: [
      ["quote", "Quote"],
      ["callout", "Callout"],
      ["codeblock", "Code block"],
      ["table", "Table"],
      ["hr", "Divider"],
      ["footnote", "Footnote"],
    ],
  },
  {
    id: "inline",
    icon: "ph:text-superscript",
    label: "More",
    title: "Underline, superscript, subscript and comments",
    items: [
      ["underline", "Underline"],
      ["sup", "Superscript"],
      ["sub", "Subscript"],
      ["comment", "Comment (never rendered)"],
    ],
  },
  {
    id: "insert",
    icon: "ph:plus-circle",
    label: "Insert",
    title: "Links, images and notes",
    items: [
      ["wikilink", "Link to a note"],
      ["image", "Image"],
      ["ol", "Numbered list"],
    ],
  },
];

//: The buttons that stay on the row, because they are reached mid-sentence
//: and a menu costs a click every time. Obsidian's own default set makes the
//: same split.
const EDITOR_TOOLBAR_BUTTONS = [
  { md: "outdent", icon: "ph:text-outdent", title: "Outdent" },
  { md: "indent", icon: "ph:text-indent", title: "Indent" },
  { md: "undo", icon: "ph:arrow-counter-clockwise", title: "Undo (Ctrl+Z)" },
  { md: "redo", icon: "ph:arrow-clockwise", title: "Redo (Ctrl+Shift+Z)" },
];

function mountEditorToolbarExtras(bar) {
  //: Idempotent: `initMarkdownToolbars` can run again (the note edit form
  //: builds its own bar per edit), and a second mount would double every
  //: control. Marked on the element rather than tracked in a set, so a bar
  //: that is rebuilt from scratch is correctly treated as new.
  if (bar.dataset.mdExtras === "1") return;
  bar.dataset.mdExtras = "1";
  const sep = () => {
    const el = document.createElement("span");
    el.className = "doc-toolbar-sep";
    el.setAttribute("aria-hidden", "true");
    return el;
  };
  bar.appendChild(sep());
  for (const spec of EDITOR_TOOLBAR_BUTTONS) {
    const button = document.createElement("button");
    button.type = "button";
    button.dataset.md = spec.md;
    button.title = spec.title;
    button.setAttribute("aria-label", spec.title);
    setLabel(button, spec.icon);
    bar.appendChild(button);
  }
  for (const menu of EDITOR_TOOLBAR_MENUS) {
    const details = document.createElement("details");
    details.className = "doc-dock-menu doc-toolbar-menu";
    //: **Drawn exactly like the two menus written in the markup.** These were
    //: built with different classes and an icon *plus a word* — "Heading",
    //: "Block", "More", "Insert" — sitting in a row where every other control
    //: is a glyph. Four labelled chips among twenty icons is what makes a
    //: toolbar read as assembled rather than designed, and it is the same
    //: "two implementations of one control" shape this project keeps paying
    //: for. The name lives in the tooltip and the ARIA label, where the
    //: markup's own menus already keep theirs.
    const summary = document.createElement("summary");
    summary.className = "doc-dock-menu-btn doc-toolbar-menu-btn";
    summary.title = menu.title;
    summary.setAttribute("aria-label", `${menu.label} — ${menu.title}`);
    setLabel(summary, menu.icon);
    const caret = document.createElement("i");
    caret.className = "ph ph-caret-down doc-toolbar-menu-caret";
    caret.setAttribute("aria-hidden", "true");
    summary.appendChild(caret);
    const body = document.createElement("div");
    body.className = "doc-dock-menu-list";
    for (const [md, label] of menu.items) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "doc-dock-menu-item";
      button.dataset.md = md;
      button.textContent = label;
      body.appendChild(button);
    }
    details.append(summary, body);
    bar.appendChild(details);
  }
}

function initMarkdownToolbars() {
  for (const bar of document.querySelectorAll("[data-md-target], #doc-toolbar")) {
    const boxId = bar.dataset.mdTarget || "doc-content";
    mountEditorToolbarExtras(bar);
    for (const button of bar.querySelectorAll("button[data-md]")) {
      // mousedown-preventDefault keeps the caret in the textarea: without it
      // the click moves focus to the button first and the selection the
      // action is about to act on is already gone.
      button.addEventListener("mousedown", (event) => event.preventDefault());
      button.addEventListener("click", () => applyMarkdown(button.dataset.md, boxId));
    }
    for (const select of bar.querySelectorAll("select[data-md-colour]")) {
      const kind = select.dataset.mdColour;
      for (const colour of MD_COLOURS) {
        const option = document.createElement("option");
        option.value = colour;
        option.textContent = colour[0].toUpperCase() + colour.slice(1);
        select.appendChild(option);
      }
      select.addEventListener("change", () => {
        const colour = select.value;
        select.value = "";
        if (!colour) return;
        const box = $(boxId);
        if (!box) return;
        const { selectionStart: start, selectionEnd: end, value } = box;
        const selected = value.slice(start, end) || (kind === "ink" ? "coloured text" : "highlighted");
        // Yellow is the highlight's default, so it needs no colour prefix -
        // and writing one would put `==yellow|x==` in the note where `==x==`
        // says the same thing.
        const open = kind === "ink"
          ? `++${colour}|`
          : colour === "yellow" ? "==" : `==${colour}|`;
        const close = kind === "ink" ? "++" : "==";
        box.value = value.slice(0, start) + open + selected + close + value.slice(end);
        box.setSelectionRange(start + open.length, start + open.length + selected.length);
        finishMarkdownEdit(box, boxId);
      });
    }
  }
}

initMarkdownToolbars();

$("doc-word-goal").addEventListener("click", promptDocWordGoal);
$("doc-word-goal-submit").addEventListener("click", () => {
  if (!currentDoc) return;
  const goal = Math.max(0, Math.round(Number($("doc-word-goal-input").value)) || 0);
  setDocWordGoal(currentDoc.id, goal);
  renderDocStats();
  $("doc-word-goal-dialog").close();
});
for (const button of document.querySelectorAll("#doc-view-seg button")) {
  // The unmodified title is stashed before syncDocFileType ever overwrites it
  // with the "no rendered form" explanation, so switching back to a markdown
  // document restores the real one rather than leaving the disabled text.
  button.dataset.docTitle = button.title;
  button.addEventListener("click", () => setDocView(button.dataset.docView));
}
$("doc-file-type").addEventListener("change", async (event) => {
  if (!currentDoc) return;
  currentDoc = { ...currentDoc, file_type: event.target.value };
  syncDocFileType();
  // Saved immediately rather than left to the autosave: changing the type
  // changes how the editor behaves *now*, and a mode that has visibly
  // switched but not persisted is one reload away from silently reverting.
  await saveDocument({ silent: true });
});
wireDocScrollSync();
wireDocLive();
try {
  //: **Live is the default now.** Asked for: "I want the text editor to be
  //: EXACTLY LIKE OBSIDIAN. the user would bold a wor, click off it, and the
  //: word shows as bolded" — which is what this mode does, and has done for a
  //: while; it was simply not the view anybody landed in, so the editor read
  //: as a plain markdown box with a preview button. Obsidian's own default is
  //: Live Preview for the same reason. A stored choice still wins, so nobody
  //: who picked Source is moved off it.
  setDocView(localStorage.getItem(DOC_VIEW_KEY) || "live");
} catch {
  setDocView("source");
}

//: **The reading measure, opted out of.** Reported: "idk why the document
//: rendered views are so thin??" — measured at 736px inside a 1132px pane,
//: which is the 72ch cap in the CSS doing exactly what it was written to do.
//: A measure is right for reading a finished page and wrong for a wide table,
//: a code-heavy file, or simply wanting the window you have. The cap stays the
//: default; this is the way out of it.
//:
//: The class goes on the tab rather than on each pane so Split's two halves
//: can never disagree, and it is remembered because it is a preference about
//: how you read, not a place you are.
const DOC_WIDTH_KEY = "doc-full-width";

function applyDocWidth(wide) {
  const tab = $("tab-documents");
  const button = $("doc-width-toggle");
  tab?.classList.toggle("doc-wide", wide);
  if (button) {
    button.setAttribute("aria-pressed", String(wide));
    button.title = wide
      ? "Back to a comfortable reading width"
      : "Use the full width of the pane";
    button.setAttribute("aria-label", button.title);
  }
}

function setDocWidth(wide) {
  try {
    localStorage.setItem(DOC_WIDTH_KEY, wide ? "wide" : "measure");
  } catch {
    // A private window can refuse storage; the mode still applies for now.
  }
  applyDocWidth(wide);
}

$("doc-width-toggle")?.addEventListener("click", () =>
  setDocWidth(!$("tab-documents")?.classList.contains("doc-wide"))
);

try {
  applyDocWidth(localStorage.getItem(DOC_WIDTH_KEY) === "wide");
} catch {
  applyDocWidth(false);
}
$("doc-connections").addEventListener("click", () => {
  if (!currentDoc) return;
  // Closes the ⋯ disclosure first: it is a `<details>`, so it stays open
  // behind the dialog otherwise, and it is the same width as the dialog's
  // own left edge.
  $("doc-dock-menu")?.removeAttribute("open");
  openConnections("documents", currentDoc.id, currentDoc.title || "This document");
});
$("doc-export-md").addEventListener("click", exportDocumentMarkdown);
$("doc-export-pdf").addEventListener("click", exportDocumentPdf);
$("doc-delete").addEventListener("click", deleteCurrentDocument);
$("doc-attach-bookmark").addEventListener("click", attachBookmarkToDocument);
$("doc-ai").addEventListener("click", openDocAiPanel);
$("doc-ai-close").addEventListener("click", closeDocAiPanel);
$("doc-ai-cancel").addEventListener("click", closeDocAiPanel);
$("doc-ai-run").addEventListener("click", runDocAiEdit);
$("doc-ai-cancel-run").addEventListener("click", () => docAiController?.abort());
$("doc-ai-accept").addEventListener("click", acceptDocAiEdit);
$("doc-ai-instruction").addEventListener("keydown", (e) => {
  if (e.key === "Enter") { e.preventDefault(); runDocAiEdit(); }
});
for (const radio of document.querySelectorAll('input[name="doc-ai-verb"]')) {
  radio.addEventListener("change", syncDocAiPanel);
}
$("doc-ai-history").addEventListener("click", openDocAiHistory);
$("doc-extract").addEventListener("click", openDocExtractPreview);
$("doc-content").addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !$("doc-find-bar").classList.contains("hidden")) {
    toggleDocFindBar(false);
    return;
  }
  // Tab indents rather than leaving the field. Only in a code document: in a
  // markdown one Tab is how a keyboard user gets *out* of the editor, and
  // trapping it there would make the toolbar unreachable without a mouse.
  // Shift+Tab still escapes even in code, so there is always a way out.
  if (event.key === "Tab" && !docFileType().previewable && !event.shiftKey) {
    event.preventDefault();
    indentDocSelection($("doc-content"), false);
    return;
  }
  if (event.key === "Tab" && event.shiftKey && !docFileType().previewable) {
    const box = $("doc-content");
    // Shift+Tab dedents when there is something to dedent, and otherwise
    // falls through to the browser's own focus-backwards — so a flush-left
    // caret is not a keyboard trap.
    const { text } = docSelectedLines(box);
    if (/^[ \t]/.test(text) || box.selectionEnd > box.selectionStart) {
      event.preventDefault();
      indentDocSelection(box, true);
      return;
    }
  }
  if (!(event.ctrlKey || event.metaKey)) return;
  // Ctrl+/ (and Ctrl+' on the layouts where / needs a modifier of its own).
  if (event.key === "/" || event.key === "?") {
    event.preventDefault();
    toggleDocComment($("doc-content"));
    return;
  }
  const key = event.key.toLowerCase();
  if (key === "s") { event.preventDefault(); saveDocument(); }
  else if (key === "b") { event.preventDefault(); wrapDocSelection("**"); }
  else if (key === "i") { event.preventDefault(); wrapDocSelection("*"); }
  // The browser's own Ctrl+F can't search a textarea's content at all — it
  // only sees page DOM text, and a textarea's text is its *value*, not DOM
  // text — so this isn't overriding useful native behaviour here.
  else if (key === "f") { event.preventDefault(); toggleDocFindBar(true); }
});
$("doc-find-toggle").addEventListener("click", () => toggleDocFindBar());
$("doc-find-close").addEventListener("click", () => toggleDocFindBar(false));
$("doc-find-input").addEventListener("input", () => {
  docFindIndex = -1;
  docFindStep(1);
});
$("doc-find-input").addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    docFindStep(event.shiftKey ? -1 : 1);
  } else if (event.key === "Escape") {
    toggleDocFindBar(false);
  }
});
$("doc-find-next").addEventListener("click", () => docFindStep(1));
$("doc-find-prev").addEventListener("click", () => docFindStep(-1));
$("doc-replace-one").addEventListener("click", docReplaceOne);
$("doc-replace-all").addEventListener("click", docReplaceAll);

// Leaving with unsaved edits would lose them; autosave hasn't fired yet.
window.addEventListener("beforeunload", (event) => {
  if (!docDirty) return;
  event.preventDefault();
  event.returnValue = "";
});

initDocSidebarTabs();
