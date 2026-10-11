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
    return new Set(prefs.json(ANNOUNCED_KEY, []));
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
    const raw = prefs.json(NOTIFICATIONS_KEY, []);
    return Array.isArray(raw) ? raw : [];
  } catch {
    return []; // hand-edited or truncated storage costs the history, not the app
  }
}

// Record something worth remembering. `key` de-duplicates: the reminder poll
// runs every thirty seconds and must not add the same fired reminder twice.
//: Returns the row's id (null when nothing was recorded), so a toast's live
//: action can be tied to its row (`keepToastAction`).
function recordNotification({ kind, title, detail = "", key = "", action = null }) {
  if (kind !== "reminder" && notificationsMuted()) return null;
  const items = storedNotifications();
  const id = key || `${kind}:${title}:${Date.now()}`;
  if (key && items.some((n) => n.id === id)) return null;
  if (key && dismissedNotificationIds().has(id)) return null;
  items.push({ id, kind, title, detail, at: Date.now(), action });
  try {
    localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(items.slice(-MAX_NOTIFICATIONS)));
  } catch {
    return null; // storage refused: the toast still shows, the row is not kept
  }
  renderNotificationBadge();
  return id;
}

function notificationsReadAt() {
  return Number(prefs.get(NOTIFICATIONS_READ_KEY, null) || 0);
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
    const raw = prefs.json(NOTIFICATIONS_UNREAD_KEY, []);
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
    const raw = prefs.json(NOTIFICATIONS_READ_IDS_KEY, []);
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

//: **One row can be removed** (INBOX 508, the owner: "I cant delete
//: individual notifications"). Only Clear all existed. A keyed row (an
//: overdue reminder, `reminder:<id>`) is folded back in by every open of
//: the panel while it stays overdue, so its key is remembered as dismissed,
//: or the row would come back the next time the bell is pressed. Capped:
//: keys are per reminder, a few hundred is years of them.
const NOTIFICATIONS_DISMISSED_KEY = "notificationsDismissed";

function dismissedNotificationIds() {
  try {
    const raw = prefs.json(NOTIFICATIONS_DISMISSED_KEY, []);
    return new Set(Array.isArray(raw) ? raw : []);
  } catch {
    return new Set();
  }
}

function dismissNotification(item) {
  const all = storedNotifications().filter((n) =>
    item.id != null ? n.id !== item.id : n.at !== item.at
  );
  try {
    localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(all));
    if (item.id != null && /^reminder:/.test(String(item.id))) {
      const gone = [...dismissedNotificationIds(), item.id].slice(-300);
      localStorage.setItem(NOTIFICATIONS_DISMISSED_KEY, JSON.stringify(gone));
    }
  } catch {
    // Storage refused: the row stays, which is what the list shows next.
  }
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
  run: "ph:strategy",
  error: "ph:warning",
  export: "ph:download-simple",
  assist: "ph:sparkle",
  undo: "ph:arrow-counter-clockwise",
  done: "ph:check-circle",
  info: "•",
};

//: **Every toast with an action is kept in the bell, with that action**
//: (INBOX 585, the owner: "all notifiactions that contain links or buttons
//: need to show and be accessible in the notifications panel"). A toast's
//: button lived for eight seconds and was gone.
//:
//: Two halves, because a closure cannot go into localStorage. The row stores
//: plain data: the label, and `go`, a target the app can find again by id
//: after a reload (`runNotificationGo`). This session also keeps the toast's
//: own closure (`noticeLive`), so the row does exactly what the toast did.
//: An action with no `go` (an Undo, an offer, a restart) is one-shot: pressed
//: once, from the toast or the row, it reads "Done"; after a reload it reads
//: "Expired". An Undo is valid only while it can still be undone: while its
//: action is on the app's own stack when it has one (Ctrl+Z or the toast may
//: have taken it already), otherwise for `NOTICE_UNDO_MS`.
const noticeLive = new Map();
const NOTICE_UNDO_MS = 5 * 60 * 1000;

function keepToastAction(message, label, run, { go = null, record = true, kind = "" } = {}) {
  const once = !go;
  const undo = once && /\b(undo|put it back)\b/i.test(label);
  if (!record) return () => run();
  const id = recordNotification({
    kind: kind || (undo ? "undo" : "done"),
    title: message,
    action: { label, ...(go || {}), ...(once ? { once: true } : {}) },
  });
  //: The app's stack entry this Undo stands for: callers push it just before
  //: the toast (`pushUndo` then `toastAction`), so it is the top one, now.
  const top = undoStack[undoStack.length - 1];
  const stacked = undo && top && Date.now() - top.at < 2000 ? top : null;
  const live = { run, once, used: false, until: undo && !stacked ? Date.now() + NOTICE_UNDO_MS : 0, stacked };
  if (id) noticeLive.set(id, live);
  return async () => {
    live.used = once;
    await run();
  };
}

//: Whether a kept action can still run from this session's closure.
function noticeLiveValid(live) {
  if (!live || (live.once && live.used)) return false;
  if (live.stacked) return undoStack.includes(live.stacked);
  return !live.until || Date.now() < live.until;
}

//: Where a stored `go` leads, found again by id when pressed: a target that
//: has gone since says so rather than opening an empty view.
const NOTICE_TARGETS = {
  entry: [(id) => apiJson(`/entries/${id}`, { silent: true }), (id) => flashEntry(id), "note"],
  conversation: [(id) => apiJson(`/conversations/${id}`, { silent: true }), (id) => { switchTab("chat"); return openConversation(id); }, "chat"],
  doc: [(id) => apiJson(`/documents/${id}`, { silent: true }), (id) => { switchTab("documents"); return openDocument(id); }, "document"],
  board: [(id) => apiJson("/whiteboard/boards", { silent: true }).then((all) => all.find((b) => b.id === id)), (id) => openWhiteboardBoard(id), "board"],
  reminder: [null, (id) => { editingReminderId = id; return flashReminder(id); }, "reminder"],
  capture: [null, () => startNewNote(), ""],
};

async function runNotificationGo(action) {
  if (action.panel) return reopenAnswerPanel(action);
  if (action.settings) return openSettingsModal(action.settings, action.focus);
  if (action.exports) return openExportsFromNotification();
  if (action.filter) return showNotesFilter(action.filter);
  const target = NOTICE_TARGETS[action.open];
  if (target) {
    const found = target[0] ? await target[0](action.id).catch(() => null) : true;
    if (!found) return toast(`That ${target[2]} is no longer there.`);
    return target[1](action.id);
  }
  if (action.tab) return switchTab(action.tab);
}

function notificationGoes(action) {
  return Boolean(action && (action.tab || action.exports || action.panel || action.settings || NOTICE_TARGETS[action.open]));
}

//: The row's own button for its action (INBOX 585): the toast's label, or a
//: plain one for the rows that only ever had a target. Disabled, with the
//: reason beside it, once a one-shot action is spent or out of date.
function notificationActionButton(item) {
  const action = item.action;
  if (!action || !(action.label || notificationGoes(action))) return null;
  const live = noticeLive.get(item.id);
  const button = document.createElement("button");
  button.type = "button";
  button.className = "small toast-action notif-cta";
  button.textContent = action.label || (action.exports ? "Open folder" : action.filter ? "Show them" : "Open");
  const wrap = document.createElement("div");
  wrap.className = "notif-cta-row";
  wrap.append(button);
  if (noticeLiveValid(live)) {
    button.addEventListener("click", async (event) => {
      event.stopPropagation();
      if (!noticeLiveValid(live)) return openNotifications({ keepWatermark: true });
      closeNotifications();
      //: The toast's own closure, which settles its stack entry itself
      //: (`settleUndoFromToast`), exactly as pressing the toast did.
      live.used = live.once;
      await live.run();
    });
  } else if (!action.once && notificationGoes(action)) {
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      closeNotifications();
      runNotificationGo(action);
    });
  } else {
    button.disabled = true;
    const state = document.createElement("span");
    state.className = "notif-cta-state muted";
    state.textContent = live?.used || redoStack.includes(live?.stacked) ? "Done" : "Expired";
    wrap.append(state);
  }
  return wrap;
}

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

    //: **One row recipe** (INBOX 585: "clashing, misaligned, and/or poorly
    //: spaced"): the unread dot, the icon, the text column, then one side
    //: column holding the time, which the row's two controls replace while
    //: it is pointed at. Every column's first line is the title's line
    //: (06-timeline-dialogs.css), and nothing is laid over the text.
    const dot = document.createElement("span");
    dot.className = "notif-dot";
    dot.setAttribute("aria-hidden", "true");
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
    head.append(title);
    body.append(head);
    if (item.detail) {
      const meta = document.createElement("div");
      meta.className = "notif-meta muted";
      meta.textContent = item.detail;
      body.append(meta);
    }
    const cta = notificationActionButton(item);
    if (cta) body.append(cta);
    row.append(dot, icon, body);

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
    const dismiss = document.createElement("button");
    dismiss.type = "button";
    dismiss.className = "ghost small icon-only notif-dismiss";
    dismiss.title = "Remove this notification";
    dismiss.setAttribute("aria-label", `Remove: ${item.title}`);
    setLabel(dismiss, "ph:x");
    dismiss.addEventListener("click", (event) => {
      event.stopPropagation();
      // Focus goes to the next row's remove button, or the list, so a
      // keyboard run through the list does not drop back to the page.
      const next = row.nextElementSibling || row.previousElementSibling;
      dismissNotification(item);
      openNotifications({ keepWatermark: true }).then(() => {
        const index = next ? [...list.children].findIndex((li) => li.dataset.at === next.dataset.at) : -1;
        (list.children[index]?.querySelector(".notif-dismiss") || $("notif-close"))?.focus();
      });
    });
    const actions = document.createElement("span");
    actions.className = "notif-row-actions";
    actions.append(readToggle, dismiss);
    const side = document.createElement("span");
    side.className = "notif-side";
    side.append(time, actions);
    row.dataset.at = String(item.at);
    row.append(side);

    // A notification you cannot act on is a notification you learn to ignore.
    // The whole row goes where its target is; a one-shot action (an Undo) is
    // only ever its own button.
    if (item.action && !item.action.once && notificationGoes(item.action)) {
      row.classList.add("notif-actionable");
      row.tabIndex = 0;
      row.title = item.action.exports ? "Open the exports folder" : "Open";
      const go = () => {
        closeNotifications();
        runNotificationGo(item.action);
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
//: A refused permission says so once, in the reminders list and in Settings,
//: rather than every due reminder quietly falling back to a toast.
function syncNotifBlocked() {
  const blocked = "Notification" in window && Notification.permission === "denied";
  for (const line of document.querySelectorAll(".notif-blocked")) line.classList.toggle("hidden", !blocked);
}

function askNotificationPermission() {
  if ("Notification" in window && Notification.permission === "default") {
    Notification.requestPermission().then(syncNotifBlocked, syncNotifBlocked);
  }
}

// A reminder's chime: a third channel beside the toast and the OS
// notification ("half the time when reminders go off I don't actually
// notice"), audible in a background tab, needing no permission. Made just
// after the first gesture, when the browser is idle (the performance pass,
// 2026-10-03: `new AudioContext()` cost 44 to 56 ms inside the unlock click);
// every gesture resumes a suspended context, which is WebKit's unlock, and
// the listeners leave once it runs.
let reminderAudioCtx = null;
let reminderAudioBuilding = false;
function primeReminderAudio() {
  if (reminderAudioCtx) {
    if (reminderAudioCtx.state === "running") {
      document.removeEventListener("pointerdown", primeReminderAudio);
      document.removeEventListener("keydown", primeReminderAudio);
    } else {
      reminderAudioCtx.resume().catch(() => {});
    }
    return;
  }
  if (reminderAudioBuilding) return;
  reminderAudioBuilding = true;
  const build = () => {
    try {
      reminderAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
    } catch {
      // No Web Audio support, reminders still show as a toast/notification.
    }
  };
  if (window.requestIdleCallback) window.requestIdleCallback(build, { timeout: 1500 });
  else setTimeout(build, 300);
}
document.addEventListener("pointerdown", primeReminderAudio, { passive: true });
document.addEventListener("keydown", primeReminderAudio, { passive: true });

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
let titleCount = 0;
//: The view and the open thing (router.js, WORLD_CLASS_PLAN 22.1 item 1):
//: "Half marathon, week 4 · Notes", before the app's name, after the count.
let titleView = "";

function paintTitle() {
  const base = titleView ? `${titleView} · ${BASE_TITLE}` : BASE_TITLE;
  document.title = titleCount > 0 ? `(${titleCount}) ${base}` : base;
}

function setTitleCount(count) {
  titleCount = count;
  paintTitle();
}

function setTitleView(view) {
  titleView = String(view || "").trim();
  paintTitle();
}

//: **On time, not up to a minute late** (TIMELINE_PLAN 11 row 5): one
//: timeout set to the soonest open reminder's due time, re-set by every
//: check and every list load, so a reminder fires within a second of its
//: minute. The minute poll stays as the backstop: a hidden tab's timeout is
//: throttled, and a reminder made on another device is not in this list.
//: A one-shot timeout, not a second interval: it wakes the page once per
//: due reminder and never at rest.
const reminderDueTimer = { id: 0 };
function armReminderTimer(list) {
  clearTimeout(reminderDueTimer.id);
  const now = Date.now();
  //: An early alert is a time of its own ("1 day before").
  const times = (list || []).filter((r) => !r.done).flatMap((r) => {
    const due = new Date(r.due_at).getTime();
    return r.alert_minutes ? [due, due - r.alert_minutes * 60000] : [due];
  });
  const next = Math.min(...times.filter((t) => t > now));
  if (!Number.isFinite(next)) return;
  //: Past the browser's 24.8-day ceiling a timeout fires at once; the poll
  //: re-arms long before such a reminder comes due.
  if (next - now > 2 ** 31 - 1) return;
  reminderDueTimer.id = setTimeout(checkDueReminders, next - now + 250);
}

async function checkDueReminders() {
  // Before the unlock there is no token, and asking anyway is a guaranteed 401
  // on every load: visible in the browser's network log, and in the server's
  // own log, where it looks like an auth failure worth investigating.
  if (!authToken()) return;
  syncNotifBlocked();
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
  armReminderTimer(all);
  updateReminderBadge(all);
  setTitleCount(due.length);

  const already = announcedReminders();
  //: An early alert (TIMELINE_PLAN 11 row 8) is announced once, under its
  //: own key, with how long is left; the due time is announced as before.
  const early = all
    .filter((r) => {
      const at = new Date(r.due_at).getTime();
      return !r.done && r.alert_minutes && at > now && at - r.alert_minutes * 60000 <= now && !already.has(`e${r.id}`);
    })
    .map((r) => ({ ...r, id: `e${r.id}`, early: true, text: `${r.text}, ${relativeWhen(r.due_at)}` }));
  const fresh = [...due.filter((r) => !already.has(r.id)), ...early];
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
      detail: reminder.early ? "Coming up" : "Came due",
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

//: **Once per page, however many unlocks** (audit 2026-10-05, FE-08). Every
//: unlock runs `startApp()` again, and so does any 401 that routes through
//: the lock screen, so this added another one-minute poll and two more
//: listeners each time: after four lock and unlock cycles an idle minute
//: asked `/reminders` five times. The first call wires everything; a later
//: one only checks now, which is what an unlock wants.
let reminderWatchStarted = false;
function startReminderWatch() {
  checkDueReminders();
  if (reminderWatchStarted) return;
  reminderWatchStarted = true;
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
  if (onOpen) toastAction(message, "Open", onOpen, { record: false });
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
    openHelpChat();
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
//: **Toasts stack smoothly** (the motion pass, 2026-10-05): a toast arriving
//: or leaving moves the others, and they slide there by `translate` over
//: `--ui-base` from where they were (measured, changed, played back) rather
//: than jumping a toast's height between two frames. Interface animations
//: off makes `--ui-base` 0 and they jump.
function toastStack(box, change) {
  const was = [...box.children].map((t) => [t, t.getBoundingClientRect().top]);
  change();
  const cs = getComputedStyle(box);
  const ms = parseFloat(cs.getPropertyValue("--ui-base")) * 1000;
  for (const [t, top] of ms ? was : []) {
    const dy = top - t.getBoundingClientRect().top;
    if (dy && t.isConnected) t.animate([{ translate: `0 ${dy}px` }, { translate: "0 0" }], { duration: ms, easing: cs.getPropertyValue("--ease-out") });
  }
}

//: **A toast leaves the way it came** (INBOX 399 (4)): it fades and drops
//: 4px on the same curve it arrived on (`.toast.is-leaving`,
//: 01-forms-settings.css) rather than vanishing between two frames, which
//: read as the corner of the window glitching. Removed on `animationend`, with
//: a timer behind it for the case where no animation runs at all.
function dismissToast(note) {
  if (!note.isConnected || note.classList.contains("is-leaving")) return;
  note.classList.add("is-leaving");
  const done = () => note.isConnected && toastStack(note.parentElement, () => note.remove());
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

//: A toast steps aside for the focused control it covers (WCAG 2.4.11,
//: measured at 200% and 400% zoom: a lasting "3 reminders are due" hid the
//: Tab stop under it on six tabs). Fades and lets clicks through until focus
//: moves off it; focus inside the toast itself never counts.
document.addEventListener("focusin", (e) => {
  const box = $("toast-box");
  if (!box?.children.length || box.contains(e.target)) return box?.classList.remove("is-yielding");
  const r = e.target.getBoundingClientRect();
  box.classList.toggle("is-yielding", [...box.children].some((el) => {
    const b = el.getBoundingClientRect();
    return b.left < r.right && b.right > r.left && b.top < r.bottom && b.bottom > r.top;
  }));
});

//: **Where a toast goes** (INBOX 470): inside the open modal dialog while
//: there is one, because a modal makes everything outside it inert and draws
//: over it, so a page toast's Undo could be neither seen nor pressed; the
//: page's box otherwise. The host is fixed to the window like the box.
function toastHost() {
  const dialog = document.querySelector("dialog:modal");
  if (!dialog) return $("toast-box");
  let host = dialog.querySelector(":scope > .toast-host");
  if (!host) {
    host = document.createElement("div");
    host.className = "toast-host";
    host.setAttribute("aria-live", "polite");
    dialog.appendChild(host);
  }
  return host;
}

// What a person is told when a request fails (INBOX 472, "official, not a
// demo"). Every error toast in the app prints `error.message`, and that
// message was whatever the server's `detail` held: FastAPI's validation
// answer is a list, so a toast read `[{"type":"missing","loc":["body",...`
// (and `[object Object]` where a caller concatenated it); a server fault was
// the bare word "Internal error"; a missing route was "Not Found". A detail
// the app's own code wrote as a sentence ("Entry not found") is kept exactly,
// because a few callers read it. Only the shapes no person should see are
// replaced; `api()` still logs the raw text to Settings > Logs, where
// someone diagnosing it wants it.
//
// `fallback` is for a caller that knows what it was doing ("Upload failed.")
// and would rather say that than a generic line when the server gave nothing
// a person can read.
//
// It lives here, not in app.js: app.js is at its gzip cap
// (tests/test_static_compression.py) and this is only called at run time.
const GENERIC_HTTP_DETAIL = /^(not found|method not allowed|internal error|internal server error|bad request|unprocessable entity|forbidden|bad gateway|service unavailable|gateway timeout)\.?$/i;
function plainHttpError(status, detail, fallback = "") {
  if (typeof detail === "string" && detail.trim() && !GENERIC_HTTP_DETAIL.test(detail.trim())) return detail;
  if (typeof detail?.message === "string" && detail.message.trim()) return detail.message;
  if (Array.isArray(detail) && detail.length) {
    const first = detail[0] || {};
    const loc = Array.isArray(first.loc) ? first.loc.filter((part) => part !== "body" && part !== "query") : [];
    const field = loc.length ? String(loc[loc.length - 1]).replace(/_/g, " ") : "";
    return field ? `Check the ${field} and try again.` : "That was not accepted. Check what you entered and try again.";
  }
  if (fallback) return fallback;
  if (status === 404) return "That could not be found. It may have been deleted.";
  if (status === 400 || status === 405 || status === 422) return "That was not accepted. Try again.";
  if (status === 403) return "That is not allowed.";
  if (status >= 500) return "Something went wrong inside MemoryMap. Try again; if it keeps happening, Settings > Logs has the details.";
  return "That did not work. Try again.";
}

let lastToastKey = "";
let lastToastAt = 0;
//: **An error toast is for a fault; a situation the app expects is a plain one**
//: (the owner's end-to-end pass: Dictate without the voice add-on, Compress on
//: an empty chat, Add on an empty reminder all showed red and "Report this",
//: which reads as a broken app). Two ways in, one rule:
//: - a call site that knows the situation passes `"info"` (a check on what
//:   the person entered, nothing to do yet, a missing add-on): a plain toast,
//:   no "Report this", and it ignores "mute notifications" because it answers
//:   something the person just pressed;
//: - a call site that passes `true` for a failed request gets the same
//:   treatment when the server answered with a 4xx, which is a refusal by
//:   design (`api()` in app.js notes each 4xx message in `toast.refused`).
//: Only a 5xx, a network failure or an unexpected exception keeps the red
//: style and the report button. `tests/test_error_toasts.py` pins both.
//:
//: **An error explains and offers** (WORLD_CLASS_PLAN 28.1 rule 4): an error
//: toast always carries one action. A caller that knows the way forward passes
//: it, `{ action: ["Try again", fn] }`; one that does not gets Open the logs,
//: Settings, Logs, where the why is written (the message says what happened).
//: `tests/test_error_toasts.py` holds the literal faults to an action of their own.
//: **The app's voice for what it says itself** (CHAT_PLAN decision 55,
//: Brief 68 row 9): one register for a failure, "Couldn't open that
//: document.", never "Could not" beside "Couldn't", never an exclamation. The
//: table is the realiser's (`ai/realise.py` `VOICE`); tests/test_voice_tables.py
//: holds the two equal and counts the surfaces moved onto it (the Library,
//: the board and the map first, the three with the most toasts).
const VOICE = {
  failed: "Couldn't {what}.",
  failed_why: "Couldn't {what}: {why}",
};

function voiceLine(key, slots = {}) {
  const why = slots.why ? String(slots.why).trim() : "";
  const shape = VOICE[key === "failed" && why ? "failed_why" : key] || "";
  return shape.replace(/\{(\w+)\}/g, (_, name) => (name === "why" ? why : String(slots[name] ?? "")));
}

function toast(message, isError = false, { exempt = false, action = null } = {}) {
  if (isError === "info" || (isError === true && [...toast.refused].some((m) => String(message).includes(m)))) {
    isError = false;
    exempt = true;
  }
  if (!exempt && !isError && notificationsMuted()) return;
  const key = `${isError ? "1" : "0"}:${message}`;
  const now = Date.now();
  if (key === lastToastKey && now - lastToastAt < 400) return;
  lastToastKey = key;
  lastToastAt = now;
  const box = toastHost();
  //: An error makes the companion jump (avatars.js).
  if (isError && typeof nameMarkBuddyCue === "function") nameMarkBuddyCue("startle", "error");
  const note = document.createElement("div");
  note.className = isError ? "toast error" : "toast";
  const text = document.createElement("span");
  text.className = "toast-msg";
  text.textContent = message;
  note.appendChild(text);
  //: An error toast carries the way to report it (INBOX 256): one small
  //: button that saves the support bundle and opens a mail to the owner
  //: with the message already in it. Plain toasts stay plain.
  if (isError) {
    const [label, run] = action || ["Open the logs", () => openSettingsModal("logs")];
    note.appendChild(toastActionButton(note, label, () => {
      clearTimeout(timer);
      run();
    }));
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
  toastStack(box, () => box.appendChild(note));
}
toast.refused = new Set();

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
  const box = toastHost();
  const note = document.createElement("div");
  note.className = "toast";
  const text = document.createElement("span");
  text.className = "toast-msg";
  setLabel(text, `ph:spin ${message}`);
  note.append(text);
  toastStack(box, () => box.appendChild(note));
  return {
    say(next) {
      setLabel(text, `ph:spin ${next}`);
    },
    //: `done` swaps the spinner for the outcome and starts the ordinary
    //: 5.5-second life every other toast has, so a finished job does not
    //: leave a permanent line on screen.
    //: Its action is the toast recipe's button and is kept in the bell like
    //: any other (INBOX 584: a bare link here read "this file.Show it").
    done(finalMessage, { isError = false, actionLabel = null, onAction = null, go = null, record = true } = {}) {
      text.textContent = finalMessage;
      note.classList.toggle("error", Boolean(isError));
      if (actionLabel && onAction) {
        note.appendChild(toastActionButton(note, actionLabel, keepToastAction(finalMessage, actionLabel, onAction, { go, record })));
      }
      note.toastTimer = setTimeout(() => dismissToast(note), 5500);
      note.appendChild(toastCloseButton(note, note.toastTimer));
    },
  };
}

//: One action on a toast (INBOX 584): a small button after the message,
//: spaced by the toast's own gap, never a bare link glued to the words.
function toastActionButton(note, label, run) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "small toast-action";
  button.textContent = label;
  button.addEventListener("click", async () => {
    clearTimeout(note.toastTimer);
    dismissToast(note);
    await run();
  });
  return button;
}

//: `opts`: `go`, where the action leads as plain data, so its row in the
//: bell still works after a reload; `record: false` for a notice that is
//: already in the bell (`keepToastAction`); `also: {label, run}`, a second
//: button beside the first (a bin notice's "Go to bin" next to its Undo,
//: INBOX 705). It is the toast's own and is not kept in the bell: its row
//: keeps the one action it always had.
function toastAction(message, actionLabel, onAction, opts = {}) {
  const run = keepToastAction(message, actionLabel, onAction, opts);
  const box = toastHost();
  const note = document.createElement("div");
  note.className = "toast";
  const text = document.createElement("span");
  text.className = "toast-msg";
  text.textContent = message;
  // `sticky`: a notice that stays true until acted on (a damaged notebook
  // file) is not timed out; its close button is the way to put it away.
  note.toastTimer = opts.sticky ? null : setTimeout(() => dismissToast(note), 8000);
  const buttons = [toastActionButton(note, actionLabel, run)];
  if (opts.also) buttons.push(toastActionButton(note, opts.also.label, opts.also.run));
  note.append(text, ...buttons, toastCloseButton(note, note.toastTimer));
  toastStack(box, () => box.appendChild(note));
}

//: The notebook file's check at start (`GET /backups/integrity`, WORLD_CLASS
//: 25e) in one sentence that says what to do. Shared by the boot notice and
//: Settings, Import & export, so both say the same thing.
function integrityWords() {
  return "Your notebook file failed its check at start. Restore the newest backup in Settings, Import & export.";
}

function noteDamagedNotebook(check) {
  if (!check || check.ok !== false) return;
  toastAction(integrityWords(), "Open backups", () => openSettingsModal("data", "backup-now"), {
    go: { settings: "data", focus: "backup-now" },
    sticky: true,
  });
}

//: The second button of every "Moved to the bin." notice: the bin is the
//: Library with "Include the bin" ticked (`library-bin` in REVEAL_TARGETS), so
//: this is the same place Settings and Ctrl+K "Open the bin" lead to.
const GO_TO_BIN = { label: "Go to bin", run: () => revealFeature("library-bin") };

// --- the server-down banner (WORLD_CLASS_PLAN 22.1 item 6) ------------------
//
// Reported gap: "the server can go away. Only the log view says
// 'reconnecting'... everywhere else a stopped backend shows as buttons that
// do nothing." `api()` (app.js) already tells a real network failure (the
// backend is not there to answer) apart from every other kind of error, it
// used to just log one and rethrow; now it calls `noteServerDown` there and
// `noteServerUp` on its next success, so this file never polls a fetch of
// its own except while there is a failure to recover from.
//
// This reuses the toast recipe rather than inventing a banner: same node,
// same `.toast`/`.toast-action` classes and close button, the one thing
// different is that it never starts the usual timeout, because the message
// it carries stays true until the retry says otherwise. `noteServerDown`
// is idempotent (a second failed request while the banner is already up is
// a no-op, no stacked banners, no restarted backoff), and there is exactly
// one retry loop, cancelled and restarted from one place
// (`scheduleServerDownRetry`) so a manual Retry press and the poll it
// interrupts can never both be running at once.
let serverUnreachable = false;
let serverDownNote = null; // the persistent toast's own node, or null
let serverDownRetryTimer = null;
const SERVER_DOWN_RETRY_MIN_MS = 3000;
const SERVER_DOWN_RETRY_MAX_MS = 30000;
let serverDownRetryDelay = SERVER_DOWN_RETRY_MIN_MS;

function showServerDownBanner() {
  if (serverDownNote && serverDownNote.isConnected) return; // already up
  const box = $("toast-box");
  const note = document.createElement("div");
  note.className = "toast error server-down-toast";
  const text = document.createElement("span");
  text.className = "toast-msg";
  text.textContent = "Can't reach MemoryMap. Retrying…";
  const button = document.createElement("button");
  button.className = "small toast-action";
  button.textContent = "Retry";
  button.addEventListener("click", () => retryServerNow());
  note.append(text, button, toastCloseButton(note, null));
  toastStack(box, () => box.appendChild(note));
  serverDownNote = note;
}

function noteServerDown() {
  serverUnreachable = true;
  showServerDownBanner();
  scheduleServerDownRetry();
}

//: Cheap to call on every successful request, not just from the retry poll:
//: an ordinary request succeeding is the fastest possible sign the server is
//: back, no reason to make someone wait out the backoff for it.
function noteServerUp() {
  if (!serverUnreachable) return;
  serverUnreachable = false;
  serverDownRetryDelay = SERVER_DOWN_RETRY_MIN_MS;
  if (serverDownRetryTimer) {
    clearTimeout(serverDownRetryTimer);
    serverDownRetryTimer = null;
  }
  if (serverDownNote) {
    dismissToast(serverDownNote);
    serverDownNote = null;
  }
  flushNoteOutbox(); // notes kept on this device while it was gone
}

function scheduleServerDownRetry() {
  if (serverDownRetryTimer) return; // one loop at a time
  serverDownRetryTimer = setTimeout(async () => {
    serverDownRetryTimer = null;
    await pollServerHealth();
  }, serverDownRetryDelay);
  serverDownRetryDelay = Math.min(serverDownRetryDelay * 2, SERVER_DOWN_RETRY_MAX_MS);
}

//: `/health` takes no auth and answers before the lock screen, the same
//: reason the startup probe uses it: it is the cheapest possible "is
//: anything listening" question, and does not confuse "the server is up but
//: this endpoint needs a token" with "there is no server".
async function pollServerHealth() {
  try {
    const response = await fetch("/health", { signal: AbortSignal.timeout(4000) });
    if (response.ok) {
      noteServerUp();
      return;
    }
  } catch {
    // still down; fall through to reschedule
  }
  if (serverUnreachable) scheduleServerDownRetry();
}

function retryServerNow() {
  if (serverDownRetryTimer) {
    clearTimeout(serverDownRetryTimer);
    serverDownRetryTimer = null;
  }
  pollServerHealth();
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
  //: `at`: a toast's Undo finds the entry it stands for (`keepToastAction`).
  const action = { label, undo, redo, at: Date.now() };
  undoStack.push(action);
  if (undoStack.length > UNDO_STACK_LIMIT) undoStack.shift();
  // A fresh action invalidates whatever was available to redo, the same
  // rule every text editor's undo stack already follows.
  redoStack.length = 0;
  renderUndoBar();
  return action;
}

//: **An insight line's two verdicts** (CHAT_PLAN decision 60): Confirm writes
//: it as a fact the person vouched for ("Golf is a hobby of yours (confirmed
//: by you, 10 October)"), said that way from the next answer on; Not right
//: keeps it, and every near-variant of it, from being shown again. **One
//: compact pair on the sentence's own row** (INBOX 782, the owner: "redesign
//: the confirm and not right buttons ... and any other similar instances"): a
//: check and a cross with their words, quiet at rest, right-aligned, drawn by
//: `insightLine` for Chat and Tidy's Patterns and by `INSIGHT_VERDICT_ITEMS`
//: for the dashboard's ⋯. `onDone(verdict, result)` lets the surface replace
//: the line; a confirmed insight is drawn with no pair.
const INSIGHT_VERDICT_ITEMS = [
  { verdict: "confirm", label: "ph:check Confirm", title: "This is right: say it as a fact from now on" },
  { verdict: "dismiss", label: "ph:x Not right", title: "Not right: never show this or anything like it again" },
];

function insightSend(insight, verdict) {
  return apiJson(`/insights/${verdict}`, { method: "POST", body: JSON.stringify(insight) });
}

function insightVerdicts(insight, onDone) {
  const group = document.createElement("span");
  group.className = "insight-verdicts";
  group.setAttribute("role", "group");
  group.setAttribute("aria-label", "Is this right?");
  for (const item of INSIGHT_VERDICT_ITEMS) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `insight-verdict is-${item.verdict}`;
    button.title = item.title;
    setLabel(button, item.label);
    button.addEventListener("click", () =>
      insightSend(insight, item.verdict)
        .then((result) => onDone?.(item.verdict === "confirm" ? "confirmed" : "dismissed", result))
        .catch((error) => toast(error.message, true))
    );
    group.appendChild(button);
  }
  return group;
}

//: One insight sentence with its pair on the same row: the words take the
//: room, the pair sits at the end and wraps under them on a narrow screen.
function insightLine(insight, text, onDone, extraClass = "") {
  const line = document.createElement("p");
  line.className = `insight-line ${extraClass}`.trim();
  const words = document.createElement("span");
  words.className = "insight-text";
  words.textContent = text;
  line.append(words, insightVerdicts(insight, (verdict, result) => onDone?.(line, verdict, result)));
  return line;
}


//: **Rule 1.8's one shape** (WORLD_CLASS 1.8) for an act that reached the
//: server: an entry on the undo stack (the bar, Ctrl+Z, the history menu) and
//: a toast whose Undo is that same entry, taken off the stack when pressed so
//: Ctrl+Z cannot run it a second time. `tests/test_undo_contract.py` holds
//: every other function named for an undo to this file's contract.
function offerUndo(label, message, undo, redo, opts = {}) {
  const action = pushUndo(label, undo, redo);
  toastAction(
    message,
    "Undo",
    async () => {
      settleUndoFromToast(action);
      await Promise.resolve()
        .then(undo)
        .catch((error) => toast(error.message, true));
    },
    opts
  );
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
  action.undoneAt = Date.now();
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
      await refreshEntries([entryId]);
    },
    async () => {
      await api(`/entries/${entryId}`, { method: "PUT", body: JSON.stringify(afterBody) });
      await refreshEntries([entryId]);
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
//: **An open board, not the boards list**: the list's own actions (rename,
//: delete a board) are the app's, and went to an empty board history.
function boardHistoryActive() {
  const board = document.getElementById("library-view-whiteboard");
  const canvas = document.getElementById("wb-canvas-view");
  return Boolean(board && !board.classList.contains("hidden") && canvas && !canvas.classList.contains("hidden") && window.wbUndo);
}

//: **Which history a press walks** (the owner, 2026-10-05: "local undos and
//: redos ... for specific documents, whiteboards, mindmaps"). An open board or
//: map: its own (kept per board for the session). An open document: its own
//: editor history (kept per document for the session, `docResetDocument`).
//: Anywhere else: the app's stack below, for notes, tags, categories, links,
//: reminders and the rest. Inside a text field Ctrl+Z is always the field's.
//: `dir` is "redo" for the redo door: on a document the two can differ.
function surfaceHistory(dir = "undo") {
  if (boardHistoryActive()) {
    return { where: "board", undo: () => window.wbUndo(), redo: () => window.wbRedo?.(), canUndo: window.wbCanUndo, canRedo: window.wbCanRedo };
  }
  const docs = document.getElementById("tab-documents");
  if (docs && !docs.classList.contains("hidden") && typeof currentDoc !== "undefined" && currentDoc && window.docCanUndo && !appStackIsNewer(dir)) {
    return { where: "document", undo: () => window.docUndo(), redo: () => window.docRedo(), canUndo: window.docCanUndo, canRedo: window.docCanRedo };
  }
  return null;
}

//: **One timeline on an open document** (DOCUMENTS 24 row 1). A document's
//: own acts (rename, archive, a version restored, a note unlinked) reach the
//: server and sit on the app's stack; its typing sits in the editor's history.
//: Ctrl+Z walks whichever of the two holds the newer step, so a rename after a
//: paragraph undoes first and the paragraph next, the order they were made.
//: Before this the document's history took every press while one was open,
//: and an act on the stack could only be undone from its toast.
function appStackIsNewer(dir) {
  if (dir === "redo") {
    const top = redoStack[redoStack.length - 1];
    return Boolean(top) && (top.undoneAt || 0) >= (window.docRedoAt?.() || 0);
  }
  const top = undoStack[undoStack.length - 1];
  return Boolean(top) && top.at >= (window.docUndoAt?.() || 0);
}

async function performUndo() {
  const surface = surfaceHistory();
  if (surface) {
    await surface.undo();
    renderUndoBar();
    return;
  }
  const action = undoStack.pop();
  if (!action) return;
  try {
    await action.undo();
    action.undoneAt = Date.now();
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
  const surface = surfaceHistory("redo");
  if (surface) {
    await surface.redo();
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

//: The pair says which history it walks, so it is repainted when that
//: changes (a tab, a board, a document, a keystroke): once a frame at most.
let undoBarFrame = 0;
function scheduleUndoBar() {
  if (undoBarFrame) return;
  undoBarFrame = requestAnimationFrame(() => {
    undoBarFrame = 0;
    renderUndoBar();
  });
}

function renderUndoBar() {
  const undoBtn = $("status-undo");
  const redoBtn = $("status-redo");
  if (!undoBtn || !redoBtn) return;
  //: A board's own stack has no labels to name in the tooltip (its entries
  //: are "move this shape back", not a sentence), so the pair falls back to
  //: the plain verbs while one is open, and takes its enabled state from the
  //: board's counts: a button that is lit when there is nothing behind it is
  //: the thing that makes people stop trusting it. Each button asks for its
  //: own history, since on a document the newer step decides (`appStackIsNewer`).
  const surface = surfaceHistory();
  paintUndoDoor(undoBtn, "undo", surface, undoStack);
  paintUndoDoor(redoBtn, "redo", surfaceHistory("redo"), redoStack);
}

function paintUndoDoor(button, verb, surface, stack) {
  const redo = verb === "redo";
  const Verb = redo ? "Redo" : "Undo";
  const icon = redo ? "ph:arrow-u-up-right" : "ph:arrow-u-up-left";
  if (surface) {
    const can = redo ? surface.canRedo?.() : surface.canUndo?.();
    const where = surface.where === "board" ? "on this board" : "in this document";
    button.disabled = !can;
    paintStatusItem(button.id, {
      icon,
      title: can ? `${Verb} the last change ${where}` : `Nothing to ${verb} ${where}`,
      shortcut: can ? verb : "",
    });
    return;
  }
  const top = stack[stack.length - 1];
  button.disabled = !top;
  paintStatusItem(button.id, {
    icon,
    title: top ? `${Verb}: ${top.label}` : `Nothing to ${verb}`,
    shortcut: top ? verb : "",
    //: The right-click gesture is named here because a hidden gesture is not a
    //: feature: the same reason the nav pair's tooltips name theirs.
    rest: top && !redo ? `right-click for the last ${stack.length}` : "",
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
  if (!undoStack.length || surfaceHistory()) return;
  event.preventDefault();
  openUndoHistoryMenu($("status-undo"));
});
wireLongPress($("status-undo"), () => {
  if (undoStack.length && !surfaceHistory()) openUndoHistoryMenu($("status-undo"));
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
  ensureModule("askHistory").then(() => askAgainMenu(box, questions));
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
    const flat = stripFrontmatter(entry.content).replace(/^\s*(?:#{1,6}\s+|>\s?|[-*+]\s+|\d+\.\s+)/gm, "");
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
//: Why the last poll has no status, for Settings' line (INBOX 435): "slow"
//: (the 8s budget ran out, usually a model server slow to answer), "down"
//: (the app's own server did not answer `/health` either), "error" (it did,
//: but the status call failed), or null.
let modelStatusProblem = null;
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
    // Backend's own worst case is 2.5s (INSTALLED_REFRESH_BUDGET: the runner
    // call has its own thread and a poll serves the last answer past that),
    // so 8s leaves real headroom instead of racing it at the wire.
    modelStatus = await apiJson("/models/status", {
      silent: true,
      //: A timeout of a silent request (this poll is the only one that sets
      //: its own `AbortSignal.timeout`) is the "slow" state below, asked
      //: again on the next tick, so `api()` does not log it.
      signal: AbortSignal.timeout(8000)
    });
    statusEverAnswered = true;
    modelStatusProblem = null;
  } catch (err) {
    modelStatus = null; // locked or unreachable: pill shows the worst case
    if (err?.name === "TimeoutError" || err?.name === "AbortError") modelStatusProblem = "slow";
    else {
      const up = await fetch("/health", { signal: AbortSignal.timeout(3000) }).then((r) => r.ok).catch(() => false);
      modelStatusProblem = up ? "error" : "down";
    }
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
    // Off while the tab is hidden; 30s when idle (the status changes in
    // minutes, and every tick wakes the model runner). **Doubling while the
    // answer is byte-identical** (INBOX 266 item 7, gate: at most 2 requests an
    // idle minute); any change, a return to the tab, Settings or a job drops it
    // back to 30s. Cost: Ollama starting is seen in up to two minutes on an idle
    // laptop.
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

// Controls that only work with a chat model running are disabled with the
// reason, before the effort, not failed after it. **The list lives in the
// markup** (INBOX 203): `data-needs-model="<why>"` on the control, so a
// control added later cannot be forgotten here; `tests/test_frontend_ids.py`
// holds the inventory. Never marked: Save, Ask, search, tags, categories, the
// graph, reminders, documents, the meeting Save and "Map from notes"
// (`WORKS_WITHOUT_A_MODEL`): they work without a model and must not look
// diminished by its absence.

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
//: **A gated control that answers when pressed** (DOCUMENTS 24 row 3, the
//: CHAT_PLAN gating pattern). One marked `data-model-offer` is not disabled
//: with no model: it is `aria-disabled`, still a Tab stop, and a press opens a
//: popover saying why, what still works here (the attribute's own line) and
//: one way on, Set up a model. A disabled button explains nothing to someone
//: who presses it: the no-model sweep counted the documents' two as dead.
function closeModelGate(control) {
  if (control.dataset.modelOffer !== undefined) {
    control.setAttribute("aria-disabled", "true");
    return;
  }
  if (control.disabled) return;
  control.dataset.modelGated = "1";
  control.disabled = true;
}

function openModelGate(control) {
  if (control.dataset.modelOffer !== undefined) control.removeAttribute("aria-disabled");
  if (!control.dataset.modelGated) return;
  control.disabled = false;
  delete control.dataset.modelGated;
}

function openModelOffer(control) {
  closeHelpPopovers();
  const panel = document.createElement("div");
  panel.className = "help-body model-offer";
  panel.setAttribute("role", "dialog");
  panel.setAttribute("aria-label", "Needs a model");
  const why = document.createElement("p");
  why.textContent = `${control.dataset.needsModel}, and no model is connected. ${control.dataset.modelOffer}`.trim();
  const setUp = smallButton("ph:plugs Set up a model", "Open Settings at Models, where a local or remote model is connected", () => {
    entry.close();
    openSettingsModal("models");
  });
  setUp.classList.add("primary");
  panel.append(why, setUp);
  const entry = {
    panel,
    trigger: control,
    close() {
      openHelpPopovers.delete(entry);
      panel.remove();
      control.setAttribute("aria-expanded", "false");
    },
  };
  panel.style.visibility = "hidden";
  panel.classList.add("help-popover");
  (control.closest("dialog[open]") || document.body).appendChild(panel);
  panel.addEventListener("click", (event) => event.stopPropagation());
  openHelpPopovers.add(entry);
  control.setAttribute("aria-expanded", "true");
  placeHelpPopover(panel, control);
  setUp.focus();
}

//: Capture, so the control's own handler (which would start the AI act)
//: never sees a press made while the gate is shut.
document.addEventListener(
  "click",
  (event) => {
    const control = event.target.closest?.('[data-model-offer][aria-disabled="true"]');
    if (!control) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    openModelOffer(control);
  },
  true
);

function syncModelGatedControls(status = modelStatus) {
  const off = status ? status.ollama_running === false : false;
  for (const control of document.querySelectorAll("[data-needs-model]")) {
    const reason = control.dataset.needsModel;
    if (off) {
      closeModelGate(control);
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
      openModelGate(control);
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
    "No model connected. Ask shows the matching records below.",
    { dismissible: true, detail: "Ask answers from your notes alone until one is connected." }
  );
  //: The agent with no model runs acts and readings (AGENT_SKILLS_REFORM
  //: "Deepened 2026-10-10" row 1, `ai/starter_acts.py`), so the line says
  //: what a model adds rather than that nothing runs.
  renderAiOfflineNotice(
    $("command-palette-offline"),
    "No model connected. The agent runs acts and reads your notes.",
    { dismissible: true, detail: "Reminders, notes, tags, links and the day's changes work now. Open questions and drafting need a model." }
  );
  //: The Chat tab (INBOX 266 part 1, then 725): with no model a message is
  //: answered from the notes by the composer, so the box stays open and the
  //: line says what a model would add rather than that nothing answers.
  renderAiOfflineNotice(
    $("chat-offline"),
    "No model connected. Chat answers from your notes.",
    { dismissible: true, detail: "Chat quotes your notes until one is connected. A model adds AI answers and Agent mode." }
  );
  //: And the writing desk, which is the third surface that is nothing but
  //: Atlas: with no model it cannot draft at all, and before this the only
  //: thing that said so was a title on a button that could not be pressed.
  renderAiOfflineNotice(
    $("draft-offline"),
    "No model connected, so nothing can be drafted. The rest of this tab works."
  );
  //: UX-12: any other AI-only widget names its own line.
  for (const line of document.querySelectorAll("[data-offline-line]")) renderAiOfflineNotice(line, line.dataset.offlineLine);
  syncAgentPaletteAvailability();
  renderChatModeSeg();
}

//: **A control built after the last poll is gated when it arrives** (the
//: owner, 2026-10-10: "I can still activate skills ... when I have no model
//: running"). The poll applies `data-needs-model` every tick, but idle that is
//: thirty seconds, and the chat dock's Skills button is built by skills.js when
//: the dock first draws: it stayed pressable for up to half a minute after
//: boot (measured: enabled 2.5 s in, with the attribute set). Watching for added
//: nodes covers every lazily built control, including ones not written yet,
//: rather than asking each builder to remember a call. The records of one
//: task arrive together, so one gate pass however many nodes land.
new MutationObserver((records) => {
  if (modelStatus && records.some((r) => [...r.addedNodes].some((n) => n.querySelector?.("[data-needs-model]") || n.matches?.("[data-needs-model]")))) syncModelGatedControls();
}).observe(document.body, { childList: true, subtree: true });

//: **A banner can be closed for the session** (INBOX 732: "a way to
//: temporarily hide these no ai popups, they can appear again when the user
//: starts a new app session"). Kept in `sessionStorage`, which a new app
//: session starts empty, with a plain Set beside it for a profile that
//: refuses storage. Never `localStorage`: that would be for good.
const AI_OFFLINE_DISMISSED_KEY = "aiOfflineDismissed";
const aiOfflineDismissedNow = new Set();

function aiOfflineDismissed(id) {
  if (aiOfflineDismissedNow.has(id)) return true;
  try {
    return JSON.parse(sessionStorage.getItem(AI_OFFLINE_DISMISSED_KEY) || "[]").includes(id);
  } catch (err) {
    return false;
  }
}

function dismissAiOffline(id) {
  aiOfflineDismissedNow.add(id);
  try {
    sessionStorage.setItem(AI_OFFLINE_DISMISSED_KEY, JSON.stringify([...aiOfflineDismissedNow]));
  } catch (err) { /* memory alone still lasts until the window closes */ }
}

//: One row (DESIGN.md, "A notice"): an icon, one short sentence, the button
//: that fixes it, then the close when it has one. The container carries
//: `.notice`; what a surface says beyond the sentence goes in `detail`, which
//: becomes the button's title (INBOX 767: the long sentence was the ugly part).
//: Rebuilt
//: rather than toggled because the status poll calls this every tick and a
//: stale sentence is worse than none. `dismissible` adds the close (DESIGN.md,
//: "A notice that can be closed"): a dismissed one stays hidden for the session.
function renderAiOfflineNotice(container, what, { dismissible = false, detail = "" } = {}) {
  if (!container) return;
  container.replaceChildren();
  const off = aiIsOff();
  const closed = dismissible && aiOfflineDismissed(container.id);
  container.classList.toggle("hidden", !off || closed);
  if (!off || closed) return;
  //: The icon is the container's first child, which is where `.notice > .ph`
  //: styles it; `setLabel` on the container builds exactly that.
  setLabel(container, "ph:plugs");
  const text = document.createElement("span");
  text.className = "ai-offline-text";
  text.textContent = what;
  const link = document.createElement("button");
  link.type = "button";
  link.className = "ghost small";
  link.textContent = AI_OFFLINE_HINT;
  link.title = `Open Settings at Models, where a local or remote model is connected.${detail ? ` ${detail}` : ""}`;
  link.addEventListener("click", () => openSettingsModal("models"));
  container.append(text, link);
  if (!dismissible) return;
  const close = document.createElement("button");
  close.type = "button";
  close.className = "ghost small icon-only";
  close.dataset.dismiss = "notice";
  setLabel(close, "ph:x");
  close.title = "Hide this until you reopen the app";
  close.setAttribute("aria-label", "Hide this notice until you reopen the app");
  close.addEventListener("click", () => {
    dismissAiOffline(container.id);
    container.replaceChildren();
    container.classList.add("hidden");
  });
  container.append(close);
}

//: The popup agent no longer closes with no model (row 1 above): every
//: starter and any act the reading knows runs without one, so its field and
//: starters stay open and only say, on hover, what is answered how.
function syncAgentPaletteAvailability() {
  const input = $("command-palette-input");
  if (input) input.title = aiIsOff() ? "No model: acts and readings from your notes" : "";
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
//   off   AI sparkle, slashed, grey: no model connected, the offline way to run
//   warn  ! amber   loading or rebuilding, app works
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
  //: **"off", not "warn"** (INBOX 472, the first-run walk): this is the
  //: supported way to run, and an amber "!" (a 44px amber circle in the
  //: phone's top bar) was the loudest thing on a new person's first screen.
  //: Neutral, with the ring Settings, Models draws beside "isn't running".
  if (!chatReady && searchReady) {
    return {
      level: "off",
      title: "Notebook ready · chat AI off",
      detail:
        "Notes, search, tags, reminders and the graph all work. Connect a " +
        "model in Settings, Models to add chat and auto-filing.",
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
    level: "off",
    title: "Notebook ready · AI off",
    detail:
      "Writing, searching, tagging, reminders, documents and the graph all " +
      "work without any AI. Connect a model in Settings, Models to add chat, " +
      "auto-filing and search by meaning.",
  };
}

// The glyph is not decoration. Colour alone fails for the ~8% of men with a
// colour vision deficiency, and fails everyone in high-contrast mode, so the
// shape carries the same meaning the colour does.
// "…" for connecting rather than a spinner: a spinner has to be animated to
// read as one, and under prefers-reduced-motion a frozen spinner looks like a
// rendering fault. The ellipsis says "waiting" while perfectly still.
const AI_STATUS_GLYPH = { idle: "…", ok: "✓", warn: "!", error: "✕", off: "" };

//: **"AI off" is the app's AI sparkle with a slash** (INBOX 656, the owner:
//: "can the no ai available ai status icon be better??"). It was a hollow
//: ring, which said nothing; the sparkle is what every AI control here wears
//: (Ask, Refine, the agent), and the slash, cut clear of it by a mask so it
//: reads at 14px, says it is not connected. It stays in the muted ink on the
//: chip, never amber: the notebook is fine, which is the card's first words.
//: An svg in `currentColor`, not the icon font plus a pseudo-element, so it
//: costs the boot stylesheet nothing and centres by the dot's own grid.
function aiOffGlyph() {
  const ns = "http://www.w3.org/2000/svg";
  const make = (tag, attrs, parent) => {
    const el = document.createElementNS(ns, tag);
    for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
    if (parent) parent.appendChild(el);
    return el;
  };
  const svg = make("svg", { class: "ai-off-glyph", viewBox: "0 0 16 16", width: "14", height: "14", fill: "none", stroke: "currentColor", "stroke-width": "1.5", "stroke-linecap": "round", "stroke-linejoin": "round", "aria-hidden": "true", focusable: "false" });
  const mask = make("mask", { id: "ai-off-gap", maskUnits: "userSpaceOnUse", x: "0", y: "0", width: "16", height: "16" }, make("defs", {}, svg));
  make("rect", { width: "16", height: "16", fill: "white", stroke: "none" }, mask);
  make("path", { d: "M2.5 2.5L13.5 13.5", stroke: "black", "stroke-width": "3.4" }, mask);
  make("path", { d: "M8 1.4Q9.9 6.1 14.6 8Q9.9 9.9 8 14.6Q6.1 9.9 1.4 8Q6.1 6.1 8 1.4Z", mask: "url(#ai-off-gap)" }, svg);
  make("path", { d: "M2.5 2.5L13.5 13.5" }, svg);
  return svg;
}

//: **How the last answer went, on the AI dot** (WORLD_CLASS_PLAN, Placed
//: 2026-09-09 item 99 (c)): the model, the time it took and how much of its
//: window the question filled, set by the chat when a turn ends.
let lastAnswerFacts = null;

function lastAnswerLine() {
  const facts = lastAnswerFacts;
  if (!facts || !facts.ms) return "";
  const parts = [facts.model, `${(facts.ms / 1000).toFixed(1)} s`];
  if (facts.used && facts.window) parts.push(`${Math.min(100, Math.round((facts.used / facts.window) * 100))}% of its window`);
  return `Last answer: ${parts.filter(Boolean).join(", ")}.`;
}

function renderAiPill() {
  const button = $("ai-status");
  if (!button) return;
  const state = aiStatusState();
  button.dataset.level = state.level;
  //: "Checking" is three dots drawn by CSS, not "…": an ellipsis sits on the
  //: baseline in every font and the icon font's dots sit above the middle,
  //: 3px off either way (INBOX 435, measured); a box of known size is
  //: centred by the dot's own grid. ✓, ! and ✕ are within half a pixel.
  const dot = button.querySelector(".ai-status-dot");
  if (state.level === "off") {
    if (!dot.querySelector(".ai-off-glyph")) dot.replaceChildren(aiOffGlyph());
  } else dot.textContent = state.level === "idle" ? "" : AI_STATUS_GLYPH[state.level];
  // The button's own name for screen readers and for the native tooltip, so
  // the information is reachable without opening anything.
  const summary = `AI status: ${state.title}`;
  $("ai-status-label").textContent = summary;
  // button.title = `${state.title}\n\n${state.detail}`;
  $("ai-status-title").textContent = state.title;
  const last = lastAnswerLine();
  $("ai-status-detail").textContent = last ? `${state.detail} ${last}` : state.detail;
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
  if (!installing) toastAction(`${title}. Search is using keywords for now.`, "Fix it", () => openSettingsModal("searchindex", "embedding-model-select"), { record: false });
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
const STATUS_META_KEY = SHORTCUT_MAC ? "⌘K" : "Ctrl K";

// One item: an icon, a number, and a word. The number is bold and tabular so
// the row does not twitch sideways as counts change, a status bar that moves
// while you are reading it is the thing the header was rebuilt to stop doing.
function paintStatusItem(id, { icon, value, label, title, tone = "", shortcut = "", rest = "" }) {
  const button = $(id);
  if (!button) return;
  //: `shortcut` is a `DEFAULT_SHORTCUTS` action: its current binding goes on
  //: the tooltip (INBOX 701), and only when there is a tooltip to put it on.
  if (title && shortcut) title = shortcutTitle(title, shortcut);
  //: A gesture named after the chord ("right-click for the last 3").
  if (title && rest) title = `${title}: ${rest}`;
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
        "\n\nClick to open Activity, where it can stop.",
    });
  }

  // The palette already exists and is already on Ctrl/⌘-K; what it did not
  // have was anywhere on screen saying so. A shortcut nobody can see is a
  // shortcut only the person who wrote it uses.
  const command = $("status-command");
  command.replaceChildren();
  const key = document.createElement("span");
  key.className = "status-key";
  key.textContent = shortcutHint("palette") || STATUS_META_KEY;
  const word = document.createElement("span");
  word.textContent = "Commands";
  command.append(key, word);
  command.title = shortcutTitle("Search everything and jump anywhere", "palette");

  // Same reasoning one control along: the popup agent works from every tab
  // and had nothing on screen saying it exists. Reported as exactly that, 
  // it needed to be reachable from the tools popup, the palette, Settings
  // "and maybe even the bottom status bar".
  const agent = $("status-agent");
  if (agent) {
    agent.replaceChildren();
    const glyph = document.createElement("i");
    glyph.className = "ph ph-strategy";
    glyph.setAttribute("aria-hidden", "true");
    const word = document.createElement("span");
    //: UX-07: the name of the dialog it opens; "Ask" is Notes' and Chat's.
    word.textContent = "Agent";
    agent.append(glyph, word);
    //: Icon-only at every width (INBOX 618): the word is clipped by CSS, and
    //: names the button here so a screen reader and voice control keep it.
    agent.setAttribute("aria-label", "Agent");
    //: The chord comes from the table (`shortcutTitle`), not from a modifier
    //: guessed here: `STATUS_META_KEY` is the whole "Ctrl K"/"⌘K" hint, and
    //: appending to it once produced "Ctrl K+Shift+A", no shortcut at all.
    agent.title = shortcutTitle("Ask the agent anything, from any tab", "askAgent");
  }

  //: The Guide, built the same way one control along (INBOX 207): it left the
  //: header cluster with the agent's button, and the pair belongs together, one does
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
    //: Icon-only at every width (INBOX 618): the word is clipped by CSS, and
    //: names the button here so a screen reader and voice control keep it.
    find.setAttribute("aria-label", "Find");
    //: Built the same way the agent's hint two controls up is.
    find.title = shortcutTitle("Search everything you keep, and the app itself", "findAnything");
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
    guide.setAttribute("aria-label", "Guide");
    guide.title = shortcutTitle(`Ask ${guideName} how this app works, from any tab`, "askAtlas");
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
  } else if (status.embedding_backend !== "ollama" && status.builtin_embedding_installing) {
    state = "installing, search uses keywords until it is done";
  } else if (status.embedding_backend !== "ollama" && status.builtin_embedding_installed === false) {
    //: "not ready" read as "wait", when nothing was coming (INBOX 431 (3)).
    state = "not installed, search uses keywords (install it under Packages)";
    cls = "error";
  } else if (status.embedding_error) {
    state = "Unavailable: using keyword search (details below)";
    cls = "error";
  }
  //: **In words: is it working, and how well** (INBOX 431 (3), the owner:
  //: "half the time I can't tell if it is working or how well"). How many
  //: notes it can find by meaning, a re-index's progress, and how the last
  //: search actually found its notes.
  const reindex = status.reindex;
  const cover = status.embedding_coverage;
  const parts = [state];
  if (reindex && reindex.status === "running" && reindex.total) {
    parts.push(`indexing ${reindex.done} of ${reindex.total} notes`);
  } else if (status.embedding_ready && cover && cover.total) {
    parts.push(
      cover.indexed >= cover.total
        ? `all ${cover.total} notes searchable by meaning`
        : `${cover.indexed} of ${cover.total} notes searchable by meaning`
    );
  }
  const last = status.last_search?.mode;
  if (last) {
    parts.push(
      last === "keyword" ? "last search used keywords only"
        : last === "semantic" ? "last search matched by meaning"
          : "last search matched by meaning and keywords"
    );
  }
  el.textContent = `Search engine: ${engine}: ${parts.join(", ")}`;
  el.className = `status ${cls}`;
}

// What to call the backend on screen. The whole UI was written when there was
// only Ollama, and the word is in a dozen strings; this is the one place that
// decides, so the rest read from it (§6).
// The Chat / Agent pair. The hidden checkbox stays the single source of truth
//, every other reader in the app already consults it, and a second store for
// the same fact is how two of them end up disagreeing. These buttons just show
// it and set it.
//: Whether Agent mode can run right now: a model that can answer
//: (`model_ready`: a reachable server is not enough, INBOX 778), or the Needle
//: extra on disk (decision 22). No status yet or a failed poll counts as
//: neither. One reader, so the segment, the "Ask about this" switch and the Web
//: toggle's title cannot disagree.
function agentModeAvailable() {
  return modelStatus?.model_ready === true || !!modelStatus?.tools_engine;
}

function renderChatModeSeg() {
  //: **Agent mode needs something that can call tools** (INBOX 725, the
  //: owner: "maybe agent mode should be disabled though unless needle is used
  //: to call tools without an ai"). With no model and no Needle it is greyed
  //: with its reason and Ask shows as the mode in use, without touching the
  //: saved choice, which comes back with the model. With Needle ready it runs
  //: there, and says so.
  const engine = modelStatus?.tools_engine || null;
  const gated = !agentModeAvailable();
  const agentButton = document.querySelector('#chat-mode-seg [data-chat-mode="agent"]');
  if (agentButton) {
    if (agentButton.dataset.enabledTitle === undefined) agentButton.dataset.enabledTitle = agentButton.title;
    agentButton.disabled = gated;
    agentButton.title = gated
      ? `Agent mode needs a model, or the Needle extra, to call tools. ${AI_OFFLINE_HINT}.`
      : engine
        ? "Agent mode runs on Needle with no model: it calls tools and writes no prose of its own."
        : agentButton.dataset.enabledTitle;
  }
  renderWebSearchToggle();
  const agent = $("tools-toggle").checked && !gated;
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

function renderSettings() {
  const status = modelStatus;
  const ollamaLine = $("ollama-status");

  //: **Only "can't reach" when it cannot** (INBOX 435): this said the
  //: app's server was unreachable while the app was plainly running, on a
  //: first open before the status had answered and whenever a slow model
  //: server ran the poll past its budget.
  if (!status) {
    ollamaLine.textContent =
      {
        slow: "The model server is slow to answer. Checking again…",
        error: "Couldn't read the models' status. Checking again…",
        down: "Can't reach the MemoryMap server.",
      }[modelStatusProblem] || "Checking the models…";
    ollamaLine.className = `status ${modelStatusProblem === "down" ? "off" : "is-checking"}`;
    //: The pane's shape under the line while it waits, never the line alone
    //: (DESIGN.md's list recipe). Not when the answer is a fault: a skeleton
    //: says "on its way", and "can't reach" is not that.
    if (modelStatusProblem === "down") clearSkeletons($("models-skeleton"));
    else showSkeletons($("models-skeleton"), 2);
    if (!modelStatusProblem) refreshModelStatus().then(() => settingsOpen() && renderSettings());
    return;
  }
  clearSkeletons($("models-skeleton"));

  // Name the backend that actually answered. Saying "Ollama not detected"
  // when the app was pointed at LM Studio sends people to install the wrong
  // thing (§6).
  const backend = backendLabel(status);
  //: The dot is the line's class, as on the search engine line under it,
  //: not a typed "●"/"○" beside a CSS dot: two alphabets for one signal.
  //: Section 21 row 12: an address the person typed that nothing answers is
  //: a different problem from a server that is not started, and says so.
  ollamaLine.textContent = status.ollama_running
    ? `${backend} is running`
    : status.unreachable_hint || `${backend} isn't running`;
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
  //: The notice recipe's icon first (section 21 rows 1 and 2), then the line.
  const say = (text) => setLabel(embeddingError, `ph:warning ${text}`);
  if (status.embedding_error && /^Search by meaning/.test(status.embedding_error)) {
    say(
      `${status.embedding_error}. ` +
      (status.ollama_running
        ? `Or switch the search engine to ${EMBEDDING_FALLBACK_MODEL} below: smaller, and offline.`
        : `Or start Ollama and pick ${EMBEDDING_FALLBACK_MODEL} as the search engine: smaller, and offline.`)
    );
  } else if (status.embedding_error) {
    say(
      `Search engine problem: ${status.embedding_error}: semantic search is ` +
      "falling back to keywords. Quick fix: switch the search engine below to " +
      "an Ollama embedding model (download nomic-embed-text from the list), " +
      "it runs fully offline. Full details in Settings → Logs."
    );
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
  stagePrimary("embedding-apply", "embedding-error-fix", !fixRow.classList.contains("hidden"));
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
    //: Both live in the lazy `settingsUi` file: one check that it has loaded
    //: covers the two (it has whenever Settings is open, the only time this runs).
    if (typeof renderSuggested === "function") {
      renderInstalledModels(status);
      renderSuggested(status);
    }
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
  const auto = backgroundTasks.find((t) => t.auto);
  if (auto || lazyModuleLoads.has("semanticNotice")) semanticInstallNotice(auto);
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

//: **Housekeeping is listed, not announced** (INBOX 432). Warming the filing
//: model at launch opened the Agent activity panel over the notes and then
//: flew "Finished: Warming up the filing model" past the corner, two signals
//: for work nobody asked for and nothing waits on; filing a note already has
//: its own line under the composer. They still get a row in the run list and
//: still say so when they fail.
//: Start-up upkeep and Settings downloads too (INBOX 653).
const QUIET_TASK_KINDS = new Set([
  "job-warm-filing", "job-file-entry", "filing-late",
  "embeddings", "embedding-model", "reindex", "searxng-start", "searxng",
  "job-caption", "caption", "page-read", "pull", "extra",
]);

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
    if (!QUIET_TASK_KINDS.has(task.kind)) openPanelForRun(run);
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
      if (!QUIET_TASK_KINDS.has(task.kind)) agentActivityNotice(`Finished: ${(ended && ended.label) || task.label}`);
    }
  }
}

// --- optional extras and embedding models: Settings, Packages, is settings-packages.js (lazy, INBOX 595) ---
