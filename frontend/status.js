// status.js: toasts, reminder notices, the notifications centre, undo and redo,
// the model manager, the status bar, extras, embeddings. Moved out of app.js on
// 2026-09-26 as one contiguous range (INBOX 426 cc,
// docs/roadmap/agent-remaining/appjs-split.md). A classic script sharing
// app.js's globals, loaded in app.js's old order; nothing in an earlier file
// calls into it while the page loads (scratchpad/appjs-map.js --check).

// --- toasts (Phase 5) ---------------------------------------------------------------

// --- reminders you actually notice (§36C) ------------------------------------------
//
// Reported: "reminders when they go off aren't really noticeable and need to be
// more evident, maybe through a browser or system/app notification?"
//
// The reason they were unnoticeable is simpler than it sounds: **nothing
// checked.** A reminder's only surface was a small badge on the Reminders tab
// button, painted by `updateReminderBadge`, which only ran when something
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

//: 60s, was 30. A reminder is due to the minute, so once a minute is the
//: granularity the data has; the second poll a minute bought nothing and was
//: two of the fourteen idle requests PLAN.md P1 counts against.
const REMINDER_POLL_MS = 60_000;
//: Which reminders have already been announced, so a once-a-minute poll does not
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
// MemoryMap already *produces* all of these events, a reminder comes due, a
// background task finishes, a skill run stalls, and shows each of them in its
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
//   nothing was running to record it, which is the one case a purely
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
  if (kind !== "reminder" && notificationsMuted()) return;
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

//: **Read state is a watermark, and "mark this one unread" is not.**
//:
//: Asked for directly: "also allow marking notifications as unread as well."
//: Opening the panel stamps `notificationsReadAt` with the current time, and
//: everything older than the stamp is read, which is the right model for
//: "I've seen the list" and cannot express "…except that one, I want to come
//: back to it." Rewinding the watermark to just before that item would mark
//: everything after it unread too.
//:
//: So a small set of ids sits alongside the watermark and overrides it. It
//: holds only the exceptions, which is a handful at most, and "mark all read"
//: empties it: that action means the same thing either way.
const NOTIFICATIONS_UNREAD_KEY = "notificationsForcedUnread";

function forcedUnreadIds() {
  try {
    const raw = JSON.parse(localStorage.getItem(NOTIFICATIONS_UNREAD_KEY) || "[]");
    return new Set(Array.isArray(raw) ? raw : []);
  } catch {
    return new Set(); // a corrupt override list costs the flags, not the panel
  }
}

function setForcedUnreadIds(ids) {
  try {
    //: Pruned to what is still in the history: `MAX_NOTIFICATIONS` drops old
    //: rows, and an override for a row nobody can see any more would sit in
    //: storage forever keeping the badge count wrong.
    const live = new Set(storedNotifications().map((item) => item.id));
    const kept = [...ids].filter((id) => live.has(id));
    localStorage.setItem(NOTIFICATIONS_UNREAD_KEY, JSON.stringify(kept));
  } catch {
    /* private mode: the flag just will not be remembered */
  }
}

//: **Marking one row read must not mark the rest read.** Reported: "when I
//: tick mark as complete on a single notification it does that for all of
//: them." The old code moved the *watermark* up to that row's timestamp,
//: and the watermark is "everything older than this is read", so ticking
//: the newest row silently read every row beneath it. A second override set,
//: the mirror of `forcedUnreadIds`, holds rows read *ahead* of the watermark;
//: the watermark itself only ever moves on "mark all" / opening the panel.
const NOTIFICATIONS_READ_IDS_KEY = "notificationsForcedRead";

function forcedReadIds() {
  try {
    const raw = JSON.parse(localStorage.getItem(NOTIFICATIONS_READ_IDS_KEY) || "[]");
    return new Set(Array.isArray(raw) ? raw : []);
  } catch {
    return new Set();
  }
}

function setForcedReadIds(ids) {
  try {
    const known = new Set(storedNotifications().map((n) => n.id));
    localStorage.setItem(NOTIFICATIONS_READ_IDS_KEY, JSON.stringify([...ids].filter((id) => known.has(id))));
  } catch {
    // Storage refused: the flag is lost, the panel is not.
  }
}

function isNotificationUnread(item, readAt = notificationsReadAt(), forced = forcedUnreadIds(), read = forcedReadIds()) {
  if (forced.has(item.id)) return true;
  if (read.has(item.id)) return false;
  return item.at > readAt;
}

function setNotificationUnread(id, unread) {
  const unreadIds = forcedUnreadIds();
  const readIds = forcedReadIds();
  if (unread) { unreadIds.add(id); readIds.delete(id); }
  else { unreadIds.delete(id); readIds.add(id); }
  setForcedUnreadIds(unreadIds);
  setForcedReadIds(readIds);
  renderNotificationBadge();
}

function unreadNotifications() {
  const since = notificationsReadAt();
  const forced = forcedUnreadIds();
  return storedNotifications().filter((n) => isNotificationUnread(n, since, forced));
}

function renderNotificationBadge() {
  const button = $("notif-btn");
  if (!button) return;
  const count = unreadNotifications().length;
  button.dataset.count = count > 9 ? "9+" : String(count || "");
  button.classList.toggle("has-unread", count > 0);
  const muted = notificationsMuted();
  // The bell itself says whether anything but a reminder will actually get
  // through: asked for directly, so muting isn't a setting you have to
  // remember you turned on three screens away.
  setLabel(button, muted ? "ph:bell-slash" : "ph:bell");
  button.setAttribute(
    "aria-label",
    (count ? `Notifications: ${count} unread` : "Notifications") +
      (muted ? " (muted except reminders)" : "")
  );
}

// The mute toggle's own state, kept in sync wherever it's shown: the bell
// icon above, and this button inside the panel it opens.
function renderNotifMuteToggle() {
  const button = $("notif-mute-toggle");
  if (!button) return;
  const muted = notificationsMuted();
  setLabel(button, muted ? "ph:bell-slash" : "ph:bell");
  // button.textContent = muted ? "Bell Unmute" : "bell slash Mute";
  button.title = muted
    ? "Stop muting: everything will notify again"
    : "Mute notifications except reminders";
  button.setAttribute("aria-pressed", String(muted));
  //: Icon-only since the head lost its second row, so the tooltip is no
  //: longer backed by a visible word, the accessible name has to carry it.
  button.setAttribute("aria-label", button.title);
  button.classList.toggle("active", muted);
}

async function toggleNotificationMute() {
  const next = !notificationsMuted();
  prefsCache = await apiJson("/preferences", {
    method: "PUT",
    body: JSON.stringify({ notifications_muted_except_reminders: next }),
  });
  renderNotifMuteToggle();
  renderNotificationBadge();
}

$("notif-activity-mode")?.addEventListener("change", async (event) => {
  const value = event.currentTarget.value === "centre" ? "centre" : "toasts";
  try {
    prefsCache = await apiJson("/preferences", {
      method: "PUT",
      body: JSON.stringify({ agent_activity_notices: value }),
    });
  } catch (error) {
    toast(error.message || "Couldn't save that.", true);
  }
  renderAgentActivityMode();
});

//: Which icon a kind gets. Colour alone is never the signal (DESIGN.md), and
//: these read as a list of *kinds* rather than a list of times.
const NOTIFICATION_ICONS = {
  reminder: "ph:alarm",
  task: "ph:gear",
  run: "ph:lightning",
  error: "ph:warning",
  export: "ph:download-simple",
  assist: "ph:sparkle",
  info: "•",
};

//: `keepWatermark`: a re-render from a row's own read/unread toggle must
//: not also stamp the "seen everything" watermark: that is what made one
//: tick mark every unread row as read (reported twice).
async function openNotifications({ keepWatermark = false } = {}) {
  const panel = $("notif-panel");
  const list = $("notif-list");
  panel.classList.remove("hidden");
  renderNotifMuteToggle();
  renderAgentActivityMode();

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
  //: The count, beside the word it qualifies. The bell in the header already
  //: carries it, but the bell is what you clicked to get here, inside the
  //: panel the number has to say how many of the rows below are new.
  const forced = forcedUnreadIds();
  const chip = $("notif-unread");
  if (chip) {
    const unread = items.filter((item) => isNotificationUnread(item, readAt, forced)).length;
    chip.textContent = unread > 99 ? "99+" : String(unread);
    chip.classList.toggle("hidden", unread === 0);
    chip.title = `${unread} unread`;
  }
  list.replaceChildren();
  //: **An empty state, not a paragraph.** Reported with a screenshot: three
  //: lines of muted prose filled the panel where nothing had happened, which
  //: reads as an error message rather than as calm. The shape every other
  //: empty surface in this app uses, a glyph, a short line, and the
  //: explanation underneath in small text, says the same thing in a glance.
  if (!items.length) {
    const empty = document.createElement("li");
    empty.className = "notif-empty";
    const glyph = document.createElement("span");
    glyph.className = "notif-empty-icon";
    setLabel(glyph, "ph:bell-simple");
    glyph.setAttribute("aria-hidden", "true");
    const headline = document.createElement("p");
    headline.className = "notif-empty-title";
    headline.textContent = "You're all caught up";
    const sub = document.createElement("p");
    sub.className = "muted text-sm notif-empty-sub";
    sub.textContent =
      "Reminders that come due, finished background jobs and runs that " +
      "stopped early collect here.";
    empty.append(glyph, headline, sub);
    list.appendChild(empty);
  }
  for (const item of items) {
    const row = document.createElement("li");
    row.className = "notif-row";
    const unread = isNotificationUnread(item, readAt, forced);
    if (unread) row.classList.add("notif-unread");

    const icon = document.createElement("span");
    icon.className = "notif-icon";
    setLabel(icon, NOTIFICATION_ICONS[item.kind] || NOTIFICATION_ICONS.info);
    icon.setAttribute("aria-hidden", "true");

    const body = document.createElement("div");
    body.className = "notif-body";
    //: Title and time on one line, detail underneath. Reported with a
    //: screenshot: the time was glued to the end of a three-line detail
    //: and the title wrapped under a 2.25rem "mark read" button: the row
    //: read as a paragraph with a random button, not as a notification.
    const head = document.createElement("div");
    head.className = "notif-row-head";
    const title = document.createElement("span");
    title.className = "notif-title";
    setLabel(title, item.title);
    const time = document.createElement("time");
    time.className = "notif-time muted";
    time.dateTime = new Date(item.at).toISOString();
    time.textContent = relativeTime(time.dateTime);
    time.title = new Date(item.at).toLocaleString();
    head.append(title, time);
    body.append(head);
    if (item.detail) {
      const meta = document.createElement("div");
      meta.className = "notif-meta muted";
      meta.textContent = item.detail;
      body.append(meta);
    }
    row.append(icon, body);

    //: The dot is the control. A row is either new or it is not, so this is a
    //: two-state toggle rather than a menu, and it sits where the "new"
    //: marker already is, so pressing the thing that says "unread" is what
    //: changes whether it is unread. `stopPropagation` because the row itself
    //: may navigate somewhere, and "keep this for later" is the opposite of
    //: "take me there now".
    const readToggle = document.createElement("button");
    readToggle.type = "button";
    readToggle.className = "ghost small icon-only notif-read-toggle";
    readToggle.setAttribute("aria-pressed", String(unread));
    readToggle.title = unread ? "Mark as read" : "Mark as unread";
    readToggle.setAttribute("aria-label", readToggle.title);
    setLabel(readToggle, unread ? "ph:circle" : "ph:check-circle");
    readToggle.addEventListener("click", (event) => {
      event.stopPropagation();
      // Reported: "the individual mark as complete buttons don't work". A
      // row from before ids were stamped has no `item.id`, so the override
      // set had nothing to add and the click changed nothing visible. Stamp
      // one from its timestamp, stable across renders, unique enough.
      if (item.id == null) {
        item.id = `n-${item.at}`;
        const all = storedNotifications();
        const same = all.find((entry) => entry.at === item.at && entry.id == null);
        if (same) { same.id = item.id; localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(all)); }
      }
      setNotificationUnread(item.id, !unread);
      openNotifications({ keepWatermark: true });
    });
    row.append(readToggle);

    // A notification you cannot act on is a notification you learn to ignore.
    if (item.action && (item.action.tab || item.action.exports || item.action.panel || item.action.settings)) {
      row.classList.add("notif-actionable");
      row.tabIndex = 0;
      row.title = item.action.exports ? "Open the exports folder" : "Open";
      const go = () => {
        closeNotifications();
        if (item.action.panel) {
          reopenAnswerPanel(item.action);
          return;
        }
        if (item.action.settings) {
          openSettingsModal(item.action.settings);
          return;
        }
        if (item.action.exports) {
          openExportsFromNotification();
          return;
        }
        if (item.action.filter) {
          showNotesFilter(item.action.filter);
          return;
        }
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
  //
  // The overrides survive it: a row deliberately kept unread must not be
  // cleared by looking at the panel, or "mark as unread" would last exactly
  // until the next time the bell is opened, which is no time at all.
  // The watermark moves on *close*, not on open (see closeNotifications):
  // while the panel is up, an unread row stays unread, so ticking one row
  // changes one row. Opening used to stamp it, and the next re-render, 
  // the one a tick causes, then showed every row as read (reported twice
  // as "mark one, all get marked").
  renderNotificationBadge();
}

function closeNotifications() {
  const panel = $("notif-panel");
  if (panel.classList.contains("hidden")) return;
  panel.classList.add("hidden");
  // Closing the panel is reading it: everything shown is now old news,
  // except rows deliberately kept unread (the override set survives).
  localStorage.setItem(NOTIFICATIONS_READ_KEY, String(Date.now()));
  renderNotificationBadge();
}

// Asked when a reminder is SET, not on first load. A permission prompt with no
// context is refused by default, and a refusal is close to permanent, the
// browser will not ask again, and most people never find the site settings.
function askNotificationPermission() {
  if ("Notification" in window && Notification.permission === "default") {
    Notification.requestPermission().catch(() => {});
  }
}

// A reminder firing had only a toast (5.5s, gone if you looked away) and an
// OS notification that never arrives without permission having been granted
// earlier. Reported directly: "half the time when reminders go off I don't
// actually notice". A short chime is a third, independent channel, audible
// with the tab backgrounded, and unlike the OS notification needs no
// permission at all.
//
// Created lazily on the first real user gesture rather than eagerly on load:
// browsers refuse to start an AudioContext with sound before one, and
// `checkDueReminders` runs off a timer with no gesture of its own. The
// context, once unlocked this way, keeps working for timer-driven calls for
// the rest of the session, the unlock is per-context, not per-call.
let reminderAudioCtx = null;
function primeReminderAudio() {
  if (reminderAudioCtx) return;
  try {
    reminderAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
  } catch {
    // No Web Audio support, reminders still show as a toast/notification.
  }
}
document.addEventListener("pointerdown", primeReminderAudio, { once: true });
document.addEventListener("keydown", primeReminderAudio, { once: true });

function playReminderChime() {
  if (!reminderAudioCtx) return;
  reminderAudioCtx.resume().catch(() => {});
  const now = reminderAudioCtx.currentTime;
  // Two short notes, rising, reads as "an alert" rather than a UI click,
  // without being long or harsh enough to be reached for on a repeat.
  for (const [i, freq] of [523.25, 659.25].entries()) {
    const osc = reminderAudioCtx.createOscillator();
    const gain = reminderAudioCtx.createGain();
    osc.type = "sine";
    osc.frequency.value = freq;
    const start = now + i * 0.14;
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(0.18, start + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, start + 0.32);
    osc.connect(gain).connect(reminderAudioCtx.destination);
    osc.start(start);
    osc.stop(start + 0.34);
  }
}

//: How long a system notification stays up before this app closes it itself.
//: Reported as notifications that "never auto close and stay open until the
//: user closes them", which is exactly what a `Notification` does when
//: nobody calls `close()` on it: the banner's own fade is the *shell's*
//: behaviour, and the notification object outlives it, sitting in the OS
//: notification centre (and, in the desktop WebView, sometimes on screen)
//: until dismissed by hand. The web platform has no `timeout` option, so the
//: only way to auto-close one is to close it.
//:
//: Longer than a toast's 5.5s because a system notification is for the case
//: where the app is not the window you are looking at.
const NOTIFICATION_AUTOCLOSE_MS = 12000;

function notify(title, body) {
  if ("Notification" in window && Notification.permission === "granted") {
    try {
      const shown = new Notification(title, {
        body,
        icon: "/favicon.svg",
        tag: "memorymap",
      });
      setTimeout(() => {
        try {
          shown.close();
        } catch {
          // A notification the OS already disposed of. Closing twice is not
          // an error worth a line in the console.
        }
      }, NOTIFICATION_AUTOCLOSE_MS);
      return true;
    } catch {
      // Some embedded shells expose the constructor and then throw. Falling
      // through to the toast is the point of returning a boolean.
    }
  }
  return false;
}

// The count in the title bar, the one surface that works while the app is in
// a background tab, which is where it usually is when a reminder comes due.
const BASE_TITLE = "MemoryMap AI";
function setTitleCount(count) {
  document.title = count > 0 ? `(${count}) ${BASE_TITLE}` : BASE_TITLE;
}

async function checkDueReminders() {
  // Before the unlock there is no token, and asking anyway is a guaranteed 401
  // on every load: visible in the browser's network log, and in the server's
  // own log, where it looks like an auth failure worth investigating.
  if (!authToken()) return;
  //: Open ones only. The route orders by `due_at` ascending with ticked-off
  //: rows included by default, so this poll's one page was the *oldest*
  //: reminders, done or not: a notebook whose oldest two hundred were done
  //: never heard about the one due now. Without the done rows the page is
  //: the soonest open reminders, which is exactly what "is anything due"
  //: asks, and it is smaller.
  const all = await apiJson("/reminders?include_done=false", { silent: true }).catch(() => null);
  if (!all) return; // server asleep or locked, say nothing rather than guess
  const now = Date.now();
  const due = all.filter((r) => !r.done && new Date(r.due_at).getTime() <= now);
  updateReminderBadge(all);
  setTitleCount(due.length);

  const already = announcedReminders();
  const fresh = due.filter((r) => !already.has(r.id));
  if (!fresh.length) return;
  rememberAnnounced(fresh.map((r) => r.id));
  playReminderChime();
  //: The companion holds up a small bell (avatars.js).
  if (typeof nameMarkBuddyCue === "function") nameMarkBuddyCue("bell");

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
    if (!notify("Reminder", text)) toast(text, false, { exempt: true });
  } else {
    const summary = `${fresh.length} reminders are due`;
    if (!notify("MemoryMap", summary)) toast(summary, false, { exempt: true });
  }
  // Always in-app as well as out: a system notification can be suppressed by
  // Do Not Disturb without the app ever knowing.
  if ("Notification" in window && Notification.permission === "granted") {
    toast(
      fresh.length === 1 ? fresh[0].text : `${fresh.length} reminders are due`,
      false,
      { exempt: true }
    );
  }
  loadReminders().catch(() => {});
}

function startReminderWatch() {
  checkDueReminders();
  setInterval(checkDueReminders, REMINDER_POLL_MS);
  // A machine that was asleep wakes up with reminders long past due, and the
  // interval will not have run. Checking on focus catches that immediately
  // rather than up to a minute later.
  window.addEventListener("focus", () => checkDueReminders());
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) checkDueReminders();
  });
}

// Asked directly: "an option to mute notifications except for reminders".
// A reminder toast passes `exempt: true` so it still gets through; an error
// always does too: silencing a real failure would hide the thing muting is
// least meant to hide. Everything else (background jobs, agent runs, general
// activity) is what the toggle actually quiets.
function notificationsMuted() {
  return Boolean(prefsCache && prefsCache.notifications_muted_except_reminders);
}

//: **Where the AI's own activity is announced.**
//:
//: Asked for directly: *"make an option for agent activity notifications to be
//: hidden and not show up as toast notifications but somewhere else."* The
//: somewhere else already existed, the notifications centre records every one
//: of these: so this is only about whether a toast also flies past the corner
//: of the screen while you are reading something.
//:
//: Deliberately not the existing mute: that one suppresses the *record* as
//: well, so a muted app forgets what it did. This keeps the history and drops
//: the interruption, which is what was actually asked for.
function agentActivityQuiet() {
  return (prefsCache && prefsCache.agent_activity_notices) === "centre";
}

//: One call for "the AI did something worth mentioning". Always recorded,
//: shown as a toast only when the reader wants them. Every background-job and
//: run notice goes through this rather than `toast` directly: a rule that
//: only some of them followed would be a setting that half works.
function agentActivityNotice(message, { isError = false, kind = "task", detail = "", action = null, onOpen = null } = {}) {
  recordNotification({ kind: isError ? "error" : kind, title: message, detail, action });
  //: **Both switches bind here, errors included.** Reported twice: "the agent
  //: activity straight up ignores muted notifications even when on panel only"
  //: and "notifications for the background agent appeared when I had them
  //: muted??".
  //:
  //: `toast()` lets an error through whatever the mute says, and that is right
  //: for a *failure the user caused and is waiting on*, a save that did not
  //: save. It is wrong here: a background pass failing to tag a note is
  //: precisely the unattended chatter these two settings exist to quiet, and
  //: the notifications centre above has already recorded it, so nothing is
  //: lost by not flying it past the corner of the screen.
  if (agentActivityQuiet() || notificationsMuted()) return;
  //: A notice with somewhere to go carries the way there on the toast as
  //: well as on its row in the bell, so the reader who sees it fly past does
  //: not have to open the bell to act on it.
  if (onOpen) toastAction(message, "Open", onOpen);
  else toast(message, isError);
}

//: **An answer that finished while its panel was shut** (the owner,
//: 2026-09-23: "if an AI response is started in the popup agent or the Atlas
//: guide and the user closes the panel before it finishes, post a
//: notification"). Closing either panel never stopped the run, the answer was
//: still written into a transcript nobody could see, and nothing said it had
//: arrived. Called by both panels at the end of a turn, only when that panel
//: is closed at that moment: a panel that is open is its own notice.
//:
//: The action is plain data because notifications live in localStorage: the
//: panel's name and the answer's id, which `reopenAnswerPanel` turns back
//: into "open the panel on that answer". After a reload the transcript is
//: gone and the id finds nothing, so it opens the panel and stops there.
const ANSWER_PANEL_NAMES = { agent: "Popup agent", guide: "Atlas" };

function noticeUnwatchedAnswer(panel, question, answerId, { failed = false } = {}) {
  const who = ANSWER_PANEL_NAMES[panel];
  if (!who) return;
  const action = { panel, answer: answerId || "" };
  agentActivityNotice(
    failed ? `${who} could not answer: ${agentRunTitle(question)}` : `${who} answered: ${agentRunTitle(question)}`,
    {
      isError: failed,
      detail: "Open it to read the answer.",
      action,
      onOpen: () => reopenAnswerPanel(action),
    },
  );
}

function reopenAnswerPanel({ panel, answer } = {}) {
  let list = null;
  if (panel === "agent") {
    if (cmdPaletteOverlay.classList.contains("hidden")) toggleAgentPalette();
    list = cmdPaletteResults;
  } else if (panel === "guide") {
    if (typeof openHelpChat === "function") openHelpChat();
    list = $("help-chat-messages");
  }
  if (!list || !answer) return;
  const row = [...list.querySelectorAll("[data-answer-id]")].find((el) => el.dataset.answerId === answer);
  if (!row) return;
  //: The list's own scrollTop, never `scrollIntoView`, which walks every
  //: scrolling ancestor and moves the page under the panel (DESIGN.md's
  //: recipe for a list that says where you are). After a frame, because the
  //: guide's sheet is built by the call above and has no size until then.
  requestAnimationFrame(() => {
    list.scrollTop += row.getBoundingClientRect().top - list.getBoundingClientRect().top;
  });
}

function renderAgentActivityMode() {
  const select = $("notif-activity-mode");
  if (!select) return;
  select.value = agentActivityQuiet() ? "centre" : "toasts";
}

// Asked for directly: "allow popup notifications to be manually closable
// with an x button if the user wants them gone faster". A toast that has
// already been read is just something left to wait out otherwise, the
// timer clears when this fires, so a stray late setTimeout can't reach for
// a note the click already removed.
//: **A toast leaves the way it came** (INBOX 399 (4)): it fades and drops
//: 4px on the same curve it arrived on (`.toast.is-leaving`,
//: 01-forms-settings.css) rather than vanishing between two frames, which
//: read as the corner of the window glitching. Removed on `animationend`, with
//: a timer behind it for the case where no animation runs at all.
function dismissToast(note) {
  if (!note.isConnected || note.classList.contains("is-leaving")) return;
  note.classList.add("is-leaving");
  const done = () => note.remove();
  note.addEventListener("animationend", done, { once: true });
  setTimeout(done, 400);
}

function toastCloseButton(note, timer) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "toast-close";
  setLabel(button, "ph:x");
  button.title = "Dismiss";
  button.setAttribute("aria-label", "Dismiss this notification");
  button.addEventListener("click", () => {
    clearTimeout(timer);
    dismissToast(note);
  });
  return button;
}

//: The last toast's text and when it landed, so a click that somehow fires
//: two handlers for one gesture (CM6's own event dispatch does not always
//: agree with a plain DOM `stopPropagation` about which handler runs) shows
//: one notice, not two stacked identical ones. Reported on a wiki-link
//: click: `[[Act I, Scene I]]` toasted the same "not found" message twice.
//: A real repeat within the window is rare enough (nobody clicks a broken
//: link twice inside 400ms on purpose) that this costs nothing anyone would
//: notice, and it is the whole message plus severity that must match, not
//: just the timing, so two different toasts arriving close together both
//: still show.
//: Where a support bundle goes; the same string as `memorymap.SUPPORT_EMAIL`
//: (tests/test_support_email.py keeps them equal).
const SUPPORT_EMAIL = "brayden.hoyle@outlook.com";

//: **A report by email, with the bundle saved first** (INBOX 256, the owner:
//: "suggest that they download the support bundle and send it to my email
//: ... even open the email dialogue for them"). The bundle is a download,
//: never an attachment a page can add itself, so the order is: save it,
//: then open the person's mail app on a message that names the file to
//: attach. The address is also put on the clipboard, because a webview
//: without a mail handler opens nothing and says nothing.
async function emailSupportReport(about) {
  if (typeof downloadSupportBundle === "function") await downloadSupportBundle();
  //: The version is read off the page's own stamped script URL, the one
  //: thing every build carries without another request.
  const stamp = (document.querySelector('script[src*="app.js?v="]')?.getAttribute("src") || "").split("?v=")[1] || "";
  const subject = encodeURIComponent(`MemoryMap AI report${stamp ? ` (${stamp.split("-")[0]})` : ""}`);
  const body = encodeURIComponent(
    (about ? `What happened: ${about}\n\n` : "What happened: \n\n") +
      "Please attach memorymap-support-bundle.zip, which was just saved to your downloads.\n"
  );
  try {
    await navigator.clipboard?.writeText?.(SUPPORT_EMAIL);
  } catch {
    // no clipboard in this context: the address is in the toast below
  }
  const link = document.createElement("a");
  link.href = `mailto:${SUPPORT_EMAIL}?subject=${subject}&body=${body}`;
  link.rel = "noopener";
  document.body.appendChild(link);
  link.click();
  link.remove();
  toast(`Your mail app should open. The address, ${SUPPORT_EMAIL}, is on your clipboard too.`);
}

let lastToastKey = "";
let lastToastAt = 0;
function toast(message, isError = false, { exempt = false } = {}) {
  if (!exempt && !isError && notificationsMuted()) return;
  const key = `${isError ? "1" : "0"}:${message}`;
  const now = Date.now();
  if (key === lastToastKey && now - lastToastAt < 400) return;
  lastToastKey = key;
  lastToastAt = now;
  const box = $("toast-box");
  //: An error makes the companion jump (avatars.js).
  if (isError && typeof nameMarkBuddyCue === "function") nameMarkBuddyCue("startle", "error");
  const note = document.createElement("div");
  note.className = isError ? "toast error" : "toast";
  const text = document.createElement("span");
  text.textContent = message;
  note.appendChild(text);
  //: An error toast carries the way to report it (INBOX 256): one small
  //: button that saves the support bundle and opens a mail to the owner
  //: with the message already in it. Plain toasts stay plain.
  if (isError) {
    const help = document.createElement("button");
    help.type = "button";
    help.className = "ghost small toast-help";
    help.textContent = "Report this";
    help.title = `Save the support bundle and email it to ${SUPPORT_EMAIL}`;
    help.addEventListener("click", () => {
      clearTimeout(timer);
      dismissToast(note);
      emailSupportReport(message);
    });
    note.appendChild(help);
  }
  const timer = setTimeout(() => dismissToast(note), isError ? 9000 : 5500);
  note.appendChild(toastCloseButton(note, timer));
  //: A tap on the words dismisses it, the way a phone's own banners go
  //: (below 1100 a toast comes down from the top, over the head of a list,
  //: and the small close button is not the only way to clear it). Its
  //: buttons keep their own jobs.
  note.addEventListener("click", (event) => {
    if (event.target.closest("button")) return;
    clearTimeout(timer);
    dismissToast(note);
  });
  box.appendChild(note);
}

// A toast with one action button, used for Undo (Wave J). The button
// stays until clicked or the toast times out (a bit longer than usual,
// since the user has to react to it).
//: **A toast that stays until the work it is announcing finishes.**
//:
//: Reported of OCR: *"if i close the lightbox as I am generating ocr, then it
//: stops and I have to restart it again. also ocr generation is slow and i
//: dont even know if it is working."* The second half is this function's job.
//: Every other toast in the app is a 5.5-second notice about something that
//: already happened; a job that takes thirty seconds needs the opposite, a
//: notice that persists *while* it happens and then reports what it found.
//:
//: Returns a handle rather than a node: the caller finishes the job, and
//: finishing it is one call rather than a DOM edit at each of its exits.
function toastProgress(message) {
  const box = $("toast-box");
  const note = document.createElement("div");
  note.className = "toast";
  const spinner = typingDots(message);
  const text = document.createElement("span");
  text.textContent = message;
  note.append(spinner, text);
  box.appendChild(note);
  return {
    say(next) {
      text.textContent = next;
      spinner.setStatus?.(next);
    },
    //: `done` swaps the spinner for the outcome and starts the ordinary
    //: 5.5-second life every other toast has, so a finished job does not
    //: leave a permanent line on screen.
    done(finalMessage, { isError = false, actionLabel = null, onAction = null } = {}) {
      spinner.remove();
      text.textContent = finalMessage;
      note.classList.toggle("error", Boolean(isError));
      if (actionLabel && onAction) {
        const button = document.createElement("button");
        button.className = "link-button";
        button.type = "button";
        button.textContent = actionLabel;
        button.addEventListener("click", () => {
          onAction();
          dismissToast(note);
        });
        note.appendChild(button);
      }
      const timer = setTimeout(() => dismissToast(note), 5500);
      note.appendChild(toastCloseButton(note, timer));
    },
  };
}

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
    clearTimeout(timer);
    dismissToast(note);
    await onAction();
  });
  const timer = setTimeout(() => dismissToast(note), 8000);
  note.append(text, button, toastCloseButton(note, timer));
  box.appendChild(note);
}

// --- global undo/redo (status bar) ------------------------------------------------
//
// The app already had per-action undo scattered across it, a toast's Undo
// button on note/reminder delete, the whiteboard's own local history, a
// per-tool-call "put this back" in the agent panel. None of those help once
// the toast has timed out, or for the actions that never got one (linking
// two notes, editing a note's body, attaching an image). This is the one
// mechanism that catches all of it: any mutation that can name its own
// inverse calls `pushUndo(label, undo, redo)`, and the status bar's Undo/Redo
// buttons (plus Ctrl+Z/Ctrl+Shift+Z) work the two stacks below. Session-only
// by design: like the rest of this app's undo, it does not survive a reload,
// which is the same lifetime a browser's own Ctrl+Z already has.
const undoStack = [];
const redoStack = [];
const UNDO_STACK_LIMIT = 50;

function pushUndo(label, undo, redo) {
  const action = { label, undo, redo };
  undoStack.push(action);
  if (undoStack.length > UNDO_STACK_LIMIT) undoStack.shift();
  // A fresh action invalidates whatever was available to redo, the same
  // rule every text editor's undo stack already follows.
  redoStack.length = 0;
  renderUndoBar();
  return action;
}

// A few call sites also offer an immediate toast "Undo" button alongside the
// global stack (Wave J's pattern, from before this stack existed). If that
// button is used, the action has to come off the undo stack, otherwise a
// later Ctrl+Z would redo the exact same restore, since the closure runs
// fine either way and nothing stops it firing twice.
function settleUndoFromToast(action) {
  const idx = undoStack.indexOf(action);
  if (idx !== -1) undoStack.splice(idx, 1);
  redoStack.push(action);
  renderUndoBar();
}

// A `PUT /entries/{id}` before/after snapshot: the shared inverse for every
// kind of note-content edit (a manual text correction, an image attached or
// removed from the body, a tag/category change from the edit form), since
// all of them are just this one request with a different body.
function pushEntryPutUndo(entryId, label, beforeBody, afterBody) {
  pushUndo(
    label,
    async () => {
      await api(`/entries/${entryId}`, { method: "PUT", body: JSON.stringify(beforeBody) });
      await loadEntries();
    },
    async () => {
      await api(`/entries/${entryId}`, { method: "PUT", body: JSON.stringify(afterBody) });
      await loadEntries();
    }
  );
}

//: **Whose stack a press belongs to.** The board keeps its own history
//: (moves, resizes, deletes on the canvas), which the app's stack knows
//: nothing about, so while a board is open every door to undo has to lead
//: there: the status bar's two buttons, the Ctrl+Z chord, and the command
//: palette alike. Asked for directly: "make sure redo is handled too. the
//: undo and redo buttons in the bottom bar should work across the whole
//: application". Deciding it here rather than at each door is what stops the
//: three drifting: the buttons used to drive the app's stack while the chord
//: drove both.
function boardHistoryActive() {
  const board = document.getElementById("library-view-whiteboard");
  return Boolean(board && !board.classList.contains("hidden") && window.wbUndo);
}

async function performUndo() {
  if (boardHistoryActive()) {
    await window.wbUndo();
    renderUndoBar();
    return;
  }
  const action = undoStack.pop();
  if (!action) return;
  try {
    await action.undo();
    redoStack.push(action);
    toast(`Undone: ${action.label}`);
  } catch (error) {
    // Nothing changed: put it back rather than silently dropping it off
    // the stack, so a transient network error doesn't cost the undo itself.
    undoStack.push(action);
    toast(error.message || "Couldn't undo that.", true);
  }
  renderUndoBar();
}

async function performRedo() {
  if (boardHistoryActive()) {
    await window.wbRedo?.();
    renderUndoBar();
    return;
  }
  const action = redoStack.pop();
  if (!action) return;
  try {
    await action.redo();
    undoStack.push(action);
    toast(`Redone: ${action.label}`);
  } catch (error) {
    redoStack.push(action);
    toast(error.message || "Couldn't redo that.", true);
  }
  renderUndoBar();
}

function renderUndoBar() {
  const undoBtn = $("status-undo");
  const redoBtn = $("status-redo");
  if (!undoBtn || !redoBtn) return;
  //: A board's own stack has no labels to name in the tooltip (its entries
  //: are "move this shape back", not a sentence), so the pair falls back to
  //: the plain verbs while one is open, and takes its enabled state from the
  //: board's counts: a button that is lit when there is nothing behind it is
  //: the thing that makes people stop trusting it.
  const onBoard = boardHistoryActive();
  const last = onBoard ? null : undoStack[undoStack.length - 1];
  const next = onBoard ? null : redoStack[redoStack.length - 1];
  undoBtn.disabled = onBoard ? !window.wbCanUndo?.() : !last;
  redoBtn.disabled = onBoard ? !window.wbCanRedo?.() : !next;
  if (onBoard) {
    paintStatusItem("status-undo", {
      icon: "ph:arrow-u-up-left",
      title: window.wbCanUndo?.()
        ? `Undo the last change on this board (${shortcuts.undo.keys})`
        : "Nothing to undo",
    });
    paintStatusItem("status-redo", {
      icon: "ph:arrow-u-up-right",
      title: window.wbCanRedo?.()
        ? `Redo the last change on this board (${shortcuts.redo.keys})`
        : "Nothing to redo",
    });
    return;
  }
  paintStatusItem("status-undo", {
    icon: "ph:arrow-u-up-left",
    //: The right-click gesture is named here because a hidden gesture is not a
    //: feature: the same reason the nav pair's tooltips name theirs.
    title: last
      ? `Undo: ${last.label} (${shortcuts.undo.keys}): right-click for the last ${undoStack.length}`
      : "Nothing to undo",
  });
  paintStatusItem("status-redo", {
    icon: "ph:arrow-u-up-right",
    title: next ? `Redo: ${next.label} (${shortcuts.redo.keys})` : "Nothing to redo",
  });
}

$("status-undo").addEventListener("click", performUndo);
$("status-redo").addEventListener("click", performRedo);

//: **The stack you can see.** Reported: the global undo is "significantly
//: outdated and dont register a lot of actions", and the second half of that
//: is that there was no way to *look*. A single button that says "Undo: moved
//: a note to the bin" tells you the last thing and nothing about the four
//: before it, so undoing three steps is three presses into the dark.
//:
//: Right-click, the same gesture the back/forward pair already uses for their
//: own history, and named in the tooltip so it is discoverable rather than
//: folklore. Picking a row undoes everything down to and including it, which
//: is what a history list means everywhere else.
function openUndoHistoryMenu(anchorEl) {
  const menu = $("undo-history-menu");
  if (!menu) return;
  menu.replaceChildren();
  if (!undoStack.length) return;
  const list = document.createElement("ul");
  list.className = "action-menu-list";
  //: Newest first, because the newest is the one you are almost always
  //: reaching for and a list you have to read upwards is a list you misread.
  [...undoStack].reverse().forEach((action, offset) => {
    const li = document.createElement("li");
    const button = document.createElement("button");
    button.type = "button";
    button.className = "action-menu-item";
    setLabel(button, `ph:arrow-u-up-left ${action.label}`);
    button.title = offset === 0 ? "Undo this" : `Undo this and the ${offset} after it`;
    button.addEventListener("click", async () => {
      menu.classList.add("hidden");
      //: One at a time through `performUndo`, so a step that fails stops the
      //: run with the stack intact rather than leaving the notebook half
      //: rolled back: the same contract a single press already has.
      for (let step = 0; step <= offset; step += 1) {
        const before = undoStack.length;
        await performUndo();
        if (undoStack.length === before) break;
      }
    });
    li.appendChild(button);
    list.appendChild(li);
  });
  menu.appendChild(list);
  menu.classList.remove("hidden");
  const margin = 8;
  const anchor = anchorEl.getBoundingClientRect();
  menu.style.left = "0px";
  const box = menu.getBoundingClientRect();
  const left = Math.min(anchor.left, window.innerWidth - margin - box.width);
  menu.style.left = `${Math.round(Math.max(margin, left))}px`;
}

$("status-undo").addEventListener("contextmenu", (event) => {
  if (!undoStack.length) return;
  event.preventDefault();
  openUndoHistoryMenu($("status-undo"));
});
wireLongPress($("status-undo"), () => {
  if (undoStack.length) openUndoHistoryMenu($("status-undo"));
});

document.addEventListener("mousedown", (event) => {
  const menu = $("undo-history-menu");
  if (!menu || menu.classList.contains("hidden")) return;
  if (!menu.contains(event.target) && event.target !== $("status-undo")) {
    menu.classList.add("hidden");
  }
});

// --- quick access: recent questions + most-used entries (Phase 5) -------------------

async function loadRecentQuestions() {
  const box = $("recent-questions");
  //: Shared with the dashboard's Recent questions widget (`cacheMs`), which
  //: asks for the same list in the same second at boot. Any write clears it.
  const questions = await apiJson("/chat/recent", { cacheMs: 30000 }).catch(() => []);
  box.replaceChildren();
  box.classList.toggle("hidden", questions.length === 0);
  if (questions.length === 0) return;
  const label = document.createElement("span");
  label.className = "muted";
  label.textContent = "Ask again:";
  box.appendChild(label);
  for (const question of questions) {
    //: The clock is what says "you asked this before" (INBOX 394 a): the chip
    //: is drawn like the suggestions beside it, so the icon carries the
    //: difference the fill used to.
    const short = question.length > 48 ? question.slice(0, 47) + "…" : question;
    const again = chip(`ph:clock-counter-clockwise ${short}`, "", () => {
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
  const entries = await apiJson("/entries/most-accessed", { cacheMs: 30000 }).catch(() => []);
  list.replaceChildren();
  box.classList.toggle("hidden", entries.length === 0);
  for (const entry of entries) {
    const li = document.createElement("li");
    li.title = entry.content;
    const text = document.createElement("span");
    // Reported directly: a clip landing mid-token (`` `code` `` cut before
    // its closing backtick) left a stray `` ` `` sitting in the rendered
    // text: `safeMdSlice` drops the dangling marker instead of the plain
    // `slice(0, 25)` this used to do.
    //
    // Block syntax stripped first. renderInlineMarkdown is inline-only, so a
    // note beginning "# Groceries" rendered the literal "# Groceries", the
    // same gap the dashboard's mini-lists had, here too since this list uses
    // the same two-function combination.
    const flat = entry.content.replace(/^\s*(?:#{1,6}\s+|>\s?|[-*+]\s+|\d+\.\s+)/gm, "");
    const { text: sliced, truncated } = safeMdSlice(flat, 25);
    renderInlineMarkdown(text, sliced, [], true);
    if (truncated) text.appendChild(document.createTextNode("…"));
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
//: The idle poll's own cadence, which doubles while nothing changes and
//: snaps back the moment something does: see the comment where it is read,
//: at the bottom of `refreshModelStatus`.
const STATUS_IDLE_MS = 30000;
const STATUS_IDLE_CEILING_MS = 120000;
let statusIdleDelay = STATUS_IDLE_MS;
//: `JSON.stringify` of the last payload. A string rather than a deep
//: compare because the payload is small, already came off the wire as one,
//: and "is this the same answer as last time" is the only question asked of
//: it.
let statusFingerprint = null;

//: Anything that means "the person is here, or something just changed":
//: the ladder starts again from the bottom. Called by the visibility
//: handler and by `kickBackgroundTaskPoll`, so a job started from this page
//: is never waiting out a two-minute idle delay.
function resetStatusCadence() {
  statusIdleDelay = STATUS_IDLE_MS;
}

// The Ollama embedding model offered as a one-click fallback when the
// built-in (sentence-transformers) engine can't load: asked for directly,
// after a real support-bundle report: the built-in engine needs
// sentence-transformers, which isn't bundled (see CLAUDE.md/requirements.txt
//, installing it has broken past sessions, and a packaged Windows build
// excludes torch on purpose), so a fresh install with no working Python on
// PATH for Settings -> Packages to fall back to has no way to make the
// built-in engine work at all. nomic-embed-text: small, well-known, and
// exactly what Settings -> Models' own "quick fix" sentence already named
// before this button existed.
const EMBEDDING_FALLBACK_MODEL = "nomic-embed-text";
let embeddingFallbackRunning = false;

function settingsOpen() {
  // The Models section lives inside the settings modal now (Wave A).
  return settingsModalOpen();
}

function jobsRunning() {
  // Anything in `GET /tasks` counts, not just the two jobs `/models/status`
  // happens to carry. This used to read re-index and pulls only, so while a
  // caption, an image OCR or an autonomous pass was running the loop stayed
  // on its 10-second idle cadence, the status bar's job slot lagged by up
  // to ten seconds behind work that often does not last that long, and the
  // finish was noticed just as late. The two below are kept as their own
  // check rather than folded in: they come from a different payload, and a
  // `/tasks` call that fails leaves `backgroundTasks` empty while a pull is
  // demonstrably still running.
  if (backgroundTasks.length) return true;
  if (!modelStatus) return false;
  const reindexing = modelStatus.reindex && modelStatus.reindex.status === "running";
  const pulling = Object.values(modelStatus.pulls || {}).some(
    (job) => job.status === "running"
  );
  return reindexing || pulling;
}

// One polling loop for everything: slow when idle, fast while a
// download/re-index is running or the settings panel is open.
//: When `/tasks` was last asked, so the idle cadence below can ask it half as
//: often as `/models/status` (PLAN.md P1; MODERNISATION_AUDIT.md F2 measured
//: 14 requests in an idle minute on the Dashboard, status ×6, tasks ×6,
//: reminders ×2: against P1's gate of ≤ 4).
let backgroundTasksAskedAt = 0;
const TASKS_IDLE_MS = 60_000;

async function refreshModelStatus() {
  // Locked: no token, so every request is a guaranteed 401, noise in both
  // logs and a wake-up of the Python process for nothing. Re-arm cheaply and
  // let the unlock path call this itself (it does, after login).
  if (!authToken()) {
    clearTimeout(statusTimer);
    statusTimer = setTimeout(refreshModelStatus, 10000);
    return;
  }
  try {
    // silent: a poll must never trigger the lock screen (Wave O fix).
    // Fast-fail timeout: if the LLM hangs, the UI reflects offline in 8s.
    // Backend's own worst case is ~5s (one list_models() call, its own
    // 5s timeout) since /models/status stopped double-probing Ollama, 
    // this leaves real headroom instead of racing that budget at the wire.
    modelStatus = await apiJson("/models/status", {
      silent: true,
      signal: AbortSignal.timeout(8000)
    });
    statusEverAnswered = true;
  } catch {
    modelStatus = null; // locked or unreachable: pill shows the worst case
  }
  //: **The feature rows ride every poll, not only Settings.** They used to be
  //: read only when Settings rendered, so until Settings had been opened once
  //: the ⋯ sheet said "Models aren't available yet" and a picker in a
  //: surface had nothing to show. The poll already carries them.
  if (modelStatus && Array.isArray(modelStatus.feature_models)) {
    featureModelRows = modelStatus.feature_models;
    featureModelNames = (modelStatus.installed_models || []).map((m) => m.name);
  }
  syncFeatureModelSelects();
  renderAiPill();
  syncModelGatedControls();
  // The status bar's job slot rides this loop rather than starting one of its
  // own, so it inherits the whole cadence: one second while something is
  // running, thirty when idle, two minutes behind a hidden tab. Idle, `/tasks`
  // is asked every other tick: a job that starts from this page kicks the poll
  // itself (`kickBackgroundTaskPoll`), so an idle minute only has to notice a
  // job started somewhere else, and once a minute is soon enough for that.
  const idle = !jobsRunning() && !settingsOpen();
  if (!idle || Date.now() - backgroundTasksAskedAt >= TASKS_IDLE_MS) {
    backgroundTasksAskedAt = Date.now();
    await refreshBackgroundTasks();
  }
  if (settingsOpen()) renderSettings();

  clearTimeout(statusTimer);
  // Back right off when the tab is hidden, no point polling a page nobody's
  // looking at (visibilitychange below refreshes the moment it's shown again).
  // Idle is 30s, not 10: the status this reports (is the model runner up,
  // which model) changes on the order of minutes, and every tick wakes the
  // process that is also running the model. Measured before: 14 requests in
  // an idle minute; the gate was 4 (status ×2, tasks ×1, reminders ×1).
  //
  //: **And then it backs off again while the answer keeps being the same**
  //: (INBOX 266, item 7, whose gate is ≤ 2 requests an idle minute). A
  //: notebook left open on a desk asked this endpoint twice a minute for as
  //: long as it stayed open, and every one of those asks reaches Ollama:
  //: `/models/status` lists the runner's models, so an idle tab was waking
  //: the model runner 2,880 times a day to be told the same thing. The
  //: doubling only applies while the payload is byte-identical to the last
  //: one, and any change at all drops it straight back to 30s, as does
  //: coming back to the tab, opening Settings, or a job starting. What it
  //: costs: on a laptop that has been idle for three minutes, Ollama
  //: starting is noticed in up to two minutes rather than up to thirty
  //: seconds, on a pill that reports a background fact. What it buys is the
  //: other 1,400 wake-ups.
  const fingerprint = JSON.stringify(modelStatus);
  if (fingerprint !== statusFingerprint) {
    statusFingerprint = fingerprint;
    statusIdleDelay = STATUS_IDLE_MS;
  } else if (!jobsRunning() && !settingsOpen() && !document.hidden) {
    statusIdleDelay = Math.min(statusIdleDelay * 2, STATUS_IDLE_CEILING_MS);
  }
  const delay = jobsRunning()
    ? 1000
    : document.hidden
      ? 120000
      : settingsOpen()
        ? 3000
        : statusIdleDelay;
  statusTimer = setTimeout(refreshModelStatus, delay);
}

// Refresh immediately when the user returns to the tab, so a status that went
// stale while hidden snaps up to date instead of waiting out the long delay.
document.addEventListener("visibilitychange", () => {
  if (!document.hidden) {
    resetStatusCadence();
    refreshModelStatus();
  }
});

// Controls that can only do their job with a chat model running. Left
// enabled, they look available and only fail once you've committed to them,
// you type a note, press AI Improve, wait, and get an apology. Disabling them
// with a reason attached says the same thing before you spend the effort.
//
//: **The list lives in the markup, not here** (INBOX 203, the owner: "many ai
//: exclusive features are still enabled even when an ai isnt available or
//: running"). It was seven ids in an array in this file, and the array was the
//: thing that fell behind: a control added to a surface months later has no
//: reason to know this file exists, so four that arrived since
//: (`improve-retry`, `extract-commit`, `doc-ai-run`, `wb-boards-generate`)
//: stayed live with no model, as did Chat's own field and Send and the
//: guide's.
//:
//: So the reason is an attribute on the control, `data-needs-model="<why>"`,
//: and this function asks the document rather than carrying a copy of it.
//: `tests/test_frontend_ids.py` holds the inventory: every control whose
//: handler reaches an AI route is listed there and must carry the attribute,
//: which is the half a grep cannot enforce on its own.
//:
//: Deliberately NOT marked: Save, Ask, search, tags, categories, the graph,
//: reminders, documents, and the meeting note's Save. Those work fully
//: without any AI and must never look diminished by its absence, the notebook
//: is the point and the AI is a helper; Ask in particular falls back to the
//: search results beside it and says so, and the meeting save summarises when
//: it can and files the note either way (`saveMeetingNote`), so disabling
//: either would take away the working half. The Library's "Map from notes"
//: (`wb-boards-generate`) was gated by the pass above and is not any more:
//: its route proposes an outline from the notebook's own filing with no model
//: running, and says so (`WORKS_WITHOUT_A_MODEL` in test_frontend_ids.py).

//: **The one sentence a disabled AI control says** (CHAT_PLAN.md decision 11:
//: "every AI control is visible, disabled, with a tooltip 'Connect a model in
//: Settings' and a one-click link"). It named Ollama before,
//: which is one of the three providers this app supports and tells somebody
//: running llama.cpp or an OpenAI-compatible server to start the wrong thing. Settings is where all three are set up, so Settings is what a
//: control points at.
const AI_OFFLINE_HINT = "Connect a model in Settings";

//: Unknown status (locked, still loading) is available: better to let a click
//: fail than to grey out a working button on a slow start.
function aiIsOff() {
  return modelStatus ? modelStatus.ollama_running === false : false;
}

//: **Why this restores rather than enables.** The status poll runs this every
//: tick, one second while a job is going, and some of the gated controls have a
//: busy state of their own: Save notes is disabled until the extract has notes
//: to save and again while it saves, the guide's Ask is disabled for the length
//: of a question. A plain `disabled = off` would hand all of those back mid-run
//: on the next tick. So the gate records that it was the one that closed a
//: control and reopens only what it closed.
function syncModelGatedControls(status = modelStatus) {
  const off = status ? status.ollama_running === false : false;
  for (const control of document.querySelectorAll("[data-needs-model]")) {
    const reason = control.dataset.needsModel;
    if (off) {
      if (!control.disabled) {
        control.dataset.modelGated = "1";
        control.disabled = true;
      }
      //: `=== undefined`, not a truthiness test, and the saved copy is dropped
      //: once it has been put back. A control whose own title is empty saves
      //: "" here, and `!""` is true, so on the next tick of the poll (one
      //: second while a job runs) the gated sentence was saved over the empty
      //: original and then restored as if it were the original: nine of the
      //: fifteen kept "Connect a model in Settings" as their tooltip after the
      //: model came back. Measured: 9 of 15 wrong, now 0.
      if (control.dataset.enabledTitle === undefined) {
        control.dataset.enabledTitle = control.title || "";
      }
      control.title = `${reason}. ${AI_OFFLINE_HINT}.`;
    } else {
      if (control.dataset.modelGated) {
        control.disabled = false;
        delete control.dataset.modelGated;
      }
      if (control.dataset.enabledTitle !== undefined) {
        control.title = control.dataset.enabledTitle;
        delete control.dataset.enabledTitle;
      }
    }
    control.classList.toggle("ai-unavailable", off);
  }
  //: The badge is a span, not a button, so `disabled` does nothing to it
  //: (see its own comment in `renderTimelineEntry`). Explicitly hidden here so
  //: a badge drawn while the model was online doesn't sit on screen as a
  //: broken promise once it drops.
  for (const badge of document.querySelectorAll(".untagged-ai")) {
    badge.style.display = off ? "none" : "";
  }
  //: The link half of decision 11. A tooltip on a disabled control is read by
  //: somebody who already suspects the answer; a person who does not know why
  //: half the app went quiet needs a sentence they can act on, in the place
  //: they are looking. Two surfaces, because those are the two that are
  //: nothing but AI: Ask keeps working (it falls back to the search results
  //: beside it) and says so, the popup agent cannot and says that.
  renderAiOfflineNotice(
    $("ask-offline"),
    "No model is connected, so this answers from your notes alone: the matching records are below."
  );
  renderAiOfflineNotice($("command-palette-offline"), "No model is connected, so the agent cannot run.");
  //: The Chat tab, the fourth surface that is nothing but the model (INBOX
  //: 266 part 1): its box was disabled with no sentence anywhere near it. It
  //: names where a question can still be asked, because that is the next
  //: step for somebody who came here to ask one.
  renderAiOfflineNotice(
    $("chat-offline"),
    "No model is connected, so Chat cannot answer yet. Notes, Ask answers from your notes without one."
  );
  //: And the writing desk, which is the third surface that is nothing but
  //: Atlas: with no model it cannot draft at all, and before this the only
  //: thing that said so was a title on a button that could not be pressed.
  renderAiOfflineNotice(
    $("draft-offline"),
    "No model is connected, so nothing can be drafted here yet. Everything else on this tab still works."
  );
  syncAgentPaletteAvailability();
}

//: One line and one button, in a named container, or nothing at all. Rebuilt
//: rather than toggled because the status poll calls this every tick and a
//: stale sentence is worse than none.
function renderAiOfflineNotice(container, what) {
  if (!container) return;
  container.replaceChildren();
  const off = aiIsOff();
  container.classList.toggle("hidden", !off);
  if (!off) return;
  const text = document.createElement("span");
  text.className = "muted";
  text.textContent = what;
  const link = document.createElement("button");
  link.type = "button";
  link.className = "ghost small";
  setLabel(link, `ph:plugs ${AI_OFFLINE_HINT}`);
  link.title = "Open Settings at Models, where a local or remote model is connected";
  link.addEventListener("click", () => openSettingsModal("models"));
  container.append(text, link);
}

//: The popup agent is the one surface with nothing to fall back to, so its
//: field and its starters are disabled with the rest (decision 11's "visible,
//: disabled": never hidden, so a reader can still see what it would offer).
function syncAgentPaletteAvailability() {
  const off = aiIsOff();
  const input = $("command-palette-input");
  if (input) {
    input.disabled = off;
    input.title = off ? `${AI_OFFLINE_HINT}.` : "";
  }
  for (const chip of document.querySelectorAll("#command-palette-starters [data-example]")) {
    chip.disabled = off;
    if (off) chip.title = `${AI_OFFLINE_HINT}.`;
  }
}

// What the AI is doing, as one decision.
//
// Three levels, and the boundary between them is deliberate. This app is built
// to degrade gracefully, so "no AI at all" is a supported way to run it, not a
// fault: it is amber, not red. Red is reserved for something that is actually
// broken: a model that failed to load, or a server we can't reach. Colouring a
// normal offline setup red would train the user to ignore the indicator.
//
//   idle  … grey    haven't heard back yet, says nothing either way
//   ok    ✓ green   everything the AI can do is available
//   warn  ! amber   loading, switched off, or partly available, app works
//   error ✕ red     something is broken and won't fix itself
function aiStatusState() {
  if (!modelStatus) {
    // The first poll of every page load lands here for a moment. Reporting
    // that as a fault would flash red on every startup and teach the user
    // that red means nothing, so an unanswered *first* request is its own
    // quiet state, and only a request that has failed after we have already
    // had an answer counts as the server going away.
    if (!statusEverAnswered) {
      return {
        level: "idle",
        title: "Checking…",
        detail: "Asking the app what Atlas is doing. This takes a moment.",
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
// colour vision deficiency, and fails everyone in high-contrast mode, so the
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
  renderChatActiveModelBadge();
  nudgeEmbeddingProblem();
}

//: **A broken search engine is said where the person is, once** (owner,
//: packaged app: "I didnt have sentence transformers installed ... I
//: encountered errors and I saw no popup or anything to suggest that I
//: switch to nomic-embed-text or install sentence transformers"). The fix
//: sentence and its one-click button lived only in Settings, Models, which
//: nobody opens to find out why search feels dull. So the first poll that
//: carries `embedding_error` raises a toast with the way to fix it and leaves
//: the same in the bell, keyed by the error so it is said once per problem,
//: not once per poll.
let embeddingNudgeSaid = "";
function nudgeEmbeddingProblem() {
  const error = modelStatus?.embedding_error;
  if (!error || error === embeddingNudgeSaid) return;
  embeddingNudgeSaid = error;
  const installing = /being installed/.test(error);
  const title = installing ? "Search by meaning is being installed" : "Search by meaning is not working";
  const detail = installing
    ? "Search uses keywords until it finishes. Or pick nomic-embed-text in Settings, Models."
    : `${error}. Settings, Models can switch it to ${EMBEDDING_FALLBACK_MODEL} or install the package.`;
  recordNotification({
    kind: "assist",
    title,
    detail,
    key: `embedding:${error}`,
    action: { settings: "models" },
  });
  if (!installing) toastAction(`${title}. Search is using keywords for now.`, "Fix it", () => openSettingsModal("models", "embedding-model-select"));
}

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
// are loaded. That is deliberate and it is not a micro-optimisation, a
// reminder poll running on two timers is a bug this project has already had
// and had to find in a browser, and a bar with five values is five chances to
// repeat it.

//: What the reminder poll last saw. Two numbers rather than a list: the bar
//: needs counts, and holding the reminders themselves here would be a second
//: copy of state the Reminders tab already owns.
let reminderCounts = { open: 0, due: 0 };

//: The running background jobs, straight from GET /tasks. Not reassembled from
//: `modelStatus`, routes_tasks.py exists precisely because the frontend used
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
// the row does not twitch sideways as counts change, a status bar that moves
// while you are reading it is the thing the header was rebuilt to stop doing.
function paintStatusItem(id, { icon, value, label, title, tone = "" }) {
  const button = $(id);
  if (!button) return;
  button.replaceChildren();
  if (icon) {
    const glyph = document.createElement("span");
    setLabel(glyph, icon);
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
  // The title doubles as the accessible name, exactly as `smallButton` already
  // does: without this the three icon-only status buttons (Undo, Redo,
  // Commands) announce as a bare "button" to a screen reader. The ones that
  // also paint a `value`/`label` have real text and do not need it, but
  // setting it uniformly keeps the two from drifting apart.
  if (title) button.setAttribute("aria-label", title);
  else button.removeAttribute("aria-label");
  button.classList.toggle("status-due", tone === "due");
}

function renderStatusBar() {
  if (!$("status-bar")) return;

  // The notebook's size, from the list the app has already loaded rather
  // than from /insights/stats: costs nothing, and is exact once loadEntries
  // finishes. GET /entries pages for a large notebook now (ENTRIES_PAGE_SIZE
  // above), so for the first moment after unlocking a several-thousand-note
  // notebook this can undercount while later pages are still landing in the
  // background: self-corrects within a render or two, and is still a more
  // honest number than showing nothing while it catches up. Before the first
  // load it says nothing rather than "0 notes", which would be a lie for the
  // second it is up.
  paintStatusItem("status-notes", {
    icon: "ph:note-pencil",
    //: Drafts left out, as the Notes list and its sidebar count leave them
    //: out: three places saying three numbers was the owner's "do I have
    //: 29, 30, or 31 notes?".
    value: entriesEverLoaded ? noteCountExcludingDrafts() : "–",
    label: noteCountExcludingDrafts() === 1 && entriesEverLoaded ? "note" : "notes",
    title: "Your notebook: click to browse it",
  });

  // Due, or open. The same choice the dashboard's tile makes, and it has to
  // stay the same choice: two counters visible at once that count differently
  // is worse than either alone.
  const { open, due } = reminderCounts;
  paintStatusItem("status-reminders", {
    icon: due ? "ph:alarm" : "ph:check-circle",
    value: due || open,
    label: due ? "due" : "open",
    title: due
      ? `${due} reminder${due === 1 ? "" : "s"} due now`
      : `${open} open reminder${open === 1 ? "" : "s"}`,
    tone: due ? "due" : "",
  });

  // The job slot appears only while there is one. Where several run at once it
  // shows the first, /tasks orders them newest-concern-first, and says how
  // many are behind it, because a bar is one line and a queue is not.
  const task = backgroundTasks[0];
  const slot = $("status-task");
  slot.classList.toggle("hidden", !task);
  if (task) {
    const others = backgroundTasks.length - 1;
    paintStatusItem("status-task", {
      icon: "ph:gear",
      label: others > 0 ? `${task.label} (+${others})` : task.label,
      title:
        `${task.label}${task.detail ? `, ${task.detail}` : ""}` +
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

  // Same reasoning one control along: the popup agent works from every tab
  // and had nothing on screen saying it exists. Reported as exactly that, 
  // it needed to be reachable from the tools popup, the palette, Settings
  // "and maybe even the bottom status bar".
  const agent = $("status-agent");
  if (agent) {
    agent.replaceChildren();
    const glyph = document.createElement("i");
    glyph.className = "ph ph-magic-wand";
    glyph.setAttribute("aria-hidden", "true");
    const word = document.createElement("span");
    word.textContent = "Ask";
    agent.append(glyph, word);
    //: `STATUS_META_KEY` is the whole "Ctrl K"/"⌘K" hint, not a bare
    //: modifier: appending "+Shift+A" to it produced "Ctrl K+Shift+A", which
    //: names no shortcut at all. Caught by reading the rendered title
    //: attribute rather than the source.
    const meta = STATUS_META_KEY.startsWith("⌘") ? "⌘" : "Ctrl";
    agent.title = `Ask the agent anything, from any tab (${meta}+Shift+A)`;
  }

  //: The Guide, built the same way one control along (INBOX 207): it left the
  //: header cluster with the wand, and the pair belongs together, one does
  //: things to your notes and the other explains the app. A compass rather
  //: than the header's '?', because a '?' beside a labelled word reads as
  //: help about the word.
  //: Find anything, one along again. A magnifying glass rather than a word
  //: alone, because the bar's other two are glyph-plus-word and a lone word
  //: here would read as a label for the Guide beside it.
  const find = $("status-find");
  if (find) {
    find.replaceChildren();
    const glyph = document.createElement("i");
    glyph.className = "ph ph-magnifying-glass";
    glyph.setAttribute("aria-hidden", "true");
    const word = document.createElement("span");
    word.textContent = "Find";
    find.append(glyph, word);
    //: Built the same way the agent's hint two controls up is, and for the
    //: same reason it records: `STATUS_META_KEY` is the whole hint, so
    //: appending to it names no shortcut at all.
    const findMeta = STATUS_META_KEY.startsWith("\u2318") ? "\u2318" : "Ctrl";
    find.title = `Search everything you keep, and the app itself (${findMeta}+P)`;
  }

  const guide = $("status-guide");
  if (guide) {
    guide.replaceChildren();
    const glyph = document.createElement("i");
    glyph.className = "ph ph-compass";
    glyph.setAttribute("aria-hidden", "true");
    const word = document.createElement("span");
    //: **The dock says the scope, the tooltip says who answers.** This read
    //: `GUIDE_NAME` ("Atlas") and sat next to "Ask", so the bar offered two
    //: buttons that both mean "talk to the AI" and neither said which one
    //: knows about your notes and which one knows about the app. A name is
    //: also the one label here that a setting can invalidate: the persona is
    //: renameable, so a button spelling it either goes stale or stops reading
    //: as help. The word is the scope; the name is on hover, where the panel
    //: it opens introduces Atlas anyway.
    word.textContent = "Guide";
    const guideName = typeof GUIDE_NAME === "string" ? GUIDE_NAME : "Atlas";
    guide.append(glyph, word);
    guide.title = `Ask ${guideName} how this app works, from any tab`;
  }
}

// Hover is handled in CSS. This is the click half, needed for touch, where
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
    //: No tick in front of the word. The line already carries `status ok`,
    //: which is the green, and a typed check beside it was the app saying the
    //: same thing twice in two different alphabets: one of the plainer signs
    //: of a UI assembled from whatever was to hand (INBOX 263).
    state = "ready";
    cls = "ok";
  } else if (status.embedding_warming) {
    state = "… warming up";
  } else if (status.embedding_error) {
    state = "Unavailable: using keyword search (details below)";
    cls = "error";
  }
  el.textContent = `Search engine: ${engine}: ${state}`;
  el.className = `status ${cls}`;
}

// What to call the backend on screen. The whole UI was written when there was
// only Ollama, and the word is in a dozen strings; this is the one place that
// decides, so the rest read from it (§6).
// The Chat / Agent pair. The hidden checkbox stays the single source of truth
//, every other reader in the app already consults it, and a second store for
// the same fact is how two of them end up disagreeing. These buttons just show
// it and set it.
function renderChatModeSeg() {
  const agent = $("tools-toggle").checked;
  // Two `addEventListener` calls for Quit and Clear-history used to sit here,
  // spliced into the middle of this function by an editing accident. It parsed,
  // so nothing complained: but this function runs on every chat-mode change,
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
  // choice: the same preference the checkbox always wrote.
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
  // default: so the field stays empty and "blank means the usual one" keeps
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
  // condition that has not gone away, and this one says the notes are leaving
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
    // The setting is saved either way, you set the address, then you start
    // the server: so this reports what was found rather than treating an
    // unreachable server as a rejected setting.
    note.textContent = body.reachable
      ? `● Connected to ${body.base_url}: ${body.installed_models.length} model(s) available.`
      : `○ Saved, but nothing is answering at ${body.base_url} yet. Start the server and this will light up.`;
    // This app's headline promise is that notes stay on the machine. A backend
    // somewhere else is allowed, someone may want it, but never quietly, so
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
  //: The dot is the line's class, as on the search engine line under it,
  //: not a typed "●"/"○" beside a CSS dot: two alphabets for one signal.
  ollamaLine.textContent = status.ollama_running
    ? `${backend} is running`
    : `${backend} isn't running`;
  ollamaLine.className = `status ${status.ollama_running ? "ok" : "off"}`;
  renderBackendPicker(status);
  const embeddingError = $("embedding-error");
  embeddingError.classList.toggle("hidden", !status.embedding_error);
  //: A missing optional package arrives as a sentence the backend wrote for
  //: people ("Search by meaning is being installed..."), not an exception, so
  //: it is shown as it is with the one alternative that needs no install: an
  //: Ollama embedding model. Said even when Ollama is not running, because
  //: the owner's report was exactly that case ("no nomic-embed-text
  //: suggested") and the button below only exists while it is.
  if (status.embedding_error && /^Search by meaning/.test(status.embedding_error)) {
    embeddingError.textContent =
      `${status.embedding_error}. ` +
      (status.ollama_running
        ? `Or switch the search engine to ${EMBEDDING_FALLBACK_MODEL} below: smaller, and offline.`
        : `Or start Ollama and pick ${EMBEDDING_FALLBACK_MODEL} as the search engine: smaller, and offline.`);
  } else if (status.embedding_error) {
    embeddingError.textContent =
      `Search engine problem: ${status.embedding_error}: semantic search is ` +
      "falling back to keywords. Quick fix: switch the search engine below to " +
      "an Ollama embedding model (download nomic-embed-text from the list), " +
      "it runs fully offline. Full details in Settings → Logs.";
  }
  // The one-click version of the "quick fix" sentence above: only offered
  // when it can actually be carried out (Ollama has to be running to either
  // pull or use an Ollama embedding model), and not while the fix is
  // already running or already switched over.
  const fixRow = $("embedding-error-fix-row");
  const alreadyOnOllama = status.embedding_backend === "ollama"
    && status.embedding_model === EMBEDDING_FALLBACK_MODEL;
  fixRow.classList.toggle(
    "hidden",
    !status.embedding_error
      || !status.ollama_running
      || !status.supports_pull
      || embeddingFallbackRunning
      || alreadyOnOllama
  );
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
    renderFeatureModels(status);
    renderVisionModelPicker(status);
  renderOcrModelPicker(status);
    renderAutonomousModelPicker(status);
    renderInstalledModels(status);
    renderSuggested(status);
    renderModelSpec(status.chat_model);
  } else {
    $("installed-box").classList.add("hidden");
    $("model-spec").classList.add("hidden");
    $("model-spec-health").classList.add("hidden");
  }
  renderReindex(status);
}

// GET /tasks, once per status poll, feeding everything that wants to know what
// is running: the status bar's job slot, the Background tasks panel when it is
// open, and the notifications centre.
//
// That last one was a real gap rather than a tidy-up. `renderTaskHistory`
// records a finished job into the centre "whether or not this screen is open, 
// which is the point of the centre", but the only thing that called it was
// `renderTasks`, and the only thing that called *that* was the panel being on
// screen. So a re-index that finished while you were anywhere else, which is
// most of them, since these jobs run for minutes, was recorded nowhere. It is
// polled from here now, so the record does not depend on being watched.
async function refreshBackgroundTasks() {
  // Before the unlock there is no token and this is a guaranteed 401 on every
  // poll: noise in the browser's network log and in the server's, where it
  // reads as an auth failure worth investigating.
  if (!authToken()) {
    backgroundTasks = [];
    return;
  }
  const body = await apiJson("/tasks", { silent: true }).catch(() => null);
  backgroundTasks = (body && body.tasks) || [];
  noticeTaskTransitions(backgroundTasks, (body && body.history) || []);
  renderStatusBar();
  // One fetch, not two: the panel renders from this payload rather than asking
  // again a few milliseconds later.
  if (settingsModalOpen() && currentSettingsSection === "tasks") renderTasks(body);
  else renderTaskHistory((body && body.history) || []);
}

// --- a background job starting and finishing, said out loud --------------------
//
// Half of this existed and half did not, which is why it read as broken rather
// than as missing: `renderTaskHistory` records every *finish* into the
// notifications centre, but a **start** was recorded nowhere, and neither end
// was ever said out loud. So kicking off a re-index or an extras install and
// then going back to writing gave you no sign anything was happening and no
// sign when it stopped, the only trace was a screen inside Settings and a
// centre you had to open.
//
// What this adds is the transitions: a job appearing in `GET /tasks` and a job
// disappearing from it.
//
// The rule that keeps it from becoming noise: **a toast only for a job whose
// start this session actually saw.** These jobs run for minutes and the app
// may well have been opened halfway through one; announcing the end of
// something you were never told had begun is a notification about nothing.
// The centre still records both ends either way, because that is a record
// rather than an interruption.

//: The jobs seen running on the previous poll, keyed the way `taskKey` keys
//: them. A Map rather than a Set so a finish can name the job that ended
//: without needing the poll it vanished from to still carry it.
const seenRunningTasks = new Map();

//: The activity panel's row for each of those jobs, keyed the same way. Kept
//: beside `seenRunningTasks` rather than inside it because the two answer
//: different questions: that map is "did this session see it start", which is
//: what decides whether its end is announced, and this one is "which row on
//: screen is it".
const backgroundRunRows = new Map();

function taskKey(task) {
  // `name` distinguishes two downloads running at once; `kind` alone would
  // merge them into one job that appears to start twice and finish once.
  return `${task.kind || "job"}:${task.name || ""}`;
}

function noticeTaskTransitions(running, history) {
  const now = new Map(running.map((task) => [taskKey(task), task]));

  //: A running job's row keeps its fraction and its own status line up to
  //: date. It is the same run list the chat's skill runs land in, an
  //: autonomous pass rewriting tags in the background is exactly the "agent
  //: model activity" the report was about, and reading it off `/tasks` is how
  //: it gets a progress bar the chat runs cannot have.
  for (const [key, task] of now) {
    const run = backgroundRunRows.get(key);
    if (!run) continue;
    run.progress = typeof task.progress === "number" ? task.progress : null;
    run.detail = task.detail || "";
    renderAgentRunSummary(run);
  }

  for (const [key, task] of now) {
    if (seenRunningTasks.has(key)) continue;
    seenRunningTasks.set(key, task);
    const run = addAgentRun({
      kind: "job",
      name: task.label,
      icon: "ph:gear",
      detail: task.detail || "",
    });
    run.progress = typeof task.progress === "number" ? task.progress : null;
    renderAgentRunSummary(run);
    backgroundRunRows.set(key, run);
    openPanelForRun(run);
    recordNotification({
      kind: "task",
      title: `Started: ${task.label}`,
      detail: task.detail || "",
      // Keyed per *start*, not per job. It used to be `task-start:${key}`,
      // which deduped against localStorage, so the second time the
      // autonomous pass (or any recurring job) ran, its start recorded
      // nothing at all, forever, because an entry with that exact id was
      // already stored from the first run days earlier. The poll-repeat this
      // was defending against is already handled by `seenRunningTasks` two
      // lines up, which `continue`s before reaching here.
      key: `task-start:${key}:${Date.now()}`,
    });
  }

  for (const [key, task] of [...seenRunningTasks]) {
    if (now.has(key)) continue;
    seenRunningTasks.delete(key);
    const row = backgroundRunRows.get(key);
    backgroundRunRows.delete(key);
    // The outcome comes from the server's own history, on this same payload, 
    // "it stopped appearing in the running list" is true of a job that died as
    // much as one that succeeded, and a cheerful toast over a failure is how
    // people learn to ignore toasts. Newest first, so `find` takes the ending
    // that just happened rather than a previous run of the same job.
    const ended = history.find((item) => (item.kind || "job") === (task.kind || "job"));
    if (ended && ended.outcome === "failed") {
      endAgentRun(row, { state: "failed" });
      agentActivityNotice(`Failed: ${ended.label || task.label}`, { isError: true });
    } else if (ended && ended.outcome === "cancelled") {
      endAgentRun(row, { state: "stalled", detail: "cancelled" });
      // Not an error and not an achievement, the user stopped it and already
      // knows. Recorded in the centre by renderTaskHistory; no toast.
      continue;
    } else {
      endAgentRun(row, { state: "done" });
      agentActivityNotice(`Finished: ${(ended && ended.label) || task.label}`);
    }
  }
}

// --- optional extras (Settings → Optional extras) -----------------------------
//
// Each of these is a feature the app already offers and cannot run: the microphone
// buttons need faster-whisper, the desktop window needs pywebview, search by
// meaning needs sentence-transformers. The only way to switch one on was a
// terminal and a README.
//
// The catalogue is the **server's**, and the install is chosen by id from an
// allowlist there: the client never sends a package name. See
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
    //: So a feature that needs this extra can open Settings at its row (Run
    //: on a .py document opens `extra-row-pyodide`).
    li.id = `extra-row-${extra.id}`;

    const head = document.createElement("div");
    head.className = "entry-meta";
    // The name and its state chip are one flex item now, not two. Reported:
    // "there are also still wrapping issues in the packages tab with the
    // buttons, titles, and badges" -- the Tesseract row's title, its
    // "Installed" chip and its Reinstall/Remove buttons are three
    // independent flex children of one wrapping row, same shape as the
    // chat answer header's own wrap bug (see .answer-title). A long label
    // like "Search inside images (Tesseract OCR)" plus a chip plus two
    // buttons does not fit one line in the settings modal, and letting the
    // three fragment independently is what put them on three unrelated
    // lines instead of two related ones (title+chip, then actions).
    const title = document.createElement("span");
    title.className = "entry-title";
    const name = document.createElement("strong");
    name.textContent = extra.label;
    title.appendChild(name);
    head.appendChild(title);

    const actions = document.createElement("span");
    actions.className = "entry-actions";
    if (extra.installed) {
      // A tick, not a disabled button. "Installed" is the answer to the only
      // question this row asks, and a greyed-out Install invites a click that
      // will do nothing.
      // A chip, beside the name, not a coloured word wedged between the title
      // and the first button. Reported: "the installed and not ready yet
      // badges are poorly spaced and aligned and need affordance" -- as bare
      // text it had no box of its own, so it inherited the row's 0.4rem gap on
      // both sides and read as part of whichever neighbour you looked at
      // first. A chip says "state", a button says "press me", and this is a
      // state.
      const done = chip("ph:check-circle Installed", "extras-installed");
      title.appendChild(done);
      // And a way back out of the state detection cannot see. `find_spec`
      // answers "is it there", not "is it sound", a half-finished download or
      // a wheel built for the wrong platform imports and does not work, and
      // this is the button for that. Quiet, because it is the rarer need.
      // …except when nothing calls the package. Reinstalling a library the app
      // never imports cannot fix anything, because there is nothing to fix.
      if (!extra.unavailable) actions.appendChild(
        smallButton("ph:arrow-clockwise Reinstall", `Reinstall ${extra.label}`, async () => {
          const ok = await confirmDialog(
            `Reinstall ${extra.label}?\n\nUse this if the feature is switched ` +
              "on but not working, it downloads the package again from " +
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
        smallButton("ph:trash Remove", `Uninstall ${extra.label}`, async () => {
          const ok = await confirmDialog(
            `Remove ${extra.label}?\n\nThe feature it turns on stops working. ` +
              "Only the package itself is removed, anything it pulled in is " +
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
      const busy = document.createElement("div");
      busy.className = "muted extras-install-progress";

      const text = document.createElement("span");
      text.className = "extras-install-progress-text";
      text.textContent = extra.step || "Installing…";

      const bar = document.createElement("progress");
      bar.className = "task-progress extras-install-progress-bar";

      busy.append(text, bar);
      actions.appendChild(busy);
    } else if (extra.unavailable) {
      // Greyed out rather than hidden. The row still earns its place, it says
      // what the app *will* be able to do, and hiding the two unfinished
      // extras would be tidier and less honest. The reason travels with the
      // button as its tooltip and is spelled out in full underneath, because a
      // disabled control whose reason is not visible is just a broken one.
      const blocked = smallButton("ph:download-simple Install", extra.unavailable, () => {});
      blocked.disabled = true;
      actions.appendChild(blocked);
      // Same treatment as Installed, and for the same reason: it is the row's
      // state, so it sits with the name rather than in the action column.
      title.appendChild(chip("ph:hourglass Not ready yet", "extras-soon"));
    } else {
      actions.appendChild(
        smallButton("ph:download-simple Install", `Install ${extra.label}`, async () => {
          //: A download extra (Pyodide, needle) is pinned files checked
          //: against a written-down hash, and needs no restart; a pip extra
          //: comes from PyPI and does. Both say where it comes from.
          const ok = await confirmDialog(
            extra.kind === "download"
              ? `Install ${extra.label}?\n\n${extra.size}, downloaded once from ` +
                `${extra.source} and checked against its pinned checksum. ` +
                "After that it works offline, with no restart."
              : `Install ${extra.label}?\n\n${extra.size}. It is downloaded from ` +
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
    meta.textContent = [extra.packages.join(", "), extra.size, extra.licence].filter(Boolean).join(" · ");
    li.appendChild(meta);

    // Said before the button is pressed, not after: "this installs the library
    // but nothing uses it yet" is exactly the sort of thing that turns into a
    // bug report if it is discovered afterwards.
    if (extra.caveat) {
      const caveat = document.createElement("p");
      caveat.className = "muted extras-caveat";
      setLabel(caveat, `ph:warning ${extra.caveat}`);
      li.appendChild(caveat);
    }
    // The reason the button is grey, in full. Same shape as the caveat because
    // it is the same kind of sentence, the difference is that this one is
    // also enforced by `core/extras.py`, so it is a fact about the app rather
    // than advice about a choice.
    if (extra.unavailable) {
      const why = document.createElement("p");
      why.className = "muted extras-caveat";
      setLabel(why, `ph:traffic-cone ${extra.unavailable}`);
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

  // The model-size choice only means anything once faster-whisper is
  // actually there to load one.
  const voiceExtra = body.extras.find((e) => e.id === "voice");
  const wrap = $("voice-model-wrap");
  if (wrap) {
    wrap.classList.toggle("hidden", !voiceExtra?.installed);
    if (voiceExtra?.installed) {
      if (!prefsCache) prefsCache = await apiJson("/preferences").catch(() => null);
      $("voice-model-select").value = prefsCache?.voice_model || "base";
    }
  }
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
    //: **The name and this row's status are one column; the buttons are the
    //: other.** The same shape the packages list above already uses, and for
    //: the reason recorded there (INBOX 107c): `.extras-row .entry-meta` is
    //: `flex-wrap: nowrap` so the buttons never drop below the title, which
    //: means whatever cannot shrink pushes the row off its own edge instead.
    //:
    //: This list was built the other way, with "✓ 1015 KB on disk" inside
    //: `.entry-actions`, which is `flex: 0 0 auto`. Measured at 820px: the
    //: chip 164px plus Re-download 122px plus Remove 91px made a 390px block
    //: that would not shrink, against 458px of row holding an 80px name, so
    //: Settings, Extras scrolled sideways (496 against 492). The status is
    //: not an action; moving it into `.entry-title`, which is the shrinking
    //: column and wraps inside itself, leaves the buttons 219px and lets the
    //: name and the chip take the rest.
    const title = document.createElement("div");
    title.className = "entry-title";
    const name = document.createElement("strong");
    name.textContent = model.label + (model.default ? " · default" : "");
    title.appendChild(name);
    head.appendChild(title);

    const actions = document.createElement("span");
    actions.className = "entry-actions";
    if (model.downloading) {
      const busy = document.createElement("span");
      busy.className = "muted";
      busy.textContent = "Downloading…";
      title.appendChild(busy);
    } else if (model.installed) {
      const done = document.createElement("span");
      done.className = "extras-installed";
      setLabel(done, `ph:check ${model.on_disk} on disk`);
      title.appendChild(done);
      // The same argument the packages' Reinstall makes: "the directory is
      // there" is not "the model is sound". A download interrupted halfway
      // leaves a snapshot that loads and produces nonsense, and fetching over
      // the top of it resumes the same broken files, so this removes first.
      if (body.can_download) {
        actions.appendChild(
          smallButton("ph:arrow-clockwise Re-download", `Fetch ${model.label} again from scratch`, async () => {
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
        smallButton("ph:trash Remove", `Delete ${model.label} from this machine`, async () => {
          if (!(await confirmDialog(
            `Remove ${model.label}?\n\nIt frees ${model.on_disk}. Nothing is ` +
              "lost that a download cannot bring back, but if this is the " +
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
      const get = smallButton("ph:download-simple Download", `Fetch ${model.label}`, async () => {
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
          "Needs the huggingface_hub library, it arrives with “Search by " +
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
