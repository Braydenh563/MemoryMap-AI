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
  //: Every act's inverse goes on the app-wide undo stack too (WORLD_CLASS
  //: decision 53, the act registry's `inverse`), so Ctrl+Z after an act takes
  //: it back like any other change. Redo runs the act's steps again and keeps
  //: the inverse of that run, whose ids are new.
  const post = (steps) =>
    apiJson("/chat/command/run", { method: "POST", body: JSON.stringify({ steps, skipped: event.skipped || [] }) }).then((result) => {
      refreshAfterToolChanges();
      return result;
    });
  //: `said`: the answer above already read this sentence (a reminder, a new
  //: note or a pin ran at once), so the card carries only Undo; drawing the
  //: sentence again made the bubble say it twice. The words stay on the card
  //: as its accessible name, and a run with nothing to undo draws no card.
  const done = (summary, undo, steps, said = false) => {
    const row = document.createElement("div");
    row.className = "row";
    if (undo?.length) {
      let inverse = undo;
      const action = pushUndo(
        summary.replace(/^Done:\s*/, "").replace(/\.$/, ""),
        () => post(inverse),
        async () => {
          const again = await post(steps);
          inverse = again.undo || [];
        }
      );
      row.appendChild(
        smallButton("Undo", "Take this back", () =>
          run(inverse, () => {
            settleUndoFromToast(action);
            card.replaceWith(toolChip("ph:arrow-counter-clockwise Undone."));
          })
        )
      );
    }
    if (said) {
      card.setAttribute("role", "group");
      card.setAttribute("aria-label", summary);
      card.replaceChildren(...row.childNodes.length ? [row] : []);
      return;
    }
    line(`ph:check-circle ${summary}`, row);
  };
  if (event.done) done(event.summary || event.label, event.undo, event.steps, true);
  else {
    const notice = document.createElement("p");
    notice.className = "muted";
    notice.textContent = event.notice;
    const row = document.createElement("div");
    row.className = "row";
    row.append(
      smallButton("Confirm", "Do this", () => run(event.steps, (result) => done(result.summary, result.undo, event.steps)), false),
      smallButton("Cancel", "Don't do this", () => card.replaceWith(toolChip("ph:x Cancelled: nothing was changed.")))
    );
    line(`ph:warning ${event.label}`, notice, row);
  }
  if (card.childElementCount) holder.appendChild(card);
  chatScrollToEnd();
}

//: **The web pages an answer read** (CHAT_PLAN decisions 37 and 66): one
//: fold under the answer in the Thinking fold's look (`.web-fold`,
//: ask-compose-lazy.css), its summary the count, each result its title, its
//: site and one line. A title opens the page here: `/websearch/read`'s text,
//: as text, with its address and the time it was read, and Back returns to
//: the list; the arrow beside it opens the page in the browser. Only http
//: and https addresses are drawn.
function renderWebSources(holder, sources) {
  const pages = (sources || []).filter((source) => /^https?:\/\//.test(source.url || ""));
  if (!pages.length) return;
  const fold = document.createElement("details");
  fold.className = "agent-step web-fold";
  const summary = document.createElement("summary");
  summary.className = "fold-summary";
  setLabel(summary, `ph:globe Web results: ${pages.length} ${pages.length === 1 ? "page" : "pages"}`);
  const list = document.createElement("ol");
  list.className = "web-results-list";
  list.setAttribute("aria-label", "Web pages read for this answer");
  const reader = document.createElement("div");
  reader.className = "web-reader hidden";
  for (const source of pages) {
    const item = document.createElement("li");
    const head = document.createElement("div");
    head.className = "web-result-head";
    const read = document.createElement("button");
    read.type = "button";
    read.className = "linklike web-result-title";
    read.textContent = source.title || source.domain;
    read.title = "Read this page here";
    read.addEventListener("click", () => readWebPage(fold, list, reader, source));
    const open = document.createElement("a");
    open.className = "ghost icon-only small web-result-open";
    open.href = source.url;
    open.target = "_blank";
    open.rel = "noopener noreferrer";
    open.setAttribute("aria-label", `Open ${source.domain || "the page"} in the browser`);
    open.title = "Open in the browser";
    setLabel(open, "ph:arrow-square-out");
    head.append(read, open);
    const site = document.createElement("span");
    site.className = "muted web-result-site";
    site.textContent = source.domain || "";
    item.append(head, site);
    if (source.snippet) {
      const line = document.createElement("p");
      line.className = "muted web-result-line";
      line.textContent = source.snippet;
      item.appendChild(line);
    }
    list.appendChild(item);
  }
  fold.append(summary, list, reader);
  holder.appendChild(fold);
}

//: A result read in place (decision 66): the page's readable text, never
//: its markup, in the fold that listed it.
async function readWebPage(fold, list, reader, source) {
  fold.open = true;
  list.classList.add("hidden");
  reader.classList.remove("hidden");
  const back = document.createElement("button");
  back.type = "button";
  back.className = "ghost small web-reader-back";
  setLabel(back, "ph:arrow-left Back to results");
  back.addEventListener("click", () => {
    reader.classList.add("hidden");
    reader.replaceChildren();
    list.classList.remove("hidden");
  });
  const status = document.createElement("p");
  status.className = "muted";
  status.textContent = `Reading ${source.domain || "the page"}`;
  reader.replaceChildren(back, status);
  try {
    const page = await apiJson(`/websearch/read?url=${encodeURIComponent(source.url)}`);
    const title = document.createElement("h4");
    title.className = "web-reader-title";
    title.textContent = page.title || source.title || source.domain;
    const where = document.createElement("p");
    where.className = "muted web-reader-where";
    const link = document.createElement("a");
    link.href = source.url;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.textContent = page.url || source.url;
    const at = new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
    where.append(link, document.createTextNode(`, read at ${at}`));
    const body = document.createElement("div");
    body.className = "web-reader-text";
    for (const block of String(page.text || "").split(/\n{2,}/).filter((b) => b.trim())) {
      const para = document.createElement("p");
      para.textContent = block.trim();
      body.appendChild(para);
    }
    status.replaceWith(title, where, body);
  } catch (error) {
    status.textContent = error.message;
  }
}

//: **The answer's shape follows its kind** (CHAT_PLAN decision 71): a count
//: leads with its number drawn large (`.digest-figure`), and a who answer
//: is a card (`.digest-card`: the person's name over what the notes say).
//: A comparison is a table and what is left a checklist already, in the
//: Markdown the answer arrives as; the table is set to fit and read in the
//: body's type (`.digest-table`), not the model table's export bar. Built from the text, so the citation
//: marks inside it keep their places.
function digestShape(answerEl, shape) {
  if (!answerEl) return;
  const first = answerEl.querySelector("p");
  if (shape === "count" && first && first.firstChild?.nodeType === Node.TEXT_NODE) {
    const lead = first.firstChild;
    const m = lead.textContent.match(/^(You spent |You've spent |)(\$?\d[\d,.]*(?:\s?(?:kg|km|%))?)/);
    if (!m) return;
    const rest = lead.splitText(m[1].length);
    rest.splitText(m[2].length);
    const figure = document.createElement("span");
    figure.className = "digest-figure";
    figure.textContent = rest.textContent;
    rest.replaceWith(figure);
  } else if (shape === "who" && first) {
    const name = (first.textContent.match(/^([A-Z][\w'-]*(?: [A-Z][\w'-]*)?) /) || [])[1];
    if (!name) return;
    const card = document.createElement("div");
    card.className = "digest-card";
    const head = document.createElement("div");
    head.className = "digest-card-head";
    setLabel(head, `ph:user ${name}`);
    const offer = answerEl.querySelector("p:last-of-type");
    const body = [...answerEl.children].filter((el) => el.tagName === "P" && !(el === offer && el.textContent.trim().endsWith("?")));
    first.before(card);
    card.append(head, ...body);
  } else if (shape === "compare") {
    const block = answerEl.querySelector(".md-table-block");
    if (!block) return;
    block.classList.add("digest-table");
    block.dataset.tableView = "fit";
  }
}

//: **Short by default, More expands** (CHAT_PLAN B5): the lines past the
//: short answer arrive cited and are folded here behind one plain-tier
//: "Show five more", found by the bold label each opens with (the server's
//: `support.more.labels`), so the marks inside them keep their numbers.
//: Pressed, they show and the first of them takes focus.
function digestMore(answerEl, more) {
  if (!answerEl || !more) return;
  const wanted = new Set((more.labels || []).map((l) => `${l}:`));
  //: A line said as prose has no bold label: found by the words it opens with.
  const starts = (more.starts || []).filter(Boolean);
  if (!wanted.size && !starts.length) return;
  const folded = [...answerEl.querySelectorAll(":scope > p")].filter((p) => {
    const lead = p.firstElementChild;
    if (lead && lead.tagName === "STRONG" && p.firstChild === lead && wanted.has(lead.textContent.trim())) return true;
    const said = p.textContent.replace(/\s+/g, " ").trim();
    return starts.some((start) => said.startsWith(start));
  });
  if (!folded.length) return;
  const button = document.createElement("button");
  button.type = "button";
  button.className = "linklike digest-more";
  setLabel(button, `ph:caret-down ${more.label}`);
  button.setAttribute("aria-expanded", "false");
  for (const p of folded) p.hidden = true;
  folded[0].before(button);
  button.addEventListener("click", () => {
    for (const p of folded) p.hidden = false;
    button.remove();
    folded[0].tabIndex = -1;
    folded[0].focus({ preventScroll: true });
  });
}

//: The digest's one offer (CHAT_PLAN decision 70, B12): its last line, a
//: question the answer asks ("Remind you to ask the tutor on Thursday?"),
//: made the button that does it. Plain tier (`.linklike`): an action in
//: running text. A reminder goes through the same door Quick add uses
//: (`/reminders/parse`, rules first, the person's clock); a checklist or a
//: note is a new note. Each one says what it did, with Undo.
function digestOffer(answerEl, offer) {
  if (!answerEl || !offer || !offer.label) return;
  const line = [...answerEl.querySelectorAll("p")].reverse().find((p) => p.textContent.trim() === offer.label);
  if (!line) return;
  const button = document.createElement("button");
  button.type = "button";
  button.className = "linklike digest-offer";
  button.textContent = offer.label;
  button.addEventListener("click", async () => {
    button.disabled = true;
    try {
      let undo = null;
      let said = "";
      if (offer.kind === "open") {
        //: A page, not a thing made: nothing to undo, and the line stays.
        if (offer.surface === "statistics") openStatistics();
        else actNavigate(offer.surface);
        button.disabled = false;
        return;
      }
      if (offer.kind === "reminder") {
        const made = await apiJson("/reminders/parse", {
          method: "POST",
          body: JSON.stringify({ text: offer.text, tz_offset_minutes: -new Date().getTimezoneOffset() }),
        });
        const repeats = { daily: ", then every day", weekly: ", then every week", monthly: ", then every month" }[made.recurring] || "";
        said = `Reminder set: ${made.text}, ${relativeWhen(made.due_at)}${repeats}.`;
        undo = () => apiJson(`/reminders/${made.id}`, { method: "DELETE" });
        if (typeof loadReminders === "function") loadReminders();
      } else if (offer.kind === "checklist" || offer.kind === "note") {
        const items = (offer.items || []).map((item) => `- [ ] ${item}`).join("\n");
        const content = offer.kind === "checklist" ? `${offer.text}\n\n${items}` : offer.text;
        const made = await apiJson("/entries", { method: "POST", body: JSON.stringify({ content }) });
        said = `Saved a note: ${String(offer.text).split("\n")[0]}.`;
        undo = () => apiJson(`/entries/${made.id}`, { method: "DELETE" });
      }
      line.textContent = said;
      line.classList.add("muted");
      if (undo) {
        toastAction(said, "Undo", async () => {
          await undo();
          line.replaceChildren(button);
          line.classList.remove("muted");
          button.disabled = false;
        });
      }
    } catch (error) {
      button.disabled = false;
      toast(error.message, true);
    }
  });
  line.replaceChildren(button);
}
