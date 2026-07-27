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
let busyEntryId = null; // entry the AI is currently working on (spinner shown)
let flashConfidenceId = null; // entry whose confidence badge just changed (flash once)
let noteSearch = ""; // Notes-tab text filter (Wave J)
let noteSort = "newest"; // newest | oldest | az | most-used (Wave J)

const $ = (id) => document.getElementById(id);
const show = (...ids) => ids.forEach((id) => $(id).classList.remove("hidden"));
const hide = (...ids) => ids.forEach((id) => $(id).classList.add("hidden"));

// --- tiny API helper --------------------------------------------------------

function authToken() {
  return localStorage.getItem("token") || "";
}

async function api(path, options = {}) {
  // `silent`: a background poll (model status, reminders) — a 401 must not
  // yank the user to the lock screen mid-session (Wave O fix for a
  // long-standing intermittent re-lock). Only an explicit user action
  // shows the lock screen on 401.
  // `timeoutMs`: opt-in abort so a call can't hang the UI forever (used by the
  // startup probe). Off by default, so long-running requests — model pulls,
  // blocking chat — are unaffected.
  const { silent, timeoutMs, ...fetchOptions } = options;
  let timer = null;
  if (timeoutMs) {
    const controller = new AbortController();
    timer = setTimeout(() => controller.abort(), timeoutMs);
    fetchOptions.signal = fetchOptions.signal || controller.signal;
  }
  let response;
  try {
    response = await fetch(path, {
      headers: { "Content-Type": "application/json", "X-Auth-Token": authToken() },
      ...fetchOptions,
    });
  } finally {
    if (timer) clearTimeout(timer);
  }
  if (response.status === 401) {
    if (!silent) showLockScreen(false); // token expired (e.g. app restarted)
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
  // Bounded probe: if the server is unreachable or hangs, fail fast with a
  // clear message instead of an indefinite blank/"connecting" screen.
  const status = await apiJson("/auth/status", { timeoutMs: 8000 }).catch(() => null);
  if (!status) {
    $("save-status").textContent =
      "Can't reach the MemoryMap server — check it's running, then refresh.";
    toast("Can't reach the MemoryMap server. Is it running?", true);
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
  // A failed load must be visible, not a silently empty page — and one
  // broken endpoint must never stop the rest of the app from coming up.
  // Every bootstrap step is isolated so a single rejection surfaces a toast
  // instead of leaving the user staring at a half-loaded (or blank) app.
  const step = (label, fn) => {
    try {
      const result = fn();
      if (result && typeof result.catch === "function") {
        return result.catch((error) => {
          toast(`Couldn't ${label}: ${error.message}`, true);
        });
      }
      return Promise.resolve(result);
    } catch (error) {
      toast(`Couldn't ${label}: ${error.message}`, true);
      return Promise.resolve();
    }
  };

  step("load entries", loadEntries);
  step("load recent questions", loadRecentQuestions);
  step("load suggestions", loadSuggestions);
  step("load your most-used items", loadMostUsed);
  step("load templates", loadTemplates).then(() =>
    step("set up chat options", () => {
      personaOptions();
      // Wave G: skills chips + the "AI can make changes" toggle read the
      // same prefsCache that loadTemplates just filled.
      loadChatSkills();
      $("tools-toggle").checked = !prefsCache || prefsCache.tools_enabled !== false;
      renderWebSearchToggle();
    })
  );
  step("load conversations", loadConversationList);
  step("check the AI model status", refreshModelStatus);

  // Re-render whichever tab is on screen. switchTab() runs at module level —
  // before initAuth() has a token — so a tab that fetches its own data painted
  // itself from a pile of 401s and then never tried again. On the dashboard
  // that meant an empty grid until you opened Edit layout and cancelled out of
  // it, which re-ran renderDashboard by hand (user-reported).
  step("load this tab", () => refreshActiveTab());

  // First-run welcome tour (guarded by localStorage; re-runnable from Help).
  maybeShowOnboarding();
}

// The per-tab data loads switchTab performs, without the tab-switching itself.
// Kept beside switchTab's own dispatch so the two can't drift apart.
function refreshActiveTab() {
  const name = localStorage.getItem("activeTab") || "notes";
  if (name === "dashboard") return renderDashboard();
  if (name === "graph") return renderGraph();
  if (name === "documents") return loadDocuments();
  if (name === "reminders") {
    refreshReminderDefaults();
    return loadReminders();
  }
  if (name === "chat") return loadChatSuggestions();
  return undefined; // the notes tab is covered by loadEntries above
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
  // Saved filters live in the same payload, so draw them while it's fresh.
  renderSavedSearches();
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

function chip(text, extraClass = "", onClick = null) {
  const span = document.createElement("span");
  span.className = `chip ${extraClass}`.trim();
  span.textContent = text;
  // An interactive chip must be reachable and operable by keyboard, not just
  // the mouse. Passing onClick makes it a real button in the a11y tree.
  if (onClick) {
    span.classList.add("chip-interactive");
    span.setAttribute("role", "button");
    span.setAttribute("tabindex", "0");
    span.addEventListener("click", onClick);
    span.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        onClick(event);
      }
    });
  }
  return span;
}

// A <select> from [value, label] pairs, with one option preselected.
function buildSelect(options, selected) {
  const select = document.createElement("select");
  select.className = "small-select";
  for (const [value, label] of options) {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = label;
    if (value === selected) option.selected = true;
    select.appendChild(option);
  }
  return select;
}

function smallButton(label, title, onClick, ghost = true) {
  // (Wave I) icon-only buttons need a name for screen readers — the
  // title doubles as one.
  const button = document.createElement("button");
  button.className = ghost ? "ghost small" : "small";
  button.textContent = label;
  button.title = title;
  if (title) button.setAttribute("aria-label", title);
  button.addEventListener("click", onClick);
  return button;
}

// One entry card, shared by the browse list, chat results, and the bin.
// "2 hours ago" style, with the exact date kept for the hover tooltip
// (Wave J). Anything older than a week just shows the date.
function relativeTime(iso) {
  const then = new Date(iso);
  const seconds = Math.round((Date.now() - then.getTime()) / 1000);
  if (seconds < 45) return "just now";
  const units = [
    ["minute", 60],
    ["hour", 60],
    ["day", 24],
  ];
  let value = seconds / 60; // start in minutes
  let unit = "minute";
  if (value < 60) {
    // minutes
  } else if (value / 60 < 24) {
    value /= 60;
    unit = "hour";
  } else if (value / 60 / 24 < 7) {
    value = value / 60 / 24;
    unit = "day";
  } else {
    return then.toLocaleDateString();
  }
  const rounded = Math.round(value);
  return `${rounded} ${unit}${rounded === 1 ? "" : "s"} ago`;
}

function entryItem(entry, options = {}) {
  const li = document.createElement("li");
  li.dataset.id = entry.id;
  if (entry.id === linkSource) li.classList.add("link-source");

  if (editingId === entry.id && options.actions) {
    renderEditForm(li, entry);
    return li;
  }

  // Batch select mode (Wave M): a checkbox leads each card.
  if (options.actions && selectMode) {
    const check = document.createElement("input");
    check.type = "checkbox";
    check.className = "select-check";
    check.checked = selectedIds.has(entry.id);
    check.setAttribute("aria-label", "Select this note");
    check.addEventListener("change", () => {
      if (check.checked) selectedIds.add(entry.id);
      else selectedIds.delete(entry.id);
      updateBatchCount();
    });
    li.appendChild(check);
    li.classList.add("selectable");
  }

  const content = document.createElement("p");
  content.className = "entry-content";
  // Mark the matched words while filtering, so it's obvious WHY a note is in
  // the list. Built with createElement/textContent rather than innerHTML —
  // note text is user content and must never be parsed as markup.
  renderNoteText(content, entry.content, searchHighlightTerms());
  li.appendChild(content);

  const meta = document.createElement("div");
  meta.className = "entry-meta";
  meta.appendChild(chip(entry.category));
  for (const tag of entry.tags) meta.appendChild(chip(tag, "tag"));

  // "AI 0% — check this" is a warning about the AI's filing, and it only makes
  // sense when the AI actually did some. On a note you filed yourself, or one
  // saved while no AI was running, it accused a perfectly good note of being
  // suspect — which is most notes if you don't run Ollama.
  const aiDidFile = entry.ai_confidence > 0 && !entry.user_filed;
  const confidenceChip = aiDidFile
    ? entry.ai_confidence >= REVIEW_THRESHOLD
      ? chip(`AI ${entry.ai_confidence}%`, "confidence")
      : // Low confidence from a real attempt — worth a human look (Phase 3).
        chip(`AI ${entry.ai_confidence}% — check this`, "review")
    : null;
  // Flash the badge once when this note's confidence just changed, so the
  // update after a re-evaluation is actually noticeable (user request).
  if (confidenceChip && entry.id === flashConfidenceId) {
    confidenceChip.classList.add("badge-flash");
    flashConfidenceId = null;
  }
  if (confidenceChip) meta.appendChild(confidenceChip);

  // While the AI is re-evaluating this note, show a live spinner chip so
  // it's obvious something is running on this specific card.
  if (entry.id === busyEntryId) {
    li.classList.add("entry-busy");
    const busy = chip("⟳ Re-evaluating…", "busy");
    busy.classList.add("chip-busy");
    meta.appendChild(busy);
  }

  // The date and the action buttons share one right-aligned group. They used
  // to carry a `margin-left: auto` each, and two auto margins in a flex row
  // split the free space between them — which put the timestamp at a
  // different x on every card, depending on how wide its chips were.
  const metaEnd = document.createElement("span");
  metaEnd.className = "entry-meta-end";

  const date = document.createElement("span");
  date.className = "entry-date";
  const stamp = options.bin ? entry.deleted_at : entry.created_at;
  date.textContent = relativeTime(stamp);
  date.title = new Date(stamp).toLocaleString(); // exact on hover
  metaEnd.appendChild(date);
  meta.appendChild(metaEnd);

  if (options.bin) {
    const actions = document.createElement("span");
    actions.className = "entry-actions";
    actions.appendChild(
      smallButton("Restore", "Take this entry out of the bin", async () => {
        await api(`/entries/${entry.id}/restore`, { method: "POST" });
        await Promise.all([loadEntries(), renderBin()]);
      })
    );
    metaEnd.appendChild(actions);
  } else if (options.actions) {
    // Wave L rework: two everyday actions stay visible; the rest live in
    // one ⋯ menu — the old row of nine icons was unscannable noise.
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
      smallButton("📋", "Copy this note's text", async () => {
        try {
          await navigator.clipboard.writeText(entry.content);
          toast("Note copied.");
        } catch {
          toast("Couldn't copy — your browser blocked clipboard access.", true);
        }
      })
    );
    actions.appendChild(
      smallButton("✎", "Edit this entry", () => {
        editingId = entry.id;
        renderEntries();
      })
    );
    actions.appendChild(entryOverflowMenu(entry));
    metaEnd.appendChild(actions);
  }
  if (entry.is_private) meta.insertBefore(chip("🔒 private"), meta.firstChild);
  if (entry.pinned) meta.insertBefore(chip("📌 pinned"), meta.firstChild);
  li.appendChild(meta);

  // Attachments (Wave B; images become thumbnails in Wave M).
  if (entry.attachments.length > 0) {
    const fileRow = document.createElement("div");
    fileRow.className = "entry-links";
    for (const attachment of entry.attachments) {
      const removeButton = () => {
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
        return remove;
      };

      if (attachment.is_image) {
        // Show the picture itself, not a chip — click for full size.
        const wrap = document.createElement("span");
        wrap.className = "thumb-wrap";
        const img = document.createElement("img");
        img.className = "attachment-thumb";
        img.alt = attachment.filename;
        img.title = `${attachment.filename} — click to view full size`;
        attachmentObjectUrl(attachment)
          .then((url) => (img.src = url))
          .catch(() => wrap.remove());
        img.addEventListener("click", async () =>
          openLightbox(await attachmentObjectUrl(attachment), attachment.filename)
        );
        wrap.appendChild(img);
        if (options.actions) wrap.appendChild(removeButton());
        fileRow.appendChild(wrap);
      } else {
        const fileChip = chip(`📄 ${attachment.filename}`, "link", () =>
          downloadAttachment(attachment)
        );
        fileChip.title = `Download (${Math.max(1, Math.round(attachment.size / 1024))} KB)`;
        if (options.actions) fileChip.appendChild(removeButton());
        fileRow.appendChild(fileChip);
      }
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

// Close every open ⋯ menu (shared by outside-click and Esc, Wave L).
function closeActionMenus() {
  for (const menu of document.querySelectorAll(".action-menu:not(.hidden)")) {
    menu.classList.add("hidden");
    const opener = menu.parentElement.querySelector("[aria-haspopup]");
    if (opener) opener.setAttribute("aria-expanded", "false");
  }
}

// The ⋯ overflow menu on each note card (Wave L rework).
// Earlier versions of one note, with a way back to any of them.
async function openEntryHistory(entry) {
  const overlay = $("history-overlay");
  const list = $("history-list");
  $("history-status").textContent = "";
  list.replaceChildren();
  overlay.classList.remove("hidden");
  $("history-close").focus();

  let history;
  try {
    history = await apiJson(`/entries/${entry.id}/history`);
  } catch (error) {
    $("history-status").classList.add("error");
    $("history-status").textContent = error.message;
    return;
  }
  if (!history.length) {
    const p = document.createElement("p");
    p.className = "muted";
    p.textContent = "This note hasn't been edited yet, so there's nothing to go back to.";
    list.appendChild(p);
    return;
  }

  // The current text first, so you can see what you'd be replacing.
  const current = document.createElement("div");
  current.className = "history-entry history-current";
  const currentHead = document.createElement("p");
  currentHead.className = "muted";
  currentHead.textContent = "Now";
  const currentBody = document.createElement("p");
  currentBody.textContent = notePreviewText(entry.content);
  current.append(currentHead, currentBody);
  list.appendChild(current);

  for (const revision of history) {
    const item = document.createElement("div");
    item.className = "history-entry";
    const head = document.createElement("p");
    head.className = "muted";
    head.textContent = `Before ${new Date(revision.created_at).toLocaleString()}`;
    const body = document.createElement("p");
    body.textContent = notePreviewText(revision.content);
    const restore = smallButton("↩ Put this back", "Restore this version", async () => {
      if (!confirm("Replace the note with this version?\n\nThe current text is kept in the history, so this is undoable.")) return;
      try {
        await apiJson(`/entries/${entry.id}/history/${revision.id}/restore`, { method: "POST" });
        overlay.classList.add("hidden");
        toast("Earlier version restored.");
        await loadEntries();
        flashEntry(entry.id);
      } catch (error) {
        $("history-status").classList.add("error");
        $("history-status").textContent = error.message;
      }
    });
    item.append(head, body, restore);
    list.appendChild(item);
  }
}

async function toggleEntryPrivacy(entry) {
  const makingPrivate = !entry.is_private;
  if (makingPrivate) {
    const ok = confirm(
      "Make this note private?\n\n" +
        "It gets encrypted with a key derived from your password, so it stays " +
        "unreadable in the database, in backups, and to anyone without that " +
        "password.\n\n" +
        "It also stops appearing in search and stops being given to the AI.\n\n" +
        "There is no recovery: if you forget your password this note is gone."
    );
    if (!ok) return;
  }
  try {
    await apiJson(`/entries/${entry.id}/privacy`, {
      method: "POST",
      body: JSON.stringify({ private: makingPrivate }),
    });
    toast(makingPrivate ? "Note encrypted." : "Note is readable again.");
    await loadEntries();
  } catch (error) {
    toast(error.message, true);
  }
}

function entryOverflowMenu(entry) {
  const wrap = document.createElement("span");
  wrap.className = "menu-wrap";

  const menu = document.createElement("div");
  menu.className = "action-menu hidden";
  menu.setAttribute("role", "menu");

  const opener = smallButton("⋯", "More actions", () => {
    const willOpen = menu.classList.contains("hidden");
    closeActionMenus(); // only one menu open at a time
    if (willOpen) {
      menu.classList.remove("hidden");
      opener.setAttribute("aria-expanded", "true");
      menu.querySelector("button")?.focus();
    }
  });
  opener.setAttribute("aria-haspopup", "menu");
  opener.setAttribute("aria-expanded", "false");

  const items = [
    {
      label: entry.is_private ? "🔓 Make readable" : "🔒 Make private",
      title: entry.is_private
        ? "Decrypt this note so search and the AI can use it again"
        : "Encrypt this note at rest, and keep it out of search and the AI",
      run: () => toggleEntryPrivacy(entry),
    },
    {
      label: "🕘 History",
      title: "See earlier versions of this note, and put one back",
      run: () => openEntryHistory(entry),
    },
    {
      label: "🔄 Re-evaluate",
      title: "Refresh this note's AI confidence and suggest tags & links",
      run: () => reevaluateEntry(entry),
    },
    {
      label: "✨ Improve writing",
      title: "Proofread or rewrite this note with AI",
      run: () => {
        editingId = entry.id;
        renderEntries();
        // The edit textarea now exists — improve it in place.
        const box = document.querySelector(`#entry-list li[data-id="${entry.id}"] textarea`);
        if (box) openImprove(box);
      },
    },
    {
      label: "➕ Add context",
      title: "Append detail — the AI may refile it",
      run: () => {
        inlineAction = inlineActionIs(entry.id, "context") ? null : { id: entry.id, kind: "context" };
        renderEntries();
      },
    },
    {
      label: "⤵ Continue thought",
      title: "Start or extend a thread from this note",
      run: () => {
        inlineAction = inlineActionIs(entry.id, "continue") ? null : { id: entry.id, kind: "continue" };
        renderEntries();
      },
    },
    { label: "📎 Attach a file", run: () => attachFileTo(entry) },
    { label: "≈ Similar notes", run: () => toggleRelated(entry) },
    {
      label: "⏰ Remind me",
      run: () => {
        inlineAction = inlineActionIs(entry.id, "remind") ? null : { id: entry.id, kind: "remind" };
        renderEntries();
      },
    },
    { label: "🔗 Link to another", run: () => beginOrCompleteLink(entry) },
    {
      label: "🗑 Move to bin",
      danger: true,
      // Instant + one-click Undo, soft delete underneath (Wave J).
      run: async () => {
        await api(`/entries/${entry.id}`, { method: "DELETE" });
        await loadEntries();
        toastAction("Moved to the recycle bin.", "Undo", async () => {
          await api(`/entries/${entry.id}/restore`, { method: "POST" });
          await loadEntries();
          toast("Note restored.");
        });
      },
    },
  ];
  for (const item of items) {
    const button = document.createElement("button");
    button.setAttribute("role", "menuitem");
    button.className = "menu-item" + (item.danger ? " menu-danger" : "");
    button.textContent = item.label;
    if (item.title) button.title = item.title;
    button.addEventListener("click", () => {
      closeActionMenus();
      item.run();
    });
    menu.appendChild(button);
  }

  // Arrow-key navigation, as the role="menu" contract implies. ↑/↓ move between
  // items (wrapping), Home/End jump to the ends, Esc closes and returns focus
  // to the opener.
  menu.addEventListener("keydown", (event) => {
    const menuItems = [...menu.querySelectorAll('[role="menuitem"]')];
    const current = menuItems.indexOf(document.activeElement);
    if (event.key === "ArrowDown") {
      event.preventDefault();
      menuItems[(current + 1) % menuItems.length]?.focus();
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      menuItems[(current - 1 + menuItems.length) % menuItems.length]?.focus();
    } else if (event.key === "Home") {
      event.preventDefault();
      menuItems[0]?.focus();
    } else if (event.key === "End") {
      event.preventDefault();
      menuItems[menuItems.length - 1]?.focus();
    } else if (event.key === "Escape") {
      event.preventDefault();
      closeActionMenus();
      opener.focus();
    }
  });

  wrap.append(opener, menu);
  return wrap;
}

// The ➕ context / ⤵ continue / ⏰ remind boxes inside an entry card.
// Ask the AI to re-evaluate one note, then show its suggestions inline.
async function reevaluateEntry(entry) {
  closeActionMenus();
  toast("Re-evaluating with AI…");
  // Show a spinner on this exact card while the AI works.
  busyEntryId = entry.id;
  renderEntries();
  try {
    const result = await apiJson(`/entries/${entry.id}/reevaluate`, { method: "POST" });
    // If the confidence actually changed, flash the badge on the next render.
    const newConfidence = result.entry ? result.entry.ai_confidence : null;
    if (newConfidence !== null && newConfidence !== entry.ai_confidence) {
      flashConfidenceId = entry.id;
    }
    inlineAction = { id: entry.id, kind: "reevaluate", data: result };
    busyEntryId = null;
    await loadEntries(); // reflect the refreshed confidence/category, then show suggestions
  } catch (error) {
    busyEntryId = null;
    renderEntries();
    toast(error.message || "Re-evaluate failed.", true);
  }
}

// The inline result of a re-evaluate: new confidence, plus tag and link
// suggestions the user applies with a click (nothing is applied on its own).
function renderReevaluateResult(entry, wrap) {
  const data = inlineAction.data;
  const confidence = data.entry ? data.entry.ai_confidence : entry.ai_confidence;

  const head = document.createElement("p");
  head.className = "muted";
  head.textContent = data.recategorised_to
    ? `Re-evaluated — confidence ${confidence}%, moved to “${data.recategorised_to}”.`
    : `Re-evaluated — confidence now ${confidence}%.`;
  wrap.appendChild(head);

  // Drop suggestions the user already applied (the card re-renders after each).
  const haveTags = new Set(entry.tags);
  const linkedIds = new Set((entry.links || []).map((l) => l.entry_id));
  const tags = (data.suggested_tags || []).filter((t) => !haveTags.has(t));
  const links = (data.suggested_links || []).filter((l) => !linkedIds.has(l.id));

  if (tags.length) {
    const tagRow = document.createElement("div");
    tagRow.className = "recent";
    const label = document.createElement("span");
    label.className = "muted";
    label.textContent = "Add tags:";
    tagRow.appendChild(label);
    for (const tag of tags) {
      const tagChip = chip(`＋ ${tag}`, "tag", async () => {
        try {
          await api(`/entries/${entry.id}`, {
            method: "PUT",
            body: JSON.stringify({ tags: [...entry.tags, tag] }),
          });
          tagChip.remove();
          toast(`Tagged “${tag}”.`);
          loadEntries();
        } catch (error) {
          toast(error.message, true);
        }
      });
      tagChip.title = `Add the “${tag}” tag`;
      tagRow.appendChild(tagChip);
    }
    wrap.appendChild(tagRow);
  }

  if (links.length) {
    const label = document.createElement("p");
    label.className = "muted";
    label.textContent = "Link to related notes:";
    wrap.appendChild(label);
    for (const link of links) {
      const row = document.createElement("div");
      row.className = "row space-between reevaluate-link";
      const preview = document.createElement("span");
      preview.textContent = link.preview;
      row.appendChild(preview);
      row.appendChild(
        smallButton("🔗 Link", "Link these two notes", async () => {
          try {
            await api(`/entries/${entry.id}/links`, {
              method: "POST",
              body: JSON.stringify({ target_id: link.id }),
            });
            row.remove();
            toast("Notes linked.");
            loadEntries();
          } catch (error) {
            toast(error.message, true);
          }
        })
      );
      wrap.appendChild(row);
    }
  }

  if (!tags.length && !links.length) {
    const none = document.createElement("p");
    none.className = "muted";
    none.textContent = "No new tags or links to suggest right now.";
    wrap.appendChild(none);
  }

  wrap.appendChild(
    smallButton("Done", "Close", () => {
      inlineAction = null;
      renderEntries();
    })
  );
}

function renderInlineAction(entry) {
  const wrap = document.createElement("div");
  wrap.className = "inline-action";

  if (inlineAction.kind === "reevaluate") {
    renderReevaluateResult(entry, wrap);
    return wrap;
  }

  if (inlineAction.kind === "remind") {
    const preview = entry.content.length > 40 ? entry.content.slice(0, 39) + "…" : entry.content;
    const textInput = document.createElement("input");
    textInput.type = "text";
    textInput.value = `Follow up: ${preview}`;
    const dueInput = document.createElement("input");
    dueInput.type = "datetime-local";
    dueInput.value = defaultDueValue();
    const row = document.createElement("div");
    row.className = "row";
    row.appendChild(
      smallButton("Set reminder", "", async () => {
        if (await addReminder(textInput.value.trim(), dueInput.value, entry.id)) {
          inlineAction = null;
          renderEntries();
        }
      }, false)
    );
    row.appendChild(
      smallButton("Cancel", "", () => {
        inlineAction = null;
        renderEntries();
      })
    );
    wrap.append(textInput, dueInput, row);
    setTimeout(() => textInput.focus(), 0);
    return wrap;
  }

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

// Thumbnails need the auth header, which <img src> can't send — fetch
// the bytes once per attachment and cache an object URL (Wave M).
const thumbUrlCache = new Map();

async function attachmentObjectUrl(attachment) {
  if (thumbUrlCache.has(attachment.id)) return thumbUrlCache.get(attachment.id);
  const response = await api(`/files/${attachment.id}`);
  const url = URL.createObjectURL(await response.blob());
  thumbUrlCache.set(attachment.id, url);
  return url;
}

// Full-size image viewer: click anywhere or press Esc to close (Wave M).
function openLightbox(url, alt) {
  const overlay = document.createElement("div");
  overlay.className = "lightbox";
  overlay.setAttribute("role", "dialog");
  overlay.setAttribute("aria-label", alt || "Image preview");
  const img = document.createElement("img");
  img.src = url;
  img.alt = alt || "";
  overlay.appendChild(img);
  const close = () => {
    overlay.remove();
    document.removeEventListener("keydown", onKey);
  };
  const onKey = (e) => {
    if (e.key === "Escape") close();
  };
  overlay.addEventListener("click", close);
  document.addEventListener("keydown", onKey);
  document.body.appendChild(overlay);
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
    const relChip = chip(`≈ ${preview}`, "link", () => flashEntry(other.id));
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

// Text filter (Wave J): match note content or any tag, case-insensitive.
// --- the notes filter ------------------------------------------------------------
// Same lesson as the server's keyword search: a single substring match means
// the words have to be typed in the order they appear, which nobody can guess.
// This one also understands a few operators, because narrowing by tag or
// category is the thing you actually want once you have more than a few
// hundred notes — and it needs no AI whatsoever.
//
//   tag:work            only notes tagged "work"
//   cat:recipes         only notes in that category (category: also works)
//   is:pinned           pinned / private / linked / untagged
//   -picnic             notes that do NOT mention "picnic"
//   "exact phrase"      that phrase, verbatim
//
// Anything else is a plain word: all of them must appear, in any order.

function parseNoteQuery(raw) {
  const query = {
    words: [],
    phrases: [],
    exclude: [],
    tags: [],
    categories: [],
    flags: [],
  };
  // Pull quoted phrases out first so their spaces don't become word breaks.
  const remainder = (raw || "").replace(/"([^"]+)"/g, (_, phrase) => {
    query.phrases.push(phrase.toLowerCase().trim());
    return " ";
  });
  for (const token of remainder.split(/\s+/)) {
    if (!token) continue;
    const lower = token.toLowerCase();
    if (lower.startsWith("tag:")) query.tags.push(lower.slice(4));
    else if (lower.startsWith("category:")) query.categories.push(lower.slice(9));
    else if (lower.startsWith("cat:")) query.categories.push(lower.slice(4));
    else if (lower.startsWith("is:")) query.flags.push(lower.slice(3));
    else if (lower.startsWith("-") && lower.length > 1) query.exclude.push(lower.slice(1));
    else query.words.push(lower);
  }
  return query;
}

function noteQueryIsEmpty(query) {
  return (
    !query.words.length &&
    !query.phrases.length &&
    !query.exclude.length &&
    !query.tags.length &&
    !query.categories.length &&
    !query.flags.length
  );
}

function matchesSearch(entry) {
  if (!noteSearch) return true;
  const query = parseNoteQuery(noteSearch);
  if (noteQueryIsEmpty(query)) return true;

  const content = (entry.content || "").toLowerCase();
  const tags = (entry.tags || []).map((t) => t.toLowerCase());
  const category = (entry.category || "").toLowerCase();
  const haystack = `${content} ${tags.join(" ")}`;

  // A tag: or cat: filter is a statement about which notes count at all.
  if (query.tags.length && !query.tags.every((t) => tags.some((tag) => tag.includes(t)))) {
    return false;
  }
  if (query.categories.length && !query.categories.some((c) => category.includes(c))) {
    return false;
  }
  for (const flag of query.flags) {
    if (flag === "pinned" && !entry.pinned) return false;
    if (flag === "private" && !entry.is_private) return false;
    if (flag === "linked" && !(entry.links || []).length) return false;
    if (flag === "untagged" && tags.length) return false;
  }
  if (query.exclude.some((word) => haystack.includes(word))) return false;
  if (!query.phrases.every((phrase) => content.includes(phrase))) return false;
  // Every word must appear somewhere, in any order.
  return query.words.every((word) => haystack.includes(word));
}

// Write `text` into `element`, wrapping each matched term in a <mark>.
// Never uses innerHTML: a note containing "<script>" is text, not markup.
// Render note text with [[wiki links]] as clickable chips and search terms
// marked. Splits on the links first so a highlight can't land inside one.
function renderNoteText(element, text, terms) {
  element.replaceChildren();
  const pattern = /\[\[([^[\]]{1,120})\]\]/g;
  let cursor = 0;
  let match;
  while ((match = pattern.exec(text)) !== null) {
    if (match.index > cursor) {
      const span = document.createElement("span");
      highlightInto(span, text.slice(cursor, match.index), terms);
      element.appendChild(span);
    }
    const name = match[1].trim();
    const link = document.createElement("button");
    link.type = "button";
    link.className = "wiki-link";
    link.textContent = name;
    link.title = `Go to the note starting "${name}"`;
    link.addEventListener("click", (event) => {
      event.stopPropagation();
      const target = allEntries.find((e) =>
        (e.content || "").toLowerCase().startsWith(name.toLowerCase())
      );
      if (target) flashEntry(target.id);
      else toast(`No note starts with "${name}" yet.`, true);
    });
    element.appendChild(link);
    cursor = pattern.lastIndex;
  }
  if (cursor < text.length) {
    const span = document.createElement("span");
    highlightInto(span, text.slice(cursor), terms);
    element.appendChild(span);
  }
}

function highlightInto(element, text, terms) {
  element.replaceChildren();
  if (!terms.length) {
    element.textContent = text;
    return;
  }
  // One pass, longest terms first so "bread rolls" wins over "bread".
  const ordered = [...terms].sort((a, b) => b.length - a.length);
  const lower = text.toLowerCase();
  let cursor = 0;
  while (cursor < text.length) {
    let bestAt = -1;
    let bestTerm = "";
    for (const term of ordered) {
      const at = lower.indexOf(term, cursor);
      if (at !== -1 && (bestAt === -1 || at < bestAt)) {
        bestAt = at;
        bestTerm = term;
      }
    }
    if (bestAt === -1) {
      element.appendChild(document.createTextNode(text.slice(cursor)));
      return;
    }
    if (bestAt > cursor) {
      element.appendChild(document.createTextNode(text.slice(cursor, bestAt)));
    }
    const mark = document.createElement("mark");
    mark.textContent = text.slice(bestAt, bestAt + bestTerm.length);
    element.appendChild(mark);
    cursor = bestAt + bestTerm.length;
  }
}

// The words worth highlighting in a result — operators aren't text to find.
function searchHighlightTerms() {
  if (!noteSearch) return [];
  const query = parseNoteQuery(noteSearch);
  return [...query.phrases, ...query.words].filter((t) => t.length > 1);
}

// Sort comparator for the chosen mode (Wave J). Pinned always floats to
// the top first, matching the server's own ordering.
function sortEntries(entries) {
  const byPinned = (a, b) => Number(b.pinned) - Number(a.pinned);
  const modes = {
    newest: (a, b) => b.id - a.id,
    oldest: (a, b) => a.id - b.id,
    az: (a, b) => a.content.localeCompare(b.content),
    "most-used": (a, b) => b.access_count - a.access_count || b.id - a.id,
  };
  const cmp = modes[noteSort] || modes.newest;
  return [...entries].sort((a, b) => byPinned(a, b) || cmp(a, b));
}

function renderEntries() {
  const list = $("entry-list");
  const empty = $("empty-message");
  const noMatch = $("no-match-message");
  list.replaceChildren();

  let visible = activeCategory
    ? allEntries.filter((e) => e.category === activeCategory)
    : allEntries;
  visible = visible.filter(matchesSearch);

  const scope = activeCategory ? `${activeCategory} entries` : "All entries";
  // Say how many matched out of how many there are. Without it a filter that
  // hides most of the notebook looks identical to a notebook that's nearly
  // empty, and there's no signal that a filter is even active.
  const total = activeCategory
    ? allEntries.filter((e) => e.category === activeCategory).length
    : allEntries.length;
  $("entries-heading-label").textContent =
    noteSearch && visible.length !== total
      ? `${scope} — ${visible.length} of ${total}`
      : scope;
  // Distinguish "empty notebook" from "filter matched nothing".
  const notebookEmpty = allEntries.length === 0;
  empty.classList.toggle("hidden", !notebookEmpty);
  noMatch.classList.toggle("hidden", notebookEmpty || visible.length > 0);

  // A search or a non-default sort means the user wants a flat, ordered
  // list — thread nesting only applies to the default newest view.
  const flat = Boolean(noteSearch) || noteSort !== "newest";
  if (flat) {
    for (const entry of sortEntries(visible)) {
      list.appendChild(entryItem(entry, { actions: true }));
    }
    return;
  }

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

// name -> {id, count}. Needed because renaming and deleting work on ids,
// while the sidebar itself is built from the entries already in memory.
let categoryMeta = new Map();

async function loadCategories() {
  const rows = await apiJson("/categories", { silent: true }).catch(() => []);
  categoryMeta = new Map(rows.map((c) => [c.name, c]));
  renderSidebar();
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
    name.className = "category-name";
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

    // Rename/delete for real categories only — "All" is a filter, and
    // Uncategorised is where notes land when a category goes away.
    const meta = category ? categoryMeta.get(category) : null;
    if (meta && category !== "Uncategorised") {
      const actions = document.createElement("span");
      actions.className = "category-actions";
      actions.append(
        smallButton("✎", `Rename ${category}`, (event) => {
          event.stopPropagation();
          renameCategory(meta, category);
        }),
        smallButton("🗑", `Delete ${category}`, (event) => {
          event.stopPropagation();
          deleteCategory(meta, category, count);
        })
      );
      li.appendChild(actions);
    }
    ul.appendChild(li);
  };

  addRow("All", allEntries.length, null);
  for (const [category, count] of [...counts.entries()].sort()) {
    addRow(category, count, category);
  }
}

async function renameCategory(meta, currentName) {
  const next = prompt(`Rename "${currentName}" to:`, currentName);
  if (next === null) return;
  const name = next.trim();
  if (!name || name === currentName) return;

  // Renaming onto a category that already exists merges them, which is
  // usually the point — but it's destructive-looking, so it's confirmed.
  if (categoryMeta.has(name)) {
    const target = categoryMeta.get(name);
    const ok = confirm(
      `"${name}" already exists. Merge "${currentName}" into it?\n\n` +
        `Its notes move across — nothing is deleted. "${name}" would then ` +
        `hold ${target.count + meta.count} notes.`
    );
    if (!ok) return;
  }

  try {
    const result = await apiJson(`/categories/${meta.id}`, {
      method: "PUT",
      body: JSON.stringify({ name }),
    });
    if (activeCategory === currentName) activeCategory = name;
    toast(result.merged ? `Merged into "${name}".` : `Renamed to "${name}".`);
    await loadEntries();
    await loadCategories();
  } catch (error) {
    toast(error.message, true);
  }
}

async function deleteCategory(meta, name, count) {
  const ok = confirm(
    `Delete the category "${name}"?\n\n` +
      (count
        ? `Its ${count} note${count === 1 ? "" : "s"} are kept and become ` +
          `Uncategorised — deleting a category never deletes notes.`
        : "It has no notes in it.")
  );
  if (!ok) return;
  try {
    await apiJson(`/categories/${meta.id}`, { method: "DELETE" });
    if (activeCategory === name) activeCategory = null;
    toast(`Deleted "${name}". Its notes are in Uncategorised.`);
    await loadEntries();
    await loadCategories();
  } catch (error) {
    toast(error.message, true);
  }
}

// Loading skeletons (Wave I): shimmer placeholders instead of a blank
// list on the very first load, so a slow disk never looks broken.
function showEntrySkeletons() {
  const list = $("entry-list");
  if (list.children.length > 0) return; // only ever on a truly empty list
  for (let i = 0; i < 3; i++) {
    const li = document.createElement("li");
    li.className = "skeleton";
    li.setAttribute("aria-hidden", "true");
    list.appendChild(li);
  }
}

async function loadEntries() {
  showEntrySkeletons();
  allEntries = await apiJson("/entries");
  renderSidebar();
  // Categories the AI has filed notes into since the last load need their ids
  // fetched before rename/delete can work on them. Deliberately not awaited:
  // the list renders now and the controls light up a moment later.
  loadCategories();
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
    localStorage.removeItem("captureDraft"); // it's saved for real now
    $("entry-count").textContent = "0 characters";
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

// Say something to a screen reader without putting anything on screen. Used
// for changes whose only visible signal is colour or position.
function announce(message) {
  const region = $("live-region");
  if (!region) return;
  // Clearing first guarantees the change is seen as new even when the same
  // message is announced twice in a row.
  region.textContent = "";
  requestAnimationFrame(() => (region.textContent = message));
}

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
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    card.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "center" });
    // Restart the animation even when the same note is jumped to twice in a
    // row — without the reflow the class is already there and nothing replays.
    card.classList.remove("flash");
    void card.offsetWidth;
    card.classList.add("flash");
    // Announce it too: a colour change alone tells a screen-reader user
    // nothing about where they've just been sent.
    // Just the note's own text — card.textContent would drag in the category
    // chip, every tag, and the confidence badge.
    const body = card.querySelector(".entry-content")?.textContent || "";
    announce(`Showing note: ${body.trim().slice(0, 80)}`);
    clearTimeout(flashEntry.timer);
    flashEntry.timer = setTimeout(() => card.classList.remove("flash"), 2700);
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
async function streamChat({
  question,
  history,
  persona,
  useTools,
  noteIds,
  signal,
  onMeta,
  onThinking,
  onAnswer,
  onTool,
  onConfirm,
  onStats,
}) {
  const body = { question, history: history || [] };
  if (persona) body.persona = persona;
  if (typeof useTools === "boolean") body.use_tools = useTools;
  if (noteIds && noteIds.length) body.note_ids = noteIds;
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
      else if (event.type === "tool" && onTool) onTool(event);
      else if (event.type === "confirm" && onConfirm) onConfirm(event);
      else if (event.type === "stats" && onStats) onStats(event);
    }
  }
}

// Live markdown while streaming. Re-parsing the WHOLE accumulated answer on
// every animation frame is what made long answers feel laggy (each frame
// rebuilt the entire DOM). We now coalesce updates to ~15fps and skip the
// work entirely when the text hasn't changed — smooth, and far less main-
// thread churn, so other animations (the typing dots) don't stutter.
const LIVE_RENDER_INTERVAL_MS = 66;
function liveMarkdownRenderer(box) {
  let latest = "";
  let rendered = null;
  let timer = null;
  let lastRun = 0;

  const flush = () => {
    timer = null;
    lastRun = performance.now();
    if (latest === rendered) return; // nothing new since last paint
    rendered = latest;
    renderMarkdown(box, latest);
  };

  return (text) => {
    latest = text;
    if (timer) return;
    const wait = Math.max(0, LIVE_RENDER_INTERVAL_MS - (performance.now() - lastRun));
    timer = setTimeout(flush, wait);
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
  hide("retry-btn", "copy-btn", "speak-btn");
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
  answerBox.appendChild(typingDots()); // until the first token arrives
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
      useTools: false, // the quick-ask box is pure Q&A; actions live in the Chat tab
      signal: askController.signal,
      onMeta: (meta) => {
        renderChatMeta(meta);
        status.textContent = "The model is writing…";
      },
      onThinking: (delta) => {
        answerBox.querySelector(".typing-dots, .typing-label")?.remove();
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
    show("retry-btn", "copy-btn", "speak-btn", "new-chat-btn");
    // Asking changes both quick-access lists.
    loadRecentQuestions();
    loadMostUsed();
  } catch (error) {
    if (error.name === "AbortError") {
      stopped = true;
      renderMarkdown(answerBox, answerRaw); // keep what streamed so far
      status.textContent = "Stopped.";
      show("retry-btn", "copy-btn", "speak-btn");
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
    const chipEl = chip(question, "", () => askQuestion(question));
    box.appendChild(chipEl);
  }
}

// --- chat tab (Wave C) ------------------------------------------------------------

let chatConv = { id: null, turns: [] }; // the open conversation
let chatController = null;
let lastChatQuestion = ""; // powers Regenerate / Edit & resend

// The persona name to label assistant bubbles with (falls back to "Assistant").
function assistantLabel() {
  const select = $("persona-select");
  return (select && select.value) || "Assistant";
}

// A hover-reveal row of small actions under a chat bubble. Each action is
// { label, title, onClick }. onClick gets the click event so buttons can
// give inline feedback (e.g. a copy tick).
function chatMessageActions(actions) {
  const row = document.createElement("div");
  row.className = "msg-actions";
  for (const action of actions) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "msg-action";
    button.textContent = action.label;
    button.title = action.title;
    button.setAttribute("aria-label", action.title);
    button.addEventListener("click", action.onClick);
    row.appendChild(button);
  }
  return row;
}

// A small "what this answer cost" line under an assistant bubble: which model
// answered, how long it took, and — when Ollama reports them — token counts
// and generation speed.
function messageMetaLine({ model, elapsedMs, stats, toolCount = 0, rounds = 0 }) {
  const row = document.createElement("div");
  row.className = "msg-meta muted";
  const bits = [];
  if (model) bits.push(model);
  if (elapsedMs != null) {
    bits.push(elapsedMs < 1000 ? `${elapsedMs} ms` : `${(elapsedMs / 1000).toFixed(1)}s`);
  }
  if (stats) {
    const inTok = stats.prompt_tokens;
    const outTok = stats.output_tokens;
    if (inTok != null || outTok != null) {
      bits.push(`${inTok ?? "?"}→${outTok ?? "?"} tokens`);
    }
    if (outTok && stats.eval_ms) {
      bits.push(`${(outTok / (stats.eval_ms / 1000)).toFixed(1)} tok/s`);
    }
  }
  // What the agent actually did, so a turn that used tools says so rather
  // than looking identical to one that didn't.
  if (toolCount) bits.push(`${toolCount} tool${toolCount === 1 ? "" : "s"}`);
  if (rounds > 1) bits.push(`${rounds} rounds`);
  row.textContent = bits.join(" · ");
  row.title =
    "Model · response time · prompt→output tokens · generation speed · tools used";
  return row;
}

// Remove a message from the live transcript. A saved conversation stores
// question/answer pairs, so deleting either half drops the whole exchange —
// otherwise the missing half would reappear on reopening the chat.
// Deleting from a user bubble drops the same exchange as deleting from the
// answer below it, so both buttons route through one implementation.
function removeChatBubble(bubble) {
  const assistant = bubble.classList.contains("user")
    ? bubble.nextElementSibling
    : bubble;
  if (!assistant?.classList.contains("assistant")) return;
  return deleteChatTurn(assistant);
}

async function copyToClipboard(text, button) {
  try {
    await navigator.clipboard.writeText(text);
    if (button) {
      const original = button.textContent;
      button.textContent = "✓";
      setTimeout(() => (button.textContent = original), 1200);
    }
  } catch {
    toast("Couldn't copy to the clipboard.", true);
  }
}

// Put a question back in the input so it can be tweaked and re-sent.
// Edit a question in place, the way you'd expect a chat to work.
//
// The old version just copied the text into the input box: the original
// question and its answer stayed put, and re-sending appended a second
// exchange below them. So a small correction left the thread showing the typo,
// the answer to the typo, and then the fix — which is the opposite of editing.
//
// Now the bubble itself becomes a textarea. Saving rewrites that question,
// drops every exchange after it (they were answers to the old wording), and
// asks again from that point.
function editAndResend(bubble, text) {
  if (chatController) return; // not mid-stream
  if (bubble.querySelector(".msg-edit")) return; // already editing
  const body = bubble.querySelector(".msg-body");
  const actions = bubble.querySelector(".msg-actions");
  const original = text;

  const editor = document.createElement("div");
  editor.className = "msg-edit";
  const box = document.createElement("textarea");
  box.value = original;
  box.rows = Math.min(8, Math.max(2, original.split("\n").length + 1));
  box.setAttribute("aria-label", "Edit your question");

  const hint = document.createElement("p");
  hint.className = "muted msg-edit-hint";
  hint.textContent =
    "Saving replaces this question and clears the replies that came after it.";

  const row = document.createElement("div");
  row.className = "row msg-edit-actions";
  const save = document.createElement("button");
  save.className = "small";
  save.textContent = "Save & resend";
  const cancel = document.createElement("button");
  cancel.className = "ghost small";
  cancel.textContent = "Cancel";
  row.append(save, cancel);
  editor.append(box, hint, row);

  const close = () => {
    editor.remove();
    body.classList.remove("hidden");
    actions?.classList.remove("hidden");
  };
  cancel.addEventListener("click", close);
  box.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      event.preventDefault();
      close();
    } else if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
      event.preventDefault();
      save.click();
    }
  });
  save.addEventListener("click", async () => {
    const edited = box.value.trim();
    if (!edited) return;
    if (edited === original) return close();

    const bubbles = [...$("chat-messages").querySelectorAll(".msg")];
    const turnIndex = Math.floor(bubbles.indexOf(bubble) / 2);

    // Server first: if this fails, nothing on screen has been thrown away yet.
    if (chatConv.id !== null) {
      try {
        const result = await apiJson(`/conversations/${chatConv.id}/truncate`, {
          method: "POST",
          body: JSON.stringify({ from_turn: turnIndex }),
        });
        if (result.conversation_deleted) chatConv.id = null;
      } catch (error) {
        toast(`Couldn't edit that: ${error.message}`, true);
        return;
      }
    }
    // Drop this bubble and everything after it, then ask again.
    for (const later of bubbles.slice(bubbles.indexOf(bubble))) later.remove();
    chatConv.turns = chatConv.turns.slice(0, turnIndex);
    close();
    loadConversationList();
    sendChatMessage(edited);
  });

  body.classList.add("hidden");
  actions?.classList.add("hidden");
  bubble.appendChild(editor);
  box.focus();
  box.setSelectionRange(box.value.length, box.value.length);
}

// Re-run the most recent question and REPLACE the previous answer in place
// (user request: a redo shouldn't stack a second answer below the old one).
// The original "you" bubble stays; only the assistant bubble is swapped.
function regenerateLastAnswer() {
  if (!lastChatQuestion || chatController) return;
  const assistantBubbles = $("chat-messages").querySelectorAll(".msg.assistant");
  const lastAssistant = assistantBubbles[assistantBubbles.length - 1];
  if (lastAssistant) lastAssistant.remove(); // clear the old answer first
  sendChatMessage(lastChatQuestion, {
    skipUserBubble: true,
    replaceLast: true,
    noteIds: lastChatAttachments,
  });
}

// The welcome shown in an empty chat so the page isn't a blank box.
function renderChatEmptyState() {
  const box = $("chat-messages");
  if (box.querySelector(".msg") || box.querySelector(".chat-empty")) return;
  const empty = document.createElement("div");
  empty.className = "chat-empty";
  const emblem = document.createElement("div");
  emblem.id = "chat-empty-emblem";
  emblem.className = "emblem emblem-centred";
  emblem.setAttribute("aria-hidden", "true");
  const title = document.createElement("p");
  title.className = "empty-title";
  title.textContent = "Chat with your notebook";
  const blurb = document.createElement("p");
  blurb.className = "muted";
  blurb.textContent =
    "Ask a question and the AI answers from your saved notes. Turn on “AI can " +
    "make changes” and it can create, tag, link, and organise notes for you too.";
  empty.append(emblem, title, blurb);
  box.appendChild(empty);
  renderEmblem(emblem, 52); // after insertion — see addAssistantBubble
}

function clearChatEmptyState() {
  $("chat-messages").querySelector(".chat-empty")?.remove();
}

// --- web panel: search + reader view ----------------------------------------
// Deliberately not an embedded browser. Pages are fetched and stripped to
// text by the backend, so nothing from a third-party site ever executes here.

let webReaderPage = null; // the page currently open in the reader

function toggleWebPanel(force) {
  const panel = $("web-panel");
  const show = force ?? panel.classList.contains("hidden");
  panel.classList.toggle("hidden", !show);
  if (show) {
    $("web-reader").classList.add("hidden");
    $("web-query").focus();
  }
}

async function runWebSearch() {
  const query = $("web-query").value.trim();
  if (!query) return;
  const status = $("web-status");
  const box = $("web-results");
  $("web-reader").classList.add("hidden");
  box.replaceChildren();
  status.classList.remove("error");
  status.textContent = "Searching the web…";
  let body;
  try {
    body = await apiJson(`/websearch?q=${encodeURIComponent(query)}&limit=8`);
  } catch (error) {
    status.classList.add("error");
    status.textContent = error.message;
    return;
  }
  const results = body.results || [];
  status.textContent = results.length
    ? `${results.length} results via ${body.provider}`
    : "No results — try different words.";
  for (const result of results) {
    const row = document.createElement("div");
    row.className = "web-result";

    const title = document.createElement("button");
    title.type = "button";
    title.className = "web-result-title";
    title.textContent = result.title || result.url;
    title.addEventListener("click", () => openWebReader(result.url));
    row.appendChild(title);

    const meta = document.createElement("div");
    meta.className = "web-result-meta muted";
    meta.textContent = result.domain || "";
    row.appendChild(meta);

    if (result.snippet) {
      const snippet = document.createElement("div");
      snippet.className = "web-result-snippet muted";
      snippet.textContent = result.snippet;
      row.appendChild(snippet);
    }

    const actions = document.createElement("div");
    actions.className = "row";
    actions.appendChild(
      smallButton("📖 Read here", "Open this page as clean text", () =>
        openWebReader(result.url)
      )
    );
    const open = document.createElement("a");
    open.href = result.url;
    open.target = "_blank";
    open.rel = "noopener noreferrer";
    open.className = "ghost small web-open-link";
    open.textContent = "↗ Open in browser";
    actions.appendChild(open);
    actions.appendChild(
      smallButton("💬 Ask about this", "Send this link to the chat", () => {
        $("chat-input").value = `About ${result.url} — `;
        $("chat-input").focus();
      })
    );
    row.appendChild(actions);
    box.appendChild(row);
  }
}

async function openWebReader(url) {
  const status = $("web-status");
  status.classList.remove("error");
  status.textContent = "Opening…";
  let page;
  try {
    page = await apiJson(`/websearch/read?url=${encodeURIComponent(url)}`);
  } catch (error) {
    status.classList.add("error");
    status.textContent = error.message;
    return;
  }
  webReaderPage = page;
  status.textContent = "";
  $("web-reader-title").textContent = page.title || page.domain;
  $("web-reader-source").textContent = page.domain;

  // Lay the page out as headings, paragraphs and lists rather than one wall
  // of text. Built with createElement/textContent — never innerHTML, since
  // the page is untrusted by definition.
  const box = $("web-reader-text");
  box.replaceChildren();
  const blocks = page.blocks && page.blocks.length ? page.blocks : null;
  if (!blocks) {
    const fallback = document.createElement("p");
    fallback.textContent = page.text || "(Nothing readable on that page.)";
    box.appendChild(fallback);
  } else {
    let list = null;
    for (const block of blocks) {
      if (block.type === "li") {
        if (!list) {
          list = document.createElement("ul");
          box.appendChild(list);
        }
        const li = document.createElement("li");
        li.textContent = block.text;
        list.appendChild(li);
        continue;
      }
      list = null;
      const tag =
        block.type === "heading" ? "h4" : block.type === "pre" ? "pre" : block.type === "blockquote" ? "blockquote" : "p";
      const el = document.createElement(tag);
      el.textContent = block.text;
      box.appendChild(el);
    }
  }
  box.scrollTop = 0;
  $("web-reader").classList.remove("hidden");
}

async function saveWebPageAsNote() {
  if (!webReaderPage) return;
  // Prefer the structured read — it drops the nav/cookie chrome.
  const readable = (webReaderPage.blocks || [])
    .map((b) => (b.type === "heading" ? `\n## ${b.text}` : b.type === "li" ? `- ${b.text}` : b.text))
    .join("\n")
    .trim();
  const excerpt = (readable || webReaderPage.text || "").slice(0, 1200);
  const content = `${webReaderPage.title}\n${webReaderPage.url}\n\n${excerpt}`;
  try {
    await apiJson("/entries", {
      method: "POST",
      body: JSON.stringify({ content, tags: ["web"] }),
    });
    toast("Saved as a note.");
    loadEntries().catch(() => {});
  } catch (error) {
    toast(error.message, true);
  }
}

function personaOptions() {
  // Built-ins + the user's custom personas (deduped — an edited built-in
  // is stored under the same name); the active one pre-selected.
  const select = $("persona-select");
  const custom = (prefsCache && prefsCache.personas) || [];
  const active = (prefsCache && prefsCache.active_persona) || "Librarian";
  const names = [
    ...new Set(["Librarian", "Coach", "Analyst", ...custom.map((p) => p.name)]),
  ];
  // name -> its prompt, so the dropdown can describe each persona on hover.
  const overrides = new Map(custom.map((p) => [p.name, p]));
  const describe = (name) => {
    const prompt = (overrides.get(name) || {}).prompt || BUILTIN_PERSONAS[name] || "";
    return prompt.length > 200 ? prompt.slice(0, 199) + "…" : prompt;
  };
  select.replaceChildren();
  for (const name of names) {
    const option = document.createElement("option");
    option.value = name;
    option.textContent = name;
    option.title = describe(name); // hover shows what this persona does
    if (name === active) option.selected = true;
    select.appendChild(option);
  }
  // Also surface the active persona's description on the closed select itself.
  select.title = describe(active);
  select.onchange = () => (select.title = describe(select.value));
}

// Three-dot "the model is about to speak" indicator (Wave D).
// "The model is working." Under reduced motion the bouncing dots are frozen by
// the blanket animation rules — three motionless dots say nothing at all, and
// read as a rendering fault rather than as progress. So when motion is off,
// this becomes a word instead of a gesture. Silence is not an acceptable
// substitute for either.
function reducedMotionWanted() {
  return (
    window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
    document.documentElement.dataset.motion === "reduced"
  );
}

// `label` is the reduced-motion fallback: with animations off the dots can't
// convey "working", so a word has to. Callers that already print their own
// sentence beside the indicator pass theirs in — the weekly digest used to
// append " Thinking about your week…" next to the default, and it rendered as
// "Thinking… Thinking about your week…" (user-reported).
function typingDots(label = "Thinking…") {
  if (reducedMotionWanted()) {
    const text = document.createElement("span");
    text.className = "typing-label";
    text.textContent = label;
    text.setAttribute("role", "status");
    return text;
  }
  const dots = document.createElement("span");
  dots.className = "typing-dots";
  dots.setAttribute("role", "status");
  dots.setAttribute("aria-label", label);
  for (let i = 0; i < 3; i++) dots.appendChild(document.createElement("span"));
  return dots;
}

// "⋯ Thinking about your week…" as one node: animated dots plus the sentence
// when motion is allowed, and the sentence alone when it isn't — never both
// the default label and a caller's, which is what produced the doubled
// "Thinking… Thinking about your week…" in the digest widget.
function typingLine(label) {
  const wrap = document.createElement("span");
  const indicator = typingDots(label);
  wrap.appendChild(indicator);
  if (!indicator.classList.contains("typing-label")) {
    wrap.append(` ${label}`);
  }
  return wrap;
}

// Coalesce scroll-to-end into one write per animation frame. It used to run
// on every streamed token, forcing a synchronous reflow each time — a big
// source of jank on long answers.
let chatScrollQueued = false;
function chatScrollToEnd() {
  if (chatScrollQueued) return;
  chatScrollQueued = true;
  requestAnimationFrame(() => {
    chatScrollQueued = false;
    const box = $("chat-messages");
    box.scrollTop = box.scrollHeight;
  });
}

function addBubble(role, text) {
  clearChatEmptyState();
  const bubble = document.createElement("div");
  bubble.className = `msg ${role}`;

  const label = document.createElement("div");
  label.className = "msg-role";
  label.textContent = role === "user" ? "You" : assistantLabel();
  const body = document.createElement("div");
  body.className = "msg-body";
  body.textContent = text;
  bubble.append(label, body);

  if (role === "user") {
    bubble.appendChild(
      chatMessageActions([
        { label: "⧉", title: "Copy", onClick: (e) => copyToClipboard(text, e.currentTarget) },
        { label: "✎", title: "Edit this question", onClick: () => editAndResend(bubble, text) },
        { label: "🗑", title: "Delete this message", onClick: () => removeChatBubble(bubble) },
      ])
    );
  }
  $("chat-messages").appendChild(bubble);
  chatScrollToEnd();
  return bubble;
}

// --- the agent's run, as an ordered timeline --------------------------------------
// A turn used to render into three fixed slots — thinking, then every tool chip,
// then the answer — regardless of when those things actually happened. For a
// multi-step agent run that destroys the one thing worth seeing: the order. A
// model that thought, searched, thought again and then answered looked
// identical to one that answered immediately.
//
// So steps are appended as the events arrive. Consecutive deltas of the same
// kind extend the current step; a different kind starts a new one, which is
// what produces the thinking → tool → tool → answer chain the user follows.
function agentTimeline(holder) {
  let current = null; // the step still being written into
  const answerSteps = []; // every prose step, in order
  const thinkingSteps = [];
  const record = []; // a serialisable copy, for persistence

  const foldEarlierThinking = () => {
    // Reasoning that has produced output is finished — collapse it so the
    // answer isn't buried under it, but leave it there to reopen.
    for (const step of thinkingSteps) step.el.open = false;
  };

  const startThinking = () => {
    const el = document.createElement("details");
    el.className = "agent-step step-thinking";
    el.open = true;
    const summary = document.createElement("summary");
    summary.textContent = "Thinking";
    const body = document.createElement("div");
    body.className = "thinking";
    el.append(summary, body);
    holder.appendChild(el);
    current = { kind: "thinking", el, body, raw: "" };
    thinkingSteps.push(current);
    return current;
  };

  const startAnswer = () => {
    foldEarlierThinking();
    const el = document.createElement("div");
    el.className = "agent-step step-answer bubble-answer";
    holder.appendChild(el);
    current = {
      kind: "answer",
      el,
      body: el,
      raw: "",
      render: liveMarkdownRenderer(el),
    };
    answerSteps.push(current);
    return current;
  };

  return {
    holder,
    thinking(delta) {
      const step = current?.kind === "thinking" ? current : startThinking();
      step.raw += delta;
      step.body.textContent = step.raw;
    },
    answer(delta) {
      const step = current?.kind === "answer" ? current : startAnswer();
      step.raw += delta;
      step.render(step.raw);
    },
    // A tool call is its own small step between the prose around it.
    tool(node) {
      foldEarlierThinking();
      holder.appendChild(node);
      current = null; // whatever comes next begins a fresh step
    },
    // Replay a saved run (reopening a conversation).
    replay(steps) {
      for (const step of steps || []) {
        if (step.kind === "thinking" && step.text) {
          this.thinking(step.text);
          if (current) current.el.open = false;
          current = null;
        } else if (step.kind === "answer" && step.text) {
          const node = startAnswer();
          node.raw = step.text;
          renderMarkdown(node.body, step.text);
          current = null;
        } else if (step.kind === "tool") {
          this.tool(toolChip(step.label, step.ok !== false));
        }
      }
    },
    noteStep(entry) {
      record.push(entry);
    },
    // Everything the model actually said, for copying, reading aloud and the
    // history sent with the next question.
    text() {
      return answerSteps.map((s) => s.raw).join("\n\n").trim();
    },
    thinkingText() {
      return thinkingSteps.map((s) => s.raw).join("\n\n").trim();
    },
    // Re-render each prose step properly once streaming has finished.
    finalise() {
      for (const step of answerSteps) renderMarkdown(step.body, step.raw);
      foldEarlierThinking();
    },
    // The box to put a message into when the model produced nothing at all.
    ensureAnswerBox() {
      return (answerSteps.at(-1) || startAnswer()).body;
    },
    hasAnswer() {
      return answerSteps.some((s) => s.raw.trim());
    },
    // The timeline in the order it happened, for saving with the turn.
    serialise() {
      const out = [];
      for (const node of holder.children) {
        if (node.classList.contains("step-thinking")) {
          const step = thinkingSteps.find((s) => s.el === node);
          if (step?.raw) out.push({ kind: "thinking", text: step.raw });
        } else if (node.classList.contains("step-answer")) {
          const step = answerSteps.find((s) => s.el === node);
          if (step?.raw) out.push({ kind: "answer", text: step.raw });
        } else if (node.classList.contains("tool-chip")) {
          out.push({
            kind: "tool",
            label: node.textContent,
            ok: !node.classList.contains("tool-chip-error"),
          });
        }
      }
      return out;
    },
  };
}

// An assistant bubble: an avatar, the step timeline, and a matching-records slot.
function addAssistantBubble() {
  clearChatEmptyState();
  const bubble = document.createElement("div");
  bubble.className = "msg assistant";

  // The app's own emblem stands in as the assistant's avatar.
  const label = document.createElement("div");
  label.className = "msg-role msg-role-assistant";
  const avatar = document.createElement("span");
  avatar.className = "msg-avatar";
  avatar.setAttribute("aria-hidden", "true");
  const name = document.createElement("span");
  name.textContent = assistantLabel();
  label.append(avatar, name);
  bubble.appendChild(label);
  // NB: the emblem is drawn after the bubble is in the DOM — p5 can't size a
  // canvas inside a detached element, which left the avatar blank until some
  // later render happened to redraw it.

  // Every step — reasoning, tool calls, prose — lands here in event order.
  const stepsHolder = document.createElement("div");
  stepsHolder.className = "agent-steps";

  const recordsHolder = document.createElement("div");

  bubble.append(stepsHolder, recordsHolder);
  $("chat-messages").appendChild(bubble);
  renderEmblem(avatar, 20); // now attached, so p5 can measure and draw
  chatScrollToEnd();
  const timeline = agentTimeline(stepsHolder);
  return { bubble, stepsHolder, recordsHolder, timeline };
}

// One "the AI did something" chip in a bubble (Wave G).
function toolChip(label, ok = true) {
  const item = document.createElement("div");
  item.className = `tool-chip ${ok ? "" : "tool-chip-error"}`.trim();
  item.textContent = label;
  return item;
}

// A destructive tool call parked for approval (Wave G). Nothing has
// happened yet — Confirm actually runs it via /chat/tools/execute.
function renderToolConfirm(holder, event) {
  const card = document.createElement("div");
  card.className = "tool-confirm";
  const text = document.createElement("p");
  text.textContent = `⚠️ The AI wants to: ${event.label}`;
  const row = document.createElement("div");
  row.className = "row";
  row.appendChild(
    smallButton(
      "Confirm",
      "Run this action",
      async () => {
        try {
          const result = await apiJson("/chat/tools/execute", {
            method: "POST",
            body: JSON.stringify({ name: event.name, arguments: event.arguments }),
          });
          card.replaceWith(toolChip(`✅ ${result.label || event.label}`));
          toast("Done — check Activity for the audit trail.");
          refreshAfterToolChanges();
        } catch (error) {
          toast(error.message, true);
        }
      },
      false
    )
  );
  row.appendChild(
    smallButton("Cancel", "Don't do this", () => {
      card.replaceWith(toolChip("✖ Cancelled — nothing was changed."));
    })
  );
  card.append(text, row);
  holder.appendChild(card);
  chatScrollToEnd();
}

// After the AI changes data, every list on screen may be stale.
function refreshAfterToolChanges() {
  loadEntries().catch(() => {});
  loadReminders().catch(() => {});
  loadMostUsed();
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

function renderDocList() {
  const filter = $("doc-filter").value.trim().toLowerCase();
  const list = $("doc-list");
  list.replaceChildren();
  const shown = docs.filter((d) => !filter || d.title.toLowerCase().includes(filter));
  $("doc-empty").classList.toggle("hidden", docs.length > 0);

  for (const doc of shown) {
    const li = document.createElement("li");
    li.className = "doc-item";
    if (currentDoc && doc.id === currentDoc.id) li.classList.add("active");
    const button = document.createElement("button");
    button.type = "button";
    button.className = "doc-item-button";
    const title = document.createElement("span");
    title.className = "doc-item-title";
    title.textContent = doc.title;
    const meta = document.createElement("span");
    meta.className = "muted doc-item-meta";
    meta.textContent = `${doc.words} word${doc.words === 1 ? "" : "s"} · ${relativeTime(doc.updated_at)}`;
    button.append(title, meta);
    button.addEventListener("click", () => openDocument(doc.id));
    li.appendChild(button);
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
}

async function openDocument(id) {
  // Never lose unsaved work by switching away from it.
  if (docDirty) await saveDocument({ silent: true });
  $("doc-content").placeholder =
    "# Start writing\n\nMarkdown works here — headings, **bold**, lists, tables, links.";
  const doc = await apiJson(`/documents/${id}`).catch(() => null);
  if (!doc) return;
  currentDoc = doc;
  $("doc-title").disabled = false;
  $("doc-content").disabled = false;
  $("doc-title").value = doc.title;
  $("doc-content").value = doc.content;
  docDirty = false;
  $("doc-saved").textContent = "Saved";
  renderDocPreview();
  renderDocList();
}

async function createDocument() {
  const doc = await apiJson("/documents", {
    method: "POST",
    body: JSON.stringify({ title: "Untitled", content: "" }),
  });
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

function renderDocPreview() {
  const preview = $("doc-preview");
  if (preview.classList.contains("hidden")) return;
  preview.replaceChildren();
  const title = ($("doc-title").value || "").trim();
  renderMarkdown(preview, title ? `# ${title}\n\n${$("doc-content").value}` : $("doc-content").value);
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
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = match ? match[1] : "document.md";
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
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
  if (!confirm(`Delete "${currentDoc.title}"? This can't be undone.`)) return;
  await apiJson(`/documents/${currentDoc.id}`, { method: "DELETE" });
  toast("Document deleted.");
  currentDoc = null;
  await loadDocuments();
}

// --- AI editing ---
// Always a proposal. Writing straight into the document would be the most
// destructive thing in the app.
let docAiController = null;

function openDocAiPanel() {
  if (!currentDoc) return;
  const box = $("doc-content");
  const selection = box.value.slice(box.selectionStart, box.selectionEnd);
  $("doc-ai-panel").dataset.selection = selection;
  $("doc-ai-scope").textContent = selection.trim()
    ? `Rewriting the ${selection.trim().split(/\s+/).length} selected word(s).`
    : "Rewriting the whole document. Select some text first to work on just that.";
  $("doc-ai-result").value = "";
  $("doc-ai-status").textContent = "";
  $("doc-ai-panel").classList.remove("hidden");
  $("doc-ai-instruction").focus();
}

function closeDocAiPanel() {
  $("doc-ai-panel").classList.add("hidden");
}

async function runDocAiEdit() {
  const instruction = $("doc-ai-instruction").value.trim();
  const status = $("doc-ai-status");
  if (!instruction) {
    status.classList.add("error");
    status.textContent = "Say what you'd like changed.";
    return;
  }
  status.classList.remove("error");
  status.textContent = "✨ Thinking…";
  docAiController = new AbortController();
  $("doc-ai-run").classList.add("hidden");
  $("doc-ai-cancel-run").classList.remove("hidden");
  try {
    const body = await apiJson(`/documents/${currentDoc.id}/ai-edit`, {
      method: "POST",
      signal: docAiController.signal,
      body: JSON.stringify({
        instruction,
        selection: $("doc-ai-panel").dataset.selection || "",
      }),
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

function acceptDocAiEdit() {
  const revised = $("doc-ai-result").value;
  if (!revised.trim()) return;
  const selection = $("doc-ai-panel").dataset.selection || "";
  const box = $("doc-content");
  if (selection) {
    const at = box.value.indexOf(selection);
    box.value =
      at === -1
        ? box.value
        : box.value.slice(0, at) + revised + box.value.slice(at + selection.length);
  } else {
    box.value = revised;
  }
  closeDocAiPanel();
  markDocDirty();
  renderDocPreview();
  saveDocument({ silent: true });
  toast("Applied the AI's edit.");
}

// --- the writing room: thoughts in, a note out -----------------------------------
// The draft is deliberately kept in the browser (and localStorage) rather than
// in the database. A half-finished draft isn't a note, and quietly filling the
// notebook with them would be worse than occasionally losing one.

const DRAFT_STORE = "writingRoomDraft";

function saveDraftLocally() {
  try {
    localStorage.setItem(
      DRAFT_STORE,
      JSON.stringify({
        thoughts: $("draft-thoughts").value,
        draft: $("draft-text").value,
        tags: $("draft-tags").value,
      })
    );
  } catch {
    /* storage full or blocked — the draft is still on screen */
  }
}

function restoreDraftLocally() {
  try {
    const saved = JSON.parse(localStorage.getItem(DRAFT_STORE) || "null");
    if (!saved) return;
    $("draft-thoughts").value = saved.thoughts || "";
    $("draft-text").value = saved.draft || "";
    $("draft-tags").value = saved.tags || "";
    updateDraftCount();
  } catch {
    /* unreadable — start clean rather than throwing on load */
  }
}

function updateDraftCount() {
  const text = $("draft-text").value.trim();
  const words = text ? text.split(/\s+/).length : 0;
  $("draft-count").textContent = words ? `${words} word${words === 1 ? "" : "s"}` : "";
}

// Every AI pass is undoable. "Draft it" replaces the draft AND clears the
// thoughts box, so without this a revision you didn't like destroyed both your
// previous wording and the notes you wrote it from — with nothing to go back
// to. Handing your writing to the AI should never be a one-way door.
const draftUndoStack = [];
const MAX_DRAFT_UNDO = 20;

function pushDraftUndo() {
  draftUndoStack.push({
    thoughts: $("draft-thoughts").value,
    draft: $("draft-text").value,
  });
  if (draftUndoStack.length > MAX_DRAFT_UNDO) draftUndoStack.shift();
  updateDraftUndoButton();
}

function updateDraftUndoButton() {
  const button = $("draft-undo");
  button.disabled = draftUndoStack.length === 0;
  button.title = draftUndoStack.length
    ? `Go back to the version before the last AI pass (${draftUndoStack.length} available)`
    : "Nothing to undo yet";
}

function undoDraft() {
  const previous = draftUndoStack.pop();
  if (!previous) return;
  $("draft-thoughts").value = previous.thoughts;
  $("draft-text").value = previous.draft;
  updateDraftCount();
  updateDraftUndoButton();
  saveDraftLocally();
  $("draft-status").classList.remove("error");
  $("draft-status").textContent = "Went back to the previous version.";
  announce("Restored the draft from before the last AI pass.");
}

// One-shot AI calls (drafting, document edits) had no way out: press the
// button by mistake or watch it stall, and the only options were waiting or
// reloading the page. Each now runs against an AbortController so it can be
// cancelled, and shows that it's working while it does.
let draftController = null;

function setDraftBusy(busy) {
  $("draft-compose").classList.toggle("hidden", busy);
  $("draft-cancel").classList.toggle("hidden", !busy);
  $("draft-undo").disabled = busy || draftUndoStack.length === 0;
}

function cancelDraft() {
  draftController?.abort();
}

async function composeDraft() {
  const thoughts = $("draft-thoughts").value.trim();
  const draft = $("draft-text").value;
  const status = $("draft-status");
  if (!thoughts && !draft.trim()) {
    status.classList.add("error");
    status.textContent = "Write a thought first.";
    return;
  }
  status.classList.remove("error");
  status.textContent = draft.trim() ? "✨ Revising…" : "✨ Drafting…";
  draftController = new AbortController();
  setDraftBusy(true);
  try {
    const body = await apiJson("/drafts/compose", {
      method: "POST",
      signal: draftController.signal,
      body: JSON.stringify({
        thoughts,
        draft,
        instruction: $("draft-instruction").value.trim(),
      }),
    });
    // Only record an undo point once the model has actually returned
    // something — a failed call shouldn't add a step that changes nothing.
    if (body.draft !== draft) pushDraftUndo();
    $("draft-text").value = body.draft;
    updateDraftCount();
    // The thoughts have been folded in, so clear the box for the next round
    // rather than resending them and having the model repeat itself.
    if (body.ollama_running && thoughts) $("draft-thoughts").value = "";
    $("draft-instruction").value = "";
    const thinking = $("draft-thinking");
    thinking.classList.toggle("hidden", !body.thinking);
    $("draft-thinking-text").textContent = body.thinking || "";
    if (body.message) {
      status.classList.add("error");
      status.textContent = body.message;
    } else {
      status.textContent = "Draft updated — edit it, or add more thoughts.";
      announce("The draft has been updated.");
    }
    saveDraftLocally();
  } catch (error) {
    if (error.name === "AbortError") {
      // Nothing was written, so nothing is lost — say so rather than
      // showing it as a failure.
      status.textContent = "Stopped. Your thoughts and draft are untouched.";
    } else {
      status.classList.add("error");
      status.textContent = error.message;
    }
  } finally {
    draftController = null;
    setDraftBusy(false);
  }
}

async function saveDraftAsNote() {
  const content = $("draft-text").value.trim();
  const status = $("draft-status");
  if (!content) {
    status.classList.add("error");
    status.textContent = "There's no draft to save yet.";
    return;
  }
  status.classList.remove("error");
  status.textContent = "Saving…";
  const tags = $("draft-tags")
    .value.split(",")
    .map((t) => t.trim())
    .filter(Boolean);
  try {
    const entry = await apiJson("/entries", {
      method: "POST",
      body: JSON.stringify({ content, tags }),
    });
    $("draft-thoughts").value = "";
    $("draft-text").value = "";
    $("draft-tags").value = "";
    $("draft-thinking").classList.add("hidden");
    updateDraftCount();
    saveDraftLocally();
    status.textContent = "Saved as a note.";
    toast("Draft saved as a note.");
    await loadEntries();
    flashEntry(entry.id); // show them where it landed
  } catch (error) {
    status.classList.add("error");
    status.textContent = error.message;
  }
}

// --- attaching notes to a chat message ------------------------------------------
// "Use this note, specifically" is a stronger signal than any similarity
// score, so attached notes are sent to the model ahead of whatever retrieval
// finds. The picker searches the notes already loaded in memory — no request
// per keystroke, and it works the moment it's opened.

let attachedNoteIds = [];
// The set sent with the most recent message, so regenerate can reuse it.
let lastChatAttachments = [];

function attachedNotes() {
  return attachedNoteIds
    .map((id) => allEntries.find((e) => e.id === id))
    .filter(Boolean);
}

function noteLabel(entry, length = 40) {
  const text = notePreviewText(entry.content).replace(/\s+/g, " ").trim();
  return text.length > length ? `${text.slice(0, length - 1)}…` : text || "(empty note)";
}

function renderAttachments() {
  const box = $("chat-attachments");
  box.replaceChildren();
  const notes = attachedNotes();
  box.classList.toggle("hidden", notes.length === 0);
  $("attach-note").classList.toggle("has-attachments", notes.length > 0);
  for (const entry of notes) {
    const chipEl = document.createElement("span");
    chipEl.className = "chip attachment-chip";
    chipEl.title = entry.content;
    const label = document.createElement("span");
    label.textContent = `📎 ${noteLabel(entry)}`;
    const remove = document.createElement("button");
    remove.className = "attachment-remove";
    remove.type = "button";
    remove.textContent = "✕";
    remove.title = `Remove "${noteLabel(entry, 24)}"`;
    remove.setAttribute("aria-label", remove.title);
    remove.addEventListener("click", () => {
      attachedNoteIds = attachedNoteIds.filter((id) => id !== entry.id);
      renderAttachments();
      renderNotePickerList();
      announce(`Removed attachment. ${attachedNoteIds.length} note(s) attached.`);
    });
    chipEl.append(label, remove);
    box.appendChild(chipEl);
  }
}

function renderNotePickerList() {
  const query = $("note-picker-search").value.trim().toLowerCase();
  const list = $("note-picker-list");
  list.replaceChildren();

  // Attached notes stay at the top even when the search wouldn't match them,
  // so ticking one never makes it vanish from under the pointer.
  const matches = allEntries.filter((entry) => {
    if (attachedNoteIds.includes(entry.id)) return true;
    if (!query) return true;
    const haystack = `${entry.content} ${(entry.tags || []).join(" ")} ${entry.category}`;
    return haystack.toLowerCase().includes(query);
  });
  matches.sort((a, b) => {
    const aSel = attachedNoteIds.includes(a.id) ? 0 : 1;
    const bSel = attachedNoteIds.includes(b.id) ? 0 : 1;
    return aSel - bSel;
  });

  if (!matches.length) {
    const empty = document.createElement("li");
    empty.className = "muted note-picker-empty";
    empty.textContent = query ? "No notes match that." : "No notes yet.";
    list.appendChild(empty);
  }

  for (const entry of matches.slice(0, 50)) {
    const li = document.createElement("li");
    const label = document.createElement("label");
    const box = document.createElement("input");
    box.type = "checkbox";
    box.checked = attachedNoteIds.includes(entry.id);
    box.addEventListener("change", () => {
      if (box.checked) {
        if (!attachedNoteIds.includes(entry.id)) attachedNoteIds.push(entry.id);
      } else {
        attachedNoteIds = attachedNoteIds.filter((id) => id !== entry.id);
      }
      renderAttachments();
      updateNotePickerCount();
    });
    const text = document.createElement("span");
    text.className = "note-picker-text";
    text.textContent = noteLabel(entry, 70);
    const cat = document.createElement("span");
    cat.className = "chip";
    cat.textContent = entry.category;
    label.append(box, text, cat);
    li.appendChild(label);
    list.appendChild(li);
  }
  updateNotePickerCount();
}

function updateNotePickerCount() {
  const n = attachedNoteIds.length;
  $("note-picker-count").textContent = n
    ? `${n} note${n === 1 ? "" : "s"} attached`
    : "Nothing attached yet";
}

function openNotePicker() {
  $("note-picker-panel").classList.remove("hidden");
  $("attach-note").setAttribute("aria-expanded", "true");
  renderNotePickerList();
  $("note-picker-search").focus();
}

function closeNotePicker() {
  $("note-picker-panel").classList.add("hidden");
  $("attach-note").setAttribute("aria-expanded", "false");
}

function notePickerOpen() {
  return !$("note-picker-panel").classList.contains("hidden");
}

async function sendChatMessage(preset, opts = {}) {
  const input = $("chat-input");
  const status = $("chat-status");
  const question = (preset ?? input.value).trim();
  if (!question) return;
  lastChatQuestion = question;

  // Snapshot the attachments for this message. A regenerate re-uses the same
  // ones; a fresh send clears them, so they don't silently ride along on
  // every later question.
  const sentAttachments = opts.noteIds || attachedNoteIds.slice();
  if (!opts.replaceLast) {
    // Remembered so a regenerate re-runs with the same references — by then
    // the picker has been cleared.
    lastChatAttachments = sentAttachments;
    attachedNoteIds = [];
    renderAttachments();
    closeNotePicker();
  }

  $("chat-suggest").classList.add("hidden");
  input.value = "";
  input.disabled = true;
  hide("chat-send");
  show("chat-stop");
  status.classList.remove("error");
  status.textContent = "Searching your notes…";

  // Regenerate re-runs the same question without adding a duplicate "you".
  if (!opts.skipUserBubble) addBubble("user", question);
  const { bubble, stepsHolder, recordsHolder, timeline } = addAssistantBubble();
  // A placeholder until the first event arrives; the first real step evicts it.
  const pending = document.createElement("div");
  pending.className = "agent-step step-pending";
  pending.appendChild(typingDots());
  stepsHolder.appendChild(pending);
  const clearPending = () => pending.remove();
  let meta = null;
  let toolsActed = false;
  let stats = null;
  // Whether the user pressed Stop. An empty answer they asked for needs no
  // explanation; one they didn't ask for does.
  let stopped = false;
  const startedAt = performance.now();
  const toolEvents = []; // {label, ok} — persisted so chips survive a reload
  chatController = new AbortController();

  try {
    await streamChat({
      question,
      history: chatConv.turns.slice(-MAX_CLIENT_HISTORY),
      persona: $("persona-select").value || null,
      useTools: opts.useTools ?? $("tools-toggle").checked,
      noteIds: sentAttachments,
      signal: chatController.signal,
      onMeta: (m) => {
        meta = m;
        status.textContent = "The model is writing…";
      },
      onThinking: (delta) => {
        clearPending();
        timeline.thinking(delta);
        status.textContent = "The model is thinking…";
        chatScrollToEnd();
      },
      onAnswer: (delta) => {
        clearPending();
        timeline.answer(delta);
        status.textContent = "The model is writing…";
        chatScrollToEnd();
      },
      onTool: (event) => {
        clearPending();
        const label = event.ok ? event.label : `⚠️ ${event.error || event.label}`;
        timeline.tool(toolChip(label, event.ok));
        toolEvents.push({ label, ok: event.ok }); // remember for persistence
        if (event.ok) toolsActed = true;
        status.textContent = "The model is making changes…";
        chatScrollToEnd();
      },
      onConfirm: (event) => {
        clearPending();
        const card = document.createElement("div");
        renderToolConfirm(card, event);
        timeline.tool(card.firstElementChild || card);
        status.textContent = "Waiting for your confirmation…";
      },
      onStats: (event) => {
        // An agent turn reports once per round, so these accumulate: output
        // tokens and generation time add up, while the prompt size is the
        // largest context the model was given rather than the sum.
        if (!stats) {
          stats = { ...event };
          return;
        }
        stats.model = event.model || stats.model;
        stats.prompt_tokens = Math.max(stats.prompt_tokens || 0, event.prompt_tokens || 0);
        stats.output_tokens = (stats.output_tokens || 0) + (event.output_tokens || 0);
        stats.eval_ms = (stats.eval_ms || 0) + (event.eval_ms || 0);
        // The agent tags each round; the highest is how many it took.
        stats.round = Math.max(stats.round || 0, event.round || 0);
      },
    });
    status.textContent = "";
  } catch (error) {
    if (error.name === "AbortError") {
      stopped = true;
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

  clearPending();
  timeline.finalise();
  const answerRaw = timeline.text();
  const thinkingRaw = timeline.thinkingText();
  if (meta) renderRecordsDetails(recordsHolder, meta);
  // What this answer cost: model, wall-clock time, tokens, speed.
  const elapsedMs = Math.round(performance.now() - startedAt);
  // A turn that only ran tools still cost time and tokens, so it gets a meta
  // line too — previously an agent turn with no prose showed nothing at all.
  if (answerRaw || toolEvents.length) {
    bubble.appendChild(
      messageMetaLine({
        model: (stats && stats.model) || (meta && meta.answered_by),
        elapsedMs,
        stats,
        toolCount: toolEvents.length,
        rounds: (stats && stats.round) || 0,
      })
    );
  }
  chatScrollToEnd();
  if (toolsActed) refreshAfterToolChanges(); // the AI changed real data
  if (!answerRaw) {
    // The model returned nothing. This used to return early and leave the
    // bubble sitting there with the notes disclosure, no answer, no error and
    // no buttons — a dead end with nothing to click and nothing explaining it.
    if (opts.replaceLast) {
      // A regenerate already removed the old answer; don't leave a blank in
      // its place, since the previous one is gone either way.
      bubble.remove();
      toast("The model returned nothing that time. Try again.", true);
      return;
    }
    if (!stopped) {
      const note = document.createElement("p");
      note.className = "muted";
      note.textContent =
        "The model finished without writing anything. That usually means it ran " +
        "out of context or the model is struggling with this question — try again, " +
        "or rephrase it.";
      timeline.ensureAnswerBox().replaceChildren(note);
      // Retry and delete at minimum, so there's always a way forward.
      bubble.appendChild(
        chatMessageActions([
          { label: "↻", title: "Try again", onClick: () => regenerateLastAnswer() },
          { label: "🗑", title: "Delete this message", onClick: () => removeChatBubble(bubble) },
        ])
      );
      chatScrollToEnd();
    }
    return;
  }
  // Per-message actions: copy, regenerate, read-aloud, delete (Wave H voices).
  bubble.appendChild(
    chatMessageActions([
      { label: "⧉", title: "Copy answer", onClick: (e) => copyToClipboard(answerRaw, e.currentTarget) },
      { label: "↻", title: "Regenerate (replaces this answer)", onClick: () => regenerateLastAnswer() },
      { label: "🔊", title: "Read aloud", onClick: () => speakText(answerRaw) },
      { label: "🗑", title: "Delete this message", onClick: () => deleteChatTurn(bubble) },
    ])
  );

  // Regenerate replaces the last turn; a normal send appends a new one.
  if (opts.replaceLast && chatConv.turns.length) {
    chatConv.turns[chatConv.turns.length - 1] = { question, answer: answerRaw };
  } else {
    chatConv.turns.push({ question, answer: answerRaw });
  }
  // Persist the finished turn so the chat survives restarts.
  try {
    const payload = {
      question,
      answer: answerRaw,
      thinking: thinkingRaw || null,
      tools: toolEvents.length ? toolEvents : null,
      // The run in the order it happened, so reopening the chat shows the
      // same step-by-step process rather than a flattened summary.
      steps: timeline.serialise(),
    };
    if (chatConv.id === null) {
      const created = await apiJson("/conversations", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      chatConv.id = created.id;
      $("chat-title").textContent = created.title;
      // Let the AI name the thread once there's something to name. Silent
      // best-effort: the question-derived title stays if the model can't.
      apiJson(`/conversations/${created.id}/retitle`, { method: "POST", silent: true })
        .then((named) => {
          if (chatConv.id === created.id) $("chat-title").textContent = named.title;
          loadConversationList();
        })
        .catch(() => {});
    } else if (opts.replaceLast) {
      await apiJson(`/conversations/${chatConv.id}/turns/last`, {
        method: "PUT",
        body: JSON.stringify(payload),
      });
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

// Delete one Q&A exchange: its assistant bubble AND the user bubble just
// above it, from the screen, memory, and the saved conversation.
async function deleteChatTurn(assistantBubble) {
  if (chatController) return; // don't edit a chat mid-stream
  const bubbles = [...$("chat-messages").querySelectorAll(".msg.assistant")];
  const index = bubbles.indexOf(assistantBubble);
  if (index === -1) return;
  if (!confirm("Delete this message?")) return;

  if (chatConv.id !== null) {
    try {
      const result = await apiJson(`/conversations/${chatConv.id}/turns/${index}`, {
        method: "DELETE",
      });
      if (result.conversation_deleted) {
        newChatConversation();
        loadConversationList();
        return;
      }
    } catch {
      toast("Couldn't delete that message.", true);
      return;
    }
  }
  // The user bubble is the one immediately before this assistant bubble.
  const userBubble = assistantBubble.previousElementSibling;
  if (userBubble && userBubble.classList.contains("user")) userBubble.remove();
  assistantBubble.remove();
  chatConv.turns.splice(index, 1);
  if (!$("chat-messages").querySelector(".msg")) renderChatEmptyState();
  loadConversationList();
}

function newChatConversation() {
  chatConv = { id: null, turns: [] };
  lastChatQuestion = "";
  $("chat-messages").replaceChildren();
  $("chat-title").textContent = "New chat";
  renderChatEmptyState();
  loadChatSuggestions();
}

// Download the open conversation as clean Markdown (questions + answers).
function exportChatMarkdown() {
  if (!chatConv.turns.length) {
    toast("Nothing to export yet — ask something first.");
    return;
  }
  const title = $("chat-title").textContent || "Chat";
  let md = `# ${title}\n\n`;
  for (const turn of chatConv.turns) {
    md += `**You:** ${turn.question}\n\n${turn.answer}\n\n---\n\n`;
  }
  const slug =
    title.toLowerCase().replace(/[^\w]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40) ||
    "chat";
  const blob = new Blob([md], { type: "text/markdown" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${slug}.md`;
  a.click();
  URL.revokeObjectURL(url);
}

// --- resizable sidebars ----------------------------------------------------------
// Both sidebars were a fixed 230px. In the chat list that left about four
// characters of a conversation's name visible, which is no name at all — and
// how much room a sidebar deserves depends on your screen and your titles,
// not on a number picked once.
//
// Drag the edge to resize. The width is remembered per sidebar, and there's a
// keyboard path because a mouse-only control is one that some people simply
// cannot use.

const SIDEBAR_MIN = 170;
const SIDEBAR_MAX = 520;

function sidebarWidth(id, fallback = 260) {
  const saved = Number(localStorage.getItem(`sidebarWidth:${id}`));
  return Number.isFinite(saved) && saved >= SIDEBAR_MIN ? saved : fallback;
}

function applySidebarWidth(aside, width) {
  const clamped = Math.min(Math.max(Math.round(width), SIDEBAR_MIN), SIDEBAR_MAX);
  // The grid column is what actually sizes it; the aside just fills the column.
  aside.parentElement.style.gridTemplateColumns = `${clamped}px 1fr`;
  localStorage.setItem(`sidebarWidth:${aside.id}`, String(clamped));
  return clamped;
}

function makeSidebarResizable(aside) {
  if (!aside || aside.dataset.resizable) return;
  aside.dataset.resizable = "1";
  applySidebarWidth(aside, sidebarWidth(aside.id));

  const handle = document.createElement("div");
  handle.className = "sidebar-resize";
  // A real slider: screen readers announce it, and arrows resize it.
  handle.setAttribute("role", "separator");
  handle.setAttribute("aria-orientation", "vertical");
  handle.setAttribute("tabindex", "0");
  handle.setAttribute("aria-label", "Resize the sidebar — arrow keys, or drag");
  aside.appendChild(handle);

  const startDrag = (event) => {
    event.preventDefault();
    const startX = event.clientX;
    const startWidth = aside.getBoundingClientRect().width;
    document.body.classList.add("resizing-sidebar");

    const move = (e) => applySidebarWidth(aside, startWidth + (e.clientX - startX));
    const stop = () => {
      document.body.classList.remove("resizing-sidebar");
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", stop);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", stop);
  };
  handle.addEventListener("pointerdown", startDrag);

  handle.addEventListener("keydown", (event) => {
    const step = event.shiftKey ? 40 : 12;
    const current = aside.getBoundingClientRect().width;
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      applySidebarWidth(aside, current - step);
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      applySidebarWidth(aside, current + step);
    } else if (event.key === "Home") {
      event.preventDefault();
      applySidebarWidth(aside, 260); // back to the default
    }
  });
  // Double-click the handle to reset, the convention everywhere else.
  handle.addEventListener("dblclick", () => applySidebarWidth(aside, 260));
}

function initResizableSidebars() {
  for (const id of ["sidebar", "chat-sidebar", "doc-sidebar"]) {
    const aside = document.getElementById(id);
    if (aside) makeSidebarResizable(aside);
  }
}

// A ⋯ button that opens a small menu. Built from the same pieces as the note
// overflow menu so the two behave identically — one open at a time, click away
// or Escape to close, arrow keys to move.
function makeMenuItem(label, title, run) {
  return { label, title, run };
}

function kebabMenu(items, ariaLabel) {
  const wrap = document.createElement("span");
  wrap.className = "menu-wrap";

  const menu = document.createElement("div");
  menu.className = "action-menu hidden";
  menu.setAttribute("role", "menu");

  const opener = smallButton("⋯", ariaLabel, () => {
    const willOpen = menu.classList.contains("hidden");
    closeActionMenus();
    if (willOpen) {
      menu.classList.remove("hidden");
      opener.setAttribute("aria-expanded", "true");
      menu.querySelector("button")?.focus();
    }
  });
  opener.setAttribute("aria-haspopup", "menu");
  opener.setAttribute("aria-expanded", "false");

  for (const item of items) {
    const button = document.createElement("button");
    button.className = "menu-item";
    button.setAttribute("role", "menuitem");
    button.textContent = item.label;
    button.title = item.title;
    button.addEventListener("click", async (event) => {
      event.stopPropagation();
      closeActionMenus();
      await item.run();
    });
    menu.appendChild(button);
  }
  wrap.append(opener, menu);
  return wrap;
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
    // One ⋯ instead of three buttons. In a sidebar this narrow they were
    // taking most of the row, leaving a few characters of the chat's name.
    const actions = document.createElement("span");
    actions.className = "entry-actions";
    const items = [];
    items.push(
      makeMenuItem("✎ Rename", "Rename this chat", async () => {
        const next = prompt("Rename this chat:", conversation.title);
        if (!next || !next.trim()) return;
        await apiJson(`/conversations/${conversation.id}`, {
          method: "PUT",
          body: JSON.stringify({ title: next.trim() }),
        });
        loadConversationList();
      })
    );
    items.push(
      makeMenuItem("✨ Name with AI", "Let the AI name this chat", async () => {
        const named = await apiJson(`/conversations/${conversation.id}/retitle`, {
          method: "POST",
        }).catch((e) => {
          toast(e.message, true);
          return null;
        });
        if (!named) return;
        if (chatConv.id === conversation.id) $("chat-title").textContent = named.title;
        toast(named.ai_named ? `Renamed to “${named.title}”.` : "Used the first question as the title.");
        loadConversationList();
      })
    );
    items.push(
      makeMenuItem("🗑 Delete", "Delete this chat", async () => {
        if (!confirm("Delete this saved chat?")) return;
        await apiJson(`/conversations/${conversation.id}`, { method: "DELETE" });
        if (chatConv.id === conversation.id) newChatConversation();
        loadConversationList();
      })
    );
    actions.appendChild(kebabMenu(items, `Actions for ${conversation.title}`));
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
      // Replay the run in the order it happened when the turn recorded one.
      // Older turns (saved before steps existed) only have the flattened
      // thinking/tools/answer, so they're rebuilt in that fixed order —
      // everything is still shown, just without the interleaving.
      if (message.steps && message.steps.length) {
        handles.timeline.replay(message.steps);
      } else {
        if (message.thinking) {
          handles.timeline.thinking(message.thinking);
        }
        // Re-draw the tool-activity chips (Wave G) so they don't vanish on
        // reload the way they used to (user-reported).
        for (const t of message.tools || []) {
          handles.timeline.tool(toolChip(t.label, t.ok !== false));
        }
        if (message.content) {
          handles.timeline.answer(message.content);
        }
      }
      handles.timeline.finalise();
      const turnIndex = chatConv.turns.length; // index this pair will occupy
      handles.bubble.appendChild(
        chatMessageActions([
          { label: "⧉", title: "Copy answer", onClick: (e) => copyToClipboard(message.content, e.currentTarget) },
          { label: "🔊", title: "Read aloud", onClick: () => speakText(message.content) },
          { label: "🗑", title: "Delete this message", onClick: () => deleteChatTurn(handles.bubble) },
        ])
      );
      if (lastQuestionText !== null) {
        chatConv.turns.push({ question: lastQuestionText, answer: message.content });
      }
    }
  }
  if (!full.messages.length) renderChatEmptyState();
  if (lastQuestionText) lastChatQuestion = lastQuestionText;
  loadConversationList();
  chatScrollToEnd();
}

async function loadChatSuggestions() {
  // Only the welcome placeholder may be present — real messages hide the chips.
  if ($("chat-messages").querySelector(".msg")) return;
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
    const chipEl = chip(question, "", () => sendChatMessage(question));
    box.appendChild(chipEl);
  }
}

// Personas section in Settings (Wave C, editing + reset in Wave D).
// Mirrors the backend's built-ins: editing one saves an override with the
// same name (the saved list wins), and Reset deletes the override.
const BUILTIN_PERSONAS = {
  Librarian: "You are the librarian of the user's personal notebook.",
  Coach:
    "You are an encouraging personal coach reviewing the user's notes. " +
    "Spot patterns, celebrate progress, and suggest one concrete next step.",
  Analyst:
    "You are a precise analyst. Extract the facts, numbers, and patterns " +
    "from the notes and organise your answer clearly.",
};

let personaEditing = null; // name currently in inline-edit mode

async function savePersonaList(personas) {
  await apiJson("/preferences", {
    method: "PUT",
    body: JSON.stringify({ personas }),
  });
  await renderPersonas();
  personaOptions();
}

async function renderPersonas() {
  prefsCache = await apiJson("/preferences").catch(() => prefsCache);
  const custom = (prefsCache && prefsCache.personas) || [];
  const overrides = new Map(custom.map((p) => [p.name, p]));
  const list = $("persona-list");
  list.replaceChildren();

  const rows = [
    ...Object.keys(BUILTIN_PERSONAS).map((name) => ({
      name,
      builtin: true,
      overridden: overrides.has(name),
      prompt: overrides.has(name) ? overrides.get(name).prompt : BUILTIN_PERSONAS[name],
    })),
    ...custom
      .filter((p) => !(p.name in BUILTIN_PERSONAS))
      .map((p) => ({ ...p, builtin: false, overridden: false })),
  ];

  for (const persona of rows) {
    const li = document.createElement("li");

    if (personaEditing === persona.name) {
      // Inline editor: textarea + save/cancel.
      const textarea = document.createElement("textarea");
      textarea.rows = 3;
      textarea.value = persona.prompt;
      const row = document.createElement("div");
      row.className = "row";
      row.appendChild(
        smallButton(
          "Save",
          "",
          async () => {
            const prompt = textarea.value.trim();
            if (!prompt) return;
            const updated = custom.filter((p) => p.name !== persona.name);
            updated.push({ name: persona.name, prompt });
            personaEditing = null;
            await savePersonaList(updated);
          },
          false
        )
      );
      row.appendChild(
        smallButton("Cancel", "", () => {
          personaEditing = null;
          renderPersonas();
        })
      );
      li.append(chip(persona.name), textarea, row);
      list.appendChild(li);
      setTimeout(() => textarea.focus(), 0);
      continue;
    }

    const row = document.createElement("div");
    row.className = "entry-meta";
    row.appendChild(chip(persona.name));
    if (persona.builtin) {
      row.appendChild(chip(persona.overridden ? "edited" : "built-in", "tag"));
    }
    const note = document.createElement("span");
    note.className = "muted persona-preview";
    note.textContent = persona.prompt.slice(0, 70);
    row.appendChild(note);

    const actions = document.createElement("span");
    actions.className = "entry-actions";
    actions.appendChild(
      smallButton("Edit", "Edit this persona's prompt", () => {
        personaEditing = persona.name;
        renderPersonas();
      })
    );
    if (persona.builtin && persona.overridden) {
      actions.appendChild(
        smallButton("Reset", "Restore the default prompt", async () => {
          await savePersonaList(custom.filter((p) => p.name !== persona.name));
        })
      );
    }
    if (!persona.builtin) {
      actions.appendChild(
        smallButton("Delete", "Remove this persona", async () => {
          if (!confirm(`Delete the “${persona.name}” persona?`)) return;
          await savePersonaList(custom.filter((p) => p.name !== persona.name));
        })
      );
    }
    row.appendChild(actions);
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

// --- skills (Wave G): one-click saved requests for the chat tab -------------------

// Built-ins ship with the app; the user's own live in preferences.
// "Tidy suggestions" is the self-organising librarian: it proposes
// merges/renames/links and asks — it never changes anything silently.
// `useTools: true` marks a skill that DOES things (via the AI's tools) rather
// than just answering — running it turns on "AI can make changes" for that
// message, so an action skill actually acts. Destructive steps still confirm.
const BUILTIN_SKILLS = [
  {
    name: "📋 Summarise my week",
    prompt:
      "Summarise what I've saved in the last 7 days: the main topics, " +
      "anything that looks important, and one thing worth revisiting.",
  },
  {
    name: "🧹 Find loose ends",
    prompt:
      "Look through my notes for loose ends — unfinished tasks, open " +
      "questions, or things I said I'd do. List each one with its note id.",
  },
  {
    name: "🏷 Auto-tag my notes",
    useTools: true,
    prompt:
      "Find my notes that have no tags or very few tags. For each one, add 2–3 " +
      "relevant short tags using the tag_note tool. When you're done, tell me " +
      "which notes you tagged and with what.",
  },
  {
    name: "🔗 Link related notes",
    useTools: true,
    prompt:
      "Find pairs of my notes that are clearly about the same thing but aren't " +
      "linked yet. Link each pair with the link_notes tool, then give me a short " +
      "summary of what you connected.",
  },
  {
    name: "🗂 Tidy suggestions",
    prompt:
      "Review my categories and tags (use list_categories and count_notes). " +
      "Suggest merges, renames, or links between related notes that would " +
      "tidy the notebook. Don't change anything yet — list your suggestions " +
      "and ask which ones I'd like you to apply.",
  },
  {
    name: "✉️ Draft an email",
    prompt:
      "Help me draft an email. Ask me who it's to and what it's about if I " +
      "haven't said, then write a clear, friendly draft I can edit.",
  },
  {
    name: "💡 Brainstorm ideas",
    prompt:
      "Brainstorm ideas with me. Ask what topic if I haven't given one, then " +
      "offer a varied list of ideas, drawing on anything relevant in my notes.",
  },
  {
    name: "📖 Explain a concept",
    prompt:
      "Explain a concept to me clearly and simply. Ask which concept if I " +
      "haven't named one, then explain it with a short example.",
  },
  {
    name: "🗓 Create a study plan",
    prompt:
      "Help me create a study or action plan. Ask about the goal and timeframe " +
      "if I haven't said, then lay out a realistic step-by-step plan.",
  },
];

function allSkills() {
  const custom = (prefsCache && prefsCache.skills) || [];
  return [...BUILTIN_SKILLS, ...custom];
}

// Which custom skill (by name) the editor is currently editing, if any.
// Tracking it lets Edit rename a skill instead of leaving a duplicate.
let editingSkillName = null;

function startEditingSkill(skill) {
  editingSkillName = skill.name;
  $("skill-name").value = skill.name;
  $("skill-prompt").value = skill.prompt;
  $("skill-tools").checked = !!skill.useTools;
  $("skill-add").textContent = "Save changes";
  $("skill-cancel").classList.remove("hidden");
  $("skill-status").textContent = `Editing “${skill.name}”…`;
  $("skill-prompt").focus();
}

function stopEditingSkill() {
  editingSkillName = null;
  $("skill-name").value = "";
  $("skill-prompt").value = "";
  $("skill-tools").checked = false;
  $("skill-add").textContent = "Add skill";
  $("skill-cancel").classList.add("hidden");
  $("skill-status").textContent = "";
}

// Run a skill. An action skill (useTools) turns on "AI can make changes" for
// this run — and leaves it on, visibly, so the user sees the AI is acting —
// so it can actually use its tools instead of only answering.
function runSkill(skill) {
  if (skill.useTools) $("tools-toggle").checked = true;
  sendChatMessage(skill.prompt, { useTools: skill.useTools || undefined });
}

function loadChatSkills() {
  const box = $("chat-skills");
  box.replaceChildren();
  const label = document.createElement("span");
  label.className = "muted";
  label.textContent = "⚡ Skills:";
  box.appendChild(label);
  for (const skill of allSkills()) {
    const chipEl = chip(skill.name + (skill.useTools ? " ⚙" : ""), "", () => runSkill(skill));
    chipEl.title = skill.useTools
      ? `${skill.prompt}\n\n(This skill makes changes for you — destructive steps still ask first.)`
      : skill.prompt;
    box.appendChild(chipEl);
  }
  const manage = chip("＋ manage", "", () => openSettingsModal("skills"));
  manage.title = "Add or edit skills in Settings";
  box.appendChild(manage);
  box.classList.remove("hidden");
}

async function saveSkillList(skills) {
  prefsCache = await apiJson("/preferences", {
    method: "PUT",
    body: JSON.stringify({ skills }),
  });
  renderSkillSettings();
  loadChatSkills();
}

function renderSkillSettings() {
  const custom = (prefsCache && prefsCache.skills) || [];
  const list = $("skill-list");
  list.replaceChildren();

  for (const skill of BUILTIN_SKILLS) {
    const li = document.createElement("li");
    const row = document.createElement("div");
    row.className = "entry-meta";
    row.append(chip(skill.name), chip("built-in", "tag"));
    const note = document.createElement("span");
    note.className = "muted persona-preview";
    note.textContent = skill.prompt.slice(0, 70);
    row.appendChild(note);
    li.appendChild(row);
    list.appendChild(li);
  }

  for (const skill of custom) {
    const li = document.createElement("li");
    const row = document.createElement("div");
    row.className = "entry-meta";
    row.appendChild(chip(skill.name));
    const note = document.createElement("span");
    note.className = "muted persona-preview";
    note.textContent = skill.prompt.slice(0, 70);
    row.appendChild(note);
    const actions = document.createElement("span");
    actions.className = "entry-actions";
    actions.appendChild(
      smallButton("Edit", "Edit this skill", () => startEditingSkill(skill))
    );
    actions.appendChild(
      smallButton("Delete", "Remove this skill", async () => {
        if (!confirm(`Delete the “${skill.name}” skill?`)) return;
        await saveSkillList(custom.filter((s) => s.name !== skill.name));
      })
    );
    row.appendChild(actions);
    li.appendChild(row);
    list.appendChild(li);
  }
}

async function addSkill() {
  const name = $("skill-name").value.trim();
  const promptText = $("skill-prompt").value.trim();
  const status = $("skill-status");
  if (!name || !promptText) {
    status.textContent = "Both a name and a request are needed.";
    return;
  }
  // Drop any skill with the new name AND (when editing) the one being edited,
  // so saving updates in place and even a rename doesn't leave a duplicate.
  const custom = ((prefsCache && prefsCache.skills) || []).filter(
    (s) => s.name !== name && s.name !== editingSkillName
  );
  custom.push({ name, prompt: promptText, useTools: $("skill-tools").checked || undefined });
  const wasEditing = editingSkillName;
  await saveSkillList(custom);
  stopEditingSkill();
  status.textContent = wasEditing ? `Updated “${name}”.` : `Saved “${name}”.`;
}

// --- Wave O: agent-tools toggles ----------------------------------------------------

async function renderToolSettings() {
  const list = $("tool-list");
  const [catalog, prefs] = await Promise.all([
    apiJson("/chat/tools").catch(() => []),
    apiJson("/preferences").catch(() => ({ disabled_tools: [] })),
  ]);
  prefsCache = prefs;
  const disabled = new Set(prefs.disabled_tools || []);
  list.replaceChildren();
  for (const tool of catalog) {
    const li = document.createElement("li");
    const label = document.createElement("label");
    label.className = "tool-row";
    const check = document.createElement("input");
    check.type = "checkbox";
    check.checked = !disabled.has(tool.name);
    // web_search is gated by the separate online opt-in — show why it's off.
    if (tool.online && !tool.enabled && !disabled.has(tool.name)) {
      check.checked = false;
      check.disabled = true;
      check.title = "Enable web search in Preferences first";
    }
    check.addEventListener("change", async () => {
      const next = new Set(prefsCache.disabled_tools || []);
      if (check.checked) next.delete(tool.name);
      else next.add(tool.name);
      prefsCache = await apiJson("/preferences", {
        method: "PUT",
        body: JSON.stringify({ disabled_tools: [...next] }),
      });
    });
    const text = document.createElement("span");
    const name = document.createElement("strong");
    name.textContent = tool.name.replace(/_/g, " ");
    text.append(name);
    if (tool.destructive) text.append(" ", chip("confirms first", "review"));
    if (tool.online) text.append(" ", chip("online", "tag"));
    const desc = document.createElement("span");
    desc.className = "muted tool-desc";
    desc.textContent = tool.description;
    label.append(check, text);
    li.append(label, desc);
    list.appendChild(li);
  }
}

// --- Wave M: share skills/personas as JSON ------------------------------------------

function downloadJson(filename, payload) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// Open a picker, parse the chosen file, hand the object to `apply`.
function pickJsonFile(inputId, apply) {
  const input = $(inputId);
  input.onchange = async () => {
    const file = input.files[0];
    input.value = "";
    if (!file) return;
    try {
      apply(JSON.parse(await file.text()));
    } catch {
      toast("That file isn't valid JSON.", true);
    }
  };
  input.click();
}

// Merge imported {name, prompt} items over existing ones (imports win
// on a name clash) — used by both skills and personas.
function mergeNamedPrompts(existing, imported) {
  const cleaned = (imported || []).filter(
    (item) => item && typeof item.name === "string" && typeof item.prompt === "string"
  );
  if (!cleaned.length) return null;
  const names = new Set(cleaned.map((item) => item.name));
  return [...existing.filter((item) => !names.has(item.name)), ...cleaned];
}

// --- Wave M: batch operations on notes ----------------------------------------------

let selectMode = false;
const selectedIds = new Set();

function updateBatchCount() {
  const n = selectedIds.size;
  $("batch-count").textContent = `${n} selected`;
}

function fillBatchCategories() {
  const select = $("batch-category");
  select.replaceChildren();
  const placeholder = document.createElement("option");
  placeholder.value = "";
  placeholder.textContent = "Move to…";
  select.appendChild(placeholder);
  for (const name of [...new Set(allEntries.map((e) => e.category))].sort()) {
    const option = document.createElement("option");
    option.value = name;
    option.textContent = name;
    select.appendChild(option);
  }
  const fresh = document.createElement("option");
  fresh.value = "__new__";
  fresh.textContent = "＋ New category…";
  select.appendChild(fresh);
}

function enterSelectMode() {
  selectMode = true;
  selectedIds.clear();
  fillBatchCategories();
  updateBatchCount();
  show("batch-bar");
  $("select-btn").classList.add("active");
  renderEntries();
}

function exitSelectMode() {
  selectMode = false;
  selectedIds.clear();
  hide("batch-bar");
  $("select-btn").classList.remove("active");
  renderEntries();
}

function batchSelection() {
  const ids = [...selectedIds];
  if (!ids.length) toast("Tick some notes first.", true);
  return ids;
}

async function batchMove() {
  const ids = batchSelection();
  if (!ids.length) return;
  let category = $("batch-category").value;
  if (!category) {
    toast("Pick a category to move them to.", true);
    return;
  }
  if (category === "__new__") {
    category = (prompt("New category name:") || "").trim();
    if (!category) return;
  }
  for (const id of ids) {
    await apiJson(`/entries/${id}`, {
      method: "PUT",
      body: JSON.stringify({ category }),
    });
  }
  toast(`Moved ${ids.length} note${ids.length === 1 ? "" : "s"} to ${category}.`);
  exitSelectMode();
  await loadEntries();
}

async function batchTag() {
  const ids = batchSelection();
  if (!ids.length) return;
  const tag = (prompt("Tag to add to the selected notes:") || "").trim();
  if (!tag) return;
  for (const id of ids) {
    const entry = allEntries.find((e) => e.id === id);
    if (!entry) continue;
    await apiJson(`/entries/${id}`, {
      method: "PUT",
      body: JSON.stringify({ tags: [...new Set([...entry.tags, tag])] }),
    });
  }
  toast(`Tagged ${ids.length} note${ids.length === 1 ? "" : "s"} with “${tag}”.`);
  exitSelectMode();
  await loadEntries();
}

async function batchDelete() {
  const ids = batchSelection();
  if (!ids.length) return;
  if (!confirm(`Move ${ids.length} note${ids.length === 1 ? "" : "s"} to the recycle bin?`))
    return;
  for (const id of ids) await api(`/entries/${id}`, { method: "DELETE" });
  exitSelectMode();
  await loadEntries();
  toastAction(`Moved ${ids.length} to the recycle bin.`, "Undo", async () => {
    for (const id of ids) await api(`/entries/${id}/restore`, { method: "POST" });
    await loadEntries();
    toast("Notes restored.");
  });
}

// --- dashboard (Wave D) -----------------------------------------------------------

let dashEditMode = false;
let dragWidget = null; // widget name being dragged

// Widget registry: name → title + async renderer that fills a body div.
const DASH_WIDGETS = {
  stats: { title: "📊 Stats", render: renderStatsWidget },
  streak: { title: "🔥 Streak", render: renderStreakWidget },
  art: { title: "🎨 Notebook constellation", render: renderArtWidget },
  pinned: { title: "📌 Pinned notes", render: renderPinnedWidget },
  "recent-notes": { title: "🕐 Recently added", render: renderRecentNotesWidget },
  "most-used": { title: "🔥 Most used", render: renderMostUsedWidget },
  "top-tags": { title: "🏷 Top tags", render: renderTopTagsWidget },
  questions: { title: "💬 Recent questions", render: renderQuestionsWidget },
  "on-this-day": { title: "📅 On this day", render: renderOnThisDayWidget },
  digest: { title: "📰 Weekly digest", render: renderDigestWidget },
  capture: { title: "✏️ Quick capture", render: renderQuickCaptureWidget },
  reminders: { title: "⏰ Reminders", render: renderRemindersWidget },
  focus: { title: "⏱ Focus timer", render: renderFocusTimerWidget },
  heatmap: { title: "📆 Activity heatmap", render: renderHeatmapWidget },
  "tag-cloud": { title: "☁️ Tag cloud", render: renderTagCloudWidget },
  categories: { title: "🗂 Categories", render: renderCategoriesWidget },
  random: { title: "🎲 Rediscover", render: renderRandomNoteWidget },
};

function dashLayout() {
  const saved = (prefsCache && prefsCache.dashboard_layout) || {};
  const order = [...(saved.order || [])];
  for (const name of Object.keys(DASH_WIDGETS)) {
    if (!order.includes(name)) order.push(name); // new widgets append
  }
  return {
    order: order.filter((n) => DASH_WIDGETS[n]),
    hidden: saved.hidden || [],
    // Widgets set to span two columns. Older layouts stored this as
    // {name: "wide"} — fold those in so a saved layout still works.
    wide: saved.wide?.length
      ? saved.wide
      : Object.keys(saved.sizes || {}).filter((n) => saved.sizes[n] === "wide"),
  };
}

async function saveDashLayout(layout) {
  prefsCache = await apiJson("/preferences", {
    method: "PUT",
    body: JSON.stringify({ dashboard_layout: layout }),
  }).catch(() => prefsCache);
}

// --- live clock + dashboard welcome ------------------------------------------------
// One ticker updates every visible .live-clock (reminders tab + dashboard),
// so the current time is always on screen — the reminders tab used to give
// no sense of "now" at all (user-reported).
function tickClocks() {
  const now = new Date();
  const time = now.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  const date = now.toLocaleDateString([], {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
  for (const el of document.querySelectorAll(".live-clock")) {
    const t = el.querySelector(".clock-time");
    const d = el.querySelector(".clock-date");
    if (t) t.textContent = time;
    if (d) d.textContent = date;
  }
}
setInterval(tickClocks, 1000);
tickClocks();

// --- dashboard welcome banner ------------------------------------------------
// A few phrasings per time of day so the greeting feels alive. The choice is
// keyed to the day + time-block, so it changes occasionally rather than
// flickering on every re-render.
const GREETINGS = {
  morning: ["Good morning", "Morning", "Rise and shine", "A fresh start"],
  afternoon: ["Good afternoon", "Afternoon", "Hope today's going well"],
  evening: ["Good evening", "Evening", "Winding down"],
  night: ["Still up", "Working late", "Burning the midnight oil"],
};

function greetingBlock(hour) {
  if (hour < 5) return "night";
  if (hour < 12) return "morning";
  if (hour < 18) return "afternoon";
  if (hour < 23) return "evening";
  return "night";
}

// The local fallback phrase, used until (or instead of) an AI-written one.
function fallbackGreetingPhrase(now = new Date()) {
  const options = GREETINGS[greetingBlock(now.getHours())];
  // Same greeting for a whole block on a given day, then it moves on.
  const daySlot = Math.floor(now.getTime() / 86400000) + now.getHours();
  return options[daySlot % options.length];
}

// The name always comes from preferences — never from the model, so it can't
// be mangled or hallucinated, and editing it takes effect immediately. The
// terminal mark goes on last so the result reads as a proper sentence:
// "Rise and shine" + ", Sam" + "!" → "Rise and shine, Sam!"
function withDisplayName(phrase, punctuation = ".", appendName = true) {
  const name = ((prefsCache && prefsCache.display_name) || "").trim();
  const mark = ".!?".includes(punctuation) ? punctuation : ".";
  // Also sentence-cased here, so an older cached greeting written by the model
  // in lowercase corrects itself on the next render.
  const opener = phrase ? phrase.charAt(0).toUpperCase() + phrase.slice(1) : phrase;
  // Don't append when the server says the greeting already handles the name —
  // either the model wove it in, or this one is deliberately nameless. The
  // text check is a belt-and-braces guard against a stale cache.
  const already =
    !appendName ||
    (name && new RegExp(`\\b${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i").test(opener));
  if (!name || already) return `${opener}${mark}`;
  return `${opener}, ${name}${mark}`;
}

function dashboardGreetingText(now = new Date()) {
  return withDisplayName(fallbackGreetingPhrase(now), ".");
}

// A cached AI greeting, refreshed once per time-block per day so it changes
// occasionally rather than on every render (and doesn't hammer the model).
function greetingCacheSlot(now = new Date()) {
  // Refreshed hourly, so the banner keeps changing through the day instead of
  // repeating the same line for a whole morning. The name is part of the slot
  // too: renaming yourself in Settings invalidates the cached greeting so the
  // AI writes a fresh one addressed to the new name.
  const name = ((prefsCache && prefsCache.display_name) || "").trim();
  return `${now.toDateString()}|${now.getHours()}|${name}`;
}

function cachedGreetingPhrase(now = new Date()) {
  try {
    const cached = JSON.parse(localStorage.getItem("greetingCache") || "null");
    if (cached && cached.slot === greetingCacheSlot(now) && cached.phrase) {
      return {
        phrase: cached.phrase,
        punctuation: cached.punctuation || ".",
        appendName: cached.appendName !== false,
      };
    }
  } catch {
    /* a corrupt cache just means we fetch a fresh one */
  }
  return null;
}

// Ask the AI for this block's greeting. Silent by design: any failure simply
// leaves the handwritten fallback on screen.
async function refreshAiGreeting() {
  const now = new Date();
  if (cachedGreetingPhrase(now)) return; // still fresh for this block
  const block = greetingBlock(now.getHours());
  const body = await apiJson(`/insights/greeting?block=${block}`, { silent: true }).catch(
    () => null
  );
  const phrase = body && body.greeting;
  if (!phrase) return;
  const punctuation = (body && body.punctuation) || ".";
  const appendName = !(body && body.append_name === false);
  localStorage.setItem(
    "greetingCache",
    JSON.stringify({ slot: greetingCacheSlot(now), phrase, punctuation, appendName })
  );
  const el = $("dash-greeting");
  if (el) el.textContent = withDisplayName(phrase, punctuation, appendName);
}

let dashClockTimer = null;

function paintDashClock() {
  const timeEl = $("dash-clock-time");
  const dateEl = $("dash-clock-date");
  if (!timeEl || !dateEl) return;
  const now = new Date();
  timeEl.textContent = now.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
  dateEl.textContent = now.toLocaleDateString([], {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

// A short line about the notebook — note count, plus whatever's most
// worth surfacing right now (due reminders, then a capture streak).
async function renderDashSubmessage() {
  const el = $("dash-submessage");
  if (!el) return;
  const [stats, reminders] = await Promise.all([
    apiJson("/insights/stats").catch(() => null),
    apiJson("/reminders").catch(() => []),
  ]);
  const bits = [];
  if (stats) {
    const n = stats.total_entries;
    bits.push(n === 0 ? "Your notebook is empty — capture a thought to begin" : `You have ${n} note${n === 1 ? "" : "s"}`);
  }
  const due = (reminders || []).filter(
    (r) => !r.done && new Date(r.due_at) <= new Date()
  ).length;
  if (due) bits.push(`${due} reminder${due === 1 ? "" : "s"} due`);
  else {
    const open = (reminders || []).filter((r) => !r.done).length;
    if (open) bits.push(`${open} reminder${open === 1 ? "" : "s"} coming up`);
  }
  if (stats && stats.per_day) {
    // Current capture streak, counting back from today.
    let streak = 0;
    for (let i = stats.per_day.length - 1; i >= 0 && stats.per_day[i] > 0; i--) streak++;
    if (streak > 1) bits.push(`${streak}-day capture streak`);
  }
  el.textContent = bits.join(" · ");
}

function renderDashboardGreeting() {
  const el = $("dash-greeting");
  if (!el) return;
  // Paint instantly from the cache (or the handwritten fallback), then let an
  // AI-written phrase replace it in the background if one arrives.
  const cached = cachedGreetingPhrase();
  el.textContent = cached
    ? withDisplayName(cached.phrase, cached.punctuation, cached.appendName)
    : dashboardGreetingText();
  refreshAiGreeting().catch(() => {});
  paintDashClock();
  // One ticking clock, however many times the dashboard re-renders.
  if (dashClockTimer) clearInterval(dashClockTimer);
  dashClockTimer = setInterval(paintDashClock, 1000);
  renderDashSubmessage().catch(() => {});
}

// --- masonry packing for the dashboard ---------------------------------------
// CSS grid can't size rows to content per-column, so each card is given a row
// span matching its measured height. Short widgets then stack vertically
// inside a row instead of being stretched to match the tallest one.

let dashResizeObserver = null;

function sizeDashWidget(card, rowUnit, gap) {
  // Measure the card's natural height, not its current grid-constrained one.
  const previous = card.style.gridRowEnd;
  card.style.gridRowEnd = "span 1";
  const height = card.getBoundingClientRect().height;
  const span = Math.max(1, Math.ceil((height + gap) / (rowUnit + gap)));
  const next = `span ${span}`;
  if (next !== previous) card.style.gridRowEnd = next;
  else card.style.gridRowEnd = previous;
}

function sizeDashWidgets() {
  const grid = $("dash-grid");
  if (!grid) return;
  const styles = getComputedStyle(grid);
  const rowUnit = Number.parseFloat(styles.getPropertyValue("grid-auto-rows")) || 8;
  const gap = Number.parseFloat(styles.rowGap) || 16;
  for (const card of grid.querySelectorAll(".dash-widget")) {
    sizeDashWidget(card, rowUnit, gap);
  }
  grid.classList.add("spans-ready");
}

// Widget bodies fill in asynchronously, so re-measure whenever one changes
// size rather than only once at render time.
function watchDashWidgets() {
  const grid = $("dash-grid");
  if (!grid || typeof ResizeObserver === "undefined") {
    sizeDashWidgets();
    return;
  }
  dashResizeObserver?.disconnect();
  let queued = false;
  dashResizeObserver = new ResizeObserver(() => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => {
      queued = false;
      sizeDashWidgets();
    });
  });
  for (const card of grid.querySelectorAll(".dash-widget")) {
    dashResizeObserver.observe(card);
  }
  sizeDashWidgets();
}

window.addEventListener("resize", () => {
  if ($("dash-grid")) sizeDashWidgets();
});

// --- at-a-glance strip (page furniture, not a hideable widget) ---------------

async function renderDashStats() {
  const box = $("dash-stats");
  if (!box) return;
  const [stats, reminders] = await Promise.all([
    apiJson("/insights/stats").catch(() => null),
    apiJson("/reminders").catch(() => []),
  ]);

  const now = new Date();
  const perDay = (stats && stats.per_day) || [];
  let streak = 0;
  for (let i = perDay.length - 1; i >= 0 && perDay[i] > 0; i--) streak++;
  const thisWeek = perDay.slice(-7).reduce((sum, n) => sum + n, 0);
  const open = (reminders || []).filter((r) => !r.done);
  const due = open.filter((r) => new Date(r.due_at) <= now).length;

  const tiles = [
    { icon: "📝", value: stats ? stats.total_entries : "–", label: "notes", go: () => switchTab("notes") },
    { icon: "🗓", value: thisWeek, label: "this week", go: () => switchTab("notes") },
    { icon: "🔥", value: streak, label: streak === 1 ? "day streak" : "day streak", go: () => switchTab("dashboard") },
    {
      icon: due ? "⏰" : "✅",
      value: due || open.length,
      label: due ? "due now" : "reminders",
      go: () => switchTab("reminders"),
      alert: Boolean(due),
    },
  ];

  box.replaceChildren();
  for (const tile of tiles) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "stat-tile" + (tile.alert ? " stat-alert" : "");
    const icon = document.createElement("span");
    icon.className = "stat-icon";
    icon.textContent = tile.icon;
    icon.setAttribute("aria-hidden", "true");
    const value = document.createElement("span");
    value.className = "stat-value";
    value.textContent = tile.value;
    const label = document.createElement("span");
    label.className = "stat-label";
    label.textContent = tile.label;
    button.append(icon, value, label);
    button.addEventListener("click", tile.go);
    box.appendChild(button);
  }
}

// --- dashboard quick links ---------------------------------------------------

const QUICK_LINKS = [
  { icon: "✏️", label: "New note", run: () => { switchTab("notes"); $("entry-content").focus(); } },
  { icon: "💬", label: "Ask AI", run: () => { switchTab("chat"); $("chat-input").focus(); } },
  { icon: "🕸", label: "Graph", run: () => switchTab("graph") },
  { icon: "⏰", label: "Reminders", run: () => switchTab("reminders") },
  { icon: "🎨", label: "Sketch", run: () => openSketch() },
  { icon: "🔍", label: "Search notes", run: () => { switchTab("notes"); $("note-search").focus(); } },
  { icon: "🧰", label: "Tools & features", run: () => openFeatures(), primary: true },
];

function renderQuickLinks() {
  const box = $("dash-quicklinks");
  if (!box) return;
  box.replaceChildren();
  for (const link of QUICK_LINKS) {
    const button = document.createElement("button");
    button.className = "quick-link" + (link.primary ? " quick-link-primary" : "");
    button.type = "button";
    const icon = document.createElement("span");
    icon.className = "quick-link-icon";
    icon.textContent = link.icon;
    icon.setAttribute("aria-hidden", "true");
    const label = document.createElement("span");
    label.textContent = link.label;
    button.append(icon, label);
    button.addEventListener("click", link.run);
    box.appendChild(button);
  }
}

// --- the "everything this app does" browser ----------------------------------
// Grouped, searchable, and every entry either jumps you there or explains
// itself — the fastest way to discover features you didn't know existed.
function featureCatalog() {
  return [
    { group: "Capture & notes", items: [
      { name: "Capture a thought", desc: "Save anything; the AI files it into a category and suggests tags.", run: () => { switchTab("notes"); $("entry-content").focus(); } },
      { name: "Templates", desc: "Start a note from a prefilled shape (journal, recipe, meeting…).", run: () => switchTab("notes") },
      { name: "Improve writing", desc: "Proofread, rewrite, or condense a note with AI before saving.", run: () => switchTab("notes") },
      { name: "Sketch pad", desc: "Draw something and save it as a note with a caption.", run: () => openSketch() },
      { name: "Dictation", desc: "Speak a note; transcribed locally with Whisper.", run: () => switchTab("notes") },
      { name: "Attachments", desc: "Attach files and images to any note.", run: () => switchTab("notes") },
      { name: "Threads", desc: "Continue a thought to build a train of related notes.", run: () => switchTab("notes") },
      { name: "Pins & tags", desc: "Pin important notes and organise with tags.", run: () => switchTab("notes") },
      { name: "Recycle bin", desc: "Deleted notes are recoverable until the bin is cleared.", run: () => switchTab("notes") },
    ]},
    { group: "Ask & chat", items: [
      { name: "Ask your notebook", desc: "Questions answered strictly from your own notes.", run: () => { switchTab("notes"); $("question").focus(); } },
      { name: "Chat", desc: "A full conversation with your notebook, saved and resumable.", run: () => { switchTab("chat"); $("chat-input").focus(); } },
      { name: "Personas", desc: "Change the assistant's voice — Librarian, Coach, Analyst, or your own.", run: () => openSettingsModal("personas") },
      { name: "Skills", desc: "One-click requests like “Summarise my week”; can act on your notes.", run: () => openSettingsModal("skills") },
      { name: "AI can make changes", desc: "Let the assistant create, tag, link and organise notes for you.", run: () => switchTab("chat") },
      { name: "Web search", desc: "Optional, opt-in: the one feature that goes online.", run: () => switchTab("chat") },
      { name: "Export chat", desc: "Download a conversation as Markdown.", run: () => switchTab("chat") },
    ]},
    { group: "Map & discovery", items: [
      { name: "Graph view", desc: "Your notes as a network of links, threads and similarity.", run: () => switchTab("graph") },
      { name: "Edit on the map", desc: "Click any node to edit its content and tags in place.", run: () => switchTab("graph") },
      { name: "Physics controls", desc: "Gravity and Spread sliders reshape the layout.", run: () => switchTab("graph") },
      { name: "Suggested links", desc: "The AI proposes connections between related notes.", run: () => switchTab("graph") },
      { name: "On this day", desc: "Notes you captured on this date in past months resurface.", run: () => switchTab("dashboard") },
      { name: "Related notes", desc: "See notes that mean something similar to the one you're reading.", run: () => switchTab("notes") },
    ]},
    { group: "Plan & focus", items: [
      { name: "Reminders", desc: "Due dates with priority, repeats, snooze and notifications.", run: () => switchTab("reminders") },
      { name: "Magic add", desc: "Type “call mum tomorrow evening” and the AI schedules it.", run: () => { switchTab("reminders"); $("reminder-magic").focus(); } },
      { name: "Focus timer", desc: "Pomodoro-style timer with presets or your own minutes.", run: () => switchTab("dashboard") },
      { name: "Weekly digest", desc: "An AI recap of everything you saved this week.", run: () => switchTab("dashboard") },
      { name: "Activity heatmap", desc: "A year of capture activity at a glance.", run: () => switchTab("dashboard") },
      { name: "Streaks", desc: "How many days in a row you've captured something.", run: () => switchTab("dashboard") },
    ]},
    { group: "Make it yours", items: [
      { name: "Theme", desc: "Light, dark, or follow your system.", run: () => openSettingsModal("appearance") },
      { name: "Accent colour", desc: "Presets or any custom colour you like.", run: () => openSettingsModal("appearance") },
      { name: "Typography & density", desc: "Font, text size, and how roomy the layout feels.", run: () => openSettingsModal("appearance") },
      { name: "Corner rounding & glass", desc: "Tune the shape and blur of every surface.", run: () => openSettingsModal("appearance") },
      { name: "Animated background", desc: "Aurora, constellations, blobs or particles behind the app.", run: () => openSettingsModal("appearance") },
      { name: "Accessibility", desc: "High-contrast mode and reduce-motion.", run: () => openSettingsModal("appearance") },
      { name: "Custom CSS", desc: "For tinkerers: your own style overrides.", run: () => openSettingsModal("appearance") },
      { name: "Dashboard layout", desc: "Show, hide, reorder and widen widgets.", run: () => { switchTab("dashboard"); $("dash-edit").click(); } },
    ]},
    { group: "Data & control", items: [
      { name: "Export", desc: "Download everything as JSON, Markdown or CSV.", run: () => openSettingsModal("data") },
      { name: "Import markdown", desc: "Bring in notes from an Obsidian-style vault.", run: () => openSettingsModal("data") },
      { name: "Backups", desc: "Snapshot your notebook and restore it later.", run: () => openSettingsModal("data") },
      { name: "Models", desc: "Choose the chat, utility and embedding models.", run: () => openSettingsModal("models") },
      { name: "AI tool permissions", desc: "Decide exactly what the assistant is allowed to do.", run: () => openSettingsModal("tools") },
      { name: "Lock", desc: "Password-protect the app on shared devices.", run: () => lockNow() },
      { name: "Command palette", desc: "Ctrl/⌘-K to jump anywhere or search your notes.", run: () => { closeFeatures(); openPalette(); } },
      { name: "Keyboard shortcuts", desc: "Press ? any time for the full list.", run: () => { closeFeatures(); openShortcuts(); } },
      { name: "Welcome tour", desc: "Replay the introduction to MemoryMap.", run: () => { closeFeatures(); openOnboarding(); } },
    ]},
  ];
}

let featureAiTools = null; // fetched once per session

async function openFeatures() {
  overlayReturnFocus = document.activeElement;
  $("features-overlay").classList.remove("hidden");
  $("features-search").value = "";
  renderFeatures("");
  $("features-search").focus();
  if (featureAiTools === null) {
    featureAiTools = await apiJson("/chat/tools").catch(() => []);
    if (!$("features-overlay").classList.contains("hidden")) {
      renderFeatures($("features-search").value);
    }
  }
}

function closeFeatures() {
  $("features-overlay").classList.add("hidden");
  overlayReturnFocus?.focus?.();
  overlayReturnFocus = null;
}

function renderFeatures(query) {
  const list = $("features-list");
  list.replaceChildren();
  const q = (query || "").trim().toLowerCase();
  const groups = featureCatalog();
  // The AI's own tools, straight from the backend registry.
  if (featureAiTools && featureAiTools.length) {
    groups.push({
      group: "What the AI can do for you",
      items: featureAiTools.map((tool) => ({
        name: tool.name.replace(/_/g, " "),
        desc: tool.description + (tool.destructive ? " (asks you to confirm first)" : ""),
        run: () => openSettingsModal("tools"),
      })),
    });
  }

  let shown = 0;
  for (const group of groups) {
    const matches = group.items.filter(
      (item) =>
        !q ||
        item.name.toLowerCase().includes(q) ||
        item.desc.toLowerCase().includes(q) ||
        group.group.toLowerCase().includes(q)
    );
    if (!matches.length) continue;
    shown += matches.length;

    const heading = document.createElement("h3");
    heading.className = "features-group";
    heading.textContent = group.group;
    list.appendChild(heading);

    for (const item of matches) {
      const row = document.createElement("button");
      row.type = "button";
      row.className = "feature-row";
      const name = document.createElement("span");
      name.className = "feature-name";
      name.textContent = item.name;
      const desc = document.createElement("span");
      desc.className = "feature-desc muted";
      desc.textContent = item.desc;
      row.append(name, desc);
      row.addEventListener("click", () => {
        closeFeatures();
        item.run();
      });
      list.appendChild(row);
    }
  }

  $("features-count").textContent = q
    ? `${shown} match${shown === 1 ? "" : "es"}`
    : `${shown} things MemoryMap can do`;
  if (!shown) {
    const none = document.createElement("p");
    none.className = "muted";
    none.textContent = "Nothing matches that — try another word.";
    list.appendChild(none);
  }
}

async function renderDashboard() {
  // The saved layout lives in preferences — after a page reload this can
  // run before startApp has fetched them, so fetch here if needed.
  if (!prefsCache) {
    prefsCache = await apiJson("/preferences").catch(() => null);
  }
  renderDashboardGreeting();
  renderDashStats().catch(() => {});
  renderQuickLinks();
  const grid = $("dash-grid");
  grid.replaceChildren();
  $("dash-hint").classList.toggle("hidden", !dashEditMode); // hint only in edit mode
  const layout = dashLayout();

  for (const name of layout.order) {
    const hidden = layout.hidden.includes(name);
    if (hidden && !dashEditMode) continue;

    const widget = DASH_WIDGETS[name];
    const isWide = layout.wide.includes(name);
    const card = document.createElement("section");
    card.className =
      "card dash-widget" + (hidden ? " dash-hidden" : "") + (isWide ? " wide" : "");
    card.dataset.widget = name;

    const header = document.createElement("div");
    header.className = "row space-between";
    const title = document.createElement("h2");
    title.textContent = widget.title;
    header.appendChild(title);
    if (dashEditMode) {
      const controls = document.createElement("span");
      controls.className = "entry-actions";
      // Wide ⇄ Normal: a widget can span two columns to become a bigger
      // "section" (user request). Hidden widgets don't need a size toggle.
      if (!hidden) {
        controls.appendChild(
          smallButton(
            isWide ? "▤ Normal" : "▭ Wide",
            isWide ? "Shrink back to one column" : "Make this a full-width section",
            async () => {
              const next = dashLayout();
              next.sizes = { ...next.sizes };
              if (isWide) delete next.sizes[name];
              else next.sizes[name] = "wide";
              await saveDashLayout(next);
              renderDashboard();
            }
          )
        );
      }
      controls.appendChild(
        smallButton(hidden ? "＋ Add" : "✕ Remove", hidden ? "Add this widget to the dashboard" : "Remove this widget from the dashboard", async () => {
          const next = dashLayout();
          next.hidden = hidden
            ? next.hidden.filter((n) => n !== name)
            : [...next.hidden, name];
          await saveDashLayout(next);
          renderDashboard();
        })
      );
      controls.appendChild(
        smallButton(
          isWide ? "Narrow" : "Wide",
          isWide ? "Show in one column" : "Span two columns",
          async () => {
            const next = dashLayout();
            next.wide = isWide
              ? next.wide.filter((n) => n !== name)
              : [...next.wide, name];
            await saveDashLayout(next);
            renderDashboard();
          }
        )
      );
      const handle = document.createElement("span");
      handle.className = "drag-handle";
      handle.textContent = "≡ drag";
      controls.appendChild(handle);
      header.appendChild(controls);
    }
    card.appendChild(header);

    const body = document.createElement("div");
    body.className = "dash-body";
    card.appendChild(body);
    if (!hidden) {
      // Promise.resolve() so a synchronous renderer can't break the whole
      // dashboard loop, and a throwing one only spoils its own card.
      Promise.resolve()
        .then(() => widget.render(body))
        .catch(() => {
          body.textContent = "Couldn't load this widget.";
        });
    }

    // Drag to reorder (edit mode only).
    if (dashEditMode) {
      card.draggable = true;
      card.addEventListener("dragstart", () => {
        dragWidget = name;
        card.classList.add("dragging");
      });
      card.addEventListener("dragend", async () => {
        card.classList.remove("dragging");
        dragWidget = null;
        // Persist whatever order the DOM ended up in.
        const order = [...grid.querySelectorAll(".dash-widget")].map(
          (el) => el.dataset.widget
        );
        await saveDashLayout({ ...dashLayout(), order });
      });
      card.addEventListener("dragover", (e) => {
        e.preventDefault();
        if (!dragWidget || dragWidget === name) return;
        const dragged = grid.querySelector(`[data-widget="${dragWidget}"]`);
        if (!dragged) return;
        const after = [...grid.children].indexOf(card) > [...grid.children].indexOf(dragged);
        grid.insertBefore(dragged, after ? card.nextSibling : card);
      });
    }
    grid.appendChild(card);
  }
  // Pack them once the cards exist; the observer keeps it right as the
  // async widget bodies fill in.
  grid.classList.remove("spans-ready");
  watchDashWidgets();
}

// --- Wave J: generative art (p5.js, vendored locally) -------------------------------
// A living "constellation" of the notebook: each category becomes a
// cluster of drifting stars — more notes, more stars — connected by
// faint lines in the category's own colour. It's seeded from the real
// note counts, so the same notebook always grows the same sky (until
// you hit Regenerate). Purely decorative; nothing depends on it.

let artInstance = null; // the one live p5 instance, if any
let artNonce = 0; // bumped by "Regenerate" for a fresh arrangement

// Stable 0–359 hue from a category name, so a category keeps its colour.
function hueFor(name) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) % 360;
  }
  return hash;
}

// A deterministic seed from the category names + counts: the sky is
// stable for a given notebook, and shifts only as the notebook changes.
function artSeed(categories) {
  let seed = 1;
  for (const c of categories) {
    seed = (seed * 31 + hueFor(c.name) + c.count) % 1_000_000;
  }
  return seed;
}

function stopArt() {
  if (artInstance) {
    artInstance.remove(); // tears down the canvas + draw loop
    artInstance = null;
  }
}

function buildArtParticles(p, categories, total, width, height) {
  const groups = categories.length ? categories : [{ name: "Notes", count: 1 }];
  const particles = [];
  for (const group of groups) {
    const hue = hueFor(group.name);
    // 3 base stars, plus more for a bigger share of the notebook (capped).
    const count = Math.max(3, Math.min(16, Math.round((group.count / total) * 70) + 3));
    const cx = p.random(width * 0.15, width * 0.85);
    const cy = p.random(height * 0.2, height * 0.8);
    for (let i = 0; i < count; i++) {
      particles.push({
        baseX: cx + p.random(-46, 46),
        baseY: cy + p.random(-34, 34),
        x: 0,
        y: 0,
        phase: p.random(p.TWO_PI),
        amp: p.random(2, 9),
        size: p.random(2, 5),
        hue,
      });
    }
  }
  return particles;
}

async function renderArtWidget(body) {
  const holder = document.createElement("div");
  holder.className = "art-holder";
  body.appendChild(holder);

  // Say what the picture actually means — until now it was pretty but
  // unlabelled (user asked what the nodes represent).
  const caption = document.createElement("p");
  caption.className = "muted art-caption";
  caption.textContent =
    "Each cluster of stars is one category; the more notes it holds, the more " +
    "stars it gets. Lines link stars that drift close together.";
  body.appendChild(caption);

  const controls = document.createElement("div");
  controls.className = "row art-controls";
  controls.appendChild(
    smallButton("🎲 Regenerate", "A fresh arrangement of the same notes", () => {
      artNonce += 1;
      startArt(holder);
    })
  );
  controls.appendChild(
    smallButton("💾 Save PNG", "Save this artwork as an image", () => {
      if (artInstance) artInstance.saveCanvas("memorymap-constellation", "png");
    })
  );
  body.appendChild(controls);

  // A colour key so each cluster is identifiable, matching the hue the
  // canvas paints each category with.
  const legend = document.createElement("div");
  legend.className = "art-legend";
  body.appendChild(legend);
  apiJson("/insights/stats")
    .then((stats) => {
      const cats = (stats.categories || []).slice(0, 8);
      legend.replaceChildren();
      for (const cat of cats) {
        const item = document.createElement("span");
        item.className = "art-legend-item";
        const dot = document.createElement("span");
        dot.className = "art-legend-dot";
        dot.style.background = `hsl(${hueFor(cat.name)}, 70%, 55%)`;
        item.append(dot, document.createTextNode(`${cat.name} · ${cat.count}`));
        legend.appendChild(item);
      }
    })
    .catch(() => {});

  return startArt(holder);
}

async function startArt(holder) {
  stopArt();
  if (typeof p5 === "undefined") {
    holder.textContent = "The art library didn't load.";
    return;
  }
  const stats = await apiJson("/insights/stats").catch(() => ({
    categories: [],
    total_entries: 0,
  }));
  const categories = (stats.categories || []).slice(0, 8);
  const total = Math.max(1, stats.total_entries || 0);
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const dark =
    document.documentElement.dataset.theme === "dark" ||
    (!document.documentElement.dataset.theme &&
      window.matchMedia("(prefers-color-scheme: dark)").matches);

  const sketch = (p) => {
    let particles = [];
    let width = 0;
    const height = 220;

    const scene = (t) => {
      // A soft vertical wash instead of a flat fill — more depth (Wave N).
      p.noStroke();
      for (let y = 0; y < height; y += 4) {
        const shade = dark ? 14 + (y / height) * 10 : 250 - (y / height) * 10;
        p.fill(230, 30, shade, 1);
        p.rect(0, y, width, 4);
      }
      for (const dot of particles) {
        dot.x = dot.baseX + Math.cos(t + dot.phase) * dot.amp;
        dot.y = dot.baseY + Math.sin(t * 1.3 + dot.phase) * dot.amp;
      }
      // Faint connecting lines between nearby stars (O(n²), but n is
      // capped low enough that it stays cheap at 60fps).
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const a = particles[i];
          const b = particles[j];
          const d = p.dist(a.x, a.y, b.x, b.y);
          if (d < 70) {
            p.stroke(a.hue, 65, dark ? 72 : 55, p.map(d, 0, 70, 0.45, 0));
            p.strokeWeight(1);
            p.line(a.x, a.y, b.x, b.y);
          }
        }
      }
      // The stars themselves: a soft glow halo + a bright core, twinkling.
      p.noStroke();
      for (const dot of particles) {
        const twinkle = 0.6 + 0.4 * Math.sin(t * 2 + dot.phase);
        p.fill(dot.hue, 75, dark ? 65 : 55, 0.14 * twinkle);
        p.circle(dot.x, dot.y, dot.size * 4); // glow
        p.fill(dot.hue, 80, dark ? 78 : 48, twinkle);
        p.circle(dot.x, dot.y, dot.size); // core
      }
    };

    p.setup = () => {
      width = holder.clientWidth || 300;
      p.createCanvas(width, height);
      p.colorMode(p.HSL, 360, 100, 100, 1);
      p.randomSeed(artSeed(categories) + artNonce * 997);
      particles = buildArtParticles(p, categories, total, width, height);
      if (reduceMotion) {
        scene(0); // one still frame — no animation for reduced-motion users
        p.noLoop();
      }
    };
    p.draw = () => scene(p.frameCount * 0.005);
  };

  artInstance = new p5(sketch, holder);
}

// Capture streak (Wave K): consecutive days up to today with at least
// one note, read from the same per-day series the stats strip uses.
async function renderStreakWidget(body) {
  const stats = await apiJson("/insights/stats");
  const perDay = stats.per_day || []; // oldest → newest, last = today

  let current = 0;
  for (let i = perDay.length - 1; i >= 0; i--) {
    if (perDay[i] > 0) current += 1;
    else break;
  }
  let longest = 0;
  let run = 0;
  for (const count of perDay) {
    run = count > 0 ? run + 1 : 0;
    longest = Math.max(longest, run);
  }

  const big = document.createElement("p");
  big.className = "dash-big";
  big.textContent = current > 0 ? `🔥 ${current}-day streak` : "No streak yet";
  body.appendChild(big);

  const sub = document.createElement("p");
  sub.className = "muted";
  if (current > 0) {
    sub.textContent =
      `You've captured ${current} day${current === 1 ? "" : "s"} running` +
      (longest > current ? ` · best in the last fortnight: ${longest}` : "");
  } else {
    sub.textContent = "Save a note today to start one.";
  }
  body.appendChild(sub);
}

async function renderStatsWidget(body) {
  const stats = await apiJson("/insights/stats");
  const total = document.createElement("p");
  total.className = "dash-big";
  total.textContent = `${stats.total_entries} note${stats.total_entries === 1 ? "" : "s"}`;
  body.appendChild(total);

  // Last-14-days activity strip (theme colours, height = volume).
  const strip = document.createElement("div");
  strip.className = "activity-strip";
  strip.title = "Notes captured per day, last 14 days";
  const peak = Math.max(1, ...stats.per_day);
  for (const count of stats.per_day) {
    const bar = document.createElement("span");
    bar.style.height = `${Math.max(8, (count / peak) * 34)}px`;
    bar.classList.toggle("empty", count === 0);
    bar.title = `${count} note${count === 1 ? "" : "s"}`;
    strip.appendChild(bar);
  }
  body.appendChild(strip);

  const cats = document.createElement("div");
  cats.className = "entry-meta";
  for (const category of stats.categories.slice(0, 5)) {
    cats.appendChild(chip(`${category.name} · ${category.count}`));
  }
  body.appendChild(cats);
}

// A note's text as it should read in a preview: the [[link]] syntax is
// scaffolding, not content, so previews show the words without the brackets.
// Full note bodies get real clickable chips instead (renderNoteText).
function notePreviewText(content) {
  return (content || "").replace(/\[\[([^[\]]{1,120})\]\]/g, "$1");
}

function miniEntryList(body, entries, emptyText) {
  if (!entries.length) {
    const p = document.createElement("p");
    p.className = "muted";
    p.textContent = emptyText;
    body.appendChild(p);
    return;
  }
  const ul = document.createElement("ul");
  ul.className = "dash-list";
  for (const entry of entries) {
    const li = document.createElement("li");
    const preview = notePreviewText(entry.content);
    li.textContent = preview.length > 70 ? preview.slice(0, 69) + "…" : preview;
    li.title = "Open this note";
    li.addEventListener("click", () => flashEntry(entry.id));
    ul.appendChild(li);
  }
  body.appendChild(ul);
}

async function renderPinnedWidget(body) {
  const entries = (await apiJson("/entries")).filter((e) => e.pinned);
  miniEntryList(body, entries.slice(0, 5), "Pin a note (📌) and it shows up here.");
}

async function renderMostUsedWidget(body) {
  const entries = await apiJson("/entries/most-accessed");
  miniEntryList(body, entries, "Ask questions and your most-used notes appear here.");
}

async function renderRecentNotesWidget(body) {
  const entries = await apiJson("/entries");
  const newest = [...entries].sort(
    (a, b) => new Date(b.created_at) - new Date(a.created_at)
  );
  miniEntryList(body, newest.slice(0, 6), "Your newest notes will appear here.");
}

async function renderTopTagsWidget(body) {
  const entries = await apiJson("/entries");
  const counts = new Map();
  for (const entry of entries) {
    for (const tag of entry.tags || []) counts.set(tag, (counts.get(tag) || 0) + 1);
  }
  if (!counts.size) {
    const p = document.createElement("p");
    p.className = "muted";
    p.textContent = "Tag some notes and your top tags show up here.";
    body.appendChild(p);
    return;
  }
  const top = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12);
  const cloud = document.createElement("div");
  cloud.className = "entry-meta";
  for (const [tag, count] of top) {
    const tagChip = chip(`${tag} · ${count}`, "tag", () => {
      $("note-search").value = tag;
      noteSearch = tag;
      switchTab("notes");
      renderEntries();
    });
    tagChip.title = `Show notes tagged “${tag}”`;
    cloud.appendChild(tagChip);
  }
  body.appendChild(cloud);
}

async function renderQuestionsWidget(body) {
  const questions = await apiJson("/chat/recent");
  if (!questions.length) {
    body.textContent = "Your recent questions will appear here.";
    body.className += " muted";
    return;
  }
  const box = document.createElement("div");
  box.className = "recent";
  for (const question of questions) {
    const chipEl = chip(question.length > 40 ? question.slice(0, 39) + "…" : question, "", () => {
      switchTab("chat");
      sendChatMessage(question);
    });
    chipEl.title = question;
    box.appendChild(chipEl);
  }
  body.appendChild(box);
}

async function renderOnThisDayWidget(body) {
  const matches = await apiJson("/insights/on-this-day");
  miniEntryList(
    body,
    matches,
    "Notes you captured on this date in past months will resurface here."
  );
}

// Weekly digest caching (Wave J follow-up). The AI digest is expensive,
// so once it's generated it STAYS until you regenerate, and it resets
// itself each day. Generation is a module-level promise, so switching
// away from the dashboard never cancels it — whenever it finishes, the
// result is cached and shown next time the widget is on screen.
const DIGEST_KEY = "digestCache";
let digestPromise = null; // the in-flight generation, shared across renders

function todayStamp() {
  return new Date().toISOString().slice(0, 10);
}

function loadDigestCache() {
  try {
    const cached = JSON.parse(localStorage.getItem(DIGEST_KEY) || "null");
    if (cached && cached.date === todayStamp()) return cached.text; // fresh today
  } catch {
    /* corrupt cache — ignore and regenerate */
  }
  return null;
}

// Kicks off (or reuses) one generation. Caches the result for today,
// unless the server says it isn't cacheable (e.g. Ollama was offline).
// Streams the digest, calling onDelta with each chunk so the widget can show
// words as they arrive rather than a spinner. Resolves with the full text.
function generateDigest(onDelta) {
  if (!digestPromise) {
    digestPromise = streamDigest(onDelta)
      .then((result) => {
        if (result.cacheable !== false) {
          localStorage.setItem(
            DIGEST_KEY,
            JSON.stringify({ text: result.text, date: todayStamp() })
          );
        }
        return result.text;
      })
      .finally(() => {
        digestPromise = null;
      });
  }
  return digestPromise;
}

async function streamDigest(onDelta) {
  const response = await api("/insights/digest/stream", { method: "POST" });
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let text = "";
  let cacheable = true;
  // NDJSON: one JSON object per line, same shape as the chat stream.
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      if (!line.trim()) continue;
      let event;
      try {
        event = JSON.parse(line);
      } catch {
        continue; // a partial line — the next chunk completes it
      }
      if (event.type === "answer") {
        text += event.delta;
        if (onDelta) onDelta(text);
      } else if (event.type === "done") {
        cacheable = event.cacheable !== false;
      }
    }
  }
  return { text, cacheable };
}

async function renderDigestWidget(body) {
  const showDigest = (text) => {
    const out = document.createElement("div");
    renderMarkdown(out, text);
    const controls = document.createElement("div");
    controls.className = "row";
    controls.appendChild(
      smallButton("🔄 Regenerate", "Rebuild this week's digest now", () => {
        localStorage.removeItem(DIGEST_KEY);
        runGeneration();
      })
    );
    body.replaceChildren(out, controls);
  };

  const runGeneration = () => {
    const thinking = document.createElement("p");
    thinking.className = "muted";
    // One indicator, one sentence, in both motion modes.
    thinking.append(typingLine("Thinking about your week…"));
    body.replaceChildren(thinking);
    // Live-render the text as it streams in; the dots stay until the first
    // token arrives, then the words take over.
    const live = document.createElement("div");
    let started = false;
    generateDigest((soFar) => {
      if (!body.isConnected) return;
      if (!started) {
        started = true;
        body.replaceChildren(live);
      }
      renderMarkdown(live, soFar);
      body.scrollTop = body.scrollHeight;
    })
      .then((text) => {
        // The widget may have been left/re-rendered while we waited —
        // only paint if this exact body is still on screen.
        if (body.isConnected) showDigest(text);
      })
      .catch((error) => {
        if (!body.isConnected) return;
        const retry = smallButton(
          "Generate this week's digest",
          "",
          runGeneration,
          false
        );
        body.replaceChildren(retry);
        toast(error.message, true);
      });
  };

  const cached = loadDigestCache();
  if (cached !== null) {
    showDigest(cached); // today's digest, kept until you regenerate
  } else if (digestPromise) {
    runGeneration(); // one is already running (from before a tab switch)
  } else {
    const generate = smallButton("Generate this week's digest", "", runGeneration, false);
    // Built dynamically, so it can't live in AI_ONLY_CONTROLS — mark it here
    // instead. A dashboard button that only fails once you press it is exactly
    // the thing that makes the app feel broken when the AI simply isn't on.
    if (modelStatus && modelStatus.ollama_running === false) {
      generate.disabled = true;
      generate.classList.add("ai-unavailable");
      generate.title = "The weekly digest is written by the local AI — start Ollama to generate one.";
    }
    body.appendChild(generate);
  }
}

async function renderQuickCaptureWidget(body) {
  const textarea = document.createElement("textarea");
  textarea.rows = 2;
  // Don't promise AI filing when there's no AI to do it; the note still saves.
  textarea.placeholder =
    modelStatus && modelStatus.ollama_running === false
      ? "Type a thought and press Save."
      : "Type a thought and press Save — the AI files it.";
  const row = document.createElement("div");
  row.className = "row";
  const status = document.createElement("span");
  status.className = "status";
  row.appendChild(
    smallButton("Save", "", async () => {
      const content = textarea.value.trim();
      if (!content) return;
      status.textContent = "Filing…";
      try {
        const saved = await apiJson("/entries", {
          method: "POST",
          body: JSON.stringify({ content, tags: [] }),
        });
        status.textContent = `Filed under “${saved.category}”.`;
        textarea.value = "";
        loadEntries();
      } catch (error) {
        status.textContent = error.message;
      }
    }, false)
  );
  row.appendChild(status);
  body.append(textarea, row);
}

async function renderRemindersWidget(body) {
  const reminders = (await apiJson("/reminders")).filter((r) => !r.done).slice(0, 4);
  if (!reminders.length) {
    body.textContent = "No open reminders — add one in the Reminders tab.";
    body.className += " muted";
    return;
  }
  const ul = document.createElement("ul");
  ul.className = "dash-list";
  for (const reminder of reminders) {
    const li = document.createElement("li");
    const due = new Date(reminder.due_at);
    li.textContent = `${reminder.text} — ${due.toLocaleString()}`;
    if (due < new Date()) li.classList.add("overdue");
    li.addEventListener("click", () => switchTab("reminders"));
    ul.appendChild(li);
  }
  body.appendChild(ul);
}

// --- activity heatmap (a year of capture activity, GitHub-style) ------------

async function renderHeatmapWidget(body) {
  const data = await apiJson("/insights/heatmap").catch(() => null);
  if (!data) {
    body.textContent = "Couldn't load your activity.";
    body.className += " muted";
    return;
  }
  if (!data.total) {
    body.textContent = "Save some notes and your activity shows up here.";
    body.className += " muted";
    return;
  }

  const grid = document.createElement("div");
  grid.className = "heatmap";
  const start = new Date(`${data.start}T00:00:00`);
  // Pad so each column is a whole week starting on Sunday.
  const lead = start.getDay();
  for (let i = 0; i < lead; i++) {
    const blank = document.createElement("span");
    blank.className = "heat-cell heat-blank";
    grid.appendChild(blank);
  }
  data.counts.forEach((count, index) => {
    const cell = document.createElement("span");
    // Five buckets, scaled against the busiest day so quiet notebooks
    // still show contrast.
    const level = count === 0 ? 0 : Math.min(4, Math.ceil((count / data.busiest) * 4));
    cell.className = `heat-cell heat-${level}`;
    const day = new Date(start);
    day.setDate(day.getDate() + index);
    cell.title = `${day.toLocaleDateString()} — ${count} note${count === 1 ? "" : "s"}`;
    grid.appendChild(cell);
  });
  body.appendChild(grid);
  // The grid runs oldest → newest, so the interesting end is the right one.
  // Start scrolled there instead of making the user drag across a year of
  // empty squares to find today.
  requestAnimationFrame(() => {
    grid.scrollLeft = grid.scrollWidth;
  });

  const legend = document.createElement("div");
  legend.className = "heat-legend muted";
  const less = document.createElement("span");
  less.textContent = "Less";
  legend.appendChild(less);
  for (let level = 0; level <= 4; level++) {
    const swatch = document.createElement("span");
    swatch.className = `heat-cell heat-${level}`;
    legend.appendChild(swatch);
  }
  const more = document.createElement("span");
  more.textContent = "More";
  legend.appendChild(more);
  body.appendChild(legend);

  const summary = document.createElement("p");
  summary.className = "muted";
  summary.textContent = `${data.total} notes in the last year · busiest day ${data.busiest}`;
  body.appendChild(summary);
}

// --- category breakdown ------------------------------------------------------

async function renderCategoriesWidget(body) {
  const stats = await apiJson("/insights/stats").catch(() => null);
  const categories = (stats && stats.categories) || [];
  if (!categories.length) {
    body.textContent = "Save a few notes and your categories appear here.";
    body.className += " muted";
    return;
  }
  const max = categories[0].count || 1;
  const list = document.createElement("div");
  list.className = "cat-bars";
  for (const { name, count } of categories.slice(0, 8)) {
    const row = document.createElement("button");
    row.type = "button";
    row.className = "cat-row";
    row.title = `Show the ${name} notes`;
    const label = document.createElement("span");
    label.className = "cat-name";
    label.textContent = name;
    const track = document.createElement("span");
    track.className = "cat-track";
    const fill = document.createElement("span");
    fill.className = "cat-fill";
    fill.style.width = `${Math.max(6, (count / max) * 100)}%`;
    track.appendChild(fill);
    const num = document.createElement("span");
    num.className = "cat-count";
    num.textContent = count;
    row.append(label, track, num);
    row.addEventListener("click", () => {
      activeCategory = name;
      switchTab("notes");
      renderEntries();
      renderSidebar();
    });
    list.appendChild(row);
  }
  body.appendChild(list);
}

// --- rediscover a random note ------------------------------------------------

async function renderRandomNoteWidget(body) {
  const entries = allEntries.length
    ? allEntries
    : await apiJson("/entries").catch(() => []);
  if (!entries.length) {
    body.textContent = "Save some notes and one will resurface here.";
    body.className += " muted";
    return;
  }

  const paint = () => {
    body.replaceChildren();
    const note = entries[Math.floor(Math.random() * entries.length)];
    const text = document.createElement("p");
    text.className = "random-note";
    text.textContent =
      note.content.length > 240 ? note.content.slice(0, 239) + "…" : note.content;
    body.appendChild(text);

    const meta = document.createElement("div");
    meta.className = "entry-meta";
    meta.appendChild(chip(note.category || "Uncategorised", "tag"));
    const when = document.createElement("span");
    when.className = "entry-date";
    when.textContent = new Date(note.created_at).toLocaleDateString();
    meta.appendChild(when);
    body.appendChild(meta);

    const row = document.createElement("div");
    row.className = "row";
    row.appendChild(smallButton("🎲 Another", "Show a different note", paint));
    row.appendChild(
      smallButton("📝 Open", "Open this note in the Notes tab", () => flashEntry(note.id))
    );
    body.appendChild(row);
  };
  paint();
}

// --- weighted tag cloud ------------------------------------------------------

async function renderTagCloudWidget(body) {
  const tags = await apiJson("/insights/tag-cloud").catch(() => []);
  if (!tags.length) {
    body.textContent = "Tag some notes and your cloud grows here.";
    body.className += " muted";
    return;
  }
  const max = tags[0].count || 1;
  const cloud = document.createElement("div");
  cloud.className = "tag-cloud";
  for (const { tag, count } of tags) {
    // Font size scales with frequency (0.8rem – 1.7rem).
    const weight = count / max;
    const item = chip(tag, "tag", () => {
      $("note-search").value = tag;
      noteSearch = tag;
      switchTab("notes");
      renderEntries();
    });
    item.style.fontSize = `${(0.8 + weight * 0.9).toFixed(2)}rem`;
    item.style.opacity = String(0.55 + weight * 0.45);
    item.title = `${count} note${count === 1 ? "" : "s"} tagged “${tag}”`;
    cloud.appendChild(item);
  }
  body.appendChild(cloud);
}

// --- focus timer (dashboard widget) -----------------------------------------
// State lives at module level so it keeps running while the widget re-renders
// (e.g. when you switch away and back to the dashboard).
let focusTimer = { remaining: 0, total: 25 * 60, running: false, handle: null };

function focusTimeLabel(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function paintFocusTimer() {
  const display = $("focus-timer-display");
  if (display) {
    const shown = focusTimer.remaining || focusTimer.total;
    display.textContent = focusTimeLabel(shown);
  }
  const toggle = $("focus-timer-toggle");
  if (toggle) toggle.textContent = focusTimer.running ? "Pause" : "Start";
}

function focusTimerTick() {
  if (focusTimer.remaining > 0) {
    focusTimer.remaining -= 1;
    paintFocusTimer();
    if (focusTimer.remaining === 0) {
      stopFocusTimer();
      toast("⏱ Focus session complete — nice work!");
      if ("Notification" in window && Notification.permission === "granted") {
        new Notification("MemoryMap", { body: "Focus session complete — nice work!" });
      }
    }
  }
}

function startFocusTimer() {
  if (focusTimer.running) return;
  if (focusTimer.remaining <= 0) focusTimer.remaining = focusTimer.total;
  focusTimer.running = true;
  if ("Notification" in window && Notification.permission === "default") {
    Notification.requestPermission();
  }
  focusTimer.handle = setInterval(focusTimerTick, 1000);
  paintFocusTimer();
}

function stopFocusTimer() {
  focusTimer.running = false;
  if (focusTimer.handle) clearInterval(focusTimer.handle);
  focusTimer.handle = null;
  paintFocusTimer();
}

function setFocusTimer(minutes) {
  stopFocusTimer();
  focusTimer.total = Math.max(1, Math.round(minutes)) * 60;
  focusTimer.remaining = 0;
  paintFocusTimer();
}

// async to match the widget contract in renderDashboard (render() must
// return a promise).
async function renderFocusTimerWidget(body) {
  const display = document.createElement("div");
  display.id = "focus-timer-display";
  display.className = "focus-timer-display";
  body.appendChild(display);

  const presets = document.createElement("div");
  presets.className = "row focus-presets";
  for (const mins of [5, 15, 25]) {
    presets.appendChild(smallButton(`${mins}m`, `${mins} minutes`, () => setFocusTimer(mins)));
  }
  const custom = document.createElement("input");
  custom.type = "number";
  custom.min = "1";
  custom.max = "180";
  custom.placeholder = "min";
  custom.className = "focus-custom";
  custom.setAttribute("aria-label", "Custom minutes");
  custom.addEventListener("change", () => {
    const value = Number(custom.value);
    if (value >= 1) setFocusTimer(value);
  });
  presets.appendChild(custom);
  body.appendChild(presets);

  const controls = document.createElement("div");
  controls.className = "row";
  const toggle = smallButton("Start", "Start or pause the timer", () => {
    if (focusTimer.running) stopFocusTimer();
    else startFocusTimer();
  }, false);
  toggle.id = "focus-timer-toggle";
  const reset = smallButton("Reset", "Reset the timer", () => {
    focusTimer.remaining = 0;
    stopFocusTimer();
  });
  controls.append(toggle, reset);
  body.appendChild(controls);

  paintFocusTimer();
}

// --- reminders tab (Wave D) --------------------------------------------------------

const notifiedReminderIds = new Set(); // don't re-notify within a session

let reminderFilter = "open"; // open | all | done

async function loadReminders() {
  const all = await apiJson("/reminders").catch(() => []);
  const groupsBox = $("reminder-groups");
  groupsBox.replaceChildren();

  const reminders = all.filter((r) =>
    reminderFilter === "all" ? true : reminderFilter === "done" ? r.done : !r.done
  );
  $("reminders-empty").classList.toggle("hidden", all.length > 0);
  $("reminder-clear-done").classList.toggle("hidden", !all.some((r) => r.done));
  // Surface anything due on the tab itself, from wherever you are.
  updateReminderBadge(all);

  const now = new Date();
  const endOfToday = new Date(now);
  endOfToday.setHours(23, 59, 59, 999);
  const groups = { Overdue: [], Today: [], Upcoming: [], Done: [] };
  for (const reminder of reminders) {
    const due = new Date(reminder.due_at);
    if (reminder.done) groups.Done.push(reminder);
    else if (due < now) groups.Overdue.push(reminder);
    else if (due <= endOfToday) groups.Today.push(reminder);
    else groups.Upcoming.push(reminder);
  }

  // Nothing in this filter, but reminders do exist elsewhere.
  if (all.length && !reminders.length) {
    const none = document.createElement("p");
    none.className = "muted";
    none.textContent =
      reminderFilter === "done"
        ? "Nothing completed yet."
        : "All clear — nothing open.";
    groupsBox.appendChild(none);
  }

  for (const label of ["Overdue", "Today", "Upcoming", "Done"]) {
    const items = groups[label];
    if (!items.length) continue;
    const heading = document.createElement("h3");
    heading.className = `reminder-group-head group-${label.toLowerCase()}`;
    const text = document.createElement("span");
    text.textContent = label;
    const count = document.createElement("span");
    count.className = "group-count";
    count.textContent = items.length;
    heading.append(text, count);
    groupsBox.appendChild(heading);
    const ul = document.createElement("ul");
    ul.className = "entry-list";
    for (const reminder of items) ul.appendChild(reminderItem(reminder, label));
    groupsBox.appendChild(ul);
  }
}

// A count of due-or-overdue reminders on the Reminders tab button, so you
// notice them from any tab.
function updateReminderBadge(reminders) {
  const button = $("tab-btn-reminders");
  if (!button) return;
  const now = new Date();
  const due = (reminders || []).filter(
    (r) => !r.done && new Date(r.due_at) <= now
  ).length;
  let badge = button.querySelector(".tab-badge");
  if (!due) {
    badge?.remove();
    return;
  }
  if (!badge) {
    badge = document.createElement("span");
    badge.className = "tab-badge";
    button.appendChild(badge);
  }
  badge.textContent = due;
  badge.title = `${due} reminder${due === 1 ? "" : "s"} due`;
}

async function clearDoneReminders() {
  const all = await apiJson("/reminders").catch(() => []);
  const done = all.filter((r) => r.done);
  if (!done.length) return;
  if (!confirm(`Delete ${done.length} completed reminder${done.length === 1 ? "" : "s"}?`)) {
    return;
  }
  await Promise.all(
    done.map((r) => api(`/reminders/${r.id}`, { method: "DELETE" }).catch(() => {}))
  );
  toast(`Cleared ${done.length} completed reminder${done.length === 1 ? "" : "s"}.`);
  loadReminders();
}

let editingReminderId = null;

function reminderItem(reminder, label) {
  const li = document.createElement("li");
  if (label === "Overdue") li.classList.add("overdue");
  // Colour-code by priority (styled in CSS: a coloured left border).
  if (reminder.priority && reminder.priority !== "normal") {
    li.classList.add(`priority-${reminder.priority}`);
  }

  if (editingReminderId === reminder.id) {
    li.appendChild(reminderEditForm(reminder));
    return li;
  }

  const row = document.createElement("div");
  row.className = "entry-meta";

  const checkbox = document.createElement("input");
  checkbox.type = "checkbox";
  checkbox.checked = reminder.done;
  checkbox.title = reminder.done ? "Reopen" : "Mark done";
  checkbox.style.width = "auto";
  checkbox.addEventListener("change", async () => {
    // Completing a recurring reminder rolls it forward to the next interval
    // instead of closing it permanently.
    if (checkbox.checked && reminder.recurring && reminder.recurring !== "none") {
      const next = nextRecurringDate(reminder.due_at, reminder.recurring);
      await apiJson(`/reminders/${reminder.id}`, {
        method: "PUT",
        body: JSON.stringify({ due_at: next.toISOString(), done: false }),
      });
      toast(`🔁 Rescheduled to ${next.toLocaleString()}.`);
      loadReminders();
      return;
    }
    await apiJson(`/reminders/${reminder.id}`, {
      method: "PUT",
      body: JSON.stringify({ done: checkbox.checked }),
    });
    loadReminders();
  });
  row.appendChild(checkbox);

  const text = document.createElement("span");
  text.className = "reminder-text";
  text.textContent = reminder.text;
  if (reminder.done) text.style.textDecoration = "line-through";
  row.appendChild(text);

  if (reminder.recurring && reminder.recurring !== "none") {
    const repeat = chip(`🔁 ${reminder.recurring}`, "tag");
    repeat.title = `Repeats ${reminder.recurring}`;
    row.appendChild(repeat);
  }

  const due = document.createElement("span");
  due.className = "entry-date";
  due.textContent = relativeWhen(reminder.due_at); // "in 2 hours" / "3 days ago"
  due.title = new Date(reminder.due_at).toLocaleString(); // exact on hover
  row.appendChild(due);

  const actions = document.createElement("span");
  actions.className = "entry-actions";
  if (!reminder.done) {
    actions.appendChild(
      smallButton("+1h", "Snooze one hour", () =>
        snoozeReminderTo(reminder, new Date(Date.now() + 60 * 60 * 1000))
      )
    );
    actions.appendChild(
      smallButton("→ tmrw", "Snooze to tomorrow 9am", () =>
        snoozeReminderTo(reminder, presetDate("tomorrow"))
      )
    );
  }
  actions.appendChild(
    smallButton("✎", "Edit this reminder", () => {
      editingReminderId = reminder.id;
      loadReminders();
    })
  );
  actions.appendChild(
    smallButton("×", "Delete this reminder", async () => {
      await apiJson(`/reminders/${reminder.id}`, { method: "DELETE" });
      loadReminders();
      // Deleting a reminder is as undo-able as binning a note.
      toastAction("Reminder deleted.", "Undo", async () => {
        await apiJson("/reminders", {
          method: "POST",
          body: JSON.stringify({
            text: reminder.text,
            due_at: reminder.due_at,
            entry_id: reminder.entry_id,
            priority: reminder.priority || "normal",
            recurring: reminder.recurring || "none",
          }),
        }).catch((e) => toast(e.message, true));
        loadReminders();
        toast("Reminder restored.");
      });
    })
  );
  row.appendChild(actions);
  li.appendChild(row);

  if (reminder.entry_preview) {
    const linkRow = document.createElement("div");
    linkRow.className = "entry-links";
    const noteChip = chip(`📝 ${reminder.entry_preview}`, "link", () =>
      flashEntry(reminder.entry_id)
    );
    linkRow.appendChild(noteChip);
    li.appendChild(linkRow);
  }
  return li;
}

// Relative time that works both ways: "in 2 hours" (future) and "3 days ago"
// (past). relativeTime() only handles the past, which is wrong for reminders.
function relativeWhen(iso) {
  const diff = new Date(iso).getTime() - Date.now();
  const future = diff >= 0;
  const mins = Math.abs(diff) / 60000;
  if (mins < 0.75) return future ? "now" : "just now";
  let value;
  let unit;
  if (mins < 60) {
    value = Math.round(mins);
    unit = "minute";
  } else if (mins / 60 < 24) {
    value = Math.round(mins / 60);
    unit = "hour";
  } else if (mins / 60 / 24 < 7) {
    value = Math.round(mins / 60 / 24);
    unit = "day";
  } else {
    return new Date(iso).toLocaleDateString();
  }
  const label = `${value} ${unit}${value === 1 ? "" : "s"}`;
  return future ? `in ${label}` : `${label} ago`;
}

// Convert an ISO timestamp to the value a <input type=datetime-local> wants.
function toLocalInputValue(iso) {
  const d = new Date(iso);
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// The next occurrence of a recurring reminder. Steps forward from the due
// time until it lands in the future, so completing a long-overdue daily
// reminder doesn't just move it one day into the past.
function nextRecurringDate(fromIso, recurring) {
  const next = new Date(fromIso);
  const step = () => {
    if (recurring === "daily") next.setDate(next.getDate() + 1);
    else if (recurring === "weekly") next.setDate(next.getDate() + 7);
    else if (recurring === "monthly") next.setMonth(next.getMonth() + 1);
    else next.setDate(next.getDate() + 1); // safety fallback
  };
  step();
  const now = Date.now();
  let guard = 0;
  while (next.getTime() <= now && guard < 600) {
    step();
    guard += 1;
  }
  return next;
}

// A named quick-due preset -> a concrete Date.
function presetDate(preset) {
  const d = new Date();
  d.setSeconds(0, 0);
  switch (preset) {
    case "30m":
      d.setMinutes(d.getMinutes() + 30);
      break;
    case "1h":
      d.setHours(d.getHours() + 1);
      break;
    case "3h":
      d.setHours(d.getHours() + 3);
      break;
    case "tonight":
      // If it's already past 7pm, "tonight" can only mean tomorrow evening.
      if (d.getHours() >= 19) d.setDate(d.getDate() + 1);
      d.setHours(19, 0, 0, 0);
      break;
    case "tomorrow":
      d.setDate(d.getDate() + 1);
      d.setHours(9, 0, 0, 0);
      break;
    case "tomorrowpm":
      d.setDate(d.getDate() + 1);
      d.setHours(14, 0, 0, 0);
      break;
    case "weekend": {
      // The coming Saturday morning; on a Saturday or Sunday, the next one.
      const daysToSaturday = (6 - d.getDay() + 7) % 7 || 7;
      d.setDate(d.getDate() + daysToSaturday);
      d.setHours(10, 0, 0, 0);
      break;
    }
    case "nextweek":
      d.setDate(d.getDate() + 7);
      d.setHours(9, 0, 0, 0);
      break;
    default:
      break;
  }
  return d;
}

// A plain-English echo of whatever is in the datetime field. The raw
// "27/07/2026 11:20 AM" is hard to sanity-check at a glance; "in about 3
// hours — Monday 27 July, 11:20" is not (user-reported).
function updateDueReadout() {
  const readout = $("reminder-due-readout");
  if (!readout) return;
  const raw = $("reminder-due").value;
  if (!raw) {
    readout.textContent = "No time set";
    readout.classList.add("muted");
    return;
  }
  const when = new Date(raw);
  if (Number.isNaN(when.getTime())) {
    readout.textContent = "That date doesn't look right";
    return;
  }
  const minutes = Math.round((when.getTime() - Date.now()) / 60000);
  const pretty = when.toLocaleString([], {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });
  let relative;
  if (minutes < 0) relative = "in the past";
  else if (minutes < 1) relative = "in under a minute";
  else if (minutes < 60) relative = `in ${minutes} min`;
  else if (minutes < 60 * 24) relative = `in about ${Math.round(minutes / 60)} h`;
  else {
    const days = Math.round(minutes / (60 * 24));
    relative = `in ${days} day${days === 1 ? "" : "s"}`;
  }
  readout.textContent = `⏰ ${relative} — ${pretty}`;
  readout.classList.toggle("error", minutes < 0);
}

// Shift the due time by a number of minutes, from whatever is there now.
function nudgeDue(minutes) {
  const raw = $("reminder-due").value;
  const base = raw && !Number.isNaN(new Date(raw).getTime()) ? new Date(raw) : new Date();
  base.setMinutes(base.getMinutes() + minutes);
  $("reminder-due").value = toLocalInputValue(base.toISOString());
  updateDueReadout();
}

// True when the compose form is untouched — nothing typed anywhere. Only then
// is it safe to move the due time out from under the user.
function reminderComposeIsPristine() {
  return (
    !$("reminder-text").value.trim() &&
    !$("reminder-magic").value.trim() &&
    $("reminder-priority").value === "normal" &&
    $("reminder-recurring").value === "none"
  );
}

// Re-seed the due time whenever the tab is opened on an untouched form, so it
// is always relative to now rather than to whenever the app happened to start
// (user request). A half-written reminder is never disturbed.
function refreshReminderDefaults() {
  if (!$("reminder-due").value || reminderComposeIsPristine()) {
    $("reminder-due").value = defaultDueValue();
  }
  updateDueReadout();
}

async function snoozeReminderTo(reminder, when) {
  await apiJson(`/reminders/${reminder.id}`, {
    method: "PUT",
    body: JSON.stringify({ due_at: when.toISOString(), done: false }),
  });
  toast(`Snoozed to ${when.toLocaleString()}.`);
  loadReminders();
}

function reminderEditForm(reminder) {
  const wrap = document.createElement("div");
  wrap.className = "inline-action";
  const textInput = document.createElement("input");
  textInput.type = "text";
  textInput.maxLength = 500;
  textInput.value = reminder.text;
  const dueInput = document.createElement("input");
  dueInput.type = "datetime-local";
  dueInput.value = toLocalInputValue(reminder.due_at);
  const prioritySelect = buildSelect(
    [
      ["normal", "Normal"],
      ["low", "Low priority"],
      ["high", "High priority"],
    ],
    reminder.priority || "normal"
  );
  prioritySelect.title = "Priority";
  const recurringSelect = buildSelect(
    [
      ["none", "Once"],
      ["daily", "Daily"],
      ["weekly", "Weekly"],
      ["monthly", "Monthly"],
    ],
    reminder.recurring || "none"
  );
  recurringSelect.title = "Repeat";
  const row = document.createElement("div");
  row.className = "row";
  row.appendChild(
    smallButton("Save", "", async () => {
      const text = textInput.value.trim();
      if (!text || !dueInput.value) {
        toast("A reminder needs text and a time.", true);
        return;
      }
      await apiJson(`/reminders/${reminder.id}`, {
        method: "PUT",
        body: JSON.stringify({
          text,
          due_at: new Date(dueInput.value).toISOString(),
          priority: prioritySelect.value,
          recurring: recurringSelect.value,
        }),
      });
      editingReminderId = null;
      loadReminders();
    }, false)
  );
  row.appendChild(
    smallButton("Cancel", "", () => {
      editingReminderId = null;
      loadReminders();
    })
  );
  wrap.append(textInput, dueInput, prioritySelect, recurringSelect, row);
  setTimeout(() => textInput.focus(), 0);
  return wrap;
}

async function addReminder(text, dueValue, entryId = null, opts = {}) {
  if (!text || !dueValue) {
    toast("A reminder needs text and a due time.", true);
    return false;
  }
  await apiJson("/reminders", {
    method: "POST",
    body: JSON.stringify({
      text,
      due_at: new Date(dueValue).toISOString(),
      entry_id: entryId,
      priority: opts.priority || "normal",
      recurring: opts.recurring || "none",
    }),
  });
  // Ask once for notification permission, when the first reminder lands.
  if ("Notification" in window && Notification.permission === "default") {
    Notification.requestPermission();
  }
  toast("Reminder set.");
  loadReminders();
  return true;
}

// Magic Add: send natural language to the AI, which parses it into a reminder.
async function magicAddReminder() {
  const input = $("reminder-magic");
  const status = $("reminder-magic-status");
  const text = input.value.trim();
  if (!text) return;
  status.classList.remove("error");
  status.textContent = "✨ Parsing…";
  try {
    const reminder = await apiJson("/reminders/parse", {
      method: "POST",
      // Send our clock, so "tomorrow evening" is resolved against the time
      // the user can see rather than the server's UTC.
      body: JSON.stringify({ text, tz_offset_minutes: -new Date().getTimezoneOffset() }),
    });
    input.value = "";
    status.textContent = `Added “${reminder.text}” — ${relativeWhen(reminder.due_at)}. Edit it below if needed.`;
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
    loadReminders();
  } catch (error) {
    status.classList.add("error");
    status.textContent = error.message;
  }
}

// Fire browser notifications for reminders that come due while the app
// is open (checked every 30s).
async function checkDueReminders() {
  if (!authToken()) return;
  // silent: a background reminder poll must not pop the lock screen (Wave O).
  const reminders = await apiJson("/reminders", { silent: true }).catch(() => []);
  const now = new Date();
  for (const reminder of reminders) {
    if (reminder.done || notifiedReminderIds.has(reminder.id)) continue;
    const due = new Date(reminder.due_at);
    if (due <= now && now - due < 12 * 60 * 60 * 1000) {
      notifiedReminderIds.add(reminder.id);
      toast(`⏰ Reminder: ${reminder.text}`);
      if ("Notification" in window && Notification.permission === "granted") {
        new Notification("MemoryMap reminder", { body: reminder.text });
      }
    }
  }
}
setInterval(checkDueReminders, 30_000);

// Default due time for new reminders: tomorrow morning, 9am.
// The field starts at today's date and the current time, so the common case
// is a small nudge rather than re-typing the whole thing. It used to jump to
// 9am tomorrow, which was wrong far more often than it was right. Rounded up
// to the next five minutes so the default isn't already in the past by the
// time you press Add.
function defaultDueValue() {
  const due = new Date();
  due.setSeconds(0, 0);
  due.setMinutes(Math.ceil((due.getMinutes() + 1) / 5) * 5);
  return toLocalInputValue(due.toISOString());
}

// --- tiny markdown renderer (Round 1) -------------------------------------------
// Safe by construction: builds DOM with createElement/textContent, never
// innerHTML, so note/answer text can never inject markup. Supports the
// subset small local models actually emit: headings, bullet/numbered
// lists, fenced code, and inline **bold**/*italic*/`code`/[links].

// True when `line` looks like a GFM table separator row, e.g.
// "| --- | :---: |" — the row that turns the line above it into a header.
function isTableSeparator(line) {
  const trimmed = line.trim();
  if (!trimmed.includes("-") || !/\|/.test(trimmed)) return false;
  const cells = splitTableRow(trimmed);
  return cells.length > 0 && cells.every((c) => /^:?-{1,}:?$/.test(c.trim()));
}

// Split one "| a | b |" row into its cell strings, tolerating (and
// stripping) the optional leading/trailing pipes. Escaped \| stays literal.
function splitTableRow(line) {
  const cells = [];
  let current = "";
  for (let k = 0; k < line.length; k++) {
    const ch = line[k];
    if (ch === "\\" && line[k + 1] === "|") {
      current += "|";
      k++;
    } else if (ch === "|") {
      cells.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  cells.push(current);
  // Drop the empty cells created by leading/trailing pipes.
  if (cells.length && cells[0].trim() === "") cells.shift();
  if (cells.length && cells[cells.length - 1].trim() === "") cells.pop();
  return cells;
}

// Column alignment from the separator row: ":--" left, "--:" right,
// ":-:" centre, else none.
function columnAlign(spec) {
  const s = spec.trim();
  const left = s.startsWith(":");
  const right = s.endsWith(":");
  if (left && right) return "center";
  if (right) return "right";
  if (left) return "left";
  return "";
}

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

    // GFM pipe table: a row of "| … |" immediately followed by a
    // "| --- | --- |" separator turns into a real <table>.
    if (
      line.includes("|") &&
      i + 1 < lines.length &&
      isTableSeparator(lines[i + 1])
    ) {
      closeList();
      const headers = splitTableRow(line);
      const aligns = splitTableRow(lines[i + 1]).map(columnAlign);
      i += 2; // consume header + separator
      const bodyRows = [];
      while (i < lines.length && lines[i].includes("|") && lines[i].trim() !== "") {
        bodyRows.push(splitTableRow(lines[i]));
        i++;
      }
      const table = document.createElement("table");
      table.className = "md-table";
      const thead = document.createElement("thead");
      const headTr = document.createElement("tr");
      headers.forEach((cell, c) => {
        const th = document.createElement("th");
        if (aligns[c]) th.style.textAlign = aligns[c];
        appendInline(th, cell.trim());
        headTr.appendChild(th);
      });
      thead.appendChild(headTr);
      table.appendChild(thead);
      const tbody = document.createElement("tbody");
      for (const row of bodyRows) {
        const tr = document.createElement("tr");
        for (let c = 0; c < headers.length; c++) {
          const td = document.createElement("td");
          if (aligns[c]) td.style.textAlign = aligns[c];
          appendInline(td, (row[c] || "").trim());
          tr.appendChild(td);
        }
        tbody.appendChild(tr);
      }
      table.appendChild(tbody);
      // Let wide tables scroll sideways instead of breaking the layout.
      const scroller = document.createElement("div");
      scroller.className = "md-table-wrap";
      scroller.appendChild(table);
      container.appendChild(scroller);
      continue;
    }

    // Horizontal rule: ---, ***, or ___ on their own line.
    if (/^\s*([-*_])(\s*\1){2,}\s*$/.test(line)) {
      closeList();
      container.appendChild(document.createElement("hr"));
      i++;
      continue;
    }

    const heading = line.match(/^(#{1,6})\s+(.*)$/);
    if (heading) {
      closeList();
      // Map #→h3 … ######→h6 (the app reserves h1/h2 for its own chrome).
      const level = Math.min(6, heading[1].length + 2);
      const el = document.createElement(`h${level}`);
      appendInline(el, heading[2]);
      container.appendChild(el);
      i++;
      continue;
    }

    // Blockquote: gather consecutive "> …" lines into one <blockquote>.
    if (/^\s*>\s?/.test(line)) {
      closeList();
      const quoted = [];
      while (i < lines.length && /^\s*>\s?/.test(lines[i])) {
        quoted.push(lines[i].replace(/^\s*>\s?/, ""));
        i++;
      }
      const bq = document.createElement("blockquote");
      appendInline(bq, quoted.join(" "));
      container.appendChild(bq);
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
      let itemText = (bullet || numbered)[1];
      // GFM task list: "- [ ] todo" / "- [x] done" → a real checkbox.
      const task = itemText.match(/^\[([ xX])\]\s+(.*)$/);
      if (task) {
        li.className = "md-task";
        const box = document.createElement("input");
        box.type = "checkbox";
        box.disabled = true;
        box.checked = task[1].toLowerCase() === "x";
        li.appendChild(box);
        itemText = task[2];
      }
      appendInline(li, itemText);
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
      !lines[i].match(/^(#{1,6})\s+/) &&
      !lines[i].match(/^\s*>\s?/) &&
      !/^\s*([-*_])(\s*\1){2,}\s*$/.test(lines[i]) &&
      !lines[i].match(/^\s*[-*+]\s+/) &&
      !lines[i].match(/^\s*\d+\.\s+/) &&
      !(lines[i].includes("|") && i + 1 < lines.length && isTableSeparator(lines[i + 1]))
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

// Inline formatting: **bold**, *italic*, `code`, ~~strike~~,
// [text](http…url), and bare http(s) URLs. Built with textContent only —
// note/answer text can never inject markup.
function appendInline(parent, text) {
  const pattern =
    /(\*\*[^*]+\*\*|__[^_]+__|~~[^~]+~~|\*[^*]+\*|(?<![\w])_[^_]+_(?![\w])|`[^`]+`|\[[^\]]+\]\((https?:\/\/[^)]+)\)|https?:\/\/[^\s)]+)/g;
  let last = 0;
  let match;
  while ((match = pattern.exec(text)) !== null) {
    if (match.index > last) {
      parent.appendChild(document.createTextNode(text.slice(last, match.index)));
    }
    const token = match[0];
    if (token.startsWith("**") || token.startsWith("__")) {
      const el = document.createElement("strong");
      el.textContent = token.slice(2, -2);
      parent.appendChild(el);
    } else if (token.startsWith("~~")) {
      const el = document.createElement("del");
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
    } else if (token.startsWith("http")) {
      const el = document.createElement("a");
      el.href = token;
      el.target = "_blank";
      el.rel = "noopener";
      el.textContent = token;
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

// --- graph view (Wave E) ----------------------------------------------------------
// An Obsidian-style force-directed map. D3 is vendored locally
// (frontend/vendor) — the offline rule allows no CDN.

let graphSimulation = null; // stopped before every rebuild
let graphHiddenCategories = new Set(); // legend toggles (Wave M)
let graphNodeSelection = null; // live d3 selections, for search-highlight
let graphEdgeSelection = null;
// Refs kept so the on-screen zoom buttons can drive the same behaviour as
// scroll-zoom, and hover-highlight can look up a node's neighbours.
let graphSvg = null;
let graphZoom = null;
let graphCanvas = null;
let graphNodesRef = null;
let graphDims = { w: 0, h: 0 };
let graphHoveredId = null; // node the pointer is over (spotlight its links)
let graphAdjacency = null; // Map<id, Set<neighbourId>>

function graphNodeRadius(node) {
  // Much-used notes draw the eye: base size + a gentle access bonus.
  return 9 + Math.min(9, Math.sqrt(node.access_count || 0) * 2);
}

async function renderGraph() {
  const wantSimilarity = $("graph-similarity").checked;
  const data = await apiJson(
    `/graph${wantSimilarity ? "?similarity=true" : ""}`
  ).catch(() => null);
  if (!data) return;

  if (graphSimulation) graphSimulation.stop();
  const svg = d3.select("#graph-svg");
  svg.selectAll("*").remove();
  // Inline display beats every stylesheet rule — the overlay can never
  // float over a populated graph again (user-reported, Wave O).
  const empty = $("graph-empty");
  empty.style.display = data.nodes.length > 0 ? "none" : "grid";
  empty.classList.toggle("hidden", data.nodes.length > 0);

  // Colour legend: one dot per category, same scale as the nodes.
  const color = d3.scaleOrdinal(
    data.categories,
    d3.schemeTableau10.concat(d3.schemeSet3)
  );
  const legend = $("graph-legend");
  legend.replaceChildren();
  for (const category of data.categories) {
    // Legend entries double as filters (Wave M): click to hide/show.
    const item = document.createElement("button");
    item.className = "legend-item legend-toggle";
    item.classList.toggle("legend-off", graphHiddenCategories.has(category));
    item.title = graphHiddenCategories.has(category)
      ? `Show ${category} again`
      : `Hide ${category} from the map`;
    item.setAttribute("aria-pressed", String(!graphHiddenCategories.has(category)));
    const dot = document.createElement("span");
    dot.className = "legend-dot";
    dot.style.background = color(category);
    item.append(dot, document.createTextNode(category));
    item.addEventListener("click", () => {
      if (graphHiddenCategories.has(category)) graphHiddenCategories.delete(category);
      else graphHiddenCategories.add(category);
      renderGraph();
    });
    legend.appendChild(item);
  }

  // Apply the legend filter: drop hidden categories and their edges.
  let visibleNodes = data.nodes.filter(
    (n) => !graphHiddenCategories.has(n.category)
  );
  const keptIds = new Set(visibleNodes.map((n) => n.id));
  const visibleEdges = data.edges.filter(
    (e) => keptIds.has(e.source) && keptIds.has(e.target)
  );
  // "Hide unlinked" (declutter): keep only notes that appear in an edge.
  if ($("graph-hide-orphans") && $("graph-hide-orphans").checked) {
    const connected = new Set();
    for (const e of visibleEdges) {
      connected.add(e.source);
      connected.add(e.target);
    }
    visibleNodes = visibleNodes.filter((n) => connected.has(n.id));
  }
  if (!visibleNodes.length) {
    empty.style.display = "grid";
    empty.classList.remove("hidden");
    return;
  }

  const box = $("graph-box");
  const width = box.clientWidth || 800;
  const height = box.clientHeight || 540;
  svg.attr("viewBox", [0, 0, width, height]);

  // One zoomable/pannable group holds everything.
  const canvas = svg.append("g");
  const zoomBehavior = d3
    .zoom()
    .scaleExtent([0.2, 5])
    .on("zoom", (event) => canvas.attr("transform", event.transform));
  svg.call(zoomBehavior).on("dblclick.zoom", null); // dblclick pins, not zooms

  // Keep refs so the +/−/fit buttons drive this same zoom behaviour.
  graphSvg = svg;
  graphZoom = zoomBehavior;
  graphCanvas = canvas;
  graphDims = { w: width, h: height };

  // D3 mutates these (x/y/vx/vy), so work on copies.
  const nodes = visibleNodes.map((n) => ({ ...n }));
  const edges = visibleEdges.map((e) => ({ ...e }));
  graphNodesRef = nodes;
  // Adjacency for hover-highlight: which notes each note is linked to.
  graphAdjacency = new Map(nodes.map((n) => [n.id, new Set()]));
  for (const e of edges) {
    graphAdjacency.get(e.source)?.add(e.target);
    graphAdjacency.get(e.target)?.add(e.source);
  }

  // Physics sliders (0–100, default 50) scale the tuned defaults so the
  // out-of-the-box layout is unchanged at 50.
  const gravity = Number(localStorage.getItem("graph-gravity") ?? 50);
  const spread = Number(localStorage.getItem("graph-spread") ?? 50);
  const spreadScale = 0.5 + spread / 50; // 0.5×–2.5× the base link distance
  const gravityScale = 0.4 + gravity / 41.7; // stronger pull → tighter clusters

  graphSimulation = d3
    .forceSimulation(nodes)
    .force(
      "link",
      d3
        .forceLink(edges)
        .id((d) => d.id)
        .distance((d) => (d.kind === "similar" ? 130 : 80) * spreadScale)
    )
    // More repulsion + a mild centring pull → notes spread out and fill
    // the space instead of clumping in the middle (Wave N polish).
    .force("charge", d3.forceManyBody().strength(-340 / gravityScale))
    .force("center", d3.forceCenter(width / 2, height / 2))
    .force("x", d3.forceX(width / 2).strength(0.04))
    .force("y", d3.forceY(height / 2).strength(0.06))
    .force("collide", d3.forceCollide().radius((d) => graphNodeRadius(d) + 24));

  const edgeLines = canvas
    .append("g")
    .selectAll("line")
    .data(edges)
    .join("line")
    .attr("class", (d) => `graph-edge graph-edge-${d.kind}`);

  const nodeGroups = canvas
    .append("g")
    .selectAll("g")
    .data(nodes)
    .join("g")
    .attr("class", "graph-node")
    .call(
      d3
        .drag()
        .on("start", (event, d) => {
          if (!event.active) graphSimulation.alphaTarget(0.3).restart();
          d.fx = d.x;
          d.fy = d.y;
        })
        .on("drag", (event, d) => {
          d.fx = event.x;
          d.fy = event.y;
        })
        .on("end", (event, d) => {
          if (!event.active) graphSimulation.alphaTarget(0);
          d.fx = null;
          d.fy = null;
        })
    )
    .on("click", (event, d) => openGraphPopup(event, d))
    // Double-click pins a node where it is; again releases it (Wave M).
    .on("dblclick", function (event, d) {
      event.stopPropagation(); // don't also zoom
      if (d.fx != null) {
        d.fx = null;
        d.fy = null;
        d3.select(this).classed("graph-held", false);
      } else {
        d.fx = d.x;
        d.fy = d.y;
        d3.select(this).classed("graph-held", true);
      }
    });

  // A soft outer halo behind each node — gives the map more depth and makes
  // busy hub notes read as brighter (visual polish, user request).
  nodeGroups
    .append("circle")
    .attr("class", "graph-halo")
    .attr("r", (d) => graphNodeRadius(d) + 6)
    .attr("fill", (d) => color(d.category));

  nodeGroups
    .append("circle")
    .attr("class", "graph-core")
    .attr("r", graphNodeRadius)
    .attr("fill", (d) => color(d.category))
    .classed("graph-pinned", (d) => d.pinned)
    // Well-connected notes get a highlighted ring so the "hubs" of your
    // notebook stand out at a glance.
    .classed("graph-hub", (d) => (graphAdjacency.get(d.id)?.size || 0) >= 3);
  // A pin badge, so pinned notes are identifiable at a glance.
  nodeGroups
    .filter((d) => d.pinned)
    .append("text")
    .attr("class", "graph-pin-badge")
    .attr("dy", (d) => -graphNodeRadius(d) - 4)
    .text("📌");
  // Native tooltip: full preview + category + how connected it is.
  nodeGroups.append("title").text((d) => {
    const links = graphAdjacency.get(d.id)?.size || 0;
    return (
      `${d.preview}\n[${d.category}] · ${links} connection${links === 1 ? "" : "s"}` +
      `${d.access_count ? ` · used ${d.access_count}×` : ""}`
    );
  });
  nodeGroups
    .append("text")
    .attr("class", "graph-label")
    .attr("dy", (d) => graphNodeRadius(d) + 13)
    .text((d) => (d.preview.length > 22 ? d.preview.slice(0, 21) + "…" : d.preview));

  // Labels toggle: when off, labels only appear on hover (declutters a big
  // map). Driven by a class so toggling never rebuilds the simulation.
  $("graph-box").classList.toggle("graph-labels-hidden", !$("graph-labels").checked);

  // A plain-language readout of what's on screen, so the map isn't a
  // mystery: how many notes and what kinds of connections link them.
  const counts = { link: 0, thread: 0, similar: 0 };
  for (const e of edges) counts[e.kind] = (counts[e.kind] || 0) + 1;
  const parts = [`${nodes.length} note${nodes.length === 1 ? "" : "s"}`];
  if (counts.link) parts.push(`${counts.link} link${counts.link === 1 ? "" : "s"}`);
  if (counts.thread) parts.push(`${counts.thread} thread${counts.thread === 1 ? "" : "s"}`);
  if (counts.similar) parts.push(`${counts.similar} similarity line${counts.similar === 1 ? "" : "s"}`);
  $("graph-stats").textContent =
    parts.join(" · ") + " — bigger, brighter notes are the ones you use most.";

  // Hover-highlight (spotlight a note's connections). Uses the same dimming
  // pipeline as search so the two never fight each other.
  nodeGroups
    .on("mouseenter", (_event, d) => {
      graphHoveredId = d.id;
      applyGraphHighlight();
    })
    .on("mouseleave", () => {
      graphHoveredId = null;
      applyGraphHighlight();
    });

  let fitted = false;
  graphSimulation.on("tick", () => {
    edgeLines
      .attr("x1", (d) => d.source.x)
      .attr("y1", (d) => d.source.y)
      .attr("x2", (d) => d.target.x)
      .attr("y2", (d) => d.target.y);
    nodeGroups.attr("transform", (d) => `translate(${d.x},${d.y})`);
    // Once the layout settles, frame all the notes so nothing sits off
    // the edge (Wave N — the old view often had nodes half-cropped).
    if (!fitted && graphSimulation.alpha() < 0.08) {
      fitted = true;
      fitGraphToView(svg, canvas, zoomBehavior, nodes, width, height);
    }
  });

  // Search-highlight (Wave M): remember the selections and re-apply any
  // query that's already typed.
  graphNodeSelection = nodeGroups;
  graphEdgeSelection = edgeLines;
  applyGraphHighlight();
}

// Zoom/pan so every node fits with a margin (Wave N).
function fitGraphToView(svg, canvas, zoomBehavior, nodes, width, height) {
  const xs = nodes.map((n) => n.x);
  const ys = nodes.map((n) => n.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const spanX = Math.max(maxX - minX, 1);
  const spanY = Math.max(maxY - minY, 1);
  const margin = 60;
  const scale = Math.min(
    3,
    (width - margin * 2) / spanX,
    (height - margin * 2) / spanY
  );
  const tx = width / 2 - scale * (minX + maxX) / 2;
  const ty = height / 2 - scale * (minY + maxY) / 2;
  svg
    .transition()
    .duration(500)
    .call(
      zoomBehavior.transform,
      d3.zoomIdentity.translate(tx, ty).scale(scale)
    );
}

// Dim everything except nodes that match the search box AND (when hovering)
// the hovered note plus its direct neighbours; edges stay bright only when
// both ends survive. Search (Wave M) and hover-spotlight share one pass so
// they can't contradict each other.
// Set by "≈ Similar" to spotlight an explicit set of notes; cleared by the
// next search or refresh.
let graphHighlightIds = null;

function applyGraphHighlight() {
  if (!graphNodeSelection) return;
  const query = $("graph-search").value.trim().toLowerCase();
  if (query) graphHighlightIds = null; // typing takes over the spotlight
  const searchOk = (d) =>
    graphHighlightIds
      ? graphHighlightIds.has(d.id)
      : !query || d.preview.toLowerCase().includes(query);

  const neighbours =
    graphHoveredId != null && graphAdjacency
      ? graphAdjacency.get(graphHoveredId)
      : null;
  const hoverOk = (id) =>
    neighbours == null || id === graphHoveredId || neighbours.has(id);
  // After forceLink binds, edge.source/target are node objects, not ids.
  const idOf = (end) => (end && end.id != null ? end.id : end);

  graphNodeSelection.classed(
    "graph-dim",
    (d) => !(searchOk(d) && hoverOk(d.id))
  );
  graphNodeSelection.classed("graph-focus", (d) => d.id === graphHoveredId);
  graphEdgeSelection.classed("graph-dim", (d) => {
    const s = idOf(d.source);
    const t = idOf(d.target);
    const bySearch =
      !(query || graphHighlightIds) || (searchOk(d.source) && searchOk(d.target));
    const byHover =
      neighbours == null || s === graphHoveredId || t === graphHoveredId;
    return !(bySearch && byHover);
  });
}

// --- graph node popup: edit a note without leaving the map -------------------

let graphPopupId = null;
let graphPopupAnchor = null;

async function openGraphPopup(event, node) {
  event.stopPropagation();
  graphPopupId = node.id;
  const popup = $("graph-popup");
  const status = $("graph-popup-status");
  status.textContent = "";
  status.classList.remove("error");
  $("graph-popup-title").textContent = node.category || "Note";
  $("graph-popup-content").value = "Loading…";
  $("graph-popup-tags").value = "";
  popup.classList.remove("hidden");

  // Remember where the click was: the popup has to be placed again once the
  // note arrives, because the info chips and action buttons render afterwards
  // and grow it. Positioning only on open is what let a tall note hang off
  // the bottom of the map.
  graphPopupAnchor = { x: event.clientX, y: event.clientY };
  placeGraphPopup();

  const entry = await apiJson(`/entries/${node.id}`).catch(() => null);
  if (!entry || graphPopupId !== node.id) {
    if (graphPopupId === node.id) {
      $("graph-popup-content").value = "";
      status.textContent = "Couldn't load this note.";
      status.classList.add("error");
    }
    return;
  }
  $("graph-popup-content").value = entry.content;
  $("graph-popup-tags").value = (entry.tags || []).join(", ");
  renderGraphPopupInfo(entry, node);
  renderGraphPopupActions(entry);
  placeGraphPopup(); // now that it's at its real height
  $("graph-popup-content").focus();
}

// Clamp the popup inside the graph box. Called on open and again once the
// note has loaded, since the popup is taller by then.
function placeGraphPopup() {
  const popup = $("graph-popup");
  if (!graphPopupAnchor || popup.classList.contains("hidden")) return;
  const box = $("graph-box").getBoundingClientRect();
  // Never taller than the map it sits in — beyond that the popup scrolls
  // itself rather than growing off the edge.
  popup.style.maxHeight = `${Math.max(120, box.height - 16)}px`;
  const size = popup.getBoundingClientRect();
  const left = Math.min(
    Math.max(graphPopupAnchor.x - box.left + 12, 8),
    Math.max(8, box.width - size.width - 8)
  );
  const top = Math.min(
    Math.max(graphPopupAnchor.y - box.top + 12, 8),
    Math.max(8, box.height - size.height - 8)
  );
  popup.style.left = `${left}px`;
  popup.style.top = `${top}px`;
}

// The facts about a note, as small chips.
function renderGraphPopupInfo(entry, node) {
  const box = $("graph-popup-info");
  box.replaceChildren();
  const facts = [
    ["🗂", entry.category || node.category || "Uncategorised"],
    ["🕐", new Date(entry.created_at).toLocaleDateString()],
    ["🔗", `${(entry.links || []).length} link${(entry.links || []).length === 1 ? "" : "s"}`],
    ["👁", `${entry.access_count || 0} view${entry.access_count === 1 ? "" : "s"}`],
  ];
  if (entry.pinned) facts.push(["📌", "Pinned"]);
  if (typeof entry.ai_confidence === "number") {
    facts.push(["🎯", `${entry.ai_confidence}% confident`]);
  }
  for (const [icon, text] of facts) {
    const item = chip(`${icon} ${text}`, "tag");
    box.appendChild(item);
  }
  const tags = entry.tags || [];
  for (const tag of tags.slice(0, 6)) box.appendChild(chip(tag, "tag"));
}

// Everything you can do to this note from the map.
function renderGraphPopupActions(entry) {
  const box = $("graph-popup-actions");
  box.replaceChildren();

  box.appendChild(
    smallButton(entry.pinned ? "📌 Unpin" : "📌 Pin", "Pin or unpin this note", async () => {
      await apiJson(`/entries/${entry.id}`, {
        method: "PUT",
        body: JSON.stringify({ pinned: !entry.pinned }),
      }).catch((e) => toast(e.message, true));
      toast(entry.pinned ? "Unpinned." : "Pinned.");
      closeGraphPopup();
      await loadEntries().catch(() => {});
      renderGraph();
    })
  );
  box.appendChild(
    smallButton("🌱 Grow", "Add a new note linked to this one", (event) =>
      openGraphNewNote(event, entry.id)
    )
  );
  box.appendChild(
    smallButton("≈ Similar", "Highlight notes that mean something similar", async () => {
      const related = await apiJson(`/entries/${entry.id}/related`).catch(() => []);
      if (!related.length) {
        toast("No similar notes found.");
        return;
      }
      // Reuse the existing highlight pass by searching for these ids.
      graphHighlightIds = new Set(related.map((r) => r.id).concat(entry.id));
      applyGraphHighlight();
      closeGraphPopup();
      toast(`Highlighted ${related.length} similar note${related.length === 1 ? "" : "s"}.`);
    })
  );
  box.appendChild(
    smallButton("🔗 Link", "Start linking this note to another", () => {
      closeGraphPopup();
      beginOrCompleteLink(entry);
      toast("Now click another note on the map to link them.");
    })
  );
  box.appendChild(
    smallButton("⏰ Remind", "Set a reminder about this note", () => {
      closeGraphPopup();
      switchTab("reminders");
      $("reminder-text").value = `Follow up: ${entry.content.slice(0, 60)}`;
      $("reminder-due").value = defaultDueValue();
      $("reminder-text").focus();
    })
  );
  box.appendChild(
    smallButton("📝 Open", "Open this note in the Notes tab", () => {
      const id = entry.id;
      closeGraphPopup();
      flashEntry(id);
    })
  );
  box.appendChild(
    smallButton("🗑 Bin", "Move this note to the recycle bin", async () => {
      if (!confirm("Move this note to the recycle bin?")) return;
      await api(`/entries/${entry.id}`, { method: "DELETE" }).catch((e) =>
        toast(e.message, true)
      );
      closeGraphPopup();
      await loadEntries().catch(() => {});
      renderGraph();
      toastAction("Moved to the recycle bin.", "Undo", async () => {
        await api(`/entries/${entry.id}/restore`, { method: "POST" });
        await loadEntries();
        renderGraph();
        toast("Note restored.");
      });
    })
  );
}

function closeGraphPopup() {
  graphPopupId = null;
  $("graph-popup").classList.add("hidden");
}

async function saveGraphPopup() {
  if (graphPopupId === null) return;
  const status = $("graph-popup-status");
  const tags = $("graph-popup-tags")
    .value.split(",")
    .map((t) => t.trim())
    .filter(Boolean);
  status.classList.remove("error");
  status.textContent = "Saving…";
  try {
    await apiJson(`/entries/${graphPopupId}`, {
      method: "PUT",
      body: JSON.stringify({ content: $("graph-popup-content").value, tags }),
    });
    status.textContent = "Saved.";
    await loadEntries().catch(() => {});
    renderGraph(); // content/tags may change what the map shows
    setTimeout(closeGraphPopup, 600);
  } catch (error) {
    status.textContent = error.message;
    status.classList.add("error");
  }
}

// --- grow the map: add a note as a new node ----------------------------------
// The graph stops being read-only here — you can extend your notebook from the
// map itself, and a note grown from an existing one is linked to it, so the
// new node appears already connected.

let graphNewLinkFrom = null; // note id the new one should link to, if any

function openGraphNewNote(event, linkFrom = null) {
  closeGraphPopup();
  graphNewLinkFrom = linkFrom;
  const popup = $("graph-new");
  $("graph-new-content").value = "";
  $("graph-new-tags").value = "";
  $("graph-new-status").textContent = "";
  $("graph-new-status").classList.remove("error");
  $("graph-new-title").textContent = linkFrom ? "＋ Connected note" : "＋ New note";
  $("graph-new-hint").textContent = linkFrom
    ? "This note will be linked to the one you grew it from."
    : "It joins the map as soon as you add it.";
  popup.classList.remove("hidden");

  const box = $("graph-box").getBoundingClientRect();
  const size = popup.getBoundingClientRect();
  // Centre it when there's no click position (toolbar button).
  const rawX = event ? event.clientX - box.left + 12 : (box.width - size.width) / 2;
  const rawY = event ? event.clientY - box.top + 12 : 60;
  popup.style.left = `${Math.min(Math.max(rawX, 8), Math.max(8, box.width - size.width - 8))}px`;
  popup.style.top = `${Math.min(Math.max(rawY, 8), Math.max(8, box.height - size.height - 8))}px`;
  $("graph-new-content").focus();
}

function closeGraphNewNote() {
  graphNewLinkFrom = null;
  $("graph-new").classList.add("hidden");
}

async function saveGraphNewNote() {
  const content = $("graph-new-content").value.trim();
  const status = $("graph-new-status");
  if (!content) {
    status.textContent = "Type something first.";
    status.classList.add("error");
    return;
  }
  const tags = $("graph-new-tags")
    .value.split(",")
    .map((t) => t.trim())
    .filter(Boolean);
  status.classList.remove("error");
  status.textContent = "Adding…";
  try {
    const created = await apiJson("/entries", {
      method: "POST",
      body: JSON.stringify({ content, tags }),
    });
    if (graphNewLinkFrom !== null) {
      await apiJson(`/entries/${graphNewLinkFrom}/links`, {
        method: "POST",
        body: JSON.stringify({ target_id: created.id }),
      }).catch(() => {}); // the note still exists even if linking fails
    }
    closeGraphNewNote();
    toast(graphNewLinkFrom !== null ? "Added and linked." : "Added to the map.");
    await loadEntries().catch(() => {});
    await renderGraph();
    // Land the eye on the note that was just created.
    graphHighlightIds = new Set([created.id]);
    applyGraphHighlight();
    setTimeout(() => {
      graphHighlightIds = null;
      applyGraphHighlight();
    }, 2500);
  } catch (error) {
    status.textContent = error.message;
    status.classList.add("error");
  }
}

// --- tabs (Wave A) ----------------------------------------------------------------

const TABS = ["dashboard", "notes", "chat", "graph", "documents", "reminders"];

function switchTab(name) {
  for (const tab of TABS) {
    $(`tab-${tab}`).classList.toggle("hidden", tab !== name);
  }
  for (const button of document.querySelectorAll("#tab-bar button")) {
    const active = button.dataset.tab === name;
    button.classList.toggle("active", active);
    // Real tab semantics (Wave L): one tab stop for the whole list
    // (roving tabindex), arrow keys move between tabs.
    button.setAttribute("aria-selected", String(active));
    button.tabIndex = active ? 0 : -1;
  }
  localStorage.setItem("activeTab", name); // reopen where you left off
  // A new tab starts at its own top, and the back-to-top button re-evaluates
  // (it stays off the graph).
  window.scrollTo({ top: 0, behavior: "auto" });
  scrollTopUpdate?.();
  // The generative-art animation only needs to run while it's on screen.
  if (name !== "dashboard") stopArt();
  if (name === "chat") {
    renderChatEmptyState(); // welcome placeholder when the thread is empty
    loadChatSuggestions();
    $("chat-input").focus();
  }
  if (name === "dashboard") renderDashboard();
  if (name === "graph") renderGraph();
  if (name === "documents") loadDocuments();
  if (name === "reminders") {
    refreshReminderDefaults();
    loadReminders();
  }
}

// --- collapsible Notes-tab sections -----------------------------------------------
// Each of these cards gets a fold/unfold chevron in its heading; the state
// is remembered per section (user request). Nothing structural changes —
// a `.collapsed` class hides everything after the header row via CSS.
const COLLAPSIBLE_SECTIONS = ["capture", "writing-room", "ask", "browse"];
// Sections that start folded. The writing room is a whole workspace; leaving
// it open by default would make the Notes tab heavier, which is the opposite
// of what it needs. It opens with one click and remembers that you did.
const COLLAPSED_BY_DEFAULT = new Set(["writing-room"]);

function initCollapsibleSections() {
  for (const id of COLLAPSIBLE_SECTIONS) {
    const card = $(id);
    if (!card || card.dataset.collapsibleReady) continue;
    const h2 = card.querySelector(":scope > .row h2, :scope > h2");
    if (!h2) continue;
    card.dataset.collapsibleReady = "1";
    h2.classList.add("collapsible-title");
    // A clickable heading has to be operable from the keyboard too.
    h2.setAttribute("role", "button");
    h2.setAttribute("tabindex", "0");

    const chevron = document.createElement("span");
    chevron.className = "collapse-chevron";
    chevron.setAttribute("aria-hidden", "true");
    h2.insertBefore(chevron, h2.firstChild);

    const key = `collapse:${id}`;
    const apply = (collapsed) => {
      card.classList.toggle("collapsed", collapsed);
      chevron.textContent = collapsed ? "▸" : "▾";
      h2.setAttribute("aria-expanded", String(!collapsed));
      h2.title = collapsed ? "Expand this section" : "Collapse this section";
    };
    const toggle = () => {
      const collapsed = !card.classList.contains("collapsed");
      localStorage.setItem(key, collapsed ? "1" : "0");
      apply(collapsed);
    };
    h2.addEventListener("click", toggle);
    h2.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        toggle();
      }
    });
    const stored = localStorage.getItem(key);
    apply(stored === null ? COLLAPSED_BY_DEFAULT.has(id) : stored === "1");
  }
}

// --- panels inside the Notes tab (bin / activity) ---------------------------------

const PANELS = ["bin-panel", "activity-panel", "tags-panel"];

function showPanel(id) {
  for (const panel of PANELS) {
    $(panel).classList.toggle("hidden", panel !== id);
  }
  // These open above the note list, so opening one from halfway down the page
  // used to leave you looking at the notes you'd scrolled to instead of the
  // panel you just asked for.
  if (id) scrollPageToTop();
}

// Honour "prefers reduced motion" — a long smooth scroll is exactly the kind
// of movement that setting exists to stop.
function scrollPageToTop() {
  const smooth = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  window.scrollTo({ top: 0, behavior: smooth ? "smooth" : "auto" });
}

// --- back-to-top button -----------------------------------------------------------
// Shown on every tab except the graph, where the page itself doesn't scroll
// and the button would just sit on top of the map.
const NO_SCROLL_TOP_TABS = new Set(["graph"]);
let scrollTopUpdate = null;

function initScrollTopButton() {
  const button = document.createElement("button");
  button.id = "scroll-top";
  button.className = "scroll-top";
  button.type = "button";
  button.textContent = "↑";
  button.title = "Back to top";
  button.setAttribute("aria-label", "Back to top");
  button.addEventListener("click", () => {
    scrollPageToTop();
    // Send focus somewhere sensible rather than leaving it on a button that
    // is about to hide itself.
    document.querySelector(".tab-page:not(.hidden)")?.focus();
  });
  document.body.appendChild(button);

  const update = () => {
    const tab = localStorage.getItem("activeTab") || "dashboard";
    const show = window.scrollY > 400 && !NO_SCROLL_TOP_TABS.has(tab);
    button.classList.toggle("visible", show);
  };
  window.addEventListener("scroll", update, { passive: true });
  window.addEventListener("resize", update, { passive: true });
  update();
  return update;
}

// --- settings modal (Wave A) ------------------------------------------------------

const SETTINGS_SECTIONS = ["models", "personas", "skills", "tools", "appearance", "preferences", "tasks", "data", "logs", "help", "about"];

// Where to send focus back when a dialog closes (Wave L).
let overlayReturnFocus = null;

// --- page scroll lock while any overlay is open ---------------------------------
// Every dialog in the app is a `.modal-overlay` toggled by the `hidden` class,
// and the page behind kept scrolling under them — you'd reach for the settings
// scrollbar and move the notebook instead (user-reported). Rather than pairing
// a lock/unlock onto each of the seven open/close sites (and every one added
// later), one observer watches the overlays and derives the lock from whatever
// is actually visible. Overlays created on the fly — the image lightbox — are
// picked up by the same observer watching <body> for added nodes.
// `.lightbox` is the same idea under a different class (it's built at runtime
// rather than living in index.html), so it locks the page too.
const OVERLAY_SELECTOR = ".modal-overlay, .lightbox";

function syncScrollLock() {
  const anyOpen = [...document.querySelectorAll(OVERLAY_SELECTOR)].some(
    (el) => !el.classList.contains("hidden") && el.isConnected
  );
  document.documentElement.classList.toggle("modal-open", anyOpen);
}

function watchOverlays() {
  let queued = false;
  // The app toggles classes constantly while streaming a chat answer, so this
  // observer sees a lot of traffic it doesn't care about. Ignore anything that
  // isn't an overlay, then coalesce the rest into one check per frame — the
  // lock must never become a cost on the hot path.
  const touchesOverlay = (record) => {
    const target = record.target;
    if (target instanceof Element && target.matches(OVERLAY_SELECTOR)) return true;
    // An added/removed node may BE an overlay (the lightbox) or contain one.
    const isOverlay = (node) =>
      node instanceof Element &&
      (node.matches(OVERLAY_SELECTOR) || node.querySelector(OVERLAY_SELECTOR) !== null);
    return [...record.addedNodes, ...record.removedNodes].some(isOverlay);
  };

  const observer = new MutationObserver((records) => {
    if (queued || !records.some(touchesOverlay)) return;
    queued = true;
    requestAnimationFrame(() => {
      queued = false;
      syncScrollLock();
    });
  });
  observer.observe(document.body, {
    subtree: true,
    childList: true, // lightbox-style overlays appended at runtime
    attributes: true,
    attributeFilter: ["class"], // the `hidden` toggle on existing dialogs
  });
  syncScrollLock();
}

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
  if (name === "skills") renderSkillSettings();
  if (name === "tools") renderToolSettings();
  if (name === "appearance") renderAppearance();
  if (name === "data") renderBackups();
  if (name === "tasks") refreshModelStatus(); // populate the tasks list now
}

async function openSettingsModal(section = "models") {
  overlayReturnFocus = document.activeElement;
  $("settings-modal").classList.remove("hidden");
  $("settings-close").focus();
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
  overlayReturnFocus?.focus?.();
  overlayReturnFocus = null;
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
  $("pref-display-name").value = prefsCache.display_name || "";
  $("pref-bin-days").value = prefsCache.recycle_bin_days;
  $("pref-style").value = prefsCache.communication_style;
  $("pref-profile").value = prefsCache.user_profile;
  $("pref-profile-enabled").checked = prefsCache.profile_enabled;
  $("pref-web-search").checked = Boolean(prefsCache.web_search_enabled);
  $("pref-searxng").value = prefsCache.searxng_url || "";
  refreshSearxngHost().catch(() => {});
  $("prefs-status").textContent = "";
}

async function savePrefs() {
  try {
    prefsCache = await apiJson("/preferences", {
      method: "PUT",
      body: JSON.stringify({
        display_name: $("pref-display-name").value.trim(),
        recycle_bin_days: Number($("pref-bin-days").value),
        communication_style: $("pref-style").value,
        user_profile: $("pref-profile").value,
        profile_enabled: $("pref-profile-enabled").checked,
        web_search_enabled: $("pref-web-search").checked,
        searxng_url: $("pref-searxng").value.trim(),
      }),
    });
    $("prefs-status").textContent = "Saved.";
    // Reflect a name change immediately if the dashboard is showing.
    if (typeof renderDashboardGreeting === "function") renderDashboardGreeting();
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
  // Markdown arrives as a zip of .md files; the rest are single files.
  a.download = kind === "markdown" ? "memorymap-markdown.zip" : `memorymap-export.${kind}`;
  a.click();
  URL.revokeObjectURL(url);
}

// --- Wave F: backups UI -------------------------------------------------------------

async function renderBackups() {
  const list = $("backup-list");
  const backups = await apiJson("/backups").catch(() => []);
  list.replaceChildren();
  for (const item of backups) {
    const li = document.createElement("li");
    const row = document.createElement("div");
    row.className = "entry-meta";
    const name = document.createElement("span");
    name.textContent = item.name;
    const size = document.createElement("span");
    size.className = "muted";
    size.textContent = `${(item.size / 1024).toFixed(0)} KB`;
    const actions = document.createElement("span");
    actions.className = "entry-actions";
    actions.appendChild(
      smallButton("Restore", "Roll the notebook back to this backup", async () => {
        if (
          !confirm(
            "Restore this backup? Your current notebook is snapshotted first, " +
              "then replaced by the backup."
          )
        )
          return;
        try {
          await apiJson("/backups/restore", {
            method: "POST",
            body: JSON.stringify({ name: item.name }),
          });
          toast("Backup restored.");
          loadEntries().catch(() => {});
          renderBackups();
        } catch (error) {
          toast(error.message, true);
        }
      })
    );
    actions.appendChild(
      smallButton("×", "Delete this backup", async () => {
        if (!confirm("Delete this backup file?")) return;
        await apiJson(`/backups/${item.name}`, { method: "DELETE" }).catch(() => {});
        renderBackups();
      })
    );
    row.append(name, size, actions);
    li.appendChild(row);
    list.appendChild(li);
  }
}

async function backupNow() {
  const status = $("backup-status");
  try {
    const made = await apiJson("/backups", { method: "POST" });
    status.textContent = `Saved ${made.name}.`;
    renderBackups();
  } catch (error) {
    status.textContent = error.message;
  }
}

async function importMarkdown() {
  const input = $("import-md-files");
  const status = $("import-md-status");
  if (!input.files.length) {
    status.textContent = "Choose one or more .md files first.";
    return;
  }
  const form = new FormData();
  for (const file of input.files) form.append("files", file);
  try {
    const response = await fetch("/import/markdown", {
      method: "POST",
      headers: { "X-Auth-Token": authToken() }, // browser sets the multipart type
      body: form,
    });
    if (!response.ok) throw new Error(`Import failed (${response.status})`);
    const result = await response.json();
    status.textContent =
      `Imported ${result.imported} note${result.imported === 1 ? "" : "s"}.` +
      (result.skipped.length ? ` Skipped: ${result.skipped.join("; ")}` : "");
    input.value = "";
    loadEntries().catch(() => {});
  } catch (error) {
    status.textContent = error.message;
  }
}

// --- Wave F: command palette (Ctrl/Cmd-K) -------------------------------------------

let paletteIndex = 0;

// Static commands; note search results are appended live as you type.
function paletteCommands() {
  return [
    { label: "📋 Go to Dashboard", run: () => switchTab("dashboard") },
    { label: "📝 Go to Notes", run: () => switchTab("notes") },
    { label: "💬 Go to Chat", run: () => switchTab("chat") },
    { label: "🕸 Go to Graph", run: () => switchTab("graph") },
    { label: "📄 Go to Documents", run: () => switchTab("documents") },
    { label: "⏰ Go to Reminders", run: () => switchTab("reminders") },
    {
      label: "✏️ New note",
      run: () => {
        switchTab("notes");
        $("entry-content").focus();
      },
    },
    {
      label: "📄 New document",
      run: () => {
        switchTab("documents");
        createDocument();
      },
    },
    {
      label: "✨ Write a note from rough thoughts",
      run: () => {
        switchTab("notes");
        // The writing room starts folded, so open it before jumping there.
        const card = $("writing-room");
        if (card?.classList.contains("collapsed")) {
          card.querySelector(".collapsible-title")?.click();
        }
        $("draft-thoughts")?.focus();
      },
    },
    { label: "🆕 New chat", run: () => { switchTab("chat"); newChatConversation(); } },
    { label: "🎨 New sketch", run: openSketch },
    // Filters as commands: the fastest route to "the notes I mean" without
    // remembering the operator syntax.
    ...[
      ["📌 Show pinned notes", "is:pinned"],
      ["🏷 Show untagged notes", "is:untagged"],
      ["🔒 Show private notes", "is:private"],
      ["🔗 Show linked notes", "is:linked"],
    ].map(([label, query]) => ({
      label,
      run: () => {
        switchTab("notes");
        $("note-search").value = query;
        $("note-search").dispatchEvent(new Event("input"));
        $("note-search").focus();
      },
    })),
    {
      label: "🔎 What can I type in the filter?",
      run: () => {
        switchTab("notes");
        $("search-help-hint").classList.remove("hidden");
        $("search-help").setAttribute("aria-expanded", "true");
        $("note-search").focus();
      },
    },
    { label: "⚙️ Settings → Models", run: () => openSettingsModal("models") },
    { label: "🎭 Settings → Personas", run: () => openSettingsModal("personas") },
    { label: "⚡ Settings → Skills", run: () => openSettingsModal("skills") },
    { label: "🧰 Settings → Tools it can use", run: () => openSettingsModal("tools") },
    { label: "🎨 Settings → Appearance", run: () => openSettingsModal("appearance") },
    { label: "🎛 Settings → Preferences", run: () => openSettingsModal("preferences") },
    { label: "💾 Settings → Data & backups", run: () => openSettingsModal("data") },
    { label: "🪵 Settings → Logs", run: () => openSettingsModal("logs") },
    { label: "🗄 Back up now", run: () => { openSettingsModal("data"); backupNow(); } },
    { label: "📤 Export markdown", run: () => downloadExport("markdown") },
    { label: "🌓 Toggle light/dark", run: toggleTheme },
    { label: "⌨️ Keyboard shortcuts", run: () => { closePalette(); openShortcuts(); } },
    { label: "🔒 Lock MemoryMap", run: lockNow },
  ];
}

function openPalette() {
  overlayReturnFocus = document.activeElement;
  $("palette-overlay").classList.remove("hidden");
  $("palette-input").value = "";
  paletteIndex = 0;
  renderPalette("");
  $("palette-input").focus();
}

function closePalette() {
  $("palette-overlay").classList.add("hidden");
  overlayReturnFocus?.focus?.();
  overlayReturnFocus = null;
}

function paletteMatches(query) {
  const lowered = query.trim().toLowerCase();
  const commands = paletteCommands().filter((c) =>
    c.label.toLowerCase().includes(lowered)
  );
  // With a query, matching notes join the list (jump straight to one).
  const notes = lowered
    ? allEntries
        .filter((e) => e.content.toLowerCase().includes(lowered))
        .slice(0, 6)
        .map((e) => ({
          label: `📄 ${e.content.slice(0, 60)}${e.content.length > 60 ? "…" : ""}`,
          run: () => flashEntry(e.id),
        }))
    : [];
  return [...commands, ...notes];
}

function renderPalette(query) {
  const list = $("palette-list");
  const matches = paletteMatches(query);
  paletteIndex = Math.min(paletteIndex, Math.max(0, matches.length - 1));
  list.replaceChildren();
  matches.forEach((match, index) => {
    const li = document.createElement("li");
    li.textContent = match.label;
    if (index === paletteIndex) li.classList.add("active");
    li.addEventListener("click", () => {
      closePalette();
      match.run();
    });
    list.appendChild(li);
  });
  if (!matches.length) {
    const li = document.createElement("li");
    li.className = "muted";
    li.textContent = "No matching command or note.";
    list.appendChild(li);
  }
}

function paletteKeydown(event) {
  const matches = paletteMatches($("palette-input").value);
  if (event.key === "Escape") closePalette();
  else if (event.key === "ArrowDown") {
    event.preventDefault();
    paletteIndex = Math.min(paletteIndex + 1, matches.length - 1);
    renderPalette($("palette-input").value);
  } else if (event.key === "ArrowUp") {
    event.preventDefault();
    paletteIndex = Math.max(paletteIndex - 1, 0);
    renderPalette($("palette-input").value);
  } else if (event.key === "Enter" && matches[paletteIndex]) {
    closePalette();
    matches[paletteIndex].run();
  }
}

// --- Wave F: whiteboard-lite --------------------------------------------------------

let sketchPen = { color: "#4f6df5", size: 4, eraser: false };
let sketchDrawing = false;
let sketchDirty = false;

function sketchContext() {
  return $("sketch-canvas").getContext("2d");
}

function openSketch() {
  overlayReturnFocus = document.activeElement;
  $("sketch-overlay").classList.remove("hidden");
  $("sketch-close").focus();
  const canvas = $("sketch-canvas");
  const context = canvas.getContext("2d");
  context.fillStyle = "#ffffff"; // a white page in both themes
  context.fillRect(0, 0, canvas.width, canvas.height);
  sketchDirty = false;
  $("sketch-status").textContent = "";
}

function closeSketch() {
  if (sketchDirty && !confirm("Close without saving your sketch?")) return;
  $("sketch-overlay").classList.add("hidden");
  overlayReturnFocus?.focus?.();
  overlayReturnFocus = null;
}

function sketchPointer(event) {
  const canvas = $("sketch-canvas");
  const rect = canvas.getBoundingClientRect();
  return {
    x: ((event.clientX - rect.left) / rect.width) * canvas.width,
    y: ((event.clientY - rect.top) / rect.height) * canvas.height,
  };
}

function sketchStart(event) {
  sketchDrawing = true;
  sketchDirty = true;
  const { x, y } = sketchPointer(event);
  const context = sketchContext();
  context.beginPath();
  context.moveTo(x, y);
  event.target.setPointerCapture(event.pointerId);
}

function sketchMove(event) {
  if (!sketchDrawing) return;
  const { x, y } = sketchPointer(event);
  const context = sketchContext();
  context.lineCap = "round";
  context.lineJoin = "round";
  context.strokeStyle = sketchPen.eraser ? "#ffffff" : sketchPen.color;
  context.lineWidth = sketchPen.eraser ? sketchPen.size * 4 : sketchPen.size;
  context.lineTo(x, y);
  context.stroke();
}

function sketchEnd() {
  sketchDrawing = false;
}

async function saveSketch() {
  const status = $("sketch-status");
  status.textContent = "Saving…";
  const caption =
    $("sketch-caption").value.trim() ||
    `Sketch — ${new Date().toLocaleDateString()}`;
  try {
    // The sketch is a note (searchable caption) + a PNG attachment.
    const entry = await apiJson("/entries", {
      method: "POST",
      body: JSON.stringify({ content: caption, category: "Sketches" }),
    });
    const blob = await new Promise((resolve) =>
      $("sketch-canvas").toBlob(resolve, "image/png")
    );
    const form = new FormData();
    form.append("file", blob, "sketch.png");
    const response = await fetch(`/entries/${entry.id}/files`, {
      method: "POST",
      headers: { "X-Auth-Token": authToken() },
      body: form,
    });
    if (!response.ok) throw new Error(`Upload failed (${response.status})`);
    sketchDirty = false;
    $("sketch-overlay").classList.add("hidden");
    $("sketch-caption").value = "";
    toast("Sketch saved to your notebook.");
    loadEntries().catch(() => {});
  } catch (error) {
    status.textContent = error.message;
  }
}

// --- Wave H: voice capture (local Whisper) ------------------------------------------

let voiceStatus = null; // cached /voice/status
let recorder = null; // the active MediaRecorder, if any
let recorderTarget = null; // which input gets the transcript

async function toggleDictation(button, targetInput) {
  if (recorder) {
    recorder.stop(); // second press = stop → transcribe
    return;
  }
  if (voiceStatus === null) {
    voiceStatus = await apiJson("/voice/status").catch(() => ({ available: false }));
  }
  if (!voiceStatus.available) {
    toast(voiceStatus.hint || "Voice capture isn't available.", true);
    return;
  }
  let stream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  } catch {
    toast("Microphone access was blocked — allow it in your browser.", true);
    return;
  }
  const chunks = [];
  recorder = new MediaRecorder(stream);
  recorderTarget = targetInput;
  recorder.addEventListener("dataavailable", (e) => chunks.push(e.data));
  recorder.addEventListener("stop", async () => {
    stream.getTracks().forEach((t) => t.stop());
    button.classList.remove("recording");
    button.textContent = "🎙";
    recorder = null;
    const blob = new Blob(chunks, { type: chunks[0]?.type || "audio/webm" });
    const form = new FormData();
    form.append("file", blob, "clip.webm");
    toast("Transcribing…");
    try {
      const response = await fetch("/voice/transcribe", {
        method: "POST",
        headers: { "X-Auth-Token": authToken() },
        body: form,
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.detail || "Transcription failed");
      const box = recorderTarget;
      box.value = box.value ? `${box.value.trimEnd()} ${body.text}` : body.text;
      box.focus();
    } catch (error) {
      toast(error.message, true);
    }
  });
  recorder.start();
  button.classList.add("recording");
  button.textContent = "⏹";
}

// --- Wave H: read-aloud (the browser's local voices) --------------------------------

function speakText(text) {
  if (!("speechSynthesis" in window)) {
    toast("This browser has no text-to-speech voices.", true);
    return;
  }
  if (speechSynthesis.speaking) {
    speechSynthesis.cancel(); // acting as a stop button
    return;
  }
  if (text.trim()) speechSynthesis.speak(new SpeechSynthesisUtterance(text));
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

// A toast with one action button — used for Undo (Wave J). The button
// stays until clicked or the toast times out (a bit longer than usual,
// since the user has to react to it).
function toastAction(message, actionLabel, onAction) {
  const box = $("toast-box");
  const note = document.createElement("div");
  note.className = "toast";
  const text = document.createElement("span");
  text.textContent = message;
  const button = document.createElement("button");
  button.className = "small toast-action";
  button.textContent = actionLabel;
  button.addEventListener("click", async () => {
    note.remove();
    await onAction();
  });
  note.append(text, button);
  box.appendChild(note);
  setTimeout(() => note.remove(), 8000);
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
    const again = chip(question.length > 48 ? question.slice(0, 47) + "…" : question, "", () => {
      $("question").value = question;
      askQuestion();
    });
    again.title = question;
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
    // silent: a poll must never trigger the lock screen (Wave O fix).
    modelStatus = await apiJson("/models/status", { silent: true });
  } catch {
    modelStatus = null; // locked or unreachable — pill shows the worst case
  }
  renderAiPill();
  syncAiOnlyControls();
  if (settingsOpen()) renderSettings();

  clearTimeout(statusTimer);
  // Back right off when the tab is hidden — no point polling a page nobody's
  // looking at (visibilitychange below refreshes the moment it's shown again).
  const delay = jobsRunning()
    ? 1000
    : document.hidden
      ? 120000
      : settingsOpen()
        ? 3000
        : 20000;
  statusTimer = setTimeout(refreshModelStatus, delay);
}

// Refresh immediately when the user returns to the tab, so a status that went
// stale while hidden snaps up to date instead of waiting out the long delay.
document.addEventListener("visibilitychange", () => {
  if (!document.hidden) refreshModelStatus();
});

// Controls that can only do their job with a chat model running. Left
// enabled, they look available and only fail once you've committed to them —
// you type a note, press ✨ Improve, wait, and get an apology. Disabling them
// with a reason attached says the same thing before you spend the effort.
//
// Deliberately NOT in here: Save, Ask, search, tags, categories, the graph,
// reminders, documents. Those work fully without any AI and must never look
// diminished by its absence — the notebook is the point, the AI is a helper.
const AI_ONLY_CONTROLS = [
  ["improve-btn", "Proofreading needs the local AI"],
  ["reminder-magic-add", "Reading a reminder from a sentence needs the local AI"],
  ["draft-compose", "Drafting needs the local AI"],
  ["doc-ai", "AI editing needs the local AI"],
];

function syncAiOnlyControls() {
  // Unknown status (locked, still loading) is treated as available: better to
  // let a click fail than to grey out a working button on a slow start.
  const off = modelStatus ? modelStatus.ollama_running === false : false;
  for (const [id, reason] of AI_ONLY_CONTROLS) {
    const button = $(id);
    if (!button) continue;
    button.disabled = off;
    button.classList.toggle("ai-unavailable", off);
    if (off) {
      if (!button.dataset.enabledTitle) button.dataset.enabledTitle = button.title || "";
      button.title = `${reason} — start Ollama to use this.`;
    } else if (button.dataset.enabledTitle !== undefined) {
      button.title = button.dataset.enabledTitle;
    }
  }
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
    //
    // These messages lead with what still WORKS, not with what's broken. The
    // old wording ("search AI unavailable — see Settings → Logs") announced a
    // fault and sent you to a log viewer, which reads as "the app is broken"
    // when in fact everything except meaning-based search is fine.
    pill.classList.add("busy");
    pill.textContent = "word search on · AI search unavailable";
    pill.title = `${modelStatus.embedding_error}\n\nSearching by word still works, and notes, tags, reminders and the graph are unaffected. Settings → Logs has the details.`;
  } else if (chatReady && searchReady) {
    pill.classList.add("ok");
    pill.textContent = "AI ready";
  } else if (!chatReady && searchReady) {
    pill.classList.add("busy");
    pill.textContent = "everything works · chat AI off";
    pill.title = "Notes, search, tags, reminders and the graph all work. Start Ollama to add chat and auto-filing.";
  } else if (chatReady && !searchReady) {
    pill.classList.add("busy");
    pill.textContent = "word search on · AI search warming";
    pill.title = "Searching by word works now; searching by meaning becomes available once the embedding model has loaded.";
  } else {
    pill.textContent = "everything works · AI off";
    pill.title = "Writing, searching, tagging, reminders, documents and the graph all work without any AI. Start Ollama to add chat, auto-filing and search by meaning.";
  }
}

// One plain-English line: which search engine is active and whether it works.
// The built-in engine runs without Ollama, so this shows in every state.
function renderSearchEngineHealth(status) {
  const el = $("search-engine-health");
  const engine =
    status.embedding_backend === "ollama"
      ? `Ollama · ${status.embedding_model}`
      : "Built-in (all-MiniLM)";
  let state = "not ready";
  let cls = "busy";
  if (status.embedding_ready) {
    state = "✓ ready";
    cls = "ok";
  } else if (status.embedding_warming) {
    state = "… warming up";
  } else if (status.embedding_error) {
    state = "⚠ unavailable — using keyword search (details below)";
    cls = "error";
  }
  el.textContent = `Search engine: ${engine} — ${state}`;
  el.className = `status ${cls}`;
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
      "falling back to keywords. Quick fix: switch the search engine below to " +
      "an Ollama embedding model (download nomic-embed-text from the list) — " +
      "it runs fully offline. Full details in Settings → Logs.";
  }
  renderSearchEngineHealth(status);
  $("ollama-help").classList.toggle("hidden", status.ollama_running);
  $("models-config").classList.toggle("hidden", !status.ollama_running);
  $("suggested-box").classList.toggle("hidden", !status.ollama_running);

  // The search engine is always adjustable: its recommended option is the
  // built-in one, which needs no Ollama. Only the Ollama half of it depends
  // on Ollama being up.
  renderEmbeddingPicker(status);
  if (status.ollama_running) {
    renderChatModelPicker(status);
    renderUtilityModelPicker(status);
    renderInstalledModels(status);
    renderSuggested(status);
  } else {
    $("installed-box").classList.add("hidden");
  }
  renderReindex(status);
  if (settingsModalOpen()) renderTasks(status); // Wave N tasks manager
}

// --- Wave N: tasks manager (see and quit background jobs) ---------------------------

function renderTasks(status) {
  const list = $("task-list");
  const jobs = [];
  if (status.reindex && status.reindex.status === "running") {
    jobs.push({
      kind: "reindex",
      label: `Re-indexing notes — ${status.reindex.done} of ${status.reindex.total}`,
    });
  }
  for (const [name, job] of Object.entries(status.pulls || {})) {
    if (job.status === "running") {
      const pct = job.total ? Math.round((job.done / job.total) * 100) : 0;
      jobs.push({ kind: "pull", name, label: `Downloading ${name} — ${pct}%` });
    }
  }
  list.replaceChildren();
  $("tasks-empty").classList.toggle("hidden", jobs.length > 0);
  for (const job of jobs) {
    const li = document.createElement("li");
    const row = document.createElement("div");
    row.className = "entry-meta";
    const label = document.createElement("span");
    label.textContent = job.label;
    const actions = document.createElement("span");
    actions.className = "entry-actions";
    actions.appendChild(
      smallButton("Quit", "Stop this job", async () => {
        const q = new URLSearchParams({ kind: job.kind, name: job.name || "" });
        await api(`/models/jobs/cancel?${q}`, { method: "POST" }).catch((e) =>
          toast(e.message, true)
        );
        toast("Asked the job to stop.");
        refreshModelStatus();
      })
    );
    row.append(label, actions);
    li.appendChild(row);
    list.appendChild(li);
  }
}

// Model pickers (rewritten, Wave O). The old version let the status poll
// (every ~3s while Settings is open) reset the dropdown to the SAVED
// model, so a selection would "switch back after a few seconds".
//
// New rule, dead simple: the option list is (re)built ONLY when the SET
// of installed model names actually changes (order-independent — Ollama
// doesn't return a stable order). The selected value is set once, when
// the list is first built; after that a poll never touches `.value`, so
// your choice stays put until you Apply (which re-syncs to the new saved
// value). No timing-sensitive "userChosen" flag to get wrong.
function _namesSignature(names) {
  return [...names].sort().join("|");
}

function fillModelSelect(select, names, extraFirst, savedValue) {
  const wanted = extraFirst ? [extraFirst.value, ...names] : names;
  const signature = _namesSignature(wanted);
  if (select.dataset.sig === signature) return; // same options → leave it alone
  select.dataset.sig = signature;
  const previous = select.value; // preserve a live selection across a rebuild
  select.replaceChildren();
  if (extraFirst) {
    const option = document.createElement("option");
    option.value = extraFirst.value;
    option.textContent = extraFirst.label;
    select.appendChild(option);
  }
  for (const name of names) {
    const option = document.createElement("option");
    option.value = name;
    option.textContent = name;
    select.appendChild(option);
  }
  // Prefer the value already showing; else the saved preference.
  const values = [...select.options].map((o) => o.value);
  const match =
    (previous && values.includes(previous) && previous) ||
    values.find((v) => v === savedValue) ||
    values.find((v) => v.split(":")[0] === savedValue);
  if (match !== undefined) select.value = match;
}

function renderChatModelPicker(status) {
  const names = status.installed_models.map((m) => m.name);
  fillModelSelect($("chat-model-select"), names, null, status.chat_model);
  $("chat-model-note").textContent =
    status.chat_model_installed === false
      ? `Active model “${status.chat_model}” is not installed any more — pick another or download it below.`
      : `Active: ${status.chat_model}`;
}

function renderUtilityModelPicker(status) {
  const names = status.installed_models.map((m) => m.name);
  fillModelSelect(
    $("utility-model-select"),
    names,
    { value: "", label: "Same as chat model" },
    status.utility_model || ""
  );
}

function renderEmbeddingPicker(status) {
  // The backend radios only reflect the saved value when the user isn't
  // mid-change (they have no rebuild, so a simple focus check is enough).
  const touching = document.activeElement?.name === "emb-backend";
  if (!touching) {
    for (const radio of document.querySelectorAll('input[name="emb-backend"]')) {
      radio.checked = radio.value === status.embedding_backend;
    }
  }
  const names = (status.installed_models || []).map((m) => m.name);
  fillModelSelect(
    $("embedding-model-select"),
    names,
    null,
    status.embedding_model
  );
  // With Ollama down there are no embedding models to pick from, so that half
  // of the choice is disabled and says why — rather than the whole section
  // disappearing, which is what used to happen.
  const offline = !status.ollama_running;
  $("embedding-model-select").disabled = offline;
  $("embedding-apply").disabled = offline;
  document.querySelector('input[name="emb-backend"][value="ollama"]').disabled = offline;
  $("embedding-ollama-note").classList.toggle("hidden", offline);
  $("embedding-offline-note").classList.toggle("hidden", !offline);
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

function renderInstalledModels(status) {
  const box = $("installed-box");
  const list = $("installed-list");
  const models = status.installed_models || [];
  box.classList.toggle("hidden", models.length === 0);
  list.replaceChildren();

  // Models the app is actively pointing at can't be removed (would break it).
  const inUse = new Set([status.chat_model]);
  if (status.utility_model) inUse.add(status.utility_model);
  if (status.embedding_backend === "ollama") inUse.add(status.embedding_model);
  const usedBases = new Set([...inUse].map((n) => (n || "").split(":")[0]));

  for (const model of models) {
    const li = document.createElement("li");
    const name = document.createElement("span");
    name.className = "model-name";
    name.textContent = model.name;
    const info = document.createElement("span");
    info.className = "model-info";
    info.textContent = model.size ? `${(model.size / 1e9).toFixed(1)} GB` : "";
    li.append(name, info);

    const used = inUse.has(model.name) || usedBases.has(model.name.split(":")[0]);
    if (used) {
      li.appendChild(chip("in use", "tag"));
    } else {
      li.appendChild(
        smallButton("Remove", `Uninstall ${model.name}`, async (event) => {
          if (
            !confirm(
              `Remove “${model.name}” from Ollama? This frees its disk space — ` +
                "you can re-download it any time."
            )
          )
            return;
          event.target.disabled = true;
          try {
            await api("/models/delete", {
              method: "POST",
              body: JSON.stringify({ name: model.name }),
            });
            toast(`Removed ${model.name}.`);
            refreshModelStatus();
          } catch (error) {
            toast(error.message, true);
            event.target.disabled = false;
          }
        })
      );
    }
    list.appendChild(li);
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
    delete select.dataset.userChosen; // applied — polling may reflect it now
    note.textContent = `Active: ${select.value} — switched instantly, no re-index needed.`;
    refreshModelStatus();
  } catch (error) {
    note.textContent = error.message;
  }
}

async function applyUtilityModel() {
  const select = $("utility-model-select");
  try {
    await api("/models/utility-model", {
      method: "POST",
      body: JSON.stringify({ name: select.value }),
    });
    delete select.dataset.userChosen;
    toast(
      select.value
        ? `Background jobs now use ${select.value}.`
        : "Background jobs now use the chat model."
    );
    refreshModelStatus();
  } catch (error) {
    toast(error.message, true);
  }
}

// --- Wave N: AI improve-writing (before/after, user approves) -----------------------

let improveMode = "proofread";
let improveTarget = null; // the textarea to write the accepted result into

function openImprove(targetTextarea) {
  const text = targetTextarea.value.trim();
  if (!text) {
    toast("Write something first, then improve it.", true);
    return;
  }
  improveTarget = targetTextarea;
  improveMode = "proofread";
  for (const b of document.querySelectorAll(".improve-mode"))
    b.classList.toggle("active", b.dataset.mode === "proofread");
  $("improve-original").textContent = text;
  overlayReturnFocus = document.activeElement;
  $("improve-overlay").classList.remove("hidden");
  $("improve-close").focus();
  runImprove();
}

function closeImprove() {
  $("improve-overlay").classList.add("hidden");
  overlayReturnFocus?.focus?.();
  overlayReturnFocus = null;
}

async function runImprove() {
  const status = $("improve-status");
  const result = $("improve-result");
  result.textContent = "";
  status.textContent = "The AI is editing…";
  $("improve-apply").disabled = true;
  try {
    const body = await apiJson("/entries/improve", {
      method: "POST",
      body: JSON.stringify({
        text: $("improve-original").textContent,
        mode: improveMode,
      }),
    });
    result.textContent = body.improved;
    status.textContent = "";
    $("improve-apply").disabled = false;
  } catch (error) {
    status.textContent = error.message;
    status.classList.add("error");
  }
}

function applyImprove() {
  if (improveTarget) {
    improveTarget.value = $("improve-result").textContent;
    improveTarget.dispatchEvent(new Event("input")); // refresh char count
  }
  closeImprove();
  toast("Applied the AI's suggestion.");
}

// --- Wave N: AI link suggestions (auto-linker, approve each) -------------------------

async function loadLinkSuggestions() {
  const box = $("link-suggestions");
  box.classList.remove("hidden");
  box.textContent = "Looking for notes worth connecting…";
  const suggestions = await apiJson("/entries/link-suggestions").catch(() => []);
  box.replaceChildren();
  if (!suggestions.length) {
    box.textContent =
      "No new links to suggest — either everything related is already linked, or semantic search is off.";
    return;
  }
  const heading = document.createElement("p");
  heading.className = "muted";
  heading.textContent = "Notes that look related — link the ones you agree with:";
  box.appendChild(heading);
  for (const s of suggestions) {
    const row = document.createElement("div");
    row.className = "link-suggestion";
    const text = document.createElement("span");
    text.innerHTML = "";
    text.append(
      document.createTextNode(`“${s.source_preview}” ↔ “${s.target_preview}” `)
    );
    const score = chip(`${Math.round(s.similarity * 100)}%`, "confidence");
    const link = smallButton("🔗 Link", "Connect these two notes", async () => {
      await apiJson(`/entries/${s.source_id}/links`, {
        method: "POST",
        body: JSON.stringify({ target_id: s.target_id }),
      }).catch((e) => toast(e.message, true));
      row.remove();
      toast("Linked.");
      loadEntries().catch(() => {});
    });
    const dismiss = smallButton("✕", "Dismiss this suggestion", () => row.remove());
    row.append(text, score, link, dismiss);
    box.appendChild(row);
  }
}

// Heuristic: does this Ollama model look like it can produce embeddings?
// Chat/generation models can't — Ollama answers /api/embed with 501 — and
// picking one by mistake is the #1 way people break the search engine.
function looksLikeEmbeddingModel(name) {
  return /embed|minilm|bge|gte|e5|arctic/i.test(name || "");
}

async function applyEmbeddingBackend() {
  const backend = document.querySelector('input[name="emb-backend"]:checked')?.value;
  const model = $("embedding-model-select").value || null;
  if (!backend) return;
  // Guard the #1 misconfiguration: a chat model chosen as the search engine.
  if (backend === "ollama") {
    if (!model) {
      toast("Pick an embedding model first — e.g. nomic-embed-text.", true);
      return;
    }
    if (!looksLikeEmbeddingModel(model)) {
      const proceed = confirm(
        `"${model}" doesn't look like an embedding model. Chat models can't create ` +
          "embeddings, so semantic search will fail (Ollama returns 501). Download and " +
          "pick a dedicated embedding model like nomic-embed-text instead.\n\nApply anyway?"
      );
      if (!proceed) return;
    }
  }
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
    delete $("embedding-model-select").dataset.userChosen; // applied
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
  if (bgArtOn()) startBgArt(); // recolour the background for the new theme
}

// --- Wave J: accent themes + generative background --------------------------------

// Simple accent presets. The colours themselves live in the CSS
// (:root[data-accent="…"]); this list just drives the swatch picker and
// gives the background art a hue to paint with.
const ACCENTS = [
  { name: "indigo", label: "Indigo", swatch: "#4f6df5" },
  { name: "emerald", label: "Emerald", swatch: "#0e9f6e" },
  { name: "rose", label: "Rose", swatch: "#ec4899" },
  { name: "amber", label: "Amber", swatch: "#d97706" },
  { name: "violet", label: "Violet", swatch: "#7c3aed" },
  { name: "teal", label: "Teal", swatch: "#0d9488" },
  { name: "sky", label: "Sky", swatch: "#0ea5e9" },
  { name: "lime", label: "Lime", swatch: "#65a30d" },
  { name: "crimson", label: "Crimson", swatch: "#dc2626" },
  { name: "fuchsia", label: "Fuchsia", swatch: "#c026d3" },
  { name: "slate", label: "Slate", swatch: "#475569" },
  { name: "sunset", label: "Sunset", swatch: "#f97316" },
  { name: "ocean", label: "Ocean", swatch: "#2563eb" },
  { name: "mint", label: "Mint", swatch: "#10b981" },
  { name: "grape", label: "Grape", swatch: "#9333ea" },
];

function activeAccent() {
  // Goes through appearancePref so a theme's accent applies until you pick
  // one yourself, at which point yours wins.
  return appearancePref("accent");
}

function applyAccent(name, remember = true) {
  if (name === "indigo") delete document.documentElement.dataset.accent;
  else document.documentElement.dataset.accent = name;
  // applyThemePreset re-applies the theme's accent without recording it as a
  // manual choice — otherwise merely picking a theme would pin its colour as
  // an override and the next theme couldn't change it.
  if (remember) localStorage.setItem("accent", name);
  if (bgArtOn()) startBgArt(); // repaint the background in the new accent
  renderBrandLogo(); // recolour the emblem too
}

function contrastOn() {
  return localStorage.getItem("contrast") === "on";
}

function applyContrast(on) {
  if (on) document.documentElement.dataset.contrast = "on";
  else delete document.documentElement.dataset.contrast;
  localStorage.setItem("contrast", on ? "on" : "off");
}

// --- Wave O: expanded appearance controls -------------------------------------------
// Each preference is a data-attribute on <html> + a localStorage key, all
// applied before first paint by applyAppearance() so there's no flash.
const APPEARANCE_DEFAULTS = {
  fontsize: "normal",
  font: "system", // system | serif | mono
  density: "comfortable", // comfortable | compact | spacious
  glass: "on",
  motion: "auto", // "auto" = follow the OS; "reduced" = force-still
  "bg-intensity": "90",
  radius: "14", // global corner rounding, px
  "glass-blur": "18", // frosted-glass blur strength, px
  "bg-style": "aurora", // aurora | constellation | waves | bubbles | mesh
  // Missing entirely until now, so appearancePref("bg-motion") returned
  // undefined and renderAppearance set the Movement <select> to it — which
  // matches no <option>, leaving the control blank on every fresh profile.
  "bg-motion": "moving", // moving | still
};

// --- curated visual themes ---------------------------------------------------------
// A theme is just a bundle of the same settings the individual controls write,
// so nothing here is a separate system that could drift from them. It sits as a
// LAYER between the app defaults and your own choices:
//
//     your manual change  →  the selected theme  →  the app default
//
// which is what makes "apply manual colour changes over a selected theme" work
// (user request). Picking a theme never erases a manual setting, and clearing a
// manual setting falls back to the theme rather than to the app default.
const THEME_PRESETS = {
  midnight: {
    label: "Midnight",
    swatch: ["#0d1117", "#4f6df5"],
    values: { theme: "dark", accent: "indigo", glass: "on", "glass-blur": "18", radius: "14" },
  },
  paper: {
    label: "Paper",
    swatch: ["#faf9f6", "#475569"],
    values: {
      theme: "light", accent: "slate", font: "serif", glass: "off",
      radius: "6", "page-bg": "#faf9f6",
    },
  },
  forest: {
    label: "Forest",
    swatch: ["#0f1a14", "#0e9f6e"],
    values: { theme: "dark", accent: "emerald", glass: "on", radius: "16" },
  },
  ember: {
    label: "Ember",
    swatch: ["#1a1210", "#f97316"],
    values: { theme: "dark", accent: "sunset", glass: "on", radius: "12" },
  },
  nord: {
    label: "Nord",
    swatch: ["#2e3440", "#0ea5e9"],
    values: { theme: "dark", accent: "sky", glass: "on", radius: "10", "page-bg": "#2e3440" },
  },
  quartz: {
    label: "Rose Quartz",
    swatch: ["#fdf2f8", "#ec4899"],
    values: { theme: "light", accent: "rose", glass: "on", radius: "18" },
  },
  terminal: {
    label: "Terminal",
    swatch: ["#0a0e0a", "#65a30d"],
    values: {
      theme: "dark", accent: "lime", font: "mono", glass: "off",
      radius: "2", density: "compact", "page-bg": "#0a0e0a",
    },
  },
  sepia: {
    label: "Sepia",
    swatch: ["#f4ecd8", "#d97706"],
    values: {
      theme: "light", accent: "amber", font: "serif", glass: "off",
      radius: "8", "page-bg": "#f4ecd8",
    },
  },
  abyss: {
    label: "Abyss",
    swatch: ["#0b1220", "#2563eb"],
    values: { theme: "dark", accent: "ocean", glass: "on", "glass-blur": "26", radius: "14" },
  },
  orchid: {
    label: "Orchid",
    swatch: ["#171021", "#9333ea"],
    values: { theme: "dark", accent: "grape", glass: "on", radius: "16" },
  },
  daylight: {
    label: "Daylight",
    swatch: ["#f5f7fb", "#0d9488"],
    values: { theme: "light", accent: "teal", glass: "on", radius: "14" },
  },
  graphite: {
    label: "Graphite",
    swatch: ["#18181b", "#71717a"],
    values: {
      theme: "dark", accent: "slate", glass: "off", radius: "4",
      density: "compact", "page-bg": "#18181b",
    },
  },
};

function activeThemePreset() {
  const name = localStorage.getItem("themePreset");
  return THEME_PRESETS[name] ? name : "";
}

// What the selected theme says about one setting, or undefined.
function themeValue(key) {
  const preset = THEME_PRESETS[activeThemePreset()];
  return preset ? preset.values[key] : undefined;
}

// The three layers, in order. `??` rather than `||` so a legitimate "0"
// (corner rounding) isn't treated as unset.
function appearancePref(key) {
  return localStorage.getItem(key) ?? themeValue(key) ?? APPEARANCE_DEFAULTS[key];
}

// Applying a theme only records WHICH theme. Because every read goes through
// appearancePref, that is enough to change everything the theme covers while
// leaving your manual choices sitting on top of it, untouched.
function applyThemePreset(name) {
  if (THEME_PRESETS[name]) localStorage.setItem("themePreset", name);
  else localStorage.removeItem("themePreset");
  applyAppearance();
  applyThemeChoice(appearancePref("theme"), false);
  applyAccent(appearancePref("accent"), false);
  renderBrandLogo();
  if (bgArtOn()) startBgArt();
}

// Which manual overrides are currently sitting on top of the theme. Shown in
// the UI so "why isn't the theme's colour showing?" has a visible answer.
const OVERRIDABLE_KEYS = [
  "theme", "accent", "accent-custom", "page-bg", "font", "fontsize", "density",
  "radius", "glass", "glass-blur", "bg-style", "bg-motion", "bg-intensity",
];

function manualOverrides() {
  return OVERRIDABLE_KEYS.filter((key) => localStorage.getItem(key) !== null);
}

// Drop the manual layer, keeping the chosen theme — the counterpart to
// "reset the theme" below.
function clearManualOverrides() {
  for (const key of manualOverrides()) localStorage.removeItem(key);
  applyCustomAccent(null);
  applyPageBackground(null);
  applyThemePreset(activeThemePreset());
  renderAppearance();
  toast("Your manual changes are cleared — the theme is showing on its own.");
}

// Drop the theme, keeping every manual change — so "reset the theme to
// default because I want my own colours instead" does exactly that, rather
// than wiping the colours too (user request).
function resetThemeOnly() {
  localStorage.removeItem("themePreset");
  applyThemePreset("");
  renderAppearance();
  toast("Theme reset to the app default. Your own changes are still applied.");
}

// "#rrggbb" -> "r, g, b" so a custom colour can drive rgba() softs.
function hexToRgbParts(hex) {
  const clean = String(hex || "").replace("#", "");
  if (clean.length !== 6) return null;
  const n = Number.parseInt(clean, 16);
  if (Number.isNaN(n)) return null;
  return `${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}`;
}

// A user-chosen accent overrides the preset palette via inline custom
// properties; clearing it falls back to the data-accent presets.
function applyCustomAccent(hex) {
  const root = document.documentElement;
  const parts = hex ? hexToRgbParts(hex) : null;
  if (!parts) {
    root.style.removeProperty("--accent");
    root.style.removeProperty("--accent-soft");
    root.style.removeProperty("--blob-a");
    return;
  }
  root.style.setProperty("--accent", hex);
  root.style.setProperty("--accent-soft", `rgba(${parts}, 0.14)`);
  root.style.setProperty("--blob-a", `rgba(${parts}, 0.30)`);
}

function applyPageBackground(hex) {
  const root = document.documentElement;
  if (hex) root.style.setProperty("--page", hex);
  else root.style.removeProperty("--page");
}

// User CSS lives in one <style> we own, so applying and clearing is clean.
function applyCustomCss(css) {
  let tag = document.getElementById("user-css");
  if (!tag) {
    tag = document.createElement("style");
    tag.id = "user-css";
    document.head.appendChild(tag);
  }
  tag.textContent = css || "";
}

// Applied once at startup (called from the pre-paint path) and on change.
function applyAppearance() {
  const root = document.documentElement;
  root.dataset.fontsize = appearancePref("fontsize");
  root.dataset.font = appearancePref("font");
  root.dataset.density = appearancePref("density");
  root.dataset.glass = appearancePref("glass");
  root.dataset.themePreset = activeThemePreset();
  root.dataset.motion = appearancePref("motion");
  root.style.setProperty("--bg-art-opacity", Number(appearancePref("bg-intensity")) / 100);
  // Cards thin out slightly while the art is on, so it reads through the page
  // rather than only in the margins.
  root.dataset.bgArt = bgArtOn() ? "on" : "off";
  root.style.setProperty("--radius", `${appearancePref("radius")}px`);
  root.style.setProperty("--glass-blur", `${appearancePref("glass-blur")}px`);
  applyCustomAccent(localStorage.getItem("accent-custom"));
  // A theme may set the page colour; your own pick overrides it.
  applyPageBackground(appearancePref("page-bg"));
  applyCustomCss(localStorage.getItem("custom-css"));
}

function effectiveTheme() {
  // "system" is a real choice, so an explicit one is only overridden by a
  // manual pick; a theme supplies it when you haven't made one.
  return localStorage.getItem("theme") ?? themeValue("theme") ?? "system";
}

function applyThemeChoice(choice, remember = true) {
  if (choice === "system") {
    delete document.documentElement.dataset.theme;
    if (remember) localStorage.removeItem("theme");
  } else {
    document.documentElement.dataset.theme = choice;
    if (remember) localStorage.setItem("theme", choice);
  }
  if (bgArtOn()) startBgArt();
  renderBrandLogo();
}

function _segActive(groupId, attr, value) {
  for (const b of document.querySelectorAll(`#${groupId} button`)) {
    b.classList.toggle("active", b.dataset[attr] === value);
  }
}

function renderThemePresets() {
  const holder = $("theme-presets");
  if (!holder) return;
  holder.replaceChildren();
  const active = activeThemePreset();
  for (const [name, preset] of Object.entries(THEME_PRESETS)) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "theme-card" + (name === active ? " active" : "");
    button.title = `Apply the ${preset.label} theme`;
    button.setAttribute("aria-pressed", String(name === active));
    const swatch = document.createElement("span");
    swatch.className = "theme-swatch";
    // Two bands: the page colour and the accent it pairs with.
    swatch.style.background = `linear-gradient(135deg, ${preset.swatch[0]} 0 60%, ${preset.swatch[1]} 60% 100%)`;
    const caption = document.createElement("span");
    caption.textContent = preset.label;
    button.append(swatch, caption);
    button.addEventListener("click", () => {
      // Clicking the active theme turns it off, so the control is a toggle
      // rather than a one-way door.
      applyThemePreset(name === active ? "" : name);
      renderAppearance();
    });
    holder.appendChild(button);
  }

  // Say plainly which manual settings are covering the theme, so a theme that
  // "isn't working" has a visible cause and a one-click fix beside it.
  const overrides = manualOverrides();
  const note = $("theme-override-note");
  if (!active && !overrides.length) {
    note.textContent = "No theme selected — the app's default look.";
  } else if (!overrides.length) {
    note.textContent = `${THEME_PRESETS[active].label} is showing exactly as designed.`;
  } else {
    note.textContent =
      `${overrides.length} setting${overrides.length === 1 ? "" : "s"} you changed ` +
      `(${overrides.join(", ")}) ${overrides.length === 1 ? "is" : "are"} on top of ` +
      (active ? `the ${THEME_PRESETS[active].label} theme.` : "the default look.");
  }
  $("theme-clear-overrides").disabled = overrides.length === 0;
  $("theme-reset").disabled = !active;
}

function renderAppearance() {
  renderThemePresets();
  const holder = $("accent-swatches");
  holder.replaceChildren();
  for (const accent of ACCENTS) {
    const button = document.createElement("button");
    button.className = "accent-swatch";
    button.style.background = accent.swatch;
    button.title = accent.label;
    button.setAttribute("aria-label", `${accent.label} accent`);
    // A custom colour wins, so no preset shows as active while it's set.
    const customSet = Boolean(localStorage.getItem("accent-custom"));
    button.classList.toggle("active", !customSet && accent.name === activeAccent());
    button.addEventListener("click", () => {
      localStorage.removeItem("accent-custom"); // presets clear a custom colour
      applyCustomAccent(null);
      applyAccent(accent.name);
      renderAppearance();
    });
    holder.appendChild(button);
  }
  $("contrast-toggle").checked = contrastOn();
  $("reduce-motion-toggle").checked = appearancePref("motion") === "reduced";
  $("bg-art-toggle").checked = bgArtOn();
  $("bg-style-row").classList.toggle("hidden", !bgArtOn());
  $("bg-intensity-row").classList.toggle("hidden", !bgArtOn());
  $("bg-motion").value = appearancePref("bg-motion");
  $("bg-motion-row").classList.toggle("hidden", !bgArtOn());
  $("glass-toggle").checked = appearancePref("glass") === "on";
  $("bg-intensity").value = appearancePref("bg-intensity");
  $("bg-intensity-value").textContent = `${appearancePref("bg-intensity")}%`;
  $("bg-art-style").value = appearancePref("bg-style");
  $("radius-slider").value = appearancePref("radius");
  $("radius-value").textContent = `${appearancePref("radius")}px`;
  $("glass-blur").value = appearancePref("glass-blur");
  $("glass-blur-value").textContent = `${appearancePref("glass-blur")}px`;
  $("accent-custom").value = localStorage.getItem("accent-custom") || "#4f6df5";
  $("page-bg-custom").value = localStorage.getItem("page-bg") || "#f5f7fb";
  $("custom-css").value = localStorage.getItem("custom-css") || "";
  // Blur strength only matters while glass is on.
  $("glass-blur-row").classList.toggle("disabled-row", appearancePref("glass") !== "on");
  // Style/intensity only matter while the background art is on.
  const artOff = !bgArtOn();
  $("bg-style-row").classList.toggle("disabled-row", artOff);
  $("bg-intensity-row").classList.toggle("disabled-row", artOff);
  _segActive("theme-seg", "themeChoice", effectiveTheme());
  _segActive("fontsize-seg", "fontsize", appearancePref("fontsize"));
  _segActive("font-seg", "font", appearancePref("font"));
  _segActive("density-seg", "density", appearancePref("density"));
}

function resetAppearance() {
  for (const key of [
    "fontsize", "font", "density", "glass", "motion", "bg-intensity", "accent",
    "contrast", "bgArt", "theme", "radius", "glass-blur", "bg-style",
    "bg-motion", "accent-custom", "page-bg", "custom-css", "themePreset",
  ]) {
    localStorage.removeItem(key);
  }
  delete document.documentElement.dataset.accent;
  delete document.documentElement.dataset.contrast;
  delete document.documentElement.dataset.theme;
  applyCustomAccent(null);
  applyPageBackground(null);
  applyCustomCss("");
  stopBgArt();
  applyAppearance();
  renderBrandLogo();
  renderAppearance();
  toast("Appearance reset to defaults.");
}

// --- generative background (a second, ambient p5 instance) --------------------------

let bgArtInstance = null;

function bgArtOn() {
  return localStorage.getItem("bgArt") === "on";
}

function stopBgArt() {
  if (bgArtInstance) {
    bgArtInstance.remove();
    bgArtInstance = null;
  }
  const canvas = document.getElementById("bg-art-canvas");
  if (canvas) canvas.remove();
}

// Which generative background to paint. Persisted like the other
// appearance prefs (user asked for more variety of art).
const BG_ART_STYLES = ["aurora", "constellation", "waves", "bubbles", "mesh"];
// One source of truth for the chosen style. This used to read a "bgArtStyle"
// key that nothing writes any more (the picker saves "bg-style"), so the
// builder always fell back to aurora no matter what was selected.
function bgArtStyle() {
  const saved = appearancePref("bg-style");
  return BG_ART_STYLES.includes(saved) ? saved : "aurora";
}

// Each style is a small factory: given the p5 instance + shared context it
// returns { init, frame(t) }. startBgArt wires up the canvas, colour mode,
// trail wash, and reduced-motion handling once, around whichever it picks.
const BG_ART_BUILDERS = {
  // A flowing aurora: particles drift along a Perlin flow field, trailing.
  aurora(p, ctx) {
    let particles = [];
    let emblem = [];
    const drawEmblem = (t) => {
      const radius = Math.min(p.width, p.height) * 0.32;
      p.push();
      p.translate(p.width / 2, p.height / 2);
      p.rotate(t * 0.02);
      p.stroke(ctx.baseHue, 50, ctx.dark ? 72 : 42, 0.09);
      p.strokeWeight(1.5);
      for (let i = 0; i < emblem.length; i++) {
        for (let j = i + 1; j < emblem.length; j++) {
          if ((i + j) % 3 === 0) {
            p.line(
              Math.cos(emblem[i]) * radius, Math.sin(emblem[i]) * radius,
              Math.cos(emblem[j]) * radius, Math.sin(emblem[j]) * radius
            );
          }
        }
      }
      p.noStroke();
      for (const a of emblem) {
        p.fill(ctx.baseHue, 58, ctx.dark ? 74 : 40, 0.12);
        p.circle(Math.cos(a) * radius, Math.sin(a) * radius, 16);
      }
      p.pop();
    };
    return {
      init() {
        for (let i = 0; i < Math.max(3, Math.round(70 * ctx.density)); i++) {
          particles.push({
            x: p.random(p.width), y: p.random(p.height),
            speed: p.random(0.3, 1.1), size: p.random(1.5, 3.5),
            hue: (ctx.baseHue + p.random(-24, 24) + 360) % 360,
          });
        }
        emblem = Array.from({ length: 9 }, (_, i) => (i / 9) * Math.PI * 2);
      },
      frame(t) {
        drawEmblem(t);
        for (const dot of particles) {
          const angle = p.noise(dot.x * 0.0016, dot.y * 0.0016, t * 0.15) * Math.PI * 4;
          dot.x += Math.cos(angle) * dot.speed;
          dot.y += Math.sin(angle) * dot.speed;
          if (dot.x < 0) dot.x = p.width;
          if (dot.x > p.width) dot.x = 0;
          if (dot.y < 0) dot.y = p.height;
          if (dot.y > p.height) dot.y = 0;
          p.fill(dot.hue, 70, ctx.dark ? 70 : 52, 0.78);
          p.circle(dot.x, dot.y, dot.size);
        }
      },
    };
  },

  // Drifting stars joined by faint lines when they wander close — the same
  // motif as the dashboard "constellation", full-screen.
  constellation(p, ctx) {
    let stars = [];
    return {
      init() {
        const n = Math.min(140, Math.round((p.width * p.height) / 17000));
        for (let i = 0; i < n; i++) {
          stars.push({
            x: p.random(p.width), y: p.random(p.height),
            vx: p.random(-0.25, 0.25), vy: p.random(-0.25, 0.25),
            size: p.random(1.8, 4),
            hue: (ctx.baseHue + p.random(-30, 30) + 360) % 360,
          });
        }
      },
      frame() {
        for (const s of stars) {
          s.x = (s.x + s.vx + p.width) % p.width;
          s.y = (s.y + s.vy + p.height) % p.height;
        }
        for (let i = 0; i < stars.length; i++) {
          for (let j = i + 1; j < stars.length; j++) {
            const a = stars[i], b = stars[j];
            const d = p.dist(a.x, a.y, b.x, b.y);
            if (d < 130) {
              p.stroke(ctx.baseHue, 60, ctx.dark ? 72 : 48, p.map(d, 0, 130, 0.45, 0));
              p.strokeWeight(1);
              p.line(a.x, a.y, b.x, b.y);
            }
          }
        }
        p.noStroke();
        for (const s of stars) {
          p.fill(s.hue, 72, ctx.dark ? 74 : 50, 0.95);
          p.circle(s.x, s.y, s.size);
        }
      },
    };
  },

  // Layered scrolling sine waves.
  waves(p, ctx) {
    return {
      init() {},
      frame(t) {
        const layers = 5;
        for (let l = 0; l < layers; l++) {
          const yBase = p.height * (0.35 + l * 0.13);
          const amp = 26 + l * 10;
          const hue = (ctx.baseHue + l * 12) % 360;
          p.noStroke();
          p.fill(hue, 62, ctx.dark ? 55 : 58, 0.16);
          p.beginShape();
          p.vertex(0, p.height);
          for (let x = 0; x <= p.width; x += 14) {
            const y = yBase + Math.sin(x * 0.006 + t * (0.6 + l * 0.18) + l) * amp
              + Math.sin(x * 0.013 - t * 0.4) * (amp * 0.35);
            p.vertex(x, y);
          }
          p.vertex(p.width, p.height);
          p.endShape(p.CLOSE);
        }
      },
    };
  },

  // Slow translucent orbs rising like a lava lamp.
  bubbles(p, ctx) {
    let orbs = [];
    const spawn = () => ({
      x: p.random(p.width),
      y: p.height + p.random(20, 160),
      r: p.random(24, 90),
      speed: p.random(0.2, 0.7),
      hue: (ctx.baseHue + p.random(-40, 40) + 360) % 360,
      drift: p.random(-0.3, 0.3),
    });
    return {
      init() {
        for (let i = 0; i < Math.max(3, Math.round(16 * ctx.density)); i++) {
          const o = spawn();
          o.y = p.random(p.height);
          orbs.push(o);
        }
      },
      frame() {
        p.noStroke();
        for (let i = 0; i < orbs.length; i++) {
          const o = orbs[i];
          o.y -= o.speed;
          o.x += o.drift;
          if (o.y < -o.r) orbs[i] = spawn();
          p.fill(o.hue, 68, ctx.dark ? 60 : 60, 0.17);
          p.circle(o.x, o.y, o.r * 2);
          p.fill(o.hue, 72, ctx.dark ? 70 : 52, 0.22);
          p.circle(o.x, o.y, o.r);
        }
      },
    };
  },

  // A soft "mesh gradient": a handful of big blurred blobs wandering.
  mesh(p, ctx) {
    let blobs = [];
    return {
      init() {
        for (let i = 0; i < Math.max(3, Math.round(5 * ctx.density)); i++) {
          blobs.push({
            seedX: p.random(1000), seedY: p.random(1000),
            r: p.random(p.width * 0.25, p.width * 0.45),
            hue: (ctx.baseHue + i * 28) % 360,
          });
        }
      },
      frame(t) {
        p.noStroke();
        for (const b of blobs) {
          const x = p.noise(b.seedX, t * 0.05) * p.width;
          const y = p.noise(b.seedY, t * 0.05) * p.height;
          // Concentric fades approximate a soft radial glow (no blur cost).
          for (let k = 6; k >= 1; k--) {
            p.fill(b.hue, 62, ctx.dark ? 48 : 62, 0.05);
            p.circle(x, y, b.r * (k / 6));
          }
        }
      },
    };
  },
};

function startBgArt() {
  stopBgArt();
  if (typeof p5 === "undefined") return;
  // Still if the OS asks, if the interface-wide reduce-motion is on, or if the
  // background is simply set to Still — three different reasons, one outcome.
  // Wanting a calm background isn't the same as wanting a calm interface, and
  // previously the only way to still the art was to still everything.
  const reduceMotion =
    reducedMotionWanted() || appearancePref("bg-motion") === "still";
  // A custom accent colour, if set, drives the art too.
  const accentHex =
    localStorage.getItem("accent-custom") ||
    (ACCENTS.find((a) => a.name === activeAccent()) || ACCENTS[0]).swatch;
  const bgStyle = bgArtStyle();
  // Intensity drives how much is on screen, not just the CSS opacity.
  const intensity = Number(appearancePref("bg-intensity")) || 90;
  const densityScale = Math.max(0.25, intensity / 90);
  const dark =
    document.documentElement.dataset.theme === "dark" ||
    (!document.documentElement.dataset.theme &&
      window.matchMedia("(prefers-color-scheme: dark)").matches);
  const build = BG_ART_BUILDERS[bgStyle] || BG_ART_BUILDERS.aurora;

  const sketch = (p) => {
    // Each style is a self-contained builder returning {init, frame}. The
    // merge in #20 left this function holding pieces of two implementations
    // at once — one branch's builders alongside the other's inline draw
    // functions, with the `const style = build(...)` line lost between them.
    // So p.draw called `style.frame(t)` on an undefined `style`, and every
    // non-aurora background threw on its first frame.
    let style = null;

    p.setup = () => {
      const c = p.createCanvas(window.innerWidth, window.innerHeight);
      c.id("bg-art-canvas");
      // Style it here, inside setup, where the element definitely exists.
      // Applying the class after `new p5()` returned was a race: when p5
      // deferred setup the lookup found nothing, the canvas kept default
      // static positioning, and the art rendered as a block *below* the whole
      // UI instead of fixed behind it.
      c.elt.className = "bg-art-canvas";
      // p5 parents new canvases to the first <main> it finds — which is the
      // one inside the Notes tab. That hid the background art on every other
      // tab (the whole panel is display:none). Pin it to <body> so it really
      // is a global background.
      c.parent(document.body);
      // RGB for the wash rect, HSL for the coloured marks — p5 lets us
      // switch, but simplest to keep one mode; use HSL and a grey wash.
      p.colorMode(p.HSL, 360, 100, 100, 1);
      p.noStroke();
      p.frameRate(30);

      style = build(p, {
        dark,
        baseHue: p.hue(p.color(accentHex)),
        // The intensity slider scales how much is actually on screen, so each
        // style decides its own population from one number.
        density: densityScale,
      });
      style.init();

      if (reduceMotion) {
        // One calm static frame — no motion for reduced-motion users.
        p.background(dark ? 12 : 250);
        style.frame(0);
        p.noLoop();
      }
    };

    p.draw = () => {
      const t = p.frameCount * 0.01;
      // Translucent wash → marks leave gentle trails instead of hard clears.
      // Kept light so the art reads clearly on every tab (and the page
      // gradient shows through) rather than flattening to near-solid.
      p.noStroke();
      p.fill(dark ? 12 : 250, dark ? 0.10 : 0.12);
      p.rect(0, 0, p.width, p.height);
      style.frame(t);
    };

    p.windowResized = () => p.resizeCanvas(window.innerWidth, window.innerHeight);
  };
  bgArtInstance = new p5(sketch);
  const canvas = document.getElementById("bg-art-canvas");
  if (canvas) canvas.className = "bg-art-canvas";
}

// --- Wave O: the p5 brand emblem (unique each load, reused app-wide) ----------

// A tiny generative emblem next to the title: a ring of linked nodes (the
// MemoryMap motif), coloured in the accent, seeded randomly each visit so
// it's one-of-a-kind, with a slow rotation.
// One identity per visit: every emblem in the app draws from the same seed, so
// the logo in the top bar, on the lock screen and in the empty states is
// recognisably the *same* mark rather than five unrelated doodles.
const emblemSeed = Math.floor(Math.random() * 1e6);
const emblemInstances = new Map(); // element -> p5 instance

// The shared emblem sketch: a small ring of linked nodes — the MemoryMap motif
// — in the current accent. Animated only where it's worth the frames.
function renderEmblem(holder, size = 34, { animate = false } = {}) {
  if (typeof p5 === "undefined" || !holder) return;
  const existing = emblemInstances.get(holder);
  if (existing) {
    existing.remove();
    emblemInstances.delete(holder);
  }
  const accentHex =
    localStorage.getItem("accent-custom") ||
    (ACCENTS.find((a) => a.name === activeAccent()) || ACCENTS[0]).swatch;
  // The emblem spins unless the user has explicitly asked for a still UI in
  // Settings → Appearance. We deliberately don't freeze it on the OS-level
  // prefers-reduced-motion hint alone: this mark has always turned, the app
  // ships its own motion switch, and that switch is the one to obey.
  const still = appearancePref("motion") === "reduced";

  const sketch = (p) => {
    let nodes = [];
    let baseHue = 230;
    p.setup = () => {
      p.createCanvas(size, size);
      p.colorMode(p.HSL, 360, 100, 100, 1);
      p.randomSeed(emblemSeed);
      baseHue = p.hue(p.color(accentHex));
      const count = 4 + Math.floor(p.random(3)); // 4-6 nodes
      nodes = Array.from({ length: count }, (_, i) => ({
        angle: (i / count) * p.TWO_PI + p.random(-0.3, 0.3),
        hue: (baseHue + p.random(-40, 40) + 360) % 360,
      }));
      if (animate && !still) p.frameRate(24);
      else {
        p.draw();
        p.noLoop(); // a single crisp frame where motion adds nothing
      }
    };
    p.draw = () => {
      p.clear();
      p.translate(size / 2, size / 2);
      if (animate && !still) p.rotate(p.frameCount * 0.006);
      const r = size * 0.32;
      const dot = Math.max(4, size * 0.18);
      p.stroke(baseHue, 60, 60, 0.6);
      p.strokeWeight(Math.max(1, size / 34));
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          p.line(
            Math.cos(nodes[i].angle) * r,
            Math.sin(nodes[i].angle) * r,
            Math.cos(nodes[j].angle) * r,
            Math.sin(nodes[j].angle) * r
          );
        }
      }
      p.noStroke();
      for (const n of nodes) {
        p.fill(n.hue, 75, 60, 1);
        p.circle(Math.cos(n.angle) * r, Math.sin(n.angle) * r, dot);
      }
      p.fill(baseHue, 70, 62, 1);
      p.circle(0, 0, dot * 0.85); // a bright hub
    };
  };
  emblemInstances.set(holder, new p5(sketch, holder));
}

// Every emblem currently on the page, keyed by element id and size.
const EMBLEM_SLOTS = [
  ["brand-logo", 34, true],
  ["lock-emblem", 76, true],
  ["onboarding-emblem", 64, false],
  ["chat-empty-emblem", 52, false],
  ["graph-empty-emblem", 52, false],
  ["about-emblem", 44, false],
];

function renderBrandLogo() {
  for (const [id, size, animate] of EMBLEM_SLOTS) {
    const holder = document.getElementById(id);
    if (holder) renderEmblem(holder, size, { animate });
  }
}

function toggleBgArt(on) {
  localStorage.setItem("bgArt", on ? "on" : "off");
  applyAppearance(); // updates data-bg-art so the cards adjust with it
  if (on) startBgArt();
  else stopBgArt();
}

// --- wiring --------------------------------------------------------------------

$("theme-btn").addEventListener("click", toggleTheme);
$("bg-art-toggle").addEventListener("change", (e) => {
  toggleBgArt(e.target.checked);
  renderAppearance(); // enable/disable the style + intensity rows
});
$("contrast-toggle").addEventListener("change", (e) => applyContrast(e.target.checked));

// Wave O: expanded appearance controls.
for (const b of document.querySelectorAll("#theme-seg button")) {
  b.addEventListener("click", () => {
    applyThemeChoice(b.dataset.themeChoice);
    renderAppearance();
  });
}
for (const b of document.querySelectorAll("#fontsize-seg button")) {
  b.addEventListener("click", () => {
    localStorage.setItem("fontsize", b.dataset.fontsize);
    applyAppearance();
    renderAppearance();
  });
}
for (const b of document.querySelectorAll("#font-seg button")) {
  b.addEventListener("click", () => {
    localStorage.setItem("font", b.dataset.font);
    applyAppearance();
    renderAppearance();
  });
}
for (const b of document.querySelectorAll("#density-seg button")) {
  b.addEventListener("click", () => {
    localStorage.setItem("density", b.dataset.density);
    applyAppearance();
    renderAppearance();
  });
}
$("glass-toggle").addEventListener("change", (e) => {
  localStorage.setItem("glass", e.target.checked ? "on" : "off");
  applyAppearance();
  renderAppearance();
});
$("reduce-motion-toggle").addEventListener("change", (e) => {
  localStorage.setItem("motion", e.target.checked ? "reduced" : "auto");
  applyAppearance();
  if (e.target.checked) stopBgArt(); // a still UI shouldn't keep the art running
  else if (bgArtOn()) startBgArt();
  renderBrandLogo(); // start/stop the emblem's rotation to match
});
$("bg-intensity").addEventListener("input", (e) => {
  localStorage.setItem("bg-intensity", e.target.value);
  $("bg-intensity-value").textContent = `${e.target.value}%`;
  applyAppearance();
  if (bgArtOn()) startBgArt(); // intensity also drives particle density
});
// Corner rounding + glass blur: live sliders over CSS custom properties.
$("radius-slider").addEventListener("input", (e) => {
  localStorage.setItem("radius", e.target.value);
  $("radius-value").textContent = `${e.target.value}px`;
  applyAppearance();
});
$("glass-blur").addEventListener("input", (e) => {
  localStorage.setItem("glass-blur", e.target.value);
  $("glass-blur-value").textContent = `${e.target.value}px`;
  applyAppearance();
});
// Custom accent + page background.
$("accent-custom").addEventListener("input", (e) => {
  localStorage.setItem("accent-custom", e.target.value);
  applyCustomAccent(e.target.value);
  renderAppearance();
  if (bgArtOn()) startBgArt();
  renderBrandLogo();
});
$("accent-custom-clear").addEventListener("click", () => {
  localStorage.removeItem("accent-custom");
  applyCustomAccent(null);
  renderAppearance();
  if (bgArtOn()) startBgArt();
  renderBrandLogo();
});
$("page-bg-custom").addEventListener("input", (e) => {
  localStorage.setItem("page-bg", e.target.value);
  applyPageBackground(e.target.value);
});
$("page-bg-clear").addEventListener("click", () => {
  localStorage.removeItem("page-bg");
  applyPageBackground(null);
  renderAppearance();
});
// Background art style.
$("bg-art-style").addEventListener("change", (e) => {
  localStorage.setItem("bg-style", e.target.value);
  if (bgArtOn()) startBgArt();
});
$("bg-motion").addEventListener("change", (e) => {
  localStorage.setItem("bg-motion", e.target.value);
  // Still vs moving is decided in setup, so the sketch has to be rebuilt.
  if (bgArtOn()) startBgArt();
});
// Custom CSS (advanced).
$("custom-css-apply").addEventListener("click", () => {
  const css = $("custom-css").value;
  localStorage.setItem("custom-css", css);
  applyCustomCss(css);
  $("custom-css-status").textContent = "Applied.";
});
$("custom-css-clear").addEventListener("click", () => {
  localStorage.removeItem("custom-css");
  $("custom-css").value = "";
  applyCustomCss("");
  $("custom-css-status").textContent = "Cleared.";
});
$("appearance-reset").addEventListener("click", resetAppearance);
$("theme-reset").addEventListener("click", resetThemeOnly);
$("theme-clear-overrides").addEventListener("click", clearManualOverrides);

// Apply saved appearance prefs immediately, then start the background.
applyAppearance();
if (bgArtOn()) startBgArt();

// Tabs (Wave A): switch pages, restore the last one used.
for (const button of document.querySelectorAll("#tab-bar button")) {
  button.addEventListener("click", () => switchTab(button.dataset.tab));
}
// Arrow keys walk the tablist; Home/End jump to the ends (Wave L).
$("tab-bar").addEventListener("keydown", (e) => {
  const keys = { ArrowRight: 1, ArrowLeft: -1, Home: 0, End: 0 };
  if (!(e.key in keys)) return;
  e.preventDefault();
  const index = TABS.indexOf(localStorage.getItem("activeTab") || "notes");
  let next;
  if (e.key === "Home") next = 0;
  else if (e.key === "End") next = TABS.length - 1;
  else next = (index + keys[e.key] + TABS.length) % TABS.length;
  switchTab(TABS[next]);
  document.querySelector(`#tab-bar [data-tab="${TABS[next]}"]`).focus();
});
// Skip link (Wave L): jump keyboard focus straight into the open panel.
$("skip-link").addEventListener("click", (e) => {
  e.preventDefault();
  $(`tab-${localStorage.getItem("activeTab") || "notes"}`).focus();
});
initCollapsibleSections();
scrollTopUpdate = initScrollTopButton();
initResizableSidebars();
watchOverlays(); // page behind a dialog must not scroll
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

// --- documents wiring ---
$("doc-new").addEventListener("click", createDocument);
$("doc-filter").addEventListener("input", renderDocList);
$("doc-title").addEventListener("input", () => { markDocDirty(); renderDocPreview(); });
$("doc-content").addEventListener("input", () => { markDocDirty(); renderDocPreview(); });
for (const button of document.querySelectorAll("#doc-toolbar button")) {
  button.addEventListener("click", () => applyMarkdown(button.dataset.md));
}
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
$("doc-content").addEventListener("keydown", (event) => {
  if (!(event.ctrlKey || event.metaKey)) return;
  const key = event.key.toLowerCase();
  if (key === "s") { event.preventDefault(); saveDocument(); }
  else if (key === "b") { event.preventDefault(); wrapDocSelection("**"); }
  else if (key === "i") { event.preventDefault(); wrapDocSelection("*"); }
});
// Leaving with unsaved edits would lose them; autosave hasn't fired yet.
window.addEventListener("beforeunload", (event) => {
  if (!docDirty) return;
  event.preventDefault();
  event.returnValue = "";
});

// --- writing room wiring ---
$("draft-compose").addEventListener("click", composeDraft);
$("draft-undo").addEventListener("click", undoDraft);
$("draft-cancel").addEventListener("click", cancelDraft);
$("draft-save").addEventListener("click", saveDraftAsNote);
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
$("draft-discard").addEventListener("click", () => {
  if (!$("draft-text").value.trim() && !$("draft-thoughts").value.trim()) return;
  if (!confirm("Discard this draft? It hasn't been saved as a note.")) return;
  $("draft-thoughts").value = "";
  $("draft-text").value = "";
  $("draft-tags").value = "";
  $("draft-thinking").classList.add("hidden");
  $("draft-status").textContent = "";
  updateDraftCount();
  saveDraftLocally();
});
$("draft-help").addEventListener("click", () => {
  $("draft-intro").classList.toggle("hidden");
});
restoreDraftLocally();

// --- note picker wiring ---
$("attach-note").addEventListener("click", () => {
  if (notePickerOpen()) closeNotePicker();
  else openNotePicker();
});
$("note-picker-search").addEventListener("input", renderNotePickerList);
$("note-picker-done").addEventListener("click", () => {
  closeNotePicker();
  $("chat-input").focus();
});
$("note-picker-clear").addEventListener("click", () => {
  attachedNoteIds = [];
  renderAttachments();
  renderNotePickerList();
});
// Click-away and Escape close it, like every other popover in the app.
document.addEventListener("click", (event) => {
  if (!notePickerOpen()) return;
  if (event.target.closest(".note-picker")) return;
  closeNotePicker();
});
$("note-picker-panel").addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    event.stopPropagation();
    closeNotePicker();
    $("attach-note").focus();
  }
});
$("chat-stop").addEventListener("click", () => chatController && chatController.abort());
$("chat-new").addEventListener("click", newChatConversation);
$("chat-export").addEventListener("click", exportChatMarkdown);
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
$("skill-add").addEventListener("click", addSkill);
$("skill-cancel").addEventListener("click", stopEditingSkill);
$("graph-refresh").addEventListener("click", () => {
  graphHighlightIds = null; // a refresh clears any "similar notes" spotlight
  renderGraph();
});
$("graph-similarity").addEventListener("change", renderGraph);
$("graph-hide-orphans").addEventListener("change", renderGraph);
// Labels toggle just flips a class — no need to rebuild the whole map.
$("graph-labels").addEventListener("change", (e) => {
  $("graph-box").classList.toggle("graph-labels-hidden", !e.target.checked);
});
$("graph-search").addEventListener("input", applyGraphHighlight);

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

// Wave M: batch operations + skill/persona sharing.
$("select-btn").addEventListener("click", () =>
  selectMode ? exitSelectMode() : enterSelectMode()
);
$("batch-move").addEventListener("click", batchMove);
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
    await saveSkillList(merged);
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
  // Remember the choice so it survives restarts.
  await apiJson("/preferences", {
    method: "PUT",
    body: JSON.stringify({ tools_enabled: $("tools-toggle").checked }),
  }).catch(() => {});
});

// In-chat web-search toggle: reflects and flips the web_search_enabled pref,
// with a clear active state (it's the same setting as Settings → Preferences).
function renderWebSearchToggle() {
  const on = Boolean(prefsCache && prefsCache.web_search_enabled);
  const button = $("web-search-toggle");
  button.classList.toggle("active", on);
  button.setAttribute("aria-pressed", on ? "true" : "false");
}
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
    toast("Web search on — the AI can search, and you can browse here.");
  } else {
    toggleWebPanel(false);
    toast("Web search off.");
  }
});
$("web-panel-close").addEventListener("click", () => toggleWebPanel(false));
$("web-go").addEventListener("click", runWebSearch);
$("web-query").addEventListener("keydown", (e) => {
  if (e.key === "Enter") runWebSearch();
});
$("web-reader-back").addEventListener("click", () =>
  $("web-reader").classList.add("hidden")
);
$("web-reader-save").addEventListener("click", saveWebPageAsNote);

// Dashboard + reminders (Wave D).
$("dash-edit").addEventListener("click", () => {
  dashEditMode = !dashEditMode;
  $("dash-edit").textContent = dashEditMode ? "Done" : "Edit layout";
  renderDashboard();
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
    $("reminder-due").value = defaultDueValue();
    updateDueReadout();
  }
});
$("reminder-clear-done").addEventListener("click", clearDoneReminders);
for (const button of document.querySelectorAll("#reminder-filter button")) {
  button.addEventListener("click", () => {
    reminderFilter = button.dataset.filter;
    for (const b of document.querySelectorAll("#reminder-filter button")) {
      b.classList.toggle("active", b === button);
    }
    loadReminders();
  });
}
$("reminder-magic-add").addEventListener("click", magicAddReminder);
$("reminder-magic").addEventListener("keydown", (e) => {
  if (e.key === "Enter") magicAddReminder();
});
for (const button of document.querySelectorAll("#reminder-presets button")) {
  button.addEventListener("click", () => {
    $("reminder-due").value = toLocalInputValue(presetDate(button.dataset.preset).toISOString());
    updateDueReadout();
    if (!$("reminder-text").value.trim()) $("reminder-text").focus();
  });
}
// Nudges: adjusting an existing time is far quicker than retyping one.
$("reminder-due-nudge-down").addEventListener("click", () => nudgeDue(-15));
$("reminder-due-nudge-up").addEventListener("click", () => nudgeDue(15));
$("reminder-due-day-down").addEventListener("click", () => nudgeDue(-60 * 24));
$("reminder-due-day-up").addEventListener("click", () => nudgeDue(60 * 24));
$("reminder-due").addEventListener("input", updateDueReadout);
for (const button of document.querySelectorAll(".panel-close")) {
  button.addEventListener("click", () => showPanel(null));
}
$("bin-empty").addEventListener("click", async () => {
  if (!confirm("Permanently delete everything in the bin? This cannot be undone.")) return;
  const result = await apiJson("/recycle-bin/empty", { method: "POST" });
  toast(`${result.removed} entr${result.removed === 1 ? "y" : "ies"} permanently deleted.`);
  await renderBin();
});
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
  // Link by the note's opening words — that's what resolution matches on.
  //
  // Brackets are stripped first. A note that itself contains [[a link]] would
  // otherwise be inserted verbatim, producing [[outer [[inner]] text]] — and
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
// running and a plain join when it isn't — the join reads worse but cannot
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
      : "No duplicates at that similarity — try lowering the slider.";
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
      text.textContent = notePreviewText(entry.content).slice(0, 160);
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
      aiReady ? " let the AI write the merged note" : " AI not running — notes will be joined"
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

  // Show what it will say BEFORE anything changes — merging is the one action
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

  const ok = confirm(
    `Merge ${ids.length} notes into one?\n\n` +
      `The merged note will read:\n\n${preview.merged.slice(0, 400)}` +
      `${preview.merged.length > 400 ? "…" : ""}\n\n` +
      `The other ${ids.length - 1} go to the recycle bin, so this is undoable.`
  );
  if (!ok) return;

  try {
    const result = await apiJson("/duplicates/merge", {
      method: "POST",
      body: JSON.stringify({ ids, use_ai: useAi }),
    });
    card.remove();
    toast(`Merged ${result.merged_count} notes${result.used_ai ? " with the AI" : ""}.`);
    await loadEntries();
  } catch (error) {
    status.classList.add("error");
    status.textContent = error.message;
  }
}

// --- saved filters ---------------------------------------------------------------
// Once the filter box understands operators, the useful ones are worth
// keeping. "tag:work is:untagged" is a thing you want on a button, not
// something to retype — and it works with no AI at all.

function savedSearches() {
  return (prefsCache && prefsCache.saved_searches) || [];
}

function renderSavedSearches() {
  const box = $("saved-searches");
  const saved = savedSearches();
  box.replaceChildren();
  box.classList.toggle("hidden", saved.length === 0);
  for (const item of saved) {
    const chipEl = document.createElement("span");
    chipEl.className = "chip saved-search";
    const apply = document.createElement("button");
    apply.type = "button";
    apply.className = "saved-search-apply";
    apply.textContent = `☆ ${item.name}`;
    apply.title = `Filter: ${item.query}`;
    apply.addEventListener("click", () => {
      $("note-search").value = item.query;
      noteSearch = item.query;
      renderEntries();
      announce(`Applied the saved filter "${item.name}".`);
    });
    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "saved-search-remove";
    remove.textContent = "✕";
    remove.title = `Forget "${item.name}"`;
    remove.setAttribute("aria-label", remove.title);
    remove.addEventListener("click", async () => {
      const next = savedSearches().filter((s) => s.name !== item.name);
      await persistSavedSearches(next);
      toast(`Forgot "${item.name}".`);
    });
    chipEl.append(apply, remove);
    box.appendChild(chipEl);
  }
}

async function persistSavedSearches(next) {
  prefsCache = await apiJson("/preferences", {
    method: "PUT",
    body: JSON.stringify({ saved_searches: next }),
  });
  renderSavedSearches();
}

async function saveCurrentSearch() {
  const query = $("note-search").value.trim();
  if (!query) return;
  const name = (prompt("Name this filter:", query.slice(0, 40)) || "").trim();
  if (!name) return;
  // Re-saving an existing name updates it rather than adding a duplicate you
  // then have to hunt down and remove.
  const next = savedSearches().filter((s) => s.name !== name);
  next.push({ name, query });
  await persistSavedSearches(next);
  toast(`Saved "${name}".`);
}

$("save-search").addEventListener("click", saveCurrentSearch);

$("history-close").addEventListener("click", () =>
  $("history-overlay").classList.add("hidden")
);

$("find-duplicates").addEventListener("click", findDuplicates);
$("duplicate-threshold").addEventListener("input", (e) => {
  $("duplicate-threshold-value").textContent = `${e.target.value}%`;
});

$("about-shortcuts").addEventListener("click", () => {
  closeSettingsModal();
  openShortcuts();
});
$("shortcuts-reset").addEventListener("click", resetShortcuts);

$("search-help").addEventListener("click", () => {
  const panel = $("search-help-hint");
  const showing = panel.classList.toggle("hidden");
  $("search-help").setAttribute("aria-expanded", String(!showing));
  if (!showing) $("note-search").focus();
});

$("prefs-save").addEventListener("click", savePrefs);
// Managed SearXNG: show what's there, and start/stop it on request.
async function refreshSearxngHost() {
  const badge = $("searxng-host-state");
  const start = $("searxng-start");
  const stop = $("searxng-stop");
  const info = await apiJson("/websearch/searxng/status").catch(() => null);
  if (!info) {
    badge.textContent = "Unknown";
    return;
  }
  // No usable backend: nothing we can drive, so say so plainly. "Docker is
  // installed but not started" is a different problem from "Docker isn't
  // installed", and the detail from the server distinguishes them.
  if (!info.backend) {
    badge.textContent = info.docker_installed ? "Docker not started" : "Not available";
    badge.title = info.detail || "";
    start.disabled = true;
    stop.disabled = true;
    $("searxng-host-status").classList.remove("error");
    $("searxng-host-status").textContent = info.detail || "";
    return;
  }
  // Which way it'll be run, so "a few minutes" isn't a surprise.
  $("searxng-backend").textContent =
    info.backend === "docker"
      ? "Docker is installed, so it runs as a container."
      : "Docker isn't installed, so it runs from its own virtualenv instead. " +
        "The first start takes a few minutes to download and install.";

  // An install is minutes long and runs in the background — poll it so the
  // step text keeps moving instead of the screen looking stuck.
  if (info.installing) {
    badge.textContent = "Installing…";
    badge.className = "chip";
    start.disabled = true;
    stop.disabled = true;
    $("searxng-host-status").textContent = info.install_step || "Setting SearXNG up…";
    clearTimeout(refreshSearxngHost.timer);
    refreshSearxngHost.timer = setTimeout(refreshSearxngHost, 3000);
    return;
  }
  if (info.install_error) {
    $("searxng-host-status").classList.add("error");
    $("searxng-host-status").textContent = info.install_error;
  } else if (info.detail) {
    // e.g. "Docker isn't running, so it'll be set up in a virtualenv" — an
    // explanation of what will happen, not a failure.
    $("searxng-host-status").classList.remove("error");
    $("searxng-host-status").textContent = info.detail;
  }
  const running = info.state === "running" && info.responding;
  badge.textContent = running
    ? "Running"
    : info.state === "running"
      ? "Starting…"
      : info.state === "stopped"
        ? "Stopped"
        : "Not installed";
  badge.className = `chip ${running ? "confidence" : ""}`.trim();
  start.disabled = running;
  stop.disabled = info.state === "absent";
  start.textContent = info.state === "absent" ? "▶ Install & start" : "▶ Start SearXNG";
  // Keep polling while it's starting, so "Starting…" can't stick forever with
  // no way to tell whether anything is still happening.
  if (info.state === "running" && !info.responding) {
    clearTimeout(refreshSearxngHost.timer);
    refreshSearxngHost.timer = setTimeout(refreshSearxngHost, 3000);
  }
}

$("searxng-start").addEventListener("click", async () => {
  const status = $("searxng-host-status");
  status.classList.remove("error");
  status.textContent = "Starting SearXNG… the first run pulls the image, so give it a minute.";
  $("searxng-start").disabled = true;
  try {
    const body = await apiJson("/websearch/searxng/start", { method: "POST" });
    $("pref-searxng").value = body.url;
    prefsCache = await apiJson("/preferences").catch(() => prefsCache);
    status.textContent = `Running at ${body.url} — web search now uses it.`;
    toast("SearXNG is running.");
  } catch (error) {
    status.classList.add("error");
    status.textContent = error.message;
  }
  refreshSearxngHost();
});

$("searxng-stop").addEventListener("click", async () => {
  const status = $("searxng-host-status");
  status.classList.remove("error");
  status.textContent = "Stopping…";
  try {
    await apiJson("/websearch/searxng/stop", { method: "POST" });
    $("pref-searxng").value = "";
    prefsCache = await apiJson("/preferences").catch(() => prefsCache);
    status.textContent = "Stopped — web search is back on DuckDuckGo.";
  } catch (error) {
    status.classList.add("error");
    status.textContent = error.message;
  }
  refreshSearxngHost();
});

// Find a running SearXNG so the user never has to work out the wiring.
$("searxng-detect").addEventListener("click", async () => {
  const status = $("searxng-status");
  const typed = $("pref-searxng").value.trim();
  status.classList.remove("error");
  status.textContent = typed ? "Testing that URL…" : "Looking for a local SearXNG…";
  const query = typed ? `?url=${encodeURIComponent(typed)}` : "";
  const body = await apiJson(`/websearch/detect-searxng${query}`, {
    method: "POST",
  }).catch((error) => ({ found: false, detail: error.message }));
  if (body.found) {
    $("pref-searxng").value = body.url;
    prefsCache = await apiJson("/preferences").catch(() => prefsCache);
    status.textContent = `Connected to ${body.url}`;
  } else {
    status.classList.add("error");
    status.textContent = body.detail || "No SearXNG found.";
  }
});
$("profile-delete").addEventListener("click", deleteProfile);
$("export-json").addEventListener("click", () => downloadExport("json"));
$("export-csv").addEventListener("click", () => downloadExport("csv"));
$("chat-model-apply").addEventListener("click", applyChatModel);
$("utility-model-apply").addEventListener("click", applyUtilityModel);
$("embedding-apply").addEventListener("click", applyEmbeddingBackend);
$("utility-model-select").addEventListener(
  "change",
  () => ($("utility-model-select").dataset.userChosen = "1")
);

// Wave N: improve-writing, link suggestions.
$("improve-btn").addEventListener("click", () => openImprove($("entry-content")));
$("improve-close").addEventListener("click", closeImprove);
$("improve-apply").addEventListener("click", applyImprove);
$("improve-retry").addEventListener("click", runImprove);
for (const button of document.querySelectorAll(".improve-mode")) {
  button.addEventListener("click", () => {
    improveMode = button.dataset.mode;
    for (const b of document.querySelectorAll(".improve-mode"))
      b.classList.toggle("active", b === button);
    runImprove();
  });
}
$("link-suggest-btn").addEventListener("click", loadLinkSuggestions);
// Mark a picker as "user has a pending choice" so the status poll stops
// resetting it (Wave N bug fix).
for (const id of ["chat-model-select", "embedding-model-select"]) {
  $(id).addEventListener("change", () => ($(id).dataset.userChosen = "1"));
}
for (const radio of document.querySelectorAll('input[name="emb-backend"]')) {
  radio.addEventListener(
    "change",
    () => ($("embedding-model-select").dataset.userChosen = "1")
  );
}
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
  // The suggestion list owns the arrows, Enter, Tab and Escape while it's up.
  if (wikiSuggestKeydown(e, $("entry-content"))) return;
  if (e.key === "Enter" && e.ctrlKey) saveEntry();
});
$("entry-content").addEventListener("input", () => {
  wikiSuggestIndex = 0;
  renderWikiSuggest($("entry-content"));
});
// Moving the caret with the mouse or arrows can leave the fragment behind.
$("entry-content").addEventListener("click", () => renderWikiSuggest($("entry-content")));
$("entry-content").addEventListener("blur", () => setTimeout(hideWikiSuggest, 120));
document.addEventListener("keydown", (e) => {
  // Rebinding swallows everything while it's listening.
  if (captureShortcutKey(e)) {
    e.preventDefault();
    return;
  }
  // Chorded shortcuts (anything with a modifier) work even while typing —
  // Ctrl+K from inside the note box should still open the palette.
  const chorded = e.ctrlKey || e.metaKey || e.altKey;
  if (chorded) {
    for (const [id, def] of Object.entries(shortcuts)) {
      if (matchesShortcut(e, def.keys)) {
        e.preventDefault();
        runShortcut(id);
        return;
      }
    }
  }
  if (e.key === "Escape" && !$("onboarding-overlay").classList.contains("hidden")) {
    closeOnboarding();
    return;
  }
  if (e.key === "Escape" && !$("features-overlay").classList.contains("hidden")) {
    closeFeatures();
    return;
  }
  if (e.key === "Escape" && !$("graph-new").classList.contains("hidden")) {
    closeGraphNewNote();
    return;
  }
  if (e.key === "Escape" && !$("graph-popup").classList.contains("hidden")) {
    closeGraphPopup();
    return;
  }
  if (e.key === "Escape" && !$("palette-overlay").classList.contains("hidden")) {
    closePalette();
    return;
  }
  if (e.key === "Escape" && !$("sketch-overlay").classList.contains("hidden")) {
    closeSketch();
    return;
  }
  if (e.key === "Escape" && !$("improve-overlay").classList.contains("hidden")) {
    closeImprove();
    return;
  }
  if (e.key === "Escape" && !$("history-overlay").classList.contains("hidden")) {
    $("history-overlay").classList.add("hidden");
    return;
  }
  if (e.key === "Escape" && !$("shortcuts-overlay").classList.contains("hidden")) {
    closeShortcuts();
    return;
  }
  // "/" focuses search — but only when you're not already typing somewhere
  // and no overlay is open, so it never steals a literal slash (Wave J).
  const typing = ["INPUT", "TEXTAREA", "SELECT"].includes(
    document.activeElement && document.activeElement.tagName
  );
  const overlayOpen =
    settingsModalOpen() ||
    !$("palette-overlay").classList.contains("hidden") ||
    !$("sketch-overlay").classList.contains("hidden");
  // Unchorded shortcuts ("/", "?") only fire when you're not typing and no
  // overlay is open, so they never steal a literal slash mid-sentence.
  if (!typing && !overlayOpen) {
    for (const [id, def] of Object.entries(shortcuts)) {
      const bare = !/\+/.test(def.keys);
      if (bare && matchesShortcut(e, def.keys)) {
        e.preventDefault();
        runShortcut(id);
        return;
      }
    }
  }
  if (e.key === "Escape" && settingsModalOpen()) closeSettingsModal();
  if (e.key === "Escape") closeActionMenus();
  if (e.key === "Escape" && linkSource !== null) {
    linkSource = null;
    renderEntries();
  }
});

// Clicking anywhere outside an open ⋯ menu closes it (Wave L).
document.addEventListener("click", (e) => {
  if (!e.target.closest(".menu-wrap")) closeActionMenus();
});

// Focus trapping (Wave L): while a dialog is open, Tab cycles inside it
// instead of wandering into the page behind — a WCAG dialog basic.
function activeOverlay() {
  for (const id of [
    "onboarding-overlay",
    "features-overlay",
    "palette-overlay",
    "sketch-overlay",
    "improve-overlay",
    "shortcuts-overlay",
    "settings-modal",
  ]) {
    if (!$(id).classList.contains("hidden")) return $(id);
  }
  return null;
}

// --- first-run onboarding tour (learnability) -------------------------------

const ONBOARDING_SLIDES = [
  {
    icon: "🧠",
    title: "Welcome to MemoryMap",
    text: "A 100% offline notebook where a local AI files your thoughts and answers questions about them. Nothing ever leaves this computer.",
  },
  {
    icon: "📝",
    title: "Capture your thoughts",
    text: "Jot anything into the Notes tab and hit Save — the AI files it into a category and suggests tags. No folders to fuss over.",
  },
  {
    icon: "💬",
    title: "Ask your notebook",
    text: "Ask questions in plain English and get answers grounded in your own notes. Switch on “AI can make changes” and it can organise them for you too.",
  },
  {
    icon: "🕸",
    title: "Explore your graph",
    text: "The Graph tab shows how your notes connect. Search, drag, and zoom to rediscover things you'd forgotten you saved.",
  },
  {
    icon: "🎨",
    title: "Make it yours",
    text: "Settings → Appearance has themes, accent colours, fonts, and more. Press ? any time for keyboard shortcuts. Enjoy!",
  },
];

let onboardingIndex = 0;

function renderOnboardingSlide() {
  const slide = ONBOARDING_SLIDES[onboardingIndex];
  $("onboarding-icon").textContent = slide.icon;
  $("onboarding-title").textContent = slide.title;
  $("onboarding-text").textContent = slide.text;
  const dots = $("onboarding-dots");
  dots.replaceChildren();
  ONBOARDING_SLIDES.forEach((_, i) => {
    const dot = document.createElement("span");
    dot.className = "onboarding-dot" + (i === onboardingIndex ? " active" : "");
    dots.appendChild(dot);
  });
  $("onboarding-back").classList.toggle("hidden", onboardingIndex === 0);
  const last = onboardingIndex === ONBOARDING_SLIDES.length - 1;
  $("onboarding-next").textContent = last ? "Get started" : "Next";
}

function openOnboarding() {
  onboardingIndex = 0;
  overlayReturnFocus = document.activeElement;
  renderOnboardingSlide();
  $("onboarding-overlay").classList.remove("hidden");
  $("onboarding-next").focus();
}

function closeOnboarding() {
  $("onboarding-overlay").classList.add("hidden");
  localStorage.setItem("onboardingDone", "1");
  overlayReturnFocus?.focus?.();
  overlayReturnFocus = null;
}

function onboardingNext() {
  if (onboardingIndex >= ONBOARDING_SLIDES.length - 1) {
    closeOnboarding();
    return;
  }
  onboardingIndex += 1;
  renderOnboardingSlide();
}

function onboardingBack() {
  if (onboardingIndex === 0) return;
  onboardingIndex -= 1;
  renderOnboardingSlide();
}

// Show the tour once, after the app is unlocked and running.
function maybeShowOnboarding() {
  if (!localStorage.getItem("onboardingDone")) openOnboarding();
}

$("onboarding-next").addEventListener("click", onboardingNext);
$("onboarding-back").addEventListener("click", onboardingBack);
$("onboarding-skip").addEventListener("click", closeOnboarding);
$("show-guide-btn").addEventListener("click", () => {
  closeSettingsModal();
  openOnboarding();
});

// Keyboard-shortcuts cheat-sheet (press ?), a learnability aid.
// --- rebindable keyboard shortcuts -----------------------------------------------
// The shortcuts used to be hardcoded in the keydown handler, which meant they
// were whatever we'd guessed — no help if one clashes with your OS, your
// browser, or a habit from another app.
//
// Only shortcuts that trigger an *action* are rebindable. Escape (close),
// Tab (move focus) and the arrow keys (move between tabs) deliberately are
// not: they're the conventions every app shares, and letting someone rebind
// Escape is how you end up unable to close the dialog you rebound it in.

const DEFAULT_SHORTCUTS = {
  palette: { keys: "Ctrl+K", label: "Open the command palette" },
  search: { keys: "/", label: "Jump to search (or the chat box on Chat)" },
  help: { keys: "?", label: "Show this shortcuts list" },
  newNote: { keys: "Ctrl+Shift+N", label: "Start a new note" },
  newDocument: { keys: "Ctrl+Shift+D", label: "Start a new document" },
  toggleTheme: { keys: "Ctrl+Shift+L", label: "Switch light / dark" },
};

const SHORTCUT_STORE = "keyboardShortcuts";

function loadShortcuts() {
  let saved = {};
  try {
    saved = JSON.parse(localStorage.getItem(SHORTCUT_STORE) || "{}");
  } catch {
    saved = {}; // unreadable — fall back to defaults rather than throwing
  }
  const merged = {};
  for (const [id, def] of Object.entries(DEFAULT_SHORTCUTS)) {
    merged[id] = { ...def, keys: saved[id] || def.keys };
  }
  return merged;
}

let shortcuts = loadShortcuts();

function saveShortcutOverrides() {
  // Only store what differs from the defaults, so improving a default later
  // reaches everyone who never changed it.
  const overrides = {};
  for (const [id, def] of Object.entries(DEFAULT_SHORTCUTS)) {
    if (shortcuts[id].keys !== def.keys) overrides[id] = shortcuts[id].keys;
  }
  localStorage.setItem(SHORTCUT_STORE, JSON.stringify(overrides));
}

// A keyboard event -> the canonical string we compare against, e.g. "Ctrl+K".
function comboFromEvent(event) {
  const parts = [];
  if (event.ctrlKey || event.metaKey) parts.push("Ctrl");
  if (event.altKey) parts.push("Alt");
  if (event.shiftKey) parts.push("Shift");
  let key = event.key;
  if (key === " ") key = "Space";
  // Single letters normalise to uppercase so "Ctrl+k" and "Ctrl+K" are one
  // shortcut; longer names (Enter, ArrowUp) keep their own capitalisation.
  if (key.length === 1) key = key.toUpperCase();
  // A bare modifier isn't a shortcut yet — the user is still mid-chord.
  if (["Control", "Meta", "Alt", "Shift"].includes(event.key)) return null;
  parts.push(key);
  return parts.join("+");
}

// "?" is Shift+/ on most layouts; treat the typed character as the shortcut so
// a user who binds "?" doesn't have to know that.
function matchesShortcut(event, combo) {
  if (comboFromEvent(event) === combo) return true;
  return combo.length === 1 && event.key === combo && !event.ctrlKey && !event.metaKey;
}

function runShortcut(id) {
  const actions = {
    palette: () => {
      if ($("palette-overlay").classList.contains("hidden")) openPalette();
      else closePalette();
    },
    search: () => {
      if (localStorage.getItem("activeTab") === "chat") {
        $("chat-input").focus();
      } else {
        switchTab("notes");
        $("note-search").focus();
      }
    },
    help: openShortcuts,
    newNote: () => {
      switchTab("notes");
      $("entry-content").focus();
    },
    newDocument: () => {
      switchTab("documents");
      createDocument();
    },
    toggleTheme,
  };
  actions[id]?.();
}

function resetShortcuts() {
  localStorage.removeItem(SHORTCUT_STORE);
  shortcuts = loadShortcuts();
  renderShortcutList();
  toast("Shortcuts reset to their defaults.");
}

let capturingShortcut = null; // the id being rebound, or null

function renderShortcutList() {
  const list = $("shortcut-list");
  list.replaceChildren();
  for (const [id, def] of Object.entries(shortcuts)) {
    const li = document.createElement("li");
    const combo = document.createElement("kbd");
    combo.textContent = capturingShortcut === id ? "Press keys…" : def.keys;
    if (capturingShortcut === id) combo.classList.add("capturing");

    const label = document.createElement("span");
    label.textContent = def.label;

    const change = document.createElement("button");
    change.className = "ghost small";
    change.type = "button";
    change.textContent = capturingShortcut === id ? "Cancel" : "Change";
    change.setAttribute("aria-label", `Change the shortcut for: ${def.label}`);
    change.addEventListener("click", () => {
      capturingShortcut = capturingShortcut === id ? null : id;
      $("shortcut-status").textContent = capturingShortcut
        ? "Press the keys you want, or Escape to cancel."
        : "";
      renderShortcutList();
    });

    // Only offer "default" when it isn't already the default.
    const changed = def.keys !== DEFAULT_SHORTCUTS[id].keys;
    li.append(combo, label, change);
    if (changed) {
      const revert = document.createElement("button");
      revert.className = "ghost small";
      revert.type = "button";
      revert.textContent = "↺";
      revert.title = `Back to ${DEFAULT_SHORTCUTS[id].keys}`;
      revert.setAttribute("aria-label", revert.title);
      revert.addEventListener("click", () => {
        shortcuts[id].keys = DEFAULT_SHORTCUTS[id].keys;
        saveShortcutOverrides();
        renderShortcutList();
      });
      li.appendChild(revert);
    }
    list.appendChild(li);
  }
}

// While rebinding, this handler runs before everything else and swallows the
// keypress — otherwise pressing Ctrl+K to rebind it would also open the
// palette you're trying to move.
function captureShortcutKey(event) {
  if (!capturingShortcut) return false;
  if (event.key === "Escape") {
    capturingShortcut = null;
    $("shortcut-status").textContent = "";
    renderShortcutList();
    return true;
  }
  const combo = comboFromEvent(event);
  if (!combo) return true; // still holding modifiers

  const clash = Object.entries(shortcuts).find(
    ([otherId, def]) => otherId !== capturingShortcut && def.keys === combo
  );
  if (clash) {
    // Refuse rather than silently stealing it — two actions on one key means
    // one of them quietly stops working.
    $("shortcut-status").classList.add("error");
    $("shortcut-status").textContent = `${combo} is already used for "${clash[1].label}".`;
    return true;
  }
  shortcuts[capturingShortcut].keys = combo;
  saveShortcutOverrides();
  capturingShortcut = null;
  $("shortcut-status").classList.remove("error");
  $("shortcut-status").textContent = `Set to ${combo}.`;
  renderShortcutList();
  return true;
}

function openShortcuts() {
  capturingShortcut = null;
  $("shortcut-status").textContent = "";
  renderShortcutList();
  $("shortcuts-overlay").classList.remove("hidden");
  $("shortcuts-close").focus();
}
function closeShortcuts() {
  // Stop listening for a rebind. Without this, closing the dialog mid-capture
  // leaves the handler swallowing every keypress in the app — the shortcut you
  // just set appears dead, and so does everything else.
  capturingShortcut = null;
  $("shortcuts-overlay").classList.add("hidden");
}
// Tools & features browser (opened from the dashboard quick links).
$("features-close").addEventListener("click", closeFeatures);
$("features-search").addEventListener("input", (e) => renderFeatures(e.target.value));
$("features-overlay").addEventListener("click", (e) => {
  if (e.target === $("features-overlay")) closeFeatures();
});

$("shortcuts-close").addEventListener("click", closeShortcuts);
$("shortcuts-overlay").addEventListener("click", (e) => {
  if (e.target === $("shortcuts-overlay")) closeShortcuts();
});

document.addEventListener("keydown", (e) => {
  if (e.key !== "Tab") return;
  const overlay = activeOverlay();
  if (!overlay) return;
  const focusables = [
    ...overlay.querySelectorAll("button, [href], input, select, textarea"),
  ].filter((el) => !el.disabled && el.offsetParent !== null);
  if (!focusables.length) return;
  const first = focusables[0];
  const last = focusables[focusables.length - 1];
  const outside = !overlay.contains(document.activeElement);
  if (e.shiftKey && (document.activeElement === first || outside)) {
    e.preventDefault();
    last.focus();
  } else if (!e.shiftKey && (document.activeElement === last || outside)) {
    e.preventDefault();
    first.focus();
  }
});

// --- Wave F wiring ------------------------------------------------------------------

// Wave J: note search + sort, capture char count.
$("note-search").addEventListener("input", (e) => {
  noteSearch = e.target.value.trim();
  // Nothing to save when the box is empty; the button appears when it isn't.
  $("save-search").classList.toggle("hidden", !noteSearch);
  renderEntries();
});
$("note-sort").addEventListener("change", (e) => {
  noteSort = e.target.value;
  renderEntries();
});
$("entry-content").addEventListener("input", (e) => {
  const n = e.target.value.length;
  $("entry-count").textContent = `${n} character${n === 1 ? "" : "s"}`;
  // Keep a draft so a half-typed thought survives a reload or a stray tab
  // switch — losing one is the most annoying thing this app could do.
  if (n) localStorage.setItem("captureDraft", e.target.value);
  else localStorage.removeItem("captureDraft");
});

// Restore an unsaved draft on load.
(() => {
  const draft = localStorage.getItem("captureDraft");
  if (!draft) return;
  const box = $("entry-content");
  box.value = draft;
  $("entry-count").textContent = `${draft.length} character${draft.length === 1 ? "" : "s"}`;
  const status = $("save-status");
  if (status) status.textContent = "Restored your unsaved draft.";
})();

$("export-md").addEventListener("click", () => downloadExport("markdown"));
$("import-md").addEventListener("click", importMarkdown);
$("backup-now").addEventListener("click", backupNow);

$("palette-input").addEventListener("input", () => {
  paletteIndex = 0;
  renderPalette($("palette-input").value);
});
$("palette-input").addEventListener("keydown", paletteKeydown);
$("palette-overlay").addEventListener("click", (e) => {
  if (e.target === $("palette-overlay")) closePalette();
});

$("sketch-btn").addEventListener("click", openSketch);
$("sketch-close").addEventListener("click", closeSketch);
$("sketch-save").addEventListener("click", saveSketch);
$("sketch-clear").addEventListener("click", () => {
  const canvas = $("sketch-canvas");
  const context = canvas.getContext("2d");
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, canvas.width, canvas.height);
});
$("sketch-eraser").addEventListener("click", () => {
  sketchPen.eraser = !sketchPen.eraser;
  $("sketch-eraser").classList.toggle("active", sketchPen.eraser);
});
$("sketch-size").addEventListener("input", () => {
  sketchPen.size = Number($("sketch-size").value);
});
for (const button of document.querySelectorAll(".sketch-color")) {
  button.addEventListener("click", () => {
    sketchPen.color = button.dataset.color;
    sketchPen.eraser = false;
    $("sketch-eraser").classList.remove("active");
    document
      .querySelectorAll(".sketch-color")
      .forEach((b) => b.classList.toggle("active", b === button));
  });
}
const sketchCanvas = $("sketch-canvas");
sketchCanvas.addEventListener("pointerdown", sketchStart);
sketchCanvas.addEventListener("pointermove", sketchMove);
sketchCanvas.addEventListener("pointerup", sketchEnd);
sketchCanvas.addEventListener("pointerleave", sketchEnd);

// Wave H: dictation + read-aloud.
$("mic-note").addEventListener("click", () =>
  toggleDictation($("mic-note"), $("entry-content"))
);
$("mic-chat").addEventListener("click", () =>
  toggleDictation($("mic-chat"), $("chat-input"))
);
$("speak-btn").addEventListener("click", () => speakText($("ai-answer").textContent));

// PWA: the shell caches itself so the app opens instantly (Wave F).
// When a new service worker takes over (after an update), reload once so
// the page never runs new HTML against stale cached CSS/JS (Wave O fix).
if ("serviceWorker" in navigator) {
  // Only reload when an EXISTING worker is replaced (a real update) — not
  // on the first install, whose clients.claim() also fires controllerchange
  // and would reload the page mid-setup (Wave O fix).
  const hadController = Boolean(navigator.serviceWorker.controller);
  navigator.serviceWorker.register("/sw.js").catch(() => {});
  let swReloaded = false;
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (!hadController || swReloaded) return;
    swReloaded = true;
    location.reload();
  });
}


// The generative brand emblem, unique each visit (Wave O). p5 is loaded
// by now; draw once the page is ready.
renderBrandLogo();

initAuth();
