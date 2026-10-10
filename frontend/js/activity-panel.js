// activity-panel.js: the Running tab of the Activity panel (WORLD_CLASS_PLAN
// 28.1 rule 5, decision 70). Lazy (LAZY_MODULES.activity): agent-activity.js
// opens the panel and loads this the first time the tab is shown.
//
// The list is the server's (`GET /activity`): every row `routes_tasks.collect`
// draws, the booked runs it does not, and what registered with
// `core/activity.py` (an answer streaming, a transcription, a reading). This
// file renders whatever it is given, so a new kind of job needs no edit here.

//: Polled while the tab is in view, every two seconds: the bar is the answer
//: to "is it still working?", and a slower bar reads as frozen.
const ACTIVITY_POLL_MS = 2000;
let activityPollTimer = null;

function activityRunningShown() {
  return !$("agent-monitor").classList.contains("hidden") && !$("activity-running").classList.contains("hidden");
}

async function renderActivity() {
  clearTimeout(activityPollTimer);
  if (!activityRunningShown()) return;
  const body = await apiJson("/activity", { silent: true }).catch(() => null);
  if (body) paintActivity(body);
  activityPollTimer = setTimeout(renderActivity, ACTIVITY_POLL_MS);
}
window.renderActivity = renderActivity;

function activityModelLine(model) {
  const line = $("activity-model");
  if (!model || !model.model) {
    line.textContent = "No chat model is set.";
    return;
  }
  const where = model.loaded === true ? "in memory" : model.loaded === false ? "not in memory" : "state unknown";
  line.textContent = `Model: ${model.model}, ${where}.`;
}

function activityRow(job, now) {
  const li = document.createElement("li");
  li.dataset.jobId = job.id;
  const row = document.createElement("div");
  row.className = "entry-meta";
  const name = document.createElement("strong");
  name.textContent = job.label;
  row.appendChild(name);
  if (job.started && now) {
    const took = document.createElement("span");
    took.className = "muted task-elapsed";
    took.textContent = `${job.queued ? "waiting " : ""}${taskElapsed(now - job.started)}`;
    row.appendChild(took);
  }
  if (job.stoppable) {
    const actions = document.createElement("span");
    actions.className = "entry-actions";
    actions.appendChild(smallButton("ph:stop-circle Stop", `Stop ${job.label.toLowerCase()} at its next step`, () => stopActivityJob(job.id)));
    row.appendChild(actions);
  }
  li.appendChild(row);
  if (job.detail) {
    const detail = document.createElement("p");
    detail.className = "muted task-detail";
    detail.textContent = job.detail;
    li.appendChild(detail);
  }
  if (!job.queued) {
    const bar = document.createElement("progress");
    bar.className = "task-progress";
    if (typeof job.progress === "number") {
      bar.max = 1;
      bar.value = job.progress;
    }
    bar.setAttribute("aria-label", job.label);
    li.appendChild(bar);
  }
  return li;
}

function paintActivity(body) {
  activityModelLine(body.model);
  const jobs = body.jobs || [];
  $("activity-list").replaceChildren(...jobs.map((job) => activityRow(job, body.now)));
  $("activity-empty").classList.toggle("hidden", jobs.length > 0);
}

async function stopActivityJob(id) {
  try {
    const result = await apiJson(`/activity/${encodeURIComponent(id)}/stop`, { method: "POST" });
    toast(result.detail || (result.stopped ? "Stopping." : "It had already finished."), "info");
  } catch (e) {
    toastAction(`Could not stop that job: ${e.message}`, "Try again", () => stopActivityJob(id));
  }
  renderActivity();
}

async function stopActivityModel() {
  try {
    const result = await apiJson("/activity/model/stop", { method: "POST" });
    toast(result.detail, "info");
  } catch (e) {
    toastAction(`Could not stop the model: ${e.message}`, "Try again", stopActivityModel);
  }
  renderActivity();
}
window.stopActivityModel = stopActivityModel;

async function stopAllActivity() {
  const body = await apiJson("/activity", { silent: true }).catch(() => null);
  const jobs = ((body && body.jobs) || []).filter((job) => job.stoppable);
  if (!jobs.length) {
    toast("Nothing running can stop part way.", "info");
    return;
  }
  await Promise.all(jobs.map((job) => apiJson(`/activity/${encodeURIComponent(job.id)}/stop`, { method: "POST" }).catch(() => null)));
  toast(`Asked ${jobs.length} job${jobs.length === 1 ? "" : "s"} to stop.`, "info");
  renderActivity();
}
window.stopAllActivity = stopAllActivity;

// --- The panel's tabs and its ⋯, wired once when this file loads ----------

function setActivityTab(name) {
  for (const tab of document.querySelectorAll("#activity-tabs [role=tab]")) {
    const on = tab.dataset.value === name;
    tab.setAttribute("aria-selected", String(on));
    tab.tabIndex = on ? 0 : -1;
  }
  $("activity-running").classList.toggle("hidden", name !== "running");
  $("activity-runs").classList.toggle("hidden", name !== "runs");
  //: The broom and the log are the runs' own controls.
  $("agent-monitor-clear")?.classList.toggle("hidden", name !== "runs");
  $("agent-monitor-log-toggle")?.classList.toggle("hidden", name !== "runs");
  if (name === "running") renderActivity();
}
window.setActivityTab = setActivityTab;

for (const tab of document.querySelectorAll("#activity-tabs [role=tab]")) {
  tab.addEventListener("click", () => setActivityTab(tab.dataset.value));
  tab.addEventListener("keydown", (event) => {
    if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
    const next = tab.dataset.value === "running" ? "runs" : "running";
    setActivityTab(next);
    document.querySelector(`#activity-tabs [data-value="${next}"]`)?.focus();
  });
}

//: The panel's ⋯ (the `kebabMenu` recipe): what acts on the whole panel.
{
  const slot = $("activity-more");
  const menu = kebabMenu([
    { label: "ph:stop-circle Stop the model", title: "Stop any answer and unload the model from memory", run: stopActivityModel },
    { label: "ph:stop Stop everything", title: "Stop every job that can stop part way", run: stopAllActivity },
    { label: "ph:terminal-window Show the log", title: "The agent's log lines, on the Agent runs tab", group: "runs", run: () => {
      setActivityTab("runs");
      setAgentMonitorLogVisible(true);
    } },
    { label: "ph:broom Clear finished runs", title: "Clear finished runs", group: "runs", run: () => $("agent-monitor-clear")?.click() },
    { label: "ph:gear Background tasks settings", title: "History, last runs and schedules", group: "settings", run: () => openSettingsModal("tasks") },
  ], "More activity actions");
  menu.id = "activity-more";
  menu.querySelector("button")?.classList.add("dialog-head-btn");
  slot?.replaceWith(menu);
}
