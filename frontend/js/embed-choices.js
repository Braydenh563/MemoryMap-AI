// embed-choices.js: Settings, Search and index's embedding models (INBOX 700).
// Lazy (`embedChoices` in app.js's LAZY_MODULES), fetched the first time the
// Search and index section is drawn, so the boot scripts carry none of it.
//
// The owner: "can you also add more embedding model options as alternatives
// in the models??". The list is the server's (`core/embedmodels.catalogue`):
// each row says what the model costs and buys, Use switches in one press where
// the licence allows it, and anything else links to its terms. A switch runs
// in the background (`core/embedswitch.py`); search keeps using the current
// model until the new set is complete, so the row shows its progress here and
// Background tasks shows the same job with Quit.

const embedChoicesUi = { poll: null };

async function renderEmbedChoices() {
  const list = $("embed-choices");
  if (!list) return;
  if (!list.children.length) showSkeletons(list, 3, "li");
  const body = await apiJson("/embedding-models/choices", { silent: true }).catch(() => null);
  clearSkeletons(list);
  if (!body) return;
  const now = Date.now() / 1000;
  list.replaceChildren(...body.choices.map((choice) => embedChoiceRow(choice, body, now)));
  const done = body.switch || {};
  $("embed-choices-status").textContent = done.running ? "" : done.message || "";
  clearTimeout(embedChoicesUi.poll);
  if (done.running && settingsModalOpen() && currentSettingsSection === "searchindex") {
    embedChoicesUi.poll = setTimeout(renderEmbedChoices, 2000);
  }
}

function embedChoiceRow(choice, body, now) {
  const switching = body.switch || {};
  const current = body.current || {};
  const inUse = current.backend === choice.backend && current.model === choice.model;
  const moving = switching.running && switching.backend === choice.backend && switching.model === choice.model;

  const li = document.createElement("li");
  li.className = "extras-row embed-choice";
  li.dataset.choice = choice.id;
  const head = document.createElement("div");
  head.className = "entry-meta";
  const title = document.createElement("span");
  title.className = "entry-title";
  const name = document.createElement("strong");
  name.textContent = choice.label;
  title.append(name, chip(choice.backend === "ollama" ? "Ollama" : "Built in", "item-label"));
  if (inUse) title.appendChild(chip("ph:check-circle In use", "item-label is-ok"));
  else if (choice.default) title.appendChild(chip("Default", "item-label"));
  head.appendChild(title);

  const actions = document.createElement("span");
  actions.className = "entry-actions";
  if (!inUse && !moving && choice.one_press) {
    const use = smallButton("ph:swap Use", `Switch search to ${choice.label}`, () => embedChoiceUse(choice));
    use.disabled = Boolean(switching.running);
    if (switching.running) use.title = "Wait for the switch in hand to finish.";
    actions.appendChild(use);
  } else if (!choice.one_press && choice.terms_url) {
    actions.appendChild(
      smallButton("ph:arrow-square-out Terms", `Read the terms for ${choice.label}`, () =>
        window.open(safeHref(choice.terms_url), "_blank", "noopener,noreferrer")
      )
    );
  }
  head.appendChild(actions);
  li.appendChild(head);

  const best = document.createElement("p");
  best.className = "muted extras-enables";
  best.textContent = choice.best_for;
  const meta = document.createElement("p");
  meta.className = "muted extras-meta";
  meta.textContent = [choice.params ? `${choice.params} parameters` : "", choice.size, choice.languages, choice.context, choice.licence]
    .filter(Boolean)
    .join(" · ");
  li.append(best, meta);

  if (!choice.one_press && choice.why_not) {
    const why = document.createElement("p");
    why.className = "muted extras-caveat";
    setLabel(why, `ph:scales ${choice.why_not}`);
    li.appendChild(why);
  }

  //: The switch to this model, in its row: a bar over the notes done (none
  //: while the model is fetched or loaded) and how long it has run.
  if (moving) {
    const bar = document.createElement("progress");
    bar.className = "task-progress";
    if (switching.phase === "stage" && switching.total) {
      bar.max = switching.total;
      bar.value = switching.done;
    }
    bar.setAttribute("aria-label", `Switching to ${choice.label}`);
    const line = document.createElement("p");
    line.className = "muted task-detail";
    const stage = {
      prepare: "Getting the model ready; the first time it is downloaded.",
      stage: `${switching.done} of ${switching.total} notes read. Search uses the current model until then.`,
      swap: "Swapping the new vectors in.",
      paragraphs: "Reading long notes paragraph by paragraph.",
    }[switching.phase] || "Starting.";
    line.textContent = switching.started ? `${stage} ${taskElapsed(now - switching.started)}.` : stage;
    li.append(bar, line);
  }
  return li;
}

async function embedChoiceUse(choice) {
  const ok = await confirmDialog(
    `Switch search to ${choice.label}?\n\n${choice.size}, ` +
      (choice.backend === "ollama" ? "pulled into Ollama" : "downloaded to this machine") +
      " once if it is not here yet. Every note is read again in the background; search keeps using the current model until that finishes.",
    { confirmLabel: "Switch" }
  );
  if (!ok) return;
  const result = await apiJson("/embedding-models/use", {
    method: "POST",
    body: JSON.stringify({ id: choice.id }),
  }).catch((e) => ({ started: false, message: e.message }));
  toast(result.message, !result.started);
  renderEmbedChoices();
}
