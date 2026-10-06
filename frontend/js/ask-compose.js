// ask-compose.js: the Ask box's "AI" / "From your notes" switch (INBOX 688).
//
// The owner: "is there a way to do very good imitations of ai responses but
// using string concatenation with the app when the ai isnt available with the
// option to toggle between them in the ask subtab??" The answer itself is the
// server's (`ai/composer.py`): every sentence quoted from a note, only the
// connective words written by the app. This file is the switch that asks for
// it, `#ask-source-seg` in index.html, the DESIGN.md `.seg` recipe (two short
// choices, always in view).
//
// - The choice is this device's (`prefs`, "ask-answer-from"), read by
//   `streamChatEvents` on every notes-only turn and sent as `answer_from`.
// - With no model running "From your notes" is the answer whatever is stored,
//   so the switch shows it chosen and AI disabled with the reason; the stored
//   choice is left alone, and AI comes back the moment a model does.
// - Lazy and preloaded three seconds after boot (app.js), because the boot
//   scripts are at their gzip cap; until it lands the markup's own state (AI)
//   stands, and the server composes regardless when no model runs.

const ASK_ANSWER_FROM_KEY = "ask-answer-from";

//: The reason AI is greyed, on the button and in its hover text.
const ASK_AI_OFF_REASON = "No model is running, so answers come from your notes. Connect a model in Settings to choose AI.";

function askAnswerFrom() {
  if (aiIsOff()) return "notes";
  return prefs.get(ASK_ANSWER_FROM_KEY) === "notes" ? "notes" : "ai";
}

function renderAskSourceSeg() {
  const seg = $("ask-source-seg");
  if (!seg) return;
  const off = aiIsOff();
  const chosen = askAnswerFrom();
  for (const button of seg.querySelectorAll("button[data-answer-from]")) {
    const on = button.dataset.answerFrom === chosen;
    button.classList.toggle("active", on);
    button.setAttribute("aria-pressed", on ? "true" : "false");
    if (button.dataset.answerFrom === "ai") {
      button.disabled = off;
      button.title = off ? ASK_AI_OFF_REASON : "Atlas answers with your model, citing your notes";
    }
  }
}

function wireAskSourceSeg() {
  const seg = $("ask-source-seg");
  if (!seg || seg.dataset.wired) return;
  seg.dataset.wired = "1";
  seg.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-answer-from]");
    if (!button || button.disabled) return;
    prefs.set(ASK_ANSWER_FROM_KEY, button.dataset.answerFrom);
    renderAskSourceSeg();
  });
  //: **Following the model without a hook in the boot scripts.** The status
  //: poll redraws `#ask-offline` on every tick (`renderAiOfflineNotice`),
  //: showing it exactly when no model answers; watching that one attribute
  //: keeps the switch in step with the model starting and stopping.
  const offline = $("ask-offline");
  if (offline) new MutationObserver(renderAskSourceSeg).observe(offline, { attributes: true, attributeFilter: ["class"] });
  renderAskSourceSeg();
}

wireAskSourceSeg();
