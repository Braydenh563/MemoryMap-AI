// A due reminder's system notification (TIMELINE_PLAN 11 row 4, WORLD_CLASS_PLAN
// decision 69). Loaded by `checkDueReminders` (status.js) the first time
// something comes due, so none of it is boot code.
//
// With no push server nothing can wake the service worker at a time, so the
// page's own timer is what fires: it runs in a hidden tab and in an installed
// app's window. What the worker adds is a notification that outlives the
// tab and carries Done and Snooze 10 minutes (`notificationclick`, sw.js).
// In the desktop app the launcher posts the system notification itself
// (`/health`'s `os_notify`, core/reminder_notifier.py), so the page posts
// none and keeps the toast, the chime and the centre.

const reminderNotify = { launcher: null, listening: false };

async function launcherNotifies() {
  if (reminderNotify.launcher === null) {
    const health = await apiJson("/health", { silent: true }).catch(() => null);
    reminderNotify.launcher = Boolean(health && health.os_notify);
  }
  return reminderNotify.launcher;
}

//: The worker did Done or Snooze, or was asked to open the reminders; this
//: page shows it now rather than at the next minute's poll.
function listenToReminderWorker() {
  if (reminderNotify.listening || !navigator.serviceWorker) return;
  reminderNotify.listening = true;
  navigator.serviceWorker.addEventListener("message", (event) => {
    const kind = event.data && event.data.type;
    if (kind === "reminders-changed") loadReminders().catch(() => {});
    if (kind === "reminders-open") switchTab("reminders");
  });
}

async function showReminderNotification(title, body, reminderId) {
  if (await launcherNotifies()) return true;
  if (!("Notification" in window) || Notification.permission !== "granted") return false;
  const registration = await navigator.serviceWorker?.getRegistration?.().catch(() => null);
  if (!registration || !registration.showNotification) return notify(title, body);
  listenToReminderWorker();
  const tag = reminderId ? `reminder-${reminderId}` : "memorymap-reminders";
  try {
    await registration.showNotification(title, {
      body,
      icon: "/icon-512.png",
      tag,
      //: The worker acts with this after the tab is gone: the session's own
      //: token (it stays in this browser's profile, as localStorage does)
      //: and the person's offset, for a repeat's next day.
      data: { id: reminderId || null, token: authToken(), tz: -new Date().getTimezoneOffset() },
      actions: reminderId
        ? [
            { action: "done", title: "Done" },
            { action: "snooze", title: "Snooze 10 minutes" },
          ]
        : [],
    });
  } catch {
    return notify(title, body);
  }
  //: Closed after the same 12 s as a page notification (status.js): the owner
  //: reported ones that stayed until closed by hand.
  setTimeout(() => {
    registration
      .getNotifications({ tag })
      .then((shown) => shown.forEach((n) => n.close()))
      .catch(() => {});
  }, NOTIFICATION_AUTOCLOSE_MS);
  return true;
}

//: One notification for one reminder, a summary for several; the toast
//: always, because Do Not Disturb can hide the system one without the app
//: knowing. An early alert has no Done: it is not due yet.
async function announceReminders(fresh) {
  const one = fresh.length === 1 ? fresh[0] : null;
  const text = one ? one.text : `${fresh.length} reminders are due`;
  await showReminderNotification(one ? "Reminder" : "MemoryMap", text, one && !one.early ? one.id : null);
  toast(text, false, { exempt: true });
}
