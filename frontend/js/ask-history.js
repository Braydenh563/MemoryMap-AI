// ask-history.js: the Ask history panel, every notes-only question with its
// answer, to read, search, pin, delete and reopen. A lazy piece (app.js
// LAZY_MODULES), moved out of capture-ask.js on 2026-10-03 (INBOX 432) to keep
// the boot scripts under their gzip total: nothing here runs until the panel
// is opened. Its state (`askHistoryOpen` and the paging counters) and the
// badge stay in capture-ask.js, since boot code reads them.

function askHistoryRow(turn) {
  const li = document.createElement("li");
  li.className = "ask-history-item";
  li.dataset.id = turn.id;
  li.tabIndex = 0;
  li.setAttribute("role", "button");
  li.title = "Open this question and its answer";

  const head = document.createElement("div");
  head.className = "ask-history-item-head";
  const question = document.createElement("span");
  question.className = "ask-history-question";
  question.textContent = turn.question;
  head.appendChild(question);

  const actions = document.createElement("span");
  actions.className = "ask-history-actions";
  const pinBtn = document.createElement("button");
  pinBtn.type = "button";
  pinBtn.className = "icon-btn ask-history-pin" + (turn.pinned ? " active" : "");
  pinBtn.title = turn.pinned ? "Unpin" : "Pin so this survives Clear";
  pinBtn.setAttribute("aria-label", turn.pinned ? "Unpin question" : "Pin question");
  setLabel(pinBtn, turn.pinned ? "ph:push-pin-slash" : "ph:push-pin");
  pinBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    toggleAskHistoryPin(turn.id, !turn.pinned);
  });
  const delBtn = document.createElement("button");
  delBtn.type = "button";
  delBtn.className = "icon-btn ask-history-delete";
  delBtn.title = "Delete this question";
  delBtn.setAttribute("aria-label", "Delete question");
  delBtn.innerHTML = '<i class="ph ph-trash" aria-hidden="true"></i>';
  delBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    deleteAskHistoryTurn(turn.id);
  });
  actions.append(pinBtn, delBtn);
  head.appendChild(actions);
  li.appendChild(head);

  const meta = document.createElement("div");
  meta.className = "ask-history-meta muted";
  const parts = [relativeTime(turn.created_at)];
  if (turn.result_count) {
    parts.push(`${turn.result_count} note${turn.result_count === 1 ? "" : "s"}`);
  }
  meta.textContent = parts.join(" · ");
  li.appendChild(meta);

  if (turn.answer_preview) {
    const preview = document.createElement("p");
    preview.className = "ask-history-preview";
    preview.textContent = turn.answer_preview;
    li.appendChild(preview);
  }

  const open = () => viewAskHistoryTurn(turn.id);
  li.addEventListener("click", open);
  li.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      open();
    }
  });
  return li;
}

async function loadAskHistoryPage(reset) {
  if (reset) askHistoryOffset = 0;
  const list = $("ask-history-list");
  const params = new URLSearchParams({
    limit: String(ASK_HISTORY_PAGE),
    offset: String(askHistoryOffset),
  });
  const q = $("ask-history-search")?.value.trim();
  if (q) params.set("q", q);
  if ($("ask-history-pinned-only")?.checked) params.set("pinned_only", "true");
  const body = await apiJson(`/ask-history?${params}`).catch(() => null);
  if (!body) return;
  askHistoryTotal = body.total;
  if (reset) list.replaceChildren();
  for (const turn of body.turns) list.appendChild(askHistoryRow(turn));
  askHistoryOffset += body.turns.length;
  $("ask-history-empty").classList.toggle("hidden", askHistoryOffset > 0);
  $("ask-history-more").classList.toggle("hidden", askHistoryOffset >= askHistoryTotal);
}

function toggleAskHistoryPanel() {
  askHistoryOpen = !askHistoryOpen;
  $("ask-history-panel").classList.toggle("hidden", !askHistoryOpen);
  $("ask-history-toggle").setAttribute("aria-expanded", String(askHistoryOpen));
  if (askHistoryOpen) loadAskHistoryPage(true);
}

// Reopen a past turn exactly where a live answer renders, no re-asking the
// model, which is the whole point of this being a browser and not a search
// box that happens to remember your last five questions.
async function viewAskHistoryTurn(id) {
  const turn = await apiJson(`/ask-history/${id}`).catch(() => null);
  if (!turn) {
    toast("That question is no longer in your history.", "info");
    return;
  }
  $("suggested-questions").classList.add("hidden");
  $("question").value = turn.question;
  lastQuestion = turn.question;
  renderAskedQuestion(turn.question);
  const answerBox = $("ai-answer");
  renderMarkdown(answerBox, turn.answer);
  $("ai-answer-grounding").replaceChildren();
  $("ai-answer-grounding").classList.add("hidden");
  clearAskAnswerFoot();
  $("thinking-box").classList.add("hidden");
  //: **A reopened turn is the answer object, not a paragraph of its text**
  //: (INBOX 241, the owner: "the grounding, intext numbered referencing, and
  //: sources that appeared in the ask subtab in notes, dissappeared on reload
  //: and didnt persist. they didnt persist when I reaccessed them through the
  //: history panel"). The two clears above are still right, they are what
  //: takes the *previous* answer's foot down, and until now nothing put this
  //: one's back up: the panel redrew the prose, the results and the badges and
  //: stopped, so every citation and every source card was lost the moment a
  //: turn was browsed rather than asked.
  //:
  //: Built from the same two calls the live path ends on,
  //: `renderAnswerGrounding` (which puts the numbered markers into the answer
  //: itself as well as drawing the chip row that is their key) and the foot
  //: from `answerObject`. The live path calls `addInlineCitations` a second
  //: time after those, and this deliberately does not: there it is a repair,
  //: its final `renderMarkdown` rebuilds the answer element and throws the
  //: markers away, whereas here the markdown is rendered *before* the
  //: grounding, so the markers are already the last thing written. Calling it
  //: again would mark every grounded sentence twice, the walker's `placed` set
  //: being per call and the guard only skipping text already inside a marker.
  //: `meta` carries only `raw_results` because that is all `chatSourcesFrom`
  //: reads for a notes-only turn, which every Ask turn is.
  //:
  //: What is deliberately *not* rebuilt: the follow-up chips and the stats
  //: line. Both are a fresh model call and a live timing, neither belongs to
  //: the turn being reopened, and `setAnsweredBy` below already says this is
  //: a remembered answer rather than one just written.
  //: **The records first, then what reads them** (the owner, 2026-09-24: a
  //: reopened question lost its record numbers and grew a Sources box of
  //: the same notes). `numberMatchingRecords` and `askNotesOnTheRight`
  //: both read `#raw-results`, and this used to fill it after both ran.
  const rawList = $("raw-results");
  rawList.replaceChildren();
  // Same badges as a live Ask answer: this turn's own match_info/connected_ids
  // were saved alongside it (routes_chat.py's _save_ask_turn) for exactly
  // this reason: browsing back shouldn't lose the "why" a result showed up.
  const connected = new Set(turn.connected_ids || []);
  const matchInfo = turn.match_info || {};
  for (const entry of turn.raw_results) {
    const row = clickableResult(entry);
    const badge = matchReasonBadge(matchInfo[entry.id]);
    if (badge) {
      if (connected.has(entry.id)) row.classList.add("result-connected");
      if (matchInfo[entry.id]?.type === "connected_2hop") row.classList.add("result-connected-2hop");
      row.appendChild(badge);
    }
    rawList.appendChild(row);
  }
  if (turn.omitted_results) {
    const li = document.createElement("li");
    li.className = "muted";
    li.textContent =
      turn.omitted_results === 1
        ? "1 note from this answer is no longer available (deleted or made private since)."
        : `${turn.omitted_results} notes from this answer are no longer available (deleted or made private since).`;
    rawList.appendChild(li);
  }
  const groundingRows = turn.grounding || [];
  const historyMeta = { raw_results: turn.raw_results || [] };
  //: Built first, for its `sources`: a reopened turn numbers its markers,
  //: chips and panel rows together, the same way the live path does.
  const remembered = answerObject({
    question: turn.question,
    text: turn.answer,
    grounding: groundingRows,
    meta: historyMeta,
  });
  if (groundingRows.length) {
    renderAnswerGrounding(
      $("ai-answer-grounding"),
      groundingRows,
      historyMeta.raw_results,
      answerBox,
      turn.question,
      remembered.sources,
      //: The stored turn's support (`routes_ask_history.py`), so a reopened
      //: answer keeps the low-support notice the live one had.
      turn.support || null
    );
  }
  placeAnswerFigures(answerBox, historyMeta, turn.question);
  renderAskAnswerFoot(remembered, historyMeta);
  $("thinking-box").replaceChildren();
  //: A remembered turn says *when* rather than *what by*: the model that
  //: answered it may not even be installed any more. The tooltip carries the
  //: same fact spelled out, since the chip is ellipsised.
  setAnsweredBy(`asked ${relativeTime(turn.created_at)}`, `Asked ${relativeTime(turn.created_at)}`);
  $("search-mode").textContent = SEARCH_MODE_LABELS[turn.search_mode] || turn.search_mode;
  document.querySelector(".chat-half:last-child")?.classList.remove("hidden");
  $("chat-results").classList.remove("hidden");
  $("ask-idle")?.classList.add("hidden");
  $("ask-status").textContent = "";
  show("retry-btn", "copy-btn", "speak-btn", "new-chat-btn");
}

async function toggleAskHistoryPin(id, pinned) {
  //: A failure is said, not swallowed (audit 2026-10-05, FE-12).
  await apiJson(`/ask-history/${id}/pin?pinned=${pinned}`, { method: "PUT" }).catch((error) =>
    toast(error.message || "Couldn't change the pin.", true)
  );
  loadAskHistoryPage(true);
}

async function deleteAskHistoryTurn(id) {
  // Permanent: no restore endpoint behind this one, unlike a note's bin.
  // "Clear all" right next to this already confirms; a single turn deleted
  // by the same one-click miss deserves the same guard, not less.
  if (!(await confirmDialog("Delete this question and answer?"))) return;
  await apiJson(`/ask-history/${id}`, { method: "DELETE" }).catch((error) =>
    toast(error.message || "Couldn't delete that question.", true)
  );
  loadAskHistoryPage(true);
  loadAskHistoryBadge();
}

async function clearAskHistory() {
  const ok = await confirmDialog(
    "Clear your question history?\n\nPinned questions are kept. This cannot be undone for the rest.",
    { confirmLabel: "Clear history", danger: true }
  );
  if (!ok) return;
  await apiJson("/ask-history", { method: "DELETE" }).catch((error) =>
    toast(error.message || "Couldn't clear the history.", true)
  );
  loadAskHistoryPage(true);
  loadAskHistoryBadge();
}
