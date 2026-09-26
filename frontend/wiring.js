// wiring.js: offline badge, writing room and help wiring, pickers, the find
// bar, the graph's phone sheet, [[, duplicates. Moved out of app.js on
// 2026-09-26 as one contiguous range (INBOX 426 cc,
// docs/roadmap/agent-remaining/appjs-split.md). A classic script sharing
// app.js's globals, loaded in app.js's old order; nothing in an earlier file
// calls into it while the page loads (scratchpad/appjs-map.js --check).

// --- offline badge -----------------------------------------------------------
//
// Being offline is not an error here, the app is built to run that way. What
// the badge says is narrower: web search and any cloud model will not answer
// right now. `navigator.onLine` is the browser's own answer and is only ever
// a hint (it reports "online" for a machine on a LAN with no route out), but
// a false negative is impossible and a false positive costs nothing, which is
// the right way round for a passive indicator.
function reflectOnlineState() {
  $("offline-indicator")?.classList.toggle("hidden", navigator.onLine);
}
window.addEventListener("offline", reflectOnlineState);
window.addEventListener("online", reflectOnlineState);
reflectOnlineState();

// --- writing room wiring ---
$("draft-compose").addEventListener("click", composeDraft);
$("draft-undo").addEventListener("click", undoDraft);
$("draft-cancel").addEventListener("click", cancelDraft);
$("draft-save").addEventListener("click", saveDraftAsNote);
$("draft-title").addEventListener("click", suggestDraftTitle);
// Refine is Draft with an instruction in hand: the same pass, so it runs the
// same function rather than a second copy of it that could drift.
$("draft-refine").addEventListener("click", () => {
  if (!$("draft-instruction").value.trim()) {
    setDraftStatus("Say what to change, then refine.", true);
    $("draft-instruction").focus();
    return;
  }
  composeDraft();
});
$("draft-instruction").addEventListener("keydown", (event) => {
  if (event.key !== "Enter") return;
  event.preventDefault();
  $("draft-refine").click();
});
$("draft-copy").addEventListener("click", async (event) => {
  const text = $("draft-text").value.trim();
  if (!text) {
    setDraftStatus("There's no draft to copy yet.", true);
    return;
  }
  if (await copyToClipboard(text, event.currentTarget)) setDraftStatus("Draft copied.");
});
// `appendSelectionToNote` is the app's one "add this text to a note you
// already have" path (the text-selection popup uses it): the same picker, the
// same undo entry, the same flash on the note it landed in.
$("draft-insert").addEventListener("click", () => {
  const text = $("draft-text").value.trim();
  if (!text) {
    setDraftStatus("There's no draft to insert yet.", true);
    return;
  }
  // The toast says it landed and offers the trip to it; the status line is
  // not written here because this returns before the picker has been
  // answered, and a line saying it was added is a lie until it was.
  appendSelectionToNote(text, { jump: false });
});
$("draft-add-source").addEventListener("click", async () => {
  if (draftSources.length >= DRAFT_MAX_SOURCES) {
    setDraftStatus(`Six notes is the most one draft can be written from.`, true);
    return;
  }
  const entry = await pickEntryDialog("Which note should Atlas write from?");
  if (!entry) return;
  if (draftSources.some((s) => s.id === entry.id)) return;
  draftSources.push({
    id: entry.id,
    label: clipText(entry.title || notePreviewText(entry.content) || "Untitled note", 60),
  });
  renderDraftSources();
  saveDraftLocally();
});
$("draft-continue-note").addEventListener("click", async () => {
  const entry = await pickEntryDialog("Which note should Atlas carry on?");
  if (!entry) return;
  if ($("draft-text").value.trim()) pushDraftUndo();
  $("draft-text").value = entry.content || "";
  draftNoteId = entry.id;
  draftNoteLabel = clipText(entry.title || notePreviewText(entry.content) || "a note", 40);
  $("draft-kind").value = "continue";
  markDraftQuickstart("continue");
  renderDraftTarget();
  // The note as it stands is version one, so the way back to what it said
  // before Atlas touched it is the same chip row as every other pass.
  rememberDraftVersion($("draft-text").value);
  updateDraftCount();
  saveDraftLocally();
  setDraftStatus("That note is in the draft. Add a thought, then draft to carry it on.");
  $("draft-thoughts").focus();
});
for (const id of ["draft-kind", "draft-tone", "draft-length"]) {
  $(id).addEventListener("change", () => {
    if (id === "draft-kind") {
      const kind = $("draft-kind").value;
      markDraftQuickstart(kind);
      //: The Translate chip goes back to the last language picked here.
      if (kind.startsWith("translate-")) {
        try {
          localStorage.setItem("draft-translate", kind.slice("translate-".length));
        } catch {
          /* storage blocked: the chip keeps its default */
        }
      }
    }
    saveDraftLocally();
  });
}
renderDraftQuickstarts();
$("draft-extract").addEventListener("click", () => openExtractPreview($("draft-text").value));
$("extract-close").addEventListener("click", closeExtractPreview);
$("extract-cancel").addEventListener("click", closeExtractPreview);
$("extract-commit").addEventListener("click", commitExtractPreview);
$("draft-text").addEventListener("input", () => {
  updateDraftCount();
  saveDraftLocally();
});
$("draft-thoughts").addEventListener("input", saveDraftLocally);
$("draft-tags").addEventListener("input", saveDraftLocally);
// Ctrl/Cmd+Enter from the thoughts box drafts, matching the capture box.
$("draft-thoughts").addEventListener("keydown", (event) => {
  if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
    event.preventDefault();
    composeDraft();
  }
});
$("draft-discard").addEventListener("click", async () => {
  if (!$("draft-text").value.trim() && !$("draft-thoughts").value.trim()) return;
  if (!(await confirmDialog("Discard this draft? It hasn't been saved as a note."))) return;
  foldedThoughts = "";
  $("draft-thoughts").value = "";
  $("draft-text").value = "";
  $("draft-tags").value = "";
  $("draft-thinking").classList.add("hidden");
  // The earlier versions and the notes it was being written from go with it:
  // a desk that is cleared and still lists six sources and four old drafts
  // has not been cleared.
  draftSources = [];
  draftVersions = [];
  renderDraftSources();
  renderDraftVersions();
  clearDraftTarget();
  setDraftStatus("");
  updateDraftCount();
  saveDraftLocally();
});
// Same pattern as #graph-help-toggle (asked for directly, then extended to
// every other tab that used to carry a permanently-visible explanation
// paragraph: Timeline, and the Skills/Whiteboard/Image-Gallery Library
// sub-tabs): the button's own `title` is a real, zero-JS hover tooltip, and
// a click opens a floating panel for reading the same text end to end.
// Closes on a second click, Escape, or a click outside it, the same three
// ways every other popover in this app closes. One shared wiring function
// rather than five copies of the same three listeners.
function initHelpToggle(buttonId, panelId) {
  wireHelpPopover($(buttonId), $(panelId));
}
initHelpToggle("search-relevance-help", "search-relevance-intro");
initHelpToggle("timeline-help", "timeline-intro");
initHelpToggle("skills-help", "skills-intro");
initHelpToggle("wb-boards-help", "wb-boards-intro");
initHelpToggle("library-images-help", "library-images-intro");
initHelpToggle("contents-help", "contents-intro");

// --- one wiring for every "?" added from here on --------------------------
// Asked for directly: *"there are also still areas with excessive paragraph
// text and I want to replace them with the circle tooltip '?' buttons so they
// dont take up unnecessary space"*, with the rule that they all share the same
// markup and behaviour, and that a new one needs no JS.
//
// So the seven `initHelpToggle` lines above are the last hand-wired pair. A
// new help button is markup only:
//
//   <button type="button" class="icon-only ghost small graph-help-toggle"
//           data-help-for="thing-help" aria-controls="thing-help"
//           aria-expanded="false" title="…" aria-label="…">
//     <i class="ph ph-question" aria-hidden="true"></i>
//   </button>
//   <div class="help-body hidden" id="thing-help" role="dialog" aria-label="…">…</div>
//
// Keyboard support is the reason this is a `<button>` and not a span with a
// click handler: focus + Enter (and Space) already dispatch `click`, so the
// "opens on focus+Enter" requirement is the platform's, not ours to
// reimplement. Escape, outside click and a second click all close, because
// `wireHelpPopover` is the single implementation of all three.
//
// Re-runnable, and `wireHelpPopover`'s own `panel.dataset.helpPopover` guard
// means a second pass over an already-wired pair does nothing, which matters
// because Settings renders some of its sections lazily.
//: **Every question the app offers to ask Atlas, in one table** (INBOX 224,
//: the owner: "also make atlas more accessible and have suggestions to ask it
//: something here and there like in tooltips or the help page in settings
//: etc."). Keyed by the id of the `data-help-for` panel it belongs under, so a
//: '?' popover and the question it suggests cannot describe two different
//: controls: they are looked up by the same key.
//:
//: Not all forty-nine popovers: a suggestion under a popover that already
//: answers the question is noise, and a table of forty-nine questions would be
//: forty-nine pieces of copy nobody re-reads. These are the panels whose
//: subject has more to it than the panel can hold.
const ATLAS_PROMPTS = {
  "command-palette-help": "What can the popup agent do that Chat cannot?",
  "help-chat-help": "What can you help me with?",
  "graph-show-help": "What do entity and board nodes add to the graph?",
  "autonomous-ai-help": "What can Atlas change in my notebook on its own?",
  "websearch-help": "How do I turn off web search?",
  "battery-mode-help": "What does Performance mode do?",
  "memory-help": "What does the app remember about me?",
  "backups-help": "Where are my backups kept, and how do I restore one?",
  "utility-model-help": "What is the utility model used for?",
  "templates-help": "How do I make a template of my own?",
  "statusbar-help": "What is the status bar telling me?",
};

//: The three offered before anything is asked. Here rather than in settings.js
//: so every piece of Atlas copy is in one file, and read from there.
//:
//: **Answerable, and about where you are** (INBOX 304, the owner: "the help
//: bot is useless, or the suggested questions are bad or both"). Two faults,
//: both measured. The first starter was "Where do reminders live?" and the
//: corpus could not reach its own reminders entry, so the panel's opening
//: offer was a question it answered with "I'm not sure": that half is fixed
//: in `help_chat.py`, and `test_every_question_the_app_offers_to_ask_atlas_is_answerable`
//: now reads both tables here against the corpus so it cannot come back. The
//: second is these three themselves: a fixed set on every tab, two of which
//: asked how to turn something off, which is a strange thing for an app to
//: suggest you ask about it first. The generic three now say what the guide
//: is, where a surface lives, and what the app keeps, and `ATLAS_TAB_STARTERS`
//: below puts the tab you are actually on first.
const ATLAS_STARTERS = [
  "What can you help me with?",
  "Where do reminders live?",
  "What does the app remember about me?",
];

//: Keyed exactly as `AGENT_TAB_STARTERS` is, and read through the same
//: `agentCurrentTab()`, because the two chat surfaces sit over the same tabs
//: and a second way of naming them is a second thing to keep in step. The
//: difference is what they offer: the agent's starters act on your notebook,
//: these ask what the surface in front of you is for. A tab with no entry
//: here simply shows the generic three.
const ATLAS_TAB_STARTERS = {
  dashboard: ["What can the dashboard show me?", "How do I change the widgets?"],
  notes: ["How does the app file a note?", "What is the writing room for?"],
  chat: ["What can the popup agent do that Chat cannot?", "What are skills?"],
  graph: ["What do entity and board nodes add to the graph?", "What is the graph for?"],
  library: ["What goes in the library?", "How does the whiteboard work?"],
  documents: ["Where do my documents live?", "How do I see a document's history?"],
  timeline: ["What does the timeline show?", "What can I do from the timeline?"],
  reminders: ["Where do reminders live?", "How do I make a reminder recurring?"],
};

//: The tab's questions first, topped up from the generic three, capped at
//: three: the same count the panel was designed around ("Three, not a wall",
//: index.html), and the same cap the reference notes themselves have.
function atlasStartersFor(tab) {
  const here = ATLAS_TAB_STARTERS[tab] || [];
  const out = here.slice(0, 3);
  for (const question of ATLAS_STARTERS) {
    if (out.length >= 3) break;
    if (!out.includes(question)) out.push(question);
  }
  return out;
}

//: The one door, so every suggestion in the app opens the same sheet with the
//: same question. settings.js owns the chat, and it loads after this file, so
//: this is checked rather than assumed: before settings.js has run there is no
//: sheet to open, and a suggestion pressed in that window should do nothing
//: rather than throw.
function askAtlasAbout(question) {
  if (typeof openHelpChat !== "function" || typeof askAtlas !== "function") return;
  openHelpChat();
  askAtlas(question);
}

//: The line at the foot of a help popover: the popover says what the control
//: does, and this offers the question it cannot answer in a paragraph. Added
//: here rather than written into forty-nine blocks of markup, and guarded by a
//: flag because `initHelpToggles` is re-runnable (Settings builds some of its
//: sections lazily).
function addAtlasLine(panel) {
  const question = ATLAS_PROMPTS[panel.id];
  if (!question || panel.dataset.atlasLine) return;
  panel.dataset.atlasLine = "1";
  // The one builder, so the offer looks the same in a popover as in an
  // empty state (`atlasSuggestion`).
  panel.appendChild(atlasSuggestion(question));
}

function initHelpToggles(root = document) {
  for (const trigger of root.querySelectorAll("[data-help-for]")) {
    const panel = document.getElementById(trigger.dataset.helpFor);
    if (!panel) continue;
    wireHelpPopover(trigger, panel);
    addAtlasLine(panel);
  }
}
window.initHelpToggles = initHelpToggles;
initHelpToggles();

//: The two empty states that are markup rather than script (the Chat tab's is
//: built in `renderChatEmptyState`). Appended once, here, so all three read
//: from the one builder: a hidden empty state is still in the document, so
//: there is nothing to wait for.
for (const [id, question] of [
  ["empty-message", "How does the app decide where a note goes?"],
  ["library-empty", "What can I keep in the Library?"],
]) {
  $(id)?.appendChild(atlasSuggestion(question));
}

//: **The concept-map door, in the tab people look for it in.** Reported: "the
//: concept map feature is there in the graph but I have no clue how to use it,
//: it isnt a labeled feature and is it even there actually??" It was real and
//: it was three levels away -- Library, then a sub-tab called Boards & maps,
//: then "+ Create", then "New concept map". This tab is already the map of
//: your notes; the only difference is that this one is drawn for you. So the
//: counterpart gets a labelled button here that lands on the maps themselves.
$("graph-concept-maps")?.addEventListener("click", () => {
  switchTab("library");
  document.querySelector('#library-subtabs button[data-target="library-view-whiteboard"]')?.click();
  // The sub-tab click can leave the last board open on the canvas; a button
  // called "Concept maps" has to arrive at the list of them.
  if (typeof wbShowBoardsLanding === "function") wbShowBoardsLanding();
});
restoreDraftLocally();

// --- note picker wiring ---
$("attach-note").addEventListener("click", () => {
  if (notePickerOpen()) closeNotePicker();
  else openNotePicker();
});

// --- image attachment wiring (vision-capable models) ---
$("attach-image").addEventListener("click", () => $("chat-image-input").click());
$("chat-image-input").addEventListener("change", async (e) => {
  if (e.target.files.length) await attachChatFiles(e.target.files);
  e.target.value = ""; // so choosing the same file twice still fires "change"
});
let notePickerSearchDebounceTimeout;
$("note-picker-search").addEventListener("input", () => {
  clearTimeout(notePickerSearchDebounceTimeout);
  notePickerSearchDebounceTimeout = setTimeout(renderNotePickerList, 150);
});
//: Switching source clears the search box: "cover" typed against notes means
//: nothing against a list of filenames, and a picker that opens on Files with
//: a stale query and no rows reads as an empty library.
for (const button of document.querySelectorAll("#note-picker-sources [data-picker-source]")) {
  button.addEventListener("click", () => {
    notePickerSource = button.dataset.pickerSource;
    for (const sibling of document.querySelectorAll("#note-picker-sources [data-picker-source]")) {
      const on = sibling === button;
      sibling.classList.toggle("active", on);
      sibling.setAttribute("aria-selected", String(on));
    }
    const search = $("note-picker-search");
    search.value = "";
    search.placeholder =
      notePickerSource === "notes"
        ? "Search your notes…"
        : `Search your ${notePickerSource}…`;
    renderNotePickerList();
    search.focus();
  });
}

$("note-picker-done").addEventListener("click", () => {
  closeNotePicker();
  $("chat-input").focus();
});
$("note-picker-clear").addEventListener("click", () => {
  //: Clear means clear. This emptied `attachedNoteIds` only, so pressing it
  //: with three files and a map ticked left every one of them staged while the
  //: count line under the button re-read "Nothing attached yet", the panel
  //: contradicting itself in two places at once.
  //:
  //: Images are deliberately not in this list. A staged image may hold a live
  //: object URL that has to be revoked when it is dropped (see the send path's
  //: own `URL.revokeObjectURL` loop and why it exists), and dropping one here
  //: without that would leak a Blob for the life of the tab. The four stores
  //: below are all ids of things that were already in the library.
  attachedNoteIds = [];
  attachedDocuments = [];
  attachedFiles = [];
  attachedBoards = [];
  renderAttachments();
  renderDocumentAttachments();
  renderFileAttachments();
  renderBoardAttachments();
  renderNotePickerList();
});
// Click-away and Escape close it, like every other popover in the app.
document.addEventListener("click", (event) => {
  if (!notePickerOpen()) return;
  // `.action-menu` for the same reason the notifications panel needs it: a
  // menu this panel owns is reparented to <body> while open, so a click on
  // one of its options is not a descendant of the panel and would otherwise
  // read as a click away.
  if (event.target.closest(".note-picker, .action-menu")) return;
  closeNotePicker();
});
$("note-picker-panel").addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    event.stopPropagation();
    closeNotePicker();
    $("attach-note").focus();
  }
});

// --- chat dock "more" disclosure wiring (§37C) ---
$("chat-dock-more-btn").addEventListener("click", () => {
  if (chatDockMoreOpen()) closeChatDockMore();
  else openChatDockMore();
});
document.addEventListener("click", (event) => {
  if (!chatDockMoreOpen()) return;
  if (event.target.closest(".chat-dock-more, .action-menu, .select-menu, .sheet-overlay")) return;
  closeChatDockMore();
});
$("chat-dock-more-panel").addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    event.stopPropagation();
    closeChatDockMore();
    $("chat-dock-more-btn").focus();
  }
});
$("chat-stop").addEventListener("click", () => chatController && chatController.abort());
$("chat-new").addEventListener("click", newChatConversation);
{
  const sortSelect = $("chat-sidebar-sort");
  sortSelect.value = localStorage.getItem(CHAT_SIDEBAR_SORT_KEY) || "recent";
  sortSelect.addEventListener("change", () => {
    localStorage.setItem(CHAT_SIDEBAR_SORT_KEY, sortSelect.value);
    loadConversationList();
  });
}
$("persona-peek").addEventListener("click", togglePersonaPrompt);
$("chat-tune-search").addEventListener("click", () => {
  closeChatDockMore();
  openSettingsModal("general", "search-relevance-group");
});
// Searching your chats lives in the Library now (§36F): with the documents,
// the files and the bin, and with sort beside it. This is the way there, said
// out loud, because a list that silently stops at eight is a list that has
// lost your chats.

function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// A typed find query is a literal, not a pattern: "a.b" must not match
// "axb", and an unbalanced "(" must not throw. CodeQL also flags the
// unescaped shape, and this file has already shipped one polynomial-ReDoS.
// Shared by the lightbox's document find and the global find bar below,
// rather than the same six-character regex copied twice.
function escapeForFind(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// --- global find bar (Ctrl+F on any tab except Documents, which keeps its
// own find-and-replace) -----------------------------------------------------
//
// Deliberately scoped to whichever `.tab-page:not(.hidden)` is currently on
// screen, not the whole document: searching the header, the status bar or a
// hidden tab's stale DOM would surface matches you could never scroll to,
// and the find-and-replace input's own value would match itself.
//
// **Known, accepted limit, not a bug**: the Notes list renders
// incrementally as you scroll (`renderIncrementally`) to keep a large
// notebook's DOM proportional to what's been scrolled past, a note not yet
// painted is not in the DOM yet and this cannot find it, the same limit a
// browser's own native find has on any virtualized list. `#note-search`
// (which filters the underlying data, not the rendered DOM) is the actual
// answer for "find a note I haven't scrolled to" and is not replaced by this.
let globalFindMatches = [];
let globalFindActive = -1;
//: **Find in the web reader is this bar, scoped to the page.** The reader's
//: own find button, or Ctrl+F while the focus is in the web panel with a page
//: open, roots the walk at the page's text rather than the whole Chat tab, so
//: "3 of 12" counts the article and not the conversation beside it. One find
//: bar, not a second one built for one panel.
let globalFindScope = null;

//: **Ctrl+F searches whatever is actually in front of you.** Asked for
//: directly: "allow the ctrl f find function to work within the settings
//: modal". Settings is a modal over the tab page, so a find rooted in the
//: visible `.tab-page` walked the notebook *behind* the dialog -- it found
//: nothing you could see and scrolled a page you were not looking at.
function globalFindWalkableRoot() {
  if (globalFindScope && globalFindScope.checkVisibility?.()) return globalFindScope;
  const settings = document.getElementById("settings-modal");
  if (settings && !settings.classList.contains("hidden")) return settings;
  return document.querySelector(".tab-page:not(.hidden)");
}

//: Settings hides fifteen of its sixteen sections, so a find rooted in the
//: modal only ever sees the one you are on. When a search comes up empty
//: there, this asks the other sections whether any of them contains the
//: words -- a plain `textContent.includes`, no walking and no highlighting --
//: and switches to the first that does, so Ctrl+F answers "where is the
//: setting for X" rather than "not on this page".
function settingsSectionContaining(needle) {
  const modal = document.getElementById("settings-modal");
  if (!modal || modal.classList.contains("hidden")) return null;
  const lower = needle.toLowerCase();
  for (const section of modal.querySelectorAll(".settings-section.hidden")) {
    if ((section.textContent || "").toLowerCase().includes(lower)) {
      return section.id.replace(/^settings-/, "");
    }
  }
  return null;
}

function globalFindClearHighlights() {
  for (const mark of document.querySelectorAll("mark.global-find-hit")) {
    mark.replaceWith(document.createTextNode(mark.textContent));
  }
  globalFindWalkableRoot()?.normalize();
  globalFindMatches = [];
  globalFindActive = -1;
}

let globalFindJumping = false;

function globalFindRun(needle) {
  globalFindClearHighlights();
  const root = globalFindWalkableRoot();
  const count = $("global-find-count");
  if (!needle || !root) {
    count.textContent = "";
    return;
  }
  const lower = needle.toLowerCase();
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      if (!node.nodeValue || !node.nodeValue.toLowerCase().includes(lower)) {
        return NodeFilter.FILTER_REJECT;
      }
      const el = node.parentElement;
      if (!el || el.closest("script, style, [hidden], .hidden")) {
        return NodeFilter.FILTER_REJECT;
      }
      // A note not yet scrolled into view by renderIncrementally, or a
      // collapsed section, has zero size, nothing to scroll to, so nothing
      // to count as a match. The same reasoning contrastAudit's own visible-
      // text walk used.
      const rect = el.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return NodeFilter.FILTER_REJECT;
      return NodeFilter.FILTER_ACCEPT;
    },
  });
  const targets = [];
  let node;
  while ((node = walker.nextNode())) targets.push(node);
  // Nothing on this Settings page, try the other fifteen before giving up.
  //
  // `globalFindJumping` is not belt-and-braces. showSettingsSection hides the
  // section it moves away from, so without it a needle that lives only inside
  // a *collapsed* part of some section would switch to that section, find
  // nothing again, and be free to switch to the next one for ever, the
  // sections take it in turns being the hidden one.
  if (!targets.length && !globalFindJumping) {
    const jump = settingsSectionContaining(needle);
    if (jump && typeof showSettingsSection === "function") {
      globalFindJumping = true;
      try {
        showSettingsSection(jump);
        globalFindRun(needle);
      } finally {
        globalFindJumping = false;
      }
      return;
    }
  }
  const pattern = new RegExp(escapeForFind(needle), "gi");
  for (const textNode of targets) {
    const parts = textNode.nodeValue.split(new RegExp(`(${escapeForFind(needle)})`, "gi"));
    if (parts.length < 2) continue;
    const frag = document.createDocumentFragment();
    for (const part of parts) {
      if (pattern.test(part) && part.toLowerCase() === lower) {
        const mark = document.createElement("mark");
        mark.className = "global-find-hit";
        mark.textContent = part;
        frag.appendChild(mark);
      } else if (part) {
        frag.appendChild(document.createTextNode(part));
      }
    }
    textNode.replaceWith(frag);
  }
  globalFindMatches = [...root.querySelectorAll("mark.global-find-hit")];
  globalFindActive = globalFindMatches.length ? 0 : -1;
  globalFindShowActive();
}

function globalFindShowActive() {
  const count = $("global-find-count");
  for (const mark of globalFindMatches) mark.classList.remove("global-find-current");
  if (!globalFindMatches.length) {
    count.textContent = "No matches";
    return;
  }
  const mark = globalFindMatches[globalFindActive];
  mark.classList.add("global-find-current");
  mark.scrollIntoView({ block: "center", behavior: "smooth" });
  count.textContent = `${globalFindActive + 1} of ${globalFindMatches.length}`;
}

function globalFindStep(delta) {
  if (!globalFindMatches.length) return;
  globalFindActive = (globalFindActive + delta + globalFindMatches.length) % globalFindMatches.length;
  globalFindShowActive();
}

function openGlobalFind(opts = {}) {
  const reader = document.getElementById("web-reader");
  const readerOpen = reader && !reader.classList.contains("hidden") && reader.checkVisibility?.();
  const scopeReader =
    readerOpen &&
    (opts.scope === "web-reader" || Boolean(document.activeElement?.closest?.("#web-panel")));
  const scope = scopeReader ? document.getElementById("web-reader-text") : null;
  if (scope !== globalFindScope) {
    globalFindClearHighlights();
    globalFindScope = scope;
  }
  const findInput = document.getElementById("global-find-input");
  if (findInput) {
    const words = scope ? "Find in this page" : "Find on this page";
    findInput.placeholder = `${words}…`;
    findInput.setAttribute("aria-label", words);
  }
  // Ctrl+F while the lightbox's own document find is already showing
  // should reach *that* one instead of stacking a second bar behind the
  // overlay it's not even visible through, the lightbox's find is real
  // extracted text with nothing else underneath it, the same job this bar
  // does for a tab.
  const lightboxFind = document.querySelector(".lightbox .lightbox-find:not(.hidden)");
  if (lightboxFind) {
    lightboxFind.focus();
    return;
  }
  // **A board is the same handoff as the lightbox, for the same reason.**
  // This bar walks the DOM of the visible tab and highlights text nodes, on
  // an open whiteboard that is the wrong tool twice over: the cards are laid
  // out inside a zoomed, transformed canvas layer, so a `mark` around a match
  // sits wherever the pan happens to have left it and often off-screen
  // entirely, and a card can be scrolled far outside the viewport with no
  // scrollIntoView that means anything on an infinite canvas. The board has
  // its own find, which pans the viewport to each match, send Ctrl+F there.
  //: **Find is scoped to what is in front of you.** With Settings open, the
  //: page-wide bar searched the tab hidden behind the dialog; Settings has
  //: its own search, which filters its panes, so Ctrl+F goes there.
  const settingsOpen = !$("settings-modal")?.classList.contains("hidden");
  if (settingsOpen && $("settings-search")) {
    $("settings-search").focus();
    $("settings-search").select();
    return;
  }
  const wbCanvas = document.getElementById("wb-canvas-view");
  const wbView = document.getElementById("library-view-whiteboard");
  if (
    wbCanvas && !wbCanvas.classList.contains("hidden") &&
    wbView && !wbView.classList.contains("hidden") &&
    typeof wbOpenBoardSearch === "function"
  ) {
    wbOpenBoardSearch();
    return;
  }
  const bar = $("global-find-bar");
  bar.classList.remove("hidden");
  const input = $("global-find-input");
  input.focus();
  input.select();
  if (input.value) globalFindRun(input.value);
}

function closeGlobalFind() {
  $("global-find-bar").classList.add("hidden");
  globalFindClearHighlights();
  globalFindScope = null;
  $("global-find-input").value = "";
}

$("global-find-input")?.addEventListener("input", (e) => globalFindRun(e.target.value.trim()));
$("global-find-input")?.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    e.preventDefault();
    globalFindStep(e.shiftKey ? -1 : 1);
  } else if (e.key === "Escape") {
    e.preventDefault();
    // Without this the same Escape also reaches the app-wide handler and
    // closes whatever dialog the find bar is searching -- Settings, now that
    // Ctrl+F works inside it. Escape closes the find bar; a second one closes
    // the dialog.
    e.stopPropagation();
    closeGlobalFind();
  }
});
$("global-find-next")?.addEventListener("click", () => globalFindStep(1));
$("global-find-prev")?.addEventListener("click", () => globalFindStep(-1));
$("global-find-close")?.addEventListener("click", () => closeGlobalFind());
// Switching tabs while the bar is open would otherwise leave it searching a
// now-hidden page, or (worse) leave <mark> wrappers stuck inside a tab-page
// that a later feature might re-render around and lose track of.
window.addEventListener("tabSwitched", () => {
  if (!$("global-find-bar").classList.contains("hidden")) closeGlobalFind();
});

$("conv-browse-all").addEventListener("click", async () => {
  //: Awaited: `libraryKind` is a `let` in library.js and the two renders are
  //: its functions, so all three need that file present (A1). Without the
  //: await the assignment would create a stray global that library.js then
  //: shadows, and the Library would open unfiltered.
  await switchTab("library");
  libraryKind = "chat";
  renderLibraryFilters();
  renderLibrary();
});
$("chat-export").addEventListener("click", exportChatMarkdown);

//: **Fork: keep this thread, try another direction.** Asked for directly.
//: The server copies (`POST /conversations/{id}/fork`) rather than branching: 
//: see that route's docstring for why a tree with shared ancestry is the
//: wrong size of machinery for one JSON blob per chat.
//:
//: Only meaningful once something has been said, so the button hides itself
//: on an empty pane rather than offering to duplicate nothing.
$("chat-fork").addEventListener("click", async () => {
  if (!chatConv || chatConv.id === null) {
    toast("Nothing to fork yet, ask something first.");
    return;
  }
  try {
    const fork = await apiJson(`/conversations/${chatConv.id}/fork`, {
      method: "POST",
      body: JSON.stringify({}),
    });
    await loadConversationList();
    toastAction(`Forked to “${fork.title}”.`, "Open it", () => openConversation(fork.id));
  } catch (error) {
    toast(error.message || "Couldn't fork this conversation.", true);
  }
});

//: Renaming, where the name is. It used to mean leaving the tab and finding
//: the chat in the Library, for a property whose whole purpose is helping
//: you recognise the thread you are currently looking at.
//: **A name you give before there is anything to name.**
//:
//: Reported: *"the click to rename this conversation button doesnt work."* It
//: did nothing, silently, and the reason is the guard this used to open with:
//: a chat has no row until its first message is sent (`convRef.id === null`
//: until the POST in `sendChatMessage` comes back), so on a fresh chat, which
//: is exactly when you would want to name the thing you are about to start, 
//: the handler returned before it did anything at all. No toast, no dialog,
//: no clue.
//:
//: A pending title rather than an error message: the name is remembered and
//: applied the moment the conversation exists. It also *wins over the AI's own
//: retitle*, which is the whole point, a thread someone bothered to name must
//: not be renamed out from under them three seconds later.
let chatPendingTitle = null;

async function renameCurrentConversation() {
  if (!chatConv) return;
  const current = $("chat-title").textContent;
  const next = await promptDialog("Rename this conversation:", current);
  if (!next || next === current) return;
  if (chatConv.id === null) {
    chatPendingTitle = next;
    $("chat-title").textContent = next;
    toast("Named. It is saved with your first message.");
    return;
  }
  try {
    await apiJson(`/conversations/${chatConv.id}`, {
      method: "PUT",
      body: JSON.stringify({ title: next }),
    });
    $("chat-title").textContent = next;
    loadConversationList();
  } catch (error) {
    toast(error.message || "Couldn't rename this conversation.", true);
  }
}

//: Called by both places that create a conversation from the composer. Silent
//: and best-effort: a title that fails to stick is worth a wrong name in the
//: sidebar, not an error over the answer that just arrived.
function applyPendingChatTitle(conversationId, viewing) {
  const wanted = chatPendingTitle;
  chatPendingTitle = null;
  if (!wanted) return false;
  if (viewing) $("chat-title").textContent = wanted;
  apiJson(`/conversations/${conversationId}`, {
    method: "PUT",
    body: JSON.stringify({ title: wanted }),
    silent: true,
  })
    .then(() => loadConversationList())
    .catch(() => {});
  return true;
}

//: Built once, at boot, the header's ⋯ is the same for every conversation,
//: unlike a note card's, which is rebuilt per row.
mountChatActionsMenu();

//: The meter opens the thing that fixes what it is reporting. A number with no
//: move attached is a number people learn to ignore.
$("chat-context")?.addEventListener("click", () => $("chat-compress")?.click());

$("chat-title").addEventListener("click", renameCurrentConversation);
$("chat-title").addEventListener("keydown", (event) => {
  //: Space and Enter, because this is a `<h2 role="button">` and the browser
  //: only gives those two keys to a real `<button>` for free.
  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    renameCurrentConversation();
  }
});
$("chat-delete").addEventListener("click", deleteCurrentChat);
$("chat-compress").addEventListener("click", compressChatContext);
$("chat-compress-apply").addEventListener("click", applyCompression);
$("chat-compress-cancel").addEventListener("click", () =>
  $("chat-compress-panel").classList.add("hidden")
);
$("chat-uncompress").addEventListener("click", () => {
  // Undo is one assignment, because nothing was ever removed, the turns have
  // been sitting there all along.
  chatSummary = null;
  renderCompressionState();
  toast("Back to sending the real messages.");
});
// Debounced, because the matcher walks every installed skill and this fires on
// every keystroke. 250ms is under the pause between words, so the suggestion is
// there by the time you stop typing to read it, and never mid-word.
let chatNudgeTimer = null;
$("chat-input").addEventListener("input", () => {
  clearTimeout(chatNudgeTimer);
  chatNudgeTimer = setTimeout(() => {
    // Emptying the box by hand is the same event as sending, as far as the
    // suggestions are concerned: the draft they were about is gone.
    if (!$("chat-input").value.trim()) resetChatNudge();
    else renderChatNudge();
  }, 250);
});
//: The composer's recall position: an index into the conversation's sent
//: messages, or null when the box holds your own typing. `draft` is what was
//: in the box before the first step, given back past the newest.
const chatRecall = { index: null, draft: "" };

function chatRecallStep(box, direction) {
  const sent = [...document.querySelectorAll("#chat-messages .msg.user")]
    .map((bubble) => bubble.dataset.sent)
    .filter(Boolean);
  if (!sent.length) return false;
  const recalled = chatRecall.index !== null && box.value === sent[chatRecall.index];
  if (!recalled) {
    //: Only from an empty box: text you are writing keeps its arrow keys.
    if (box.value || direction > 0) return false;
    chatRecall.draft = box.value;
    chatRecall.index = sent.length;
  }
  const next = chatRecall.index + direction;
  if (next < 0) return true;
  if (next >= sent.length) {
    chatRecall.index = null;
    box.value = chatRecall.draft;
  } else {
    chatRecall.index = next;
    box.value = sent[next];
  }
  box.setSelectionRange(box.value.length, box.value.length);
  box.dispatchEvent(new Event("input", { bubbles: true }));
  return true;
}

$("chat-input").addEventListener("keydown", (e) => {
  // Enter sends, Shift+Enter (or Ctrl/Cmd+Enter) writes a newline. The box is
  // a textarea now, so "send" has to be chosen rather than inherited.
  if (e.key === "Enter" && !e.shiftKey && !e.ctrlKey && !e.metaKey) {
    e.preventDefault();
    sendChatMessage();
    return;
  }
  //: **ArrowUp and ArrowDown step through what you sent**, the way a terminal
  //: or a chat app's composer does (the owner, 2026-09-24: "the small things
  //: every user expects", then "include down arrow as well to toggle between
  //: previous inputs"). Up from an empty box (or from a recalled message you
  //: have not changed) fills the box with the one before; Down walks back to
  //: the newest, then to what you had typed. A box you have typed into keeps
  //: its arrows for moving the caret.
  if ((e.key === "ArrowUp" || e.key === "ArrowDown") && !e.shiftKey && !e.altKey && !e.ctrlKey && !e.metaKey) {
    if (chatRecallStep(e.target, e.key === "ArrowUp" ? -1 : 1)) e.preventDefault();
  }
});
$("persona-select").addEventListener("change", async () => {
  // Remember the choice so the Notes quick-ask uses the same persona.
  const persona = $("persona-select").value;
  await apiJson("/preferences", {
    method: "PUT",
    body: JSON.stringify({ active_persona: persona }),
  }).catch(() => {});
  // Update the local cache too, not just the server, renderChatEmptyState()
  // and the Notes quick-ask both read prefsCache.active_persona directly,
  // and neither reloads preferences on its own after this change.
  if (prefsCache) prefsCache.active_persona = persona;
  // If a fresh, empty chat is on screen right now, its greeting named the
  // *previous* persona: redraw it rather than leaving it stale until the
  // next "+ New" (ROADMAP Tier 3 §21).
  if ($("chat-messages").querySelector(".chat-empty")) {
    $("chat-messages").querySelector(".chat-empty").remove();
    renderChatEmptyState();
  }
});
// **Preview for the note composer.** Asked for directly: a way to see the
// highlight and text colours while writing, and to click a word to edit it.
//
// Reuses `liveMarkdownRenderer` (debounced, already used by the streaming
// answer pane) and `renderMarkdown` rather than growing a second renderer, 
// the document editor's Live view proves that path already renders
// everything, colours included.
//
// Deliberately *not* a copy of that Live view's per-block click-to-edit. That
// machinery is built around a full-page editor with `docLiveBlocks`,
// `docLiveActive` and a per-block textarea; a three-row composer does not
// need a block model, and a second copy of one would be the third place in
// this app that decides what a block is. The click behaviour people actually
// want from a preview, "let me fix that word", is served by going back to
// the box with the caret already on the words that were clicked.
let entryPreviewRender = null;

function entryPreviewOn() {
  return !$("entry-preview").classList.contains("hidden");
}

function paintEntryPreview() {
  if (!entryPreviewOn()) return;
  entryPreviewRender ??= liveMarkdownRenderer($("entry-preview"));
  const text = $("entry-content").value;
  entryPreviewRender(text.trim() ? text : "_Nothing to preview yet._");
}

function setEntryPreview(on) {
  const preview = $("entry-preview");
  const box = $("entry-content");
  const toggle = $("entry-preview-toggle");
  preview.classList.toggle("hidden", !on);
  box.classList.toggle("hidden", on);
  toggle.setAttribute("aria-pressed", String(on));
  toggle.classList.toggle("is-active", on);
  if (on) {
    paintEntryPreview();
  } else {
    box.focus();
  }
}

// Put the caret where the click landed. There is no exact mapping from a
// rendered node back to an offset in the source, the markup that produced it
// has been consumed: so this looks up the clicked node's own text in the
// source and lands on it. Wrong only when the same words appear twice, where
// it picks the first, which still beats the caret going to position zero.
function caretAtClickedText(node) {
  const box = $("entry-content");
  const clicked = (node?.textContent || "").trim().slice(0, 60);
  const at = clicked ? box.value.indexOf(clicked) : -1;
  setEntryPreview(false);
  if (at === -1) return;
  box.setSelectionRange(at, at + clicked.length);
}

$("entry-preview-toggle")?.addEventListener("click", () => setEntryPreview(!entryPreviewOn()));
$("entry-preview")?.addEventListener("click", (event) => {
  caretAtClickedText(event.target);
});
$("entry-preview")?.addEventListener("keydown", (event) => {
  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    setEntryPreview(false);
  }
});
// Typing with the preview open (via the toolbar, which writes into the box
// while it is hidden) must still repaint it.
$("entry-content")?.addEventListener("input", paintEntryPreview);

//: The persona the greeting speaks as: the override, or Chat's own when the
//: override is "Same as Chat", or the assistant's name when Chat has none.
function dashboardGreetingPersona() {
  return (prefsCache && prefsCache.dashboard_persona) || $("persona-select")?.value || aiNameNow();
}

//: Its face beside the picker (the owner: "I want the persona avatar to
//: appear next to where you set the persona for the dashboard greeting").
function paintDashboardPersonaMark() {
  fillPersonaMark($("dashboard-persona-mark"), dashboardGreetingPersona(), 28);
}

$("dashboard-persona-select").addEventListener("change", async () => {
  const persona = $("dashboard-persona-select").value;
  //: Set before the save, not after it: the mark and the dashboard's face
  //: read it, and a second change while the first save was in flight was
  //: drawn from the old value (the owner: "when I changed the persona
  //: again, it didnt change again").
  if (prefsCache) prefsCache.dashboard_persona = persona;
  paintDashboardPersonaMark();
  if (typeof paintDashEmblem === "function") paintDashEmblem();
  await apiJson("/preferences", {
    method: "PUT",
    body: JSON.stringify({ dashboard_persona: persona }),
  }).catch(() => {});
  toast(persona ? `Dashboard greeting now speaks as ${persona}.` : "Dashboard greeting back to matching Chat.");
});
$("dashboard-greeting-regenerate")?.addEventListener("click", async () => {
  const btn = $("dashboard-greeting-regenerate");
  const status = $("dashboard-greeting-status");
  btn.disabled = true;
  //: The persona actually asked, not always Atlas (the owner: "I set the
  //: dashboard greeting to another persona, but when I hit regenerate, it
  //: said asking Atlas").
  const who = dashboardGreetingPersona();
  if (status) status.textContent = `Asking ${who}…`;
  const ok = await refreshAiGreeting(true).catch(() => false);
  btn.disabled = false;
  if (status) status.textContent = ok ? "New greeting set." : `Couldn't reach ${who}, kept the current one.`;
  setTimeout(() => { if (status) status.textContent = ""; }, 3000);
});
for (const id of RESPONSE_MODE_SELECTS) {
  $(id)?.addEventListener("change", (e) => setResponseMode(e.target.value));
}
// The AI status dot. Hover is CSS; these are the paths hover doesn't cover: 
// touch, where there is no hover at all, and keyboards.
$("ai-status").addEventListener("click", () => toggleAiStatusPopup());
document.addEventListener("click", (event) => {
  // Anywhere outside closes it, the way every other popover here behaves.
  if (!event.target.closest(".ai-status-wrap")) toggleAiStatusPopup(false);
});
$("ai-status").addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    toggleAiStatusPopup(false);
    $("ai-status").focus();
  }
});

// The status bar (§36D). Every item goes somewhere: a count you cannot act on
// is a number, and a number in permanent furniture is the decoration the
// roadmap warned this bar would become if anything was added without a job.
$("status-notes").addEventListener("click", () => {
  switchTab("notes");
  showNotesSection("browse"); // or you land on whichever sub-tab was last open
});
$("status-reminders").addEventListener("click", () => switchTab("reminders"));
$("status-task").addEventListener("click", () => openSettingsModal("tasks"));
$("status-command").addEventListener("click", () => openPalette());
$("status-agent")?.addEventListener("click", () => toggleAgentPalette());
//: settings.js owns the Guide sheet and loads after this file, so the lookup
//: is deferred to the click rather than taken now. The same shape the phone's
//: More sheet already uses for the same function.
$("status-guide")?.addEventListener("click", () => {
  if (typeof openHelpChat === "function") openHelpChat();
});

$("status-find")?.addEventListener("click", () => openFinder());

//: The dashboard's own doorway to the same dialog. `keydown` as well as
//: `click`, so a person who starts typing at it is not told to press it
//: first: the letter they typed opens the dialog and is the first letter of
//: the query, which is what a field would have done.
const dashFind = $("dash-find");
if (dashFind) {
  dashFind.addEventListener("click", () => openFinder());
  dashFind.addEventListener("keydown", (event) => {
    if (event.key.length !== 1 || event.ctrlKey || event.metaKey || event.altKey) return;
    event.preventDefault();
    openFinder(event.key);
    //: Opened with the letter already in it, so `openFinder`'s own `select()`
    //: would highlight it and the next keystroke would replace it.
    const input = document.getElementById("finder-input");
    if (input) input.setSelectionRange(input.value.length, input.value.length);
  });
  const keysHint = dashFind.querySelector(".dash-find-keys");
  if (keysHint) keysHint.textContent = STATUS_META_KEY.startsWith("\u2318") ? "\u2318P" : "Ctrl P";
}

// Paint it before any poll lands, so the bar is furniture from the first frame
// rather than four boxes that pop into existence a second later.
renderStatusBar();

$("persona-add").addEventListener("click", addPersona);
$("skill-add").addEventListener("click", addSkill);
$("skill-cancel").addEventListener("click", stopEditingSkill);
$("skill-verify-expect").addEventListener("change", syncSkillVerifyRow);
$("graph-refresh").addEventListener("click", () => {
  graphHighlightIds = null; // a refresh clears any "similar notes" spotlight
  renderGraph();
});
$("graph-export-png")?.addEventListener("click", exportGraphPng);
// Direct instruction: "I want to be able to unroot and reset the graph to
// free float if I want with a button." One request releases every pinned
// node at once (routes_graph.py's unpin_all_nodes) rather than tracking
// each one down to double-click it individually; renderGraph() afterwards
// re-fetches from /graph, which is what actually clears fx/fy, the same
// path #graph-refresh already uses, so a freshly unpinned layout settles
// through the ordinary simulation rather than a special-cased one.
$("graph-unpin-all")?.addEventListener("click", async (event) => {
  // The button rides the Physics fold's own `<summary>` (index.html), so a
  // press on it is also a press on the disclosure. `preventDefault` cancels
  // the summary's activation behaviour and nothing else: a `type="button"`
  // has no default action of its own to lose.
  event.preventDefault();
  try {
    const result = await apiJson("/graph/unpin-all", { method: "POST" });
    graphHighlightIds = null;
    await renderGraph();
    toast(
      result.unpinned
        ? `${result.unpinned} note${result.unpinned === 1 ? "" : "s"} released: the layout can move freely again.`
        : "Nothing was pinned."
    );
  } catch (error) {
    toast(error.message || "Couldn't unpin the graph.", true);
  }
});
$("graph-similarity").addEventListener("change", renderGraph);
$("graph-entities")?.addEventListener("change", renderGraph);
$("graph-documents")?.addEventListener("change", renderGraph);
$("graph-maps")?.addEventListener("change", renderGraph);
// The tuned-once controls, folded away. Remembered, because whether you want
// physics sliders on screen is a property of how you use the map rather than
// of one visit: and because a panel that reopens closed every time is one
// people stop opening.
// Each fold in the options panel remembers whether it is open, for the reason
// the panel itself does: which of these you want on screen is a property of
// how you use the map, not of one visit. Closed is the default, which is what
// gets the list back under the panel's own cap (GRAPH_PLAN, "Decision made,
// 2026-09-20"); a fold you opened stays open until you close it.
function initGraphOptionFolds() {
  for (const fold of document.querySelectorAll("#graph-options details.graph-options-fold")) {
    if (fold._foldWired || !fold.id) continue;
    fold._foldWired = true;
    const key = `graph-fold-${fold.id}`;
    try {
      fold.open = localStorage.getItem(key) === "1";
    } catch (error) {
      fold.open = false;
    }
    fold.addEventListener("toggle", () => {
      try {
        localStorage.setItem(key, fold.open ? "1" : "0");
      } catch (error) {
        /* A browser with storage refused still folds, it just forgets. */
      }
    });
  }
}
initGraphOptionFolds();

function setGraphOptionsOpen(open) {
  const panel = $("graph-options");
  const toggle = $("graph-options-toggle");
  if (!panel || !toggle) return;
  //: **Below 600 the panel never floats** (UI_MODERNISATION_PLAN Phase 11
  //: item 4). Measured at 390x844 on the running app: open, it is 350x288
  //: over a map that is 362x653, which is 42% of the map covered by a panel
  //: whose own content is 795px scrolling inside 286px. The same controls
  //: are the sheet below, so the saved "open" pref still rides here (a
  //: window widened again opens what it had open) and only the floating
  //: half is refused.
  const phone = window.matchMedia(PHONE_TABS).matches;
  panel.classList.toggle("hidden", !open || phone);
  toggle.setAttribute("aria-expanded", String(open && !phone));
  toggle.classList.toggle("is-on", open && !phone);
  localStorage.setItem("graph-options-open", open ? "1" : "0");
}

// --- the graph's controls on a phone: one sheet -------------------------------
// UI_MODERNISATION_PLAN Phase 11 item 4, "the docks as one bottom sheet with
// the colour rule, groups and views". At 390 the Graph tab answers a question
// about the map in one of three places: the gear's floating panel (physics,
// what to show, time, groups, the minimap, suggest links), the View menu
// (layout, the colour rule, Trace, the legend) and the ⋯ menu (saved views,
// export). Each opens *over* the 362x653 map it is about, and the first of
// them covers 42% of it.
//
// One sheet instead, from the gear, holding all three in that order: what the
// map is, then what it shows, then what is saved. The same elements, moved in
// while it is open and put back on close, so every handler, every id and every
// saved preference is the one that was already there; nothing about this
// surface is built twice. Above 600 nothing changes: the gear opens its panel
// and the two menus are menus.
//
// The two `<details>` are hidden by the stylesheet below 600 rather than
// emptied, because what is in them moves and comes back: an opener whose menu
// is somewhere else is an opener that opens nothing.
let graphSheetClose = null;

//: `#graph-options` moves as itself, keeping its class, so the rules written
//: for `.graph-options .dock-menu-section` still reach its sections inside
//: the sheet; the two menus' children move into a holder wearing the menu
//: list's own classes, for the same reason. What is deliberately left behind
//: is the folded arrange zone: below 1100 `foldDockArrange` parks the View
//: menu *inside* the ⋯ menu's list, so taking that list's children whole
//: would bring an emptied View menu into the sheet under the rows that came
//: out of it.
function graphControlsSheetParts() {
  const viewList = document.querySelector("#graph-view-menu .dock-menu-list");
  const moreList = document.querySelector("#graph-more-menu .dock-menu-list");
  const options = $("graph-options");
  const groups = [];
  if (viewList) groups.push({ holder: "menu", nodes: [...viewList.children] });
  if (options) groups.push({ holder: "options", nodes: [options] });
  if (moreList) {
    groups.push({
      holder: "menu",
      nodes: [...moreList.children].filter(
        (el) => !el.classList.contains("dock-arrange") && !el.classList.contains("dock-arrange-label")
      ),
    });
  }
  return groups.filter((group) => group.nodes.length);
}

function openGraphControlsSheet(opener) {
  if (graphSheetClose) return;
  const groups = graphControlsSheetParts();
  if (!groups.length) return;
  // Where each node came from, taken before anything moves: a node's parent
  // and the sibling it sat in front of are what put it back exactly.
  const home = [];
  for (const group of groups) {
    for (const node of group.nodes) home.push({ node, parent: node.parentNode, next: node.nextSibling });
  }
  const panel = $("graph-options");
  const wasHidden = panel ? panel.classList.contains("hidden") : true;
  opener?.setAttribute("aria-expanded", "true");
  graphSheetClose = openSheet({
    label: "Map controls",
    name: "graph",
    returnFocus: opener,
    build: (card) => {
      const body = document.createElement("div");
      body.className = "graph-controls-body";
      for (const group of groups) {
        if (group.holder === "options") {
          for (const node of group.nodes) {
            node.classList.remove("hidden");
            body.appendChild(node);
          }
          continue;
        }
        const holder = document.createElement("div");
        holder.className = "doc-dock-menu-list dock-menu-list";
        for (const node of group.nodes) holder.appendChild(node);
        body.appendChild(holder);
      }
      card.appendChild(body);
    },
    onClose: () => {
      for (const spot of home) spot.parent.insertBefore(spot.node, spot.next);
      if (panel && wasHidden) panel.classList.add("hidden");
      graphSheetClose = null;
      opener?.setAttribute("aria-expanded", "false");
    },
  });
}

$("graph-options-toggle").addEventListener("click", (event) => {
  // The click must not reach the document listener below, which would read
  // the panel it has just opened as a click outside it and close it again.
  event.stopPropagation();
  if (window.matchMedia(PHONE_TABS).matches) {
    if (graphSheetClose) graphSheetClose();
    else openGraphControlsSheet(event.currentTarget);
    return;
  }
  setGraphOptionsOpen($("graph-options").classList.contains("hidden"));
});
//: A window dragged across the boundary with the sheet open would leave the
//: map's controls in a dialog the desktop layout has no opener for, and the
//: fold below 1100 moves one of the pieces the sheet borrowed. Closing puts
//: every one of them back where the width that is arriving expects it.
window.matchMedia(PHONE_TABS).addEventListener("change", () => graphSheetClose?.());
// A popover closes the three ways every popover in this app closes: its own
// button, a click outside it, and Escape. It gained the last two when it
// stopped being a strip in the column and became the gear's menu (INBOX 21):
// a panel anchored to a button that only that button can dismiss is the one
// shape a menu never has.
document.addEventListener("click", (event) => {
  const panel = $("graph-options");
  if (!panel || panel.classList.contains("hidden")) return;
  if (panel.contains(event.target) || $("graph-options-toggle").contains(event.target)) return;
  setGraphOptionsOpen(false);
});
document.addEventListener("keydown", (event) => {
  if (event.key !== "Escape") return;
  const panel = $("graph-options");
  if (!panel || panel.classList.contains("hidden")) return;
  // **The Escape is spent here.** The full-screen handler further down is on
  // the same target for the same key, and listener order alone does not stop
  // it: the comment there says a panel over the map "takes the first Escape",
  // which was only ever true if something actually stopped the event. One key
  // press that closes a panel and leaves full screen at the same time is the
  // bug that sentence was written to prevent.
  event.stopImmediatePropagation();
  setGraphOptionsOpen(false);
});
// Trace (§9), folded away the same way Options is (§37F): it is a mode you
// step into to ask one question, not a strip worth drawing on every visit.
// Closing it does not clear an active trace: the path stays drawn on the map
// itself, the same as Options' sliders keep their values while hidden.
$("graph-trace-toggle").addEventListener("click", () =>
  setTracePanelOpen($("graph-trace").classList.contains("hidden"))
);
// Replaced the permanently-visible "How to use this map" dropdown with this
// icon: the button's own `title` already covers hover/focus (a real,
// zero-JS tooltip), and this click handler adds the panel for reading it
// end to end. Closes on a second click, Escape, or a click outside it, 
// the same three ways every other popover in this app closes.
$("graph-help-toggle").addEventListener("click", (event) => {
  event.stopPropagation();
  const panel = $("graph-help-panel");
  const open = panel.classList.toggle("hidden") === false;
  $("graph-help-toggle").setAttribute("aria-expanded", String(open));
});
document.addEventListener("click", (event) => {
  const panel = $("graph-help-panel");
  if (!panel || panel.classList.contains("hidden")) return;
  if (panel.contains(event.target) || event.target === $("graph-help-toggle")) return;
  panel.classList.add("hidden");
  $("graph-help-toggle").setAttribute("aria-expanded", "false");
});
document.addEventListener("keydown", (event) => {
  if (event.key !== "Escape") return;
  const panel = $("graph-help-panel");
  if (!panel || panel.classList.contains("hidden")) return;
  // Same as the options panel above: closing this is what this Escape did,
  // so the full-screen handler does not get to act on the same press.
  event.stopImmediatePropagation();
  panel.classList.add("hidden");
  $("graph-help-toggle").setAttribute("aria-expanded", "false");
});
$("graph-focus-clear").addEventListener("click", () => {
  graphFocusModeId = null;
  recordTabVisit("graph", null);
  $("graph-focus-clear").classList.add("hidden");
  renderGraph();
  toast("Exited Focus Mode.");
});
$("graph-highlight-clear").addEventListener("click", () => {
  graphHighlightIds = null;
  applyGraphHighlight();
  toast("Highlight cleared.");
});
//: The trace strip's X leaves trace mode, strip and result both, the same
//: as Escape: it used to be `clearTrace()`, which kept the mode on and only
//: reset the two ends, under a tooltip that said it left (INBOX 421 d).
$("graph-trace-clear").addEventListener("click", () => setTracePanelOpen(false));
// The legend's own collapse: asked for twice: "the categories toggle line
// needs to be collapsible or redesigned." A fixed row taken from the
// canvas whether or not anyone reads it; collapsing it reclaims that row
// entirely. Persisted like the graph's other view preferences
// (graph-colour, right above) rather than reset every visit.
(() => {
  const row = document.querySelector(".graph-legend-row");
  const toggle = $("graph-legend-toggle");
  if (!row || !toggle) return;
  const apply = (collapsed) => {
    row.classList.toggle("legend-collapsed", collapsed);
    toggle.setAttribute("aria-expanded", String(!collapsed));
    toggle.title = collapsed ? "Show the legend" : "Hide the legend";
    toggle.setAttribute("aria-label", toggle.title);
    // A menu item, not the bare caret it was when it sat in the strip: the
    // dock's View menu (Phase 8) names what each row does, and a row that is
    // only an arrow names nothing.
    setLabel(toggle, collapsed ? "ph:eye Show legend" : "ph:eye-slash Hide legend");
  };
  apply(localStorage.getItem("graphLegendCollapsed") === "1");
  toggle.addEventListener("click", () => {
    const collapsed = !row.classList.contains("legend-collapsed");
    apply(collapsed);
    localStorage.setItem("graphLegendCollapsed", collapsed ? "1" : "0");
  });
})();
// What the colours mean, remembered like the layout is, it is a property of
// how you read your notebook, not of one visit.
$("graph-colour").addEventListener("change", (event) => {
  localStorage.setItem("graph-colour", event.target.value);
  renderGraph();
});
$("graph-hide-orphans").addEventListener("change", renderGraph);
// Labels toggle just flips a class, no need to rebuild the whole map.
$("graph-labels").addEventListener("change", (e) => {
  $("graph-box").classList.toggle("graph-labels-hidden", !e.target.checked);
  // The canvas renderer reads the tickbox in its own draw (a label is drawn or
  // it is not: there is no layer to fade), so it needs one more frame.
  if (typeof gcRequestDraw === "function") gcRequestDraw();
  // The layer's positions are skipped while it is hidden (see graph.js's tick
  // handler: it is one <g> per note, transformed ~300 times a settle, and
  // moving something invisible is work nobody can see). A settled simulation
  // has no further ticks, so turning them back on has to reposition them here
  // or the names sit detached from their notes until something redraws.
  graphCatchUpLabels();
});
let graphSearchDebounceTimeout;
$("graph-search").addEventListener("input", () => {
  clearTimeout(graphSearchDebounceTimeout);
  graphSearchDebounceTimeout = setTimeout(applyGraphHighlight, 150);
});

// Physics sliders: persist, then rebuild the simulation with the new forces.
for (const key of ["gravity", "spread"]) {
  const input = $(`graph-${key}`);
  input.value = localStorage.getItem(`graph-${key}`) ?? 50;
  input.addEventListener("change", () => {
    localStorage.setItem(`graph-${key}`, input.value);
    renderGraph();
  });
}

// Node popup: edit a note in place on the map.
$("graph-popup-close").addEventListener("click", closeGraphPopup);
// Resizing the window changes the map's size, so an open popup needs re-clamping.
window.addEventListener("resize", placeGraphPopup, { passive: true });
$("graph-popup-save").addEventListener("click", saveGraphPopup);
// Save is shown only once the note differs from what loaded (GRAPH_PLAN
// Phase 6), so both fields have to tell the gate when they change.
for (const id of ["graph-popup-content", "graph-popup-tags"]) {
  $(id).addEventListener("input", syncGraphPopupSave);
}
// "Open in Notes" now lives in the popup's action row (renderGraphPopupActions).
// Clicking empty canvas dismisses the popups.
$("graph-svg").addEventListener("click", () => {
  closeGraphPopup();
  closeGraphNewNote();
});
// Grow the map: double-click empty space to add a note right there.
$("graph-svg").addEventListener("dblclick", (event) => {
  if (event.target.closest(".graph-node")) return; // node dblclick pins it
  openGraphNewNote(event);
});
$("graph-add-node").addEventListener("click", () => openGraphNewNote(null));
$("graph-new-close").addEventListener("click", closeGraphNewNote);
$("graph-new-save").addEventListener("click", saveGraphNewNote);
$("graph-new-content").addEventListener("keydown", (e) => {
  if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) saveGraphNewNote();
});

// On-screen zoom controls drive the same d3 zoom behaviour as scroll/pinch.
function graphZoomBy(factor) {
  if (!graphZoom || !graphSvg) return;
  graphSvg.transition().duration(200).call(graphZoom.scaleBy, factor);
}
$("graph-zoom-in").addEventListener("click", () => graphZoomBy(1.3));
$("graph-zoom-out").addEventListener("click", () => graphZoomBy(1 / 1.3));
$("graph-zoom-fit").addEventListener("click", () => {
  if (graphNodesRef && graphNodesRef.length) {
    fitGraphToView(graphSvg, graphCanvas, graphZoom, graphNodesRef, graphDims.w, graphDims.h);
  }
});

function toggleGraphFullscreen() {
  const card = $("graph-card");
  if (card) {
    const isFull = card.classList.toggle("graph-fullscreen");
    // **Full screen hides the app chrome** (INBOX 29: "the top bar stays").
    // The card has covered the screen for a while, inset by one step and
    // fixed, but the top bar, the tab bar inside it and the status bar were
    // still laid out under it and still showing through that inset, so full
    // screen read as a card sitting on the app rather than as the map having
    // the screen. The class goes on <body> because the chrome is not inside
    // the card: what is hidden is listed in 02-chat-graph.css beside the
    // `.graph-fullscreen` rule itself.
    document.body.classList.toggle("graph-fullscreen-on", isFull);
    // The single zoom-cluster button now does both jobs a separate "Close
    // Full Screen" toolbar button used to split between them, asked for
    // directly: "move the close full screen button in the graph to be next
    // to the new graph button or smth so it isnt making an extra row." That
    // second button (`#graph-fullscreen-close`, toolbar) called this exact
    // same function and existed only because this one gave no sign it also
    // exits: so rather than relocate a redundant second button, this one
    // now says which of its two jobs it will do next.
    const fsBtn = $("graph-fullscreen");
    if (fsBtn) {
      fsBtn.title = isFull ? "Exit full screen" : "Full screen";
      fsBtn.setAttribute("aria-label", fsBtn.title);
      fsBtn.setAttribute("aria-pressed", String(isFull));
      const icon = fsBtn.querySelector("i");
      if (icon) icon.className = isFull ? "ph ph-arrows-in" : "ph ph-frame-corners";
    }
    // Trigger a resize event to ensure D3 SVG rescales properly
    window.dispatchEvent(new Event('resize'));
    if (graphNodesRef && graphNodesRef.length) {
      setTimeout(() => {
        const box = $("graph-box");
        graphDims.w = box.clientWidth || 800;
        graphDims.h = box.clientHeight || 540;
        // Only the SVG renderer has a viewBox; `graphSvg` points at the
        // <canvas> on the other one, and a `viewBox` attribute on a <canvas>
        // means nothing. The canvas resizes itself from its ResizeObserver.
        if (graphSvg && graphSvg.node() && graphSvg.node().tagName === "svg") {
          graphSvg.attr("viewBox", [0, 0, graphDims.w, graphDims.h]);
        }
        if (graphSimulation) {
          graphSimulation.force("center", d3.forceCenter(graphDims.w / 2, graphDims.h / 2));
          graphSimulation.force("x", d3.forceX(graphDims.w / 2).strength(0.04));
          graphSimulation.force("y", d3.forceY(graphDims.h / 2).strength(0.06));
          graphSimulation.alpha(0.3).restart();
        }
        if (isFull) {
          fitGraphToView(graphSvg, graphCanvas, graphZoom, graphNodesRef, graphDims.w, graphDims.h);
        }
      }, 50);
    }
  }
}

$("graph-fullscreen")?.addEventListener("click", toggleGraphFullscreen);
// Escape leaves full screen. Reported with the rest of the full-screen state
// ("restore on Esc"), and it is the one key every full-screen surface on the
// web answers to, including this app's own whiteboard. Guarded on the class
// so this listener does nothing at all on any other tab.
//
// INBOX 275: this used to be placed after the popover handlers above on the
// theory that "a help panel or a note popup open over the map takes the
// first Escape and the map takes the second": but listener order does not
// stop an event, it only decides who sees it first, and every listener here
// still runs unless one of them calls stopPropagation. The graph options
// panel's own Escape handler does (`$("graph-options")`, above: "The Escape
// is spent here"), which is why closing *that* panel never also leaves full
// screen; `openLightbox`'s `onKey` does not, and neither does anything else
// that opens over the map, so one Escape closed the lightbox *and* left full
// screen in the same press. Fixed by asking, not by hoping order holds:
// `activeOverlay()` (below) already answers "is a dialog open over the
// content", and `openLightbox` sets `role="dialog" aria-modal="true"`
// precisely so it is inside that reach. Anything that should own an Escape
// while the map is behind it belongs in `activeOverlay()`'s reach, not in a
// new `stopPropagation()` call here.
document.addEventListener("keydown", (event) => {
  if (event.key !== "Escape") return;
  if (!$("graph-card")?.classList.contains("graph-fullscreen")) return;
  if (activeOverlay()) return;
  toggleGraphFullscreen();
});

// Wave M: batch operations + skill/persona sharing.
// Reported directly: "there's also no refresh button on the your notes
// subtab", every other list in the Library had one (`#library-refresh` and
// its four siblings); the notebook's own front page did not. `loadEntries`
// is the same reload every autosave and filter change already calls.
$("notes-refresh")?.addEventListener("click", () => loadEntries());
//: The Notes dock's primary (and the phone's floating +): Capture, with the
//: box ready to type in. `showNotesSection`'s own `focus` lands on the
//: sub-tab button, which is right for a keyboard moving between sections
//: and wrong here, where the press meant "I want to write".
$("notes-new-note").addEventListener("click", () => {
  showNotesSection("capture");
  // The box is a live editor (documents.js `mountNoteSurface`) that mounts
  // over the textarea the first time Capture shows, and the mount takes the
  // focus a plain `focus()` had just set: measured in Chromium, the textarea
  // was the active element 50ms after the press and nothing was at 750.
  // Focusing the surface the mount resolves to lands on the editor whether
  // this is its first showing or its fiftieth.
  const box = $("entry-content");
  box?.focus();
  const mounted =
    typeof mountNoteSurface === "function" ? mountNoteSurface(box) : Promise.resolve(null);
  mounted.then((surface) => surface?.focus()).catch(() => {});
});
$("select-btn").addEventListener("click", () =>
  selectMode ? exitSelectMode() : enterSelectMode()
);

//: **Select all, as one toggle** (owner: "no select all option??"). Every
//: note the current filter shows, across pages, since the batch actions act
//: on `selectedIds` rather than on what is painted; pressed again with all
//: of them ticked it clears. One button rather than a Select all and a
//: Deselect all pair: the bar already has Cancel to leave select mode.
function toggleSelectAllRows(rows, repaint) {
  const all = rows.length > 0 && rows.every((row) => selectedIds.has(row.id));
  for (const row of rows) {
    if (all) selectedIds.delete(row.id);
    else selectedIds.add(row.id);
  }
  updateBatchCount();
  repaint();
}
$("batch-select-all").addEventListener("click", () => toggleSelectAllRows(libraryVisibleRows(), renderEntries));
//: Notes and boards only, the rule `timelineRowEl` applies to its ticks: the
//: bar's actions are actions on an Entry, and a document or reminder id in
//: `selectedIds` would be handed to the wrong table (a delete of the wrong
//: row). The first version of this button selected every visible row.
function timelineSelectableRows() {
  return timelineVisibleRows().filter((row) => row.kind === "note" || row.kind === "board");
}
$("timeline-batch-select-all")?.addEventListener("click", () =>
  toggleSelectAllRows(timelineSelectableRows(), paintTimeline)
);

$("batch-tag").addEventListener("click", batchTag);
$("batch-delete").addEventListener("click", batchDelete);
$("batch-cancel").addEventListener("click", exitSelectMode);

$("skill-export").addEventListener("click", () =>
  downloadJson("memorymap-skills.json", {
    skills: (prefsCache && prefsCache.skills) || [],
  })
);
$("skill-import").addEventListener("click", () =>
  pickJsonFile("skill-import-file", async (data) => {
    const merged = mergeNamedPrompts((prefsCache && prefsCache.skills) || [], data.skills);
    if (!merged) return toast("No skills found in that file.", true);
    try {
      await saveSkillList(merged);
    } catch (error) {
      // The server validates imports the same way it validates the editor, 
      // a skill naming a tool that no longer exists is refused by name.
      return toast(error.message, true);
    }
    toast("Skills imported.");
  })
);
$("persona-export").addEventListener("click", () =>
  downloadJson("memorymap-personas.json", {
    personas: (prefsCache && prefsCache.personas) || [],
  })
);
$("persona-import").addEventListener("click", () =>
  pickJsonFile("persona-import-file", async (data) => {
    const merged = mergeNamedPrompts(
      (prefsCache && prefsCache.personas) || [],
      data.personas
    );
    if (!merged) return toast("No personas found in that file.", true);
    await savePersonaList(merged);
    toast("Personas imported.");
  })
);
$("tools-toggle").addEventListener("change", async () => {
  // The pill reads from this checkbox, so anything else that flips it, a
  // skill that needs tools, a restored preference, has to redraw the pair or
  // the two disagree about which mode you are in.
  renderChatModeSeg();
  // Remember the choice so it survives restarts.
  await apiJson("/preferences", {
    method: "PUT",
    body: JSON.stringify({ tools_enabled: $("tools-toggle").checked }),
  }).catch(() => {});
});

// In-chat web-search toggle: reflects and flips the web_search_enabled pref,
// with a clear active state (it's the same setting as Settings → Web search).
function renderWebSearchToggle() {
  const on = Boolean(prefsCache && prefsCache.web_search_enabled);
  const button = $("web-search-toggle");
  button.classList.toggle("active", on);
  button.setAttribute("aria-pressed", on ? "true" : "false");
}
// Plan Plan: send what is in the box as a request that must be planned first.
//
// The instruction is a sentence rather than a flag on the request because the
// planning path is the model's own `make_plan` tool: the server already knows
// how to receive a plan, show it, tick its steps and let the user stop it
// mid-run (§35K). What was missing was any way to *ask* for one. Adding a
// parameter would mean a second route into the same behaviour that could drift
// from the first; asking in words uses the machinery that is already proven.
//
// Agent mode is turned on rather than required. A plan whose steps cannot be
// carried out is a list, and "why did nothing happen?" is a worse experience
// than a mode that changed under you and said so.
const PLAN_PREFIX =
  "Plan this before you do any of it. Call make_plan with the goal and the " +
  "steps, then carry the plan out.";

// Plan mode is a TOGGLE, not a second send button.
//
// It was: type your request, then press Plan instead of Send. That put the
// decision in the wrong place, you had to remember, after writing, to use a
// different button, and pressing Enter (which is how anyone sends a message)
// silently skipped planning. Asked for directly: "the user should be able to
// select it as a togglable mode, so that when they write in their prompt and
// press the send button or enter etc, it will use the plan mode".
//
// So it arms instead. Turn it on, write, send however you like. It stays on
// across messages the same way Web does, because "I am working on something
// that needs planning" is a state you are in for a while, not a one-off.
let planModeOn = false;

function renderPlanToggle() {
  const button = $("chat-plan");
  if (!button) return;
  button.setAttribute("aria-pressed", String(planModeOn));
  button.classList.toggle("active", planModeOn);
  button.title = planModeOn
    ? "Plan mode is on, your next message is planned first, and the steps are shown before anything touches your notes. Click to turn off."
    : `Plan mode: plan the request first, ${aiNameNow()} draws the steps and shows them before it starts`;
}

// Applied by sendChatMessage on the way out, so every route into it, the Send
// button, Enter, a suggestion chip, goes through planning when the mode is on.
// Reading the flag at send time rather than at click time is the whole point.
function applyPlanMode(question) {
  if (!planModeOn) return null;
  return `${question}\n\n${PLAN_PREFIX}`;
}

$("chat-plan").addEventListener("click", async () => {
  planModeOn = !planModeOn;
  renderPlanToggle();
  if (!planModeOn) {
    toast("Plan mode off.");
    return;
  }
  // A plan whose steps cannot be carried out is a list, so arming the mode
  // arms what it needs. Announced rather than silent: a mode that changed
  // under you and said so beats "why did nothing happen?".
  if (!$("tools-toggle").checked) {
    await setChatMode("agent");
    toast("Plan mode on, and switched to Agent, a plan needs to be able to act.");
  } else {
    toast("Plan mode on: your next message gets planned first.");
  }
  $("chat-input").focus();
});

renderPlanToggle();

// Start the user's own engine with the app. See the markup for why this is the
// answer to "web search keeps disabling itself", it was the container going
// away, not the setting.
$("searxng-autostart").addEventListener("change", async (event) => {
  const on = event.target.checked;
  prefsCache = await apiJson("/preferences", {
    method: "PUT",
    body: JSON.stringify({ searxng_autostart: on }),
  }).catch((error) => {
    toast(error.message, true);
    return prefsCache;
  });
  toast(
    on
      ? "SearXNG will start with MemoryMap from now on."
      : "SearXNG will only start when you press Start."
  );
});

$("web-search-toggle").addEventListener("click", async () => {
  const next = !(prefsCache && prefsCache.web_search_enabled);
  prefsCache = await apiJson("/preferences", {
    method: "PUT",
    body: JSON.stringify({ web_search_enabled: next }),
  }).catch(() => prefsCache);
  renderWebSearchToggle();
  $("pref-web-search").checked = next; // keep the Settings checkbox in sync
  if (next) {
    toggleWebPanel(true); // turning it on reveals the search panel
    toast("Web search on: Atlas can search, and you can browse here.");
  } else {
    toggleWebPanel(false);
    toast("Web search off.");
  }
});
$("web-panel-close").addEventListener("click", () => toggleWebPanel(false));
//: Enter searches; there is no Search button to press. ArrowDown walks from
//: the field into the results (and ArrowUp from the first result back to the
//: field, below), which is how every search list the owner compares this to
//: behaves. Skipped while an input method is composing, where Enter picks a
//: candidate.
$("web-query").addEventListener("keydown", (e) => {
  if (e.isComposing) return;
  if (e.key === "Enter") {
    e.preventDefault();
    runWebSearch();
  } else if (e.key === "ArrowDown") {
    const first = document.querySelector(
      "#web-reader:not(.hidden) #web-reader-back, #web-results .web-result-title, #web-search-history:not(.hidden) .web-recent"
    );
    if (first) {
      e.preventDefault();
      first.focus();
    }
  } else if (e.key === "Escape" && webRequest) {
    e.preventDefault();
    e.stopPropagation();
    stopWebRequest();
  }
});
$("web-query").addEventListener("input", renderWebSearchHistory);
$("web-stop").addEventListener("click", stopWebRequest);
$("web-results").addEventListener("keydown", (e) => {
  if (e.key !== "ArrowUp" || e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
  const first = $("web-results").querySelector(".web-result-title");
  if (e.target !== first) return;
  e.preventDefault();
  $("web-query").focus();
});
//: The recent rows walk with the arrows too; they are a short vertical list,
//: so this is the plain previous/next rather than ARROW_NAV_LISTS's geometry.
$("web-search-history").addEventListener("keydown", (e) => {
  if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
  const rows = [...$("web-search-history").querySelectorAll(".web-recent")];
  const at = rows.indexOf(e.target);
  if (at < 0) return;
  e.preventDefault();
  const next = rows[at + (e.key === "ArrowDown" ? 1 : -1)];
  (next || (e.key === "ArrowUp" ? $("web-query") : rows[at])).focus();
});
$("web-reader-back").addEventListener("click", closeWebReader);
//: Escape inside the reader goes back to the results, as a browser's Back
//: would; the find bar has its own Escape and stops it first.
$("web-reader").addEventListener("keydown", (e) => {
  if (e.key !== "Escape" || e.defaultPrevented) return;
  e.preventDefault();
  e.stopPropagation();
  closeWebReader();
});
$("web-reader-save").addEventListener("click", saveWebPageAsNote);
//: Same act as the result row's own "Save as bookmark", from the other side
//: of the panel: you often only decide a page is worth keeping after reading
//: it, and until now that decision had nowhere to go from here.
$("web-reader-bookmark").addEventListener("click", () => {
  if (!webReaderPage) return;
  bookmarkWebResult({
    url: webReaderPage.url,
    title: webReaderPage.title || webReaderPage.domain || "",
    snippet: (webReaderPage.text || "").slice(0, 200),
  });
});
$("web-reader-ask").addEventListener("click", () => {
  if (webReaderPage) askAboutPage(webReaderPage.url, webReaderPage.title);
});
$("web-reader-cite").addEventListener("click", () => {
  if (webReaderPage) citeWebPage(webReaderPage);
});
$("web-reader-copy").addEventListener("click", (e) => {
  if (webReaderPage) copyWebLink(webReaderPage.url, e.currentTarget);
});
$("web-reader-open").addEventListener("click", () => {
  if (webReaderPage) openWebPageExternally(webReaderPage.url);
});
$("web-reader-find").addEventListener("click", () => openGlobalFind({ scope: "web-reader" }));

// Reminders (Wave D). The dashboard's own wiring (dash-edit,
// dash-widgets-open/search) moved to dashboard.js along with the code it
// drives; this comment used to cover both.
//: Enter adds it, the way a one-line "add" field works everywhere; a
//: reminder had to be clicked in with the mouse after typing it. Skipped
//: while an input method is composing, where Enter picks a candidate.
$("reminder-text")?.addEventListener("keydown", (event) => {
  if (event.key !== "Enter" || event.shiftKey || event.isComposing) return;
  event.preventDefault();
  $("reminder-add").click();
});
$("reminder-add").addEventListener("click", async () => {
  const ok = await addReminder($("reminder-text").value.trim(), $("reminder-due").value, null, {
    priority: $("reminder-priority").value,
    recurring: $("reminder-recurring").value,
  });
  if (ok) {
    $("reminder-text").value = "";
    $("reminder-priority").value = "normal";
    $("reminder-recurring").value = "none";
    // A fresh default for the next one, measured from now.
    setDue(defaultDueValue());
    // On a phone the form was a sheet over the list; the toast says it
    // landed and the list behind is where it now is.
    reminderComposeSheetClose?.();
  }
});

// **What a phone comes to Reminders for is the list** (INBOX 392,
// UI_MODERNISATION_PLAN Phase 11 item 12): what is due, and ticking it off.
// Measured at 390 before: the add form (the sentence box, the text, date,
// time, priority and repeat fields, the quick-set strip and a note) filled
// the whole first screen and the list began at y=836 of 844; at 768x1024 the
// form wrapped to 690px and the list began at y=752. Below 1100 (the width at
// which the rest of the app goes to one column) the form leaves the page and
// the dock's "New reminder", floated as the + by `FAB_IDS` below 600, opens
// it as a sheet: the form itself, moved in and put back on close, so its
// handlers, its quick-set strip and its clock are the ones the desktop uses.
// Above 1100 the button takes the caret to the form, which is on the page.
const REMINDER_SHEET = "(max-width: 1099.98px)";
let reminderComposeSheetClose = null;

function openReminderCompose() {
  const form = $("reminder-compose");
  if (!form) return;
  // The sentence box when the AI that reads it is there, the plain one when
  // it is not (`data-needs-model` disables the sentence box's Add).
  const field = () =>
    ($("reminder-magic-add")?.disabled ? $("reminder-text") : $("reminder-magic")) || $("reminder-text");
  if (!window.matchMedia(REMINDER_SHEET).matches || typeof openSheet !== "function") {
    field()?.focus();
    return;
  }
  if (reminderComposeSheetClose) return;
  const home = form.parentElement;
  const next = form.nextElementSibling;
  reminderComposeSheetClose = openSheet({
    label: "New reminder",
    name: "reminder-compose",
    returnFocus: $("reminders-new"),
    build: (card) => {
      card.classList.add("reminder-compose-card");
      card.appendChild(form);
    },
    onClose: () => {
      reminderComposeSheetClose = null;
      home.insertBefore(form, next && next.parentElement === home ? next : null);
    },
  });
  field()?.focus();
}

$("reminders-new")?.addEventListener("click", openReminderCompose);
$("reminder-clear-done").addEventListener("click", clearDoneReminders);
$("reminders-page-size").value = remindersPageSize;
$("reminders-page-size").addEventListener("change", (e) => {
  remindersPageSize = e.target.value;
  localStorage.setItem("reminders-page-size", remindersPageSize);
  remindersDonePage = 1;
  loadReminders();
});
$("reminders-done-page-prev").addEventListener("click", () => {
  if (remindersDonePage <= 1) return;
  remindersDonePage -= 1;
  loadReminders();
});
$("reminders-done-page-next").addEventListener("click", () => {
  remindersDonePage += 1; // clamped back down inside paginateDoneReminders if this overshoots
  loadReminders();
});
for (const button of document.querySelectorAll("#reminder-filter button")) {
  button.addEventListener("click", () => {
    reminderFilter = button.dataset.filter;
    for (const b of document.querySelectorAll("#reminder-filter button")) {
      b.classList.toggle("active", b === button);
    }
    remindersDonePage = 1; // a filter switch can change what's even in Done
    loadReminders();
  });
}
for (const button of document.querySelectorAll("#reminder-view-toggle button")) {
  button.addEventListener("click", () => {
    reminderView = button.dataset.view;
    localStorage.setItem("reminderView", reminderView);
    for (const b of document.querySelectorAll("#reminder-view-toggle button")) {
      b.classList.toggle("active", b === button);
    }
    loadReminders();
  });
  // The markup hardcodes "List" as the active button; a returning visitor
  // whose last choice (localStorage) was "calendar" needs that reflected
  // here too, not just in which container loadReminders() shows.
  button.classList.toggle("active", button.dataset.view === reminderView);
}
$("reminder-magic-add").addEventListener("click", magicAddReminder);
$("reminder-magic").addEventListener("keydown", (e) => {
  // Now a textarea, so Enter has to be claimed explicitly to keep the
  // one-line-and-go path. Shift+Enter is the escape hatch for a real newline.
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    magicAddReminder();
  }
});
for (const button of document.querySelectorAll("#reminder-presets button")) {
  button.addEventListener("click", () => {
    setDue(toLocalInputValue(presetDate(button.dataset.preset).toISOString()));
    if (!$("reminder-text").value.trim()) $("reminder-text").focus();
  });
}
// Nudges: adjusting an existing time is far quicker than retyping one.
$("reminder-due-nudge-down").addEventListener("click", () => nudgeDue(-15));
$("reminder-due-nudge-up").addEventListener("click", () => nudgeDue(15));
$("reminder-due-day-down").addEventListener("click", () => nudgeDue(-60 * 24));
$("reminder-due-day-up").addEventListener("click", () => nudgeDue(60 * 24));
// The two visible fields drive the hidden value.
$("reminder-date").addEventListener("input", syncDueFromParts);
$("reminder-time").addEventListener("input", syncDueFromParts);
// --- [[ autocomplete ------------------------------------------------------------
// The links work, but only if you remember how a note starts. Typing "[[" now
// offers the notes you could mean, so linking is a thing you do while writing
// rather than something you go and look up first.

let wikiSuggestIndex = 0;
let wikiSuggestMatches = [];

// The half-typed "[[..." immediately before the cursor, or null.
function wikiFragmentAt(textarea) {
  const upto = textarea.value.slice(0, textarea.selectionStart);
  const open = upto.lastIndexOf("[[");
  if (open === -1) return null;
  // Already closed, so the cursor is past a finished link.
  if (upto.slice(open).includes("]]")) return null;
  const fragment = upto.slice(open + 2);
  // A newline means they moved on and left the brackets behind.
  if (fragment.includes("\n")) return null;
  return { start: open, fragment };
}

function hideWikiSuggest() {
  $("wiki-suggest").classList.add("hidden");
  wikiSuggestMatches = [];
}

function renderWikiSuggest(textarea) {
  const at = wikiFragmentAt(textarea);
  const box = $("wiki-suggest");
  if (!at) return hideWikiSuggest();

  const needle = at.fragment.trim().toLowerCase();
  // Everything when they've only typed "[[", narrowing as they go. Private
  // notes are excluded: they can't be link targets, so offering one would be
  // a dead end that also reveals it exists.
  wikiSuggestMatches = allEntries
    .filter((e) => !e.is_private && (!needle || e.content.toLowerCase().includes(needle)))
    .slice(0, 8);
  if (!wikiSuggestMatches.length) return hideWikiSuggest();

  wikiSuggestIndex = Math.min(wikiSuggestIndex, wikiSuggestMatches.length - 1);
  box.replaceChildren();
  wikiSuggestMatches.forEach((entry, index) => {
    const li = document.createElement("li");
    li.setAttribute("role", "option");
    li.setAttribute("aria-selected", String(index === wikiSuggestIndex));
    if (index === wikiSuggestIndex) li.classList.add("active");
    li.textContent = noteLabel(entry, 64);
    li.addEventListener("mousedown", (event) => {
      // mousedown, not click: the textarea must not lose focus first.
      event.preventDefault();
      applyWikiSuggestion(textarea, entry);
    });
    box.appendChild(li);
  });
  box.classList.remove("hidden");
}

function applyWikiSuggestion(textarea, entry) {
  const at = wikiFragmentAt(textarea);
  if (!at) return;
  // Link by the note's opening words: that's what resolution matches on.
  //
  // Brackets are stripped first. A note that itself contains [[a link]] would
  // otherwise be inserted verbatim, producing [[outer [[inner]] text]]: and
  // the parser, which won't match brackets inside a name, would then find the
  // INNER one and silently resolve to the wrong note.
  const name = (entry.content || "")
    .split("\n")[0]
    .replace(/\[\[|\]\]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 60);
  if (!name) return hideWikiSuggest();
  const before = textarea.value.slice(0, at.start);
  const after = textarea.value.slice(textarea.selectionStart);
  textarea.value = `${before}[[${name}]]${after}`;
  const caret = before.length + name.length + 4;
  textarea.setSelectionRange(caret, caret);
  textarea.dispatchEvent(new Event("input")); // refresh the character count
  hideWikiSuggest();
  textarea.focus();
}

function wikiSuggestKeydown(event, textarea) {
  if ($("wiki-suggest").classList.contains("hidden")) return false;
  if (event.key === "ArrowDown" || event.key === "ArrowUp") {
    event.preventDefault();
    const step = event.key === "ArrowDown" ? 1 : -1;
    wikiSuggestIndex =
      (wikiSuggestIndex + step + wikiSuggestMatches.length) % wikiSuggestMatches.length;
    renderWikiSuggest(textarea);
    $("wiki-suggest").querySelector(".active")?.scrollIntoView({ block: "nearest" });
    return true;
  }
  if (event.key === "Enter" || event.key === "Tab") {
    event.preventDefault();
    applyWikiSuggestion(textarea, wikiSuggestMatches[wikiSuggestIndex]);
    return true;
  }
  if (event.key === "Escape") {
    event.preventDefault();
    hideWikiSuggest();
    return true;
  }
  return false;
}

// --- duplicate tidy-up -----------------------------------------------------------
// Finding is arithmetic and always available. Merging offers the AI when it's
// running and a plain join when it isn't: the join reads worse but cannot
// lose anything, which is the property that matters when tidying.

async function findDuplicates() {
  const status = $("duplicate-status");
  const box = $("duplicate-groups");
  const threshold = Number($("duplicate-threshold").value) / 100;
  status.classList.remove("error");
  status.textContent = "Comparing your notes…";
  box.replaceChildren();
  try {
    const body = await apiJson(`/duplicates?threshold=${threshold}`);
    renderDuplicateGroups(body.groups);
    status.textContent = body.groups.length
      ? `${body.groups.length} group${body.groups.length === 1 ? "" : "s"} of similar notes.`
      : "No duplicates at that similarity, try lowering the slider.";
  } catch (error) {
    status.classList.add("error");
    status.textContent = error.message;
  }
}

function renderDuplicateGroups(groups) {
  const box = $("duplicate-groups");
  box.replaceChildren();
  for (const group of groups) {
    const card = document.createElement("div");
    card.className = "duplicate-group";

    const head = document.createElement("p");
    head.className = "muted";
    head.textContent = `${group.entries.length} notes · ${Math.round(group.similarity * 100)}% alike`;
    card.appendChild(head);

    // Every note ticked by default: the whole point is merging the group.
    const chosen = new Set(group.entries.map((e) => e.id));
    for (const entry of group.entries) {
      const label = document.createElement("label");
      label.className = "duplicate-note";
      const box2 = document.createElement("input");
      box2.type = "checkbox";
      box2.checked = true;
      box2.addEventListener("change", () => {
        if (box2.checked) chosen.add(entry.id);
        else chosen.delete(entry.id);
        merge.disabled = chosen.size < 2;
      });
      const text = document.createElement("span");
      text.textContent = clipText(notePreviewText(entry.content), 160);
      label.append(box2, text);
      card.appendChild(label);
    }

    const row = document.createElement("div");
    row.className = "row";
    const merge = smallButton("⤵ Merge these", "Combine them into one note", async () => {
      await mergeDuplicateGroup([...chosen], card);
    }, false);
    const useAi = document.createElement("label");
    useAi.className = "muted";
    const aiBox = document.createElement("input");
    aiBox.type = "checkbox";
    aiBox.id = `merge-ai-${group.entries[0].id}`;
    // Only offer the AI when it can actually do the job.
    const aiReady = !modelStatus || modelStatus.ollama_running !== false;
    aiBox.checked = aiReady;
    aiBox.disabled = !aiReady;
    useAi.append(aiBox, document.createTextNode(
      aiReady ? " let Atlas write the merged note" : " Atlas is not running: notes will be joined"
    ));
    card.dataset.aiBoxId = aiBox.id;
    row.append(merge, useAi);
    card.appendChild(row);
    box.appendChild(card);
  }
}

async function mergeDuplicateGroup(ids, card) {
  if (ids.length < 2) return;
  const aiBox = document.getElementById(card.dataset.aiBoxId);
  const useAi = !!(aiBox && aiBox.checked);
  const status = $("duplicate-status");

  // Show what it will say BEFORE anything changes, merging is the one action
  // here that can quietly lose writing, so it shouldn't be a leap of faith.
  status.classList.remove("error");
  status.textContent = "Working out the merged note…";
  let preview;
  try {
    preview = await apiJson("/duplicates/preview", {
      method: "POST",
      body: JSON.stringify({ ids, use_ai: useAi }),
    });
  } catch (error) {
    status.classList.add("error");
    status.textContent = error.message;
    return;
  }
  status.textContent = "";

  const ok = (await confirmDialog(
    `Merge ${ids.length} notes into one?\n\n` +
      `The merged note will read:\n\n${preview.merged.slice(0, 400)}` +
      `${preview.merged.length > 400 ? "…" : ""}\n\n` +
      `The other ${ids.length - 1} go to the recycle bin, so this is undoable.`
  ));
  if (!ok) return;

  try {
    const result = await apiJson("/duplicates/merge", {
      method: "POST",
      body: JSON.stringify({ ids, use_ai: useAi }),
    });
    card.remove();
    toast(`Merged ${result.merged_count} notes${result.used_ai ? " with Atlas" : ""}.`);
    await loadEntries();
  } catch (error) {
    status.classList.add("error");
    status.textContent = error.message;
  }
}
