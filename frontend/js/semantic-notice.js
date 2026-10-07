// semantic-notice.js: the first-time notice for search by meaning's automatic
// install. Lazy (app.js `LAZY_MODULES.semanticNotice`), fetched by
// `refreshBackgroundTasks` (status.js) only when /tasks lists an install the
// app started itself (`auto: true`, core/extras.py), so the boot scripts carry
// a few lines of it and nothing else.
//
// The owner: "the user should be able to cancel or refuse the auto install of
// sentence transformers when first downloading the app". The install is about
// 2 GB and needs the internet, so the app says so the first time it begins one,
// in DESIGN.md's toast recipe (a toast with its action and a close, kept up
// until it is answered because the message stays true until the install ends),
// and offers "Don't install". That cancels the job (POST /tasks/cancel), turns
// the preference off (Settings, Search and index) and says what that left, with
// an Undo that turns it back on and starts the install by hand.

//: The open notice and whether this page has shown one. A host object, not
//: two top-level lets (tests/test_global_scope_ratchet.py).
const SEMANTIC_NOTICE = { note: null, shown: false };
const SEMANTIC_NOTICE_KEY = "mm-semantic-notice-seen";

function semanticNoticeSeenBefore() {
  try {
    return prefs.get(SEMANTIC_NOTICE_KEY, "") === "1";
  } catch (error) {
    return false;
  }
}

async function semanticSetAutoInstall(on) {
  prefsCache = await apiJson("/preferences", {
    method: "PUT",
    body: JSON.stringify({ semantic_auto_install: on }),
  });
  const box = $("pref-semantic-auto-install");
  if (box) box.checked = on;
}

async function semanticDecline(task) {
  try {
    await semanticSetAutoInstall(false);
    await apiJson("/tasks/cancel", {
      method: "POST",
      body: JSON.stringify({ kind: "extra", name: task.name || "semantic" }),
    });
  } catch (error) {
    toast(error.message, true);
    return;
  }
  refreshBackgroundTasks();
  toastAction(
    "Search by meaning will not be installed. Search uses keywords. Change this in Settings, Search and index.",
    "Undo",
    async () => {
      try {
        await semanticSetAutoInstall(true);
        await apiJson("/extras/semantic/install", { method: "POST" });
        toast("Installing search by meaning in the background.");
        refreshBackgroundTasks();
      } catch (error) {
        toast(error.message, true);
      }
    },
    { go: { settings: "searchindex", focus: "pref-semantic-auto-install" } }
  );
}

//: Called on every poll that lists an automatic install, and once with null
//: when the notice is open and the install has gone (finished, failed or
//: stopped elsewhere), which closes it.
function semanticInstallNotice(task) {
  const open = SEMANTIC_NOTICE.note;
  if (!task) {
    if (open && open.isConnected) dismissToast(open);
    SEMANTIC_NOTICE.note = null;
    return;
  }
  if (SEMANTIC_NOTICE.shown || semanticNoticeSeenBefore()) return;
  SEMANTIC_NOTICE.shown = true;
  try {
    localStorage.setItem(SEMANTIC_NOTICE_KEY, "1");
  } catch (error) {
    // The in-memory flag still holds for this page.
  }
  const note = document.createElement("div");
  note.className = "toast semantic-install-toast";
  const text = document.createElement("span");
  text.className = "toast-msg";
  text.textContent =
    "Installing search by meaning (about 2 GB). Keyword search works meanwhile.";
  const decline = document.createElement("button");
  decline.type = "button";
  decline.className = "small toast-action";
  decline.textContent = "Don't install";
  decline.addEventListener("click", () => {
    dismissToast(note);
    SEMANTIC_NOTICE.note = null;
    semanticDecline(task);
  });
  note.append(text, decline, toastCloseButton(note, null));
  const host = toastHost();
  toastStack(host, () => host.appendChild(note));
  SEMANTIC_NOTICE.note = note;
}

//: The same choice on the welcome card (onboarding.js), where the first
//: diagnostics are read: the package is missing, so say what happens and let
//: the person decide before the app starts the download. One button that
//: states the other answer to the one the preference holds now.
async function semanticOnboardingOffer(box) {
  const prefs = await apiJson("/preferences", { silent: true }).catch(() => null);
  if (!prefs || !box.isConnected || $("onboarding-overlay").classList.contains("hidden")) return;
  const refusing = prefs.semantic_auto_install !== false;
  const button = smallButton(
    refusing ? "Don't install search by meaning" : "Install search by meaning",
    refusing
      ? "Search by meaning is a one-time download of about 2 GB. Skip it and search uses keywords."
      : "Search uses keywords now. Install search by meaning (about 2 GB, once) in the background.",
    async () => {
      button.disabled = true;
      try {
        await semanticSetAutoInstall(!refusing);
        if (refusing) {
          await apiJson("/tasks/cancel", { method: "POST", body: JSON.stringify({ kind: "extra", name: "semantic" }) });
          button.textContent = "Search by meaning will not be installed";
        } else {
          await apiJson("/extras/semantic/install", { method: "POST" });
          button.textContent = "Installing in the background";
        }
      } catch (error) {
        button.disabled = false;
        toast(error.message, true);
      }
    }
  );
  box.classList.remove("hidden");
  box.appendChild(button);
}
