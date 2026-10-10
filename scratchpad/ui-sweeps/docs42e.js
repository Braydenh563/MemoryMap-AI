// Brief 42 (docs42b step 6): Compare with a saved version, through a revision
// picked from the menu, on a document with history. Saves four versions of a
// .js document (three revisions: the server coalesces saves inside five
// minutes, so each revision is backdated in the data dir's SQLite between
// saves), opens the palette row, clicks a revision in the menu (it escapes to
// the body, `action-menu-escaped`), then the other.
// Usage: BASE=http://127.0.0.1:8845 DB=<data dir>/memorymap.db node docs42e.js
const { boot } = require("./lib.js");
const { execFileSync } = require("child_process");
const J = JSON.stringify;
let bad = 0;
const ok = (n, c, d) => { if (!c) bad += 1; console.log(`${c ? "PASS" : "FAIL"}  ${n}  - ${d}`); };
const V = [
  "function one() {\n  return 1;\n}\n",
  "function one() {\n  return 1;\n}\n\nfunction two() {\n  return 2;\n}\n",
  "function one() {\n  return 10;\n}\n\nfunction two() {\n  return 2;\n}\n",
  "function one() {\n  return 10;\n}\n\nfunction two() {\n  return 20;\n}\n\nfunction three() {\n  return 3;\n}\n",
];
const backdate = (id) => execFileSync("python3", ["-c",
  "import sqlite3,sys;c=sqlite3.connect(sys.argv[1]);c.execute(\"update document_revisions set created_at=datetime(created_at,'-10 minutes') where document_id=?\",(int(sys.argv[2]),));c.commit()",
  process.env.DB, String(id)]);
(async () => {
  const { browser, page } = await boot();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.evaluate(() => switchTab("documents"));
  await page.waitForTimeout(1500);
  const id = await page.evaluate(async (v) => (await apiJson("/documents", { method: "POST", body: JSON.stringify({ title: "Compare probe", content: v, file_type: "js" }) })).id, V[0]);
  for (const v of V.slice(1)) {
    await page.evaluate(async ([d, c]) => apiJson(`/documents/${d}`, { method: "PUT", body: JSON.stringify({ content: c }) }), [id, v]);
    backdate(id);
  }
  const revisions = await page.evaluate(async (d) => (await apiJson(`/documents/${d}/revisions`)).length, id);
  ok("three saved revisions", revisions === 3, J({ revisions }));
  await page.evaluate(async (d) => loadDocuments(d), id);
  await page.waitForTimeout(2500);
  const pick = async (index) => {
    await page.evaluate(() => DOC_COMMANDS.find((c) => c.id === "compare-version").run());
    await page.waitForSelector(".action-menu:not(.hidden) button", { timeout: 5000 });
    const rows = await page.$$eval(".action-menu:not(.hidden) button", (bs) => bs.map((b) => b.textContent.trim()));
    await page.locator(".action-menu:not(.hidden) button").nth(index).click();
    await page.waitForTimeout(1200);
    return page.evaluate((rowCount) => ({
      rows: rowCount,
      compared: docIde.compare && docIde.compare.text,
      changed: docCmView.dom.querySelectorAll(".cm-changedLine").length,
      deleted: docCmView.dom.querySelectorAll(".cm-deletedChunk").length,
      gutter: docCmView.dom.querySelectorAll(".cm-changeGutter .cm-gutterElement, .cm-changedLineGutter").length,
    }), rows.length);
  };
  const newest = await pick(0);
  ok("the menu lists the three revisions, newest first, and the newest compares", newest.rows === 3 && newest.compared === V[2] && newest.changed > 0, J({ ...newest, compared: (newest.compared || "").length }));
  const oldest = await pick(2);
  ok("the oldest compares against the editor with more changed lines", oldest.compared === V[0] && oldest.changed > newest.changed, J({ ...oldest, compared: (oldest.compared || "").length }));
  await page.evaluate(() => DOC_COMMANDS.find((c) => c.id === "compare-stop").run());
  await page.waitForTimeout(500);
  const after = await page.evaluate(() => docCmView.dom.querySelectorAll(".cm-changedLine").length);
  ok("Stop comparing clears the view", after === 0, J({ after }));
  console.log("errors", J(errors.slice(0, 4)), "bad", bad);
  await browser.close();
})();
