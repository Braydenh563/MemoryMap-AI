// MemoryMap AI frontend — plain JS, no framework (locked decision, plan §2).
// All DOM nodes are built with createElement/textContent, never innerHTML,
// so a note containing <script> is just text, not code.

// Below this confidence an entry gets a "check this" flag (plan Phase 3).
const REVIEW_THRESHOLD = 50;

let allEntries = []; // latest GET /entries result, newest first
let activeCategory = null; // sidebar filter; null = All

// --- tiny API helper --------------------------------------------------------

async function api(path, options = {}) {
  const response = await fetch(path, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!response.ok) {
    const detail = await response.json().catch(() => ({}));
    throw new Error(detail.detail || `Request failed (${response.status})`);
  }
  return response.json();
}

// --- rendering ---------------------------------------------------------------

function chip(text, extraClass = "") {
  const span = document.createElement("span");
  span.className = `chip ${extraClass}`.trim();
  span.textContent = text;
  return span;
}

// One entry card, shared by the browse list and the chat raw results.
function entryItem(entry) {
  const li = document.createElement("li");

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
  date.textContent = new Date(entry.created_at).toLocaleString();
  meta.appendChild(date);

  li.appendChild(meta);
  return li;
}

function renderEntries() {
  const list = document.getElementById("entry-list");
  const empty = document.getElementById("empty-message");
  const heading = document.getElementById("entries-heading");
  list.replaceChildren();

  const visible = activeCategory
    ? allEntries.filter((e) => e.category === activeCategory)
    : allEntries;

  heading.textContent = activeCategory ? `${activeCategory} entries` : "All entries";
  empty.classList.toggle("hidden", visible.length > 0);
  for (const entry of visible) list.appendChild(entryItem(entry));
}

function renderSidebar() {
  // Categories + counts are derived from the loaded entries — the
  // simplest thing that works; no extra endpoint needed yet.
  const counts = new Map();
  for (const entry of allEntries) {
    counts.set(entry.category, (counts.get(entry.category) || 0) + 1);
  }

  const ul = document.getElementById("category-list");
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
  allEntries = await api("/entries");
  renderSidebar();
  renderEntries();
}

// --- capture -----------------------------------------------------------------

async function saveEntry() {
  const contentBox = document.getElementById("entry-content");
  const tagsBox = document.getElementById("entry-tags");
  const status = document.getElementById("save-status");
  const button = document.getElementById("save-btn");

  const content = contentBox.value.trim();
  if (!content) {
    status.textContent = "Write something first!";
    status.classList.add("error");
    return;
  }
  const tags = tagsBox.value.split(",").map((t) => t.trim()).filter(Boolean);

  button.disabled = true;
  status.classList.remove("error");
  status.textContent = "Filing…";
  try {
    const saved = await api("/entries", {
      method: "POST",
      body: JSON.stringify({ content, tags }),
    });
    status.textContent =
      saved.ai_confidence > 0
        ? `Filed under “${saved.category}” (${saved.ai_confidence}% sure)`
        : `Saved as “${saved.category}” — the AI wasn't available to file it`;
    contentBox.value = "";
    tagsBox.value = "";
    await loadEntries();
  } catch (error) {
    status.textContent = error.message;
    status.classList.add("error");
  } finally {
    button.disabled = false;
  }
}

// --- ask ----------------------------------------------------------------------

async function askQuestion() {
  const questionBox = document.getElementById("question");
  const status = document.getElementById("ask-status");
  const button = document.getElementById("ask-btn");
  const results = document.getElementById("chat-results");

  const question = questionBox.value.trim();
  if (!question) {
    status.textContent = "Type a question first!";
    status.classList.add("error");
    return;
  }

  button.disabled = true;
  status.classList.remove("error");
  status.textContent = "Thinking…";
  try {
    const reply = await api("/chat", {
      method: "POST",
      body: JSON.stringify({ question }),
    });

    document.getElementById("ai-answer").textContent = reply.ai_response;
    document.getElementById("search-mode").textContent = `${reply.search_mode} search`;

    const rawList = document.getElementById("raw-results");
    rawList.replaceChildren();
    if (reply.raw_results.length === 0) {
      const li = document.createElement("li");
      li.className = "muted";
      li.textContent = "No matching records.";
      rawList.appendChild(li);
    }
    for (const entry of reply.raw_results) rawList.appendChild(entryItem(entry));

    results.classList.remove("hidden");
    status.textContent = "";
  } catch (error) {
    status.textContent = error.message;
    status.classList.add("error");
  } finally {
    button.disabled = false;
  }
}

// --- model manager (Phase 3.5) ---------------------------------------------------

let modelStatus = null; // latest /models/status payload
let suggestedCatalog = null; // loaded once, it never changes
let statusTimer = null;

function settingsOpen() {
  return !document.getElementById("settings").classList.contains("hidden");
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
    modelStatus = await api("/models/status");
  } catch {
    modelStatus = null; // server unreachable — pill shows the worst case
  }
  renderAiPill();
  if (settingsOpen()) renderSettings();

  clearTimeout(statusTimer);
  const delay = jobsRunning() ? 1000 : settingsOpen() ? 3000 : 20000;
  statusTimer = setTimeout(refreshModelStatus, delay);
}

function renderAiPill() {
  const pill = document.getElementById("ai-pill");
  pill.className = "";
  if (!modelStatus) {
    pill.textContent = "server offline";
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
  const ollamaLine = document.getElementById("ollama-status");
  const help = document.getElementById("ollama-help");
  const config = document.getElementById("models-config");
  const suggestedBox = document.getElementById("suggested-box");

  if (!status) {
    ollamaLine.textContent = "Can't reach the MemoryMap server.";
    return;
  }

  ollamaLine.textContent = status.ollama_running
    ? "● Ollama is running"
    : "○ Ollama not detected";
  help.classList.toggle("hidden", status.ollama_running);
  config.classList.toggle("hidden", !status.ollama_running);
  suggestedBox.classList.toggle("hidden", !status.ollama_running);

  if (status.ollama_running) {
    renderChatModelPicker(status);
    renderEmbeddingPicker(status);
    renderSuggested(status);
  }
  renderReindex(status);
}

function renderChatModelPicker(status) {
  const select = document.getElementById("chat-model-select");
  const note = document.getElementById("chat-model-note");
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
  const radios = document.querySelectorAll('input[name="emb-backend"]');
  for (const radio of radios) {
    radio.checked = radio.value === status.embedding_backend;
  }
  const select = document.getElementById("embedding-model-select");
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
  const box = document.getElementById("reindex-box");
  const job = status.reindex;
  const running = job && job.status === "running";
  box.classList.toggle("hidden", !running);
  if (running) {
    document.getElementById("reindex-progress").value = job.done;
    document.getElementById("reindex-progress").max = Math.max(job.total, 1);
    document.getElementById("reindex-label").textContent =
      `${job.done} of ${job.total} notes re-indexed`;
  }
}

function renderSuggested(status) {
  const list = document.getElementById("suggested-list");
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
        const button = document.createElement("button");
        button.className = "small";
        button.textContent = "Download";
        button.addEventListener("click", async () => {
          button.disabled = true;
          try {
            await api("/models/pull", {
              method: "POST",
              body: JSON.stringify({ name: model.name }),
            });
            refreshModelStatus();
          } catch (error) {
            alert(error.message);
            button.disabled = false;
          }
        });
        li.appendChild(button);
      }
      list.appendChild(li);
    }
  }
}

async function openSettings() {
  document.getElementById("settings").classList.remove("hidden");
  if (!suggestedCatalog) {
    suggestedCatalog = await api("/models/suggested").catch(() => null);
  }
  refreshModelStatus();
}

async function applyChatModel() {
  const select = document.getElementById("chat-model-select");
  const note = document.getElementById("chat-model-note");
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
  const model = document.getElementById("embedding-model-select").value || null;
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
    alert(error.message);
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

document.getElementById("theme-btn").addEventListener("click", toggleTheme);
document.getElementById("models-btn").addEventListener("click", openSettings);
document.getElementById("settings-close").addEventListener("click", () => {
  document.getElementById("settings").classList.add("hidden");
});
document.getElementById("chat-model-apply").addEventListener("click", applyChatModel);
document.getElementById("embedding-apply").addEventListener("click", applyEmbeddingBackend);
document.getElementById("save-btn").addEventListener("click", saveEntry);
document.getElementById("ask-btn").addEventListener("click", askQuestion);
// Enter in the question box asks; Ctrl+Enter in the note box saves.
document.getElementById("question").addEventListener("keydown", (e) => {
  if (e.key === "Enter") askQuestion();
});
document.getElementById("entry-content").addEventListener("keydown", (e) => {
  if (e.key === "Enter" && e.ctrlKey) saveEntry();
});

loadEntries().catch((error) => {
  document.getElementById("save-status").textContent = error.message;
});
refreshModelStatus();
