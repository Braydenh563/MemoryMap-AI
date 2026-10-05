// Import from another app: Notion, Obsidian, Evernote and Apple Notes
// (WORLD_CLASS_PLAN H6 and 5.7, row 25). Settings, Import & export.
// Loaded when that section opens (settings.js). The readers are
// entry/app_import.py behind `POST /import/app?source=`.
//
// One step, the recipe every import here follows (DESIGN.md, "Choosing files
// to bring in"): each button opens its picker, choosing starts the import,
// and the toast's Undo bins exactly the notes it made (`undoImport`,
// settings-data.js). Importing the same export again makes nothing new: each
// note remembers where it came from, and the status line says how many were
// already here.

const APP_IMPORTS = [
  { source: "notion", button: "import-notion", input: "import-notion-file", label: "Notion" },
  { source: "obsidian", button: "import-obsidian", input: "import-obsidian-file", label: "Obsidian", keep: /\.(md|markdown|txt)$/i },
  { source: "evernote", button: "import-evernote", input: "import-evernote-file", label: "Evernote" },
  { source: "apple", button: "import-apple", input: "import-apple-file", label: "Apple Notes", keep: /\.(md|markdown|txt|html?)$/i },
];

async function importFromApp(spec) {
  const input = $(spec.input);
  const status = $("import-app-status");
  //: A folder picker hands over everything in the folder (a vault's
  //: `.obsidian/`, its pictures and PDFs); only the files a reader can use are
  //: sent, as the markdown import does.
  const files = [...input.files].filter((file) => !spec.keep || spec.keep.test(file.webkitRelativePath || file.name));
  input.value = "";
  if (!files.length) {
    $("import-app-status").textContent = `No ${spec.label} notes in what you chose.`;
    return;
  }
  const form = new FormData();
  for (const file of files) form.append("files", file, file.webkitRelativePath || file.name);
  setLabel(status, `ph:spin Importing from ${spec.label}…`);
  try {
    const response = await fetch(`/import/app?source=${spec.source}`, {
      method: "POST",
      headers: { "X-Auth-Token": authToken(), "X-Workspace-ID": activeSpaceId() },
      body: form,
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(typeof body.detail === "string" ? body.detail : `Couldn't import from ${spec.label}.`);
    const parts = [`Imported ${body.imported} note${body.imported === 1 ? "" : "s"} from ${spec.label}.`];
    if (body.already) parts.push(`${body.already} ${body.already === 1 ? "was" : "were"} already here.`);
    if (body.skipped && body.skipped.length) parts.push(`Left out ${body.skipped.length}: ${body.skipped.slice(0, 2).join("; ")}.`);
    if (!body.found) parts.splice(0, parts.length, `No ${spec.label} notes in what you chose.`);
    status.textContent = parts.join(" ");
    if (body.ids && body.ids.length && (await ensureModule("settingsData"))) undoImport(body, status);
    loadEntries().catch(() => {});
    refreshJobRuns();
  } catch (error) {
    status.textContent = error.message || `Couldn't import from ${spec.label}.`;
    status.classList.add("error");
  }
}

for (const spec of APP_IMPORTS) {
  $(spec.button)?.addEventListener("click", () => {
    $("import-app-status").classList.remove("error");
    $(spec.input).click();
  });
  $(spec.input)?.addEventListener("change", () => importFromApp(spec));
}
