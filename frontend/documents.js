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
  for (const button of document.querySelectorAll("#doc-view-seg [data-doc-view], #doc-view-menu [data-doc-view]")) {
    // The Edit group button is never disabled: setDocView maps it to Source
    // for a file with no rendered form, which is the mode it must reach.
    if (button.dataset.docViewGroup) continue;
    //: Plain is offered for a code file as readily as Source: "use the
    //: documents tab as a plain text editor" is exactly the thing you would
    //: want on a `.csv` or a `.php` the bundle has no mode for.
    const rendered = !DOC_VIEWS_UNRENDERED.includes(button.dataset.docView);
    button.disabled = rendered && !type.previewable;
    button.title = button.disabled
      ? `A .${type.ext} file has no rendered form, this is for markdown.`
      : button.dataset.docTitle || button.title;
  }
  if (!type.previewable && !DOC_VIEWS_UNRENDERED.includes(docView)) setDocView("source");
  //: The engine's own language and wrapping, where it is mounted.
  docCmSyncFileType();

  // The formatting toolbar is markdown syntax. In a .py file every button on
  // it inserts something wrong.
  $("doc-toolbar")?.classList.toggle("hidden", !type.previewable);
  //: And the other way round: Format lays out code, and has nothing to say
  //: to prose, plain text or a CSV. The pair swap in one place, so a
  //: document never shows both or neither.
  $("doc-code-format")?.classList.toggle("hidden", type.previewable || ["txt", "csv"].includes(type.ext));
  //: Wrapping and whitespace are about a file that does not wrap by itself:
  //: every type but prose, plain text and CSV included (INBOX 402).
  for (const id of ["doc-code-wrap-row", "doc-whitespace-row"]) $(id)?.classList.toggle("hidden", type.previewable);

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
  if (!menu?.open) return;
  //: The group flyouts are reparented to `<body>` while open (see
  //: `buildMenuGroupButton`), so a click inside one is not inside `menu` and
  //: the plain "clicked away" reading below would shut the whole thing before
  //: the row's own handler had run.
  const submenu = event.target.closest?.(".action-menu.submenu");
  if (submenu) {
    //: **And it is where a flyout row's close has to live**, for the same
    //: reason: nothing on the group or on `#doc-dock-menu` sees this click.
    //: The rules are the list's own, restated for rows that have moved into a
    //: flyout. A switch keeps the menu open, because a switch has a state you
    //: have to be able to see move and a menu that shuts on the click hides
    //: the only feedback it gives. A nested group opener is not a row. A row
    //: from one of *this* menu's flyouts closes it; one from some other
    //: menu's flyout is none of our business.
    if (!submenu.dataset.docDockSubmenu) return;
    if (event.target.closest(".doc-dock-menu-check")) return;
    if (!event.target.closest(".menu-item") || event.target.closest(".has-submenu")) return;
    menu.open = false;
    return;
  }
  if (menu.contains(event.target)) return;
  menu.open = false;
});

//: **Five download rows into one** (INBOX 262, the owner: "I want to combine
//: the "download as" options in it into a sub menu in that dropdown ... like
//: the ones in the meatball dropdowns in the your notes page").
//:
//: Measured before: the menu is 706px tall in a 900px window at 1440px wide,
//: 45 focusable rows, and on a taller, narrower window it runs to the bottom
//: edge with a scrollbar of its own, which is what the report's screenshot
//: shows. Four of those rows are the same verb.
//:
//: **The buttons are moved, not rebuilt.** They carry ids that this file
//: binds handlers to and that `test_frontend_ids` and
//: `test_frontend_handlers` both watch, so `buildMenuGroupButton` takes them
//: as elements. Everything else is the notes kebab's own group recipe: hover
//: or click to open, a flyout beside the row, an accordion at phone width,
//: clamped to the window on both axes.
//:
//: Built once, at load, rather than per open: these rows are static markup
//: and the groups are not rebuilt by anything.
function foldDocMenuGroup(label, ids) {
  const list = document.querySelector("#doc-dock-menu .doc-dock-menu-list");
  if (!list) return;
  const rows = ids.map((id) => document.getElementById(id)).filter(Boolean);
  if (rows.length < 2 || typeof buildMenuGroupButton !== "function") return;
  //: Already folded: this is called once at load, but a second call would
  //: otherwise wrap a group inside a group.
  if (rows[0].closest(".menu-group")) return;
  //: **A marker, because the group takes the rows with it.**
  //: `buildMenuGroupButton` appends each element into the flyout, so by the
  //: time it returns, `rows[0]` is no longer a child of this list and
  //: `insertBefore(group, rows[0])` throws `NotFoundError`. That throw is
  //: not local: this runs at the top level of documents.js, so it took the
  //: rest of the file's initialisation with it (`storageInfo`,
  //: `DOC_VIEWS_UNRENDERED` and `docCmView` all failed to initialise, and
  //: the editor would not open). A comment node holds the place instead.
  const marker = document.createComment("menu group");
  list.insertBefore(marker, rows[0]);
  const group = buildMenuGroupButton(label, rows);
  list.insertBefore(group, marker);
  marker.remove();
  //: **Marked, so the document-level handler below can recognise its own
  //: flyouts.** A listener on `group` is never called once the flyout is
  //: open, and that is not a subtlety worth rediscovering: `buildMenuGroupButton`
  //: reparents the panel to `<body>` so it can escape a clipping ancestor, so
  //: a click inside it does not bubble through the group at all. The first
  //: version of this bound the close to `group` and looked right; measured,
  //: clicking "Dim all but this paragraph" inside its flyout left the menu
  //: open, and so did every download row.
  const panel = group.querySelector(".action-menu.submenu");
  if (panel) panel.dataset.docDockSubmenu = "1";
}

//: **Three groups, because fourteen rows do not fit on a laptop.** Reported
//: twice: first that the menu "goes off the page", and after the downloads
//: were folded, that it "is still almost off the bottom of the screen".
//: Measured with the second report: the list is 562px of a 900px window at
//: 1440 wide, and at 1024x720 it runs 32px past the bottom edge.
//:
//: The groups are the ones the markup already argued for in its own comments,
//: not a fresh carve-up by row count. "What should be in front of you while
//: you write" is what the dim/typewriter/serif trio was built as, and the two
//: writing switches were put beside them for the same reason; they are one
//: group. What is left of the view rows is what the *editor* shows rather
//: than what the document is, so they are the other.
//:
//: `Connections`, `History`, `Extract notes` and `Delete document` stay in
//: the list: each is a verb on this document, none is a preference, and
//: hiding a one-off action behind a flyout costs a click every time to save a
//: row once.
foldDocMenuGroup("ph:download-simple Download or print", [
  "doc-export-md", "doc-export-html", "doc-export-zip", "doc-export-docx", "doc-export-pdf",
]);
foldDocMenuGroup("ph:layout Editor and layout", [
  "doc-format-toggle", "doc-width-menu", "doc-toolbar-mode", "doc-code-wrap-row", "doc-whitespace-row",
]);
foldDocMenuGroup("ph:pencil-simple While you write", [
  "doc-dim-others", "doc-typewriter", "doc-serif", "doc-autocorrect-row", "doc-complete-row",
]);

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
//: `plain` is the owner's ask of 2026-09-09: "I want to be able to use the
//: documents tab as a plain text editor like before as a view option (not the
//: defaul though)". It is Source with the language compartment empty, so it
//: has no grammar and therefore no highlighting; see `docCmViewLanguage`.
const DOC_VIEWS = ["source", "live", "split", "rendered", "plain"];
//: The two ways of editing that need no rendered form, so the two a `.py`
//: file may be in. Named once, because three separate places used to spell it
//: out as `!== "source"` and Plain would have been refused by all three.
const DOC_VIEWS_UNRENDERED = ["source", "plain"];
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
//: `meta` is what a *note* surface needs and the document does not: its own
//: id (`EDITOR_SURFACES` keys the "/" menu's context off it, and half the app
//: asks a surface what it is), and its own change handlers, because
//: `docSurfaceChangeHandlers` is the document's autosave pipeline and a note
//: box must not reach it. Absent, this is the document's own surface exactly
//: as it was (DOCUMENTS_PLAN Phase 8).
function cmSurface(view, meta = null) {
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
    id: meta ? meta.id : "doc-content",
    isDocument: meta ? false : true,
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
    onChange(fn) { (meta ? meta.changeHandlers : docSurfaceChangeHandlers).push(fn); },
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
    //: **Nothing to dispatch, and that is not a stub.** Callers written for a
    //: textarea end a scripted write with an `input` event, because writing
    //: `.value` raises none and half this editor hangs off one. Every write
    //: through this adapter is a *transaction*, and the view's update
    //: listener has already run the same pipeline by the time this is
    //: reached: raising a synthetic event on a contenteditable would run it a
    //: second time and reset the autosave timer twice per edit. Returns true
    //: because that is what `dispatchEvent` means: nothing cancelled it.
    dispatchEvent() {
      return true;
    },
  };
  docSurfaceCache.set(view, surface);
  return surface;
}

//: Registered through `onChange` on a CodeMirror surface, and run by the
//: view's own update listener. A textarea surface registers the same
//: callbacks as real `input` listeners on the element, so the two engines
//: reach one pipeline by the same call.
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
  //: A note box that has mounted the engine (Phase 8) answers as its view for
  //: the same reason: the toolbar above it must write where the words are.
  const box = $(id);
  const mounted = typeof noteSurfaceFor === "function" ? noteSurfaceFor(box) : null;
  return mounted || textareaSurface(box);
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
  //: A note editor that has mounted the engine (Phase 8): the textarea is
  //: still the form's value carrier and still the thing every caller holds,
  //: so it has to resolve to the view that is editing for it. Both
  //: directions, because a click lands in the view's own DOM and a handler
  //: holds the textarea.
  const mounted = typeof noteSurfaceFor === "function" ? noteSurfaceFor(box) : null;
  if (mounted) return mounted;
  return box instanceof HTMLTextAreaElement ? textareaSurface(box) : null;
}
// DOC-SURFACE-END

function setDocView(mode) {
  const type = docFileType();
  // A code file has no rendered form, so it can only be one of the two views
  // that do not need one. Asked for any other, that is the honest answer
  // rather than an empty pane.
  if (!type.previewable && !DOC_VIEWS_UNRENDERED.includes(mode)) mode = "source";
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
  //: Read by 09-editor.css: asked for directly, "the plain text view should
  //: be more like a vs code editor with a plain black or white background",
  //: which every other view (Live's decorations, Source's syntax colours)
  //: should not carry.
  $("doc-source-wrap").dataset.docView = docView;
  $("doc-preview").classList.toggle("hidden", !docPreviewShowing());
  $("doc-panes").classList.toggle("split", docView === "split");
  $("doc-panes").classList.toggle("reading", docView === "rendered");

  if (docView !== "rendered") lastEditView = docView;
  for (const button of document.querySelectorAll("#doc-view-seg [data-doc-view], #doc-view-menu [data-doc-view]")) {
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
  //: The panel belongs to Live (Source shows the YAML itself, and Read renders
  //: it through the preview), so a view change is what puts it up or takes it
  //: down.
  renderDocProperties(true);
  //: Plain is the language compartment emptied, so entering *or leaving* it
  //: has to reconfigure that compartment. Routed through the same function the
  //: file-type change uses, so the two can never disagree about what a view is
  //: allowed to highlight.
  docCmSyncLanguage();
  //: And the gutter, for the same reason: Plain's default is "numbered"
  //: (docGutterWanted), so entering or leaving it changes what the engine
  //: should be showing. Without this the numbers only appeared on the next
  //: unrelated `applyDocGutter`, which reads as the setting not working.
  applyDocGutter();
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
  //: Paged, and read to the end: `GET /documents` hands back a page now
  //: (INBOX 117), and this list is not only the sidebar's eight rows. A
  //: `[[wiki link]]` resolves against `docs` by title (see
  //: `docLinkTargetFor`), so a document missing from it is a link that
  //: silently fails to resolve, not just a row missing from a list.
  //: A sentinel rather than `[]`, because an empty list and a failed request
  //: were the same value here and the sidebar said "No documents yet" for
  //: both. See `surfaceFailed` in app.js.
  const loaded = await apiPagedList("/documents", DOCUMENTS_PAGE_SIZE).catch(() => null);
  if (!loaded) {
    surfaceFailed(document.getElementById("doc-empty"), "documents", () => loadDocuments(selectId));
    return;
  }
  surfaceRecovered(document.getElementById("doc-empty"));
  docs = loaded;
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
    //: The row is one line of title now, so a long one is cut with an
    //: ellipsis rather than wrapping the row to a second line. The whole
    //: title has to stay reachable, and the row is the thing under the
    //: pointer, so the tooltip goes on the row rather than on the span.
    button.title = doc.title || "Untitled";
    const meta = document.createElement("span");
    meta.className = "muted doc-item-meta";
    //: **What kind of file this is.** The list showed a word count and a
    //: time, so a .py and a .md were the same row: reported as part of the
    //: sidebar redesign. `file_type` is already in `GET /documents`'s summary
    //: (`_summary` in routes_documents.py), so this costs nothing, no second
    //: request and no per-row fetch.
    const type = document.createElement("span");
    type.className = "doc-item-type";
    type.textContent = `.${doc.file_type || "md"}`;
    meta.append(
      type,
      ` · ${doc.words} word${doc.words === 1 ? "" : "s"} · ${relativeTime(doc.updated_at)}`
    );
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
  renderDocProperties();
  renderDocComments();
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
  recordTabVisit("documents", `doc:${doc.id}`, doc.title || "Untitled document");
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
  renderDocProperties();
  renderDocNotes();
  renderDocBacklinks();
  renderDocBookmarks();
  renderDocComments();
  renderDocList();
}

// =============================================================================
// Backlinks with context, and unlinked mentions (DOCUMENTS_PLAN Phase 4 item 1)
// =============================================================================
//
// What links *here*. The panel used to be a list of titles, which reads as a
// lookup: you learn that a connection exists and nothing about what it says.
// Two things turn it into knowledge, and they are the two Obsidian and Kortex
// both have: the sentence the link sits in, and the mentions that are not
// links yet.
//
// **The scan is the server's** (`GET /documents/{id}/backlinks`). The browser
// holds every note but no other document's *content*: the documents list
// deliberately carries a preview and not the text, because a document runs to
// thousands of words. A client-side scan would therefore have found note
// backlinks and silently missed every document one, which is the half-built
// shape this plan exists to stop. The endpoint's own reasoning is in
// routes_documents.py; what is here is the panel and the two actions.

//: One request at a time, and the last one wins. Switching documents quickly
//: used to be safe because this was synchronous over `allEntries`; it is a
//: fetch now, and two in flight would paint the slower one's answer under the
//: faster one's document. The same shape `renderDocBookmarks` uses.
let docBacklinksToken = 0;

//: The unlinked-mentions section, made once and kept, for the same reason the
//: properties panel is made in script: `tests/test_frontend_ids.py` pairs
//: every `$("...")` with an element in index.html, and index.html belongs to
//: another agent. Its shape is the backlinks section's exactly, so the two
//: read as one panel and not as a panel and an add-on.
function docMentionsHost(create = false) {
  const anchor = $("doc-backlinks-wrap");
  if (!anchor || !anchor.parentElement) return null;
  let host = anchor.parentElement.querySelector(".doc-mentions-wrap");
  if (!host && create) {
    host = document.createElement("div");
    host.className = "doc-outline-wrap doc-mentions-wrap";
    const heading = document.createElement("h3");
    heading.append(
      document.createTextNode("Unlinked mentions "),
      docSectionCount("doc-mentions-count")
    );
    //: The one line of description a section gets (CLAUDE.md's copy rule);
    //: anything longer belongs behind the '?' the heading carries.
    const help = document.createElement("p");
    help.className = "muted doc-outline-empty doc-mentions-help";
    help.textContent = "Notes and documents that name this one without linking to it.";
    const list = document.createElement("ul");
    list.className = "doc-outline doc-mentions";
    host.append(heading, help, list);
    anchor.insertAdjacentElement("afterend", host);
  }
  return host;
}

//: A heading's count, from the same recipe the outline's own heading uses, so
//: the four sidebar sections agree about what a count looks like.
function docSectionCount(className) {
  const count = document.createElement("span");
  count.className = `doc-outline-count ${className}`;
  return count;
}

//: The context line, with the match marked. Built as three nodes rather than
//: as a string with a `<mark>` in it: `tests/test_no_innerhtml_interpolation.py`
//: exists because a note's own text is not markup, and a note that mentions
//: this document *and* contains a tag would otherwise render it.
//:
//: The offsets come from the server with the context, so the occurrence that
//: matched is the one marked. Searching the context again here is how the
//: *first* lookalike gets marked instead of the one that was found.
function docBacklinkContext(row) {
  const line = document.createElement("p");
  line.className = "doc-backlink-context";
  const text = row.context || "";
  const from = Math.max(0, Math.min(text.length, row.hit_start | 0));
  const to = Math.max(from, Math.min(text.length, row.hit_end | 0));
  const mark = document.createElement("mark");
  mark.textContent = text.slice(from, to);
  line.append(document.createTextNode(text.slice(0, from)), mark, document.createTextNode(text.slice(to)));
  return line;
}

//: Does the open document already point back at this source? Read from the
//: text rather than remembered, because the answer changes with every
//: keystroke and a stale "Linked both ways" is worse than no button.
function docLinksTo(title) {
  const wanted = (title || "").trim().toLowerCase();
  if (!wanted) return false;
  const pattern = /\[\[([^[\]]{1,120})\]\]/g;
  const text = docText();
  let match;
  while ((match = pattern.exec(text)) !== null) {
    if (match[1].trim().toLowerCase() === wanted) return true;
  }
  return false;
}

function docOpenBacklinkSource(row) {
  if (row.kind === "document") {
    openDocument(row.id);
    return;
  }
  switchTab("notes");
  showNotesSection("browse"); // focusing inside a hidden section does nothing
  flashEntry(row.id);
}

//: **Link back: insert `[[Source]]` at the caret.** Deliberately the caret and
//: not the end of the document: every other insert in this editor (the "/"
//: menu, the table command, the properties command) writes where you are, and
//: an action that alone appended to the bottom would be the one place in the
//: editor where "insert" means something else.
function docLinkBack(title) {
  const surface = docSurface();
  if (!surface) return;
  const at = surface.selectionStart;
  docReplaceRange(surface, at, surface.selectionEnd, `[[${title}]]`);
  markDocDirty();
  surface.focus();
  renderDocBacklinks();
}

//: **Link: rewrite the mention in the source that wrote it**, through that
//: kind's own update route, so the note's revision, its `[[link]]` sync and
//: its search vector all happen exactly as they do for a hand edit. Writing
//: the row from here through a new endpoint would have been a second copy of
//: machinery that already exists and already has guards.
async function docLinkMention(row, button) {
  const title = (currentDoc?.title || "").trim();
  if (!title) return;
  button.disabled = true;
  try {
    let content = null;
    if (row.kind === "note") {
      const known = (typeof allEntries !== "undefined" ? allEntries : []).find((e) => e.id === row.id);
      content = known ? known.content : (await apiJson(`/entries/${row.id}`)).content;
    } else {
      content = (await apiJson(`/documents/${row.id}`)).content;
    }
    const slice = (content || "").slice(row.start, row.end);
    //: The offsets were taken when the panel was drawn. A source edited in
    //: another tab since would have this land in the middle of a sentence, so
    //: the span is checked against the title before anything is written and
    //: the panel is redrawn rather than guessed at.
    if (slice.toLowerCase() !== title.toLowerCase()) {
      toast("That mention has moved, the panel is refreshing.");
      renderDocBacklinks();
      return;
    }
    const next = content.slice(0, row.start) + `[[${title}]]` + content.slice(row.end);
    if (row.kind === "note") {
      await apiJson(`/entries/${row.id}`, {
        method: "PUT",
        body: JSON.stringify({ content: next }),
      });
      if (typeof loadEntries === "function") loadEntries();
    } else {
      await apiJson(`/documents/${row.id}`, {
        method: "PUT",
        body: JSON.stringify({ content: next }),
      });
      await loadDocuments(currentDoc?.id);
    }
    toast(`Linked from ${row.title}.`);
  } catch (error) {
    toast(error.message, true);
  } finally {
    button.disabled = false;
    renderDocBacklinks();
  }
}

function docBacklinkItem(row, linked) {
  const item = document.createElement("li");
  item.className = "doc-backlink";
  const open = document.createElement("button");
  open.type = "button";
  open.className = "outline-link doc-backlink-title";
  setLabel(open, `${row.kind === "document" ? "ph:file-text" : "ph:note"} ${row.title}`);
  open.title = row.kind === "document" ? "Open this document" : "Show this note";
  open.addEventListener("click", () => docOpenBacklinkSource(row));
  const foot = document.createElement("div");
  foot.className = "doc-backlink-foot";
  if (linked) {
    const already = docLinksTo(row.title);
    const back = smallButton(
      already ? "Linked both ways" : "Link back",
      already
        ? "This document already links to it"
        : `Insert [[${row.title}]] where the caret is`,
      () => docLinkBack(row.title)
    );
    back.disabled = already;
    back.classList.add("doc-backlink-action");
    foot.appendChild(back);
  } else {
    const link = smallButton("Link", `Turn this mention into a link to ${currentDoc?.title || "this document"}`, () => {});
    link.classList.add("doc-backlink-action");
    link.addEventListener("click", () => docLinkMention(row, link));
    foot.appendChild(link);
  }
  item.append(open, docBacklinkContext(row), foot);
  return item;
}

async function renderDocBacklinks() {
  const wrap = $("doc-backlinks-wrap");
  const list = $("doc-backlinks");
  if (!wrap || !list) return;
  const token = ++docBacklinksToken;
  let body = null;
  if (currentDoc?.id != null) {
    body = await apiJson(`/documents/${currentDoc.id}/backlinks`, { silent: true }).catch(() => null);
  }
  if (token !== docBacklinksToken) return; // a newer document answered first
  const links = (body && body.links) || [];
  const mentions = (body && body.mentions) || [];

  wrap.classList.toggle("hidden", !links.length);
  list.replaceChildren();
  for (const row of links) list.appendChild(docBacklinkItem(row, true));
  const count = wrap.querySelector(".doc-backlinks-count") || docSectionCount("doc-backlinks-count");
  if (!count.parentElement) wrap.querySelector("h3")?.append(document.createTextNode(" "), count);
  count.textContent = links.length ? String(links.length) : "";

  const host = docMentionsHost(mentions.length > 0);
  if (host) {
    const mentionList = host.querySelector(".doc-mentions");
    mentionList.replaceChildren();
    for (const row of mentions) mentionList.appendChild(docBacklinkItem(row, false));
    host.querySelector(".doc-mentions-count").textContent = mentions.length
      ? String(mentions.length)
      : "";
    host.classList.toggle("hidden", !mentions.length);
  }
}

// The notes this document draws on. Shown beside the outline because both
// answer the same question, what is this document made of.
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
    const remove = smallButton("ph:x", "Detach this note from the document", async () => {
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
    //: **The link and its ✕ are one row.** Reported as "References stacks a
    //: close button above its own select": `.outline-link` is `width: 100%`,
    //: so the remove button beside it had nowhere to go but the next line,
    //: and a reference read as two controls with no relationship. The class
    //: is what makes the `li` a flex row and lets the link shrink; nothing
    //: about the buttons themselves changes.
    item.className = "doc-outline-row";
    const open = document.createElement("button");
    open.type = "button";
    open.className = "outline-link";
    setLabel(open, `ph:link ${bookmark.title || bookmark.url}`);
    open.title = bookmark.url;
    // safeHref() (app.js): the same scheme guard library.js's bookmark rows
    // use, so a bookmark saved before INBOX 310's write-time check existed
    // can't reach window.open() with an unlisted scheme from here either.
    open.addEventListener("click", () => window.open(safeHref(bookmark.url), "_blank", "noopener,noreferrer"));
    const remove = smallButton("ph:x", "Remove this reference", async () => {
      await apiJson(`/documents/${currentDoc.id}/bookmarks/${bookmark.id}`, { method: "DELETE" });
      renderDocBookmarks();
    });
    remove.classList.add("doc-outline-row-action");
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
  //: **The picker and its way out are one row, and it replaces the button
  //: that opened it.** Before this the select was inserted above a
  //: still-visible "Attach a link", so asking to attach one left two
  //: full-width controls stacked with no way to change your mind but to pick
  //: something: the other half of "References stacks a close button above its
  //: own select". Opening it twice also stacked two selects, because nothing
  //: checked for one already there.
  const existing = wrap.querySelector(".doc-attach-row");
  if (existing) existing.remove();
  const row = document.createElement("div");
  row.className = "row doc-attach-row";
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
  const close = () => {
    document.removeEventListener("keydown", onEscape, true);
    row.remove();
    $("doc-attach-bookmark").classList.remove("hidden");
    $("doc-attach-bookmark").focus();
  };
  //: Escape as well as the ✕, because a picker that opened on a button press
  //: is the shape everyone tries Escape on first.
  //:
  //: **On the document, not on the `<select>` or even on the row.**
  //: `enhanceSelect` in app.js replaces every select in the page with a shell
  //: holding a `<button>` opener and a listbox, and takes the real select out
  //: of the tab order (`select-native-hidden`, `tabindex="-1"`), so the
  //: `select.focus()` below lands nowhere and the keystroke is dispatched at
  //: `document.body`. A listener on the element never fired; one on the row
  //: never fired either, because the event's target was outside it. Both were
  //: caught by measuring, not by reading: the sweep pressed Escape twice and
  //: the picker stayed open twice, and the row's children read back as SPAN
  //: and BUTTON rather than SELECT and BUTTON. Removed again in `close`, so
  //: nothing outlives the picker.
  function onEscape(event) {
    if (event.key !== "Escape") return;
    //: Only when the listbox is shut. Escape inside an open listbox is that
    //: menu's own way out, and taking it would close the picker from under
    //: someone who was only backing out of the list.
    if (row.querySelector('[aria-expanded="true"]')) return;
    event.preventDefault();
    close();
  }
  document.addEventListener("keydown", onEscape, true);
  select.addEventListener("change", async () => {
    if (!select.value || !currentDoc) return;
    await apiJson(`/documents/${currentDoc.id}/bookmarks`, {
      method: "POST",
      body: JSON.stringify({ bookmark_id: Number(select.value) }),
    });
    close();
    renderDocBookmarks();
  });
  const cancel = smallButton("ph:x", "Don't attach a link", close);
  cancel.classList.add("doc-outline-row-action");
  row.append(select, cancel);
  wrap.insertBefore(row, $("doc-attach-bookmark"));
  $("doc-attach-bookmark").classList.add("hidden");
  //: `focusSelect` (app.js), which is where this trap and its answer now live
  //: together. It was open-coded here first, before a sweep of the rest of the
  //: app found three more call sites doing the plain `.focus()` silently.
  focusSelect(select);
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
  //: **The day's page** (DOCUMENTS_PLAN section 14). The whole of "daily notes"
  //: on this surface is this row: the Timeline owns the journal, its endpoints,
  //: its streak and its calendar strip, and a second create-or-return here
  //: would be the second implementation of one idea. What this adds is what a
  //: document is and a note is not, for a day that grows past a capture.
  //:
  //: `docTitle` is the ISO day and not the gallery's label, because the day's
  //: page is called by its day: it is the exact string `dailyNoteTitle` writes
  //: in app.js, which is the only thing that lets the Timeline recognise a day
  //: written here as that day's page.
  {
    id: "daily", title: "Daily", hint: "Today's page: what happened, what is open, what is next.",
    docTitle: "{{isodate}}",
    content: "# {{isodate}}\n\n## What happened\n\n- \n\n## Still open\n\n- [ ] \n\n## Next\n\n- \n",
  },
];

function docTemplateFill(template) {
  const now = new Date();
  const date = now.toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
  //: **`{{isodate}}` is the local day, built by hand rather than from
  //: `toISOString()`**, which converts to UTC first and so names yesterday for
  //: anyone east of it after their evening. "Today" is a fact about where the
  //: person is sitting; `routes_entries.py`'s D6 block makes the same argument
  //: for the server, which is why the day is the caller's there too.
  const iso = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0"),
  ].join("-");
  const fill = (text) => (text || "").replaceAll("{{date}}", date).replaceAll("{{isodate}}", iso);
  //: A template's gallery label and the title it gives the document are not
  //: always the same words: "Daily" names the choice in the gallery, and the
  //: document it makes is called by its day (`docTitle`, section 14).
  const title = template.id === "blank" ? "Untitled" : fill(template.docTitle || template.title);
  return {
    title,
    content: fill(template.content).replaceAll("{{title}}", title),
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
    for (const type of ["mouseenter", "focus"]) {
      button.addEventListener(type, () => showDocTemplatePreview(template));
    }
    li.appendChild(button);
    list.appendChild(li);
  }
  dialog.showModal();
  list.querySelector("button")?.focus();
  //: The first row is Blank, which has nothing to picture: the preview opens
  //: on the first template with a body, so the dialog shows what a template
  //: is before anything is pointed at.
  showDocTemplatePreview(DOC_TEMPLATES.find((template) => template.content) || DOC_TEMPLATES[0]);
}

//: **The page a template makes, before it is made** (DOCUMENTS_PLAN Phase 4:
//: templates "offered with a preview"). The gallery offered a sentence per
//: row ("Brief, criteria, sections, sources, timeline."), which says what a
//: template is about and not what it looks like. This is the filled body,
//: through the same `docTemplateFill` the button uses and the same
//: `renderMarkdown` the document's own preview uses, shrunk to a page in the
//: dialog's second column, so what is shown is exactly what would be created.
function showDocTemplatePreview(template) {
  const pane = $("doc-template-preview");
  if (!pane || !template) return;
  if (pane.dataset.template === template.id) return;
  pane.dataset.template = template.id;
  const page = document.createElement("div");
  page.className = "doc-template-page md";
  const filled = docTemplateFill(template);
  if (filled.content) {
    renderMarkdown(page, filled.content);
  } else {
    const empty = document.createElement("p");
    empty.className = "muted doc-template-empty";
    empty.textContent = template.hint;
    page.appendChild(empty);
  }
  pane.replaceChildren(page);
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
  docSetStatusText($("doc-saved"), "Unsaved…");
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
// =============================================================================
// Breadcrumbs: where the caret is, in the document's own structure
// =============================================================================
//
// DOCUMENTS_PLAN Phase 4 item 3. The outline answers "what is in this
// document"; this answers "where am I in it", which is the question a reader
// two screens into a section cannot answer from the text in front of them.
// Obsidian has neither; VS Code, IntelliJ and Word all do, and all three put
// it in the same place: one line above the writing, not in the chrome.
//
// It is a trail rather than a label because the useful part is the *ancestry*:
// "Sampling" on its own says nothing, and "Method > Sampling" says which of
// the three sections called Sampling you are in.

// DOC-CRUMBS-BEGIN

//: The headings a line sits under, as indexes into `headings`, outermost
//: first. `[]` for a line above the first heading, which is a real position in
//: most documents (the paragraph before the first `#`) rather than an error.
//:
//: Walked forward with a stack rather than searched backwards per level: a
//: backwards search has to ask "is there a level 2 between here and the level
//: 1" for every level, which is the shape that gets the skipped-level case
//: wrong. A document that goes `#` then `###` has a two-deep trail, not a
//: three-deep one with a hole in it, and the stack gives that for free.
function docHeadingTrail(headings, line) {
  const trail = [];
  const list = headings || [];
  const at = Number.isFinite(line) ? line : 0;
  for (let index = 0; index < list.length; index += 1) {
    const heading = list[index];
    //: `>` rather than `>=`: the caret *on* a heading's own line is inside
    //: that heading, which is what a writer editing the heading means.
    if (heading.line > at) break;
    while (trail.length && list[trail[trail.length - 1]].level >= heading.level) trail.pop();
    trail.push(index);
  }
  return trail;
}

// DOC-CRUMBS-END

//: **The headings the outline last read.** The breadcrumb needs them on every
//: keystroke (`renderDocCaret` runs then, and the caret is what the trail is
//: about), and finding them is a scan of the whole document: on a 20k-word
//: file that is a 20k-element split per character typed. The outline is
//: rebuilt on a pause in typing, so a heading written a moment ago reaches the
//: trail on the same beat it reaches the outline, which is the beat a writer
//: is already watching.
let docOutlineHeadingList = [];

//: The row, and its one-time wiring. It is in index.html (see the markup
//: there for why), so this is a lookup rather than a build; what is done once
//: here is the edge-fade, whose listeners app.js only attaches to the strips
//: that exist when it boots, before this tab has ever been opened.
let docCrumbsWired = false;

function docCrumbsEl() {
  const nav = $("doc-crumbs");
  if (!nav || docCrumbsWired) return nav;
  docCrumbsWired = true;
  nav.addEventListener("scroll", () => window.syncEdgeFade?.(nav), { passive: true });
  if (typeof ResizeObserver !== "undefined") {
    //: The half that actually matters here: a trail's width changes when the
    //: caret moves into a deeper section, with no window resize to hang a
    //: recalculation off, and a strip whose fade is only recomputed on resize
    //: keeps whichever mask it had when it was last measured.
    new ResizeObserver(() => window.syncEdgeFade?.(nav)).observe(nav);
  }
  return nav;
}

//: What the row says, as one string, so the common case (a keystroke that
//: moves the caret inside the same section) costs a comparison rather than a
//: rebuild of four buttons per character typed.
let docCrumbsKey = "";

function renderDocCrumbs(line) {
  const nav = docCrumbsEl();
  if (!nav) return;
  const list = nav.firstElementChild;
  const headings = docOutlineHeadingList;
  //: A document with no headings has nothing to say here, and a row that is
  //: present and empty is a strip of blank space above the writing.
  nav.classList.toggle("hidden", !headings.length);
  if (!headings.length) {
    list.replaceChildren();
    docCrumbsKey = "";
    return;
  }
  //: The document itself is the first crumb, and it jumps to the top. Phase
  //: 1's own sketch of the header reads `Documents > Design system notes`, so
  //: the trail starting at the document is the shape this plan already chose;
  //: it also keeps the row the same height whether or not the caret is under
  //: a heading yet, which is what stops it from jumping as you write.
  const crumbs = [{ text: ($("doc-title")?.value || "").trim() || "Untitled", line: 0 }];
  for (const index of docHeadingTrail(headings, line)) crumbs.push(headings[index]);
  const key = crumbs.map((crumb) => `${crumb.line}:${crumb.text}`).join("\u0000");
  if (key === docCrumbsKey) return;
  docCrumbsKey = key;
  list.replaceChildren();
  crumbs.forEach((crumb, index) => {
    const li = document.createElement("li");
    const button = document.createElement("button");
    button.type = "button";
    button.className = "linklike doc-crumb";
    button.textContent = crumb.text;
    button.title = index ? `Jump to \u201c${crumb.text}\u201d` : "Jump to the top of the document";
    //: The last crumb is where you are, and `aria-current="location"` is how
    //: the recipe index says a row says so: the weight it is drawn in hangs
    //: off this attribute in CSS, so the mark and its announcement are one
    //: thing and cannot drift apart.
    if (index === crumbs.length - 1) button.setAttribute("aria-current", "location");
    button.addEventListener("click", () => jumpToDocLine(crumb.line));
    li.appendChild(button);
    list.appendChild(li);
  });
  //: After the row is built, not before: the fade is a measurement of
  //: `scrollWidth` against `clientWidth`, and both are the previous trail's
  //: until the new buttons are in the document.
  window.syncEdgeFade?.(nav);
}

//: The caret's line, 0-based, for the callers that want the trail but do not
//: already hold a set of caret stats.
function docCaretLine() {
  const box = docActiveBox();
  if (!box) return 0;
  try {
    return box.lineAt(box.selection().from).number - 1;
  } catch {
    //: A surface mid-teardown (the engine swapping in under the textarea) can
    //: answer neither, and a breadcrumb is not worth an exception in the
    //: middle of a document open.
    return 0;
  }
}

//: **Folding, and the filter box** (DOCUMENTS_PLAN Phase 4 item 3, and
//: OPEN.md's "The outline is headings only, and it does not fold").
//:
//: **Folds are kept per document, by heading rather than by line.** A line
//: number is the obvious key and the wrong one: it changes every time a
//: paragraph is added above, so a folded section would unfold itself, or
//: worse, some other section would be folded in its place, the moment anybody
//: wrote anything. The heading's own level and text survive an edit anywhere
//: else in the document, which is what a remembered fold has to survive to be
//: worth remembering. Two headings with the same words at the same level fold
//: together, which is a fair reading of "the same section" and the only
//: ambiguity this key has.
//:
//: In `localStorage` because it is a per-viewer convenience about how a panel
//: is drawn, not something about the document: a fold written into the file
//: would travel to everyone who opens it and would show up in its diff.
const DOC_OUTLINE_FOLD_KEY = "doc-outline-folds";

//: Ten. Below it the whole outline is on screen and a filter box is a control
//: that costs a row and saves nothing; past it the list is longer than the
//: panel and hunting starts. OPEN.md puts the line at "two screens of
//: headings", which in this sidebar's own measurement (`#doc-outline-wrap` at
//: 85px with the list scrolling inside it) arrives well before twenty.
const DOC_OUTLINE_FILTER_FROM = 10;

function docOutlineFoldStore() {
  //: Keyed by document, so folding one document's sections says nothing about
  //: another's. A document with no id yet (never saved) gets no store rather
  //: than a shared one.
  const id = typeof currentDoc !== "undefined" && currentDoc ? currentDoc.id : null;
  return id ? `${DOC_OUTLINE_FOLD_KEY}:${id}` : "";
}

function docOutlineFolds() {
  const store = docOutlineFoldStore();
  if (!store) return new Set();
  try {
    const raw = JSON.parse(localStorage.getItem(store) || "[]");
    return new Set(Array.isArray(raw) ? raw.filter((k) => typeof k === "string") : []);
  } catch {
    //: Private mode, or a value written by an older shape. An outline that
    //: draws unfolded is right; one that throws on open is not.
    return new Set();
  }
}

function docOutlineSetFolds(folds) {
  const store = docOutlineFoldStore();
  if (!store) return;
  try {
    localStorage.setItem(store, JSON.stringify([...folds]));
  } catch {
    //: Nothing to do and nothing worth saying: the fold still applies to the
    //: outline on screen, it just will not survive a reload.
  }
}

function docOutlineFoldKey(heading) {
  return `${heading.level}:${heading.text}`;
}

function docOutlineFilterText() {
  return ($("doc-outline-filter")?.value || "").trim().toLowerCase();
}

//: Which rows are drawn, as one pass over the headings, because folding and
//: filtering are two answers to the same question and a row cannot be given
//: to both. **Filtering wins outright**: a search that hides its own matches
//: inside a folded section is a search that reports nothing and is right about
//: nothing, so while there is a needle the folds are ignored entirely.
//:
//: Returns, per heading: whether it is drawn, and whether it can fold (which
//: is a fact about the document, not about the filter, so it is the same
//: either way and the caret does not appear and disappear as you type).
function docOutlineVisibility(headings, needle, folds) {
  const rows = headings.map((heading, index) => {
    const next = headings[index + 1];
    return { shown: true, foldable: Boolean(next && next.level > heading.level) };
  });
  if (needle) {
    headings.forEach((heading, index) => {
      rows[index].shown = heading.text.toLowerCase().includes(needle);
    });
    return rows;
  }
  //: A fold hides the run of deeper headings under it, and a fold inside a
  //: folded section needs no second pass: the outer one already covers every
  //: row the inner one would.
  let hideUnder = -1;
  headings.forEach((heading, index) => {
    if (hideUnder >= 0 && heading.level > hideUnder) {
      rows[index].shown = false;
      return;
    }
    hideUnder = -1;
    if (rows[index].foldable && folds.has(docOutlineFoldKey(heading))) hideUnder = heading.level;
  });
  return rows;
}

//: **The headings in a piece of markdown**, pulled out of `renderDocOutline`
//: so the reorder (Phase 4 item 3) can ask the *current* text where a section
//: starts and ends. The outline's own list is rebuilt on a pause in typing, so
//: acting on its line numbers a keystroke later would move the wrong run of
//: lines; scanning again costs one pass and cannot be stale.
function docScanHeadings(text) {
  const headings = [];
  let inFence = false;
  const lines = String(text == null ? "" : text).split("\n");
  lines.forEach((line, index) => {
    // A "# " inside a code fence is code, not a heading.
    if (line.trim().startsWith("```")) inFence = !inFence;
    if (inFence) return;
    const match = /^(#{1,4})\s+(.*\S)\s*$/.exec(line);
    if (match) {
      headings.push({ level: match[1].length, text: match[2], line: index });
      return;
    }
    //: **The setext form too**, `Title` on one line with `=====` or `-----`
    //: under it. The editor renders these as headings (`docLivePlugin`'s
    //: heading branch matches `SetextHeading1` and `2`), so an outline that
    //: skipped them showed "2" over a document with three headings in it, one
    //: of them the largest thing on the page. Recognised on the *underline*,
    //: because that is the line that decides: `Title` on its own is a
    //: paragraph until the row of `=` arrives.
    //:
    //: Guards, and each one is a real document: the line above has to have
    //: text in it (a rule with a blank line above it is a `<hr>`, not a
    //: heading), it must not already be an ATX heading or a list item or a
    //: quote (all of which a `---` under them would not turn into a heading),
    //: and the previous line must not itself have been consumed as one.
    const underline = /^\s*(=+|-{2,})\s*$/.exec(line);
    if (!underline || index === 0) return;
    const above = lines[index - 1];
    if (!above || !above.trim()) return;
    if (/^\s*(#{1,6}\s|[-*+]\s|\d+[.)]\s|>|\|)/.test(above)) return;
    if (headings.length && headings[headings.length - 1].line === index - 1) return;
    headings.push({
      level: underline[1][0] === "=" ? 1 : 2,
      text: above.trim(),
      line: index - 1,
    });
  });
  return headings;
}

//: **A section is its heading and everything under it**, down to the next
//: heading at the same level or shallower: the run of lines a reader means
//: when they drag "Results" somewhere else. `lineCount` rather than the text
//: again, because every caller has already split it.
function docSectionRange(headings, index, lineCount) {
  const heading = headings[index];
  let end = lineCount;
  for (let next = index + 1; next < headings.length; next += 1) {
    if (headings[next].level <= heading.level) {
      end = headings[next].line;
      break;
    }
  }
  return { from: heading.line, to: end };
}

// =============================================================================
// The editor's own commands: one table, two doors (DOCUMENTS_PLAN Phase 4 item 4)
// =============================================================================
//
// The plan calls this "the single biggest fix for features that do not show
// themselves", and it asks for two things: a palette listing every editor
// action with its shortcut, and a `?` shortcut sheet "generated from the same
// table so the two cannot disagree". This is that table.
//
// **The decision the plan left open, taken here because it had to be.** The
// plan names `Ctrl+K`, written before this app had a command palette of its
// own on exactly that chord (`openPalette`, app.js). Two palettes on one key
// is the collision the agent palette's own comment already records being
// caught twice. So the editor's commands *join* the palette the app has, in a
// group of their own, offered only while a document is actually open and on
// screen; the chord stays where every other surface's commands already live.
// A reader who presses Ctrl+K in a document now finds the document's own
// actions at the top of the list they already know, rather than a second list
// they have to learn.
//
// **A row whose action already has a button runs the button.** Not a copy of
// its handler: a copy is a second definition of what "Export as HTML" means,
// and the two drift the first time one is edited. The table carries the
// control's id and the run is a click, which is also why every one of these
// is reachable at all: a command that pointed at a function the dock no
// longer calls would look right here and do nothing.
//
// Bracketed by `DOC-COMMANDS-BEGIN`/`END` so `tests/test_doc_commands.py` can
// read the table's shape without a browser.

// DOC-COMMANDS-BEGIN

//: Pressing a control that is in a closed `<details>` menu still works (the
//: browser dispatches to a hidden element quite happily), but a control that
//: is not in the document at all is a command that silently does nothing, so
//: it says so instead.
function docRunControl(id, what) {
  const el = $(id);
  if (!el) {
    toast(`${what} is not available here.`, true);
    return;
  }
  el.click();
}

//: The table. `keys` is the chord the editor already listens for, or "" where
//: the action has no chord: the shortcut sheet draws the rows that have one
//: and the palette draws all of them, which is the division the plan asks for
//: ("every editor action with its shortcut").
const DOC_COMMANDS = [
  { id: "save", icon: "ph:floppy-disk", label: "Save this document", keys: "Ctrl+S",
    run: () => saveDocument() },
  { id: "find", icon: "ph:magnifying-glass", label: "Find and replace in this document", keys: "Ctrl+F",
    run: () => toggleDocFindBar(true) },
  { id: "bold", icon: "ph:text-b", label: "Bold", keys: "Ctrl+B",
    run: () => wrapDocSelection("**", "bold text") },
  { id: "italic", icon: "ph:text-italic", label: "Italic", keys: "Ctrl+I",
    run: () => wrapDocSelection("*", "italic text") },
  { id: "strike", icon: "ph:text-strikethrough", label: "Strike through", keys: "Ctrl+Shift+S",
    run: () => wrapDocSelection("~~", "struck through") },
  { id: "code", icon: "ph:code", label: "Inline code", keys: "Ctrl+E",
    run: () => wrapDocSelection("`") },
  { id: "h1", icon: "ph:text-h-one", label: "Heading 1", keys: "Ctrl+1",
    run: () => applyMarkdown("h1") },
  { id: "h2", icon: "ph:text-h-two", label: "Heading 2", keys: "Ctrl+2",
    run: () => applyMarkdown("h2") },
  { id: "h3", icon: "ph:text-h-three", label: "Heading 3", keys: "Ctrl+3",
    run: () => applyMarkdown("h3") },
  { id: "comment", icon: "ph:chat-teardrop-text", label: "Comment on the selection", keys: "Ctrl+/",
    run: () => toggleDocComment(docSurface()) },
  { id: "indent", icon: "ph:text-indent", label: "Indent the line or list item", keys: "Tab", run: null },
  { id: "outdent", icon: "ph:text-outdent", label: "Outdent the line or list item", keys: "Shift+Tab", run: null },
  { id: "move-section", icon: "ph:arrows-down-up", label: "Move the section, from the outline", keys: "Alt+↑ / Alt+↓", run: null },
  { id: "ul", icon: "ph:list-bullets", label: "Bulleted list", keys: "", run: () => applyMarkdown("ul") },
  { id: "ol", icon: "ph:list-numbers", label: "Numbered list", keys: "", run: () => applyMarkdown("ol") },
  { id: "task", icon: "ph:check-square", label: "Task list", keys: "", run: () => applyMarkdown("task") },
  { id: "quote", icon: "ph:quotes", label: "Quote", keys: "", run: () => applyMarkdown("quote") },
  { id: "link", icon: "ph:link", label: "Link", keys: "", run: () => applyMarkdown("link") },
  { id: "view-edit", icon: "ph:pencil-simple", label: "Edit this document", keys: "",
    run: () => setDocView(lastEditView) },
  { id: "view-read", icon: "ph:book-open", label: "Read this document", keys: "",
    run: () => setDocView("rendered") },
  { id: "formatting", icon: "ph:text-aa", label: "Show or hide the formatting tools", keys: "",
    run: () => docRunControl("doc-format-toggle", "The formatting strip") },
  { id: "focus", icon: "ph:moon", label: "Focus mode", keys: "",
    run: () => docRunControl("doc-focus-toggle", "Focus mode") },
  { id: "typewriter", icon: "ph:arrows-in-line-horizontal", label: "Typewriter scrolling", keys: "",
    run: () => docRunControl("doc-typewriter", "Typewriter scrolling") },
  { id: "dim-others", icon: "ph:circle-half-tilt", label: "Dim every paragraph but this one", keys: "",
    run: () => docRunControl("doc-dim-others", "Dimming") },
  { id: "serif", icon: "ph:text-aa", label: "Serif reading face", keys: "",
    run: () => docRunControl("doc-serif", "The serif face") },
  { id: "goal", icon: "ph:target", label: "Set a word goal", keys: "",
    run: () => docRunControl("doc-word-goal", "The word goal") },
  { id: "ai", icon: "ph:magic-wand", label: "Ask Atlas to edit this document", keys: "",
    run: () => docRunControl("doc-ai", "AI editing") },
  { id: "extract", icon: "ph:scissors", label: "Extract notes from this document", keys: "",
    run: () => docRunControl("doc-extract", "Extracting notes") },
  { id: "history", icon: "ph:clock-counter-clockwise", label: "Every version this document has had", keys: "",
    run: () => docRunControl("doc-history", "Version history") },
  { id: "connections", icon: "ph:graph", label: "What this document is joined to", keys: "",
    run: () => docRunControl("doc-connections", "Connections") },
  { id: "export-md", icon: "ph:download-simple", label: "Download as .md", keys: "",
    run: () => docRunControl("doc-export-md", "The markdown export") },
  { id: "export-html", icon: "ph:file-html", label: "Download as one .html file", keys: "",
    run: () => docRunControl("doc-export-html", "The HTML export") },
  { id: "export-docx", icon: "ph:file-doc", label: "Download as Word (.docx)", keys: "",
    run: () => docRunControl("doc-export-docx", "The Word export") },
  { id: "export-pdf", icon: "ph:file-pdf", label: "Print or save as PDF", keys: "",
    run: () => docRunControl("doc-export-pdf", "The PDF export") },
  //: `code: true` rows are offered by the palette only while a code
  //: document is open; the shortcut sheet lists them always, marked by
  //: their wording as being for code.
  { id: "format", icon: "ph:brackets-curly", label: "Format the code, or the selected lines", keys: "Shift+Alt+F",
    code: true, run: () => docRunControl("doc-code-format", "Formatting") },
  { id: "quick-fix", icon: "ph:wrench", label: "Quick fixes for the problem at the caret", keys: "Alt+Enter",
    code: true, run: () => docOpenCodeFixes() },
  //: CodeMirror's default keymap has always bound this chord; the row is what
  //: puts it in the palette and the shortcut sheet (INBOX 402).
  { id: "block-comment", icon: "ph:brackets-angle", label: "Block comment around the selection", keys: "Shift+Alt+A",
    code: true, run: () => docCodeCommentAtCaret(docSurface(), true) },
  //: Emmet's editing commands (INBOX 402). No chord: VS Code has none for
  //: them either, and every free one is spoken for by something commoner.
  { id: "emmet-wrap", icon: "ph:brackets-angle", label: "Wrap the selection with an Emmet abbreviation", keys: "",
    code: true, run: () => docEmmetWrap() },
  { id: "emmet-balance-out", icon: "ph:arrows-out-line-horizontal", label: "Select the enclosing tag (Emmet balance outward)", keys: "",
    code: true, run: () => docEmmetBalance(false) },
  { id: "emmet-balance-in", icon: "ph:arrows-in-line-horizontal", label: "Select the tag inside (Emmet balance inward)", keys: "",
    code: true, run: () => docEmmetBalance(true) },
  //: VS Code's Ctrl+Shift+O, without the chord: the registry gives it to a
  //: new chat. The outline panel lists the same symbols.
  { id: "symbols", icon: "ph:list-magnifying-glass", label: "Go to a symbol in this file", keys: "",
    code: true, run: () => docOpenSymbols() },
  { id: "code-wrap", icon: "ph:text-align-left", label: "Wrap long lines in a code file", keys: "Alt+Z",
    code: true, run: () => docToggleCodeDraw("codeWrap") },
  { id: "whitespace", icon: "ph:paragraph", label: "Show whitespace in a code file", keys: "",
    code: true, run: () => docToggleCodeDraw("whitespace") },
];

// DOC-COMMANDS-END

//: **Only while a document is open and on screen.** The palette is reachable
//: from every tab, and "Bold" run from the Notes tab would wrap a selection in
//: a document nobody is looking at. `activeTab` is where the app keeps which
//: tab is showing (app.js's `switchTab` writes it), so this asks the same
//: question the tab bar answers.
//:
//: A row with no `run` is a keyboard-only move (Tab, Alt with an arrow): it
//: belongs in the shortcut sheet, which is a list of what the keys do, and not
//: in a palette, which is a list of things a press can perform.
function docPaletteCommands() {
  let tab = "";
  try {
    tab = localStorage.getItem("activeTab") || "";
  } catch {
    //: Private mode. One group missing from the palette is the right failure.
    return [];
  }
  if (tab !== "documents" || !currentDoc) return [];
  const code = !docFileType().previewable;
  return DOC_COMMANDS.filter((command) => command.run && (!command.code || code)).map((command) => ({
    group: "This document",
    label: `${command.icon} ${command.label}`,
    keys: command.keys,
    run: command.run,
  }));
}

//: The `?` sheet's editor section, from the same table, so the two cannot
//: disagree. Called by `openShortcuts` (app.js) rather than wired here,
//: because this file is in the Library's lazy bundle and the dialog can be
//: opened before it has ever loaded: the section then simply says so.
function renderDocShortcutSheet(list) {
  if (!list) return;
  list.replaceChildren();
  for (const command of DOC_COMMANDS) {
    if (!command.keys) continue;
    const li = document.createElement("li");
    const keys = document.createElement("span");
    keys.className = "shortcut-keys";
    //: One `<kbd>` per key, the shape the hand-written rows above it use, so
    //: a generated row and a written one are the same thing on screen.
    for (const part of command.keys.split(/\s*\+\s*/)) {
      const kbd = document.createElement("kbd");
      kbd.textContent = part;
      keys.appendChild(kbd);
    }
    const label = document.createElement("span");
    label.textContent = command.label;
    li.append(keys, label);
    list.appendChild(li);
  }
}

//: **Reordering the document from its outline** (DOCUMENTS_PLAN Phase 4 item
//: 3, PLAN D6). Dragging a row moves the *section*, the heading and everything
//: under it down to the next heading at the same level or shallower, which is
//: what a reader means by "move Results above Method".
//:
//: **The lines are re-scanned at the moment of the drop, never taken from the
//: outline's own rows.** The outline is rebuilt on a pause in typing, so a row
//: dragged a keystroke after an edit carries line numbers from the document as
//: it was, and moving that run would cut the wrong paragraphs out of the
//: middle of the text. `docScanHeadings` costs one pass over a string this
//: file already holds.
//:
//: The write goes through the surface's own `text` setter, which diffs prefix
//: and suffix and dispatches the smallest change that gets there, so a move is
//: one undo step rather than a whole-document replacement.
function docOutlineMoveSection(fromIndex, toIndex, after) {
  const box = docSurface();
  if (!box) return false;
  const text = box.text;
  const lines = text.split("\n");
  const headings = docScanHeadings(text);
  if (!headings[fromIndex] || !headings[toIndex]) return false;
  const src = docSectionRange(headings, fromIndex, lines.length);
  const dst = after
    ? docSectionRange(headings, toIndex, lines.length).to
    : headings[toIndex].line;
  //: **A section cannot be dropped inside itself**, which is what dragging a
  //: parent onto one of its own children asks for: the block would be cut out
  //: and put back into a hole that no longer exists. Refused rather than
  //: clamped, because there is no sensible place a reader could have meant.
  if (dst > src.from && dst < src.to) return false;
  if (dst === src.from) return false;
  const block = lines.slice(src.from, src.to);
  //: The last section of a document usually has no blank line after it, so
  //: moving it up would weld its last paragraph to the next heading. One
  //: blank line, and only when it is actually missing: everything else about
  //: the block's spacing is the writer's and is carried across untouched.
  if (block.length && block[block.length - 1].trim()) block.push("");
  const rest = [...lines.slice(0, src.from), ...lines.slice(src.to)];
  const at = dst > src.from ? dst - (src.to - src.from) : dst;
  rest.splice(at, 0, ...block);
  box.text = rest.join("\n");
  //: The outline is what was just dragged, so it is redrawn now rather than
  //: on the next pause: a list that still shows the old order for half a
  //: second reads as a drop that did not take.
  renderDocOutline();
  announce(`\u201c${headings[fromIndex].text}\u201d moved.`);
  return true;
}

//: Which side of a row the pointer is on. The midpoint, which is the rule
//: every list with a drop line uses, and the only one that lets a reader
//: place a section at the very end of a document.
function docOutlineDropAfter(row, clientY) {
  const box = row.getBoundingClientRect();
  return clientY > box.top + box.height / 2;
}

function docOutlineClearDrop() {
  for (const row of document.querySelectorAll("#doc-outline .is-drop-before, #doc-outline .is-drop-after")) {
    row.classList.remove("is-drop-before", "is-drop-after");
  }
}

//: **The keyboard half, which a drag can never be.** Alt with an arrow moves
//: the focused row's section past its neighbour, which is the same move the
//: drag makes and the only one this panel can offer somebody who is not using
//: a pointer. Alt because a bare arrow moves between rows and Ctrl+arrow is
//: the browser's own word jump; the same chord Notion and Obsidian use for
//: moving a block.
//:
//: Past its *neighbour in the outline*, not its sibling at the same level: the
//: rows are what the reader can see, and a rule that skipped rows would move
//: a section past things it looked like it was next to.
function docOutlineNudge(index, direction) {
  const headings = docScanHeadings(docText());
  const to = index + direction;
  if (!headings[index] || !headings[to]) return false;
  //: Downwards the section has to land *after* the row below it, upwards
  //: *before* the row above: "after" and "before" are the same two words the
  //: drop uses, so both routes end in one move function.
  //: **Asked for before the move, not after.** The write dispatches a
  //: transaction, which schedules the facts pass, which redraws this outline
  //: again a beat later: focusing a row here would put the ring on an element
  //: that is replaced milliseconds afterwards, and the measurement of that is
  //: `document.activeElement` coming back as `<body>`. So the row is named and
  //: every render restores it until the reader moves on (`docOutlineFocusKey`
  //: at the end of `renderDocOutline`).
  docOutlineFocusKey = docOutlineFoldKey(headings[index]);
  return docOutlineMoveSection(index, to, direction > 0);
}

function renderDocOutline() {
  const list = $("doc-outline");
  const wrap = $("doc-outline-wrap");
  if (!list || !wrap) return;
  const text = docText();
  const lines = text.split("\n");
  //: A code file's outline is its symbols (INBOX 402), a markdown file's its
  //: headings; the same rows, the same breadcrumb. Never a code file read
  //: as markdown: every `# comment` in a Python file was a heading here.
  const fileType = docFileType();
  let headings = [];
  if (fileType.previewable) headings = docScanHeadings(text);
  else if (docCmView && window.CM6) headings = docCodeSymbols(window.CM6, docCmView.state, fileType.ext);

  //: **The tasks in each section, counted.** DOCUMENTS_PLAN Phase 3 item 2
  //: asks for "task lists with progress in the outline", and the outline is
  //: where it belongs rather than beside the list itself: a checklist knows
  //: how far along it is by being read, and what a reader cannot see from the
  //: text is how far along the *section* is without scrolling to the end of
  //: it.
  //:
  //: A heading counts its whole subtree, not the lines before the next
  //: heading of any level: "Release" showing 0/0 while the three sub-sections
  //: under it hold every task in the document would be a count that is
  //: accurate and useless. Fenced code is skipped, for the same reason the
  //: headings above skip it.
  const DOC_TASK_LINE = /^\s*(?:[-*+]|\d+[.)])\s+\[([ xX])\]/;
  headings.forEach((heading, index) => {
    let end = lines.length;
    for (let next = index + 1; next < headings.length; next += 1) {
      if (headings[next].level <= heading.level) {
        end = headings[next].line;
        break;
      }
    }
    let done = 0;
    let total = 0;
    let fenced = false;
    for (let at = heading.line + 1; at < end; at += 1) {
      if (lines[at].trim().startsWith("```")) {
        fenced = !fenced;
        continue;
      }
      if (fenced) continue;
      const task = DOC_TASK_LINE.exec(lines[at]);
      if (!task) continue;
      total += 1;
      if (task[1] !== " ") done += 1;
    }
    heading.tasks = total ? { done, total } : null;
  });

  //: **The Outline tab always shows an outline section, even with nothing in
  //: it.** It used to hide itself below two headings, which meant that opening
  //: the tab called Outline on a document without them showed a "References"
  //: heading, a button and a help link, and nothing that mentioned outlines at
  //: all. Reported as "the empty state is a bare heading with nothing under
  //: it". An empty state that says what fills it is the difference between a
  //: panel that is empty and a panel that looks broken.
  wrap.classList.remove("hidden");
  //: The count belongs beside the word, the way every other counted list in
  //: this sidebar reads, so the heading answers "how deep is this document"
  //: without the eye having to run down the list.
  const folds = docOutlineFolds();
  const needle = docOutlineFilterText();
  const visible = docOutlineVisibility(headings, needle, folds);
  const shownCount = visible.filter((row) => row.shown).length;
  const count = $("doc-outline-count");
  //: "3 of 18" while filtering, because a bare "3" over a list somebody has
  //: just narrowed reads as a document with three headings in it.
  if (count) {
    count.textContent = !headings.length
      ? ""
      : needle
        ? `${shownCount} of ${headings.length}`
        : String(headings.length);
  }
  //: The box appears with the headings that make it worth having, and takes
  //: its own text with it when it goes: a filter left set on a control nobody
  //: can see is an outline that is mysteriously short.
  const filterBox = $("doc-outline-filter");
  if (filterBox) {
    const wanted = headings.length >= DOC_OUTLINE_FILTER_FROM;
    if (!wanted && filterBox.value) filterBox.value = "";
    filterBox.classList.toggle("hidden", !wanted);
  }
  list.replaceChildren();
  const empty = $("doc-outline-empty");
  if (empty) {
    empty.classList.toggle("hidden", headings.length > 0);
    empty.textContent = headings.length
      ? ""
      : "Headings you write appear here, and each one jumps to its place in the document.";
  }
  docOutlineRows = [];
  headings.forEach((heading, index) => {
    const li = document.createElement("li");
    li.className = `outline-h${heading.level} outline-row`;
    li.classList.toggle("hidden", !visible[index].shown);
    //: **The fold control is a gutter at the row's left edge, the same width
    //: on every row**, drawn as a button where the heading has children under
    //: it and as an empty slot where it does not. It cannot go inside the row
    //: itself, which is already a `<button>` that jumps to the heading, and a
    //: button inside a button is neither valid nor reachable. It cannot step
    //: with the indent either: `.outline-link`'s own padding is what carries
    //: depth (05-sidebars-themes.css spends a paragraph on why the left edges
    //: have to line up), and a caret that moved with it would put the deepest
    //: rows' controls in four different columns.
    const twist = document.createElement(visible[index].foldable ? "button" : "span");
    twist.className = "outline-twist";
    if (visible[index].foldable) {
      const folded = folds.has(docOutlineFoldKey(heading));
      twist.type = "button";
      twist.setAttribute("aria-expanded", folded ? "false" : "true");
      twist.title = folded
        ? `Show what is under \u201c${heading.text}\u201d`
        : `Hide what is under \u201c${heading.text}\u201d`;
      twist.setAttribute("aria-label", twist.title);
      const glyph = document.createElement("i");
      glyph.className = folded ? "ph ph-caret-right" : "ph ph-caret-down";
      glyph.setAttribute("aria-hidden", "true");
      twist.appendChild(glyph);
      twist.addEventListener("click", () => {
        const key = docOutlineFoldKey(heading);
        const next = docOutlineFolds();
        if (next.has(key)) next.delete(key);
        else next.add(key);
        docOutlineSetFolds(next);
        //: Redrawn rather than toggled in place: the rows a fold hides are
        //: decided by one pass over the whole list (`docOutlineVisibility`),
        //: and a second way of deciding it here would be a second answer.
        renderDocOutline();
      });
    } else {
      twist.setAttribute("aria-hidden", "true");
    }
    li.appendChild(twist);
    const button = document.createElement("button");
    button.type = "button";
    button.className = "outline-link";
    button.textContent = heading.text;
    button.title = `Jump to “${heading.text}”`;
    if (heading.tasks) {
      const chip = document.createElement("span");
      const { done, total } = heading.tasks;
      chip.className = done === total ? "outline-tasks outline-tasks-done" : "outline-tasks";
      chip.textContent = `${done}/${total}`;
      //: The chip is a number on a row that is already a link, so the row's
      //: own name has to carry what the number means: a screen reader reading
      //: "Design notes 2/5" is reading a fraction with no unit.
      button.title = `Jump to “${heading.text}”: ${done} of ${total} tasks done`;
      chip.setAttribute("aria-label", `${done} of ${total} tasks done`);
      button.appendChild(chip);
    }
    button.addEventListener("click", () => jumpToDocLine(heading.line));
    //: **Drag to reorder.** On the `li` rather than on the button, because the
    //: gutter's caret is inside the row too and a reader who grabs the caret
    //: means the row. `draggable` only while nothing is being filtered: the
    //: rows on screen are then a search result rather than the document's
    //: order, and dropping one "between" two rows that are not next to each
    //: other in the document is a position nobody could have meant.
    //: A symbol is not a section: a function dragged by its first line would
    //: take the lines up to the next symbol with it, which is not the
    //: function. Code rows jump; only headings move.
    if (!needle && !heading.symbol) {
      li.draggable = true;
      li.addEventListener("dragstart", (event) => {
        docOutlineDragIndex = index;
        li.classList.add("is-dragging");
        event.dataTransfer.effectAllowed = "move";
        //: Something has to be set or Firefox refuses to start the drag, and
        //: the heading's own text is the honest thing to carry: dropped into
        //: any other editor it reads as what was dragged.
        event.dataTransfer.setData("text/plain", heading.text);
      });
      li.addEventListener("dragend", () => {
        docOutlineDragIndex = -1;
        li.classList.remove("is-dragging");
        docOutlineClearDrop();
      });
      li.addEventListener("dragover", (event) => {
        if (docOutlineDragIndex === -1 || docOutlineDragIndex === index) return;
        event.preventDefault();
        event.dataTransfer.dropEffect = "move";
        const after = docOutlineDropAfter(li, event.clientY);
        docOutlineClearDrop();
        li.classList.add(after ? "is-drop-after" : "is-drop-before");
      });
      li.addEventListener("dragleave", () => li.classList.remove("is-drop-before", "is-drop-after"));
      li.addEventListener("drop", (event) => {
        if (docOutlineDragIndex === -1 || docOutlineDragIndex === index) return;
        event.preventDefault();
        const from = docOutlineDragIndex;
        const after = docOutlineDropAfter(li, event.clientY);
        docOutlineDragIndex = -1;
        docOutlineClearDrop();
        if (!docOutlineMoveSection(from, index, after)) {
          toast("That section cannot go inside itself.", true);
        }
      });
    }
    button.addEventListener("keydown", (event) => {
      if (!event.altKey || (event.key !== "ArrowUp" && event.key !== "ArrowDown")) return;
      if (heading.symbol) return;
      event.preventDefault();
      if (!docOutlineNudge(index, event.key === "ArrowDown" ? 1 : -1)) {
        announce("That section cannot move any further.");
      }
    });
    li.appendChild(button);
    list.appendChild(li);
    //: `row` as well as `button`, because the scroll-spy has to know whether
    //: the heading it wants to mark is on screen at all: a fold or a filter
    //: can hide the row the caret is in, and marking a hidden row is a mark
    //: nobody sees followed by a scroll to nothing.
    docOutlineRows.push({ line: heading.line, button, row: li });
  });
  //: The rows are new elements, so whatever was marked a moment ago is gone
  //: with them. Marked again here rather than waiting for the next scroll:
  //: the outline is rebuilt on a pause in typing, and a table of contents
  //: that forgets where you are every time you stop typing is worse than one
  //: that never knew.
  docOutlineMarked = -1;
  markDocOutline();
  //: **The focus ring, restored after a move rewrote the rows.** Kept across
  //: renders rather than applied once, because a move schedules a second
  //: render of its own (see `docOutlineNudge`), and given up the moment focus
  //: is somewhere this panel does not own: a reader who has gone back to
  //: typing must not have the ring yanked into the sidebar by a redraw.
  if (docOutlineFocusKey) {
    const active = document.activeElement;
    const ours = !active || active === document.body || list.contains(active);
    const wanted = ours
      ? headings.findIndex((heading) => docOutlineFoldKey(heading) === docOutlineFocusKey)
      : -1;
    if (!ours || wanted === -1) docOutlineFocusKey = "";
    else docOutlineRows[wanted]?.button.focus();
  }
  //: The breadcrumb reads this list rather than the document, so it is set
  //: here and the trail is redrawn on the same beat the outline is.
  docOutlineHeadingList = headings;
  docCrumbsKey = "";
  renderDocCrumbs(docCaretLine());
}

//: **Where you are in the document, marked in its outline.** The owner, of
//: the sidebar redesign: "mostly outline". Measured before this existed:
//: scrolled to 70% of a 21-heading document, zero rows under `#doc-outline`
//: carried a current class or `aria-current`, and the outline's own scrollTop
//: stayed 0. A table of contents that cannot say which heading you are in is
//: a list of links, and it is the one thing every editor this is measured
//: against (Obsidian, Typora, Notion) does have.
//:
//: Kept as a flat line-and-button list rather than re-read from the DOM on
//: every scroll: the marking runs on a scroll event and must not walk the
//: document, and rebuilding the outline per scroll was the obvious wrong
//: answer this avoids.
let docOutlineRows = [];
let docOutlineMarked = -1;
//: The row a move asked to keep the focus ring on, as a fold key (level and
//: text), because that is the one name for a heading that survives the
//: document being rewritten around it.
let docOutlineFocusKey = "";

//: Which row is in the air. One number rather than a `dataTransfer` payload,
//: because the payload a browser hands back on `drop` is a string and the one
//: thing this needs is an index into the list the drag started from.
let docOutlineDragIndex = -1;
let docOutlineSpyFrame = 0;

//: The first line of the document that is on screen, zero-based.
//:
//: CodeMirror is asked where the top-left of its own scroller lands, which is
//: exact and costs one hit test. `posAtCoords` with `precise` false never
//: returns null, so a coordinate above the first line or below the last still
//: answers with the nearest position rather than with nothing.
//:
//: The textarea fallback has no line-to-pixel map at all, so it estimates
//: from the scroll fraction. That is honestly approximate, and it is the
//: surface nobody has when the engine loads; saying so here is cheaper than a
//: reader wondering why one branch is exact and the other is not.
function docVisibleTopLine() {
  const box = docSurface();
  if (!box) return 0;
  if (box.kind === "codemirror") {
    const view = box.view;
    const rect = view.scrollDOM.getBoundingClientRect();
    const pos = view.posAtCoords({ x: rect.left + 4, y: rect.top + 4 }, false);
    const at = Math.max(0, Math.min(Number(pos) || 0, view.state.doc.length));
    return view.state.doc.lineAt(at).number - 1;
  }
  const range = box.scrollHeight - box.clientHeight;
  if (range <= 0) return 0;
  const lines = box.text.split("\n").length;
  return Math.round((box.scrollTop / range) * Math.max(0, lines - 1));
}

//: The filter box's own wiring, once. `input` rather than a debounce: the
//: work behind it is a pass over the headings this file already holds, not a
//: request, and a debounce on a list that redraws in under a millisecond is
//: latency bought for nothing.
//:
//: Escape clears it rather than closing anything, which is what Escape means
//: in every other search box in this app, and it is the only way back to the
//: whole outline that does not involve selecting the text first.
onDomReady(() => {
  const box = $("doc-outline-filter");
  if (!box) return;
  box.addEventListener("input", () => renderDocOutline());
  box.addEventListener("keydown", (event) => {
    if (event.key !== "Escape" || !box.value) return;
    event.stopPropagation();
    box.value = "";
    renderDocOutline();
  });
});

//: **The caret's line, but only while the caret is on screen.**
//:
//: Reported (OPEN.md, doc-sidebar.md): typing in a section below the one at
//: the top of the view marked the wrong heading until the view scrolled.
//: Measured on a twelve-section document in a 512px box before this existed:
//: the caret in Section 3 with the view still at `scrollTop` 0, the outline
//: marked Section 1.
//:
//: **Which wins when the two disagree**, the question the next step left open:
//: the caret does, while it is visible. A caret you can see is where you are
//: writing, and every editor this is measured against (Obsidian, Typora)
//: follows it. Scroll far enough that the caret leaves the box and it is no
//: longer where you are looking, so the top of the view takes over again: that
//: is reading, not writing, and the same rule covers the Read pane, where
//: there is no caret to see at all.
//:
//: Null rather than a line number when there is nothing to say, so the caller
//: reads as the rule: "the caret's line if it is visible, otherwise the top of
//: the view".
function docCaretVisibleLine() {
  const box = docSurface();
  if (!box || box.kind !== "codemirror") {
    //: The textarea fallback has no line-to-pixel map (see `docVisibleTopLine`
    //: for the same gap), so there is no honest way to ask whether its caret
    //: is on screen. The viewport answer is the one it has always had.
    return null;
  }
  const view = box.view;
  const frame = view.scrollDOM.getBoundingClientRect();
  //: A hidden pane measures 0x0, and "top >= top and bottom <= bottom" would
  //: then be true of a coordinate that is nowhere.
  if (frame.height < 1) return null;
  let coords = null;
  try {
    coords = view.coordsAtPos(view.state.selection.main.head);
  } catch {
    //: A position mid-teardown, which CodeMirror answers for with null anyway.
    return null;
  }
  if (!coords) return null;
  if (coords.top < frame.top || coords.bottom > frame.bottom) return null;
  return view.state.doc.lineAt(view.state.selection.main.head).number - 1;
}

//: The marked row, kept inside whichever box in the sidebar actually scrolls.
//: Bounded by `#doc-sidebar` on purpose: `scrollIntoView` walks every
//: scrolling ancestor, and the page is one of them, so the tidy one-liner
//: would yank the whole tab under the person's caret while they typed.
function keepOutlineRowInView(el) {
  const limit = $("doc-sidebar");
  if (!limit) return;
  let box = el.parentElement;
  while (box && limit.contains(box) && box.scrollHeight <= box.clientHeight + 1) {
    box = box.parentElement;
  }
  if (!box || !limit.contains(box)) return;
  const row = el.getBoundingClientRect();
  const frame = box.getBoundingClientRect();
  if (row.top < frame.top) box.scrollTop -= frame.top - row.top + 8;
  else if (row.bottom > frame.bottom) box.scrollTop += row.bottom - frame.bottom + 8;
}

function markDocOutline() {
  if (!docOutlineRows.length) return;
  //: The caret's section while the caret is on screen, the top of the view
  //: otherwise: see `docCaretVisibleLine` for why that is the order.
  const caret = docCaretVisibleLine();
  const top = caret === null ? docVisibleTopLine() : caret;
  //: The last heading at or above the top of the view: the section whose text
  //: you are reading, not the next one down.
  let index = 0;
  for (let i = 0; i < docOutlineRows.length; i++) {
    if (docOutlineRows[i].line > top) break;
    index = i;
  }
  //: **Up to the nearest row that is actually drawn.** A folded section's
  //: headings are still in this list (the spy is about the document, not
  //: about the panel), so the heading the caret is in may be hidden under a
  //: fold: the mark then belongs on the fold's own row, which is the one the
  //: reader can see and the one that says "you are somewhere in here". While
  //: a filter is running there may be no such row at all, and then nothing is
  //: marked, which is honest: the rows on screen are a search result, not a
  //: place in the document.
  while (index > 0 && docOutlineRows[index].row?.classList.contains("hidden")) index -= 1;
  if (docOutlineRows[index].row?.classList.contains("hidden")) index = -1;
  if (index === docOutlineMarked) return;
  for (const row of docOutlineRows) {
    row.button.classList.remove("is-current");
    row.button.removeAttribute("aria-current");
  }
  if (index === -1) {
    docOutlineMarked = -1;
    return;
  }
  const button = docOutlineRows[index].button;
  button.classList.add("is-current");
  //: `location` rather than `true`: this is where the reader is in a
  //: document, which is exactly what the token means, and it is what makes
  //: the mark reach a screen reader instead of being a colour.
  button.setAttribute("aria-current", "location");
  docOutlineMarked = index;
  keepOutlineRowInView(button);
}

//: One mark per frame. A scroll fires far faster than anything needs to be
//: repainted, and the work behind it is a hit test plus a class swap.
function scheduleDocOutlineSpy() {
  if (docOutlineSpyFrame) return;
  docOutlineSpyFrame = requestAnimationFrame(() => {
    docOutlineSpyFrame = 0;
    markDocOutline();
  });
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

//: Set by `renderDocPreview`, read by `docScrollAnchors`. Zero until the
//: preview has been drawn once, which is also when there are no stamps to
//: read, so the default is never used as an answer.
let docPreviewLineShift = 0;

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
  const text = docText();
  //: **The properties are not prose.** Rendered as markdown, a frontmatter
  //: block is a horizontal rule, a paragraph of `key: value` lines and
  //: another rule, which is what the preview showed until now for every
  //: document this app's own vault import wrote. They come out of the body
  //: and go back in above it as the same rows the panel draws, read-only.
  const fm = docFrontmatterParse(text);
  //: The block markers come out here rather than in the renderer: `^abc123`
  //: is what makes a paragraph linkable and it is not what the paragraph
  //: says, and this pane is the one a person reads and prints.
  //: **The remarks come out of the rendered pane** (Phase 5 item 1): a comment
  //: is a note to the author, and Read view is the document as it reads. In a
  //: print they become footnotes instead, so a PDF handed to somebody carries
  //: them rather than dropping them silently, which is what `docPrintComments`
  //: is set for by `exportDocumentPdf`.
  const remarks = docPrintComments ? docCommentFootnotes : docCommentStrip;
  const stripped = fm ? docFrontmatterStrip(text) : text;
  const body = remarks(docBlockStripIds(stripped));
  //: **How far the preview's line numbers are from the editor's.** Every
  //: block this renders carries the line it came from (`data-src-line`,
  //: `renderMarkdown` in app.js), but it came from the line in the string
  //: below, not in the document: the title is prepended as a heading and the
  //: frontmatter is taken off the front, so the two texts are the same words
  //: at different line numbers. The split view's scroll map reads the stamps
  //: and has to undo this, or it lines the panes up two lines out on every
  //: titled document (`docScrollAnchors`).
  //:
  //: Both terms are prefix changes, which is what makes one number enough.
  //: The one transformation that is not is a remark removed by
  //: `docCommentStrip`, and only when the remark spans a line break: that
  //: shortens the text somewhere in the middle and everything below it drifts
  //: by those lines. Bounded, rare, and a line or two against the hundreds of
  //: pixels this map exists to remove, so it is written down here rather than
  //: paid for with a second parse of the document on every render.
  docPreviewLineShift =
    (title ? 2 : 0) - (text.split("\n").length - stripped.split("\n").length);
  docRenderBody(preview, title ? `# ${title}\n\n${body}` : body);
  if (fm) {
    //: After the title, which is the document's name rather than part of its
    //: text, and before the first thing its author wrote.
    preview.insertBefore(docPropsReadNode(fm), preview.children[title ? 1 : 0] || null);
  }
  layerDocWikiLinks(preview);
  docLayerImageOptions(preview);
}

//: **The document, rendered, with its columns side by side.** `renderMarkdown`
//: is the app's one markdown renderer and knows nothing about `:::columns`;
//: teaching it would put a documents-editor construct into the renderer every
//: note card and every chat message uses. So the text is split here, at the
//: blocks the model finds, and each column is rendered by that same renderer
//: into its own element. The result is one pass over the document either way,
//: and a document with no columns in it takes exactly the path it always did.
function docRenderBody(container, text) {
  const blocks = docColumnsBlocks(text);
  if (!blocks.length) {
    container.replaceChildren();
    docRenderFlow(container, text);
    return;
  }
  container.replaceChildren();
  let at = 0;
  for (const block of blocks) {
    if (block.from > at) docRenderFlow(container, text.slice(at, block.from));
    const box = document.createElement("div");
    box.className = "doc-cols";
    box.style.setProperty("--doc-cols", String(Math.max(1, block.columns.length)));
    for (const column of block.columns) {
      const col = document.createElement("div");
      col.className = "doc-col";
      docRenderFlow(col, column.text);
      box.appendChild(col);
    }
    container.appendChild(box);
    at = block.to;
  }
  if (at < text.length) docRenderFlow(container, text.slice(at));
}

//: `![[Document#^an-id]]` on its own line (DOCUMENTS_PLAN Phase 4 item 2).
//: The id shape is the model's, so a `#^` that is not a block reference stays
//: an ordinary embed and goes to the app's renderer as before.
const DOC_BLOCK_EMBED_LINE =
  /^[ \t]*!\[\[([^[\]\n]{1,120}#\^[A-Za-z0-9][A-Za-z0-9-]{0,31})\]\][ \t]*$/;

//: A run of markdown with its block embeds drawn by `docEmbedNode` rather
//: than by `renderMarkdown`.
//:
//: The app's one markdown renderer resolves an `![[name]]` through
//: `resolveWikiTarget`, which knows notes, boards and documents and cannot
//: know about a block: a block reference is written into a document's own
//: text by this editor, and `Doc#^abc123` is not a name anything can look up.
//: Left to it, a block embed rendered as "Nothing called that yet" in Read
//: view while the same line drew the block in Live, which is the two panes
//: disagreeing about what the document says. Split out here and handed to the
//: same filler the Live view's widget uses, so they cannot.
function docRenderFlow(container, text) {
  const lines = String(text == null ? "" : text).split("\n");
  let buffer = [];
  const flush = () => {
    if (!buffer.length) return;
    docAppendRendered(container, buffer.join("\n"));
    buffer = [];
  };
  for (const line of lines) {
    const match = DOC_BLOCK_EMBED_LINE.exec(line);
    if (!match) {
      buffer.push(line);
      continue;
    }
    flush();
    const host = document.createElement("div");
    host.className = "doc-embed-host";
    docEmbedFill(host, match[1].trim());
    container.appendChild(host);
  }
  flush();
}

//: `renderMarkdown` replaces its container's children, so a second call into
//: the same one would take the first's work away. Rendered into a spare
//: element and moved across, which is also what keeps every piece in document
//: order.
function docAppendRendered(container, text) {
  const spare = document.createElement("div");
  renderMarkdown(spare, text);
  while (spare.firstChild) container.appendChild(spare.firstChild);
}

//: The properties as they read rather than as they are edited: the same rows,
//: without the fields. Read view has no editing surface at all, so a panel of
//: inputs there would be a form that saves into a document you are not in.
function docPropsReadNode(fm) {
  const box = document.createElement("div");
  box.className = "doc-props doc-props-read";
  for (const entry of fm.entries) {
    const row = document.createElement("div");
    row.className = "doc-prop-row";
    const key = document.createElement("span");
    key.className = "doc-prop-key";
    key.textContent = entry.key;
    const value = document.createElement("div");
    value.className = "doc-prop-value";
    if (entry.kind === "list") {
      for (const item of entry.items) {
        const chipEl = document.createElement("span");
        chipEl.className = "chip doc-prop-chip";
        chipEl.textContent = item.text;
        value.appendChild(chipEl);
      }
    } else {
      value.textContent = entry.value.text;
    }
    row.append(key, value);
    box.appendChild(row);
  }
  return box;
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
      //: Through `docResolveWikiTarget` (above), which is the Notes tab's own
      //: resolver with documents tried first. This pane used to run its own
      //: exact-match-on-`e.title` lookup, which could not resolve the note
      //: form the `[[` picker actually inserts; see that function's comment.
      const target = docResolveWikiTarget(name);
      const label = docWikiTargetLabel(target);
      const link = document.createElement("button");
      link.type = "button";
      link.className = "wiki-link";
      //: The words, not the syntax the target happens to open with: see
      //: `wikiLinkLabel` in app.js for why the raw `name` stays in the
      //: document and only what is drawn is cleaned.
      link.textContent = window.wikiLinkLabel ? window.wikiLinkLabel(name) : name;
      link.title = target
        ? `Open ${target.kind === "document" ? "" : `the ${target.kind} `}"${label}"`
        : `Nothing called "${name}" yet.`;
      link.addEventListener("click", (event) => {
        event.stopPropagation();
        docOpenResolvedWikiTarget(target, name);
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
  //: Moving a focused element in the DOM blurs it, and this runs the first
  //: time the capture section shows, which is exactly when the phone's + has
  //: just put the caret in the box (measured: focus in at 7598ms, this wrap
  //: at 7753, focus out to nothing at 7737). The caret goes back where it was.
  //: In a microtask, not inline: this also runs at this file's own top level
  //: (`mountGutterFor($("entry-content"))` below), and a focus event fired
  //: mid-evaluation reached `mountNoteSurface` before `docCmBroken` had been
  //: declared (a TDZ ReferenceError on boot when the box starts focused).
  const hadFocus = document.activeElement === textarea;
  textarea.parentElement.insertBefore(wrap, textarea);
  wrap.append(gutter, textarea);
  if (hadFocus) queueMicrotask(() => textarea.focus());
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

//: **The way out of an editor that takes the Tab key.** Owner: "on the
//: documents editor, I can't press tab to indent without it selecting an
//: element." Tab now indents in every document, prose as well as code, which
//: is what every writing tool does and what the report asks for; the reason
//: it was restricted to code files was never indentation, it was the exit:
//: a Tab the editor always swallows leaves a keyboard user inside it with no
//: way to reach the toolbar, the dock or the rest of the page.
//:
//: So the exit moves to the chord CodeMirror's own documentation recommends
//: for exactly this trade (its `indentWithTab` carries the same warning):
//: press Escape, then Tab, and the Tab is the browser's again. Escape is
//: already this app's "leave what you are in" key everywhere else, so it is
//: the one key a reader is most likely to try first, and it costs a writer
//: nothing because nothing else in the editor consumes a plain Tab.
//:
//: The second way out is unchanged and needs nothing learned: Shift+Tab on a
//: line with no indentation to remove falls through to the browser's own
//: focus-backwards rather than doing nothing.
let docTabEscapes = false;

//: Reads the arming *and* clears it, so one Escape buys one Tab: an armed
//: flag left standing would make the next Tab after any Escape, minutes and
//: paragraphs later, throw the writer out of the editor.
function docTakeTabEscape() {
  const armed = docTabEscapes;
  docTabEscapes = false;
  return armed;
}

//: Shift+Tab has something to do only when there is indentation under the
//: selection (or a selection at all, which re-indents its lines). Otherwise
//: it is the browser's, which is what keeps a flush-left caret from being a
//: keyboard trap.
//: A markdown list item, at whatever depth. Tab and Shift+Tab treat one of
//: these as a *block* rather than as a run of characters: pressing Tab with
//: the caret in the middle of "- alpha" indents the bullet, it does not push
//: two spaces into the middle of the word, which is what every editor a
//: writer has used does and what this one did not (measured, 2026-09-12:
//: "- al|pha" plus Tab gave "- al  pha").
const DOC_LIST_LINE = /^([ \t]*)([-*+]|\d+[.)])(\s)/;

function docCanOutdent(box) {
  if (!box) return false;
  if (box.selectionEnd > box.selectionStart) return true;
  return /^[ \t]/.test(docSelectedLines(box).text);
}

function indentDocSelection(box, outdent) {
  //: One undo step per Tab, not one per burst, see `docUndoBreak`.
  docUndoBreak();
  const type = docFileType();
  const unit = type.indent || "  ";
  const { start, end, text } = docSelectedLines(box);
  const multiline = text.includes("\n") || box.selectionEnd > box.selectionStart;
  //: Read before anything is replaced: an edit moves the surface's own
  //: selection, so a caret read afterwards is the engine's guess rather than
  //: where the writer was.
  const caretWas = box.selectionStart;

  // A list item is indented as a whole, from wherever the caret sits in it,
  // and Shift+Tab pulls it back the same way. `DOC_LIST_LINE` carries the
  // reason. The caret is kept where it was in the text rather than being
  // dropped at the line start or spread over the line: an indent that moves
  // the caret is an indent you have to recover from.
  if (!multiline && DOC_LIST_LINE.test(text)) {
    const caret = caretWas;
    const leading = text.match(/^[ \t]*/)[0];
    let next = leading;
    if (!outdent) {
      next = leading + unit;
    } else if (leading.startsWith(unit)) {
      next = leading.slice(unit.length);
    } else {
      next = leading.slice(Math.min(leading.length, unit.length));
    }
    if (next === leading) return; // nothing to remove: the caller lets Tab go
    docReplaceRange(box, start, start + leading.length, next);
    const moved = next.length - leading.length;
    const at = Math.max(start + next.length, caret + moved);
    box.setSelectionRange(at, at);
    markDocDirty();
    renderDocGutter();
    return;
  }

  // A plain Tab with no selection inserts one indent at the caret, which is
  // what Tab does in every editor. Only a selection (or Shift+Tab) means
  // "re-indent these lines".
  if (!multiline && !outdent) {
    const at = box.selectionStart;
    docReplaceRange(box, at, box.selectionEnd, unit);
    //: **After the indent, said rather than assumed.** The textarea's
    //: `insertText` leaves the caret after what it inserted; the engine's
    //: `replaceRange` maps a caret sitting exactly at the insertion point to
    //: *before* it. Measured 2026-09-23 in both a code and a markdown
    //: document: Tab then "a" at the start of `int x;` gave `a    int x;`,
    //: so every Tab in the editor since the engine landed put the next
    //: keystroke on the wrong side of the indent it had just made.
    box.setSelectionRange(at + unit.length, at + unit.length);
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
  const joined = changed.join("\n");
  docReplaceRange(box, start, end, joined);
  if (box.selectionEnd > box.selectionStart || multiline) {
    box.setSelectionRange(start, start + joined.length);
  } else {
    //: A Shift+Tab with no selection is a caret gesture, so it leaves a
    //: caret. Selecting the whole line here (what this did until 2026-09-12)
    //: meant the next character typed replaced the line the writer had just
    //: dedented.
    const moved = joined.length - text.length;
    const at = Math.min(Math.max(start, caretWas + moved), start + joined.length);
    box.setSelectionRange(at, at);
  }
  markDocDirty();
  renderDocGutter();
}

function toggleDocComment(box) {
  if (docCodeCommentAtCaret(box)) return;
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

//: **A code document comments by the language at the caret** (INBOX 402),
//: as VS Code does: one HTML file is three languages, so a line inside its
//: `<script>` takes `//`, inside `<style>` `/* */`, and the markup
//: `<!-- -->`; a JSX child takes `{/* */}`. The file-type table above has one
//: marker per file and cannot know that; CodeMirror's own command reads the
//: `commentTokens` of the grammar at the cursor. It keeps this function's
//: rules (uncomment only when every non-blank line is commented, the marker
//: after the indentation, a round trip exact; `tests/test_code_vscode.py`),
//: with one difference, VS Code's: a block of lines takes its marker at the
//: block's own indent, so the block keeps its shape. A grammar with no tokens
//: falls through to the file-type marker; prose, Plain and the textarea
//: fallback never come here.
function docCodeCommentRun(CM, target, block) {
  return block ? CM.commands.toggleBlockComment(target) : CM.commands.toggleComment(target);
}

function docCodeCommentAtCaret(box, block = false) {
  const CM = window.CM6;
  const type = docFileType();
  if (!CM || !docCmView || box?.view !== docCmView || type.previewable || docView === "plain") return false;
  const view = docCmView;
  const target = { state: view.state, dispatch: (tr) => view.dispatch(tr) };
  if (!docCodeCommentRun(CM, target, block)) return false;
  markDocDirty();
  return true;
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

// =============================================================================
// Tables, as a model over the markdown rather than a second document
// (DOCUMENTS_PLAN Phase 3 item 1)
// =============================================================================
//
// **The gate this is written for, first, because it decides the whole shape.**
// PLAN D4: a table edited in Live and then read in Source has to be the
// markdown a person would have typed, byte for byte. The obvious
// implementation, parse the table into a grid and print it back out, fails
// that gate on its first keystroke: a hand-aligned table comes back with its
// padding rebuilt, a ragged one comes back tidied, and a cell holding `\|`
// comes back holding whatever the printer decided to do about pipes. The
// document is then no longer the file its author wrote, which is the one
// promise a markdown editor makes.
//
// So nothing here ever *prints a table*. Every operation returns a list of
// `{from, to, insert}` edits in document coordinates, each one covering the
// smallest span it can: setting a cell rewrites that cell's own characters
// between its pipes and nothing else; adding a column inserts one `|` and one
// cell per line; alignment rewrites one delimiter cell. Every byte the
// operation did not have to touch is still the byte the author typed, which
// is a stronger statement than "the output matches the input" and is what
// `tests/test_doc_tables.py` measures: it applies an operation and its
// inverse and compares the result to the original string.
//
// The parse is byte-exact by construction for the same reason: a row is kept
// as its indent, whether it had a leading pipe, the raw text of each cell
// *including its padding*, and whatever followed the last pipe.
// `docTableJoinRow(docTableSplitRow(line)) === line` for every line, which the
// test asserts over the awkward shapes (a pipe escaped inside a cell, a table
// with no outer pipes, mismatched column widths, an indented table).
//
// This region is bracketed by `DOC-TABLE-BEGIN` / `DOC-TABLE-END` because the
// test runs it in node, away from the browser: it is pure string work with no
// DOM and no app globals in it, and that is a property worth keeping.

// DOC-TABLE-BEGIN

//: A delimiter cell is the `---`, `:---`, `---:` or `:---:` under a header.
//: GFM wants at least one dash; the colons are the alignment.
const DOC_TABLE_DELIM_CELL = /^[ \t]*:?-+:?[ \t]*$/;

//: How many columns the Live grid can place by class. Every cell in the
//: rendered line has to be *placed* rather than left to auto-flow, because a
//: hidden pipe leaves three zero-width children behind it (two
//: `cm-widgetBuffer` images and the replacement's own empty span) and
//: auto-flow gives each of those a column of its own: a three-column table
//: was drawn as fifteen tracks with the cells at 51.6px and the text wrapping
//: inside them (INBOX 191). The classes are generated in pairs
//: (`cm-md-cols-N` on the line, `cm-md-cN` on the cell), so the cap is only
//: how many rules the theme carries; a table wider than this keeps the old
//: auto-flow, which no editor of this width can show usefully anyway.
const DOC_TABLE_GRID_MAX = 20;

//: Split one line into the pieces that put it back together exactly.
//: `cells` holds the raw text between the pipes, padding included, so the
//: join below is the identity and an edit to one cell cannot disturb another.
//: Only *unescaped* pipes split: `\|` is a pipe inside a cell, which is the
//: one piece of table syntax people get wrong when they hand-edit.
function docTableSplitRow(line) {
  const text = String(line);
  const indent = (/^[ \t]*/.exec(text) || [""])[0];
  let body = text.slice(indent.length);
  let lead = false;
  if (body.startsWith("|")) {
    lead = true;
    body = body.slice(1);
  }
  const cells = [];
  let cur = "";
  for (let at = 0; at < body.length; at += 1) {
    const ch = body[at];
    if (ch === "\\" && at + 1 < body.length) {
      cur += ch + body[at + 1];
      at += 1;
      continue;
    }
    if (ch === "|") {
      cells.push(cur);
      cur = "";
      continue;
    }
    cur += ch;
  }
  //: What follows the last pipe is the trailing pipe's own tail when it is
  //: only whitespace, and one more cell when it is not. `| a | b |   ` and
  //: `| a | b ` differ by exactly that, and both have to come back unchanged.
  let trail = false;
  let tail = "";
  if (cells.length && /^[ \t]*$/.test(cur)) {
    trail = true;
    tail = cur;
  } else {
    cells.push(cur);
  }
  return { indent, lead, cells, trail, tail };
}

function docTableJoinRow(row) {
  return (
    row.indent +
    (row.lead ? "|" : "") +
    row.cells.join("|") +
    (row.trail ? `|${row.tail}` : "")
  );
}

//: A line that could be part of a table: it has a pipe that is not escaped,
//: and it is not blank. Deliberately loose, because what actually makes a
//: table in GFM is the delimiter row underneath the header, which
//: `docTableParse` checks.
function docTableRowLike(line) {
  const text = String(line == null ? "" : line);
  if (!text.trim()) return false;
  return docTableSplitRow(text).cells.length > 1 || /(?:^|[^\\])\|/.test(text);
}

function docTableIsDelimiter(line) {
  if (line == null) return false;
  const row = docTableSplitRow(line);
  if (!row.cells.length) return false;
  return row.cells.every((cell) => DOC_TABLE_DELIM_CELL.test(cell));
}

function docTableAlignOf(cell) {
  const text = String(cell).trim();
  const left = text.startsWith(":");
  const right = text.endsWith(":");
  if (left && right) return "center";
  if (right) return "right";
  if (left) return "left";
  return null;
}

//: The table around a document offset, or null. Offsets are the document's,
//: so every edit below can be dispatched without a second coordinate system.
//:
//: The run of pipe-bearing lines around the caret is found first and the
//: delimiter row is then looked for *inside* it, rather than assuming it sits
//: at the second line: a paragraph line that happens to contain a pipe sits
//: directly above plenty of real tables, and taking the run's first line as
//: the header would have made every such table unparseable.
function docTableParse(text, offset) {
  const lines = String(text == null ? "" : text).split("\n");
  const starts = [];
  let at = 0;
  for (const line of lines) {
    starts.push(at);
    at += line.length + 1;
  }
  let index = 0;
  for (let i = 0; i < lines.length; i += 1) {
    if (offset >= starts[i]) index = i;
    else break;
  }
  if (!docTableRowLike(lines[index])) return null;
  let first = index;
  while (first > 0 && docTableRowLike(lines[first - 1])) first -= 1;
  let last = index;
  while (last + 1 < lines.length && docTableRowLike(lines[last + 1])) last += 1;

  let delim = -1;
  for (let i = first + 1; i <= last; i += 1) {
    if (docTableIsDelimiter(lines[i])) {
      delim = i;
      break;
    }
  }
  if (delim < 0) return null;
  const startLine = delim - 1;
  if (index < startLine) return null;
  let endLine = last;
  //: A second delimiter row means a second table underneath this one, and
  //: its header is the line above it.
  for (let i = delim + 1; i <= last; i += 1) {
    if (docTableIsDelimiter(lines[i])) {
      endLine = i - 2;
      break;
    }
  }
  if (endLine < delim || index > endLine) return null;

  const rows = [];
  for (let i = startLine; i <= endLine; i += 1) {
    const row = docTableSplitRow(lines[i]);
    row.from = starts[i];
    row.to = starts[i] + lines[i].length;
    row.line = i;
    rows.push(row);
  }
  //: GFM: the delimiter row has to have as many cells as the header, or the
  //: block is a paragraph that happens to contain dashes.
  if (rows[1].cells.length !== rows[0].cells.length) return null;
  return {
    from: rows[0].from,
    to: rows[rows.length - 1].to,
    startLine,
    endLine,
    rows,
    delim: 1,
    columns: rows[0].cells.length,
    aligns: rows[1].cells.map(docTableAlignOf),
  };
}

//: Where one cell's raw text lives in the document. The sum of the cells
//: before it plus one character per pipe between them, which is the only
//: arithmetic in this file and the reason the row keeps its pieces.
function docTableCellSpan(table, row, col) {
  const line = table.rows[row];
  if (!line || col < 0 || col >= line.cells.length) return null;
  let from = line.from + line.indent.length + (line.lead ? 1 : 0);
  for (let i = 0; i < col; i += 1) from += line.cells[i].length + 1;
  return { from, to: from + line.cells[col].length };
}

//: The width a *new* cell in this column is written at. A table whose column
//: is already one width everywhere is a table somebody has been keeping
//: aligned by hand, and a new row that breaks the alignment is a new row they
//: have to go and fix; a ragged column gets a single space, because padding
//: it to the widest cell would be tidying up text nobody asked to have
//: tidied. Neither case moves a byte that already exists.
function docTableColumnPad(table, col, body) {
  const widths = new Set();
  for (let i = 0; i < table.rows.length; i += 1) {
    const cell = table.rows[i].cells[col];
    if (cell == null) continue;
    widths.add(cell.length);
  }
  const text = ` ${body} `;
  if (widths.size !== 1) return text;
  const width = [...widths][0];
  return text.length >= width ? text : text + " ".repeat(width - text.length);
}

//: A new row, built from the row above it so the outer pipes and the indent
//: match the table they are joining rather than one house style.
function docTableAddRowEdits(table, afterRow) {
  const like = table.rows[Math.max(afterRow, table.delim)] || table.rows[0];
  const cells = [];
  for (let col = 0; col < table.columns; col += 1) cells.push(docTableColumnPad(table, col, ""));
  const line = docTableJoinRow({
    indent: like.indent,
    lead: like.lead,
    cells,
    trail: like.trail,
    tail: "",
  });
  const anchor = table.rows[Math.max(afterRow, table.delim)] || table.rows[table.rows.length - 1];
  return [{ from: anchor.to, to: anchor.to, insert: `\n${line}` }];
}

//: Only a body row can go: deleting the header or the delimiter deletes the
//: table, which is a different command with a different name.
function docTableRemoveRowEdits(table, row) {
  if (row <= table.delim || row >= table.rows.length) return [];
  const line = table.rows[row];
  return [{ from: line.from - 1, to: line.to, insert: "" }];
}

//: One `|` and one cell per line, inserted at the same column in each. The
//: delimiter row gets a run of dashes as long as the one already under the
//: column it is following, so a table written with `---` does not acquire a
//: `----------` in the middle of it.
function docTableAddColumnEdits(table, anchorCol, before = false) {
  const edits = [];
  const afterCol = anchorCol;
  const sample = Math.min(anchorCol, table.columns - 1);
  const dashSample = table.rows[table.delim].cells[sample] || " --- ";
  const dashes = "-".repeat(Math.max(3, (dashSample.match(/-/g) || []).length));
  for (let row = 0; row < table.rows.length; row += 1) {
    const line = table.rows[row];
    const col = Math.min(afterCol, line.cells.length - 1);
    const span = docTableCellSpan(table, row, col);
    if (!span) continue;
    const last = col >= line.cells.length - 1;
    let body;
    if (row === table.delim) body = ` ${dashes} `;
    //: **The header's new cell is named**, and not only because Notion and
    //: Obsidian name theirs. A blank cell at the end of a row that has no
    //: trailing pipe is dropped by GFM, so a nameless new column in a table
    //: written without outer pipes would leave the header one cell short of
    //: the delimiter row and stop the whole block being a table at all.
    else if (row === 0) body = docTableColumnPad(table, sample, "Column");
    else body = docTableColumnPad(table, sample, "");
    //: A body row that cannot hold a blank final cell is left alone: GFM pads
    //: a short row out to the header's width, so the column is there in the
    //: rendered table, and `docTableFillRowEdits` appends it for real when
    //: Tab sends the caret into it. Inserting whitespace GFM is going to drop would put bytes
    //: in the file that nothing in the editor could ever reach again.
    //: Inserting *before* a cell needs no such care: the new cell has a real
    //: one after it, so nothing can drop it, and the pipe goes on its right.
    //: A row too short to have this column is left for GFM to pad, exactly as
    //: above, rather than having a column inserted in the wrong place in it.
    if (before) {
      if (anchorCol > line.cells.length - 1) continue;
      //: **A first column needs a leading pipe, and that is markdown's rule
      //: rather than this editor's.** GFM strips one optional pipe from each
      //: end of a row and reads leading spaces as indentation, so there is no
      //: way to write a blank *first* cell in a row that has no outer pipes:
      //: `  | a | b` is an indented two-cell row, not a three-cell one with an
      //: empty cell at the front. A table written without outer pipes
      //: therefore gains a leading pipe on the day a column is put in front of
      //: it, and keeps it if that column is taken away again. It is the only
      //: byte in this file an operation adds that its inverse does not remove,
      //: and `tests/test_doc_tables.py` asserts exactly that rather than
      //: letting it pass as a round trip.
      const outer = anchorCol === 0 && !line.lead ? "|" : "";
      edits.push({ from: span.from, to: span.from, insert: `${outer}${body}|` });
      continue;
    }
    if (row !== 0 && row !== table.delim && last && !line.trail) continue;
    edits.push({ from: span.to, to: span.to, insert: `|${body}` });
  }
  return edits;
}

function docTableRemoveColumnEdits(table, col) {
  if (table.columns < 2) return [];
  const edits = [];
  for (let row = 0; row < table.rows.length; row += 1) {
    const line = table.rows[row];
    if (col >= line.cells.length) continue;
    //: The pipe that goes with the cell is the one *before* it, except for
    //: the first column, which owns the pipe after it instead. Taking the
    //: wrong one leaves a row with one separator too few and turns the rest
    //: of the table into one wide cell.
    const span = docTableCellSpan(table, row, col);
    if (col > 0) {
      const prev = docTableCellSpan(table, row, col - 1);
      edits.push({ from: prev.to, to: span.to, insert: "" });
    } else if (line.cells.length > 1) {
      const next = docTableCellSpan(table, row, 1);
      edits.push({ from: span.from, to: next.from, insert: "" });
    } else {
      edits.push({ from: span.from, to: span.to, insert: "" });
    }
  }
  return edits;
}

//: The cells a row is missing, appended. GFM pads a short row out to the
//: header's width when it renders it, so those cells are visible in the table
//: and absent from the text; this is what makes one real, and it is called
//: when the caret is sent into one (Tab) rather than on sight, so a ragged
//: table nobody is editing keeps the bytes it has.
function docTableFillRowEdits(table, row, upto) {
  const line = table.rows[row];
  if (!line || upto < line.cells.length) return [];
  const last = docTableCellSpan(table, row, line.cells.length - 1);
  const at = line.trail ? last.to : line.to;
  let insert = "";
  for (let col = line.cells.length; col <= upto; col += 1) insert += `|${docTableColumnPad(table, col, "")}`;
  //: A blank cell at the end of a row with no trailing pipe is not a cell:
  //: GFM drops a row's optional trailing pipe and everything after the last
  //: one, so the row would come back one cell short of its header. The pipe
  //: is what makes the cell exist in the text rather than only in the render.
  if (!line.trail) insert += "|";
  return [{ from: at, to: at, insert }];
}

//: Alignment is a property of the delimiter cell and of nothing else, so it
//: is one edit to one cell. The dash run is kept at the length the author
//: wrote; the colons are added or removed around it.
function docTableAlignEdits(table, col, align) {
  const span = docTableCellSpan(table, table.delim, col);
  if (!span) return [];
  const raw = table.rows[table.delim].cells[col];
  const parts = /^([ \t]*)([\s\S]*?)([ \t]*)$/.exec(raw);
  const dashes = "-".repeat(Math.max(3, (parts[2].match(/-/g) || []).length));
  const body =
    align === "center" ? `:${dashes}:` : align === "right" ? `${dashes}:` : align === "left" ? `:${dashes}` : dashes;
  const insert = parts[1] + body + parts[3];
  if (insert === raw) return [];
  return [{ from: span.from, to: span.to, insert }];
}

//: The edits applied to a plain string, which is what the fallback surface
//: and the test both need. Back to front so an earlier edit cannot move a
//: later one's offsets.
function docTableApplyEdits(text, edits) {
  let out = String(text == null ? "" : text);
  const ordered = [...edits].sort((a, b) => b.from - a.from);
  for (const edit of ordered) out = out.slice(0, edit.from) + edit.insert + out.slice(edit.to);
  return out;
}

//: Which cell an offset is in, for Tab and for the cell menu.
function docTableCellAt(table, offset) {
  for (let row = 0; row < table.rows.length; row += 1) {
    const line = table.rows[row];
    if (offset < line.from || offset > line.to) continue;
    for (let col = 0; col < line.cells.length; col += 1) {
      const span = docTableCellSpan(table, row, col);
      if (offset >= span.from && offset <= span.to) return { row, col, ...span };
    }
    return { row, col: Math.max(0, line.cells.length - 1), ...docTableCellSpan(table, row, Math.max(0, line.cells.length - 1)) };
  }
  return null;
}

//: The cell Tab goes to, wrapping across rows. `null` at the end of the last
//: row means "there is no next cell", which is the caller's cue to add a row:
//: Tab at the end of a table making a new row is the behaviour every editor
//: in the plan's competitor table has.
function docTableStepCell(table, row, col, delta) {
  let r = row;
  let c = col + delta;
  {
    if (c < 0) {
      r -= 1;
      if (r === table.delim) r -= 1;
      if (r < 0) return null;
      c = Math.max(table.columns, table.rows[r].cells.length) - 1;
      if (c < 0) return null;
      return { row: r, col: c };
    }
    if (c >= Math.max(table.columns, table.rows[r].cells.length)) {
      r += 1;
      if (r === table.delim) r += 1;
      if (r >= table.rows.length) return null;
      c = 0;
      if (!table.rows[r].cells.length) return null;
      return { row: r, col: c };
    }
    return { row: r, col: c };
  }
}

// DOC-TABLE-END

// -----------------------------------------------------------------------------
// The table commands: what the editor does with the model above
// -----------------------------------------------------------------------------
//
// Everything here reads the caret, asks the model for a list of edits and
// dispatches them. There is no second copy of a table anywhere in it, which is
// what keeps Live and Source the same document rather than two renderings of
// one.

//: The table the caret is in, with the cell it is in, or null.
function docTableContext(box = null) {
  const surface = box || docSurface();
  if (!surface) return null;
  const text = surface.text;
  const at = surface.selectionStart;
  const table = docTableParse(text, at);
  if (!table) return null;
  return { surface, text, table, cell: docTableCellAt(table, at) || { row: 0, col: 0 } };
}

//: One transaction for a whole operation, so Ctrl+Z takes back "insert a
//: column" rather than the seven cell edits it was made of.
function docTableDispatch(context, edits) {
  if (!edits || !edits.length) return false;
  const surface = context.surface;
  docUndoBreak();
  if (docCmView && surface.kind === "codemirror") {
    docCmView.dispatch({
      changes: edits.map((edit) => ({ from: edit.from, to: edit.to, insert: edit.insert })),
      scrollIntoView: true,
      annotations: docCmIsolate(),
    });
    return true;
  }
  surface.value = docTableApplyEdits(surface.text, edits);
  finishMarkdownEdit(surface, "doc-content");
  return true;
}

//: Run an operation and put the caret in a named cell, with that cell's text
//: selected so the next keystroke replaces it, which is what Tab does in every
//: table editor the plan names.
//:
//: The selection is worked out *after* the edits have landed rather than
//: predicted from the edits themselves: an insertion earlier in the table
//: moves every offset after it, and a caret computed in the old coordinates is
//: the classic way a table editor drops the caret a column to the left.
function docTableGo(context, edits, row, col) {
  docTableDispatch(context, edits);
  const surface = context.surface;
  let table = docTableParse(surface.text, context.table.from);
  if (!table || !table.rows[row]) return true;
  if (col >= table.rows[row].cells.length) {
    //: The cell GFM pads into existence but the text does not have yet. It has
    //: to be real before the caret can sit in it, or the next keystroke lands
    //: at the end of the previous cell.
    docTableDispatch({ surface, text: surface.text }, docTableFillRowEdits(table, row, col));
    table = docTableParse(surface.text, context.table.from);
  }
  const span = table && docTableCellSpan(table, row, col);
  if (!span) return true;
  const raw = table.rows[row].cells[col];
  //: **An empty cell takes the caret after its first space, not its last.**
  //: A new row is written `|  |  |`, two spaces a cell, and the caret was put
  //: after both: measured, Tab out of the last cell and "Three" typed gave
  //: `|  Three|`, a cell that no longer matched a single other one in the
  //: table. One space in is where a person would have typed it by hand.
  if (!raw.trim()) {
    const at = span.from + Math.min(1, raw.length);
    surface.setSelectionRange(at, at);
    return true;
  }
  const lead = (/^[ \t]*/.exec(raw) || [""])[0].length;
  const tail = (/[ \t]*$/.exec(raw) || [""])[0].length;
  surface.setSelectionRange(span.from + lead, Math.max(span.from + lead, span.to - tail));
  return true;
}

//: Tab moves to the next cell and Shift+Tab to the previous one, which is the
//: one gesture every editor in the plan's competitor table shares. Tab in the
//: last cell adds a row, for the same reason: a table you have to reach for a
//: menu to extend is a table people stop extending. The keydown listener at
//: the end of this file is what calls it (`docTableTab`), because that
//: listener already covers both surfaces.
function docTableTabStep(backwards, from = null) {
  const context = from || docTableContext();
  if (!context) return false;
  const step = docTableStepCell(context.table, context.cell.row, context.cell.col, backwards ? -1 : 1);
  if (step) return docTableGo(context, [], step.row, step.col);
  if (backwards) return false;
  const rows = context.table.rows.length;
  return docTableGo(context, docTableAddRowEdits(context.table, rows - 1), rows, 0);
}

//: The whole table, for the one command that is not an edit inside it. The
//: newline after it goes too, or deleting a table leaves the blank line it was
//: separated from the next paragraph by.
function docTableRemoveEdits(context) {
  const { table, text } = context;
  let to = table.to;
  if (text[to] === "\n") to += 1;
  return [{ from: table.from, to, insert: "" }];
}

//: The commands, as data, because three things read them: the cell menu, the
//: "/" menu's table entry and the tests. `run` takes the live context rather
//: than closing over one, so a menu built for the cell you opened it on still
//: acts on the cell you are in when you choose an item.
const DOC_TABLE_COMMANDS = [
  {
    id: "row-above",
    group: "rows",
    label: "Insert row above",
    title: "Add an empty row above this one",
    run: (context) =>
      docTableGo(context, docTableAddRowEdits(context.table, context.cell.row - 1),
        Math.max(context.cell.row, context.table.delim + 1), 0),
  },
  {
    id: "row-below",
    group: "rows",
    label: "Insert row below",
    title: "Add an empty row below this one",
    run: (context) =>
      docTableGo(context, docTableAddRowEdits(context.table, context.cell.row),
        Math.max(context.cell.row, context.table.delim) + 1, 0),
  },
  {
    id: "row-delete",
    group: "rows",
    label: "Delete row",
    title: "Remove this row",
    danger: true,
    //: The header and the delimiter are the table's shape rather than its
    //: contents: deleting either is "delete table", which is its own command.
    enabled: (context) => context.cell.row > context.table.delim,
    run: (context) =>
      docTableGo(context, docTableRemoveRowEdits(context.table, context.cell.row),
        Math.min(context.cell.row, context.table.rows.length - 2), context.cell.col),
  },
  {
    id: "col-left",
    group: "columns",
    label: "Insert column left",
    title: "Add a column before this one",
    run: (context) =>
      docTableGo(context, docTableAddColumnEdits(context.table, context.cell.col, true),
        context.cell.row, context.cell.col),
  },
  {
    id: "col-right",
    group: "columns",
    label: "Insert column right",
    title: "Add a column after this one",
    run: (context) =>
      docTableGo(context, docTableAddColumnEdits(context.table, context.cell.col),
        context.cell.row, context.cell.col + 1),
  },
  {
    id: "col-delete",
    group: "columns",
    label: "Delete column",
    title: "Remove this column",
    danger: true,
    enabled: (context) => context.table.columns > 1,
    run: (context) =>
      docTableGo(context, docTableRemoveColumnEdits(context.table, context.cell.col),
        context.cell.row, Math.max(0, context.cell.col - 1)),
  },
  {
    id: "align-left",
    group: "alignment",
    label: "Align left",
    title: "Align this column to the left",
    run: (context) => docTableGo(context, docTableAlignEdits(context.table, context.cell.col, "left"),
      context.cell.row, context.cell.col),
  },
  {
    id: "align-centre",
    group: "alignment",
    label: "Align centre",
    title: "Centre this column",
    run: (context) => docTableGo(context, docTableAlignEdits(context.table, context.cell.col, "center"),
      context.cell.row, context.cell.col),
  },
  {
    id: "align-right",
    group: "alignment",
    label: "Align right",
    title: "Align this column to the right",
    run: (context) => docTableGo(context, docTableAlignEdits(context.table, context.cell.col, "right"),
      context.cell.row, context.cell.col),
  },
  {
    id: "table-delete",
    group: "table",
    label: "Delete table",
    title: "Remove the whole table",
    danger: true,
    run: (context) => {
      docTableDispatch(context, docTableRemoveEdits(context));
      return true;
    },
  },
];

//: Named so the "/" menu, a shortcut or a test can run one without going
//: through the menu's DOM.
function docTableCommand(id) {
  const command = DOC_TABLE_COMMANDS.find((item) => item.id === id);
  const context = docTableContext();
  if (!command || !context) return false;
  if (command.enabled && !command.enabled(context)) return false;
  const done = command.run(context);
  context.surface.focus();
  return done !== false;
}

//: The cell menu, built from the app's own ⋯ recipe (`kebabMenu`) rather than
//: from scratch: DESIGN.md's index says a menu is `kebabMenu`, and a
//: hand-built one here would be the eleventh thing in this app that opens a
//: list of actions and the first that does it differently.
function docTableMenu(context) {
  if (typeof kebabMenu !== "function") return document.createElement("span");
  const items = DOC_TABLE_COMMANDS.map((command) => ({
    label: command.label,
    title: command.title,
    danger: command.danger,
    //: Rows, columns, alignment, the table itself. Ten rows read as one list
    //: of ten before this, and finding "Align centre" in it meant knowing the
    //: order. `kebabMenu` draws a hairline wherever this name changes
    //: (DOCUMENTS_PLAN section 16).
    group: command.group,
    disabled: command.enabled ? !command.enabled(context) : false,
    run: () => docTableCommand(command.id),
  }));
  const wrap = kebabMenu(items, "Table row and column actions");
  //: **Pressing it must not move the caret out of the table** (the owner: the
  //: kebab "does nothing and just deselects the row when I try to press that
  //: meatball button"). The menu only exists while the selection is inside the
  //: table: the decoration that draws it is rebuilt from the selection, so the
  //: moment a pointer-down moves the caret out of the header row, the widget
  //: is unmounted, taking the menu that was opening with it. Measured: after a
  //: press, the widget was gone.
  //:
  //: `mousedown` is where the caret moves, so that is where it is refused. The
  //: click still lands and the menu still opens, and every command below then
  //: runs against a selection that is still where the person left it, which is
  //: also what makes "Insert row above" mean a row.
  wrap.addEventListener("mousedown", (event) => event.preventDefault());
  return wrap;
}


// =============================================================================
// Frontmatter: the properties panel's model (DOCUMENTS_PLAN Phase 3 item 4)
// =============================================================================
//
// The same promise the table model makes, for the same reason: **nothing here
// ever prints YAML.** Every operation returns a list of `{from, to, insert}`
// edits in document coordinates, each one covering the value's own span and
// nothing else, so a document whose frontmatter was written by hand (or by
// Obsidian, or by this app's own vault import, which writes `category:` and
// `tags: [a, b]`) keeps its quoting, its spacing and its key order when one
// field is edited in the panel. A YAML printer would reformat the whole block
// on the first keystroke, and a notebook whose files come back rewritten every
// time somebody edits a tag is a notebook whose diffs are noise.
//
// The parse is deliberately small, and small is not the same as sloppy: it
// understands `---` on line 1, `key: value` lines until the closing `---`, and
// values that are scalars (quoted or not), inline lists (`[a, b]`) or block
// lists (`- a` on the lines under the key). Anything it does not understand is
// left alone rather than guessed at: an unparsed line keeps its bytes and the
// panel simply offers no field for it, which is the only behaviour that cannot
// lose someone's text.
//
// Bracketed by `DOC-FRONTMATTER-BEGIN` / `DOC-FRONTMATTER-END` so
// `tests/test_doc_frontmatter.py` can run it in node, away from the browser:
// pure string work, no DOM and no app globals. It uses `docTableApplyEdits`
// from the table region, because there is one way to apply a list of edits to
// a string in this file rather than two.

// DOC-FRONTMATTER-BEGIN

//: A fence line: exactly three dashes and nothing but whitespace after them.
//: Deliberately not `---` anywhere in the document: a horizontal rule mid-text
//: is the same three characters, and the only thing that makes them a
//: frontmatter fence is being the document's first line.
const DOC_FM_FENCE = /^---[ \t]*$/;

//: A key line. The key is what YAML allows without quoting and what the
//: editors in the plan's competitor table actually write: letters, digits,
//: underscores, dashes, dots, and spaces inside but never at the ends.
const DOC_FM_KEY = /^([A-Za-z0-9_][A-Za-z0-9_.\- ]*?)[ \t]*:(.*)$/;

//: A block list item under a key: `  - value`.
const DOC_FM_ITEM = /^([ \t]*)-[ \t]?(.*)$/;

//: The span of one value inside a line: the whitespace on either side is kept
//: as `lead`/`tail` rather than trimmed away, because putting it back is what
//: makes an edit to one value leave every other byte alone. A value that is
//: quoted keeps its quote, and the text is what is inside it.
function docFmSpan(raw, from) {
  const lead = (/^[ \t]*/.exec(raw) || [""])[0];
  //: `leadIfEmpty` is the space a *key's* value needs when the key has none
  //: yet (`status:`), and it is empty here because a list item never does: an
  //: item's own span starts where its text starts. The parse sets it on the
  //: one span that is a key's value.
  const span = { from, to: from + raw.length, lead, tail: "", quote: "", text: "", leadIfEmpty: "" };
  if (lead.length === raw.length) return span;
  span.tail = (/[ \t]*$/.exec(raw) || [""])[0];
  const inner = raw.slice(lead.length, raw.length - span.tail.length);
  if (inner.length >= 2 && (inner[0] === '"' || inner[0] === "'") && inner[inner.length - 1] === inner[0]) {
    span.quote = inner[0];
    span.text = inner.slice(1, -1);
  } else {
    span.text = inner;
  }
  return span;
}

//: The bytes a span currently holds. The no-op test below compares against
//: this rather than against the trimmed text, so "set it to what it already
//: says" is an empty edit list even when the value is padded or quoted.
function docFmRaw(span) {
  const body = span.quote ? span.quote + span.text + span.quote : span.text;
  return span.lead + body + span.tail;
}

//: Which scalars cannot be written bare. The list is short on purpose: these
//: are the characters that would change what the line *is* rather than what it
//: says.
function docFmNeedsQuote(text) {
  if (!text) return false;
  if (/^[ \t]|[ \t]$/.test(text)) return true;
  if (/[:#[\]{},]/.test(text)) return true;
  return /^[-?&*!|>%@`]/.test(text);
}

//: Put a value back into a span, quoted exactly as it was quoted before and
//: newly quoted only when the text would otherwise stop being one scalar.
//: An empty value after a bare `key:` gets its space back, or the result is
//: `key:value`, which YAML reads as a key called `key:value`.
function docFmWrite(span, value) {
  const text = String(value == null ? "" : value).replace(/[\r\n]+/g, " ");
  const quote = span.quote || (docFmNeedsQuote(text) ? '"' : "");
  const body = quote ? quote + text.split(quote).join("") + quote : text;
  //: A value cleared back to nothing takes its padding with it: `status:` is
  //: what an empty property looks like, and `status:   ` with the spaces the
  //: old value sat in is trailing whitespace nobody typed.
  if (!body) return "";
  return (span.lead || span.leadIfEmpty || "") + body + span.tail;
}

//: Split an inline list's inside (`a, b, c`) into items, with the span of each
//: one in document coordinates. A comma inside quotes does not split, which is
//: the piece of YAML people hit immediately: `tags: ["a, b", c]`.
function docFmSplitInline(text, base) {
  const items = [];
  let start = 0;
  let quote = "";
  for (let at = 0; at <= text.length; at += 1) {
    const ch = at < text.length ? text[at] : ",";
    if (quote) {
      if (ch === quote) quote = "";
      continue;
    }
    if (ch === '"' || ch === "'") {
      quote = ch;
      continue;
    }
    if (ch !== ",") continue;
    const raw = text.slice(start, at);
    //: The one thing that is not an item: the whole of an empty list. `[]` and
    //: `[  ]` are no items at all, where `[a,]` really is a trailing blank.
    if (raw.trim() || items.length || at < text.length) items.push(docFmSpan(raw, base + start));
    start = at + 1;
  }
  return items;
}

//: The frontmatter block at the top of a document, or null. Offsets are the
//: document's, so every edit below is dispatched without a second coordinate
//: system, exactly as the table model's are.
function docFrontmatterParse(text) {
  const source = String(text == null ? "" : text);
  const lines = source.split("\n");
  if (!lines.length || !DOC_FM_FENCE.test(lines[0])) return null;
  const starts = [];
  let at = 0;
  for (const line of lines) {
    starts.push(at);
    at += line.length + 1;
  }
  let close = -1;
  for (let i = 1; i < lines.length; i += 1) {
    if (DOC_FM_FENCE.test(lines[i])) {
      close = i;
      break;
    }
  }
  if (close === -1) return null;

  const entries = [];
  for (let i = 1; i < close; i += 1) {
    const match = DOC_FM_KEY.exec(lines[i]);
    if (!match) continue;
    const key = match[1];
    const rest = match[2];
    const span = docFmSpan(rest, starts[i] + lines[i].length - rest.length);
    span.leadIfEmpty = " ";
    const entry = {
      key,
      line: i,
      from: starts[i],
      to: starts[i] + lines[i].length,
      keyFrom: starts[i],
      keyTo: starts[i] + key.length,
      value: span,
      kind: "scalar",
      listStyle: "",
      items: [],
    };
    if (!span.quote && span.text.startsWith("[") && span.text.endsWith("]")) {
      entry.kind = "list";
      entry.listStyle = "inline";
      entry.open = span.from + span.lead.length + 1;
      entry.close = span.to - span.tail.length - 1;
      entry.items = docFmSplitInline(span.text.slice(1, -1), entry.open);
    } else if (!span.text) {
      //: A block list: the key's own line carries no value and the lines under
      //: it are `- item`. Its own kind rather than an empty scalar, because
      //: `tags:` followed by nothing is a key with no value and `tags:`
      //: followed by `- a` is a list, and the panel draws the two differently.
      const items = [];
      let last = i;
      for (let j = i + 1; j < close; j += 1) {
        const item = DOC_FM_ITEM.exec(lines[j]);
        if (!item) break;
        items.push(docFmSpan(lines[j].slice(item[1].length + 1), starts[j] + item[1].length + 1));
        entry.indent = item[1];
        last = j;
      }
      if (items.length) {
        entry.kind = "list";
        entry.listStyle = "block";
        entry.items = items;
        entry.to = starts[last] + lines[last].length;
        i = last;
      } else {
        entry.kind = "empty";
      }
    }
    entries.push(entry);
  }

  return {
    from: 0,
    to: starts[close] + lines[close].length,
    bodyFrom: starts[1],
    bodyTo: starts[close],
    closeFrom: starts[close],
    closeLine: close,
    entries,
    //: Where the document's prose starts: past the closing fence's newline,
    //: which is what the preview and the outline read.
    textFrom: Math.min(source.length, starts[close] + lines[close].length + 1),
  };
}

//: The entry for a key, case-insensitively (`Tags` and `tags` are the same
//: property to anyone reading the panel), or null.
function docFrontmatterEntry(fm, key) {
  const wanted = String(key == null ? "" : key).trim().toLowerCase();
  return (fm && fm.entries.find((entry) => entry.key.toLowerCase() === wanted)) || null;
}

//: Set a scalar. The span is the value's own, so the key, the colon, the gap
//: after it and every other line keep their bytes. An empty edit list when the
//: value already reads that way, which is load-bearing: the panel writes on
//: every input event and a write that changes nothing must not reach the undo
//: history.
function docFrontmatterSetEdits(fm, key, value) {
  const entry = docFrontmatterEntry(fm, key);
  if (!entry) return docFrontmatterAddEdits(fm, key, value);
  const span = entry.value;
  const insert = docFmWrite(span, value);
  if (insert === docFmRaw(span)) return [];
  return [{ from: span.from, to: span.to, insert }];
}

//: Set the whole list, item by item. An item that reads the same is not
//: touched at all, which is what keeps `tags: [ one,two ,three ]` from being
//: tidied up behind its author's back when the second tag is renamed.
function docFrontmatterSetListEdits(fm, key, values) {
  const entry = docFrontmatterEntry(fm, key);
  const wanted = (values || []).map((value) => String(value == null ? "" : value).trim()).filter(Boolean);
  if (!entry) return wanted.length ? docFrontmatterAddEdits(fm, key, `[${wanted.join(", ")}]`) : [];
  if (entry.kind !== "list") {
    //: A scalar asked to hold a list becomes an inline list, which is the one
    //: place this model rewrites a whole value: `status: draft` turning into
    //: two statuses has no smaller form than that.
    return docFrontmatterSetEdits(fm, key, `[${wanted.join(", ")}]`);
  }
  const edits = [];
  const items = entry.items;
  const shared = Math.min(items.length, wanted.length);
  for (let i = 0; i < shared; i += 1) {
    const span = items[i];
    const insert = docFmWrite(span, wanted[i]);
    if (insert !== docFmRaw(span)) edits.push({ from: span.from, to: span.to, insert });
  }
  if (wanted.length < items.length) {
    //: Removing items takes the separator that *introduced* each of them: the
    //: comma before it inline, the whole line in a block list. Taking the one
    //: after instead is how a list ends up with a trailing comma.
    const last = items[items.length - 1];
    const from = wanted.length
      ? items[wanted.length - 1].to
      : entry.listStyle === "inline"
        ? entry.open
        : entry.value.to;
    edits.push({ from, to: last.to, insert: "" });
  } else if (wanted.length > items.length) {
    const extra = wanted.slice(items.length);
    if (entry.listStyle === "inline") {
      const at = items.length ? items[items.length - 1].to : entry.open;
      edits.push({ from: at, to: at, insert: (items.length ? ", " : "") + extra.join(", ") });
    } else {
      const indent = entry.indent === undefined ? "  " : entry.indent;
      edits.push({ from: entry.to, to: entry.to, insert: extra.map((text) => `\n${indent}- ${text}`).join("") });
    }
  }
  return edits;
}

//: A new key, on its own line immediately above the closing fence, so the
//: order the author put the others in is untouched.
function docFrontmatterAddEdits(fm, key, value) {
  if (!fm) return [];
  const name = String(key == null ? "" : key).trim();
  if (!name || docFrontmatterEntry(fm, name)) return [];
  const text = String(value == null ? "" : value).replace(/[\r\n]+/g, " ");
  const body = docFmNeedsQuote(text) && !/^\[.*\]$/.test(text) ? `"${text.split('"').join("")}"` : text;
  return [{ from: fm.closeFrom, to: fm.closeFrom, insert: `${name}:${body ? ` ${body}` : ""}\n` }];
}

//: A key and everything under it, including the newline that ended its last
//: line, so removing the only property leaves `---\n---` rather than a blank
//: line inside the block.
function docFrontmatterRemoveEdits(fm, key) {
  const entry = docFrontmatterEntry(fm, key);
  if (!entry) return [];
  return [{ from: entry.from, to: Math.min(entry.to + 1, fm.closeFrom), insert: "" }];
}

//: The block itself, for a document that has none. The blank line after it is
//: part of the insert: `---\n---\n# Title` is a document whose first heading
//: is glued to its properties in every renderer that is not this one.
function docFrontmatterCreateEdits(text, key, value) {
  const source = String(text == null ? "" : text);
  if (docFrontmatterParse(source)) return [];
  const name = String(key == null ? "" : key).trim() || "tags";
  const body = String(value == null ? "" : value);
  return [{ from: 0, to: 0, insert: `---\n${name}:${body ? ` ${body}` : ""}\n---\n${source.trim() ? "\n" : ""}` }];
}

//: The document without its properties, for anything that reads the prose
//: rather than the file: the preview, the outline, the reading time. Returns
//: the text unchanged when there is no frontmatter, which is most documents.
function docFrontmatterStrip(text) {
  const fm = docFrontmatterParse(text);
  if (!fm) return String(text == null ? "" : text);
  return String(text).slice(fm.textFrom).replace(/^\n+/, "");
}

// DOC-FRONTMATTER-END

// -----------------------------------------------------------------------------
// The properties panel: the model above, as fields
// -----------------------------------------------------------------------------
//
// **Why this is DOM outside the editor rather than a widget inside it.** A
// `Decoration.replace` from a view plugin may not contain a line break:
// CodeMirror throws "Decorations that replace line breaks may not be specified
// via plugin" and the whole view stops updating. Frontmatter is three lines at
// the very least, so the panel cannot be a block widget over it. It is built
// here and inserted as the first child of `#doc-editor`, which is a flex
// column, so it sits above the view and shares its column. (Not as a sibling
// *before* `#doc-editor`: `.doc-source-wrap` is a flex **row**, because the
// line-number gutter sits beside the text, so a sibling there would be a
// column to the left of the writing rather than a panel above it.)
//
// The frontmatter lines themselves hide in Live the way a table's delimiter
// row does: one `Decoration.line` per line with `height: 0` plus a per-line
// `hide()`, and each of those replacements is inside a single line, which is
// what makes them legal from a plugin.
//
// **Writes happen on `change`, not on `input`**, and that is a decision rather
// than an oversight: `input` would put one transaction per keystroke into the
// undo history, so Ctrl+Z would take back a letter of a tag at a time, and it
// would re-enter this function mid-typing on every one of them. `change`
// fires on Enter and on blur, which is one undo step per edited value: the
// same granularity the table commands chose for the same reason.
//
// **Live only.** Source shows the YAML itself, so a panel there would be two
// editable copies of one thing on screen at once; Read renders the properties
// as a block through the preview (`renderDocPreview`). The panel is markdown
// only, because a `.py` file whose first line is `---` is not a document with
// properties.

//: One list of edits, one transaction, through the editor's own dispatch: the
//: caret, the undo step and the fallback textarea are all handled there.
function docPropsDispatch(edits) {
  if (!edits || !edits.length) return false;
  return docTableDispatch({ surface: docSurface(), text: docText() }, edits);
}

//: The frontmatter as it is *now*. Every write re-parses rather than closing
//: over the parse the row was built from: between building a row and blurring
//: its field the document may have been typed in, and an edit dispatched at
//: stale offsets lands in the middle of somebody's sentence.
function docPropsNow() {
  return docFrontmatterParse(docText());
}

function docPropsShowing() {
  return docView === "live" && docFileType().previewable;
}

//: The panel's host, made once and kept. No id: `tests/test_frontend_ids.py`
//: pairs every `$("...")` in the scripts with an element in index.html, and
//: index.html cannot hold this one (it is another agent's file, and an empty
//: host for a panel that only some documents have is markup that lies).
function docPropsHost(create = false) {
  const editor = $("doc-editor");
  if (!editor) return null;
  let host = editor.querySelector(".doc-props");
  if (!host && create) {
    host = document.createElement("div");
    host.className = "doc-props";
    host.setAttribute("role", "group");
    host.setAttribute("aria-label", "Document properties");
    editor.insertBefore(host, editor.firstChild);
  }
  return host;
}

//: What the panel was last drawn from, so typing in the document does not
//: rebuild a panel that already says the right thing. The whole block's text,
//: not a hash of it: it is a few dozen characters and comparing it is exact.
let docPropsDrawn = null;

//: A row's remove button, and the panel's own small buttons, all from the
//: app's icon-only ghost recipe rather than from three hand-rolled ones.
function docPropsIconButton(icon, label) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "ghost small icon-only doc-prop-btn";
  button.title = label;
  button.setAttribute("aria-label", label);
  const glyph = document.createElement("i");
  glyph.className = `ph ph-${icon}`;
  glyph.setAttribute("aria-hidden", "true");
  button.appendChild(glyph);
  return button;
}

//: One value of a list property. A chip is a fact (DESIGN.md's recipe index
//: says so), and the button beside it inside the chip is the action: removing
//: this value. The pair is what every tag field in this app already looks
//: like.
function docPropsChip(key, value) {
  const box = document.createElement("span");
  box.className = "chip doc-prop-chip";
  const label = document.createElement("span");
  label.textContent = value;
  const remove = docPropsIconButton("x", `Remove ${value}`);
  remove.addEventListener("click", () => {
    const fm = docPropsNow();
    const entry = fm && docFrontmatterEntry(fm, key);
    if (!entry) return;
    const values = entry.items.map((item) => item.text).filter((text) => text !== value);
    docPropsDispatch(docFrontmatterSetListEdits(fm, key, values));
    renderDocProperties(true);
  });
  box.append(label, remove);
  return box;
}

//: The field that adds a value to a list. Enter commits, and the panel is
//: rebuilt with the focus back in this same field, because adding three tags
//: in a row is one gesture and having to click back into the box between them
//: is not.
function docPropsAdder(key) {
  const input = document.createElement("input");
  input.type = "text";
  input.className = "doc-prop-add";
  input.placeholder = "Add";
  input.setAttribute("aria-label", `Add a value to ${key}`);
  const commit = () => {
    const value = input.value.trim();
    if (!value) return;
    const fm = docPropsNow();
    const entry = fm && docFrontmatterEntry(fm, key);
    if (!entry) return;
    input.value = "";
    docPropsDispatch(docFrontmatterSetListEdits(fm, key, [...entry.items.map((item) => item.text), value]));
    renderDocProperties(true);
    const again = docPropsHost();
    const field = again && again.querySelector(`[data-doc-prop-add="${CSS.escape(key)}"]`);
    if (field) field.focus();
  };
  input.dataset.docPropAdd = key;
  input.addEventListener("keydown", (event) => {
    if (event.key !== "Enter") return;
    event.preventDefault();
    commit();
  });
  input.addEventListener("change", commit);
  return input;
}

//: A scalar's field. `change` rather than `input`, for the reason at the top
//: of this section.
function docPropsField(key, value) {
  const input = document.createElement("input");
  input.type = "text";
  input.className = "doc-prop-input";
  input.value = value;
  input.setAttribute("aria-label", key);
  input.addEventListener("change", () => {
    const fm = docPropsNow();
    if (!fm) return;
    docPropsDispatch(docFrontmatterSetEdits(fm, key, input.value));
  });
  return input;
}

//: "Add property": a button that becomes the field for the new key's name, so
//: the panel never carries an empty row waiting to be filled in and there is
//: no dialog for something that is one word long.
function docPropsAddRow(host) {
  const row = document.createElement("div");
  row.className = "doc-prop-new";
  const button = document.createElement("button");
  button.type = "button";
  button.className = "ghost small doc-prop-new-btn";
  button.textContent = "Add property";
  const input = document.createElement("input");
  input.type = "text";
  input.className = "doc-prop-input doc-prop-new-input hidden";
  input.placeholder = "Property name";
  input.setAttribute("aria-label", "New property name");
  button.addEventListener("click", () => {
    button.classList.add("hidden");
    input.classList.remove("hidden");
    input.focus();
  });
  const commit = () => {
    const name = input.value.trim();
    input.value = "";
    input.classList.add("hidden");
    button.classList.remove("hidden");
    if (!name) return;
    const fm = docPropsNow();
    if (!fm) return;
    docPropsDispatch(docFrontmatterAddEdits(fm, name, ""));
    renderDocProperties(true);
  };
  input.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      commit();
    } else if (event.key === "Escape") {
      event.preventDefault();
      input.value = "";
      commit();
    }
  });
  input.addEventListener("blur", commit);
  row.append(button, input);
  host.appendChild(row);
}

//: Draw the panel from the document. Called on every document change, so it
//: does as little as it can: if the frontmatter's own text has not moved, the
//: panel already says the right thing and nothing is rebuilt.
//:
//: `force` is for the panel's own writes (a chip removed, a value added),
//: which change the text the panel is drawn from and therefore have to redraw
//: it; everything else must not, because a rebuild while a field has the
//: focus would take the caret out of it mid-word.
function renderDocProperties(force = false) {
  const editor = $("doc-editor");
  if (!editor) return;
  const fm = docPropsShowing() ? docFrontmatterParse(docText()) : null;
  const host = docPropsHost(Boolean(fm));
  if (!host) return;
  if (!fm) {
    host.replaceChildren();
    host.classList.add("hidden");
    docPropsDrawn = null;
    return;
  }
  host.classList.remove("hidden");
  const drawn = docText().slice(fm.from, fm.to);
  const holdsFocus = host.contains(document.activeElement);
  if (drawn === docPropsDrawn && host.childElementCount) return;
  docPropsDrawn = drawn;
  if (holdsFocus && !force) return;

  host.replaceChildren();
  for (const entry of fm.entries) {
    const row = document.createElement("div");
    row.className = "doc-prop-row";
    const key = document.createElement("span");
    key.className = "doc-prop-key";
    key.textContent = entry.key;
    key.title = `The ${entry.key} property, written in this document's frontmatter`;
    const value = document.createElement("div");
    value.className = "doc-prop-value";
    if (entry.kind === "list") {
      for (const item of entry.items) value.appendChild(docPropsChip(entry.key, item.text));
      value.appendChild(docPropsAdder(entry.key));
    } else {
      value.appendChild(docPropsField(entry.key, entry.value.text));
    }
    const remove = docPropsIconButton("trash", `Remove the ${entry.key} property`);
    remove.addEventListener("click", () => {
      const now = docPropsNow();
      if (!now) return;
      docPropsDispatch(docFrontmatterRemoveEdits(now, entry.key));
      renderDocProperties(true);
    });
    row.append(key, value, remove);
    host.appendChild(row);
  }
  docPropsAddRow(host);
}

//: The "/" menu's and the toolbar's way in, for a document that has no
//: properties yet. One property (`tags`), because an empty block is a thing
//: to delete rather than a thing to fill in, and the panel's own "Add
//: property" covers the rest.
function docInsertProperties() {
  const text = docText();
  const fm = docFrontmatterParse(text);
  if (fm) {
    //: Already has them: put the caret in the block rather than adding a
    //: second one, which is what a person pressing this twice means.
    docSurface()?.setSelectionRange(fm.bodyFrom, fm.bodyFrom);
    docSurface()?.focus();
    renderDocProperties(true);
    return;
  }
  docPropsDispatch(docFrontmatterCreateEdits(text, "tags", "[]"));
  renderDocProperties(true);
  const host = docPropsHost();
  const field = host && host.querySelector(".doc-prop-add");
  if (field) field.focus();
}

// =============================================================================
// Columns and image options (DOCUMENTS_PLAN Phase 3 item 5)
// =============================================================================
//
// Two small parsers, both pure string work, both bracketed for
// `tests/test_doc_columns.py` to run in node.
//
// **The syntax, decided here and written into the plan's decisions.**
//
// `:::columns` opens a block, `:::column` starts the next column inside it,
// and `:::` closes it. Three reasons for that shape rather than another:
// `:::` fenced divs are what Pandoc, Obsidian's community plugins and every
// markdown-it-container setup already use, so the text stays readable
// somewhere else; the opening word says what the block is rather than naming
// an id the way the multi-column plugins do; and a break that is `:::column`
// (singular) can never be confused with the `:::` that closes, which is the
// ambiguity every other candidate had.
//
// An image's options are `|`-separated and recognised by *shape*, not by
// position: `![[photo.png|300]]` is Obsidian's own width syntax and reads the
// same here, `![[photo.png|300|center]]` adds the alignment, and any option
// that is neither a number nor an alignment is the caption. Shape rather than
// order, because `![[photo.png|A river at dusk|400]]` is what people actually
// type once they know both exist, and an editor that then made the caption
// four hundred pixels wide would be obeying its grammar instead of its author.
// The same options work on a plain markdown image through its alt text,
// `![A river|400|center](/media/river.jpg)`, which is the form that travels.

// DOC-BLOCKS-BEGIN

//: `:::columns`, `::: columns`, `:::columns 3`: the count is accepted and
//: ignored, because the number of columns is how many there *are*, and a
//: header that disagrees with the body is a lie the renderer would have to
//: pick a side in.
const DOC_COLS_OPEN = /^[ \t]*:::[ \t]*columns\b[ \t]*\d*[ \t]*$/i;
const DOC_COLS_BREAK = /^[ \t]*:::[ \t]*column[ \t]*$/i;
const DOC_COLS_CLOSE = /^[ \t]*:::[ \t]*$/;
const DOC_CODE_FENCE = /^[ \t]*(?:```|~~~)/;

//: Every columns block in a text, with each column's own span. Offsets are the
//: document's, like every other model in this file, so a widget built from one
//: can dispatch a selection into it without a second coordinate system.
//:
//: An unclosed block is not a block: it is somebody halfway through typing
//: one, and rendering the rest of the document as a column while they do it is
//: the behaviour that makes live preview feel unsafe.
function docColumnsBlocks(text) {
  const source = String(text == null ? "" : text);
  const lines = source.split("\n");
  const starts = [];
  let at = 0;
  for (const line of lines) {
    starts.push(at);
    at += line.length + 1;
  }
  const blocks = [];
  let fenced = false;
  let open = -1;
  let breaks = [];
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    //: A code fence wins: `:::columns` inside one is an example of the syntax,
    //: not a use of it, and this file has already been bitten once by a
    //: scanner that could not tell the two apart.
    if (DOC_CODE_FENCE.test(line)) {
      fenced = !fenced;
      continue;
    }
    if (fenced) continue;
    if (open === -1) {
      if (DOC_COLS_OPEN.test(line)) {
        open = i;
        breaks = [];
      }
      continue;
    }
    if (DOC_COLS_BREAK.test(line)) {
      breaks.push(i);
      continue;
    }
    if (DOC_COLS_OPEN.test(line)) {
      //: A second opener before the close: the first one was never a block.
      open = i;
      breaks = [];
      continue;
    }
    if (!DOC_COLS_CLOSE.test(line)) continue;
    const edges = [open, ...breaks, i];
    const columns = [];
    for (let c = 0; c < edges.length - 1; c += 1) {
      const from = starts[edges[c]] + lines[edges[c]].length + 1;
      const to = Math.max(from, starts[edges[c + 1]] - 1);
      columns.push({ from, to, text: source.slice(from, to) });
    }
    blocks.push({
      from: starts[open],
      to: starts[i] + lines[i].length,
      openLine: open,
      closeLine: i,
      columns,
    });
    open = -1;
    breaks = [];
  }
  return blocks;
}

//: The block an offset is inside, or null. The whole block including its
//: fences, because the caret being on the `:::` line is being in the block.
function docColumnsAt(text, offset) {
  return docColumnsBlocks(text).find((block) => offset >= block.from && offset <= block.to) || null;
}

//: An image's `|`-separated options, by shape rather than by position.
//: `width` is a number of pixels, `align` is one of left/center/right, and
//: everything else is the caption (joined with a space, so a caption with a
//: pipe in it survives as the sentence it was).
function docImageOptions(spec) {
  const parts = String(spec == null ? "" : spec).split("|");
  const name = parts.shift();
  const options = { name: (name || "").trim(), width: null, align: null, caption: "" };
  const caption = [];
  for (const raw of parts) {
    const part = raw.trim();
    if (!part) continue;
    if (/^\d{1,4}$/.test(part)) {
      options.width = Number(part);
      continue;
    }
    //: `x`-separated dimensions are Obsidian's too (`300x200`). The height is
    //: read and deliberately dropped: an image with both fixed is an image
    //: with a stretched aspect ratio, and nobody means that.
    const pair = /^(\d{1,4})x(\d{1,4})$/i.exec(part);
    if (pair) {
      options.width = Number(pair[1]);
      continue;
    }
    const align = /^(left|centre|center|right)$/i.exec(part);
    if (align) {
      options.align = align[1].toLowerCase() === "centre" ? "center" : align[1].toLowerCase();
      continue;
    }
    caption.push(part);
  }
  options.caption = caption.join(" ");
  return options;
}

// DOC-BLOCKS-END

// =============================================================================
// Block references (DOCUMENTS_PLAN Phase 4 item 2)
// =============================================================================
//
// A paragraph you can link to and embed, from a note, a map node or a chat.
//
// **The syntax is Obsidian's**, and the reason is the reason the columns fence
// is Pandoc's: a document written here should still say the same thing
// somewhere else. A block carries `^an-id` at the end of its last line; a link
// to it is `[[Document title#^an-id]]` and an embed of it is the same with a
// leading `!`, which is the form the embeds built in Phase 3 already parse the
// left half of.
//
// **The id is generated, never asked for.** Obsidian asks the same way: you
// copy a link to a block and the id appears in the text. A person naming
// their own ids is a person maintaining them, and the one thing a block
// reference must survive is the paragraph being rewritten around it.
//
// Everything between the markers below is pure string work with no DOM and no
// app globals in it, so `tests/test_doc_blockrefs.py` runs it in node. That is
// a property the tests enforce by existing, the same way the table and
// frontmatter models are tested.

// DOC-BLOCKREF-BEGIN

//: What an id may be. Deliberately narrower than Obsidian's (which allows any
//: non-space run): an id is generated here, so the only reason to accept more
//: is to read somebody else's file, and a `^` followed by punctuation is far
//: more likely to be a caret in prose ("2^31", "x ^ y") than a block id.
const DOC_BLOCK_ID = "[A-Za-z0-9][A-Za-z0-9-]{0,31}";
//: The trailing `^id` on a line, with the space before it, so removing the id
//: does not leave a space behind.
const DOC_BLOCK_ID_AT_END = new RegExp(`(?:^|[ \\t])\\^(${DOC_BLOCK_ID})[ \\t]*$`);
//: A list item's own bullet. A block id on a list belongs to the item, not to
//: the whole list, which is the one place "the block" is a single line.
const DOC_BLOCK_LIST_LINE = /^\s*(?:[-*+]|\d{1,9}[.)])\s+/;

//: `Document title#^an-id` split into its halves. Returns `blockId: null` for
//: a plain name, so every caller can use this and none has to know whether a
//: link happens to carry one.
function docBlockRefSplit(spec) {
  const text = String(spec == null ? "" : spec);
  const hash = text.indexOf("#^");
  if (hash === -1) return { name: text.trim(), blockId: null };
  const id = text.slice(hash + 2).trim();
  return {
    name: text.slice(0, hash).trim(),
    blockId: new RegExp(`^${DOC_BLOCK_ID}$`).test(id) ? id : null,
  };
}

//: Is this position inside a fenced code block? A `^id` written in one is an
//: example of the syntax rather than a use of it, and a block id may not be
//: put there at all: the text inside a fence is code, and appending to it
//: changes what the code says.
function docBlockInFence(lines, index) {
  let open = false;
  for (let i = 0; i < index; i++) {
    if (/^\s*(?:```|~~~)/.test(lines[i])) open = !open;
  }
  return open;
}

//: The block a position is in: `{from, to, lastFrom, lastTo}` over the text,
//: or null when there is no block there (a blank line, or inside a fence).
//:
//: A block is the run of non-blank lines around the position, except in a
//: list, where it is the item's own line. Both are what Obsidian does and
//: both are what a person means by "this paragraph".
function docBlockBounds(text, pos) {
  const body = String(text == null ? "" : text);
  const lines = body.split("\n");
  const starts = [];
  let at = 0;
  for (const line of lines) {
    starts.push(at);
    at += line.length + 1;
  }
  const clamped = Math.max(0, Math.min(body.length, pos | 0));
  let index = 0;
  while (index + 1 < lines.length && starts[index + 1] <= clamped) index++;
  if (!lines[index].trim()) return null;
  if (docBlockInFence(lines, index)) return null;
  let first = index;
  let last = index;
  if (!DOC_BLOCK_LIST_LINE.test(lines[index])) {
    while (first > 0 && lines[first - 1].trim() && !DOC_BLOCK_LIST_LINE.test(lines[first - 1])) {
      first--;
    }
    while (
      last + 1 < lines.length &&
      lines[last + 1].trim() &&
      !DOC_BLOCK_LIST_LINE.test(lines[last + 1])
    ) {
      last++;
    }
  }
  return {
    from: starts[first],
    to: starts[last] + lines[last].length,
    lastFrom: starts[last],
    lastTo: starts[last] + lines[last].length,
  };
}

//: The id a block already carries, as `{id, from, to}` over the text, or null.
//: The span includes the space before the `^`, so it round-trips: removing it
//: gives back exactly the line that was there before the id was added.
function docBlockIdOf(text, bounds) {
  if (!bounds) return null;
  const line = String(text).slice(bounds.lastFrom, bounds.lastTo);
  const match = DOC_BLOCK_ID_AT_END.exec(line);
  if (!match) return null;
  return {
    id: match[1],
    from: bounds.lastFrom + match.index,
    to: bounds.lastFrom + match.index + match[0].length,
  };
}

//: Every id already in a document, so a new one cannot collide with one.
function docBlockIds(text) {
  const found = new Set();
  for (const line of String(text == null ? "" : text).split("\n")) {
    const match = DOC_BLOCK_ID_AT_END.exec(line);
    if (match) found.add(match[1]);
  }
  return found;
}

//: A new id for this document. Six characters of base 36, which is 2.2 billion
//: of them: short enough to read in the text it is appended to, and the
//: collision check below makes the birthday problem somebody else's.
//:
//: `random` is a parameter so the test can make this total rather than
//: probabilistic; nothing in the app passes it.
function docBlockNewId(text, random) {
  const roll = typeof random === "function" ? random : Math.random;
  const taken = docBlockIds(text);
  for (let attempt = 0; attempt < 50; attempt++) {
    const id = Math.floor(roll() * 36 ** 6)
      .toString(36)
      .padStart(6, "0")
      .slice(-6);
    if (!taken.has(id)) return id;
  }
  return null;
}

//: The edits that give the block at `pos` an id, and the id itself. A block
//: that already has one is not touched: the whole point of an id is that a
//: link written yesterday still resolves.
//:
//: One `{from, to, insert}` over the end of the block's last line, which is
//: the same shape the table and frontmatter models write, and for the same
//: reason: it keeps every other byte of the document exactly as it was.
function docBlockEnsureIdEdits(text, pos, random) {
  const bounds = docBlockBounds(text, pos);
  if (!bounds) return { id: null, edits: [], reason: "no-block" };
  const existing = docBlockIdOf(text, bounds);
  if (existing) return { id: existing.id, edits: [], reason: "already" };
  const id = docBlockNewId(text, random);
  if (!id) return { id: null, edits: [], reason: "no-id" };
  const line = String(text).slice(bounds.lastFrom, bounds.lastTo);
  //: Trailing spaces are not kept in front of the id: two of them at the end
  //: of a markdown line are a hard line break, and `  ^id` would move it.
  const trimmed = line.replace(/[ \t]+$/, "");
  return {
    id,
    edits: [
      {
        from: bounds.lastFrom + trimmed.length,
        to: bounds.lastTo,
        insert: ` ^${id}`,
      },
    ],
    reason: "added",
  };
}

//: The block carrying an id: `{from, to, text}` over the document, with the
//: `^id` itself left out of the text (it is scaffolding, not content).
//: Returns null when nothing carries it, which is what a link to a block
//: somebody deleted looks like.
function docBlockFind(text, id) {
  const body = String(text == null ? "" : text);
  if (!new RegExp(`^${DOC_BLOCK_ID}$`).test(String(id || ""))) return null;
  const lines = body.split("\n");
  let at = 0;
  for (let index = 0; index < lines.length; index++) {
    const match = DOC_BLOCK_ID_AT_END.exec(lines[index]);
    if (match && match[1] === id && !docBlockInFence(lines, index)) {
      const bounds = docBlockBounds(body, at);
      if (!bounds) return null;
      const marker = docBlockIdOf(body, bounds);
      const whole = body.slice(bounds.from, bounds.to);
      const clean = marker
        ? whole.slice(0, marker.from - bounds.from) + whole.slice(marker.to - bounds.from)
        : whole;
      return { from: bounds.from, to: bounds.to, text: clean };
    }
    at += lines[index].length + 1;
  }
  return null;
}

//: The text as a *reader* sees it: every block marker taken out. A `^id` is
//: scaffolding the same way `[[` and `]]` are, so it belongs in the source
//: pane and in the file on disk, and nowhere in the rendered pane or the PDF
//: printed from it. The Live view already hides it; this is the same rule for
//: the pane that has no caret to bring it back.
//:
//: Markers inside a fence are left alone: there a `^id` is an example of the
//: syntax rather than a use of it, and a preview that rewrites code is a
//: preview saying something the file does not.
function docBlockStripIds(text) {
  let fenced = false;
  return String(text == null ? "" : text)
    .split("\n")
    .map((line) => {
      if (/^\s*(?:```|~~~)/.test(line)) {
        fenced = !fenced;
        return line;
      }
      return fenced ? line : line.replace(DOC_BLOCK_ID_AT_END, "");
    })
    .join("\n");
}

// DOC-BLOCKREF-END

// --- block references in the running editor ----------------------------------

//: Another document's text, fetched once for the embeds that need it. A page
//: holding six embeds of one document asks for it once, and the open document
//: is never fetched at all: its text is what is being typed.
const docBlockTextCache = new Map();

function docBlockDocumentText(doc) {
  if (!doc) return null;
  if (currentDoc && doc.id === currentDoc.id) return docText();
  if (doc.content != null) return doc.content;
  return docBlockTextCache.has(doc.id) ? docBlockTextCache.get(doc.id) : null;
}

//: Give the block the caret is in an id, and hand back the reference a person
//: can paste. The id is written into the document, which is the point: a block
//: reference is a promise the text itself keeps, not an index this app holds.
function docBlockRefAtCaret() {
  const surface = docSurface();
  if (!surface) return null;
  const text = docText();
  const made = docBlockEnsureIdEdits(text, surface.selectionStart);
  if (!made.id) return { id: null, reason: made.reason };
  if (made.edits.length) {
    docTableDispatch({ surface, text }, made.edits);
    markDocDirty();
  }
  return { id: made.id, reason: made.reason };
}

//: The `/` menu's "Link to this block". Copies `[[Title#^id]]`, because that
//: is the form you paste into a note, a map node or a chat, and those three
//: are what the plan asks a block reference to reach.
async function docCopyBlockRef() {
  const title = (currentDoc?.title || "").trim();
  if (!title) {
    toast("Give the document a title first, a block link is named by it.", true);
    return;
  }
  const made = docBlockRefAtCaret();
  if (!made || !made.id) {
    toast("Put the caret in a paragraph first.", true);
    return;
  }
  const reference = `[[${title}#^${made.id}]]`;
  //: Through the shared helper, not `navigator.clipboard`: it falls back to
  //: the copy dialog in the contexts where the API is not there at all, which
  //: is the desktop window's own case.
  if (typeof copyToClipboard === "function") await copyToClipboard(reference);
  toast(`Copied ${reference}`);
}

//: Put the caret on a block and say so. Used when a `[[Doc#^id]]` is followed:
//: opening the document at the top and leaving the reader to find the
//: paragraph is most of the way to not having followed the link at all.
function docRevealBlock(blockId) {
  const found = docBlockFind(docText(), blockId);
  if (!found) {
    toast("That block is not in this document any more.", true);
    return false;
  }
  const surface = docSurface();
  if (!surface) return false;
  surface.focus();
  //: The selection is the reveal: `setSelectionRange` on this surface already
  //: scrolls to what it selects, and selecting the block is both "here it is"
  //: and a sensible place to be left, because the next thing a reader does is
  //: copy it or edit it.
  surface.setSelectionRange(found.from, found.to);
  return true;
}

// =============================================================================
// Comments and annotations (DOCUMENTS_PLAN Phase 5 item 1)
// =============================================================================
//
// **The syntax is two constructs this editor already wrote, joined.**
// `==highlighted text==` has rendered as a highlight since Phase 2 and
// `%%a note to self%%` has been in the Insert menu just as long, kept in the
// file and never rendered. A comment is the pair: the highlight says *which
// words* and the `%%…%%` immediately after it says *what about them*. Nothing
// new goes into the file, so a document written here still opens in Obsidian
// (same two constructs, same meaning) and a document written there arrives
// with its comments already understood.
//
// **A bare `%%…%%` is still a comment**, on the line it sits in rather than on
// a span of words: that is what the Insert menu has always inserted, and a
// feature that made yesterday's notes to self invisible to the panel listing
// comments would be a feature that lost them.
//
// **Resolving removes the comment from the document**, and unwraps the
// highlight it was attached to, leaving the words themselves. The alternative
// (a resolved marker left in the text) was considered and refused: it is a
// second state to render, a second thing for Live and Read to agree about, and
// a file whose `%%` spans mean two different things depending on a flag
// somewhere else. What makes removal safe here is that this editor already
// keeps every version of a document (`/documents/{id}/revisions`) and the
// engine's own undo covers the keystroke, so a resolve is recoverable twice
// over.
//
// **In an export, a comment becomes a footnote** (`docCommentFootnotes`), so a
// PDF handed to somebody carries the remarks rather than dropping them. In
// Read and Split they are hidden: the document as it reads is the document
// without the margin notes in it.
//
// The model is pure string work with no DOM and no app globals, so
// `tests/test_doc_comments.py` runs it in node, the same way the table,
// frontmatter, columns and block-reference models are tested. The footnote
// conversion exists twice, here and in `src/memorymap/core/docexport.py`
// (the server exports cannot call into this file), and that test runs both
// over one fixture and asserts the two agree byte for byte.

// DOC-COMMENT-BEGIN

//: Where a `%%…%%` is not a comment: inside a fence or inline code it is an
//: example of the syntax, and in frontmatter it is a property's value. The
//: three patterns are the subset of `DOC_PROSE_SKIP` that applies (an address
//: or a link destination cannot contain a `%%` pair and a wiki link has its
//: own brackets), repeated here rather than shared because everything between
//: these markers has to run in node with nothing else loaded.
const DOC_COMMENT_SKIP = [
  /(^|\n)[ \t]*(```|~~~)[^\n]*\n[\s\S]*?(\n[ \t]*\2[^\n]*|$)/g, // fenced code
  /`[^`\n]+`/g, // inline code
  /^---\n[\s\S]*?\n---/g, // frontmatter
];

function docCommentSkipMask(text) {
  const mask = new Uint8Array(text.length);
  for (const source of DOC_COMMENT_SKIP) {
    //: A fresh regex per pass: these carry `g`, and `lastIndex` survives on a
    //: shared object, which silently skips half the document on every second
    //: call. The same note is on `docProseSkipMask`, for the same reason.
    const pattern = new RegExp(source.source, source.flags);
    let match;
    while ((match = pattern.exec(text)) !== null) {
      if (!match[0].length) {
        pattern.lastIndex += 1;
        continue;
      }
      mask.fill(1, match.index, match.index + match[0].length);
    }
  }
  return mask;
}

//: One line only, on purpose. A comment is a remark, Obsidian's multi-line
//: `%%` block is a way of commenting *out* a passage, and a replace decoration
//: that contains a line break is one CodeMirror throws on (the same constraint
//: the math renderer records). A comment long enough to need two lines is a
//: note, and this app has notes.
const DOC_COMMENT_RE = /%%([^\n]*?)%%/g;

//: The highlight a comment is attached to, matched at the end of the text in
//: front of it. `[^=\n]` rather than `[\s\S]` so `==a== and ==b== %%note%%`
//: attaches to `==b==` and not to the whole sentence.
const DOC_COMMENT_TARGET_RE = /==([^=\n]{1,400})==$/;

//: Every comment in a document, in document order, each with the span of the
//: comment itself, the span of the words it is about, and the span a reader
//: should be shown (`anchorFrom`..`anchorTo`, which is the pair together).
//: The spans are what let the panel jump to a comment and resolve it without
//: searching for its text again, which would find the wrong occurrence in a
//: document that says the same thing twice.
function docCommentsParse(text) {
  const body = typeof text === "string" ? text : "";
  if (!body) return [];
  const skip = docCommentSkipMask(body);
  const out = [];
  const pattern = new RegExp(DOC_COMMENT_RE.source, DOC_COMMENT_RE.flags);
  let match;
  let line = 1;
  let scanned = 0;
  while ((match = pattern.exec(body)) !== null) {
    const from = match.index;
    const to = from + match[0].length;
    if (skip[from] === 1) continue;
    const note = match[1].trim();
    //: `%%%%` is a typo, not an empty remark, and a comment with nothing in it
    //: would draw a row in the panel that says nothing at all.
    if (!note) continue;
    //: Lines counted forward from where the last match left off rather than by
    //: splitting the document per comment: a 20,000-word document with forty
    //: comments in it would otherwise walk the whole text forty times.
    for (let at = scanned; at < from; at += 1) if (body[at] === "\n") line += 1;
    scanned = from;
    const head = body.slice(0, from).replace(/[ \t]$/, "");
    const gap = from - head.length;
    const mark = DOC_COMMENT_TARGET_RE.exec(head);
    //: At most one space between the words and the remark about them. Two, or
    //: a line break, and they are two separate things that happen to be near
    //: each other, which is what the bare form is for.
    const anchored = mark && gap <= 1;
    out.push({
      id: `c${from}`,
      from,
      to,
      body: note,
      target: anchored ? mark[1] : "",
      targetFrom: anchored ? head.length - mark[0].length : from,
      targetTo: anchored ? head.length : from,
      anchorFrom: anchored ? head.length - mark[0].length : from,
      anchorTo: to,
      line,
    });
  }
  return out;
}

//: The one edit that resolves a comment: the remark goes, the highlight's
//: markers go with it, and the words stay. Returned rather than applied so
//: both surfaces can dispatch it through their own history (the engine's
//: `replaceRange`, the fallback textarea's `docReplaceRange`) and Ctrl+Z
//: therefore puts it back.
function docCommentResolveEdit(text, comment) {
  const body = typeof text === "string" ? text : "";
  if (!comment) return null;
  const keep = comment.target || "";
  let from = keep ? comment.targetFrom : comment.from;
  let to = comment.to;
  //: The space the remark was written after it belongs to the remark. Left
  //: behind it reads as a typo in the sentence the comment was about, which is
  //: the one thing a resolve must not do to a finished passage.
  if (!keep && body[from - 1] === " ") from -= 1;
  else if (!keep && body[to] === " ") to += 1;
  const lineStart = body.lastIndexOf("\n", Math.max(0, from - 1)) + 1;
  const lineBreak = body.indexOf("\n", to);
  const lineEnd = lineBreak === -1 ? body.length : lineBreak;
  //: A line that was nothing but a comment goes whole, newline included:
  //: otherwise resolving the last remark in a document leaves a blank line
  //: that renders as a paragraph break nobody wrote.
  if (!keep && !body.slice(lineStart, from).trim() && !body.slice(to, lineEnd).trim()) {
    return { from: lineStart, to: Math.min(lineEnd + 1, body.length), insert: "" };
  }
  return { from, to, insert: keep };
}

//: The document without its remarks: what Read and Split show, and what the
//: word count has always counted (a comment is not prose you wrote for a
//: reader). The highlights stay, because a highlight is something the author
//: did to their own text and renders as one.
function docCommentStrip(text) {
  const body = typeof text === "string" ? text : "";
  if (!body) return "";
  const comments = docCommentsParse(body);
  let out = body;
  //: Backwards, so every span is still at the offset it was parsed at.
  for (let index = comments.length - 1; index >= 0; index -= 1) {
    const edit = docCommentResolveEdit(out, { ...comments[index], target: "" });
    out = out.slice(0, edit.from) + edit.insert + out.slice(edit.to);
  }
  return out;
}

//: The document with its remarks as footnotes: what an export carries.
//: `[^c1]` where the remark was, the remark itself in a definition block at
//: the foot, in the markdown every renderer this app's exports pass through
//: already understands (`docNextFootnote` writes the same shape by hand).
//:
//: The prefix is a parameter because a document may already have footnotes of
//: its own; `c1` collides with nothing a person writes, and the caller can
//: pass something else if it ever does.
function docCommentFootnotes(text, prefix = "c") {
  const body = typeof text === "string" ? text : "";
  if (!body) return "";
  const comments = docCommentsParse(body);
  if (!comments.length) return body;
  let out = body;
  const notes = [];
  for (let index = comments.length - 1; index >= 0; index -= 1) {
    const comment = comments[index];
    const label = `${prefix}${index + 1}`;
    notes.unshift(`[^${label}]: ${comment.body}`);
    //: The reference replaces the remark and nothing else: the highlight in
    //: front of it stays highlighted, so the footnote marker sits against the
    //: words it is about rather than at the end of the sentence.
    out = `${out.slice(0, comment.from)}[^${label}]${out.slice(comment.to)}`;
  }
  const tail = out.endsWith("\n") ? "" : "\n";
  return `${out}${tail}\n${notes.join("\n")}\n`;
}

// DOC-COMMENT-END

// --- the comments panel -------------------------------------------------------
//
// **Where a comment is listed, and why it is not a right-hand panel.** The plan
// asked for "a right panel"; this is a section of the document sidebar's Outline
// tab, and the reason is the same one Phase 1 item 5 settled for the outline:
// this editor has *one* panel width. A second vertical column at 1100px leaves
// the measure under 500px, and the sidebar is already where every "about this
// document" list lives (the outline, what links here, the notes it draws on).
// Phase 6 turns that one panel into a sheet at narrow widths, so a right panel
// would have needed a second responsive story for the same content. The phrase
// in Phase 5 item 1 is superseded by this paragraph and nothing else about it
// is.
//
// It was a third tab for one measurement's worth of time, and the measurement is
// why it is not: "Documents", "Outline" and "Comments" want 257px of label in a
// strip with 180px of content box, so the strip wrapped and stood 75px tall
// against 29px. The markup for the backlinks had already written the rule down
// ("the sidebar already has two tabs too many for the space it has"), which is
// the kind of decision this project keeps in the file it applies to precisely so
// that the next session does not have to rediscover it with a ruler.
//
// A row does its work in place, which is DOCUMENTS_PLAN 12 D3's rule for the
// writing panel arrived at from the other end: pressing a row jumps the
// document to the remark and marks the row as where you are
// (`aria-current="location"`), and Resolve is a button on the row rather than a
// popover over the sentence.

//: The remark the reader is looking at, so the row can be painted as current
//: without re-parsing to find out which one it was.
let docCommentCurrent = null;

//: **True only while a print is being prepared** (`exportDocumentPdf`), which
//: is the one moment the rendered pane carries the remarks rather than hiding
//: them: a PDF handed to somebody should carry them as footnotes, and Read view
//: should not, and both are drawn by `renderDocPreview` from one place. A flag
//: rather than an argument because the render is also reached from the debounce
//: and from `setDocView`, neither of which knows anything about printing.
let docPrintComments = false;

function docComments() {
  return docCommentsParse(docText());
}

//: The words a comment is about, or the line it sits on when it is a standing
//: remark: a row that showed only the note would read as a list of loose
//: sentences with no idea what any of them is about.
function docCommentContext(comment) {
  if (comment.target) return comment.target;
  const text = docText();
  const from = text.lastIndexOf("\n", Math.max(0, comment.from - 1)) + 1;
  const to = text.indexOf("\n", comment.to);
  const line = text.slice(from, to === -1 ? text.length : to);
  const rest = (line.slice(0, comment.from - from) + line.slice(comment.to - from)).trim();
  return rest || `Line ${comment.line}`;
}

function docCommentRow(comment) {
  const item = document.createElement("li");
  item.className = "doc-comment-item";
  item.dataset.comment = comment.id;
  if (comment.id === docCommentCurrent) item.setAttribute("aria-current", "location");

  const open = document.createElement("button");
  open.type = "button";
  open.className = "outline-link doc-comment-open";
  open.title = "Show this in the document";
  const context = document.createElement("span");
  context.className = "doc-comment-context";
  context.textContent = docCommentContext(comment);
  //: The kind of thing this is, in the same place the writing panel puts a
  //: finding's kind: a dot, then the words, then what was said about them.
  const mark = document.createElement("i");
  mark.className = comment.target ? "ph ph-highlighter doc-comment-kind" : "ph ph-chat-teardrop-text doc-comment-kind";
  mark.setAttribute("aria-hidden", "true");
  open.append(mark, context);
  open.addEventListener("click", () => docGoToComment(comment));

  const body = document.createElement("p");
  body.className = "doc-comment-body";
  body.textContent = comment.body;
  //: The whole remark, for the row that shows three lines of it.
  body.title = comment.body;

  //: **Resolve rides on the subject line, not on a footer of its own.** It was
  //: a footer with the word on it first, and that is the measurement that moved
  //: it: 113px per row in a 226px column, so a document with four remarks in it
  //: could show two. `.doc-outline-row` is this sidebar's own recipe for a link
  //: that shares its line with one action (References and the attach row use
  //: it), and the icon-only form is the one every other "take this off" in the
  //: panel already takes. The words are on the `title` and the `aria-label`.
  const head = document.createElement("div");
  head.className = "doc-outline-row doc-comment-head";
  const resolve = smallButton(
    "ph:check",
    comment.target
      ? "Resolve: take the remark and its highlight out, leaving the words"
      : "Resolve: take the remark out",
    () => docResolveComment(comment)
  );
  resolve.classList.add("doc-outline-row-action", "doc-comment-action");
  head.append(open, resolve);

  item.append(head, body);
  return item;
}

//: Drawn from the document's own text on every facts pass, like the outline:
//: there is no comment store and there must not be one, or a document copied
//: into this app from anywhere else would arrive with its remarks invisible.
function renderDocComments() {
  const wrap = $("doc-comments-wrap");
  const list = $("doc-comments");
  const count = $("doc-comments-count");
  if (!wrap || !list) return;
  const comments = currentDoc ? docComments() : [];
  if (docCommentCurrent && !comments.some((c) => c.id === docCommentCurrent)) {
    docCommentCurrent = null;
  }
  list.replaceChildren();
  for (const comment of comments) list.appendChild(docCommentRow(comment));
  //: The whole section goes when there is nothing in it, which is what the two
  //: sections under it already do (`renderDocBacklinks`, `renderDocNotes`) and
  //: what this panel's own stylesheet measured the cost of not doing: 69px of
  //: column for an eyebrow over nothing. A sentence explaining what a comment
  //: is would be the right answer for a tab that carries the word in its name;
  //: a section is allowed to be absent.
  wrap.classList.toggle("hidden", !comments.length);
  if (count) count.textContent = comments.length ? String(comments.length) : "";
}

//: The document scrolls to the remark and selects it, which is both "here it
//: is" and a sensible place to be left: the next thing anyone does with a
//: comment is read the sentence around it or edit it. Same choice
//: `docRevealBlock` made, for the same reason.
function docGoToComment(comment) {
  const surface = docSurface();
  if (!surface) return;
  docCommentCurrent = comment.id;
  for (const row of document.querySelectorAll("#doc-comments .doc-comment-item")) {
    if (row.dataset.comment === comment.id) row.setAttribute("aria-current", "location");
    else row.removeAttribute("aria-current");
  }
  //: Read view has no editing surface, so there is nothing to put a caret in
  //: and no reason to leave the reader looking at a page with no remark on it.
  if (docView === "rendered") setDocView("live");
  surface.focus();
  surface.setSelectionRange(comment.anchorFrom, comment.anchorTo);
}

//: Opening the panel *at* a remark, which is what the pin in the text does.
//: The offset rather than the id, because the widget knows where it is in the
//: document and ids are derived from exactly that.
function docShowComment(offset) {
  const comment = docComments().find((c) => c.from === offset) || null;
  showDocSidebarSection("outline");
  if (!comment) {
    renderDocComments();
    return;
  }
  docCommentCurrent = comment.id;
  renderDocComments();
  const row = document.querySelector(`#doc-comments [data-comment="${comment.id}"]`);
  //: The panel's own scrollTop, never `scrollIntoView`: the recipe index's
  //: rule for a list that says where you are, because `scrollIntoView` walks
  //: every scrolling ancestor and takes the page with it.
  if (row) keepOutlineRowInView(row);
}

function docResolveComment(comment) {
  const surface = docSurface();
  if (!surface) return;
  const edit = docCommentResolveEdit(surface.text, comment);
  if (!edit) return;
  docReplaceRange(surface, edit.from, edit.to, edit.insert);
  if (docCommentCurrent === comment.id) docCommentCurrent = null;
  markDocDirty();
  renderDocComments();
  scheduleDocPreview();
  renderDocCounts();
  //: Says where it went rather than only that it happened: the remark is gone
  //: from the text and the undo that brings it back is the ordinary one.
  toast("Resolved. Ctrl+Z puts it back.");
}

//: A remark on the selection, which is the way a comment is made. `custom` in
//: `MD_ACTIONS` rather than a `pre`/`post` pair, because what it inserts
//: depends on what is selected: words become `==words== %%|%%` with the caret
//: in the remark, and nothing selected becomes a standing `%%|%%` on the line.
function docAnnotateSelection(box, boxId = "doc-content") {
  const surface = asSurface(box);
  if (!surface) return;
  const { from, to } = surface.selection();
  const selected = surface.text.slice(from, to);
  const insert = selected ? `==${selected}== %%%%` : "%%%%";
  docReplaceRange(surface, from, to, insert);
  //: The caret between the two `%%` pairs, so the first thing typed is the
  //: remark itself. Counted from the end of what was inserted rather than
  //: forward from the start: the selection's own length is in the middle of it.
  const caret = from + insert.length - 2;
  surface.setSelectionRange(caret, caret);
  //: Through the same finish every other action in `MD_ACTIONS` uses, rather
  //: than `markDocDirty` by hand. Two reasons, and the first is a bug this
  //: avoids: this table is shared with the notes composer, so a remark left in
  //: a *note* would otherwise mark the open *document* unsaved and autosave it.
  //: Only `finishMarkdownEdit` knows which box the press came from. The second
  //: is that the panel needs no nudge from here: the document path ends in
  //: `markDocDirty` -> `scheduleDocFacts` -> `renderDocComments`, and an empty
  //: `%%%%` is not a comment yet anyway (`docCommentsParse` skips it), so the
  //: row is drawn by the first word typed into it rather than before it.
  finishMarkdownEdit(surface, boxId);
}

// =============================================================================
// Math: a small TeX subset rendered as MathML (DOCUMENTS_PLAN Phase 3 item 2)
// =============================================================================
//
// **No KaTeX, and the plan is explicit about it.** The reasons are worth
// keeping next to the code rather than in the plan: KaTeX is 280 KB of script
// and a megabyte of fonts for a notebook whose documents are notes and plans,
// it wants a stylesheet this app's CSP would have to be widened for, and every
// browser this app runs in has rendered MathML natively since 2023. What a
// local-first notebook needs is the arithmetic, the greek, a fraction, a root,
// a sum and a sub/superscript, which is what this does.
//
// The parser is deliberately small and deliberately total: anything it does
// not understand comes out as the text that was typed rather than as an error,
// because an editor that turns a formula it half-knows into a red box is worse
// than one that leaves it alone. `tests/test_doc_math.py` runs it in node over
// the shapes this file claims to handle.

// DOC-MATH-BEGIN

//: The symbols, by what they are rather than by how they look: a greek letter
//: is an identifier (`mi`, italic like any variable) and an operator is an
//: operator (`mo`, spaced like one). Getting that split wrong is what makes
//: hand-rolled math read as a string of glyphs.
const DOC_MATH_LETTERS = {
  alpha: "α", beta: "β", gamma: "γ", delta: "δ", epsilon: "ε",
  varepsilon: "ε", zeta: "ζ", eta: "η", theta: "θ", iota: "ι",
  kappa: "κ", lambda: "λ", mu: "μ", nu: "ν", xi: "ξ", pi: "π",
  rho: "ρ", sigma: "σ", tau: "τ", upsilon: "υ", phi: "φ",
  varphi: "φ", chi: "χ", psi: "ψ", omega: "ω",
  Gamma: "Γ", Delta: "Δ", Theta: "Θ", Lambda: "Λ", Xi: "Ξ",
  Pi: "Π", Sigma: "Σ", Phi: "Φ", Psi: "Ψ", Omega: "Ω",
  infty: "∞", partial: "∂", nabla: "∇", emptyset: "∅", ell: "ℓ",
};

const DOC_MATH_OPERATORS = {
  times: "×", div: "÷", cdot: "⋅", pm: "±", mp: "∓",
  le: "≤", leq: "≤", ge: "≥", geq: "≥", ne: "≠", neq: "≠",
  approx: "≈", equiv: "≡", propto: "∝", sim: "∼",
  to: "→", rightarrow: "→", leftarrow: "←", Rightarrow: "⇒",
  leftrightarrow: "↔", mapsto: "↦",
  in: "∈", notin: "∉", subset: "⊂", subseteq: "⊆", supset: "⊃",
  cup: "∪", cap: "∩", forall: "∀", exists: "∃", neg: "¬",
  land: "∧", lor: "∨", oplus: "⊕", otimes: "⊗", circ: "∘",
  star: "⋆", perp: "⊥", parallel: "∥", angle: "∠", degree: "°",
  ldots: "…", dots: "…", cdots: "⋯", vdots: "⋮",
  sum: "∑", prod: "∏", int: "∫", iint: "∬", oint: "∮",
  bigcup: "⋃", bigcap: "⋂", sqrt: "√",
};

//: A named function is set upright, not italic: `sin x` is a function applied
//: to a variable, and `s` times `i` times `n` times `x` is what it reads as
//: when every letter is an identifier.
const DOC_MATH_FUNCTIONS = [
  "sin", "cos", "tan", "sec", "csc", "cot", "arcsin", "arccos", "arctan",
  "sinh", "cosh", "tanh", "log", "ln", "exp", "lim", "max", "min", "sup", "inf",
  "det", "dim", "gcd", "deg", "arg", "mod",
];

//: Text, taken raw, because the tokeniser below throws whitespace away and
//: `\text{a b}` is the one place the spaces are the point.
const DOC_MATH_RAW_COMMANDS = ["text", "mathrm", "operatorname", "mathbf", "textbf"];

function docMathTokens(tex) {
  const src = String(tex == null ? "" : tex);
  const tokens = [];
  let at = 0;
  while (at < src.length) {
    const ch = src[at];
    if (/\s/.test(ch)) {
      at += 1;
      continue;
    }
    if (ch === "\\") {
      const command = /^\\([A-Za-z]+|.)/.exec(src.slice(at));
      if (!command) break;
      at += command[0].length;
      const name = command[1];
      if (DOC_MATH_RAW_COMMANDS.includes(name) && src[at] === "{") {
        let depth = 1;
        let end = at + 1;
        while (end < src.length && depth > 0) {
          if (src[end] === "{") depth += 1;
          else if (src[end] === "}") depth -= 1;
          if (depth > 0) end += 1;
        }
        tokens.push({ kind: "text", value: src.slice(at + 1, end), bold: name === "mathbf" || name === "textbf" });
        at = end + 1;
        continue;
      }
      tokens.push({ kind: "cmd", value: name });
      continue;
    }
    const number = /^[0-9]+(?:\.[0-9]+)?/.exec(src.slice(at));
    if (number) {
      tokens.push({ kind: "num", value: number[0] });
      at += number[0].length;
      continue;
    }
    if (/[A-Za-z]/.test(ch)) {
      tokens.push({ kind: "id", value: ch });
      at += 1;
      continue;
    }
    if (ch === "{" || ch === "}" || ch === "^" || ch === "_") {
      tokens.push({ kind: ch });
      at += 1;
      continue;
    }
    tokens.push({ kind: "op", value: ch });
    at += 1;
  }
  return tokens;
}

function docMathRow(kids) {
  return kids.length === 1 ? kids[0] : { tag: "mrow", kids };
}

//: One argument: a braced group, or the single token after the command.
function docMathArgument(tokens, state) {
  const token = tokens[state.at];
  if (!token) return { tag: "mrow", kids: [] };
  if (token.kind === "{") {
    state.at += 1;
    return docMathRow(docMathNodes(tokens, state));
  }
  state.at += 1;
  return docMathToken(token, tokens, state);
}

function docMathToken(token, tokens, state) {
  if (token.kind === "num") return { tag: "mn", text: token.value };
  if (token.kind === "id") return { tag: "mi", text: token.value };
  if (token.kind === "text") {
    //: `mathvariant`, never a `style` attribute: this app's CSP refuses inline
    //: styles, so a bold done that way would be a silent no-op.
    return token.bold
      ? { tag: "mtext", attrs: { mathvariant: "bold" }, text: token.value }
      : { tag: "mtext", text: token.value };
  }
  if (token.kind === "cmd") return docMathCommand(token.value, tokens, state);
  return { tag: "mo", text: token.value };
}

function docMathCommand(name, tokens, state) {
  if (name === "frac" || name === "dfrac" || name === "tfrac") {
    const top = docMathArgument(tokens, state);
    const bottom = docMathArgument(tokens, state);
    return { tag: "mfrac", kids: [top, bottom] };
  }
  if (name === "sqrt") {
    //: `\sqrt[3]{x}`: the index is in brackets, which the tokeniser has no
    //: special case for, so it arrives as the operators `[` and `]`.
    if (tokens[state.at] && tokens[state.at].kind === "op" && tokens[state.at].value === "[") {
      state.at += 1;
      const index = [];
      while (
        state.at < tokens.length &&
        !(tokens[state.at].kind === "op" && tokens[state.at].value === "]")
      ) {
        const token = tokens[state.at];
        state.at += 1;
        index.push(docMathToken(token, tokens, state));
      }
      if (state.at < tokens.length) state.at += 1;
      return { tag: "mroot", kids: [docMathArgument(tokens, state), docMathRow(index)] };
    }
    return { tag: "msqrt", kids: [docMathArgument(tokens, state)] };
  }
  if (name === "left" || name === "right") {
    //: The delimiter that follows carries the meaning; the sizing command
    //: itself is MathML's job rather than the author's.
    const next = tokens[state.at];
    if (!next) return { tag: "mrow", kids: [] };
    state.at += 1;
    if (next.kind === "cmd" && next.value === ".") return { tag: "mrow", kids: [] };
    return { tag: "mo", text: next.value || "" };
  }
  if (DOC_MATH_LETTERS[name]) return { tag: "mi", text: DOC_MATH_LETTERS[name] };
  if (DOC_MATH_OPERATORS[name]) return { tag: "mo", text: DOC_MATH_OPERATORS[name] };
  if (DOC_MATH_FUNCTIONS.includes(name)) return { tag: "mi", attrs: { mathvariant: "normal" }, text: name };
  if (name === "{" || name === "}" || name === "|") return { tag: "mo", text: name };
  //: Anything unknown comes back as what was typed. A formula that is nine
  //: tenths understood should render nine tenths of the way, not fail.
  return { tag: "mi", text: name };
}

function docMathNodes(tokens, state) {
  const kids = [];
  while (state.at < tokens.length) {
    const token = tokens[state.at];
    if (token.kind === "}") {
      state.at += 1;
      break;
    }
    if (token.kind === "{") {
      state.at += 1;
      kids.push(docMathRow(docMathNodes(tokens, state)));
      continue;
    }
    if (token.kind === "^" || token.kind === "_") {
      state.at += 1;
      const base = kids.pop() || { tag: "mrow", kids: [] };
      const script = docMathArgument(tokens, state);
      const up = token.kind === "^";
      //: `x_i^2` is one element with two scripts, not a superscript on a
      //: subscript: written as the second it prints the 2 above the i.
      if (base.tag === "msub" && up) {
        kids.push({ tag: "msubsup", kids: [base.kids[0], base.kids[1], script] });
      } else if (base.tag === "msup" && !up) {
        kids.push({ tag: "msubsup", kids: [base.kids[0], script, base.kids[1]] });
      } else {
        kids.push({ tag: up ? "msup" : "msub", kids: [base, script] });
      }
      continue;
    }
    state.at += 1;
    kids.push(docMathToken(token, tokens, state));
  }
  return kids;
}

//: The whole of the public surface: TeX in, a MathML tree out, as plain
//: objects so this can be tested without a browser and built with
//: `createElementNS` in one.
function docMathTree(tex, display = false) {
  const kids = docMathNodes(docMathTokens(tex), { at: 0 });
  return {
    tag: "math",
    attrs: { display: display ? "block" : "inline" },
    kids: [docMathRow(kids.length ? kids : [{ tag: "mtext", text: "" }])],
  };
}

//: **What counts as math and what is a price.** `$` is a currency sign far
//: more often than it is a delimiter in a notebook, so the rule is the one
//: Obsidian and Typora use, plus one guard of this app's own: no space just
//: inside either delimiter (which is what excludes "$5 and $10"), and the
//: content has to contain something mathematical rather than being a bare
//: number with an operator stuck to it (which is what excludes "$5-$10").
const DOC_MATH_MEANINGFUL = /[A-Za-z\\^_=+]/;

function docMathLooksLikeMath(body) {
  const text = String(body == null ? "" : body);
  if (!text || /^\s/.test(text) || /\s$/.test(text)) return false;
  return DOC_MATH_MEANINGFUL.test(text);
}

// DOC-MATH-END

//: The tree as elements. MathML is its own namespace: built with
//: `createElement` the tags are unknown HTML elements, which render as their
//: own text content in a straight line and look exactly like a renderer that
//: half-works.
const DOC_MATHML_NS = "http://www.w3.org/1998/Math/MathML";

function docMathElement(node) {
  const el = document.createElementNS(DOC_MATHML_NS, node.tag);
  for (const [name, value] of Object.entries(node.attrs || {})) el.setAttribute(name, value);
  if (node.text != null) el.textContent = node.text;
  for (const kid of node.kids || []) el.appendChild(docMathElement(kid));
  return el;
}

function docMathRender(tex, display = false) {
  return docMathElement(docMathTree(tex, display));
}

//: The compartment decision 3 names: Live is this editor with the markdown
//: decorations on, Source is the same editor with them off. Nothing else
//: differs between the two views, which is the whole point.
function docSetLiveDecorations(on) {
  const CM = window.CM6;
  if (!docCmView || !CM || !docCmParts.live) return;
  docCmView.dispatch({
    effects: docCmParts.live.reconfigure(on ? docLiveExtensions(CM) : []),
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
      //: `![A river|400|center](/media/river.jpg)`: the options ride in the alt
      //: text, which is the form that survives being opened somewhere else.
      this.options = docImageOptionsFromAlt(alt);
    }
    eq(other) {
      return other.src === this.src && other.alt === this.alt;
    }
    toDOM() {
      const img = document.createElement("img");
      img.className = "cm-md-image";
      //: **Through `mediaSrc`, like every other image in this app.** An
      //: `<img>` cannot send a header, so `/media/…` and `/files/…` carry the
      //: unlock token as a query parameter; this widget set the raw path and
      //: every image in Live view answered 401, which the app's own missing
      //: media handler then drew as "no longer in this notebook" over a file
      //: that was still there. Measured against this branch before the fix:
      //: two console 401s per image, `naturalWidth` 0 in Live and 1 in the
      //: rendered pane beside it, which is the same file through the two
      //: paths. The embed path below already did this; this one never did.
      img.src = typeof mediaSrc === "function" ? mediaSrc(this.src) : this.src;
      img.alt = this.options.caption || this.options.name || "";
      return docApplyImageOptions(img, this.options);
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
  //: The capture is the whole `[!kind]`, so the marker can be hidden the way
  //: every other marker here is; the group inside it names the kind.
  const CALLOUT = /^>\s*(\[!([A-Za-z]+)\][-+]?)/;
  //: How deep a list item is indented before the indent stops growing. Past
  //: four levels the number is more useful as "this is deep" than as a count,
  //: and an indent that kept growing would push a badly nested line off the
  //: measure the whole document is set in.
  const LIST_DEPTH_MAX = 4;

  //: **A bullet's dash, drawn as a bullet while the caret is elsewhere.** The
  //: last piece of raw markdown left in a rendered list: `-`, `*` and `+` all
  //: mean the same thing and a reader has no use for knowing which was typed.
  //:
  //: Safe to replace here where hiding a `**` is not, and the difference is
  //: length: this is one character standing in for one character, at the
  //: start of a line, so nothing after it moves by more than the difference
  //: between two glyph widths, and the caret cannot be inside it (the line is
  //: not replaced while it is touched). `ignoreEvent` returns false for the
  //: reason the callout label's does: a click on the bullet is a click into
  //: the line behind it.
  class DocBulletWidget extends WidgetType {
    eq() {
      return true;
    }
    ignoreEvent() {
      return false;
    }
    toDOM() {
      const dot = document.createElement("span");
      dot.className = "cm-md-li-mark cm-md-li-bullet";
      dot.textContent = "\u2022";
      return dot;
    }
  }

  //: **A callout says which kind it is, in words, where its marker was.**
  //: Measured before this: with the caret away from the line, `> [!note] a
  //: callout` rendered as `[!note] a callout` on a tinted, accent-barred line.
  //: The `>` went, as it should, and the `[!note]` stayed, which is the one
  //: thing on the line that is pure markdown syntax. The owner's sentence is
  //: about exactly that: "md formatting should go invisible unless i click
  //: back on that word or section". Hiding it outright would leave a note and
  //: a warning looking identical apart from a border colour, so the marker is
  //: replaced by the label the rest of the app already uses for that kind
  //: (`CALLOUT_KINDS` in editor.js, the same table `calloutTemplate` writes
  //: from), which is what Obsidian shows in the same place.
  class DocCalloutWidget extends WidgetType {
    constructor(kind, fold) {
      super();
      this.kind = kind;
      //: `null` when the callout is not a toggle at all, otherwise the line it
      //: starts on and whether it is currently folded.
      this.fold = fold;
    }
    eq(other) {
      return (
        other.kind === this.kind &&
        !!other.fold === !!this.fold &&
        (!this.fold || (other.fold.at === this.fold.at && other.fold.closed === this.fold.closed))
      );
    }
    ignoreEvent() {
      //: A click on the label is a click into the line behind it: the widget
      //: is a rendering of text that is really there, and swallowing the
      //: event would make the one spot on the line you cannot put a caret in.
      return false;
    }
    toDOM() {
      const meta =
        (typeof CALLOUT_KINDS === "object" && CALLOUT_KINDS[this.kind]) || null;
      const chip = document.createElement("span");
      chip.className = `cm-md-callout-label cm-md-callout-label-${this.kind}`;
      chip.textContent = meta ? `${meta.icon} ${meta.label}` : this.kind;
      //: **A callout written `[!note]-` or `[!note]+` is a toggle**, which is
      //: the syntax Obsidian uses and the "toggles" half of Phase 3 item 2.
      //: The marker is the *initial* state and clicking does not rewrite it,
      //: which is also Obsidian's behaviour and the right one: folding a
      //: section to read past it is not an edit to the document, and a
      //: notebook whose files change every time somebody collapses something
      //: has no clean diffs left.
      if (this.fold) {
        const chevron = document.createElement("span");
        chevron.className = "cm-md-callout-fold";
        chevron.textContent = this.fold.closed ? "\u25B8" : "\u25BE";
        chip.dataset.docCalloutFold = String(this.fold.at);
        chip.title = this.fold.closed ? "Show what is inside" : "Fold this away";
        chip.append(" ", chevron);
      }
      return chip;
    }
  }

  //: **A table cell that is empty still has to hold its column open.** The
  //: rendered table is a CSS grid over the line, and its columns are its
  //: children: a cell with no characters in it contributes no child, so the
  //: row silently loses a column and every cell after it slides left. One
  //: empty span, carrying the cell's own classes, is the whole fix.
  class DocTableCellWidget extends WidgetType {
    constructor(cls) {
      super();
      this.cls = cls;
    }
    eq(other) {
      return other.cls === this.cls;
    }
    ignoreEvent() {
      return false;
    }
    toDOM() {
      const cell = document.createElement("span");
      cell.className = this.cls;
      cell.contentEditable = "false";
      return cell;
    }
  }

  //: The cell menu, on the table the caret is in. Rebuilt when the caret
  //: changes cell (`eq` on the key) because two of its rows are unavailable
  //: in the header and in a one-column table, and a menu that says a row can
  //: be deleted when it cannot is worse than no menu.
  class DocTableMenuWidget extends WidgetType {
    constructor(key, context) {
      super();
      this.key = key;
      this.context = context;
    }
    eq(other) {
      return other.key === this.key;
    }
    //: The menu is a control, not text: CodeMirror must not try to put a
    //: caret inside it or read a selection out of it.
    ignoreEvent() {
      return true;
    }
    //: **And it must not read the menu's own DOM work as the document
    //: changing under it** (INBOX 290). `openActionMenu` shows the popup,
    //: measures it and, when it would be clipped, reparents it to `<body>`;
    //: every one of those is a mutation inside this widget, and a widget that
    //: does not claim its mutations makes CodeMirror re-read the content DOM,
    //: which rebuilt the view and blurred the editor. Measured before the fix:
    //: after one press, `.cm-editor.cm-focused` was gone, the widget was
    //: unmounted, and the menu was left standing under the header row with no
    //: opener, which is both halves of the report ("another row appears below
    //: it", "I cant click the meatball button").
    ignoreMutation() {
      return true;
    }
    //: A menu whose opener is being removed has to close with it, or it is
    //: left floating over the document.
    destroy(dom) {
      if (dom && dom.querySelector(".action-menu:not(.hidden)") && typeof closeActionMenus === "function") {
        closeActionMenus();
      }
    }
    toDOM() {
      const wrap = docTableMenu(this.context);
      wrap.classList.add("cm-md-table-menu");
      return wrap;
    }
  }

  //: **A remark is a pin, not a span of purple text** (Phase 5 item 1). The
  //: `%%…%%` hides like every other marker and a small control takes its place,
  //: because a comment has to be *visible* in the document without being *read*
  //: in it: that is the whole difference between a margin note and the prose.
  //: Pressing it opens the Comments panel at that remark rather than a popover
  //: over the sentence, which is DESIGN.md's one-surface-at-a-time rule and the
  //: decision DOCUMENTS_PLAN 12 D3 made for the writing panel.
  class DocCommentWidget extends WidgetType {
    constructor(body, at) {
      super();
      this.body = body;
      this.at = at;
    }
    eq(other) {
      return other.body === this.body && other.at === this.at;
    }
    //: A control, not text: CodeMirror must not put a caret inside it.
    ignoreEvent() {
      return true;
    }
    toDOM() {
      const pin = document.createElement("button");
      pin.type = "button";
      pin.className = "doc-comment-pin";
      pin.title = this.body;
      pin.setAttribute("aria-label", `Comment: ${this.body}`);
      const icon = document.createElement("i");
      icon.className = "ph ph-chat-teardrop-text";
      icon.setAttribute("aria-hidden", "true");
      pin.appendChild(icon);
      const at = this.at;
      pin.addEventListener("click", (event) => {
        event.preventDefault();
        docShowComment(at);
      });
      return pin;
    }
  }

  //: **Math, rendered where it was written.** The renderer is the MathML one
  //: at the top of this file, so what Live draws and what an export would draw
  //: come from one place. The widget replaces the `$…$` only while the caret
  //: is off its line, which is the rule every other marker here follows: the
  //: way to edit a formula is to put the caret in it and see the TeX again.
  class DocMathWidget extends WidgetType {
    constructor(tex, display) {
      super();
      this.tex = tex;
      this.display = display;
    }
    eq(other) {
      return other.tex === this.tex && other.display === this.display;
    }
    ignoreEvent() {
      return false;
    }
    toDOM() {
      const host = document.createElement("span");
      host.className = this.display ? "cm-md-math cm-md-math-block" : "cm-md-math";
      host.appendChild(docMathRender(this.tex, this.display));
      return host;
    }
  }

  //: **`![[name]]` draws the thing itself.** The card comes from whichever
  //: renderer already owns that kind (`docEmbedNode`); this only decides where
  //: it goes and when. `ignoreEvent` is true because the cards carry their own
  //: controls: a file tile has Open and Save on it, and CodeMirror treating
  //: those clicks as clicks into the text would put a caret in the middle of
  //: a button.
  class DocEmbedWidget extends WidgetType {
    //: The whole `name|300|center|caption` spec, not just the name: the name
    //: is what resolves to a thing and the options are how it is drawn, and
    //: keeping them together is what lets `eq` say "this is the same embed"
    //: about two widgets that differ only in their width.
    constructor(spec) {
      super();
      this.spec = spec;
      this.options = docImageOptions(spec);
      this.name = this.options.name;
    }
    eq(other) {
      return other.spec === this.spec;
    }
    ignoreEvent() {
      return true;
    }
    toDOM() {
      const host = document.createElement("span");
      host.className = "cm-md-embed";
      host.dataset.docEmbed = this.name;
      docEmbedFill(host, this.name, this.options);
      //: The card opens its target, except where the card already has a
      //: control of its own under the pointer.
      host.addEventListener("click", (event) => {
        if (event.target instanceof Element && event.target.closest("button, a, input")) return;
        docOpenWikiTarget(this.name);
      });
      return host;
    }
  }

  function build(view) {
    const state = view.state;
    const doc = state.doc;
    const sel = state.selection.main;
    const ranges = [];
    //: **Nothing is revealed while the editor is not focused.** A selection
    //: exists whether or not anyone is in the editor, and a document just
    //: opened has one at offset 0, which is almost always the title heading:
    //: so every document opened with the rendered view on showed its first
    //: line's "#" before the reader had touched anything. The owner's
    //: sentence is "md formatting should go invisible unless i click back on
    //: that word or section", and an untouched document is the one case where
    //: nobody has clicked on anything at all.
    const focused = view.hasFocus;
    const touched = (from, to) => focused && sel.from <= to && sel.to >= from;
    const lineTouched = (pos) => {
      const line = doc.lineAt(pos);
      return touched(line.from, line.to);
    };
    //: **A marker reveals when the caret is on its line, not when it is inside
    //: its range**, and this is the fix for a measured defect rather than a
    //: preference.
    //:
    //: Revealing per range put four characters on screen immediately to the
    //: left of the caret at the moment it crossed the range's edge, so the
    //: caret moved *right* on a leftward keystroke. Measured with
    //: `coordsAtPos` walking left through `A **bold** word here.`: x 560.3,
    //: 554, 544.2, 531.1, and then **559.5** on the press that revealed the
    //: markers, a 28.4px jump backwards. The document position was never
    //: wrong (11 then 10, exactly one character); what moved was the text
    //: under it.
    //:
    //: `EditorView.atomicRanges` is the usual answer to a caret and a hidden
    //: range, and it is the wrong one here: it makes the arrow keys step
    //: *over* the marker without revealing it, and the owner's sentence is
    //: precisely about being able to "navigate with backspace, delete or
    //: arrow keys etc to where those formatting markers are".
    //:
    //: The line is what holds still. Horizontal movement within a line now
    //: causes no reflow at all, because the line's markers are already up the
    //: whole time the caret is on it; the one reflow left happens when the
    //: caret *arrives* on the line, which is a click or a vertical move, and
    //: both of those relocate the caret anyway so there is nothing to jar
    //: against. It is also what `HeaderMark`, `QuoteMark` and `TaskMarker`
    //: have always done here, so this makes the eight constructs agree
    //: instead of splitting them into two behaviours.
    //:
    //: Both line ends, because a range can span a soft-wrapped link.
    const rangeRevealed = (from, to) =>
      touched(doc.lineAt(from).from, doc.lineAt(to).to);
    //: Whether the line numbers are showing, read once per build rather than
    //: per fenced block: the fence rows collapse only when they are off, see
    //: the note beside `cm-md-fence-quiet` below.
    const gutterOn = docFenceGutterOn();
    const tree = syntaxTree(state);
    //: The document as one string, for the table model, and at most once per
    //: build: the model works in document offsets so it needs the whole text,
    //: and a copy per visible line would be a copy per keystroke per line.
    let sourceText = null;
    const source = () => {
      if (sourceText === null) sourceText = doc.toString();
      return sourceText;
    };
    //: A table is drawn once, from whichever of its lines the viewport reaches
    //: first.
    const tableSeen = new Set();

    //: **A replace decoration may not contain a line break, and this is not a
    //: style rule: CodeMirror throws "Decorations that replace line breaks may
    //: not be specified via plugin" and the whole view stops updating.** Every
    //: hidden marker below is one or two characters, which looks safe and is
    //: not: a markdown link's text can wrap across a soft line break, so
    //: `[some\nlabel](url)` puts a newline inside the `](url)` this hides, and
    //: an image's alt text can do the same. The failure lands on one unusual
    //: document, in a plugin nowhere near the link that caused it, which is
    //: the shape this codebase keeps recording. One guard, at the one place
    //: that pushes a replacement.
    const hide = (from, to) => {
      if (to <= from) return;
      if (doc.sliceString(from, to).includes("\n")) return;
      ranges.push(hidden.range(from, to));
    };

    for (const visible of view.visibleRanges) {
      tree.iterate({
        from: visible.from,
        to: visible.to,
        enter: (node) => {
          const name = node.name;
          //: `Setext` as well as `ATX`, and this was a real hole. A setext
          //: heading is the `Title` / `=====` form, and its underline is a
          //: `HeaderMark` like any other, so the branch below was already
          //: hiding it while this branch matched `ATXHeading` only: the
          //: underline vanished, the line got no heading class, and a setext
          //: heading rendered as ordinary body text. Found by taking an
          //: inventory of every markdown line against what it renders as,
          //: which is what `scratchpad/ui-sweeps/cm-reveal.js` now does.
          //: A setext heading spans two lines and the class belongs on the
          //: first, which `doc.lineAt(node.from)` already gives.
          const heading = /^(?:ATX|Setext)Heading([1-6])$/.exec(name);
          if (heading) {
            const line = doc.lineAt(node.from);
            ranges.push(Decoration.line({ class: `cm-md-h${heading[1]}` }).range(line.from));
            return undefined;
          }
          if (name === "HeaderMark") {
            if (lineTouched(node.from)) return false;
            let end = node.to;
            while (end < doc.length && doc.sliceString(end, end + 1) === " ") end += 1;
            hide(node.from, end);
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
          if (name === "EmphasisMark" || name === "StrikethroughMark" || name === "CodeMark" || name === "CodeInfo") {
            const parent = node.node.parent;
            if (!parent) return false;
            //: A fence's own ``` (and the language word after it) is hidden
            //: like every other mark while the caret is elsewhere: the block
            //: keeps its boundary through the `cm-md-fence` line ground, so
            //: the three backticks were the one piece of syntax the live view
            //: still showed after you clicked off a code block (INBOX 198).
            //: Back the moment the caret is inside the block, like the rest.
            if (!rangeRevealed(parent.from, parent.to)) hide(node.from, node.to);
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
            if (!rangeRevealed(node.from, node.to)) {
              hide(node.from, node.from + 1);
              hide(node.from + close, node.to);
            }
            return false;
          }
          if (name === "Image") {
            const text = doc.sliceString(node.from, node.to);
            const close = text.lastIndexOf("](");
            if (close <= 1) return false;
            const src = sameOrigin(text.slice(close + 2, text.length - 1));
            if (!src || rangeRevealed(node.from, node.to)) return false;
            //: Same rule as `hide`: an image whose alt text wraps would put a
            //: line break inside the range this widget replaces.
            if (text.includes("\n")) return false;
            ranges.push(
              Decoration.replace({
                widget: new DocImageWidget(src, text.slice(2, close)),
              }).range(node.from, node.to)
            );
            return false;
          }
          //: **A bare address and an `<address>` are links too** (INBOX 392's
          //: inventory, `scratchpad/ui-sweeps/doclivemd.js`). The GitHub
          //: dialect parses both, as a `URL` on its own and as an `Autolink`
          //: holding one, and the view drew neither: a pasted address was
          //: plain text you could not open, and `<https://…>` kept its
          //: brackets. Both now wear the link chip and open on Ctrl+click
          //: through the same `data-doc-href` a `[text](url)` link uses. A
          //: `URL` inside a `Link` or an `Image` never reaches here: those
          //: two branches return false and the walk skips their children.
          if (name === "Autolink") {
            const url = node.node.getChild("URL");
            if (!url) return false;
            const href = doc.sliceString(url.from, url.to);
            ranges.push(
              Decoration.mark({
                class: "cm-md-link",
                attributes: { "data-doc-href": href, title: `Ctrl+click to open ${href}` },
              }).range(url.from, url.to)
            );
            if (!rangeRevealed(node.from, node.to)) {
              hide(node.from, url.from);
              hide(url.to, node.to);
            }
            return false;
          }
          if (name === "URL") {
            const href = doc.sliceString(node.from, node.to);
            ranges.push(
              Decoration.mark({
                class: "cm-md-link",
                attributes: { "data-doc-href": href, title: `Ctrl+click to open ${href}` },
              }).range(node.from, node.to)
            );
            return false;
          }
          //: `\*` is how a writer says "a star, not emphasis", and the
          //: backslash is syntax like every other marker here: hidden while
          //: the caret is elsewhere, back when it is on the line.
          if (name === "Escape") {
            if (!lineTouched(node.from)) hide(node.from, node.from + 1);
            return false;
          }
          if (name === "TaskMarker") {
            const marker = doc.sliceString(node.from, node.to);
            //: **A finished task reads as finished**, struck through in the
            //: muted ink, which is what every task list the plan compares
            //: against does and what the rendered view now does too
            //: (09-editor.css). Drawn whether or not the caret is on the
            //: line: the `[x]` coming back is a reveal, the item being done
            //: is a fact about it.
            if (/[xX]/.test(marker)) {
              const task = node.node.parent;
              const end = Math.min(task ? task.to : node.to, doc.lineAt(node.from).to);
              if (end > node.to) {
                ranges.push(Decoration.mark({ class: "cm-md-task-done" }).range(node.to, end));
              }
            }
            if (lineTouched(node.from)) return false;
            ranges.push(
              Decoration.replace({
                widget: new DocTaskWidget(/[xX]/.test(marker), node.from, node.to),
              }).range(node.from, node.to)
            );
            return false;
          }
          //: **Lists, which the live view drew as plain text.** Measured
          //: against the same document's own paragraph: a `- First bullet`
          //: line had the same left edge, the same 0 indent and the same 0
          //: padding as a paragraph, and a nested `  - Nested bullet` was
          //: drawn at that same left edge too, so nesting was invisible and a
          //: wrapped item ran back under its own marker. The single most
          //: common construct in markdown was the one this view did nothing
          //: for (INBOX 262: "the rendering on the live view of the documents
          //: needs a lot of improvement").
          //:
          //: **A hanging indent rather than a hidden marker**, and that is
          //: the decision this file's long note beside `rangeRevealed`
          //: argues: taking characters out from under the caret moves the
          //: text the caret is in, which is the reflow bug measured at 28.4px
          //: backwards on a leftward keystroke. The marker stays where it is
          //: and the line is indented around it, so nothing under the caret
          //: moves at any time, and a wrapped line aligns under its own text
          //: the way a list reads on paper.
          //:
          //: The depth is the item's own indentation in the document, in
          //: units of two spaces (the width a tab is drawn at here), capped:
          //: past four levels the indent is more useful as a signal that it
          //: is deep than as an accurate count, and an uncapped one would
          //: push a badly nested line off the measure.
          if (name === "ListItem") {
            const line = doc.lineAt(node.from);
            const lead = /^[ \t]*/.exec(line.text)[0];
            const depth = Math.min(
              LIST_DEPTH_MAX,
              Math.floor(lead.replace(/\t/g, "  ").length / 2)
            );
            //: Every line the item occupies, so a two-line bullet keeps its
            //: indent on the continuation as well as on the marker row. The
            //: same walk the blockquote below does, for the same reason.
            for (let at = node.from; at <= node.to; ) {
              const row = doc.lineAt(at);
              ranges.push(
                Decoration.line({ class: `cm-md-li cm-md-li-${depth}` }).range(row.from)
              );
              if (row.to >= node.to) break;
              at = row.to + 1;
            }
            //: The marker itself, dimmed to the muted ink so the eye reads
            //: the words and not the punctuation, and left in place so it can
            //: still be selected, deleted and typed over. Ordered and
            //: unordered take the same class: an editor that draws "1." in
            //: one colour and "-" in another is saying they are different
            //: kinds of thing, and they are not.
            const mark = /^[ \t]*([-*+]|\d+[.)])(?=\s)/.exec(line.text);
            if (mark) {
              const from = line.from + mark[0].length - mark[1].length;
              const to = from + mark[1].length;
              //: A number carries information ("this is item 3") and stays as
              //: it was typed; a dash does not, and becomes a bullet while
              //: the caret is elsewhere. Both keep the muted ink.
              if (/^[-*+]$/.test(mark[1]) && !touched(line.from, line.to)) {
                ranges.push(
                  Decoration.replace({ widget: new DocBulletWidget() }).range(from, to)
                );
              } else {
                ranges.push(Decoration.mark({ class: "cm-md-li-mark" }).range(from, to));
              }
            }
            return undefined;
          }
          if (name === "Blockquote") {
            const first = doc.lineAt(node.from);
            const callout = CALLOUT.exec(first.text);
            const kind = callout ? callout[2].toLowerCase() : null;
            const cls = kind ? `cm-md-callout cm-md-callout-${kind}` : "cm-md-quote";
            for (let at = node.from; at <= node.to; ) {
              const line = doc.lineAt(at);
              ranges.push(Decoration.line({ class: cls }).range(line.from));
              if (line.to >= node.to) break;
              at = line.to + 1;
            }
            //: The `[!kind]` marker, on the callout's first line only, swapped
            //: for the kind's own label while the caret is elsewhere. Offsets
            //: come from the match rather than from a second search, so a body
            //: line that happens to contain `[!note]` cannot be hit.
            if (kind && !rangeRevealed(first.from, first.to)) {
              const from = first.from + first.text.indexOf(callout[1]);
              const to = from + callout[1].length;
              let end = to;
              //: The space after the marker goes with it, exactly as the
              //: heading and quote marks take theirs: leaving it would indent
              //: the label's line by one space against every other line.
              while (end < doc.length && doc.sliceString(end, end + 1) === " ") end += 1;
                if (!doc.sliceString(from, end).includes("\n")) {
                //: A toggle only where the marker says so, and its chevron
                //: pointing the way the view actually is rather than the way
                //: the marker asked for on open.
                const toggle = /[-+]$/.test(callout[1])
                  ? { at: first.from, closed: docCalloutFolded(state, first) }
                  : null;
                ranges.push(
                  Decoration.replace({ widget: new DocCalloutWidget(kind, toggle) }).range(from, end)
                );
              }
            }
            return undefined;
          }
          if (name === "QuoteMark") {
            const line = doc.lineAt(node.from);
            if (touched(line.from, line.to)) return false;
            let end = node.to;
            while (end < doc.length && doc.sliceString(end, end + 1) === " ") end += 1;
            hide(node.from, end);
            return false;
          }
          if (name === "FencedCode") {
            //: **The two fence lines are the block's padding, not two rows of
            //: it.** Reported with a screenshot: "the md rendering on the live
            //: view ... especially for codeblocks", a fenced block drawn as a
            //: dark slab with an empty numbered row above and below the code.
            //:
            //: Measured on a four-line Python block: five rows of 26px each,
            //: two of them empty, so 52 of 130 pixels of the block said
            //: nothing. That is INBOX 198's doing and INBOX 198 was right: the
            //: backticks and the language word are syntax, and syntax is what
            //: this view hides. What it did not do was give the now-empty
            //: lines a height to match what was left on them, which is
            //: nothing.
            //:
            //: So they keep the tint, since they are part of the block, and
            //: shrink to the padding a code block would have had anyway. The
            //: language goes on the opening line as an attribute the theme
            //: draws in the corner: outside the text flow, so it takes no row,
            //: and it is the one thing the hidden `” ```python ”` was still
            //: telling you.
            const first = doc.lineAt(node.from);
            const last = doc.lineAt(node.to);
            const info = node.node.getChild("CodeInfo");
            const language = info ? doc.sliceString(info.from, info.to).trim() : "";
            //: With the caret inside the block the real `” ```python ”` is back
            //: on screen (the `CodeMark`/`CodeInfo` branch above stops hiding
            //: it), so both of the things below have to stand down with it: a
            //: half-height row would clip the text that just came back, and
            //: the corner label would be saying the language a second time
            //: right next to where it is now written out.
            const revealed = rangeRevealed(node.from, node.to);
            for (let at = node.from; at <= node.to; ) {
              const line = doc.lineAt(at);
              const edge =
                line.from === first.from
                  ? "cm-md-fence-open"
                  : line.from === last.from
                  ? "cm-md-fence-close"
                  : "";
              //: The rounded corners are the block's shape and stay whatever
              //: the caret is doing; only the height and the label are tied to
              //: whether the row has text on it.
              //:
              //: **And to whether the line numbers are on** (INBOX 262). A
              //: gutter draws one element per line at that line's own height
              //: while the number inside keeps the editor's line-height, so a
              //: row collapsed to half a line leaves its digit standing 26px
              //: tall in an 8px box. Measured with the gutter on: "6 paints
              //: 18px into 7" and "8 paints 18px into 9", the pair in the
              //: report's screenshot. One row, one number, in line with the
              //: text it counts is the contract the gutter makes, so where
              //: the two disagree the gutter wins and the fence keeps its
              //: row.
              const quiet = edge && !revealed && !gutterOn ? " cm-md-fence-quiet" : "";
              ranges.push(
                Decoration.line({
                  class: `cm-md-fence${edge ? ` ${edge}` : ""}${quiet}`,
                  attributes:
                    edge === "cm-md-fence-open" && language && !revealed
                      ? { "data-lang": language }
                      : undefined,
                }).range(line.from)
              );
              if (line.to >= node.to) break;
              at = line.to + 1;
            }
            return undefined;
          }
          if (name === "HorizontalRule") {
            const line = doc.lineAt(node.from);
            ranges.push(Decoration.line({ class: "cm-md-rule" }).range(line.from));
            //: **The rule's own dashes go with the rest of the markers.**
            //: Measured before this: `---` rendered as the three characters
            //: `---` on a line that also drew the border, so the divider was a
            //: line with the word for a line written on top of it. The line
            //: class is the rule; the text is the syntax that asks for one, and
            //: syntax is what this whole view hides. Hidden rather than
            //: replaced by a widget: there is nothing to say that the border
            //: does not already say.
            if (!touched(line.from, line.to)) hide(line.from, line.to);
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
      //: **The same allowlist the saved view carries** (`app.js`, the inline
      //: pattern): `==text==` is the plain yellow highlight and
      //: `==green|text==` picks one of a named set. Without the colour half
      //: here, the live view drew every highlight in one colour and left the
      //: `green|` sitting in the middle of the words as text, so the two views
      //: of the same line disagreed about both the colour and the content.
      //: The colour lands in a class name rather than an inline style, because
      //: this app's CSP rejects inline styles outright.
      scan(/==(?:(yellow|green|blue|pink|purple|orange|red|grey)\|)?([^=\n]{1,200})==/g, (match, from, to) => {
        const colour = match[1];
        ranges.push(
          Decoration.mark({
            class: colour ? `cm-md-highlight cm-md-highlight-${colour}` : "cm-md-highlight",
          }).range(from, to),
        );
        //: A highlight with a remark after it is a comment's subject, and it is
        //: drawn differently from a highlight somebody made to find their place
        //: again: the underline is what says "there is something to read about
        //: these words". The lookahead is the model's own rule (at most one
        //: space, one line) rather than a second opinion about it.
        if (/^ ?%%[^\n]*?[^%\n]%%/.test(text.slice(match.index + match[0].length))) {
          ranges.push(Decoration.mark({ class: "cm-md-commented" }).range(from, to));
        }
        if (rangeRevealed(from, to)) return;
        //: The colour prefix is syntax, so it is hidden with the marks rather
        //: than read as part of the highlighted words.
        hide(from, from + 2 + (colour ? colour.length + 1 : 0));
        hide(to - 2, to);
      });
      //: The remark itself. Revealed as its own text when the caret is on its
      //: line, which is how every marker in this view is edited.
      scan(/%%([^\n]*?)%%/g, (match, from, to) => {
        const note = match[1].trim();
        if (!note) return;
        if (rangeRevealed(from, to)) return;
        ranges.push(
          Decoration.replace({ widget: new DocCommentWidget(note, from) }).range(from, to)
        );
      });
      //: **Math.** `$$…$$` first and `$…$` second, with the ranges the first
      //: took recorded: `$$x$$` contains `$x$`, so an inline pass run on its
      //: own would draw a second widget inside the first one's range, and two
      //: replacements over one span is a decoration set that throws rather
      //: than one that looks wrong.
      //:
      //: Both are limited to a single line, and that is a property of the
      //: architecture rather than an omission: a replace decoration from a
      //: view plugin may not contain a line break (CodeMirror throws and the
      //: whole view stops updating), so a `$$` block spread over three lines
      //: stays as the text it is. Single-line `$$…$$` is what people write
      //: inside a paragraph, which is where this matters.
      const mathTaken = [];
      scan(/\$\$([^$\n]{1,400})\$\$/g, (match, from, to) => {
        if (!docMathLooksLikeMath(match[1])) return;
        mathTaken.push([from, to]);
        if (rangeRevealed(from, to)) return;
        ranges.push(
          Decoration.replace({ widget: new DocMathWidget(match[1], true) }).range(from, to)
        );
      });
      scan(/\$([^$\n]{1,300})\$/g, (match, from, to) => {
        if (mathTaken.some(([start, end]) => from >= start && to <= end)) return;
        if (!docMathLooksLikeMath(match[1])) return;
        if (rangeRevealed(from, to)) return;
        ranges.push(
          Decoration.replace({ widget: new DocMathWidget(match[1], false) }).range(from, to)
        );
      });

      //: **Footnotes**, Phase 3 item 2. Two shapes of the same thing: a
      //: reference `[^1]` in the prose and its definition `[^1]: the text` at
      //: the foot of the document. Both render as the identifier alone, raised,
      //: because the brackets and the caret are syntax like every other marker
      //: in this view; the reference is a link to its definition and the
      //: definition is not a link to anything.
      //:
      //: Scanned rather than taken from the tree because the lezer markdown
      //: grammar here has no footnote extension: `[^1]` parses as ordinary
      //: text, which is also why nothing was drawing it before this.
      scan(/\[\^([^\][\s]{1,40})\](:?)/g, (match, from, to) => {
        const line = doc.lineAt(from);
        const definition = match[2] === ":" && line.from === from;
        const idFrom = from + 2;
        const idTo = to - (definition ? 2 : 1);
        if (idTo <= idFrom) return;
        ranges.push(
          Decoration.mark({
            class: definition ? "cm-md-footnote" : "cm-md-footnote cm-md-footnote-ref",
            attributes: definition
              ? {}
              : { "data-doc-footnote": match[1], title: `Go to footnote ${match[1]}` },
          }).range(idFrom, idTo)
        );
        if (rangeRevealed(from, to)) return;
        hide(from, idFrom);
        hide(idTo, to);
      });
      //: **A block id, hidden like every other marker.** `^abc123` at the end
      //: of a line is scaffolding: it is what makes the paragraph linkable and
      //: it is not what the paragraph says. It comes back when the caret is on
      //: its line, which is the rule the whole of this view follows, so a
      //: person can see, select and delete one.
      //:
      //: The pattern is the model's `DOC_BLOCK_ID_AT_END` with `gm` on it,
      //: which is why the narrow id shape matters here and not only there:
      //: a `$` after any run of characters would have hidden the end of every
      //: line ending in a caret ("2^31", "x ^ y").
      scan(/(?:^|[ \t])\^([A-Za-z0-9][A-Za-z0-9-]{0,31})[ \t]*$/gm, (match, from, to) => {
        if (rangeRevealed(from, to)) {
          ranges.push(Decoration.mark({ class: "cm-md-blockid" }).range(from, to));
          return;
        }
        hide(from, to);
      });
      scan(/\[\[([^[\]\n]{1,120})\]\]/g, (match, from, to) => {
        const spec = match[1].trim();
        //: A link is its whole text; an embed's is `name|300|center|caption`,
        //: and only the part before the first pipe names the thing.
        const name = spec;
        //: `![[name]]` is the embed form, and the `!` is one character to the
        //: left of what this pattern matched.
        const embed = from > 0 && doc.sliceString(from - 1, from) === "!";
        if (embed && !rangeRevealed(from - 1, to)) {
          ranges.push(
            Decoration.replace({ widget: new DocEmbedWidget(spec) }).range(from - 1, to)
          );
          return;
        }
        //: **The target's own heading marker is markup here too.** Reported
        //: twice: "note links have inline md not rendered or suppressed", then
        //: "document reference links still show inline md" with a screenshot of
        //: this editor drawing `# Girl with bell` inside the link chip. The
        //: button renderers were fixed by cleaning their label
        //: (`wikiLinkLabel`, app.js); here the text is the document's own
        //: content, so nothing can be rewritten, only hidden.
        //:
        //: Which is exactly what the two lines below already do to `[[` and
        //: `]]`: they are syntax rather than words, they are concealed while
        //: the caret is elsewhere, and `rangeRevealed` gives every character
        //: back the moment you edit the link. The `# ` the `[[` picker copied
        //: out of the target note's first line is the same kind of thing, and
        //: it is the only part of a link's text that is never the note's name.
        //:
        //: The mark starts after it so the chip is drawn around the words
        //: alone; `data-doc-wiki` keeps the whole spec, because that is what
        //: the resolver matches against and every link ever written is in that
        //: form.
        const marker = /^#{1,6}[ \t]*/.exec(name);
        const markerLength = marker ? marker[0].length : 0;
        ranges.push(
          Decoration.mark({
            class: "cm-md-wiki",
            attributes: { "data-doc-wiki": name, title: `Open “${name}”` },
          }).range(from + 2 + markerLength, to - 2)
        );
        if (rangeRevealed(from, to)) return;
        hide(from, from + 2 + markerLength);
        hide(to - 2, to);
      });
    }
    //: **Tables, from the model at the top of this file rather than from the
    //: syntax tree.** The tree's `Table` nodes would be enough to *find* one,
    //: and nothing like enough to edit one: the commands need each cell's own
    //: span with its padding intact, which is exactly what the model keeps and
    //: what makes the round trip through Source byte-exact. Drawing from the
    //: same parse the commands use also means what you see and what Tab moves
    //: through can never be two different opinions about where the cells are.
    //:
    //: The rendering is a CSS grid over the line: the pipes are replaced (they
    //: are syntax, like every other marker in this view), each cell is a mark,
    //: and the line's `display: grid` makes those marks the columns. The
    //: delimiter row is the header's underline and is drawn as one until the
    //: caret arrives on it, which is the rule `---` already follows.
    for (const visible of view.visibleRanges) {
      for (let pos = visible.from; pos <= visible.to && pos <= doc.length; ) {
        const line = doc.lineAt(pos);
        pos = line.to + 1;
        if (tableSeen.has(line.number)) continue;
        tableSeen.add(line.number);
        if (!docTableRowLike(line.text)) continue;
        const table = docTableParse(source(), line.from);
        if (!table) continue;
        for (const row of table.rows) tableSeen.add(doc.lineAt(row.from).number);
        const inTable = focused && sel.from <= table.to && sel.to >= table.from;
        //: **An open menu holds its own opener on screen** (INBOX 290). The
        //: menu is drawn from `focused`, and pressing the kebab can take
        //: focus out of the editor, so without this the act of opening the
        //: menu removed the button that opened it. `aria-expanded` is set by
        //: `openActionMenu` before anything it does can move focus, so it is
        //: true by the time this recomputes. The selection is still inside
        //: the table (nothing moved it), so the menu's commands still act on
        //: the row the person left the caret in.
        const menuHeld =
          !focused &&
          sel.from <= table.to &&
          sel.to >= table.from &&
          !!view.dom.querySelector('.cm-md-table-menu [aria-expanded="true"]');
        //: **The cell being edited is marked** (INBOX 392: "it is hard to
        //: edit things like tables"). With the pipes hidden, the caret was the
        //: only thing saying which cell a keystroke would land in, and a
        //: one-pixel caret in a grid of ruled cells is easy to lose: a ring
        //: round the cell says it at a glance, and follows Tab and Shift+Tab.
        //: Only while the editor has focus, like every other reveal here.
        const activeCell = inTable ? docTableCellAt(table, sel.head) : null;
        for (let r = 0; r < table.rows.length; r += 1) {
          const row = table.rows[r];
          const rule = r === table.delim && !touched(row.from, row.to);
          if (rule) {
            ranges.push(Decoration.line({ class: "cm-md-table-rule" }).range(row.from));
            hide(row.from, row.to);
            continue;
          }
          //: The count goes on the *line* and the index on each cell: the
          //: line's own template is what makes two rows of the same table
          //: agree about where column three starts, even when one of them
          //: holds fewer cells than the header.
          const grid =
            table.columns <= DOC_TABLE_GRID_MAX
              ? ` cm-md-cols-${table.columns}`
              : " cm-md-table-wide";
          ranges.push(
            Decoration.line({
              class: (r === 0 ? "cm-md-table cm-md-table-head" : "cm-md-table") + grid,
            }).range(row.from)
          );
          const body = row.from + row.indent.length;
          hide(row.from, body);
          if (row.lead) hide(body, body + 1);
          for (let c = 0; c < row.cells.length; c += 1) {
            const span = docTableCellSpan(table, r, c);
            const align = table.aligns[c];
            const place = c < DOC_TABLE_GRID_MAX ? ` cm-md-c${c + 1}` : "";
            //: The header's last cell keeps room for the kebab that sits at
            //: its end, so a long heading wraps before it rather than under it.
            const last = r === 0 && c === row.cells.length - 1 ? " cm-md-td-last" : "";
            const active =
              activeCell && activeCell.row === r && activeCell.col === c ? " cm-md-td-active" : "";
            const cls = (align ? `cm-md-td cm-md-td-${align}` : "cm-md-td") + place + last + active;
            if (span.to > span.from) {
              ranges.push(Decoration.mark({ class: cls }).range(span.from, span.to));
            } else {
              ranges.push(Decoration.widget({ widget: new DocTableCellWidget(cls) }).range(span.from));
            }
            if (c < row.cells.length - 1) hide(span.to, span.to + 1);
          }
          if (row.trail) {
            const last = docTableCellSpan(table, r, row.cells.length - 1);
            hide(last.to, row.to);
          }
          //: The menu goes at the end of the header row, where a table's own
          //: controls sit in every editor the plan names, and is drawn out of
          //: the grid's flow by its class so it cannot become a column of its
          //: own.
          if (r === 0 && (inTable || menuHeld)) {
            const cell = docTableCellAt(table, sel.from) || { row: 0, col: 0 };
            //: The *view's* own surface, not the document's: this plugin is
            //: mounted in every note editor too (Phase 8), and a menu that
            //: edited `doc-content` from inside a note would write into
            //: whatever document happened to be open.
            const context = { surface: asSurface(view.contentDOM) || docSurface(), text: source(), table, cell };
            ranges.push(
              Decoration.widget({
                widget: new DocTableMenuWidget(`${table.from}:${cell.row}:${cell.col}:${table.columns}`, context),
                side: 1,
              }).range(row.to)
            );
          }
        }
      }
    }

    //: **The vertical rhythm** (DOCUMENTS_PLAN 17b). Measured before this
    //: (`scratchpad/ui-sweeps/docpage17.js`): every gap between two blocks was
    //: the blank line the writer typed, so a paragraph, a heading, a table and
    //: a fence were all separated by exactly one 25.6px line of nothing, the
    //: space above a section was the same as the space under it, and two
    //: blank lines drew twice the gap the rendered view draws. The source's
    //: blank line is what separates blocks, so it is the blank line that is
    //: given the gap, from one small scale of tokens:
    //:
    //: - `cm-md-gap`: between two blocks, `--space-6`;
    //: - `cm-md-gap-major` / `-minor`: above an h1 or h2 / an h3 to h6,
    //:   `--space-9` / `--space-8`, so a section starts visibly apart from
    //:   the one before it;
    //: - `cm-md-gap-tight`: under a heading, `--space-3`, so the heading
    //:   belongs to the text it introduces rather than floating between two;
    //: - `cm-md-gap-extra`: the second and later blank lines of a run, which
    //:   the rendered view collapses to one gap and so does this.
    //:
    //: **By `line-height`, never by `height`**, and this is the reason the
    //: caret does not jump. A blank line's only content is the `<br>`, so its
    //: line height *is* its height, and the caret CodeMirror draws on it is
    //: that tall: arrowing through a gap moves nothing, and the line grows to
    //: a text line only when a character is typed into it, which is a
    //: change the writer made. The one exception is an extra blank line,
    //: which is zero tall until the caret arrives on it and then takes the
    //: plain gap, because a caret with no height is a caret nobody can find.
    //:
    //: Never inside a fenced block (a blank line in code is code) or the
    //: frontmatter (hidden above), and only in the documents editor: the note
    //: editors mount this plugin too, and a note card is not a page.
    //:
    //: **And not while the line numbers are on**, the rule the quiet fence
    //: rows already follow (INBOX 262): a gutter number keeps the editor's
    //: line height whatever its line's height is, so a 16px gap left its
    //: number standing 10px into the line below (measured by `docgutter.js`,
    //: "9 paints 10px into 10"). One row, one number, in line with the text
    //: it counts is the gutter's contract, and where the two disagree the
    //: gutter wins and the blank line keeps its full row.
    if (view.dom.closest(".doc-editor") && !gutterOn) {
      const fence = (pos) => {
        for (let node = tree.resolveInner(pos, 1); node; node = node.parent) {
          if (node.name === "FencedCode") return true;
        }
        return false;
      };
      const headingLevel = (text) => {
        const atx = /^ {0,3}(#{1,6})(?:[ \t]|$)/.exec(text);
        return atx ? atx[1].length : 0;
      };
      const blank = (n) => n >= 1 && n <= doc.lines && !doc.line(n).text.trim();
      const fmEnd =
        doc.length > 3 && doc.sliceString(0, 4) === "---\n"
          ? (docFrontmatterParse(source()) || { to: -1 }).to
          : -1;
      //: The whole rendered viewport rather than the visible ranges the
      //: other passes walk: this changes line heights, and a line drawn
      //: just below the fold at a full line's height would shrink to its gap
      //: as it scrolled into view, moving the text under the reader's eye.
      {
        const first = doc.lineAt(view.viewport.from).number;
        //: One past the viewport's last line: measured, a document ending in
        //: a newline reported a viewport ending one character short of its
        //: length, so its final empty line was drawn and never given a gap.
        const last = Math.min(doc.lines, doc.lineAt(view.viewport.to).number + 1);
        for (let n = first; n <= last; n += 1) {
          if (!blank(n)) continue;
          const line = doc.line(n);
          if (line.from <= fmEnd || fence(line.from)) continue;
          let cls = "cm-md-gap";
          if (blank(n - 1)) {
            if (!touched(line.from, line.to)) cls = "cm-md-gap cm-md-gap-extra";
          } else {
            let next = n + 1;
            while (blank(next)) next += 1;
            const below = next <= doc.lines ? headingLevel(doc.line(next).text) : 0;
            const above = n > 1 ? doc.line(n - 1).text : "";
            //: A setext heading's underline is the line above a gap under
            //: a heading just as surely as a `#` line is.
            const underHeading =
              headingLevel(above) ||
              (/^ {0,3}=+[ \t]*$/.test(above) && n > 2 && !blank(n - 2));
            if (below === 1 || below === 2) cls = "cm-md-gap cm-md-gap-major";
            else if (below) cls = "cm-md-gap cm-md-gap-minor";
            else if (underHeading) cls = "cm-md-gap cm-md-gap-tight";
          }
          ranges.push(Decoration.line({ class: cls }).range(line.from));
        }
      }
    }

    //: **Properties.** The block is hidden in Live and drawn as the panel
    //: above the editor (`renderDocProperties`), which is the only shape
    //: available: a `Decoration.replace` from a plugin may not contain a line
    //: break, and frontmatter is three lines at the very least. So each line
    //: hides on its own, the way a table's delimiter row does, and a line the
    //: caret is on comes back to full height like every other marker in this
    //: view.
    //:
    //: **Only the lines that are actually in the viewport.** A plugin may not
    //: change the height of a line outside it, which is the same rule the
    //: table loop above follows; the block is at the top of the document, so
    //: in practice this is "unless you have scrolled past it".
    if (doc.length > 3 && doc.sliceString(0, 4) === "---\n") {
      const fm = docFrontmatterParse(source());
      if (fm) {
        const lastLine = fm.closeLine + 1;
        //: Its own set, not the table loop's: that one marks every line it has
        //: looked at, which by this point is every visible line in the
        //: document, and sharing it hid nothing at all (measured: five
        //: frontmatter lines, none marked).
        const seen = new Set();
        for (const visible of view.visibleRanges) {
          if (visible.from > fm.to) continue;
          const first = doc.lineAt(Math.max(0, visible.from)).number;
          const last = doc.lineAt(Math.min(fm.to, Math.max(0, visible.to))).number;
          for (let n = Math.max(1, first); n <= Math.min(lastLine, last); n += 1) {
            if (seen.has(n)) continue;
            seen.add(n);
            const line = doc.line(n);
            if (touched(line.from, line.to)) continue;
            ranges.push(Decoration.line({ class: "cm-md-frontmatter" }).range(line.from));
            hide(line.from, line.to);
          }
        }
      }
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
        this.gutterOn = docFenceGutterOn();
      }
      update(update) {
        //: Selection as well as document and viewport: the whole idea of this
        //: view is that markers appear when the caret enters what they mark,
        //: so a caret move is a repaint. Focus too, since the markers are
        //: down entirely while the editor is not focused (`focused` in
        //: `build`): without this the reveal would wait for the first caret
        //: move after a click rather than happening on the click.
        //:
        //: And the line numbers, because one decoration reads them
        //: (`cm-md-fence-quiet`, whose note in the theme says why). Toggling
        //: them reaches the engine as a compartment reconfigure, which is an
        //: update with none of the four flags above set, so without this the
        //: fence rows kept whichever shape they were built with and the
        //: collision came back the moment the numbers went on. Compared as a
        //: value rather than sniffed out of `update.transactions`: the
        //: preference is what the decoration actually depends on, and a
        //: reconfigure that does not change it should not cost a rebuild.
        const gutterOn = docFenceGutterOn();
        if (update.docChanged || update.viewportChanged || update.selectionSet
            || update.focusChanged || gutterOn !== this.gutterOn) {
          this.gutterOn = gutterOn;
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
            event.stopPropagation();
            //: Through the same resolution the preview's own chips use, so a
            //: name that resolves in one view resolves in the other.
            docOpenWikiTarget(wiki.dataset.docWiki);
            return true;
          }
          const fold = target.closest("[data-doc-callout-fold]");
          if (fold) {
            event.preventDefault();
            event.stopPropagation();
            docToggleCalloutFold(Number(fold.dataset.docCalloutFold));
            return true;
          }
          const note = target.closest("[data-doc-footnote]");
          if (note) {
            event.preventDefault();
            event.stopPropagation();
            docGoToFootnote(note.dataset.docFootnote);
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

// -----------------------------------------------------------------------------
// Columns in Live: a block widget from a StateField
// -----------------------------------------------------------------------------
//
// **Why a StateField and not the view plugin every other construct here uses.**
// A columns block spans lines by definition, and a `Decoration.replace` that
// contains a line break may not come from a plugin: CodeMirror throws
// "Decorations that replace line breaks may not be specified via plugin" and
// the whole view stops updating. A state field may provide one, which is
// exactly the escape hatch the library documents for block widgets, and this
// is the one construct in this editor that needs it.
//
// **The block is replaced only while the caret is outside it.** Inside, the
// fences and the two columns are the plain text you typed and every other
// decoration in Live applies to them as usual; that is the same "reveal what
// you are in" rule the rest of this view follows, one block wide instead of
// one line wide. Clicking a rendered column puts the caret at the top of that
// column, and ArrowDown/ArrowUp into the block step inside it rather than over
// it (`docColumnsArrowKeymap`), because a block you can only reach with a
// mouse is a block a keyboard user cannot edit.
let docColumnsFieldCache = null;

function docColumnsField(CM) {
  if (docColumnsFieldCache) return docColumnsFieldCache;
  const { StateField } = CM.state;
  const { Decoration, EditorView, WidgetType } = CM.view;

  class DocColumnsWidget extends WidgetType {
    constructor(source, from) {
      super();
      this.source = source;
      this.from = from;
    }
    eq(other) {
      return other.source === this.source && other.from === this.from;
    }
    //: The widget's own DOM handles its clicks; everything else (a drag that
    //: started outside it, a wheel) belongs to the editor.
    ignoreEvent(event) {
      return event.type !== "mousedown";
    }
    toDOM(view) {
      const box = document.createElement("div");
      box.className = "doc-cols";
      const blocks = docColumnsBlocks(this.source);
      const columns = blocks.length ? blocks[0].columns : [];
      box.style.setProperty("--doc-cols", String(Math.max(1, columns.length)));
      for (const column of columns) {
        const col = document.createElement("div");
        col.className = "doc-col";
        //: Through the app's one markdown renderer, so a column holds what a
        //: document holds: headings, lists, links, an image.
        renderMarkdown(col, column.text);
        //: Where the caret goes when this column is clicked. The offsets in
        //: `blocks` are relative to the block's own text, so the block's start
        //: is added back here rather than at every use of it.
        col.dataset.docColFrom = String(this.from + column.from);
        box.appendChild(col);
      }
      box.addEventListener("mousedown", (event) => {
        const target = event.target instanceof Element ? event.target.closest("[data-doc-col-from]") : null;
        //: A link inside a column is a link: let it be clicked.
        if (event.target instanceof Element && event.target.closest("a, button")) return;
        event.preventDefault();
        const at = target ? Number(target.dataset.docColFrom) : this.from;
        view.dispatch({ selection: { anchor: Math.min(at, view.state.doc.length) } });
        view.focus();
      });
      return box;
    }
  }

  const build = (state) => {
    const text = state.doc.toString();
    //: The cheap test first: a document with no `:::` in it at all is most of
    //: them, and this runs on every keystroke.
    if (!text.includes(":::")) return Decoration.none;
    const sel = state.selection.main;
    const ranges = [];
    for (const block of docColumnsBlocks(text)) {
      if (sel.from <= block.to && sel.to >= block.from) continue;
      ranges.push(
        Decoration.replace({
          widget: new DocColumnsWidget(text.slice(block.from, block.to), block.from),
          block: true,
        }).range(block.from, block.to)
      );
    }
    return Decoration.set(ranges, true);
  };

  docColumnsFieldCache = StateField.define({
    create: (state) => build(state),
    //: **`(value, tr)`, in that order**, which is the whole signature and cost
    //: an hour: written `(tr, value)` the field returned the *transaction* as
    //: its value on every update that was not an edit, the decorations facet
    //: was handed a Transaction where a RangeSet belonged, and the view died
    //: with "Cannot read properties of undefined (reading 'isEmpty')" on the
    //: next paint, nowhere near this line.
    update: (value, tr) => (tr.docChanged || tr.selection ? build(tr.state) : value),
    provide: (field) => EditorView.decorations.from(field),
  });
  return docColumnsFieldCache;
}

//: Live is three extensions rather than one now, and all three go in the same
//: compartment, so a view switch turns them on and off together: the block
//: widget and the arrow keys that step into it belong to Live exactly as the
//: markdown decorations do.
function docLiveExtensions(CM) {
  return [docLivePlugin(CM), docColumnsField(CM), docColumnsArrowKeymap(CM)];
}

//: Arrow into a rendered block rather than over it. CodeMirror moves the caret
//: *across* a replaced block range, which is right for a widget with nothing
//: to edit in it and wrong for this one: the block is the text you wrote.
function docColumnsArrowKeymap(CM) {
  const step = (view, back) => {
    const state = view.state;
    const sel = state.selection.main;
    if (!sel.empty) return false;
    const text = state.doc.toString();
    if (!text.includes(":::")) return false;
    const line = state.doc.lineAt(sel.head);
    const next = back ? line.from - 1 : line.to + 1;
    if (next < 0 || next > state.doc.length) return false;
    const block = docColumnsAt(text, next);
    //: Only when the caret is not already in one: inside the block the arrows
    //: are the editor's own again.
    if (!block || docColumnsAt(text, sel.head)) return false;
    const columns = block.columns;
    const at = back && columns.length ? columns[columns.length - 1].to : (columns[0] ? columns[0].from : block.from);
    view.dispatch({ selection: { anchor: Math.max(0, Math.min(at, state.doc.length)) }, scrollIntoView: true });
    return true;
  };
  return CM.view.keymap.of([
    { key: "ArrowDown", run: (view) => step(view, false) },
    { key: "ArrowUp", run: (view) => step(view, true) },
  ]);
}


// -----------------------------------------------------------------------------
// Embeds: `![[…]]` draws the thing, not a link to it
// -----------------------------------------------------------------------------
//
// DOCUMENTS_PLAN Phase 3 item 3, with the sentence that decides how it is
// built: **one renderer per kind, app-wide.** A note embedded in a document
// renders through `entryItem`, the same function that draws every note card in
// the Notes tab; a map through `mapChip` and `mapPreview`, which app.js's own
// comment already calls "one mapChip() and one mapPreview(), used by all"; a
// file through `fileCard`, the Library's tile. Nothing here draws a card. The
// most expensive recurring mistake in this project is building a second one of
// something that exists, and four card renderers for one app would be exactly
// that.
//
// What resolves a name is `docResolveWikiTarget`, which is what a plain
// `[[link]]` already uses, plus the Library's own index for files: an embed
// and a link have to point at the same thing or the two gestures disagree
// about what a name means.

//: A name to a thing. The note, board and document indexes are in the page
//: already; the Library's file list is not, so it is fetched once and the
//: widget fills itself in when it lands (`docEmbedFill`).
function docEmbedTarget(name) {
  const target = docResolveWikiTarget(name);
  if (target) return target;
  const wanted = String(name || "").trim().toLowerCase();
  if (!wanted) return null;
  const files = typeof editorFileCache !== "undefined" && editorFileCache ? editorFileCache : [];
  const named = (row) => String(row.original_name || row.filename || "").toLowerCase();
  const file =
    files.find((row) => named(row) === wanted) ||
    files.find((row) => named(row).replace(/\.[^.]+$/, "") === wanted);
  return file ? { kind: "file", file } : null;
}

//: The card for a target, from whichever renderer already owns that kind.
//: Returns null for a kind with no card of its own, which the caller draws as
//: the link chip it would have been.
function docEmbedNode(target, name) {
  if (!target) return null;
  //: **A block embed is the block's own markdown, rendered.** Not a card: the
  //: thing being embedded is a paragraph of this notebook's own writing, and
  //: every other renderer here draws an *object* (a note, a map, a file). The
  //: quote bar and the source line are what say where it came from.
  if (target.kind === "block") {
    const text = docBlockDocumentText(target.doc);
    if (text == null) return null; // not fetched yet; `docEmbedFill` asks
    const found = docBlockFind(text, target.blockId);
    const box = document.createElement("blockquote");
    box.className = "doc-embed-block";
    const body = document.createElement("div");
    body.className = "doc-embed-block-body";
    if (found) renderMarkdown(body, found.text);
    else body.textContent = "That block is not in the document any more.";
    if (!found) body.classList.add("muted");
    const source = document.createElement("button");
    source.type = "button";
    source.className = "linklike doc-embed-block-source";
    source.textContent = target.doc.title || "Untitled";
    source.title = "Open the document at this block";
    source.addEventListener("click", () => docOpenResolvedWikiTarget(target, name));
    box.append(body, source);
    return box;
  }
  if (target.kind === "note" && typeof entryItem === "function") {
    //: `entryItem` is an `<li>`, and `.entry-list li` is where a note card's
    //: whole appearance lives: handed out on its own it would render as a
    //: bare list item. The list around it is the card's other half.
    const list = document.createElement("ul");
    list.className = "entry-list";
    list.appendChild(entryItem(target.entry));
    return list;
  }
  if (target.kind === "board" && typeof mapChip === "function") {
    const box = document.createElement("span");
    box.className = "doc-embed-map";
    box.appendChild(mapChip(target.entry, { interactive: false }));
    if (typeof mapPreview === "function") box.appendChild(mapPreview(target.entry, { size: "card" }));
    return box;
  }
  if (target.kind === "file" && typeof fileCard === "function") {
    const file = target.file;
    const url = file.url || `/files/${file.id}`;
    const label = file.original_name || file.filename || name;
    if (file._isImage && typeof mediaSrc === "function") {
      //: An image embed is the image. `fileCard` would be a tile with the
      //: picture's *name* on it, which is what `![[photo.png]]` is asking not
      //: to have to look at.
      const img = document.createElement("img");
      img.className = "cm-md-image";
      img.src = mediaSrc(url);
      img.alt = label;
      img.loading = "lazy";
      return img;
    }
    return fileCard(label, url);
  }
  return null;
}

//: **An image's options, applied.** One function for both surfaces: the widget
//: in Live and the `<img>` the preview's renderer produced, because "300 means
//: 300 pixels wide" has to mean the same thing in the two views of one
//: document or the width is a property of the view rather than of the image.
//:
//: The width is written through `style.width` rather than an attribute or an
//: inline `style=`: this app's CSP refuses the attribute (DESIGN.md's note on
//: a policy silently refusing the work), and the theme's own `max-width: 100%`
//: still wins on a narrow pane, so an over-wide number cannot break the
//: column.
function docApplyImageOptions(img, options) {
  if (!img || !options) return img;
  if (options.width) img.style.width = `${options.width}px`;
  if (!options.align && !options.caption) return img;
  const figure = document.createElement("span");
  figure.className = "cm-md-figure";
  if (options.align) figure.classList.add(`cm-md-figure-${options.align}`);
  if (img.parentNode) img.replaceWith(figure);
  figure.appendChild(img);
  if (options.caption) {
    const caption = document.createElement("span");
    caption.className = "cm-md-caption";
    caption.textContent = options.caption;
    figure.appendChild(caption);
  }
  return figure;
}

//: **A markdown image's alt text is its caption once it carries options.**
//: `![A river](/media/river.jpg)` is an image with alt text and stays one;
//: `![A river|400](/media/river.jpg)` is a figure four hundred pixels wide
//: captioned "A river", because somebody who writes an option has said this
//: image is a figure. A wiki embed does not do this and must not: the part
//: before the first pipe there is a file name, and captioning every embedded
//: picture `photo.png` is worse than captioning none of them.
function docImageOptionsFromAlt(alt) {
  const text = String(alt == null ? "" : alt);
  const options = docImageOptions(text);
  if (text.includes("|") && !options.caption) options.caption = options.name;
  return options;
}

//: The preview's half of the same thing. The renderer puts an image's options
//: in its `alt`, because that is where they are written in the markdown
//: (`![A river|400|center](/media/river.jpg)`), so reading them back off the
//: alt is the same information rather than a second parse of the document.
function docLayerImageOptions(root) {
  if (!root) return;
  for (const img of root.querySelectorAll("img")) {
    const alt = img.getAttribute("alt") || "";
    if (!alt.includes("|")) continue;
    const options = docImageOptionsFromAlt(alt);
    img.setAttribute("alt", options.caption || options.name);
    docApplyImageOptions(img, options);
  }
}

//: The chip an embed falls back to: a name that resolves to nothing yet, and a
//: document, which is the one link target in this app with no card of its own.
//: Said in words rather than left blank, because an embed that draws nothing
//: reads as a bug in the editor rather than as a name with nothing behind it.
function docEmbedChip(name, target) {
  const chip = document.createElement("span");
  chip.className = "chip doc-embed-chip";
  chip.textContent = name;
  chip.title = target
    ? `\u201c${name}\u201d opens in Documents; there is no inline preview for a document yet`
    : `Nothing called \u201c${name}\u201d yet`;
  if (!target) chip.classList.add("muted");
  return chip;
}

function docEmbedFill(host, name, options = null) {
  const target = docEmbedTarget(name);
  const node = docEmbedNode(target, name);
  if (node) {
    host.replaceChildren(node);
    //: An image embed is the one kind these options mean anything for; a note
    //: card with a width of 300 is a card somebody has squashed.
    if (node.tagName === "IMG") docApplyImageOptions(node, options);
    return;
  }
  //: A block embed of a document nobody has opened has no text to draw yet.
  //: One fetch per document, cached, and the widget fills itself in rather
  //: than waiting for a repaint a document nobody is typing in will never get.
  if (target && target.kind === "block") {
    host.replaceChildren(docEmbedChip(name, target));
    if (docBlockTextCache.has(target.doc.id)) return;
    docBlockTextCache.set(target.doc.id, null);
    apiJson(`/documents/${target.doc.id}`, { silent: true })
      .then((doc) => {
        docBlockTextCache.set(target.doc.id, doc.content || "");
        if (!host.isConnected) return;
        const later = docEmbedNode(target, name);
        if (later) host.replaceChildren(later);
      })
      .catch(() => {
        docBlockTextCache.delete(target.doc.id);
      });
    return;
  }
  host.replaceChildren(docEmbedChip(name, target));
  //: The Library's index is the one thing that might not be loaded yet, so a
  //: name that is a file reads as "nothing called that" until it arrives. One
  //: fetch, once, and the widget fills itself in rather than waiting for a
  //: repaint that a document nobody is typing in will never get.
  if (target || typeof editorLoadFiles !== "function") return;
  if (typeof editorFileCache !== "undefined" && editorFileCache) return;
  editorLoadFiles()
    .then(() => {
      if (!host.isConnected) return;
      const later = docEmbedNode(docEmbedTarget(name), name);
      if (later) {
        host.replaceChildren(later);
        if (later.tagName === "IMG") docApplyImageOptions(later, options);
      }
    })
    .catch(() => {});
}

//: **One resolver for a `[[name]]`, and now it really is one.**
//:
//: Reported directly: "[[]] links work between notes in the your notes tab,
//: but it is still coming up with that error in the documents editor",
//: with a screenshot of `[[# Girl with bell]]` toasting "Nothing called ...
//: yet" beside a note whose first line is exactly that.
//:
//: Both of this file's resolvers looked a note up as
//: `allEntries.find(e => e.title === wanted)`, an *exact* match on a
//: *derived* field: `EntryOut.title` is the note's first line with its `# `
//: stripped (schemas.py says so, and it is `None` for a note whose first
//: line is not a heading). The `[[…]]` text the picker inserts is the note's
//: opening words verbatim, `# ` and all, so the two forms differ by exactly
//: the characters the derivation removes and the comparison could never be
//: true. `resolveWikiTarget` (app.js) is the resolver the Notes tab has used
//: all along: it matches a vault note by its file stem, a board by title, a
//: note by *content prefix* (which is what makes the picker's opening-words
//: form resolve), and a document by title or title prefix.
//:
//: Documents are still tried first, which the previous code did deliberately
//: and is worth keeping: a document and a note sharing a name, clicked from
//: inside a document, should open the document. Everything else defers to
//: the one resolver, so the drift the old comments kept promising was
//: impossible cannot happen again.
function docResolveWikiTarget(name) {
  //: **A block reference is resolved before anything else**, because
  //: `Doc title#^abc123` is not a name and would resolve to nothing at all if
  //: it were looked up as one. Documents only: a block id is written into a
  //: document's own text by the command that copies the link, and a note has
  //: no editor here to put one in. `docBlockRefSplit` of a plain name returns
  //: a null id, so this costs every other link one comparison.
  const ref = docBlockRefSplit(name);
  if (ref.blockId) {
    const base = ref.name ? docResolveWikiTarget(ref.name) : { kind: "document", doc: currentDoc };
    if (base && base.kind === "document" && base.doc) {
      return { kind: "block", doc: base.doc, blockId: ref.blockId };
    }
    return null;
  }
  const wanted = String(name || "").trim().toLowerCase();
  if (!wanted) return null;
  const asDoc = docs.find((doc) => (doc.title || "").trim().toLowerCase() === wanted);
  if (asDoc) return { kind: "document", doc: asDoc };
  return typeof resolveWikiTarget === "function" ? resolveWikiTarget(name) : null;
}

//: What a resolved target is called, for a link's tooltip. A note has no
//: title of its own worth showing (see above), so it borrows the preview
//: text every other note list in the app labels a note with.
function docWikiTargetLabel(target) {
  if (!target) return "";
  if (target.kind === "block") return `${target.doc.title || ""} (a block)`;
  if (target.kind === "document") return target.doc.title || "";
  if (target.kind === "board") return target.entry.title || "";
  const entry = target.entry || {};
  const text =
    typeof notePreviewText === "function"
      ? notePreviewText(entry.content || "")
      : entry.content || "";
  //: `notePreviewText` strips the markdown but keeps the note's line breaks
  //: and does not shorten. A `title` attribute renders both literally, so a
  //: note would hand the tooltip its whole body across as many lines as it
  //: has: collapsed to one line and cut here.
  const line = text.replace(/\s+/g, " ").trim();
  return line.length > 60 ? `${line.slice(0, 60).trimEnd()}…` : line;
}

function docOpenResolvedWikiTarget(target, name) {
  if (!target) {
    toast(`Nothing called "${name}" yet.`, true);
    return;
  }
  if (target.kind === "block") {
    //: Open the document first *then* find the block, and only when it is a
    //: different document: opening the one you are in would throw away the
    //: unsaved keystroke that made the link worth following.
    const reveal = () => docRevealBlock(target.blockId);
    if (currentDoc && currentDoc.id === target.doc.id) reveal();
    else Promise.resolve(openDocument(target.doc.id)).then(reveal);
    return;
  }
  if (target.kind === "document") openDocument(target.doc.id);
  else if (target.kind === "board") openWhiteboardBoard(target.entry.id);
  else flashEntry(target.entry.id);
}

function docOpenWikiTarget(name) {
  docOpenResolvedWikiTarget(docResolveWikiTarget(name), name);
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
// **This used to be a scroll fraction, and the fraction is what was wrong.**
// The owner, 2026-09-20: "the scrolling is off in the split document view
// because of the md rendering", which names the cause exactly. A fraction
// assumes the two panes are the same document at two scales, and they are not:
// a picture is one line of source and four hundred pixels of preview, a table
// is six lines and one box, a code fence is twenty lines in both but with a
// header strip and a different line height in one of them. Every such block
// shifts everything below it in one pane and not the other, and the error is
// cumulative, so the top of a document lines up, the bottom lines up (both
// ends are exact by construction), and the middle, which is where anybody
// actually reads, is off by however much furniture is above it.
//
// So the map is line to block. `renderMarkdown` (app.js) stamps every block it
// draws with the source line it came from, which is the one place that can
// know; `docScrollAnchors` turns those stamps into pairs of offsets, one in
// each pane, and the sync interpolates between the two nearest. The old
// fraction is still here and still used, for the case where there is nothing
// to interpolate between: fewer than two anchors, or a textarea fallback with
// no line-to-pixel map of its own.

//: Which pane the user is actually scrolling. Without this the two feed each
//: other: A scrolls B, B's scroll event scrolls A, and the pair juddate to a
//: stop somewhere neither of them was asked to go.
let docScrollDriver = null;

//: The anchor table, rebuilt only when something that could move an anchor has
//: changed. Building it walks every block in the preview and asks the editor
//: where each one's line sits, which is far too much to do on every frame of a
//: scroll; the token below is two layout reads and changes whenever the
//: rendering, the text or either pane's size has.
let docScrollAnchorCache = { token: "", anchors: [] };

//: Where a source line starts, in the editor's own scrolled coordinates.
//:
//: CodeMirror is asked through `lineBlockAt`, not through `coordsAtPos`, and
//: the difference matters here more than anywhere else in this file: the view
//: only renders the lines near the viewport, so `coordsAtPos` answers null for
//: exactly the anchors this table is built for, the ones off screen.
//: `lineBlockAt` answers from the height map, which covers the whole document.
//:
//: A textarea has no line map at all, and rather than guess, this returns null
//: and the caller falls back to the fraction. An estimate here would be a
//: worse fraction wearing the word "anchor".
function docSourceLineTop(surface, line) {
  if (!surface || surface.kind !== "codemirror") return null;
  const view = surface.view;
  const doc = view.state.doc;
  const number = Math.max(1, Math.min(line + 1, doc.lines));
  return view.lineBlockAt(doc.line(number).from).top;
}

//: One pair of offsets per rendered block that says where it came from: the
//: top of its source line in the editor, and the top of the block itself in
//: the preview, both in their own pane's scrolled coordinates.
//:
//: Monotonic by construction, and checked anyway: a block whose stamp is not
//: past the previous one's is dropped rather than allowed to fold the map back
//: on itself, which would make the interpolation jump backwards. Two anchors
//: are the minimum worth having, since one line and one slope is what
//: interpolation needs.
function docScrollAnchors(editor, preview) {
  //: The widths are in the token, not decoration: a pane that changes width
  //: rewraps every paragraph in it, which moves every anchor below the first
  //: one that rewrapped. The sidebar collapsing is the case that found this,
  //: and it can change a width without changing either scroll height, so the
  //: four numbers that were here could all stay the same across it.
  const token = [
    preview.childElementCount,
    preview.scrollHeight,
    preview.clientWidth,
    editor.scrollHeight,
    editor.scrollEl?.clientWidth || 0,
    editor.kind === "codemirror" ? editor.view.state.doc.length : -1,
  ].join(":");
  if (docScrollAnchorCache.token === token) return docScrollAnchorCache.anchors;
  const anchors = [];
  let lastLine = -1;
  //: **Rects, corrected by the pane's own, never `offsetTop`.** This is the
  //: rule `setDocPage` (app.js) already states for the same reason, and
  //: ignoring it is what INBOX 278 turned out to be: `offsetTop` is measured
  //: against the nearest **positioned** ancestor, and the preview is not
  //: positioned. Measured on the probe document at 1440: every block's
  //: `offsetTop` ran 218px past its true offset in the pane with the sidebar
  //: open, and 146px with it collapsed, because collapsing it puts a
  //: positioned `#doc-layout` between the block and the body.
  //:
  //: A constant bias is not a harmless one here. Every anchor carries it, the
  //: interpolation hands it straight through, and `syncDocScroll` then parks
  //: the preview that far past the line the source is showing, at every
  //: position in the document: which is exactly the shape of the report, "the
  //: documents split view scrolling is broken and misaligned", with no
  //: pattern to it because the error does not grow, it just sits there.
  //:
  //: It also defeated the probe that closed the first report, because that
  //: probe read `offsetTop` too: the same bias on both sides of the
  //: subtraction cancels, and the answer comes back 0 from a pane that is a
  //: paragraph and a half out. `scratchpad/ui-sweeps/docsplit.js` measures
  //: through rects now for that reason.
  const previewTop = preview.getBoundingClientRect().top;
  for (const block of preview.children) {
    //: The stamp is a line in the string the preview rendered; the editor
    //: counts from a different zero (`docPreviewLineShift`).
    const line = Number(block.dataset.srcLine) - docPreviewLineShift;
    if (!Number.isFinite(line) || line <= lastLine) continue;
    const srcTop = docSourceLineTop(editor, line);
    if (srcTop === null) {
      docScrollAnchorCache = { token, anchors: [] };
      return docScrollAnchorCache.anchors;
    }
    anchors.push({
      srcTop,
      prevTop: block.getBoundingClientRect().top - previewTop + preview.scrollTop,
    });
    lastLine = line;
  }
  docScrollAnchorCache = { token, anchors: anchors.length >= 2 ? anchors : [] };
  return docScrollAnchorCache.anchors;
}

//: Piecewise-linear, with the end segments' own slopes carried outwards.
//:
//: The alternative at the ends is to clamp, and clamping is visibly wrong in
//: the one place it would apply: the space above the first block and below the
//: last, where a clamped map pins the other pane while this one keeps moving.
//: Carrying the slope keeps both moving at the rate the nearest real pair of
//: anchors says they should.
function docMapThroughAnchors(value, anchors, forward) {
  const key = forward ? "srcTop" : "prevTop";
  const other = forward ? "prevTop" : "srcTop";
  let index = 0;
  while (index < anchors.length - 2 && anchors[index + 1][key] <= value) index += 1;
  const low = anchors[index];
  const high = anchors[index + 1];
  const span = high[key] - low[key];
  //: Two anchors at the same offset in one pane (an empty block, a heading
  //: immediately followed by another) would divide by zero; the lower one's
  //: partner is the honest answer.
  if (span <= 0) return low[other];
  const ratio = (value - low[key]) / span;
  return low[other] + ratio * (high[other] - low[other]);
}

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
  const anchors = docScrollAnchors(editor, preview);
  let next;
  if (anchors.length >= 2) {
    next = docMapThroughAnchors(from.scrollTop, anchors, from !== preview);
  } else {
    //: No map to read: the fraction, which is what this always was.
    next = (from.scrollTop / fromRange) * toRange;
  }
  docScrollDriver = from;
  to.scrollTop = Math.max(0, Math.min(Math.round(next), toRange));
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
    //: Before the driver guard below, not after it: the outline follows the
    //: editor whichever pane started the scroll, and when the preview is
    //: driving, this listener's own surface is the one being moved.
    scheduleDocOutlineSpy();
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
  //: **Three columns, and the caret in the first header cell.** The "/" menu
  //: has always said "3 columns" and this table had two, which is the kind of
  //: disagreement nobody reports and everybody notices. `custom`, because the
  //: `insert` shape leaves the caret after the whole block: a table you have
  //: to arrow back into is a table you retype.
  table: { custom: "table" },
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
  //: `$…$` is the syntax every markdown editor with math uses, and the
  //: renderer for it is in this file (`docMathTree`). Symmetric, so pressing
  //: it twice takes it off again, which is what `wrap` gives.
  math: { wrap: "$", placeholder: "x^2" },
  //: `%%…%%` is Obsidian's comment: kept in the file, never rendered.
  comment: { pre: "%%", post: "%%", placeholder: "note to self" },
  //: A remark *on* something, which is the comment the panel lists (Phase 5
  //: item 1). `custom`, because a `pre`/`post` pair cannot do it: what it
  //: inserts depends on whether anything is selected, and the caret has to
  //: land between the two `%%` pairs rather than after the whole insertion.
  annotate: { custom: "annotate" },
  image: { custom: "image" },
  //: Properties (DOCUMENTS_PLAN Phase 3 item 4). `custom`, because the block
  //: goes at the top of the document rather than at the caret: it is the one
  //: markdown construct whose position is fixed by what it means.
  properties: { custom: "properties" },
  //: A block reference (DOCUMENTS_PLAN Phase 4 item 2). `custom`, because it
  //: inserts nothing at the caret: it gives the block the caret is in an id
  //: and puts the link to it on the clipboard.
  blockref: { custom: "blockref" },
  //: Two columns, with the caret in the first one. The `block`/`suffix` shape
  //: rather than `insert`, so the selection lands on the placeholder and the
  //: first thing typed replaces it, which is what the table and the code
  //: block already do.
  columns: {
    block: "\n:::columns\n",
    suffix: "\n:::column\n\n:::\n",
    placeholder: "Left column",
  },
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
  if (action.custom === "properties") {
    docInsertProperties();
    return;
  }
  if (action.custom === "blockref") {
    docCopyBlockRef();
    return;
  }
  if (action.custom === "table") {
    //: Blank cells with their outer pipes, so every one of them is a cell GFM
    //: can see (`docTableFillRowEdits` carries the reason a blank last cell
    //: without a trailing pipe is not a cell at all).
    const table = "\n| Column | Column | Column |\n| --- | --- | --- |\n|  |  |  |\n|  |  |  |\n";
    box.value = value.slice(0, start) + table + value.slice(end);
    const at = start + table.indexOf("Column");
    box.setSelectionRange(at, at + "Column".length);
    finishMarkdownEdit(box, boxId);
    return;
  }
  if (action.custom === "annotate") {
    docAnnotateSelection(box, boxId);
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

//: **One download, four routes to it.** The markdown, the bundle and the Word
//: file are the same three steps (ask the server, read the filename off the
//: header, save the blob) and differed only in the path, which is how the
//: second one grows a subtly different error path from the first. The message
//: on a refusal is the server's own `detail` where there is one: "this install
//: has no Word exporter" is worth reading, and "Export failed (501)" is not.
async function downloadDocumentExport(path, fallbackName) {
  if (!currentDoc) return;
  //: Fetched rather than navigated to. A plain link carries no X-Auth-Token,
  //: so the server answers 401 and the browser renders that error *in place of
  //: the app*: it navigates away instead of downloading.
  try {
    const response = await fetch(`/documents/${currentDoc.id}/${path}`, {
      headers: { "X-Auth-Token": authToken() },
    });
    if (!response.ok) {
      let detail = "";
      try {
        detail = (await response.json()).detail || "";
      } catch (error) {
        detail = "";
      }
      throw new Error(detail || `Export failed (${response.status})`);
    }
    const disposition = response.headers.get("content-disposition") || "";
    const match = disposition.match(/filename="([^"]+)"/);
    await saveFile(match ? match[1] : fallbackName, await response.blob());
    const assets = Number(response.headers.get("X-Assets") || 0);
    if (assets > 0) {
      toast(`Saved with ${assets} image${assets === 1 ? "" : "s"} beside it`);
    }
  } catch (error) {
    $("doc-status").classList.add("error");
    $("doc-status").textContent = error.message;
  }
}

function exportDocumentBundle() {
  return downloadDocumentExport("export.zip", "document.zip");
}

function exportDocumentDocx() {
  return downloadDocumentExport("export.docx", "document.docx");
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

// DOC-EXPORT-HTML-BEGIN
//: **A document as one HTML file that needs nothing else**
//: (DOCUMENTS_PLAN Phase 7, the decision recorded in that plan's section 13).
//:
//: The short version, because the shape of this code only makes sense with it:
//: there is no server-side markdown renderer in this app and the plan forbids
//: adding one, so the only faithful source of a rendered document is the
//: rendered document, which lives in `#doc-preview` in the browser. The export
//: is therefore built here, from that DOM, exactly the way the whiteboard's PNG
//: export is built from the canvas that is already drawn.
//:
//: "Self-contained" is the whole requirement and it is what most of this file
//: is about: the page that lands in somebody's downloads folder must open with
//: no network, no app, and no account. So the stylesheet is written out in
//: full below rather than the app's eleven sheets being inlined (they are 400KB
//: of tokens, docks and dialogs for a page with none of those in it), images
//: become `data:` URIs, icons and controls are dropped rather than shipped
//: broken, and a link that points back into this app loses its href and keeps
//: its words. `tests/test_document_export_html.py` is what holds that line.

//: Deliberately small and deliberately not the app's. The one thing it has to
//: get right is the reading measure and the vertical rhythm; everything else
//: is the browser's own defaults doing their job. Dark is a media query rather
//: than a choice, because the file has no settings in it and the reader's
//: system is the only preference there is.
const DOC_EXPORT_CSS = `
:root {
  color-scheme: light dark;
  --ink: #1c1d22;
  --muted: #5b6070;
  --ground: #ffffff;
  --rule: #e2e4eb;
  --inner: #f5f6f9;
  --accent: #4f6df5;
}
@media (prefers-color-scheme: dark) {
  :root {
    --ink: #e8e9ee;
    --muted: #a2a7b8;
    --ground: #16171b;
    --rule: #2c2e36;
    --inner: #1e2026;
    --accent: #8ea2ff;
  }
}
* { box-sizing: border-box; }
body {
  margin: 0;
  padding: 3rem 1.5rem 6rem;
  background: var(--ground);
  color: var(--ink);
  font: 16px/1.65 "Iowan Old Style", Palatino, Georgia, "Times New Roman", serif;
}
main { max-width: 42rem; margin: 0 auto; }
h1, h2, h3, h4, h5, h6 {
  margin: 2.2em 0 0.6em;
  font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
  line-height: 1.25;
}
h1 { font-size: 2rem; margin-top: 0; }
h2 { font-size: 1.5rem; }
h3 { font-size: 1.2rem; }
p, ul, ol, blockquote, table, pre { margin: 0 0 1.1em; }
a { color: var(--accent); }
img { max-width: 100%; height: auto; border-radius: 4px; }
figure { margin: 1.5em 0; }
figcaption { color: var(--muted); font-size: 0.9rem; text-align: center; }
blockquote {
  margin-left: 0;
  padding: 0.2em 0 0.2em 1em;
  border-left: 3px solid var(--rule);
  color: var(--muted);
}
code, pre, kbd { font-family: ui-monospace, SFMono-Regular, Consolas, monospace; font-size: 0.92em; }
code { padding: 0.1em 0.3em; border-radius: 3px; background: var(--inner); }
pre {
  padding: 1em;
  overflow-x: auto;
  border-radius: 6px;
  background: var(--inner);
}
pre code { padding: 0; background: none; }
table { width: 100%; border-collapse: collapse; font-size: 0.95em; }
th, td { padding: 0.45em 0.7em; border: 1px solid var(--rule); text-align: left; }
th { background: var(--inner); }
hr { height: 1px; margin: 2.5em 0; border: 0; background: var(--rule); }
ul.task-list, .task-list { list-style: none; padding-left: 1.2em; }
input[type="checkbox"] { margin-right: 0.4em; }
.doc-callout {
  margin: 1.5em 0;
  padding: 0.8em 1em;
  border-left: 3px solid var(--accent);
  border-radius: 0 6px 6px 0;
  background: var(--inner);
}
.doc-footnotes {
  margin-top: 3em;
  padding-top: 1em;
  border-top: 1px solid var(--rule);
  color: var(--muted);
  font-size: 0.9em;
}
.doc-export-missing { color: var(--muted); font-style: italic; }
.doc-export-link { border-bottom: 1px dotted var(--rule); }
.doc-export-meta {
  margin: 0 0 2.5em;
  color: var(--muted);
  font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
  font-size: 0.85rem;
}
`;

function docExportEscape(text) {
  return String(text == null ? "" : text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

//: No `<h1>` of the title above the body: a document here almost always opens
//: with its own heading, and printing the title again would give every
//: exported page a duplicated first line. The name travels in `<title>`, which
//: is what names a tab, a bookmark and a saved file.
//:
//: The meta line is one line and it is the provenance: what this was and when
//: it was taken. Without it an exported page is undated, and a document that
//: is edited weekly becomes several undated files with the same name.
function docExportHtmlDocument(title, bodyHtml, savedOn) {
  const name = docExportEscape(title || "Untitled document");
  const meta = savedOn ? `<p class="doc-export-meta">${docExportEscape(savedOn)}</p>\n` : "";
  return (
    "<!doctype html>\n" +
    '<html lang="en">\n<head>\n<meta charset="utf-8">\n' +
    '<meta name="viewport" content="width=device-width, initial-scale=1">\n' +
    `<title>${name}</title>\n<style>${DOC_EXPORT_CSS}</style>\n</head>\n` +
    `<body>\n<main>\n${meta}${bodyHtml}\n</main>\n</body>\n</html>\n`
  );
}
// DOC-EXPORT-HTML-END

//: What comes out of the app and what does not. Everything in this list is
//: something that works only inside a running MemoryMap: a button with a
//: listener that no longer exists, an icon whose font is not in the file, a
//: link to `/documents/12`. Shipped as-is they would be an empty square, a
//: dead control and a 404; dropped, the page reads.
const DOC_EXPORT_STRIP = ".code-actions, select, textarea, script, iframe, object, embed, i.ph, .ph-lead";

//: **A control goes; the words it was wrapped around stay.** A `[[wikilink]]`
//: renders as a `button.wiki-link` here, because in the app it opens the thing
//: it names. Removing it with the other controls took the name out of the
//: sentence: an exported page read "A link into the app: ." Measured, and it
//: is the reason this is two rules rather than one selector.
function docExportUnwrapControls(root) {
  for (const node of [...root.querySelectorAll("button")]) {
    const words = (node.textContent || "").trim();
    if (!words || !node.classList.contains("wiki-link")) {
      node.remove();
      continue;
    }
    const span = document.createElement("span");
    span.className = "doc-export-link";
    span.textContent = words;
    node.replaceWith(span);
  }
}

//: **The rendered pane's headings start at `h3`**, because the app's page
//: already has an `h1` and an `h2` above the document and a pane that shouted
//: over them would be wrong on screen. A file on its own has no such page: its
//: first heading is the top of the only document there is. So the levels shift
//: by two on the way out, which is the same hierarchy with its top where a
//: standalone page expects it. The map is written out rather than computed so
//: that `h6`, which has nowhere lower to go, is a decision rather than an
//: arithmetic accident.
const DOC_EXPORT_HEADINGS = { H3: "h1", H4: "h2", H5: "h3", H6: "h4" };

function docExportPromoteHeadings(root) {
  //: The list is taken before anything is replaced: promoting in place while
  //: iterating a live list would walk into the `h1`s it has just made.
  for (const node of [...root.querySelectorAll("h3, h4, h5, h6")]) {
    const tag = DOC_EXPORT_HEADINGS[node.tagName];
    if (!tag) continue;
    const swap = document.createElement(tag);
    for (const attribute of [...node.attributes]) swap.setAttribute(attribute.name, attribute.value);
    while (node.firstChild) swap.appendChild(node.firstChild);
    node.replaceWith(swap);
  }
}

function docExportClean(root) {
  for (const node of root.querySelectorAll(DOC_EXPORT_STRIP)) node.remove();
  docExportUnwrapControls(root);
  docExportPromoteHeadings(root);
  for (const box of root.querySelectorAll('input:not([type="checkbox"])')) box.remove();
  //: A task box stays, because an unticked box in a list is part of what the
  //: document says. Disabled, because ticking it in an exported file would
  //: change nothing anywhere and a control that does nothing is a lie.
  for (const box of root.querySelectorAll('input[type="checkbox"]')) {
    box.setAttribute("disabled", "disabled");
    box.removeAttribute("onclick");
  }
  for (const link of root.querySelectorAll("a[href]")) {
    const href = link.getAttribute("href") || "";
    const external = /^(https?:|mailto:|#)/i.test(href);
    if (!external) link.removeAttribute("href");
  }
  //: Every `data-` attribute in the preview is a handle for this app's own
  //: listeners (a finding's index, a block id, a note id). None of them mean
  //: anything in a file, and one of them, a note id, is data about somebody's
  //: notebook travelling inside a document they meant to share.
  for (const node of root.querySelectorAll("*")) {
    for (const attribute of [...node.attributes]) {
      if (attribute.name.startsWith("data-") || attribute.name.startsWith("on")) {
        node.removeAttribute(attribute.name);
      }
      //: The CSP refuses an inline style in this app's own page and an
      //: exported file has no CSP at all, which is exactly why they are
      //: stripped rather than kept: a style attribute here would be the app's
      //: own token vocabulary (`var(--accent-soft)`) resolving to nothing.
      if (attribute.name === "style") node.removeAttribute("style");
    }
  }
  return root;
}

//: Eight megabytes of data URIs is a file that opens; eighty is one that
//: hangs the tab it is dropped into. Past the budget an image becomes its own
//: alt text, which says what was there rather than drawing a broken frame.
const DOC_EXPORT_IMAGE_BUDGET = 8 * 1024 * 1024;

async function docExportInlineImages(root) {
  let spent = 0;
  let inlined = 0;
  let dropped = 0;
  for (const img of [...root.querySelectorAll("img")]) {
    const src = img.getAttribute("src") || "";
    if (src.startsWith("data:")) {
      inlined++;
      continue;
    }
    let dataUri = null;
    if (src && !/^https?:/i.test(src) && spent < DOC_EXPORT_IMAGE_BUDGET) {
      try {
        const response = await fetch(src, { headers: { "X-Auth-Token": authToken() } });
        if (response.ok) {
          const blob = await response.blob();
          if (spent + blob.size <= DOC_EXPORT_IMAGE_BUDGET) {
            dataUri = `data:${blob.type || "application/octet-stream"};base64,${await blobToBase64(blob)}`;
            spent += blob.size;
          }
        }
      } catch {
        // A file that cannot be read is a file that cannot be embedded; the
        // alt text below says so rather than the export failing over it.
      }
    }
    if (dataUri) {
      img.setAttribute("src", dataUri);
      img.removeAttribute("srcset");
      img.removeAttribute("loading");
      inlined++;
    } else {
      const note = document.createElement("span");
      note.className = "doc-export-missing";
      note.textContent = `[image: ${img.getAttribute("alt") || "not included"}]`;
      img.replaceWith(note);
      dropped++;
    }
  }
  return { inlined, dropped, bytes: spent };
}

async function exportDocumentHtml() {
  if (!currentDoc) return;
  const status = $("doc-status");
  //: The remarks travel as footnotes, exactly as they do in a PDF: a document
  //: handed to somebody carries what was said about it rather than dropping it
  //: silently. Set before `withDocPreviewShown`, which renders on the way in.
  docPrintComments = true;
  let done;
  const finished = new Promise((resolve) => {
    done = resolve;
  });
  withDocPreviewShown(async (restore) => {
    try {
      const clone = $("doc-preview").cloneNode(true);
      clone.removeAttribute("id");
      clone.removeAttribute("class");
      docExportClean(clone);
      const images = await docExportInlineImages(clone);
      const savedOn = `${currentDoc.title || "Untitled"} · exported ${new Date().toLocaleDateString()}`;
      const html = docExportHtmlDocument(currentDoc.title, clone.innerHTML, savedOn);
      const name = (currentDoc.title || "document").replace(/[^\w. -]+/g, "").trim() || "document";
      await saveFile(`${name}.html`, new Blob([html], { type: "text/html" }));
      if (images.dropped) {
        toast(`Saved. ${images.dropped} image(s) could not be embedded and are named in the text.`);
      }
    } catch (error) {
      if (status) {
        status.classList.add("error");
        status.textContent = error.message || "Couldn't export this document.";
      }
    } finally {
      docPrintComments = false;
      restore();
      renderDocPreview();
      done();
    }
  });
  return finished;
}

//: **A plain Ctrl+P prints the document, not the application**
//: (DOCUMENTS_PLAN Phase 5 item 4, the print stylesheet).
//:
//: The Export menu's "Print or save as PDF" already did the right thing: it
//: shows the preview, sets `printing-doc` and calls `window.print()`. Nothing
//: covered the other door, which is the one most people use. Measured on the
//: branch head with `emulateMedia({ media: "print" })`, a plain print from the
//: editor put the tab bar (693x44), the sidebar (260x767), the dock (1082x78)
//: and the status bar (1082x38) on the page around the text.
//:
//: So the class is set for *any* print of an open document, and the same
//: stylesheet governs both routes. Two things it deliberately does not do:
//: it does not set `docPrintComments`, because a plain print was not asked for
//: footnotes, and it does not touch a print started from anywhere else in the
//: app, which is somebody printing a different surface.
//:
//: `withDocPreviewShown` cannot be used here: it takes a callback and restores
//: on the way out, and `beforeprint` has to leave the pane shown until
//: `afterprint`. The same two calls are made by hand, which is why the restore
//: is remembered rather than derived.
let docPrintRestore = null;

function docPrintIsOurs() {
  if (!currentDoc) return false;
  try {
    return localStorage.getItem("activeTab") === "documents";
  } catch {
    //: Private mode: the tab the reader is on is still knowable from the DOM,
    //: and printing the chrome is worse than printing the document.
    return !$("tab-documents")?.classList.contains("hidden");
  }
}

window.addEventListener("beforeprint", () => {
  //: Already set means the Export menu started this print and has its own
  //: cleanup, including the footnotes it asked for. Left alone entirely.
  if (document.body.classList.contains("printing-doc")) return;
  if (!docPrintIsOurs()) return;
  const wasView = docView;
  if (docView !== "rendered") {
    setDocView("rendered");
    docPrintRestore = () => setDocView(wasView);
  }
  renderDocPreview();
  document.body.classList.add("printing-doc");
});

window.addEventListener("afterprint", () => {
  if (!docPrintRestore && !document.body.classList.contains("printing-doc")) return;
  document.body.classList.remove("printing-doc");
  const restore = docPrintRestore;
  docPrintRestore = null;
  restore?.();
});

// PDF via the browser's own print dialog: it renders the preview exactly as
// shown and every platform already has "Save as PDF" there. Bundling a PDF
// engine would add a heavy dependency to produce a worse-looking result.
function exportDocumentPdf() {
  if (!currentDoc) return;
  //: Set *before* `withDocPreviewShown`, which renders the pane on the way in:
  //: the whole point of the flag is that the render it triggers is the one that
  //: carries the footnotes (DOCUMENTS_PLAN Phase 5 item 1, "exported as
  //: footnotes"). Cleared in the same place the print class is, and the pane is
  //: drawn once more on the way out so what is left on screen after the dialog
  //: closes is Read view again, without the remarks in it.
  docPrintComments = true;
  withDocPreviewShown((restore) => {
    document.body.classList.add("printing-doc");
    const cleanup = () => {
      document.body.classList.remove("printing-doc");
      docPrintComments = false;
      restore();
      renderDocPreview();
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

//: **The result area is shown by the result arriving, and by nothing else**
//: (INBOX 158). One function rather than a `classList` call at each of the four
//: places that change the answer's state (opening, running, switching verb,
//: clearing), because the bug this replaces was not a missing class, it was four
//: places disagreeing about whether there was an answer: an empty 309px textarea
//: under a label describing text that was not there, over a Replace button for
//: nothing, in 43% of the dialog.
function showDocAiResult(text) {
  const block = $("doc-ai-result-block");
  const result = $("doc-ai-result");
  if (!block || !result) return;
  result.value = text || "";
  //: A "remove" whose answer is the passage with nothing left in it is still an
  //: answer, and `acceptDocAiEdit` already treats that case as valid, so the
  //: block is shown for an empty string and hidden only for nothing at all.
  block.classList.toggle("hidden", text === null || text === undefined);
  setDocAiProposal(text === null || text === undefined ? null : result.value);
}

//: **The proposal, as a change rather than as a wall of text**
//: (DOCUMENTS_PLAN Phase 5 item 3). The panel used to hand back the model's
//: whole answer in a textarea: for "tighten this" over a 900-word document
//: that is nine hundred words to read to find the four it touched, and the
//: only two answers available were all of it or none of it.
//:
//: The state here is two things and the textarea is the third: the *target*
//: (what the model was asked to change, the selection or the document), the
//: model's answer as a list of changes against it, and the set of changes the
//: reader has skipped. The textarea always holds the text that pressing accept
//: would apply, so the diff explains the textarea rather than competing with
//: it, and `acceptDocAiEdit` needs no knowledge of any of this: it still reads
//: the textarea, which is what it has always done.
let docAiOps = [];
let docAiHunks = [];
let docAiSkips = new Set();
let docAiTarget = null;
let docAiDiffTimer = null;

//: "Write" has no target: it inserts new text and changes nothing, so a diff
//: of it is the whole answer marked as added, which says less than the answer
//: itself. The block is hidden for that verb rather than drawn empty.
function docAiDiffTarget() {
  if (docAiVerb() === "write") return null;
  const selection = $("doc-ai-panel").dataset.selection || "";
  return selection || docSurface().text;
}

function setDocAiProposal(text) {
  docAiTarget = text === null || text === undefined ? null : docAiDiffTarget();
  if (docAiTarget === null) {
    docAiOps = [];
    docAiHunks = [];
  } else {
    docAiOps = docDiffLines(docAiTarget, text);
    docAiHunks = docDiffHunks(docAiOps);
  }
  docAiSkips = new Set();
  renderDocAiDiff();
}

function renderDocAiDiff() {
  const block = $("doc-ai-diff-block");
  const view = $("doc-ai-diff");
  const head = $("doc-ai-diff-head");
  if (!block || !view || !head) return;
  if (!docAiOps.length) {
    block.classList.add("hidden");
    view.replaceChildren();
    return;
  }
  block.classList.remove("hidden");
  const stat = docDiffStat(docAiOps);
  const count = docAiHunks.length;
  head.textContent = !count
    ? "No change: the model gave back the same text."
    : count === 1
      ? `One change, +${stat.added} −${stat.removed} lines. Skip it to leave the text as it is.`
      : `${count} changes, +${stat.added} −${stat.removed} lines. Skip any you don't want.`;
  //: Kept across a redraw: toggling the fourth change of eight must not take
  //: the reader back to the first.
  const scroll = view.scrollTop;
  docRenderDiff(view, docAiOps, {
    hunks: docAiHunks,
    skipped: docAiSkips,
    onToggleHunk: toggleDocAiHunk,
    emptyText: "No change: the model gave back the same text.",
  });
  view.scrollTop = scroll;
}

function toggleDocAiHunk(index) {
  if (docAiSkips.has(index)) docAiSkips.delete(index);
  else docAiSkips.add(index);
  //: Setting `.value` from script fires no `input` event, which is what keeps
  //: this and the listener below from chasing each other: a toggle writes the
  //: textarea, a person typing rebuilds the diff, and neither triggers the
  //: other.
  $("doc-ai-result").value = docDiffApply(docAiOps, docAiHunks, docAiSkips);
  renderDocAiDiff();
}

//: Edited by hand, the answer becomes the proposal: the diff is rebuilt
//: against the same target and every change starts kept again, because a skip
//: is a statement about a change that may no longer exist.
function docAiResultEdited() {
  if (docAiTarget === null) return;
  docAiOps = docDiffLines(docAiTarget, $("doc-ai-result").value);
  docAiHunks = docDiffHunks(docAiOps);
  docAiSkips = new Set();
  renderDocAiDiff();
}

$("doc-ai-result").addEventListener("input", () => {
  if (docAiDiffTimer) clearTimeout(docAiDiffTimer);
  docAiDiffTimer = setTimeout(docAiResultEdited, 300);
});

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

//: Switching verb throws the proposal away, and that is a fix rather than a
//: tidy-up: the panel used to keep it, so a passage the model rewrote for "Edit"
//: stayed on screen with "Remove it" under it, and pressing that button deleted
//: the selection and replaced it with the rewrite. The status line says so,
//: because a proposal vanishing with no explanation reads as a failure.
function docAiVerbChanged() {
  const had = !$("doc-ai-result-block").classList.contains("hidden");
  showDocAiResult(null);
  syncDocAiPanel();
  if (had) {
    const status = $("doc-ai-status");
    status.classList.remove("error");
    status.textContent = "Ask again: the last suggestion was for a different job.";
  }
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
  showDocAiResult(null);
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
    showDocAiResult(body.revised);
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
      ? "Inserted Atlas's text."
      : verb === "remove"
        ? "Removed."
        : "Applied Atlas's edit."
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

// DOC-DIFF-BEGIN
//: **What changed between two versions of the same text.** Two surfaces ask
//: that question and they have to be asking it of the same object: the history
//: dialog ("what did this version say that the next one does not") and the AI
//: edit panel ("what is the model actually proposing"). A second diff written
//: for the second surface is exactly how the two would come to disagree about
//: what a change is, so there is one model here and both draw from it.
//:
//: **Lines, not words or characters.** A markdown document's unit of change is
//: a line: a paragraph is one line in this app's own documents, a list item is
//: one line, a table row is one line. A word-level diff inside a changed line
//: reads better and is deliberately not here: it needs a second model with its
//: own tokenisation and its own rendering, and the value of it is small next to
//: a first version that says which paragraphs moved.
//:
//: **No dependency, and none is needed.** The common prefix and suffix are
//: trimmed first, which is what makes the classic LCS table affordable: the
//: middle of a real edit is a few lines even in a long document. The cap below
//: is what stops the table being the size of two documents multiplied together
//: in the one case trimming does not help (a rewrite that shares no line with
//: what it replaced), and past it the honest answer is "this was replaced".
const DOC_DIFF_MAX_CELLS = 4000000;

//: The table is built from the end backwards so the walk that reads it can run
//: forwards, which is the order the rows are drawn in. `Uint32Array` rather
//: than nested arrays: one allocation, and a 2000x2000 middle is 16MB rather
//: than four million boxed numbers.
function docDiffLcs(a, b) {
  const n = a.length;
  const m = b.length;
  const width = m + 1;
  const table = new Uint32Array((n + 1) * width);
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      table[i * width + j] =
        a[i] === b[j]
          ? table[(i + 1) * width + j + 1] + 1
          : Math.max(table[(i + 1) * width + j], table[i * width + j + 1]);
    }
  }
  const ops = [];
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (a[i] === b[j]) {
      ops.push({ op: " ", text: a[i] });
      i++;
      j++;
    } else if (table[(i + 1) * width + j] >= table[i * width + j + 1]) {
      //: A removal before an addition whenever the table is indifferent, so a
      //: replaced line always reads as "- the old, + the new" rather than the
      //: two orders alternating down the same diff.
      ops.push({ op: "-", text: a[i] });
      i++;
    } else {
      ops.push({ op: "+", text: b[j] });
      j++;
    }
  }
  while (i < n) ops.push({ op: "-", text: a[i++] });
  while (j < m) ops.push({ op: "+", text: b[j++] });
  return ops;
}

//: `{op, text}` for every line of both texts, in reading order: `" "` unchanged,
//: `"-"` only in the older text, `"+"` only in the newer one.
function docDiffLines(before, after) {
  //: An empty text has no lines, not one empty line. `"".split("\n")` says
  //: `[""]`, which would draw the first version of a document as "one line
  //: removed, everything added": the removal is of a line that was never there.
  const a = docDiffSplit(before);
  const b = docDiffSplit(after);
  let start = 0;
  while (start < a.length && start < b.length && a[start] === b[start]) start++;
  let endA = a.length;
  let endB = b.length;
  while (endA > start && endB > start && a[endA - 1] === b[endB - 1]) {
    endA--;
    endB--;
  }
  const midA = a.slice(start, endA);
  const midB = b.slice(start, endB);
  let middle;
  if (!midA.length && !midB.length) middle = [];
  else if (!midA.length) middle = midB.map((text) => ({ op: "+", text }));
  else if (!midB.length) middle = midA.map((text) => ({ op: "-", text }));
  else if (midA.length * midB.length > DOC_DIFF_MAX_CELLS)
    middle = midA
      .map((text) => ({ op: "-", text }))
      .concat(midB.map((text) => ({ op: "+", text })));
  else middle = docDiffLcs(midA, midB);
  return a
    .slice(0, start)
    .map((text) => ({ op: " ", text }))
    .concat(middle, a.slice(endA).map((text) => ({ op: " ", text })));
}

function docDiffSplit(text) {
  const value = String(text == null ? "" : text);
  return value === "" ? [] : value.split("\n");
}

function docDiffStat(ops) {
  let added = 0;
  let removed = 0;
  for (const entry of ops) {
    if (entry.op === "+") added++;
    else if (entry.op === "-") removed++;
  }
  return { added, removed };
}

//: **A change and the lines around it, with the rest counted rather than
//: printed.** A diff of a long document that prints every unchanged line is a
//: copy of the document with some colour in it: the reader has to find the
//: change themselves, which is the work a diff exists to save. Two lines of
//: context either side is enough to say where a change is; everything else
//: becomes one `gap` row saying how many lines were skipped.
function docDiffRows(ops, context) {
  const pad = Number.isFinite(context) ? context : 2;
  //: Nothing changed is no rows at all, so "these two versions say the same
  //: thing" is a sentence the caller writes rather than a page of context with
  //: no change anywhere in it.
  if (!ops.some((entry) => entry.op !== " ")) return [];
  const keep = new Array(ops.length).fill(false);
  for (let i = 0; i < ops.length; i++) {
    if (ops[i].op === " ") continue;
    for (let k = Math.max(0, i - pad); k <= Math.min(ops.length - 1, i + pad); k++) keep[k] = true;
  }
  const rows = [];
  let skipped = 0;
  for (let i = 0; i < ops.length; i++) {
    if (!keep[i]) {
      skipped++;
      continue;
    }
    if (skipped) {
      rows.push({ op: "gap", skipped });
      skipped = 0;
    }
    rows.push(ops[i]);
  }
  if (skipped) rows.push({ op: "gap", skipped });
  return rows;
}

//: **Changes grouped the way a person accepts them**: one hunk is a run of
//: `+`/`-` lines with no unchanged line inside it. `docDiffApply` then rebuilds
//: the text with only the hunks it is given applied, which is what "accept or
//: reject per hunk" means in DOCUMENTS_PLAN Phase 5 item 3: a rejected hunk
//: leaves the *old* lines in place, it does not drop them.
function docDiffHunks(ops) {
  const hunks = [];
  let current = null;
  ops.forEach((entry, index) => {
    if (entry.op === " ") {
      current = null;
      return;
    }
    if (!current) {
      current = { from: index, to: index, added: 0, removed: 0 };
      hunks.push(current);
    }
    current.to = index;
    if (entry.op === "+") current.added++;
    else current.removed++;
  });
  return hunks;
}

function docDiffApply(ops, hunks, skipped) {
  const skip = skipped instanceof Set ? skipped : new Set(skipped || []);
  const rejected = new Set();
  hunks.forEach((hunk, index) => {
    if (!skip.has(index)) return;
    for (let i = hunk.from; i <= hunk.to; i++) rejected.add(i);
  });
  const out = [];
  ops.forEach((entry, index) => {
    const isRejected = rejected.has(index);
    if (entry.op === " ") out.push(entry.text);
    else if (entry.op === "+" && !isRejected) out.push(entry.text);
    else if (entry.op === "-" && isRejected) out.push(entry.text);
  });
  return out.join("\n");
}
// DOC-DIFF-END

//: **The one drawing of a diff in this app** (DESIGN.md's recipe index, "two
//: versions of the same text"). Both surfaces call this, and a second builder
//: is what `tests/test_document_diff.py` fails on: the history's diff and the
//: AI panel's proposal are the same object seen at two moments, and a reader
//: who has learned one has learned the other.
//:
//: The colour vocabulary is the app's existing `.diff-added` / `.diff-removed`
//: pair rather than a new one, so green-is-new and red-is-gone means the same
//: thing here as it does in the chat's before/after card. The layout is this
//: file's, because a diff of forty lines is a different shape from a
//: two-line preview.
function docRenderDiff(host, ops, options) {
  const opts = options || {};
  host.replaceChildren();
  host.classList.add("doc-diff", "diff-viewer");
  const rows = docDiffRows(ops, opts.context);
  if (!rows.length) {
    const same = document.createElement("p");
    same.className = "muted doc-diff-empty";
    same.textContent = opts.emptyText || "No change in the text.";
    host.appendChild(same);
    return host;
  }
  const hunks = opts.hunks || [];
  const skipped = opts.skipped instanceof Set ? opts.skipped : new Set();
  //: Which hunk an op belongs to, so a header can be drawn in front of its
  //: first line without the row loop having to search the hunk list per row.
  const hunkAt = new Map();
  hunks.forEach((hunk, index) => {
    for (let i = hunk.from; i <= hunk.to; i++) hunkAt.set(i, index);
  });
  let index = -1;
  let drawnHunk = -1;
  for (const row of rows) {
    if (row.op === "gap") {
      index += row.skipped;
      const gap = document.createElement("div");
      gap.className = "doc-diff-gap";
      gap.textContent =
        row.skipped === 1 ? "1 unchanged line" : `${row.skipped} unchanged lines`;
      host.appendChild(gap);
      continue;
    }
    index++;
    const hunkIndex = hunkAt.has(index) ? hunkAt.get(index) : -1;
    if (opts.onToggleHunk && hunkIndex !== -1 && hunkIndex !== drawnHunk) {
      drawnHunk = hunkIndex;
      host.appendChild(docDiffHunkHead(hunks[hunkIndex], hunkIndex, hunks.length, skipped, opts.onToggleHunk));
    }
    const line = document.createElement("div");
    line.className = "doc-diff-line";
    if (row.op === "+") line.classList.add("diff-added");
    else if (row.op === "-") line.classList.add("diff-removed");
    if (hunkIndex !== -1 && skipped.has(hunkIndex)) line.classList.add("is-skipped");
    const mark = document.createElement("span");
    mark.className = "doc-diff-mark";
    mark.setAttribute("aria-hidden", "true");
    mark.textContent = row.op === " " ? " " : row.op;
    const text = document.createElement("span");
    text.className = "doc-diff-text";
    //: An empty line is still a line: without the space it draws at zero
    //: height and a blank line added between two paragraphs is invisible in
    //: the one view whose job is to show exactly that.
    text.textContent = row.text === "" ? " " : row.text;
    line.append(mark, text);
    host.appendChild(line);
  }
  return host;
}

function docDiffHunkHead(hunk, index, total, skipped, onToggle) {
  const head = document.createElement("div");
  head.className = "doc-diff-hunk-head";
  const label = document.createElement("span");
  label.className = "muted doc-diff-hunk-label";
  const counts = [];
  if (hunk.added) counts.push(`+${hunk.added}`);
  if (hunk.removed) counts.push(`-${hunk.removed}`);
  label.textContent = `Change ${index + 1} of ${total} · ${counts.join(" ")}`;
  const toggle = document.createElement("button");
  toggle.type = "button";
  toggle.className = "ghost small doc-diff-hunk-toggle";
  const kept = !skipped.has(index);
  toggle.setAttribute("aria-pressed", kept ? "true" : "false");
  setLabel(toggle, kept ? "ph:check Keeping" : "ph:x Skipped");
  toggle.title = kept ? "Leave this change out" : "Put this change back in";
  toggle.addEventListener("click", () => onToggle(index));
  head.append(label, toggle);
  return head;
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
  docHistoryEntries = entries;
  docHistoryContent.clear();
  docHistoryOpenDiff = null;
  renderDocHistoryList();
}

//: The list is held rather than drawn straight from the response, because the
//: filter redraws it and the diff needs to know what came *after* a version:
//: a revision holds the text that something else replaced, so "what
//: changed here" is this row against the row above it, or against the document
//: as it stands for the newest one. That is the same walk `word_delta` makes on
//: the server, so the signed word count on a row and the diff under it can
//: never be describing two different pairs of versions.
let docHistoryEntries = [];
let docHistoryFilter = "all";
let docHistoryOpenDiff = null;
const docHistoryContent = new Map();

async function docRevisionText(id) {
  if (docHistoryContent.has(id)) return docHistoryContent.get(id);
  const full = await apiJson(`/documents/${currentDoc.id}/revisions/${id}`);
  const text = full.content || "";
  docHistoryContent.set(id, text);
  return text;
}

function renderDocHistoryList() {
  const list = $("doc-history-list");
  const empty = $("doc-history-empty");
  if (!list || !empty) return;
  docHistoryOpenDiff = null;
  const shown = docHistoryEntries.filter(
    (entry) => docHistoryFilter === "all" || (entry.source || "edit") === "ai"
  );
  list.replaceChildren();
  empty.classList.toggle("hidden", shown.length > 0);
  if (!shown.length) {
    //: The filter's empty state says which filter is on. "Nothing yet" under an
    //: AI filter on a document with forty hand edits is a lie about the
    //: document rather than a fact about the filter.
    empty.textContent =
      docHistoryFilter === "ai"
        ? "No AI edits in this document's history."
        : "Nothing yet: this document has not been changed since it was made.";
    return;
  }
  for (const entry of shown) list.appendChild(docHistoryRow(entry));
}

for (const button of document.querySelectorAll("#doc-history-filter [data-history-filter]")) {
  button.addEventListener("click", () => {
    docHistoryFilter = button.dataset.historyFilter || "all";
    for (const other of document.querySelectorAll("#doc-history-filter [data-history-filter]")) {
      other.setAttribute("aria-pressed", other === button ? "true" : "false");
    }
    renderDocHistoryList();
  });
}

function docHistoryRow(entry) {
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
  //: The diff opens inside the row rather than over it, which is this app's
  //: rule for a list you can act on without leaving it (DESIGN.md's recipe
  //: index): one row open at a time, the open row marked with `aria-current`,
  //: and nothing drawn over the content it is about.
  const diffBox = document.createElement("div");
  diffBox.className = "doc-history-diff hidden";
  text.append(line, meta, preview, diffBox);

  const changes = document.createElement("button");
  changes.type = "button";
  changes.className = "ghost small";
  changes.textContent = "Changes";
  changes.title = "What changed between this version and the one after it";
  changes.setAttribute("aria-expanded", "false");
  changes.addEventListener("click", () => toggleDocHistoryDiff(entry, row, changes, diffBox));

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
    $("doc-history-dialog").close();
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
      $("doc-history-dialog").close();
      toast("Restored. The version you had is in the history.");
    } catch (error) {
      toast(error.message || "Couldn't restore that version.", true);
    } finally {
      restore.disabled = false;
    }
  });

  const actions = document.createElement("span");
  actions.className = "row doc-history-actions";
  actions.append(changes, view, restore);
  row.append(icon, text, actions);
  return row;
}

async function toggleDocHistoryDiff(entry, row, button, box) {
  if (docHistoryOpenDiff && docHistoryOpenDiff.button !== button) {
    docHistoryOpenDiff.box.classList.add("hidden");
    docHistoryOpenDiff.box.replaceChildren();
    docHistoryOpenDiff.button.setAttribute("aria-expanded", "false");
    docHistoryOpenDiff.row.removeAttribute("aria-current");
    docHistoryOpenDiff = null;
  }
  if (button.getAttribute("aria-expanded") === "true") {
    box.classList.add("hidden");
    box.replaceChildren();
    button.setAttribute("aria-expanded", "false");
    row.removeAttribute("aria-current");
    docHistoryOpenDiff = null;
    return;
  }
  box.classList.remove("hidden");
  box.replaceChildren();
  const loading = document.createElement("p");
  loading.className = "muted";
  loading.textContent = "Loading…";
  box.appendChild(loading);
  button.setAttribute("aria-expanded", "true");
  row.setAttribute("aria-current", "location");
  docHistoryOpenDiff = { row, button, box };
  const index = docHistoryEntries.findIndex((other) => other.id === entry.id);
  const newer = index > 0 ? docHistoryEntries[index - 1] : null;
  try {
    const before = await docRevisionText(entry.id);
    //: The newest version's counterpart is the document as it stands in the
    //: editor, unsaved edits included: that is the text the reader is looking
    //: at behind this dialog, and a diff against the last *saved* text would
    //: describe a document nobody can see.
    const after = newer ? await docRevisionText(newer.id) : docSurface().text;
    const ops = docDiffLines(before, after);
    const stat = docDiffStat(ops);
    box.replaceChildren();
    const head = document.createElement("p");
    head.className = "muted text-sm doc-diff-head";
    const against = newer
      ? `the version from ${new Date(newer.created_at).toLocaleString()}`
      : "the document as it is now";
    head.textContent = `+${stat.added} −${stat.removed} lines, against ${against}.`;
    const view = document.createElement("div");
    box.append(head, view);
    docRenderDiff(view, ops, { emptyText: "The text is the same; only the title changed." });
  } catch (error) {
    box.replaceChildren();
    const failed = document.createElement("p");
    failed.className = "muted";
    failed.textContent = error.message || "Couldn't load that version.";
    box.appendChild(failed);
  }
}

$("doc-history")?.addEventListener("click", openDocHistory);
//: The AI assistant's own model. `openFeatureModelSheet` lives in app.js,
//: which loads first, and is the same sheet the Chat tab and the writing desk
//: open: one picker, three ways in.
$("doc-ai-model")?.addEventListener("click", () => window.openFeatureModelSheet?.("documents"));

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
  //: A hidden list has no scroll position to correct, so the mark made while
  //: the Documents tab was showing could not bring its row into view. Asked
  //: again on the way in, when the outline has a box.
  if (wanted === "outline") {
    docOutlineMarked = -1;
    markDocOutline();
    //: The comments section is in this tab and is drawn from the document's own
    //: text on every facts pass, so the same argument applies to it: a hidden
    //: list has nothing to draw into, and the pass that ran while the Documents
    //: tab was showing left it with nothing in it.
    renderDocComments();
  }
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
//: Registered through the adapter rather than on the element, so the same
//: line serves whichever engine is underneath. `mountDocEditor` says it
//: again for the view it builds: a handler registered on the fallback's DOM
//: cannot follow the document into CodeMirror.
docSurface().onChange(docSurfaceInput);
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

//: **The phone bar's "/" button** (DOCUMENTS_PLAN Phase 6 item 1). The six
//: buttons beside it are `data-md` and need no code at all; this one has to
//: type the character, because the slash menu is `editor.js`'s and it opens
//: off what the writer typed rather than off a call: `editorTokenAt` wants a
//: "/" with whitespace or a line start in front of it, and every other way in
//: (calling `editorOpenMenu` directly) would leave the menu open over a
//: document with no "/" in it to remove when an item runs.
//:
//: Through `docReplaceRange`, which is the engine's own transaction, so the
//: update listener calls `editorHandleInput` exactly as it does for a typed
//: character; on the fallback textarea the same helper goes through
//: `execCommand` and `finishMarkdownEdit` raises the `input` event editor.js
//: listens for.
function openDocPhoneInsert() {
  const box = docSurfaceById("doc-content");
  if (!box) return;
  box.focus();
  const { selectionStart: start, selectionEnd: end, value } = box;
  const before = start === 0 ? "\n" : value[start - 1];
  const insert = /\s/.test(before) ? "/" : " /";
  docReplaceRange(box, start, end, insert);
  box.setSelectionRange(start + insert.length, start + insert.length);
  finishMarkdownEdit(box, "doc-content");
  //: And then again, by hand, because of *when* the engine reports a change.
  //: `docCmUpdate` calls `editorHandleInput` while the transaction that
  //: inserted the "/" is still the current update, and the caret is then
  //: still in front of it: `editorTokenAt` looks only at the text before the
  //: selection, finds no slash, and the menu never opens. Measured: the
  //: character landed and nothing happened. The caret is set above, so this
  //: second call is the one that has a token to find.
  if (typeof editorHandleInput === "function") editorHandleInput(box);
}

$("doc-phone-insert").addEventListener("click", openDocPhoneInsert);

// NOTE-SURFACE-BEGIN
//: =========================================================================
//: One editor everywhere (DOCUMENTS_PLAN Phase 8)
//: =========================================================================
//:
//: The owner: "anywhere there is a note related capture, edit or view area
//: with a text box to integrate features similar to the documents upgrade.
//: The editors need to be consistent in form and function." Before this, five
//: note editors had five feature sets, and only the document had the engine.
//:
//: **The textarea stays.** It is the form's value carrier, the thing every
//: existing handler, save path and test holds, and the fallback if the bundle
//: never loads. What changes is that a CodeMirror view is mounted beside it
//: and the two are kept in step in both directions: the view's text is
//: mirrored into the textarea (with an `input` event, because the draft save,
//: the character count and the autosize all hang off one), and a script that
//: writes `box.value` is pushed back into the view through an own-property
//: setter on that one element. Without that second direction a note saved
//: from the capture box would clear the textarea and leave the words on
//: screen.
//:
//: **The textarea is not hidden, it is laid over the view at zero opacity.**
//: `display: none` would have been simpler and wrong in two ways that only a
//: browser shows: `setSelectionRange` on an unrendered textarea is a no-op in
//: some engines, and every popup that positions itself off the textarea's own
//: rectangle (app.js's `[[` suggest is the one that matters) would open at
//: 0,0. Laid over the view, its rectangle is the editor's rectangle and its
//: selection is real.
//:
//: **Mounted on the first focus**, once per element: a capture box that
//: nobody clicks costs nothing, and the bundle is fetched once per page
//: whichever surface asks for it first.
const NOTE_SURFACE_DEFAULTS = { size: "box", live: true };

//: The note editors, by the id of their textarea. A table rather than a call
//: at each site, because three of these boxes are built in script in another
//: file and a delegated focus listener reaches those the same way it reaches
//: the ones in the page. `tests/test_note_surface.py` is the lint that a note
//: textarea is in here.
const NOTE_SURFACES = {
  //: Capture, the most used text box in the app.
  "entry-content": { size: "box", live: true },
  //: The note edit form (`renderEditForm`), rebuilt per edit, which is why
  //: the listener is delegated rather than bound at boot.
  "entry-edit-content": { size: "inline", live: true },
  //: The graph's own two note boxes (Phase 8b): the node popup's editor and
  //: the new-note box beside it. Both are note text, and both had a bare
  //: textarea.
  "graph-popup-content": { size: "box", live: true },
  "graph-new-content": { size: "box", live: true },
  //: Write with the AI (Phase 8b). The draft is note text and gets Live; the
  //: thoughts pane above it is a scratch pad for what you want to say, so it
  //: gets the engine (undo, the "/" menu, one behaviour) without the
  //: rendering, which is the plan's own split.
  "draft-text": { size: "box", live: true },
  "draft-thoughts": { size: "box", live: false },
  //: A concept map card's text (Phase 8c, the board half), opened by
  //: `wbEditNodeText` in whiteboard.js. It is a single idea, so Enter
  //: commits and Escape abandons: the card hands those in as
  //: `host.noteSurfaceKeys`, which go ahead of every other chord here.
  "wb-card-editor": { size: "inline", live: true },
};

//: element -> view. Weak, because the edit form's textarea is thrown away and
//: rebuilt on every edit and a strong map would hold every one of them.
const noteSurfaceViews = new WeakMap();
let noteSurfaceMirroring = false;

//: The surface for a note editor, given its textarea or any node inside its
//: view. Null for anything that has not mounted, which is what keeps
//: `asSurface` falling back to the textarea adapter.
function noteSurfaceFor(box) {
  if (!box) return null;
  if (box instanceof HTMLTextAreaElement) {
    const view = noteSurfaceViews.get(box);
    return view ? cmSurface(view, noteSurfaceMeta(box)) : null;
  }
  if (box instanceof Node && box.nodeType === 1 && box.closest) {
    const wrap = box.closest(".note-surface");
    if (wrap && wrap.noteSurfaceHost) return noteSurfaceFor(wrap.noteSurfaceHost);
  }
  return null;
}

//: Built once per host and kept on the element, so `cmSurface`'s own cache
//: (keyed by the view) never sees two different identities for one view.
function noteSurfaceMeta(host) {
  if (!host.noteSurfaceMeta) {
    host.noteSurfaceMeta = { id: host.id, changeHandlers: [] };
  }
  return host.noteSurfaceMeta;
}

//: What the engine gives a note box. Deliberately smaller than the document's
//: set: no gutter, no folding, no find panel, no autosave, no typewriter.
//: What it shares is everything the owner's "consistent in form and function"
//: is about, the Live decorations, the markdown grammar, undo, the selection,
//: and this app's own theme and chords.
function noteSurfaceExtensions(CM, host, options) {
  return [
    options.live ? docLiveExtensions(CM) : [],
    //: **No findings plugin here, and that is the option the plan names
    //: rather than an omission.** `docProseFound` is the *document's* list of
    //: prose findings, at the document's offsets; drawn over a note it would
    //: underline whatever words happened to sit at those positions. The
    //: checker for note text is its own piece of work (Phase 8's `findings`
    //: option), not a plugin reused at the wrong offsets.
    CM.view.EditorView.lineWrapping,
    //: The GitHub dialect, the same call the document makes: `markdown()`
    //: alone is commonmark and every tree-based decoration (bold, headings,
    //: task boxes) would silently draw nothing.
    docCmLanguageFor(CM, "md"),
    CM.view.highlightSpecialChars(),
    CM.commands.history(),
    CM.view.drawSelection(),
    CM.view.dropCursor(),
    CM.language.indentOnInput(),
    CM.language.syntaxHighlighting(CM.language.defaultHighlightStyle, { fallback: true }),
    CM.language.bracketMatching(),
    docCmTheme(CM),
    docCmHighlight(CM),
    CM.view.placeholder(host.placeholder || ""),
    //: This app's chords first, so Ctrl+B is bold in a note for the same
    //: reason it is bold in a document.
    CM.view.keymap.of([
      //: The host's own keys first (Phase 8c): a box whose Enter means "done"
      //: says so on the element, and a table row cannot carry a closure over
      //: the one card being edited.
      ...(Array.isArray(host.noteSurfaceKeys) ? host.noteSurfaceKeys : []),
      ...noteSurfaceKeymap(host),
      ...CM.commands.historyKeymap,
      ...CM.commands.defaultKeymap,
    ]),
    CM.view.EditorView.updateListener.of((update) => noteSurfaceUpdate(host, update)),
  ];
}

//: **The document's chords, aimed at this box.** `docCmKeymap` cannot be
//: reused as it is: every one of its entries is written against
//: `doc-content`, so Ctrl+B in a note would have emboldened a word in
//: whatever document was last open, and Ctrl+S would have saved it. The
//: helpers underneath all take a box id or a surface already, so this is the
//: same four actions with this box named. Ctrl+S and Ctrl+F are deliberately
//: absent: a note has no find panel and saving one is the form's business,
//: which the app's own global chord already handles.
function noteSurfaceKeymap(host) {
  const surface = () => noteSurfaceFor(host) || textareaSurface(host);
  return [
    {
      key: "Tab",
      run: () => {
        indentDocSelection(surface(), false);
        return true;
      },
    },
    {
      key: "Shift-Tab",
      run: () => {
        if (!docCanOutdent(surface())) return false;
        indentDocSelection(surface(), true);
        return true;
      },
    },
    { key: "Mod-b", run: () => { wrapDocSelection("**", "bold text", host.id); return true; } },
    { key: "Mod-i", run: () => { wrapDocSelection("*", "italic text", host.id); return true; } },
    { key: "Mod-e", run: () => { wrapDocSelection("`", "", host.id); return true; } },
    { key: "Mod-Shift-s", run: () => { wrapDocSelection("~~", "struck through", host.id); return true; } },
    { key: "Mod-1", run: () => { applyMarkdown("h1", host.id); return true; } },
    { key: "Mod-2", run: () => { applyMarkdown("h2", host.id); return true; } },
    { key: "Mod-3", run: () => { applyMarkdown("h3", host.id); return true; } },
    //: No Ctrl+/ here: in a note it is the blocks menu (the registry's
    //: `editorMenu`), and a comment toggle bound here as well wrapped the
    //: line in the *document's* comment marker before the menu wrote "/"
    //: over it (INBOX 402).
  ];
}

//: The view changed: mirror it out, and run the pipelines a typed character
//: would have run in the textarea.
function noteSurfaceUpdate(host, update) {
  const view = update.view;
  if (update.docChanged || update.selectionSet) noteSurfaceMirror(host, view);
  if (!update.docChanged) return;
  const surface = noteSurfaceFor(host);
  const meta = noteSurfaceMeta(host);
  for (const fn of meta.changeHandlers) fn();
  //: editor.js hangs "/" and `[[` off a DOM `input` event, which the engine
  //: never raises for a typed character (the same call `docCmUpdate` makes
  //: for the document, and for the same reason).
  if (typeof editorHandleInput === "function") editorHandleInput(surface);
}

function noteSurfaceMirror(host, view) {
  const text = view.state.doc.toString();
  const range = view.state.selection.main;
  noteSurfaceMirroring = true;
  try {
    const changed = host.value !== text;
    if (changed) host.value = text;
    //: Selection too, and on every update rather than only on a change:
    //: app.js's `[[` suggest and "ask about the selection" both read
    //: `selectionStart` off this element.
    try {
      host.setSelectionRange(Math.min(range.from, text.length), Math.min(range.to, text.length));
    } catch (error) {
      //: Some engines refuse a selection on a box that is not rendered. The
      //: layering above is what makes this rare rather than routine, and a
      //: refusal is not a reason to drop the text.
    }
    if (changed) host.dispatchEvent(new Event("input", { bubbles: true }));
  } finally {
    noteSurfaceMirroring = false;
  }
}

//: The other direction: `box.value = ""` from script (a note saved, a draft
//: loaded, a template applied) has to reach the view, and assigning to
//: `.value` raises no event anyone can listen for. An own property on this
//: one element, wrapping the prototype's own accessors, is the only hook the
//: platform offers; it is installed at mount and leaves every other textarea
//: in the app untouched.
function noteSurfaceOwnValue(host, view) {
  const proto = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value");
  if (!proto || !proto.set) return;
  Object.defineProperty(host, "value", {
    configurable: true,
    get() {
      return proto.get.call(this);
    },
    set(next) {
      proto.set.call(this, next);
      if (noteSurfaceMirroring) return;
      const current = view.state.doc.toString();
      if (next === current) return;
      view.dispatch({ changes: { from: 0, to: current.length, insert: String(next) } });
    },
  });
  //: **And the selection, which is the half that looks like it works.**
  //: `box.setSelectionRange(6, 11)` then "make that bold" is how several
  //: callers here select a word before acting on it (the shared toolbar
  //: table, "improve this", the note sweeps). Written on the textarea alone
  //: it moves a selection nobody can see, and the action then runs against
  //: whatever the *view's* caret happened to be: measured, bold arrived at
  //: position 0 with its placeholder text instead of around the word.
  const setRange = host.setSelectionRange.bind(host);
  host.setSelectionRange = (from, to, direction) => {
    setRange(from, to, direction);
    if (noteSurfaceMirroring) return;
    const length = view.state.doc.length;
    const anchor = Math.max(0, Math.min(Number(from) || 0, length));
    const head = Math.max(0, Math.min(Number(to == null ? from : to) || 0, length));
    view.dispatch({ selection: { anchor, head } });
  };
  for (const name of ["selectionStart", "selectionEnd"]) {
    const own = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, name);
    if (!own || !own.set) continue;
    Object.defineProperty(host, name, {
      configurable: true,
      get() {
        return own.get.call(this);
      },
      set(at) {
        own.set.call(this, at);
        if (noteSurfaceMirroring) return;
        host.setSelectionRange(this.selectionStart, this.selectionEnd);
      },
    });
  }
  //: And `box.focus()`, which a dozen call sites use to put the caret in a
  //: note box: the textarea is invisible and would take the keystrokes.
  const focus = host.focus.bind(host);
  host.focus = (...args) => {
    if (noteSurfaceViews.has(host)) view.focus();
    else focus(...args);
  };
}

//: Mount the engine for one note textarea. Returns the surface, or the
//: textarea's own surface if the bundle is not available: every caller can
//: carry on either way, which is the whole point of the adapter.
async function mountNoteSurface(host, options = {}) {
  if (!host || noteSurfaceViews.has(host)) return noteSurfaceFor(host) || textareaSurface(host);
  if (docCmBroken) return textareaSurface(host);
  const settings = { ...NOTE_SURFACE_DEFAULTS, ...options };
  let CM = null;
  try {
    CM = await loadCodeMirror();
  } catch (error) {
    return textareaSurface(host);
  }
  if (!CM || noteSurfaceViews.has(host)) return noteSurfaceFor(host) || textareaSurface(host);
  //: Read before the wrapper below moves the textarea: moving a focused
  //: element in the DOM blurs it, so by the time the view exists the answer
  //: is always "no".
  const hadFocus = document.activeElement === host;
  //: **A box its own layout was stretching has to go on being stretched, and
  //: the wrapper is what the layout can see now** (INBOX 240, the owner: "when
  //: I clicked on the 'your thoughts' text box in the write with ai notes
  //: subtab, the box instantly shortened in height from what it was. same with
  //: the 'the draft' textbox as well").
  //:
  //: Measured on :8802 with `scratchpad/ui-sweeps/draftboxes.js`: both Writing
  //: Room boxes were 330.3px tall and came back 146px on the first focus, a
  //: loss of 184.3px each. Nothing shrank them. `.draft-column` is a flex
  //: column and `.draft-column textarea` is `flex: 1 1 auto`, so the box was
  //: taking the column's slack; one line below, the textarea is no longer a
  //: child of the column at all, this wrapper is, and a `div` with no flex
  //: declaration is `flex: 0 1 auto`, i.e. as tall as its content, which is
  //: `.note-surface-box`'s own `min-height: 9rem` (144px) plus the padding.
  //:
  //: So the wrapper takes the role rather than the number: a host that was a
  //: growing item of a flex parent hands that over, and the stretch rules in
  //: 09-editor.css let the editor fill the height instead of capping it. Read
  //: before the move, because one line later the parent is this wrapper.
  //: General rather than a `#draft-thoughts` rule: every note box in
  //: `NOTE_SURFACES` is somewhere a layout may stretch, and the next one added
  //: would hit this the same way with nothing to warn it.
  const hostStyle = getComputedStyle(host);
  const parent = host.parentNode;
  const parentStyle = parent instanceof Element ? getComputedStyle(parent) : null;
  const stretched =
    !!parentStyle &&
    (parentStyle.display === "flex" || parentStyle.display === "inline-flex") &&
    Number(hostStyle.flexGrow) > 0;
  const wrap = document.createElement("div");
  wrap.className = `note-surface note-surface-${settings.size}${stretched ? " note-surface-stretch" : ""}`;
  //: **And the floor moves with it.** A stretching item is only as tall as the
  //: row lets it be, and what stops the row itself collapsing is the box's own
  //: `min-height` (`.draft-column textarea` declares 11rem, "the floor is four
  //: lines"). Left behind on the invisible mirror, the stretch rules made
  //: things worse rather than better: measured with the class and without this
  //: line, the draft column fell from 477.8px to 179.9 and its box to 42,
  //: because nothing in the column had an intrinsic height any more. Carried
  //: as an inline length because it is this box's number, not a rule anything
  //: else should inherit.
  //:
  //: **And the height it was already drawn at is the basis, not a fresh
  //: guess.** `flex: 1 1 auto` sizes an item from its content, and a textarea's
  //: content height is its `rows` attribute (7 and 14 here, 189.2px and
  //: 330.3px measured); an editor view has no such thing, so the row it is in
  //: has nothing to be tall for. With the class and the floor alone the draft
  //: column still fell from 477.8px to 314 and its box to 176, the floor
  //: exactly. Handing the wrapper the host's own measured height as its
  //: `flex-basis` is what carries the `rows` across: the item asks the row for
  //: the height it already had, and grows or shrinks from there like any other.
  if (stretched) {
    const drawn = host.getBoundingClientRect().height;
    if (drawn > 0) wrap.style.flexBasis = `${Math.round(drawn)}px`;
    const floor = Number.parseFloat(hostStyle.minHeight);
    if (Number.isFinite(floor) && floor > 0) wrap.style.minHeight = `${floor}px`;
  }
  wrap.noteSurfaceHost = host;
  host.parentNode.insertBefore(wrap, host);
  wrap.appendChild(host);
  host.classList.add("note-surface-mirror");
  host.setAttribute("tabindex", "-1");
  host.setAttribute("aria-hidden", "true");
  //: **Seeded here, not at the focus that asked for the mount.** The bundle
  //: takes a moment on the first box of a page, and a person who clicks a
  //: capture box types into it immediately: those characters go into the
  //: textarea, and both the text *and* the caret have moved by the time this
  //: runs. Reading them now is what keeps them. Measured with the caret taken
  //: at focus time instead: typing "hello world" straight after the click
  //: left "worldhello " in the box, because the caret was put back to 0 after
  //: the first characters had already landed.
  //: Both ends of it, not just the caret: a caller that selected a word and
  //: then acted on it (the shared toolbar does exactly that) would otherwise
  //: have its selection collapsed to the start by the mount, and the action
  //: would insert a placeholder where the word was.
  const length = host.value.length;
  const from = Math.min(host.selectionStart ?? length, length);
  const to = Math.min(host.selectionEnd ?? from, length);
  const state = CM.state.EditorState.create({
    doc: host.value,
    selection: { anchor: from, head: to },
    extensions: noteSurfaceExtensions(CM, host, settings),
  });
  const view = new CM.view.EditorView({ state, parent: wrap });
  //: The same guard the document's own host carries: the app binds single
  //: characters as global shortcuts ("/" focuses search), and a
  //: contenteditable is not a textarea, so nothing else stops them. Measured
  //: without it: typing "/" in a note put no slash in the note.
  docGuardGlobalShortcuts(view.contentDOM);
  noteSurfaceViews.set(host, view);
  noteSurfaceOwnValue(host, view);
  //: A box that had the focus keeps it through its own upgrade. The editor
  //: mounts over the textarea the first time the section shows, and the
  //: textarea then loses focus to nothing (measured in Chromium: focus in
  //: on the textarea at 537ms after the phone's + was pressed, focus out
  //: with no related target at 679ms, the body active at 1200ms). The
  //: caret a person just asked for is the one thing the upgrade must not
  //: drop, so it goes where the words now go.
  if (hadFocus) view.focus();
  //: The "/" menu's table is keyed by surface id, and these boxes are in it
  //: already or are added here: one line rather than a wiring change, which
  //: is the shape editor.js's own comment asks for.
  if (typeof EDITOR_SURFACES === "object" && EDITOR_SURFACES && !(host.id in EDITOR_SURFACES)) {
    EDITOR_SURFACES[host.id] = "note";
  }
  return cmSurface(view, noteSurfaceMeta(host));
}

//: One delegated listener for every note box in the app, including the three
//: that are built in script when a card opens. `focusin` rather than `focus`
//: because it bubbles, and the focus is handed to the view the moment it
//: exists so the keystroke that opened the box is not lost.
document.addEventListener("focusin", (event) => {
  const host = event.target;
  if (!(host instanceof HTMLTextAreaElement)) return;
  const options = NOTE_SURFACES[host.id];
  if (!options || noteSurfaceViews.has(host)) return;
  mountNoteSurface(host, options).then((surface) => {
    if (!surface || surface.kind !== "codemirror") return;
    surface.focus();
  });
});
// NOTE-SURFACE-END

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
for (const button of document.querySelectorAll("#doc-view-seg [data-doc-view], #doc-view-menu [data-doc-view]")) {
  // The unmodified title is stashed before syncDocFileType ever overwrites it
  // with the "no rendered form" explanation, so switching back to a markdown
  // document restores the real one rather than leaving the disabled text.
  button.dataset.docTitle = button.title;
  button.addEventListener("click", () =>
    setDocView(button.dataset.docViewGroup === "edit" ? lastEditView : button.dataset.docView)
  );
}

//: **A second door onto the line numbers, in the menu that is already about
//: how the document is shown.** The owner: "if I select a txt document,
//: and/or other code file document, and these can have line numbers as well."
//: They could, and the only control that said so lived on the formatting
//: strip, which PLAN.md D1 collapsed by default for good reasons that had
//: nothing to do with this. A preference nobody can find is a preference the
//: app does not have.
//:
//: The same `setDocGutter`, so this and the strip's button are two views of
//: one remembered choice rather than two settings; `applyDocGutter` writes
//: both their pressed states back.
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
  //: **A phone opens a document to read it** (UI_MODERNISATION_PLAN Phase
  //: 11 item 6). Nothing stored means the width decides: Rendered below 600,
  //: Live Preview above, and a stored choice still wins at every width.
  setDocView(
    localStorage.getItem(DOC_VIEW_KEY)
      || (window.matchMedia("(max-width: 599.98px)").matches ? "rendered" : "live")
  );
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

//: **Reading and focus: three preferences about the act of writing**
//: (DOCUMENTS_PLAN Phase 5 item 4, PLAN D9). They are one block because they
//: answer one question, "what should be in front of me while I write this",
//: and because two of them are the same mistake apart: a mode that changes
//: what the editor *shows* and one that changes where it *puts* the line you
//: are on.
//:
//: Named apart from `toggleDocFocus`, which hides the app's chrome and is a
//: mode for right now. These three are remembered, because they are the shape
//: of somebody's writing habit rather than a thing they did once, and none of
//: them can leave the document unreachable: the caret's own paragraph is never
//: dimmed, the centred line is still the line you are typing on, and the serif
//: is a face, not a layout.
const DOC_DIM_KEY = "doc-dim-others";
const DOC_TYPEWRITER_KEY = "doc-typewriter";
const DOC_SERIF_KEY = "doc-serif";

let docDimOthers = false;
let docTypewriter = false;
let docReadingPluginCache = null;

//: The block, by the same rule the rest of this file uses: the run of
//: non-blank lines around the caret. A heading with a paragraph under it is
//: two blocks, which is what a person means by "the paragraph I am in", and a
//: list is dimmed item by item for the same reason.
function docReadingPlugin(CM) {
  if (docReadingPluginCache) return docReadingPluginCache;
  const { Decoration, ViewPlugin } = CM.view;

  function build(view) {
    if (!docDimOthers) return Decoration.none;
    const doc = view.state.doc;
    let first = doc.lineAt(view.state.selection.main.head).number;
    let last = first;
    while (first > 1 && doc.line(first - 1).text.trim() !== "") first--;
    while (last < doc.lines && doc.line(last + 1).text.trim() !== "") last++;
    const ranges = [];
    //: Only what is on screen, like the findings plugin beside it: a 20,000
    //: word document would otherwise build a decoration per line on every
    //: arrow key.
    for (const range of view.visibleRanges) {
      const from = doc.lineAt(range.from).number;
      const to = doc.lineAt(range.to).number;
      for (let n = from; n <= to; n++) {
        if (n >= first && n <= last) continue;
        ranges.push(Decoration.line({ class: "cm-doc-dimmed" }).range(doc.line(n).from));
      }
    }
    return Decoration.set(ranges, true);
  }

  docReadingPluginCache = ViewPlugin.fromClass(
    class {
      constructor(view) {
        this.decorations = build(view);
      }
      update(update) {
        if (update.docChanged || update.selectionSet || update.viewportChanged) {
          this.decorations = build(update.view);
        }
      }
    },
    { decorations: (plugin) => plugin.decorations }
  );
  return docReadingPluginCache;
}

//: **Typewriter scrolling**, as an update listener rather than a second
//: plugin: it changes no decoration, it moves the viewport. The frame's delay
//: is not a nicety, a dispatch from inside an update is re-entrant and
//: CodeMirror refuses it; by the next frame the update has finished and the
//: measurement the scroll needs is the one that is actually on screen.
function docTypewriterExtension(CM) {
  const { EditorView } = CM.view;
  return EditorView.updateListener.of((update) => {
    if (!docTypewriter) return;
    if (!update.selectionSet && !update.docChanged) return;
    const view = update.view;
    requestAnimationFrame(() => {
      if (!docTypewriter || view !== docCmView) return;
      view.dispatch({
        effects: EditorView.scrollIntoView(view.state.selection.main.head, { y: "center" }),
      });
    });
  });
}

function applyDocDim(on) {
  docDimOthers = on;
  const button = $("doc-dim-others");
  if (button) {
    button.setAttribute("aria-pressed", String(on));
    button.title = on
      ? "Show the whole document again"
      : "Fade everything except the paragraph the caret is in";
  }
  const CM = window.CM6;
  if (docCmView && CM && docCmParts.reading) {
    docCmView.dispatch({
      effects: docCmParts.reading.reconfigure(on ? docReadingPlugin(CM) : []),
    });
  }
}

function applyDocTypewriter(on) {
  docTypewriter = on;
  const button = $("doc-typewriter");
  if (button) {
    button.setAttribute("aria-pressed", String(on));
    button.title = on
      ? "Let the page scroll the way it normally does"
      : "Keep the line you are typing on in the middle of the pane";
  }
  if (on && docCmView && window.CM6) {
    const { EditorView } = window.CM6.view;
    docCmView.dispatch({
      effects: EditorView.scrollIntoView(docCmView.state.selection.main.head, { y: "center" }),
    });
  }
}

//: The rendered pane only. A serif is for reading a finished page; the editor
//: is where markers, code fences and tables live, and those are the one place
//: a monospaced or neutral face is doing real work.
function applyDocSerif(on) {
  $("tab-documents")?.classList.toggle("doc-serif", on);
  const button = $("doc-serif");
  if (button) {
    button.setAttribute("aria-pressed", String(on));
    button.title = on ? "Back to the app's own face" : "Read the rendered page in a serif";
  }
}

function docRememberReading(key, on, apply) {
  try {
    localStorage.setItem(key, on ? "1" : "0");
  } catch {
    // A private window can refuse storage; the mode still applies for now.
  }
  apply(on);
}

$("doc-dim-others")?.addEventListener("click", () =>
  docRememberReading(DOC_DIM_KEY, !docDimOthers, applyDocDim)
);
$("doc-typewriter")?.addEventListener("click", () =>
  docRememberReading(DOC_TYPEWRITER_KEY, !docTypewriter, applyDocTypewriter)
);
$("doc-serif")?.addEventListener("click", () =>
  docRememberReading(
    DOC_SERIF_KEY,
    !$("tab-documents")?.classList.contains("doc-serif"),
    applyDocSerif
  )
);

function docRestoreReading() {
  let dim = false;
  let typewriter = false;
  let serif = false;
  try {
    dim = localStorage.getItem(DOC_DIM_KEY) === "1";
    typewriter = localStorage.getItem(DOC_TYPEWRITER_KEY) === "1";
    serif = localStorage.getItem(DOC_SERIF_KEY) === "1";
  } catch {
    // Nothing stored, nothing remembered: the defaults below are all off.
  }
  applyDocDim(dim);
  applyDocTypewriter(typewriter);
  applyDocSerif(serif);
}

docRestoreReading();

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
$("doc-export-html").addEventListener("click", exportDocumentHtml);
$("doc-export-zip").addEventListener("click", exportDocumentBundle);
$("doc-export-docx").addEventListener("click", exportDocumentDocx);
$("doc-export-pdf").addEventListener("click", exportDocumentPdf);
$("doc-delete").addEventListener("click", deleteCurrentDocument);
$("doc-attach-bookmark").addEventListener("click", attachBookmarkToDocument);
$("doc-ai").addEventListener("click", openDocAiPanel);
//: A code document's Format: the selection when there is one, else the
//: whole file (`docFormatCode`). The press takes the focus from the editor,
//: so it is handed back: formatting is a step in the middle of typing.
$("doc-code-format").addEventListener("click", async () => {
  await docFormatCode("auto");
  docCmView?.focus();
});
$("doc-ai-close").addEventListener("click", closeDocAiPanel);
$("doc-ai-cancel").addEventListener("click", closeDocAiPanel);
$("doc-ai-run").addEventListener("click", runDocAiEdit);
$("doc-ai-cancel-run").addEventListener("click", () => docAiController?.abort());
$("doc-ai-accept").addEventListener("click", acceptDocAiEdit);
$("doc-ai-instruction").addEventListener("keydown", (e) => {
  if (e.key === "Enter") { e.preventDefault(); runDocAiEdit(); }
});
for (const radio of document.querySelectorAll('input[name="doc-ai-verb"]')) {
  radio.addEventListener("change", docAiVerbChanged);
}
$("doc-ai-history").addEventListener("click", openDocAiHistory);
$("doc-extract").addEventListener("click", openDocExtractPreview);
docBoxEl().addEventListener("keydown", (event) => {
  // The fallback textarea's half of the Escape-then-Tab hatch, the same rule
  // the engine's keymap states (`docTabEscapes`), because which of the two
  // surfaces is mounted is not something a writer knows or should have to.
  if (event.key === "Escape") docTabEscapes = true;
  else if (event.key !== "Tab" && event.key !== "Shift") docTabEscapes = false;
  if (event.key === "Escape" && !$("doc-find-bar").classList.contains("hidden")) {
    toggleDocFindBar(false);
    return;
  }
  // Tab indents rather than leaving the field, in prose as well as in code.
  // An Escape immediately before it hands the key back to the browser, which
  // is the way out; `docTabEscapes` carries the whole reasoning.
  if (event.key === "Tab" && !event.shiftKey) {
    if (docTakeTabEscape()) return;
    event.preventDefault();
    indentDocSelection(docSurface(), false);
    return;
  }
  if (event.key === "Tab" && event.shiftKey) {
    if (docTakeTabEscape()) return;
    const box = docSurface();
    // Shift+Tab dedents when there is something to dedent, and otherwise
    // falls through to the browser's own focus-backwards: so a flush-left
    // caret is not a keyboard trap even for someone who never learns the
    // Escape chord.
    if (docCanOutdent(box)) {
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
//: The default flipped from "row" to "wrap" on 2026-09-09 (see `.doc-toolbar`
//: in 05-sidebars-themes.css), but a value saved before that still reads
//: "row" from storage and renders the crushed single-line strip forever,
//: which is exactly the "still gets clipped" report repeating on a build
//: that already carries the fix. Migrated once: a bare stored "row" with no
//: migration flag is the pre-2026-09-09 default, not a deliberate choice,
//: so it is cleared back to the new default rather than honoured.
const DOC_TOOLBAR_MODE_MIGRATED_KEY = "doc-toolbar-mode-migrated-2026-09-09";

function docToolbarMode() {
  try {
    const stored = localStorage.getItem(DOC_TOOLBAR_MODE_KEY);
    if (stored === "row" && !localStorage.getItem(DOC_TOOLBAR_MODE_MIGRATED_KEY)) {
      localStorage.removeItem(DOC_TOOLBAR_MODE_KEY);
      localStorage.setItem(DOC_TOOLBAR_MODE_MIGRATED_KEY, "1");
      return "wrap";
    }
    return stored === "row" ? "row" : "wrap";
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
  //: Plain numbers itself, like a code file does. Asked for directly:
  //: "on the plain txt editor, they should show by default but be togglable
  //: in the toolbar." Only the *default* moves: an explicit "0" above still
  //: wins, so turning them off in Plain turns them off and stays off. Plain
  //: is the view with no grammar and no decorations (docCmViewLanguage), so
  //: the numbers are the only structure left to navigate by, which is why
  //: this is the one view whose default differs from prose's.
  if (typeof docView !== "undefined" && docView === "plain") return true;
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
  const selected = range.to - range.from;
  //: **Words in the selection, not just characters.** Asked for: "I want
  //: more utility in the documents editor like being able to highlight a
  //: paragraph or set of text and see the amount of words". It belongs on
  //: this line rather than beside the document's own totals, because this
  //: is the half of the status bar that reruns on every selection change;
  //: `renderDocCounts` is deliberately debounced behind `scheduleDocFacts`
  //: and a selection count that lagged the selection would be worse than
  //: none. Counted only when there is a selection to count, so the common
  //: case (a caret, no range) still does no work at all.
  const words = selected ? (box.text.slice(range.from, range.to).match(/\S+/g) || []).length : 0;
  return {
    line: line.number,
    column: range.from - line.from + 1,
    selected,
    selectedWords: words,
  };
}

//: **A status line's words are changed in place, never replaced.** Traced
//: while typing into a 400-word document (scratchpad/ui-sweeps/scrolltrace.js,
//: SCENE=typing-doc): every keystroke restyled the whole editor, 220 elements
//: at 6 to 9ms a time, and the invalidation tracking named the cause as the
//: caret readout's `textContent` write. Setting `textContent` removes the
//: text node and inserts a new one, and an inserted node is a structural
//: change that every `:has()` rule over an ancestor has to re-check (the
//: editor sits inside `.card`, which `.card:has(details.dock-menu[open])`
//: watches), so the check invalidated the `.doc-layout` subtree each time.
//: Rewriting the existing text node's `data` is not a structural change, and
//: nothing re-checks.
function docSetStatusText(el, text) {
  if (!el) return;
  const node = el.firstChild;
  if (node && node.nodeType === Node.TEXT_NODE && !node.nextSibling) {
    if (node.data !== text) node.data = text;
  } else if (el.textContent !== text) {
    el.textContent = text;
  }
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
  //: Words first: selecting a paragraph is almost always a question about
  //: its length, and the character count is the supporting detail. A
  //: selection inside one word has no word count worth printing, so it
  //: falls back to characters alone.
  const selection = !stats.selected
    ? ""
    : stats.selectedWords
      ? ` · ${stats.selectedWords.toLocaleString()} word${
          stats.selectedWords === 1 ? "" : "s"
        } selected (${stats.selected.toLocaleString()} char${stats.selected === 1 ? "" : "s"})`
      : ` · ${stats.selected.toLocaleString()} char${stats.selected === 1 ? "" : "s"} selected`;
  docSetStatusText(caret, `Ln ${stats.line}, Col ${stats.column}${selection}`);
  //: The breadcrumb follows the caret, so it is drawn from the same stats
  //: rather than from a listener of its own: two things that answer "where am
  //: I" and update on different events are two things that disagree.
  renderDocCrumbs(stats.line - 1);
  renderDocToolbarState();
}

//: **Which formatting buttons are on for the caret** (DOCUMENTS_PLAN Phase 2,
//: the third of the three things the engine phase left deliberately unbuilt:
//: "which buttons are 'on' for the caret's position is not driven from the
//: syntax tree, which the tree now makes cheap").
//:
//: It was never built because before the engine there was no tree to ask: a
//: textarea's value is a string, and deciding whether the caret is inside
//: `**bold**` meant counting asterisks from the top of the document on every
//: keystroke. The tree already exists for the decorations, and this walks one
//: node's ancestors, so the cost is the depth of the markdown at the caret and
//: not the length of the document.
//:
//: A lezer node name to the `data-md` of the button that writes it. Only the
//: marks a caret can be *inside*: Link is here because a caret in `[text](x)`
//: is inside a Link node, while the buttons that always insert something new
//: (a divider, a table, a colour) have no state to be in and are left alone,
//: which is also why `aria-pressed` is set on these and on nothing else. A
//: button that is not a toggle must not claim to be one to a screen reader.
const DOC_TOOLBAR_MARKS = {
  StrongEmphasis: "bold",
  Emphasis: "italic",
  Strikethrough: "strike",
  InlineCode: "code",
  FencedCode: "code",
  ATXHeading1: "h1",
  ATXHeading2: "h2",
  ATXHeading3: "h3",
  BulletList: "ul",
  OrderedList: "ol",
  Blockquote: "quote",
  Link: "link",
  Task: "task",
};

//: The `data-md` values this can answer for, so a button outside the set is
//: never touched rather than being told it is off.
const DOC_TOOLBAR_STATEFUL = new Set(Object.values(DOC_TOOLBAR_MARKS));

function docToolbarMarksAt(CM, state) {
  const marks = new Set();
  const { syntaxTree } = CM.language;
  //: **`-1`, the side the caret came from.** With `1`, a caret just past the
  //: final `d` of `**bold**` resolves to whatever follows the emphasis and
  //: Bold reads as off at the exact moment a writer is still typing the word.
  //: Asking for the node on the left is what makes "keep typing in bold" and
  //: "the button says bold" the same answer.
  let node = syntaxTree(state).resolveInner(state.selection.main.head, -1);
  while (node) {
    const mark = DOC_TOOLBAR_MARKS[node.name];
    if (mark) marks.add(mark);
    node = node.parent;
  }
  //: A task list *is* a bullet list in the grammar, so both would light and
  //: the bar would claim two list kinds at once. The more specific one wins,
  //: which is also the one pressing the button again would turn off.
  if (marks.has("task")) marks.delete("ul");
  return marks;
}

function renderDocToolbarState() {
  const bar = $("doc-toolbar");
  //: Only the document's own strip. The capture composer's clone carries the
  //: same `data-md` buttons and a different caret, and lighting it from this
  //: view would be a bar describing a document nobody is looking at.
  if (!bar || !docCmView || !window.CM6) return;
  let marks;
  try {
    marks = docToolbarMarksAt(window.CM6, docCmView.state);
  } catch {
    //: A tree that is not ready yet answers nothing rather than throwing on
    //: the beat of every arrow key. The next selection change asks again.
    return;
  }
  for (const button of bar.querySelectorAll("button[data-md]")) {
    if (!DOC_TOOLBAR_STATEFUL.has(button.dataset.md)) continue;
    const on = marks.has(button.dataset.md) ? "true" : "false";
    //: Only on a change: this runs on every keystroke, over 51 buttons (the
    //: strip and its menus), and an attribute set to the value it already
    //: had is still a mutation the style engine has to look at.
    if (button.getAttribute("aria-pressed") !== on) button.setAttribute("aria-pressed", on);
  }
}

//: The counts. A whole-document pass, which is why it is scheduled rather
//: than run on the keystroke (see `scheduleDocFacts`).
function renderDocCounts() {
  const counts = $("doc-counts");
  if (!counts) return;
  //: **A remark is not prose you wrote for a reader**, so it is not in the
  //: count, the character total or the reading time. Measured on a 128-word
  //: document with two comments in it: 134 words counted before this, 128
  //: after, which is the number the same document's Read view shows.
  const text = docCommentStrip(docText());
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
      renderDocComments();
      //: The properties panel is drawn from the frontmatter's own text and
      //: redraws only when that text moves, so it costs one parse of the top
      //: of the document per pause in the typing.
      renderDocProperties();
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

// --- the dictionary the spelling check actually reads -------------------------
//
// **What was wrong, and it was the whole check.** Until 2026-09-12 the
// spelling rule looked each word up in `DOC_AUTOCORRECT`, a hand-written table
// of 42 typos, and treated every word that was not in it as correctly spelled.
// That is not a spell checker, it is a list of 42 strings: "tets" was never
// flagged, and neither was anything else a person actually mistypes. The
// owner's two reports are the same cause seen from two sides. "Spelling errors
// and grammar arent picked up all the time" is the table being 42 entries
// long. "No edit suggestions popup panel appears when I click on underlined
// words" is subtler and worse: the underline being clicked was not this app's,
// it was the *browser's* native squiggle, drawn because the editor carries
// `spellcheck="true"`. The app had no finding at that word, so it had nothing
// to open a menu about, and the click did nothing.
//
// So the fix has to be a real dictionary, and the browser's squiggle has to
// go once there is one, or every misspelling carries two underlines and only
// one of them answers a click. `docBrowserSpellcheck` is that switch, and it
// is deliberately conditional rather than deleted: if the word list fails to
// load, the browser's checker is better than nothing and comes straight back.
//
// **Why it is a fetch and not a script.** 871KB of words parsed into a Set is
// work the first paint should never wait for, and most sessions never open a
// document at all. It loads on the first prose pass, which is 150ms after the
// first keystroke in a document at the earliest, and the pass re-runs itself
// when it arrives.

const DOC_WORDLIST_URL = "/vendor/wordlist/en.txt";

//: The words this app and the notes people keep in it are written in, that a
//: general English list does not carry. Kept here rather than appended to the
//: vendored file, so that file stays exactly what its build.sh produces and
//: the licence notice beside it keeps describing its contents.
const DOC_EXTRA_WORDS = [
  "apis", "async", "auth", "autocomplete", "autosave", "autosaved",
  "backend", "callout", "callouts", "changelog", "chatbot", "config", "configs",
  "csv", "dockerfile",
  "downvote", "dropdown", "dropdowns", "embeddings", "enum", "filepath",
  "frontend", "fullstack", "gitlab", "golang", "https", "iterable", "json",
  "kanban", "kubernetes", "linter", "localhost", "memorymap", "mindmap",
  "namespace", "navbar", "nodejs", "npm", "oauth", "onboarding", "passwordless",
  "pypi", "readme", "realtime", "rebase", "regexes", "retagging", "roadmap",
  "rustc", "scrollbar", "sdk", "signup", "standup", "struct", "subfolder",
  "subfolders", "todo", "todos", "tokenizer", "toml", "tooltip", "tooltips",
  "tsv", "ui", "uncached", "untagged", "upvote", "uri", "utf", "uuid", "ux",
  "viewport", "webapp", "webhook", "webhooks", "wireframe", "yaml", "yml",
  //: Found by running the app's own visible text past the list: 34 words in
  //: the whole of index.html were missing, and these are the ones a person
  //: would also write in a note. The rest were fragments ("ve", "nbsp") or
  //: real misspellings ("isnt"), which is the answer that check was for.
  "ctrl", "esc", "bundler", "dev", "embedder", "frontmatter", "minimap",
  "mistyped", "multiline", "outdent", "rebindable", "resizer", "stylesheet",
  "subtree", "uncategorised", "uncategorized", "unlinked", "unticked",
  //: The tools this app talks to by name. They appear in its own screens, so
  //: they will appear in notes about them.
  "gmail", "markitdown", "nomic", "ollama", "qwen", "searxng", "tesseract",
];

let docWordlist = null;
let docWordlistLoading = false;
let docWordlistFailed = false;

//: Until this is true the checker makes no claim about whether a word is
//: spelled correctly, which is why every caller asks rather than assuming.
function docWordlistReady() {
  return docWordlist !== null;
}

function docLoadWordlist() {
  if (docWordlist || docWordlistLoading || docWordlistFailed) return;
  docWordlistLoading = true;
  fetch(DOC_WORDLIST_URL)
    .then((response) => (response.ok ? response.text() : Promise.reject(new Error(String(response.status)))))
    .then((text) => {
      const words = new Set(DOC_EXTRA_WORDS);
      //: **`trim()`, and it is the whole bug report.** Reported with a
      //: screenshot of 268 suggestions on a 298-word document, every one of
      //: them a real English word: "litterally everything isnt in the
      //: dictionary". The list loads, so the no-dictionary guard in
      //: `docWordKnown` never fires; it just matches nothing.
      //:
      //: The file is committed with unix line endings and this sandbox reads
      //: it that way, which is why `docs-spell.js` measured six findings over
      //: 8,000 characters with no false positives. Git on Windows checks text
      //: out with CRLF by default, so every entry arrives as `"offline\r"`,
      //: and `Set.has("offline")` is false for all 92,972 of them. One
      //: checkout on one platform turns the checker into a machine that flags
      //: the entire language.
      //:
      //: Trimming here rather than only pinning the file in `.gitattributes`
      //: (which this commit does as well): the attribute fixes the checkout,
      //: and this fixes every copy that already exists, plus any future list
      //: that arrives with trailing whitespace from wherever it was built.
      for (const line of text.split("\n")) {
        const word = line.trim();
        if (word) words.add(word);
      }
      docWordlist = words;
      docWordlistLoading = false;
      //: The ranked suggestions are drawn from the same pool, so it has to be
      //: rebuilt, and the pass that ran without a dictionary has to run again
      //: now that there is one.
      docKnownWordsCache = null;
      docSpellCache = new Map();
      docCmApplySpellcheck();
      renderDocProse();
    })
    .catch(() => {
      //: Once, not on a loop: a failed fetch here means the file is missing
      //: from the build, and retrying on every keystroke would turn one
      //: mistake into a request storm. The browser's own checker stays on.
      docWordlistLoading = false;
      docWordlistFailed = true;
    });
}

//: A word the checker is willing to have an opinion about. Everything refused
//: here is refused because flagging it would be wrong far more often than it
//: would be right, and a checker that cries wolf is one that gets turned off.
function docSpellable(text, word, start, end) {
  if (word.length < 2) return false;
  //: An acronym (API, HTTP, NASA) is not in any word list and is not a typo.
  if (word === word.toUpperCase()) return false;
  //: An internal capital means an identifier or a product name: MemoryMap,
  //: docSurface, YouTube. Splitting and checking the halves would flag half
  //: the identifiers in any technical note.
  if (/[A-Z]/.test(word.slice(1))) return false;
  //: A letter run touching a digit, a path separator, an @ or a dot before
  //: more letters is part of something that is not prose: utf-8, app.js,
  //: me@example.com, C:\\Users. The word regex stops at those characters, so
  //: the only way to see them is to look at what is on either side.
  const before = start > 0 ? text[start - 1] : "";
  const after = end < text.length ? text[end] : "";
  if (/[0-9_/@\\#$%&*+=<>~]/.test(before) || /[0-9_/@\\#$%&*+=<>~]/.test(after)) return false;
  if (after === "." && /[A-Za-z]/.test(text[end + 1] || "")) return false;
  if (before === "." && /[A-Za-z]/.test(text[start - 2] || "")) return false;
  return true;
}

//: Is this a word? Asked only of things `docSpellable` has already allowed.
//: A trailing possessive is stripped rather than listed: the vendored file
//: drops its 18,579 "word's" forms because this is cheaper and cannot get out
//: of step with the nouns it is built from.
function docWordKnown(word) {
  if (!docWordlist) return true;
  const bare = word.replace(/['’]s$/i, "").replace(/['’]+$/, "");
  if (!bare) return true;
  const lower = bare.toLowerCase();
  return docWordlist.has(lower) || docDictionary().has(lower);
}

//: The strings one edit away from a word, each tagged with *which* edit, and
//: the tag is the point. Norvig's shape for the generation, and the reason it
//: is this rather than a scan of the dictionary is arithmetic: a scan is
//: 93,000 edit-distance computations, this is a few hundred Set lookups, and
//: the two return the same answer for distance one.
//:
//: The tag ranks the answers, and ranking by *how specific the edit is* is
//: what makes the top row the word the writer meant. There are only n-1
//: transpositions of a word and n deletions, against 26n insertions and 25n
//: substitutions: so a candidate that needs only a swap is a far stronger
//: claim than one of twenty-five letters that could have gone in that slot.
//: Measured: "tets" ranked alphabetically offered tats, teas, teds, tees and
//: tens, and never "test", which is the one word anybody typing "tets" meant.
const DOC_ALPHABET = "abcdefghijklmnopqrstuvwxyz'";
const DOC_EDIT_SWAP = 0;
const DOC_EDIT_DROP = 1; // one letter too many was typed
const DOC_EDIT_ADD = 2; // one letter was missed
const DOC_EDIT_SWAP_LETTER = 3; // the wrong letter was typed

function docEditsOnce(word) {
  const out = new Map();
  const note = (candidate, rank) => {
    if (candidate === word) return;
    const seen = out.get(candidate);
    if (seen === undefined || rank < seen) out.set(candidate, rank);
  };
  for (let i = 0; i <= word.length; i += 1) {
    const head = word.slice(0, i);
    const tail = word.slice(i);
    if (tail) note(head + tail.slice(1), DOC_EDIT_DROP);
    if (tail.length > 1) note(head + tail[1] + tail[0] + tail.slice(2), DOC_EDIT_SWAP);
    for (const letter of DOC_ALPHABET) {
      if (tail) note(head + letter + tail.slice(1), DOC_EDIT_SWAP_LETTER);
      note(head + letter + tail, DOC_EDIT_ADD);
    }
  }
  return out;
}

function docSpellRoot(word) {
  return word.toLowerCase().replace(/['\u2019]s$/i, "");
}

//: Real words one or two edits from a misspelling, nearest first. Two edits
//: is only reached when one edit finds too few, because it costs the square
//: of the work and because a word with a one-edit neighbour almost always
//: meant that neighbour.
const DOC_TWO_EDIT_FLOOR = 2;

function docSpellGuesses(word, limit = DOC_SUGGEST_MAX) {
  if (!docWordlist) return [];
  const lower = docSpellRoot(word);
  const near = [];
  const once = docEditsOnce(lower);
  for (const [candidate, rank] of once) {
    if (docWordlist.has(candidate)) near.push([candidate, rank]);
  }
  //: Two edits only when one found next to nothing. It costs the square of
  //: the work, and a word with any one-edit neighbour almost always meant one
  //: of those.
  if (near.length < DOC_TWO_EDIT_FLOOR) {
    const seen = new Set(near.map(([candidate]) => candidate));
    //: Two edits out, everything is equally weak evidence, so they all share
    //: one rank below every one-edit answer.
    outer: for (const middle of once.keys()) {
      for (const candidate of docEditsOnce(middle).keys()) {
        if (candidate === lower || seen.has(candidate)) continue;
        if (!docWordlist.has(candidate)) continue;
        seen.add(candidate);
        near.push([candidate, DOC_EDIT_SWAP_LETTER + 1]);
        if (near.length >= limit * 3) break outer;
      }
    }
  }
  near.sort((a, b) => {
    if (a[1] !== b[1]) return a[1] - b[1];
    //: Within one kind of edit: the first letter is the one a typist gets
    //: right, then the nearer length, then alphabetically so the same word
    //: always offers the same menu in the same order.
    const first = (b[0][0] === lower[0] ? 1 : 0) - (a[0][0] === lower[0] ? 1 : 0);
    if (first) return first;
    const length = Math.abs(a[0].length - lower.length) - Math.abs(b[0].length - lower.length);
    if (length) return length;
    return a[0] < b[0] ? -1 : 1;
  });
  return near.slice(0, limit).map(([candidate]) => candidate);
}

//: **The one answer, or none.** A correction this app is willing to make
//: without being asked, or to put behind a single check button, has to be the
//: only candidate of its kind: exactly one real word reachable by a swap of
//: two letters or by dropping one, and nothing else that close. "tets" has
//: exactly one ("test"); "tho" has several and gets a menu instead. Short
//: words are refused outright because almost every three-letter string is one
//: edit from several real words.
const DOC_CONFIDENT_MIN = 4;

function docSpellConfident(word) {
  if (!docWordlist) return null;
  const lower = docSpellRoot(word);
  if (lower.length < DOC_CONFIDENT_MIN) return null;
  const swaps = [];
  const drops = [];
  for (const [candidate, rank] of docEditsOnce(lower)) {
    if (rank > DOC_EDIT_DROP) continue;
    if (!docWordlist.has(candidate)) continue;
    (rank === DOC_EDIT_SWAP ? swaps : drops).push(candidate);
  }
  //: A swap outranks a dropped letter rather than competing with it. "tets"
  //: has one of each ("test" and "tet", the Vietnamese new year), and
  //: treating those as a tie left the app with no opinion about the most
  //: ordinary typo there is.
  if (swaps.length === 1) return swaps[0];
  if (!swaps.length && drops.length === 1) return drops[0];
  return null;
}

//: One answer per word rather than per occurrence. A document says the same
//: word many times, the answers cannot change between two of them inside one
//: pass, and the generation above is the most expensive thing the checker
//: does. Cleared when the dictionary changes, which is the only thing that
//: can change an answer.
let docSpellCache = new Map();

function docSpellLookup(word) {
  const key = docSpellRoot(word);
  let answer = docSpellCache.get(key);
  if (answer === undefined) {
    answer = { known: docWordKnown(word), sure: null };
    if (!answer.known) answer.sure = docSpellConfident(word);
    //: Bounded, because a pathological document must not grow this without
    //: limit: cleared wholesale rather than evicted one at a time, which
    //: costs one rebuild on a document with more than 5,000 distinct words.
    if (docSpellCache.size > 5000) docSpellCache.clear();
    docSpellCache.set(key, answer);
  }
  return answer;
}

//: Spans of the document the prose rules do not read. A fenced block is code,
//: an inline span in backticks is code, a URL is an address and a markdown
//: link's destination is a path: none of them is prose, and every one of them
//: is full of things that look like misspellings and missing spaces. Without
//: this a real dictionary would put a red underline under every identifier in
//: a code sample, which is the single fastest way to make a writer turn the
//: whole check off.
//:
//: A byte mask rather than a list of ranges because the test is asked once
//: per finding and once per word: a linear scan of ranges per word is the
//: shape that makes a long document slow.
const DOC_PROSE_SKIP = [
  /(^|\n)[ \t]*(```|~~~)[^\n]*\n[\s\S]*?(\n[ \t]*\2[^\n]*|$)/g, // fenced code
  /`[^`\n]+`/g, // inline code
  /\b(?:https?:\/\/|ftp:\/\/|mailto:|www\.)\S+/g, // addresses
  /\]\([^)\n]*\)/g, // a markdown link's destination
  /^\[[^\]\n]+\]:\s*\S+/gm, // a reference link's definition
  /<\/?[A-Za-z][^>\n]*>/g, // an html tag
  /\[\[[^\]\n]*\]\]/g, // a note link: the title is a name, not prose
  //: A callout's own marker. `> [!note]` is syntax, and the space before its
  //: "!" was being reported as a space before punctuation on every callout in
  //: every document.
  /^[ \t]*>[ \t]*\[![A-Za-z]+\]/gm,
  /^---\n[\s\S]*?\n---/g, // frontmatter
];

function docProseSkipMask(text) {
  const mask = new Uint8Array(text.length);
  for (const source of DOC_PROSE_SKIP) {
    //: A fresh regex per pass, for the reason the rules' own loop gives:
    //: `lastIndex` survives on a shared object and silently skips half the
    //: document on every second call.
    const pattern = new RegExp(source.source, source.flags);
    let match;
    while ((match = pattern.exec(text)) !== null) {
      if (!match[0].length) {
        pattern.lastIndex += 1;
        continue;
      }
      mask.fill(1, match.index, match.index + match[0].length);
    }
  }
  return mask;
}

//: Findings, in document order, each with the exact span it is about so the
//: panel can jump to it and the fix can replace it without searching for the
//: text again (which would find the wrong occurrence in a document that says
//: the same thing twice).
function docProseFindings(text) {
  const found = [];
  //: Kicked off here rather than at load: this is the first moment anything
  //: wants to know whether a word is a word. It returns immediately, and the
  //: pass that arrives with it re-runs this one.
  docLoadWordlist();
  const skip = docProseSkipMask(text);
  //: A span is skipped when it starts inside code or an address. Its start
  //: rather than every character of it: a rule whose match straddles the end
  //: of a code fence is about the code, not the prose after it.
  const skipped = (at) => skip[at] === 1;
  for (const rule of DOC_PROSE_RULES) {
    if (!rule.test) continue;
    //: A fresh regex per pass: these carry `g`, and `lastIndex` survives
    //: between calls on a shared object, which silently skips half the
    //: document on every second run.
    const pattern = new RegExp(rule.test.source, rule.test.flags);
    let match;
    while ((match = pattern.exec(text)) !== null) {
      if (!match[0].length) break; // a zero-width match would loop forever
      if (skipped(match.index)) continue;
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
    if (skipped(hit.index)) continue;
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
    if (better) {
      found.push({
        rule: "spelling",
        message: `“${hit[0]}” is probably “${better}”`,
        start: hit.index,
        end: hit.index + hit[0].length,
        text: hit[0],
        //: Keeps the writer's capitalisation: a typo at the start of a
        //: sentence must not be corrected into a lowercase word.
        replacement: docMatchCase(hit[0], better),
      });
      continue;
    }
    //: **Everything else, against the dictionary.** The table above is 42
    //: entries and keeps its place only because it carries the one certain
    //: answer for each of them; this is the check that makes the other
    //: several hundred thousand typos visible. Silent until the word list has
    //: loaded, because a checker that flags every word for a second and then
    //: takes it back is worse than one that waits.
    if (!docWordlistReady()) continue;
    if (!docSpellable(text, hit[0], hit.index, hit.index + hit[0].length)) continue;
    const looked = docSpellLookup(hit[0]);
    if (looked.known) continue;
    //: The candidate list is *not* computed here. It costs the square of the
    //: work of one edit when one edit finds nothing, and computing it for
    //: every unknown word on every pass put `docProseFindings` at 29ms over a
    //: 276-character document (measured, 2026-09-12) when the whole pass has
    //: a 300ms budget from keystroke to underline. The menu computes it for
    //: the one word it is about, when it opens.
    //:
    //: The row claims an answer only when there is one to claim
    //: (`docSpellConfident`); otherwise it says what it knows, which is that
    //: the word is not in the dictionary, and the menu offers the candidates.
    //: Saying "probably" about the first of five would be picking one at
    //: random on the writer's behalf.
    const sure = looked.sure;
    found.push({
      rule: "spelling",
      message: sure
        ? `“${hit[0]}” is probably “${sure}”`
        : `“${hit[0]}” is not in the dictionary`,
      start: hit.index,
      end: hit.index + hit[0].length,
      text: hit[0],
      //: `replacement` is what "Fix all" applies without asking, so it is set
      //: only when there is nothing to choose between.
      replacement: sure ? docMatchCase(hit[0], sure) : null,
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

//: **The row of the panel, and the answers under it** (DOCUMENTS_PLAN 12 D3).
//:
//: Reported: "when I click on the issue from the suggestions thing, the box
//: just appears right there in my face." The row used to open the floating
//: menu, first at the row (which is at the foot of the window, under the
//: pointer) and then at the word, and both readings of "where" were answers to
//: the wrong question: a list at the foot of the window had no answers of its
//: own, so acting on any row meant drawing a 335px popup over the text being
//: discussed, on top of the 297px panel that asked. Measured: 70% of the
//: window's height spent on one misspelled word.
//:
//: So the row expands under itself, inside the panel, with the same answers the
//: menu offers (`docSuggestAnswers`), and the document scrolls the word to the
//: middle of the editor so the sentence is readable while its row is open. One
//: surface at a time, which is DESIGN.md's popover rule: a panel that has to
//: open a popover to be useful was breaking it structurally.
//: **Closing a row, once.** Three things close one (the second press on the
//: row, Escape inside the answers, and pressing an answer), and each of them
//: used to write the same four lines. They also have to agree about focus: a
//: row opened from the keyboard has the focus ring somewhere inside the block
//: that is about to be emptied, and an element removed while it has focus
//: hands it to `<body>`, which is the end of keyboard navigation for that
//: panel. So the row takes it back, but only when the row is where it came
//: from: a pointer press left focus in the editor on purpose (that is what
//: "show me this in the document" means) and stealing it here would move the
//: caret out of the sentence the reader was just shown.
function docProseRowCollapse(row, control, answers) {
  control.setAttribute("aria-expanded", "false");
  row.removeAttribute("aria-current");
  answers.classList.add("hidden");
  answers.replaceChildren();
  if (row.dataset.keyOpened === "1") control.focus();
  delete row.dataset.keyOpened;
}

function docProseRowAnswers(row, control, finding, opts = {}) {
  const panel = $("doc-prose-panel");
  const answers = row.querySelector(".doc-prose-answers");
  if (!panel || !answers) return;
  //: **Keyboard or pointer, decided by `event.detail`.** A click raised by
  //: Enter or Space on a button reports `detail === 0`; a real press reports
  //: the click count. It is the only signal that separates the two here, and
  //: the whole behaviour below hangs off it, so the caller passes it in rather
  //: than this function reaching for a global event.
  const byKeyboard = opts.keyboard === true;
  const wasOpen = control.getAttribute("aria-expanded") === "true";
  //: One open row, like one open popover. Two sets of answers in one list is
  //: two places the next press could mean something.
  for (const other of panel.querySelectorAll('.doc-prose-jump[aria-expanded="true"]')) {
    //: **Not this row.** The selector matches the row being pressed too when
    //: it is already open, and collapsing it here rather than in the `wasOpen`
    //: branch below meant the branch ran against a row that was already closed
    //: and had already given its focus away: measured as the editor keeping
    //: the ring after Enter closed a row from the keyboard.
    if (other === control) continue;
    const li = other.closest(".doc-prose-row");
    const box = li?.querySelector(".doc-prose-answers");
    //: Another row's answers, so its focus is not this row's business: the
    //: flag goes first, and the collapse leaves focus where it found it.
    if (li) delete li.dataset.keyOpened;
    if (li && box) docProseRowCollapse(li, other, box);
    else other.setAttribute("aria-expanded", "false");
  }
  //: Pressing the row always takes you to the word, open or closing: that is
  //: what the row is for, and it is the half of this the owner asked for
  //: ("it should auto scroll to the issue and temporarily highlight it").
  docProseJump(finding);
  //: **The press that closes decides where focus goes**, not the press that
  //: opened: closing with Enter from the row means the reader is on the row
  //: and wants to stay there, whichever way it was opened. Set before either
  //: branch because the `close` handed to the answers below reads it too, and
  //: that is what a candidate pressed with Enter calls.
  if (byKeyboard) row.dataset.keyOpened = "1";
  else delete row.dataset.keyOpened;
  if (wasOpen) {
    docProseRowCollapse(row, control, answers);
    return;
  }
  control.setAttribute("aria-expanded", "true");
  //: The open row is where you are in the document, so it says so with
  //: `aria-current` and is painted from that attribute (DESIGN.md's recipe for
  //: a list that says where you are), not with a class a screen reader cannot
  //: see.
  row.setAttribute("aria-current", "location");
  answers.replaceChildren(
    docSuggestAnswers(finding, {
      inline: true,
      close: () => docProseRowCollapse(row, control, answers),
      current: () => control.getAttribute("aria-expanded") === "true",
    })
  );
  answers.classList.remove("hidden");
  //: Brought into view by the panel's own `scrollTop`, never `scrollIntoView`,
  //: which walks every scrolling ancestor including the page (DESIGN.md).
  const box = row.getBoundingClientRect();
  const frame = panel.getBoundingClientRect();
  if (box.bottom > frame.bottom) panel.scrollTop += box.bottom - frame.bottom + 8;
  else if (box.top < frame.top) panel.scrollTop -= frame.top - box.top + 8;
  //: **Focus follows the keyboard into the answers, and only the keyboard.**
  //: Reported (OPEN.md, prose-intelligence.md): "Enter opens the row, focus
  //: stays on the control, the candidates are a Tab away with nothing saying
  //: so." Measured before this: after Enter, `document.activeElement` was the
  //: editor's own `cm-content` (`docProseJump` focuses the surface to show the
  //: word), so the candidates were not one Tab away, they were behind the
  //: whole editor's tab order. The first candidate is the one the panel says
  //: is the best answer, so it is the one that takes the ring.
  if (!byKeyboard) return;
  const first = answers.querySelector("button:not([disabled])");
  if (first) first.focus();
}

function docProseGroupList(findings) {
  const list = document.createElement("ul");
  list.className = "doc-prose-list";
  for (const finding of findings.slice(0, DOC_PROSE_ROWS)) {
    const li = document.createElement("li");
    li.className = "doc-prose-row";
    const head = document.createElement("div");
    head.className = "row doc-prose-rowhead";
    const jump = document.createElement("button");
    jump.type = "button";
    jump.className = "doc-prose-jump";
    jump.setAttribute("aria-expanded", "false");
    //: The words, then why: one drawing of a finding, shared with the menu's
    //: own head (`docFindingLine`).
    jump.appendChild(docFindingLine(finding, "row"));
    jump.title = "Show me this in the document, and what can be done about it";
    //: `event.detail === 0` is a press that came from Enter or Space rather
    //: than from a pointer: see `docProseRowAnswers` for what hangs off it.
    jump.addEventListener("click", (event) =>
      docProseRowAnswers(li, jump, finding, { keyboard: event.detail === 0 }));
    head.appendChild(jump);
    if (finding.replacement !== null) {
      const fix = document.createElement("button");
      fix.type = "button";
      fix.className = "ghost small doc-prose-fix";
      setLabel(fix, "ph:check");
      fix.title = `Change it to \u201c${finding.replacement}\u201d`;
      fix.setAttribute("aria-label", fix.title);
      fix.addEventListener("click", () => docProseFix(finding));
      head.appendChild(fix);
    }
    li.appendChild(head);
    const answers = document.createElement("div");
    answers.className = "doc-prose-answers hidden";
    //: **Escape leaves the answers the way it leaves every other surface in
    //: this app**, and it is wired here, once per row, rather than inside the
    //: open: the block is reused across opens, so a listener added there would
    //: multiply by one per press (the shape `tests/test_frontend_handlers.py`
    //: exists to catch). Stopped from bubbling because the app's own Escape
    //: chain would otherwise close the whole panel from underneath a reader
    //: who only meant to close one row.
    answers.addEventListener("keydown", (event) => {
      if (event.key !== "Escape") return;
      if (jump.getAttribute("aria-expanded") !== "true") return;
      event.stopPropagation();
      event.preventDefault();
      li.dataset.keyOpened = "1";
      docProseRowCollapse(li, jump, answers);
    });
    li.appendChild(answers);
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
  if (box.kind === "codemirror") {
    //: **To the middle, not just inside the edge** (DOCUMENTS_PLAN 12 D3).
    //: `setSelection` scrolls the minimum that reveals the range, which puts a
    //: word reached from the panel hard against the bottom of the editor, the
    //: one place where everything that follows (the row's own answers, a menu)
    //: has to be drawn over the text being discussed. Measured before this:
    //: the word at `564..583` in an editor ending at `588`.
    const CM = window.CM6;
    if (CM) {
      docCmView.dispatch({
        effects: CM.view.EditorView.scrollIntoView(finding.start, { y: "center" }),
      });
    }
    return;
  }
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
  const list = $("doc-complete-list");
  list?.classList.add("hidden");
  docReturnFromViewport(list);
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
  //: every menu here. Out of the card first, for the reason `docLiftToViewport`
  //: gives: this list is placed in viewport coordinates too, so a blurred
  //: ancestor moves it exactly as it moved the word menu.
  docLiftToViewport(list);
  list.classList.remove("hidden");
  const width = list.offsetWidth;
  const height = list.offsetHeight;
  const left = Math.min(point.left, window.innerWidth - width - 8);
  const below = point.bottom + 4;
  const flipped = below + height > window.innerHeight - 8 ? point.top - height - 4 : below;
  //: Clamped at both ends, not just at the top. A caret low in a short window
  //: flips the list above itself, and a list taller than the space above lands
  //: at a negative top, is pulled back to 8, and then draws its last rows off
  //: the bottom of the screen: the bug `placeDocSuggest` already records
  //: fixing on the word menu, in the one other popup that never got it.
  const top = Math.min(
    Math.max(8, flipped),
    Math.max(8, window.innerHeight - 8 - height)
  );
  docPlaceFixed(list, Math.max(8, left), top);
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
  let better = DOC_AUTOCORRECT[lower] || docVariantLookup().get(lower);
  //: **The dictionary's own unambiguous answers, on the same terms as the
  //: table's.** The table is 42 strings that are not words in any English
  //: text, which is the bar an automatic replacement has to clear because the
  //: cost of being wrong is that the app silently changed something the
  //: writer meant. `docSpellConfident` holds the same bar against 93,000
  //: words rather than 42: the word is not in any dictionary, and there is
  //: exactly one real word a swap of two letters away (or exactly one a
  //: dropped letter away, when no swap reaches one at all), and it is at
  //: least four letters long because almost every three-letter string is one
  //: edit from several real words. Anything with a choice in it stays a menu.
  if (!better) {
    //: The same refusals the check itself makes: an acronym, an identifier,
    //: a word touching a digit or a path is not prose and must never be
    //: rewritten. The line is the text these offsets are in.
    const at = caret - line.from - match[0].length;
    if (!docSpellable(line.text, match[1], at, at + match[1].length)) return false;
    const looked = docSpellLookup(match[1]);
    if (looked.known) return false;
    better = looked.sure;
  }
  if (!better) return false;
  const replacement = match[1][0] === match[1][0].toUpperCase()
    ? better[0].toUpperCase() + better.slice(1)
    : better;
  const start = caret - match[0].length;
  //: **Its own step in the history, or the toast below is a lie.** Typing is
  //: grouped into one undo entry per burst, so a correction folded into that
  //: burst means Ctrl+Z takes back the whole sentence rather than the
  //: correction. Measured 2026-09-12: one Ctrl+Z after "I ran a tets " left
  //: an empty document. Isolating before the replacement makes the first
  //: Ctrl+Z give back exactly what was typed, which is what the toast says
  //: and the only thing that makes an automatic rewrite acceptable.
  docUndoBreak();
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

const DOC_TOOL_KEYS = {
  autocorrect: "doc-autocorrect",
  complete: "doc-complete",
  //: INBOX 402: VS Code's Alt+Z and "render whitespace", for a code file.
  codeWrap: "doc-code-wrap",
  whitespace: "doc-whitespace",
};

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

//: **Tab moves between table cells**, on the one model the renderer and the
//: cell menu also use.
//:
//: This was a second reading of the line before Phase 3: it found the pipes
//: with a scan that required the row to *start* with one, so a table written
//: without outer pipes (which GFM allows and people write) had no Tab at all;
//: it could not tell a header from a body row except by a regex for dashes;
//: and the row it added was `| | |` whatever the table around it looked like.
//: All three are properties of the parse, and there is a parse now. Returns
//: false anywhere that is not a table, so the indent behaviour below is
//: untouched.
function docTableTab(event, box) {
  const context = docTableContext(box);
  if (!context) return false;
  event.preventDefault();
  docTableTabStep(event.shiftKey, context);
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

//: **A mark is one element and can be several boxes, and this is the whole of
//: INBOX 128.** A finding that crosses a soft wrap is drawn as two fragments of
//: one inline element, and `getBoundingClientRect()` answers with the *union*
//: of them, which is a box neither fragment occupies: measured on a doubled
//: "the the" at a wrap point, fragments at `1187..1218` on one line and
//: `471..497` on the next, union `471..1218`, 747px wide and two lines tall.
//: Anchoring a menu to that opened it 716px to the left of the words that were
//: clicked ("the popup didnt appear right next to it but off to the side with a
//: wide gap"), and hit-testing against it claimed every unrelated word inside
//: those 747px as well. `getClientRects()` is the per-fragment answer, so both
//: the question "is the pointer on this finding" and the question "where do I
//: put the menu" are asked of the box the reader can actually see.
function docMarkRects(mark) {
  const rects = [...mark.getClientRects()].filter((rect) => rect.width || rect.height);
  return rects.length ? rects : [mark.getBoundingClientRect()];
}

function docRectHolds(rect, x, y) {
  return x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;
}

//: The fragment the pointer is in, or, for a route with no pointer (the
//: keyboard, a panel row), the first one: a finding is read from its start, so
//: its first line is where someone looking for it will be looking.
function docMarkAnchor(mark, point) {
  const rects = docMarkRects(mark);
  if (point && rects.length > 1) {
    const hit = rects.find((rect) => docRectHolds(rect, point.x, point.y));
    if (hit) return hit;
  }
  return rects[0];
}

function docFindingAtPoint(x, y) {
  if (typeof x !== "number" || typeof y !== "number") return null;
  for (const mark of docFindingMarks()) {
    if (!mark._docFinding) continue;
    if (docMarkRects(mark).some((rect) => docRectHolds(rect, x, y))) return mark._docFinding;
  }
  return null;
}

//: Anchored to the word, not to the caret, wherever the word is a real
//: element. A menu that opens at the caret when the pointer is on the word is
//: a menu you have to look away to find.
//: **Put the word on screen before opening a menu about it** (DOCUMENTS_PLAN 12
//: D4). A mark's box is where the text *is laid out*, which is not the same as
//: where it can be seen: the editor clips its own overflow, so a finding one
//: screen below the fold measures at `top 651` inside an editor whose visible
//: box ends at `588`, and a menu anchored there is a menu pointing at nothing.
//: Centred rather than scrolled minimally, for the same reason the panel centres
//: (D3): a word brought just inside the bottom edge leaves the menu nowhere to
//: open but over the panel that asked for it.
//:
//: Returns whether it moved, because CodeMirror applies a scroll effect in its
//: own measure cycle: the mark's box is the old one until the next frame, and
//: the caller has to re-measure rather than trust what it just read.
function docRevealForSuggest(anchor, finding) {
  const host = docCmView ? docCmView.dom.getBoundingClientRect() : null;
  const CM = window.CM6;
  if (!host || !CM || !docCmView) return false;
  if (anchor.top >= host.top && anchor.bottom <= host.bottom) return false;
  docCmView.dispatch({
    effects: CM.view.EditorView.scrollIntoView(finding.start, { y: "center" }),
  });
  return true;
}

function docOpenSuggestFor(finding, focus = true, point = null, revealed = false) {
  const mark = docFindingMarks().find((el) => el._docFinding === finding);
  if (mark) {
    const anchor = docMarkAnchor(mark, point);
    //: Once only: a finding the editor cannot bring into view (a folded
    //: construct, a zero-height line) would otherwise ask for a frame forever.
    if (!revealed && docRevealForSuggest(anchor, finding)) {
      requestAnimationFrame(() => docOpenSuggestFor(finding, focus, null, true));
      return true;
    }
    openDocSuggest(finding, anchor, focus);
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
  return docOpenSuggestFor(finding, focus, point);
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
    docOpenSuggestFor(finding, false, point);
  });
});

  //: **The underlined word is a real element, so right-clicking it must work.**
  //: The other half of the same report. `docToolsBoxFor` only ever matched a
  //: `<textarea>`, so in Live view, the one view that *can* draw a squiggle,
  //: and therefore the view where anyone would try this, right-clicking the
  //: mark fell straight through to the browser's own menu. The app's menu was
  //: reachable only by left-clicking, which is not what an underline means
  //: anywhere else.
//: One body for the right-click and the long-press (UI Phase 11 item 9): a
//: flag opens its suggestion at the point, and a right-click or a hold on
//: the box itself opens the suggestion at the caret, only when there is
//: something to say (swallowing the browser's own menu over ordinary text
//: would take away spell-check, paste and everything else it carries for
//: the sake of a menu with nothing in it). Returns whether it opened
//: anything, so the mouse path keeps the browser's menu otherwise.
function docOpenSuggestAtPoint(target, point) {
  const flag = target instanceof Element ? target.closest(".doc-flag, .cm-finding") : null;
  if (flag) docFindingMarks(); // resolves the engine's marks back to findings
  if (flag && flag._docFinding) {
    openDocSuggest(flag._docFinding, docMarkAnchor(flag, point));
    return true;
  }
  const box = docToolsBoxFor(target);
  if (!box) return false;
  return Boolean(docOpenSuggestAtCaret(box, point));
}

document.addEventListener("contextmenu", (event) => {
  if (docOpenSuggestAtPoint(event.target, { x: event.clientX, y: event.clientY })) {
    event.preventDefault();
  }
});
if (typeof wireLongPress === "function") {
  wireLongPress(document, (event, point) => docOpenSuggestAtPoint(event.target, point), {
    selector: ".doc-flag, .cm-finding, .cm-content, textarea",
  });
}

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

//: **The array the set was last built from, compared by identity.** This pair
//: is the fix for a report that was worse than it read: *"I swear I added
//: 'idk' to the dictionary last night, make sure it is persistent."*
//:
//: The set used to be memoised with `if (!docDictionarySet)`, and an empty
//: `Set` is truthy, so the first call won for the rest of the session. The
//: first call happens at the bottom of this file, which runs `renderDocTools`
//: at parse time; `prefsCache` is filled by an async fetch in app.js that has
//: not resolved yet. So the dictionary was built empty, every saved word was
//: unknown for the whole session, and, worse, `docDictionaryWrite` below sends
//: `[...docDictionary(), newWord]`: the first word you added after a reload
//: replaced your entire saved dictionary with that one word. Silent data loss,
//: and it is why a word added last night was being offered again today.
//:
//: Identity rather than a dirty flag, because `apiJson` returns a fresh object
//: on every read and `prefsCache` is reassigned in a dozen places across
//: app.js. Anything that reloads preferences therefore rebuilds this set
//: without having to know it exists, which is the property that stops the same
//: bug coming back through a new caller.
let docDictionarySource = null;

function docDictionary() {
  const source = (prefsCache && prefsCache.writing_dictionary) || null;
  if (!docDictionarySet || docDictionarySource !== source) {
    docDictionarySource = source;
    docDictionarySet = new Set((source || []).map((word) => String(word).toLowerCase()));
    //: A rebuilt dictionary means every cached per-word answer was answered
    //: against the old one, including the "not a word" answers that put the
    //: underlines on screen.
    docKnownWordsCache = null;
    docSpellCache = new Map();
  }
  return docDictionarySet;
}

async function docDictionaryWrite(words) {
  docDictionarySet = new Set(words.map((word) => word.toLowerCase()));
  //: Pinned to the preferences this set now speaks for, so the optimistic add
  //: above survives any read between here and the response: without it, the
  //: next `docDictionary()` would see the old array still on `prefsCache`,
  //: decide the set was stale and rebuild it without the word just added. When
  //: the PUT below replaces `prefsCache`, the identity changes and the set is
  //: rebuilt from what the server actually stored, which is the right answer.
  docDictionarySource = (prefsCache && prefsCache.writing_dictionary) || null;
  //: The ranked suggestions are drawn from this list, so a word added here has
  //: to be offerable on the very next menu rather than after a reload, and
  //: the per-word answers have to forget the word that has just been accepted.
  docKnownWordsCache = null;
  docSpellCache = new Map();
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
  const menu = $("doc-suggest-menu");
  menu?.classList.add("hidden");
  docReturnFromViewport(menu);
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
    //: **The dictionary's own answer, first.** These are real words one or
    //: two edits from what was typed, which is what a person means by "what
    //: did I mean to write". The two pools below stay underneath it because
    //: they still answer the cases it cannot: a word the reader added, and a
    //: word that appears in their own notes and in no dictionary.
    if (out.length < DOC_SUGGEST_MAX) {
      const guesses = finding.guesses || docSpellGuesses(finding.text, DOC_SUGGEST_MAX);
      for (const word of guesses) {
        if (out.length >= DOC_SUGGEST_MAX) break;
        push(docMatchCase(finding.text, word));
      }
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

//: **One drawing of a finding, wherever one is drawn** (DOCUMENTS_PLAN 12 D1).
//: The panel row said the reason and then the words, the menu's head said the
//: words and then the reason, and the underline said neither, so one object was
//: described three ways and a reader had to re-read the list to match a row to
//: the word it was about. Here it is one line in one order: a dot in the same
//: colour as that kind's underline, the words, the reason. The dot is the link
//: back to the text, and it is the one mark the three surfaces share.
function docFindingLine(finding, variant = "row") {
  const line = document.createElement("span");
  line.className = `doc-finding-line doc-finding-line-${variant}`;
  const dot = document.createElement("span");
  dot.className = `doc-finding-dot doc-finding-dot-${docFindingKind(finding)}`;
  dot.setAttribute("aria-hidden", "true");
  const words = document.createElement("span");
  words.className = "doc-finding-words";
  //: A spacing finding's text *is* whitespace, so a heading built from it
  //: rendered as an empty bold nothing. Said in words instead: "three spaces"
  //: is a thing you can look for in the line, an empty heading is not.
  words.textContent = docFindingLabel(finding);
  const why = document.createElement("span");
  why.className = "doc-finding-why";
  why.textContent = finding.message;
  line.append(dot, words, why);
  return line;
}

//: **Is this finding a passage or a word?** (DOCUMENTS_PLAN 12 D2.) A
//: misspelling's other wordings *are* the candidate list above it, and
//: "translate this passage" over one word is a dictionary lookup wearing the
//: wrong label: both rows belong to a finding that is a run of words (a
//: repeat, a long sentence), and offering them on every spelling made the
//: common menu nine rows deep. Whitespace-only findings (a double space) are
//: not passages either: there is nothing in them to rephrase.
function docFindingIsPassage(finding) {
  return /\s/.test(String(finding.text || "").trim());
}

//: **The answers to a finding, built once and drawn in two places**
//: (DOCUMENTS_PLAN 12 D2 and D3): the floating menu over the word, and the
//: expanded row in the panel. They were two code paths offering the same four
//: things, which is how the panel ended up with no answers of its own and had
//: to open the menu over the text to have any.
//:
//: `close` dismisses whichever surface this was drawn into, `current` says
//: whether that surface is still showing this finding (the AI round-trip takes
//: seconds and the reader may have moved on), and `reflow` lets a surface that
//: positions itself do so again after the answers change size.
function docSuggestAnswers(finding, opts = {}) {
  const close = opts.close || (() => {});
  const current = opts.current || (() => true);
  const reflow = opts.reflow || (() => {});
  const inline = opts.inline === true;
  const frag = document.createDocumentFragment();

  const list = document.createElement("div");
  list.className = inline ? "doc-suggest-list doc-suggest-list-inline" : "doc-suggest-list";
  const alternatives = docSuggestAlternatives(finding);
  //: **A candidate word is a word, not an action, and it used to be drawn as
  //: one.** Every row carried the same `ph:check`, so five suggestions read as
  //: five identical commands with different arguments, and the eye had nothing
  //: to tell them apart by except the text it was meant to be comparing.
  //: Reported as exactly that. Every other spell checker anyone has used shows
  //: the candidates bare, and that is the point: the row IS the word. The
  //: check mark stays where it means something, on the panel's own "apply this
  //: fix" button, and the actions below this list keep their icons, so the
  //: menu now separates into "which word" and "what to do about it" without a
  //: divider having to say so. The first candidate carries the weight, because
  //: it is the one Enter and a double-click take.
  alternatives.forEach((option, index) => {
    const item = document.createElement("button");
    item.type = "button";
    item.className = index === 0 ? "doc-suggest-item doc-suggest-best" : "doc-suggest-item";
    item.textContent = option === " " ? "one space" : option;
    item.title = `Replace with \u201c${option}\u201d`;
    item.addEventListener("click", () => {
      docProseFix({ ...finding, replacement: option });
      close();
    });
    list.appendChild(item);
  });
  if (!alternatives.length) {
    const none = document.createElement("p");
    none.className = "muted doc-suggest-none";
    //: A rule with no fix still opens this menu, because "ignore it" and "this
    //: is fine" are answers too: and because a row you cannot press at all
    //: reads as a broken row.
    none.textContent = "No single answer for this one, it is a place to look, not a correction.";
    list.appendChild(none);
  }
  frag.appendChild(list);

  const actions = document.createElement("div");
  actions.className = inline ? "doc-suggest-actions doc-suggest-actions-inline" : "doc-suggest-actions";
  if (finding.rule === "spelling" || finding.rule === "variant") {
    const add = document.createElement("button");
    add.type = "button";
    add.className = "doc-suggest-item";
    setLabel(add, `ph:book-open-text Add \u201c${finding.text}\u201d to dictionary`);
    add.addEventListener("click", async () => {
      close();
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
    close();
    renderDocProse();
    renderDocProsePanel();
  });
  actions.appendChild(ignore);

  if (docFindingIsPassage(finding)) {
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
    setLabel(askAi, "ph:magic-wand Ask Atlas for wordings\u2026");
    askAi.title = "Have the local model suggest two or three other ways to put this";
    askAi.addEventListener("click", async () => {
      if (!currentDoc || !currentDoc.id) return toast("Save the document first.", true);
      setLabel(askAi, "ph:hourglass Thinking\u2026");
      askAi.disabled = true;
      const body = await apiJson(`/documents/${currentDoc.id}/rephrase`, {
        method: "POST",
        body: JSON.stringify({ passage: finding.text, note: finding.message || "" }),
      }).catch(() => null);
      //: The surface may have been closed, or opened on something else, while
      //: the model was thinking. Writing into it then would put one finding's
      //: suggestions under another finding's heading.
      if (!current()) return;
      const options = (body && body.options) || [];
      if (!options.length) {
        setLabel(askAi, "ph:magic-wand Ask Atlas for wordings\u2026");
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
        item.title = `Replace with \u201c${option}\u201d`;
        item.addEventListener("click", () => {
          docProseFix({ ...finding, replacement: option });
          close();
        });
        list.appendChild(item);
      }
      reflow();
    });
    actions.appendChild(askAi);

    //: **Translation, through the chat rather than behind it.** There is no
    //: offline translator in this app and inventing one would be a lie; what
    //: there *is* is a local model that can translate, and the honest way to
    //: offer that is to hand the passage to it with the question already
    //: written, where the answer is visible and correctable, not to silently
    //: rewrite the document with something nobody checked.
    const translate = document.createElement("button");
    translate.type = "button";
    translate.className = "doc-suggest-item";
    setLabel(translate, "ph:translate Translate this passage\u2026");
    translate.addEventListener("click", () => {
      close();
      docTranslatePassage(finding.text);
    });
    actions.appendChild(translate);
  }
  frag.appendChild(actions);
  return frag;
}

function openDocSuggest(finding, anchorRect, focus = true) {
  const menu = $("doc-suggest-menu");
  if (!menu) return;
  docSuggestOpenFor = finding;
  menu.replaceChildren();

  const head = document.createElement("div");
  head.className = "doc-suggest-head";
  head.appendChild(docFindingLine(finding, "head"));
  menu.appendChild(head);
  menu.appendChild(
    docSuggestAnswers(finding, {
      close: closeDocSuggest,
      current: () => docSuggestOpenFor === finding,
      reflow: placeDocSuggest,
    })
  );

  docLiftToViewport(menu);
  menu.classList.remove("hidden");
  //: Copied rather than kept by reference, and with a right edge filled in:
  //: `DOMRect`s are live for some sources and stale for others, and the caret
  //: fallback hands over a point with no `right` at all, which the
  //: right-alignment below would otherwise read as NaN and place nowhere.
  docSuggestAnchor = {
    left: anchorRect.left,
    right: anchorRect.right ?? anchorRect.left,
    top: anchorRect.top,
    bottom: anchorRect.bottom,
  };
  placeDocSuggest();
  //: Only when the gesture asked for the menu. A plain click on a word is
  //: someone putting the caret in it, and taking the focus then sends their
  //: next keystroke to a button (see the `click` listener below).
  if (focus) menu.querySelector("button")?.focus();
}

//: **A popup placed in viewport coordinates has to live in the viewport's own
//: frame, and inside this tab it did not.** INBOX 168, with a screenshot: the
//: word menu for "tets" drawn at the right edge of the window with its column
//: cut off past it and its list under the bottom bar. Every clamp in
//: `placeDocSuggest` is unconditional, so the menu cannot leave the viewport
//: by arithmetic; what it can do is be laid out against something that is not
//: the viewport. A `position: fixed` element is laid out against the nearest
//: ancestor carrying a `filter`, `transform` or `backdrop-filter`, and
//: `.card.doc-main` is exactly that whenever the background art is on
//: (`:root[data-bg-art="on"]:not([data-glass="off"]) .card`, which is the
//: default pair of settings the moment someone turns the art on). Measured at
//: 1440x900 with the art on, before this: the menu asked for `left 952, top
//: 322` and rendered at `1245..1485, 399`, 45px past the right edge of the
//: window and 53px away from the word it belongs to, which is also INBOX 128's
//: "wide gap". The same blur makes the card a stacking context, so no z-index
//: could lift the menu over the bars outside it either.
//:
//: So the popup leaves the card while it is open and goes back on a comment
//: placeholder on the way out, the same move `buildTableBlock`'s full view
//: makes for the same reason. It has to be a move rather than a stylesheet
//: change: the card's blur is a deliberate part of the background-art look,
//: and a viewport popup has no business being a descendant of a surface that
//: can be blurred, transformed or scaled at any time.
const docLiftedHome = new WeakMap();

function docLiftToViewport(el) {
  if (!el || el.parentElement === document.body) return el;
  const home = document.createComment(`${el.id || "popup"} while it is open`);
  el.replaceWith(home);
  docLiftedHome.set(el, home);
  document.body.appendChild(el);
  return el;
}

function docReturnFromViewport(el) {
  const home = el && docLiftedHome.get(el);
  if (!home || !home.parentNode) return;
  home.replaceWith(el);
  docLiftedHome.delete(el);
}

//: **Ask for a viewport position, then check the popup landed there.** The
//: belt to the braces above: body itself can carry a transform (a page
//: animation, a future shell), and one ancestor with a filter anywhere in the
//: chain silently turns every number here into an offset from somewhere else.
//: Measuring what was drawn and correcting by the difference costs one rect
//: read and is exact for any containing block that only translates the frame,
//: which is what a filter, a backdrop-filter and a translate all do. It is a
//: no-op, and reads as one, when the frame is the viewport.
function docPlaceFixed(el, left, top) {
  el.style.left = `${Math.round(left)}px`;
  el.style.top = `${Math.round(top)}px`;
  const at = el.getBoundingClientRect();
  const dx = left - at.left;
  const dy = top - at.top;
  if (Math.abs(dx) > 0.5 || Math.abs(dy) > 0.5) {
    el.style.left = `${Math.round(left + dx)}px`;
    el.style.top = `${Math.round(top + dy)}px`;
  }
}

//: Kept so the menu can be re-placed after it changes size, the AI wordings
//: arrive seconds after it opens and make it taller, and a menu that grew
//: downwards off the bottom of the window is a menu whose best suggestion is
//: unreachable.
let docSuggestAnchor = null;

//: The gap the menu keeps from the word, and from every edge it is clamped to.
const DOC_SUGGEST_GAP = 4;
const DOC_SUGGEST_EDGE = 8;

//: **The band the menu is allowed to occupy: the editor's own box first, the
//: window second** (DOCUMENTS_PLAN 12 D4).
//:
//: Reported as "the popup edit suggestions menu screws upn the screen and make
//: sit go out of bounds", and measured: a flagged word at the end of a long
//: line sits at `left 1161` in a card whose right edge is `1255`, and clamping
//: to the *window* put the menu at `1161..1401`, so 146 of its 240px hung past
//: the card into the window's own gutter, pointing at a document it was no
//: longer over. The window is not the frame this menu belongs to; the text is.
//:
//: Only when the card is actually wide enough to hold it: below that the band
//: would be narrower than the menu and every placement inside it would be a
//: lie, so a narrow window falls back to the viewport, which is the one frame
//: that always exists.
function docSuggestBand(width) {
  const band = {
    min: DOC_SUGGEST_EDGE,
    max: window.innerWidth - DOC_SUGGEST_EDGE,
  };
  const host = docCmView ? docCmView.dom.getBoundingClientRect() : docSurface()?.rect?.();
  if (host && host.right - host.left >= width + 2) {
    band.min = Math.max(band.min, host.left);
    band.max = Math.min(band.max, host.right);
  }
  return band;
}

function placeDocSuggest() {
  const menu = $("doc-suggest-menu");
  if (!menu || !docSuggestAnchor || menu.classList.contains("hidden")) return;
  //: Measured after it is visible, because a hidden element measures zero and
  //: a menu positioned against zero opens in the corner.
  const width = menu.offsetWidth;
  const height = menu.offsetHeight;
  const band = docSuggestBand(width);

  //: Left edge against the word's left edge, which is where a menu about a word
  //: reads from. When that would cross the band's right edge the menu is
  //: *right-aligned to the word* instead of slid back along it: the two boxes
  //: then share an edge, which still reads as "this belongs to that word", and
  //: the menu ends up beside the word rather than hanging off the card.
  let left = docSuggestAnchor.left;
  if (left + width > band.max) left = (docSuggestAnchor.right ?? docSuggestAnchor.left) - width;
  left = Math.max(band.min, Math.min(left, band.max - width));

  //: Below the word, above it when there is no room below, and clamped to the
  //: window in both directions. The old version clamped the *top* only, so an
  //: anchor low in a short window flipped to a negative top, was pulled back to
  //: 8, and drew its bottom rows off the end of the screen.
  let top = docSuggestAnchor.bottom + DOC_SUGGEST_GAP;
  if (top + height > window.innerHeight - DOC_SUGGEST_EDGE) {
    const above = docSuggestAnchor.top - height - DOC_SUGGEST_GAP;
    top = above >= DOC_SUGGEST_EDGE ? above : top;
  }
  top = Math.max(
    DOC_SUGGEST_EDGE,
    Math.min(top, window.innerHeight - DOC_SUGGEST_EDGE - height)
  );

  docPlaceFixed(menu, left, top);
}

//: **A menu about a word goes where the word goes, or it goes away.** The
//: anchor is copied at open time, so anything that moves the text under an
//: open menu leaves it pointing at whatever has scrolled into that spot: the
//: editor scrolled with the wheel, the window resized, the sidebar or the chat
//: dock opened beside it. None of those reach the mousedown and input
//: listeners that close this menu, which is why it could be left stranded.
//:
//: Re-measured rather than re-clamped: the stored rect is the stale thing, so
//: placing it again would only move a wrong answer. The mark is found again
//: from the finding the menu is open on, and when it has left the editor's
//: visible box, or is no longer drawn at all, the menu closes, which is
//: DOCUMENTS_PLAN 12 D4's rule ("a menu that points at a word that is off
//: screen is a menu pointing at nothing") applied after the open rather than
//: only during it.
function docSuggestFollowAnchor(event) {
  const menu = $("doc-suggest-menu");
  if (!menu || menu.classList.contains("hidden") || !docSuggestOpenFor) return;
  //: The menu scrolls its own overflow, and that scroll reaches this listener
  //: in the capture phase like any other. Following the word because someone
  //: is reading the last row of the menu would be absurd.
  if (event && event.target instanceof Node && menu.contains(event.target)) return;
  const mark = docFindingMarks().find((el) => el._docFinding === docSuggestOpenFor);
  if (!mark) return closeDocSuggest();
  const rect = docMarkAnchor(mark, null);
  const host = docCmView ? docCmView.dom.getBoundingClientRect() : docSurface()?.rect?.();
  if (!rect || (host && (rect.bottom <= host.top + 1 || rect.top >= host.bottom - 1))) {
    return closeDocSuggest();
  }
  docSuggestAnchor = {
    left: rect.left,
    right: rect.right ?? rect.left,
    top: rect.top,
    bottom: rect.bottom,
  };
  placeDocSuggest();
}

window.addEventListener("resize", docSuggestFollowAnchor);
//: Capture, because the scroll that matters is the editor's own and a scroll
//: event does not bubble.
window.addEventListener("scroll", docSuggestFollowAnchor, true);

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
  //: The count as a fact beside the title, not as a sentence in the copy: a
  //: dictionary you cannot see the size of is one nobody believes is being kept
  //: (the report this whole surface answers was "I swear I added 'idk' to the
  //: dictionary last night").
  const count = $("doc-dictionary-count");
  if (count) {
    count.textContent = words.length
      ? `${words.length} word${words.length === 1 ? "" : "s"}`
      : "empty";
  }
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
  //: Whether the *browser's* checker draws squiggles, which is a question with
  //: two answers over the life of one editor: see `docCmSpellcheck`.
  spell: null,
  //: A code file's diagnostics and completions (`docCodeTools`); empty for
  //: prose and in Plain.
  code: null,
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
    //: `jsx: true` because a React file is a `.js` file as often as not,
    //: and without it every `<div>` in one was an error node, underlined as
    //: a syntax error in code that runs. TypeScript stays without it: TSX
    //: reads `<T>(x) => x` as a tag, which would break valid `.ts`.
    case "js": return CM.javascript.javascript({ jsx: true });
    case "ts": return CM.javascript.javascript({ typescript: true });
    case "py": return CM.python.python();
    case "css": return CM.css.css();
    case "html": return CM.html.html();
    case "json": return CM.json.json();
    case "yaml": return CM.yaml.yaml();
    case "bash": return stream(CM.shell);
    //: `standardSQL`, the mode: `sql` is the factory that makes one, and
    //: mounting it threw "i is not a function" from the parser, so opening a
    //: .sql document failed outright (found by tests/test_code_vscode.py).
    case "sql": return stream(CM.standardSQL);
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
    //: Added with the modes themselves (2026-09-09). `ini` is CodeMirror's
    //: `properties` mode, which is what that format is called there.
    case "swift": return stream(CM.swift);
    case "r": return stream(CM.r);
    case "ini": return stream(CM.properties);
    //: **`php` and `csv` stay plain text on purpose.** `@codemirror/lang-php`
    //: is a full Lezer grammar that also drags in lang-html, measured at
    //: +28,563 bytes gzipped, 10.6% of this bundle, for one language; and a
    //: CSV has no syntax to colour, so a highlighter would draw attention to
    //: its commas and nothing else. Both are recorded as decisions in
    //: DOCUMENTS_PLAN rather than left looking like an oversight. A wrong
    //: highlighter is worse than none, and so is a pointless one.
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
//: The Live table's placement rules, one pair per column count.
//:
//: A CodeMirror line is the grid, and its children are whatever the
//: decorations left there: the cell marks, and behind every hidden pipe two
//: `cm-widgetBuffer` images and an empty `contenteditable=false` span. Those
//: three are zero-width and were still taking a `1fr` track each under
//: `grid-auto-flow: column`, which is why a table drew its cells 51.6px wide
//: with three empty columns of gap between them and wrapped every word.
//: Placing the cells by index and pinning everything else into the first
//: track at zero width is the only arrangement that stays right whatever the
//: decorations do: a mark the table does not know about (a spelling
//: underline, a search match) can be added tomorrow without taking a column.
function docTableGridRules() {
  const rules = {};
  for (let n = 1; n <= DOC_TABLE_GRID_MAX; n += 1) {
    rules[`.cm-md-cols-${n}`] = {
      gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))`,
      //: **An implicit row gets no height** (the owner, twice: "when I click
      //: on a header row in a table on the live view, another row appears
      //: below it until I click off"). Measured with the caret in the header
      //: at 1440: `grid-template-rows` reads "28.19px 25.59px" and the line
      //: grows from 29.2px to 54.8px. The second row holds one child, the
      //: trailing `<br>` CodeMirror appends to every line, which sits at
      //: top+32.2 while every other child sits at top+1.
      //:
      //: The rule below already assigns it `grid-area: 1 / 1` and its computed
      //: `grid-row-start` reads 1, so pinning it harder is not the answer, and
      //: pinning the menu instead was measured and changed nothing. What is
      //: certain is that the row is implicit, and an implicit row here is
      //: always wrong: every cell of a table row is placed explicitly by
      //: `.cm-md-c*`, so anything auto-placed is furniture, not content, and
      //: furniture must not add height to the line.
      //: One explicit row, then implicit ones with no height. Both halves are
      //: needed and `grid-auto-rows` alone was measured collapsing the line to
      //: 1px: with no `grid-template-rows` every row here is implicit,
      //: including the one the cells are in, so zeroing implicit rows zeroed
      //: the table.
      gridTemplateRows: "auto",
      gridAutoRows: "0",
    };
    //: The menu is excluded because it is absolutely positioned against the
    //: header line and is not in the grid's flow at all; giving it `width: 0`
    //: would take its buttons away.
    rules[`.cm-md-cols-${n} > *:not(.cm-md-td):not(.cm-md-table-menu)`] = {
      gridArea: "1 / 1",
      justifySelf: "start",
      width: "0",
      overflow: "hidden",
    };
    rules[`.cm-md-c${n}`] = { gridColumn: String(n), gridRow: "1" };
  }
  return rules;
}

//: **Indent guides under a nested list** (INBOX 392). A nested item was
//: told apart from its parent by its indent alone, and three levels deep a
//: reader was counting em widths to know which item a line belonged to. One
//: hairline per ancestor, down the column of that ancestor's own marker, is
//: what every outliner draws; it is a background rather than a border or a
//: widget because a line decoration can carry it without adding a node, and
//: it cannot move the text. The marker of level `k` sits at `k * 1.6em` (the
//: hanging indent in the theme), so the guide for level `j` is at that plus
//: 0.3em, under the bullet's middle.
function docListGuides(depth) {
  const tone = "color-mix(in srgb, var(--muted) 35%, transparent)";
  const ink = `linear-gradient(${tone}, ${tone})`;
  const layers = [];
  const places = [];
  for (let j = 0; j < depth; j += 1) {
    layers.push(ink);
    places.push(`${(j * 1.6 + 0.3).toFixed(2)}em 0`);
  }
  return {
    backgroundImage: layers.join(", "),
    backgroundPosition: places.join(", "),
    backgroundSize: "1px 100%",
    backgroundRepeat: "no-repeat",
  };
}

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
      //: The fold lane is a line tall and centred in itself, so an arrow lines
      //: up with the number beside it and with the text it folds. Without the
      //: explicit `lineHeight` the marker inherits the gutter's own, which is
      //: not the editor's line height, and every arrow sits a little high.
      ".cm-foldGutter": { width: "1.1em" },
      ".cm-foldGutter .cm-gutterElement": {
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "0",
        lineHeight: "inherit",
        cursor: "pointer",
      },
      ".cm-fold-caret": {
        fontSize: "0.85em",
        lineHeight: "1",
        color: "var(--muted)",
      },
      ".cm-gutterElement:hover .cm-fold-caret": { color: "var(--text)" },
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

      //: --- a code file's diagnostics and completions (INBOX 392) ----------
      //: CodeMirror's own lint styles are fixed colours (#d11 for an error,
      //: a red SVG squiggle, a white-on-#17c selected completion), which is
      //: the same trap the highlighter fell into (`docCmHighlight`): right on
      //: a white page, wrong on this app's dark one, and deaf to a custom
      //: accent. Every one is restated here in the app's tokens.
      //:
      //: The underline is the prose findings' own shape, a wavy line in the
      //: kind's ink (`.cm-finding-spelling`), so an error in code and a
      //: misspelling in prose are one idea drawn once. The SVG CodeMirror
      //: paints as a background is switched off rather than recoloured: its
      //: colour is baked into a data URL.
      ".cm-lintRange": {
        backgroundImage: "none",
        paddingBottom: "0",
        textDecorationSkipInk: "none",
        textUnderlineOffset: "0.18em",
      },
      ".cm-lintRange-error": {
        textDecoration: "underline wavy",
        textDecorationColor: "var(--error)",
      },
      ".cm-lintRange-warning": {
        textDecoration: "underline wavy",
        textDecorationColor: "var(--warn)",
      },
      ".cm-lintRange-info, .cm-lintRange-hint": {
        textDecoration: "underline dotted",
        textDecorationThickness: "2px",
        textDecorationColor: "var(--muted)",
      },
      ".cm-lintRange-active": { backgroundColor: "var(--accent-soft)" },
      //: The gutter mark: a dot in the kind's ink, centred on its line. The
      //: library's marker is an SVG in its own colours set as `content`, so
      //: `content: normal` takes it away and the box draws the dot.
      ".cm-gutter-lint": { width: "1em" },
      ".cm-gutter-lint .cm-gutterElement": {
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "0",
      },
      ".cm-lint-marker": {
        content: "normal",
        width: "0.55em",
        height: "0.55em",
        borderRadius: "var(--radius-pill)",
        backgroundColor: "var(--muted)",
      },
      ".cm-lint-marker-error": { backgroundColor: "var(--error)" },
      ".cm-lint-marker-warning": { backgroundColor: "var(--warn)" },
      ".cm-diagnostic": {
        padding: "var(--space-2) var(--space-4)",
        marginLeft: "0",
        fontSize: "var(--text-sm)",
        borderLeft: "3px solid var(--muted)",
      },
      ".cm-diagnostic-error": { borderLeftColor: "var(--error)" },
      ".cm-diagnostic-warning": { borderLeftColor: "var(--warn)" },
      ".cm-diagnostic-info, .cm-diagnostic-hint": { borderLeftColor: "var(--accent)" },
      ".cm-tooltip-lint": { padding: "0", borderRadius: "var(--radius-sm, 6px)" },
      //: A quick fix on the hover card. The library's own is white on a
      //: fixed dark grey, a black slab on this app's light page; here it is
      //: the quiet tinted button, on its own line under the message it
      //: answers, with the accent edge on hover and on keyboard focus.
      ".cm-diagnosticAction": {
        font: "inherit",
        fontSize: "var(--text-sm)",
        color: "var(--text)",
        backgroundColor: "var(--accent-soft)",
        border: "none",
        borderRadius: "var(--radius-sm, 6px)",
        padding: "var(--space-1) var(--space-3)",
        margin: "var(--space-2) var(--space-2) 0 0",
        cursor: "pointer",
      },
      ".cm-diagnosticAction:hover, .cm-diagnosticAction:focus-visible": {
        boxShadow: "inset 0 0 0 1px var(--accent)",
        outline: "none",
      },
      //: **Opaque, where the tooltip above is glass.** `--card` is 55%
      //: opaque (measured through `doccode.js`), which is right for a panel
      //: over the page's own ground and wrong for a box of words laid over
      //: other words: the code under a diagnostic read through its message.
      //: The ground the selection bar uses for the same reason
      //: (DESIGN.md's recipe index, "a bar of actions").
      ".cm-tooltip.cm-tooltip-hover, .cm-tooltip.cm-tooltip-autocomplete": {
        backgroundColor: "var(--modal-bg-opaque)",
      },
      ".cm-tooltip.cm-tooltip-autocomplete": {
        borderRadius: "var(--radius-sm, 6px)",
        boxShadow: "var(--shadow-md)",
        overflow: "hidden",
      },
      ".cm-tooltip.cm-tooltip-autocomplete > ul": {
        fontFamily: "var(--mono, ui-monospace, monospace)",
        fontSize: "var(--text-sm)",
        maxHeight: "16em",
      },
      ".cm-tooltip.cm-tooltip-autocomplete > ul > li": {
        padding: "var(--space-1) var(--space-4)",
        lineHeight: "1.5",
      },
      ".cm-tooltip-autocomplete ul li[aria-selected]": {
        backgroundColor: "var(--accent-soft)",
        color: "var(--text)",
      },
      ".cm-completionMatchedText": {
        textDecoration: "none",
        fontWeight: "700",
        color: "var(--accent)",
      },
      ".cm-completionDetail": { color: "var(--muted)", fontStyle: "normal" },
      ".cm-completionIcon": { color: "var(--muted)", opacity: "1" },
      //: The detail pane beside the list (an Emmet row's expansion): the
      //: list's own opaque ground and code type, because it is code laid
      //: over code.
      ".cm-tooltip.cm-completionInfo": {
        backgroundColor: "var(--modal-bg-opaque)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius-sm, 6px)",
        boxShadow: "var(--shadow-md)",
        padding: "var(--space-2) var(--space-3)",
        maxWidth: "min(480px, 60vw)",
      },
      ".cm-emmet-preview": {
        margin: "0",
        fontFamily: "var(--mono, ui-monospace, monospace)",
        fontSize: "var(--text-sm)",
        lineHeight: "1.5",
        color: "var(--text)",
        whiteSpace: "pre",
        tabSize: "2",
      },
      //: The ghost text: the rest of the chosen row after the caret, in the
      //: muted ink the placeholder uses, so it reads as offered, not typed.
      ".cm-ghostText": { color: "var(--muted)", opacity: "0.85", pointerEvents: "none" },
      //: Shown whitespace (Alt+Z's neighbour in the menu): a dot per space and
      //: a line through a tab, in muted ink rather than the library's grey.
      ".cm-highlightSpace": {
        backgroundImage: "radial-gradient(circle at 50% 55%, var(--muted) 14%, transparent 16%)",
      },
      ".cm-highlightTab": {
        backgroundImage: "linear-gradient(var(--muted), var(--muted))",
        backgroundSize: "70% 1px",
        backgroundPosition: "50% 55%",
        backgroundRepeat: "no-repeat",
      },
      //: Indentation guides: a hairline in `--border` at the left edge of
      //: each step of the whitespace, so it stops where the code starts.
      ".cm-indent-guide": {
        backgroundImage: "linear-gradient(to right, var(--border) 0 1px, transparent 1px)",
        backgroundRepeat: "no-repeat",
      },
      //: Bracket pairs by depth: three of the app's own inks, each mixed a
      //: third of the way back to the text, so the pairs are told apart
      //: without the brackets shouting over the code between them.
      ".cm-bracket-0": { color: "color-mix(in srgb, var(--accent) 70%, var(--text))" },
      ".cm-bracket-1": { color: "color-mix(in srgb, var(--syntax-keyword, var(--ok)) 70%, var(--text))" },
      ".cm-bracket-2": { color: "color-mix(in srgb, var(--warn) 70%, var(--text))" },
      //: A name's one line on hover: the name in code type, the line in the
      //: body's, the values it takes in muted ink under it.
      ".cm-hover-doc": {
        padding: "var(--space-2) var(--space-3)",
        maxWidth: "min(420px, 70vw)",
        fontSize: "var(--text-sm)",
        lineHeight: "1.5",
      },
      ".cm-hover-doc code": { fontFamily: "var(--mono, ui-monospace, monospace)", fontWeight: "600", color: "var(--text)" },
      ".cm-hover-doc-line": { color: "var(--text)", marginTop: "var(--space-1)" },
      ".cm-hover-doc-values": { color: "var(--muted)", marginTop: "var(--space-1)" },
      //: A colour value's swatch: the colour on a hairline in the border
      //: token, square with the inner radius, one text-height small, so it
      //: reads as a mark beside the value and not as a control of its own.
      ".cm-color-swatch": {
        display: "inline-block",
        width: "0.8em",
        height: "0.8em",
        marginRight: "var(--space-1)",
        verticalAlign: "-0.05em",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius-inner)",
        cursor: "pointer",
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
      //: **The three tinted inlines wrap as whole chips, not as a chip cut in
      //: half.** Reported (INBOX 232): "link chips wrap oddly". `box-
      //: decoration-break` defaults to `slice`, which lays the background,
      //: the rounded corners and the horizontal padding out once across the
      //: whole run and then cuts it at the line break: the fragment that ends
      //: a line has a flat right edge and no padding after its last letter,
      //: and the fragment that starts the next one is flush against the
      //: column's left margin with no padding and no rounding. Measured at
      //: 390px on a document of wiki links: three of nine chips broke that
      //: way, the second fragment starting at x=10, the column's own edge.
      //:
      //: `clone` gives every fragment the whole decoration, so a wrapped chip
      //: reads as two chips rather than as one broken one. The `-webkit-`
      //: spelling is the one Chromium still implements, so both are set and
      //: the standard name is second, to win where it is supported.
      //:
      //: All three, not just the wiki link: inline code and a highlight are
      //: the same shape (a tint with a radius and side padding) and break the
      //: same way, which is why a fix for one of them is a fix for the class.
      ".cm-md-code, .cm-md-highlight, .cm-md-wiki": {
        WebkitBoxDecorationBreak: "clone",
        boxDecorationBreak: "clone",
      },
      ".cm-md-code": {
        fontFamily: "var(--mono, ui-monospace, monospace)",
        backgroundColor: "var(--field-inset)",
        borderRadius: "3px",
        padding: "0 0.25em",
      },
      //: Yellow is the default, the same as the saved view's
      //: `mark.text-highlight-yellow`. It read `--accent-soft` here, which is
      //: the *blue* of that set, so every plain highlight in the live view came
      //: out blue and only a highlight somebody had explicitly called blue
      //: looked right. One rule per colour in the allowlist above, taking the
      //: same tokens as 05-sidebars-themes.css so the two views match in both
      //: themes.
      ".cm-md-highlight": { backgroundColor: "var(--warn-soft)", borderRadius: "3px" },
      ".cm-md-highlight-yellow": { backgroundColor: "var(--warn-soft)" },
      ".cm-md-highlight-green": { backgroundColor: "var(--ok-soft)" },
      ".cm-md-highlight-blue": { backgroundColor: "var(--accent-soft)" },
      ".cm-md-highlight-pink": { backgroundColor: "rgba(236, 72, 153, 0.22)" },
      ".cm-md-highlight-purple": { backgroundColor: "rgba(168, 85, 247, 0.22)" },
      ".cm-md-highlight-orange": { backgroundColor: "rgba(249, 115, 22, 0.22)" },
      ".cm-md-highlight-red": { backgroundColor: "rgba(239, 68, 68, 0.22)" },
      ".cm-md-highlight-grey": { backgroundColor: "rgba(148, 163, 184, 0.25)" },
      //: **A commented span, told apart from a plain highlight** (Phase 5 item
      //: 1). A hairline under the words rather than a fourth underline *shape*:
      //: the three the findings own (wavy in the error ink, wavy in the accent,
      //: dotted in the muted) are all `text-decoration`, and a fourth one would
      //: be a fourth thing for a reader to decode in the same channel. A border
      //: is a different channel, and it reads correctly against the highlight's
      //: own ground, which is doing half the work already.
      ".cm-md-commented": { borderBottom: "1px solid var(--accent)" },
      //: **The remark itself, as a pin rather than as purple text.** A comment
      //: has to be visible in the document without being read in it, which is
      //: the whole difference between a margin note and the prose, so the
      //: `%%…%%` hides like every other marker and this takes its place. Sized
      //: in `em` and aligned on the text's own middle so a line with a pin in it
      //: is the same height as a line without one: measured, 24px either way.
      //: Every longhand a bare `button` would otherwise bring (the accent fill,
      //: the shadow, the 0.5rem of padding) is turned off here rather than in
      //: the stylesheet, because this element exists only inside the view and a
      //: widget split across two files is a widget that drifts.
      ".doc-comment-pin": {
        display: "inline-flex",
        verticalAlign: "middle",
        margin: "0 0.15em",
        padding: "0 0.25em",
        border: "0",
        borderRadius: "var(--radius-pill)",
        background: "var(--accent-soft)",
        boxShadow: "none",
        color: "var(--accent)",
        fontSize: "0.8em",
        lineHeight: "1.6",
        cursor: "pointer",
      },
      ".doc-comment-pin:hover": { background: "var(--accent)", color: "var(--on-accent)" },
      ".cm-md-link": { color: "var(--accent)", textDecoration: "underline", cursor: "pointer" },
      ".cm-md-wiki": {
        color: "var(--accent)",
        backgroundColor: "var(--accent-soft)",
        borderRadius: "4px",
        padding: "0 0.25em",
        cursor: "pointer",
      },
      //: A block id when the caret is on its line. Muted and monospaced, so it
      //: reads as scaffolding the moment it appears rather than as a word
      //: somebody typed at the end of the sentence.
      ".cm-md-blockid": {
        color: "var(--muted)",
        fontFamily: "var(--mono, ui-monospace, monospace)",
        fontSize: "0.85em",
      },
      //: **A list item's hanging indent.** `padding-left` moves the whole
      //: line in and a matching negative `text-indent` pulls the first line
      //: back out again, so the marker sits in the margin and the words line
      //: up under each other however many times the item wraps. One rule per
      //: depth rather than a CSS variable, because a CodeMirror theme is a
      //: static stylesheet and there is nowhere to set a per-line variable
      //: without an inline style, which the app's CSP refuses.
      //:
      //: `1.6em` is the width of a marker and its space at this type size,
      //: measured rather than chosen: a `-` plus a space is 2 characters of a
      //: 0.8em-per-character face.
      ".cm-md-li": { paddingLeft: "1.6em", textIndent: "-1.6em" },
      ".cm-md-li-1": { paddingLeft: "3.2em", textIndent: "-1.6em", ...docListGuides(1) },
      ".cm-md-li-2": { paddingLeft: "4.8em", textIndent: "-1.6em", ...docListGuides(2) },
      ".cm-md-li-3": { paddingLeft: "6.4em", textIndent: "-1.6em", ...docListGuides(3) },
      ".cm-md-li-4": { paddingLeft: "8em", textIndent: "-1.6em", ...docListGuides(4) },
      ".cm-md-task-done": {
        color: "var(--muted)",
        textDecoration: "line-through",
        textDecorationColor: "color-mix(in srgb, var(--muted) 70%, transparent)",
      },
      //: The marker itself: the muted ink, so the eye reads the words rather
      //: than the punctuation, and left in the document so it can be
      //: selected, deleted and typed over like any other character.
      ".cm-md-li-mark": { color: "var(--muted)" },
      //: **A quotation's bar has to be seen to do its job** (17c). It was
      //: `--border`, a 10% ink that composites to 1.2:1 on the page, so a
      //: quotation read as a paragraph set in grey. Half the muted ink is a
      //: rule you can see without it competing with the callout's accent
      //: bar, and the rendered view's `#doc-preview blockquote` (09-editor.css)
      //: now draws the same bar, inset and ink, where before it drew the
      //: browser's own 40px indent and nothing else.
      ".cm-md-quote": {
        borderLeft: "3px solid color-mix(in srgb, var(--muted) 70%, transparent)",
        paddingLeft: "var(--space-5)",
        color: "var(--muted)",
      },
      ".cm-md-callout": {
        borderLeft: "3px solid var(--accent)",
        paddingLeft: "0.75em",
        backgroundColor: "var(--accent-soft)",
      },
      //: The inset is the rendered `pre`'s own (`--space-5`): without it the
      //: code's first glyph sat on the very edge of its tinted slab, 0px in,
      //: which is how a block reads as a highlighted paragraph rather than
      //: as a panel of code (17c).
      ".cm-md-fence": {
        fontFamily: "var(--mono, ui-monospace, monospace)",
        backgroundColor: "var(--field-inset)",
        paddingInline: "var(--space-5)",
      },
      //: The opening and closing fence rows. Their text is hidden (INBOX
      //: 198), so a full line-height row of it is 26px of nothing at each end
      //: of every code block; these give them the height of padding instead,
      //: and round the block's own corners so five tinted rows read as one
      //: slab. `position: relative` is the anchor for the language label
      //: below.
      ".cm-md-fence-open, .cm-md-fence-close": {
        position: "relative",
      },
      //: Only while the row has nothing on it. With the caret inside the
      //: block its `” ``` ”` is back, and half a line of height would clip it.
      //:
      //: **And only while the line numbers are off** (INBOX 262: "the page
      //: numbers and collapse arrows in the documents clash with other page
      //: numnbers"). A gutter draws one element per line at that line's own
      //: height, but the number inside it keeps the editor's line-height, so
      //: a row collapsed to half a line leaves its digit standing 26px tall
      //: in an 8px box. Measured on a fenced block with the gutter on: "6
      //: paints 18px into 7" and "8 paints 18px into 9", which is the pair in
      //: the report's screenshot exactly.
      //:
      //: Numbers win, because they are the contract: one row, one number, in
      //: line with the text it counts. The tidy block is what prose gets, and
      //: prose is where the gutter is off by default (`docGutterWanted`),
      //: which is also where a fenced block wearing two blank rows was worth
      //: fixing in the first place.
      //:
      //: The decision is made where the class is set, not here: a CodeMirror
      //: theme's rules are injected into a stylesheet this page cannot read
      //: back, and a `:has(.cm-gutters)` guard written here could not be
      //: verified in the browser, only hoped for. `docGutterWanted` already
      //: knows the answer at decoration time.
      ".cm-md-fence-quiet": {
        height: "0.5em",
      },
      ".cm-md-fence-open": {
        borderTopLeftRadius: "var(--radius-sm, 6px)",
        borderTopRightRadius: "var(--radius-sm, 6px)",
      },
      ".cm-md-fence-close": {
        borderBottomLeftRadius: "var(--radius-sm, 6px)",
        borderBottomRightRadius: "var(--radius-sm, 6px)",
      },
      //: The block's language, in the corner rather than on a line of its
      //: own: it is a label for the block, the same relationship
      //: `.cm-md-callout-label` has to a callout, and the whole point of this
      //: change is that the block stops spending rows on things that are not
      //: code. `user-select: none` and `pointer-events: none` so a drag
      //: across the block selects the code and not the word "python".
      ".cm-md-fence-open[data-lang]::after": {
        content: "attr(data-lang)",
        position: "absolute",
        right: "0.6em",
        top: "0",
        fontSize: "0.7em",
        lineHeight: "1.6",
        color: "var(--muted)",
        userSelect: "none",
        pointerEvents: "none",
      },
      //: A rule whose own `---` is hidden is an empty line, and an empty line
      //: with a bottom border is a hairline sitting on the baseline of nothing.
      //: The height is what makes it read as a divider between two blocks
      //: rather than as an underline belonging to the paragraph above.
      ".cm-md-rule": {
        borderBottom: "1px solid var(--border)",
        height: "0.6em",
        margin: "0.4em 0",
      },
      //: The gaps between blocks (17b), one token each; the note beside the
      //: decoration in `docLivePlugin` says why this is `line-height` and not
      //: `height`.
      ".cm-md-gap": { lineHeight: "var(--space-6)" },
      ".cm-md-gap-major": { lineHeight: "var(--space-9)" },
      ".cm-md-gap-minor": { lineHeight: "var(--space-8)" },
      ".cm-md-gap-tight": { lineHeight: "var(--space-3)" },
      ".cm-md-gap-extra": { lineHeight: "0" },
      //: The callout's kind, in the place its `[!note]` marker was. Set in
      //: `em` so it tracks the editor's own type scale, and in the muted ink
      //: because it labels the block rather than being part of what it says.
      ".cm-md-callout-label": {
        fontSize: "0.85em",
        fontWeight: "600",
        color: "var(--muted)",
        marginRight: "0.4em",
        userSelect: "none",
      },
      //: A footnote's identifier, raised, where its brackets were. The
      //: reference is a link to the definition; the definition is the place
      //: being linked to, so only one of them is clickable.
      //: Math sits on the text's own baseline and takes the editor's ink;
      //: MathML brings its own metrics, so nothing here sets a size.
      //: An embedded card is a block of app inside a line of text, so it is
      //: given the line's width to work in and nothing else: every card in it
      //: is styled by the stylesheet that owns that card.
      ".cm-md-embed": {
        display: "inline-block",
        maxWidth: "100%",
        verticalAlign: "top",
        cursor: "pointer",
      },
      //: The cards keep their own appearance and are given a width to work
      //: in: a note card sized to its content is as wide as its longest line,
      //: and a minimap is `width: 100%` of whatever box it is handed.
      ".cm-md-embed .entry-list": { width: "min(420px, 100%)", margin: "0", padding: "0" },
      ".cm-md-embed .doc-embed-map": { display: "block", width: "min(320px, 100%)" },
      ".cm-md-embed .file-card": { maxWidth: "min(360px, 100%)" },
      ".cm-md-math": { cursor: "text" },
      ".cm-md-math-block": { display: "block", textAlign: "center", margin: "0.2em 0" },
      ".cm-md-footnote": {
        verticalAlign: "super",
        fontSize: "0.72em",
        color: "var(--accent)",
        fontWeight: "600",
      },
      ".cm-md-footnote-ref": { cursor: "pointer" },
      //: The toggle's chevron sits with the callout's own label, in the same
      //: muted ink, because it is part of the same control.
      ".cm-md-callout-fold": { fontSize: "0.9em", opacity: "0.8" },
      ".cm-md-callout-label[data-doc-callout-fold]": { cursor: "pointer" },
      ".cm-md-task": { marginRight: "0.4em", verticalAlign: "middle", cursor: "pointer" },
      ".cm-md-image": { maxWidth: "100%", borderRadius: "var(--radius-sm)" },

      //: --- tables ---------------------------------------------------------
      //: **A grid over the line, not a `<table>` widget.** Replacing the block
      //: with a rendered table is what every "table editor" in a markdown app
      //: does and it is what forces them to have a serialiser, which is what
      //: loses the author's own whitespace (PLAN D4's gate, and the long
      //: comment on the model at the top of this file). Here the pipes are
      //: hidden like every other marker in this view and each cell is a mark,
      //: so `display: grid` on the line turns those marks into the columns:
      //: the text on screen is still the text in the file, at the same
      //: offsets, and the caret walks it normally.
      //:
      //: `minmax(0, 1fr)` rather than `1fr`, because a grid column's implicit
      //: minimum is its content's min-content width, so one long unbroken word
      //: in a cell would push the table wider than the editor instead of
      //: wrapping.
      ".cm-md-table": {
        display: "grid",
        borderLeft: "1px solid var(--border)",
      },
      //: Past `DOC_TABLE_GRID_MAX` columns there is no class to place the
      //: cells with, so the line falls back to what it did before them. It is
      //: the worse rendering (every zero-width child behind a hidden pipe
      //: takes a track of its own), and it is a table no editor this wide can
      //: show usefully in any case.
      ".cm-md-table-wide": {
        gridAutoFlow: "column",
        gridAutoColumns: "minmax(0, 1fr)",
      },
      ...docTableGridRules(),
      ".cm-md-table-head": {
        fontWeight: "650",
        backgroundColor: "var(--field-inset)",
        borderTop: "1px solid var(--border)",
        //: The cell menu is positioned against this line.
        position: "relative",
      },
      //: The rendered view's own cell inset (`.md-table td`: 0.4rem by
      //: 0.6rem), where this was 0.05em by 0.5em and a row of words sat
      //: against the rules above and below it (17c, measured in
      //: `scratchpad/ui-sweeps/docblocks17c.js`).
      ".cm-md-td": {
        padding: "var(--space-2) var(--space-4)",
        borderRight: "1px solid var(--border)",
        borderBottom: "1px solid var(--border)",
      },
      //: The cell the caret is in: a ring inside the cell, so it moves no
      //: rule and changes no column width, and a faint ground that sits
      //: under a selection rather than hiding it.
      ".cm-md-td-active": {
        boxShadow: "inset 0 0 0 2px var(--accent)",
        backgroundColor: "color-mix(in srgb, var(--accent) 6%, transparent)",
        borderRadius: "var(--radius-sm, 6px)",
      },
      ".cm-md-table-head .cm-md-td-last": {
        paddingRight: "calc(var(--space-4) + 1.75rem)",
      },
      ".cm-md-td-left": { textAlign: "left" },
      ".cm-md-td-center": { textAlign: "center" },
      ".cm-md-td-right": { textAlign: "right" },
      //: The delimiter row is the header's underline, and the header's cells
      //: already draw that. With its own text hidden it would otherwise leave
      //: a blank line through the middle of the table; it comes back to full
      //: height the moment the caret arrives on it, which is the rule `---`
      //: has followed here since Phase 2.
      ".cm-md-table-rule": { height: "0", overflow: "hidden" },
      //: A frontmatter line, hidden the same way and for the same reason: the
      //: properties panel above the editor is where it is read and written.
      //: `border: 0` as well as the height, and it is measured: the opening
      //: fence is also a `---`, so it carries `.cm-md-rule`'s bottom border,
      //: and a zero-high line with a border is a 1px line across the top of
      //: the document.
      ".cm-md-frontmatter": { height: "0", overflow: "hidden", border: "0" },
      //: Out of the grid's flow, or the menu would be a column of its own and
      //: every cell in the table would narrow to make room for it.
      ".cm-md-table-menu": {
        position: "absolute",
        right: "2px",
        top: "0",
        opacity: "0.7",
      },
      ".cm-md-table-menu:hover, .cm-md-table-menu:focus-within": { opacity: "1" },

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
      //: **The hover, which was the one surface in this feature with none.**
      //: Four things draw a finding (the underline, the word menu, the panel,
      //: the dictionary) and three of them answered the pointer; the underline
      //: offered `cursor: pointer` and nothing else, so the only way to learn
      //: that a squiggle is pressable was to press it.
      //:
      //: A tint rather than a thicker line: the three kinds are told apart by
      //: the *shape* of their underline (wavy, wavy, dotted), and thickening
      //: one on hover moves it towards another kind's shape. A ground behind
      //: the word says "this is one object" without touching the mark that
      //: says which kind it is, and it is the same thing `.menu-item:hover`
      //: does one surface over.
      //:
      //: 12% of the kind's own colour, mixed against the page rather than
      //: stated as an alpha, so it composes on the editor's ground in either
      //: theme and follows `[data-contrast="on"]`'s redefinitions of
      //: `--error`, `--accent` and `--muted` without a branch of its own.
      //: Measured light and dark in `prosepanel.js`.
      ".cm-finding-spelling:hover": {
        backgroundColor: "color-mix(in srgb, var(--error) 12%, transparent)",
        borderRadius: "3px",
      },
      ".cm-finding-style:hover": {
        backgroundColor: "color-mix(in srgb, var(--accent) 12%, transparent)",
        borderRadius: "3px",
      },
      ".cm-finding-repeat:hover": {
        backgroundColor: "color-mix(in srgb, var(--muted) 12%, transparent)",
        borderRadius: "3px",
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

//: **Code colours from the app's own palette, and the reason this is not
//: optional.** The owner: "for code files, include code syntax and make it a
//: proper code editor like vs code."
//:
//: Without this the bundle falls back to CodeMirror's `defaultHighlightStyle`,
//: which is a fixed light-page palette: a keyword is `#770088`, a variable
//: name is `#0000ff`, a string `#aa1111`. Measured against this app's dark
//: ground, sampled off a screenshot at `rgb(27, 31, 44)`: the keyword reads
//: **1.76:1** and the variable name **1.91:1**, against WCAG AA's 4.5. Every
//: token was byte-identical in light and dark, because that style has no dark
//: variant to switch to. Nothing logged it, and a reader with the theme on
//: light would never see it, which is the shape this file keeps recording.
//:
//: Built here rather than in a stylesheet for the same reason the theme
//: itself is: adopted sheets sort after every document stylesheet, so a rule
//: in 09-editor.css would lose to the library's at equal specificity. The
//: roles are mapped onto tokens the app already defines for both themes, so
//: the density slider, a custom accent and a theme change move the code with
//: the rest of the app.
//: Built once, and **deliberately not inside the theme compartment.** Every
//: colour below is a `var(--…)`, so light and dark are already handled by the
//: cascade; rebuilding it on each mode change would define a fresh
//: `StyleModule` and adopt another stylesheet every time the theme was
//: toggled, which is a leak that only shows up after a few switches.
let docCmHighlightCache = null;

function docCmHighlight(CM) {
  if (docCmHighlightCache) return docCmHighlightCache;
  const { HighlightStyle } = CM.language;
  const t = CM.highlight.tags;
  //: One colour per role, and the roles are the six a reader actually
  //: separates at a glance: what the language says (keyword), what the writer
  //: named (variable, and the function or type it is), literal data, prose the
  //: compiler ignores (comment), and punctuation. More than that and a file
  //: reads as confetti, which is the failure mode of a highlighter that maps
  //: every lezer tag it can find.
  const keyword = { color: "var(--accent)", fontWeight: "600" };
  const name = { color: "var(--ink)" };
  const literal = { color: "var(--ok)" };
  const string = { color: "var(--warn)" };
  const comment = { color: "var(--muted)", fontStyle: "italic" };
  const punctuation = { color: "var(--muted)" };
  docCmHighlightCache = CM.language.syntaxHighlighting(
    HighlightStyle.define([
      { tag: [t.keyword, t.modifier, t.controlKeyword, t.operatorKeyword, t.self, t.null], ...keyword },
      { tag: [t.atom, t.bool, t.number, t.integer, t.float], ...literal },
      { tag: [t.string, t.special(t.string), t.regexp, t.character], ...string },
      { tag: [t.comment, t.lineComment, t.blockComment, t.docComment], ...comment },
      //: A definition is bolder than a use: in a file you are reading rather
      //: than writing, "where is this declared" is the question the eye is
      //: actually asking.
      { tag: [t.definition(t.variableName), t.definition(t.propertyName)], color: "var(--ink)", fontWeight: "600" },
      { tag: [t.function(t.variableName), t.function(t.propertyName), t.macroName], color: "var(--accent)" },
      { tag: [t.typeName, t.className, t.namespace, t.standard(t.typeName)], color: "var(--accent)", fontWeight: "600" },
      { tag: [t.variableName, t.propertyName, t.attributeName], ...name },
      { tag: [t.punctuation, t.separator, t.bracket, t.operator], ...punctuation },
      { tag: [t.meta, t.processingInstruction], color: "var(--muted)" },
      { tag: t.invalid, color: "var(--error)" },
      { tag: t.link, color: "var(--accent)", textDecoration: "underline" },
      //: Markdown's own tags, so Source view on a `.md` file is not the one
      //: file type in the editor with no highlighting at all. Live view draws
      //: these itself, from the tree, with its markers hidden; this is what
      //: Source and Plain fall back to.
      { tag: t.heading, fontWeight: "700", color: "var(--ink)" },
      { tag: t.emphasis, fontStyle: "italic" },
      { tag: t.strong, fontWeight: "700" },
      { tag: t.strikethrough, textDecoration: "line-through" },
      { tag: [t.monospace], color: "var(--accent)" },
    ])
  );
  return docCmHighlightCache;
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
        //: Arms the Tab escape hatch (see `docTabEscapes`) whatever else this
        //: Escape goes on to do: it is set before the find bar is consulted
        //: so that closing the bar and leaving the editor are one gesture
        //: away from each other rather than two.
        docTabEscapes = true;
        if ($("doc-find-bar")?.classList.contains("hidden") !== false) return false;
        toggleDocFindBar(false);
        return true;
      },
    },
    //: Tab indents, in prose as well as code, with Escape-then-Tab as the way
    //: out. `docTabEscapes` above carries the whole reason.
    {
      key: "Tab",
      run: () => {
        if (docTakeTabEscape()) return false;
        indentDocSelection(surface(), false);
        return true;
      },
    },
    {
      key: "Shift-Tab",
      run: () => {
        if (docTakeTabEscape()) return false;
        if (!docCanOutdent(surface())) return false;
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
//: **A click in a live-view table cell lands where it was pressed** (owner:
//: "I can't edit specific boxes in tables in the document editor live
//: view"). The cells are laid out as a CSS grid over one line of source, and
//: CodeMirror's own coordinate mapping reads that line as if it were flowing
//: text: measured, a click at the end of "r2b" put the caret at the cell's
//: start and a click inside "r1a" put it in the next cell. The browser's own
//: caret resolver does know the grid, so the press is resolved with it and
//: handed to the view as a position. Focus is taken explicitly because a
//: handled mousedown skips CodeMirror's own focus step: the first version of
//: this returned `true` without it, and every keystroke after the click went
//: nowhere. A drag, a Shift or Alt click, and anything but the main button
//: stay CodeMirror's.
function docTableCellClick(event, view) {
  if (event.button !== 0 || event.shiftKey || event.altKey || event.detail > 1) return false;
  if (!event.target.closest?.(".cm-md-td, .cm-md-th")) return false;
  let node = null;
  let offset = 0;
  if (document.caretPositionFromPoint) {
    const hit = document.caretPositionFromPoint(event.clientX, event.clientY);
    if (hit) ({ offsetNode: node, offset } = hit);
  } else if (document.caretRangeFromPoint) {
    const hit = document.caretRangeFromPoint(event.clientX, event.clientY);
    if (hit) ({ startContainer: node, startOffset: offset } = hit);
  }
  if (!node || !view.contentDOM.contains(node)) return false;
  let pos;
  try {
    pos = view.posAtDOM(node, offset);
  } catch {
    return false;
  }
  event.preventDefault();
  view.focus();
  view.dispatch({ selection: { anchor: pos }, scrollIntoView: false, userEvent: "select.pointer" });
  return true;
}

// -----------------------------------------------------------------------------
// Code documents as a code editor: diagnostics and completions (INBOX 392)
// -----------------------------------------------------------------------------
//
// The owner: "the code document types dont act like a code editor with
// errors, suggestions and that needs to be improved." Before this the editor
// mounted no linter and no completion source at all (this file had no use of
// `CM.lint` or `CM.autocomplete`), in a bundle that already carried
// CodeMirror's own linter, lint gutter and completion engine, exported by
// `frontend/vendor/codemirror/entry.js` since it was first built; nothing
// needed rebuilding.
//
// **Where each language is checked, and why there.** The browser checks what
// it has a real parser for and the server checks the rest, never the other
// way round, because a round trip per pause in typing is only worth paying
// where the browser cannot answer:
//
// - JSON: `JSON.parse`, whose error names the offset.
// - JavaScript, TypeScript and CSS: the Lezer tree CodeMirror has already
//   built to colour the file. A node the grammar could not place is an error
//   node, so this costs nothing the highlighter had not already spent. Never
//   `new Function` or `eval`: the CSP forbids both, and running somebody's
//   file to find out whether it parses is not a check, it is execution.
// - Python, TOML, XML and YAML: `POST /documents/check-syntax`, which uses
//   `ast.parse`, `tomllib`, `defusedxml` and PyYAML's composer
//   (`src/memorymap/core/syntaxcheck.py`). Offline, stateless, capped.
//
// Only for code: a markdown document is prose, and its checker is the
// writing panel's. Plain view turns these off with the highlighting, because
// Plain is defined as the editor with nothing interpreting the text.

//: The languages the server checks. A 400 from it (PyYAML not installed, say)
//: takes that language out of this set for the session, so a file is not
//: asked about again on every pause in typing.
const DOC_CHECK_REMOTE = new Set(["py", "toml", "xml", "yaml"]);
//: Mirrors `syntaxcheck.MAX_CHARS`: past it the server answers 422, so the
//: request is not made.
const DOC_CHECK_MAX_CHARS = 200000;
//: How long typing has to pause before a check runs. Long enough that a
//: half-typed line is not underlined while it is being typed.
const DOC_CHECK_DELAY_MS = 750;
//: Languages whose grammar in the bundle is a Lezer grammar with honest
//: error recovery, so an error node means the text does not parse.
const DOC_CHECK_TREE = new Set(["js", "ts", "css"]);

//: A 1-based line and column from a checker, as the offsets CodeMirror
//: underlines. The range runs to the end of the word at that column, so the
//: underline sits under the token that is wrong rather than under one letter
//: of it; at the end of a line it takes the last character instead, because
//: an empty range draws no underline at all.
function docDiagnosticRange(doc, lineNo, col) {
  const line = doc.line(Math.max(1, Math.min(lineNo, doc.lines)));
  let from = Math.min(line.from + Math.max(0, col - 1), line.to);
  const rest = doc.sliceString(from, line.to);
  const word = /^[\w$]+|^\S/.exec(rest);
  let to = from + (word ? word[0].length : 0);
  if (to === from && from > line.from) from -= 1;
  if (to === from && from < doc.length) to = from + 1;
  return { from, to: Math.min(to, doc.length) };
}

// DOC-JSON-BEGIN (tests/test_syntax_check.py runs this region in node)
//: **Where a JSON text stops being JSON**, as an offset and a sentence.
//:
//: `JSON.parse` says whether, and is the fast path, but not reliably where:
//: measured in this build of Chromium, a trailing comma before `}` throws
//: `Unexpected token '}', ..."b": \n}" is not valid JSON` with no position at
//: all, so the underline had nowhere to go. This walks the grammar once, only
//: after `JSON.parse` has already failed, and stops at the first character
//: that cannot continue it. Recursion is bounded by the text's own nesting,
//: which the size of a document caps.
function docJsonErrorAt(text) {
  let i = 0;
  const fail = (message) => {
    throw { at: i, message };
  };
  const ws = () => {
    while (i < text.length && " \t\n\r".includes(text[i])) i += 1;
  };
  const literal = (word) => {
    if (text.startsWith(word, i)) i += word.length;
    else fail("Expected a value");
  };
  const string = () => {
    i += 1;
    while (i < text.length) {
      const ch = text[i];
      if (ch === '"') {
        i += 1;
        return;
      }
      if (ch === "\\") {
        i += 1;
        if (!'"\\/bfnrtu'.includes(text[i] || "")) fail("Not a valid escape in a string");
        if (text[i] === "u" && !/^[0-9a-fA-F]{4}$/.test(text.slice(i + 1, i + 5))) {
          fail("A \\u escape needs four hex digits");
        }
      } else if (ch === "\n") fail("A string cannot run onto the next line");
      else if (ch < " ") fail("A control character has to be escaped in a string");
      i += 1;
    }
    fail("This string is never closed");
  };
  const number = () => {
    const match = /^-?(0|[1-9]\d*)(\.\d+)?([eE][+-]?\d+)?/.exec(text.slice(i, i + 400));
    if (!match) fail("Expected a value");
    i += match[0].length;
  };
  const value = () => {
    ws();
    const ch = text[i];
    if (ch === "{") return object();
    if (ch === "[") return array();
    if (ch === '"') return string();
    if (ch === "t") return literal("true");
    if (ch === "f") return literal("false");
    if (ch === "n") return literal("null");
    if (ch === "-" || (ch >= "0" && ch <= "9")) return number();
    return fail(i >= text.length ? "The text ends where a value was expected" : "Expected a value");
  };
  const object = () => {
    i += 1;
    ws();
    if (text[i] === "}") {
      i += 1;
      return;
    }
    for (;;) {
      ws();
      if (text[i] !== '"') {
        fail(text[i] === "}" ? "A comma with nothing after it" : "Expected a property name in double quotes");
      }
      string();
      ws();
      if (text[i] !== ":") fail("Expected a colon after the property name");
      i += 1;
      value();
      ws();
      if (text[i] === ",") {
        i += 1;
        continue;
      }
      if (text[i] === "}") {
        i += 1;
        return;
      }
      fail("Expected a comma or a closing brace");
    }
  };
  const array = () => {
    i += 1;
    ws();
    if (text[i] === "]") {
      i += 1;
      return;
    }
    for (;;) {
      ws();
      if (text[i] === "]") fail("A comma with nothing after it");
      value();
      ws();
      if (text[i] === ",") {
        i += 1;
        continue;
      }
      if (text[i] === "]") {
        i += 1;
        return;
      }
      fail("Expected a comma or a closing bracket");
    }
  };
  try {
    value();
    ws();
    if (i < text.length) fail("There is more text after the value");
    return null;
  } catch (error) {
    if (error && typeof error.at === "number") return error;
    throw error;
  }
}

// DOC-JSON-END

//: JSON, checked in the browser: `JSON.parse` says whether, and
//: `docJsonErrorAt` says where. If the two ever disagree the error goes on
//: the last character of the text with the engine's own words, which is
//: still true and still somewhere a person can find.
function docJsonDiagnostics(doc) {
  const text = doc.toString();
  if (!text.trim()) return [];
  try {
    JSON.parse(text);
    return [];
  } catch (error) {
    const found = docJsonErrorAt(text);
    let offset = found ? found.at : text.trimEnd().length - 1;
    offset = Math.max(0, Math.min(offset, doc.length));
    const line = doc.lineAt(offset);
    const range = docDiagnosticRange(doc, line.number, offset - line.from + 1);
    const message = found ? found.message : String(error.message || "Not valid JSON");
    return [{ ...range, severity: "error", message }];
  }
}

//: JavaScript, TypeScript and CSS, from the parse tree. The whole document is
//: parsed first (`ensureSyntaxTree`, with a time budget) because the tree the
//: highlighter keeps may stop at the viewport, and an error below it would
//: otherwise appear only when scrolled to. One diagnostic per line: a single
//: missing bracket can leave several error nodes on one line, and five
//: underlines for one mistake reads as five mistakes.
function docTreeDiagnostics(CM, state) {
  const tree =
    CM.language.ensureSyntaxTree(state, state.doc.length, 200) || CM.language.syntaxTree(state);
  const found = [];
  const lines = new Set();
  tree.iterate({
    enter: (node) => {
      if (!node.type.isError || found.length >= 50) return;
      const line = state.doc.lineAt(node.from);
      if (lines.has(line.number)) return;
      lines.add(line.number);
      const text = state.doc.sliceString(node.from, Math.min(node.to, node.from + 24)).trim();
      const range = docDiagnosticRange(state.doc, line.number, node.from - line.from + 1);
      found.push({
        ...range,
        severity: "error",
        message: text ? `Unexpected “${text.split("\n")[0]}”` : "Something is missing here",
      });
    },
  });
  return found;
}

//: The server's checkers. Resolves to `[]` on any failure: an editor that
//: underlines nothing because the check could not run is honest, one that
//: underlines the wrong thing is not.
async function docRemoteDiagnostics(ext, doc) {
  const text = doc.toString();
  if (!text.trim() || text.length > DOC_CHECK_MAX_CHARS) return [];
  let found;
  try {
    const response = await api("/documents/check-syntax", {
      method: "POST",
      body: JSON.stringify({ language: ext, text }),
      silent: true,
      readOnly: true,
    });
    found = await response.json();
  } catch (error) {
    if (/no checker/.test(String(error.message))) DOC_CHECK_REMOTE.delete(ext);
    return [];
  }
  return (Array.isArray(found) ? found : []).map((d) => ({
    ...docDiagnosticRange(doc, d.line, d.col),
    severity: ["error", "warning", "info"].includes(d.severity) ? d.severity : "error",
    message: String(d.message || "Syntax error"),
  }));
}

//: The one lint source, dispatching on the open file's type at the moment it
//: runs rather than when the extension was built, so a type change between
//: two checks is answered by the new type.
//:
//: **With the fixes attached** (the quick fixes, further down this file).
//: Each checker's diagnostics carry the fixes that follow from them as
//: CodeMirror actions, which the hover card draws as buttons and Alt+Enter
//: lists at the caret. For the languages no checker here parses (C, Java, Go,
//: Rust and the rest of `DOC_CHECK_SCAN`) the structure scan is the check: a
//: bracket that closes nothing, one never closed, a string or a comment left
//: open. For JavaScript, TypeScript and CSS the tree still decides *whether*
//: there is an error and the scan is asked only then, for *which bracket*
//: and how to fix it, so a construct the scan does not know (a regex it
//: misreads) can never underline valid code. And for every code type, a note
//: where the indentation mixes tabs and spaces.
function docCodeLintSource(CM) {
  return async (view) => {
    const type = docFileType();
    const ext = type.ext;
    const state = view.state;
    const text = state.doc.toString();
    const unit = type.indent || "  ";
    let found = [];
    if (ext === "json") {
      found = docJsonDiagnostics(state.doc);
      if (found.length) {
        const fixes = docJsonFixes(text, docJsonErrorAt(text), unit);
        found = found.map((d) => ({
          ...d,
          actions: fixes.map((fix) => ({
            name: fix.name,
            apply: (v, from) => docApplyCodeFix(v, "json", "json", fix.name, from),
          })),
        }));
      }
    } else if (DOC_CHECK_TREE.has(ext)) {
      found = docTreeDiagnostics(CM, state);
      if (found.length && !(ext === "js" && docTreeHasJsx(CM, state))) {
        const scanned = docCodeFixes(text, ext, unit);
        if (scanned.length) found = docCodeActions("scan", scanned);
      }
    } else if (DOC_CHECK_REMOTE.has(ext)) {
      found = await docRemoteDiagnostics(ext, state.doc);
      if (ext === "py") {
        //: The compiler's "expected ':'" has one fix, and it is certain.
        found = found.map((d) => {
          //: Case-blind: `syntaxcheck.py` capitalises the compiler's words.
          if (!/expected ':'/i.test(d.message)) return d;
          const fix = docPythonColonFix(text, state.doc.lineAt(d.from).number);
          if (!fix) return d;
          return { ...d, actions: [{ name: fix.name, apply: (v, from) => docApplyCodeFix(v, "py-colon", "", fix.name, from) }] };
        });
      }
    } else if (DOC_CHECK_SCAN.has(ext)) {
      found = docCodeActions("scan", docCodeFixes(text, ext, unit));
    }
    return found.concat(docCodeActions("indent-mix", docIndentMixFixes(text, unit, state.tabSize, ext)));
  };
}

//: The languages the structure scan checks, because nothing else in the
//: bundle or on the server parses them. Shell, Ruby, TOML's neighbours and
//: the rest are left out: their quoting and bracket rules are loose enough
//: (a shell `case` pattern's lone `)`) that a scan would underline valid
//: files, and an underline under valid code teaches a reader to ignore them.
const DOC_CHECK_SCAN = new Set(["c", "cpp", "cs", "java", "kt", "go", "rs", "swift", "php", "r", "sql"]);

//: The words each language reserves, for the languages whose grammar in the
//: bundle brings no completions of its own. JavaScript, TypeScript, Python,
//: CSS and HTML are absent on purpose: their CodeMirror packages already
//: complete keywords, snippets and the names in scope at the caret, which is
//: better than a flat list, so this adds nothing there.
const DOC_CODE_KEYWORDS = {
  go: "break case chan const continue default defer else fallthrough for func go goto if import interface map package range return select struct switch type var nil true false append cap close copy delete len make new panic print println recover string int int64 float64 bool byte rune error",
  rs: "as async await break const continue crate dyn else enum extern false fn for if impl in let loop match mod move mut pub ref return self Self static struct super trait true type unsafe use where while Some None Ok Err Vec String Option Result Box println",
  c: "auto break case char const continue default do double else enum extern float for goto if inline int long register return short signed sizeof static struct switch typedef union unsigned void volatile while NULL include define printf malloc free",
  cpp: "auto bool break case catch char class const constexpr continue default delete do double else enum explicit false float for friend if inline int long namespace new nullptr operator private protected public return short static struct switch template this throw true try typedef typename using virtual void while std vector string include",
  cs: "abstract as async await base bool break case catch class const continue decimal default delegate do double else enum event false finally float for foreach get if int interface internal is lock long namespace new null object out override private protected public readonly ref return set static string struct switch this throw true try using var virtual void while",
  java: "abstract assert boolean break byte case catch char class const continue default do double else enum extends final finally float for if implements import instanceof int interface long new null package private protected public return short static super switch this throw throws true false try void while String System",
  kt: "as break class continue do else false for fun if in interface is null object package return super this throw true try typealias val var when while companion data override private public internal open sealed suspend println",
  rb: "alias and begin break case class def defined do else elsif end ensure false for if in module next nil not or redo rescue retry return self super then true undef unless until when while yield puts require attr_accessor",
  swift: "associatedtype class deinit enum extension func import init inout internal let operator private protocol public static struct subscript typealias var break case continue default defer do else fallthrough for guard if in repeat return switch where while as false is nil self Self super throw throws true try print",
  r: "if else repeat while function for in next break TRUE FALSE NULL Inf NaN NA library return print list",
  php: "abstract and array as break callable case catch class clone const continue declare default do echo else elseif empty extends final finally fn for foreach function global if implements include instanceof interface isset list match namespace new or print private protected public readonly require return static switch throw trait try unset use var while yield true false null",
  sql: "select from where and or not insert into values update set delete create table drop alter add column index primary key foreign references join left right inner outer on group by order having limit offset as distinct union all null is in like between case when then else end count sum avg min max",
  bash: "if then else elif fi case esac for while until do done in function select time return exit export local readonly echo printf read cd pwd source shift set unset true false",
  json: "true false null",
  yaml: "true false null",
  toml: "true false",
};

//: Keywords, then every name already written in the document, through
//: `completeFromList`. The names are read at the moment the list is asked
//: for, so a function defined a second ago is offered, and the word being
//: typed is left out so the list never offers you what you have already got.
//:
//: **One function, kept, and it is not a style point.** The completion engine
//: tells a source it is still waiting on from a new one by identity, and the
//: language-data callback below runs on every transaction: returning a fresh
//: closure each time made every keystroke a new source, the answer to the
//: last one was thrown away as stale, and the list sat at "pending" forever
//: (measured: `completionStatus` read "pending" 800ms after typing "hel",
//: while the same source called by hand returned fifty options).
let docCodeCompletionCache = null;

function docCodeCompletionSource(CM) {
  if (docCodeCompletionCache) return docCodeCompletionCache;
  docCodeCompletionCache = (context) => {
    const word = context.matchBefore(/[A-Za-z_$][\w$]*/);
    if (!word || (word.from === word.to && !context.explicit)) return null;
    const ext = docFileType().ext;
    const keywords = (DOC_CODE_KEYWORDS[ext] || "").split(" ").filter(Boolean);
    const seen = new Set(keywords);
    const options = keywords.map((label) => ({ label, type: "keyword" }));
    const text = context.state.doc.toString();
    const names = /[A-Za-z_$][\w$]{2,}/g;
    let match;
    while ((match = names.exec(text)) !== null && options.length < 2000) {
      if (match.index === word.from) continue;
      if (seen.has(match[0])) continue;
      seen.add(match[0]);
      options.push({ label: match[0], type: "variable" });
    }
    return CM.autocomplete.completeFromList(options)(context);
  };
  return docCodeCompletionCache;
}

//: The language-data entry, built once for the same reason as the source.
let docCodeCompletionDataCache = null;

function docCodeCompletionData(CM) {
  if (!docCodeCompletionDataCache) {
    const entry = [{ autocomplete: docCodeCompletionSource(CM) }];
    docCodeCompletionDataCache = CM.state.EditorState.languageData.of(() => entry);
  }
  return docCodeCompletionDataCache;
}

//: The code tools for the open document, or nothing. Whether a type counts
//: as code is the file-type table's own answer (`previewable` is prose);
//: plain text and CSV have no syntax and no vocabulary, so they get neither.
function docCodeTools(CM) {
  const type = docFileType();
  if (type.previewable || docView === "plain" || ["txt", "csv"].includes(type.ext)) {
    //: **An inert completer, so the field always exists.** The bundled
    //: autocomplete (6.20.3) has no `destroy` that clears its debounce
    //: timer, and `docResetDocument` swaps states on one view: a keystroke in
    //: a code file followed within ~100ms by opening a markdown one fired
    //: the old timer into a state with no completion field, which throws
    //: "Field is not present in this state" (found by the code editor pass).
    //: No sources and no typing trigger, so prose behaves exactly as before.
    return [CM.autocomplete.autocompletion({ override: [], activateOnTyping: false })];
  }
  const native = ["js", "ts", "py", "css", "html"].includes(type.ext);
  return [
    CM.lint.linter(docCodeLintSource(CM), { delay: DOC_CHECK_DELAY_MS }),
    CM.lint.lintGutter(),
    //: The list, opening as you type; Emmet, the CSS values, the ghost text
    //: and Tab (`docCompletionExtras`, part three below).
    docCompletionExtras(CM, type),
    //: Beside the language's own sources, not instead of them: `override`
    //: would switch off the scope-aware completion the JavaScript and
    //: Python packages bring.
    native ? [] : docCodeCompletionData(CM),
    //: Pairs, Enter and the indent unit (`docCodeEditing`, below).
    docCodeEditing(CM, type),
  ];
}

//: The file type or the view changed: the code tools follow, by compartment,
//: so the caret, the scroll position and the undo history survive.
function docCmSyncCodeTools() {
  const CM = window.CM6;
  if (!docCmView || !CM || !docCmParts.code) return;
  docCmView.dispatch({ effects: docCmParts.code.reconfigure(docCodeTools(CM)) });
}

// -----------------------------------------------------------------------------
// Code documents as a code editor, part three: completions, Emmet and the
// ghost text
// -----------------------------------------------------------------------------
//
// The owner, 2026-09-23 (INBOX 394 (c)): "on the document editor code files I
// want ALL THE PREFILL SUGGESTIONS AND POPUP BOXES FOR OPTIONS. like if I do
// just '!' on a document and press enter it does base html code, or for all
// the available css properties for that css feature, or doinf inline
// suggestions."
//
// Three things, each on the editor's own machinery rather than beside it:
//
// - **Emmet**, the abbreviation language VS Code expands (`!`, `ul>li*3`,
//   `a[href]`, `m10`), vendored as its core expander (frontend/vendor/emmet,
//   MIT, loaded the first time an HTML or CSS document opens) and offered as
//   a row in the completion list, so Enter takes it exactly as it takes any
//   other row, and Tab expands it with the list closed.
// - **Each CSS property's own values.** The CSS package completes every
//   property, but a value from one flat list of four hundred keywords;
//   `display: ` should offer `flex` and `grid`, not `dashed`. The values are
//   read out of Emmet's own CSS snippet table (the `display:block|flex|...`
//   rows it expands from), so there is no second table here to fall behind.
// - **Ghost text**: the rest of the chosen row after the caret, in muted ink,
//   taken with Tab. Enter stays the list's key, as it is in VS Code.
//
// The pure half is the region below; `tests/test_code_completion.py` runs it
// in node against the vendored bundle. The wiring after it is measured in
// Chromium by `scratchpad/ui-sweeps/doccomplete.js`.

// DOC-COMPLETE-BEGIN (tests/test_code_completion.py runs this region in node)
//: The element names of HTML's living standard (and `svg`), which is the test
//: for whether a bare word on its own line is an element being written or a
//: word of the page's text. Emmet itself would expand any word into a tag.
const DOC_HTML_TAGS = new Set((
  "a abbr address area article aside audio b base bdi bdo blockquote body br button canvas caption " +
  "cite code col colgroup data datalist dd del details dfn dialog div dl dt em embed fieldset figcaption " +
  "figure footer form h1 h2 h3 h4 h5 h6 head header hgroup hr html i iframe img input ins kbd label " +
  "legend li link main map mark menu meta meter nav noscript object ol optgroup option output p picture " +
  "pre progress q rp rt ruby s samp script search section select slot small source span strong style " +
  "sub summary sup table tbody td template textarea tfoot th thead time title tr track u ul var video wbr svg"
).split(" "));

//: CSS's named colours, for any property whose value is a colour. Emmet's
//: table gives `color` a `#000` placeholder and no names.
const DOC_CSS_COLORS = (
  "transparent currentcolor aliceblue antiquewhite aqua aquamarine azure beige bisque black " +
  "blanchedalmond blue blueviolet brown burlywood cadetblue chartreuse chocolate coral cornflowerblue " +
  "cornsilk crimson cyan darkblue darkcyan darkgoldenrod darkgray darkgreen darkgrey darkkhaki " +
  "darkmagenta darkolivegreen darkorange darkorchid darkred darksalmon darkseagreen darkslateblue " +
  "darkslategray darkslategrey darkturquoise darkviolet deeppink deepskyblue dimgray dimgrey dodgerblue " +
  "firebrick floralwhite forestgreen fuchsia gainsboro ghostwhite gold goldenrod gray green greenyellow " +
  "grey honeydew hotpink indianred indigo ivory khaki lavender lavenderblush lawngreen lemonchiffon " +
  "lightblue lightcoral lightcyan lightgoldenrodyellow lightgray lightgreen lightgrey lightpink " +
  "lightsalmon lightseagreen lightskyblue lightslategray lightslategrey lightsteelblue lightyellow lime " +
  "limegreen linen magenta maroon mediumaquamarine mediumblue mediumorchid mediumpurple mediumseagreen " +
  "mediumslateblue mediumspringgreen mediumturquoise mediumvioletred midnightblue mintcream mistyrose " +
  "moccasin navajowhite navy oldlace olive olivedrab orange orangered orchid palegoldenrod palegreen " +
  "paleturquoise palevioletred papayawhip peachpuff peru pink plum powderblue purple rebeccapurple red " +
  "rosybrown royalblue saddlebrown salmon sandybrown seagreen seashell sienna silver skyblue slateblue " +
  "slategray slategrey snow springgreen steelblue tan teal thistle tomato turquoise violet wheat white " +
  "whitesmoke yellow yellowgreen"
).split(" ");

//: The properties whose value is, or may begin with, a colour.
const DOC_CSS_COLOR_PROPERTY = /(^|-)color$|^(fill|stroke|background|border(-(top|right|bottom|left))?|outline|text-decoration|column-rule)$/;

//: The four every property takes, offered last.
const DOC_CSS_GLOBALS = ["inherit", "initial", "unset", "revert"];

//: **What Emmet's table is missing, and what in it is dead.** Its rows are
//: the abbreviations it expands, not a reference, so it predates `sticky`,
//: `flow-root` and `fit-content`, has no list at all for `width` or
//: `font-size`, and still carries IE's `hand` cursor and the pre-standard
//: `lr-tb` writing modes. Measured against its 2.4.11 table; each row here is
//: added after that property's own.
const DOC_CSS_VALUES_EXTRA = {
  position: "sticky",
  display: "flow-root",
  cursor: "grab grabbing not-allowed wait progress context-menu copy alias zoom-in zoom-out col-resize row-resize ew-resize ns-resize none",
  overflow: "clip",
  "overflow-x": "clip",
  "overflow-y": "clip",
  "overflow-wrap": "normal break-word anywhere",
  "word-break": "break-word",
  "white-space": "break-spaces",
  "text-align": "start end",
  "font-size": "xx-small x-small small medium large x-large xx-large smaller larger",
  "font-weight": "100 200 300 400 500 600 700 800 900",
  "font-family": "system-ui ui-sans-serif ui-serif ui-monospace",
  "line-height": "normal",
  "writing-mode": "horizontal-tb vertical-rl vertical-lr",
  "object-fit": "fill contain cover none scale-down",
  "object-position": "center top bottom left right",
  "pointer-events": "auto none",
  "user-select": "auto text all",
  "scroll-behavior": "auto smooth",
  isolation: "auto isolate",
  "mix-blend-mode": "normal multiply screen overlay darken lighten difference",
  "place-items": "center start end stretch",
  "place-content": "center start end stretch space-between space-around space-evenly",
  "transition-timing-function": "linear ease ease-in ease-out ease-in-out step-start step-end",
  "transition-property": "all none opacity transform",
  "animation-fill-mode": "none",
  "background-repeat": "repeat",
  "background-size": "auto",
  "background-position": "center top bottom left right",
  "list-style-type": "none",
  "list-style": "none",
  "table-layout": "auto",
  "aspect-ratio": "auto",
  "will-change": "auto transform opacity scroll-position",
  "z-index": "auto",
  flex: "none auto",
  border: "none",
  outline: "none",
  content: "none",
  gap: "normal",
  "row-gap": "normal",
  "column-gap": "normal",
  "grid-template-columns": "none subgrid",
  "grid-template-rows": "none subgrid",
  ...Object.fromEntries(["top", "right", "bottom", "left", "margin", "margin-top", "margin-right", "margin-bottom", "margin-left"].map((p) => [p, "auto"])),
  ...Object.fromEntries(["width", "height", "min-width", "min-height", "inline-size", "block-size"].map((p) => [p, "auto fit-content max-content min-content"])),
  ...Object.fromEntries(["max-width", "max-height"].map((p) => [p, "none fit-content max-content min-content"])),
};

const DOC_CSS_VALUES_DEAD = new Set(["time", "hand", "no-clip", "lr-tb", "lr-bt", "rl-tb", "rl-bt", "tb-rl", "tb-lr", "bt-lr", "bt-rl"]);

//: Emmet's snippet table for "markup" or "stylesheet", resolved once per
//: bundle: it is read on every keystroke that could be an abbreviation.
const docEmmetSnippetCache = new Map();

function docEmmetSnippets(E, type) {
  const cached = docEmmetSnippetCache.get(type);
  if (cached?.E === E) return cached.snippets;
  const snippets = E.resolveConfig({ type }).snippets;
  docEmmetSnippetCache.set(type, { E, snippets });
  return snippets;
}

//: Whether `abbr` reads as an abbreviation someone meant, rather than a word
//: Emmet would happily make a tag of. Markup: it starts with an element name,
//: one of Emmet's own snippet names (`link:css`, `!`), or an operator that
//: only means Emmet (`.card`, `#main`, `(`, `[`, `{`). CSS: one of Emmet's
//: shorthands of two letters or more that expand to a declaration with a
//: value (`df`, `bgc`, `m10`, `p10-20`). A property name being typed (`col`,
//: `pos`, the start of the property it becomes) is left to the language's
//: own list, which does it better, and so is anything Emmet can only turn
//: into an empty `columns: ;`.
function docEmmetIntended(abbr, syntax, E, anywhere = false) {
  if (!abbr || /^\d/.test(abbr)) return false;
  if (syntax === "css") {
    if (abbr.length < 2 || !/^[a-z]/i.test(abbr)) return false;
    let out = "";
    try {
      out = E.expand(abbr, { type: "stylesheet" });
    } catch {
      return false;
    }
    const declaration = /^([a-z-]+): (.+);$/.exec(out);
    return Boolean(declaration) && !declaration[1].startsWith(abbr.toLowerCase());
  }
  //: XML has no vocabulary to check a name against, so on typing only an
  //: operator says "Emmet" (`item>name`, `row*3`); Tab on a bare name is a
  //: request and makes the pair.
  if (syntax === "xml") {
    if (!/^[a-zA-Z_]/.test(abbr)) return false;
    return anywhere || /[>+*^[{(]/.test(abbr);
  }
  const snippets = docEmmetSnippets(E, "markup");
  const name = (/^[a-zA-Z][\w-]*(?::[\w-]+)*/.exec(abbr) || [""])[0];
  //: JSX: an HTML element or a component (a capital), never `!`, which is a
  //: whole page and has no place inside a component.
  if (!name) return syntax === "jsx" ? /^[.#([]/.test(abbr) : /^[.#!([{]/.test(abbr);
  if (syntax === "jsx" && /^[A-Z]/.test(name)) return true;
  return DOC_HTML_TAGS.has(name.toLowerCase()) || (syntax === "html" && Object.hasOwn(snippets, name));
}

//: The abbreviation that ends at column `col` of `line`, as `{ abbr, start,
//: end }` in the line's own columns, or null. `end` can pass `col`: the
//: closers `closeBrackets` typed ahead of the caret (`a[href|]`) are part of
//: what was written, and Emmet's `lookAhead` takes them in.
//:
//: **Where, as well as what.** On typing (`anywhere` false) an abbreviation
//: is offered only where markup starts a line or follows a tag (`<p>ul>li`),
//: and in CSS only where a declaration starts; mid-sentence in a paragraph,
//: every "a" and "p" would open a list and Enter would take it. Tab passes
//: `anywhere`, because a Tab on a word is a request.
function docEmmetAt(line, col, syntax, E, anywhere) {
  if (/^[\w$-]/.test(line.slice(col))) return null;
  const css = syntax === "css";
  let found = null;
  try {
    found = E.extract(line, col, { type: css ? "stylesheet" : "markup", lookAhead: !css });
  } catch {
    return null;
  }
  if (!found || !found.abbreviation) return null;
  const before = line.slice(0, found.start);
  if (!anywhere) {
    const place = css ? /(^|[{;])\s*$/ : /(^|>)\s*$/;
    if (!place.test(before)) return null;
  }
  if (!docEmmetIntended(found.abbreviation, syntax, E, anywhere)) return null;
  return { abbr: found.abbreviation, start: found.start, end: Math.max(found.end, col) };
}

//: An abbreviation's expansion twice over: `preview`, the text as it will
//: read (for the row's detail pane), and `template`, the same text in
//: CodeMirror's snippet syntax so Tab walks Emmet's own stops. Null when
//: Emmet cannot read it. The parser takes `${n}` and `#{n}` as fields and
//: `\{` `\}` as braces, so every brace that is text is escaped first and
//: the fields are written after, from markers no text contains.
//:
//: **A default inside an attribute is text, not a stop.** Emmet's `!` makes
//: the viewport's `device-width` and `1.0` its first two stops, so Enter
//: left `device-width` selected and the title third; nobody writing a page
//: starts there. An empty attribute (`a[href]`) keeps its stop, because
//: that is the thing to fill in.
//:
//: `text`, when given, is what the abbreviation wraps (Wrap with
//: abbreviation): a string goes in whole, an array of lines one per repeat
//: (`ul>li*` makes a list item of each line).
function docEmmetExpansion(E, abbr, syntax, text) {
  const type = syntax === "css" ? "stylesheet" : "markup";
  const config = type === "markup" ? { type, syntax } : { type };
  if (text !== undefined) config.text = text;
  try {
    const preview = E.expand(abbr, config);
    if (!preview.trim()) return null;
    const field = (index, placeholder) => `\u0001${index}\u0002${placeholder || ""}\u0003`;
    const marked = E.expand(abbr, { ...config, options: { "output.field": field } });
    const template = marked
      .replace(/[{}]/g, "\\$&")
      .replace(/\u0001(\d+)\u0002([^\u0003]*)\u0003/g, (_, index, placeholder, offset, whole) => {
        const text = placeholder.replace(/\\?[{}]/g, "");
        const head = whole.slice(0, offset);
        const tag = head.slice(head.lastIndexOf("<"));
        const inValue = type === "markup" && head.lastIndexOf("<") > head.lastIndexOf(">") && tag.split('"').length % 2 === 0;
        if (inValue && text) return text;
        return text ? `\${${index}:${text}}` : `\${${index}}`;
      });
    return { preview, template };
  } catch {
    return null;
  }
}

//: The property a value is being typed for, and the word typed so far, from
//: the text before the caret; null anywhere but a value. Whether the caret
//: is inside a rule at all is the tree's question, asked by the caller.
function docCssValueContext(before) {
  const cut = Math.max(before.lastIndexOf("{"), before.lastIndexOf(";"), before.lastIndexOf("}"));
  const match = /^\s*(-{0,2}[a-zA-Z][\w-]*)\s*:\s*([^:]*)$/.exec(before.slice(cut + 1));
  if (!match) return null;
  return { property: match[1].toLowerCase(), word: /[\w-]*$/.exec(match[2])[0] };
}

//: Property to its keyword values, read once per bundle out of Emmet's CSS
//: table, whose rows are `property:value|value|...` (a row with a field in
//: it, `color:${1:#000}`, is a placeholder and has no keywords to give).
let docCssValueTableCache = null;

function docCssValueTable(E) {
  if (docCssValueTableCache?.E === E) return docCssValueTableCache.table;
  const table = new Map();
  const snippets = E ? docEmmetSnippets(E, "stylesheet") : {};
  for (const row of Object.values(snippets)) {
    const colon = row.indexOf(":");
    if (colon < 1 || row.includes("$")) continue;
    const property = row.slice(0, colon).trim();
    if (!/^[a-z-]+$/.test(property)) continue;
    const values = row.slice(colon + 1).split("|").map((v) => v.trim()).filter((v) => /^[\w-]+$/.test(v));
    if (!values.length) continue;
    const known = table.get(property) || [];
    for (const value of values) if (!known.includes(value)) known.push(value);
    table.set(property, known);
  }
  for (const [property, extra] of Object.entries(DOC_CSS_VALUES_EXTRA)) {
    const known = table.get(property) || [];
    for (const value of extra.split(" ")) if (!known.includes(value)) known.push(value);
    table.set(property, known);
  }
  for (const [property, known] of table) {
    table.set(property, known.filter((v) => !DOC_CSS_VALUES_DEAD.has(v) && !DOC_CSS_GLOBALS.includes(v)));
  }
  docCssValueTableCache = { E, table };
  return table;
}

//: The rows for a property's value: its own keywords first, then colours
//: where it takes one, then the four global keywords, each once.
function docCssValueOptions(property, table) {
  const labels = [...(table.get(property) || [])];
  if (DOC_CSS_COLOR_PROPERTY.test(property)) labels.push(...DOC_CSS_COLORS);
  labels.push(...DOC_CSS_GLOBALS);
  const own = new Set(table.get(property) || []);
  //: Boosts, because the list sorts by match and then by name: a
  //: property's own words first, then `currentcolor` and `transparent`
  //: above the named colours, the global four last.
  const boost = (label) =>
    own.has(label) ? 2 : label === "currentcolor" || label === "transparent" ? 1 : DOC_CSS_GLOBALS.includes(label) ? -2 : 0;
  return [...new Set(labels)].map((label) => ({ label, boost: boost(label) }));
}

//: The ghost text for the chosen row: the rest of `label` after the part of
//: it already typed, or "". Only when the caret ends a word (`after` does
//: not continue it), only when what was typed is the start of `label` from
//: the start of a word (a fuzzy match, `bgc` for `background-color`, has no
//: "rest"), and never for a row of more than one line.
function docGhostSuffix(before, after, label) {
  if (!label || label.includes("\n") || /^[\w$-]/.test(after)) return "";
  for (let k = Math.min(label.length - 1, before.length); k >= 1; k -= 1) {
    const typed = before.slice(before.length - k);
    if (typed.toLowerCase() !== label.slice(0, k).toLowerCase()) continue;
    const prev = before[before.length - k - 1];
    if (prev !== undefined && /[\w$-]/.test(prev) && /[\w$-]/.test(typed[0])) continue;
    return label.slice(k);
  }
  return "";
}

//: Balance, VS Code's "Emmet: Balance": the next selection out from (or in
//: to) `from`..`to`, given the tags around the caret as the matcher lists
//: them (`{ open: [a, b], close: [c, d] }`, innermost first going out,
//: outermost first going in). Each tag offers its content, then itself, so
//: repeated presses step content, element, parent's content, parent. Null
//: at the edge.
function docBalanceRange(tags, from, to, inward) {
  const spans = [];
  for (const tag of tags) {
    const whole = [tag.open[0], (tag.close || tag.open)[1]];
    const inner = tag.close ? [tag.open[1], tag.close[0]] : null;
    if (inward) spans.push(whole, ...(inner ? [inner] : []));
    else spans.push(...(inner ? [inner] : []), whole);
  }
  for (const [a, b] of spans) {
    const grows = a <= from && b >= to && (a < from || b > to);
    const shrinks = a >= from && b <= to && (a > from || b < to);
    if (inward ? shrinks && from !== to : grows) return [a, b];
  }
  return null;
}

//: The text Wrap hands Emmet: lines after the first lose the first line's
//: indentation, because the snippet puts it back (every line of a snippet is
//: indented to the line it starts on) and the wrapped block would otherwise
//: drift one level right each time. An array when the abbreviation repeats
//: without a count (`ul>li*`), so each line becomes one item.
function docEmmetWrapText(text, indent, abbr) {
  const lines = text.split("\n").map((line, i) => (i && line.startsWith(indent) ? line.slice(indent.length) : line));
  return lines.length > 1 && /\*(?!\d)/.test(abbr) ? lines.filter((l) => l.trim()) : lines.join("\n");
}

//: **Rename the matching tag** (VS Code's linked editing): an edit inside
//: one tag's name, made to `oldText` as `fromA`..`toA` becoming `insert`,
//: and the same rename for its partner, as `{ from, to, insert }` in the
//: edited document's positions; null when the edit is not inside a paired
//: tag's name, or makes something that is no longer a name (a space starts
//: the attributes, and the partner is then left alone).
function docTagRename(E, oldText, fromA, toA, insert, xml) {
  let tag = null;
  try {
    tag = E.matchTag(oldText, fromA, { xml });
  } catch {
    return null;
  }
  if (!tag || !tag.close) return null;
  const open = [tag.open[0] + 1, tag.open[0] + 1 + tag.name.length];
  const close = [tag.close[0] + 2, tag.close[0] + 2 + tag.name.length];
  const inside = ([a, b]) => fromA >= a && toA <= b;
  const edited = inside(open) ? open : inside(close) ? close : null;
  if (!edited) return null;
  const name = tag.name.slice(0, fromA - edited[0]) + insert + tag.name.slice(toA - edited[0]);
  if (!/^[\w:.-]*$/.test(name)) return null;
  const partner = edited === open ? close : open;
  const shift = partner[0] > fromA ? insert.length - (toA - fromA) : 0;
  return { from: partner[0] + shift, to: partner[1] + shift, insert: name };
}

//: XML's auto-close, which the stream mode does not have and HTML's and
//: JSX's grammars do: the name of the tag a `>` typed now would open, or
//: null (a self-closing `/>`, a comment, a declaration, a closing tag).
function docXmlOpenedBy(before) {
  const match = /<([A-Za-z_][\w:.-]*)(?:\s[^<>]*)?$/.exec(before);
  return match && !before.endsWith("/") ? match[1] : null;
}

//: The innermost element still open at the end of `before`, for `</`: the
//: close it should be finished with, or null.
function docXmlUnclosed(before) {
  const stack = [];
  const tags = /<(\/?)([A-Za-z_][\w:.-]*)(?:\s[^<>]*?)?(\/?)>/g;
  const text = before.replace(/<!--[\s\S]*?-->|<!\[CDATA\[[\s\S]*?\]\]>/g, "");
  let match;
  while ((match = tags.exec(text)) !== null) {
    if (match[3]) continue;
    if (!match[1]) stack.push(match[2]);
    else {
      const at = stack.lastIndexOf(match[2]);
      if (at >= 0) stack.length = at;
    }
  }
  return stack.length ? stack[stack.length - 1] : null;
}

//: A computed colour (`rgb(1, 2, 3)` or `rgba(1, 2, 3, 0.5)`, which is what
//: the browser answers for any colour) as `#rrggbb`, the only form the
//: native picker takes; null for anything else.
function docRgbToHex(rgb) {
  const match = /^rgba?\(\s*(\d+)[\s,]+(\d+)[\s,]+(\d+)/i.exec(rgb || "");
  if (!match) return null;
  return `#${match.slice(1, 4).map((n) => Math.min(255, Number(n)).toString(16).padStart(2, "0")).join("")}`;
}

//: The picker's `#rrggbb`, written back in the form the value was in, as
//: VS Code does: a hex stays hex (its case and its alpha kept), `rgb()` and
//: `rgba()` stay functions (comma or space syntax, the alpha kept); `hsl()`
//: and a named colour become hex, because the picker has no other answer.
function docCssColorFormat(original, hex) {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  const hash = /^#([0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i.exec(original);
  if (hash) {
    const digits = hash[1];
    const alpha = digits.length === 4 ? digits[3].repeat(2) : digits.length === 8 ? digits.slice(6) : "";
    const out = hex + alpha;
    return /[A-F]/.test(digits) && !/[a-f]/.test(digits) ? out.toUpperCase() : out.toLowerCase();
  }
  const fn = /^(rgba?)\(([^)]*)\)$/i.exec(original.trim());
  if (fn) {
    const parts = fn[2].split(/[\s,/]+/).filter(Boolean);
    const alpha = parts[3];
    if (fn[2].includes(",")) return `${fn[1]}(${r}, ${g}, ${b}${alpha ? `, ${alpha}` : ""})`;
    return `${fn[1]}(${r} ${g} ${b}${alpha ? ` / ${alpha}` : ""})`;
  }
  return hex;
}
//: **One line on what a name is for** (INBOX 402, hover docs), written here
//: for this app rather than lifted: the packages ship names but no prose, and
//: the prose VS Code shows is MDN's, under CC-BY-SA, which this AGPL project
//: does not take in quietly. `name|line`, one per row; an element's row
//: says what it is, a property's what it sets, an attribute's what it means.
const DOC_HOVER_HTML = `
a|A link to another page, a place on this one, a file or an address.
abbr|An abbreviation; its title attribute gives the full form.
address|Contact details for the page or the article it is in.
area|A clickable region of an image map.
article|A self-contained piece: a post, a story, a card that stands alone.
aside|Content beside the main flow: a sidebar, a pull quote, notes.
audio|Sound, with the browser's own controls when asked for.
b|Text set apart in bold without extra importance.
base|The base address every relative link on the page resolves against.
bdi|Text whose direction is isolated from the text around it.
bdo|Text whose direction is overridden by its dir attribute.
blockquote|A quotation set as its own block; cite names the source.
body|The page's content: everything that is shown.
br|A line break inside text.
button|A control that does something when pressed.
canvas|A surface drawn on by script.
caption|A table's title.
cite|The title of a creative work.
code|A fragment of computer code.
col|One column of a table, for styling it as a whole.
colgroup|A group of table columns.
data|A value with a machine-readable form in its value attribute.
datalist|Suggested values for an input's list attribute.
dd|The description of a term in a description list.
del|Text that has been removed from the document.
details|A disclosure box that opens and closes; summary is its label.
dfn|The defining instance of a term.
dialog|A dialog box or modal.
div|A generic block container with no meaning of its own.
dl|A description list of terms and their descriptions.
dt|A term in a description list.
em|Stressed text, read with emphasis.
embed|External content from a plugin or another type.
fieldset|A group of form controls, with a legend.
figcaption|The caption of a figure.
figure|Self-contained content, such as an image with its caption.
footer|The footer of the page or of its section.
form|A form whose controls are sent together.
h1|A heading, level 1: the page's title.
h2|A heading, level 2.
h3|A heading, level 3.
h4|A heading, level 4.
h5|A heading, level 5.
h6|A heading, level 6.
head|The page's metadata: title, links, scripts, styles.
header|The introductory part of the page or of its section.
hgroup|A heading with its subtitle or tagline.
hr|A thematic break between paragraphs.
html|The root of the page.
i|Text in an alternate voice, usually italic.
iframe|Another page embedded in this one.
img|An image.
input|A form field; its type decides which kind.
ins|Text that has been added to the document.
kbd|Keyboard input, a key or a chord.
label|The label of a form control.
legend|The caption of a fieldset.
li|An item in a list.
link|A link to an external resource: a stylesheet, an icon, a font.
main|The page's main content, once per page.
map|An image map, with its areas.
mark|Text highlighted for reference.
menu|A list of commands.
meta|Metadata that other elements cannot give: charset, viewport, description.
meter|A measurement within a known range.
nav|A block of navigation links.
noscript|Content shown when scripts are off.
object|An external resource: an image, a page, a plugin.
ol|An ordered, numbered list.
optgroup|A labelled group of options in a select.
option|One choice in a select or a datalist.
output|The result of a calculation or an action.
p|A paragraph.
picture|Several sources for one image, chosen by the browser.
pre|Preformatted text, shown exactly as written.
progress|How far a task has got.
q|A short inline quotation.
rp|Fallback parentheses for a ruby annotation.
rt|The text of a ruby annotation.
ruby|A ruby annotation, for pronunciation of East Asian characters.
s|Text that is no longer accurate or relevant.
samp|Sample output from a program.
script|A script, inline or from its src.
search|A block of search controls.
section|A thematic section of the page, usually with a heading.
select|A drop-down of options.
slot|A placeholder in a web component's shadow tree.
small|Side comments and small print.
source|One media source for picture, audio or video.
span|A generic inline container with no meaning of its own.
strong|Text of strong importance.
style|A stylesheet written in the page.
sub|Subscript.
summary|The label of a details box.
sup|Superscript.
svg|An inline SVG drawing.
table|A table of rows and columns.
tbody|The body rows of a table.
td|A data cell.
template|Markup kept for script to clone, not shown.
textarea|A multi-line text field.
tfoot|The footer rows of a table.
th|A header cell.
thead|The header rows of a table.
time|A date or time, machine-readable in datetime.
title|The page's title, shown in the tab.
tr|A table row.
track|Timed text for audio or video: captions, subtitles.
u|Text with an unarticulated annotation, underlined.
ul|An unordered, bulleted list.
var|A variable in maths or programming.
video|A video, with the browser's own controls when asked for.
wbr|A place a long word may break.
`;

const DOC_HOVER_HTML_ATTRS = `
id|A name unique in the page, for links, labels, CSS and script.
class|Space-separated class names, for CSS and script.
style|CSS for this element alone.
title|Advisory text, shown as a tooltip.
lang|The language of the element's text.
dir|The direction of its text: ltr, rtl or auto.
hidden|Not shown, and not in the accessibility tree.
tabindex|Whether and in which order it takes keyboard focus.
href|The address a link points to.
src|The address of the resource to embed.
alt|Text in place of an image, for when it is not seen.
rel|How the linked resource relates to this page.
target|Where to open the link: _self, _blank, a frame's name.
type|The kind of control, script, button or resource.
name|The name a form control is sent under.
value|The control's current or initial value.
placeholder|A hint shown in an empty field.
disabled|The control cannot be used.
required|The field must be filled before the form is sent.
checked|The checkbox or radio is selected.
for|The id of the control a label is for.
action|Where a form is sent.
method|How a form is sent: get or post.
width|The width, in pixels.
height|The height, in pixels.
charset|The page's character encoding.
content|The value of a meta element.
role|The element's role for assistive technology.
download|Download the link's target instead of opening it.
loading|When to load: eager, or lazy near the viewport.
defer|Run the script after the page is parsed.
async|Run the script as soon as it arrives.
`;

const DOC_HOVER_CSS = `
display|How the box is laid out, and how its children are.
position|How the box is placed: in the flow, relative, absolute, fixed or sticky.
top|The offset from the top edge of the containing block.
right|The offset from the right edge of the containing block.
bottom|The offset from the bottom edge of the containing block.
left|The offset from the left edge of the containing block.
inset|The four offsets at once: top, right, bottom, left.
z-index|The stacking order of a positioned box.
width|The width of the content box, or the border box with border-box sizing.
height|The height of the content box, or the border box with border-box sizing.
min-width|The smallest the width may become.
max-width|The largest the width may become.
min-height|The smallest the height may become.
max-height|The largest the height may become.
margin|The space outside the border, on all four sides.
padding|The space inside the border, on all four sides.
border|The border's width, style and colour at once.
border-radius|How round the corners are.
box-sizing|Whether width and height include the padding and border.
box-shadow|Shadows cast by the box.
overflow|What happens to content bigger than the box.
color|The colour of the text.
background|The background's colour, image, position and repeat at once.
background-color|The colour behind the content.
background-image|An image or a gradient behind the content.
opacity|How opaque the whole element is, from 0 to 1.
font|The font's style, weight, size, line height and family at once.
font-family|The fonts to use, in order of preference.
font-size|The size of the text.
font-weight|How bold the text is.
font-style|Normal, italic or oblique text.
line-height|The height of each line of text.
letter-spacing|Extra space between letters.
text-align|How lines of text are aligned in their box.
text-decoration|Underlines, overlines and strike-throughs.
text-transform|Upper case, lower case or capitalised text.
text-overflow|How text that overflows its box is shown.
white-space|How spaces and line breaks in the text are handled.
word-break|Where lines may break inside words.
vertical-align|How an inline box sits on its line.
cursor|The pointer shown over the element.
visibility|Whether the box is seen, while still taking its space.
flex|How a flex item grows, shrinks and its starting size.
flex-direction|The direction flex items are laid out in.
flex-wrap|Whether flex items wrap onto more lines.
justify-content|How items are spaced along the main axis.
align-items|How items are aligned across the cross axis.
align-self|How this item is aligned across the cross axis.
align-content|How lines of items are spaced across the cross axis.
gap|The space between rows and columns of a flex or grid layout.
grid-template-columns|The columns of a grid and their sizes.
grid-template-rows|The rows of a grid and their sizes.
grid-column|Which grid columns an item spans.
grid-row|Which grid rows an item spans.
grid-area|The grid area an item is placed in.
place-items|align-items and justify-items at once.
transform|Moves, rotates, scales or skews the element.
transition|How changes to properties are animated.
animation|A keyframe animation's name, timing and repetition at once.
object-fit|How an image or video fills its box.
pointer-events|Whether the element can be the target of the pointer.
user-select|Whether its text can be selected.
content|What a ::before or ::after pseudo-element shows.
list-style|The marker of a list item: its type, position and image.
outline|A line drawn outside the border, not taking space.
filter|Visual effects such as blur or brightness.
aspect-ratio|The preferred ratio of width to height.
`;

const docHoverTables = {};

//: The line for `name` of `kind` ("html", "attr" or "css"), or null. A CSS
//: property's line is followed by the keywords it takes, from the same
//: table the value list uses, so the hover and the list cannot disagree.
function docHoverLine(kind, name, valueTable) {
  const source = { html: DOC_HOVER_HTML, attr: DOC_HOVER_HTML_ATTRS, css: DOC_HOVER_CSS }[kind];
  if (!source) return null;
  if (!docHoverTables[kind]) {
    docHoverTables[kind] = new Map(source.trim().split("\n").map((row) => row.split("|")));
  }
  const key = name.toLowerCase();
  const line = docHoverTables[kind].get(key);
  if (kind !== "css") return line || null;
  const values = (valueTable && valueTable.get(key)) || [];
  if (!line && !values.length) return null;
  const shown = values.slice(0, 12).join(", ") + (values.length > 12 ? ", and more" : "");
  return [line, values.length ? `Values: ${shown}.` : ""].filter(Boolean).join("\n");
}
// DOC-COMPLETE-END

//: Where Emmet comes from. Loaded the first time a document it serves is
//: opened, never at boot, as the editor bundle is; like it, the vendor URL
//: carries no `?v=` stamp (the version is the pin in package.json there).
const DOC_EMMET_BUNDLE = "/vendor/emmet/emmet.min.js";

//: The file types Emmet serves, and the dialect for each (INBOX 402). A
//: `.js` file is mounted with JSX, so there it is `className` and only
//: inside JSX; TypeScript is mounted without JSX and gets none. SCSS, Less
//: and SVG are not file types here, so they are not in the list.
const DOC_EMMET_SYNTAX = { html: "html", css: "css", xml: "xml", js: "jsx" };
let docEmmetLoad = null;

//: Fire and forget. The sources read `window.EMMET` when they are asked, so
//: nothing has to be reconfigured when it lands; until then the lists are
//: the language's own, and if it never loads they stay that way.
function docLoadEmmet() {
  if (window.EMMET) return Promise.resolve(true);
  if (docEmmetLoad) return docEmmetLoad;
  docEmmetLoad = new Promise((resolve) => {
    const script = document.createElement("script");
    script.src = DOC_EMMET_BUNDLE;
    script.async = true;
    script.addEventListener("load", () => resolve(true));
    script.addEventListener("error", () => {
      console.warn("MemoryMap: the Emmet bundle could not be loaded; completions are the language's own.");
      resolve(false);
    });
    document.head.appendChild(script);
  });
  return docEmmetLoad;
}

//: Whether the caret is where markup's text goes, rather than inside a tag,
//: an attribute, a comment or a doctype. Inside `<script>` and `<style>` the
//: source is not asked at all: it is mounted on HTML's own language data.
function docHtmlTextAt(CM, state, pos) {
  for (let node = CM.language.syntaxTree(state).resolveInner(pos, -1); node; node = node.parent) {
    if (/Tag$|^(TagName|Attribute|AttributeName|AttributeValue|Comment|DoctypeDecl|ProcessingInst)$/.test(node.name)) return false;
  }
  return true;
}

//: The same question in JSX: inside an element's children, and not in a
//: tag, an attribute or a `{...}` expression (which is JavaScript again).
//: Everywhere else in a `.js` file the answer is no, because `a`, `b`, `i`,
//: `p` and `s` are the commonest names in JavaScript and every one is a tag.
function docJsxChildAt(CM, state, pos) {
  for (let node = CM.language.syntaxTree(state).resolveInner(pos, -1); node; node = node.parent) {
    if (/^JSX(OpenTag|CloseTag|SelfClosingTag|Attribute|AttributeValue|Escape|FragmentTag)$/.test(node.name)) return false;
    if (node.name === "JSXElement" || node.name === "JSXFragment") return true;
  }
  return false;
}

//: XML is a stream mode here, with no tree to ask: outside a tag is after
//: the last `>` rather than the last `<`.
function docXmlTextAt(state, pos) {
  const before = state.sliceDoc(Math.max(0, pos - 4000), pos);
  return before.lastIndexOf("<") <= before.lastIndexOf(">");
}

function docEmmetPlace(CM, state, pos, syntax) {
  if (syntax === "css") return docCssInBlock(CM, state, pos);
  if (syntax === "jsx") return docJsxChildAt(CM, state, pos);
  if (syntax === "xml") return docXmlTextAt(state, pos);
  return docHtmlTextAt(CM, state, pos);
}

//: Whether the caret is inside a CSS rule's braces.
function docCssInBlock(CM, state, pos) {
  for (let node = CM.language.syntaxTree(state).resolveInner(pos, -1); node; node = node.parent) {
    if (node.name === "Block") return true;
  }
  return false;
}

//: The Emmet row at the caret, or null: `{ from, to, template, preview, abbr }`
//: in document positions.
function docEmmetMatch(CM, state, pos, syntax, anywhere) {
  const E = window.EMMET;
  if (!E) return null;
  if (!docEmmetPlace(CM, state, pos, syntax)) return null;
  const line = state.doc.lineAt(pos);
  const found = docEmmetAt(line.text, pos - line.from, syntax, E, anywhere);
  if (!found) return null;
  const expansion = docEmmetExpansion(E, found.abbr, syntax);
  if (!expansion) return null;
  return { from: line.from + found.start, to: line.from + found.end, abbr: found.abbr, ...expansion };
}

//: The detail pane for an Emmet row: the expansion as it will read, cut at
//: twenty lines.
function docEmmetInfo(preview) {
  const pre = document.createElement("pre");
  pre.className = "cm-emmet-preview";
  const lines = preview.split("\n");
  pre.textContent = lines.length > 20 ? [...lines.slice(0, 20), "..."].join("\n") : preview;
  return pre;
}

//: One stable function per syntax, for the reason `docCodeCompletionSource`
//: gives: the engine tells sources apart by identity.
const docEmmetSourceCache = {};

function docEmmetSource(CM, syntax) {
  if (docEmmetSourceCache[syntax]) return docEmmetSourceCache[syntax];
  docEmmetSourceCache[syntax] = (context) => {
    const found = docEmmetMatch(CM, context.state, context.pos, syntax, context.explicit);
    if (!found) return null;
    return {
      from: found.from,
      to: found.to,
      filter: false,
      options: [{
        label: found.abbr,
        detail: "Emmet",
        type: "keyword",
        boost: 50,
        info: () => docEmmetInfo(found.preview),
        apply: CM.autocomplete.snippet(found.template),
      }],
    };
  };
  return docEmmetSourceCache[syntax];
}

//: Tab with the list closed: expand the abbreviation before the caret, as
//: VS Code's `emmet.triggerExpansionOnTab` does. False when there is none,
//: so Tab goes on to indent.
function docEmmetExpandAtCaret(view, CM) {
  const syntax = DOC_EMMET_SYNTAX[docFileType().ext];
  const range = view.state.selection.main;
  if (!syntax || !range.empty) return false;
  const found = docEmmetMatch(CM, view.state, range.head, syntax, true);
  if (!found) return false;
  CM.autocomplete.snippet(found.template)(view, null, found.from, found.to);
  return true;
}

//: The markup dialect of the open code document, or null (CSS has no tags
//: to wrap or balance).
function docEmmetMarkupSyntax() {
  const type = docFileType();
  const syntax = DOC_EMMET_SYNTAX[type.ext];
  if (!docCmView || !window.CM6 || type.previewable || docView === "plain") return null;
  return syntax && syntax !== "css" ? syntax : null;
}

//: **Wrap with abbreviation**, VS Code's Emmet command: the selection (or
//: the line, without its indentation) goes inside what an abbreviation
//: makes, `ul>li*` taking one item per line. The abbreviation is asked for
//: in the app's own dialog; the last one is offered again.
let docEmmetLastWrap = "div";

async function docEmmetWrap() {
  const syntax = docEmmetMarkupSyntax();
  if (!syntax) {
    toast("Wrap with an abbreviation works in HTML, XML and JSX files.");
    return false;
  }
  const view = docCmView;
  const CM = window.CM6;
  if (!(await docLoadEmmet()) || !window.EMMET) {
    toast("Emmet could not be loaded, so nothing was wrapped.", true);
    return false;
  }
  let { from, to } = view.state.selection.main;
  const first = view.state.doc.lineAt(from);
  const indent = /^\s*/.exec(first.text)[0];
  if (from === to) {
    from = first.from + indent.length;
    to = first.to;
  }
  const abbr = await promptDialog("Wrap with an abbreviation:", docEmmetLastWrap, { confirmLabel: "Wrap" });
  if (!abbr || !docCmView) return false;
  const text = docEmmetWrapText(view.state.sliceDoc(from, to), indent, abbr);
  const expansion = docEmmetExpansion(window.EMMET, abbr, syntax, text);
  if (!expansion) {
    toast(`Emmet cannot read "${abbr}" as an abbreviation.`, true);
    return false;
  }
  docEmmetLastWrap = abbr;
  view.focus();
  CM.autocomplete.snippet(expansion.template)(view, null, from, to);
  markDocDirty();
  return true;
}

//: **Balance**, VS Code's Emmet command: select the tag around the
//: selection's content, then the tag, then its parent's content and so on
//: (outward), or back in (inward). From the text, by Emmet's own matcher, so
//: HTML, XML and JSX all work the same way.
function docEmmetBalance(inward) {
  const syntax = docEmmetMarkupSyntax();
  const E = window.EMMET;
  if (!syntax || !E) return false;
  const view = docCmView;
  const text = view.state.doc.toString();
  const { from, to } = view.state.selection.main;
  const options = { xml: syntax !== "html" };
  const into = inward && from !== to;
  const tags = into ? E.balancedInward(text, from, options) : E.balancedOutward(text, from, options);
  const range = docBalanceRange(tags, from, to, into);
  if (!range) return false;
  view.dispatch({ selection: { anchor: range[0], head: range[1] }, scrollIntoView: true });
  view.focus();
  return true;
}

//: A CSS property's row, taken: the name, then `: `, then the value list
//: opened straight away, VS Code's order. Not where a colon already follows.
function docCssPropertyApply(CM) {
  return (view, completion, from, to) => {
    const colon = /^\s*:/.test(view.state.sliceDoc(to, to + 40));
    const insert = colon ? completion.label : `${completion.label}: `;
    view.dispatch({
      changes: { from, to, insert },
      selection: { anchor: from + insert.length },
      userEvent: "input.complete",
      annotations: CM.autocomplete.pickedCompletion.of(completion),
    });
    if (!colon) CM.autocomplete.startCompletion(view);
  };
}

//: The CSS document's list: the package's own properties, pseudo-classes and
//: at-rules, with each property's own values in place of its flat list.
let docCssCompletionCache = null;

function docCssCompletionSource(CM) {
  if (docCssCompletionCache) return docCssCompletionCache;
  const applyProperty = docCssPropertyApply(CM);
  docCssCompletionCache = (context) => {
    const { state, pos } = context;
    const native = CM.css.cssCompletionSource(context);
    const value = docCssInBlock(CM, state, pos)
      ? docCssValueContext(state.sliceDoc(Math.max(0, pos - 400), pos))
      : null;
    if (value) {
      const table = docCssValueTable(window.EMMET);
      const own = docCssValueOptions(value.property, table);
      //: A property whose values are known gets those and nothing else:
      //: `display: f` offering `fantasy` and `firebrick` is the flat list
      //: this replaces. One that is not known (`width`, a custom property)
      //: keeps the package's list after its own, as a fallback.
      const known = table.has(value.property) || DOC_CSS_COLOR_PROPERTY.test(value.property);
      const seen = new Set(own.map((o) => o.label));
      const rest = known ? [] : (native?.options || []).filter((o) => !seen.has(o.label)).map((o) => ({ ...o, boost: -5 }));
      return {
        from: pos - value.word.length,
        options: [...own.map((o) => ({ ...o, type: "constant" })), ...rest],
        validFor: /^[\w-]*$/,
      };
    }
    if (!native) return null;
    return {
      ...native,
      options: native.options.map((o) => (o.type === "property" ? { ...o, apply: applyProperty } : o)),
    };
  };
  return docCssCompletionCache;
}

let docCssSourcesCache = null;

function docCssSources(CM) {
  if (!docCssSourcesCache) docCssSourcesCache = [docCssCompletionSource(CM), docEmmetSource(CM, "css")];
  return docCssSourcesCache;
}

//: Tab: the chosen row when the list is open (the ghost text shows which),
//: else an Emmet abbreviation, else nothing, so the editor's own Tab
//: indents. Enter is not here: it is the list's, in its own keymap.
function docCompleteTab(view, CM) {
  const ac = CM.autocomplete;
  if (ac.completionStatus(view.state) === "active" && ac.selectedCompletion(view.state)) {
    return ac.acceptCompletion(view);
  }
  return docEmmetExpandAtCaret(view, CM);
}

//: The ghost text: a widget after the caret holding the rest of the chosen
//: row, rebuilt on every update (the list's choice moves with the arrows).
let docGhostPluginCache = null;

function docGhostPlugin(CM) {
  if (docGhostPluginCache) return docGhostPluginCache;
  const { Decoration, ViewPlugin, WidgetType } = CM.view;
  class Ghost extends WidgetType {
    constructor(text) {
      super();
      this.text = text;
    }
    eq(other) {
      return other.text === this.text;
    }
    toDOM() {
      const span = document.createElement("span");
      span.className = "cm-ghostText";
      span.setAttribute("aria-hidden", "true");
      span.textContent = this.text;
      return span;
    }
    ignoreEvent() {
      return true;
    }
  }
  const build = (state) => {
    const ac = CM.autocomplete;
    const range = state.selection.main;
    if (!range.empty || ac.completionStatus(state) !== "active") return Decoration.none;
    const chosen = ac.selectedCompletion(state);
    if (!chosen) return Decoration.none;
    const line = state.doc.lineAt(range.head);
    const col = range.head - line.from;
    const rest = docGhostSuffix(line.text.slice(0, col), line.text.slice(col), chosen.label);
    if (!rest) return Decoration.none;
    return Decoration.set([Decoration.widget({ widget: new Ghost(rest), side: 1 }).range(range.head)]);
  };
  docGhostPluginCache = ViewPlugin.fromClass(
    class {
      constructor(view) {
        this.decorations = build(view.state);
      }
      update(update) {
        this.decorations = build(update.state);
      }
    },
    { decorations: (plugin) => plugin.decorations }
  );
  return docGhostPluginCache;
}

//: Everything above, for a code document: the list opening as you type,
//: Emmet where the type has it, the ghost text and Tab.
//: **Rename the matching tag, as you type** (INBOX 402). A transaction
//: filter rather than a second dispatch, so the partner's rename rides in
//: the same transaction as the keystroke: one undo step takes both back.
//: Only a user's own typing or deleting inside a tag's name is followed, and
//: in a `.js` file only inside JSX, where the tree says the caret is in a
//: JSX tag (the matcher reads text, and `a <b` in JavaScript is not a tag).
const docTagLinkCache = {};

function docTagLink(CM, syntax) {
  if (docTagLinkCache[syntax]) return docTagLinkCache[syntax];
  docTagLinkCache[syntax] = CM.state.EditorState.transactionFilter.of((tr) => {
    if (!tr.docChanged || !(tr.isUserEvent("input.type") || tr.isUserEvent("delete"))) return tr;
    const E = window.EMMET;
    if (!E) return tr;
    const edits = [];
    tr.changes.iterChanges((fromA, toA, _fromB, _toB, inserted) => edits.push([fromA, toA, inserted.toString()]));
    if (edits.length !== 1) return tr;
    const [fromA, toA, insert] = edits[0];
    const start = tr.startState;
    const line = start.doc.lineAt(fromA);
    //: The cheap test first: the edit touches `<name` or `</name` on its
    //: line. Only then is the whole text handed to the matcher.
    if (!/<\/?[\w:.-]*$/.test(line.text.slice(0, fromA - line.from))) return tr;
    if (syntax === "jsx") {
      let inTag = false;
      for (let node = CM.language.syntaxTree(start).resolveInner(fromA, -1), k = 0; node && k < 4; node = node.parent, k += 1) {
        if (/^JSX(OpenTag|CloseTag)$/.test(node.name)) inTag = true;
      }
      if (!inTag) return tr;
    }
    const partner = docTagRename(E, start.doc.toString(), fromA, toA, insert, syntax !== "html");
    if (!partner) return tr;
    return [tr, { changes: partner, sequential: true }];
  });
  return docTagLinkCache[syntax];
}

//: XML's auto-close and `</` completion, as an input handler: `>` after
//: `<item` writes `></item>` with the caret between, and `/` after `<`
//: finishes the innermost open element's close. HTML and JSX already have
//: both from their grammars (`autoCloseTags`).
let docXmlCloseCache = null;

function docXmlAutoClose(CM) {
  if (docXmlCloseCache) return docXmlCloseCache;
  docXmlCloseCache = CM.view.EditorView.inputHandler.of((view, from, to, text) => {
    if ((text !== ">" && text !== "/") || from !== to || view.state.readOnly) return false;
    const before = view.state.sliceDoc(Math.max(0, from - 20000), from);
    if (text === ">") {
      const name = docXmlOpenedBy(before);
      if (!name) return false;
      view.dispatch({
        changes: { from, insert: `></${name}>` },
        selection: { anchor: from + 1 },
        userEvent: "input.type",
      });
      return true;
    }
    if (!before.endsWith("<")) return false;
    const name = docXmlUnclosed(before.slice(0, -1));
    if (!name) return false;
    view.dispatch({
      changes: { from, insert: `/${name}>` },
      selection: { anchor: from + name.length + 2 },
      userEvent: "input.type",
    });
    return true;
  });
  return docXmlCloseCache;
}

//: **Colour swatches** (INBOX 402), VS Code's colour decorators: a small
//: square before each colour in a CSS value (a hex, `rgb()`, `hsl()` and
//: their alpha forms, a named colour), in the colour itself, and a click on
//: it opens the browser's own colour picker. From the tree, so only real
//: values get one (a colour word in a comment or a selector does not), and
//: only over the visible lines. HTML's `<style>` is the same CSS tree.
function docColorAt(view, swatch, from, to) {
  const original = view.state.sliceDoc(from, to);
  const probe = document.createElement("span");
  probe.style.color = original;
  document.body.appendChild(probe);
  const hex = docRgbToHex(getComputedStyle(probe).color) || "#000000";
  probe.remove();
  const input = document.createElement("input");
  input.type = "color";
  input.value = hex;
  input.className = "doc-color-input";
  input.setAttribute("aria-label", "Pick a colour");
  //: Where the swatch is, because the picker opens beside its input; not
  //: seen and not in the way. Set as properties: the CSP refuses `style=`.
  const box = swatch.getBoundingClientRect();
  Object.assign(input.style, {
    position: "fixed", left: `${box.left}px`, top: `${box.bottom}px`,
    width: "1px", height: "1px", opacity: "0", border: "0", padding: "0",
  });
  document.body.appendChild(input);
  let range = { from, to };
  input.addEventListener("input", () => {
    const text = docCssColorFormat(view.state.sliceDoc(range.from, range.to), input.value);
    view.dispatch({ changes: { from: range.from, to: range.to, insert: text }, userEvent: "input.color" });
    range = { from: range.from, to: range.from + text.length };
    markDocDirty();
  });
  const done = () => input.remove();
  input.addEventListener("change", done);
  input.addEventListener("blur", done);
  try {
    input.showPicker();
  } catch {
    input.click();
  }
  return input;
}

let docColorPluginCache = null;

function docColorSwatches(CM) {
  if (docColorPluginCache) return docColorPluginCache;
  const { Decoration, ViewPlugin, WidgetType } = CM.view;
  class Swatch extends WidgetType {
    constructor(color, from, to) {
      super();
      this.color = color;
      this.from = from;
      this.to = to;
    }
    eq(other) {
      return other.color === this.color && other.from === this.from;
    }
    toDOM(view) {
      const el = document.createElement("span");
      el.className = "cm-color-swatch";
      el.setAttribute("role", "button");
      el.setAttribute("aria-label", `Pick a colour for ${this.color}`);
      el.title = "Pick a colour";
      el.style.backgroundColor = this.color;
      el.addEventListener("mousedown", (event) => {
        event.preventDefault();
        docColorAt(view, el, this.from, this.to);
      });
      return el;
    }
    ignoreEvent() {
      return true;
    }
  }
  const named = new Set(DOC_CSS_COLORS.filter((c) => c !== "transparent" && c !== "currentcolor"));
  const build = (view) => {
    const found = [];
    const { state } = view;
    for (const { from, to } of view.visibleRanges) {
      CM.language.syntaxTree(state).iterate({
        from,
        to,
        enter: (node) => {
          if (node.name === "CallExpression") {
            const callee = node.node.getChild("Callee");
            const name = callee ? state.sliceDoc(callee.from, callee.to) : "";
            if (!/^(rgba?|hsla?|hwb|lab|lch|oklab|oklch)$/i.test(name)) return;
          } else if (node.name === "ValueName") {
            if (!named.has(state.sliceDoc(node.from, node.to).toLowerCase())) return;
          } else if (node.name !== "ColorLiteral") return;
          const text = state.sliceDoc(node.from, node.to);
          if (typeof CSS !== "undefined" && !CSS.supports("color", text)) return false;
          found.push(Decoration.widget({ widget: new Swatch(text, node.from, node.to), side: -1 }).range(node.from));
          return false;
        },
      });
    }
    return Decoration.set(found, true);
  };
  docColorPluginCache = ViewPlugin.fromClass(
    class {
      constructor(view) {
        this.decorations = build(view);
      }
      update(update) {
        if (update.docChanged || update.viewportChanged || CM.language.syntaxTree(update.startState) !== CM.language.syntaxTree(update.state)) {
          this.decorations = build(update.view);
        }
      }
    },
    { decorations: (plugin) => plugin.decorations }
  );
  return docColorPluginCache;
}

//: **Hover docs** (INBOX 402): a CSS property, an HTML element or an HTML
//: attribute under the pointer gets its one line (`docHoverLine`), on the
//: hover card the diagnostics already use. From the tree, so a word in text
//: or in a comment gets nothing.
let docHoverDocsCache = null;

function docHoverDocs(CM) {
  if (docHoverDocsCache) return docHoverDocsCache;
  docHoverDocsCache = CM.view.hoverTooltip((view, pos, side) => {
    const node = CM.language.syntaxTree(view.state).resolveInner(pos, side);
    const kind = { PropertyName: "css", TagName: "html", AttributeName: "attr" }[node.name];
    if (!kind) return null;
    const name = view.state.sliceDoc(node.from, node.to);
    const line = docHoverLine(kind, name, docCssValueTable(window.EMMET));
    if (!line) return null;
    return {
      pos: node.from,
      end: node.to,
      above: true,
      create: () => {
        const dom = document.createElement("div");
        dom.className = "cm-hover-doc";
        const head = document.createElement("code");
        head.textContent = kind === "html" ? `<${name}>` : name;
        dom.appendChild(head);
        for (const part of line.split("\n")) {
          const row = document.createElement("div");
          row.className = part.startsWith("Values:") ? "cm-hover-doc-values" : "cm-hover-doc-line";
          row.textContent = part;
          dom.appendChild(row);
        }
        return { dom };
      },
    };
  });
  return docHoverDocsCache;
}

//: **Indentation guides** (INBOX 402): a hairline at each indent step of a
//: line's leading whitespace, VS Code's guides. One mark per step of the
//: whitespace (a tab, or the unit's run of spaces), each drawing a
//: one-pixel line at its own left edge, so a guide sits exactly where the
//: step starts whatever the face (the code face's space is not its `ch`,
//: measured: 5.1px against 10.2px, so a background stepped in `ch` drifted
//: a guide per level) and can never reach past the indentation into the
//: code. Quiet on purpose: `--border`, the hairline the app uses everywhere.
const docIndentGuideCache = new Map();

//: The steps of a line's leading whitespace, as `[from, to]` columns: each
//: tab, and each full run of `unit` spaces; a short run left over is not a
//: step and gets no guide.
function docIndentSteps(lead, unit) {
  const steps = [];
  const size = unit === "\t" ? 4 : Math.max(1, unit.length);
  let col = 0;
  while (col < lead.length) {
    if (lead[col] === "\t") {
      steps.push([col, col + 1]);
      col += 1;
      continue;
    }
    let run = 0;
    while (col + run < lead.length && lead[col + run] === " " && run < size) run += 1;
    if (run < size) break;
    steps.push([col, col + run]);
    col += run;
  }
  return steps;
}

function docIndentGuides(CM, unit) {
  if (docIndentGuideCache.has(unit)) return docIndentGuideCache.get(unit);
  const { Decoration, ViewPlugin } = CM.view;
  const mark = Decoration.mark({ class: "cm-indent-guide" });
  const build = (view) => {
    const found = [];
    for (const { from, to } of view.visibleRanges) {
      for (let pos = from; pos <= to; ) {
        const line = view.state.doc.lineAt(pos);
        const lead = /^[ \t]*/.exec(line.text)[0];
        for (const [a, b] of docIndentSteps(lead, unit)) found.push(mark.range(line.from + a, line.from + b));
        pos = line.to + 1;
      }
    }
    return Decoration.set(found);
  };
  const plugin = ViewPlugin.fromClass(
    class {
      constructor(view) {
        this.decorations = build(view);
      }
      update(update) {
        if (update.docChanged || update.viewportChanged) this.decorations = build(update.view);
      }
    },
    { decorations: (p) => p.decorations }
  );
  docIndentGuideCache.set(unit, plugin);
  return plugin;
}

//: **Bracket pair colours** (INBOX 402): `()`, `[]` and `{}` coloured by how
//: deep they sit, three tones in turn, VS Code's colouriser. A bracket inside
//: a string, a comment, a regular expression or HTML's text is not a bracket
//: and is left alone: the tree says which, for the full grammars and for the
//: stream modes alike (their tokens are named `string` and `comment`). The
//: depth is counted from the top of the file to the end of what is shown, so
//: it is right wherever the view scrolls to; past the checker's own size cap
//: it is not worth a keystroke and nothing is coloured.
const DOC_BRACKET_NOT_CODE = /String|string|Comment|comment|RegExp|regexp|^Text$|AttributeValue|^Escape$|^meta$/;

//: `[position, depth]` for each bracket of `text` from `start` on, the depth
//: counted from the top; `inCode(i)` says whether position `i` is code.
function docBracketDepths(text, start, inCode) {
  const found = [];
  let depth = 0;
  for (let i = 0; i < text.length; i += 1) {
    const open = "([{".indexOf(text[i]);
    const close = open < 0 ? ")]}".indexOf(text[i]) : -1;
    if (open < 0 && close < 0) continue;
    if (!inCode(i)) continue;
    if (close >= 0) depth = Math.max(0, depth - 1);
    if (i >= start) found.push([i, depth]);
    if (open >= 0) depth += 1;
  }
  return found;
}

let docBracketColourCache = null;

function docBracketColours(CM) {
  if (docBracketColourCache) return docBracketColourCache;
  const { Decoration, ViewPlugin } = CM.view;
  const marks = [0, 1, 2].map((k) => Decoration.mark({ class: `cm-bracket-${k}` }));
  const build = (view) => {
    const ranges = view.visibleRanges;
    if (!ranges.length) return Decoration.none;
    const end = ranges[ranges.length - 1].to;
    if (end > DOC_CHECK_MAX_CHARS) return Decoration.none;
    const tree = CM.language.syntaxTree(view.state);
    const inCode = (i) => !DOC_BRACKET_NOT_CODE.test(tree.resolveInner(i, 1).name);
    const found = docBracketDepths(view.state.sliceDoc(0, end), ranges[0].from, inCode);
    return Decoration.set(found.map(([i, depth]) => marks[depth % 3].range(i, i + 1)));
  };
  docBracketColourCache = ViewPlugin.fromClass(
    class {
      constructor(view) {
        this.decorations = build(view);
      }
      update(update) {
        if (update.docChanged || update.viewportChanged || CM.language.syntaxTree(update.startState) !== CM.language.syntaxTree(update.state)) {
          this.decorations = build(update.view);
        }
      }
    },
    { decorations: (p) => p.decorations }
  );
  return docBracketColourCache;
}

//: **A code file's symbols, as the outline's headings** (INBOX 402, VS
//: Code's outline and breadcrumbs): its functions, classes and methods (and
//: a TypeScript file's interfaces, types and enums, a CSS file's rules and
//: at-rules), in the shape `docScanHeadings` gives a markdown file's
//: headings, `{ line, text, level }`, so the outline panel, its filter, its
//: current-row mark and the breadcrumb all read them unchanged. `level` is
//: the nesting: a method sits under its class. From the Lezer tree, so a
//: word in a string or a comment is never a symbol. `symbol: true` marks
//: the rows the outline must not offer to move: a heading's section is a
//: run of lines, a function is not.
const DOC_SYMBOL_EXTS = new Set(["js", "ts", "py", "css"]);

function docCodeSymbols(CM, state, ext) {
  if (!DOC_SYMBOL_EXTS.has(ext)) return [];
  const tree = CM.language.ensureSyntaxTree(state, state.doc.length, 50) || CM.language.syntaxTree(state);
  const text = (node) => state.sliceDoc(node.from, node.to);
  const nameOf = (node, ...kinds) => {
    for (const kind of kinds) {
      const child = node.getChild(kind);
      if (child) return text(child);
    }
    return "";
  };
  const found = [];
  const stack = [];
  tree.iterate({
    enter: (ref) => {
      const node = ref.node;
      let label = "";
      switch (node.name) {
        case "FunctionDeclaration":
          label = `${nameOf(node, "VariableDefinition")}()`;
          break;
        case "ClassDeclaration":
          label = `class ${nameOf(node, "VariableDefinition", "TypeDefinition")}`;
          break;
        case "MethodDeclaration":
          label = `${nameOf(node, "PropertyDefinition", "PrivatePropertyDefinition")}()`;
          break;
        case "InterfaceDeclaration":
          label = `interface ${nameOf(node, "TypeDefinition")}`;
          break;
        case "TypeAliasDeclaration":
          label = `type ${nameOf(node, "TypeDefinition")}`;
          break;
        case "EnumDeclaration":
          label = `enum ${nameOf(node, "TypeDefinition")}`;
          break;
        case "VariableDeclaration": {
          //: Only a name bound to a function: `const f = () => ...` is a
          //: function in all but keyword; `const n = 3` is not a symbol.
          if (node.getChild("ArrowFunction") || node.getChild("FunctionExpression")) {
            label = `${nameOf(node, "VariableDefinition")}()`;
          }
          break;
        }
        case "FunctionDefinition":
          label = `${nameOf(node, "VariableName")}()`;
          break;
        case "ClassDefinition":
          label = `class ${nameOf(node, "VariableName")}`;
          break;
        case "RuleSet":
        case "MediaStatement":
        case "KeyframesStatement":
        case "SupportsStatement": {
          const block = node.getChild("Block");
          label = state.sliceDoc(node.from, block ? block.from : node.to).replace(/\s+/g, " ").trim();
          if (label.length > 60) label = `${label.slice(0, 57)}...`;
          break;
        }
        default:
          return;
      }
      if (!label || /^(class |interface |type |enum )?\(?\)?$/.test(label)) return;
      while (stack.length && stack[stack.length - 1] <= node.from) stack.pop();
      found.push({ line: state.doc.lineAt(node.from).number - 1, text: label, level: stack.length + 1, symbol: true });
      stack.push(node.to);
    },
  });
  return found;
}

//: Go to a symbol, from the palette: the file's symbols in the menu at the
//: caret, VS Code's Ctrl+Shift+O list. Not on that chord: this app's
//: registry gives Ctrl+Shift+O to starting a new chat.
function docOpenSymbols() {
  const CM = window.CM6;
  const view = docCmView;
  if (!CM || !view || typeof openMenuAtPoint !== "function") return false;
  const symbols = docCodeSymbols(CM, view.state, docFileType().ext);
  const items = symbols.length
    ? symbols.slice(0, 200).map((s) => ({
      label: `${s.text.startsWith("class ") ? "ph:cube" : /\(\)$/.test(s.text) ? "ph:function" : "ph:hash"} ${s.text}`,
      title: `Line ${s.line + 1}`,
      run: () => jumpToDocLine(s.line),
    }))
    : [{ label: "ph:info No symbols in this file", disabled: true, run: () => {} }];
  const at = view.coordsAtPos(view.state.selection.main.head) || view.contentDOM.getBoundingClientRect();
  openMenuAtPoint(items, "Symbols in this file", at.left, at.bottom);
  return true;
}

//: XML's Emmet source, as language data for the stream mode: one stable
//: array, for the identity reason above.
let docEmmetXmlData = null;

function docCompletionExtras(CM, type) {
  if (DOC_EMMET_SYNTAX[type.ext]) docLoadEmmet();
  if (!docEmmetXmlData) docEmmetXmlData = [{ autocomplete: docEmmetSource(CM, "xml") }];
  const config = { activateOnTyping: true, maxRenderedOptions: 60 };
  if (type.ext === "css") config.override = docCssSources(CM);
  return [
    CM.autocomplete.autocompletion(config),
    type.ext === "html" ? CM.html.htmlLanguage.data.of({ autocomplete: docEmmetSource(CM, "html") }) : [],
    //: The JSX dialect shares JavaScript's language data, so this reaches a
    //: `.js` file; the source itself answers only inside JSX.
    type.ext === "js" ? CM.javascript.javascriptLanguage.data.of({ autocomplete: docEmmetSource(CM, "jsx") }) : [],
    type.ext === "xml" ? CM.state.EditorState.languageData.of(() => docEmmetXmlData) : [],
    type.ext === "xml" ? docXmlAutoClose(CM) : [],
    ["css", "html"].includes(type.ext) ? docColorSwatches(CM) : [],
    ["css", "html"].includes(type.ext) ? docHoverDocs(CM) : [],
    docIndentGuides(CM, type.indent || "  "),
    docBracketColours(CM),
    ["html", "xml", "js"].includes(type.ext) ? docTagLink(CM, DOC_EMMET_SYNTAX[type.ext]) : [],
    docGhostPlugin(CM),
    CM.state.Prec.highest(CM.view.keymap.of([{ key: "Tab", run: (view) => docCompleteTab(view, CM) }])),
  ];
}

// -----------------------------------------------------------------------------
// Code documents as a code editor, part two: pairs, indentation, formatting
// and quick fixes
// -----------------------------------------------------------------------------
//
// The owner, 2026-09-23: "on the code document types as well, can you add
// the things like with vs code how if I write a \" it automatically does \"\"
// and puts my cursor position in between them ... if Im writing in a c
// language or java or smth where I write var_name { and it automatically
// does {} and then if I press enter it automatically indents and code
// structures them?? also a button to automatically format the whole
// document, ot just a selection ... also recommended fixes to apply like the
// other autocorrect feature."
//
// The pure half first: everything here is string work with no editor in
// it, so `tests/test_code_editing.py` runs it in node and holds every
// indent, every format and every fix to the exact text it must produce.

// DOC-CODE-BEGIN (tests/test_code_editing.py runs this region in node)
//: **What the editor has to know about a language to leave its strings and
//: comments alone**, per file type. Not a grammar: the four things a
//: bracket, an indent or a trailing space depends on, which are where a
//: comment starts, where a string starts and ends, whether a string may run
//: onto the next line, and the handful of oddities (a C++ raw string, a
//: Rust lifetime, a JavaScript regex) that would otherwise be read as an
//: unclosed quote or an unmatched bracket. The Lezer grammars in the bundle
//: know more than this for five languages; the other seventeen have a
//: highlighter that colours a line at a time and cannot answer "which `{`
//: does this `}` close", so this is the one answer all of them share.
//:
//: Each quote is `[open, close, multi, escape, doubled]`: `multi` is whether
//: the string may cross a line break, `escape` whether a backslash escapes
//: the next character, `doubled` whether writing the quote twice is how the
//: language escapes it (SQL's `'it''s'`). Longer openers come first, so a
//: `"""` is never read as three empty strings.
function docCodeProfile(ext) {
  const q = (open, close, multi, escape = true, doubled = false) => ({ open, close, multi, escape, doubled });
  const dq = q('"', '"', false);
  const sq = q("'", "'", false);
  const slash = { line: ["//"], block: ["/*", "*/"] };
  const cLike = { ...slash, quotes: [dq, sq], stmt: true, caseStyle: "indent" };
  switch (ext) {
    case "c": return { ...cLike, preproc: true };
    case "cpp": return { ...cLike, preproc: true, rawCpp: true, digitSep: true };
    case "cs": return { ...cLike, quotes: [q('"""', '"""', true, false), dq, sq], verbatimCs: true };
    case "java": return { ...cLike, quotes: [q('"""', '"""', true), dq, sq] };
    case "kt": return { ...cLike, nest: true, quotes: [q('"""', '"""', true, false), dq, sq], caseStyle: null };
    case "go": return { ...cLike, quotes: [dq, sq, q("`", "`", true, false)], caseStyle: "flush" };
    case "rs": return { ...cLike, nest: true, quotes: [q('"', '"', true)], rustChars: true, rustRaw: true, caseStyle: null };
    case "swift": return { ...cLike, nest: true, quotes: [q('"""', '"""', true), dq], caseStyle: "flush" };
    case "php":
      return { ...cLike, line: ["//", "#"], quotes: [q('"', '"', true), q("'", "'", true)], phpTags: true,
        heredoc: /^<<<[ \t]*(['"]?)([A-Za-z_]\w*)\1/ };
    case "js":
    case "ts":
      return { ...cLike, quotes: [dq, sq, q("`", "`", true)], template: true, regex: true };
    case "css": return { line: [], block: ["/*", "*/"], quotes: [dq, sq] };
    case "json": return { line: [], block: null, quotes: [dq] };
    case "r": return { line: ["#"], block: null, quotes: [q('"', '"', true), q("'", "'", true), q("`", "`", true)], stmt: true };
    case "sql":
      return { line: ["--"], block: ["/*", "*/"],
        quotes: [q("'", "'", true, false, true), q('"', '"', true, false, true), q("`", "`", true, false, true)] };
    case "bash":
      return { line: ["#"], hashAtWord: true, block: null, heredoc: /^<<-?[ \t]*(['"]?)([A-Za-z_]\w*)\1/,
        quotes: [q('"', '"', true), q("'", "'", true, false), q("`", "`", true)] };
    case "toml":
      return { line: ["#"], block: null,
        quotes: [q('"""', '"""', true), q("'''", "'''", true, false), dq, q("'", "'", false, false)] };
    case "ini": return { line: [";", "#"], block: null, quotes: [] };
    case "py":
      return { line: ["#"], block: null,
        quotes: [q('"""', '"""', true), q("'''", "'''", true), dq, sq] };
    case "rb":
      return { line: ["#"], block: null, heredoc: /^<<[-~]?(['"]?)([A-Z_]\w*)\1/,
        quotes: [q('"', '"', true), q("'", "'", true), q("`", "`", true)] };
    //: No quotes for YAML: a quote only opens a string at the start of a
    //: value there, so `note: don't` is an apostrophe, and reading it as a
    //: string that never closes would refuse to tidy a valid file. What YAML
    //: does have that matters here is the block scalar, handled by the
    //: formatter itself.
    case "yaml": return { line: ["#"], hashAtWord: true, block: null, quotes: [] };
    default: return null;
  }
}

const DOC_CODE_OPEN = { "(": ")", "[": "]", "{": "}" };
const DOC_CODE_CLOSE = { ")": "(", "]": "[", "}": "{" };

//: **One pass over the text: where every string and comment is, which
//: bracket each closer closes, and how deep every line sits.** Everything
//: this section does (the indent on Enter, the formatter, the bracket
//: diagnostics and their fixes) reads this one answer, so the three cannot
//: disagree about whether a `{` inside a string counts.
//:
//: Each line comes back with:
//:
//: - `startsIn`: `null` when it starts in code, else `"string"`,
//:   `"comment"`, `"preproc"` (the continuation of a C `#define`) or
//:   `"outside"` (HTML around a PHP block). Such a line is never re-indented,
//:   because its leading spaces are part of something else.
//: - `endsIn`: the same question asked at its end, which is what decides
//:   whether its trailing spaces are content.
//: - `level`: how many indent units deep it belongs, or `null` when
//:   `startsIn` says it is not code's to move.
//: - `code`: the line with every comment removed and every string reduced
//:   to its quotes, which is what the rules below match against.
//:
//: And `problems`: an unmatched or wrong closer, an opener never closed, a
//: string or a comment that never ends, each with its offset.
//:
//: **How deep a line is.** A frame's lines sit one unit in from the line
//: that opened it, however many brackets that line opened (`foo(bar, {`
//: indents its body once, not twice), and a line that starts by closing
//: frames sits where the line that opened the last of them sat. That is the
//: rule every editor's "increase indent after an opener" pattern
//: approximates, stated structurally, so it gives the same answer for a
//: line typed now and for the same line reformatted later. Three further
//: rules for statement languages: a `case` label and its body (indented
//: under a C, Java or JavaScript `switch`, flush under Go's and Swift's, as
//: their own formatters put them); the one statement under a brace-less
//: `if`, `for`, `while` or `else`; and a line that continues an expression
//: (the previous line ended on an operator, or this one starts with `.`,
//: `?`, `:`, `&&` or `||`), each one unit further in.
function docCodeScan(text, ext) {
  const profile = docCodeProfile(ext);
  const lines = [];
  const problems = [];
  if (!profile) return { lines: text.split("\n").map(() => ({ level: null })), problems, profile };
  const stack = [];
  const n = text.length;
  //: `mode` is what the scanner is inside: code, a string (`quote` says
  //: which), a block comment, a preprocessor line, or HTML outside `<?php`.
  let mode = profile.phpTags ? "outside" : "code";
  let quote = null;
  let quoteAt = 0;
  let commentAt = 0;
  let commentDepth = 0;
  let rawClose = "";
  let heredoc = null;
  //: The last significant code character and word, across lines, which is
  //: what tells a regex from a division in JavaScript.
  let lastSig = "";
  let lastWord = "";
  let prevCode = null;
  let i = 0;
  let lineNo = 0;

  const newLine = (from) => {
    const startsIn = mode === "code" ? null : mode;
    const line = {
      from, to: from, startsIn, endsIn: null, level: null, code: "",
      commentOpenLine: startsIn === "comment" ? commentOpenLine : null,
      preproc: startsIn === "preproc",
      pending: startsIn === null,
      lastPopped: null,
    };
    lines.push(line);
    return line;
  };
  let commentOpenLine = null;
  let line = newLine(0);

  const top = () => stack[stack.length - 1] || null;
  const labelRe = profile.caseStyle === "flush"
    ? /^(case\b[^\n]*|default\s*):\s*(\/\/.*)?$/
    : /^(case\b|default\s*:)/;
  const bracelessRe = /^(\}\s*)?(else\s+)?(if|for|foreach|while)\b.*\)$|^(\}\s*)?else$|^do$/;
  const endOpRe = /(?:[*/%=&|^?]|(?<!\+)\+|(?<!-)-)$/;
  const startOpRe = /^(\.(?!\.)|\?|:(?!:)|&&|\|\|)/;

  //: The level of the line in hand, decided at its first character that is
  //: not a leading closer: that is the first moment all of the above is
  //: known.
  const settle = (at) => {
    if (!line.pending) return;
    line.pending = false;
    const rest = text.slice(at, text.indexOf("\n", at) === -1 ? n : text.indexOf("\n", at));
    const t = top();
    if (line.lastPopped) {
      line.level = line.lastPopped.lineLevel;
      return;
    }
    let level = t ? t.inner : 0;
    if (profile.stmt) {
      const inBraces = !t || t.ch === "{";
      if (t && t.ch === "{" && profile.caseStyle && labelRe.test(rest)) {
        t.inCase = true;
        level += profile.caseStyle === "flush" ? -1 : 0;
      } else if (t && t.inCase) {
        level += profile.caseStyle === "flush" ? 0 : 1;
      }
      const sameFrame = prevCode && prevCode.frame === t;
      const prev = sameFrame ? prevCode.code.trim() : "";
      if (sameFrame && inBraces && bracelessRe.test(prev) && !rest.startsWith("{")) level += 1;
      else if (sameFrame && inBraces && endOpRe.test(prev)) level += 1;
      else if (startOpRe.test(rest)) level += 1;
    }
    line.level = Math.max(0, level);
  };

  const push = (ch, at, extra = {}) => {
    const level = line.level === null ? (top() ? top().inner : 0) : line.level;
    stack.push({ ch, at, line: lineNo, lineLevel: level, inner: level + 1, inCase: false, ...extra });
  };

  const close = (ch, at) => {
    const want = DOC_CODE_CLOSE[ch];
    let k = stack.length - 1;
    while (k >= 0 && stack[k].ch !== want) k -= 1;
    if (k < 0 || (k < stack.length - 1 && stack.length - 1 - k > 3)) {
      const t = top();
      problems.push({ kind: "stray", at, ch, expect: t ? DOC_CODE_OPEN[t.ch] : null, line: lineNo });
      return null;
    }
    while (stack.length - 1 > k) {
      const lost = stack.pop();
      problems.push({ kind: "unclosed", at: lost.at, ch: lost.ch, line: lost.line, before: at });
    }
    return stack.pop();
  };

  const startsWithAt = (s, at) => text.startsWith(s, at);

  while (i < n) {
    const ch = text[i];
    if (ch === "\n") {
      if (mode === "string" && !quote.multi) {
        problems.push({ kind: "string", at: quoteAt, ch: quote.open, line: lineNo });
        mode = "code";
      }
      if (mode === "preproc" && text[i - 1] !== "\\" && !(text[i - 1] === "\r" && text[i - 2] === "\\")) mode = "code";
      if (mode === "line") mode = "code";
      //: A heredoc's body starts on the line after its `<<EOF`, and is a
      //: string until a line that is just the word.
      if (heredoc && mode === "code") {
        mode = "string";
        quote = { open: "<<", close: "\n", multi: true, escape: false, heredoc };
        quoteAt = i;
        heredoc = null;
      }
      line.to = i;
      line.endsIn = mode === "code" ? null : mode;
      if (line.pending) {
        //: A blank line, or one that was nothing but closers.
        settle(i);
        line.blank = true;
      }
      if (line.code.trim() && !line.preproc) prevCode = { code: line.code, frame: top() };
      i += 1;
      lineNo += 1;
      line = newLine(i);
      continue;
    }
    if (mode === "outside") {
      if (startsWithAt("<?php", i) || startsWithAt("<?=", i) || startsWithAt("<?", i)) {
        mode = "code";
        i += startsWithAt("<?php", i) ? 5 : startsWithAt("<?=", i) ? 3 : 2;
        line.pending = false;
        continue;
      }
      i += 1;
      continue;
    }
    if (mode === "line") {
      i += 1;
      continue;
    }
    if (mode === "preproc") {
      i += 1;
      continue;
    }
    if (mode === "comment") {
      if (profile.nest && startsWithAt(profile.block[0], i)) {
        commentDepth += 1;
        i += profile.block[0].length;
        continue;
      }
      if (startsWithAt(profile.block[1], i)) {
        i += profile.block[1].length;
        commentDepth -= 1;
        if (commentDepth <= 0) mode = "code";
        continue;
      }
      i += 1;
      continue;
    }
    if (mode === "string") {
      if (quote.heredoc) {
        let end = text.indexOf("\n", i);
        if (end === -1) end = n;
        const body = text.slice(i, end);
        const word = body.indexOf(quote.heredoc);
        if (i === line.from && word !== -1 && body.trim().replace(/[;,)]+$/, "") === quote.heredoc) {
          mode = "code";
          i += word + quote.heredoc.length;
          lastSig = "0";
          continue;
        }
        i = end;
        continue;
      }
      if (rawClose) {
        if (startsWithAt(rawClose, i)) {
          i += rawClose.length;
          rawClose = "";
          mode = "code";
          line.code += '"';
          lastSig = "0";
          continue;
        }
        i += 1;
        continue;
      }
      if (quote.escape && ch === "\\") {
        i += 2;
        continue;
      }
      if (quote.template && ch === "$" && text[i + 1] === "{") {
        push("{", i, { template: quote });
        mode = "code";
        i += 2;
        lastSig = "{";
        continue;
      }
      if (startsWithAt(quote.close, i)) {
        if (quote.doubled && startsWithAt(quote.close, i + quote.close.length)) {
          i += quote.close.length * 2;
          continue;
        }
        i += quote.close.length;
        mode = "code";
        line.code += quote.close;
        lastSig = "0";
        continue;
      }
      i += 1;
      continue;
    }

    // --- code ---
    if (ch === " " || ch === "\t" || ch === "\r") {
      line.code += ch;
      i += 1;
      continue;
    }
    if (profile.phpTags && startsWithAt("?>", i)) {
      mode = "outside";
      i += 2;
      continue;
    }
    if (line.pending && profile.preproc && ch === "#") {
      line.pending = false;
      line.level = 0;
      line.preproc = true;
      mode = "preproc";
      i += 1;
      continue;
    }
    if (profile.block && startsWithAt(profile.block[0], i)) {
      mode = "comment";
      commentAt = i;
      commentDepth = 1;
      commentOpenLine = lineNo;
      i += profile.block[0].length;
      continue;
    }
    const lineComment = profile.line.find((tok) => startsWithAt(tok, i));
    if (lineComment && (!profile.hashAtWord || i === 0 || /\s/.test(text[i - 1]))) {
      mode = "line";
      line.commentAt = i;
      i += lineComment.length;
      continue;
    }
    if (line.pending && DOC_CODE_CLOSE[ch]) {
      const popped = close(ch, i);
      if (popped) line.lastPopped = popped;
      line.code += ch;
      lastSig = ch;
      if (popped && popped.template) {
        //: The `}` of a `${ }` goes back into the template string.
        quote = popped.template;
        mode = "string";
        quoteAt = i;
      }
      i += 1;
      continue;
    }
    settle(i);
    //: A C++ raw string, `R"delim( ... )delim"`, which may hold anything.
    if (profile.rawCpp && ch === "R" && text[i + 1] === '"' && !/[\w]/.test(text[i - 1] || "")) {
      const open = /^R"([^()\\\s]{0,16})\(/.exec(text.slice(i, i + 20));
      if (open) {
        rawClose = `)${open[1]}"`;
        mode = "string";
        quote = { open: '"', close: rawClose, multi: true, escape: false };
        quoteAt = i;
        line.code += '"';
        i += open[0].length;
        continue;
      }
    }
    //: Rust's raw strings (`r"…"`, `r#"…"#`) and its lifetimes and chars.
    if (profile.rustRaw && (ch === "r" || ch === "b") && !/[\w]/.test(text[i - 1] || "")) {
      const open = /^b?r(#*)"/.exec(text.slice(i, i + 20));
      if (open) {
        rawClose = `"${open[1]}`;
        mode = "string";
        quote = { open: '"', close: rawClose, multi: true, escape: false };
        quoteAt = i;
        line.code += '"';
        i += open[0].length;
        continue;
      }
    }
    if (profile.rustChars && ch === "'") {
      const lit = /^'(?:\\(?:u\{[0-9a-fA-F]{1,6}\}|x[0-9a-fA-F]{2}|.)|[^\\'\n])'/.exec(text.slice(i, i + 12));
      i += lit ? lit[0].length : 1;
      line.code += lit ? "''" : "'";
      lastSig = "0";
      continue;
    }
    if (profile.digitSep && ch === "'" && /[0-9A-Za-z]/.test(text[i - 1] || "") && /[0-9A-Fa-f]/.test(text[i + 1] || "")) {
      i += 1;
      continue;
    }
    //: C#'s verbatim strings, `@"…"`, where `""` is a quote and a line
    //: break is content.
    if (profile.verbatimCs && (startsWithAt('@"', i) || startsWithAt('$@"', i) || startsWithAt('@$"', i))) {
      const len = text[i] === "@" && text[i + 1] === '"' ? 2 : 3;
      mode = "string";
      quote = { open: '"', close: '"', multi: true, escape: false, doubled: true };
      quoteAt = i;
      line.code += '"';
      i += len;
      continue;
    }
    if (profile.heredoc && ch === "<") {
      const doc = profile.heredoc.exec(text.slice(i, i + 80));
      if (doc) {
        heredoc = doc[2];
        line.code += "<<";
        i += doc[0].length;
        continue;
      }
    }
    const opened = profile.quotes.find((qq) => startsWithAt(qq.open, i));
    if (opened) {
      mode = "string";
      quote = profile.template && opened.open === "`" ? { ...opened, template: true } : opened;
      quoteAt = i;
      line.code += opened.open;
      i += opened.open.length;
      continue;
    }
    //: A JavaScript regex literal, whose brackets and quotes are not code.
    //: A `/` is a regex where a value may start: after an operator, an
    //: opener, a comma, a keyword that takes a value, or at the start.
    if (profile.regex && ch === "/" && (!lastSig || "(,=:[!&|?{};+-*%<>~^".includes(lastSig) ||
      /^(return|typeof|case|do|else|in|of|new|delete|void|throw|yield|await)$/.test(lastWord))) {
      let j = i + 1;
      let inClass = false;
      let ok = false;
      while (j < n && text[j] !== "\n") {
        const c = text[j];
        if (c === "\\") {
          j += 2;
          continue;
        }
        if (c === "[") inClass = true;
        else if (c === "]") inClass = false;
        else if (c === "/" && !inClass) {
          ok = true;
          break;
        }
        j += 1;
      }
      if (ok) {
        j += 1;
        while (j < n && /[a-z]/i.test(text[j])) j += 1;
        line.code += "/r/";
        lastSig = "0";
        lastWord = "";
        i = j;
        continue;
      }
    }
    if (DOC_CODE_OPEN[ch]) {
      push(ch, i);
      line.code += ch;
      lastSig = ch;
      lastWord = "";
      i += 1;
      continue;
    }
    if (DOC_CODE_CLOSE[ch]) {
      const popped = close(ch, i);
      line.code += ch;
      lastSig = ch;
      lastWord = "";
      if (popped && popped.template) {
        quote = popped.template;
        mode = "string";
        quoteAt = i;
      }
      i += 1;
      continue;
    }
    const word = /^[A-Za-z_$][\w$]*/.exec(text.slice(i, i + 64));
    if (word) {
      line.code += word[0];
      lastSig = "a";
      lastWord = word[0];
      i += word[0].length;
      continue;
    }
    line.code += ch;
    lastSig = ch;
    lastWord = "";
    i += 1;
  }
  line.to = n;
  line.endsIn = mode === "code" ? null : mode;
  if (line.pending) {
    settle(n);
    line.blank = true;
  }
  if (mode === "string" && (quote.multi || rawClose)) {
    problems.push({ kind: "string", at: quoteAt, ch: quote.open, line: docCodeLineOf(text, quoteAt), eof: true });
  } else if (mode === "string") {
    problems.push({ kind: "string", at: quoteAt, ch: quote.open, line: lineNo });
  }
  if (mode === "comment") {
    problems.push({ kind: "comment", at: commentAt, ch: profile.block[0], line: docCodeLineOf(text, commentAt) });
  }
  while (stack.length) {
    const lost = stack.pop();
    problems.push({ kind: "unclosed", at: lost.at, ch: lost.ch, line: lost.line, before: n });
  }
  //: **One mistake, one report.** A string left open on its line swallows
  //: the `)` and `;` after it, so the `(` before it then reads as unclosed
  //: too: two underlines for one missing quote, and a second "fix" that
  //: would add a bracket the code never lacked. The string is the cause, so
  //: a bracket opened earlier on the same line is not reported beside it.
  const open = problems.filter((p) => p.kind === "string");
  const kept = problems.filter((p) => !(p.kind === "unclosed" && open.some((s) => s.line === p.line && p.at < s.at)));
  kept.sort((a, b) => a.at - b.at);
  return { lines, problems: kept, profile };
}

//: The 0-based line an offset is on.
function docCodeLineOf(text, at) {
  let count = 0;
  for (let k = text.indexOf("\n"); k !== -1 && k < at; k = text.indexOf("\n", k + 1)) count += 1;
  return count;
}

//: **How deep a new line belongs, for Enter and for a typed closer.**
//: `before` is everything above the line, `lineText` the text that will be
//: on it; `null` means the line is inside a string or a comment and is not
//: this function's to place, which hands the choice back to the editor
//: (it keeps the line above's indent, which is what a comment wants).
function docCodeIndentLevel(before, lineText, ext) {
  const joined = before && !before.endsWith("\n") ? `${before}\n${lineText}` : `${before}${lineText}`;
  const scan = docCodeScan(joined, ext);
  const last = scan.lines[scan.lines.length - 1];
  return last ? last.level : null;
}

//: The file types whose indentation is the brackets' business, so the
//: formatter re-indents them. Everything else with a profile has its
//: whitespace tidied and its indentation left exactly as written: Python's
//: and YAML's indentation *is* their syntax, and shell, SQL, Ruby, TOML and
//: INI have no bracket structure an indent could be derived from.
const DOC_FORMAT_REINDENT = new Set(["c", "cpp", "cs", "java", "kt", "go", "rs", "swift", "php", "js", "ts", "css", "r"]);

//: What a scanner problem says, in words, for a toast or an underline.
function docCodeProblemMessage(problem) {
  const q = (ch) => `“${ch}”`;
  switch (problem.kind) {
    case "unclosed": return `This ${q(problem.ch)} is never closed`;
    case "stray":
      return problem.expect
        ? `Expected ${q(problem.expect)} here, found ${q(problem.ch)}`
        : `Nothing is open for this ${q(problem.ch)} to close`;
    case "string": return "This string is never closed";
    case "comment": return "This comment is never closed";
    default: return "This does not parse";
  }
}

//: **Format: the brackets decide the indentation, and nothing else moves.**
//: `unit` is the file type's indent (four spaces, two, or a tab). `range`,
//: when given, is the first and last 0-based line to touch, which is how
//: "format the selection" is the same function as "format the document".
//:
//: What it does to each line, and only this:
//:
//: - a code line gets `level` units of indent in place of whatever it had
//:   (for the types in `DOC_FORMAT_REINDENT`);
//: - trailing spaces and tabs go, unless the line ends inside a string,
//:   where they are the string's, or ends in a backslash, where removing
//:   them would turn the next line into a continuation;
//: - a line that is only whitespace becomes empty;
//: - a line inside a block comment moves by exactly as much as the line the
//:   comment opened on, so a ` * ` column stays under its `/*`;
//: - a line inside a string (a template literal, a heredoc, a raw string)
//:   is not touched at all, not its indent and not its end;
//: - the document ends in exactly one line break (whole-document only).
//:
//: It never adds, removes or reorders a token, which is the whole of what
//: "conservative" means here, and it refuses outright when the brackets or
//: strings do not balance, because a re-indent computed from a structure
//: that is not there would scatter the text rather than tidy it.
function docFormatCodeText(text, ext, unit, range = null) {
  const scan = docCodeScan(text, ext);
  if (!scan.profile) return { error: `There is no formatter for .${ext} files yet.` };
  if (scan.problems.length) {
    //: The cause before its consequences: an open string or comment
    //: explains the brackets after it, not the other way round.
    const first = scan.problems.find((p) => p.kind === "string" || p.kind === "comment") ||
      scan.problems.find((p) => p.kind === "stray") || scan.problems[0];
    return { error: `Not formatted: line ${first.line + 1}, ${docCodeProblemMessage(first).toLowerCase()}.`, problem: first };
  }
  const reindent = DOC_FORMAT_REINDENT.has(ext);
  const lines = text.split("\n");
  const from = range ? Math.max(0, range[0]) : 0;
  const to = range ? Math.min(lines.length - 1, range[1]) : lines.length - 1;
  const oldLead = [];
  const newLead = [];
  const keep = ext === "yaml" ? docYamlBlockLines(lines) : null;
  const out = lines.map((raw, k) => {
    const info = scan.lines[k] || { level: null, startsIn: null, endsIn: null };
    if (keep && keep.has(k)) return raw;
    const lead = /^[ \t]*/.exec(raw)[0];
    oldLead[k] = lead;
    newLead[k] = lead;
    if (k < from || k > to) return raw;
    let head = lead;
    let body = raw.slice(lead.length);
    if (info.startsIn === "string") {
      //: The string's line: its start is content, whatever it looks like.
      head = "";
      body = raw;
    } else if (info.startsIn === "comment") {
      const open = info.commentOpenLine;
      if (open !== null && open !== undefined && oldLead[open] !== newLead[open] && lead.startsWith(oldLead[open])) {
        head = newLead[open] + lead.slice(oldLead[open].length);
      }
    } else if (reindent && info.level !== null && info.startsIn === null) {
      head = unit.repeat(info.level);
    }
    if (info.endsIn !== "string") {
      const trimmed = body.replace(/[ \t]+$/, "");
      if (!trimmed.endsWith("\\")) body = trimmed;
    }
    if (!body) head = "";
    newLead[k] = info.startsIn === "string" ? lead : head;
    return head + body;
  });
  let result = out.join("\n");
  if (!range || to === lines.length - 1) {
    if (!range) result = result.replace(/\n*$/, "") + (result.trim() ? "\n" : "");
  }
  return { text: result, changed: result !== text };
}

//: HTML's elements that never hold anything, the ones whose end tag may be
//: left out (a `<li>` ends at the next `<li>`), and the ones whose text is
//: not markup at all.
const DOC_HTML_VOID = new Set(["area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta",
  "param", "source", "track", "wbr"]);
const DOC_HTML_OPTIONAL = new Set(["li", "dt", "dd", "p", "tr", "td", "th", "option", "optgroup", "thead",
  "tbody", "tfoot", "colgroup", "caption", "rt", "rp", "html", "head", "body"]);
const DOC_HTML_RAW = new Set(["script", "style", "textarea", "pre", "title"]);
//: Opening one of these closes the element on the left of each pair, as a
//: browser's parser does, so a list written without `</li>` still nests.
const DOC_HTML_IMPLIED = {
  li: ["li"], dt: ["dt", "dd"], dd: ["dt", "dd"], tr: ["tr", "td", "th"], td: ["td", "th"], th: ["td", "th"],
  option: ["option"], optgroup: ["optgroup", "option"], thead: ["tbody", "tfoot", "tr", "td", "th"],
  tbody: ["thead", "tbody", "tr", "td", "th"], tfoot: ["thead", "tbody", "tr", "td", "th"],
};
const DOC_HTML_BLOCK = new Set(["address", "article", "aside", "blockquote", "div", "dl", "fieldset", "footer",
  "form", "h1", "h2", "h3", "h4", "h5", "h6", "header", "hr", "main", "nav", "ol", "p", "pre", "section",
  "table", "ul", "figure", "details"]);

//: **HTML and XML, indented by their elements.** The same contract as
//: `docFormatCodeText` (only whitespace moves, the refusal when the
//: structure does not balance), with elements where the other has brackets:
//: a line sits one unit inside the element that holds it, a line that
//: starts by closing an element sits where that element opened. A line
//: that starts inside a comment, a tag whose attributes run across lines,
//: or the text of a `<pre>`, `<script>`, `<style>` or `<textarea>` is not
//: touched, because its leading spaces are part of what it is.
function docFormatMarkupText(text, ext, unit, range = null) {
  const html = ext === "html";
  const lines = text.split("\n");
  const levels = [];
  const verbatim = [];
  //: Whether a line *ends* inside something whose spaces are content (a
  //: `<pre>`, a comment, an attribute value), so its trailing spaces stay.
  const endsInside = [];
  //: For a line inside a comment or a script, the line whose move it follows.
  const shiftWith = [];
  let shiftFrom = -1;
  const stack = [];
  let tagInHand = null;
  let mode = "text";
  let rawEnd = "";
  let i = 0;
  let lineNo = 0;
  let pending = true;
  let lastPopped = null;
  let lineLevel = 0;
  const fail = (message) => ({ error: `Not formatted: line ${lineNo + 1}, ${message}.` });
  const settle = () => {
    if (!pending) return;
    pending = false;
    lineLevel = lastPopped ? lastPopped.lineLevel : stack.length ? stack[stack.length - 1].inner : 0;
    levels[lineNo] = lineLevel;
  };
  const popTo = (name) => {
    let k = stack.length - 1;
    while (k >= 0 && stack[k].name !== name) {
      if (!html || !DOC_HTML_OPTIONAL.has(stack[k].name)) return null;
      k -= 1;
    }
    if (k < 0) return null;
    const frame = stack[k];
    stack.length = k;
    return frame;
  };
  verbatim[0] = false;
  while (i < text.length) {
    const ch = text[i];
    if (ch === "\n") {
      if (pending) settle();
      endsInside[lineNo] = mode !== "text";
      i += 1;
      lineNo += 1;
      pending = mode === "text";
      lastPopped = null;
      verbatim[lineNo] = mode !== "text";
      shiftWith[lineNo] = mode === "comment" || mode === "tag" || (mode === "raw" && shiftFrom >= 0) ? shiftFrom : -1;
      //: A `</script>` or `</style>` that starts its line is markup again,
      //: and lines up with its `<script>` like any other end tag.
      if (mode === "raw" && shiftFrom >= 0 && text.slice(i, i + 200).trimStart().toLowerCase().startsWith(rawEnd)) {
        verbatim[lineNo] = false;
        shiftWith[lineNo] = -1;
        pending = true;
      }
      continue;
    }
    if (mode === "comment") {
      if (text.startsWith("-->", i)) {
        mode = "text";
        i += 3;
      } else i += 1;
      continue;
    }
    if (mode === "cdata") {
      if (text.startsWith("]]>", i)) {
        mode = "text";
        i += 3;
      } else i += 1;
      continue;
    }
    if (mode === "raw") {
      if (text.slice(i, i + rawEnd.length).toLowerCase() === rawEnd) {
        mode = "text";
        continue;
      }
      i += 1;
      continue;
    }
    if (mode === "tag") {
      //: Inside `<name …>`: quotes may hold a `>`.
      if (ch === '"' || ch === "'") {
        const close = text.indexOf(ch, i + 1);
        if (close === -1) return fail("an attribute's quote is never closed");
        //: A value that runs across lines: those lines are the value's.
        const crossed = (text.slice(i, close).match(/\n/g) || []).length;
        for (let k = 1; k <= crossed; k += 1) {
          verbatim[lineNo + k] = true;
          endsInside[lineNo + k - 1] = true;
        }
        lineNo += crossed;
        i = close + 1;
        continue;
      }
      if (ch === ">") {
        mode = "text";
        const tag = tagInHand;
        tagInHand = null;
        const selfClosed = text[i - 1] === "/";
        i += 1;
        if (tag && !selfClosed && !(html && DOC_HTML_VOID.has(tag.name))) {
          stack.push(tag);
          if (html && DOC_HTML_RAW.has(tag.name)) {
            mode = "raw";
            rawEnd = `</${tag.name}`;
            //: A script's or a style's lines move with their tag; a
            //: `<pre>`'s and a `<textarea>`'s spaces are their text.
            shiftFrom = tag.name === "script" || tag.name === "style" ? lineNo : -1;
          }
        }
        continue;
      }
      i += 1;
      continue;
    }
    // --- text ---
    if (ch === " " || ch === "\t" || ch === "\r") {
      i += 1;
      continue;
    }
    if (text.startsWith("<!--", i)) {
      settle();
      mode = "comment";
      shiftFrom = lineNo;
      i += 4;
      continue;
    }
    if (text.startsWith("<![CDATA[", i)) {
      settle();
      mode = "cdata";
      i += 9;
      continue;
    }
    if (text.startsWith("<!", i) || text.startsWith("<?", i)) {
      settle();
      const end = text.indexOf(">", i);
      if (end === -1) return fail("a declaration is never closed");
      i = end + 1;
      continue;
    }
    const close = /^<\/([A-Za-z][\w:.-]*)\s*>/.exec(text.slice(i, i + 200));
    if (close) {
      const name = html ? close[1].toLowerCase() : close[1];
      const frame = popTo(name);
      if (!frame) return fail(`nothing is open for “</${close[1]}>” to close`);
      if (pending) lastPopped = frame;
      i += close[0].length;
      continue;
    }
    const open = /^<([A-Za-z][\w:.-]*)/.exec(text.slice(i, i + 200));
    if (open) {
      const name = html ? open[1].toLowerCase() : open[1];
      if (html) {
        //: What a browser closes for you before this element opens.
        const implied = DOC_HTML_IMPLIED[name] || [];
        while (stack.length && (implied.includes(stack[stack.length - 1].name) ||
          (DOC_HTML_BLOCK.has(name) && stack[stack.length - 1].name === "p"))) {
          const frame = stack.pop();
          if (pending) lastPopped = frame;
        }
      }
      settle();
      tagInHand = { name, lineLevel, inner: lineLevel + 1 };
      shiftFrom = lineNo;
      mode = "tag";
      i += open[0].length;
      continue;
    }
    settle();
    i += 1;
  }
  if (pending) settle();
  endsInside[lineNo] = mode !== "text";
  if (mode === "tag") return fail("a tag is never closed");
  if (mode === "comment") return fail("a comment is never closed");
  const left = stack.filter((frame) => !(html && DOC_HTML_OPTIONAL.has(frame.name)));
  if (left.length) {
    return { error: `Not formatted: “<${left[left.length - 1].name}>” is never closed.` };
  }
  const from = range ? Math.max(0, range[0]) : 0;
  const to = range ? Math.min(lines.length - 1, range[1]) : lines.length - 1;
  const oldLead = [];
  const newLead = [];
  const out = lines.map((raw, k) => {
    const lead = /^[ \t]*/.exec(raw)[0];
    oldLead[k] = lead;
    newLead[k] = lead;
    if (k < from || k > to) return raw;
    if (verbatim[k]) {
      const open = shiftWith[k];
      if (open >= 0 && oldLead[open] !== newLead[open] && lead.startsWith(oldLead[open]) && raw.trim()) {
        newLead[k] = newLead[open] + lead.slice(oldLead[open].length);
        return newLead[k] + raw.slice(lead.length);
      }
      return raw;
    }
    const body = endsInside[k] ? raw.replace(/^[ \t]+/, "") : raw.trim();
    newLead[k] = body ? unit.repeat(levels[k] || 0) : "";
    return newLead[k] + body;
  });
  let result = out.join("\n");
  if (!range) result = result.replace(/\n*$/, "") + (result.trim() ? "\n" : "");
  return { text: result, changed: result !== text };
}

//: The lines of a YAML block scalar (`key: |`, `- >-`): every line more
//: indented than its key, blank ones included, is the value's text, and a
//: `|` value keeps its trailing spaces, so none of it is touched.
function docYamlBlockLines(lines) {
  const keep = new Set();
  let owner = -1;
  lines.forEach((raw, k) => {
    const indent = /^ */.exec(raw)[0].length;
    if (owner >= 0) {
      if (!raw.trim() || indent > owner) {
        keep.add(k);
        return;
      }
      owner = -1;
    }
    if (/(^|[:-])\s*[|>][+-]?\d*[+-]?\s*(#.*)?$/.test(raw)) owner = indent;
  });
  return keep;
}

//: **JSON, re-printed from its own tokens rather than from `JSON.parse`.**
//: Parsing and stringifying would be shorter and would quietly change the
//: data: a number past 2^53 loses digits (`12345678901234567890` comes back
//: as `12345678901234567000`), `1.0` becomes `1`, `1e5` becomes `100000`, a
//: repeated key loses all but its last value, and `é` becomes `é`.
//: This keeps every token exactly as written and only decides the space
//: between them, in `JSON.stringify`'s layout. `JSON.parse` still runs
//: first, as the gate: a text that is not JSON is refused, not guessed at.
//: `base` is prepended to every line after the first, which is how a
//: selection nested inside a larger document keeps its place.
function docFormatJsonText(text, unit, base = "", whole = true) {
  const body = text.trim();
  if (!body) return { text, changed: false };
  try {
    JSON.parse(body);
  } catch {
    const found = docJsonErrorAt(body);
    const line = found ? docCodeLineOf(body, found.at) + 1 : null;
    return { error: `Not formatted: ${found ? `line ${line}, ${found.message.toLowerCase()}` : "this is not valid JSON"}.` };
  }
  const tokens = [];
  for (let i = 0; i < body.length;) {
    const ch = body[i];
    if (" \t\n\r".includes(ch)) {
      i += 1;
    } else if (ch === '"') {
      let j = i + 1;
      while (j < body.length && body[j] !== '"') j += body[j] === "\\" ? 2 : 1;
      tokens.push(body.slice(i, j + 1));
      i = j + 1;
    } else if ("{}[],:".includes(ch)) {
      tokens.push(ch);
      i += 1;
    } else {
      const word = /^[^\s{}[\],:"]+/.exec(body.slice(i))[0];
      tokens.push(word);
      i += word.length;
    }
  }
  let out = "";
  let depth = 0;
  const pad = () => `\n${base}${unit.repeat(depth)}`;
  for (let k = 0; k < tokens.length; k += 1) {
    const t = tokens[k];
    if (t === "{" || t === "[") {
      const shut = t === "{" ? "}" : "]";
      if (tokens[k + 1] === shut) {
        out += t + shut;
        k += 1;
        continue;
      }
      depth += 1;
      out += t + pad();
    } else if (t === "}" || t === "]") {
      depth -= 1;
      out += pad() + t;
    } else if (t === ",") {
      out += `,${pad()}`;
    } else if (t === ":") {
      out += ": ";
    } else {
      out += t;
    }
  }
  //: The whole document ends in one line break; a selection keeps the space
  //: it had around it, so the lines on either side do not move.
  const final = whole ? `${out}\n` : `${/^\s*/.exec(text)[0]}${out}${/\s*$/.exec(text)[0]}`;
  return { text: final, changed: final !== text };
}

//: **The quick fixes, as edits on the text.** Each problem the checks find
//: comes back as a diagnostic with the fixes that are certain enough to
//: offer: a fix here is a small, mechanical edit whose result can be stated
//: before it is made ("add the missing `}`"), never a guess at what the code
//: meant. Every fix is a list of `{from, to, insert}` against the text it
//: was computed from, so the editor recomputes them against the text at the
//: moment one is chosen rather than applying offsets that have gone stale.
//:
//: `key` names the problem so the editor can find the same one again after
//: the text has moved.

//: Where a missing closer goes on a line: before the run of `;` and `{` the
//: line ends with, and before its trailing comment, so `foo(a;` becomes
//: `foo(a);` and `if (x > 1 {` becomes `if (x > 1) {`.
function docCodeInsertPoint(text, info, floor) {
  let end = info.commentAt !== undefined ? info.commentAt : info.to;
  while (end > info.from && /[ \t]/.test(text[end - 1])) end -= 1;
  let at = end;
  while (at > info.from && /[;{ \t]/.test(text[at - 1])) at -= 1;
  if (at <= floor) at = end;
  return at;
}

function docCodeFixes(text, ext, unit) {
  const scan = docCodeScan(text, ext);
  const out = [];
  const q = (ch) => `“${ch}”`;
  for (const p of scan.problems.slice(0, 50)) {
    const info = scan.lines[p.line];
    const diag = {
      from: p.at,
      to: p.at + (p.ch ? p.ch.length : 1),
      severity: "error",
      message: docCodeProblemMessage(p),
      key: `${p.kind}:${p.ch}`,
      fixes: [],
    };
    if (p.kind === "stray") {
      if (p.expect) {
        diag.fixes.push({ name: `Change it to ${q(p.expect)}`, edits: [{ from: p.at, to: p.at + 1, insert: p.expect }] });
      }
      diag.fixes.push({ name: `Remove this ${q(p.ch)}`, edits: [{ from: p.at, to: p.at + 1, insert: "" }] });
    } else if (p.kind === "unclosed") {
      const shut = DOC_CODE_OPEN[p.ch];
      const level = info.level !== null ? info.level : 0;
      const rest = text.slice(p.at + 1, info.commentAt !== undefined ? info.commentAt : info.to);
      let edit;
      if (p.ch !== "{" && /\{[ \t]*$/.test(rest)) {
        //: `if (x > 1 {`: the bracket closes where the block opens.
        const at = docCodeInsertPoint(text, info, p.at);
        edit = { from: at, to: at, insert: shut };
      } else {
        //: Otherwise after the last code before whatever gave it away: the
        //: closer that closed its parent, or the end of the file. A brace
        //: gets a line of its own at the opener's indent; a bracket that
        //: spans lines does too; a parenthesis closes inline, before the
        //: `;` its statement ends with.
        const end = docCodeLastCodeBefore(scan, text, p.before, p.line, p.at);
        const multi = docCodeLineOf(text, end) > p.line;
        if (p.ch === "{" || (p.ch === "[" && multi)) {
          edit = { from: end, to: end, insert: `\n${unit.repeat(level)}${shut}` };
        } else {
          let at = end;
          while (at > p.at + 1 && /[;{ \t]/.test(text[at - 1])) at -= 1;
          edit = { from: at, to: at, insert: shut };
        }
      }
      diag.fixes.push({ name: `Add the missing ${q(shut)}`, edits: [edit] });
    } else if (p.kind === "string" && !p.eof) {
      const at = docCodeInsertPointForString(text, info, p.at);
      diag.fixes.push({ name: "Close the string", edits: [{ from: at, to: at, insert: p.ch }] });
    } else if (p.kind === "comment") {
      const end = text.replace(/\s+$/, "").length;
      diag.fixes.push({ name: "Close the comment", edits: [{ from: end, to: end, insert: ` ${scan.profile.block[1]}` }] });
    }
    out.push(diag);
  }
  return out;
}

//: The offset just after the last code at or before `before`, looking no
//: higher than line `minLine` and no earlier than the opener at `floor`.
//: Comments and blank lines are stepped over, so a fix never lands inside a
//: `// note` at the end of the line it belongs on.
function docCodeLastCodeBefore(scan, text, before, minLine, floor) {
  for (let k = docCodeLineOf(text, before); k >= minLine; k -= 1) {
    const info = scan.lines[k];
    if (!info || (info.startsIn && k !== minLine)) continue;
    let end = info.commentAt !== undefined ? info.commentAt : info.to;
    if (before < end) end = before;
    const start = k === minLine ? floor + 1 : info.from;
    while (end > start && /[ \t]/.test(text[end - 1])) end -= 1;
    if (end > start) return end;
  }
  return floor + 1;
}

//: A string left open on its line closes before the `);` or `;` the line
//: ends with, which is where it was meant to end in every case that is not
//: a string with a bracket inside it: `printf("hi);` becomes
//: `printf("hi");`.
function docCodeInsertPointForString(text, info, openAt) {
  let end = info.to;
  while (end > openAt + 1 && /[ \t]/.test(text[end - 1])) end -= 1;
  let at = end;
  while (at > openAt + 1 && /[;,)\] \t]/.test(text[at - 1])) at -= 1;
  return at;
}

//: The JSON checker's own messages, with the fixes that follow from each.
//: `found` is `docJsonErrorAt`'s answer for the text.
function docJsonFixes(text, found, unit) {
  const fixes = [];
  if (!found) return fixes;
  const at = found.at;
  const back = (from) => {
    let k = from;
    while (k > 0 && " \t\n\r".includes(text[k - 1])) k -= 1;
    return k;
  };
  if (found.message === "A comma with nothing after it") {
    const comma = back(at) - 1;
    if (text[comma] === ",") fixes.push({ name: "Remove the trailing comma", edits: [{ from: comma, to: comma + 1, insert: "" }] });
  } else if (/^Expected a comma/.test(found.message) && at < text.length && /["{[\-0-9tfn]/.test(text[at])) {
    const end = back(at);
    fixes.push({ name: "Add the missing comma", edits: [{ from: end, to: end, insert: "," }] });
  } else if (found.message === "Expected a property name in double quotes") {
    const single = /^'([^'"\\\n]*)'/.exec(text.slice(at));
    const bare = /^([A-Za-z_$][\w$]*)(?=\s*:)/.exec(text.slice(at));
    if (single) {
      fixes.push({ name: "Use double quotes", edits: [{ from: at, to: at + single[0].length, insert: `"${single[1]}"` }] });
    } else if (bare) {
      fixes.push({ name: "Put the name in double quotes", edits: [{ from: at, to: at + bare[0].length, insert: `"${bare[1]}"` }] });
    }
  } else if (found.message === "Expected a value" && text[at] === "'") {
    const single = /^'([^'"\\\n]*)'/.exec(text.slice(at));
    if (single) fixes.push({ name: "Use double quotes", edits: [{ from: at, to: at + single[0].length, insert: `"${single[1]}"` }] });
  }
  //: At the end of the text with brackets still open: close them all, each
  //: on its own line, innermost first.
  if (at >= text.trimEnd().length) {
    const scan = docCodeScan(text, "json");
    const open = scan.problems.filter((p) => p.kind === "unclosed").sort((a, b) => b.at - a.at);
    if (open.length && !scan.problems.some((p) => p.kind !== "unclosed")) {
      let end = text.trimEnd().length;
      let insert = "";
      if (text[end - 1] === ",") {
        end -= 1;
        insert = "";
      }
      const from = end;
      for (const p of open) {
        const level = Math.max(0, (scan.lines[p.line] && scan.lines[p.line].level) || 0);
        insert += `\n${unit.repeat(level)}${DOC_CODE_OPEN[p.ch]}`;
      }
      fixes.push({ name: "Close what is still open", edits: [{ from, to: text.trimEnd().length, insert }] });
    }
  }
  return fixes;
}

//: **Python's missing colon.** The compiler says "expected ':'" and points
//: at the line; the fix is the colon, at the end of the line's code and
//: before any comment, and only on a line that opens a block.
function docPythonColonFix(text, lineNo) {
  const lines = text.split("\n");
  const raw = lines[lineNo - 1];
  if (raw === undefined) return null;
  const head = /^\s*(async\s+)?(def|class|if|elif|else|for|while|try|except|finally|with|match|case)\b/;
  if (!head.test(raw)) return null;
  const scan = docCodeScan(raw, "py");
  const info = scan.lines[0];
  let end = info.commentAt !== undefined ? info.commentAt : raw.length;
  while (end > 0 && /[ \t]/.test(raw[end - 1])) end -= 1;
  if (raw[end - 1] === ":") return null;
  let from = 0;
  for (let k = 0; k < lineNo - 1; k += 1) from += lines[k].length + 1;
  return { name: "Add the missing colon", edits: [{ from: from + end, to: from + end, insert: ":" }] };
}

//: **Indentation that mixes tabs and spaces**, reported only where the file
//: really is mixed: a line whose indent holds the character the rest of the
//: file does not use. A file indented wholly with tabs is somebody's
//: choice, not a mistake, and is left alone. Offered for every code type,
//: as a note rather than an error, with the conversion of this line and of
//: every line as its two fixes. `tabWidth` is how many columns a tab counts
//: for when it becomes spaces.
function docIndentMixFixes(text, unit, tabWidth, ext = null) {
  const lines = text.split("\n");
  const wantTabs = unit === "\t";
  const leads = lines.map((l) => /^[ \t]*/.exec(l)[0]);
  //: A line inside a string or a comment is somebody's content.
  const scan = ext ? docCodeScan(text, ext) : null;
  const content = (k) => Boolean(scan && scan.lines[k] && scan.lines[k].startsIn);
  const good = leads.some((lead, k) => lead && !content(k) && !lead.includes(wantTabs ? " " : "\t"));
  if (!good) return [];
  const convert = (lead) => {
    let cols = 0;
    for (const ch of lead) cols = ch === "\t" ? cols + tabWidth - (cols % tabWidth) : cols + 1;
    return wantTabs ? "\t".repeat(Math.floor(cols / tabWidth)) + " ".repeat(cols % tabWidth) : " ".repeat(cols);
  };
  const bad = [];
  let at = 0;
  lines.forEach((line, k) => {
    const lead = leads[k];
    //: In a tab-indented file, spaces *after* the tabs are alignment (Go's
    //: own formatter writes them); spaces before a tab, or a whole indent of
    //: spaces, are the mix.
    const wrong = wantTabs
      ? / \t/.test(lead) || (/^ +$/.test(lead) && lead.length >= tabWidth)
      : lead.includes("\t");
    if (wrong && line.trim() && !content(k)) bad.push({ from: at, to: at + lead.length, lead });
    at += line.length + 1;
  });
  const all = bad.map((b) => ({ from: b.from, to: b.to, insert: convert(b.lead) }));
  const word = wantTabs ? "tabs" : "spaces";
  return bad.slice(0, 50).map((b) => ({
    from: b.from,
    to: Math.max(b.to, b.from + 1),
    severity: "info",
    message: wantTabs
      ? "Indented with spaces, where the rest of the file uses tabs"
      : "Indented with tabs, where the rest of the file uses spaces",
    key: "indent-mix",
    fixes: [
      { name: `Convert this line to ${word}`, edits: [{ from: b.from, to: b.to, insert: convert(b.lead) }] },
      ...(bad.length > 1 ? [{ name: `Convert every line to ${word}`, edits: all }] : []),
    ],
  }));
}
// DOC-CODE-END

// --- the editor half: pairs, Enter and the indent unit ----------------------
//
// **Pairs.** CodeMirror's own `closeBrackets`, which the bundle has always
// carried and this editor never mounted: typing `"` gives `""` with the caret
// between, `(` `[` `{` likewise, typing the closer it inserted steps over it,
// Backspace between an empty pair takes both, and a pair typed over a
// selection wraps it. Which characters pair is the language's own answer:
// the JavaScript, TypeScript, Python, CSS and HTML packages each declare
// theirs (backticks, triple quotes, string prefixes); for the rest this says,
// through the same language-data facet, so a Rust lifetime `'a` is not closed
// into `'a'` and Go's raw-string backtick is.
//
// **Enter.** The same packages indent from their grammars. The other
// seventeen types have a line-at-a-time highlighter, or nothing, and
// CodeMirror's fallback is "copy the line above's indent", which is why
// `{` then Enter in a C file gave `{`, a blank line at the same depth, and
// `}` beside the caret. `docCodeIndentAt` answers from the structure scan
// instead, so the three-line split every code editor does (`{`, the caret
// one unit in, `}` back at the opener's depth) happens for every code type,
// and a typed `}` snaps back to its opener through `indentOnInput`.
//
// **Tab** is unchanged, on purpose: `indentDocSelection` already indents the
// caret or the selected lines by the file type's own unit and Shift+Tab takes
// it back, in code and prose alike, with Escape then Tab as the way out of
// the editor (`docTabEscapes`). The unit below is that same `type.indent`, so
// Enter, Tab and the formatter all indent by one amount.

//: The types whose indentation this file answers, because the bundle has no
//: grammar for them that could: every code type except the five with Lezer
//: grammars (and YAML and JSON, whose packages indent) and Ruby and XML,
//: whose legacy modes do indent by their own keywords and tags.
const DOC_CODE_INDENT_OWN = new Set(["c", "cpp", "cs", "java", "kt", "go", "rs", "swift", "php", "r", "sql",
  "bash", "toml", "ini"]);

//: The packages that bring their own pairs and their own indent-on-input.
const DOC_CODE_NATIVE = new Set(["js", "ts", "py", "css", "html"]);

//: What auto-closes, for the types whose package does not say. A single
//: quote is a lifetime in Rust and not a string in Swift; a backtick is a raw
//: string in Go, a command in shell and an identifier in SQL and R.
function docCodePairs(ext) {
  if (ext === "rs" || ext === "swift") return ["(", "[", "{", '"'];
  if (ext === "json") return ["[", "{", '"'];
  if (["go", "bash", "sql", "r", "rb"].includes(ext)) return ["(", "[", "{", "'", '"', "`"];
  return ["(", "[", "{", "'", '"'];
}

//: The indent service. Asked for a line's indent in columns; answers from the
//: structure scan for the types above and passes (undefined) for the rest, so
//: a grammar that knows better is never overruled. `null` means "inside a
//: string or a comment", where the editor then keeps the line above's indent.
function docCodeIndentAt(cx, pos) {
  const ext = docFileType().ext;
  if (!DOC_CODE_INDENT_OWN.has(ext) || docView === "plain") return undefined;
  const doc = cx.state.doc;
  //: The scan is linear, measured at a few milliseconds for a long file;
  //: past the checker's own cap it is not worth a keystroke.
  if (doc.length > DOC_CHECK_MAX_CHARS) return undefined;
  const level = docCodeIndentLevel(doc.sliceString(0, pos), cx.textAfterPos(pos, 1), ext);
  if (level === null || level === undefined) return null;
  return level * cx.unit;
}

//: Pairs, Enter and the unit, for the open code document. Part of
//: `docCodeTools`, so it is in the same compartment and follows the file
//: type and Plain the same way the diagnostics do.
function docCodeEditing(CM, type) {
  const ext = type.ext;
  const parts = [
    CM.language.indentUnit.of(type.indent || "  "),
    CM.autocomplete.closeBrackets(),
    CM.view.keymap.of([
      ...CM.autocomplete.closeBracketsKeymap,
      //: VS Code's chord for Format Document, which formats the selection
      //: when there is one, as the dock's button does.
      { key: "Shift-Alt-f", run: () => { docFormatCode("auto"); return true; } },
      //: VS Code's word-wrap toggle (INBOX 402); free in the registry.
      { key: "Alt-z", run: () => { docToggleCodeDraw("codeWrap"); return true; } },
      //: The quick fixes at the caret, on the prose menu's own chord, and the
      //: problems one at a time on the prose findings' own keys.
      { key: "Alt-Enter", run: () => docOpenCodeFixes() },
      { key: "F8", run: CM.lint.nextDiagnostic },
      { key: "Shift-F8", run: CM.lint.previousDiagnostic },
    ]),
  ];
  if (!DOC_CODE_NATIVE.has(ext)) {
    const data = [{ closeBrackets: { brackets: docCodePairs(ext) }, indentOnInput: /^\s*[}\])]$/ }];
    parts.push(CM.state.EditorState.languageData.of(() => data));
  }
  if (DOC_CODE_INDENT_OWN.has(ext)) parts.push(CM.language.indentService.of(docCodeIndentAt));
  return parts;
}

// --- Format: the dock button, Shift+Alt+F and the palette -------------------
//
// One command with two scopes, VS Code's: with text selected it formats the
// lines the selection touches, with nothing selected the whole document. The
// dock's Format button, Shift+Alt+F and the palette's row all call
// `docFormatCode`, and the Alt+Enter menu offers both scopes by name.
//
// **Refused before it is attempted** wherever the file does not parse,
// because the layout is computed from structure and a structure that is not
// there gives a layout that scatters the text: the Lezer tree's errors for
// JavaScript, TypeScript and CSS, the server's own check for Python, TOML and
// YAML (the same `POST /documents/check-syntax` the underline uses, so no new
// endpoint), `JSON.parse` for JSON, and the scan's own balance for the rest.
// A refusal says which line and why, in a toast, and changes nothing.
//
// **One undo step.** The result goes in as one transaction, isolated in the
// history, and only the lines that changed are touched, so the caret and the
// scroll position stay where they were.

//: Whether a JavaScript file's tree holds JSX. The structure scan reads
//: JSX's text as code (an apostrophe in `<p>Don't</p>` would open a
//: string), so neither the formatter nor the bracket fixes go near one.
function docTreeHasJsx(CM, state) {
  const tree = CM.language.ensureSyntaxTree(state, state.doc.length, 200) || CM.language.syntaxTree(state);
  let jsx = false;
  tree.iterate({
    enter: (node) => {
      if (/^JSX/.test(node.name)) jsx = true;
      return !jsx;
    },
  });
  return jsx;
}

//: The first line the Lezer tree could not place, or null. JavaScript with
//: JSX in it is parsed (the package is mounted with `jsx: true`) and then
//: refused by name, because nothing here lays out markup inside code.
function docFormatTreeRefusal(CM, state, ext) {
  if (ext === "js" && docTreeHasJsx(CM, state)) {
    return "Not formatted: this file has JSX in it, which the formatter leaves as written.";
  }
  const found = docTreeDiagnostics(CM, state);
  if (!found.length) return null;
  const line = state.doc.lineAt(found[0].from).number;
  return `Not formatted: line ${line} does not parse (${found[0].message.toLowerCase()}).`;
}

//: The server's word on a Python, TOML or YAML file, or null when it has no
//: complaint or could not be asked. Could-not-ask formats anyway: the scan
//: itself still refuses an open string, and whitespace outside strings is
//: all these three ever have changed.
async function docFormatRemoteRefusal(ext, text) {
  if (!DOC_CHECK_REMOTE.has(ext) || !text.trim() || text.length > DOC_CHECK_MAX_CHARS) return null;
  try {
    const response = await api("/documents/check-syntax", {
      method: "POST",
      body: JSON.stringify({ language: ext, text }),
      silent: true,
      readOnly: true,
    });
    const found = await response.json();
    const error = (Array.isArray(found) ? found : []).find((d) => d.severity !== "info" && d.severity !== "warning");
    return error ? `Not formatted: line ${error.line}, ${String(error.message || "does not parse").replace(/\.$/, "")}.` : null;
  } catch {
    return null;
  }
}

//: The change set that turns `before` into `after`, line by line, touching
//: only what differs within each line. The formatter keeps the line count
//: everywhere but the end of the file, so lines are paired from the top and
//: whatever is left at the bottom is one change.
function docFormatChanges(before, after, offset = 0) {
  const a = before.split("\n");
  const b = after.split("\n");
  const changes = [];
  const diff = (x, y, at) => {
    if (x === y) return;
    let p = 0;
    while (p < x.length && p < y.length && x[p] === y[p]) p += 1;
    let s = 0;
    while (s < x.length - p && s < y.length - p && x[x.length - 1 - s] === y[y.length - 1 - s]) s += 1;
    changes.push({ from: at + p, to: at + x.length - s, insert: y.slice(p, y.length - s) });
  };
  const paired = a.length === b.length ? a.length : Math.min(a.length, b.length) - 1;
  let at = offset;
  for (let k = 0; k < paired; k += 1) {
    diff(a[k], b[k], at);
    at += a[k].length + 1;
  }
  if (paired < a.length) diff(a.slice(paired).join("\n"), b.slice(paired).join("\n"), at);
  return changes;
}

//: `scope` is "auto" (the selection if there is one, else the document),
//: "document" or "selection". Resolves to whether anything was done.
async function docFormatCode(scope = "auto") {
  const CM = window.CM6;
  const type = docFileType();
  const view = docCmView;
  if (type.previewable || ["txt", "csv"].includes(type.ext)) {
    toast("Formatting is for code documents.", true);
    return false;
  }
  if (!view || !CM) {
    toast("Formatting needs the code editor, which has not loaded.", true);
    return false;
  }
  const state = view.state;
  const text = state.doc.toString();
  const sel = state.selection.main;
  const selection = scope === "selection" || (scope === "auto" && !sel.empty);
  if (selection && sel.empty) {
    toast("Select the lines to format first.", true);
    return false;
  }
  const refusal = DOC_CHECK_TREE.has(type.ext)
    ? docFormatTreeRefusal(CM, state, type.ext)
    : await docFormatRemoteRefusal(type.ext, text);
  if (refusal) {
    toast(refusal, true);
    return false;
  }
  //: The server check is a round trip; typing during it would make the
  //: result a format of text that is no longer there.
  if (docCmView !== view || view.state.doc.toString() !== text) {
    toast("The text changed while it was being checked. Format again.", true);
    return false;
  }
  const unit = type.indent || "  ";
  const first = state.doc.lineAt(sel.from);
  //: A selection that ends at the very start of a line does not take that
  //: line with it, as in every editor's "indent the selected lines".
  const last = state.doc.lineAt(sel.to > sel.from && sel.to === state.doc.lineAt(sel.to).from ? sel.to - 1 : sel.to);
  const range = selection ? [first.number - 1, last.number - 1] : null;
  let result;
  let changes;
  if (type.ext === "json" && selection) {
    //: A JSON selection has to be a whole value on its own; its lines
    //: keep the indent of the line it starts on.
    const piece = state.sliceDoc(sel.from, sel.to);
    result = docFormatJsonText(piece, unit, /^[ \t]*/.exec(first.text)[0], false);
    if (result.error) result.error = result.error.replace("Not formatted:", "Not formatted, the selection is not a whole JSON value:");
    if (!result.error) changes = docFormatChanges(piece, result.text, sel.from);
  } else {
    if (type.ext === "json") result = docFormatJsonText(text, unit);
    else if (type.ext === "html" || type.ext === "xml") result = docFormatMarkupText(text, type.ext, unit, range);
    else result = docFormatCodeText(text, type.ext, unit, range);
    if (!result.error) changes = docFormatChanges(text, result.text);
  }
  if (result.error) {
    toast(result.error, true);
    return false;
  }
  if (!changes.length) {
    toast(selection ? "The selection is already formatted." : "Already formatted.");
    return true;
  }
  view.dispatch({
    changes,
    annotations: [CM.commands.isolateHistory.of("full"), CM.state.Transaction.userEvent.of("format")],
  });
  toast(`${selection ? "Formatted the selection" : "Formatted the document"}. Ctrl+Z undoes it.`);
  return true;
}

// --- Quick fixes -------------------------------------------------------------
//
// "Recommended fixes to apply like the other autocorrect feature." The prose
// checker's shape, in code: the underline says where, hovering it says what
// and offers the fixes as buttons (CodeMirror's own lint tooltip, restyled in
// `docCmTheme`), and the keyboard reaches the same list with the prose menu's
// own chord, Alt+Enter, opening at the caret through the app's one
// menu-at-a-point recipe (`openMenuAtPoint`). F8 and Shift+F8 walk the
// problems, as they walk the prose findings.
//
// **Not Ctrl+.**, which is what VS Code binds: this app already gives that
// chord to "stop the answer being written" (app.js's shortcut registry), and
// taking it inside the editor would make the one shortcut whose whole value is
// being reachable in a hurry stop working exactly when a writer is in a code
// file. Alt+Enter is the chord the prose menu already uses for the same job,
// and JetBrains' for this one.
//
// **A fix is recomputed at the moment it is chosen.** The list was built
// against the text of the last check, up to 750ms and any number of
// keystrokes ago; applying its offsets then would edit the wrong place. So a
// fix carries only which check it came from, which problem and which fix,
// and `docCodeFixNow` asks that check again of the text as it is now and
// applies what it answers. When the problem has gone the fix says so and does
// nothing.

//: Which of the pure checks a diagnostic came from, so the fix can be asked
//: for again: "scan" (brackets, strings, comments), "json", "py-colon",
//: "indent-mix".
function docCodeFixNow(view, source, key, name, from) {
  const text = view.state.doc.toString();
  const type = docFileType();
  const unit = type.indent || "  ";
  if (source === "py-colon") {
    const fix = docPythonColonFix(text, view.state.doc.lineAt(from).number);
    return fix && fix.name === name ? fix : null;
  }
  if (source === "json") {
    return docJsonFixes(text, docJsonErrorAt(text), unit).find((fix) => fix.name === name) || null;
  }
  const found = source === "indent-mix"
    ? docIndentMixFixes(text, unit, view.state.tabSize, type.ext)
    : docCodeFixes(text, type.ext, unit);
  const diag = found.find((d) => d.key === key && d.from === from);
  return diag ? diag.fixes.find((fix) => fix.name === name) || null : null;
}

function docApplyCodeFix(view, source, key, name, from) {
  const CM = window.CM6;
  const fix = CM && docCodeFixNow(view, source, key, name, from);
  if (!fix) {
    toast("That fix no longer applies: the text has changed since it was offered.", true);
    return;
  }
  view.dispatch({
    changes: fix.edits,
    annotations: [CM.commands.isolateHistory.of("full"), CM.state.Transaction.userEvent.of("input.fix")],
  });
  view.focus();
}

//: A pure check's answer as CodeMirror diagnostics, each fix an action.
function docCodeActions(source, list) {
  return list.map((d) => ({
    from: d.from,
    to: d.to,
    severity: d.severity || "error",
    message: d.message,
    actions: (d.fixes || []).map((fix) => ({
      name: fix.name,
      apply: (view, from) => docApplyCodeFix(view, source, d.key, fix.name, from),
    })),
  }));
}

//: The quick-fix menu at the caret: the fixes for every problem under it,
//: then the two formats, so the one chord is also where "tidy this" lives.
function docOpenCodeFixes() {
  const CM = window.CM6;
  const view = docCmView;
  if (!CM || !view || typeof openMenuAtPoint !== "function") return false;
  const state = view.state;
  const pos = state.selection.main.head;
  const items = [];
  //: The problems under the caret, or failing that the ones on its line: a
  //: compiler puts "expected ':'" at the end of `def f(x)`, and a caret
  //: anywhere in that line is asking about it.
  const here = [];
  const line = state.doc.lineAt(pos);
  CM.lint.forEachDiagnostic(state, (d, from, to) => {
    if (from <= pos && pos <= to) here.push({ d, from, to, exact: true });
    else if (from <= line.to && to >= line.from) here.push({ d, from, to, exact: false });
  });
  const chosen = here.some((h) => h.exact) ? here.filter((h) => h.exact) : here;
  for (const { d, from, to } of chosen) {
    for (const action of d.actions || []) {
      items.push({
        group: "fix",
        label: `ph:wrench ${action.name}`,
        title: d.message,
        run: () => action.apply(view, from, to),
      });
    }
  }
  if (!items.length) {
    items.push({
      group: "fix",
      label: "ph:info No quick fix at the caret",
      title: "F8 goes to the next problem",
      disabled: true,
      run: () => toast("Nothing to fix at the caret. F8 goes to the next problem."),
    });
  }
  items.push({
    group: "format",
    label: "ph:brackets-curly Format the document",
    title: "Shift+Alt+F with nothing selected",
    run: () => docFormatCode("document"),
  });
  if (!state.selection.main.empty) {
    items.push({
      group: "format",
      label: "ph:brackets-curly Format the selection",
      title: "Shift+Alt+F with text selected",
      run: () => docFormatCode("selection"),
    });
  }
  const at = view.coordsAtPos(pos) || view.contentDOM.getBoundingClientRect();
  openMenuAtPoint(items, "Quick fixes", at.left, at.bottom);
  return true;
}

function docCmExtensions(CM) {
  const type = docFileType();
  docCmParts.language = new CM.state.Compartment();
  docCmParts.theme = new CM.state.Compartment();
  docCmParts.gutter = new CM.state.Compartment();
  docCmParts.wrap = new CM.state.Compartment();
  docCmParts.live = new CM.state.Compartment();
  docCmParts.spell = new CM.state.Compartment();
  docCmParts.reading = new CM.state.Compartment();
  docCmParts.code = new CM.state.Compartment();
  if (!docFindingsEffect) docFindingsEffect = CM.state.StateEffect.define();
  return [
    //: First, so its gutter is the leftmost: the error mark sits outside the
    //: line numbers, where every code editor the owner compares this with
    //: puts it.
    docCmParts.code.of(docCodeTools(CM)),
    //: Live's decorations, off until `setDocView` turns them on. Findings are
    //: a separate plugin because they are drawn in *every* view: an underline
    //: under a misspelling is not a rendering of the markdown, it is the
    //: checker saying something, and switching to Source to see the raw text
    //: is not a reason to stop being told.
    docCmParts.live.of(docView === "live" ? docLiveExtensions(CM) : []),
    CM.state.Prec.high(docFindingsPlugin(CM)),
    //: The dimming is a compartment because it is a preference that changes
    //: while the view is live; the typewriter listener is not, because it is
    //: inert until its flag is on and reconfiguring an extension to say
    //: "return early" buys nothing.
    docCmParts.reading.of(docDimOthers ? docReadingPlugin(CM) : []),
    docTypewriterExtension(CM),
    docCmParts.gutter.of(docCmGutter(CM)),
    //: Folding, wherever the gutter is: a heading section, a fenced block and
    //: a `[!note]-` callout all fold with or without the line numbers on.
    CM.language.codeFolding(),
    CM.view.keymap.of(CM.language.foldKeymap),
    docHeadingFold(CM),
    docCalloutFold(CM),
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
    docCmParts.wrap.of(docCmDrawFor(CM, type)),
    docCmParts.language.of(docCmViewLanguage(CM)),
    docCmParts.theme.of(docCmTheme(CM)),
    docCmHighlight(CM),
    CM.view.placeholder(docPlaceholderText || ""),
    //: This app's chords first, then CodeMirror's own defaults, so a binding
    //: the editor already had wins over the library's.
    CM.view.keymap.of([
      ...docCmKeymap(CM),
      ...CM.search.searchKeymap,
      ...CM.commands.historyKeymap,
      ...CM.commands.defaultKeymap,
    ]),
    //: The disarming half of the Escape-then-Tab hatch. Anything that is not
    //: part of that chord means the writer went back to writing, and a flag
    //: still armed then would send the next Tab to the toolbar instead of
    //: into the line. Registered as a plain DOM handler rather than as more
    //: keymap entries because a keymap can only match keys it names, and this
    //: has to see the ones it does not. Never handles the event (always
    //: false), so nothing downstream changes.
    CM.view.EditorView.domEventHandlers({
      keydown: (event) => {
        if (event.key !== "Tab" && event.key !== "Shift" && event.key !== "Escape") {
          docTabEscapes = false;
        }
        return false;
      },
      mousedown: (event, view) => {
        docTabEscapes = false;
        return docTableCellClick(event, view);
      },
    }),
    CM.view.EditorView.updateListener.of(docCmUpdate),
    //: **The browser's own spellcheck, and the one condition it stays on
    //: under.** CodeMirror turns it off by default, and for a code editor
    //: that is right: a red squiggle under every identifier is noise. This is
    //: a writing surface, so while this app's own checker knew 42 typos the
    //: browser's dictionary was by far the better of the two and it was left
    //: on. That is what the owner was clicking: "no edit suggestions popup
    //: panel appears when I click on underlined words" is a native squiggle
    //: the app cannot see, under a word the app has no finding for.
    //:
    //: Now that there is a real word list the app draws its own underline
    //: under the same words, and its underline opens a menu. Two marks under
    //: one word, only one of which answers a click, is worse than either
    //: alone, so the browser's goes off the moment the list is ready and
    //: comes back if it never loads.
    docCmParts.spell.of(docCmSpellcheck(CM)),
  ];
}

//: The browser's checker is the fallback, not the default: it is on exactly
//: while this app has no dictionary of its own to check against.
function docCmSpellcheck(CM) {
  return CM.view.EditorView.contentAttributes.of({
    spellcheck: docWordlistReady() ? "false" : "true",
  });
}

//: Called when the word list lands, which is the one moment the answer above
//: changes. A compartment rather than a rebuild: rebuilding the editor's
//: extensions would throw away the undo history and the scroll position for
//: the sake of one attribute.
function docCmApplySpellcheck() {
  const CM = window.CM6;
  if (!docCmView || !CM || !docCmParts.spell) return;
  docCmView.dispatch({ effects: docCmParts.spell.reconfigure(docCmSpellcheck(CM)) });
}

//: **The one place a CodeMirror change becomes an app change.** The library
//: raises a native `input` on its contenteditable *and* calls this, while a
//: scripted transaction raises only this: so the delegated `input` listeners
//: skip anything from inside the view (`docEventFromCm`) and this drives the
//: pipeline for typed and scripted edits alike.
function docCmUpdate(update) {
  if (update.docChanged) {
    docSurfaceChanged();
    //: **Autocorrect, which never ran once under the engine.** The delegated
    //: `input` listener that calls it returns early for anything inside the
    //: view (`docEventFromCm`), because the engine reports its changes here
    //: instead and running both would do every pass twice. That listener was
    //: also the only caller of `docAutocorrectAt`, so switching the surface
    //: to CodeMirror silently turned the feature off: measured 2026-09-12,
    //: typing "teh " with autocorrect switched on left "teh ".
    //:
    //: Deferred by a microtask rather than called here, because this runs
    //: *during* the view's own update and dispatching a transaction into an
    //: update in progress is the one thing CodeMirror will not have. A
    //: microtask still runs before the frame is painted, so the correction is
    //: never visible as two states.
    //:
    //: Only a typed insertion: `isUserEvent("input.type")` is false for the
    //: correction's own transaction, which is what keeps this from looking at
    //: its own work, and false for every scripted rewrite (the AI panel, a
    //: template, a paste is "input.paste"), none of which a writer typed.
    if (update.transactions.some((tr) => tr.isUserEvent("input.type"))) {
      const surface = docSurface();
      queueMicrotask(() => docAutocorrectAt(surface));
    }
    docToolsOnInput(docSurface());
    //: editor.js hangs the "/" and `[[` triggers off a DOM `input` event,
    //: which the engine never raises for a typed character: it applies the
    //: change itself. Called rather than dispatched, so there is no synthetic
    //: event on a contenteditable and no second pass through this pipeline.
    if (typeof editorHandleInput === "function") editorHandleInput(docSurface());
    if (!$("doc-suggest-menu")?.classList.contains("hidden")) closeDocSuggest();
  }
  if (update.selectionSet) {
    renderDocCaret();
    //: The outline follows the caret too, on the same beat the breadcrumb
    //: does: an arrow key raises no scroll and no `input`, so without this the
    //: two rows that both answer "where am I" would disagree until the view
    //: moved. Scheduled, not marked, because a held-down arrow key fires far
    //: faster than a class swap needs to be painted.
    scheduleDocOutlineSpy();
  }
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
  //: The document-level pipeline, re-registered on the surface that exists
  //: now: the fallback's own `input` listener is on an element the engine has
  //: just taken out of the layout.
  cmSurface(docCmView).onChange(docSurfaceInput);
  host.classList.remove("hidden");
  $("doc-source-wrap")?.classList.add("has-cm");
  //: The column beside the textarea is not the editor's gutter any more
  //: (decision 7), so it is taken down rather than left numbering a box
  //: nobody can see.
  applyDocGutter();
  wireDocSurfaceScroll(docSurface());
  docWatchAppearance();
  docGuardGlobalShortcuts(host);
  docFoldMarkedCallouts();
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

//: **How a file's text is drawn, in the wrap compartment** (INBOX 402):
//: prose wraps always; any other type wraps when Alt+Z (or the menu's row)
//: says so, and shows its spaces and tabs when "Show whitespace" does. Both
//: are per-viewer preferences, remembered like the other writing switches.
function docCmDrawFor(CM, type) {
  const parts = [];
  if (type.previewable || docToolPref("codeWrap", false)) parts.push(CM.view.EditorView.lineWrapping);
  if (!type.previewable && docToolPref("whitespace", false)) parts.push(CM.view.highlightWhitespace());
  return parts;
}

//: Flip one of the two, or set it: the preference, the view, the menu's
//: checkbox, in that order. Refused for prose, which has no such switch.
function docToggleCodeDraw(name, on) {
  const type = docFileType();
  if (type.previewable) return false;
  const next = on === undefined ? !docToolPref(name, false) : Boolean(on);
  docSaveToolPref(name, next);
  const CM = window.CM6;
  if (docCmView && CM && docCmParts.wrap) {
    docCmView.dispatch({ effects: docCmParts.wrap.reconfigure(docCmDrawFor(CM, type)) });
  }
  const box = $(name === "codeWrap" ? "doc-code-wrap" : "doc-whitespace");
  if (box) box.checked = next;
  return true;
}

$("doc-code-wrap")?.addEventListener("change", (event) => docToggleCodeDraw("codeWrap", event.target.checked));
$("doc-whitespace")?.addEventListener("change", (event) => docToggleCodeDraw("whitespace", event.target.checked));
if ($("doc-code-wrap")) $("doc-code-wrap").checked = docToolPref("codeWrap", false);
if ($("doc-whitespace")) $("doc-whitespace").checked = docToolPref("whitespace", false);

//: The file type changed while the document was open: the language and the
//: wrapping follow it. Reconfigured rather than rebuilt, so the caret, the
//: scroll position and the undo history survive.
//:
//: The view is read here as well as the type, because Plain is defined as
//: "no language at all" and a file-type change while Plain is on must not
//: quietly turn the highlighting back on.
function docCmSyncFileType() {
  const CM = window.CM6;
  if (!docCmView || !CM || !docCmParts.language) return;
  const type = docFileType();
  docCmView.dispatch({
    effects: [
      docCmParts.language.reconfigure(docCmViewLanguage(CM)),
      docCmParts.wrap.reconfigure(docCmDrawFor(CM, type)),
      ...(docCmParts.code ? [docCmParts.code.reconfigure(docCodeTools(CM))] : []),
    ],
  });
}

//: **What Plain means, in one function.** The owner: "I want to be able to
//: use the documents tab as a plain text editor like before as a view option
//: (not the defaul though)."
//:
//: "Like before" is the textarea: characters, a caret, and nothing colouring
//: or hiding any of them. Live already answers "render as I write" and Source
//: answers "show me the markdown", but Source still runs the markdown grammar,
//: so a heading is bold and a fence is tinted, which is not what "plain" is
//: asking for. Plain is the same editor with the language compartment empty:
//: no grammar, so no highlighting, no folding by syntax and no bracket
//: matching, and every other thing the editor does (undo, find, the findings,
//: the line numbers, autosave) is untouched. That is the smallest honest
//: definition, and it is one compartment rather than a fourth surface.
function docCmViewLanguage(CM) {
  if (docView === "plain") return [];
  return docCmLanguageFor(CM, docFileType().ext);
}

//: The view changed, so what the editor is allowed to highlight may have. One
//: effect, not a rebuild: the caret, the scroll position and the undo history
//: all survive a hop into Plain and back.
function docCmSyncLanguage() {
  const CM = window.CM6;
  if (!docCmView || !CM || !docCmParts.language) return;
  docCmView.dispatch({ effects: docCmParts.language.reconfigure(docCmViewLanguage(CM)) });
  docCmSyncCodeTools();
}

//: The line-number preference, applied to the engine. `applyDocGutter` still
//: owns the *decision* (and the two note editors' own columns); this is only
//: how it reaches the view.
//: The one reading of the line-number preference that both the gutter itself
//: and the decorations that have to dodge it go through, so the two cannot
//: disagree about whether there are numbers on screen.
function docFenceGutterOn() {
  return docGutterWanted(!docFileType().previewable);
}

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
  if (!docFenceGutterOn()) return [];
  //: **Only the gutter is in the gutter.** Folding itself moved into the base
  //: extensions when callouts became foldable (Phase 3 item 2): every fold
  //: this editor offers lived in here, so a markdown document, which opens
  //: with the line numbers off, had no folding at all and a callout's toggle
  //: would have been a chevron that did nothing. The arrow in the margin is a
  //: gutter control and stays; what it operates is not.
  //: **The arrow is an icon, not a character** (the owner, 2026-09-21: "make
  //: these dropdown arrows actually aligned and proper icons"). CodeMirror's
  //: `foldGutter` draws a text triangle by default, which rendered as a typed
  //: "v" in this app's font: the exact shape `tests/test_no_glyph_icons.py`
  //: exists to keep out, sitting beside a column of numbers it could not line
  //: up with because a glyph's box is its font's business, not the line's.
  //: `markerDOM` hands it the app's own caret instead, and the rule for
  //: `.cm-foldGutter` below gives the lane a box the size of a line so the
  //: arrow sits on the text it folds rather than near it.
  const markerDOM = (open) => {
    const icon = document.createElement("i");
    icon.className = `ph ph-caret-${open ? "down" : "right"} cm-fold-caret`;
    icon.setAttribute("aria-hidden", "true");
    return icon;
  };
  return [CM.view.lineNumbers(), CM.language.foldGutter({ markerDOM })];
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
//: **A callout is foldable when its marker says so**, `> [!note]-` (start
//: folded) or `> [!note]+` (start open), which is the syntax Obsidian uses and
//: the one GitHub and Typora also read. The range folded is everything after
//: the first line to the end of the blockquote, so the kind's own label stays
//: on screen as the thing you click to get the rest back.
//:
//: Written against the document rather than the syntax tree for the same
//: reason the renderer's callout branch is: `[!note]` is not markdown, it is a
//: convention inside a blockquote, and the tree has no node for it.
function docCalloutFoldRange(state, line) {
  if (!/^\s*>\s*\[![A-Za-z]+\][-+]/.test(line.text)) return null;
  let last = line.number;
  for (let number = line.number + 1; number <= state.doc.lines; number += 1) {
    if (!/^\s*>/.test(state.doc.line(number).text)) break;
    last = number;
  }
  if (last === line.number) return null;
  return { from: line.to, to: state.doc.line(last).to };
}

function docCalloutFold(CM) {
  return CM.language.foldService.of((state, lineStart) => {
    if (!docFileType().previewable) return null;
    return docCalloutFoldRange(state, state.doc.lineAt(lineStart));
  });
}

//: Whether this callout is folded *now*, which is what decides which way its
//: chevron points. The marker in the text says where it started, not where it
//: is.
function docCalloutFolded(state, line) {
  const CM = window.CM6;
  if (!CM || typeof CM.language.foldedRanges !== "function") return false;
  const range = docCalloutFoldRange(state, line);
  if (!range) return false;
  let folded = false;
  CM.language.foldedRanges(state).between(range.from, range.to, () => {
    folded = true;
    return false;
  });
  return folded;
}

//: The click on a callout's label. Dispatches the fold itself rather than
//: calling `toggleFold`, whose job is the *cursor's* fold: a click on a
//: callout three screens from the caret would otherwise fold whatever the
//: caret happened to be inside.
function docToggleCalloutFold(at) {
  const CM = window.CM6;
  const view = docCmView;
  if (!CM || !view) return;
  const line = view.state.doc.lineAt(Math.max(0, Math.min(at, view.state.doc.length)));
  const range = docCalloutFoldRange(view.state, line);
  if (!range) return;
  let folded = null;
  CM.language.foldedRanges(view.state).between(range.from, range.to, (from, to) => {
    if (!folded) folded = { from, to };
    return false;
  });
  view.dispatch({
    effects: folded ? CM.language.unfoldEffect.of(folded) : CM.language.foldEffect.of(range),
  });
}

//: **Every `[!kind]-` callout in the document, folded, once.** The marker is a
//: statement about how the document opens, so it is applied when the document
//: opens and never again: re-applying it on every repaint would make a
//: callout somebody opened close itself under their hands.
function docFoldMarkedCallouts() {
  const CM = window.CM6;
  const view = docCmView;
  if (!CM || !view || !docFileType().previewable) return;
  const effects = [];
  for (let number = 1; number <= view.state.doc.lines; number += 1) {
    const line = view.state.doc.line(number);
    if (!/^\s*>\s*\[![A-Za-z]+\]-/.test(line.text)) continue;
    const range = docCalloutFoldRange(view.state, line);
    if (range) effects.push(CM.language.foldEffect.of(range));
  }
  if (effects.length) view.dispatch({ effects });
}

//: A footnote reference goes to its definition, which is the whole point of
//: the raised number: in a long document the text it refers to is hundreds of
//: lines away and scrolling for it is what stops people using footnotes.
function docGoToFootnote(id) {
  const surface = docSurface();
  if (!surface) return;
  const text = surface.text;
  const marker = `\n[^${id}]:`;
  let at = text.startsWith(`[^${id}]:`) ? 0 : text.indexOf(marker);
  if (at > 0) at += 1;
  if (at < 0) {
    if (typeof toast === "function") toast(`Footnote ${id} has no text yet`);
    return;
  }
  surface.focus();
  surface.setSelectionRange(at, at);
}

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
  //: The `[!kind]-` callouts, folded as their markers ask, on the one event
  //: that means "a different document is on screen now".
  docFoldMarkedCallouts();
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
