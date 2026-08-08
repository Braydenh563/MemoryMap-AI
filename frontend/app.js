// MemoryMap AI frontend — plain JS, no framework (locked decision, plan §2).
// All DOM nodes are built with createElement/textContent, never innerHTML,
// so a note containing <script> is just text, not code.

// --- browser log capture (Wave A) -----------------------------------------------
// Installed before anything else runs so no message is missed. Shown in
// Settings → Logs alongside the server's records.

const browserLogs = [];
const MAX_BROWSER_LOGS = 500;

function recordBrowserLog(level, parts) {
  const record = {
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
  };
  browserLogs.push(record);
  if (browserLogs.length > MAX_BROWSER_LOGS) browserLogs.shift();

  // Live-push into the Logs page if it is currently open.
  // `logRecords`, `logScreenOpen`, and `renderLogList` are defined later in
  // this file, so guard with typeof to avoid errors during early boot.
  if (typeof logRecords !== "undefined" && typeof logScreenOpen !== "undefined") {
    const liveRecord = { ...record, source: "browser", logger: "browser",
      key: `b-live-${Date.now()}-${Math.random()}` };
    logRecords.push(liveRecord);
    if (typeof sortLogRecords === "function") sortLogRecords();
    if (logScreenOpen && typeof renderLogList === "function") {
      renderLogList();
      // Scroll to bottom so the new error is visible without manual scroll.
      if (typeof scrollLogToBottom === "function") scrollLogToBottom();
    }
    // Bump the error badge in the Logs button so the user knows to check.
    if (typeof bumpLogErrorBadge === "function") bumpLogErrorBadge(record);
  }
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
// Whether that has ever come back. An empty notebook and a notebook that
// has not loaded yet look identical from `allEntries.length` alone.
let entriesEverLoaded = false;
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
  // `ownsAuthErrors`: this call treats 401 as part of its own result rather
  // than as an expired session. Change-password answers 401 for "that isn't
  // your current password" — a typo there must show a message beside the
  // field, not throw the user out to the lock screen.
  const { silent, timeoutMs, ownsAuthErrors, ...fetchOptions } = options;
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
  } catch (networkErr) {
    // fetch() itself threw — this is a real network failure (offline, CORS,
    // connection refused). Log it explicitly so it always appears in Logs.
    if (!networkErr?.name === 'AbortError') {
      recordBrowserLog("ERROR", [
        `[Network] ${fetchOptions.method || 'GET'} ${path} — ${networkErr.message}`
      ]);
    }
    throw networkErr;
  } finally {
    if (timer) clearTimeout(timer);
  }
  if (response.status === 401 && !ownsAuthErrors) {
    if (!silent) showLockScreen(false); // token expired (e.g. app restarted)
    const locked = new Error("Locked");
    // Marked, so `startApp()`'s bootstrap loop can tell "the session expired"
    // apart from "this one endpoint failed". Reported: *"before signing in, a
    // popup shows a message saying failed to load entries"* — a stale token
    // in localStorage (server restarted since the last visit) makes `startApp`
    // fire a dozen requests in parallel before the user has unlocked
    // anything, every one of them hits this 401, and every one of them used
    // to toast its own "Couldn't load X: Locked" on top of the lock screen
    // that had already, correctly, just appeared. One state — not logged in
    // — was being reported as a dozen unrelated failures.
    locked.isLockout = true;
    throw locked;
  }
  if (!response.ok) {
    const detail = await response.json().catch(() => ({}));
    const errMsg = typeof detail.detail === 'string' ? detail.detail : (JSON.stringify(detail.detail) || `Request failed (${response.status})`);
    if (!silent) {
      // Log HTTP errors so they always appear in Settings → Logs for debugging.
      recordBrowserLog("ERROR", [
        `[HTTP ${response.status}] ${fetchOptions.method || 'GET'} ${path} — ${errMsg}`
      ]);
    }
    throw new Error(errMsg);
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
          // The lock screen already said what happened; a toast under it
          // repeating "Couldn't X: Locked" for every parallel step is noise
          // about one state dressed up as several failures.
          if (!error.isLockout) toast(`Couldn't ${label}: ${error.message}`, true);
        });
      }
      return Promise.resolve(result);
    } catch (error) {
      if (!error.isLockout) toast(`Couldn't ${label}: ${error.message}`, true);
      return Promise.resolve();
    }
  };

  // Before anything reads a stored setting: bring back whatever this browser
  // has lost. A shell that does not keep localStorage — the desktop window is
  // the reported one (§35E) — starts every launch with the default theme and
  // an onboarding tour it has already been through, because both live there
  // and nowhere else. The server's copy fills the gaps, then the look is
  // re-applied so the app settles into the remembered theme rather than
  // staying on the default it painted a moment ago.
  const looksReady = step("restore your settings", async () => {
    if (!prefsCache) {
      prefsCache = await apiJson("/preferences", { silent: true }).catch(() => null);
    }
    if (prefsCache && seedUiStateFromServer(prefsCache.ui_state)) {
      // The same three calls the theme picker makes, in the same order: the
      // root attributes, then the light/dark choice and the palette, neither
      // of which re-records itself as a manual override.
      applyAppearance();
      applyThemeChoice(appearancePref("theme"), false);
      applyPalette(appearancePref("palette"), false);
      renderBrandLogo();
      if (bgArtOn()) startBgArt();
    }
    
    // Always check battery efficient mode regardless of ui_state seeding
    const indicator = $("power-saver-indicator");
    if (indicator) {
      if (prefsCache && prefsCache.battery_efficient_mode) {
        indicator.classList.remove("hidden");
      } else {
        indicator.classList.add("hidden");
      }
    }
  });

  const entriesReady = step("load entries", loadEntries);
  step("load recent questions", loadRecentQuestions);
  step("load suggestions", loadSuggestions);
  step("load your most-used items", loadMostUsed);
  step("load templates", loadTemplates).then(() =>
    step("set up chat options", () => {
      personaOptions();
      // Wave G: skills chips + the agent-mode toggle read the
      // same prefsCache that loadTemplates just filled.
      loadChatSkills();
      $("tools-toggle").checked = !prefsCache || prefsCache.tools_enabled !== false;
      renderChatModeSeg();
      renderWebSearchToggle();
    })
  );
  step("load answer-length options", loadResponseModes);
  step("tell the server your timezone", reportTimezone);
  step("load conversations", loadConversationList);
  step("check the AI model status", refreshModelStatus);

  // Re-render whichever tab is on screen. switchTab() runs at module level —
  // before initAuth() has a token — so a tab that fetches its own data painted
  // itself from a pile of 401s and then never tried again. On the dashboard
  // that meant an empty grid until you opened Edit layout and cancelled out of
  // it, which re-ran renderDashboard by hand (user-reported).
  // *After* the entries land, not alongside them. These two ran concurrently,
  // so on a cold load the dashboard rendered against an `allEntries` that was
  // still `[]` and drew its brand-new-notebook card instead of the widgets —
  // reported as "the dashboard widgets are missing until I refresh or change
  // tabs". Every tab wants the notes; none of them wants to guess.
  entriesReady.then(() => step("load this tab", () => refreshActiveTab()));

  // First-run welcome tour (guarded by localStorage; re-runnable from Help).
  //
  // **After the settings are restored, not alongside them.** This is the
  // second half of the reported "onboarding shows every time": the flag lives
  // in localStorage, so a shell that lost it needs the server's copy back
  // *before* this asks — otherwise the tour opens, the flag arrives a moment
  // later, and the person is welcomed to an app they have used for a month.
  looksReady.then(maybeShowOnboarding);
}

// The browser is the only thing that knows where the user actually is. The
// server may be running in UTC — a container, a NAS, a machine whose clock was
// never set — and every relative time the AI computes ("in 10 minutes",
// "tomorrow at 9") is resolved against that. So the zone is reported once at
// startup, and again whenever it changes (travel, or a DST shift).
//
// Only the IANA NAME is sent, never coordinates: "Australia/Brisbane" is what
// makes the arithmetic right, and it is far less identifying than a location.
async function reportTimezone() {
  let zone = "";
  try {
    zone = Intl.DateTimeFormat().resolvedOptions().timeZone || "";
  } catch {
    return; // an environment without Intl still works, just on server time
  }
  if (!zone || (prefsCache && prefsCache.timezone === zone)) return;
  prefsCache = await apiJson("/preferences", {
    method: "PUT",
    body: JSON.stringify({ timezone: zone }),
    silent: true,
  }).catch(() => prefsCache);
}

// The per-tab data loads switchTab performs, without the tab-switching itself.
// Kept beside switchTab's own dispatch so the two can't drift apart.
function refreshActiveTab() {
  const name = localStorage.getItem("activeTab") || "notes";

  // Relocate the back-to-top button so it aligns with the chat area bounds
  const scrollTopBtn = document.querySelector(".scroll-top");
  if (scrollTopBtn) {
    if (name === "chat") {
      document.querySelector(".chat-dock")?.appendChild(scrollTopBtn);
    } else {
      document.body.appendChild(scrollTopBtn);
    }
  }
  
  if (name === "dashboard") return renderDashboard();
  if (name === "graph") return renderGraph();
  if (name === "documents") return loadDocuments();
  if (name === "library") return loadLibrary();
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

// --- asking before something irreversible (§35F) ----------------------------------
//
// `window.confirm` is not dependable in the shell this app also runs in.
// pywebview's backends vary in whether they implement it at all, and one that
// does not returns `undefined` — which every `if (!confirm(...)) return;` in
// this file reads as "the user said no". The button then does nothing, says
// nothing, and looks broken. That is the reported shape of "the recycle bin
// empty now button doesn't work either": the endpoint behind it is fine, and
// the click never got past the gate.
//
// A promise-based dialog fixes that and is better in the browser too — it is
// styled like the app, it says what the action is in a heading rather than a
// system font, and the dangerous option can be marked as dangerous.
function confirmDialog(message, options = {}) {
  const { confirmLabel = "OK", cancelLabel = "Cancel", danger = true } = options;
  return new Promise((resolve) => {
    const overlay = document.createElement("div");
    overlay.className = "modal-overlay confirm-overlay";
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");

    const card = document.createElement("div");
    card.className = "card modal-card confirm-card";
    const text = document.createElement("p");
    text.className = "confirm-text";
    // Blank lines in these messages are deliberate paragraphs — the second is
    // usually the consequence ("This cannot be undone"), which is the part
    // worth reading, so it is not run together with the first.
    for (const part of String(message).split(/\n{2,}/)) {
      const line = document.createElement("span");
      line.textContent = part;
      text.append(line, document.createElement("br"));
    }
    const row = document.createElement("div");
    row.className = "row confirm-actions";

    let settled = false;
    const close = (answer) => {
      if (settled) return;
      settled = true;
      document.removeEventListener("keydown", onKey, true);
      overlay.remove();
      returnFocus?.focus?.();
      resolve(answer);
    };
    const onKey = (event) => {
      // Escape cancels and Enter confirms, but only while this dialog is up —
      // captured, so a keyboard shortcut elsewhere can't fire underneath it.
      if (event.key === "Escape") {
        event.stopPropagation();
        close(false);
      } else if (event.key === "Enter" && event.target.tagName !== "BUTTON") {
        event.stopPropagation();
        close(true);
      }
    };

    const returnFocus = document.activeElement;
    const cancel = smallButton(cancelLabel, cancelLabel, () => close(false));
    const go = smallButton(confirmLabel, confirmLabel, () => close(true), false);
    if (danger) go.classList.add("danger");
    row.append(cancel, go);
    card.append(text, row);
    overlay.appendChild(card);
    // Clicking the backdrop cancels, the way every other overlay here behaves.
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) close(false);
    });
    document.addEventListener("keydown", onKey, true);
    document.body.appendChild(overlay);
    // Cancel takes focus, not the dangerous one: a stray Enter or Space
    // arriving with the dialog must not be the thing that deletes the notes.
    cancel.focus();
  });
}

// `confirmDialog`'s missing sibling: ask for a line of text.
//
// DESIGN.md bans `window.confirm` because the desktop shell does not reliably
// implement it, and a button gated behind one that returns `undefined`
// silently does nothing. `window.prompt` is the same trap with the same shell,
// and the app has been calling it for every rename — so this is not a new
// dialog for a new feature, it is the one the rule always implied.
//
// Resolves to the trimmed text, or "" for cancel/empty. "" rather than null so
// every caller's guard is the same shape as the confirm one.
function promptDialog(message, initial = "", { confirmLabel = "Save" } = {}) {
  return new Promise((resolve) => {
    const overlay = document.createElement("div");
    overlay.className = "modal-overlay confirm-overlay";
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");

    const card = document.createElement("div");
    card.className = "card modal-card confirm-card";
    const text = document.createElement("p");
    text.className = "confirm-text";
    text.textContent = message;
    const input = document.createElement("input");
    input.type = "text";
    input.value = initial;
    input.setAttribute("aria-label", message);

    let settled = false;
    const close = (answer) => {
      if (settled) return;
      settled = true;
      document.removeEventListener("keydown", onKey, true);
      overlay.remove();
      returnFocus?.focus?.();
      resolve(answer);
    };
    const onKey = (event) => {
      // Captured, so a shortcut elsewhere cannot fire underneath the dialog —
      // the same reason confirmDialog captures.
      if (event.key === "Escape") {
        event.stopPropagation();
        close("");
      } else if (event.key === "Enter") {
        event.stopPropagation();
        close(input.value.trim());
      }
    };

    const returnFocus = document.activeElement;
    const row = document.createElement("div");
    row.className = "row confirm-actions";
    row.append(
      smallButton("Cancel", "Cancel", () => close("")),
      smallButton(confirmLabel, confirmLabel, () => close(input.value.trim()), false)
    );
    card.append(text, input, row);
    overlay.appendChild(card);
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) close("");
    });
    document.addEventListener("keydown", onKey, true);
    document.body.appendChild(overlay);
    // The text, selected: a rename usually replaces the name rather than
    // editing it, and a caret at position 0 makes you clear it by hand first.
    input.focus();
    input.select();
  });
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
  // One long note used to push everything else off the screen, so the list
  // stopped being a list. Anything past this is clamped with a "Show more".
  //
  // The trigger is the character count, not a measured height: this list
  // renders inside a `display: none` sub-tab, where every measurement comes
  // back 0 — the trap that has caught four separate features here already.
  const isLong =
    entry.content.length > LONG_NOTE_CHARS ||
    entry.content.split("\n").length > LONG_NOTE_LINES;
  if (isLong && !expandedNotes.has(entry.id)) content.classList.add("entry-clamped");
  // Mark the matched words while filtering, so it's obvious WHY a note is in
  // the list. Built with createElement/textContent rather than innerHTML —
  // note text is user content and must never be parsed as markup.
  renderNoteText(content, entry.content, searchHighlightTerms());
  li.appendChild(content);
  if (isLong) {
    const toggle = document.createElement("button");
    toggle.type = "button";
    toggle.className = "entry-more";
    const label = () =>
      expandedNotes.has(entry.id) ? "Show less" : "Show more";
    toggle.textContent = label();
    toggle.addEventListener("click", () => {
      if (expandedNotes.has(entry.id)) expandedNotes.delete(entry.id);
      else expandedNotes.add(entry.id);
      content.classList.toggle("entry-clamped", !expandedNotes.has(entry.id));
      toggle.textContent = label();
    });
    li.appendChild(toggle);
  }

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

  // The documents this note feeds. Notes and documents are separate things
  // on purpose; this is the one place that says they are about the same one.
  for (const doc of entry.documents || []) {
    const mark = chip(`📄 ${doc.title}`, "tag", () => openDocumentFromNote(doc.id));
    mark.title = `Open “${doc.title}”`;
    if (options.actions) {
      // Detach from the note's side too. The document editor has had this
      // since the link existed; from here it took going and finding the
      // document first, which is the wrong way round when the note is what
      // you are already looking at.
      const unlink = document.createElement("span");
      unlink.className = "unlink";
      unlink.textContent = "×";
      unlink.title = `Detach from “${doc.title}” — the note stays`;
      unlink.addEventListener("click", async (event) => {
        event.stopPropagation(); // the chip itself opens the document
        await api(`/documents/${doc.id}/notes/${entry.id}`, { method: "DELETE" });
        await loadEntries();
        toast(`Detached from “${doc.title}”.`);
      });
      mark.appendChild(unlink);
    }
    meta.appendChild(mark);
  }

  // What this note's own "tomorrow" meant on the day it was written (§10A).
  // A chip rather than a mark inside the text: `renderNoteText` already
  // layers wiki links, inline markdown and filter highlighting through each
  // other, and a fourth pass over the same string is where that breaks.
  for (const when of entry.dates || []) {
    const day = new Date(`${when.at}T00:00:00`);
    const label =
      when.precision === "day"
        ? day.toLocaleDateString(undefined, { day: "numeric", month: "short" })
        : `${when.precision} of ${day.toLocaleDateString(undefined, { day: "numeric", month: "short" })}`;
    const mark = chip(`🕓 ${when.phrase} → ${label}`, "when");
    mark.title =
      `“${when.phrase}” meant ${day.toLocaleDateString(undefined, {
        weekday: "long", day: "numeric", month: "long", year: "numeric",
      })}, worked out from the day this note was written.`;
    meta.appendChild(mark);
  }

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
  const stamp = entry.created_at;
  date.textContent = relativeTime(stamp);
  date.title = new Date(stamp).toLocaleString(); // exact on hover
  metaEnd.appendChild(date);
  meta.appendChild(metaEnd);

  if (options.actions) {
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
        if (await copyToClipboard(entry.content)) toast("Note copied.");
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
          if (!(await confirmDialog(`Remove ${attachment.filename}?`))) return;
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
      // **A link is navigation, not content.** Measured on the busiest screen
      // in the app: a card was 25px of its own note, 23px of metadata and 21px
      // of link chips — and the chips were the loudest thing on it, filled and
      // bold, each carrying the *whole first line of another note*. On a
      // well-linked note the links were wider than the note and read first,
      // which is §36B.3's "everything at equal weight" with the weights
      // actually inverted.
      //
      // Clipped to a glanceable length, quiet by default, with the full text
      // on hover for when the clip is not enough.
      const label = link.preview || "";
      const short = label.length > LINK_CHIP_CHARS
        ? `${label.slice(0, LINK_CHIP_CHARS - 1).trimEnd()}…`
        : label;
      const linkChip = chip(`↔ ${short}`, "link");
      linkChip.title = `Go to note: ${label}`;
      linkChip.style.cursor = "pointer";
      linkChip.addEventListener("click", (e) => {
        if (e.target.classList.contains("unlink")) return;
        flashEntry(link.entry_id);
      });
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
  for (const strip of document.querySelectorAll(".menu-open")) {
    strip.classList.remove("menu-open");
  }
}

// Opening one, shared by the note cards and the sidebar kebabs so the two
// cannot drift apart.
//
// **`menu-open` is the fix for a reported bug, and it is not cosmetic.** On a
// note card, `.entry-actions` is `position: absolute; z-index: 1` — which
// makes it a *stacking context*, so the menu's own `z-index: 30` is resolved
// inside it and counts for nothing outside it. Every other note's action strip
// is also `z-index: 1`, and later in the document, so it paints on top of an
// open menu. Reported as "the other buttons in notes go over the popup options
// from above notes", and measured: with the first note's menu open, the topmost
// element at three separate points *inside* the menu was a button belonging to
// a different note. So it was not only a menu with buttons drawn over it — it
// was a menu whose items clicked the wrong note's controls.
//
// Raising the owning strip lifts the whole context, menu included. 5 rather
// than something larger because the only thing it has to beat is the 1 on its
// siblings; the page's own chrome is a different context and a big number here
// would only be a number waiting to collide with one.
function openActionMenu(menu, opener) {
  closeActionMenus(); // only one open at a time
  menu.classList.remove("hidden");
  opener.setAttribute("aria-expanded", "true");
  // Whichever ancestor is the stacking context this menu is trapped in. On a
  // note card that is `.entry-actions` (positioned, z-index 1); on a Library
  // card it is the card itself, because `backdrop-filter` creates a stacking
  // context too — which is why the same "menu behind the next card" bug turned
  // up again on a surface with no z-index in sight.
  menu.closest(".entry-actions, .library-card")?.classList.add("menu-open");
  menu.querySelector("button")?.focus();
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
      if (!(await confirmDialog("Replace the note with this version?\n\nThe current text is kept in the history, so this is undoable."))) return;
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
    const ok = (await confirmDialog(
      "Make this note private?\n\n" +
        "It gets encrypted with a key derived from your password, so it stays " +
        "unreadable in the database, in backups, and to anyone without that " +
        "password.\n\n" +
        "It also stops appearing in search and stops being given to the AI.\n\n" +
        "There is no recovery: if you forget your password this note is gone."
    ));
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
    if (willOpen) openActionMenu(menu, opener);
    else closeActionMenus();
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
      label: "📄 Add to a document",
      title: "Attach this note to a document you have already started",
      run: () => {
        inlineAction = inlineActionIs(entry.id, "document")
          ? null
          : { id: entry.id, kind: "document" };
        renderEntries();
      },
    },
    {
      label: "📄 Expand into a document",
      title: "Start a document from this note — the note stays where it is",
      run: () => expandNoteIntoDocument(entry),
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

  if (inlineAction.kind === "document") {
    renderAttachToDocument(entry, wrap);
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
  await saveFile(attachment.filename, await response.blob());
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
  // promptDialog resolves to trimmed text, or "" for cancel — one shape for
  // both, so there is no null to check the way window.prompt needed.
  const name = await promptDialog("Name for the new category:", "", { confirmLabel: "Create" });
  return name || undefined;
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
// Inline markdown in note text — and deliberately only the inline kind.
//
// Reported: notes show raw `**text**` while chat answers, documents and the
// dashboard digest all render markdown. They render it with renderMarkdown,
// which also does headings, tables, lists and fenced code — and a list of
// notes rendered that way gets very tall very fast, which is a worse problem
// than the one being fixed. What people actually type in a note is bold, a
// little italic, and the odd `code` span.
//
// Order matters: code spans are matched first and their contents are never
// looked at again, so `**not bold**` inside backticks stays literal.
// Underscore italics are left out on purpose — snake_case_names are common in
// notes and `_` italics would eat them.
const INLINE_MD = /`([^`\n]+)`|\*\*([^*\n]+?)\*\*|~~([^~\n]+?)~~|\*([^*\n]+?)\*/g;

// LaTeX escapes that models reach for when they want a symbol (§35H).
//
// Screenshotted: a bullet reading "Jokes $\\rightarrow$ Social Skills", with
// the LaTeX printed literally. That is not a markdown gap — the model was
// asked for an arrow and reached for the notation it saw most in training.
// Rendering a whole maths engine for this would be absurd; translating the
// dozen symbols that actually show up costs nothing and covers all of it.
//
// The prompt also asks for plain Unicode, which prevents most of these. This
// is the half that catches the model doing it anyway.
const LATEX_SYMBOLS = {
  rightarrow: "\u2192", to: "\u2192", longrightarrow: "\u27f6", Rightarrow: "\u21d2",
  leftarrow: "\u2190", gets: "\u2190", Leftarrow: "\u21d0",
  leftrightarrow: "\u2194", Leftrightarrow: "\u21d4", uparrow: "\u2191", downarrow: "\u2193",
  times: "\u00d7", div: "\u00f7", pm: "\u00b1", mp: "\u2213", cdot: "\u00b7",
  leq: "\u2264", le: "\u2264", geq: "\u2265", ge: "\u2265",
  neq: "\u2260", ne: "\u2260", approx: "\u2248", equiv: "\u2261", sim: "\u223c",
  ldots: "\u2026", dots: "\u2026", cdots: "\u22ef",
  infty: "\u221e", deg: "\u00b0", bullet: "\u2022", star: "\u2605",
  checkmark: "\u2713", surd: "\u221a", propto: "\u221d", therefore: "\u2234",
  alpha: "\u03b1", beta: "\u03b2", gamma: "\u03b3", delta: "\u03b4",
  lambda: "\u03bb", mu: "\u03bc", pi: "\u03c0", sigma: "\u03c3", omega: "\u03c9",
  Delta: "\u0394", Sigma: "\u03a3", Omega: "\u03a9",
};

function unlatex(text) {
  // The overwhelmingly common case: nothing to do, and not worth two regex
  // passes over every note and every streaming frame to find that out.
  if (!text || (!text.includes("\\") && !text.includes("$"))) return text;
  const swap = (s) =>
    s.replace(/\\([A-Za-z]+)/g, (whole, name) =>
      Object.prototype.hasOwnProperty.call(LATEX_SYMBOLS, name)
        ? LATEX_SYMBOLS[name]
        : whole
    );
  // Inline maths delimiters are dropped only when the span is actually maths
  // *and* everything in it became plain characters.
  //
  // Both halves are load-bearing. Without the first, "cost $5 and $10 today"
  // is a matching span containing no commands, and the dollars vanish — a
  // notebook full of prices is a much more likely thing than a notebook full
  // of LaTeX. Without the second, a span still holding \frac or \sum gets
  // stripped of its delimiters and left as half-translated notation, which is
  // worse than leaving it alone: the user can at least read the source.
  return swap(
    text.replace(/\$([^$\n]{1,200})\$/g, (whole, inner) => {
      if (!/\\[A-Za-z]/.test(inner)) return whole; // not maths — currency, prose
      const plain = swap(inner);
      return /\\[A-Za-z]/.test(plain) ? whole : plain;
    })
  );
}

function renderInlineMarkdown(element, text, terms) {
  element.replaceChildren();
  text = unlatex(text);
  const pattern = new RegExp(INLINE_MD.source, "g");
  let cursor = 0;
  let match;
  while ((match = pattern.exec(text)) !== null) {
    if (match.index > cursor) {
      const before = document.createElement("span");
      highlightInto(before, text.slice(cursor, match.index), terms);
      element.appendChild(before);
    }
    const [, code, bold, strike, italic] = match;
    const tag = code ? "code" : bold ? "strong" : strike ? "s" : "em";
    const node = document.createElement(tag);
    // A code span is literal by definition, so it is never searched-highlighted
    // into pieces — the rest still is, or filtering would stop marking any
    // word that happened to sit inside emphasis.
    if (code) node.textContent = code;
    else highlightInto(node, bold || strike || italic, terms);
    element.appendChild(node);
    cursor = pattern.lastIndex;
  }
  if (cursor < text.length) {
    const rest = document.createElement("span");
    highlightInto(rest, text.slice(cursor), terms);
    element.appendChild(rest);
  }
}

function renderNoteText(element, text, terms) {
  element.replaceChildren();
  const pattern = /\[\[([^[\]]{1,120})\]\]/g;
  let cursor = 0;
  let match;
  while ((match = pattern.exec(text)) !== null) {
    if (match.index > cursor) {
      const span = document.createElement("span");
      renderInlineMarkdown(span, text.slice(cursor, match.index), terms);
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
    renderInlineMarkdown(span, text.slice(cursor), terms);
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
  // After the list is in the DOM: drop the clamp from any note that turned
  // out to fit. No-op while the sub-tab is hidden; showNotesSection re-runs it.
  settleNoteClamps();
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
      // The list this filters lives in the "browse" sub-tab, and the sidebar
      // is visible from all four — so picking a category while writing a note
      // or asking a question filtered a list that was `display: none`, and the
      // click appeared to do nothing at all. Reported. The same fix
      // `flashEntry` already carries for jumping to a note, for the same
      // reason: a sidebar that is always on screen must be able to bring the
      // thing it controls on screen with it.
      showNotesSection("browse");
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
  const name = await promptDialog(`Rename "${currentName}" to:`, currentName);
  if (!name || name === currentName) return;

  // Renaming onto a category that already exists merges them, which is
  // usually the point — but it's destructive-looking, so it's confirmed.
  if (categoryMeta.has(name)) {
    const target = categoryMeta.get(name);
    const ok = (await confirmDialog(
      `"${name}" already exists. Merge "${currentName}" into it?\n\n` +
        `Its notes move across — nothing is deleted. "${name}" would then ` +
        `hold ${target.count + meta.count} notes.`
    ));
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
  const ok = (await confirmDialog(
    `Delete the category "${name}"?\n\n` +
      (count
        ? `Its ${count} note${count === 1 ? "" : "s"} are kept and become ` +
          `Uncategorised — deleting a category never deletes notes.`
        : "It has no notes in it.")
  ));
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
  
  const isSemantic = $("semantic-search-toggle")?.checked;
  const url = (isSemantic && noteSearch) 
      ? `/entries?q=${encodeURIComponent(noteSearch)}&semantic=true` 
      : "/entries";
      
  allEntries = await apiJson(url);
  entriesEverLoaded = true;
  renderStatusBar(); // the notebook's size changed, and the bar reads it here
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
// A "go to it" link beside the save confirmation. Replaced each save, and
// cleared as soon as you start typing the next note.
function offerJumpToNewNote(saved, status) {
  if (!saved || !saved.id) return;
  const jump = document.createElement("button");
  jump.type = "button";
  jump.className = "ghost small jump-to-note";
  jump.textContent = "↦ Go to it";
  jump.title = "Open this note in your list";
  jump.addEventListener("click", () => flashEntry(saved.id));
  status.append(" ", jump);
}

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

// --- notes ↔ documents ------------------------------------------------------
// Asked for directly: "a way to link documents to new notes I create in the
// capture tab… the documents and notes sections need to be more integrated".
// The picker adds; the chips are how you take one back off before saving.

const captureDocuments = new Set();

async function loadCaptureDocuments() {
  const select = $("entry-document");
  const documents = await apiJson("/documents").catch(() => []);
  const chosen = select.value;
  select.replaceChildren();
  const none = document.createElement("option");
  none.value = "";
  none.textContent = documents.length ? "None" : "No documents yet";
  select.appendChild(none);
  for (const doc of documents) {
    const option = document.createElement("option");
    option.value = String(doc.id);
    option.textContent = doc.title;
    select.appendChild(option);
  }
  // Asked for: "the add to document should have the option for a new document
  // as well". Wanting to file a note under something that does not exist yet
  // is the normal case at the start of a project, and leaving to make the
  // document loses the note you were in the middle of writing.
  const fresh = document.createElement("option");
  fresh.value = NEW_DOCUMENT;
  fresh.textContent = "＋ New document…";
  select.appendChild(fresh);
  select.value = chosen;
  renderCaptureDocuments(documents);
}

// The picker's value for "one that doesn't exist yet". A string, so it can
// never collide with a document id.
const NEW_DOCUMENT = "new";

// Ask for a title and start an empty document. Shared by the capture box and
// the note card's "Add to a document", so both offer the same thing.
async function createDocumentNamed(suggestion = "") {
  const title = await promptDialog("Title for the new document:", suggestion, { confirmLabel: "Create" });
  if (!title) return null;
  try {
    const doc = await apiJson("/documents", {
      method: "POST",
      body: JSON.stringify({ title, content: `# ${title}\n\n` }),
    });
    return doc; // the documents tab refetches on switch, so nothing to sync
  } catch (error) {
    toast(error.message, true);
    return null;
  }
}

let captureDocumentTitles = new Map();

function renderCaptureDocuments(documents) {
  if (documents) {
    captureDocumentTitles = new Map(documents.map((d) => [String(d.id), d.title]));
  }
  const box = $("entry-document-chips");
  box.replaceChildren();
  for (const id of captureDocuments) {
    const chipEl = chip(`📄 ${captureDocumentTitles.get(String(id)) || id} ✕`, "tag", () => {
      captureDocuments.delete(id);
      renderCaptureDocuments();
    });
    chipEl.title = "Don't attach this note to that document after all";
    box.appendChild(chipEl);
  }
}

// The other direction, asked for straight after the capture-time picker:
// "what about adding a document to a note??". A note you wrote weeks ago
// turns out to belong to something you are writing now, and the capture box
// is long gone by then.
async function renderAttachToDocument(entry, wrap) {
  const status = document.createElement("p");
  status.className = "muted";
  status.textContent = "Loading documents…";
  wrap.appendChild(status);

  const documents = await apiJson("/documents").catch(() => null);
  if (!documents) {
    status.classList.add("error");
    status.textContent = "Couldn't load your documents.";
    return;
  }
  const already = new Set((entry.documents || []).map((doc) => doc.id));
  const free = documents.filter((doc) => !already.has(doc.id));

  status.textContent = free.length
    ? "Add this note to:"
    : documents.length
      ? "This note is on all of your documents — or start a new one:"
      : "No documents yet — start one:";
  const picker = document.createElement("select");
  for (const doc of free) {
    const option = document.createElement("option");
    option.value = String(doc.id);
    option.textContent = doc.title || "Untitled";
    picker.appendChild(option);
  }
  // Same offer as the capture box: the document this note belongs to often
  // does not exist until the note makes you realise you want it.
  const fresh = document.createElement("option");
  fresh.value = NEW_DOCUMENT;
  fresh.textContent = "＋ New document…";
  picker.appendChild(fresh);

  const row = document.createElement("div");
  row.className = "row";
  row.appendChild(
    smallButton(
      "Attach",
      "Add this note to the chosen document",
      async () => {
        let id = picker.value;
        let title = picker.selectedOptions[0]?.textContent || "that document";
        if (id === NEW_DOCUMENT) {
          const made = await createDocumentNamed(entry.content.trim().slice(0, 60));
          if (!made) return;
          id = String(made.id);
          title = made.title;
        }
        try {
          await apiJson(`/documents/${id}/notes`, {
            method: "POST",
            body: JSON.stringify({ entry_id: entry.id }),
          });
          inlineAction = null;
          await loadEntries();
          toastAction(`Added to “${title}”.`, "Open", () =>
            openDocumentFromNote(Number(id))
          );
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
  wrap.append(picker, row);
  setTimeout(() => picker.focus(), 0);
}

function openDocumentFromNote(documentId) {
  switchTab("documents");
  // The tab's own loader races us otherwise, and opens the last document.
  setTimeout(() => openDocument(documentId), 150);
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
      body: JSON.stringify({
        content,
        tags,
        category,
        document_ids: [...captureDocuments],
      }),
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
    autoGrow(contentBox); // the box shrinks back with its content
    localStorage.removeItem("captureDraft"); // it's saved for real now
    $("entry-count").textContent = "0 characters";
    $("entry-tags").value = "";
    $("entry-category").value = "";
    captureDocuments.clear();
    renderCaptureDocuments();
    $("entry-template").value = "";
    await loadEntries();
    loadSuggestions(); // new categories → fresher recommended questions
    // Saving from Capture leaves you on Capture, with the note you just wrote
    // now somewhere in a list on another sub-tab. Offer to go to it rather
    // than making you switch tabs and hunt (user request). An offer, not a
    // jump: capturing several thoughts in a row is the common case, and
    // teleporting away after each one would fight that.
    offerJumpToNewNote(saved, status);
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
  // Both searches ran and their rankings were fused, which is the normal case
  // whenever an embedding backend is up. Named for what it is: "semantic
  // search" would now be a half-truth, and the label is the app's own account
  // of how it found what it is showing you.
  hybrid: "meaning + keywords",
  semantic: "semantic search",
  keyword: "keyword search",
  recent: "recent notes", // broad question → showing recent entries
  // These two were missing and rendered raw, so the panel said "dated" — the
  // internal name, in a strip whose whole job is telling you in plain words how
  // the app found what it is showing you.
  dated: "by date",
  none: "nothing searched",
  // Matched the subject, not the stated time — see the note above
  // renderChatMeta's empty-results branch for the reasoning (§38 bug report:
  // a joke tagged joke/jokes/funny, asked about as "two weeks ago", was
  // actually three).
  outside_range: "matched, wrong time",
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
  // The Notes tab is split into sub-tabs, and the note list lives in "browse".
  // Without this the card is found and scrolled to while its whole section is
  // display:none — so jumping to a note from a search result, the graph, or a
  // wiki link silently did nothing (user-reported).
  showNotesSection("browse");
  activeCategory = null;
  // Clear any active filter too: a note that doesn't match the current search
  // is filtered out of the list, so there'd be nothing to scroll to.
  noteSearch = "";
  const searchBox = $("note-search");
  if (searchBox) searchBox.value = "";
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

// The Ask box's "that isn't a question about your notes" card (§35A).
//
// Deliberately not rendered as an answer. Reported after the first version:
// a paragraph of instructions where the answer goes, next to a results panel
// saying "No matching records", reads as the app having broken rather than as
// guidance. Here the examples are buttons — a way forward from the same place,
// which also teaches the shape of a question that works.
function renderAskHint(box, hint) {
  box.replaceChildren();
  const card = document.createElement("div");
  card.className = "ask-hint";
  const text = document.createElement("p");
  text.className = "ask-hint-text";
  text.textContent = hint.text;
  card.appendChild(text);
  const row = document.createElement("div");
  row.className = "row ask-hint-examples";
  for (const example of hint.examples || []) {
    row.appendChild(
      smallButton(example, `Ask: ${example}`, () => {
        $("question").value = example;
        askQuestion(example);
      })
    );
  }
  if (row.childElementCount) card.appendChild(row);
  box.appendChild(card);
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
  if (meta.raw_results.length === 0 && meta.search_mode === "none") {
    // Nothing was searched for — the message was not a question about the
    // notes. "No matching records" would report a failed search that never
    // happened, which is the half of the greeting case that read as broken.
    $("chat-results").classList.remove("hidden");
    document.querySelector(".chat-half:last-child")?.classList.add("hidden");
    return;
  }
  document.querySelector(".chat-half:last-child")?.classList.remove("hidden");
  if (meta.search_mode === "outside_range" && meta.raw_results.length) {
    // Matched what was asked about, not when it was asked about — the note
    // is real, the stated time was just wrong (reported directly: a joke
    // asked about as "two weeks ago" that was actually three). Said before
    // the results, not folded silently into them, so this never reads as a
    // date-scoped answer it isn't.
    const li = document.createElement("li");
    li.className = "muted";
    li.textContent = meta.when_phrase
      ? `Nothing about this in “${meta.when_phrase}” — here's what matched from another time:`
      : "Nothing in that time range — here's what matched from another time:";
    rawList.appendChild(li);
  }
  if (meta.raw_results.length === 0) {
    const li = document.createElement("li");
    li.className = "muted";
    // A dated question that found nothing has *two* facts to report, and only
    // saying the first is what makes an empty result look like a broken
    // search: nothing matched, **and** the window you named is why it was
    // looking so narrowly. Naming the phrase is also the fastest route to the
    // fix, because the next thing to try is asking again without it.
    li.textContent =
      meta.search_mode === "dated" && meta.when_phrase
        ? `Nothing matching “${meta.when_phrase}”. Try asking without it.`
        : "No matching records.";
    rawList.appendChild(li);
  }
  // Notes that came along because they are *connected* to a match are labelled
  // as such. Without it the panel shows notes about something else with no
  // explanation, which reads as the search having misfired — and the whole
  // point of pulling them in is that the person can see the connection.
  const connected = new Set(meta.connected_ids || []);
  for (const entry of meta.raw_results) {
    const row = clickableResult(entry);
    if (connected.has(entry.id)) {
      row.classList.add("result-connected");
      const mark = document.createElement("span");
      mark.className = "chip result-connected-chip";
      mark.textContent = "🔗 linked to a match";
      mark.title =
        "This note didn't match your question — it's here because it is " +
        "linked to one that did.";
      row.appendChild(mark);
    }
    rawList.appendChild(row);
  }
  $("chat-results").classList.remove("hidden");
}

// Longer than the backend's own 120s per-chunk Ollama timeout (see the
// idle-read guard inside streamChat below) so a real "offline" answer from
// that always has time to arrive first.
const STREAM_IDLE_TIMEOUT_MS = 150_000;

// The one NDJSON stream reader, shared by the Notes quick-ask and the
// Chat tab (Wave C). Callers own all rendering via the handlers.
async function streamChat({
  question,
  history,
  persona,
  mode,
  useTools,
  noteIds,
  skill,
  skillInputs,
  skillFromStep,
  plan,
  notesOnly,
  answeringAgent,
  signal,
  onMeta,
  onPlan,
  onStep,
  onResult,
  onLimit,
  onThinking,
  onAnswer,
  onTool,
  onConfirm,
  onAsk,
  onRunSkill,
  onRunPlan,
  onCompressReview,
  onHint,
  onStats,
}) {
  const body = { question, history: history || [] };
  if (persona) body.persona = persona;
  // Per-turn, not a setting: one quick answer shouldn't change the default
  // for every answer after it.
  if (mode) body.mode = mode;
  if (typeof useTools === "boolean") body.use_tools = useTools;
  if (notesOnly) body.notes_only = true;
  // A reply to the agent's own question ("yes", "ok") reads as small talk to
  // intent.classify — correctly, in isolation — which would otherwise route
  // it to the tool-less conversational path and strand whatever the model
  // was asking about (Tier 1 §4). The caller already knows this reply is
  // answering a pending `ask` event, so it says so rather than making the
  // classifier guess from three letters.
  if (answeringAgent) body.answering_agent = true;
  if (noteIds && noteIds.length) body.note_ids = noteIds;
  // Running a skill sends its name, not its prompt: the server owns what a
  // skill is — the steps, the values, the tools it may use — so the two
  // definitions can't drift apart.
  if (skill) {
    body.skill = skill;
    if (skillInputs && Object.keys(skillInputs).length) body.skill_inputs = skillInputs;
    // Resuming: the steps before this one ran in an earlier attempt and are
    // not repeated. Sent as an index rather than as a list of what to skip,
    // so the server stays the one place that knows what the steps are.
    if (skillFromStep) body.skill_from_step = skillFromStep;
  }
  // A plan the model just made. Carries its own steps because nothing saved
  // it — that is the only way it differs from a skill run, here and on the
  // server.
  if (plan && plan.steps && plan.steps.length) body.plan = plan;
  // NDJSON over a plain POST, deliberately — not a WebSocket. A WebSocket was
  // tried here and reverted: it needed the session on a second thread (a
  // SQLAlchemy Session is not thread-safe), it had to be mounted outside the
  // `locked` dependency and re-implement auth by hand, and a WS handshake is
  // exempt from the same-origin policy that protects this `fetch` — any page
  // the user had open could have opened it. `fetch` + a reader gives the same
  // token-by-token delivery with none of that.
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
    // **No timeout on the stream** (reported: "the AI fails to respond
    // while still saying it is writing"). The backend's own read against
    // Ollama times out and turns into a real "offline" line on the wire —
    // but only for a hang *inside that one socket call*. Anything that
    // stalls the backend before or between chunks (retrieval, a stuck
    // lock, a dead process) has nothing to catch it, and `reader.read()`
    // then waits forever with no sign of life. `STREAM_IDLE_TIMEOUT_MS` is
    // comfortably longer than the backend's own 120s per-chunk timeout, so
    // a real recovery message from *that* always wins the race; this is
    // only for the case where nothing — not even an error — ever arrives.
    const chunk = await Promise.race([
      reader.read(),
      new Promise((_, reject) =>
        setTimeout(
          () => reject(new Error("stream_idle_timeout")),
          STREAM_IDLE_TIMEOUT_MS
        )
      ),
    ]).catch((err) => {
      if (err.message === "stream_idle_timeout") {
        reader.cancel().catch(() => {}); // stop the underlying fetch too
        throw new Error(
          "The model stopped responding. It may still be loading a large " +
            "model, or Ollama may have stalled — try again, or check " +
            "Settings → Models."
        );
      }
      throw err;
    });
    const { done, value } = chunk;
    if (done) break;
    buffered += decoder.decode(value, { stream: true });
    const lines = buffered.split("\n");
    buffered = lines.pop(); // last piece may be a partial line
    for (const line of lines) {
      if (!line.trim()) continue;
      let event;
      // One malformed line must not abort a whole answer. Before this, a
      // single bad frame threw out of the read loop and the user saw a
      // half-written reply with no error.
      try {
        event = JSON.parse(line);
      } catch (parseErr) {
        recordBrowserLog("WARN", [`[Chat stream] Unparseable line: ${line.slice(0, 80)}`]);
        continue;
      }
      if (event.type === "meta") onMeta(event);
      else if (event.type === "plan" && onPlan) onPlan(event);
      else if (event.type === "step" && onStep) onStep(event);
      else if (event.type === "result" && onResult) onResult(event);
      else if (event.type === "limit" && onLimit) onLimit(event);
      else if (event.type === "thinking") onThinking(event.delta);
      else if (event.type === "answer") onAnswer(event.delta);
      else if (event.type === "tool" && onTool) onTool(event);
      else if (event.type === "confirm" && onConfirm) onConfirm(event);
      else if (event.type === "ask" && onAsk) onAsk(event);
      else if (event.type === "run_skill" && onRunSkill) onRunSkill(event);
      else if (event.type === "run_plan" && onRunPlan) onRunPlan(event);
      else if (event.type === "compress_review" && onCompressReview) onCompressReview(event);
      else if (event.type === "hint" && onHint) onHint(event);
      else if (event.type === "stats" && onStats) onStats(event);
      else if (event.type === "error") {
        // The server caught something mid-stream and said so. Surfacing it
        // beats the silent truncation this used to be.
        throw new Error(event.message || "The answer stopped early.");
      }

      if (event.type === "tool" && event.ok === false) {
        recordBrowserLog("WARN", [
          `[Agent tool error] ${event.label || event.name || "?"}: ${event.error || "unknown error"}`,
        ]);
      }
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

// Echo the question above its answer. Without it, an answer that has been on
// screen a while — or one you scrolled back to — is a paragraph with no
// subject.
function renderAskedQuestion(question) {
  const holder = $("asked-question");
  if (!holder) return;
  holder.replaceChildren();
  if (!question) {
    holder.classList.add("hidden");
    return;
  }
  const label = document.createElement("span");
  label.className = "asked-label";
  label.textContent = "You asked: ";
  const text = document.createElement("span");
  text.className = "asked-text";
  text.textContent = question;
  holder.append(label, text);
  holder.classList.remove("hidden");
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
  renderAskedQuestion(question);
  answerBox.textContent = "";
  answerBox.appendChild(typingDots()); // until the first token arrives
  thinkingText.textContent = "";
  thinkingBox.classList.add("hidden");
  thinkingBox.open = false;

  let answerRaw = "";
  let stopped = false;
  // The box explained itself instead of answering — so the final markdown
  // pass, the saved turn and the answer actions all sit this one out.
  let hinted = false;
  const renderLive = liveMarkdownRenderer(answerBox);
  askController = new AbortController();
  try {
    // Stream: raw results arrive first, then thinking/answer tokens live.
    await streamChat({
      question,
      history: conversation.slice(-MAX_CLIENT_HISTORY),
      // Sent per turn now that this box has its own picker. It always obeyed
      // the *saved* mode via the server's fallback; carrying it explicitly is
      // what makes changing the box's dropdown affect the very next answer
      // rather than only the one after the preference round-trips.
      mode: $("ask-mode-select")?.value || null,
      useTools: false, // the quick-ask box is pure Q&A; actions live in the Chat tab
      // This box interrogates the notebook and nothing else (§35A). Sent as a
      // flag rather than left to the classifier, which is right about "hey"
      // being small talk — it is this surface that doesn't want small talk.
      notesOnly: true,
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
        keepAtBottom(thinkingText); // follow the reasoning, unless scrolled away
        status.textContent = "The model is thinking…";
      },
      onAnswer: (delta) => {
        if (thinkingBox.open) thinkingBox.open = false; // reasoning done → tuck away
        answerRaw += delta;
        renderLive(answerRaw); // markdown renders AS it streams (user request)
        status.textContent = "The model is writing…";
      },
      onHint: (event) => {
        // Not an answer, so it does not go through the markdown renderer or
        // into the conversation — it is the box explaining itself.
        hinted = true;
        renderAskHint(answerBox, event);
        status.textContent = "";
      },
    });

    // Final render (catches anything after the last animation frame).
    if (!hinted) renderMarkdown(answerBox, answerRaw);
    if (!hinted) {
      conversation.push({ question, answer: answerRaw });
      show("retry-btn", "copy-btn", "speak-btn", "new-chat-btn");
    }
    status.textContent = "";
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
    // The question used to be cleared here, which left an answer on screen with
    // nothing saying what it answered (user-reported). It stays in the box —
    // ready to refine and re-ask — and is echoed above the answer so the pair
    // reads together even after you start typing the next one.
    if (!stopped) questionBox.select();
  }
}

function retryAnswer() {
  if (lastQuestion) askQuestion(lastQuestion);
}

async function copyAnswer() {
  if (await copyToClipboard($("ai-answer").textContent)) toast("Answer copied.");
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
// Set while an `ask` card (renderAgentQuestion) is on screen waiting for a
// reply. Covers typing a free-text answer into the composer, not just
// clicking one of the option buttons — both are "answering the agent's
// question" and both need answering_agent set (Tier 1 §4), or a typed "yes"
// reads as small talk and strands the thing it was actually answering.
// Consumed (read once, then reset) by the very next sendChatMessage call.
let chatAwaitingAgentAnswer = false;

// A summary standing in for the first `covered` turns when this conversation
// is sent to the model (§35I). Deliberately *beside* the turns rather than
// replacing them: the transcript on screen and the saved conversation are
// untouched, so this narrows what the model reads and loses nothing. Undo is
// therefore setting this back to null.
let chatSummary = null; // { text, covered }

// What the model is given as history: the summary in place of the turns it
// covers, then everything since, capped as before.
//
// Without a summary the tail is all the model gets — `context.fit_history`
// drops whole pairs from the oldest end to fit, so a long conversation does
// not overflow, it silently forgets its own beginning. A few hundred
// characters carrying the gist of ten turns is strictly better than the whole
// of one.
function chatHistoryToSend() {
  const turns = chatConv.turns;
  if (!chatSummary || chatSummary.covered <= 0) {
    return turns.slice(-MAX_CLIENT_HISTORY);
  }
  const since = turns.slice(chatSummary.covered).slice(-MAX_CLIENT_HISTORY);
  return [
    {
      question: "What have we covered so far?",
      answer: `Summary of the first ${chatSummary.covered} messages:\n${chatSummary.text}`,
    },
    ...since,
  ];
}

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

// The offer to carry on, shown under a turn that stopped before it was done.
//
// Reported twice in the same breath: *"the agent struggles with long tasks
// like skills then cuts out half way through and has to restart, or it hits a
// limit for tool calls."* Both ended in a paragraph telling the user to ask it
// to continue — so continuing meant typing the request out again from memory,
// and resuming a six-step skill meant re-running the three steps that had
// already changed the notebook. This is one button for each case.
function continueRunControls({ label, hint, onClick }) {
  const row = document.createElement("div");
  row.className = "run-continue";
  const button = document.createElement("button");
  button.type = "button";
  button.className = "small";
  button.textContent = label;
  button.addEventListener("click", () => {
    // One press only: a second would start a duplicate run over the same
    // notes, and every step of it writes.
    button.disabled = true;
    onClick();
  });
  row.appendChild(button);
  if (hint) {
    const why = document.createElement("span");
    why.className = "muted";
    why.textContent = hint;
    row.appendChild(why);
  }
  return row;
}

// A small "what this answer cost" line under an assistant bubble: which model
// answered, how long it took, and — when Ollama reports them — token counts
// and generation speed.
// One fact on the metadata line. Its own element rather than a slice of one
// long string, which is what "modular" buys: each item carries its own
// tooltip, can be styled by what it *is* rather than by where it sits, and a
// new field added later cannot silently change the meaning of the separator
// beside it.
function metaItem(text, { title = "", kind = "", icon = "" } = {}) {
  const item = document.createElement("span");
  item.className = `msg-meta-item${kind ? ` msg-meta-${kind}` : ""}`;
  if (icon) {
    const mark = document.createElement("span");
    mark.className = "msg-meta-icon";
    mark.textContent = icon;
    mark.setAttribute("aria-hidden", "true");
    item.appendChild(mark);
  }
  item.appendChild(document.createTextNode(text));
  if (title) item.title = title;
  return item;
}

// §35K: *"the chat bubble's metadata line is not visually appealing. It has
// grown a field at a time — model, elapsed, tokens, rounds, context percent,
// whether the count was estimated — and never had a pass."*
//
// The pass, and the rule behind it: **a metadata line is read at a glance or
// not at all.** Six equal facts joined by dots is a sentence you have to
// parse, so the fields are ranked instead — what the turn *cost you* (time,
// and how full the window got) reads first, what it *was* (model, tools) sits
// quieter beside it, and the numbers only a debugging session wants (exact
// tokens, tokens/second) are one hover away rather than on screen.
//
// Nothing was removed: every field is still here, and the ones that moved into
// tooltips moved because they answer a question nobody asks mid-conversation.
function messageMetaLine({ model, elapsedMs, stats, toolCount = 0, rounds = 0 }) {
  const row = document.createElement("div");
  row.className = "msg-meta muted";

  // 1. What it cost. First, because it is the only field anyone looks for
  //    while actually using the app.
  if (elapsedMs != null) {
    row.appendChild(
      metaItem(
        elapsedMs < 1000 ? `${elapsedMs} ms` : `${(elapsedMs / 1000).toFixed(1)}s`,
        { title: "How long this answer took, end to end", kind: "time" }
      )
    );
  }

  // 2. How full the model's window got — a meter, not a percentage in prose.
  //    A raw token count never answered the question anyone has, which is
  //    whether the *next* turn is the one that starts dropping the top of its
  //    own prompt.
  let fill = null;
  const inTok = stats ? stats.prompt_tokens : null;
  const outTok = stats ? stats.output_tokens : null;
  if (stats && inTok != null && stats.context_tokens) {
    fill = Math.min(100, Math.round((inTok / stats.context_tokens) * 100));
    const approx = stats.usage_source === "estimated" ? "~" : "";
    const meter = metaItem(`${fill}%`, {
      title:
        `${approx}${compactTokens(inTok)} of this model's ${compactTokens(stats.context_tokens)} ` +
        "context window was used by this turn." +
        (fill >= 80
          ? "\n\nPast about 80%, the next turn is the one that starts dropping " +
            "the oldest part of its own prompt — 🗜 Compress in the header " +
            "summarises the conversation so far instead."
          : ""),
      kind: "window",
    });
    const bar = document.createElement("span");
    bar.className = "msg-meta-bar";
    const level = document.createElement("span");
    level.className = "msg-meta-bar-level";
    level.style.width = `${fill}%`;
    bar.appendChild(level);
    meter.insertBefore(bar, meter.firstChild);
    row.appendChild(meter);
  }

  // 3. What answered, and what it did. Quieter: this is the same for every
  //    turn in a conversation, so it is context rather than news.
  if (model) {
    row.appendChild(
      metaItem(model, { title: "The model that answered", kind: "model" })
    );
  }
  if (toolCount) {
    row.appendChild(
      metaItem(String(toolCount), {
        icon: "🔧",
        title:
          `${toolCount} tool call${toolCount === 1 ? "" : "s"}` +
          (rounds > 1 ? ` over ${rounds} rounds` : "") +
          ". The steps above show which.",
        kind: "tools",
      })
    );
  }

  // 4. The numbers a debugging session wants, and nobody else. On the row's
  //    own tooltip rather than in it — this is where the line had grown to
  //    three lines of digits on a narrow window.
  const detail = [];
  if (inTok != null || outTok != null) {
    const approx = stats && stats.usage_source === "estimated" ? "~" : "";
    detail.push(`${approx}${inTok ?? "?"} tokens in → ${outTok ?? "?"} out`);
  }
  if (outTok && stats && stats.eval_ms) {
    detail.push(`${(outTok / (stats.eval_ms / 1000)).toFixed(1)} tokens/second`);
  }
  if (rounds > 1) detail.push(`${rounds} rounds`);
  if (stats && stats.usage_source === "estimated") {
    detail.push("~ means the server didn't report counts, so these are estimated");
  }
  if (detail.length) row.title = detail.join("\n");

  // Past ~80% the next turn of the same conversation is the one that starts
  // dropping things, so the warning belongs on the turn *before* it happens
  // rather than after the model has already lost the plot.
  if (fill != null && fill >= 80) row.classList.add("msg-meta-tight");
  return row;
}

// "8192" is a number you have to read; "8k" is one you can glance at. Under a
// thousand stays exact, because rounding 900 to "1k" would be a lie in the
// direction that matters when the window is nearly full.
function compactTokens(n) {
  if (n == null) return "?";
  return n >= 1000 ? `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k` : String(n);
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

// Copying has to actually work, in three descending steps.
//
// `navigator.clipboard` is only defined in a SECURE CONTEXT. On
// http://localhost that is satisfied, which is why this looked fine — but the
// moment the app is reached at http://192.168.1.20:8000, over a tunnel, or
// through anything that is not localhost, the whole API is simply `undefined`
// and every copy button in the app becomes a no-op that says "couldn't copy".
// That is worst on the Logs screen, where the thing being copied is the error
// you are trying to report to somebody.
//
// So: the modern API, then the old `execCommand` path that works on plain
// http, and finally — if even that is refused — hand the text to the user in a
// selected textarea so Ctrl+C still gets it out. The last step is the one that
// makes "you can always copy this" a true statement rather than a hope.
function copyViaTextarea(text) {
  const staging = document.createElement("textarea");
  staging.value = text;
  // Off-screen rather than hidden: a display:none element cannot be selected,
  // and the selection is the whole mechanism here.
  staging.setAttribute("readonly", "");
  staging.style.position = "fixed";
  staging.style.top = "-1000px";
  staging.style.opacity = "0";
  document.body.appendChild(staging);
  staging.select();
  staging.setSelectionRange(0, text.length);
  let copied = false;
  try {
    copied = document.execCommand("copy");
  } catch {
    copied = false;
  }
  staging.remove();
  return copied;
}

function flashCopied(button) {
  if (!button) return;
  const original = button.textContent;
  button.textContent = "✓";
  setTimeout(() => (button.textContent = original), 1200);
}

async function copyToClipboard(text, button) {
  if (!text) return false;
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      flashCopied(button);
      return true;
    }
  } catch {
    // Permission refused or the context is not what it claimed — fall through
    // rather than reporting failure while a working path is still untried.
  }
  if (copyViaTextarea(text)) {
    flashCopied(button);
    return true;
  }
  showCopyFallback(text);
  return false;
}

// The last resort: show the text, already selected, and say what to press.
// Reached when the browser refuses both copy mechanisms — usually a hardened
// or embedded webview. The text is still on screen and still selectable, so
// the answer to "how do I get this error out" is never "you can't".
function showCopyFallback(text) {
  const existing = $("copy-fallback");
  if (existing) existing.remove();

  const overlay = document.createElement("div");
  overlay.id = "copy-fallback";
  overlay.className = "modal-overlay";
  overlay.setAttribute("role", "dialog");
  overlay.setAttribute("aria-label", "Copy this text");

  const card = document.createElement("div");
  card.className = "modal-card copy-fallback-card";

  const heading = document.createElement("h3");
  heading.textContent = "Copy this";

  const note = document.createElement("p");
  note.className = "muted";
  note.textContent =
    "This browser wouldn't let the app write to the clipboard — it's already " +
    "selected below, so press Ctrl+C (⌘C on a Mac).";

  const box = document.createElement("textarea");
  box.className = "copy-fallback-text";
  box.value = text;
  box.setAttribute("readonly", "");
  box.rows = 12;

  const close = document.createElement("button");
  close.className = "small";
  close.textContent = "Done";
  const dismiss = () => overlay.remove();
  close.addEventListener("click", dismiss);
  overlay.addEventListener("click", (event) => {
    if (event.target === overlay) dismiss();
  });
  overlay.addEventListener("keydown", (event) => {
    if (event.key === "Escape") dismiss();
  });

  card.append(heading, note, box, close);
  overlay.appendChild(card);
  document.body.appendChild(overlay);
  box.focus();
  box.select();
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
  // Animated like the ai-mark: a new chat is the AI waiting, and the slow
  // turn says so. Stills itself under Settings → Appearance → reduced motion.
  renderEmblem(emblem, 52, { animate: true }); // after insertion — see addAssistantBubble
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
    // Say up front when searching cannot work, rather than after a search has
    // failed. Web access is off by default — this is a local-first app and
    // that is the right default — so the commonest first experience of this
    // panel is typing a query into a box that was never going to answer. The
    // switch is one click away, and naming where it lives is the difference
    // between a dead end and a setting.
    const status = $("web-status");
    if (prefsCache && !prefsCache.web_search_enabled) {
      status.replaceChildren();
      status.classList.remove("error");
      status.appendChild(
        document.createTextNode("Web access is off. Turn it on in ")
      );
      const link = document.createElement("button");
      link.type = "button";
      link.className = "link-button";
      link.textContent = "Settings → Web search";
      link.addEventListener("click", () => {
        toggleWebPanel(false);
        openSettingsModal("websearch");
      });
      status.appendChild(link);
      status.appendChild(document.createTextNode(" to search from here."));
    } else if (!$("web-results").childElementCount) {
      status.textContent = "";
    }
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
  // Name the engine that ANSWERED — which under "Automatic" is not
  // necessarily the one configured — and say what that means for privacy.
  // The person chose an engine in Settings for a reason; without this the
  // choice is invisible at the one moment it applies. Said on an empty result
  // too: "nothing found" and "nothing found *by DuckDuckGo*" are different
  // facts, and the second is the one you can act on.
  const answered = body.answered_by || { label: body.provider || "", detail: "" };
  status.replaceChildren();
  const summary = document.createElement("span");
  summary.textContent = results.length
    ? `${results.length} result${results.length === 1 ? "" : "s"} via ${answered.label}`
    : `No results from ${answered.label} — try different words.`;
  status.appendChild(summary);
  if (answered.detail) {
    const detail = document.createElement("span");
    detail.className = "web-answered-detail muted";
    detail.textContent = ` · ${answered.detail}`;
    status.appendChild(detail);
  }
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
    // SearXNG is a metasearch engine, so "via SearXNG" says where the query
    // was assembled rather than who answered it. Naming the upstream engines
    // is what makes a self-hosted instance legible rather than a black box.
    // textContent throughout — these names come from a third party.
    if (Array.isArray(result.via) && result.via.length) {
      const via = document.createElement("span");
      via.className = "web-result-via";
      via.textContent = result.via.join(" · ");
      via.title = `Found by ${result.via.join(", ")}`;
      meta.append(" — ", via);
    }
    row.appendChild(meta);

    if (result.snippet) {
      const snippet = document.createElement("div");
      snippet.className = "web-result-snippet muted";
      snippet.textContent = result.snippet;
      row.appendChild(snippet);
    }

    // The actions, in the row's corner and revealed on hover — the same
    // pattern the note cards use, and for the same reason. Measured before:
    // three labelled buttons under every result made each one 127px tall, so
    // barely two and a half results fitted in the panel. **"📖 Read here" is
    // gone entirely**: the title does exactly that, one line above, which
    // makes it a button whose whole job was to repeat the thing next to it.
    const actions = document.createElement("div");
    actions.className = "web-result-actions";
    const open = document.createElement("a");
    open.href = result.url;
    open.target = "_blank";
    open.rel = "noopener noreferrer";
    open.className = "ghost small web-open-link";
    open.textContent = "↗";
    open.title = "Open in your browser";
    open.setAttribute("aria-label", `Open ${result.domain || result.url} in your browser`);
    actions.appendChild(open);
    const ask = smallButton("💬", "Open this page and ask the AI about it", () =>
      askAboutPage(result.url, result.title)
    );
    ask.setAttribute("aria-label", "Ask the AI about this page");
    actions.appendChild(ask);
    row.appendChild(actions);
    box.appendChild(row);
  }
}

// "Ask about this" used to drop `About <url> — ` into the chat box and stop
// there. The model cannot open a URL, so it answered from the address text —
// which is why this read as simply not working (user-reported). It now closes
// the web panel, writes a question naming the page, and lets the agent's
// read_url tool fetch it. The tool needs web search on, so that is checked
// first and offered rather than failing silently.
async function askAboutPage(url, title) {
  if (!(prefsCache && prefsCache.web_search_enabled)) {
    toast("Turn on 🌐 Web first — reading a page needs it.", true);
    return;
  }
  // Reading a page is a tool call, so agent mode has to be on for this turn.
  const input = $("chat-input");
  const label = (title || "").trim() || url;
  input.value = `Read ${url} and tell me about it — "${label}".`;
  toggleWebPanel(false);
  input.focus();
  // Sent with tools forced on, whatever the toggle says: the request is
  // meaningless without the one tool that can fetch the page.
  await sendChatMessage(undefined, { useTools: true });
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
  const length = page.read_minutes
    ? ` · ${page.words.toLocaleString()} words, about ${page.read_minutes} min`
    : "";
  $("web-reader-source").textContent = `${page.domain}${length}`;

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
      // Headings keep the page's own depth. Rendering every h1..h6 as one
      // size threw away the outline, which is what tells you where you are
      // in a long article.
      const tag =
        block.type === "heading"
          ? `h${Math.min(6, Math.max(3, (block.level || 2) + 1))}`
          : block.type === "pre"
            ? "pre"
            : block.type === "blockquote"
              ? "blockquote"
              : "p";
      const el = document.createElement(tag);
      if (block.type === "heading") el.className = "reader-heading";
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
    .map((b) =>
      b.type === "heading"
        ? `\n${"#".repeat(Math.min(6, (b.level || 2) + 1))} ${b.text}`
        : b.type === "li"
          ? `- ${b.text}`
          : b.text
    )
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

// What the backend says about the model in use. Fetched when the Models
// screen is drawn rather than polled: none of it changes while the app runs.
async function renderModelSpec(modelName) {
  const box = $("model-spec");
  if (!box) return;
  const spec = await apiJson(`/models/spec?name=${encodeURIComponent(modelName || "")}`, {
    silent: true,
  }).catch(() => null);
  if (!spec) {
    box.classList.add("hidden");
    return;
  }
  // Tri-state, and the third state is the point: null means "this backend
  // doesn't report capabilities", which is not the same as "no". Saying "no"
  // about a model that works fine would send someone chasing a problem that
  // isn't there.
  // `== null`, not `=== null`: the whole point of this helper is that "not
  // declared" must never render as a confident "no" (§35C), and a *missing*
  // key is exactly as unknown as an explicit null. With `===` an absent field
  // fell through to the falsy branch and printed "no" — the reported bug,
  // surviving in the one case nobody checked.
  const canDo = (value) => (value == null ? "not reported" : value ? "yes" : "no");
  const rows = [
    ["Size", spec.parameters],
    ["Quantisation", spec.quantisation],
    ["Family", spec.family],
    // Two windows, deliberately. A 128k model is *run* at less because the KV
    // cache scales with the window — without both numbers the percentage on
    // each message looks wrong to anyone who knows what the model can hold.
    [
      "Context window",
      spec.context_length
        ? `${compactTokens(spec.usable_context)} in use` +
          (spec.context_length > spec.usable_context
            ? ` (of ${compactTokens(spec.context_length)} it can hold)`
            : "")
        : null,
    ],
    ["Loaded at", spec.loaded_context_length ? compactTokens(spec.loaded_context_length) : null],
    ["Can use tools", canDo(spec.supports_tools)],
    // "Can think: no" was reported for a model that visibly thinks (§35C),
    // and the label was the lie rather than the value: this is the *declared*
    // capability — whether the backend supports a thinking toggle — and a
    // model can still emit inline <think> tags without declaring it, which
    // `split_thinking` picks up and shows. Saying "declared" makes the two
    // facts distinguishable instead of contradictory.
    ["Thinking mode declared", canDo(spec.supports_thinking)],
  ].filter(([, value]) => value != null && value !== "");

  box.replaceChildren();
  for (const [label, value] of rows) {
    const dt = document.createElement("dt");
    dt.textContent = label;
    const dd = document.createElement("dd");
    dd.textContent = String(value);
    box.append(dt, dd);
  }
  box.classList.toggle("hidden", rows.length === 0);
}

// Both pickers for the response preset: the Chat toolbar's and the Notes
// quick-ask box's. Two controls, one stored preference — the quick-ask box
// always obeyed the saved mode and simply had no way to set it, so this is a
// second way in rather than a second setting. Listed rather than found by
// class so a stray `.small-select` can never join by accident.
const RESPONSE_MODE_SELECTS = ["response-mode-select", "ask-mode-select"];

// The response presets, fetched once. Served by /chat/modes rather than
// listed here so adding a fourth is a change to `ai/presets.py` alone (§11).
async function loadResponseModes() {
  const selects = RESPONSE_MODE_SELECTS.map((id) => $(id)).filter(Boolean);
  if (!selects.length) return;
  const body = await apiJson("/chat/modes", { silent: true }).catch(() => null);
  if (!body || !body.modes) return;
  const active = body.modes.find((m) => m.id === body.active);
  for (const select of selects) {
    select.replaceChildren();
    for (const mode of body.modes) {
      const option = document.createElement("option");
      option.value = mode.id;
      option.textContent = mode.label;
      option.title = mode.description;
      if (mode.id === body.active) option.selected = true;
      select.appendChild(option);
    }
    if (active) select.title = active.description;
  }
}

// Picking in one picker moves the other. Without this the two would drift
// apart the moment either was touched, and the one you weren't looking at
// would be lying about what the next answer will do.
async function setResponseMode(chosen) {
  for (const id of RESPONSE_MODE_SELECTS) {
    const select = $(id);
    if (!select) continue;
    select.value = chosen;
    const option = select.selectedOptions[0];
    select.title = (option && option.title) || "";
  }
  // Changing the picker changes the default too — otherwise someone who works
  // in Quick would re-pick it on every reload. The *request* still carries the
  // mode per turn, so this is "remember what I chose" rather than a second
  // setting that can disagree with the dropdown.
  await apiJson("/preferences", {
    method: "PUT",
    body: JSON.stringify({ response_mode: chosen }),
  }).catch(() => {});
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
  // The full prompt, not the hover excerpt: the 👁 panel exists precisely so
  // the instructions the model is given aren't a 200-character preview.
  const fullPrompt = (name) =>
    (overrides.get(name) || {}).prompt || BUILTIN_PERSONAS[name] || "";
  const showPrompt = (name) => {
    $("persona-prompt-text").textContent =
      fullPrompt(name) || "This persona adds no instructions of its own.";
  };
  showPrompt(active);
  select.onchange = () => {
    select.title = describe(select.value);
    showPrompt(select.value);
  };
}

// You could choose a persona but never read what it told the model to do —
// which makes the choice a guess. This shows the actual system prompt.
function togglePersonaPrompt() {
  const panel = $("persona-peek-panel");
  const showing = panel.classList.toggle("hidden");
  $("persona-peek").setAttribute("aria-expanded", String(!showing));
}

// A running total for the whole conversation. Per-message counts can't tell
// you when a thread has grown heavy enough to be worth starting over.
function renderChatUsage(tokens) {
  const el = $("chat-usage");
  if (!el) return;
  const total = Number(tokens) || 0;
  el.hidden = total === 0;
  el.textContent = total ? `${formatTokens(total)} tokens` : "";
}

// --- compressing this conversation's context (§35I) --------------------------
//
// Asked for directly: *"there should be a tool as well as a manual command or
// something to be able to compress chat context on longer chats so the AI can
// better continue."* This is the manual half, which §35I says ships first
// because it cannot misfire: you press it, you read what it produced, and only
// then does the model see it instead of the turns it replaces.
//
// Nothing is deleted. The transcript on screen and the saved conversation keep
// every turn — `chatSummary` only changes what `chatHistoryToSend` hands the
// model, so Undo is one assignment.

// How many turns to leave alone at the end. Compressing the exchange you are
// still in the middle of is how a summary loses the thing you are talking
// about right now.
const KEEP_RECENT_TURNS = 2;

async function compressChatContext() {
  const covered = chatConv.turns.length - KEEP_RECENT_TURNS;
  if (covered < 2) {
    toast("There isn't enough conversation to compress yet.", true);
    return;
  }
  const button = $("chat-compress");
  button.disabled = true;
  const previous = button.textContent;
  button.textContent = "Summarising…";
  try {
    const result = await apiJson("/chat/compress", {
      method: "POST",
      body: JSON.stringify({ history: chatConv.turns.slice(0, covered) }),
    });
    showCompressReview(result, covered);
  } finally {
    button.disabled = false;
    button.textContent = previous;
  }
}

// The summary, before it is used — editable, because a summary you cannot
// correct is one you have to trust blindly, and this one is about to be the
// model's only memory of the first half of the conversation.
function showCompressReview(result, covered) {
  const panel = $("chat-compress-panel");
  const box = $("chat-compress-text");
  box.value = result.summary;
  $("chat-compress-stats").textContent =
    `${covered} messages → ${Math.round(result.chars_after / 10) / 100}k characters ` +
    `(was ${Math.round(result.chars_before / 10) / 100}k). Edit it if it missed something.`;
  panel.classList.remove("hidden");
  panel.dataset.covered = String(covered);
  box.focus();
}

function applyCompression() {
  const text = $("chat-compress-text").value.trim();
  const covered = Number($("chat-compress-panel").dataset.covered || 0);
  if (!text || covered < 1) return;
  chatSummary = { text, covered };
  $("chat-compress-panel").classList.add("hidden");
  renderCompressionState();
  toast(`Using a summary in place of the first ${covered} messages.`);
}

// The badge that says the model is reading a summary rather than the thread,
// with the way back. A compression the user cannot see is a conversation
// quietly answering from something they never read.
function renderCompressionState() {
  const badge = $("chat-compressed");
  if (!badge) return;
  badge.classList.toggle("hidden", !chatSummary);
  if (chatSummary) {
    badge.firstElementChild.textContent = `🗜 first ${chatSummary.covered} summarised`;
  }
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
// --- following a stream without fighting the reader -------------------------------
//
// Asked for directly: the chat and the thinking box should scroll themselves
// as the model writes, "but if the user tries to scroll up it will release the
// lock". Both halves matter — a pane that does not follow makes a long answer
// look frozen, and one that follows unconditionally yanks you back to the
// bottom the moment you try to read what scrolled past.
//
// No "is this scroll programmatic?" flag is needed, which is the usual way
// this gets complicated. Distance from the bottom answers it on its own: a
// scroll we caused lands at zero and stays stuck, and a scroll the reader
// caused moves away from zero and unsticks. Scrolling back down re-sticks,
// so getting the follow behaviour back is the obvious gesture rather than a
// button.
const SCROLL_STICK_SLACK = 40; // px — a scrollbar rarely lands exactly at 0

function followBottom(element) {
  if (!element || element.dataset.followBound === "1") return;
  element.dataset.followBound = "1";
  element.dataset.stuck = "1";
  element.addEventListener(
    "scroll",
    () => {
      const distance =
        element.scrollHeight - element.scrollTop - element.clientHeight;
      element.dataset.stuck = distance <= SCROLL_STICK_SLACK ? "1" : "0";
    },
    { passive: true }
  );
}

// Scroll to the bottom, unless the reader has scrolled away from it.
function keepAtBottom(element) {
  if (!element) return;
  followBottom(element);
  if (element.dataset.stuck !== "0") element.scrollTop = element.scrollHeight;
}

function chatScrollToEnd() {
  if (chatScrollQueued) return;
  chatScrollQueued = true;
  requestAnimationFrame(() => {
    chatScrollQueued = false;
    keepAtBottom($("chat-messages"));
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

  // The plan a skill declared, drawn before anything runs. The timeline has
  // always shown what happened; a skill is the first thing that knows what is
  // *meant* to happen, so it says so up front (roadmap §18).
  const plans = [];
  const startPlan = (plan) => {
    const el = document.createElement("details");
    el.className = "agent-step step-plan";
    el.open = true;
    const summary = document.createElement("summary");
    // A saved skill and a plan the model drew for this one request run through
    // the same code, so the card has to say which it is — "⚡ Weekly review" is
    // a job the user set up, "🧭 fix my categories" is one the model worked out
    // just now, and confusing the two makes the skill list look like it has
    // entries nobody added.
    summary.textContent = `${plan.kind === "plan" ? "🧭" : "⚡️"} ${plan.skill}`;
    el.appendChild(summary);
    const items = [];
    if (plan.steps && plan.steps.length) {
      const list = document.createElement("ol");
      list.className = "plan-steps";
      for (const step of plan.steps) {
        const item = document.createElement("li");
        item.textContent = step;
        list.appendChild(item);
        items.push(item);
      }
      el.appendChild(list);
    }
    if (plan.tools && plan.tools.length) {
      const line = document.createElement("div");
      line.className = "plan-tools";
      line.textContent = `Tools for this run: ${plan.tools.join(", ")}`;
      el.appendChild(line);
    }
    holder.appendChild(el);
    const entry = { el, items, plan: { ...plan, states: plan.states || {} } };
    plans.push(entry);
    // Replaying a finished run: paint the states it ended with.
    for (const [index, state] of Object.entries(entry.plan.states)) {
      markStep(entry, Number(index), state.state, state.reason);
    }
    current = null;
    return el;
  };

  // A step's state, shown on the plan itself. The timeline records what
  // happened; this is the only place that says how far through it got.
  const markStep = (entry, index, state, reason) => {
    const item = entry.items[index];
    if (!item) return;
    entry.plan.states[index] = { state, reason };
    item.className = `plan-step plan-step-${state}`;
    item.dataset.state = state;
    const note = item.querySelector(".plan-step-reason");
    if (note) note.remove();
    if (state === "failed" && reason) {
      const why = document.createElement("span");
      why.className = "plan-step-reason";
      why.textContent = ` — ${reason}`;
      item.appendChild(why);
    }
  };

  return {
    holder,
    plan(event) {
      startPlan(event);
    },
    step(event) {
      const entry = plans.at(-1);
      if (entry) markStep(entry, event.index, event.state, event.reason);
      // Each step's prose is its own block. Without this, step 2's first
      // sentence lands on the end of step 1's paragraph ("…with no tags.Read
      // them.") because nothing between them closed the step.
      current = null;
    },
    failRunningStep(reason) {
      const entry = plans.at(-1);
      if (!entry) return;
      for (const [index, state] of Object.entries(entry.plan.states)) {
        if (state.state === "running") markStep(entry, Number(index), "failed", reason);
      }
    },
    // What the run actually changed, with the call that puts each one back.
    // Prose claiming something happened is exactly what this replaces.
    result(event, options = {}) {
      const changes = event.changes || [];
      if (!changes.length) return;
      const box = document.createElement("div");
      box.className = "skill-result";
      box.dataset.changes = JSON.stringify(changes);
      const title = document.createElement("div");
      title.className = "skill-result-title";
      title.textContent = `What changed (${changes.length})`;
      box.appendChild(title);
      for (const change of changes) box.appendChild(changeRow(change, options));
      holder.appendChild(box);
      current = null;
    },
    thinking(delta) {
      const step = current?.kind === "thinking" ? current : startThinking();
      step.raw += delta;
      step.body.textContent = step.raw;
      // The pane has its own max-height and scrollbar, so following the chat
      // is not enough — reasoning would scroll out of sight inside it.
      keepAtBottom(step.body);
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
        if (step.kind === "plan") {
          startPlan(step);
          if (plans.at(-1)) plans.at(-1).el.open = false;
        } else if (step.kind === "result") {
          this.result(step);
        } else if (step.kind === "thinking" && step.text) {
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
    // Editing an answer replaces the model's prose with the user's own, so the
    // separate prose steps collapse into the one block they typed. The
    // reasoning and tool steps around them are left alone — those record what
    // actually happened and aren't the user's to rewrite.
    replaceAnswer(markdown) {
      for (const step of answerSteps.slice(1)) step.el.remove();
      answerSteps.length = Math.min(answerSteps.length, 1);
      const step = answerSteps[0] || startAnswer();
      step.raw = markdown;
      renderMarkdown(step.body, markdown);
      current = null;
      return step.body;
    },
    // The element answer-editing hides while its textarea is open.
    answerElement() {
      return (answerSteps.at(-1) || startAnswer()).el;
    },
    hasAnswer() {
      return answerSteps.some((s) => s.raw.trim());
    },
    // The timeline in the order it happened, for saving with the turn.
    serialise() {
      const out = [];
      for (const node of holder.children) {
        if (node.classList.contains("step-plan")) {
          const entry = plans.find((p) => p.el === node);
          // The states go with it, so reopening a chat shows how far the run
          // got rather than an untouched plan.
          if (entry) out.push({ kind: "plan", ...entry.plan });
        } else if (node.classList.contains("skill-result")) {
          out.push({ kind: "result", changes: JSON.parse(node.dataset.changes || "[]") });
        } else if (node.classList.contains("step-thinking")) {
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
// One line of a skill's result: what changed, a way to see it, and — where
// an inverse exists — a way to put it back. The undo is a tool call the
// server handed us, run through the same endpoint the confirm button uses.
function changeRow(change, options = {}) {
  const row = document.createElement("div");
  row.className = "skill-change";
  const label = document.createElement("span");
  label.className = "skill-change-label";
  label.textContent = change.label || change.tool;
  row.appendChild(label);

  if (change.note_id) {
    row.appendChild(
      smallButton("View", "Show this note", () => {
        switchTab("notes");
        showNotesSection("browse"); // focusing inside a hidden section does nothing
        flashEntry(change.note_id);
      })
    );
  }
  if (change.undo) {
    const undo = smallButton("Undo", "Put this back the way it was", async () => {
      undo.disabled = true;
      try {
        const result = await apiJson("/chat/tools/execute", {
          method: "POST",
          body: JSON.stringify({
            name: change.undo.tool,
            arguments: change.undo.arguments,
          }),
        });
        if (result && result.error) throw new Error(result.error);
        row.classList.add("skill-change-undone");
        label.textContent = `${change.label || change.tool} — undone`;
        undo.remove();
        loadEntries();
      } catch (error) {
        undo.disabled = false;
        toast(error.message || "Couldn't undo that.", true);
      }
    });
    row.appendChild(undo);
  }
  return row;
}

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
  text.textContent = `⚠️ The AI wants to: ${event.label || event.name}`;
  
  const contentArea = document.createElement("div");
  
  if (event.name === "edit_note" && event.arguments.content) {
    // async fetch for diff
    apiJson(`/entries/${event.arguments.note_id}`).then(res => {
      const oldContent = res.content || "";
      const newContent = event.arguments.content;
      if (oldContent !== newContent) {
        contentArea.innerHTML = `<div class="diff-viewer">
          <div class="diff-removed">- ${escapeHtml(oldContent)}</div>
          <div class="diff-added">+ ${escapeHtml(newContent)}</div>
        </div>`;
      }
    }).catch(() => {});
  }

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
          card.replaceWith(toolChip(`✅ ${result.label || event.label || event.name}`));
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
      card.replaceWith(toolChip("✖️ Cancelled — nothing was changed."));
    })
  );
  card.append(text, contentArea, row);
  holder.appendChild(card);
  chatScrollToEnd();
}

// The agent stopped to ask something. Its options become buttons, and picking
// one sends that text as the next message — so the answer travels through the
// ordinary conversation history rather than through any parked server state.
// Nothing to expire, nothing lost on a reload, and the exchange reads back in
// the saved chat like the short question-and-answer it was.
function renderAgentQuestion(holder, event) {
  const card = document.createElement("div");
  card.className = "tool-confirm agent-ask";
  const text = document.createElement("p");
  text.textContent = `❓ ${event.question}`;
  const row = document.createElement("div");
  row.className = "row agent-ask-options";

  let answered = false;
  const answer = (choice) => {
    if (answered) return; // double-click, or Enter on a focused button
    answered = true;
    // Replace the card rather than leave dead buttons: the exchange is
    // already about to appear as a normal user message below.
    card.replaceWith(toolChip(`❓ ${event.question} → ${choice}`));
    sendChatMessage(choice);
  };

  for (const option of event.options || []) {
    row.appendChild(smallButton(option, `Answer: ${option}`, () => answer(option), false));
  }
  const note = document.createElement("p");
  note.className = "muted";
  note.textContent = "Or type your own answer below.";
  card.append(text, row, note);
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
  renderDocList();
}

// The notes this document draws on. Shown beside the outline because both
// answer the same question — what is this document made of.
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
    open.textContent = note.is_private ? "🔒 (private note)" : note.preview;
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

function renderDocStats() {
  const el = $("doc-stats");
  if (!el) return;
  const text = $("doc-content").value || "";
  const words = (text.match(/\S+/g) || []).length;
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
  el.textContent = `${words.toLocaleString()} word${words === 1 ? "" : "s"} · ${readTime}`;
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
  // Stepping back past a pass means those thoughts were not folded in after
  // all — otherwise the next Draft would skip them and silently drop an idea.
  foldedThoughts = "";
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

// What was last folded into the draft. Kept so a second pass doesn't resend
// thoughts the model has already used — which is the problem clearing the box
// was solving, at the cost of destroying the user's own writing.
let foldedThoughts = "";

async function composeDraft() {
  const written = $("draft-thoughts").value;
  // Only the part they've added since the last pass. If they edited earlier
  // text, the prefix no longer matches and everything is sent again — the
  // safe direction: the model repeats itself rather than losing a thought.
  const thoughts = written.startsWith(foldedThoughts)
    ? written.slice(foldedThoughts.length).trim()
    : written.trim();
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
    // The thoughts have been folded in — remember that, but never delete what
    // they wrote. Clearing the box was reported twice as the app eating the
    // user's text, and it is: the raw thoughts are often the only copy of an
    // idea, and the draft is a rewrite of them, not a replacement.
    if (body.ollama_running && thoughts) foldedThoughts = written;
    $("draft-instruction").value = "";
    const thinking = $("draft-thinking");
    thinking.classList.toggle("hidden", !body.thinking);
    $("draft-thinking-text").textContent = body.thinking || "";
    if (body.message) {
      status.classList.add("error");
      status.textContent = body.message;
    } else {
      status.textContent = thoughts
        ? "Folded your thoughts into the draft — your notes above are untouched."
        : "Draft updated — edit it, or add more thoughts.";
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
    foldedThoughts = "";
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

// The answer-length/persona disclosure (§37C) — same open/close shape as the
// note picker above, just for a settings pair instead of a list.
function chatDockMoreOpen() {
  return !$("chat-dock-more-panel").classList.contains("hidden");
}

function openChatDockMore() {
  $("chat-dock-more-panel").classList.remove("hidden");
  $("chat-dock-more-btn").setAttribute("aria-expanded", "true");
}

function closeChatDockMore() {
  $("chat-dock-more-panel").classList.add("hidden");
  $("chat-dock-more-btn").setAttribute("aria-expanded", "false");
}

async function sendChatMessage(preset, opts = {}) {
  const input = $("chat-input");
  const status = $("chat-status");
  const question = (preset ?? input.value).trim();
  if (!question) return;
  lastChatQuestion = question;

  // Consumed once: this send — button click or free-typed reply alike — is
  // the answer to whatever question was pending, and the next one after it
  // is an ordinary message again.
  const answeringAgent = opts.answeringAgent ?? chatAwaitingAgentAnswer;
  chatAwaitingAgentAnswer = false;

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
  autoGrow(input); // a cleared box must not keep the height of what was in it
  input.disabled = true;
  hide("chat-send");
  show("chat-stop");
  status.classList.remove("error");
  status.textContent = "Searching your notes…";

  // Regenerate re-runs the same question without adding a duplicate "you".
  //
  // `displayText` is what the *user* said when the message carries an
  // instruction they did not type — 🧭 Plan appends one. Showing the appended
  // sentence back to them would read as the app putting words in their mouth,
  // and hiding the request entirely would leave the plan looking as though it
  // came from nowhere; the button they pressed is the explanation.
  if (!opts.skipUserBubble) addBubble("user", opts.displayText || question);
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
  // Set when the agent ends its turn by handing the job to a saved skill.
  // The run can't start from inside the stream — this turn is still holding
  // the input box and the conversation — so it is remembered and started
  // once everything below has run.
  let handoff = null;
  // Set when the turn stopped because it ran out of rounds, and — for a skill
  // run — the step it did not get past. Both become a button at the end of the
  // bubble rather than a sentence asking the user to type "carry on".
  let ranOutOfRounds = false;
  let stoppedAtStep = null;
  const startedAt = performance.now();
  const toolEvents = []; // {label, ok} — persisted so chips survive a reload
  chatController = new AbortController();

  // --- checkpointing a long turn --------------------------------------------
  // A row for this turn already exists, so the save at the end has to update
  // it rather than append a second copy of the same exchange.
  let checkpointed = false;
  let checkpointInFlight = false;

  // Write what the turn has so far. Called at each agent round boundary, so a
  // ten-minute run that dies at minute nine leaves nine minutes of work in the
  // conversation instead of nothing.
  //
  // One in flight at a time: rounds can finish close together, and two
  // creates racing each other would make two conversations out of one thread.
  async function checkpointTurn() {
    if (checkpointInFlight) return;
    checkpointInFlight = true;
    try {
      const partial = {
        question,
        answer: timeline.text(),
        thinking: timeline.thinkingText() || null,
        tools: toolEvents.length ? toolEvents : null,
        steps: timeline.serialise(),
        // No stats or elapsed yet — the turn is not over, and a half-turn's
        // numbers reported as final would be wrong rather than incomplete.
      };
      if (chatConv.id === null) {
        const created = await apiJson("/conversations", {
          method: "POST",
          body: JSON.stringify(partial),
          silent: true,
        });
        chatConv.id = created.id;
        $("chat-title").textContent = created.title;
        loadConversationList();
      } else if (checkpointed || opts.replaceLast) {
        await apiJson(`/conversations/${chatConv.id}/turns/last`, {
          method: "PUT",
          body: JSON.stringify(partial),
          silent: true,
        });
      } else {
        await apiJson(`/conversations/${chatConv.id}/turns`, {
          method: "POST",
          body: JSON.stringify(partial),
          silent: true,
        });
      }
      checkpointed = true;
    } catch {
      // Deliberately silent. This is insurance running behind a live answer;
      // a toast here would interrupt the thing it exists to protect, and the
      // save at the end of the turn reports its own failure.
    } finally {
      checkpointInFlight = false;
    }
  }

  let slowLoadTimeout;
  try {
    slowLoadTimeout = setTimeout(() => {
      if (!meta && !stopped) {
        status.textContent = "Loading model... (this may take a moment)";
      }
    }, 5000);
    await streamChat({
      question,
      history: chatHistoryToSend(),
      persona: $("persona-select").value || null,
      mode: $("response-mode-select").value || null,
      useTools: opts.useTools ?? $("tools-toggle").checked,
      noteIds: sentAttachments,
      skill: opts.skill,
      skillInputs: opts.skillInputs,
      skillFromStep: opts.skillFromStep,
      plan: opts.plan,
      answeringAgent,
      signal: chatController.signal,
      onMeta: (m) => {
        meta = m;
        status.textContent = "The model is writing…";
      },
      onPlan: (event) => {
        clearPending();
        timeline.plan(event);
        status.textContent =
          event.kind === "plan"
            ? `Working through ${(event.steps || []).length} steps…`
            : `Running “${event.skill}”…`;
        chatScrollToEnd();
      },
      onStep: (event) => {
        clearPending();
        timeline.step(event);
        if (event.state === "running") {
          status.textContent = `Step ${event.index + 1}: ${event.text}`;
        }
        chatScrollToEnd();
      },
      onResult: (event) => {
        clearPending();
        timeline.result(event);
        // Where the run stopped, if it did. A number here means the steps
        // after it never ran.
        stoppedAtStep = typeof event.stopped_at === "number" ? event.stopped_at : null;
        // A skill that changed notes has just made the list on screen stale.
        if ((event.changes || []).length) loadEntries();
        chatScrollToEnd();
      },
      onLimit: () => {
        // Out of rounds with tools still in flight. Only remembered here: the
        // offer to continue belongs beneath the answer that says it stopped,
        // and that answer has not been written yet.
        ranOutOfRounds = true;
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
      onAsk: (event) => {
        clearPending();
        const card = document.createElement("div");
        renderAgentQuestion(card, event);
        timeline.tool(card.firstElementChild || card);
        status.textContent = "Waiting for your answer…";
        chatAwaitingAgentAnswer = true;
      },
      onRunSkill: (event) => {
        // The model picked a saved skill for this job (§33). Its turn is over;
        // the run starts below, once this one has finished tidying up.
        clearPending();
        timeline.tool(toolChip(event.label, true));
        toolEvents.push({ label: event.label, ok: true });
        status.textContent = `Starting “${event.skill}”…`;
        handoff = event;
        chatScrollToEnd();
      },
      onRunPlan: (event) => {
        // The model decided the job has several parts and planned it (§35K).
        // Same handover as a skill: the turn is over and the steps run one at
        // a time below, so nothing is left half-done.
        clearPending();
        timeline.tool(toolChip(event.label, true));
        toolEvents.push({ label: event.label, ok: true });
        status.textContent = "Working out the steps…";
        handoff = event;
        chatScrollToEnd();
      },
      onCompressReview: (event) => {
        // The model asked to compress the chat (§37I). Unlike run_skill/
        // run_plan this isn't a run to start — it opens the same review
        // panel the manual Compress button fills in, and the summary is
        // used only if the user presses Apply there. Not set on `handoff`:
        // that path always starts something; this one waits for a person.
        clearPending();
        const label = "🗜 Suggested compressing the earlier messages";
        timeline.tool(toolChip(label, true));
        toolEvents.push({ label, ok: true });
        showCompressReview(event, event.turns);
        status.textContent = "Waiting for you to review the summary…";
        chatScrollToEnd();
      },
      onStats: (event) => {
        // A round finished. Asked for directly: *"a new chat should be saved
        // after agent turns as well, not after the whole response is
        // complete."* Correct, and the reason is that an agent turn is minutes
        // of work on a local model — closing the window, a stall, or the
        // server going away halfway through used to lose **the entire
        // conversation**, because nothing was written until the last round
        // returned. A checkpoint per round means the worst case is losing the
        // round in progress rather than the thread.
        //
        // Fire-and-forget, and silent: a checkpoint that interrupts the answer
        // to complain about the network would be worse than the data loss it
        // is preventing. The turn's real save still happens at the end and
        // overwrites this with the finished version.
        if (event.round) checkpointTurn();
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
        // The window doesn't change between rounds, but the peak prompt does —
        // and the peak is the one worth reporting, because it is the round
        // that came closest to overflowing.
        stats.context_tokens = event.context_tokens || stats.context_tokens;
        // One estimated round makes the whole total an estimate. Reporting a
        // mixed figure as measured would be the dishonest way round.
        if (event.usage_source === "estimated") stats.usage_source = "estimated";
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
      timeline.failRunningStep("Failed due to error");
    }
  } finally {
    clearTimeout(slowLoadTimeout);
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
  // A turn that stopped short offers the way onward, in the two shapes it can
  // take. Not shown when the user pressed Stop — they know why it ended — and
  // not when a skill run finished every step it had.
  // A run that stopped early is exactly the kind of thing you find out about
  // ten minutes later, having walked away from a long job (§36E). The Resume
  // button below is the fix in the moment; this is the record afterwards.
  if (!stopped && (stoppedAtStep !== null || ranOutOfRounds)) {
    recordNotification({
      kind: "run",
      title: opts.skill ? `“${opts.skill}” stopped early` : "A long answer stopped early",
      detail:
        stoppedAtStep !== null
          ? `Got as far as step ${stoppedAtStep + 1}. Reopen the chat to resume.`
          : "It ran out of rounds. Reopen the chat to continue.",
      key: `run:${opts.skill || "answer"}:${Date.now()}`,
      action: { tab: "chat" },
    });
  }
  if (!stopped && stoppedAtStep !== null && opts.skill) {
    bubble.appendChild(
      continueRunControls({
        label: `↻ Resume from step ${stoppedAtStep + 1}`,
        hint: "Earlier steps are not repeated.",
        onClick: () =>
          sendChatMessage(`⚡️ ${opts.skill} — from step ${stoppedAtStep + 1}`, {
            skill: opts.skill,
            skillInputs: opts.skillInputs || {},
            skillFromStep: stoppedAtStep,
          }),
      })
    );
  } else if (!stopped && ranOutOfRounds) {
    bubble.appendChild(
      continueRunControls({
        label: "→ Continue",
        hint: "Picks up from what it had already done.",
        onClick: () =>
          sendChatMessage(
            "Continue from where you stopped. Don't redo what you have " +
              "already done — carry on with what is left, and say when it is " +
              "all finished.",
            { useTools: true }
          ),
      })
    );
  }
  chatScrollToEnd();
  if (toolsActed) refreshAfterToolChanges(); // the AI changed real data
  if (handoff) {
    // Start the run as its own message, down the same path the ⚡ dropdown
    // uses — so the plan, the ticked steps, the change list and every Undo
    // work here exactly as they do when the user picks the skill themselves.
    // Deferred by a task because this turn is still finishing: it re-enables
    // the input box in `finally`, and the run needs to disable it again.
    const start =
      handoff.type === "run_plan"
        ? () => startPlannedRun(handoff.goal, handoff.steps)
        : () => startSkill({ name: handoff.skill }, handoff.inputs || {});
    setTimeout(start, 0);
  }
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
    // A turn that ended by starting a skill said nothing on purpose — the run
    // below is the answer. Complaining that the model wrote nothing would be
    // wrong, and the retry button would re-run the choosing turn rather than
    // the skill.
    if (!stopped && !handoff) {
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
      // What this turn cost, so the conversation can show a running total.
      // Prompt + output, because both were sent through the model.
      tokens: stats
        ? (stats.prompt_tokens || 0) + (stats.output_tokens || 0)
        : null,
      // The whole metadata line, not just its total. `tokens` above is a sum,
      // which is right for the conversation's running total and useless for
      // rebuilding "3.9k/8k window · 12 tok/s · llama3.2" — so on reload the
      // line used to vanish and the answer looked like it came from nowhere.
      stats: stats || null,
      // How long the answer took, measured here because the client is the only
      // thing that saw the whole turn: the server reports per-round timings,
      // and an agent turn is several rounds plus the tool calls between them.
      elapsed_ms: elapsedMs,
    };
    if (chatConv.id === null) {
      const created = await apiJson("/conversations", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      chatConv.id = created.id;
      $("chat-title").textContent = created.title;
      renderChatUsage(created.tokens);
      // Let the AI name the thread once there's something to name. Silent
      // best-effort: the question-derived title stays if the model can't.
      apiJson(`/conversations/${created.id}/retitle`, { method: "POST", silent: true })
        .then((named) => {
          if (chatConv.id === created.id) $("chat-title").textContent = named.title;
          loadConversationList();
        })
        .catch(() => {});
    } else if (opts.replaceLast || checkpointed) {
      // `checkpointed` matters as much as `replaceLast` here: a long agent
      // turn has already written a row for this exchange (see checkpointTurn),
      // so appending would leave the conversation holding the same question
      // twice — once half-finished and once complete.
      const saved = await apiJson(`/conversations/${chatConv.id}/turns/last`, {
        method: "PUT",
        body: JSON.stringify(payload),
      });
      renderChatUsage(saved.tokens);
    } else {
      const saved = await apiJson(`/conversations/${chatConv.id}/turns`, {
        method: "POST",
        body: JSON.stringify(payload),
      });
      renderChatUsage(saved.tokens);
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
  if (!(await confirmDialog("Delete this message?"))) return;

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
  // A summary belongs to the conversation it summarised (§35I).
  chatSummary = null;
  renderCompressionState();
  lastChatQuestion = "";
  // A pending question belongs to the conversation that asked it — starting
  // a new one must not silently answering_agent-tag whatever gets typed first.
  chatAwaitingAgentAnswer = false;
  $("chat-messages").replaceChildren();
  $("chat-title").textContent = "New chat";
  renderChatUsage(0);
  renderChatEmptyState();
  loadChatSuggestions();
}

// Download the open conversation as clean Markdown (questions + answers).
async function exportChatMarkdown() {
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
  await saveFile(`${slug}.md`, new Blob([md], { type: "text/markdown" }));
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
// Per-sidebar starting widths. The chat list carries the most text per row —
// a title, then a date/turns/tokens line — so it starts wider than a list of
// one-word category names.
const SIDEBAR_DEFAULTS = { "chat-sidebar": 300, sidebar: 260, "doc-sidebar": 260 };
const sidebarDefault = (id) => SIDEBAR_DEFAULTS[id] || 260;

function sidebarWidth(id, fallback = 260) {
  const saved = Number(localStorage.getItem(`sidebarWidth:${id}`));
  return Number.isFinite(saved) && saved >= SIDEBAR_MIN ? saved : fallback;
}

// Below this the layout stacks into one column and there is no column to size.
const STACKED_LAYOUT = "(max-width: 720px)";

function layoutIsStacked() {
  return window.matchMedia(STACKED_LAYOUT).matches;
}

function applySidebarWidth(aside, width) {
  const clamped = Math.min(Math.max(Math.round(width), SIDEBAR_MIN), SIDEBAR_MAX);
  localStorage.setItem(`sidebarWidth:${aside.id}`, String(clamped));
  aside.style.setProperty("--saved-width", `${clamped}px`);
  
  if (layoutIsStacked()) {
    aside.parentElement.style.removeProperty("grid-template-columns");
    return clamped;
  }
  
  if (aside.classList.contains("sidebar-collapsed")) {
    aside.parentElement.style.gridTemplateColumns = `48px minmax(0, 1fr)`;
  } else {
    aside.parentElement.style.gridTemplateColumns = `${clamped}px minmax(0, 1fr)`;
  }
  return clamped;
}

// Rotating a phone, or dragging a desktop window narrow, crosses the
// threshold without reloading — so re-decide then too.
window.matchMedia(STACKED_LAYOUT).addEventListener("change", () => {
  for (const id of ["sidebar", "chat-sidebar", "doc-sidebar"]) {
    const aside = document.getElementById(id);
    if (aside?.dataset.resizable) {
      applySidebarWidth(aside, sidebarWidth(id, sidebarDefault(id)));
    }
  }
});

function makeSidebarResizable(aside) {
  if (!aside || aside.dataset.resizable) return;
  aside.dataset.resizable = "1";
  applySidebarWidth(aside, sidebarWidth(aside.id, sidebarDefault(aside.id)));

  const handle = document.createElement("div");
  handle.className = "sidebar-resize";
  // A real slider: screen readers announce it, and arrows resize it.
  handle.setAttribute("role", "separator");
  handle.setAttribute("aria-orientation", "vertical");
  handle.setAttribute("tabindex", "0");
  handle.setAttribute("aria-label", "Resize the sidebar — arrow keys, or drag");
  aside.appendChild(handle);

  const collapseBtn = document.createElement("button");
  collapseBtn.className = "sidebar-collapse-toggle";
  collapseBtn.title = "Toggle Sidebar";
  collapseBtn.innerHTML = `
    <svg class="icon-expanded" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
      <line x1="9" y1="3" x2="9" y2="21"></line>
    </svg>
    <svg class="icon-collapsed" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
      <line x1="15" y1="3" x2="15" y2="21"></line>
    </svg>
    <svg class="icon-peek" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <line x1="12" y1="17" x2="12" y2="22"></line>
      <path d="M5 17h14v-1.5c0-1.5-1.5-2-1.5-4v-3c0-3-2-5-5.5-5S6.5 5.5 6.5 8.5v3c0 2-1.5 2.5-1.5 4V17z"></path>
    </svg>
  `;
  collapseBtn.addEventListener("click", () => {
    aside.classList.toggle("sidebar-collapsed");
    aside.parentElement.classList.toggle("layout-sidebar-collapsed");
    
    // We update the grid column based on whether it is now collapsed or not
    if (aside.classList.contains("sidebar-collapsed")) {
      aside.parentElement.style.gridTemplateColumns = `48px minmax(0, 1fr)`;
    } else {
      const saved = Number(localStorage.getItem(`sidebarWidth:${aside.id}`)) || sidebarDefault(aside.id);
      aside.parentElement.style.gridTemplateColumns = `${saved}px minmax(0, 1fr)`;
    }
  });
  aside.appendChild(collapseBtn);

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
      applySidebarWidth(aside, sidebarDefault(aside.id)); // back to the default
    }
  });
  // Double-click the handle to reset, the convention everywhere else.
  handle.addEventListener("dblclick", () =>
    applySidebarWidth(aside, sidebarDefault(aside.id))
  );
}

function initResizableSidebars() {
  for (const id of ["sidebar", "chat-sidebar", "doc-sidebar"]) {
    const aside = document.getElementById(id);
    if (aside) makeSidebarResizable(aside);
  }
  makeWebPanelResizable(document.getElementById("web-panel"));
}

// The Notes sidebar used to mirror `main`'s height into its own `min-height`
// via a ResizeObserver watching `main`. That's exactly backwards for a grid
// row with `align-items: stretch`: setting the sidebar's height taller grows
// the shared row, which stretches `main` to fill it, which re-fires the
// observer with a bigger `main.offsetHeight` — an unbounded feedback loop
// (reported as the sidebar "continuously expanding"). The chat sidebar never
// needed this: it just sets `height: 100%` and lets the grid resolve it (see
// `#chat-sidebar` in style.css). Removed here too — `.layout`'s own
// `align-items: stretch` plus the `min-height: var(--page-sticky-h)` floor in
// style.css already produces the right height with no JS and nothing to loop.

// The web panel (§36G) isn't a grid column like the three sidebars above — it
// is a flex sibling of #chat-main inside <main>, sized by `flex-basis:
// clamp(19rem, 30%, 26rem)` (see style.css). That clamp is a considered
// default, not a placeholder — it keeps the column readable without a drag —
// so unlike the sidebars, this only overrides it once the user actually asks
// to, and "reset" removes the inline style entirely rather than reapplying a
// remembered default. Below WEB_PANEL_NARROW the panel takes the whole of
// <main> (see the media query in style.css); an inline flex-basis would beat
// that stylesheet rule regardless of the media query; so it stays suppressed
// there and comes back once the window is wide enough again.
const WEB_PANEL_MIN = 280;
const WEB_PANEL_MAX = 900;
const WEB_PANEL_NARROW = "(max-width: 1100px)";

function webPanelIsNarrow() {
  return window.matchMedia(WEB_PANEL_NARROW).matches;
}

// function applyWebPanelWidth(panel, width) {
//   const clamped = Math.min(Math.max(Math.round(width), WEB_PANEL_MIN), WEB_PANEL_MAX);
//   localStorage.setItem("webPanelWidth", String(clamped));
//   panel.style.flexBasis = webPanelIsNarrow() ? "" : `${clamped}px`;
//   // panel.style.flex = webPanelIsNarrow() ? "" : `0 1 ${clamped}px`;
//   return clamped;
// }

function applyWebPanelWidth(panel, width) {
  // Constrain max width to 900px OR 60% of the window width, whichever is smaller.
  const dynamicMax = Math.min(WEB_PANEL_MAX, window.innerWidth * 0.6);
  const clamped = Math.min(Math.max(Math.round(width), WEB_PANEL_MIN), dynamicMax);
  localStorage.setItem("webPanelWidth", String(clamped));
  
  if (webPanelIsNarrow()) {
    panel.style.removeProperty("flex");
    panel.style.removeProperty("width");
  } else {
    // 0 0 prevents flex shrinkage so the drag math stays pixel-perfect
    panel.style.flex = `0 0 ${clamped}px`;
    panel.style.width = `${clamped}px`;
  }
  return clamped;
}

// function resetWebPanelWidth(panel) {
//   localStorage.removeItem("webPanelWidth");
//   panel.style.removeProperty("flex-basis");
// }

function resetWebPanelWidth(panel) {
  localStorage.removeItem("webPanelWidth");
  panel.style.removeProperty("flex");
  panel.style.removeProperty("width");
}

// window.matchMedia(WEB_PANEL_NARROW).addEventListener("change", () => {
//   const panel = document.getElementById("web-panel");
//   if (!panel?.dataset.resizable) return;
//   const saved = Number(localStorage.getItem("webPanelWidth"));
//   panel.style.flexBasis =
//     Number.isFinite(saved) && saved >= WEB_PANEL_MIN && !webPanelIsNarrow()
//       ? `${saved}px`
//       : "";
// });

window.matchMedia(WEB_PANEL_NARROW).addEventListener("change", () => {
  const panel = document.getElementById("web-panel");
  if (!panel?.dataset.resizable) return;
  
  const saved = Number(localStorage.getItem("webPanelWidth"));
  if (Number.isFinite(saved) && saved >= WEB_PANEL_MIN && !webPanelIsNarrow()) {
    panel.style.flex = `0 0 ${saved}px`;
    panel.style.width = `${saved}px`;
  } else {
    panel.style.removeProperty("flex");
    panel.style.removeProperty("width");
  }
});

function makeWebPanelResizable(panel) {
  if (!panel || panel.dataset.resizable) return;
  panel.dataset.resizable = "1";

  const saved = Number(localStorage.getItem("webPanelWidth"));
  if (Number.isFinite(saved) && saved >= WEB_PANEL_MIN) applyWebPanelWidth(panel, saved);

  const handle = document.createElement("div");
  handle.className = "sidebar-resize web-panel-resize";
  handle.setAttribute("role", "separator");
  handle.setAttribute("aria-orientation", "vertical");
  handle.setAttribute("tabindex", "0");
  handle.setAttribute("aria-label", "Resize the web panel — arrow keys, or drag");
  panel.appendChild(handle);

  const startDrag = (event) => {
    event.preventDefault();
    const startX = event.clientX;
    const startWidth = panel.getBoundingClientRect().width;
    document.body.classList.add("resizing-sidebar");

    // The panel sits to the *right* of the conversation, so dragging the
    // handle left (a negative clientX delta) is what widens it — the mirror
    // image of the sidebars, whose handle is on their trailing (right) edge.
    const move = (e) => applyWebPanelWidth(panel, startWidth - (e.clientX - startX));
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
    const current = panel.getBoundingClientRect().width;
    // Same mirrored direction as the drag: ArrowLeft widens, ArrowRight narrows.
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      applyWebPanelWidth(panel, current + step);
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      applyWebPanelWidth(panel, current - step);
    } else if (event.key === "Home") {
      event.preventDefault();
      resetWebPanelWidth(panel);
    }
  });
  handle.addEventListener("dblclick", () => resetWebPanelWidth(panel));
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
    if (willOpen) openActionMenu(menu, opener);
    else closeActionMenus();
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

// "12.4k" beats "12417" when the number is a rough sense of scale, which is
// all a token count ever is.
function formatTokens(n) {
  const count = Number(n) || 0;
  if (count < 1000) return String(count);
  return `${(count / 1000).toFixed(count < 10000 ? 1 : 0)}k`;
}

// Server timestamps are UTC. Most now carry an explicit offset or Z; older
// stored values may carry neither, and a naive string is parsed as LOCAL by
// JavaScript. One parser, so the assumption lives in exactly one place.
function parseServerTime(iso) {
  if (!iso) return null;
  const text = String(iso);
  const hasZone = /[Zz]$|[+-]\d{2}:?\d{2}$/.test(text);
  const date = new Date(hasZone ? text : `${text}Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

// How long ago, in words. A wall of identical timestamps tells you nothing;
// "yesterday" and "3 weeks ago" are what you actually navigate by.
function relativeTime(iso) {
  // Timestamps now come back explicitly UTC ("...+00:00"), so the old
  // unconditional `iso + "Z"` produced "…+00:00Z" — an unparseable string that
  // rendered literally as "Invalid Date" in the documents sidebar. Only assume
  // UTC when the value doesn't already say what it is.
  const then = parseServerTime(iso);
  if (!then) return "";
  const seconds = Math.max(0, (Date.now() - then.getTime()) / 1000);
  if (seconds < 90) return "just now";
  const minutes = seconds / 60;
  if (minutes < 60) return `${Math.round(minutes)} min ago`;
  const hours = minutes / 60;
  if (hours < 24) return `${Math.round(hours)}h ago`;
  const days = Math.round(hours / 24);
  if (days === 1) return "yesterday";
  if (days < 7) return `${days} days ago`;
  // Screenshotted as "1 weeks ago". Rounding 8 days gives 1, and the plural
  // was hard-coded — the only branch here that forgot to agree with its own
  // number.
  const weeks = Math.round(days / 7);
  if (days < 30) return `${weeks} week${weeks === 1 ? "" : "s"} ago`;
  return then.toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

//: How many chats the switcher shows. Searching and sorting all of them is
//: the Library's job now (§36F); this list exists so the chat you were in ten
//: minutes ago is one click away without leaving the tab you are typing in,
//: and eight is comfortably more than "the one before this one" while still
//: fitting beside a conversation.
const RECENT_CHATS_SHOWN = 8;

async function loadConversationList() {
  const conversations = (await apiJson("/conversations").catch(() => [])).slice(
    0,
    RECENT_CHATS_SHOWN
  );
  const list = $("conversation-list");
  list.replaceChildren();
  const empty = $("conv-empty");
  empty.classList.toggle("hidden", conversations.length > 0);
  empty.textContent = "No saved chats yet — ask something!";

  let sawUnpinned = false;
  for (const conversation of conversations) {
    // One divider between the pinned block and the rest, so "pinned" reads as
    // a section rather than as an unexplained reordering.
    if (!conversation.pinned && !sawUnpinned && list.children.length) {
      const rule = document.createElement("li");
      rule.className = "conv-divider";
      rule.setAttribute("aria-hidden", "true");
      list.appendChild(rule);
    }
    if (!conversation.pinned) sawUnpinned = true;

    const li = document.createElement("li");
    if (conversation.id === chatConv.id) li.classList.add("active-conv");
    if (conversation.pinned) li.classList.add("pinned-conv");

    const title = document.createElement("span");
    title.className = "conv-title";
    title.title = "Open this chat";
    title.addEventListener("click", () => openConversation(conversation.id));

    const name = document.createElement("span");
    name.className = "conv-name";
    name.textContent = `${conversation.pinned ? "📌 " : ""}${conversation.title}`;
    const meta = document.createElement("span");
    meta.className = "conv-meta muted";
    const bits = [relativeTime(conversation.updated_at)];
    if (conversation.turns) {
      bits.push(`${conversation.turns} ${conversation.turns === 1 ? "turn" : "turns"}`);
    }
    // "tok" rather than "tokens": the row is one line by design, and the
    // number is the useful part — spelling out the unit is what pushed it
    // into an ellipsis at the default sidebar width.
    if (conversation.tokens) bits.push(`${formatTokens(conversation.tokens)} tok`);
    meta.textContent = bits.join(" · ");
    meta.title = bits.join(" · "); // in full, if the row still has to clip
    title.append(name, meta);
    // The title often isn't the subject — show what was actually asked.
    if (conversation.preview && conversation.preview !== conversation.title) {
      title.title = conversation.preview;
    }
    // One ⋯ instead of three buttons. In a sidebar this narrow they were
    // taking most of the row, leaving a few characters of the chat's name.
    const actions = document.createElement("span");
    actions.className = "entry-actions";
    const items = [];
    items.push(
      makeMenuItem(
        conversation.pinned ? "📌 Unpin" : "📌 Pin",
        conversation.pinned ? "Let this chat sort by date again" : "Keep this chat at the top",
        async () => {
          await apiJson(`/conversations/${conversation.id}/pin`, {
            method: "PUT",
            body: JSON.stringify({ pinned: !conversation.pinned }),
          });
          loadConversationList();
        }
      )
    );
    items.push(
      makeMenuItem("✎ Rename", "Rename this chat", async () => {
        const next = await promptDialog("Rename this chat:", conversation.title);
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
        if (!(await confirmDialog("Delete this saved chat?"))) return;
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

// An edited answer is labelled, always. A transcript that silently presents
// your words as the model's is worse than no transcript.
function editedMarker() {
  const tag = document.createElement("span");
  tag.className = "edited-marker muted";
  tag.textContent = "edited by you";
  tag.title = "You changed this answer after the model wrote it";
  return tag;
}

// Editing questions has worked for a while; answers were fixed forever, so a
// model that got one detail wrong left you regenerating the whole thing and
// hoping. Editing in place keeps the rest of the thread intact.
function editChatAnswer(handles, turnIndex, current) {
  if (handles.bubble.querySelector(".answer-editor")) return; // already open
  const editor = document.createElement("div");
  editor.className = "answer-editor";
  const box = document.createElement("textarea");
  box.value = current;
  box.rows = Math.min(20, Math.max(4, current.split("\n").length + 1));
  box.setAttribute("aria-label", "Edit this answer");

  const target = handles.timeline.answerElement();
  const finish = (markdown) => {
    editor.remove();
    target.classList.remove("hidden");
    if (markdown !== null) handles.timeline.replaceAnswer(markdown);
  };

  const save = document.createElement("button");
  save.className = "small";
  save.type = "button";
  save.textContent = "Save";
  save.addEventListener("click", async () => {
    const next = box.value.trim();
    if (!next) {
      toast("An empty answer isn't a correction — delete the message instead.", true);
      return;
    }
    if (chatConv.id) {
      try {
        await apiJson(`/conversations/${chatConv.id}/turns/${turnIndex}/answer`, {
          method: "PUT",
          body: JSON.stringify({ content: next }),
        });
      } catch (error) {
        toast(error.message, true);
        return; // leave the editor open rather than losing the edit
      }
    }
    if (chatConv.turns[turnIndex]) chatConv.turns[turnIndex].answer = next;
    finish(next);
    if (!handles.bubble.querySelector(".edited-marker")) {
      handles.bubble.insertBefore(
        editedMarker(),
        handles.bubble.querySelector(".msg-actions")
      );
    }
    toast("Answer updated.");
  });

  const cancel = document.createElement("button");
  cancel.className = "ghost small";
  cancel.type = "button";
  cancel.textContent = "Cancel";
  cancel.addEventListener("click", () => finish(null));

  const row = document.createElement("div");
  row.className = "row";
  row.append(save, cancel);
  editor.append(box, row);
  target.classList.add("hidden");
  target.after(editor);
  box.focus();
}

async function openConversation(id) {
  const full = await apiJson(`/conversations/${id}`).catch(() => null);
  if (!full) return;
  chatConv = { id: full.id, turns: [] };
  chatAwaitingAgentAnswer = false; // a saved thread's own pending ask, if any, isn't answerable live
  // Not carried across conversations, and not persisted: re-deriving it is one
  // click, and a summary restored against the wrong thread would be worse than
  // no summary at all.
  chatSummary = null;
  renderCompressionState();
  $("chat-title").textContent = full.title;
  renderChatUsage(full.tokens);
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
      // Rebuild the metadata line. Reported in IDEAS.md as "chat message
      // metadata disappears on reload": it was only ever built from the live
      // stream, so reopening a chat showed answers with nothing to say which
      // model wrote them or what they cost. Turns saved before this stored no
      // stats and correctly get no line, rather than a row of "?"s.
      if (message.stats) {
        handles.bubble.appendChild(
          messageMetaLine({
            model: message.stats.model,
            elapsedMs: message.elapsed_ms,
            stats: message.stats,
            toolCount: (message.tools || []).length,
            rounds: message.stats.round || 0,
          })
        );
      }
      const turnIndex = chatConv.turns.length; // index this pair will occupy
      if (message.edited) handles.bubble.appendChild(editedMarker());
      handles.bubble.appendChild(
        chatMessageActions([
          { label: "⧉", title: "Copy answer", onClick: (e) => copyToClipboard(message.content, e.currentTarget) },
          {
            label: "✎",
            title: "Edit this answer",
            onClick: () => editChatAnswer(handles, turnIndex, message.content),
          },
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

  // Re-check after the await in case a message was sent while we waited
  if ($("chat-messages").querySelector(".msg")) return;

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
  // These chips arrive after the tab is drawn and are a row or two of height
  // the composer's fit was measured without.
  refitComposer();
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
          if (!(await confirmDialog(`Delete the “${persona.name}” persona?`))) return;
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

// --- skills (§21): named, repeatable jobs over the notebook ----------------------

// A skill used to be {name, prompt} and clicking one dropped its prompt into
// the chat box. It is now a job: what to do, the steps to do it in, the tools
// it may use, and the values it asks for first. The built-in ones used to be
// a list right here, which meant the server could not resolve a skill the
// user clicked; they are served from GET /skills now, alongside the user's own.
let skillsCache = [];
let skillLimits = { steps: 10, tools: 12, inputs: 5 };

async function loadSkills() {
  const body = await apiJson("/skills").catch(() => null);
  if (!body) return skillsCache;
  skillsCache = body.skills || [];
  if (body.limits) skillLimits = body.limits;
  return skillsCache;
}

function allSkills() {
  return skillsCache;
}

function customSkills() {
  return skillsCache.filter((skill) => !skill.builtin);
}

// Which custom skill (by name) the editor is currently editing, if any.
// Tracking it lets Edit rename a skill instead of leaving a duplicate.
let editingSkillName = null;

// Steps and inputs are edited as one-per-line text, which is the shape people
// already write a list in. An input is "name" or "name: the question to ask".
function stepsToText(steps) {
  return (steps || []).join("\n");
}

function textToSteps(text) {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

function inputsToText(inputs) {
  return (inputs || [])
    .map((item) => (item.label && item.label !== `${item.name}?` ? `${item.name}: ${item.label}` : item.name))
    .join("\n");
}

function textToInputs(text) {
  return textToSteps(text).map((line) => {
    const [name, ...rest] = line.split(":");
    return { name: name.trim(), label: rest.join(":").trim(), required: true };
  });
}

function startEditingSkill(skill) {
  editingSkillName = skill.name;
  $("skill-name").value = skill.name;
  $("skill-prompt").value = skill.prompt;
  $("skill-description").value = skill.description || "";
  $("skill-steps").value = stepsToText(skill.steps);
  $("skill-inputs").value = inputsToText(skill.inputs);
  renderSkillToolPicker(skill.tools || []);
  $("skill-add").textContent = "Save changes";
  $("skill-cancel").classList.remove("hidden");
  $("skill-status").textContent = `Editing “${skill.name}”…`;
  $("skill-prompt").focus();
}

function stopEditingSkill() {
  editingSkillName = null;
  for (const id of ["skill-name", "skill-prompt", "skill-description", "skill-steps", "skill-inputs"]) {
    $(id).value = "";
  }
  renderSkillToolPicker([]);
  $("skill-add").textContent = "Add skill";
  $("skill-cancel").classList.add("hidden");
  $("skill-status").textContent = "";
}

// The tools a skill may use, as checkboxes over the real registry — so a
// skill cannot name a tool that doesn't exist, and picking them is a matter
// of reading rather than remembering.
async function renderSkillToolPicker(selected = []) {
  const box = $("skill-tool-list");
  if (!box) return;
  const chosen = new Set(selected);
  const catalog = await apiJson("/chat/tools").catch(() => []);
  box.replaceChildren();
  for (const tool of catalog) {
    const label = document.createElement("label");
    label.className = "check-row";
    const input = document.createElement("input");
    input.type = "checkbox";
    input.value = tool.name;
    input.checked = chosen.has(tool.name);
    const text = document.createElement("span");
    text.textContent = tool.name;
    text.title = tool.description;
    label.append(input, text);
    box.appendChild(label);
  }
}

function chosenSkillTools() {
  const box = $("skill-tool-list");
  if (!box) return [];
  return [...box.querySelectorAll("input:checked")].map((input) => input.value);
}

// Run a skill. The server owns what a skill is, so this sends its name and
// the values it asked for — not a prompt assembled here. An action skill
// brings its own permission to act, so agent mode is not switched on behind
// the user's back and left on afterwards.
function runSkill(skill) {
  if ((skill.inputs || []).length) {
    askSkillInputs(skill, (values) => startSkill(skill, values));
    return;
  }
  startSkill(skill, {});
}

// A plan the model drew for the last request, run the way a skill is run
// (§35K). The steps are sent back rather than parked on the server, for the
// same reason `ask_user`'s answer is: nothing to expire, nothing lost on a
// reload, and the run is a message in the conversation like any other.
function startPlannedRun(goal, steps) {
  switchTab("chat"); // same reason as startSkill: the run happens in the chat
  sendChatMessage(`🧭 ${goal}`, { plan: { goal, steps } });
}

function startSkill(skill, values) {
  // Both entry points land here — the ⚡ dropdown and a run the agent started
  // itself (§33) — so the dashboard's recent-skill buttons cover both.
  noteSkillRun(skill.name);
  // **And so does the dashboard's ⚡ chip, which is why this is here.**
  // Reported: *"when I click on the suggested skills in the dashboard, it runs
  // the skill but doesn't navigate me to it."* Exactly right — the run started,
  // the answer streamed into a tab nobody was looking at, and the dashboard sat
  // there as though the button had done nothing. A skill *is* a message in the
  // conversation, so starting one has to take you to the conversation. From
  // the ⚡ dropdown, where you are already here, this is a no-op.
  switchTab("chat");
  const given = Object.values(values).filter(Boolean).join(", ");
  sendChatMessage(`⚡️ ${skill.name}${given ? ` — ${given}` : ""}`, {
    skill: skill.name,
    skillInputs: values,
  });
}

// One dialog for everything a skill asks for. Two window.prompt boxes in a
// row is how this started, and the second one gave no clue which skill it
// belonged to or what the first answer had been.
function askSkillInputs(skill, done) {
  const overlay = $("skill-run-overlay");
  const fields = $("skill-run-fields");
  $("skill-run-title").textContent = skill.name;
  $("skill-run-description").textContent = skill.description || skill.prompt;
  fields.replaceChildren();
  const inputs = [];
  for (const item of skill.inputs || []) {
    const label = document.createElement("label");
    label.className = "field";
    const text = document.createElement("span");
    text.textContent = item.label || item.name;
    const box = document.createElement("input");
    box.type = "text";
    box.value = item.default || "";
    box.maxLength = 200;
    box.placeholder = item.required ? "" : "optional";
    label.append(text, box);
    fields.appendChild(label);
    inputs.push({ item, box });
  }

  const close = () => {
    overlay.classList.add("hidden");
    document.removeEventListener("keydown", onKey);
  };
  const submit = () => {
    const values = {};
    for (const { item, box } of inputs) {
      const value = box.value.trim();
      if (!value && item.required && !item.default) {
        box.focus();
        // Nothing is sent half-filled: a skill run with a blank {{topic}}
        // searches the whole notebook for nothing and reads as being ignored.
        toast(`“${skill.name}” needs ${item.label || item.name}.`, true);
        return;
      }
      values[item.name] = value;
    }
    close();
    done(values);
  };
  const onKey = (event) => {
    if (event.key === "Escape") close();
    else if (event.key === "Enter" && event.target.tagName === "INPUT") submit();
  };

  $("skill-run-go").onclick = submit;
  $("skill-run-cancel").onclick = close;
  document.addEventListener("keydown", onKey);
  overlay.classList.remove("hidden");
  inputs[0]?.box.focus();
}

// Skills as a dropdown rather than a row of chips. Ten built-ins plus up to
// thirty of your own is a wrapping wall of buttons that pushes the message box
// off the screen, and every one of them is a click you can make by accident
// while reaching for the text area. A select is one line, groups "yours" apart
// from the built-ins, and — the part that matters — leaves room to say what a
// skill DOES next to its name instead of hiding it in a hover.
async function loadChatSkills() {
  await loadSkills();
  const box = $("chat-skills");
  box.replaceChildren();

  // "⚡" alone, not "⚡ Skill:". The select's own placeholder already reads
  // "Choose a skill…", so the label was saying it twice in a strip where every
  // character costs width.
  const label = document.createElement("span");
  label.className = "muted chat-skill-mark";
  // With the emoji variation selector: bare U+26A1 renders as a thin
  // text-style glyph on any platform whose default presentation for it is
  // text, which beside a colour 🌐 and 🤖 in the same strip looks like a mark
  // that failed to load. Screenshotted in Chromium on Linux, where it does.
  label.textContent = "⚡️";
  label.title = "Skills — saved jobs you can run over your notes";

  const select = document.createElement("select");
  select.className = "small-select";
  select.id = "chat-skill-select";
  select.setAttribute("aria-label", "Run a skill");
  const placeholder = document.createElement("option");
  placeholder.value = "";
  placeholder.textContent = "Choose a skill…";
  select.appendChild(placeholder);

  const groups = { builtin: [], mine: [] };
  for (const skill of allSkills()) {
    groups[skill.builtin ? "builtin" : "mine"].push(skill);
  }
  for (const [key, title] of [["mine", "Yours"], ["builtin", "Built-in"]]) {
    if (!groups[key].length) continue;
    const group = document.createElement("optgroup");
    group.label = title;
    for (const skill of groups[key]) {
      const option = document.createElement("option");
      option.value = skill.name;
      // ⚙ means "this one changes your notebook", not "this one uses tools" —
      // nearly every skill uses tools, and a marker on all of them says nothing.
      option.textContent = skill.name + (skill.changes ? " ⚙" : "");
      option.title = skillSummary(skill);
      group.appendChild(option);
    }
    select.appendChild(group);
  }

  // Chosen, then run — rather than running on change. A dropdown that fires an
  // action the instant it changes cannot be browsed, and these actions edit
  // the notebook.
  const run = smallButton("Run", "Run the selected skill", () => {
    const chosen = allSkills().find((s) => s.name === select.value);
    if (chosen) runSkill(chosen);
  });
  run.disabled = true;
  select.addEventListener("change", () => {
    run.disabled = !select.value;
    // What the skill does moves to the select's own tooltip rather than a line
    // of prose beside it. It was a sentence of running text in a control
    // strip — the widest thing in the dock, and unreadable at a glance because
    // it was clipped to 120 characters anyway. `skillSummary` already puts the
    // full description, the steps and the tools on every option's title.
    const chosen = allSkills().find((s) => s.name === select.value);
    select.title = chosen ? skillSummary(chosen) : "Run one of your saved skills";
  });

  const manage = smallButton("＋", "Add or edit skills in Settings", () =>
    openSettingsModal("skills")
  );
  manage.classList.add("ghost");

  box.append(label, select, run, manage);
  box.classList.remove("hidden");
}

function skillSummary(skill) {
  const lines = [skill.description || skill.prompt];
  if (skill.changes) lines.push("(This one changes your notes — deletes still ask first.)");
  if ((skill.steps || []).length) {
    lines.push("", ...skill.steps.map((step, i) => `${i + 1}. ${step}`));
  }
  if ((skill.tools || []).length) lines.push("", `Tools: ${skill.tools.join(", ")}`);
  if ((skill.inputs || []).length) {
    lines.push("", `Asks you for: ${skill.inputs.map((i) => i.name).join(", ")}`);
  }
  return lines.join("\n");
}

async function saveSkillList(skills) {
  prefsCache = await apiJson("/preferences", {
    method: "PUT",
    body: JSON.stringify({ skills }),
  });
  await loadSkills();
  renderSkillSettings();
  loadChatSkills();
}

function skillRow(skill) {
  const li = document.createElement("li");
  const row = document.createElement("div");
  row.className = "entry-meta skill-row";
  row.appendChild(chip(skill.name));
  if (skill.builtin) row.appendChild(chip("built-in", "tag"));
  if (skill.changes) row.appendChild(chip("changes notes", "tag"));
  if ((skill.steps || []).length) {
    row.appendChild(chip(`${skill.steps.length} steps`, "tag"));
  }
  if ((skill.tools || []).length) {
    row.appendChild(chip(`${skill.tools.length} tools`, "tag"));
  }
  for (const item of skill.inputs || []) row.appendChild(chip(`asks: ${item.name}`, "tag"));
  // Its own class, not `persona-preview`. That one is `white-space: nowrap`
  // with an ellipsis, which is right for a persona (one line of voice) and
  // wrong here: a skill's description is the only thing that says what it
  // *does*, and clipping it to the width left over after five chips showed
  // three words. Reported twice. It wraps onto its own line now.
  const note = document.createElement("span");
  note.className = "muted skill-blurb";
  note.textContent = skill.description || skill.prompt;
  row.appendChild(note);
  if (!skill.builtin) {
    const actions = document.createElement("span");
    actions.className = "entry-actions";
    actions.appendChild(
      smallButton("Edit", "Edit this skill", () => startEditingSkill(skill))
    );
    actions.appendChild(
      smallButton("Delete", "Remove this skill", async () => {
        if (!(await confirmDialog(`Delete the “${skill.name}” skill?`))) return;
        await saveSkillList(customSkills().filter((s) => s.name !== skill.name));
      })
    );
    row.appendChild(actions);
  }
  li.appendChild(row);
  return li;
}

async function renderSkillSettings() {
  await loadSkills();
  const list = $("skill-list");
  list.replaceChildren();
  for (const skill of allSkills()) list.appendChild(skillRow(skill));
  if (!$("skill-tool-list").children.length) renderSkillToolPicker([]);
}

async function addSkill() {
  const name = $("skill-name").value.trim();
  const promptText = $("skill-prompt").value.trim();
  const status = $("skill-status");
  status.classList.remove("error");
  if (!name || !promptText) {
    status.textContent = "Both a name and a request are needed.";
    return;
  }
  // Drop any skill with the new name AND (when editing) the one being edited,
  // so saving updates in place and even a rename doesn't leave a duplicate.
  const custom = customSkills().filter(
    (s) => s.name !== name && s.name !== editingSkillName
  );
  custom.push({
    name,
    prompt: promptText,
    description: $("skill-description").value.trim(),
    steps: textToSteps($("skill-steps").value),
    tools: chosenSkillTools(),
    inputs: textToInputs($("skill-inputs").value),
  });
  const wasEditing = editingSkillName;
  try {
    await saveSkillList(custom);
  } catch (error) {
    // The server validates both ways in, so this is the same message the AI
    // would get for the same mistake — an undeclared {{placeholder}}, say.
    status.classList.add("error");
    status.textContent = error.message;
    return;
  }
  stopEditingSkill();
  status.textContent = wasEditing ? `Updated “${name}”.` : `Saved “${name}”.`;
}

// --- Wave O: agent-tools toggles ----------------------------------------------------

// How many tool descriptions each message carries (§11a). Saved on change
// rather than behind an Apply button — the search-engine picker taught us
// that a control which saves nothing until later reads as broken, because
// the next status poll paints the old value back over it.
function renderToolFocus(current) {
  for (const radio of document.querySelectorAll('input[name="tool-focus"]')) {
    radio.checked = radio.value === current;
    radio.onchange = async () => {
      if (!radio.checked) return;
      const status = $("tool-focus-status");
      status.textContent = "Saving…";
      prefsCache = await apiJson("/preferences", {
        method: "PUT",
        body: JSON.stringify({ tool_focus: radio.value }),
      });
      status.textContent =
        radio.value === "auto"
          ? "Each message is offered the tools it needs."
          : "Every message is offered every tool.";
    };
  }
}

async function renderToolSettings() {
  const list = $("tool-list");
  const [catalog, prefs] = await Promise.all([
    apiJson("/chat/tools").catch(() => []),
    apiJson("/preferences").catch(() => ({ disabled_tools: [] })),
  ]);
  prefsCache = prefs;
  renderToolFocus(prefs.tool_focus || "auto");
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
  return saveFile(
    filename,
    new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" })
  );
}

// --- saving a generated file (§35E) ----------------------------------------------
//
// Every export here used to build a Blob and click a hidden `<a download>`.
// That works in a browser tab and does nothing whatsoever in the desktop
// window: pywebview has no download handler, so the click is swallowed and
// the user gets no file and no error. Reported as "I don't think any of the
// file save features in the whole application work on the python desktop app",
// which was exactly right and true of all of them at once.
//
// So there are two paths, chosen by asking the server which shell it is
// serving rather than by sniffing the user agent — pywebview's user agent is
// not reliably distinguishable, and a wrong guess here is a silent failure in
// the direction we are trying to fix.
let isDesktopShell = null; // null = not yet asked

async function desktopShell() {
  if (isDesktopShell === null) {
    const health = await apiJson("/health", { silent: true }).catch(() => null);
    isDesktopShell = !!(health && health.desktop);
  }
  return isDesktopShell;
}

function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    // readAsDataURL gives "data:<type>;base64,<payload>" — take the payload.
    reader.onload = () => resolve(String(reader.result).split(",", 2)[1] || "");
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

// Save a Blob under `filename`. Resolves once the file is somewhere the user
// can find it, and says where when that isn't the browser's own downloads.
async function saveFile(filename, blob) {
  if (await desktopShell()) {
    try {
      const saved = await apiJson("/files/save", {
        method: "POST",
        body: JSON.stringify({
          filename,
          content_base64: await blobToBase64(blob),
        }),
      });
      // Where it went matters more here than in a browser: there is no
      // downloads shelf to look at, so an unannounced file is a lost one.
      toast(`Saved to ${saved.path}`);
      return saved;
    } catch (error) {
      toast(`Couldn't save ${filename}: ${error.message}`, true);
      return null;
    }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  // In the document, not detached: some engines ignore a click on an anchor
  // that was never in the DOM.
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  return { filename };
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
    category = await promptDialog("New category name:", "", { confirmLabel: "Move" });
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
  const tag = await promptDialog("Tag to add to the selected notes:", "", { confirmLabel: "Add tag" });
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
  if (!(await confirmDialog(`Move ${ids.length} note${ids.length === 1 ? "" : "s"} to the recycle bin?`)))
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
  renderNameNudge(el);
  // Drawn here rather than at startup: renderEmblem reads the current accent,
  // so it has to be redrawn when the dashboard repaints after a theme change.
  // It also can't be sized while the tab is display:none — p5 measures zero —
  // which is why this sits in the dashboard's own render and not in init.
  renderEmblem($("dash-hero-emblem"), 46, { animate: true });
  paintDashClock();
  // One ticking clock, however many times the dashboard re-renders.
  if (dashClockTimer) clearInterval(dashClockTimer);
  dashClockTimer = setInterval(paintDashClock, 1000);
  renderDashSubmessage().catch(() => {});
}

// The greeting can address you by name, but the setting for it is one field
// among a dozen in Preferences — so for most people it is simply never found,
// and the greeting looks like it just doesn't do that (user-reported). One
// quiet offer beside the greeting, only while no name is set, and it stops
// asking the moment you either set one or dismiss it.
function renderNameNudge(greetingEl) {
  const existing = document.getElementById("dash-name-nudge");
  if (existing) existing.remove();
  const name = ((prefsCache && prefsCache.display_name) || "").trim();
  if (name || localStorage.getItem("nameNudgeDismissed") === "1") return;

  const wrap = document.createElement("span");
  wrap.id = "dash-name-nudge";
  wrap.className = "name-nudge";
  const add = document.createElement("button");
  add.type = "button";
  add.className = "ghost small";
  add.textContent = "👋 Add your name";
  add.title = "Let the greeting call you by name";
  add.addEventListener("click", async () => {
    await openSettingsModal("preferences");
    const field = $("pref-display-name");
    field.focus();
    field.select();
  });
  const dismiss = document.createElement("button");
  dismiss.type = "button";
  dismiss.className = "ghost small";
  dismiss.textContent = "✕";
  dismiss.title = "Don't ask again";
  dismiss.setAttribute("aria-label", "Dismiss the name suggestion");
  dismiss.addEventListener("click", () => {
    localStorage.setItem("nameNudgeDismissed", "1");
    wrap.remove();
  });
  wrap.append(add, dismiss);
  greetingEl.after(wrap);
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
  // A dragged composer height is only valid for the window it was dragged in.
  refitComposer();
});

// Fade a tab-strip edge only while there is something hidden beyond it.
//
// This was a media query, which is the wrong test: whether the tabs overflow
// depends on how long the AI status pill's text currently is and whether the
// wordmark is showing, not only on the window width. So a fixed breakpoint
// faded a tab bar that fitted perfectly, and left a scrolling one at other
// widths looking as though "Reminders" had been clipped — which is exactly
// the complaint the fade exists to prevent. Measuring is both simpler and
// correct at every width.
//
// Measuring *overflow* was still not enough, and it was reported: "the
// reminders tab in the top bar is partially faded out on the right." A bar
// scrolled to its end has nothing further right, but the old single class
// kept fading anyway — so the last tab was permanently dimmed, which reads as
// a disabled control. The question each edge answers is "is there more THIS
// way", so each edge gets its own class and the answer is recomputed on
// scroll as well as on resize.
// How much room the tab strip has if it stays on the header's own row.
//
// Measured from the header's other children rather than guessed from a
// breakpoint, for the same reason the fade is: whether the tabs fit depends on
// the wordmark, the status pill's current text and which header buttons are
// showing, none of which a width range knows about.
function tabRowSpace() {
  const header = document.getElementById("top-bar");
  const bar = $("tab-bar");
  if (!header || !bar) return 0;
  const style = getComputedStyle(header);
  const gap = parseFloat(style.columnGap || style.gap) || 0;
  const padding =
    (parseFloat(style.paddingLeft) || 0) + (parseFloat(style.paddingRight) || 0);
  let others = 0;
  let siblings = 0;
  for (const child of header.children) {
    if (child === bar || child.classList.contains("hidden")) continue;
    others += child.getBoundingClientRect().width;
    siblings += 1;
  }
  return header.clientWidth - padding - others - gap * siblings;
}

// What the tab strip actually needs, summed from the buttons rather than read
// off the strip's own box.
//
// **This is the fix for a reported bug, and the distinction is the whole
// bug.** The wrap test used `bar.scrollWidth`, which is `max(content,
// clientWidth)` — and the wrapped rule gives the strip `flex-basis: 100%`. So
// the moment it wrapped, its scrollWidth became the *width of the header*,
// which is by definition larger than the room beside the header's other
// children, and the test that decided wrapping was measuring its own output.
// It could not oscillate, as the old comment said. It latched, which is worse:
// one transient narrow moment — a drag of the window edge, a font arriving
// late — and the header stayed two rows tall for the rest of the session.
// Measured: at 900px it wraps and scrollWidth reads 868; widened to 2000px it
// reads 1952 and stays wrapped at 102px tall, where a fresh load at the same
// width renders one row at 60px. That is "the top bar keeps switching and
// permanently changing layout", exactly.
//
// The buttons are `flex: 0 0 auto`, so their widths are the same whichever row
// the strip is on. That is what makes this measurement independent of the
// state it is being used to decide.
function tabContentWidth() {
  const bar = $("tab-bar");
  if (!bar) return 0;
  const style = getComputedStyle(bar);
  const gap = parseFloat(style.columnGap || style.gap) || 0;
  const padding =
    (parseFloat(style.paddingLeft) || 0) + (parseFloat(style.paddingRight) || 0);
  let total = 0;
  let count = 0;
  for (const child of bar.children) {
    if (child.classList.contains("hidden")) continue;
    total += child.getBoundingClientRect().width;
    count += 1;
  }
  return total + padding + gap * Math.max(0, count - 1);
}

function syncTabOverflowFade() {
  const bar = $("tab-bar");
  if (!bar) return;
  // A tab you have to scroll to is a tab you will not find. When the strip
  // cannot fit beside the wordmark and the header buttons, it takes a row of
  // its own — where all seven fit with room to spare at any width the app is
  // usable at. Photographed on a 7-tab window: "Dashboard" clipped to "oard"
  // at the left edge, which no amount of edge-fading makes readable.
  const header = document.getElementById("top-bar");
  if (header) {
    const needed = tabContentWidth();
    const space = tabRowSpace();
    // Asymmetric thresholds, and only for jitter: both measurements are now
    // independent of which row the strip is on, so there is no feedback to
    // oscillate. What remains is sub-pixel rounding at the exact width where
    // the two are equal, and a header that flickers between one and two rows
    // while you drag the window edge is its own kind of broken. 8px is under
    // half a character and well over the rounding.
    const wrapped = header.classList.contains("tabs-wrapped");
    header.classList.toggle(
      "tabs-wrapped",
      wrapped ? needed > space - 8 : needed > space + 1
    );
  }
  // 1px of slack at each end: sub-pixel layout makes scrollWidth exceed
  // clientWidth by a fraction on plenty of widths where nothing is cut off,
  // and a scroll offset lands on .5 of a pixel as often as not.
  const hidden = bar.scrollWidth - bar.clientWidth;
  bar.classList.toggle("fade-start", hidden > 1 && bar.scrollLeft > 1);
  bar.classList.toggle("fade-end", hidden - bar.scrollLeft > 1);
}

// A tab you cannot fully see is a tab you cannot fully read. Selecting one
// brings it into view, so the fade is only ever over a tab you are not using.
function revealActiveTab() {
  const active = document.querySelector("#tab-bar button.active");
  if (active && active.scrollIntoView) {
    active.scrollIntoView({ block: "nearest", inline: "nearest" });
  }
  syncTabOverflowFade();
}

window.addEventListener("resize", syncTabOverflowFade, { passive: true });
$("tab-bar")?.addEventListener("scroll", syncTabOverflowFade, { passive: true });
// The pill's text arrives with the status polls, long after first paint, and
// changes width when it does — so remeasure whenever the header changes size
// rather than only on window resize.
if (typeof ResizeObserver !== "undefined") {
  // Measured on the next frame rather than inside the callback.
  //
  // Reported from the desktop shell's console: "ResizeObserver loop completed
  // with undelivered notifications." That warning is the browser saying an
  // observer callback changed the layout of something it observes, and this
  // one does exactly that — deciding `.tabs-wrapped` changes the header's
  // height and the strip's width, which is what it is watching. The loop
  // terminates (both measurements are independent of the class now, so the
  // second pass agrees with the first), but it costs a wasted layout every
  // resize and prints an error that looks like a fault.
  //
  // Deferring breaks the cycle: the write lands after the observation phase,
  // and the `queued` flag collapses a burst of resize notifications into one
  // measurement instead of one per element per frame.
  let queued = false;
  const headerObserver = new ResizeObserver(() => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => {
      queued = false;
      syncTabOverflowFade();
    });
  });
  const bar = $("tab-bar");
  if (bar) {
    headerObserver.observe(bar);
    if (bar.parentElement) headerObserver.observe(bar.parentElement);
  }
}
syncTabOverflowFade();

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
    // Both of these are counts of notes, so they belong on the list that
    // shows them — not on whichever Notes sub-tab happened to be open last.
    { icon: "📝", value: stats ? stats.total_entries : "–", label: "notes",
      go: () => { switchTab("notes"); showNotesSection("browse"); } },
    { icon: "🗓", value: thisWeek, label: "this week",
      go: () => { switchTab("notes"); showNotesSection("browse"); } },
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

// Anything targeting the Notes tab must name its sub-tab.
//
// The tab is split into capture / ask / browse and *remembers the last one
// used*, so "switchTab('notes') then focus" only works if you happened to
// leave it on the right section. "Search notes" was fixed after being
// reported; an audit of every button here — clicking each one from all three
// starting sections — found "New note" failing in exactly the same way from
// two of the three, with the capture box hidden and nothing focused. It is
// the most-used button on the dashboard.
// **Three groups, because there were three kinds of button pretending to be
// one.** Reported: *"can you just completely redo, improve on and expand that
// whole top section."*
//
// What was there was one grid of seven identical chips. "Graph" only changes
// which tab you are looking at; "New note" puts a cursor in an empty box;
// "⚡ Clean up my tags" sends a message to a model and waits for it. Those are
// three different commitments and they were drawn the same, in one row, sorted
// by a use counter that mixed them together — so the row said nothing about
// what pressing anything in it would do, and the only way to find out was to
// press it.
//
// Now: **Start** something (an action, and the row that owns the accent),
// **Jump to** somewhere (navigation, quiet pills — nothing happens that you
// cannot undo by pressing the tab you came from), and **Run a skill** (the
// expensive one, marked ⚡, and the only group that talks to the model).
//
// The use-ordering that was here stays, but it is applied *inside* Jump to
// only. That was the point of it — the middle of a navigation row is exactly
// where reordering helps and never surprises — and applying it across the
// whole strip is what let an action drift into the middle of the navigation.
const QUICK_START = [
  {
    icon: "✏️",
    label: "New note",
    hint: "Capture a thought — the AI files it",
    primary: true,
    run: () => {
      switchTab("notes");
      showNotesSection("capture"); // or the box you're about to focus is hidden
      $("entry-content").focus();
    },
  },
  {
    icon: "💬",
    label: "Ask AI",
    hint: "A question answered from your own notes",
    run: () => {
      switchTab("chat");
      $("chat-input").focus();
    },
  },
  { icon: "🎨", label: "Sketch", hint: "Draw something and save it as a note", run: () => openSketch() },
  {
    icon: "⏰",
    label: "Remind me",
    hint: "Type it in plain English and the AI schedules it",
    run: () => {
      switchTab("reminders");
      $("reminder-magic").focus();
    },
  },
  {
    icon: "🎙️",
    label: "Meeting notes",
    hint: "Record something longer and file the transcript",
    run: () => openMeetingRecorder(),
  },
];

const QUICK_GO = [
  {
    icon: "🔍",
    label: "Search notes",
    run: () => {
      switchTab("notes");
      // The search box lives in the "browse" sub-tab; focusing it while that
      // section is display:none silently does nothing (user-reported).
      showNotesSection("browse");
      $("note-search").focus();
    },
  },
  { icon: "📚", label: "Notes", run: () => { switchTab("notes"); showNotesSection("browse"); } },
  { icon: "💬", label: "Chat", run: () => switchTab("chat") },
  // The Library, the Timeline and Reminders were all reachable only from the
  // tab bar. A "quick access" strip that skips three of the app's seven tabs
  // is a strip that has stopped being an index of the app.
  { icon: "📖", label: "Library", run: () => switchTab("library") },
  { icon: "🕸", label: "Graph", run: () => switchTab("graph") },
  { icon: "🗓", label: "Timeline", run: () => switchTab("timeline") },
  { icon: "⏰", label: "Reminders", run: () => switchTab("reminders") },
  { icon: "🧰", label: "Tools & features", run: () => openFeatures() },
  // The palette is the fastest route to anything at all, and it was findable
  // only by already knowing Ctrl+K. A button is how you learn a shortcut.
  { icon: "⌘", label: "Commands", run: () => openPalette() },
];

// --- quick access that follows what you actually do (§36D) ------------------------
//
// These are the first thing on the first screen, and they were a fixed list
// chosen early. Someone who lives in the graph and someone who never opens it
// got the same row.
//
// The row is ordered by use now, with two fixed points: **New note stays
// first** and **Tools & features stays last**. That is deliberate — a row that
// reorders completely is a row you have to re-read every time, and the whole
// value of a fixed position is that your hand learns it. Only the middle
// moves, and only by how often you actually press it.
const QUICK_USE_KEY = "quickLinkUse";
//: How many recently-run skills get a button. Two, because they are competing
//: for the same row as the fixed actions and a skill you ran once last month
//: is not quick access to anything.
const QUICK_SKILL_SLOTS = 2;

function quickLinkUse() {
  try {
    return JSON.parse(localStorage.getItem(QUICK_USE_KEY) || "{}");
  } catch {
    return {};
  }
}

function noteQuickLinkUse(label) {
  const counts = quickLinkUse();
  counts[label] = (counts[label] || 0) + 1;
  localStorage.setItem(QUICK_USE_KEY, JSON.stringify(counts));
}

//: Skills that have actually been run, most recent first. Written by
//: `startSkill`, so it covers both the dropdown and a run the agent started
//: itself (§33) — if the model keeps reaching for a skill, that is evidence it
//: belongs on the dashboard too.
const RECENT_SKILLS_KEY = "recentSkills";

function noteSkillRun(name) {
  let recent = [];
  try {
    recent = JSON.parse(localStorage.getItem(RECENT_SKILLS_KEY) || "[]");
  } catch {
    recent = [];
  }
  recent = [name, ...recent.filter((n) => n !== name)].slice(0, 8);
  localStorage.setItem(RECENT_SKILLS_KEY, JSON.stringify(recent));
}

//: A skill's name usually starts with its own emoji — "🩺 Notebook health
//: check", "🏷 Clean up my tags" — and the quick-link then put ⚡ in front of
//: it, so those two chips wore two icons each while every other chip in the
//: row wore one. Reported as clutter, and it was: measured at 224px and 216px
//: against 107–169px for the fixed chips, i.e. the two least important buttons
//: in the row were the two widest.
//:
//: The ⚡ is the one that stays, because it carries what the row does not
//: otherwise say — this chip *runs* something rather than opening a page. The
//: skill's own emoji is still on it everywhere skills are listed.
const LEADING_EMOJI = /^(\p{Extended_Pictographic}(?:️|‍\p{Extended_Pictographic})*)\s*/u;

function withoutLeadingEmoji(name) {
  const stripped = name.replace(LEADING_EMOJI, "");
  // A skill named with nothing but an emoji would otherwise become a blank
  // chip; keeping the original is the lesser of the two.
  return stripped.trim() || name;
}

function recentSkillLinks() {
  let recent = [];
  try {
    recent = JSON.parse(localStorage.getItem(RECENT_SKILLS_KEY) || "[]");
  } catch {
    return [];
  }
  return recent.slice(0, QUICK_SKILL_SLOTS).map((name) => ({
    icon: "⚡️",
    label: withoutLeadingEmoji(name),
    // The full name, unaltered, is what the button remembers itself by: the
    // use counter and `runSkill` both key off it, and stripping the emoji from
    // either would silently start a second tally or fail to find the skill.
    skillName: name,
    skill: true,
    run: () => {
      const known = allSkills().find((s) => s.name === name);
      // A skill can be deleted between runs. Sending the user to the picker is
      // more use than a button that fails.
      if (known) runSkill(known);
      else switchTab("chat");
    },
  }));
}

// Navigation only — see the note on QUICK_START. Search stays first because it
// is the one entry in the row that is a *destination for anything*, and a
// fixed first position is what lets a hand learn it.
function orderedGoLinks() {
  const counts = quickLinkUse();
  const [first, ...rest] = QUICK_GO;
  // Stable sort: equal counts keep the order they were declared in, so an
  // untouched dashboard looks exactly as it always did.
  rest.sort((a, b) => (counts[b.label] || 0) - (counts[a.label] || 0));
  return [first, ...rest];
}

function quickLinkButton(link, className) {
  const button = document.createElement("button");
  button.className = className + (link.primary ? " quick-link-primary" : "");
  button.type = "button";
  // Every chip gets a title, not only the skills: the labels truncate, so
  // hovering has to be able to finish the sentence. A chip whose label fits
  // shows a tooltip repeating it, which is harmless; a chip whose label does
  // not fit and has no tooltip is a button you cannot read at all.
  button.title = link.skill
    ? `Run the skill “${link.skillName}” — it answers in the chat`
    : link.hint || link.label;
  const icon = document.createElement("span");
  icon.className = "quick-link-icon";
  icon.textContent = link.icon;
  icon.setAttribute("aria-hidden", "true");
  const text = document.createElement("span");
  text.className = "quick-link-text";
  const label = document.createElement("span");
  label.className = "quick-link-label";
  label.textContent = link.label;
  text.appendChild(label);
  // The hint is what turns a row of verbs into a row you can choose from
  // without pressing anything. Only the Start group carries one — the
  // navigation pills say where they go by being named after the tab, and a
  // sentence under each would be six sentences saying "goes to the tab".
  if (link.hint) {
    const hint = document.createElement("span");
    hint.className = "quick-link-hint";
    hint.textContent = link.hint;
    text.appendChild(hint);
  }
  button.append(icon, text);
  button.addEventListener("click", () => {
    noteQuickLinkUse(link.skillName || link.label);
    link.run();
  });
  return button;
}

function launchGroup(label, className) {
  const group = document.createElement("div");
  group.className = "launch-group";
  const heading = document.createElement("p");
  heading.className = "launch-label";
  heading.textContent = label;
  const row = document.createElement("div");
  row.className = className;
  group.append(heading, row);
  return { group, row };
}

function renderQuickLinks() {
  const box = $("dash-quicklinks");
  if (!box) return;
  box.replaceChildren();

  const start = launchGroup("Start something", "launch-row launch-row-start");
  for (const link of QUICK_START) {
    start.row.appendChild(quickLinkButton(link, "quick-link quick-action"));
  }
  box.appendChild(start.group);

  const go = launchGroup("Jump to", "launch-row launch-row-go");
  for (const link of orderedGoLinks()) {
    go.row.appendChild(quickLinkButton(link, "quick-link quick-pill"));
  }
  box.appendChild(go.group);

  // The skills group is only drawn when there is a skill to put in it. An
  // empty "Run a skill" heading over one "Choose a skill…" button is a section
  // that exists to advertise itself, and this strip is already the busiest
  // thing on the page.
  const skills = recentSkillLinks();
  const skillGroup = launchGroup("Run a skill", "launch-row launch-row-skills");
  for (const link of skills) {
    skillGroup.row.appendChild(quickLinkButton(link, "quick-link quick-pill quick-link-skill"));
  }
  if (skills.length) {
    skillGroup.row.appendChild(
      quickLinkButton(
        {
          icon: "⚡️",
          label: "All skills…",
          hint: "Every skill, in the chat's ⚡️ picker",
          run: () => switchTab("chat"),
        },
        "quick-link quick-pill quick-link-more"
      )
    );
    box.appendChild(skillGroup.group);
  }
}

// --- the "everything this app does" browser ----------------------------------
// Grouped, searchable, and every entry either jumps you there or explains
// itself — the fastest way to discover features you didn't know existed.
function featureCatalog() {
  return [
    { group: "Capture & notes", items: [
      { name: "Capture a thought", desc: "Save anything; the AI files it into a category and suggests tags.", run: () => { switchTab("notes"); showNotesSection("capture"); $("entry-content").focus(); } },
      { name: "Templates", desc: "Start a note from a prefilled shape (journal, recipe, meeting…).", run: () => { switchTab("notes"); showNotesSection("capture"); } },
      { name: "Improve writing", desc: "Proofread, rewrite, or condense a note with AI before saving.", run: () => { switchTab("notes"); showNotesSection("capture"); } },
      { name: "Sketch pad", desc: "Draw something and save it as a note with a caption.", run: () => openSketch() },
      { name: "Dictation", desc: "Speak a note; transcribed locally with Whisper.", run: () => { switchTab("notes"); showNotesSection("capture"); } },
      { name: "Attachments", desc: "Attach files and images to any note.", run: () => { switchTab("notes"); showNotesSection("browse"); } },
      { name: "Threads", desc: "Continue a thought to build a train of related notes.", run: () => { switchTab("notes"); showNotesSection("browse"); } },
      { name: "Pins & tags", desc: "Pin important notes and organise with tags.", run: () => { switchTab("notes"); showNotesSection("browse"); } },
      { name: "Recycle bin", desc: "Deleted notes are recoverable until the bin is cleared.", run: () => { switchTab("notes"); showNotesSection("browse"); } },
    ]},
    { group: "Ask & chat", items: [
      { name: "Ask your notebook", desc: "Questions answered strictly from your own notes.", run: () => { switchTab("notes"); showNotesSection("ask"); $("question").focus(); } },
      { name: "Chat", desc: "A full conversation with your notebook, saved and resumable.", run: () => { switchTab("chat"); $("chat-input").focus(); } },
      { name: "Personas", desc: "Change the assistant's voice — Librarian, Coach, Analyst, or your own.", run: () => openSettingsModal("personas") },
      { name: "Skills", desc: "One-click requests like “Summarise my week”; can act on your notes.", run: () => openSettingsModal("skills") },
      { name: "Agent mode", desc: "Let the assistant use its tools — search your notes, open a page, create, tag, link and organise.", run: () => switchTab("chat") },
      { name: "Web search", desc: "Optional, opt-in: the one feature that goes online.", run: () => switchTab("chat") },
      { name: "Export chat", desc: "Download a conversation as Markdown.", run: () => switchTab("chat") },
    ]},
    { group: "Map & discovery", items: [
      { name: "Graph view", desc: "Your notes as a network of links, threads and similarity.", run: () => switchTab("graph") },
      { name: "Edit on the map", desc: "Click any node to edit its content and tags in place.", run: () => switchTab("graph") },
      { name: "Physics controls", desc: "Gravity and Spread sliders reshape the layout.", run: () => switchTab("graph") },
      { name: "Suggested links", desc: "The AI proposes connections between related notes.", run: () => switchTab("graph") },
      { name: "On this day", desc: "Notes you captured on this date in past months resurface.", run: () => switchTab("dashboard") },
      { name: "Related notes", desc: "See notes that mean something similar to the one you're reading.", run: () => { switchTab("notes"); showNotesSection("browse"); } },
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

// The day-one dashboard. Deliberately a small number of real actions rather
// than a tour of everything: the widgets appear on their own as soon as there
// is something for them to hold, and that is a better demonstration than a
// description of them.
function gettingStartedCard() {
  const card = document.createElement("section");
  card.className = "card dash-widget dash-getting-started";

  const emblem = document.createElement("div");
  emblem.className = "emblem emblem-centred";
  emblem.setAttribute("aria-hidden", "true");

  const title = document.createElement("h2");
  title.textContent = "Your notebook is empty — here's the whole idea";

  const blurb = document.createElement("p");
  blurb.className = "muted";
  blurb.textContent =
    "Type a thought, and it gets filed for you. Later, ask a question in " +
    "plain English and get an answer plus the notes behind it. Everything " +
    "stays on this machine.";

  const steps = document.createElement("div");
  steps.className = "start-steps";
  const actions = [
    {
      icon: "✏️",
      label: "Write your first note",
      note: "Anything at all — a half sentence is fine.",
      run: () => {
        switchTab("notes");
        $("entry-content")?.focus();
      },
    },
    {
      icon: "💬",
      label: "Ask your notebook",
      note: "Works on keywords even with no AI running.",
      run: () => {
        switchTab("chat");
        $("chat-input")?.focus();
      },
    },
    {
      icon: "🎒",
      label: "Bring notes in",
      note: "Import from a file in Settings → Import & export.",
      run: () => openSettingsModal("data"),
    },
    {
      icon: "🧭",
      label: "Take the tour",
      note: "Two minutes through what's here.",
      run: () => openOnboarding(),
    },
  ];
  for (const action of actions) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "start-step";
    const icon = document.createElement("span");
    icon.className = "start-step-icon";
    icon.textContent = action.icon;
    icon.setAttribute("aria-hidden", "true");
    const text = document.createElement("span");
    const label = document.createElement("strong");
    label.textContent = action.label;
    const note = document.createElement("span");
    note.className = "muted";
    note.textContent = action.note;
    text.append(label, note);
    button.append(icon, text);
    button.addEventListener("click", action.run);
    steps.appendChild(button);
  }

  const footer = document.createElement("p");
  footer.className = "muted start-footer";
  footer.textContent =
    "Your dashboard fills itself in as you go — streaks, tags, a map of your " +
    "notes and a dozen other panels appear once there's something to put in them.";

  card.append(emblem, title, blurb, steps, footer);
  return { card, mount: () => renderEmblem(emblem, 56) };
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

  // A brand-new notebook filled this grid with a dozen cards each politely
  // saying it had nothing to show. Every message was fine on its own; together
  // they made a working app look broken on the day someone starts using it.
  // One card that says what to do instead — and only until there's anything
  // to show, which is the first note.
  // `entriesEverLoaded` and not just the length: before the first GET /entries
  // comes back these are indistinguishable, and guessing "empty" paints the
  // brand-new-notebook card over a notebook full of notes.
  if (entriesEverLoaded && !allEntries.length && !dashEditMode) {
    // The emblem draws into a canvas, which p5 can only size once the element
    // is actually in the document — rendering it while the card is still
    // detached leaves a blank gap where the mark should be.
    const { card, mount } = gettingStartedCard();
    grid.appendChild(card);
    mount();
    return;
  }

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
      // There used to be two width buttons here, side by side: this one and
      // the "▭ Wide" below, writing to `wide` and the legacy `sizes` map
      // respectively. dashLayout() only falls back to `sizes` when `wide` is
      // empty, so the legacy button appeared to work exactly once and then
      // silently stopped — and until then the row showed two controls doing
      // the same job. One control, one place it's stored.
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
      if (!hidden) controls.appendChild(
        smallButton(
          isWide ? "▤ Narrow" : "▭ Wide",
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
// Bumped on every startArt call. A run that finds it has changed while it was
// waiting knows it was superseded and must not mount its canvas — see the
// comment in startArt for the stacking bug this fixes (§35G).
let artRun = 0;
// Where the constellation is drawn, kept so a theme change can rebuild it.
//
// The sketch reads light-or-dark ONCE, when it is built, and paints its wash
// from that. Nothing rebuilt it when the mode changed, so toggling to dark left
// the one panel on the dashboard still wearing the light background until you
// pressed Regenerate — reported, and listed in IDEAS.md.
let artHolder = null;

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

// Rebuild the constellation for the mode now in force. Safe to call whenever
// the theme changes: it does nothing unless the widget is actually on screen,
// and it keeps `artNonce` so the sky stays the same arrangement — this is a
// recolour, not a reshuffle, and re-rolling someone's picture because they
// turned on dark mode would be its own bug.
function refreshArtForTheme() {
  if (!artHolder || !artHolder.isConnected) {
    artHolder = null;
    return;
  }
  startArt(artHolder);
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
  // Which run this is. `startArt` awaits /insights/stats before it mounts
  // anything, and `stopArt()` above that await can only remove an instance
  // that already exists — so two overlapping calls each found `artInstance`
  // null, each waited, and each mounted a canvas into the same holder. That
  // is the four-or-five stacked constellations that were screenshotted
  // (§35G), and the same bug is why Regenerate read as "broken and severely
  // glitchy": every click added a canvas and `artInstance` only ever tracked
  // the last one, so nothing could tear the others down.
  const run = ++artRun;
  stopArt();
  artHolder = holder;
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
  // data-mode is always resolved to light or dark, including under "System",
  // so this no longer has to re-derive it from two sources.
  const dark = resolvedTheme() === "dark";
  // The wash used a hardcoded indigo hue, so on any palette that isn't
  // indigo — Sage, Ocean, Ember — the one generative panel on the dashboard
  // was the only thing on screen still wearing the old theme's colour.
  const accentHex = currentAccentHex();

  const sketch = (p) => {
    let particles = [];
    let width = 0;
    const height = 220;

    const scene = (t) => {
      // A soft vertical wash instead of a flat fill — more depth (Wave N).
      p.noStroke();
      const washHue = p.hue(p.color(accentHex));
      for (let y = 0; y < height; y += 4) {
        const shade = dark ? 14 + (y / height) * 10 : 250 - (y / height) * 10;
        p.fill(washHue, 30, shade, 1);
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

  // Superseded while we waited, or the widget was re-rendered out from under
  // us. Either way this run must not mount: it would be the second canvas.
  if (run !== artRun || !holder.isConnected) return;
  // Belt and braces. `stopArt` handles the instance we know about; clearing
  // the holder removes any canvas a previous version of this bug left behind,
  // so an already-stacked dashboard heals on the next render rather than
  // needing a reload.
  stopArt();
  holder.replaceChildren();
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
// One line of a note, as plain text, for the dashboard's little lists.
//
// Markers are stripped rather than rendered, unlike the note list — these are
// clipped to about 70 characters and a clip that lands mid-`<strong>` is worse
// than no emphasis at all. Same reasoning that already applied to `[[links]]`,
// which this has always flattened.
function notePreviewText(content) {
  return (content || "")
    .replace(/\[\[([^[\]]{1,120})\]\]/g, "$1")
    .replace(new RegExp(INLINE_MD.source, "g"), (...m) => m[1] ?? m[2] ?? m[3] ?? m[4]);
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
    body.classList.add("muted");
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
    body.classList.add("muted");
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
    body.classList.add("muted");
    return;
  }
  if (!data.total) {
    body.textContent = "Save some notes and your activity shows up here.";
    body.classList.add("muted");
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
    body.classList.add("muted");
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
    body.classList.add("muted"); // not `className +=`, which stacks on re-render
    return;
  }

  // "Another" has to actually show another one.
  //
  // Reported as broken, and it was: the pick was uniform over every note
  // WITH REPLACEMENT, so it could hand back the note already on screen and
  // the click did nothing. That is not rare — it is 1 in N, so a tenth of
  // clicks on a ten-note notebook, half of them on two notes, and every
  // single one when there is only one note to show. Excluding the current
  // note makes the button keep its promise.
  let current = null;

  const paint = () => {
    body.replaceChildren();
    const pool = entries.filter((e) => e.id !== (current && current.id));
    const note = (pool.length ? pool : entries)[
      Math.floor(Math.random() * (pool.length || entries.length))
    ];
    current = note;
    // Rendered as markdown, like every other place a note's text is shown.
    // It was `textContent`, so a note written with a heading, a list or any
    // emphasis surfaced here as its raw source — `## Schedule` and `**bold**`
    // spelled out — which makes the one widget whose whole job is to make an
    // old note appealing show it at its least readable.
    //
    // A <div>, not a <p>: renderMarkdown appends block elements, and a <p>
    // containing a <ul> is invalid markup that browsers fix by closing the
    // paragraph early, which drops the styling this class carries.
    const text = document.createElement("div");
    text.className = "random-note";
    renderMarkdown(
      text,
      note.content.length > 240 ? note.content.slice(0, 239) + "…" : note.content
    );
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
    const another = smallButton("🎲 Another", "Show a different note", paint);
    if (entries.length < 2) {
      // There is no other note to show. A live-looking button that cannot do
      // anything is the exact shape of "this control is broken" — say why
      // instead.
      another.disabled = true;
      another.title = "This is your only note so far — write another and it'll shuffle.";
    }
    row.appendChild(another);
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
    body.classList.add("muted");
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
      notify("MemoryMap", "Focus session complete — nice work!");
    }
  }
}

function startFocusTimer() {
  if (focusTimer.running) return;
  if (focusTimer.remaining <= 0) focusTimer.remaining = focusTimer.total;
  focusTimer.running = true;
  askNotificationPermission();
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

// (The session-scoped `notifiedReminderIds` set went with the dead poller
// above. §36C keeps announced ids in localStorage instead, so a reload does
// not re-announce everything already overdue — which a Set could not survive.)

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
  // The status bar's reminder slot is fed from here rather than from its own
  // fetch: this function is the one place both callers of /reminders land, so
  // the bar and the tab badge cannot disagree and no second timer exists to
  // drift from the first.
  reminderCounts = {
    open: (reminders || []).filter((r) => !r.done).length,
    due,
  };
  renderStatusBar();

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
  if (!(await confirmDialog(`Delete ${done.length} completed reminder${done.length === 1 ? "" : "s"}?`))) {
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

// --- the due time, split across two fields ------------------------------------
// #reminder-due stays the single source of truth (every caller already writes
// it), and these two keep the visible date/time inputs in step with it. Going
// through one setter is what stops the hidden value and the fields drifting
// apart, which would show one time and save another.

function setDue(localValue) {
  $("reminder-due").value = localValue || "";
  syncPartsFromDue();
  updateDueReadout();
}

function syncPartsFromDue() {
  const raw = $("reminder-due").value;
  const [date, time] = raw.split("T");
  $("reminder-date").value = date || "";
  // datetime-local may carry seconds; the time field wants HH:MM.
  $("reminder-time").value = (time || "").slice(0, 5);
}

function syncDueFromParts() {
  const date = $("reminder-date").value;
  const time = $("reminder-time").value || "09:00";
  // A date with no time is still a usable intention; a time with no date
  // isn't, so that combination is left alone until a date is picked.
  $("reminder-due").value = date ? `${date}T${time}` : "";
  updateDueReadout();
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
  setDue(toLocalInputValue(base.toISOString()));
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
    setDue(defaultDueValue());
  } else {
    syncPartsFromDue();
    updateDueReadout();
  }
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
  // Asked here, when a reminder actually lands, and not on first load — a
  // permission prompt with no context is refused by default, and a refusal is
  // close to permanent (§36C).
  askNotificationPermission();
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
    askNotificationPermission();
    loadReminders();
  } catch (error) {
    status.classList.add("error");
    status.textContent = error.message;
  }
}

// The Wave O reminder poller used to live here. **It was dead code with a
// live timer**, and that combination is worse than either half.
//
// §36C rewrote `checkDueReminders` further down this file — badge, title
// count, one-notification-per-reminder, announced ids in localStorage — and a
// second `async function checkDueReminders` at the same scope simply replaces
// the first. What did not get deleted was the `setInterval(...)` that sat
// beside the old one, and since the name resolves to the surviving
// definition, that stray timer was running the *new* poller on a second
// 30-second interval. Two effects, both real:
//
// - twice the requests, for nothing;
// - and a race on the announcement: both polls read `announcedReminders()`
//   before either calls `rememberAnnounced`, so a reminder coming due could
//   be announced twice — which is precisely the "notifications are noisy"
//   shape of report this rewrite existed to fix.
//
// Found by opening the app in a real browser and reading the network log,
// which also showed the other half: the surviving poller runs before the
// unlock and 401s once per load. Its predecessor guarded on `authToken()`;
// that guard moved with the deletion (see `checkDueReminders` below).

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
  const lines = unlatex(text).replace(/\r\n/g, "\n").split("\n");
  let i = 0;
  let list = null; // the <ul>/<ol> currently being filled, or null

  const closeList = () => {
    if (list) container.appendChild(list);
    list = null;
  };

  while (i < lines.length) {
    const line = lines[i];

    // Fenced code block. Gets a header strip with the language (when the
    // fence names one) and a copy button: selecting a code block by hand is
    // the one thing every other chat interface saves you from, and getting
    // it slightly wrong — a stray line, a missing last character — is the
    // kind of mistake you only notice after pasting it somewhere.
    if (line.trim().startsWith("```")) {
      closeList();
      const language = line.trim().slice(3).trim().split(/\s+/)[0] || "";
      const code = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith("```")) {
        code.push(lines[i]);
        i++;
      }
      i++; // skip the closing fence
      const text = code.join("\n");

      const block = document.createElement("div");
      block.className = "code-block";
      const bar = document.createElement("div");
      bar.className = "code-bar";
      const label = document.createElement("span");
      label.className = "code-lang";
      label.textContent = language || "code";
      const copy = document.createElement("button");
      copy.type = "button";
      copy.className = "ghost small code-copy";
      copy.textContent = "⧉ Copy";
      copy.title = "Copy this code block";
      copy.addEventListener("click", (event) =>
        copyToClipboard(text, event.currentTarget)
      );
      bar.append(label, copy);

      const pre = document.createElement("pre");
      const codeEl = document.createElement("code");
      if (language) codeEl.dataset.lang = language;
      codeEl.textContent = text;
      pre.appendChild(codeEl);
      block.append(bar, pre);
      container.appendChild(block);
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
        // Start where the author started. Without this a list written as
        // "3. 4. 5." renders as 1, 2, 3 — and, more importantly, a list that
        // resumes after a paragraph restarts from 1.
        if (wantOrdered) {
          const first = Number.parseInt(line.trim(), 10);
          if (Number.isFinite(first) && first !== 1) list.start = first;
        }
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
      // A blank line only ends a list if what follows isn't another item of
      // the same kind. Models write "1.\n\n2.\n\n3." far more often than
      // they write it tightly, and closing the <ol> on each gap restarted the
      // numbering at 1 every single time (user-reported).
      let next = i + 1;
      while (next < lines.length && lines[next].trim() === "") next++;
      const continues =
        list &&
        next < lines.length &&
        (list.tagName === "OL"
          ? /^\s*\d+\.\s+/.test(lines[next])
          : /^\s*[-*+]\s+/.test(lines[next]));
      if (!continues) closeList();
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
// The traced path is drawn in its own layer, above the edges and the nodes: a
// step can be a shared tag, which the map draws no edge for, so highlighting
// the existing lines would show a chain with holes in it (§9).
let graphTraceLayer = null;

// How much of a linked note's text a link chip shows. Long enough to know
// which note it is, short enough that four of them are a row rather than a
// paragraph — a chip is a signpost, and a signpost with a sentence on it is
// not a signpost. The full text is the chip's tooltip.
const LINK_CHIP_CHARS = 28;

// How much of a note the list shows before clamping it. Roughly ten lines at
// a comfortable reading width — long enough that a normal note is never
// clipped, short enough that one essay can't take the whole screen.
const LONG_NOTE_CHARS = 500;
const LONG_NOTE_LINES = 10;
// Which notes the user has opened out, for this session. Not persisted: it is
// a reading position, not a preference.
const expandedNotes = new Set();

// The character count decides which notes *might* be too tall; only a
// measurement can say whether one actually is, because that depends on the
// width it is rendered at. So the clamp goes on optimistically and this takes
// it back off wherever the note fits after all — a "Show more" on a note that
// is fully visible is worse than no clamping at all.
//
// It bails when the list is off screen: this renders inside a `display: none`
// sub-tab, where every measurement is 0. `showNotesSection` calls it again on
// the way in, which is the moment the numbers become real.
function settleNoteClamps() {
  const list = $("entry-list");
  if (!list || !list.offsetParent) return;
  for (const content of list.querySelectorAll(".entry-content.entry-clamped")) {
    const toggle = content.parentElement?.querySelector(".entry-more");
    if (content.scrollHeight <= content.clientHeight + 4) {
      content.classList.remove("entry-clamped");
      toggle?.remove();
    }
  }
}

function graphNodeRadius(node) {
  // A category heading in a tree layout is a fixed size — it has no access
  // count of its own, and sizing it by one would be inventing a number.
  if (node.isGroup) return node.id === "root" ? 14 : 11;
  
  // Sized dynamically based on PageRank centrality (hub importance) and usage.
  // This physically represents the most important notes in the Knowledge Graph.
  const centralityBonus = node.centrality ? Math.min(12, node.centrality * 800) : 0;
  const accessBonus = Math.min(6, Math.sqrt(node.access_count || 0) * 1.5);
  
  return 9 + Math.max(centralityBonus, accessBonus);
}

// --- graph layouts (§9) -----------------------------------------------------------
//
// Asked for directly: "can you add different types of graph views… like tree
// graph diagrams and the like". A layout decides *where* a note goes; the
// styling is a separate question. Force is the default because it shows the
// links; the trees are here because most notebooks have far more filing than
// links, and a force graph of mostly-unlinked notes is a cloud of dots.
//
// The hierarchy is real data, not an invention: notebook → category → note,
// with a note's replies (`parent_id`, the train-of-thought threads) nested
// under the note they answer, so a thread reads as one branch.

function graphLayout() {
  const saved = localStorage.getItem("graph-layout");
  return ["force", "tree", "radial", "arc"].includes(saved) ? saved : "force";
}

// Gravity and Spread scale the force simulation, and the tree layouts do not
// run one — their positions come from the hierarchy. Left enabled they are two
// controls that move, save, and change nothing, which reads as a broken app
// rather than an inapplicable setting. Disabled, with the reason on hover.
function setGraphPhysicsEnabled(layoutKind) {
  const applies = layoutKind === "force";
  const box = $("graph-physics");
  if (!box) return;
  const why = applies
    ? ""
    : "Only applies to the Force (web) layout — the other layouts' positions come from the filing hierarchy, not physics.";
  box.classList.toggle("is-disabled", !applies);
  for (const id of ["graph-gravity", "graph-spread"]) {
    const slider = $(id);
    if (!slider) continue;
    slider.disabled = !applies;
    // Restore the slider's own description when it applies again, rather than
    // leaving the explanation of why it did not.
    if (applies) {
      slider.title =
        id === "graph-gravity"
          ? "How strongly notes pull together"
          : "How far apart linked notes sit";
    } else {
      slider.title = why;
    }
  }
  // The labels are separate elements, so they need the attribute too or the
  // hover explanation is missing on exactly the words being greyed out.
  for (const label of box.querySelectorAll("label")) {
    label.title = why;
  }
}

// A category level in a tree layout. It is a real node in the drawing so the
// join, the colours and the labels all work unchanged — but it is not a note,
// so anything that would open or edit one has to check.
function graphGroupNode(category) {
  return {
    id: `group:${category}`,
    isGroup: true,
    preview: category,
    category,
    access_count: 0,
    pinned: false,
  };
}

// Row height and column width for the tree. Fixed sizes, not a bounding box:
// `d3.tree().size([...])` squeezes every leaf into the panel's height, so a
// notebook with 29 notes got 18 pixels a row and the labels printed on top of
// each other (reported with a photo). `nodeSize` gives each note the room a
// label needs and lets the tree be as tall as it is — the panel pans and
// zooms, which is what those controls are for.
const TREE_ROW = 34;
const TREE_COL = 235;

// The radial is the opposite problem: it is a shape you read whole, so it has
// to fit the panel, and a fixed radius meant a 29-note notebook was drawn at
// 0.55× — every label technically present and none of them readable. Size the
// rings from the panel instead, and only grow past it when the notes need the
// circumference (below ~RADIAL_ARC pixels of arc each, labels collide).
const RADIAL_ARC = 22; // arc length a note needs on its ring
const RADIAL_LABEL = 118; // room the labels take outside the outermost ring
// A category name is written along its spoke, pointing out, so its ring has
// to clear the notes' ring by more than that name is long.
const RADIAL_GAP = 82;
// A reply hangs one shorter step outside the note it answers — and since a
// lone reply inherits its parent's angle exactly, the parent's label is
// written straight down the same spoke. That is why an intermediate note is
// labelled shorter than a leaf (RADIAL_STEM below): the step has to clear it.
const REPLY_RING = 78;
const RADIAL_STEM = 10; // characters, for a label written down a shared spoke

// The arc layout (§9's third hierarchy view, beside tree and radial): every
// node — category, note and reply alike — sits on one baseline, in the same
// left-to-right order a depth-first walk of the filing hierarchy would print
// them in (so a category's notes stay contiguous), and a parent-child edge is
// a shallow arc under the line instead of a tree's elbow or a radial's ring.
// It reads at a glance what tree/radial cannot: how many branches a
// notebook's filing has and how deep any one of them runs, in the width of a
// single row rather than the height of a tree or the footprint of a circle.
const ARC_STEP = 46; // horizontal spacing per node
const ARC_LABEL_LIMIT = 20; // characters — diagonal labels have less room before they cross the next node's arc

// Labels on the left half of the circle would read upside down, so they are
// turned around — which swaps which way "outward" is for everything after.
function radialFlip(node) {
  const degrees = ((node.angle || 0) * 180) / Math.PI - 90;
  return degrees > 90 || degrees < -90;
}

// Where each ring goes. Every constraint here is a thing that was measured
// going wrong: categories too tight to name, notes too tight to label, the
// whole circle too big for the panel — or, just as bad, needlessly small in
// a panel with room to spare.
function radialRings(leafCount, groupCount, rings, width, height) {
  // The floor matters as much as the arc: a dozen categories all radiating
  // from a 58px ring read as one blob at the centre, whatever the maths said
  // about them technically not touching. It grows with the count, because
  // four categories on that same ring only look sparse.
  const inner = Math.max((groupCount * RADIAL_ARC) / (2 * Math.PI), 40 + groupCount * 3);
  const room = Math.max(Math.min(width, height) / 2 - 12, 130) - RADIAL_LABEL;
  const extra = rings > 2 ? REPLY_RING : 0;
  const notes = Math.max(
    (leafCount * RADIAL_ARC) / (2 * Math.PI),
    inner + RADIAL_GAP,
    // Fill the panel when it is bigger than the minimum — a readable circle
    // is a big one. `frameTree` zooms out when the minimum wins instead.
    Math.min(room - extra, 320)
  );
  return { inner, notes, outer: notes + extra };
}

function layoutHierarchy(nodes, kind, width, height) {
  // Build parent → children from the notes themselves.
  const byId = new Map(nodes.map((node) => [node.id, node]));
  const groups = new Map();
  for (const node of nodes) {
    if (!groups.has(node.category)) groups.set(node.category, graphGroupNode(node.category));
  }
  const root = { id: "root", isGroup: true, preview: "Notebook", category: "", access_count: 0 };
  const children = new Map([[root.id, [...groups.values()]]]);
  for (const group of groups.values()) children.set(group.id, []);
  for (const node of nodes) {
    // A reply hangs off the note it answers, wherever that note is filed —
    // splitting a thread across categories would lose the thing it is.
    const parent =
      node.parent_id != null && byId.has(node.parent_id)
        ? byId.get(node.parent_id)
        : groups.get(node.category);
    if (!children.has(node.id)) children.set(node.id, []);
    children.get(parent.id).push(node);
  }

  const laid = d3.hierarchy(root, (d) => children.get(d.id) || []);
  const radial = kind === "radial";
  const arc = kind === "arc";
  if (arc) {
    // Pre-order: a category is visited before any of its notes, and each
    // note before its own replies — so walking the hierarchy in this order
    // and handing out one baseline slot per stop keeps every branch
    // contiguous, the same property `separation` gives the tree and radial
    // layouts a different way.
    let slot = 0;
    laid.eachBefore((point) => {
      point.x = slot * ARC_STEP;
      point.y = 0;
      slot += 1;
    });
  } else if (radial) {
    // `d3.tree`, not `d3.cluster`: cluster rings a node by its *height*, so a
    // category that happened to contain a thread was drawn one ring closer in
    // than its siblings and the circle came out ragged. Here a ring means a
    // depth — notebook, category, note, reply — which is what the view says
    // it means.
    d3
      .tree()
      .size([2 * Math.PI, 1])
      // Notes under different categories need more air than siblings, and the
      // gap has to shrink as the circle grows — the standard radial rule.
      // Categories get a wedge of their own on top of that, or the ones with
      // a single note in them end up sharing a slot with their neighbour.
      .separation((a, b) =>
        a.depth === 1 ? 2 : (a.parent === b.parent ? 1 : 2) / a.depth
      )(laid);
    const rings = radialRings(
      // Those wedges are real circumference, so count them: sizing the ring
      // off the notes alone would under-measure it by a third.
      (laid.leaves().length || 1) + groups.size,
      groups.size,
      laid.height || 1,
      width,
      height
    );
    const deep = Math.max((laid.height || 1) - 2, 1);
    laid.each((point) => {
      if (!point.depth) point.y = 0;
      else if (point.depth === 1) point.y = rings.inner;
      else {
        point.y = rings.notes + ((point.depth - 2) / deep) * (rings.outer - rings.notes);
      }
    });
  } else {
    d3.tree().nodeSize([TREE_ROW, TREE_COL])(laid);
  }

  const placed = [];
  const links = [];
  laid.each((point) => {
    const node = point.data;
    if (radial) {
      // d3's radial convention: x is the angle, y the distance out.
      node.angle = point.x;
      node.radius = point.y;
      node.x = point.y * Math.cos(point.x - Math.PI / 2);
      node.y = point.y * Math.sin(point.x - Math.PI / 2);
    } else if (arc) {
      // Already the real coordinates — assigned above, once, in traversal
      // order, and never touched again.
      node.x = point.x;
      node.y = point.y;
    } else {
      node.x = point.y; // depth runs left → right
      node.y = point.x;
    }
    node.fx = node.x;
    node.fy = node.y;
    node.depth = point.depth;
    node.isLeaf = !point.children;
    // A lone child inherits its parent's row (or, on the radial, its angle),
    // so the parent's label is written straight down the line joining them.
    // Only *that* parent has to keep its label short.
    node.shared = Boolean(point.children?.some((child) => child.x === point.x));
    placed.push(node);
    if (point.parent) {
      links.push({
        source: point.parent.data,
        target: node,
        kind: node.parent_id != null ? "thread" : "filing",
      });
    }
  });
  return { nodes: placed, links, radial, arc };
}

// A tree drawn with straight diagonals reads as a fan of loose string. Elbows
// (horizontal out, vertical across, horizontal in) are what makes it look
// like a tree diagram — and on the radial one, arcs that follow the rings.
function hierarchyPath(link, radial) {
  const { source: a, target: b } = link;
  if (radial) {
    return d3
      .linkRadial()
      .angle((d) => d.angle)
      .radius((d) => d.radius)({ source: a, target: b });
  }
  const mid = (a.x + b.x) / 2;
  return `M${a.x},${a.y}C${mid},${a.y} ${mid},${b.y} ${b.x},${b.y}`;
}

// The arc layout's own edge shape: every node sits on the same baseline (see
// `layoutHierarchy`'s `arc` branch), so a parent-child edge is a flattened
// half-ellipse dipping below the line rather than a tree's elbow or a
// radial's ring-following curve. A pre-order walk always visits a parent
// before its children, so `a.x < b.x` here always — the arc only ever needs
// to sweep one way.
function arcPath(link) {
  const { source: a, target: b } = link;
  const rx = Math.max((b.x - a.x) / 2, 1);
  const ry = rx * 0.6; // flatter than a true semicircle — a full one over a
  // long span dominates the map more than the connection it is drawing.
  return `M${a.x},${a.y}A${rx},${ry} 0 0,1 ${b.x},${b.y}`;
}

// A tall tree does not want to be squeezed into the panel: zoomed to fit, 29
// rows of text become illegible. Fit the *width*, never magnify past 1:1, and
// start at the top — the panel pans, and a readable tree you scroll beats a
// complete one you can't read.
function frameTree(svg, zoomBehavior, canvas, nodes, width, height, radial) {
  // Labels stick out past the node they belong to: to the right in a tree, in
  // every direction on a radial, and by however much the longest one happens
  // to be. Guessing that with a padding constant left label tips off the edge
  // of the panel; the drawing is already in the DOM, so ask it. `getBBox` is
  // in the canvas's own coordinates — the zoom transform is not applied yet —
  // and covers the rotated labels' real corners.
  const drawn = canvas.node().getBBox();
  const xs = nodes.map((n) => n.x);
  const ys = nodes.map((n) => n.y);
  // A hidden panel measures zero, so fall back to the node positions.
  const box = drawn.width
    ? drawn
    : {
        x: Math.min(...xs) - 40,
        y: Math.min(...ys) - 30,
        width: Math.max(...xs) - Math.min(...xs) + 200,
        height: Math.max(...ys) - Math.min(...ys) + 60,
      };
  const minX = box.x - 10;
  const maxX = box.x + box.width + 10;
  const minY = box.y - 10;
  const maxY = box.y + box.height + 10;
  const spanX = Math.max(maxX - minX, 1);
  const spanY = Math.max(maxY - minY, 1);
  // A radial is a shape you read whole, so both dimensions have to fit. A
  // tree grows downwards without limit, so squeezing it into the panel is
  // exactly what made 29 rows unreadable — but a notebook that *nearly* fits
  // is worth a small zoom-out to see whole, and only falls back to panning
  // when the price of fitting would be text you can't read.
  const both = Math.min((width - 20) / spanX, (height - 20) / spanY);
  const fit = radial || both >= 0.8 ? both : (width - 20) / spanX;
  const scale = Math.max(0.35, Math.min(1, fit));
  // Same rule on both axes: centre what fits, otherwise anchor to the start
  // so the root is the part you can see.
  const tx =
    spanX * scale <= width - 20
      ? width / 2 - scale * (minX + maxX) / 2
      : 10 - scale * minX;
  // Centre vertically only when the whole thing already fits; otherwise start
  // at the top, because a tree is read from its root down.
  const ty =
    spanY * scale <= height - 20
      ? height / 2 - scale * (minY + maxY) / 2
      : 10 - scale * minY;
  svg
    .transition()
    .duration(400)
    .call(zoomBehavior.transform, d3.zoomIdentity.translate(tx, ty).scale(scale));
}

// --- tracing a path between two notes (§9) -----------------------------------
//
// The question a graph answers better than any list — *how are these two
// related?* — and the one this view could not answer at all. Everything above
// shows you **that** notes connect; this shows you the route, and names each
// step: a link somebody made, a reply, or a tag the two share.
//
// The search itself is on the server (`entry/paths.py`, `GET /graph/path`) and
// is shared with the AI's `path_between` tool, deliberately: a picture and an
// answer that disagree about what is connected is worse than either alone.

//: The traced path, or null. `{ ids: [...], steps: [...] }` — ids in order, so
//: the drawing can look up consecutive pairs without re-deriving them.
let graphTrace = null;
//: The overlay lines, kept so the force simulation's tick can move them with
//: the nodes they join.
let graphTraceLines = null;

// The two pickers, filled from whatever the map is currently showing. Rebuilt
// on every render because the map's contents change — and the selection is
// carried across, since a rebuild that silently forgets which notes you were
// asking about is a control that undoes your work.
let traceModeActive = false;
let traceFromNode = null;
let traceToNode = null;

// The graph was redrawn, so the two picked nodes are stale objects from the
// previous layout. Re-point them at the new ones by id — dropping them instead
// would mean a filter change silently threw away the trace you were reading.
function fillTracePickers(nodes) {
  const byId = new Map(nodes.map((n) => [String(n.id), n]));
  if (traceFromNode) traceFromNode = byId.get(String(traceFromNode.id)) || null;
  if (traceToNode) traceToNode = byId.get(String(traceToNode.id)) || null;
  renderTraceState();
}

function setTracePanelOpen(open) {
  traceModeActive = open;
  if (!open) clearTrace({ quiet: true });
  $("graph-trace").classList.toggle("hidden", !open);
  $("graph-trace-toggle")?.setAttribute("aria-expanded", String(open));
  $("graph-trace-toggle")?.classList.toggle("is-on", open);
  // A mode has to look like one. Without this the map behaves differently
  // from a moment ago with nothing on screen saying so, which is the
  // difference between a tool and a glitch: the cursor becomes a crosshair
  // over the nodes and the graph card picks up a tinted edge.
  $("graph-card")?.classList.toggle("is-tracing", open);
  localStorage.setItem("graph-trace-open", open ? "1" : "0");
  if (open) {
    renderTraceState();
    showTraceMessage("Click a note to start.");
  }
}

// Escape leaves the mode. A mode you can only leave by finding the button
// that started it is a trap, and this one changes what clicking does.
document.addEventListener("keydown", (event) => {
  if (event.key !== "Escape" || !traceModeActive) return;
  // Any *visible* overlay, not merely a present one — and `querySelectorAll`,
  // not `querySelector`. Nine `.modal-overlay` elements sit in the markup
  // permanently with `.hidden` on them, so asking for the first one matched a
  // hidden element every time and Escape appeared to do nothing; asking
  // whether *the first* is visible would then miss a dialog further down the
  // document. Escape belongs to whatever is on top of the trace panel.
  const overlays = [...document.querySelectorAll(".modal-overlay, .confirm-overlay")];
  if (overlays.some((el) => !el.classList.contains("hidden"))) return;
  setTracePanelOpen(false);
});

// --- Trace, redesigned (§41) ------------------------------------------------------
//
// Reported as "annoying and pretty much unusable", and it was, for one reason
// that made everything else about it worse: **the map did not respond.**
// `traceModeActive` was set and consulted nowhere, so picking the two ends
// meant using two `<select>` elements that listed every note in the notebook
// by its opening words. On any real notebook that is a scroll through hundreds
// of near-identical lines, to choose two notes that are visible on screen.
//
// It is a two-click mode now: turn Trace on, click a note, click another. The
// panel stops being a form and becomes a readout of where you are — which end
// you are choosing, what is chosen, and a way to swap or undo it. Escape
// leaves. The rules that make a mode bearable rather than a trap:
//
// - it always says what the next click will do (`renderTraceState`);
// - one click back — Undo removes the last end rather than resetting both;
// - Swap, because "actually, the other direction" is the commonest correction
//   and re-picking both to get it is the thing that made this infuriating;
// - clicking the same note twice is a no-op with a reason, not a silent
//   failure or a path from a note to itself.

function pickTraceEnd(node) {
  if (!node) return;
  if (traceFromNode && String(traceFromNode.id) === String(node.id)) {
    showTraceMessage("That's already the start — pick a different note to end at.");
    return;
  }
  if (!traceFromNode || traceToNode) {
    // Starting over: a third click begins a new trace rather than doing
    // nothing, which is what someone who has read the answer wants next.
    traceFromNode = node;
    traceToNode = null;
    graphTrace = null;
    drawTrace();
    applyGraphHighlight();
  } else {
    traceToNode = node;
  }
  renderTraceState();
  if (traceFromNode && traceToNode) runTrace();
}

function traceLabel(node) {
  const text = (node?.preview || "").trim();
  return text.length > 32 ? `${text.slice(0, 31)}…` : text || `note #${node?.id}`;
}

// The panel as a readout: what is chosen, what the next click does, and the
// two corrections worth having.
function renderTraceState() {
  const holder = $("graph-trace-ends");
  if (!holder) return;
  holder.replaceChildren();

  const chip = (node, role) => {
    const span = document.createElement("span");
    span.className = "trace-chip" + (node ? " is-set" : " is-empty");
    span.textContent = node ? traceLabel(node) : role;
    if (node) span.title = node.preview || "";
    return span;
  };

  const arrow = document.createElement("span");
  arrow.className = "graph-trace-arrow";
  arrow.textContent = "→";
  arrow.setAttribute("aria-hidden", "true");
  holder.append(chip(traceFromNode, "click a note to start"), arrow,
                chip(traceToNode, "then click where to end"));

  if (traceFromNode && traceToNode) {
    const swap = document.createElement("button");
    swap.type = "button";
    swap.className = "ghost small";
    swap.textContent = "⇄ Swap";
    swap.title = "Trace the other way round";
    swap.addEventListener("click", () => {
      [traceFromNode, traceToNode] = [traceToNode, traceFromNode];
      renderTraceState();
      runTrace();
    });
    holder.appendChild(swap);
  }
  if (traceFromNode) {
    const back = document.createElement("button");
    back.type = "button";
    back.className = "ghost small";
    back.textContent = "↩ Undo";
    back.title = "Unpick the last note";
    back.addEventListener("click", () => {
      // One step back, not a reset. Mis-clicking the second note should not
      // cost you the first one.
      if (traceToNode) traceToNode = null;
      else traceFromNode = null;
      graphTrace = null;
      renderTraceState();
      drawTrace();
      applyGraphHighlight();
      showTraceMessage(traceFromNode ? "Click where to end." : "Click a note to start.");
    });
    holder.appendChild(back);
  }
}

// Kept for the note context menu, which offers "trace from here".
function setTraceEnd(which, noteId) {
  setTracePanelOpen(true);
  const node = graphNodeSelection?.data().find(n => String(n.id) === String(noteId));
  if (!node) {
    showTraceMessage("That note isn't on the map right now — clear filters and try again.");
    return;
  }
  if (which === "from") traceFromNode = node;
  else traceToNode = node;
  renderTraceState();
  if (traceFromNode && traceToNode) runTrace();
}

function showTraceMessage(text) {
  const box = $("graph-trace-result");
  if (!box) return;
  box.replaceChildren(document.createTextNode(text));
  box.classList.remove("hidden");
  box.classList.add("is-empty");
}

function clearTrace({ quiet = false } = {}) {
  graphTrace = null;
  traceFromNode = null;
  traceToNode = null;
  if (traceModeActive && !quiet) {
    // This looked up a "graph-trace-status" element, which does not exist —
    // the readout is #graph-trace-result, and showTraceMessage is how you
    // write to it. The lookup was guarded by `if (status)`, so the prompt
    // simply never appeared and trace mode began with no instructions.
    showTraceMessage("Click a starting note");
  } else {
    const box = $("graph-trace-result");
    if (box) {
      box.replaceChildren();
      box.classList.add("hidden");
      box.classList.remove("is-empty");
    }
  }
  // Both branches still have to repaint: clearing the readout without
  // redrawing leaves the old highlighted path drawn on the map.
  drawTrace();
  applyGraphHighlight();
}

async function runTrace() {
  if (!traceFromNode || !traceToNode) {
    showTraceMessage("Pick two notes to trace between.");
    return;
  }
  // Trace used to read two <select> values into local `from`/`to`. It became
  // click-two-notes-on-the-map, the selects went away, and these three
  // references to `from`/`to` were left behind pointing at nothing — so the
  // moment you picked a second note, Trace threw a ReferenceError and did
  // nothing at all, with the failure visible only in the console.
  const from = traceFromNode.id;
  const to = traceToNode.id;
  if (from === to) {
    showTraceMessage("Those are the same note — pick two different ones.");
    return;
  }
  showTraceMessage("Tracing…");
  const result = await apiJson(
    `/graph/path?source=${encodeURIComponent(from)}&target=${encodeURIComponent(to)}`
  ).catch(() => null);
  if (!result) {
    showTraceMessage("Couldn't trace that — the server didn't answer.");
    return;
  }
  if (!result.found) {
    graphTrace = null;
    // The server's reason, verbatim. "No path" on its own is the kind of
    // answer that makes people assume the feature is broken; what they need is
    // which of the three possible causes it was.
    showTraceMessage(result.reason || "No path between those two notes.");
    drawTrace();
    applyGraphHighlight();
    return;
  }
  graphTrace = {
    ids: result.nodes.map((n) => n.id),
    steps: result.steps,
    nodes: result.nodes,
  };
  renderTraceReadout(result);
  drawTrace();
  applyGraphHighlight();
}

// The chain in words, under the strip. The map shows the shape; this says what
// each step *is*, which the map cannot — a line between two notes looks the
// same whether you drew it or they merely share a tag.
function renderTraceReadout(result) {
  const box = $("graph-trace-result");
  if (!box) return;
  box.classList.remove("hidden", "is-empty");
  const pieces = [];
  const noteButton = (node) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "graph-trace-note";
    button.textContent = node.preview;
    button.title = `Open this note (${node.category})`;
    button.addEventListener("click", () => flashEntry(node.id));
    return button;
  };
  const byId = new Map(result.nodes.map((n) => [n.id, n]));
  pieces.push(noteButton(result.nodes[0]));
  for (const step of result.steps) {
    const joint = document.createElement("span");
    joint.className = "graph-trace-step";
    joint.textContent = ` — ${step.how} — `;
    pieces.push(joint, noteButton(byId.get(step.target)));
  }
  const summary = document.createElement("span");
  summary.className = "graph-trace-step";
  summary.textContent = `  (${result.hops} step${result.hops === 1 ? "" : "s"})`;
  pieces.push(summary);
  
  // Story Mode: Synthesize the path into a narrative
  const storyBtn = document.createElement("button");
  storyBtn.className = "graph-trace-note story-mode-btn";
  storyBtn.style.marginLeft = "12px";
  storyBtn.style.background = "var(--primary)";
  storyBtn.style.color = "var(--primary-fg)";
  storyBtn.style.fontWeight = "bold";
  storyBtn.textContent = "✨ Generate Story from Path";
  storyBtn.title = "Weave these notes into a cohesive narrative using the AI locally";
  storyBtn.addEventListener("click", () => {
    switchTab("chat");
    sendChatMessage(
      "Write a cohesive, publishable narrative weaving together these specific thoughts. Follow the exact chronological sequence in which these notes are attached.",
      { noteIds: graphTrace.ids }
    );
  });
  pieces.push(storyBtn);

  box.replaceChildren(...pieces);
}

// Position the overlay from the nodes it joins. Called once for a laid-out
// tree, and on every tick of the force simulation, which is why it is a
// function of the current node objects rather than of stored coordinates.
function positionTraceLines() {
  if (!graphTraceLines) return;
  graphTraceLines
    .attr("x1", (d) => d.from.x)
    .attr("y1", (d) => d.from.y)
    .attr("x2", (d) => d.to.x)
    .attr("y2", (d) => d.to.y);
}

// (Re)draw the overlay for the current trace. Segments whose notes are not on
// the map are dropped rather than drawn to nowhere — the readout above still
// names them.
function drawTrace() {
  if (!graphTraceLayer) return;
  const byId = new Map((graphNodesRef || []).map((n) => [n.id, n]));
  const segments = !graphTrace
    ? []
    : graphTrace.steps
        .map((step) => ({
          from: byId.get(step.source),
          to: byId.get(step.target),
          kind: step.kind,
        }))
        .filter((segment) => segment.from && segment.to);
  graphTraceLines = graphTraceLayer
    .selectAll("line")
    .data(segments)
    .join("line")
    .attr("class", (d) => `graph-path-line graph-path-${d.kind}`);
  positionTraceLines();
  if (graphNodeSelection) {
    const onPath = new Set(graphTrace ? graphTrace.ids : []);
    graphNodeSelection.classed("graph-on-path", (d) => onPath.has(d.id));
    graphNodeSelection.classed(
      "graph-path-end",
      (d) =>
        graphTrace != null &&
        (d.id === graphTrace.ids[0] || d.id === graphTrace.ids[graphTrace.ids.length - 1])
    );
  }
}

// --- drag one note onto another to link them (§9) ----------------------------
//
// The map already had a link gesture — 🔗 in the popup, then click the other
// note — which works and is two dialogs deep. Dropping one note on another is
// the gesture people try first, and it costs nothing to support: the drag
// behaviour is already there to move nodes about.
//
// The whole risk here is an *accidental* link, since every drag now ends over
// something or nothing. Three things answer that, and all three are needed:
// the target lights up while you are over it, the drop has to land on the
// note's own circle rather than near it, and the link that results is
// undoable from the toast.

//: How much of a miss still counts as a hit. Zero would demand pixel accuracy
//: on a moving target; the node's own radius plus this is the circle you are
//: actually aiming at.
//:
//: Raised from 6 after driving the gesture in a browser. A note is a 9px
//: circle, so six pixels of slop meant hitting a 15px target that is *drifting*
//: — dragging reheats the simulation, so everything else keeps moving while
//: you aim. Fourteen makes it a comfortable 23px and is still far short of the
//: nearest neighbour, so a drop in open space still links nothing.
const DROP_SLOP = 14;

//: The note the current drag is hovering over, remembered from the last
//: `drag` event so the drop can use it. See the `end` handler for why a fresh
//: hit test at release finds nothing.
let graphDropTarget = null;

//: The nodes a drag pinned so they would hold still while it aimed. Kept as a
//: list rather than inferred at release, because "was pinned by this drag" and
//: "was held by the user" are the same `fx != null` afterwards, and releasing
//: the second kind would silently undo a double-click hold.
let graphDragPinned = [];

function graphNodeUnder(dragged, event) {
  for (const other of graphNodesRef || []) {
    if (other === dragged || other.isGroup) continue;
    const dx = (other.x ?? 0) - event.x;
    const dy = (other.y ?? 0) - event.y;
    if (Math.hypot(dx, dy) <= graphNodeRadius(other) + DROP_SLOP) return other;
  }
  return null;
}

async function linkByDrop(from, to) {
  // Already connected: say so rather than firing a request that will 400. The
  // adjacency map is what the map itself is drawn from, so this agrees with
  // what the user can see.
  if (graphAdjacency?.get(from.id)?.has(to.id)) {
    toast("Those two are already connected.");
    return;
  }
  const updated = await apiJson(`/entries/${from.id}/links`, {
    method: "POST",
    body: JSON.stringify({ target_id: to.id }),
  }).catch((error) => {
    toast(error.message, true);
    return null;
  });
  if (!updated) return;
  await loadEntries().catch(() => {});
  renderGraph();
  // The new link's own id, so Undo removes *this* link rather than whatever
  // link happens to join them — they may have been linked twice by different
  // routes, and guessing is how an undo deletes the wrong thing.
  const made = (updated.links || []).find((link) => link.entry_id === to.id);
  toastAction(
    `Linked "${from.preview}" to "${to.preview}".`,
    "Undo",
    async () => {
      if (!made) return;
      await api(`/entries/${from.id}/links/${made.link_id}`, { method: "DELETE" });
      await loadEntries().catch(() => {});
      renderGraph();
      toast("Link removed.");
    }
  );
}

// --- colouring by cluster (§9) -----------------------------------------------
//
// A layout says where a note goes; this says what its colour *means*. By
// category is the filing — which is what somebody decided to call it. By
// cluster is the structure: which notes can actually reach each other through
// links, replies and shared tags. The two are often nothing like each other,
// and that difference is the most useful thing the map can show.

//: The last structure fetched, so the legend and the stats line agree with the
//: colours without three round trips.
let graphStructure = null;

function graphColourMode() {
  return document.querySelector('input[name="graph-colour"]:checked')?.value === "cluster" ? "cluster" : "category";
}

let graphFocusModeId = null;

async function renderGraph() {
  const wantSimilarity = $("graph-similarity").checked;
  const endpoint = graphFocusModeId 
    ? `/graph/local/${graphFocusModeId}?depth=2&similarity=${wantSimilarity}` 
    : `/graph${wantSimilarity ? "?similarity=true" : ""}`;
    
  const data = await apiJson(endpoint).catch(() => null);
  if (!data) return;

  if (graphSimulation) graphSimulation.stop();
  const svg = d3.select("#graph-svg");
  svg.on(".zoom", null); // Prevent memory leak from duplicate zoom listeners
  svg.selectAll("*").remove();

  // Premium UI: Orb gradient definitions for tactile nodes
  const defs = svg.append("defs");
  const orbGrad = defs.append("radialGradient")
    .attr("id", "orb-shine")
    .attr("cx", "35%")
    .attr("cy", "30%")
    .attr("r", "65%");
  orbGrad.append("stop").attr("offset", "0%").attr("stop-color", "white").attr("stop-opacity", "0.65");
  orbGrad.append("stop").attr("offset", "100%").attr("stop-color", "white").attr("stop-opacity", "0");

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
  const clusterColour = d3.scaleOrdinal(
    d3.schemeTableau10.concat(d3.schemeSet3)
  );
  const colourMode = graphColourMode();
  // The structure is only fetched when something is going to show it. It is a
  // traversal of the whole notebook, and an ordinary look at the map should
  // not pay for an answer nobody asked for.
  graphStructure =
    colourMode === "cluster"
      ? await apiJson("/graph/structure").catch(() => null)
      : null;
  // What a node's colour means. Category headings in a tree layout keep their
  // category colour in both modes: they are filing by definition, and a
  // heading is not a note that can belong to a cluster.
  const nodeColour = (d) => {
    if (colourMode === "category" || !graphStructure || d.isGroup) {
      return color(d.category);
    }
    const cluster = graphStructure.cluster_of[String(d.id)];
    // Connected to nothing: deliberately not a colour of its own. An orphan is
    // the absence of structure, and giving it a bright twelfth hue would make
    // the thing that is missing look like another kind of group.
    return cluster === undefined ? "var(--muted)" : clusterColour(String(cluster));
  };

  const legend = $("graph-legend");
  legend.replaceChildren();
  if (colourMode === "cluster" && graphStructure) {
    // In cluster mode the legend describes clusters, because a legend whose
    // dots do not match the colours on screen is worse than no legend. Its
    // entries highlight rather than filter — a cluster is something you want
    // to *find*, where a category is something you want to get out of the way.
    graphStructure.clusters.forEach((cluster, position) => {
      const item = document.createElement("button");
      item.className = "legend-item legend-toggle";
      item.title =
        `${cluster.size} notes, around "${cluster.core.preview}"` +
        (cluster.categories.length ? ` · ${cluster.categories.join(", ")}` : "");
      const dot = document.createElement("span");
      dot.className = "legend-dot";
      dot.style.background = clusterColour(String(position));
      item.append(
        dot,
        document.createTextNode(`${cluster.core.preview} (${cluster.size})`)
      );
      item.addEventListener("click", () => {
        graphHighlightIds = new Set(cluster.ids);
        applyGraphHighlight();
      });
      legend.appendChild(item);
    });
    if (graphStructure.orphan_count) {
      const item = document.createElement("button");
      item.className = "legend-item legend-toggle";
      item.title = "Notes with no link, no reply and no shared tag";
      const dot = document.createElement("span");
      dot.className = "legend-dot";
      dot.style.background = "var(--muted)";
      item.append(
        dot,
        document.createTextNode(`unconnected (${graphStructure.orphan_count})`)
      );
      item.addEventListener("click", () => {
        graphHighlightIds = new Set(graphStructure.orphans.map((n) => n.id));
        applyGraphHighlight();
      });
      legend.appendChild(item);
    }
    if (graphHiddenCategories.size) {
      // The category filters still apply — they just have no controls in this
      // mode. Saying so beats a map quietly missing notes.
      const note = document.createElement("span");
      note.className = "legend-item";
      note.textContent = `${graphHiddenCategories.size} category filter${
        graphHiddenCategories.size === 1 ? "" : "s"
      } still on — switch to “By category” to change them`;
      legend.appendChild(note);
    }
  } else {
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
    .scaleExtent([0.05, 5])
    .on("zoom", (event) => {
      canvas.attr("transform", event.transform);
      // Semantic Zoom logic
      const isZoomedOut = event.transform.k < 0.45;
      if (canvas.classed("semantic-zoom-out") !== isZoomedOut) {
        canvas.classed("semantic-zoom-out", isZoomedOut);
        const duration = 250;
        
        // Use try/catch or typeof since these are initialized after zoom setup
        if (typeof nodeGroups !== "undefined") {
          nodeGroups.transition().duration(duration).style("opacity", isZoomedOut ? 0 : 1).style("pointer-events", isZoomedOut ? "none" : "all");
          if (typeof labelLayer !== "undefined") labelLayer.transition().duration(duration).style("opacity", isZoomedOut ? 0 : 1);
          if (typeof edgeLayer !== "undefined") edgeLayer.transition().duration(duration).style("opacity", isZoomedOut ? 0 : 1);
          if (typeof graphTraceLayer !== "undefined" && graphTraceLayer) graphTraceLayer.transition().duration(duration).style("opacity", isZoomedOut ? 0 : 1);
          if (typeof clusterLayer !== "undefined" && clusterLayer) clusterLayer.transition().duration(duration).style("opacity", isZoomedOut ? 1 : 0).style("pointer-events", isZoomedOut ? "all" : "none");
        }
      }
    });
  svg.call(zoomBehavior).on("dblclick.zoom", null); // dblclick pins, not zooms

  // Keep refs so the +/−/fit buttons drive this same zoom behaviour.
  graphSvg = svg;
  graphZoom = zoomBehavior;
  graphCanvas = canvas;
  graphDims = { w: width, h: height };

  // D3 mutates these (x/y/vx/vy), so work on copies.
  const layoutKind = graphLayout();
  const tree = layoutKind === "force" ? null : layoutHierarchy(
    visibleNodes.map((n) => ({ ...n })), layoutKind, width, height
  );
  // In a tree the drawn edges *are* the hierarchy: the note links are a
  // different structure, and overlaying them turns the tree back into the
  // web it exists to be an alternative to.
  const nodes = tree ? tree.nodes : visibleNodes.map((n) => ({ ...n }));
  const edges = tree ? tree.links : visibleEdges.map((e) => ({ ...e }));
  graphNodesRef = nodes;
  // Adjacency for hover-highlight: which notes each note is linked to.
  graphAdjacency = new Map(nodes.map((n) => [n.id, new Set()]));
  for (const e of edges) {
    const from = tree ? e.source.id : e.source;
    const to = tree ? e.target.id : e.target;
    graphAdjacency.get(from)?.add(to);
    graphAdjacency.get(to)?.add(from);
  }

  // Physics sliders (0–100, default 50) scale the tuned defaults so the
  // out-of-the-box layout is unchanged at 50.
  const gravity = Number(localStorage.getItem("graph-gravity") ?? 50);
  const spread = Number(localStorage.getItem("graph-spread") ?? 50);
  const spreadScale = 0.5 + spread / 50; // 0.5×–2.5× the base link distance
  const gravityScale = 0.4 + gravity / 41.7; // stronger pull → tighter clusters

  graphSimulation = tree
    ? null
    : d3
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
  // How much larger than the visible frame the simulation may spread. 1.8 is
  // not arbitrary: the clamp below has to be loose enough that the repulsion
  // and collide forces, not the walls, decide where a node ends up — at 1.0
  // (the frame itself) they packed into a lattice — and tight enough that the
  // drift the clamp exists to stop is still bounded. Zoom-to-fit means a
  // larger world is only ever a smaller starting zoom, never lost notes.
  const GRAPH_WORLD_SCALE = 1.8;
  const worldW = width * GRAPH_WORLD_SCALE;
  const worldH = height * GRAPH_WORLD_SCALE;
  const worldLeft = (width - worldW) / 2;
  const worldTop = (height - worldH) / 2;
  const worldRight = worldLeft + worldW;
  const worldBottom = worldTop + worldH;
  if (tree) graphSimulation = null;

  // A tree's edges are curves between fixed points; the web's are lines that
  // move on every tick. Different elements, so each can be what it needs.
  const edgeLayer = canvas.append("g");
  const edgeLines = tree
    ? edgeLayer
        .selectAll("path")
        .data(edges)
        .join("path")
        .attr("class", (d) => `graph-edge graph-edge-${d.kind}`)
        .attr("fill", "none")
        .attr("d", (d) => (tree.arc ? arcPath(d) : hierarchyPath(d, tree.radial)))
    : edgeLayer
        .selectAll("line")
        .data(edges)
        .join("line")
        .attr("class", (d) => `graph-edge graph-edge-${d.kind}`);

  // Semantic Zoom: Clustering super-nodes
  const categoryGroups = d3.group(nodes, d => d.category || "Uncategorized");
  const clustersData = Array.from(categoryGroups, ([key, values]) => ({ id: key, category: key, nodes: values }));
  
  const clusterLayer = canvas.append("g")
    .attr("class", "graph-clusters-layer")
    .style("opacity", 0) // Hidden by default (zoomed in)
    .style("pointer-events", "none");
    
  const clusterGroups = clusterLayer
    .selectAll("g")
    .data(clustersData)
    .join("g")
    .attr("class", "graph-cluster");
    
  clusterGroups.append("circle")
    .attr("r", d => 25 + Math.sqrt(d.nodes.length) * 12)
    .attr("fill", d => clusterColour(d.category))
    .attr("fill-opacity", 0.6)
    .attr("stroke", d => d3.color(clusterColour(d.category)).darker(1))
    .attr("stroke-width", 2);
    
  clusterGroups.append("text")
    .text(d => d.category)
    .attr("text-anchor", "middle")
    .attr("dy", "0.3em")
    .style("font-size", "16px")
    .style("font-weight", "bold")
    .style("fill", "var(--text-main)")
    .style("paint-order", "stroke")
    .style("stroke", "var(--bg-main)")
    .style("stroke-width", "4px")
    .style("stroke-linecap", "round")
    .style("stroke-linejoin", "round");

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
          if (!event.active) graphSimulation?.alphaTarget(0.3).restart();
          d.fx = d.x;
          d.fy = d.y;
          // **Everything else stands still for the length of the drag.**
          // Reported: "how does the drag to connect work if the nodes are
          // constantly pushed away from each other?" It didn't, and that is
          // the honest answer — reheating the simulation set every *other*
          // note moving at exactly the moment you were trying to aim at one.
          // The code below already carried a workaround for the symptom
          // (remembering the lit target rather than hit-testing at release,
          // because the target moved out from under the pointer); this
          // removes the cause. Aiming at a moving target is not a gesture, it
          // is a reflex test.
          //
          // Pinned by hand here rather than by stopping the simulation,
          // because the ticks are what keep the edges attached to the node
          // you *are* dragging. And only the nodes this pins are released —
          // a note double-clicked to hold its place stays held, which is the
          // whole point of that gesture.
          graphDragPinned = [];
          for (const other of nodes) {
            if (other === d || other.fx != null) continue;
            other.fx = other.x;
            other.fy = other.y;
            graphDragPinned.push(other);
          }
        })
        .on("drag", (event, d) => {
          d.fx = event.x;
          d.fy = event.y;
          // Drag-to-link (§9): light up whatever this note is currently over,
          // so the gesture says what it will do *before* it does it. Without
          // this, dropping is a guess and every miss is an accidental link.
          graphDropTarget = graphNodeUnder(d, event);
          nodeGroups.classed("graph-drop-target", (other) => other === graphDropTarget);
        })
        .on("end", (event, d) => {
          if (!event.active) graphSimulation?.alphaTarget(0);
          // **The note that was lit, not the one under the cursor now.**
          // Dragging reheats the simulation, so every other node is still
          // drifting — between the last mousemove and the mouse-up the target
          // moves out from under the pointer, and a fresh hit test at release
          // finds nothing. Driven in a browser: the highlight appeared and the
          // link was never made, every time.
          //
          // Using the remembered target also matches what the person saw. The
          // node lit up; releasing links *that* one. A gesture that can light
          // one note and link another would be worse than one that missed.
          const over = graphDropTarget;
          graphDropTarget = null;
          nodeGroups.classed("graph-drop-target", false);
          if (over) linkByDrop(d, over);
          // Let the layout breathe again — but only the nodes this drag
          // pinned. A node the user held with a double-click keeps its place.
          for (const other of graphDragPinned) {
            other.fx = null;
            other.fy = null;
          }
          graphDragPinned = [];
          if (tree) return; // a laid-out tree keeps its shape
          d.fx = null;
          d.fy = null;
        })
    )
    .on("click", (event, d) => {
      if (d.isGroup) return; // a category heading, not a note to open
      // Trace is a *mode*: while it is on, clicking the map picks the two ends
      // rather than opening notes. This branch is the whole reason Trace was
      // unusable — `traceModeActive` was set and then consulted nowhere, so
      // the map stayed inert and the only way to choose a note was two
      // select boxes listing every note in the notebook by its first words.
      if (traceModeActive) {
        event.stopPropagation();
        pickTraceEnd(d);
        return;
      }
      openGraphPopup(event, d);
    })
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
    .attr("fill", nodeColour);

  nodeGroups
    .append("circle")
    .attr("class", "graph-core")
    .classed("graph-group", (d) => Boolean(d.isGroup))
    .attr("r", graphNodeRadius)
    .attr("fill", nodeColour)
    .classed("graph-pinned", (d) => d.pinned)
    // Well-connected notes get a highlighted ring so the "hubs" of your
    // notebook stand out at a glance.
    .classed("graph-hub", (d) => (graphAdjacency.get(d.id)?.size || 0) >= 3);

  // Apply the premium orb shine over the core for a 3D tactile aesthetic
  nodeGroups
    .append("circle")
    .attr("class", "graph-orb-shine")
    .attr("r", graphNodeRadius)
    .attr("fill", "url(#orb-shine)")
    .attr("pointer-events", "none");
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
  // Where the label goes is the difference between a readable tree and a
  // pile of overlapping text. Under the node is right for the web, where
  // nodes are spread in two dimensions; in a tree the rows are only
  // TREE_ROW apart, so it has to sit *beside* the node instead.
  const labelLayer = canvas.append("g").attr("class", "graph-label-layer");
  const labelGroups = labelLayer.selectAll("g").data(nodes).join("g");
  const labels = labelGroups
    .append("text")
    .attr(
      "class",
      (d) =>
        `graph-label${tree ? " graph-label-tree" : ""}` +
        `${tree && d.isGroup ? " graph-label-group" : ""}`
    )
    .text((d) => {
      // A radial's labels stick out of every side, so their length is what
      // decides how far the view has to zoom out; a tree's only extend
      // right, into space the columns already reserve.
      // Radial labels are what decide how far the view has to zoom out, and
      // the two written down a *shared* spoke — a category's, and a note that
      // has a reply hanging off it — are the ones that have to stay short.
      const limit = !tree
        ? 22
        : tree.arc
          ? ARC_LABEL_LIMIT
          : !tree.radial
            ? 30
            : d.isGroup || d.shared
              ? RADIAL_STEM
              : 16;
      return d.preview.length > limit ? d.preview.slice(0, limit - 1) + "…" : d.preview;
    });
  if (!tree) {
    labels.attr("dy", (d) => graphNodeRadius(d) + 13);
  } else if (tree.arc) {
    // Every node sits on one baseline, so a label straight above or below it
    // would collide with its neighbours within a single ARC_STEP. Tilted and
    // pivoted on its own anchor point (not the origin), it reads outward from
    // the node instead of overlapping the one next to it.
    labels
      .attr("x", (d) => graphNodeRadius(d) + 6)
      .attr("y", 0)
      .attr("dy", "0.31em")
      .attr("transform", (d) => `rotate(-40, ${graphNodeRadius(d) + 6}, 0)`)
      .style("text-anchor", "start");
  } else if (tree.radial) {
    // Rotated to its own radius and flipped on the left half, or every label
    // past the halfway point reads upside down. The hub is the exception: it
    // has no meaningful direction to point in, and radiating from radius 0
    // put it straight through whichever category shared its angle.
    labels
      .attr("dy", (d) => (d.depth ? "0.31em" : graphNodeRadius(d) + 13))
      .attr("transform", (d) => {
        if (!d.depth) return null;
        const degrees = ((d.angle || 0) * 180) / Math.PI - 90;
        return `rotate(${degrees})${radialFlip(d) ? " rotate(180)" : ""}`;
      })
      // The offset is an `x` *inside* the flipped frame, not a translate
      // outside it: translating by −out and then rotating 180° sends the
      // label back across the node towards the centre, which is how the hub's
      // name ended up printed over a category's.
      .attr("x", (d) => {
        if (!d.depth) return 0;
        const out = graphNodeRadius(d) + 6;
        return radialFlip(d) ? -out : out;
      })
      // A style, not an attribute: `.graph-node text` sets `text-anchor:
      // middle` in the stylesheet, and a rule always beats a presentation
      // attribute — set as an attr, every one of these silently stayed
      // centred and the labels overlapped the ring.
      .style("text-anchor", (d) => (!d.depth ? "middle" : radialFlip(d) ? "end" : "start"));
  } else {
    labels
      // A node with children has edges leaving it rightwards, along the line
      // its own label would sit on — and where the child is a lone reply that
      // edge runs the label's whole length. A halo hides a thin line between
      // glyphs but not between words, so it read as struck through. Every
      // branch point is labelled above its row instead; leaves, which nothing
      // leaves from, keep the label beside them.
      .attr("dy", (d) => (d.isLeaf ? "0.31em" : -graphNodeRadius(d) - 5))
      .attr("x", (d) => graphNodeRadius(d) + 7)
      .style("text-anchor", "start");
  }

  // The traced path sits above both the edges and the nodes, because it is an
  // answer drawn over the picture rather than another connection in it.
  graphTraceLayer = canvas.append("g").attr("class", "graph-trace-layer");

  // Labels toggle: when off, labels only appear on hover (declutters a big
  // map). Driven by a class so toggling never rebuilds the simulation.
  $("graph-box").classList.toggle("graph-labels-hidden", !$("graph-labels").checked);

  // A plain-language readout of what's on screen, so the map isn't a
  // mystery: how many notes and what kinds of connections link them.
  const counts = { link: 0, thread: 0, similar: 0, filing: 0 };
  for (const e of edges) counts[e.kind] = (counts[e.kind] || 0) + 1;
  const noteCount = nodes.filter((n) => !n.isGroup).length;
  const parts = [`${noteCount} note${noteCount === 1 ? "" : "s"}`];
  if (counts.link) parts.push(`${counts.link} link${counts.link === 1 ? "" : "s"}`);
  if (counts.thread) parts.push(`${counts.thread} thread${counts.thread === 1 ? "" : "s"}`);
  if (counts.similar) parts.push(`${counts.similar} similarity line${counts.similar === 1 ? "" : "s"}`);
  if (counts.filing) parts.push(`${counts.filing} filed under a category`);
  // In cluster mode the structural facts replace the "bigger notes are the
  // ones you use most" hint, because they are what the colours are now saying.
  const shape =
    colourMode === "cluster" && graphStructure
      ? ` — ${graphStructure.clusters.length} cluster` +
        `${graphStructure.clusters.length === 1 ? "" : "s"}` +
        (graphStructure.small_clusters
          ? ` + ${graphStructure.small_clusters} pair${
              graphStructure.small_clusters === 1 ? "" : "s"
            }`
          : "") +
        `, ${graphStructure.orphan_count} connected to nothing.`
      : layoutKind === "tree"
        ? " — filed left to right; replies branch off the note they answer."
        : layoutKind === "radial"
          ? " — categories around the centre; replies branch off the note they answer."
          : layoutKind === "arc"
            ? " — one line, filed left to right; arcs below show what answers what."
            : " — bigger, brighter notes are the ones you use most.";
  $("graph-stats").textContent = parts.join(" · ") + shape;

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

  if (tree) {
    // Laid out, not simulated: the paths are already drawn, so this only has
    // to place the nodes and frame the result.
    nodeGroups.attr("transform", (d) => `translate(${d.x},${d.y})`);
    labelGroups.attr("transform", (d) => `translate(${d.x},${d.y})`);
    frameTree(svg, zoomBehavior, canvas, nodes, width, height, tree.radial);
  }

  let fitted = false;
  graphSimulation?.on("tick", () => {
    // Keep the layout inside its own frame. Reported as "the graph ui is out
    // of bounds", and the mechanism is that the view is framed exactly *once*
    // — the first time the simulation settles — while the simulation itself
    // never stops for good: every drag reheats it (`alphaTarget(0.3)`), and a
    // reheated repulsion force pushes the outermost notes a little further out
    // each time. Nothing ever pulls them back, and after a few drags the notes
    // at the edge of the map are off the edge of the box, with no way to know
    // they are there.
    //
    // A clamp rather than a repeated re-fit, because a re-fit would zoom the
    // map out from under someone who had just zoomed in on purpose. This bounds
    // the world instead, so the one framing stays correct for as long as the
    // map is open. The padding is the node radius plus room for its label,
    // which is drawn below the circle — a node clamped exactly to the edge
    // would have its own name outside the frame.
    //
    // **The box is the world, not the viewport**, and that distinction was
    // the second bug. Clamping to `width`/`height` meant the simulation was
    // solving inside the visible rectangle, and a graph box is wide and short
    // — so a notebook of seventeen notes, each with a collide radius of about
    // 50px, had nowhere to go but a lattice. Reported exactly as it looked:
    // *"the graph nodes are like locked into a box"*. They were: repulsion
    // pushed everything outwards, the walls pushed back, and what settles
    // between those two is a grid.
    //
    // The world is a generous multiple of the frame instead, so the forces
    // decide the shape and the clamp only stops the endless outward drift it
    // was written for. Zoom-to-fit frames whatever they end up occupying, so
    // a bigger world costs nothing on screen.
    for (const node of nodes) {
      const pad = graphNodeRadius(node) + 28;
      node.x = Math.max(worldLeft + pad, Math.min(worldRight - pad, node.x));
      node.y = Math.max(worldTop + pad, Math.min(worldBottom - pad, node.y));
    }
    edgeLines
      .attr("x1", (d) => d.source.x)
      .attr("y1", (d) => d.source.y)
      .attr("x2", (d) => d.target.x)
      .attr("y2", (d) => d.target.y);
    // The traced path joins the same nodes, so it moves with them. Cheap: it
    // is a handful of lines beside every edge in the notebook.
    positionTraceLines();
    nodeGroups.attr("transform", (d) => `translate(${d.x},${d.y})`);
    labelGroups.attr("transform", (d) => `translate(${d.x},${d.y})`);
    clusterGroups.attr("transform", (d) => {
      const cx = d3.mean(d.nodes, n => n.x) || 0;
      const cy = d3.mean(d.nodes, n => n.y) || 0;
      return `translate(${cx},${cy})`;
    });
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
  // The pickers describe the map, so they are refilled with it — and the trace
  // is redrawn, because a refresh (a new note, a new link, a layout change)
  // must not silently drop the answer on screen.
  fillTracePickers(nodes);
  drawTrace();
  applyGraphHighlight();
  
  // Set up temporal filter slider bounds based on data
  if (data.nodes.length > 0) {
    const timestamps = data.nodes.map(n => new Date(n.created_at || Date.now()).getTime());
    const minTime = Math.min(...timestamps);
    const maxTime = Math.max(...timestamps);
    const slider = $("graph-time-slider");
    if (slider) {
      if (!window.graphSliderInitialized) {
        window.graphSliderInitialized = true;
        slider.min = minTime;
        slider.max = maxTime;
        slider.value = maxTime;
        slider.step = (maxTime - minTime) / 100 || 1;
      }
       
      slider.oninput = (e) => {
        const val = Number(e.target.value);
        $("graph-time-label").textContent = new Date(val).toLocaleDateString();
        
        // Apply temporal filter without rebuilding simulation
        nodeGroups.style("visibility", d => new Date(d.created_at || Date.now()).getTime() <= val ? "visible" : "hidden");
        labelGroups.style("visibility", d => new Date(d.created_at || Date.now()).getTime() <= val ? "visible" : "hidden");
        
        edgeLines.style("visibility", d => {
          const srcTime = new Date(d.source.created_at || Date.now()).getTime();
          const tgtTime = new Date(d.target.created_at || Date.now()).getTime();
          return srcTime <= val && tgtTime <= val ? "visible" : "hidden";
        });
      };
      
      // Initialize label
      $("graph-time-label").textContent = new Date(Number(slider.value)).toLocaleDateString();
      // Apply initial filter if the slider was already moved
      if (Number(slider.value) < maxTime) {
         slider.oninput({ target: slider });
      }
    }
  }

  initGraphKeyboard();
}

// --- driving the graph from the keyboard ------------------------------------------
// The graph was the one tab that failed a keyboard-first test outright: every
// way of reaching a note was a mouse gesture, so the whole map — and the notes
// only reachable through it — was unusable without a pointer.
//
// A tab stop per node is not the answer; a big map would be hundreds of stops
// to get past. The map takes one stop, and inside it the arrow keys move to
// the nearest note in that direction, which is the way you already think about
// a map. Tab out again in one press.

let graphKeyboardId = null; // the note the keyboard is "on", or null

function graphNodeById(id) {
  return (graphNodesRef || []).find((n) => n.id === id) || null;
}

// The nearest node roughly in `direction` from the current one. Scored by
// distance, penalised by how far off the axis it sits — so "right" prefers a
// node to the right over a nearer one that happens to be below.
function graphNeighbourInDirection(from, direction) {
  const vectors = { right: [1, 0], left: [-1, 0], up: [0, -1], down: [0, 1] };
  const [dirX, dirY] = vectors[direction] || vectors.right;
  let best = null;
  let bestScore = Infinity;
  for (const node of graphNodesRef || []) {
    if (node === from) continue;
    const dx = node.x - from.x;
    const dy = node.y - from.y;
    const along = dx * dirX + dy * dirY;
    if (along <= 0) continue; // behind us
    const across = Math.abs(dx * dirY - dy * dirX);
    const score = along + across * 2.5;
    if (score < bestScore) {
      bestScore = score;
      best = node;
    }
  }
  return best;
}

function focusGraphNode(node, { announceIt = true } = {}) {
  if (!node) return;
  graphKeyboardId = node.id;
  // Reuse the hover spotlight: keyboard focus and pointer hover mean the same
  // thing here, and two highlight systems would fight each other.
  graphHoveredId = node.id;
  applyGraphHighlight();
  if (graphNodeSelection) {
    graphNodeSelection.classed("graph-keyfocus", (d) => d.id === node.id);
  }
  if (announceIt) {
    const links = graphAdjacency?.get(node.id)?.size || 0;
    announce(
      `${node.preview}. ${node.category}. ` +
        `${links} connection${links === 1 ? "" : "s"}. Press Enter to open.`
    );
  }
}

// The popup positions itself from a click's coordinates, so a keyboard open
// has to supply the equivalent point: where the node actually is on screen.
function graphNodeScreenPoint(node) {
  const box = document.getElementById("graph-box");
  const rect = box ? box.getBoundingClientRect() : { left: 0, top: 0, width: 0, height: 0 };
  const transform = graphCanvas ? graphCanvas.attr("transform") : null;
  let scale = 1;
  let tx = 0;
  let ty = 0;
  if (transform) {
    const move = /translate\(([-\d.]+)[ ,]([-\d.]+)\)/.exec(transform);
    const zoom = /scale\(([-\d.]+)\)/.exec(transform);
    if (move) {
      tx = Number(move[1]);
      ty = Number(move[2]);
    }
    if (zoom) scale = Number(zoom[1]);
  }
  return {
    clientX: rect.left + tx + node.x * scale,
    clientY: rect.top + ty + node.y * scale,
  };
}

function initGraphKeyboard() {
  const box = document.getElementById("graph-box");
  if (!box || box.dataset.keyboardReady) return;
  box.dataset.keyboardReady = "1";
  box.tabIndex = 0;
  box.setAttribute("role", "application");
  box.setAttribute(
    "aria-label",
    "Map of your notes. Arrow keys move between notes, Enter opens one, " +
      "Escape leaves the map."
  );

  box.addEventListener("focus", () => {
    if (!graphNodesRef?.length) return;
    const current = graphNodeById(graphKeyboardId) || graphNodesRef[0];
    focusGraphNode(current);
  });
  box.addEventListener("blur", () => {
    if (graphNodeSelection) graphNodeSelection.classed("graph-keyfocus", false);
    graphHoveredId = null;
    applyGraphHighlight();
  });

  box.addEventListener("keydown", (event) => {
    if (!graphNodesRef?.length) return;
    const current = graphNodeById(graphKeyboardId) || graphNodesRef[0];
    const directions = {
      ArrowRight: "right",
      ArrowLeft: "left",
      ArrowUp: "up",
      ArrowDown: "down",
    };
    if (directions[event.key]) {
      event.preventDefault();
      const next = graphNeighbourInDirection(current, directions[event.key]);
      // No node that way is not an error — say so rather than silently
      // doing nothing, which reads as the keys not working.
      if (next) focusGraphNode(next);
      else announce("No note in that direction.");
      return;
    }
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openGraphPopup(
        { ...graphNodeScreenPoint(current), stopPropagation() {} },
        current
      );
      return;
    }
    // Step through this note's own connections — the relationship the map is
    // actually for, which "nearest in a direction" doesn't follow.
    if (event.key === "n" || event.key === "N") {
      event.preventDefault();
      const linked = [...(graphAdjacency?.get(current.id) || [])];
      if (!linked.length) {
        announce("This note has no connections.");
        return;
      }
      const seen = graphNodeById(graphKeyboardId);
      const position = linked.indexOf(seen?.id);
      const nextId = linked[(position + 1) % linked.length];
      focusGraphNode(graphNodeById(nextId));
      return;
    }
    if (event.key === "Escape") {
      box.blur();
    }
  });
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
  // A traced path is the strongest spotlight there is: it is the answer to a
  // question that was just asked, so it outranks a search box someone typed in
  // earlier. Everything not on the chain dims, which is what makes a six-note
  // route legible on a map of three hundred.
  const onPath = graphTrace ? new Set(graphTrace.ids) : null;
  const searchOk = (d) =>
    onPath
      ? onPath.has(d.id)
      : graphHighlightIds
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

  const isSearchActive = !!(query || graphHighlightIds || onPath);
  graphNodeSelection.classed(
    "graph-dim",
    (d) => !(searchOk(d) && hoverOk(d.id))
  );
  graphNodeSelection.classed(
    "graph-match",
    (d) => isSearchActive && searchOk(d)
  );
  graphNodeSelection.classed("graph-focus", (d) => d.id === graphHoveredId);
  graphEdgeSelection.classed("graph-dim", (d) => {
    const s = idOf(d.source);
    const t = idOf(d.target);
    const bySearch =
      !(query || graphHighlightIds || onPath) ||
      (searchOk(d.source) && searchOk(d.target));
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
  renderGraphPopupMedia(entry);
  renderGraphPopupActions(entry);
  placeGraphPopup(); // now that it's at its real height
  $("graph-popup-content").focus();
}

// Show a note's images in the popup, biggest reason being sketches.
//
// A sketch is stored as a note carrying the caption plus a PNG attachment, so
// on the map it is an ordinary node and the popup showed its caption and
// nothing else. There was no way to see the drawing from the graph at all —
// "Open" only took you to the Notes tab, where you still had to find the card
// and click its thumbnail. Reported as "sketches don't open from the graph",
// and that is exactly right: the one thing the note is *about* was missing.
function renderGraphPopupMedia(entry) {
  const box = $("graph-popup-media");
  box.replaceChildren();
  const images = (entry.attachments || []).filter((a) => a.is_image);
  box.classList.toggle("hidden", images.length === 0);
  if (!images.length) return;
  for (const attachment of images) {
    const img = document.createElement("img");
    img.className = "graph-popup-thumb";
    img.alt = attachment.filename;
    img.title = `${attachment.filename} — click to view full size`;
    // The bytes need the auth header, so they arrive as an object URL rather
    // than a plain src. Cached per attachment by attachmentObjectUrl.
    attachmentObjectUrl(attachment)
      .then((url) => {
        img.src = url;
        placeGraphPopup(); // the popup just got taller
      })
      .catch(() => img.remove());
    img.addEventListener("click", async () => {
      openLightbox(await attachmentObjectUrl(attachment), attachment.filename);
    });
    box.appendChild(img);
  }
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
  
  if (graphFocusModeId !== entry.id) {
    box.appendChild(
      smallButton("🎯 Focus", "Isolate this note's neighborhood", () => {
        graphFocusModeId = entry.id;
        $("graph-focus-clear")?.classList.remove("hidden");
        closeGraphPopup();
        renderGraph();
        toast("Focus Mode active. Showing local neighborhood.");
      })
    );
  }
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
  // Two clicks, the same shape as 🔗 Link: this note becomes one end of the
  // trace, and the next one you pick becomes the other. The label says which
  // end it will be, because a button that does two different things without
  // saying which is a button you have to try to understand.
  const tracingFrom = Boolean(traceFromNode);
  box.appendChild(
    smallButton(
      tracingFrom ? "🛣 Trace to here" : "🛣 Trace from here",
      tracingFrom
        ? "Find how this note connects to the one you started from"
        : "Start tracing a path from this note",
      () => {
        closeGraphPopup();
        setTraceEnd(tracingFrom ? "to" : "from", entry.id);
        if (!tracingFrom) toast("Now pick the other note — 🛣 Trace to here.");
      }
    )
  );
  box.appendChild(
    smallButton("⏰ Remind", "Set a reminder about this note", () => {
      closeGraphPopup();
      switchTab("reminders");
      $("reminder-text").value = `Follow up: ${entry.content.slice(0, 60)}`;
      setDue(defaultDueValue()); // keeps the visible date/time fields in step
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
      if (!(await confirmDialog("Move this note to the recycle bin?"))) return;
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

// "documents" is still a page and still switchable-to — it is the document
// editor, opened from the Library (§36F). It is no longer in the tab *bar*, so
// it sits at the end here: TABS drives which pages hide, and the arrow-key
// order comes from the bar's own buttons.
const TABS = ["dashboard", "notes", "chat", "graph", "library", "timeline", "reminders", "documents"];

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
  // When the strip is narrow enough to scroll, the tab you just chose is the
  // one that must be legible — see revealActiveTab.
  revealActiveTab?.();
  localStorage.setItem("activeTab", name); // reopen where you left off
  // A new tab starts at its own top, and the back-to-top button re-evaluates
  // (it stays off the graph). Each page keeps its own scroll position now, so
  // this is a deliberate reset rather than a side effect of one shared one.
  scrollingPage()?.scrollTo({ top: 0, behavior: "auto" });
  scrollTopUpdate?.();
  // The generative-art animation only needs to run while it's on screen.
  if (name !== "dashboard") stopArt();
  if (name === "chat") {
    renderChatEmptyState(); // welcome placeholder when the thread is empty
    loadChatSuggestions();
    $("chat-input").focus();
    // Nothing in a hidden tab can be measured, so the composer's fit is done
    // here rather than at startup — the window may well have changed size
    // since the last time this tab was visible.
    refitComposer();
  }
  if (name === "dashboard") renderDashboard();
  if (name === "graph") {
    const layout = graphLayout();
    const layoutInput = document.querySelector(`input[name="graph-layout"][value="${layout}"]`);
    if (layoutInput) layoutInput.checked = true;
    
    // Same for what the colours mean: a saved setting the control does not
    // show is a control that lies about the map beside it.
    const savedColour = localStorage.getItem("graph-colour");
    if (savedColour === "cluster" || savedColour === "category") {
      const colourInput = document.querySelector(`input[name="graph-colour"][value="${savedColour}"]`);
      if (colourInput) colourInput.checked = true;
    }
    // Match the saved layout on arrival, not only on change — otherwise a
    // notebook left on Tree comes back with two live-looking dead sliders.
    setGraphPhysicsEnabled(graphLayout());
    const optionsOpen = localStorage.getItem("graph-options-open") === "1";
    $("graph-options").classList.toggle("hidden", !optionsOpen);
    $("graph-options-toggle").setAttribute("aria-expanded", String(optionsOpen));
    $("graph-options-toggle").classList.toggle("is-on", optionsOpen);
    setTracePanelOpen(localStorage.getItem("graph-trace-open") === "1");
    renderGraph();
  }
  if (name === "timeline") {
    $("timeline-view").value = timelineView();
    renderTimeline();
  }
  if (name === "documents") {
    loadDocuments();
    renderDocStorage();
  }
  if (name === "library") loadLibrary();
  if (name === "reminders") {
    refreshReminderDefaults();
    loadReminders();
  }
}

// --- Timeline (§10B) --------------------------------------------------------------
//
// Asked for repeatedly, and with more shape each time: "I want a note timeline
// where I can see notes visually by what time they were made. Maybe I can even
// group them by events or related places etc." So the axis is time and the
// rows are bands — a note's category or tag — because that is what turns a
// sorted list into a map of what happened.
//
// Drawn as a CSS grid rather than SVG: every cell is a real element, so it is
// scrollable, selectable, keyboard-reachable and readable by a screen reader
// without any of that being built by hand.

// §10C: which view is showing — the grid (what happened around this date,
// across every band) or the line (the shape of one thread over time). A
// preference, like the graph's layout picker, not a migration.
function timelineView() {
  const saved = localStorage.getItem("timeline-view");
  return saved === "line" ? "line" : "grid";
}

async function renderTimeline() {
  const grid = $("timeline-grid");
  const body = await apiJson(
    `/timeline?scale=${$("timeline-scale").value}` +
      `&group=${$("timeline-group").value}&days=${$("timeline-days").value}`
  ).catch(() => null);
  const line = timelineView() === "line";
  $("timeline-scroll").classList.toggle("hidden", line);
  $("timeline-branch-wrap").classList.toggle("hidden", !line);
  grid.replaceChildren();
  if (!body || !body.notes.length) {
    $("timeline-empty").classList.remove("hidden");
    $("timeline-count").textContent = "";
    return;
  }
  $("timeline-empty").classList.add("hidden");
  $("timeline-count").textContent = line
    ? `${body.notes.length} notes · ${body.bands.length} band${body.bands.length === 1 ? "" : "s"}`
    : `${body.notes.length} notes · ${body.buckets.length} columns`;

  if (line) {
    renderTimelineBranch(body);
    return;
  }

  const buckets = body.buckets;
  const byId = new Map(body.notes.map((note) => [note.id, note]));
  // Columns: one label column for the band names, then one per bucket.
  // 5.5rem was sized for a bucket's date label, not for note preview text
  // sharing the same track. 9rem (§37J's first pass) was still reported cut
  // off — the preview is up to 120 characters (routes_timeline.py's
  // PREVIEW_CHARS) and a 2-line clamp at 9rem only ever showed 40-50 of
  // them, so "wider" wasn't wide enough to matter. 13rem + a 3-line clamp
  // (below, .timeline-dot) gets close to the full preview for a typical
  // note instead of a marginal improvement on the same shape of cut-off.
  grid.style.gridTemplateColumns = `minmax(7rem, auto) repeat(${buckets.length}, minmax(13rem, 1fr))`;

  const corner = document.createElement("div");
  corner.className = "timeline-corner";
  grid.appendChild(corner);
  for (const bucket of buckets) {
    const head = document.createElement("div");
    head.className = "timeline-head";
    head.textContent = bucketLabel(bucket, body.scale);
    grid.appendChild(head);
  }

  for (const band of body.bands) {
    const name = document.createElement("button");
    name.type = "button";
    name.className = "timeline-band";
    name.title = `Show the ${band.name} notes`;
    name.append(band.name);
    const count = document.createElement("span");
    count.className = "muted";
    count.textContent = ` ${band.count}`;
    name.appendChild(count);
    name.addEventListener("click", () => openTimelineBand(band, body.group));
    grid.appendChild(name);

    const inBand = new Set(band.ids);
    for (const bucket of buckets) {
      const cell = document.createElement("div");
      cell.className = "timeline-cell";
      const here = body.notes.filter(
        (note) => note.bucket === bucket && inBand.has(note.id)
      );
      for (const note of here) cell.appendChild(timelineDot(note));
      grid.appendChild(cell);
    }
  }
  // The most recent column is the interesting one, so start there.
  $("timeline-scroll").scrollLeft = $("timeline-scroll").scrollWidth;
  void byId;
}

// --- Timeline: the branch/line view (§10C) -----------------------------------
//
// "Make sure the timeline has the additional aspect of like a line or
// branching line/tree-like graph view because right now it is more like a
// calendar" — accurate, and not a defect in the grid so much as the grid
// answering a different question well. A grid answers "what happened around
// this date, across every band at once"; this answers "what was the shape of
// this one thread over time" — two notes three months apart in the same band
// read as unrelated dots in a grid, and as one continuous line here.
//
// Branches come from the same bands the grid already computes (category or
// tag, whichever is picked) rather than a second grouping. BACKLOG.md §10C
// named §9's cluster detection as the other candidate signal; that is a
// different structure (link/similarity, behind a separate endpoint) from the
// filing this reads, and reusing the grouping already on screen keeps the two
// Timeline views showing the same notebook two ways rather than two
// different stories about it. "None" collapses to a single lane — the spine
// itself, with every note directly on it.
const TIMELINE_LANE_GAP = 52;
const TIMELINE_MARGIN_X = 250; // left room for a band's label (increased so they don't cut off)
const TIMELINE_MARGIN_TOP = 40;
const TIMELINE_DOT_R = 10; // increased for better visibility and access

function renderTimelineBranch(body) {
  const svg = d3.select("#timeline-branch-svg");
  svg.selectAll("*").remove();
  const width = Math.max($("timeline-branch-wrap").clientWidth || 800, 480);

  const notes = body.notes;
  const times = notes.map((n) => new Date(n.at));
  const minT = d3.min(times);
  const maxT = d3.max(times);
  // A single moment in time has no span to scale against — give it a day
  // either side rather than let every note collapse onto the same x.
  const domain =
    minT.getTime() === maxT.getTime()
      ? [new Date(minT.getTime() - 864e5), new Date(maxT.getTime() + 864e5)]
      : [minT, maxT];
  const scale = d3.scaleTime().domain(domain).range([TIMELINE_MARGIN_X, width - 24]).nice();

  const bands = body.bands;
  const single = bands.length <= 1;
  const spineY = TIMELINE_MARGIN_TOP;
  const height = spineY + (single ? 1 : bands.length + 1) * TIMELINE_LANE_GAP + 20;
  svg.attr("viewBox", `0 0 ${width} ${height}`).attr("width", width).attr("height", height);

  const color = d3.scaleOrdinal(
    bands.map((b) => b.name),
    d3.schemeTableau10.concat(d3.schemeSet3)
  );

  // The plain chronological reading — every note in order — is what a grid
  // gives you for free, and a branch view still owes it: it is the line every
  // band's stub actually branches off of.
  svg
    .append("line")
    .attr("class", "timeline-spine")
    .attr("x1", scale.range()[0])
    .attr("x2", scale.range()[1])
    .attr("y1", spineY)
    .attr("y2", spineY);

  bands.forEach((band, index) => {
    const laneY = single ? spineY : spineY + (index + 1) * TIMELINE_LANE_GAP;
    const inBand = new Set(band.ids);
    const here = notes
      .filter((n) => inBand.has(n.id))
      .sort((a, b) => new Date(a.at) - new Date(b.at));
    if (!here.length) return;

    const laneGroup = svg.append("g").attr("class", "timeline-branch-lane");
    const tint = color(band.name);

    if (!single) {
      // Where a branch starts: it peels off the spine slightly before its first
      // note to form a smooth organic S-curve instead of a sharp vertical line.
      const startX = scale(new Date(here[0].at));
      const branchX = Math.max(scale.range()[0], startX - 45);
      const midX = (branchX + startX) / 2;
      laneGroup
        .append("path")
        .attr("class", "timeline-branch-stub")
        .attr("fill", "none")
        .attr("stroke", tint)
        .attr("d", `M${branchX},${spineY}C${midX},${spineY} ${midX},${laneY} ${startX},${laneY}`);
    }

    // The thread itself — the one thing a grid cannot show at all: every
    // note in this band, joined in time order, however far apart they sit.
    if (here.length > 1) {
      const linePath = d3
        .line()
        .x((n) => scale(new Date(n.at)))
        .y(() => laneY);
      const path = laneGroup
        .append("path")
        .attr("class", "timeline-branch-line")
        .attr("fill", "none")
        .attr("stroke", tint)
        .attr("d", linePath(here));
      
      const length = path.node().getTotalLength();
      path
        .attr("stroke-dasharray", length + " " + length)
        .attr("stroke-dashoffset", length)
        .transition()
        .duration(800)
        .ease(d3.easeCubicOut)
        .attr("stroke-dashoffset", 0);
    }

    if (!single) {
      const label = laneGroup
        .append("text")
        .attr("class", "timeline-branch-label")
        .attr("x", scale.range()[0] - 10)
        .attr("y", laneY - 14)
        .attr("dy", "0")
        .attr("text-anchor", "end")
        .attr("fill", tint)
        .text(band.name)
        .style("opacity", 0);

      label.transition().duration(600).style("opacity", 1);
      label.append("title").text(`${band.count} note${band.count === 1 ? "" : "s"}`);
    }

    // Calculate vertical staggering to prevent physical overlap
    const placed = [];
    const minDistance = TIMELINE_DOT_R * 2 + 2; // 2px padding
    
    here.forEach(n => {
      n.cx = scale(new Date(n.at));
      
      // Find what dy offsets are already taken at this cx
      const taken = placed
        .filter(p => Math.abs(p.cx - n.cx) < minDistance)
        .map(p => p._dy);
        
      // Try dy offsets: 0, 15, -15, 30, -30...
      let step = TIMELINE_DOT_R * 1.5;
      let offsetIdx = 0;
      let dy = 0;
      while (taken.includes(dy)) {
        offsetIdx++;
        const sign = offsetIdx % 2 === 0 ? 1 : -1;
        dy = Math.ceil(offsetIdx / 2) * step * sign;
      }
      n._dy = dy;
      placed.push(n);
    });

    const dots = laneGroup
      .selectAll("circle")
      .data(here)
      .join("circle")
      .attr(
        "class",
        (n) => `timeline-branch-dot${n.placed_by === "mentioned" ? " timeline-branch-dot-mentioned" : ""}`
      )
      .attr("cx", (n) => n.cx)
      .attr("cy", (n) => laneY + (n._dy || 0))
      .attr("fill", tint)
      .attr("r", 0)
      .on("mouseover", function() {
        d3.select(this).transition().duration(150).attr("r", TIMELINE_DOT_R * 1.5);
        d3.selectAll(".timeline-branch-lane").transition().duration(150).style("opacity", function() {
          return (this === laneGroup.node()) ? 1 : 0.2;
        });
      })
      .on("mouseout", function() {
        d3.select(this).transition().duration(150).attr("r", TIMELINE_DOT_R);
        d3.selectAll(".timeline-branch-lane").transition().duration(150).style("opacity", 1);
      })
      .on("click", (event, n) => {
        openTimelinePopup(event, n);
      });
      
    dots.transition()
      .delay((_, i) => Math.min(i * 30, 800))
      .duration(400)
      .ease(d3.easeElasticOut)
      .attr("r", TIMELINE_DOT_R);
    dots.append("title").text((n) => {
      // Same honesty rule as the grid's dots: say when a note is here because
      // of what it says rather than when it was typed.
      const when =
        n.placed_by === "mentioned"
          ? `“${n.phrase}” meant ${new Date(n.at).toLocaleDateString()}`
          : new Date(n.written_at).toLocaleString();
      return `${stripMarkdownPreview(n.preview)}\n${when}`;
    });
  });

  // A handful of date ticks along the spine — an unlabelled line reads as a
  // decoration, not an axis.
  const tickGroup = svg.append("g").attr("class", "timeline-branch-ticks");
  for (const tick of scale.ticks(Math.min(6, notes.length))) {
    const x = scale(tick);
    tickGroup
      .append("line")
      .attr("x1", x)
      .attr("x2", x)
      .attr("y1", spineY - 4)
      .attr("y2", spineY + 4);
    tickGroup
      .append("text")
      .attr("x", x)
      .attr("y", spineY - 10)
      .attr("text-anchor", "middle")
      .text(tick.toLocaleDateString(undefined, { month: "short", day: "numeric" }));
  }
}

function bucketLabel(iso, scale) {
  const day = new Date(`${iso}T00:00:00`);
  if (scale === "year") return String(day.getFullYear());
  if (scale === "month") {
    return day.toLocaleDateString(undefined, { month: "short", year: "2-digit" });
  }
  return day.toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

// The preview is the raw note text sliced to 120 chars server-side (§37J) —
// `**bold**` and `# a heading` showed their literal punctuation in the one
// place they're smallest and most cramped to read. Full `renderMarkdown`
// builds block-level DOM (headings, code blocks with a copy button) that
// doesn't make sense clamped to two lines inside a button, so this strips the
// syntax to plain words instead. The slice can land mid-token — `**bold te`
// with no closing `**` — so every rule here deletes delimiter characters
// outright rather than matching opening/closing pairs, which handles a
// truncated run the same way as a complete one.
function stripMarkdownPreview(text) {
  return text
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/^>\s?/gm, "")
    .replace(/^[-*+]\s+/gm, "")
    .replace(/^\d+\.\s+/gm, "")
    .replace(/`{1,3}/g, "")
    .replace(/\*\*/g, "")
    .replace(/__/g, "")
    .replace(/~~/g, "")
    .replace(/[*_](?=\S)|(?<=\S)[*_]/g, "")
    .replace(/!?\[([^\]]*)\]\([^)]*\)?/g, "$1");
}

function timelineDot(note) {
  const dot = document.createElement("button");
  dot.className = `timeline-dot${note.placed_by === "mentioned" ? " timeline-dot-mentioned" : ""}`;
  dot.type = "button";
  // 🕓 marks a note that is here because of what it says, not when it was
  // typed. Without it the timeline quietly moves notes and looks wrong.
  dot.textContent =
    (note.placed_by === "mentioned" ? "🕓 " : "") + stripMarkdownPreview(note.preview);
  dot.title =
    note.placed_by === "mentioned"
      ? `“${note.phrase}” in this note meant ${new Date(note.at).toLocaleDateString()}.` +
        `\nWritten ${new Date(note.written_at).toLocaleDateString()}.`
      : `Written ${new Date(note.written_at).toLocaleString()}`;
  dot.addEventListener("click", (event) => {
    openTimelinePopup(event, note);
  });
  return dot;
}

// Matches routes_timeline.py's OTHER_BAND — the long-tail lane has no single
// category or tag to filter by, so clicking it just clears filters instead.
const TIMELINE_OTHER_BAND = "Everything else";

// A band names a category or a tag; clicking it should do what clicking
// either already does elsewhere in the app (the sidebar's category rows, a
// Library tag card) rather than only ever opening the note the click
// happened to land on — the Timeline's whole complaint was "low utility".
function openTimelineBand(band, group) {
  switchTab("notes");
  showNotesSection("browse");
  const box = $("note-search");
  if (group === "category" && band.name !== TIMELINE_OTHER_BAND) {
    activeCategory = band.name;
    if (box) box.value = "";
  } else {
    activeCategory = null;
    if (box) {
      box.value =
        group === "tag" && band.name !== TIMELINE_OTHER_BAND
          ? band.name === "untagged"
            ? "is:untagged"
            : `tag:${band.name}`
          : "";
    }
  }
  noteSearch = box ? box.value.trim() : "";
  $("save-search")?.classList.toggle("hidden", !noteSearch);
  renderSidebar();
  renderEntries();
}

for (const id of ["timeline-scale", "timeline-group", "timeline-days"]) {
  $(id).addEventListener("change", renderTimeline);
}
$("timeline-view").addEventListener("change", (event) => {
  localStorage.setItem("timeline-view", event.target.value);
  renderTimeline();
});

$("timeline-popup-close").addEventListener("click", () => {
  $("timeline-popup").classList.add("hidden");
});

// Hide timeline popup when clicking outside
$("tab-timeline").addEventListener("click", (e) => {
  if (e.target === $("tab-timeline") || e.target.closest(".timeline-scroll") || e.target.closest(".timeline-branch-svg")) {
    $("timeline-popup").classList.add("hidden");
  }
});

let timelinePopupId = null;

async function openTimelinePopup(event, noteSummary) {
  event.stopPropagation();
  timelinePopupId = noteSummary.id;
  const popup = $("timeline-popup");
  
  $("timeline-popup-title").textContent = noteSummary.category || "Note";
  $("timeline-popup-content").textContent = "Loading…";
  
  const box = $("timeline-popup-info");
  box.replaceChildren();
  const dateStr = noteSummary.placed_by === "mentioned"
      ? `“${noteSummary.phrase}” meant ${new Date(noteSummary.at).toLocaleDateString()}. Written ${new Date(noteSummary.written_at).toLocaleDateString()}.`
      : `Written ${new Date(noteSummary.written_at).toLocaleString()}`;
  box.appendChild(chip(`🕐 ${dateStr}`, "tag"));

  popup.classList.remove("hidden");
  
  const bounds = $("tab-timeline").getBoundingClientRect();
  const size = popup.getBoundingClientRect();
  const left = Math.min(
    Math.max(event.clientX - bounds.left + 12, 8),
    Math.max(8, bounds.width - size.width - 8)
  );
  const top = Math.min(
    Math.max(event.clientY - bounds.top + 12, 8),
    Math.max(8, bounds.height - size.height - 8)
  );
  popup.style.left = `${left}px`;
  popup.style.top = `${top}px`;

  const entry = await apiJson(`/entries/${noteSummary.id}`).catch(() => null);
  if (!entry || timelinePopupId !== noteSummary.id) {
    if (timelinePopupId === noteSummary.id) {
      $("timeline-popup-content").textContent = "Couldn't load this note.";
    }
    return;
  }
  
  $("timeline-popup-content").textContent = entry.content;
  
  const openBtn = $("timeline-popup-open");
  const newOpenBtn = openBtn.cloneNode(true);
  openBtn.replaceWith(newOpenBtn);
  newOpenBtn.addEventListener("click", () => {
    popup.classList.add("hidden");
    switchTab("notes");
    showNotesSection("browse");
    flashEntry(noteSummary.id);
  });
}

function applyTimelineSearch() {
  const query = $("timeline-search").value.trim().toLowerCase();
  
  // Grid View dots
  const gridDots = document.querySelectorAll(".timeline-dot");
  gridDots.forEach(dot => {
    const text = (dot.textContent || "").toLowerCase();
    dot.classList.toggle("timeline-dim", query && !text.includes(query));
  });

  // Branch View dots (D3)
  d3.selectAll(".timeline-branch-dot")
    .classed("timeline-dim", function(d) {
      const matchText = (d.preview || "").toLowerCase();
      return query && !matchText.includes(query);
    });
}

let timelineSearchDebounceTimeout;
$("timeline-search").addEventListener("input", () => {
  clearTimeout(timelineSearchDebounceTimeout);
  timelineSearchDebounceTimeout = setTimeout(applyTimelineSearch, 150);
});


$("entry-document").addEventListener("change", async (event) => {
  const value = event.target.value;
  event.target.value = "";
  if (value === NEW_DOCUMENT) {
    const doc = await createDocumentNamed($("entry-content").value.trim().slice(0, 60));
    if (!doc) return;
    captureDocuments.add(doc.id);
    await loadCaptureDocuments(); // so the new one is in the list to remove
    return;
  }
  const id = Number(value);
  if (id) captureDocuments.add(id);
  renderCaptureDocuments();
});

// Layout picker (§9). Stored, because which shape suits a notebook is a
// property of the notebook rather than of one visit.
$("graph-layout").addEventListener("change", (event) => {
  localStorage.setItem("graph-layout", event.target.value);
  setGraphPhysicsEnabled(event.target.value);
  renderGraph();
});

// --- Notes sub-tabs ---------------------------------------------------------------
// Four full-height cards stacked on one page meant scrolling past three forms
// you weren't using to reach your notes (roadmap §10). Folding each card
// helped, but it was mitigation: you still had four things to manage.
//
// The per-card collapse chevrons are retired here rather than kept alongside.
// Two mechanisms for hiding the same card is exactly the trap that had the
// Notes sections not collapsing at all a few sessions ago — one implementation
// quietly undoing the other.

const NOTES_SECTIONS = ["browse", "capture", "writing-room", "ask"];
const NOTES_SECTION_STORE = "notesSection";

function activeNotesSection() {
  const saved = localStorage.getItem(NOTES_SECTION_STORE);
  return NOTES_SECTIONS.includes(saved) ? saved : "browse";
}

function showNotesSection(name, { focus = false } = {}) {
  // Measurements only mean anything once the section is on screen.
  if (name === "browse") setTimeout(settleNoteClamps, 0);
  // The picker lists documents that may have been created since this page
  // loaded — a stale list is how "add to document" ends up offering nothing.
  if (name === "capture") loadCaptureDocuments();
  const wanted = NOTES_SECTIONS.includes(name) ? name : "browse";
  for (const id of NOTES_SECTIONS) {
    const card = document.getElementById(id);
    if (card) card.classList.toggle("hidden", id !== wanted);
  }
  for (const button of document.querySelectorAll("#notes-subtabs button")) {
    const active = button.dataset.section === wanted;
    button.classList.toggle("active", active);
    button.setAttribute("aria-selected", String(active));
    // Roving tabindex: the strip is one tab stop, arrows move within it.
    button.tabIndex = active ? 0 : -1;
    if (active && focus) button.focus();
  }
  localStorage.setItem(NOTES_SECTION_STORE, wanted);
  // A textarea measured while its section is display:none reports
  // scrollHeight 0, so autoGrow collapsed the capture box to its minimum and
  // it only sprang open once clicked (user-reported). Re-measure now that the
  // section is actually visible.
  for (const box of document.querySelectorAll("textarea.autogrow")) {
    if (box.offsetParent !== null) autoGrow(box);
  }
}

function initNotesSubtabs() {
  const strip = document.getElementById("notes-subtabs");
  if (!strip || strip.dataset.ready) return;
  strip.dataset.ready = "1";
  strip.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-section]");
    if (button) showNotesSection(button.dataset.section);
  });
  strip.addEventListener("keydown", (event) => {
    const step = { ArrowRight: 1, ArrowLeft: -1 }[event.key];
    if (!step) return;
    event.preventDefault();
    const order = [...strip.querySelectorAll("button[data-section]")].map(
      (b) => b.dataset.section
    );
    const index = order.indexOf(activeNotesSection());
    showNotesSection(order[(index + step + order.length) % order.length], {
      focus: true,
    });
  });
  showNotesSection(activeNotesSection());
}

// The Notes tab's bin, activity and tag panels are gone (§36G).
//
// Each of them had a second implementation in the Library — the same list,
// the same controls — and the bin's two could disagree about what was in it,
// because each fetched its own. Three surfaces, three render functions, three
// blocks of markup and a `showPanel` that hid whichever two you were not
// looking at, all replaced by a filter chip on a screen built for exactly
// this. The last thing the panel could do that the Library could not was show
// a binned note in full; `openBinnedNote` above is that, and it is the reason
// this could finally go.
//
// This is the first surface this project has *removed* rather than added.

// The element that actually scrolls (§36A). The window no longer does — the
// visible .tab-page is its own scroll container, so the scrollbar starts below
// the top bar instead of running behind it.
function scrollingPage() {
  return document.querySelector(".tab-page:not(.hidden)");
}

// Honour "prefers reduced motion" — a long smooth scroll is exactly the kind
// of movement that setting exists to stop.
function scrollPageToTop() {
  const smooth = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  scrollingPage()?.scrollTo({ top: 0, behavior: smooth ? "smooth" : "auto" });
}

// --- back-to-top button -----------------------------------------------------------
// Shown on every tab except the graph, where the page itself doesn't scroll
// and the button would just sit on top of the map.
//
// Chat is a special case, not an exclusion: `.tab-page` itself never scrolls
// there (`#tab-chat > .layout` fills the page, §36A), so the page-scroll
// button would just sit permanently hidden even in a long conversation
// (user-reported: "I want a back-to-top button in chat pages"). The actual
// scrolling element on that tab is `#chat-messages`, so the button tracks
// that instead of the page whenever chat is active — same button, same
// corner, just a different scroll target depending on which tab is up.
const NO_SCROLL_TOP_TABS = new Set(["graph"]);
let scrollTopUpdate = null;

function chatMessagesEl() {
  return document.getElementById("chat-messages");
}

function initScrollTopButton() {
  const button = document.createElement("button");
  button.id = "scroll-top";
  button.className = "scroll-top";
  button.type = "button";
  button.textContent = "↑";
  button.title = "Back to top";
  button.setAttribute("aria-label", "Back to top");
  button.addEventListener("click", () => {
    const tab = localStorage.getItem("activeTab") || "dashboard";
    if (tab === "chat") {
      const smooth = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      chatMessagesEl()?.scrollTo({ top: 0, behavior: smooth ? "smooth" : "auto" });
    } else {
      scrollPageToTop();
    }
    // Send focus somewhere sensible rather than leaving it on a button that
    // is about to hide itself.
    document.querySelector(".tab-page:not(.hidden)")?.focus();
  });
  document.body.appendChild(button);

  const update = () => {
    const tab = localStorage.getItem("activeTab") || "dashboard";
    const scrollTop =
      tab === "chat" ? chatMessagesEl()?.scrollTop || 0 : scrollingPage()?.scrollTop || 0;
    const show = scrollTop > 400 && !NO_SCROLL_TOP_TABS.has(tab);
    button.classList.toggle("visible", show);
  };
  // Capture, because scroll events do not bubble: the listener has to see them
  // on whichever .tab-page is currently the scroll container, and that changes
  // every time the user switches tab.
  document.addEventListener("scroll", update, { passive: true, capture: true });
  window.addEventListener("resize", update, { passive: true });
  update();
  return update;
}

const chatTabNode = document.getElementById("tab-chat");
if (chatTabNode) {
  new MutationObserver(() => {
    const btn = document.querySelector(".scroll-top");
    const dock = document.querySelector(".chat-dock");
    if (!btn || !dock) return;
    
    if (!chatTabNode.classList.contains("hidden")) {
      dock.appendChild(btn);
    } else {
      document.body.appendChild(btn);
    }
  }).observe(chatTabNode, { attributes: true, attributeFilter: ["class"] });
}

// --- what the AI remembers (ROADMAP §39B) ------------------------------------------
//
// The list `save_user_preference` writes into, and the only place the user can
// see it. Worth the screen: this tool's output becomes part of the model's own
// system prompt on every later turn, so without this the assistant's behaviour
// could change permanently for a reason nobody could look up, edit or undo.
//
// The budget line is not decoration. Only active preferences reach the model,
// newest first, and only until the character budget runs out — so a long list
// quietly stops including its oldest entries. Saying so beats letting someone
// wonder why the rule they saved first is being ignored.
async function renderMemorySettings() {
  const list = $("memory-list");
  const empty = $("memory-empty");
  const budget = $("memory-budget");
  if (!list) return;

  const data = await apiJson("/memory").catch(() => null);
  if (!data) {
    list.replaceChildren();
    budget.textContent = "Couldn't load what the AI has remembered.";
    return;
  }

  const active = data.preferences.filter((p) => p.active).length;
  budget.textContent = active
    ? `${active} in use, about ${data.in_prompt} of ${data.budget_chars} characters. ` +
      "The newest are kept when this runs out."
    : "";
  empty.classList.toggle("hidden", data.preferences.length > 0);

  list.replaceChildren(
    ...data.preferences.map((pref) => {
      const row = document.createElement("div");
      row.className = "memory-row" + (pref.active ? "" : " is-off");

      const text = document.createElement("span");
      text.className = "memory-text";
      text.textContent = pref.content;
      text.title = pref.created_at
        ? `Saved ${new Date(pref.created_at).toLocaleString()}`
        : "";

      const toggle = document.createElement("button");
      toggle.type = "button";
      toggle.className = "ghost small";
      toggle.textContent = pref.active ? "Turn off" : "Turn on";
      toggle.addEventListener("click", async () => {
        toggle.disabled = true;
        await apiJson(`/memory/${pref.id}`, {
          method: "PATCH",
          body: JSON.stringify({ active: !pref.active }),
        }).catch(() => {});
        renderMemorySettings();
      });

      const remove = document.createElement("button");
      remove.type = "button";
      remove.className = "ghost small danger";
      remove.textContent = "Forget";
      remove.addEventListener("click", async () => {
        const ok = await confirmDialog(
          `Forget this?\n\n“${pref.content}”\n\nThe AI will stop applying it.`,
          { confirmLabel: "Forget it" }
        );
        if (!ok) return;
        await apiJson(`/memory/${pref.id}`, { method: "DELETE" }).catch(() => {});
        renderMemorySettings();
      });

      row.append(text, toggle, remove);
      return row;
    })
  );
}

// --- settings modal (Wave A) ------------------------------------------------------

//: Every section id, and a new one is invisible until it is in this list —
//: `showSettingsSection` un-hides by iterating it, so a section left out is
//: rendered, in the DOM, and never shown. Found by driving it: the Extras
//: panel had five rows in it and a nav button that appeared to do nothing.
const SETTINGS_SECTIONS = ["models", "personas", "skills", "tools", "memory", "websearch", "appearance", "shortcuts", "preferences", "account", "extras", "tasks", "data", "logs", "help", "about"];

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

// --- textareas that grow with what you type -----------------------------------
// A fixed-height box for "capture a thought" or "magic add" hides everything
// but the last couple of lines the moment a note runs long, which is exactly
// when you most want to see it (user request). Height follows content, up to a
// cap so the page never gets pushed around; past that it scrolls.
const AUTOGROW_MAX_PX = 340;

// How much of the window a growing box may take before it scrolls instead.
//
// A flat 340px is most of a laptop window's chat area and nearly all of a
// phone's: the box kept growing and the conversation it was about disappeared
// above it. The cap is the *smaller* of the two, so a tall screen keeps the
// familiar 340 and a short one keeps its conversation.
const AUTOGROW_MAX_VIEWPORT = 0.35;

//: Where a hand-dragged composer height is remembered. A preference about how
//: you write, so it outlives the session that set it.
const COMPOSER_HEIGHT_KEY = "chat-composer-height";

function autoGrowLimit(el) {
  // A height the user dragged to wins over both defaults — they have said, in
  // the most direct way an interface allows, how tall they want this box.
  const chosen = Number(el.dataset.maxPx || 0);
  if (chosen > 0) return chosen;
  return Math.min(AUTOGROW_MAX_PX, Math.round(window.innerHeight * AUTOGROW_MAX_VIEWPORT));
}

function autoGrow(el) {
  if (!el) return;
  // Reset first: without it the height only ever ratchets upwards, because
  // scrollHeight is measured against the height already set.
  el.style.height = "auto";
  const limit = autoGrowLimit(el);
  // **A height somebody dragged to is a floor, not just a ceiling.** Driven in
  // a browser: dragging the composer taller stored the new height and then
  // snapped the box straight back to one line, because this took
  // `min(scrollHeight, limit)` and an empty box has a scrollHeight of one row.
  // The setting was saved and instantly undone — which is worse than not
  // offering the drag at all.
  //
  // So a hand-set height is the height. It is what "manually adjustable"
  // means: the box stays where it was put, and only scrolls once the text
  // outgrows it.
  const chosen = Number(el.dataset.maxPx || 0);
  const next = chosen > 0 ? chosen : Math.min(el.scrollHeight, limit);
  el.style.height = `${next}px`;
  el.style.overflowY = el.scrollHeight > next ? "auto" : "hidden";
  // What this function chose, so a later resize can be told apart from a drag
  // by the user — the two are indistinguishable to a ResizeObserver otherwise.
  el.dataset.autoHeight = String(next);
  fitComposerToDock(el);
}

//: A composer smaller than this is not a composer. The floor exists so a very
//: short window trims the box rather than erasing it — at that point the
//: conversation scrolls and the user can drag the window instead.
const MIN_COMPOSER_PX = 44;

// A hand-dragged composer height, trimmed to the room the chat card has.
//
// The drag is a preference and it is kept as one: `dataset.maxPx` and
// localStorage are **not** touched here. Only the applied height is trimmed,
// so a box dragged to 380px on a large monitor comes back to 380px the moment
// there is room for it again. Writing the trimmed value back would be the app
// quietly forgetting a setting because the window was small once.
//
// The measurement is the card's own overflow rather than any sum of the
// furniture above it. Every number this file has ever guessed at — a viewport
// fraction, a rem cap, the dock's height — has been wrong within two sessions,
// because the dock gains controls and the tab strip wraps. `scrollHeight -
// clientHeight` is the browser answering "by how much does this not fit",
// which needs no maintenance and is exact.
// It iterates because one subtraction does not converge. The conversation
// above the dock is `flex: 1 1 auto` with a floor, so some of the height the
// composer gives back is immediately taken by the message list growing into
// it — measured: a 56px trim cleared only 24px of a 88px overflow. Each pass
// is exact about what it can see, and three of them have been enough at every
// size driven so far; the cap is there so a layout that somehow oscillates
// costs four reflows rather than the frame.
const COMPOSER_FIT_PASSES = 4;

function fitComposerToDock(box) {
  if (!box || box.id !== "chat-input") return;
  const card = document.getElementById("chat-main");
  // Nothing to measure while the tab is hidden; switchTab re-runs this.
  if (!card || !card.getClientRects().length) return;
  for (let pass = 0; pass < COMPOSER_FIT_PASSES; pass += 1) {
    const overflow = Math.round(card.scrollHeight - card.clientHeight);
    if (overflow <= 0) return;
    const now = Math.round(box.getBoundingClientRect().height);
    const next = Math.max(MIN_COMPOSER_PX, now - overflow);
    if (next >= now) return; // already as small as it is allowed to be
    // Set before the style write: the ResizeObserver below reads this to
    // decide whether a height change was a drag, and a trim must never be
    // recorded as one — that is how a preference gets eaten.
    box.dataset.autoHeight = String(next);
    box.style.height = `${next}px`;
    box.style.overflowY = box.scrollHeight > next ? "auto" : "hidden";
  }
}

// The trim depends on the window, so it has to be redone when the window
// changes. Re-running `autoGrow` rather than `fitComposerToDock` alone is what
// lets the box grow *back* towards the dragged height when the window gets
// bigger: autoGrow re-applies the preference, and the fit trims it again only
// if it still does not fit.
function refitComposer() {
  const box = document.getElementById("chat-input");
  if (box) autoGrow(box);
}

// The chat composer can be dragged taller, and remembers it.
//
// Asked for directly: *"there should be a max height that the chat text bar
// can grow to before it gets a scrollbar. the height should also be manually
// adjustable."* Both halves — the cap above, and this.
//
// The native resize grabber does the dragging; all this has to do is notice
// the result and stop `autoGrow` from immediately undoing it on the next
// keystroke. A drag is told from a grow by comparing against the height
// autoGrow last set: anything else was a hand on the corner.
function initComposerResize() {
  const box = $("chat-input");
  if (!box || box.dataset.resizeReady) return;
  box.dataset.resizeReady = "1";

  const saved = Number(localStorage.getItem(COMPOSER_HEIGHT_KEY) || 0);
  if (saved > 0) {
    box.dataset.maxPx = String(saved);
    autoGrow(box);
  }

  if (typeof ResizeObserver !== "function") return;
  const observer = new ResizeObserver(() => {
    const height = Math.round(box.getBoundingClientRect().height);
    const automatic = Number(box.dataset.autoHeight || 0);
    // Two pixels of slack for sub-pixel layout; a drag is always more.
    if (!height || Math.abs(height - automatic) <= 2) return;
    box.dataset.maxPx = String(height);
    localStorage.setItem(COMPOSER_HEIGHT_KEY, String(height));
    // Re-run so overflow matches the new ceiling straight away rather than at
    // the next keystroke.
    autoGrow(box);
  });
  observer.observe(box);
}

function initAutoGrow() {
  for (const el of document.querySelectorAll("textarea.autogrow")) {
    if (el.dataset.autogrowReady) continue;
    el.dataset.autogrowReady = "1";
    el.addEventListener("input", () => autoGrow(el));
    // Also on programmatic changes — templates, the ⏰ button, a cleared form.
    el.addEventListener("focus", () => autoGrow(el));
    autoGrow(el);
  }
  initComposerResize();
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

// Which settings section is on screen. The Background tasks list polls while
// it is open, and needs to know that it is.
let currentSettingsSection = "models";

function showSettingsSection(name) {
  currentSettingsSection = name;
  for (const section of SETTINGS_SECTIONS) {
    $(`settings-${section}`).classList.toggle("hidden", section !== name);
  }
  for (const button of document.querySelectorAll("#settings-nav button")) {
    button.classList.toggle("active", button.dataset.section === name);
  }
  updatePeekAvailability(name);
  // The log stream is the only section that holds a connection open, so it is
  // the only one that has to be told it is no longer being looked at.
  if (name !== "logs") closeLogs();
  if (name === "logs") renderLogs();
  if (name === "preferences") renderPrefs().catch(() => {});
  if (name === "websearch") renderWebSearch().catch(() => {});
  if (name === "personas") renderPersonas().catch(() => {});
  if (name === "skills") renderSkillSettings();
  if (name === "tools") renderToolSettings();
  if (name === "memory") renderMemorySettings().catch(() => {});
  if (name === "tasks") renderAutonomousReview().catch(() => {});
  if (name === "appearance") renderAppearance();
  if (name === "shortcuts") renderShortcutList();
  if (name === "account") renderAccount().catch(() => {});
  if (name === "data") renderBackups();
  if (name === "tasks") renderTasks(); // fill it in now, then poll
  if (name === "extras") renderExtras();
}

// Peek fades the settings panel so a colour change is visible on the page
// behind it. Two details make it work: the fade is on the BACKGROUND via
// color-mix rather than element opacity (opacity would fade the swatches and
// controls too, making the thing you are judging harder to see), and it clears
// itself whenever the panel is closed or you leave Appearance — a settings
// panel left semi-transparent on the Logs screen just looks broken.
function setSettingsPeek(on) {
  const modal = $("settings-modal");
  const button = $("settings-peek");
  modal.classList.toggle("peeking", !!on);
  // A button that toggles has to *say* it is pressed — the class on the modal
  // is the visible half, and `aria-pressed` is the half a screen reader hears.
  if (button) {
    button.setAttribute("aria-pressed", String(!!on));
    button.classList.toggle("is-on", !!on);
  }
}

function settingsPeekIsOn() {
  return $("settings-modal").classList.contains("peeking");
}

function updatePeekAvailability(section) {
  const button = $("settings-peek");
  const appearance = section === "appearance";
  if (button) button.classList.toggle("hidden", !appearance);
  if (!appearance) setSettingsPeek(false);
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
  loadChangelog();
  refreshModelStatus();
}

// CHANGELOG.md, rendered in Settings → About (§36E). Loaded once per session
// and only when the settings panel is opened — it is several thousand words
// and nobody is waiting for it at startup.
let changelogLoaded = false;
async function loadChangelog() {
  if (changelogLoaded) return;
  const fold = $("changelog-fold");
  const body = $("changelog-body");
  if (!fold || !body) return;
  const data = await apiJson("/changelog", { silent: true }).catch(() => null);
  if (!data || !data.markdown) {
    // A packaged build may not ship the file. Hiding the control is better
    // than offering one that opens onto nothing.
    fold.classList.add("hidden");
    return;
  }
  changelogLoaded = true;
  fold.classList.remove("hidden");
  renderMarkdown(body, data.markdown);
}

// --- finding a setting (§36B) ------------------------------------------------------
//
// Fourteen sections, grouped three ways. The grouping helps, and it is only
// ever right for some people — "where do I turn off web search?" is a guess
// between The AI and System until you have learned the layout, and "where is
// the corner rounding?" is a guess even after you have.
//
// So the search looks inside each section's rendered text rather than only at
// its title. Typing "theme", "corner", "password" or "backup" then lands on
// the section that actually contains that word, which is the question people
// are really asking.
//
// Text is read live rather than indexed once: several sections are filled in
// by JS after their first paint (the model list, the tool catalog, the saved
// looks), and an index built at startup would be searching empty panels.
function settingsSectionText(section) {
  return (section.textContent || "").toLowerCase();
}

function filterSettings(term) {
  const query = term.trim().toLowerCase();
  const count = $("settings-search-count");
  const buttons = [...document.querySelectorAll("#settings-nav button[data-section]")];

  if (!query) {
    for (const button of buttons) button.classList.remove("hidden");
    for (const label of document.querySelectorAll("#settings-nav .nav-group-label")) {
      label.classList.remove("hidden");
    }
    count.classList.add("hidden");
    return;
  }

  let matches = 0;
  for (const button of buttons) {
    const section = $(`settings-${button.dataset.section}`);
    const hit =
      button.textContent.toLowerCase().includes(query) ||
      (section && settingsSectionText(section).includes(query));
    button.classList.toggle("hidden", !hit);
    if (hit) matches += 1;
  }
  // A group label with nothing under it is a heading for an empty list.
  for (const label of document.querySelectorAll("#settings-nav .nav-group-label")) {
    const group = label.nextElementSibling;
    const anyVisible =
      group && [...group.querySelectorAll("button")].some((b) => !b.classList.contains("hidden"));
    label.classList.toggle("hidden", !anyVisible);
  }

  count.classList.remove("hidden");
  count.textContent = matches
    ? `${matches} section${matches === 1 ? "" : "s"}`
    : "Nothing matches that";
  // One match is not ambiguous, so show it rather than making the user click
  // the single remaining button.
  if (matches === 1) {
    const only = buttons.find((b) => !b.classList.contains("hidden"));
    if (only) showSettingsSection(only.dataset.section);
  }
}

function closeSettingsModal() {
  const search = $("settings-search");
  if (search) {
    search.value = "";
    filterSettings("");
  }
  // Always cleared on the way out. A panel that reopens semi-transparent
  // reads as a rendering bug, not as a setting anyone chose.
  setSettingsPeek(false);
  $("settings-modal").classList.add("hidden");
  overlayReturnFocus?.focus?.();
  overlayReturnFocus = null;
}

// --- account & security ------------------------------------------------------------

async function renderAccount() {
  const facts = $("account-facts");
  facts.replaceChildren();
  const info = await apiJson("/auth/account").catch(() => null);
  if (!info) {
    const li = document.createElement("li");
    li.className = "muted";
    li.textContent = "Couldn't read the account state.";
    facts.appendChild(li);
    return;
  }
  const rows = [
    ["Password", info.configured ? "Set" : "Not set yet"],
    [
      "Created",
      info.created_at ? new Date(info.created_at).toLocaleDateString() : "—",
    ],
    [
      "Private notes",
      info.vault_exists
        ? info.vault_open
          ? "Encryption key loaded — private notes are readable"
          : "Locked — unlock to read private notes"
        : "No encrypted notes yet",
    ],
    ["Open sessions", String(info.active_sessions)],
  ];
  for (const [label, value] of rows) {
    const li = document.createElement("li");
    const name = document.createElement("strong");
    name.textContent = `${label}: `;
    li.append(name, document.createTextNode(value));
    facts.appendChild(li);
  }
}

async function changePassword() {
  const status = $("account-status");
  const current = $("account-current").value;
  const next = $("account-new").value;
  const confirmed = $("account-confirm").value;
  status.classList.remove("error");

  // Checked here as well as on the server, so a typo costs a moment rather
  // than a password you didn't mean to set.
  if (!current || !next) {
    status.classList.add("error");
    status.textContent = "Fill in your current and new password.";
    return;
  }
  if (next !== confirmed) {
    status.classList.add("error");
    status.textContent = "The two new passwords don't match.";
    return;
  }
  if (next.length < 4) {
    status.classList.add("error");
    status.textContent = "A password needs at least 4 characters.";
    return;
  }

  status.textContent = "Changing…";
  try {
    const result = await apiJson("/auth/change-password", {
      method: "POST",
      body: JSON.stringify({ current_password: current, new_password: next }),
      // A 401 here means "wrong current password", not "your session died".
      ownsAuthErrors: true,
    });
    // Changing the password invalidates every token, including this tab's.
    // The server hands back a fresh one so the change doesn't log you out of
    // the screen you just used to make it. Key must match authToken().
    localStorage.setItem("token", result.token);
    $("account-current").value = "";
    $("account-new").value = "";
    $("account-confirm").value = "";
    status.textContent = "Password changed.";
    toast(
      result.other_sessions_ended
        ? `Password changed. ${result.other_sessions_ended} other session(s) were signed out.`
        : "Password changed."
    );
    renderAccount().catch(() => {});
  } catch (error) {
    status.classList.add("error");
    status.textContent = error.message;
  }
}

// --- logs viewer (Wave A) ---------------------------------------------------------

// The ring buffer discards its oldest record silently once it is full, which
// makes a busy hour and a quiet one look identical: 200 rows either way, with
// no way to tell whether the top row is the start of the story or the middle.
// That is worst in exactly the case the viewer exists for — chasing something
// that keeps failing, where the repetition is what pushed the first occurrence
// out of the window.
// --- the log console (§1) -------------------------------------------------
//
// Asked for directly: this screen should read "like the terminal running in
// the background, with key errors flagged", not a list you refresh by hand.
//
// One array holds both sources so a single screen answers "what just
// happened". The server's records arrive on a stream; the browser's are
// already in memory. They are merged and sorted by time, because a browser
// error and the request that caused it are the same event seen from two ends,
// and reading them apart is what made this screen hard to use.

const LOG_LEVEL_RANK = { DEBUG: 0, LOG: 0, INFO: 1, WARN: 2, WARNING: 2, ERROR: 3, CRITICAL: 4 };
const MAX_LOG_ROWS = 1000; // what the list holds; the buffers themselves are smaller

let logRecords = [];
let logStreamAbort = null;
let logStreamCursor = 0;
let logStreamRetry = null;
let logFollowPinned = true; // false once the user scrolls up to read something
let logErrorsSinceOpened = 0;
let logScreenOpen = false;

function logLevelRank(level) {
  return LOG_LEVEL_RANK[String(level || "").toUpperCase()] ?? 1;
}

// The ring buffer discards its oldest record silently once it is full, which
// makes a busy hour and a quiet one look identical: the same rows either way,
// with no way to tell whether the top row is the start of the story or the
// middle. That is worst in exactly the case the viewer exists for — chasing
// something that keeps failing, where the repetition is what pushed the first
// occurrence out of the window.
function renderLogGap(stats) {
  const note = $("logs-dropped");
  if (!stats || !stats.dropped) {
    note.classList.add("hidden");
    note.textContent = "";
    return;
  }
  const since = stats.dropped_since
    ? ` The oldest record still kept is from ${new Date(stats.dropped_since).toLocaleTimeString()}.`
    : "";
  note.textContent =
    `${stats.dropped.toLocaleString()} earlier record${stats.dropped === 1 ? "" : "s"} ` +
    `dropped — this log keeps the most recent ${stats.capacity.toLocaleString()}.${since}`;
  note.classList.remove("hidden");
}

function browserLogRecords() {
  return browserLogs.map((r, index) => ({
    ...r,
    source: "browser",
    logger: r.logger || "browser",
    key: `b${index}-${r.time}`,
  }));
}

function serverLogRecord(record) {
  return { ...record, source: "server", key: `s${record.seq}` };
}

function sortLogRecords() {
  // Stable on equal timestamps, so records logged in the same millisecond keep
  // the order they arrived rather than shuffling on every repaint.
  logRecords.sort((a, b) => (a.time < b.time ? -1 : a.time > b.time ? 1 : 0));
  if (logRecords.length > MAX_LOG_ROWS) {
    logRecords = logRecords.slice(-MAX_LOG_ROWS);
  }
}

function logMatchesFilters(record) {
  if (!record) return false;
  const source = $("log-source").value;
  if (source !== "all" && record.source !== source) return false;

  const level = $("log-level").value;
  if (level === "warning" && logLevelRank(record.level) < 2) return false;
  if (level === "error" && logLevelRank(record.level) < 3) return false;

  const needle = $("log-filter").value.trim().toLowerCase();
  if (!needle) return true;
  return (
    String(record.message || "").toLowerCase().includes(needle) ||
    String(record.logger || "").toLowerCase().includes(needle)
  );
}

function logRow(record) {
  const li = document.createElement("li");
  const rank = logLevelRank(record.level);
  if (rank >= 3) li.classList.add("log-error");
  else if (rank === 2) li.classList.add("log-warn");

  const when = document.createElement("span");
  when.className = "when";
  when.textContent = new Date(record.time).toLocaleTimeString();

  const level = document.createElement("span");
  level.className = "what";
  level.textContent = record.level;

  // Which side of the app said it. Only worth showing in the merged view —
  // in a single-source view every row would carry the same tag.
  const line = document.createElement("span");
  line.className = "log-line";
  if ($("log-source").value === "all") {
    const tag = document.createElement("span");
    tag.className = `log-source-tag log-source-${record.source}`;
    tag.textContent = record.source === "browser" ? "browser" : "server";
    line.appendChild(tag);
  }
  const text = document.createElement("span");
  text.textContent = record.logger ? `${record.logger} — ${record.message}` : record.message;
  line.appendChild(text);

  // One record, copyable on its own. "Copy all" plus the filters can already
  // narrow to a single error, but that is a three-step answer to "send me that
  // error" — and hand-selecting a row whose traceback lives in its own
  // scrolling box is worse. This copies the record AND its traceback together,
  // which is the thing anyone actually wants to paste.
  const copy = document.createElement("button");
  copy.type = "button";
  copy.className = "log-copy ghost small";
  copy.textContent = "📋";
  copy.title = "Copy this record (with its traceback)";
  copy.setAttribute("aria-label", `Copy this ${record.level} record`);
  copy.addEventListener("click", async (event) => {
    event.stopPropagation(); // never toggles the fold it sits beside
    if (await copyToClipboard(logRecordText(record), copy)) toast("Record copied.");
  });

  li.append(when, level, line, copy);

  // A traceback is the difference between "something failed" and knowing
  // what. Folded, because it is many lines and most rows do not have one.
  if (record.trace) {
    const fold = document.createElement("details");
    fold.className = "log-trace";
    const summary = document.createElement("summary");
    summary.textContent = "Traceback";
    const pre = document.createElement("pre");
    pre.textContent = record.trace; // real newlines here — it is not a row
    const copyTrace = document.createElement("button");
    copyTrace.type = "button";
    copyTrace.className = "ghost small";
    copyTrace.textContent = "Copy traceback";
    copyTrace.addEventListener("click", async () => {
      if (await copyToClipboard(record.trace, copyTrace)) toast("Traceback copied.");
    });
    fold.append(summary, pre, copyTrace);
    li.appendChild(fold);
  }
  return li;
}

// One record as the text you would paste into a bug report. The source tag is
// always included here even though the row only shows it in the merged view —
// out of context, "which half of the app said this" is the first question.
function logRecordText(record) {
  const head =
    `${record.time} [${record.source}] ${record.level} ` +
    `${record.logger || ""} ${record.message}`.trimEnd();
  return record.trace ? `${head}\n${record.trace}` : head;
}

function nearLogBottom() {
  const list = $("log-list");
  // 40px of slack: "close enough to the bottom that you meant to be there".
  return list.scrollHeight - list.scrollTop - list.clientHeight < 40;
}

function scrollLogToBottom() {
  const list = $("log-list");
  list.scrollTop = list.scrollHeight;
}

function renderLogList() {
  const list = $("log-list");
  const shouldStick = $("log-follow").checked && logFollowPinned;
  const visible = logRecords.filter(logMatchesFilters);

  list.replaceChildren();
  for (const record of visible) list.appendChild(logRow(record));

  $("logs-empty").classList.toggle("hidden", logRecords.length > 0);
  // "Nothing matches" and "nothing happened" are different answers, and only
  // the first one is fixed by changing the filter.
  const hiddenCount = logRecords.length - visible.length;
  const filtered = $("logs-filtered-out");
  if (hiddenCount > 0) {
    filtered.textContent = `${hiddenCount.toLocaleString()} record${hiddenCount === 1 ? "" : "s"} hidden by the filters above.`;
    filtered.classList.remove("hidden");
  } else {
    filtered.classList.add("hidden");
  }
  renderCopyLogsLabel();
  if (shouldStick) scrollLogToBottom();
}

function setLogLive(state, detail) {
  const pill = $("log-live");
  pill.textContent = detail;
  pill.dataset.state = state;
}

// Errors that have arrived since the screen was last opened, shown on the nav
// item so a failure in the background is noticed without going looking.
function bumpLogErrorBadge(record) {
  if (logScreenOpen || logLevelRank(record.level) < 3) return;
  logErrorsSinceOpened += 1;
  renderLogErrorBadge();
}

function renderLogErrorBadge() {
  const link = document.querySelector('#settings-nav button[data-section="logs"]');
  if (!link) return;
  let badge = link.querySelector(".log-error-badge");
  if (!logErrorsSinceOpened) {
    badge?.remove();
    return;
  }
  if (!badge) {
    badge = document.createElement("span");
    badge.className = "log-error-badge";
    // Clicking the badge opens the Logs screen already filtered to errors.
    // Set synchronously so it is in place before renderLogs() draws — the
    // badge is the only place a failure announces itself, so it should also
    // be the shortest way to the failure itself.
    badge.addEventListener("click", () => {
      $("log-source").value = "all";
      $("log-level").value = "error";
      $("log-filter").value = "";
    });
    link.appendChild(badge);
  }
  badge.textContent = logErrorsSinceOpened > 99 ? "99+" : String(logErrorsSinceOpened);
  badge.title = `${logErrorsSinceOpened} error${logErrorsSinceOpened === 1 ? "" : "s"} since you last looked at the logs — click to show just those`;
}

// NDJSON over fetch rather than an EventSource, for one blunt reason:
// EventSource cannot set request headers, and this app authenticates with
// X-Auth-Token. The usual workaround is to put the token in the query string,
// which would write it into the very log this stream is serving.
async function startLogStream() {
  stopLogStream();
  const controller = new AbortController();
  logStreamAbort = controller;
  setLogLive("connecting", "connecting…");
  try {
    const response = await fetch(`/logs/stream?after=${logStreamCursor}`, {
      headers: { "X-Auth-Token": localStorage.getItem("token") || "" },
      signal: controller.signal,
    });
    if (!response.ok || !response.body) throw new Error(`stream failed (${response.status})`);
    setLogLive("live", "● live");
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffered = "";
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffered += decoder.decode(value, { stream: true });
      const lines = buffered.split("\n");
      buffered = lines.pop();
      for (const line of lines) {
        if (!line.trim()) continue;
        let event;
        try {
          event = JSON.parse(line);
        } catch {
          continue; // a torn line is not worth dropping the stream over
        }
        if (event.type === "open") {
          logStreamCursor = Math.max(logStreamCursor, event.cursor || 0);
        } else if (event.type === "record") {
          logStreamCursor = event.record.seq || logStreamCursor;
          logRecords.push(serverLogRecord(event.record));
          bumpLogErrorBadge(event.record);
          sortLogRecords();
          if (logScreenOpen) renderLogList();
        } else if (event.type === "ping") {
          logStreamCursor = event.cursor || logStreamCursor;
        } else if (event.type === "reconnect") {
          break; // the server handed back; reconnect below picks up the cursor
        }
      }
    }
  } catch (error) {
    if (controller.signal.aborted) return; // we closed it on purpose
    setLogLive("offline", "reconnecting…");
  }
  if (controller.signal.aborted) return;
  // Reconnect while the screen is open. The cursor means the gap is closed on
  // the way back rather than left as a hole in the middle of the log.
  if (logScreenOpen) {
    logStreamRetry = setTimeout(startLogStream, 2000);
  } else {
    setLogLive("paused", "paused");
  }
}

function stopLogStream() {
  if (logStreamRetry) {
    clearTimeout(logStreamRetry);
    logStreamRetry = null;
  }
  if (logStreamAbort) {
    logStreamAbort.abort();
    logStreamAbort = null;
  }
}

async function renderLogs() {
  logScreenOpen = true;
  logErrorsSinceOpened = 0;
  renderLogErrorBadge();

  const [records, stats] = await Promise.all([
    apiJson("/logs?limit=500").catch(() => []),
    apiJson("/logs/stats?limit=500").catch(() => null),
  ]);
  logStreamCursor = records.length ? records[records.length - 1].seq || 0 : 0;
  logRecords = [...records.map(serverLogRecord), ...browserLogRecords()];
  sortLogRecords();
  renderLogGap(stats);
  renderLogList();
  scrollLogToBottom();
  logFollowPinned = true;
  startLogStream();
}

// Leaving the screen closes the connection. A stream held open by a tab
// nobody is looking at is the kind of thing that is invisible until it is a
// hundred of them.
function closeLogs() {
  logScreenOpen = false;
  stopLogStream();
  // Said here rather than left to the stream's own exit path: a deliberate
  // abort returns early from there, so the pill would still read "● live"
  // with nothing behind it — a status that lies is worse than none.
  setLogLive("paused", "paused");
}

async function copyLogs() {
  const url = noteSearch 
      ? `/entries?q=${encodeURIComponent(noteSearch)}&semantic=${$("semantic-search-toggle")?.checked || false}` 
      : "/entries";
    const response = await fetch(url);
  const shown = logRecords.filter(logMatchesFilters);
  if (!shown.length) {
    toast("Nothing to copy — the filters above are hiding every record.", true);
    return;
  }
  const text = shown.map(logRecordText).join("\n");
  if (await copyToClipboard(text)) {
    toast(`Copied ${shown.length} record${shown.length === 1 ? "" : "s"}.`);
  }
}

// The button copies what is ON SCREEN, not the whole buffer, so it has to say
// which. "Copy all" while a filter hides 400 records is a promise it does not
// keep — and the reader would not find out until they pasted it.
function renderCopyLogsLabel() {
  const button = $("logs-copy");
  if (!button) return;
  const shown = logRecords.filter(logMatchesFilters).length;
  const filtering = shown !== logRecords.length;
  button.textContent = filtering ? `Copy ${shown} shown` : "Copy all";
  button.title = filtering
    ? "Copies only the records the filters are showing"
    : "Copies every record in this list, tracebacks included";
}

// Jump straight from "something failed while I was elsewhere" to the failures
// themselves. The badge is the only place an error announces itself, so it
// should also be the way to reach one.
function showOnlyLogErrors() {
  $("log-source").value = "all";
  $("log-level").value = "error";
  $("log-filter").value = "";
  renderLogList();
}

async function clearLogs() {
  const source = $("log-source").value;
  if (source !== "browser") {
    await api("/logs", { method: "DELETE" }).catch(() => {});
  }
  if (source !== "server") {
    browserLogs.length = 0;
  }
  logRecords = [];
  await renderLogs();
}

// The bundle is built server-side and downloaded straight to disk. Nothing is
// transmitted anywhere — that is the whole difference between this and the
// crash reporting the roadmap turned down.
async function downloadSupportBundle() {
  const button = $("logs-bundle");
  button.disabled = true;
  const original = button.textContent;
  button.textContent = "Collecting…";
  try {
    const response = await fetch("/support-bundle", {
      headers: { "X-Auth-Token": localStorage.getItem("token") || "" },
    });
    if (!response.ok) throw new Error(`Couldn't build the bundle (${response.status})`);
    await saveFile("memorymap-support-bundle.zip", await response.blob());
    toast("Support bundle saved. Have a look inside before you send it.");
  } catch (error) {
    toast(error.message || "Couldn't build the support bundle.", true);
  } finally {
    button.disabled = false;
    button.textContent = original;
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
  $("prefs-status").textContent = "";
}

// --- Settings → Web search ------------------------------------------------------
//
// Its own screen, and its own save. Web search used to be four controls inside
// Preferences, which is why every error message that said "Settings → Web
// search" pointed at a screen that did not exist.
//
// The engine list comes from the server rather than being written out here:
// the frontend and `websearch.PROVIDERS` would otherwise drift, and the first
// symptom would be a radio button the API rejects.
async function renderWebSearch() {
  prefsCache = await apiJson("/preferences");
  $("pref-web-search").checked = Boolean(prefsCache.web_search_enabled);
  $("pref-searxng").value = prefsCache.searxng_url || "";
  $("pref-autonomous-tasks").checked = Boolean(prefsCache.autonomous_tasks_enabled);
  $("pref-auto-tag").checked = prefsCache.auto_tag_enabled ?? true;
  $("pref-auto-link").checked = prefsCache.auto_link_enabled ?? true;
  $("pref-auto-dedupe").checked = prefsCache.auto_dedupe_enabled ?? true;
  $("pref-autonomous-interval").value = prefsCache.autonomous_tasks_interval_hours || 6;
  $("pref-autonomous-model").value = prefsCache.autonomous_tasks_model || "";
  $("pref-battery-mode").checked = Boolean(prefsCache.battery_efficient_mode);
  $("pref-smart-model-routing").checked = prefsCache.smart_model_routing_enabled ?? true;
  toggleAutonomousPanel();
  $("searxng-autostart").checked = Boolean(prefsCache.searxng_autostart);
  $("search-provider-status").textContent = "";

  const picker = $("search-provider-picker");
  picker.replaceChildren();
  const info = await apiJson("/websearch/providers").catch(() => null);
  if (!info) {
    picker.textContent = "Couldn't load the engine list.";
    return;
  }
  for (const provider of info.providers) {
    const row = document.createElement("label");
    row.className = "provider-option";
    const radio = document.createElement("input");
    radio.type = "radio";
    radio.name = "search-provider";
    radio.value = provider.id;
    radio.checked = provider.id === info.selected;
    radio.addEventListener("change", () => saveSearchProvider(provider.id));
    const text = document.createElement("span");
    const title = document.createElement("strong");
    title.textContent = provider.label;
    const detail = document.createElement("span");
    detail.className = "muted";
    detail.textContent = provider.detail;
    text.append(title, document.createElement("br"), detail);
    row.append(radio, text);
    picker.appendChild(row);
  }
  refreshSearxngHost().catch(() => {});
}

async function saveSearchProvider(provider) {
  const status = $("search-provider-status");
  try {
    prefsCache = await apiJson("/preferences", {
      method: "PUT",
      body: JSON.stringify({ search_provider: provider }),
    });
    status.classList.remove("error");
    status.textContent = "Saved.";
  } catch (error) {
    status.classList.add("error");
    status.textContent = error.message;
  }
}

async function saveWebSearchSettings() {
  const status = $("search-provider-status");
  try {
    prefsCache = await apiJson("/preferences", {
      method: "PUT",
      body: JSON.stringify({
        web_search_enabled: $("pref-web-search").checked,
        searxng_url: $("pref-searxng").value.trim(),
      }),
    });
    status.classList.remove("error");
    status.textContent = "Saved.";
  } catch (error) {
    status.classList.add("error");
    status.textContent = error.message;
  }
}

//: Which checkbox in Settings mirrors which one elsewhere in the app. Two
//: controls for one preference is a reasonable convenience and a reliable way
//: to get them out of step; this is the list that keeps them honest.
const MIRRORED_PREFS = {
  autonomous_tasks_enabled: ["pref-autonomous-tasks", "skills-auto-toggle"],
  auto_tag_enabled: ["pref-auto-tag", "skills-auto-tag"],
  auto_link_enabled: ["pref-auto-link", "skills-auto-link"],
};

// Save one preference without rebuilding the whole object from the DOM.
//
// `savePrefs` reads every control on the Preferences screen and PUTs the lot,
// which is fine when that screen is what you are looking at and wrong when it
// is not: a control on another panel that saved directly left `prefsCache`
// stale, and the next `savePrefs` overwrote it from a checkbox nobody had
// touched. Anything outside the Preferences form should come through here.
async function setPreference(key, value) {
  try {
    prefsCache = await apiJson("/preferences", {
      method: "PUT",
      body: JSON.stringify({ [key]: value }),
    });
    for (const id of MIRRORED_PREFS[key] || []) {
      const box = $(id);
      if (box && box.checked !== value) box.checked = value;
    }
    if (key === "autonomous_tasks_enabled") {
      $("autonomous-settings-panel")?.classList.toggle("hidden", !value);
    }
  } catch (error) {
    toast(error.message || "Couldn't save that setting.", true);
  }
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
        autonomous_tasks_enabled: $("pref-autonomous-tasks").checked,
        auto_tag_enabled: $("pref-auto-tag").checked,
        auto_link_enabled: $("pref-auto-link").checked,
        auto_dedupe_enabled: $("pref-auto-dedupe").checked,
        autonomous_tasks_interval_hours: Number($("pref-autonomous-interval").value) || 6,
        autonomous_tasks_model: $("pref-autonomous-model").value.trim(),
        battery_efficient_mode: $("pref-battery-mode").checked,
        smart_model_routing_enabled: $("pref-smart-model-routing").checked,
      }),
    });
    $("prefs-status").textContent = "Saved.";
    
    const indicator = $("power-saver-indicator");
    if (indicator) {
      if ($("pref-battery-mode").checked) {
        indicator.classList.remove("hidden");
      } else {
        indicator.classList.add("hidden");
      }
    }
    
    // Reflect a name change immediately if the dashboard is showing.
    if (typeof renderDashboardGreeting === "function") renderDashboardGreeting();
  } catch (error) {
    $("prefs-status").textContent = error.message;
  }
}

async function deleteProfile() {
  if (!(await confirmDialog("Delete your profile text? The AI will stop personalising answers."))) return;
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
  // Markdown arrives as a zip of .md files; the rest are single files.
  const name =
    kind === "markdown" ? "memorymap-markdown.zip" : `memorymap-export.${kind}`;
  await saveFile(name, await response.blob());
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
          !(await confirmDialog(
            "Restore this backup? Your current notebook is snapshotted first, " +
              "then replaced by the backup."
          ))
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
        if (!(await confirmDialog("Delete this backup file?"))) return;
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

// §37G: a document (PDF/Word/slide deck) becomes one or more notes, via the
// markitdown extra — the same "Import" pattern as importMarkdown above, one
// file at a time rather than several, since a document commonly becomes
// several notes on its own (one per chapter or slide).
async function importDocument() {
  const input = $("import-document-file");
  const status = $("import-document-status");
  const file = input.files[0];
  if (!file) {
    status.textContent = "Choose a file first.";
    return;
  }
  const form = new FormData();
  form.append("file", file);
  try {
    const response = await fetch("/import/document", {
      method: "POST",
      headers: { "X-Auth-Token": authToken() }, // browser sets the multipart type
      body: form,
    });
    if (!response.ok) {
      const detail = await response.json().catch(() => ({}));
      throw new Error(detail.detail || `Import failed (${response.status})`);
    }
    const result = await response.json();
    status.textContent =
      `Imported ${result.imported} note${result.imported === 1 ? "" : "s"}` +
      ` from ${result.filename}.` +
      (result.truncated ? " (Stopped at the note limit — the rest wasn't imported.)" : "");
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
        // It's a sub-tab now, so select it rather than unfolding a card.
        showNotesSection("writing-room");
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
    { label: "⚡️ Settings → Skills", run: () => openSettingsModal("skills") },
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

let sketchPen = { color: "#3b82f6", size: 4, eraser: false };
let sketchDrawing = false;
let sketchDirty = false;
let sketchTool = "pen"; // "pen", "rect", "circ", "arrow", "text"
let sketchHistory = [];
let sketchRedoStack = [];
let sketchStartX = 0;
let sketchStartY = 0;

function sketchSaveSnapshot() {
  const canvas = $("sketch-canvas");
  const ctx = canvas.getContext("2d");
  sketchHistory.push(ctx.getImageData(0, 0, canvas.width, canvas.height));
  if (sketchHistory.length > 30) sketchHistory.shift();
  sketchRedoStack = [];
}

// §37G: an image the user brought in to annotate over — an `ImageBitmap`, or
// null for a blank page. Lives on its own layer (`#sketch-bg-canvas`) below
// the pen strokes (`#sketch-canvas`), so Clear and the eraser can affect the
// strokes without touching it.
let sketchBackgroundImage = null;

function sketchContext() {
  return $("sketch-canvas").getContext("2d");
}

// Redraws the background layer from scratch: white, then the uploaded image
// (if any) scaled to fit inside the canvas without cropping or stretching.
// Called after every change to `sketchBackgroundImage`, rather than patched
// in place, because "fit inside and centre" isn't otherwise idempotent.
function sketchDrawBackground() {
  const canvas = $("sketch-bg-canvas");
  const context = canvas.getContext("2d");
  context.fillStyle = "#ffffff"; // a white page in both themes
  context.fillRect(0, 0, canvas.width, canvas.height);
  const img = sketchBackgroundImage;
  if (!img) return;
  const scale = Math.min(canvas.width / img.width, canvas.height / img.height);
  const w = img.width * scale;
  const h = img.height * scale;
  context.drawImage(img, (canvas.width - w) / 2, (canvas.height - h) / 2, w, h);
}

function openSketch() {
  overlayReturnFocus = document.activeElement;
  $("sketch-overlay").classList.remove("hidden");
  $("sketch-close").focus();
  sketchBackgroundImage = null;
  sketchDrawBackground();
  const canvas = $("sketch-canvas");
  canvas.getContext("2d").clearRect(0, 0, canvas.width, canvas.height);
  sketchDirty = false;
  sketchHistory = [];
  sketchRedoStack = [];
  sketchTool = "pen";
  $("sketch-status").textContent = "";
}

async function sketchUploadImage(file) {
  if (!file) return;
  const status = $("sketch-status");
  try {
    sketchBackgroundImage = await createImageBitmap(file);
    sketchDrawBackground();
    sketchDirty = true; // an image is as much a change as a pen stroke
    status.textContent = "";
  } catch {
    status.textContent = "Couldn't load that image.";
  }
}

async function closeSketch() {
  if (sketchDirty && !(await confirmDialog("Close without saving your sketch?"))) return;
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

let sketchMoved = false;

function sketchStart(event) {
  sketchDrawing = true;
  sketchDirty = true;
  sketchMoved = false;
  const { x, y } = sketchPointer(event);
  sketchStartX = x;
  sketchStartY = y;
  
  if (sketchTool === "text") {
    const text = prompt("Enter text:");
    if (text) {
      sketchSaveSnapshot();
      const context = sketchContext();
      context.font = `${sketchPen.size * 6}px sans-serif`;
      context.fillStyle = sketchPen.color;
      context.fillText(text, x, y);
    }
    sketchDrawing = false;
    return;
  }

  sketchSaveSnapshot();
  const context = sketchContext();
  if (sketchTool === "pen" || sketchTool === "highlighter") {
    context.beginPath();
    context.moveTo(x, y);
  }
  event.target.setPointerCapture(event.pointerId);
}

function sketchMove(event) {
  if (!sketchDrawing) return;
  const { x, y } = sketchPointer(event);
  const context = sketchContext();
  if (x === sketchStartX && y === sketchStartY) return;
  sketchMoved = true;
  
  if (sketchTool !== "pen" && sketchTool !== "highlighter") {
    const last = sketchHistory[sketchHistory.length - 1];
    if (last) context.putImageData(last, 0, 0);
    else context.clearRect(0, 0, context.canvas.width, context.canvas.height);
  }

  context.lineCap = sketchTool === "highlighter" ? "square" : "round";
  context.lineJoin = sketchTool === "highlighter" ? "bevel" : "round";
  context.globalCompositeOperation = sketchPen.eraser && sketchTool === "pen" ? "destination-out" : (sketchTool === "highlighter" ? "multiply" : "source-over");
  context.globalAlpha = sketchTool === "highlighter" ? 0.05 : 1.0;
  context.strokeStyle = sketchPen.color;
  context.lineWidth = sketchTool === "highlighter" ? sketchPen.size * 6 : (sketchPen.eraser && sketchTool === "pen" ? sketchPen.size * 4 : sketchPen.size);

  if (sketchTool === "pen" || sketchTool === "highlighter") {
    context.lineTo(x, y);
    context.stroke();
  } else if (sketchTool === "line") {
    context.beginPath();
    context.moveTo(sketchStartX, sketchStartY);
    context.lineTo(x, y);
    context.stroke();
  } else if (sketchTool === "rect") {
    context.beginPath();
    context.rect(sketchStartX, sketchStartY, x - sketchStartX, y - sketchStartY);
    context.stroke();
  } else if (sketchTool === "circ") {
    context.beginPath();
    const r = Math.sqrt(Math.pow(x - sketchStartX, 2) + Math.pow(y - sketchStartY, 2));
    context.arc(sketchStartX, sketchStartY, r, 0, 2 * Math.PI);
    context.stroke();
  } else if (sketchTool === "arrow") {
    context.beginPath();
    context.moveTo(sketchStartX, sketchStartY);
    context.lineTo(x, y);
    context.stroke();
    const angle = Math.atan2(y - sketchStartY, x - sketchStartX);
    const headLen = sketchPen.size * 3 + 5;
    context.beginPath();
    context.moveTo(x, y);
    context.lineTo(x - headLen * Math.cos(angle - Math.PI / 6), y - headLen * Math.sin(angle - Math.PI / 6));
    context.moveTo(x, y);
    context.lineTo(x - headLen * Math.cos(angle + Math.PI / 6), y - headLen * Math.sin(angle + Math.PI / 6));
    context.stroke();
  }
}

function sketchEnd(event) {
  if (sketchDrawing && !sketchMoved && event && (event.type === "pointerup" || event.type === "click")) {
    const context = sketchContext();
    context.lineCap = sketchTool === "highlighter" ? "square" : "round";
    context.lineJoin = sketchTool === "highlighter" ? "bevel" : "round";
    context.globalCompositeOperation = sketchPen.eraser && sketchTool === "pen" ? "destination-out" : (sketchTool === "highlighter" ? "multiply" : "source-over");
    context.globalAlpha = sketchTool === "highlighter" ? 0.05 : 1.0;
    context.strokeStyle = sketchPen.color;
    
    if (sketchTool === "pen" || sketchTool === "highlighter") {
      context.lineWidth = sketchTool === "highlighter" ? sketchPen.size * 6 : (sketchPen.eraser && sketchTool === "pen" ? sketchPen.size * 4 : sketchPen.size);
      context.beginPath();
      context.moveTo(sketchStartX, sketchStartY);
      context.lineTo(sketchStartX, sketchStartY + 0.1);
      context.stroke();
    } else if (sketchTool === "rect") {
      context.lineWidth = sketchPen.size;
      context.beginPath();
      const s = sketchPen.size * 10 + 20;
      context.rect(sketchStartX - s/2, sketchStartY - s/2, s, s);
      context.stroke();
    } else if (sketchTool === "circ") {
      context.lineWidth = sketchPen.size;
      context.beginPath();
      const r = sketchPen.size * 5 + 10;
      context.arc(sketchStartX, sketchStartY, r, 0, 2 * Math.PI);
      context.stroke();
    } else if (sketchTool === "arrow") {
      context.lineWidth = sketchPen.size;
      const len = sketchPen.size * 10 + 20;
      context.beginPath();
      context.moveTo(sketchStartX - len/2, sketchStartY);
      context.lineTo(sketchStartX + len/2, sketchStartY);
      context.stroke();
      const headLen = sketchPen.size * 3 + 5;
      context.beginPath();
      context.moveTo(sketchStartX + len/2, sketchStartY);
      context.lineTo(sketchStartX + len/2 - headLen * Math.cos(Math.PI / 6), sketchStartY - headLen * Math.sin(Math.PI / 6));
      context.moveTo(sketchStartX + len/2, sketchStartY);
      context.lineTo(sketchStartX + len/2 - headLen * Math.cos(-Math.PI / 6), sketchStartY - headLen * Math.sin(-Math.PI / 6));
      context.stroke();
    }
  }
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
    // Strokes and any uploaded image live on separate canvases (§37G); the
    // saved PNG has to be both together, composited onto a throwaway canvas
    // rather than either layer alone.
    const composite = document.createElement("canvas");
    composite.width = $("sketch-canvas").width;
    composite.height = $("sketch-canvas").height;
    const compositeContext = composite.getContext("2d");
    compositeContext.drawImage($("sketch-bg-canvas"), 0, 0);
    compositeContext.drawImage($("sketch-canvas"), 0, 0);
    const blob = await new Promise((resolve) => composite.toBlob(resolve, "image/png"));
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

// --- meeting notes (§17) -------------------------------------------------------------
//
// The backlog's own "highest-value single addition still unbuilt": the quick
// 🎙 button above is sized for a spoken note (server caps it at 25MB,
// `routes_voice.py`'s own comment says "a spoken note, not a podcast") — a
// meeting or a lecture needs a separate flow with its own recording cap, a
// visible elapsed timer so a long recording doesn't feel stalled, and a
// review step before the transcript becomes a note, the same "you're in
// control before it's saved" shape the persona-peek and compression-summary
// features already use elsewhere.
//
// Action-item extraction (the other half of §17's ask, "extract action items
// into reminders") is deliberately not built here. It needs a real model
// call this sandbox cannot exercise — faster-whisper itself is not installed
// here either, so even the transcription step is untested past its request
// shape — and guessing at that prompt's behaviour without a way to check it
// is exactly what CLAUDE.md's standing caveat warns against. Recording it as
// open rather than quietly shipping an unverified guess.

let meetingRecorder = null;
let meetingStream = null;
let meetingChunks = [];
let meetingTimerHandle = null;
let meetingStartedAt = 0;

function meetingElapsedText() {
  const seconds = Math.max(0, Math.round((Date.now() - meetingStartedAt) / 1000));
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function stopMeetingTimer() {
  if (meetingTimerHandle) clearInterval(meetingTimerHandle);
  meetingTimerHandle = null;
}

// Resets the overlay to "ready to record", whether it's opening fresh or
// coming back after a discard — the same state either way.
function resetMeetingUI() {
  $("meeting-timer").textContent = "0:00";
  $("meeting-status").textContent = "";
  $("meeting-status").classList.remove("error");
  $("meeting-transcript").value = "";
  $("meeting-transcript").classList.add("hidden");
  $("meeting-save-row").classList.add("hidden");
  $("meeting-record").disabled = false;
  $("meeting-record").classList.remove("recording");
  $("meeting-record").textContent = "⏺ Record";
}

async function openMeetingRecorder() {
  overlayReturnFocus = document.activeElement;
  resetMeetingUI();
  $("meeting-overlay").classList.remove("hidden");
  $("meeting-record").focus();
}

// Recording is stopped (discarded, not transcribed) rather than left running
// in the background — a MediaRecorder with no owner is a live microphone
// nobody is looking at.
function closeMeetingRecorder() {
  if (meetingRecorder && meetingRecorder.state !== "inactive") {
    meetingRecorder.onstop = null; // don't also try to transcribe a discard
    meetingRecorder.stop();
  }
  meetingStream?.getTracks().forEach((t) => t.stop());
  meetingRecorder = null;
  meetingStream = null;
  stopMeetingTimer();
  $("meeting-overlay").classList.add("hidden");
  overlayReturnFocus?.focus?.();
  overlayReturnFocus = null;
}

async function toggleMeetingRecording() {
  const button = $("meeting-record");
  if (meetingRecorder) {
    button.disabled = true; // one press, not a double-fire while it stops
    meetingRecorder.stop();
    return;
  }
  if (voiceStatus === null) {
    voiceStatus = await apiJson("/voice/status").catch(() => ({ available: false }));
  }
  if (!voiceStatus.available) {
    $("meeting-status").textContent = voiceStatus.hint || "Voice capture isn't available.";
    $("meeting-status").classList.add("error");
    return;
  }
  try {
    meetingStream = await navigator.mediaDevices.getUserMedia({ audio: true });
  } catch {
    $("meeting-status").textContent = "Microphone access was blocked — allow it in your browser.";
    $("meeting-status").classList.add("error");
    return;
  }
  meetingChunks = [];
  meetingRecorder = new MediaRecorder(meetingStream);
  meetingRecorder.addEventListener("dataavailable", (e) => meetingChunks.push(e.data));
  meetingRecorder.addEventListener("stop", async () => {
    meetingStream?.getTracks().forEach((t) => t.stop());
    meetingStream = null;
    meetingRecorder = null;
    stopMeetingTimer();
    button.classList.remove("recording");
    button.textContent = "⏺ Record";
    button.disabled = false;
    const blob = new Blob(meetingChunks, { type: meetingChunks[0]?.type || "audio/webm" });
    const form = new FormData();
    form.append("file", blob, "meeting.webm");
    $("meeting-status").classList.remove("error");
    $("meeting-status").textContent =
      "Transcribing… a long recording can take a while on CPU.";
    try {
      const response = await fetch("/voice/transcribe-meeting", {
        method: "POST",
        headers: { "X-Auth-Token": authToken() },
        body: form,
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.detail || "Transcription failed");
      $("meeting-status").textContent = "Transcribed — review it below before saving.";
      $("meeting-transcript").value = body.text;
      $("meeting-transcript").classList.remove("hidden");
      $("meeting-save-row").classList.remove("hidden");
      $("meeting-transcript").focus();
    } catch (error) {
      $("meeting-status").textContent = error.message;
      $("meeting-status").classList.add("error");
    }
  });
  meetingRecorder.start();
  meetingStartedAt = Date.now();
  $("meeting-timer").textContent = meetingElapsedText();
  meetingTimerHandle = setInterval(() => {
    $("meeting-timer").textContent = meetingElapsedText();
  }, 1000);
  button.classList.add("recording");
  button.textContent = "⏹ Stop";
  $("meeting-status").textContent = "";
  $("meeting-status").classList.remove("error");
}

async function saveMeetingNote() {
  const content = $("meeting-transcript").value.trim();
  if (!content) return;
  const status = $("meeting-status");
  const button = $("meeting-save");
  button.disabled = true;
  status.classList.remove("error");
  status.textContent = "Filing…";
  try {
    // Tagged, not force-categorised: filing still goes through the same
    // AI-or-keyword pipeline as any other capture (routes_entries.py), so a
    // meeting about a specific project lands there rather than in a generic
    // "Meetings" bucket regardless of what it was actually about. The tag is
    // what makes every meeting findable as a class either way.
    const saved = await apiJson("/entries", {
      method: "POST",
      body: JSON.stringify({ content, tags: ["meeting"] }),
    });
    toast(filedByText(saved));
    await loadEntries();
    // The overlay is about to close, so this jumps straight to the note
    // rather than leaving an "offer" button behind in a dialog nobody is
    // looking at anymore (`offerJumpToNewNote`'s pattern, used from the
    // Capture tab you're still sitting on) — `flashEntry` handles its own
    // navigation to Notes → Browse.
    closeMeetingRecorder();
    flashEntry(saved.id);
  } catch (error) {
    status.textContent = error.message;
    status.classList.add("error");
  } finally {
    button.disabled = false;
  }
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

// --- reminders you actually notice (§36C) ------------------------------------------
//
// Reported: "reminders when they go off aren't really noticeable and need to be
// more evident, maybe through a browser or system/app notification?"
//
// The reason they were unnoticeable is simpler than it sounds: **nothing
// checked.** A reminder's only surface was a small badge on the Reminders tab
// button, painted by `updateReminderBadge` — which only ran when something
// happened to call `loadReminders()`. So unless you reloaded, or visited that
// tab, a reminder came due and the interface said nothing at all, forever.
//
// Three surfaces now, in increasing order of how much they interrupt:
//   · the tab badge, as before;
//   · a count in the document title, which is visible from another tab or a
//     taskbar without the app being focused;
//   · a system notification and a toast, once per reminder.
//
// The honest limit, stated because the alternative is implying otherwise:
// none of this fires while the app is closed. A local-first app with no
// background service cannot wake itself up, and pretending it can would be
// worse than the gap.

const REMINDER_POLL_MS = 30_000;
//: Which reminders have already been announced, so a 30-second poll does not
//: re-fire the same notification twice a minute. Kept in localStorage rather
//: than memory: a reload would otherwise re-announce everything overdue, which
//: is the most annoying possible version of this feature.
const ANNOUNCED_KEY = "announcedReminders";

function announcedReminders() {
  try {
    return new Set(JSON.parse(localStorage.getItem(ANNOUNCED_KEY) || "[]"));
  } catch {
    return new Set();
  }
}

function rememberAnnounced(ids) {
  // Bounded, and trimmed from the front: without a cap this grows forever in a
  // notebook that has been used for years.
  const kept = [...announcedReminders(), ...ids].slice(-200);
  localStorage.setItem(ANNOUNCED_KEY, JSON.stringify(kept));
}

// --- the notifications centre (§36E) ----------------------------------------
//
// MemoryMap already *produces* all of these events — a reminder comes due, a
// background task finishes, a skill run stalls — and shows each of them in its
// own way: a system notification, a toast, a status pill, a step timeline.
// Every one of those is a moment. Miss the moment and the event is gone.
//
// This is the place they persist after their moment has passed, which is the
// whole of what §36E asks for. Three things it is deliberately *not*:
//
// - **Not a second source of truth.** A fired reminder is still a row in the
//   reminders table; this records that it was announced, and the panel folds
//   in whatever is *currently* overdue from the server when it opens. So a
//   reminder that came due while the app was closed is not lost, even though
//   nothing was running to record it — which is the one case a purely
//   event-driven log cannot cover.
// - **Not persisted to the server.** These are ephemeral by nature and there
//   can be many of them; the notebook's preferences file is not a log.
// - **Not a promise that anything fires while the app is shut.** A local-first
//   app with no background service cannot do that, and §36C says so plainly
//   rather than implying otherwise.

const NOTIFICATIONS_KEY = "notifications";
const NOTIFICATIONS_READ_KEY = "notificationsReadAt";
//: Enough to answer "what did I miss?" and not enough to become a log file.
const MAX_NOTIFICATIONS = 50;

function storedNotifications() {
  try {
    const raw = JSON.parse(localStorage.getItem(NOTIFICATIONS_KEY) || "[]");
    return Array.isArray(raw) ? raw : [];
  } catch {
    return []; // hand-edited or truncated storage costs the history, not the app
  }
}

// Record something worth remembering. `key` de-duplicates: the reminder poll
// runs every thirty seconds and must not add the same fired reminder twice.
function recordNotification({ kind, title, detail = "", key = "", action = null }) {
  const items = storedNotifications();
  const id = key || `${kind}:${title}:${Date.now()}`;
  if (key && items.some((n) => n.id === id)) return;
  items.push({ id, kind, title, detail, at: Date.now(), action });
  localStorage.setItem(
    NOTIFICATIONS_KEY,
    JSON.stringify(items.slice(-MAX_NOTIFICATIONS))
  );
  renderNotificationBadge();
}

function notificationsReadAt() {
  return Number(localStorage.getItem(NOTIFICATIONS_READ_KEY) || 0);
}

function unreadNotifications() {
  const since = notificationsReadAt();
  return storedNotifications().filter((n) => n.at > since);
}

function renderNotificationBadge() {
  const button = $("notif-btn");
  if (!button) return;
  const count = unreadNotifications().length;
  button.dataset.count = count > 9 ? "9+" : String(count || "");
  button.classList.toggle("has-unread", count > 0);
  button.setAttribute(
    "aria-label",
    count ? `Notifications — ${count} unread` : "Notifications"
  );
}

//: Which icon a kind gets. Colour alone is never the signal (DESIGN.md), and
//: these read as a list of *kinds* rather than a list of times.
const NOTIFICATION_ICONS = {
  reminder: "⏰",
  task: "⚙",
  run: "⚡️",
  error: "⚠️",
  info: "•",
};

async function openNotifications() {
  const panel = $("notif-panel");
  const list = $("notif-list");
  panel.classList.remove("hidden");

  // Fold in anything currently overdue on the server. This is what makes the
  // centre honest about time it was not running for: the event log can only
  // know what happened while a tab was open, and the reminders table knows
  // what is due regardless.
  const all = await apiJson("/reminders", { silent: true }).catch(() => null);
  for (const reminder of all || []) {
    if (reminder.done) continue;
    if (new Date(reminder.due_at).getTime() > Date.now()) continue;
    recordNotification({
      kind: "reminder",
      title: reminder.text,
      detail: `Due ${relativeTime(reminder.due_at)}`,
      key: `reminder:${reminder.id}`,
      action: { tab: "reminders" },
    });
  }

  const items = storedNotifications().slice().reverse();
  const readAt = notificationsReadAt();
  list.replaceChildren();
  if (!items.length) {
    const empty = document.createElement("li");
    empty.className = "muted";
    empty.textContent =
      "Nothing yet. Reminders that come due, finished background jobs and " +
      "runs that stopped early will collect here.";
    list.appendChild(empty);
  }
  for (const item of items) {
    const row = document.createElement("li");
    row.className = "notif-row";
    if (item.at > readAt) row.classList.add("notif-unread");

    const icon = document.createElement("span");
    icon.className = "notif-icon";
    icon.textContent = NOTIFICATION_ICONS[item.kind] || NOTIFICATION_ICONS.info;
    icon.setAttribute("aria-hidden", "true");

    const body = document.createElement("div");
    body.className = "notif-body";
    const title = document.createElement("div");
    title.className = "notif-title";
    title.textContent = item.title;
    const meta = document.createElement("div");
    meta.className = "notif-meta muted";
    meta.textContent = [item.detail, relativeTime(new Date(item.at).toISOString())]
      .filter(Boolean)
      .join(" · ");
    body.append(title, meta);
    row.append(icon, body);

    // A notification you cannot act on is a notification you learn to ignore.
    if (item.action && item.action.tab) {
      row.classList.add("notif-actionable");
      row.tabIndex = 0;
      row.title = "Open";
      const go = () => {
        closeNotifications();
        switchTab(item.action.tab);
      };
      row.addEventListener("click", go);
      row.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          go();
        }
      });
    }
    list.appendChild(row);
  }

  // Opening the panel *is* reading them. Marked after rendering, so the
  // unread ones are still highlighted in the list you are looking at.
  localStorage.setItem(NOTIFICATIONS_READ_KEY, String(Date.now()));
  renderNotificationBadge();
}

function closeNotifications() {
  $("notif-panel").classList.add("hidden");
}

// Asked when a reminder is SET, not on first load. A permission prompt with no
// context is refused by default, and a refusal is close to permanent — the
// browser will not ask again, and most people never find the site settings.
function askNotificationPermission() {
  if ("Notification" in window && Notification.permission === "default") {
    Notification.requestPermission().catch(() => {});
  }
}

function notify(title, body) {
  if ("Notification" in window && Notification.permission === "granted") {
    try {
      new Notification(title, { body, icon: "/favicon.svg", tag: "memorymap" });
      return true;
    } catch {
      // Some embedded shells expose the constructor and then throw. Falling
      // through to the toast is the point of returning a boolean.
    }
  }
  return false;
}

// The count in the title bar — the one surface that works while the app is in
// a background tab, which is where it usually is when a reminder comes due.
const BASE_TITLE = "MemoryMap AI";
function setTitleCount(count) {
  document.title = count > 0 ? `(${count}) ${BASE_TITLE}` : BASE_TITLE;
}

async function checkDueReminders() {
  // Before the unlock there is no token, and asking anyway is a guaranteed 401
  // on every load — visible in the browser's network log, and in the server's
  // own log, where it looks like an auth failure worth investigating.
  if (!authToken()) return;
  const all = await apiJson("/reminders", { silent: true }).catch(() => null);
  if (!all) return; // server asleep or locked — say nothing rather than guess
  const now = Date.now();
  const due = all.filter((r) => !r.done && new Date(r.due_at).getTime() <= now);
  updateReminderBadge(all);
  setTitleCount(due.length);

  const already = announcedReminders();
  const fresh = due.filter((r) => !already.has(r.id));
  if (!fresh.length) return;
  rememberAnnounced(fresh.map((r) => r.id));

  // Into the centre as well as onto the screen (§36E). A toast and a system
  // notification are both moments; this is the record that outlives them, and
  // it is the difference between "I think something was due" and knowing what.
  for (const reminder of fresh) {
    recordNotification({
      kind: "reminder",
      title: reminder.text,
      detail: "Came due",
      key: `reminder:${reminder.id}`,
      action: { tab: "reminders" },
    });
  }

  // One notification for one reminder; a summary for several, because three
  // separate system notifications for three reminders is worse than one.
  if (fresh.length === 1) {
    const text = fresh[0].text;
    if (!notify("⏰ Reminder", text)) toast(`⏰ ${text}`);
  } else {
    const summary = `${fresh.length} reminders are due`;
    if (!notify("⏰ MemoryMap", summary)) toast(`⏰ ${summary}`);
  }
  // Always in-app as well as out: a system notification can be suppressed by
  // Do Not Disturb without the app ever knowing.
  if ("Notification" in window && Notification.permission === "granted") {
    toast(fresh.length === 1 ? `⏰ ${fresh[0].text}` : `⏰ ${fresh.length} reminders are due`);
  }
  loadReminders().catch(() => {});
}

function startReminderWatch() {
  checkDueReminders();
  setInterval(checkDueReminders, REMINDER_POLL_MS);
  // A machine that was asleep wakes up with reminders long past due, and the
  // interval will not have run. Checking on focus catches that immediately
  // rather than up to thirty seconds later.
  window.addEventListener("focus", () => checkDueReminders());
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) checkDueReminders();
  });
}

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
// Has the status endpoint ever answered? "We haven't asked yet" and "we asked
// and got nothing" are both `modelStatus === null`, but they mean opposite
// things to the user: the first is normal for the first second of every
// startup, the second is a fault. Without this the indicator flashed red on
// every single page load before settling.
let statusEverAnswered = false;
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
    statusEverAnswered = true;
  } catch {
    modelStatus = null; // locked or unreachable — pill shows the worst case
  }
  renderAiPill();
  syncAiOnlyControls();
  // The status bar's job slot rides this loop rather than starting one of its
  // own, so it inherits the whole cadence: one second while something is
  // running, twenty when idle, two minutes behind a hidden tab.
  await refreshBackgroundTasks();
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

// What the AI is doing, as one decision.
//
// Three levels, and the boundary between them is deliberate. This app is built
// to degrade gracefully, so "no AI at all" is a supported way to run it, not a
// fault — it is amber, not red. Red is reserved for something that is actually
// broken: a model that failed to load, or a server we can't reach. Colouring a
// normal offline setup red would train the user to ignore the indicator.
//
//   idle  … grey    haven't heard back yet — says nothing either way
//   ok    ✓ green   everything the AI can do is available
//   warn  ! amber   loading, switched off, or partly available — app works
//   error ✕ red     something is broken and won't fix itself
function aiStatusState() {
  if (!modelStatus) {
    // The first poll of every page load lands here for a moment. Reporting
    // that as a fault would flash red on every startup and teach the user
    // that red means nothing — so an unanswered *first* request is its own
    // quiet state, and only a request that has failed after we have already
    // had an answer counts as the server going away.
    if (!statusEverAnswered) {
      return {
        level: "idle",
        title: "Checking…",
        detail: "Asking the app what the AI is doing. This takes a moment.",
      };
    }
    return {
      level: "error",
      title: "Can't reach MemoryMap",
      detail:
        "The app can't read its own status, which usually means the server " +
        "stopped. Your notes are safe on disk.",
    };
  }
  const chatReady = modelStatus.ollama_running;
  const searchReady = modelStatus.embedding_ready;

  if (modelStatus.reindex && modelStatus.reindex.status === "running") {
    return {
      level: "warn",
      title: "Rebuilding the search index",
      detail:
        "Searching by word works while this runs. Searching by meaning comes " +
        "back when it finishes.",
    };
  }
  if (!searchReady && modelStatus.embedding_warming) {
    return {
      level: "warn",
      title: "Search AI is warming up",
      detail:
        "Searching by word works now. Searching by meaning becomes available " +
        "once the model has loaded.",
    };
  }
  if (!searchReady && modelStatus.embedding_error) {
    // "Broken" and "still loading" looked identical before: the old pill said
    // "warming up…" forever when the model had actually failed.
    return {
      level: "error",
      title: "Search AI didn't load",
      detail:
        `${modelStatus.embedding_error}\n\nSearching by word still works, and ` +
        "notes, tags, reminders and the graph are unaffected. Settings → Logs " +
        "has the details.",
    };
  }
  if (chatReady && searchReady) {
    return {
      level: "ok",
      title: "AI ready",
      detail: "Chat, auto-filing and search by meaning are all available.",
    };
  }
  // Everything below leads with what still WORKS. Announcing a fault and
  // pointing at a log reads as "the app is broken" when in fact only the
  // optional half is missing.
  if (!chatReady && searchReady) {
    return {
      level: "warn",
      title: "Everything works · chat AI off",
      detail:
        "Notes, search, tags, reminders and the graph all work. Start Ollama " +
        "to add chat and auto-filing.",
    };
  }
  if (chatReady && !searchReady) {
    return {
      level: "warn",
      title: "Word search on · AI search warming",
      detail:
        "Searching by word works now; searching by meaning becomes available " +
        "once the embedding model has loaded.",
    };
  }
  return {
    level: "warn",
    title: "Everything works · AI off",
    detail:
      "Writing, searching, tagging, reminders, documents and the graph all " +
      "work without any AI. Start Ollama to add chat, auto-filing and search " +
      "by meaning.",
  };
}

// The glyph is not decoration. Colour alone fails for the ~8% of men with a
// colour vision deficiency, and fails everyone in high-contrast mode — so the
// shape carries the same meaning the colour does.
// "…" for connecting rather than a spinner: a spinner has to be animated to
// read as one, and under prefers-reduced-motion a frozen spinner looks like a
// rendering fault. The ellipsis says "waiting" while perfectly still.
const AI_STATUS_GLYPH = { idle: "…", ok: "✓", warn: "!", error: "✕" };

function renderAiPill() {
  const button = $("ai-status");
  if (!button) return;
  const state = aiStatusState();
  button.dataset.level = state.level;
  button.querySelector(".ai-status-dot").textContent = AI_STATUS_GLYPH[state.level];
  // The button's own name for screen readers and for the native tooltip, so
  // the information is reachable without opening anything.
  const summary = `AI status: ${state.title}`;
  $("ai-status-label").textContent = summary;
  // button.title = `${state.title}\n\n${state.detail}`;
  $("ai-status-title").textContent = state.title;
  $("ai-status-detail").textContent = state.detail;
}

// --- the Library (§4, §36F) ---------------------------------------------------
//
// The one surface for finding something you made before. It **replaces** the
// Documents tab's list and the chat sidebar's list rather than joining them —
// a library that duplicates two lists that already exist is a third place to
// look, which is worse than no library. The tab bar is the same length it was.
//
// A library is for *finding*, which is a different job from the Notes tab's
// "work with what I have", so it is built differently: bigger units, more
// metadata per unit, and sort and filter at the top as controls rather than at
// the side as an afterthought.
//
// The list itself is assembled by the server (GET /library) — see
// routes_library.py for why. Filtering and sorting are **not**: they have to
// feel instant as you type, so the client owns them and holds the whole list.

//: The last payload from GET /library, so typing in the search box re-filters
//: what is already here instead of asking the server on every keystroke.
let libraryItems = [];
let libraryCounts = {};
let libraryOverview = {};
let libraryKind = "all";

//: Order matters: it is the order of the chips. "All" first because it is the
//: default and the one you come back to, then by how often you would reach for
//: the kind — a document is something you sat down to write, a binned note is
//: something you threw away.
const LIBRARY_KINDS = [
  { key: "all", icon: "📚", label: "Everything" },
  { key: "note", icon: "📝", label: "Notes" },
  { key: "document", icon: "📄", label: "Documents" },
  { key: "chat", icon: "💬", label: "Chats" },
  { key: "file", icon: "📎", label: "Files" },
  { key: "tag", icon: "🏷", label: "Tags" },
  { key: "archived", icon: "🗑", label: "Bin" },
  { key: "activity", icon: "📜", label: "Activity" },
];

//: The overview strip. Each tile is a *state worth knowing*, and each one goes
//: somewhere — the same test the status bar had to pass, for the same reason:
//: a number you cannot act on is decoration, and a management screen made of
//: decoration is a dashboard nobody opens twice.
const LIBRARY_OVERVIEW_TILES = [
  { key: "notes", icon: "📝", label: "notes", kind: "note" },
  { key: "documents", icon: "📄", label: "documents", kind: "document" },
  { key: "chats", icon: "💬", label: "chats", kind: "chat" },
  { key: "tags", icon: "🏷", label: "tags", kind: "tag" },
  { key: "binned", icon: "🗑", label: "in the bin", kind: "archived" },
];

//: What is ticked. Ids alone would collide — a tag's id 3 and a note's id 3 are
//: different things — so the key is kind + id, and it survives a re-render
//: because it is not read off the DOM.
let librarySelection = new Set();

const LIBRARY_VIEW_KEY = "libraryView";

function libraryView() {
  return localStorage.getItem(LIBRARY_VIEW_KEY) === "list" ? "list" : "grid";
}

function libraryKeyOf(item) {
  return `${item.kind}:${item.id}`;
}

function renderLibraryView() {
  const current = libraryView();
  for (const button of document.querySelectorAll("#library-view button")) {
    const active = button.dataset.libraryView === current;
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", String(active));
  }
}

async function loadLibrary() {
  const body = await apiJson("/library").catch(() => null);
  libraryItems = (body && body.items) || [];
  libraryCounts = (body && body.counts) || {};
  libraryOverview = (body && body.overview) || {};
  // A selection that survives a reload is a selection that can act on
  // something already deleted. Cleared here rather than merged, because the
  // safe half of "delete nine things" is knowing exactly which nine.
  librarySelection = new Set();
  renderLibraryOverview();
  renderLibraryFilters();
  renderLibraryView();
  renderLibrary();
}

function renderLibraryOverview() {
  const box = $("library-overview");
  if (!box) return;
  box.replaceChildren();
  for (const tile of LIBRARY_OVERVIEW_TILES) {
    const value = libraryOverview[tile.key] || 0;
    const button = document.createElement("button");
    button.type = "button";
    button.className = "library-stat" + (libraryKind === tile.kind ? " active" : "");
    const icon = document.createElement("span");
    icon.className = "library-stat-icon";
    icon.textContent = tile.icon;
    icon.setAttribute("aria-hidden", "true");
    const number = document.createElement("strong");
    number.className = "library-stat-value";
    number.textContent = value;
    const label = document.createElement("span");
    label.className = "library-stat-label";
    label.textContent = tile.label;
    button.append(icon, number, label);
    button.title = `Show ${tile.label}`;
    // Every tile is a filter. That is what stops it being decoration.
    button.addEventListener("click", () => {
      libraryKind = tile.kind;
      if (tile.kind === "archived") $("library-show-binned").checked = true;
      renderLibraryOverview();
      renderLibraryFilters();
      renderLibrary();
    });
    box.appendChild(button);
  }
  // One line of plain prose about the things that are not counts: how much
  // disk the attachments take, and how much writing is in the documents.
  const note = document.createElement("p");
  note.className = "muted library-overview-note";
  const parts = [];
  if (libraryOverview.attachment_bytes) {
    parts.push(`${libraryOverview.attachment_size} of attachments`);
  }
  if (libraryOverview.words) parts.push(`${libraryOverview.words.toLocaleString()} words written`);
  if (libraryOverview.private_notes) {
    parts.push(`${libraryOverview.private_notes} private (locked, never previewed here)`);
  }
  note.textContent = parts.length
    ? parts.join(" · ")
    : "Everything you make — notes, documents, chats, files — is managed from here.";
  box.appendChild(note);
}

function renderLibraryFilters() {
  const box = $("library-filters");
  if (!box) return;
  box.replaceChildren();
  for (const kind of LIBRARY_KINDS) {
    const count =
      kind.key === "all" ? libraryItems.length : libraryCounts[kind.key] || 0;
    const button = document.createElement("button");
    button.type = "button";
    button.className =
      "library-chip" + (libraryKind === kind.key ? " active" : "");
    button.setAttribute("aria-pressed", String(libraryKind === kind.key));
    const icon = document.createElement("span");
    icon.textContent = kind.icon;
    icon.setAttribute("aria-hidden", "true");
    const label = document.createElement("span");
    label.textContent = kind.label;
    // The count is on the chip, not discovered by pressing it. A filter you
    // have to try before you learn it is empty is a filter that wastes a click
    // every time — and with five of them that is most of the toolbar.
    const badge = document.createElement("span");
    badge.className = "library-chip-count";
    badge.textContent = count;
    button.append(icon, label, badge);
    button.addEventListener("click", () => {
      libraryKind = kind.key;
      renderLibraryFilters();
      renderLibrary();
    });
    box.appendChild(button);
  }
}

function librarySorted(items) {
  const sort = $("library-sort")?.value || "recent";
  const copy = [...items];
  if (sort === "az") {
    copy.sort((a, b) => a.title.localeCompare(b.title, undefined, { sensitivity: "base" }));
  } else if (sort === "biggest") {
    // Within a kind this is words, turns or bytes; across a mixed list it is
    // whichever of those each card is showing. Deliberately not normalised —
    // a number that made a document's words comparable with an image's bytes
    // would sort cleanly and mean nothing.
    copy.sort((a, b) => (b.size || 0) - (a.size || 0));
  } else {
    copy.sort((a, b) => {
      const cmp = String(a.updated_at).localeCompare(String(b.updated_at));
      return sort === "oldest" ? cmp : -cmp;
    });
  }
  return copy;
}

function renderLibrary() {
  const grid = $("library-grid");
  if (!grid) return;
  const query = ($("library-search")?.value || "").trim().toLowerCase();
  let items = libraryItems;
  if (libraryKind !== "all") items = items.filter((i) => i.kind === libraryKind);
  else {
    // Two kinds stay out of the mixed list. Deleted things are not part of
    // "everything you have made" — they are things you decided you had not —
    // and the Include-bin toggle is how you ask for them anyway.
    //
    // **Activity is out unconditionally, and that is not a toggle worth
    // offering.** Measured on a small notebook: 164 activity rows against 13
    // things, so "Everything" was 93% log. A log is a record *about* the
    // notebook rather than a thing in it, and burying twelve documents under
    // it would make the default view useless in exactly the way a management
    // screen must not be. Its own chip shows it in full.
    items = items.filter((i) => i.kind !== "activity");
    if (!$("library-show-binned")?.checked) {
      items = items.filter((i) => i.kind !== "archived");
    }
  }
  if (query) {
    // Title *and* preview, for the same reason the conversation search reads
    // message text: you remember what a thing was about far more often than
    // what it ended up being called.
    items = items.filter(
      (i) =>
        (i.title || "").toLowerCase().includes(query) ||
        (i.preview || "").toLowerCase().includes(query)
    );
  }
  items = librarySorted(items);

  const updateDOM = () => {
    grid.replaceChildren();
    grid.classList.toggle("library-list", libraryView() === "list");
    for (const item of items) grid.appendChild(libraryCard(item));
    renderLibraryContextBars();

    const empty = $("library-empty");
    empty.classList.toggle("hidden", items.length > 0);
    if (!items.length) {
      empty.textContent = !libraryItems.length
        ? "Nothing here yet. Write a document, start a chat, or attach a file to a note."
        : query
          ? `Nothing matching “${$("library-search").value.trim()}”.`
          : "Nothing of this kind yet.";
    }
  };

  // Premium UI: Use native View Transitions for buttery smooth layout animations
  if (!document.startViewTransition) {
    updateDOM();
  } else {
    document.startViewTransition(() => updateDOM());
  }
}

// What you can do to a thing without leaving the surface you found it on. A
// library that could only *show* you a document would send you to the Documents
// page to rename it and to the bin panel to restore a note — which is the
// scatter it was built to end.
//
// One ⋯ per card rather than a row of icons, the same choice the note cards
// and the chat list already make: three buttons on a card this size is most of
// the card, and the actions are things you do occasionally to a thing you are
// mostly here to open.
function libraryActions(item) {
  const reload = () => loadLibrary();
  if (item.kind === "chat") {
    return [
      makeMenuItem(
        item.pinned ? "📌 Unpin" : "📌 Pin",
        item.pinned ? "Let this chat sort by date again" : "Keep this chat at the top",
        async () => {
          await apiJson(`/conversations/${item.id}/pin`, {
            method: "PUT",
            body: JSON.stringify({ pinned: !item.pinned }),
          }).catch((e) => toast(e.message, true));
          reload();
        }
      ),
      makeMenuItem("✎ Rename", "Rename this chat", async () => {
        const next = await promptDialog("Rename this chat:", item.title);
        if (!next) return;
        await apiJson(`/conversations/${item.id}`, {
          method: "PUT",
          body: JSON.stringify({ title: next }),
        }).catch((e) => toast(e.message, true));
        reload();
        loadConversationList();
      }),
      makeMenuItem("🗑 Delete", "Delete this chat", async () => {
        if (!(await confirmDialog("Delete this saved chat?"))) return;
        await apiJson(`/conversations/${item.id}`, { method: "DELETE" }).catch((e) =>
          toast(e.message, true)
        );
        if (chatConv && chatConv.id === item.id) newChatConversation();
        reload();
        loadConversationList();
      }),
    ];
  }
  if (item.kind === "document") {
    return [
      makeMenuItem("✎ Rename", "Rename this document", async () => {
        const next = await promptDialog("Rename this document:", item.title);
        if (!next) return;
        await apiJson(`/documents/${item.id}`, {
          method: "PUT",
          body: JSON.stringify({ title: next }),
        }).catch((e) => toast(e.message, true));
        reload();
      }),
      makeMenuItem("⬇ Download .md", "Save a copy as a markdown file", () => {
        window.open(`/documents/${item.id}/export.md`, "_blank");
      }),
      makeMenuItem("🗑 Delete", "Delete this document", async () => {
        if (!(await confirmDialog(`Delete “${item.title}”? This cannot be undone.`))) return;
        await apiJson(`/documents/${item.id}`, { method: "DELETE" }).catch((e) =>
          toast(e.message, true)
        );
        reload();
      }),
    ];
  }
  if (item.kind === "archived") {
    return [
      makeMenuItem("↩ Restore", "Put this note back in your notebook", async () => {
        await apiJson(`/entries/${item.id}/restore`, { method: "POST" }).catch((e) =>
          toast(e.message, true)
        );
        toast("Restored.");
        reload();
        loadEntries();
      }),
      // The bin's other half. Without it the Library can show you a binned
      // note and take you back to the old panel to get rid of it, which is the
      // two-places problem the move was for.
      makeMenuItem("🗑 Delete for good", "Permanently delete this note", async () => {
        if (!(await confirmDialog("Delete this note permanently?\n\nThis cannot be undone."))) return;
        await apiJson(`/entries/${item.id}/purge`, { method: "DELETE" }).catch((e) =>
          toast(e.message, true)
        );
        reload();
      }),
    ];
  }
  if (item.kind === "note") {
    return [
      makeMenuItem("↗ Open in Notes", "Show this note in the list", () => flashEntry(item.id)),
      makeMenuItem("🗑 Move to bin", "Bin this note — recoverable", async () => {
        await apiJson(`/entries/${item.id}`, { method: "DELETE" }).catch((e) =>
          toast(e.message, true)
        );
        toast("Moved to the bin.");
        reload();
        loadEntries();
      }),
    ];
  }
  if (item.kind === "tag") {
    return [
      makeMenuItem("✎ Rename", "Rename this tag everywhere (merge if it exists)", async () => {
        const next = await promptDialog(`Rename tag “${item.title}” to:`, item.title);
        if (!next || next === item.title) return;
        const result = await apiJson("/tags/rename", {
          method: "POST",
          body: JSON.stringify({ old: item.title, new: next }),
        }).catch((e) => {
          toast(e.message, true);
          return null;
        });
        if (result) toast(`Renamed on ${result.changed} note${result.changed === 1 ? "" : "s"}.`);
        reload();
        loadEntries();
      }),
      makeMenuItem("🗑 Remove everywhere", "Take this tag off every note", async () => {
        if (!(await confirmDialog(`Remove the tag “${item.title}” from every note?\n\nThe notes are untouched.`))) return;
        await apiJson("/tags/delete", {
          method: "POST",
          body: JSON.stringify({ name: item.title }),
        }).catch((e) => toast(e.message, true));
        reload();
        loadEntries();
      }),
    ];
  }
  // An activity row is a record of something that already happened. There is
  // nothing to do to it, so it gets no menu at all rather than an empty one.
  if (item.kind === "activity") return [];
  return [
    makeMenuItem("⬇ Download", "Save this file", () => {
      window.open(`/files/${item.id}`, "_blank");
    }),
  ];
}

// The two strips that only appear when they have something to say.
function renderLibraryContextBars() {
  // The bin's own controls, where the bin now is. "Empty now" used to live in
  // a panel behind a sidebar button; a Bin filter you can look at but not
  // empty is half a move, and half a move leaves the user with two places.
  const binBar = $("library-binbar");
  const showingBin = libraryKind === "archived";
  binBar.classList.toggle("hidden", !showingBin);
  if (showingBin) {
    const count = libraryCounts.archived || 0;
    // "Kept for N days" came down from the deleted #bin-panel, which is the
    // one thing it said that this bar did not. It is the difference between a
    // bin you can trust to clear itself and one you assume you have to empty.
    const days = prefsCache ? prefsCache.recycle_bin_days : 30;
    $("library-bin-note").textContent = count
      ? `${count} note${count === 1 ? "" : "s"} in the bin, kept for ${days} days ` +
        "then cleared automatically. Open one to read it, or use its ⋯ menu."
      : `The bin is empty. Deleted notes are kept here for ${days} days ` +
        "(change that in Preferences) before they clear.";
    $("library-bin-empty").disabled = !count;
  }

  const bar = $("library-selectbar");
  const chosen = [...librarySelection];
  bar.classList.toggle("hidden", chosen.length === 0);
  if (!chosen.length) return;
  $("library-selected-count").textContent =
    `${chosen.length} selected`;
  // Restore only makes sense for binned notes, and offering it for a document
  // is offering a button that cannot work.
  const allBinned = chosen.every((key) => key.startsWith("archived:"));
  $("library-bulk-restore").classList.toggle("hidden", !allBinned);
}

function librarySelectedItems() {
  return libraryItems.filter((item) => librarySelection.has(libraryKeyOf(item)));
}

function toggleLibrarySelection(item, on) {
  const key = libraryKeyOf(item);
  if (on) librarySelection.add(key);
  else librarySelection.delete(key);
  renderLibraryContextBars();
}

function libraryCard(item) {
  // An `<article>` rather than a `<button>`: the card carries its own ⋯ menu,
  // and a button inside a button is invalid markup that browsers resolve by
  // dropping one of them. The click, the keyboard and the role are all here
  // explicitly instead, which is what the button element was giving us.
  const card = document.createElement("article");
  card.className =
    `library-card library-${item.kind}` + (item.private ? " library-private" : "");
  card.tabIndex = 0;
  card.setAttribute("role", "button");
  const meta = LIBRARY_KINDS.find((k) => k.key === item.kind);

  // A thumbnail where there is one to show. A grid of picture files that shows
  // the word "PNG" seven times is a list pretending to be a gallery — and this
  // is the one kind whose content *is* what it looks like.
  if (item.kind === "file" && (item.mime || "").startsWith("image/")) {
    const thumb = document.createElement("img");
    thumb.className = "library-card-thumb";
    thumb.src = `/files/${item.id}`;
    thumb.alt = "";
    thumb.loading = "lazy";
    // A file whose bytes have gone leaves a broken-image glyph, which reads as
    // a bug in the Library rather than as a missing file.
    thumb.addEventListener("error", () => thumb.remove());
    card.appendChild(thumb);
  }

  const top = document.createElement("div");
  top.className = "library-card-top";
  // Tick to select. Only for the kinds a bulk action can actually do something
  // to — an activity row is a record of the past and a tag is not a file, so
  // offering either a checkbox would be offering a Delete that does nothing.
  if (item.kind !== "activity" && item.kind !== "tag") {
    const tick = document.createElement("input");
    tick.type = "checkbox";
    tick.className = "library-card-tick";
    tick.checked = librarySelection.has(libraryKeyOf(item));
    tick.setAttribute("aria-label", `Select ${item.title}`);
    tick.addEventListener("click", (event) => event.stopPropagation());
    tick.addEventListener("change", () => toggleLibrarySelection(item, tick.checked));
    top.appendChild(tick);
  }
  const icon = document.createElement("span");
  icon.className = "library-card-icon";
  icon.textContent = meta ? meta.icon : "•";
  if (meta && meta.label) {
    icon.setAttribute("role", "img");
    icon.setAttribute("aria-label", meta.label);
  } else {
    icon.setAttribute("aria-hidden", "true");
  }
  const title = document.createElement("strong");
  title.className = "library-card-title";
  // A note's title is its first line, so it carries the note's own markup too.
  // Everything else has a real title and renders as plain text through the
  // same call, which is harmless.
  renderInlineMarkdown(title, item.title, []);
  top.append(icon, title);
  if (item.pinned) {
    const pin = document.createElement("span");
    pin.textContent = "📌";
    pin.title = "Pinned";
    top.appendChild(pin);
  }
  card.appendChild(top);

  // A chat's title *is* its first question, so its preview would be the same
  // sentence again one line down and one shade greyer — a card that looks like
  // a bug rather than one with more metadata on it.
  //
  // **But "starts with the title" was the wrong test**, and it is what was
  // behind "I can't see a lot of the response in the cards": a *note's* title
  // is the first 60 characters of the note, so every note card matched and
  // every note card lost its preview entirely — leaving 60 characters of a
  // 420-character card. The question is not whether the preview begins with
  // the title, it is whether it goes on to say anything more.
  const bare = item.title.replace(/…$/, "").trim();
  const sameAsTitle =
    item.preview &&
    bare &&
    item.preview.startsWith(bare) &&
    item.preview.trim().length <= bare.length + 1;
  if (item.preview && !sameAsTitle) {
    const preview = document.createElement("p");
    preview.className = "library-card-preview";
    // Inline markdown, the same renderer the note list uses (§22): a note
    // written with **bold** and `code` in it was showing its asterisks and
    // backticks here, which is the Library rendering the *source* of a note
    // while every other surface renders the note. Inline only — block elements
    // would turn a card into a document, which is what the clamp is for.
    renderInlineMarkdown(preview, item.preview, []);
    card.appendChild(preview);
  }

  const foot = document.createElement("div");
  foot.className = "library-card-meta";
  const detail = document.createElement("span");
  detail.textContent = item.detail;
  const when = document.createElement("span");
  when.textContent = relativeTime(item.updated_at);
  when.title = new Date(item.updated_at).toLocaleString();
  foot.append(detail, when);
  card.appendChild(foot);

  const kindWord = meta ? meta.label.replace(/s$/, "") : item.kind;
  card.title = `${kindWord} · ${item.title}`;
  card.setAttribute("aria-label", `${kindWord}: ${item.title}. ${item.detail}.`);

  const actions = libraryActions(item);
  if (actions.length) {
    const menu = kebabMenu(actions, `Actions for ${item.title}`);
    menu.classList.add("library-card-menu");
  // The menu is inside the card and the card is a click target, so every click
  // in the menu would also open the thing. Stopped here rather than on each
  // item: the opener, the popup's padding and its backdrop are all inside this
  // element, and only one of the three is a button.
    menu.addEventListener("click", (event) => event.stopPropagation());
    card.appendChild(menu);
  }

  card.addEventListener("click", () => openLibraryItem(item));
  // An <article role="button"> gets neither of these for free — this is the
  // half of the button element we gave up to be allowed a menu inside.
  card.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    if (event.target !== card) return; // a key pressed inside the menu is the menu's
    event.preventDefault();
    openLibraryItem(item);
  });
  return card;
}

// Each kind opens where it is actually worked on. The Library finds things; it
// is not a fifth editor.
function openLibraryItem(item) {
  if (item.kind === "document") {
    openDocumentFromNote(item.id); // the Documents page, on this document
  } else if (item.kind === "chat") {
    switchTab("chat");
    openConversation(item.id);
  } else if (item.kind === "file") {
    // The note, not the raw file: a download is one click further and the note
    // is the thing that says why the file was kept.
    flashEntry(item.entry_id);
  } else if (item.kind === "note") {
    flashEntry(item.id);
  } else if (item.kind === "tag") {
    // A tag's job is finding the notes that carry it, so opening one does
    // exactly that rather than opening a tag editor nobody asked for.
    switchTab("notes");
    showNotesSection("browse");
    const box = $("note-search");
    if (box) {
      box.value = `tag:${item.title}`;
      box.dispatchEvent(new Event("input", { bubbles: true }));
    }
  } else if (item.kind === "activity" && item.entry_id) {
    // The note the entry in the log is about, when it still exists.
    flashEntry(item.entry_id);
  } else if (item.kind === "archived") {
    // Restore and permanent delete are both on this card's own ⋯ menu, and
    // reading the note in full is the one thing a card cannot do — so that is
    // all this opens. It used to send the user to #bin-panel, which is the
    // only reason that panel outlived the Library's Bin chip.
    openBinnedNote(item.id);
  }
}

// --- reading a binned note in full (§36G) ----------------------------------
//
// **This is what let #bin-panel be deleted.** The Library card shows a
// preview, which is right for a grid of mixed things and wrong as the only
// way to see a note you are about to destroy — "restore or delete for good?"
// is a question you answer by reading the note, and the panel was the last
// place in the app that could still show one.
//
// Read-only. Editing a binned note would mean deciding whether the edit
// un-deletes it, and the honest answer is that you restore it first.
let binnedNoteId = null;

async function openBinnedNote(entryId) {
  binnedNoteId = entryId;
  const overlay = $("binned-overlay");
  const body = $("binned-body");
  body.replaceChildren();
  $("binned-meta").textContent = "Loading…";
  overlay.classList.remove("hidden");
  $("binned-close").focus();
  let entry;
  try {
    // `?deleted=true` — an ordinary read still 404s on a binned note, so
    // reaching into the bin is something the caller says it means to do.
    entry = await apiJson(`/entries/${entryId}?deleted=true`);
  } catch (error) {
    $("binned-meta").textContent = `Couldn't open that note: ${error.message}`;
    return;
  }
  if (binnedNoteId !== entryId) return; // a second open overtook this one
  const days = prefsCache ? prefsCache.recycle_bin_days : 30;
  const binned = entry.deleted_at ? relativeTime(entry.deleted_at) : "recently";
  $("binned-meta").textContent =
    `Deleted ${binned} · written ${relativeTime(entry.created_at)} · ` +
    `kept for ${days} days from deletion, then cleared automatically.`;
  // The note's own markdown, as the notebook renders it everywhere else. A
  // binned note is still a note, and showing it as flat text here would make
  // it look like a different, lesser thing than the one you deleted.
  renderMarkdown(body, entry.content || "");
}

function closeBinnedReader() {
  binnedNoteId = null;
  $("binned-overlay").classList.add("hidden");
}

$("binned-close").addEventListener("click", closeBinnedReader);
$("binned-restore").addEventListener("click", async () => {
  const id = binnedNoteId;
  if (!id) return;
  try {
    await apiJson(`/entries/${id}/restore`, { method: "POST" });
    toast("Restored.");
  } catch (error) {
    toast(`Couldn't restore that note: ${error.message}`, true);
    return;
  }
  closeBinnedReader();
  loadLibrary();
  loadEntries();
});
$("binned-purge").addEventListener("click", async () => {
  const id = binnedNoteId;
  if (!id) return;
  // The note is on screen and has just been read, so the dialog does not have
  // to quote it back the way the old bin row's did — "this cannot be undone"
  // is the whole of what is left to say.
  if (!(await confirmDialog("Permanently delete this note?\n\nThis cannot be undone."))) return;
  try {
    await apiJson(`/entries/${id}/purge`, { method: "DELETE" });
    toast("Deleted for good.");
  } catch (error) {
    toast(`Couldn't delete that note: ${error.message}`, true);
    return;
  }
  closeBinnedReader();
  loadLibrary();
});

// --- the status bar (§36D) ---------------------------------------------------
//
// Five items, and the roadmap's own test for what may be here: each one is
// either a state worth knowing at a glance or a command you use constantly.
// Anything else is a permanent strip of decoration, so anything added later
// should have to displace one of these rather than sit beside them.
//
// **Nothing here polls.** Every value arrives on a loop that already existed:
// the AI state and the background job on `refreshModelStatus`, the reminder
// counts wherever the tab badge is painted, the notebook size when the notes
// are loaded. That is deliberate and it is not a micro-optimisation — a
// reminder poll running on two timers is a bug this project has already had
// and had to find in a browser, and a bar with five values is five chances to
// repeat it.

//: What the reminder poll last saw. Two numbers rather than a list: the bar
//: needs counts, and holding the reminders themselves here would be a second
//: copy of state the Reminders tab already owns.
let reminderCounts = { open: 0, due: 0 };

//: The running background jobs, straight from GET /tasks. Not reassembled from
//: `modelStatus` — routes_tasks.py exists precisely because the frontend used
//: to build this list out of the two jobs that happened to be in the status
//: payload, and everything else (the embedding warm-up, the SearXNG install)
//: was invisible.
let backgroundTasks = [];

//: ⌘ on a Mac, Ctrl everywhere else. `userAgentData` where it exists because
//: `navigator.platform` is deprecated and lies inside some embedded shells;
//: the fallback is what the desktop window still answers.
const STATUS_META_KEY = /Mac|iPhone|iPad/.test(
  (navigator.userAgentData && navigator.userAgentData.platform) ||
    navigator.platform ||
    ""
)
  ? "⌘K"
  : "Ctrl K";

// One item: an icon, a number, and a word. The number is bold and tabular so
// the row does not twitch sideways as counts change — a status bar that moves
// while you are reading it is the thing the header was rebuilt to stop doing.
function paintStatusItem(id, { icon, value, label, title, tone = "" }) {
  const button = $(id);
  if (!button) return;
  button.replaceChildren();
  if (icon) {
    const glyph = document.createElement("span");
    glyph.textContent = icon;
    glyph.setAttribute("aria-hidden", "true");
    button.appendChild(glyph);
  }
  if (value !== undefined && value !== null) {
    const strong = document.createElement("b");
    strong.textContent = String(value);
    button.appendChild(strong);
  }
  if (label) {
    const text = document.createElement("span");
    text.textContent = label;
    button.appendChild(text);
  }
  button.title = title || "";
  button.classList.toggle("status-due", tone === "due");
}

function renderStatusBar() {
  if (!$("status-bar")) return;

  // The notebook's size, from the list the app has already loaded rather than
  // from /insights/stats — an unpaginated GET /entries *is* the notebook, so
  // this is exact and costs nothing. Before the first load it says nothing
  // rather than "0 notes", which would be a lie for the second it is up.
  paintStatusItem("status-notes", {
    icon: "📝",
    value: entriesEverLoaded ? allEntries.length : "–",
    label: allEntries.length === 1 && entriesEverLoaded ? "note" : "notes",
    title: "Your notebook — click to browse it",
  });

  // Due, or open. The same choice the dashboard's tile makes, and it has to
  // stay the same choice: two counters visible at once that count differently
  // is worse than either alone.
  const { open, due } = reminderCounts;
  paintStatusItem("status-reminders", {
    icon: due ? "⏰" : "✅",
    value: due || open,
    label: due ? "due" : "open",
    title: due
      ? `${due} reminder${due === 1 ? "" : "s"} due now`
      : `${open} open reminder${open === 1 ? "" : "s"}`,
    tone: due ? "due" : "",
  });

  // The job slot appears only while there is one. Where several run at once it
  // shows the first — /tasks orders them newest-concern-first — and says how
  // many are behind it, because a bar is one line and a queue is not.
  const task = backgroundTasks[0];
  const slot = $("status-task");
  slot.classList.toggle("hidden", !task);
  if (task) {
    const others = backgroundTasks.length - 1;
    paintStatusItem("status-task", {
      icon: "⚙",
      label: others > 0 ? `${task.label} (+${others})` : task.label,
      title:
        `${task.label}${task.detail ? ` — ${task.detail}` : ""}` +
        "\n\nClick to open Background tasks.",
    });
  }

  // The palette already exists and is already on Ctrl/⌘-K; what it did not
  // have was anywhere on screen saying so. A shortcut nobody can see is a
  // shortcut only the person who wrote it uses.
  const command = $("status-command");
  command.replaceChildren();
  const key = document.createElement("span");
  key.className = "status-key";
  key.textContent = STATUS_META_KEY;
  const word = document.createElement("span");
  word.textContent = "Commands";
  command.append(key, word);
  command.title = `Search everything and jump anywhere (${STATUS_META_KEY})`;
}

// Hover is handled in CSS. This is the click half — needed for touch, where
// there is no hover, and for keyboards, where there is no pointer.
function toggleAiStatusPopup(force) {
  const button = $("ai-status");
  const popup = $("ai-status-popup");
  if (!button || !popup) return;
  const open = force !== undefined ? force : !button.classList.contains("pinned");
  button.classList.toggle("pinned", open);
  button.setAttribute("aria-expanded", String(open));
  // Visibility, not the `hidden` attribute: `hidden` is display:none, which
  // the CSS hover rule would then have to fight. The stylesheet owns whether
  // the popup is shown; this only records that it has been pinned open.
  popup.classList.toggle("pinned", open);
}

// One plain-English line: which search engine is active and whether it works.
// The built-in engine runs without Ollama, so this shows in every state.
function renderSearchEngineHealth(status) {
  const el = $("search-engine-health");
  // The name comes from the server, never from a string in here: this line
  // said "Built-in (all-MiniLM)" for two model changes after the built-in
  // model stopped being all-MiniLM, and the only way to find out what was
  // really running was to watch it download in the log.
  const engine =
    status.embedding_backend === "ollama"
      ? `Ollama · ${status.embedding_model}`
      : `Built-in · ${status.active_embedding_model || "…"}`;
  let state = "not ready";
  let cls = "busy";
  if (status.embedding_ready) {
    state = "✓ ready";
    cls = "ok";
  } else if (status.embedding_warming) {
    state = "… warming up";
  } else if (status.embedding_error) {
    state = "⚠️ unavailable — using keyword search (details below)";
    cls = "error";
  }
  el.textContent = `Search engine: ${engine} — ${state}`;
  el.className = `status ${cls}`;
}

// What to call the backend on screen. The whole UI was written when there was
// only Ollama, and the word is in a dozen strings; this is the one place that
// decides, so the rest read from it (§6).
// The Chat / Agent pair. The hidden checkbox stays the single source of truth
// — every other reader in the app already consults it, and a second store for
// the same fact is how two of them end up disagreeing. These buttons just show
// it and set it.
function renderChatModeSeg() {
  const agent = $("tools-toggle").checked;
  // Two `addEventListener` calls for Quit and Clear-history used to sit here,
  // spliced into the middle of this function by an editing accident. It parsed,
  // so nothing complained — but this function runs on every chat-mode change,
  // so each call bound *another* listener to both buttons. Clicking Quit after
  // switching modes a few times opened that many confirm dialogs and fired
  // that many shutdown requests. The correctly-placed copies of both are
  // registered once, at the bottom of this file, where every other handler is.
  for (const button of document.querySelectorAll("#chat-mode-seg button")) {
    const active = button.dataset.chatMode === (agent ? "agent" : "chat");
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", active ? "true" : "false");
  }
}

async function setChatMode(mode) {
  const agent = mode === "agent";
  $("tools-toggle").checked = agent;
  renderChatModeSeg();
  // Remembered, because it is a way of working rather than a per-message
  // choice — the same preference the checkbox always wrote.
  await apiJson("/preferences", {
    method: "PUT",
    body: JSON.stringify({ tools_enabled: agent }),
  }).catch(() => {});
}

function backendLabel(status) {
  return (status && status.provider) === "openai" ? "The model server" : "Ollama";
}

// True while the user is mid-edit, so a status poll doesn't overwrite the
// address they are halfway through typing. The polling that keeps this screen
// live is the reason: without it, a five-second refresh eats every third
// keystroke.
let backendFieldsDirty = false;

function renderBackendPicker(status) {
  const select = $("llm-provider-select");
  const url = $("llm-base-url");
  if (!select || !url) return;
  if (backendFieldsDirty || document.activeElement === url) return;
  select.value = status.provider || "ollama";
  // Show the address actually in use, but as a placeholder when it is just the
  // default — so the field stays empty and "blank means the usual one" keeps
  // being true after a round trip.
  const defaults = status.provider_default_base_urls || {};
  const fallback = defaults[select.value] || "";
  if (status.base_url && status.base_url !== fallback) {
    url.value = status.base_url;
  } else {
    url.value = "";
  }
  url.placeholder = fallback || "Default address";

  // Drawn from the status poll, not only from the Connect response. A warning
  // that shows once and disappears on the next reload is a warning about a
  // condition that has not gone away — and this one says the notes are leaving
  // the machine, which is the promise the whole app is built on.
  const privacy = $("llm-privacy-warning");
  if (privacy) {
    privacy.textContent = status.privacy_note || "";
    privacy.classList.toggle("hidden", !status.privacy_note);
  }
  const lock = $("local-only-ai");
  if (lock && document.activeElement !== lock) {
    lock.checked = status.local_only_ai !== false;
  }
}

async function applyBackendChoice() {
  const provider = $("llm-provider-select").value;
  const baseUrl = $("llm-base-url").value.trim();
  const note = $("llm-provider-status");
  note.textContent = "Connecting…";
  try {
    const body = await apiJson("/models/provider", {
      method: "POST",
      body: JSON.stringify({ provider, base_url: baseUrl }),
    });
    backendFieldsDirty = false;
    // The setting is saved either way — you set the address, then you start
    // the server — so this reports what was found rather than treating an
    // unreachable server as a rejected setting.
    note.textContent = body.reachable
      ? `● Connected to ${body.base_url} — ${body.installed_models.length} model(s) available.`
      : `○ Saved, but nothing is answering at ${body.base_url} yet. Start the server and this will light up.`;
    // This app's headline promise is that notes stay on the machine. A backend
    // somewhere else is allowed — someone may want it — but never quietly, so
    // the warning is loud and stays until the address changes.
    const privacy = $("llm-privacy-warning");
    privacy.textContent = body.privacy_note || "";
    privacy.classList.toggle("hidden", !body.privacy_note);
    await refreshModelStatus();
  } catch (err) {
    note.textContent = err.message;
  }
}

function renderSettings() {
  const status = modelStatus;
  const ollamaLine = $("ollama-status");

  if (!status) {
    ollamaLine.textContent = "Can't reach the MemoryMap server.";
    return;
  }

  // Name the backend that actually answered. Saying "Ollama not detected"
  // when the app was pointed at LM Studio sends people to install the wrong
  // thing (§6).
  const backend = backendLabel(status);
  ollamaLine.textContent = status.ollama_running
    ? `● ${backend} is running`
    : `○ ${backend} not detected`;
  renderBackendPicker(status);
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
  // The "install Ollama" advice only helps someone who chose Ollama.
  $("ollama-help").classList.toggle(
    "hidden",
    status.ollama_running || status.provider !== "ollama"
  );
  $("models-config").classList.toggle("hidden", !status.ollama_running);
  // Downloads are an Ollama capability. Every other backend is handed a model
  // that is already on disk, so the panel hides rather than offering a button
  // that cannot work.
  $("suggested-box").classList.toggle(
    "hidden",
    !status.ollama_running || status.supports_pull === false
  );

  // The search engine is always adjustable: its recommended option is the
  // built-in one, which needs no Ollama. Only the Ollama half of it depends
  // on Ollama being up.
  renderEmbeddingPicker(status);
  if (status.ollama_running) {
    renderChatModelPicker(status);
    renderUtilityModelPicker(status);
    renderAutonomousModelPicker(status);
    renderInstalledModels(status);
    renderSuggested(status);
    renderModelSpec(status.chat_model);
  } else {
    $("installed-box").classList.add("hidden");
    $("model-spec").classList.add("hidden");
  }
  renderReindex(status);
}

// GET /tasks, once per status poll, feeding everything that wants to know what
// is running: the status bar's job slot, the Background tasks panel when it is
// open, and the notifications centre.
//
// That last one was a real gap rather than a tidy-up. `renderTaskHistory`
// records a finished job into the centre "whether or not this screen is open —
// which is the point of the centre", but the only thing that called it was
// `renderTasks`, and the only thing that called *that* was the panel being on
// screen. So a re-index that finished while you were anywhere else — which is
// most of them, since these jobs run for minutes — was recorded nowhere. It is
// polled from here now, so the record does not depend on being watched.
async function refreshBackgroundTasks() {
  // Before the unlock there is no token and this is a guaranteed 401 on every
  // poll — noise in the browser's network log and in the server's, where it
  // reads as an auth failure worth investigating.
  if (!authToken()) {
    backgroundTasks = [];
    return;
  }
  const body = await apiJson("/tasks", { silent: true }).catch(() => null);
  backgroundTasks = (body && body.tasks) || [];
  renderStatusBar();
  // One fetch, not two: the panel renders from this payload rather than asking
  // again a few milliseconds later.
  if (settingsModalOpen() && currentSettingsSection === "tasks") renderTasks(body);
  else renderTaskHistory((body && body.history) || []);
}

// --- optional extras (Settings → Optional extras) -----------------------------
//
// Each of these is a feature the app already offers and cannot run: the 🎙
// buttons need faster-whisper, the desktop window needs pywebview, search by
// meaning needs sentence-transformers. The only way to switch one on was a
// terminal and a README.
//
// The catalogue is the **server's**, and the install is chosen by id from an
// allowlist there — the client never sends a package name. See
// `core/extras.py` for why that is the whole security property.
let extrasPollTimer = null;

async function renderExtras() {
  const list = $("extras-list");
  if (!list) return;
  const body = await apiJson("/extras", { silent: true }).catch(() => null);
  if (!body) return;

  list.replaceChildren();
  for (const extra of body.extras) {
    const li = document.createElement("li");
    li.className = "extras-row";

    const head = document.createElement("div");
    head.className = "entry-meta";
    const name = document.createElement("strong");
    name.textContent = extra.label;
    head.appendChild(name);

    const actions = document.createElement("span");
    actions.className = "entry-actions";
    if (extra.installed) {
      // A tick, not a disabled button. "Installed" is the answer to the only
      // question this row asks, and a greyed-out Install invites a click that
      // will do nothing.
      const done = document.createElement("span");
      done.className = "extras-installed";
      done.textContent = "✓ Installed";
      actions.appendChild(done);
      // And a way back out of the state detection cannot see. `find_spec`
      // answers "is it there", not "is it sound" — a half-finished download or
      // a wheel built for the wrong platform imports and does not work, and
      // this is the button for that. Quiet, because it is the rarer need.
      // …except when nothing calls the package. Reinstalling a library the app
      // never imports cannot fix anything, because there is nothing to fix.
      if (!extra.unavailable) actions.appendChild(
        smallButton("↻ Reinstall", `Reinstall ${extra.label}`, async () => {
          const ok = await confirmDialog(
            `Reinstall ${extra.label}?\n\nUse this if the feature is switched ` +
              "on but not working — it downloads the package again from " +
              "scratch rather than trusting what is already there."
          );
          if (!ok) return;
          const result = await apiJson(`/extras/${extra.id}/install?reinstall=true`, {
            method: "POST",
          }).catch((e) => ({ started: false, message: e.message }));
          toast(result.message, !result.started);
          renderExtras();
        })
      );
      actions.appendChild(
        smallButton("🗑 Remove", `Uninstall ${extra.label}`, async () => {
          const ok = await confirmDialog(
            `Remove ${extra.label}?\n\nThe feature it turns on stops working. ` +
              "Only the package itself is removed — anything it pulled in is " +
              "left alone, since something else may be using it."
          );
          if (!ok) return;
          const result = await apiJson(`/extras/${extra.id}/uninstall`, {
            method: "POST",
          }).catch((e) => ({ started: false, message: e.message }));
          toast(result.message, !result.started);
          renderExtras();
        })
      );
    } else if (extra.installing) {
      const busy = document.createElement("span");
      busy.className = "muted";
      busy.textContent = "Installing…";
      actions.appendChild(busy);
    } else if (extra.unavailable) {
      // Greyed out rather than hidden. The row still earns its place — it says
      // what the app *will* be able to do — and hiding the two unfinished
      // extras would be tidier and less honest. The reason travels with the
      // button as its tooltip and is spelled out in full underneath, because a
      // disabled control whose reason is not visible is just a broken one.
      const blocked = smallButton("⬇ Install", extra.unavailable, () => {});
      blocked.disabled = true;
      actions.appendChild(blocked);
      const soon = document.createElement("span");
      soon.className = "muted extras-soon";
      soon.textContent = "Not ready yet";
      actions.appendChild(soon);
    } else {
      actions.appendChild(
        smallButton("⬇ Install", `Install ${extra.label}`, async () => {
          const ok = await confirmDialog(
            `Install ${extra.label}?\n\n${extra.size}. It is downloaded from ` +
              "PyPI to this machine, and MemoryMap needs a restart afterwards " +
              "before the feature works."
          );
          if (!ok) return;
          const result = await apiJson(`/extras/${extra.id}/install`, {
            method: "POST",
          }).catch((e) => ({ started: false, message: e.message }));
          toast(result.message, !result.started);
          renderExtras();
        })
      );
    }
    head.appendChild(actions);
    li.appendChild(head);

    const enables = document.createElement("p");
    enables.className = "muted extras-enables";
    enables.textContent = extra.enables;
    li.appendChild(enables);

    const meta = document.createElement("p");
    meta.className = "muted extras-meta";
    meta.textContent = `${extra.packages.join(", ")} · ${extra.size}`;
    li.appendChild(meta);

    // Said before the button is pressed, not after: "this installs the library
    // but nothing uses it yet" is exactly the sort of thing that turns into a
    // bug report if it is discovered afterwards.
    if (extra.caveat) {
      const caveat = document.createElement("p");
      caveat.className = "muted extras-caveat";
      caveat.textContent = `⚠️ ${extra.caveat}`;
      li.appendChild(caveat);
    }
    // The reason the button is grey, in full. Same shape as the caveat because
    // it is the same kind of sentence — the difference is that this one is
    // also enforced by `core/extras.py`, so it is a fact about the app rather
    // than advice about a choice.
    if (extra.unavailable) {
      const why = document.createElement("p");
      why.className = "muted extras-caveat";
      why.textContent = `🚧 ${extra.unavailable}`;
      li.appendChild(why);
    }
    list.appendChild(li);
  }

  $("extras-status").textContent = body.running
    ? body.step
    : body.outcome === "completed"
      ? `${body.step}`
      : body.outcome === "failed"
        ? `Install failed. ${body.step}`
        : "";
  const logWrap = $("extras-log-wrap");
  logWrap.classList.toggle("hidden", !body.log.length);
  $("extras-log").textContent = body.log.join("\n");

  // Poll only while something is running, and only while the panel is open.
  clearTimeout(extrasPollTimer);
  if (body.running && settingsModalOpen() && currentSettingsSection === "extras") {
    extrasPollTimer = setTimeout(renderExtras, 1500);
  }
  renderEmbedModels();
}

// --- embedding models, on the same screen as the packages ------------------------
//
// Reuses `.extras-row` deliberately. These are two lists of "things downloaded
// to this machine, with a way to undo it", and giving the second one its own
// row style would make them look like different kinds of thing when the whole
// argument for putting them together is that they are not.
let embedPollTimer = null;

async function renderEmbedModels() {
  const list = $("embed-models-list");
  if (!list) return;
  const body = await apiJson("/embedding-models", { silent: true }).catch(() => null);
  if (!body) return;

  list.replaceChildren();
  for (const model of body.models) {
    const li = document.createElement("li");
    li.className = "extras-row";

    const head = document.createElement("div");
    head.className = "entry-meta";
    const name = document.createElement("strong");
    name.textContent = model.label + (model.default ? " · default" : "");
    head.appendChild(name);

    const actions = document.createElement("span");
    actions.className = "entry-actions";
    if (model.downloading) {
      const busy = document.createElement("span");
      busy.className = "muted";
      busy.textContent = "Downloading…";
      actions.appendChild(busy);
    } else if (model.installed) {
      const done = document.createElement("span");
      done.className = "extras-installed";
      done.textContent = `✓ ${model.on_disk} on disk`;
      actions.appendChild(done);
      // The same argument the packages' Reinstall makes: "the directory is
      // there" is not "the model is sound". A download interrupted halfway
      // leaves a snapshot that loads and produces nonsense, and fetching over
      // the top of it resumes the same broken files — so this removes first.
      if (body.can_download) {
        actions.appendChild(
          smallButton("↻ Re-download", `Fetch ${model.label} again from scratch`, async () => {
            if (!(await confirmDialog(
              `Download ${model.label} again?\n\nThe copy on this machine is ` +
                "deleted first, so this is the fix for one that arrived broken."
            ))) return;
            const result = await apiJson(
              `/embedding-models/${model.id}/download?reinstall=true`,
              { method: "POST" }
            ).catch((e) => ({ started: false, message: e.message }));
            toast(result.message, !result.started);
            renderEmbedModels();
          })
        );
      }
      actions.appendChild(
        smallButton("🗑 Remove", `Delete ${model.label} from this machine`, async () => {
          if (!(await confirmDialog(
            `Remove ${model.label}?\n\nIt frees ${model.on_disk}. Nothing is ` +
              "lost that a download cannot bring back — but if this is the " +
              "model in use, searching falls back to keywords until it returns."
          ))) return;
          const result = await apiJson(`/embedding-models/${model.id}`, {
            method: "DELETE",
          }).catch((e) => ({ removed: false, message: e.message }));
          toast(result.message, !result.removed);
          renderEmbedModels();
        })
      );
    } else {
      const get = smallButton("⬇ Download", `Fetch ${model.label}`, async () => {
        if (!(await confirmDialog(
          `Download ${model.label}?\n\n${model.size}, fetched from HuggingFace ` +
            "to this machine. It is the one thing on this screen that needs " +
            "the internet."
        ))) return;
        const result = await apiJson(`/embedding-models/${model.id}/download`, {
          method: "POST",
        }).catch((e) => ({ started: false, message: e.message }));
        toast(result.message, !result.started);
        renderEmbedModels();
      });
      // Without huggingface_hub there is nothing to download *with*, so the
      // button says so rather than failing on an ImportError nobody can read.
      if (!body.can_download) {
        get.disabled = true;
        get.title =
          "Needs the huggingface_hub library — it arrives with “Search by " +
          "meaning” in the list above.";
      }
      actions.appendChild(get);
    }
    head.appendChild(actions);
    li.appendChild(head);

    const about = document.createElement("p");
    about.className = "muted extras-enables";
    about.textContent = model.about;
    li.appendChild(about);

    const meta = document.createElement("p");
    meta.className = "muted extras-meta";
    meta.textContent = `${model.repo} · ${model.size}`;
    li.appendChild(meta);
    list.appendChild(li);
  }

  // Where they are, in as many words. "Somewhere in your home directory" is
  // the answer people are given everywhere else and it is the reason this
  // screen had to exist.
  $("embed-models-cache").textContent = `Kept in ${body.cache}`;
  $("embed-models-status").textContent = body.running
    ? body.step
    : body.outcome
      ? body.step
      : "";

  clearTimeout(embedPollTimer);
  if (body.running && settingsModalOpen() && currentSettingsSection === "extras") {
    embedPollTimer = setTimeout(renderEmbedModels, 1500);
  }
}

// --- Wave N: tasks manager (see and quit background jobs) ---------------------------

// The list is built by the server (GET /tasks), not assembled here from
// whatever happened to be in the model status. It used to know about exactly
// two jobs — a re-index and a model download — so the embedding model loading
// at startup and the SearXNG install, which is minutes long, ran with nothing
// on this screen to say so. Rendering whatever the server sends means the
// next background job appears here without touching this file.
// `payload` is the /tasks body when the caller has already fetched it — the
// status poll has, once, for the bar. Opening the panel passes nothing and
// fetches, so the list is filled the moment you get there rather than at the
// next tick.
async function renderTasks(payload) {
  const list = $("task-list");
  const body = payload || (await apiJson("/tasks", { silent: true }).catch(() => null));
  const jobs = (body && body.tasks) || [];
  list.replaceChildren();
  $("tasks-empty").classList.toggle("hidden", jobs.length > 0);
  for (const job of jobs) {
    const li = document.createElement("li");
    // The heading row is the job and its Quit button; everything else stacks
    // underneath at full width. The bar used to sit inline after the label,
    // where it ran off the right edge of the card on a long job name.
    const row = document.createElement("div");
    row.className = "entry-meta";
    const name = document.createElement("strong");
    name.textContent = job.label;
    row.appendChild(name);

    if (job.cancellable) {
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
      row.appendChild(actions);
    }
    li.appendChild(row);

    if (job.detail) {
      const detail = document.createElement("p");
      detail.className = "muted task-detail";
      detail.textContent = job.detail;
      li.appendChild(detail);
    }

    // A bar only where there is a real fraction to show. A progress bar that
    // guesses is worse than one that admits it can't say — and under reduced
    // motion an indeterminate animation freezes and reads as a fault.
    if (typeof job.progress === "number") {
      const bar = document.createElement("progress");
      bar.max = 1;
      bar.value = job.progress;
      bar.className = "task-progress";
      li.appendChild(bar);
    }

    // What the job itself is printing. A bar answers "is it working?" only
    // while it moves, and pip can sit on one number for minutes — the output
    // is the thing that keeps changing, so it is the real answer to "has it
    // frozen?". Open by default while a job is running; there is nothing to
    // be spared from here.
    if ((job.log || []).length) {
      const fold = document.createElement("details");
      fold.className = "task-log";
      fold.open = taskLogsOpen.has(job.kind);
      fold.addEventListener("toggle", () => {
        if (fold.open) taskLogsOpen.add(job.kind);
        else taskLogsOpen.delete(job.kind);
      });
      const summary = document.createElement("summary");
      summary.textContent = `What it's doing (${job.log.length} lines)`;
      const pre = document.createElement("pre");
      pre.className = "task-log-lines";
      pre.textContent = job.log.join("\n");
      fold.append(summary, pre);
      li.appendChild(fold);
      // Follow the tail, the way a terminal does.
      if (fold.open) pre.scrollTop = pre.scrollHeight;
    }
    list.appendChild(li);
  }
  renderTaskHistory((body && body.history) || []);
}

// What has stopped, newest first. Separate from the running list on purpose:
// mixing them means a finished job and a running one look alike at a glance,
// and the question this screen answers most often is "is it still going?".
const TASK_OUTCOMES = {
  completed: { icon: "✅", className: "" },
  failed: { icon: "⚠️", className: "task-failed" },
  // Not an error. Reporting a user's own decision in red is how people learn
  // to ignore red.
  cancelled: { icon: "✖️", className: "muted" },
};

function renderTaskHistory(history) {
  const box = $("task-history-box");
  const list = $("task-history");
  // A finished background job goes into the notifications centre whether or
  // not this screen is open — which is the point of the centre (§36E). These
  // jobs are long: an install or a re-index finishes minutes after you stopped
  // watching it, and until now the only record was a screen inside Settings
  // that you had to know to open. Recorded first, so it happens even when the
  // Tasks panel is not on screen and the two elements below are missing.
  for (const item of history) {
    recordNotification({
      kind: item.outcome === "failed" ? "error" : "task",
      title: `${(TASK_OUTCOMES[item.outcome] || TASK_OUTCOMES.completed).icon} ${item.label}`,
      detail: item.detail || "",
      // Keyed on the job and when it stopped, so the three-second re-render
      // does not add the same finished job over and over.
      key: `task:${item.kind || item.label}:${item.at}`,
    });
  }
  if (!box || !list) return;
  box.classList.toggle("hidden", history.length === 0);
  list.replaceChildren();
  for (const item of history) {
    const style = TASK_OUTCOMES[item.outcome] || TASK_OUTCOMES.completed;
    const li = document.createElement("li");
    if (style.className) li.className = style.className;

    const row = document.createElement("div");
    row.className = "entry-meta";
    const name = document.createElement("strong");
    name.textContent = `${style.icon} ${item.label}`;
    const when = document.createElement("span");
    when.className = "muted";
    when.textContent = relativeTime(item.at);
    row.append(name, when);
    li.appendChild(row);

    // The reason, which is the whole point for a failure — until now it
    // existed only in the log console, a screen you have to know to open.
    if (item.detail) {
      const detail = document.createElement("p");
      detail.className = "muted task-detail";
      detail.textContent = item.detail;
      li.appendChild(detail);
    }
    list.appendChild(li);
  }
}

// Which task logs the user has opened, kept across the 3-second re-render so
// a fold doesn't slam shut under them.
const taskLogsOpen = new Set(["searxng"]);

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

function renderAutonomousModelPicker(status) {
  const names = status.installed_models.map((m) => m.name);
  fillModelSelect(
    $("pref-autonomous-model"),
    names,
    { value: "", label: "Same as utility model" },
    (window.prefsCache && window.prefsCache.autonomous_tasks_model) || ""
  );
}

function renderEmbeddingPicker(status) {
  // Name the built-in model rather than describing it. "Works out of the box,
  // no download" was wrong on both counts: it fetches ~130 MB from Hugging
  // Face the first time, which is a long quiet wait to have described as
  // needing nothing.
  $("builtin-model-name").textContent = status.active_embedding_model
    ? `${status.active_embedding_model}, downloaded once on first use`
    : "downloaded once on first use";
  // The backend radios only reflect the saved value while the user has no
  // pending choice of their own.
  //
  // A focus check alone was not enough, and it is why switching search
  // engines was reported as impossible. Picking a radio does not save
  // anything — "Apply & re-index" does — so between the click and the apply
  // there is a pending choice the server doesn't know about yet. The moment
  // focus moved (clicking Apply, or just tabbing away) the status poll ran,
  // found `touching` false, and reset the radio to the *saved* backend. The
  // selection visibly snapped back, so the setting looked stuck.
  //
  // Same `userChosen` latch the model selects already use, cleared once the
  // choice is actually applied.
  const group = document.querySelectorAll('input[name="emb-backend"]');
  const touching =
    document.activeElement?.name === "emb-backend" ||
    [...group].some((radio) => radio.dataset.userChosen === "1");
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
            !(await confirmDialog(
              `Remove “${model.name}” from Ollama? This frees its disk space — ` +
                "you can re-download it any time."
            ))
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
      // "~2.0 GB" for a figure we shipped and cannot check, the exact size for
      // one the backend has actually measured (§35J). The tilde is the whole
      // signal: this number is the one someone checks their free disk against
      // before committing to a multi-gigabyte download, so presenting a stale
      // guess as fact is the part that was wrong, not the guess itself.
      const approximate = model.size_source !== "measured";
      const size = approximate ? `~${String(model.size).replace(/^~/, "")}` : model.size;
      info.textContent = `${kind} · ${size} · ${model.purpose}`;
      info.title = approximate
        ? "Approximate download size — the exact figure shows once it's installed."
        : "Measured on your machine.";
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
  const heading = document.createElement("div");
  heading.style.display = "flex";
  heading.style.justifyContent = "space-between";
  heading.style.alignItems = "center";
  heading.style.marginBottom = "var(--space-3)";
  
  const headingText = document.createElement("span");
  headingText.className = "muted";
  headingText.textContent = "Notes that look related — link the ones you agree with:";
  
  const closeAll = smallButton("✕", "Close suggestions", () => {
    box.classList.add("hidden");
    box.replaceChildren();
  });
  
  heading.append(headingText, closeAll);
  box.appendChild(heading);
  for (const s of suggestions) {
    const row = document.createElement("div");
    row.className = "link-suggestion";
    const text = document.createElement("span");
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
      if (!box.querySelector(".link-suggestion")) {
        box.classList.add("hidden");
      }
    });
    const dismiss = smallButton("✕", "Dismiss this suggestion", () => {
      row.remove();
      if (!box.querySelector(".link-suggestion")) {
        box.classList.add("hidden");
      }
    });
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
      const proceed = (await confirmDialog(
        `"${model}" doesn't look like an embedding model. Chat models can't create ` +
          "embeddings, so semantic search will fail (Ollama returns 501). Download and " +
          "pick a dedicated embedding model like nomic-embed-text instead.\n\nApply anyway?"
      ));
      if (!proceed) return;
    }
  }
  const ok = (await confirmDialog(
    `Switching the search engine re-indexes all ${allEntries.length} of your ` +
      "notes so search keeps making sense. Notes and keyword search stay " +
      "available while it runs. Continue?"
  ));
  if (!ok) {
    // Backing out puts the saved backend back on screen, rather than leaving
    // a radio selected for a switch that never happened.
    clearEmbeddingBackendLatch();
    refreshModelStatus();
    return;
  }
  try {
    await api("/models/embedding-backend", {
      method: "POST",
      body: JSON.stringify({ backend, model: backend === "ollama" ? model : null }),
    });
    clearEmbeddingBackendLatch(); // applied — polling may reflect it again
    refreshModelStatus();
  } catch (error) {
    toast(error.message, true);
  }
}

// Let the status poll own the radios again. Called once a choice is applied,
// and when the user backs out of applying it — otherwise a cancelled switch
// would leave the radio showing a backend that was never saved, which is the
// same lie in the opposite direction.
function clearEmbeddingBackendLatch() {
  delete $("embedding-model-select").dataset.userChosen;
  for (const radio of document.querySelectorAll('input[name="emb-backend"]')) {
    delete radio.dataset.userChosen;
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
  
  // Clear any custom background colour that would otherwise override the new theme
  localStorage.removeItem("page-bg");
  localStorage.removeItem("page-bg-dark");
  applyPageBackground(null);
  if (document.getElementById("page-bg-custom")) {
    document.getElementById("page-bg-custom").value = "#f5f7fb";
  }
  
  applyResolvedMode();
  if (bgArtOn()) startBgArt(); // recolour the background for the new theme
  refreshArtForTheme(); // …and the dashboard constellation, which reads the
                        // mode when it is built rather than on every frame
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

// The colour the app is *actually* wearing right now. The generative art used
// to look this up from the ACCENTS list via localStorage, which only knows
// about the accent picker — so a curated palette changed every surface in the
// app except the two canvases, leaving them wearing the previous theme. The
// computed variable is the one source of truth once palettes can set it too.
function currentAccentHex() {
  const computed = getComputedStyle(document.documentElement)
    .getPropertyValue("--accent")
    .trim();
  if (computed) return computed;
  return (
    localStorage.getItem("accent-custom") ||
    (ACCENTS.find((a) => a.name === activeAccent()) || ACCENTS[0]).swatch
  );
}

function applyAccent(name, remember = true) {
  // applyThemePreset re-applies the theme's accent without recording it as a
  // manual choice — otherwise merely picking a theme would pin its colour as
  // an override and the next theme couldn't change it.
  if (remember) localStorage.setItem("accent", name);
  applyEffectiveAccent();
  if (bgArtOn()) startBgArt(); // repaint the background in the new accent
  refreshArtForTheme(); // its wash is painted from the accent as well
  renderBrandLogo(); // recolour the emblem too
}

// Which accent the app actually wears, decided in one place.
//
// Two bugs came out of not having this. Both were reported as "with a theme
// selected, the individual colour controls can't be changed":
//
// 1. The accent swatches did nothing under any theme. `[data-accent]` rules
//    live at the top of the stylesheet and `[data-palette]` rules near the
//    bottom, both `:root[data-…]` and so both specificity (0,2,0) — so the
//    palette won on source order alone, every time. Since every theme selects
//    a palette, picking an accent was visibly dead the moment a theme was on.
// 2. Clearing a manual accent left it applied. `applyAppearance` re-applied
//    every other setting but never the accent, so "clear my changes" removed
//    the stored value and the picker showed nothing selected while the app
//    carried on wearing the old colour.
//
// An explicit pick is written as an inline custom property, which beats any
// stylesheet rule and so beats the palette. No pick means no inline property,
// leaving the palette to supply the colour as it should. That is the
// documented layering — your change → theme → default — applied to colour.
// It owns `data-accent` as well as the inline property. Keeping the attribute
// in step matters even though the inline colour is what wins: the pre-paint
// script in index.html sets it from localStorage to avoid a flash, so a stale
// attribute survives a reload and re-colours the app from the stylesheet the
// moment the inline property is removed. That is what kept a cleared accent
// visible after "clear my changes".
function applyEffectiveAccent() {
  const root = document.documentElement;
  const custom = localStorage.getItem("accent-custom");
  // Only a *stored* accent is a deliberate choice; a theme never sets one.
  const chosen = localStorage.getItem("accent");
  const preset = chosen ? ACCENTS.find((a) => a.name === chosen) : null;
  if (preset && preset.name !== "indigo") root.dataset.accent = preset.name;
  else delete root.dataset.accent;
  if (custom) return applyCustomAccent(custom); // a picked hex wins outright
  applyCustomAccent(preset ? preset.swatch : null);
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
  // Background movement, separate from the interface-wide motion setting.
  // "auto" follows reduced-motion; "moving" is an explicit request that
  // overrides it; "still" never moves. This key was missing entirely, which
  // left the picker rendering blank (selectedIndex -1) — so choosing "Moving"
  // looked like it did nothing, and there was no way at all to get the art
  // moving on a machine with reduced motion turned on.
  // "auto" follows the reduced-motion setting; "moving" is an explicit
  // request that overrides it; "still" never moves. This key was declared
  // twice — once here as "auto" and again below as "moving" — after two
  // sessions fixed the same blank-picker bug independently. The later
  // declaration silently won, so the documented default was not the one
  // anybody got. One declaration, matching the <option> list and the hint
  // text that explains what "auto" means.
  "bg-motion": "auto", // auto | moving | still
  "bg-intensity": "90",
  radius: "14", // global corner rounding, px
  "glass-blur": "18", // frosted-glass blur strength, px
  zoom: "100", // §37E: interface-wide scale, percent — multiplies the root font-size
  "bg-style": "aurora", // aurora | constellation | waves | bubbles | mesh
  palette: "default", // which curated colour set; themes select one
  // No accent by default: the palette supplies the colour until you pick one
  // yourself. Named here so appearancePref("accent") has a defined answer
  // rather than returning undefined and relying on a lookup miss.
  accent: "indigo",
  // Both of these arrived with their Settings controls and neither was listed
  // here, which is not a cosmetic omission — it took the borders and shadows
  // off the entire interface. `applyAppearance` writes them onto <html> as
  // custom properties, so a missing default became the literal strings
  // "undefined" and "NaN" on the root element. `border-style: undefined` is
  // invalid, so `border-style: var(--border-style) !important` — which is
  // `!important` and matches .card, input, textarea, select, .modal and
  // .sidebar — computed to `none` for all of them. `--shadow-intensity: NaN`
  // poisoned `--glass-shadow`'s rgba(), so every card's box-shadow computed to
  // `none` as well. The app rendered completely flat and borderless on a fresh
  // profile, and stayed that way until you happened to touch both controls.
  "border-style": "solid", // solid | dashed | none
  "shadow-intensity": "5", // percent; divided by 100 into --shadow-intensity
  // Matches the pre-paint script's own `pref("theme", "system")`. Without it
  // `applyThemeChoice(undefined)` took the else branch and stamped
  // `data-theme="undefined"` onto <html> on every fresh profile. The app still
  // looked right, because the palettes key off the resolved `data-mode` — but
  // it left a live element attribute that is neither "light", "dark" nor
  // absent, so any rule written as `:root:not([data-theme])` to mean "following
  // the system" would quietly never match.
  theme: "system", // light | dark | system
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
// A theme is a COMPLETE look: which colour palette to wear, plus the
// typography and shape that go with it. It deliberately does not carry colours
// of its own — main's palettes already own colour, with a matched light and
// dark set each, and a theme that also set `accent` would silently lose to
// them ([data-palette] rules come later in the stylesheet and win at equal
// specificity). One mechanism for colour, one for everything else.
//
// It sits as a LAYER between the app defaults and your own choices:
//
//     your manual change  →  the selected theme  →  the app default
//
// which is what makes "apply manual colour changes over a selected theme"
// work. Picking a theme never erases a manual setting, and clearing a manual
// setting falls back to the theme rather than to the app default.
const THEME_PRESETS = {
  default: {
    label: "Default",
    values: { palette: "default", glass: "on", radius: "14" },
  },
  manuscript: {
    label: "Manuscript",
    values: {
      palette: "parchment", font: "serif", glass: "off",
      radius: "6", density: "spacious",
    },
  },
  terminal: {
    label: "Terminal",
    values: {
      palette: "carbon", font: "mono", glass: "off",
      radius: "2", density: "compact",
    },
  },
  study: {
    label: "Sage Study",
    values: { palette: "sage", font: "serif", glass: "on", radius: "16" },
  },
  abyss: {
    label: "Deep Ocean",
    values: {
      palette: "ocean", glass: "on", "glass-blur": "26", radius: "14",
    },
  },
  ember: {
    label: "Ember",
    values: { palette: "ember", glass: "on", radius: "12" },
  },
  orchid: {
    label: "Orchid",
    values: { palette: "plum", glass: "on", radius: "18" },
  },
  blueprint: {
    label: "Blueprint",
    values: {
      palette: "ocean", font: "mono", glass: "off",
      radius: "4", density: "compact",
    },
  },
  graphite: {
    label: "Graphite",
    values: { palette: "carbon", glass: "off", radius: "4" },
  },
  lagoon: {
    label: "Lagoon",
    values: { palette: "lagoon", glass: "on", radius: "14" },
  },
};

// The two colours a theme card shows: the page it sits on and the accent it
// picks out. Read from the palette itself so a palette tweak can never leave
// the theme cards advertising a colour the app no longer uses.
function themeSwatch(preset) {
  const palette = PALETTES.find((p) => p.id === preset.values.palette) || PALETTES[0];
  const isDark = document.documentElement.dataset.mode === "dark";
  const set = isDark ? palette.dark : palette.light;
  return [set.page, set.accent];
}

function activeThemePreset() {
  const name = localStorage.getItem("themePreset");
  return THEME_PRESETS[name] ? name : "";
}

// --- keeping the look across restarts (§35E) --------------------------------
//
// Reported as two bugs: *"the theme resets to default on every start"* and
// *"onboarding shows every time"*. They are one bug. Both were stored in
// `localStorage` and nowhere else, and the desktop shell does not reliably
// persist it — pywebview is a different browser with its own profile, and if
// that profile is not stable across launches then everything kept there is
// something the app forgets. Two symptoms, one storage, exactly as §35E
// predicted.
//
// The fix is a mirror, not a move. localStorage stays the thing every
// `appearancePref` read goes through: it is synchronous, it works with the
// server unreachable, and moving the reads would mean rewriting the whole
// appearance system to be async. The server keeps a copy, seeded back into
// localStorage on load when the local one is empty — so a shell that loses it
// gets it back, and a browser that keeps it never notices.

//: The keys worth surviving a restart. Explicit rather than "everything in
//: localStorage": this is written to the notebook's own preferences file, and
//: scroll positions and one-visit UI state have no business in there.
// The appearance half is `LOOK_KEYS` — the same list a saved custom theme
// snapshots — rather than a second hand-written copy of it. The first draft
// *was* a hand-written copy, and it guessed two key names wrong ("bgart",
// "bgart-motion" for what are really `bgArt`, `bg-style`, `bg-motion` and
// `bg-intensity`), so the background art would have been the one setting that
// still did not survive a restart. Deriving it cannot be wrong.
// Everything not covered by the look: the tour flag, and the few view
// settings that are properties of how you use the app rather than of one
// visit.
const MIRRORED_UI_EXTRAS = [
  "themePreset",
  "motion",
  "custom-css",
  "onboardingDone",
  "activeTab",
  "graph-layout",
  "graph-colour",
  "graph-options-open",
  "graph-trace-open",
  "chat-composer-height",
  "wb-bg-color",
  "wb-panel-pos-board",
  "wb-panel-pos-library",
  "wb-panel-pos-tools",
  "wb-panel-pos-zoom",
];

// A function rather than a `const` array, because `LOOK_KEYS` is declared
// several hundred lines below this one and a top-level spread of it would be
// read before its initialiser had run — a temporal-dead-zone error at load,
// which in a file with no bundler means a blank app.
function mirroredUiKeys() {
  return [...LOOK_KEYS, ...MIRRORED_UI_EXTRAS];
}

let uiStateSaveTimer = null;

// Write the mirrored keys to the server, coalesced. Debounced because the
// appearance panel fires a change per slider tick, and a preferences write per
// tick would be a write per pixel of a corner-radius drag.
function saveUiState() {
  clearTimeout(uiStateSaveTimer);
  uiStateSaveTimer = setTimeout(() => {
    // Not before the unlock. The tab restore writes `activeTab` at module
    // level, which schedules a save that would land while the lock screen is
    // still up — a guaranteed 401 on every cold load, visible in the browser's
    // network log and in the server's, where it reads as an auth failure worth
    // investigating. §35E-bis found exactly this in the reminder poll; the
    // guard is the same one, for the same reason.
    if (!authToken()) return;
    const state = {};
    for (const key of mirroredUiKeys()) {
      const value = localStorage.getItem(key);
      if (value != null) state[key] = String(value).slice(0, 400);
    }
    // Silent and best-effort. This is a backup of something that already
    // worked locally; a toast about it would be noise about a copy.
    apiJson("/preferences", {
      method: "PUT",
      body: JSON.stringify({ ui_state: state }),
      silent: true,
    }).catch(() => {});
  }, 800);
}

// Mirror every write to a watched key, from one place.
//
// There are twenty-odd sites that write these — a theme toggle, eight
// appearance controls, the graph's pickers, onboarding. Adding a `saveUiState()`
// call to each would work today and rot the moment somebody adds the
// twenty-third and forgets: the setting would keep working in a browser and
// quietly stop surviving a desktop restart, which is a bug nobody would
// connect to the commit that caused it.
//
// So the *store* is watched instead of its callers. Adding a key to
// MIRRORED_UI_KEYS is then the whole of making a new setting persistent, which
// is the property worth having. Only the listed keys trigger a save; every
// other `localStorage` write in the app is untouched and unwatched.
function watchMirroredUiKeys() {
  const mirrored = new Set(mirroredUiKeys());
  const store = window.localStorage;
  const setItem = store.setItem.bind(store);
  const removeItem = store.removeItem.bind(store);
  // Own properties shadowing Storage.prototype — the storage itself is
  // untouched, so anything else reading it (including these two) is unaffected.
  store.setItem = (key, value) => {
    setItem(key, value);
    if (mirrored.has(String(key))) saveUiState();
  };
  store.removeItem = (key) => {
    removeItem(key);
    // A removal is a change too: clearing an explicit theme to fall back to
    // the system one has to survive a restart just as setting one does.
    if (mirrored.has(String(key))) saveUiState();
  };
}

// Seed localStorage from the server's copy, for keys the browser has lost.
// Called once, before the look is applied, so the app paints in the remembered
// theme rather than flashing the default and correcting itself.
//
// **Local wins.** If a key exists in both, the local one is newer by
// definition — it is what the person set in this browser — and overwriting it
// with a copy saved from another window would make two open windows fight.
function seedUiStateFromServer(state) {
  if (!state || typeof state !== "object") return false;
  let restored = 0;
  for (const key of mirroredUiKeys()) {
    if (localStorage.getItem(key) == null && state[key] != null) {
      localStorage.setItem(key, String(state[key]));
      restored += 1;
    }
  }
  return restored > 0;
}

// What the selected theme says about one setting, or undefined.
function themeValue(key) {
  const preset = THEME_PRESETS[activeThemePreset()];
  return preset ? preset.values[key] : undefined;
}

// The three layers, in order. `??` rather than `||` so a legitimate "0"
// (corner rounding) isn't treated as unset.
function appearancePref(key, fallback) {
  // `fallback` is the last resort, after the stored value, the active theme
  // and APPEARANCE_DEFAULTS. It exists because five call sites were already
  // passing one to a function that took a single parameter and dropped it on
  // the floor — so two settings resolved to `undefined` and wrote that word
  // into a CSS custom property. A defaulted parameter that is silently ignored
  // is worse than no parameter at all: it reads as a guarantee.
  //
  // The table is still the right place for a new setting's default. This just
  // means forgetting it degrades to the caller's intent rather than to
  // "undefined".
  return (
    localStorage.getItem(key) ?? themeValue(key) ?? APPEARANCE_DEFAULTS[key] ?? fallback
  );
}

// Applying a theme only records WHICH theme. Because every read goes through
// appearancePref, that is enough to change everything the theme covers while
// leaving your manual choices sitting on top of it, untouched.
function applyThemePreset(name, chosenByUser = false) {
  // Picking a theme has to *win*. `appearancePref` reads the manual layer
  // first, so a single earlier tweak — one accent, one corner radius — sat on
  // top of every theme picked afterwards and silently cancelled that part of
  // it. With several tweaks stored, a theme could change nothing visible at
  // all, which is what "the themes don't work half the time" was.
  //
  // Only the keys *this* theme has an opinion about are dropped: choosing
  // Lagoon should not also throw away a font size it says nothing about.
  if (chosenByUser && THEME_PRESETS[name]) {
    for (const key of Object.keys(THEME_PRESETS[name].values)) {
      localStorage.removeItem(key);
    }
    // The accent and page background are painted from stored values rather
    // than read through `appearancePref`, so they need clearing by hand or a
    // custom accent outlives the palette it was picked against.
    if (THEME_PRESETS[name].values.palette) {
      localStorage.removeItem("accent");
      localStorage.removeItem("accent-custom");
      localStorage.removeItem("page-bg");
      localStorage.removeItem("page-bg-dark");
      applyCustomAccent(null);
      applyPageBackground(null);
    }
  }
  if (THEME_PRESETS[name]) localStorage.setItem("themePreset", name);
  else localStorage.removeItem("themePreset");
  applyAppearance();
  // `false` on both: re-applying what the theme says must not record it as a
  // manual choice, or merely picking a theme would pin its values as
  // overrides and the next theme couldn't change them.
  applyThemeChoice(appearancePref("theme"), false);
  applyPalette(appearancePref("palette"), false);
  renderBrandLogo();
  if (bgArtOn()) startBgArt();
}

// Which manual overrides are currently sitting on top of the theme. Shown in
// the UI so "why isn't the theme's colour showing?" has a visible answer.
const OVERRIDABLE_KEYS = [
  "theme", "palette", "accent", "accent-custom", "page-bg", "font", "fontsize",
  "density", "radius", "glass", "glass-blur", "bg-style", "bg-motion",
  "bg-intensity", "zoom",
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

// --- building a scheme from one colour ---------------------------------------
//
// Picking an accent is easy. Picking a page background that *goes* with it is
// the part people give up on and end up with a default they didn't choose — so
// the relationship is arithmetic rather than judgement: rotate the hue by a
// known amount, drop the saturation hard, and push the lightness to whichever
// end the current mode needs.
//
// Only two things are written: the accent and the page background. It would be
// easy to generate a dozen variables and much harder to undo, and both of
// these already have a Clear button and a place in the override layer that the
// rest of the appearance settings understand.

function hexToHsl(hex) {
  const clean = String(hex || "").replace("#", "");
  if (clean.length !== 6) return null;
  const n = Number.parseInt(clean, 16);
  if (Number.isNaN(n)) return null;
  const r = ((n >> 16) & 255) / 255;
  const g = ((n >> 8) & 255) / 255;
  const b = (n & 255) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l * 100];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h;
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
  else if (max === g) h = ((b - r) / d + 2) / 6;
  else h = ((r - g) / d + 4) / 6;
  return [h * 360, s * 100, l * 100];
}

function hslToHex(h, s, l) {
  const sat = Math.max(0, Math.min(100, s)) / 100;
  const light = Math.max(0, Math.min(100, l)) / 100;
  const hue = ((h % 360) + 360) % 360;
  const c = (1 - Math.abs(2 * light - 1)) * sat;
  const x = c * (1 - Math.abs(((hue / 60) % 2) - 1));
  const m = light - c / 2;
  const [r, g, b] =
    hue < 60 ? [c, x, 0] :
    hue < 120 ? [x, c, 0] :
    hue < 180 ? [0, c, x] :
    hue < 240 ? [0, x, c] :
    hue < 300 ? [x, 0, c] : [c, 0, x];
  const to = (v) => Math.round((v + m) * 255).toString(16).padStart(2, "0");
  return `#${to(r)}${to(g)}${to(b)}`;
}

// How far to rotate the background's hue away from the accent's. The names are
// the standard colour-wheel relationships; the numbers are what those names
// mean in degrees.
const HARMONY_ROTATIONS = {
  monochromatic: 0,
  analogous: -30,
  complementary: 180,
  triadic: 120,
};

function harmonyScheme(baseHex, kind, dark) {
  const hsl = hexToHsl(baseHex);
  if (!hsl) return null;
  const [h, s] = hsl;
  const rotation = HARMONY_ROTATIONS[kind] ?? 0;
  // A page background carrying the accent's full saturation is exhausting to
  // read against, so it keeps only a trace of it — enough to feel related, far
  // too little to compete with the text.
  const bgSaturation = Math.max(3, s * 0.14);
  const bgLightness = dark ? 12 : 96;
  return {
    accent: baseHex,
    page: hslToHex(h + rotation, bgSaturation, bgLightness),
  };
}

// `resolvedTheme` rather than the raw preference: under "System" there is no
// stored light/dark to read, and generating a light background for someone
// looking at a dark page is the one way this feature can be obviously wrong.

function applyHarmony() {
  const base = $("harmony-base").value;
  const kind = $("harmony-kind").value;
  const scheme = harmonyScheme(base, kind, resolvedTheme() === "dark");
  const note = $("harmony-note");
  if (!scheme) {
    note.textContent = "That colour didn't parse — try picking it again.";
    return;
  }
  localStorage.setItem("accent-custom", scheme.accent);
  // A scheme's background is worked out *for a mode* — the same accent wants a
  // near-white page in light and a near-black one in dark. Storing only the one
  // for whichever mode happened to be on is what made the light/dark toggle
  // "stop working on the background": the stored value is written inline on
  // <html>, and an inline custom property outranks every `[data-mode="dark"]`
  // rule in the stylesheet, so the page stayed put while the rest of the UI
  // changed around it. Both are computed and stored; `currentPageBackground`
  // picks the right one whenever the mode changes.
  const dark = harmonyScheme(base, kind, true);
  const light = harmonyScheme(base, kind, false);
  localStorage.setItem("page-bg", light ? light.page : scheme.page);
  localStorage.setItem("page-bg-dark", dark ? dark.page : scheme.page);
  applyCustomAccent(scheme.accent);
  applyPageBackground(currentPageBackground());
  renderAppearance();
  note.textContent =
    `Accent ${scheme.accent}, background ${scheme.page}. ` +
    "Both have their own Clear buttons above if you'd rather start again.";
}

// --- your own saved themes ---------------------------------------------------
//
// A saved theme is a snapshot of the same localStorage keys every appearance
// control already writes, so it is not a second system that could drift from
// them — the same idea as the built-in presets, which are also just bundles of
// those values.
//
// Stored server-side with the rest of the preferences rather than in the
// browser. The look itself lives in localStorage because it has to be applied
// before first paint, but a *saved* look is something you would be upset to
// lose to a cleared cache — and in preferences it also rides along in the
// daily backup and is there in the desktop window as well as the browser tab.

const MAX_CUSTOM_THEMES = 20;

//: Everything a saved look captures: every manual override, plus the
//: background-art switch. `bgArt` is deliberately NOT in OVERRIDABLE_KEYS —
//: that list also drives "clear my manual changes", and turning someone's
//: background off is not what clearing a colour override should do. But a
//: look that remembers *which* art and how intense, and not whether it is on,
//: can never turn it on when applied. Which is exactly what was reported
//: (§35J): the generative background had to be switched on by hand, separately
//: from the saved theme it belongs to.
const LOOK_KEYS = [...OVERRIDABLE_KEYS, "bgArt"];

function currentLookValues() {
  const values = {};
  for (const key of LOOK_KEYS) {
    const value = localStorage.getItem(key);
    if (value !== null) values[key] = value;
  }
  // The chosen preset is part of the look: without it, saving while "Manuscript"
  // is active and then applying the save would drop back to whatever preset
  // happened to be selected at the time.
  const preset = localStorage.getItem("themePreset");
  return { values, preset: preset || "" };
}

function savedThemes() {
  const saved = prefsCache && prefsCache.custom_themes;
  return Array.isArray(saved) ? saved : [];
}

async function saveCurrentLook() {
  const input = $("custom-theme-name");
  const name = input.value.trim().slice(0, 30);
  if (!name) {
    toast("Give the look a name first.", true);
    input.focus();
    return;
  }
  const existing = savedThemes();
  if (existing.length >= MAX_CUSTOM_THEMES && !existing.some((t) => t.name === name)) {
    toast(`You can keep ${MAX_CUSTOM_THEMES} saved looks — delete one first.`, true);
    return;
  }
  const snapshot = { name, ...currentLookValues() };
  // Saving under an existing name replaces it, which is what "save" means when
  // you have just tweaked a look you already saved.
  const next = [...existing.filter((t) => t.name !== name), snapshot];
  await apiJson("/preferences", {
    method: "PUT",
    body: JSON.stringify({ custom_themes: next }),
  });
  if (prefsCache) prefsCache.custom_themes = next;
  input.value = "";
  renderCustomThemes();
  toast(`Saved “${name}”.`);
}

function applySavedTheme(theme) {
  // Everything the snapshot named is restored; everything it didn't is left
  // alone rather than reset, so applying a saved look never silently changes a
  // setting the snapshot had nothing to say about.
  for (const [key, value] of Object.entries(theme.values || {})) {
    localStorage.setItem(key, value);
  }
  if (theme.preset) localStorage.setItem("themePreset", theme.preset);
  else localStorage.removeItem("themePreset");
  // The same function startup uses, so a restored look is applied by exactly
  // the path that would have applied it on a fresh load.
  applyThemeChoice(theme.values?.theme || "system", false);
  applyAppearance();
  // The art is a running p5 sketch, not a CSS variable, so applyAppearance
  // marking the root "on" is not enough to start or stop one.
  if (bgArtOn()) startBgArt();
  else stopBgArt();
  renderAppearance();
  toast(`Applied “${theme.name}”.`);
}

async function deleteSavedTheme(name) {
  const next = savedThemes().filter((t) => t.name !== name);
  await apiJson("/preferences", {
    method: "PUT",
    body: JSON.stringify({ custom_themes: next }),
  });
  if (prefsCache) prefsCache.custom_themes = next;
  renderCustomThemes();
  toast(`Deleted “${name}”.`);
}

function renderCustomThemes() {
  const box = $("custom-themes");
  if (!box) return;
  const themes = savedThemes();
  box.replaceChildren();
  if (!themes.length) {
    const empty = document.createElement("p");
    empty.className = "muted";
    empty.textContent = "Nothing saved yet — set the app up how you like it, then save it here.";
    box.appendChild(empty);
    return;
  }
  for (const theme of themes) {
    const chip = document.createElement("div");
    chip.className = "theme-chip";
    const apply = smallButton(theme.name, `Apply “${theme.name}”`, () => applySavedTheme(theme), false);
    const remove = smallButton("✕", `Delete “${theme.name}”`, () => {
      deleteSavedTheme(theme.name).catch((e) => toast(e.message, true));
    });
    remove.classList.add("ghost");
    chip.append(apply, remove);
    box.appendChild(chip);
  }
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

// The custom page background for the mode that is actually showing.
//
// `page-bg-dark` is only set by the scheme builder, which knows both. A
// background picked by hand from the colour input stays one colour in both
// modes, which is what picking one colour means.
function currentPageBackground() {
  const dark = localStorage.getItem("page-bg-dark");
  if (dark && resolvedTheme() === "dark") return dark;
  return appearancePref("page-bg");
}

// User CSS lives in one stylesheet we own, so applying and clearing is clean.
//
// A constructed stylesheet rather than a <style> tag, because the app now
// sends `style-src 'self'`, and an injected <style> is exactly what that
// refuses — this feature was the one thing the strict policy broke. Adopted
// sheets are not inline content, so they are unaffected, and this is what the
// API was added for. Keeping the tag would have meant 'unsafe-inline' on every
// page, which would also have re-permitted style injected through note text.
let userCssSheet = null;

function applyCustomCss(css) {
  const supported =
    typeof CSSStyleSheet !== "undefined" &&
    "replaceSync" in CSSStyleSheet.prototype &&
    "adoptedStyleSheets" in Document.prototype;
  if (!supported) return applyCustomCssLegacy(css);

  if (!userCssSheet) {
    userCssSheet = new CSSStyleSheet();
    document.adoptedStyleSheets = [...document.adoptedStyleSheets, userCssSheet];
  }
  try {
    // Invalid CSS throws here rather than being silently dropped, which is an
    // improvement: a <style> tag with a typo in it just did nothing.
    userCssSheet.replaceSync(css || "");
  } catch (err) {
    console.warn("Custom CSS was rejected:", err);
  }
}

// Only for a browser without constructable stylesheets (pre-2019 Chrome, or
// Safari before 16.4). Such a browser is old enough that it likely predates
// the CSP directive that makes this necessary in the first place.
function applyCustomCssLegacy(css) {
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
  root.style.setProperty("--zoom", Number(appearancePref("zoom")) / 100);
  root.style.setProperty("--border-style", appearancePref("border-style", "solid"));
  // Belt and braces over the two fixes above. A custom property will happily
  // hold the string "NaN"; it is only invalid where it gets *used*, which here
  // is inside `--glass-shadow`'s rgba() — so a bad number silently removes
  // every shadow in the app rather than failing anywhere near this line.
  const shadow = Number(appearancePref("shadow-intensity", "5"));
  root.style.setProperty(
    "--shadow-intensity", String((Number.isFinite(shadow) ? shadow : 5) / 100)
  );
  applyResolvedMode();
  // remember=false: this runs on every startup, and recording the resolved
  // value would pin whatever the theme supplied as a manual override — after
  // which no other theme could ever change the palette again.
  applyPalette(activePalette(), false);
  // After the palette, never before: the accent has to be able to override
  // whatever colour the palette just supplied.
  applyEffectiveAccent();
  // A theme may set the page colour; your own pick overrides it.
  applyPageBackground(currentPageBackground());
  applyCustomCss(localStorage.getItem("custom-css"));
}

function effectiveTheme() {
  // "system" is a real choice, so an explicit one is only overridden by a
  // manual pick; a theme supplies it when you haven't made one.
  return localStorage.getItem("theme") ?? themeValue("theme") ?? "system";
}

// What the app is *actually* showing right now: "system" is a choice, not a
// colour. The curated palettes need the resolved answer, because under
// "System" there is no data-theme attribute for CSS to match on — and writing
// each palette twice, once in a prefers-color-scheme block, is exactly how two
// copies of a palette drift apart.
function resolvedTheme() {
  const choice = effectiveTheme();
  if (choice === "light" || choice === "dark") return choice;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function applyResolvedMode() {
  document.documentElement.dataset.mode = resolvedTheme();
  // Light and dark can want different custom backgrounds, and the stored one
  // is written inline — so it has to be re-picked here rather than left to the
  // stylesheet, which cannot outrank it.
  applyPageBackground(currentPageBackground());
}

// Follow the OS while the choice is "System", without a reload.
window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => {
  if (effectiveTheme() === "system") {
    applyResolvedMode();
    if (bgArtOn()) startBgArt();
    refreshArtForTheme();
  }
});

function applyThemeChoice(choice, remember = true) {
  if (choice === "system") {
    delete document.documentElement.dataset.theme;
    if (remember) localStorage.removeItem("theme");
  } else {
    document.documentElement.dataset.theme = choice;
    if (remember) localStorage.setItem("theme", choice);
  }
  // Clear any custom background colour when explicitly switching themes,
  // otherwise the user thinks the theme toggle is broken because the custom
  // colour is overriding the new theme's native background.
  if (remember) {
    localStorage.removeItem("page-bg");
    localStorage.removeItem("page-bg-dark");
    applyPageBackground(null);
    if ($("page-bg-custom")) $("page-bg-custom").value = "#f5f7fb";
  }
  applyResolvedMode();
  if (bgArtOn()) startBgArt();
  // The dashboard constellation reads light-or-dark when it is built, so it
  // has to be rebuilt too — the background art already was, which is why only
  // this one appeared stuck on the old mode.
  refreshArtForTheme();
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
    button.className = "theme-card";
    button.title = `Apply the ${preset.label} theme`;
    button.setAttribute("aria-pressed", String(name === active));
    const swatch = document.createElement("span");
    swatch.className = "theme-swatch";
    // Two bands: the page it sits on and the accent it picks out.
    const [page, accent] = themeSwatch(preset);
    swatch.style.background = page;
    swatch.style.borderBottom = `6px solid ${accent}`;
    const caption = document.createElement("span");
    caption.textContent = preset.label;
    button.append(swatch, caption);
    button.addEventListener("click", () => {
      // Clicking the active theme turns it off, so the control is a toggle
      // rather than a one-way door.
      // `true`: this is the user asking for the theme, so it clears the
      // manual tweaks that would otherwise cancel parts of it.
      applyThemePreset(name === active ? "" : name, true);
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
      applyAccent(accent.name); // re-derives the inline colour from scratch
      renderAppearance();
    });
    holder.appendChild(button);
  }
  renderCustomThemes();
  // Seed the harmony picker from whatever accent is showing, so "Apply" on an
  // untouched picker keeps the colour you already have rather than jumping to
  // an arbitrary default.
  const showing = getComputedStyle(document.documentElement)
    .getPropertyValue("--accent")
    .trim();
  if (/^#[0-9a-f]{6}$/i.test(showing)) $("harmony-base").value = showing;
  $("contrast-toggle").checked = contrastOn();
  $("reduce-motion-toggle").checked = appearancePref("motion") === "reduced";
  $("bg-art-toggle").checked = bgArtOn();
  $("bg-style-row").classList.toggle("hidden", !bgArtOn());
  $("bg-intensity-row").classList.toggle("hidden", !bgArtOn());
  $("bg-motion").value = appearancePref("bg-motion");
  $("bg-motion-row").classList.toggle("hidden", !bgArtOn());
  renderBgMotionHint();
  $("glass-toggle").checked = appearancePref("glass") === "on";
  $("bg-intensity").value = appearancePref("bg-intensity");
  $("bg-intensity-value").textContent = `${appearancePref("bg-intensity")}%`;
  $("bg-art-style").value = appearancePref("bg-style");
  $("radius-slider").value = appearancePref("radius");
  $("radius-value").textContent = `${appearancePref("radius")}px`;
  $("glass-blur").value = appearancePref("glass-blur");
  $("glass-blur-value").textContent = `${appearancePref("glass-blur")}px`;
  $("zoom-slider").value = appearancePref("zoom");
  $("zoom-value").textContent = `${appearancePref("zoom")}%`;
  _segActive("border-style-seg", "borderChoice", appearancePref("border-style", "solid"));
  $("shadow-intensity").value = appearancePref("shadow-intensity", "5");
  $("shadow-intensity-value").textContent = `${appearancePref("shadow-intensity", "5")}%`;
  $("accent-custom").value = localStorage.getItem("accent-custom") || "#4f6df5";
  $("page-bg-custom").value = localStorage.getItem("page-bg") || "#f5f7fb";
  $("custom-css").value = localStorage.getItem("custom-css") || "";
  // Blur strength only matters while glass is on.
  $("glass-blur-row").classList.toggle("disabled-row", appearancePref("glass") !== "on");
  // Style/intensity only matter while the background art is on.
  const artOff = !bgArtOn();
  $("bg-style-row").classList.toggle("disabled-row", artOff);
  $("bg-intensity-row").classList.toggle("disabled-row", artOff);
  renderPaletteGrid();
  _segActive("theme-seg", "themeChoice", effectiveTheme());
  _segActive("fontsize-seg", "fontsize", appearancePref("fontsize"));
  _segActive("font-seg", "font", appearancePref("font"));
  _segActive("density-seg", "density", appearancePref("density"));
}

// A frozen background with no explanation reads as a broken app — which is
// how it was reported. Say which setting is holding it still, and that
// "Moving" will override it.
function renderBgMotionHint() {
  const hint = $("bg-motion-hint");
  if (!hint) return;
  const choice = appearancePref("bg-motion");
  const osReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const appReduced = appearancePref("motion") === "reduced";
  let text = "";
  if (choice === "auto" && (osReduced || appReduced)) {
    text = osReduced
      ? "Held still because your system asks for reduced motion. Choose Moving to override it here."
      : "Held still because Reduce motion is on above. Choose Moving to override it just for the background.";
  }
  hint.textContent = text;
  hint.classList.toggle("hidden", !text);
}

// --- curated palettes -------------------------------------------------------------
// The palette is a look; Mode (light/dark/system) is a separate axis. Every
// palette defines both, so picking "Parchment" never also decides whether
// it's night. Swatch colours are duplicated here from the CSS on purpose: the
// preview has to show a palette that isn't currently applied, and a variable
// can only ever report the active one.
const PALETTES = [
  {
    id: "default",
    name: "Aurora",
    note: "The original: indigo glass over a soft gradient.",
    light: { page: "linear-gradient(135deg,#e9edfb,#f6f2ec 45%,#e6f1f2)", card: "rgba(255,255,255,0.75)", accent: "#4f6df5", border: "rgba(31,36,48,0.12)" },
    dark: { page: "linear-gradient(135deg,#0e1017,#171a26 45%,#0f1720)", card: "rgba(29,33,46,0.85)", accent: "#8b9df8", border: "rgba(255,255,255,0.14)" },
  },
  {
    id: "parchment",
    name: "Parchment",
    note: "Paper, ink and a little gold. Made for long writing.",
    light: { page: "linear-gradient(135deg,#f6efe2,#f3e9d8 45%,#efe4d2)", card: "rgba(255,252,245,0.85)", accent: "#9a6b1f", border: "rgba(63,51,30,0.16)" },
    dark: { page: "linear-gradient(135deg,#1b1710,#221c13 45%,#1a1611)", card: "rgba(43,36,25,0.85)", accent: "#e0b458", border: "rgba(238,224,196,0.16)" },
  },
  {
    id: "sage",
    name: "Sage",
    note: "Quiet greens. The calmest of the set.",
    light: { page: "linear-gradient(135deg,#eaf1e9,#f2f5ee 45%,#e4eeea)", card: "rgba(253,255,252,0.85)", accent: "#2f7d54", border: "rgba(30,43,35,0.14)" },
    dark: { page: "linear-gradient(135deg,#0d1512,#121d17 45%,#0e1a16)", card: "rgba(25,38,31,0.85)", accent: "#5fd39a", border: "rgba(210,240,224,0.15)" },
  },
  {
    id: "ocean",
    name: "Ocean",
    note: "Cool teal and deep blue. Crisp rather than cosy.",
    light: { page: "linear-gradient(135deg,#e4f0f6,#eef6f8 45%,#dfeef2)", card: "rgba(252,254,255,0.85)", accent: "#0f7d99", border: "rgba(20,38,46,0.14)" },
    dark: { page: "linear-gradient(135deg,#08131a,#0d1e28 45%,#091a22)", card: "rgba(21,36,45,0.85)", accent: "#46c9e6", border: "rgba(200,238,250,0.15)" },
  },
  {
    id: "lagoon",
    name: "Lagoon",
    note: "Indigo ground with a teal accent — both colours, not blended.",
    light: { page: "linear-gradient(135deg,#eef1fa,#eaf4f6 45%,#e6edf8)", card: "rgba(253,254,255,0.85)", accent: "#0b6b7d", border: "rgba(26,34,62,0.15)" },
    dark: { page: "linear-gradient(135deg,#10142a,#141b38 45%,#0e1626)", card: "rgba(28,35,62,0.85)", accent: "#5fd8d0", border: "rgba(200,218,255,0.16)" },
  },
  {
    id: "ember",
    name: "Ember",
    note: "Warm oranges. Best in the evening.",
    light: { page: "linear-gradient(135deg,#fbeee4,#f9efe6 45%,#f6e6e0)", card: "rgba(255,252,249,0.85)", accent: "#bc5622", border: "rgba(46,30,22,0.15)" },
    dark: { page: "linear-gradient(135deg,#17100c,#1f1511 45%,#1a0f0e)", card: "rgba(41,29,23,0.85)", accent: "#f5924f", border: "rgba(246,220,204,0.16)" },
  },
  {
    id: "plum",
    name: "Plum",
    note: "Deep violet and magenta. The most saturated.",
    light: { page: "linear-gradient(135deg,#f1e9f7,#f6eef8 45%,#ece6f6)", card: "rgba(254,252,255,0.85)", accent: "#8332ad", border: "rgba(38,26,46,0.14)" },
    dark: { page: "linear-gradient(135deg,#130d1a,#1c1226 45%,#170f20)", card: "rgba(35,26,45,0.85)", accent: "#c07df5", border: "rgba(232,212,250,0.16)" },
  },
  {
    id: "carbon",
    name: "Carbon",
    note: "Near-monochrome. Colour only where it means something.",
    light: { page: "linear-gradient(135deg,#f2f3f5,#eceef1 45%,#e7e9ed)", card: "rgba(255,255,255,0.9)", accent: "#2b3441", border: "rgba(20,24,31,0.18)" },
    dark: { page: "linear-gradient(135deg,#0a0b0d,#101216 45%,#0c0e11)", card: "rgba(24,27,33,0.9)", accent: "#cdd5e0", border: "rgba(255,255,255,0.14)" },
  },
];

function activePalette() {
  // Through appearancePref, so a theme supplies the palette until you pick one
  // yourself — at which point yours wins and stays won.
  const saved = appearancePref("palette");
  return PALETTES.some((p) => p.id === saved) ? saved : "default";
}

function applyPalette(id, remember = true) {
  const root = document.documentElement;
  // "default" means "no palette overrides" — leave the attribute off rather
  // than shipping a block that restates the base :root values.
  if (id && id !== "default") root.dataset.palette = id;
  else delete root.dataset.palette;
  if (remember) localStorage.setItem("palette", id || "default");
  // The generative background paints from the accent, so it has to be rebuilt —
  // and so does the dashboard constellation, for the same reason.
  if (bgArtOn()) startBgArt();
  refreshArtForTheme();
}

function renderPaletteGrid() {
  const grid = $("palette-grid");
  if (!grid) return;
  const current = activePalette();
  const dark = resolvedTheme() === "dark";
  grid.replaceChildren();
  for (const palette of PALETTES) {
    const swatch = dark ? palette.dark : palette.light;
    const card = document.createElement("button");
    card.type = "button";
    card.className = "theme-card";
    card.setAttribute("aria-pressed", String(palette.id === current));
    card.title = palette.note;

    const preview = document.createElement("span");
    preview.className = "theme-preview";
    // The preview must show *its own* palette, so these are inline.
    preview.style.background = swatch.page;
    preview.style.setProperty("--sw-card", swatch.card);
    preview.style.setProperty("--sw-accent", swatch.accent);
    preview.style.setProperty("--sw-border", swatch.border);

    const name = document.createElement("span");
    name.className = "theme-name";
    name.textContent = palette.name;
    const note = document.createElement("span");
    note.className = "theme-note";
    note.textContent = palette.note;

    card.append(preview, name, note);
    card.addEventListener("click", () => {
      // A palette brings its own accent, and an accent chosen earlier sits at
      // higher specificity — leaving it would make every palette come out the
      // same colour, which reads as the picker not working. The accent row
      // below is still there to deviate from the palette afterwards.
      const hadAccent =
        activeAccent() !== "indigo" || localStorage.getItem("accent-custom");
      localStorage.removeItem("accent-custom");
      applyCustomAccent(null);
      applyAccent("indigo");
      applyPalette(palette.id);
      renderAppearance();
      toast(
        hadAccent
          ? `Palette: ${palette.name}. Its own accent is back — pick another below if you'd rather.`
          : `Palette: ${palette.name}.`
      );
    });
    grid.appendChild(card);
  }
}

function resetAppearance() {
  for (const key of [
    "fontsize", "font", "density", "glass", "motion", "bg-intensity", "accent",
    "contrast", "bgArt", "theme", "radius", "glass-blur", "bg-style",
    "bg-motion", "palette", "themePreset",
    "accent-custom", "page-bg", "custom-css", "zoom",
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
  // Wanting a calm background isn't the same as wanting a calm interface, so
  // the art has its own setting. "Moving" is an explicit request and wins over
  // the reduced-motion hint: the hint exists to protect people from motion
  // they didn't ask for, and this is someone asking for it, in a control that
  // does nothing else. Without that override there was no way to get the art
  // moving at all on a machine with reduced motion on — which is exactly what
  // was reported.
  const bgMotion = appearancePref("bg-motion");
  const reduceMotion =
    bgMotion === "still" || (bgMotion !== "moving" && reducedMotionWanted());
  // Whatever colour the app is wearing — accent picker or curated palette.
  const accentHex = currentAccentHex();
  const bgStyle = bgArtStyle();
  // Intensity drives how much is on screen, not just the CSS opacity.
  const intensity = Number(appearancePref("bg-intensity")) || 90;
  const densityScale = Math.max(0.25, intensity / 90);
  const dark = document.documentElement.dataset.mode === "dark";
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
        p.background(0, 0, dark ? 12 : 98);
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
      p.fill(0, 0, dark ? 12 : 98, dark ? 0.10 : 0.12);
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
  // Not the top bar any more: that is the favicon now, so the app's icon in
  // the tab strip and the mark above it are the same thing. The generated
  // emblem is the dashboard's hero, and a small animated marker on the tabs
  // where the AI is doing something — asked for as "kinda like an ai symbol".
  ["ai-mark", 24, true],
  ["lock-emblem", 76, true],
  ["onboarding-emblem", 64, false],
  ["chat-empty-emblem", 52, true],
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
$("zoom-slider").addEventListener("input", (e) => {
  localStorage.setItem("zoom", e.target.value);
  $("zoom-value").textContent = `${e.target.value}%`;
  applyAppearance();
});
for (const btn of document.querySelectorAll("#border-style-seg button")) {
  btn.addEventListener("click", () => {
    localStorage.setItem("border-style", btn.dataset.borderChoice);
    applyAppearance();
    renderAppearance();
  });
}
$("shadow-intensity").addEventListener("input", (e) => {
  localStorage.setItem("shadow-intensity", e.target.value);
  $("shadow-intensity-value").textContent = `${e.target.value}%`;
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
  localStorage.removeItem("page-bg-dark");
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
$("account-change").addEventListener("click", changePassword);
$("account-lock-all").addEventListener("click", async () => {
  if (!(await confirmDialog("End every session, including this one? You'll need your password to get back in."))) return;
  await apiJson("/auth/lock-all", { method: "POST" }).catch(() => {});
  localStorage.removeItem("token");
  location.reload();
});
// Enter anywhere in the change-password form submits it.
for (const id of ["account-current", "account-new", "account-confirm"]) {
  $(id).addEventListener("keydown", (e) => {
    if (e.key === "Enter") changePassword();
  });
}
$("theme-clear-overrides").addEventListener("click", clearManualOverrides);

// --- the notifications centre's controls (§36E) -----------------------------
$("notif-btn").addEventListener("click", () => {
  const open = $("notif-panel").classList.contains("hidden");
  $("notif-btn").setAttribute("aria-expanded", String(open));
  if (open) openNotifications();
  else closeNotifications();
});
$("notif-close").addEventListener("click", () => {
  closeNotifications();
  $("notif-btn").setAttribute("aria-expanded", "false");
});
$("notif-clear").addEventListener("click", () => {
  localStorage.removeItem(NOTIFICATIONS_KEY);
  localStorage.setItem(NOTIFICATIONS_READ_KEY, String(Date.now()));
  openNotifications(); // redraw in place: the panel stays open, now empty
});
// Click-away and Escape, the same two gestures every other popup here honours.
document.addEventListener("click", (event) => {
  const panel = $("notif-panel");
  if (panel.classList.contains("hidden")) return;
  if (event.target.closest(".notif-wrap")) return;
  closeNotifications();
  $("notif-btn").setAttribute("aria-expanded", "false");
});
renderNotificationBadge();

// Watch the settings worth surviving a restart *before* anything can write
// one (§35E). Installed here rather than inside startApp because the tab
// restore below writes `activeTab`, and a write that happens before the watch
// is a write the server never hears about.
watchMirroredUiKeys();

// Apply saved appearance prefs immediately, then start the background.
applyAppearance();
if (bgArtOn()) startBgArt();

// Tabs (Wave A): switch pages, restore the last one used.
for (const button of document.querySelectorAll("#tab-bar button")) {
  button.addEventListener("click", () => switchTab(button.dataset.tab));
}
// Arrow keys walk the tablist; Home/End jump to the ends (Wave L).
//
// Read from the bar itself rather than from TABS. Since the Library absorbed
// the Documents tab (§36F) the two lists are no longer the same: `documents`
// is still a page you can switch to — it is the editor the Library opens — but
// it has no button, so walking TABS would land on a tab that does not exist
// and `.focus()` on the null it returned would throw on an arrow key.
$("tab-bar").addEventListener("keydown", (e) => {
  const keys = { ArrowRight: 1, ArrowLeft: -1, Home: 0, End: 0 };
  if (!(e.key in keys)) return;
  e.preventDefault();
  const buttons = [...document.querySelectorAll("#tab-bar button")];
  if (!buttons.length) return;
  const names = buttons.map((b) => b.dataset.tab);
  const index = Math.max(0, names.indexOf(localStorage.getItem("activeTab") || "notes"));
  let next;
  if (e.key === "Home") next = 0;
  else if (e.key === "End") next = names.length - 1;
  else next = (index + keys[e.key] + names.length) % names.length;
  switchTab(names[next]);
  buttons[next].focus();
});
// Skip link (Wave L): jump keyboard focus straight into the open panel.
$("skip-link").addEventListener("click", (e) => {
  e.preventDefault();
  $(`tab-${localStorage.getItem("activeTab") || "notes"}`).focus();
});
initNotesSubtabs();
scrollTopUpdate = initScrollTopButton();
// Nothing used to check whether a reminder had come due, so one could pass
// silently and stay silent (§36C).
startReminderWatch();
initResizableSidebars();
watchOverlays(); // page behind a dialog must not scroll
initAutoGrow(); // capture + magic-add boxes follow their content
// A returning visit still opens on whichever tab was last active — that is
// the point of remembering it at all. Only the fallback changed: a genuinely
// first run (nothing in `localStorage` yet) used to default to Notes, an odd
// choice for the one visit where there is nothing to browse. Asked for
// directly: "on first load I want it to show the dashboard."
switchTab(localStorage.getItem("activeTab") || "dashboard");

// Settings modal (Wave A).
$("settings-btn").addEventListener("click", () => openSettingsModal());
$("settings-close").addEventListener("click", closeSettingsModal);
$("settings-peek").addEventListener("click", () => setSettingsPeek(!settingsPeekIsOn()));
$("local-only-ai").addEventListener("change", async (e) => {
  const on = e.target.checked;
  await apiJson("/preferences", {
    method: "PUT",
    body: JSON.stringify({ local_only_ai: on }),
  }).catch((error) => toast(error.message, true));
  // Say it plainly on the way out of the safe state. Turning the lock ON is
  // unremarkable; turning it OFF is the moment worth naming, because the app's
  // central promise stops being enforced at exactly that click.
  toast(
    on
      ? "The AI is locked to this machine."
      : "Off — MemoryMap will now let you point the AI at a server on the internet."
  );
  refreshModelStatus();
});
$("task-history-clear").addEventListener("click", async () => {
  await apiJson("/tasks/history/clear", { method: "POST" }).catch((e) =>
    toast(e.message, true)
  );
  renderTasks();
});
// Quit, from either place it is offered: the top bar (§36D) and Settings →
// System. One handler, bound to both, rather than two copies that drift.
async function quitApp() {
  // Confirmed, because it is not undoable from inside the app: once the
  // server is down, the button that would bring it back is on the page that
  // just stopped being served.
  if (!(await confirmDialog(
    "Quit MemoryMap?\n\nThe app and its server will stop. Your notes are already saved.",
    { confirmLabel: "Quit" }
  ))) {
    return;
  }
  try {
    await apiJson("/shutdown", { method: "POST" });
  } catch {
    // The server may drop the connection as it goes. That is the request
    // succeeding, not failing, so it is not worth an error toast.
  }
  document.body.innerHTML =
    '<div class="farewell">' +
    "<h1>MemoryMap has stopped.</h1>" +
    "<p>Your notes are saved. You can close this tab.</p></div>";
}
$("app-quit").addEventListener("click", quitApp);
$("quit-btn")?.addEventListener("click", quitApp);
for (const button of document.querySelectorAll("#chat-mode-seg button")) {
  button.addEventListener("click", () => setChatMode(button.dataset.chatMode));
}
$("harmony-apply").addEventListener("click", applyHarmony);
$("custom-theme-save").addEventListener("click", () => {
  saveCurrentLook().catch((error) => toast(error.message, true));
});
$("custom-theme-name").addEventListener("keydown", (e) => {
  if (e.key === "Enter") $("custom-theme-save").click();
});
$("settings-modal").addEventListener("click", (e) => {
  if (e.target === $("settings-modal")) closeSettingsModal(); // backdrop click
});
for (const button of document.querySelectorAll("#settings-nav button")) {
  button.addEventListener("click", () => showSettingsSection(button.dataset.section));
}
$("settings-search")?.addEventListener("input", (e) => filterSettings(e.target.value));
$("settings-search")?.addEventListener("keydown", (e) => {
  // Escape clears the filter rather than closing the whole panel — closing on
  // Escape while someone is mid-search loses both the search and their place.
  if (e.key === "Escape" && e.target.value) {
    e.stopPropagation();
    e.target.value = "";
    filterSettings("");
  }
});
// Cross-links between settings screens ("web search lives over there").
// Delegated, so a link added to the markup later needs no wiring.
$("settings-modal").addEventListener("click", (event) => {
  const link = event.target.closest("[data-goto-section]");
  if (link) showSettingsSection(link.dataset.gotoSection);
});
// Web search saves on change rather than behind a Save button: there are two
// controls, and a checkbox that needs a second click elsewhere to take effect
// is the shape of "this control does nothing" that keeps getting reported.
$("pref-web-search").addEventListener("change", saveWebSearchSettings);
$("pref-searxng").addEventListener("change", saveWebSearchSettings);

function toggleAutonomousPanel() {
  const panel = $("autonomous-settings-panel");
  if (panel) panel.classList.toggle("hidden", !$("pref-autonomous-tasks").checked);
}
$("pref-autonomous-tasks").addEventListener("change", () => {
  toggleAutonomousPanel();
  savePrefs();
});
$("pref-auto-tag").addEventListener("change", savePrefs);
$("pref-auto-link").addEventListener("change", savePrefs);
$("pref-auto-dedupe").addEventListener("change", savePrefs);
$("pref-battery-mode").addEventListener("change", savePrefs);
$("pref-autonomous-interval").addEventListener("change", savePrefs);
$("pref-autonomous-model").addEventListener("change", savePrefs);
$("pref-smart-model-routing").addEventListener("change", savePrefs);

$("semantic-search-toggle")?.addEventListener("change", () => {
  if (noteSearch) loadAllNotes();
});
// The review panel for the background librarian (ROADMAP §40 item 2).
//
// A true dry-run is not available here — the agent picks each call from the
// result of the last one, so a pass with the writes stubbed out stops
// resembling the pass that would really run, and a preview that lies is worse
// than no preview. What is available is honest and nearly as useful: every
// write already captured the call that reverses it, so the pass can be read
// back and undone one item at a time. `changeRow` is the same renderer the
// chat uses for a skill's result, so Undo here goes through exactly the path
// the chat's own Undo buttons do.
async function renderAutonomousReview() {
  const box = $("autonomous-review");
  const list = $("autonomous-review-list");
  if (!box || !list) return;

  const pass = await apiJson("/tasks/autonomous/last").catch(() => null);
  const changes = pass?.changes || [];
  box.classList.toggle("hidden", changes.length === 0);
  if (!changes.length) return;

  const when = pass.finished_at ? new Date(pass.finished_at).toLocaleString() : "";
  $("autonomous-review-title").textContent =
    `What the last run changed — ${changes.length} thing(s)` + (when ? `, ${when}` : "");
  list.replaceChildren(...changes.map((change) => changeRow(change)));
}

async function addMemoryByHand() {
  const input = $("memory-new");
  const status = $("memory-status");
  const text = (input?.value || "").trim();
  status.classList.add("hidden");
  status.classList.remove("error");
  if (!text) return;
  try {
    await apiJson("/memory", { method: "POST", body: JSON.stringify({ content: text }) });
    input.value = "";
    renderMemorySettings();
  } catch (error) {
    status.textContent = error.message || "Couldn't save that.";
    status.classList.remove("hidden");
    status.classList.add("error");
  }
}

// "+ New Skill" on the Library's AI Skills page. Reported as doing nothing,
// and it did nothing: the button was in the markup and no handler was ever
// attached to it. The skill editor lives in Settings → Skills, so this opens
// that with a blank form rather than growing a second editor that would then
// have to be kept in step with the first.
$("skills-add-new")?.addEventListener("click", async () => {
  await openSettingsModal("skills");
  stopEditingSkill();           // clears the form and resets the button label
  $("skill-name")?.focus();
});

$("memory-add")?.addEventListener("click", addMemoryByHand);
$("memory-new")?.addEventListener("keydown", (e) => {
  // Enter saves. Typing a one-line rule and having to reach for the mouse is
  // the kind of small friction that stops people using a feature at all.
  if (e.key === "Enter") { e.preventDefault(); addMemoryByHand(); }
});

$("autonomous-review-clear")?.addEventListener("click", async () => {
  await api("/tasks/autonomous/last/clear", { method: "POST" }).catch(() => {});
  renderAutonomousReview();
});

$("autonomous-trigger").addEventListener("click", () => {
  api("/tasks/trigger-autonomous", { method: "POST" })
    .then(async (response) => {
      const body = await response.json().catch(() => ({}));
      toast(
        body.started === false
          ? "A pass is already running — the results will appear below."
          : "Optimization started. Its changes will be listed below when it finishes."
      );
      // The pass runs on a worker thread, so there is nothing to await. Look
      // again shortly rather than leaving the panel showing the previous run.
      setTimeout(renderAutonomousReview, 4000);
    })
    .catch((err) => toast(err.message, true));
});
// Filters only re-draw what is already held — they never refetch, so changing
// one mid-incident cannot lose the records you were looking at.
$("log-source").addEventListener("change", renderLogList);
$("log-level").addEventListener("change", renderLogList);
$("log-filter").addEventListener("input", renderLogList);
$("logs-copy").addEventListener("click", copyLogs);
$("logs-clear").addEventListener("click", clearLogs);
$("logs-bundle").addEventListener("click", downloadSupportBundle);

$("log-follow").addEventListener("change", (event) => {
  logFollowPinned = event.target.checked;
  if (event.target.checked) scrollLogToBottom();
});

// Scrolling up is how you say "stop moving, I am reading this" — so it pauses
// the follow rather than fighting you for the scroll position. Scrolling back
// to the bottom resumes it, which is the same gesture every terminal uses.
$("log-list").addEventListener("scroll", () => {
  if (!$("log-follow").checked) return;
  logFollowPinned = nearLogBottom();
  $("log-follow-label").classList.toggle("is-paused", !logFollowPinned);
});

// There is no Tags / Recycle bin / Activity shortcut in the notes sidebar, and
// `openLibraryOn` went with them. The buttons were dropped once with their
// handlers left behind (which is how `test_frontend_ids` found three ids that
// nothing defined), briefly restored during the §40 audit on the assumption
// the removal had been accidental, and then removed again — deliberately this
// time, because the owner asked for it.
//
// The reasoning is the Library's own (§36G): the bin, the activity log and the
// tag list are all "show me the things of this sort", which is what the
// Library is, and it reaches each of them through its own filter chips. A
// second door in a sidebar that is meant to be a category list is exactly the
// "too much in one place, clashing with the text beside it" this app has been
// asked to stop doing.
$("entry-template").addEventListener("change", applyTemplate);

// Chat tab (Wave C).
$("chat-send").addEventListener("click", () => sendChatMessage());

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
$("draft-discard").addEventListener("click", async () => {
  if (!$("draft-text").value.trim() && !$("draft-thoughts").value.trim()) return;
  if (!(await confirmDialog("Discard this draft? It hasn't been saved as a note."))) return;
  foldedThoughts = "";
  $("draft-thoughts").value = "";
  $("draft-text").value = "";
  $("draft-tags").value = "";
  $("draft-thinking").classList.add("hidden");
  $("draft-status").textContent = "";
  updateDraftCount();
  saveDraftLocally();
});
// "What is this?" — it toggled `hidden` on the intro paragraph, which is a
// child of a card that starts *collapsed*. So the paragraph was already not
// displayed, the click changed nothing anyone could see, and the button read
// as dead. It now opens the section and explains what the writing room is,
// including what happens when there's no AI running — which is when someone
// is most likely to press it.
// "What is this?" — it used to toggle `hidden` on a paragraph inside a card
// that started collapsed, so the paragraph was already not displayed and the
// click changed nothing anyone could see. The section is always open when you
// can press this now, so it's a plain show/hide of the explanation.
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

// --- chat dock "more" disclosure wiring (§37C) ---
$("chat-dock-more-btn").addEventListener("click", () => {
  if (chatDockMoreOpen()) closeChatDockMore();
  else openChatDockMore();
});
document.addEventListener("click", (event) => {
  if (!chatDockMoreOpen()) return;
  if (event.target.closest(".chat-dock-more")) return;
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
$("persona-peek").addEventListener("click", togglePersonaPrompt);
// Searching your chats lives in the Library now (§36F) — with the documents,
// the files and the bin, and with sort beside it. This is the way there, said
// out loud, because a list that silently stops at eight is a list that has
// lost your chats.

function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

$("conv-browse-all").addEventListener("click", () => {
  switchTab("library");
  libraryKind = "chat";
  renderLibraryFilters();
  renderLibrary();
});
$("chat-export").addEventListener("click", exportChatMarkdown);
$("chat-compress").addEventListener("click", compressChatContext);
$("chat-compress-apply").addEventListener("click", applyCompression);
$("chat-compress-cancel").addEventListener("click", () =>
  $("chat-compress-panel").classList.add("hidden")
);
$("chat-uncompress").addEventListener("click", () => {
  // Undo is one assignment, because nothing was ever removed — the turns have
  // been sitting there all along.
  chatSummary = null;
  renderCompressionState();
  toast("Back to sending the real messages.");
});
$("chat-input").addEventListener("keydown", (e) => {
  // Enter sends, Shift+Enter (or Ctrl/Cmd+Enter) writes a newline. The box is
  // a textarea now, so "send" has to be chosen rather than inherited.
  if (e.key === "Enter" && !e.shiftKey && !e.ctrlKey && !e.metaKey) {
    e.preventDefault();
    sendChatMessage();
  }
});
$("persona-select").addEventListener("change", async () => {
  // Remember the choice so the Notes quick-ask uses the same persona.
  await apiJson("/preferences", {
    method: "PUT",
    body: JSON.stringify({ active_persona: $("persona-select").value }),
  }).catch(() => {});
});
for (const id of RESPONSE_MODE_SELECTS) {
  $(id)?.addEventListener("change", (e) => setResponseMode(e.target.value));
}
// The AI status dot. Hover is CSS; these are the paths hover doesn't cover —
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

// The Library (§4, §36F). Filter and sort are first-class here rather than an
// afterthought, so they are wired like controls: every change re-renders from
// the list already in memory, with no round trip.
let librarySearchDebounceTimeout;
$("library-search").addEventListener("input", () => {
  clearTimeout(librarySearchDebounceTimeout);
  librarySearchDebounceTimeout = setTimeout(renderLibrary, 150);
});
$("library-sort").addEventListener("change", renderLibrary);
for (const button of document.querySelectorAll("#library-sort-seg button")) {
  button.addEventListener("click", () => {
    document.querySelectorAll("#library-sort-seg button").forEach(b => b.classList.remove("active"));
    button.classList.add("active");
    const select = $("library-sort");
    if (select) select.value = button.dataset.sort;
    renderLibrary();
  });
}
$("library-show-binned").addEventListener("change", renderLibrary);
for (const button of document.querySelectorAll("#library-view button")) {
  button.addEventListener("click", () => {
    localStorage.setItem(LIBRARY_VIEW_KEY, button.dataset.libraryView);
    renderLibraryView();
    renderLibrary();
  });
}
// The bin's own control, on the bin's own screen.
$("library-bin-empty").addEventListener("click", async () => {
  const count = libraryCounts.archived || 0;
  const ok = await confirmDialog(
    `Permanently delete ${count} note${count === 1 ? "" : "s"} in the bin?\n\n` +
      "This cannot be undone."
  );
  if (!ok) return;
  await apiJson("/recycle-bin/empty", { method: "POST" }).catch((e) => toast(e.message, true));
  toast("The bin is empty.");
  loadLibrary();
  loadEntries();
});

// --- bulk actions -------------------------------------------------------------
// The reason the Library is a management screen rather than a nicer list:
// doing one thing to nine things. Every one of these confirms with a *count*,
// because "delete 9 items" is the sentence that stops a mistake and "are you
// sure?" is the one that doesn't.
$("library-clear-selection").addEventListener("click", () => {
  librarySelection = new Set();
  renderLibrary();
});
$("library-bulk-open").addEventListener("click", () => {
  const chosen = librarySelectedItems();
  if (!chosen.length) return;
  // One thing opens; several would be several tab switches ending wherever the
  // last one landed, so the honest answer is to open the first and say so.
  if (chosen.length > 1) toast(`Opening the first of ${chosen.length}.`);
  openLibraryItem(chosen[0]);
});
$("library-bulk-restore").addEventListener("click", async () => {
  const chosen = librarySelectedItems().filter((i) => i.kind === "archived");
  if (!chosen.length) return;
  for (const item of chosen) {
    await apiJson(`/entries/${item.id}/restore`, { method: "POST" }).catch(() => {});
  }
  toast(`Restored ${chosen.length} note${chosen.length === 1 ? "" : "s"}.`);
  loadLibrary();
  loadEntries();
});
$("library-bulk-delete").addEventListener("click", async () => {
  const chosen = librarySelectedItems();
  if (!chosen.length) return;
  // Binned notes are destroyed; everything else is deleted the way its own
  // menu deletes it. Saying which is which in the confirmation matters —
  // "delete" means recoverable for a note and permanent for one already binned.
  const permanent = chosen.filter((i) => i.kind === "archived").length;
  const ok = await confirmDialog(
    `Delete ${chosen.length} item${chosen.length === 1 ? "" : "s"}?\n\n` +
      (permanent
        ? `${permanent} of them ${permanent === 1 ? "is" : "are"} already in the bin and will be destroyed permanently.`
        : "Notes go to the bin; documents and chats are deleted for good.")
  );
  if (!ok) return;
  for (const item of chosen) {
    const route =
      item.kind === "archived"
        ? [`/entries/${item.id}/purge`, "DELETE"]
        : item.kind === "note"
          ? [`/entries/${item.id}`, "DELETE"]
          : item.kind === "document"
            ? [`/documents/${item.id}`, "DELETE"]
            : item.kind === "chat"
              ? [`/conversations/${item.id}`, "DELETE"]
              : item.kind === "file"
                ? [`/files/${item.id}`, "DELETE"]
                : null;
    if (!route) continue;
    await apiJson(route[0], { method: route[1] }).catch(() => {});
  }
  toast(`Deleted ${chosen.length} item${chosen.length === 1 ? "" : "s"}.`);
  loadLibrary();
  loadEntries();
});
$("library-refresh").addEventListener("click", loadLibrary);
$("library-new-doc").addEventListener("click", () => {
  switchTab("documents");
  // The Documents page's own loader opens the last document otherwise, and a
  // new one would be replaced a moment after it appeared.
  setTimeout(() => $("doc-new").click(), 160);
});
// Paint it before any poll lands, so the bar is furniture from the first frame
// rather than four boxes that pop into existence a second later.
renderStatusBar();

$("persona-add").addEventListener("click", addPersona);
$("skill-add").addEventListener("click", addSkill);
$("skill-cancel").addEventListener("click", stopEditingSkill);
$("graph-refresh").addEventListener("click", () => {
  graphHighlightIds = null; // a refresh clears any "similar notes" spotlight
  renderGraph();
});
$("graph-similarity").addEventListener("change", renderGraph);
// The tuned-once controls, folded away. Remembered, because whether you want
// physics sliders on screen is a property of how you use the map rather than
// of one visit — and because a panel that reopens closed every time is one
// people stop opening.
$("graph-options-toggle").addEventListener("click", () => {
  const panel = $("graph-options");
  const open = panel.classList.toggle("hidden") === false;
  $("graph-options-toggle").setAttribute("aria-expanded", String(open));
  $("graph-options-toggle").classList.toggle("is-on", open);
  localStorage.setItem("graph-options-open", open ? "1" : "0");
});
// Trace (§9), folded away the same way Options is (§37F) — it is a mode you
// step into to ask one question, not a strip worth drawing on every visit.
// Closing it does not clear an active trace: the path stays drawn on the map
// itself, the same as Options' sliders keep their values while hidden.
$("graph-trace-toggle").addEventListener("click", () =>
  setTracePanelOpen($("graph-trace").classList.contains("hidden"))
);
$("graph-focus-clear").addEventListener("click", () => {
  graphFocusModeId = null;
  $("graph-focus-clear").classList.add("hidden");
  renderGraph();
  toast("Exited Focus Mode.");
});
$("graph-trace-clear").addEventListener("click", () => clearTrace());
// What the colours mean, remembered like the layout is — it is a property of
// how you read your notebook, not of one visit.
$("graph-colour").addEventListener("change", (event) => {
  localStorage.setItem("graph-colour", event.target.value);
  renderGraph();
});
$("graph-hide-orphans").addEventListener("change", renderGraph);
// Labels toggle just flips a class — no need to rebuild the whole map.
$("graph-labels").addEventListener("change", (e) => {
  $("graph-box").classList.toggle("graph-labels-hidden", !e.target.checked);
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
    // Trigger a resize event to ensure D3 SVG rescales properly
    window.dispatchEvent(new Event('resize'));
    if (graphNodesRef && graphNodesRef.length) {
      setTimeout(() => {
        const box = $("graph-box");
        graphDims.w = box.clientWidth || 800;
        graphDims.h = box.clientHeight || 540;
        if (graphSvg) {
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
$("graph-fullscreen-close")?.addEventListener("click", toggleGraphFullscreen);

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
    try {
      await saveSkillList(merged);
    } catch (error) {
      // The server validates imports the same way it validates the editor —
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
  // The pill reads from this checkbox, so anything else that flips it — a
  // skill that needs tools, a restored preference — has to redraw the pair or
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
// 🧭 Plan — send what is in the box as a request that must be planned first.
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

$("chat-plan").addEventListener("click", async () => {
  const input = $("chat-input");
  const question = input.value.trim();
  if (!question) {
    toast("Type what you want done, then press Plan.", true);
    input.focus();
    return;
  }
  if (!$("tools-toggle").checked) {
    await setChatMode("agent");
    toast("Switched to Request — a plan needs to be able to act.");
  }
  input.value = "";
  autoGrow(input);
  sendChatMessage(`${question}\n\n${PLAN_PREFIX}`, { displayText: question });
});

// Start the user's own engine with the app. See the markup for why this is the
// answer to "web search keeps disabling itself" — it was the container going
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
$("web-reader-ask").addEventListener("click", () => {
  if (webReaderPage) askAboutPage(webReaderPage.url, webReaderPage.title);
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
    // A fresh default for the next one, measured from now.
    setDue(defaultDueValue());
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
  const name = await promptDialog("Name this filter:", query.slice(0, 40), { confirmLabel: "Save filter" });
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

// From Help, go to the Settings section rather than swapping one dialog for
// another — "how do I change a shortcut?" should end somewhere you can find
// again, not in an overlay with no address.
$("about-shortcuts").addEventListener("click", () => showSettingsSection("shortcuts"));
$("shortcuts-reset").addEventListener("click", resetShortcuts);
$("shortcuts-reset-settings").addEventListener("click", resetShortcuts);

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
  const bar = $("searxng-install-progress");
  if (info.installing) {
    const stage = info.install_stage || 1;
    const stages = info.install_stages || 5;
    badge.textContent = `Installing… ${stage}/${stages}`;
    badge.className = "chip";
    start.disabled = true;
    stop.disabled = true;
    $("searxng-host-status").classList.remove("error");
    $("searxng-host-status").textContent =
      info.install_step || "Setting SearXNG up…";
    // Reported: "the searxng reinstall doesn't have a progress bar so idk if
    // it has frozen or is working". The bar moves through the five stages;
    // the line under it is what pip is printing right now, which is what
    // actually distinguishes slow from stuck.
    bar.classList.remove("hidden");
    if (typeof info.install_progress === "number") {
      bar.removeAttribute("data-indeterminate");
      bar.value = info.install_progress;
    } else {
      bar.setAttribute("data-indeterminate", "1");
      bar.removeAttribute("value");
    }
    const said = (info.install_log || []).at(-1);
    $("searxng-install-line").textContent = said || "";
    clearTimeout(refreshSearxngHost.timer);
    refreshSearxngHost.timer = setTimeout(refreshSearxngHost, 2000);
    return;
  }
  bar.classList.add("hidden");
  $("searxng-install-line").textContent = "";
  if (info.install_error) {
    $("searxng-host-status").classList.add("error");
    $("searxng-host-status").textContent = info.install_error;
  } else if (info.detail) {
    // e.g. "Docker isn't running, so it'll be set up in a virtualenv" — an
    // explanation of what will happen, not a failure.
    $("searxng-host-status").classList.remove("error");
    $("searxng-host-status").textContent = info.detail;
  } else {
    // Always say something current. This line used to keep whatever the last
    // poll wrote, so a finished install left "Installing SearXNG…" sitting
    // under a badge reading "Stopped" — reported with a photo, and the
    // install had in fact completed.
    $("searxng-host-status").classList.remove("error");
    $("searxng-host-status").textContent =
      info.state === "stopped"
        ? "Installed and ready — press Start SearXNG."
        : info.state === "running"
          ? "Running."
          : "";
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
  start.textContent = info.state === "absent" ? "▶️ Install & start" : "▶️ Start SearXNG";
  // Keep polling while it's starting, so "Starting…" can't stick forever with
  // no way to tell whether anything is still happening.
  if (info.state === "running" && !info.responding) {
    clearTimeout(refreshSearxngHost.timer);
    refreshSearxngHost.timer = setTimeout(refreshSearxngHost, 3000);
  }
  // What the instance itself printed. Only worth showing when it is not
  // running happily — when it is, its own log is just noise.
  const fold = $("searxng-output-fold");
  const said = (info.output || "").trim();
  fold.classList.toggle("hidden", !said || running);
  if (said) $("searxng-output").textContent = said;

  // The port, answered rather than suggested. Only three states matter, and
  // only one of them is the user's problem to go and solve.
  const port = info.port;
  const portLine = $("searxng-port");
  portLine.textContent = port ? port.detail : "";
  portLine.classList.toggle("error", Boolean(port && !port.free && !port.held_by_searxng));
}

$("searxng-reinstall").addEventListener("click", async () => {
  if (
    !(await confirmDialog(
      "Delete the SearXNG install and set it up again from scratch?\n\n" +
        "Your settings file is kept — only the downloaded copy and its " +
        "virtualenv are removed. Reinstalling takes a few minutes."
    ))
  )
    return;
  const status = $("searxng-host-status");
  status.classList.remove("error");
  status.textContent = "Removing the old install…";
  try {
    await apiJson("/websearch/searxng/reinstall", { method: "POST" });
    status.textContent = "Reinstalling — this takes a few minutes.";
    toast("Reinstalling SearXNG.");
  } catch (error) {
    status.classList.add("error");
    status.textContent = error.message;
  }
  refreshSearxngHost();
});

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
$("llm-provider-apply").addEventListener("click", applyBackendChoice);
// Mark the fields dirty on any edit so the five-second status poll stops
// rewriting them underneath the person typing an address into them.
$("llm-base-url").addEventListener("input", () => (backendFieldsDirty = true));
$("llm-provider-select").addEventListener("change", () => {
  backendFieldsDirty = true;
  // Switching the dropdown should re-suggest that backend's usual address
  // rather than leave the other one's sitting there looking authoritative.
  const defaults = (modelStatus && modelStatus.provider_default_base_urls) || {};
  $("llm-base-url").value = "";
  $("llm-base-url").placeholder = defaults[$("llm-provider-select").value] || "Default address";
});
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
  radio.addEventListener("change", () => {
    $("embedding-model-select").dataset.userChosen = "1";
    // The radio itself needs the latch too: the choice isn't saved until
    // "Apply & re-index", and without this the next status poll put the old
    // backend back the instant focus left the radio.
    radio.dataset.userChosen = "1";
  });
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
  if (e.key === "Escape" && !$("notif-panel").classList.contains("hidden")) {
    closeNotifications();
    $("notif-btn").setAttribute("aria-expanded", "false");
    return;
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
  if (e.key === "Escape" && !$("meeting-overlay").classList.contains("hidden")) {
    closeMeetingRecorder();
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
    "meeting-overlay",
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
  // §27: "before the person's first capture fails silently into
  // Uncategorised and they assume the AI is broken rather than absent" — so
  // this sits before the capture slide, not after. `dynamic` is filled in by
  // `loadOnboardingDiagnostics` once the overlay is actually showing it,
  // reusing /models/status and /storage rather than a new endpoint — both
  // already exist and are already polled elsewhere in the app.
  {
    icon: "🩺",
    title: "Your setup",
    dynamic: true,
  },
  {
    icon: "📝",
    title: "Capture your thoughts",
    text: "Jot anything into the Notes tab and hit Save — the AI files it into a category and suggests tags. No folders to fuss over.",
  },
  {
    icon: "💬",
    title: "Ask your notebook",
    text: "Ask questions in plain English and get answers grounded in your own notes. Switch on Agent mode and it can use its tools — searching your notes, opening a web page, and organising things for you.",
  },
  // Was "Explore your graph" — named just the Graph tab, which is only half
  // of what the app's own name refers to. Naming both here, once, is cheap;
  // leaving a first-time user to discover the Timeline's Line view (§10C) on
  // their own is not (ANALYSIS §30's "product differentiation" note).
  {
    icon: "🗺️",
    title: "Explore your map",
    text: "The Graph tab draws how your notes connect; the Timeline's Line view draws the shape of one thread over time. Together, they're the map MemoryMap is named for — search, drag and zoom to rediscover things you'd forgotten you saved.",
  },
  {
    icon: "🎨",
    title: "Make it yours",
    text: "Settings → Appearance has themes, accent colours, fonts, and more. Press ? any time for keyboard shortcuts. Enjoy!",
  },
];

let onboardingIndex = 0;
// A stale diagnostics fetch (the user clicked Next or Skip before it
// resolved) must never overwrite whichever slide is showing by the time it
// lands — this is what tells a resolved probe whether it still applies.
let onboardingDiagnosticsToken = 0;

// §27's first-run diagnostics: Ollama reachability and where the notebook
// actually lives, both already computed for other UI (the AI-status pill,
// Settings → Data) and just not surfaced before a first capture could fail
// silently into Uncategorised.
async function loadOnboardingDiagnostics(forSlide) {
  const token = ++onboardingDiagnosticsToken;
  const [models, storage] = await Promise.all([
    apiJson("/models/status").catch(() => null),
    apiJson("/storage").catch(() => null),
  ]);
  if (token !== onboardingDiagnosticsToken) return; // superseded by a later slide
  if (onboardingIndex !== forSlide) return; // the user moved on already
  if ($("onboarding-overlay").classList.contains("hidden")) return; // or closed it

  const lines = [];
  lines.push(
    models && models.ollama_running
      ? "✅ Ollama is running, so the AI will file your notes and answer questions."
      : "⚠️ Ollama isn't running right now — MemoryMap still works without it. " +
          "Notes are still searched by keyword, and everything catches up the moment it's on."
  );
  if (storage) {
    const mb = storage.database_bytes
      ? (storage.database_bytes / (1024 * 1024)).toFixed(1)
      : "0";
    lines.push(
      `Your notebook lives at ${storage.data_dir} (${mb} MB so far) — nothing here ever leaves this machine.`
    );
  } else {
    lines.push("Couldn't check where your notebook lives just now.");
  }
  $("onboarding-text").textContent = lines.join(" ");
}

function renderOnboardingSlide() {
  const slide = ONBOARDING_SLIDES[onboardingIndex];
  $("onboarding-icon").textContent = slide.icon;
  $("onboarding-title").textContent = slide.title;
  if (slide.dynamic) {
    $("onboarding-text").textContent = "Checking Ollama and where your notebook lives…";
    loadOnboardingDiagnostics(onboardingIndex);
  } else {
    $("onboarding-text").textContent = slide.text;
  }
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

// The same list is mounted twice — in the ? overlay and in Settings →
// Keyboard shortcuts. Rendering both from one function is what keeps them
// from drifting apart; two copies of this logic is how one of them goes stale.
const SHORTCUT_LIST_IDS = ["shortcut-list", "shortcut-list-settings"];
const SHORTCUT_STATUS_IDS = ["shortcut-status", "shortcut-status-settings"];

function setShortcutStatus(text) {
  for (const id of SHORTCUT_STATUS_IDS) {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
  }
}

function setShortcutStatusError(isError) {
  for (const id of SHORTCUT_STATUS_IDS) {
    document.getElementById(id)?.classList.toggle("error", isError);
  }
}

function renderShortcutList() {
  for (const listId of SHORTCUT_LIST_IDS) {
    const list = document.getElementById(listId);
    if (list) buildShortcutList(list);
  }
}

function buildShortcutList(list) {
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
      setShortcutStatus(
        capturingShortcut ? "Press the keys you want, or Escape to cancel." : ""
      );
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
    setShortcutStatus("");
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
    setShortcutStatusError(true);
    setShortcutStatus(`${combo} is already used for "${clash[1].label}".`);
    return true;
  }
  shortcuts[capturingShortcut].keys = combo;
  saveShortcutOverrides();
  capturingShortcut = null;
  setShortcutStatusError(false);
  setShortcutStatus(`Set to ${combo}.`);
  renderShortcutList();
  return true;
}

function openShortcuts() {
  capturingShortcut = null;
  setShortcutStatus("");
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
  if ($("semantic-search-toggle")?.checked) loadEntries(); // trigger semantic backend search
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
  // The "go to it" link belongs to the note you just saved, not the one you
  // are now writing — drop it as soon as typing starts.
  $("save-status").querySelector(".jump-to-note")?.remove();
});

// Restore an unsaved draft on load.
(() => {
  const draft = localStorage.getItem("captureDraft");
  if (!draft) return;
  const box = $("entry-content");
  box.value = draft;
  autoGrow(box); // a long restored draft shouldn't arrive in a one-line box
  $("entry-count").textContent = `${draft.length} character${draft.length === 1 ? "" : "s"}`;
  const status = $("save-status");
  if (status) status.textContent = "Restored your unsaved draft.";
})();

$("export-md").addEventListener("click", () => downloadExport("markdown"));
$("import-md").addEventListener("click", importMarkdown);
$("import-document").addEventListener("click", importDocument);
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
  // Clears strokes only — the background layer (§37G's uploaded image, or
  // blank white) is untouched, so Clear can't lose the photo being annotated.
  const canvas = $("sketch-canvas");
  canvas.getContext("2d").clearRect(0, 0, canvas.width, canvas.height);
});
$("sketch-upload-image").addEventListener("click", () => $("sketch-image-input").click());
$("sketch-image-input").addEventListener("change", () => {
  const file = $("sketch-image-input").files[0];
  $("sketch-image-input").value = ""; // lets the same file be picked again
  sketchUploadImage(file);
});
$("sketch-size").addEventListener("input", () => {
  sketchPen.size = Number($("sketch-size").value);
});
for (const button of document.querySelectorAll(".sketch-color")) {
  button.addEventListener("click", () => {
    sketchPen.color = button.dataset.color;
    // Picking a colour means you want to draw, not erase. The eraser button
    // was renamed `sketch-tool-eraser` when the toolbar became icons, and this
    // one call kept the old `sketch-eraser` id — so the optional-chain
    // swallowed it and the eraser stayed lit while the pen drew, which reads
    // as the colour swatches not working.
    sketchPen.eraser = false;
    sketchTool = "pen";
    $("sketch-tool-eraser")?.classList.remove("active");
    $("sketch-tool-pen")?.classList.add("active");
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

$("sketch-undo").addEventListener("click", () => {
  if (sketchHistory.length === 0) return;
  const canvas = $("sketch-canvas");
  const ctx = canvas.getContext("2d");
  sketchRedoStack.push(ctx.getImageData(0, 0, canvas.width, canvas.height));
  const last = sketchHistory.pop();
  ctx.putImageData(last, 0, 0);
  sketchDirty = true;
});
$("sketch-redo").addEventListener("click", () => {
  if (sketchRedoStack.length === 0) return;
  const canvas = $("sketch-canvas");
  const ctx = canvas.getContext("2d");
  sketchHistory.push(ctx.getImageData(0, 0, canvas.width, canvas.height));
  const next = sketchRedoStack.pop();
  ctx.putImageData(next, 0, 0);
  sketchDirty = true;
});

const sketchToolsList = ["pen", "highlighter", "eraser", "line", "rect", "circ", "arrow", "text"];
for (const tool of sketchToolsList) {
  const btn = $(`sketch-tool-${tool}`);
  if (btn) {
    btn.addEventListener("click", () => {
      sketchTool = tool === "eraser" ? "pen" : tool;
      sketchPen.eraser = (tool === "eraser");
      for (const t of sketchToolsList) {
        const tBtn = $(`sketch-tool-${t}`);
        if (tBtn) tBtn.classList.toggle("active", t === tool);
      }
    });
  }
}

document.addEventListener("keydown", (e) => {
  if ((e.ctrlKey || e.metaKey) && !$("sketch-overlay").classList.contains("hidden")) {
    if (e.key === "z") {
      if (e.shiftKey) $("sketch-redo").click();
      else $("sketch-undo").click();
      e.preventDefault();
    } else if (e.key === "y") {
      $("sketch-redo").click();
      e.preventDefault();
    }
  }
});

// Wave H: dictation + read-aloud.
$("mic-note").addEventListener("click", () =>
  toggleDictation($("mic-note"), $("entry-content"))
);
$("mic-chat").addEventListener("click", () =>
  toggleDictation($("mic-chat"), $("chat-input"))
);
$("speak-btn").addEventListener("click", () => speakText($("ai-answer").textContent));

// Meeting notes (§17).
$("meeting-close").addEventListener("click", closeMeetingRecorder);
$("meeting-overlay").addEventListener("click", (e) => {
  if (e.target === $("meeting-overlay")) closeMeetingRecorder();
});
$("meeting-record").addEventListener("click", toggleMeetingRecording);
$("meeting-save").addEventListener("click", saveMeetingNote);
$("meeting-discard").addEventListener("click", resetMeetingUI);

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

// ======================= WHITEBOARD LOGIC =======================
let wbZoom = d3.zoom().scaleExtent([0.1, 4]).on("zoom", handleWbZoom);
let wbState = { nodes: [], sketches: [] };
let wbInitialized = false;
// True only between an eraser mousedown and mouseup — the drawing tools
// leave one mark per click-drag, the eraser is meant to remove everything
// the pointer crosses while held, so it needs a "currently held" flag the
// per-item hover handlers in renderWhiteboard can check.
let wbErasing = false;
// {action: "delete"|"create", kind: "sketch"|"node", payload, id}. Bounded
// so an hour of erasing doesn't grow this forever; only the newest matters.
let wbUndoStack = [];
const WB_UNDO_MAX = 20;
// Ids currently mid-DELETE. The eraser's mouseenter can fire again for the
// same still-on-screen item before its first DELETE round-trip resolves (a
// slow request, or the pointer wobbling back over it) — without this a
// second call pushes a second undo entry and fires a second DELETE for
// something already gone, and the 404 catch then pops the *wrong* undo
// entry off the stack (whatever else was pushed in between).
const wbDeleting = new Set();

function handleWbZoom(e) {
  d3.select("#wb-html-layer").style("transform", `translate(${e.transform.x}px, ${e.transform.y}px) scale(${e.transform.k})`);
  d3.select("#wb-zoom-group").attr("transform", e.transform);
}

// A tiny inline SVG baked into a `cursor:` value, so the OS/GPU renders and
// positions it — zero JS on the hot path. This replaces an earlier version
// that tracked the pointer with a `mousemove`-positioned `<div>`: reported
// (and reproduced) as "my mouse keeps snapping to an invisible grid" — a
// JS-positioned cursor only moves on however often `mousemove` actually
// fires, which is both slower and less regular than the compositor placing
// a real cursor image, so on a fast swipe the dot visibly lagged and then
// jumped to catch up. A `cursor:` image has no such step: once set, the
// browser draws it exactly like the system arrow.
function wbCursorUrl(inner, { size = 26, hx = 3, hy = size - 3 } = {}) {
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" ` +
    `viewBox="0 0 ${size} ${size}">${inner}</svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}") ${hx} ${hy}`;
}

const WB_BRUSH_TOOLS = new Set(["draw", "line", "rect", "circle"]);

function wbCursorForTool(tool, strokeColor) {
  const color = /^#[0-9a-fA-F]{3,8}$/.test(strokeColor || "") ? strokeColor : "#ffffff";
  if (WB_BRUSH_TOOLS.has(tool)) {
    // A crosshair with a dot in the actual stroke colour at its centre — a
    // plain crosshair can't say what colour is about to land.
    const inner =
      `<line x1="13" y1="1" x2="13" y2="9" stroke="#000" stroke-opacity=".55" stroke-width="1.5"/>` +
      `<line x1="13" y1="17" x2="13" y2="25" stroke="#000" stroke-opacity=".55" stroke-width="1.5"/>` +
      `<line x1="1" y1="13" x2="9" y2="13" stroke="#000" stroke-opacity=".55" stroke-width="1.5"/>` +
      `<line x1="17" y1="13" x2="25" y2="13" stroke="#000" stroke-opacity=".55" stroke-width="1.5"/>` +
      `<circle cx="13" cy="13" r="4" fill="${color}" stroke="#000" stroke-opacity=".45"/>`;
    return `${wbCursorUrl(inner, { hx: 13, hy: 13 })}, crosshair`;
  }
  if (tool === "eraser") {
    const inner =
      `<g transform="rotate(-30 13 13)">` +
      `<rect x="4" y="9" width="16" height="10" rx="2" fill="#f4d9d9" stroke="#8a4a4a" stroke-width="1.5"/>` +
      `<rect x="4" y="9" width="7" height="10" rx="2" fill="#e7bcbc"/>` +
      `</g>`;
    return `${wbCursorUrl(inner, { hx: 6, hy: 20 })}, cell`;
  }
  if (tool === "delete") {
    const inner =
      `<path d="M6 7h14M11 7V4h4v3M9 7l1 15h6l1-15" fill="none" stroke="#d9534f" ` +
      `stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>`;
    return `${wbCursorUrl(inner, { hx: 13, hy: 3 })}, not-allowed`;
  }
  if (tool === "link-straight" || tool === "link-curved") return "crosshair";
  return ""; // pan: the CSS grab/grabbing pair already says it
}

function wbPushUndo(entry) {
  wbUndoStack.push(entry);
  if (wbUndoStack.length > WB_UNDO_MAX) wbUndoStack.shift();
  const btn = document.getElementById("wb-undo");
  if (btn) btn.disabled = false;
}

// Reverses the single most recent create or delete — a sketch stroke, a
// shape, a link, or a note card. Asked for implicitly by adding an eraser:
// a tool whose whole job is deleting things you swipe over needs a safety
// net more than any other control on this toolbar.
async function wbUndo() {
  const entry = wbUndoStack.pop();
  const btn = document.getElementById("wb-undo");
  if (btn) btn.disabled = wbUndoStack.length === 0;
  if (!entry) return;
  const base = entry.kind === "sketch" ? "/whiteboard/sketches" : "/whiteboard/nodes";
  const list = entry.kind === "sketch" ? "sketches" : "nodes";
  try {
    if (entry.action === "delete") {
      const restored = await apiJson(base, { method: "POST", body: JSON.stringify(entry.payload) });
      wbState[list].push(restored);
    } else {
      await apiJson(`${base}/${entry.id}`, { method: "DELETE" });
      wbState[list] = wbState[list].filter((item) => item.id !== entry.id);
    }
    renderWhiteboard();
  } catch {
    toast("Couldn't undo that.", true);
  }
}

async function initWhiteboard() {
  if (wbInitialized) return;
  wbInitialized = true;
  
  const container = d3.select("#whiteboard-container");
  container.call(wbZoom).on("dblclick.zoom", null);
  
  // Toolbar hooks
  document.getElementById("wb-zoom-in").addEventListener("click", () => container.transition().call(wbZoom.scaleBy, 1.2));
  document.getElementById("wb-zoom-out").addEventListener("click", () => container.transition().call(wbZoom.scaleBy, 0.8));
  document.getElementById("wb-zoom-fit").addEventListener("click", () => container.transition().call(wbZoom.transform, d3.zoomIdentity));
  
  // Sidebar toggling
  const setWbLibraryOpen = (open) => {
    const sidebar = $("whiteboard-sidebar");
    sidebar.classList.toggle("hidden", !open);
    $("wb-add-note")?.classList.toggle("is-on", open);
    if (open) renderWbLibrary();
  };
  $("wb-add-note").addEventListener("click", () => {
    // Toggling on the class rather than reading it back: the panel covers the
    // toggle, so "click it again to close" was not reachable.
    setWbLibraryOpen($("whiteboard-sidebar").classList.contains("hidden"));
  });
  $("wb-library-close")?.addEventListener("click", () => setWbLibraryOpen(false));

  const btnAddSketch = document.getElementById("wb-add-sketch");
  if (btnAddSketch) {
    btnAddSketch.addEventListener("click", () => {
      openSketch();
    });
  }

  const boardSelect = document.getElementById("wb-board-select");
  if (boardSelect) {
    boardSelect.addEventListener("change", async (e) => {
      window.currentBoardId = e.target.value || null;
      await fetchWhiteboardState();
      renderWhiteboard();
    });
  }

  // Board background colour, asked for directly — the ambient generative-art
  // canvas showed straight through the board before this (`--wb-board-bg`,
  // declared in :root, is the fix for anyone who never touches the picker).
  // `input` previews live while dragging the swatch; `change` (fires once,
  // on release/close) is what actually persists, so dragging across ten
  // hues doesn't write ten times.
  const bgColorPicker = document.getElementById("wb-bg-color-picker");
  if (bgColorPicker) {
    const savedBg = localStorage.getItem("wb-bg-color");
    if (savedBg) {
      container.node().style.setProperty("--wb-board-bg", savedBg);
      bgColorPicker.value = savedBg;
    } else {
      // Reflect the real default (the theme's --modal-bg) in the swatch,
      // not an arbitrary placeholder that doesn't match what's on screen.
      const rgb = getComputedStyle(container.node()).backgroundColor;
      const m = rgb.match(/(\d+),\s*(\d+),\s*(\d+)/);
      if (m) {
        bgColorPicker.value =
          "#" + m.slice(1, 4).map((n) => Number(n).toString(16).padStart(2, "0")).join("");
      }
    }
    bgColorPicker.addEventListener("input", (e) => {
      container.node().style.setProperty("--wb-board-bg", e.target.value);
    });
    bgColorPicker.addEventListener("change", (e) => {
      localStorage.setItem("wb-bg-color", e.target.value);
    });
  }

  // Draggable toolbar panels, asked for directly. Only the small ⠿ grip
  // starts a drag — the panels are almost entirely buttons and inputs, so
  // "grab anywhere on the panel" would fight every click they already
  // handle. Clamped to `#library-view-whiteboard`'s own box, which is the
  // visible window for this view (it fills the tab below the header), so a
  // dragged panel stops at the edge instead of sliding out under the tab bar
  // or off the side of the screen.
  function makeWbPanelDraggable(panel, storageKey) {
    const grip = panel.querySelector(".wb-panel-grip");
    const bounds = document.getElementById("library-view-whiteboard");
    if (!grip || !bounds) return;

    function clamp(left, top) {
      const boundsRect = bounds.getBoundingClientRect();
      const panelRect = panel.getBoundingClientRect();
      const maxLeft = Math.max(0, boundsRect.width - panelRect.width);
      const maxTop = Math.max(0, boundsRect.height - panelRect.height);
      return [Math.min(Math.max(0, left), maxLeft), Math.min(Math.max(0, top), maxTop)];
    }

    function place(left, top) {
      panel.style.left = `${left}px`;
      panel.style.top = `${top}px`;
      panel.style.right = "auto";
      panel.style.bottom = "auto";
      // The bottom-center panel is horizontally centred via `left: 50%` +
      // `transform: translateX(-50%)` — a centring trick, not a drag offset.
      // Left uncleared, an explicit `left` still renders shifted left by
      // half the panel's own width, so a drag ends up visibly ~200px from
      // wherever the pointer actually released it (found by measuring, not
      // by reading the CSS — the rendered box and the styled `left` disagreed
      // by exactly panelWidth / 2).
      panel.style.transform = "none";
    }

    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try {
        const { left, top } = JSON.parse(saved);
        const [cLeft, cTop] = clamp(left, top);
        place(cLeft, cTop);
      } catch {
        // A corrupt saved value is not worth failing over — the panel just
        // keeps its CSS-anchored corner instead.
      }
    }

    let dragging = false;
    let startX = 0;
    let startY = 0;
    let startLeft = 0;
    let startTop = 0;

    grip.addEventListener("pointerdown", (e) => {
      dragging = true;
      grip.setPointerCapture(e.pointerId);
      grip.classList.add("is-dragging");
      const panelRect = panel.getBoundingClientRect();
      const boundsRect = bounds.getBoundingClientRect();
      // Converts from whichever CSS corner (top-left/top-right/…) the panel
      // started anchored to into an explicit left/top box, so the first drag
      // of a session moves it from wherever it visually is rather than
      // snapping somewhere else first.
      startLeft = panelRect.left - boundsRect.left;
      startTop = panelRect.top - boundsRect.top;
      startX = e.clientX;
      startY = e.clientY;
      place(startLeft, startTop);
      e.preventDefault();
    });

    grip.addEventListener("pointermove", (e) => {
      if (!dragging) return;
      const [left, top] = clamp(startLeft + (e.clientX - startX), startTop + (e.clientY - startY));
      place(left, top);
    });

    function endDrag(e) {
      if (!dragging) return;
      dragging = false;
      grip.classList.remove("is-dragging");
      if (e?.pointerId != null) grip.releasePointerCapture?.(e.pointerId);
      localStorage.setItem(
        storageKey,
        JSON.stringify({ left: parseFloat(panel.style.left) || 0, top: parseFloat(panel.style.top) || 0 })
      );
    }
    grip.addEventListener("pointerup", endDrag);
    grip.addEventListener("pointercancel", endDrag);

    // The box can resize (window resize, the library sidebar opening) after
    // a position was saved for a larger one — reclamp so a panel never ends
    // up partly or fully off-screen.
    new ResizeObserver(() => {
      if (!panel.style.left) return;
      const [left, top] = clamp(parseFloat(panel.style.left), parseFloat(panel.style.top));
      place(left, top);
    }).observe(bounds);
  }

  document.querySelectorAll(".whiteboard-floating-panel[data-panel-id]").forEach((panel) => {
    makeWbPanelDraggable(panel, `wb-panel-pos-${panel.dataset.panelId}`);
  });

  // Tool Selection
  window.currentTool = "pan";
  let isDrawing = false;
  let currentDrawPath = null;
  let currentDrawData = []; // array of [x, y]
  window.currentStrokeColor = "#ffffff";
  // Shared with the mousedown handler below, so the cursor preview drawn
  // here is never a different size than what actually gets drawn.
  const WB_STROKE_WIDTH = 3;

  const toolGroup = document.getElementById("wb-tool-group");
  const colorPicker = document.getElementById("wb-color-picker");
  const containerEl = document.getElementById("whiteboard-container");
  const undoBtn = document.getElementById("wb-undo");

  function updateWbCursor() {
    containerEl.setAttribute("data-current-tool", window.currentTool);
    containerEl.style.cursor = wbCursorForTool(window.currentTool, window.currentStrokeColor);
  }

  // The one place a tool switch happens, so the toolbar click and the
  // keyboard shortcuts below can never drift out of sync with each other.
  function selectWbTool(tool) {
    window.currentTool = tool;
    if (toolGroup) {
      toolGroup.querySelectorAll("button[data-tool]").forEach((b) => {
        b.classList.toggle("active", b.dataset.tool === tool);
      });
    }
    if (tool !== "pan") {
      container.on(".zoom", null); // disable zoom-drag so it can't fight drawing
    } else {
      container.call(wbZoom).on("dblclick.zoom", null);
    }
    updateWbCursor();
  }

  if (toolGroup) {
    toolGroup.addEventListener("click", (e) => {
      const btn = e.target.closest("button[data-tool]");
      if (btn) selectWbTool(btn.dataset.tool);
    });
  }

  if (colorPicker) {
    colorPicker.addEventListener("change", (e) => {
      window.currentStrokeColor = e.target.value;
      updateWbCursor();
    });
  }

  if (undoBtn) {
    undoBtn.disabled = true;
    undoBtn.addEventListener("click", wbUndo);
  }

  // Keyboard shortcuts, asked for as part of the wider usability pass: a
  // toolbar of eight icon buttons is not obviously faster than the tool you
  // already have your hand on, and every serious drawing app (Figma,
  // Excalidraw, tldraw) uses this exact letter set for exactly that reason —
  // muscle memory transfers in, rather than having to be learned from
  // scratch. Guarded to the whiteboard sub-tab and away from anything with
  // its own idea of what typing means (an input, a textarea, a
  // contenteditable note), the same guard the app's other global shortcuts
  // already use.
  const WB_TOOL_KEYS = {
    v: "pan",
    h: "pan",
    p: "draw",
    l: "line",
    r: "rect",
    o: "circle",
    e: "eraser",
    x: "delete",
  };
  document.addEventListener("keydown", (e) => {
    const view = document.getElementById("library-view-whiteboard");
    if (!view || view.classList.contains("hidden")) return;
    const tag = (document.activeElement?.tagName || "").toLowerCase();
    if (tag === "input" || tag === "textarea" || document.activeElement?.isContentEditable) return;
    if (e.key === "Escape") {
      selectWbTool("pan");
      return;
    }
    if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === "z") {
      e.preventDefault();
      wbUndo();
      return;
    }
    if (e.ctrlKey || e.metaKey || e.altKey) return; // leave browser/OS shortcuts alone
    const mapped = WB_TOOL_KEYS[e.key.toLowerCase()];
    if (mapped) selectWbTool(mapped);
  });

  selectWbTool("pan"); // the initial state

  // Drawing event handlers on the SVG itself or container
  const svgCanvas = document.getElementById("wb-svg-layer");
  
  function getLogicalMouse(e) {
    const transform = d3.zoomTransform(document.getElementById("whiteboard-container"));
    const rect = svgCanvas.getBoundingClientRect();
    const x = (e.clientX - rect.left - transform.x) / transform.k;
    const y = (e.clientY - rect.top - transform.y) / transform.k;
    return [x, y];
  }
  
  // The eraser doesn't draw — it deletes whatever the pointer crosses while
  // held, which is renderWhiteboard's job (it owns the sketch/node elements
  // this has to hit-test against). All this needs to track is "is the
  // button currently down", on the container so it works over both the SVG
  // sketch layer and the HTML card layer.
  containerEl.addEventListener("mousedown", (e) => {
    if (window.currentTool === "eraser") wbErasing = true;
  });
  window.addEventListener("mouseup", () => {
    wbErasing = false;
  });

  svgCanvas.addEventListener("mousedown", (e) => {
    if (!WB_BRUSH_TOOLS.has(window.currentTool)) return;
    e.stopPropagation();
    isDrawing = true;
    const [x, y] = getLogicalMouse(e);
    
    currentDrawData = [[x, y]];
    currentDrawPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
    currentDrawPath.setAttribute("fill", "none");
    currentDrawPath.setAttribute("stroke", window.currentStrokeColor);
    currentDrawPath.setAttribute("stroke-width", String(WB_STROKE_WIDTH));
    currentDrawPath.setAttribute("stroke-linecap", "round");
    currentDrawPath.setAttribute("stroke-linejoin", "round");
    currentDrawPath.setAttribute("d", `M ${x} ${y}`);
    document.getElementById("wb-zoom-group").appendChild(currentDrawPath);
  });
  
  svgCanvas.addEventListener("mousemove", (e) => {
    if (!isDrawing || !WB_BRUSH_TOOLS.has(window.currentTool)) return;
    e.stopPropagation();
    const [x, y] = getLogicalMouse(e);
    
    if (window.currentTool === "draw") {
      currentDrawData.push([x, y]);
      const d = currentDrawData.map((pt, i) => (i === 0 ? `M ${pt[0]} ${pt[1]}` : `L ${pt[0]} ${pt[1]}`)).join(" ");
      currentDrawPath.setAttribute("d", d);
    } else {
      // Shape tools: only start and current point matter
      const [sx, sy] = currentDrawData[0];
      if (window.currentTool === "line") {
        currentDrawPath.setAttribute("d", `M ${sx} ${sy} L ${x} ${y}`);
      } else if (window.currentTool === "rect") {
        const mx = Math.min(sx, x), my = Math.min(sy, y);
        const w = Math.abs(x - sx), h = Math.abs(y - sy);
        currentDrawPath.setAttribute("d", `M ${mx} ${my} h ${w} v ${h} h ${-w} Z`);
      } else if (window.currentTool === "circle") {
        const rx = Math.abs(x - sx), ry = Math.abs(y - sy);
        currentDrawPath.setAttribute("d", `M ${sx - rx} ${sy} a ${rx} ${ry} 0 1 0 ${rx * 2} 0 a ${rx} ${ry} 0 1 0 ${-rx * 2} 0`);
      }
    }
  });
  
  svgCanvas.addEventListener("mouseup", async (e) => {
    if (!isDrawing || !WB_BRUSH_TOOLS.has(window.currentTool)) return;
    e.stopPropagation();
    isDrawing = false;
    
    const [x, y] = getLogicalMouse(e);
    const [sx, sy] = currentDrawData[0];
    
    // Check if user actually dragged
    if (window.currentTool === "draw" && currentDrawData.length < 2) {
      if (currentDrawPath) currentDrawPath.remove();
      currentDrawPath = null;
      return;
    } else if (window.currentTool !== "draw" && Math.abs(x - sx) < 2 && Math.abs(y - sy) < 2) {
      if (currentDrawPath) currentDrawPath.remove();
      currentDrawPath = null;
      return;
    }
    
    // Save sketch to API
    const d = currentDrawPath.getAttribute("d");
    const sketchData = {
      data: d, // store the SVG path data
      x: 0,
      y: 0,
      z: 5,
      board_id: window.currentBoardId
    };
    
    // We want to persist the color as well, but wait, the backend schema doesn't have a color field!
    // We can embed color into data or just ignore for now since it's an MVP. Let's just embed it in data like so:
    // data: `<path d="..." stroke="#..."/>` or since we only render `path d`, we can just wait... 
    // `renderWhiteboard` assigns `d => d.data`. If `d.data` is just the `d` string, all paths get `--text-color`.
    // Let's modify data to be a JSON string holding `{ d, color }` instead!
    sketchData.data = JSON.stringify({ d, color: currentStrokeColor });

    try {
      const res = await apiJson("/whiteboard/sketches", { method: "POST", body: JSON.stringify(sketchData) });
      wbState.sketches.push(res);
      wbPushUndo({ action: "create", kind: "sketch", id: res.id });
      // Hand off to renderWhiteboard's own data-bound element for this
      // sketch — a real bug found while adding the eraser: this raw `<path>`
      // is not part of the `g.sketch-group` selection renderWhiteboard binds
      // wbState.sketches to, so a stroke just drawn had no way to be deleted
      // or erased until a full reload re-fetched it from the server and
      // rendered it "properly" the first time.
      currentDrawPath.remove();
      renderWhiteboard();
    } catch (err) {
      console.error("Failed to save sketch:", err);
      if (currentDrawPath) currentDrawPath.remove();
    }

    currentDrawPath = null;
    currentDrawData = [];
  });

  // Drop handler for Library
  document.getElementById("whiteboard-container").addEventListener("dragover", (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
  });
  
  document.getElementById("whiteboard-container").addEventListener("drop", async (e) => {
    e.preventDefault();
    const entryId = e.dataTransfer.getData("text/plain");
    if (!entryId) return;
    
    // We need to figure out coordinates relative to the transformed html layer
    const canvasEl = document.getElementById("wb-html-layer");
    const transform = d3.zoomTransform(document.getElementById("whiteboard-container"));
    const rect = canvasEl.getBoundingClientRect();
    
    // Calculate logical x,y
    const logicalX = (e.clientX - rect.left - transform.x) / transform.k;
    const logicalY = (e.clientY - rect.top - transform.y) / transform.k;
    
    const nodeData = {
      entry_id: parseInt(entryId, 10),
      x: logicalX,
      y: logicalY,
      z: 10,
      board_id: window.currentBoardId
    };
    
    try {
      const res = await apiJson("/whiteboard/nodes", { method: "POST", body: JSON.stringify(nodeData) });
      // If it exists in state already, replace it. Otherwise push.
      const idx = wbState.nodes.findIndex(n => n.id === res.id);
      if (idx !== -1) wbState.nodes[idx] = res;
      else wbState.nodes.push(res);
      renderWhiteboard();
    } catch (err) {
      console.error("Error creating node:", err);
    }
  });


  
  await fetchWhiteboardState();
  renderWhiteboard();
}

function renderWbLibrary() {
  const list = document.getElementById("wb-library-list");
  list.innerHTML = "";
  for (const entry of allEntries) {
    const li = document.createElement("li");
    li.className = "wb-library-item";
    const text = entry.content || entry.preview || "";
    li.textContent = text ? (text.length > 40 ? text.substring(0, 40) + "..." : text) : entry.id;
    li.draggable = true;
    li.addEventListener("dragstart", (e) => {
      e.dataTransfer.setData("text/plain", entry.id);
      e.dataTransfer.effectAllowed = "copy";
    });
    list.appendChild(li);
  }
}

window.currentBoardId = null;

async function fetchWhiteboardState() {
  try {
    const url = window.currentBoardId ? `/whiteboard/?board_id=${window.currentBoardId}` : "/whiteboard/";
    const res = await apiJson(url);
    wbState = res;
    
    // Also update board dropdown
    const select = document.getElementById("wb-board-select");
    if (select) {
      // populate if not populated
      if (select.options.length <= 1 && allEntries.length > 0) {
        allEntries.forEach(e => {
          const opt = document.createElement("option");
          opt.value = e.id;
          // `title`/`preview` are not fields on an entry — the only text an
          // entry carries is `content` — so this always fell through to
          // "Note 25", and a list of id numbers is not a list of boards.
          const words = notePreviewText ? notePreviewText(e.content || "") : (e.content || "");
          const label = words.trim().slice(0, 38) || `Note ${e.id}`;
          opt.textContent = words.length > 38 ? `${label}…` : label;
          select.appendChild(opt);
        });
      }
      select.value = window.currentBoardId || "";
    }
  } catch (err) {
    console.error("Whiteboard fetch error:", err);
  }
}

function renderWhiteboard() {
  document
    .getElementById("wb-empty-hint")
    ?.classList.toggle("hidden", (wbState.nodes?.length || 0) + (wbState.sketches?.length || 0) > 0);

  // Render Sketches (SVG)
  const svgGroup = d3.select("#wb-zoom-group");
  const sketchSelection = svgGroup.selectAll("g.sketch-group")
    .data(wbState.sketches || [], d => d.id);
    
  // Deleting a sketch two ways: "delete" is a click on the one thing you
  // mean to remove; "eraser" is a drag — mouseenter fires for everything the
  // pointer crosses while wbErasing is true, matching how an eraser tool
  // behaves in every other drawing app.
  async function deleteSketch(d) {
    const deletingKey = `sketch:${d.id}`;
    if (wbDeleting.has(deletingKey)) return;
    wbDeleting.add(deletingKey);
    wbPushUndo({
      action: "delete",
      kind: "sketch",
      payload: { data: d.data, board_id: d.board_id, x: d.x, y: d.y, z: d.z },
    });
    try {
      await apiJson(`/whiteboard/sketches/${d.id}`, { method: "DELETE" });
      wbState.sketches = wbState.sketches.filter((s) => s.id !== d.id);
      renderWhiteboard();
    } catch (e) {
      console.error(e);
      wbUndoStack.pop(); // the delete never happened, so neither did the undo entry
    } finally {
      wbDeleting.delete(deletingKey);
    }
  }

  const sketchEnter = sketchSelection.enter()
    .append("g")
    .attr("class", "sketch-group")
    .attr("data-id", d => d.id)
    .style("cursor", () => (window.currentTool === "delete" || window.currentTool === "eraser") ? "pointer" : "default")
    .on("click", (event, d) => {
      if (window.currentTool === "delete") deleteSketch(d);
    })
    .on("mouseenter", (event, d) => {
      if (window.currentTool === "eraser" && wbErasing) deleteSketch(d);
    });

  sketchEnter.append("path")
    .attr("class", "sketch-hitbox")
    .attr("fill", "none")
    .attr("stroke", "transparent")
    .attr("stroke-width", "20")
    .attr("pointer-events", "stroke");

  sketchEnter.append("path")
    .attr("class", "sketch-path")
    .attr("fill", "none")
    .attr("stroke-width", "3")
    .attr("stroke-linecap", "round")
    .attr("stroke-linejoin", "round")
    .attr("pointer-events", "none");

  const sketchUpdate = sketchEnter.merge(sketchSelection);

  sketchUpdate.each(function(d) {
    let pathData = d.data;
    let stroke = "var(--text-color)";
    try {
      const parsed = JSON.parse(d.data);
      if (parsed.d) {
        pathData = parsed.d;
        stroke = parsed.color || stroke;
      } else if (parsed.type && parsed.type.startsWith("link-")) {
        stroke = parsed.color || stroke;
        const source = wbState.nodes.find(n => n.id === parsed.sourceId);
        const target = wbState.nodes.find(n => n.id === parsed.targetId);
        if (source && target) {
           const sx = source.x + 125, sy = source.y + 75;
           const tx = target.x + 125, ty = target.y + 75;
           if (parsed.type === "link-straight") {
              pathData = `M ${sx} ${sy} L ${tx} ${ty}`;
           } else {
              const dx = tx - sx;
              pathData = `M ${sx} ${sy} C ${sx + dx/2} ${sy}, ${tx - dx/2} ${ty}, ${tx} ${ty}`;
           }
        } else {
           pathData = "";
        }
      }
    } catch(e) {}
    d3.select(this).select(".sketch-hitbox").attr("d", pathData);
    d3.select(this).select(".sketch-path").attr("d", pathData).attr("stroke", stroke);
  });
    
  sketchSelection.exit().remove();

  // Render Nodes (Cards)
  const canvas = d3.select("#wb-html-layer");
  const nodeSelection = canvas.selectAll(".wb-card.node-card")
    .data(wbState.nodes, d => d.id);
    
  async function deleteNode(d) {
    const deletingKey = `node:${d.id}`;
    if (wbDeleting.has(deletingKey)) return;
    wbDeleting.add(deletingKey);
    wbPushUndo({
      action: "delete",
      kind: "node",
      payload: { entry_id: d.entry_id, board_id: d.board_id, x: d.x, y: d.y, z: d.z },
    });
    try {
      await apiJson(`/whiteboard/nodes/${d.id}`, { method: "DELETE" });
      wbState.nodes = wbState.nodes.filter((n) => n.id !== d.id);
      // also delete links connected to it? For MVP just delete the node.
      renderWhiteboard();
    } catch (e) {
      console.error(e);
      wbUndoStack.pop();
    } finally {
      wbDeleting.delete(deletingKey);
    }
  }

  const nodeEnter = nodeSelection.enter()
    .append("div")
    .attr("class", "wb-card node-card")
    .style("transform", d => `translate(${d.x}px, ${d.y}px)`)
    .style("z-index", d => d.z)
    .call(d3.drag()
      .on("start", dragStart)
      .on("drag", dragging)
      .on("end", dragEndNode))
    .on("click", (event, d) => {
      if (window.currentTool === "delete") deleteNode(d);
    })
    .on("mouseenter", (event, d) => {
      if (window.currentTool === "eraser" && wbErasing) deleteNode(d);
    });
      
  nodeEnter.append("div")
    .attr("class", "wb-card-content")
    .html(d => {
      const entry = allEntries.find(e => String(e.id) === String(d.entry_id));
      const text = entry ? (entry.content || entry.preview || "") : "";
      return entry ? (text ? escapeHtml(text.length > 100 ? text.substring(0, 100) + "..." : text) : "Empty note") : "Loading...";
    });
    
  nodeSelection.merge(nodeEnter)
    .style("transform", d => `translate(${d.x}px, ${d.y}px)`)
    .style("z-index", d => d.z);
    
  nodeSelection.exit().remove();
}

function dragStart(event, d) {
  // Eraser/delete don't move cards — a swipe meant to erase a run of cards
  // must not also drag the first one it touches out from under the pointer.
  if (window.currentTool === "eraser" || window.currentTool === "delete") return;
  if (window.currentTool && window.currentTool.startsWith("link-")) {
    d.linkStartPos = { x: d.x + 125, y: d.y + 50 }; // approx center
    d.linkingPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
    d.linkingPath.setAttribute("fill", "none");
    d.linkingPath.setAttribute("stroke", window.currentStrokeColor || "#ffffff");
    d.linkingPath.setAttribute("stroke-width", "3");
    document.getElementById("wb-zoom-group").appendChild(d.linkingPath);
  } else {
    d3.select(this).raise();
  }
}

function dragging(event, d) {
  if (window.currentTool === "eraser" || window.currentTool === "delete") return;
  if (window.currentTool && window.currentTool.startsWith("link-")) {
    const transform = d3.zoomTransform(document.getElementById("whiteboard-container"));
    const rect = document.getElementById("wb-svg-layer").getBoundingClientRect();
    const mx = (event.sourceEvent.clientX - rect.left - transform.x) / transform.k;
    const my = (event.sourceEvent.clientY - rect.top - transform.y) / transform.k;
    
    const sx = d.linkStartPos.x, sy = d.linkStartPos.y;
    if (window.currentTool === "link-straight") {
      d.linkingPath.setAttribute("d", `M ${sx} ${sy} L ${mx} ${my}`);
    } else {
      const dx = mx - sx;
      d.linkingPath.setAttribute("d", `M ${sx} ${sy} C ${sx + dx/2} ${sy}, ${mx - dx/2} ${my}, ${mx} ${my}`);
    }
  } else {
    d.x += event.dx;
    d.y += event.dy;
    d3.select(this).style("transform", `translate(${d.x}px, ${d.y}px)`);
    // re-render links so they move with the node
    renderWhiteboard();
  }
}

async function dragEndNode(event, d) {
  if (window.currentTool && window.currentTool.startsWith("link-")) {
    if (d.linkingPath) d.linkingPath.remove();
    d.linkingPath = null;
    
    const transform = d3.zoomTransform(document.getElementById("whiteboard-container"));
    const rect = document.getElementById("wb-svg-layer").getBoundingClientRect();
    const mx = (event.sourceEvent.clientX - rect.left - transform.x) / transform.k;
    const my = (event.sourceEvent.clientY - rect.top - transform.y) / transform.k;
    
    let targetNode = null;
    for (const node of wbState.nodes) {
       if (node.id === d.id) continue;
       if (mx >= node.x && mx <= node.x + 250 && my >= node.y && my <= node.y + 150) {
           targetNode = node; break;
       }
    }
    
    if (targetNode) {
       const sketchData = {
         data: JSON.stringify({
            type: window.currentTool,
            sourceId: d.id,
            targetId: targetNode.id,
            color: window.currentStrokeColor || "#ffffff"
         }),
         x: 0, y: 0, z: 1,
         board_id: window.currentBoardId
       };
       try {
         const res = await apiJson("/whiteboard/sketches", { method: "POST", body: JSON.stringify(sketchData) });
         wbState.sketches.push(res);
         wbPushUndo({ action: "create", kind: "sketch", id: res.id });
         renderWhiteboard();
       } catch (err) {
         console.error(err);
       }
    }
  } else {
    // Sync back to API.
    //
    // `board_id` has to go with it. The server takes the whole node on a PUT,
    // so omitting it read as "move this to the global board" — dragging a card
    // on a named board silently moved it off that board.
    //
    // And a 404 here is recoverable rather than fatal: it means this client's
    // copy of the board is stale (the note was purged, or the board was
    // rebuilt). Refetching puts the screen back in step; leaving it, as this
    // did, shows a card sitting where you dropped it that is not saved
    // anywhere — the worst of both answers.
    try {
      await apiJson(`/whiteboard/nodes/${d.id}`, {
        method: "PUT",
        body: JSON.stringify({
          entry_id: d.entry_id,
          board_id: d.board_id ?? window.currentBoardId ?? null,
          x: d.x, y: d.y, z: d.z,
        }),
      });
    } catch (err) {
      recordBrowserLog("WARN", [`[Whiteboard] card ${d.id} is stale — reloading the board`]);
      await fetchWhiteboardState();
      renderWhiteboard();
    }
  }
}

// Hook into the library subtabs to switch views and initialize whiteboard
document.addEventListener("DOMContentLoaded", () => {
  const librarySubtabs = document.getElementById("library-subtabs");
  if (librarySubtabs) {
    const buttons = librarySubtabs.querySelectorAll("button");
    const sections = ["library-view-documents", "library-view-skills", "library-view-whiteboard"];
    
    buttons.forEach(btn => {
      btn.addEventListener("click", () => {
        buttons.forEach(b => {
          b.classList.remove("active");
          b.setAttribute("aria-selected", "false");
        });
        btn.classList.add("active");
        btn.setAttribute("aria-selected", "true");
        
        const targetId = btn.getAttribute("data-target");
        sections.forEach(id => {
          const el = document.getElementById(id);
          if (el) {
            if (id === targetId) {
              el.classList.remove("hidden");
            } else {
              el.classList.add("hidden");
            }
          }
        });
        
        if (targetId === "library-view-whiteboard") {
          setTimeout(initWhiteboard, 50);
        }
      });
    });
  }
});

// ======================= FLOATING FORMAT MENU =======================
function initFloatingFormatMenu() {
  const menu = document.getElementById("floating-format-menu");
  if (!menu) return;

  const validTargets = ["doc-content", "entry-content", "chat-input", "draft-text"];
  let activeTextarea = null;

  document.addEventListener("selectionchange", () => {
    const active = document.activeElement;
    if (active && active.tagName === "TEXTAREA" && validTargets.includes(active.id)) {
      if (active.selectionStart !== active.selectionEnd) {
        // Text is selected
        activeTextarea = active;
        // Approximation for popup: center top of textarea or near mouse
        // We'll use getBoundingClientRect of textarea as a fallback
        const rect = active.getBoundingClientRect();
        // Just put it above the textarea for simplicity, or ideally above the selection.
        // Doing exact caret coords in textarea requires a library, so we center it on the textarea horizontally,
        // and place it near the top of the textarea.
        menu.style.left = `${rect.left + rect.width / 2}px`;
        menu.style.top = `${rect.top}px`;
        menu.classList.remove("hidden");
      } else {
        menu.classList.add("hidden");
        activeTextarea = null;
      }
    } else {
      menu.classList.add("hidden");
    }
  });

  menu.addEventListener("mousedown", (e) => {
    // Prevent menu mousedown from stealing focus from the textarea
    e.preventDefault();
  });

  menu.addEventListener("click", (e) => {
    const btn = e.target.closest("button");
    if (!btn || !activeTextarea) return;
    
    const format = btn.dataset.format;
    const start = activeTextarea.selectionStart;
    const end = activeTextarea.selectionEnd;
    const text = activeTextarea.value;
    const selectedText = text.substring(start, end);
    let wrapped = selectedText;
    let offset = 0;

    switch (format) {
      case "bold":
        wrapped = `**${selectedText}**`;
        offset = 2;
        break;
      case "italic":
        wrapped = `*${selectedText}*`;
        offset = 1;
        break;
      case "strikethrough":
        wrapped = `~~${selectedText}~~`;
        offset = 2;
        break;
      case "code":
        wrapped = `\`${selectedText}\``;
        offset = 1;
        break;
      case "link":
        wrapped = `[${selectedText}](url)`;
        offset = 1;
        break;
    }

    activeTextarea.setRangeText(wrapped, start, end, "select");
    // Move selection inside the markdown tags
    if (format === "link") {
      activeTextarea.setSelectionRange(start + selectedText.length + 3, start + selectedText.length + 6);
    } else {
      activeTextarea.setSelectionRange(start + offset, start + offset + selectedText.length);
    }
    
    // Trigger input event so React/app knows it changed
    activeTextarea.dispatchEvent(new Event("input", { bubbles: true }));
  });
}



// ======================= SKILLS DASHBOARD TAB =======================

async function renderSkillsDashboard() {
  const container = document.getElementById("skills-dashboard-list");
  if (!container) return;
  
  const skills = await loadSkills();
  const prefs = await apiJson("/preferences").catch(() => ({}));
  container.innerHTML = "";
  
  // Render Autonomous Workers section at the top
  const autoDiv = document.createElement("div");
  autoDiv.className = "card";
  autoDiv.style.marginBottom = "var(--space-6)";
  autoDiv.innerHTML = `
    <div class="row space-between">
      <h3>Autonomous Background Workers</h3>
      <label class="switch">
        <input type="checkbox" id="skills-auto-toggle" ${prefs.autonomous_tasks_enabled ? "checked" : ""}>
        <span class="slider"></span>
      </label>
    </div>
    <p class="muted text-sm">Allow the AI to run tasks in the background automatically.</p>
    <div class="row row-top-gap">
      <label><input type="checkbox" id="skills-auto-tag" ${prefs.auto_tag_enabled !== false ? "checked" : ""}> Auto-tag notes</label>
      <label><input type="checkbox" id="skills-auto-link" ${prefs.auto_link_enabled !== false ? "checked" : ""}> Auto-link ideas</label>
    </div>
  `;
  container.appendChild(autoDiv);

  // The autonomous toggles that live on this panel as well as in Settings →
  // Background tasks. Reported as **"the automated tasks option keeps
  // automatically disabling itself even when turned on"**, and it did:
  //
  // These wrote straight to the server and updated nothing locally. `savePrefs`
  // — which seven other controls call on every change — then rebuilt the whole
  // preferences object from the DOM, reading `#pref-autonomous-tasks`, the
  // *other* checkbox, which nobody had ticked. So enabling it here and then
  // touching any unrelated setting silently switched it back off.
  //
  // `setPreference` is the fix in one place: it saves, updates `prefsCache` so
  // the next `savePrefs` sends the right value, and reconciles the mirrored
  // control so the two screens cannot disagree.
  for (const [id, key] of [
    ["skills-auto-toggle", "autonomous_tasks_enabled"],
    ["skills-auto-tag", "auto_tag_enabled"],
    ["skills-auto-link", "auto_link_enabled"],
  ]) {
    const box = $(id);
    if (box) box.addEventListener("change", (e) => setPreference(key, e.target.checked));
  }
  
  const grid = document.createElement("div");
  grid.className = "skills-grid";
  container.appendChild(grid);
  
  if (!skills.length) {
    grid.innerHTML = `<p class="muted">No skills found.</p>`;
    return;
  }
  
  for (const skill of skills) {
    const card = document.createElement("div");
    card.className = "skill-card";
    
    // Header: Title and Type badge
    const header = document.createElement("div");
    header.className = "skill-card-header";
    const title = document.createElement("div");
    title.className = "skill-card-title";
    title.textContent = skill.name;
    const badge = document.createElement("span");
    badge.className = "status badge";
    badge.textContent = skill.builtin ? "Built-in" : "Custom";
    header.appendChild(title);
    header.appendChild(badge);
    
    // Description
    const desc = document.createElement("div");
    desc.className = "skill-card-desc";
    desc.textContent = skill.description || "No description provided.";
    
    // Footer: Run button
    const footer = document.createElement("div");
    footer.className = "skill-card-footer";
    const runBtn = document.createElement("button");
    runBtn.className = "small";
    runBtn.textContent = "Run Skill";
    runBtn.onclick = () => {
      // Switch to chat and run it
      switchTab("chat");
      startSkill(skill.name);
    };
    
    const schedBtn = document.createElement("button");
    schedBtn.className = "small ghost";
    schedBtn.textContent = "Schedule";
    schedBtn.onclick = () => {
      toast("Scheduler functionality coming soon!"); // Placeholder for Phase 5 implementation
    };
    
    footer.appendChild(schedBtn);
    footer.appendChild(runBtn);
    
    card.appendChild(header);
    card.appendChild(desc);
    card.appendChild(footer);
    container.appendChild(card);
  }
}

// Hook into switchTab by overriding it to catch the library tab
const originalSwitchTab = switchTab;
window.switchTab = function(name) {
  originalSwitchTab(name);
  if (name === "library") {
    renderSkillsDashboard();
    renderSkillLogs();
  }
};

async function renderSkillLogs() {
  const logList = document.getElementById("skills-logs-list");
  if (!logList) return;
  logList.innerHTML = "<p class='muted'>Loading logs...</p>";
  
  const logs = await apiJson("/audit?limit=20").catch(() => null);
  logList.innerHTML = "";
  
  if (!logs || !logs.length) {
    logList.innerHTML = "<p class='muted'>No logs found.</p>";
    return;
  }
  
  // Filter for skill executions if possible, or just show agent actions
  const skillLogs = logs.filter(log => log.entity_type === "skill" || log.action === "skill_run" || log.action.includes("agent"));
  
  if (!skillLogs.length) {
    logList.innerHTML = "<p class='muted'>No skill execution logs found.</p>";
    return;
  }
  
  for (const log of skillLogs) {
    const div = document.createElement("div");
    div.className = "entry-item";
    div.innerHTML = `
      <div class="row space-between">
        <strong>${escapeHtml(log.action)}</strong>
        <span class="muted text-sm">${new Date(log.created_at).toLocaleString()}</span>
      </div>
      <div class="muted text-sm log-detail">${escapeHtml(log.detail || log.entity_id || "")}</div>
    </div>
    `;
    logList.appendChild(div);
  }
}

// --- Global Drag and Drop & Paste Image Upload for Textareas ---
document.addEventListener("dragover", (e) => {
  if (e.target.tagName && e.target.tagName.toLowerCase() === 'textarea') {
    e.preventDefault();
    e.target.classList.add("drag-over");
  }
});

document.addEventListener("dragleave", (e) => {
  if (e.target.tagName && e.target.tagName.toLowerCase() === 'textarea') {
    e.preventDefault();
    e.target.classList.remove("drag-over");
  }
});

document.addEventListener("drop", async (e) => {
  if (!e.target.tagName || e.target.tagName.toLowerCase() !== 'textarea') return;
  e.preventDefault();
  e.target.classList.remove("drag-over");
  
  const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith("image/") || f.type.startsWith("application/") || f.type.startsWith("text/") || f.type.startsWith("video/") || f.type.startsWith("audio/"));
  if (!files.length) return;

  await handleFileUpload(e.target, files);
});

document.addEventListener("paste", async (e) => {
  if (!e.target.tagName || e.target.tagName.toLowerCase() !== 'textarea') return;
  const items = (e.clipboardData || e.originalEvent.clipboardData).items;
  const files = [];
  for (const item of items) {
    if (item.kind === 'file') {
      files.push(item.getAsFile());
    }
  }
  if (!files.length) return;
  // Don't prevent default entirely unless we have files, otherwise normal paste breaks
  e.preventDefault();
  await handleFileUpload(e.target, files);
});

async function handleFileUpload(textarea, files) {
  const cursorPosition = textarea.selectionStart;
  let textToInsert = "";
  
  for (const file of files) {
    textToInsert += `![Uploading ${file.name}...]()\n`;
  }
  
  const originalText = textarea.value;
  textarea.value = originalText.substring(0, cursorPosition) + textToInsert + originalText.substring(textarea.selectionEnd);
  textarea.dispatchEvent(new Event('input', { bubbles: true }));

  for (const file of files) {
    const formData = new FormData();
    formData.append("file", file);
    try {
      const res = await apiJson("/media/upload", {
        method: "POST",
        headers: { "X-Auth-Token": authToken() },
        body: formData
      });
      const imgMarkdown = `![${res.filename}](${res.url})\n`;
      textarea.value = textarea.value.replace(`![Uploading ${file.name}...]()\n`, imgMarkdown);
      textarea.dispatchEvent(new Event('input', { bubbles: true }));
    } catch (err) {
      console.error("Upload failed", err);
      textarea.value = textarea.value.replace(`![Uploading ${file.name}...]()\n`, `*(Failed to upload ${file.name})*\n`);
      textarea.dispatchEvent(new Event('input', { bubbles: true }));
    }
  }
}

// --- Twitch-style Agent Monitor ---
const agentMonitor = $("agent-monitor");
const agentMonitorLogs = $("agent-monitor-logs");
const agentMonitorClose = $("agent-monitor-close");

// The monitor is `position: fixed` in the bottom-right corner, which is also
// where the whiteboard keeps its zoom controls — so while it was open those
// controls were behind it and simply could not be clicked. A floating panel
// that covers a fixed control is a broken control, so the app is told when the
// monitor is showing and the whiteboard lifts its panel clear.
function setAgentMonitorVisible(visible) {
  agentMonitor.classList.toggle("hidden", !visible);
  document.body.classList.toggle("has-agent-monitor", visible);
}

if (agentMonitorClose) {
  agentMonitorClose.addEventListener("click", () => setAgentMonitorVisible(false));
}

function appendAgentLog(record) {
  // Only show autonomous/background agent logs
  const isAgent = record.logger && (record.logger.includes("memorymap.ai") || record.message.includes("Agent") || record.logger.includes("autonomous"));
  if (!isAgent && record.level !== "ERROR") return;
  
  if (agentMonitor.classList.contains("hidden")) setAgentMonitorVisible(true);

  const div = document.createElement("div");
  div.className = "monitor-log-item " + record.level.toLowerCase();
  div.textContent = record.message;
  
  agentMonitorLogs.appendChild(div);
  
  if (agentMonitorLogs.children.length > 50) {
    agentMonitorLogs.removeChild(agentMonitorLogs.firstChild);
  }
  
  agentMonitorLogs.scrollTop = agentMonitorLogs.scrollHeight;
}

let agentLogStreamStarted = false;
async function streamAgentLogs() {
  if (agentLogStreamStarted) return;
  agentLogStreamStarted = true;
  let cursor = 0;
  while (true) {
    try {
      const response = await fetch(`/logs/stream?after=${cursor}`, {
        headers: { "X-Auth-Token": authToken() }
      });
      if (response.status === 401) {
         await new Promise(r => setTimeout(r, 5000));
         continue;
      }
      if (!response.ok) throw new Error("stream failed");
      
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop(); // keep last incomplete line
        
        for (const line of lines) {
          if (!line.trim()) continue;
          const msg = JSON.parse(line);
          if (msg.cursor) cursor = msg.cursor;
          
          if (msg.type === "open") {
            cursor = msg.latest || cursor;
          } else if (msg.type === "record") {
            appendAgentLog(msg.record);
          }
        }
      }
    } catch (e) {
      await new Promise(r => setTimeout(r, 5000));
    }
  }
}

// Hook it into startApp
const originalStartAppAgentHook = window.startApp;
window.startApp = async function() {
  if (originalStartAppAgentHook) {
    await originalStartAppAgentHook.apply(this, arguments);
  }
  streamAgentLogs();
}

// --- Global Command Palette (Ctrl+K) ---
const cmdPaletteOverlay = $("command-palette-overlay");
const cmdPaletteInput = $("command-palette-input");
const cmdPaletteResults = $("command-palette-results");

document.addEventListener("keydown", (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
    e.preventDefault();
    if (cmdPaletteOverlay.classList.contains("hidden")) {
      cmdPaletteOverlay.classList.remove("hidden");
      cmdPaletteInput.focus();
    } else {
      cmdPaletteOverlay.classList.add("hidden");
    }
  }
  if (e.key === "Escape" && !cmdPaletteOverlay.classList.contains("hidden")) {
    cmdPaletteOverlay.classList.add("hidden");
  }
});

cmdPaletteOverlay.addEventListener("click", (e) => {
  if (e.target === cmdPaletteOverlay) {
    cmdPaletteOverlay.classList.add("hidden");
  }
});

cmdPaletteInput.addEventListener("keydown", async (e) => {
  if (e.key === "Enter" && cmdPaletteInput.value.trim()) {
    const text = cmdPaletteInput.value.trim();
    cmdPaletteInput.value = "";

    // Create user bubble
    const userMsg = document.createElement("div");
    userMsg.className = "msg user";
    userMsg.textContent = text;
    cmdPaletteResults.appendChild(userMsg);

    // Create agent thinking bubble
    const agentMsg = document.createElement("div");
    agentMsg.className = "msg assistant";
    agentMsg.appendChild(typingDots());
    cmdPaletteResults.appendChild(agentMsg);
    cmdPaletteResults.scrollTop = cmdPaletteResults.scrollHeight;

    // Was hand-rolled against `/chat` (the non-streaming endpoint, a single
    // JSON object) as though it were the NDJSON `/chat/stream` shape — so
    // `msg.type` was never "content" and this never actually rendered an
    // answer at all (a "feature that never ran once", CLAUDE.md's own
    // category for this). It also built the answer with
    // `innerHTML = answerText.replace(...)` and no escaping — a real,
    // reachable XSS the moment the parsing bug above was fixed, since a
    // model can echo a note's own text back verbatim. Fixed by reusing this
    // file's one real streaming client (`streamChat`) and its one safe
    // renderer (`renderMarkdown`, DOM nodes only, never innerHTML) instead
    // of a second, parallel, broken implementation of both.
    let answerRaw = "";
    let answered = false;
    try {
      await streamChat({
        question: text,
        history: [],
        useTools: true, // the palette is meant to act on the notebook, like Chat
        onMeta: () => {},
        onThinking: () => {},
        onAnswer: (delta) => {
          answered = true;
          answerRaw += delta;
          renderMarkdown(agentMsg, answerRaw);
          cmdPaletteResults.scrollTop = cmdPaletteResults.scrollHeight;
        },
      });
      if (!answered) agentMsg.textContent = "(no answer)";
    } catch (err) {
      agentMsg.textContent = "Error communicating with agent.";
      agentMsg.classList.add("error");
    }
  }
});
