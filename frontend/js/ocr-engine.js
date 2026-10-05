// The Tesseract engine's one control (INBOX 443 (3), the owner: "using
// tesseract and how it operates in the ocr workspace is still annoying to use
// and manage").
//
// Measured before this existed: the engine's state was a tooltip on a disabled
// dropdown option, "Install the OCR extra in Settings → Optional extras" (a
// section that is named Packages now), with no install button in the
// workspace, no language choice anywhere, and a Packages row that showed a
// green tick for the Python half alone. This draws one status line, from the
// one status the server computes (`GET /ocr-readers` → `engine`, see
// core/ocr.py's `engine_status`), in the two places a person looks:
//
//  * the OCR workspace (`#ocr-engine`, mounted by library.js): can it read,
//    which language, and when it cannot, one Install button that follows the
//    install to the end;
//  * the Packages row for "Search inside images" (settings-packages.js `renderExtras`):
//    the language choice only, because that row already owns Install,
//    Reinstall, Remove and the progress bar, and a second set would be the
//    duplicate this was told not to build.
//
// A lazy piece (app.js `LAZY_MODULES.ocrEngine`, entry point `ocrEngineMount`):
// the boot scripts only carry the stand-in.

const ocrEngineHosts = new Set();
let ocrEngineLatest = null;
let ocrEngineTimer = null;
//: One install at a time, process-wide, like the server's: `running` follows
//: `GET /extras`, `failed` is the sentence to show until the next try.
const ocrEngineInstall = { running: false, step: "", failed: "" };

//: Mount the status line into `host` and keep it current. `readers` is the
//: `/ocr-readers` answer when the caller already has it (the workspace asked
//: just before); without it this asks. `settings` draws the Packages row's
//: smaller version. `onChange` runs after something here changed the engine
//: (an install finished, a language was chosen).
async function ocrEngineMount(host, { readers = null, settings = false, onChange = null } = {}) {
  if (!host) return null;
  host._ocrEngine = { settings, onChange };
  host.classList.add("ocr-engine");
  ocrEngineHosts.add(host);
  if (readers && readers.engine) {
    ocrEngineLatest = readers;
  } else {
    ocrEngineLatest = await apiJson("/ocr-readers", { silent: true }).catch(() => ocrEngineLatest);
  }
  ocrEnginePaintAll();
  //: An install started in Settings, or before this window was opened, is
  //: still running: pick it up rather than offering a second Install button.
  if (!settings && !ocrEngineInstall.running) {
    const body = await apiJson("/extras", { silent: true }).catch(() => null);
    if (body && body.running && body.installing === "ocr") {
      ocrEngineInstall.running = true;
      ocrEngineInstall.failed = "";
      ocrEngineFollow();
    }
  }
  return ocrEngineLatest;
}

function ocrEnginePaintAll() {
  for (const host of [...ocrEngineHosts]) {
    if (!host.isConnected) {
      ocrEngineHosts.delete(host);
      continue;
    }
    ocrEnginePaint(host);
  }
}

function ocrEngineLanguageName(engine) {
  const code = engine?.language || "";
  if (!code) return "";
  const known = (engine.languages || []).find((l) => l.code === code);
  return known ? known.name : code;
}

function ocrEnginePaint(host) {
  const readers = ocrEngineLatest;
  const engine = readers?.engine;
  const opts = host._ocrEngine || {};
  host.replaceChildren();
  if (!engine || !Object.keys(engine).length) {
    host.hidden = true;
    return;
  }
  //: The Packages row already says "Not installed" and offers Install; this
  //: adds only what it could not say, so a missing engine paints nothing there.
  if (opts.settings && !engine.ready) {
    host.hidden = true;
    return;
  }
  host.hidden = false;
  const line = document.createElement("div");
  line.className = "ocr-engine-line";

  if (ocrEngineInstall.running) {
    line.appendChild(chip("ph:spin Installing Tesseract", "item-label ocr-engine-chip"));
    const step = document.createElement("span");
    step.className = "muted ocr-engine-detail";
    step.textContent = ocrEngineInstall.step || "Starting…";
    const bar = document.createElement("progress");
    bar.className = "task-progress ocr-engine-progress";
    line.append(step, bar);
    host.appendChild(line);
    return;
  }

  if (engine.ready) {
    if (!opts.settings) {
      line.appendChild(
        chip(`ph:check-circle Tesseract${engine.version ? ` ${engine.version}` : ""} is ready`, "item-label is-ok ocr-engine-chip")
      );
    }
    line.appendChild(ocrEngineLanguagePicker(engine, opts));
    if (!opts.settings) {
      line.appendChild(
        smallButton("ph:gear Manage", "Manage Tesseract in Settings, Packages", () => ocrEngineOpenSettings())
      );
    }
    host.appendChild(line);
    if (engine.language_note) {
      const note = document.createElement("p");
      note.className = "muted ocr-engine-note";
      note.textContent = engine.language_note;
      host.appendChild(note);
    }
    return;
  }

  //: Not ready: say which half is missing, what still works, and give the one
  //: action. The sentence about the AI reader is the fallback the owner asked
  //: for, stated before the failure rather than after it.
  line.appendChild(chip("ph:warning Tesseract can't read yet", "item-label is-warn ocr-engine-chip"));
  const detail = document.createElement("span");
  detail.className = "muted ocr-engine-detail";
  const ai = readers.vision ? readers.vision_model : "";
  detail.textContent = ai
    ? `${engine.reason} ${shortModelName(ai)} reads pages until it is installed.`
    : `${engine.reason} Install it here, or start an AI model in Settings, to read pages.`;
  line.appendChild(detail);
  line.appendChild(
    smallButton(
      ocrEngineInstall.failed ? "ph:arrow-clockwise Try again" : "ph:download-simple Install Tesseract",
      "Install Tesseract OCR on this computer",
      () => ocrEngineStartInstall(),
      false
    )
  );
  host.appendChild(line);
  if (ocrEngineInstall.failed) {
    const failed = document.createElement("p");
    failed.className = "ocr-engine-note is-error";
    failed.setAttribute("role", "alert");
    failed.textContent = `${ocrEngineInstall.failed} The install log is in Settings, Packages.`;
    host.appendChild(failed);
  }
}

function ocrEngineLanguagePicker(engine, opts) {
  const wrap = document.createElement("label");
  wrap.className = "ocr-engine-lang-wrap";
  const label = document.createElement("span");
  label.className = "muted ocr-engine-lang-label";
  label.textContent = "Reads in";
  const select = document.createElement("select");
  select.className = "ocr-engine-lang";
  select.setAttribute("aria-label", "Language Tesseract reads in");
  select.title =
    "The language Tesseract reads in. It applies to every read, here and in the background, and is remembered.";
  const options = [{ code: "", name: "Default" }, ...(engine.languages || [])];
  //: A saved combination such as "eng+deu" is not one pack, so it has no row
  //: of its own in the list; show it rather than silently showing "Default".
  if (engine.language && !options.some((o) => o.code === engine.language)) {
    options.push({ code: engine.language, name: engine.language });
  }
  for (const option of options) {
    const row = document.createElement("option");
    row.value = option.code;
    row.textContent = option.name;
    select.appendChild(row);
  }
  select.value = engine.language || "";
  select.addEventListener("change", async () => {
    select.disabled = true;
    try {
      const status = await apiJson("/ocr/language", {
        method: "POST",
        body: JSON.stringify({ language: select.value }),
      });
      if (ocrEngineLatest) ocrEngineLatest.engine = status;
      const name = ocrEngineLanguageName(status);
      toast(
        name
          ? `Tesseract reads in ${name} from now on. Read a page again to use it.`
          : "Tesseract is back to its default language. Read a page again to use it."
      );
      opts.onChange?.(status);
    } catch (error) {
      toast(error.message || "That language could not be set.", true);
    }
    ocrEnginePaintAll();
  });
  wrap.append(label, select);
  return wrap;
}

async function ocrEngineOpenSettings() {
  if (typeof openSettingsModal !== "function") return;
  await openSettingsModal("extras");
  for (let i = 0; i < 30; i += 1) {
    const row = document.getElementById("extra-row-ocr");
    if (row) {
      row.scrollIntoView({ block: "center" });
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
}

async function ocrEngineStartInstall() {
  const ok = await confirmDialog(
    "Install Tesseract OCR?\n\nAbout 10 MB is downloaded from PyPI, then your system's " +
      "package manager (winget, Homebrew, apt) is asked for the Tesseract program. " +
      "It reads text in images on this computer, and nothing is sent anywhere. " +
      "No restart is needed."
  );
  if (!ok) return;
  ocrEngineInstall.failed = "";
  const result = await apiJson("/extras/ocr/install", { method: "POST" }).catch((error) => ({
    started: false,
    message: error.message,
  }));
  if (!result.started) {
    ocrEngineInstall.failed = result.message || "The install could not start.";
    ocrEnginePaintAll();
    return;
  }
  ocrEngineInstall.running = true;
  ocrEngineInstall.step = "Starting…";
  ocrEnginePaintAll();
  ocrEngineFollow();
}

//: Follow the install to its end, from `GET /extras` (the one source the
//: Packages panel reads too), then ask the engine again: the server's own
//: answer, never the installer's exit code, decides whether it worked.
async function ocrEngineFollow() {
  clearTimeout(ocrEngineTimer);
  const body = await apiJson("/extras", { silent: true }).catch(() => null);
  if (body && body.running && body.installing === "ocr") {
    ocrEngineInstall.step = body.step || "Installing…";
    ocrEnginePaintAll();
    ocrEngineTimer = setTimeout(ocrEngineFollow, 1200);
    return;
  }
  ocrEngineInstall.running = false;
  ocrEngineLatest = await apiJson("/ocr-readers", { silent: true }).catch(() => ocrEngineLatest);
  if (ocrEngineLatest?.engine?.ready) {
    ocrEngineInstall.failed = "";
    toast("Tesseract is ready.");
  } else {
    ocrEngineInstall.failed = (body?.step || ocrEngineLatest?.engine?.reason || "The install did not finish.").trim();
  }
  ocrEnginePaintAll();
  for (const host of ocrEngineHosts) host._ocrEngine?.onChange?.(ocrEngineLatest?.engine);
}
