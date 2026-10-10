// -----------------------------------------------------------------------------
// The code editor's VS Code pieces, Brief 42 (DOCUMENTS_PLAN 21 and 25)
// -----------------------------------------------------------------------------
//
// The owner, 2026-10-10: "it leaves a lot to be desired and just sucks
// compared to vs code and other IDEs. make sure to make full use of the
// vendored repositories and libraries". Measured first (scratchpad/ui-sweeps/
// docs42.js): no minimap, no fold all or problems panel in the palette, no
// comparison with a saved version in the editor, the active line's number
// drawn at weight 400 with no border. This file is those pieces, on the
// packages the bundle gained for them (`CM6.merge`, `CM6.showMinimap`).
//
// Its own file, loaded after documents.js in the Library bundle, so the
// editor's size ratchets do not move. documents-code.js mounts the one
// compartment below from `docCompletionExtras`, a call made at open time,
// never at load, so the order of the files is not load-bearing.

//: One compartment for everything here, reused across documents: the
//: minimap when the preference is on, the merge view while comparing.
//: `compare` is `{ docId, label, text }` for the version being compared.
const docIde = { slot: null, compare: null };

function docIdeExtensions(CM, type) {
  if (!docIde.slot) docIde.slot = new CM.state.Compartment();
  //: A comparison belongs to the document it was opened on; opening
  //: another one ends it rather than diffing the new text against it.
  if (docIde.compare && docIde.compare.docId !== (currentDoc && currentDoc.id)) docIde.compare = null;
  return docIde.slot.of(docIdeSlot(CM, type));
}

function docIdeSlot(CM, type) {
  const out = [
    //: CodeMirror owns the editor's `class` attribute and rewrites it on
    //: every focus change, so `syncDocFileType`'s `classList.toggle` was
    //: gone the first time the editor took focus (measured: the class
    //: present at open, absent once focused). Declared here it is kept.
    CM.view.EditorView.editorAttributes.of({ class: "doc-content-code" }),
    //: VS Code's Ctrl+Shift+M. CodeMirror's `lintKeymap` binds the same
    //: chord; only this one row of it is wanted (F8 is bound already).
    CM.view.keymap.of([{ key: "Mod-Shift-m", run: (view) => CM.lint.openLintPanel(view) }]),
  ];
  if (docToolPref("codeMinimap", false)) {
    out.push(
      CM.showMinimap.compute(["doc"], () => ({
        create: () => {
          const dom = document.createElement("div");
          dom.className = "doc-minimap";
          return { dom };
        },
        //: Blocks, not characters: a block per word is legible at this
        //: scale and costs a tenth of the paint (the package's own advice).
        displayText: "blocks",
        showOverlay: "always",
      }))
    );
  }
  if (docIde.compare) {
    out.push(
      CM.merge.unifiedMergeView({
        original: docIde.compare.text,
        mergeControls: true,
        gutter: true,
        highlightChanges: true,
        syntaxHighlightDeletions: true,
      })
    );
  }
  return out;
}

function docIdeReconfigure() {
  const CM = window.CM6;
  if (!docCmView || !CM || !docIde.slot) return;
  docCmView.dispatch({ effects: docIde.slot.reconfigure(docIdeSlot(CM, docFileType())) });
}

//: The hunks between a saved version and the editor, as the merge view
//: draws them. Pure, so `tests/test_code_ide_b42.py` runs it in node.
function docIdeChunks(CM, original, state) {
  return CM.merge.Chunk.build(CM.state.Text.of(original.split("\n")), state.doc);
}

//: The transaction that puts one hunk back the way the version had it,
//: and nothing else: the merge view's own Reject, reachable from the
//: palette for the hunk at the caret. Its line-break rule is the
//: package's: a hunk ends on the line after its last changed line.
function docIdeRevertSpec(CM, original, state, chunk) {
  const orig = CM.state.Text.of(original.split("\n"));
  let insert = orig.sliceString(chunk.fromA, Math.max(chunk.fromA, chunk.toA - 1));
  if (chunk.fromA !== chunk.toA && chunk.toB <= state.doc.length) insert += state.lineBreak;
  return { changes: { from: chunk.fromB, to: Math.min(state.doc.length, chunk.toB), insert } };
}

function docIdeCodeView() {
  return docCmView && currentDoc && !docFileType().previewable ? docCmView : null;
}

function docIdeFoldAll(unfold) {
  const view = docIdeCodeView();
  const CM = window.CM6;
  if (!view || !CM) return false;
  return unfold ? CM.language.unfoldAll(view) : CM.language.foldAll(view);
}

function docIdeProblems() {
  const view = docIdeCodeView();
  const CM = window.CM6;
  if (!view || !CM) return false;
  return CM.lint.openLintPanel(view);
}

function docIdeToggleMinimap(on) {
  if (docFileType().previewable) return false;
  const next = on === undefined ? !docToolPref("codeMinimap", false) : Boolean(on);
  docSaveToolPref("codeMinimap", next);
  const box = $("doc-minimap");
  if (box) box.checked = next;
  docIdeReconfigure();
  return true;
}

//: Compare with a saved version: the history's list, newest first, as a
//: menu at the caret; picking one opens the merge view against it.
async function docIdeCompareMenu() {
  const view = docIdeCodeView();
  if (!view) return false;
  let entries = [];
  try {
    entries = await apiJson(`/documents/${currentDoc.id}/revisions`);
  } catch (error) {
    toast(`Could not read this document's history: ${error.message}`, true);
    return false;
  }
  const items = entries.length
    ? entries.slice(0, 30).map((entry) => ({
      label: `ph:clock-counter-clockwise ${formatDocHistoryWhen(entry.created_at)}`,
      title: `${entry.words} words changed`,
      run: () => docIdeCompareWith(entry.id, formatDocHistoryWhen(entry.created_at)),
    }))
    : [{ label: "ph:info No saved versions yet", disabled: true, run: () => {} }];
  const at = view.coordsAtPos(view.state.selection.main.head) || view.contentDOM.getBoundingClientRect();
  openMenuAtPoint(items, "Compare with a saved version", at.left, at.bottom);
  return true;
}

function formatDocHistoryWhen(iso) {
  const when = new Date(iso);
  return Number.isNaN(when.getTime()) ? String(iso) : when.toLocaleString();
}

async function docIdeCompareWith(revisionId, label) {
  if (!docIdeCodeView()) return false;
  const docId = currentDoc.id;
  const full = await apiJson(`/documents/${docId}/revisions/${revisionId}`);
  if (!currentDoc || currentDoc.id !== docId) return false;
  docIde.compare = { docId, label, text: String(full.content ?? "") };
  docIdeReconfigure();
  toast(`Comparing with the version from ${label}. Reject puts a hunk back; Stop comparing ends it.`);
  return true;
}

function docIdeStopCompare() {
  if (!docIde.compare) return false;
  docIde.compare = null;
  docIdeReconfigure();
  return true;
}

//: The hunk at the caret, put back as the compared version had it.
function docIdeRevertAtCaret() {
  const view = docIdeCodeView();
  const CM = window.CM6;
  if (!view || !CM || !docIde.compare) return false;
  const head = view.state.selection.main.head;
  const chunk = docIdeChunks(CM, docIde.compare.text, view.state)
    .find((c) => head >= c.fromB && head <= Math.max(c.fromB, c.toB));
  if (!chunk) {
    toast("The caret is not in a changed hunk.");
    return false;
  }
  view.dispatch(docIdeRevertSpec(CM, docIde.compare.text, view.state, chunk));
  return true;
}

$("doc-minimap")?.addEventListener("change", (event) => docIdeToggleMinimap(event.target.checked));
if ($("doc-minimap")) $("doc-minimap").checked = docToolPref("codeMinimap", false);

// --- INBOX 736: the output panel's height ------------------------------------------
//
// The owner, 2026-10-06: "I cant adjust the height of this output bottom
// panel". The sidebars' grip (`.sidebar-resize`: the role, the keys, the
// double click) laid along the panel's top edge, the height kept per
// document because a file that prints three lines and one that renders a
// page want different panels.

const DOC_RUN_HEIGHT_KEY = "doc-run-heights";
const DOC_RUN_HEIGHT_MIN = 96;

function docIdeRunHeights() {
  try {
    return prefs.json(DOC_RUN_HEIGHT_KEY, null) || {};
  } catch {
    return {};
  }
}

function docIdeRunSaveHeight(px) {
  if (!currentDoc) return;
  const all = docIdeRunHeights();
  if (px === null) delete all[currentDoc.id];
  else all[currentDoc.id] = Math.round(px);
  prefs.setJSON(DOC_RUN_HEIGHT_KEY, all);
}

function docIdeRunApply(dom, px, save = true) {
  const max = Math.max(DOC_RUN_HEIGHT_MIN, Math.round(window.innerHeight * 0.8));
  if (px === null) {
    dom.style.height = "";
    if (save) docIdeRunSaveHeight(null);
    return;
  }
  const next = Math.min(Math.max(Math.round(px), DOC_RUN_HEIGHT_MIN), max);
  dom.style.height = `${next}px`;
  if (save) docIdeRunSaveHeight(next);
}

function docIdeRunGrip(dom, view) {
  const handle = document.createElement("div");
  handle.className = "sidebar-resize doc-run-resize";
  handle.setAttribute("role", "separator");
  handle.setAttribute("aria-orientation", "horizontal");
  handle.setAttribute("tabindex", "0");
  handle.setAttribute("aria-label", "Resize the output: arrow keys, or drag");
  handle.title = "Drag to resize, double-click to reset";
  //: The value it says (WCAG 4.1.2) is the height: the helper's height axis.
  trackSeparatorValue(handle, dom, DOC_RUN_HEIGHT_MIN, Math.round(window.innerHeight * 0.8), "height");
  handle.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    const startY = event.clientY;
    const start = dom.getBoundingClientRect().height;
    document.body.classList.add("resizing-sidebar");
    //: Dragging up (a negative delta) makes it taller: the panel grows away
    //: from its bottom edge, which stays put.
    const move = (e) => docIdeRunApply(dom, start - (e.clientY - startY));
    const stop = () => {
      document.body.classList.remove("resizing-sidebar");
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", stop);
      view.requestMeasure();
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", stop);
  });
  handle.addEventListener("keydown", (event) => {
    const step = event.shiftKey ? 64 : 16;
    const now = dom.getBoundingClientRect().height;
    if (event.key === "ArrowUp") docIdeRunApply(dom, now + step);
    else if (event.key === "ArrowDown") docIdeRunApply(dom, now - step);
    else if (event.key === "Home") docIdeRunApply(dom, null);
    else return;
    event.preventDefault();
    view.requestMeasure();
  });
  handle.addEventListener("dblclick", () => {
    docIdeRunApply(dom, null);
    view.requestMeasure();
  });
  dom.prepend(handle);
  const saved = currentDoc ? docIdeRunHeights()[currentDoc.id] : undefined;
  if (Number.isFinite(saved)) docIdeRunApply(dom, saved, false);
}
