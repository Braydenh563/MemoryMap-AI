// Brief 42, the built pieces measured: active line, minimap, fold all, the
// problems panel against the gutter, the merge view against a saved version.
// Usage: BASE=http://127.0.0.1:8846 node docs42b.js
const { boot } = require("./lib.js");
const J = JSON.stringify;
let bad = 0;
const ok = (n, c, d) => { if (!c) bad += 1; console.log(`${c ? "PASS" : "FAIL"}  ${n}  - ${d}`); };
const JS = "function a() {\n  if (x) {\n    return 1;\n  }\n}\nfunction b() {\n  return 2;\n}\nconst = ;\nlet = ;\nvar 1x;\n";
(async () => {
  const { browser, page } = await boot();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.evaluate(() => switchTab("documents"));
  await page.waitForTimeout(1500);
  const id = await page.evaluate(async (c) => {
    const d = await apiJson("/documents", { method: "POST", body: JSON.stringify({ title: "b42.js", content: c, file_type: "js" }) });
    await loadDocuments(d.id);
    return d.id;
  }, JS);
  await page.waitForFunction(() => typeof docCmView !== "undefined" && docCmView && docCmView.state.doc.length > 50, null, { timeout: 15000 });
  await page.waitForTimeout(2500);
  await page.evaluate(() => { docCmView.focus(); docCmView.dispatch({ selection: { anchor: 20 } }); });
  await page.waitForTimeout(200);
  const line = await page.evaluate(() => ({ w: getComputedStyle(docCmView.dom.querySelector(".cm-activeLineGutter")).fontWeight, sh: getComputedStyle(docCmView.dom.querySelector(".cm-activeLine")).boxShadow, cls: docCmView.dom.className.slice(0, 80), focused: docCmView.hasFocus, connected: docCmView.dom.isConnected, editors: [...document.querySelectorAll(".cm-editor")].map((e) => (e.parentElement.id || e.parentElement.className.slice(0, 20)) + ":" + e.className.slice(0, 40) + ":" + (e === docCmView.dom)), type: docFileType().ext }));
  ok("active line number bold", Number(line.w) >= 700, J(line));
  ok("active line bordered", /inset/.test(line.sh) || /px/.test(line.sh), line.sh);
  const mm = await page.evaluate(async () => {
    const off = document.querySelectorAll(".cm-minimap-gutter").length;
    const row = !document.getElementById("doc-minimap-row").classList.contains("hidden");
    docIdeToggleMinimap(true);
    await new Promise((r) => setTimeout(r, 400));
    const g = docCmView.dom.querySelector(".cm-minimap-gutter");
    const on = g ? Math.round(g.getBoundingClientRect().width) : 0;
    docIdeToggleMinimap(false);
    await new Promise((r) => setTimeout(r, 200));
    const dbg = [...docCmView.dom.querySelectorAll("[class*=minimap]")].map((e) => e.className.slice(0, 40)); return { dbg, off, row, on, after: document.querySelectorAll(".cm-minimap-gutter").length };
  });
  ok("minimap off by default, row shown, on draws a lane, off removes it", mm.off === 0 && mm.row && mm.on > 20 && mm.after === 0, J(mm));
  const fold = await page.evaluate(async () => {
    docIdeFoldAll(false);
    await new Promise((r) => setTimeout(r, 200));
    const n = document.querySelectorAll(".cm-foldPlaceholder").length;
    docIdeFoldAll(true);
    await new Promise((r) => setTimeout(r, 200));
    return { folded: n, after: document.querySelectorAll(".cm-foldPlaceholder").length };
  });
  ok("fold all folds every top-level block, unfold all opens them", fold.folded === 2 && fold.after === 0, J(fold));
  const lint = await page.evaluate(async () => {
    docIdeProblems();
    await new Promise((r) => setTimeout(r, 300));
    const CM = window.CM6;
    let gutterDiag = 0;
    CM.lint.forEachDiagnostic(docCmView.state, () => { gutterDiag += 1; });
    return { panel: document.querySelectorAll(".cm-panel-lint li").length, diagnostics: gutterDiag, markers: document.querySelectorAll(".cm-lint-marker").length };
  });
  ok("problems panel lists what the gutter shows", lint.panel > 0 && lint.panel === lint.diagnostics, J(lint));
  await page.keyboard.press("Escape");
  // a saved version, then an edit, then compare
  const cmp = await page.evaluate(async (docId) => {
    const revs = await apiJson(`/documents/${docId}/revisions`);
    docCmView.dispatch({ changes: { from: 0, to: 0, insert: "// added line\n" } });
    const end = docCmView.state.doc.line(7);
    docCmView.dispatch({ changes: { from: end.from, to: end.to, insert: "  return 3;" } });
    await new Promise((r) => setTimeout(r, 300));
    // compare against the text as created, through the same path the menu uses
    docIde.compare = { docId, label: "created", text: currentDoc.content || "" };
    docIdeReconfigure();
    await new Promise((r) => setTimeout(r, 400));
    const chunks = document.querySelectorAll(".cm-deletedChunk").length;
    const buttons = document.querySelectorAll(".cm-deletedChunk button, .cm-chunkButtons button").length;
    docCmView.dispatch({ selection: { anchor: 2 } });
    docIdeRevertAtCaret();
    await new Promise((r) => setTimeout(r, 300));
    const firstLine = docCmView.state.doc.line(1).text;
    const changed = docCmView.state.doc.toString().includes("return 3;");
    docIdeStopCompare();
    await new Promise((r) => setTimeout(r, 200));
    return { revs: revs.length, chunks, buttons, firstLine, changed, left: document.querySelectorAll(".cm-deletedChunk, .cm-changedLine").length };
  }, id);
  ok("merge view: hunks drawn with their buttons; putting back the hunk at the caret undoes only it; stop clears", cmp.buttons > 0 && cmp.firstLine === "function a() {" && cmp.changed && cmp.left === 0, J(cmp));
  console.log("errors", J(errors.slice(0, 5)), "bad", bad);
  await browser.close();
})();
