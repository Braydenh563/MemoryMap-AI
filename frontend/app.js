// MemoryMap AI frontend — plain JS, no framework (locked decision, plan §2).
// All DOM nodes are built with createElement/textContent, never innerHTML,
// so a note containing <script> is just text, not code.

// --- browser log capture (Wave A) -----------------------------------------------
// Installed before anything else runs so no message is missed. Shown in
// Settings → Logs alongside the server's records.

const browserLogs = [];
const MAX_BROWSER_LOGS = 500;

function recordBrowserLog(level, parts) {
  browserLogs.push({
    time: new Date().toISOString(),
    level,
    message: parts
      .map((p) => {
        if (typeof p === "string") return p;
        try {
          return JSON.stringify(p);
        } catch {
          return String(p);
        }
      })
      .join(" "),
  });
  if (browserLogs.length > MAX_BROWSER_LOGS) browserLogs.shift();
}

for (const level of ["log", "info", "warn", "error"]) {
  const original = console[level].bind(console);
  console[level] = (...parts) => {
    recordBrowserLog(level.toUpperCase(), parts);
    original(...parts);
  };
}
window.addEventListener("error", (e) =>
  recordBrowserLog("ERROR", [`${e.message} (${e.filename}:${e.lineno})`])
);
window.addEventListener("unhandledrejection", (e) =>
  recordBrowserLog("ERROR", ["Unhandled promise rejection:", String(e.reason)])
);

// Below this confidence an entry gets a "check this" flag (plan Phase 3).
const REVIEW_THRESHOLD = 50;

let allEntries = []; // latest GET /entries result, newest first
let activeCategory = null; // sidebar filter; null = All
let linkSource = null; // entry id waiting for its link partner
let editingId = null; // entry id currently in inline-edit mode

const $ = (id) => document.getElementById(id);
const show = (...ids) => ids.forEach((id) => $(id).classList.remove("hidden"));
const hide = (...ids) => ids.forEach((id) => $(id).classList.add("hidden"));

// --- tiny API helper --------------------------------------------------------

function authToken() {
  return localStorage.getItem("token") || "";
}

async function api(path, options = {}) {
  const response = await fetch(path, {
    headers: { "Content-Type": "application/json", "X-Auth-Token": authToken() },
    ...options,
  });
  if (response.status === 401) {
    showLockScreen(false); // token expired (e.g. app restarted) — re-lock
    throw new Error("Locked");
  }
  if (!response.ok) {
    const detail = await response.json().catch(() => ({}));
    throw new Error(detail.detail || `Request failed (${response.status})`);
  }
  return response;
}

async function apiJson(path, options = {}) {
  return (await api(path, options)).json();
}

// --- auth gate (Phase 4) -----------------------------------------------------

function showLockScreen(setupMode) {
  $("lock-overlay").classList.remove("hidden");
  $("lock-title").textContent = setupMode ? "Welcome to MemoryMap" : "Unlock MemoryMap";
  $("lock-message").textContent = setupMode
    ? "First run: choose a password (or PIN) to protect your notebook. You'll need it every time the app starts."
    : "Enter your password to unlock your notebook.";
  $("lock-submit").textContent = setupMode ? "Set password & start" : "Unlock";
  $("lock-overlay").dataset.mode = setupMode ? "setup" : "unlock";
  $("lock-password").focus();
}

async function submitLockForm() {
  const password = $("lock-password").value;
  const errorLine = $("lock-error");
  errorLine.textContent = "";
  if (password.length < 4) {
    errorLine.textContent = "Use at least 4 characters.";
    return;
  }
  const mode = $("lock-overlay").dataset.mode;
  try {
    const body = await apiJson(`/auth/${mode === "setup" ? "setup" : "unlock"}`, {
      method: "POST",
      body: JSON.stringify({ password }),
    });
    localStorage.setItem("token", body.token);
    $("lock-password").value = "";
    $("lock-overlay").classList.add("hidden");
    $("lock-btn").classList.remove("hidden");
    startApp();
  } catch (error) {
    errorLine.textContent = error.message;
  }
}

async function lockNow() {
  try {
    await api("/auth/lock", { method: "POST" });
  } catch {
    /* locking locally regardless */
  }
  localStorage.removeItem("token");
  showLockScreen(false);
}

async function initAuth() {
  const status = await apiJson("/auth/status").catch(() => null);
  if (!status) {
    $("save-status").textContent = "Can't reach the MemoryMap server.";
    return;
  }
  if (status.setup_required) {
    showLockScreen(true);
    return;
  }
  $("lock-btn").classList.remove("hidden");
  if (!authToken()) {
    showLockScreen(false);
    return;
  }
  // Token might be stale after a server restart — startApp()'s first
  // request will bounce us to the lock screen if so.
  startApp();
}

function startApp() {
  // A failed load must be visible, not a silently empty page.
  loadEntries().catch((error) => toast(`Couldn't load entries: ${error.message}`, true));
  loadRecentQuestions();
  loadSuggestions();
  loadMostUsed();
  refreshModelStatus();
}

// --- rendering ---------------------------------------------------------------

function chip(text, extraClass = "") {
  const span = document.createElement("span");
  span.className = `chip ${extraClass}`.trim();
  span.textContent = text;
  return span;
}

function smallButton(label, title, onClick, ghost = true) {
  const button = document.createElement("button");
  button.className = ghost ? "ghost small" : "small";
  button.textContent = label;
  button.title = title;
  button.addEventListener("click", onClick);
  return button;
}

// One entry card, shared by the browse list, chat results, and the bin.
function entryItem(entry, options = {}) {
  const li = document.createElement("li");
  li.dataset.id = entry.id;
  if (entry.id === linkSource) li.classList.add("link-source");

  if (editingId === entry.id && options.actions) {
    renderEditForm(li, entry);
    return li;
  }

  const content = document.createElement("p");
  content.className = "entry-content";
  content.textContent = entry.content;
  li.appendChild(content);

  const meta = document.createElement("div");
  meta.className = "entry-meta";
  meta.appendChild(chip(entry.category));
  for (const tag of entry.tags) meta.appendChild(chip(tag, "tag"));

  if (entry.ai_confidence >= REVIEW_THRESHOLD) {
    meta.appendChild(chip(`AI ${entry.ai_confidence}%`, "confidence"));
  } else {
    // Low or zero confidence — worth a human look (plan Phase 3).
    meta.appendChild(chip(`AI ${entry.ai_confidence}% — check this`, "review"));
  }

  const date = document.createElement("span");
  date.className = "entry-date";
  date.textContent = new Date(
    options.bin ? entry.deleted_at : entry.created_at
  ).toLocaleString();
  meta.appendChild(date);

  if (options.bin) {
    const actions = document.createElement("span");
    actions.className = "entry-actions";
    actions.appendChild(
      smallButton("Restore", "Take this entry out of the bin", async () => {
        await api(`/entries/${entry.id}/restore`, { method: "POST" });
        await Promise.all([loadEntries(), renderBin()]);
      })
    );
    meta.appendChild(actions);
  } else if (options.actions) {
    const actions = document.createElement("span");
    actions.className = "entry-actions";
    actions.appendChild(
      smallButton("✎", "Edit this entry", () => {
        editingId = entry.id;
        renderEntries();
      })
    );
    actions.appendChild(
      smallButton("🔗", "Link this entry to another", () => beginOrCompleteLink(entry))
    );
    actions.appendChild(
      smallButton("🗑", "Move to the recycle bin", async () => {
        if (!confirm("Move this entry to the recycle bin?")) return;
        await api(`/entries/${entry.id}`, { method: "DELETE" });
        toast("Moved to bin — restore it any time from 🗑 Bin.");
        await loadEntries();
      })
    );
    meta.appendChild(actions);
  }
  li.appendChild(meta);

  if (entry.links.length > 0) {
    const linkRow = document.createElement("div");
    linkRow.className = "entry-links";
    for (const link of entry.links) {
      const linkChip = chip(`↔ ${link.preview}`, "link");
      if (options.actions) {
        const unlink = document.createElement("span");
        unlink.className = "unlink";
        unlink.textContent = "×";
        unlink.title = "Remove this link";
        unlink.addEventListener("click", async () => {
          await api(`/entries/${entry.id}/links/${link.link_id}`, { method: "DELETE" });
          await loadEntries();
        });
        linkChip.appendChild(unlink);
      }
      linkRow.appendChild(linkChip);
    }
    li.appendChild(linkRow);
  }
  return li;
}

function renderEditForm(li, entry) {
  const textarea = document.createElement("textarea");
  textarea.rows = 3;
  textarea.value = entry.content;

  const tagsInput = document.createElement("input");
  tagsInput.type = "text";
  tagsInput.placeholder = "Tags, comma separated";
  tagsInput.value = entry.tags.join(", ");

  const categorySelect = document.createElement("select");
  fillCategoryOptions(categorySelect, entry.category);

  const row = document.createElement("div");
  row.className = "row";
  row.appendChild(
    smallButton(
      "Save changes",
      "Save your corrections",
      async () => {
        const category = await resolveCategoryChoice(categorySelect);
        if (category === undefined) return; // user cancelled the prompt
        await api(`/entries/${entry.id}`, {
          method: "PUT",
          body: JSON.stringify({
            content: textarea.value.trim() || entry.content,
            category,
            tags: tagsInput.value.split(",").map((t) => t.trim()).filter(Boolean),
          }),
        });
        editingId = null;
        toast("Entry updated.");
        await loadEntries();
      },
      false
    )
  );
  row.appendChild(
    smallButton("Cancel", "Discard changes", () => {
      editingId = null;
      renderEntries();
    })
  );

  li.append(textarea, tagsInput, categorySelect, row);
}

// Category <select> shared by capture (guided mode) and the edit form.
function fillCategoryOptions(select, selected) {
  select.replaceChildren();
  const names = [...new Set(allEntries.map((e) => e.category))].sort();
  if (selected === null) {
    const auto = document.createElement("option");
    auto.value = "";
    auto.textContent = "Let the AI decide";
    select.appendChild(auto);
  }
  for (const name of names) {
    const option = document.createElement("option");
    option.value = name;
    option.textContent = name;
    if (name === selected) option.selected = true;
    select.appendChild(option);
  }
  const custom = document.createElement("option");
  custom.value = "__new__";
  custom.textContent = "+ New category…";
  select.appendChild(custom);
}

// "" → null (AI decides); "__new__" → ask for a name; else the value.
// Returns undefined when the user cancels the prompt.
async function resolveCategoryChoice(select) {
  if (select.value === "") return null;
  if (select.value !== "__new__") return select.value;
  const name = prompt("Name for the new category:");
  if (name === null) return undefined;
  return name.trim() || undefined;
}

function beginOrCompleteLink(entry) {
  if (linkSource === null) {
    linkSource = entry.id;
    toast("Now click 🔗 on the entry you want to connect it to (Esc cancels).");
    renderEntries();
    return;
  }
  if (linkSource === entry.id) {
    linkSource = null; // clicked the same one again = cancel
    renderEntries();
    return;
  }
  const source = linkSource;
  linkSource = null;
  api(`/entries/${source}/links`, {
    method: "POST",
    body: JSON.stringify({ target_id: entry.id }),
  })
    .then(() => {
      toast("Linked!");
      return loadEntries();
    })
    .catch((error) => {
      toast(error.message, true);
      renderEntries();
    });
}

function renderEntries() {
  const list = $("entry-list");
  const empty = $("empty-message");
  list.replaceChildren();

  const visible = activeCategory
    ? allEntries.filter((e) => e.category === activeCategory)
    : allEntries;

  $("entries-heading").textContent = activeCategory
    ? `${activeCategory} entries`
    : "All entries";
  empty.classList.toggle("hidden", visible.length > 0);
  for (const entry of visible) list.appendChild(entryItem(entry, { actions: true }));
}

function renderSidebar() {
  // Categories + counts are derived from the loaded entries — the
  // simplest thing that works; no extra endpoint needed yet.
  const counts = new Map();
  for (const entry of allEntries) {
    counts.set(entry.category, (counts.get(entry.category) || 0) + 1);
  }

  const ul = $("category-list");
  ul.replaceChildren();

  const addRow = (label, count, category) => {
    const li = document.createElement("li");
    if (category === activeCategory) li.classList.add("active");
    const name = document.createElement("span");
    name.textContent = label;
    const badge = document.createElement("span");
    badge.className = "count";
    badge.textContent = count;
    li.append(name, badge);
    li.addEventListener("click", () => {
      activeCategory = category;
      renderSidebar();
      renderEntries();
    });
    ul.appendChild(li);
  };

  addRow("All", allEntries.length, null);
  for (const [category, count] of [...counts.entries()].sort()) {
    addRow(category, count, category);
  }
}

async function loadEntries() {
  allEntries = await apiJson("/entries");
  renderSidebar();
  renderEntries();
  fillCategoryOptions($("entry-category"), null);
}

// --- capture -----------------------------------------------------------------

// Human explanations of how a note was filed ("visuals of what happened").
function filedByText(saved) {
  switch (saved.filed_by) {
    case "semantic-match":
      return `Filed under “${saved.category}” (${saved.ai_confidence}% sure) — matched by meaning, no AI call needed`;
    case "llm":
      return `Filed under “${saved.category}” (${saved.ai_confidence}% sure) — decided by ${
        (modelStatus && modelStatus.chat_model) || "the chat model"
      }`;
    case "user":
      return `Filed under “${saved.category}” — your choice, the AI stayed out of it`;
    default:
      return `Saved as “${saved.category}” — the AI wasn't available to file it`;
  }
}

async function saveEntry() {
  const contentBox = $("entry-content");
  const status = $("save-status");
  const button = $("save-btn");

  const content = contentBox.value.trim();
  if (!content) {
    status.textContent = "Write something first!";
    status.classList.add("error");
    return;
  }
  const tags = $("entry-tags").value.split(",").map((t) => t.trim()).filter(Boolean);
  const category = await resolveCategoryChoice($("entry-category"));
  if (category === undefined) return;

  button.disabled = true;
  status.classList.remove("error");
  status.textContent = category
    ? "Saving…"
    : modelStatus && !modelStatus.embedding_ready
      ? "Filing… (the search AI is still warming up, this first one can take longer)"
      : "Filing… (the AI is reading and categorising your note)";
  try {
    const saved = await apiJson("/entries", {
      method: "POST",
      body: JSON.stringify({ content, tags, category }),
    });
    status.textContent = filedByText(saved);
    contentBox.value = "";
    $("entry-tags").value = "";
    $("entry-category").value = "";
    await loadEntries();
    loadSuggestions(); // new categories → fresher recommended questions
  } catch (error) {
    status.textContent = error.message;
    status.classList.add("error");
  } finally {
    button.disabled = false;
  }
}

// --- ask ----------------------------------------------------------------------

// Follow-up memory (Round 1): the running conversation, sent back so the
// model can handle "and what about…". Capped so requests stay small.
let conversation = [];
const MAX_CLIENT_HISTORY = 4;
let askController = null; // AbortController for the in-flight stream
let lastQuestion = ""; // powers the Retry button

// Honest label for how the matching notes were found.
const SEARCH_MODE_LABELS = {
  semantic: "semantic search",
  keyword: "keyword search",
  recent: "recent notes", // broad question → showing recent entries
};

function renderChatMeta(meta) {
  $("search-mode").textContent = SEARCH_MODE_LABELS[meta.search_mode] || meta.search_mode;
  // "offline" only when Ollama is genuinely down — not merely because a
  // question found nothing to answer from.
  $("answered-by").textContent = meta.answered_by
    ? `answered by ${meta.answered_by}`
    : meta.ollama_running === false
      ? "chat model offline"
      : "";
  const rawList = $("raw-results");
  rawList.replaceChildren();
  if (meta.raw_results.length === 0) {
    const li = document.createElement("li");
    li.className = "muted";
    li.textContent = "No matching records.";
    rawList.appendChild(li);
  }
  for (const entry of meta.raw_results) rawList.appendChild(entryItem(entry));
  $("chat-results").classList.remove("hidden");
}

// Ask ⇄ Stop while a stream is in flight.
function setAsking(active) {
  $("ask-btn").classList.toggle("hidden", active);
  $("stop-btn").classList.toggle("hidden", !active);
  $("question").disabled = active;
}

function stopAnswer() {
  if (askController) askController.abort();
}

function newChat() {
  conversation = [];
  lastQuestion = "";
  $("chat-results").classList.add("hidden");
  $("new-chat-btn").classList.add("hidden");
  $("ask-status").textContent = "";
  $("question").value = "";
  loadSuggestions();
}

async function askQuestion(preset) {
  const status = $("ask-status");
  const questionBox = $("question");

  const question = (preset ?? questionBox.value).trim();
  if (!question) {
    status.textContent = "Type a question first!";
    status.classList.add("error");
    return;
  }
  lastQuestion = question;

  // A new answer is coming — hide the suggestion/recent chips and the
  // per-answer action buttons until it lands.
  $("suggested-questions").classList.add("hidden");
  hide("retry-btn", "copy-btn");
  setAsking(true);
  status.classList.remove("error");
  status.textContent =
    modelStatus && modelStatus.embedding_ready
      ? "Searching your notes by meaning…"
      : "Searching your notes…";

  // Reset the output areas for the new answer.
  const answerBox = $("ai-answer");
  const thinkingBox = $("thinking-box");
  const thinkingText = $("ai-thinking");
  answerBox.textContent = "";
  thinkingText.textContent = "";
  thinkingBox.classList.add("hidden");
  thinkingBox.open = false;

  let answerRaw = "";
  let stopped = false;
  askController = new AbortController();
  try {
    // Stream: raw results arrive first, then thinking/answer tokens live.
    const response = await fetch("/chat/stream", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Auth-Token": authToken() },
      body: JSON.stringify({
        question,
        history: conversation.slice(-MAX_CLIENT_HISTORY),
      }),
      signal: askController.signal,
    });
    if (response.status === 401) {
      showLockScreen(false);
      throw new Error("Locked");
    }
    if (!response.ok) {
      const detail = await response.json().catch(() => ({}));
      throw new Error(detail.detail || `Request failed (${response.status})`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffered = "";
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffered += decoder.decode(value, { stream: true });
      const lines = buffered.split("\n");
      buffered = lines.pop(); // last piece may be a partial line
      for (const line of lines) {
        if (!line.trim()) continue;
        const event = JSON.parse(line);
        if (event.type === "meta") {
          renderChatMeta(event);
          status.textContent = "The model is writing…";
        } else if (event.type === "thinking") {
          thinkingBox.classList.remove("hidden");
          thinkingText.textContent += event.delta;
          status.textContent = "The model is thinking…";
        } else if (event.type === "answer") {
          // Stream as plain text (fast); format once it's complete.
          answerRaw += event.delta;
          answerBox.textContent = answerRaw;
          status.textContent = "The model is writing…";
        }
      }
    }

    // Render the finished answer as markdown, and remember the turn.
    renderMarkdown(answerBox, answerRaw);
    conversation.push({ question, answer: answerRaw });
    status.textContent = "";
    show("retry-btn", "copy-btn", "new-chat-btn");
    // Asking changes both quick-access lists.
    loadRecentQuestions();
    loadMostUsed();
  } catch (error) {
    if (error.name === "AbortError") {
      stopped = true;
      renderMarkdown(answerBox, answerRaw); // keep what streamed so far
      status.textContent = "Stopped.";
      show("retry-btn", "copy-btn");
    } else {
      status.textContent = error.message;
      status.classList.add("error");
    }
  } finally {
    askController = null;
    setAsking(false);
    if (!stopped) questionBox.value = "";
  }
}

function retryAnswer() {
  if (lastQuestion) askQuestion(lastQuestion);
}

async function copyAnswer() {
  try {
    await navigator.clipboard.writeText($("ai-answer").textContent);
    toast("Answer copied.");
  } catch {
    toast("Couldn't copy — your browser blocked clipboard access.", true);
  }
}

// --- suggested questions (Round 1) ----------------------------------------------

async function loadSuggestions() {
  const box = $("suggested-questions");
  // Only meaningful before the first answer of a conversation.
  if (!$("chat-results").classList.contains("hidden")) return;
  const picks = await apiJson("/chat/suggestions").catch(() => []);
  box.replaceChildren();
  box.classList.toggle("hidden", picks.length === 0);
  if (picks.length === 0) return;
  const label = document.createElement("span");
  label.className = "muted";
  label.textContent = "Try asking:";
  box.appendChild(label);
  for (const question of picks) {
    const chipEl = chip(question);
    chipEl.addEventListener("click", () => askQuestion(question));
    box.appendChild(chipEl);
  }
}

// --- tiny markdown renderer (Round 1) -------------------------------------------
// Safe by construction: builds DOM with createElement/textContent, never
// innerHTML, so note/answer text can never inject markup. Supports the
// subset small local models actually emit: headings, bullet/numbered
// lists, fenced code, and inline **bold**/*italic*/`code`/[links].

function renderMarkdown(container, text) {
  container.replaceChildren();
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  let i = 0;
  let list = null; // the <ul>/<ol> currently being filled, or null

  const closeList = () => {
    if (list) container.appendChild(list);
    list = null;
  };

  while (i < lines.length) {
    const line = lines[i];

    // Fenced code block.
    if (line.trim().startsWith("```")) {
      closeList();
      const code = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith("```")) {
        code.push(lines[i]);
        i++;
      }
      i++; // skip the closing fence
      const pre = document.createElement("pre");
      const codeEl = document.createElement("code");
      codeEl.textContent = code.join("\n");
      pre.appendChild(codeEl);
      container.appendChild(pre);
      continue;
    }

    const heading = line.match(/^(#{1,3})\s+(.*)$/);
    if (heading) {
      closeList();
      const el = document.createElement(`h${heading[1].length + 2}`); // h3–h5
      appendInline(el, heading[2]);
      container.appendChild(el);
      i++;
      continue;
    }

    const bullet = line.match(/^\s*[-*+]\s+(.*)$/);
    const numbered = line.match(/^\s*\d+\.\s+(.*)$/);
    if (bullet || numbered) {
      const wantOrdered = Boolean(numbered);
      if (!list || (list.tagName === "OL") !== wantOrdered) {
        closeList();
        list = document.createElement(wantOrdered ? "ol" : "ul");
      }
      const li = document.createElement("li");
      appendInline(li, (bullet || numbered)[1]);
      list.appendChild(li);
      i++;
      continue;
    }

    if (line.trim() === "") {
      closeList();
      i++;
      continue;
    }

    // Plain paragraph — gather consecutive non-blank, non-special lines.
    closeList();
    const para = [line];
    i++;
    while (
      i < lines.length &&
      lines[i].trim() !== "" &&
      !lines[i].trim().startsWith("```") &&
      !lines[i].match(/^(#{1,3})\s+/) &&
      !lines[i].match(/^\s*[-*+]\s+/) &&
      !lines[i].match(/^\s*\d+\.\s+/)
    ) {
      para.push(lines[i]);
      i++;
    }
    const p = document.createElement("p");
    appendInline(p, para.join(" "));
    container.appendChild(p);
  }
  closeList();
}

// Inline formatting: **bold**, *italic*, `code`, [text](http…url).
function appendInline(parent, text) {
  const pattern = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`|\[[^\]]+\]\((https?:\/\/[^)]+)\))/g;
  let last = 0;
  let match;
  while ((match = pattern.exec(text)) !== null) {
    if (match.index > last) {
      parent.appendChild(document.createTextNode(text.slice(last, match.index)));
    }
    const token = match[0];
    if (token.startsWith("**")) {
      const el = document.createElement("strong");
      el.textContent = token.slice(2, -2);
      parent.appendChild(el);
    } else if (token.startsWith("`")) {
      const el = document.createElement("code");
      el.textContent = token.slice(1, -1);
      parent.appendChild(el);
    } else if (token.startsWith("[")) {
      const linkText = token.slice(1, token.indexOf("]"));
      const el = document.createElement("a");
      el.href = match[2]; // only http(s) matched — safe to use as href
      el.target = "_blank";
      el.rel = "noopener";
      el.textContent = linkText;
      parent.appendChild(el);
    } else {
      const el = document.createElement("em");
      el.textContent = token.slice(1, -1);
      parent.appendChild(el);
    }
    last = pattern.lastIndex;
  }
  if (last < text.length) {
    parent.appendChild(document.createTextNode(text.slice(last)));
  }
}

// --- tabs (Wave A) ----------------------------------------------------------------

const TABS = ["dashboard", "notes", "chat", "graph", "reminders"];

function switchTab(name) {
  for (const tab of TABS) {
    $(`tab-${tab}`).classList.toggle("hidden", tab !== name);
  }
  for (const button of document.querySelectorAll("#tab-bar button")) {
    button.classList.toggle("active", button.dataset.tab === name);
  }
  localStorage.setItem("activeTab", name); // reopen where you left off
}

// --- panels inside the Notes tab (bin / activity) ---------------------------------

const PANELS = ["bin-panel", "activity-panel"];

function showPanel(id) {
  for (const panel of PANELS) {
    $(panel).classList.toggle("hidden", panel !== id);
  }
}

// --- settings modal (Wave A) ------------------------------------------------------

const SETTINGS_SECTIONS = ["models", "preferences", "data", "logs", "about"];

function settingsModalOpen() {
  return !$("settings-modal").classList.contains("hidden");
}

function showSettingsSection(name) {
  for (const section of SETTINGS_SECTIONS) {
    $(`settings-${section}`).classList.toggle("hidden", section !== name);
  }
  for (const button of document.querySelectorAll("#settings-nav button")) {
    button.classList.toggle("active", button.dataset.section === name);
  }
  if (name === "logs") renderLogs();
  if (name === "preferences") renderPrefs().catch(() => {});
}

async function openSettingsModal(section = "models") {
  $("settings-modal").classList.remove("hidden");
  $("about-version").textContent = `Version ${
    (await apiJson("/health").catch(() => ({ version: "?" }))).version
  } · ${allEntries.length} entries loaded`;
  showSettingsSection(section);
  if (!suggestedCatalog) {
    suggestedCatalog = await apiJson("/models/suggested").catch(() => null);
  }
  refreshModelStatus();
}

function closeSettingsModal() {
  $("settings-modal").classList.add("hidden");
}

// --- logs viewer (Wave A) ---------------------------------------------------------

async function renderLogs() {
  const source = $("log-source").value;
  const records =
    source === "server"
      ? await apiJson("/logs?limit=200").catch(() => [])
      : browserLogs.slice(-200);

  const list = $("log-list");
  list.replaceChildren();
  $("logs-empty").classList.toggle("hidden", records.length > 0);
  for (const record of records) {
    const li = document.createElement("li");
    if (record.level === "ERROR" || record.level === "WARNING" || record.level === "WARN") {
      li.classList.add("log-warn");
    }
    const when = document.createElement("span");
    when.className = "when";
    when.textContent = new Date(record.time).toLocaleTimeString();
    const level = document.createElement("span");
    level.className = "what";
    level.textContent = record.level;
    const message = document.createElement("span");
    message.textContent = record.logger
      ? `${record.logger} — ${record.message}`
      : record.message;
    li.append(when, level, message);
    list.appendChild(li);
  }
  list.scrollTop = list.scrollHeight; // newest are at the bottom
}

async function copyLogs() {
  const source = $("log-source").value;
  const records =
    source === "server" ? await apiJson("/logs?limit=500").catch(() => []) : browserLogs;
  const text = records
    .map((r) => `${r.time} ${r.level} ${r.logger || ""} ${r.message}`)
    .join("\n");
  try {
    await navigator.clipboard.writeText(text);
    toast("Logs copied.");
  } catch {
    toast("Couldn't copy — clipboard blocked.", true);
  }
}

async function clearLogs() {
  if ($("log-source").value === "server") {
    await api("/logs", { method: "DELETE" }).catch(() => {});
  } else {
    browserLogs.length = 0;
  }
  renderLogs();
}

async function renderBin() {
  const entries = await apiJson("/entries?deleted=true");
  const list = $("bin-list");
  list.replaceChildren();
  $("bin-empty-message").classList.toggle("hidden", entries.length > 0);
  const days = prefsCache ? prefsCache.recycle_bin_days : 30;
  $("bin-note").textContent =
    `Deleted entries are kept for ${days} days (change this in Preferences), ` +
    "then cleared automatically.";
  for (const entry of entries) list.appendChild(entryItem(entry, { bin: true }));
}

async function renderActivity() {
  const rows = await apiJson("/audit?limit=100");
  const list = $("activity-list");
  list.replaceChildren();
  for (const row of rows) {
    const li = document.createElement("li");
    const when = document.createElement("span");
    when.className = "when";
    when.textContent = new Date(row.created_at).toLocaleString();
    const what = document.createElement("span");
    what.className = "what";
    what.textContent = row.action;
    const detail = document.createElement("span");
    detail.className = "muted";
    detail.textContent =
      `${row.entity_type}${row.entity_id ? " #" + row.entity_id : ""}` +
      (row.detail ? ` — ${row.detail}` : "");
    li.append(when, what, detail);
    list.appendChild(li);
  }
}

let prefsCache = null;

async function renderPrefs() {
  prefsCache = await apiJson("/preferences");
  $("pref-bin-days").value = prefsCache.recycle_bin_days;
  $("pref-style").value = prefsCache.communication_style;
  $("pref-profile").value = prefsCache.user_profile;
  $("pref-profile-enabled").checked = prefsCache.profile_enabled;
  $("prefs-status").textContent = "";
}

async function savePrefs() {
  try {
    prefsCache = await apiJson("/preferences", {
      method: "PUT",
      body: JSON.stringify({
        recycle_bin_days: Number($("pref-bin-days").value),
        communication_style: $("pref-style").value,
        user_profile: $("pref-profile").value,
        profile_enabled: $("pref-profile-enabled").checked,
      }),
    });
    $("prefs-status").textContent = "Saved.";
  } catch (error) {
    $("prefs-status").textContent = error.message;
  }
}

async function deleteProfile() {
  if (!confirm("Delete your profile text? The AI will stop personalising answers.")) return;
  prefsCache = await apiJson("/preferences", {
    method: "PUT",
    body: JSON.stringify({ user_profile: "", profile_enabled: false }),
  });
  await renderPrefs();
  toast("Profile data deleted.");
}

// Downloads need the auth header, so plain <a href> won't do — fetch the
// bytes and hand the browser a blob instead.
async function downloadExport(kind) {
  const response = await api(`/export/${kind}`);
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `memorymap-export.${kind}`;
  a.click();
  URL.revokeObjectURL(url);
}

// --- toasts (Phase 5) ---------------------------------------------------------------

function toast(message, isError = false) {
  const box = $("toast-box");
  const note = document.createElement("div");
  note.className = isError ? "toast error" : "toast";
  note.textContent = message;
  box.appendChild(note);
  setTimeout(() => note.remove(), 5500);
}

// --- quick access: recent questions + most-used entries (Phase 5) -------------------

async function loadRecentQuestions() {
  const box = $("recent-questions");
  const questions = await apiJson("/chat/recent").catch(() => []);
  box.replaceChildren();
  box.classList.toggle("hidden", questions.length === 0);
  if (questions.length === 0) return;
  const label = document.createElement("span");
  label.className = "muted";
  label.textContent = "Ask again:";
  box.appendChild(label);
  for (const question of questions) {
    const again = chip(question.length > 48 ? question.slice(0, 47) + "…" : question);
    again.title = question;
    again.addEventListener("click", () => {
      $("question").value = question;
      askQuestion();
    });
    box.appendChild(again);
  }
}

async function loadMostUsed() {
  const box = $("most-used-box");
  const list = $("most-used");
  const entries = await apiJson("/entries/most-accessed").catch(() => []);
  list.replaceChildren();
  box.classList.toggle("hidden", entries.length === 0);
  for (const entry of entries) {
    const li = document.createElement("li");
    li.title = entry.content;
    const text = document.createElement("span");
    text.textContent =
      entry.content.length > 26 ? entry.content.slice(0, 25) + "…" : entry.content;
    const count = document.createElement("span");
    count.className = "count";
    count.textContent = `×${entry.access_count}`;
    li.append(text, count);
    li.addEventListener("click", () => {
      // Jump to the entry in the main list and flash it.
      activeCategory = null;
      renderSidebar();
      renderEntries();
      const card = document.querySelector(`#entry-list li[data-id="${entry.id}"]`);
      if (card) {
        card.scrollIntoView({ behavior: "smooth", block: "center" });
        card.classList.add("flash");
        setTimeout(() => card.classList.remove("flash"), 1700);
      }
    });
    list.appendChild(li);
  }
}

// --- model manager (Phase 3.5) ---------------------------------------------------

let modelStatus = null; // latest /models/status payload
let suggestedCatalog = null; // loaded once, it never changes
let statusTimer = null;

function settingsOpen() {
  // The Models section lives inside the settings modal now (Wave A).
  return settingsModalOpen();
}

function jobsRunning() {
  if (!modelStatus) return false;
  const reindexing = modelStatus.reindex && modelStatus.reindex.status === "running";
  const pulling = Object.values(modelStatus.pulls || {}).some(
    (job) => job.status === "running"
  );
  return reindexing || pulling;
}

// One polling loop for everything: slow when idle, fast while a
// download/re-index is running or the settings panel is open.
async function refreshModelStatus() {
  try {
    modelStatus = await apiJson("/models/status");
  } catch {
    modelStatus = null; // locked or unreachable — pill shows the worst case
  }
  renderAiPill();
  if (settingsOpen()) renderSettings();

  clearTimeout(statusTimer);
  const delay = jobsRunning() ? 1000 : settingsOpen() ? 3000 : 20000;
  statusTimer = setTimeout(refreshModelStatus, delay);
}

function renderAiPill() {
  const pill = $("ai-pill");
  pill.className = "";
  if (!modelStatus) {
    pill.textContent = "status unknown";
    return;
  }
  const chatReady = modelStatus.ollama_running;
  const searchReady = modelStatus.embedding_ready;
  if (modelStatus.reindex && modelStatus.reindex.status === "running") {
    pill.classList.add("busy");
    pill.textContent = "rebuilding search index…";
  } else if (chatReady && searchReady) {
    pill.classList.add("ok");
    pill.textContent = "AI ready";
  } else if (!chatReady && searchReady) {
    pill.classList.add("busy");
    pill.textContent = "chat AI off — notes still save";
  } else if (chatReady && !searchReady) {
    pill.classList.add("busy");
    pill.textContent = "search AI warming up…";
  } else {
    pill.textContent = "AI off — notes still save";
  }
}

function renderSettings() {
  const status = modelStatus;
  const ollamaLine = $("ollama-status");

  if (!status) {
    ollamaLine.textContent = "Can't reach the MemoryMap server.";
    return;
  }

  ollamaLine.textContent = status.ollama_running
    ? "● Ollama is running"
    : "○ Ollama not detected";
  $("ollama-help").classList.toggle("hidden", status.ollama_running);
  $("models-config").classList.toggle("hidden", !status.ollama_running);
  $("suggested-box").classList.toggle("hidden", !status.ollama_running);

  if (status.ollama_running) {
    renderChatModelPicker(status);
    renderEmbeddingPicker(status);
    renderSuggested(status);
  }
  renderReindex(status);
}

function renderChatModelPicker(status) {
  const select = $("chat-model-select");
  const note = $("chat-model-note");
  // Don't rebuild the list under the user's cursor mid-choice.
  if (document.activeElement !== select) {
    select.replaceChildren();
    for (const model of status.installed_models) {
      const option = document.createElement("option");
      option.value = model.name;
      option.textContent = model.name;
      if (
        model.name === status.chat_model ||
        model.name.split(":")[0] === status.chat_model
      ) {
        option.selected = true;
      }
      select.appendChild(option);
    }
  }
  note.textContent =
    status.chat_model_installed === false
      ? `Active model “${status.chat_model}” is not installed any more — pick another or download it below.`
      : `Active: ${status.chat_model}`;
}

function renderEmbeddingPicker(status) {
  for (const radio of document.querySelectorAll('input[name="emb-backend"]')) {
    radio.checked = radio.value === status.embedding_backend;
  }
  const select = $("embedding-model-select");
  if (document.activeElement !== select) {
    select.replaceChildren();
    for (const model of status.installed_models) {
      const option = document.createElement("option");
      option.value = model.name;
      option.textContent = model.name;
      if (
        model.name === status.embedding_model ||
        model.name.split(":")[0] === status.embedding_model
      ) {
        option.selected = true;
      }
      select.appendChild(option);
    }
  }
}

function renderReindex(status) {
  const box = $("reindex-box");
  const job = status.reindex;
  const running = job && job.status === "running";
  box.classList.toggle("hidden", !running);
  if (running) {
    $("reindex-progress").value = job.done;
    $("reindex-progress").max = Math.max(job.total, 1);
    $("reindex-label").textContent = `${job.done} of ${job.total} notes re-indexed`;
  }
}

function renderSuggested(status) {
  const list = $("suggested-list");
  if (!suggestedCatalog) return;
  list.replaceChildren();
  const installedNames = new Set(
    status.installed_models.flatMap((m) => [m.name, m.name.split(":")[0]])
  );

  for (const [kind, models] of Object.entries(suggestedCatalog)) {
    for (const model of models) {
      const li = document.createElement("li");
      const name = document.createElement("span");
      name.className = "model-name";
      name.textContent = model.name;
      const info = document.createElement("span");
      info.className = "model-info";
      info.textContent = `${kind} · ${model.size} · ${model.purpose}`;
      li.append(name, info);

      const pull = (status.pulls || {})[model.name];
      if (installedNames.has(model.name)) {
        li.appendChild(chip("installed ✓", "confidence"));
      } else if (pull && pull.status === "running") {
        const progress = document.createElement("progress");
        progress.max = Math.max(pull.total, 1);
        progress.value = pull.done;
        progress.style.width = "120px";
        li.appendChild(progress);
      } else {
        if (pull && pull.status === "error") {
          li.appendChild(chip("failed — retry?", "review"));
        }
        li.appendChild(
          smallButton(
            "Download",
            `Download ${model.name} with Ollama`,
            async (event) => {
              event.target.disabled = true;
              try {
                await api("/models/pull", {
                  method: "POST",
                  body: JSON.stringify({ name: model.name }),
                });
                refreshModelStatus();
              } catch (error) {
                toast(error.message, true);
                event.target.disabled = false;
              }
            },
            false
          )
        );
      }
      list.appendChild(li);
    }
  }
}

async function applyChatModel() {
  const select = $("chat-model-select");
  const note = $("chat-model-note");
  try {
    await api("/models/chat-model", {
      method: "POST",
      body: JSON.stringify({ name: select.value }),
    });
    note.textContent = `Active: ${select.value} — switched instantly, no re-index needed.`;
    refreshModelStatus();
  } catch (error) {
    note.textContent = error.message;
  }
}

async function applyEmbeddingBackend() {
  const backend = document.querySelector('input[name="emb-backend"]:checked')?.value;
  const model = $("embedding-model-select").value || null;
  if (!backend) return;
  const ok = confirm(
    `Switching the search engine re-indexes all ${allEntries.length} of your ` +
      "notes so search keeps making sense. Notes and keyword search stay " +
      "available while it runs. Continue?"
  );
  if (!ok) return;
  try {
    await api("/models/embedding-backend", {
      method: "POST",
      body: JSON.stringify({ backend, model: backend === "ollama" ? model : null }),
    });
    refreshModelStatus();
  } catch (error) {
    toast(error.message, true);
  }
}

// --- theme ----------------------------------------------------------------------

function toggleTheme() {
  const root = document.documentElement;
  // Current effective theme: explicit choice, else the OS preference.
  const current =
    root.dataset.theme ||
    (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
  const next = current === "dark" ? "light" : "dark";
  root.dataset.theme = next;
  localStorage.setItem("theme", next); // remembered across restarts
}

// --- wiring --------------------------------------------------------------------

$("theme-btn").addEventListener("click", toggleTheme);

// Tabs (Wave A): switch pages, restore the last one used.
for (const button of document.querySelectorAll("#tab-bar button")) {
  button.addEventListener("click", () => switchTab(button.dataset.tab));
}
switchTab(localStorage.getItem("activeTab") || "notes");

// Settings modal (Wave A).
$("settings-btn").addEventListener("click", () => openSettingsModal());
$("settings-close").addEventListener("click", closeSettingsModal);
$("settings-modal").addEventListener("click", (e) => {
  if (e.target === $("settings-modal")) closeSettingsModal(); // backdrop click
});
for (const button of document.querySelectorAll("#settings-nav button")) {
  button.addEventListener("click", () => showSettingsSection(button.dataset.section));
}
$("log-source").addEventListener("change", renderLogs);
$("logs-refresh").addEventListener("click", renderLogs);
$("logs-copy").addEventListener("click", copyLogs);
$("logs-clear").addEventListener("click", clearLogs);

$("bin-btn").addEventListener("click", async () => {
  showPanel("bin-panel");
  await renderBin();
});
$("activity-btn").addEventListener("click", async () => {
  showPanel("activity-panel");
  await renderActivity();
});
for (const button of document.querySelectorAll(".panel-close")) {
  button.addEventListener("click", () => showPanel(null));
}
$("bin-empty").addEventListener("click", async () => {
  if (!confirm("Permanently delete everything in the bin? This cannot be undone.")) return;
  const result = await apiJson("/recycle-bin/empty", { method: "POST" });
  toast(`${result.removed} entr${result.removed === 1 ? "y" : "ies"} permanently deleted.`);
  await renderBin();
});
$("prefs-save").addEventListener("click", savePrefs);
$("profile-delete").addEventListener("click", deleteProfile);
$("export-json").addEventListener("click", () => downloadExport("json"));
$("export-csv").addEventListener("click", () => downloadExport("csv"));
$("chat-model-apply").addEventListener("click", applyChatModel);
$("embedding-apply").addEventListener("click", applyEmbeddingBackend);
$("save-btn").addEventListener("click", saveEntry);
$("ask-btn").addEventListener("click", () => askQuestion()); // no event as preset
$("stop-btn").addEventListener("click", stopAnswer);
$("retry-btn").addEventListener("click", retryAnswer);
$("copy-btn").addEventListener("click", copyAnswer);
$("new-chat-btn").addEventListener("click", newChat);
$("lock-btn").addEventListener("click", lockNow);
$("lock-submit").addEventListener("click", submitLockForm);
$("lock-password").addEventListener("keydown", (e) => {
  if (e.key === "Enter") submitLockForm();
});
// Enter in the question box asks; Ctrl+Enter in the note box saves.
$("question").addEventListener("keydown", (e) => {
  if (e.key === "Enter") askQuestion();
});
$("entry-content").addEventListener("keydown", (e) => {
  if (e.key === "Enter" && e.ctrlKey) saveEntry();
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && settingsModalOpen()) closeSettingsModal();
  if (e.key === "Escape" && linkSource !== null) {
    linkSource = null;
    renderEntries();
  }
});

initAuth();
