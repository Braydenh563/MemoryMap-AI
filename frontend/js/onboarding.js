// onboarding.js: the first-run welcome card (five slides' worth of text, the
// setup check with its two one-click offers, and the card's own buttons).
// Moved out of settings-wiring.js on 2026-10-05 (the boot-script gzip budget,
// ratchet in tests/test_static_compression.py): the card opens once per
// notebook, or when someone presses "Replay the welcome", so nothing here is
// needed to draw the first screen. Loaded on first use by
// `LAZY_MODULES.onboarding` (app.js), whose stand-in for `openOnboarding`
// fetches this file and then calls the real one. `maybeShowOnboarding` stays
// in settings-wiring.js, because it is what decides whether to open the card
// at all and it is a dozen lines. The three buttons are wired here, at the
// bottom: they are only on screen while the card is, and the card only opens
// through `openOnboarding`, so the wiring has always run by the time they can
// be pressed.

// --- first-run onboarding tour (learnability) -------------------------------

const ONBOARDING_SLIDES = [
  {
    icon: "ph:brain",
    title: "Welcome to MemoryMap",
    //: **"Out of the box", not "ever".** Measured 2026-09-21: two features
    //: make outbound requests, web search and the update check, and both are
    //: off by default (`core/config.py`), so the claim is exactly true until
    //: the person turns one on and false the moment they do. Saying so is
    //: stronger than the absolute, not weaker: this sentence sits in the same
    //: Settings area as both switches, and a promise the app itself offers to
    //: break is the kind a privacy-minded reader checks and stops trusting.
    text: "A 100% offline notebook where a local AI files your thoughts and answers questions about them. Out of the box nothing leaves this computer. Two features can, web search and the update check, and both stay off until you turn them on.",
  },
  // §27: "before the person's first capture fails silently into
  // Uncategorised and they assume the AI is broken rather than absent", so
  // this sits before the capture slide, not after. `dynamic` is filled in by
  // `loadOnboardingDiagnostics` once the overlay is actually showing it,
  // reusing /models/status and /storage rather than a new endpoint, both
  // already exist and are already polled elsewhere in the app.
  {
    icon: "ph:stethoscope",
    title: "Your setup",
    dynamic: true,
  },
  // **The seven slides that used to follow this one are the guided tour now**
  // (frontend/js/tour.js). They described a tab in prose, "the Graph tab draws
  // how your notes connect", "press Ctrl+K anywhere", from the middle of a
  // screen that was covering the tab bar those words were about, which is the
  // gap the owner named: "there is no guided tour and introduction, with
  // positioned popup cards". Nothing was dropped: every one of them is a step
  // in TOUR_SECTIONS anchored to the control it used to describe, which is
  // both shorter to read and the only version that can point at anything.
  //
  // What stays here is what an anchored card cannot do. The welcome says what
  // MemoryMap is before there is any interface to point at, and the setup
  // slide is a live check of Ollama and the notebook's folder with its two
  // one-click offers (pull a model, seed example notes) on it: a card the size
  // of a sentence, hung off a control, is the wrong place for either. So the
  // two surfaces are kept apart on purpose, the welcome ends by handing over
  // to the tour, and Settings, help and guide offers them separately.
];

const onboardingRun = { index: 0, diagnosticsToken: 0 };
// A stale diagnostics fetch (the user clicked Next or Skip before it
// resolved) must never overwrite whichever slide is showing by the time it
// lands: this is what tells a resolved probe whether it still applies.

// §27's first-run diagnostics: Ollama reachability and where the notebook
// actually lives, both already computed for other UI (the AI-status pill,
// Settings → Data) and just not surfaced before a first capture could fail
// silently into Uncategorised.
async function loadOnboardingDiagnostics(forSlide) {
  const token = ++onboardingRun.diagnosticsToken;
  const [models, storage, notebook] = await Promise.all([
    apiJson("/models/status").catch(() => null),
    apiJson("/storage").catch(() => null),
    apiJson("/entries/count").catch(() => null),
  ]);
  if (token !== onboardingRun.diagnosticsToken) return; // superseded by a later slide
  if (onboardingRun.index !== forSlide) return; // the user moved on already
  if ($("onboarding-overlay").classList.contains("hidden")) return; // or closed it

  const lines = [];
  lines.push(
    models && models.ollama_running
      ? "Ollama is running, so Atlas will file your notes and answer questions."
      : "No model is running yet, and MemoryMap works without one: notes are " +
          "searched by keyword, and filing catches up once a model is on."
  );
  if (storage) {
    //: Where it lives, and its size once there is one (INBOX 472).
    const mb = (storage.database_bytes || 0) / (1024 * 1024);
    lines.push(
      mb >= 0.1
        ? `Your notebook lives at ${storage.data_dir} (${mb.toFixed(1)} MB).`
        : `Your notebook lives at ${storage.data_dir}.`
    );
    // ROADMAP.md's onboarding item named this the one still-open piece: a
    // data-dir writability check. The database opening at all already
    // implies it was writable at boot, but a synced folder, a permissions
    // change, or a disk remounted read-only can flip that afterwards with
    // nothing in the interface ever saying so, a save just starts failing,
    // on the one screen this app has that already knows where the notebook
    // lives and is looking right at it.
    if (storage.data_dir_writable === false) {
      lines.push(
        "That folder isn't writable right now, so new notes and edits won't " +
          "save. Check its permissions, or move the notebook somewhere " +
          "MemoryMap can write to (Settings → Account & security)."
      );
    }
  } else {
    lines.push("Couldn't check where your notebook lives just now.");
  }
  $("onboarding-text").textContent = lines.join(" ");
  renderOnboardingActions(models, notebook);
}

// The two concrete gaps ROADMAP.md named for onboarding: offering to pull a
// model, and seeding example notes so the Graph/Timeline/Dashboard aren't
// empty on a first look. Both are one-click offers on the setup slide,
// never automatic: a fresh install with no notes and no model is exactly
// the state a real, deliberate first run looks like too, so this only ever
// acts on an explicit click.
function renderOnboardingActions(models, notebook) {
  const box = $("onboarding-actions");
  box.replaceChildren();
  const offers = [];

  if (models && models.ollama_running && !models.chat_model_installed) {
    offers.push(
      smallButton(
        "Download a starter model",
        "Pull llama3.2 (~2.2 GB) with Ollama, in the background",
        async (event) => {
          const offer = event.currentTarget;
          setBusy(offer, true, "Downloading in the background…");
          try {
            await api("/models/pull", {
              method: "POST",
              body: JSON.stringify({ name: "llama3.2" }),
            });
            refreshModelStatus();
          } catch (error) {
            setBusy(offer, false);
            toast(error.message || "Couldn't start the download.", true);
          }
        },
        false
      )
    );
  }

  //: AI off: offer the way to turn it on (INBOX 472).
  if (models && !models.ollama_running) {
    offers.push(
      smallButton(
        "ph:plugs Connect a model",
        "Close the welcome and open Settings at Models, where a model is connected",
        () => {
          closeOnboarding();
          openSettingsModal("models");
        }
      )
    );
  }

  if (notebook && notebook.count === 0) {
    offers.push(
      smallButton(
        "Add example notes",
        "Seed a few linked notes so the Graph, Timeline and Dashboard have something to show",
        async (event) => {
          event.target.disabled = true;
          try {
            const result = await apiJson("/entries/seed-examples", { method: "POST" });
            event.target.textContent =
              result && result.created
                ? `Added ${result.created}: look for the "welcome" tag`
                : "Added";
            loadEntries();
          } catch (error) {
            event.target.disabled = false;
            toast(error.message || "Couldn't add the example notes.", true);
          }
        },
        false
      )
    );
  }

  box.classList.toggle("hidden", offers.length === 0);
  for (const button of offers) box.appendChild(button);
}

function renderOnboardingSlide() {
  const slide = ONBOARDING_SLIDES[onboardingRun.index];
  setLabel($("onboarding-icon"), slide.icon);
  //: **Atlas says hello on the first card** (the owner: "atlas should also
  //: be in the welcome tour as well to greet new users"). Its own face,
  //: pleased and always moving, with one line in its own voice; the later
  //: cards keep the app's logo, so a new person meets both.
  const atlas = $("onboarding-atlas");
  const greet = onboardingRun.index === 0 && typeof atlasMark === "function";
  atlas.classList.toggle("hidden", !greet);
  $("onboarding-emblem").classList.toggle("hidden", greet);
  //: One mark per card (INBOX 472).
  $("onboarding-icon").classList.add("hidden");
  if (greet) {
    const face = document.createElement("span");
    face.className = "nm-live";
    face.appendChild(atlasMark(104, "happy"));
    const say = document.createElement("p");
    say.className = "onboarding-atlas-say";
    say.textContent = `Hi, I'm ${aiNameNow()}. I'll file what you write and find it again when you ask.`;
    atlas.replaceChildren(face, say);
  }
  $("onboarding-title").textContent = slide.title;
  if (slide.dynamic) {
    setLabel($("onboarding-text"), "ph:spin Checking Ollama and where your notebook lives…");
    loadOnboardingDiagnostics(onboardingRun.index);
  } else {
    $("onboarding-text").textContent = slide.text;
  }
  const dots = $("onboarding-dots");
  dots.replaceChildren();
  ONBOARDING_SLIDES.forEach((_, i) => {
    const dot = document.createElement("span");
    dot.className = "onboarding-dot" + (i === onboardingRun.index ? " active" : "");
    dots.appendChild(dot);
  });
  $("onboarding-back").classList.toggle("hidden", onboardingRun.index === 0);
  const last = onboardingRun.index === ONBOARDING_SLIDES.length - 1;
  // "Start the tour", not "Get started": the last press of the welcome now
  // opens the tour's first section rather than dropping somebody on the
  // Dashboard with nothing said about where anything is. The word has to say
  // so, or the tour arrives as a surprise on top of a card they just closed.
  const tourOn = typeof TOUR_ENABLED === "undefined" || TOUR_ENABLED;
  $("onboarding-next").textContent = last ? (tourOn ? "Start the tour" : "Get started") : "Next";
  //: **And the other answer to that offer, in words** (the owner, 2026-09-21:
  //: "add a skip guided tour button to the welcome intro panels"). The left
  //: button has always closed the welcome and counted as declining the tour,
  //: which `closeOnboarding` records, but on the last slide it still said
  //: "Skip" beside a primary that says "Start the tour", so the one thing it
  //: was answering was the one thing it did not name. It names it there.
  const skip = $("onboarding-skip");
  skip.textContent = last && tourOn ? "Skip the tour" : "Skip";
  skip.title = last
    ? "Go straight to the app. You can start the tour any time from Settings, Help."
    : "Close the welcome and go straight to the app";
  skip.setAttribute("aria-label", skip.title);
}

function openOnboarding() {
  onboardingRun.index = 0;
  overlayReturnFocus = document.activeElement;
  renderOnboardingSlide();
  $("onboarding-overlay").classList.remove("hidden");
  $("onboarding-next").focus();
}

function closeOnboarding() {
  $("onboarding-overlay").classList.add("hidden");
  localStorage.setItem("onboardingDone", "1");
  // Skipping the welcome is also an answer about the tour: whoever closed this
  // card has been offered the introduction and said no, so nothing may open
  // the tour at them by itself afterwards. `tourClose` writes the same key
  // when the tour itself ends, and Settings, help and guide is the way back to
  // either of them.
  localStorage.setItem("tourDone", "1");
  overlayReturnFocus?.focus?.();
  overlayReturnFocus = null;
}

function onboardingNext() {
  if (onboardingRun.index >= ONBOARDING_SLIDES.length - 1) {
    closeOnboarding();
    // The hand-off: the welcome says what this is, the tour says where things
    // are, and the last press of the one starts the other. Guarded because
    // tour.js is a separate file loaded after this one, and a page served
    // without it must still close the welcome cleanly.
    //: Only if the tour is switched on: `TOUR_ENABLED` in tour.js is the one
    //: flag, and the welcome's primary is relabelled to match.
    if (typeof openTour === "function" && typeof TOUR_ENABLED !== "undefined" && TOUR_ENABLED) {
      openTour("basics");
    }
    return;
  }
  onboardingRun.index += 1;
  renderOnboardingSlide();
}

function onboardingBack() {
  if (onboardingRun.index === 0) return;
  onboardingRun.index -= 1;
  renderOnboardingSlide();
}

$("onboarding-next").addEventListener("click", onboardingNext);
$("onboarding-back").addEventListener("click", onboardingBack);
$("onboarding-skip").addEventListener("click", closeOnboarding);
