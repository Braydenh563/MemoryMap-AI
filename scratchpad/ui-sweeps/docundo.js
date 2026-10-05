// **Each document keeps its own Undo history for the session** (the owner,
// 2026-10-05: "undo and redo history for specific documents, whiteboards,
// mindmaps"). Type in A, open B, come back to A: Undo still takes A's typing
// back, the status bar's pair says it walks this document, and B's history
// is B's alone. Then a board: the pair says "on this board"; the Notes tab:
// the app's own.
//   BASE=http://127.0.0.1:8812 PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node scratchpad/ui-sweeps/docundo.js
const { boot } = require("./lib.js");
const results = [];
function check(label, ok, detail) {
  results.push(Boolean(ok));
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}${ok || !detail ? "" : "  " + detail}`);
}

(async () => {
  const { browser, page } = await boot({ viewport: { width: 1440, height: 900 } });
  page.on("pageerror", (e) => console.log("pageerror", e.message));
  const [a, b] = await page.evaluate(async () => {
    const mk = (title) => apiJson("/documents", { method: "POST", body: JSON.stringify({ title, content: `# ${title}\n\nStart.` }) });
    return [await mk("Undo doc A " + Date.now()), await mk("Undo doc B " + Date.now())];
  });
  await page.evaluate(async () => { await switchTab("documents"); });
  await page.waitForTimeout(1200);
  const openDoc = async (id) => { await page.evaluate(async (x) => { await openDocument(x); }, id); await page.waitForTimeout(700); };
  const text = () => page.evaluate(() => docCmView.state.doc.toString());
  await openDoc(a.id);
  await page.evaluate(() => { docCmView.focus(); docCmView.dispatch({ selection: { anchor: docCmView.state.doc.length } }); });
  await page.keyboard.type(" Typed in A.");
  await page.waitForTimeout(400);
  const typed = await text();
  check("typing landed in A", typed.endsWith("Typed in A."), typed);
  await openDoc(b.id);
  check("B opens with no history of its own", await page.evaluate(() => !window.docCanUndo()));
  await openDoc(a.id);
  check("A comes back with its text", (await text()) === typed, await text());
  check("and its history", await page.evaluate(() => window.docCanUndo()));
  await page.evaluate(() => document.activeElement?.blur());
  const title = await page.evaluate(() => { renderUndoBar(); return document.getElementById("status-undo").title; });
  check("the status bar's Undo names this document", /in this document/.test(title), title);
  await page.evaluate(() => document.getElementById("status-undo").click());
  await page.waitForTimeout(400);
  check("the status bar's Undo takes A's typing back", !(await text()).includes("Typed in A"), await text());
  await page.evaluate(() => document.getElementById("status-redo").click());
  await page.waitForTimeout(400);
  check("and Redo puts it back", (await text()).includes("Typed in A"), await text());
  await page.evaluate(async () => { await saveDocument({ silent: true }); switchTab("notes"); });
  await page.waitForTimeout(600);
  const notesTitle = await page.evaluate(() => document.getElementById("status-undo").title + " docsHidden=" + document.getElementById("tab-documents").classList.contains("hidden") + " active=" + localStorage.getItem("activeTab"));
  check("on Notes the pair is the app's", !/document|board/.test(notesTitle), notesTitle);
  await browser.close();
  const failed = results.filter((r) => !r).length;
  console.log(`${results.length - failed}/${results.length}`);
  process.exit(failed ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
