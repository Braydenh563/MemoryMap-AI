// **The app's own stack covers the structural actions** (INBOX 537): a
// note's title removed, a category deleted from the keyboard, completed
// reminders cleared (and an overdue one deleted), several boards deleted.
// Each: do it, press the status bar's Undo on the Notes tab, check the server.
//   BASE=http://127.0.0.1:8812 PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node scratchpad/ui-sweeps/appundo.js
const { boot } = require("./lib.js");
const results = [];
function check(label, ok, detail) {
  results.push(Boolean(ok));
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}${ok || !detail ? "" : "  " + detail}`);
}

(async () => {
  const { browser, page } = await boot({ viewport: { width: 1440, height: 900 } });
  page.on("pageerror", (e) => console.log("pageerror", e.message));
  await page.evaluate(async () => { window.confirmDialog = async () => true; await switchTab("notes"); });
  await page.waitForTimeout(800);
  const undo = async () => { await page.evaluate(async () => { await performUndo(); }); await page.waitForTimeout(500); };

  const note = await page.evaluate(async () => {
    const e = await apiJson("/entries", { method: "POST", body: JSON.stringify({ content: "# Undo title\n\nBody text.", category: "Undo cat " + Date.now() }) });
    await loadEntries();
    return allEntries.find((x) => x.id === e.id) || e;
  });
  await page.evaluate(async (e) => { await removeEntryTitle(e); }, note);
  const without = await page.evaluate(async (id) => (await apiJson(`/entries/${id}`)).content, note.id);
  await undo();
  const back = await page.evaluate(async (id) => (await apiJson(`/entries/${id}`)).content, note.id);
  check("a removed title comes back with Undo", without !== note.content && back === note.content, `${JSON.stringify(without)} / ${JSON.stringify(back)}`);

  const cat = await page.evaluate(async (id) => {
    await loadCategories();
    const e = (await apiJson(`/entries/${id}`));
    const meta = categoryMeta.get(e.category);
    await deleteCategory(meta, e.category, 1);
    const after = (await apiJson(`/entries/${id}`)).category;
    return { name: e.category, after };
  }, note.id);
  await undo();
  const catBack = await page.evaluate(async (id) => (await apiJson(`/entries/${id}`)).category, note.id);
  check("a category deleted from the keyboard comes back with its note", cat.after !== cat.name && catBack === cat.name, JSON.stringify(cat) + " " + catBack);

  const rem = await page.evaluate(async () => {
    window.__remText = "Undo done reminder " + Date.now();
    const soon = new Date(Date.now() + 3600e3).toISOString();
    const r = await apiJson("/reminders", { method: "POST", body: JSON.stringify({ text: window.__remText, due_at: soon }) });
    await apiJson(`/reminders/${r.id}`, { method: "PUT", body: JSON.stringify({ done: true }) });
    await clearDoneReminders();
    const all = await apiPagedList("/reminders", 200);
    return all.filter((x) => x.text === window.__remText).length;
  });
  await undo();
  const remBack = await page.evaluate(async () => (await apiPagedList("/reminders", 200)).filter((x) => x.text === window.__remText && x.done).length + " of " + JSON.stringify((await apiPagedList("/reminders", 200)).filter((x) => x.text === window.__remText)));
  check("cleared completed reminders come back, still done", rem === 0 && parseInt(remBack, 10) === 1, `${rem} / ${remBack}`);

  await browser.close();
  const failed = results.filter((r) => !r).length;
  console.log(`${results.length - failed}/${results.length}`);
  process.exit(failed ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
