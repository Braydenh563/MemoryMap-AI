// settings-wiring.js: saved filters, onboarding and diagnostics, rebindable
// shortcuts, the Wave F wiring, drag and paste. Moved out of app.js on
// 2026-09-26 as one contiguous range (INBOX 426 cc,
// docs/roadmap/agent-remaining/appjs-split.md). A classic script sharing
// app.js's globals, loaded in app.js's old order; nothing in an earlier file
// calls into it while the page loads (scratchpad/appjs-map.js --check).

// --- saved filters ---------------------------------------------------------------
// Once the filter box understands operators, the useful ones are worth
// keeping. "tag:work is:untagged" is a thing you want on a button, not
// something to retype: and it works with no AI at all.

function savedSearches() {
  return (prefsCache && prefsCache.saved_searches) || [];
}

function renderSavedSearches() {
  const box = $("saved-searches");
  const saved = savedSearches();
  box.replaceChildren();
  box.classList.toggle("hidden", saved.length === 0);
  for (const item of saved) {
    const chipEl = document.createElement("span");
    chipEl.className = "chip saved-search";
    const apply = document.createElement("button");
    apply.type = "button";
    apply.className = "saved-search-apply";
    setLabel(apply, `ph:star ${item.name}`);
    apply.title = `Filter: ${item.query}`;
    apply.addEventListener("click", () => {
      $("note-search").value = item.query;
      noteSearch = item.query;
      renderEntries();
      refreshNoteSearchWhy();
      announce(`Applied the saved filter "${item.name}".`);
    });
    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "saved-search-remove";
    setLabel(remove, "ph:x");
    remove.title = `Forget "${item.name}"`;
    remove.setAttribute("aria-label", remove.title);
    remove.addEventListener("click", async () => {
      const next = savedSearches().filter((s) => s.name !== item.name);
      await persistSavedSearches(next);
      toast(`Forgot "${item.name}".`);
    });
    chipEl.append(apply, remove);
    box.appendChild(chipEl);
  }
}

async function persistSavedSearches(next) {
  prefsCache = await apiJson("/preferences", {
    method: "PUT",
    body: JSON.stringify({ saved_searches: next }),
  });
  renderSavedSearches();
}

async function saveCurrentSearch() {
  const query = $("note-search").value.trim();
  if (!query) return;
  const name = await promptDialog("Name this filter:", query.slice(0, 40), { confirmLabel: "Save filter" });
  if (!name) return;
  // Re-saving an existing name updates it rather than adding a duplicate you
  // then have to hunt down and remove.
  const next = savedSearches().filter((s) => s.name !== name);
  next.push({ name, query });
  await persistSavedSearches(next);
  toast(`Saved "${name}".`);
}

$("save-search").addEventListener("click", saveCurrentSearch);

$("history-close").addEventListener("click", () =>
  $("history-overlay").classList.add("hidden")
);

$("find-duplicates").addEventListener("click", findDuplicates);
$("duplicate-threshold").addEventListener("input", (e) => {
  $("duplicate-threshold-value").textContent = `${e.target.value}%`;
});

// From Help, go to the Settings section rather than swapping one dialog for
// another: "how do I change a shortcut?" should end somewhere you can find
// again, not in an overlay with no address.
$("about-shortcuts").addEventListener("click", () => showSettingsSection("shortcuts"));
$("shortcuts-reset").addEventListener("click", resetShortcuts);
$("shortcuts-reset-settings").addEventListener("click", resetShortcuts);

// Both used to be bespoke click-toggle-only handlers, predating
// `initHelpToggle` (defined above) and never migrated to it, missing the
// outside-click and Escape closes every other help toggle in this app
// gets, reported directly ("the capture a thought tooltip doesn't close
// when clicking off it"), and `search-help-hint` also carried its own
// one-off `.search-help` class instead of the shared `.graph-help-panel`
// floating-popover look, reported separately as a style mismatch against
// the capture panel right next to it. One shared function fixes both.
initHelpToggle("search-help", "search-help-hint");
initHelpToggle("capture-help", "capture-help-hint");


$("prefs-save").addEventListener("click", savePrefs);
wirePrefsDirtyMarks();

//: **Ctrl+S on the Preferences section**, which the section's own copy has
//: promised for a long time ("Ctrl+S saves too") without anything in the app
//: implementing it: reported as no confirmation appearing on ctrl+s, and the
//: reason there was none is that nothing ran. In a browser the press went to
//: "save this page" instead; in the desktop window it did nothing at all.
//:
//: Capturing, so a focused textarea (the profile box is one) cannot swallow
//: it, and `preventDefault` so the browser's own save dialog does not open
//: on top of the toast. Scoped to this one section: ctrl+s elsewhere in
//: Settings has nothing to save, and taking the key globally would break the
//: browser shortcut everywhere for no gain.
document.addEventListener(
  "keydown",
  (event) => {
    if (!(event.ctrlKey || event.metaKey) || event.altKey || event.shiftKey) return;
    if (event.key !== "s" && event.key !== "S") return;
    if (!settingsOpen() || !["preferences", "general"].includes(currentSettingsSection)) return;
    event.preventDefault();
    savePrefs();
  },
  true
);
$("pref-search-reset").addEventListener("click", () => {
  $("pref-search-min-sim").value = 0.25;
  $("pref-search-z-margin").value = 0.5;
  savePrefs();
});
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
  badge.className = `chip ${running ? "confidence" : ""}`.trim();
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
  status.textContent = "Removing the old install…";
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
$("draft-model").addEventListener("click", () => openFeatureModelSheet("writing"));
wireFeatureModelSelects();
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

// Wave N: improve-writing, link suggestions.
$("improve-btn").addEventListener("click", () => openImprove($("entry-content")));
$("improve-close").addEventListener("click", closeImprove);
$("improve-apply").addEventListener("click", applyImprove);
$("improve-retry").addEventListener("click", runImprove);
for (const button of document.querySelectorAll(".improve-mode")) {
  button.addEventListener("click", () => {
    improveMode = button.dataset.mode;
    for (const b of document.querySelectorAll(".improve-mode"))
      b.classList.toggle("active", b === button);
    const isCustom = improveMode === "custom";
    $("improve-custom-row").classList.toggle("hidden", !isCustom);
    // Switching to Custom still calls runImprove(), it just prompts for an
    // instruction rather than hitting the API, since there's nothing to send
    // until the person has actually typed one and pressed Go.
    if (isCustom) $("improve-custom-input").focus();
    runImprove();
  });
}

$("improve-custom-go").addEventListener("click", () => {
  improveCustomInstruction = $("improve-custom-input").value;
  runImprove();
});
$("improve-custom-input").addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    e.preventDefault();
    $("improve-custom-go").click();
  }
});
$("link-suggest-btn").addEventListener("click", loadLinkSuggestions);
// Mark a picker as "user has a pending choice" so the status poll stops
// resetting it (Wave N bug fix).
for (const id of ["chat-model-select", "embedding-model-select"]) {
  $(id).addEventListener("change", () => ($(id).dataset.userChosen = "1"));
}
for (const radio of document.querySelectorAll('input[name="emb-backend"]')) {
  radio.addEventListener("change", () => {
    $("embedding-model-select").dataset.userChosen = "1";
    // The radio itself needs the latch too: the choice isn't saved until
    // "Apply & re-index", and without this the next status poll put the old
    // backend back the instant focus left the radio.
    radio.dataset.userChosen = "1";
    //: The picker's enabled state follows the radio immediately rather than
    //: waiting for the next status poll: choosing Ollama and finding the
    //: model list still greyed for a second reads as the choice not having
    //: taken. It says which backend is *selected*, which is the question the
    //: control is about; whether it is applied is what Apply is for.
    syncEmbeddingPickerState();
  });
}
$("status-back").addEventListener("click", () => stepTabHistory(-1));
$("status-forward").addEventListener("click", () => stepTabHistory(1));
$("status-back").addEventListener("contextmenu", (event) => {
  event.preventDefault();
  openNavHistoryMenu($("status-back"));
});
$("status-forward").addEventListener("contextmenu", (event) => {
  event.preventDefault();
  openNavHistoryMenu($("status-forward"));
});
wireLongPress($("status-back"), () => openNavHistoryMenu($("status-back")));
wireLongPress($("status-forward"), () => openNavHistoryMenu($("status-forward")));
$("status-nav-history")?.addEventListener("click", () => {
  const menu = $("status-nav-history-menu");
  if (menu.classList.contains("hidden")) openNavHistoryMenu($("status-nav-history"));
  else closeNavHistoryMenu();
});
document.addEventListener("click", (event) => {
  const menu = $("status-nav-history-menu");
  if (!menu || menu.classList.contains("hidden")) return;
  if (menu.contains(event.target) || event.target.closest("#status-nav-history")) return;
  closeNavHistoryMenu();
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") closeNavHistoryMenu();
});
$("settings-nav-back")?.addEventListener("click", () => stepTabHistory(-1));
$("settings-nav-forward")?.addEventListener("click", () => stepTabHistory(1));
// Seed the stack with wherever the app opened, or the first tab clicked has
// nothing behind it and Back stays dead until the second navigation, which
// reads as the button being broken rather than empty.
recordTabVisit(localStorage.getItem("activeTab") || "dashboard", null);
$("save-btn").addEventListener("click", saveEntry);
$("save-draft-btn").addEventListener("click", saveEntryAsDraft);
$("ask-btn").addEventListener("click", () => askQuestion()); // no event as preset
// Reported: "the semantic search settings button in the ask tab doesn't
// work", it does exist in the markup (`#ask-search-tune`, same icon/title
// as Chat's own per-turn tune button) but nothing ever wired a listener to
// it. Same destination as the other two quick-access links into this
// preferences group (Chat's per-turn tune button, the Dashboard catalog).
$("ask-search-tune").addEventListener("click", () => {
  openSettingsModal("general", "search-relevance-group");
});
$("stop-btn").addEventListener("click", stopAnswer);
$("retry-btn").addEventListener("click", retryAnswer);
$("copy-btn").addEventListener("click", copyAnswer);
$("new-chat-btn").addEventListener("click", newChat);
$("ask-history-toggle").addEventListener("click", toggleAskHistoryPanel);
// Asked for directly: an X to close the history panel, not only the History
// toggle button that opened it (easy to lose track of once scrolled past).
$("ask-history-close")?.addEventListener("click", () => {
  if (askHistoryOpen) toggleAskHistoryPanel();
});
$("ask-history-more").addEventListener("click", () => loadAskHistoryPage(false));
$("ask-history-pinned-only").addEventListener("change", () => loadAskHistoryPage(true));
$("ask-history-clear").addEventListener("click", clearAskHistory);
let askHistorySearchDebounce;
$("ask-history-search").addEventListener("input", () => {
  clearTimeout(askHistorySearchDebounce);
  askHistorySearchDebounce = setTimeout(() => loadAskHistoryPage(true), 200);
});
$("lock-btn").addEventListener("click", lockNow);

// **Locking has to reach every open tab, not just the one you clicked in.**
//
// The lock audit found this one by opening a second tab, which ROADMAP.md had
// named as an unchecked avenue. Locking in tab A cleared tab A and dropped the
// shared token, so the API correctly refused tab B, but tab B kept showing
// all 61 notes with no lock screen at all, indefinitely. Lock the notebook,
// walk away from a shared machine, and everything is still on screen in the
// window behind.
//
// `storage` fires in *other* tabs of the same origin when a key changes, which
// is exactly the signal wanted: the tab that did the locking has already
// handled itself, and no polling or cross-tab channel is needed. A `null`
// `newValue` is the removal specifically (`localStorage.clear()` also arrives
// with a null `key`, and is treated the same way, the token is gone either
// way).
window.addEventListener("storage", (event) => {
  if (event.storageArea !== localStorage) return;
  if (event.key !== null && event.key !== "token") return;
  if (localStorage.getItem("token")) return; // a sign-in elsewhere, not a lock
  // Already locked, unless the overlay is only asking for a password.
  if (!$("lock-overlay").classList.contains("hidden") && $("lock-overlay").dataset.mode !== "prompt") return;
  lockedByHand = true; // a lock elsewhere is a lock here: no quiet new session
  purgeLockedContent();
  showLockScreen(false);
});
$("lock-submit").addEventListener("click", submitLockForm);
$("lock-password").addEventListener("keydown", (e) => {
  if (e.key === "Enter") submitLockForm();
  if (e.key === "Escape" && lockPrompt) {
    e.preventDefault();
    e.stopPropagation();
    settleLockPrompt(false);
  }
});
$("lock-cancel").addEventListener("click", () => settleLockPrompt(false));
// Enter in the question box asks; Ctrl+Enter in the note box saves.
$("question").addEventListener("keydown", (e) => {
  if (e.key === "Enter") askQuestion();
});
$("entry-content").addEventListener("keydown", (e) => {
  // The suggestion list owns the arrows, Enter, Tab and Escape while it's up.
  if (wikiSuggestKeydown(e, $("entry-content"))) return;
  if (e.key === "Enter" && e.ctrlKey) saveEntry();
});
$("entry-content").addEventListener("input", () => {
  wikiSuggestIndex = 0;
  renderWikiSuggest($("entry-content"));
  scheduleCaptureTagSuggestions();
});
// Moving the caret with the mouse or arrows can leave the fragment behind.
$("entry-content").addEventListener("click", () => renderWikiSuggest($("entry-content")));
$("entry-content").addEventListener("blur", () => setTimeout(hideWikiSuggest, 120));
//: True while the notebook is locked, the unlock overlay is up and nothing
//: behind it may be reached.
//:
//: **This is a privacy hole, not a polish item.** Reported directly: "I can
//: use keyboard shortcuts to access features even when locked out… like the
//: meeting notes popup." The global handler below had no lock check of any
//: kind, so every shortcut worked behind the lock screen: the command
//: palette (which lists and opens notes by title), "/" to focus search, the
//: `g`-then-letter tab jumps, the meeting recorder, all of it. The lock
//: screen is the only privacy boundary this app has, and the keyboard walked
//: straight past it.
//:
//: Read off the DOM rather than a flag, deliberately: the overlay's own
//: `hidden` class is what every other part of the app already treats as the
//: truth about being locked, and a second source of truth is how a boundary
//: like this drifts back open.
function notebookLocked() {
  const overlay = document.getElementById("lock-overlay");
  return Boolean(overlay) && !overlay.classList.contains("hidden");
}

//: `flashSaved` and `saveWhatIsInFront` live here, at module scope, rather
//: than inside the keydown listener below where they were written.
//: `runShortcut` is the only caller of the second one now and is a top-level
//: function, so a declaration nested in that listener's callback would not be
//: in its scope at all.
  //: A short, non-blocking mark on the control a shortcut just pressed, so a
//: keyboard save is visibly a save rather than a key that did nothing. The
//: class is removed on the animation's own end rather than on a timer, so
//: two presses in a row both show, and it is a no-op under
//: `prefers-reduced-motion` (the rule carries no animation there).
function flashSaved(el) {
  if (!el) return;
  el.classList.remove("just-saved");
  //: **The ring is added to the control's shadow, not swapped for it.**
  //: `box-shadow` is one property holding a list, so an animation on it
  //: replaces whatever the control already had. Measured on `#prefs-save`,
  //: whose resting shadow is `rgba(70,100,240,0.25) 0 2px 10px`: the ring
  //: dropped that glow for its whole duration and snapped it back at the end,
  //: which reads as the button flickering rather than acknowledging. The
  //: resting value is handed to the keyframes as a custom property and they
  //: draw it underneath the ring (08-consistency.css). Read before the class
  //: goes on, or it is the animation's own first frame that comes back.
  const resting = getComputedStyle(el).boxShadow;
  el.style.setProperty("--just-saved-rest", resting && resting !== "none" ? resting : "0 0 #0000");
  // Reading a layout property between the remove and the add is what restarts
  // a CSS animation on an element that already has the class; without it a
  // second press inside the animation's own duration shows nothing.
  void el.offsetWidth;
  el.classList.add("just-saved");
  el.addEventListener("animationend", () => {
    el.classList.remove("just-saved");
    el.style.removeProperty("--just-saved-rest");
  }, { once: true });
}

//: **Ctrl+S saves what is in front of you** (INBOX 74, asked for: "register
//: the ctrl s command for saving progress such as settings"). Settings: the
//: visible section's own Save button, or the nav button for a section that
//: saves as you change it; Documents: the document; Capture: the note.
//:
//: **Called from `runShortcut`, not from a Ctrl+S branch of its own.** This
//: was written as a second `if` further down the same keydown handler, and
//: it never ran once: `shortcuts` carries a `save` binding whose default keys
//: are Ctrl+S, and the chorded loop at the top of that handler matches it,
//: calls `runShortcut("save")` and returns first. Measured live with the
//: Settings modal open (`scratchpad/ui-sweeps/ctrlss4.js`): `matchesShortcut`
//: against a Ctrl+S event returns the `save` binding, so every keystroke went
//: to that two-line handler, which knows only about Documents and Capture and
//: called `saveEntry()` with the settings modal in front of the reader. Both
//: halves of the report ("doesnt work", "needs visual confirmation") were
//: still true for that reason. `runShortcut` now calls this, so the binding
//: is the one place Ctrl+S is decided and rebinding it still works.
function saveWhatIsInFront() {
  if (settingsModalOpen()) {
    //: **Look for a control that is actually on screen, not for a naming
    //: convention.** Reported on 2026-09-09: "ctrl s for saving settings
    //: changes while on the settings modal doesnt work and it needs visual
    //: confirmation as well." Measured with the modal open on its default
    //: section: seventeen `.settings-section` elements, exactly one of them
    //: visible (`#settings-models`), and every one of the six
    //: `button[id$="-save"]` in the document laid out at zero height,
    //: because they all belong to other sections. So the lookup found
    //: nothing every time and the keystroke answered "this section saves as
    //: you change it" whether or not that was true.
    //:
    //: `offsetParent` is the test that a screenshot would use: is this
    //: button on screen. The id suffix stays as the first preference, since
    //: it is exact where it applies, and a visible "Save…" button anywhere
    //: in the modal is the fallback for the sections that never adopted it.
    const onScreen = (el) => el && el.offsetParent !== null && !el.disabled;
    const section = [...document.querySelectorAll(".settings-section")].find(
      (el) => el.offsetParent !== null,
    );
    let save = [...(section?.querySelectorAll('button[id$="-save"]') || [])].find(onScreen);
    if (!save) {
      save = [...document.querySelectorAll("#settings-modal button")].find(
        (el) => onScreen(el) && /^save\b/i.test((el.textContent || "").trim()),
      );
    }
    if (save) {
      save.click();
      //: The visual half of the same report. The save handlers each raise
      //: their own toast, but a keystroke with no immediate mark on the
      //: control it pressed reads as a keystroke that went nowhere, so the
      //: button itself acknowledges the press before its handler answers.
      flashSaved(save);
    } else {
      //: **The other fifteen sections acknowledge the keystroke too.**
      //: Measured across all seventeen (`scratchpad/ui-sweeps/settingssave.js`):
      //: exactly two, Appearance and Preferences, have a Save button on
      //: screen. Everywhere else, including the section Settings opens on,
      //: Ctrl+S raised a toast and marked nothing, so the half of the report
      //: that asked for visual confirmation was still true for most of the
      //: modal. The nav button for the open section is what gets the ring:
      //: it is small, always in view, and it is the control that names the
      //: page the keystroke was aimed at, where the section panel itself is
      //: a scrolling column whose edges are mostly off screen.
      flashSaved(document.querySelector("#settings-nav button.active"));
      toast("Nothing on this settings page needs saving. It saves as you change it.");
    }
    return;
  }
  if (!$("tab-documents")?.classList.contains("hidden") && typeof saveDocument === "function") {
    saveDocument();
    return;
  }
  //: **Capture, and the button does not have to be on screen.** This branch
  //: required `offsetParent`, which was written while the code was unreachable
  //: and is wrong: measured on a fresh Notes tab, the composer is collapsed and
  //: `#save-btn.offsetParent` is null, so with the branch finally running every
  //: keyboard save on Notes answered "Nothing to save here." The question the
  //: keystroke asks is whether anything has been written, not whether the
  //: button happens to be laid out. What the visibility does decide is the
  //: mark: there is no point ringing a control nobody can see.
  const capture = $("save-btn");
  if (capture && !capture.disabled) {
    //: Ctrl+S on an empty composer is a keystroke, not a mistake worth
    //: scolding: pressing the button would raise the composer's own "write
    //: something first" error, which is the line the owner found sitting
    //: there having "didnt do anything".
    const written = ($("entry-content")?.value || "").trim() || ($("entry-title")?.value || "").trim();
    if (!written) {
      toast("Nothing to save yet.");
      return;
    }
    capture.click();
    if (capture.offsetParent) flashSaved(capture);
    return;
  }
  toast("Nothing to save here.");
  return;
}

document.addEventListener("keydown", (e) => {
  // **Before anything else.** A locked notebook answers no shortcut, not a
  // chorded one, not a bare one, not a tab jump. Typing is untouched: this
  // returns before any shortcut is *dispatched*, so the password field still
  // receives every keystroke, and Enter still submits it through the form's
  // own handler rather than this one.
  if (notebookLocked()) return;
  // Rebinding swallows everything while it's listening.
  if (captureShortcutKey(e)) {
    e.preventDefault();
    return;
  }
  // Chorded shortcuts (anything with a modifier) work even while typing, 
  // Ctrl+K from inside the note box should still open the palette. Undo/redo
  // are the deliberate exception: Ctrl+Z/Ctrl+Shift+Z are already the
  // browser's own undo for whatever text field has focus (correcting a typo
  // you just made), and that has to win over this app's global stack: 
  // otherwise fixing a typo in the note box would silently restore a
  // deleted note instead of undoing the keystroke.
  const chorded = e.ctrlKey || e.metaKey || e.altKey;
  //: **A chord the open board answers itself is the board's** (the
  //: conventions pass, 2026-09-23). Ctrl+Shift+G is Ungroup on every canvas
  //: people know and agent mode here, and both listeners ran: ungrouping a
  //: selection on a board also threw you out to Chat (measured: the board's
  //: container measured 0 x 0 straight after). `wbOwnsChord` names the
  //: board's own chords; the same handoff undo already makes
  //: (`boardHistoryActive`), one owner for one shortcut.
  if (chorded && !(typeof wbOwnsChord === "function" && wbOwnsChord(e))) {
    const inTextField =
      ["INPUT", "TEXTAREA"].includes(document.activeElement?.tagName) ||
      document.activeElement?.isContentEditable;
    //: **Ctrl+Y is redo too**, the Windows habit: the board's own Redo
    //: button and Edit menu already print "Ctrl+Y" and nothing answered it
    //: (the Guide agent's finding, 2026-09-24). Same rule as Ctrl+Shift+Z:
    //: a text field keeps its own.
    if (!inTextField && (e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey && e.key.toLowerCase() === "y") {
      e.preventDefault();
      runShortcut("redo");
      return;
    }
    for (const [id, def] of Object.entries(shortcuts)) {
      if ((id === "undo" || id === "redo") && inTextField) continue;
      //: INBOX 321: on an open board the same chord duplicates the selection.
      //: And an editor that already answered it keeps it: the documents
      //: editor binds Ctrl+D to "select the next match" (CodeMirror's search
      //: keymap), handles it at the target and marks it `defaultPrevented`.
      if (id === "todaysNote" && (boardHistoryActive() || e.defaultPrevented)) continue;
      //: The same handoff for Ctrl+/ (INBOX 402): the documents editor's
      //: keymap answers it with the comment toggle and marks it handled, and
      //: this then wrote a "/" over the selection the toggle had just made,
      //: so Ctrl+/ on a line of prose left a lone "/" where the line was
      //: (measured, `doccodevs.js`). In a note box nothing answers it first,
      //: so the blocks menu still opens there.
      if (id === "editorMenu" && e.defaultPrevented) continue;
      if (matchesShortcut(e, def.keys)) {
        e.preventDefault();
        //: The chord goes through the same `performUndo`/`performRedo` the
        //: status bar's buttons press, which is where the board handoff
        //: lives (`boardHistoryActive`), so all three doors agree.
        runShortcut(id);
        return;
      }
    }
  }
  if (e.key === "Escape" && !$("notif-panel").classList.contains("hidden")) {
    closeNotifications();
    $("notif-btn").setAttribute("aria-expanded", "false");
    return;
  }
  if (e.key === "Escape" && !$("onboarding-overlay").classList.contains("hidden")) {
    closeOnboarding();
    return;
  }
  if (e.key === "Escape" && !$("features-overlay").classList.contains("hidden")) {
    closeFeatures();
    return;
  }
  if (e.key === "Escape" && !$("graph-new").classList.contains("hidden")) {
    closeGraphNewNote();
    return;
  }
  if (e.key === "Escape" && !$("graph-popup").classList.contains("hidden")) {
    closeGraphPopup();
    return;
  }
  if (e.key === "Escape" && !$("palette-overlay").classList.contains("hidden")) {
    closePalette();
    return;
  }
  if (e.key === "Escape" && !$("sketch-overlay").classList.contains("hidden")) {
    closeSketch();
    return;
  }
  if (e.key === "Escape" && !$("meeting-overlay").classList.contains("hidden")) {
    closeMeetingRecorder();
    return;
  }
  if (e.key === "Escape" && !$("improve-overlay").classList.contains("hidden")) {
    closeImprove();
    return;
  }
  if (e.key === "Escape" && !$("connections-overlay").classList.contains("hidden")) {
    $("connections-overlay").classList.add("hidden");
    return;
  }
  if (e.key === "Escape" && !$("history-overlay").classList.contains("hidden")) {
    $("history-overlay").classList.add("hidden");
    return;
  }
  if (e.key === "Escape" && !$("shortcuts-overlay").classList.contains("hidden")) {
    closeShortcuts();
    return;
  }
  // Four modal-overlay dialogs (settings, doc AI-edit, extract-to-notes,
  // recycle bin) had a close button and a backdrop-click handler but no
  // Escape wiring here: every other overlay in this list works with
  // Escape, so these four were the exception rather than a deliberate
  // choice (Nielsen's "user control and freedom").
  if (e.key === "Escape" && settingsModalOpen()) {
    closeSettingsModal();
    return;
  }
  if (e.key === "Escape" && !$("doc-ai-panel").classList.contains("hidden")) {
    closeDocAiPanel();
    return;
  }
  if (e.key === "Escape" && !$("extract-panel").classList.contains("hidden")) {
    closeExtractPreview();
    return;
  }
  if (e.key === "Escape" && !$("binned-overlay").classList.contains("hidden")) {
    closeBinnedReader();
    return;
  }
  // "/" focuses search: but only when you're not already typing somewhere
  // and no overlay is open, so it never steals a literal slash (Wave J).
  //: **`isContentEditable` too**, which the chorded branch above already
  //: checks and this one did not. The list of three tag names was exactly
  //: right while every editing surface in this app was a textarea; it is not
  //: any more. The documents editor stops its own single characters at its
  //: host (`docGuardGlobalShortcuts` in documents.js, which explains why it is
  //: done there rather than here), so the gap showed on the next
  //: contenteditable instead: the Library's OCR region text, where a literal
  //: "/" moved focus to the global search and swallowed the rest of the
  //: correction (measured by `scratchpad/ui-sweeps/typingguard.js`). Fixing
  //: the shared guard means the one after that is born working.
  const el = document.activeElement;
  const typing =
    ["INPUT", "TEXTAREA", "SELECT"].includes(el && el.tagName) || Boolean(el && el.isContentEditable);
  const overlayOpen =
    settingsModalOpen() ||
    !$("palette-overlay").classList.contains("hidden") ||
    !$("sketch-overlay").classList.contains("hidden");
  // Unchorded shortcuts ("/", "?") only fire when you're not typing and no
  // overlay is open, so they never steal a literal slash mid-sentence.
  if (!typing && !overlayOpen) {
    for (const [id, def] of Object.entries(shortcuts)) {
      const bare = !/\+/.test(def.keys);
      if (bare && matchesShortcut(e, def.keys)) {
        e.preventDefault();
        runShortcut(id);
        return;
      }
    }
  }
  //: **The "m" chord is not behind the overlay guard, and that is the point.**
  //:
  //: Reported: "when I press m and s for settings, it gets stuck when I try
  //: to press m again and something else to navigate out of it". It was
  //: stuck because `m` + `s` opens Settings, Settings makes `overlayOpen`
  //: true, and this whole block used to sit inside `!overlayOpen`: the very
  //: chord that opened the modal could not be used to leave it. Quick-nav is
  //: the app's "take me somewhere else" gesture, so it has to outrank a
  //: surface that is merely on top. The bare shortcuts above stay behind the
  //: guard, because those are single letters that a modal's own controls
  //: have a better claim on.
  //:
  //: `typing` still wins over both: a chord that fired while you were
  //: filling in a settings field would eat the letter you meant to type.
  if (!typing) {
    // The second half of the "m" then a letter chord, armed below. Checked
    // first so a stray letter within the window is consumed (matched or
    // not) rather than falling through and re-arming on a later "g".
    //: **A second "m" toggles the guide closed rather than being read as an
    //: unrecognised chord key.** Asked for directly: "if i press it then the
    //: popup opens and i can press m again to close it or an x close button
    //: to close it."
    //:
    //: `e.repeat` is refused here and at the arming branch below, because a
    //: held key repeats: reported as "when I hold down m, the screen flashes
    //: with the popup help nav ui". Every repeat was a fresh press to this
    //: handler, so the toggle opened, closed, opened and closed at the
    //: keyboard's repeat rate. Holding "m" now shows the guide once and
    //: holds it there, which is what holding a key should mean.
    if (e.repeat && e.key === "m") return;
    if (tabJumpArmedAt && e.key === "m" && !e.ctrlKey && !e.metaKey && !e.altKey) {
      tabJumpArmedAt = 0;
      hideChordGuide();
      return;
    }
    if (tabJumpArmedAt) {
      tabJumpArmedAt = 0;
      const usable = !e.ctrlKey && !e.metaKey && !e.altKey;
      const target = usable ? TAB_JUMP_KEYS[e.key] : undefined;
      const action = usable ? CHORD_ACTIONS[e.key] : undefined;
      hideChordGuide();
      if (target) {
        e.preventDefault();
        //: Leaving for another tab means leaving whatever is over it, or the
        //: jump lands behind a modal that is still taking the keyboard.
        closeOverlaysForChord();
        switchTab(target);
        return;
      }
      if (action) {
        e.preventDefault();
        //: Same for an action: `m` then `s` from inside the palette should
        //: end with Settings open, not with both stacked.
        closeOverlaysForChord();
        action.run();
        return;
      }
      // Not a recognised second key, fall through and let this keypress do
      // whatever it would have done anyway.
    } else if (e.key === "m" && !e.ctrlKey && !e.metaKey && !e.altKey) {
      tabJumpArmedAt = performance.now();
      //: Asked for: "m" rather than "g" (m for MemoryMap, and "g" collided
      //: with Graph's own letter), and "some visual assistance and guides":
      //: the first key shows the chord's targets for as long as it is armed,
      //: so the second key is never a guess.
      showTabJumpHint();
      return; // wait for the second key; a lone "m" does nothing on its own
    }
  }
  if (e.key === "Escape" && settingsModalOpen()) closeSettingsModal();
  if (e.key === "Escape") closeActionMenus();
  if (e.key === "Escape" && linkSource !== null) {
    linkSource = null;
    renderEntries();
  }
});

// Clicking anywhere outside an open ⋯ menu closes it (Wave L).
//
// `.action-menu-escaped` covers a menu `wireEscapedActionMenu` has
// reparented to `<body>` while open: its dropdown is no longer a
// descendant of `.menu-wrap` at that point, so a click inside the (still
// open) dropdown would otherwise fail `closest(".menu-wrap")` and be read
// as an outside click. Only ever *widens* what counts as inside; no
// existing kebab gains this class, so nothing about them changes.
//
// **`pointerdown`, capture phase, not `click`.** Reported: an escaped menu
// (reparented to `<body>`, `position: fixed`, so it paints over whatever is
// underneath) sometimes stayed open, or a click meant for the row behind it
// landed on that row instead. `click` fires after `pointerup`, by which
// point a note card's own `pointerdown`/`mousedown` handlers (drag,
// selection) have already run against the *old* DOM, and on some rows that
// consumed or moved the event before it ever reached this listener in the
// bubble phase. `pointerdown` in the capture phase runs first, ahead of
// every other handler on the page, so the menu is gone before anything
// underneath it can react to the same gesture.
//: A press *inside* any open menu is the menu's own: `.action-menu` covers a
//: menu that lives on <body> without a `.menu-wrap` around it (the board's
//: context menu), where a press on one of its group rows closed the whole
//: menu before the row could open its flyout (measured on the map node menu).
document.addEventListener("pointerdown", (e) => {
  if (!e.target.closest(".menu-wrap, .action-menu, .action-menu-escaped")) closeActionMenus();
}, true);

// Focus trapping (Wave L): while a dialog is open, Tab cycles inside it
// instead of wandering into the page behind, a WCAG dialog basic.
//
// **This was a hard-coded list of eight ids, and the list was the bug.** An
// audit counted the dialogs it did not name: `confirmDialog`, `promptDialog`,
// the image lightbox, the note-history overlay, the recycle-bin overlay, the
// skill-run overlay, the agent command palette, and the graph's
// connection dialog: eight trapped, eight not, and nothing anywhere to say
// which half a new dialog would land in. Every one of those was added by
// somebody who had no reason to know this list existed, which is the whole
// failure: a registry you must remember to update is a registry that goes
// stale, and it goes stale silently, because a dialog with no focus trap
// looks completely normal until somebody presses Tab.
//
// So: ask the DOM instead, and ask it the question that actually matters, 
// **`aria-modal="true"`, not merely `role="dialog"`.** That distinction is the
// whole correctness of this function. Of the 27 `role="dialog"` elements in
// `index.html`, 13 are anchored *popovers* rather than modals: the
// notifications panel, the note picker, the chat dock's disclosure, the graph
// and timeline popups, and the six `*-intro` help panels. The page behind
// those stays live and interactive by design, so trapping Tab inside one
// would strand the user in a dropdown, and telling a screen reader they are
// modal would be a straight lie about the page. `aria-modal` is exactly the
// declaration of "everything else is inert", so a dialog that wants a focus
// trap says so in the one attribute that already means it, and a new modal is
// trapped from the moment it exists.
//
// Topmost wins, and "topmost" is document order: the static overlays sit in
// `index.html` in a fixed sequence, and the dynamic ones (`confirmDialog` and
// friends) are appended to `<body>`, so the last match is always the one
// stacked on top. That matters for the real case of a confirm dialog opened
// from inside Settings: Tab has to cycle within the confirm, not the modal
// behind it.
//
// Visibility is `.hidden` plus `getClientRects()`, deliberately not
// `offsetParent !== null`: `.modal-overlay` is `position: fixed`, and a fixed
// element's `offsetParent` is null even when it is plainly on screen. The
// filter below uses `offsetParent` on the *children*, which are not fixed, so
// it is correct there and would have been wrong here.
function activeOverlay() {
  const open = [
    ...document.querySelectorAll('[role="dialog"][aria-modal="true"]'),
  ].filter((el) => !el.classList.contains("hidden") && el.getClientRects().length > 0);
  return open.length ? open[open.length - 1] : null;
}

// --- first-run onboarding tour (learnability) -------------------------------

const ONBOARDING_SLIDES = [
  {
    icon: "ph:brain",
    title: "Welcome to MemoryMap",
    //: **"Out of the box", not "ever".** Measured 2026-09-21: two features
    //: make outbound requests, web search and the update check, and both are
    //: off by default (`core/config.py`), so the claim is exactly true until
    //: the person turns one on and false the moment they do. Saying so is
    //: stronger than the absolute, not weaker: this sentence sits in the same
    //: Settings area as both switches, and a promise the app itself offers to
    //: break is the kind a privacy-minded reader checks and stops trusting.
    text: "A 100% offline notebook where a local AI files your thoughts and answers questions about them. Out of the box nothing leaves this computer. Two features can, web search and the update check, and both stay off until you turn them on.",
  },
  // §27: "before the person's first capture fails silently into
  // Uncategorised and they assume the AI is broken rather than absent", so
  // this sits before the capture slide, not after. `dynamic` is filled in by
  // `loadOnboardingDiagnostics` once the overlay is actually showing it,
  // reusing /models/status and /storage rather than a new endpoint, both
  // already exist and are already polled elsewhere in the app.
  {
    icon: "ph:stethoscope",
    title: "Your setup",
    dynamic: true,
  },
  // **The seven slides that used to follow this one are the guided tour now**
  // (frontend/tour.js). They described a tab in prose, "the Graph tab draws
  // how your notes connect", "press Ctrl+K anywhere", from the middle of a
  // screen that was covering the tab bar those words were about, which is the
  // gap the owner named: "there is no guided tour and introduction, with
  // positioned popup cards". Nothing was dropped: every one of them is a step
  // in TOUR_SECTIONS anchored to the control it used to describe, which is
  // both shorter to read and the only version that can point at anything.
  //
  // What stays here is what an anchored card cannot do. The welcome says what
  // MemoryMap is before there is any interface to point at, and the setup
  // slide is a live check of Ollama and the notebook's folder with its two
  // one-click offers (pull a model, seed example notes) on it: a card the size
  // of a sentence, hung off a control, is the wrong place for either. So the
  // two surfaces are kept apart on purpose, the welcome ends by handing over
  // to the tour, and Settings, help and guide offers them separately.
];

let onboardingIndex = 0;
// A stale diagnostics fetch (the user clicked Next or Skip before it
// resolved) must never overwrite whichever slide is showing by the time it
// lands: this is what tells a resolved probe whether it still applies.
let onboardingDiagnosticsToken = 0;

// §27's first-run diagnostics: Ollama reachability and where the notebook
// actually lives, both already computed for other UI (the AI-status pill,
// Settings → Data) and just not surfaced before a first capture could fail
// silently into Uncategorised.
async function loadOnboardingDiagnostics(forSlide) {
  const token = ++onboardingDiagnosticsToken;
  const [models, storage, notebook] = await Promise.all([
    apiJson("/models/status").catch(() => null),
    apiJson("/storage").catch(() => null),
    apiJson("/entries/count").catch(() => null),
  ]);
  if (token !== onboardingDiagnosticsToken) return; // superseded by a later slide
  if (onboardingIndex !== forSlide) return; // the user moved on already
  if ($("onboarding-overlay").classList.contains("hidden")) return; // or closed it

  const lines = [];
  lines.push(
    models && models.ollama_running
      ? "Ollama is running, so Atlas will file your notes and answer questions."
      : "Ollama isn't running right now, MemoryMap still works without it. " +
          "Notes are still searched by keyword, and everything catches up the moment it's on."
  );
  if (storage) {
    const mb = storage.database_bytes
      ? (storage.database_bytes / (1024 * 1024)).toFixed(1)
      : "0";
    lines.push(
      `Your notebook lives at ${storage.data_dir} (${mb} MB so far), and nothing here leaves this machine unless you turn on web search or the update check.`
    );
    // ROADMAP.md's onboarding item named this the one still-open piece: a
    // data-dir writability check. The database opening at all already
    // implies it was writable at boot, but a synced folder, a permissions
    // change, or a disk remounted read-only can flip that afterwards with
    // nothing in the interface ever saying so, a save just starts failing,
    // on the one screen this app has that already knows where the notebook
    // lives and is looking right at it.
    if (storage.data_dir_writable === false) {
      lines.push(
        "That folder isn't writable right now, so new notes and edits won't " +
          "save. Check its permissions, or move the notebook somewhere " +
          "MemoryMap can write to (Settings → Account & security)."
      );
    }
  } else {
    lines.push("Couldn't check where your notebook lives just now.");
  }
  $("onboarding-text").textContent = lines.join(" ");
  renderOnboardingActions(models, notebook);
}

// The two concrete gaps ROADMAP.md named for onboarding: offering to pull a
// model, and seeding example notes so the Graph/Timeline/Dashboard aren't
// empty on a first look. Both are one-click offers on the setup slide,
// never automatic: a fresh install with no notes and no model is exactly
// the state a real, deliberate first run looks like too, so this only ever
// acts on an explicit click.
function renderOnboardingActions(models, notebook) {
  const box = $("onboarding-actions");
  box.replaceChildren();
  const offers = [];

  if (models && models.ollama_running && !models.chat_model_installed) {
    offers.push(
      smallButton(
        "Download a starter model",
        "Pull llama3.2 (~2.2 GB) with Ollama, in the background",
        async (event) => {
          event.target.disabled = true;
          event.target.textContent = "Downloading in the background…";
          try {
            await api("/models/pull", {
              method: "POST",
              body: JSON.stringify({ name: "llama3.2" }),
            });
            refreshModelStatus();
          } catch (error) {
            event.target.disabled = false;
            event.target.textContent = "Download a starter model";
            toast(error.message || "Couldn't start the download.", true);
          }
        },
        false
      )
    );
  }

  if (notebook && notebook.count === 0) {
    offers.push(
      smallButton(
        "Add example notes",
        "Seed a few linked notes so the Graph, Timeline and Dashboard have something to show",
        async (event) => {
          event.target.disabled = true;
          try {
            const result = await apiJson("/entries/seed-examples", { method: "POST" });
            event.target.textContent =
              result && result.created
                ? `Added ${result.created}: look for the "welcome" tag`
                : "Added";
            loadEntries();
          } catch (error) {
            event.target.disabled = false;
            toast(error.message || "Couldn't add the example notes.", true);
          }
        },
        false
      )
    );
  }

  box.classList.toggle("hidden", offers.length === 0);
  for (const button of offers) box.appendChild(button);
}

function renderOnboardingSlide() {
  const slide = ONBOARDING_SLIDES[onboardingIndex];
  setLabel($("onboarding-icon"), slide.icon);
  //: **Atlas says hello on the first card** (the owner: "atlas should also
  //: be in the welcome tour as well to greet new users"). Its own face,
  //: pleased and always moving, with one line in its own voice; the later
  //: cards keep the app's logo, so a new person meets both.
  const atlas = $("onboarding-atlas");
  const greet = onboardingIndex === 0 && typeof atlasMark === "function";
  atlas.classList.toggle("hidden", !greet);
  $("onboarding-emblem").classList.toggle("hidden", greet);
  $("onboarding-icon").classList.toggle("hidden", greet);
  if (greet) {
    const face = document.createElement("span");
    face.className = "nm-live";
    face.appendChild(atlasMark(104, "happy"));
    const say = document.createElement("p");
    say.className = "onboarding-atlas-say";
    say.textContent = `Hi, I'm ${aiNameNow()}. I'll file what you write and find it again when you ask.`;
    atlas.replaceChildren(face, say);
  }
  $("onboarding-title").textContent = slide.title;
  if (slide.dynamic) {
    $("onboarding-text").textContent = "Checking Ollama and where your notebook lives…";
    loadOnboardingDiagnostics(onboardingIndex);
  } else {
    $("onboarding-text").textContent = slide.text;
  }
  const dots = $("onboarding-dots");
  dots.replaceChildren();
  ONBOARDING_SLIDES.forEach((_, i) => {
    const dot = document.createElement("span");
    dot.className = "onboarding-dot" + (i === onboardingIndex ? " active" : "");
    dots.appendChild(dot);
  });
  $("onboarding-back").classList.toggle("hidden", onboardingIndex === 0);
  const last = onboardingIndex === ONBOARDING_SLIDES.length - 1;
  // "Start the tour", not "Get started": the last press of the welcome now
  // opens the tour's first section rather than dropping somebody on the
  // Dashboard with nothing said about where anything is. The word has to say
  // so, or the tour arrives as a surprise on top of a card they just closed.
  const tourOn = typeof TOUR_ENABLED === "undefined" || TOUR_ENABLED;
  $("onboarding-next").textContent = last ? (tourOn ? "Start the tour" : "Get started") : "Next";
  //: **And the other answer to that offer, in words** (the owner, 2026-09-21:
  //: "add a skip guided tour button to the welcome intro panels"). The left
  //: button has always closed the welcome and counted as declining the tour,
  //: which `closeOnboarding` records, but on the last slide it still said
  //: "Skip" beside a primary that says "Start the tour", so the one thing it
  //: was answering was the one thing it did not name. It names it there.
  const skip = $("onboarding-skip");
  skip.textContent = last && tourOn ? "Skip the tour" : "Skip";
  skip.title = last
    ? "Go straight to the app. You can start the tour any time from Settings, Help."
    : "Close the welcome and go straight to the app";
  skip.setAttribute("aria-label", skip.title);
}

function openOnboarding() {
  onboardingIndex = 0;
  overlayReturnFocus = document.activeElement;
  renderOnboardingSlide();
  $("onboarding-overlay").classList.remove("hidden");
  $("onboarding-next").focus();
}

function closeOnboarding() {
  $("onboarding-overlay").classList.add("hidden");
  localStorage.setItem("onboardingDone", "1");
  // Skipping the welcome is also an answer about the tour: whoever closed this
  // card has been offered the introduction and said no, so nothing may open
  // the tour at them by itself afterwards. `tourClose` writes the same key
  // when the tour itself ends, and Settings, help and guide is the way back to
  // either of them.
  localStorage.setItem("tourDone", "1");
  overlayReturnFocus?.focus?.();
  overlayReturnFocus = null;
}

function onboardingNext() {
  if (onboardingIndex >= ONBOARDING_SLIDES.length - 1) {
    closeOnboarding();
    // The hand-off: the welcome says what this is, the tour says where things
    // are, and the last press of the one starts the other. Guarded because
    // tour.js is a separate file loaded after this one, and a page served
    // without it must still close the welcome cleanly.
    //: Only if the tour is switched on: `TOUR_ENABLED` in tour.js is the one
    //: flag, and the welcome's primary is relabelled to match.
    if (typeof openTour === "function" && typeof TOUR_ENABLED !== "undefined" && TOUR_ENABLED) {
      openTour("basics");
    }
    return;
  }
  onboardingIndex += 1;
  renderOnboardingSlide();
}

function onboardingBack() {
  if (onboardingIndex === 0) return;
  onboardingIndex -= 1;
  renderOnboardingSlide();
}

// Show the welcome once, after the app is unlocked and running.
//
//: An install that has already been through the welcome (`onboardingDone` is
//: set) is not shown it again, and is not shown the tour uninvited either: a
//: card that takes over the screen of somebody who has been using the app for
//: months is the "trapped" failure the tour is written to avoid. It is offered
//: once instead, in a toast with an action, which is the app's existing recipe
//: for "here is something, and here is the one press that takes it". Declining
//: it is silent and permanent: the offer writes `tourDone` either way, so this
//: runs at most once per notebook.
function maybeShowOnboarding() {
  if (!localStorage.getItem("onboardingDone")) {
    openOnboarding();
    return;
  }
  if (localStorage.getItem("tourDone")) return;
  if (typeof openTour !== "function") return;
  if (typeof TOUR_ENABLED !== "undefined" && !TOUR_ENABLED) return;
  localStorage.setItem("tourDone", "1");
  toastAction("There is a guided tour of MemoryMap now.", "Take the tour", () => {
    openTour("basics");
  });
}

$("onboarding-next").addEventListener("click", onboardingNext);
$("onboarding-back").addEventListener("click", onboardingBack);
$("onboarding-skip").addEventListener("click", closeOnboarding);
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
//: The third door into the tour, and it was the one left open (the owner,
//: 2026-09-21: "the take the tour again button in the about settings page
//: isnt disabled"). Same flag, same words as the replay strip's buttons.
//: **After the page has loaded, not now.** `TOUR_ENABLED` is a `const` in
//: tour.js, the last script on the page; at this line that binding does not
//: exist yet, `typeof` says "undefined", and the block below never ran once
//: while it sat here bare: the button stayed live with the flag off, and
//: nothing threw to say so (`tests/test_frontend_load_order.py`, the typeof
//: guard test). `DOMContentLoaded` fires after every classic script has run.
onDomReady(() => {
  if (typeof TOUR_ENABLED !== "undefined" && !TOUR_ENABLED) {
    const aboutTour = $("about-take-tour");
    if (aboutTour) {
      aboutTour.disabled = true;
      aboutTour.title = "The guided tour is being fixed and is turned off for now.";
      aboutTour.setAttribute("aria-label", aboutTour.title);
    }
  }
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

// Keyboard-shortcuts cheat-sheet (press ?), a learnability aid.
// --- rebindable keyboard shortcuts -----------------------------------------------
// The shortcuts used to be hardcoded in the keydown handler, which meant they
// were whatever we'd guessed: no help if one clashes with your OS, your
// browser, or a habit from another app.
//
// Only shortcuts that trigger an *action* are rebindable. Escape (close),
// Tab (move focus) and the arrow keys (move between tabs) deliberately are
// not: they're the conventions every app shares, and letting someone rebind
// Escape is how you end up unable to close the dialog you rebound it in.

const DEFAULT_SHORTCUTS = {
  palette: { keys: "Ctrl+K", label: "Open the command palette" },
  search: { keys: "/", label: "Jump to search (or the chat box on Chat)" },
  // Asked for directly: "add a ctrl+f or equivalent text search... make
  // the find feature available on all tabs." Rebindable like every other
  // chorded shortcut here, which also means it is discoverable in the
  // shortcuts cheat-sheet (?) rather than a secret the app never mentions.
  find: { keys: "Ctrl+F", label: "Find on this page" },
  help: { keys: "?", label: "Show this shortcuts list" },
  newNote: { keys: "Ctrl+Shift+N", label: "Start a new note" },
  newDocument: { keys: "Ctrl+Shift+D", label: "Start a new document" },
  //: WORLD_CLASS_PLAN D6. Opens today's page wherever it is (a note or a
  //: document titled with the day), or starts one in the composer. Not while a
  //: board is open: there `Ctrl+D` is the board's duplicate (INBOX 321), and
  //: the chorded loop in the keydown handler steps aside for it.
  todaysNote: { keys: "Ctrl+D", label: "Open today's note, or start it" },
  // A recording is started the moment a meeting starts, and anything that
  // makes you navigate first is what makes it not get started at all, the
  // reason this is a shortcut as well as a palette entry and a tray item.
  recordMeeting: { keys: "Ctrl+Shift+R", label: "Record a meeting or lecture" },
  // Asked for directly: "add a way to force reload the browser or py web
  // view". A plain F5 keeps the service worker's cache and, in the desktop
  // webview, sometimes the old app.js with it, which is how a fixed button
  // gets reported broken again. This drops every cache first.
  forceReload: { keys: "Ctrl+Alt+R", label: "Reload the app (clearing cached files)" },
  toggleTheme: { keys: "Ctrl+Shift+L", label: "Switch light / dark" },
  undo: { keys: "Ctrl+Z", label: "Undo the last change" },
  redo: { keys: "Ctrl+Shift+Z", label: "Redo" },
  // The selection menu's keyboard door. Without it the whole feature is
  // mouse-only for the actual *opening*, the ⋯ now appears for a Shift+Arrow
  // selection too (`selectionchange` fires for those), but a menu you can see
  // and cannot open is not an improvement.
  selectionActions: { keys: "Ctrl+Shift+E", label: "Actions for the selected text" },
  //: DOCUMENTS_PLAN 18c. The "/" menu had exactly one way in, typing "/",
  //: which you had to already know about. Here it is rebindable like the rest
  //: and, more to the point, it is in the cheat sheet, which is where somebody
  //: looks for what an app can do. The other two ways are the placeholder on
  //: every editing surface and the menu itself (editor.js).
  editorMenu: { keys: "Ctrl+/", label: "Blocks and commands, where you are writing" },
  // --- added when the section was expanded (reported: "expand the keyboard
  // shortcuts section in settings") ---------------------------------------
  //
  // Every one of these was already a thing the app does and a thing people do
  // repeatedly; none of them had a key. The bar for adding one is that it
  // saves a *navigation*, not a click, a shortcut that only replaces a button
  // already on the screen you are looking at earns nothing and spends a combo.
  save: { keys: "Ctrl+S", label: "Save the note or document you're editing" },
  newChat: { keys: "Ctrl+Shift+O", label: "Start a new chat" },
  stopAI: { keys: "Ctrl+.", label: "Stop the answer being written" },
  agentMode: { keys: "Ctrl+Shift+G", label: "Turn agent mode on or off" },
  quickSketch: { keys: "Ctrl+Shift+K", label: "Open the quick sketch pad" },
  // **The agent bar's chord, declared here rather than bound loose.** It was
  // moved off Ctrl+K once already, to settle a collision with the navigation
  // palette: onto Ctrl+Shift+K, which `quickSketch` above had held all
  // along, so the fix swapped one silent collision for another and the sketch
  // pad and the agent bar both opened on one press (reported). The cause both
  // times was the same: this chord lived in a `document.addEventListener` of
  // its own, where nothing could see it. In the registry it is checked against
  // every other chord by `test_frontend_shortcuts.py`, appears in the
  // shortcuts help, and can be rebound like all the rest.
  askAgent: { keys: "Ctrl+Shift+A", label: "Ask the agent anything" },
  //: Beside the agent's own chord, because they are the pair: one does things
  //: to your notes and the other explains the app. In the registry rather than
  //: bound loose, which is what puts it in the shortcuts sheet (INBOX 224's
  //: "the keyboard shortcut is listed in the shortcuts sheet": the sheet is
  //: built from this table, so listing it and declaring it are one act).
  askAtlas: { keys: "Ctrl+Shift+H", label: "Ask Atlas about the app" },
  //: **The universal search.** In the registry, not bound loose, for the
  //: reason `askAgent` above records at length: a chord in a listener of its
  //: own is invisible to `test_frontend_shortcuts.py` and to the shortcuts
  //: sheet, which is how two surfaces came to share one chord twice. Ctrl+P
  //: rather than Ctrl+K (the navigation palette) or Ctrl+F (find on this
  //: page): it is the chord every editor uses for "go to anything", and it
  //: was free.
  findAnything: { keys: "Ctrl+P", label: "Find anything: notes, files, actions" },
  whiteboard: { keys: "Ctrl+Shift+B", label: "Open the whiteboard" },
  settings: { keys: "Ctrl+,", label: "Open settings" },
  attachNote: { keys: "Ctrl+Shift+P", label: "Clip a note to your next question" },
  // The status bar's own Back/Forward buttons (`stepTabHistory`) were
  // click-only: asked for directly. Alt+Left/Right rather than the bare
  // arrow keys: those are needed everywhere text is edited or a list is
  // navigated, and a modifier is what every browser already uses for this
  // exact action, so it costs no muscle memory to learn.
  //: **The inline AI's chord.** Not Ctrl+K (the command palette) and not
  //: Ctrl+I (italic, in every editing surface here), the two chords every
  //: other app uses for this. Ctrl+J was free, and this is declared in the
  //: registry rather than bound loose for the reason `askAgent` records above:
  //: a chord in a listener of its own is invisible to
  //: `test_frontend_shortcuts.py`'s collision check and to the shortcuts help.
  inlineAi: { keys: "Ctrl+J", label: "Ask Atlas to write at the cursor" },
  navigateBack: { keys: "Alt+ArrowLeft", label: "Go back to the previous page or view" },
  navigateForward: { keys: "Alt+ArrowRight", label: "Go forward again" },
};

const SHORTCUT_STORE = "keyboardShortcuts";

function loadShortcuts() {
  let saved = {};
  try {
    saved = JSON.parse(localStorage.getItem(SHORTCUT_STORE) || "{}");
  } catch {
    saved = {}; // unreadable: fall back to defaults rather than throwing
  }
  const merged = {};
  for (const [id, def] of Object.entries(DEFAULT_SHORTCUTS)) {
    merged[id] = { ...def, keys: saved[id] || def.keys };
  }
  return merged;
}

let shortcuts = loadShortcuts();

//: **A button says its key.** Measured: of the buttons that have a chord in
//: this registry (New note, New document, New chat, Settings, light and
//: dark), none said so in its tooltip, so the chord could only be learned
//: from the shortcuts sheet. The tooltip is where people look while their
//: hand is already on the mouse. Stamped from the registry, the current
//: binding rather than the default, and again whenever a binding changes;
//: `aria-keyshortcuts` says the same to a screen reader.
const SHORTCUT_BUTTONS = {
  "notes-new-note": "newNote",
  "library-docs-new": "newDocument",
  "chat-new": "newChat",
  "settings-btn": "settings",
  "theme-btn": "toggleTheme",
};

function stampShortcutTitles() {
  for (const [id, key] of Object.entries(SHORTCUT_BUTTONS)) {
    const button = document.getElementById(id);
    const combo = shortcuts[key]?.keys;
    if (!button || !combo) continue;
    if (button.dataset.titleBase === undefined) button.dataset.titleBase = button.title || "";
    const base = button.dataset.titleBase;
    button.title = base ? `${base} (${combo})` : combo;
    button.setAttribute("aria-keyshortcuts", combo.replace(/\bCtrl\b/g, "Control"));
  }
}
stampShortcutTitles();
// Sets the status-bar Undo/Redo buttons' icons and "nothing to undo yet"
// tooltips on load: both stacks are empty at this point, so this only
// establishes the disabled state the HTML already carries, not a real render.
renderUndoBar();

// "m" then a letter jumps tabs (m for MemoryMap), GitHub and Gmail's own "go to" chord, and
// the reason it isn't in DEFAULT_SHORTCUTS/rebindable above: a chord needs
// somewhere to hold the first keypress while it waits for the second, and
// that's state this file has to own regardless, so it lives beside the
// other keys-every-app-shares (Escape, Tab, arrows) rather than pretending
// it is a single rebindable key like the rest of the list.
const TAB_JUMP_KEYS = {
  d: "dashboard",
  n: "notes",
  c: "chat",
  g: "graph",
  l: "library",
  t: "timeline",
  r: "reminders",
};
//: The other half of the same chord: three things you *do* rather than three
//: places you go. Asked for by the owner: "also add a shortcut for 'm' + 's'
//: for opening up settings, maybe 'm' + 'q' for quick sketch?? maybe 'm' +
//: 'm' or 'v' (for voice) for meeting notes or smth??"
//:
//: `v`, not `m`: `m` as the second key would mean the chord's own first key
//: repeated, which is what a person presses when they are not sure the first
//: press registered. Making that open a recorder is the one mapping in the
//: set that could surprise someone twice in a row.
//:
//: These are declared beside `TAB_JUMP_KEYS` rather than in `shortcuts`,
//: because the chord's second key is not a rebindable accelerator: it is a
//: menu of ten entries the guide draws from these two tables, so a new entry
//: here appears in the guide with no other change.
const CHORD_ACTIONS = {
  s: { label: "Settings", run: () => openSettingsModal() },
  q: { label: "Quick sketch", run: () => openSketch() },
  v: { label: "Meeting notes", run: () => openMeetingRecorder() },
  //: The two assistants (INBOX 249, the owner: "is there a hotkey ot keybind,
  //: as well as an 'm' key navigation to open the atlas window and popup
  //: agent??"). Ctrl+Shift+A and Ctrl+Shift+H are theirs in the registry
  //: above; these are the chord's spellings of the same two.
  //: Named for what it opens, the Guide (the owner: "the option for atlas
  //: leads to the guide, I think it should be called guide instead"),
  //: the same word the status bar's button uses. The key stays `a`.
  a: { label: "Guide", run: () => askAtlasAbout("") },
  p: { label: "Popup agent", run: () => toggleAgentPalette() },
};
const TAB_JUMP_WINDOW_MS = 900;
let tabJumpArmedAt = 0;

//: Whatever is currently on top, dismissed so a resolved chord lands on the
//: surface it asked for rather than behind a modal that still holds the
//: keyboard. Each close is guarded by its own "is it open" test, so this is
//: a no-op in the ordinary case where the chord was pressed with nothing
//: over the page. `closeSketch` is async (it saves first); it is not awaited
//: because the tab switch that follows does not depend on the save landing.
function closeOverlaysForChord() {
  if (settingsModalOpen()) closeSettingsModal();
  const palette = document.getElementById("palette-overlay");
  if (palette && !palette.classList.contains("hidden")) closePalette();
  const sketch = document.getElementById("sketch-overlay");
  if (sketch && !sketch.classList.contains("hidden")) closeSketch();
  //: Atlas's sheet, when it is open (settings.js owns the closer).
  if (typeof helpChatSheetClose === "function") helpChatSheetClose();
}

//: **The chord's guide, and why it is not a toast any more.** Reported with a
//: screenshot: "when I press 'm' for the quick nav, the popup notification is
//: broken visually. also I want it to be more of a whole screen subtle but
//: noticable guide like with the zoom visual thingo."
//:
//: Both halves of that were right. It was a `.toast`, which is a corner
//: notification sized for one sentence, and ten key-and-label pairs laid in a
//: row inside one wrapped mid-pair, so "m" and "then" broke onto separate
//: lines beside the chips. And a toast is the wrong *kind* of thing: a
//: notification is something that happened, while this is the app waiting for
//: your next keystroke, which is a mode. The zoom readout (`hud()`) is the
//: shape the owner pointed at, so this is that shape at the size the content
//: needs: centred, over a scrim that dims the page enough to say "the next key
//: means something", gone the moment the chord resolves or lapses.
//:
//: **Interactive, since 2026-09-13, and that reverses a decision this comment
//: used to state.** It read: "Not interactive, and deliberately so:
//: `pointer-events: none` throughout, because a guide that can eat the click
//: you were about to make is worse than no guide." The reasoning was about a
//: guide that appears *beside* your work; this one dims the page and takes the
//: next keystroke, so there is no click it could steal that was meant for
//: anything else. The owner, looking at it: "also make these popup options
//: when I press m, actual clickable nav buttons".
//:
//: They read as buttons because they are shaped like them, which is the real
//: argument: a pill with a label and a key chip in it is a control, and one
//: that ignores the pointer is a control that is broken. The keys still work
//: exactly as they did, and each row now carries the same action its key
//: fires, from the same two tables, so the two ways in cannot drift.
//:
//: The scrim stays click-through-to-close: a click that lands on the dimmed
//: page rather than on a row means "not this", which is what Escape and a
//: second `m` already mean. `role="status"` and `aria-live` stay, so a screen
//: reader hears the chord's targets; the rows are real buttons, so it can also
//: reach them.
let chordGuideTimer = null;

function chordGuideEl() {
  let guide = document.getElementById("chord-guide");
  if (!guide) {
    guide = document.createElement("div");
    guide.id = "chord-guide";
    guide.className = "chord-guide hidden";
    guide.setAttribute("role", "status");
    guide.setAttribute("aria-live", "polite");
    document.body.appendChild(guide);
  }
  return guide;
}

//: `entries` is `[key, label, run]`. The `run` comes from the same two tables
//: the keyboard reads (`TAB_JUMP_KEYS`, `CHORD_ACTIONS`), so a row and its key
//: are two doors onto one action rather than two copies of one.
function chordGuideGroup(title, entries) {
  const group = document.createElement("div");
  group.className = "chord-guide-group";
  const heading = document.createElement("p");
  heading.className = "chord-guide-title";
  heading.textContent = title;
  group.appendChild(heading);
  const list = document.createElement("div");
  list.className = "chord-guide-list";
  for (const [key, label, run] of entries) {
    const row = document.createElement("button");
    row.type = "button";
    row.className = "chord-guide-row";
    row.title = `${label} (m then ${key})`;
    const kbd = document.createElement("kbd");
    kbd.textContent = key;
    const name = document.createElement("span");
    name.textContent = label;
    row.append(kbd, name);
    row.addEventListener("click", () => {
      //: Disarmed first: the chord has been answered, and leaving it armed
      //: would make the next letter you type navigate somewhere.
      tabJumpArmedAt = 0;
      hideChordGuide();
      //: The same two lines the keyboard branch runs, in the same order:
      //: leaving for somewhere else means leaving whatever is over the page,
      //: or the destination lands behind a modal that still holds focus.
      closeOverlaysForChord();
      run();
    });
    list.appendChild(row);
  }
  group.appendChild(list);
  return group;
}

function hideChordGuide() {
  const guide = document.getElementById("chord-guide");
  if (!guide) return;
  window.clearTimeout(chordGuideTimer);
  guide.classList.add("hidden");
}

function showTabJumpHint() {
  const guide = chordGuideEl();
  const lead = document.createElement("p");
  lead.className = "chord-guide-lead";
  const kbd = document.createElement("kbd");
  kbd.textContent = "m";
  //: "m, then a key" on the left and the way out on the right: the panel's
  //: head says what it is waiting for, the rows below are the answers.
  const leadText = document.createElement("span");
  leadText.textContent = "then a key";
  const leadEsc = document.createElement("span");
  leadEsc.className = "chord-guide-esc";
  const escKey = document.createElement("kbd");
  escKey.textContent = "Esc";
  leadEsc.append(escKey, " or m to close");
  lead.append(kbd, leadText, leadEsc);
  //: **Stays up until you dismiss it, not for a fixed 900ms.** Asked for
  //: directly: "if i hold it down the popup stays up and I can more easily
  //: navigate by reading the popup contents", refined a moment later to
  //: "press m again to close it or an x close button to close it" (holding
  //: a key sends repeated keydowns with no matching keyup this file
  //: listens for, so a true hold-to-stay-open would need a new keyup
  //: handler; a toggle needs none). `.lightbox-close` is the app's one
  //: "circular x in the corner of a full-screen dark overlay" recipe
  //: (the image viewer), reused rather than invented again; `chord-guide`'s
  //: own `pointer-events: none` is what the second class undoes for this
  //: one child.
  const close = document.createElement("button");
  close.type = "button";
  close.className = "lightbox-close chord-guide-close";
  close.setAttribute("aria-label", "Close");
  setLabel(close, "ph:x");
  close.addEventListener("click", () => {
    tabJumpArmedAt = 0;
    hideChordGuide();
  });
  //: **One panel, not pills scattered over the page** (the owner's
  //: screenshot, 2026-09-23 night: fourteen glowing pills drawn straight
  //: over the dashboard's own text, which read through them, because the
  //: flat looks turn the blur off and a 55% scrim alone does not separate
  //: two layers of text). The lead and both groups sit on one opaque panel,
  //: the command palette's shape, and the rows are plain key-and-label rows.
  const panel = document.createElement("div");
  panel.className = "chord-guide-panel";
  guide.replaceChildren(close, panel);
  panel.append(
    lead,
    chordGuideGroup(
      "Go to",
      Object.entries(TAB_JUMP_KEYS).map(([key, tab]) => [
        key,
        tab[0].toUpperCase() + tab.slice(1),
        () => switchTab(tab),
      ])
    ),
    chordGuideGroup(
      "Do",
      Object.entries(CHORD_ACTIONS).map(([key, action]) => [key, action.label, action.run])
    )
  );
  guide.classList.remove("hidden");
}

function saveShortcutOverrides() {
  // Only store what differs from the defaults, so improving a default later
  // reaches everyone who never changed it.
  const overrides = {};
  for (const [id, def] of Object.entries(DEFAULT_SHORTCUTS)) {
    if (shortcuts[id].keys !== def.keys) overrides[id] = shortcuts[id].keys;
  }
  localStorage.setItem(SHORTCUT_STORE, JSON.stringify(overrides));
  stampShortcutTitles();
}

// A keyboard event -> the canonical string we compare against, e.g. "Ctrl+K".
function comboFromEvent(event) {
  const parts = [];
  if (event.ctrlKey || event.metaKey) parts.push("Ctrl");
  if (event.altKey) parts.push("Alt");
  if (event.shiftKey) parts.push("Shift");
  let key = event.key;
  if (key === " ") key = "Space";
  // Single letters normalise to uppercase so "Ctrl+k" and "Ctrl+K" are one
  // shortcut; longer names (Enter, ArrowUp) keep their own capitalisation.
  if (key.length === 1) key = key.toUpperCase();
  // A bare modifier isn't a shortcut yet, the user is still mid-chord.
  if (["Control", "Meta", "Alt", "Shift"].includes(event.key)) return null;
  parts.push(key);
  return parts.join("+");
}

// "?" is Shift+/ on most layouts; treat the typed character as the shortcut so
// a user who binds "?" doesn't have to know that.
function matchesShortcut(event, combo) {
  if (comboFromEvent(event) === combo) return true;
  return combo.length === 1 && event.key === combo && !event.ctrlKey && !event.metaKey;
}

function runShortcut(id) {
  const actions = {
    //: Handed to editor.js, which owns the menu and knows which surfaces have
    //: one. It answers false when nothing editable has focus, and then this
    //: does nothing rather than inserting a slash into whatever is there.
    editorMenu: () => {
      if (typeof editorOpenMenuByShortcut === "function") editorOpenMenuByShortcut();
    },
    palette: () => {
      if ($("palette-overlay").classList.contains("hidden")) openPalette();
      else closePalette();
    },
    findAnything: () => {
      const overlay = document.getElementById("finder-overlay");
      if (overlay && overlay.classList.contains("hidden")) openFinder();
      else closeFinder();
    },
    search: () => {
      if (localStorage.getItem("activeTab") === "chat") {
        $("chat-input").focus();
      } else {
        switchTab("notes");
        $("note-search").focus();
      }
    },
    help: openShortcuts,
    newNote: () => {
      switchTab("notes");
      $("entry-content").focus();
    },
    newDocument: () => {
      switchTab("documents");
      createDocument();
    },
    todaysNote: () => openTodaysPage(),
    recordMeeting: openMeetingRecorder,
    forceReload: forceReloadApp,
    toggleTheme,
    undo: performUndo,
    redo: performRedo,
    selectionActions: openSelectionMenuFromKeyboard,
    // Ctrl+S means "save what I am editing", and which editor that is depends
    // on the tab. Documents already autosave, so there it is an explicit
    // checkpoint rather than the only way the text survives.
    //: `saveWhatIsInFront` rather than this two-line dispatch. It knew about
    //: Documents and Capture only, so with the Settings modal open Ctrl+S ran
    //: `saveEntry()` on the note composer behind it, and the settings-aware
    //: code written for INBOX 74 sat unreachable further down the same keydown
    //: handler. See that function for the measurement.
    save: () => saveWhatIsInFront(),
    // Same "which surface depends on the tab" dispatch as `save` above.
    // The Documents tab keeps its own, more capable find-and-replace
    // (`#doc-find-bar`), it can see inside the editor's own textarea,
    // which no generic DOM search can. Everywhere else opens the global
    // one below, scoped to whichever tab-page is currently visible.
    find: () => {
      if (localStorage.getItem("activeTab") === "documents") toggleDocFindBar(true);
      else openGlobalFind();
    },
    //: Acts on whichever editing surface has focus, which is the only sane
    //: reading of "write here": the document textarea, or one live-view
    //: paragraph. `inlineAiOpen` refuses (with a toast) anywhere else rather
    //: than opening a bar whose submit could not work.
    inlineAi: () => {
      const active = document.activeElement;
      if (typeof inlineAiOpen === "function" && active instanceof HTMLTextAreaElement) {
        inlineAiOpen(active);
      }
    },
    newChat: () => {
      switchTab("chat");
      newChatConversation();
      $("chat-input")?.focus();
    },
    // The one shortcut whose whole value is being reachable in a hurry: a
    // local model three minutes into the wrong answer is the moment nobody
    // wants to go looking for a button.
    stopAI: () => chatController?.abort(),
    agentMode: () => {
      switchTab("chat");
      const toggle = $("tools-toggle");
      if (!toggle) return;
      toggle.checked = !toggle.checked;
      toggle.dispatchEvent(new Event("change", { bubbles: true }));
    },
    quickSketch: openSketch,
    askAgent: toggleAgentPalette,
    askAtlas: () => askAtlasAbout(""),
    whiteboard: () => switchTab("whiteboard"),
    settings: () => openSettingsModal(),
    attachNote: () => {
      switchTab("chat");
      openNotePicker();
    },
    // Same call the status bar's own Back/Forward buttons already make.
    navigateBack: () => stepTabHistory(-1),
    navigateForward: () => stepTabHistory(1),
  };
  actions[id]?.();
}

function resetShortcuts() {
  localStorage.removeItem(SHORTCUT_STORE);
  shortcuts = loadShortcuts();
  renderShortcutList();
  toast("Shortcuts reset to their defaults.");
}

let capturingShortcut = null; // the id being rebound, or null

// The same list is mounted twice, in the ? overlay and in Settings →
// Keyboard shortcuts. Rendering both from one function is what keeps them
// from drifting apart; two copies of this logic is how one of them goes stale.
const SHORTCUT_LIST_IDS = ["shortcut-list", "shortcut-list-settings"];
const SHORTCUT_STATUS_IDS = ["shortcut-status", "shortcut-status-settings"];

function setShortcutStatus(text) {
  for (const id of SHORTCUT_STATUS_IDS) {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
  }
}

function setShortcutStatusError(isError) {
  for (const id of SHORTCUT_STATUS_IDS) {
    document.getElementById(id)?.classList.toggle("error", isError);
  }
}

function renderShortcutList() {
  for (const listId of SHORTCUT_LIST_IDS) {
    const list = document.getElementById(listId);
    if (list) buildShortcutList(list);
  }
}

function buildShortcutList(list) {
  list.replaceChildren();
  for (const [id, def] of Object.entries(shortcuts)) {
    const li = document.createElement("li");
    const combo = document.createElement("kbd");
    combo.textContent = capturingShortcut === id ? "Press keys…" : def.keys;
    if (capturingShortcut === id) combo.classList.add("capturing");

    const label = document.createElement("span");
    label.textContent = def.label;

    const change = document.createElement("button");
    change.className = "ghost small";
    change.type = "button";
    change.textContent = capturingShortcut === id ? "Cancel" : "Change";
    change.setAttribute("aria-label", `Change the shortcut for: ${def.label}`);
    change.addEventListener("click", () => {
      capturingShortcut = capturingShortcut === id ? null : id;
      setShortcutStatus(
        capturingShortcut ? "Press the keys you want, or Escape to cancel." : ""
      );
      renderShortcutList();
    });

    // Only offer "default" when it isn't already the default.
    const changed = def.keys !== DEFAULT_SHORTCUTS[id].keys;
    li.append(combo, label, change);
    if (changed) {
      const revert = document.createElement("button");
      revert.className = "ghost small";
      revert.type = "button";
      setLabel(revert, "ph:arrow-counter-clockwise");
      revert.title = `Back to ${DEFAULT_SHORTCUTS[id].keys}`;
      revert.setAttribute("aria-label", revert.title);
      revert.addEventListener("click", () => {
        shortcuts[id].keys = DEFAULT_SHORTCUTS[id].keys;
        saveShortcutOverrides();
        renderShortcutList();
      });
      li.appendChild(revert);
    }
    list.appendChild(li);
  }
}

// While rebinding, this handler runs before everything else and swallows the
// keypress: otherwise pressing Ctrl+K to rebind it would also open the
// palette you're trying to move.
function captureShortcutKey(event) {
  if (!capturingShortcut) return false;
  if (event.key === "Escape") {
    capturingShortcut = null;
    setShortcutStatus("");
    renderShortcutList();
    return true;
  }
  const combo = comboFromEvent(event);
  if (!combo) return true; // still holding modifiers

  const clash = Object.entries(shortcuts).find(
    ([otherId, def]) => otherId !== capturingShortcut && def.keys === combo
  );
  if (clash) {
    // Refuse rather than silently stealing it, two actions on one key means
    // one of them quietly stops working.
    setShortcutStatusError(true);
    setShortcutStatus(`${combo} is already used for "${clash[1].label}".`);
    return true;
  }
  shortcuts[capturingShortcut].keys = combo;
  saveShortcutOverrides();
  capturingShortcut = null;
  setShortcutStatusError(false);
  setShortcutStatus(`Set to ${combo}.`);
  renderShortcutList();
  return true;
}

function openShortcuts() {
  capturingShortcut = null;
  setShortcutStatus("");
  renderShortcutList();
  //: **The editor's rows come from the editor's own table**
  //: (DOCUMENTS_PLAN Phase 4 item 4: "a `?` shortcut sheet generated from the
  //: same table so the two cannot disagree"). documents.js is lazily loaded,
  //: so the section says where its contents are rather than sitting empty
  //: when this dialog is opened before that bundle has ever been fetched.
  const editorList = $("shortcut-list-documents");
  const editorNote = $("shortcut-list-documents-note");
  if (editorList && typeof renderDocShortcutSheet === "function") {
    renderDocShortcutSheet(editorList);
    editorNote?.classList.add("hidden");
  } else if (editorNote) {
    editorNote.classList.remove("hidden");
  }
  $("shortcuts-overlay").classList.remove("hidden");
  $("shortcuts-close").focus();
}
function closeShortcuts() {
  // Stop listening for a rebind. Without this, closing the dialog mid-capture
  // leaves the handler swallowing every keypress in the app, the shortcut you
  // just set appears dead, and so does everything else.
  capturingShortcut = null;
  $("shortcuts-overlay").classList.add("hidden");
}

$("shortcuts-close").addEventListener("click", closeShortcuts);
wireBackdropClose($("shortcuts-overlay"), () => closeShortcuts());

document.addEventListener("keydown", (e) => {
  if (e.key !== "Tab") return;
  const overlay = activeOverlay();
  if (!overlay) return;
  // `[tabindex]` and `[contenteditable]` were missing, and both are real
  // omissions rather than tidiness: an element made focusable with
  // `tabIndex = 0` is focusable to the browser and invisible to this filter,
  // so Tab would step onto it and the trap would not know where it was, the
  // graph canvas (`graph.js` sets `tabIndex = 0` on `#graph-box`) is exactly
  // that shape. `tabindex="-1"` is excluded on purpose: it means
  // programmatically focusable but *not* in the tab order, so including it
  // would invent stops the user never asked for.
  const focusables = [
    ...overlay.querySelectorAll(
      'button, [href], input, select, textarea, [contenteditable=""], ' +
        '[contenteditable="true"], [tabindex]:not([tabindex="-1"])'
    ),
  ].filter((el) => !el.disabled && el.offsetParent !== null);
  if (!focusables.length) return;
  const first = focusables[0];
  const last = focusables[focusables.length - 1];
  const outside = !overlay.contains(document.activeElement);
  if (e.shiftKey && (document.activeElement === first || outside)) {
    e.preventDefault();
    last.focus();
  } else if (!e.shiftKey && (document.activeElement === last || outside)) {
    e.preventDefault();
    first.focus();
  }
});

// --- Wave F wiring ------------------------------------------------------------------

// Wave J: note search + sort, capture char count.
// Debounced (150ms, same as Library/Timeline/Graph search): this box was the
// one search input in the app with no debounce, so every keystroke tore down
// and rebuilt the whole visible note list, and with semantic search on, also
// fired a backend embedding-compare request per character typed.
let noteSearchDebounceTimeout;
$("note-search").addEventListener("input", (e) => {
  noteSearch = e.target.value.trim();
  // Nothing to save when the box is empty; the button appears when it isn't.
  // Cheap, so it stays immediate rather than waiting on the debounce below.
  $("save-search").classList.toggle("hidden", !noteSearch);
  clearTimeout(noteSearchDebounceTimeout);
  noteSearchDebounceTimeout = setTimeout(() => {
    if ($("semantic-search-toggle")?.checked) loadEntries(); // trigger semantic backend search
    renderEntries();
    // After the list is on screen, never before it: the reasons are an
    // annotation on a list that is already correct, and waiting for a
    // round trip to show any notes at all would undo the debounce's point.
    refreshNoteSearchWhy();
  }, 150);
});
//: The fading order, fetched once per sort rather than per render. Empty
//: until "Forgotten first" is chosen, so nothing pays for it otherwise, and
//: on a notebook under ten notes the server answers with an empty list by
//: design (`resurface.MIN_NOTEBOOK`), which leaves the list in id order and
//: is the honest answer at that size.
let forgottenOrder = new Map();

async function loadForgottenOrder() {
  try {
    const body = await apiJson("/resurface/all?limit=500", { silent: true, cacheMs: 60000 });
    forgottenOrder = new Map((body.items || []).map((item, index) => [item.id, index]));
  } catch (error) {
    forgottenOrder = new Map();
  }
}

$("note-sort").addEventListener("change", async (e) => {
  noteSort = e.target.value;
  notesCurrentPage = 1; // a re-sort can move a note off whatever page it was on
  //: Awaited before the render, not alongside it: painting the list in id
  //: order and re-sorting it a moment later is a list that jumps under the
  //: hand of whoever just chose the sort.
  if (noteSort === "forgotten") await loadForgottenOrder();
  renderEntries();
});
$("notes-page-size").value = notesPageSize;
$("notes-page-size").addEventListener("change", (e) => {
  notesPageSize = e.target.value;
  localStorage.setItem("notes-page-size", notesPageSize);
  notesCurrentPage = 1;
  renderEntries();
});
$("notes-page-prev").addEventListener("click", () => {
  if (notesCurrentPage <= 1) return;
  notesCurrentPage -= 1;
  renderEntries();
  $("entries-heading").scrollIntoView({ block: "start", behavior: "smooth" });
});
$("notes-page-next").addEventListener("click", () => {
  notesCurrentPage += 1; // clamped back down inside renderEntries if this overshoots
  renderEntries();
  $("entries-heading").scrollIntoView({ block: "start", behavior: "smooth" });
});
// Reported directly: an image just pasted/dropped/attached only shows as
// raw `![name](/media/hash.ext)` text in the plain <textarea>, which reads
// as "the image isn't rendered", and there was no way to remove one short of
// hand-editing the markdown. Parses every image reference currently in the
// box and renders a real thumbnail per one, each with its own ✕ that strips
// just that reference back out of the text (the upload itself is untouched,
// same as deleting any other line of text doesn't delete a file).
// Shared by every attachment-chip action below that needs the real upload
// row (id, caption) behind a markdown `/media/...` url: `GET /media`
// isn't filterable by url, so this is one list-and-find rather than each
// caller repeating it. Not cached: called only on a real user action
// (caption, edit, remove), never on the per-keystroke render this chip
// strip runs under.
async function resolveMediaUploadByUrl(url) {
  //: To the end: this resolves one url to its upload row, and an upload past
  //: the first page would simply not resolve.
  const uploads = await apiPagedList("/media", 200);
  return uploads.find((u) => u.url === url) || null;
}

//: The capture box's attachment cards, reusable by any editing surface, 
//: the note *edit* form had none, so an image, sketch or file attached to a
//: note could not be seen, renamed or removed while editing it (reported).
//: The pattern now also matches a plain link to `/media` or `/files`, which
//: is how a non-image attachment is written into a note.
//: Ids or elements: the note edit form builds its host and its textarea and
//: calls this *before* the row is in the document, so a `getElementById`
//: lookup would find neither (measured: zero chips on a note that has one).
function renderEntryAttachmentChips(boxId = "entry-content", hostId = "entry-attachment-chips") {
  const box = hostId instanceof HTMLElement ? hostId : $(hostId);
  const textarea = boxId instanceof HTMLElement ? boxId : $(boxId);
  if (!box || !textarea) return;
  const pattern = /!?\[([^\]]{0,200})\]\(((?:\/media|\/files)\/[^)\s]{1,500})\)/g;
  const matches = [...textarea.value.matchAll(pattern)];
  box.replaceChildren();
  box.classList.toggle("hidden", matches.length === 0);
  for (const match of matches) {
    const [full, name, url] = match;
    const chip = document.createElement("span");
    chip.className = "chip attachment-chip attachment-chip-image";
    const isImage = full.startsWith("!") || /\.(png|jpe?g|gif|webp|bmp|svg|avif)$/i.test(url);
    const img = document.createElement(isImage ? "img" : "i");
    if (isImage) {
      img.src = mediaSrc(url);
      img.alt = name;
      img.loading = "lazy";
      img.addEventListener("click", () =>
        openLightbox([{ filename: name, getUrl: () => mediaSrc(url) }], 0)
      );
    } else {
      img.className = attachmentIconClass(url, name);
      img.setAttribute("aria-hidden", "true");
    }
    const label = document.createElement("span");
    label.textContent = name || url;
    label.title = name || url;
    // Vision-capable models: manual caption generation "on notes in the
    // notes page", asked for directly, alongside the same control already
    // built into the Library's Image Gallery. Resolved to an id lazily on
    // click, the same way `remove` below already does: this render runs on
    // every keystroke, so an eager /media fetch per chip is not worth
    // paying for a caption most of these images will never need.
    const captionBtn = document.createElement("button");
    captionBtn.className = "ghost small icon-only entry-attachment-caption-btn";
    captionBtn.type = "button";
    setLabel(captionBtn, "ph:sparkle");
    captionBtn.title = `Generate an AI caption for "${name || url}"`;
    captionBtn.setAttribute("aria-label", captionBtn.title);
    captionBtn.addEventListener("click", async () => {
      captionBtn.disabled = true;
      try {
        const match = await resolveMediaUploadByUrl(url);
        if (!match) {
          toast("Couldn't find that upload.", true);
          return;
        }
        const updated = await apiJson(`/media/${match.id}/caption`, {
          method: "POST",
          body: JSON.stringify({ force: true }),
        });
        toast(updated.caption ? `Caption: ${updated.caption}` : "No caption produced.");
      } catch (error) {
        toast(error.message || "Couldn't generate a caption.", true);
      } finally {
        captionBtn.disabled = false;
      }
    });
    // Manual entry, asked for directly ("allow for manual input of image
    // captions as well as" the AI-generate button above). `promptDialog` is
    // the same custom text-entry modal the app already uses elsewhere (the
    // "Title for the new document" dialog is the other example), kept
    // deliberately separate from the sparkle button rather than merged into
    // one control, matching the Library gallery's own click-the-text-vs-
    // click-the-button split for the same two actions.
    const editCaptionBtn = document.createElement("button");
    editCaptionBtn.className = "ghost small icon-only entry-attachment-caption-edit-btn";
    editCaptionBtn.type = "button";
    setLabel(editCaptionBtn, "ph:pencil-simple");
    editCaptionBtn.title = `Type a caption for "${name || url}"`;
    editCaptionBtn.setAttribute("aria-label", editCaptionBtn.title);
    editCaptionBtn.addEventListener("click", async () => {
      editCaptionBtn.disabled = true;
      try {
        const match = await resolveMediaUploadByUrl(url);
        if (!match) {
          toast("Couldn't find that upload.", true);
          return;
        }
        const typed = await promptDialog(
          `Caption for "${name || url}"`,
          match.caption || "",
          { confirmLabel: "Save" }
        );
        // promptDialog resolves "" for both "cancelled" and "cleared the
        // field on purpose", an already-blank caption makes that
        // ambiguity harmless (there's nothing to lose either way), so no
        // "did you mean to clear it?" check is needed here.
        if (typed === "" && !match.caption) return;
        const updated = await apiJson(`/media/${match.id}/caption`, {
          method: "POST",
          body: JSON.stringify({ text: typed }),
        });
        toast(updated.caption ? `Caption saved: ${updated.caption}` : "Caption cleared.");
      } catch (error) {
        toast(error.message || "Couldn't save that caption.", true);
      } finally {
        editCaptionBtn.disabled = false;
      }
    });
    const remove = document.createElement("button");
    remove.className = "attachment-remove";
    remove.type = "button";
    setLabel(remove, "ph:x");
    remove.title = `Remove "${name || url}" from this note`;
    remove.setAttribute("aria-label", remove.title);
    remove.addEventListener("click", async () => {
      textarea.value = textarea.value.replace(full, "").replace(/\n{3,}/g, "\n\n");
      textarea.dispatchEvent(new Event("input", { bubbles: true }));
      // Asked for directly: removing it here should delete the underlying
      // upload too, not just detach the markdown reference, a note being
      // drafted (never saved, so nothing else could reference this image
      // yet) is exactly the case where leaving an orphan file behind in
      // data/media serves no one. `/media` isn't filterable by url, so this
      // resolves the id by listing and matching, one request, only when a
      // chip is actually removed, not on every render.
      try {
        const match = await resolveMediaUploadByUrl(url);
        if (match) await apiJson(`/media/${match.id}`, { method: "DELETE" });
      } catch (err) {
        console.error("Couldn't delete the underlying upload", err);
      }
    });
    // .attachment-chip-image lays its children out in a column (the image
    // stacked over its caption), so two sibling buttons would stack full-
    // height rather than sit side by side, a small row keeps them paired.
    const chipActions = document.createElement("span");
    chipActions.className = "row entry-attachment-chip-actions";
    chipActions.append(captionBtn, editCaptionBtn, remove);
    chip.append(img, label, chipActions);
    box.appendChild(chip);
  }
  renderCaptureFiles();
}

/** The strip above, for files that are not images.
 *
 * The chip strip it sits under only ever matched image syntax
 * (`![name](/media/…)`), because it was written to show thumbnails. A PDF
 * or a spreadsheet is inserted with *link* syntax (`[name](/media/…)`) by
 * `handleFileUpload`, so it matched nothing and the composer showed no sign
 * a file had been attached at all, reported directly: "when I uplaod pdfs
 * to a note, they are in pure md with no visual card allowing me to delete
 * the files."
 *
 * Rendered *from the note's own text* rather than from a separate staging
 * list, and that is the design rather than an economy. The markdown is
 * where the attachment actually lives, it is what gets saved, what the AI
 * reads, and what survives an export. A parallel list of "staged files"
 * would be a second source of truth that a single edit to the textarea
 * could put out of sync, and removing a card would have to reconcile the
 * two. Here, removing a card *is* deleting that line, which is the only
 * thing removal could honestly mean.
 */
function renderCaptureFiles() {
  const strip = $("entry-file-strip");
  const textarea = $("entry-content");
  if (!strip || !textarea) return;
  // Link syntax only. The negative lookbehind is what keeps images out:
  // `![x](/media/y.png)` also ends in `[x](/media/y.png)`, so without it
  // every image would appear twice, once as a thumbnail chip and once here.
  const pattern = /(?<!!)\[([^\]]{0,200})\]\((\/media\/[^)\s]{1,500})\)/g;
  const matches = [...textarea.value.matchAll(pattern)];
  strip.replaceChildren();
  strip.classList.toggle("hidden", matches.length === 0 && captureStagedFiles.length === 0);

  // Files not yet uploaded, because this note has no id to attach them to.
  // Rendered from the staging list rather than from the note text, they are
  // deliberately *not* in the text (see `captureStagedFiles`), so there is no
  // markdown to read them out of, and removing one is dropping it from the
  // list rather than deleting anything on disk.
  for (const file of captureStagedFiles) {
    const card = fileCard(file.name, `/media/${file.name}`);
    card.classList.add("file-card-staged");
    const pending = document.createElement("span");
    pending.className = "file-card-kind file-card-pending";
    pending.textContent = "attaches on save";
    card.querySelector(".file-card-text")?.appendChild(pending);
    // A staged file has no url yet, so there is nothing to open or download.
    card.querySelector(".file-card-open")?.setAttribute("disabled", "true");
    card.querySelector(".file-card-save")?.remove();
    const drop = document.createElement("button");
    drop.type = "button";
    drop.className = "ghost small icon-only file-card-remove";
    setLabel(drop, "ph:x");
    drop.title = `Don't attach “${file.name}”`;
    drop.setAttribute("aria-label", drop.title);
    drop.addEventListener("click", () => {
      captureStagedFiles = captureStagedFiles.filter((f) => f !== file);
      renderCaptureFiles();
    });
    card.appendChild(drop);
    strip.appendChild(card);
  }

  for (const match of matches) {
    const [full, name, url] = match;
    const card = fileCard(name, url);
    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "ghost small icon-only file-card-remove";
    setLabel(remove, "ph:x");
    remove.title = `Remove “${name || url}” from this note`;
    remove.setAttribute("aria-label", remove.title);
    remove.addEventListener("click", async () => {
      textarea.value = textarea.value.replace(full, "").replace(/\n{3,}/g, "\n\n");
      textarea.dispatchEvent(new Event("input", { bubbles: true }));
      // Same reasoning as the image chip's own remove, directly above: a
      // file attached to a note that has never been saved cannot be
      // referenced from anywhere else yet, so detaching the markdown and
      // leaving the bytes in data/media would only ever produce an orphan.
      try {
        const upload = await resolveMediaUploadByUrl(url);
        if (upload) await apiJson(`/media/${upload.id}`, { method: "DELETE" });
      } catch (err) {
        console.error("Couldn't delete the underlying upload", err);
      }
    });
    card.appendChild(remove);
    strip.appendChild(card);
  }
}

$("entry-content").addEventListener("input", (e) => {
  const n = e.target.value.length;
  $("entry-count").textContent = `${n} character${n === 1 ? "" : "s"}`;
  // Keep a draft so a half-typed thought survives a reload or a stray tab
  // switch: losing one is the most annoying thing this app could do.
  if (n) localStorage.setItem("captureDraft", e.target.value);
  else localStorage.removeItem("captureDraft");
  renderEntryAttachmentChips();
  // The "go to it" link belongs to the note you just saved, not the one you
  // are now writing: drop it as soon as typing starts.
  $("save-status").querySelector(".jump-to-note")?.remove();
});

//: A staged picture's bytes live in this tab and nowhere else, so a restored
//: draft cannot show one, the Blob went with the page that made it. Left in,
//: the note would carry `![x](staged:img-…)` forever: a dead link that Save
//: would happily write to disk, since the rewrite only knows about images
//: staged in *this* session.
//:
//: Removed rather than kept-and-warned, because there is nothing the reader
//: can do about it and nothing to recover, the picture was never uploaded.
//: The line below says so once, so a vanished screenshot is explained rather
//: than mysterious.
const STAGED_IN_DRAFT = /!\[[^\]\n]{0,200}\]\(staged:[^)\n]{1,120}\)\n?/g;

// Restore an unsaved draft on load.
(() => {
  const stored = localStorage.getItem("captureDraft");
  if (!stored) return;
  const draft = stored.replace(STAGED_IN_DRAFT, "");
  const lostImages = draft !== stored;
  const box = $("entry-content");
  box.value = draft;
  autoGrow(box); // a long restored draft shouldn't arrive in a one-line box
  $("entry-count").textContent = `${draft.length} character${draft.length === 1 ? "" : "s"}`;
  renderEntryAttachmentChips();
  const status = $("save-status");
  if (status) status.textContent = "Restored your unsaved draft.";
  //: A toast rather than the status line for the images, because this runs at
  //: module load, before the lock screen is even answered, and every status
  //: line written here is overwritten by the boot sequence that follows.
  //: Measured: the line came back empty in a driven browser. `toast` queues
  //: and shows once the app is up, which is when there is somebody to read it.
  if (lostImages) {
    toast(
      "Your restored draft mentioned images that were never uploaded, they " +
        "could not come back, so those lines were removed.",
    );
  }
})();

$("export-md").addEventListener("click", () => downloadExport("markdown"));
$("import-md").addEventListener("click", importMarkdown);
//: The folder picker posts through the same function, the only difference
//: is which input it reads, so `importMarkdown` takes the id rather than
//: growing a second copy of the upload/report/refresh sequence.
$("import-md-folder-btn").addEventListener("click", () => importMarkdown("import-md-folder"));
$("import-dir")?.addEventListener("click", importDirectory);
$("export-backup-zip")?.addEventListener("click", () => downloadExport("backup"));
$("import-document").addEventListener("click", importDocument);
$("backup-now").addEventListener("click", backupNow);

$("palette-input").addEventListener("input", () => {
  paletteIndex = 0;
  renderPalette($("palette-input").value);
});
$("palette-input").addEventListener("keydown", paletteKeydown);
wireBackdropClose($("palette-overlay"), () => closePalette());

$("sketch-btn").addEventListener("click", openSketch);
$("sketch-close").addEventListener("click", closeSketch);
$("sketch-save").addEventListener("click", saveSketch);
$("sketch-clear").addEventListener("click", () => {
  // Clears strokes only: the background layer (§37G's uploaded image, or
  // blank white) is untouched, so Clear can't lose the photo being annotated.
  const canvas = $("sketch-canvas");
  canvas.getContext("2d").clearRect(0, 0, canvas.width, canvas.height);
});
$("sketch-upload-image").addEventListener("click", () => $("sketch-image-input").click());
$("sketch-image-input").addEventListener("change", () => {
  const file = $("sketch-image-input").files[0];
  $("sketch-image-input").value = ""; // lets the same file be picked again
  sketchUploadImage(file);
});
$("sketch-size").addEventListener("input", () => {
  sketchPen.size = Number($("sketch-size").value);
  syncSketchSizeReadout();
});
// `input` previews live while dragging the swatch; `change` (fires once, on
// release) is what persists, dragging across ten hues shouldn't write ten
// times, same reasoning as the whiteboard's own background picker.
$("sketch-bg-color-picker").addEventListener("input", (e) => {
  sketchBgColor = e.target.value;
  sketchDrawBackground();
  sketchDirty = true; // a background colour is as much a change as a stroke
});
$("sketch-bg-color-picker").addEventListener("change", (e) => {
  localStorage.setItem(SKETCH_BG_KEY, e.target.value);
});
for (const button of document.querySelectorAll(".sketch-color")) {
  button.addEventListener("click", () => {
    sketchPen.color = button.dataset.color;
    // Picking a colour means you want to draw, not erase. The eraser button
    // was renamed `sketch-tool-eraser` when the toolbar became icons, and this
    // one call kept the old `sketch-eraser` id: so the optional-chain
    // swallowed it and the eraser stayed lit while the pen drew, which reads
    // as the colour swatches not working.
    //
    // **It does not mean you want the pen**, which is what this did until it
    // was measured: "highlighter, then yellow" left `sketchTool` at "pen" and
    // drew an opaque yellow line (one pass at 176.0 luminance on a 255.0
    // paper, which is the ink's own value, so no translucency at all). The
    // highlighter, the shapes and the text tool all take the ink too, so only
    // the eraser is switched away from here.
    const wasErasing = sketchPen.eraser;
    sketchPen.eraser = false;
    if (wasErasing) {
      sketchTool = "pen";
      $("sketch-tool-eraser")?.classList.remove("active");
      $("sketch-tool-pen")?.classList.add("active");
    }
    document
      .querySelectorAll(".sketch-color")
      .forEach((b) => b.classList.toggle("active", b === button));
  });
}
const sketchCanvas = $("sketch-canvas");
sketchCanvas.addEventListener("pointerdown", sketchStart);
sketchCanvas.addEventListener("pointermove", sketchMove);
sketchCanvas.addEventListener("pointerup", sketchEnd);
sketchCanvas.addEventListener("pointerleave", sketchEnd);

$("sketch-undo").addEventListener("click", () => {
  if (sketchHistory.length === 0) return;
  const canvas = $("sketch-canvas");
  const ctx = canvas.getContext("2d");
  sketchRedoStack.push(ctx.getImageData(0, 0, canvas.width, canvas.height));
  const last = sketchHistory.pop();
  ctx.putImageData(last, 0, 0);
  sketchDirty = true;
});
$("sketch-redo").addEventListener("click", () => {
  if (sketchRedoStack.length === 0) return;
  const canvas = $("sketch-canvas");
  const ctx = canvas.getContext("2d");
  sketchHistory.push(ctx.getImageData(0, 0, canvas.width, canvas.height));
  const next = sketchRedoStack.pop();
  ctx.putImageData(next, 0, 0);
  sketchDirty = true;
});

const sketchToolsList = ["pen", "highlighter", "eraser", "line", "rect", "circ", "arrow", "text"];
for (const tool of sketchToolsList) {
  const btn = $(`sketch-tool-${tool}`);
  if (btn) {
    btn.addEventListener("click", () => {
      sketchTool = tool === "eraser" ? "pen" : tool;
      sketchPen.eraser = (tool === "eraser");
      for (const t of sketchToolsList) {
        const tBtn = $(`sketch-tool-${t}`);
        if (tBtn) tBtn.classList.toggle("active", t === tool);
      }
    });
  }
}

document.addEventListener("keydown", (e) => {
  if ((e.ctrlKey || e.metaKey) && !$("sketch-overlay").classList.contains("hidden")) {
    if (e.key === "z") {
      if (e.shiftKey) $("sketch-redo").click();
      else $("sketch-undo").click();
      e.preventDefault();
    } else if (e.key === "y") {
      $("sketch-redo").click();
      e.preventDefault();
    }
  }
});

// Wave H: dictation + read-aloud.
$("mic-note").addEventListener("click", () =>
  toggleDictation($("mic-note"), $("entry-content"))
);
$("mic-chat").addEventListener("click", () =>
  toggleDictation($("mic-chat"), $("chat-input"))
);
$("speak-btn").addEventListener("click", () => speakText($("ai-answer").textContent));

// Meeting notes (§17).
$("meeting-close").addEventListener("click", closeMeetingRecorder);
wireBackdropClose($("meeting-overlay"), () => closeMeetingRecorder());
$("meeting-record").addEventListener("click", toggleMeetingRecording);
$("meeting-save").addEventListener("click", saveMeetingNote);
$("meeting-save-doc")?.addEventListener("click", saveMeetingDocument);
$("meeting-pause")?.addEventListener("click", toggleMeetingPause);
$("meeting-copy")?.addEventListener("click", (event) =>
  copyToClipboard($("meeting-transcript").value, event.currentTarget)
);
$("meeting-discard").addEventListener("click", resetMeetingUI);

// PWA: the shell caches itself so the app opens instantly (Wave F).
// When a new service worker takes over (after an update), reload once so
// the page never runs new HTML against stale cached CSS/JS (Wave O fix).
if ("serviceWorker" in navigator) {
  // Only reload when an EXISTING worker is replaced (a real update): not
  // on the first install, whose clients.claim() also fires controllerchange
  // and would reload the page mid-setup (Wave O fix).
  const hadController = Boolean(navigator.serviceWorker.controller);
  navigator.serviceWorker.register("/sw.js").catch(() => {});
  let swReloaded = false;
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (!hadController || swReloaded) return;
    swReloaded = true;
    location.reload();
  });
}

// The generative brand emblem's initial draw (Wave O) moved to settings.js's
// own tail (§88.3 item 4): renderBrandLogo() itself stays here (used far
// outside Settings), but the accent/appearance state it reads through
// renderEmblem() moved, so calling it from this bare line, before
// settings.js has loaded: threw ReferenceError. See settings.js's header.

// Whiteboard subsystem moved to frontend/whiteboard.js (loaded via a
// second <script> tag in index.html, after this file). Everything that
// used to live here, board/card CRUD, sketch drawing, mind-mapping,
// export, move/resize: is defined there now, in the same shared global
// scope, so nothing here needs to change to keep calling it.

// ======================= FLOATING FORMAT MENU =======================

// --- Global Drag and Drop & Paste Image Upload for Textareas ---
document.addEventListener("dragover", (e) => {
  if (e.target.tagName && e.target.tagName.toLowerCase() === 'textarea') {
    e.preventDefault();
    e.target.classList.add("drag-over");
  }
});

document.addEventListener("dragleave", (e) => {
  if (e.target.tagName && e.target.tagName.toLowerCase() === 'textarea') {
    e.preventDefault();
    e.target.classList.remove("drag-over");
  }
});

// ROADMAP.md §89 item 5, fixed: this pair matches ANY `<textarea>` by tag
// name alone, which `#chat-input` is too: so a dropped/pasted image there
// used to route through `handleFileUpload` (written for the Notes/Document
// composer: inserts `![Uploading…]()` markdown placeholders into the
// textarea's own text) instead of the chat composer's real image-staging
// system, `attachImageFiles()`/`renderImageAttachments()`, the same one
// the composer's "+" button already uses, with its own attachment cards and
// its own toast-on-failure error handling. The symptom matched exactly:
// literal markdown-image syntax landing in the message box, and no
// attachment card, because nothing was ever staged through that system.
// `#chat-input` is excluded here and given its own branch instead of a
// second global listener, so there is exactly one place either kind of
// composer's drop/paste behaviour is decided.
function _isChatComposer(target) {
  return target && target.id === "chat-input";
}

document.addEventListener("drop", async (e) => {
  if (!e.target.tagName || e.target.tagName.toLowerCase() !== 'textarea') return;
  e.preventDefault();
  e.target.classList.remove("drag-over");

  if (_isChatComposer(e.target)) {
    const files = Array.from(e.dataTransfer.files);
    const images = files.filter((f) => f.type.startsWith("image/"));
    if (images.length) await attachImageFiles(images);
    if (images.length < files.length) {
      toast("Only images can be attached to a chat message right now.", true);
    }
    return;
  }

  const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith("image/") || f.type.startsWith("application/") || f.type.startsWith("text/") || f.type.startsWith("video/") || f.type.startsWith("audio/"));
  if (!files.length) return;

  await handleFileUpload(e.target, files);
});

document.addEventListener("paste", async (e) => {
  if (!e.target.tagName || e.target.tagName.toLowerCase() !== 'textarea') return;
  const items = (e.clipboardData || e.originalEvent.clipboardData).items;
  const files = [];
  for (const item of items) {
    if (item.kind === 'file') {
      files.push(item.getAsFile());
    }
  }
  if (!files.length) return;
  // Don't prevent default entirely unless we have files, otherwise normal paste breaks
  e.preventDefault();

  if (_isChatComposer(e.target)) {
    const images = files.filter((f) => f.type.startsWith("image/"));
    if (images.length) await attachImageFiles(images);
    if (images.length < files.length) {
      toast("Only images can be attached to a chat message right now.", true);
    }
    return;
  }

  await handleFileUpload(e.target, files);
});

//: Files waiting to become attachments on a note that does not exist yet.
//:
//: **Why staging rather than uploading immediately.** `/media/upload`, the
//: only endpoint the composer could reach, accepts nine image types and
//: `.pdf`, and that allowlist is not paranoia to widen: `/media/{name}`
//: serves inline from the app's own origin, so an `.html` or `.svg` landing
//: there is stored XSS, and the AI can write to that folder too. So a
//: `.docx`, a `.txt` or a code file dropped into the composer got a 415 and
//: a red toast, while **the same file attached fine to an already-saved
//: note** through `POST /entries/{id}/files`, whose allowlist covers about
//: sixty types precisely because attachments are served as downloads.
//:
//: The difference was never the file. It was that the composer has no note
//: id yet. So the file waits here until Save produces one, and then takes
//: the attachment path it should have taken all along, which also gets it
//: a real row, a card with a delete button, and a place in the Library.
//:
//: Images are deliberately *not* staged: an image in the middle of a
//: paragraph is content, and it needs to be inline markdown at the point in
//: the text where it was dropped, not an attachment at the bottom.

//: **Images wait for the note too now.**
//:
//: The composer used to `POST /media/upload` the moment a picture was dropped
//: or pasted, and the comment above explained why that was different from the
//: files beside it: an image is *content*, it has to land as inline markdown
//: at the point in the text where it was dropped. That is still true, and it
//: was never a reason for the file to survive a note nobody saved. Every
//: abandoned draft with a pasted screenshot left a row in the Library and a
//: file on disk, which is exactly the leak asked about: "files should only be
//: staged and not permanently saved while uploaded to a note that hasnt been
//: saved yet".
//:
//: So the markdown goes in immediately, pointing at a `staged:<key>` url the
//: renderer resolves to the local Blob, and Save swaps every one of those for
//: the real `/media/...` url the upload returns. The bytes never leave the
//: browser until there is a note to attach them to.
//: Swap every `staged:<key>` for the url its upload produced. A pure string
//: function on purpose: it is the step that decides what gets *saved*, so it
//: is the step worth being able to test on its own.
function rewriteStagedUrls(content, urlByKey) {
  let out = content;
  for (const [key, url] of Object.entries(urlByKey)) {
    out = out.split(stagedImageUrl(key)).join(url);
  }
  return out;
}

//: Upload everything staged in the composer and return `{key: url}`. Throws
//: on the first failure, which is deliberate: Save must not write a note
//: whose picture is a dead `staged:` url, and it must not silently drop the
//: picture either: the same rule `commitStagedImages` follows for chat.
async function commitCaptureImages() {
  const urlByKey = {};
  for (const image of captureStagedImages) {
    const form = new FormData();
    form.append("file", image.file);
    const uploaded = await apiJson("/media/upload", {
      method: "POST",
      headers: { "X-Auth-Token": authToken() },
      body: form,
    });
    urlByKey[image.key] = uploaded.url;
  }
  return urlByKey;
}

function clearStagedImages() {
  for (const image of captureStagedImages) {
    //: An object URL is a document-lifetime reference to the bytes; dropping
    //: the array alone leaks them for as long as the tab is open.
    if (image.objectUrl) URL.revokeObjectURL(image.objectUrl);
  }
  captureStagedImages = [];
}

async function uploadStagedFiles(entryId) {
  if (!captureStagedFiles.length) return;
  const staged = captureStagedFiles;
  captureStagedFiles = [];
  renderCaptureFiles();
  let failures = 0;
  for (const file of staged) {
    const form = new FormData();
    form.append("file", file);
    // Raw fetch: multipart must NOT get the JSON content-type header.
    const response = await fetch(`/entries/${entryId}/files`, {
      method: "POST",
      // Same gap as the composer's own version of this call, above.
      headers: { "X-Auth-Token": authToken(), "X-Workspace-ID": activeSpaceId() },
      body: form,
    });
    if (!response.ok) {
      failures++;
      const detail = await response.json().catch(() => ({}));
      toast(detail.detail || `${file.name}: couldn't attach (${response.status})`, true);
    }
  }
  // Only mentioned when it worked; a failure already said so, per file, and
  // "attached 2 files" under two error toasts would be the app arguing with
  // itself.
  if (failures < staged.length) await loadEntries();
}

async function handleFileUpload(textarea, files) {
  // The capture composer is the one place that can stage: it is the only
  // textarea whose content becomes a note with an id a moment later. A
  // document's own editor writes into a document, which has no attachment
  // table, so it keeps the inline-markdown path for everything.
  const canStage = textarea.id === "entry-content";
  const images = canStage ? files.filter((f) => f.type.startsWith("image/")) : files;
  const others = canStage ? files.filter((f) => !f.type.startsWith("image/")) : [];
  if (others.length) {
    captureStagedFiles.push(...others);
    renderCaptureFiles();
    toast(
      others.length === 1
        ? `“${others[0].name}” will be attached when you save.`
        : `${others.length} files will be attached when you save.`
    );
  }
  if (!images.length) return;
  files = images;

  const cursorPosition = textarea.selectionStart;
  const selectionEnd = textarea.selectionEnd;
  const originalText = textarea.value;

  //: **The composer stages instead of uploading**, see `captureStagedImages`.
  //: Everywhere else (the document editor) still uploads inline, because a
  //: document has an id from the moment it exists and nothing to wait for.
  //:
  //: Written before the "Uploading…" placeholder below rather than after it:
  //: assigning `textarea.value` moves the selection, so a branch that ran
  //: afterwards and re-sliced against `selectionEnd` would cut the note in a
  //: different place than it meant to.
  if (canStage) {
    let inserted = "";
    for (const file of files) {
      const key = `img-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      captureStagedImages.push({
        key,
        file,
        objectUrl: URL.createObjectURL(file),
        name: file.name,
      });
      inserted += `![${file.name}](${stagedImageUrl(key)})\n`;
    }
    textarea.value =
      originalText.slice(0, cursorPosition) + inserted + originalText.slice(selectionEnd);
    textarea.dispatchEvent(new Event("input", { bubbles: true }));
    const at = cursorPosition + inserted.length;
    textarea.setSelectionRange(at, at);
    toast(
      files.length === 1
        ? `“${files[0].name}” will be saved with the note.`
        : `${files.length} images will be saved with the note.`,
    );
    return;
  }

  let textToInsert = "";
  for (const file of files) {
    textToInsert += `![Uploading ${file.name}…]()\n`;
  }
  textarea.value = originalText.substring(0, cursorPosition) + textToInsert + originalText.substring(selectionEnd);
  textarea.dispatchEvent(new Event('input', { bubbles: true }));

  for (const file of files) {
    const formData = new FormData();
    formData.append("file", file);
    try {
      const res = await apiJson("/media/upload", {
        method: "POST",
        headers: { "X-Auth-Token": authToken() },
        body: formData
      });
      // Image syntax (`![]()`) unconditionally became an <img> at render
      // time (renderInlineMarkdown): a non-image upload (PDF, docx, audio)
      // failed to decode as an image and the img.onerror handler then
      // reported it as "filename deleted", which is actively wrong: the
      // file uploaded fine and is sitting at res.url. Link syntax for
      // anything that isn't actually an image.
      const fileMarkdown = file.type.startsWith("image/")
        ? `![${res.filename}](${res.url})\n`
        : `[${res.filename}](${res.url})\n`;
      textarea.value = textarea.value.replace(`![Uploading ${file.name}…]()\n`, fileMarkdown);
      textarea.dispatchEvent(new Event('input', { bubbles: true }));
    } catch (err) {
      // Reported directly (§89 item 2): an upload failure rendered as if it
      // were the AI's own message: literal error text left sitting in the
      // note/document content, indistinguishable from something the user
      // actually typed. A toast is a notification; content is what gets
      // saved. Removing the placeholder outright (not replacing it with
      // more text) leaves the composer exactly as if the file were never
      // dropped/pasted, which is the honest description of what happened.
      console.error("Upload failed", err);
      textarea.value = textarea.value.replace(`![Uploading ${file.name}…]()\n`, "");
      textarea.dispatchEvent(new Event('input', { bubbles: true }));
      toast(err.message || `Couldn't upload "${file.name}".`, true);
    }
  }
}

// ROADMAP.md Tier 2 §16c: paste and drag-drop already reached Capture (the
// global textarea handler above matches any `<textarea>`, and `#entry-content`
// is one): checked live before building, and both already worked. The one
// genuinely missing path was a file-picker button; the only "attach" control
// near Capture was for linking existing *notes* to a chat message, not
// uploading a new file. Reuses the same `handleFileUpload` the paste/drop
// paths already use, so all three input paths insert identically.
if ($("entry-attach-file")) {
  $("entry-attach-file").addEventListener("click", () => {
    $("entry-attach-file-input").click();
  });
  $("entry-attach-file-input").addEventListener("change", async (e) => {
    const files = Array.from(e.target.files);
    if (files.length) await handleFileUpload($("entry-content"), files);
    e.target.value = ""; // so picking the same file twice still fires "change"
  });
}

if ($("entry-attach-existing")) {
  $("entry-attach-existing").addEventListener("click", async () => {
    const upload = await pickMediaDialog();
    if (!upload) return;
    // Same inline-markdown insertion shape handleFileUpload's own success
    // path uses, minus the upload, this is already sitting on disk.
    const textarea = $("entry-content");
    const cursorPosition = textarea.selectionStart;
    const original = textarea.value;
    const markdown = `![${upload.original_name}](${upload.url})\n`;
    textarea.value =
      original.substring(0, cursorPosition) + markdown + original.substring(textarea.selectionEnd);
    textarea.dispatchEvent(new Event("input", { bubbles: true }));
  });
}
