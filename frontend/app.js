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
let inlineAction = null; // {id, kind: "context"|"continue"} open on a card

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
  loadTemplates().then(personaOptions);
  loadConversationList();
  refreshModelStatus();
}

// --- capture templates (Wave B) ---------------------------------------------------

const BUILTIN_TEMPLATES = [
  { name: "Journal", content: "Journal — {date}\n\nToday I " },
  { name: "Recipe", content: "Recipe: \n\nIngredients:\n- \n\nSteps:\n1. " },
  { name: "Contact", content: "Contact: \nPhone/email: \nWhere we met: \nNotes: " },
  { name: "Meeting", content: "Meeting about \nWho: \nDecisions: \nTo do: " },
];

async function loadTemplates() {
  // Built-ins + the user's own (kept in preferences).
  prefsCache = await apiJson("/preferences").catch(() => prefsCache);
  const custom = (prefsCache && prefsCache.custom_templates) || [];
  const select = $("entry-template");
  select.replaceChildren();
  const none = document.createElement("option");
  none.value = "";
  none.textContent = "No template";
  select.appendChild(none);
  for (const template of [...BUILTIN_TEMPLATES, ...custom]) {
    const option = document.createElement("option");
    option.value = template.name;
    option.textContent = template.name;
    option.dataset.content = template.content;
    select.appendChild(option);
  }
}

function applyTemplate() {
  const select = $("entry-template");
  const option = select.selectedOptions[0];
  if (!option || !option.dataset.content) return;
  $("entry-content").value = option.dataset.content.replace(
    "{date}",
    new Date().toLocaleDateString()
  );
  $("entry-content").focus();
}

function refreshTagSuggestions() {
  // Autocomplete for the tags box, from tags already in use.
  const tags = [...new Set(allEntries.flatMap((e) => e.tags))].sort();
  const datalist = $("tag-suggestions");
  datalist.replaceChildren();
  for (const tag of tags) {
    const option = document.createElement("option");
    option.value = tag;
    datalist.appendChild(option);
  }
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
      smallButton(entry.pinned ? "📌" : "📍", entry.pinned ? "Unpin" : "Pin to top", async () => {
        await api(`/entries/${entry.id}`, {
          method: "PUT",
          body: JSON.stringify({ pinned: !entry.pinned }),
        });
        await loadEntries();
      })
    );
    actions.appendChild(
      smallButton("➕", "Add context — the AI may refile it", () => {
        inlineAction = inlineActionIs(entry.id, "context") ? null : { id: entry.id, kind: "context" };
        renderEntries();
      })
    );
    actions.appendChild(
      smallButton("⤵", "Continue this thought (start/extend a thread)", () => {
        inlineAction = inlineActionIs(entry.id, "continue") ? null : { id: entry.id, kind: "continue" };
        renderEntries();
      })
    );
    actions.appendChild(
      smallButton("📎", "Attach a file", () => attachFileTo(entry))
    );
    actions.appendChild(
      smallButton("≈", "Show similar notes", () => toggleRelated(entry))
    );
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
  if (entry.pinned) meta.insertBefore(chip("📌 pinned"), meta.firstChild);
  li.appendChild(meta);

  // Attachments (Wave B): chips that download on click.
  if (entry.attachments.length > 0) {
    const fileRow = document.createElement("div");
    fileRow.className = "entry-links";
    for (const attachment of entry.attachments) {
      const icon = attachment.is_image ? "🖼" : "📄";
      const fileChip = chip(`${icon} ${attachment.filename}`, "link");
      fileChip.style.cursor = "pointer";
      fileChip.title = `Download (${Math.max(1, Math.round(attachment.size / 1024))} KB)`;
      fileChip.addEventListener("click", () => downloadAttachment(attachment));
      if (options.actions) {
        const remove = document.createElement("span");
        remove.className = "unlink";
        remove.textContent = "×";
        remove.title = "Remove this file";
        remove.addEventListener("click", async (e) => {
          e.stopPropagation();
          if (!confirm(`Remove ${attachment.filename}?`)) return;
          await api(`/files/${attachment.id}`, { method: "DELETE" });
          await loadEntries();
        });
        fileChip.appendChild(remove);
      }
      fileRow.appendChild(fileChip);
    }
    li.appendChild(fileRow);
  }

  // Inline add-context / continue-thought forms (Wave B).
  if (options.actions && inlineAction && inlineAction.id === entry.id) {
    li.appendChild(renderInlineAction(entry));
  }

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

function inlineActionIs(id, kind) {
  return inlineAction && inlineAction.id === id && inlineAction.kind === kind;
}

// The ➕ context / ⤵ continue boxes that appear inside an entry card.
function renderInlineAction(entry) {
  const wrap = document.createElement("div");
  wrap.className = "inline-action";
  const isContext = inlineAction.kind === "context";

  const textarea = document.createElement("textarea");
  textarea.rows = 2;
  textarea.placeholder = isContext
    ? "Add detail — the AI re-reads the whole note and may refile it…"
    : "Continue this train of thought…";
  wrap.appendChild(textarea);

  const row = document.createElement("div");
  row.className = "row";
  row.appendChild(
    smallButton(
      isContext ? "Add context" : "Add to thread",
      "",
      async () => {
        const text = textarea.value.trim();
        if (!text) return;
        try {
          if (isContext) {
            const updated = await apiJson(`/entries/${entry.id}/context`, {
              method: "POST",
              body: JSON.stringify({ text }),
            });
            toast(
              updated.category === entry.category
                ? `Context added — still filed under “${updated.category}”.`
                : `Context added — refiled under “${updated.category}”.`
            );
          } else {
            await apiJson("/entries", {
              method: "POST",
              body: JSON.stringify({ content: text, parent_id: entry.id }),
            });
            toast("Thread continued.");
          }
          inlineAction = null;
          await loadEntries();
        } catch (error) {
          toast(error.message, true);
        }
      },
      false
    )
  );
  row.appendChild(
    smallButton("Cancel", "", () => {
      inlineAction = null;
      renderEntries();
    })
  );
  wrap.appendChild(row);
  setTimeout(() => textarea.focus(), 0);
  return wrap;
}

function attachFileTo(entry) {
  const input = document.createElement("input");
  input.type = "file";
  input.addEventListener("change", async () => {
    const file = input.files[0];
    if (!file) return;
    const form = new FormData();
    form.append("file", file);
    // Raw fetch: multipart must NOT get the JSON content-type header.
    const response = await fetch(`/entries/${entry.id}/files`, {
      method: "POST",
      headers: { "X-Auth-Token": authToken() },
      body: form,
    });
    if (!response.ok) {
      const detail = await response.json().catch(() => ({}));
      toast(detail.detail || `Upload failed (${response.status})`, true);
      return;
    }
    toast(`Attached ${file.name}.`);
    await loadEntries();
  });
  input.click();
}

async function downloadAttachment(attachment) {
  const response = await api(`/files/${attachment.id}`);
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = attachment.filename;
  a.click();
  URL.revokeObjectURL(url);
}

let relatedOpenId = null; // entry currently showing its similar notes

async function toggleRelated(entry) {
  relatedOpenId = relatedOpenId === entry.id ? null : entry.id;
  renderEntries();
  if (relatedOpenId !== entry.id) return;
  const related = await apiJson(`/entries/${entry.id}/related`).catch(() => []);
  const card = document.querySelector(`#entry-list li[data-id="${entry.id}"]`);
  if (!card || relatedOpenId !== entry.id) return;
  const row = document.createElement("div");
  row.className = "entry-links";
  const label = document.createElement("span");
  label.className = "muted";
  label.textContent = related.length ? "Similar:" : "No similar notes found.";
  row.appendChild(label);
  for (const other of related) {
    const preview = other.content.length > 50 ? other.content.slice(0, 49) + "…" : other.content;
    const relChip = chip(`≈ ${preview}`, "link");
    relChip.style.cursor = "pointer";
    relChip.addEventListener("click", () => flashEntry(other.id));
    row.appendChild(relChip);
  }
  card.appendChild(row);
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

  // Threads (Wave B): children render indented under their parent. A
  // child whose parent isn't visible (filtered out) shows at top level.
  const visibleIds = new Set(visible.map((e) => e.id));
  const childrenOf = new Map();
  for (const entry of visible) {
    if (entry.parent_id && visibleIds.has(entry.parent_id)) {
      if (!childrenOf.has(entry.parent_id)) childrenOf.set(entry.parent_id, []);
      childrenOf.get(entry.parent_id).push(entry);
    }
  }

  const addWithChildren = (entry, depth) => {
    const li = entryItem(entry, { actions: true });
    if (depth > 0) {
      li.classList.add("thread-child");
      li.style.marginLeft = `${Math.min(depth, 4) * 1.4}rem`;
    }
    list.appendChild(li);
    // Oldest continuation first — a thread reads top to bottom.
    const children = (childrenOf.get(entry.id) || []).slice().reverse();
    for (const child of children) addWithChildren(child, depth + 1);
  };

  for (const entry of visible) {
    const parentVisible = entry.parent_id && visibleIds.has(entry.parent_id);
    if (!parentVisible) addWithChildren(entry, 0);
  }
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
  refreshTagSuggestions();
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
    if (saved.similar) {
      // Duplicate detection (Wave B) — informational, never blocking.
      toast(
        `Heads up: this is ${Math.round(saved.similar.similarity * 100)}% similar ` +
          `to an existing note — “${saved.similar.preview}”`
      );
    }
    contentBox.value = "";
    $("entry-tags").value = "";
    $("entry-category").value = "";
    $("entry-template").value = "";
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

// Jump to an entry in the Notes tab and flash it — shared by search
// results, most-used, and related-notes chips.
function flashEntry(id) {
  switchTab("notes");
  activeCategory = null;
  renderSidebar();
  renderEntries();
  requestAnimationFrame(() => {
    const card = document.querySelector(`#entry-list li[data-id="${id}"]`);
    if (!card) return;
    card.scrollIntoView({ behavior: "smooth", block: "center" });
    card.classList.add("flash");
    setTimeout(() => card.classList.remove("flash"), 1700);
  });
}

// A raw search result the user can click to open the note (Wave C).
function clickableResult(entry) {
  const li = entryItem(entry);
  li.classList.add("clickable-result");
  li.title = "Open this note in the Notes tab";
  li.addEventListener("click", () => flashEntry(entry.id));
  return li;
}

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
  for (const entry of meta.raw_results) rawList.appendChild(clickableResult(entry));
  $("chat-results").classList.remove("hidden");
}

// The one NDJSON stream reader, shared by the Notes quick-ask and the
// Chat tab (Wave C). Callers own all rendering via the handlers.
async function streamChat({ question, history, persona, signal, onMeta, onThinking, onAnswer }) {
  const body = { question, history: history || [] };
  if (persona) body.persona = persona;
  const response = await fetch("/chat/stream", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Auth-Token": authToken() },
    body: JSON.stringify(body),
    signal,
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
      if (event.type === "meta") onMeta(event);
      else if (event.type === "thinking") onThinking(event.delta);
      else if (event.type === "answer") onAnswer(event.delta);
    }
  }
}

// Live markdown while streaming: re-render the accumulated text at most
// once per animation frame — smooth, and cheap at personal-notebook scale.
function liveMarkdownRenderer(box) {
  let queued = false;
  let latest = "";
  return (text) => {
    latest = text;
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => {
      queued = false;
      renderMarkdown(box, latest);
    });
  };
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
  const renderLive = liveMarkdownRenderer(answerBox);
  askController = new AbortController();
  try {
    // Stream: raw results arrive first, then thinking/answer tokens live.
    await streamChat({
      question,
      history: conversation.slice(-MAX_CLIENT_HISTORY),
      signal: askController.signal,
      onMeta: (meta) => {
        renderChatMeta(meta);
        status.textContent = "The model is writing…";
      },
      onThinking: (delta) => {
        // Auto-expand while the model reasons (user request).
        thinkingBox.classList.remove("hidden");
        thinkingBox.open = true;
        thinkingText.textContent += delta;
        status.textContent = "The model is thinking…";
      },
      onAnswer: (delta) => {
        if (thinkingBox.open) thinkingBox.open = false; // reasoning done → tuck away
        answerRaw += delta;
        renderLive(answerRaw); // markdown renders AS it streams (user request)
        status.textContent = "The model is writing…";
      },
    });

    // Final render (catches anything after the last animation frame).
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

// --- chat tab (Wave C) ------------------------------------------------------------

let chatConv = { id: null, turns: [] }; // the open conversation
let chatController = null;

function personaOptions() {
  // Built-ins + the user's custom personas; the active one pre-selected.
  const select = $("persona-select");
  const custom = (prefsCache && prefsCache.personas) || [];
  const active = (prefsCache && prefsCache.active_persona) || "Librarian";
  select.replaceChildren();
  for (const persona of [
    { name: "Librarian" },
    { name: "Coach" },
    { name: "Analyst" },
    ...custom,
  ]) {
    const option = document.createElement("option");
    option.value = persona.name;
    option.textContent = persona.name;
    if (persona.name === active) option.selected = true;
    select.appendChild(option);
  }
}

function chatScrollToEnd() {
  const box = $("chat-messages");
  box.scrollTop = box.scrollHeight;
}

function addBubble(role, text) {
  const bubble = document.createElement("div");
  bubble.className = `msg ${role}`;
  bubble.textContent = text;
  $("chat-messages").appendChild(bubble);
  chatScrollToEnd();
  return bubble;
}

// An assistant bubble with its thinking box and matching-records slot.
function addAssistantBubble() {
  const bubble = document.createElement("div");
  bubble.className = "msg assistant";

  const thinkingBox = document.createElement("details");
  thinkingBox.className = "hidden";
  const summary = document.createElement("summary");
  summary.textContent = "Model's thinking";
  const thinkingText = document.createElement("div");
  thinkingText.className = "thinking";
  thinkingBox.append(summary, thinkingText);

  const answerBox = document.createElement("div");
  answerBox.className = "bubble-answer";

  const recordsHolder = document.createElement("div");

  bubble.append(thinkingBox, answerBox, recordsHolder);
  $("chat-messages").appendChild(bubble);
  chatScrollToEnd();
  return { bubble, thinkingBox, thinkingText, answerBox, recordsHolder };
}

function renderRecordsDetails(holder, meta) {
  if (!meta.raw_results.length) return;
  const details = document.createElement("details");
  const summary = document.createElement("summary");
  summary.className = "muted";
  const label = SEARCH_MODE_LABELS[meta.search_mode] || meta.search_mode;
  summary.textContent = `${meta.raw_results.length} matching note${
    meta.raw_results.length === 1 ? "" : "s"
  } (${label}) — click one to open it`;
  details.appendChild(summary);
  const list = document.createElement("ul");
  list.className = "entry-list";
  for (const entry of meta.raw_results) list.appendChild(clickableResult(entry));
  details.appendChild(list);
  holder.appendChild(details);
}

async function sendChatMessage(preset) {
  const input = $("chat-input");
  const status = $("chat-status");
  const question = (preset ?? input.value).trim();
  if (!question) return;

  $("chat-suggest").classList.add("hidden");
  input.value = "";
  input.disabled = true;
  hide("chat-send");
  show("chat-stop");
  status.classList.remove("error");
  status.textContent = "Searching your notes…";

  addBubble("user", question);
  const { thinkingBox, thinkingText, answerBox, recordsHolder } = addAssistantBubble();
  const renderLive = liveMarkdownRenderer(answerBox);
  let answerRaw = "";
  let thinkingRaw = "";
  let meta = null;
  chatController = new AbortController();

  try {
    await streamChat({
      question,
      history: chatConv.turns.slice(-MAX_CLIENT_HISTORY),
      persona: $("persona-select").value || null,
      signal: chatController.signal,
      onMeta: (m) => {
        meta = m;
        status.textContent = "The model is writing…";
      },
      onThinking: (delta) => {
        thinkingBox.classList.remove("hidden");
        thinkingBox.open = true; // expanded while reasoning (user request)
        thinkingRaw += delta;
        thinkingText.textContent = thinkingRaw;
        status.textContent = "The model is thinking…";
        chatScrollToEnd();
      },
      onAnswer: (delta) => {
        if (thinkingBox.open) thinkingBox.open = false; // collapse when answering
        answerRaw += delta;
        renderLive(answerRaw); // live markdown (user request)
        status.textContent = "The model is writing…";
        chatScrollToEnd();
      },
    });
    status.textContent = "";
  } catch (error) {
    if (error.name === "AbortError") {
      status.textContent = "Stopped.";
    } else {
      status.textContent = error.message;
      status.classList.add("error");
    }
  } finally {
    chatController = null;
    input.disabled = false;
    show("chat-send");
    hide("chat-stop");
    input.focus();
  }

  renderMarkdown(answerBox, answerRaw);
  if (meta) renderRecordsDetails(recordsHolder, meta);
  chatScrollToEnd();
  if (!answerRaw) return; // nothing to remember (failed before any token)

  chatConv.turns.push({ question, answer: answerRaw });
  // Persist the finished turn so the chat survives restarts.
  try {
    const payload = { question, answer: answerRaw, thinking: thinkingRaw || null };
    if (chatConv.id === null) {
      const created = await apiJson("/conversations", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      chatConv.id = created.id;
      $("chat-title").textContent = created.title;
    } else {
      await apiJson(`/conversations/${chatConv.id}/turns`, {
        method: "POST",
        body: JSON.stringify(payload),
      });
    }
    loadConversationList();
  } catch {
    toast("Couldn't save this chat turn.", true);
  }
  loadRecentQuestions();
  loadMostUsed();
}

function newChatConversation() {
  chatConv = { id: null, turns: [] };
  $("chat-messages").replaceChildren();
  $("chat-title").textContent = "New chat";
  loadChatSuggestions();
}

async function loadConversationList() {
  const conversations = await apiJson("/conversations").catch(() => []);
  const list = $("conversation-list");
  list.replaceChildren();
  $("conv-empty").classList.toggle("hidden", conversations.length > 0);
  for (const conversation of conversations) {
    const li = document.createElement("li");
    if (conversation.id === chatConv.id) li.classList.add("active-conv");
    const title = document.createElement("span");
    title.className = "conv-title";
    title.textContent = conversation.title;
    title.title = "Open this chat";
    title.addEventListener("click", () => openConversation(conversation.id));
    const actions = document.createElement("span");
    actions.className = "entry-actions";
    actions.appendChild(
      smallButton("✎", "Rename", async () => {
        const next = prompt("Rename this chat:", conversation.title);
        if (!next || !next.trim()) return;
        await apiJson(`/conversations/${conversation.id}`, {
          method: "PUT",
          body: JSON.stringify({ title: next.trim() }),
        });
        loadConversationList();
      })
    );
    actions.appendChild(
      smallButton("×", "Delete this chat", async () => {
        if (!confirm("Delete this saved chat?")) return;
        await apiJson(`/conversations/${conversation.id}`, { method: "DELETE" });
        if (chatConv.id === conversation.id) newChatConversation();
        loadConversationList();
      })
    );
    li.append(title, actions);
    list.appendChild(li);
  }
}

async function openConversation(id) {
  const full = await apiJson(`/conversations/${id}`).catch(() => null);
  if (!full) return;
  chatConv = { id: full.id, turns: [] };
  $("chat-title").textContent = full.title;
  $("chat-messages").replaceChildren();
  $("chat-suggest").classList.add("hidden");
  let lastQuestionText = null;
  for (const message of full.messages) {
    if (message.role === "user") {
      lastQuestionText = message.content;
      addBubble("user", message.content);
    } else {
      const handles = addAssistantBubble();
      renderMarkdown(handles.answerBox, message.content);
      if (message.thinking) {
        handles.thinkingBox.classList.remove("hidden");
        handles.thinkingText.textContent = message.thinking;
      }
      if (lastQuestionText !== null) {
        chatConv.turns.push({ question: lastQuestionText, answer: message.content });
      }
    }
  }
  loadConversationList();
  chatScrollToEnd();
}

async function loadChatSuggestions() {
  if ($("chat-messages").children.length > 0) return;
  const picks = await apiJson("/chat/suggestions").catch(() => []);
  const box = $("chat-suggest");
  box.replaceChildren();
  box.classList.toggle("hidden", picks.length === 0);
  if (!picks.length) return;
  const label = document.createElement("span");
  label.className = "muted";
  label.textContent = "Try asking:";
  box.appendChild(label);
  for (const question of picks) {
    const chipEl = chip(question);
    chipEl.addEventListener("click", () => sendChatMessage(question));
    box.appendChild(chipEl);
  }
}

// Personas section in Settings (Wave C).
async function renderPersonas() {
  prefsCache = await apiJson("/preferences").catch(() => prefsCache);
  const custom = (prefsCache && prefsCache.personas) || [];
  const list = $("persona-list");
  list.replaceChildren();
  for (const persona of [
    { name: "Librarian", builtin: true },
    { name: "Coach", builtin: true },
    { name: "Analyst", builtin: true },
    ...custom,
  ]) {
    const li = document.createElement("li");
    const row = document.createElement("div");
    row.className = "entry-meta";
    row.appendChild(chip(persona.name));
    const note = document.createElement("span");
    note.className = "muted";
    note.textContent = persona.builtin ? "built-in" : persona.prompt.slice(0, 60);
    row.appendChild(note);
    if (!persona.builtin) {
      const actions = document.createElement("span");
      actions.className = "entry-actions";
      actions.appendChild(
        smallButton("Delete", "Remove this persona", async () => {
          const remaining = custom.filter((p) => p.name !== persona.name);
          await apiJson("/preferences", {
            method: "PUT",
            body: JSON.stringify({ personas: remaining }),
          });
          await renderPersonas();
          personaOptions();
        })
      );
      row.appendChild(actions);
    }
    li.appendChild(row);
    list.appendChild(li);
  }
}

async function addPersona() {
  const name = $("persona-name").value.trim();
  const promptText = $("persona-prompt").value.trim();
  const status = $("persona-status");
  if (!name || !promptText) {
    status.textContent = "Both a name and a prompt are needed.";
    return;
  }
  const custom = ((prefsCache && prefsCache.personas) || []).filter(
    (p) => p.name !== name
  );
  custom.push({ name, prompt: promptText });
  await apiJson("/preferences", {
    method: "PUT",
    body: JSON.stringify({ personas: custom }),
  });
  $("persona-name").value = "";
  $("persona-prompt").value = "";
  status.textContent = `Added “${name}”.`;
  await renderPersonas();
  personaOptions();
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
  if (name === "chat") {
    loadChatSuggestions();
    $("chat-input").focus();
  }
}

// --- panels inside the Notes tab (bin / activity) ---------------------------------

const PANELS = ["bin-panel", "activity-panel", "tags-panel"];

function showPanel(id) {
  for (const panel of PANELS) {
    $(panel).classList.toggle("hidden", panel !== id);
  }
}

// --- settings modal (Wave A) ------------------------------------------------------

const SETTINGS_SECTIONS = ["models", "personas", "preferences", "data", "logs", "about"];

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
  if (name === "personas") renderPersonas().catch(() => {});
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

// Tag manager panel (Wave B).
async function renderTags() {
  const tags = await apiJson("/tags").catch(() => ({}));
  const list = $("tags-list");
  list.replaceChildren();
  const names = Object.keys(tags);
  $("tags-empty").classList.toggle("hidden", names.length > 0);
  for (const name of names) {
    const li = document.createElement("li");
    const row = document.createElement("div");
    row.className = "entry-meta";
    row.appendChild(chip(name, "tag"));
    const count = document.createElement("span");
    count.className = "muted";
    count.textContent = `${tags[name]} entr${tags[name] === 1 ? "y" : "ies"}`;
    row.appendChild(count);
    const actions = document.createElement("span");
    actions.className = "entry-actions";
    actions.appendChild(
      smallButton("Rename", "Rename this tag everywhere (merge if the name exists)", async () => {
        const next = prompt(`Rename tag “${name}” to:`, name);
        if (!next || next.trim() === name) return;
        const result = await apiJson("/tags/rename", {
          method: "POST",
          body: JSON.stringify({ old: name, new: next.trim() }),
        });
        toast(`Updated ${result.changed} entr${result.changed === 1 ? "y" : "ies"}.`);
        await Promise.all([renderTags(), loadEntries()]);
      })
    );
    actions.appendChild(
      smallButton("Delete", "Remove this tag from every entry", async () => {
        if (!confirm(`Remove the tag “${name}” from all entries?`)) return;
        await apiJson("/tags/delete", { method: "POST", body: JSON.stringify({ name }) });
        await Promise.all([renderTags(), loadEntries()]);
      })
    );
    row.appendChild(actions);
    li.appendChild(row);
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
    li.addEventListener("click", () => flashEntry(entry.id));
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
  } else if (!searchReady && modelStatus.embedding_warming) {
    pill.classList.add("busy");
    pill.textContent = "search AI warming up…";
  } else if (!searchReady && modelStatus.embedding_error) {
    // Distinguish "broken" from "loading" — the old pill said
    // "warming up…" forever when the model failed to load.
    pill.classList.add("busy");
    pill.textContent = "search AI unavailable — see Settings → Logs";
    pill.title = modelStatus.embedding_error;
  } else if (chatReady && searchReady) {
    pill.classList.add("ok");
    pill.textContent = "AI ready";
  } else if (!chatReady && searchReady) {
    pill.classList.add("busy");
    pill.textContent = "chat AI off — notes still save";
  } else if (chatReady && !searchReady) {
    pill.classList.add("busy");
    pill.textContent = "search AI not ready — check Settings → Models";
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
  const embeddingError = $("embedding-error");
  embeddingError.classList.toggle("hidden", !status.embedding_error);
  if (status.embedding_error) {
    embeddingError.textContent =
      `Search engine problem: ${status.embedding_error} — semantic search is ` +
      "falling back to keywords. Full details in Settings → Logs.";
  }
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
$("tags-btn").addEventListener("click", async () => {
  showPanel("tags-panel");
  await renderTags();
});
$("entry-template").addEventListener("change", applyTemplate);

// Chat tab (Wave C).
$("chat-send").addEventListener("click", () => sendChatMessage());
$("chat-stop").addEventListener("click", () => chatController && chatController.abort());
$("chat-new").addEventListener("click", newChatConversation);
$("chat-input").addEventListener("keydown", (e) => {
  if (e.key === "Enter") sendChatMessage();
});
$("persona-select").addEventListener("change", async () => {
  // Remember the choice so the Notes quick-ask uses the same persona.
  await apiJson("/preferences", {
    method: "PUT",
    body: JSON.stringify({ active_persona: $("persona-select").value }),
  }).catch(() => {});
});
$("persona-add").addEventListener("click", addPersona);
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
