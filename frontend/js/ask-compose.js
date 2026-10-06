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
