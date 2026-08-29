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

async function loadDocuments(selectId = null) {
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
  renderDocPreview();
  renderDocStats();
  renderDocOutline();
  renderDocNotes();
  renderDocBacklinks();
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
      body: JSON.stringify({ title, content }),
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

function toggleDocPreview() {
  const preview = $("doc-preview");
  const showing = preview.classList.toggle("hidden");
  $("doc-panes").classList.toggle("split", !showing);
  $("doc-preview-toggle").setAttribute("aria-pressed", String(!showing));
  renderDocPreview();
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
};

function applyMarkdown(kind) {
  const action = MD_ACTIONS[kind];
  const box = $("doc-content");
  if (!action) return;
  const { selectionStart: start, selectionEnd: end, value } = box;
  const selected = value.slice(start, end);

  if (action.wrap) {
    wrapDocSelection(action.wrap, action.placeholder);
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
  box.focus();
  markDocDirty();
  renderDocPreview();
}

// Wrap the selection in markdown syntax (Ctrl+B / Ctrl+I).
function wrapDocSelection(marker, placeholder = "") {
  const box = $("doc-content");
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
    markDocDirty();
    renderDocPreview();
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
    markDocDirty();
    renderDocPreview();
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
  markDocDirty();
  renderDocPreview();
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
  const wasHidden = $("doc-preview").classList.contains("hidden");
  if (wasHidden) toggleDocPreview(); // print the rendered version, not the source
  renderDocPreview();
  document.body.classList.add("printing-doc");
  const cleanup = () => {
    document.body.classList.remove("printing-doc");
    if (wasHidden) toggleDocPreview();
    window.removeEventListener("afterprint", cleanup);
  };
  window.addEventListener("afterprint", cleanup);
  setTimeout(() => window.print(), 150);
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
$("doc-content").addEventListener("input", () => { markDocDirty(); renderDocPreview(); });
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
for (const button of document.querySelectorAll("#doc-toolbar button")) {
  button.addEventListener("click", () => applyMarkdown(button.dataset.md));
}

$("doc-word-goal").addEventListener("click", promptDocWordGoal);
$("doc-word-goal-submit").addEventListener("click", () => {
  if (!currentDoc) return;
  const goal = Math.max(0, Math.round(Number($("doc-word-goal-input").value)) || 0);
  setDocWordGoal(currentDoc.id, goal);
  renderDocStats();
  $("doc-word-goal-dialog").close();
});
$("doc-preview-toggle").addEventListener("click", toggleDocPreview);
$("doc-export-md").addEventListener("click", exportDocumentMarkdown);
$("doc-export-pdf").addEventListener("click", exportDocumentPdf);
$("doc-delete").addEventListener("click", deleteCurrentDocument);
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
  if (!(event.ctrlKey || event.metaKey)) return;
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
