// Other devices, as this computer's window hears of them (INBOX 867).
//
// The owner: "Just make sure everything is handled for the user
// automatically". A phone that signs in for the first time is held until
// someone here says yes (core/lantrust.py), and a network nobody allowed
// keeps the LAN port closed; both reach this window as a toast and a row in
// the bell. Loaded by `startReminderWatch` (status.js) once per page.
//
// One request at a time, held open by the server (`GET /auth/lan-watch`)
// until something changes or 25 s pass, so a notice arrives at once and an
// idle minute costs two requests. It stops for good when LAN mode is not
// serving this run, or on another device (403): only this computer answers.

const lanWatchState = { running: false, seen: new Set(), heldKey: "", version: -1 };

async function lanWatchOnce() {
  const token = localStorage.getItem("token") || "";
  const response = await fetch(`/auth/lan-watch?since=${lanWatchState.version}`, {
    headers: token ? { "X-Auth-Token": token } : {},
    signal: AbortSignal.timeout(40000),
  });
  if (response.status === 401) return "locked";
  if (!response.ok) return "stop";
  const state = await response.json();
  lanWatchState.version = state.version;
  if (!state.serving) return "stop";
  for (const device of state.pending || []) lanNoticeDevice(device);
  lanNoticeHeld(state.held);
  return "again";
}

async function lanWatch() {
  if (lanWatchState.running) return;
  lanWatchState.running = true;
  try {
    for (;;) {
      let next = "again";
      try {
        next = await lanWatchOnce();
      } catch {
        next = "wait"; // the server restarting, or asleep: try again shortly
      }
      if (next === "stop") return;
      //: Locked: ask again in a minute rather than drawing the lock screen
      //: from here; an unlock does not restart this loop, so it keeps going.
      if (next !== "again") await new Promise((done) => setTimeout(done, next === "locked" ? 60000 : 10000));
    }
  } finally {
    lanWatchState.running = false;
  }
}

async function lanAnswerDevice(device, verdict) {
  try {
    await apiJson(`/auth/lan-devices/${encodeURIComponent(device.id)}/${verdict}`, { method: "POST" });
    toast(verdict === "allow" ? `${device.name} can sign in now.` : `${device.name} was not let in.`);
    if (typeof renderLanAccess === "function") renderLanAccess();
  } catch (error) {
    toast(error.message || "That device is no longer waiting.", "info");
  }
}

function lanNoticeDevice(device) {
  if (lanWatchState.seen.has(device.id)) return;
  lanWatchState.seen.add(device.id);
  const title = `${device.name} at ${device.address} wants to open this notebook`;
  toastAction(title, "Allow", () => lanAnswerDevice(device, "allow"), {
    sticky: true,
    record: false,
    also: { label: "Deny", run: () => lanAnswerDevice(device, "deny") },
  });
  recordNotification({
    kind: "info",
    title,
    detail: "It gave the right password. Allow it here, or in Settings, Other devices.",
    key: `lan-device:${device.id}:${Math.round(device.at)}`,
    action: { settings: "account", focus: "account-lan-pending", label: "Review" },
  });
}

const LAN_HELD_WORDS = {
  new_network: "this network is not one you allowed",
  unknown_network: "this network could not be identified",
  public_network: "Windows calls this network public",
};

function lanNoticeHeld(held) {
  const key = held ? `${held.reason}:${held.network?.key || ""}` : "";
  if (key === lanWatchState.heldKey) return;
  lanWatchState.heldKey = key;
  if (!held) return;
  const where = held.network?.label || "this network";
  const title = `Other devices can't open this notebook on ${where}`;
  toastAction(title, "Review", () => openSettingsModal("account", "account-allow-lan"), { record: false, ms: 12000 });
  recordNotification({
    kind: "info",
    title,
    detail: `Kept closed because ${LAN_HELD_WORDS[held.reason] || "this network is not allowed"}. Settings, Other devices has Allow on this network.`,
    key: `lan-held:${key}`,
    action: { settings: "account", focus: "account-allow-lan", label: "Review" },
  });
}

lanWatch();
