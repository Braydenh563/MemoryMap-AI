// ai-tools.js: the tasks manager, a model per feature, improve writing,
// tensions, link suggestions, keeping the look. Moved out of app.js on
// 2026-09-26 as one contiguous range (INBOX 426 cc,
// docs/roadmap/agent-remaining/appjs-split.md). A classic script sharing
// app.js's globals, loaded in app.js's old order; nothing in an earlier file
// calls into it while the page loads (scratchpad/appjs-map.js --check).

// --- Wave N: tasks manager (see and quit background jobs) ---------------------------

// The list is built by the server (GET /tasks), not assembled here from
// whatever happened to be in the model status. It used to know about exactly
// two jobs, a re-index and a model download, so the embedding model loading
// at startup and the SearXNG install, which is minutes long, ran with nothing
// on this screen to say so. Rendering whatever the server sends means the
// next background job appears here without touching this file.
// `payload` is the /tasks body when the caller has already fetched it, the
// status poll has, once, for the bar. Opening the panel passes nothing and
// fetches, so the list is filled the moment you get there rather than at the
// next tick.
async function renderTasks(payload) {
  const list = $("task-list");
  const body = payload || (await apiJson("/tasks", { silent: true }).catch(() => null));
  const jobs = (body && body.tasks) || [];
  list.replaceChildren();
  $("tasks-empty").classList.toggle("hidden", jobs.length > 0);
  for (const job of jobs) {
    const li = document.createElement("li");
    // The heading row is the job and its Quit button; everything else stacks
    // underneath at full width. The bar used to sit inline after the label,
    // where it ran off the right edge of the card on a long job name.
    const row = document.createElement("div");
    row.className = "entry-meta";
    const name = document.createElement("strong");
    name.textContent = job.label;
    row.appendChild(name);

    if (job.cancellable) {
      const actions = document.createElement("span");
      actions.className = "entry-actions";
      actions.appendChild(
        smallButton("Quit", "Stop this job", async () => {
          // `/tasks/cancel`, not `/models/jobs/cancel`: the old endpoint knew
          // about a re-index and a model pull and nothing else, so this
          // button only ever appeared on two of the eight kinds this panel
          // lists. The server now answers for all of them and says what it
          // actually did: a pip install is terminated, an autonomous pass
          // stops at its next safe point and stays off for a while, an
          // embedding download stops after the file it is on. Reporting the
          // server's own sentence rather than a fixed "asked it to stop"
          // is the difference between the three.
          try {
            const result = await apiJson("/tasks/cancel", {
              method: "POST",
              body: JSON.stringify({ kind: job.kind, name: job.name || "" }),
            });
            toast(result.detail || (result.stopped ? "Stopping." : "It had already finished."));
          } catch (e) {
            toast(e.message, true);
          }
          renderTasks();
          refreshModelStatus();
        })
      );
      row.appendChild(actions);
    }
    li.appendChild(row);

    if (job.detail) {
      const detail = document.createElement("p");
      detail.className = "muted task-detail";
      detail.textContent = job.detail;
      li.appendChild(detail);
    }

    // A bar only where there is a real fraction to show. A progress bar that
    // guesses is worse than one that admits it can't say: and under reduced
    // motion an indeterminate animation freezes and reads as a fault.
    if (typeof job.progress === "number") {
      const bar = document.createElement("progress");
      bar.max = 1;
      bar.value = job.progress;
      bar.className = "task-progress";
      li.appendChild(bar);
    }

    // What the job itself is printing. A bar answers "is it working?" only
    // while it moves, and pip can sit on one number for minutes, the output
    // is the thing that keeps changing, so it is the real answer to "has it
    // frozen?". Open by default while a job is running; there is nothing to
    // be spared from here.
    if ((job.log || []).length) {
      const fold = document.createElement("details");
      fold.className = "task-log";
      fold.open = taskLogsOpen.has(job.kind);
      fold.addEventListener("toggle", () => {
        if (fold.open) taskLogsOpen.add(job.kind);
        else taskLogsOpen.delete(job.kind);
      });
      const summary = document.createElement("summary");
      summary.textContent = `What it's doing (${job.log.length} lines)`;
      const pre = document.createElement("pre");
      pre.className = "task-log-lines";
      pre.textContent = job.log.join("\n");
      fold.append(summary, pre);
      li.appendChild(fold);

      // Listen for scroll events to track if the user has scrolled up from the bottom
      pre.addEventListener("scroll", () => {
        const isAtBottom = Math.abs(pre.scrollHeight - pre.scrollTop - pre.clientHeight) < 5;
        taskLogScrollStates.set(job.kind, isAtBottom);
      });

      // Follow the tail, the way a terminal does, unless the user scrolled up
      if (fold.open && taskLogScrollStates.get(job.kind) !== false) {
        // Use a slight timeout to ensure rendering is complete before scrolling
        requestAnimationFrame(() => {
          pre.scrollTop = pre.scrollHeight;
        });
      }
    }
    list.appendChild(li);
  }
  renderTaskHistory((body && body.history) || []);
}

// What has stopped, newest first. Separate from the running list on purpose:
// mixing them means a finished job and a running one look alike at a glance,
// and the question this screen answers most often is "is it still going?".
const TASK_OUTCOMES = {
  completed: { icon: "ph:check-circle", className: "" },
  failed: { icon: "ph:warning", className: "task-failed" },
  // Not an error. Reporting a user's own decision in red is how people learn
  // to ignore red.
  cancelled: { icon: "ph:x", className: "muted" },
};

function renderTaskHistory(history) {
  const box = $("task-history-box");
  const list = $("task-history");
  // A finished background job goes into the notifications centre whether or
  // not this screen is open, which is the point of the centre (§36E). These
  // jobs are long: an install or a re-index finishes minutes after you stopped
  // watching it, and until now the only record was a screen inside Settings
  // that you had to know to open. Recorded first, so it happens even when the
  // Tasks panel is not on screen and the two elements below are missing.
  for (const item of history) {
    recordNotification({
      kind: item.outcome === "failed" ? "error" : "task",
      title: item.label,
      detail: item.detail || "",
      // Keyed on the job and when it stopped, so the three-second re-render
      // does not add the same finished job over and over.
      key: `task:${item.kind || item.label}:${item.at}`,
    });
  }
  if (!box || !list) return;
  box.classList.toggle("hidden", history.length === 0);
  list.replaceChildren();
  for (const item of history) {
    const style = TASK_OUTCOMES[item.outcome] || TASK_OUTCOMES.completed;
    const li = document.createElement("li");
    if (style.className) li.className = style.className;

    const row = document.createElement("div");
    row.className = "entry-meta";
    const name = document.createElement("strong");
    setLabel(name, `${style.icon} ${item.label}`);
    const when = document.createElement("span");
    when.className = "muted";
    // Which model actually did the work (captioning, OCR, the weekly
    // digest): recorded by the backend all along (`taskhistory.record`'s
    // `name` param) but never shown here, so "which model answered this"
    // was answerable only by opening the log console. Asked about
    // directly (BACKLOG.md §95 item A.3).
    when.textContent = item.name
      ? `${relativeTime(item.at)} · ${item.name}`
      : relativeTime(item.at);
    row.append(name, when);
    li.appendChild(row);

    // The reason, which is the whole point for a failure, until now it
    // existed only in the log console, a screen you have to know to open.
    if (item.detail) {
      const detail = document.createElement("p");
      detail.className = "muted task-detail";
      setLabel(detail, item.detail);
      li.appendChild(detail);
    }
    list.appendChild(li);
  }
}

// Which task logs the user has opened, kept across the 3-second re-render so
// a fold doesn't slam shut under them.
const taskLogsOpen = new Set(["searxng"]);
const taskLogScrollStates = new Map();

// Model pickers (rewritten, Wave O). The old version let the status poll
// (every ~3s while Settings is open) reset the dropdown to the SAVED
// model, so a selection would "switch back after a few seconds".
//
// New rule, dead simple: the option list is (re)built ONLY when the SET
// of installed model names actually changes (order-independent: Ollama
// doesn't return a stable order). The selected value is set once, when
// the list is first built; after that a poll never touches `.value`, so
// your choice stays put until you Apply (which re-syncs to the new saved
// value). No timing-sensitive "userChosen" flag to get wrong.
function _namesSignature(names) {
  return [...names].sort().join("|");
}

function fillModelSelect(select, names, extraFirst, savedValue) {
  const wanted = extraFirst ? [extraFirst.value, ...names] : names;
  const signature = _namesSignature(wanted);
  if (select.dataset.sig === signature) return; // same options → leave it alone
  select.dataset.sig = signature;
  const previous = select.value; // preserve a live selection across a rebuild
  select.replaceChildren();
  if (extraFirst) {
    const option = document.createElement("option");
    option.value = extraFirst.value;
    option.textContent = extraFirst.label;
    select.appendChild(option);
  }
  for (const name of names) {
    const option = document.createElement("option");
    option.value = name;
    option.textContent = name;
    select.appendChild(option);
  }
  // Prefer the value already showing; else the saved preference.
  const values = [...select.options].map((o) => o.value);
  const match =
    (previous && values.includes(previous) && previous) ||
    values.find((v) => v === savedValue) ||
    values.find((v) => v.split(":")[0] === savedValue);
  if (match !== undefined) select.value = match;
}

function renderChatModelPicker(status) {
  const names = status.installed_models.map((m) => m.name);
  fillModelSelect($("chat-model-select"), names, null, status.chat_model);
  //: The name beside the model, which is INBOX 225's decision for this
  //: screen: the app speaks as Atlas everywhere else, and "Active: qwen2.5:7b"
  //: was the one place it went back to naming the machinery. Both halves are
  //: here on purpose, "which model" is the question this line exists to
  //: answer and the name alone would not answer it.
  $("chat-model-note").textContent =
    status.chat_model_installed === false
      ? `${aiNameNow()} was running “${status.chat_model}”, which is not installed any more. Pick another or download it below.`
      : `${aiNameNow()}, running ${status.chat_model}`;
}

// Nielsen #6, recognition over recall: which model answers was previously
// knowable only by opening Settings → Models, and only then if the backend
// is Ollama (the picker above is gated on ollama_running). status.chat_model
// itself isn't backend-specific, so this reads it straight off the poll
// loop instead of piggybacking on that gated render.
function renderChatActiveModelBadge() {
  const badge = $("chat-active-model");
  if (!badge) return;
  //: **The Chat tab's own model, which is not always the app's.** Since the
  //: chat tab is a row in `model_manager.FEATURES` it can be pinned to a
  //: model of its own, and a pill reading the global `chat_model` would then
  //: name a model this tab is not using: the one thing this badge exists to
  //: report, wrong, on the surface it reports for. The row is already
  //: resolved by the server, so this is a lookup rather than a second rule.
  const pinned = (modelStatus && modelStatus.feature_models || []).find(
    (row) => row.key === "chat" && row.overridden
  );
  //: `chat_model_effective`, not `chat_model`: on a llama.cpp or LM Studio
  //: server the configured name is not what answers when that server has a
  //: different model loaded (owner: the header said llama3.2, which was not
  //: installed, while another model answered). On Ollama a missing model
  //: is said to be missing rather than named as if it ran.
  const name = (pinned && pinned.model)
    || (modelStatus && (modelStatus.chat_model_effective || modelStatus.chat_model));
  const missing = !pinned && modelStatus?.chat_model_installed === false
    && name === modelStatus.chat_model;
  //: **No model connected, no model named** (the owner: "if an ai model
  //: isnt connected, it shouldnt show a model being used right??"). The
  //: header named the configured model in accent, as if it were answering,
  //: directly above the composer's own "No model is connected". Same signal
  //: the composer and Ask use (`syncModelGatedControls`), so the three can
  //: never disagree; pressing it goes straight to connecting one.
  //:
  //: **And then said once, not twice** (the owner, 2026-09-24: "No model
  //: connected" in this badge and again in the composer's notice under it).
  //: The composer's notice (`#chat-offline`, `renderAiOfflineNotice`) is the
  //: statement that says what still works and carries the button that
  //: connects one, so it is the one kept; the badge steps aside while no
  //: model is running, and names the model again the moment one is.
  if (modelStatus && modelStatus.ollama_running === false) {
    badge.hidden = true;
    badge.classList.add("is-missing");
    badge.textContent = "";
    badge.title = "";
    badge.dataset.offline = "1";
    return;
  }
  delete badge.dataset.offline;
  badge.hidden = !name;
  badge.classList.toggle("is-missing", Boolean(missing));
  //: The short form in the badge, the full id in the tooltip below, the
  //: badge is 22ch wide and a HuggingFace id is routinely longer than that.
  badge.textContent = missing ? `${shortModelName(name)} (not installed)` : shortModelName(name);
  // The badge itself ellipsis-truncates a long id (a full HuggingFace path
  // easily runs past the header), the full name is still one hover away.
  badge.title = !name
    ? ""
    : missing
      ? `${name} is set for chat but is not installed: click to pick a model you have`
      : `${aiNameNow()} is answering with ${name}: click for what it is and what it can do`;
}

//: **What this model actually is.** Asked for: "in chat I want more details in
//: features, including model attributes, token expense distribution, more
//: features."
//:
//: `GET /models/spec` has existed since §11, size, quantisation, family, the
//: declared window against the one the app will really run it at, and the
//: tri-state capability flags: and **nothing in the frontend had ever called
//: it.** A whole endpoint that never ran once, which is this repo's second
//: recurring failure shape. It answers the first question anyone has when a
//: model behaves oddly ("can this one even use tools?") and the answer was
//: only discoverable by trying it and reading the failure.
//:
//: Pressing the badge opens this rather than jumping straight to Settings: the
//: panel is what you wanted nine times in ten, and "change it" is a button
//: inside it for the tenth.
//: Places the panel under the badge, in viewport coordinates. It is
//: `position: fixed` (see the stylesheet's own note on why `absolute` put it
//: off the bottom of the screen), so nothing positions it but this.
function placeChatModelPanel() {
  const panel = $("chat-model-panel");
  const badge = $("chat-active-model");
  if (!panel || !badge || panel.classList.contains("hidden")) return;
  const margin = 8;
  panel.style.left = "0px";
  panel.style.top = "0px";
  const anchor = badge.getBoundingClientRect();
  const box = panel.getBoundingClientRect();
  let left = anchor.left;
  if (left + box.width > window.innerWidth - margin) {
    left = window.innerWidth - margin - box.width;
  }
  if (left < margin) left = margin;
  let top = anchor.bottom + margin;
  if (top + box.height > window.innerHeight - margin) {
    // Above the badge when there is no room below it, and pinned inside the
    // window when there is room neither way, never off the edge, which is
    // the whole bug this is here to end.
    const above = anchor.top - margin - box.height;
    top = above >= margin ? above : Math.max(margin, window.innerHeight - margin - box.height);
  }
  panel.style.left = `${Math.round(left)}px`;
  panel.style.top = `${Math.round(top)}px`;
}

//: The panel fills in asynchronously (`GET /models/spec`), and it grows when
//: it does: so it is placed again once the content lands, and on any resize
//: or scroll that moves the badge out from under it.
window.addEventListener("resize", placeChatModelPanel);
window.addEventListener("scroll", placeChatModelPanel, true);

async function openChatModelPanel() {
  const name = modelStatus && modelStatus.chat_model;
  const panel = $("chat-model-panel");
  if (!panel || !name) return;
  panel.replaceChildren();
  const head = document.createElement("div");
  head.className = "row space-between chat-model-panel-head";
  const title = document.createElement("strong");
  title.textContent = name;
  title.className = "chat-model-panel-name";
  head.appendChild(title);
  const close = smallButton("ph:x", "Close", () => panel.classList.add("hidden"));
  close.classList.add("icon-only");
  head.appendChild(close);
  panel.appendChild(head);

  const list = document.createElement("dl");
  list.className = "chat-model-facts";
  const loading = document.createElement("p");
  loading.className = "muted";
  loading.textContent = "Reading the model's own specification…";
  panel.append(list, loading);
  panel.classList.remove("hidden");
  placeChatModelPanel();

  const spec = await apiJson(`/models/spec?name=${encodeURIComponent(name)}`).catch(() => null);
  //: The panel was measured empty a moment ago; it is a different height now.
  placeChatModelPanel();
  loading.remove();
  if (!spec) {
    const failed = document.createElement("p");
    failed.className = "muted";
    //: Named as a *backend* silence rather than a model fault: the usual cause
    //: is that Ollama is not running, and "unknown" with no reason sends
    //: people looking at the wrong thing.
    failed.textContent =
      "The backend didn't answer. This needs the model runner to be up, everything else in this panel comes from it.";
    panel.appendChild(failed);
    return;
  }
  const fact = (label, value, why) => {
    if (value === null || value === undefined || value === "") return;
    const dt = document.createElement("dt");
    dt.textContent = label;
    const dd = document.createElement("dd");
    dd.textContent = String(value);
    if (why) dd.title = why;
    list.append(dt, dd);
  };
  fact("Family", spec.family, "The architecture this model is built on");
  fact("Size", spec.parameters, "How many parameters it has");
  fact("Quantisation", spec.quantisation, "How much its weights were compressed to fit in memory");
  if (spec.context_length) {
    fact(
      "Declared window",
      `${compactTokens(spec.context_length)} tokens`,
      "What the model says it can hold"
    );
  }
  if (spec.usable_context) {
    fact(
      "Used here",
      `${compactTokens(spec.usable_context)} tokens`,
      "What this app actually runs it at, often lower on purpose, to leave room for the key/value cache"
    );
  }
  //: Tri-state, and rendered as three states. `null` means this backend does
  //: not say, and drawing that as "No" would be a confident lie about a model
  //: that works fine: the endpoint's own docstring makes the same point.
  const flag = (value) => (value === null || value === undefined ? "Not reported" : value ? "Yes" : "No");
  fact("Can call tools", flag(spec.supports_tools), "Whether agent mode can work with this model");
  fact("Can show its reasoning", flag(spec.supports_thinking));
  fact("Can see images", flag(spec.supports_vision), "Whether it can read a picture or a scanned page");

  const change = smallButton("ph:gear Change the model", "Open Settings → Models", () => {
    panel.classList.add("hidden");
    openSettingsModal("models", "chat-model-select");
  });
  panel.appendChild(change);
}

$("chat-active-model")?.addEventListener("click", () => {
  if ($("chat-active-model").dataset.offline) {
    openSettingsModal("models");
    return;
  }
  const panel = $("chat-model-panel");
  if (panel && !panel.classList.contains("hidden")) {
    panel.classList.add("hidden");
    return;
  }
  openChatModelPanel();
});

function renderUtilityModelPicker(status) {
  const names = status.installed_models.map((m) => m.name);
  fillModelSelect(
    $("utility-model-select"),
    names,
    { value: "", label: "Same as chat model" },
    status.utility_model || ""
  );
  //: INBOX 277. The select shows what is stored; this line says what runs.
  //: The two differ exactly when smart model routing is off, and the server
  //: decides which (`ModelManager.utility_resolution`), so this only words
  //: the reason it was given rather than repeating the rule.
  const note = $("utility-model-note");
  if (!note) return;
  const resolved = status.utility_model_resolved || status.chat_model || "";
  const reasons = {
    routing_off: `Background jobs run on ${resolved}, the chat model, because smart model routing is off.`,
    unset: `Background jobs run on ${resolved}, the chat model, until you choose another.`,
    chosen: `Background jobs run on ${resolved}.`,
  };
  note.textContent = resolved ? reasons[status.utility_model_reason] || `Background jobs run on ${resolved}.` : "";
}

function renderVisionModelPicker(status) {
  const names = status.installed_models.map((m) => m.name);
  fillModelSelect(
    $("vision-model-select"),
    names,
    // The one model preference in this app that does NOT default to "same
    // as chat model" (model_manager.py's vision_model() explains why: a
    // chat model silently can't see images more often than it can).
    { value: "", label: "Auto-detect" },
    status.vision_model || ""
  );
  // Auto-detect is a choice with no fixed answer, say what it resolved to
  // right now, the same reason chat-model-note exists, rather than leaving
  // "Auto-detect" to mean nothing concrete in the UI.
  const note = $("vision-model-note");
  if (status.vision_model) {
    note.textContent = `Active: ${status.vision_model}`;
  } else if (status.vision_model_resolved) {
    note.textContent = `Auto-detect, currently ${status.vision_model_resolved}`;
  } else {
    note.textContent =
      "Auto-detect: no installed model reports it can see images yet.";
  }
}

// --- a model per feature -----------------------------------------------------
//
// Asked for directly: *"allow the user to alter the model they use for that
// specific feature if they wish ... individually altered and reset and for
// there to be a mass reset."*
//
// The rows are drawn from `/models/status`'s `feature_models`, which the
// server has already resolved: each row carries the model in use, what it
// inherits, and whether the first of those is this feature's own choice. So
// this file never has to know which role a feature falls back to, and the next
// feature appears here by being added to `model_manager.FEATURES`, with no
// change to any of the code below.
//
// The same data drives the inline picker in each surface's own ⋯, so the two
// places a model can be changed are one list read twice and cannot disagree.

//: The last rows the poll delivered. Read by the inline pickers, which open
//: from a menu and cannot wait for a round trip before drawing themselves.
let featureModelRows = [];
let featureModelNames = [];

function featureModelRow(key) {
  return featureModelRows.find((row) => row.key === key) || null;
}

//: What a row says about itself under its name. This is the fact the control
//: beside it cannot carry: a select showing "llama3.2" looks the same whether
//: that name was chosen for this feature or arrived from the chat model.
function featureModelState(row) {
  return row.overridden
    ? `Its own model: ${row.model}`
    : `Inherited: ${row.inherits}`;
}

async function applyFeatureModel(key, name) {
  const row = featureModelRow(key);
  try {
    await api("/models/feature-model", {
      method: "POST",
      body: JSON.stringify({ feature: key, name }),
    });
    const label = row ? row.label : "This feature";
    toast(name ? `${label} now uses ${name}.` : `${label} is back on its default model.`);
    refreshModelStatus();
  } catch (error) {
    toast(error.message || "Couldn't set that model.", true);
    refreshModelStatus();
  }
}

function renderFeatureModels(status) {
  featureModelRows = status.feature_models || [];
  featureModelNames = (status.installed_models || []).map((m) => m.name);
  syncFeatureModelSelects();
  const list = $("feature-models-list");
  if (!list) return;
  list.replaceChildren();
  for (const row of featureModelRows) {
    const line = document.createElement("div");
    line.className = "feature-model-row";
    line.dataset.feature = row.key;
    //: Read by the stylesheet, which tints the state line of a row that is on
    //: a model of its own: the list's only job is to make those findable.
    line.dataset.overridden = row.overridden ? "1" : "0";

    const name = document.createElement("div");
    name.className = "feature-model-name";
    const label = document.createElement("span");
    label.className = "feature-model-label";
    label.textContent = row.label;
    const state = document.createElement("span");
    state.className = "feature-model-state";
    state.textContent = featureModelState(row);
    state.title = row.note || "";
    name.append(label, state);

    const select = document.createElement("select");
    select.setAttribute("aria-label", `Model for ${row.label}`);
    select.title = `Model for ${row.label}`;
    //: The "inherited" option names what it inherits, so the list can be read
    //: without opening anything: every row says which model it is on.
    fillModelSelect(
      select,
      featureModelNames,
      { value: "", label: `Inherited: ${row.inherits}` },
      row.overridden ? row.model : ""
    );
    select.addEventListener("change", () => applyFeatureModel(row.key, select.value));

    //: Disabled until the row is overridden, because a reset on a row that is
    //: already on its default is a control that does nothing when pressed.
    const reset = smallButton(
      "ph:arrow-counter-clockwise",
      row.overridden
        ? `Reset ${row.label} to the model it inherits`
        : `${row.label} is already on the model it inherits`,
      () => applyFeatureModel(row.key, "")
    );
    //: Named, because `enhanceSelect` wraps the select beside it in a shell
    //: with a button of its own: "the first button in the row" stopped being
    //: this one the moment the select was enhanced.
    reset.classList.add("icon-only", "feature-model-reset");
    reset.disabled = !row.overridden;

    line.append(name, select, reset);
    list.appendChild(line);
  }

  const count = Number(status.feature_models_overridden || 0);
  const reset = $("feature-models-reset");
  const note = $("feature-models-reset-note");
  if (reset) {
    //: The mass reset says how many it would clear and does nothing when the
    //: answer is none, rather than reporting success over a no-op.
    reset.disabled = count === 0;
    reset.title = count
      ? `Hand ${count === 1 ? "one feature" : `${count} features`} back to the model they inherit`
      : "No feature has a model of its own yet";
  }
  if (note) {
    note.textContent = count === 0
      ? "No feature has a model of its own yet."
      : count === 1
        ? "One feature is on a model of its own."
        : `${count} features are on models of their own.`;
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

//: **The inline picker, one sheet for every surface.** Decision 4: "easily
//: altered" means not walking to Settings, and the way in is the surface's own
//: ⋯ rather than a new control in its chrome. `openSheet` is DESIGN.md's
//: recipe for a panel of choices and it is the one shape that works in all
//: three places, two of which hold a `kebabMenu` and one a `details.dock-menu`
//: that cannot nest a second menu inside itself.
function openFeatureModelSheet(key) {
  const row = featureModelRow(key);
  if (!row) {
    toast("Models aren't available yet. Open Settings, Models to check.", true);
    return;
  }
  openSheet({
    label: `Model for ${row.label}`,
    sub: featureModelState(row),
    name: `feature-model-${key}`,
    build: (card, close) => {

      const list = document.createElement("div");
      list.className = "sheet-list";
      list.appendChild(
        sheetRow(
          row.overridden ? "ph ph-arrow-counter-clockwise" : "ph ph-check",
          // The choice, not the state: the line under the title already says
          // which model is in use, so this row names what pressing it does.
          `Default (${row.inherits})`,
          () => {
            close();
            if (row.overridden) applyFeatureModel(key, "");
          }
        )
      );
      for (const name of featureModelNames) {
        const chosen = row.overridden && row.model === name;
        list.appendChild(
          sheetRow(chosen ? "ph ph-check" : "ph ph-cube", name, () => {
            close();
            if (!chosen) applyFeatureModel(key, name);
          })
        );
      }
      card.appendChild(list);
      //: A backend that is not answering has no model list to offer, and the
      //: sheet says so rather than showing one row and letting the reader
      //: wonder where their models went.
      if (!featureModelNames.length) {
        const empty = document.createElement("p");
        empty.className = "muted";
        empty.textContent =
          "No models are installed, or the model server isn't answering.";
        card.appendChild(empty);
      }
    },
  });
}

//: The menu row every surface uses to reach the picker above. One label, one
//: place, so the three surfaces cannot drift apart in wording.
function featureModelMenuItem(key) {
  const row = featureModelRow(key);
  return {
    label: "ph:cube Model for this feature",
    //: A static title on purpose. These menus are built once and the model
    //: can change under them, so the state is named by the sheet, which is
    //: built at the moment it opens, rather than by a row that would go stale.
    title: "Pick the model this feature runs on",
    run: () => openFeatureModelSheet(key),
  };
}

//: **The model picker inside a surface.** The owner, 2026-09-23: "I want to be
//: able to change the model I use within the features themselves using a model
//: dropdown which pairs with the feature-specific model selections in
//: settings". The sheet above, behind the Chat tab's ⋯, was the only way in
//: there, and the Ask box had none. A plain `<select>` in the surface's own
//: composer (DESIGN.md: a dropdown of values is a `<select>`, and
//: `enhanceSelect` styles it), written through `applyFeatureModel`, the one
//: call Settings' own list makes, and redrawn from the same rows on every
//: status poll: changing either moves the other on the next tick, and
//: neither keeps a copy of its own.
//:
//: **It names the model that will run** (INBOX 277: "a role can say one model
//: and silently run another"). The first option is "Inherited: <name>", the
//: name the server resolves through the role, smart routing included, rather
//: than a bare "Default"; and an override that is not in the installed list
//: (the model server is down, or the model was removed) is still offered, so
//: the control never shows one model while the turn runs on another.
const FEATURE_MODEL_SELECTS = [
  ["chat-feature-model", "chat"],
  ["ask-feature-model", "ask"],
  ["draft-feature-model", "writing"],
];

function syncFeatureModelSelects() {
  for (const [id, key] of FEATURE_MODEL_SELECTS) {
    const select = $(id);
    if (!select) continue;
    const row = featureModelRow(key);
    //: No rows yet (the first poll has not answered, or the app is locked):
    //: a control that would write a guess is worse than a disabled one.
    select.disabled = !row;
    if (!row) continue;
    const names = [...featureModelNames];
    if (row.overridden && !names.includes(row.model)) names.unshift(row.model);
    //: **Never name a model that will not run as if it will** (INBOX 277).
    //: With no backend connected the inherited name is only the configured
    //: default: measured, the picker said "Inherited: llama3.2" under a banner
    //: saying no model is connected.
    //: Installed by the server's own rule (`_name_matches`: "llama3.2" is an
    //: installed "llama3.2:latest"), and the server's own verdict on the chat
    //: model wins over this list: measured, an installed
    //: `hf.co/...:UD-Q4_K_XL` read "(not installed)" from a literal compare.
    //: The short name in the label, the full id in the tooltip: the long
    //: form made the Ask header's picker 1,200px wide.
    const installedNames = new Set(featureModelNames.flatMap((n) => [n, String(n).split(":")[0]]));
    const serverSaysInstalled = row.inherits === modelStatus?.chat_model
      && modelStatus?.chat_model_installed === true;
    const isInstalled = serverSaysInstalled || installedNames.has(row.inherits)
      || modelStatus?.chat_model_installed == null;
    //: No model server answering is its own case, and it comes first: the
    //: install check reads "unknown" as installed, so a disconnected app still
    //: said "Inherited: llama3.2" under the no-model banner (the owner: "if an
    //: ai model isnt connected, it shouldnt show a model being used right??").
    const disconnected = modelStatus?.ollama_running === false;
    const inherited = disconnected
      ? `Inherited: ${shortModelName(row.inherits)} (not connected)`
      : isInstalled
        ? `Inherited: ${shortModelName(row.inherits)}`
        : `Inherited: ${shortModelName(row.inherits)} (not installed)`;
    fillModelSelect(
      select,
      names,
      { value: "", label: inherited },
      row.overridden ? row.model : ""
    );
    //: The inherited name moves when the chat model is changed in Settings,
    //: and `fillModelSelect` only rebuilds when the *values* change, which
    //: the first option's never does. Its words are kept current here.
    const first = select.options[0];
    if (first && first.value === "" && first.textContent !== inherited) {
      first.textContent = inherited;
    }
    //: Always the stored choice, not whatever the control last showed:
    //: `fillModelSelect` prefers the live selection so a poll cannot undo a
    //: pick in flight, which is right for Settings and would leave this one
    //: stale after the other side changed it.
    const wanted = row.overridden ? row.model : "";
    if (select.value !== wanted) select.value = wanted;
    select.title = row.overridden
      ? `${row.label} runs on ${row.model}, its own choice. The same setting as Settings, Models.`
      : `${row.label} runs on ${row.inherits}, inherited. The same setting as Settings, Models.`;
  }
}

function wireFeatureModelSelects() {
  for (const [id, key] of FEATURE_MODEL_SELECTS) {
    const select = $(id);
    if (!select || select.dataset.wired) continue;
    select.dataset.wired = "1";
    select.addEventListener("change", () => {
      const row = featureModelRow(key);
      const wanted = row && row.overridden ? row.model : "";
      if (select.value !== wanted) applyFeatureModel(key, select.value);
    });
  }
}

// Separate from the vision picker above because the jobs are separate, see
// ModelManager.ocr_model. "Automatic" here means something more specific than
// the vision picker's "Auto-detect": it prefers an installed document reader
// over a general vision model, because both report the same `vision`
// capability and only one of them is built to transcribe a page.
function renderOcrModelPicker(status) {
  const names = status.installed_models.map((m) => m.name);
  fillModelSelect(
    $("ocr-model-select"),
    names,
    { value: "", label: "Automatic" },
    status.ocr_model || ""
  );
  const note = $("ocr-model-note");
  if (status.ocr_model) {
    note.textContent = `Active: ${status.ocr_model}`;
  } else if (status.ocr_model_resolved) {
    note.textContent = `Automatic, currently ${status.ocr_model_resolved}`;
  } else {
    note.textContent =
      "Automatic: nothing installed can read text off a page yet.";
  }
}

function renderAutonomousModelPicker(status) {
  const names = status.installed_models.map((m) => m.name);
  fillModelSelect(
    $("pref-autonomous-model"),
    names,
    { value: "", label: "Same as utility model" },
    (window.prefsCache && window.prefsCache.autonomous_tasks_model) || ""
  );
}

function renderEmbeddingPicker(status) {
  // Name the built-in model rather than describing it. "Works out of the box,
  // no download" was wrong on both counts: it fetches ~130 MB from Hugging
  // Face the first time, which is a long quiet wait to have described as
  // needing nothing.
  $("builtin-model-name").textContent = status.active_embedding_model
    ? `${status.active_embedding_model}, downloaded once on first use`
    : "downloaded once on first use";
  // The backend radios only reflect the saved value while the user has no
  // pending choice of their own.
  //
  // A focus check alone was not enough, and it is why switching search
  // engines was reported as impossible. Picking a radio does not save
  // anything, "Apply & re-index" does, so between the click and the apply
  // there is a pending choice the server doesn't know about yet. The moment
  // focus moved (clicking Apply, or just tabbing away) the status poll ran,
  // found `touching` false, and reset the radio to the *saved* backend. The
  // selection visibly snapped back, so the setting looked stuck.
  //
  // Same `userChosen` latch the model selects already use, cleared once the
  // choice is actually applied.
  const group = document.querySelectorAll('input[name="emb-backend"]');
  const touching =
    document.activeElement?.name === "emb-backend" ||
    [...group].some((radio) => radio.dataset.userChosen === "1");
  if (!touching) {
    for (const radio of document.querySelectorAll('input[name="emb-backend"]')) {
      radio.checked = radio.value === status.embedding_backend;
    }
  }
  const names = (status.installed_models || []).map((m) => m.name);
  fillModelSelect(
    $("embedding-model-select"),
    names,
    null,
    status.embedding_model
  );
  // With Ollama down there are no embedding models to pick from, so that half
  // of the choice is disabled and says why, rather than the whole section
  // disappearing, which is what used to happen.
  const offline = !status.ollama_running;
  //: **And it says whether it is the one in use.** Asked after reading the
  //: code: "does the ai embedding model actually get used??" It does, in
  //: seven places, but only when the backend above is set to Ollama, and the
  //: built-in backend is the default. So somebody who picked a model here
  //: expecting it to be doing the work had a fully enabled, fully ignored
  //: control, which is the same class of thing as a disabled control that
  //: does not say why: a setting whose state is invisible.
  //:
  //: Disabled rather than hidden, because hiding it would make the choice
  //: unfindable from the radio that mentions it, and the tooltip carries the
  //: reason so the state is legible without a second paragraph on screen.
  syncEmbeddingPickerState(offline);
  document.querySelector('input[name="emb-backend"][value="ollama"]').disabled = offline;
  $("embedding-ollama-note").classList.toggle("hidden", offline);
  $("embedding-offline-note").classList.toggle("hidden", !offline);
}

//: **A control says whether it is the one in use.** Asked after reading the
//: code: *"does the ai embedding model actually get used??"* It does, in
//: seven places, but only when the backend radio above is set to Ollama, and
//: the built-in backend is the default. So somebody who picked a model here
//: expecting it to be doing the work had a fully enabled, fully ignored
//: control, which is the same class of thing as a disabled control that does
//: not say why: a setting whose state is invisible.
//:
//: Disabled rather than hidden, because hiding it would make the choice
//: unfindable from the radio that names it, and the reason rides on the
//: tooltip so the state is legible without another paragraph on screen.
//:
//: `offline` is passed by the status poll, which knows; the radio's own
//: handler omits it and it is read back off the control the poll last set,
//: so a change of radio cannot claim Ollama is reachable when it is not.
function syncEmbeddingPickerState(offline) {
  const ollamaRadio = document.querySelector('input[name="emb-backend"][value="ollama"]');
  const down = offline === undefined ? Boolean(ollamaRadio?.disabled) : offline;
  const usingOllama =
    document.querySelector('input[name="emb-backend"]:checked')?.value === "ollama";
  const picker = $("embedding-model-select");
  if (!picker) return;
  picker.disabled = down || !usingOllama;
  //: An empty select says nothing: with Ollama off it drew as a blank 46px
  //: box beside a pale Apply button. It names why it is empty instead.
  if (!picker.options.length || picker.options[0].dataset.placeholder) {
    const note = down ? "Needs Ollama running" : "No embedding models installed";
    let option = picker.options[0];
    if (!option) {
      option = document.createElement("option");
      option.value = "";
      option.dataset.placeholder = "1";
      picker.appendChild(option);
    }
    option.textContent = note;
  }
  picker.title = down
    ? "Ollama is not running, so there are no embedding models to choose from"
    : usingOllama
      ? "The model used for semantic search"
      : "Only used when the backend above is set to Ollama. The built-in one is in use";
  const apply = $("embedding-apply");
  if (!apply) return;
  apply.disabled = down || !usingOllama;
  apply.title = usingOllama
    ? "Re-read every note with this model"
    : "Choose the Ollama backend above to use a model from here";
}

// The button lives in index.html (see `#reindex-box`) rather than being built
// here: `test_frontend_ids.py` refuses an id this file looks up that the
// markup never declares, and it is right to, a control that exists only in
// JS is one nobody can find by reading the page.
function wireReindexButton() {
  const button = $("reindex-start");
  if (!button || button.dataset.wired === "1") return;
  button.dataset.wired = "1";
  setLabel(button, "ph:arrows-clockwise Rebuild search index");
  button.addEventListener("click", async () => {
    button.disabled = true;
    try {
      await apiJson("/models/reindex", { method: "POST" });
      toast("Rebuilding the search index…");
      refreshModelStatus?.();
    } catch (error) {
      // A 409 is not a failure to report as one: it means the thing the user
      // asked for is already happening.
      toast(error.message, !/already running/i.test(error.message || ""));
    } finally {
      button.disabled = false;
    }
  });
}

function renderReindex(status) {
  const box = $("reindex-box");
  const job = status.reindex;
  const running = job && job.status === "running";
  wireReindexButton();
  // The box is no longer only a progress readout, so it stays visible, the
  // heading and the progress bar are what come and go with the job.
  box.classList.remove("hidden");
  const heading = box.querySelector("h3");
  if (heading) heading.textContent = running ? "Re-indexing your notes…" : "Search index";
  $("reindex-progress").classList.toggle("hidden", !running);
  $("reindex-label").classList.toggle("hidden", !running);
  $("reindex-start").classList.toggle("hidden", running);
  if (running) {
    $("reindex-progress").value = job.done;
    $("reindex-progress").max = Math.max(job.total, 1);
    $("reindex-label").textContent = `${job.done} of ${job.total} notes re-indexed`;
  }
  //: **Say when it is actually worth doing.** Asked for: "suggest rebuilding
  //: the search index upon large changes". The backend counts notes that
  //: arrived or vanished in bulk (`mark_index_stale`); this is the only place
  //: that counter is ever shown, and it says nothing at all until the count
  //: crosses the threshold the same module sets, a permanent nudge is
  //: furniture, and a nudge after every third note is noise.
  const stale = Number(status.index_stale_notes || 0);
  const threshold = Number(status.index_stale_suggest_at || 20);
  const staleLine = $("reindex-stale");
  if (staleLine) {
    const worth = !running && stale >= threshold;
    staleLine.classList.toggle("hidden", !worth);
    if (worth) {
      //: Through `setLabel`, because `.notice` carries its icon as a child
      //: element (the recipe, 08-consistency.css) and `textContent` would wipe
      //: it and print the token.
      setLabel(
        staleLine,
        `ph:warning ${stale} notes have been added or removed in bulk since the ` +
          "last rebuild, semantic search may be missing them."
      );
    }
  }
}

function renderInstalledModels(status) {
  const box = $("installed-box");
  const list = $("installed-list");
  const models = status.installed_models || [];
  box.classList.toggle("hidden", models.length === 0);
  list.replaceChildren();

  // Models the app is actively pointing at can't be removed (would break it).
  const inUse = new Set([status.chat_model]);
  if (status.utility_model) inUse.add(status.utility_model);
  if (status.vision_model) inUse.add(status.vision_model);
  //: The OCR reader is a fourth assignable role and was missing from this set,
  //: so a model set as the OCR model showed a Remove button instead of "in
  //: use", reported directly. Both the chosen name and what it actually
  //: resolves to: the setting may be blank ("use the vision model") or name a
  //: model by a tag Ollama reports differently.
  if (status.ocr_model) inUse.add(status.ocr_model);
  if (status.ocr_model_resolved) inUse.add(status.ocr_model_resolved);
  if (status.vision_model_resolved) inUse.add(status.vision_model_resolved);
  if (status.embedding_backend === "ollama") inUse.add(status.embedding_model);
  const usedBases = new Set([...inUse].map((n) => (n || "").split(":")[0]));

  for (const model of models) {
    const li = document.createElement("li");
    const name = document.createElement("span");
    name.className = "model-name";
    name.textContent = model.name;
    const info = document.createElement("span");
    info.className = "model-info";
    info.textContent = model.size ? `${(model.size / 1e9).toFixed(1)} GB` : "";
    li.append(name, info);

    const used = inUse.has(model.name) || usedBases.has(model.name.split(":")[0]);
    if (used) {
      li.appendChild(chip("in use", "tag"));
    } else {
      li.appendChild(
        smallButton("Remove", `Uninstall ${model.name}`, async (event) => {
          if (
            !(await confirmDialog(
              `Remove “${model.name}” from Ollama? This frees its disk space, ` +
                "you can re-download it any time."
            ))
          )
            return;
          event.target.disabled = true;
          try {
            await api("/models/delete", {
              method: "POST",
              body: JSON.stringify({ name: model.name }),
            });
            toast(`Removed ${model.name}.`);
            refreshModelStatus();
          } catch (error) {
            toast(error.message, true);
            event.target.disabled = false;
          }
        })
      );
    }
    list.appendChild(li);
  }
}

//: Human-readable section headings for SUGGESTED_MODELS' own dict keys
//: (model_manager.py): asked for directly: the list read as one long,
//: undifferentiated column with the type buried inside each row's own
//: "kind · size · purpose" text, so nothing set "the small, fast ones"
//: apart from "the one that reads images" at a glance. Order matches the
//: backend dict's own insertion order (Object.entries preserves it),
//: which is already curated small-to-large within each group, grouping
//: here doesn't re-sort that, only labels the breaks between groups.
const SUGGESTED_KIND_LABELS = {
  text: "Text",
  moe: "Mixture-of-experts (MoE): big download, small working set",
  embedding: "Embeddings: for semantic search",
  vision: "Vision: can see images",
};

function renderSuggested(status) {
  const list = $("suggested-list");
  if (!suggestedCatalog) return;
  list.replaceChildren();
  const installedNames = new Set(
    status.installed_models.flatMap((m) => [m.name, m.name.split(":")[0]])
  );

  for (const [kind, models] of Object.entries(suggestedCatalog)) {
    if (!models.length) continue;
    const heading = document.createElement("li");
    heading.className = "suggested-group-label";
    heading.textContent = SUGGESTED_KIND_LABELS[kind] || kind;
    list.appendChild(heading);
    for (const model of models) {
      const li = document.createElement("li");
      const name = document.createElement("span");
      name.className = "model-name";
      name.textContent = model.name;
      const info = document.createElement("span");
      info.className = "model-info";
      // "~2.0 GB" for a figure we shipped and cannot check, the exact size for
      // one the backend has actually measured (§35J). The tilde is the whole
      // signal: this number is the one someone checks their free disk against
      // before committing to a multi-gigabyte download, so presenting a stale
      // guess as fact is the part that was wrong, not the guess itself.
      const approximate = model.size_source !== "measured";
      const size = approximate ? `~${String(model.size).replace(/^~/, "")}` : model.size;
      // No longer repeats `kind` here: the group heading above says it once
      // for the whole section instead of on every single row under it.
      info.textContent = `${size} · ${model.purpose}`;
      info.title = approximate
        ? "Approximate download size: the exact figure shows once it's installed."
        : "Measured on your machine.";
      li.append(name, info);

      const pull = (status.pulls || {})[model.name];
      if (installedNames.has(model.name)) {
        li.appendChild(chip("ph:check installed", "confidence"));
      } else if (pull && pull.status === "running") {
        const progress = document.createElement("progress");
        progress.max = Math.max(pull.total, 1);
        progress.value = pull.done;
        progress.style.width = "120px";
        li.appendChild(progress);
      } else {
        if (pull && pull.status === "error") {
          li.appendChild(chip("failed: retry?", "review"));
        }
        li.appendChild(
          smallButton(
            "Download",
            `Download ${model.name} with Ollama`,
            async (event) => {
              event.target.disabled = true;
              try {
                await api("/models/pull", {
                  method: "POST",
                  body: JSON.stringify({ name: model.name }),
                });
                refreshModelStatus();
              } catch (error) {
                toast(error.message, true);
                event.target.disabled = false;
              }
            },
            false
          )
        );
      }
      list.appendChild(li);
    }
  }
}

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
$("embedding-error-fix").addEventListener("click", runEmbeddingFallback);

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

// --- Wave N: AI improve-writing (before/after, user approves) -----------------------

let improveMode = "proofread";
let improveTarget = null; // the textarea to write the accepted result into
let improveCustomInstruction = "";

function openImprove(targetTextarea) {
  const text = targetTextarea.value.trim();
  if (!text) {
    toast("Write something first, then improve it.", true);
    return;
  }
  improveTarget = targetTextarea;
  improveMode = "proofread";
  improveCustomInstruction = "";
  $("improve-custom-input").value = "";
  $("improve-custom-row").classList.add("hidden");
  for (const b of document.querySelectorAll(".improve-mode"))
    b.classList.toggle("active", b.dataset.mode === "proofread");
  $("improve-original").textContent = text;
  overlayReturnFocus = document.activeElement;
  $("improve-overlay").classList.remove("hidden");
  $("improve-close").focus();
  runImprove();
}

function closeImprove() {
  $("improve-overlay").classList.add("hidden");
  overlayReturnFocus?.focus?.();
  overlayReturnFocus = null;
}

async function runImprove() {
  const status = $("improve-status");
  const result = $("improve-result");
  if (improveMode === "custom" && !improveCustomInstruction.trim()) {
    // Nothing to send yet, the box just opened on "Custom" and the person
    // hasn't typed anything. Prompting here instead of calling the API with
    // an empty instruction (which the backend would reject anyway) so the
    // very first thing that happens after picking Custom isn't an error.
    status.textContent = "Say what you want changed, then press Go.";
    status.classList.remove("error");
    result.textContent = "";
    $("improve-apply").disabled = true;
    return;
  }
  result.textContent = "";
  status.textContent = "Atlas is editing…";
  status.classList.remove("error");
  $("improve-apply").disabled = true;
  try {
    const body = await apiJson("/entries/improve", {
      method: "POST",
      body: JSON.stringify({
        text: $("improve-original").textContent,
        mode: improveMode,
        custom_instruction: improveMode === "custom" ? improveCustomInstruction.trim() : undefined,
      }),
    });
    result.textContent = body.improved;
    status.textContent = "";
    $("improve-apply").disabled = false;
  } catch (error) {
    status.textContent = error.message;
    status.classList.add("error");
  }
}

function applyImprove() {
  if (improveTarget) {
    improveTarget.value = $("improve-result").textContent;
    improveTarget.dispatchEvent(new Event("input")); // refresh char count
  }
  closeImprove();
  toast("Applied Atlas's suggestion.");
}

// --- Tensions: where the notebook disagrees with itself ---------------------
//
// Sibling of the auto-linker below, and deliberately next to it: both propose
// a connection and neither writes one without a click. The difference is what
// they can see. Similarity, every kind this app has, embeddings included , 
// answers "are these about the same thing", and two notes that flatly
// contradict each other are, to a vector, maximally similar. Only a model
// reading both can tell agreement from disagreement.
//
// `core/database.py`'s LINK_TYPES comment called `contradicts` "the one worth
// having built this for" and nothing ever produced one; `ai/tensions.py` is
// the half that does, and this is the review.

function tensionsDialog() {
  return document.getElementById("tensions-dialog");
}

function openTensions() {
  const dialog = tensionsDialog();
  if (!dialog) return;
  if (!dialog.open) dialog.showModal();
  // Deliberately does *not* auto-run. A pass reads pairs of notes with the
  // local model, free, but not instant, so starting one is a decision the
  // person makes, not something that happens because a dialog opened.
  const results = document.getElementById("tensions-results");
  if (results && !results.childElementCount) setTensionsStatus("");
}

function setTensionsStatus(text, busy = false) {
  const el = document.getElementById("tensions-status");
  if (!el) return;
  el.textContent = text;
  // `aria-live="polite"` is on the element itself, so a screen reader gets
  // the progress line without the focus being moved off the button that
  // started it.
  el.classList.toggle("is-busy", busy);
}

const TENSION_STATUS_TEXT = {
  no_model: "No local model is running, so nothing can read your notes. Start Ollama and try again.",
  no_embeddings:
    "Semantic search is off, so there is no shortlist of notes to compare. Turn it on in Settings → Models.",
  too_few_notes: "Not enough notes yet, there is nothing to compare.",
  no_candidates:
    "No pairs were close enough in subject to be worth reading. Contradictions only show up between notes about the same thing.",
  none_found: "Nothing contradicted itself. Your notebook is consistent, as far as this pass could tell.",
};

async function runTensionReview() {
  const button = document.getElementById("tensions-run");
  const results = document.getElementById("tensions-results");
  if (!results) return;
  if (button) button.disabled = true;
  results.replaceChildren();
  setTensionsStatus("Reading your notes… this runs on your machine and can take a minute.", true);

  const body = await apiJson("/entries/tensions", { silent: true }).catch(() => null);
  if (button) button.disabled = false;

  if (!body) {
    setTensionsStatus("The review could not run. Nothing was changed.");
    return;
  }
  const found = body.tensions || [];
  if (!found.length) {
    setTensionsStatus(TENSION_STATUS_TEXT[body.status] || "Nothing found.");
    return;
  }
  const checked = body.pairs_checked || 0;
  setTensionsStatus(
    `${found.length} to look at, from ${checked} pair${checked === 1 ? "" : "s"} read.`,
  );
  for (const tension of found) results.appendChild(tensionCard(tension));
}

/** One proposed disagreement, with both notes and the two decisions. */
function tensionCard(tension) {
  const card = document.createElement("div");
  card.className = "card tension-card";
  // A group with its own label, so a screen reader moving by landmark hears
  // what this block is about before its buttons.
  card.setAttribute("role", "group");
  card.setAttribute("aria-label", `Possible contradiction: ${tension.explanation}`);

  const why = document.createElement("p");
  why.className = "tension-why";
  why.textContent = tension.explanation;
  card.appendChild(why);

  const gap = document.createElement("p");
  gap.className = "muted tension-gap";
  // The gap is the finding as much as the text is, "you thought this, then
  // months later you thought that" is the story, and a bare pair of notes
  // does not tell it.
  gap.textContent = tension.gap_days
    ? `${tensionGapText(tension.gap_days)} apart`
    : "Written around the same time";
  card.appendChild(gap);

  const pair = document.createElement("div");
  pair.className = "tension-pair";
  pair.appendChild(tensionSide("Earlier", tension.earlier_at, tension.earlier_excerpt, tension.earlier_id));
  pair.appendChild(tensionSide("Later", tension.later_at, tension.later_excerpt, tension.later_id));
  card.appendChild(pair);

  const actions = document.createElement("div");
  actions.className = "row tension-actions";
  const accept = document.createElement("button");
  accept.type = "button";
  accept.className = "accent small";
  accept.textContent = "Yes: link these as contradicting";
  accept.addEventListener("click", async () => {
    await apiJson("/entries/tensions/accept", {
      method: "POST",
      body: JSON.stringify({ earlier_id: tension.earlier_id, later_id: tension.later_id }),
    }).catch(() => null);
    tensionResolve(card, "Linked as contradicting.");
  });
  const dismiss = document.createElement("button");
  dismiss.type = "button";
  dismiss.className = "ghost small";
  dismiss.textContent = "Not a contradiction";
  dismiss.addEventListener("click", async () => {
    await apiJson("/entries/tensions/dismiss", {
      method: "POST",
      body: JSON.stringify({ earlier_id: tension.earlier_id, later_id: tension.later_id }),
    }).catch(() => null);
    tensionResolve(card, "Dismissed: this pair won't come back.");
  });
  actions.append(accept, dismiss);
  card.appendChild(actions);
  return card;
}

/** Replace a card's controls with what happened, in place. */
function tensionResolve(card, message) {
  card.classList.add("is-resolved");
  const actions = card.querySelector(".tension-actions");
  if (!actions) return;
  const done = document.createElement("p");
  done.className = "muted tension-done";
  // `role="status"` so the outcome is announced: the button that was just
  // pressed is gone, and without this a screen-reader user gets silence.
  done.setAttribute("role", "status");
  done.textContent = message;
  actions.replaceWith(done);
}

function tensionGapText(days) {
  if (days < 31) return `${days} day${days === 1 ? "" : "s"}`;
  const months = Math.round(days / 30);
  if (months < 18) return `${months} month${months === 1 ? "" : "s"}`;
  const years = (days / 365).toFixed(1).replace(/\.0$/, "");
  return `${years} year${years === "1" ? "" : "s"}`;
}

function tensionSide(label, when, excerpt, entryId) {
  const side = document.createElement("div");
  side.className = "tension-side";
  const head = document.createElement("p");
  head.className = "tension-side-head";
  const tag = document.createElement("strong");
  tag.textContent = label;
  head.appendChild(tag);
  if (when) {
    const date = document.createElement("span");
    date.className = "muted tension-date";
    date.textContent = when;
    head.appendChild(date);
  }
  side.appendChild(head);
  const text = document.createElement("p");
  text.className = "tension-excerpt";
  text.textContent = excerpt || "(empty note)";
  side.appendChild(text);
  const open = document.createElement("button");
  open.type = "button";
  open.className = "ghost small";
  open.textContent = "Open this note";
  open.addEventListener("click", () => {
    tensionsDialog()?.close();
    flashEntry(entryId);
  });
  side.appendChild(open);
  return side;
}

// --- Wave N: AI link suggestions (auto-linker, approve each) -------------------------

async function loadLinkSuggestions() {
  const box = $("link-suggestions");
  box.classList.remove("hidden");
  box.textContent = "Looking for notes worth connecting…";
  const suggestions = await apiJson("/entries/link-suggestions").catch(() => []);
  box.replaceChildren();
  if (!suggestions.length) {
    box.textContent =
      "No new links to suggest, either everything related is already linked, or semantic search is off.";
    return;
  }
  // Was a bare space-between over three children, which put the backfill
  // button in the MIDDLE of the row between the sentence and the close
  // button: reported as "weirdly spaced". A heading and its actions is two
  // groups, not three peers: the sentence takes the slack, the buttons sit
  // together on the right.
  const heading = document.createElement("div");
  heading.className = "row link-suggest-head";

  const headingText = document.createElement("span");
  headingText.className = "muted link-suggest-title";
  headingText.textContent = "Notes that look related, link the ones you agree with:";

  const actions = document.createElement("div");
  actions.className = "row link-suggest-actions";

  // Asked directly: "none of my notes have a linked reason yet, is there an
  // easy way to give them all a reason?"
  //
  // It ran only the embedding pass, which can compare two vectors and has no
  // WORDS for what it found, so every reason it wrote was the literal string
  // "similar in meaning", the button looked like it worked and produced
  // reasons that said nothing. The endpoint runs the model over those
  // afterwards now, and this reports both numbers so it is obvious which
  // half did the work.
  //
  // **Not the same list as the rows below.** This explains links that
  // already exist elsewhere in the notebook; the rows here are proposed
  // links that don't exist yet. Reported as "doesn't work right" because
  // sitting directly above a list of unlinked suggestions, with nothing
  // distinguishing it, reads as if it should fill in *their* reason boxes, 
  // it can't, since a reason for a link that isn't made yet is exactly the
  // per-row box already offers (typed by hand, or left for the Link button's
  // own deduction). Labelled for what it actually touches instead.
  const backfill = smallButton(
    "ph:lightbulb Explain your existing links",
    "For links you've already made elsewhere: work out why each one exists, first from how alike the notes are, then by asking Atlas to name the actual connection. Doesn't touch the suggestions below, which aren't links yet.",
    async () => {
      backfill.disabled = true;
      setLabel(backfill, "ph:lightbulb Working…");
      const result = await apiJson("/entries/links/backfill-reasons", {
        method: "POST",
        body: JSON.stringify({ ai: true }),
      }).catch((e) => {
        toast(e.message, true);
        return null;
      });
      backfill.disabled = false;
      setLabel(backfill, "ph:lightbulb Explain your existing links");
      if (!result) return;
      const parts = [];
      if (result.updated) parts.push(`marked ${result.updated}`);
      if (result.rewritten) parts.push(`wrote a real reason for ${result.rewritten}`);
      if (parts.length) {
        toast(`Links: ${parts.join(", ")}.`);
        loadLinkSuggestions();
      } else if (result.ai_unavailable) {
        toast("Marked what I could, Atlas isn't running, so none could be put into words yet.", true);
      } else if (result.checked) {
        toast("Nothing left to explain, every link already has a reason.");
      } else {
        toast("Every link already has a reason.");
      }
    }
  );

  // Asked for directly, after the backfill button above was reported as
  // "doesn't fill in the empty Why boxes", correctly, because it never
  // could (it only ever touches links that already exist, see its own
  // comment). This is the actual thing that was missing: an AI guess for
  // *these* rows' own reason boxes, written in as a real value (not just a
  // placeholder) so it's visible, editable, and used as-is by Link if left
  // alone. `rowReasons` is populated by the suggestion loop below; the
  // click handler only runs once the user clicks, by which point it's full.
  const rowReasons = [];
  const suggestReasons = smallButton(
    "ph:sparkle Suggest reasons",
    "Ask Atlas to guess why each note pair below might be connected, and fill in any empty Why box with its answer, still yours to edit or clear before linking.",
    async () => {
      const targets = rowReasons.filter((r) => !r.input.value.trim());
      if (!targets.length) {
        toast("Every visible suggestion already has a reason.");
        return;
      }
      suggestReasons.disabled = true;
      setLabel(suggestReasons, "ph:sparkle Working…");
      const result = await apiJson("/entries/link-suggestions/reasons", {
        method: "POST",
        body: JSON.stringify({
          pairs: targets.map((r) => ({ source_id: r.s.source_id, target_id: r.s.target_id })),
        }),
      }).catch((e) => {
        toast(e.message, true);
        return null;
      });
      suggestReasons.disabled = false;
      setLabel(suggestReasons, "ph:sparkle Suggest reasons");
      if (!result) return;
      const byPair = new Map(
        result.reasons.map((r) => [`${r.source_id}:${r.target_id}`, r.reason])
      );
      let filled = 0;
      for (const r of targets) {
        const reason = byPair.get(`${r.s.source_id}:${r.s.target_id}`);
        if (reason) {
          r.input.value = reason;
          filled++;
        }
      }
      if (filled) {
        toast(`Filled in ${filled} reason${filled === 1 ? "" : "s"}.`);
      } else if (result.ai_unavailable) {
        toast("Atlas isn't running, so no reasons could be guessed.", true);
      } else {
        toast("Couldn't guess a reason for any of these.");
      }
    }
  );

  const closeAll = smallButton("ph:x", "Close suggestions", () => {
    box.classList.add("hidden");
    box.replaceChildren();
  });

  actions.append(backfill, suggestReasons, closeAll);

  // **Reasons arrive on their own now.** Asked for directly: "whenever a
  // link is suggested, the ai should suggest a reason that the user can
  // edit." The button above stays, it is how you retry after the model was
  // down, or refill a box you cleared, but a suggestion that needs a click
  // before it can say *why* is a suggestion most people will never see the
  // reason for.
  //
  // Fired after render rather than inside the endpoint: `/link-suggestions`
  // is a GET that already does one embedding scan, and putting a dozen
  // model round-trips behind it would turn opening this panel from instant
  // into a stall. This way the rows appear immediately with the deduced
  // text, and the AI's wording replaces it as each answer lands. Failure is
  // silent by design: the deduced reason is already showing as the box's
  // placeholder, and `create_link` deduces the same text server-side if the
  // box is left empty, so a failed guess costs nothing and there is nothing
  // to warn about.
  requestAnimationFrame(() => {
    // Only the top few automatically. Each pair is a model round-trip and
    // they run sequentially server-side, so filling all twelve unasked is a
    // long request on a slow local model for rows most people never scroll
    // to. The suggestions arrive best-first, so these are the ones worth
    // spending on; "Suggest reasons" still fills the rest on demand.
    const AUTO_REASON_LIMIT = 6;
    const pending = rowReasons
      .filter((r) => !r.input.dataset.userEdited)
      .slice(0, AUTO_REASON_LIMIT);
    if (!pending.length) return;
    apiJson("/entries/link-suggestions/reasons", {
      method: "POST",
      silent: true,
      body: JSON.stringify({
        pairs: pending.map((r) => ({ source_id: r.s.source_id, target_id: r.s.target_id })),
      }),
    })
      .then((result) => {
        const byPair = new Map(
          result.reasons.map((r) => [`${r.source_id}:${r.target_id}`, r.reason])
        );
        for (const r of pending) {
          // Never overwrite something typed while the request was in flight.
          if (r.input.dataset.userEdited) continue;
          const reason = byPair.get(`${r.s.source_id}:${r.s.target_id}`);
          if (reason) r.input.value = reason;
        }
      })
      .catch(() => {});
  });
  heading.append(headingText, actions);
  box.appendChild(heading);

  // Only this list scrolls when it's long: the heading above stays put.
  const rowsWrap = document.createElement("div");
  rowsWrap.className = "link-suggest-rows";
  box.appendChild(rowsWrap);

  for (const s of suggestions) {
    const row = document.createElement("div");
    row.className = "link-suggestion";
    const text = document.createElement("span");
    text.className = "link-suggestion-text";
    //: **The note's name, not its markdown.** Reported on 2026-09-09: this
    //: panel is "poorly designed and not consistent with the rest of the app
    //: ui style", with a screenshot whose rows read `"# Leafeon Pokemon image
    //: test ![WallpaperEngineOverride_ran..." ↔ "Some ideas for features I
    //: had: ![image.png](/media/8f5884..."`. That is not a styling problem:
    //: the server sends a raw slice of the note's content and this list
    //: printed it verbatim, so headings, image syntax and media paths landed
    //: in a sentence a person is meant to read. `notePreviewText` is what
    //: every other surface in this app already uses for exactly this, and it
    //: was the one caller that never did.
    const name = (raw) => {
      const clean = notePreviewText(raw || "").replace(/\s+/g, " ").trim();
      return clean.length > 70 ? `${clean.slice(0, 69)}…` : clean || "Untitled note";
    };
    const pair = `${name(s.source_preview)} ↔ ${name(s.target_preview)}`;
    text.append(document.createTextNode(pair));
    //: Truncating to one readable line means the whole of each name has to be
    //: reachable, and hover is what the rest of the app uses.
    text.title = `${notePreviewText(s.source_preview || "")}\n↔\n${notePreviewText(s.target_preview || "")}`;

    // **A reason you can type before you link.** Every suggestion offered
    // "similar in meaning" and there was no way to say anything else without
    // linking first, finding the link, and editing it, reported as the
    // suggestions refusing to offer reasons. Left blank, the server deduces
    // one exactly as before, so the fast path is unchanged.
    const reason = document.createElement("input");
    reason.type = "text";
    reason.className = "link-suggestion-reason";
    reason.maxLength = 80;
    reason.placeholder = s.reason && s.reason !== "similar in meaning"
      ? s.reason
      : "Why? (optional: Atlas will work it out)";
    reason.setAttribute("aria-label", "Reason for this link");
    // Marks the box as the user's the moment they touch it, so the
    // auto-fill above can never overwrite what someone is typing.
    reason.addEventListener("input", () => {
      reason.dataset.userEdited = "1";
    });
    rowReasons.push({ s, input: reason });

    const score = chip(`${Math.round(s.similarity * 100)}%`, "confidence");
    const link = smallButton("ph:link Link", "Connect these two notes", async () => {
      const given = reason.value.trim();
      await apiJson(`/entries/${s.source_id}/links`, {
        method: "POST",
        // Only sent when the user typed one. Left out, the server runs the
        // same deduction it always did and returns a real confidence score,
        // rather than a hand-built duplicate of it.
        body: JSON.stringify(given ? { target_id: s.target_id, reason: given } : { target_id: s.target_id }),
      }).catch((e) => toast(e.message, true));
      row.remove();
      toast(given ? "Linked, with your reason." : "Linked.");
      loadEntries().catch(() => {});
      if (!box.querySelector(".link-suggestion")) {
        box.classList.add("hidden");
      }
    });
    // Enter in the reason box links, which is what you have just described.
    reason.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        link.click();
      }
    });
    //: **A dismissal the notebook keeps.** This used to remove the row and
    //: nothing else, so the same pair was offered again on the next render,
    //: the next reload, and for ever: "a suggestion that comes back after
    //: being dismissed is the single most annoying thing a suggester can do",
    //: as `routes_entries.link_suggestions` puts it in the comment above the
    //: filter that was already waiting for this. The server has honoured
    //: `dismiss_link` corrections since Brief 23; the browser never sent one,
    //: which made the whole loop inert from the only end that can start it.
    //:
    //: The row goes whether or not the write lands: a dismissal that appears
    //: to do nothing because the notebook was busy is worse than one that is
    //: not remembered, and the pair comes back on the next render anyway if
    //: it was not.
    const dismiss = smallButton("ph:x", "Dismiss this suggestion", () => {
      row.remove();
      if (!box.querySelector(".link-suggestion")) {
        box.classList.add("hidden");
      }
      apiJson("/learned/corrections", {
        method: "POST",
        silent: true,
        body: JSON.stringify({
          kind: "dismiss_link",
          subject: { a: s.source_id, b: s.target_id },
        }),
      }).catch(() => {});
    });
    row.append(text, reason, score, link, dismiss);
    rowsWrap.appendChild(row);
  }
}

// Heuristic: does this Ollama model look like it can produce embeddings?
// Chat/generation models can't, Ollama answers /api/embed with 501, and
// picking one by mistake is the #1 way people break the search engine.
function looksLikeEmbeddingModel(name) {
  return /embed|minilm|bge|gte|e5|arctic/i.test(name || "");
}

async function applyEmbeddingBackend() {
  const backend = document.querySelector('input[name="emb-backend"]:checked')?.value;
  const model = $("embedding-model-select").value || null;
  if (!backend) return;
  // Guard the #1 misconfiguration: a chat model chosen as the search engine.
  if (backend === "ollama") {
    if (!model) {
      toast("Pick an embedding model first, e.g. nomic-embed-text.", true);
      return;
    }
    if (!looksLikeEmbeddingModel(model)) {
      const proceed = (await confirmDialog(
        `"${model}" doesn't look like an embedding model. Chat models can't create ` +
          "embeddings, so semantic search will fail (Ollama returns 501). Download and " +
          "pick a dedicated embedding model like nomic-embed-text instead.\n\nApply anyway?"
      ));
      if (!proceed) return;
    }
  }
  const ok = (await confirmDialog(
    `Switching the search engine re-indexes all ${allEntries.length} of your ` +
      "notes so search keeps making sense. Notes and keyword search stay " +
      "available while it runs. Continue?"
  ));
  if (!ok) {
    // Backing out puts the saved backend back on screen, rather than leaving
    // a radio selected for a switch that never happened.
    clearEmbeddingBackendLatch();
    refreshModelStatus();
    return;
  }
  try {
    await api("/models/embedding-backend", {
      method: "POST",
      body: JSON.stringify({ backend, model: backend === "ollama" ? model : null }),
    });
    clearEmbeddingBackendLatch(); // applied: polling may reflect it again
    refreshModelStatus();
  } catch (error) {
    toast(error.message, true);
  }
}

// Let the status poll own the radios again. Called once a choice is applied,
// and when the user backs out of applying it, otherwise a cancelled switch
// would leave the radio showing a backend that was never saved, which is the
// same lie in the opposite direction.
function clearEmbeddingBackendLatch() {
  delete $("embedding-model-select").dataset.userChosen;
  for (const radio of document.querySelectorAll('input[name="emb-backend"]')) {
    delete radio.dataset.userChosen;
  }
}

// --- keeping the look across restarts (§35E) --------------------------------
//
// Reported as two bugs: *"the theme resets to default on every start"* and
// *"onboarding shows every time"*. They are one bug. Both were stored in
// `localStorage` and nowhere else, and the desktop shell does not reliably
// persist it: pywebview is a different browser with its own profile, and if
// that profile is not stable across launches then everything kept there is
// something the app forgets. Two symptoms, one storage, exactly as §35E
// predicted.
//
// The fix is a mirror, not a move. localStorage stays the thing every
// `appearancePref` read goes through: it is synchronous, it works with the
// server unreachable, and moving the reads would mean rewriting the whole
// appearance system to be async. The server keeps a copy, seeded back into
// localStorage on load when the local one is empty, so a shell that loses it
// gets it back, and a browser that keeps it never notices.

//: The keys worth surviving a restart. Explicit rather than "everything in
//: localStorage": this is written to the notebook's own preferences file, and
//: scroll positions and one-visit UI state have no business in there.
// The appearance half is `LOOK_KEYS`, the same list a saved custom theme
// snapshots: rather than a second hand-written copy of it. The first draft
// *was* a hand-written copy, and it guessed two key names wrong ("bgart",
// "bgart-motion" for what are really `bgArt`, `bg-style`, `bg-motion` and
// `bg-intensity`), so the background art would have been the one setting that
// still did not survive a restart. Deriving it cannot be wrong.
// Everything not covered by the look: the tour flag, and the few view
// settings that are properties of how you use the app rather than of one
// visit.
const MIRRORED_UI_EXTRAS = [
  "themePreset",
  "motion",
  "custom-css",
  "onboardingDone",
  // The guided tour's own flag, for the same reason `onboardingDone` is here:
  // both were reported as "onboarding shows every time" when the desktop
  // shell lost its profile, and a tour that reintroduces the app to somebody
  // who has already been through it is the same bug wearing the new feature.
  "tourDone",
  "activeTab",
  "graph-layout",
  "graph-colour",
  "graph-options-open",
  "graph-trace-open",
  // The options panel's three folds, keyed `graph-fold-<the section's id>` by
  // `initGraphOptionFolds` far below. Written out rather than spread from a
  // constant beside that function: this array is read at module level and the
  // constant would be declared hundreds of lines later, which is the
  // temporal-dead-zone blank app the comment above already describes.
  "graph-fold-graph-physics",
  "graph-fold-graph-groups-section",
  "graph-fold-graph-minimap-section",
  "chat-composer-height",
  "wb-bg-color",
  "wb-panel-pos-board",
  "wb-panel-pos-library",
  "wb-panel-pos-tools",
  "wb-panel-pos-zoom",
];

// A function rather than a `const` array, because `LOOK_KEYS` is declared
// several hundred lines below this one and a top-level spread of it would be
// read before its initialiser had run, a temporal-dead-zone error at load,
// which in a file with no bundler means a blank app.
function mirroredUiKeys() {
  return [...LOOK_KEYS, ...MIRRORED_UI_EXTRAS];
}

let uiStateSaveTimer = null;

//: Whether the boot restore has had its turn. Until it has, this browser does
//: not yet know what the server is holding, and a save would be a guess: the
//: tab restore writes `activeTab` at module level, which schedules a save for
//: 800 ms later, and on this sandbox that lands *before* the unlock and the
//: `/preferences` read that follows it have finished. So a cold start wrote a
//: `ui_state` built from a browser that had not been given its settings back
//: yet, which is both a wasted PUT (A2) and, on a browser that had lost
//: `localStorage`, the one write that could make the loss permanent.
//:
//: Dropped rather than deferred, the same as the `authToken()` guard below and
//: for the same reason: `watchMirroredUiKeys` sees every later write, so the
//: next real change saves, and nothing here is the only copy of anything.
let uiStateSeeded = false;

//: The mirrored state the server is known to be holding, as the same JSON this
//: file would send. Null until something establishes it: either the boot seed
//: below (the server told us) or a save that came back (we told the server).
//:
//: **Why it exists** (WORLD_CLASS_PLAN A2). `seedUiStateFromServer` writes the
//: server's copy into `localStorage`, and `watchMirroredUiKeys` has patched
//: `setItem` to schedule a save on exactly those keys, so every cold start
//: ended with a PUT of the document it had just been given. One of the four
//: `/preferences` requests a boot was making was this round trip, and the same
//: shape fires again whenever a control is set to the value it already had.
let uiStateOnServer = null;

//: The payload, built from `localStorage`, in `mirroredUiKeys()` order so two
//: of these are comparable as strings.
function uiStatePayload() {
  const state = {};
  for (const key of mirroredUiKeys()) {
    const value = localStorage.getItem(key);
    if (value != null) state[key] = String(value).slice(0, 400);
  }
  return state;
}

//: The same shape, built from a server document, so the comparison is between
//: like and like: the server's `ui_state` can carry keys this build no longer
//: mirrors (an old key, a key from a newer version), and those must not read as
//: a difference worth a write.
function uiStateFingerprint(state) {
  const out = {};
  for (const key of mirroredUiKeys()) {
    if (state[key] != null) out[key] = String(state[key]).slice(0, 400);
  }
  return JSON.stringify(out);
}

// Write the mirrored keys to the server, coalesced. Debounced because the
// appearance panel fires a change per slider tick, and a preferences write per
// tick would be a write per pixel of a corner-radius drag.
function saveUiState() {
  clearTimeout(uiStateSaveTimer);
  uiStateSaveTimer = setTimeout(() => {
    // Not before the unlock. The tab restore writes `activeTab` at module
    // level, which schedules a save that would land while the lock screen is
    // still up: a guaranteed 401 on every cold load, visible in the browser's
    // network log and in the server's, where it reads as an auth failure worth
    // investigating. §35E-bis found exactly this in the reminder poll; the
    // guard is the same one, for the same reason.
    if (!authToken()) return;
    if (!uiStateSeeded) return;
    const state = uiStatePayload();
    const sending = JSON.stringify(state);
    //: Nothing has changed since the server and this browser last agreed, so
    //: there is nothing to back up. Local still wins when they differ: this
    //: only skips the write, it never skips a difference.
    if (sending === uiStateOnServer) return;
    // Silent and best-effort. This is a backup of something that already
    // worked locally; a toast about it would be noise about a copy.
    apiJson("/preferences", {
      method: "PUT",
      body: JSON.stringify({ ui_state: state }),
      silent: true,
    })
      .then(() => {
        uiStateOnServer = sending;
      })
      .catch(() => {});
  }, 800);
}

// Mirror every write to a watched key, from one place.
//
// There are twenty-odd sites that write these, a theme toggle, eight
// appearance controls, the graph's pickers, onboarding. Adding a `saveUiState()`
// call to each would work today and rot the moment somebody adds the
// twenty-third and forgets: the setting would keep working in a browser and
// quietly stop surviving a desktop restart, which is a bug nobody would
// connect to the commit that caused it.
//
// So the *store* is watched instead of its callers. Adding a key to
// MIRRORED_UI_KEYS is then the whole of making a new setting persistent, which
// is the property worth having. Only the listed keys trigger a save; every
// other `localStorage` write in the app is untouched and unwatched.
function watchMirroredUiKeys() {
  const mirrored = new Set(mirroredUiKeys());
  const store = window.localStorage;
  const setItem = store.setItem.bind(store);
  const removeItem = store.removeItem.bind(store);
  // Own properties shadowing Storage.prototype, the storage itself is
  // untouched, so anything else reading it (including these two) is unaffected.
  store.setItem = (key, value) => {
    setItem(key, value);
    if (mirrored.has(String(key))) saveUiState();
  };
  store.removeItem = (key) => {
    removeItem(key);
    // A removal is a change too: clearing an explicit theme to fall back to
    // the system one has to survive a restart just as setting one does.
    if (mirrored.has(String(key))) saveUiState();
  };
}

// Seed localStorage from the server's copy, for keys the browser has lost.
// Called once, before the look is applied, so the app paints in the remembered
// theme rather than flashing the default and correcting itself.
//
// **Local wins.** If a key exists in both, the local one is newer by
// definition, it is what the person set in this browser, and overwriting it
// with a copy saved from another window would make two open windows fight.
function seedUiStateFromServer(state) {
  if (!state || typeof state !== "object") return false;
  let restored = 0;
  for (const key of mirroredUiKeys()) {
    if (localStorage.getItem(key) == null && state[key] != null) {
      localStorage.setItem(key, String(state[key]));
      restored += 1;
    }
  }
  //: What the server is holding, recorded so the saves those `setItem` calls
  //: just scheduled can tell "this browser had lost its settings and has now
  //: been given them back" from "the person changed something" (A2). Set after
  //: the loop and before the 800 ms debounce fires, so the first save of the
  //: session compares against it. A browser that kept a key the server does not
  //: have still differs here, and still writes: local wins, as the comment
  //: above says, and that is the case this must not swallow.
  uiStateOnServer = uiStateFingerprint(state);
  return restored > 0;
}

// Which manual overrides are currently sitting on top of the theme. Shown in
// the UI so "why isn't the theme's colour showing?" has a visible answer.
const OVERRIDABLE_KEYS = [
  "theme", "palette", "accent", "accent-custom", "page-bg", "font", "fontsize",
  "density", "radius", "glass", "glass-blur", "glass-opacity", "glass-sheen", "page-wash",
  "glass-sheen-strength", "bg-style", "bg-motion", "bg-intensity", "zoom",
];

// LOOK_KEYS stays here, not in settings.js with the rest of "your own saved
// themes" (§88.3 item 4): mirroredUiKeys() above spreads it into its own
// list from a bare top-level call in this file's own wiring
// (`watchMirroredUiKeys();`), which runs before settings.js has loaded, so
// it has to already exist here. OVERRIDABLE_KEYS above is kept for the same
// reason (LOOK_KEYS is built from it). settings.js's saveCurrentLook() and
// friends read both across the file boundary, which is safe: they only ever
// run from a user's own click, long after every script has loaded.
const LOOK_KEYS = [...OVERRIDABLE_KEYS, "bgArt"];

function applyPalette(id, remember = true) {
  const root = document.documentElement;
  // "default" means "no palette overrides", leave the attribute off rather
  // than shipping a block that restates the base :root values.
  if (id && id !== "default") root.dataset.palette = id;
  else delete root.dataset.palette;
  if (remember) localStorage.setItem("palette", id || "default");
  // The generative background paints from the accent, so it has to be rebuilt, 
  // and so does the dashboard constellation, for the same reason.
  if (bgArtOn()) startBgArt();
  // Guarded since the dashboard.js split (roadmap §88.3 item 3): originally
  // because applyPalette() was reachable from a bare top-level call in THIS
  // file's own wiring (`applyAppearance()` -> `applyPalette()`, painting the
  // saved appearance before first render) while dashboard.js, which owns
  // `refreshArtForTheme`, hadn't loaded yet. An unguarded call threw
  // `ReferenceError: refreshArtForTheme is not defined` from inside that
  // exact chain and aborted the rest of app.js's synchronous top-level code
  // (same shape as the `initDocSidebarTabs()` hazard documents.js's split
  // found). The settings.js split (item 4) moved that bare call itself, 
  // `applyAppearance()` now runs from settings.js's own tail, after
  // dashboard.js has already loaded, so this guard now always passes at
  // that call site too. Left in place rather than removed: applyPalette()
  // stays a plain global function, callable from anywhere, and nothing
  // guarantees a *future* caller runs this late, the guard is what makes
  // that safe by construction instead of by "nothing calls it early right
  // now." Still a genuine no-op either way at today's one early call site:
  // the dashboard's art widget hasn't mounted a canvas yet at startup
  // (`artHolder` is still null), so `refreshArtForTheme()` returns
  // immediately regardless of whether the guard lets it run. Every other
  // call site (the theme toggle, the accent/theme pickers, the OS
  // dark-mode listener) fires only from user interaction, well after every
  // script has loaded.
  if (typeof refreshArtForTheme === "function") refreshArtForTheme();
}
