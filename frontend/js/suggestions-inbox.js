// suggestions-inbox.js: the suggestions inbox (GRAPH_PLAN KG9, INBOX 528).
//
// Lazy (app.js, `LAZY_MODULES.inbox`), entered through `openSuggestionsInbox`,
// a `LAZY_ENTRY_POINTS` stand-in. One sheet for the four things the notebook
// proposes and only a person decides: links to add (`/entries/link-suggestions`),
// disagreements (`/entries/tensions`, a local-model pass started by hand),
// names that are one thing and link types (`/suggestions`). A `.seg` picks the
// kind, each with its count. Every accept and dismissal is a correction the
// next pass reads (`ai/learning.py`): a dismissal never comes back, and both
// move what each kind of evidence is worth. Before this the links were a
// panel under the graph's toolbar and the disagreements a dialog of their own.

const INBOX_KINDS = [
  ["links", "Links", "Notes that look related. Link the ones you agree with."],
  ["tensions", "Tensions", "Notes that may contradict each other, read in pairs by your local model."],
  ["names", "Names", "One person or thing named two ways. Merge them and every mention follows."],
  ["types", "Link types", "Links whose own words say what kind of link they are."],
];

const INBOX_HELP = [
  "Links: pairs worth connecting, with every reason: similar wording, people or things both name, a note both link with, a rare tag both carry. Type a reason before Link, or leave it to Atlas.",
  "Tensions: Start the review reads likely pairs with your local model and shows the two sides with their dates. Nothing runs until you start it.",
  "Names: \"Sam\" and \"Sam Lee\", or one name spelled two ways. Merge keeps the fuller name and moves every mention; the other name is kept as an alias, so it is never found twice.",
  "Link types: a link whose sentence says \"for example\", \"continues\", \"evidence\", \"contradicts\" or \"background\". Accepting gives the link that type; the graph draws it.",
  "Every Link, Merge or type you accept, and every one you dismiss, teaches the inbox which reasons to trust in your notebook. A dismissed suggestion does not come back.",
];

let inboxState = null;

async function openSuggestionsInbox(kind = "links") {
  if (inboxState) {
    inboxShow(kind);
    return;
  }
  const state = { kind, tabs: {}, lists: {}, counts: {} };
  inboxState = state;
  state.close = openSheet({
    label: "Suggestions",
    name: "suggestions",
    onClose: () => {
      inboxState = null;
    },
    build: (card) => {
      card.classList.add("inbox-card");
      inboxHead(card);
      const seg = document.createElement("div");
      seg.className = "seg seg-compact inbox-seg";
      seg.setAttribute("role", "tablist");
      seg.setAttribute("aria-label", "Kind of suggestion");
      const body = document.createElement("div");
      body.className = "inbox-body";
      for (const [key, label, line] of INBOX_KINDS) {
        const tab = document.createElement("button");
        tab.type = "button";
        tab.id = `inbox-tab-${key}`;
        tab.setAttribute("role", "tab");
        tab.setAttribute("aria-controls", `inbox-pane-${key}`);
        const name = document.createElement("span");
        name.textContent = label;
        const count = document.createElement("span");
        count.className = "inbox-count";
        tab.append(name, count);
        tab.addEventListener("click", () => inboxShow(key));
        seg.appendChild(tab);
        const pane = document.createElement("div");
        pane.id = `inbox-pane-${key}`;
        pane.className = "inbox-pane";
        pane.setAttribute("role", "tabpanel");
        pane.setAttribute("aria-labelledby", tab.id);
        pane.hidden = true;
        const desc = document.createElement("p");
        desc.className = "muted inbox-desc";
        desc.textContent = line;
        const list = document.createElement("div");
        list.className = "inbox-list";
        pane.append(desc, list);
        body.appendChild(pane);
        state.tabs[key] = tab;
        state.lists[key] = list;
      }
      //: Arrows walk the tabs (the tabs pattern), Home and End to the ends.
      seg.addEventListener("keydown", (event) => {
        const keys = INBOX_KINDS.map(([k]) => k);
        const at = keys.indexOf(state.kind);
        const next = { ArrowRight: at + 1, ArrowLeft: at - 1, Home: 0, End: keys.length - 1 }[event.key];
        if (next === undefined) return;
        event.preventDefault();
        const key = keys[(next + keys.length) % keys.length];
        inboxShow(key);
        state.tabs[key].focus();
      });
      card.append(seg, body);
    },
  });
  inboxShow(kind);
  inboxTensionsPane();
  for (const key of ["links", "names", "types"]) setLabel(state.lists[key], "ph:spin Looking…");
  const [links, rest] = await Promise.all([
    apiJson("/entries/link-suggestions", { silent: true }).catch(() => []),
    apiJson("/suggestions", { silent: true }).catch(() => ({ merges: [], types: [] })),
  ]);
  if (inboxState !== state) return;
  inboxLinksPane(links || []);
  inboxRows("names", rest.merges || [], inboxMergeRow, "No names to merge. Two names for one person or thing show up here.");
  inboxRows("types", rest.types || [], inboxTypeRow, "No links to type. A link whose sentence says \"for example\" or \"continues\" shows up here.");
}

/** The head: the title, its '?', then the close, as every dialog head. */
function inboxHead(card) {
  const head = card.querySelector(".sheet-head");
  if (!head) return;
  const help = document.createElement("button");
  help.type = "button";
  help.className = "icon-only ghost small dialog-head-btn";
  help.setAttribute("data-help-for", "inbox-help");
  help.setAttribute("aria-controls", "inbox-help");
  help.setAttribute("aria-expanded", "false");
  help.title = "About suggestions";
  help.setAttribute("aria-label", "About suggestions");
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
  helpBody.id = "inbox-help";
  helpBody.setAttribute("role", "dialog");
  helpBody.setAttribute("aria-label", "About suggestions");
  for (const line of INBOX_HELP) {
    const p = document.createElement("p");
    p.textContent = line;
    helpBody.appendChild(p);
  }
  head.after(helpBody);
}

function inboxShow(kind) {
  const state = inboxState;
  if (!state || !state.tabs[kind]) return;
  state.kind = kind;
  for (const [key, tab] of Object.entries(state.tabs)) {
    const on = key === kind;
    tab.classList.toggle("active", on);
    tab.setAttribute("aria-selected", on ? "true" : "false");
    tab.tabIndex = on ? 0 : -1;
    document.getElementById(`inbox-pane-${key}`).hidden = !on;
  }
}

function inboxCount(kind, n) {
  const state = inboxState;
  if (!state) return;
  state.counts[kind] = n;
  const count = state.tabs[kind]?.querySelector(".inbox-count");
  if (count) count.textContent = n ? String(n) : "";
}

/** One kind's rows, or its empty line; a row removing itself recounts. */
function inboxRows(kind, rows, build, empty) {
  const list = inboxState?.lists[kind];
  if (!list) return;
  list.replaceChildren();
  for (const row of rows) list.appendChild(build(row));
  inboxCount(kind, rows.length);
  if (!rows.length) inboxEmpty(list, empty);
  list.dataset.empty = empty;
}

function inboxEmpty(list, text) {
  const line = document.createElement("p");
  line.className = "muted inbox-empty";
  line.textContent = text;
  list.appendChild(line);
}

/** Take a decided row out and recount; the next row takes the focus. */
function inboxDone(kind, row) {
  const list = row.parentElement;
  const next = row.nextElementSibling || row.previousElementSibling;
  row.remove();
  inboxCount(kind, Math.max(0, (inboxState?.counts[kind] || 1) - 1));
  if (list && !list.querySelector(".inbox-row, .link-suggestion")) inboxEmpty(list, list.dataset.empty || "Nothing left.");
  next?.querySelector("button")?.focus();
}

function inboxCorrection(kind, subject) {
  return apiJson("/learned/corrections", { method: "POST", silent: true, body: JSON.stringify({ kind, subject }) }).catch(() => {});
}

/** The reasons under a row, each with its own percentage. */
function inboxWhy(signals) {
  const why = document.createElement("p");
  why.className = "muted link-suggestion-why";
  why.textContent = (signals || []).map((g) => `${g.reason} (${Math.round(g.confidence * 100)}%)`).join(" · ");
  return why;
}

//: The score as a small bar with its number (item 92): how sure reads at a
//: glance down a column of rows, where a column of percent chips had to be
//: read one by one.
function inboxScoreBar(confidence) {
  const pct = Math.round((confidence || 0) * 100);
  const score = document.createElement("span");
  score.className = "link-suggestion-score";
  score.title = "How sure, over every reason";
  const bar = document.createElement("span");
  bar.className = "link-suggestion-bar";
  bar.setAttribute("aria-hidden", "true");
  const fill = document.createElement("span");
  fill.style.width = `${Math.max(0, Math.min(100, pct))}%`;
  bar.appendChild(fill);
  const number = document.createElement("span");
  number.textContent = `${pct}%`;
  score.append(bar, number);
  return score;
}

function inboxScore(confidence) {
  const score = chip(`${Math.round((confidence || 0) * 100)}%`, "confidence");
  score.title = "How sure, over every reason";
  return score;
}

// --- Names: two names for one thing (KG5's merge, decided here) -------------

function inboxMergeRow(m) {
  const row = document.createElement("div");
  row.className = "inbox-row";
  row.setAttribute("role", "group");
  const notes = (n) => `${n} note${n === 1 ? "" : "s"}`;
  const title = document.createElement("p");
  title.className = "inbox-row-title";
  title.textContent = `“${m.merge_name}” (${notes(m.merge_notes)}) into “${m.keep_name}” (${notes(m.keep_notes)})`;
  row.setAttribute("aria-label", `Merge ${m.merge_name} into ${m.keep_name}`);
  const signals = (m.signals || []).map((g) => g.signal);
  const merge = smallButton("ph:arrows-merge Merge", `Fold “${m.merge_name}” into “${m.keep_name}”: every mention moves, and the old name is kept as an alias`, async () => {
    merge.disabled = true;
    const done = await apiJson("/suggestions/merges/accept", {
      method: "POST",
      body: JSON.stringify({ keep_id: m.keep_id, merge_id: m.merge_id, signals }),
    }).catch((e) => {
      toast(e.message, true);
      return null;
    });
    merge.disabled = false;
    if (!done) return;
    toast(`Merged into “${done.name}”.`);
    inboxDone("names", row);
  });
  const dismiss = smallButton("ph:x", "Not the same: never suggest this pair again", () => {
    inboxCorrection("dismiss_merge", { a: m.keep_id, b: m.merge_id, signals });
    inboxDone("names", row);
  });
  const actions = document.createElement("div");
  actions.className = "row inbox-row-actions";
  actions.append(inboxScore(m.confidence), merge, dismiss);
  row.append(title, inboxWhy(m.signals), actions);
  return row;
}

// --- Link types: a link whose own words name its kind -----------------------

function inboxTypeRow(t) {
  const row = document.createElement("div");
  row.className = "inbox-row";
  row.setAttribute("role", "group");
  row.setAttribute("aria-label", `${t.source_label} to ${t.target_label}: ${t.type_label}`);
  const title = document.createElement("p");
  title.className = "inbox-row-title";
  title.textContent = `${t.source_label} → ${t.target_label}`;
  row.appendChild(title);
  if (t.context) row.appendChild(docBacklinkContext(t));
  const set = smallButton(`ph:check ${t.type_label}`, `Give this link the type ${t.type_label}`, async () => {
    set.disabled = true;
    const done = await apiJson("/suggestions/types/accept", {
      method: "POST",
      body: JSON.stringify({ link_id: t.link_id, link_type: t.link_type }),
    }).catch((e) => {
      toast(e.message, true);
      return null;
    });
    set.disabled = false;
    if (!done) return;
    toast(`Link type set: ${t.type_label}.`);
    inboxDone("types", row);
  });
  const dismiss = smallButton("ph:x", "Not this type: never suggest it for this link again", () => {
    apiJson("/suggestions/types/dismiss", {
      method: "POST",
      silent: true,
      body: JSON.stringify({ link_id: t.link_id, link_type: t.link_type }),
    }).catch(() => {});
    inboxDone("types", row);
  });
  const actions = document.createElement("div");
  actions.className = "row inbox-row-actions";
  actions.append(inboxScore(t.confidence), set, dismiss);
  row.append(inboxWhy(t.signals), actions);
  return row;
}

// --- Disagreements: where the notebook disagrees with itself ----------------
//
// Similarity answers "are these about the same thing", and two notes that flatly
// contradict each other are, to a vector, maximally similar; only a model
// reading both can tell agreement from disagreement (`ai/tensions.py`). The
// pass is never started by opening the sheet: it is free but not instant.

const TENSION_STATUS_TEXT = {
  no_model: "No local model is running, so nothing can read your notes. Start Ollama and try again.",
  no_embeddings: "Semantic search is off, so there is no shortlist of notes to compare. Turn it on in Settings, Models.",
  too_few_notes: "Not enough notes yet, there is nothing to compare.",
  no_candidates: "No pairs were close enough in subject to be worth reading. Contradictions only show up between notes about the same thing.",
  none_found: "Nothing contradicted itself, as far as this pass could tell.",
};

function inboxTensionsPane() {
  const list = inboxState?.lists.tensions;
  if (!list) return;
  const tools = document.createElement("div");
  tools.className = "row inbox-tools";
  const status = document.createElement("span");
  status.className = "muted inbox-status";
  status.setAttribute("role", "status");
  status.setAttribute("aria-live", "polite");
  const run = document.createElement("button");
  run.type = "button";
  run.className = "accent small";
  run.textContent = "Start the review";
  const results = document.createElement("div");
  results.className = "tensions-results";
  run.addEventListener("click", async () => {
    run.disabled = true;
    results.replaceChildren();
    setLabel(status, "ph:spin Reading your notes… this runs on your machine and can take a minute.");
    const body = await apiJson("/entries/tensions", { silent: true }).catch(() => null);
    run.disabled = false;
    if (!body) {
      status.textContent = "The review could not run. Nothing was changed.";
      return;
    }
    const found = body.tensions || [];
    inboxCount("tensions", found.length);
    if (!found.length) {
      status.textContent = TENSION_STATUS_TEXT[body.status] || "Nothing found.";
      return;
    }
    const checked = body.pairs_checked || 0;
    status.textContent = `${found.length} to look at, from ${checked} pair${checked === 1 ? "" : "s"} read.`;
    for (const tension of found) results.appendChild(tensionCard(tension));
  });
  tools.append(status, run);
  list.replaceChildren(tools, results);
}

/** One proposed disagreement, with both notes and the two decisions. */
function tensionCard(tension) {
  const card = document.createElement("div");
  card.className = "card tension-card";
  card.setAttribute("role", "group");
  card.setAttribute("aria-label", `Possible contradiction: ${tension.explanation}`);
  const why = document.createElement("p");
  why.className = "tension-why";
  why.textContent = tension.explanation;
  const gap = document.createElement("p");
  gap.className = "muted tension-gap";
  //: The gap is the finding as much as the text: "you thought this, then
  //: months later that".
  gap.textContent = tension.gap_days ? `${tensionGapText(tension.gap_days)} apart` : "Written around the same time";
  const pair = document.createElement("div");
  pair.className = "tension-pair";
  pair.append(
    tensionSide("Earlier", tension.earlier_at, tension.earlier_excerpt, tension.earlier_id),
    tensionSide("Later", tension.later_at, tension.later_excerpt, tension.later_id),
  );
  const actions = document.createElement("div");
  actions.className = "row tension-actions";
  const ids = JSON.stringify({ earlier_id: tension.earlier_id, later_id: tension.later_id });
  const accept = document.createElement("button");
  accept.type = "button";
  accept.className = "accent small";
  accept.textContent = "Yes: link these as contradicting";
  accept.addEventListener("click", async () => {
    await apiJson("/entries/tensions/accept", { method: "POST", body: ids }).catch(() => null);
    tensionResolve(card, "Linked as contradicting.");
  });
  const dismiss = document.createElement("button");
  dismiss.type = "button";
  dismiss.className = "ghost small";
  dismiss.textContent = "Not a contradiction";
  dismiss.addEventListener("click", async () => {
    await apiJson("/entries/tensions/dismiss", { method: "POST", body: ids }).catch(() => null);
    tensionResolve(card, "Dismissed: this pair won't come back.");
  });
  actions.append(accept, dismiss);
  card.append(why, gap, pair, actions);
  return card;
}

/** Replace a card's controls with what happened, announced (the pressed
 *  button is gone, and without `role="status"` a screen reader hears nothing). */
function tensionResolve(card, message) {
  card.classList.add("is-resolved");
  const actions = card.querySelector(".tension-actions");
  if (!actions) return;
  const done = document.createElement("p");
  done.className = "muted tension-done";
  done.setAttribute("role", "status");
  done.textContent = message;
  actions.replaceWith(done);
  inboxCount("tensions", Math.max(0, (inboxState?.counts.tensions || 1) - 1));
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
  const text = document.createElement("p");
  text.className = "tension-excerpt";
  text.textContent = excerpt || "(empty note)";
  const open = document.createElement("button");
  open.type = "button";
  open.className = "ghost small";
  open.textContent = "Open this note";
  open.addEventListener("click", () => {
    inboxState?.close?.();
    flashEntry(entryId);
  });
  side.append(head, text, open);
  return side;
}

// --- Links: the auto-linker, approve each (GRAPH_PLAN KG2) ------------------

function inboxLinksPane(suggestions) {
  const list = inboxState?.lists.links;
  if (!list) return;
  list.replaceChildren();
  list.dataset.empty = "No new links to suggest: everything related is linked already.";
  const rowReasons = [];
  //: Explains links that already exist (similarity, then Atlas names the
  //: connection); not the rows below, which are not links yet.
  const backfill = smallButton(
    "ph:lightbulb Explain your existing links",
    "For links you've already made elsewhere: work out why each one exists, first from how alike the notes are, then by asking Atlas to name the actual connection. Doesn't touch the suggestions below, which aren't links yet.",
    async () => {
      setBusy(backfill, true, "Working…");
      const result = await apiJson("/entries/links/backfill-reasons", { method: "POST", body: JSON.stringify({ ai: true }) }).catch((e) => {
        toast(e.message, true);
        return null;
      });
      setBusy(backfill, false);
      if (typeof refreshJobRuns === "function") refreshJobRuns();
      if (!result) return;
      const parts = [];
      if (result.updated) parts.push(`marked ${result.updated}`);
      if (result.rewritten) parts.push(`wrote a real reason for ${result.rewritten}`);
      if (parts.length) toast(`Links: ${parts.join(", ")}.`);
      else if (result.ai_unavailable) toast("Marked what I could, Atlas isn't running, so none could be put into words yet.", true);
      else toast("Every link already has a reason.");
    },
  );
  //: An AI guess for these rows' own Why boxes, written in as a real value
  //: (editable, and used as-is by Link if left alone).
  const fillReasons = async (targets, quiet) => {
    const result = await apiJson("/entries/link-suggestions/reasons", {
      method: "POST",
      silent: quiet,
      body: JSON.stringify({ pairs: targets.map((r) => ({ source_id: r.s.source_id, target_id: r.s.target_id })) }),
    }).catch((e) => {
      if (!quiet) toast(e.message, true);
      return null;
    });
    if (!result) return null;
    const byPair = new Map(result.reasons.map((r) => [`${r.source_id}:${r.target_id}`, r.reason]));
    let filled = 0;
    for (const r of targets) {
      //: Never over something typed while the request was in flight.
      if (r.input.dataset.userEdited && quiet) continue;
      const reason = byPair.get(`${r.s.source_id}:${r.s.target_id}`);
      if (reason) {
        r.input.value = reason;
        r.reveal?.();
        filled++;
      }
    }
    return { filled, result };
  };
  const suggestReasons = smallButton(
    "ph:sparkle Suggest reasons",
    "Ask Atlas to guess why each note pair below might be connected, and fill in any empty Why box with its answer, still yours to edit or clear before linking.",
    async () => {
      const targets = rowReasons.filter((r) => r.input.isConnected && !r.input.value.trim());
      if (!targets.length) {
        toast("Every visible suggestion already has a reason.");
        return;
      }
      setBusy(suggestReasons, true, "Working…");
      const done = await fillReasons(targets, false);
      setBusy(suggestReasons, false);
      if (!done) return;
      if (done.filled) toast(`Filled in ${done.filled} reason${done.filled === 1 ? "" : "s"}.`);
      else if (done.result.ai_unavailable) toast("Atlas isn't running, so no reasons could be guessed.", true);
      else toast("Couldn't guess a reason for any of these.");
    },
  );
  //: **Every sure one at once** (WORLD_CLASS_PLAN, Placed 2026-09-09 item
  //: 92): the rows at 70% or more, linked through each row's own Link, so a
  //: typed reason and the learning go with each as they would one by one.
  const linkSure = smallButton(
    "ph:link Link all above 70%",
    "Link every suggestion below that is at least 70% sure, each with its reason",
    async () => {
      const sure = rowReasons.filter((r) => r.input.isConnected && (r.s.confidence ?? r.s.similarity ?? 0) >= 0.7);
      if (!sure.length) return toast("None of these is 70% sure or more.");
      setBusy(linkSure, true, "Linking…");
      //: Quiet per row: one toast and one reload for the lot, not one each.
      for (const r of sure) await r.link({ quiet: true });
      setBusy(linkSure, false);
      loadEntries().catch(() => {});
      toast(`Linked ${sure.length} pair${sure.length === 1 ? "" : "s"}.`);
    },
  );
  const tools = document.createElement("div");
  tools.className = "row inbox-tools";
  tools.append(linkSure, backfill, suggestReasons);
  list.appendChild(tools);
  //: When "Explain your existing links" last ran (INBOX 438); settings.js.
  if (typeof jobLineEl === "function") list.appendChild(jobLineEl("link-reasons"));
  for (const s of suggestions) list.appendChild(inboxLinkRow(s, rowReasons));
  inboxCount("links", suggestions.length);
  if (!suggestions.length) inboxEmpty(list, list.dataset.empty);
  //: Reasons arrive on their own for the top six (each is a model round trip
  //: on a slow local model); failure is silent, the deduced text stands.
  const pending = rowReasons.slice(0, 6);
  if (pending.length) requestAnimationFrame(() => fillReasons(pending, true));
}

function inboxLinkRow(s, rowReasons) {
  const row = document.createElement("div");
  row.className = "link-suggestion";
  //: **Two notes and the join between them** (WORLD_CLASS_PLAN, Placed
  //: 2026-09-09 item 92): each note a chip, an arrow between, where the row
  //: was a quoted "A ↔ B" string; the full text of each is its chip's title.
  const text = document.createElement("span");
  text.className = "link-suggestion-text link-suggestion-pair";
  //: The note's name, not its markdown (`notePreviewText`, as everywhere).
  const name = (raw) => {
    const clean = notePreviewText(raw || "").replace(/\s+/g, " ").trim();
    return clean.length > 70 ? `${clean.slice(0, 69)}…` : clean || "Untitled note";
  };
  const noteChip = (raw) => {
    const made = chip(`ph:note ${name(raw)}`, "link-suggestion-note");
    made.title = notePreviewText(raw || "");
    return made;
  };
  const join = document.createElement("i");
  join.className = "ph ph-arrows-left-right link-suggestion-join";
  join.setAttribute("aria-hidden", "true");
  text.append(noteChip(s.source_preview), join, noteChip(s.target_preview));
  text.setAttribute("role", "group");
  text.setAttribute("aria-label", `${name(s.source_preview)} and ${name(s.target_preview)}`);
  //: A reason you can type before you link; left blank, the server deduces.
  const reason = document.createElement("input");
  reason.type = "text";
  reason.className = "link-suggestion-reason";
  reason.maxLength = 80;
  reason.placeholder = s.reason && s.reason !== "similar in meaning" ? s.reason : "Why? (optional: Atlas will work it out)";
  reason.setAttribute("aria-label", "Reason for this link");
  reason.addEventListener("input", () => {
    reason.dataset.userEdited = "1";
  });
  //: The field waits behind "Add a reason" (item 92): most links need none,
  //: and a field on every row was the row's widest thing. A reason Atlas
  //: fills in shows it.
  reason.classList.add("hidden");
  const addReason = smallButton("ph:text-t Add a reason", "Say why these two belong together", () => reveal());
  addReason.classList.add("link-suggestion-add-reason");
  const reveal = () => {
    reason.classList.remove("hidden");
    addReason.classList.add("hidden");
    if (document.activeElement === addReason) reason.focus();
  };
  const rowState = { s, input: reason, reveal, link: null };
  rowReasons.push(rowState);
  const sigs = s.signals || [];
  const signals = sigs.map((g) => g.signal);
  const link = smallButton("ph:link Link", "Connect these two notes", () => linkIt());
  const linkIt = async ({ quiet = false } = {}) => {
    //: Left empty, a pair found by structure keeps its reasons and their
    //: confidence (KG9); one found by wording alone lets the server deduce.
    const typed = reason.value.trim();
    const structural = sigs.some((g) => g.signal !== "similarity" && g.signal !== "time");
    const given = typed || (structural ? s.reason : "");
    const body = { target_id: s.target_id };
    if (given) body.reason = given;
    if (!typed && structural) body.reason_confidence = s.confidence;
    await apiJson(`/entries/${s.source_id}/links`, { method: "POST", body: JSON.stringify(body) }).catch((e) => toast(e.message, true));
    inboxCorrection("accept_link", { a: s.source_id, b: s.target_id, signals });
    if (!quiet) {
      toast(typed ? "Linked, with your reason." : "Linked.");
      loadEntries().catch(() => {});
    }
    inboxDone("links", row);
  };
  rowState.link = linkIt;
  reason.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      link.click();
    }
  });
  const dismiss = smallButton("ph:x", "Dismiss this suggestion", () => {
    inboxCorrection("dismiss_link", { a: s.source_id, b: s.target_id, signals });
    inboxDone("links", row);
  });
  row.append(text, addReason, reason, inboxScoreBar(s.confidence ?? s.similarity), link, dismiss);
  if (sigs.length) row.appendChild(inboxWhy(sigs));
  return row;
}
