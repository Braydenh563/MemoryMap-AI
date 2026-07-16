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

// --- wiring --------------------------------------------------------------------

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
