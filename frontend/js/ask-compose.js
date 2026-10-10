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
      const bracketed = /\[$/.test(name.previousSibling?.textContent || "") && /^\]/.test(name.nextSibling?.textContent || "");
      if (!g || !bracketed) continue;
      name.dataset.noteId = String(g.note_id);
      name.tabIndex = 0;
      name.setAttribute("role", "link");
      name.setAttribute("aria-label", `Open the note ${g.title}`);
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
      const open = (event) => {
        event.stopPropagation();
        closeCitationPeek();
        flashEntry(g.note_id);
      };
      name.addEventListener("click", open);
      name.addEventListener("keydown", (event) => event.key === "Enter" && open(event));
    }
  }
}
