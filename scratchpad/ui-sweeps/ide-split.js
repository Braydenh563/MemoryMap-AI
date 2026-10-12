// Brief 71 (DOCUMENTS_PLAN 23 I3): breadcrumbs as jumps, the outline following
// the caret, and the split (Ctrl+\): two editors, edits both ways, one history,
// scroll sync off. Usage: BASE=http://127.0.0.1:8827 node ide-split.js
const { boot } = require("./lib.js");
const J = JSON.stringify;
let good = 0, bad = 0;
const ok = (n, c, d) => { c ? good++ : bad++; console.log(`${c ? "PASS" : "FAIL"}  ${n}${d === undefined ? "" : "  - " + d}`); };
(async () => {
  const { browser, page } = await boot({ viewport: { width: 1440, height: 900 } });
  const errs = []; page.on("pageerror", (e) => errs.push(e.message));
  await page.evaluate(() => switchTab("documents"));
  await page.waitForTimeout(2000);
  const src = "class Box {\n  size() {\n    return 1;\n  }\n}\n" + Array.from({ length: 80 }, (_, i) => `const v${i} = ${i};`).join("\n") + "\nfunction alpha() {\n  return 2;\n}\n";
  await page.evaluate(async (c) => { const d = await apiJson("/documents", { method: "POST", body: JSON.stringify({ title: "split.js", content: c, file_type: "js" }) }); await loadDocuments(d.id); }, src);
  await page.waitForTimeout(2500);
  // breadcrumbs: caret inside size(), click the "class Box" crumb
  await page.evaluate(() => { docCmView.dispatch({ selection: { anchor: docCmView.state.doc.line(3).from + 4 } }); docCmView.focus(); });
  await page.waitForTimeout(800);
  const crumbs = await page.evaluate(() => [...document.querySelectorAll("[class*=crumb] button")].map((b) => b.textContent.trim()));
  ok("breadcrumbs show the symbol path", crumbs.join("/").includes("class Box/size()"), J(crumbs));
  await page.locator("[class*=crumb] button", { hasText: "class Box" }).first().click();
  await page.waitForTimeout(500);
  const line = await page.evaluate(() => docCmView.state.doc.lineAt(docCmView.state.selection.main.head).number);
  ok("a crumb is a jump", line === 1, line);
  // outline follows the caret
  await page.evaluate(() => { showDocSidebarSection("outline"); const d = docCmView.state.doc; docCmView.dispatch({ selection: { anchor: d.line(d.lines - 2).from + 2 }, scrollIntoView: true }); });
  await page.waitForTimeout(1200);
  const cur = await page.evaluate(() => document.querySelector("#doc-outline [aria-current]")?.textContent.trim());
  ok("the outline follows the caret", /alpha/.test(cur || ""), cur);
  // split
  await page.evaluate(() => docCmView.focus());
  await page.keyboard.press("Control+Backslash");
  await page.waitForTimeout(600);
  const geo = await page.evaluate(() => { const [a, b] = [...document.querySelectorAll("#doc-editor > .cm-editor")]; const r = (e) => e && e.getBoundingClientRect(); return { n: document.querySelectorAll("#doc-editor > .cm-editor").length, a: r(a) && [Math.round(r(a).left), Math.round(r(a).width), Math.round(r(a).height)], b: r(b) && [Math.round(r(b).left), Math.round(r(b).width), Math.round(r(b).height)], focusInB: b && b.contains(document.activeElement) }; });
  ok("Ctrl+\\ splits: two editors side by side, focus in the second", geo.n === 2 && geo.b[0] >= geo.a[0] + geo.a[1] - 2 && geo.focusInB, J(geo));
  await page.keyboard.type("// typed in b\n");
  await page.waitForTimeout(300);
  const same = await page.evaluate(() => ({ a: docCmView.state.doc.toString().includes("// typed in b"), eq: docCmView.state.doc.toString() === docIde.split.state.doc.toString() }));
  ok("an edit in the second half reaches the first", same.a && same.eq, J(same));
  await page.evaluate(() => { docCmView.dispatch({ changes: { from: 0, insert: "// from a\n" } }); });
  await page.waitForTimeout(200);
  ok("an edit in the first reaches the second", await page.evaluate(() => docIde.split.state.doc.toString().startsWith("// from a")));
  await page.evaluate(() => docIde.split.focus());
  await page.keyboard.press("Control+z");
  await page.waitForTimeout(300);
  ok("Ctrl+Z in the second undoes the last edit in either", await page.evaluate(() => !docCmView.state.doc.toString().startsWith("// from a") && docCmView.state.doc.toString() === docIde.split.state.doc.toString()));
  // scroll sync off
  await page.evaluate(() => { docIde.split.scrollDOM.scrollTop = 600; });
  await page.waitForTimeout(300);
  const sc = await page.evaluate(() => [docCmView.scrollDOM.scrollTop, docIde.split.scrollDOM.scrollTop]);
  ok("scroll sync is off", sc[1] > 0 && sc[0] !== sc[1], J(sc));
  await page.keyboard.press("Control+Backslash");
  await page.waitForTimeout(400);
  ok("Ctrl+\\ again closes it", await page.evaluate(() => !docIde.split && document.querySelectorAll("#doc-editor > .cm-editor").length === 1));
  ok("no page errors", errs.length === 0, J(errs));
  console.log(`${good}/${good + bad}`);
  await browser.close();
})();
