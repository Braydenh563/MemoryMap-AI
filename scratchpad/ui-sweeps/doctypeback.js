// INBOX 904 B21/B22: md -> code -> md must leave the document a markdown
// document (toolbar, Live view, code chrome off), and the stored view must
// not be overwritten by the code file's forced Source.
// Usage: BASE=http://127.0.0.1:8783 node doctypeback.js
const { boot } = require("./lib.js");
let bad = 0;
const ok = (n, c, d) => { if (!c) bad += 1; console.log(`${c ? "PASS" : "FAIL"}  ${n}${d === undefined ? "" : "  - " + d}`); };
(async () => {
  const { browser, page } = await boot();
  await page.evaluate(() => switchTab("documents"));
  await page.waitForTimeout(2000);
  await page.evaluate(async () => {
    prefs.set("doc-view-mode", "live");
    const d = await apiJson("/documents", { method: "POST", body: JSON.stringify({ title: "B21 probe", content: "# Hello\n\nsome *text*\n", file_type: "md" }) });
    await loadDocuments(d.id);
  });
  await page.waitForTimeout(1500);
  const state = () => page.evaluate(() => ({
    ext: currentDoc.file_type, view: docView, stored: prefs.get("doc-view-mode", null),
    isCode: document.getElementById("tab-documents").classList.contains("doc-is-code"),
    toolbarHidden: document.getElementById("doc-toolbar").classList.contains("hidden"),
    boxCode: !!document.querySelector(".doc-content-code"),
    wrapView: document.querySelector("#doc-source-wrap")?.dataset.docView,
    formatShown: !document.getElementById("doc-code-format").classList.contains("hidden"),
    cmClass: (document.querySelector("#doc-editor .cm-editor") || {}).className,
    gutters: document.querySelectorAll("#doc-editor .cm-gutter").length,
    lintMarks: document.querySelectorAll("#doc-editor .cm-lintRange, #doc-editor .cm-gutter-lint").length,
    runShown:!document.getElementById("doc-code-run").classList.contains("hidden"),
  }));
  const pick = async (v) => { await page.evaluate((x) => { const s = document.getElementById("doc-file-type"); s.value = x; s.dispatchEvent(new Event("change", { bubbles: true })); }, v); await page.waitForTimeout(1200); };
  console.log("start", JSON.stringify(await state()));
  await pick("py");
  console.log("py", JSON.stringify(await state()));
  await pick("md");
  const back = await state();
  console.log("back", JSON.stringify(back));
  ok("code chrome off after back to md", !back.isCode && !back.boxCode && !back.formatShown && !back.runShown && !back.toolbarHidden);
  ok("view returns to live (B22)", back.view === "live", back.view);
  ok("stored view not clobbered by a forced Source (B22)", back.stored === "live", back.stored);
  await page.evaluate(async () => {
    const d = await apiJson("/documents", { method: "POST", body: JSON.stringify({ title: "B22 probe", content: "x", file_type: "md" }) });
    await loadDocuments(d.id);
  });
  await page.waitForTimeout(1200);
  const fresh = await state();
  console.log("fresh", JSON.stringify(fresh));
  ok("new md doc opens in live", fresh.view === "live", fresh.view);
  await browser.close();
  console.log(bad ? `${bad} FAILED` : "all passed");
  process.exit(bad ? 1 : 0);
})();
