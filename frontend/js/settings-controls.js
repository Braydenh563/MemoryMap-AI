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
$("account-rekey").addEventListener("click", async () => {
  const box = $("account-rekey-password");
  const status = $("account-rekey-status");
  status.classList.remove("error");
  if (!box.value) {
    status.classList.add("error");
    status.textContent = "Type your current password first.";
    return;
  }
  if (!(await confirmDialog("Give every private note a new key? Other open sessions are signed out.", { confirmLabel: "Re-encrypt" }))) return;
  status.textContent = "Re-encrypting…";
  try {
    const result = await apiJson("/auth/rotate-vault-key", {
      method: "POST",
      body: JSON.stringify({ current_password: box.value }),
      ownsAuthErrors: true,
    });
    localStorage.setItem("token", result.token);
    box.value = "";
    const n = result.notes_reencrypted;
    status.textContent = `Done: ${n} private note${n === 1 ? "" : "s"} on a new key.`;
  } catch (error) {
    status.classList.add("error");
    status.textContent = error.message;
  }
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
    if (typeof openTour === "function") openTour("basics");
    else openOnboarding();
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

$("export-backup-zip")?.addEventListener("click", () => downloadExport("backup"));

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
