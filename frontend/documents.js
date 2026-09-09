// documents.js: the document editor (split out of app.js).
//
// Loaded after app.js (see index.html's <script> ordering comment): every
// reference here into app.js globals (docs helpers aside, things like
// switchTab, apiJson, toast, $, promptDialog, setPreference) is a runtime
// call inside a function body, never a parse-time reference, so load order
// only matters for the reverse direction, anything in app.js that calls
// into documents.js (loadDocuments, renderDocStorage, createDocument) does
// so from inside its own functions too, which by the time they run have
// always already had this script loaded (same DOMContentLoaded pass, no
// user interaction possible in between).
//
// initDocSidebarTabs() used to be called from app.js's own top-level wiring
// (right after initNotesSubtabs()). That call site is gone from app.js now
// that the function moved here, this file calls it itself instead, at the
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
// editor should handle code too, line numbers, language detection, Ctrl+/
// commenting, indent and dedent, the type should be changeable, and a new
// document should be creatable "of any filetype though it should default to
// md".
//
// The table comes from `GET /documents/file-types` rather than being written
// out here, and that is not tidiness. Indenting and comment-toggling happen
// inside a keydown handler and cannot wait for a round trip, so the frontend
// genuinely needs the whole table, which means either fetching it or keeping
// a second copy. A second copy is a second thing to update, and the failure
// mode of the two disagreeing is Ctrl+/ inserting the wrong comment marker
// into someone's file. So: fetched once, cached here.

//: [{ext, label, line_comment, block_comment, indent, previewable}], server
//: order preserved: the picker's order is a decision (see filetypes.py) and
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
// picker stayed an empty <select> for the whole session, every option gone,
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
  // offering to show a wall of escaped source, so those two options are
  // disabled rather than hidden (hidden controls that come and go make a
  // toolbar feel unstable), and a document already in one of them is moved
  // back to Source rather than left looking at nothing.
  for (const button of document.querySelectorAll("#doc-view-seg button, #doc-view-menu button")) {
    // The Edit group button is never disabled: setDocView maps it to Source
    // for a file with no rendered form, which is the mode it must reach.
    if (button.dataset.docViewGroup) continue;
    const rendered = button.dataset.docView !== "source";
    button.disabled = rendered && !type.previewable;
    button.title = button.disabled
      ? `A .${type.ext} file has no rendered form, this is for markdown.`
      : button.dataset.docTitle || button.title;
  }
  if (!type.previewable && docView !== "source") setDocView("source");
  //: The engine's own language and wrapping, where it is mounted.
  docCmSyncFileType();

  // The formatting toolbar is markdown syntax. In a .py file every button on
  // it inserts something wrong.
  $("doc-toolbar")?.classList.toggle("hidden", !type.previewable);

  // Line numbers, and the monospace/tab behaviour that goes with them.
  const code = !type.previewable;
  docSurface()?.classList.toggle("doc-content-code", code);
  applyDocGutter();

  // A menu row, so it can say the whole thing rather than "⬇ .py".
  // `setLabel` because `textContent` here would wipe the icon element the
  // markup puts in front of the words.
  setLabel($("doc-export-md"), `ph:download-simple Download as .${type.ext}`);
  $("doc-export-md").title = `Download as a .${type.ext} file`;

  //: **The prose check depends on the type, so a type change has to re-run
  //: it.** `openDocument` gets this through `renderDocTools`; changing the
  //: type of a document already open never did, and that was invisible while
  //: the findings only ever appeared in a panel nobody had open. They are
  //: drawn *on the document* now, so switching a markdown file to `.py` left
  //: squiggles under words in code until this ran: `renderDocProse` empties
  //: the findings for a code file, and the decorations go with them.
  renderDocProse();
}

// The dock's kebab closes when you pick something from it, and when you click
// away: `<details>` gives everything else (open on click and on Enter/Space,
// close on Escape, the ARIA) and neither of those two.
document.getElementById("doc-dock-menu")?.addEventListener("click", (event) => {
  //: Except the switches. Every other row here does one thing and is finished,
  //: so closing is right; a switch has a state, and a menu that shuts on the
  //: click hides the only feedback the switch gives you.
  if (event.target.closest(".doc-dock-menu-check")) return;
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
// the split view", i.e. reading the finished page at full width is its own
// thing, not split-with-one-pane-collapsed.
const DOC_VIEW_KEY = "doc-view-mode";
const DOC_VIEWS = ["source", "live", "split", "rendered"];
let docView = "source";

// The two modes that put #doc-preview on screen. Kept as one predicate because
// every "is the rendered pane showing?" decision below has to agree with every
// other one: the split/rendered pair is exactly the shape that goes wrong when
// each site spells the check out for itself.
function docPreviewShowing(mode = docView) {
  return mode === "split" || mode === "rendered";
}

//: The editing mode the Edit button returns to after Read (DOCUMENTS_PLAN
//: Phase 1 item 2): Live, Source or Split, whichever was last in use.
let lastEditView = "live";

// DOC-SURFACE-BEGIN
// =============================================================================
// The editing surface, behind one adapter (DOCUMENTS_PLAN Phase 2 step 2)
// =============================================================================
//
// For most of this file's life the document *was* a `<textarea>`: forty-odd
// places spelled an edit as `$("doc-content").value.slice(...)` and a caret as
// `.selectionStart`, and that was fine while there was exactly one kind of
// box. Phase 2 puts CodeMirror 6 under the same editor, and a CodeMirror view
// has neither of those properties. The failure mode of getting this wrong is
// the quietest one this codebase has: the textarea stays in the DOM as the
// fallback, so every stale read *works*, it just answers with the text as it
// was before the real editor took over. Autosave then writes the old document
// back over the new one and nothing logs a thing.
//
// So: one adapter, and `tests/test_doc_surface.py` fails the build if a call
// site goes round it. `docSurface()` answers for whatever the document is
// being edited in right now; `textareaSurface(el)` wears the same interface
// over any other box (the note composer, the note edit form, a live-view
// paragraph), which is what lets the formatting toolbar, the "/" menu and the
// completion popup keep one implementation across all of them.
//
// **The interface is the plan's, plus the textarea's own names as aliases,
// and the aliases are deliberate.** `text` / `selection()` / `setSelection` /
// `replaceRange` / `onChange` / `coordsAt` / `focus` / `scrollTop` / `lineAt`
// are what the plan specifies and what new code should use. But the shared
// helpers in this file and in editor.js are written in `value` and
// `selectionStart`, they are correct, they are covered, and rewriting every
// line of them in the same commit that changes what is underneath is exactly
// how a refactor this size loses a case. The aliases mean those helpers
// become surface-agnostic by *receiving a surface instead of an element*,
// with no edit to their bodies: one small reviewable change each rather than
// forty rewritten expressions.

//: The CodeMirror view once it exists, null before the bundle has loaded and
//: null for good if it fails to. Read by `docSurface()` on every call, so the
//: hand-over is one assignment rather than a re-wiring pass.
let docCmView = null;

//: The fallback textarea itself. Named rather than looked up at each site
//: because a few things genuinely are about the *element*: its placeholder,
//: its disabled flag, the `doc-content-code` class and its line-number
//: column. Everything about the document's *text* goes through the surface
//: instead.
function docBoxEl() {
  return $("doc-content");
}

//: The empty-document prompt, kept here because the two engines spell it
//: differently: a textarea has a `placeholder` attribute, CodeMirror has a
//: placeholder extension that is built from this when the view is created.
let docPlaceholderText = "";

function docSetPlaceholder(text) {
  docPlaceholderText = text;
  const el = docBoxEl();
  if (el) el.placeholder = text;
}

//: Surfaces are cached per element so `onChange` cannot stack a second
//: listener and so identity comparisons keep working across calls.
const docSurfaceCache = new WeakMap();

//: A textarea, wearing the surface interface.
function textareaSurface(el) {
  if (!el) return null;
  const cached = docSurfaceCache.get(el);
  if (cached) return cached;
  const surface = {
    el,
    kind: "textarea",
    id: el.id,
    isDocument: el.id === "doc-content",
    scrollEl: el,
    get text() { return el.value; },
    set text(next) { el.value = next; },
    //: The textarea's own names, see the section comment.
    get value() { return el.value; },
    set value(next) { el.value = next; },
    get selectionStart() { return el.selectionStart; },
    set selectionStart(at) { el.selectionStart = at; },
    get selectionEnd() { return el.selectionEnd; },
    set selectionEnd(at) { el.selectionEnd = at; },
    get classList() { return el.classList; },
    get dataset() { return el.dataset; },
    get scrollTop() { return el.scrollTop; },
    set scrollTop(at) { el.scrollTop = at; },
    get scrollLeft() { return el.scrollLeft; },
    set scrollLeft(at) { el.scrollLeft = at; },
    get scrollHeight() { return el.scrollHeight; },
    get clientHeight() { return el.clientHeight; },
    selection() { return { from: el.selectionStart, to: el.selectionEnd }; },
    setSelection(from, to = from) { el.setSelectionRange(from, to); },
    setSelectionRange(from, to) { el.setSelectionRange(from, to); },
    setRangeText(text, from, to, mode) { el.setRangeText(text, from, to, mode); },
    //: Through the browser's own edit pipeline where it can be, so the native
    //: history survives: see `docReplaceRange`'s own comment.
    replaceRange(from, to, text) { docReplaceRange(surface, from, to, text); },
    onChange(fn) { el.addEventListener("input", fn); },
    coordsAt(pos) { return docMirrorPoint(el, pos); },
    lineAt(pos) {
      const text = el.value;
      const at = Math.max(0, Math.min(pos, text.length));
      const from = text.lastIndexOf("\n", at - 1) + 1;
      const found = text.indexOf("\n", at);
      const to = found === -1 ? text.length : found;
      return {
        number: text.slice(0, from).split("\n").length,
        from,
        to,
        text: text.slice(from, to),
      };
    },
    focus() { el.focus(); },
    blur() { el.blur(); },
    rect() { return el.getBoundingClientRect(); },
    getBoundingClientRect() { return el.getBoundingClientRect(); },
    //: A programmatic write fires no `input`, and half this editor hangs off
    //: one. The name is the DOM's so the shared helpers need no edit.
    dispatchEvent(event) { return el.dispatchEvent(event); },
  };
  docSurfaceCache.set(el, surface);
  return surface;
}

//: The same interface over a CodeMirror view. Every write is a transaction,
//: which is what gives the editor one undo history for the whole document
//: instead of one per box: the thing PLAN D3's hand-rolled stack existed to
//: work around.
function cmSurface(view) {
  const cached = docSurfaceCache.get(view);
  if (cached) return cached;
  const setRange = (from, to, insert, select) => {
    const length = view.state.doc.length;
    const start = Math.max(0, Math.min(from, length));
    const end = Math.max(start, Math.min(to, length));
    view.dispatch({
      changes: { from: start, to: end, insert },
      selection: select || undefined,
      scrollIntoView: true,
      annotations: docCmIsolate(),
    });
  };
  const surface = {
    get el() { return view.contentDOM; },
    kind: "codemirror",
    id: "doc-content",
    isDocument: true,
    view,
    get scrollEl() { return view.scrollDOM; },
    get text() { return view.state.doc.toString(); },
    //: **The smallest change that gets there, not "the document is now this
    //: string".** Several callers still hand over a whole rebuilt document
    //: (the live view rewrites it on every keystroke, the AI panel replaces a
    //: passage by slicing). Dispatching that verbatim would make one history
    //: entry per keystroke that replaces the entire file, which costs
    //: proportional to the document on every character *and* makes Ctrl+Z
    //: undo the whole thing. The same prefix/suffix diff the D3 stack used.
    set text(next) {
      const current = view.state.doc.toString();
      if (next === current) return;
      const [from, to, insert] = docUndoDiffRange(current, next);
      view.dispatch({ changes: { from, to, insert }, annotations: docCmIsolate() });
    },
    get value() { return this.text; },
    set value(next) { this.text = next; },
    get selectionStart() { return view.state.selection.main.from; },
    set selectionStart(at) { this.setSelection(at, this.selectionEnd); },
    get selectionEnd() { return view.state.selection.main.to; },
    set selectionEnd(at) { this.setSelection(this.selectionStart, at); },
    get classList() { return view.dom.classList; },
    get dataset() { return view.dom.dataset; },
    get scrollTop() { return view.scrollDOM.scrollTop; },
    set scrollTop(at) { view.scrollDOM.scrollTop = at; },
    get scrollLeft() { return view.scrollDOM.scrollLeft; },
    set scrollLeft(at) { view.scrollDOM.scrollLeft = at; },
    get scrollHeight() { return view.scrollDOM.scrollHeight; },
    get clientHeight() { return view.scrollDOM.clientHeight; },
    selection() {
      const range = view.state.selection.main;
      return { from: range.from, to: range.to };
    },
    setSelection(from, to = from) {
      const max = view.state.doc.length;
      const anchor = Math.max(0, Math.min(from, max));
      const head = Math.max(0, Math.min(to, max));
      view.dispatch({ selection: { anchor, head }, scrollIntoView: true });
    },
    setSelectionRange(from, to) { this.setSelection(from, to); },
    setRangeText(text, from, to, mode) {
      const at = from + text.length;
      const select =
        mode === "select"
          ? { anchor: from, head: at }
          : mode === "preserve"
            ? null
            : { anchor: at, head: at };
      setRange(from, to, text, select);
    },
    replaceRange(from, to, text) { setRange(from, to, text, null); },
    onChange(fn) { docSurfaceChangeHandlers.push(fn); },
    coordsAt(pos) {
      const at = view.coordsAtPos(Math.max(0, Math.min(pos, view.state.doc.length)));
      if (!at) {
        const box = view.dom.getBoundingClientRect();
        return { left: box.left, top: box.top, bottom: box.top + 18, lineHeight: 18 };
      }
      return { left: at.left, top: at.top, bottom: at.bottom, lineHeight: at.bottom - at.top };
    },
    lineAt(pos) {
      const line = view.state.doc.lineAt(Math.max(0, Math.min(pos, view.state.doc.length)));
      return { number: line.number, from: line.from, to: line.to, text: line.text };
    },
    focus() { view.focus(); },
    blur() { view.contentDOM.blur(); },
    rect() { return view.dom.getBoundingClientRect(); },
    getBoundingClientRect() { return view.dom.getBoundingClientRect(); },
    //: CodeMirror raises no `input` event for a scripted change, so the one
    //: pipeline every other box reaches through `input` is called straight
    //: instead. Same effect, and no synthetic event on a contenteditable.
    dispatchEvent() {
      docSurfaceChanged();
      return true;
    },
  };
  docSurfaceCache.set(view, surface);
  return surface;
}

//: Registered through `onChange`; run for a CodeMirror edit by the view's own
//: update listener and for a scripted write by `dispatchEvent` above.
const docSurfaceChangeHandlers = [];

function docSurfaceChanged() {
  for (const fn of docSurfaceChangeHandlers) fn();
}

//: **The document's editing surface, whatever it currently is.** Null only
//: before the markup exists, which is what keeps the `?.` at the call sites
//: honest rather than decorative.
function docSurface() {
  if (docCmView) return cmSurface(docCmView);
  return textareaSurface(docBoxEl());
}

//: The document's text: the single most-read thing in this file.
function docText() {
  return docSurface()?.text ?? "";
}

//: A surface by box id, which is how the formatting toolbar and the "/" menu
//: address whichever editor they were mounted on. `doc-content` resolves to
//: the live surface rather than to the fallback element, so a toolbar press
//: reaches CodeMirror once it is mounted.
function docSurfaceById(id) {
  if (id === "doc-content") return docSurface();
  return textareaSurface($(id));
}

//: Did this event come from inside the CodeMirror view? Asked in a handful of
//: delegated listeners that must not double up with the view's own update
//: listener.
function docEventFromCm(target) {
  return Boolean(docCmView && target instanceof Node && docCmView.dom.contains(target));
}

//: An element, a surface, or nothing, as a surface. Call sites handed an
//: `event.target` need this; ones that already hold a surface pass through.
function asSurface(box) {
  if (!box) return null;
  if (box.kind === "textarea" || box.kind === "codemirror") return box;
  if (docCmView && box instanceof Node && docCmView.dom.contains(box)) return docSurface();
  return box instanceof HTMLTextAreaElement ? textareaSurface(box) : null;
}
// DOC-SURFACE-END

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
    // change view: the choice just does not survive the reload.
  }

  // Where the editor was scrolled to, as a fraction, taken *before* anything is
  // hidden. syncDocScroll can't do this for the "rendered" hand-off: a hidden
  // textarea reports scrollHeight === clientHeight === 0, so its own zero-range
  // guard makes it a no-op and you land back at the top of a long document you
  // were halfway down.
  const editor = docSurface();
  const editorRange = editor ? editor.scrollHeight - editor.clientHeight : 0;
  const editorRatio = editorRange > 0 ? editor.scrollTop / editorRange : null;

  // The editor is on screen in every mode but Read; the preview is shown in
  // the two that include it. Only "split" gets the side-by-side class: in
  // "rendered" the preview is the sole child of a column flexbox and fills it
  // without any help.
  //
  //: **Live and Source are the same element now** (DOCUMENTS_PLAN Phase 2
  //: decision 3). The difference between them is one compartment: the
  //: markdown decorations are on in Live and off in Source. That is why this
  //: no longer hides the editor for Live, and why there is no second pane to
  //: keep in step with the first.
  $("doc-source-wrap").classList.toggle("hidden", docView === "rendered");
  $("doc-preview").classList.toggle("hidden", !docPreviewShowing());
  $("doc-panes").classList.toggle("split", docView === "split");
  $("doc-panes").classList.toggle("reading", docView === "rendered");

  if (docView !== "rendered") lastEditView = docView;
  for (const button of document.querySelectorAll("#doc-view-seg button, #doc-view-menu button")) {
    // Edit is on for every mode that is not Read; the menu items behind
    // it mark the one editing mode in use.
    const on = button.dataset.docViewGroup === "edit" ? docView !== "rendered" : button.dataset.docView === docView;
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
  docSetLiveDecorations(docView === "live");
  //: The engine caches the geometry it lays out with, and a view inside a
  //: `display: none` wrapper measures as zero. Asked for after the panes have
  //: been shown, for the same reason the gutter's metrics are.
  if (!$("doc-source-wrap").classList.contains("hidden")) docCmViewShown();
  //: After the panes have been shown and hidden, never before: the gutter's
  //: height is copied from a textarea that reports zeros while its wrapper is
  //: `display: none`.
  syncDocGutterMetrics();
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
    // the kebab below: a button can't contain another button. Same
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
        // Not destructive, so not grouped with Delete below, same
        // "keep it, but out of the way" action the Notes tab already has
        // for entries (BACKLOG §30b's named remaining scope: chats and
        // documents). Reachable again from the Library's Shelved filter.
        makeMenuItem("ph:archive Archive", "Keep it, but out of the way, not deleted", async () => {
          await apiJson(`/documents/${doc.id}/archive`, { method: "PUT" }).catch((e) =>
            toast(e.message, true)
          );
          if (currentDoc && currentDoc.id === doc.id) currentDoc = null;
          toast("Archived.");
          loadDocuments(currentDoc?.id);
        }),
        makeMenuItem("ph:trash Delete", "Delete this document", async () => {
          if (
            !(await confirmDialog(
              `Delete "${doc.title || "Untitled"}"? You can undo this straight after.`
            ))
          ) {
            return;
          }
          await deleteDocumentWithUndo(doc).catch((e) => toast(e.message, true));
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
    // Same clipping shape as the Library's own Documents-subtab kebab, a
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
  docResetDocument("");
  // Deliberately NOT disabled. Disabling them meant that on a notebook with no
  // documents yet, clicking the editor did nothing and typing did nothing, 
  // a dead end whose only way out was noticing a small "+ New" button. Typing
  // now creates the document, which is what every editor does.
  $("doc-title").disabled = false;
  docBoxEl().disabled = false;
  docSetPlaceholder(
    "Start typing and a new document is created for you.\n\nMarkdown works here, headings, **bold**, lists, tables, links."
  );
  $("doc-saved").textContent = "";
  renderDocPreview();
  renderDocStats();
  renderDocOutline();
}

async function openDocument(id) {
  // Never lose unsaved work by switching away from it.
  if (docDirty) await saveDocument({ silent: true });
  //: **The engine is loaded here, and this is the only place it is.** Awaited
  //: before the text is handed over, so the document goes straight into
  //: CodeMirror rather than into the fallback and then into a view mounted a
  //: moment later, which is how the two would disagree on the very first
  //: paint. Failing is not an error path: `ensureDocEditor` resolves to null
  //: and everything below carries on against the textarea.
  await ensureDocEditor();
  docSetPlaceholder(
    "# Start writing\n\nMarkdown works here, headings, **bold**, lists, tables, links."
  );
  const doc = await apiJson(`/documents/${id}`).catch(() => null);
  if (!doc) return;
  // ROADMAP.md item 13: "opening/closing a document" was the one remaining
  // gap in back/forward nav after chat's own conv:<id> fix. Same shape,
  // recorded here (not at each of openDocument's several call sites) so
  // none of them has to remember to, same reasoning openConversation's own
  // comment gives for doing it there instead of at ITS call sites.
  recordTabVisit("documents", `doc:${doc.id}`);
  currentDoc = doc;
  $("doc-title").disabled = false;
  docBoxEl().disabled = false;
  $("doc-title").value = doc.title;
  docResetDocument(doc.content);
  docDirty = false;
  $("doc-saved").textContent = "Saved";
  // Before the renders below: it decides which of them are even reachable
  // (a code document has no Live or Split) and puts the editor into the
  // right mode first, so nothing paints twice.
  syncDocFileType();
  renderDocPreview();
  renderDocStats();
  //: The status bar and the prose check belong to the document, so they are
  //: repainted with it rather than waiting for the first keystroke.
  renderDocTools();
  renderDocOutline();
  renderDocNotes();
  renderDocBacklinks();
  renderDocBookmarks();
  renderDocList();
}

// The notes this document draws on. Shown beside the outline because both
// answer the same question, what is this document made of.
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
        // Already shown under "Notes it draws on", listing it twice says
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
      // The note keeps existing, only the connection went.
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
    toast("No saved links yet, add one in Library → Links first.");
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

//: **Templates: a starting shape for the five documents people make most.**
//: Plain markdown with two placeholders; the whole feature is these strings,
//: the dialog in index.html and `createDocument(template)` below. Kept as
//: data rather than a server resource because a template is nothing but
//: text, and text that lives in one file is text a fresh session can read.
const DOC_TEMPLATES = [
  {
    id: "blank", title: "Blank", hint: "An empty page.", content: "",
  },
  {
    id: "assignment", title: "Assignment plan", hint: "Brief, criteria, sections, sources, timeline.",
    content: "# {{title}}\n\n**Due:** \n**Unit:** \n**Weight:** \n\n## The brief, in my own words\n\n\n## Marking criteria\n\n- [ ] \n- [ ] \n\n## Outline\n\n1. Introduction, \n2. \n3. \n4. Conclusion, \n\n## Sources\n\n- \n\n## Timeline\n\n| When | What |\n| --- | --- |\n| {{date}} | Plan written |\n|  | Draft |\n|  | Edit and submit |\n",
  },
  {
    id: "lecture", title: "Lecture notes", hint: "Cornell-style: cues, notes, summary.",
    content: "# {{title}}\n\n**Date:** {{date}}\n**Unit / lecturer:** \n\n## Key questions\n\n- \n\n## Notes\n\n\n## Terms\n\n| Term | Meaning |\n| --- | --- |\n|  |  |\n\n## Summary (three sentences)\n\n\n## To follow up\n\n- [ ] \n",
  },
  {
    id: "meeting", title: "Meeting notes", hint: "Attendees, agenda, decisions, actions.",
    content: "# {{title}}\n\n**Date:** {{date}}\n**Attendees:** \n\n## Agenda\n\n1. \n\n## Notes\n\n\n## Decisions\n\n- \n\n## Actions\n\n- [ ] Who, what, by when\n",
  },
  {
    id: "decision", title: "Decision record", hint: "Context, options, decision, consequences.",
    content: "# {{title}}\n\n**Date:** {{date}}\n**Status:** proposed\n\n## Context\n\n\n## Options considered\n\n1. \n2. \n\n## Decision\n\n\n## Consequences\n\n- \n",
  },
  {
    id: "weekly", title: "Weekly review", hint: "What happened, what's next, what to drop.",
    content: "# Week of {{date}}\n\n## Went well\n\n- \n\n## Didn't\n\n- \n\n## Next week\n\n- [ ] \n\n## Stop doing\n\n- \n",
  },
];

function docTemplateFill(template) {
  const date = new Date().toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
  const title = template.id === "blank" ? "Untitled" : template.title;
  return {
    title,
    content: (template.content || "").replaceAll("{{date}}", date).replaceAll("{{title}}", title),
  };
}

async function createDocument(template = null) {
  const body = template ? docTemplateFill(template) : { title: "Untitled", content: "" };
  const doc = await apiJson("/documents", {
    method: "POST",
    body: JSON.stringify(body),
  });
  loadCaptureDocuments(); // so Capture can attach to it straight away
  await loadDocuments(doc.id);
  $("doc-title").focus();
  $("doc-title").select();
}

function openDocTemplateDialog() {
  const dialog = $("doc-template-dialog");
  const list = $("doc-template-list");
  if (!dialog || !list) return;
  list.replaceChildren();
  for (const template of DOC_TEMPLATES) {
    const li = document.createElement("li");
    const button = document.createElement("button");
    button.type = "button";
    button.className = "ghost doc-template-choice";
    button.dataset.template = template.id;
    const name = document.createElement("strong");
    name.textContent = template.title;
    const hint = document.createElement("span");
    hint.className = "muted text-sm";
    hint.textContent = template.hint;
    button.append(name, hint);
    button.addEventListener("click", async () => {
      dialog.close();
      await createDocument(template);
    });
    li.appendChild(button);
    list.appendChild(li);
  }
  dialog.showModal();
  list.querySelector("button")?.focus();
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
    // same name in the title box, otherwise the document you're typing into
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
  // Read off the surface, so they are right even before the save lands: the
  // point of them is live feedback while writing. Scheduled rather than run
  // here, because each is a pass over the whole document, see
  // `scheduleDocFacts`.
  scheduleDocFacts();
  // No document yet? Typing makes one, then this save proceeds normally.
  if (!currentDoc) {
    ensureDocumentExists().then(() => markDocDirty());
    return;
  }
  docDirty = true;
  $("doc-saved").textContent = "Unsaved…";
  clearTimeout(docSaveTimer);
  // Autosave, but not on every keystroke, a pause is the natural moment.
  docSaveTimer = setTimeout(() => saveDocument({ silent: true }), 1200);
}

async function saveDocument({ silent = false } = {}) {
  if (!currentDoc) return;
  clearTimeout(docSaveTimer);
  const title = $("doc-title").value.trim() || "Untitled";
  const content = docText();
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
// between them. The note is deliberately left alone, this is a promotion,
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
    toast(`Started a document from this note, the note itself is untouched.`);
  } catch (error) {
    toast(error.message, true);
  }
}

// Words and reading time. Both are cheap to compute and are the two numbers
// anyone writing long-form actually wants on screen.
const READING_WORDS_PER_MINUTE = 220;

// A target word count, set per document and kept client-side, it's a
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

//: **The goal, and only the goal.** The word count, the reading time and the
//: character count moved to the editor's own status bar (`renderDocStatusBar`)
//: when the top dock was rebuilt, reported as "redesign, rearrange, fix, and
//: update the section with the word count, word goal etc elements". Facts
//: about the text belong beside the text; what is left here is the *target*,
//: which is a thing you set rather than a thing you read, and it is drawn as
//: its own control on the same bar.
//:
//: Kept as a separate function from the status bar's because it is called from
//: four places that mean "the document changed", and because a goal is
//: per-document state while the counts are pure arithmetic over the box.
function renderDocStats() {
  const words = (docText().match(/\S+/g) || []).length;
  const goal = currentDoc ? getDocWordGoal(currentDoc.id) : 0;
  const button = $("doc-word-goal");
  const label = $("doc-goal-label");
  if (!button || !label) return;
  button.setAttribute("aria-pressed", String(goal > 0));
  button.classList.toggle("has-findings", goal > 0 && words >= goal);
  if (!goal) {
    label.textContent = "Set a goal";
    button.title = "Set a word-count goal for this document";
    //: The progress ring is meaningless without a target, so it is not drawn
    //: rather than drawn empty, an empty meter reads as "you have written
    //: nothing", which is a different and usually false claim.
    button.style.removeProperty("--doc-goal-pct");
    button.classList.remove("has-goal");
    return;
  }
  const pct = Math.min(100, Math.round((words / goal) * 100));
  label.textContent = `${words.toLocaleString()} / ${goal.toLocaleString()} · ${pct}%`;
  button.title = `Goal: ${goal.toLocaleString()} words: click to change it`;
  //: A custom property rather than an inline `style` attribute, which this
  //: app's CSP refuses. Same rule the Loose ends meter follows.
  button.style.setProperty("--doc-goal-pct", `${pct}%`);
  button.classList.add("has-goal");
}

function promptDocWordGoal() {
  if (!currentDoc) return;
  const current = getDocWordGoal(currentDoc.id);
  $("doc-word-goal-input").value = current || "";
  $("doc-word-goal-dialog").showModal();
  $("doc-word-goal-input").focus();
}

// --- find and replace (16b: "a bunch of missing features", this is the
// concrete first one; browser Ctrl+F never worked here because a
// textarea's own text isn't part of the searchable page DOM at all, only
// its *value* is) ---------------------------------------------------------
let docFindIndex = -1; // which match the Prev/Next cursor is currently on

function docFindMatches() {
  const term = $("doc-find-input").value;
  if (!term) return [];
  const text = docText();
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
  const box = docSurface();
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
  const box = docSurface();
  const term = $("doc-find-input").value;
  if (!term) return;
  const selected = box.value.slice(box.selectionStart, box.selectionEnd);
  // Only replace what's actually selected and actually a match, Replace
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
  const box = docSurface();
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
  //: **CodeMirror's own search panel, where the engine is mounted**
  //: (DOCUMENTS_PLAN Phase 2 decision 7). It is not a nicer version of the
  //: bar below, it is a different class of thing: it searches the *document*
  //: through the editor's own index, highlights every match at once, knows
  //: about regular expressions and whole-word matching, and replaces through
  //: transactions so one Ctrl+Z undoes a Replace all. The bar below stays for
  //: the fallback textarea, which has none of that and never will.
  //:
  //: One entry point, so Ctrl+F, the toolbar button and Escape all reach
  //: whichever of the two is real without any of them knowing which.
  const CM = window.CM6;
  if (docCmView && CM) {
    const open_ = open ?? !docCmView.dom.querySelector(".cm-search");
    if (open_) CM.search.openSearchPanel(docCmView);
    else CM.search.closeSearchPanel(docCmView);
    $("doc-find-toggle")?.setAttribute("aria-expanded", String(open_));
    if (!open_) docCmView.focus();
    return;
  }
  const bar = $("doc-find-bar");
  const show = open ?? bar.classList.contains("hidden");
  bar.classList.toggle("hidden", !show);
  $("doc-find-toggle").setAttribute("aria-expanded", String(show));
  if (show) {
    $("doc-find-input").focus();
    $("doc-find-input").select();
  } else {
    docFindIndex = -1;
    docSurface().focus();
  }
}

// A table of contents built from the document's own headings. Past a couple
// of screens the scrollbar stops being a way to navigate a document.
function renderDocOutline() {
  const list = $("doc-outline");
  const wrap = $("doc-outline-wrap");
  if (!list || !wrap) return;
  const text = docText();
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

// Put the caret at the start of a line and scroll it into view. Done by
// character offset because that is the one coordinate both surfaces share: a
// textarea has no anchors, and CodeMirror's own `scrollIntoView` is reached
// through `setSelection` below rather than by arithmetic.
function jumpToDocLine(lineIndex) {
  const box = docSurface();
  if (!box) return;
  const lines = box.text.split("\n");
  const offset = lines.slice(0, lineIndex).reduce((n, l) => n + l.length + 1, 0);
  box.focus();
  box.setSelection(offset, offset + (lines[lineIndex] || "").length);
  if (box.kind === "codemirror") return; // the transaction above scrolled it
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

// PLAN.md P4. With the preview open (Split/Rendered) every keystroke used to
// re-parse and re-render the whole document: measured on a 20k-word document
// with scratchpad/ui-sweeps/doctype.js, 44 keystrokes → 44 full renders,
// keydown p50 176ms / p95 272ms, the caret visibly lagged the typing. The
// preview is display, not state, so it can wait for the typing to pause:
// a 120ms trailing debounce, then an idle callback (with a ceiling, so a
// busy tab still repaints within a third of a second). Anything that needs
// the preview *now*, a view switch, a load, still calls renderDocPreview
// directly.
let docPreviewTimer = null;
function scheduleDocPreview() {
  const preview = $("doc-preview");
  if (!preview || preview.classList.contains("hidden")) return;
  clearTimeout(docPreviewTimer);
  docPreviewTimer = setTimeout(() => {
    docPreviewTimer = null;
    if (typeof requestIdleCallback === "function") {
      requestIdleCallback(() => renderDocPreview(), { timeout: 300 });
    } else {
      requestAnimationFrame(() => renderDocPreview());
    }
  }, 120);
}

function renderDocPreview() {
  const preview = $("doc-preview");
  if (preview.classList.contains("hidden")) return;
  preview.replaceChildren();
  const title = ($("doc-title").value || "").trim();
  const body = docText();
  renderMarkdown(preview, title ? `# ${title}\n\n${body}` : body);
  layerDocWikiLinks(preview);
}

// [[Document title]] as clickable links in the preview, the same idea as a
// note's [[wiki link]] (renderNoteText) but resolving against `docs` by
// title instead of by content prefix, documents have real titles. A
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
// the only remaining caller of anything toggle-shaped, the Preview tickbox
// itself became the four-way #doc-view-seg (see setDocView), because with four
// modes a tickbox could not say which one you were in.
//
// It borrows "rendered" rather than "split": what gets printed is the preview
// pane, and at full width it lays out the way the PDF will. If the user is
// already in a mode showing the preview, leave them there, reflowing a pane
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
// is fetched and cached rather than queried, see `loadDocFileTypes`.
//
// Built on the existing textarea rather than on a third-party code editor.
// This app has no build step (`frontend/app.js` is served as-is), so a real
// editor component would mean either a vendored bundle or a CDN, and the
// three behaviours that were actually asked for are a few dozen lines each
// against a textarea. What is genuinely lost by not using one is syntax
// *colouring*, which needs a tokeniser per language; that is a separate
// decision with a real dependency behind it, and pretending otherwise by
// half-highlighting a few keywords would look worse than plain monospace.

//: Every gutter in the document, paired with the textarea it numbers. The
//: documents editor's gutter is the original (`#doc-gutter` beside
//: `#doc-content`); the note capture box and the note edit form get one each
//: from `mountGutterFor`, which records the pairing in `data-for`
//: (UI_MODERNISATION_PLAN Phase 7 item 2: "one toggle, remembered, working
//: for any file type, in all three").
function docGutters() {
  return [...document.querySelectorAll(".doc-gutter")]
    .map((gutter) => ({ gutter, box: gutter.dataset.for ? $(gutter.dataset.for) : docBoxEl() }))
    //: The document's own gutter is the fallback textarea's. Once CodeMirror
    //: is mounted the line numbers are `lineNumbers()` inside the view
    //: (DOCUMENTS_PLAN Phase 2 decision 7) and this column is not drawn at
    //: all, so it drops out of the list rather than numbering a hidden box.
    .filter((pair) => pair.box && !(docCmView && pair.box === docBoxEl()));
}

//: Everything that decides where a *row* sits. The stylesheet carries a static
//: copy of these so the column is not unstyled before this runs, but the
//: static copy is what went wrong: it said `padding-top: 0.5rem` while the
//: textarea's own padding is `--space-4`, which is `calc(0.6rem *
//: var(--density))`. Measured, at density 1, every number sat 1.59px above its
//: line, and the density setting could widen that at will. A number beside the
//: wrong line is not a small cosmetic error: it is the one thing a gutter is
//: for.
const DOC_GUTTER_PROPS = [
  "fontFamily", "fontSize", "fontWeight", "fontStyle", "letterSpacing",
  "lineHeight", "paddingTop", "paddingBottom",
];

//: **The gutter is clipped to the textarea, not to the row it sits in.**
//: Reported with a screenshot: numbers 1 to 18 continuing below a textarea
//: that ended at 11. Both wrappers (`.doc-source-wrap` and `.gutter-wrap`) are
//: `align-items: stretch` flex rows, so the gutter took the row's height while
//: the textarea took its own; dragging `#doc-content`'s native resize handle
//: shorter left the column running on down the card. Measured before this: a
//: 260px textarea beside a 585px gutter, 325.4px of numbers past the end of
//: the box they number, and even untouched the gutter was 9.6px too tall.
//:
//: The height is also what makes the scroll lock-step possible at all. A
//: gutter that is taller than its textarea has a *shorter* scrollable range,
//: so `gutter.scrollTop = box.scrollTop` silently clamps: measured, the box at
//: 200 and the gutter stuck at 139, which is two and a half lines of drift
//: that grows the further down you scroll. Same height, same content height,
//: same range, and the assignment is then exact.
function syncDocGutterMetrics(only = null) {
  for (const { gutter, box } of docGutters()) {
    if (only && box !== only) continue;
    if (gutter.classList.contains("hidden")) continue;
    const metrics = getComputedStyle(box);
    for (const prop of DOC_GUTTER_PROPS) gutter.style[prop] = metrics[prop];
    gutter.style.height = `${box.offsetHeight}px`;
  }
}

//: **The box changes height for reasons no event reports.** Dragging
//: `#doc-content`'s own `resize: vertical` handle, opening or closing the chat
//: dock, switching to Split, a note's textarea growing as it is typed into: a
//: `window.resize` listener sees none of them, and the height is exactly what
//: was wrong. One observer, every numbered box.
let docGutterObserver = null;

function watchDocGutter(box) {
  if (!box || typeof ResizeObserver !== "function") return;
  if (!docGutterObserver) {
    docGutterObserver = new ResizeObserver((entries) => {
      for (const entry of entries) syncDocGutterMetrics(entry.target);
    });
  }
  //: Observing the same element twice replaces the registration rather than
  //: adding a second one, so this is safe to call on every mount and every
  //: toggle.
  docGutterObserver.observe(box);
}

function renderDocGutter(only = null) {
  for (const { gutter, box } of docGutters()) {
    if (only && box !== only) continue;
    if (gutter.classList.contains("hidden")) continue;
    const lines = box.value.split("\n").length;
    // One text node of numbers, not one element per line: a 5,000-line file
    // is 5,000 elements to build and lay out on every keystroke otherwise,
    // and the gutter is doing nothing that needs per-line nodes.
    gutter.textContent = Array.from({ length: lines }, (_, i) => i + 1).join("\n");
    //: Height on every paint, not only on mount: the textarea grows and
    //: shrinks with the pane, with the chat dock, and with its own resize
    //: handle, and none of those tells this code anything.
    gutter.style.height = `${box.offsetHeight}px`;
    gutter.scrollTop = box.scrollTop;
  }
}

//: Give a plain textarea a line-number gutter: wrap it, put the gutter
//: before it, and keep the two in step on input and scroll. The gutter copies
//: the textarea's own type metrics and top padding through the CSSOM (an
//: inline `style=` would be refused by the CSP), that, not a shared class,
//: is what makes "1" sit exactly beside the first line whatever font the box
//: uses. Idempotent, so the note edit form can call it on every open.
function mountGutterFor(textarea) {
  if (!textarea || !textarea.id || textarea.parentElement?.classList.contains("gutter-wrap")) {
    return textarea?.previousElementSibling || null;
  }
  const wrap = document.createElement("div");
  wrap.className = "gutter-wrap";
  const gutter = document.createElement("div");
  gutter.className = "doc-gutter hidden";
  gutter.dataset.for = textarea.id;
  gutter.setAttribute("aria-hidden", "true");
  textarea.parentElement.insertBefore(wrap, textarea);
  wrap.append(gutter, textarea);
  // The note edit form builds its <li> detached and inserts it afterwards,
  // so at this point `applyDocGutter` (which walks the *document*) cannot
  // see this gutter and `getComputedStyle` returns empty strings. Decide the
  // initial state from the remembered choice right here, and copy the type
  // metrics on the first frame the box is in the document, measured, the
  // form's gutter stayed hidden on every open without both.
  const on = docGutterPref() === "1";
  gutter.classList.toggle("hidden", !on);
  textarea.classList.toggle("has-gutter", on);
  //: One copy routine for every gutter in the app, so the documents editor's
  //: static `#doc-gutter` and the two note boxes' mounted ones cannot disagree
  //: about which properties matter. It grew `height` and the font weight and
  //: style when the column was measured against the text it numbers.
  const copyMetrics = () => {
    syncDocGutterMetrics(textarea);
    watchDocGutter(textarea);
    renderDocGutter(textarea);
  };
  if (textarea.isConnected) copyMetrics();
  else requestAnimationFrame(copyMetrics);
  textarea.addEventListener("input", () => renderDocGutter(textarea));
  textarea.addEventListener("scroll", () => {
    if (!gutter.classList.contains("hidden")) gutter.scrollTop = textarea.scrollTop;
  });
  return gutter;
}

//: The lines a selection touches, as [firstLine, lastLine] and the character
//: offsets that bracket them. Indent, dedent and comment-toggle all work on
//: whole lines, and all three need exactly this.
function docSelectedLines(box) {
  const value = box.value;
  const start = value.lastIndexOf("\n", box.selectionStart - 1) + 1;
  let end = value.indexOf("\n", box.selectionEnd);
  if (end === -1) end = value.length;
  // A selection ending exactly at a line start has not touched that line, 
  // without this, selecting one whole line by dragging comments out two.
  if (box.selectionEnd > box.selectionStart && box.selectionEnd === start) {
    end = box.selectionEnd;
  }
  return { start, end, text: value.slice(start, end) };
}

//: Replace a run of the textarea through the browser's own edit pipeline, so
//: the native undo stack keeps working. Assigning `.value` wipes it, which
//: would make Ctrl+Z stop working in exactly the editor where people press it
//: most: the single most important detail in this whole section.
function docReplaceRange(box, start, end, text) {
  //: CodeMirror has its own history and its own transaction pipeline, so the
  //: `execCommand` dance below is not only unnecessary there, it is wrong:
  //: `insertText` on a contenteditable goes through the browser rather than
  //: through the state, and the two would disagree about the document.
  if (box.kind === "codemirror") {
    box.replaceRange(start, end, text);
    return;
  }
  box.focus();
  box.setSelectionRange(start, end);
  if (!document.execCommand || !document.execCommand("insertText", false, text)) {
    // execCommand is deprecated and may be gone. Falling back to a direct
    // write loses native undo for that one edit, which beats the edit not
    // happening: and `markDocDirty` still runs, so nothing is lost.
    const value = box.value;
    box.value = value.slice(0, start) + text + value.slice(end);
  }
}

function indentDocSelection(box, outdent) {
  //: One undo step per Tab, not one per burst, see `docUndoBreak`.
  docUndoBreak();
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
    // Dedent removes one indent unit, or, for a line indented with the
    // wrong-width whitespace, which happens constantly in a pasted file, 
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
  docUndoBreak();
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
        // Drop one following space if this put one there, so a round trip
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
    // wrapping it: a prefix would produce a file that no longer parses.
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
    // right: there is no sensible thing to insert.
    return;
  }
  markDocDirty();
  renderDocGutter();
}

// --- Live preview: the same editor, with decorations on -----------------------
//
// ROADMAP item 0, asked for again directly: "the notion/obsidian live md
// rendering after typing hybrid kind of md". The model both of those use, and
// the one implemented here: **the document renders in place, and the markdown
// markers hide themselves until the caret enters the thing they mark.** So
// `**bold**` is bold while you read it and `**bold**` while you edit it, and
// you never lose sight of the syntax you are actually typing.
//
// **What this replaces, and why it had to.** Until Phase 2 the Live view was a
// second editor: one `<textarea>` per paragraph, the rest of the document
// rendered to HTML beside them, the whole pane rebuilt whenever the prose
// check ran. It worked, and it was honest about its own limits, but the cost
// was structural. Measured in Chromium on the plan's own 20k-word document
// (`scratchpad/ui-sweeps/doctype.js`): a single keystroke in Live produced
// 1,178 markdown renders and a keydown p50 of 160 ms against a 30 ms gate,
// because every debounced prose pass tore down and rebuilt every block in the
// document. There is no tuning that fixes that shape; the pane has to stop
// being a thousand elements.
//
// Decorations are the fix and they are also the better editor. One document,
// one caret, one selection, one undo history, no block boundaries to fall
// between, and only the *visible* lines are ever decorated
// (`view.visibleRanges`), so the work per keystroke is a screenful rather than
// a document. It is Obsidian's own architecture, which is what was asked for.
//
// **What is lost, said plainly:** the Notion-style block handle, its drag to
// reorder and its move/duplicate/delete menu went with the block DOM. Those
// were real and people used them. DOCUMENTS_PLAN Phase 3 is where block
// structure comes back, as gutter affordances over the one document rather
// than as a second copy of it.

//: The compartment decision 3 names: Live is this editor with the markdown
//: decorations on, Source is the same editor with them off. Nothing else
//: differs between the two views, which is the whole point.
function docSetLiveDecorations(on) {
  const CM = window.CM6;
  if (!docCmView || !CM || !docCmParts.live) return;
  docCmView.dispatch({
    effects: docCmParts.live.reconfigure(on ? docLivePlugin(CM) : []),
  });
}

//: Built once and reused: a `ViewPlugin` is a class, and reconfiguring a
//: compartment with a *new* class every time would tear the plugin's state
//: down and rebuild it on every view switch.
let docLivePluginCache = null;

//: The one place a source offset becomes a rendered thing. Everything here is
//: computed from the lezer markdown tree (`syntaxTree`) over the visible
//: ranges only, except the two constructs the tree does not know about:
//: `==highlight==`, which is not markdown, and `[[wiki links]]`, which are
//: this app's own. Those two are found by a regex over the visible text and
//: are skipped inside code, which is the same rule `layerDocWikiLinks` has
//: always followed in the preview.
function docLivePlugin(CM) {
  if (docLivePluginCache) return docLivePluginCache;
  const { Decoration, ViewPlugin, EditorView, WidgetType } = CM.view;
  const { syntaxTree } = CM.language;
  const hidden = Decoration.replace({});

  //: A real checkbox, because a task list you cannot tick is a list of
  //: sentences with brackets in front of them. Toggling writes the source, so
  //: the document and the tick can never disagree.
  class DocTaskWidget extends WidgetType {
    constructor(checked, from, to) {
      super();
      this.checked = checked;
      this.from = from;
      this.to = to;
    }
    eq(other) {
      return other.checked === this.checked && other.from === this.from;
    }
    //: **The view is handed in, and the listener goes on the element.** The
    //: first version toggled from the plugin's own `mousedown` handler, which
    //: works for a pointer and for nothing else: a scripted `click()`, and
    //: more importantly the keyboard (a checkbox is focusable and Space
    //: activates it), raise `click` and no `mousedown` at all. Caught by
    //: measuring, `scratchpad/ui-sweeps/cm-live.js` toggled nothing.
    toDOM(view) {
      const box = document.createElement("input");
      box.type = "checkbox";
      box.className = "cm-md-task";
      box.checked = this.checked;
      box.setAttribute("aria-label", this.checked ? "Done" : "Not done");
      const { from, to } = this;
      box.addEventListener("click", (event) => {
        event.preventDefault();
        const marker = view.state.doc.sliceString(from, to);
        //: The source is what changes, and the tick follows it on the next
        //: repaint. Writing the two separately is how they come to disagree.
        view.dispatch({ changes: { from, to, insert: /[xX]/.test(marker) ? "[ ]" : "[x]" } });
      });
      return box;
    }
  }

  //: **Same-origin sources only.** A document is text a person can paste into,
  //: and an `<img src="http://tracker/…">` in one would turn opening a note
  //: into a network request to somebody else's server, in an app whose whole
  //: claim is that it works with the plug pulled. A remote address is left as
  //: the markdown that it is.
  class DocImageWidget extends WidgetType {
    constructor(src, alt) {
      super();
      this.src = src;
      this.alt = alt;
    }
    eq(other) {
      return other.src === this.src && other.alt === this.alt;
    }
    toDOM() {
      const img = document.createElement("img");
      img.className = "cm-md-image";
      img.src = this.src;
      img.alt = this.alt || "";
      return img;
    }
  }

  const sameOrigin = (url) => {
    const clean = String(url || "").trim();
    if (!clean || clean.startsWith("//")) return null;
    if (clean.startsWith("/")) return clean;
    try {
      const parsed = new URL(clean, window.location.href);
      return parsed.origin === window.location.origin ? parsed.href : null;
    } catch {
      return null;
    }
  };

  //: The callout kinds the rest of the app already renders (`CALLOUT_KINDS` in
  //: editor.js) and the syntax GitHub, Obsidian and Typora all understand.
  const CALLOUT = /^>\s*\[!([A-Za-z]+)\]/;

  function build(view) {
    const state = view.state;
    const doc = state.doc;
    const sel = state.selection.main;
    const ranges = [];
    const touched = (from, to) => sel.from <= to && sel.to >= from;
    const lineTouched = (pos) => {
      const line = doc.lineAt(pos);
      return touched(line.from, line.to);
    };
    const tree = syntaxTree(state);

    for (const visible of view.visibleRanges) {
      tree.iterate({
        from: visible.from,
        to: visible.to,
        enter: (node) => {
          const name = node.name;
          const heading = /^ATXHeading([1-6])$/.exec(name);
          if (heading) {
            const line = doc.lineAt(node.from);
            ranges.push(Decoration.line({ class: `cm-md-h${heading[1]}` }).range(line.from));
            return undefined;
          }
          if (name === "HeaderMark") {
            if (lineTouched(node.from)) return false;
            let end = node.to;
            while (end < doc.length && doc.sliceString(end, end + 1) === " ") end += 1;
            ranges.push(hidden.range(node.from, end));
            return false;
          }
          if (name === "StrongEmphasis" || name === "Emphasis" || name === "Strikethrough") {
            const cls =
              name === "StrongEmphasis" ? "cm-md-strong" : name === "Emphasis" ? "cm-md-em" : "cm-md-strike";
            ranges.push(Decoration.mark({ class: cls }).range(node.from, node.to));
            return undefined;
          }
          if (name === "InlineCode") {
            ranges.push(Decoration.mark({ class: "cm-md-code" }).range(node.from, node.to));
            return undefined;
          }
          if (name === "EmphasisMark" || name === "StrikethroughMark" || name === "CodeMark") {
            const parent = node.node.parent;
            //: A fence's own ``` is a `CodeMark` too, and hiding those would
            //: leave a code block with no visible boundaries at all.
            if (!parent || parent.name === "FencedCode") return false;
            if (!touched(parent.from, parent.to)) ranges.push(hidden.range(node.from, node.to));
            return false;
          }
          if (name === "Link") {
            const text = doc.sliceString(node.from, node.to);
            const close = text.lastIndexOf("](");
            if (close <= 0) return false;
            const url = text.slice(close + 2, text.length - 1);
            ranges.push(
              Decoration.mark({
                class: "cm-md-link",
                attributes: { "data-doc-href": url, title: `Ctrl+click to open ${url}` },
              }).range(node.from + 1, node.from + close)
            );
            if (!touched(node.from, node.to)) {
              ranges.push(hidden.range(node.from, node.from + 1));
              ranges.push(hidden.range(node.from + close, node.to));
            }
            return false;
          }
          if (name === "Image") {
            const text = doc.sliceString(node.from, node.to);
            const close = text.lastIndexOf("](");
            if (close <= 1) return false;
            const src = sameOrigin(text.slice(close + 2, text.length - 1));
            if (!src || touched(node.from, node.to)) return false;
            ranges.push(
              Decoration.replace({
                widget: new DocImageWidget(src, text.slice(2, close)),
              }).range(node.from, node.to)
            );
            return false;
          }
          if (name === "TaskMarker") {
            if (lineTouched(node.from)) return false;
            const marker = doc.sliceString(node.from, node.to);
            ranges.push(
              Decoration.replace({
                widget: new DocTaskWidget(/[xX]/.test(marker), node.from, node.to),
              }).range(node.from, node.to)
            );
            return false;
          }
          if (name === "Blockquote") {
            const first = doc.lineAt(node.from);
            const callout = CALLOUT.exec(first.text);
            const cls = callout ? `cm-md-callout cm-md-callout-${callout[1].toLowerCase()}` : "cm-md-quote";
            for (let at = node.from; at <= node.to; ) {
              const line = doc.lineAt(at);
              ranges.push(Decoration.line({ class: cls }).range(line.from));
              if (line.to >= node.to) break;
              at = line.to + 1;
            }
            return undefined;
          }
          if (name === "QuoteMark") {
            const line = doc.lineAt(node.from);
            if (touched(line.from, line.to)) return false;
            let end = node.to;
            while (end < doc.length && doc.sliceString(end, end + 1) === " ") end += 1;
            ranges.push(hidden.range(node.from, end));
            return false;
          }
          if (name === "FencedCode") {
            for (let at = node.from; at <= node.to; ) {
              const line = doc.lineAt(at);
              ranges.push(Decoration.line({ class: "cm-md-fence" }).range(line.from));
              if (line.to >= node.to) break;
              at = line.to + 1;
            }
            return undefined;
          }
          if (name === "HorizontalRule") {
            ranges.push(Decoration.line({ class: "cm-md-rule" }).range(doc.lineAt(node.from).from));
            return false;
          }
          return undefined;
        },
      });

      //: The two constructs the markdown tree has no node for. Scanned over
      //: the visible text only, and skipped inside code for the same reason
      //: the preview's own wiki-link pass skips `<code>`: a literal `[[x]]` in
      //: a fenced snippet is a snippet, not a link.
      const text = doc.sliceString(visible.from, visible.to);
      const inCode = (pos) => {
        const at = tree.resolveInner(pos, 1);
        for (let node = at; node; node = node.parent) {
          if (node.name === "InlineCode" || node.name === "FencedCode" || node.name === "CodeText") {
            return true;
          }
        }
        return false;
      };
      const scan = (pattern, handle) => {
        pattern.lastIndex = 0;
        let match;
        while ((match = pattern.exec(text)) !== null) {
          const from = visible.from + match.index;
          if (inCode(from)) continue;
          handle(match, from, from + match[0].length);
        }
      };
      scan(/==([^=\n]{1,200})==/g, (match, from, to) => {
        ranges.push(Decoration.mark({ class: "cm-md-highlight" }).range(from, to));
        if (touched(from, to)) return;
        ranges.push(hidden.range(from, from + 2));
        ranges.push(hidden.range(to - 2, to));
      });
      scan(/\[\[([^[\]\n]{1,120})\]\]/g, (match, from, to) => {
        const name = match[1].trim();
        ranges.push(
          Decoration.mark({
            class: "cm-md-wiki",
            attributes: { "data-doc-wiki": name, title: `Open “${name}”` },
          }).range(from + 2, to - 2)
        );
        if (touched(from, to)) return;
        ranges.push(hidden.range(from, from + 2));
        ranges.push(hidden.range(to - 2, to));
      });
    }
    //: Sorted by CodeMirror rather than by hand: the tree walk and the two
    //: regex passes produce ranges in three different orders, and a set built
    //: out of order throws rather than drawing something wrong, which is the
    //: right way round but is still a crash if it is left to chance.
    return Decoration.set(ranges, true);
  }

  docLivePluginCache = ViewPlugin.fromClass(
    class {
      constructor(view) {
        this.decorations = build(view);
      }
      update(update) {
        //: Selection as well as document and viewport: the whole idea of this
        //: view is that markers appear when the caret enters what they mark,
        //: so a caret move is a repaint.
        if (update.docChanged || update.viewportChanged || update.selectionSet) {
          this.decorations = build(update.view);
        }
      }
    },
    {
      decorations: (plugin) => plugin.decorations,
      eventHandlers: {
        mousedown(event) {
          const target = event.target;
          if (!(target instanceof Element)) return false;
          const wiki = target.closest("[data-doc-wiki]");
          if (wiki) {
            event.preventDefault();
            //: Through the same resolution the preview's own chips use, so a
            //: name that resolves in one view resolves in the other.
            docOpenWikiTarget(wiki.dataset.docWiki);
            return true;
          }
          const link = target.closest("[data-doc-href]");
          if (link && (event.ctrlKey || event.metaKey)) {
            event.preventDefault();
            docOpenLink(link.dataset.docHref);
            return true;
          }
          return false;
        },
      },
    }
  );
  return docLivePluginCache;
}

//: `[[name]]`, resolved against the documents list exactly as
//: `layerDocWikiLinks` resolves it in the rendered preview. One resolver, so a
//: link cannot work in one view and fail in the other.
function docOpenWikiTarget(name) {
  const wanted = String(name || "").trim().toLowerCase();
  const target = docs.find((doc) => (doc.title || "").toLowerCase() === wanted);
  if (target) openDocument(target.id);
  else toast(`No document called "${name}" yet.`, true);
}

//: Ctrl+click on a link chip. Same-origin paths open in the app; anything else
//: opens in a new tab with `noopener`, which is what every other outbound link
//: in this app does. `javascript:` and `data:` are refused outright rather
//: than handed to the browser.
function docOpenLink(href) {
  const clean = String(href || "").trim();
  if (!clean || /^(javascript|data|vbscript):/i.test(clean)) return;
  window.open(clean, "_blank", "noopener,noreferrer");
}

// --- keeping the two panes looking at the same place --------------------------
//
// Side by side is only half of a split view. Without this, scrolling the
// editor leaves the preview showing paragraph one, so the rendered half is
// useful for the first screen of a document and decorative after that, which
// is most of what "the panes get squished together and it feels annoying to
// use" is about once they are actually side by side.
//
// Proportional rather than line-mapped, deliberately. Mapping source lines to
// rendered blocks needs the markdown renderer to emit source positions, which
// this one does not, and the approximations that get used instead (count the
// headings, guess) drift worse the longer the document. Scroll fraction is
// exact at both ends, close everywhere in between for prose, and, the part
// that matters: never wrong in a way that looks like a bug.

//: Which pane the user is actually scrolling. Without this the two feed each
//: other: A scrolls B, B's scroll event scrolls A, and the pair juddate to a
//: stop somewhere neither of them was asked to go.
let docScrollDriver = null;

function syncDocScroll(from) {
  const editor = docSurface();
  const preview = $("doc-preview");
  if (!editor || !preview || preview.classList.contains("hidden")) return;
  //: Compared against the *preview*, not against the editor. The editor half
  //: of this pair is a surface whose identity is stable but whose scrolling
  //: element changes when CodeMirror takes over, so "is this the preview"
  //: is the question with one answer.
  const to = from === preview ? editor : preview;
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

//: Idempotent per scrolling element, because the editor's scroller is
//: replaced when CodeMirror mounts and the pair has to be re-wired then.
//: `dataset` rather than a set, so a scroller that is thrown away takes its
//: mark with it (tests/test_frontend_handlers.py exists because of exactly
//: the duplicate-listener shape this avoids).
function wireDocSurfaceScroll(surface) {
  const el = surface?.scrollEl;
  if (!el || el.dataset.docScrollSync === "1") return;
  el.dataset.docScrollSync = "1";
  el.addEventListener("scroll", () => {
    if (docScrollDriver && docScrollDriver !== surface) return;
    syncDocScroll(surface);
  });
}

function wireDocScrollSync() {
  wireDocSurfaceScroll(docSurface());
  const preview = $("doc-preview");
  if (!preview) return;
  preview.addEventListener("scroll", () => {
    if (docScrollDriver && docScrollDriver !== preview) return;
    syncDocScroll(preview);
  });
}

// Markdown formatting from a toolbar, so you don't have to remember the
// syntax. Everything it inserts is plain markdown, the file stays portable
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
  //: in what tools are there, and how they function"*, PKM-er's
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
  //: functions" half of the request, a toolbar for *this* notebook has to
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
// `**` means: see MD_ACTIONS' own comment and editor.js's "/" menu, which
// are already deliberately kept to one dialect.
function applyMarkdown(kind, boxId = "doc-content") {
  const action = MD_ACTIONS[kind];
  const box = docSurfaceById(boxId);
  if (!action || !box) return;
  //: A toolbar press is its own undo step, never part of the typing burst it
  //: happened to follow. Set *before* the edit, because the recording happens
  //: inside it (`finishMarkdownEdit` -> `markDocDirty`).
  docUndoBreak();
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
  //: editor a second history that disagrees with Ctrl+Z, the one thing a
  //: user is certain about in any text box.
  if (action.custom === "undo" || action.custom === "redo") {
    box.focus();
    //: **The document editor has its own history now, and these buttons use
    //: it.** The paragraph above is still true everywhere else, the notes
    //: composer and the note edit form are one textarea each, so the browser's
    //: own stack is the right one and a second would only disagree with
    //: Ctrl+Z. The document editor is the case that broke the assumption, and
    //: it now has a real history of its own: CodeMirror's, where the engine is
    //: mounted, and the D3 snapshot stack at the end of this file where it is
    //: not. `docUndo` picks between them; this button must not reach past it
    //: to `execCommand`, which knows about neither.
    if (docToolsBoxFor(box)) {
      if (action.custom === "undo") docUndo();
      else docRedo();
      return;
    }
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
    //: which is the part still to be typed, the same split `link` above
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
//: bullets indents all three, the behaviour Tab has in Obsidian's editor.
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
  //: Reached both from `applyMarkdown` (which has already broken the burst)
  //: and directly from Ctrl+B / Ctrl+I / Ctrl+E, which have not. Idempotent, so
  //: setting it twice costs nothing and missing it would silently fold a Bold
  //: into the word you had just typed.
  docUndoBreak();
  const box = docSurfaceById(boxId);
  if (!box) return;
  const { selectionStart: start, selectionEnd: end, value } = box;

  // Toggle off, case 1: the selection sits *inside* an existing pair of
  // markers ("**|bold text|**", caret positions marked). Reported directly:
  // applying Bold to an already-bold selection didn't remove it the way
  // every other rich-text editor's toggle does: this was a one-way
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
  // ("|**bold text**|"), selecting the whole formatted span, not just its
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
  // keystroke replaces it: pressing Bold on an empty line should give you
  // somewhere to type, not two markers and a caret between them.
  const selected = value.slice(start, end) || placeholder;
  box.value = value.slice(0, start) + marker + selected + marker + value.slice(end);
  // Keep the same text selected, so the shortcut can be toggled or stacked.
  box.selectionStart = start + marker.length;
  box.selectionEnd = start + marker.length + selected.length;
  box.focus();
  //: **`finishMarkdownEdit`, not `markDocDirty()` + `renderDocPreview()`.**
  //: Both toggle-off branches above already end this way; this branch: the
  //: one that actually *applies* formatting, and so the one that runs almost
  //: every time: did the doc-content half inline instead, which quietly did
  //: the wrong thing for every other box: it marked the *document* dirty and
  //: never told the box's own listeners anything had changed.
  //:
  //: Found when the selection bar started appearing over live-view
  //: paragraphs. Bold visibly wrapped the words in the block and the document
  //: underneath never received them, measured, `input` fired 0 times, and
  //: dispatching one by hand synced it immediately. The same call was wrong
  //: for the note edit box for exactly as long, where it marked a document
  //: dirty that the user was not editing.
  finishMarkdownEdit(box, boxId);
}

async function exportDocumentMarkdown() {
  if (!currentDoc) return;
  // Fetched rather than navigated to. A plain link carries no X-Auth-Token, so
  // the server answers 401 and the browser renders that error *in place of the
  // app*: it navigates away instead of downloading.
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

//: **Deleting a document is the only permanent loss left in this app, and it
//: is the longest thing anyone writes here.** Notes go to a recycle bin;
//: conversations, files and whiteboards are all recoverable one way or
//: another; a document was gone the moment you confirmed, which is why both
//: delete prompts had to say "This cannot be undone" out loud.
//:
//: Asked as part of "is everythign wired to the nav history and universal
//: undo/redo", and it was not. This wires it, from the client side, by
//: keeping the document's own text and re-creating it: `pushUndo` puts it on
//: the app-wide stack (Ctrl+Z, the status bar's Undo, and its right-click
//: list of the last fifty), and `toastAction` offers it immediately, which is
//: when people actually notice.
//:
//: **What does not come back, stated plainly:** the id changes, so anything
//: that pointed at the old one by id, a bookmark, a chat attachment, points
//: at nothing; and the revision history is genuinely gone, because
//: `delete_document` removes it deliberately (see its comment: keeping the
//: text of something the user asked to destroy would be worse). The words come
//: back. That is the difference between a mistake and a loss.
async function deleteDocumentWithUndo(doc) {
  //: Fetched, not taken from the list row: the list carries a summary, and
  //: restoring from it would bring back a document with its body missing, 
  //: an undo that silently loses the content is worse than no undo at all.
  const full = await apiJson(`/documents/${doc.id}`).catch(() => null);
  await apiJson(`/documents/${doc.id}`, { method: "DELETE" });
  if (!full) {
    //: Deleted, but nothing to restore from. Say so rather than offering an
    //: Undo that would quietly do nothing.
    toast("Document deleted. It could not be read first, so this one can't be undone.", true);
    return;
  }
  const recreate = async () => {
    const made = await apiJson("/documents", {
      method: "POST",
      body: JSON.stringify({
        title: full.title || "Untitled",
        content: full.content || "",
        file_type: full.file_type || "md",
      }),
    });
    await loadDocuments(made.id);
    return made;
  };
  let restored = null;
  const action = pushUndo(
    `Deleted “${full.title || "Untitled"}”`,
    async () => {
      restored = await recreate();
    },
    async () => {
      if (restored) await apiJson(`/documents/${restored.id}`, { method: "DELETE" });
      restored = null;
      await loadDocuments();
    }
  );
  toastAction("Document deleted.", "Undo", async () => {
    await action.undo();
    //: `settleUndoFromToast`, not a bare stack pop: the toast's Undo and the
    //: status bar's Undo are the same action, and without this a later Ctrl+Z
    //: would run the same restore a second time, the closure works fine
    //: twice and nothing else stops it.
    settleUndoFromToast(action);
    toast("Document restored.");
  });
}

async function deleteCurrentDocument() {
  if (!currentDoc) return;
  if (!(await confirmDialog(`Delete "${currentDoc.title}"? You can undo this straight after.`))) return;
  const doomed = currentDoc;
  currentDoc = null;
  await deleteDocumentWithUndo(doomed);
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
// differently per verb: kept in one place so switching verbs updates all
// three together rather than three separate change listeners drifting.
function syncDocAiPanel() {
  const verb = docAiVerb();
  const selection = ($("doc-ai-panel").dataset.selection || "").trim();
  const wordCount = selection ? selection.split(/\s+/).length : 0;

  const runLabel = { edit: "Suggest an edit", write: "Write it", remove: "Remove it" }[verb];
  setLabel($("doc-ai-run"), `ph:magic-wand ${runLabel}`);

  $("doc-ai-instruction").placeholder =
    verb === "write"
      ? "e.g. “add a conclusion”, “write an intro paragraph”"
      : verb === "remove"
        ? selection
          ? "Optional: leave blank to remove the selection as-is"
          : "e.g. “remove the paragraph about pricing”"
        : "e.g. “tighten this”, “make it more formal”, “add a conclusion”";

  if (verb === "write") {
    $("doc-ai-scope").textContent = selection
      ? `Inserting new text directly after the ${wordCount} selected word(s).`
      : "Inserting new text at the end of the document.";
  } else if (verb === "remove") {
    $("doc-ai-scope").textContent = selection
      ? `Removing the ${wordCount} selected word(s): or say what to remove from within them.`
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
  const box = docSurface();
  const { from, to } = box.selection();
  $("doc-ai-panel").dataset.selection = box.text.slice(from, to);
  // Always opens back on "Edit", the panel's original, still-default
  // behaviour: rather than remembering whatever verb was last used, so a
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
// AI edit above already uses, select a passage first to extract from just
// that, or leave nothing selected to extract from the whole document.
function openDocExtractPreview() {
  if (!currentDoc) return;
  const box = docSurface();
  const { from, to } = box.selection();
  const selection = box.text.slice(from, to).trim();
  openExtractPreview(selection || box.text, { sourceDocumentId: currentDoc.id });
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
// altered before and after they are set" (asked for directly): before
// acceptance, the result textarea above already covers "altered" (edit
// the AI's suggestion, then accept whatever's left). This is "undone...
// after": pushed onto the app's existing global undo stack (an immediate
// Ctrl+Z / status-bar Undo, session-only) alongside a durable per-document
// changelog entry (ai-edit-log, survives reload, lists every edit with its
// own Revert): see the dialog's own comment in index.html for why both.
function pushDocAiUndo(docId, label, beforeContent, afterContent) {
  const applyContent = async (content) => {
    const title = currentDoc && currentDoc.id === docId ? currentDoc.title : undefined;
    const saved = await apiJson(`/documents/${docId}`, {
      method: "PUT",
      body: JSON.stringify({ content, ...(title !== undefined ? { title } : {}) }),
    });
    if (currentDoc && currentDoc.id === docId) {
      currentDoc = saved;
      docSurface().text = content;
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
    // happened (and is already undoable via the global stack above), a
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
  const box = docSurface();
  const beforeContent = box.text;
  const docId = currentDoc.id;

  if (verb === "write") {
    // Inserts rather than replaces, the selection (if any) is only the
    // anchor point, and stays exactly as it was.
    if (selection) {
      const at = box.text.indexOf(selection);
      const insertAt = at === -1 ? box.text.length : at + selection.length;
      const before = box.text.slice(0, insertAt);
      const after = box.text.slice(insertAt);
      const glue = before && !before.endsWith("\n\n") ? (before.endsWith("\n") ? "\n" : "\n\n") : "";
      box.text = before + glue + revised + after;
    } else {
      const glue = box.text && !box.text.endsWith("\n\n") ? (box.text.endsWith("\n") ? "\n" : "\n\n") : "";
      box.text = box.text + glue + revised;
    }
  } else if (selection) {
    // "edit" and "remove" both replace the target with what the model
    // returned: for "remove" that's the same text with the requested
    // part gone, so no separate apply logic is needed.
    const at = box.text.indexOf(selection);
    box.text =
      at === -1
        ? box.text
        : box.text.slice(0, at) + revised + box.text.slice(at + selection.length);
  } else {
    box.text = revised;
  }

  const afterContent = box.text;
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
            docSurface().text = saved.content;
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

//: **The document's own history**, asked for by name: "can the document have
//: edit history like git logs??"
//:
//: `openDocAiHistory` above lists the edits the *model* made and can revert one
//: of them; this lists every version the document has had, whoever wrote it.
//: They answer different questions and both are worth having, so this is a
//: second list rather than a rewrite of that one.
//:
//: What makes it read like a log rather than a pile of timestamps is the
//: signed word delta on each row, a history where every line looks the same
//: has to be read from the top, which is the work a history exists to save.
const DOC_HISTORY_SOURCES = {
  edit: { icon: "ph:pencil-simple", label: "You" },
  ai: { icon: "ph:magic-wand", label: "AI edit" },
  restore: { icon: "ph:clock-counter-clockwise", label: "Restored" },
};

function docHistoryDelta(words) {
  if (!words) return "no change in length";
  return words > 0 ? `+${words} words` : `${words} words`;
}

async function openDocHistory() {
  if (!currentDoc) return toast("Open a document first.", true);
  const dialog = $("doc-history-dialog");
  const list = $("doc-history-list");
  const empty = $("doc-history-empty");
  if (!dialog || !list) return;
  list.replaceChildren();
  empty.classList.add("hidden");
  dialog.showModal();
  const loading = document.createElement("li");
  loading.className = "muted";
  loading.textContent = "Loading…";
  list.appendChild(loading);
  let entries;
  try {
    entries = await apiJson(`/documents/${currentDoc.id}/revisions`);
  } catch (error) {
    list.replaceChildren();
    const failed = document.createElement("li");
    failed.className = "muted";
    failed.textContent = error.message || "Couldn't load the history.";
    list.appendChild(failed);
    return;
  }
  list.replaceChildren();
  if (!entries.length) {
    empty.classList.remove("hidden");
    return;
  }
  for (const entry of entries) {
    const shape = DOC_HISTORY_SOURCES[entry.source] || DOC_HISTORY_SOURCES.edit;
    const row = document.createElement("li");
    row.className = "doc-ai-history-entry";
    const icon = document.createElement("i");
    icon.className = `ph ${shape.icon.replace("ph:", "ph-")}`;
    icon.setAttribute("aria-hidden", "true");

    const text = document.createElement("div");
    text.className = "doc-ai-history-text";
    const line = document.createElement("p");
    line.textContent = `${shape.label} · ${docHistoryDelta(entry.word_delta)}`;
    const meta = document.createElement("p");
    meta.className = "muted text-sm";
    meta.textContent = `${new Date(entry.created_at).toLocaleString()} · ${entry.words} words`;
    //: The opening of the version itself. A row saying only "You, 20 May,
    //: +140 words" makes you open every entry to find the one you want, which
    //: is the work this list is supposed to save.
    const preview = document.createElement("p");
    preview.className = "muted text-sm doc-history-preview";
    preview.textContent = entry.preview || "";
    text.append(line, meta, preview);

    const view = document.createElement("button");
    view.type = "button";
    view.className = "ghost small";
    view.textContent = "View";
    view.title = "Read this version without changing anything";
    view.addEventListener("click", async () => {
      const full = await apiJson(
        `/documents/${currentDoc.id}/revisions/${entry.id}`
      ).catch(() => null);
      if (!full) return toast("Couldn't open that version.", true);
      dialog.close();
      //: Through the lightbox, which is already the app's read-only viewer for
      //: a document's text: including its find bar, which is how anyone
      //: actually locates what changed in a long version.
      openLightbox(
        [
          {
            filename: `${full.title || "Untitled"}, ${new Date(full.created_at).toLocaleString()}`,
            kind: currentDoc.file_type === "md" ? "markdown" : "code",
            text: full.content || "",
            addedAt: full.created_at || "",
          },
        ],
        0
      );
    });

    const restore = document.createElement("button");
    restore.type = "button";
    restore.className = "ghost small";
    restore.textContent = "Restore";
    restore.title = "Put the document back to this version";
    restore.addEventListener("click", async () => {
      //: Asked first, because this replaces what is on screen. Cheap to undo
      //: (the restore keeps the version it replaced) but not obviously so from
      //: the outside, and a confirm is what says it is a real change.
      const ok = await confirmDialog(
        `Put this document back to the version from ${new Date(entry.created_at).toLocaleString()}?\n\n` +
          "The version you have now is kept in the history, so this is undoable.",
        { confirmLabel: "Restore it" }
      );
      if (!ok) return;
      restore.disabled = true;
      try {
        const saved = await apiJson(
          `/documents/${currentDoc.id}/revisions/${entry.id}/restore`,
          { method: "POST" }
        );
        currentDoc = saved;
        docSurface().text = saved.content || "";
        $("doc-title").value = saved.title || "";
        renderDocPreview();
        docDirty = false;
        $("doc-saved").textContent = "Saved";
        docs = docs.map((d) => (d.id === saved.id ? { ...d, ...saved } : d));
        renderDocList();
        dialog.close();
        toast("Restored. The version you had is in the history.");
      } catch (error) {
        toast(error.message || "Couldn't restore that version.", true);
      } finally {
        restore.disabled = false;
      }
    });

    const actions = document.createElement("span");
    actions.className = "row doc-history-actions";
    actions.append(view, restore);
    row.append(icon, text, actions);
    list.appendChild(row);
  }
}

$("doc-history")?.addEventListener("click", openDocHistory);

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
$("doc-new").addEventListener("click", () => createDocument());
$("doc-new-template")?.addEventListener("click", openDocTemplateDialog);
// Searching and sorting every document lives in the Library now (§36G), with
// the notes, chats and files beside them. This is the way there, said out loud
//, a list that silently stops at eight is a list that has lost your writing.
$("doc-browse-all").addEventListener("click", () => {
  switchTab("library");
  libraryKind = "document";
  renderLibraryOverview();
  renderLibraryFilters();
  renderLibrary();
});
// Used to be an open-by-default <details> in the sidebar; its body was tall
// enough to push the document list down, so it is a dialog now. The Close
// button and Escape both close it, Close via the generic [data-close-dialog]
// delegation set up below, Escape for free from <dialog>.showModal().
$("doc-storage-toggle").addEventListener("click", () => $("doc-storage-dialog").showModal());
$("doc-title").addEventListener("input", () => { markDocDirty(); scheduleDocPreview(); });
//: **The document changed, whichever surface it changed in.** Bound to the
//: fallback textarea's own `input` here and called straight by CodeMirror's
//: update listener once the view is mounted, so there is one pipeline rather
//: than one per engine.
function docSurfaceInput() {
  markDocDirty();
  scheduleDocPreview();
  renderDocGutter();
}
docBoxEl().addEventListener("input", docSurfaceInput);
// The gutter is a separate element beside the textarea, so it has to be told
// to follow it, because a textarea's own scroll does not move its siblings.
// The fallback's problem only: the engine's own gutter is inside the view and
// scrolls with it.
docBoxEl().addEventListener("scroll", (event) => {
  const gutter = $("doc-gutter");
  if (gutter && !gutter.classList.contains("hidden")) {
    gutter.scrollTop = event.currentTarget.scrollTop;
  }
});
// The document-textarea resize gap (Priority 0 #1): dragging #doc-content's
// native `resize: vertical` handle shorter pins the textarea's own height,
// but #doc-panes, a flex item of .doc-main with `flex: 1 1 auto`, keeps
// growing to fill the card exactly as before, because nothing about a CSS
// resize tells a flex *parent* to stop growing to fit it. The freed space
// used to be trapped inside #doc-panes, below the now-shorter textarea and
// above .doc-hint: dead space in the middle of the card instead of at its
// bottom, where a person would expect it. There's no CSS-only fix: nothing
// short of a user dragging the handle can tell us the textarea's size is no
// longer meant to track the flex layout, so this is the one place app.js
// answers "did a person just resize this" with a real yes/no rather than a
// CSS rule guessing at it. A mousedown that ends with a different height is
// as close as the DOM gets to "yes", ordinary typing or a value swap on
// loading a different document never changes offsetHeight.
{
  const box = docBoxEl();
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
//: tooltip: which is the thing that actually stops them drifting.
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
    el.dataset.mdExtra = "1";
    el.setAttribute("aria-hidden", "true");
    return el;
  };
  bar.appendChild(sep());
  for (const spec of EDITOR_TOOLBAR_BUTTONS) {
    const button = document.createElement("button");
    button.type = "button";
    button.dataset.md = spec.md;
    button.dataset.mdExtra = "1";
    button.title = spec.title;
    button.setAttribute("aria-label", spec.title);
    setLabel(button, spec.icon);
    bar.appendChild(button);
  }
  for (const menu of EDITOR_TOOLBAR_MENUS) {
    const details = document.createElement("details");
    details.className = "doc-dock-menu doc-toolbar-menu";
    details.dataset.mdExtra = "1";
    //: **Drawn exactly like the two menus written in the markup.** These were
    //: built with different classes and an icon *plus a word*, "Heading",
    //: "Block", "More", "Insert", sitting in a row where every other control
    //: is a glyph. Four labelled chips among twenty icons is what makes a
    //: toolbar read as assembled rather than designed, and it is the same
    //: "two implementations of one control" shape this project keeps paying
    //: for. The name lives in the tooltip and the ARIA label, where the
    //: markup's own menus already keep theirs.
    const summary = document.createElement("summary");
    summary.className = "doc-dock-menu-btn doc-toolbar-menu-btn";
    summary.title = menu.title;
    summary.setAttribute("aria-label", `${menu.label}: ${menu.title}`);
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
      //: The one menu-row recipe, shared with the chat's kebab (`.menu-item`,
      //: 02-chat-graph.css) -- see the comment on `.doc-dock-menu-list`.
      button.className = "menu-item doc-dock-menu-item";
      button.dataset.md = md;
      button.textContent = label;
      body.appendChild(button);
    }
    details.append(summary, body);
    bar.appendChild(details);
  }
}

//: Wire one formatting strip to its textarea: mount the shared extras
//: (Block menu, colours, …), then every `button[data-md]` and colour
//: select. Split out of `initMarkdownToolbars` so the note edit form can
//: clone the capture strip and wire the clone (app.js `noteEditToolbar`).
//: Everything the mount appends is marked `data-md-extra` so a clone can
//: drop the stale copies and mount fresh ones with live listeners.
function wireMarkdownToolbar(bar) {
  const boxId = bar.dataset.mdTarget || "doc-content";
  mountEditorToolbarExtras(bar);
  //: **Delegated, not one listener per button.** The dropdown menus are
  //: built by the mount above and, in the note edit form, the whole strip
  //: is a *clone*: so per-button listeners covered whatever existed at
  //: wiring time and silently missed anything a menu created later
  //: (reported: "none of the toolbar dropdowns work" in the edit form; a
  //: browser check confirmed a Block-menu item changed nothing). One
  //: listener on the bar cannot miss a descendant.
  bar.addEventListener("mousedown", (event) => {
    // Keeps the caret in the textarea: a click moves focus first and the
    // selection the action is about to act on is already gone.
    if (event.target.closest("button[data-md]")) event.preventDefault();
  });
  bar.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-md]");
    if (!button || !bar.contains(button)) return;
    applyMarkdown(button.dataset.md, boxId);
  });
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
      const box = docSurfaceById(boxId);
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

//: **Ctrl+B / Ctrl+I / Ctrl+Shift+S, in the two note editors too.**
//:
//: Reported alongside the missing strikethrough chord itself: both toolbar
//: buttons have carried "Bold (Ctrl+B)"/"Italic (Ctrl+I)" tooltips since
//: `noteEditToolbar` cloned this strip's markup for the note editors, but
//: neither note editor ever actually wired the keys, the tooltip named a
//: shortcut only `#doc-content`'s own handler (above this function) had.
//:
//: Not folded into that handler and shared: it also owns Tab-indent,
//: Ctrl+/ comments, Ctrl+1..3 headings and Ctrl+F find, none of which a
//: three-row note field has any use for, and giving it a second caller
//: would mean guarding every one of those behind a "is this really
//: #doc-content" check. This is the three chords the note editors and the
//: document editor genuinely share, kept as one small function so the
//: shifted-S-before-plain-S ordering (see that handler's own comment)
//: exists in exactly one place rather than two copies that could drift.
//:
//: Idempotent via `dataset.mdFormatShortcuts`: `#entry-content` is wired
//: once, at page load, but the note edit form's textarea is a fresh
//: element every time a note is opened for editing, and calling this again
//: on the *same* element (a note re-opened for editing without a full
//: reload) must not stack a second listener that fires the same keydown
//: twice.
//: Takes the element itself, not only its id: `renderEditForm` (app.js)
//: builds the note edit form's textarea and wires this before appending it
//: to the document, where `$(id)` (`document.getElementById`) would find
//: nothing yet. `#entry-content` is already in the page at boot, so the
//: capture box still just passes its id string.
function wireMdFormatShortcuts(boxOrId) {
  const box = typeof boxOrId === "string" ? $(boxOrId) : boxOrId;
  if (!box || box.dataset.mdFormatShortcuts) return;
  const boxId = box.id;
  box.dataset.mdFormatShortcuts = "1";
  box.addEventListener("keydown", (event) => {
    if (!(event.ctrlKey || event.metaKey)) return;
    const key = event.key.toLowerCase();
    if (key === "s" && event.shiftKey) {
      event.preventDefault();
      wrapDocSelection("~~", "struck through", boxId);
    } else if (key === "b") {
      event.preventDefault();
      wrapDocSelection("**", "bold text", boxId);
    } else if (key === "i") {
      event.preventDefault();
      wrapDocSelection("*", "italic text", boxId);
    }
  });
}
window.wireMdFormatShortcuts = wireMdFormatShortcuts;

function initMarkdownToolbars() {
  for (const bar of document.querySelectorAll("[data-md-target], #doc-toolbar")) {
    wireMarkdownToolbar(bar);
  }
  wireMdFormatShortcuts("entry-content");
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
for (const button of document.querySelectorAll("#doc-view-seg button, #doc-view-menu button")) {
  // The unmodified title is stashed before syncDocFileType ever overwrites it
  // with the "no rendered form" explanation, so switching back to a markdown
  // document restores the real one rather than leaving the disabled text.
  button.dataset.docTitle = button.title;
  button.addEventListener("click", () =>
    setDocView(button.dataset.docViewGroup === "edit" ? lastEditView : button.dataset.docView)
  );
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
try {
  //: **Live is the default now.** Asked for: "I want the text editor to be
  //: EXACTLY LIKE OBSIDIAN. the user would bold a wor, click off it, and the
  //: word shows as bolded", which is what this mode does, and has done for a
  //: while; it was simply not the view anybody landed in, so the editor read
  //: as a plain markdown box with a preview button. Obsidian's own default is
  //: Live Preview for the same reason. A stored choice still wins, so nobody
  //: who picked Source is moved off it.
  setDocView(localStorage.getItem(DOC_VIEW_KEY) || "live");
} catch {
  setDocView("source");
}

//: **The reading measure, opted out of.** Reported: "idk why the document
//: rendered views are so thin??", measured at 736px inside a 1132px pane,
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
  tab?.classList.toggle("doc-wide", wide);
  const title = wide ? "Back to a comfortable reading width" : "Use the full width of the pane";
  //: **Both views of one setting, painted together.** The toolbar's icon and
  //: the ⋯ menu's worded row are the same control, and the app's own rule (see
  //: `applyDocToolbarMode`) is that painting one without the other is how they
  //: drift. The menu row exists because the icon alone was not findable, 
  //: reported as "is there a way to make it wider if the user chooses??" about
  //: a control that was already there.
  for (const button of [$("doc-width-toggle"), $("doc-width-menu")]) {
    if (!button) continue;
    button.setAttribute("aria-pressed", String(wide));
    button.title = title;
    button.setAttribute("aria-label", title);
  }
  //: The label names what pressing it *does*, not the state it is in, the
  //: state is `aria-pressed` for a screen reader and the pane's own width for
  //: everyone else. Same rule the toolbar-mode row follows.
  const label = $("doc-width-menu-label");
  if (label) label.textContent = wide ? "Comfortable reading width" : "Use the full width";
}

function setDocWidth(wide) {
  try {
    localStorage.setItem(DOC_WIDTH_KEY, wide ? "wide" : "measure");
  } catch {
    // A private window can refuse storage; the mode still applies for now.
  }
  applyDocWidth(wide);
}

const toggleDocWidth = () => setDocWidth(!$("tab-documents")?.classList.contains("doc-wide"));
$("doc-width-toggle")?.addEventListener("click", toggleDocWidth);
$("doc-width-menu")?.addEventListener("click", toggleDocWidth);

try {
  applyDocWidth(localStorage.getItem(DOC_WIDTH_KEY) === "wide");
} catch {
  applyDocWidth(false);
}

//: **Focus mode.** Asked for as part of "the ultimate editor", every editor
//: this app is compared to (Obsidian, Notion, Kortex) has a way to make the
//: tab bar, the sidebar and the document list disappear, and this one never
//: did. Not remembered across sessions on purpose: full width is a standing
//: preference about how you read; this is a mode for right now, and opening
//: the app back into a chrome-less page with no visible way out would be its
//: own bug.
function toggleDocFocus(force) {
  const tab = $("tab-documents");
  if (!tab) return;
  const on = typeof force === "boolean" ? force : !tab.classList.contains("doc-focus");
  tab.classList.toggle("doc-focus", on);
  const button = $("doc-focus-toggle");
  if (button) {
    button.setAttribute("aria-pressed", String(on));
    button.title = on
      ? "Leave focus mode (Esc)"
      : "Focus mode: hide everything but the page (Esc to leave)";
    button.setAttribute("aria-label", button.title);
    const icon = button.querySelector("i");
    if (icon) icon.className = on ? "ph ph-arrows-in" : "ph ph-frame-corners";
  }
  if (on) docSurface()?.focus();
}

$("doc-focus-toggle")?.addEventListener("click", () => toggleDocFocus());

//: Escape leaves it: the same convention the whiteboard's and graph's own
//: full-screen toggles use. Capture phase, and checked against the class
//: first, so this never swallows an Escape meant for something opened over
//: the page (the AI panel, a confirm dialog, the find bar), closing focus
//: mode underneath one of those instead of the dialog itself would be
//: surprising.
document.addEventListener(
  "keydown",
  (event) => {
    if (event.key !== "Escape") return;
    if (!$("tab-documents")?.classList.contains("doc-focus")) return;
    toggleDocFocus(false);
  },
  true
);

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
docBoxEl().addEventListener("keydown", (event) => {
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
    indentDocSelection(docSurface(), false);
    return;
  }
  if (event.key === "Tab" && event.shiftKey && !docFileType().previewable) {
    const box = docSurface();
    // Shift+Tab dedents when there is something to dedent, and otherwise
    // falls through to the browser's own focus-backwards: so a flush-left
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
    toggleDocComment(docSurface());
    return;
  }
  const key = event.key.toLowerCase();
  // Checked before the plain Ctrl+S save case: Shift turns "s" into "S",
  // which `.toLowerCase()` folds back to the same "s" this switch reads, so
  // whichever branch runs first wins and the shifted chord has to come
  // first, or it would save the document instead of striking the selection.
  if (key === "s" && event.shiftKey) { event.preventDefault(); wrapDocSelection("~~", "struck through"); }
  else if (key === "s") { event.preventDefault(); saveDocument(); }
  else if (key === "b") { event.preventDefault(); wrapDocSelection("**", "bold text"); }
  else if (key === "i") { event.preventDefault(); wrapDocSelection("*", "italic text"); }
  // Ctrl+1/2/3 headings and Ctrl+E inline code, the Notion / Typora /
  // Word set, so the hand does not leave the keyboard for the strip.
  else if (key === "1" || key === "2" || key === "3") { event.preventDefault(); applyMarkdown(`h${key}`); }
  else if (key === "e") { event.preventDefault(); wrapDocSelection("`"); }
  // The browser's own Ctrl+F can't search a textarea's content at all, it
  // only sees page DOM text, and a textarea's text is its *value*, not DOM
  // text: so this isn't overriding useful native behaviour here.
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


// --- Toolbar shape: expanded, or one scrolling row --------------------------
//
// Asked for directly: *"there should be the option to have the tool bar as a
// horizontal scroll or expanded."* Expanded (wrapping) is the default, and not
// only as a preference: a wrapping toolbar is not a scroll container, so it
// cannot clip the `<details>` menus inside it: which was the other half of
// the same report. See `.doc-toolbar`'s own comment for the `overflow-y:
// visible` trap that caused both.

const DOC_TOOLBAR_MODE_KEY = "doc-toolbar-mode";

function docToolbarMode() {
  try {
    return localStorage.getItem(DOC_TOOLBAR_MODE_KEY) === "row" ? "row" : "wrap";
  } catch {
    return "wrap"; // private mode: the safe shape, since it never clips
  }
}

function applyDocToolbarMode(mode) {
  const row = mode === "row";
  for (const bar of document.querySelectorAll(".doc-toolbar")) {
    //: An attribute rather than a class: the CSS keys off
    //: `[data-toolbar-mode="row"]`, and the default (wrap) is the bare rule,
    //: so an unset attribute is the safe shape rather than an unstyled one.
    if (row) bar.dataset.toolbarMode = "row";
    else delete bar.dataset.toolbarMode;
  }
  const button = document.getElementById("doc-toolbar-mode");
  const label = document.getElementById("doc-toolbar-mode-label");
  if (button) button.setAttribute("aria-pressed", row ? "true" : "false");
  //: The label names what pressing it *does*, not the state it is in, the
  //: state is carried by `aria-pressed` for a screen reader and by the
  //: toolbar's own shape for everyone else.
  if (label) label.textContent = row ? "Expand the toolbar" : "Use one scrolling row";
  //: The strip's own layout button and this menu entry are two views of one
  //: setting, so painting one without the other is how they drift.
  applyDocToolbarLayoutButtons();
}

function setDocToolbarMode(mode) {
  try {
    localStorage.setItem(DOC_TOOLBAR_MODE_KEY, mode);
  } catch {
    /* private mode: it just won't be remembered */
  }
  applyDocToolbarMode(mode);
}

document.getElementById("doc-toolbar-mode")?.addEventListener("click", () => {
  setDocToolbarMode(docToolbarMode() === "row" ? "wrap" : "row");
});

//: **The two controls that were asked for, on the toolbar itself.**
//:
//: Reported: *"cant collapse and make horizontally scrollable the tools bar in
//: the notes capture subtab and documents editor."* Half of that was already
//: built and unfindable: the wrap/scroll switch existed, buried in the
//: document dock's ⋯ menu, four clicks from the strip it changes, and the note
//: composer's toolbar had no way to reach it at all. The other half, collapse,
//: did not exist: on a laptop the expanded strip is two rows of chrome above a
//: three-row note box.
//:
//: Built in script rather than written into the markup twice, because there
//: are two toolbars and a third would silently miss out. Pinned to the right
//: edge with `position: sticky` so that in scroll mode the controls do not
//: scroll away with the buttons they control.
//: **Line numbers are a choice, not a file-type consequence.** Asked for
//: directly: "line numbers should be togglable in the documents". They used to
//: appear for code files and for nothing else, so a long markdown note -- the
//: thing most likely to need "the paragraph around line 240" -- could not have
//: them, and a .py file could not be rid of them.
//:
//: Default follows the old behaviour (on for code, off for prose), so nothing
//: moves for anyone who never touches the control; once touched, the choice is
//: remembered and wins for every file.
const DOC_GUTTER_KEY = "doc-gutter";

function docGutterPref() {
  try {
    return localStorage.getItem(DOC_GUTTER_KEY); // "1", "0", or null for "follow the file type"
  } catch {
    return null;
  }
}

function docGutterWanted(isCode) {
  const pref = docGutterPref();
  if (pref === "1") return true;
  if (pref === "0") return false;
  return Boolean(isCode);
}

function setDocGutter(on) {
  try {
    localStorage.setItem(DOC_GUTTER_KEY, on ? "1" : "0");
  } catch {
    /* private mode: the choice holds for this session only */
  }
  applyDocGutter();
}

//: Reads the *current* file's type rather than taking it as an argument, so
//: the toggle and the file-open path cannot disagree about what "code" means.
function applyDocGutter() {
  // One remembered choice for every editor. The documents editor keeps its
  // "follow the file type" default (code files number themselves); a note
  // box has no file type, so there the choice alone decides.
  let anyOn = false;
  for (const { gutter, box } of docGutters()) {
    const isDoc = box.id === "doc-content";
    const on = isDoc
      ? docGutterWanted(box.classList.contains("doc-content-code"))
      : docGutterPref() === "1";
    gutter.classList.toggle("hidden", !on);
    //: Numbers only line up against hard lines, so a numbered box stops
    //: soft-wrapping, which is the same rule `.doc-content-code` already
    //: applies.
    //:
    //: **The documents editor used to be excluded from this**, on the
    //: assumption that a numbered document is always a code file and so
    //: already has `.doc-content-code`. It is not: `docGutterWanted` honours a
    //: remembered "1", so anyone who turned line numbers on sees them on a
    //: markdown document too, where the textarea soft-wraps and the column
    //: does not. That is one number lost per wrapped line, accumulating down
    //: the file, which is exactly the "line numbers drift out of sync with the
    //: text" that was reported.
    box.classList.toggle("has-gutter", on);
    anyOn = anyOn || on;
  }
  syncDocGutterMetrics();
  watchDocGutter(docBoxEl());
  //: The document's own numbers come from the engine once it is mounted, so
  //: the preference has to reach it as well as the two note columns.
  docCmSyncGutter();
  for (const button of document.querySelectorAll(".doc-toolbar-gutter")) {
    const bar = button.closest(".doc-toolbar");
    const own = bar?.id === "doc-toolbar"
      ? docCmView
        ? docGutterWanted(!docFileType().previewable)
        : !$("doc-gutter")?.classList.contains("hidden")
      : docGutterPref() === "1";
    button.setAttribute("aria-pressed", own ? "true" : "false");
    button.title = own ? "Hide line numbers" : "Show line numbers";
    button.setAttribute("aria-label", button.title);
  }
  renderDocGutter();
}

const DOC_TOOLBAR_COLLAPSED_KEY = "doc-toolbar-collapsed";

function docToolbarCollapsed() {
  try {
    // Collapsed until you ask for it (PLAN.md D1): Typora, iA Writer and
    // Notion all start with no formatting strip on screen, the strip is a
    // 30-control, three-row block that pushed the first line of text to
    // y=284 at 1440px. The collapsed strip keeps its own name and the
    // chevron that brings it back, and a choice either way is remembered.
    return (localStorage.getItem(DOC_TOOLBAR_COLLAPSED_KEY) ?? "1") === "1";
  } catch {
    return false; // private mode: the expanded shape is the safe default
  }
}

//: `only`: one strip, which may not be in the document yet. Both appliers are
//: what actually draw the wrap and collapse glyphs (`setLabel` lives here, not
//: at the buttons' creation), and both used to walk the document -- so a bar
//: mounted before insertion, which is exactly what the note edit form's cloned
//: strip is, ended up with two blank buttons.
function applyDocToolbarCollapsed(collapsed, only = null) {
  // The documents dock's own strip has a toggle in the header row (PLAN.md
  // D1); the strip itself hides entirely while collapsed, so the header
  // button is the way back and must say which state it is in.
  const headerToggle = $("doc-format-toggle");
  if (headerToggle && (!only || only.id === "doc-toolbar")) {
    headerToggle.setAttribute("aria-pressed", collapsed ? "false" : "true");
    headerToggle.title = collapsed
      ? "Show the formatting tools"
      : "Hide the formatting tools";
    headerToggle.setAttribute("aria-label", headerToggle.title);
  }
  for (const bar of only ? [only] : document.querySelectorAll(".doc-toolbar")) {
    bar.classList.toggle("is-collapsed", collapsed);
    const button = bar.querySelector(".doc-toolbar-collapse");
    if (!button) continue;
    button.setAttribute("aria-pressed", collapsed ? "true" : "false");
    button.title = collapsed ? "Show the formatting tools" : "Hide the formatting tools";
    button.setAttribute("aria-label", button.title);
    setLabel(button, collapsed ? "ph:caret-down" : "ph:caret-up");
  }
}

function setDocToolbarCollapsed(collapsed) {
  try {
    localStorage.setItem(DOC_TOOLBAR_COLLAPSED_KEY, collapsed ? "1" : "0");
  } catch {
    /* private mode: it just won't be remembered */
  }
  applyDocToolbarCollapsed(collapsed);
}

//: One strip's wrap/collapse group. Split out of the loop below so a bar that
//: is *not* in the document yet can get one: the note edit form clones the
//: capture strip, and a clone carries a copy of this group whose listeners did
//: not survive cloning -- two dead arrow buttons, sitting mid-strip instead of
//: at the end, because the loop's own `continue` then decided the bar already
//: had its controls. Counted in the browser: the clone's group sat between the
//: Preview button and the indent separator, where the capture strip's is last.
function mountDocToolbarControlsFor(bar) {
  {
    if (bar.querySelector(".doc-toolbar-tools")) return;
    const tools = document.createElement("span");
    tools.className = "doc-toolbar-tools";

    //: Shown only while collapsed, so the strip still says what it is rather
    //: than becoming an unexplained bar with two arrows in it.
    const name = document.createElement("span");
    name.className = "doc-toolbar-collapsed-name";
    name.textContent = "Formatting";
    tools.appendChild(name);

    const layout = document.createElement("button");
    layout.type = "button";
    layout.className = "ghost small icon-only doc-toolbar-layout";
    layout.addEventListener("click", () => {
      setDocToolbarMode(docToolbarMode() === "row" ? "wrap" : "row");
      applyDocToolbarLayoutButtons();
    });
    tools.appendChild(layout);

    const gutter = document.createElement("button");
    gutter.type = "button";
    gutter.className = "ghost small icon-only doc-toolbar-gutter";
    setLabel(gutter, "ph:list-numbers");
    gutter.addEventListener("click", () => {
      // The strip's own button reads its own gutter: the documents strip
      // asks #doc-gutter, a note strip asks the remembered choice.
      const own = bar.id === "doc-toolbar"
        ? docCmView
          ? !docGutterWanted(!docFileType().previewable)
          : $("doc-gutter")?.classList.contains("hidden")
        : docGutterPref() !== "1";
      setDocGutter(own);
    });
    tools.appendChild(gutter);

    const collapse = document.createElement("button");
    collapse.type = "button";
    collapse.className = "ghost small icon-only doc-toolbar-collapse";
    collapse.addEventListener("click", () => setDocToolbarCollapsed(!docToolbarCollapsed()));
    tools.appendChild(collapse);

    bar.appendChild(tools);
  }
  //: **Both buttons are drawn here, not by the caller.** Reported with a
  //: screenshot: "the note edit toolbar buttons on the bottom right dont
  //: render and show as black boxes". Neither button is given an icon when it
  //: is created -- `applyDocToolbarLayoutButtons` and `applyDocToolbarCollapsed`
  //: are what call `setLabel` on them, and both used to run once at the end of
  //: the document-wide loop below. A bar mounted on its own (the note edit
  //: form's cloned strip) therefore got two empty buttons: correct size,
  //: correct background, no glyph and no text.
  applyDocToolbarLayoutButtons(bar);
  applyDocToolbarCollapsed(docToolbarCollapsed(), bar);
  applyDocGutter();
}

function mountDocToolbarControls() {
  $("doc-format-toggle")?.addEventListener("click", () =>
    setDocToolbarCollapsed(!docToolbarCollapsed())
  );
  // The capture box gets its gutter here, once, with the strip that toggles it.
  mountGutterFor($("entry-content"));
  for (const bar of document.querySelectorAll(".doc-toolbar")) mountDocToolbarControlsFor(bar);
  applyDocToolbarLayoutButtons();
  applyDocToolbarCollapsed(docToolbarCollapsed());
}

function applyDocToolbarLayoutButtons(only = null) {
  const row = docToolbarMode() === "row";
  const scope = only || document;
  for (const button of scope.querySelectorAll(".doc-toolbar-layout")) {
    button.setAttribute("aria-pressed", row ? "true" : "false");
    //: The tooltip names what pressing it *does*; `aria-pressed` carries the
    //: state. Same rule the dock menu's own label follows.
    button.title = row ? "Expand the toolbar over several rows" : "Fit the toolbar on one scrolling row";
    button.setAttribute("aria-label", button.title);
    setLabel(button, row ? "ph:rows" : "ph:arrows-left-right");
  }
}

//: Applied on load as well as on click: the toolbar exists before a document
//: is opened, and a remembered mode that only took effect after the next
//: toggle would read as the setting not having been saved.
applyDocToolbarMode(docToolbarMode());
mountDocToolbarControls();

// =============================================================================
// The editor's own instruments: counts, completion, prose checks, autocorrect
// =============================================================================
//
// Asked for directly: *"improve and expand on some features in the document
// editor, take inspo from vs code and word with options to view more info like
// character count, inline auto fill suggestions, grammar checker + auto correct
// etc."*
//
// **Everything below is local arithmetic over the text in the box.** No model,
// no network, no service, which is not a limitation here, it is the
// requirement: this app's whole claim is that it works with the plug pulled,
// and a grammar checker that phones a server would be the first thing in it
// that does not. It also means every one of these is instant, which is what
// makes them usable while typing at all.
//
// What that rules out is honest to state: this cannot judge *meaning*. It will
// not know that a sentence is wrong, only that it repeats a word, runs long,
// or contains a spelling this list is sure about. Rules that would need
// judgement (its/it's, their/there in context) are deliberately absent, 
// a checker that is wrong a third of the time teaches people to ignore it,
// and then the two thirds it is right about go unread too.

//: The one surface each instrument acts on: whichever box the caret is in.
//: There is one editor now, in every view, so this is almost always the
//: document's own surface; the check survives because the fallback textarea
//: is still a real box when the engine is unavailable.
function docActiveBox() {
  const active = document.activeElement;
  if (active instanceof HTMLTextAreaElement && active.id === "doc-content") {
    return textareaSurface(active);
  }
  //: CodeMirror's editable is a `div`, not a textarea, so the check above
  //: cannot see it. `asSurface` maps any node inside the view onto the
  //: document's surface, which is what makes the caret-following instruments
  //: (the status bar, the completion popup, the findings menu) keep working
  //: once the engine is under them.
  return asSurface(active) || docSurface();
}

//: **Where the caret is, in pixels.** The standard mirror technique: a hidden
//: div that copies every property that affects text layout, holds the text up
//: to the caret, and reports where a marker span lands. There is no API for
//: this: `selectionStart` is an index, and a popup has to go somewhere on
//: screen.
//:
//: The property list is the part that has to be right: miss `font-family` or
//: `padding` and the popup drifts further from the caret the further down the
//: document you are, which reads as a positioning bug rather than a missing
//: line of CSS.
const DOC_MIRROR_PROPS = [
  "boxSizing", "width", "borderLeftWidth", "borderRightWidth", "borderTopWidth",
  "paddingTop", "paddingRight", "paddingBottom", "paddingLeft",
  "fontFamily", "fontSize", "fontWeight", "fontStyle", "letterSpacing",
  "lineHeight", "textTransform", "textIndent", "whiteSpace", "wordSpacing",
  "tabSize",
];

let docMirror = null;

//: The mirror itself, over a real textarea and an offset in its value. Split
//: out of `docCaretPoint` because it is the *textarea's* answer to the
//: question: CodeMirror has `coordsAtPos` and needs none of this, so the
//: adapter routes each surface to whichever one is right for it.
function docMirrorPoint(el, pos) {
  if (!docMirror) {
    docMirror = document.createElement("div");
    docMirror.className = "doc-caret-mirror";
    document.body.appendChild(docMirror);
  }
  const style = getComputedStyle(el);
  for (const prop of DOC_MIRROR_PROPS) docMirror.style[prop] = style[prop];
  //: `pre-wrap`, always: a textarea wraps and preserves whitespace, and a
  //: mirror that collapsed spaces would put the caret a word early on every
  //: line that has two of them.
  docMirror.style.whiteSpace = "pre-wrap";
  docMirror.style.overflowWrap = "break-word";
  docMirror.textContent = el.value.slice(0, pos);
  const marker = document.createElement("span");
  //: A zero-width space rather than nothing: an empty span has no box, so it
  //: reports the wrong position at the end of a line.
  marker.textContent = "​";
  docMirror.appendChild(marker);
  const boxRect = el.getBoundingClientRect();
  const markRect = marker.getBoundingClientRect();
  const mirrorRect = docMirror.getBoundingClientRect();
  const lineHeight = Number.parseFloat(style.lineHeight) || 18;
  const top = boxRect.top + (markRect.top - mirrorRect.top) - el.scrollTop;
  return {
    left: boxRect.left + (markRect.left - mirrorRect.left) - el.scrollLeft,
    top,
    bottom: top + lineHeight,
    lineHeight,
  };
}

//: **Where the caret is, in pixels, for whichever surface holds it.** The
//: shape the plan names (`coordsAt(pos) -> {left, top, bottom}`), with the
//: line height carried alongside because every caller here places a popup
//: *under* the line and needs to know how tall it is.
function docCaretPoint(box) {
  return box.coordsAt(box.selection().from);
}

// --- the status bar -----------------------------------------------------------

const DOC_READING_WPM = 220;

//: Line and column are 1-based, because that is what every editor and every
//: error message in the world means by them.
//: **Asked of the surface, not counted from the start of the document.**
//: This used to slice the text up to the caret and split it on newlines,
//: which is a whole-document pass on every keystroke *and* on every caret
//: move. CodeMirror keeps a line index and answers in O(log n); the fallback
//: textarea's own `lineAt` does the same slice it always did, on the only
//: surface that has no better answer. Measured on the plan's 20k-word
//: document: this and the two passes below were what stood between the
//: engine and the 30 ms gate once the block renderer was gone.
function docCaretStats(box) {
  const range = box.selection();
  const line = box.lineAt(range.from);
  return {
    line: line.number,
    column: range.from - line.from + 1,
    selected: range.to - range.from,
  };
}

//: The caret half of the status bar: cheap, and so run on every keystroke and
//: every selection change.
function renderDocCaret() {
  const box = docActiveBox();
  const caret = $("doc-caret");
  if (!box || !caret) return;
  //: **One set of coordinates now.** This used to have a second branch that
  //: translated a live-view paragraph's own offsets into the document's,
  //: because Live gave every paragraph its own box and a line number counted
  //: inside one of them was a lie about the document. With Live and Source as
  //: one editor there is nothing to translate, and the bar can no longer say
  //: "In a paragraph" because there is no paragraph to be lost in.
  const stats = docCaretStats(box);
  caret.textContent = `Ln ${stats.line}, Col ${stats.column}${
    stats.selected ? ` · ${stats.selected} selected` : ""
  }`;
}

//: The counts. A whole-document pass, which is why it is scheduled rather
//: than run on the keystroke (see `scheduleDocFacts`).
function renderDocCounts() {
  const counts = $("doc-counts");
  if (!counts) return;
  const text = docText();
  const words = (text.match(/\S+/g) || []).length;
  const chars = text.length;
  const minutes = words / DOC_READING_WPM;
  const read =
    !words ? "" : minutes < 1 ? "under a min" : minutes < 60
      ? `${Math.round(minutes)} min read`
      : `${(minutes / 60).toFixed(1)}h read`;
  //: Characters first, because that is the one the existing header line never
  //: showed and the one that was asked for by name.
  counts.textContent = [
    `${chars.toLocaleString()} char${chars === 1 ? "" : "s"}`,
    `${words.toLocaleString()} word${words === 1 ? "" : "s"}`,
    read,
  ]
    .filter(Boolean)
    .join(" · ");
}

function renderDocStatusBar() {
  renderDocCaret();
  renderDocCounts();
}

//: **The facts about the whole document, on a pause rather than on a
//: keystroke.**
//:
//: The word goal, the outline and the status bar's counts each walk the
//: entire text. On the plan's 20k-word document that is three passes over
//: 130,000 characters per character typed, and it is most of what was left
//: between the editor and PLAN P4's 30 ms gate once the Live view stopped
//: rebuilding a thousand blocks. None of the three is *state*: they are
//: readouts, and a readout that lands 120 ms after you stop typing is a
//: readout nobody notices arriving late. Exactly the argument
//: `scheduleDocPreview` already makes a few storeys up, and the same shape:
//: a trailing debounce, then an idle callback with a ceiling so a busy tab
//: still repaints within a third of a second.
//:
//: Anything that needs them *now* (opening a document, a restore, a view
//: switch) still calls the three directly.
let docFactsTimer = null;

function scheduleDocFacts() {
  clearTimeout(docFactsTimer);
  docFactsTimer = setTimeout(() => {
    docFactsTimer = null;
    const run = () => {
      renderDocStats();
      renderDocOutline();
      renderDocCounts();
    };
    if (typeof requestIdleCallback === "function") requestIdleCallback(run, { timeout: 300 });
    else requestAnimationFrame(run);
  }, 120);
}

// --- the prose check ----------------------------------------------------------
//
// **Rules, not judgement.** Each one has to be something a regular expression
// can be *sure* about, because a checker that is wrong a third of the time
// teaches people to ignore it, and then the two thirds it is right about go
// unread too. That is why there is no its/it's rule here: telling those apart
// needs the sentence's meaning, and this has none.
//
// `fix` is optional. A rule that can state the problem but not the answer
// ("this sentence is 47 words long") still earns its row: knowing where to look
// is most of the work. Only rules with a `fix` get a button.
const DOC_PROSE_RULES = [
  {
    id: "repeat",
    //: The classic, and the one nobody catches by re-reading: the eye supplies
    //: the missing word. Case-insensitive, and only for words worth repeating
    //: by accident: `\b(\w+)\s+\1\b` alone flags "had had" and "that that",
    //: which are both real English.
    test: /\b(the|a|an|and|to|of|in|is|it|that|for|on|with|as|at|be)\s+\1\b/gi,
    message: "The same word twice in a row",
    fix: (match) => match.split(/\s+/)[0],
  },
  {
    id: "double-space",
    test: /(?<=\S) {2,}(?=\S)/g,
    message: "More than one space between words",
    fix: () => " ",
  },
  {
    id: "space-before-punctuation",
    test: /\s+([,.;:!?])/g,
    message: "A space before punctuation",
    fix: (match) => match.trim(),
  },
  {
    id: "missing-space",
    //: After a full stop and before a capital, not after every full stop,
    //: because `3.5`, `file.md` and `e.g.` are all correct and common.
    test: /[a-z]{2}[.!?](?=[A-Z])/g,
    message: "No space after the full stop",
    fix: (match) => `${match} `,
  },
  {
    id: "missing-space-comma",
    //: Only before a letter. `1,000` and `a[1,2]` are both correct and common,
    //: and a rule that reformatted numbers would be worse than no rule.
    test: /,(?=[A-Za-z])/g,
    message: "No space after the comma",
    fix: () => ", ",
  },
  {
    id: "double-punctuation",
    test: /([,;:])\1+/g,
    message: "Punctuation repeated",
    fix: (match) => match[0],
  },
  {
    id: "spelling",
    //: The same list autocorrect uses, so a document written with autocorrect
    //: off can still be cleaned up in one pass afterwards. Built below from
    //: `DOC_AUTOCORRECT` rather than typed twice.
    test: null,
    message: "A likely typo",
  },
  {
    id: "long-sentence",
    //: 45 words is not wrong, and this does not say it is, it says look here.
    //: No `fix`, because splitting a sentence is a decision about meaning and
    //: this knows none.
    test: null,
    message: "A very long sentence, worth a full stop somewhere",
  },
];

//: **Unambiguous typos only.** Every entry here is a string that is not a word
//: in any English text, which is the bar an automatic replacement has to
//: clear, because the cost of being wrong is that the app silently changed
//: something the writer meant. `alot` is in; `dont` is not (an apostrophe is a
//: style choice, and in a code block it is a quote).
const DOC_AUTOCORRECT = {
  teh: "the", adn: "and", taht: "that", tehn: "then", thsi: "this",
  thier: "their", recieve: "receive", recieved: "received", seperate: "separate",
  seperated: "separated", occured: "occurred", occuring: "occurring",
  definately: "definitely", wich: "which", becuase: "because", becasue: "because",
  alot: "a lot", accomodate: "accommodate", acheive: "achieve", acheived: "achieved",
  arguement: "argument", beleive: "believe", calender: "calendar",
  concious: "conscious", embarass: "embarrass", enviroment: "environment",
  existance: "existence", goverment: "government", independant: "independent",
  neccessary: "necessary", occassion: "occasion", persistant: "persistent",
  publically: "publicly", recomend: "recommend", refered: "referred",
  succesful: "successful", tommorow: "tomorrow", untill: "until",
  wierd: "weird", writting: "writing", youre: "you're", ot: "to",
};

const DOC_LONG_SENTENCE_WORDS = 45;

//: Findings, in document order, each with the exact span it is about so the
//: panel can jump to it and the fix can replace it without searching for the
//: text again (which would find the wrong occurrence in a document that says
//: the same thing twice).
function docProseFindings(text) {
  const found = [];
  for (const rule of DOC_PROSE_RULES) {
    if (!rule.test) continue;
    //: A fresh regex per pass: these carry `g`, and `lastIndex` survives
    //: between calls on a shared object, which silently skips half the
    //: document on every second run.
    const pattern = new RegExp(rule.test.source, rule.test.flags);
    let match;
    while ((match = pattern.exec(text)) !== null) {
      if (!match[0].length) break; // a zero-width match would loop forever
      found.push({
        rule: rule.id,
        message: rule.message,
        start: match.index,
        end: match.index + match[0].length,
        text: match[0],
        replacement: rule.fix ? rule.fix(match[0]) : null,
      });
    }
  }
  //: Spelling, word by word, so the span is the word and not a substring of a
  //: longer one: a regex over the whole list would flag "ot" inside "not".
  const word = /[A-Za-z']+/g;
  const dictionary = docDictionary();
  const variants = docVariantLookup();
  let hit;
  while ((hit = word.exec(text)) !== null) {
    const lower = hit[0].toLowerCase();
    //: A word in the dictionary is a word. This is the whole point of having
    //: one: the third time a checker flags your project's name, a checker you
    //: cannot answer is a checker you turn off.
    if (dictionary.has(lower)) continue;
    const variant = variants.get(lower);
    if (variant) {
      found.push({
        rule: "variant",
        message: `${docSpellingVariant() === "uk" ? "UK" : "US"} spelling: “${variant}”`,
        start: hit.index,
        end: hit.index + hit[0].length,
        text: hit[0],
        replacement:
          hit[0][0] === hit[0][0].toUpperCase()
            ? variant[0].toUpperCase() + variant.slice(1)
            : variant,
      });
      continue;
    }
    const better = DOC_AUTOCORRECT[lower];
    if (!better) continue;
    found.push({
      rule: "spelling",
      message: `“${hit[0]}” is probably “${better}”`,
      start: hit.index,
      end: hit.index + hit[0].length,
      text: hit[0],
      //: Keeps the writer's capitalisation: a typo at the start of a sentence
      //: must not be corrected into a lowercase word.
      replacement: hit[0][0] === hit[0][0].toUpperCase()
        ? better[0].toUpperCase() + better.slice(1)
        : better,
    });
  }
  //: Long sentences, measured over the prose only. Code fences and headings
  //: are skipped: a fenced block has no sentences, and a heading that runs
  //: long is a heading, not a run-on.
  let index = 0;
  for (const chunk of text.split(/\n\s*\n/)) {
    const at = index;
    index += chunk.length + 2;
    if (/^\s*(?:```|~~~|#|\||>)/.test(chunk)) continue;
    let cursor = 0;
    for (const sentence of chunk.split(/(?<=[.!?])\s+/)) {
      const words = (sentence.match(/\S+/g) || []).length;
      if (words > DOC_LONG_SENTENCE_WORDS) {
        found.push({
          rule: "long-sentence",
          message: `${words} words in one sentence`,
          start: at + cursor,
          end: at + cursor + sentence.length,
          text: sentence,
          replacement: null,
        });
      }
      cursor += sentence.length + 1;
    }
  }
  return found
    .filter((finding) => !docProseIgnored.has(docProseKey(finding)))
    .sort((a, b) => a.start - b.start);
}

let docProseFound = [];

function renderDocProse() {
  const chip = $("doc-prose");
  const count = $("doc-prose-count");
  const panel = $("doc-prose-panel");
  if (!chip || !count || !panel) return;
  //: A code file has no prose. Running these rules over one would flag `==`,
  //: `;;` and every long line, which is noise a programmer cannot turn off
  //: fast enough.
  const isCode = !docFileType().previewable;
  docProseFound = isCode ? [] : docProseFindings(docText());
  chip.hidden = isCode;
  count.textContent = docProseFound.length
    ? `${docProseFound.length} suggestion${docProseFound.length === 1 ? "" : "s"}`
    : "No suggestions";
  chip.classList.toggle("has-findings", docProseFound.length > 0);
  //: A fresh set of findings means a fresh set of marks. The engine is told
  //: through an effect rather than by rebuilding anything: the decorations are
  //: computed from `docProseFound` over the visible lines, so the repaint is a
  //: screenful whatever the document's length.
  docCmRepaintFindings();
  if (!panel.classList.contains("hidden")) renderDocProsePanel();
}

// =============================================================================
// The three shapes a finding is drawn in (DOCUMENTS_PLAN Phase 0 and Phase 2)
// =============================================================================
//
// **What used to be here, and where it went.** Phase 0 drew the findings on a
// `<div>` behind the textarea: same text, same type, same size, with the
// textarea's own ink turned transparent so the reader looked at the div and
// typed into the box. It was the standard technique and it was the right
// answer while the surface was a textarea, but it cost twenty-six computed
// properties copied on every resize to keep two layers of glyphs on top of
// each other, and the comment it carried recorded what happens when one of
// them is missed: the underline is right at the top of the file and a word
// out by the bottom.
//
// Phase 2 decision 5 retires it. The findings are mark decorations inside the
// engine now (`docFindingsPlugin`), which have no geometry to keep in step
// because they *are* the text, and they are drawn in every view rather than
// only in the two the backdrop could cover. What is left here is the part
// that was never about the layer: which findings are drawable at all, and
// what shape each kind gets.

//: A long sentence is the one finding that must not be underlined: the span
//: is a whole paragraph, and a wavy line under all of it says "everything
//: here is wrong", which is the opposite of what that finding means.
const DOC_FINDING_SKIP = new Set(["long-sentence"]);

//: Three kinds, because three is what a reader can decode at a glance from
//: the shape of a line. The rules are more numerous than that (there are
//: eight), but "a spacing slip" and "a UK/US spelling" are the same *kind* of
//: note as far as the eye is concerned, and both are answered the same way.
function docFindingKind(finding) {
  if (finding.rule === "spelling") return "spelling";
  if (finding.rule === "repeat") return "repeat";
  return "style";
}


//: One header for both states of the panel: what it is, what can be done to
//: all of it at once, and the way out.
function docProseHeader() {
  const head = document.createElement("div");
  head.className = "row doc-prose-head";
  const title = document.createElement("strong");
  title.className = "doc-prose-title";
  title.textContent = docProseFound.length
    ? `${docProseFound.length} suggestion${docProseFound.length === 1 ? "" : "s"}`
    : "Writing suggestions";
  head.appendChild(title);

  const tools = document.createElement("span");
  tools.className = "row doc-prose-tools";
  const fixable = docProseFound.filter((f) => f.replacement !== null);
  if (fixable.length) {
    const all = document.createElement("button");
    all.type = "button";
    all.className = "ghost small doc-prose-fix-all";
    setLabel(all, `ph:magic-wand Fix ${fixable.length}`);
    all.title = "Apply every suggestion that has one clear answer";
    all.addEventListener("click", () => docProseFixAll());
    tools.appendChild(all);
  }
  //: **The rules stop at the sentence's own shape: meaning needs a model.**
  //: ROADMAP.md names the gap directly: no its/it's, no subject-verb
  //: agreement, no tense consistency, because every one of those needs to
  //: understand what the sentence is *saying*, not just how it is spelled or
  //: spaced. That is exactly what the local model is for, and exactly why this
  //: is a button rather than a background pass: judging meaning takes seconds,
  //: not milliseconds, and a check that ran on every keystroke would turn this
  //: editor into one that visibly stutters while you type. On request, it
  //: costs nothing until asked for; as a pass, it would cost something on
  //: every single character.
  const aiReview = smallButton(
    "ph:sparkle Check with AI",
    "Ask the local model to read for things spelling and grammar rules can't catch: its/it's, agreement, tense, tone, clarity",
    () => docAiReview()
  );
  tools.appendChild(aiReview);
  //: The dictionary is reachable from the thing that uses it. A word list you
  //: can add to and never see again is a list nobody trusts.
  const dict = smallButton("ph:book-open-text Dictionary", "Words you have told this to accept", () =>
    openDocDictionary()
  );
  tools.appendChild(dict);
  const close = smallButton("ph:x", "Close the suggestions", () => closeDocProsePanel());
  close.classList.add("icon-only", "doc-prose-close");
  close.setAttribute("aria-label", "Close the suggestions");
  tools.appendChild(close);
  head.appendChild(tools);
  return head;
}

function closeDocProsePanel() {
  $("doc-prose-panel")?.classList.add("hidden");
  $("doc-prose")?.setAttribute("aria-expanded", "false");
  //: Focus goes back to the control that opened it, or it lands on the body
  //: and the next Tab starts from the top of the page.
  $("doc-prose")?.focus();
}

function renderDocProsePanel() {
  const panel = $("doc-prose-panel");
  if (!panel) return;
  panel.replaceChildren();
  //: The header first, always, including on the empty state. Reported:
  //: "there's no close x button." A panel whose only exit is the control that
  //: opened it is a panel you have to remember how to leave, and the empty
  //: state was the one view where that was most likely.
  if (!docProseFound.length) {
    panel.appendChild(docProseHeader());
    const empty = document.createElement("p");
    empty.className = "muted doc-prose-empty";
    empty.textContent =
      "Nothing to flag. These checks are spelling, spacing and sentence length, they read the text, not its meaning.";
    panel.appendChild(empty);
    return;
  }
  panel.appendChild(docProseHeader());

  //: **Grouped by kind, with a count on each group** (DOCUMENTS_PLAN Phase 0
  //: item 3). A flat list of twenty rows is twenty separate decisions in
  //: whatever order the document happens to put them; "Spelling 3 / Style 11 /
  //: Repeated words 2" is one look that tells you what kind of pass this
  //: document needs, and it lets you do all of one kind at a time, which is
  //: how anyone actually edits. The order is fixed rather than by size, so the
  //: strongest claim is always at the top and the panel does not reshuffle
  //: itself between two openings.
  for (const [kind, label] of DOC_FINDING_GROUPS) {
    const group = docProseFound.filter((finding) => docFindingKind(finding) === kind);
    if (!group.length) continue;
    const heading = document.createElement("p");
    heading.className = "doc-prose-group";
    const name = document.createElement("span");
    name.textContent = label;
    const count = document.createElement("span");
    count.className = "doc-prose-group-count";
    count.textContent = String(group.length);
    heading.append(name, count);
    panel.appendChild(heading);
    panel.appendChild(docProseGroupList(group));
  }
}

//: The three kinds the underlines already draw, in the order of how strong a
//: claim each one is. Named here rather than in the panel so the group title
//: and the squiggle can never drift apart.
const DOC_FINDING_GROUPS = [
  ["spelling", "Spelling"],
  ["repeat", "Repeated words"],
  ["style", "Style and spacing"],
];

//: Sixty rows, over all the groups rather than per group: the cap is there so
//: a pathological document cannot build ten thousand elements, and a cap that
//: applied per group would let three kinds multiply it by three.
const DOC_PROSE_ROWS = 60;

function docProseGroupList(findings) {
  const list = document.createElement("ul");
  list.className = "doc-prose-list";
  for (const finding of findings.slice(0, DOC_PROSE_ROWS)) {
    const li = document.createElement("li");
    li.className = "doc-prose-row";
    const jump = document.createElement("button");
    jump.type = "button";
    jump.className = "doc-prose-jump";
    const what = document.createElement("span");
    what.className = "doc-prose-what";
    what.textContent = finding.message;
    const where = document.createElement("span");
    where.className = "doc-prose-where muted";
    //: The words themselves, trimmed, a row reading only "a very long
    //: sentence" makes you go and find it, which is the work the row was
    //: supposed to save. `docFindingLabel` for the same reason the menu's
    //: heading uses it: a spacing finding's own text is whitespace, and a row
    //: with a blank second half reads as a row that failed to load.
    where.textContent = finding.text.trim()
      ? finding.text.replace(/\s+/g, " ").slice(0, 80)
      : docFindingLabel(finding);
    jump.append(what, where);
    jump.title = "Show me this in the document, and what can be done about it";
    jump.addEventListener("click", (event) => {
      docProseJump(finding);
      //: The row *is* the flagged word as far as this panel is concerned, so
      //: pressing it opens the same menu the word itself does, anchored to
      //: the row, which is the thing the pointer is on.
      openDocSuggest(finding, event.currentTarget.getBoundingClientRect());
    });
    li.appendChild(jump);
    if (finding.replacement !== null) {
      const fix = document.createElement("button");
      fix.type = "button";
      fix.className = "ghost small doc-prose-fix";
      setLabel(fix, "ph:check");
      fix.title = `Change it to “${finding.replacement}”`;
      fix.setAttribute("aria-label", fix.title);
      fix.addEventListener("click", () => docProseFix(finding));
      li.appendChild(fix);
    }
    list.appendChild(li);
  }
  return list;
}

//: **Show me where: and make it obvious for a moment.**
//:
//: Asked for directly: "if I click on an issue flagged in the document
//: suggestions, it should auto scroll to the issue and temporarily highlight
//: the offending area." The scrolling half was here already; the highlight was
//: a text selection, which is the quietest mark a screen has, the same grey
//: as any other selection, in a box the pointer has just left, several
//: paragraphs from where the eye was. Landing in roughly the right place with
//: nothing saying "here" is what makes a jump feel like it did not happen.
//:
//: One way to say it now, because there is one editor. The selection is put
//: on the flagged span and the surface scrolls it into view: CodeMirror does
//: that itself as part of the transaction, and the underline is already there
//: to say which words are meant. The fallback textarea still needs the
//: `blur`+`focus` trick and the accent `::selection` flash, which is the only
//: mark a textarea can draw on a range it already holds.
const DOC_FLASH_MS = 1600;

function docProseJump(finding) {
  //: **No view switch.** This used to drop anyone in Live back into Source to
  //: find the word, which throws away the view they were reading in. Live can
  //: show the underline where it is now, so there is nothing to switch to.
  if (docView === "rendered") setDocView(lastEditView);
  const box = docSurface();
  if (!box) return;
  box.focus();
  box.setSelection(finding.start, finding.end);
  if (box.kind === "codemirror") return;
  box.blur();
  box.focus();
  box.classList.remove("doc-selection-flash");
  void box.offsetWidth;
  box.classList.add("doc-selection-flash");
  setTimeout(() => box.classList.remove("doc-selection-flash"), DOC_FLASH_MS);
}

function docProseApply(text, finding) {
  return text.slice(0, finding.start) + finding.replacement + text.slice(finding.end);
}

function docProseFix(finding) {
  const box = docSurface();
  if (!box || finding.replacement === null) return;
  //: Checked against the document as it is *now*, not as it was when the panel
  //: was drawn. Editing while the panel is open moves every span after the
  //: edit, and applying a stale offset would corrupt the document silently, 
  //: which is the one failure a writing aid must never have.
  if (box.value.slice(finding.start, finding.end) !== finding.text) {
    renderDocProse();
    return toast("That text has changed, the list is refreshed.", true);
  }
  box.value = docProseApply(box.value, finding);
  markDocDirty();
  box.dispatchEvent(new Event("input", { bubbles: true }));
  renderDocProse();
}

function docProseFixAll() {
  const box = docSurface();
  if (!box) return;
  //: Back to front, so each replacement cannot move the offsets of the ones
  //: still to be applied.
  const fixable = docProseFound
    .filter((f) => f.replacement !== null)
    .sort((a, b) => b.start - a.start);
  let text = box.value;
  let applied = 0;
  for (const finding of fixable) {
    if (text.slice(finding.start, finding.end) !== finding.text) continue;
    text = docProseApply(text, finding);
    applied += 1;
  }
  if (!applied) return toast("Nothing left to fix.", true);
  box.value = text;
  markDocDirty();
  box.dispatchEvent(new Event("input", { bubbles: true }));
  renderDocProse();
  toast(`Fixed ${applied}. Ctrl+Z undoes it.`);
}

// --- inline completion --------------------------------------------------------
//
// **Where the words come from, and why not a dictionary.** A generic English
// word list would suggest "thereabouts" while you are writing about your own
// project and never once offer the word you actually use twenty times a day.
// The useful vocabulary of a document is the document, plus the notebook it
// sits in: your project names, your people, your jargon, spelled the way you
// spell them. So the index is built from this document's own words and the
// notebook's note titles and tags, which also means it needs no download, no
// model, and no network, and it is *right* on the first character rather than
// after a paragraph of context.

const DOC_COMPLETE_MIN = 3; //: Below three characters almost anything matches.
const DOC_COMPLETE_MAX = 6;

let docCompleteWords = null;
let docCompleteMatches = [];
let docCompleteIndex = 0;
let docCompleteBox = null;

function docCompleteEnabled() {
  return $("doc-complete")?.checked !== false;
}

//: Rebuilt when the document changes rather than on every keystroke: a
//: 50,000-word document is a real thing to have here, and splitting it on each
//: character typed is the shape that makes an editor feel heavy.
function docBuildVocabulary() {
  const counts = new Map();
  const add = (word, weight) => {
    if (word.length < DOC_COMPLETE_MIN + 1) return;
    counts.set(word, (counts.get(word) || 0) + weight);
  };
  for (const word of docText().match(/[A-Za-z][A-Za-z'-]{2,}/g) || []) {
    //: Weighted above the notebook's words: while writing *this* document, the
    //: word you used two paragraphs ago is far likelier than one from a note
    //: last March.
    add(word, 3);
  }
  const entries = typeof allEntries !== "undefined" ? allEntries : [];
  for (const entry of entries.slice(0, 400)) {
    for (const word of String(entry.content || "").slice(0, 400).match(/[A-Za-z][A-Za-z'-]{2,}/g) || []) {
      add(word, 1);
    }
  }
  for (const doc of typeof docList !== "undefined" && Array.isArray(docList) ? docList : []) {
    for (const word of String(doc.title || "").match(/[A-Za-z][A-Za-z'-]{2,}/g) || []) add(word, 2);
  }
  docCompleteWords = [...counts.entries()].sort((a, b) => b[1] - a[1]);
}

//: The half-typed word immediately before the caret, or null. Deliberately not
//: offered mid-word: a caret inside "compl|etion" is someone fixing a letter,
//: and a popup there is in the way.
//:
//: **Read from the caret's line, not from the start of the document.** This
//: ran on every keystroke and asked the surface for its whole text to slice
//: two short strings out of it, which on a 20k-word document is 130,000
//: characters materialised per character typed: measured, it was the single
//: biggest thing left between the engine and PLAN P4's 30 ms gate. A word
//: fragment cannot span a line break, so the line is all this ever needed.
function docWordFragment(box) {
  const at = box.selection().from;
  const line = box.lineAt(at);
  const column = at - line.from;
  const upto = line.text.slice(0, column);
  const after = line.text.slice(column, column + 1);
  if (after && /[A-Za-z]/.test(after)) return null;
  const match = /[A-Za-z][A-Za-z'-]*$/.exec(upto);
  if (!match || match[0].length < DOC_COMPLETE_MIN) return null;
  //: Never inside a wiki link, that autocomplete owns those keystrokes, and
  //: two popups over one caret is worse than either alone.
  if (/\[\[[^\]]*$/.test(upto)) return null;
  return { start: line.from + match.index, fragment: match[0] };
}

function hideDocComplete() {
  $("doc-complete-list")?.classList.add("hidden");
  docCompleteMatches = [];
  docCompleteBox = null;
}

function renderDocComplete(box) {
  const list = $("doc-complete-list");
  if (!list || !docCompleteEnabled()) return hideDocComplete();
  const at = docWordFragment(box);
  if (!at) return hideDocComplete();
  if (!docCompleteWords) docBuildVocabulary();
  const needle = at.fragment.toLowerCase();
  docCompleteMatches = docCompleteWords
    .filter(([word]) => word.toLowerCase().startsWith(needle) && word.toLowerCase() !== needle)
    .slice(0, DOC_COMPLETE_MAX)
    .map(([word]) => word);
  if (!docCompleteMatches.length) return hideDocComplete();

  docCompleteBox = box;
  docCompleteIndex = Math.min(docCompleteIndex, docCompleteMatches.length - 1);
  list.replaceChildren();
  docCompleteMatches.forEach((word, index) => {
    const li = document.createElement("li");
    li.setAttribute("role", "option");
    li.setAttribute("aria-selected", String(index === docCompleteIndex));
    li.classList.toggle("active", index === docCompleteIndex);
    const head = document.createElement("b");
    head.textContent = word.slice(0, at.fragment.length);
    const rest = document.createElement("span");
    rest.textContent = word.slice(at.fragment.length);
    li.append(head, rest);
    li.addEventListener("mousedown", (event) => {
      //: mousedown, not click: the textarea must not lose focus first, or the
      //: selection this writes into is gone by the time it runs.
      event.preventDefault();
      applyDocComplete(box, word);
    });
    list.appendChild(li);
  });
  const point = docCaretPoint(box);
  //: Kept on screen: a popup at the caret near the right edge or the bottom of
  //: the window would otherwise open off it, which is the app-wide rule for
  //: every menu here.
  list.classList.remove("hidden");
  const width = list.offsetWidth;
  const height = list.offsetHeight;
  const left = Math.min(point.left, window.innerWidth - width - 8);
  const below = point.bottom + 4;
  const top = below + height > window.innerHeight - 8 ? point.top - height - 4 : below;
  list.style.left = `${Math.max(8, left)}px`;
  list.style.top = `${Math.max(8, top)}px`;
}

function applyDocComplete(box, word) {
  const at = docWordFragment(box);
  if (!at) return hideDocComplete();
  //: A range edit rather than a whole-value rewrite: on the engine that keeps
  //: the completion as one undo step over the fragment it replaced, and it
  //: costs the length of the word rather than the length of the document.
  const caret = box.selection().from;
  box.replaceRange(at.start, caret, word);
  box.setSelection(at.start + word.length);
  hideDocComplete();
  box.focus();
  box.dispatchEvent(new Event("input", { bubbles: true }));
}

//: Returns true when it handled the key, so the caller knows not to let the
//: editor's own bindings see it, the same contract `wikiSuggestKeydown` uses.
function docCompleteKeydown(event, box) {
  const list = $("doc-complete-list");
  if (!list || list.classList.contains("hidden")) return false;
  if (event.key === "ArrowDown" || event.key === "ArrowUp") {
    event.preventDefault();
    const step = event.key === "ArrowDown" ? 1 : -1;
    docCompleteIndex =
      (docCompleteIndex + step + docCompleteMatches.length) % docCompleteMatches.length;
    renderDocComplete(box);
    return true;
  }
  //: **Tab, not Enter.** Enter in a document is a new line, and stealing it
  //: for a suggestion is how an autocomplete becomes the thing you fight.
  if (event.key === "Tab") {
    event.preventDefault();
    applyDocComplete(box, docCompleteMatches[docCompleteIndex]);
    return true;
  }
  if (event.key === "Escape") {
    event.preventDefault();
    hideDocComplete();
    return true;
  }
  return false;
}

// --- autocorrect --------------------------------------------------------------

function docAutocorrectEnabled() {
  //: Never in a code file: `teh` may be a variable, and an editor that rewrote
  //: an identifier as you typed it would be unusable.
  return $("doc-autocorrect")?.checked === true && docFileType().previewable;
}

//: Fires on the keystroke that *finishes* a word, a space, a newline or
//: punctuation: which is the only moment a correction is unambiguous. Mid-word
//: it would rewrite "teh" while you were on your way to typing "tehran".
function docAutocorrectAt(box) {
  if (!docAutocorrectEnabled()) return false;
  const caret = box.selection().from;
  //: The caret's line, for the same reason `docWordFragment` reads one: this
  //: runs on every inserted character, and the word it is looking at cannot
  //: begin on a previous line.
  const line = box.lineAt(caret);
  const upto = line.text.slice(0, caret - line.from);
  const match = /([A-Za-z']+)([\s.,;:!?)\]]+)$/.exec(upto);
  if (!match) return false;
  const lower = match[1].toLowerCase();
  //: A word the reader has accepted is never rewritten, whatever the typo list
  //: says. The dictionary is the reader's answer to this feature, and an
  //: autocorrect that ignored it would be the app overruling them mid-sentence.
  if (docDictionary().has(lower)) return false;
  const better = DOC_AUTOCORRECT[lower] || docVariantLookup().get(lower);
  if (!better) return false;
  const replacement = match[1][0] === match[1][0].toUpperCase()
    ? better[0].toUpperCase() + better.slice(1)
    : better;
  const start = caret - match[0].length;
  box.replaceRange(start, caret, replacement + match[2]);
  const next = start + replacement.length + match[2].length;
  box.setSelection(next);
  //: Announced, quietly and once. Software that changes what you typed and
  //: says nothing is the reason people turn autocorrect off, and this one
  //: names both words so a wrong correction is visible rather than found
  //: later.
  toast(`“${match[1]}” → “${replacement}”. Ctrl+Z undoes it.`);
  return true;
}

// --- wiring -------------------------------------------------------------------
//
// One delegated pair on `document` rather than listeners per box: the live
// view replaces its textareas on every render, and per-box listeners are the
// shape that silently accumulates duplicates (tests/test_frontend_handlers.py
// exists because of exactly that).

const DOC_TOOL_KEYS = { autocorrect: "doc-autocorrect", complete: "doc-complete" };

function docToolPref(name, fallback) {
  try {
    const stored = localStorage.getItem(DOC_TOOL_KEYS[name]);
    return stored === null ? fallback : stored === "1";
  } catch {
    return fallback; // private mode: the default shape
  }
}

function docSaveToolPref(name, on) {
  try {
    localStorage.setItem(DOC_TOOL_KEYS[name], on ? "1" : "0");
  } catch {
    /* private mode: it just won't be remembered */
  }
}

const DOC_PROSE_DEBOUNCE_MS = 150;

let docProseTimer = null;
let docVocabTimer = null;

function docToolsOnInput(box) {
  renderDocCaret();
  renderDocComplete(box);
  //: Debounced, both of them: the prose pass walks the whole document and the
  //: vocabulary re-splits it, and neither is worth doing between two
  //: keystrokes.
  //:
  //: **150ms, down from 400.** The pause is no longer only about when the
  //: *panel* is current. Since Phase 0 it is also when the squiggle appears
  //: under the word you just misspelt, and DOCUMENTS_PLAN's acceptance for
  //: that is 300ms from the keystroke. At 400 the underline could not make it
  //: even with a free pass.
  //:
  //: The work itself is cheap, measured on a 2,629-character document in the
  //: sandbox Chromium: 0.82ms to find the findings and 6.3ms for the whole
  //: `renderDocProse`, which repaints the chip and asks the engine for a
  //: decoration pass over the visible lines. So the number here is almost the
  //: whole
  //: latency, and it is set for headroom rather than for the average: at 200
  //: the sweep measured 284ms end to end against a 300ms bound, which is a
  //: check that would fail on a slower machine while nothing was wrong.
  //: Still well over the gap between two keystrokes of ordinary typing, so
  //: this does not run mid-word.
  clearTimeout(docProseTimer);
  docProseTimer = setTimeout(renderDocProse, DOC_PROSE_DEBOUNCE_MS);
  clearTimeout(docVocabTimer);
  docVocabTimer = setTimeout(() => {
    docCompleteWords = null;
  }, 1200);
}

//: **The editing box an event landed in, as a surface.** Three shapes reach
//: this: the fallback textarea, a live-view paragraph, and any node inside
//: CodeMirror's editable, which is a `div` and so matches none of the
//: textarea checks that used to be the whole of this function. Returning null
//: for anything else is what keeps the instruments off the note composer.
function docToolsBoxFor(target) {
  //: A surface as well as a node, because half the callers now hold one
  //: already (`applyMarkdown`'s Undo branch is the one that caught this: with
  //: a surface passed to the old element-only check it returned null and the
  //: toolbar's Undo silently fell through to `execCommand`).
  if (target && (target.kind === "textarea" || target.kind === "codemirror")) {
    return target.isDocument ? target : null;
  }
  if (target instanceof HTMLTextAreaElement) {
    return target.id === "doc-content" ? textareaSurface(target) : null;
  }
  return docEventFromCm(target) ? docSurface() : null;
}

document.addEventListener("input", (event) => {
  //: CodeMirror raises its own `input` on the contenteditable *and* tells us
  //: through the update listener, and the update listener is the one that
  //: also sees scripted changes. Running both would do every pass twice.
  if (docEventFromCm(event.target)) return;
  const box = docToolsBoxFor(event.target);
  if (!box) return;
  //: Autocorrect first, because it edits the value the rest of this then
  //: measures: running the counts before it would show the pre-correction
  //: text for one frame.
  if (event.inputType === "insertText" || event.inputType === "insertLineBreak") {
    docAutocorrectAt(box);
  }
  docToolsOnInput(box);
});

//: **Tab moves between table cells.** `/table` inserts a markdown table, but
//: editing one meant arrowing past every `|` by hand: the one thing every
//: editor with tables (Notion, Obsidian, Typora, Word) does for you. On a
//: line that starts with `|`, Tab selects the next cell's contents and
//: Shift+Tab the previous cell's; Tab in the last cell of the last row adds
//: a row. A separator row (`| --- |`) is skipped over. Returns false on any
//: other line so the indent behaviour below is untouched.
function docTableTab(event, box) {
  const value = box.value;
  const pos = box.selectionStart;
  const lineStart = value.lastIndexOf("\n", pos - 1) + 1;
  let lineEnd = value.indexOf("\n", pos);
  if (lineEnd === -1) lineEnd = value.length;
  const line = value.slice(lineStart, lineEnd);
  if (!/^\s*\|/.test(line)) return false;
  event.preventDefault();
  const pipes = [];
  for (let i = 0; i < line.length; i += 1) if (line[i] === "|" && line[i - 1] !== "\\") pipes.push(i);
  if (pipes.length < 2) return true;
  const col = pos - lineStart;
  const cells = [];
  for (let i = 0; i < pipes.length - 1; i += 1) cells.push([pipes[i] + 1, pipes[i + 1]]);
  const select = (from, to) => {
    // The cell's text without its padding spaces, so typing replaces the
    // placeholder rather than the spaces around it.
    const raw = value.slice(from, to);
    const lead = raw.length - raw.trimStart().length;
    const trail = raw.length - raw.trimEnd().length;
    const a = from + lead, b = Math.max(a, to - trail);
    box.setSelectionRange(a, b);
  };
  const isSeparator = (text) => /^\s*\|?\s*:?-{2,}/.test(text);
  if (event.shiftKey) {
    let index = cells.findIndex(([a, b]) => col >= a && col <= b);
    if (index <= 0) {
      // Previous row's last cell, skipping the separator.
      let prevEnd = lineStart - 1;
      while (prevEnd > 0) {
        const prevStart = value.lastIndexOf("\n", prevEnd - 1) + 1;
        const prev = value.slice(prevStart, prevEnd);
        if (!/^\s*\|/.test(prev)) return true;
        if (!isSeparator(prev)) {
          const last = prev.lastIndexOf("|"), before = prev.lastIndexOf("|", last - 1);
          if (before >= 0) select(prevStart + before + 1, prevStart + last);
          return true;
        }
        prevEnd = prevStart - 1;
      }
      return true;
    }
    select(lineStart + cells[index - 1][0], lineStart + cells[index - 1][1]);
    return true;
  }
  let index = cells.findIndex(([a, b]) => col >= a && col <= b);
  if (index === -1) index = cells.length - 1;
  if (index < cells.length - 1) {
    select(lineStart + cells[index + 1][0], lineStart + cells[index + 1][1]);
    return true;
  }
  // Last cell: next row's first cell, skipping the separator; or a new row.
  let nextStart = lineEnd + 1;
  while (nextStart <= value.length) {
    let nextEnd = value.indexOf("\n", nextStart);
    if (nextEnd === -1) nextEnd = value.length;
    const next = value.slice(nextStart, nextEnd);
    if (!/^\s*\|/.test(next)) break;
    if (!isSeparator(next)) {
      const first = next.indexOf("|"), second = next.indexOf("|", first + 1);
      if (second > first) select(nextStart + first + 1, nextStart + second);
      return true;
    }
    nextStart = nextEnd + 1;
  }
  const blank = "|" + " |".repeat(cells.length);
  const insertAt = lineEnd;
  box.setRangeText("\n" + blank, insertAt, insertAt, "end");
  box.setSelectionRange(insertAt + 1 + 2, insertAt + 1 + 2);
  box.dispatchEvent(new Event("input", { bubbles: true }));
  return true;
}

document.addEventListener("keydown", (event) => {
  const box = docToolsBoxFor(event.target);
  if (!box) return;
  //: Before anything else this editor binds: Tab and the arrows mean the
  //: popup while it is open, and mean their usual thing the instant it is not.
  if (docCompleteKeydown(event, box)) { event.stopPropagation(); return; }
  if (event.key === "Tab" && !event.ctrlKey && !event.altKey && docTableTab(event, box)) {
    event.stopPropagation();
  }
}, true);

//: `selectionchange` is the only event that fires for a caret moved by the
//: keyboard, the mouse *and* by script, a `keyup`/`click` pair misses the
//: third, which is how a status bar drifts out of step with the caret it is
//: describing.
document.addEventListener("selectionchange", () => {
  if (!docToolsBoxFor(document.activeElement)) return;
  renderDocCaret();
});

document.addEventListener("focusout", (event) => {
  //: Only when focus is leaving the editor entirely: moving from one live-view
  //: block to the next must not close a popup that is about to be reopened.
  if (!docToolsBoxFor(event.target)) return;
  setTimeout(() => {
    if (!docToolsBoxFor(document.activeElement)) hideDocComplete();
  }, 0);
});

//: **Clicking the flagged word itself.** Reported: "I cant click on the
//: flagged word or phrase and see a popup for suggested fixes."
//:
//: A `<textarea>` cannot carry marks inside its text, its value is a string,
//: not a DOM: so there is nothing there to underline and nothing to click.
//: What there *is* is a caret with an offset, which is exactly what a finding
//: is expressed in. So: double-click (or right-click) a word, and if a finding
//: covers that offset its menu opens at the caret. Stated plainly because the
//: absence of a squiggle is a real difference from Word, and the reason for it
//: is structural rather than an omission.
//:
//: With CodeMirror under the editor the squiggle is a real decoration in
//: every view, so the gesture below is no longer the substitute it was: it is
//: the keyboard route to the same menu the underline opens.
function docFindingAtOffset(offset) {
  return docProseFound.find((finding) => offset >= finding.start && offset <= finding.end) || null;
}

//: The caret, in the document's own coordinates. One editor, one set of
//: offsets: the live-block translation this used to carry went with the
//: per-paragraph boxes.
function docOffsetOf(box) {
  return box ? box.selection().from : null;
}

//: **The word under the pointer, found by asking the marks rather than the
//: textarea.** Right-clicking a word is how everyone expects to be offered a
//: correction for *that* word, and a right-click does not reliably move the
//: caret first, so reading `selectionStart` answered a question about wherever
//: the caret was last left. That is half of "i still cant select on an
//: underlined incorrectly spelled word and have a popup with suggestions".
//:
//: This used to call `document.caretPositionFromPoint`, and **that was wrong
//: in a way nothing here could see.** Measured in Chromium against a running
//: app: inside a `<textarea>` it returns the offset *within the visual line*,
//: not within the value. A caret at document offset 29 hit-tests as 6, at 50
//: as 5, at 60 as 15. So on every line but the first it looked up a finding at
//: an offset tens or hundreds of characters earlier, which either opened the
//: wrong word's menu or, far more often, silently found nothing and let the
//: browser's own menu through. The feature read as "sometimes it works".
//:
//: Since Phase 0 there is a better answer than an offset: there is a real
//: element at the exact place the finding is, so the question "which finding
//: is under this point" is a rectangle test against boxes the browser itself
//: laid out. No arithmetic, nothing to get wrong about wrapping, and it is the
//: same element the menu is then anchored to.
//:
//: The engine's marks carry the finding's *index* in an attribute rather than
//: a reference: a decoration's DOM is rebuilt whenever the view repaints, so
//: anything hung on the element itself would be gone by the time it was
//: needed. The index is resolved back here, once, against the list the
//: decorations were drawn from.
function docFindingMarks() {
  const marks = [];
  if (docCmView) {
    for (const el of docCmView.dom.querySelectorAll("[data-doc-finding]")) {
      const finding = docProseFound[Number(el.dataset.docFinding)];
      if (!finding) continue;
      el._docFinding = finding;
      marks.push(el);
    }
  }
  return marks;
}

function docFindingAtPoint(x, y) {
  if (typeof x !== "number" || typeof y !== "number") return null;
  for (const mark of docFindingMarks()) {
    if (!mark._docFinding) continue;
    const rect = mark.getBoundingClientRect();
    if (x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom) {
      return mark._docFinding;
    }
  }
  return null;
}

//: Anchored to the word, not to the caret, wherever the word is a real
//: element. A menu that opens at the caret when the pointer is on the word is
//: a menu you have to look away to find.
function docOpenSuggestFor(finding, focus = true) {
  const mark = docFindingMarks().find((el) => el._docFinding === finding);
  if (mark) {
    openDocSuggest(finding, mark.getBoundingClientRect(), focus);
    return true;
  }
  const box = docActiveBox() || docSurface();
  if (!box) return false;
  const at = docCaretPoint(box);
  openDocSuggest(finding, { left: at.left, top: at.top, bottom: at.bottom }, focus);
  return true;
}

function docOpenSuggestAtCaret(box, point = null, focus = true) {
  let finding = point ? docFindingAtPoint(point.x, point.y) : null;
  if (!finding) {
    //: The fallback, and it is the right one for a double-click: that gesture
    //: selects the word first, so the caret really is inside it.
    const offset = docOffsetOf(box);
    if (offset === null) return false;
    finding = docFindingAtOffset(offset);
  }
  if (!finding) return false;
  return docOpenSuggestFor(finding, focus);
}

document.addEventListener("dblclick", (event) => {
  const box = docToolsBoxFor(event.target);
  if (box) docOpenSuggestAtCaret(box, { x: event.clientX, y: event.clientY });
});

//: **One click on an underlined word, which is what an underline means
//: everywhere else.** DOCUMENTS_PLAN Phase 0 item 2, and the instruction it
//: comes from: "if something gets underlined, I want to be able to click on
//: that and see suggestions". Double-click and right-click both still work,
//: unchanged; this is the gesture nobody had to be told about.
//:
//: Two details decide whether this is helpful or infuriating:
//:
//:   * **The caret has not moved yet.** The click that opens this menu is the
//:     same click that places the caret, and `selectionStart` still holds the
//:     old position while the event is being dispatched. Read on the next
//:     frame, so the offset is the one the person just clicked.
//:   * **It does not take the focus.** A double-click or a right-click is a
//:     request for the menu, so those move focus into it; a plain click is
//:     usually someone putting the caret in a word to fix it by hand, and
//:     stealing focus would send their next keystrokes to a button. The menu
//:     opens beside the word and the caret stays where they put it, so typing
//:     just carries on and the menu closes on the next edit.
document.addEventListener("click", (event) => {
  if (event.detail > 1 || event.altKey || event.ctrlKey || event.metaKey) return;
  const box = docToolsBoxFor(event.target);
  if (!box) return;
  const point = { x: event.clientX, y: event.clientY };
  requestAnimationFrame(() => {
    //: A drag that selected something is not a click on a word.
    if (box.selectionStart !== box.selectionEnd) return;
    const finding = docFindingAtPoint(point.x, point.y) || docFindingAtOffset(docOffsetOf(box) ?? -1);
    if (!finding) return;
    //: Already open on this one (a double-click's first click got here first).
    if (docSuggestOpenFor === finding) return;
    docOpenSuggestFor(finding, false);
  });
});

document.addEventListener("contextmenu", (event) => {
  //: **The underlined word is a real element, so right-clicking it must work.**
  //: The other half of the same report. `docToolsBoxFor` only ever matched a
  //: `<textarea>`, so in Live view, the one view that *can* draw a squiggle,
  //: and therefore the view where anyone would try this, right-clicking the
  //: mark fell straight through to the browser's own menu. The app's menu was
  //: reachable only by left-clicking, which is not what an underline means
  //: anywhere else.
  const flag = event.target instanceof Element
    ? event.target.closest(".doc-flag, .cm-finding")
    : null;
  if (flag) docFindingMarks(); // resolves the engine's marks back to findings
  if (flag && flag._docFinding) {
    event.preventDefault();
    openDocSuggest(flag._docFinding, flag.getBoundingClientRect());
    return;
  }
  const box = docToolsBoxFor(event.target);
  if (!box) return;
  //: Only when there is something to say. Swallowing the browser's own menu
  //: over ordinary text would take away spell-check, paste and everything else
  //: it carries for the sake of a menu with nothing in it.
  if (docOpenSuggestAtCaret(box, { x: event.clientX, y: event.clientY })) {
    event.preventDefault();
  }
});

//: Anywhere else closes it, the rule every menu in this app follows.
document.addEventListener("mousedown", (event) => {
  const menu = $("doc-suggest-menu");
  if (!menu || menu.classList.contains("hidden")) return;
  if (!menu.contains(event.target)) closeDocSuggest();
});

document.addEventListener("keydown", (event) => {
  if (event.key !== "Escape") return;
  if (!$("doc-suggest-menu")?.classList.contains("hidden")) closeDocSuggest();
});

//: **The keyboard half of "click the underline", and both gestures are
//: borrowed rather than invented.** `Alt+Enter` on a flagged word opens its
//: menu and `F8`/`Shift+F8` walk the findings, which is what VS Code has
//: bound to exactly these two jobs; anyone who writes code already knows
//: them, and anyone who does not loses nothing. Word's own F7 is taken by
//: this app's shortcuts, and stepping through problems is the half people
//: actually use.
//:
//: They work from the menu as well as from the text: after F8 the focus is on
//: the first suggestion, and pressing F8 again there has to mean "the next
//: one" rather than nothing at all.
function docFindingKeyBox(target) {
  const box = docToolsBoxFor(target);
  if (box) return box;
  const menu = $("doc-suggest-menu");
  if (menu && !menu.classList.contains("hidden") && menu.contains(target)) {
    return docActiveBox() || docSurface();
  }
  return null;
}

//: The next finding after the caret, wrapping at the end. Wrapping rather than
//: stopping, because a stepper that goes quiet at the last item reads as
//: broken; the flash `docProseJump` draws is what says "back to the top".
function docFindingStep(box, backwards) {
  if (!docProseFound.length) return null;
  const here = docSuggestOpenFor && docProseFound.includes(docSuggestOpenFor)
    ? docSuggestOpenFor
    : null;
  //: Measured from the open menu's finding when there is one, so a run of F8s
  //: advances instead of returning to the same word: opening a menu leaves
  //: the caret inside the finding, and "the next one after the caret" would
  //: then be this one again.
  const from = here ? (backwards ? here.start : here.end) : docOffsetOf(box) ?? 0;
  if (backwards) {
    const before = docProseFound.filter((finding) => finding.end < from);
    return before.length ? before[before.length - 1] : docProseFound[docProseFound.length - 1];
  }
  return docProseFound.find((finding) => finding.start > from) || docProseFound[0];
}

function docGoToFinding(finding) {
  if (!finding) return false;
  docProseJump(finding);
  //: One frame, because `docProseJump` may have switched the view, scrolled a
  //: textarea or re-rendered the Live blocks, and the menu is anchored to a
  //: rectangle that none of those had settled yet.
  requestAnimationFrame(() => docOpenSuggestFor(finding, true));
  return true;
}

document.addEventListener("keydown", (event) => {
  const box = docFindingKeyBox(event.target);
  if (!box) return;
  if (event.key === "Enter" && event.altKey) {
    const offset = docOffsetOf(box);
    const finding = offset === null ? null : docFindingAtOffset(offset);
    if (!finding) return;
    event.preventDefault();
    docOpenSuggestFor(finding, true);
    return;
  }
  if (event.key !== "F8") return;
  if (!docProseFound.length) return;
  event.preventDefault();
  docGoToFinding(docFindingStep(box, event.shiftKey));
});

//: An edit moves every offset after it, so the menu that is open is about a
//: span that may no longer be there. Closed rather than refreshed: the person
//: has started typing, which is an answer to the suggestion.
document.addEventListener("input", (event) => {
  if (!docToolsBoxFor(event.target)) return;
  if (!$("doc-suggest-menu")?.classList.contains("hidden")) closeDocSuggest();
});

$("doc-dictionary-close")?.addEventListener("click", () => $("doc-dictionary-dialog")?.close());
$("doc-spelling-variant")?.addEventListener("change", async (event) => {
  prefsCache = await apiJson("/preferences", {
    method: "PUT",
    body: JSON.stringify({ spelling_variant: event.currentTarget.value }),
  }).catch(() => prefsCache);
  //: The variant decides which half of the pair table is a finding, so the
  //: lookup has to be rebuilt before the next pass reads it.
  docVariantFor = null;
  renderDocProse();
});
$("doc-dictionary-add")?.addEventListener("click", async () => {
  const word = await promptDialog("Add a word to your dictionary:", "");
  if (!word) return;
  await docDictionaryAdd(word.trim());
  openDocDictionary();
});

$("doc-prose")?.addEventListener("click", () => {
  const panel = $("doc-prose-panel");
  const chip = $("doc-prose");
  if (!panel || !chip) return;
  const open = panel.classList.contains("hidden");
  panel.classList.toggle("hidden", !open);
  chip.setAttribute("aria-expanded", String(open));
  if (open) renderDocProsePanel();
});

for (const [name, id] of Object.entries(DOC_TOOL_KEYS)) {
  const input = $(id);
  if (!input) continue;
  //: `complete` defaults on and `autocorrect` defaults off, which is the
  //: difference between *offering* something and *doing* it to your text.
  input.checked = docToolPref(name, name === "complete");
  input.addEventListener("change", () => {
    docSaveToolPref(name, input.checked);
    if (name === "complete" && !input.checked) hideDocComplete();
  });
}

//: Painted once on load so the bar is not blank before the first keystroke,
//: and again whenever a document is opened, `openDocument` calls this.
//:
//: **The call that runs it at load time is the last line of this file**, not
//: this one. `const`/`let` at module scope are hoisted into a temporal dead
//: zone, so calling this here threw `Cannot access 'docDictionarySet' before
//: initialization` the moment the dictionary and the spelling tables were
//: added below: a real crash, caught in the browser, that no amount of
//: reading the function would have shown.
function renderDocTools() {
  docCompleteWords = null;
  renderDocStatusBar();
  renderDocProse();
}

// =============================================================================
// The dictionary, the spelling variant, and the popup you get from a flagged word
// =============================================================================
//
// Asked for: *"the auto correct and grammar checker needs to be improved
// because I cant click on the flagged word or phrase and see a popup for
// suggested fixes or other options like adding to dictionary (a way to manage
// that dictionary), auto correct spelling (us, uk spelling etc), language
// translation etc. integrate all the usability that these features need and how
// the user would expect to use them."*
//
// The check itself was already right; what it had no shape for was *disagreeing
// with it*. A checker you cannot argue with is one you turn off, because the
// third time it flags your project's name you have no way to say "this is a
// word". So: every finding is a control, and the control's menu carries the
// four answers a person actually has, fix it, this is a word, not this time,
// and (for a spelling) always correct it for me.
//
// **The dictionary lives on the server** (`writing_dictionary`, routes_settings)
// rather than in `localStorage`, and the reason is the same as the spelling
// variant's: a word list you have to rebuild after clearing browser data is a
// list nobody adds to, and a variant that differs between the desktop shell and
// a browser tab is a checker that contradicts itself.

//: **US and UK, as an explicit list rather than a rule.** The rules everyone
//: reaches for are wrong often enough to be useless: `-ise/-ize` turns "size"
//: into "sise", `-our/-or` turns "four" into "for". Every pair here is a word
//: whose two spellings are both real and mean the same thing, which is the only
//: case where suggesting the other one is safe.
//:
//: UK on the left, US on the right, and the direction is chosen by the setting
//:, the checker never has an opinion about which is correct, only about which
//: one this notebook was told to use.
const DOC_SPELLING_PAIRS = [
  ["colour", "color"], ["colours", "colors"], ["coloured", "colored"],
  ["favourite", "favorite"], ["favourites", "favorites"], ["favour", "favor"],
  ["behaviour", "behavior"], ["behaviours", "behaviors"],
  ["honour", "honor"], ["labour", "labor"], ["neighbour", "neighbor"],
  ["humour", "humor"], ["rumour", "rumor"], ["flavour", "flavor"],
  ["harbour", "harbor"], ["endeavour", "endeavor"], ["armour", "armor"],
  ["centre", "center"], ["centres", "centers"], ["metre", "meter"],
  ["metres", "meters"], ["litre", "liter"], ["litres", "liters"],
  ["theatre", "theater"], ["fibre", "fiber"], ["calibre", "caliber"],
  ["organise", "organize"], ["organised", "organized"], ["organising", "organizing"],
  ["organisation", "organization"], ["organisations", "organizations"],
  ["recognise", "recognize"], ["recognised", "recognized"],
  ["realise", "realize"], ["realised", "realized"],
  ["apologise", "apologize"], ["analyse", "analyze"], ["analysed", "analyzed"],
  ["prioritise", "prioritize"], ["summarise", "summarize"],
  ["specialise", "specialize"], ["categorise", "categorize"],
  ["catalogue", "catalog"], ["dialogue", "dialog"], ["programme", "program"],
  ["licence", "license"], ["defence", "defense"], ["offence", "offense"],
  ["practise", "practice"], ["grey", "gray"], ["cheque", "check"],
  ["travelling", "traveling"], ["travelled", "traveled"], ["traveller", "traveler"],
  ["cancelled", "canceled"], ["cancelling", "canceling"], ["modelling", "modeling"],
  ["labelled", "labeled"], ["fulfil", "fulfill"], ["enrol", "enroll"],
  ["storey", "story"], ["tyre", "tire"], ["kerb", "curb"], ["plough", "plow"],
  ["aluminium", "aluminum"], ["sceptical", "skeptical"], ["moustache", "mustache"],
  ["draught", "draft"], ["pyjamas", "pajamas"], ["jewellery", "jewelry"],
  ["marvellous", "marvelous"], ["towards", "toward"],
];

//: Built once from the pairs above, in whichever direction the setting names.
//: A map rather than a scan, because this runs per word of the document.
let docVariantMap = null;
let docVariantFor = null;

function docSpellingVariant() {
  return (prefsCache && prefsCache.spelling_variant) || "off";
}

function docVariantLookup() {
  const variant = docSpellingVariant();
  if (docVariantFor === variant && docVariantMap) return docVariantMap;
  docVariantFor = variant;
  docVariantMap = new Map();
  if (variant === "uk") {
    for (const [uk, us] of DOC_SPELLING_PAIRS) docVariantMap.set(us, uk);
  } else if (variant === "us") {
    for (const [uk, us] of DOC_SPELLING_PAIRS) docVariantMap.set(uk, us);
  }
  return docVariantMap;
}

//: The words the reader has told this to accept. A Set, lowercased, because a
//: word added at the start of a sentence must not have to be added again in
//: the middle of one.
let docDictionarySet = null;

function docDictionary() {
  if (!docDictionarySet) {
    docDictionarySet = new Set(
      ((prefsCache && prefsCache.writing_dictionary) || []).map((word) =>
        String(word).toLowerCase()
      )
    );
  }
  return docDictionarySet;
}

async function docDictionaryWrite(words) {
  docDictionarySet = new Set(words.map((word) => word.toLowerCase()));
  //: The ranked suggestions are drawn from this list, so a word added here has
  //: to be offerable on the very next menu rather than after a reload.
  docKnownWordsCache = null;
  prefsCache = await apiJson("/preferences", {
    method: "PUT",
    body: JSON.stringify({ writing_dictionary: [...docDictionarySet].sort() }),
  }).catch(() => prefsCache);
  renderDocProse();
}

async function docDictionaryAdd(word) {
  const clean = String(word || "").trim();
  if (!clean) return;
  await docDictionaryWrite([...docDictionary(), clean.toLowerCase()]);
  toast(`“${clean}” added to your dictionary.`);
}

//: Findings dismissed for this sitting only. Not persisted, deliberately:
//: "not this time" is a statement about one sentence, and remembering it
//: forever would quietly turn a check off with no way to see that it is off.
const docProseIgnored = new Set();

function docProseKey(finding) {
  //: Scoped to the document, because the row says "in this document" and a
  //: dismissal that silently applied to the next document you opened would be
  //: the checker turning itself off with no way to see that it had.
  const scope = currentDoc && currentDoc.id ? currentDoc.id : "unsaved";
  return `${scope}:${finding.rule}:${finding.text.toLowerCase()}`;
}

//: **The popup, and the four answers a person actually has.** Fix it, this is
//: a word, not this time, and, for a spelling, always correct it. Anchored
//: at the thing it is about, because a menu that opens somewhere else makes
//: you re-find the word you were looking at.
let docSuggestOpenFor = null;

function closeDocSuggest() {
  $("doc-suggest-menu")?.classList.add("hidden");
  docSuggestOpenFor = null;
}

// --- ranking the suggestions (DOCUMENTS_PLAN Phase 0 item 2) ------------------
//
// **Where a suggestion can honestly come from in an app with no dictionary
// file.** This checker knows a fixed list of unambiguous typos and a UK/US
// pair table, and that is the whole of its certainty. For a word it simply
// does not recognise it had nothing to offer at all, and a menu whose only
// row is "ignore this" is a menu that teaches you to stop opening it.
//
// So the order is by how much the app actually knows, strongest first:
//
//   1. the rule's own answer, where a rule was sure enough to have one;
//   2. the other spelling of a UK/US pair, so a document set to UK still sees
//      the US form offered rather than pretended out of existence;
//   3. the nearest words by edit distance in the words this app can claim to
//      know: your own dictionary, plus both halves of the pair table and the
//      corrections in the typo list;
//   4. the nearest words in your own writing, which is the only place your
//      project names, your people and your jargon exist.
//
// Nothing here is a guess dressed as an answer: every row is a real word from
// a list you could go and look at, and 3 and 4 are ordered by a distance the
// reader can feel (one letter out sorts above two).

const DOC_SUGGEST_MAX = 5;

//: Two edits. Three matches almost anything at these word lengths, and the
//: third suggestion for a five-letter word is noise a reader has to read
//: before dismissing.
const DOC_SUGGEST_DISTANCE = 2;

//: The vocabulary of a big notebook is tens of thousands of words and this
//: runs while a menu is opening, so the scan is bounded. `docCompleteWords`
//: is sorted by how often you use a word, so the cap keeps the words most
//: likely to be the one you meant.
const DOC_SUGGEST_CANDIDATES = 3000;

//: **Optimal string alignment**, which is Damerau-Levenshtein restricted to
//: adjacent transpositions. The restriction is the right one here: the typos
//: this is for are a swapped pair (`teh`), a doubled or dropped letter, or a
//: neighbouring key, and full Damerau's extra bookkeeping buys nothing for
//: those while costing more per candidate on a list scanned thousands of
//: times.
//:
//: `cap` is not an optimisation detail, it is what keeps the answer sensible:
//: a row whose minimum is already past the cap cannot produce a distance
//: under it, so the rest of the matrix is not computed, and any word more
//: than `cap` edits away is not a suggestion at all.
function docEditDistance(a, b, cap) {
  if (Math.abs(a.length - b.length) > cap) return cap + 1;
  if (a === b) return 0;
  let previous = Array.from({ length: b.length + 1 }, (_, i) => i);
  let beforePrevious = null;
  for (let i = 1; i <= a.length; i += 1) {
    const row = new Array(b.length + 1);
    row[0] = i;
    let best = row[0];
    for (let j = 1; j <= b.length; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      let value = Math.min(row[j - 1] + 1, previous[j] + 1, previous[j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        value = Math.min(value, beforePrevious[j - 2] + 1);
      }
      row[j] = value;
      if (value < best) best = value;
    }
    if (best > cap) return cap + 1;
    beforePrevious = previous;
    previous = row;
  }
  return previous[b.length];
}

//: The words this app can say it knows, as opposed to the words it has seen.
//: Rebuilt when the dictionary changes, which is the only thing that can add
//: to it.
let docKnownWordsCache = null;

function docKnownWords() {
  if (docKnownWordsCache) return docKnownWordsCache;
  const pool = new Set(docDictionary());
  for (const correction of Object.values(DOC_AUTOCORRECT)) pool.add(correction.toLowerCase());
  for (const [uk, us] of DOC_SPELLING_PAIRS) {
    pool.add(uk);
    pool.add(us);
  }
  docKnownWordsCache = [...pool];
  return docKnownWordsCache;
}

//: A typo at the start of a sentence must not be corrected into a lowercase
//: word, and a suggestion for `Recieve` that comes back as `receive` reads as
//: a second mistake. The same rule the built-in fixes already follow, pulled
//: out so every source of a suggestion follows it too.
function docMatchCase(sample, word) {
  if (!sample || !word) return word;
  if (sample[0] !== sample[0].toUpperCase()) return word;
  return word[0].toUpperCase() + word.slice(1);
}

//: `skip` is read, never written. It held the words already offered, and an
//: earlier draft also *added* each result to it as a way of not repeating
//: itself between the two candidate lists. That silently returned nothing at
//: all: the caller's own de-duplicating `push` reads the same set, so every
//: word this function found had already been marked as seen by the time it
//: was offered. Measured, not reasoned: the ranked list came back empty for a
//: word one edit from `environment` while `docNearestWords` on its own
//: returned it.
function docNearestWords(word, candidates, limit, skip) {
  const lower = word.toLowerCase();
  const scored = [];
  let scanned = 0;
  for (const candidate of candidates) {
    if (scanned >= DOC_SUGGEST_CANDIDATES) break;
    scanned += 1;
    const clean = String(candidate).toLowerCase();
    if (clean === lower || skip.has(clean)) continue;
    if (Math.abs(clean.length - lower.length) > DOC_SUGGEST_DISTANCE) continue;
    const distance = docEditDistance(lower, clean, DOC_SUGGEST_DISTANCE);
    if (distance <= DOC_SUGGEST_DISTANCE) scored.push([clean, distance]);
  }
  //: Distance first, then alphabetically, so the same word always sorts to
  //: the same place. A menu whose rows move between two openings of the same
  //: word is one nobody learns the shape of.
  scored.sort((a, b) => a[1] - b[1] || (a[0] < b[0] ? -1 : 1));
  return scored.slice(0, limit).map(([candidate]) => candidate);
}

//: Word-level rules only. "The nearest word to `,,` by edit distance" is not
//: a question with an answer, and the punctuation rules already carry the one
//: correct fix in `replacement`.
const DOC_WORD_RULES = new Set(["spelling", "variant"]);

//: What the menu calls the thing it is about. Visible text wherever there is
//: any, and a description of the whitespace wherever there is not.
function docFindingLabel(finding) {
  const text = finding.text || "";
  if (text.trim()) return text.replace(/\s+/g, " ").slice(0, 48);
  if (/^\n+$/.test(text)) return `${text.length} blank line${text.length === 1 ? "" : "s"}`;
  return `${text.length} space${text.length === 1 ? "" : "s"}`;
}

function docSuggestAlternatives(finding) {
  //: More than one plausible answer, where there is one. A single suggestion
  //: presented as *the* answer is how a checker quietly rewrites someone's
  //: voice; two or three make it a choice.
  const out = [];
  const seen = new Set();
  const push = (word) => {
    const clean = String(word);
    const key = clean.toLowerCase();
    if (!clean || seen.has(key) || key === finding.text.toLowerCase()) return;
    seen.add(key);
    out.push(clean);
  };
  if (finding.replacement !== null && finding.replacement !== undefined) {
    push(finding.replacement);
  }
  if (DOC_WORD_RULES.has(finding.rule)) {
    const lower = finding.text.toLowerCase();
    //: The other direction of the variant table, so a document set to UK still
    //: offers the US spelling as the second option rather than pretending it
    //: does not exist.
    for (const [uk, us] of DOC_SPELLING_PAIRS) {
      if (uk === lower) push(docMatchCase(finding.text, us));
      if (us === lower) push(docMatchCase(finding.text, uk));
    }
    if (out.length < DOC_SUGGEST_MAX) {
      for (const word of docNearestWords(finding.text, docKnownWords(), DOC_SUGGEST_MAX - out.length, seen)) {
        push(docMatchCase(finding.text, word));
      }
    }
    if (out.length < DOC_SUGGEST_MAX) {
      //: Built on demand rather than kept warm: this is the only caller that
      //: needs it before the first completion popup, and building it walks the
      //: document and four hundred notes.
      if (!docCompleteWords) docBuildVocabulary();
      const vocabulary = (docCompleteWords || []).map(([word]) => word);
      for (const word of docNearestWords(finding.text, vocabulary, DOC_SUGGEST_MAX - out.length, seen)) {
        push(docMatchCase(finding.text, word));
      }
    }
  }
  return out.slice(0, DOC_SUGGEST_MAX);
}

function openDocSuggest(finding, anchorRect, focus = true) {
  const menu = $("doc-suggest-menu");
  if (!menu) return;
  docSuggestOpenFor = finding;
  menu.replaceChildren();

  const head = document.createElement("div");
  head.className = "doc-suggest-head";
  const word = document.createElement("strong");
  //: A spacing finding's text *is* whitespace, so the heading rendered as an
  //: empty bold nothing above a sentence about it. Said in words instead:
  //: "three spaces" is a thing you can look for in the line, an empty heading
  //: is not.
  word.textContent = docFindingLabel(finding);
  const why = document.createElement("span");
  why.className = "muted doc-suggest-why";
  why.textContent = finding.message;
  head.append(word, why);
  menu.appendChild(head);

  const list = document.createElement("div");
  list.className = "doc-suggest-list";
  const alternatives = docSuggestAlternatives(finding);
  for (const option of alternatives) {
    const item = document.createElement("button");
    item.type = "button";
    item.className = "doc-suggest-item";
    setLabel(item, `ph:check ${option === " " ? "one space" : option}`);
    item.title = `Replace with “${option}”`;
    item.addEventListener("click", () => {
      docProseFix({ ...finding, replacement: option });
      closeDocSuggest();
    });
    list.appendChild(item);
  }
  if (!alternatives.length) {
    const none = document.createElement("p");
    none.className = "muted doc-suggest-none";
    //: A rule with no fix still opens this menu, because "ignore it" and "this
    //: is fine" are answers too: and because a row you cannot press at all
    //: reads as a broken row.
    none.textContent = "No single answer for this one, it is a place to look, not a correction.";
    list.appendChild(none);
  }
  menu.appendChild(list);

  //: **"Ask the AI for wordings", where the app itself has no answer.** Asked
  //: for directly: "the listed errors in suggestions have no way to have the
  //: ai write a suggested replacement or multiple for the user to choose."
  //:
  //: A row rather than an automatic call: this costs a model round-trip of
  //: several seconds, and firing one every time a menu opens would make the
  //: menu feel broken on a small local model. It replaces itself with the
  //: options when they arrive, so the menu that asked is the menu that
  //: answers: pressing an option applies it exactly as a built-in fix does,
  //: through `docProseFix`, which re-checks the document before writing.
  const askAi = document.createElement("button");
  askAi.type = "button";
  askAi.className = "doc-suggest-item doc-suggest-ai";
  setLabel(askAi, "ph:magic-wand Ask the AI for wordings…");
  askAi.title = "Have the local model suggest two or three other ways to put this";
  askAi.addEventListener("click", async () => {
    if (!currentDoc || !currentDoc.id) return toast("Save the document first.", true);
    setLabel(askAi, "ph:hourglass Thinking…");
    askAi.disabled = true;
    const body = await apiJson(`/documents/${currentDoc.id}/rephrase`, {
      method: "POST",
      body: JSON.stringify({ passage: finding.text, note: finding.message || "" }),
    }).catch(() => null);
    //: The menu may have been closed, or opened on something else, while the
    //: model was thinking. Writing into it then would put one finding's
    //: suggestions under another finding's heading.
    if (docSuggestOpenFor !== finding) return;
    const options = (body && body.options) || [];
    if (!options.length) {
      setLabel(askAi, "ph:magic-wand Ask the AI for wordings…");
      askAi.disabled = false;
      return toast(
        (body && body.message) || "No other wordings came back for that one.",
        true
      );
    }
    askAi.remove();
    for (const option of options) {
      const item = document.createElement("button");
      item.type = "button";
      item.className = "doc-suggest-item doc-suggest-ai-option";
      setLabel(item, `ph:magic-wand ${option}`);
      item.title = `Replace with “${option}”`;
      item.addEventListener("click", () => {
        docProseFix({ ...finding, replacement: option });
        closeDocSuggest();
      });
      list.appendChild(item);
    }
    placeDocSuggest();
  });
  list.appendChild(askAi);

  const actions = document.createElement("div");
  actions.className = "doc-suggest-actions";
  if (finding.rule === "spelling" || finding.rule === "variant") {
    const add = document.createElement("button");
    add.type = "button";
    add.className = "doc-suggest-item";
    setLabel(add, `ph:book-open-text Add “${finding.text}” to dictionary`);
    add.addEventListener("click", async () => {
      closeDocSuggest();
      await docDictionaryAdd(finding.text);
    });
    actions.appendChild(add);
  }
  const ignore = document.createElement("button");
  ignore.type = "button";
  ignore.className = "doc-suggest-item";
  setLabel(ignore, "ph:eye-slash Ignore in this document");
  ignore.title = "Stop flagging this wording in this document until MemoryMap is restarted";
  ignore.addEventListener("click", () => {
    docProseIgnored.add(docProseKey(finding));
    closeDocSuggest();
    renderDocProse();
    renderDocProsePanel();
  });
  actions.appendChild(ignore);

  //: **Translation, through the chat rather than behind it.** There is no
  //: offline translator in this app and inventing one would be a lie; what
  //: there *is* is a local model that can translate, and the honest way to
  //: offer that is to hand the passage to it with the question already
  //: written, where the answer is visible and correctable, not to silently
  //: rewrite the document with something nobody checked.
  const translate = document.createElement("button");
  translate.type = "button";
  translate.className = "doc-suggest-item";
  setLabel(translate, "ph:translate Translate this passage…");
  translate.addEventListener("click", () => {
    closeDocSuggest();
    docTranslatePassage(finding.text);
  });
  actions.appendChild(translate);
  menu.appendChild(actions);

  menu.classList.remove("hidden");
  docSuggestAnchor = anchorRect;
  placeDocSuggest();
  //: Only when the gesture asked for the menu. A plain click on a word is
  //: someone putting the caret in it, and taking the focus then sends their
  //: next keystroke to a button (see the `click` listener below).
  if (focus) menu.querySelector("button")?.focus();
}

//: Kept so the menu can be re-placed after it changes size, the AI wordings
//: arrive seconds after it opens and make it taller, and a menu that grew
//: downwards off the bottom of the window is a menu whose best suggestion is
//: unreachable.
let docSuggestAnchor = null;

function placeDocSuggest() {
  const menu = $("doc-suggest-menu");
  if (!menu || !docSuggestAnchor || menu.classList.contains("hidden")) return;
  //: Measured after it is visible, because a hidden element measures zero and
  //: a menu positioned against zero opens in the corner.
  const width = menu.offsetWidth;
  const height = menu.offsetHeight;
  const left = Math.min(docSuggestAnchor.left, window.innerWidth - width - 8);
  const below = docSuggestAnchor.bottom + 4;
  const top =
    below + height > window.innerHeight - 8 ? docSuggestAnchor.top - height - 4 : below;
  menu.style.left = `${Math.max(8, left)}px`;
  menu.style.top = `${Math.max(8, top)}px`;
}

//: A passage, a language, and the local model, asked in the chat so the
//: answer is somewhere you can read, keep or ignore.
async function docTranslatePassage(text) {
  const language = await promptDialog(
    "Translate this passage into which language?",
    docLastTranslateLanguage || "French"
  );
  if (!language) return;
  docLastTranslateLanguage = language;
  const box = document.getElementById("chat-input");
  if (!box) return toast("The chat isn't available right now.", true);
  switchTab("chat");
  box.value = `Translate this into ${language}, and keep the formatting:\n\n${text}`;
  box.focus();
  box.dispatchEvent(new Event("input", { bubbles: true }));
}

let docLastTranslateLanguage = "";

//: **The request the rules above cannot answer.** Handed to the chat rather
//: than run silently, for the reason `docProseHeader`'s own comment gives:
//: judging meaning takes real inference time, and this editor's whole
//: character-count/word-goal/completion stack is built on being instant. A
//: background pass that occasionally froze the UI for a few seconds mid-word
//: would be a worse editor than one with no AI review at all.
//:
//: Asks for a list rather than a rewrite, the same reason `docProseFix`
//: never silently replaces text without the exact span matching first: an
//: editor that hands your document to a model and gets a different document
//: back, with no way to see what changed or why, is not reviewing your
//: writing, it is overwriting it. A list of numbered issues, each with what
//: is wrong and one suggested fix, is a thing you can read, agree or
//: disagree with, and apply by hand, same shape as everything else this
//: checker offers.
//: **A badge, not a wall of text.** Asked for directly: "the 'check with ai'
//: button in the documents should attach a link to the document or an excerpt
//: from the document to read but in a little attached badge that can be
//: removed so the document text isnt just pasted below."
//:
//: This used to write the whole document into the composer. Three things were
//: wrong with that and the report names the first: the question you are about
//: to ask is buried under six thousand characters you did not type, so the
//: composer stops being somewhere you can write. The second is that there was
//: no way to change your mind, the text was *in* the box, so unattaching it
//: meant finding where the prompt ended and the document began. The third is
//: that it sends a snapshot: the model reads whatever the document said at the
//: moment the button was pressed, not what it says when the question is
//: actually asked.
//:
//: `attachedDocuments` fixes all three and it already existed, the composer
//: has staged documents as removable chips since files could be dropped into
//: chat, and `sendChat` already passes their ids to the backend, which reads
//: them itself. So this attaches rather than pastes, and the composer is left
//: holding one short sentence: the question.
//:
//: A *selection* is the one case that still travels as text. It is short by
//: definition, it is the passage the question is about, and there is nothing
//: in the document's id to say which part of it was meant.
const DOC_AI_REVIEW_SELECTION_CHARS = 1200;

async function docAiReview() {
  const box = docSurface();
  const text = (box?.text || "").trim();
  if (!text) return toast("Nothing to review yet.", true);
  const input = document.getElementById("chat-input");
  if (!input) return toast("The chat isn't available right now.", true);

  const range = box ? box.selection() : null;
  const selection = range ? box.text.slice(range.from, range.to).trim() : "";
  const ask =
    "Read this for the things a spellchecker can't catch: its/it's and other " +
    "agreement mistakes, tense that shifts partway through, unclear or awkward " +
    "sentences, and tone. List each one as a numbered point naming the exact " +
    "wording and a one-line fix, don't rewrite it.";

  switchTab("chat");
  if (selection) {
    const quoted =
      selection.length > DOC_AI_REVIEW_SELECTION_CHARS
        ? `${selection.slice(0, DOC_AI_REVIEW_SELECTION_CHARS)}…`
        : selection;
    input.value = `${ask}\n\n${quoted}`;
  } else {
    input.value = ask;
    //: The badge, via the composer's own staging list, the same chip an
    //: imported file gets, removable by the same ✕, and read by the backend
    //: from the document itself rather than from a snapshot pasted here.
    const attached = attachDocumentToChat(currentDoc && currentDoc.id, (currentDoc && currentDoc.title) || $("doc-title")?.value || "This document");
    if (!attached) {
      //: The one case where pasting is still the honest answer: the chip
      //: cannot be added (four already staged, or an unsaved document with no
      //: id yet), and silently asking about nothing would be worse.
      input.value = `${ask}\n\n${text.slice(0, 6000)}${text.length > 6000 ? "…" : ""}`;
    }
  }
  input.focus();
  input.dispatchEvent(new Event("input", { bubbles: true }));
}

//: **Managing the dictionary.** Asked for by name. A list you can add to and
//: never see again is a list nobody trusts, and a wrongly added word would
//: otherwise silence a real typo forever with no way to find out why.
async function openDocDictionary() {
  const words = [...docDictionary()].sort();
  const dialog = $("doc-dictionary-dialog");
  const list = $("doc-dictionary-list");
  if (!dialog || !list) return;
  list.replaceChildren();
  if (!words.length) {
    const empty = document.createElement("p");
    empty.className = "muted";
    empty.textContent =
      "Nothing here yet. Add a word from a suggestion and it stops being flagged everywhere.";
    list.appendChild(empty);
  }
  for (const word of words) {
    const row = document.createElement("li");
    row.className = "doc-dictionary-row";
    const label = document.createElement("span");
    label.textContent = word;
    const remove = smallButton("ph:x", `Remove “${word}”`, async () => {
      await docDictionaryWrite(words.filter((other) => other !== word));
      openDocDictionary();
    });
    remove.classList.add("icon-only");
    row.append(label, remove);
    list.appendChild(row);
  }
  const variant = $("doc-spelling-variant");
  if (variant) variant.value = docSpellingVariant();
  dialog.showModal();
}

//: Last line, deliberately: everything above has to exist before the first
//: paint. See `renderDocTools`.
renderDocTools();

// =============================================================================
// Undo, and where it comes from now (PLAN.md §2 D3, DOCUMENTS_PLAN Phase 2)
// =============================================================================
//
// **What used to be here.** A stack of whole-document snapshots, 200 deep,
// coalesced on a 500 ms window, fed from `markDocDirty` and applied as a
// minimal range edit. It existed for one reason, and the reason was the Live
// view: a `<textarea>` keeps a native undo history, but that history belongs
// to *one element*, and Live gave every paragraph its own textarea, created
// when you clicked into it and destroyed when you left. Type in Live, switch
// to Source, press Ctrl+Z, and the box you were now in had never seen the
// edit. That is PLAN D3's own acceptance line, and it was broken.
//
// **Why it goes.** Phase 2 leaves exactly one editing surface in every view.
// Where the engine is mounted, CodeMirror keeps a real history over
// transactions, which is strictly better than snapshots: it knows what
// changed rather than inferring it, it survives a view switch because there
// is no second box to switch to, and one Ctrl+Z undoes a Replace all as one
// thing. Where the engine is not mounted the surface is a single textarea
// with its own native history, and `docReplaceRange` already keeps the
// toolbar's edits inside it. Neither case has the problem the stack was
// written for, and keeping two histories fed by the same edits is the shape
// where Ctrl+Z walks one of them while the editor shows the other.
//
// What survives is the diff, because the surface adapter uses it to turn "the
// document is now this string" into the one edit that was actually made.

//: The smallest range that differs, as `[from, to, text]` against `before`.
//: Common prefix and common suffix, enough to turn a whole rebuilt document
//: into the one insertion or deletion a person made, which is what keeps a
//: caller that hands over a full string from costing the length of the
//: document and from collapsing into a single undoable rewrite.
function docUndoDiffRange(before, after) {
  let start = 0;
  const shortest = Math.min(before.length, after.length);
  while (start < shortest && before[start] === after[start]) start += 1;
  let tail = 0;
  while (
    tail < shortest - start &&
    before[before.length - 1 - tail] === after[after.length - 1 - tail]
  ) {
    tail += 1;
  }
  return [start, before.length - tail, after.slice(start, after.length - tail)];
}

//: **A scripted edit is its own undo step.** Called at the top of every one
//: (a toolbar button, an indent, a comment toggle), *before* it runs. On the
//: engine it arms an `isolateHistory` annotation that the next transaction
//: carries, so a Bold pressed half a second after typing cannot be folded
//: into the sentence it was applied to; on the fallback textarea the
//: browser's own history already breaks on a scripted `insertText`.
let docCmBreakNext = false;

function docUndoBreak() {
  docCmBreakNext = true;
}

//: Consumed by the adapter's own dispatches. Returns `undefined` rather than
//: an empty array when nothing is armed, because that is what CodeMirror
//: expects for "no annotations".
function docCmIsolate() {
  if (!docCmBreakNext) return undefined;
  docCmBreakNext = false;
  const CM = window.CM6;
  return CM ? CM.commands.isolateHistory.of("before") : undefined;
}

function docUndo() {
  const CM = window.CM6;
  if (docCmView && CM) return CM.commands.undo(docCmView);
  //: The fallback is one textarea, so the browser's own history is the right
  //: one and a second would only disagree with Ctrl+Z: which is what
  //: `applyMarkdown`'s own comment said before Live ever existed.
  docSurface()?.focus();
  return document.execCommand("undo");
}

function docRedo() {
  const CM = window.CM6;
  if (docCmView && CM) return CM.commands.redo(docCmView);
  docSurface()?.focus();
  return document.execCommand("redo");
}

// =============================================================================
// The engine: CodeMirror 6 under the documents editor (DOCUMENTS_PLAN Phase 2)
// =============================================================================
//
// **Loaded when the first document is opened, never at boot.** The bundle is
// 772 KB (269 KB gzipped) and most sessions in this app never touch the
// Documents tab at all, so paying for it on every cold start would be a
// second of nothing in exchange for a feature that may not be used. INBOX 48
// argued the same shape for the graph's own vendored library. `?v=` is not
// applied: vendor URLs are exempt from the cache stamp
// (tests/test_asset_cache_busting.py) because the version lives in the pin in
// `frontend/vendor/codemirror/package.json`, not in the app's release number.
//
// **The textarea stays.** If the script fails to load, or the browser refuses
// it, `docSurface()` keeps answering with `#doc-content` and the editor keeps
// working exactly as it did. That is the whole reason the fallback is still
// in the markup, and it is why every call site had to go through the adapter
// first: this file must never be able to tell which one it is talking to.

const DOC_CM_BUNDLE = "/vendor/codemirror/codemirror.min.js";

//: The in-flight load, so two documents opened quickly do not inject two
//: script tags. Reset to null on failure, so a later attempt can retry after
//: whatever went wrong (a dropped connection on first paint, most likely).
let docCmLoad = null;

//: True once loading or mounting has failed. Checked before every attempt, so
//: a broken bundle costs one request rather than one per document opened.
let docCmBroken = false;

function loadCodeMirror() {
  if (window.CM6) return Promise.resolve(window.CM6);
  if (docCmLoad) return docCmLoad;
  docCmLoad = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = DOC_CM_BUNDLE;
    script.async = true;
    script.addEventListener("load", () => {
      if (window.CM6) resolve(window.CM6);
      //: Loaded but exporting nothing is a broken build, not a missing file,
      //: and the two want different messages in the console.
      else reject(new Error("the editor bundle loaded but defined no CM6"));
    });
    script.addEventListener("error", () =>
      reject(new Error("the editor bundle could not be loaded"))
    );
    document.head.appendChild(script);
  }).catch((error) => {
    docCmLoad = null;
    docCmBroken = true;
    //: Said out loud once. Silence here would be the "policy silently
    //: refusing the work" shape: the editor would quietly stay a textarea and
    //: nobody would know why the new features were missing.
    console.warn(`MemoryMap: ${error.message}. The plain editor is still available.`);
    return null;
  });
  return docCmLoad;
}

//: The parts of the configuration that are swapped without rebuilding the
//: state: the language (a file's type can change while it is open), the theme
//: (light and dark), the gutter (a remembered preference), and line wrapping
//: (prose wraps, code does not).
const docCmParts = {
  language: null,
  theme: null,
  gutter: null,
  wrap: null,
  //: Live is this compartment holding the markdown decorations; Source is the
  //: same compartment holding nothing (decision 3).
  live: null,
};

//: How the prose findings tell the view to repaint. A `StateEffect` rather
//: than a bare `dispatch({})`, so the plugin can rebuild for exactly this and
//: ignore every other transaction that does not move the document or the
//: viewport. Created with the first view, because it needs `CM.state`.
let docFindingsEffect = null;

//: The vendored modes, by the extension `GET /documents/file-types` uses.
//: Anything not here is plain text, which is the honest answer: several of
//: the file types this editor opens (php, swift, r) have no mode in the
//: bundle, and a wrong highlighter is worse than none.
function docCmLanguageFor(CM, ext) {
  const stream = (mode) => (mode ? CM.language.StreamLanguage.define(mode) : []);
  switch (ext) {
    //: **`base: markdownLanguage`, and it is not a detail.** `markdown()` on
    //: its own parses *commonmark*, which has no strikethrough and no task
    //: lists, so `~~struck~~` and `- [ ] a task` produce no syntax nodes at
    //: all and the Live decorations that read them silently draw nothing.
    //: Caught by measuring (`scratchpad/ui-sweeps/cm-live.js`), not by
    //: reading: everything else on the page rendered, so the two missing
    //: features looked like a bug in this file rather than a parser that had
    //: never been told about them. `markdownLanguage` is the GitHub dialect,
    //: which is the one this app's own renderer and its toolbar both speak.
    case "md": return CM.markdown.markdown({ base: CM.markdown.markdownLanguage });
    case "js": return CM.javascript.javascript();
    case "ts": return CM.javascript.javascript({ typescript: true });
    case "py": return CM.python.python();
    case "css": return CM.css.css();
    case "html": return CM.html.html();
    case "json": return CM.json.json();
    case "yaml": return CM.yaml.yaml();
    case "bash": return stream(CM.shell);
    case "sql": return stream(CM.sql);
    case "toml": return stream(CM.toml);
    case "go": return stream(CM.go);
    case "rs": return stream(CM.rust);
    case "c": return stream(CM.c);
    case "cpp": return stream(CM.cpp);
    case "cs": return stream(CM.csharp);
    case "java": return stream(CM.java);
    case "kt": return stream(CM.kotlin);
    case "rb": return stream(CM.ruby);
    case "xml": return stream(CM.xml);
    default: return [];
  }
}

//: **The editor's ink, from the app's own tokens.**
//:
//: A theme object rather than a stylesheet, and the reason is mechanical:
//: CodeMirror styles itself through `document.adoptedStyleSheets`, and
//: adopted sheets sort *after* every document stylesheet, so a rule in
//: 09-editor.css would lose to the library's own base rule at equal
//: specificity and nothing would say so. Layout lives in the file; colour,
//: type and the caret live here.
//:
//: `var(--…)` all the way through, so the density slider, a custom accent and
//: a theme change move the editor with the rest of the app rather than
//: leaving it as the one panel that did not follow.
function docCmTheme(CM) {
  const dark = document.documentElement.dataset.mode === "dark";
  return CM.view.EditorView.theme(
    {
      "&": {
        color: "var(--text)",
        backgroundColor: "transparent",
        height: "100%",
      },
      "&.cm-focused": { outline: "none" },
      ".cm-scroller": {
        fontFamily: "var(--ui-font, system-ui, -apple-system, 'Segoe UI', sans-serif)",
        lineHeight: "1.6",
        overflow: "auto",
      },
      //: The tail padding is not decoration: without it the last line of a
      //: document sits against the bottom of the pane and you write the end
      //: of a chapter at the very edge of the screen. Every editor this app
      //: is compared to scrolls past the end, for that reason.
      ".cm-content": {
        caretColor: "var(--text)",
        padding: "var(--space-4) var(--space-4) 40vh",
      },
      ".cm-line": { padding: "0" },
      ".cm-cursor, .cm-dropCursor": { borderLeftColor: "var(--text)" },
      "&.cm-focused .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection": {
        backgroundColor: "var(--accent-soft)",
      },
      ".cm-gutters": {
        backgroundColor: "transparent",
        color: "var(--muted)",
        border: "none",
      },
      ".cm-activeLineGutter": { backgroundColor: "transparent", color: "var(--text)" },
      ".cm-activeLine": { backgroundColor: "transparent" },
      ".cm-selectionMatch": { backgroundColor: "var(--accent-soft)" },
      ".cm-searchMatch": { backgroundColor: "var(--accent-soft)" },
      ".cm-searchMatch.cm-searchMatch-selected": { outline: "1px solid var(--accent)" },
      ".cm-placeholder": { color: "var(--muted)" },
      ".cm-tooltip": {
        backgroundColor: "var(--card)",
        border: "1px solid var(--border)",
        color: "var(--text)",
      },

      //: --- Live preview -------------------------------------------------
      //: The rendered shapes, in the app's own type scale rather than in a
      //: second one. A heading in the editor and the same heading in the
      //: rendered preview beside it are the thing a split view is *for*, so
      //: the two have to agree.
      ".cm-md-h1": { fontSize: "1.8em", fontWeight: "700", lineHeight: "1.25" },
      ".cm-md-h2": { fontSize: "1.5em", fontWeight: "700", lineHeight: "1.3" },
      ".cm-md-h3": { fontSize: "1.25em", fontWeight: "650", lineHeight: "1.35" },
      ".cm-md-h4": { fontSize: "1.1em", fontWeight: "650" },
      ".cm-md-h5": { fontSize: "1em", fontWeight: "650" },
      ".cm-md-h6": { fontSize: "1em", fontWeight: "650", color: "var(--muted)" },
      ".cm-md-strong": { fontWeight: "700" },
      ".cm-md-em": { fontStyle: "italic" },
      ".cm-md-strike": { textDecoration: "line-through", opacity: "0.65" },
      ".cm-md-code": {
        fontFamily: "var(--mono, ui-monospace, monospace)",
        backgroundColor: "var(--field-inset)",
        borderRadius: "3px",
        padding: "0 0.25em",
      },
      ".cm-md-highlight": { backgroundColor: "var(--accent-soft)", borderRadius: "3px" },
      ".cm-md-link": { color: "var(--accent)", textDecoration: "underline", cursor: "pointer" },
      ".cm-md-wiki": {
        color: "var(--accent)",
        backgroundColor: "var(--accent-soft)",
        borderRadius: "4px",
        padding: "0 0.25em",
        cursor: "pointer",
      },
      ".cm-md-quote": {
        borderLeft: "3px solid var(--border)",
        paddingLeft: "0.75em",
        color: "var(--muted)",
      },
      ".cm-md-callout": {
        borderLeft: "3px solid var(--accent)",
        paddingLeft: "0.75em",
        backgroundColor: "var(--accent-soft)",
      },
      ".cm-md-fence": {
        fontFamily: "var(--mono, ui-monospace, monospace)",
        backgroundColor: "var(--field-inset)",
      },
      ".cm-md-rule": { borderBottom: "1px solid var(--border)" },
      ".cm-md-task": { marginRight: "0.4em", verticalAlign: "middle", cursor: "pointer" },
      ".cm-md-image": { maxWidth: "100%", borderRadius: "var(--radius-sm)" },

      //: --- the prose findings ---------------------------------------------
      //: Three shapes, one per kind of claim. Wavy for a spelling
      //: the checker is sure about, wavy in the accent for a style note,
      //: dotted for a repeated word: three, because three is what a reader can
      //: decode at a glance from the shape of a line.
      ".cm-finding": {
        textDecorationSkipInk: "none",
        textUnderlineOffset: "0.18em",
        cursor: "pointer",
      },
      ".cm-finding-spelling": {
        textDecoration: "underline wavy",
        textDecorationColor: "color-mix(in srgb, var(--error) 80%, transparent)",
      },
      ".cm-finding-style": {
        textDecoration: "underline wavy",
        textDecorationColor: "color-mix(in srgb, var(--accent) 80%, transparent)",
      },
      ".cm-finding-repeat": {
        textDecoration: "underline dotted",
        textDecorationThickness: "2px",
        textDecorationColor: "var(--muted)",
      },
    },
    { dark }
  );
}

//: The chords the fallback textarea's own `keydown` handler carries, as a
//: keymap instead. They cannot simply be re-attached to CodeMirror's DOM: it
//: is a contenteditable with its own key handling and its own IME support, so
//: a listener bolted onto it would fight the editor rather than extend it.
//: Same behaviour and the same order (the shifted S before the plain one, for
//: the reason that handler's own comment gives).
function docCmKeymap(CM) {
  const surface = () => docSurface();
  return [
    {
      key: "Escape",
      run: () => {
        if ($("doc-find-bar")?.classList.contains("hidden") !== false) return false;
        toggleDocFindBar(false);
        return true;
      },
    },
    //: Tab indents in a code file only, for the reason the textarea handler
    //: gives: in a markdown document Tab is how a keyboard user leaves the
    //: editor, and trapping it there puts the toolbar out of reach.
    {
      key: "Tab",
      run: () => {
        if (docFileType().previewable) return false;
        indentDocSelection(surface(), false);
        return true;
      },
    },
    {
      key: "Shift-Tab",
      run: () => {
        if (docFileType().previewable) return false;
        indentDocSelection(surface(), true);
        return true;
      },
    },
    { key: "Mod-/", run: () => { toggleDocComment(surface()); return true; } },
    { key: "Mod-Shift-s", run: () => { wrapDocSelection("~~", "struck through"); return true; } },
    { key: "Mod-s", run: () => { saveDocument(); return true; } },
    { key: "Mod-b", run: () => { wrapDocSelection("**", "bold text"); return true; } },
    { key: "Mod-i", run: () => { wrapDocSelection("*", "italic text"); return true; } },
    { key: "Mod-e", run: () => { wrapDocSelection("`"); return true; } },
    { key: "Mod-1", run: () => { applyMarkdown("h1"); return true; } },
    { key: "Mod-2", run: () => { applyMarkdown("h2"); return true; } },
    { key: "Mod-3", run: () => { applyMarkdown("h3"); return true; } },
    //: One gesture, one entry point: `toggleDocFindBar` opens the engine's
    //: panel here and the app's own bar on the fallback, so this binding does
    //: not have to know which is on screen.
    { key: "Mod-f", run: () => { toggleDocFindBar(true); return true; } },
  ];
}

//: Everything the view is built from. Split out so the mount and a later
//: rebuild (`docResetDocument`) cannot drift.
function docCmExtensions(CM) {
  const type = docFileType();
  docCmParts.language = new CM.state.Compartment();
  docCmParts.theme = new CM.state.Compartment();
  docCmParts.gutter = new CM.state.Compartment();
  docCmParts.wrap = new CM.state.Compartment();
  docCmParts.live = new CM.state.Compartment();
  if (!docFindingsEffect) docFindingsEffect = CM.state.StateEffect.define();
  return [
    //: Live's decorations, off until `setDocView` turns them on. Findings are
    //: a separate plugin because they are drawn in *every* view: an underline
    //: under a misspelling is not a rendering of the markdown, it is the
    //: checker saying something, and switching to Source to see the raw text
    //: is not a reason to stop being told.
    docCmParts.live.of(docView === "live" ? docLivePlugin(CM) : []),
    docFindingsPlugin(CM),
    docCmParts.gutter.of(docCmGutter(CM)),
    CM.view.highlightSpecialChars(),
    CM.commands.history(),
    CM.view.drawSelection(),
    CM.view.dropCursor(),
    CM.state.EditorState.allowMultipleSelections.of(true),
    CM.language.indentOnInput(),
    CM.language.syntaxHighlighting(CM.language.defaultHighlightStyle, { fallback: true }),
    CM.language.bracketMatching(),
    CM.search.highlightSelectionMatches(),
    //: The panel at the top, where the app's own find bar already sits, so
    //: the control does not move when the engine takes over from the
    //: fallback. Its chrome is restyled in 09-editor.css onto this app's
    //: field and button recipe.
    CM.search.search({ top: true }),
    CM.view.rectangularSelection(),
    CM.view.crosshairCursor(),
    docCmParts.wrap.of(type.previewable ? CM.view.EditorView.lineWrapping : []),
    docCmParts.language.of(docCmLanguageFor(CM, type.ext)),
    docCmParts.theme.of(docCmTheme(CM)),
    CM.view.placeholder(docPlaceholderText || ""),
    //: This app's chords first, then CodeMirror's own defaults, so a binding
    //: the editor already had wins over the library's.
    CM.view.keymap.of([
      ...docCmKeymap(CM),
      ...CM.search.searchKeymap,
      ...CM.commands.historyKeymap,
      ...CM.commands.defaultKeymap,
    ]),
    CM.view.EditorView.updateListener.of(docCmUpdate),
    //: **The browser's own spellcheck, back on.** CodeMirror turns it off by
    //: default, and for a code editor that is right: a red squiggle under
    //: every identifier is noise. This is a *writing* surface, the textarea it
    //: replaces carried `spellcheck="true"`, and losing it would be a
    //: regression nobody asked for: this app's own checker knows a fixed list
    //: of unambiguous typos and a UK/US pair table, which is a fraction of
    //: what the browser's dictionary knows, and the two draw different marks
    //: so they do not collide.
    CM.view.EditorView.contentAttributes.of({ spellcheck: "true" }),
  ];
}

//: **The one place a CodeMirror change becomes an app change.** The library
//: raises a native `input` on its contenteditable *and* calls this, while a
//: scripted transaction raises only this: so the delegated `input` listeners
//: skip anything from inside the view (`docEventFromCm`) and this drives the
//: pipeline for typed and scripted edits alike.
function docCmUpdate(update) {
  if (update.docChanged) {
    docSurfaceInput();
    docSurfaceChanged();
    docToolsOnInput(docSurface());
    //: editor.js hangs the "/" and `[[` triggers off a DOM `input` event,
    //: which the engine never raises for a typed character: it applies the
    //: change itself. Called rather than dispatched, so there is no synthetic
    //: event on a contenteditable and no second pass through this pipeline.
    if (typeof editorHandleInput === "function") editorHandleInput(docSurface());
    if (!$("doc-suggest-menu")?.classList.contains("hidden")) closeDocSuggest();
  }
  if (update.selectionSet) renderDocCaret();
}

//: **The prose findings, as decorations** (DOCUMENTS_PLAN Phase 2 decision 5).
//:
//: Phase 0 drew these on a `<div>` behind a transparent-ink textarea, because
//: a textarea's value is a string and there is nothing in it to underline.
//: That layer had to copy twenty-six computed properties to keep its glyphs on
//: top of the real ones, and the comment on `DOC_BACKDROP_PROPS` records what
//: happens when one of them is missed: the underline is right at the top of
//: the file and a word out at the bottom. A decoration has no geometry to keep
//: in step, because it *is* the text.
//:
//: Only the findings that still describe the text as it is now, and only the
//: ones on screen: the prose pass is debounced, so between a keystroke and the
//: next pass every offset after the caret is stale, and painting a stale
//: offset draws a squiggle under the wrong word, which is the one thing a
//: checker must never do.
let docFindingsPluginCache = null;

function docFindingsPlugin(CM) {
  if (docFindingsPluginCache) return docFindingsPluginCache;
  const { Decoration, ViewPlugin } = CM.view;

  function build(view) {
    const text = view.state.doc.toString();
    const ranges = [];
    docProseFound.forEach((finding, index) => {
      if (DOC_FINDING_SKIP.has(finding.rule)) return;
      if (text.slice(finding.start, finding.end) !== finding.text) return;
      const visible = view.visibleRanges.some(
        (range) => finding.start < range.to && finding.end > range.from
      );
      if (!visible) return;
      ranges.push(
        Decoration.mark({
          class: `cm-finding cm-finding-${docFindingKind(finding)}`,
          //: The *index*, not the finding: a decoration's DOM is rebuilt on
          //: every repaint, so anything hung on the element would be gone by
          //: the time a click needed it. `docFindingMarks` resolves it back.
          attributes: { "data-doc-finding": String(index), title: finding.message },
        }).range(finding.start, finding.end)
      );
    });
    return Decoration.set(ranges, true);
  }

  docFindingsPluginCache = ViewPlugin.fromClass(
    class {
      constructor(view) {
        this.decorations = build(view);
      }
      update(update) {
        const told =
          docFindingsEffect &&
          update.transactions.some((tr) =>
            tr.effects.some((effect) => effect.is(docFindingsEffect))
          );
        if (update.docChanged || update.viewportChanged || told) {
          this.decorations = build(update.view);
        }
      }
    },
    { decorations: (plugin) => plugin.decorations }
  );
  return docFindingsPluginCache;
}

//: `renderDocProse` calls this whenever the list changes. Cheap enough to be
//: unconditional: the rebuild walks `docProseFound`, which is rarely past a
//: few dozen entries, and draws only what is on screen.
function docCmRepaintFindings() {
  if (!docCmView || !docFindingsEffect) return;
  docCmView.dispatch({ effects: docFindingsEffect.of(null) });
}

//: Build the view, hand the document over to it, and take the textarea out of
//: the layout. Seeded from the fallback's own value rather than from
//: `currentDoc`, so whatever is on screen at that moment is what the engine
//: starts with, including an unsaved edit.
function mountDocEditor(CM) {
  const host = $("doc-editor");
  const box = docBoxEl();
  if (!host || !box || docCmView) return docCmView;
  const state = CM.state.EditorState.create({
    doc: box.value,
    extensions: docCmExtensions(CM),
  });
  docCmView = new CM.view.EditorView({ state, parent: host });
  host.classList.remove("hidden");
  $("doc-source-wrap")?.classList.add("has-cm");
  //: The column beside the textarea is not the editor's gutter any more
  //: (decision 7), so it is taken down rather than left numbering a box
  //: nobody can see.
  applyDocGutter();
  wireDocSurfaceScroll(docSurface());
  docWatchAppearance();
  docGuardGlobalShortcuts(host);
  return docCmView;
}

//: Called before a document is put on screen. Resolves to the view, or to
//: null when the bundle is unavailable, in which case everything carries on
//: against the textarea.
async function ensureDocEditor() {
  if (docCmView) return docCmView;
  if (docCmBroken) return null;
  const CM = await loadCodeMirror();
  if (!CM) return null;
  try {
    return mountDocEditor(CM);
  } catch (error) {
    docCmBroken = true;
    console.warn(
      `MemoryMap: the editor could not start (${error.message}). The plain editor is still available.`
    );
    return null;
  }
}

//: **The app's bare shortcuts must not eat what you are typing.**
//:
//: app.js decides "is the user typing?" with
//: `["INPUT", "TEXTAREA", "SELECT"].includes(document.activeElement.tagName)`,
//: which was exactly right while every editing surface in this app was a
//: textarea. CodeMirror's editable is a `contenteditable` div, so that check
//: says no, and every unchorded shortcut fires while you write: measured, a
//: literal "/" in a document focused the global search box and swallowed the
//: rest of the word, and the `g`-then-letter tab jumps did the same thing
//: mid-sentence. The "/" menu and the `[[` picker simply never opened,
//: because their trigger character never reached the document.
//:
//: Stopped here rather than fixed there, and the phase matters. app.js's
//: handler is on `document` in the bubble phase and was registered first, so
//: nothing on `document` can get in front of it; a capture-phase listener
//: would run before the event reached CodeMirror at all and break the
//: editor's own key handling. A bubble listener on the host is between the
//: two: the engine has already had the keystroke, the global table never
//: sees it.
//:
//: Only single printable characters with no Ctrl, Alt or Meta, which is
//: exactly the set app.js's bare-shortcut loop can match. Chorded shortcuts
//: (Ctrl+K for the palette) still work from inside the editor, deliberately,
//: and so does every key this file's own delegated handlers listen for: F8,
//: Escape, Tab and the arrows are all longer than one character.
function docGuardGlobalShortcuts(host) {
  if (!host || host.dataset.shortcutGuard === "1") return;
  host.dataset.shortcutGuard = "1";
  host.addEventListener("keydown", (event) => {
    if (event.ctrlKey || event.metaKey || event.altKey) return;
    if (event.key.length !== 1) return;
    event.stopPropagation();
  });
}

//: **Light and dark, without a hook into settings.js.** The appearance code
//: writes the resolved mode onto `<html data-mode>`; watching that attribute
//: is one observer here rather than a call added over there, and it catches
//: every route into a mode change (the toggle, the settings radio, the OS
//: following "System") because all of them go through that one write.
let docAppearanceWatcher = null;

function docWatchAppearance() {
  if (docAppearanceWatcher || typeof MutationObserver !== "function") return;
  docAppearanceWatcher = new MutationObserver(() => {
    if (!docCmView || !window.CM6 || !docCmParts.theme) return;
    docCmView.dispatch({ effects: docCmParts.theme.reconfigure(docCmTheme(window.CM6)) });
  });
  docAppearanceWatcher.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-mode", "data-theme"],
  });
}

//: The file type changed while the document was open: the language and the
//: wrapping follow it. Reconfigured rather than rebuilt, so the caret, the
//: scroll position and the undo history survive.
function docCmSyncFileType() {
  const CM = window.CM6;
  if (!docCmView || !CM || !docCmParts.language) return;
  const type = docFileType();
  docCmView.dispatch({
    effects: [
      docCmParts.language.reconfigure(docCmLanguageFor(CM, type.ext)),
      docCmParts.wrap.reconfigure(type.previewable ? CM.view.EditorView.lineWrapping : []),
    ],
  });
}

//: The line-number preference, applied to the engine. `applyDocGutter` still
//: owns the *decision* (and the two note editors' own columns); this is only
//: how it reaches the view.
function docCmSyncGutter() {
  const CM = window.CM6;
  if (!docCmView || !CM || !docCmParts.gutter) return;
  docCmView.dispatch({ effects: docCmParts.gutter.reconfigure(docCmGutter(CM)) });
}

//: **The gutter: numbers and folding, together, because they share a lane.**
//:
//: Decision 7 puts folding behind the same preference the line numbers are
//: behind, and that is not an arbitrary pairing: a fold arrow needs a column
//: to live in, and a column of arrows beside prose that has no numbers in it
//: is a strip of chevrons with nothing to anchor them. One choice, one lane,
//: `applyDocGutter` still owns the decision.
function docCmGutter(CM) {
  if (!docGutterWanted(!docFileType().previewable)) return [];
  return [
    CM.view.lineNumbers(),
    CM.language.codeFolding(),
    CM.language.foldGutter(),
    CM.view.keymap.of(CM.language.foldKeymap),
    docHeadingFold(CM),
  ];
}

//: **Folding on headings.** The markdown parser gives fold ranges for fenced
//: code and lists; a *section* is the unit anyone actually wants to collapse
//: in a long document, and nothing in the grammar calls it one. So this is a
//: fold service rather than a syntax property: from the end of a heading line
//: to just before the next heading at the same level or above, which is what
//: every outliner means by folding a section.
//:
//: Only for markdown. In a `.py` file a `#` line is a comment, and folding
//: from one comment to the next would be nonsense.
function docHeadingFold(CM) {
  return CM.language.foldService.of((state, lineStart, lineEnd) => {
    if (!docFileType().previewable) return null;
    const line = state.doc.lineAt(lineStart);
    const here = /^(#{1,6})\s/.exec(line.text);
    if (!here) return null;
    const level = here[1].length;
    for (let number = line.number + 1; number <= state.doc.lines; number += 1) {
      const next = state.doc.line(number);
      const found = /^(#{1,6})\s/.exec(next.text);
      //: The same level or shallower ends the section. A deeper heading is
      //: part of it, which is why this is not simply "the next heading".
      if (found && found[1].length <= level) {
        return next.from - 1 > lineEnd ? { from: lineEnd, to: next.from - 1 } : null;
      }
    }
    return state.doc.length > lineEnd ? { from: lineEnd, to: state.doc.length } : null;
  });
}

//: A different document is a different history: carrying the previous one
//: over would let Ctrl+Z paste the last document's text into this one, which
//: is the worst kind of undo bug because it reads as the app corrupting your
//: file. `setState` replaces the history along with the text, which is the
//: whole reason this is not a change transaction.
function docResetDocument(text) {
  const CM = window.CM6;
  if (!docCmView || !CM) {
    const surface = docSurface();
    if (surface) surface.text = text;
    return;
  }
  docCmView.setState(
    CM.state.EditorState.create({ doc: text, extensions: docCmExtensions(CM) })
  );
  //: `docCmExtensions` builds *new* compartments, so everything held in one
  //: has to be said again. Missing this is the "a value that is invalid where
  //: it is used" shape: the view would come back in Source's configuration
  //: while the view control still said Live, and nothing would log a thing.
  docSetLiveDecorations(docView === "live");
  docCmRepaintFindings();
}

//: **Source view has to be measured after it is shown.** CodeMirror caches
//: the geometry it lays out with, and a view inside a `display: none` wrapper
//: measures as zero: switching back from Live or Read would leave every line
//: positioned against that zero until something else forced a reflow.
function docCmViewShown() {
  if (!docCmView) return;
  docCmView.requestMeasure();
}

//: **The lock screen has to empty the engine too, and it cannot know how.**
//:
//: `purgeLockedContent` (app.js) is this app's only privacy boundary on the
//: client: it clears every element that holds the notebook's own words, and
//: `#doc-content.value` was one of them. With CodeMirror mounted that value is
//: a stale fallback and the document itself lives in the view's state, which
//: `replaceChildren` on a list of ids cannot reach. Locking the notebook would
//: have left the whole open document readable behind the overlay: exactly the
//: finding that audit was written up for, reintroduced by a change nowhere
//: near it.
//:
//: Watched rather than called, because the purge belongs to app.js and the
//: engine belongs here. The overlay losing `hidden` is the one signal both
//: routes into locking share (the Lock button, and the 401 that re-shows it),
//: so it is the honest thing to observe.
function docWatchLock() {
  const overlay = document.getElementById("lock-overlay");
  if (!overlay || typeof MutationObserver !== "function") return;
  new MutationObserver(() => {
    if (overlay.classList.contains("hidden")) return;
    if (!docCmView) return;
    //: `setState`, not a change transaction: the history is part of the
    //: state, and an undo that could bring the document back after a lock
    //: would make this purge decorative.
    docResetDocument("");
  }).observe(overlay, { attributes: true, attributeFilter: ["class"] });
}
docWatchLock();
