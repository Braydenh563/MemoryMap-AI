// Owner 2026-10-11: a dismissed selection bubble returns on a right-click of the selection; no selection, no bubble.
const { boot } = require("./lib.js");
let bad = 0;
const ok = (n, c, d) => { if (!c) bad++; console.log(`${c ? "PASS" : "FAIL"}  ${n}${d === undefined ? "" : "  - " + d}`); };
(async () => {
  const { browser, page } = await boot();
  await page.evaluate(() => switchTab("documents"));
  await page.waitForTimeout(2000);
  await page.evaluate(async () => { const d = await apiJson("/documents", { method: "POST", body: JSON.stringify({ title: "r1011", content: "hello world some words here\n\nsecond paragraph text", file_type: "md" }) }); await loadDocuments(d.id); });
  await page.waitForTimeout(3000);
  const barShown = () => page.evaluate(() => { const b = document.getElementById("selection-bar"); return !!b && !b.classList.contains("hidden"); });
  const popShown = () => page.evaluate(() => { const b = document.querySelector(".selection-popup"); return !!b && !b.classList.contains("hidden"); });
  const prevented = () => page.evaluate(() => window.__cm);
  await page.evaluate(() => { window.__cm = []; document.addEventListener("contextmenu", (e) => window.__cm.push(e.defaultPrevented)); });
  await page.dblclick("#doc-editor .cm-content");
  await page.waitForTimeout(700);
  ok("bar after select", await barShown());
  await page.evaluate(() => selectionBarHide());
  await page.waitForTimeout(300);
  ok("bar gone after dismiss", !(await barShown()));
  const rect = await page.evaluate(() => { const r = window.getSelection().getRangeAt(0).getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2, sel: window.getSelection().toString() }; });
  console.log("selection", JSON.stringify(rect));
  await page.mouse.click(rect.x, rect.y, { button: "right" });
  await page.waitForTimeout(400);
  ok("bar back on right-click of selection", await barShown());
  // right-click away from the selection: not restored, normal menu (not prevented)
  await page.evaluate(() => selectionBarHide());
  await page.evaluate(() => { docCmView.dispatch({ selection: { anchor: 0, head: 5 } }); selectionBarHide(); });
  await page.waitForTimeout(200);
  const paras = await page.$$("#doc-editor .cm-line");
  const last = await paras[paras.length - 1].boundingBox();
  await page.mouse.click(last.x + last.width - 20, last.y + 5, { button: "right" });
  await page.waitForTimeout(400);
  ok("no bar for a right-click elsewhere", !(await barShown()));
  // no selection at all
  await page.evaluate(() => { window.getSelection().removeAllRanges(); });
  await page.mouse.click(last.x + 5, last.y + 5, { button: "right" });
  ok("no bar with no selection", !(await barShown()));
  console.log("prevented flags", JSON.stringify(await prevented()));
  // rendered text popup: dashboard / ask answer; use a heading in the help or a note
  await page.evaluate(() => switchTab("library"));
  await page.waitForTimeout(1500);
  await page.evaluate(() => { const h = [...document.querySelectorAll("#library-view-files p, #library-view-files h2, #library-view-files span, main p, main h2")].find((e) => e.getBoundingClientRect().width > 40 && e.getBoundingClientRect().height > 5 && e.textContent.trim().length > 8); const r = document.createRange(); r.selectNodeContents(h); const s = getSelection(); s.removeAllRanges(); s.addRange(r); window.__h = h.textContent; });
  await page.waitForTimeout(500);
  const hs = await page.evaluate(() => { const r = getSelection().getRangeAt(0).getBoundingClientRect(); return { x: r.left + 3, y: r.top + r.height / 2, w: r.width }; });
  console.log("heading rect", JSON.stringify(hs), await page.evaluate(() => window.__h));
  if (hs.w) {
    await page.evaluate(() => { document.querySelector(".selection-popup")?.classList.add("hidden"); });
    await page.mouse.click(hs.x, hs.y, { button: "right" });
    await page.waitForTimeout(500);
    ok("kebab back on right-click of rendered selection", await popShown());
  }
  await page.evaluate(() => switchTab("notes"));
  await page.waitForTimeout(1200);
  const ta = await page.evaluate(() => { const t = [...document.querySelectorAll("textarea")].find((e) => e.getBoundingClientRect().width > 100 && e.getBoundingClientRect().height > 20); if (!t) return null; t.value = "alpha beta gamma delta"; t.focus(); t.setSelectionRange(0, 10); document.querySelector(".selection-popup")?.classList.add("hidden"); const r = t.getBoundingClientRect(); return { id: t.id, x: r.left + 30, y: r.top + 12, vis: r.width }; });
  console.log("textarea", JSON.stringify(ta));
  if (ta) { await page.mouse.click(ta.x, ta.y, { button: "right" }); await page.waitForTimeout(500); ok("popup or bar back for a textarea selection", (await popShown()) || (await barShown())); }
  console.log(bad ? "FAILURES " + bad : "all pass");
  await browser.close();
})();
