// update-dialogs.js: the update check, applying an update, and the two
// "a new version" dialogs. Moved out of settings-panes.js on 2026-10-05 (the
// boot-script gzip budget, ratchet in tests/test_static_compression.py): the
// check runs from Settings' "Check for updates" button and, only for someone who
// turned it on, once at startup; the dialogs open from those and from the
// source-checkout notice. Loaded on first use by `LAZY_MODULES.updates`
// (app.js), whose stand-ins for `checkForUpdate`, `applyUpdateNow` and
// `showSourceUpdatedDialog` fetch this file and then call the real one. All
// three are `async` or read by nobody (callers `await` the result), so the
// stand-in's promise is the shape they already return.
// `checkForSourceUpdateNotice` stays in settings-panes.js: it runs on every
// start, and the common answer (nothing was updated) needs none of this.

// Shared by the "Check for updates" button and the silent startup check. `silent`
// suppresses the status-line text and the toast for the common "you're on
// the latest version" outcome: the startup check should only ever speak up
// when there's actually something to say.
async function checkForUpdate(silent = false) {
  const status = $("update-check-status");
  const applyBtn = $("update-apply-now");
  if (!silent && status) setLabel(status, "ph:spin Checking…");
  let result;
  try {
    // A click on Check for updates is the person asking for this one
    // request, so the server does not refuse it with the switch off.
    result = await apiJson(silent ? "/update/check" : "/update/check?manual=1", { silent: true });
  } catch (error) {
    if (!silent && status) status.textContent = "Couldn't check for updates.";
    return;
  }
  if (!result || !result.checked) {
    if (!silent && status) {
      //: The server's own sentence when it wrote one. It knows which of
      //: "offline", "no release published yet" and "rate-limited" happened,
      //: and all three used to be printed here as the first: reported with a
      //: screenshot of "Couldn't reach GitHub" on a machine that was online,
      //: which it was, and had nothing to update to.
      status.textContent =
        result && result.reason === "disabled"
          ? "Enable the checkbox above, then try again."
          : (result && result.message) || "Couldn't reach GitHub to check for updates.";
    }
    applyBtn?.classList.add("hidden");
    return;
  }
  // Settings -> About's own fallback for "or they can manually do it in the
  // settings", same button, same apiJson('/update/apply') call the
  // post-login dialog's "Update automatically" makes.
  applyBtn?.classList.toggle("hidden", !(result.update_available && result.can_auto_apply));
  if (result.update_available) {
    const msg = `Version ${result.latest} is available (you have ${result.current}).`;
    if (status) status.textContent = msg;
    // The silent startup check is the one that runs on every login, asked
    // for directly: a popup after login, but "only if... not every time
    // they login". A toast alone auto-dismisses in 5.5s and is easy to miss
    // entirely if it fires mid-startup while other things are still
    // loading, so a newly-detected version also gets a real dialog, but
    // only once per version, via the same localStorage-latch pattern the
    // rest of this app uses for "seen it" state (e.g. the graph layout/
    // colour prefs above). Re-showing it every login for a version the
    // user has already dismissed would be the exact nagging this was
    // asked to avoid.
    if (silent && localStorage.getItem(UPDATE_SEEN_KEY) !== result.latest) {
      showUpdateAvailableDialog(result);
    } else {
      toast(msg);
    }
  } else if (!silent && status) {
    status.textContent = `You're on the latest version (${result.current}).`;
  }
}

//: **Ask once** (the owner, 2026-10-05, WORLD_CLASS_PLAN 12 "Decisions
//: made"): the first start asks whether to check for updates by itself, and
//: until the answer is in nothing about updating touches the network.
//: Closing the question is "no", the answer that touches nothing; Settings,
//: About holds the switch and the Check for updates button either way.
//: start.sh may already have asked in the terminal, and then this never runs.
async function askUpdateChoiceOnce() {
  const yes = await confirmDialog(
    "Check for updates automatically?\n\nMemoryMap AI can look for a newer version each time it starts. " +
      "Nothing about your notes is sent. You can change this in Settings, About.",
    { confirmLabel: "Check automatically", cancelLabel: "Don't check", danger: false }
  );
  try {
    const saved = await apiJson("/update/choice", { method: "POST", body: JSON.stringify({ check: Boolean(yes) }) });
    if (prefsCache) Object.assign(prefsCache, saved);
    if ($("pref-update-check")) $("pref-update-check").checked = Boolean(saved.update_check_enabled);
    if ($("pref-auto-update")) $("pref-auto-update").checked = Boolean(saved.auto_update_enabled);
  } catch (error) {
    toast(error.message || "Couldn't save that answer.", true);
    return;
  }
  if (yes) await checkForUpdate(true);
}

//: The last version this profile was already told about, so the post-login
//: dialog fires once per newly-available release rather than every login
//: for as long as the user hasn't updated.
const UPDATE_SEEN_KEY = "update-seen-version";

// Shared by the dialog's "Update automatically" button and Settings ->
// About's manual one: asked for directly: "either by the message popping
// up the next time they load up the app and are connected to the internet,
// and/or they can manually do it in the settings." `onProgress(state)` is
// called on every poll (`{step, done_bytes, total_bytes}` from
// GET /update/apply/status) so each caller can render it its own way; the
// promise resolves `true` on outcome "launched" and `false` on "failed", 
// never rejects, since a failed apply is exactly the case both callers have
// to handle gracefully (offline, GitHub unreachable, no asset), not an
// exception to propagate.
async function applyUpdateNow(onProgress, tag = null) {
  const url = tag ? `/update/apply?tag=${encodeURIComponent(tag)}` : "/update/apply";
  const start = await apiJson(url, { method: "POST" }).catch((error) => {
    onProgress?.({ step: error.message, failed: true });
    return null;
  });
  if (!start) return false;
  for (;;) {
    await new Promise((resolve) => setTimeout(resolve, 700));
    const state = await apiJson("/update/apply/status", { silent: true }).catch(() => null);
    if (!state) continue; // a transient miss mid-poll isn't a failure
    onProgress?.(state);
    if (state.outcome === "launched") return true;
    if (state.outcome === "failed") return false;
    if (!state.running) return false; // shouldn't happen, but never loop forever
  }
}

function showUpdateAvailableDialog(result) {
  const overlay = document.createElement("div");
  overlay.className = "modal-overlay confirm-overlay";
  overlay.setAttribute("role", "dialog");
  overlay.setAttribute("aria-modal", "true");
  overlay.setAttribute("aria-label", "A new version is available");

  const card = document.createElement("div");
  card.className = "card modal-card confirm-card";
  const heading = document.createElement("h3");
  heading.textContent = "A new version is available";
  const text = document.createElement("p");
  text.className = "confirm-text";
  text.textContent = result.can_auto_apply
    ? `MemoryMap AI ${result.latest} is out: you're on ${result.current}. ` +
      "Update automatically (downloads and installs it, then closes MemoryMap " +
      "AI: reopen it in a minute or two to start using the new version), or " +
      "download it yourself from the release page."
    : `MemoryMap AI ${result.latest} is out: you're on ${result.current}. ` +
      "This app never updates itself without asking: download the new " +
      "version yourself whenever you're ready.";
  const progress = document.createElement("p");
  progress.className = "muted";
  const row = document.createElement("div");
  row.className = "row confirm-actions";

  let dismissed = false;
  const dismiss = () => {
    if (dismissed) return;
    dismissed = true;
    document.removeEventListener("keydown", onKey, true);
    overlay.remove();
    localStorage.setItem(UPDATE_SEEN_KEY, result.latest);
  };
  const onKey = (event) => {
    if (event.key === "Escape") {
      event.stopPropagation();
      dismiss();
    }
  };

  const later = smallButton("Remind me next time", "Remind me next time", dismiss);
  const view = document.createElement("a");
  view.href = result.url;
  view.target = "_blank";
  view.rel = "noopener";
  // A real <a>, not a button with a click handler that navigates, right-
  // click "open in new tab", middle-click, and Ctrl-click all need to keep
  // working the way they do on every other external link in this app. The
  // `.small`/`.ghost` button rules are scoped to `button.small` and don't
  // reach an anchor at all, hence the dedicated class below rather than
  // relying on those.
  view.className = "small update-dialog-link";
  view.textContent = "View release";
  view.addEventListener("click", dismiss);
  row.append(later, view);

  if (result.can_auto_apply) {
    const auto = smallButton("Update automatically", "Update automatically", async () => {
      auto.disabled = true;
      later.disabled = true;
      const ok = await applyUpdateNow((state) => {
        progress.textContent = state.total_bytes
          ? `${state.step} (${Math.round((state.done_bytes / state.total_bytes) * 100)}%)`
          : state.step;
      });
      if (!ok) {
        // A failed apply must not mark this version "seen", asked for
        // directly: it has to come back next login while still offline (or
        // whatever the real cause was), not go quiet. Re-enabling the
        // buttons also lets them retry immediately without waiting for
        // that next login at all.
        auto.disabled = false;
        later.disabled = false;
        toast(progress.textContent || "Couldn't apply the update.", true);
      }
      // On success the app exits itself shortly after (routes_update.py): 
      // nothing left to do here; the dialog just stays up, showing the
      // last progress line, until the process closes.
    }, false);
    row.appendChild(auto);
  }

  card.append(heading, text, progress, row);
  overlay.appendChild(card);
  wireBackdropClose(overlay, () => dismiss());
  document.addEventListener("keydown", onKey, true);
  document.body.appendChild(overlay);
  later.focus();
}


function showSourceUpdatedDialog(result) {
  const overlay = document.createElement("div");
  overlay.className = "modal-overlay confirm-overlay";
  overlay.setAttribute("role", "dialog");
  overlay.setAttribute("aria-modal", "true");
  overlay.setAttribute("aria-label", "MemoryMap AI was updated");

  const card = document.createElement("div");
  card.className = "card modal-card confirm-card";
  const heading = document.createElement("h3");
  heading.textContent = "MemoryMap AI was updated";
  const text = document.createElement("p");
  text.className = "confirm-text";
  text.textContent = result.from
    ? `Your checkout auto-updated from ${result.from} to ${result.to} when you started it just now.`
    : `Your checkout auto-updated to ${result.to} when you started it just now.`;
  const row = document.createElement("div");
  row.className = "row confirm-actions";

  let dismissed = false;
  const dismiss = () => {
    if (dismissed) return;
    dismissed = true;
    document.removeEventListener("keydown", onKey, true);
    overlay.remove();
  };
  const onKey = (event) => {
    if (event.key === "Escape") {
      event.stopPropagation();
      dismiss();
    }
  };
  const ok = smallButton("Got it", "Got it", dismiss, false);
  row.appendChild(ok);

  card.append(heading, text, row);
  overlay.appendChild(card);
  wireBackdropClose(overlay, () => dismiss());
  document.addEventListener("keydown", onKey, true);
  document.body.appendChild(overlay);
  ok.focus();
}
