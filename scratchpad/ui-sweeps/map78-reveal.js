// Brief 78 row 2: the palette's New mind map (reveal "map-create") makes
// Untitled map N with its root in edit; the toast and the row say "mind map".
const { boot } = require("./lib.js");
(async () => {
  const { browser, page } = await boot({ viewport: { width: 1440, height: 900 } });
  await page.evaluate(() => { const d = document.getElementById("recovery-key-dialog"); if (d && d.open) d.close(); });
  const toasts = [];
  await page.exposeFunction("__toast", (t) => toasts.push(t));
  await page.evaluate(() => new MutationObserver((l) => { for (const m of l) for (const n of m.addedNodes) if (n.nodeType === 1 && n.classList?.contains("toast")) window.__toast(n.textContent.trim().slice(0, 120)); }).observe(document.getElementById("toast-box"), { childList: true }));
  const row = await page.evaluate(() => paletteCommands().filter((c) => /map/i.test(c.label) && /New/.test(c.label)).map((c) => c.label));
  await page.evaluate(() => revealFeature("map-create"));
  await page.waitForTimeout(2500);
  const r = await page.evaluate(() => ({ board: window.currentBoardId, isMap: wbIsMap(), edit: document.activeElement?.classList.contains("wb-map-text") && document.activeElement.isContentEditable, root: wbMapIndex().roots[0]?.data?.content }));
  console.log(JSON.stringify({ row, ...r, toasts }));
  await browser.close();
})();
