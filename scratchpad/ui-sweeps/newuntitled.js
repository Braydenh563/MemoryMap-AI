// INBOX 904 B17: a new document, board or map takes a default name
// ("Untitled document N") with the name selected for replacing, and never
// asks for a title first. Measures what a press of New leaves on screen.
// Usage: BASE=http://127.0.0.1:8783 node newuntitled.js
const { boot, openBoardsTab } = require("./lib.js");
let bad = 0;
const ok = (n, c, d) => { if (!c) bad += 1; console.log(`${c ? "PASS" : "FAIL"}  ${n}${d === undefined ? "" : "  - " + d}`); };
(async () => {
  const { browser, page } = await boot();
  await page.evaluate(() => switchTab("documents"));
  await page.waitForTimeout(2000);
  await page.click("#doc-new");
  await page.waitForTimeout(1500);
  const d = await page.evaluate(() => {
    const t = document.getElementById("doc-title");
    const dlg = [...document.querySelectorAll("dialog[open], .confirm-overlay")].map((e) => e.id || e.className).slice(0, 3);
    return { value: t.value, start: t.selectionStart, end: t.selectionEnd, focused: document.activeElement === t, dialogs: dlg, hidden: t.closest(".hidden") !== null };
  });
  await page.waitForTimeout(500);
  const popup = await page.evaluate(() => { const e = document.querySelector(".selection-popup"); return e && !e.classList.contains("hidden") ? [Math.round(e.getBoundingClientRect().left), Math.round(e.getBoundingClientRect().top)] : null; });
  console.log("document", JSON.stringify(d), "selection popup", JSON.stringify(popup));
  ok("document: the preselected title draws no selection popup", popup === null, JSON.stringify(popup));
  ok("document: default title is Untitled document N", /^Untitled document \d+$/.test(d.value), d.value);
  ok("document: no dialog asked first", d.dialogs.length === 0, JSON.stringify(d.dialogs));
  ok("document: the title is focused and wholly selected", d.focused && d.start === 0 && d.end === d.value.length);
  // The board and map template gallery: the name field holds the default name, selected.
  await openBoardsTab(page);
  await page.evaluate(() => { createNewBoard(); });
  await page.waitForSelector("#wb-template-dialog[open]");
  await page.waitForTimeout(800);
  for (const kind of ["board", "map"]) {
    if (kind === "map") { await page.click('#wb-template-kind [data-value="map"]'); await page.waitForTimeout(300); }
    const g = await page.evaluate(() => { const f = document.getElementById("wb-template-name"); return { value: f.value, start: f.selectionStart, end: f.selectionEnd, focused: document.activeElement === f }; });
    console.log("gallery", kind, JSON.stringify(g));
    ok(`${kind} gallery: the name field holds the default name`, new RegExp(`^Untitled ${kind} \\d+$`).test(g.value), g.value);
    if (kind === "board") ok("board gallery: it is focused and wholly selected", g.focused && g.start === 0 && g.end === g.value.length, JSON.stringify(g));
  }
  const gpop = await page.evaluate(() => { const e = document.querySelector(".selection-popup"); return e && !e.classList.contains("hidden"); });
  ok("gallery: no selection popup over the selected name", !gpop);
  await browser.close();
  console.log(bad ? `${bad} FAILED` : "all passed");
  process.exit(bad ? 1 : 0);
})();
