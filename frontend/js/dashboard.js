// dashboard.js: widgets, masonry, the generative art (split out of app.js).
// Everything here calls app.js globals only at run time, inside functions,
// so load order matters only the other way: app.js reaches in from its own
// functions (refreshActiveTab, switchTab, the appearance code). Two split
// hazards, both a bare top-level reference resolving before this file loads:
// the features-close wiring moved here beside its functions, and
// ai-tools.js's applyPalette guards refreshArtForTheme with `typeof`.
// Left in app.js: tickClocks (Reminders uses it too), the tab-bar overflow
// fade, safeMdSlice/notePreviewText/renderEmblem (shared), the Settings
// appearance and persona code, and the AI Skills page.

// --- dashboard (Wave D) -----------------------------------------------------------

let dashEditMode = false;
//: After a reorder the grid reflows under the pointer; without a pause the
//: next dragover moved the card straight back (release: "a complete mess").
let dashDragLockUntil = 0;

//: A named function rather than inline in renderDashboard's card loop: the
//: rect reads run on dragover, never in that loop, and the layout lint
//: (test_css_invalidation) reads a loop body statically.
function dashDragOverCard(e, card, dragged, grid) {
  //: **Decided by where the pointer is on the target, not by order.**
  //: The old rule moved the card on every dragover by index alone, so
  //: once the grid reflowed under the pointer the next dragover moved it
  //: back: two cards swapping places over and over. Now: before or
  //: after the target by which half of it the pointer is over (the x
  //: half on the same row, the y half otherwise), nothing when the card
  //: is already in that place, and a short pause after each move while
  //: the grid settles.
  const now = performance.now();
  if (now < dashDragLockUntil) return;
  const r = card.getBoundingClientRect();
  const d = dragged.getBoundingClientRect();
  const sameRow = Math.abs(r.top - d.top) < r.height / 2;
  const before = sameRow ? e.clientX < r.left + r.width / 2 : e.clientY < r.top + r.height / 2;
  const ref = before ? card : card.nextSibling;
  if (ref === dragged || ref === dragged.nextSibling) return;
  grid.insertBefore(dragged, ref);
  dashDragLockUntil = now + 220;
}
let dragWidget = null; // widget name being dragged

// Widget registry: name → title + async renderer that fills a body div.
// `description` is a one-line, plain-text (no ph: marker) summary shown only
// in the widget picker modal, the on-dashboard header just uses `title`.
const DASH_WIDGETS = {
  stats: { title: "ph:chart-bar Stats", description: "Note count, tags, categories and other totals at a glance.", render: renderStatsWidget },
  streak: { title: "ph:flame Streak", description: "How many days in a row you've added or edited a note.", render: renderStreakWidget },
  art: { title: "ph:palette Notebook constellation", description: "A generative starfield: one cluster per category, sized by note count.", render: renderArtWidget },
  //: The key stays `pinned`, it is a stored widget id, and renaming it would
  //: silently drop the widget off every dashboard that has it turned on. Only
  //: what a person reads changes, which is the half that was inconsistent:
  //: the sidebar and the note cards call this Favourites.
  pinned: { title: "ph:star Favourites", description: "Notes you've starred, so they're always one click away.", render: renderPinnedWidget },
  "recent-notes": { title: "ph:clock Recently added", description: "The last few notes you created, newest first.", render: renderRecentNotesWidget },
  //: WORLD_CLASS_PLAN B1's strip: the event feed (`GET /events`) had no
  //: reader. Not a second "Recently added": that one lists what you wrote,
  //: this one what *happened*, including what Atlas or a skill changed on
  //: your behalf, which is the one thing no other widget can say.
  activity: { title: "ph:pulse Recent activity", description: "What changed in your notebook lately, and whether you, Atlas or a skill changed it.", render: renderActivityWidget },
  //: WORLD_CLASS_PLAN I1's morning card over `GET /night/latest`.
  night: { title: "ph:moon-stars While you were away", description: "What Atlas worked out reading your notes on its own, with each finding to open or dismiss.", render: renderNightWidget },
  "most-used": { title: "ph:flame Most used", description: "The notes you open and ask about most often.", render: renderMostUsedWidget },
  //: WORLD_CLASS_PLAN section 17 rows 5 and 1: the owner's "most-accessed
  //: information" for this month (`GET /most-opened`, a day-by-day open log),
  //: and the filings waiting for a person (`GET /review-queue`).
  "most-opened": { title: "ph:eye Most opened this month", description: "The ten notes you opened most in the last thirty days.", render: renderMostOpenedWidget },
  review: { title: "ph:checks Filings to check", description: "Notes Atlas was unsure where to file, and notes left Uncategorised, to accept or move.", render: renderReviewWidget },
  "most-linked": { title: "ph:link Most-linked notes", description: "The notes with the most connections, the hubs of your notebook.", render: renderMostLinkedWidget },
  "top-tags": { title: "ph:tag Top tags", description: "Your most-used tags, ranked by how many notes carry them.", render: renderTopTagsWidget },
  questions: { title: "ph:chat-circle Recent questions", description: "The questions you've recently asked the notebook's chat.", render: renderQuestionsWidget },
  "on-this-day": { title: "ph:calendar-blank On this day", description: "What you wrote on this date in earlier months and years.", render: renderOnThisDayWidget },
  digest: { title: "ph:newspaper Weekly digest", description: "A short roundup of what you wrote and did this week.", render: renderDigestWidget },
  capture: { title: "ph:pencil-simple Quick capture", description: "A one-line box to jot a note without leaving the dashboard.", render: renderQuickCaptureWidget },
  reminders: { title: "ph:alarm Reminders", description: "Upcoming and overdue reminders, soonest first.", render: renderRemindersWidget },
  focus: { title: "ph:timer Focus timer", description: "A start/stop timer for focused writing sessions.", render: renderFocusTimerWidget },
  heatmap: { title: "ph:calendar-check Activity heatmap", description: "A calendar-style heatmap of note activity over the past months.", render: renderHeatmapWidget },
  "tag-cloud": { title: "ph:cloud Tag cloud", description: "All your tags sized by how often they're used.", render: renderTagCloudWidget },
  categories: { title: "ph:folders Categories", description: "Every category with its note count, click to filter.", render: renderCategoriesWidget },
  //: The key stays `random`, it is a stored widget id and renaming it would
  //: drop the widget off every dashboard that has it turned on. What it does
  //: changed (WORLD_CLASS_PLAN 15, I4): over ten notes it shows the three
  //: notes furthest out of reach, ranked by age, links and opens, with the
  //: reason on each card; under ten it still shuffles, because "the three
  //: most faded" out of five notes is the same three for ever.
  random: { title: "ph:dice-five Rediscover", description: "The notes slipping out of reach: old, unlinked and unopened, with the reason for each.", render: renderRandomNoteWidget },
  //: **Four surfaces the dashboard could not see at all.**
  //:
  //: Every widget above this line reads notes. But a notebook here is also
  //: boards, documents, and the state a note is *in*, and the dashboard is
  //: the one screen meant to answer "what is going on in here", so a feature
  //: with no widget is a feature the dashboard is blind to. Audited against
  //: the tab bar rather than brainstormed: Boards & maps, Documents, and the
  //: two things about notes that nothing surfaced (which ones still have work
  //: left in them, and which ones are stranded).
  boards: { title: "ph:squares-four Boards & maps", description: "The board or map with the most on it, drawn large at its own shape, then the next four.", render: renderBoardsWidget },
  documents: { title: "ph:file-text Recent documents", description: "The documents you last edited, newest first.", render: renderDocumentsWidget },
  //: The Library sub-tab this reads was renamed Links -> Bookmarks (INBOX
  //: 430: "links" read as note-to-note links to anyone who hadn't opened
  //: the tab), and this widget is the other half of the same fix: the
  //: dashboard could see recent notes, documents and boards already, but
  //: nothing about the one Library surface that isn't a note or a file.
  bookmarks: { title: "ph:bookmark-simple Bookmarks", description: "Your recently saved bookmarks, pinned ones first.", render: renderBookmarksWidget },
  unfinished: { title: "ph:check-square-offset Unfinished", description: "Notes with checklist items you haven't ticked off yet.", render: renderUnfinishedWidget },
  orphans: { title: "ph:link-break Loose ends", description: "How much of your notebook is connected to anything, and the oldest notes that aren't.", render: renderOrphanNotesWidget },
  //: Deliberately a doorway rather than a live reading. Every other widget
  //: here answers from data already loaded; this one's answer costs a model
  //: pass over pairs of notes, so rendering the dashboard must not start one.
  tensions: { title: "ph:scales Tensions", description: "Find where your notes contradict each other, a decision reversed, a date that moved, a view you changed.", render: renderTensionsWidget },
  //: **What a notebook can tell you that a to-do list cannot:** whether you
  //: are actually writing. Answered entirely from `allEntries`, which is
  //: already loaded, no request, no model. (Its sibling idea, what you
  //: were thinking about on this date in earlier years, turned out to
  //: already exist as `on-this-day` above under a different key; reported
  //: directly as two identical widgets in the picker, "on-this-day" kept
  //: since it was the original and removing `onthisday` here needed no
  //: layout migration: `dashLayout()` already drops any saved id that
  //: isn't in this object.)
  pace: { title: "ph:chart-line-up Writing pace", description: "How many words you have written each day this fortnight.", render: renderPaceWidget },
};

//: Widgets that are the wrong shape in one column, so they start in two.
//:
//: The owner: "the heatmap on the dashboard is a little small." Measured at
//: 1440x900, and it is arithmetic rather than taste: the widget column is
//: 306px, a year is 53 columns of squares, and at a 3px gap the gaps alone
//: eat 156px of the 306, leaving **2.8px per cell**. A year of activity is
//: supposed to be a shape you read at a glance and that is a texture. In a
//: full-width section the same grid gets 1408px and its cells hit the 12px
//: cap, which is the size GitHub's own is drawn at.
//:
//: Applied only when the saved layout widens *nothing*, so it is a default
//: rather than an override: the moment anyone presses "Wide" or "Narrow" on
//: any widget, their list wins and this is never consulted again.
const DASH_DEFAULT_WIDE = ["heatmap"];

//: **What a dashboard nobody has arranged shows** (INBOX 393: "I lose trust
//: in ... applications with poor ui design"). Every widget used to be on by
//: default: measured, 23 cards on a fresh dashboard, most of them empty-state
//: sentences on a new notebook, which reads as a demo of widgets rather than
//: a place to start. A fresh layout shows these nine, in this order: what is
//: due, what is new, what is kept, a box to write in, then the work and the
//: look back. The other fourteen are one press away under Widgets. Only a
//: layout that has never been saved is affected; any saved choice wins.
const DASH_DEFAULT_SHOWN = [
  "reminders", "recent-notes", "pinned", "capture",
  "documents", "boards", "digest", "on-this-day", "heatmap",
];

//: Widgets added after the dashboard shipped that start switched off. The
//: owner asked for a dashboard with less on it (INBOX 270), so a new widget is
//: offered in the picker rather than appended to every existing dashboard.
//: Applied only while a saved layout has never seen the widget: once anybody
//: adds it, or saves a layout with it hidden, the saved layout decides.
const DASH_OPT_IN = ["activity", "night"];

function dashLayout() {
  const saved = (prefsCache && prefsCache.dashboard_layout) || {};
  //: Empty lists count as never arranged: the preference's own default is
  //: `{order: [], hidden: []}`, and Reset writes the same, so Reset returns to
  //: this set too.
  const fresh = !saved.order?.length && !saved.hidden?.length;
  const order = [...(fresh ? DASH_DEFAULT_SHOWN : saved.order || [])];
  const hidden = fresh
    ? Object.keys(DASH_WIDGETS).filter((n) => !DASH_DEFAULT_SHOWN.includes(n))
    : [...(saved.hidden || [])];
  for (const name of Object.keys(DASH_WIDGETS)) {
    if (!order.includes(name)) {
      order.push(name); // new widgets append
      if (DASH_OPT_IN.includes(name) && !hidden.includes(name)) hidden.push(name);
    }
  }
  // Older layouts stored this as {name: "wide"}, fold those in so a saved
  // layout still works.
  const legacyWide = Object.keys(saved.sizes || {}).filter((n) => saved.sizes[n] === "wide");
  return {
    order: order.filter((n) => DASH_WIDGETS[n]),
    hidden,
    //: `narrow` is what someone set back to one column. Without it, Narrow on
    //: the heatmap (the only default wide widget) saved an empty `wide`, which
    //: reads as "never chosen" and put the default straight back.
    wide: (saved.wide?.length
      ? saved.wide
      : (legacyWide.length ? legacyWide : DASH_DEFAULT_WIDE.filter((n) => DASH_WIDGETS[n])))
      .filter((n) => !(saved.narrow || []).includes(n)),
    narrow: [...(saved.narrow || [])],
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
  const narrowing = next.wide.includes(name);
  next.wide = narrowing ? next.wide.filter((n) => n !== name) : [...next.wide, name];
  next.narrow = narrowing ? [...next.narrow.filter((n) => n !== name), name] : next.narrow.filter((n) => n !== name);
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

// The name always comes from preferences, never from the model, so it can't
// be mangled or hallucinated, and editing it takes effect immediately. The
// terminal mark goes on last so the result reads as a proper sentence:
// "Rise and shine" + ", Sam" + "." → "Rise and shine, Sam." A cached "!" from
// before the server stopped sending one reads as a full stop (INBOX 472).
function withDisplayName(phrase, punctuation = ".", appendName = true) {
  const name = ((prefsCache && prefsCache.display_name) || "").trim();
  const mark = punctuation === "?" ? "?" : ".";
  // Also sentence-cased here, so an older cached greeting written by the model
  // in lowercase corrects itself on the next render.
  const opener = phrase ? phrase.charAt(0).toUpperCase() + phrase.slice(1) : phrase;
  // Don't append when the server says the greeting already handles the name, 
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
    const cached = prefs.json("greetingCache", null);
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
// leaves the handwritten fallback on screen. `forced` skips the cache check, 
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

//: The stopper `startMinuteTicker` (shell-reminders.js) hands back, not a timer id: a
//: chained timeout has a new id every tick, so an id could not cancel it.
let dashClockTimer = null;

function stopDashClock() {
  if (dashClockTimer) dashClockTimer();
  dashClockTimer = null;
}

function startDashClock() {
  stopDashClock();
  // Nothing to tick for while nobody can see it. The repaint on return is
  // what makes stopping safe: resuming on the next tick would leave the time
  // it stopped at on screen for up to a second, which on a clock is the one
  // place a person notices.
  if (document.hidden) return;
  //: One wake a minute, on the minute, rather than sixty: this paints HH:MM,
  //: so 59 of every 60 runs wrote the string already on screen. See
  //: `startMinuteTicker` in shell-reminders.js for why it is a wall-clock-aligned
  //: timeout chain and not a 60,000 ms interval (INBOX 266, item 7).
  dashClockTimer = startMinuteTicker(paintDashClock);
}

document.addEventListener("visibilitychange", () => {
  // Only while the dashboard is actually drawn: `paintDashClock` returns at
  // once when its two elements are not in the page, but a ticker started
  // on every tab would still be a ticker.
  if (!$("dash-clock-time")) return;
  if (document.hidden) {
    stopDashClock();
    return;
  }
  paintDashClock();
  startDashClock();
});

function paintDashClock() {
  const timeEl = $("dash-clock-time");
  const dateEl = $("dash-clock-date");
  if (!timeEl || !dateEl) return;
  const now = new Date();
  timeEl.textContent = now.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
  dateEl.textContent = now.toLocaleDateString([], {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

// A short line about the notebook, note count, plus whatever's most
// worth surfacing right now (due reminders, then a capture streak).
//: **One `/insights/stats` per moment, not one per widget.** Seven widgets
//: each asked for it on their own, so a boot fetched it five times at about
//: 200 ms each (measured 2026-09-13). The first caller's promise is shared
//: for two seconds; a widget that renders later than that asks afresh.
//:
//: The body called *itself* when this was written, which no test could see and
//: no probe reported as an error: the recursion blew the stack on the first
//: call, every one of the seven call sites has a `.catch`, and the widgets that
//: read stats simply drew their empty state. What gave it away was the boot
//: fetch log, where `/insights/stats` did not appear at all, having gone from
//: five requests to none rather than to one.
let dashStatsInflight = null;
let dashStatsAt = 0;
function fetchDashStats() {
  const now = Date.now();
  if (dashStatsInflight && now - dashStatsAt < 2000) return dashStatsInflight;
  dashStatsAt = now;
  //: A deadline (INBOX 513, the owner: Stats, Streak and the constellation
  //: "stuck loading"): three widgets wait on this one request, so a request
  //: that never answered left all three on "Loading…" for good. It fails
  //: instead, each card offers Retry, and the next call asks again.
  const pending = apiJson("/insights/stats", { timeoutMs: 15000 });
  dashStatsInflight = pending;
  pending.catch(() => {
    if (dashStatsInflight === pending) dashStatsInflight = null;
  });
  return pending;
}

//: **One `/graph` per moment, not one per widget**, the same shape and the
//: same reason as `fetchDashStats` above. Three widgets read the edge list
//: (most-linked, orphan notes, tensions) and all three render in the same
//: pass, so the `cacheMs` two of them passed could never help: a read cache
//: is only a cache once a response has come back, and these three requests
//: were in flight together. Measured at boot: three `/graph` builds, which is
//: the most expensive endpoint on the dashboard's list.
let dashGraphInflight = null;
let dashGraphAt = 0;
function fetchDashGraph() {
  const now = Date.now();
  if (dashGraphInflight && now - dashGraphAt < 2000) return dashGraphInflight;
  dashGraphAt = now;
  //: `slim=1`, the map's own read (GRAPH_PLAN, a slimmer node): the widgets
  //: read only each link's two ends, and one shape means one cached build
  //: after a change serves the dashboard and the map alike.
  dashGraphInflight = apiJson("/graph?slim=1", { silent: true });
  return dashGraphInflight;
}

//: **One reminder walk per moment.** Three places on this tab want every
//: reminder (the greeting line's due count, the stat tile, and the reminders
//: widget), and all three render in the same pass, so a cold start walked
//: `/reminders` three times over (WORLD_CLASS_PLAN A2). To the end of the
//: list, not the first page: `/reminders` is `due_at` ascending, so a first
//: page of old, ticked-off rows would hide everything upcoming
//: (`agent-remaining/list-paging.md`).
let dashRemindersInflight = null;
let dashRemindersAt = 0;
function dashReminders() {
  const now = Date.now();
  if (dashRemindersInflight && now - dashRemindersAt < 2000) return dashRemindersInflight;
  dashRemindersAt = now;
  dashRemindersInflight = apiPagedList("/reminders", 200);
  return dashRemindersInflight;
}

//: The notebook, for the four widgets that want the whole of it.
//:
//: `entriesEverLoaded`, not `allEntries.length`: an empty list is an answer,
//: and reading it as "not loaded yet" meant a notebook with nothing in it
//: fetched the whole of `/entries` again per widget per render, boot included,
//: to be told the same thing (WORLD_CLASS_PLAN A2). A new notebook is exactly
//: the one where the empty state is what the person is looking at.
//:
//: Before the notes list has its first page, the store's `notes` slice is
//: waited for (F12) rather than `/entries` fetched a second time: at boot the
//: dashboard and the notes list both asked for the same thousand rows. A load
//: that never lands (`appState.when`'s timeout gives null) still falls back.
async function dashEntries() {
  if (entriesEverLoaded) return allEntries;
  const notes = await appState.when("notes", 8000);
  return notes || apiJson("/entries", { cacheMs: 4000 });
}

async function renderDashSubmessage() {
  const el = $("dash-submessage");
  if (!el) return;
  const [stats, reminders] = await Promise.all([
    fetchDashStats().catch(() => null),
    // To the end: `/reminders` is `due_at` ascending, so a first page of
    // old, ticked-off rows would hide everything upcoming from this count
    // (`archive/agent-remaining/list-paging.md`); `dashReminders` shares
    // the one fetch across the widgets that need it.
    dashReminders().catch(() => []),
  ]);
  const bits = [];
  if (stats) {
    const n = stats.total_entries;
    bits.push(["notes", n === 0 ? "No notes yet" : `You have ${n} note${n === 1 ? "" : "s"}`]);
  }
  const due = (reminders || []).filter(
    (r) => !r.done && new Date(r.due_at) <= new Date()
  ).length;
  if (due) bits.push(["reminders", `${due} reminder${due === 1 ? "" : "s"} due`]);
  else {
    const open = (reminders || []).filter((r) => !r.done).length;
    if (open) bits.push(["reminders", `${open} reminder${open === 1 ? "" : "s"} coming up`]);
  }
  if (stats && stats.per_day) {
    const streak = dashStreak(stats.per_day);
    if (streak > 1) bits.push(["streak", `${streak}-day capture streak`]);
    //: Atlas celebrates a streak of three days or more, once a day at most
    //: (atlas.js, `atlasStreak`), and the companion cheers once when it grows
    //: (avatars.js). Here since INBOX 436 took the stat strip that used to
    //: carry both calls off the first screen: this line reads the same figure.
    atlasStreak(streak);
    nameMarkBuddyStreak(streak);
  }
  //: One span per fact, its separator inside it, so a view can fold one fact
  //: away whole: the Focused hero's glance says what is due (INBOX 675), and
  //: hides the reminders fact here rather than saying it twice.
  el.replaceChildren(
    ...bits.map(([kind, text], i) => {
      const bit = document.createElement("span");
      bit.className = "dash-sub-bit";
      bit.dataset.bit = kind;
      bit.textContent = i ? ` · ${text}` : text;
      return bit;
    })
  );
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
  // It also can't be sized while the tab is display:none, p5 measures zero , 
  // which is why this sits in the dashboard's own render and not in init.
  paintDashEmblem();
  paintDashClock();
  // One ticking clock, however many times the dashboard re-renders, none at
  // all while the tab is hidden, and one wake a minute while it is not. It
  // paints HH:MM, so a hidden tab was waking the process once a second to
  // write the string that was already there, for as long as the app stayed
  // open (WORLD_CLASS_PLAN section 10, F6: "0 timers while hidden"), and a
  // visible one was doing the same 59 times out of 60.
  startDashClock();
  renderDashSubmessage().catch(() => {});
  renderDashGlance().catch(() => {});
}

//: **The Focused hero's glance** (INBOX 675, the owner, with a screenshot at
//: about 2000px: "can you improve the dashboard hero section on the focused
//: view??"). The banner was a greeting at one end, the time at the other and
//: nothing between: the widest empty strip of it measured 60% of the hero at
//: 1024, 72% at 1440 and 78% at 1920 (`scratchpad/ui-sweeps/hero675.js`). A
//: hero earns that width by answering the question somebody opens a notebook
//: with, which is "what needs me today", so the other half of it is four
//: tiles: what is due today, today's meetings, the filings waiting and the
//: note you were last in.
//:
//: Always four, in one order, each with a calm state: tiles that come and go
//: with the day's data would move under the pointer and leave the empty
//: middle back on a quiet day. Every number is a read the dashboard already
//: makes (`dashReminders`, `fetchDashStats`, `dashEntries`, all shared with
//: the widgets), so the glance costs no request and no model.
//:
//: Pure, so the arithmetic runs in node (tests/test_inbox_675_hero.py); `go`
//: is a token `renderDashGlance` turns into the press, not a closure.
function dashGlanceFacts({ reminders = [], stats = null, entries = [], now = new Date() } = {}) {
  const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  const time = (d) => d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  const byDue = (a, b) => new Date(a.due_at) - new Date(b.due_at);
  const open = (reminders || []).filter((r) => r && !r.done).sort(byDue);
  const today = open.filter((r) => new Date(r.due_at) < endOfDay);
  const overdue = today.filter((r) => new Date(r.due_at) <= now).length;
  const next = open.find((r) => new Date(r.due_at) >= endOfDay);
  let dueHint = "No reminders set";
  if (today.length) {
    const first = today[0];
    const when = new Date(first.due_at);
    dueHint = when <= now ? `${first.text}, overdue` : `${first.text} at ${time(when)}`;
  } else if (next) {
    dueHint = `Next: ${next.text}, ${new Date(next.due_at).toLocaleDateString([], { weekday: "long" })}`;
  }
  const due = {
    id: "due",
    icon: "ph:alarm",
    count: today.length,
    overdue,
    label: today.length ? `${today.length} due today` : "Nothing due today",
    hint: dueHint,
    go: "reminders",
  };

  //: A meeting is a note typed Meeting with a `date:` in its property block,
  //: the writer's wall clock (entry/meetings.py); today's are the ones whose
  //: date is today's, the next one the first still to start.
  const meetingsToday = [];
  for (const entry of entries || []) {
    const when = dashMeetingWhen(entry, now);
    if (when) meetingsToday.push({ entry, when });
  }
  meetingsToday.sort((a, b) => a.when - b.when);
  const upcoming = meetingsToday.find((m) => m.when >= now) || meetingsToday[meetingsToday.length - 1];
  const name = (entry) => (entry.title || "").trim() || "A meeting";
  const n = meetingsToday.length;
  const meetings = {
    id: "meetings",
    icon: "ph:users-three",
    count: n,
    label: n ? `${n} meeting${n === 1 ? "" : "s"} today` : "No meetings today",
    hint: !n
      ? "Nothing on the calendar"
      : upcoming.when >= now
        ? `${name(upcoming.entry)} at ${time(upcoming.when)}`
        : `${name(upcoming.entry)} was at ${time(upcoming.when)}`,
    go: n ? { entry: upcoming.entry.id } : "meetings",
  };

  //: Null when the stats read failed: "Nothing to file" would be a claim.
  const waiting = stats && Number.isFinite(stats.to_review) ? stats.to_review : null;
  const review = {
    id: "review",
    icon: "ph:checks",
    count: waiting,
    label: waiting === null ? "Filings to check" : waiting ? `${waiting} to file` : "Nothing to file",
    hint: waiting ? "Atlas was unsure where these go" : waiting === 0 ? "Every note has a home" : "Open the list",
    go: "review",
  };

  const last = dashContinueNote(entries);
  const lastTitle = last
    ? (last.title || "").trim() || (last.content || "").split("\n").map((l) => l.replace(/^#{1,6}\s+/, "").trim()).find((l) => l && l !== "---") || "Your last note"
    : "";
  const resume = {
    id: "continue",
    icon: last ? "ph:arrow-u-up-left" : "ph:pencil-simple",
    count: null,
    label: last ? lastTitle : "No notes yet",
    hint: last ? "Pick up where you left off" : "Your first note starts here",
    go: last ? { entry: last.id } : "capture",
  };
  return [due, meetings, review, resume];
}

//: When a note is a meeting today: its `date:` as a local Date, or null. A
//: date with no time is the start of the day, so it sorts first.
function dashMeetingWhen(entry, now) {
  const content = (entry && entry.content) || "";
  if (!content.startsWith("---")) return null;
  const end = content.indexOf("\n---", 3);
  if (end < 0) return null;
  const block = content.slice(3, end);
  if (!/^type:\s*meeting\s*$/im.test(block)) return null;
  const found = /^date:\s*(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2}))?/m.exec(block);
  if (!found) return null;
  const [, y, mo, d, h = "0", mi = "0"] = found;
  if (Number(y) !== now.getFullYear() || Number(mo) !== now.getMonth() + 1 || Number(d) !== now.getDate()) return null;
  return new Date(Number(y), Number(mo) - 1, Number(d), Number(h), Number(mi));
}

//: Drawn at every view and shown at Focused only (the CSS): the reads are the
//: widgets' own, so drawing it costs nothing, and a switch of view needs no
//: render. Tiles are the tile recipe (`quickLinkButton`), toned for a card.
async function renderDashGlance() {
  const host = $("dash-glance");
  if (!host) return;
  //: The newest draw wins; its number is held on the host, not in a
  //: top-level `let` (the global-scope ratchet).
  const serial = String((Number(host.dataset.glanceDraw) || 0) + 1);
  host.dataset.glanceDraw = serial;
  //: Four placeholders first, so the hero holds its height while the reads
  //: land (INBOX 577's rule for this banner: no shift at boot).
  if (!host.childElementCount) {
    for (let i = 0; i < 4; i++) {
      const hold = document.createElement("span");
      hold.className = "quick-link dash-glance-hold";
      hold.setAttribute("aria-hidden", "true");
      host.append(hold);
    }
  }
  const [reminders, stats, entries] = await Promise.all([
    dashReminders().catch(() => []),
    fetchDashStats().catch(() => null),
    dashEntries().catch(() => []),
  ]);
  if (serial !== host.dataset.glanceDraw || !host.isConnected) return;
  const facts = dashGlanceFacts({ reminders, stats, entries });
  const press = {
    reminders: () => switchTab("reminders"),
    meetings: () => showNotesFilter("tag:meeting"),
    review: () => showNotesFilter("is:review"),
    capture: () => startNewNote(),
  };
  host.replaceChildren(
    ...facts.map((fact) => {
      const run = typeof fact.go === "object" ? () => flashEntry(fact.go.entry) : press[fact.go];
      const tile = quickLinkButton({ icon: fact.icon, label: fact.label, hint: fact.hint, run });
      tile.classList.remove("quick-action");
      tile.dataset.glance = fact.id;
      tile.title = `${fact.label}. ${fact.hint}`;
      //: A trailing caret: the tile is a way somewhere, and in a wide tile
      //: it gives the far end something to say rather than an empty box.
      const go = document.createElement("i");
      go.className = "ph ph-caret-right dash-glance-go";
      go.setAttribute("aria-hidden", "true");
      tile.append(go);
      //: A tile with nothing in it is quieter than one with something, so
      //: the eye lands on what needs doing (and on overdue first).
      if (fact.count === 0) tile.classList.add("is-calm");
      if (fact.overdue) tile.classList.add("is-overdue");
      return tile;
    })
  );
}

{
  //: The hero's one action at Focused, where Quick access (whose first tile
  //: is the same New note) is folded away.
  const add = $("dash-hero-new");
  if (add) add.addEventListener("click", () => startNewNote());
}

// The greeting can address you by name, but the setting for it is one field
// among a dozen in Preferences, so for most people it is simply never found,
// and the greeting looks like it just doesn't do that (user-reported). One
// quiet offer beside the greeting, only while no name is set, and it stops
// asking the moment you either set one or dismiss it.
function renderNameNudge(greetingEl) {
  const existing = document.getElementById("dash-name-nudge");
  if (existing) existing.remove();
  const name = ((prefsCache && prefsCache.display_name) || "").trim();
  if (name || prefs.get("nameNudgeDismissed", null) === "1") return;

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
  dismiss.className = "ghost small icon-only";
  setLabel(dismiss, "ph:x");
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

//: **Three passes, not one per card** (INBOX 400). Written per card, the
//: loop set a card's span, read its height and set it again, so every card
//: after the first read a layout the previous card had just dirtied: one
//: forced layout of the whole page per widget. Profiled on a switch to the
//: dashboard (`f2-prof.js`), that was 14.7ms of a 22ms switch. Every card's
//: height depends on its own content and the column width alone, never on
//: another card's span, so all of them can be released first, measured
//: together against one layout, and set together.
function sizeDashWidgetSpan(card, height, rowUnit, gap) {
  return `span ${Math.max(1, Math.ceil((height + gap) / (rowUnit + gap)))}`;
}

function sizeDashWidgets() {
  const grid = $("dash-grid");
  if (!grid) return;
  const styles = getComputedStyle(grid);
  const rowUnit = Number.parseFloat(styles.getPropertyValue("grid-auto-rows")) || 8;
  const gap = Number.parseFloat(styles.rowGap) || 16;
  const cards = [...grid.querySelectorAll(".dash-widget")];
  // Measure the cards' natural heights, not their grid-constrained ones.
  for (const card of cards) card.style.gridRowEnd = "span 1";
  const heights = cards.map((card) => card.getBoundingClientRect().height);
  cards.forEach((card, i) => {
    card.style.gridRowEnd = sizeDashWidgetSpan(card, heights[i], rowUnit, gap);
  });
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

// --- the dashboard's menu: everything one press away (INBOX 436) -------------
//
// Six bands stood between the hero and the first widget at 1440, 462px of
// them (`scratchpad/ui-sweeps/dash436.js`): the search, Start something, Jump
// to, Run a skill, four stat tiles and a sparkline, and a "Your dashboard"
// bar. Two stay: the search, now with the page's one menu beside it, and the
// Start something tiles, which the owner asked to keep as they are. Jump to,
// Run a skill and the layout bar are that menu's groups (`dashMoreItems`); the
// stat tiles' figures are the hero's line, the status bar and three widgets.
//
// Anything targeting the Notes tab must name its sub-tab: the tab remembers
// the last of capture, ask and browse, so "switchTab('notes') then focus"
// only works if it was left on the right one (an audit found New note failing
// from two of the three).
//
//: **"Ask" goes where a question can be answered today** (INBOX 266 part 1).
//: Both of the dashboard's asking doors went to the Chat tab, and with no
//: model running the Chat composer is disabled (`data-needs-model`): driven
//: from a fresh load (`scratchpad/ui-sweeps/clicks.js`), "Ask AI" landed on a
//: greyed box with the caret nowhere, and the empty notebook's "Ask your
//: notebook" card promised "Works on keywords even with no AI running" and
//: then opened the one place that does not. Notes, Ask is the place that
//: does: it searches without a model and says so. So the door picks: Chat
//: when a model is up, Notes, Ask when it is not, and the caret goes into
//: whichever box is shown after the tab has finished arriving (`switchTab`
//: awaits the tab's module before its own focus handling, so a same-turn
//: `focus()` could land on a page that is not drawn yet).
async function openAskFromDashboard() {
  const offline = aiIsOff();
  await switchTab(offline ? "notes" : "chat");
  if (offline) {
    showNotesSection("ask");
    $("question")?.focus();
  } else {
    $("chat-input")?.focus();
  }
}

//: **Quick access's default five** (they were the "Start something" tiles):
//: what you can begin from here, each a verb with a line saying what happens.
//: The first of them carries the highlight (`quickTintKey`). The `id`s are what the stored list
//: (`dashboard_quick_access`) holds; the person's own choices are added from
//: the command palette's catalogue (`quickCatalogue`), never typed in here.
const QUICK_ACCESS_MAX = 8;
const QUICK_START = [
  {
    id: "new-note",
    icon: "ph:pencil-simple",
    label: "New note",
    hint: "Atlas files it for you",
    run: () => startNewNote(),
  },
  {
    id: "ask-ai",
    icon: "ph:chat-circle",
    label: "Ask AI",
    hint: "Answered from your notes",
    run: () => openAskFromDashboard(),
  },
  { id: "sketch", icon: "ph:palette", label: "Sketch", hint: "Draw, then keep it as a note", run: () => openSketch() },
  {
    id: "remind-me",
    icon: "ph:alarm",
    label: "Remind me",
    hint: "Say when, in plain words",
    run: () => {
      switchTab("reminders");
      $("reminder-magic").focus();
    },
  },
  //: **A meeting, not a recorder** (INBOX 644: "tucked away"). This tile
  //: opened the recorder, a dialog whose one control is Record, so the
  //: everyday case, notes typed in a meeting, was five clicks through a
  //: template. It starts a meeting note now; recording is inside it. The id
  //: stays, so a saved Quick access keeps its tile.
  {
    id: "meeting-notes",
    icon: "ph:users-three",
    label: "New meeting",
    hint: "Agenda, notes, action items",
    run: () => openNewMeeting(),
  },
];

//: What the tab bar cannot do: open the features browser and the command
//: palette (findable only by already knowing Ctrl+K; a row is how you learn
//: a shortcut). Every tab is one click away in the tab bar.
const QUICK_GO = [
  { icon: "ph:toolbox", label: "Tools & features", hint: "Everything the app can do, searchable", run: () => openFeatures() },
  { icon: "ph:command", label: "Commands", hint: "The command palette (Ctrl+K)", run: () => openPalette() },
];

//: How many recently-run skills get a row in the menu. Two: a skill you ran
//: once last month is not quick access to anything.
const QUICK_SKILL_SLOTS = 2;

//: Skills that have actually been run, most recent first. Written by
//: `startSkill`, so it covers both the dropdown and a run the agent started
//: itself (§33): if the model keeps reaching for a skill, that is evidence it
//: belongs on the dashboard too.
const RECENT_SKILLS_KEY = "recentSkills";

//: When each of them was last run, name to ISO timestamp. A second key rather
//: than a richer `recentSkills`, and that is deliberate: the list is written
//: by three call sites and read by two, and a profile that has run a skill
//: already has an array of plain strings on disk. Changing that shape in
//: place means a migration, and the last time this list changed shape without
//: one it left a `null` in every affected profile that broke the whole
//: dashboard on load (see `noteSkillRun`). A separate map has no old shape to
//: be wrong about: a name that is missing from it simply has no time to show.
const SKILL_RUN_TIMES_KEY = "recentSkillTimes";

function skillRunTimes() {
  try {
    const stored = prefs.json(SKILL_RUN_TIMES_KEY, {});
    return stored && typeof stored === "object" && !Array.isArray(stored) ? stored : {};
  } catch {
    return {};
  }
}

function noteSkillRun(name) {
  // **Refuse a nameless run rather than storing it.** This guard exists
  // because the absence of it cost the whole dashboard, and the failure is
  // worth recording in full because nothing about it is visible at this line.
  //
  // §88.0 fixed a call site that read `startSkill(skill.name)` where an object
  // was expected. While that bug was live, `skill` was a *string*, so
  // `skill.name` was `undefined`, and this function was called with it. That
  // alone would have been harmless, but `JSON.stringify` converts `undefined`
  // inside an array to **`null`**, so what landed in localStorage was a real
  // `null` element, not a missing one. Fixing the call site stopped new poison
  // and did nothing about the `null` already written, which persists across
  // every reload, forever, in any profile that ran a skill during that window.
  //
  // The damage then surfaced nowhere near here: `recentSkillLinks` below
  // reads that array on every dashboard render, and `withoutLeadingEmoji`
  // calls `.replace()` on the `null`. That throw propagated out of
  // the quick links -> `renderDashboard` -> `refreshActiveTab`, i.e. it
  // escaped *before* `grid.replaceChildren()` and the widget loop had run, so
  // the reported symptoms were "the dashboard widgets are completely broken"
  // and a toast reading "Couldn't load this tab: Cannot read properties of
  // null (reading 'replace')", two reports, one cause, neither of them
  // pointing at the skills feature that actually caused it.
  //
  // The shape CLAUDE.md names: a value that is invalid where it is *used*,
  // not where it is *set*, does its damage nowhere near the code at fault.
  if (typeof name !== "string" || !name) return;
  let recent = [];
  try {
    recent = prefs.json(RECENT_SKILLS_KEY, []);
  } catch {
    recent = [];
  }
  recent = [name, ...recent.filter((n) => n !== name)].slice(0, 8);
  localStorage.setItem(RECENT_SKILLS_KEY, JSON.stringify(recent));
  // The time goes in beside it, pruned to the names still on the list so the
  // map cannot grow forever in a profile that tries a lot of skills.
  const times = skillRunTimes();
  times[name] = new Date().toISOString();
  for (const key of Object.keys(times)) {
    if (!recent.includes(key)) delete times[key];
  }
  localStorage.setItem(SKILL_RUN_TIMES_KEY, JSON.stringify(times));
}

//: A skill's name usually starts with its own emoji, "stethoscope Notebook health
//: check", "tag Clean up my tags", and the quick-link then put Skill in front of
//: it, so those two chips wore two icons each while every other chip in the
//: row wore one. Reported as clutter, and it was: measured at 224px and 216px
//: against 107–169px for the fixed chips, i.e. the two least important buttons
//: in the row were the two widest.
//:
//: The Skill is the one that stays, because it carries what the row does not
//: otherwise say: this chip *runs* something rather than opening a page. The
//: skill's own emoji is still on it everywhere skills are listed.
const LEADING_EMOJI = /^(\p{Extended_Pictographic}(?:️|‍\p{Extended_Pictographic})*)\s*/u;

function withoutLeadingEmoji(name) {
  // `String(...)` rather than a bare `.replace`: this is the line that threw
  // for every profile carrying the poisoned `recentSkills` entry described in
  // `noteSkillRun`, and it took the whole dashboard down with it. The write
  // guard and the read filter below both prevent that now, so this coercion is
  // the third of three, but it is the cheapest, and it is the one standing
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
    recent = prefs.json(RECENT_SKILLS_KEY, []);
  } catch {
    return [];
  }
  if (!Array.isArray(recent)) return [];
  // **This filter is the repair, not just a guard.** The write side is fixed,
  // but a profile that ran a skill while the §88.0 bug was live already has a
  // `null` on disk and would keep crashing its own dashboard on every load
  // forever: a fix that only prevents new bad data would leave exactly the
  // people who hit the bug still broken. Rewriting the cleaned list back means
  // one load repairs the profile permanently.
  const clean = recent.filter((n) => typeof n === "string" && n);
  if (clean.length !== recent.length) {
    localStorage.setItem(RECENT_SKILLS_KEY, JSON.stringify(clean));
  }
  const times = skillRunTimes();
  return clean.slice(0, QUICK_SKILL_SLOTS).map((name) => ({
    icon: "ph:lightning",
    label: withoutLeadingEmoji(name),
    // **What the row was missing**, INBOX 60: a skill pill said only its own
    // name, so the row could not answer "did I already run this today?",
    // which is the question you ask before spending a model call. The other
    // two groups carry a hint each and this one carried none.
    hint: times[name] ? `Last run ${relativeTime(times[name])}` : "Not run yet on this device",
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

//: **How much of the dashboard is chrome, as the reader's choice.**
//:
//: INBOX 270, the owner: *"is there a way to declutter the dashboard a bit or
//: spread things out a bit?? idk it looks good but a lot is happening on it.
//: maybe something like the feed layout options with msn on microsoft bing??"*
//:
//: Measured from their screenshot at 1440 wide: five Start something tiles,
//: four Jump to pills, three skill chips, four stat tiles and a sparkline, and
//: then the "Your dashboard" heading. Six bands of chrome above the first
//: widget, which is the thing the page is named after.
//:
//: Three densities rather than a slider, the shape MSN's Feed layout uses and
//: the shape a person can hold in their head: Full is what shipped, Compact
//: folds the same things smaller, Focused shows the search and the widgets and
//: puts the rest one press away. **Nothing is deleted by any of them**: a
//: layout choice that removes a feature is a feature somebody cannot find
//: again, and this app has been told before what that costs.
//:
//: Per device, in `localStorage`, beside the layout itself rather than in
//: preferences: which density suits this screen is a fact about this screen.
const DASH_DENSITIES = ["full", "compact", "focused"];
const DASH_DENSITY_KEY = "dash-density";

function dashDensity() {
  const saved = prefs.get(DASH_DENSITY_KEY, null);
  return DASH_DENSITIES.includes(saved) ? saved : "full";
}

//: **The emblem is the hero's art, and art is what a density step spends**
//: (INBOX 279). The first cut of the three levels hid the mark outright at the
//: first step down and then kept a display-sized clock beside a greeting it had
//: cut to `--text-lg`, which is how the hero came to "lose a lot" at Compact
//: while Focused kept a bigger banner than Compact had.
//:
//: A size rather than a CSS rule because the mark is a p5 sketch drawn into a
//: canvas of that many pixels: scaling the holder would either leave a 46px box
//: around a 30px drawing or resample the canvas. 0 means the level does not
//: carry it at all, and the CSS hides the holder to match.
const DASH_EMBLEM_SIZE = { full: 46, compact: 30, focused: 0 };

//: **The dashboard has drawn its banner at least once.** Set by the render,
//: read by the density switch, because the switch used to ask whether a canvas
//: was already in the holder instead, and that question answers "no" for the
//: one case it exists to serve: Focused empties the holder, so switching back
//: to Full or Compact found no canvas, skipped the repaint, and the mark was
//: gone for good (the owner, 2026-09-21: "the animated logo is gone from the
//: dashboard, it should be in both the full and compact dashboard view and
//: shouldnt dissappear permanently").
let dashEmblemDrawn = false;

function paintDashEmblem() {
  const holder = $("dash-hero-emblem");
  if (!holder) return;
  dashEmblemDrawn = true;
  const size = DASH_EMBLEM_SIZE[dashDensity()] ?? DASH_EMBLEM_SIZE.full;
  //: A sketch drawn into a hidden holder measures zero (the holder is
  //: `display: none` at Focused), so the level that does not carry the mark
  //: does not draw one either; switching back re-enters through
  //: `applyDashDensity` below.
  if (!size) {
    holder.replaceChildren();
    return;
  }
  //: A face instead of the logo when Appearance asks (avatars.js).
  const face = dashboardMarkSeed();
  if (face) {
    //: The logo's sketch stops first: a p5 loop on a canvas that is no
    //: longer in the page still draws every frame.
    const sketch = typeof emblemInstances !== "undefined" ? emblemInstances.get(holder) : null;
    if (sketch) {
      sketch.remove();
      emblemInstances.delete(holder);
      emblemObservers?.get(holder)?.disconnect();
      emblemObservers?.delete(holder);
    }
    holder.replaceChildren(nameMarkLive(face, size));
    return;
  }
  holder.querySelector(".nm-live")?.remove();
  renderEmblem(holder, size, { animate: true });
}

//: **The mark chooses itself where it is** (the owner: "I want to be able to
//: right click the dashboard widget and be able to change it between atlas,
//: my own avatar, the dashbaord persona avatar, or the animated app logo").
//: The same four choices as Appearance, Dashboard mark, and the same write:
//: the stored choice, the select kept in step, the mark redrawn. The menu is
//: the recipe's (`openMenuAtPoint`, markdown.js), with a hold as its twin on
//: touch (`wireLongPress`), like every right-click menu in the app.
const DASH_MARK_CHOICES = [
  ["logo", "The app's logo"],
  ["atlas", "Atlas"],
  ["me", "Your face"],
  ["persona", "The greeting's persona"],
];

function dashMarkMenu(x, y) {
  const now = typeof appearancePref === "function" ? appearancePref("dash-mark", "logo") : "logo";
  const items = DASH_MARK_CHOICES.map(([value, label]) => ({
    label: `${now === value ? "ph:check" : "ph:dot-outline"} ${label}`,
    title: `Show ${label.toLowerCase()} here`,
    run: () => {
      try {
        localStorage.setItem("dash-mark", value);
      } catch {
        // This session only.
      }
      const select = document.getElementById("dash-mark");
      if (select) select.value = value;
      paintDashEmblem();
    },
  }));
  openMenuAtPoint(items, "Dashboard mark", x, y);
}

{
  const holder = document.getElementById("dash-hero-emblem");
  if (holder) {
    holder.addEventListener("contextmenu", (event) => {
      event.preventDefault();
      dashMarkMenu(event.clientX, event.clientY);
    });
    wireLongPress(holder, (event, point) => dashMarkMenu(point.x, point.y));
  }
}

function applyDashDensity(value, { persist = true } = {}) {
  const density = DASH_DENSITIES.includes(value) ? value : "full";
  //: Stored only when chosen: the wiring's own first call used to write
  //: "full" for every install, which made the default look like a choice.
  if (persist) localStorage.setItem(DASH_DENSITY_KEY, density);
  const page = document.getElementById("tab-dashboard");
  //: A data attribute on the page, and every rule keyed off it in CSS. The
  //: alternative, adding and removing classes on six elements from here, is
  //: how one of them ends up in the wrong state after a render that rebuilt
  //: it: the attribute survives, a class on a replaced node does not.
  //:
  //: **Full at the app's Compact density is the compact dashboard**
  //: (WORLD_CLASS_PLAN 22.1 item 2). The app's density is the instruction
  //: "less air everywhere", and on a window 700px tall or less it is Compact
  //: by default (`effectiveDensity`, settings.js): measured at 1093x614 the
  //: first widget started 32px under the fold with the hero, the Start
  //: something tiles and the stats at full size. Focused stays Focused.
  const appCompact = document.documentElement.dataset.density === "compact";
  if (page) page.dataset.density = density === "full" && appCompact ? "compact" : density;
  //: The mark is the one part of the banner CSS cannot resize (see
  //: `DASH_EMBLEM_SIZE`), so the level change redraws it, but only once the
  //: dashboard has drawn one: this function also runs at wiring time, before
  //: the first render, and drawing there would race the render's own call.
  if (page && dashEmblemDrawn) paintDashEmblem();
}

//: Once: the level is applied to the page before the first render reads it.
//: The choice itself is a row of the menu (`dashMoreItems`), which applies it
//: and rebuilds the menu so its tick moves.
function wireDashDensity() {
  if (wireDashDensity.done) return;
  wireDashDensity.done = true;
  applyDashDensity(dashDensity(), { persist: false });
}

//: **A tile's highlight** (INBOX 589, the owner: "only the new note link
//: widget is a different colour. should the one in the first position be
//: highlighted by default with the option to highlight the others other
//: colours too??"). The key a tile is painted with: a choice the person made
//: (`dashboard_quick_tints`, tile id to "accent", "none" or a
//: `CATEGORY_PALETTE` key; set from the tile's menu while arranging) wins;
//: without one, the first tile is the accent and the rest are plain. By
//: position, not by name: whatever is put first is where the eye starts, so
//: New note moved to third is no longer the row's suggestion. "" is plain.
function quickTintKey(id, index, tints) {
  const chosen = tints && typeof tints === "object" ? tints[id] : undefined;
  if (chosen === "none") return "";
  if (chosen === "accent" || Object.hasOwn(CATEGORY_PALETTE, chosen ?? "")) return chosen;
  return index === 0 ? "accent" : "";
}

//: A tint key as the colour CSS mixes from, and the colour its icon takes:
//: the accent's icon is `--accent-text` (the accent itself is a fill colour
//: and can sit under 3:1 on the card), a palette hue is its own icon, since
//: each of the twelve clears 3:1 as a mark on both themes' grounds.
function quickTintColours(key) {
  if (key === "accent") return ["var(--accent)", "var(--accent-text)"];
  const hex = CATEGORY_PALETTE[key];
  return [hex, hex];
}

function quickLinkButton(link, tint = "") {
  const button = document.createElement("button");
  button.className = "quick-link quick-action";
  if (tint) {
    const [fill, ink] = quickTintColours(tint);
    button.classList.add("quick-link-tinted");
    button.dataset.tint = tint;
    button.style.setProperty("--quick-tint", fill);
    button.style.setProperty("--quick-tint-ink", ink);
  }
  button.type = "button";
  // The label truncates in a narrow tile, so hovering finishes the sentence.
  button.title = link.hint || link.label;
  const icon = document.createElement("span");
  icon.className = "quick-link-icon";
  setLabel(icon, link.icon);
  icon.setAttribute("aria-hidden", "true");
  const text = document.createElement("span");
  text.className = "quick-link-text";
  const label = document.createElement("span");
  label.className = "quick-link-label";
  setLabel(label, link.label);
  const hint = document.createElement("span");
  hint.className = "quick-link-hint";
  setLabel(hint, link.hint);
  text.append(label, hint);
  button.append(icon, text);
  button.addEventListener("click", () => link.run());
  return button;
}

//: **Quick access** (INBOX 461; the owner of the Start something row: "make
//: this a quick access section ... what is there can be default"). Up to
//: `QUICK_ACCESS_MAX` tiles, the same five as before until the person
//: arranges them. A tile is one of `QUICK_START` or a command from the
//: palette's own registry (`paletteCommands`, settings-panes.js): any row that
//: declares a `tab` or `reveal` has a stable key (`tab:x`, `reveal:x`) and the
//: one line it already says about itself, so nothing here is a second list of
//: what the app can do. A key that no longer names a command is dropped, and a
//: list that resolves to nothing is the default five.
function quickCatalogue() {
  const out = new Map();
  const abouts = paletteAbouts();
  let rows = [];
  try {
    rows = paletteCommands();
  } catch {
    // A command that cannot be built must not take the dashboard with it.
  }
  for (const row of rows) {
    const key = row.keys ? "" : row.tab ? `tab:${row.tab}` : row.reveal ? `reveal:${row.reveal}` : "";
    const parts = key && paletteRowParts(row, abouts);
    if (parts && parts.about && !out.has(key)) out.set(key, { id: key, icon: parts.icon.replace(/^(ph:)?/, "ph:"), label: parts.label, hint: parts.about, run: row.run });
  }
  return out;
}

function quickAccessItems(saved, catalogue) {
  const links = [];
  for (const id of Array.isArray(saved) ? saved : []) {
    const link = QUICK_START.find((l) => l.id === id) || catalogue.get(id);
    if (link && !links.includes(link)) links.push(link);
  }
  return (links.length ? links : QUICK_START).slice(0, QUICK_ACCESS_MAX);
}

async function saveQuickAccess(ids) {
  prefsCache = await apiJson("/preferences", { method: "PUT", body: JSON.stringify({ dashboard_quick_access: ids }) }).catch(() => prefsCache);
}

function quickTints() {
  const tints = prefsCache?.dashboard_quick_tints;
  return tints && typeof tints === "object" ? tints : {};
}

//: One tile's highlight, saved; `""` forgets the choice (the position's
//: default again). Ids no longer on the row are pruned on the way, so the
//: stored map never outlives the tiles it was for.
async function saveQuickTint(id, key) {
  const on = new Set(quickAccessCurrent().map((link) => link.id));
  const next = Object.fromEntries(Object.entries(quickTints()).filter(([tile]) => on.has(tile) && tile !== id));
  if (key) next[id] = key;
  await saveQuickTints(next);
}

async function saveQuickTints(tints) {
  prefsCache = await apiJson("/preferences", { method: "PUT", body: JSON.stringify({ dashboard_quick_tints: tints }) }).catch(() => prefsCache);
}

//: True while the row is being arranged: the editing view and its picker are
//: quick-access.js (lazy: only a person who customises pays for it).
let quickEditing = false;

function quickAccessCurrent() {
  return quickAccessItems(prefsCache?.dashboard_quick_access, quickCatalogue());
}

function renderQuickLinks() {
  const box = $("dash-quicklinks");
  if (!box) return;
  if (quickEditing) return quickAccessEdit();
  const heading = document.createElement("p");
  heading.className = "launch-label";
  heading.textContent = "Quick access";
  const head = document.createElement("div");
  head.className = "launch-head";
  head.append(heading);
  const row = document.createElement("div");
  row.className = "launch-row launch-row-start";
  const tints = quickTints();
  quickAccessCurrent().forEach((link, index) => row.appendChild(quickLinkButton(link, quickTintKey(link.id, index, tints))));
  const group = document.createElement("div");
  group.className = "launch-group";
  group.append(head, row);
  box.replaceChildren(group);
}

//: **The note you were last in**, the menu's Continue row (INBOX 60). Most
//: recently *touched*, where touching is opening or editing, and not created.
//: Reported: "the opens a note you opened or edited most recently button
//: doesnt update and just shows my latest note". It ranked on `updated_at`
//: alone, which only moves when the text changes, so reading an old note left
//: it pointing at whatever was newest. `last_opened_at` is stamped by
//: `GET /entries/{id}` beside the access count (routes_entries), and the row
//: takes whichever of the three is latest: null for every note nobody has
//: opened since the column existed, which is why this is a max and not a
//: preference.
function dashContinueNote(entries) {
  if (!Array.isArray(entries)) return null;
  const touched = (entry) => {
    const times = [entry.last_opened_at, entry.updated_at, entry.created_at]
      .map((value) => (value ? new Date(value).getTime() : 0))
      .filter((value) => Number.isFinite(value));
    return Math.max(0, ...times);
  };
  return [...entries].filter((entry) => entry && !entry.is_draft).sort((a, b) => touched(b) - touched(a))[0] || null;
}

const DASH_VIEW_LABELS = { full: "Full", compact: "Compact", focused: "Focused" };

//: **What the first screen used to spell out in bands, one press away.** Three
//: groups, drawn as hairlines (`kebabMenu`'s `group`): go back to the last
//: note, run a skill, find a feature. Fixed order, no use counter: a menu
//: whose rows move is a menu you re-read. Arranging the page is Customise.
function dashMoreItems(entries) {
  const row = (link, group) => ({ label: `${link.icon} ${link.label}`, title: link.hint || link.label, group, run: link.run });
  const items = [];
  const last = dashContinueNote(entries);
  if (last) {
    // Cut at a word with an ellipsis: a bare slice ended on "responds to the
    // blu", which reads as a typo rather than as more text.
    const preview = clipText(notePreviewText(last.content || ""), 36) || "your last note";
    items.push({
      label: `ph:arrow-u-up-left Continue: ${preview}`,
      title: "Opens the note you opened or edited most recently",
      group: "resume",
      run: () => flashEntry(last.id),
    });
  }
  for (const link of recentSkillLinks()) {
    // The full name is in the title; the row says when it last ran, which is
    // the question asked before spending a model call (INBOX 60).
    items.push({ ...row(link, "skills"), title: `Run the skill \u201c${link.skillName}\u201d: it answers in the chat. ${link.hint}` });
  }
  items.push({ label: "ph:lightning All skills\u2026", title: "Every skill, in the chat's skill picker", group: "skills", run: () => switchTab("chat") });
  for (const link of QUICK_GO) items.push(row(link, "find"));
  return items;
}

//: **Arranging the page is its own control, beside the ⋯** (INBOX 488, the
//: owner: "confusing to have the widget management stuff in the meatball menu
//: button above the meatball menu button which covers the quick access"). The
//: ⋯ is for doing (Continue, skills, Tools & features, Commands); Customise is
//: for arranging this page (view, widgets, layout and the Quick access row,
//: whose own ⋯ it replaces), so one menu no longer opens over the other.
//: Below 600 the view is not offered: a phone's Full is already compact.
function dashCustomiseItems() {
  const items = [];
  if (!window.matchMedia("(max-width: 599.98px)").matches) {
    const current = dashDensity();
    items.push({
      label: "ph:layout View",
      group: "page",
      items: DASH_DENSITIES.map((value) => ({
        label: `${current === value ? "ph:check" : "ph:dot-outline"} ${DASH_VIEW_LABELS[value]}`,
        title: `Show the dashboard ${DASH_VIEW_LABELS[value].toLowerCase()}`,
        run: () => {
          applyDashDensity(value);
          renderDashMore();
        },
      })),
    });
  }
  items.push({ label: "ph:squares-four Widgets\u2026", title: "Add, remove or widen any widget", group: "page", run: () => $("dash-widgets-open").click() });
  items.push({
    label: dashEditMode ? "ph:check Done editing" : "ph:arrows-out-cardinal Edit layout",
    title: "Move, widen and remove the widgets on this page",
    group: "page",
    run: () => $("dash-edit").click(),
  });
  items.push({ label: "ph:pencil-simple Edit quick access", title: "Add, remove and reorder the Quick access tiles", group: "quick", run: () => { quickEditing = true; renderQuickLinks(); } });
  //: The colours alone, keeping the tiles (INBOX 603, the owner: "reset the
  //: highlights on the quick access back to default or at least the first
  //: one being auto highlighted"). Only when one has been chosen.
  if (Object.keys(prefsCache?.dashboard_quick_tints || {}).length) {
    items.push({
      label: "ph:palette Reset highlights",
      title: "No colours chosen: the first tile is highlighted again",
      group: "quick",
      run: async () => { await saveQuickTints({}); renderQuickLinks(); renderDashMore(); },
    });
  }
  items.push({
    label: "ph:arrow-counter-clockwise Reset quick access",
    title: "Back to New note, Ask AI, Sketch, Remind me and New meeting, the first highlighted",
    group: "quick",
    run: async () => { await saveQuickAccess([]); await saveQuickTints({}); renderQuickLinks(); },
  });
  return items;
}

//: Built at once from what is loaded, so the row never waits on a fetch and
//: the dock never shifts, then again when a cold start's notes arrive (the
//: Continue row is the only part that needs them).
let dashMoreSerial = 0;
async function renderDashMore() {
  const host = $("dash-more");
  if (!host) return;
  const serial = ++dashMoreSerial;
  const custom = $("dash-customise");
  if (custom) {
    const menu = kebabMenu(dashCustomiseItems(), "Customise the dashboard");
    const opener = menu.querySelector("button");
    //: The word in its own span so a phone can keep only the glyph.
    setLabel(opener, "ph:sliders-horizontal");
    const word = document.createElement("span");
    opener.querySelector("i")?.classList.add("ph-lead");
    word.className = "dock-word";
    word.textContent = "Customise";
    opener.append(word);
    opener.classList.remove("icon-only");
    opener.classList.add("ghost");
    custom.replaceChildren(menu);
  }
  const build = (entries) => host.replaceChildren(kebabMenu(dashMoreItems(entries), "More actions"));
  build(entriesEverLoaded ? allEntries : []);
  if (entriesEverLoaded) return;
  const entries = await dashEntries().catch(() => []);
  if (serial === dashMoreSerial && host.isConnected) build(entries);
}

// --- the "everything this app does" browser ----------------------------------
// Grouped, searchable, and every entry either jumps you there or explains
// itself: the fastest way to discover features you didn't know existed.
function featureCatalog() {
  return [
    { group: "Capture & notes", items: [
      { name: "Capture a thought", desc: "Save anything; Atlas files it into a category and suggests tags.", reveal: "notes-capture" },
      { name: "Templates", desc: "Start a note from a prefilled shape (journal, recipe, meeting…).", reveal: "notes-template" },
      { name: "Improve writing", desc: "Proofread, rewrite, or condense a note with AI before saving.", reveal: "notes-improve" },
      // The writing room is a sub-tab of Notes and was in the palette but in
      // no catalogue row, which is the shape this audit was for: a surface
      // that shipped, got a command, and never got its line in the list of
      // what the app can do.
      { name: "Writing room", desc: "Turn rough thoughts into a drafted note, section by section.", reveal: "writing-room" },
      { name: "Sketch pad", desc: "Draw something and save it as a note with a caption.", reveal: "sketch" },
      { name: "Dictation", desc: "Speak a note; transcribed locally with Whisper.", reveal: "notes-dictation" },
      { name: "New meeting", desc: "A meeting note: when, who, agenda, notes, decisions and action items.", reveal: "meeting-new" },
      { name: "Record a meeting", desc: "Transcribe a meeting or lecture as it happens, saved as a meeting note.", reveal: "meeting" },
      { name: "Attachments", desc: "Attach files and images to any note.", reveal: "notes-attach" },
      // Beside Attachments, which is the entry a person who has files in the
      // notebook is already reading. Asked for directly: "I want an easier and
      // more accessible way to access the ocr workspace as a proper and more
      // central feature." This browser and the command palette are the app's
      // two answers to that, and the reader had been in neither.
      { name: "Page reader", desc: "Open a PDF or picture beside the text read from it, page by page.", reveal: "page-reader" },
      { name: "Threads", desc: "Continue a thought to build a train of related notes.", reveal: "notes-thread" },
      { name: "Note links", desc: "Type [[ to point one note at another; the link works both ways.", reveal: "notes-capture" },
      { name: "Checklists", desc: "Tick items off inside a note; the dashboard tracks what is left.", reveal: "notes-checklist" },
      { name: "Private notes", desc: "Encrypt a note so it is readable only while the app is unlocked.", reveal: "notes-private" },
      { name: "Pins & tags", desc: "Pin important notes and organise with tags.", reveal: "notes-favourite" },
      { name: "Bin", desc: "Deleted notes, documents and reminders are recoverable until the bin is cleared.", reveal: "recycle-bin" },
    ]},
    { group: "Ask & chat", items: [
      { name: "Ask your notebook", desc: "Questions answered strictly from your own notes.", reveal: "notes-ask" },
      { name: "Chat", desc: "A full conversation with your notebook, saved and resumable.", reveal: "chat-input" },
      { name: "Attach to a message", desc: "Point a message at notes, documents, files, images or a map you already have.", reveal: "chat-attach" },
      { name: "Saved conversations", desc: "Every chat is kept, searchable, and can be picked up later.", reveal: "chat-conversations" },
      { name: "Personas", desc: "Change the voice Atlas writes in: its own, Coach, Analyst, or yours.", reveal: "settings:personas" },
      { name: "Skills", desc: "One-click requests like “Summarise my week”; can act on your notes.", reveal: "settings:skills" },
      { name: "Agent mode", desc: "Let Atlas use its tools, search your notes, open a page, create, tag, link and organise.", reveal: "chat-agent-mode" },
      // The popup agent has the same capability as Chat's agent mode and is
      // reachable from every tab, which is exactly why it needs a row: a chord
      // nobody has been told about is not a feature anyone has.
      { name: "Ask from anywhere", desc: "Ctrl+Shift+A opens Atlas over whatever you are working on.", reveal: "agent-palette" },
      { name: "What it remembers", desc: "See and edit the facts Atlas has kept about you.", reveal: "settings:memory" },
      { name: "Web search", desc: "Opt-in, off by default: one of the two features that can go online.", reveal: "chat-web-search" },
      { name: "Export chat", desc: "Download a conversation as Markdown.", reveal: "chat-export" },
      { name: "Search relevance", desc: "How strict semantic search is about what counts as a real match.", reveal: "set-search-relevance" },
    ]},
    // **Documents had no rows at all**, and the editor is one of the largest
    // surfaces in the app: blocks, an outline, breadcrumbs, a spelling and
    // style check with its own dictionary, tables, properties, block links and
    // embeds, version history. Every row below opens the control it names on
    // the newest document (`revealDocument`, app.js), and with no document at
    // all it rings New document instead: a document-scoped action with no
    // document open is a row that would otherwise do nothing.
    { group: "Documents", items: [
      { name: "New document", desc: "Long-form writing in Markdown, with live formatting as you type.", reveal: "doc-new" },
      { name: "Document templates", desc: "Start from a prefilled document instead of a blank page.", reveal: "doc-templates" },
      { name: "Blocks and the “/” menu", desc: "Type / for headings, quotes, callouts, tables, columns and embeds.", reveal: "doc-insert" },
      { name: "Outline", desc: "Every heading as a list you can jump around by, marking where you are.", reveal: "doc-outline" },
      { name: "Breadcrumbs", desc: "The heading trail above the text says where in the document the caret is.", reveal: "doc-crumbs" },
      { name: "Find and replace", desc: "Search the document, step through matches, replace one or all.", reveal: "doc-find" },
      { name: "Focus mode", desc: "Hide everything but the text you are writing.", reveal: "doc-focus" },
      { name: "Document properties", desc: "Title, tags and your own fields, stored as front matter at the top.", reveal: "doc-properties" },
      { name: "Tables", desc: "Build and edit Markdown tables without counting pipes.", reveal: "doc-tables" },
      { name: "Block links and embeds", desc: "Link or quote a single paragraph from anywhere, by its own short id.", reveal: "doc-insert" },
      { name: "Backlinks", desc: "What points at this document, from notes, maps, chats and other documents.", reveal: "doc-connections" },
      { name: "Spelling and style", desc: "Findings in the margin for spelling, repeated words and clumsy phrasing.", reveal: "doc-prose" },
      { name: "Your dictionary", desc: "Words you have taught it, so they stop being flagged everywhere.", reveal: "doc-dictionary" },
      { name: "Word goal", desc: "Set a target and watch the count, reading time and structure as you write.", reveal: "doc-word-goal" },
      { name: "Version history", desc: "Earlier saves of a document, with what changed, restorable.", reveal: "doc-history" },
      { name: "AI edit", desc: "Rewrite, shorten, translate or review a passage, with the change reviewable before it lands.", reveal: "doc-ai" },
      { name: "Export a document", desc: "Download it as Markdown, or print it to PDF with its formatting kept.", reveal: "doc-export" },
    ]},
    // Boards and maps were in the same position as Documents: built, reached
    // from the Library's own sub-tab, and mentioned nowhere in the list of
    // what the app does. A map is a board (see `createConceptMap`), so the two
    // share a group rather than pretending to be separate canvases.
    { group: "Boards, maps & drawing", items: [
      { name: "New board", desc: "A whiteboard of cards, drawings, images and links you arrange yourself.", reveal: "board-new" },
      { name: "Concept maps", desc: "A mind map made of real notes: branches, links and a reason on each connection.", reveal: "map-create" },
      { name: "Grow a map by keyboard", desc: "Tab adds a branch off the selected topic, Enter one beside it.", reveal: "map-keyboard" },
      { name: "Map templates", desc: "Start a map from a shape: a decision, a project, a subject to revise.", reveal: "map-templates" },
      { name: "Arrange as mind map", desc: "Re-tidy a sprawling board into a readable tree in one move.", reveal: "board-arrange" },
      { name: "Board overview", desc: "A miniature of the whole board, to see where you are and jump.", reveal: "board-overview" },
      { name: "Find a card", desc: "Search the board you are on and step through the matches.", reveal: "board-find" },
      { name: "The tool rail", desc: "Select, draw, shapes, text, links and images, grouped by what they do.", reveal: "board-tools" },
      { name: "Context bar", desc: "The properties of whatever is selected, above the selection itself.", reveal: "board-context" },
      { name: "Export a board", desc: "Save the board, or just what you selected, as an image.", reveal: "board-export" },
    ]},
    // The Library is the app's filing cabinet and had no rows either, which
    // left six sub-tabs of real surfaces undiscoverable from here.
    { group: "Library", items: [
      { name: "Everything in one place", desc: "Notes, chats, documents, files and boards in one list you can filter.", tab: "library" },
      { name: "Your documents", desc: "Every document, with its size, when you last touched it, and a preview.", reveal: "library-docs" },
      { name: "Images", desc: "Every picture in the notebook, with its caption and where it is used.", reveal: "library-images" },
      { name: "Files", desc: "PDFs and other files, with a first-page preview and what has been read from them.", reveal: "library-files" },
      { name: "Bookmarks", desc: "Bookmarks, grouped, with the page's own title and description.", reveal: "library-links" },
      { name: "AI skills", desc: "The skills you can run, what each one does, and how to add your own.", reveal: "library-skills" },
      { name: "Contents", desc: "A table of contents for the whole notebook, by category and tag.", reveal: "library-contents" },
      { name: "Where a file is used", desc: "Every file says which notes, documents and boards reference it.", reveal: "library-files" },
    ]},
    { group: "Map & discovery", items: [
      { name: "Graph view", desc: "Your notes as a network of links, threads and similarity.", tab: "graph" },
      { name: "Edit on the map", desc: "Click any node to edit its content and tags in place.", reveal: "graph-edit" },
      { name: "Physics controls", desc: "Gravity, Spread and Link force sliders reshape the layout; Reshuffle layout deals a new one.", reveal: "graph-physics" },
      { name: "Suggestions", desc: "Links to add, disagreements, names to merge and link types, decided one by one.", reveal: "suggestions" },
      { name: "Suggested links", desc: "Atlas proposes connections between related notes.", reveal: "graph-suggest" },
      { name: "People and things", desc: "Everyone and everything your notes name, each with its own page.", reveal: "entities" },
      { name: "Kinds of link", desc: "Say what a link is (Part of, Cites, your own), with its name from the other end.", reveal: "relation-types" },
      { name: "Note types", desc: "Meeting, Book, your own: a kind of note with its fields, kept at the top of each note.", reveal: "note-types" },
      { name: "Timeline", desc: "Everything you have made, in order, as a grid or a branching line.", tab: "timeline" },
      { name: "Zoom the timeline", desc: "By day, week, month or year, with a jump back to today.", reveal: "timeline-zoom" },
      { name: "Timeline bands", desc: "Group the timeline by category, tag or kind of thing.", reveal: "timeline-bands" },
      { name: "On this day", desc: "Notes you captured on this date in past months resurface.", reveal: "widget-on-this-day" },
      { name: "Related notes", desc: "See notes that mean something similar to the one you're reading.", reveal: "notes-related" },
      { name: "Find on this screen", desc: "Ctrl+F searches whatever tab you are looking at.", reveal: "global-find" },
    ]},
    { group: "Plan & focus", items: [
      { name: "Reminders", desc: "Due dates with priority, repeats, snooze and notifications.", tab: "reminders" },
      { name: "Magic add", desc: "Type “call mum tomorrow evening” and Atlas schedules it.", reveal: "reminder-magic" },
      { name: "Focus timer", desc: "Pomodoro-style timer with presets or your own minutes.", reveal: "widget-focus" },
      { name: "Weekly digest", desc: "An AI recap of everything you saved this week.", reveal: "widget-digest" },
      { name: "Tensions", desc: "Find where your notes contradict each other, a decision reversed, a date that moved.", reveal: "tensions" },
      // Resurfacing had shipped on two surfaces (the sort and the widget) and
      // was named on neither list.
      { name: "Forgotten first", desc: "Sort your notes by what is slipping out of reach: old, unlinked, unopened.", reveal: "notes-forgotten" },
      { name: "Rediscover", desc: "Three faded notes a day, with the reason each one surfaced.", reveal: "widget-rediscover" },
      { name: "Loose ends", desc: "How much of the notebook is connected, and the oldest notes that are not.", reveal: "widget-orphans" },
      { name: "Unfinished", desc: "Notes with checklist items still waiting to be ticked.", reveal: "widget-unfinished" },
      { name: "Writing pace", desc: "How many words you have written each day this fortnight.", reveal: "widget-pace" },
      { name: "Activity heatmap", desc: "A year of capture activity at a glance.", reveal: "widget-heatmap" },
      { name: "Streaks", desc: "How many days in a row you've captured something.", reveal: "widget-streak" },
    ]},
    { group: "Make it yours", items: [
      { name: "Theme", desc: "Light, dark, or follow your system.", reveal: "set-theme" },
      { name: "Accent colour", desc: "Presets or any custom colour you like.", reveal: "set-accent" },
      { name: "Typography & density", desc: "Font, text size, and how roomy the layout feels.", reveal: "set-typography" },
      { name: "Corner rounding & glass", desc: "Tune the shape and blur of every surface.", reveal: "set-radius" },
      { name: "Animated background", desc: "Aurora, constellations, blobs or particles behind the app.", reveal: "set-background" },
      { name: "A companion on screen", desc: "A small character that finds a free spot on each page and reacts to what you do.", reveal: "set-companion" },
      { name: "Your look", desc: "Shuffle the face drawn from your name, or choose its parts yourself.", reveal: "settings:preferences" },
      { name: "Accessibility", desc: "High-contrast mode and reduce-motion.", reveal: "set-contrast" },
      { name: "Custom CSS", desc: "For tinkerers: your own style overrides.", reveal: "set-custom-css" },
      { name: "Zoom the whole app", desc: "Ctrl with plus or minus scales every surface, and Ctrl+0 puts it back.", act: () => nudgeZoom(1) },
      { name: "Dashboard layout", desc: "Show, hide, reorder and widen widgets.", reveal: "dash-layout" },
      // Workspaces are the top-left control every tab is filtered by, and
      // nothing in either list said they existed.
      { name: "Workspaces", desc: "Keep work, study and home in separate notebooks that share one app.", reveal: "workspace-new" },
      { name: "Note templates", desc: "Edit the shapes a new note can start from, or write your own.", reveal: "settings:templates" },
    ]},
    { group: "Data & control", items: [
      { name: "Export", desc: "Download everything as JSON, Markdown or CSV.", reveal: "set-export" },
      { name: "Import markdown", desc: "Bring in notes from an Obsidian-style vault.", reveal: "set-import-md" },
      { name: "Backups", desc: "Snapshot your notebook and restore it later.", reveal: "set-backups" },
      { name: "Models", desc: "Choose the chat, utility, vision and reading models, and download more.", reveal: "settings:models" },
      { name: "Search and index", desc: "The search engine, the index it builds, and how strict a match must be.", reveal: "settings:searchindex" },
      { name: "AI tool permissions", desc: "Decide exactly what Atlas is allowed to do.", reveal: "settings:tools" },
      { name: "Background tasks", desc: "What the app is doing in the background, and what it has finished.", reveal: "settings:tasks" },
      { name: "Packages", desc: "The optional extras (OCR, speech, vision) and whether they are installed.", reveal: "settings:extras" },
      { name: "Account & security", desc: "Change your password, and what happens when the app locks.", reveal: "settings:account" },
      { name: "Where your data went", desc: "Every connection the app made, and whether anything left this computer.", reveal: "settings:privacy" },
      { name: "Logs", desc: "What the app and the models have been doing, in plain text.", reveal: "settings:logs" },
      { name: "Lock", desc: "Password-protect the app on shared devices.", act: () => lockNow() },
      { name: "Command palette", desc: "Ctrl/⌘-K to run a command or go to a place; its last row searches everything.", reveal: "palette" },
      { name: "Keyboard shortcuts", desc: "Press ? any time for the full list.", reveal: "shortcuts" },
      { name: "Help", desc: "How the parts of the app fit together, in the app itself.", reveal: "settings:help" },
      { name: "Updates", desc: "Which version you are on, and whether a newer one is out.", reveal: "set-updates" },
      { name: "Welcome tour", desc: "Replay the introduction to MemoryMap.", reveal: "onboarding" },
    ]},
    //: Each row declares where it goes (`tab`, `reveal` or `act`) and
    //: `catalogueRun` (settings-panes.js) makes the `run` the dialog calls, so every row
    //: lands on what it names (tests/test_catalogue_reveal.py).
  ].map((group) => ({ ...group, items: group.items.map(catalogueRun) }));
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
      group: "What Atlas can do for you",
      items: featureAiTools.map((tool) => ({
        name: tool.name.replace(/_/g, " "),
        desc: tool.description + (tool.destructive ? " (asks you to confirm first)" : ""),
        //: The tool's own row in Settings, ringed, not the top of the pane.
        reveal: "ai-tool",
        arg: tool.name,
      })).map(catalogueRun),
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
    none.textContent = "Nothing matches that: try another word.";
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

  const title = document.createElement("h2");
  //: Not "Your notebook is empty" again: the hero line above already says
  //: so, and the comma joined two sentences (INBOX 472, the first-run walk).
  title.textContent = "How MemoryMap works";

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
      note: "Anything at all: a half sentence is fine.",
      run: () => startNewNote(),
    },
    {
      icon: "ph:chat-circle",
      label: "Ask your notebook",
      note: "Works on keywords even with no AI running.",
      run: () => openAskFromDashboard(),
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
      //: The tour, not the welcome card. These are two different things and
      //: this tile used to run the wrong one: `openOnboarding` is the five
      //: slides that say what MemoryMap is, while the tour (tour.js) points
      //: at the real controls and says where they are. A tile that says
      //: "take the tour" and opens a slideshow teaches that the tour is a
      //: slideshow, and there was then no door to the tour on the dashboard
      //: at all. The welcome card keeps its own doors, both correctly
      //: worded: Settings, Help's "Replay the welcome" and the
      //: features browser's "Welcome tour" row.
      note: "Two minutes through what's here.",
      //: tour.js is a lazy file; `openTour` is a LAZY_ENTRY_POINTS stand-in
      //: (app.js), so it is always defined here and needs no guard.
      run: () => openTour("basics"),
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
    "Streaks, tags, a map of your notes and more appear here as you write.";

  //: No mark of its own (INBOX 436): the hero directly above already turns
  //: the app's emblem, and two turning marks on one screen is one too many.
  card.append(title, blurb, steps, footer);
  return card;
}

//: A widget that throws, or never draws, says so and offers Retry (INBOX
//: 513): a render that never settled left its body loading for good. Promise.resolve() so a
//: synchronous renderer cannot break the dashboard loop.
const WIDGET_STALL_MS = 20000;

function mountWidgetBody(widget, body) {
  const failed = (message) => {
    if (!body.isConnected) return;
    const note = document.createElement("p");
    note.className = "muted";
    note.textContent = message;
    const retry = smallButton("ph:arrow-clockwise Retry", "Load this widget again", () => {
      body.replaceChildren();
      mountWidgetBody(widget, body);
    });
    body.replaceChildren(note, retry);
  };
  //: **Skeleton rows while it loads, never the word** (INBOX 596, the owner:
  //: "some skeleton loaders are missing like on the dashboard"). An empty
  //: body read "Loading…"; now it holds DESIGN.md's list skeleton
  //: (`showSkeletons`), which goes the moment the widget draws anything of
  //: its own, so a widget that fills in steps never shows both.
  showSkeletons(body, 2);
  const waiting = new MutationObserver(() => {
    if ([...body.children].some((el) => !el.classList.contains("skeleton"))) unskeleton();
  });
  const unskeleton = () => {
    waiting.disconnect();
    clearSkeletons(body);
  };
  waiting.observe(body, { childList: true });
  let settled = false;
  const drawn = Promise.resolve()
    .then(() => widget.render(body))
    .then(() => { settled = true; unskeleton(); })
    .catch(() => { settled = true; unskeleton(); failed("Couldn't load this widget."); });
  setTimeout(() => {
    if (!settled && !body.querySelector(":scope > :not(.skeleton)")) {
      unskeleton();
      failed("This is taking longer than it should.");
    }
  }, WIDGET_STALL_MS);
  return drawn;
}

//: **Back on the dashboard, the last picture stays** (INBOX 602, the owner:
//: "every time I go off the dashboard and go back on it, it is empty for a
//: second then loads"). A visit redrew the grid from nothing and hid it
//: until its widgets settled: 10 frames with no dashboard, 491 to 998ms
//: after the switch at 4x CPU (`scratchpad/ui-sweeps/loading598.js`). When
//: the layout is the one already drawn, each widget draws again into a body
//: laid out beside the old one at its width, unseen, and takes its place
//: when it is done; until then the old one is what shows.
function refreshDashWidgets(grid) {
  const drawing = [];
  for (const card of grid.querySelectorAll(".dash-widget:not(.dash-hidden)")) {
    const widget = DASH_WIDGETS[card.dataset.widget];
    const old = card.querySelector(":scope > .dash-body");
    if (!widget || !old) continue;
    const next = document.createElement("div");
    next.className = "dash-body";
    Object.assign(next.style, { position: "absolute", top: "0", insetInline: "var(--card-pad-x)", visibility: "hidden", pointerEvents: "none" });
    card.style.position = "relative";
    card.appendChild(next);
    drawing.push(
      mountWidgetBody(widget, next).then(() => {
        if (!next.isConnected) return;
        next.removeAttribute("style");
        card.style.position = "";
        old.replaceWith(next);
      })
    );
  }
  window.dashSettled = Promise.allSettled(drawing);
}

//: What the drawn grid was drawn from: a visit with the same answer refreshes
//: in place rather than starting again.
function dashGridShape(layout) {
  return JSON.stringify([layout.order, layout.hidden, layout.wide, dashEditMode, entriesEverLoaded && !allEntries.length]);
}

async function renderDashboard({ refresh = false } = {}) {
  // The saved layout lives in preferences, after a page reload this can run
  // before startApp has fetched them. `loadPreferences` (settings-panes.js) is the shared
  // reader: the cache if it is filled, otherwise the request already in flight,
  // which on a cold start is startApp's own. It used to be a second
  // `GET /preferences` here, and the dashboard is the first tab, so a cold
  // start made it every time (WORLD_CLASS_PLAN A2).
  await loadPreferences().catch(() => null);
  renderDashboardGreeting();
  renderQuickLinks();
  renderDashMore();
  wireDashDensity();
  const grid = $("dash-grid");
  const layout = dashLayout();
  const shape = dashGridShape(layout);
  //: Not while a full draw is still filling: its settle is what shows the grid.
  if (refresh && grid.dataset.shape === shape && grid.querySelector(".dash-widget") && !grid.classList.contains("dash-filling")) {
    refreshDashWidgets(grid);
    return;
  }
  grid.dataset.shape = shape;
  grid.replaceChildren();
  //: Unseen while its widgets draw and their spans settle, then faded in
  //: whole (`dashSettled` below; `.dash-filling`, 08-consistency.css).
  grid.classList.add("dash-filling");
  $("dash-editbar").classList.toggle("hidden", !dashEditMode); // only while editing
  const drawing = [];

  // A brand-new notebook filled this grid with a dozen cards each politely
  // saying it had nothing to show. Every message was fine on its own; together
  // they made a working app look broken on the day someone starts using it.
  // One card that says what to do instead, and only until there's anything
  // to show, which is the first note.
  // `entriesEverLoaded` and not just the length: before the first GET /entries
  // comes back these are indistinguishable, and guessing "empty" paints the
  // brand-new-notebook card over a notebook full of notes.
  if (entriesEverLoaded && !allEntries.length && !dashEditMode) {
    grid.appendChild(gettingStartedCard());
    //: It has nothing to wait for. Left on, `.dash-filling` (added above)
    //: kept a brand-new notebook's only card hidden for good.
    grid.classList.remove("dash-filling");
    window.dashSettled = Promise.resolve();
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
      // silently stopped: and until then the row showed two controls doing
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
      //: **Reordering without a mouse.** Drag-to-reorder is the only way this
      //: grid could be arranged, and HTML5 drag-and-drop is unreachable by
      //: keyboard, unusable with a screen reader and awkward on a trackpad, 
      //: which is the whole of "a better way to manage and rearrange widgets"
      //: for anyone who does not want to drag a card across a page. Two
      //: buttons do the same job, exactly, and are also the faster way to move
      //: one widget three places up.
      if (!hidden) {
        const at = layout.order.indexOf(name);
        const move = (delta) => async () => {
          const order = [...layout.order];
          const to = at + delta;
          if (to < 0 || to >= order.length) return;
          order.splice(to, 0, ...order.splice(at, 1));
          await saveDashLayout({ ...dashLayout(), order });
          renderDashboard();
          //: Focus follows the widget, so a second press moves the same card
          //: again rather than whatever landed under the pointer.
          setTimeout(() => {
            document
              .querySelector(`[data-widget="${name}"] .dash-move-${delta < 0 ? "up" : "down"}`)
              ?.focus();
          }, 60);
        };
        const up = smallButton("ph:arrow-up", "Move this widget earlier", move(-1));
        up.classList.add("dash-move-up");
        up.disabled = at <= 0;
        const down = smallButton("ph:arrow-down", "Move this widget later", move(1));
        down.classList.add("dash-move-down");
        down.disabled = at >= layout.order.length - 1;
        controls.append(up, down);
      }
      const handle = document.createElement("span");
      handle.className = "drag-handle";
      //: An icon and a word like its Remove and Wide neighbours, not a "≡"
      //: glyph that sat above their baseline (reported at release).
      const grip = document.createElement("i");
      grip.className = "ph ph-dots-six-vertical ph-lead";
      grip.setAttribute("aria-hidden", "true");
      handle.append(grip, " Drag");
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
      drawing.push(mountWidgetBody(widget, body));
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
        dashDragOverCard(e, card, dragged, grid);
      });
    }
    grid.appendChild(card);
  }
  // Pack them once the cards exist; the observer keeps it right as the
  // async widget bodies fill in.
  grid.classList.remove("spans-ready");
  watchDashWidgets();
  //: **When the widgets have drawn** (INBOX 577): each fills after its own
  //: fetch and the grid's spans follow their heights, so the first seconds
  //: of a full dashboard moved its cards about (layout shift 0.12 seen
  //: after the opening curtain had lifted, smooth1005-boot.js on 300 notes).
  //: The opening curtain waits for this (`curtainShell`), 1.2s at most.
  //: Every visit, not only the first: a switch back to the dashboard redrew
  //: the widgets the same way, in view (0.26 on 300 notes, measured).
  const settled = (window.dashSettled = Promise.race([Promise.allSettled(drawing), new Promise((r) => setTimeout(r, 1200))]));
  const outline = dashFillingSkeleton(grid, drawing.length);
  settled.then(() => requestAnimationFrame(() => requestAnimationFrame(() => {
    if (window.dashSettled !== settled) return;
    grid.classList.remove("dash-filling");
    dashFillingSkeletonDone(outline);
  })));
}

//: **While the grid fills unseen, its outline shows** (INBOX 596, the owner:
//: "some skeleton loaders are missing like on the dashboard"). The grid is
//: hidden until its widgets settle (`.dash-filling`, so the cards do not move
//: about in view), which left the page under the greeting empty for up to
//: 1.2s. In its place, cards of `.skeleton` in the grid's own columns, laid
//: over the same box, fading as the grid fades in. Inline styles through the
//: CSSOM because the boot stylesheets are at their cap.
function dashFillingSkeleton(grid, count) {
  document.querySelector(".dash-grid-skeleton")?.remove();
  const host = grid.offsetParent;
  if (!count || !host) return null;
  const cs = getComputedStyle(grid);
  const outline = document.createElement("div");
  outline.className = "dash-grid-skeleton";
  outline.setAttribute("aria-hidden", "true");
  const columns = Math.max(1, cs.gridTemplateColumns.split(" ").length);
  Object.assign(outline.style, {
    position: "absolute",
    left: `${grid.offsetLeft}px`,
    top: `${grid.offsetTop}px`,
    width: `${grid.offsetWidth}px`,
    maxHeight: `${Math.max(0, innerHeight - grid.getBoundingClientRect().top)}px`,
    overflow: "hidden",
    display: "grid",
    gridTemplateColumns: cs.gridTemplateColumns,
    gap: cs.rowGap === "normal" ? "var(--space-4)" : `${cs.rowGap} ${cs.columnGap}`,
    pointerEvents: "none",
    transition: "opacity var(--motion-base) var(--ease-out)",
  });
  for (let i = 0; i < Math.min(count, columns * 2); i++) outline.appendChild(tabSkeletonPiece({ height: "12rem" }));
  host.appendChild(outline);
  return outline;
}

function dashFillingSkeletonDone(outline) {
  if (!outline) return;
  outline.style.opacity = "0";
  setTimeout(() => outline.remove(), 260);
}

// --- widget picker modal ------------------------------------------------------------
// A dedicated "Widgets" surface (roadmap §26) alongside the inline "Edit
// layout" mode: not a replacement for it. Both read/write the same
// `dashboard_layout` preference through dashLayout()/saveDashLayout() and the
// toggleDashWidget* helpers above; this modal just gives ~17 widgets a
// searchable, browsable list instead of only being reachable by scrolling
// the live grid in edit mode.

//: **A row here is a widget's *state*, not a pair of verbs.**
//:
//: Asked for: "the widgets menu and edit need a redesign". Three things were
//: wrong, and each is a semiotics problem rather than a styling one:
//:
//: 1. Wide was a **flip-label button**, it read "Wide" when narrow and
//:    "Narrow" when wide. A flip label says what pressing it will do and, at
//:    rest, says nothing about what the widget *is*; with nineteen rows you
//:    could not scan the list and see which ones span two columns. It is a
//:    two-state property, so it is now a toggle that stays pressed, with
//:    `aria-pressed` for anyone not looking at it.
//: 2. Remove sat at the same visual weight as Wide, so a destructive action
//:    and a reversible one looked identical. Remove keeps its own accent.
//: 3. **Order could only be changed by dragging the live grid**, unreachable
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

  //: **One toggle and one icon cluster, not four boxes.** Reported as one of
  //: two dialogs that are off the modal recipe. Measured before this, on a
  //: dialog listing twenty-four widgets: four controls a row, every one of
  //: them drawing its own resting tint, so the picker rendered 96 tinted
  //: boxes and read as a wall of buttons rather than as a list of widgets.
  //: That is the "everything is a button" complaint in one surface.
  //:
  //: The shape now: "Wide" stays a labelled toggle, because it is a property
  //: of the widget and its state has to be readable without hovering, and the
  //: three verbs (up, down, add/remove) become one icon cluster at the row's
  //: end. Add/remove loses its word and keeps its name: `smallButton` puts the
  //: title on `aria-label`, so it is still announced, and the icon already
  //: carries the meaning (plus against x) that the word repeated.
  const controls = document.createElement("div");
  controls.className = "dash-widget-row-controls entry-actions";
  if (!hidden) {
    controls.appendChild(
      dashWidgetToggle(
        "ph:arrows-out-line-horizontal Wide",
        isWide ? "Spanning two columns: press to narrow" : "Span two columns",
        isWide,
        async () => {
          await toggleDashWidgetWide(name);
          renderDashboard();
          renderDashWidgetsList($("dash-widgets-search").value);
        },
      ),
    );
  }
  const cluster = document.createElement("div");
  cluster.className = "dash-widget-row-cluster";
  if (!hidden && position) {
    //: Only where they can do something: the first row's "up" and the last
    //: row's "down" are disabled rather than absent, so the control cluster
    //: keeps one width and the rows stay aligned down the list.
    const up = smallButton("ph:arrow-up", "Move up", () => moveDashWidget(name, -1));
    up.disabled = position.index === 0;
    const down = smallButton("ph:arrow-down", "Move down", () => moveDashWidget(name, 1));
    down.disabled = position.index === position.total - 1;
    for (const button of [up, down]) button.classList.add("icon-button");
    cluster.append(up, down);
  }
  const onOff = smallButton(
    hidden ? "ph:plus" : "ph:x",
    hidden ? "Add this widget to the dashboard" : "Remove this widget from the dashboard",
    async () => {
      await toggleDashWidgetHidden(name);
      renderDashboard();
      renderDashWidgetsList($("dash-widgets-search").value);
    },
  );
  onOff.classList.add("icon-button");
  //: The one row that takes something away says so in the app's own danger
  //: colour, rather than looking like the reversible toggle beside it.
  if (!hidden) onOff.classList.add("danger");
  cluster.appendChild(onOff);
  controls.appendChild(cluster);
  row.appendChild(controls);
  return row;
}

// Two groups, "On your dashboard" and "Available", rather than a single
// list with a per-row status chip: with ~17 widgets, seeing at a glance how
// many are already on the dashboard is more useful than reading each row.
//: Which shelf each widget belongs on. A map here rather than a `group:` field
//: on all twenty-five entries: the catalogue's rows are already long, and a
//: widget's *group* is a fact about this list rather than about the widget.
//: Anything unlisted falls into "other", so a widget added later still appears
//:, silently vanishing from the picker is the one failure this must not have.
const DASH_WIDGET_GROUPS = {
  stats: "overview", streak: "overview", heatmap: "overview", pace: "overview",
  digest: "overview", art: "overview",
  pinned: "notes", random: "notes", categories: "notes", "on-this-day": "notes",
  unfinished: "notes", orphans: "notes", tensions: "notes", boards: "notes",
  documents: "notes",
  capture: "doing", reminders: "doing", focus: "doing", questions: "doing",
};

const DASH_WIDGET_GROUP_LABELS = {
  overview: "How the notebook is going",
  notes: "Your notes and what is in them",
  doing: "Things to do here",
  other: "Everything else",
};

//: What the dashboard currently is, in one line, and the way back to the
//: default. A list of twenty-five toggles with no statement of the result is a
//: list you edit blind, and "reset" is the answer to the fear that stops
//: people trying any of them.
function dashWidgetsSummary(layout) {
  const row = document.createElement("div");
  row.className = "row space-between dash-widgets-summary";
  const count = layout.order.filter((name) => !layout.hidden.includes(name)).length;
  const total = Object.keys(DASH_WIDGETS).length;
  const line = document.createElement("span");
  line.className = "muted";
  line.textContent = `${count} of ${total} on your dashboard`;
  row.appendChild(line);
  const reset = smallButton(
    "ph:arrow-counter-clockwise Reset layout",
    "Put every widget back to the order and visibility it started with",
    async () => {
      const sure = await confirmDialog(
        "Reset the dashboard layout?\n\nEvery widget goes back to its original place, and the ones you removed come back. Nothing else changes.",
      );
      if (!sure) return;
      //: An empty layout is what `dashLayout()` reads as "no preference", so
      //: this is a reset rather than a second copy of the default order kept
      //: in a place that could drift from the real one.
      await saveDashLayout({ order: [], hidden: [], wide: [], sizes: {} });
      renderDashboard();
      renderDashWidgetsList($("dash-widgets-search")?.value || "");
    },
  );
  row.appendChild(reset);
  return row;
}

function renderDashWidgetsList(filterText = "") {
  const container = $("dash-widgets-list");
  container.replaceChildren();
  const layout = dashLayout();
  container.appendChild(dashWidgetsSummary(layout));
  const q = filterText.trim().toLowerCase();
  const names = Object.keys(DASH_WIDGETS).filter((name) => {
    if (!q) return true;
    //: **The description is searched too.** Reported: "I just want a better
    //: menu and way to manage the widgets." With twenty-five of them, a filter
    //: that only matches titles means you have to already know a widget is
    //: called "Rediscover" to find the one that shows you an old note, which
    //: is exactly backwards, because the reason you are in this list is that
    //: you do not know what is in it.
    const widget = DASH_WIDGETS[name];
    const haystack = `${widget.title.replace(PH_LABEL, "")} ${widget.description || ""}`;
    return haystack.toLowerCase().includes(q);
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
  //: page does: a picker that lists widgets in a different order from the
  //: thing it is editing makes "move up" unreadable.
  const onDashboard = layout.order.filter((n) => !layout.hidden.includes(n));
  addGroup(
    "On your dashboard",
    onDashboard.filter((n) => names.includes(n)),
    onDashboard,
  );
  //: **The rest, grouped by what they are for.** Thirteen hidden widgets in one
  //: flat list called "Available" is a wall: you scroll it once, take nothing
  //: in, and close the dialog. Four short groups are four decisions.
  const available = names.filter((n) => layout.hidden.includes(n));
  for (const [group, label] of Object.entries(DASH_WIDGET_GROUP_LABELS)) {
    addGroup(
      label,
      available.filter((n) => (DASH_WIDGET_GROUPS[n] || "other") === group),
      null,
    );
  }

  if (!names.length) {
    const empty = document.createElement("p");
    empty.className = "muted";
    empty.textContent = "No widgets match that search.";
    container.appendChild(empty);
  }
}

// --- Wave J: generative art (p5.js, vendored locally) -------------------------------
// A living "constellation" of the notebook: each category becomes a
// cluster of drifting stars, more notes, more stars, connected by
// faint lines in the category's own colour. It's seeded from the real
// note counts, so the same notebook always grows the same sky (until
// you hit Regenerate). Purely decorative; nothing depends on it.

let artInstance = null; // the one live p5 instance, if any
let artNonce = 0; // bumped by "Regenerate" for a fresh arrangement
// Bumped on every startArt call. A run that finds it has changed while it was
// waiting knows it was superseded and must not mount its canvas, see the
// comment in startArt for the stacking bug this fixes (§35G).
let artRun = 0;
// Where the constellation is drawn, kept so a theme change can rebuild it.
//
// The sketch reads light-or-dark ONCE, when it is built, and paints its wash
// from that. Nothing rebuilt it when the mode changed, so toggling to dark left
// the one panel on the dashboard still wearing the light background until you
// pressed Regenerate: reported, and listed in IDEAS.md.
let artHolder = null;

// Stable 0–359 hue from a category name, so a category keeps its colour.
function hueFor(name) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) % 360;
  }
  return hash;
}

//: The constellation paints in hue, so a colour the person chose (Manage
//: categories, Colour) gives its hue and an automatic one keeps `hueFor`.
function categoryHue(name) {
  const hex = categoryColour(name);
  if (!hex) return hueFor(name);
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const spread = Math.max(r, g, b) - Math.min(r, g, b);
  if (!spread) return 0;
  const sector = Math.max(r, g, b) === r ? ((g - b) / spread) % 6 : Math.max(r, g, b) === g ? (b - r) / spread + 2 : (r - g) / spread + 4;
  return Math.round(sector * 60 + 360) % 360;
}
//: A colour chosen while the dashboard is showing redraws it.
document.addEventListener("categorycolours", () => {
  if ($("dash-grid")?.checkVisibility?.()) renderDashboard();
});

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
// and it keeps `artNonce` so the sky stays the same arrangement, this is a
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
    const hue = categoryHue(group.name);
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
        //: Which star this is across a Regenerate (INBOX 686): the n-th star
        //: of a category glides to where the n-th star of that category goes.
        cat: group.name,
        idx: i,
      });
    }
  }
  return particles;
}

//: **Regenerate glides (INBOX 686**, the owner: "can you add a smooth
//: animation for regenerating the notebook constelation??"). It used to tear
//: the sketch down and mount a new one, so the sky changed in one frame. Now
//: the live sketch is retargeted: every star eases from where it is drawn to
//: its place in the new arrangement, a star with no partner fades and grows
//: in where it lands, one left over fades out where it stands, and the lines
//: (which read wrong while their stars are travelling) fade out and come back
//: as the stars settle. A second Regenerate mid-way starts from the drawn
//: positions, so nothing jumps.
//:
//: The bound the owner's ask is measured against: no star moves more than an
//: eighth of its journey between two frames. A cubic ease-out starts at three
//: times the average speed, so at the sketch's thirty frames a second over
//: 800 ms the first frame would be 0.125 of the way, exactly on the line;
//: the glide runs at sixty (`ART_GLIDE_FPS`) and drops back when it settles,
//: which halves it. Measured first with the wall clock, the first frame was
//: still 0.14 of the way: it was drawn 30 to 50 ms after the click, and a
//: busy machine's late frames did the same mid-glide. Hence the glide's own
//: clock below. `scratchpad/ui-sweeps/constellation686.js` measures it.
const ART_GLIDE_MS = 800;
const ART_GLIDE_FPS = 60;
//: The most of the glide's clock one frame may spend: 25 ms is three fifths
//: of an eighth of the journey even at the ease's fastest, its first frame.
const ART_GLIDE_STEP_MS = 25;
//: The quick cross-fade that replaces the glide when interface animations are
//: off or less motion is asked for: a change of picture, not a journey.
const ART_FADE_MS = 200;

function artEaseOut(u) {
  const k = 1 - Math.min(1, Math.max(0, u));
  return 1 - k * k * k;
}

//: The lines' strength through a glide: from wherever they were (a glide
//: interrupted while they were half gone starts from half), out by a third
//: of the way, held out while the stars cross, back in over the last half.
function artLineFade(from, u) {
  if (u <= 0.3) return from * (1 - u / 0.3);
  if (u <= 0.5) return 0;
  return artEaseOut((u - 0.5) / 0.5);
}

//: Pair the stars drawn now with the next arrangement's. `shown` carries what
//: the last frame drew (`x`, `y`, `vis`, `drawSize`); each next star gets a
//: `from` (a partner's drawn state, or nothing: it grows in where it lands);
//: unpaired shown stars, and stars still fading from an earlier glide, leave.
function artRetarget(shown, leaving, next) {
  const key = (s) => `${s.cat}\u0000${s.idx}`;
  const drawn = new Map(shown.map((s) => [key(s), s]));
  for (const star of next) {
    const was = drawn.get(key(star));
    star.from = was ? { x: was.x, y: was.y, vis: was.vis ?? 1, size: was.drawSize ?? was.size } : { x: null, y: null, vis: 0, size: 0 };
    drawn.delete(key(star));
  }
  const gone = [...leaving, ...drawn.values()].filter((s) => (s.vis ?? 1) > 0.01);
  return gone.map((s) => ({ ...s, from: { x: s.x, y: s.y, vis: s.vis ?? 1, size: s.drawSize ?? s.size } }));
}

async function renderArtWidget(body) {
  const holder = document.createElement("div");
  holder.className = "art-holder";
  body.appendChild(holder);

  // Say what the picture actually means, until now it was pretty but
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
      //: The live sketch glides to it (INBOX 686); only a widget with no
      //: sketch yet (p5 still loading) builds one.
      if (artInstance) artInstance.regenerate();
      else startArt(holder);
    })
  );
  controls.appendChild(
    smallButton("ph:floppy-disk Save PNG", "Save this artwork as an image", () => {
      if (artInstance) artInstance.saveSettled();
    })
  );
  body.appendChild(controls);

  // A colour key so each cluster is identifiable, matching the hue the
  // canvas paints each category with.
  const legend = document.createElement("div");
  legend.className = "art-legend";
  body.appendChild(legend);
  fetchDashStats()
    .then((stats) => {
      const cats = (stats.categories || []).slice(0, 8);
      legend.replaceChildren();
      for (const cat of cats) {
        const item = document.createElement("span");
        item.className = "art-legend-item";
        const dot = document.createElement("span");
        dot.className = "art-legend-dot";
        dot.style.background = categoryColour(cat.name, `hsl(${hueFor(cat.name)}, 70%, 55%)`);
        item.append(dot, document.createTextNode(`${cat.name} · ${cat.count}`));
        legend.appendChild(item);
      }
    })
    .catch(() => {});

  return startArt(holder);
}

//: What the dashboard's constellation draws at. See `p.setup` below for why
//: thirty rather than the sixty p5 defaults to.
const ART_FRAME_RATE = 30;

async function startArt(holder) {
  // Which run this is. `startArt` awaits /insights/stats before it mounts
  // anything, and `stopArt()` above that await can only remove an instance
  // that already exists: so two overlapping calls each found `artInstance`
  // null, each waited, and each mounted a canvas into the same holder. That
  // is the four-or-five stacked constellations that were screenshotted
  // (§35G), and the same bug is why Regenerate read as "broken and severely
  // glitchy": every click added a canvas and `artInstance` only ever tracked
  // the last one, so nothing could tear the others down.
  const run = ++artRun;
  stopArt();
  artHolder = holder;
  //: p5 loads after the page (`ensureP5`, phone-shell.js), so a dashboard
  //: drawn first waits for it rather than reporting it missing.
  if (typeof p5 === "undefined" && !(await ensureP5())) {
    holder.textContent = "The art library didn't load.";
    return;
  }
  if (run !== artRun) return;
  const stats = await fetchDashStats().catch(() => ({
    categories: [],
    total_entries: 0,
  }));
  const categories = (stats.categories || []).slice(0, 8);
  const total = Math.max(1, stats.total_entries || 0);
  //: **Every switch that means "stop moving things", not only the OS hint.**
  //:
  //: This read the media query and nothing else, so the two generative
  //: pictures in the app disagreed about the same question: the background
  //: art (`startBgArt`, settings.js) resolves motion from the app's own
  //: Reduce motion switch and from Performance mode as well, and this one
  //: ignored both. Turn on Reduce motion and the background froze while this
  //: widget kept running; turn on Performance mode, which DESIGN.md rule 12
  //: says stops every animation but the progress indicators, and this was
  //: the thing that kept going. The background art's own comment notes it
  //: used to be "the one thing that kept running" under Performance mode;
  //: this was the second one, and nobody had looked.
  //:
  //: Measured on the dashboard: this canvas runs at 59 fps in a 306x220 box,
  //: and it is what the owner's "theres a flickering just above the bottom
  //: bar" is looking at (INBOX 226: the pixels change in one column of the
  //: band above the status bar, with no DOM mutation at all, and the
  //: *background* art is off; the earlier investigation measured that one).
  //:
  //: `reducedMotionWanted` (chat.js) is the OS hint or the app's own switch;
  //: `perfModeOn` (settings.js) is the machine judgement. Both reached
  //: through `typeof`, since dashboard.js loads before settings.js and a
  //: render that somehow beat it should fall back to moving rather than
  //: throw.
  //:
  //: Not `bg-motion`: that control is the background's own, is hidden when
  //: the background art is off, and would be a surprising place to find the
  //: switch for a widget.
  //: Three inputs, not two: Battery-efficient mode joins them (INBOX 260).
  //: A setting with "battery" in its name that leaves a canvas drawing is a
  //: setting people read as broken, whatever its help text says.
  const reduceMotion =
    window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
    reducedMotionWanted() ||
    (typeof perfModeOn === "function" && perfModeOn()) ||
    batteryModeOn();
  // data-mode is always resolved to light or dark, including under "System",
  // so this no longer has to re-derive it from two sources.
  const dark = resolvedTheme() === "dark";
  // The wash used a hardcoded indigo hue, so on any palette that isn't
  // indigo, Sage, Ocean, Ember, the one generative panel on the dashboard
  // was the only thing on screen still wearing the old theme's colour.
  const accentHex = currentAccentHex();

  const sketch = (p) => {
    let particles = [];
    let width = 0;
    const height = 220;
    //: The glide in hand (INBOX 686): when it began, how strong the lines
    //: were then, and the stars still fading out. `null` at rest.
    let glide = null;
    //: The quick cross-fade's picture of the old sky, and when it began.
    let fade = null;

    //: `settled` draws the arrangement the glide is heading for, whatever
    //: point it has reached: what Save PNG saves.
    const scene = (t, settled = false) => {
      // A soft vertical wash instead of a flat fill, more depth (Wave N).
      p.noStroke();
      const washHue = p.hue(p.color(accentHex));
      for (let y = 0; y < height; y += 4) {
        const shade = dark ? 14 + (y / height) * 10 : 250 - (y / height) * 10;
        p.fill(washHue, 30, shade, 1);
        p.rect(0, y, width, 4);
      }
      const now = p.millis();
      //: The glide's own clock, advanced by each drawn frame and by no more
      //: than `ART_GLIDE_STEP_MS` per frame: it starts at the first frame
      //: drawn after the click, not at the click, and a late frame (a busy
      //: machine) stalls the glide rather than jumping it.
      if (glide && !settled) {
        if (glide.last !== null) glide.elapsed += Math.min(now - glide.last, ART_GLIDE_STEP_MS);
        glide.last = now;
      }
      const u = glide && !settled ? Math.min(1, glide.elapsed / ART_GLIDE_MS) : 1;
      const e = artEaseOut(u);
      //: The drift goes on under the glide: a star eases from where it was
      //: drawn towards its new place as that place drifts, so it arrives on
      //: the moving point rather than on a still one and then lurching.
      for (const dot of particles) {
        const x = dot.baseX + Math.cos(t + dot.phase) * dot.amp;
        const y = dot.baseY + Math.sin(t * 1.3 + dot.phase) * dot.amp;
        const from = u < 1 ? dot.from : null;
        dot.x = from && from.x !== null ? from.x + (x - from.x) * e : x;
        dot.y = from && from.y !== null ? from.y + (y - from.y) * e : y;
        dot.vis = from ? from.vis + (1 - from.vis) * e : 1;
        dot.drawSize = from ? from.size + (dot.size - from.size) * e : dot.size;
      }
      const lines = u < 1 ? artLineFade(glide.lineFrom, u) : 1;
      // Faint connecting lines between nearby stars (O(n²), but n is
      // capped low enough that it stays cheap at 60fps).
      for (let i = 0; lines > 0 && i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const a = particles[i];
          const b = particles[j];
          const d = p.dist(a.x, a.y, b.x, b.y);
          if (d < 70) {
            p.stroke(a.hue, 65, dark ? 72 : 55, p.map(d, 0, 70, 0.45, 0) * lines * Math.min(a.vis, b.vis));
            p.strokeWeight(1);
            p.line(a.x, a.y, b.x, b.y);
          }
        }
      }
      //: Stars with no place in the new sky fade where they stand, gone by
      //: six tenths of the way so the arrivals are not crowded by them.
      const leaving = u < 1 ? glide.leaving : [];
      const out = artEaseOut(Math.min(1, u / 0.6));
      for (const dot of leaving) dot.vis = dot.from.vis * (1 - out);
      // The stars themselves: a soft glow halo + a bright core, twinkling.
      p.noStroke();
      for (const dot of leaving.concat(particles)) {
        const twinkle = (0.6 + 0.4 * Math.sin(t * 2 + dot.phase)) * dot.vis;
        p.fill(dot.hue, 75, dark ? 65 : 55, 0.14 * twinkle);
        p.circle(dot.x, dot.y, dot.drawSize * 4); // glow
        p.fill(dot.hue, 80, dark ? 78 : 48, twinkle);
        p.circle(dot.x, dot.y, dot.drawSize); // core
      }
      if (fade && !settled) {
        const k = 1 - Math.min(1, (now - fade.start) / ART_FADE_MS);
        const ctx = p.drawingContext;
        ctx.save();
        ctx.globalAlpha = k;
        ctx.drawImage(fade.snap, 0, 0, width, height);
        ctx.restore();
      }
    };

    //: Regenerate (INBOX 686): the next arrangement, reached by a glide, or
    //: by a cross-fade when interface animations are off or less motion is
    //: asked for (read now, not at build: the switch may have moved since).
    p.regenerate = () => {
      if (!width) return;
      p.randomSeed(artSeed(categories) + artNonce * 997);
      const next = buildArtParticles(p, categories, total, width, height);
      const now = p.millis();
      if (reduceMotion || reducedMotionWanted() || document.documentElement.dataset.uiMotion === "off") {
        const snap = document.createElement("canvas");
        snap.width = p.drawingContext.canvas.width;
        snap.height = p.drawingContext.canvas.height;
        snap.getContext("2d").drawImage(p.drawingContext.canvas, 0, 0);
        fade = { snap, start: now };
        glide = null;
        particles = next;
        p.frameRate(ART_FRAME_RATE);
        p.loop();
        return;
      }
      const u = glide ? Math.min(1, glide.elapsed / ART_GLIDE_MS) : 1;
      const lineFrom = glide && u < 1 ? artLineFade(glide.lineFrom, u) : 1;
      const leaving = artRetarget(particles, glide && u < 1 ? glide.leaving : [], next);
      glide = { elapsed: 0, last: null, lineFrom, leaving };
      particles = next;
      p.frameRate(ART_GLIDE_FPS);
    };
    //: Save PNG takes the settled sky, then puts the frame in hand back
    //: before the browser paints, so the save never shows on screen.
    p.saveSettled = () => {
      const t = reduceMotion ? 0 : p.millis() * 0.0003;
      scene(t, true);
      p.saveCanvas("memorymap-constellation", "png");
      scene(t);
    };
    //: What the stars are drawn at, for the sweep that measures the glide.
    p.artStars = () => particles;

    p.setup = () => {
      width = holder.clientWidth || 300;
      p.createCanvas(width, height);
      p.colorMode(p.HSL, 360, 100, 100, 1);
      p.randomSeed(artSeed(categories) + artNonce * 997);
      particles = buildArtParticles(p, categories, total, width, height);
      //: **Thirty frames a second, for a drift that takes twenty seconds to
      //: go round.** The motion here is `cos(t + phase) * amp` with `amp`
      //: between 2 and 9 pixels: at sixty frames a second a star moves about
      //: a fiftieth of a pixel between frames, which nobody can see and
      //: everybody's battery pays for. Profiled over fourteen seconds of
      //: ordinary use, p5 was 248 ms of self time, the largest single thing
      //: on screen, and this is the sketch doing it.
      //:
      //: Halving it is only safe because `scene` is driven by the clock
      //: below rather than by `frameCount`: a frame counter would have made
      //: the drift itself run at half speed, which is a behaviour change
      //: dressed as an optimisation.
      p.frameRate(ART_FRAME_RATE);
      if (reduceMotion) {
        scene(0); // one still frame: no animation for reduced-motion users
        p.noLoop();
      }
    };
    //: Wall clock, not `frameCount`, so the drift runs at the speed it was
    //: chosen at whatever the frame rate happens to be, including whatever a
    //: browser throttles a background tab to. The two are the same number:
    //: `frameCount * 0.005` at sixty frames a second advanced `t` by 0.3 a
    //: second, and `millis() * 0.0003` advances it by 0.3 a second full stop.
    p.draw = () => {
      scene(reduceMotion ? 0 : p.millis() * 0.0003);
      const now = p.millis();
      if (glide && glide.elapsed >= ART_GLIDE_MS) {
        glide = null;
        p.frameRate(ART_FRAME_RATE);
      }
      if (fade && now - fade.start >= ART_FADE_MS) {
        fade = null;
        if (reduceMotion) p.noLoop();
      }
    };
    // Was missing entirely: width was measured once at setup and never
    // re-synced, so this canvas was the one p5 sketch in the app with no
    // resize handling at all (the sibling in the whiteboard has its own).
    // Reported as the constellation "keeps disappearing": a second trigger
    // on top of the theme-change one ARCHITECTURE §10 already documents and
    // `refreshArtForTheme` already handles. A ResizeObserver on the holder
    // catches both a real window resize *and* the Edit-layout "Wide" toggle
    // (which changes the card's width with no window resize event at all), 
    // `p.windowResized` alone would have missed the second one entirely.
    const resync = () => {
      if (!holder.isConnected) return;
      const next = holder.clientWidth;
      // Guarded the same reason `holder.clientWidth || 300` is in setup: a
      // transient 0 mid-reflow must not shrink the canvas to nothing.
      if (!next || next === width) return;
      width = next;
      p.resizeCanvas(width, height);
      glide = null;
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
  //: p5 arrives on demand (`ensureP5`, app.js); the run check above is
  //: repeated after the wait, since a second render can have superseded us.
  if (typeof p5 === "undefined") {
    const ok = await ensureP5();
    if (!ok || run !== artRun || !holder.isConnected) return;
  }
  artInstance = new p5(sketch, holder);
}

// Capture streak (Wave K): consecutive days up to today with at least
// one note, read from the same per-day series the stats strip uses.
//: **One streak rule for the whole dashboard, and it is the journal's.**
//: `daily_journal` (api/routes_entries.py) counts back from today and allows
//: today to be empty: nine days running and nothing yet this morning is a
//: streak of nine, not zero, or the number drops at every midnight and
//: comes back when you write, a counter that punishes the morning. The
//: greeting, the figures strip and the Streak widget each counted their own
//: and stopped at an empty today: measured at one in the morning after an
//: evening of 22 notes, "0 day streak" and "No streak yet" beside a journal
//: that said 1 (tests/test_dashboard_streak.py). `perDay` runs oldest to
//: newest, the last entry being today.
function dashStreak(perDay) {
  const days = perDay || [];
  let i = days.length - 1;
  if (i >= 0 && !(days[i] > 0)) i -= 1;
  let streak = 0;
  for (; i >= 0 && days[i] > 0; i -= 1) streak += 1;
  return streak;
}

async function renderStreakWidget(body) {
  const stats = await fetchDashStats();
  const perDay = stats.per_day || []; // oldest → newest, last = today

  const current = dashStreak(perDay);
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
    //: A streak kept alive by yesterday says what keeps it going.
    const today = perDay.length ? perDay[perDay.length - 1] : 0;
    sub.textContent =
      `You've captured ${current} day${current === 1 ? "" : "s"} running` +
      (today ? "" : ". Save a note today to keep it") +
      (longest > current ? ` · best in the last fortnight: ${longest}` : "");
  } else {
    sub.textContent = "Save a note today to start one.";
  }
  body.appendChild(sub);
}

async function renderStatsWidget(body) {
  const stats = await fetchDashStats();
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
// Shared by the Pinned/Most-used/Recent-notes dashboard widgets, reported
// directly for Most Used, but all three shared the same gap: `notePreviewText`
// *strips* markdown syntax down to plain readable text (no literal `**`), which
// isn't the same as *rendering* it, `**bold**` read as clean but unstyled
// "bold", not actual bold text, and an inline image showed nothing at all.
// `renderInlineMarkdown`'s own `compact` mode is exactly what a label-sized
// list row already uses everywhere else in this app for the same reason
// (link chips, the document sidebar), swap to it here too rather than the
// stripped-text path.
// First image in a note's raw markdown, if it has one and the URL is safe to
// load. `renderInlineMarkdown`'s `compact` mode (used below) deliberately
// swaps every image for its alt text, right for a label-sized chip, but a
// dashboard row has room for the real picture, so this widget-only path
// pulls the first one out for a thumbnail instead.
const FIRST_MD_IMAGE = /!\[([^\]\n]{0,200})\]\(([^)\n]{1,500})\)/;
function firstNoteImage(content) {
  const m = FIRST_MD_IMAGE.exec(content || "");
  if (!m) return null;
  const [, alt, url] = m;
  return isRenderableUrl(url) ? { alt, url } : null;
}

//: **An attached picture is a picture too.** Reported: "the widgets and other
//: things dont render attached files on notes like the recently added widget
//: and other areas in the application."
//:
//: The gap is in the model, not the markup: an image *embedded* in the note
//: text is `![](…)` and was found by `firstNoteImage` above, but an image
//: **attached** to the note (`entry.attachments`, its own table, `/files/{id}`)
//: appears nowhere in the note's markdown: so a note whose only picture was
//: attached rather than pasted rendered as a row of text with no picture at
//: all, in every widget, forever.
function noteRowImage(entry) {
  const embedded = firstNoteImage((entry.content || "").replace(/\[\[([^[\]]{1,120})\]\]/g, "$1"));
  if (embedded) return embedded;
  const attached = (entry.attachments || []).find((file) => file.is_image);
  return attached ? { alt: attached.filename || "", url: `/files/${attached.id}` } : null;
}

// The non-image half of `noteRowImage`, a note's attached PDF, spreadsheet
// or the like has nothing to thumbnail, and previously had nothing shown
// for it at all here: `miniEntryList` only ever asked `noteRowImage`, so a
// note whose only attachment was a document rendered as if it were bare
// text, indistinguishable from a note with nothing attached. Reported
// directly: "files dont render in the widgets and other areas notes are
// shown."
function noteRowFile(entry) {
  const attached = (entry.attachments || []).find((file) => !file.is_image);
  return attached ? { name: attached.filename || "", url: `/files/${attached.id}` } : null;
}

function miniEntryList(body, entries, emptyText, emptyAction = null) {
  if (!entries.length) {
    if (emptyText) dashEmpty(body, emptyText, emptyAction);
    return;
  }
  const ul = document.createElement("ul");
  ul.className = "dash-list";
  for (const entry of entries) {
    const li = document.createElement("li");
    // The wiki-link unwrap notePreviewText also did, renderInlineMarkdown
    // itself doesn't know `[[...]]`, only the full note-body renderer does.
    //: A `---` properties block is never the note's words (stripFrontmatter).
    const raw = stripFrontmatter(entry.content || "").replace(/\[\[([^[\]]{1,120})\]\]/g, "$1");
    const image = noteRowImage(entry);
    if (image) {
      li.classList.add("dash-has-thumb");
      const thumb = document.createElement("img");
      thumb.src = mediaSrc(image.url);
      thumb.alt = image.alt || "";
      thumb.loading = "lazy";
      thumb.className = "dash-list-thumb";
      li.appendChild(thumb);
    }
    const file = !image && noteRowFile(entry);
    const textEl = document.createElement("span");
    textEl.className = "dash-list-text";
    // Block syntax first. renderInlineMarkdown is exactly that, INLINE, so a
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
    if (file) {
      const chipEl = fileChip(file.name, file.url);
      chipEl.classList.add("dash-list-file-chip");
      textEl.appendChild(chipEl);
    }
    li.appendChild(textEl);
    li.title = "Open this note";
    li.addEventListener("click", () => flashEntry(entry.id));
    //: A row that opens on a click opens on Enter and Space too, as the
    //: boards widget's rows below do (INBOX 446 (5), axe's
    //: "scrollable region must have keyboard access" on Recently added):
    //: nothing in the list could take focus, so a keyboard could neither
    //: open a note from the widget nor scroll it.
    li.tabIndex = 0;
    li.addEventListener("keydown", (e) => {
      if ((e.key === "Enter" || e.key === " ") && e.target === li) {
        e.preventDefault();
        flashEntry(entry.id);
      }
    });
    ul.appendChild(li);
  }
  body.appendChild(ul);
}

// GET /entries pages now (ENTRIES_PAGE_SIZE) rather than returning the whole
// notebook: these three widgets used to each fetch their own full copy of
// it independently, which silently would have started missing tags/notes
// past the first page on a large notebook. `allEntries` is the same data,
// already loaded by loadEntries() before any tab (including the dashboard)
// renders, and complete once its own background paging finishes, so
// preferring it is both a correctness fix and three fewer network calls.
// The fetch fallback only matters if a widget somehow renders before that
// first load, and mirrors the pattern renderRandomNoteWidget already uses.
async function renderPinnedWidget(body) {
  const entries = (await dashEntries()).filter((e) => e.pinned);
  miniEntryList(body, entries.slice(0, 5), "Star a note and it shows up here.", { label: "ph:note Open Notes", run: "tab", tab: "notes" });
}

async function renderMostOpenedWidget(body) {
  const entries = await apiJson("/most-opened", { cacheMs: 30000 });
  miniEntryList(body, entries, "Open a few notes and the ones you return to show here.", { label: "ph:note Open Notes", run: "tab", tab: "notes" });
}

async function renderReviewWidget(body) {
  const queue = await apiJson("/review-queue?limit=5", { cacheMs: 30000 });
  if (!queue.count) {
    dashEmpty(body, "Nothing to check: every filing is settled.", { label: "ph:note Open Notes", run: "tab", tab: "notes" });
    return;
  }
  const line = document.createElement("p");
  line.className = "dash-review-count";
  line.textContent = `${queue.count} note${queue.count === 1 ? "" : "s"} to check`;
  const open = smallButton("ph:checks Review them", "Show them in Notes, filtered to is:review", async () => {
    await switchTab("notes");
    showNotesSection("browse");
    const box = $("note-search");
    if (box) {
      box.value = "is:review";
      box.dispatchEvent(new Event("input", { bubbles: true }));
    }
  });
  body.append(line, open);
}

async function renderMostUsedWidget(body) {
  const entries = await apiJson("/entries/most-accessed", { cacheMs: 30000 });
  miniEntryList(body, entries, "Ask questions and your most-used notes appear here.", { label: "ph:chat-circle Ask a question", run: "ask", tab: "chat" });
}

// The graph tab already knows how connected every note is (edges from
// EntryLink rows plus reply threads), this just ranks by how many of those
// edges touch each note, rather than asking the user to eyeball the graph
// for its own densest cluster. Perplexity brainstorm doc review flagged the
// gap: a "most-linked notes / hub" widget was one of the few ideas the app
// didn't already have a version of.
async function renderMostLinkedWidget(body) {
  const [entries, data] = await Promise.all([
    dashEntries(),
    fetchDashGraph().catch(() => null),
  ]);
  const degree = new Map();
  for (const edge of data?.edges || []) {
    if (typeof edge.source === "number") degree.set(edge.source, (degree.get(edge.source) || 0) + 1);
    if (typeof edge.target === "number") degree.set(edge.target, (degree.get(edge.target) || 0) + 1);
  }
  const byId = new Map(entries.map((e) => [e.id, e]));
  const ranked = [...degree.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([id]) => byId.get(id))
    .filter(Boolean)
    .slice(0, 6);
  miniEntryList(body, ranked, "Link notes to each other and the most-connected ones show up here.", { label: "ph:link Find links to add", run: "suggest-links" });
}

async function renderRecentNotesWidget(body) {
  //: Not a map's topics (UX-06): a map of forty listed forty one-word rows.
  const entries = (await dashEntries()).filter((e) => !e.map_topic);
  const newest = [...entries].sort(
    (a, b) => new Date(b.created_at) - new Date(a.created_at)
  );
  miniEntryList(body, newest.slice(0, 6), "Your newest notes will appear here.", { label: "ph:plus New note", run: "capture" });
}

async function renderTopTagsWidget(body) {
  const entries = await dashEntries();
  const counts = new Map();
  for (const entry of entries) {
    for (const tag of entry.tags || []) counts.set(tag, (counts.get(tag) || 0) + 1);
  }
  if (!counts.size) {
    dashEmpty(body, "Tag some notes and your top tags show up here.", { label: "ph:tag Show untagged notes", run: "untagged" });
    return;
  }
  const top = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12);
  const cloud = document.createElement("div");
  cloud.className = "entry-meta";
  for (const [tag, count] of top) {
    const tagChip = chip(`${tag} · ${count}`, "tag", () => filterNotesByTag(tag));
    tagChip.title = `Show notes tagged “${tag}”`;
    cloud.appendChild(tagChip);
  }
  body.appendChild(cloud);
}

async function renderQuestionsWidget(body) {
  const questions = await apiJson("/chat/recent", { cacheMs: 30000 });
  if (!questions.length) {
    dashEmpty(body, "Your recent questions will appear here.", { label: "ph:chat-circle Ask a question", run: "ask", tab: "chat" });
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

// Weekly digest caching (Wave J follow-up). The AI digest is expensive,
// so once it's generated it STAYS until you regenerate, and it resets
// itself each day. Generation is a module-level promise, so switching
// away from the dashboard never cancels it, whenever it finishes, the
// result is cached and shown next time the widget is on screen.
const DIGEST_KEY = "digestCache";
let digestPromise = null; // the in-flight generation, shared across renders

function todayStamp() {
  return new Date().toISOString().slice(0, 10);
}

function loadDigestCache() {
  try {
    const cached = prefs.json(DIGEST_KEY, null);
    if (cached && cached.date === todayStamp()) return cached.text; // fresh today
  } catch {
    /* corrupt cache: ignore and regenerate */
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
        continue; // a partial line: the next chunk completes it
      }
      if (event.type === "answer") {
        text += event.delta;
        if (onDelta) onDelta(text);
      } else if (event.type === "answer_final") {
        //: The server took a greeting or an announcement off the digest
        //: (`routes_insights`, `trim_assistant_padding`). The words already
        //: drawn are replaced once, and the trimmed text is what is cached.
        text = event.text || text;
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
    setLabel(thinking, "ph:spin Thinking about your week…");
    body.replaceChildren(thinking);
    // Live-render the text as it streams in; the ring stays until the first
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
        // The widget may have been left/re-rendered while we waited, 
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
    //: Built here rather than in `index.html`, so it carries the reason on
    //: itself and then asks the one gate to read it (INBOX 203). It used to
    //: carry its own copy of the check and its own sentence, which said "start
    //: Ollama" to somebody running llama.cpp; `syncModelGatedControls` owns
    //: that wording for every AI control in the app, this one included.
    generate.dataset.needsModel = "The weekly digest is written by the local AI";
    //: UX-12 (audit 2026-10-05): the reason was only a `title` on a disabled
    //: button, which a keyboard cannot focus and a phone cannot hover. The
    //: same line and Settings link as Ask and Chat, kept by the status poll.
    const offline = document.createElement("div");
    offline.className = "ai-offline-note hidden";
    offline.dataset.offlineLine = "No model is connected, so the digest cannot be written yet.";
    body.append(generate, offline);
    syncModelGatedControls();
  }
}

async function renderQuickCaptureWidget(body) {
  const textarea = document.createElement("textarea");
  //: A placeholder is not a label: it goes as soon as you type, and a
  //: screen reader reads nothing for the field without one (the a11y sweep).
  textarea.setAttribute("aria-label", "Quick capture");
  textarea.rows = 2;
  // Don't promise AI filing when there's no AI to do it; the note still saves.
  textarea.placeholder =
    modelStatus && modelStatus.ollama_running === false
      ? "Type a thought and press Save (Ctrl+Enter)."
      : "Type a thought and press Save (Ctrl+Enter), Atlas files it.";
  const row = document.createElement("div");
  row.className = "row";
  const status = document.createElement("span");
  status.className = "status";
  row.appendChild(
    smallButton("Save", "", async () => {
      const content = textarea.value.trim();
      if (!content) return;
      status.textContent = "Saving…";
      try {
        //: Saved at once and filed in the background, `#tags` read from the
        //: text, as Capture's are (INBOX 434). It waited on the model before.
        //: Held on this device when the server is gone (quick-note.js).
        const result = await createNoteSafely({ content, tags: [] });
        if (!result) throw new Error("The server is not answering. Your words are kept here.");
        textarea.value = "";
        if (result.queued) {
          status.textContent = "Saved on this device. It goes in when the server answers.";
          return;
        }
        const saved = result.saved;
        status.textContent = saved.filing_state === "pending" ? "Saved. Filing it now." : `Filed under “${saved.category}”.`;
        if (saved.filing_state === "pending") watchFiling(saved);
        loadEntries();
      } catch (error) {
        status.textContent = error.message;
      }
    }, false)
  );
  row.appendChild(status);
  //: Ctrl+Enter (Cmd+Enter) saves, as it does in the capture box on the
  //: Notes tab and in every multi-line "post" field people use; plain
  //: Enter stays a new line.
  textarea.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && (event.ctrlKey || event.metaKey) && !event.isComposing) {
      event.preventDefault();
      row.querySelector("button")?.click();
    }
  });
  body.append(textarea, row);
}

async function renderRemindersWidget(body) {
  // To the end before filtering: taking four open ones out of a first page
  // that happens to be all done would show "no open reminders" to someone who
  // has plenty.
  const reminders = (await dashReminders()).filter((r) => !r.done).slice(0, 4);
  if (!reminders.length) {
    dashEmpty(body, "No open reminders.", { label: "ph:plus Add a reminder", run: "reminder", tab: "reminders" });
    return;
  }
  const ul = document.createElement("ul");
  ul.className = "dash-list";
  for (const reminder of reminders) {
    const li = document.createElement("li");
    const due = new Date(reminder.due_at);
    //: The day and the time a person would say, never a machine timestamp
    //: with seconds ("9/24/2026, 1:22:17 PM", measured); the relative phrase
    //: ("in 23 hours") is the tooltip.
    const when = due.toLocaleString(undefined, { weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
    //: The thing to do, then when, on a line of its own in the muted rank:
    //: "Submit IT assignment: Thu, Sep 24, 1:22 PM" as one run-on line made
    //: the time read as part of the sentence.
    const what = document.createElement("span");
    what.className = "dash-reminder-text";
    what.textContent = reminder.text;
    const at = document.createElement("span");
    at.className = "dash-reminder-when muted";
    at.textContent = when;
    li.append(what, at);
    if (typeof relativeWhen === "function") li.title = relativeWhen(reminder.due_at);
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
    dashEmpty(body, "Save some notes and your activity shows up here.", { label: "ph:plus New note", run: "capture" });
    return;
  }

  const grid = document.createElement("div");
  grid.className = "heatmap";
  //: `overflow-x: auto` makes this a scroll container, and Chromium gives
  //: every scroll container a tab stop so a keyboard user can scroll it with
  //: the arrow keys. Measured with a Tab walk: focus lands here, and it was
  //: the one element on the dashboard a screen reader would announce as
  //: nothing at all. A scrollable region that takes focus needs a role and a
  //: name, so it announces as what it is rather than as a bare group.
  //:
  //: `role="img"`, not `group`: the 365 day cells carry `title` text each,
  //: and a group would have a screen reader walk all of them one at a time
  //: to reach the same story the summary line under the grid already tells
  //: in one sentence. This is a graphic drawn out of divs, so it announces
  //: as one, and the tab stop Chromium gives it still scrolls with arrows.
  grid.setAttribute("role", "img");
  grid.setAttribute("aria-label", `Activity over the last year, ${data.total} notes`);
  body.appendChild(grid);

  //: **Full size, full year, scrolled rather than shrunk.** The first
  //: version of this widget shrank its cells to fit whatever width the
  //: widget had (reported "the heatmap on the dashboard is a little
  //: small" at 2.7px cells), and the fix after that kept the cells at
  //: their real size by showing fewer weeks instead, so nothing ever
  //: scrolled. Reported again, 2026-09-09: "the whole thing fits into the
  //: small not wide dashboard, it looked better bigger and scrolled to the
  //: right" -- a year read a glance at a time is still the point, but the
  //: owner's own preference is the wider, scrollable shape over the
  //: cropped one, so this reverses the second fix and keeps the first: the
  //: whole year at `--heat-cell-max` (03-dashboard-widgets.css sets the
  //: grid's own columns to that width now, rather than a `1fr` this
  //: function used to divide up), the grid scrolls horizontally
  //: (`.heatmap`'s `overflow-x: auto`), and it opens scrolled to today
  //: (below) rather than to the oldest day, so the crop this replaces is
  //: not missed on first paint.
  function paint() {
    grid.replaceChildren();
    const counts = data.counts;
    const start = new Date(`${data.start}T00:00:00`);
    // Pad so each column is a whole week starting on Sunday.
    const lead = start.getDay();
    for (let i = 0; i < lead; i++) {
      const blank = document.createElement("span");
      blank.className = "heat-cell heat-blank";
      grid.appendChild(blank);
    }
    counts.forEach((count, index) => {
      const cell = document.createElement("span");
      // Five buckets, scaled against the busiest day so quiet notebooks
      // still show contrast.
      const level = count === 0 ? 0 : Math.min(4, Math.ceil((count / data.busiest) * 4));
      cell.className = `heat-cell heat-${level}`;
      const day = new Date(start);
      day.setDate(day.getDate() + index);
      cell.title = `${day.toLocaleDateString()}, ${count} note${count === 1 ? "" : "s"}`;
      grid.appendChild(cell);
    });
    // The grid runs oldest → newest, so the interesting end is the right
    // one. Start scrolled there instead of making the user drag across
    // empty squares to find today.
    requestAnimationFrame(() => {
      grid.scrollLeft = grid.scrollWidth;
    });
  }

  //: No `ResizeObserver` any more: the grid's own width no longer decides
  //: how many weeks are drawn (the column width is fixed in CSS), so a
  //: widget resize has nothing left for a repaint to change.
  paint();

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
  const stats = await fetchDashStats().catch(() => null);
  const categories = (stats && stats.categories) || [];
  if (!categories.length) {
    dashEmpty(body, "Save a few notes and your categories appear here.", { label: "ph:plus New note", run: "capture" });
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
    //: Accent unless the person gave this category a colour.
    const chosen = categoryColour(name);
    if (chosen) fill.style.setProperty("--cat-fill", chosen);
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
  //: The review queue's size (WORLD_CLASS_PLAN section 17, row 1): the
  //: filings Atlas was unsure of or left in Uncategorised, with the way in.
  const waiting = (stats && stats.to_review) || 0;
  if (!waiting) return;
  const line = document.createElement("p");
  line.className = "muted night-questions";
  line.textContent = `${waiting} note${waiting === 1 ? "" : "s"} to check where ${waiting === 1 ? "it was" : "they were"} filed.`;
  const open = smallButton("ph:check-square Review filings", "The Notes list, filtered to the filings to check", () => showNotesFilter("is:review"));
  const review = document.createElement("div");
  //: The night widget's question line is the same shape: one recipe, no new rule.
  review.className = "row night-questions-row";
  review.append(line, open);
  body.appendChild(review);
}

// A plain char-count slice can land inside an unclosed `![alt](url` or
// `[text](url`, the truncated tail then has no closing `)`, so INLINE_MD
// never matches it and it prints as literal markdown source instead of
// rendering (or vanishing) as intended. Reported live as "the Rediscover
// widget doesn't render images or sketches", plausible root cause: a
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
  // **Scored, not random, once there is enough notebook to score.**
  // WORLD_CLASS_PLAN 15, I4: a notebook that only ever shows you what you
  // just wrote is a diary, and the thing a notebook can do that a pile of
  // files cannot is bring back the note you would never have thought to look
  // for. The backend (`ai/resurface.py`) ranks by three facts a person can
  // check, age, links and opens, and this is the surface the plan asks for.
  //
  // The random pick below is kept, not replaced, and it is the right answer
  // for a small notebook: `MIN_NOTEBOOK` in resurface.py refuses to rank at
  // all under ten notes, because "the three most faded" out of five notes is
  // the same three for ever, which teaches people to ignore the panel. So
  // `/resurface` answers with nothing there and this falls through to the
  // shuffle, which is what that size actually wants.
  const cards = await apiJson("/resurface?limit=3", { silent: true, cacheMs: 30000 }).catch(() => null);
  const items = (cards && cards.items) || [];
  if (items.length) {
    paintFadedNotes(body, items);
    return;
  }
  await renderRandomShuffle(body);
}

// Three notes slipping out of reach, each with the reason it was chosen and
// a way to say "never again". The dismissal is a correction
// (`POST /learned/corrections`), the same store the filing and search
// corrections use, so sending a card away is a decision the notebook keeps
// rather than a thirty-second reprieve.
function paintFadedNotes(body, items) {
  body.replaceChildren();
  const list = document.createElement("div");
  list.className = "faded-list";
  for (const item of items) {
    const card = document.createElement("div");
    card.className = "faded-card";

    const main = document.createElement("div");
    main.className = "faded-main";
    const title = document.createElement("button");
    title.type = "button";
    title.className = "linklike faded-title";
    title.textContent = item.title || "Untitled note";
    //: One line, ellipsised, so the full title is the tooltip; the reason
    //: line beneath is what the row is for.
    title.title = `${item.title || "Untitled note"}: open in the Notes tab`;
    title.addEventListener("click", () => flashEntry(item.id));
    main.appendChild(title);

    if (item.reason) {
      const why = document.createElement("p");
      why.className = "muted faded-why";
      // The facts, not the score: "120 days old, no links, never opened" is
      // checkable and "0.82" is not.
      why.textContent = item.reason;
      main.appendChild(why);
    }
    card.appendChild(main);

    //: Icon-only, in its own column: the label "Never again" under a
    //: three-line title put every row's control at a different height and
    //: the widget read as a stack of uneven blocks (INBOX 216). The words
    //: stay as the name and the tooltip.
    const dismiss = smallButton("ph:x", "Never again: stop showing this note here", async () => {
      dismiss.disabled = true;
      try {
        await apiJson("/learned/corrections", {
          method: "POST",
          body: JSON.stringify({ kind: "dismiss_resurface", subject: { entry_id: item.id } }),
        });
        card.remove();
        // Emptied by dismissals: ask again rather than leaving a blank panel,
        // the next three are already ranked.
        if (!list.querySelector(".faded-card")) renderRandomNoteWidget(body);
      } catch (error) {
        dismiss.disabled = false;
      }
    });
    dismiss.classList.add("faded-dismiss");
    card.appendChild(dismiss);
    list.appendChild(card);
  }
  body.appendChild(list);
}

async function renderRandomShuffle(body) {
  const entries = await dashEntries().catch(() => []);
  if (!entries.length) {
    dashEmpty(body, "Save some notes and one will resurface here.", { label: "ph:plus New note", run: "capture" });
    return;
  }

  // "Another" has to actually show another one.
  //
  // Reported as broken, and it was: the pick was uniform over every note
  // WITH REPLACEMENT, so it could hand back the note already on screen and
  // the click did nothing. That is not rare, it is 1 in N, so a tenth of
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
    // emphasis surfaced here as its raw source, `## Schedule` and `**bold**`
    // spelled out: which makes the one widget whose whole job is to make an
    // old note appealing show it at its least readable.
    //
    // A <div>, not a <p>: renderMarkdown appends block elements, and a <p>
    // containing a <ul> is invalid markup that browsers fix by closing the
    // paragraph early, which drops the styling this class carries.
    const text = document.createElement("div");
    text.className = "random-note";
    renderMarkdown(text, truncateMarkdownSafe(stripFrontmatter(note.content), 239));
    body.appendChild(text);

    // A sketch's picture is never in `note.content` at all: the sketch pad
    // saves a caption as the note's text and the drawing as a real
    // Attachment (saveSketch), a completely different mechanism from a
    // pasted/dropped image's inline `![](...)`. Any renderer that only
    // reads content, this one included, showed nothing for a sketch note, 
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
        img.title = `${attachment.filename}: click to view full size`;
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
      // anything is the exact shape of "this control is broken", say why
      // instead.
      another.disabled = true;
      another.title = "This is your only note so far, write another and it'll shuffle.";
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
    dashEmpty(body, "Tag some notes and your cloud grows here.", { label: "ph:tag Show untagged notes", run: "untagged" });
    return;
  }
  const max = tags[0].count || 1;
  const cloud = document.createElement("div");
  cloud.className = "tag-cloud";
  for (const { tag, count } of tags) {
    // Font size scales with frequency (0.8rem – 1.7rem).
    const weight = count / max;
    const item = chip(tag, "tag", () => filterNotesByTag(tag));
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
      toast("Focus session complete. Nice work.");
      notify("MemoryMap", "Focus session complete. Nice work.");
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
// bare identifier, resolved the moment this line runs, and this line runs
// at app.js's own top-level, parse-time pass, before dashboard.js (loaded
// after app.js) has defined it. Left behind, that throws `ReferenceError`
// and aborts the rest of app.js's synchronous top-level code, same as
// `initDocSidebarTabs()` did. The other listeners here wrap their calls in
// arrow functions, which resolve the name lazily at click time rather than
// at registration time, so they were never actually at risk, but keeping
// the whole related group together here is clearer than splitting it by
// which handlers happen to be safe.
//: Edit layout is a row of the dock's menu; Done is the edit line's own
//: button, the one way out of the mode, so it is the only place this id is.
$("dash-edit").addEventListener("click", async () => {
  const leaving = dashEditMode;
  dashEditMode = !dashEditMode;
  //: The button just pressed is hidden with its line: the focus goes back to
  //: the menu it came from rather than to the page's body, once the render
  //: has rebuilt that menu (it replaces the opener).
  await renderDashboard();
  if (leaving) $("dash-more")?.querySelector("button")?.focus();
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
wireBackdropClose($("features-overlay"), () => closeFeatures());

// --- The four widgets for what the dashboard could not previously see -------
//
// Registered in DASH_WIDGETS above, where the reasoning for the set lives.
// All four follow the shape every widget here already uses: an async function
// taking the widget's own `body` element, reading `allEntries` or one cached
// `apiJson`, and rendering an empty state that says what to do rather than
// "no data".

/** A row that opens something other than a note, styled like `.dash-list`. */
function dashActionRow(ul, { title, meta, onOpen, hint, thumb, chip = null }) {
  const li = document.createElement("li");
  if (thumb) {
    li.classList.add("dash-has-thumb");
    li.appendChild(thumb);
  }
  const text = document.createElement("span");
  text.className = "dash-list-text";
  //: `chip` stands in for the plain title when the row is a thing the app has
  //: a chip for: a mind map, so far. Not *beside* the title: the chip already
  //: carries the title, and drawing both would say the same words twice on one
  //: row. The chip passed here is the non-interactive form (`mapChip`'s own
  //: comment says why), because this `<li>` is already `role="button"`.
  const titleEl = chip || document.createElement("span");
  if (!chip) {
    titleEl.className = "dash-list-title";
    titleEl.textContent = title;
  }
  text.appendChild(titleEl);
  if (meta) {
    const metaEl = document.createElement("span");
    metaEl.className = "dash-list-preview";
    metaEl.textContent = meta;
    text.appendChild(metaEl);
  }
  li.appendChild(text);
  li.title = hint || "Open";
  // A row that does something is a control, so it answers to the keyboard and
  // announces itself as one, `li.addEventListener("click")` alone (the shape
  // `miniEntryList` uses) is invisible to a screen reader and unreachable by
  // Tab.
  li.tabIndex = 0;
  li.setAttribute("role", "button");
  //: A list holds only list items (WCAG 1.3.1); these rows are buttons, so the
  //: list is a group of them.
  if (!ul.hasAttribute("role")) ul.setAttribute("role", "group");
  const go = () => onOpen();
  li.addEventListener("click", go);
  li.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      go();
    }
  });
  ul.appendChild(li);
}

//: A widget with nothing to show is the empty-state recipe (DESIGN.md): one
//: sentence and one action (INBOX 464 (12): eleven were a sentence only).
//: `action` is `{ label, run, tab, sub }`: `run` is a `data-empty-action` the
//: delegated listener (navigation.js) knows, and `tab`/`sub` are where it
//: lives, which the listener opens first. `null` is a decided "nothing to do".
function dashEmpty(body, text, action) {
  const box = document.createElement("div");
  box.className = "empty-state dash-empty";
  const line = document.createElement("p");
  line.textContent = text;
  box.appendChild(line);
  if (action) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "ghost small";
    setLabel(button, action.label);
    button.dataset.emptyAction = action.run;
    if (action.tab) button.dataset.emptyTab = action.tab;
    if (action.sub) button.dataset.emptySub = action.sub;
    box.appendChild(button);
  }
  body.appendChild(box);
}

//: The Boards & maps widget lives in dash-boards.js, loaded on its first
//: draw (moved 2026-10-05 for the boot budget, INBOX 553(d)).
async function renderBoardsWidget(body) {
  if (await ensureModule("dashBoards")) await dashRenderBoards(body);
}

// --- While you were away: the night shift's morning card ---------------------
//
// WORLD_CLASS_PLAN 15, I1: "a 'While you were away' card on the Dashboard each
// morning ... each line opens a review list where every item is accept /
// dismiss / open the note". `GET /night/latest` is the card: the latest pass,
// what it found that is still visible, and the last pass that found anything
// when the latest found nothing, so a quiet night does not blank the morning.
// A line opens its review list in place (`GET /night/runs/{id}/facts`), paged,
// and each row's Dismiss is `DELETE /learned/{id}`, which also stops the same
// thing being worked out again. Accepting is keeping: there is nothing to
// press for a fact that is right.
const NIGHT_KIND_WORDS = {
  claim: ["claim", "claims"],
  question: ["open question", "open questions"],
  tension: ["claim that disagrees with another", "claims that disagree with others"],
  answered: ["question answered later", "questions answered later"],
};
const NIGHT_PAIR_LEAD = { tension: "Disagrees with", answered: "Answers" };
const NIGHT_PAGE = 5;

function nightKindWords(kind, n) {
  const [one, many] = NIGHT_KIND_WORDS[kind] || [kind, `${kind}s`];
  return `${n} ${n === 1 ? one : many}`;
}

function nightRunSummary(run) {
  const read = `Read ${run.scanned} note${run.scanned === 1 ? "" : "s"}`;
  const when = dashRelativeTime(run.finished_at || run.started_at);
  const stopped = run.stopped_reason === "budget" ? "stopped at its budget, carries on next time" : "";
  return [read, when, stopped].filter(Boolean).join(" · ");
}

function nightFactRow(fact, onGone) {
  const li = document.createElement("li");
  li.className = "night-fact";
  const text = document.createElement("span");
  text.className = "dash-list-text";
  const title = document.createElement("span");
  title.className = "dash-list-title night-fact-text";
  title.textContent = fact.text;
  const meta = document.createElement("span");
  meta.className = "dash-list-preview";
  meta.textContent = [fact.model === "local" ? "Found without a model" : fact.model, `${Math.round((fact.confidence || 0) * 100)}% sure`]
    .filter(Boolean)
    .join(" · ");
  text.append(title);
  //: A pair quotes its other side; the reason joins the facts.
  if (fact.pair && NIGHT_PAIR_LEAD[fact.kind]) {
    const other = document.createElement("span");
    other.className = "dash-list-preview night-fact-pair";
    other.textContent = `${NIGHT_PAIR_LEAD[fact.kind]}: “${fact.pair.text || ""}”`;
    text.append(other);
    if (fact.pair.reason) meta.textContent = [fact.pair.reason, meta.textContent].join(" · ");
  }
  text.append(meta);
  const actions = document.createElement("span");
  actions.className = "night-fact-actions";
  if (fact.pair && fact.pair.entry_id) {
    const openOther = document.createElement("button");
    openOther.type = "button";
    openOther.className = "ghost small icon-only";
    const otherLabel = fact.kind === "answered" ? "Open the note with the question" : "Open the other note";
    openOther.title = otherLabel;
    openOther.setAttribute("aria-label", otherLabel);
    setLabel(openOther, "ph:arrows-left-right");
    openOther.addEventListener("click", () => flashEntry(fact.pair.entry_id));
    actions.append(openOther);
  }
  //: Accept a tension: the `contradicts` link (I1, the existing accept path).
  if (fact.kind === "tension" && fact.pair && fact.pair.entry_id) {
    const keep = document.createElement("button");
    keep.type = "button";
    keep.className = "ghost small icon-only";
    keep.title = "Link the two notes as disagreeing";
    keep.setAttribute("aria-label", "Link the two notes as disagreeing");
    setLabel(keep, "ph:link");
    keep.addEventListener("click", async () => {
      keep.disabled = true;
      try {
        await apiJson("/entries/tensions/accept", {
          method: "POST",
          body: JSON.stringify({ earlier_id: fact.pair.entry_id, later_id: fact.entry_id }),
        });
        toast("Linked as disagreeing");
      } catch (error) {
        keep.disabled = false;
        toast(error.message || "Couldn't link those notes.", true);
      }
    });
    actions.append(keep);
  }
  const open = document.createElement("button");
  open.type = "button";
  open.className = "ghost small icon-only";
  open.title = "Open the note this came from";
  open.setAttribute("aria-label", "Open the note this came from");
  setLabel(open, "ph:arrow-square-out");
  open.addEventListener("click", () => flashEntry(fact.entry_id));
  const dismiss = document.createElement("button");
  dismiss.type = "button";
  dismiss.className = "ghost small icon-only";
  dismiss.title = "Dismiss, and never work this out again";
  dismiss.setAttribute("aria-label", "Dismiss, and never work this out again");
  setLabel(dismiss, "ph:x");
  dismiss.addEventListener("click", async () => {
    dismiss.disabled = true;
    try {
      await api(`/learned/${fact.id}`, { method: "DELETE" });
      li.remove();
      onGone();
    } catch (error) {
      dismiss.disabled = false;
      toast(error.message || "Couldn't dismiss that.", true);
    }
  });
  actions.append(open, dismiss);
  li.append(text, actions);
  return li;
}

//: One line of the card: the count, a disclosure that opens the review list
//: under it. The list pages by NIGHT_PAGE; "Show more" reads the next page.
function nightKindLine(host, runId, kind, count) {
  const li = document.createElement("li");
  li.className = "night-kind";
  const toggle = document.createElement("button");
  toggle.type = "button";
  toggle.className = "ghost small night-kind-toggle";
  toggle.setAttribute("aria-expanded", "false");
  const label = () => setLabel(toggle, `ph:caret-right ${nightKindWords(kind, count)}`);
  label();
  const list = document.createElement("ul");
  list.className = "dash-list night-facts hidden";
  list.id = `night-facts-${runId}-${kind}`;
  toggle.setAttribute("aria-controls", list.id);
  const more = document.createElement("button");
  more.type = "button";
  more.className = "ghost small night-more hidden";
  more.textContent = "Show more";
  let offset = 0;
  let loaded = false;
  const gone = () => {
    count -= 1;
    offset = Math.max(0, offset - 1);
    label();
    if (count <= 0) li.remove();
  };
  const page = async () => {
    more.disabled = true;
    try {
      const reply = await apiJson(`/night/runs/${runId}/facts?kind=${encodeURIComponent(kind)}&limit=${NIGHT_PAGE}&offset=${offset}`, { silent: true });
      for (const fact of reply.items || []) list.appendChild(nightFactRow(fact, gone));
      offset += (reply.items || []).length;
      more.classList.toggle("hidden", offset >= (reply.total || 0));
    } catch (error) {
      toast(error.message || "Couldn't read that list.", true);
    } finally {
      more.disabled = false;
    }
  };
  toggle.addEventListener("click", async () => {
    const open = toggle.getAttribute("aria-expanded") !== "true";
    toggle.setAttribute("aria-expanded", String(open));
    list.classList.toggle("hidden", !open);
    if (open && !loaded) {
      loaded = true;
      await page();
    }
    if (!open) more.classList.add("hidden");
    else more.classList.toggle("hidden", offset >= count);
  });
  more.addEventListener("click", () => page());
  li.append(toggle, list, more);
  host.appendChild(li);
}

//: The card, then the open questions count and the oldest one (I3).
async function renderNightWidget(body) {
  await renderNightCard(body);
  let summary;
  try {
    summary = await apiJson("/questions/summary", { silent: true });
  } catch {
    return;
  }
  if (!summary || !summary.open) return;
  const line = document.createElement("p");
  line.className = "muted night-questions";
  const oldest = summary.oldest;
  const words = `${summary.open} open question${summary.open === 1 ? "" : "s"}`;
  line.textContent = oldest ? `${words}. The oldest: “${oldest.text}”` : `${words}.`;
  const open = document.createElement("button");
  open.type = "button";
  open.className = "ghost small";
  setLabel(open, "ph:question See your questions");
  open.addEventListener("click", async () => {
    await switchTab("notes");
    showNotesSection("questions");
  });
  const row = document.createElement("div");
  row.className = "row night-questions-row";
  row.append(line, open);
  body.appendChild(row);
}

async function renderNightCard(body) {
  let card;
  try {
    card = await apiJson("/night/latest", { silent: true });
  } catch {
    surfaceFailed(body, "what Atlas found", () => renderNightWidget(body));
    return;
  }
  if (!card.run) {
    const empty = document.createElement("div");
    empty.className = "empty-state";
    const line = document.createElement("p");
    line.textContent = "Atlas has not read your notes on its own yet.";
    const run = document.createElement("button");
    run.type = "button";
    run.className = "ghost small";
    setLabel(run, "ph:moon-stars Read my notes now");
    run.addEventListener("click", async () => {
      run.disabled = true;
      try {
        const reply = await apiJson("/night/run", { method: "POST", body: JSON.stringify({}) });
        if (reply.paused) toast("Reading on its own is switched off in Settings, What it learned.");
      } catch (error) {
        toast(error.message, true);
      }
      body.replaceChildren();
      renderNightWidget(body);
    });
    empty.append(line, run);
    body.appendChild(empty);
    return;
  }
  const summary = document.createElement("p");
  summary.className = "muted night-summary";
  summary.textContent = nightRunSummary(card.run);
  body.appendChild(summary);
  let shown = card.run;
  let counts = card.counts || {};
  if (!Object.keys(counts).length) {
    if (!card.previous) {
      dashEmpty(body, "Nothing new since it last read. Claims, open questions and notes that disagree show up here.", null);
      return;
    }
    shown = card.previous;
    counts = card.previous.counts || {};
    const earlier = document.createElement("p");
    earlier.className = "muted";
    earlier.textContent = `Nothing new last time. ${dashRelativeTime(shown.finished_at || shown.started_at)}, it found:`;
    body.appendChild(earlier);
  }
  const kinds = document.createElement("ul");
  kinds.className = "night-kinds";
  for (const kind of Object.keys(counts).sort()) nightKindLine(kinds, shown.id, kind, counts[kind]);
  body.appendChild(kinds);
}

// --- Recent activity: the event feed, read with its cursor ---------------------
//
// `GET /events` reads forwards from a cursor (WORLD_CLASS_PLAN B1). The first
// render asks for the newest few with `tail`; every later render asks only for
// what came after the cursor it was handed, so reopening the dashboard reads
// the handful of new rows rather than the log again. No timer: the widget is
// redrawn when the dashboard is, and an idle tab polling a log for a strip
// nobody is looking at is the cost INBOX 266 (7) took out of this app.
const DASH_ACTIVITY_KINDS = "entry,document,board,reminder";
const DASH_ACTIVITY_ROWS = 8;
let dashActivity = { items: [], cursor: null };

const DASH_ACTIVITY_NOUNS = { entry: "Note", document: "Document", board: "Board", reminder: "Reminder" };

async function dashActivityItems() {
  const first = dashActivity.cursor === null;
  const path = first
    ? `/events?tail=${DASH_ACTIVITY_ROWS}&entity_type=${DASH_ACTIVITY_KINDS}`
    : `/events?since=${dashActivity.cursor}&entity_type=${DASH_ACTIVITY_KINDS}`;
  const feed = await apiJson(path, { silent: true });
  dashActivity = {
    items: [...dashActivity.items, ...(feed.items || [])].slice(-DASH_ACTIVITY_ROWS),
    cursor: feed.cursor ?? dashActivity.cursor ?? 0,
  };
  return dashActivity.items;
}

async function renderActivityWidget(body) {
  let items;
  try {
    items = await dashActivityItems();
  } catch {
    surfaceFailed(body, "recent activity", () => renderActivityWidget(body));
    return;
  }
  if (!items.length) {
    dashEmpty(body, "What you and Atlas change in the notebook shows up here.", { label: "ph:plus New note", run: "capture" });
    return;
  }
  const entries = await dashEntries().catch(() => []);
  const byId = new Map(entries.map((entry) => [entry.id, entry]));
  const ul = document.createElement("ul");
  ul.className = "dash-list";
  for (const item of [...items].reverse()) {
    const entry = item.entity_type === "entry" || item.entity_type === "board" ? byId.get(item.entity_id) : null;
    const noun = DASH_ACTIVITY_NOUNS[item.entity_type] || "Item";
    const name = entry ? clipText(notePreviewText(entry.content || "").split("\n")[0], 60) : "";
    const verb = HISTORY_ACTION_WORDS[item.action] || item.action.replace(/_/g, " ");
    //: A compacted run is one line, not a burst of edits (the feed's own
    //: `snapshot` count says how many it stands for).
    const run = item.snapshot ? ` (${item.snapshot} edits)` : "";
    const who = historyActorLabel(item.actor);
    const meta = [who, dashRelativeTime(item.created_at)].filter(Boolean).join(" · ");
    const open = entry && !entry.is_deleted
      ? () => flashEntry(entry.id)
      : item.entity_type === "document" && item.action !== "deleted"
        ? () => {
            switchTab("documents");
            openDocument(item.entity_id);
          }
        : null;
    const title = `${verb}${run}: ${name || noun.toLowerCase()}`;
    if (open) {
      dashActionRow(ul, { title, meta, hint: `Open this ${noun.toLowerCase()}`, onOpen: open });
      continue;
    }
    //: Something that is gone (a note deleted for good, a reminder) has
    //: nothing to open, so it is a plain row rather than a button that does
    //: nothing, which is the "dead control" the vibe check counts.
    const li = document.createElement("li");
    const text = document.createElement("span");
    text.className = "dash-list-text";
    const titleEl = document.createElement("span");
    titleEl.className = "dash-list-title";
    titleEl.textContent = title;
    const metaEl = document.createElement("span");
    metaEl.className = "dash-list-preview";
    metaEl.textContent = meta;
    text.append(titleEl, metaEl);
    li.appendChild(text);
    ul.appendChild(li);
  }
  body.appendChild(ul);
  const undo = activityUndoControl(items, byId, () => {
    //: The undo wrote a `restored` event per note; the feed reads it on the
    //: next render through its cursor, so a fresh read shows it at once.
    body.replaceChildren();
    renderActivityWidget(body);
  });
  if (undo) body.appendChild(undo);
}

//: **Undo what Atlas did** (OPEN.md events-undo, `POST /events/undo`). The
//: activity list is where a change by Atlas, a skill or the auto-filer is
//: seen, so it is where it is taken back: one ghost button under the list per
//: actor that appears in it (a `kebabMenu` when there are several), undoing
//: that actor's changes from the oldest one shown. Always the dry run first,
//: shown as the confirm dialog's body (what goes back, what is left because
//: you changed it since, what cannot be undone), then the same plan applied.
function activityActorName(actor) {
  if (actor === "system:filing") return "the auto-filer";
  if (actor === "system:librarian") return "Atlas's background pass";
  if (actor.startsWith("ai:")) return `Atlas (${actor.slice(3).split("@")[0].replace(/_/g, " ")})`;
  return historyActorLabel(actor) || actor;
}

function activityUndoPlanText(plan, byId, name) {
  const undo = plan.items.filter((item) => item.status === "undo");
  const titled = undo.slice(0, 3).map((item) => {
    const entry = byId.get(item.entity_id);
    const first = entry ? clipText(notePreviewText(entry.content || "").split("\n")[0], 40) : "";
    return first ? `“${first}”` : `note ${item.entity_id}`;
  });
  const more = undo.length > titled.length ? ` and ${undo.length - titled.length} more` : "";
  const lines = [
    `${undo.length} note${undo.length === 1 ? " goes" : "s go"} back to how ${undo.length === 1 ? "it was" : "they were"} before ${name} changed ${undo.length === 1 ? "it" : "them"}: ${titled.join(", ")}${more}.`,
  ];
  const since = plan.items.filter((item) => item.status === "changed since").length;
  if (since) lines.push(`${since} you changed since stay${since === 1 ? "s" : ""} as ${since === 1 ? "it is" : "they are"}.`);
  const cannot = plan.items.filter((item) => ["too old", "not undoable", "gone"].includes(item.status)).length;
  if (cannot) lines.push(`${cannot} can't be undone (a board item, or a change too old to have kept its values).`);
  return lines.join(" ");
}

async function undoActorFrom(actor, since, byId, rerender) {
  const name = activityActorName(actor);
  let plan;
  try {
    plan = await apiJson("/events/undo", { method: "POST", body: JSON.stringify({ actor, since }) });
  } catch (error) {
    toast(error.message || "Couldn't read what would be undone.", true);
    return;
  }
  const undoable = plan.items.filter((item) => item.status === "undo").length;
  if (!undoable) {
    const already = plan.items.every((item) => item.status === "already undone");
    toast(already ? `Already undone: nothing ${name} changed is left to put back.` : `Nothing ${name} changed can be put back from here.`);
    return;
  }
  const ok = await confirmDialog(
    `Undo what ${name} changed?\n\n${activityUndoPlanText(plan, byId, name)}`,
    { confirmLabel: "Undo", danger: false }
  );
  if (!ok) return;
  try {
    const done = await apiJson("/events/undo", {
      method: "POST",
      body: JSON.stringify({ actor, since, dry_run: false }),
    });
    toast(`Put back ${done.undone} note${done.undone === 1 ? "" : "s"}.`);
    await loadEntries().catch(() => {});
    rerender();
  } catch (error) {
    toast(error.message || "Couldn't undo that.", true);
  }
}

//: Per actor that is not the person, the oldest shown entry event that no
//: undo has reversed yet: undo from just before it, so everything that actor
//: did in the list goes back. A `restored` event in the feed names the events
//: it reversed (`undid`), and those are skipped, so the row goes once an undo
//: has put everything back instead of staying to say "Already undone".
function activityUndoStarts(items) {
  const undone = new Set();
  for (const item of items) {
    if (item.action === "restored" && Array.isArray(item.undid)) item.undid.forEach((id) => undone.add(id));
  }
  const from = new Map();
  for (const item of items) {
    if (!item.actor || item.actor === "user" || item.actor.startsWith("system:recycle")) continue;
    if (item.entity_type !== "entry" || undone.has(item.id)) continue;
    const at = from.get(item.actor);
    if (at === undefined || item.id < at) from.set(item.actor, item.id);
  }
  return from;
}

function activityUndoControl(items, byId, rerender) {
  const from = activityUndoStarts(items);
  if (!from.size) return null;
  const row = document.createElement("div");
  row.className = "row activity-undo";
  const actors = [...from.keys()];
  if (actors.length === 1) {
    const [actor] = actors;
    const button = document.createElement("button");
    button.type = "button";
    button.className = "ghost small";
    setLabel(button, `ph:arrow-counter-clockwise Undo what ${activityActorName(actor)} did`);
    button.title = "See what would go back first";
    button.addEventListener("click", () => undoActorFrom(actor, from.get(actor) - 1, byId, rerender));
    row.appendChild(button);
    return row;
  }
  const menu = kebabMenu(
    actors.map((actor) => ({
      label: `ph:arrow-counter-clockwise Undo what ${activityActorName(actor)} did`,
      run: () => undoActorFrom(actor, from.get(actor) - 1, byId, rerender),
    })),
    "Undo what Atlas did"
  );
  const label = document.createElement("span");
  label.className = "muted";
  label.textContent = "Undo what Atlas did";
  row.append(label, menu);
  return row;
}

async function renderDocumentsWidget(body) {
  // `GET /documents` is already ordered by updated_at descending, so the
  // newest-edited are simply the first rows, no client-side sort needed.
  const docs = await apiJson("/documents", { cacheMs: 4000, silent: true }).catch(() => null);
  if (!docs || !docs.length) {
    dashEmpty(body, "Write or import a document and the ones you edited last show up here.", { label: "ph:plus New document", run: "new-document", tab: "library", sub: "library-view-docs" });
    return;
  }
  const ul = document.createElement("ul");
  ul.className = "dash-list";
  for (const doc of docs.slice(0, 6)) {
    const words = doc.words ? `${doc.words.toLocaleString()} word${doc.words === 1 ? "" : "s"}` : "Empty";
    dashActionRow(ul, {
      title: doc.title || "Untitled document",
      meta: `${words} · ${dashRelativeTime(doc.updated_at)}`,
      hint: "Open this document",
      onOpen: () => {
        switchTab("documents");
        openDocument(doc.id);
      },
    });
  }
  body.appendChild(ul);
}

//: `GET /bookmarks` is already "pinned first, then newest first"
//: (routes_bookmarks.py), the same order the Library tab itself opens with,
//: so this widget and that tab can never disagree about which bookmarks
//: count as "recent". Opens the site directly, in a new tab, the same as
//: clicking a bookmark's own title in the Library does: a bookmark's one
//: job is the page behind it, not a detour through the tab that lists it.
//: `bookmarkAddress` (library.js) is not called here on purpose: this
//: widget can render before Library's own script has ever loaded (the
//: dashboard is usually the first tab open), and `bookmark.title ||
//: bookmark.url` is the same fallback the bookmark-attach pickers already
//: use (app.js, documents.js) for exactly that reason.
async function renderBookmarksWidget(body) {
  const bookmarks = await apiJson("/bookmarks", { cacheMs: 4000, silent: true }).catch(() => null);
  if (!bookmarks || !bookmarks.length) {
    dashEmpty(body, "Save a link to a website you visit often and it will show up here.", { label: "ph:link-simple Add a bookmark", run: "add-link", tab: "library", sub: "library-view-links" });
    return;
  }
  const ul = document.createElement("ul");
  ul.className = "dash-list";
  for (const bookmark of bookmarks.slice(0, 6)) {
    dashActionRow(ul, {
      title: bookmark.title || bookmark.url,
      meta: dashRelativeTime(bookmark.created_at),
      hint: `Open ${bookmark.url}`,
      onOpen: () => window.open(safeHref(bookmark.url), "_blank", "noopener,noreferrer"),
    });
  }
  body.appendChild(ul);
}

/** "3 days ago" from an ISO timestamp, with a plain date once it is old. */
//: Read through `parseServerTime` (audit 2026-10-05, FE-16): a timestamp
//: with no zone is the server's UTC, and `new Date` reads it as local time,
//: so "3 hours ago" was off by the offset. The Library and the reminders
//: read times the same way now.
function dashRelativeTime(iso) {
  const when = parseServerTime(iso);
  if (!when) return "";
  const seconds = Math.max(0, (Date.now() - when.getTime()) / 1000);
  if (seconds < 90) return "just now";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.round(hours / 24);
  if (days <= 30) return `${days} day${days === 1 ? "" : "s"} ago`;
  return when.toLocaleDateString();
}

//: A markdown task line: `- [ ]` / `* [x]` / `1. [ ]`, with the loose leading
//: whitespace real notes actually contain. Deliberately anchored per line
//: with `m` rather than scanning the whole body, so an indented sub-task
//: counts and a literal "[ ]" mid-sentence does not.
const DASH_OPEN_TASK = /^[ \t]*(?:[-*+]|\d+[.)])[ \t]+\[[ \t]\]/gm;
const DASH_DONE_TASK = /^[ \t]*(?:[-*+]|\d+[.)])[ \t]+\[[xX]\]/gm;

async function renderUnfinishedWidget(body) {
  const entries = await dashEntries();
  const withTasks = [];
  for (const entry of entries) {
    const content = entry.content || "";
    if (!content.includes("[")) continue; // cheap reject before two regexes
    // `lastIndex` is shared state on a `g` regex, so these must be reset per
    // note or every second note silently scores zero, the classic one.
    DASH_OPEN_TASK.lastIndex = 0;
    DASH_DONE_TASK.lastIndex = 0;
    const open = (content.match(DASH_OPEN_TASK) || []).length;
    if (!open) continue;
    const done = (content.match(DASH_DONE_TASK) || []).length;
    withTasks.push({ entry, open, done });
  }
  if (!withTasks.length) {
    dashEmpty(body, "Nothing outstanding. Checklists you write as “- [ ] something” appear here until they are ticked.", { label: "ph:plus New note", run: "capture" });
    return;
  }
  // Closest to finished first: a list with one box left is the one worth
  // showing, not the one someone has barely started.
  withTasks.sort((a, b) => a.open - b.open || b.done - a.done);
  const ul = document.createElement("ul");
  ul.className = "dash-list";
  for (const row of withTasks.slice(0, 6)) {
    const first = stripFrontmatter(row.entry.content || "").split("\n").find((line) => line.trim())?.trim() || "Untitled note";
    const total = row.open + row.done;
    dashActionRow(ul, {
      title: first.replace(/^#{1,6}\s+/, "").slice(0, 70),
      meta: `${row.open} left of ${total}`,
      hint: "Open this note",
      onOpen: () => flashEntry(row.entry.id),
    });
  }
  body.appendChild(ul);
}

async function renderOrphanNotesWidget(body) {
  const [entries, graph] = await Promise.all([
    dashEntries(),
    fetchDashGraph().catch(() => null),
  ]);
  // The same degree map `renderMostLinkedWidget` builds, read for its zeroes
  // instead of its peaks.
  const linked = new Set();
  for (const edge of graph?.edges || []) {
    if (typeof edge.source === "number") linked.add(edge.source);
    if (typeof edge.target === "number") linked.add(edge.target);
  }
  // A board is a note by construction here, and an empty canvas is not a
  // stranded thought. Drafts have not been filed yet by definition.
  const real = entries.filter((e) => !e.is_board && !e.is_draft && !e.map_topic);
  // **Category is deliberately not part of this test, and that is a measured
  // decision rather than an oversight.** The first cut of this widget counted
  // a note as stranded only if it had no links, no tags *and* no category, 
  // and it could never fire, because this app files every note as it is
  // saved: on a real 116-note notebook, 116 had a category. A field the app
  // fills in for you says nothing about whether *you* connected anything.
  //
  // Tags and links are the two a person actually chooses, so those are the
  // test. On that same notebook 99 of 116 notes qualified, which is why this
  // is not the list of them it started as. A widget that lists 85% of your
  // notes has told you nothing and made you scroll; the number *is* the
  // finding, so the number leads, and only a handful of oldest offenders come
  // with it as somewhere to actually start.
  const loose = real.filter((entry) => !linked.has(entry.id) && !(entry.tags || []).length);
  if (!real.length) {
    dashEmpty(body, "Write a few notes and this will show how well connected they are.", { label: "ph:plus New note", run: "capture" });
    return;
  }
  const connected = real.length - loose.length;
  const pct = Math.round((connected / real.length) * 100);

  const summary = document.createElement("p");
  summary.className = "dash-loose-summary";
  summary.textContent = loose.length
    ? `${loose.length} of ${real.length} notes have no link and no tag.`
    : `All ${real.length} notes have a link or a tag.`;
  body.appendChild(summary);

  // A meter, not a decorative bar: it carries its own value for a screen
  // reader, which a styled div cannot.
  const meter = document.createElement("div");
  meter.className = "dash-loose-meter";
  meter.setAttribute("role", "meter");
  meter.setAttribute("aria-valuemin", "0");
  meter.setAttribute("aria-valuemax", "100");
  meter.setAttribute("aria-valuenow", String(pct));
  meter.setAttribute("aria-label", `${pct}% of notes are connected`);
  const fill = document.createElement("div");
  fill.className = "dash-loose-fill";
  // A width has to be a real number here, and CSP forbids a `style`
  // attribute: a custom property set through the CSSOM is neither.
  fill.style.setProperty("--dash-loose-pct", `${pct}%`);
  meter.appendChild(fill);
  body.appendChild(meter);

  const caption = document.createElement("p");
  caption.className = "muted dash-loose-caption";
  caption.textContent = `${pct}% connected`;
  body.appendChild(caption);

  if (!loose.length) return;

  // **The widget that names the problem offers the thing that fixes it.**
  // The auto-linker lives as "Suggest links" in the Graph tab's toolbar,
  // among the graph's own display options, so the one screen that tells you
  // most of your notebook is unconnected had no way to act on it, and the
  // feature that would has to be found first. It opens the suggestions inbox
  // (suggestions-inbox.js, KG9) where it stands.
  const connect = document.createElement("button");
  connect.type = "button";
  connect.className = "ghost small dash-loose-action";
  const connectIcon = document.createElement("i");
  connectIcon.className = "ph ph-link ph-lead";
  connectIcon.setAttribute("aria-hidden", "true");
  connect.append(connectIcon, "Find links to add");
  connect.title = "Look for notes worth connecting, and approve them one by one";
  connect.addEventListener("click", () => openSuggestionsInbox("links"));
  //: And the other half of "no link and no tag" (INBOX 162): the filtered
  //: Notes list, where every card carries its own "No tags yet" chip.
  const tagIt = document.createElement("button");
  tagIt.type = "button";
  tagIt.className = "ghost small dash-loose-action";
  const tagIcon = document.createElement("i");
  tagIcon.className = "ph ph-tag ph-lead";
  tagIcon.setAttribute("aria-hidden", "true");
  tagIt.append(tagIcon, "Show untagged notes");
  tagIt.title = "The Notes list, filtered to notes with no tags";
  tagIt.addEventListener("click", () => showNotesFilter("is:untagged"));
  const actions = document.createElement("div");
  actions.className = "row dash-loose-actions";
  actions.append(connect, tagIt);
  body.appendChild(actions);
  // Oldest first: a note written this morning has not had a chance to be
  // filed yet, and nagging about it is how a hygiene widget becomes noise.
  const oldest = [...loose].sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
  miniEntryList(body, oldest.slice(0, 3), "");
}


/**
 * The Tensions doorway.
 *
 * Explains the idea and opens the review; it does **not** run one. Every
 * other widget renders from `allEntries` or one cached fetch, and a widget
 * that quietly started a model pass over the notebook every time the
 * dashboard drew would be the most expensive thing on the page.
 */
async function renderTensionsWidget(body) {
  //: WORLD_CLASS_PLAN B4: what is already known comes from the derived
  //: tensions table (`GET /entries/tensions/known`), which no model is asked
  //: to fill: a scan's findings, the night shift's, and the pairs linked as
  //: contradicting. The review itself still runs only when asked.
  const [entries, known] = await Promise.all([
    dashEntries(),
    apiJson("/entries/tensions/known?limit=3", { silent: true }).catch(() => null),
  ]);
  const counts = (known && known.counts) || {};
  const pending = (known && known.tensions) || [];
  const accepted = counts.accepted || 0;

  const blurb = document.createElement("p");
  blurb.className = "muted";
  const linked = accepted ? `${accepted} linked as contradicting` : "";
  blurb.textContent = counts.open
    ? [`${counts.open} disagreement${counts.open === 1 ? "" : "s"} to look at`, linked].filter(Boolean).join(", ") + "."
    : accepted
      ? `${accepted} place${accepted === 1 ? "" : "s"} where your notes contradict each other.`
      : "Nothing here can tell you where you changed your mind, until you look.";
  body.appendChild(blurb);

  if (pending.length) {
    const list = document.createElement("ul");
    list.className = "dash-list night-facts dash-tensions";
    const left = { n: counts.open || pending.length };
    const gone = () => {
      left.n -= 1;
      if (!list.children.length) {
        const done = document.createElement("p");
        done.className = "muted";
        done.textContent = left.n > 0 ? `${left.n} more in the review.` : "All decided.";
        list.replaceWith(done);
      }
    };
    for (const tension of pending) list.appendChild(dashTensionRow(tension, gone));
    body.appendChild(list);
  } else {
    const explain = document.createElement("p");
    explain.className = "muted dash-tension-explain";
    explain.textContent =
      "Similar-notes search finds what belongs together. This reads pairs with your local model and looks for the opposite: claims that can't both be right.";
    body.appendChild(explain);
  }

  const open = document.createElement("button");
  open.type = "button";
  open.className = "ghost small";
  const icon = document.createElement("i");
  icon.className = "ph ph-scales ph-lead";
  icon.setAttribute("aria-hidden", "true");
  open.append(icon, entries.length < 2 ? "Nothing to compare yet" : "Review disagreements");
  open.disabled = entries.length < 2;
  open.addEventListener("click", () => openSuggestionsInbox("tensions"));
  body.appendChild(open);
}

//: One known disagreement on the widget: the two notes by name, the reason,
//: and who found it when (B4's "computed by <model> at <ts>"), with the same
//: icon actions as the night card's rows: open either note, link them as
//: contradicting, or dismiss.
function dashTensionRow(tension, onGone) {
  const li = document.createElement("li");
  li.className = "night-fact";
  const text = document.createElement("span");
  text.className = "dash-list-text";
  const title = document.createElement("span");
  title.className = "dash-list-title night-fact-text";
  title.textContent = `${tension.earlier_title || "Untitled note"} and ${tension.later_title || "Untitled note"}`;
  const why = document.createElement("span");
  why.className = "dash-list-preview night-fact-pair";
  why.textContent = tension.explanation || "Linked as contradicting.";
  const meta = document.createElement("span");
  meta.className = "dash-list-preview";
  const who = tension.model === "local" ? "Found without a model" : tension.model === "person" ? "Linked by you" : `Found by ${tension.model}`;
  meta.textContent = [who, tension.computed_at ? dashRelativeTime(tension.computed_at) : ""].filter(Boolean).join(" · ");
  text.append(title, why, meta);
  const actions = document.createElement("span");
  actions.className = "night-fact-actions";
  const button = (icon, label, run) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "ghost small icon-only";
    b.title = label;
    b.setAttribute("aria-label", label);
    setLabel(b, icon);
    b.addEventListener("click", run);
    return b;
  };
  const ids = JSON.stringify({ earlier_id: tension.earlier_id, later_id: tension.later_id });
  const decide = (path, done) => async (event) => {
    const pressed = event.currentTarget;
    pressed.disabled = true;
    try {
      await apiJson(path, { method: "POST", body: ids });
      toast(done);
      li.remove();
      onGone();
    } catch (error) {
      pressed.disabled = false;
      toast(error.message || "Couldn't save that.", true);
    }
  };
  actions.append(
    button("ph:arrow-square-out", "Open the earlier note", () => flashEntry(tension.earlier_id)),
    button("ph:arrows-left-right", "Open the later note", () => flashEntry(tension.later_id)),
    button("ph:link", "Link the two notes as contradicting", decide("/entries/tensions/accept", "Linked as contradicting")),
    button("ph:x", "Not a contradiction", decide("/entries/tensions/dismiss", "Dismissed: this pair won't come back.")),
  );
  li.append(text, actions);
  return li;
}

//: **On this day.** A notebook accumulates, and the thing that makes years of
//: it worth having is being handed a page from one of them without asking.
//: Same date, earlier years and earlier months, months as well as years,
//: because a notebook two months old would otherwise never show anything and
//: an empty widget teaches you to remove it.
function renderOnThisDayWidget(body) {
  const now = new Date();
  const day = now.getDate();
  const month = now.getMonth();
  const thisYear = now.getFullYear();
  const entries = (typeof allEntries !== "undefined" ? allEntries : []).filter((entry) => {
    const at = new Date(entry.created_at);
    if (Number.isNaN(at.getTime())) return false;
    if (at.getDate() !== day) return false;
    //: A different year on the same date, or an earlier month this year. Today
    //: itself is excluded: "on this day" that returns what you wrote an hour
    //: ago is a mirror, not a memory.
    if (at.getFullYear() !== thisYear) return true;
    return at.getMonth() !== month;
  });
  if (!entries.length) {
    return dashEmpty(
      body,
      "Nothing from this date yet. What you write today comes back here next month.",
      { label: "ph:plus New note", run: "capture" },
    );
  }
  entries.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  //: Grouped by when, because "two years ago" is the fact that makes the row
  //: worth reading and a bare list of notes buries it.
  const seen = new Set();
  const shown = [];
  for (const entry of entries) {
    const at = new Date(entry.created_at);
    const years = thisYear - at.getFullYear();
    const key = years > 0 ? `${years}y` : `${month - at.getMonth()}m`;
    if (seen.has(key)) continue;
    seen.add(key);
    shown.push({ entry, when: years > 0
      ? `${years} year${years === 1 ? "" : "s"} ago`
      : `${month - at.getMonth()} month${month - at.getMonth() === 1 ? "" : "s"} ago` });
    if (shown.length >= 4) break;
  }
  const list = document.createElement("ul");
  list.className = "dash-list";
  list.setAttribute("role", "group"); // rows are buttons (dashActionRow says why)
  for (const { entry, when } of shown) {
    const li = document.createElement("li");
    li.setAttribute("role", "button");
    li.tabIndex = 0;
    const stamp = document.createElement("span");
    stamp.className = "chip dash-onthisday-when";
    chipWords(stamp, when);
    const text = document.createElement("span");
    text.className = "dash-list-text";
    renderInlineMarkdown(text, noteLabel(entry, 90), null, true);
    li.append(stamp, text);
    const open = () => flashEntry(entry.id);
    li.addEventListener("click", open);
    li.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        open();
      }
    });
    list.appendChild(li);
  }
  body.appendChild(list);
}

//: **Writing pace.** The streak widget answers "did I show up"; this answers
//: "did I write anything when I did", which is a different and more honest
//: question: a one-word note keeps a streak alive.
//:
//: A fortnight rather than a week: seven bars cannot show a trend, and a month
//: of bars in a widget column is a picket fence.
const DASH_PACE_DAYS = 14;

function renderPaceWidget(body) {
  const entries = typeof allEntries !== "undefined" ? allEntries : [];
  const days = [];
  const now = new Date();
  for (let back = DASH_PACE_DAYS - 1; back >= 0; back -= 1) {
    const at = new Date(now);
    at.setDate(now.getDate() - back);
    at.setHours(0, 0, 0, 0);
    days.push({ at, words: 0 });
  }
  const first = days[0].at.getTime();
  for (const entry of entries) {
    const at = new Date(entry.created_at);
    if (Number.isNaN(at.getTime()) || at.getTime() < first) continue;
    const index = Math.floor((at.setHours(0, 0, 0, 0) - first) / 86400000);
    if (index < 0 || index >= days.length) continue;
    days[index].words += (String(entry.content || "").match(/\S+/g) || []).length;
  }
  const total = days.reduce((sum, day) => sum + day.words, 0);
  if (!total) {
    return dashEmpty(body, "No words yet this fortnight. Anything you write today shows up here.", { label: "ph:plus New note", run: "capture" });
  }
  const peak = Math.max(...days.map((day) => day.words), 1);

  const headline = document.createElement("p");
  headline.className = "dash-pace-total";
  const strong = document.createElement("strong");
  strong.textContent = total.toLocaleString();
  headline.append(strong, ` words in ${DASH_PACE_DAYS} days · ${Math.round(total / DASH_PACE_DAYS).toLocaleString()} a day`);
  body.appendChild(headline);

  const chart = document.createElement("div");
  chart.className = "dash-pace-chart";
  chart.setAttribute("role", "img");
  chart.setAttribute(
    "aria-label",
    `Words written each day: ${days.map((d) => `${d.at.toLocaleDateString(undefined, { weekday: "short" })} ${d.words}`).join(", ")}`
  );
  for (const day of days) {
    const column = document.createElement("div");
    column.className = "dash-pace-bar";
    //: A custom property rather than an inline `style` attribute, which this
    //: app's CSP refuses: the same rule the Loose ends meter follows.
    column.style.setProperty("--dash-pace-height", `${Math.round((day.words / peak) * 100)}%`);
    column.title = `${day.at.toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "short" })}: ${day.words.toLocaleString()} word${day.words === 1 ? "" : "s"}`;
    //: Today is marked, so the row reads as ending *now* rather than as an
    //: undated fortnight.
    if (day.at.toDateString() === new Date().toDateString()) column.classList.add("is-today");
    chart.appendChild(column);
  }
  body.appendChild(chart);

  const caption = document.createElement("p");
  caption.className = "muted dash-pace-caption";
  const best = days.reduce((a, b) => (b.words > a.words ? b : a));
  caption.textContent = `Best day: ${best.at.toLocaleDateString(undefined, { weekday: "long" })}, ${best.words.toLocaleString()} words`;
  body.appendChild(caption);
}
