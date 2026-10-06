// Settings, Packages: the optional extras, their bundles, and acting on
// several at once (INBOX 595). Loaded when the section opens (settings.js
// calls `renderExtras`, a stand-in in app.js's LAZY_ENTRY_POINTS until this
// file arrives), so none of it is in the boot scripts.
//
// Each extra is a feature the app already offers and cannot run: the
// microphone buttons need faster-whisper, the desktop window needs pywebview,
// search by meaning needs sentence-transformers. The catalogue is the
// **server's**, and every install is chosen by id from an allowlist there:
// the client never sends a package name. See `core/extras.py` for why that
// is the whole security property; a bundle is a list of those same ids,
// resolved on the server.
//
// The owner, 2026-10-05: "should we bundle multiple packages together for
// bulk download ... with the ability to install/uninstall/reinstall
// individual ones or in bulk??" So, from the top: Bundles (one row each,
// Install for what is missing, the rest behind its ⋯), then every package as
// a row with a tick (the selection bar acts on what is ticked: the recipe
// index's "bar of actions for the things you have selected") and its own ⋯
// (Reinstall, Remove; DESIGN.md's `kebabMenu`).

//: This screen's state, one object (tests/test_global_scope_ratchet.py).
//: `selected` survives the poll's redraw, which is the point of keeping it
//: here rather than reading the ticks back off the rows; `bulkSeen` is set
//: once a bulk action has been started or seen running from this screen, so
//: the last one's outcomes are shown to the person who asked for them and
//: not, stale, to someone opening Settings a day later.
const packagesUi = { poll: null, selected: new Set(), bulkSeen: false, body: null };

async function renderExtras() {
  const list = $("extras-list");
  if (!list) return;
  //: Skeleton rows until the catalogue answers (INBOX 596, the owner: "some
  //: skeleton loaders are missing"): only into an empty list, so the poll
  //: that redraws it while a package installs never covers its rows.
  const embedList = $("embed-models-list");
  showSkeletons(list, 3, "li");
  showSkeletons(embedList, 2, "li");
  const body = await apiJson("/extras", { silent: true }).catch(() => null);
  clearSkeletons(list);
  if (!body) {
    clearSkeletons(embedList);
    return;
  }
  packagesUi.body = body;
  const bulk = body.bulk || { items: [], running: false };
  if (bulk.running) packagesUi.bulkSeen = true;
  //: A tick on a package that is no longer in the catalogue cannot be acted on.
  const known = new Set(body.extras.map((extra) => extra.id));
  for (const id of [...packagesUi.selected]) if (!known.has(id)) packagesUi.selected.delete(id);

  //: The poll redraws every row; the focus goes back to the control that had
  //: it (a tick, a bundle's Install), so a keyboard user is not thrown to
  //: the top of the page every second and a half.
  const focusKey = document.activeElement?.dataset?.packagesFocus || "";

  packagesRenderBundles(body);
  list.replaceChildren(...body.extras.map((extra) => packagesRow(extra, body)));
  packagesSyncBar();

  if (focusKey) document.querySelector(`[data-packages-focus="${CSS.escape(focusKey)}"]`)?.focus();

  $("extras-status").textContent = packagesStatusLine(body);
  const logWrap = $("extras-log-wrap");
  logWrap.classList.toggle("hidden", !body.log.length);
  $("extras-log").textContent = body.log.join("\n");

  // Poll only while something is running, and only while the panel is open.
  clearTimeout(packagesUi.poll);
  if (body.running && settingsModalOpen() && currentSettingsSection === "extras") {
    packagesUi.poll = setTimeout(renderExtras, 1500);
  }
  renderEmbedModels();

  // The model-size choice only means anything once faster-whisper is
  // actually there to load one.
  const voiceExtra = body.extras.find((e) => e.id === "voice");
  const wrap = $("voice-model-wrap");
  if (wrap) {
    wrap.classList.toggle("hidden", !voiceExtra?.installed);
    if (voiceExtra?.installed) {
      if (!prefsCache) prefsCache = await apiJson("/preferences").catch(() => null);
      $("voice-model-select").value = prefsCache?.voice_model || "base";
    }
  }
}

//: The line under the list: a bulk action's place in its list and the
//: package in hand, or how it ended; otherwise the single install's step.
function packagesStatusLine(body) {
  const bulk = body.bulk || {};
  if (bulk.running) {
    const now = (bulk.items || []).find((item) => item.outcome === "running");
    const place = `${Math.min(bulk.done + 1, bulk.total)} of ${bulk.total}`;
    return now ? `${place}: ${now.label}. ${body.step || ""}`.trim() : `${place}.`;
  }
  if (packagesUi.bulkSeen && bulk.message) return bulk.message;
  if (body.running) return body.step;
  if (body.outcome === "completed") return `${body.step}`;
  if (body.outcome === "failed") return `Install failed. ${body.step}`;
  return "";
}

//: What a package can have done to it now, for the bar and the bundles.
function packagesCan(extra, action) {
  if (extra.installing || extra.queued) return false;
  if (action === "install") return !extra.installed && !extra.unavailable;
  if (action === "reinstall") return extra.installed && !extra.unavailable;
  return extra.installed;
}

// --- bundles -----------------------------------------------------------------

function packagesRenderBundles(body) {
  const host = $("extras-bundles");
  if (!host) return;
  const byId = new Map(body.extras.map((extra) => [extra.id, extra]));
  host.replaceChildren(
    ...(body.bundles || []).map((bundle) => {
      const members = bundle.extras.map((id) => byId.get(id)).filter(Boolean);
      const installed = members.filter((extra) => extra.installed).length;
      const missing = members.filter((extra) => packagesCan(extra, "install"));
      const li = document.createElement("li");
      li.className = "extras-row extras-bundle";
      li.id = `extras-bundle-${bundle.id}`;

      const head = document.createElement("div");
      head.className = "entry-meta";
      const title = document.createElement("span");
      title.className = "entry-title";
      const name = document.createElement("strong");
      name.textContent = bundle.label;
      title.append(
        name,
        chip(
          `${installed === members.length ? "ph:check-circle " : ""}${installed} of ${members.length} installed`,
          installed === members.length ? "item-label is-ok" : "item-label"
        )
      );
      head.appendChild(title);

      const actions = document.createElement("span");
      actions.className = "entry-actions";
      if (missing.length && !body.running) {
        const install = smallButton(
          "ph:download-simple Install",
          `Install the ${missing.length === 1 ? "missing package" : `${missing.length} missing packages`} of ${bundle.label}`,
          () => packagesBulk("install", missing)
        );
        install.dataset.packagesFocus = `bundle-install-${bundle.id}`;
        actions.appendChild(install);
      }
      const reinstallable = members.filter((extra) => packagesCan(extra, "reinstall"));
      const removable = members.filter((extra) => packagesCan(extra, "uninstall"));
      const busy = "Wait for the install in hand to finish.";
      actions.appendChild(
        kebabMenu(
          [
            {
              label: "ph:check-square Select its packages",
              //: And takes you to them (INBOX 695, the owner: "it didn
              //: navigate scroll me to them"): the bundle's first package
              //: row, centred, its tick focused, and a line saying how many.
              run: async () => {
                const picked = members.filter((extra) => !extra.unavailable || extra.installed);
                for (const extra of picked) packagesUi.selected.add(extra.id);
                await renderExtras();
                const row = picked.length ? document.getElementById(`extra-row-${picked[0].id}`) : null;
                row?.scrollIntoView({ block: "center", behavior: reducedMotionWanted() ? "auto" : "smooth" });
                row?.querySelector(".extras-pick")?.focus({ preventScroll: true });
                toast(`Selected ${picked.length} package${picked.length === 1 ? "" : "s"}.`, "info");
              },
            },
            {
              label: "ph:arrow-clockwise Reinstall all",
              disabled: body.running || !reinstallable.length,
              title: body.running ? busy : reinstallable.length ? "" : "Nothing here is installed yet.",
              run: () =>
                body.running || !reinstallable.length
                  ? toast(body.running ? busy : "Nothing here is installed yet.", "info")
                  : packagesBulk("reinstall", reinstallable),
            },
            {
              label: "ph:trash Remove all",
              danger: true,
              disabled: body.running || !removable.length,
              title: body.running ? busy : removable.length ? "" : "Nothing here is installed yet.",
              run: () =>
                body.running || !removable.length
                  ? toast(body.running ? busy : "Nothing here is installed yet.", "info")
                  : packagesBulk("uninstall", removable),
            },
          ],
          `More for the ${bundle.label} bundle`
        )
      );
      head.appendChild(actions);
      li.appendChild(head);

      const about = document.createElement("p");
      about.className = "muted extras-enables";
      about.textContent = bundle.about;
      const meta = document.createElement("p");
      meta.className = "muted extras-meta";
      meta.textContent = members.map((extra) => String(extra.packages[0] || extra.id).split(/[[\s]/)[0]).join(", ");
      li.append(about, meta);

      //: Where each of its packages is in the bulk action in hand (INBOX 696,
      //: the owner: "it just stayed as the 2/3 packages I had installed until
      //: it just suddenly updated, there was no progress indicator"): a bar
      //: over the packages, then one line each, waiting, installing, done.
      const bulk = body.bulk || {};
      const mine = (bulk.items || []).filter((item) => bundle.extras.includes(item.id));
      if (mine.length && (bulk.running || packagesUi.bulkSeen)) {
        if (bulk.running) {
          const bar = document.createElement("progress");
          bar.className = "task-progress";
          bar.max = mine.length;
          bar.value = mine.filter((item) => item.outcome !== "queued" && item.outcome !== "running").length;
          bar.setAttribute("aria-label", `${bundle.label}: ${bar.value} of ${mine.length} done`);
          li.appendChild(bar);
        }
        li.appendChild(taskSteps(mine));
      }
      return li;
    })
  );
}

// --- one row per package -----------------------------------------------------

function packagesRow(extra, body) {
  const li = document.createElement("li");
  li.className = "extras-row";
  //: So a feature that needs this extra can open Settings at its row (Run
  //: on a .py document opens `extra-row-pyodide`).
  li.id = `extra-row-${extra.id}`;

  const head = document.createElement("div");
  head.className = "entry-meta";
  // The name and its state chip are one flex item, the actions the other
  // (INBOX 107c): the title is the column that shrinks and wraps, so the
  // actions stay on the name's line at every width above the phone.
  const title = document.createElement("span");
  title.className = "entry-title";
  //: The tick sits in the title column, before the name, so it never adds a
  //: column the row's layout would have to fit; the two are one group
  //: (`.extras-name`) so the name wraps beside its tick rather than under it
  //: (measured at 390 without it: the tick alone on a line, the name below).
  const pick = document.createElement("input");
  pick.type = "checkbox";
  pick.className = "extras-pick select-check";
  pick.checked = packagesUi.selected.has(extra.id);
  pick.disabled = Boolean(extra.installing || extra.queued || (extra.unavailable && !extra.installed));
  pick.setAttribute("aria-label", `Select ${extra.label}`);
  pick.dataset.packagesFocus = `pick-${extra.id}`;
  pick.addEventListener("change", () => {
    if (pick.checked) packagesUi.selected.add(extra.id);
    else packagesUi.selected.delete(extra.id);
    packagesSyncBar();
  });
  const name = document.createElement("strong");
  name.textContent = extra.label;
  const named = document.createElement("span");
  named.className = "extras-name";
  named.append(pick, name);
  title.append(named);
  head.appendChild(title);

  const actions = document.createElement("span");
  actions.className = "entry-actions";
  if (extra.installing) {
    const busy = document.createElement("div");
    busy.className = "muted extras-install-progress";
    const text = document.createElement("span");
    text.className = "extras-install-progress-text";
    text.textContent = extra.step || "Installing…";
    const bar = document.createElement("progress");
    bar.className = "task-progress extras-install-progress-bar";
    busy.append(text, bar);
    actions.appendChild(busy);
  } else if (extra.queued) {
    //: Waiting its turn in a bulk action: said beside the name, with no
    //: button, since one would only be refused.
    title.appendChild(chip("ph:hourglass-medium Waiting", "item-label"));
  } else if (extra.installed) {
    // A chip beside the name says the state; "Installed" means it works (the
    // OCR row counts the Tesseract program too, core/extras.py).
    title.appendChild(chip("ph:check-circle Installed", "item-label is-ok"));
    actions.appendChild(packagesRowMenu(extra, body));
  } else if (extra.unavailable) {
    // Greyed out rather than hidden: the row says what the app *will* be able
    // to do. The reason is the button's tooltip and is spelled out under it.
    const blocked = smallButton("ph:download-simple Install", extra.unavailable, () => {});
    blocked.disabled = true;
    actions.appendChild(blocked);
    title.appendChild(chip("ph:hourglass Not ready yet", "item-label extras-soon"));
  } else {
    const install = smallButton("ph:download-simple Install", `Install ${extra.label}`, () => packagesInstallOne(extra));
    install.disabled = Boolean(body.running);
    if (body.running) install.title = "Wait for the install in hand to finish.";
    actions.appendChild(install);
  }
  head.appendChild(actions);
  li.appendChild(head);

  const enables = document.createElement("p");
  enables.className = "muted extras-enables";
  enables.textContent = extra.enables;
  li.appendChild(enables);

  //: Installed, the row says what is there: its version and the size of its
  //: own files (never its dependencies', core/extras.footprint). Before,
  //: what it will cost to fetch.
  const meta = document.createElement("p");
  meta.className = "muted extras-meta";
  const facts = extra.installed
    ? [extra.packages.join(", "), extra.version ? `version ${extra.version}` : "", extra.disk_bytes ? `${formatFileSize(extra.disk_bytes)} on disk` : ""]
    : [extra.packages.join(", "), extra.size];
  meta.textContent = [...facts, extra.licence].filter(Boolean).join(" · ");
  li.appendChild(meta);

  //: How it ended in the bulk action this screen started: a failure or a
  //: skip in its own words, under the row it is about.
  const item = packagesUi.bulkSeen && !body.bulk?.running ? (body.bulk?.items || []).find((row) => row.id === extra.id) : null;
  if (item && item.message && item.outcome !== "completed") {
    const outcome = document.createElement("p");
    outcome.className = `muted extras-caveat extras-outcome is-${item.outcome}`;
    const icon = { failed: "ph:warning", skipped: "ph:minus-circle", cancelled: "ph:stop-circle" }[item.outcome] || "ph:info";
    setLabel(outcome, `${icon} ${item.message}`);
    li.appendChild(outcome);
  }

  //: The language choice (ocr-engine.js); the buttons stay this row's own.
  if (extra.id === "ocr" && extra.installed) ocrEngineMount(li.appendChild(document.createElement("div")), { settings: true });

  // Said before the button is pressed, not after.
  if (extra.caveat) {
    const caveat = document.createElement("p");
    caveat.className = "muted extras-caveat";
    setLabel(caveat, `ph:warning ${extra.caveat}`);
    li.appendChild(caveat);
  }
  // The reason the button is grey, in full: also enforced by core/extras.py.
  if (extra.unavailable) {
    const why = document.createElement("p");
    why.className = "muted extras-caveat";
    setLabel(why, `ph:traffic-cone ${extra.unavailable}`);
    li.appendChild(why);
  }
  return li;
}

//: An installed row's ⋯: Reinstall, then Remove. Reinstall is the way out of
//: the state detection cannot see (`find_spec` answers "is it there", not
//: "is it sound": a half-finished download or a wheel for the wrong platform
//: imports and does not work); it is the rarer need, so it is in the menu
//: rather than a button. A library nothing calls has nothing to fix, so its
//: Reinstall says why rather than running.
function packagesRowMenu(extra, body) {
  const busy = "Wait for the install in hand to finish.";
  return kebabMenu(
    [
      {
        label: "ph:arrow-clockwise Reinstall",
        disabled: Boolean(body.running || extra.unavailable),
        title: body.running ? busy : extra.unavailable || "",
        run: () => (body.running || extra.unavailable ? toast(body.running ? busy : extra.unavailable, "info") : packagesReinstallOne(extra)),
      },
      {
        label: "ph:trash Remove",
        danger: true,
        disabled: Boolean(body.running),
        title: body.running ? busy : "",
        run: () => (body.running ? toast(busy, "info") : packagesRemoveOne(extra)),
      },
    ],
    `More for ${extra.label}`
  );
}

async function packagesInstallOne(extra) {
  //: A download extra (Pyodide, needle) is pinned files checked against a
  //: written-down hash, and needs no restart; a pip extra comes from PyPI and
  //: does. Both say where it comes from.
  const ok = await confirmDialog(
    extra.kind === "download"
      ? `Install ${extra.label}?\n\n${extra.size}, downloaded once from ` +
          `${extra.source} and checked against its pinned checksum. ` +
          "After that it works offline, with no restart."
      : `Install ${extra.label}?\n\n${extra.size}. It is downloaded from ` +
          "PyPI to this machine, and MemoryMap needs a restart afterwards " +
          "before the feature works."
  );
  if (!ok) return;
  packagesPost(`/extras/${extra.id}/install`);
}

async function packagesReinstallOne(extra) {
  const ok = await confirmDialog(
    `Reinstall ${extra.label}?\n\nUse this if the feature is switched ` +
      "on but not working, it downloads the package again from " +
      "scratch rather than trusting what is already there."
  );
  if (!ok) return;
  packagesPost(`/extras/${extra.id}/install?reinstall=true`);
}

async function packagesRemoveOne(extra) {
  const ok = await confirmDialog(
    `Remove ${extra.label}?\n\nThe feature it turns on stops working. ` +
      "Only the package itself is removed, anything it pulled in is " +
      "left alone, since something else may be using it."
  );
  if (!ok) return;
  packagesPost(`/extras/${extra.id}/uninstall`);
}

async function packagesPost(path, body) {
  const options = { method: "POST" };
  if (body) options.body = JSON.stringify(body);
  const result = await apiJson(path, options).catch((e) => ({ started: false, message: e.message }));
  toast(result.message, !result.started);
  renderExtras();
  return result;
}

// --- several at once ---------------------------------------------------------

//: One confirm for the lot, naming each package and what it costs, then one
//: request: the server walks them in this order as one background job, each
//: with its own outcome, and one failing never stops the rest.
async function packagesBulk(action, extras) {
  if (!extras.length) return;
  const count = extras.length === 1 ? "1 package" : `${extras.length} packages`;
  const names = extras.map((extra) => (action === "install" ? `${extra.label}, ${extra.size}` : extra.label)).join("\n");
  const restart = extras.some((extra) => extra.kind === "pip")
    ? " A package from PyPI needs a restart of MemoryMap before its feature works."
    : "";
  const message = {
    install: `Install ${count}?\n\n${names}\n\nEach is downloaded to this machine, one after another; one that fails does not stop the rest.${restart}`,
    reinstall: `Reinstall ${count}?\n\n${names}\n\nEach is downloaded again from scratch rather than trusting what is already there, one after another.${restart}`,
    uninstall: `Remove ${count}?\n\n${names}\n\nThe features they turn on stop working. Only the packages themselves are removed; anything they pulled in is left alone, since something else may be using it.`,
  }[action];
  const ok = await confirmDialog(message, { confirmLabel: { install: "Install", reinstall: "Reinstall", uninstall: "Remove" }[action] });
  if (!ok) return;
  packagesUi.bulkSeen = true;
  const result = await packagesPost("/extras/bulk", { action, ids: extras.map((extra) => extra.id) });
  if (result.started) {
    packagesUi.selected.clear();
    packagesSyncBar();
  }
}

//: The selection bar: the count first, then only the actions that apply to
//: what is ticked (Reset-style hiding, as the Learned list's bar does: a
//: button that would do nothing is not offered).
function packagesSyncBar() {
  const bar = $("extras-selectbar");
  if (!bar) return;
  const body = packagesUi.body;
  const picked = (body?.extras || []).filter((extra) => packagesUi.selected.has(extra.id));
  bar.classList.toggle("hidden", picked.length === 0);
  $("extras-selected-count").textContent = `${picked.length} selected`;
  const running = Boolean(body?.running);
  for (const [id, action] of [
    ["extras-bulk-install", "install"],
    ["extras-bulk-reinstall", "reinstall"],
    ["extras-bulk-remove", "uninstall"],
  ]) {
    const button = $(id);
    const can = picked.filter((extra) => packagesCan(extra, action));
    button.classList.toggle("hidden", can.length === 0);
    button.disabled = running;
    button.title = running ? "Wait for the install in hand to finish." : "";
  }
}

function packagesBulkFromBar(action) {
  const picked = (packagesUi.body?.extras || []).filter((extra) => packagesUi.selected.has(extra.id) && packagesCan(extra, action));
  packagesBulk(action, picked);
}

$("extras-bulk-install").addEventListener("click", () => packagesBulkFromBar("install"));
$("extras-bulk-reinstall").addEventListener("click", () => packagesBulkFromBar("reinstall"));
$("extras-bulk-remove").addEventListener("click", () => packagesBulkFromBar("uninstall"));
$("extras-bulk-done").addEventListener("click", () => {
  packagesUi.selected.clear();
  renderExtras();
});

// Moved from status.js (boot gzip): Settings, Packages is its only caller.
// --- embedding models, on the same screen as the packages ------------------------
//
// Reuses `.extras-row` deliberately. These are two lists of "things downloaded
// to this machine, with a way to undo it", and giving the second one its own
// row style would make them look like different kinds of thing when the whole
// argument for putting them together is that they are not.
let embedPollTimer = null;

async function renderEmbedModels() {
  const list = $("embed-models-list");
  if (!list) return;
  showSkeletons(list, 2, "li");
  const body = await apiJson("/embedding-models", { silent: true }).catch(() => null);
  clearSkeletons(list);
  if (!body) return;

  list.replaceChildren();
  for (const model of body.models) {
    const li = document.createElement("li");
    li.className = "extras-row";

    const head = document.createElement("div");
    head.className = "entry-meta";
    //: **The name and this row's status are one column; the buttons are the
    //: other.** The same shape the packages list above already uses, and for
    //: the reason recorded there (INBOX 107c): `.extras-row .entry-meta` is
    //: `flex-wrap: nowrap` so the buttons never drop below the title, which
    //: means whatever cannot shrink pushes the row off its own edge instead.
    //:
    //: This list was built the other way, with "✓ 1015 KB on disk" inside
    //: `.entry-actions`, which is `flex: 0 0 auto`. Measured at 820px: the
    //: chip 164px plus Re-download 122px plus Remove 91px made a 390px block
    //: that would not shrink, against 458px of row holding an 80px name, so
    //: Settings, Extras scrolled sideways (496 against 492). The status is
    //: not an action; moving it into `.entry-title`, which is the shrinking
    //: column and wraps inside itself, leaves the buttons 219px and lets the
    //: name and the chip take the rest.
    const title = document.createElement("div");
    title.className = "entry-title";
    const name = document.createElement("strong");
    name.textContent = model.label + (model.default ? " · default" : "");
    title.appendChild(name);
    head.appendChild(title);

    const actions = document.createElement("span");
    actions.className = "entry-actions";
    if (model.downloading) {
      const busy = document.createElement("span");
      busy.className = "muted";
      setLabel(busy, "ph:spin Downloading…");
      title.appendChild(busy);
    } else if (model.installed) {
      const done = document.createElement("span");
      done.className = "chip item-label is-ok";
      setLabel(done, `ph:check ${model.on_disk} on disk`);
      title.appendChild(done);
      // The same argument the packages' Reinstall makes: "the directory is
      // there" is not "the model is sound". A download interrupted halfway
      // leaves a snapshot that loads and produces nonsense, and fetching over
      // the top of it resumes the same broken files, so this removes first.
      if (body.can_download) {
        actions.appendChild(
          smallButton("ph:arrow-clockwise Re-download", `Fetch ${model.label} again from scratch`, async () => {
            if (!(await confirmDialog(
              `Download ${model.label} again?\n\nThe copy on this machine is ` +
                "deleted first, so this is the fix for one that arrived broken."
            ))) return;
            const result = await apiJson(
              `/embedding-models/${model.id}/download?reinstall=true`,
              { method: "POST" }
            ).catch((e) => ({ started: false, message: e.message }));
            toast(result.message, !result.started);
            renderEmbedModels();
          })
        );
      }
      actions.appendChild(
        smallButton("ph:trash Remove", `Delete ${model.label} from this machine`, async () => {
          if (!(await confirmDialog(
            `Remove ${model.label}?\n\nIt frees ${model.on_disk}. Nothing is ` +
              "lost that a download cannot bring back, but if this is the " +
              "model in use, searching falls back to keywords until it returns."
          ))) return;
          const result = await apiJson(`/embedding-models/${model.id}`, {
            method: "DELETE",
          }).catch((e) => ({ removed: false, message: e.message }));
          toast(result.message, !result.removed);
          renderEmbedModels();
        })
      );
    } else {
      const get = smallButton("ph:download-simple Download", `Fetch ${model.label}`, async () => {
        if (!(await confirmDialog(
          `Download ${model.label}?\n\n${model.size}, fetched from HuggingFace ` +
            "to this machine. It is the one thing on this screen that needs " +
            "the internet."
        ))) return;
        const result = await apiJson(`/embedding-models/${model.id}/download`, {
          method: "POST",
        }).catch((e) => ({ started: false, message: e.message }));
        toast(result.message, !result.started);
        renderEmbedModels();
      });
      // Without huggingface_hub there is nothing to download *with*, so the
      // button says so rather than failing on an ImportError nobody can read.
      //: Not offered in one press (INBOX 700): its licence or its loading
      //: rules; the reason is the tooltip and Settings, Models links its terms.
      if (!model.one_press) {
        get.disabled = true;
        get.title = model.why_not;
      } else if (!body.can_download) {
        get.disabled = true;
        get.title =
          "Needs the huggingface_hub library, it arrives with “Search by " +
          "meaning” in the list above.";
      }
      actions.appendChild(get);
    }
    head.appendChild(actions);
    li.appendChild(head);

    const about = document.createElement("p");
    about.className = "muted extras-enables";
    about.textContent = model.about;
    li.appendChild(about);

    const meta = document.createElement("p");
    meta.className = "muted extras-meta";
    meta.textContent = `${model.repo} · ${model.size}`;
    li.appendChild(meta);
    list.appendChild(li);
  }

  // Where they are, in as many words. "Somewhere in your home directory" is
  // the answer people are given everywhere else and it is the reason this
  // screen had to exist.
  $("embed-models-cache").textContent = `Kept in ${body.cache}`;
  $("embed-models-status").textContent = body.running
    ? body.step
    : body.outcome
      ? body.step
      : "";

  clearTimeout(embedPollTimer);
  if (body.running && settingsModalOpen() && currentSettingsSection === "extras") {
    embedPollTimer = setTimeout(renderEmbedModels, 1500);
  }
}
