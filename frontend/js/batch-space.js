// batch-space.js: a selection's Move to space (WORLD_CLASS_PLAN row 30,
// section 5), its space picker and its Undo. Out of skills.js on 2026-10-05
// to leave the boot (tests/test_boot_budget.py): it runs only from the
// selection bar's More menu. Loaded by `LAZY_MODULES.batchSpace` (app.js),
// whose stand-in for `batchMoveToSpace` fetches it and calls the real one.

//: **Move the selection to another space** (WORLD_CLASS_PLAN 5 item 5, INBOX
//: 1: a note filed into the wrong space could only leave it with the space).
//: The server moves what hangs off each note too and answers with where each
//: one was, which is what the Undo sends back. Each request names the space
//: the notes are in now, since a note moved out of the space on screen is
//: one this window's own space filter no longer sees.
function batchSpaceRequest(spaceId, ids, from) {
  return api(`/spaces/${encodeURIComponent(spaceId)}/move-notes`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Auth-Token": authToken(), "X-Workspace-ID": from },
    body: JSON.stringify({ ids }),
  }).then((r) => r.json());
}

function pickSpaceDialog(title) {
  return new Promise((resolve) => {
    const shell = pickerDialog({ title, placeholder: "Search your spaces…", searchLabel: "Search your spaces" });
    const box = pickerListbox(shell, "Your spaces");
    const paint = () => {
      const needle = shell.search.value.trim().toLowerCase();
      const items = spacesCache
        .filter((s) => !needle || s.name.toLowerCase().includes(needle))
        .map((s) => ({
          icon: `ph:${String(s.icon || "ph-folder").replace(/^ph-/, "")}`,
          label: s.name,
          about: s.id === activeSpaceId() ? "The space you are in" : "",
          value: s,
        }));
      box.fill(items, needle, needle ? "No space has that name." : "No spaces yet.");
    };
    shell.search.addEventListener("input", paint);
    paint();
    shell.open(resolve);
  });
}

async function batchMoveToSpace() {
  const ids = batchSelection();
  if (!ids.length) return;
  if (!spacesCache.length) await loadSpaces().catch(() => {});
  const space = await pickSpaceDialog(`Move ${batchNoun(ids)} to which space?`);
  if (!space) return;
  let moved;
  try {
    moved = await batchSpaceRequest(space.id, ids, activeSpaceId());
  } catch (error) {
    toast(error.message, true);
    return;
  }
  exitSelectMode();
  await refreshEntries(ids);
  if (!moved.moved) return toast(`They are all in ${space.name} already.`);
  const back = async () => {
    const groups = new Map();
    for (const [id, from] of Object.entries(moved.from)) groups.set(from, [...(groups.get(from) || []), Number(id)]);
    for (const [from, group] of groups) await batchSpaceRequest(from, group, space.id);
    await refreshEntries(ids);
  };
  const again = async () => {
    await batchSpaceRequest(space.id, Object.keys(moved.from).map(Number), SPACE_ALL);
    await refreshEntries(ids);
  };
  const action = pushUndo(`Moved ${batchNoun(ids)} to ${space.name}`, back, again);
  toastAction(`Moved ${moved.moved} to ${space.name}.`, "Undo", async () => {
    settleUndoFromToast(action);
    await back();
  });
}
