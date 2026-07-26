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

  // First-run welcome tour (guarded by localStorage; re-runnable from Help).
  maybeShowOnboarding();
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
  const stamp = options.bin ? entry.deleted_at : entry.created_at;
  date.textContent = relativeTime(stamp);
  date.title = new Date(stamp).toLocaleString(); // exact on hover
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
    meta.appendChild(actions);
  }
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
  try {
    const result = await apiJson(`/entries/${entry.id}/reevaluate`, { method: "POST" });
    inlineAction = { id: entry.id, kind: "reevaluate", data: result };
    await loadEntries(); // reflect the refreshed confidence/category, then show suggestions
  } catch (error) {
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
function matchesSearch(entry) {
  if (!noteSearch) return true;
  const needle = noteSearch.toLowerCase();
  return (
    entry.content.toLowerCase().includes(needle) ||
    entry.tags.some((tag) => tag.toLowerCase().includes(needle))
  );
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

  $("entries-heading").textContent = activeCategory
    ? `${activeCategory} entries`
    : "All entries";
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
async function streamChat({
  question,
  history,
  persona,
  useTools,
  signal,
  onMeta,
  onThinking,
  onAnswer,
  onTool,
  onConfirm,
}) {
  const body = { question, history: history || [] };
  if (persona) body.persona = persona;
  if (typeof useTools === "boolean") body.use_tools = useTools;
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
        answerBox.querySelector(".typing-dots")?.remove();
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
function editAndResend(text) {
  const input = $("chat-input");
  input.value = text;
  input.focus();
  input.setSelectionRange(text.length, text.length);
}

// Re-run the most recent question, appending a fresh answer (no duplicate
// "you" bubble) so you can get another take after switching model/persona.
function regenerateLastAnswer() {
  if (!lastChatQuestion || chatController) return;
  sendChatMessage(lastChatQuestion, { skipUserBubble: true });
}

// The welcome shown in an empty chat so the page isn't a blank box.
function renderChatEmptyState() {
  const box = $("chat-messages");
  if (box.querySelector(".msg") || box.querySelector(".chat-empty")) return;
  const empty = document.createElement("div");
  empty.className = "chat-empty";
  empty.innerHTML =
    '<span class="chat-empty-icon" aria-hidden="true">💬</span>' +
    '<p class="empty-title">Chat with your notebook</p>' +
    '<p class="muted">Ask a question and the AI answers from your saved notes. ' +
    "Turn on “AI can make changes” and it can create, tag, link, and organise " +
    "notes for you too.</p>";
  box.appendChild(empty);
}

function clearChatEmptyState() {
  $("chat-messages").querySelector(".chat-empty")?.remove();
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
function typingDots() {
  const dots = document.createElement("span");
  dots.className = "typing-dots";
  for (let i = 0; i < 3; i++) dots.appendChild(document.createElement("span"));
  return dots;
}

function chatScrollToEnd() {
  const box = $("chat-messages");
  box.scrollTop = box.scrollHeight;
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
        { label: "✎", title: "Edit & resend", onClick: () => editAndResend(text) },
      ])
    );
  }
  $("chat-messages").appendChild(bubble);
  chatScrollToEnd();
  return bubble;
}

// An assistant bubble with its thinking box and matching-records slot.
function addAssistantBubble() {
  clearChatEmptyState();
  const bubble = document.createElement("div");
  bubble.className = "msg assistant";

  const label = document.createElement("div");
  label.className = "msg-role";
  label.textContent = assistantLabel();
  bubble.appendChild(label);

  const thinkingBox = document.createElement("details");
  thinkingBox.className = "hidden";
  const summary = document.createElement("summary");
  summary.textContent = "Model's thinking";
  const thinkingText = document.createElement("div");
  thinkingText.className = "thinking";
  thinkingBox.append(summary, thinkingText);

  // Tool activity (Wave G): "✏️ created note…" chips + confirm cards.
  const toolsHolder = document.createElement("div");
  toolsHolder.className = "tool-activity";

  const answerBox = document.createElement("div");
  answerBox.className = "bubble-answer";

  const recordsHolder = document.createElement("div");

  bubble.append(thinkingBox, toolsHolder, answerBox, recordsHolder);
  $("chat-messages").appendChild(bubble);
  chatScrollToEnd();
  return { bubble, thinkingBox, thinkingText, answerBox, toolsHolder, recordsHolder };
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

async function sendChatMessage(preset, opts = {}) {
  const input = $("chat-input");
  const status = $("chat-status");
  const question = (preset ?? input.value).trim();
  if (!question) return;
  lastChatQuestion = question;

  $("chat-suggest").classList.add("hidden");
  input.value = "";
  input.disabled = true;
  hide("chat-send");
  show("chat-stop");
  status.classList.remove("error");
  status.textContent = "Searching your notes…";

  // Regenerate re-runs the same question without adding a duplicate "you".
  if (!opts.skipUserBubble) addBubble("user", question);
  const { bubble, thinkingBox, thinkingText, answerBox, toolsHolder, recordsHolder } =
    addAssistantBubble();
  answerBox.appendChild(typingDots()); // until the first token arrives
  const renderLive = liveMarkdownRenderer(answerBox);
  let answerRaw = "";
  let thinkingRaw = "";
  let meta = null;
  let toolsActed = false;
  chatController = new AbortController();

  try {
    await streamChat({
      question,
      history: chatConv.turns.slice(-MAX_CLIENT_HISTORY),
      persona: $("persona-select").value || null,
      useTools: opts.useTools ?? $("tools-toggle").checked,
      signal: chatController.signal,
      onMeta: (m) => {
        meta = m;
        status.textContent = "The model is writing…";
      },
      onThinking: (delta) => {
        answerBox.querySelector(".typing-dots")?.remove();
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
        renderLive(answerRaw); // live markdown (user request; replaces the dots)
        status.textContent = "The model is writing…";
        chatScrollToEnd();
      },
      onTool: (event) => {
        answerBox.querySelector(".typing-dots")?.remove();
        toolsHolder.appendChild(
          toolChip(event.ok ? event.label : `⚠️ ${event.error || event.label}`, event.ok)
        );
        if (event.ok) toolsActed = true;
        status.textContent = "The model is making changes…";
        chatScrollToEnd();
      },
      onConfirm: (event) => {
        answerBox.querySelector(".typing-dots")?.remove();
        renderToolConfirm(toolsHolder, event);
        status.textContent = "Waiting for your confirmation…";
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
  if (toolsActed) refreshAfterToolChanges(); // the AI changed real data
  if (!answerRaw) return; // nothing to remember (failed before any token)
  // Per-message actions: copy, regenerate, read-aloud (Wave H voices).
  bubble.appendChild(
    chatMessageActions([
      { label: "⧉", title: "Copy answer", onClick: (e) => copyToClipboard(answerRaw, e.currentTarget) },
      { label: "↻", title: "Regenerate", onClick: () => regenerateLastAnswer() },
      { label: "🔊", title: "Read aloud", onClick: () => speakText(answerBox.textContent) },
    ])
  );

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
      const turnIndex = chatConv.turns.length; // index this pair will occupy
      handles.bubble.appendChild(
        chatMessageActions([
          { label: "⧉", title: "Copy answer", onClick: (e) => copyToClipboard(message.content, e.currentTarget) },
          { label: "🔊", title: "Read aloud", onClick: () => speakText(handles.answerBox.textContent) },
          { label: "🗑", title: "Delete this exchange", onClick: () => deleteConversationTurn(full.id, turnIndex) },
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

// Delete one saved question/answer exchange, then re-render the conversation
// from the server so the on-screen state can never drift from what's stored.
async function deleteConversationTurn(id, index) {
  if (!confirm("Delete this question and answer from the chat?")) return;
  try {
    await api(`/conversations/${id}/turns/${index}`, { method: "DELETE" });
  } catch (error) {
    toast(`Couldn't delete: ${error.message}`, true);
    return;
  }
  openConversation(id);
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
};

function dashLayout() {
  const saved = (prefsCache && prefsCache.dashboard_layout) || {};
  const order = [...(saved.order || [])];
  for (const name of Object.keys(DASH_WIDGETS)) {
    if (!order.includes(name)) order.push(name); // new widgets append
  }
  return { order: order.filter((n) => DASH_WIDGETS[n]), hidden: saved.hidden || [] };
}

async function saveDashLayout(layout) {
  prefsCache = await apiJson("/preferences", {
    method: "PUT",
    body: JSON.stringify({ dashboard_layout: layout }),
  }).catch(() => prefsCache);
}

// Time-of-day greeting, personalised with the saved display name if set.
function renderDashboardGreeting() {
  const el = $("dash-greeting");
  if (!el) return;
  const hour = new Date().getHours();
  const part =
    hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const name = ((prefsCache && prefsCache.display_name) || "").trim();
  el.textContent = name ? `${part}, ${name}` : part;
}

async function renderDashboard() {
  // The saved layout lives in preferences — after a page reload this can
  // run before startApp has fetched them, so fetch here if needed.
  if (!prefsCache) {
    prefsCache = await apiJson("/preferences").catch(() => null);
  }
  renderDashboardGreeting();
  const grid = $("dash-grid");
  grid.replaceChildren();
  $("dash-hint").classList.toggle("hidden", !dashEditMode); // hint only in edit mode
  const layout = dashLayout();

  for (const name of layout.order) {
    const hidden = layout.hidden.includes(name);
    if (hidden && !dashEditMode) continue;

    const widget = DASH_WIDGETS[name];
    const card = document.createElement("section");
    card.className = "card dash-widget" + (hidden ? " dash-hidden" : "");
    card.dataset.widget = name;

    const header = document.createElement("div");
    header.className = "row space-between";
    const title = document.createElement("h2");
    title.textContent = widget.title;
    header.appendChild(title);
    if (dashEditMode) {
      const controls = document.createElement("span");
      controls.className = "entry-actions";
      controls.appendChild(
        smallButton(hidden ? "Show" : "Hide", "", async () => {
          const next = dashLayout();
          next.hidden = hidden
            ? next.hidden.filter((n) => n !== name)
            : [...next.hidden, name];
          await saveDashLayout(next);
          renderDashboard();
        })
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

function renderArtWidget(body) {
  const holder = document.createElement("div");
  holder.className = "art-holder";
  body.appendChild(holder);

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
    li.textContent =
      entry.content.length > 70 ? entry.content.slice(0, 69) + "…" : entry.content;
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
function generateDigest() {
  if (!digestPromise) {
    digestPromise = apiJson("/insights/digest", { method: "POST" })
      .then((result) => {
        if (result.cacheable !== false) {
          localStorage.setItem(
            DIGEST_KEY,
            JSON.stringify({ text: result.digest, date: todayStamp() })
          );
        }
        return result.digest;
      })
      .finally(() => {
        digestPromise = null;
      });
  }
  return digestPromise;
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
    thinking.append(typingDots(), " Thinking about your week…");
    body.replaceChildren(thinking);
    generateDigest()
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
    body.appendChild(
      smallButton("Generate this week's digest", "", runGeneration, false)
    );
  }
}

async function renderQuickCaptureWidget(body) {
  const textarea = document.createElement("textarea");
  textarea.rows = 2;
  textarea.placeholder = "Type a thought and press Save — the AI files it.";
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

async function loadReminders() {
  const reminders = await apiJson("/reminders").catch(() => []);
  const groupsBox = $("reminder-groups");
  groupsBox.replaceChildren();
  $("reminders-empty").classList.toggle("hidden", reminders.length > 0);

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

  for (const label of ["Overdue", "Today", "Upcoming", "Done"]) {
    const items = groups[label];
    if (!items.length) continue;
    const heading = document.createElement("h3");
    heading.className = "reminder-group-head";
    heading.textContent = `${label} (${items.length})`;
    groupsBox.appendChild(heading);
    const ul = document.createElement("ul");
    ul.className = "entry-list";
    for (const reminder of items) ul.appendChild(reminderItem(reminder, label));
    groupsBox.appendChild(ul);
  }
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
  if (preset === "3h") d.setHours(d.getHours() + 3);
  else if (preset === "tomorrow") (d.setDate(d.getDate() + 1), d.setHours(9, 0, 0, 0));
  else if (preset === "nextweek") (d.setDate(d.getDate() + 7), d.setHours(9, 0, 0, 0));
  return d;
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
      body: JSON.stringify({ text }),
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
function defaultDueValue() {
  const due = new Date();
  due.setDate(due.getDate() + 1);
  due.setHours(9, 0, 0, 0);
  // datetime-local wants "YYYY-MM-DDTHH:MM" in local time.
  const pad = (n) => String(n).padStart(2, "0");
  return `${due.getFullYear()}-${pad(due.getMonth() + 1)}-${pad(due.getDate())}T${pad(due.getHours())}:${pad(due.getMinutes())}`;
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

  graphSimulation = d3
    .forceSimulation(nodes)
    .force(
      "link",
      d3
        .forceLink(edges)
        .id((d) => d.id)
        .distance((d) => (d.kind === "similar" ? 130 : 80))
    )
    // More repulsion + a mild centring pull → notes spread out and fill
    // the space instead of clumping in the middle (Wave N polish).
    .force("charge", d3.forceManyBody().strength(-340))
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
    .on("click", (_event, d) => flashEntry(d.id))
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

  nodeGroups
    .append("circle")
    .attr("r", graphNodeRadius)
    .attr("fill", (d) => color(d.category))
    .classed("graph-pinned", (d) => d.pinned);
  // Native tooltip: full preview + category on hover.
  nodeGroups.append("title").text((d) => `${d.preview}\n[${d.category}]`);
  nodeGroups
    .append("text")
    .attr("dy", (d) => graphNodeRadius(d) + 12)
    .text((d) => (d.preview.length > 20 ? d.preview.slice(0, 19) + "…" : d.preview));

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
function applyGraphHighlight() {
  if (!graphNodeSelection) return;
  const query = $("graph-search").value.trim().toLowerCase();
  const searchOk = (d) => !query || d.preview.toLowerCase().includes(query);

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
    const bySearch = !query || (searchOk(d.source) && searchOk(d.target));
    const byHover =
      neighbours == null || s === graphHoveredId || t === graphHoveredId;
    return !(bySearch && byHover);
  });
}

// --- tabs (Wave A) ----------------------------------------------------------------

const TABS = ["dashboard", "notes", "chat", "graph", "reminders"];

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
  // The generative-art animation only needs to run while it's on screen.
  if (name !== "dashboard") stopArt();
  if (name === "chat") {
    renderChatEmptyState(); // welcome placeholder when the thread is empty
    loadChatSuggestions();
    $("chat-input").focus();
  }
  if (name === "dashboard") renderDashboard();
  if (name === "graph") renderGraph();
  if (name === "reminders") {
    if (!$("reminder-due").value) $("reminder-due").value = defaultDueValue();
    loadReminders();
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

const SETTINGS_SECTIONS = ["models", "personas", "skills", "tools", "appearance", "preferences", "tasks", "data", "logs", "help", "about"];

// Where to send focus back when a dialog closes (Wave L).
let overlayReturnFocus = null;

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
    { label: "⏰ Go to Reminders", run: () => switchTab("reminders") },
    {
      label: "✏️ New note",
      run: () => {
        switchTab("notes");
        $("entry-content").focus();
      },
    },
    { label: "🆕 New chat", run: () => { switchTab("chat"); newChatConversation(); } },
    { label: "🎨 New sketch", run: openSketch },
    { label: "⚙️ Settings → Models", run: () => openSettingsModal("models") },
    { label: "🎭 Settings → Personas", run: () => openSettingsModal("personas") },
    { label: "⚡ Settings → Skills", run: () => openSettingsModal("skills") },
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

  if (status.ollama_running) {
    renderChatModelPicker(status);
    renderUtilityModelPicker(status);
    renderEmbeddingPicker(status);
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
  const names = status.installed_models.map((m) => m.name);
  fillModelSelect(
    $("embedding-model-select"),
    names,
    null,
    status.embedding_model
  );
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
];

function activeAccent() {
  return localStorage.getItem("accent") || "indigo";
}

function applyAccent(name) {
  if (name === "indigo") delete document.documentElement.dataset.accent;
  else document.documentElement.dataset.accent = name;
  localStorage.setItem("accent", name);
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
  density: "comfortable",
  glass: "on",
  motion: "auto", // "auto" = follow the OS; "reduced" = force-still
  "bg-intensity": "90",
};

function appearancePref(key) {
  return localStorage.getItem(key) || APPEARANCE_DEFAULTS[key];
}

// Applied once at startup (called from the pre-paint path) and on change.
function applyAppearance() {
  const root = document.documentElement;
  root.dataset.fontsize = appearancePref("fontsize");
  root.dataset.font = appearancePref("font");
  root.dataset.density = appearancePref("density");
  root.dataset.glass = appearancePref("glass");
  root.dataset.motion = appearancePref("motion");
  root.style.setProperty("--bg-art-opacity", Number(appearancePref("bg-intensity")) / 100);
}

function effectiveTheme() {
  return localStorage.getItem("theme") || "system";
}

function applyThemeChoice(choice) {
  if (choice === "system") {
    delete document.documentElement.dataset.theme;
    localStorage.removeItem("theme");
  } else {
    document.documentElement.dataset.theme = choice;
    localStorage.setItem("theme", choice);
  }
  if (bgArtOn()) startBgArt();
  renderBrandLogo();
}

function _segActive(groupId, attr, value) {
  for (const b of document.querySelectorAll(`#${groupId} button`)) {
    b.classList.toggle("active", b.dataset[attr] === value);
  }
}

function renderAppearance() {
  const holder = $("accent-swatches");
  holder.replaceChildren();
  for (const accent of ACCENTS) {
    const button = document.createElement("button");
    button.className = "accent-swatch";
    button.style.background = accent.swatch;
    button.title = accent.label;
    button.setAttribute("aria-label", `${accent.label} accent`);
    button.classList.toggle("active", accent.name === activeAccent());
    button.addEventListener("click", () => {
      applyAccent(accent.name);
      renderAppearance();
    });
    holder.appendChild(button);
  }
  $("contrast-toggle").checked = contrastOn();
  $("reduce-motion-toggle").checked = appearancePref("motion") === "reduced";
  $("bg-art-toggle").checked = bgArtOn();
  $("glass-toggle").checked = appearancePref("glass") === "on";
  $("bg-intensity").value = appearancePref("bg-intensity");
  _segActive("theme-seg", "themeChoice", effectiveTheme());
  _segActive("fontsize-seg", "fontsize", appearancePref("fontsize"));
  _segActive("font-seg", "font", appearancePref("font"));
  _segActive("density-seg", "density", appearancePref("density"));
}

function resetAppearance() {
  for (const key of ["fontsize", "font", "density", "glass", "motion", "bg-intensity", "accent", "contrast", "bgArt", "theme"]) {
    localStorage.removeItem(key);
  }
  delete document.documentElement.dataset.accent;
  delete document.documentElement.dataset.contrast;
  delete document.documentElement.dataset.theme;
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

function startBgArt() {
  stopBgArt();
  if (typeof p5 === "undefined") return;
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const accentHex =
    (ACCENTS.find((a) => a.name === activeAccent()) || ACCENTS[0]).swatch;
  const dark =
    document.documentElement.dataset.theme === "dark" ||
    (!document.documentElement.dataset.theme &&
      window.matchMedia("(prefers-color-scheme: dark)").matches);

  // A flowing "aurora": particles drift along a Perlin flow field and
  // leave faint trails, over a giant slow-turning constellation emblem —
  // the same node-and-link motif as the logo, blown up (Wave O rework).
  const sketch = (p) => {
    let particles = [];
    let baseHue = 230;
    let emblem = [];

    const drawEmblem = (t) => {
      // A large, very faint ring of linked nodes, slowly rotating.
      const cx = p.width / 2;
      const cy = p.height / 2;
      const radius = Math.min(p.width, p.height) * 0.32;
      p.push();
      p.translate(cx, cy);
      p.rotate(t * 0.02);
      p.stroke(baseHue, 50, dark ? 70 : 45, 0.05);
      p.strokeWeight(1.5);
      for (let i = 0; i < emblem.length; i++) {
        for (let j = i + 1; j < emblem.length; j++) {
          if ((i + j) % 3 === 0) {
            p.line(
              Math.cos(emblem[i]) * radius,
              Math.sin(emblem[i]) * radius,
              Math.cos(emblem[j]) * radius,
              Math.sin(emblem[j]) * radius
            );
          }
        }
      }
      p.noStroke();
      for (const a of emblem) {
        p.fill(baseHue, 55, dark ? 72 : 42, 0.07);
        p.circle(Math.cos(a) * radius, Math.sin(a) * radius, 16);
      }
      p.pop();
    };

    const draw = () => {
      const t = p.frameCount * 0.01;
      // Translucent wash instead of clear → the particles leave trails.
      p.noStroke();
      p.fill(dark ? 12 : 250, dark ? 0.14 : 0.16);
      p.rect(0, 0, p.width, p.height);
      drawEmblem(t);
      for (const dot of particles) {
        const angle =
          p.noise(dot.x * 0.0016, dot.y * 0.0016, t * 0.15) * Math.PI * 4;
        dot.x += Math.cos(angle) * dot.speed;
        dot.y += Math.sin(angle) * dot.speed;
        if (dot.x < 0) dot.x = p.width;
        if (dot.x > p.width) dot.x = 0;
        if (dot.y < 0) dot.y = p.height;
        if (dot.y > p.height) dot.y = 0;
        p.fill(dot.hue, 65, dark ? 68 : 55, 0.5);
        p.circle(dot.x, dot.y, dot.size);
      }
    };

    p.setup = () => {
      const c = p.createCanvas(window.innerWidth, window.innerHeight);
      c.id("bg-art-canvas");
      // RGB for the wash rect, HSL for the coloured marks — p5 lets us
      // switch, but simplest to keep one mode; use HSL and a grey wash.
      p.colorMode(p.HSL, 360, 100, 100, 1);
      p.noStroke();
      baseHue = p.hue(p.color(accentHex));
      for (let i = 0; i < 70; i++) {
        particles.push({
          x: p.random(p.width),
          y: p.random(p.height),
          speed: p.random(0.3, 1.1),
          size: p.random(1.5, 3.5),
          hue: (baseHue + p.random(-24, 24) + 360) % 360,
        });
      }
      emblem = Array.from({ length: 9 }, (_, i) => (i / 9) * Math.PI * 2);
      p.frameRate(30);
      if (reduceMotion) {
        // One calm static frame — no motion for reduced-motion users.
        p.background(dark ? 12 : 250);
        drawEmblem(0);
        p.noLoop();
      }
    };
    p.draw = draw;
    p.windowResized = () => p.resizeCanvas(window.innerWidth, window.innerHeight);
  };
  bgArtInstance = new p5(sketch);
  const canvas = document.getElementById("bg-art-canvas");
  if (canvas) canvas.className = "bg-art-canvas";
}

// --- Wave O: the p5 brand logo (unique each load) -----------------------------------

let brandLogoInstance = null;

// A tiny generative emblem next to the title: a ring of linked nodes (the
// MemoryMap motif), coloured in the accent, seeded randomly each visit so
// it's one-of-a-kind, with a slow rotation.
function renderBrandLogo() {
  if (typeof p5 === "undefined") return;
  const holder = $("brand-logo");
  if (!holder) return;
  if (brandLogoInstance) {
    brandLogoInstance.remove();
    brandLogoInstance = null;
  }
  const accentHex =
    (ACCENTS.find((a) => a.name === activeAccent()) || ACCENTS[0]).swatch;
  const seed = Math.floor(Math.random() * 1e6);
  const SIZE = 34;

  const sketch = (p) => {
    let nodes = [];
    let baseHue = 230;
    p.setup = () => {
      p.createCanvas(SIZE, SIZE);
      p.colorMode(p.HSL, 360, 100, 100, 1);
      p.randomSeed(seed);
      baseHue = p.hue(p.color(accentHex));
      const count = 4 + Math.floor(p.random(3)); // 4-6 nodes
      nodes = Array.from({ length: count }, (_, i) => ({
        angle: (i / count) * p.TWO_PI + p.random(-0.3, 0.3),
        hue: (baseHue + p.random(-40, 40) + 360) % 360,
      }));
      p.frameRate(24);
    };
    p.draw = () => {
      p.clear();
      p.translate(SIZE / 2, SIZE / 2);
      p.rotate(p.frameCount * 0.006);
      const r = SIZE * 0.32;
      p.stroke(baseHue, 60, 60, 0.6);
      p.strokeWeight(1);
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
        p.circle(Math.cos(n.angle) * r, Math.sin(n.angle) * r, 6);
      }
      p.fill(baseHue, 70, 62, 1);
      p.circle(0, 0, 5); // a bright hub
    };
  };
  brandLogoInstance = new p5(sketch, holder);
}

function toggleBgArt(on) {
  localStorage.setItem("bgArt", on ? "on" : "off");
  if (on) startBgArt();
  else stopBgArt();
}

// --- wiring --------------------------------------------------------------------

$("theme-btn").addEventListener("click", toggleTheme);
$("bg-art-toggle").addEventListener("change", (e) => toggleBgArt(e.target.checked));
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
});
$("reduce-motion-toggle").addEventListener("change", (e) => {
  localStorage.setItem("motion", e.target.checked ? "reduced" : "auto");
  applyAppearance();
  if (e.target.checked) stopBgArt(); // a still UI shouldn't keep the art running
  else if (bgArtOn()) startBgArt();
});
$("bg-intensity").addEventListener("input", (e) => {
  localStorage.setItem("bg-intensity", e.target.value);
  applyAppearance();
});
$("appearance-reset").addEventListener("click", resetAppearance);

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
$("graph-refresh").addEventListener("click", renderGraph);
$("graph-similarity").addEventListener("change", renderGraph);
$("graph-hide-orphans").addEventListener("change", renderGraph);
$("graph-search").addEventListener("input", applyGraphHighlight);

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
  toast(next ? "Web search on — the AI can search when you ask." : "Web search off.");
});

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
  }
});
$("reminder-magic-add").addEventListener("click", magicAddReminder);
$("reminder-magic").addEventListener("keydown", (e) => {
  if (e.key === "Enter") magicAddReminder();
});
for (const button of document.querySelectorAll("#reminder-presets button")) {
  button.addEventListener("click", () => {
    $("reminder-due").value = toLocalInputValue(presetDate(button.dataset.preset).toISOString());
    if (!$("reminder-text").value.trim()) $("reminder-text").focus();
  });
}
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
  if (e.key === "Enter" && e.ctrlKey) saveEntry();
});
document.addEventListener("keydown", (e) => {
  // Ctrl/Cmd-K: the command palette, from anywhere (Wave F).
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
    e.preventDefault();
    if ($("palette-overlay").classList.contains("hidden")) openPalette();
    else closePalette();
    return;
  }
  if (e.key === "Escape" && !$("onboarding-overlay").classList.contains("hidden")) {
    closeOnboarding();
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
  // "?" (Shift-/) opens the keyboard-shortcuts cheat-sheet.
  if (e.key === "?" && !typing && !overlayOpen) {
    e.preventDefault();
    openShortcuts();
    return;
  }
  if (e.key === "/" && !typing && !overlayOpen) {
    e.preventDefault();
    // On the Chat tab the natural target is the chat box; elsewhere the
    // Notes filter (switching to Notes if needed).
    if (localStorage.getItem("activeTab") === "chat") {
      $("chat-input").focus();
    } else {
      switchTab("notes");
      $("note-search").focus();
    }
    return;
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
function openShortcuts() {
  $("shortcuts-overlay").classList.remove("hidden");
  $("shortcuts-close").focus();
}
function closeShortcuts() {
  $("shortcuts-overlay").classList.add("hidden");
}
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
  renderEntries();
});
$("note-sort").addEventListener("change", (e) => {
  noteSort = e.target.value;
  renderEntries();
});
$("entry-content").addEventListener("input", (e) => {
  const n = e.target.value.length;
  $("entry-count").textContent = `${n} character${n === 1 ? "" : "s"}`;
});

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

// Collapsible Notes-tab section cards: click a section heading to fold the
// card down to just its title row. State persists per-section in
// localStorage so a user's collapsed layout survives reloads. Additive —
// cards start expanded, exactly as before, unless the user collapses one.
function initCollapsibleCards() {
  let collapsed = {};
  try {
    collapsed = JSON.parse(localStorage.getItem("collapsedCards") || "{}");
  } catch {
    collapsed = {};
  }
  for (const cardId of ["capture", "ask", "browse"]) {
    const cardEl = $(cardId);
    if (!cardEl) continue;
    const heading = cardEl.querySelector("h2");
    if (!heading) continue;
    heading.classList.add("collapsible");
    heading.setAttribute("role", "button");
    heading.setAttribute("tabindex", "0");
    const setState = (isCollapsed) => {
      cardEl.classList.toggle("collapsed", isCollapsed);
      heading.setAttribute("aria-expanded", isCollapsed ? "false" : "true");
    };
    setState(Boolean(collapsed[cardId]));
    const toggle = () => {
      const isCollapsed = !cardEl.classList.contains("collapsed");
      setState(isCollapsed);
      collapsed[cardId] = isCollapsed;
      localStorage.setItem("collapsedCards", JSON.stringify(collapsed));
    };
    heading.addEventListener("click", toggle);
    heading.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        toggle();
      }
    });
  }
}
initCollapsibleCards();

// The generative brand emblem, unique each visit (Wave O). p5 is loaded
// by now; draw once the page is ready.
renderBrandLogo();

initAuth();
