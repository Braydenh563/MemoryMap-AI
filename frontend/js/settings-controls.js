// settings-controls.js: the click, change and input listeners of every control
// inside the Settings window. They were top-level element `addEventListener`
// statements spread over skills.js, settings-panes.js, ai-tools.js,
// phone-shell.js, wiring.js, settings-wiring.js and spaces-find.js, and moved
// here on 2026-10-05 (the boot-script gzip budget, ratchet in
// tests/test_static_compression.py): a control inside the window cannot be
// pressed before the window opens, so nothing here is needed to draw the
// first screen.
//
// **Why this is safe.** The window opens in exactly one place,
// `openSettingsModal` (settings.js), and its first line awaits
// `ensureModule("settingsControls")`, before the window is unhidden, so there
// is no moment in which a control is on screen without its listener. Each
// statement is moved whole, with the comment that sat on it, in the order the
// files loaded, so two listeners on one element (`pref-export-dir` has two)
// still run in the order they did. No other file adds a listener to any of
// these elements (checked by listing every `addEventListener` on each id), and
// nothing in the boot files clicks or dispatches on them, so no listener is
// reached before the window is.
//
// Only element listeners are here. The handlers they call (`savePrefs`,
// `applyBackendChoice`, ...) stay in the boot files, because other code calls
// them too, and document-level listeners (Ctrl+S on Preferences, the
// `storage` event) stay because they run with the window closed.
//: The marker `openSettingsModal` looks for, so it only waits for this file once.
const SETTINGS_CONTROLS_READY = true;

// ---- from skills.js ----

$("small-model-mode")?.addEventListener("change", async () => {
  const select = $("small-model-mode");
  const status = $("small-model-mode-status");
  if (status) status.textContent = "Saving…";
  try {
    prefsCache = await apiJson("/preferences", {
      method: "PUT",
      body: JSON.stringify({ small_model_mode: select.value }),
    });
  } catch (error) {
    if (status) {
      status.classList.add("error");
      status.textContent = error.message;
    }
    return;
  }
  if (!status) return;
  status.classList.remove("error");
  status.textContent =
    select.value === "on"
      ? "Every skill step is offered only the tool it names."
      : select.value === "off"
        ? "Every step is offered the skill's whole toolbox."
        : "Decided per run from the chat model's name.";
});

$("run-budget-tokens")?.addEventListener("change", saveRunBudget);

$("run-budget-seconds")?.addEventListener("change", saveRunBudget);

$("tool-filter")?.addEventListener("input", applyToolFilter);

// ---- from settings-panes.js ----

$("account-allow-lan")?.addEventListener("change", async (event) => {
  const box = event.target;
  const wanted = box.checked;
  box.checked = !wanted; // the server's answer decides what it shows
  try {
    if (!wanted) {
      const off = await apiJson("/auth/lan-access", {
        method: "POST",
        body: JSON.stringify({ enabled: false }),
      });
      renderLanState(off);
      //: The bind itself doesn't drop until the next launch (`netbind`'s own
      //: comment on `restart_required`), the same as turning it on: this
      //: computer's own access never depended on it, but another device
      //: already in can still reach the app until the app is restarted.
      if (off.restart_required) {
        toastAction("Restart to close the app to other devices now.", "Restart now", () =>
          restartMemoryMap({ confirm: false })
        );
      } else {
        toast("Only this computer will be able to open the app.");
      }
      return;
    }
    let reply = null;
    const done = await askPasswordPrompt({
      title: "Allow other devices",
      message: "Enter your password to let devices on this network open the app. They will need it too.",
      submitLabel: "Allow",
      submit: async (password) => {
        reply = await apiJson("/auth/lan-access", {
          method: "POST",
          body: JSON.stringify({ enabled: true, current_password: password }),
          ownsAuthErrors: true,
        });
        return reply;
      },
    });
    if (done && reply) {
      renderLanState(reply);
      if (reply.restart_required) {
        toastAction("Other devices can open the app after a restart.", "Restart now", () =>
          restartMemoryMap({ confirm: false })
        );
      } else {
        toast("Other devices can already open the app at this address.");
      }
    }
  } catch (error) {
    toast(error.message, true);
  }
});

$("account-lan-regenerate")?.addEventListener("click", async () => {
  const ok = await confirmDialog(
    "Regenerate the certificate?\n\nEvery device that opened the app before warns once more, " +
      "with the new fingerprint to compare.",
    { confirmLabel: "Regenerate", danger: false }
  );
  if (!ok) return;
  try {
    renderLanState(await apiJson("/auth/lan-certificate", { method: "POST" }));
    toast("New certificate made. Compare its fingerprint on the other device.");
  } catch (error) {
    toast(error.message || "Couldn't make a new certificate.", true);
  }
});

$("privacy-refresh")?.addEventListener("click", () => renderPrivacyReceipt().catch(() => {}));

$("backup-retention")?.addEventListener("change", async (e) => {
  const status = $("backup-retention-status");
  const keep = Number(e.target.value);
  try {
    const result = await apiJson("/backups/retention", {
      method: "PUT",
      body: JSON.stringify({ keep }),
    });
    status.textContent = result.removed
      ? `Saved: removed ${result.removed} old backup${result.removed === 1 ? "" : "s"}.`
      : "Saved.";
    renderBackups();
  } catch (error) {
    status.textContent = error.message;
    renderBackupRetention(); // put the field back to what's actually saved
  }
});

// ---- from ai-tools.js ----

$("embedding-error-fix").addEventListener("click", runEmbeddingFallback);

// ---- from phone-shell.js ----

$("account-change").addEventListener("click", changePassword);

//: Re-encrypt private notes (WORLD_CLASS_PLAN, Placed 2026-09-09, 261's
//: vault re-key, `POST /auth/rotate-vault-key`): a new key for every private
//: note. Like Change password it ends every other session and hands this tab
//: a fresh token, kept under the key `authToken()` reads.
//: The password is asked on the lock card in prompt mode (DESIGN.md's recipe
//: for one action's password; tests/test_lock_boundary.py), which carries the
//: throttle, the error line under the field and the purge.
$("account-rekey").addEventListener("click", async () => {
  const status = $("account-rekey-status");
  status.classList.remove("error");
  status.textContent = "";
  if (!(await confirmDialog("Give every private note a new key? Other open sessions are signed out.", { confirmLabel: "Re-encrypt" }))) return;
  let result = null;
  const done = await askPasswordPrompt({
    title: "Re-encrypt private notes",
    message: "Enter your current password or PIN to give every private note a new key.",
    submitLabel: "Re-encrypt",
    submit: async (password) => {
      // 401 here is "wrong password", said beside the field.
      result = await apiJson("/auth/rotate-vault-key", {
        method: "POST",
        body: JSON.stringify({ current_password: password }),
        ownsAuthErrors: true,
      });
      return result;
    },
  });
  if (!done || !result) return;
  localStorage.setItem("token", result.token);
  const n = result.notes_reencrypted;
  status.textContent = `Done: ${n} private note${n === 1 ? "" : "s"} on a new key.`;
});

//: "Ask for a password when the app opens". Off needs the current password,
//: asked through the lock screen's card; on needs nothing.
$("account-password-on-open").addEventListener("change", async (e) => {
  const box = e.target;
  const wanted = box.checked;
  box.checked = !wanted; // the server's answer decides what it shows
  try {
    if (wanted) {
      await apiJson("/auth/password-on-open", {
        method: "POST",
        body: JSON.stringify({ enabled: true }),
      });
      autoSessionOffered = false;
      box.checked = true;
      toast("The app asks for your password when it opens.");
    } else {
      const done = await askPasswordPrompt({
        title: "Stop asking for a password",
        message: "Enter your password to open the app on this computer without it.",
        submitLabel: "Turn off",
        submit: (password) =>
          apiJson("/auth/password-on-open", {
            method: "POST",
            body: JSON.stringify({ enabled: false, current_password: password }),
            ownsAuthErrors: true,
          }),
      });
      if (done) {
        box.checked = false;
        toast("This computer opens the app without a password. Private notes still ask.");
      }
    }
  } catch (error) {
    toast(error.message, true);
  }
  renderAccount().catch(() => {});
});

$("account-idle-ttl").addEventListener("change", (e) => {
  setPreference("session_idle_ttl_minutes", Number(e.target.value));
});

$("account-lock-all").addEventListener("click", async () => {
  //: With "Ask for a password when the app opens" off, this computer gets
  //: back in without one (only other devices and private notes need it).
  const back = autoSessionOffered
    ? "Other devices will need your password to get back in, and private notes will lock."
    : "You'll need your password to get back in.";
  if (!(await confirmDialog(`End every session, including this one? ${back}`))) return;
  await apiJson("/auth/lock-all", { method: "POST" }).catch(() => {});
  localStorage.removeItem("token");
  location.reload();
});

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
      ? "Atlas is locked to this machine."
      : "Off: MemoryMap will now let you point Atlas at a server on the internet."
  );
  refreshModelStatus();
});

$("task-history-clear").addEventListener("click", async () => {
  await apiJson("/tasks/history/clear", { method: "POST" }).catch((e) =>
    toast(e.message, true)
  );
  renderTasks();
});

$("app-quit").addEventListener("click", quitApp);

// Web search saves on change rather than behind a Save button: there are two
// controls, and a checkbox that needs a second click elsewhere to take effect
// is the shape of "this control does nothing" that keeps getting reported.
$("pref-web-search").addEventListener("change", saveWebSearchSettings);

$("pref-searxng").addEventListener("change", saveWebSearchSettings);

$("pref-update-check").addEventListener("change", (e) =>
  setPreference("update_check_enabled", e.target.checked)
);

$("update-check-now").addEventListener("click", () => checkForUpdate());

$("update-apply-now").addEventListener("click", async () => {
  const button = $("update-apply-now");
  const status = $("update-check-status");
  button.disabled = true;
  const ok = await applyUpdateNow((state) => {
    if (status) {
      status.textContent = state.total_bytes
        ? `${state.step} (${Math.round((state.done_bytes / state.total_bytes) * 100)}%)`
        : state.step;
    }
  });
  if (!ok) {
    // Failed (offline, GitHub unreachable, no asset), never leave the
    // button stuck disabled over a real network error someone can just
    // retry once they're back online.
    button.disabled = false;
    toast((status && status.textContent) || "Couldn't apply the update.", true);
  }
});

$("pref-auto-update").addEventListener("change", (e) =>
  setPreference("auto_update_enabled", e.target.checked)
);

$("pref-update-channel-main").addEventListener("change", (e) =>
  setPreference("update_channel", e.target.checked ? "main" : "stable")
);

// "Choose a specific version…" fetches the release list only on demand, 
// not on every Settings open, so leaving this tab open doesn't mean
// repeated GitHub calls, same restraint as the rest of this app's opt-in
// network features.
$("update-show-versions").addEventListener("click", async () => {
  const select = $("update-version-select");
  const installBtn = $("update-install-version");
  const status = $("update-version-status");
  status.textContent = "Loading releases…";
  const result = await apiJson("/update/releases", { silent: true }).catch(() => null);
  if (!result || !result.available) {
    select.classList.add("hidden");
    installBtn.classList.add("hidden");
    status.textContent =
      result?.reason === "channel_unavailable"
        ? "Not available while tracking the main branch."
        : result?.reason === "not_supported"
          ? "Only available for the packaged Windows app."
          : result?.reason === "disabled"
            ? "Enable 'Check GitHub for a newer version' first."
            : "Couldn't reach GitHub to list releases.";
    return;
  }
  select.innerHTML = "";
  for (const release of result.releases) {
    const option = document.createElement("option");
    option.value = release.tag;
    option.textContent = release.tag === `v${result.current}` || release.version === result.current
      ? `${release.name} (current)`
      : release.name;
    select.appendChild(option);
  }
  select.classList.toggle("hidden", result.releases.length === 0);
  installBtn.classList.toggle("hidden", result.releases.length === 0);
  status.textContent = result.releases.length ? "" : "No installable releases found.";
});

$("update-install-version").addEventListener("click", async () => {
  const select = $("update-version-select");
  const button = $("update-install-version");
  const status = $("update-version-status");
  const tag = select.value;
  if (!tag) return;
  if (
    !(await confirmDialog(
      `Download and install ${tag} now? MemoryMap AI will close once the installer starts.`,
      { confirmLabel: "Install" }
    ))
  ) {
    return;
  }
  button.disabled = true;
  select.disabled = true;
  const ok = await applyUpdateNow((state) => {
    status.textContent = state.total_bytes
      ? `${state.step} (${Math.round((state.done_bytes / state.total_bytes) * 100)}%)`
      : state.step;
  }, tag);
  if (!ok) {
    button.disabled = false;
    select.disabled = false;
    toast(status.textContent || "Couldn't install that version.", true);
  }
});

// Not a plain setPreference: switching Dev view/User view is meant to take
// effect live, not just on the next launch (asked for directly: togglable
// from Settings as well as the tray). /system/console-mode saves the same
// preference and, in the desktop app on Windows, restarts the whole
// process into the new console mode right after responding.
$("pref-show-console").addEventListener("change", async (e) => {
  const checked = e.target.checked;
  try {
    const result = await apiJson("/system/console-mode", {
      method: "POST",
      body: JSON.stringify({ show_console_on_startup: checked }),
    });
    if (prefsCache) prefsCache.show_console_on_startup = result.show_console_on_startup;
    toast(
      result.restarting
        ? `Switching to ${checked ? "Dev" : "User"} view: restarting…`
        : `Will switch to ${checked ? "Dev" : "User"} view next launch.`
    );
  } catch (error) {
    e.target.checked = !checked; // the change didn't take: don't leave the switch lying
    toast(error.message || "Couldn't switch view.", true);
  }
});

//: Settings, Data: the same clearing with a word first, and a beat so the toast
//: is read before the page goes.
$("clear-app-cache")?.addEventListener("click", async (event) => {
  event.currentTarget.disabled = true;
  await clearAppCache();
  toast("App cache cleared. Reloading.");
  setTimeout(() => location.reload(), 900);
});

$("about-force-reload")?.addEventListener("click", forceReloadApp);

//: `restartMemoryMap` (settings-panes.js): one restart mechanism shared with
//: the LAN switch's own "Restart now" toast action, rather than two copies
//: of "ask, restart, or say why not" drifting apart.
$("about-restart")?.addEventListener("click", () => restartMemoryMap());

// Takes effect on the next close, not on a restart, the handler reads the
// preference each time the window is closed rather than at launch, precisely
// so this switch is not a "restart to apply" one.
//: Read by the launcher on the next launch, before any window opens, so this
//: is not a "restart to apply" switch either: it decides what the *next*
//: double-click does.
$("pref-new-window-on-launch")?.addEventListener("change", (e) => {
  const checked = e.target.checked;
  setPreference("new_window_on_launch", checked);
  toast(
    checked
      ? "Launching again will open another window onto this notebook."
      : "Launching again will bring this window forward."
  );
});

$("pref-close-to-tray")?.addEventListener("change", (e) => {
  const checked = e.target.checked;
  setPreference("close_to_tray", checked);
  toast(
    checked
      ? "Closing the window will keep MemoryMap in the tray."
      : "Closing the window will quit MemoryMap."
  );
});

$("exports-refresh")?.addEventListener("click", renderExportsList);

$("open-exports-folder").addEventListener("click", async () => {
  try {
    const result = await apiJson("/files/open-exports-folder", { method: "POST" });
    toast(`Opened ${result.path}`);
  } catch (error) {
    toast(error.message || "Couldn't open the exports folder.", true);
  }
});

$("pref-export-dir").addEventListener("blur", saveExportSaveDir);

$("pref-export-dir").addEventListener("keydown", (event) => {
  if (event.key === "Enter") $("pref-export-dir").blur();
});

$("pref-export-dir-reset").addEventListener("click", () => {
  $("pref-export-dir").value = "";
  saveExportSaveDir();
});

// Each of these saves only its own key via `setPreference`, never
// `savePrefs`, which rebuilds and re-sends every field on the Preferences
// section's own form. That form may never have been rendered this session
// (a fresh page load landing straight on Background tasks, say), and its
// stale/default DOM values would silently overwrite whatever was really
// saved the moment any one of these checkboxes changed.
$("pref-autonomous-tasks").addEventListener("change", (e) => {
  toggleAutonomousPanel();
  setPreference("autonomous_tasks_enabled", e.target.checked);
});

$("pref-background-filing").addEventListener("change", (e) =>
  setPreference("background_filing", e.target.checked)
);

$("pref-warm-search-model").addEventListener("change", (e) =>
  setPreference("warm_search_model_at_launch", e.target.checked)
);

//: Clamped here as the backend clamps it (5 to 60), so a typed 100 saves
//: as 60 rather than being refused by the preferences schema.
$("pref-filing-wait").addEventListener("change", (e) => {
  const seconds = Math.max(5, Math.min(60, Math.round(Number(e.target.value) || 15)));
  e.target.value = seconds;
  setPreference("filing_wait_seconds", seconds);
});

$("pref-filing-wait-reset").addEventListener("click", () => {
  $("pref-filing-wait").value = 15;
  setPreference("filing_wait_seconds", 15);
});

//: Section 17 row 3: the filing style reaches the filing prompt.
$("pref-filing-style").addEventListener("change", (e) => setPreference("filing_style", e.target.value));

$("pref-ai-first-filing").addEventListener("change", (e) =>
  setPreference("ai_first_filing", e.target.checked)
);

$("pref-auto-caption-images").addEventListener("change", (e) =>
  setPreference("auto_caption_images", e.target.checked)
);

$("pref-auto-read-image-text").addEventListener("change", (e) =>
  setPreference("auto_read_image_text", e.target.checked)
);

$("pref-auto-tag").addEventListener("change", (e) =>
  setPreference("auto_tag_enabled", e.target.checked)
);

$("pref-auto-link").addEventListener("change", (e) =>
  setPreference("auto_link_enabled", e.target.checked)
);

$("pref-auto-dedupe").addEventListener("change", (e) =>
  setPreference("auto_dedupe_enabled", e.target.checked)
);

$("pref-auto-stale-review").addEventListener("change", (e) =>
  setPreference("auto_stale_review_enabled", e.target.checked)
);

$("pref-auto-capture").addEventListener("change", (e) =>
  setPreference("auto_capture_enabled", e.target.checked)
);

$("pref-battery-mode").addEventListener("change", (e) => {
  setPreference("battery_efficient_mode", e.target.checked);
  $("power-saver-indicator")?.classList.toggle("hidden", !e.target.checked);
  //: `prefsCache` is what `batteryModeOn` reads, and `setPreference` writes
  //: the server before the cache, so the two pictures are restarted from
  //: here with the new value already in hand. Without this the setting took
  //: effect on the next load, which for a setting about power is the wrong
  //: half of "immediately".
  if (prefsCache) prefsCache.battery_efficient_mode = e.target.checked;
  if (typeof startBgArt === "function") startBgArt();
  if (typeof renderDashboard === "function") renderDashboard();
});

$("pref-autonomous-interval").addEventListener("change", (e) =>
  setPreference("autonomous_tasks_interval_hours", Number(e.target.value) || 6)
);

$("pref-autonomous-model").addEventListener("change", (e) =>
  setPreference("autonomous_tasks_model", e.target.value.trim())
);

//: The switch changes which model background jobs run on, so the line under
//: the utility picker (INBOX 277) is re-read once the preference has landed
//: rather than left describing the old state until the next poll.
$("pref-smart-model-routing").addEventListener("change", async (e) => {
  await setPreference("smart_model_routing_enabled", e.target.checked);
  refreshModelStatus();
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
          ? "A pass is already running, the results will appear below."
          : "Optimization started. Its changes will be listed below when it finishes."
      );
      // The pass runs on a worker thread, so there is nothing to await. Look
      // again shortly rather than leaving the panel showing the previous run.
      setTimeout(renderAutonomousReview, 4000);
    })
    .catch((err) => toast(err.message, true));
});

$("voice-model-select").addEventListener("change", (e) =>
  setPreference("voice_model", e.target.value)
);

// ---- from wiring.js ----

$("dashboard-persona-select").addEventListener("change", async () => {
  const persona = $("dashboard-persona-select").value;
  //: Set before the save, not after it: the mark and the dashboard's face
  //: read it, and a second change while the first save was in flight was
  //: drawn from the old value (the owner: "when I changed the persona
  //: again, it didnt change again").
  if (prefsCache) prefsCache.dashboard_persona = persona;
  paintDashboardPersonaMark();
  if (typeof paintDashEmblem === "function") paintDashEmblem();
  await apiJson("/preferences", {
    method: "PUT",
    body: JSON.stringify({ dashboard_persona: persona }),
  }).catch(() => {});
  toast(persona ? `Dashboard greeting now speaks as ${persona}.` : "Dashboard greeting back to matching Chat.");
});

$("dashboard-greeting-regenerate")?.addEventListener("click", async () => {
  const btn = $("dashboard-greeting-regenerate");
  const status = $("dashboard-greeting-status");
  btn.disabled = true;
  //: The persona actually asked, not always Atlas (the owner: "I set the
  //: dashboard greeting to another persona, but when I hit regenerate, it
  //: said asking Atlas").
  const who = dashboardGreetingPersona();
  if (status) status.textContent = `Asking ${who}…`;
  const ok = await refreshAiGreeting(true).catch(() => false);
  btn.disabled = false;
  if (status) status.textContent = ok ? "New greeting set." : `Couldn't reach ${who}, kept the current one.`;
  setTimeout(() => { if (status) status.textContent = ""; }, 3000);
});

$("persona-add").addEventListener("click", addPersona);

$("skill-add").addEventListener("click", addSkill);

$("skill-cancel").addEventListener("click", stopEditingSkill);

$("skill-verify-expect").addEventListener("change", syncSkillVerifyRow);

$("settings-manage-categories").addEventListener("click", () => openManageCategories());

$("settings-manage-tags").addEventListener("click", () => openTagsSheet());

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
      // The server validates imports the same way it validates the editor, 
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

// Start the user's own engine with the app. See the markup for why this is the
// answer to "web search keeps disabling itself", it was the container going
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

// ---- from settings-wiring.js ----

$("find-duplicates").addEventListener("click", findDuplicates);

$("duplicate-threshold").addEventListener("input", (e) => {
  $("duplicate-threshold-value").textContent = `${e.target.value}%`;
});

// From Help, go to the Settings section rather than swapping one dialog for
// another: "how do I change a shortcut?" should end somewhere you can find
// again, not in an overlay with no address.
$("about-shortcuts").addEventListener("click", () => showSettingsSection("shortcuts"));

$("shortcuts-reset-settings").addEventListener("click", resetShortcuts);

$("prefs-save").addEventListener("click", () => savePrefs());

$("pref-search-reset").addEventListener("click", () => {
  $("pref-search-min-sim").value = 0.25;
  $("pref-search-z-margin").value = 0.5;
  savePrefs();
});

$("searxng-reinstall").addEventListener("click", async () => {
  if (
    !(await confirmDialog(
      "Delete the SearXNG install and set it up again from scratch?\n\n" +
        "Your settings file is kept, only the downloaded copy and its " +
        "virtualenv are removed. Reinstalling takes a few minutes."
    ))
  )
    return;
  const status = $("searxng-host-status");
  status.classList.remove("error");
  setLabel(status, "ph:spin Removing the old install…");
  try {
    await apiJson("/websearch/searxng/reinstall", { method: "POST" });
    status.textContent = "Reinstalling: this takes a few minutes.";
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
    status.textContent = `Running at ${body.url}: web search now uses it.`;
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
    status.textContent = "Stopped: web search is back on DuckDuckGo.";
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

//: `change`, not `input`: a number box fires `change` when the value is
//: committed (Enter, or focus leaving), which is the moment somebody means it.
//: `input` would PUT once per keystroke while they type 16384.
$("model-context-window")?.addEventListener("change", saveModelContextWindow);

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

$("feature-models-reset").addEventListener("click", resetAllFeatureModels);

$("vision-model-apply").addEventListener("click", applyVisionModel);

$("ocr-model-apply")?.addEventListener("click", applyOcrModel);

$("embedding-apply").addEventListener("click", applyEmbeddingBackend);

$("utility-model-select").addEventListener(
  "change",
  () => ($("utility-model-select").dataset.userChosen = "1")
);

$("vision-model-select").addEventListener(
  "change",
  () => ($("vision-model-select").dataset.userChosen = "1")
);

$("settings-nav-back")?.addEventListener("click", () => stepTabHistory(-1));

$("settings-nav-forward")?.addEventListener("click", () => stepTabHistory(1));

// Two buttons, two behaviours, each the one its own words name. Settings →
// Help has "Replay the welcome" and Settings → About has "Take tour again";
// only the first was ever wired, so the About one was a button that did
// nothing at all (found by listing every id in index.html that no JS file and
// no stylesheet mentions), and wiring both to the same call then made the
// About one say "tour" and open the welcome card instead. They are not the
// same thing: the card is five slides about what MemoryMap is, the tour is
// anchored cards on the real controls. So the welcome button opens the
// welcome and the tour button opens the tour.
$("show-guide-btn")?.addEventListener("click", () => {
  closeSettingsModal();
  openOnboarding();
});

$("about-take-tour")?.addEventListener("click", () => {
  if (typeof TOUR_ENABLED !== "undefined" && !TOUR_ENABLED) return;
  closeSettingsModal();
  // A frame later, for the same reason tour.js's own replay strip waits: the
  // first step's rectangle is measured against the page the modal was
  // covering, and a step measured while the modal is still up is dropped for
  // having nothing on screen to point at.
  requestAnimationFrame(() => {
    openTour("basics");
  });
});

$("export-md").addEventListener("click", () => downloadExport("markdown"));

//: One step (INBOX 464 (18)): the button opens its picker and choosing
//: starts the import. The folder picker posts through the same function,
//: the only difference is which input it reads, so `importMarkdown` takes
//: the id rather than growing a second copy of the upload/report sequence.
$("import-md").addEventListener("click", () => $("import-md-files").click());

$("import-md-files").addEventListener("change", () => importMarkdown());

$("import-md-folder-btn").addEventListener("click", () => $("import-md-folder").click());

$("import-md-folder").addEventListener("change", () => importMarkdown("import-md-folder"));

$("import-dir")?.addEventListener("click", importDirectory);

$("export-backup-zip")?.addEventListener("click", () =>
  exportFullBackup().catch((error) => toast(error.message || "Couldn't save the backup.", true))
);

$("restore-bundle")?.addEventListener("click", () => $("restore-bundle-file").click());

$("restore-bundle-file")?.addEventListener("change", () => restoreFullBackup());

$("import-document").addEventListener("click", () => $("import-document-file").click());

$("import-document-file").addEventListener("change", () => importDocument());

$("backup-now").addEventListener("click", backupNow);

$("pref-single-keys").addEventListener("change", (event) => {
  try {
    localStorage.setItem("singleKeys", event.target.checked ? "on" : "off");
  } catch {
    // Storage blocked: the switch holds for this session only.
  }
});

// ---- from spaces-find.js ----

$("template-add")?.addEventListener("click", addTemplate);

//: **Draft with Atlas** (INBOX 430): the body written from the name and the
//: line; pressed again it asks for a different take on what is in the box,
//: and the result is only ever put in the box, never saved, so Add is still
//: the person's decision.
$("template-draft")?.addEventListener("click", async () => {
  const name = $("template-name").value.trim();
  const status = $("template-status");
  status.classList.remove("error");
  if (!name) {
    status.classList.add("error");
    status.textContent = "Name it first, then Atlas can draft it.";
    $("template-name").focus();
    return;
  }
  const button = $("template-draft");
  button.disabled = true;
  status.textContent = "Drafting…";
  try {
    const result = await apiJson("/templates/draft", {
      method: "POST",
      body: JSON.stringify({ name, description: $("template-description").value.trim(), current: $("template-body").value }),
    });
    if (result.content) {
      $("template-body").value = result.content;
      status.textContent = "Drafted. Edit it, press again for another version, then save.";
    } else {
      status.classList.add("error");
      status.textContent = result.reason || "The model wrote nothing.";
    }
  } catch (error) {
    status.classList.add("error");
    status.textContent = error.message;
  } finally {
    button.disabled = false;
  }
});

$("template-cancel")?.addEventListener("click", stopEditingTemplate);

// ---- from settings-wiring.js (search-boot-1005) ----
//
// `refreshSearxngHost` paints Settings' managed-SearXNG block and polls an
// install; its callers are this file's own buttons and `renderWebSearch`, a
// Settings pane's render, which runs after the window has opened and so after
// this file is in. app.js keeps a stand-in for it (`LAZY_ENTRY_POINTS`), so
// the pane's `refreshSearxngHost().catch(...)` is one call either way.

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

  // An install is minutes long and runs in the background, poll it so the
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
    // e.g. "Docker isn't running, so it'll be set up in a virtualenv", an
    // explanation of what will happen, not a failure.
    $("searxng-host-status").classList.remove("error");
    $("searxng-host-status").textContent = info.detail;
  } else {
    // Always say something current. This line used to keep whatever the last
    // poll wrote, so a finished install left "Installing SearXNG…" sitting
    // under a badge reading "Stopped", reported with a photo, and the
    // install had in fact completed.
    $("searxng-host-status").classList.remove("error");
    $("searxng-host-status").textContent =
      info.state === "stopped"
        ? "Installed and ready: press Start SearXNG."
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
  badge.className = `chip item-label${running ? " is-ok" : ""}`;
  start.disabled = running;
  stop.disabled = info.state === "absent";
  setLabel(start, info.state === "absent" ? "ph:play Install & start" : "ph:play Start SearXNG");
  // Keep polling while it's starting, so "Starting…" can't stick forever with
  // no way to tell whether anything is still happening.
  if (info.state === "running" && !info.responding) {
    clearTimeout(refreshSearxngHost.timer);
    refreshSearxngHost.timer = setTimeout(refreshSearxngHost, 3000);
  }
  // What the instance itself printed. Only worth showing when it is not
  // running happily: when it is, its own log is just noise.
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

// ---- from status.js (search-boot-1005): applyBackendChoice ----
// Moved whole. Every use is in this file, so it is not needed before this file loads.

async function applyBackendChoice() {
  const provider = $("llm-provider-select").value;
  const baseUrl = $("llm-base-url").value.trim();
  const note = $("llm-provider-status");
  setLabel(note, "ph:spin Connecting…");
  try {
    const body = await apiJson("/models/provider", {
      method: "POST",
      body: JSON.stringify({ provider, base_url: baseUrl }),
    });
    backendFieldsDirty = false;
    // The setting is saved either way, you set the address, then you start
    // the server: so this reports what was found rather than treating an
    // unreachable server as a rejected setting.
    setLabel(
      note,
      body.reachable
        ? `ph:plugs-connected Connected to ${body.base_url}: ${body.installed_models.length} model(s) available.`
        : `ph:plugs Saved, but nothing is answering at ${body.base_url} yet. Start the server and this will light up.`
    );
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

// ---- from chat.js (search-boot-1005): saveModelContextWindow ----
// Moved whole. Every use is in this file, so it is not needed before this file loads.

async function saveModelContextWindow() {
  const box = $("model-context-window");
  if (!box || !modelContextModel) return;
  const raw = box.value.trim();
  const parsed = Number.parseInt(raw, 10);
  //: Anything that is not a positive number is auto, including the empty box
  //: this control is cleared with. `null` rather than deleting the key, so the
  //: PUT says "this model is on auto" rather than saying nothing about it: the
  //: whole map is replaced on save, and an omitted model would be indistinct
  //: from one that was never set, which is the same thing here but would stop
  //: being so the moment anything else wrote to the map.
  const value = raw === "" || !Number.isFinite(parsed) || parsed <= 0 ? null : parsed;
  const windows = { ...((prefsCache && prefsCache.model_context_windows) || {}) };
  windows[modelContextModel] = value;
  try {
    await apiJson("/preferences", {
      method: "PUT",
      body: JSON.stringify({ model_context_windows: windows }),
    });
    if (prefsCache) prefsCache.model_context_windows = windows;
    //: Re-read the spec rather than trusting the number just typed: the
    //: backend floors a window below its own minimum, so a 40 typed here comes
    //: back as 4,096, and the note has to say what will actually run.
    renderModelSpec(modelContextModel);
    toast(value ? `${modelContextModel} will run at ${value.toLocaleString()} tokens.` : `${modelContextModel} is back on auto.`);
  } catch (e) {
    toast(e.message || "Couldn't save that window.", true);
  }
}

// ---- from sheets-selects.js (search-boot-1005): addPersona ----
// Moved whole. Every use is in this file, so it is not needed before this file loads.

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

// ---- from ai-tools.js (search-boot-1005): runEmbeddingFallback, resetAllFeatureModels, applyChatModel, applyOcrModel, applyUtilityModel, applyVisionModel ----
// Moved whole. Every use is in this file, so it is not needed before this file loads.

// One click for the sentence #embedding-error already prints: download
// nomic-embed-text (skipped if it's already installed), then switch the
// search engine to it and re-index. Self-contained polling rather than
// riding the shared `modelStatus` refresh loop: that loop backs off to a
// slow cadence when nothing else is running, which would make a fresh
// download look stalled for up to 20s at a time; this polls every second
// for exactly as long as this one operation is in flight.
async function runEmbeddingFallback() {
  if (embeddingFallbackRunning) return;
  embeddingFallbackRunning = true;
  const button = $("embedding-error-fix");
  const status = $("embedding-error-fix-status");
  button.disabled = true;
  const setStatus = (text) => {
    status.textContent = text;
  };
  try {
    const already = (modelStatus?.installed_models || []).some(
      (m) => m.name === EMBEDDING_FALLBACK_MODEL || m.name.split(":")[0] === EMBEDDING_FALLBACK_MODEL
    );
    if (!already) {
      setStatus(`Downloading ${EMBEDDING_FALLBACK_MODEL}…`);
      try {
        await api("/models/pull", {
          method: "POST",
          body: JSON.stringify({ name: EMBEDDING_FALLBACK_MODEL }),
        });
      } catch (error) {
        // 409 "Already downloading" means someone else (or a previous
        // click) already started this exact pull, fall through to the
        // same wait loop rather than treating it as a failure.
        if (!/already downloading/i.test(error.message || "")) throw error;
      }
      // Poll until the pull leaves "running", succeeded (it drops out of
      // `pulls` once installed) or failed (status "error").
      for (;;) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        const poll = await apiJson("/models/status", { silent: true }).catch(() => null);
        if (!poll) continue; // a transient miss mid-download isn't a failure
        const pull = (poll.pulls || {})[EMBEDDING_FALLBACK_MODEL];
        if (pull && pull.status === "error") {
          throw new Error(pull.error || `Couldn't download ${EMBEDDING_FALLBACK_MODEL}.`);
        }
        const nowInstalled = (poll.installed_models || []).some(
          (m) => m.name === EMBEDDING_FALLBACK_MODEL || m.name.split(":")[0] === EMBEDDING_FALLBACK_MODEL
        );
        if (nowInstalled || !pull) break;
        setStatus(
          pull.total
            ? `Downloading ${EMBEDDING_FALLBACK_MODEL}… ${Math.round((pull.done / pull.total) * 100)}%`
            : `Downloading ${EMBEDDING_FALLBACK_MODEL}…`
        );
      }
    }
    setStatus("Switching search engine and re-indexing…");
    await api("/models/embedding-backend", {
      method: "POST",
      body: JSON.stringify({ backend: "ollama", model: EMBEDDING_FALLBACK_MODEL }),
    });
    toast(`Switched to ${EMBEDDING_FALLBACK_MODEL}: re-indexing your notes now.`);
    setStatus("");
  } catch (error) {
    toast(error.message || `Couldn't switch to ${EMBEDDING_FALLBACK_MODEL}.`, true);
    setStatus("");
  } finally {
    embeddingFallbackRunning = false;
    button.disabled = false;
    refreshModelStatus();
  }
}

async function resetAllFeatureModels() {
  try {
    const body = await api("/models/feature-models/reset", { method: "POST" });
    const cleared = Number(body.cleared || 0);
    toast(
      cleared === 0
        ? "Nothing to reset: every feature was already on its default model."
        : cleared === 1
          ? "One feature is back on its default model."
          : `${cleared} features are back on their default models.`
    );
    refreshModelStatus();
  } catch (error) {
    toast(error.message || "Couldn't reset those models.", true);
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
    delete select.dataset.userChosen; // applied: polling may reflect it now
    note.textContent = `${aiNameNow()}, running ${select.value}: switched instantly, no re-index needed.`;
    refreshModelStatus();
  } catch (error) {
    note.textContent = error.message;
  }
}

async function applyOcrModel() {
  const select = $("ocr-model-select");
  try {
    await api("/models/ocr-model", {
      method: "POST",
      body: JSON.stringify({ name: select.value }),
    });
    delete select.dataset.userChosen;
    toast(
      select.value
        ? `Text will be read with ${select.value}.`
        : "Reading text is automatic again."
    );
    refreshModelStatus();
  } catch (error) {
    toast(error.message || "Couldn't set that model.", true);
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

async function applyVisionModel() {
  const select = $("vision-model-select");
  try {
    await api("/models/vision-model", {
      method: "POST",
      body: JSON.stringify({ name: select.value }),
    });
    delete select.dataset.userChosen;
    toast(
      select.value
        ? `Images now go to ${select.value}.`
        : "Images now use auto-detect."
    );
    refreshModelStatus();
  } catch (error) {
    toast(error.message, true);
  }
}

// ---- from spaces-find.js (search-boot-1005): addTemplate ----
// Moved whole. Every use is in this file, so it is not needed before this file loads.

async function addTemplate() {
  const name = $("template-name").value.trim();
  const body = $("template-body").value.trim();
  const status = $("template-status");
  status.classList.remove("error");
  if (!name || !body) {
    status.classList.add("error");
    status.textContent = "Both a name and a template body are needed.";
    return;
  }
  // Only the entry being edited is dropped before the push, a genuine
  // rename (or, for a built-in, the previous edit of it). A name that
  // instead collides with a DIFFERENT saved template is left in place and
  // the save is rejected server-side (§_validated_templates) rather than
  // silently replacing someone else's saved text the way a same-named skill
  // would. A new template given a built-in's name becomes that built-in's
  // edit, which is what the name means now.
  const custom = customTemplates().filter((t) => t.name !== editingTemplateName);
  custom.push({
    name,
    description: $("template-description").value.trim(),
    content: body,
  });
  const wasEditing = editingTemplateName;
  try {
    await saveTemplateList(custom);
  } catch (error) {
    status.classList.add("error");
    status.textContent = error.message;
    return;
  }
  stopEditingTemplate();
  status.textContent = wasEditing ? `Updated “${name}”.` : `Saved “${name}”.`;
}

// ---- from skills.js (search-boot-1005): saveRunBudget ----
// Moved whole. Every use is in this file, so it is not needed before this file loads.

async function saveRunBudget() {
  const tokens = $("run-budget-tokens");
  const seconds = $("run-budget-seconds");
  const status = $("run-budget-status");
  if (!tokens || !seconds) return;
  //: Clamped here as well as by the server: a negative number in a number
  //: input is one keystroke away, and the failure it causes (a budget that is
  //: exceeded before the first round) would look like the feature being
  //: broken rather than like a typo.
  const body = {
    run_budget_tokens: Math.max(0, Math.round(Number(tokens.value) || 0)),
    run_budget_seconds: Math.max(0, Math.round(Number(seconds.value) || 0)),
  };
  if (status) status.textContent = "Saving…";
  try {
    prefsCache = await apiJson("/preferences", {
      method: "PUT",
      body: JSON.stringify(body),
    });
  } catch (error) {
    if (status) {
      status.classList.add("error");
      status.textContent = error.message;
    }
    return;
  }
  if (!status) return;
  status.classList.remove("error");
  const parts = [];
  parts.push(body.run_budget_tokens ? `${body.run_budget_tokens} tokens` : "no token limit");
  parts.push(body.run_budget_seconds ? `${body.run_budget_seconds}s` : "no time limit");
  status.textContent = `A run may spend ${parts.join(" and ")}.`;
}

// ---- from settings-panes.js (search-boot-1005): saveWebSearchSettings, restartMemoryMap ----
// Moved whole. Every use is in this file, so it is not needed before this file loads.

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
    // Reported: "the web search button is visibly disabled in the chat
    // dock instead of inactive when I have web search enabled in the
    // settings", the chat dock's own click handler keeps this Settings
    // checkbox in sync going the other way, but this save handler never
    // synced the chat dock button back, so it stayed on whatever look it
    // had at page load until clicked directly or the page reloaded.
    renderWebSearchToggle();
    status.classList.remove("error");
    status.textContent = "Saved.";
  } catch (error) {
    status.classList.add("error");
    status.textContent = error.message;
  }
}

//: **Shared with the About panel's own "Restart MemoryMap" button**
//: (`#about-restart`, phone-shell.js): one restart mechanism, `/system/restart`
//: (Windows desktop only; everywhere else it answers `restarting: false` and
//: this says so), so the LAN switch's own restart offer below reuses it
//: rather than re-implementing "ask, restart, or say why not" a second time.
//: `confirm` is skipped for a `toastAction` call: the person already made an
//: explicit choice by pressing that button's own label, the same reasoning
//: every other `toastAction` in the app (Undo, and the rest) already follows.
async function restartMemoryMap({ confirm = true } = {}) {
  if (
    confirm &&
    !(await confirmDialog(
      "Restart MemoryMap?\n\nThe app closes and reopens. Your notes are already saved."
    ))
  ) {
    return;
  }
  try {
    const result = await apiJson("/system/restart", { method: "POST" });
    if (result.restarting) {
      toast("Restarting…");
    } else {
      toast("Restart isn't available in this build, close and reopen MemoryMap by hand.", true);
    }
  } catch (error) {
    toast(error.message || "Couldn't restart.", true);
  }
}

// ---- from wiring.js (search-boot-1005): findDuplicates ----
// Moved whole. Every use is in this file, so it is not needed before this file loads.

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
      : "No duplicates at that similarity, try lowering the slider.";
  } catch (error) {
    status.classList.add("error");
    status.textContent = error.message;
  }
}

// ---- from phone-shell.js (search-boot-1005): saveExportSaveDir, addMemoryByHand ----
// Moved whole. Every use is in this file, so it is not needed before this file loads.

// Saved on blur/Enter, not on every keystroke, a half-typed path is not a
// preference worth validating server-side yet. Reverts the field on a
// rejected value rather than leaving a bad path sitting there looking saved.
async function saveExportSaveDir() {
  const input = $("pref-export-dir");
  const value = input.value.trim();
  if (value === (prefsCache?.export_save_dir || "")) return; // nothing changed
  try {
    prefsCache = await apiJson("/preferences", {
      method: "PUT",
      body: JSON.stringify({ export_save_dir: value }),
    });
    input.value = prefsCache.export_save_dir;
    toast(value ? `Exports will now be saved to ${prefsCache.export_save_dir}` : "Exports will save to the default location.");
  } catch (error) {
    input.value = prefsCache?.export_save_dir || "";
    toast(error.message || "Couldn't save that folder.", true);
  }
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

// ---- from wiring.js (search-boot-1005): renderDuplicateGroups ----
// Moved whole. Every use is in this file, so it is not needed before this file loads.

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
      text.textContent = clipText(notePreviewText(entry.content), 160);
      label.append(box2, text);
      card.appendChild(label);
    }

    const row = document.createElement("div");
    row.className = "row";
    const merge = smallButton("ph:arrows-merge Merge these", "Combine them into one note", async () => {
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
      aiReady ? " let Atlas write the merged note" : " Atlas is not running: notes will be joined"
    ));
    card.dataset.aiBoxId = aiBox.id;
    row.append(merge, useAi);
    card.appendChild(row);
    box.appendChild(card);
  }
}

// ---- from wiring.js (search-boot-1005): mergeDuplicateGroup ----
// Moved whole. Every use is in this file, so it is not needed before this file loads.

async function mergeDuplicateGroup(ids, card) {
  if (ids.length < 2) return;
  const aiBox = document.getElementById(card.dataset.aiBoxId);
  const useAi = !!(aiBox && aiBox.checked);
  const status = $("duplicate-status");

  // Show what it will say BEFORE anything changes, merging is the one action
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
      `The other ${ids.length - 1} go to the bin, so this is undoable.`
  ));
  if (!ok) return;

  //: The kept note's words and tags as they were, for Undo (INBOX 537): the
  //: others went to the bin, so Undo also brings them back.
  const keeper = allEntries.find((e) => e.id === ids[0]);
  try {
    const result = await apiJson("/duplicates/merge", {
      method: "POST",
      body: JSON.stringify({ ids, use_ai: useAi }),
    });
    card.remove();
    const binned = result.binned_ids || [];
    const swap = (back) => async () => {
      if (keeper) await api(`/entries/${result.id}`, { method: "PUT", body: JSON.stringify(back ? { content: keeper.content, tags: keeper.tags } : { content: result.content }) });
      for (const id of binned) await api(back ? `/entries/${id}/restore` : `/entries/${id}`, { method: back ? "POST" : "DELETE" });
      await refreshEntries([result.id, ...binned]);
    };
    const action = pushUndo(`Merged ${result.merged_count} notes`, swap(true), swap(false));
    toastAction(`Merged ${result.merged_count} notes${result.used_ai ? " with Atlas" : ""}.`, "Undo", async () => {
      settleUndoFromToast(action);
      await swap(true)();
    });
    await refreshEntries([result.id, ...binned]);
  } catch (error) {
    status.classList.add("error");
    status.textContent = error.message;
  }
}

// Moved from settings-panes.js (boot gzip): every caller is in this file.
//: Restoring replaces the notebook and ends every session, so the page is
//: reloaded afterwards: the lock screen is the honest next thing to see.
async function restoreFullBackup() {
  const input = $("restore-bundle-file");
  const status = $("restore-bundle-status");
  const file = input.files[0];
  if (!file) return;
  input.value = "";
  const sealed = /\.mmenc$/i.test(file.name);
  const password = $("restore-bundle-password").value;
  if (sealed && !password) {
    status.textContent = "That file is sealed. Enter its password, then choose it again.";
    return;
  }
  if (
    !(await confirmDialog(
      "Restore this backup? Your current notebook is snapshotted first, then replaced by the one in the file."
    ))
  )
    return;
  const form = new FormData();
  form.append("file", file, file.name);
  form.append("password", password);
  setLabel(status, "ph:spin Restoring…");
  try {
    const response = await api.upload("/backups/bundle/restore", form);
    const result = await response.json();
    $("restore-bundle-password").value = "";
    status.textContent = `Restored, with ${result.files} attached file${result.files === 1 ? "" : "s"}. Reloading to unlock it.`;
    setTimeout(() => location.reload(), 1200);
  } catch (error) {
    status.textContent = error.message || "The restore did not work. Nothing was changed.";
  }
}

// Moved from settings-panes.js (boot gzip): every caller is in this file.
//: The full backup is a POST, not `/export/backup`'s GET, so a password goes
//: in the body and not in an address that lands in a log. With one the file is
//: a sealed .mmenc (`core/backup_bundle.py`); without, the same zip as before.
async function exportFullBackup() {
  const field = $("export-backup-password");
  const password = field ? field.value : "";
  const response = await api("/backups/bundle", {
    method: "POST",
    body: JSON.stringify({ password: password || null }),
  });
  await saveFile(password ? "memorymap-backup.mmenc" : "memorymap-backup.zip", await response.blob());
  if (field) field.value = "";
}

// Moved from settings-panes.js (boot gzip): every caller is in this file.
async function deleteProfile() {
  if (!(await confirmDialog("Delete your profile text? Atlas will stop personalising answers."))) return;
  prefsCache = await apiJson("/preferences", {
    method: "PUT",
    body: JSON.stringify({ user_profile: "", profile_enabled: false }),
  });
  await renderPrefs();
  toast("Profile data deleted.");
}

// Moved from skills.js (boot gzip): every caller is in this file.
// Merge imported {name, prompt} items over existing ones (imports win
// on a name clash), used by both skills and personas.
function mergeNamedPrompts(existing, imported) {
  const cleaned = (imported || []).filter(
    (item) => item && typeof item.name === "string" && typeof item.prompt === "string"
  );
  if (!cleaned.length) return null;
  const names = new Set(cleaned.map((item) => item.name));
  return [...existing.filter((item) => !names.has(item.name)), ...cleaned];
}

// Moved from settings.js (boot gzip): a listener inside the Settings window.
//: **A pane's "New ..." in its bar** (design-rows-1005): Personas, Skills and
//: Templates carry it in their dock, `data-opens` naming the form's first
//: field and `data-cancel` the form's Cancel edit. One listener for all
//: three: it ends an edit in progress (a New that filled the form with the
//: skill being edited would be a second Edit), opens the form's fold, brings
//: the form into view under the sticky dock, and puts the cursor in Name.
document.getElementById("settings-modal")?.addEventListener("click", (event) => {
  const opener = event.target.closest("[data-opens]");
  if (!opener) return;
  const field = document.getElementById(opener.dataset.opens);
  if (!field) return;
  const cancel = opener.dataset.cancel && document.getElementById(opener.dataset.cancel);
  if (cancel && !cancel.classList.contains("hidden")) cancel.click();
  const fold = field.closest("details");
  if (fold) fold.open = true;
  //: The field, not its group: on a phone the Skills form is taller than
  //: the window, and centring the group left Name under the sticky dock.
  field.scrollIntoView({ block: "center" });
  field.focus({ preventScroll: true });
});

// Moved from skills.js (boot gzip): Settings, Skills' Add is its only caller.
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
  const verify = chosenSkillVerify();
  custom.push({
    name,
    prompt: promptText,
    description: $("skill-description").value.trim(),
    steps: textToSteps($("skill-steps").value),
    tools: chosenSkillTools(),
    inputs: textToInputs($("skill-inputs").value),
    ...(verify ? { verify } : {}),
  });
  const wasEditing = editingSkillName;
  try {
    await saveSkillList(custom);
  } catch (error) {
    // The server validates both ways in, so this is the same message the AI
    // would get for the same mistake, an undeclared {{placeholder}}, say.
    status.classList.add("error");
    status.textContent = error.message;
    return;
  }
  stopEditingSkill();
  status.textContent = wasEditing ? `Updated “${name}”.` : `Saved “${name}”.`;
}

//: The block the editor sends, or null. Built here rather than assembled in
//: `addSkill` so the shape has one home: the server validates it again
//: (`skills.verify_spec`) and its complaint is what the status line shows.
function chosenSkillVerify() {
  const tool = $("skill-verify-tool").value;
  if (!tool) return null;
  const predicate = $("skill-verify-expect").value;
  const block = {
    tool,
    expect: {
      [predicate]: predicate === "unchanged" ? true : Number($("skill-verify-value").value) || 0,
    },
  };
  if ($("skill-verify-untagged").checked) {
    block.args = { untagged: true };
    //: `count_notes` answers a filtered question in `count` and an unfiltered
    //: one in `total`, and the verifier tries `total` first, so a filtered
    //: block that did not name its field would read the number it is
    //: filtering away from.
    block.field = "count";
  }
  return block;
}

function chosenSkillTools() {
  const box = $("skill-tool-list");
  if (!box) return [];
  return [...box.querySelectorAll("input:checked")].map((input) => input.value);
}

// ---- from spaces-find.js: the status bar's slots, drawn only in Settings ----

//: What shows in the status bar.
//
// Asked for: "allow more stuff to be added and removed to the bottom status
// bar?? maybe??" The bar is a permanent strip across the bottom of every
// screen, so what belongs on it is taste rather than correctness.
//
// **Stored as what is hidden, not what is shown**, and that choice is the
// whole of the forward-compatibility story: a slot added in a later version
// appears by default for everyone, instead of being invisible to every user
// who ever opened this screen and saved a list that could not have named it.
//
// Only the slots that are *always* there are listed. The offline badge, the
// power-saver badge and the running-job slot appear when there is something
// to say and hide themselves again, and hiding a warning you asked for is a
// different kind of setting from tidying a permanent one away.
const STATUS_SLOTS = [
  { key: "ai", label: "AI status", hint: "The dot and emblem saying what the local model is doing" },
  { key: "notes", label: "Note count", hint: "How many notes you have, as a link to them" },
  { key: "reminders", label: "Reminders", hint: "Open and due reminders" },
  { key: "nav", label: "Back and forward", hint: "Move between the pages you have visited" },
  { key: "undo", label: "Undo and redo", hint: "The same undo the rest of the app uses" },
  { key: "command", label: "Command palette hint", hint: "The Ctrl-K reminder" },
  {
    key: "agent",
    label: "Ask the agent",
    hint: "Open the agent over whatever you are doing, from any tab",
  },
  //: Added with INBOX 207, when the Guide left the header cluster. A slot
  //: added later appears by default for everyone, which is what storing the
  //: hidden set rather than the shown one buys (the note above).
  {
    key: "guide",
    label: "Guide",
    hint: "Ask the guide how this app works, from any tab",
  },
  //: Added with INBOX 270. A slot added later appears by default for
  //: everyone, which is what storing the hidden set rather than the shown one
  //: buys (the note above).
  {
    key: "find",
    label: "Find anything",
    hint: "Search your notes, documents, files and the app itself",
  },
];

function renderStatusBarSettings() {
  const box = $("status-bar-items");
  if (!box) return;
  const hidden = hiddenStatusSlots();
  // The clock's own row lives inside this same container now (index.html): 
  // moved there so it wraps as one more compact chip alongside STATUS_SLOTS'
  // instead of stretching full-width as a lone sibling after the flex box.
  // `replaceChildren()` below is only ever meant to clear the *generated*
  // rows this loop is about to rebuild; without pulling the static clock
  // label out first, it would delete that markup along with them on every
  // call and silently orphan `#status-bar-clock-toggle` for the rest of
  // this function.
  const clockLabel = document.getElementById("status-bar-clock-toggle")?.closest("label");
  box.replaceChildren();
  for (const slot of STATUS_SLOTS) {
    const label = document.createElement("label");
    label.className = "checkbox-label status-bar-item";
    label.title = slot.hint;
    const box_ = document.createElement("input");
    box_.type = "checkbox";
    box_.checked = !hidden.has(slot.key);
    box_.addEventListener("change", () => {
      const next = hiddenStatusSlots();
      if (box_.checked) next.delete(slot.key);
      else next.add(slot.key);
      const list = [...next];
      if (prefsCache) prefsCache.status_bar_hidden = list;
      applyStatusBarSlots();
      setPreference("status_bar_hidden", list);
    });
    const text = document.createElement("span");
    text.textContent = slot.label;
    label.append(box_, text);
    box.appendChild(label);
  }
  // Put the clock's row back: see the comment above `clockLabel`'s
  // declaration. Appended last, so it reads as the odd one out it actually
  // is (off by default) without visually separating from its siblings.
  if (clockLabel) box.appendChild(clockLabel);
  // The clock's own opt-in toggle, not one of STATUS_SLOTS above (it is
  // off by default, so it is rendered and wired separately rather than
  // joining a loop that assumes every entry starts visible).
  const clockToggle = $("status-bar-clock-toggle");
  if (clockToggle) {
    clockToggle.checked = Boolean(prefsCache?.status_bar_clock);
    clockToggle.onchange = () => {
      if (prefsCache) prefsCache.status_bar_clock = clockToggle.checked;
      applyStatusClock();
      setPreference("status_bar_clock", clockToggle.checked);
    };
  }
}
