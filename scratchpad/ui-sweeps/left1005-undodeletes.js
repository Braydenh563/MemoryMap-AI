// undo-1005 "Still open" 1 and 3: each of these deletes comes back with the
// status bar's Undo, and goes again with Redo. A reference detached from a
// note being edited, a note type, a kind of link (its links typed again), a
// space whose contents were moved, a chat.
//   BASE=http://127.0.0.1:8846 PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node scratchpad/ui-sweeps/left1005-undodeletes.js
const { boot } = require("./lib.js");
const results = [];
function check(label, ok, detail) {
  results.push(Boolean(ok));
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}${ok || !detail ? "" : "  " + detail}`);
}
const VW = Number(process.env.VW || 1440);

(async () => {
  const { browser, page } = await boot({ viewport: { width: VW, height: VW < 600 ? 844 : 900 }, ...(VW < 600 ? { hasTouch: true, isMobile: true } : {}) });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.evaluate(async () => { window.confirmDialog = async () => true; await switchTab("notes"); });
  await page.waitForTimeout(800);
  const undo = async () => { await page.evaluate(async () => { await performUndo(); }); await page.waitForTimeout(500); };
  const redo = async () => { await page.evaluate(async () => { await performRedo(); }); await page.waitForTimeout(500); };
  const stamp = Date.now();

  // 1. A reference detached from a note being edited, through its own x.
  const ref = await page.evaluate(async (stamp) => {
    const note = await apiJson("/entries", { method: "POST", body: JSON.stringify({ content: `Ref host ${stamp}` }) });
    const a = await apiJson("/bookmarks", { method: "POST", body: JSON.stringify({ url: `https://a${stamp}.example`, title: "First ref" }) });
    const b = await apiJson("/bookmarks", { method: "POST", body: JSON.stringify({ url: `https://b${stamp}.example`, title: "Second ref" }) });
    for (const bm of [a, b]) await apiJson(`/entries/${note.id}/bookmarks`, { method: "POST", body: JSON.stringify({ bookmark_id: bm.id }) });
    await ensureModule("notePanels");
    editingId = note.id;
    const li = document.createElement("li");
    document.body.appendChild(li);
    await renderNoteBookmarksWhileEditing(li, note);
    li.querySelector(".unlink").click();
    await new Promise((r) => setTimeout(r, 600));
    const after = (await apiJson(`/entries/${note.id}/bookmarks`)).map((x) => x.id);
    window.__ref = { note: note.id, a: a.id, b: b.id, li };
    return { after, a: a.id, b: b.id };
  }, stamp);
  await undo();
  const refBack = await page.evaluate(async () => {
    const ids = (await apiJson(`/entries/${window.__ref.note}/bookmarks`)).map((x) => x.id);
    return { ids, chips: window.__ref.li.querySelectorAll(".unlink").length };
  });
  check("a detached reference comes back first, where it was", JSON.stringify(ref.after) === JSON.stringify([ref.b]) && JSON.stringify(refBack.ids) === JSON.stringify([ref.a, ref.b]) && refBack.chips === 2, JSON.stringify({ ref, refBack }));
  await redo();
  const refRedo = await page.evaluate(async () => (await apiJson(`/entries/${window.__ref.note}/bookmarks`)).length);
  check("and Redo detaches it again", refRedo === 1, String(refRedo));
  await page.evaluate(() => { editingId = null; window.__ref.li.remove(); });

  // 2. A note type.
  const nt = await page.evaluate(async (stamp) => {
    const made = await apiJson("/note-types", { method: "POST", body: JSON.stringify({ name: `Meeting ${stamp}`, fields: [{ name: "attendees", kind: "list" }] }) });
    await ensureModule("inbox");
    const gone = await apiJson(`/note-types/${made.id}`, { method: "DELETE" });
    noteTypeDeleteUndo(gone.type);
    return made;
  }, stamp);
  await undo();
  const ntBack = await page.evaluate(async (id) => (await apiJson("/note-types")).find((t) => t.id === id) || null, nt.id);
  check("a deleted note type comes back with its id and fields", ntBack && ntBack.name === nt.name && ntBack.fields.length === 1, JSON.stringify(ntBack));

  // 3. A kind of link, with its links.
  const rt = await page.evaluate(async (stamp) => {
    const a = await apiJson("/entries", { method: "POST", body: JSON.stringify({ content: `Kind a ${stamp}` }) });
    const b = await apiJson("/entries", { method: "POST", body: JSON.stringify({ content: `Kind b ${stamp}` }) });
    const t = await apiJson("/relation-types", { method: "POST", body: JSON.stringify({ name: `Answers ${stamp}` }) });
    await apiJson(`/entries/${a.id}/links`, { method: "POST", body: JSON.stringify({ target_id: b.id, link_type: t.key }) });
    const gone = await apiJson(`/relation-types/${t.key}`, { method: "DELETE" });
    relationTypeDeleteUndo(gone);
    const kind = (await apiJson(`/entries/${a.id}`)).links[0].link_type;
    return { a: a.id, key: t.key, kind, untyped: gone.links_untyped };
  }, stamp);
  await undo();
  const rtBack = await page.evaluate(async (rt) => ({
    kind: (await apiJson(`/entries/${rt.a}`)).links[0].link_type,
    listed: (await apiJson("/relation-types")).some((t) => t.key === rt.key),
  }), rt);
  check("a deleted kind of link comes back and its link is typed again", rt.untyped === 1 && rt.kind == null && rtBack.kind === rt.key && rtBack.listed, JSON.stringify({ rt, rtBack }));

  // 4. A space whose contents were moved, through the dialog.
  const sp = await page.evaluate(async (stamp) => {
    const space = await apiJson("/spaces", { method: "POST", body: JSON.stringify({ name: `Undo space ${stamp}` }) });
    const note = await fetch("/entries", { method: "POST", headers: { "Content-Type": "application/json", "X-Auth-Token": authToken(), "X-Workspace-ID": space.id }, body: JSON.stringify({ content: `Lives in the space ${stamp}` }) }).then((r) => r.json());
    await loadSpaces();
    openSpaceDelete(space.id);
    await new Promise((r) => setTimeout(r, 300));
    const fate = document.getElementById("space-delete-fate");
    fate.value = "default";
    document.getElementById("space-delete-submit").click();
    await new Promise((r) => setTimeout(r, 1200));
    const listed = (await apiJson("/spaces")).some((s) => s.id === space.id);
    return { id: space.id, note: note.id, listed };
  }, stamp);
  await undo();
  const spBack = await page.evaluate(async (sp) => {
    const listed = (await apiJson("/spaces")).some((s) => s.id === sp.id);
    const there = await fetch(`/entries/${sp.note}`, { headers: { "X-Auth-Token": authToken(), "X-Workspace-ID": sp.id } });
    return { listed, there: there.ok };
  }, sp);
  check("a space whose contents moved comes back with its note in it", !sp.listed && spBack.listed && spBack.there, JSON.stringify({ sp, spBack }));

  // 5. A chat, from the chat pane's own Delete.
  const ch = await page.evaluate(async (stamp) => {
    const made = await apiJson("/conversations", { method: "POST", body: JSON.stringify({ question: `Undo chat ${stamp}`, answer: "Still here." }) });
    await switchTab("chat");
    await openConversation(made.id);
    await deleteCurrentChat();
    await new Promise((r) => setTimeout(r, 400));
    const gone = (await fetch(`/conversations/${made.id}`, { headers: { "X-Auth-Token": authToken(), "X-Workspace-ID": activeSpaceId() } })).status;
    await switchTab("notes");
    return { id: made.id, gone };
  }, stamp);
  await undo();
  const chBack = await page.evaluate(async (id) => (await apiJson(`/conversations/${id}`)).messages.length, ch.id);
  check("a deleted chat comes back whole", ch.gone === 404 && chBack === 2, JSON.stringify({ ch, chBack }));

  check("no page errors", errors.length === 0, errors.join(" | "));
  await browser.close();
  const failed = results.filter((r) => !r).length;
  console.log(`${results.length - failed}/${results.length}`);
  process.exit(failed ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
