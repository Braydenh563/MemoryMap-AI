// first-run.js: the dashboard's first steps (WORLD_CLASS_PLAN 25c, Brief 49).
// Three steps a new notebook is walked through, each ticked when it is done
// rather than when it is pressed: your name, a first note, a first answer from
// your notes (which needs no model). Beside them, once, the sample notebook:
// a handful of example notes to explore, taken away again in one press
// (`POST` and `DELETE /help/sample-notebook`). The card stays on the dashboard
// until the three are done and the sample notes are gone, or until Hide; it
// was the empty notebook's card only, so it went with the first note, before
// the step that shows what the notes are for. Lazy: dashboard.js's
// `renderFirstStepsLazy` fetches it while the steps may still be shown.

async function firstStepsState() {
  const named = Boolean(((typeof prefsCache === "object" && prefsCache?.display_name) || "").trim());
  //: An answer from Ask is kept in the Ask history, a chat in the chat list:
  //: either one is the third step done.
  const [asks, chats, sample] = await Promise.all([
    apiJson("/ask-history/stats").catch(() => ({ total: 0 })),
    apiJson("/conversations?limit=1").catch(() => []),
    apiJson("/help/sample-notebook").catch(() => ({ live: 0, added: true })),
  ]);
  const samples = sample.live || 0;
  const noted = allEntries.length > samples;
  const asked = (asks.total || 0) > 0 || (Array.isArray(chats) && chats.length > 0);
  return { named, noted, asked, samples, offered: Boolean(sample.added) };
}

function firstStepButton({ number, done, icon, label, note, doneNote, run }) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "start-step";
  button.classList.toggle("is-done", done);
  const glyph = document.createElement("span");
  glyph.className = "start-step-icon";
  glyph.setAttribute("aria-hidden", "true");
  setLabel(glyph, done ? "ph:check-circle" : icon);
  const text = document.createElement("span");
  const title = document.createElement("strong");
  title.textContent = `${number}. ${label}`;
  const line = document.createElement("span");
  line.className = "muted";
  line.textContent = done ? doneNote : note;
  text.append(title, line);
  button.append(glyph, text);
  if (done) button.setAttribute("aria-label", `${label}: done`);
  button.addEventListener("click", run);
  return button;
}

//: Step one is typed where it is asked: a name field in the tile, Enter
//: saves it (`PUT /preferences`), rather than a door into Settings, General,
//: whose Save button is three presses further on.
function firstStepName(host) {
  const form = document.createElement("form");
  form.className = "start-step start-step-form";
  const glyph = document.createElement("span");
  glyph.className = "start-step-icon";
  glyph.setAttribute("aria-hidden", "true");
  setLabel(glyph, "ph:hand-waving");
  const text = document.createElement("span");
  const title = document.createElement("strong");
  title.textContent = "1. Your name";
  const input = document.createElement("input");
  input.type = "text";
  input.id = "first-steps-name";
  input.maxLength = 60;
  input.autocomplete = "given-name";
  input.placeholder = "Your first name, then Enter";
  input.setAttribute("aria-label", "Your name, for the greeting and Atlas");
  text.append(title, input);
  form.append(glyph, text);
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const name = input.value.trim();
    if (!name) return;
    try {
      prefsCache = await apiJson("/preferences", { method: "PUT", body: JSON.stringify({ display_name: name }) });
    } catch (err) {
      toast(`Your name could not be saved: ${err.message}`, true);
      return;
    }
    renderDashboardGreeting();
    renderFirstSteps(host);
  });
  return form;
}

async function firstStepsSample(host, add, event) {
  //: Eight saves, each indexed for search: seconds on a first launch, so the
  //: press says it is working and cannot be pressed twice.
  const button = event?.currentTarget;
  if (button) {
    button.disabled = true;
    button.setAttribute("aria-busy", "true");
    setLabel(button, add ? "ph:spinner Adding the sample notes" : "ph:spinner Removing the sample notes");
  }
  try {
    if (add) {
      const made = await apiJson("/help/sample-notebook", { method: "POST" });
      toast(`Added ${made.created} sample notes. Try asking "where is the spare key?"`);
    } else {
      const gone = await apiJson("/help/sample-notebook", { method: "DELETE" });
      //: In the bin, so the bin's Restore is the undo (rule 1.9: no new undo).
      toast(`Moved ${gone.binned} sample notes to the bin.`);
    }
  } catch (err) {
    toast(`The sample notes could not be ${add ? "added" : "removed"}: ${err.message}`, true);
    renderFirstSteps(host);
    return;
  }
  await loadEntries();
  renderFirstSteps(host);
}

//: A worded button named by its words (WCAG 2.5.3): `smallButton` names every
//: button by its title, which suits an icon and hides a label.
function firstStepsDoor(label, title, run) {
  const button = smallButton(label, title, run);
  button.removeAttribute("aria-label");
  return button;
}

function firstStepsHide(host) {
  prefs.set("firstStepsHidden", "1");
  host.replaceChildren();
}

function firstStepsCard(host, state) {
  const card = document.createElement("section");
  card.className = "card dash-widget dash-getting-started first-steps";
  card.setAttribute("aria-labelledby", "first-steps-title");
  const title = document.createElement("h2");
  title.id = "first-steps-title";
  //: Not "Your notebook is empty" again: the hero says so (INBOX 472).
  title.textContent = "Start in three steps";
  const blurb = document.createElement("p");
  blurb.className = "muted";
  blurb.textContent =
    "Type a thought and it is filed for you; ask a question and the answer comes from your notes. " +
    "Everything stays on this machine, and none of it needs an AI model.";
  const steps = document.createElement("div");
  steps.className = "start-steps";
  steps.append(
    state.named
      ? firstStepButton({
          number: 1, done: true, icon: "ph:hand-waving", label: "Your name",
          doneNote: "Done. Change it in Settings, General.",
          run: () => openSettingsModal("preferences"),
        })
      : firstStepName(host),
    firstStepButton({
      number: 2, done: state.noted, icon: "ph:pencil-simple", label: "Write a note",
      note: "A half sentence is fine; add a #tag if you like.", doneNote: "Done. Write another any time.",
      run: () => startNewNote(),
    }),
    firstStepButton({
      number: 3, done: state.asked, icon: "ph:chat-circle", label: "Ask your notebook",
      note: "An answer from your notes, no AI model needed.", doneNote: "Done. Ask again from Notes, Ask.",
      run: () => openAskFromDashboard(),
    })
  );
  const more = document.createElement("div");
  more.className = "row wrap first-steps-more";
  //: Offered once: on a notebook with no notes of its own, until it is taken.
  if (state.samples) {
    more.appendChild(
      firstStepsDoor("ph:trash Remove the sample notes", "Move the sample notes to the bin", (event) => firstStepsSample(host, false, event))
    );
  } else if (!state.noted && !state.offered) {
    more.appendChild(
      firstStepsDoor("ph:books Try a sample notebook", "Add eight example notes to explore; remove them in one press", (event) => firstStepsSample(host, true, event))
    );
  }
  more.append(
    firstStepsDoor("ph:backpack Bring notes in", "Import from a file or another app", () => openSettingsModal("data")),
    firstStepsDoor("ph:compass Take the tour", "Two minutes through what is here", () => openTour("basics")),
    firstStepsDoor("ph:book-open-text Read the manual", "Every help topic on one page", () => lazyScript("/js/manual.js").then((ok) => ok && openManual()))
  );
  //: Hide is offered once there is a notebook to show instead.
  if (state.noted || state.samples) more.appendChild(firstStepsDoor("ph:eye-slash Hide these steps", "Hide the first steps for good", () => firstStepsHide(host)));
  card.append(title, blurb, steps, more);
  return card;
}

async function renderFirstSteps(host) {
  lazyScript("/css/first-run-lazy.css");
  const state = await firstStepsState();
  //: All three done and no sample notes left: the steps have done their job.
  if (state.named && state.noted && state.asked && !state.samples) {
    prefs.set("firstStepsHidden", "1");
    host.replaceChildren();
    return;
  }
  host.replaceChildren(firstStepsCard(host, state));
  //: The greeting's "Add your name" is step one's second door: one is enough.
  document.getElementById("dash-name-nudge")?.remove();
}
