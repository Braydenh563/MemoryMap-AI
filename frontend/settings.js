// settings.js: the settings modal, the logs console, and appearance
// (theme, accent, curated palettes, saved looks, the generative background
// preview): split out of app.js. §88.3, the fourth and last file in the
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
// for the reverse direction, see the two relocated calls at the very end of
// this file for the one place that was not already true.
//
// Two hazards found doing this split, the same `initDocSidebarTabs()` shape
// documents.js's/dashboard.js's own splits found, a bare top-level
// statement in app.js resolving before this file has loaded:
//
// 1. `applyAppearance(); if (bgArtOn()) startBgArt();` ran from a bare
//    top-level pair of lines in app.js's own wiring, to paint the saved
//    look before first render. `applyAppearance()` calls `applyPalette()`
//    (app.js, stays there: see its own comment) which itself calls
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
//    split file has loaded, still well before the browser's first paint,
//    since none of these `<script>` tags defer or fetch anything remote, 
//    changes nothing a user could see.
// 2. `renderBrandLogo();`, the initial draw of the generative brand emblem
//    (stays in app.js; used on the lock screen, onboarding, the chat avatar
//    and more, not just here), sat at a second bare top-level line further
//    down in app.js. `renderEmblem()` reads `ACCENTS`/`activeAccent()`/
//    `appearancePref()`, all of which moved here, so this call had the exact
//    same shape as hazard 1 and got the same fix: relocated to this file's
//    own tail, right after the first pair, in its original relative order.
//
// **What stayed in app.js despite reading like "appearance"**, each for a
// concrete reason rather than by default:
// - `applyPalette()`, precedent from the dashboard.js split (§88.3 item 3):
//   "it does real app.js-only work, the whole-app palette." Its own comment
//   (updated by this split) explains the guard it already carries.
// - `renderEmblem()`/`renderBrandLogo()`/`EMBLEM_SLOTS`/`emblemSeed` (the
//   generative brand mark): used far outside Settings: the lock screen, the
//   onboarding tour, the chat avatar, the graph's empty state. The same test
//   documents.js's and library.js's splits used for their own functions
//   (grep every call site, decide by what actually calls it, not by which
//   comment block it happened to be written under).
// - `MIRRORED_UI_EXTRAS`/`mirroredUiKeys()`/`watchMirroredUiKeys()`/
//   `saveUiState()`/`seedUiStateFromServer()` (§35E, "keeping the look
//   across restarts"), despite the section's own name, this mirrors far
//   more than appearance: `activeTab`, every graph/whiteboard view
//   preference, the chat composer's dragged height. It is called from a
//   bare top-level line in app.js (`watchMirroredUiKeys();`) that runs
//   before this file loads, so it has to stay resident there regardless.
// - `OVERRIDABLE_KEYS`/`LOOK_KEYS`, small data tables, genuinely about
//   appearance, but `mirroredUiKeys()` above spreads `LOOK_KEYS` into its
//   own list synchronously at that same bare top-level call, so it has to be
//   defined in app.js by then too. Kept there with a comment pointing here,
//   rather than duplicated. `manualOverrides()` itself moved: its only
//   callers are Settings' own UI, called well after everything has loaded.
//
// **The sibling `dashboard.js` split (§88.3 item 3) explicitly flagged two
// zones as not its own and left them in app.js for this split to judge:**
// "Wave J: accent themes + generative background" (this file's own: 
// confirmed: curated/saved themes and the second, ambient p5 instance used
// as Settings' own live accent preview, not a dashboard widget) and "SKILLS
// DASHBOARD TAB" (`renderSkillsDashboard`, `#skills-dashboard-list`, the AI
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
// here, exactly as it did from app.js before this split, moving the shell
// does not require moving what it shows.
//
// No code sharing found between this file's own generative-background p5
// instance (`startBgArt()`, five self-contained style builders) and
// dashboard.js's "notebook constellation" widget beyond the same visual
// motif in a comment, read both fully before concluding that; they do not
// share a helper function.

//: Every section id, and a new one is invisible until it is in this list, 
//: `showSettingsSection` un-hides by iterating it, so a section left out is
//: rendered, in the DOM, and never shown. Found by driving it: the Extras
//: panel had five rows in it and a nav button that appeared to do nothing.
const SETTINGS_SECTIONS = ["models", "preferences", "personas", "skills", "tools", "memory", "learned", "websearch", "general", "appearance", "templates", "shortcuts", "account", "extras", "tasks", "data", "logs", "help", "about"];

// Which settings section is on screen. The Background tasks list polls while
// it is open, and needs to know that it is.
let currentSettingsSection = "models";

//: **Every pane opens with its own name** (the owner's de-vibecoding pass:
//: seven panes began with a title and eleven began mid-thought, with a
//: description, a status line or a group's small label). The ones without a
//: head get the nav's own label as the same heading the others use
//: (`.help-head > h3`, styled as the pane title in 08-consistency.css), made
//: once and kept, so the word in the list and the word over the pane can
//: never disagree.
//: **Arrow keys walk the pane list**, the way a sidebar of sections moves
//: in every settings window people know: Up and Down go to the previous and
//: next pane and open it, Home and End to the first and last. Tab still
//: leaves the list for the pane, so nothing a keyboard user relied on moves.
document.getElementById("settings-nav")?.addEventListener("keydown", (event) => {
  if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) return;
  const buttons = [...document.querySelectorAll("#settings-nav button[data-section]")]
    .filter((b) => b.getClientRects().length);
  const at = buttons.indexOf(document.activeElement);
  if (at < 0) return;
  event.preventDefault();
  const next =
    event.key === "Home" ? 0
      : event.key === "End" ? buttons.length - 1
        : Math.max(0, Math.min(buttons.length - 1, at + (event.key === "ArrowDown" ? 1 : -1)));
  buttons[next].focus();
  buttons[next].click();
});

function ensureSettingsPaneTitle(box, name) {
  if (!box || box.querySelector(":scope > .help-head > h3, :scope > .settings-pane-title")) return;
  const label = document.querySelector(`#settings-nav [data-section="${name}"]`)?.textContent.trim();
  if (!label) return;
  //: A pane whose first group is already named the same (Packages) would
  //: say it twice, one heading straight over the other.
  const firstHeading = box.querySelector("h3")?.textContent.trim().toLowerCase();
  if (firstHeading === label.toLowerCase()) return;
  const head = document.createElement("div");
  head.className = "row help-head settings-pane-title";
  const title = document.createElement("h3");
  title.textContent = label;
  head.appendChild(title);
  box.prepend(head);
}

function showSettingsSection(name) {
  //: The companion's one-time nudge (avatars.js) may show when Appearance
  //: is first opened.
  if (name === "appearance" && typeof nameMarkBuddyHint === "function") nameMarkBuddyHint(true);
  //: Reported: reopening Settings lands on Models "but the scroll doesn't
  //: reset", so the first section opened halfway down. The section's own
  //: scrolling ancestor goes back to the top whenever the section changes.
  const box = $(`settings-${name}`);
  for (let el = box && box.parentElement; el; el = el.parentElement) {
    const overflow = getComputedStyle(el).overflowY;
    if (overflow === "auto" || overflow === "scroll") {
      el.scrollTop = 0;
      break;
    }
  }
  currentSettingsSection = name;
  // Part of the same back/forward stack every tab and sub-tab already lives
  // in (app.js's tabHistory): asked for directly. Safe to call on every
  // section switch, restores included: recordTabVisit no-ops both when
  // nothing actually changed and while a back/forward move is in progress
  // (tabHistory.navigating), the same guard showNotesSection already relies
  // on for Notes' own sub-tabs.
  if (typeof recordTabVisit === "function") recordTabVisit("settings", name);
  for (const section of SETTINGS_SECTIONS) {
    $(`settings-${section}`).classList.toggle("hidden", section !== name);
  }
  ensureSettingsPaneTitle(box, name);
  for (const button of document.querySelectorAll("#settings-nav button")) {
    button.classList.toggle("active", button.dataset.section === name);
  }
  updatePeekAvailability(name);
  // The log stream is the only section that holds a connection open, so it is
  // the only one that has to be told it is no longer being looked at.
  if (name !== "logs") closeLogs();
  if (name === "logs") renderLogs();
  if (name === "preferences" || name === "general") renderPrefs().catch(() => {});
  if (name === "websearch") renderWebSearch().catch(() => {});
  if (name === "personas") renderPersonas().catch(() => {});
  if (name === "skills") renderSkillSettings();
  if (name === "templates") renderTemplateSettings();
  if (name === "tools") renderToolSettings();
  if (name === "memory") renderMemorySettings().catch(() => {});
  if (name === "learned") renderLearned().catch(() => {});
  if (name === "tasks") renderAutonomousReview().catch(() => {});
  if (name === "tasks") {
    apiJson("/preferences")
      .then((prefs) => {
        prefsCache = prefs;
        renderAutonomousSettings();
      })
      .catch(() => {});
  }
  //: `#pref-smart-model-routing` sits in Models, beside the utility picker it
  //: governs, and was only ever filled by `renderAutonomousSettings`, which
  //: runs when *Background tasks* opens. So Settings opened on Models showed
  //: the raw HTML default, unchecked, over a preference that ships on:
  //: measured, the box read false while `/preferences` said true, and the
  //: first click "turned on" a switch that was already on. The same shape the
  //: comment on `renderAutonomousSettings` records, one section over.
  if (name === "models") {
    apiJson("/preferences")
      .then((prefs) => {
        prefsCache = prefs;
        $("pref-smart-model-routing").checked = prefs.smart_model_routing_enabled ?? true;
      })
      .catch(() => {});
  }
  if (name === "appearance") renderAppearance();
  if (name === "shortcuts") renderShortcutList();
  if (name === "account") renderAccount().catch(() => {});
  if (name === "data") {
    renderBackups();
    renderBackupRetention();
  }
  if (name === "tasks") renderTasks(); // fill it in now, then poll
  if (name === "extras") renderExtras();
  if (name === "about") renderHealthBlock().catch(() => {});
}

// Peek fades the settings panel so a colour change is visible on the page
// behind it. Two details make it work: the fade is on the BACKGROUND via
// color-mix rather than element opacity (opacity would fade the swatches and
// controls too, making the thing you are judging harder to see), and it clears
// itself whenever the panel is closed or you leave Appearance, a settings
// panel left semi-transparent on the Logs screen just looks broken.
function setSettingsPeek(on) {
  const modal = $("settings-modal");
  const button = $("settings-peek");
  modal.classList.toggle("peeking", !!on);
  // A button that toggles has to *say* it is pressed, the class on the modal
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
// Preferences: otherwise it's a link to "somewhere in here, scroll and
// find it yourself", which is what it was before this existed.
async function openSettingsModal(section = "models", scrollToId = null) {
  overlayReturnFocus = document.activeElement;
  $("settings-modal").classList.remove("hidden");
  // Runs on open rather than once at load: several sections are built
  // lazily, and a pass that ran before they existed would leave exactly the
  // rows a user is most likely to be reading uncollapsed. Idempotent, so
  // reopening costs nothing.
  collapseLongSettingHints();
  $("settings-close").focus();
  //: The version alone: "46 entries loaded" was a debugging line (the
  //: client's cache size, drafts included) sitting beside the Health
  //: section's own count of the same thing, and the two disagreed.
  $("about-version").textContent = `Version ${
    (await apiJson("/health").catch(() => ({ version: "?" }))).version
  }`;
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
  // Desktop-only for the same reason the console row is: there is no tray in
  // a browser tab, and a setting whose effect is unreachable reads as broken.
  $("desktop-tray-row")?.classList.toggle("hidden", !isDesktop);
  $("desktop-tray-hint")?.classList.toggle("hidden", !isDesktop);
  $("desktop-advanced-fold")?.classList.toggle("hidden", !isDesktop);
  // Same reasoning as the tray/console rows above: /system/restart can only
  // ever do something in the packaged desktop app on Windows specifically
  // (the one platform _spawn_desktop knows how to relaunch), not desktop in
  // general: but this app's own convention (the console row just above)
  // is to gate on desktop-ness alone and let the backend's own platform
  // check be the final word, so a browser tab never even offers the button
  // while a desktop build on macOS/Linux still can, and finds out only
  // when it actually tries, rather than a client-side guess going stale
  // the moment this app ships a real relaunch for those platforms too.
  $("about-restart-row").classList.toggle("hidden", !isDesktop);
  $("open-exports-row").classList.toggle("hidden", !isDesktop);
  $("export-save-dir-row").classList.toggle("hidden", !isDesktop);
  //: The exports list is for every shell, not only the desktop: on a browser
  //: tab it is the only way back to a file the app saved (INBOX 159).
  renderExportsList();
  if (isDesktop) $("pref-export-dir").value = prefsCache?.export_save_dir || "";
  if (isDesktop) {
    $("pref-show-console").checked = Boolean(prefsCache?.show_console_on_startup);
    // Defaults to on, and `?? true` rather than `Boolean(...)` matters: an
    // install that has never touched this has no stored value, and Boolean()
    // of undefined would render the default as off.
    $("pref-close-to-tray").checked = prefsCache?.close_to_tray ?? true;
    //: Off unless chosen: a second launch brings the open window forward.
    $("pref-new-window-on-launch").checked = Boolean(prefsCache?.new_window_on_launch);
  }
  // Rebuilt each open rather than once at startup: the list reflects saved
  // preferences, and those can change from another window or a restore.
  renderStatusBarSettings();
  showSettingsSection(section);
  // Re-read every open, not cached: the panel shows what the *currently
  // selected* model recommends, and changing the chat model is the most likely
  // reason to come back here.
  loadSamplingSettings();
  if (!suggestedCatalog) {
    suggestedCatalog = await apiJson("/models/suggested").catch(() => null);
  }
  loadChangelog();
  refreshModelStatus();
  if (scrollToId) {
    requestAnimationFrame(() => {
      const found = $(scrollToId);
      if (!found) return;
      //: A deep link into a folded group opens the fold first (a closed
      //: `details.settings-fold` has no box, so the jump below would be
      //: skipped and the link would land on the section's top).
      for (let fold = found.closest("details"); fold; fold = fold.parentElement?.closest("details")) {
        fold.open = true;
      }
      // **Scroll to what the user can see, not to the element that holds the
      // value.** Every `<select>` in this app is replaced at runtime by an
      // opener button plus a menu (`enhanceSelect`), and the native control
      // is kept only for its value, its label association and the
      // accessibility tree: as a 1x1 clipped, fully transparent box.
      //
      // A deep link that targets a select id therefore scrolled to a point
      // with no visible control at it, and, worse, because it fails
      // silently: put the `flash` highlight on an invisible element, so the
      // "here is the setting you asked for" cue never appeared at all. Found
      // by measuring: the modal opened on the right section with the select
      // present and `selectInView: false`.
      //
      // `.select-shell` is the wrapper `enhanceSelect` puts around both, so
      // it is the visible representative of any enhanced select and the
      // right thing to scroll to and highlight. A select that was never
      // enhanced has no shell and is its own target, unchanged.
      const target = found.closest(".select-shell") || found;
      // A target with no layout box cannot be scrolled to or highlighted, and
      // trying is a silent no-op that looks like the deep link is broken.
      // This is a real state, not a defensive guard: several settings are
      // gated on a backend being present (`#models-config` is hidden outright
      // when no local model server is detected), so a link into one of them
      // legitimately lands on a `display: none` control. Opening the section
      // is still right, it is where the explanation lives, so only the
      // scroll and flash are skipped.
      if (!target.getClientRects().length) return;
      //: **The ring is `flashRevealed`'s now** (app.js), the one every
      //: catalogue row lands with. This used to add `flash` alone, which
      //: draws only on an element that already carries `flash-target`: the
      //: one caller whose group did (Search relevance) got a ring, and a deep
      //: link to anything else scrolled and drew nothing. Measured while
      //: making the Tools and features rows land on their settings.
      flashRevealed(target);
      // The helper takes it off again, the way flashEntry and flashReminder both already
      // do. Reported directly: "the search relevance settings section stays
      // highlighted permanently and doesn't return to normal."
      //
      // This was the one of the three flash call sites with no cleanup, and it
      // looked harmless because the animation ends on `transparent`, so on an
      // ordinary machine the highlight does fade and the stuck class is
      // invisible. Under `prefers-reduced-motion: reduce` the stylesheet
      // deliberately swaps the animation for a *static* outline and background
      // (see .flash-target.flash there), and with nothing ever removing the
      // class that static highlight is permanent. A value that is only wrong
      // under a setting the author does not have on is exactly the shape this
      // codebase keeps getting caught by.
    });
  }
}

// CHANGELOG.md, rendered in Settings → About (§36E). Loaded once per session
// and only when the settings panel is opened, it is several thousand words
// and nobody is waiting for it at startup.
let changelogLoaded = false;
//: **The changelog renders when it is opened, not when Settings is.**
//:
//: Measured during the first audit of Settings (ROADMAP.md item 7: it had
//: never been measured): `#changelog-body` held **21,452 words across ~505
//: paragraphs**, laid out on every single open of Settings -> About, while
//: the `<details>` around it showed 47 pixels of that. It is not a visual
//: problem, the fold clips it, and the panel reads as compact, which is
//: exactly why it went unnoticed. It is DOM weight and layout work for
//: content nobody has asked to see yet.
//:
//: The fetch stays eager, because its answer decides whether the control is
//: shown at all: a packaged build may not ship the file, and offering a
//: disclosure that opens onto nothing is worse than not offering one. Only
//: the render is deferred, since that is the expensive half.
//:
//: `toggle` rather than `click`: a `<details>` can also be opened by the
//: keyboard, by find-in-page, and programmatically, and `toggle` is the one
//: event that fires for all of them.
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
  const paint = () => {
    if (fold.dataset.rendered) return;
    fold.dataset.rendered = "1";
    renderMarkdown(body, data.markdown);
  };
  if (fold.open) paint(); // already open from a previous visit
  fold.addEventListener("toggle", () => {
    if (fold.open) paint();
  });
}

//: PLAN.md B9's frontend half: `GET /debug/health` already assembled every
//: number cheaply (its own docstring's whole design constraint is <20ms on
//: an empty notebook), so this just paints them, no polling, since About is
//: somewhere you glance at, not a status bar. Read once per section open,
//: the same "rebuilt each open rather than cached" rule `openSettingsModal`
//: already uses for the model-status and backup rows just above this one in
//: the file.
async function renderHealthBlock() {
  const dbSize = $("health-db-size");
  const counts = $("health-counts");
  const jobs = $("health-jobs");
  const lastError = $("health-last-error");
  const latency = $("health-latency");
  if (!dbSize || !counts || !jobs || !lastError) return; // markup not present yet
  const health = await apiJson("/debug/health", { silent: true }).catch(() => null);
  if (!health) {
    // The endpoint itself is one more thing that can be down (offline
    // build, a locked notebook mid-request), a dash across the board reads
    // as "couldn't check", not "empty", so nothing here claims a zero it
    // never actually measured.
    for (const el of [dbSize, counts, jobs, lastError, latency]) if (el) el.textContent = ", ";
    return;
  }
  dbSize.textContent = `${formatFileSize(health.db?.size_bytes) || "0 B"} · ${health.data_dir}`;
  const c = health.counts || {};
  //: Each kind counted as the rest of the app counts it: notes are the
  //: dashboard's notes (no boards, no drafts), and boards and drafts are
  //: named rather than folded in (it read "96 notes" beside a dashboard's 44).
  //: A kind with none is left out, and "1 draft" is singular.
  const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;
  const parts = [plural(c.notes ?? c.entries ?? 0, "note", "notes")];
  if (c.drafts) parts.push(plural(c.drafts, "draft", "drafts"));
  if (c.boards) parts.push(plural(c.boards, "board or map", "boards and maps"));
  parts.push(plural(c.documents ?? 0, "document", "documents"));
  if (c.media) parts.push(plural(c.media, "file", "files"));
  if (c.attachments) parts.push(plural(c.attachments, "attachment", "attachments"));
  parts.push(plural(c.reminders ?? 0, "reminder", "reminders"));
  counts.textContent = parts.join(" · ");
  const running = health.jobs?.running || [];
  jobs.textContent = running.length
    ? running.map((job) => job.label).join(", ")
    : "Nothing running";
  const errors = health.recent_errors || [];
  const last = errors[errors.length - 1];
  lastError.textContent = last ? `[${last.level}] ${last.message}` : "None recorded";
  // PLAN B9's p50/p95, per task kind. The endpoint carried them from the
  // start; the block did not draw them (BACKLOG §116.1 item 2). Seconds with
  // one decimal, because a caption takes 3.2s and a re-index 40s, and "3210
  // ms" is a number nobody reads at a glance.
  //: What the search engine has to work with. Its own route says the Settings
  //: page wants this and the Settings page had never asked; it answers the
  //: question behind every "search did not find my note", which is whether
  //: the note is in the index at all and whether the vectors are warm. Kinds
  //: with nothing in them are left out: six zeroes say less than the two
  //: numbers that are not.
  const search = $("health-search");
  if (search) {
    const stats = await apiJson("/search/stats", { silent: true }).catch(() => null);
    if (!stats) search.textContent = ", ";
    else {
      const kinds = Object.entries(stats.index || {})
        .filter(([, n]) => n > 0)
        .map(([kind, n]) => `${n} ${kind}${n === 1 ? "" : "s"}`);
      const vectors = stats.vectors
        ? `${stats.vectors} vectors${stats.vectors_warm ? "" : " (not loaded yet)"}`
        : "no vectors yet, keyword search only";
      search.textContent = `${kinds.length ? kinds.join(" \u00b7 ") : "nothing indexed yet"} \u00b7 ${vectors}`;
    }
  }
  if (latency) {
    const secs = (ms) => `${(ms / 1000).toFixed(ms >= 10000 ? 0 : 1)}s`;
    const rows = Object.entries(health.latency_ms_by_kind || {})
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([kind, stat]) => `${kind}: ${secs(stat.p50_ms)} typical, ${secs(stat.p95_ms)} slow (${stat.count})`);
    latency.textContent = rows.length ? rows.join(" · ") : "No timed jobs yet";
  }
}

// --- finding a setting (§36B) ------------------------------------------------------
//
// Eighteen sections, grouped four ways. The grouping helps, and it is only
// ever right for some people, "where do I turn off web search?" is a guess
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
//
// "Live" does not have to mean "recomputed per keystroke", though, and it
// used to. `section.textContent` walks a whole subtree and builds one
// string, `.toLowerCase()` then copies it, and both ran for every one of
// them on every character typed.
//
// Measured on a fresh notebook at 1440x900 (scratchpad sweep, 2026-09-19):
// 17 sections, 63,093 characters rebuilt and lowercased per pass, 0.265 ms
// uncached against 0.005 ms cached, so 53x. A quarter of a millisecond is
// not a stall on this machine and it is not claimed to be one. It is worth
// removing anyway because of which way it moves: the sections that hold the
// most text are the ones filled in from the notebook (the model list, the
// tool catalog, the skills, the saved looks), so the cost grows with how
// much someone has, on exactly the machines least able to absorb it. The
// cache also means the input needs no debounce, which is the other way this
// gets "fixed" and the one that trades a real 200 ms delay on every
// keystroke for a saving of a quarter of one.
//
// So the string is cached per section and thrown away the moment anything
// under the modal actually changes, which is the event the "read it live"
// comment above was really about. A `WeakMap` keyed by the section element
// so a section that is ever replaced wholesale takes its entry with it.
//
// Only `childList` and `characterData` are observed, deliberately not
// `attributes`: `filterSettings` and `showSettingsSection` both toggle
// classes on elements inside this very subtree, and observing those would
// make every filter pass invalidate the cache it had just filled.
let settingsTextCache = new WeakMap();
let settingsTextCacheStale = false;
let settingsTextObserver = null;

function settingsSectionText(section) {
  if (!settingsTextObserver) {
    const modal = $("settings-modal");
    if (modal) {
      settingsTextObserver = new MutationObserver(() => {
        // One flag rather than a per-section diff: working out which
        // sections a mutation touched costs more than re-reading the one
        // section the next search actually asks about.
        settingsTextCacheStale = true;
      });
      settingsTextObserver.observe(modal, {
        childList: true,
        subtree: true,
        characterData: true,
      });
    }
  }
  if (settingsTextCacheStale) {
    settingsTextCache = new WeakMap();
    settingsTextCacheStale = false;
  }
  const cached = settingsTextCache.get(section);
  if (cached !== undefined) return cached;
  const text = (section.textContent || "").toLowerCase();
  settingsTextCache.set(section, text);
  return text;
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
  //: A select's list escapes to <body> while it is open, so it does not go
  //: away with the window: closing Settings with one open left the list
  //: floating over the page (measured, scratchpad/ui-sweeps/menus.js).
  if (typeof closeActionMenus === "function") closeActionMenus();
  $("settings-modal").classList.add("hidden");
  overlayReturnFocus?.focus?.();
  overlayReturnFocus = null;
}

// --- logs viewer (Wave A) ---------------------------------------------------------

// The ring buffer discards its oldest record silently once it is full, which
// makes a busy hour and a quiet one look identical: 200 rows either way, with
// no way to tell whether the top row is the start of the story or the middle.
// That is worst in exactly the case the viewer exists for, chasing something
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
// styled like a real console, see .log-terminal). Same persistence pattern
// as reminderView/timeline-view: a per-browser display preference, not
// something worth round-tripping through /preferences.
let logView = localStorage.getItem("logView") === "terminal" ? "terminal" : "list";

function logLevelRank(level) {
  return LOG_LEVEL_RANK[String(level || "").toUpperCase()] ?? 1;
}

// The ring buffer discards its oldest record silently once it is full, which
// makes a busy hour and a quiet one look identical: the same rows either way,
// with no way to tell whether the top row is the start of the story or the
// middle. That is worst in exactly the case the viewer exists for, chasing
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
    `dropped: this log keeps the most recent ${stats.capacity.toLocaleString()}.${since}`;
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

  // Which side of the app said it. Only worth showing in the merged view, 
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
  text.textContent = record.logger ? `${record.logger}: ${record.message}` : record.message;
  line.appendChild(text);

  // One record, copyable on its own. "Copy all" plus the filters can already
  // narrow to a single error, but that is a three-step answer to "send me that
  // error", and hand-selecting a row whose traceback lives in its own
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
    pre.textContent = record.trace; // real newlines here: it is not a row
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
// always included here even though the row only shows it in the merged view, 
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
  // bounded, `MAX_LOG_ROWS` (1000) is a real cap, not an unbounded notebook , 
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
//, message", level padded like uvicorn's own default formatter pads
// "INFO:"/"WARNING:"/"ERROR:" so a column of mixed levels still lines up.
function logTerminalLineText(record) {
  const when = new Date(record.time).toLocaleTimeString();
  const level = `${record.level}:`.padEnd(9);
  const body = record.logger ? `${record.logger}: ${record.message}` : record.message;
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
// doesn't either: every line prints, indented, right under the record that
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
    // Set synchronously so it is in place before renderLogs() draws: the
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
  badge.title = `${logErrorsSinceOpened} error${logErrorsSinceOpened === 1 ? "" : "s"} since you last looked at the logs, click to show just those`;
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
  // with nothing behind it, a status that lies is worse than none.
  setLogLive("paused", "paused");
}

async function copyLogs() {
  const shown = logRecords.filter(logMatchesFilters);
  if (!shown.length) {
    toast("Nothing to copy: the filters above are hiding every record.", true);
    return;
  }
  const text = shown.map(logRecordText).join("\n");
  if (await copyToClipboard(text)) {
    toast(`Copied ${shown.length} record${shown.length === 1 ? "" : "s"}.`);
  }
}

// The button copies what is ON SCREEN, not the whole buffer, so it has to say
// which. "Copy all" while a filter hides 400 records is a promise it does not
// keep: and the reader would not find out until they pasted it.
function renderCopyLogsLabel() {
  const button = $("logs-copy");
  if (!button) return;
  const shown = logRecords.filter(logMatchesFilters).length;
  const filtering = shown !== logRecords.length;
  //: `setLabel`, not `textContent`: this is a row in the Logs dock's kebab
  //: now, so the label carries an icon, and writing the text directly would
  //: delete it the first time a filter changed. The same trap the Support
  //: bundle button was already in (it restored `textContent` after a run and
  //: dropped its own icon), fixed the same way.
  setLabel(button, filtering ? `ph:copy Copy ${shown} shown` : "ph:copy Copy all");
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
// transmitted anywhere: that is the whole difference between this and the
// crash reporting the roadmap turned down.
async function downloadSupportBundle() {
  const button = $("logs-bundle");
  button.disabled = true;
  //: The label is an icon plus words, so it is saved and restored as one:
  //: `textContent` alone read back "Support bundle" and put it back without
  //: the glyph, so the button lost its icon the first time anyone built a
  //: bundle and never got it back until a reload.
  const original = button.textContent.trim();
  setLabel(button, "ph:hourglass-medium Collecting…");
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
    setLabel(button, `ph:download-simple ${original}`);
  }
}

// --- theme ----------------------------------------------------------------------

//: **A theme switch is one repaint, not a cross-fade and two canvas
//: rebuilds** (INBOX 202, the owner: "switching between light and dark mode
//: is realllly glitchy and takes a bit to load").
//:
//: Measured before this (`scratchpad/ui-sweeps/chrome202.js`,
//: `chrome202art.js`, headless at 1440x900): the click starts 24 CSS
//: transitions, on background-color and the four border colours, running
//: 120ms, 160ms and 200ms depending on which rule the surface got its
//: transition from. That is what "glitchy" describes: the app does not
//: change theme, it dissolves into the other one at three speeds at once,
//: while the 79 `backdrop-filter` surfaces re-composite over a ground that is
//: itself still moving.
//:
//: And the two generative canvases are torn down and rebuilt *inside the
//: click*: `startBgArt()` removes the p5 instance and its canvas and builds a
//: new sketch, and `refreshArtForTheme()` does the same to the dashboard
//: constellation. With the background art on, the click's own synchronous
//: work measured 10.9ms against 7.4ms with it off, and the canvas is visibly
//: absent while it is rebuilt, which is the "takes a bit to load" half.
//:
//: So: the colours are applied with transitions suppressed, which makes the
//: switch a single frame, and the canvas work is moved off the click to the
//: frame after the new colours have painted. Both rebuilds are coalesced, so
//: pressing the toggle five times rebuilds the art once rather than five
//: times.
let themeArtTimer = 0;

function repaintThemeAtOnce(apply) {
  const root = document.documentElement;
  root.classList.add("theme-switching");
  apply();
  //: Force the new custom properties to be computed while the suppression is
  //: still on, so no transition can be started from the old values.
  void getComputedStyle(root).backgroundColor;
  //: Two frames: one for the browser to paint the new colours, one to be sure
  //: that paint has happened before transitions are allowed back. Removing it
  //: in the first frame re-arms them against values that have not landed yet,
  //: which is the same cross-fade with extra steps.
  requestAnimationFrame(() => {
    requestAnimationFrame(() => root.classList.remove("theme-switching"));
  });
}

function scheduleThemeArt() {
  if (themeArtTimer) cancelAnimationFrame(themeArtTimer);
  themeArtTimer = requestAnimationFrame(() => {
    themeArtTimer = 0;
    if (bgArtOn()) startBgArt();
    //: The dashboard constellation reads light-or-dark when it is built, so
    //: it is rebuilt too; it returns immediately when the dashboard is not on
    //: screen.
    refreshArtForTheme();
  });
}

function toggleTheme() {
  const root = document.documentElement;
  // Current effective theme: explicit choice, else the OS preference.
  const current =
    root.dataset.theme ||
    (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
  const next = current === "dark" ? "light" : "dark";
  localStorage.setItem("theme", next); // remembered across restarts

  repaintThemeAtOnce(() => {
    root.dataset.theme = next;
    // Clear any custom background colour that would otherwise override the new theme
    localStorage.removeItem("page-bg");
    localStorage.removeItem("page-bg-dark");
    applyPageBackground(null);
    if (document.getElementById("page-bg-custom")) {
      document.getElementById("page-bg-custom").value = "#f5f7fb";
    }
    applyResolvedMode();
  });
  scheduleThemeArt();
}

// --- Wave J: accent themes + generative background --------------------------------

// Simple accent presets. The colours themselves live in the CSS
// (:root[data-accent="…"]); this list just drives the swatch picker and
// gives the background art a hue to paint with.
const ACCENTS = [
  { name: "indigo", label: "Indigo", swatch: "#4664f0" },
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
// about the accent picker, so a curated palette changed every surface in the
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
  // manual choice: otherwise merely picking a theme would pin its colour as
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
//    bottom, both `:root[data-…]` and so both specificity (0,2,0): so the
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
// documented layering, your change → theme → default, applied to colour.
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
  // Performance mode (INBOX 49): "auto" turns it on for a small machine, 4
  // cores or 4 GB or fewer, and when the operating system asks for reduced
  // transparency; "on" and "off" are the person's own word. On, it takes the
  // glass blur and the animations off and runs the graph's physics at half
  // rate, whatever the three settings below say, without rewriting them, so
  // turning it back off restores exactly the look that was chosen.
  perf: "auto", // auto | on | off
  motion: "auto", // "auto" = follow the OS; "reduced" = force-still
  // Background movement, separate from the interface-wide motion setting.
  // "auto" follows reduced-motion; "moving" is an explicit request that
  // overrides it; "still" never moves. This key was missing entirely, which
  // left the picker rendering blank (selectedIndex -1): so choosing "Moving"
  // looked like it did nothing, and there was no way at all to get the art
  // moving on a machine with reduced motion turned on.
  // "auto" follows the reduced-motion setting; "moving" is an explicit
  // request that overrides it; "still" never moves. This key was declared
  // twice, once here as "auto" and again below as "moving", after two
  // sessions fixed the same blank-picker bug independently. The later
  // declaration silently won, so the documented default was not the one
  // anybody got. One declaration, matching the <option> list and the hint
  // text that explains what "auto" means.
  "bg-motion": "auto", // auto | moving | still
  //: **Progress indicators, separate from everything above, and defaulting
  //: to "always" on purpose.** The background art's own key is the shape this
  //: copies; the *default* is what differs, and the reason is the whole point
  //: of the setting. Reported with a screenshot of a frozen "Thinking…":
  //: "the thinking and writing animation is completely broken, doesn't move."
  //: The app's Reduce motion had turned it into one static italic word, 
  //: which is also exactly what a hung app shows, so the setting had made the
  //: interface unable to tell the user whether anything was happening.
  //:
  //: Turning off "animations and transitions" is a statement about chrome. A
  //: spinner is not chrome. "always" keeps progress moving through this app's
  //: own Reduce motion; the *operating system's* accessibility setting is
  //: still obeyed (see `progressMotionWanted` in app.js), and the indicator
  //: steps through a colour rather than freezing when it is.
  "progress-motion": "always", // always | auto | still
  //: Generated faces (`nameMark`, avatars.js) blink and emote. Always by
  //: default (the owner: "I want the avatars animated by default"); only
  //: the faces on screen move (`watchNameMark`), so a long list costs what
  //: its visible rows cost. On hover and Off remain one click away.
  "avatar-motion": "always", // always | hover | off
  "avatar-follow": "on", // on | off
  "avatar-buddy": "off", // off | me | persona | atlas
  //: How Atlas is drawn everywhere (atlas.js): the character, or the classic
  //: globe the owner asked to keep as a choice.
  "atlas-style": "character", // character | classic
  "dash-mark": "logo", // logo | me | persona
  // Half strength (was 90): a professional product has a quiet page
  // (UI_MODERNISATION_PLAN Phase 3). theme-boot.js and index.html carry the
  // same default: keep the three in step.
  "bg-intensity": "45",
  radius: "14", // global corner rounding, px
  // 14px, not 18. Blur radius is the exponential term in a backdrop-filter's
  // cost, and the published band worth staying inside is 8-15px. The slider
  // still reaches higher for anyone who wants it; this is what a fresh
  // profile gets. See `.glass` in css/03-dashboard-widgets.css for the
  // measured layer counts this multiplies across.
  "glass-blur": "14", // frosted-glass blur strength, px
  // Percent of a card's own base alpha that survives, separate dial from
  // blur strength above (how frosted vs. how clear). 100 renders identically
  // to before this setting existed.
  "glass-opacity": "100",
  // Off by default even while glass itself is on, a diagonal highlight is a
  // stronger visual statement than the blur/opacity dials above, worth
  // opting into rather than imposing. Turning glass on from off auto-sets
  // this to "on" (see #glass-toggle's own listener), so the full look shows
  // up without a second trip to Settings; unchecking #glass-sheen-toggle
  // afterward turns just the sheen back off without touching glass itself.
  "glass-sheen": "off",
  // The flat looks' soft ground light (owner: "maybe it can be togglable").
  "page-wash": "on",
  // 0-100, how strong the sheen reads when it's on: its own dial, separate
  // from whether it's on at all.
  "glass-sheen-strength": "100",
  zoom: "100", // §37E: interface-wide scale, percent: multiplies the root font-size
  "bg-style": "aurora", // aurora | constellation | waves | bubbles | mesh | microbes | mycelium
  palette: "default", // which curated colour set; themes select one
  // No accent by default: the palette supplies the colour until you pick one
  // yourself. Named here so appearancePref("accent") has a defined answer
  // rather than returning undefined and relying on a lookup miss.
  accent: "indigo",
  // Both of these arrived with their Settings controls and neither was listed
  // here, which is not a cosmetic omission, it took the borders and shadows
  // off the entire interface. `applyAppearance` writes them onto <html> as
  // custom properties, so a missing default became the literal strings
  // "undefined" and "NaN" on the root element. `border-style: undefined` is
  // invalid, so `border-style: var(--border-style) !important`, which is
  // `!important` and matches .card, input, textarea, select, .modal and
  // .sidebar: computed to `none` for all of them. `--shadow-intensity: NaN`
  // poisoned `--glass-shadow`'s rgba(), so every card's box-shadow computed to
  // `none` as well. The app rendered completely flat and borderless on a fresh
  // profile, and stayed that way until you happened to touch both controls.
  "border-style": "solid", // solid | dashed | none
  "shadow-intensity": "5", // percent; divided by 100 into --shadow-intensity
  // Matches the pre-paint script's own `pref("theme", "system")`. Without it
  // `applyThemeChoice(undefined)` took the else branch and stamped
  // `data-theme="undefined"` onto <html> on every fresh profile. The app still
  // looked right, because the palettes key off the resolved `data-mode`, but
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
// of its own: main's palettes already own colour, with a matched light and
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
const DEFAULT_THEME_PRESET = "utilitarian";

const THEME_PRESETS = {
  //: **Quiet utilitarian is the default look** (UI_MODERNISATION_PLAN
  //: decisions, 2026-09-23): used whenever no look has been chosen, see
  //: `activeThemePreset`. The old default is "Classic", kept exactly.
  //: No density of its own: it once set compact, which as the default
  //: scaled every spacing token to 0.75 across the app (owner: "the
  //: dashboard feels squished now"). Quiet is flat colour and small radii,
  //: not less room; density stays the reader's choice.
  utilitarian: {
    label: "Quiet utilitarian",
    values: { palette: "utilitarian", glass: "off", radius: "8" },
  },
  default: {
    label: "Classic",
    values: { palette: "default", glass: "on", radius: "14" },
  },
  paper: {
    label: "Editorial paper",
    values: { palette: "paper", glass: "off", radius: "4" },
  },
  mono: {
    label: "Technical mono",
    values: { palette: "mono", glass: "off", radius: "2", density: "compact" },
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
  //: No look chosen yet means the default look, not "no look": the default is
  //: a look like any other now (Quiet utilitarian), and theme-boot.js reads
  //: the same fallback so the first paint agrees.
  const name = localStorage.getItem("themePreset") ?? DEFAULT_THEME_PRESET;
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
  // the floor: so two settings resolved to `undefined` and wrote that word
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
  // first, so a single earlier tweak, one accent, one corner radius, sat on
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

// Drop the manual layer, keeping the chosen theme, the counterpart to
// "reset the theme" below.
function clearManualOverrides() {
  for (const key of manualOverrides()) localStorage.removeItem(key);
  applyCustomAccent(null);
  applyPageBackground(null);
  applyThemePreset(activeThemePreset());
  renderAppearance();
  toast("Your manual changes are cleared, the theme is showing on its own.");
}

// Drop the theme, keeping every manual change, so "reset the theme to
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
// the part people give up on and end up with a default they didn't choose: so
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
  // read against, so it keeps only a trace of it, enough to feel related, far
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
    note.textContent = "That colour didn't parse: try picking it again.";
    return;
  }
  localStorage.setItem("accent-custom", scheme.accent);
  // A scheme's background is worked out *for a mode*, the same accent wants a
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
// them: the same idea as the built-in presets, which are also just bundles of
// those values.
//
// Stored server-side with the rest of the preferences rather than in the
// browser. The look itself lives in localStorage because it has to be applied
// before first paint, but a *saved* look is something you would be upset to
// lose to a cleared cache, and in preferences it also rides along in the
// daily backup and is there in the desktop window as well as the browser tab.

const MAX_CUSTOM_THEMES = 20;

//: Everything a saved look captures: every manual override, plus the
//: background-art switch. `bgArt` is deliberately NOT in OVERRIDABLE_KEYS, 
//: that list also drives "clear my manual changes", and turning someone's
//: background off is not what clearing a colour override should do. But a
//: look that remembers *which* art and how intense, and not whether it is on,
//: can never turn it on when applied. Which is exactly what was reported
//: (§35J): the generative background had to be switched on by hand, separately
//: from the saved theme it belongs to.
//
// LOOK_KEYS itself lives in app.js, not here, see the comment there. It is
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
    toast(`You can keep ${MAX_CUSTOM_THEMES} saved looks: delete one first.`, true);
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
    empty.textContent = "Nothing saved yet: set the app up how you like it, then save it here.";
    box.appendChild(empty);
    return;
  }
  for (const theme of themes) {
    box.appendChild(savedThemeCard(theme));
  }
}

//: One saved look, shown as the look rather than as its name.
//:
//: It was a text pill and a ✕, which told you a look called "Sea of
//: Prosperity" existed but nothing about what it was, so picking between five
//: of them meant applying each in turn and undoing it. A saved *look* is a set
//: of colours; showing the colours is the whole job of this control.
//:
//: The values are already stored (`currentLookValues`), so the preview is the
//: real thing, not an illustration: the same accent, page and card colours the
//: look will apply. A theme saved before a given key existed simply falls back
//: to the current value for that swatch, which is also what applying it does.
function savedThemeCard(theme) {
  const values = theme.values || {};
  // Built from the keys a look actually stores (OVERRIDABLE_KEYS in app.js),
  // not from invented ones: the accent is either a custom hex or the name of a
  // preset whose swatch ACCENTS already holds, and light/dark is what decides
  // every neutral around it. Anything the saved look does not carry falls back
  // to the live theme, which is also what applying it would do.
  const named = (ACCENTS || []).find((a) => a.name === values.accent);
  const accent = values["accent-custom"] || named?.swatch || cssVarNow("--accent");
  const dark = (values.theme || document.documentElement.dataset.theme || "dark") !== "light";
  const page = dark ? "#12141c" : "#f5f6f9";
  const surface = dark ? "#1b1f2b" : "#ffffff";
  const ink = dark ? "#e7e9ee" : "#1f2430";

  const card = document.createElement("div");
  card.className = "saved-look";

  const preview = document.createElement("button");
  preview.type = "button";
  preview.className = "saved-look-preview";
  preview.title = `Apply “${theme.name}”`;
  preview.setAttribute("aria-label", `Apply the saved look “${theme.name}”`);
  preview.style.background = page;
  // A miniature of the thing itself: a card on the page colour, a line of ink
  // on it, and the accent as the one saturated element, which is how the real
  // interface is composed.
  const mini = document.createElement("span");
  mini.className = "saved-look-mini";
  mini.style.background = surface;
  const line = document.createElement("span");
  line.className = "saved-look-line";
  line.style.background = ink;
  const dot = document.createElement("span");
  dot.className = "saved-look-dot";
  dot.style.background = accent;
  mini.append(line, dot);
  preview.appendChild(mini);
  preview.addEventListener("click", () => applySavedTheme(theme));

  const foot = document.createElement("div");
  foot.className = "saved-look-foot";
  const name = document.createElement("span");
  name.className = "saved-look-name";
  name.textContent = theme.name;
  name.title = theme.name;
  const remove = smallButton("ph:x", `Delete “${theme.name}”`, () => {
    deleteSavedTheme(theme.name).catch((e) => toast(e.message, true));
  });
  remove.classList.add("ghost", "icon-button", "saved-look-delete");
  foot.append(name, remove);

  card.append(preview, foot);
  return card;
}

//: One resolved custom property, for building a preview out of the live theme
//: when a saved look predates a given key.
function cssVarNow(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || "";
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
// refuses: this feature was the one thing the strict policy broke. Adopted
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
// A machine that will feel every blurred layer: the two signals a browser
// gives without a permission prompt. `deviceMemory` is Chromium-only and
// capped at 8, so a missing value never counts as small on its own. Two
// cores, not four: a 4-thread laptop is common and runs the glass fine, and
// the owner wants the frosted art on by default, so only a machine that is
// small on memory or down to two threads is switched without being asked.
function smallMachine() {
  return (
    (navigator.deviceMemory && navigator.deviceMemory <= 4) ||
    (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 2)
  ) === true;
}

function lessTransparencyWanted() {
  return window.matchMedia("(prefers-reduced-transparency: reduce)").matches;
}

// What Performance mode resolves to right now. theme-boot.js repeats this
// reading for the first paint; keep the two in step.
function perfModeOn() {
  const pref = appearancePref("perf");
  if (pref === "on") return true;
  if (pref === "off") return false;
  return smallMachine() || lessTransparencyWanted();
}

// Why it is on, for the hint under the setting: the person's own choice
// needs no explanation; an automatic one does.
function perfModeReason() {
  if (appearancePref("perf") !== "auto" || !perfModeOn()) return "";
  if (lessTransparencyWanted()) return "On: your system asks for less transparency.";
  return "On for this machine: 2 cores or 4 GB of memory or fewer.";
}

function applyAppearance() {
  const root = document.documentElement;
  root.dataset.fontsize = appearancePref("fontsize");
  root.dataset.font = appearancePref("font");
  root.dataset.density = appearancePref("density");
  const perf = perfModeOn();
  root.dataset.perf = perf ? "on" : "off";
  // The preferences themselves are untouched: Performance mode overrides
  // what the page shows, not what the person chose.
  root.dataset.glass = perf ? "off" : appearancePref("glass");
  root.dataset.glassSheen = appearancePref("glass-sheen");
  root.dataset.pageWash = appearancePref("page-wash");
  root.style.setProperty("--glass-sheen-strength", Number(appearancePref("glass-sheen-strength")) / 100);
  root.dataset.themePreset = activeThemePreset();
  root.dataset.motion = perf ? "reduced" : appearancePref("motion");
  root.dataset.progressMotion = appearancePref("progress-motion");
  root.dataset.avatarMotion = appearancePref("avatar-motion");
  root.dataset.avatarFollow = appearancePref("avatar-follow");
  if (typeof syncNameMarkBuddy === "function") syncNameMarkBuddy();
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
  // is inside `--glass-shadow`'s rgba(), so a bad number silently removes
  // every shadow in the app rather than failing anywhere near this line.
  const shadow = Number(appearancePref("shadow-intensity", "5"));
  root.style.setProperty(
    "--shadow-intensity", String((Number.isFinite(shadow) ? shadow : 5) / 100)
  );
  applyResolvedMode();
  // remember=false: this runs on every startup, and recording the resolved
  // value would pin whatever the theme supplied as a manual override, after
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
// "System" there is no data-theme attribute for CSS to match on, and writing
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
// say which way it will flip looked identical either way, and there was no
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
  // is written inline: so it has to be re-picked here rather than left to the
  // stylesheet, which cannot outrank it.
  applyPageBackground(currentPageBackground());
}

// Follow the OS while the choice is "System", without a reload.
window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => {
  if (effectiveTheme() === "system") {
    //: Same one-frame repaint the toggle uses (INBOX 202): the OS changing
    //: mode under the app is the same event as the button, arriving by
    //: another route.
    repaintThemeAtOnce(applyResolvedMode);
    scheduleThemeArt();
  }
});

function applyThemeChoice(choice, remember = true) {
  if (remember) {
    if (choice === "system") localStorage.removeItem("theme");
    else localStorage.setItem("theme", choice);
  }
  //: The attribute that changes every colour in the app is set INSIDE the
  //: repaint (INBOX 202), not before it: set outside, the transitions it
  //: starts are already running by the time they are suppressed.
  repaintThemeAtOnce(() => {
    if (choice === "system") delete document.documentElement.dataset.theme;
    else document.documentElement.dataset.theme = choice;
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
    renderBrandLogo();
  });
  // The dashboard constellation reads light-or-dark when it is built, so it
  // has to be rebuilt too, the background art already was, which is why only
  // this one appeared stuck on the old mode. Both are off the click now
  // (INBOX 202), coalesced into one frame after the colours have landed.
  scheduleThemeArt();
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
    caption.className = "theme-card-name";
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
    note.textContent = "No theme selected: the app's default look.";
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
  $("progress-motion").value = appearancePref("progress-motion");
  $("avatar-motion").value = appearancePref("avatar-motion");
  $("avatar-follow").checked = appearancePref("avatar-follow") === "on";
  $("avatar-buddy").value = appearancePref("avatar-buddy");
  $("atlas-style").value = appearancePref("atlas-style");
  $("dash-mark").value = appearancePref("dash-mark");
  renderProgressMotionHint();
  $("bg-motion").value = appearancePref("bg-motion");
  $("bg-motion-row").classList.toggle("hidden", !bgArtOn());
  renderBgMotionHint();
  $("perf-mode").value = appearancePref("perf");
  const perfWhy = perfModeReason();
  $("perf-mode-hint").textContent = perfWhy;
  $("perf-mode-hint").classList.toggle("hidden", !perfWhy);
  $("glass-toggle").checked = appearancePref("glass") === "on";
  $("glass-row").classList.toggle("disabled-row", perfModeOn());
  $("reduce-motion-row").classList.toggle("disabled-row", perfModeOn());
  $("glass-sheen-toggle").checked = appearancePref("glass-sheen") === "on";
  if ($("page-wash-toggle")) $("page-wash-toggle").checked = appearancePref("page-wash") === "on";
  $("glass-sheen-row").classList.toggle("disabled-row", appearancePref("glass") !== "on" || perfModeOn());
  $("glass-sheen-strength").value = appearancePref("glass-sheen-strength");
  $("glass-sheen-strength-value").textContent = `${appearancePref("glass-sheen-strength")}%`;
  $("glass-sheen-strength-row").classList.toggle(
    "disabled-row",
    appearancePref("glass") !== "on" || appearancePref("glass-sheen") !== "on"
  );
  $("bg-intensity").value = appearancePref("bg-intensity");
  $("bg-intensity-value").textContent = `${appearancePref("bg-intensity")}%`;
  $("bg-art-style").value = appearancePref("bg-style");
  renderBgStyleHint();
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
  $("accent-custom").value = localStorage.getItem("accent-custom") || "#4664f0";
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

// A frozen background with no explanation reads as a broken app, which is
// how it was reported. Say which setting is holding it still, and that
// "Moving" will override it.
//: The one case where this setting is *not* in charge, said where the choice
//: is made rather than left to be discovered. "Always move" overrides this
//: app's own Reduce motion; it deliberately does not override the operating
//: system's, which can be on for a medical reason. `typingDots` still steps
//: the dots through a colour there, so the indicator is never dead.
function renderProgressMotionHint() {
  const hint = $("progress-motion-hint");
  if (!hint) return;
  const osReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const choice = appearancePref("progress-motion");
  let text = "";
  if (choice === "always" && osReduced) {
    text = "Moving anyway: your system asks for reduced motion, and this setting overrides it. Choose Auto to follow the system instead.";
  } else if (choice === "still") {
    text = "Held still. The dots step through a colour once a second so you can still tell work is happening.";
  }
  hint.textContent = text;
  hint.classList.toggle("hidden", !text);
}

// The two seeded styles say what they grew from and what grew, so the
// name-to-ecosystem link is visible rather than a hidden rule (the species
// are the same ones bg-art.js draws: same strains, same genome).
function renderBgStyleHint() {
  const hint = $("bg-style-hint");
  if (!hint) return;
  const style = bgArtStyle();
  let text = "";
  if ((style === "microbes" || style === "mycelium") && typeof bgArtStrains === "function") {
    const seed = bgArtSeedText();
    const names = bgArtStrains(seed, bgArtStrainCount(seed)).map(bgArtSpeciesName);
    const list = names.length > 1 ? `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}` : names[0];
    text = `Grown from "${seed}": ${list}. A new display name grows a new one.`;
  }
  hint.textContent = text;
  hint.classList.toggle("hidden", !text);
}

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
    id: "utilitarian",
    name: "Quiet",
    note: "The default. A warm grey ground, solid panels and one ink-blue accent.",
    light: { page: "#f4f3f1", card: "#ffffff", accent: "#2f5bd3", border: "rgba(28,28,26,0.12)" },
    dark: { page: "#161615", card: "#1e1e1c", accent: "#78a8ff", border: "rgba(236,235,232,0.12)" },
  },
  {
    id: "default",
    name: "Classic",
    note: "The original look: indigo glass over a soft gradient.",
    light: { page: "linear-gradient(135deg,#e9edfb,#f6f2ec 45%,#e6f1f2)", card: "rgba(255,255,255,0.75)", accent: "#4664f0", border: "rgba(31,36,48,0.12)" },
    dark: { page: "linear-gradient(135deg,#0e1017,#171a26 45%,#0f1720)", card: "rgba(29,33,46,0.85)", accent: "#8b9df8", border: "rgba(255,255,255,0.14)" },
  },
  {
    id: "paper",
    name: "Paper",
    note: "Off-white paper, black type and hairlines, one red-orange for actions.",
    light: { page: "#faf9f6", card: "#faf9f6", accent: "#c63d17", border: "rgba(17,17,17,0.18)" },
    dark: { page: "#141312", card: "#141312", accent: "#ff7a4d", border: "rgba(242,239,233,0.18)" },
  },
  {
    id: "mono",
    name: "Mono",
    note: "Cool graphite, monospace numbers and a green signal accent.",
    light: { page: "#eceff2", card: "#f8f9fa", accent: "#1a7f45", border: "rgba(21,25,30,0.15)" },
    dark: { page: "#0f1215", card: "#161a1f", accent: "#42d67f", border: "rgba(230,234,238,0.13)" },
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
    note: "Indigo ground with a teal accent, both colours, not blended.",
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
  // yourself: at which point yours wins and stays won.
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
      // higher specificity: leaving it would make every palette come out the
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
          ? `Palette: ${palette.name}. Its own accent is back, pick another below if you'd rather.`
          : `Palette: ${palette.name}.`
      );
    });
    grid.appendChild(card);
  }
}

function resetAppearance() {
  for (const key of [
    "fontsize", "font", "density", "glass", "perf", "motion", "progress-motion", "avatar-motion", "avatar-follow", "avatar-buddy", "atlas-style", "dash-mark", "bg-intensity", "accent",
    "contrast", "bgArt", "theme", "radius", "glass-blur", "glass-opacity",
    "glass-sheen", "glass-sheen-strength", "page-wash", "bg-style", "bg-motion", "palette", "themePreset",
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

// --- generative background ---------------------------------------------------------
//
// The styles and the runtime (mounting, pausing, the still capture) live in
// bg-art.js, which loads just before this file; this part decides whether
// the art runs, and moving or still, from the settings.

// A seeded style (microbes, mycelium) started before the preferences
// arrived, or before a rename, grew from the old name; regrow it from the
// one in Preferences now. A no-op for every other style and when nothing
// changed.
function bgArtRefreshSeed() {
  if (bgArtSeedUsed === null || !bgArtOn()) return;
  if (bgArtSeedUsed !== bgArtSeedText()) startBgArt();
}

function bgArtOn() {
  return localStorage.getItem("bgArt") === "on";
}

function stopBgArt() {
  bgArtHalt();
}

// Which generative background to paint. Persisted like the other
// appearance prefs (user asked for more variety of art).
const BG_ART_STYLES = ["aurora", "constellation", "waves", "bubbles", "mesh", "microbes", "mycelium"];
// One source of truth for the chosen style. This used to read a "bgArtStyle"
// key that nothing writes any more (the picker saves "bg-style"), so the
// builder always fell back to aurora no matter what was selected.
function bgArtStyle() {
  const saved = appearancePref("bg-style");
  return BG_ART_STYLES.includes(saved) ? saved : "aurora";
}

function startBgArt() {
  // Wanting a calm background isn't the same as wanting a calm interface, so
  // the art has its own setting. "Moving" is an explicit request and wins over
  // the reduced-motion hint: the hint exists to protect people from motion
  // they didn't ask for, and this is someone asking for it, in a control that
  // does nothing else. Without that override there was no way to get the art
  // moving at all on a machine with reduced motion on, which is exactly what
  // was reported.
  const bgMotion = appearancePref("bg-motion");
  // **"Moving" wins over the reduced-motion hint, and does not win over
  // Performance mode.** The hint exists to protect people from motion they
  // did not ask for, and this setting is someone asking for it, in a control
  // that does nothing else; without that override there was no way to get the
  // art moving at all on a machine with reduced motion on, which was
  // reported. Performance mode is a different kind of statement: not a
  // preference about motion but a judgement about what this machine can
  // afford to draw, and DESIGN.md rule 12 says every animation stops there
  // except the progress indicators. Measured at 1440x900 in headless
  // Chromium, the art costs between +17ms and +28ms a frame
  // (`scratchpad/ui-sweeps/bgart.js`), which makes it the single most
  // expensive thing Performance mode could switch off, and it was the one
  // thing that kept running.
  //: **Battery-efficient mode stops it too, and "moving" does not override
  //: that** (INBOX 260), for the same reason Performance mode is not
  //: overridden two lines up: both are statements about what this machine
  //: should be spending, not preferences about motion, and this art is the
  //: most expensive thing on the page to draw (+17ms to +28ms a frame,
  //: `scratchpad/ui-sweeps/bgart.js`). A person asking for less battery use
  //: is asking for exactly that saving.
  const reduceMotion =
    bgMotion === "still" ||
    perfModeOn() ||
    (typeof batteryModeOn === "function" && batteryModeOn()) ||
    (bgMotion !== "moving" && reducedMotionWanted());
  const bgStyle = bgArtStyle();
  //: No p5: the art draws on its own canvas (bg-art.js), so it mounts at
  //: once, including the one boot-time call to this function that used to
  //: arrive before p5 had loaded and wait for it.
  // Intensity drives how much is on screen, not just the CSS opacity.
  const intensity = Number(appearancePref("bg-intensity")) || 90;
  bgArtRun({
    style: bgStyle,
    dark: document.documentElement.dataset.mode === "dark",
    // Whatever colour the app is wearing, accent picker or curated palette.
    accent: currentAccentHex(),
    // The intensity slider scales how much is actually on screen, so each
    // style decides its own population from one number.
    density: Math.max(0.25, intensity / 90),
    // The seeded styles (microbes, mycelium) grow their species from it.
    seedText: bgArtSeedText(),
    still: reduceMotion,
    requested: bgMotion === "moving",
    restart: () => { if (bgArtOn()) startBgArt(); },
  });
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
$("perf-mode").addEventListener("change", (e) => {
  localStorage.setItem("perf", e.target.value);
  applyAppearance();
  renderAppearance();
});
// The OS setting can change while the app is open; "auto" follows it.
window.matchMedia("(prefers-reduced-transparency: reduce)").addEventListener("change", () => {
  applyAppearance();
  if (!$("settings-appearance").classList.contains("hidden")) renderAppearance();
});
$("glass-toggle").addEventListener("change", (e) => {
  const turningOn = e.target.checked && appearancePref("glass") !== "on";
  localStorage.setItem("glass", e.target.checked ? "on" : "off");
  // Asked for directly: switching glassmorphism on from off also turns the
  // sheen on, so the full look shows up in one action, the sheen's own
  // checkbox can still turn it back off afterward without touching this.
  if (turningOn) localStorage.setItem("glass-sheen", "on");
  applyAppearance();
  renderAppearance();
});
$("page-wash-toggle")?.addEventListener("change", (e) => {
  localStorage.setItem("page-wash", e.target.checked ? "on" : "off");
  applyAppearance();
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
  // startBgArt()'s comment: that fix was reported missing once already).
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
// All four routes go through app.js's setZoom, so the slider, the buttons, the
// Ctrl+/- shortcut and the command palette cannot disagree about the range,
// the step, or where the value is stored.
$("zoom-slider").addEventListener("input", (e) => setZoom(Number(e.target.value)));
$("zoom-in")?.addEventListener("click", () => nudgeZoom(1));
$("zoom-out")?.addEventListener("click", () => nudgeZoom(-1));
$("zoom-reset")?.addEventListener("click", () => setZoom(100));
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
  renderBgStyleHint();
  if (bgArtOn()) startBgArt();
});
$("avatar-follow").addEventListener("change", (e) => {
  const value = e.target.checked ? "on" : "off";
  localStorage.setItem("avatar-follow", value);
  document.documentElement.dataset.avatarFollow = value;
});
$("avatar-buddy").addEventListener("change", (e) => {
  localStorage.setItem("avatar-buddy", e.target.value);
  syncNameMarkBuddy();
});
$("atlas-style").addEventListener("change", (e) => {
  localStorage.setItem("atlas-style", e.target.value);
  if (typeof atlasRepaint === "function") atlasRepaint();
});
$("dash-mark").addEventListener("change", (e) => {
  localStorage.setItem("dash-mark", e.target.value);
  if (typeof paintDashEmblem === "function") paintDashEmblem();
});
$("avatar-motion").addEventListener("change", (e) => {
  localStorage.setItem("avatar-motion", e.target.value);
  document.documentElement.dataset.avatarMotion = e.target.value;
});
$("progress-motion").addEventListener("change", (e) => {
  localStorage.setItem("progress-motion", e.target.value);
  document.documentElement.dataset.progressMotion = e.target.value;
  renderProgressMotionHint();
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

wireBackdropClose($("settings-modal"), () => closeSettingsModal()); // backdrop click
for (const button of document.querySelectorAll("#settings-nav button")) {
  button.addEventListener("click", () => showSettingsSection(button.dataset.section));
}
$("settings-search")?.addEventListener("input", (e) => filterSettings(e.target.value));
$("settings-search")?.addEventListener("keydown", (e) => {
  // Escape clears the filter rather than closing the whole panel, closing on
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
  if (!link) return;
  //: `data-goto-target` lands on one row of that section, scrolled to and
  //: flashed the way the catalogue's deep links are, rather than on its top.
  if (link.dataset.gotoTarget) openSettingsModal(link.dataset.gotoSection, link.dataset.gotoTarget);
  else showSettingsSection(link.dataset.gotoSection);
});
// Same idea, one step further: a Help topic about a *tab* (Reminders,
// Graph, Library…) should be able to send you there directly, not just to
// whatever Settings section happens to mention it, asked for directly,
// after the Settings-only links above shipped without this half. Closes
// the modal first: a tab switch happening behind it would be invisible.
//: On `document`, not the Settings modal: the Atlas chat now opens in a
//: sheet outside the modal (INBOX 224), and its answer badges ("Chat",
//: "Skills") were `[data-goto-tab]` buttons nothing listened to there
//: ("clicking the hyperlinked badges under atlas responses doesnt work").
//: The sheet closes first for the same reason the modal does: a tab switch
//: behind an overlay is invisible.
//: `[data-goto-section]` too, not only `[data-goto-tab]` (INBOX 234: "the web
//: search and skills hyperlinked badges in the atlas interface dont work",
//: while Chat did). A help answer's badge names either a tab, a Settings
//: section, or both, and the section-only ones were landing on nothing at all
//: outside the Settings modal. The modal's own links keep their own handler
//: above: matching them here as well would close and re-open the modal under
//: the pointer.
document.addEventListener("click", (event) => {
  const link = event.target.closest("[data-goto-tab], [data-goto-section]");
  if (!link) return;
  if (!link.dataset.gotoTab && link.closest("#settings-modal")) return;
  //: Whatever the link was clicked inside closes, not only Settings and the
  //: Atlas sheet: the popup agent, the sketch pad (INBOX 250, the owner: "the
  //: modal or other popup I clicked the link in should close"). The chord's
  //: closer already knows every overlay that can hold the keyboard.
  closeOverlaysForChord();
  if (link.dataset.gotoSection) {
    openSettingsModal(link.dataset.gotoSection);
    return;
  }
  switchTab(link.dataset.gotoTab);
});

// Filters only re-draw what is already held, they never refetch, so changing
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
$("logs-email-bundle").addEventListener("click", () => emailSupportReport(""));

$("log-follow").addEventListener("change", (event) => {
  logFollowPinned = event.target.checked;
  if (event.target.checked) scrollLogToBottom();
});

// Scrolling up is how you say "stop moving, I am reading this", so it pauses
// the follow rather than fighting you for the scroll position. Scrolling back
// to the bottom resumes it, which is the same gesture every terminal uses.
// Both containers get the listener, only one is ever visible at a time, but
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

// Said once, on the machine it applies to: the app has just switched the
// glass and the animations off without being asked, and a person who set up
// their look on a bigger machine deserves to know where that went. Never
// repeated, and never shown when the mode was chosen by hand.
function noticePerfMode() {
  if (appearancePref("perf") !== "auto" || !perfModeOn()) return;
  if (localStorage.getItem("perf-noticed") === "yes") return;
  if (typeof toastAction !== "function") return;
  localStorage.setItem("perf-noticed", "yes");
  toastAction(
    "Performance mode is on for this machine: flat panels, no animations.",
    "Change",
    () => openSettingsModal("appearance", "perf-mode")
  );
}
window.setTimeout(noticePerfMode, 8000);
if (bgArtOn()) startBgArt();
// The generative brand emblem, unique each visit (Wave O). p5 is loaded long
// before any of these split files (a vendor `<script>` tag, ahead of
// app.js's own): draw once everything this file owns is defined too.
renderBrandLogo();

// --- advanced response settings (sampling) -------------------------------------
//
// Asked for directly: expose top-k, top-p, repeat penalty and the rest,
// "because different models require different parameters to get the same
// result", and detect them per model if that is possible.
//
// It is, and the detection is not a guess: a GGUF ships its author's
// recommended parameters, Ollama reports them in /api/show, and the server
// reads them (see ai/sampling.py). Every row therefore starts at what the
// model itself asks for, and says so, "0.6 because this model recommends it"
// and "0.6 because you set it" are different facts and only the second has
// anything to revert to.
//
// The knob table comes from the server rather than being repeated here, for
// the same reason the file-type table does: a slider whose range disagrees
// with what the backend accepts is a bug nobody can see until a request is
// rejected.
let samplingState = null;
let samplingSaveTimer;

async function loadSamplingSettings() {
  const box = $("sampling-box");
  if (!box) return;
  samplingState = await apiJson("/models/sampling", { silent: true }).catch(() => null);
  renderSamplingRows();
}

function renderSamplingRows() {
  const host = $("sampling-rows");
  if (!host || !samplingState) return;
  host.replaceChildren();

  $("sampling-model").textContent = samplingState.model
    ? `Showing what ${samplingState.model} recommends for itself.`
    : "";
  // The OpenAI-compatible dialect has no endpoint that reports a model's own
  // parameters, and accepts only temperature and top-p. Saying so beats a
  // panel that silently does less than it appears to.
  $("sampling-note").textContent = samplingState.reports_model_defaults
    ? ""
    : "This backend doesn't report what a model recommends, so these start at "
      + "the server's defaults. Only temperature and top-p are sent to an "
      + "OpenAI-compatible server.";

  for (const knob of samplingState.knobs) {
    const row = document.createElement("div");
    row.className = "sampling-row";

    const head = document.createElement("div");
    head.className = "row space-between";
    const label = document.createElement("label");
    label.className = "sampling-label";
    label.textContent = knob.label;
    label.htmlFor = `sampling-${knob.name}`;
    const source = document.createElement("span");
    source.className = "chip sampling-source";
    head.append(label, source);

    const help = document.createElement("p");
    help.className = "muted text-sm";
    help.textContent = knob.help;

    const controls = document.createElement("div");
    controls.className = "row gap sampling-controls";
    const slider = document.createElement("input");
    slider.type = "range";
    slider.id = `sampling-${knob.name}`;
    slider.min = knob.min;
    slider.max = knob.max;
    slider.step = knob.step;
    const readout = document.createElement("output");
    readout.className = "sampling-value";
    //: **A number you can type, beside the one you can drag.**
    //:
    //: Reported: the advanced response settings "don't work". They do: a
    //: change persists and reaches the model (verified against
    //: `GET /models/sampling` after a change): but a slider alone cannot
    //: express the thing anyone opening this panel came to do: set
    //: temperature to exactly 0.7 because a model card said so. At a step of
    //: 0.05 across 0–2 that is a 40-position drag with no way to confirm the
    //: value except by reading it back, which is indistinguishable from a
    //: control that ignores you.
    const number = document.createElement("input");
    number.type = "number";
    number.className = "sampling-number";
    number.id = `sampling-${knob.name}-value`;
    number.min = knob.min;
    number.max = knob.max;
    number.step = knob.step;
    number.setAttribute("aria-label", `${knob.label}: type an exact value`);
    const reset = document.createElement("button");
    reset.type = "button";
    reset.className = "ghost small icon-button";
    setLabel(reset, "ph:arrow-counter-clockwise");
    reset.title = `Use what ${samplingState.model || "the model"} recommends`;
    reset.setAttribute("aria-label", reset.title);

    const paint = () => {
      const overridden = knob.name in samplingState.overrides;
      const value = samplingState.effective[knob.name];
      // No value from any layer means the backend's own default, which is a
      // real state and not zero, the slider has to show *something*, so it
      // sits at the midpoint and the label says the number is not ours.
      const shown = value === undefined
        ? (Number(knob.min) + Number(knob.max)) / 2
        : value;
      slider.value = shown;
      //: Blank rather than the midpoint when nothing is set: a number in the
      //: box would claim the app had chosen a value it has not.
      number.value = value === undefined ? "" : String(value);
      number.placeholder = value === undefined ? "auto" : "";
      readout.textContent = value === undefined ? "backend default" : String(value);
      const from = samplingState.sources[knob.name];
      source.textContent =
        from === "you" ? "you set this" : from === "model" ? "from the model" : "default";
      source.classList.toggle("sampling-source-user", overridden);
      reset.disabled = !overridden;
    };
    paint();

    // Dragging a slider fires `input` on every pixel. Saved on a trailing
    // timer rather than per event, the same shape every other debounced
    // control in this app uses, since there is no shared helper.
    const save = () => {
      clearTimeout(samplingSaveTimer);
      samplingSaveTimer = setTimeout(async () => {
        try {
          await apiJson("/models/sampling", {
            method: "PUT",
            body: JSON.stringify({ overrides: samplingState.overrides }),
          });
        } catch {
          toast("Couldn't save that setting.", true);
        }
        await loadSamplingSettings();
      }, 400);
    };

    //: One place that applies a value, so the slider and the box cannot
    //: disagree about what "set" means (rounding, the integer knobs, which
    //: layer the value came from).
    const applyValue = (raw) => {
      const clamped = Math.min(Math.max(raw, Number(knob.min)), Number(knob.max));
      const value = knob.integer ? Math.round(clamped) : Number(clamped.toFixed(4));
      samplingState.overrides[knob.name] = value;
      samplingState.effective[knob.name] = value;
      samplingState.sources[knob.name] = "you";
      paint();
      save();
    };

    slider.addEventListener("input", () => applyValue(Number(slider.value)));
    //: `change`, not `input`: typing "0.7" passes through "0." and "0", and
    //: saving each keystroke would both spam the endpoint and fight the
    //: caret. An empty box is "back to the model's own value", which is the
    //: same act as the reset button beside it.
    number.addEventListener("change", () => {
      if (number.value.trim() === "") {
        delete samplingState.overrides[knob.name];
        paint();
        save();
        return;
      }
      const raw = Number(number.value);
      if (Number.isFinite(raw)) applyValue(raw);
      else paint();
    });
    reset.addEventListener("click", async () => {
      // Deleting the override *is* the reset, there is no separate stored
      // "default", which is what lets a different model bring its own.
      delete samplingState.overrides[knob.name];
      try {
        await apiJson("/models/sampling", {
          method: "PUT",
          body: JSON.stringify({ overrides: samplingState.overrides }),
        });
      } catch {
        toast("Couldn't reset that setting.", true);
      }
      await loadSamplingSettings();
    });

    controls.append(slider, number, readout, reset);
    row.append(head, help, controls);
    host.appendChild(row);
  }
}

$("sampling-reset")?.addEventListener("click", async () => {
  try {
    await apiJson("/models/sampling", {
      method: "PUT",
      body: JSON.stringify({ overrides: {} }),
    });
    toast("Back to what each model recommends.");
  } catch {
    toast("Couldn't reset those settings.", true);
  }
  await loadSamplingSettings();
});


// --- settings rows: one shape, and the prose out of the way ------------------
//
// Reported: "there is often a spacing issue between elements and excessive
// paragraph texts in places", with a screenshot of Settings, and later
// "fix and reimagine the ui design for the settings pages".
//
// Measured before this: **six paragraphs over 160 characters, the longest
// 385**, and setting rows at 22px, 37px and 91px, a four-fold height spread
// decided entirely by whether a row happened to carry an explanation. A list
// whose items are three different sizes is not a list you can scan, and the
// scan is the whole job of a settings page: find the one switch you came for.
//
// The prose itself is good and worth keeping, it explains *consequences*,
// which is exactly what a settings hint should do and what most apps omit.
// So it is not cut; it is collapsed. Every row is the same height at rest,
// with a hint one click away on the rows that have one.
//
// Long ones only. A six-word hint costs nothing to read and hiding it behind
// a control would be more chrome than text, the threshold is where a hint
// stops being a label's tail and starts being a paragraph.
const SETTINGS_HINT_INLINE_CHARS = 90;

function collapseLongSettingHints(root) {
  const scope = root || document.getElementById("settings-modal");
  if (!scope) return;
  // Any depth, not `label > small`: most hints sit inside a `<span>` that
  // wraps the label's text, so a direct-child selector matched none of the
  // twenty-three that exist. Checked live rather than assumed, the first
  // version of this ran, found nothing, and changed no measurement.
  for (const hint of scope.querySelectorAll("label small.muted")) {
    if (hint.dataset.collapsible) continue;
    const text = (hint.textContent || "").trim();
    if (text.length <= SETTINGS_HINT_INLINE_CHARS) continue;
    hint.dataset.collapsible = "1";
    hint.classList.add("setting-hint", "is-collapsed");

    const toggle = document.createElement("button");
    toggle.type = "button";
    toggle.className = "ghost small icon-only setting-hint-toggle";
    setLabel(toggle, "ph:question");
    // The label text, so the control says which setting it explains rather
    // than being one of a column of identical "?"s to a screen reader.
    const label = (hint.parentElement.textContent || "")
      .replace(text, "")
      .trim()
      .slice(0, 60);
    toggle.title = `What does “${label}” do?`;
    toggle.setAttribute("aria-label", toggle.title);
    toggle.setAttribute("aria-expanded", "false");
    // The same popover every other "?" in this app opens (app.js), rather
    // than this control's own inline expand, reported directly: "the search
    // relevance '?' popup tooltip is completely different from all other
    // tooltips like it, same with the 'keep the ai on this machine' tooltip".
    // `wireHelpPopover` handles the click (including the preventDefault a
    // hint living inside a <label> needs, or opening it would toggle the very
    // setting it explains), the placement, and all three ways it closes.
    wireHelpPopover(toggle, hint);
    // **On the label's own line, not under it.** Reported with a
    // screenshot ("the 'keep the ai on this machine' line in settings needs
    // visual fixing and alignment"): this used to be
    // `hint.insertAdjacentElement("afterend", toggle)`, which made the
    // button a sibling of the label text inside `.setting-check > span`, 
    // and that span is a flex *column*, so every element child becomes its
    // own row. The "?" sat on a line of its own beneath the setting it
    // explains, which reads as a broken row rather than a control.
    //
    // Wrapping the label's leading nodes and the button together in one
    // flex row fixes it structurally instead of fighting the column with
    // margins: text and "?" share a line, the hint still opens underneath.
    // The disclosure order stays correct for a screen reader too, the
    // button now precedes the region its `aria-expanded` describes.
    const parent = hint.parentElement;
    // **A `.setting-check` row puts the "?" in the right-hand control
    // cluster, next to the switch, not mid-sentence.** Reported: "the 'keep
    // the AI on this machine' toggle and '?' icon need to be swapped and
    // properly aligned." Measured before the change: the label text ran to
    // x=724, the "?" sat at 732 as a 32px circle, and the switch was at
    // 1089: 325 pixels of empty row between two controls that belong to
    // each other, with the heavier of the two interrupting the sentence.
    //
    // `.setting-check` is a grid (04-chat-dock-appearance.css), and its
    // whole point is that the switches down a group form one straight
    // right edge. So the button becomes a grid item of its own in the
    // column beside the switch, rather than a child of the label span.
    // Every other label shape in Settings is flex or block flow with no
    // such column, and there the button still needs the wrapping row
    // below: a bare child of `.setting-check > span` (a flex *column*)
    // lands on a line of its own under the label, which is what the
    // previous report about this same row was.
    const settingCheck = parent.closest(".setting-check");
    if (settingCheck) {
      settingCheck.insertBefore(toggle, settingCheck.querySelector("input[type=checkbox]"));
      continue;
    }
    const row = document.createElement("span");
    row.className = "setting-hint-row";
    while (parent.firstChild && parent.firstChild !== hint) {
      row.appendChild(parent.firstChild);
    }
    row.appendChild(toggle);
    parent.insertBefore(row, hint);
  }
}
window.collapseLongSettingHints = collapseLongSettingHints;

// --- Help mini AI chat (ROADMAP.md item 40's second half) -------------------
// App-guidance only, backed by /help/ask. Deliberately not persisted: the
// spec asked for no database row at all, so the running transcript lives
// only in this module-level array, it survives a tab switch (this module
// never reloads) but not a page reload, exactly as specified.
let helpChatHistory = [];
let helpChatBusy = false;

// Auto-scroll is only welcome while the reader is already at the bottom, 
// asked for directly: scrolling up to re-read an earlier answer must not
// get yanked back down the moment the next reply lands. A ~40px slop covers
// the last row's own height so "basically at the bottom" still counts.
function helpChatIsNearBottom() {
  const list = $("help-chat-messages");
  if (!list) return true;
  return list.scrollHeight - list.scrollTop - list.clientHeight < 40;
}

//: The guide's name, read from here everywhere the interface says it
//: (CHAT_PLAN.md decision 15). `help_chat.GUIDE_NAME` is the same word on the
//: server, where the model is told it.
//: One name for the notebook's AI, spelt once (INBOX 225) in app.js, which
//: index.html loads first; the backend's `AI_NAME` in ai/__init__.py is the
//: same word. The guide is the same Atlas wearing its "about the app" hat.
const GUIDE_NAME = AI_NAME;

//: **What the panel calls itself.** The owner, 2026-09-20: "the atlas help
//: panel needs a better title to make it evident that it is the guide". The
//: head said "Atlas" and nothing else, which names the speaker and not the
//: surface: a person who has not read the help does not know whether this is
//: the chat that reads their notes or the one that does not. "Atlas guide"
//: says which of the app's two assistants this is in the two words the head
//: has room for, and it is still derived from the one name, so a rename
//: still costs one edit. The sheet's accessible label is this same string
//: rather than the bare name: a visible title and an accessible name that
//: disagree is a screen reader describing a different panel.
const GUIDE_TITLE = `${GUIDE_NAME} guide`;

//: The line under it, and the reason it changed with the title: "About the
//: app, never your notes" says what the guide will not do before it says what
//: it does. DESIGN.md's rule is one line of description per section, so that
//: one line is the whole budget, and it was spending it on a disclaimer that
//: the '?' popover, the empty state and the composer's own hint all carry
//: too. What it says instead is where the answers come from, which is the
//: fact that makes the panel worth opening.
//:
//: **One line, and it has to fit on one** (INBOX 270 part 4). The previous
//: wording was 41 characters in a 251px column at `--text-sm` and wrapped at
//: 1440 and 1024 both, leaving "text" alone on a second line and the head
//: 63px tall against the agent activity panel's 37. Thirty characters says
//: the same thing and fits with room to spare; the CSS still ellipsises it,
//: so a longer translation cannot put the second line back.
const GUIDE_LINE = "Answers from the app's own help";
//: The persona hint's "(Atlas)" follows the name too.
{
  const hint = document.getElementById("persona-placeholder-hint");
  if (hint) hint.textContent = `Write {ai_name} where the name should go and it is replaced with ${AI_NAME}. Optional.`;
}

function helpChatAppendRow(row) {
  const list = $("help-chat-messages");
  if (!list || !row) return;
  //: The self-description stands down as soon as there is a transcript: it
  //: answers "what is this" and the answer above it now does that better.
  const empty = $("help-chat-empty");
  if (empty) empty.hidden = true;
  //: The starters go with it: they are the empty state's other half, and three
  //: chips above a running transcript is the wall the popup agent's own
  //: starters were told about.
  $("help-chat-starters")?.classList.add("hidden");
  renderHelpChatMenu();
  const stick = helpChatIsNearBottom();
  list.appendChild(row);
  if (stick) list.scrollTop = list.scrollHeight;
}

function renderHelpChatMessage(role, content, badges = [], sources = []) {
  const list = $("help-chat-messages");
  if (!list) return null;
  const row = document.createElement("div");
  row.className = `help-chat-msg is-${role}`;
  if (role === "assistant") {
    renderMarkdown(row, content);
  } else {
    row.textContent = content;
  }
  //: **Where the answer came from** (INBOX 224). Atlas answers only from the
  //: app's own help topics, and saying which ones is the difference between a
  //: model that might be making it up and a reference that can be checked: the
  //: reader can open the same topic in Settings, Help and read the whole of
  //: it. Under the answer, in the app's own muted small type, not a chip: a
  //: chip is something to press and these are a citation.
  if (role === "assistant" && sources.length) {
    const from = document.createElement("p");
    from.className = "muted help-chat-source";
    from.textContent = `From the app's help: ${sources.join(", ")}`;
    row.appendChild(from);
  }
  if (badges.length) {
    const badgeRow = document.createElement("div");
    badgeRow.className = "help-chat-badges";
    for (const badge of badges) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "chip chip-interactive";
      if (badge.tab) btn.dataset.gotoTab = badge.tab;
      if (badge.section) btn.dataset.gotoSection = badge.section;
      btn.textContent = badge.label;
      badgeRow.appendChild(btn);
    }
    row.appendChild(badgeRow);
  }
  helpChatAppendRow(row);
  return row;
}

//: The help copy of whatever tab is open, as one block, capped. Read from the
//: `.help-body` popovers the surface already carries (`data-help-for`, the
//: recipe every help '?' in the app uses), so this is the wording the reader
//: can see for themselves rather than a second description written for the
//: model and free to drift from it.
//:
//: The cap is the server's own (`help_chat.MAX_CONTEXT_CHARS`), repeated here
//: so a long tab does not send forty kilobytes to be thrown away.
const HELP_CONTEXT_CHARS = 1200;

//: **Measured before it was trusted, and the first version sent nothing.**
//: `.help-body` is the `data-help-for` popover's own element, and a count in
//: the running app (`scratchpad/ui-sweeps/agentwide.js`) says there are 41 of
//: them and every one is inside the Settings modal or a dialog: not one tab
//: carries any. So the popovers are kept (a tab that grows one is covered
//: from that day) and the tab's controls are added, which every tab does
//: have: a dock of buttons whose `title` and `aria-label` are the app's own
//: words for what each one does.
//:
//: **Attributes only, never the text on screen.** This chat's whole promise
//: is that it cannot read your notebook, and a tab is full of your notebook:
//: `textContent` anywhere near a list of notes would put a note in a prompt
//: by accident, which is the sort of leak nobody notices until it is in a log.
//: `title` and `aria-label` on a control are authored markup and can hold
//: nothing a person wrote.
function helpChatOnScreenHelp() {
  const tab = typeof agentCurrentTab === "function" ? agentCurrentTab() : null;
  const root = tab ? document.getElementById(`tab-${tab}`) : null;
  if (!root) return "";
  const parts = [];
  const push = (text) => {
    const clean = (text || "").replace(/\s+/g, " ").trim();
    if (clean) parts.push(clean);
  };
  for (const body of root.querySelectorAll(".help-body")) push(body.textContent);
  const seen = new Set();
  for (const control of root.querySelectorAll('.dock [title], [role="toolbar"] [title]')) {
    //: Only what is actually on screen: a dock hides half its controls behind
    //: a menu or a mode, and describing the ones that are not there is worse
    //: than describing none.
    if (!control.offsetParent) continue;
    const name = control.getAttribute("aria-label") || "";
    const line = name && name !== control.title ? `${name}: ${control.title}` : control.title;
    if (seen.has(line)) continue;
    seen.add(line);
    push(line);
    if (parts.join("\n").length > HELP_CONTEXT_CHARS) break;
  }
  if (!parts.length) return "";
  return `Controls on the ${tab} tab, as the app labels them:\n${parts.join("\n")}`.slice(
    0,
    HELP_CONTEXT_CHARS
  );
}

//: **Stop** (the owner, 2026-09-14: "there's no way to stop a response on
//: the atlas interface window"). While a question is out, the send button
//: is the stop button: same place, same size, a square glyph, and a click
//: aborts the request through the fetch signal or halts the reveal where it
//: is. The composer's submit is a form submit; while busy the button is
//: `type="button"` so a click reaches the stop handler and not the form.
let helpChatAbort = null;

function helpChatSetBusy(busy) {
  const sendBtn = $("help-chat-send");
  if (!sendBtn) return;
  sendBtn.type = busy ? "button" : "submit";
  //: `data-needs-model` may have disabled the button; a request that is out
  //: must be stoppable regardless, so the disabled state is parked while
  //: busy and put back after.
  if (busy) {
    sendBtn.dataset.wasDisabled = sendBtn.disabled ? "1" : "";
    sendBtn.disabled = false;
  } else if (sendBtn.dataset.wasDisabled === "1") {
    sendBtn.disabled = true;
    delete sendBtn.dataset.wasDisabled;
  }
  sendBtn.title = busy ? "Stop" : "Ask Atlas";
  sendBtn.setAttribute("aria-label", sendBtn.title);
  sendBtn.classList.toggle("is-stop", busy);
  const icon = sendBtn.querySelector("i");
  if (icon) icon.className = busy ? "ph ph-stop" : "ph ph-paper-plane-right";
}

function helpChatStop() {
  if (!helpChatBusy) return;
  helpChatAbort?.abort();
}

async function submitHelpChatQuestion(question) {
  if (helpChatBusy || !question.trim()) return;
  helpChatBusy = true;
  const input = $("help-chat-input");
  helpChatAbort = new AbortController();
  const signal = helpChatAbort.signal;
  //: The answer's row, and whether the turn failed, for the notice a turn
  //: that ends behind a closed sheet posts (see the `finally` below).
  let answerRow = null;
  let failed = false;
  helpChatSetBusy(true);
  renderHelpChatMessage("user", question);
  // Same "thinking" indicator every other AI-backed surface uses
  // (typingDots(), app.js) rather than a static "Thinking…" line: asked
  // for directly, kept deliberately simple since this reply never streams
  // token-by-token: no "writing" phase, just the wait and then the caret
  // settling below.
  const pending = document.createElement("div");
  pending.className = "help-chat-msg is-assistant is-pending";
  pending.appendChild(typeof typingDots === "function" ? typingDots("Thinking…") : document.createTextNode("Thinking…"));
  helpChatAppendRow(pending);
  if (input) input.value = "";
  try {
    //: **Streamed, with the thinking shown while it is being done.**
    //: Reported: the reply "will be blurted out really fast like it isnt
    //: streaming but just outputting at once", and the thinking "only shows
    //: up after the response is finished". Both were honest descriptions of
    //: what this did: `/help/ask` answers in one piece, so the writing was a
    //: timer here rather than a model typing, and nothing about the turn
    //: could be shown until all of it existed. `/help/ask/stream` sends the
    //: thinking and the answer as they are produced.
    //:
    //: `helpChatStreamTurn` falls back to the one-shot call and the old
    //: reveal when a stream cannot be opened, so a proxy that buffers, or a
    //: build where the route is missing, still answers.
    const result = await helpChatStreamTurn({
      pending,
      signal,
      //: **Where the question was asked from** (INBOX 190: "give it more
      //: knowledge"). The Guide opens over every tab now, so the tab is half
      //: the question: "how does this work?" means one thing on the Graph tab
      //: and another on Reminders. `context` is the app's own help copy for
      //: what is on screen, which is better reference material than anything
      //: this could be told about a surface in the abstract, and it is already
      //: written, reviewed and kept in step with the UI by the lints.
      body: {
        question,
        history: helpChatHistory,
        tab: typeof agentCurrentTab === "function" ? agentCurrentTab() : null,
        context: helpChatOnScreenHelp(),
      },
    });
    const content = result?.content || "Sorry, I couldn't answer that.";
    //: What was on screen when the turn ended: the streamed text itself, or,
    //: on the fallback path, whatever the timed reveal had reached.
    const shown = result?.shown ?? (await helpChatReveal(pending, content, signal));
    pending.remove();
    //: Stopped mid-reveal: what was shown stays, marked, and the history
    //: keeps the whole answer so a follow-up still makes sense to the model.
    answerRow = renderHelpChatMessage(
      "assistant",
      signal.aborted ? `${shown.trimEnd()} (stopped)` : content,
      signal.aborted ? [] : result?.badges || [],
      signal.aborted ? [] : result?.sources || []
    );
    helpChatHistory.push({ role: "user", content: question });
    helpChatHistory.push({ role: "assistant", content });
  } catch (error) {
    pending.remove();
    if (signal.aborted || error?.name === "AbortError") {
      renderHelpChatMessage("assistant", "Stopped.");
    } else {
      failed = true;
      answerRow = renderHelpChatMessage("assistant", "Something went wrong asking that, try again.");
    }
  } finally {
    //: **Closed before the answer arrived** (the owner, 2026-09-23). Closing
    //: the sheet puts the chat back in its hidden host and does not stop the
    //: turn, so the answer lands where nobody can see it; this says it came,
    //: with the way back to it. Not when stopped, and not when the sheet is
    //: open, where the answer is its own notice.
    if (answerRow && !signal.aborted && !document.querySelector('[data-sheet="guide"]')
      && typeof noticeUnwatchedAnswer === "function") {
      answerRow.dataset.answerId = `guide-${Date.now()}`;
      noticeUnwatchedAnswer("guide", question, answerRow.dataset.answerId, { failed });
    }
    helpChatBusy = false;
    helpChatAbort = null;
    helpChatSetBusy(false);
    renderHelpChatMenu();
    input?.focus();
  }
}

//: One streamed turn of the help chat, written into `pending` as it arrives.
//:
//: Returns the same `{content, badges, sources}` the one-shot route returns,
//: plus `shown`, the text that actually reached the screen (they differ when
//: the reader stopped the answer half way). Falls back to `/help/ask` and the
//: timed reveal on any failure to open or read the stream, so the panel
//: answers even where streaming does not survive the trip.
async function helpChatStreamTurn({ pending, signal, body }) {
  let response;
  try {
    //: Hand-rolled like `/chat/stream` (app.js), because `api()` does not
    //: hand back a streaming body, and with the same two headers `api()`
    //: adds to everything else. Without `X-Auth-Token` a locked app answered
    //: 401, this threw "no stream", and the fallback below answered in one
    //: piece: the owner's "streaming is also broken" was exactly that, on
    //: every locked notebook, while the streamed route tested green.
    //: `tests/test_raw_fetch_headers.py` now fails on a raw fetch without it.
    response = await fetch("/help/ask/stream", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Auth-Token": authToken(),
        "X-Workspace-ID": activeSpaceId(),
      },
      signal,
      body: JSON.stringify(body),
    });
    if (!response.ok || !response.body) throw new Error("no stream");
  } catch (error) {
    if (signal?.aborted || error?.name === "AbortError") throw error;
    return apiJson("/help/ask", {
      method: "POST",
      signal,
      body: JSON.stringify(body),
    });
  }

  pending.classList.remove("is-pending");
  pending.classList.add("is-streaming");
  pending.replaceChildren();
  //: **The thinking, on the app's own streamed-reasoning recipe** (INBOX 287,
  //: the owner: "the thinking box doesnt properly render in it either at
  //: least while streaming").
  //:
  //: It used to be a bare `<div>` clipped by CSS to `max-height: 2.6em`.
  //: Measured mid-stream on the running panel: 29px tall, holding 262px of
  //: text, no label and no way to open it, so what was on screen was one and
  //: a half lines from the middle of a sentence in grey. Nothing about that
  //: said "this is the model reasoning", which is what "doesn't properly
  //: render" is describing.
  //:
  //: `details.agent-step.step-thinking` holding a `.thinking` body is what
  //: the chat transcript already uses for exactly this (app.js's
  //: `startThinking`): a summary that says what it is, a caret, and a body
  //: that scrolls rather than clips. It folds itself when the answer starts,
  //: the same move `foldEarlierThinking` makes, so the reasoning is a step on
  //: the way rather than a block the answer has to be read underneath.
  const think = document.createElement("details");
  think.className = "help-chat-think agent-step step-thinking";
  think.open = true;
  const thinkSummary = document.createElement("summary");
  thinkSummary.textContent = "Thinking";
  const thinkBody = document.createElement("div");
  thinkBody.className = "thinking";
  think.append(thinkSummary, thinkBody);
  think.hidden = true;
  const prose = document.createElement("div");
  //: Named so the streaming caret can reach into it. The bubble's last child
  //: is this wrapper, not the paragraph inside it, so the `::after` that draws
  //: the caret landed on a line of its own under the answer (the owner,
  //: 2026-09-21: "the writing caret in the atlas help panel is on the line
  //: below not after the text being streamed"). The rule in
  //: 01-forms-settings.css walks one level further for this class.
  prose.className = "help-chat-prose";
  pending.append(think, prose);
  const list = $("help-chat-messages");
  const toBottom = () => { if (list) list.scrollTop = list.scrollHeight; };

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffered = "";
  let text = "";
  let done = null;
  const take = (line) => {
    if (!line.trim()) return;
    let event;
    try { event = JSON.parse(line); } catch { return; }
    if (event.type === "thinking") {
      think.hidden = false;
      thinkBody.textContent += event.text || "";
      thinkBody.scrollTop = thinkBody.scrollHeight;
    } else if (event.type === "delta") {
      //: Folded the moment there is an answer to read, not when the turn
      //: ends: by then the reader has already had to scroll past it.
      if (think.open && !text) think.open = false;
      text += event.text || "";
      renderMarkdown(prose, text);
    } else if (event.type === "done") {
      done = event;
    }
    toBottom();
  };
  while (true) {
    const chunk = await reader.read();
    if (chunk.done) break;
    buffered += decoder.decode(chunk.value, { stream: true });
    const lines = buffered.split("\n");
    buffered = lines.pop() || "";
    for (const line of lines) take(line);
  }
  take(buffered);
  return {
    content: done?.content || text,
    badges: done?.badges || [],
    sources: done?.sources || [],
    shown: text,
  };
}

//: Resolves to the text shown so far: the whole answer, or, when the signal
//: fired mid-reveal, the words that had appeared by then. Still the path a
//: fallback to `/help/ask` takes; the streamed turn writes its own text.
function helpChatReveal(row, content, signal = null) {
  return new Promise((resolve) => {
    row.classList.remove("is-pending");
    row.classList.add("is-streaming");
    row.replaceChildren();
    const still = document.documentElement.dataset.motion === "reduced" || content.length < 40;
    const words = content.split(/(\s+)/);
    let shown = 0;
    const step = () => {
      if (signal?.aborted) {
        resolve(words.slice(0, shown).join(""));
        return;
      }
      shown = still ? words.length : Math.min(words.length, shown + 2);
      renderMarkdown(row, words.slice(0, shown).join(""));
      const list = $("help-chat-messages");
      if (list) list.scrollTop = list.scrollHeight;
      if (shown >= words.length) {
        setTimeout(() => resolve(content), 150);
        return;
      }
      setTimeout(step, 24);
    };
    step();
  });
}

$("help-chat-form")?.addEventListener("submit", (event) => {
  event.preventDefault();
  submitHelpChatQuestion($("help-chat-input")?.value || "");
});
$("help-chat-send")?.addEventListener("click", (event) => {
  if (!helpChatBusy) return; // a plain send is the form's submit
  event.preventDefault();
  helpChatStop();
});

//: New chat, which was a labelled button in the head row and is a menu row
//: now (INBOX 224): the head says who is talking, and a second labelled button
//: up there was what made that row two buttons wide. `kebabMenu` is the app's
//: one menu recipe.
function helpChatNewChat() {
  helpChatHistory = [];
  const list = $("help-chat-messages");
  //: Everything except the self-description, which is what an empty chat is
  //: supposed to show: `replaceChildren()` took it with the transcript and
  //: left a blank rectangle under the field.
  if (list) {
    for (const child of [...list.children]) {
      if (child.id !== "help-chat-empty") child.remove();
    }
  }
  const empty = $("help-chat-empty");
  if (empty) empty.hidden = false;
  $("help-chat-starters")?.classList.remove("hidden");
  $("help-chat-input")?.focus();
}

function renderHelpChatMenu() {
  const host = $("help-chat-menu");
  if (!host || typeof kebabMenu !== "function") return;
  //: "Said" is what the transcript shows, not only what the model answered:
  //: a question stopped before its answer never reaches the history, and
  //: New chat stayed disabled over a transcript with a question and
  //: "Stopped." in it (the owner, 2026-09-14: "I cant select new chat on
  //: the atlas panel if I stopped a response and didnt let it finish").
  const said = helpChatHistory.length > 0 || Boolean($("help-chat-messages")?.querySelector(".help-chat-msg"));
  host.replaceChildren(
    kebabMenu(
      [
        {
          label: "ph:arrow-counter-clockwise New chat",
          title: said
            ? "Forget this conversation and start over"
            : "Nothing asked yet, so there is nothing to clear",
          disabled: !said,
          run: () => (said ? helpChatNewChat() : undefined),
        },
      ],
      "More actions for this chat"
    )
  );
}

//: The three questions Atlas is opened for, read from `ATLAS_STARTERS` in
//: app.js: every piece of Atlas copy lives in that one table beside
//: `ATLAS_PROMPTS`, and both hosts here read it (INBOX 224).
//:
//: Both hosts are filled from here, and either may be absent (the Settings
//: modal is built once and the sheet exists only while it is open), so this
//: fills whichever it finds.
function renderAtlasStarters() {
  for (const id of ["help-chat-starters", "atlas-row-starters"]) {
    const host = $(id);
    if (!host) continue;
    host.replaceChildren();
    //: The tab you are on decides which three (INBOX 304). Guarded the same
    //: way the table itself was: settings.js runs whether or not app.js has.
    const questions =
      typeof atlasStartersFor === "function"
        ? atlasStartersFor(typeof agentCurrentTab === "function" ? agentCurrentTab() : null)
        : typeof ATLAS_STARTERS === "object"
          ? ATLAS_STARTERS
          : [];
    for (const question of questions) {
      const chip = document.createElement("button");
      chip.type = "button";
      chip.className = "ghost small atlas-starter";
      chip.textContent = question;
      chip.title = `Ask Atlas: ${question}`;
      //: From the Settings row the chip has to open the sheet first; from
      //: inside the sheet it is already open and this is a no-op.
      chip.addEventListener("click", () => {
        openHelpChat();
        askAtlas(question);
      });
      host.appendChild(chip);
    }
  }
}

//: The one way in with a question already chosen: used by the starters, and
//: by every other place in the app that offers an Atlas question (INBOX 224's
//: second half). Sends it rather than only typing it, because a chip that
//: fills a box and waits is a chip that has done half a job.
function askAtlas(question) {
  const input = $("help-chat-input");
  //: An empty question is the plain "open Atlas" door (the palette command,
  //: the shortcut): open the sheet, put the caret in the field, ask nothing.
  if (!question) {
    input?.focus();
    return;
  }
  if (input) input.value = question;
  submitHelpChatQuestion(question);
}

//: **The Guide, and it has a name now** (INBOX 190, the owner: "maybe give it
//: more knowledge and capabilitie/function and give it a fitting name??";
//: INBOX 193 recorded the recommendation and CHAT_PLAN section 4 decision 13
//: took it). "Guide" rather than a person's name or a mascot: it explains the
//: app and nothing else, it has no access to the notebook, and a name that
//: implies a personality would be the second thing in this app claiming to be
//: an assistant. The heading it already carried said "Ask the guide", so the
//: name was half-chosen and only needed saying out loud.
//:
//: **One instance, moved, not a second one built.** The chat is a stateful
//: surface (a running transcript held in `helpChatHistory`, a form, a clear
//: button, three handlers bound by id), and the way to make it reachable from
//: two more places without any of that drifting is to move the one that
//: exists into the sheet and put it back afterwards. Duplicating the markup
//: would duplicate the ids, which the frontend lints refuse for good reason.
let helpChatHome = null;

let helpChatSheetClose = null;

function openHelpChat() {
  const group = $("help-chat-group");
  if (!group) return null;
  //: Already open: put the caret back in the field rather than stacking a
  //: second sheet over the first, which is what two entry points into one
  //: surface otherwise produce.
  if (document.querySelector('[data-sheet="guide"]')) {
    $("help-chat-input")?.focus();
    return null;
  }
  helpChatHome = { parent: group.parentNode, next: group.nextSibling };
  const menu = $("help-chat-menu");
  const menuHome = menu ? { parent: menu.parentNode, next: menu.nextSibling } : null;
  //: **The '?' belongs beside the line it lengthens, not beside the field**
  //: (INBOX 270). DESIGN.md's help recipe is one line in place and the rest
  //: behind a '?': the line in place here is the head's "About the app, never
  //: your notes", and the '?' was three rows below it in the composer, where
  //: the only thing it sat beside was a text field it does not describe. In
  //: the head it is what the popup agent's own '?' is, next to the title,
  //: and the composer goes back to the two controls every other composer in
  //: this app has. Moved rather than duplicated, for the reason the whole
  //: chat is moved rather than duplicated: one copy, one set of ids.
  const helpToggle = group.querySelector('[data-help-for="help-chat-help"]');
  const helpToggleHome = helpToggle
    ? { parent: helpToggle.parentNode, next: helpToggle.nextSibling }
    : null;
  const close = openSheet({
    label: GUIDE_TITLE,
    name: "guide",
    //: Anchored bottom right rather than across the foot of the window (INBOX
    //: 224): a chat is a column, and the full-width sheet gave Atlas 1356px
    //: lines at 1440. The variant is a class on the recipe, so every other
    //: sheet in the app is untouched.
    variant: "corner",
    build: (card) => {
      card.appendChild(group);
      group.classList.add("atlas-docked");
      //: The head says who is talking, once: the mark, the name and the
      //: one-line description that used to sit in a second block under a
      //: second "Atlas" (the owner: "redesign this top section"). The
      //: kebab sits top right beside the close, where a menu is expected,
      //: rather than fourth in the composer row.
      const head = card.querySelector(".sheet-head");
      const title = head?.querySelector(".sheet-title");
      if (title) {
        const mark = group.querySelector(".atlas-mark")?.cloneNode(true);
        const words = document.createElement("span");
        words.className = "atlas-head-words";
        const name = document.createElement("span");
        name.className = "atlas-head-name";
        name.textContent = GUIDE_TITLE;
        const line = document.createElement("span");
        line.className = "muted atlas-head-line";
        line.textContent = GUIDE_LINE;
        words.append(name, line);
        title.replaceChildren(...(mark ? [mark] : []), words);
      }
      //: Title, '?', kebab, close: the surface, what it is, what else you can
      //: do with it, the way out. Inserted in that order, each before the X,
      //: which is the one control the recipe puts there itself.
      if (helpToggle && head) head.insertBefore(helpToggle, head.querySelector(".sheet-close"));
      if (menu && head) head.insertBefore(menu, head.querySelector(".sheet-close"));
    },
    onClose: () => {
      //: Back exactly where it was, so the Help pane is whole the next time
      //: it is opened. `insertBefore` with a null `next` appends, which is
      //: the correct behaviour when it was the last child.
      group.classList.remove("atlas-docked");
      //: **A popover outlives the panel it explains** unless this says so.
      //: `openSheet` takes Escape in the capture phase and stops it, so the
      //: '?' popover's own Escape handler never runs: measured before this
      //: line, opening the '?' and pressing Escape closed the panel and left
      //: the popover sitting on `document.body` over the app, with its home
      //: inside a `hidden` host it could never be seen to belong to again.
      if (typeof closeHelpPopovers === "function") closeHelpPopovers();
      if (helpToggle && helpToggleHome) helpToggleHome.parent.insertBefore(helpToggle, helpToggleHome.next);
      if (menu && menuHome) menuHome.parent.insertBefore(menu, menuHome.next);
      if (helpChatHome) helpChatHome.parent.insertBefore(group, helpChatHome.next);
      helpChatHome = null;
      helpChatSheetClose = null;
    },
  });
  helpChatSheetClose = close;
  //: **After `openSheet` returns, not inside its `build`.** `build` is handed
  //: the card before the card is in the document, so both of these looked the
  //: chat up by id and found nothing: the starters survived only because they
  //: are also built once at boot, and the kebab did not survive at all (it was
  //: empty until the first answer happened to rebuild it).
  renderAtlasStarters();
  renderHelpChatMenu();
  //: `openSheet` focuses the first focusable in the card, which here is the
  //: head's '?' toggle. The field is what a person opening a chat wants.
  $("help-chat-input")?.focus();
  return close;
}

//: The header's '?' became the status bar's Guide slot with INBOX 207;
//: app.js binds that one, because the status bar is its markup and it can
//: reach this function through `window` by the time a click happens.
$("settings-guide-btn")?.addEventListener("click", () => openHelpChat());
//: The avatar in the Settings head is the way to the profile from every pane.
$("settings-profile-btn")?.addEventListener("click", () => showSettingsSection("preferences"));
$("atlas-open")?.addEventListener("click", () => openHelpChat());

//: The Settings row's chips are built once, with the modal: the sheet's are
//: built each time it opens, since the sheet is thrown away on close.
renderAtlasStarters();

// =============================================================================
// What it learned (WORLD_CLASS_PLAN I9)
// =============================================================================
//
// **The backend has been complete since 2026-09-13 and nothing called it.**
// Found by scanning all 319 routes against every path the frontend fetches:
// `GET /learned`, `GET|PUT /learned/switches`, `PATCH|DELETE /learned/{id}`,
// `POST /learned/{id}/reset`, `GET /learned/export` and `DELETE /learned` had
// no caller anywhere. The plan's own words for why that matters: "a model
// that is wrong quietly is worse than no model", and every one of those
// routes exists so a person can see the model being wrong and say so. With
// no screen, `derived_facts` grew where nobody could read it.
//
// Built against what the backend ships rather than against the whole spec.
// The bulk actions waited for `POST /learned/bulk` (2026-09-23) rather than
// being a client-side loop over N rows, which is N requests that can half
// fail: the route changes every selected row in one transaction.

//: One page. 50 rather than the route's 100 default: this is a settings
//: panel inside a modal, and a hundred rows is a scroll nobody finishes.
const LEARNED_PAGE = 50;

//: What each switch is, in the words a person would use. The keys are
//: `ai/facts.py`'s `SWITCHES`, and a key that appears there and not here
//: still renders, under its own name, rather than vanishing: a switch the
//: person cannot see is a switch they cannot turn off, which is the one
//: thing this section exists to prevent.
const LEARNED_SWITCH_COPY = {
  night_shift: ["Night shift", "Reads notes you have added or changed and works out what they claim."],
  margin_reader: ["Margin reader", "Adds notes in the margin of a note as you read it."],
  open_questions: ["Open questions", "Collects the questions your notes leave unanswered."],
  resurfacing: ["Resurfacing", "Brings notes you have not looked at in a while back to the dashboard."],
  evidence_checks: ["Evidence checks", "Looks for what in your notes supports or contradicts a claim."],
  corrections: ["Learning from corrections", "Remembers when you refile a note or dismiss a suggestion, and stops repeating it."],
  model_bench: ["Model bench", "Compares your installed models on your own notes."],
};

//: The master, which is not one of the seven: `facts.switches()` reports it
//: alongside them and, when it is on, reports every other one as off.
const LEARNED_MASTER = "paused";

//: What a derived kind is called. `ai/facts.py`'s `KINDS` is ("claim",
//: "question") today and the plan adds more (tensions, duplicates, entities,
//: dates); an unknown kind shows its own name rather than being dropped.
const LEARNED_KIND_COPY = {
  claim: "Claim",
  question: "Open question",
};

let learnedOffset = 0;
let learnedTotal = 0;
//: The filter typing debounce, so a search box does not fire a request per
//: keystroke against a table that can hold thousands of rows.
let learnedSearchTimer = null;

function learnedKindLabel(kind) {
  return LEARNED_KIND_COPY[kind] || String(kind || "").replace(/_/g, " ") || "Fact";
}

async function renderLearnedSwitches() {
  const host = $("learned-switches");
  const banner = $("learned-paused-banner");
  if (!host) return;
  const switches = await apiJson("/learned/switches").catch(() => null);
  if (!switches) {
    host.replaceChildren();
    return;
  }
  const paused = Boolean(switches[LEARNED_MASTER]);
  host.replaceChildren();

  //: **`.setting-check`, the app's own on/off recipe** (DESIGN.md's index:
  //: "An on/off setting: `label.setting-check` with the switch first").
  //: These were built as `.checkbox-label row align-center`, which is the
  //: recipe for a checkbox *beside a word*, and it has no opinion about a
  //: hint: the `<small>` stayed inline, so every row read "Night shiftReads
  //: notes you have added or changed". Reported as "messy and not consistent
  //: with the design.md rules and the rest of the application", which is
  //: exactly what standing order 11 says happens when a new surface builds
  //: its own shape instead of taking one from the index.
  //:
  //: `.setting-check` is a three-column grid whose label column is a flex
  //: column, so the hint lands under its own title with the switch centred
  //: beside both, and the row fills with `--accent-soft` when it is on.
  const learnedRow = (title, hint) => {
    const row = document.createElement("label");
    row.className = "setting-check";
    const box = document.createElement("input");
    box.type = "checkbox";
    const text = document.createElement("span");
    //: The space is not decoration. `<small>` is a flex item in this column
    //: so it draws on its own line either way, but the accessible name is
    //: `textContent`, which without it reads "Night shiftReads notes you have
    //: added or changed" to a screen reader. The markup rows in index.html
    //: get the same space for free from their own indentation.
    text.append(document.createTextNode(hint ? `${title} ` : title));
    if (hint) {
      const small = document.createElement("small");
      small.className = "muted";
      small.textContent = hint;
      text.appendChild(small);
    }
    row.append(box, text);
    return { row, box };
  };

  //: The master first and set apart, because it is the answer to "stop all of
  //: this now" and a person looking for that is not going to read seven rows
  //: to find it.
  const master = learnedRow(
    "Pause all learning",
    "Nothing below runs while this is on. What has already been worked out is kept.",
  );
  master.row.classList.add("learned-master");
  master.box.id = "learned-pause-all";
  master.box.checked = paused;
  master.box.addEventListener("change", async () => {
    await learnedSetSwitch(LEARNED_MASTER, master.box.checked);
  });
  host.appendChild(master.row);

  //: **The seven live in their own box, and that is a layout decision with a
  //: rule behind it.** 08-consistency.css makes consecutive `.setting-check`
  //: rows one stack: hairline between, square where they meet, rounded only
  //: at the two outer ends. That is right for the seven, which are one set of
  //: choices. It is wrong across the master, which is set apart by a gap, and
  //: a row separated by a gap with a square top edge and a stack hairline on
  //: it looks like a mistake rather than a boundary. Putting the seven in a
  //: container means the adjacent-sibling rules simply stop at the master, so
  //: it keeps all four of its corners and the seven get their own stack.
  const stack = document.createElement("div");
  stack.className = "learned-switch-stack";
  host.appendChild(stack);

  for (const [name, value] of Object.entries(switches)) {
    if (name === LEARNED_MASTER) continue;
    const [title, hint] = LEARNED_SWITCH_COPY[name] || [name.replace(/_/g, " "), ""];
    const { row, box } = learnedRow(title, hint);
    box.checked = Boolean(value);
    //: Disabled rather than hidden while paused: the master says these are
    //: off, and a row that disappeared would leave no way to see what the
    //: master is holding down. `.disabled-row` is the app's own class for
    //: exactly this ("a row whose parent control is switched off"), so the
    //: seven dim together rather than each switch greying on its own.
    box.disabled = paused;
    row.classList.toggle("disabled-row", paused);
    box.addEventListener("change", async () => {
      await learnedSetSwitch(name, box.checked);
    });
    stack.appendChild(row);
  }

  if (banner) {
    banner.classList.toggle("hidden", !paused);
    banner.textContent = paused
      ? `Paused. ${learnedTotal} thing${learnedTotal === 1 ? "" : "s"} already worked out are kept and stay editable below.`
      : "";
  }
}

async function learnedSetSwitch(name, value) {
  try {
    await apiJson("/learned/switches", {
      method: "PUT",
      body: JSON.stringify({ [name]: value }),
    });
  } catch (error) {
    toast(error.message, true);
  }
  //: Re-read rather than trust the click: the master turns the other seven
  //: off in the *reply*, not in the request, so the only correct picture of
  //: the switches after any write is the one the server just sent back.
  await renderLearnedSwitches();
}

//: The ticked rows on the page on screen. Cleared whenever the page is
//: redrawn: a selection you cannot see is one you cannot check before
//: deleting it, so it never survives a page turn or a new search.
const learnedSelected = new Map();

function syncLearnedSelectbar() {
  const bar = $("learned-selectbar");
  if (!bar) return;
  const count = learnedSelected.size;
  bar.classList.toggle("hidden", count === 0);
  $("learned-selected-count").textContent = `${count} selected`;
  //: Reset only means something for a row you edited; offering it over a
  //: selection with none would be a button that does nothing.
  const edited = [...learnedSelected.values()].filter((fact) => fact.edited_by_user).length;
  $("learned-bulk-reset").classList.toggle("hidden", edited === 0);
}

async function learnedBulk(action) {
  const ids = [...learnedSelected.keys()];
  if (!ids.length) return;
  if (action === "delete") {
    const ok = await confirmDialog(
      `Delete ${ids.length === 1 ? "this" : `these ${ids.length}`} and never work ${ids.length === 1 ? "it" : "them"} out again?\n\nYour notes are not touched. Each deletion is remembered, so the next run will not derive the same things.`,
      { confirmLabel: "Delete" }
    );
    if (!ok) return;
  }
  try {
    const reply = await apiJson("/learned/bulk", {
      method: "POST",
      body: JSON.stringify({ ids, action }),
    });
    const verb = action === "delete" ? "Deleted" : "Reset";
    const gone = reply.missing?.length ? `, ${reply.missing.length} already gone` : "";
    toast(`${verb} ${reply.done}${gone}.`);
    if (action === "delete" && learnedOffset > 0 && learnedTotal - reply.done <= learnedOffset) {
      learnedOffset = Math.max(0, learnedOffset - LEARNED_PAGE);
    }
    renderLearnedList();
  } catch (error) {
    toast(error.message, true);
  }
}

function learnedRow(fact) {
  const li = document.createElement("li");
  li.className = "entry-item learned-row";
  li.dataset.factId = String(fact.id);

  const head = document.createElement("div");
  head.className = "row align-center learned-row-head";
  const pick = document.createElement("input");
  pick.type = "checkbox";
  pick.className = "learned-select";
  pick.setAttribute("aria-label", "Select this");
  pick.checked = learnedSelected.has(fact.id);
  pick.addEventListener("change", () => {
    if (pick.checked) learnedSelected.set(fact.id, fact);
    else learnedSelected.delete(fact.id);
    syncLearnedSelectbar();
  });
  head.appendChild(pick);
  const kind = document.createElement("span");
  kind.className = "chip";
  kind.textContent = learnedKindLabel(fact.kind);
  head.appendChild(kind);
  if (fact.edited_by_user) {
    const edited = document.createElement("span");
    edited.className = "chip";
    edited.textContent = "Edited by you";
    edited.title = "No later run overwrites this";
    head.appendChild(edited);
  }
  li.appendChild(head);

  const text = document.createElement("p");
  text.className = "learned-text";
  text.textContent = fact.text;
  li.appendChild(text);

  //: Where it came from, which is the whole difference between a claim you
  //: can check and a sentence an app asserted at you.
  const meta = document.createElement("p");
  meta.className = "muted learned-meta";
  const parts = [];
  if (fact.model) parts.push(fact.model);
  if (typeof fact.confidence === "number") parts.push(`${Math.round(fact.confidence * 100)}% sure`);
  if (fact.computed_at && typeof relativeTime === "function") parts.push(relativeTime(fact.computed_at));
  meta.textContent = parts.join(" · ");
  li.appendChild(meta);

  const actions = document.createElement("div");
  actions.className = "row entry-actions";
  if (fact.entry_id) {
    actions.appendChild(
      smallButton("ph:arrow-square-out Open the note", "Open the note this came from", () => {
        closeSettingsModal();
        flashEntry(fact.entry_id);
      })
    );
  }
  actions.appendChild(
    smallButton("ph:pencil-simple Edit", "Correct what this says", () => learnedEdit(fact))
  );
  if (fact.edited_by_user) {
    actions.appendChild(
      smallButton("ph:arrow-counter-clockwise Reset", "Put the model's own words back", () =>
        learnedReset(fact)
      )
    );
  }
  actions.appendChild(
    smallButton("ph:trash Delete", "Delete this, and never work it out again", () => learnedDelete(fact))
  );
  li.appendChild(actions);
  return li;
}

async function renderLearnedList() {
  const list = $("learned-list");
  const empty = $("learned-empty");
  const count = $("learned-count");
  if (!list) return;
  const kind = $("learned-kind")?.value || "";
  const q = $("learned-search")?.value.trim() || "";
  const query = new URLSearchParams({ limit: String(LEARNED_PAGE), offset: String(learnedOffset) });
  if (kind) query.set("kind", kind);
  if (q) query.set("q", q);
  const data = await apiJson(`/learned?${query}`).catch(() => null);
  if (!data) {
    list.replaceChildren();
    if (count) count.textContent = "Couldn't load what it learned.";
    return;
  }
  learnedTotal = Number(data.total) || 0;
  learnedSelected.clear();
  syncLearnedSelectbar();
  list.replaceChildren(...data.items.map(learnedRow));
  if (empty) empty.classList.toggle("hidden", data.items.length > 0 || Boolean(q) || Boolean(kind));
  if (count) {
    if (!learnedTotal) count.textContent = q || kind ? "Nothing matches." : "";
    else {
      const from = learnedOffset + 1;
      const to = learnedOffset + data.items.length;
      count.textContent = `${from} to ${to} of ${learnedTotal}`;
    }
  }
  const prev = $("learned-prev");
  const next = $("learned-next");
  if (prev) prev.disabled = learnedOffset <= 0;
  if (next) next.disabled = learnedOffset + LEARNED_PAGE >= learnedTotal;
  //: The pager disappears rather than sitting there greyed out when one page
  //: is the whole table, which is every notebook until it is not.
  $("learned-pager")?.classList.toggle("hidden", learnedTotal <= LEARNED_PAGE);
}

async function learnedEdit(fact) {
  //: `promptDialog`, the app's one text dialog, rather than an inline
  //: textarea grown in the row: standing order 11, new UI comes from the
  //: recipe index. Its field is one line, which suits a derived claim (20 to
  //: 300 characters by `facts.MIN_SENTENCE_CHARS`/`MAX_SENTENCE_CHARS`).
  const next = await promptDialog("What should this say?", fact.text, { confirmLabel: "Save" });
  //: Empty is Cancel here, the way it is at every other `promptDialog` call
  //: site in the app: the dialog resolves with `""` for Cancel, for Escape
  //: and for a backdrop click alike, so a caller that treated empty as a
  //: value would answer a cancelled dialog with an error toast. Clearing the
  //: box and pressing Save therefore also does nothing, which is right:
  //: deleting a fact is the button next to this one.
  if (!next.trim() || next.trim() === fact.text.trim()) return;
  try {
    await apiJson(`/learned/${fact.id}`, {
      method: "PATCH",
      body: JSON.stringify({ text: next.trim() }),
    });
    toast("Saved. No later run will overwrite it.");
    renderLearnedList();
  } catch (error) {
    toast(error.message, true);
  }
}

async function learnedReset(fact) {
  try {
    await apiJson(`/learned/${fact.id}/reset`, { method: "POST" });
    toast("Put the model's own words back.");
    renderLearnedList();
  } catch (error) {
    toast(error.message, true);
  }
}

async function learnedDelete(fact) {
  const ok = await confirmDialog(
    "Delete this and never work it out again?\n\nYour note is not touched. The deletion is remembered, so the next run will not derive the same thing.",
    { confirmLabel: "Delete" }
  );
  if (!ok) return;
  try {
    await api(`/learned/${fact.id}`, { method: "DELETE" });
    //: The page can be left holding nothing if the last row of the last page
    //: went, which reads as a bug ("it deleted everything"). Step back one
    //: page first, exactly as the note list does.
    if (learnedOffset > 0 && learnedTotal - 1 <= learnedOffset) {
      learnedOffset = Math.max(0, learnedOffset - LEARNED_PAGE);
    }
    renderLearnedList();
    renderLearnedSwitches();
  } catch (error) {
    toast(error.message, true);
  }
}

async function learnedForget() {
  const ok = await confirmDialog(
    "Forget everything the notebook has worked out?\n\nEvery derived claim, question and learned preference goes. Your notes, their history and everything you told it to remember are untouched. This cannot be undone.",
    { confirmLabel: "Forget it all" }
  );
  if (!ok) return;
  try {
    await api("/learned", {
      method: "DELETE",
      body: JSON.stringify({ confirm: true }),
    });
    learnedOffset = 0;
    toast("Forgotten. Your notes are exactly as they were.");
    renderLearned();
  } catch (error) {
    toast(error.message, true);
  }
}

async function learnedExport() {
  try {
    const data = await apiJson("/learned/export");
    const day = new Date().toISOString().slice(0, 10);
    await downloadJson(`memorymap-learned-${day}.json`, data);
  } catch (error) {
    toast(error.message, true);
  }
}

//: **One pass, now.** `POST /night/run` is the manual half of I1 and had no
//: caller: the pass ran on its own schedule and a person who wanted to know
//: what their notebook would make of a note they had just written had to
//: wait for it. The reply is the pass's own report, and it is worth showing
//: in full: `{paused}` when the switch above is off (which is the honest
//: answer, not an error), and otherwise how many notes were read, how many
//: things came out and why it stopped, because "it did nothing" and "it read
//: four thousand notes and found nothing new" are different answers and this
//: is the one screen that can tell them apart.
async function learnedRunNow() {
  const button = $("learned-run-now");
  const note = $("learned-run-note");
  if (!button) return;
  button.disabled = true;
  if (note) note.textContent = "Reading\u2026";
  try {
    const result = await apiJson("/night/run", {
      method: "POST",
      body: JSON.stringify({ budget: 20000 }),
    });
    if (result.paused) {
      if (note) note.textContent = "Night shift is off. Turn it on above and press this again.";
    } else {
      const derived = Number(result.derived) || 0;
      const scanned = Number(result.scanned) || 0;
      const stopped = result.stopped_reason === "budget" ? ", stopped at this run's budget" : "";
      if (note) {
        note.textContent = derived
          ? `Read ${scanned} note${scanned === 1 ? "" : "s"}, worked out ${derived} new thing${derived === 1 ? "" : "s"}${stopped}.`
          : `Read ${scanned} note${scanned === 1 ? "" : "s"}, nothing new${stopped}.`;
      }
      if (derived) renderLearnedList();
    }
  } catch (error) {
    if (note) note.textContent = error.message;
  } finally {
    button.disabled = false;
  }
}

//: Built once, with the modal, not per open: these are static controls and
//: rebinding them on every visit is how a settings panel ends up with six
//: copies of one listener.
function wireLearnedSection() {
  const kind = $("learned-kind");
  if (kind && kind.options.length <= 1) {
    for (const [value, label] of Object.entries(LEARNED_KIND_COPY)) {
      const option = document.createElement("option");
      option.value = value;
      option.textContent = label;
      kind.appendChild(option);
    }
  }
  kind?.addEventListener("change", () => {
    learnedOffset = 0;
    renderLearnedList();
  });
  $("learned-search")?.addEventListener("input", () => {
    clearTimeout(learnedSearchTimer);
    learnedSearchTimer = setTimeout(() => {
      learnedOffset = 0;
      renderLearnedList();
    }, 250);
  });
  $("learned-prev")?.addEventListener("click", () => {
    learnedOffset = Math.max(0, learnedOffset - LEARNED_PAGE);
    renderLearnedList();
  });
  $("learned-next")?.addEventListener("click", () => {
    learnedOffset += LEARNED_PAGE;
    renderLearnedList();
  });
  $("learned-run-now")?.addEventListener("click", learnedRunNow);
  $("learned-export")?.addEventListener("click", learnedExport);
  $("learned-forget")?.addEventListener("click", learnedForget);
  $("learned-bulk-delete")?.addEventListener("click", () => learnedBulk("delete"));
  $("learned-bulk-reset")?.addEventListener("click", () => learnedBulk("reset"));
  $("learned-bulk-done")?.addEventListener("click", () => {
    learnedSelected.clear();
    for (const box of document.querySelectorAll("#learned-list .learned-select")) box.checked = false;
    syncLearnedSelectbar();
  });
}

async function renderLearned() {
  //: The list first, so the switches' "N things kept" line has a number.
  await renderLearnedList();
  await renderLearnedSwitches();
}

wireLearnedSection();
