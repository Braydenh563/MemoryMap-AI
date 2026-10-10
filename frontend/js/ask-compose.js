// ask-compose.js: the Ask box's "Use AI" switch (INBOX 688, 714).
//
// The owner: "is there a way to do very good imitations of ai responses but
// using string concatenation with the app when the ai isnt available with the
// option to toggle between them in the ask subtab??" The answer itself is the
// server's (`ai/composer.py`): every sentence quoted from a note, only the
// connective words written by the app. This file is the switch that asks for
// it, `#ask-use-ai` in index.html: one compact switch row on the app's
// pill-switch recipe (06-timeline-dialogs.css). It replaced a two-segment
// pill ("AI | From your notes") that "doesnt feel modern and professional"
// (INBOX 714); only the control changed, the stored choice did not.
//
// - On is an AI-composed answer, off is "From your notes". The choice is this
//   device's (`prefs`, "ask-answer-from", "ai" or "notes"), read by
//   `streamChatEvents` on every notes-only turn and sent as `answer_from`.
// - With no model running "From your notes" is the answer whatever is stored,
//   so the switch shows off and disabled with the reason; the stored choice is
//   left alone, and Use AI comes back the moment a model does.
// - Lazy and preloaded three seconds after boot (app.js), because the boot
//   scripts are at their gzip cap; until it lands the markup's own state (on)
//   stands, and the server composes regardless when no model runs.

const ASK_ANSWER_FROM_KEY = "ask-answer-from";

//: The reason the switch is greyed, on the row and in its hover text.
const ASK_AI_OFF_REASON = "No model is running, so answers come from your notes. Connect a model in Settings to use AI.";
const ASK_AI_ON_TITLE = "Atlas answers with your model, citing your notes. Off: answers are quoted from your notes, with no AI";

function askAnswerFrom() {
  if (aiIsOff()) return "notes";
  return prefs.get(ASK_ANSWER_FROM_KEY) === "notes" ? "notes" : "ai";
}

function renderAskUseAi() {
  const box = $("ask-use-ai");
  if (!box) return;
  const off = aiIsOff();
  box.checked = askAnswerFrom() === "ai";
  box.disabled = off;
  const row = box.closest("label");
  if (!row) return;
  row.title = off ? ASK_AI_OFF_REASON : ASK_AI_ON_TITLE;
  row.classList.toggle("is-off", off);
}

function wireAskUseAi() {
  const box = $("ask-use-ai");
  if (!box || box.dataset.wired) return;
  box.dataset.wired = "1";
  box.addEventListener("change", () => {
    if (box.disabled) return;
    prefs.set(ASK_ANSWER_FROM_KEY, box.checked ? "ai" : "notes");
    renderAskUseAi();
  });
  //: **Following the model without a hook in the boot scripts.** The status
  //: poll redraws `#ask-offline` on every tick (`renderAiOfflineNotice`),
  //: showing it exactly when no model answers; watching that one attribute
  //: keeps the switch in step with the model starting and stopping.
  const offline = $("ask-offline");
  if (offline) new MutationObserver(renderAskUseAi).observe(offline, { attributes: true, attributeFilter: ["class"] });
  renderAskUseAi();
}

wireAskUseAi();

//: **The name in "[**Dentist**]" opens the note** (the 2026-10-10 triage,
//: decision 5). An answer written without a model cites each note by its
//: title in square brackets (`composer.PHRASES["cite_open"]`), and the
//: grounding row carries that title (`title`), so the match is exact rather
//: than a guess from opening words. Hover or focus shows the citation peek
//: (capture-ask.js), the passage the sentence came from, as a numbered mark
//: does; a press or Enter goes to the note itself, never to the Sources
//: disclosure. The bold name itself is the control (a link role, focusable),
//: so the sentence reads and wraps as before and no stylesheet rule is
//: needed: the global `:focus-visible` ring and the peek are its states.
//: Called by `addInlineCitations` after every paint; a name already wired
//: carries `data-note-id` and is skipped.
function linkCitedTitles(targets, sentences, byId, numberFor) {
  const byTitle = new Map();
  for (const g of sentences || []) if (g.title && !byTitle.has(g.title)) byTitle.set(g.title, g);
  for (const target of targets) {
    for (const name of target.querySelectorAll("strong:not([data-note-id])")) {
      const g = byTitle.get(name.textContent.trim());
      //: "[**Dentist**]", or "[board **Harbor board**]" for a board, a map,
      //: a document or a file (CHAT_PLAN decision 37: the citation says its kind).
      const bracketed = /\[(?:board |map |document |file |page )?$/.test(name.previousSibling?.textContent || "") && /^\]/.test(name.nextSibling?.textContent || "");
      if (!g || !bracketed) continue;
      name.dataset.noteId = String(g.note_id);
      name.tabIndex = 0;
      name.setAttribute("role", "link");
      const kind = g.kind && g.kind !== "note" ? g.kind : "note";
      name.setAttribute("aria-label", `Open the ${kind === "map" ? "mind map" : kind} ${g.title}`);
      name.style.cursor = "pointer";
      const describe = () => ({
        noteId: g.note_id, number: numberFor.get(g.note_id), entry: byId.get(g.note_id), label: g.label,
        start: g.start, end: g.end, signals: g.signals, verdict: g.verdict, terms: g.terms,
      });
      name.addEventListener("mouseenter", () => scheduleCitationPeek(name, describe));
      name.addEventListener("mouseleave", () => scheduleCitationPeekClose());
      name.addEventListener("focus", () => {
        if (!citationPeekState.restoring) openCitationPeek(name, describe(), { pinned: false });
      });
      name.addEventListener("blur", (event) => {
        if (!citationPeekState.panel?.contains(event.relatedTarget)) scheduleCitationPeekClose();
      });
      //: Each kind opens in its own place (INBOX 744): a document in the
      //: editor, a map or a board on its canvas, a file in the Library.
      const open = (event) => {
        event.stopPropagation();
        closeCitationPeek();
        if (kind === "document") openDocumentFromNote(g.note_id);
        else if (kind === "map" || kind === "board") openWhiteboardBoard(g.note_id);
        else if (kind === "file") focusLibraryFile(g.title, `/files/${g.note_id}`);
        else if (kind === "web" && /^https?:\/\//.test(g.url || "")) window.open(g.url, "_blank", "noopener");
        else flashEntry(g.note_id);
      };
      name.addEventListener("click", open);
      name.addEventListener("keydown", (event) => event.key === "Enter" && open(event));
    }
  }
}

//: **A sentence said from a note is drawn as one** (CHAT_PLAN decision 33):
//: an answer composed from the notes marks each of its rows `said`, "quoted"
//: (the note's words as written) or "shifted" (said back to the person who
//: wrote them, "I went" as "you went", the row keeping the note's own words
//: as `original`). Each is wrapped in `.said` (ask-compose-lazy.css, a left
//: rule in the quote style; never quotation marks, which are not the note's
//: and broke grounding when they were added to the text); a shifted one
//: carries the note's own words as its hover text, and the citation peek
//: shows them too. Found by the letters the citations use
//: (`citationTextIndex`); a sentence that crosses an element edge is left
//: as it is rather than broken apart. Called after every paint, so a
//: sentence already wrapped is skipped.
//: Its sheet comes with this file, through the lazy loader that stamps it
//: (app.js `lazyScript`); naming it in `LAZY_MODULES` would grow app.js past
//: its gzip ratchet (`test_static_compression.py`).
lazyScript("/css/ask-compose-lazy.css");

function markSaidSentences(targets, sentences) {
  for (const g of sentences || []) {
    if (g.said !== "quoted" && g.said !== "shifted") continue;
    const key = citationKey(g.sentence);
    if (key.length < 12) continue;
    const index = citationTextIndex(targets);
    const at = index.text.indexOf(key);
    if (at === -1) continue;
    const [first, from] = index.at[at];
    const [last, to] = index.at[at + key.length - 1];
    if (first.parentElement?.closest(".said")) continue;
    const range = document.createRange();
    range.setStart(first, from);
    range.setEnd(last, to + 1);
    const span = document.createElement("span");
    span.className = g.said === "shifted" ? "said said-shifted" : "said";
    if (g.said === "shifted" && g.original) span.title = `In your note: ${g.original}`;
    try {
      range.surroundContents(span);
    } catch {
      // Crosses an element edge (a bold word inside the sentence): left plain.
    }
  }
}

//: **An act's card, with no model** (CHAT_PLAN decision 38): the exact change
//: in one line, the notes it names, and either Confirm and Cancel (a delete,
//: a rename, a move or a tag waits for them) or, once it ran (a reminder, a
//: new note, a pin), what was done and Undo. Confirm and Undo both post the
//: steps to `/chat/command/run`, which runs only the tools an act may use.
function renderActCard(holder, event) {
  const card = document.createElement("div");
  card.className = "tool-confirm";
  const run = (steps, then) =>
    apiJson("/chat/command/run", { method: "POST", body: JSON.stringify({ steps, skipped: event.skipped || [] }) })
      .then((result) => (refreshAfterToolChanges(), then(result)))
      .catch((error) => toast(error.message, true));
  const line = (label, ...more) => {
    const text = document.createElement("p");
    setLabel(text, label);
    card.replaceChildren(text, ...more);
  };
  const done = (summary, undo) => {
    const row = document.createElement("div");
    row.className = "row";
    if (undo?.length) {
      row.appendChild(smallButton("Undo", "Take this back", () => run(undo, () => card.replaceWith(toolChip("ph:arrow-counter-clockwise Undone.")))));
    }
    line(`ph:check-circle ${summary}`, row);
  };
  if (event.done) done(event.summary || event.label, event.undo);
  else {
    const notice = document.createElement("p");
    notice.className = "muted";
    notice.textContent = event.notice;
    const row = document.createElement("div");
    row.className = "row";
    row.append(
      smallButton("Confirm", "Do this", () => run(event.steps, (result) => done(result.summary, result.undo)), false),
      smallButton("Cancel", "Don't do this", () => card.replaceWith(toolChip("ph:x Cancelled: nothing was changed.")))
    );
    line(`ph:warning ${event.label}`, notice, row);
  }
  holder.appendChild(card);
  chatScrollToEnd();
}

//: **The web pages an answer read** (CHAT_PLAN decision 37): a numbered,
//: scrollable list under the answer (`.web-sources`, ask-compose-lazy.css),
//: each page's title opening it in the browser, its domain beside it. Only
//: http and https addresses are drawn as links.
function renderWebSources(holder, sources) {
  const list = document.createElement("ol");
  list.className = "web-sources";
  list.setAttribute("aria-label", "Web pages read for this answer");
  for (const source of sources || []) {
    if (!/^https?:\/\//.test(source.url || "")) continue;
    const item = document.createElement("li");
    const link = document.createElement("a");
    link.href = source.url;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.textContent = source.title || source.domain;
    const domain = document.createElement("span");
    domain.className = "muted";
    domain.textContent = ` ${source.domain || ""}`;
    item.append(link, domain);
    list.appendChild(item);
  }
  if (list.childElementCount) holder.appendChild(list);
}
