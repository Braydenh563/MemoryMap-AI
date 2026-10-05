// settings-data.js: Settings' Privacy record and its Backups and Import
// panes. A lazy piece (app.js LAZY_MODULES), moved out of settings-panes.js on
// 2026-10-03 (INBOX 432) to keep the boot scripts under their gzip total:
// nothing here runs until one of those panes is opened or one of its buttons
// pressed. Their state and their button wiring stay at boot, and reach these
// through LAZY_ENTRY_POINTS.

function privacyWhen(iso) {
  if (!iso) return "";
  return typeof relativeTime === "function" ? relativeTime(iso) : new Date(iso).toLocaleString();
}

function privacyDestinationRow(row) {
  const li = document.createElement("li");
  li.className = "entry-item privacy-row";
  const head = document.createElement("div");
  head.className = "row align-center privacy-row-head";
  const where = document.createElement("span");
  where.className = "privacy-host";
  const address = row.port ? `${row.host}:${row.port}` : row.host;
  //: A connect names the address it reached; the name it was probably for
  //: (the lookup just before it) is what a person recognises, so it leads.
  where.textContent = row.name ? `${row.name} (${address})` : address;
  head.appendChild(where);
  const scope = document.createElement("span");
  scope.className = "chip";
  chipWords(scope, PRIVACY_SCOPE_WORDS[row.scope] || row.scope);
  head.appendChild(scope);
  li.appendChild(head);
  const meta = document.createElement("p");
  meta.className = "library-file-meta privacy-row-meta";
  const what = row.role && row.role !== "unattributed" ? row.role : "No feature named";
  const verb = row.kind === "lookup" ? "looked up" : "connected";
  const times = `${verb} ${row.count} time${row.count === 1 ? "" : "s"}`;
  meta.textContent = [what.charAt(0).toUpperCase() + what.slice(1), times, `last ${privacyWhen(row.last)}`]
    .filter(Boolean)
    .join(" · ");
  li.appendChild(meta);
  return li;
}

function renderPrivacyRange() {
  const receipt = privacyReceipt;
  if (!receipt) return;
  const ledger = privacyRange === "ledger";
  const verdictKey = ledger ? receipt.ledger?.verdict : receipt.verdict;
  const [icon, words, warn] = PRIVACY_VERDICTS[verdictKey] || PRIVACY_VERDICTS.stayed_on_this_computer;
  const verdict = $("privacy-verdict");
  verdict.classList.toggle("notice-warn", warn);
  setLabel(verdict, `${icon} ${words}`);
  //: `.linklike` (DESIGN.md's recipe for a word made clickable in prose):
  //: the status named a record with no way to it (INBOX 431). Jumps to the
  //: list rather than repeating its facts; `privacy-range-note` states
  //: those once already.
  const jump = document.createElement("button");
  jump.type = "button";
  jump.className = "linklike";
  jump.textContent = "See the full list";
  //: `openSettingsModal`'s own deep-link path (this section is already
  //: open, so it only scrolls and rings `flashRevealed`, the same cue
  //: every catalogue row lands with, INBOX 430).
  jump.addEventListener("click", () => openSettingsModal("privacy", "privacy-destinations"));
  verdict.append(" ", jump);
  for (const button of document.querySelectorAll("#privacy-range [data-range]")) {
    const on = button.dataset.range === privacyRange;
    button.setAttribute("aria-pressed", String(on));
    //: `.active` too: the `.seg` recipe draws its chosen segment from the
    //: class (03-dashboard-widgets.css), so with aria-pressed alone neither
    //: looked chosen (the owner, INBOX 430).
    button.classList.toggle("active", on);
  }
  const since = ledger ? receipt.ledger?.since : receipt.watching_since;
  const totals = (ledger ? receipt.ledger?.totals : receipt.totals) || {};
  const local = totals.this_computer || 0;
  $("privacy-range-note").textContent =
    `Since ${since ? new Date(since).toLocaleString() : "this launch"}. ` +
    `${local.toLocaleString()} connection${local === 1 ? "" : "s"} stayed on this computer ` +
    "(your model and the app's own window) and are counted, not listed.";
  const all = (ledger ? receipt.ledger?.destinations : receipt.destinations) || [];
  //: A name lookup followed by a connect to the address it returned is one
  //: visit, and the connect row already carries the name: the lookup is only
  //: listed on its own when nothing connected under that name (a lookup that
  //: led nowhere is still a question that left the machine).
  const named = new Set(all.filter((row) => row.kind !== "lookup" && row.name).map((row) => row.name));
  const rows = all.filter((row) => row.kind !== "lookup" || !named.has(row.host));
  const list = $("privacy-destinations");
  list.replaceChildren(...rows.map(privacyDestinationRow));
  $("privacy-empty").classList.toggle("hidden", rows.length > 0);
}

async function renderPrivacyReceipt() {
  const list = $("privacy-destinations");
  let receipt;
  try {
    receipt = await apiJson("/privacy/receipt", { silent: true });
  } catch {
    surfaceFailed($("privacy-empty"), "the privacy record", () => renderPrivacyReceipt());
    $("privacy-empty").classList.remove("hidden");
    list.replaceChildren();
    return;
  }
  if (typeof surfaceRecovered === "function") surfaceRecovered($("privacy-empty"));
  privacyReceipt = receipt;
  if (receipt.covers) $("privacy-covers").textContent = receipt.covers;
  renderPrivacyRange();

  const model = receipt.model_server || {};
  $("privacy-model").textContent = model.note || "";
  $("privacy-model-meta").textContent = [
    model.url,
    PRIVACY_SCOPE_WORDS[model.scope] || "",
    model.local_only_ai ? "Kept to this computer and your network" : "Hosted models allowed",
  ].filter(Boolean).join(" · ");

  const listening = receipt.listening || {};
  $("privacy-listening").textContent = listening.other_devices
    ? `Other devices on your network can open it, with the password: ${(listening.addresses || []).join(", ") || listening.host}.`
    : "Only this computer. Nothing on your network can reach it.";

  const switches = $("privacy-switches");
  switches.replaceChildren();
  for (const item of receipt.switches || []) {
    //: The Account facts shape: a label column and a value column.
    const li = document.createElement("li");
    const name = document.createElement("span");
    name.className = "account-fact-label";
    name.textContent = item.label;
    const value = document.createElement("span");
    value.textContent = `${item.on ? "On" : "Off"}. ${item.reaches}`;
    li.append(name, value);
    switches.appendChild(li);
  }
}

async function renderBackups() {
  const list = $("backup-list");
  const backups = await apiJson("/backups").catch(() => []);
  list.replaceChildren();
  for (const item of backups) {
    const li = document.createElement("li");
    const row = document.createElement("div");
    row.className = "entry-meta";
    const name = document.createElement("span");
    setLabel(name, item.name);
    const size = document.createElement("span");
    size.className = "muted";
    size.textContent = `${(item.size / 1024).toFixed(0)} KB`;
    const actions = document.createElement("span");
    actions.className = "entry-actions";
    actions.appendChild(
      smallButton("Restore", "Roll the notebook back to this backup", async () => {
        if (
          !(await confirmDialog(
            "Restore this backup? Your current notebook is snapshotted first, " +
              "then replaced by the backup."
          ))
        )
          return;
        try {
          await apiJson("/backups/restore", {
            method: "POST",
            body: JSON.stringify({ name: item.name }),
          });
          toast("Backup restored.");
          loadEntries().catch(() => {});
          renderBackups();
        } catch (error) {
          toast(error.message, true);
        }
      })
    );
    actions.appendChild(
      smallButton("ph:trash", "Delete this backup", async () => {
        if (!(await confirmDialog("Delete this backup file?"))) return;
        try {
          await apiJson(`/backups/${item.name}`, { method: "DELETE" });
        } catch (error) {
          toast(error.message || "Couldn't delete that backup.", true);
        }
        renderBackups();
      })
    );
    row.append(name, size, actions);
    li.appendChild(row);
    list.appendChild(li);
  }
}

// The retention setting itself, separate fetch from renderBackups() (which
// only ever hits GET /backups) because the count/bounds live on GET
// /storage, so this app's own tests that treat GET /backups as a plain list
// of backups don't have to change shape for a control that isn't about any
// one backup.
//: "4.2 MB", for a line a person reads rather than a byte count. The server
//: has the same function (`core/diskspace.human_bytes`), because the notice
//: below is drawn from raw bytes and the toast is built server-side.
function humanBytes(count) {
  if (typeof count !== "number" || !isFinite(count)) return "";
  let size = count;
  for (const unit of ["bytes", "KB", "MB", "GB"]) {
    if (size < 1024 || unit === "GB") {
      return unit === "bytes" ? `${Math.round(size)} bytes` : `${size.toFixed(1)} ${unit}`;
    }
    size /= 1024;
  }
  return "";
}

//: **Say it before a save is the thing that says it** (INBOX 266, item 6).
//: Measured on a data dir filled to 100%: `data_dir_writable` stayed `true`
//: throughout, so the one signal this panel had was a reassurance the app
//: could not keep. The threshold is the server's (`low_space_bytes`), so
//: there is one answer to "is this getting tight" rather than one per
//: screen, and the line names the folder and what is worth deleting rather
//: than only the number.
function renderStorageSpaceNotice(storage) {
  const line = $("storage-space-notice");
  if (!line) return;
  const free = storage && typeof storage.free_bytes === "number" ? storage.free_bytes : null;
  const limit = (storage && storage.low_space_bytes) || 0;
  if (free === null || !limit || free >= limit) {
    line.classList.add("hidden");
    line.replaceChildren();
    return;
  }
  line.classList.remove("hidden");
  setLabel(
    line,
    `ph:warning Only ${humanBytes(free)} left where your notebook is kept ` +
      `(${storage.data_dir}). Deleting old backups below, or exports in ` +
      "Import and export, is usually the quickest space to find."
  );
}

async function renderBackupRetention() {
  const input = $("backup-retention");
  if (!input) return;
  const storage = await apiJson("/storage", { silent: true }).catch(() => null);
  if (!storage) return;
  renderStorageSpaceNotice(storage);
  input.min = storage.backup_retention_min;
  input.max = storage.backup_retention_max;
  input.value = storage.backup_retention_count;
  input.title = `Between ${storage.backup_retention_min} and ${storage.backup_retention_max}`;
}

async function backupNow() {
  const status = $("backup-status");
  try {
    const made = await apiJson("/backups", { method: "POST" });
    status.textContent = `Saved ${made.name}.`;
    renderBackups();
  } catch (error) {
    status.textContent = error.message;
  }
}

async function importDirectory() {
  const pathInput = $("import-dir-path").value.trim();
  const status = $("import-dir-status");
  if (!pathInput) {
    status.textContent = "Please enter a directory path.";
    return;
  }
  setLabel(status, "ph:spin Starting import…");
  try {
    const response = await apiJson("/import/directory", {
      method: "POST",
      body: { path: pathInput },
    });
    status.textContent = "Import started in the background. Check your library soon.";
    $("import-dir-path").value = "";
  } catch (error) {
    status.textContent = error.message;
  }
}

//: The way back from a one-step import (INBOX 464 (18)): choosing the files
//: starts it, so the toast offers Undo, which moves exactly the notes it made
//: (the ids both endpoints return) to the recycle bin, restorable from there.
function undoImport(result, status) {
  const ids = result.ids || [];
  if (!ids.length) return;
  const n = ids.length;
  toastAction(`Imported ${n} note${n === 1 ? "" : "s"}.`, "Undo", async () => {
    let binned = 0;
    for (let at = 0; at < ids.length; at += 8) {
      const settled = await Promise.allSettled(
        ids.slice(at, at + 8).map((id) => apiJson(`/entries/${id}`, { method: "DELETE", silent: true })),
      );
      binned += settled.filter((s) => s.status === "fulfilled").length;
    }
    status.textContent = `Undone: ${binned} imported note${binned === 1 ? "" : "s"} moved to the recycle bin.`;
    loadEntries().catch(() => {});
  });
}

async function importMarkdown(inputId = "import-md-files") {
  const input = $(inputId);
  const status = $("import-md-status");
  if (!input.files.length) {
    status.textContent =
      inputId === "import-md-folder"
        ? "Choose a folder first."
        : "Choose one or more .md files first.";
    return;
  }
  const form = new FormData();
  //: The third argument is the filename the server sees, and `webkitRelativePath`
  //: is the only place a folder picker puts the path, `file.name` is the bare
  //: name even when the file came from three folders down. Sending the path is
  //: what lets an imported vault keep its tree (`Entry.source_path`) and its
  //: `[[wiki links]]`, which name the file rather than its opening words.
  //: A vault folder holds far more than markdown (`.obsidian/`, images,
  //: PDFs), and the picker hands over every one of them, filtering here
  //: keeps the request from being mostly files the endpoint would reject one
  //: at a time and report as "skipped".
  const chosen = [...input.files].filter((file) =>
    /\.(md|markdown|txt)$/i.test(file.webkitRelativePath || file.name),
  );
  if (!chosen.length) {
    status.textContent = "No markdown files in that folder.";
    return;
  }
  for (const file of chosen) {
    form.append("files", file, file.webkitRelativePath || file.name);
  }
  input.value = "";
  setLabel(status, `ph:spin Importing ${chosen.length} file${chosen.length === 1 ? "" : "s"}…`);
  try {
    const response = await fetch("/import/markdown", {
      method: "POST",
      // The multipart type still comes from the browser; X-Workspace-ID does
      // not, and without it an import while a non-default space is active
      // would silently land the new notes in the default space instead.
      headers: { "X-Auth-Token": authToken(), "X-Workspace-ID": activeSpaceId() },
      body: form,
    });
    if (!response.ok) throw new Error("The import did not work. Check the file and try again.");
    const result = await response.json();
    status.textContent =
      `Imported ${result.imported} note${result.imported === 1 ? "" : "s"}.` +
      (result.skipped.length ? ` Skipped: ${result.skipped.join("; ")}` : "");
    undoImport(result, status);
    loadEntries().catch(() => {});
  } catch (error) {
    status.textContent = error.message;
  }
}

// §37G: a document (PDF/Word/slide deck) becomes one or more notes, via the
// markitdown extra: the same "Import" pattern as importMarkdown above, one
// file at a time rather than several, since a document commonly becomes
// several notes on its own (one per chapter or slide).
async function importDocument() {
  const input = $("import-document-file");
  const status = $("import-document-status");
  const file = input.files[0];
  if (!file) {
    status.textContent = "Choose a file first.";
    return;
  }
  const form = new FormData();
  form.append("file", file);
  input.value = "";
  setLabel(status, `ph:spin Importing ${file.name}…`);
  try {
    const response = await fetch("/import/document", {
      method: "POST",
      // Same gap as /import/markdown above: without this, the imported
      // document lands in the default space regardless of which is active.
      headers: { "X-Auth-Token": authToken(), "X-Workspace-ID": activeSpaceId() },
      body: form,
    });
    if (!response.ok) {
      const detail = await response.json().catch(() => ({}));
      throw new Error(plainHttpError(response.status, detail.detail, "The import did not work. Check the file and try again."));
    }
    const result = await response.json();
    status.textContent =
      `Imported ${result.imported} note${result.imported === 1 ? "" : "s"}` +
      ` from ${result.filename}.` +
      (result.truncated ? " (Stopped at the note limit, the rest wasn't imported.)" : "");
    undoImport(result, status);
    loadEntries().catch(() => {});
  } catch (error) {
    status.textContent = error.message;
  }
}
