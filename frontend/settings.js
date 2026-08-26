// settings.js — the settings modal, the logs console, and appearance
// (theme, accent, curated palettes, saved looks, the generative background
// preview) — split out of app.js. §88.3, the fourth and last file in the
// app.js split.
//
// Loaded after app.js AND after documents.js/whiteboard.js/library.js/
// editor.js/dashboard.js (see index.html's own script-order comment): every
// reference here into an app.js/dashboard.js global ($, apiJson, toast,
// smallButton, confirmDialog, setLabel, chip, copyToClipboard, saveFile,
// authToken, desktopShell, prefsCache, allEntries, setPreference,
// refreshModelStatus, refreshArtForTheme, renderEmblem, renderBrandLogo,
// browserLogs, OVERRIDABLE_KEYS, LOOK_KEYS, manualOverrides's own callers,
// and more) is a runtime call inside a function body or an event-listener
// closure, never a parse-time reference, so normal load order only matters
// for the reverse direction — see the two relocated calls at the very end of
// this file for the one place that was not already true.
//
// Two hazards found doing this split, the same `initDocSidebarTabs()` shape
// documents.js's/dashboard.js's own splits found — a bare top-level
// statement in app.js resolving before this file has loaded:
//
// 1. `applyAppearance(); if (bgArtOn()) startBgArt();` ran from a bare
//    top-level pair of lines in app.js's own wiring, to paint the saved
//    look before first render. `applyAppearance()` calls `applyPalette()`
//    (app.js, stays there — see its own comment) which itself calls
//    `bgArtOn()`/`startBgArt()` unconditionally, both of which moved here.
//    Left as two lines in app.js, this would have thrown `ReferenceError:
//    bgArtOn is not defined` and aborted the rest of app.js's synchronous
//    top-level wiring (the tab-button click-listener loop included) before
//    settings.js had even loaded to define them. Fixed the documents.js way:
//    the call site moved with the code it calls into, run once at this
//    file's own end instead of splitting definition from call site. Safe to
//    run later than before: index.html's own pre-paint `<head>` script
//    already stamps every load-bearing `data-*`/custom-property from
//    localStorage before any `<script>` tag runs specifically to prevent a
//    flash, so `applyAppearance()`'s own re-application arriving after every
//    split file has loaded — still well before the browser's first paint,
//    since none of these `<script>` tags defer or fetch anything remote —
//    changes nothing a user could see.
// 2. `renderBrandLogo();` — the initial draw of the generative brand emblem
//    (stays in app.js; used on the lock screen, onboarding, the chat avatar
//    and more, not just here) — sat at a second bare top-level line further
//    down in app.js. `renderEmblem()` reads `ACCENTS`/`activeAccent()`/
//    `appearancePref()`, all of which moved here, so this call had the exact
//    same shape as hazard 1 and got the same fix: relocated to this file's
//    own tail, right after the first pair, in its original relative order.
//
// **What stayed in app.js despite reading like "appearance"**, each for a
// concrete reason rather than by default:
// - `applyPalette()` — precedent from the dashboard.js split (§88.3 item 3):
//   "it does real app.js-only work, the whole-app palette." Its own comment
//   (updated by this split) explains the guard it already carries.
// - `renderEmblem()`/`renderBrandLogo()`/`EMBLEM_SLOTS`/`emblemSeed` (the
//   generative brand mark) — used far outside Settings: the lock screen, the
//   onboarding tour, the chat avatar, the graph's empty state. The same test
//   documents.js's and library.js's splits used for their own functions
//   (grep every call site, decide by what actually calls it, not by which
//   comment block it happened to be written under).
// - `MIRRORED_UI_EXTRAS`/`mirroredUiKeys()`/`watchMirroredUiKeys()`/
//   `saveUiState()`/`seedUiStateFromServer()` (§35E, "keeping the look
//   across restarts") — despite the section's own name, this mirrors far
//   more than appearance: `activeTab`, every graph/whiteboard view
//   preference, the chat composer's dragged height. It is called from a
//   bare top-level line in app.js (`watchMirroredUiKeys();`) that runs
//   before this file loads, so it has to stay resident there regardless.
// - `OVERRIDABLE_KEYS`/`LOOK_KEYS` — small data tables, genuinely about
//   appearance, but `mirroredUiKeys()` above spreads `LOOK_KEYS` into its
//   own list synchronously at that same bare top-level call, so it has to be
//   defined in app.js by then too. Kept there with a comment pointing here,
//   rather than duplicated. `manualOverrides()` itself moved — its only
//   callers are Settings' own UI, called well after everything has loaded.
//
// **The sibling `dashboard.js` split (§88.3 item 3) explicitly flagged two
// zones as not its own and left them in app.js for this split to judge:**
// "Wave J: accent themes + generative background" (this file's own —
// confirmed: curated/saved themes and the second, ambient p5 instance used
// as Settings' own live accent preview, not a dashboard widget) and "SKILLS
// DASHBOARD TAB" (`renderSkillsDashboard`, `#skills-dashboard-list` — the AI
// Skills library page, an unrelated feature that happens to share the word
// "dashboard" in its own internal naming; confirmed NOT this file's either,
// and left in app.js since library.js's own split already owns the AI
// Skills sub-tab it's called from). The "AI status pill"/`aiStatusState()`/
// `renderAiPill()` code was also checked directly: it is core app-shell
// chrome (top-bar status, `refreshModelStatus()`'s polling loop, the
// AI-only-control gating used by Notes/Reminders/Documents/Whiteboard) with
// far more callers than Settings, so it stayed in app.js too.
//
// **Deliberately not moved, and not appearance/logs/modal-shell either**,
// each a separate Settings *section* the roadmap item didn't name and this
// split left alone rather than guess at scope: account & security, web
// search, preferences, optional extras + embedding models, the model
// manager, personas, skills, tools, memory, capture templates, background
// tasks, backups, and rebindable shortcuts. Every one of these already
// renders inside the settings modal `showSettingsSection()` now drives from
// here, exactly as it did from app.js before this split — moving the shell
// does not require moving what it shows.
//
// No code sharing found between this file's own generative-background p5
// instance (`startBgArt()`, five self-contained style builders) and
// dashboard.js's "notebook constellation" widget beyond the same visual
// motif in a comment — read both fully before concluding that; they do not
// share a helper function.

//: Every section id, and a new one is invisible until it is in this list —
//: `showSettingsSection` un-hides by iterating it, so a section left out is
//: rendered, in the DOM, and never shown. Found by driving it: the Extras
//: panel had five rows in it and a nav button that appeared to do nothing.
const SETTINGS_SECTIONS = ["models", "personas", "skills", "tools", "memory", "websearch", "appearance", "templates", "shortcuts", "preferences", "account", "extras", "tasks", "data", "logs", "help", "about"];

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
  if (name === "templates") renderTemplateSettings();
  if (name === "tools") renderToolSettings();
  if (name === "memory") renderMemorySettings().catch(() => {});
  if (name === "tasks") renderAutonomousReview().catch(() => {});
  if (name === "tasks") {
    apiJson("/preferences")
      .then((prefs) => {
        prefsCache = prefs;
        renderAutonomousSettings();
      })
      .catch(() => {});
  }
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

// `scrollToId`: a quick-access link into one setting buried in a long
// section (e.g. "Search relevance (advanced)" from the Dashboard, the Ask
// sub-tab, or Chat) needs to land on that control, not just the top of
// Preferences — otherwise it's a link to "somewhere in here, scroll and
// find it yourself", which is what it was before this existed.
async function openSettingsModal(section = "models", scrollToId = null) {
  overlayReturnFocus = document.activeElement;
  $("settings-modal").classList.remove("hidden");
  $("settings-close").focus();
  $("about-version").textContent = `Version ${
    (await apiJson("/health").catch(() => ({ version: "?" }))).version
  } · ${allEntries.length} entries loaded`;
  $("pref-update-check").checked = Boolean(prefsCache?.update_check_enabled);
  $("pref-auto-update").checked = Boolean(prefsCache?.auto_update_enabled);
  $("pref-update-channel-main").checked = prefsCache?.update_channel === "main";
  $("update-check-status").textContent = "";
  $("update-version-select").classList.add("hidden");
  $("update-install-version").classList.add("hidden");
  $("update-version-status").textContent = "";
  const isDesktop = await desktopShell();
  $("desktop-console-row").classList.toggle("hidden", !isDesktop);
  $("desktop-console-hint").classList.toggle("hidden", !isDesktop);
  $("open-exports-row").classList.toggle("hidden", !isDesktop);
  $("export-save-dir-row").classList.toggle("hidden", !isDesktop);
  if (isDesktop) $("pref-export-dir").value = prefsCache?.export_save_dir || "";
  if (isDesktop) {
    $("pref-show-console").checked = Boolean(prefsCache?.show_console_on_startup);
  }
  showSettingsSection(section);
  if (!suggestedCatalog) {
    suggestedCatalog = await apiJson("/models/suggested").catch(() => null);
  }
  loadChangelog();
  refreshModelStatus();
  if (scrollToId) {
    requestAnimationFrame(() => {
      const target = $(scrollToId);
      if (!target) return;
      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      target.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "center" });
      target.classList.remove("flash");
      void target.offsetWidth;
      target.classList.add("flash");
      // Take it off again, the way flashEntry and flashReminder both already
      // do. Reported directly: "the search relevance settings section stays
      // highlighted permanently and doesn't return to normal."
      //
      // This was the one of the three flash call sites with no cleanup, and it
      // looked harmless because the animation ends on `transparent` — so on an
      // ordinary machine the highlight does fade and the stuck class is
      // invisible. Under `prefers-reduced-motion: reduce` the stylesheet
      // deliberately swaps the animation for a *static* outline and background
      // (see .flash-target.flash there), and with nothing ever removing the
      // class that static highlight is permanent. A value that is only wrong
      // under a setting the author does not have on is exactly the shape this
      // codebase keeps getting caught by.
      clearTimeout(openSettingsModal.flashTimer);
      openSettingsModal.flashTimer = setTimeout(() => target.classList.remove("flash"), 2700);
    });
  }
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
// "List" (structured rows, foldable tracebacks) or "Terminal" (raw lines,
// styled like a real console — see .log-terminal). Same persistence pattern
// as reminderView/timeline-view: a per-browser display preference, not
// something worth round-tripping through /preferences.
let logView = localStorage.getItem("logView") === "terminal" ? "terminal" : "list";

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
  setLabel(copy, "ph:clipboard");
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

function activeLogContainer() {
  return $(logView === "terminal" ? "log-terminal" : "log-list");
}

function nearLogBottom() {
  const list = activeLogContainer();
  // 40px of slack: "close enough to the bottom that you meant to be there".
  return list.scrollHeight - list.scrollTop - list.clientHeight < 40;
}

function scrollLogToBottom() {
  const list = activeLogContainer();
  list.scrollTop = list.scrollHeight;
}

// Shared by both views: the empty state, the "N hidden by filters" note, and
// the copy-button label all describe the filtered set, not how it is drawn.
function renderLogSharedUI(visibleCount) {
  $("logs-empty").classList.toggle("hidden", logRecords.length > 0);
  // "Nothing matches" and "nothing happened" are different answers, and only
  // the first one is fixed by changing the filter.
  const hiddenCount = logRecords.length - visibleCount;
  const filtered = $("logs-filtered-out");
  if (hiddenCount > 0) {
    filtered.textContent = `${hiddenCount.toLocaleString()} record${hiddenCount === 1 ? "" : "s"} hidden by the filters above.`;
    filtered.classList.remove("hidden");
  } else {
    filtered.classList.add("hidden");
  }
  renderCopyLogsLabel();
}

function renderLogList() {
  const list = $("log-list");
  const shouldStick = $("log-follow").checked && logFollowPinned;
  const visible = logRecords.filter(logMatchesFilters);

  list.replaceChildren();
  // **Deliberately not `renderIncrementally`, unlike every other list here.**
  // Two reasons, and the second is the disqualifying one. This list is already
  // bounded — `MAX_LOG_ROWS` (1000) is a real cap, not an unbounded notebook —
  // so the problem the incremental renderer solves is one the cap has already
  // solved. And the log's "follow" mode scrolls to the *newest* row, which
  // sits at the end: a renderer that paints the first chunk and fills in
  // towards the end as you scroll would leave follow mode scrolling to the
  // bottom of whatever happened to be painted, not to the newest line. Making
  // this incremental would mean inverting the window, which is a different
  // mechanism built to fix a cost that is already capped.
  for (const record of visible) list.appendChild(logRow(record));

  renderLogSharedUI(visible.length);
  if (shouldStick) scrollLogToBottom();
}

// One line the way it would print to a real console: "HH:MM:SS LEVEL   logger
// — message", level padded like uvicorn's own default formatter pads
// "INFO:"/"WARNING:"/"ERROR:" so a column of mixed levels still lines up.
function logTerminalLineText(record) {
  const when = new Date(record.time).toLocaleTimeString();
  const level = `${record.level}:`.padEnd(9);
  const body = record.logger ? `${record.logger} — ${record.message}` : record.message;
  return `${when} ${level}${body}`;
}

function logTerminalRow(record) {
  const line = document.createElement("div");
  line.className = "log-term-line";
  const rank = logLevelRank(record.level);
  if (rank >= 3) line.classList.add("is-error");
  else if (rank === 2) line.classList.add("is-warn");
  line.textContent = logTerminalLineText(record);
  return line;
}

// A real terminal never folds a traceback behind a click, so this view
// doesn't either — every line prints, indented, right under the record that
// raised it. That is the one real advantage this view has over List, not
// just a different coat of paint on the same data.
function logTerminalTraceRow(record) {
  const trace = document.createElement("div");
  trace.className = "log-term-trace";
  trace.textContent = record.trace;
  return trace;
}

function renderLogTerminal() {
  const el = $("log-terminal");
  const shouldStick = $("log-follow").checked && logFollowPinned;
  const visible = logRecords.filter(logMatchesFilters);

  el.replaceChildren();
  for (const record of visible) {
    el.appendChild(logTerminalRow(record));
    if (record.trace) el.appendChild(logTerminalTraceRow(record));
  }

  renderLogSharedUI(visible.length);
  if (shouldStick) scrollLogToBottom();
}

function renderActiveLogView() {
  if (logView === "terminal") renderLogTerminal();
  else renderLogList();
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
          if (logScreenOpen) renderActiveLogView();
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
  renderActiveLogView();
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
  // Percent of a card's own base alpha that survives — separate dial from
  // blur strength above (how frosted vs. how clear). 100 renders identically
  // to before this setting existed.
  "glass-opacity": "100",
  // Off by default even while glass itself is on — a diagonal highlight is a
  // stronger visual statement than the blur/opacity dials above, worth
  // opting into rather than imposing. Turning glass on from off auto-sets
  // this to "on" (see #glass-toggle's own listener), so the full look shows
  // up without a second trip to Settings; unchecking #glass-sheen-toggle
  // afterward turns just the sheen back off without touching glass itself.
  "glass-sheen": "off",
  // 0-100, how strong the sheen reads when it's on — its own dial, separate
  // from whether it's on at all.
  "glass-sheen-strength": "100",
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
//
// LOOK_KEYS itself lives in app.js, not here — see the comment there. It is
// read across the file boundary below, which is safe: currentLookValues()
// only ever runs from saveCurrentLook(), itself only ever run from a click,
// long after every script (app.js included) has loaded.

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
  // The container is a grid of `minmax(104px, 1fr)` swatch columns, so a
  // paragraph dropped straight into it becomes a grid ITEM in a 104px track
  // and wraps to roughly one word per line. Screenshotted looking exactly like
  // that. The empty state turns the grid off for as long as it is the only
  // thing in there.
  box.classList.toggle("theme-presets-empty", !themes.length);
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
  root.dataset.glassSheen = appearancePref("glass-sheen");
  root.style.setProperty("--glass-sheen-strength", Number(appearancePref("glass-sheen-strength")) / 100);
  root.dataset.themePreset = activeThemePreset();
  root.dataset.motion = appearancePref("motion");
  root.style.setProperty("--bg-art-opacity", Number(appearancePref("bg-intensity")) / 100);
  // Cards thin out slightly while the art is on, so it reads through the page
  // rather than only in the margins.
  root.dataset.bgArt = bgArtOn() ? "on" : "off";
  root.style.setProperty("--radius", `${appearancePref("radius")}px`);
  root.style.setProperty("--glass-blur", `${appearancePref("glass-blur")}px`);
  root.style.setProperty("--glass-opacity", Number(appearancePref("glass-opacity")) / 100);
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

// The theme button shows the mode you will GET, not the one you are in.
//
// Reported as "the toggle light/dark button doesn't change". It was a fixed
// half-filled circle in both modes, so the one control whose entire job is to
// say which way it will flip looked identical either way — and there was no
// way to tell from it whether pressing it would darken or lighten.
//
// Showing the destination rather than the current state is the convention
// worth following here: a sun means "press for light", and it is the thing you
// are choosing, not a redundant restatement of the background you can already
// see.
function renderThemeToggle() {
  const button = $("theme-btn");
  if (!button) return;
  const dark = resolvedTheme() === "dark";
  setLabel(button, dark ? "ph:sun" : "ph:moon");
  const next = dark ? "light" : "dark";
  button.title = `Switch to ${next} mode`;
  button.setAttribute("aria-label", `Switch to ${next} mode`);
}

function applyResolvedMode() {
  document.documentElement.dataset.mode = resolvedTheme();
  renderThemeToggle();
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
  $("glass-sheen-toggle").checked = appearancePref("glass-sheen") === "on";
  $("glass-sheen-row").classList.toggle("disabled-row", appearancePref("glass") !== "on");
  $("glass-sheen-strength").value = appearancePref("glass-sheen-strength");
  $("glass-sheen-strength-value").textContent = `${appearancePref("glass-sheen-strength")}%`;
  $("glass-sheen-strength-row").classList.toggle(
    "disabled-row",
    appearancePref("glass") !== "on" || appearancePref("glass-sheen") !== "on"
  );
  $("bg-intensity").value = appearancePref("bg-intensity");
  $("bg-intensity-value").textContent = `${appearancePref("bg-intensity")}%`;
  $("bg-art-style").value = appearancePref("bg-style");
  $("radius-slider").value = appearancePref("radius");
  $("radius-value").textContent = `${appearancePref("radius")}px`;
  $("glass-blur").value = appearancePref("glass-blur");
  $("glass-blur-value").textContent = `${appearancePref("glass-blur")}px`;
  $("glass-opacity").value = appearancePref("glass-opacity");
  $("glass-opacity-value").textContent = `${appearancePref("glass-opacity")}%`;
  $("zoom-slider").value = appearancePref("zoom");
  $("zoom-value").textContent = `${appearancePref("zoom")}%`;
  _segActive("border-style-seg", "borderChoice", appearancePref("border-style", "solid"));
  $("shadow-intensity").value = appearancePref("shadow-intensity", "5");
  $("shadow-intensity-value").textContent = `${appearancePref("shadow-intensity", "5")}%`;
  $("accent-custom").value = localStorage.getItem("accent-custom") || "#4f6df5";
  $("page-bg-custom").value = localStorage.getItem("page-bg") || "#f5f7fb";
  $("custom-css").value = localStorage.getItem("custom-css") || "";
  // Blur strength and opacity only matter while glass is on.
  $("glass-blur-row").classList.toggle("disabled-row", appearancePref("glass") !== "on");
  $("glass-opacity-row").classList.toggle("disabled-row", appearancePref("glass") !== "on");
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
    "contrast", "bgArt", "theme", "radius", "glass-blur", "glass-opacity",
    "glass-sheen", "glass-sheen-strength", "bg-style", "bg-motion", "palette", "themePreset",
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

function toggleBgArt(on) {
  localStorage.setItem("bgArt", on ? "on" : "off");
  applyAppearance(); // updates data-bg-art so the cards adjust with it
  if (on) startBgArt();
  else stopBgArt();
}

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
  const turningOn = e.target.checked && appearancePref("glass") !== "on";
  localStorage.setItem("glass", e.target.checked ? "on" : "off");
  // Asked for directly: switching glassmorphism on from off also turns the
  // sheen on, so the full look shows up in one action — the sheen's own
  // checkbox can still turn it back off afterward without touching this.
  if (turningOn) localStorage.setItem("glass-sheen", "on");
  applyAppearance();
  renderAppearance();
});
$("glass-sheen-toggle").addEventListener("change", (e) => {
  localStorage.setItem("glass-sheen", e.target.checked ? "on" : "off");
  applyAppearance();
  $("glass-sheen-strength-row")?.classList.toggle("disabled-row", !e.target.checked);
});
$("glass-sheen-strength").addEventListener("input", (e) => {
  localStorage.setItem("glass-sheen-strength", e.target.value);
  $("glass-sheen-strength-value").textContent = `${e.target.value}%`;
  applyAppearance();
});
$("reduce-motion-toggle").addEventListener("change", (e) => {
  localStorage.setItem("motion", e.target.checked ? "reduced" : "auto");
  // The background-art picker has its own "Moving" override so someone can
  // ask for motion despite the OS-level reduced-motion hint (see
  // startBgArt()'s comment — that fix was reported missing once already).
  // But flipping the in-app reduce-motion toggle is a direct, explicit ask,
  // and "Moving" silently surviving it read as the two settings being
  // unrelated. Turning it on selects "Still"; turning it back off only
  // clears that if we're the ones who set it, so an independent "Moving"
  // choice made before or after isn't clobbered.
  if (e.target.checked) {
    localStorage.setItem("bg-motion", "still");
  } else if (appearancePref("bg-motion") === "still") {
    localStorage.setItem("bg-motion", "auto");
  }
  if ($("bg-motion")) $("bg-motion").value = appearancePref("bg-motion");
  renderBgMotionHint();
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
$("glass-opacity").addEventListener("input", (e) => {
  localStorage.setItem("glass-opacity", e.target.value);
  $("glass-opacity-value").textContent = `${e.target.value}%`;
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

$("theme-clear-overrides").addEventListener("click", clearManualOverrides);

// Settings modal (Wave A).
$("settings-btn").addEventListener("click", () => openSettingsModal());
$("settings-close").addEventListener("click", closeSettingsModal);
$("settings-peek").addEventListener("click", () => setSettingsPeek(!settingsPeekIsOn()));

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

// Filters only re-draw what is already held — they never refetch, so changing
// one mid-incident cannot lose the records you were looking at.
$("log-source").addEventListener("change", renderActiveLogView);
$("log-level").addEventListener("change", renderActiveLogView);
let logFilterDebounceTimeout;
$("log-filter").addEventListener("input", () => {
  clearTimeout(logFilterDebounceTimeout);
  logFilterDebounceTimeout = setTimeout(renderActiveLogView, 150);
});
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
// Both containers get the listener — only one is ever visible at a time, but
// whichever it is has to pause Follow the same way.
for (const id of ["log-list", "log-terminal"]) {
  $(id).addEventListener("scroll", () => {
    if (!$("log-follow").checked) return;
    logFollowPinned = nearLogBottom();
    $("log-follow-label").classList.toggle("is-paused", !logFollowPinned);
  });
}

for (const button of document.querySelectorAll("#log-view-toggle button")) {
  button.addEventListener("click", () => {
    logView = button.dataset.view;
    localStorage.setItem("logView", logView);
    for (const b of document.querySelectorAll("#log-view-toggle button")) {
      b.classList.toggle("active", b === button);
    }
    $("log-list").classList.toggle("hidden", logView !== "list");
    $("log-terminal").classList.toggle("hidden", logView !== "terminal");
    $("log-terminal-hint").classList.toggle("hidden", logView !== "terminal");
    renderActiveLogView();
    scrollLogToBottom();
  });
  // The markup hardcodes "List" as the active button; a returning visitor
  // whose last choice (localStorage) was "terminal" needs that reflected
  // here too, not just in which container renders.
  button.classList.toggle("active", button.dataset.view === logView);
}
$("log-list").classList.toggle("hidden", logView !== "list");
$("log-terminal").classList.toggle("hidden", logView !== "terminal");
$("log-terminal-hint").classList.toggle("hidden", logView !== "terminal");

// --- initial paint (relocated from app.js's own top-level wiring) ----------
//
// Both hazards this file's own header describes, fixed the same way: the
// call site moved here, after every function above it exists, instead of
// splitting definition from call site. Order preserved from app.js's
// original wiring (applyAppearance()/startBgArt() ran before renderBrandLogo()
// there too).
applyAppearance();
if (bgArtOn()) startBgArt();
// The generative brand emblem, unique each visit (Wave O). p5 is loaded long
// before any of these split files (a vendor `<script>` tag, ahead of
// app.js's own) — draw once everything this file owns is defined too.
renderBrandLogo();
