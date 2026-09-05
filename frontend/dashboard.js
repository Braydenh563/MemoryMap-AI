// dashboard.js — widgets, masonry, the generative art (split out of app.js).
//
// Loaded after app.js (see index.html's <script> ordering comment): every
// reference here into app.js globals ($, apiJson, toast, switchTab,
// smallButton, chip, renderMarkdown, renderInlineMarkdown, safeMdSlice,
// notePreviewText, renderEmblem, resolvedTheme, currentAccentHex,
// appearancePref, allEntries, prefsCache, modelStatus, and more) is a
// runtime call inside a function body or an event-listener closure, never a
// parse-time reference, so load order only matters for the reverse
// direction — anything in app.js that calls into dashboard.js
// (refreshActiveTab's "dashboard" branch, switchTab's dashboard branch,
// renderDashboardGreeting()/refreshArtForTheme() called from the appearance
// code, etc.) does so from inside its own functions too, which by the time
// they run have always already had this script loaded (same
// DOMContentLoaded pass, no user interaction possible in between).
//
// Two hazards found doing this split, both the same shape as
// documents.js's `initDocSidebarTabs()` one — a bare top-level reference in
// app.js resolving before this file has loaded:
//
// 1. Two `addEventListener` registrations at the bottom of this file
//    (`$("features-close")`, and the plain-reference form generally) used
//    to live in app.js's own top-level wiring, passing `closeFeatures` as a
//    bare function reference. That reference resolves the moment the
//    registering line executes — app.js's own top-level pass, before this
//    file has loaded. Fixed by moving the whole wiring group here, after
//    its own functions, instead of splitting definition from call site. See
//    the "wiring" section near the end of this file for the full
//    explanation.
// 2. `applyPalette()` (app.js) calls `refreshArtForTheme()` (this file), and
//    `applyPalette` is itself reachable from a bare top-level call —
//    `applyAppearance()`, run once at parse time to paint the saved theme
//    before first render. Caught live in Chromium, not by reading the code:
//    a `ReferenceError` there aborted the rest of app.js's synchronous
//    top-level wiring. Fixed with a `typeof` guard at that one call site
//    (app.js's `applyPalette`) rather than moving `applyPalette` itself,
//    since it does real app.js-only work (the whole-app palette/background)
//    that has nothing to do with the dashboard.
//
// --- boundaries deliberately NOT crossed doing this split ---
//
// - `tickClocks()` (the `.live-clock` ticker `app.js` still owns) stays in
//   app.js: it drives the Reminders tab's clock too, not just the
//   dashboard's, so it is genuinely shared rather than dashboard-only.
// - The tab-bar overflow-fade machinery (`syncTabOverflowFade`,
//   `tabRowSpace`, `tabContentWidth`, `revealActiveTab`) physically sat
//   inside app.js's "masonry packing for the dashboard" comment block with
//   no header of its own, but has nothing to do with the dashboard — it
//   sizes the top tab strip for every tab. Left in app.js.
// - `safeMdSlice`/`notePreviewText`/`renderEmblem` stayed in app.js: all
//   three are called from outside the dashboard too (note-card previews,
//   the writing room, whiteboard.js's node labels, the chat avatar) — see
//   the comments left at their definitions in app.js.
// - "Wave J: accent themes + generative background" (app.js, curated
//   themes, saved themes, the ambient/second p5 background instance) is
//   Settings → Appearance's own territory, not a dashboard widget, despite
//   `refreshArtForTheme()` (this file) being called from inside it whenever
//   the theme/accent/palette changes. Left for the settings.js split.
// - "SKILLS DASHBOARD TAB" (app.js, `renderSkillsDashboard`,
//   `#skills-dashboard-list`) is the AI Skills library page, an unrelated
//   feature that happens to share the word "dashboard" in its own internal
//   naming. Left in app.js.
// - `renderDashboardPersonaSelect` and its Settings wiring
//   (`#dashboard-persona-select`) configure which persona voices the
//   dashboard greeting, but the control itself lives inside Settings →
//   Personas' own render function (`renderPersonas`) — a Settings concern,
//   like documents.js leaving `voice-model-select` behind. Left in app.js.

// --- dashboard (Wave D) -----------------------------------------------------------

let dashEditMode = false;
let dragWidget = null; // widget name being dragged

// Widget registry: name → title + async renderer that fills a body div.
// `description` is a one-line, plain-text (no ph: marker) summary shown only
// in the widget picker modal — the on-dashboard header just uses `title`.
const DASH_WIDGETS = {
  stats: { title: "ph:chart-bar Stats", description: "Note count, tags, categories and other totals at a glance.", render: renderStatsWidget },
  streak: { title: "ph:flame Streak", description: "How many days in a row you've added or edited a note.", render: renderStreakWidget },
  art: { title: "ph:palette Notebook constellation", description: "A generative starfield: one cluster per category, sized by note count.", render: renderArtWidget },
  pinned: { title: "ph:push-pin Pinned notes", description: "Notes you've pinned, so they're always one click away.", render: renderPinnedWidget },
  "recent-notes": { title: "ph:clock Recently added", description: "The last few notes you created, newest first.", render: renderRecentNotesWidget },
  "most-used": { title: "ph:flame Most used", description: "The categories and tags you reach for most often.", render: renderMostUsedWidget },
  "most-linked": { title: "ph:link Most-linked notes", description: "The notes with the most connections — the hubs of your notebook.", render: renderMostLinkedWidget },
  "top-tags": { title: "ph:tag Top tags", description: "Your most-used tags, ranked by how many notes carry them.", render: renderTopTagsWidget },
  questions: { title: "ph:chat-circle Recent questions", description: "The questions you've recently asked the notebook's chat.", render: renderQuestionsWidget },
  "on-this-day": { title: "ph:calendar-blank On this day", description: "Notes from this date in previous years.", render: renderOnThisDayWidget },
  digest: { title: "ph:newspaper Weekly digest", description: "A short roundup of what you wrote and did this week.", render: renderDigestWidget },
  capture: { title: "ph:pencil-simple Quick capture", description: "A one-line box to jot a note without leaving the dashboard.", render: renderQuickCaptureWidget },
  reminders: { title: "ph:alarm Reminders", description: "Upcoming and overdue reminders, soonest first.", render: renderRemindersWidget },
  focus: { title: "ph:timer Focus timer", description: "A start/stop timer for focused writing sessions.", render: renderFocusTimerWidget },
  heatmap: { title: "ph:calendar-check Activity heatmap", description: "A calendar-style heatmap of note activity over the past months.", render: renderHeatmapWidget },
  "tag-cloud": { title: "ph:cloud Tag cloud", description: "All your tags sized by how often they're used.", render: renderTagCloudWidget },
  categories: { title: "ph:folders Categories", description: "Every category with its note count, click to filter.", render: renderCategoriesWidget },
  random: { title: "ph:dice-five Rediscover", description: "A random older note, to resurface something you'd forgotten.", render: renderRandomNoteWidget },
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

// Add/remove and wide/narrow, factored out of the inline "Edit layout" grid
// so the widget-picker modal (dash-widgets-dialog) can flip the same
// `dashboard_layout` preference instead of growing a second copy of this
// logic. Both surfaces call these, then re-render themselves.
async function toggleDashWidgetHidden(name) {
  const next = dashLayout();
  next.hidden = next.hidden.includes(name)
    ? next.hidden.filter((n) => n !== name)
    : [...next.hidden, name];
  await saveDashLayout(next);
}

async function toggleDashWidgetWide(name) {
  const next = dashLayout();
  next.wide = next.wide.includes(name)
    ? next.wide.filter((n) => n !== name)
    : [...next.wide, name];
  await saveDashLayout(next);
}
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
// leaves the handwritten fallback on screen. `forced` skips the cache check —
// used by the Settings "Regenerate" button (asked for directly) so a click
// gets a genuinely new line instead of the one already cached for this hour.
async function refreshAiGreeting(forced = false) {
  const now = new Date();
  if (!forced && cachedGreetingPhrase(now)) return; // still fresh for this block
  const block = greetingBlock(now.getHours());
  const body = await apiJson(`/insights/greeting?block=${block}`, { silent: true }).catch(
    () => null
  );
  const phrase = body && body.greeting;
  if (!phrase) return false;
  const punctuation = (body && body.punctuation) || ".";
  const appendName = !(body && body.append_name === false);
  localStorage.setItem(
    "greetingCache",
    JSON.stringify({ slot: greetingCacheSlot(now), phrase, punctuation, appendName })
  );
  const el = $("dash-greeting");
  if (el) el.textContent = withDisplayName(phrase, punctuation, appendName);
  return true;
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
  setLabel(add, "ph:hand-waving Add your name");
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
    { icon: "ph:note-pencil", value: stats ? stats.total_entries : "–", label: "notes",
      go: () => { switchTab("notes"); showNotesSection("browse"); } },
    { icon: "ph:calendar", value: thisWeek, label: "this week",
      go: () => { switchTab("notes"); showNotesSection("browse"); } },
    { icon: "ph:flame", value: streak, label: streak === 1 ? "day streak" : "day streak", go: () => switchTab("dashboard") },
    {
      icon: due ? "ph:alarm" : "ph:check-circle",
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
    setLabel(icon, tile.icon);
    icon.setAttribute("aria-hidden", "true");
    const value = document.createElement("span");
    value.className = "stat-value";
    setLabel(value, tile.value);
    const label = document.createElement("span");
    label.className = "stat-label";
    setLabel(label, tile.label);
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
// "Skill Clean up my tags" sends a message to a model and waits for it. Those are
// three different commitments and they were drawn the same, in one row, sorted
// by a use counter that mixed them together — so the row said nothing about
// what pressing anything in it would do, and the only way to find out was to
// press it.
//
// Now: **Start** something (an action, and the row that owns the accent),
// **Jump to** somewhere (navigation, quiet pills — nothing happens that you
// cannot undo by pressing the tab you came from), and **Run a skill** (the
// expensive one, marked Skill, and the only group that talks to the model).
//
// The use-ordering that was here stays, but it is applied *inside* Jump to
// only. That was the point of it — the middle of a navigation row is exactly
// where reordering helps and never surprises — and applying it across the
// whole strip is what let an action drift into the middle of the navigation.
const QUICK_START = [
  {
    icon: "ph:pencil-simple",
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
    icon: "ph:chat-circle",
    label: "Ask AI",
    hint: "A question answered from your own notes",
    run: () => {
      switchTab("chat");
      $("chat-input").focus();
    },
  },
  { icon: "ph:palette", label: "Sketch", hint: "Draw something and save it as a note", run: () => openSketch() },
  {
    icon: "ph:alarm",
    label: "Remind me",
    hint: "Type it in plain English and the AI schedules it",
    run: () => {
      switchTab("reminders");
      $("reminder-magic").focus();
    },
  },
  {
    icon: "ph:microphone",
    label: "Meeting notes",
    hint: "Record something longer and file the transcript",
    run: () => openMeetingRecorder(),
  },
];

const QUICK_GO = [
  {
    icon: "ph:magnifying-glass",
    label: "Search notes",
    run: () => {
      switchTab("notes");
      // The search box lives in the "browse" sub-tab; focusing it while that
      // section is display:none silently does nothing (user-reported).
      showNotesSection("browse");
      $("note-search").focus();
    },
  },
  // **The six chips that named tabs are gone**, and the reason is the ask
  // they came from being wrong about what the row is for. It said: "a quick
  // access strip that skips three of the app's seven tabs is a strip that
  // has stopped being an index of the app" — and completing the index is
  // exactly what made the Dashboard show its own navigation three times.
  // Measured on one 1440x900 screen: the tab bar, a "Start something" row of
  // five action cards, and a "Jump to" row of eight chips, six of which
  // named *the same tabs as the tab bar two inches above them*. Three ways
  // to reach the same seven places, none of them obviously the one to use —
  // reported as "a lot of ui elements arent where they should be from a
  // learnability and ux point of view. it doesnt feel intuitive."
  //
  // What survives is what the tab bar cannot do: focus the search box,
  // open the features modal, and open the command palette (which was
  // findable only by already knowing Ctrl+K — a button is how you learn a
  // shortcut). Every tab is still one click away, in the one place that has
  // always been for tabs.
  { icon: "ph:toolbox", label: "Tools & features", run: () => openFeatures() },
  // The palette is the fastest route to anything at all, and it was findable
  // only by already knowing Ctrl+K. A button is how you learn a shortcut.
  { icon: "ph:command", label: "Commands", run: () => openPalette() },
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
  // **Refuse a nameless run rather than storing it.** This guard exists
  // because the absence of it cost the whole dashboard, and the failure is
  // worth recording in full because nothing about it is visible at this line.
  //
  // §88.0 fixed a call site that read `startSkill(skill.name)` where an object
  // was expected. While that bug was live, `skill` was a *string*, so
  // `skill.name` was `undefined`, and this function was called with it. That
  // alone would have been harmless — but `JSON.stringify` converts `undefined`
  // inside an array to **`null`**, so what landed in localStorage was a real
  // `null` element, not a missing one. Fixing the call site stopped new poison
  // and did nothing about the `null` already written, which persists across
  // every reload, forever, in any profile that ran a skill during that window.
  //
  // The damage then surfaced nowhere near here: `recentSkillLinks` below
  // reads that array on every dashboard render, and `withoutLeadingEmoji`
  // calls `.replace()` on the `null`. That throw propagated out of
  // `renderQuickLinks` -> `renderDashboard` -> `refreshActiveTab`, i.e. it
  // escaped *before* `grid.replaceChildren()` and the widget loop had run, so
  // the reported symptoms were "the dashboard widgets are completely broken"
  // and a toast reading "Couldn't load this tab: Cannot read properties of
  // null (reading 'replace')" — two reports, one cause, neither of them
  // pointing at the skills feature that actually caused it.
  //
  // The shape CLAUDE.md names: a value that is invalid where it is *used*,
  // not where it is *set*, does its damage nowhere near the code at fault.
  if (typeof name !== "string" || !name) return;
  let recent = [];
  try {
    recent = JSON.parse(localStorage.getItem(RECENT_SKILLS_KEY) || "[]");
  } catch {
    recent = [];
  }
  recent = [name, ...recent.filter((n) => n !== name)].slice(0, 8);
  localStorage.setItem(RECENT_SKILLS_KEY, JSON.stringify(recent));
}

//: A skill's name usually starts with its own emoji — "stethoscope Notebook health
//: check", "tag Clean up my tags" — and the quick-link then put Skill in front of
//: it, so those two chips wore two icons each while every other chip in the
//: row wore one. Reported as clutter, and it was: measured at 224px and 216px
//: against 107–169px for the fixed chips, i.e. the two least important buttons
//: in the row were the two widest.
//:
//: The Skill is the one that stays, because it carries what the row does not
//: otherwise say — this chip *runs* something rather than opening a page. The
//: skill's own emoji is still on it everywhere skills are listed.
const LEADING_EMOJI = /^(\p{Extended_Pictographic}(?:️|‍\p{Extended_Pictographic})*)\s*/u;

function withoutLeadingEmoji(name) {
  // `String(...)` rather than a bare `.replace`: this is the line that threw
  // for every profile carrying the poisoned `recentSkills` entry described in
  // `noteSkillRun`, and it took the whole dashboard down with it. The write
  // guard and the read filter below both prevent that now, so this coercion is
  // the third of three — but it is the cheapest, and it is the one standing
  // between any future bad value and another blank dashboard.
  const text = String(name ?? "");
  const stripped = text.replace(LEADING_EMOJI, "");
  // A skill named with nothing but an emoji would otherwise become a blank
  // chip; keeping the original is the lesser of the two.
  return stripped.trim() || text;
}

function recentSkillLinks() {
  let recent = [];
  try {
    recent = JSON.parse(localStorage.getItem(RECENT_SKILLS_KEY) || "[]");
  } catch {
    return [];
  }
  if (!Array.isArray(recent)) return [];
  // **This filter is the repair, not just a guard.** The write side is fixed,
  // but a profile that ran a skill while the §88.0 bug was live already has a
  // `null` on disk and would keep crashing its own dashboard on every load
  // forever — a fix that only prevents new bad data would leave exactly the
  // people who hit the bug still broken. Rewriting the cleaned list back means
  // one load repairs the profile permanently.
  const clean = recent.filter((n) => typeof n === "string" && n);
  if (clean.length !== recent.length) {
    localStorage.setItem(RECENT_SKILLS_KEY, JSON.stringify(clean));
  }
  return clean.slice(0, QUICK_SKILL_SLOTS).map((name) => ({
    icon: "ph:lightning",
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
  setLabel(icon, link.icon);
  icon.setAttribute("aria-hidden", "true");
  const text = document.createElement("span");
  text.className = "quick-link-text";
  const label = document.createElement("span");
  label.className = "quick-link-label";
  setLabel(label, link.label);
  text.appendChild(label);
  // The hint is what turns a row of verbs into a row you can choose from
  // without pressing anything. Only the Start group carries one — the
  // navigation pills say where they go by being named after the tab, and a
  // sentence under each would be six sentences saying "goes to the tab".
  if (link.hint) {
    const hint = document.createElement("span");
    hint.className = "quick-link-hint";
    setLabel(hint, link.hint);
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
          icon: "ph:lightning",
          label: "All skills…",
          hint: "Every skill, in the chat's skill picker",
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
      { name: "Search relevance", desc: "How strict semantic search is about what counts as a real match.", run: () => openSettingsModal("preferences", "search-relevance-group") },
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
      setLabel(name, item.name);
      const desc = document.createElement("span");
      desc.className = "feature-desc muted";
      setLabel(desc, item.desc);
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
      icon: "ph:pencil-simple",
      label: "Write your first note",
      note: "Anything at all — a half sentence is fine.",
      run: () => {
        switchTab("notes");
        $("entry-content")?.focus();
      },
    },
    {
      icon: "ph:chat-circle",
      label: "Ask your notebook",
      note: "Works on keywords even with no AI running.",
      run: () => {
        switchTab("chat");
        $("chat-input")?.focus();
      },
    },
    {
      icon: "ph:backpack",
      label: "Bring notes in",
      note: "Import from a file in Settings → Import & export.",
      run: () => openSettingsModal("data"),
    },
    {
      icon: "ph:compass",
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
    setLabel(icon, action.icon);
    icon.setAttribute("aria-hidden", "true");
    const text = document.createElement("span");
    const label = document.createElement("strong");
    setLabel(label, action.label);
    const note = document.createElement("span");
    note.className = "muted";
    setLabel(note, action.note);
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
    setLabel(title, widget.title);
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
        smallButton(hidden ? "ph:plus Add" : "ph:x Remove", hidden ? "Add this widget to the dashboard" : "Remove this widget from the dashboard", async () => {
          await toggleDashWidgetHidden(name);
          renderDashboard();
        })
      );
      if (!hidden) controls.appendChild(
        smallButton(
          isWide ? "ph:rows Narrow" : "ph:arrows-out-line-horizontal Wide",
          isWide ? "Show in one column" : "Span two columns",
          async () => {
            await toggleDashWidgetWide(name);
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

// --- widget picker modal ------------------------------------------------------------
// A dedicated "Widgets" surface (roadmap §26) alongside the inline "Edit
// layout" mode — not a replacement for it. Both read/write the same
// `dashboard_layout` preference through dashLayout()/saveDashLayout() and the
// toggleDashWidget* helpers above; this modal just gives ~17 widgets a
// searchable, browsable list instead of only being reachable by scrolling
// the live grid in edit mode.

//: **A row here is a widget's *state*, not a pair of verbs.**
//:
//: Asked for: "the widgets menu and edit need a redesign". Three things were
//: wrong, and each is a semiotics problem rather than a styling one:
//:
//: 1. Wide was a **flip-label button** — it read "Wide" when narrow and
//:    "Narrow" when wide. A flip label says what pressing it will do and, at
//:    rest, says nothing about what the widget *is*; with nineteen rows you
//:    could not scan the list and see which ones span two columns. It is a
//:    two-state property, so it is now a toggle that stays pressed, with
//:    `aria-pressed` for anyone not looking at it.
//: 2. Remove sat at the same visual weight as Wide, so a destructive action
//:    and a reversible one looked identical. Remove keeps its own accent.
//: 3. **Order could only be changed by dragging the live grid** — unreachable
//:    by keyboard, and invisible from the one screen that lists every widget.
//:    Each row on the dashboard now carries move-up/move-down.
function dashWidgetToggle(label, title, pressed, onClick) {
  const button = smallButton(label, title, onClick);
  button.setAttribute("aria-pressed", String(pressed));
  button.classList.toggle("active", pressed);
  return button;
}

async function moveDashWidget(name, delta) {
  const layout = dashLayout();
  //: Reordered against the *visible* row order, not the full list: moving a
  //: widget "up" past three hidden ones looks like nothing happening.
  const visible = layout.order.filter((n) => !layout.hidden.includes(n));
  const from = visible.indexOf(name);
  const to = from + delta;
  if (from < 0 || to < 0 || to >= visible.length) return;
  visible.splice(to, 0, ...visible.splice(from, 1));
  //: Hidden widgets keep their relative places by being appended after: they
  //: are not on the dashboard, so their order is not something the user is
  //: looking at, and preserving it means un-hiding one puts it back where it
  //: was rather than at the end.
  layout.order = [...visible, ...layout.order.filter((n) => layout.hidden.includes(n))];
  await saveDashLayout(layout);
  renderDashboard();
  renderDashWidgetsList($("dash-widgets-search").value);
}

function dashWidgetRow(name, layout, position = null) {
  const widget = DASH_WIDGETS[name];
  const hidden = layout.hidden.includes(name);
  const isWide = layout.wide.includes(name);

  const row = document.createElement("div");
  row.className = "dash-widget-row";
  row.dataset.widget = name;

  const main = document.createElement("div");
  main.className = "dash-widget-row-main";
  const title = document.createElement("div");
  title.className = "dash-widget-row-title";
  setLabel(title, widget.title);
  main.appendChild(title);
  if (widget.description) {
    const desc = document.createElement("p");
    desc.className = "dash-widget-row-desc muted";
    desc.textContent = widget.description;
    main.appendChild(desc);
  }
  row.appendChild(main);

  const controls = document.createElement("div");
  controls.className = "dash-widget-row-controls entry-actions";
  if (!hidden && position) {
    //: Only where they can do something: the first row's "up" and the last
    //: row's "down" are disabled rather than absent, so the control cluster
    //: keeps one width and the rows stay aligned down the list.
    const up = smallButton("ph:arrow-up", "Move up", () => moveDashWidget(name, -1));
    up.disabled = position.index === 0;
    const down = smallButton("ph:arrow-down", "Move down", () => moveDashWidget(name, 1));
    down.disabled = position.index === position.total - 1;
    for (const button of [up, down]) button.classList.add("icon-button");
    controls.append(up, down);
  }
  if (!hidden) {
    controls.appendChild(
      dashWidgetToggle(
        "ph:arrows-out-line-horizontal Wide",
        isWide ? "Spanning two columns — press to narrow" : "Span two columns",
        isWide,
        async () => {
          await toggleDashWidgetWide(name);
          renderDashboard();
          renderDashWidgetsList($("dash-widgets-search").value);
        },
      ),
    );
  }
  const onOff = smallButton(
    hidden ? "ph:plus Add" : "ph:x Remove",
    hidden ? "Add this widget to the dashboard" : "Remove this widget from the dashboard",
    async () => {
      await toggleDashWidgetHidden(name);
      renderDashboard();
      renderDashWidgetsList($("dash-widgets-search").value);
    },
  );
  //: The one row that takes something away says so in the app's own danger
  //: colour, rather than looking like the reversible toggle beside it.
  if (!hidden) onOff.classList.add("danger");
  controls.appendChild(onOff);
  row.appendChild(controls);
  return row;
}

// Two groups — "On your dashboard" and "Available" — rather than a single
// list with a per-row status chip: with ~17 widgets, seeing at a glance how
// many are already on the dashboard is more useful than reading each row.
function renderDashWidgetsList(filterText = "") {
  const container = $("dash-widgets-list");
  container.replaceChildren();
  const layout = dashLayout();
  const q = filterText.trim().toLowerCase();
  const names = Object.keys(DASH_WIDGETS).filter((name) => {
    if (!q) return true;
    return DASH_WIDGETS[name].title.replace(PH_LABEL, "").toLowerCase().includes(q);
  });

  const addGroup = (label, list, ordered) => {
    if (!list.length) return;
    const heading = document.createElement("h4");
    heading.className = "dash-widgets-group-label";
    heading.textContent = `${label} (${list.length})`;
    container.appendChild(heading);
    list.forEach((name, index) => {
      //: Position is the *unfiltered* one: with a search term typed, "up"
      //: still means one place up the dashboard, not one place up the four
      //: rows that happen to match.
      const position = ordered
        ? { index: ordered.indexOf(name), total: ordered.length }
        : null;
      container.appendChild(dashWidgetRow(name, layout, position));
    });
  };
  //: The dashboard's own order, so the list reads top-to-bottom the way the
  //: page does — a picker that lists widgets in a different order from the
  //: thing it is editing makes "move up" unreadable.
  const onDashboard = layout.order.filter((n) => !layout.hidden.includes(n));
  addGroup(
    "On your dashboard",
    onDashboard.filter((n) => names.includes(n)),
    onDashboard,
  );
  addGroup("Available", names.filter((n) => layout.hidden.includes(n)), null);

  if (!names.length) {
    const empty = document.createElement("p");
    empty.className = "muted";
    empty.textContent = "No widgets match that search.";
    container.appendChild(empty);
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
    smallButton("ph:dice-five Regenerate", "A fresh arrangement of the same notes", () => {
      artNonce += 1;
      startArt(holder);
    })
  );
  controls.appendChild(
    smallButton("ph:floppy-disk Save PNG", "Save this artwork as an image", () => {
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
    // Was missing entirely — width was measured once at setup and never
    // re-synced, so this canvas was the one p5 sketch in the app with no
    // resize handling at all (the sibling in the whiteboard has its own).
    // Reported as the constellation "keeps disappearing": a second trigger
    // on top of the theme-change one ARCHITECTURE §10 already documents and
    // `refreshArtForTheme` already handles. A ResizeObserver on the holder
    // catches both a real window resize *and* the Edit-layout "Wide" toggle
    // (which changes the card's width with no window resize event at all) —
    // `p.windowResized` alone would have missed the second one entirely.
    const resync = () => {
      if (!holder.isConnected) return;
      const next = holder.clientWidth;
      // Guarded the same reason `holder.clientWidth || 300` is in setup: a
      // transient 0 mid-reflow must not shrink the canvas to nothing.
      if (!next || next === width) return;
      width = next;
      p.resizeCanvas(width, height);
      particles = buildArtParticles(p, categories, total, width, height);
    };
    const observer = new ResizeObserver(resync);
    observer.observe(holder);
    p.remove = ((original) => () => {
      observer.disconnect();
      original.call(p);
    })(p.remove);
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
  setLabel(big, current > 0 ? `ph:flame ${current}-day streak` : "No streak yet");
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
// Shared by the Pinned/Most-used/Recent-notes dashboard widgets — reported
// directly for Most Used, but all three shared the same gap: `notePreviewText`
// *strips* markdown syntax down to plain readable text (no literal `**`), which
// isn't the same as *rendering* it — `**bold**` read as clean but unstyled
// "bold", not actual bold text, and an inline image showed nothing at all.
// `renderInlineMarkdown`'s own `compact` mode is exactly what a label-sized
// list row already uses everywhere else in this app for the same reason
// (link chips, the document sidebar) — swap to it here too rather than the
// stripped-text path.
// First image in a note's raw markdown, if it has one and the URL is safe to
// load. `renderInlineMarkdown`'s `compact` mode (used below) deliberately
// swaps every image for its alt text — right for a label-sized chip, but a
// dashboard row has room for the real picture, so this widget-only path
// pulls the first one out for a thumbnail instead.
const FIRST_MD_IMAGE = /!\[([^\]\n]{0,200})\]\(([^)\n]{1,500})\)/;
function firstNoteImage(content) {
  const m = FIRST_MD_IMAGE.exec(content || "");
  if (!m) return null;
  const [, alt, url] = m;
  return isRenderableUrl(url) ? { alt, url } : null;
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
    // The wiki-link unwrap notePreviewText also did — renderInlineMarkdown
    // itself doesn't know `[[...]]`, only the full note-body renderer does.
    const raw = (entry.content || "").replace(/\[\[([^[\]]{1,120})\]\]/g, "$1");
    const image = firstNoteImage(raw);
    if (image) {
      li.classList.add("dash-has-thumb");
      const thumb = document.createElement("img");
      thumb.src = mediaSrc(image.url);
      thumb.alt = image.alt || "";
      thumb.loading = "lazy";
      thumb.className = "dash-list-thumb";
      li.appendChild(thumb);
    }
    const textEl = document.createElement("span");
    textEl.className = "dash-list-text";
    // Block syntax first. renderInlineMarkdown is exactly that — INLINE — so a
    // note beginning "# Groceries" rendered the hash as literal text, which is
    // the reported "markdown still isn't rendering" on these widgets: the bold
    // and italics worked and the headings, bullets and quote marks did not, so
    // it looked like nothing was rendering at all.
    //
    // The first line becomes the row's title instead of being flattened into
    // the preview, the same shape the timeline card uses. It is what a person
    // calls the note, and without it every row in a widget starts with the
    // same three words of body text.
    const flat = raw.replace(/^\s*(?:#{1,6}\s+|>\s?|[-*+]\s+|\d+\.\s+)/gm, "").trim();
    const split = flat.indexOf("\n");
    const heading = (split === -1 ? flat : flat.slice(0, split)).trim();
    const rest = split === -1 ? "" : flat.slice(split + 1).replace(/\s+/g, " ").trim();

    if (heading) {
      const title = document.createElement("span");
      title.className = "dash-list-title";
      const cut = safeMdSlice(heading, 70);
      renderInlineMarkdown(title, cut.text, [], true);
      if (cut.truncated) title.appendChild(document.createTextNode("…"));
      textEl.appendChild(title);
    }
    if (rest) {
      const preview = document.createElement("span");
      preview.className = "dash-list-preview";
      const cut = safeMdSlice(rest, 110);
      renderInlineMarkdown(preview, cut.text, [], true);
      if (cut.truncated) preview.appendChild(document.createTextNode("…"));
      textEl.appendChild(preview);
    }
    li.appendChild(textEl);
    li.title = "Open this note";
    li.addEventListener("click", () => flashEntry(entry.id));
    ul.appendChild(li);
  }
  body.appendChild(ul);
}

// GET /entries pages now (ENTRIES_PAGE_SIZE) rather than returning the whole
// notebook — these three widgets used to each fetch their own full copy of
// it independently, which silently would have started missing tags/notes
// past the first page on a large notebook. `allEntries` is the same data,
// already loaded by loadEntries() before any tab (including the dashboard)
// renders, and complete once its own background paging finishes — so
// preferring it is both a correctness fix and three fewer network calls.
// The fetch fallback only matters if a widget somehow renders before that
// first load, and mirrors the pattern renderRandomNoteWidget already uses.
async function renderPinnedWidget(body) {
  const entries = (
    allEntries.length ? allEntries : await apiJson("/entries", { cacheMs: 4000 })
  ).filter((e) => e.pinned);
  miniEntryList(body, entries.slice(0, 5), "Pin a note and it shows up here.");
}

async function renderMostUsedWidget(body) {
  const entries = await apiJson("/entries/most-accessed");
  miniEntryList(body, entries, "Ask questions and your most-used notes appear here.");
}

// The graph tab already knows how connected every note is (edges from
// EntryLink rows plus reply threads) — this just ranks by how many of those
// edges touch each note, rather than asking the user to eyeball the graph
// for its own densest cluster. Perplexity brainstorm doc review flagged the
// gap: a "most-linked notes / hub" widget was one of the few ideas the app
// didn't already have a version of.
async function renderMostLinkedWidget(body) {
  const [entries, data] = await Promise.all([
    allEntries.length ? Promise.resolve(allEntries) : apiJson("/entries", { cacheMs: 4000 }),
    apiJson("/graph").catch(() => null),
  ]);
  const degree = new Map();
  for (const edge of (data && data.edges) || []) {
    if (typeof edge.source === "number") degree.set(edge.source, (degree.get(edge.source) || 0) + 1);
    if (typeof edge.target === "number") degree.set(edge.target, (degree.get(edge.target) || 0) + 1);
  }
  const byId = new Map(entries.map((e) => [e.id, e]));
  const ranked = [...degree.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([id]) => byId.get(id))
    .filter(Boolean)
    .slice(0, 6);
  miniEntryList(body, ranked, "Link notes to each other and the most-connected ones show up here.");
}

async function renderRecentNotesWidget(body) {
  const entries = allEntries.length ? allEntries : await apiJson("/entries", { cacheMs: 4000 });
  const newest = [...entries].sort(
    (a, b) => new Date(b.created_at) - new Date(a.created_at)
  );
  miniEntryList(body, newest.slice(0, 6), "Your newest notes will appear here.");
}

async function renderTopTagsWidget(body) {
  const entries = allEntries.length ? allEntries : await apiJson("/entries", { cacheMs: 4000 });
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
      smallButton("ph:arrows-clockwise Regenerate", "Rebuild this week's digest now", () => {
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
      draftsOnly = false;
      switchTab("notes");
      renderEntries();
      renderSidebar();
    });
    list.appendChild(row);
  }
  body.appendChild(list);
}

// A plain char-count slice can land inside an unclosed `![alt](url` or
// `[text](url` — the truncated tail then has no closing `)`, so INLINE_MD
// never matches it and it prints as literal markdown source instead of
// rendering (or vanishing) as intended. Reported live as "the Rediscover
// widget doesn't render images or sketches" — plausible root cause: a
// sketch note is a caption plus `![...](...)`, and the reference is exactly
// what a mid-string cut most often lands inside. Backs the cut up to just
// before the last unclosed `[`/`![` before the limit, if there is one.
function truncateMarkdownSafe(text, limit) {
  if (text.length <= limit + 1) return text;
  let cut = limit;
  const openBracket = text.lastIndexOf("[", cut);
  if (openBracket !== -1) {
    const closeParen = text.indexOf(")", openBracket);
    if (closeParen === -1 || closeParen >= cut) {
      cut = text[openBracket - 1] === "!" ? openBracket - 1 : openBracket;
    }
  }
  return text.slice(0, cut).trimEnd() + "…";
}

// --- rediscover a random note ------------------------------------------------

async function renderRandomNoteWidget(body) {
  const entries = allEntries.length
    ? allEntries
    : await apiJson("/entries", { cacheMs: 4000 }).catch(() => []);
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
    renderMarkdown(text, truncateMarkdownSafe(note.content, 239));
    body.appendChild(text);

    // A sketch's picture is never in `note.content` at all — the sketch pad
    // saves a caption as the note's text and the drawing as a real
    // Attachment (saveSketch), a completely different mechanism from a
    // pasted/dropped image's inline `![](...)`. Any renderer that only
    // reads content, this one included, showed nothing for a sketch note —
    // "the widget doesn't render... sketches", reported directly. Same
    // .attachment-thumb treatment the note-card list already gives an
    // attached image, so a sketch resurfaced here looks the way it does
    // everywhere else.
    const images = (note.attachments || []).filter((a) => a.is_image);
    if (images.length) {
      const row = document.createElement("div");
      row.className = "entry-links";
      for (const attachment of images) {
        const wrap = document.createElement("span");
        wrap.className = "thumb-wrap";
        const img = document.createElement("img");
        img.className = "attachment-thumb";
        img.alt = attachment.filename;
        img.title = `${attachment.filename} — click to view full size`;
        attachmentObjectUrl(attachment)
          .then((url) => (img.src = url))
          .catch(() => wrap.remove());
        img.addEventListener("click", () => {
          openLightbox(
            images.map((a) => ({ filename: a.filename, getUrl: () => attachmentObjectUrl(a) })),
            images.indexOf(attachment)
          );
        });
        wrap.appendChild(img);
        row.appendChild(wrap);
      }
      body.appendChild(row);
    }

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
    const another = smallButton("ph:dice-five Another", "Show a different note", paint);
    if (entries.length < 2) {
      // There is no other note to show. A live-looking button that cannot do
      // anything is the exact shape of "this control is broken" — say why
      // instead.
      another.disabled = true;
      another.title = "This is your only note so far — write another and it'll shuffle.";
    }
    row.appendChild(another);
    row.appendChild(
      smallButton("ph:note-pencil Open", "Open this note in the Notes tab", () => flashEntry(note.id))
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
      toast("Focus session complete — nice work!");
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

// --- wiring (moved out of app.js's own wiring block, §88.3) -----------------------
//
// These two listener groups used to sit inside app.js's general wiring, far
// from the code they drive (the same "scattered, not one block" shape the
// roadmap warned about). Moving only the function *definitions* out and
// leaving these `addEventListener` calls behind in app.js would have been
// the exact hazard documents.js's split found: `$("features-close")
// .addEventListener("click", closeFeatures)` passes `closeFeatures` as a
// bare identifier, resolved the moment this line runs — and this line runs
// at app.js's own top-level, parse-time pass, before dashboard.js (loaded
// after app.js) has defined it. Left behind, that throws `ReferenceError`
// and aborts the rest of app.js's synchronous top-level code, same as
// `initDocSidebarTabs()` did. The other listeners here wrap their calls in
// arrow functions, which resolve the name lazily at click time rather than
// at registration time, so they were never actually at risk — but keeping
// the whole related group together here is clearer than splitting it by
// which handlers happen to be safe.
$("dash-edit").addEventListener("click", () => {
  dashEditMode = !dashEditMode;
  $("dash-edit").textContent = dashEditMode ? "Done" : "Edit layout";
  renderDashboard();
});
// Widget picker modal (roadmap §26): a dedicated surface alongside "Edit
// layout" above, not a replacement for it.
$("dash-widgets-open").addEventListener("click", () => {
  $("dash-widgets-search").value = "";
  renderDashWidgetsList();
  $("dash-widgets-dialog").showModal();
});
$("dash-widgets-search").addEventListener("input", (e) => renderDashWidgetsList(e.target.value));
// Tools & features browser (opened from the dashboard quick links).
$("features-close").addEventListener("click", closeFeatures);
$("features-search").addEventListener("input", (e) => renderFeatures(e.target.value));
$("features-overlay").addEventListener("click", (e) => {
  if (e.target === $("features-overlay")) closeFeatures();
});
