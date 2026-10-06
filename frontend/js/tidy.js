// tidy.js: Tidy, the notebook's housekeeping as rules (INBOX 691).
//
// Lazy (app.js `LAZY_MODULES.tidy`), fetched a few seconds after boot so the
// Notes dock's count is there without the boot scripts carrying it, and
// entered through `openTidySheet`, a `LAZY_ENTRY_POINTS` stand-in. The owner:
// "a way to better sort through links and tags without the ai ... needs to
// also be known to the user, no use having them if the user doesnt know about
// them". The rules are the server's (`entry/tidy.py`, `/tidy`): this file
// draws them as one sheet on the suggestions inbox's recipe (a select of
// reviews, each worded and counted; one line of description; the rows), with
// the Attach picker's checkable rows (`note-picker-row`), a tool row (the
// review's level, its Apply automatically switch, Select all and none) and a
// foot whose one filled button applies the ticked rows. Each apply is one
// Undo, in the toast, on Ctrl+Z and in the sheet's Recent runs.

const TIDY_HELP = [
  "Each review is a rule that needs no AI. Pick one from the list, tick the rows to change (each says why it is listed and what Apply would do), then Apply. One Undo puts the whole batch back, from the toast, Ctrl+Z or Recent runs.",
  "Links to explain gives a link that only says “similar in meaning” the tag, name or week its two notes share. Weak automatic links lists links made from likeness alone with a weak score; the strength list widens it.",
  "Tags Atlas added lists tags written by Atlas or a background pass, never changed by you, that are not in their note's words and rare in its category. Tags used once and Tags that look alike are the tag manager's two checks, applied in bulk.",
  "Notes without a category offers the category the note's words point to, from your own filed notes. Near-duplicate notes merge into one note (the others go to the bin). Empty or very short notes go to the bin. Reminders long past are marked done.",
  "Apply automatically runs a review after each note is filed, as Tidy, listed under Recent runs with its Undo. Merging, binning and removing tags used once always ask first.",
];

//: The open sheet's state, and the count's last fetch and its pending
//: redraw timer: one host object, not three top-level lets (the global-scope
//: ratchet, tests/test_global_scope_ratchet.py).
const TIDY = { state: null, badgeAt: 0, badgeTimer: 0 };

//: The Notes dock's count: how many rows every review finds. Fetched when the
//: module arrives, after a change made here, and when the notes list redraws
//: (debounced, at most every 20 s), so a note filed elsewhere moves it.
async function tidyBadge(force = false) {
  const now = Date.now();
  if (!force && now - TIDY.badgeAt < 20000) return;
  TIDY.badgeAt = now;
  const body = await apiJson("/tidy", { silent: true }).catch(() => null);
  if (!body) return;
  if (TIDY.state) tidyCounts(body);
  const count = $("notes-tidy-count");
  const button = $("notes-tidy");
  if (!count || !button) return;
  count.textContent = body.total > 99 ? "99+" : body.total ? String(body.total) : "";
  count.hidden = !body.total;
  const words = body.total ? `Tidy, ${body.total} to look at` : "Tidy";
  button.setAttribute("aria-label", words);
  button.title = body.total
    ? `Tidy: ${body.total} things to look at (weak links, stray tags, uncategorised and duplicate notes, old reminders)`
    : "Tidy: weak links, stray tags, uncategorised and duplicate notes, old reminders";
}

function tidyWatchList() {
  const list = $("entry-list");
  if (!list || list.dataset.tidyWatched) return;
  list.dataset.tidyWatched = "1";
  new MutationObserver(() => {
    clearTimeout(TIDY.badgeTimer);
    TIDY.badgeTimer = setTimeout(() => tidyBadge(), 3000);
  }).observe(list, { childList: true });
}

async function openTidySheet(review = "") {
  if (TIDY.state) {
    if (review) tidyShow(review);
    return;
  }
  const state = { key: "", reviews: {}, options: {}, rows: [], ticked: new Set(), level: "" };
  TIDY.state = state;
  state.close = openSheet({
    label: "Tidy",
    name: "tidy",
    onClose: () => {
      TIDY.state = null;
    },
    build: (card) => {
      card.classList.add("inbox-card", "tidy-card");
      tidyHead(card);
      const select = document.createElement("select");
      select.id = "tidy-review";
      select.className = "inbox-kind";
      select.setAttribute("aria-label", "Review");
      select.title = "Which review";
      select.addEventListener("change", () => tidyShow(select.value));
      state.select = select;
      const about = document.createElement("p");
      about.className = "muted inbox-desc";
      about.id = "tidy-about";
      const tools = document.createElement("div");
      tools.className = "tidy-tools";
      const list = document.createElement("ul");
      list.className = "note-picker-list tidy-list";
      list.id = "tidy-list";
      list.setAttribute("aria-label", "What this review found");
      const foot = document.createElement("div");
      foot.className = "tidy-foot";
      //: Recent runs fold away (closed), so the rows keep the sheet's height.
      const history = document.createElement("details");
      history.className = "tidy-history";
      history.id = "tidy-history";
      Object.assign(state, { about, tools, list, foot, history });
      card.append(select, about, tools, list, foot, history);
    },
  });
  const body = await apiJson("/tidy", { silent: true }).catch(() => null);
  if (TIDY.state !== state) return;
  if (!body) {
    setLabel(state.list, "ph:warning Couldn't read the reviews. Try again in a moment.");
    return;
  }
  for (const r of body.reviews) {
    state.reviews[r.key] = r;
    const option = document.createElement("option");
    option.value = r.key;
    option.dataset.label = r.label;
    state.options[r.key] = option;
    state.select.appendChild(option);
  }
  tidyCounts(body);
  const first = review || body.reviews.find((r) => r.count)?.key || body.reviews[0].key;
  await tidyShow(first);
  tidyHistory();
}

//: The head: the title, its '?', then the close (the inbox's head).
function tidyHead(card) {
  const head = card.querySelector(".sheet-head");
  if (!head) return;
  const help = document.createElement("button");
  help.type = "button";
  help.className = "icon-only ghost small dialog-head-btn";
  help.setAttribute("data-help-for", "tidy-help");
  help.setAttribute("aria-controls", "tidy-help");
  help.setAttribute("aria-expanded", "false");
  help.title = "About Tidy";
  help.setAttribute("aria-label", "About Tidy");
  const icon = document.createElement("i");
  icon.className = "ph ph-question";
  icon.setAttribute("aria-hidden", "true");
  help.appendChild(icon);
  const actions = document.createElement("span");
  actions.className = "dialog-head-actions";
  const closeButton = head.querySelector(".sheet-close");
  if (closeButton) actions.appendChild(closeButton);
  head.querySelector(".sheet-title")?.after(help);
  head.appendChild(actions);
  const helpBody = document.createElement("div");
  helpBody.className = "help-body hidden";
  helpBody.id = "tidy-help";
  helpBody.setAttribute("role", "dialog");
  helpBody.setAttribute("aria-label", "About Tidy");
  for (const line of TIDY_HELP) {
    const p = document.createElement("p");
    p.textContent = line;
    helpBody.appendChild(p);
  }
  head.after(helpBody);
}

//: Each review's row in the select carries its count, "Weak automatic links (4)".
function tidyCounts(body) {
  const state = TIDY.state;
  if (!state) return;
  for (const r of body.reviews) {
    state.reviews[r.key] = { ...state.reviews[r.key], ...r };
    const option = state.options[r.key];
    if (option) option.textContent = r.count ? `${r.label} (${r.count})` : r.label;
  }
  if (state.select && state.key) state.select.value = state.key;
}

async function tidyShow(key, level = "") {
  const state = TIDY.state;
  if (!state || !state.options[key]) return;
  state.key = key;
  state.select.value = key;
  const review = state.reviews[key];
  state.level = level || review.level || "";
  state.about.textContent = review.about;
  state.list.replaceChildren();
  state.foot.replaceChildren();
  setLabel(state.list, "ph:spin Looking…");
  tidyTools(review);
  const query = state.level ? `?level=${encodeURIComponent(state.level)}` : "";
  const body = await apiJson(`/tidy/${encodeURIComponent(key)}${query}`, { silent: true }).catch(() => null);
  if (TIDY.state !== state || state.key !== key) return;
  state.rows = body ? body.rows : [];
  state.ticked = new Set(state.rows.filter((r) => r.ticked).map((r) => r.id));
  tidyRows();
  if (body && state.options[key]) {
    state.reviews[key].count = body.count;
    state.options[key].textContent = body.count ? `${review.label} (${body.count})` : review.label;
    state.select.value = key;
  }
}

const TIDY_LEVEL_WORDS = {
  weak: "Strength: weak",
  some: "Strength: weak or some",
  strong: "Strength: any",
  low: "Fit under 25%",
  medium: "Fit under 50%",
  high: "Fit under 75%",
};

//: The tool row: the review's level, its automatic switch, then the doors to
//: the tool it belongs with (the tag manager, the filings to check).
function tidyTools(review) {
  const state = TIDY.state;
  state.tools.replaceChildren();
  if (review.levels?.length) {
    const level = document.createElement("select");
    level.id = "tidy-level";
    level.setAttribute("aria-label", "Which rows to list");
    level.title = "Which rows to list";
    for (const value of review.levels) {
      const option = document.createElement("option");
      option.value = value;
      option.textContent = TIDY_LEVEL_WORDS[value] || value;
      level.appendChild(option);
    }
    level.value = state.level;
    level.addEventListener("change", () => tidyShow(review.key, level.value));
    state.tools.appendChild(level);
  }
  if (review.can_auto) {
    const label = document.createElement("label");
    label.className = "setting-check tidy-auto";
    const box = document.createElement("input");
    box.type = "checkbox";
    box.id = "tidy-auto";
    box.checked = !!review.auto;
    const words = document.createElement("span");
    words.textContent = "Apply automatically";
    label.title = "Run this review after each note is filed; every run is listed below with its Undo";
    box.addEventListener("change", async () => {
      const result = await apiJson("/tidy/auto", { method: "PUT", body: JSON.stringify({ key: review.key, on: box.checked }) }).catch((e) => {
        toast(e.message, true);
        return null;
      });
      if (!result) {
        box.checked = !box.checked;
        return;
      }
      review.auto = result.auto;
      toast(result.auto ? `${review.label} now runs after each note is filed.` : `${review.label} waits for you again.`);
    });
    label.append(box, words);
    state.tools.appendChild(label);
  }
  const doors = {
    "rare-tags": ["ph:hash Tag manager", "Rename, merge or remove tags by hand", () => openTagsSheet()],
    "lookalike-tags": ["ph:hash Tag manager", "Rename, merge or remove tags by hand", () => openTagsSheet()],
    uncategorised: ["ph:check-square Filings to check", "The Notes list filtered to is:review: filings Atlas was unsure of", () => {
      state.close();
      showNotesFilter("is:review");
    }],
    "weak-links": ["ph:lightbulb Suggestions", "Links to add, decided one by one", () => openSuggestionsInbox("links")],
  };
  const door = doors[review.key];
  if (door) {
    const button = smallButton(door[0], door[1], door[2]);
    button.classList.add("tidy-door");
    state.tools.appendChild(button);
  }
}

function tidyRows() {
  const state = TIDY.state;
  state.list.replaceChildren();
  if (!state.rows.length) {
    const empty = document.createElement("li");
    empty.className = "muted empty-line tidy-empty";
    empty.textContent = "Nothing to tidy here.";
    state.list.appendChild(empty);
  }
  for (const row of state.rows) state.list.appendChild(tidyRow(row));
  tidyFoot();
}

function tidyRow(row) {
  const state = TIDY.state;
  const li = document.createElement("li");
  const label = document.createElement("label");
  label.className = "note-picker-row tidy-row";
  const box = document.createElement("input");
  box.type = "checkbox";
  box.className = "visually-hidden note-picker-box";
  box.checked = state.ticked.has(row.id);
  box.disabled = !row.selectable;
  box.addEventListener("change", () => {
    if (box.checked) state.ticked.add(row.id);
    else state.ticked.delete(row.id);
    tidyFoot();
  });
  const lines = document.createElement("span");
  lines.className = "note-picker-lines";
  const name = document.createElement("span");
  name.className = "note-picker-text";
  name.textContent = row.title;
  name.title = row.title;
  const meta = document.createElement("span");
  meta.className = "note-picker-meta";
  meta.textContent = row.detail;
  meta.title = row.detail;
  const change = document.createElement("span");
  change.className = "tidy-change";
  setLabel(change, `ph:arrow-right ${row.change}`);
  change.title = row.change;
  lines.append(name, meta, change);
  const check = document.createElement("span");
  check.className = "note-picker-check";
  check.setAttribute("aria-hidden", "true");
  const tick = document.createElement("i");
  tick.className = "ph ph-check";
  check.appendChild(tick);
  label.append(box, lines, check);
  if (!row.selectable) label.classList.add("is-off");
  li.appendChild(label);
  return li;
}

//: The foot: how many are ticked, Select all and none, then the one filled
//: button; the link reasons review adds the whole-notebook background pass.
function tidyFoot() {
  const state = TIDY.state;
  const review = state.reviews[state.key];
  state.foot.replaceChildren();
  const selectable = state.rows.filter((r) => r.selectable);
  const n = selectable.filter((r) => state.ticked.has(r.id)).length;
  const count = document.createElement("span");
  count.className = "muted tidy-count";
  count.setAttribute("role", "status");
  count.textContent = selectable.length ? `${n} of ${selectable.length} ticked` : "";
  const all = smallButton("ph:checks All", "Tick every row", () => {
    for (const r of selectable) state.ticked.add(r.id);
    tidyRows();
  });
  const none = smallButton("ph:square None", "Untick every row", () => {
    state.ticked.clear();
    tidyRows();
  });
  all.disabled = !selectable.length;
  none.disabled = !n;
  const end = document.createElement("span");
  end.className = "tidy-foot-end";
  if (review?.key === "link-reasons") {
    end.appendChild(smallButton("ph:play Name all in the background", "Name every link reason the notes can, as a background job you can stop from Background tasks", tidyRunLinkReasons));
  }
  const apply = smallButton(`ph:check ${tidyApplyWords(review?.key, n)}`, "Make the change on every ticked row", () => tidyApply(apply), false);
  apply.id = "tidy-apply";
  apply.disabled = !n;
  end.appendChild(apply);
  state.foot.append(count, all, none, end);
}

function tidyApplyWords(key, n) {
  const verb = { "weak-links": "Unlink", "auto-tags": "Remove", "rare-tags": "Remove", "lookalike-tags": "Merge", uncategorised: "Move", duplicates: "Merge", "short-notes": "Bin", "stale-reminders": "Mark done", "link-reasons": "Name" }[key] || "Apply";
  return n ? `${verb} ${n}` : verb;
}

async function tidyApply(button) {
  const state = TIDY.state;
  const key = state.key;
  const ids = [...state.ticked];
  const level = state.level;
  setBusy(button, true, "Working…");
  const result = await apiJson(`/tidy/${encodeURIComponent(key)}/apply`, { method: "POST", body: JSON.stringify({ ids, level }) }).catch((e) => {
    toast(e.message, true);
    return null;
  });
  setBusy(button, false);
  if (!result) return;
  if (!result.applied) {
    toast(result.message || "Nothing to change.", "info");
    return;
  }
  let undoId = result.undo_id;
  const undo = async () => {
    await apiJson(`/tidy/undo/${undoId}`, { method: "POST" });
    await tidyAfterChange();
  };
  const redo = async () => {
    const again = await apiJson(`/tidy/${encodeURIComponent(key)}/apply`, { method: "POST", body: JSON.stringify({ ids, level }) });
    undoId = again.undo_id;
    await tidyAfterChange();
  };
  const action = pushUndo(result.message, undo, redo);
  toastAction(`${result.message}.`, "Undo", async () => {
    settleUndoFromToast(action);
    await undo();
  });
  await tidyAfterChange();
}

async function tidyAfterChange() {
  await loadEntries();
  await tidyBadge(true);
  if (TIDY.state) {
    await tidyShow(TIDY.state.key, TIDY.state.level);
    tidyHistory();
  }
}

async function tidyRunLinkReasons() {
  const result = await apiJson("/tidy/link-reasons/run", { method: "POST" }).catch((e) => {
    toast(e.message, true);
    return null;
  });
  if (result) toast("Naming link reasons in the background. Stop it from Settings, Background tasks.");
}

//: Recent runs: the last five, each with its Undo until it has been undone.
async function tidyHistory() {
  const state = TIDY.state;
  if (!state) return;
  const body = await apiJson("/tidy/history?limit=5", { silent: true }).catch(() => null);
  if (TIDY.state !== state) return;
  state.history.replaceChildren();
  const runs = body?.runs || [];
  if (!runs.length) return;
  const head = document.createElement("summary");
  head.className = "tidy-history-head";
  const caret = document.createElement("i");
  caret.className = "ph ph-caret-down contents-caret";
  caret.setAttribute("aria-hidden", "true");
  head.append(caret, ` Recent runs (${runs.length})`);
  const list = document.createElement("ul");
  list.className = "tidy-history-list";
  for (const run of runs) {
    const li = document.createElement("li");
    li.className = "tidy-history-row";
    const text = document.createElement("span");
    text.className = "tidy-history-text";
    text.textContent = `${run.message}${run.automatic ? ", automatically" : ""} · ${relativeTime(run.at)}`;
    li.appendChild(text);
    if (run.undone) {
      const done = document.createElement("span");
      done.className = "muted";
      done.textContent = "Undone";
      li.appendChild(done);
    } else {
      li.appendChild(smallButton("ph:arrow-counter-clockwise Undo", `Put back: ${run.message}`, async () => {
        await apiJson(`/tidy/undo/${run.undo_id}`, { method: "POST" }).catch((e) => toast(e.message, true));
        toast(`Undid: ${run.message}.`);
        await tidyAfterChange();
      }));
    }
    list.appendChild(li);
  }
  state.history.append(head, list);
}

tidyWatchList();
tidyBadge(true);
