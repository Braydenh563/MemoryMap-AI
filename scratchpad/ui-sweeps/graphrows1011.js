// Ledger rows 934, 936, 945/Topic N and 964 (graphatlas-1011), one boot.
// 936: open the Notes filter menu, press the search '?': the menu must shut.
// 934: the Notes rows/cards segment's buttons and track. 964: visible
// controls in the Notes and Graph docks. Topic names: none reads "Topic N"
// when its notes have titles. Env: W, THEME.
const { boot } = require("./lib.js");
(async () => {
  const W = Number(process.env.W || 1440);
  const { browser, page } = await boot({ viewport: { width: W, height: 900 } });
  await page.evaluate(() => switchTab("notes"));
  await page.waitForTimeout(2500);
  await page.click("#notes-filter-menu > summary");
  await page.waitForTimeout(300);
  const menuOpenBefore = await page.evaluate(() => document.getElementById("notes-filter-menu").open);
  await page.click("#search-help");
  await page.waitForTimeout(300);
  const after = await page.evaluate(() => ({
    menuOpen: document.getElementById("notes-filter-menu").open,
    helpShown: !document.getElementById("search-help-hint").classList.contains("hidden"),
  }));
  await page.keyboard.press("Escape");
  const seg = await page.evaluate(() => {
    const r = (el) => { const b = el.getBoundingClientRect(); return [Math.round(b.width * 10) / 10, Math.round(b.height * 10) / 10]; };
    return { track: r(document.querySelector(".notes-view-toggle")), rows: r(document.getElementById("notes-view-rows")), select: r(document.getElementById("select-btn")) };
  });
  const count = (sel) => page.evaluate((sel) => {
    const dock = document.querySelector(sel);
    if (!dock) return null;
    const shown = (el) => el.getClientRects().length && getComputedStyle(el).visibility !== "hidden";
    return [...dock.querySelectorAll("button, summary, select, input")].filter((el) => shown(el) && !el.closest(".dock-menu-list, .doc-dock-menu-list, .seg") ).length
      + [...dock.querySelectorAll(".seg")].filter(shown).length;
  }, sel);
  const notesDock = await count("#tab-notes .dock, #notes-dock");
  await page.evaluate(() => switchTab("graph"));
  await page.waitForTimeout(6000);
  const graphDock = await count("#graph-card > .graph-overlay > .dock");
  const topics = await page.evaluate(async () => ((await apiJson("/graph/structure?topics=true")).topics || []).map((t) => t.name));
  console.log(JSON.stringify({ menuOpenBefore, after, ok936: menuOpenBefore && !after.menuOpen && after.helpShown, seg, notesDock, graphDock, topics }));
  await browser.close();
})();
